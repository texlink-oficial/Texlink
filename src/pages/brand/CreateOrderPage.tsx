import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, Link, useSearchParams, useLocation } from 'react-router-dom';
import { ordersService, suppliersService, uploadService, favoritesService, settingsService } from '../../services';
import { ProductTemplate } from '../../services/favorites.service';
import {
    ArrowLeft, Package, DollarSign, Calendar,
    Send, Loader2, Factory, FileText, Upload, X, Image, CheckCircle, AlertCircle, Star, Film, Copy, Info, Bookmark, Lock
} from 'lucide-react';
import { ProductTemplateSelector, PaymentTermsSelector, FavoriteSupplierBadge, SaveAsTemplateModal } from '../../components/favorites';

interface SupplierOption {
    id: string;
    tradeName: string;
    avgRating: number;
    supplierProfile?: {
        productTypes: string[];
        monthlyCapacity: number;
    };
}

interface DuplicateOrderData {
    productType?: string;
    productCategory?: string;
    productName?: string;
    description?: string;
    pricePerUnit?: number;
    paymentTerms?: string;
    materialsProvided?: boolean;
    observations?: string;
}

const CreateOrderPage: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const preselectedSupplierId = searchParams.get('supplierId');
    const [isLoading, setIsLoading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<'idle' | 'uploading' | 'done' | 'error'>('idle');
    const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
    const [loadingSuppliers, setLoadingSuppliers] = useState(true);
    const [techSheetFiles, setTechSheetFiles] = useState<File[]>([]);
    const [dragActive, setDragActive] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isDuplicate, setIsDuplicate] = useState(false);
    const [favoriteSupplierIds, setFavoriteSupplierIds] = useState<string[]>([]);
    const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false);
    const [orderCreated, setOrderCreated] = useState(false);

    // Check for duplicate order data from navigation state
    const duplicateFrom = (location.state as { duplicateFrom?: DuplicateOrderData })?.duplicateFrom;

    const [formData, setFormData] = useState({
        productType: '',
        productCategory: '',
        productName: '',
        op: '',
        artigo: '',
        description: '',
        quantity: '',
        pricePerUnit: '',
        deliveryDeadline: '',
        paymentTerms: '',
        materialsProvided: false,
        observations: '',
        protectTechnicalSheet: false,
        assignmentType: 'DIRECT' as 'DIRECT' | 'BIDDING' | 'HYBRID',
        supplierId: preselectedSupplierId || '',
        targetSupplierIds: [] as string[],
    });

    // Pre-fill form when duplicating an order
    useEffect(() => {
        if (duplicateFrom) {
            setFormData(prev => ({
                ...prev,
                productType: duplicateFrom.productType || '',
                productCategory: duplicateFrom.productCategory || '',
                productName: duplicateFrom.productName || '',
                description: duplicateFrom.description || '',
                pricePerUnit: duplicateFrom.pricePerUnit?.toString() || '',
                paymentTerms: duplicateFrom.paymentTerms || '',
                materialsProvided: duplicateFrom.materialsProvided || false,
                observations: duplicateFrom.observations || '',
            }));
            setIsDuplicate(true);
            // Clear the location state to prevent re-applying on refresh
            window.history.replaceState({}, document.title);
        }
    }, [duplicateFrom]);

    useEffect(() => {
        loadSuppliers();
        loadFavoriteSuppliers();
        loadOrderDefaults();
    }, []);

    const loadOrderDefaults = async () => {
        try {
            const defaults = await settingsService.getOrderDefaults();
            setFormData(prev => ({ ...prev, protectTechnicalSheet: defaults.defaultProtectTechnicalSheet }));
        } catch (error) {
            console.error('Error loading order defaults:', error);
        }
    };

    const loadFavoriteSuppliers = async () => {
        try {
            const ids = await favoritesService.getFavoriteSupplierIds();
            setFavoriteSupplierIds(ids);
        } catch (error) {
            console.error('Error loading favorite suppliers:', error);
        }
    };

    const loadSuppliers = async () => {
        try {
            const data = await suppliersService.search({});
            setSuppliers(data);
        } catch (error) {
            console.error('Error loading suppliers:', error);
        } finally {
            setLoadingSuppliers(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
        }));
    };

    const handleSupplierToggle = (supplierId: string) => {
        setFormData(prev => ({
            ...prev,
            targetSupplierIds: prev.targetSupplierIds.includes(supplierId)
                ? prev.targetSupplierIds.filter(id => id !== supplierId)
                : [...prev.targetSupplierIds, supplierId],
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setUploadProgress('idle');

        try {
            // 1. Create order
            const order = await ordersService.create({
                ...formData,
                quantity: Number(formData.quantity),
                pricePerUnit: Number(formData.pricePerUnit),
                op: formData.op || undefined,
                artigo: formData.artigo || undefined,
                protectTechnicalSheet: formData.protectTechnicalSheet,
                supplierId: formData.assignmentType === 'DIRECT' ? formData.supplierId : undefined,
                targetSupplierIds: (formData.assignmentType === 'BIDDING' || formData.assignmentType === 'HYBRID') ? formData.targetSupplierIds : undefined,
            });

            // 2. Upload files if any
            if (techSheetFiles.length > 0 && order?.id) {
                setUploadProgress('uploading');
                try {
                    await uploadService.uploadFiles(order.id, techSheetFiles);
                    setUploadProgress('done');
                } catch (uploadError) {
                    console.error('Error uploading files:', uploadError);
                    setUploadProgress('error');
                    // Continue anyway - order was created
                }
            }

            // Show success and option to save as template
            setOrderCreated(true);
        } catch (error) {
            console.error('Error creating order:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFiles(Array.from(e.dataTransfer.files));
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            handleFiles(Array.from(e.target.files));
        }
    };

    const handleFiles = (files: File[]) => {
        const validTypes = [
            'image/jpeg', 'image/png', 'image/webp', 'application/pdf',
            'video/mp4', 'video/webm', 'video/quicktime'
        ];
        const getMaxSize = (type: string) => {
            return type.startsWith('video/') ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
        };
        const validFiles = files.filter(file => {
            return validTypes.includes(file.type) && file.size <= getMaxSize(file.type);
        });
        setTechSheetFiles(prev => [...prev, ...validFiles].slice(0, 5)); // Max 5 files
    };

    const removeFile = (index: number) => {
        setTechSheetFiles(prev => prev.filter((_, i) => i !== index));
    };

    const totalValue = (Number(formData.quantity) || 0) * (Number(formData.pricePerUnit) || 0);
    const platformFee = totalValue * 0.10; // 10% fee simulation
    const netValue = totalValue - platformFee;

    // Sort suppliers: favorites first, then by rating
    const sortedSuppliers = useMemo(() => {
        const favorites = suppliers.filter(s => favoriteSupplierIds.includes(s.id));
        const others = suppliers.filter(s => !favoriteSupplierIds.includes(s.id));
        return [...favorites, ...others];
    }, [suppliers, favoriteSupplierIds]);

    const handleTemplateSelect = (template: ProductTemplate) => {
        setFormData(prev => ({
            ...prev,
            productType: template.productType,
            productCategory: template.productCategory || '',
            productName: template.productName,
            description: template.description || '',
            materialsProvided: template.materialsProvided,
            pricePerUnit: template.defaultPrice?.toString() || '',
            observations: template.observations || '',
        }));
    };

    const handlePaymentTermsChange = (terms: string) => {
        setFormData(prev => ({ ...prev, paymentTerms: terms }));
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 transition-colors duration-300">
            {/* Header */}
            <header className="bg-white/80 dark:bg-gray-900/50 backdrop-blur-xl border-b border-gray-200 dark:border-gray-800 sticky top-0 z-10 transition-all duration-300">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center gap-4">
                        <Link to="/brand/pedidos/lista" className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <div>
                            <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">Novo Pedido</h1>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Preencha os dados para iniciar uma nova produção</p>
                        </div>
                    </div>
                </div>
            </header>

            <form onSubmit={handleSubmit} className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
                {/* Duplicate Order Banner */}
                {isDuplicate && (
                    <div className="bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-800 rounded-xl p-4 flex items-start gap-3">
                        <div className="p-2 bg-brand-100 dark:bg-brand-900/40 rounded-lg">
                            <Copy className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-brand-900 dark:text-brand-100">Pedido Duplicado</h3>
                            <p className="text-sm text-brand-700 dark:text-brand-300 mt-0.5">
                                Dados do produto foram copiados. Ajuste a quantidade e prazo de entrega para o novo pedido.
                            </p>
                        </div>
                    </div>
                )}

                {/* Product Info */}
                <Section title="Informações do Produto" description="Defina as características principais do item" icon={<Package className="w-5 h-5 text-brand-600 dark:text-brand-500" />}>
                    {/* Template Selector */}
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-500 dark:text-gray-400">Preencha manualmente ou use um template salvo</span>
                        <ProductTemplateSelector onSelect={handleTemplateSelect} />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Input
                            label="Tipo de Produto *"
                            name="productType"
                            value={formData.productType}
                            onChange={handleChange}
                            placeholder="Ex: Camiseta"
                            required
                        />
                        <Input
                            label="Categoria"
                            name="productCategory"
                            value={formData.productCategory}
                            onChange={handleChange}
                            placeholder="Ex: Casual"
                        />
                    </div>
                    <Input
                        label="Nome do Produto *"
                        name="productName"
                        value={formData.productName}
                        onChange={handleChange}
                        placeholder="Ex: Camiseta Básica Premium Algodão"
                        required
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Input
                            label="OP (Ordem de Produção)"
                            name="op"
                            value={formData.op}
                            onChange={handleChange}
                            placeholder="Ex: 12345"
                        />
                        <Input
                            label="Artigo"
                            name="artigo"
                            value={formData.artigo}
                            onChange={handleChange}
                            placeholder="Ex: ART-001-A"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Descrição Detalhada</label>
                        <textarea
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            rows={4}
                            className="w-full px-4 py-3 bg-white dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500/50 transition-all resize-none"
                            placeholder="Descreva modelagem, acabamentos, etiquetas e outros detalhes importantes..."
                        />
                    </div>

                    {/* Tech Sheet Upload */}
                    <div className="pt-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                            Ficha Técnica e Anexos
                        </label>
                        <div
                            onDragEnter={handleDrag}
                            onDragLeave={handleDrag}
                            onDragOver={handleDrag}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                            className={`group relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-300 overflow-hidden ${dragActive
                                ? 'border-brand-500 bg-brand-500/5'
                                : 'border-gray-300 dark:border-gray-700 hover:border-brand-500/50 hover:bg-gray-50 dark:hover:bg-gray-800/30'
                                }`}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                multiple
                                accept=".pdf,.jpg,.jpeg,.png,.webp,.mp4,.webm,.mov"
                                onChange={handleFileChange}
                                className="hidden"
                            />
                            <div className="relative z-10 flex flex-col items-center gap-3">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${dragActive ? 'bg-brand-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-400 group-hover:bg-brand-500/10 group-hover:text-brand-600 dark:group-hover:text-brand-500'}`}>
                                    <Upload className="w-6 h-6" />
                                </div>
                                <div>
                                    <p className="text-gray-700 dark:text-gray-200 font-medium">Clique para fazer upload ou arraste arquivos</p>
                                    <p className="text-gray-500 dark:text-gray-500 text-sm mt-1">PDF, JPG, PNG (máx. 10MB) | Vídeos MP4, WebM, MOV (máx. 50MB)</p>
                                </div>
                            </div>
                        </div>

                        {/* File Previews */}
                        {techSheetFiles.length > 0 && (
                            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {techSheetFiles.map((file, index) => (
                                    <div
                                        key={index}
                                        className="flex items-center gap-3 p-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl group relative overflow-hidden shadow-sm"
                                    >
                                        <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0 text-gray-500 dark:text-gray-400">
                                            {file.type.startsWith('video/') ? (
                                                <Film className="w-5 h-5 text-purple-500" />
                                            ) : file.type.startsWith('image/') ? (
                                                <Image className="w-5 h-5" />
                                            ) : (
                                                <FileText className="w-5 h-5" />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-900 dark:text-gray-200 truncate">{file.name}</p>
                                            <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                removeFile(index);
                                            }}
                                            className="p-1.5 hover:bg-red-50 text-gray-400 hover:text-red-500 dark:hover:bg-red-500/10 dark:text-gray-500 rounded-lg transition-colors"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </Section>

                {/* Order Details */}
                <Section title="Detalhes da Produção" description="Quantidades, valores e prazos" icon={<DollarSign className="w-5 h-5 text-emerald-600 dark:text-emerald-500" />}>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Input
                            label="Quantidade *"
                            name="quantity"
                            type="number"
                            value={formData.quantity}
                            onChange={handleChange}
                            placeholder="0"
                            min="1"
                            required
                        />
                        <Input
                            label="Preço Alvo / Unidade *"
                            name="pricePerUnit"
                            type="number"
                            step="0.01"
                            value={formData.pricePerUnit}
                            onChange={handleChange}
                            placeholder="R$ 0,00"
                            min="0.01"
                            required
                        />
                        <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl border border-gray-200 dark:border-gray-800 flex flex-col justify-center">
                            <p className="text-sm text-gray-500 mb-1">Valor Total Estimado</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalValue)}
                            </p>
                            <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700/50 space-y-1">
                                <div className="flex justify-between text-xs text-gray-500">
                                    <span>Taxa de Serviço (10%)</span>
                                    <span>- {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(platformFee)}</span>
                                </div>
                                <div className="flex justify-between text-xs font-medium text-emerald-600 dark:text-emerald-400">
                                    <span>Líquido para Facção</span>
                                    <span>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(netValue)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Input
                            label="Data de Entrega Desejada *"
                            name="deliveryDeadline"
                            type="date"
                            value={formData.deliveryDeadline}
                            onChange={handleChange}
                            required
                        />
                        <PaymentTermsSelector
                            value={formData.paymentTerms}
                            onChange={handlePaymentTermsChange}
                        />
                    </div>
                    <label className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-900/30 rounded-xl border border-gray-200 dark:border-gray-800/50 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-900/50 transition-colors">
                        <div className="relative flex items-center">
                            <input
                                type="checkbox"
                                name="materialsProvided"
                                checked={formData.materialsProvided}
                                onChange={handleChange}
                                className="w-5 h-5 rounded border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-brand-600 dark:text-brand-500 focus:ring-brand-500 focus:ring-offset-white dark:focus:ring-offset-gray-900"
                            />
                        </div>
                        <span className="text-gray-700 dark:text-gray-300 font-medium">
                            Materiais (tecidos/aviamentos) serão fornecidos pela marca
                        </span>
                    </label>

                    <label className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-900/30 rounded-xl border border-gray-200 dark:border-gray-800/50 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-900/50 transition-colors">
                        <input
                            type="checkbox"
                            name="protectTechnicalSheet"
                            checked={formData.protectTechnicalSheet}
                            onChange={handleChange}
                            className="w-5 h-5 rounded border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-brand-600 dark:text-brand-500 focus:ring-brand-500 focus:ring-offset-white dark:focus:ring-offset-gray-900"
                        />
                        <div className="flex-1">
                            <span className="text-gray-700 dark:text-gray-300 font-medium">
                                Proteger ficha técnica até aceite
                            </span>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                A facção só verá detalhes técnicos após aceitar o pedido
                            </p>
                        </div>
                        <Lock className="w-4 h-4 text-gray-400" />
                    </label>
                </Section>

                {/* Supplier Selection */}
                <Section title="Definição de Facção" description="Escolha quem irá produzir este pedido" icon={<Factory className="w-5 h-5 text-purple-600 dark:text-purple-500" />}>
                    <div className="grid grid-cols-3 gap-4 mb-6">
                        <button
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, assignmentType: 'DIRECT', targetSupplierIds: [] }))}
                            className={`p-4 rounded-xl border text-left transition-all ${formData.assignmentType === 'DIRECT'
                                ? 'bg-brand-50 dark:bg-brand-500/10 border-brand-500/50 ring-1 ring-brand-500/50'
                                : 'bg-white dark:bg-gray-900/50 border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                                }`}
                        >
                            <div className="flex items-center justify-between mb-2">
                                <span className={`font-semibold ${formData.assignmentType === 'DIRECT' ? 'text-brand-600 dark:text-brand-400' : 'text-gray-700 dark:text-gray-300'}`}>Direto</span>
                                {formData.assignmentType === 'DIRECT' && <CheckCircle className="w-5 h-5 text-brand-600 dark:text-brand-500" />}
                            </div>
                            <p className="text-sm text-gray-500">Uma facção específica</p>
                        </button>
                        <button
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, assignmentType: 'BIDDING', supplierId: '' }))}
                            className={`p-4 rounded-xl border text-left transition-all ${formData.assignmentType === 'BIDDING'
                                ? 'bg-brand-50 dark:bg-brand-500/10 border-brand-500/50 ring-1 ring-brand-500/50'
                                : 'bg-white dark:bg-gray-900/50 border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                                }`}
                        >
                            <div className="flex items-center justify-between mb-2">
                                <span className={`font-semibold ${formData.assignmentType === 'BIDDING' ? 'text-brand-600 dark:text-brand-400' : 'text-gray-700 dark:text-gray-300'}`}>Fechado</span>
                                {formData.assignmentType === 'BIDDING' && <CheckCircle className="w-5 h-5 text-brand-600 dark:text-brand-500" />}
                            </div>
                            <p className="text-sm text-gray-500">Apenas facções convidadas</p>
                        </button>
                        <button
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, assignmentType: 'HYBRID', supplierId: '' }))}
                            className={`p-4 rounded-xl border text-left transition-all ${formData.assignmentType === 'HYBRID'
                                ? 'bg-brand-50 dark:bg-brand-500/10 border-brand-500/50 ring-1 ring-brand-500/50'
                                : 'bg-white dark:bg-gray-900/50 border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                                }`}
                        >
                            <div className="flex items-center justify-between mb-2">
                                <span className={`font-semibold ${formData.assignmentType === 'HYBRID' ? 'text-brand-600 dark:text-brand-400' : 'text-gray-700 dark:text-gray-300'}`}>Híbrido</span>
                                {formData.assignmentType === 'HYBRID' && <CheckCircle className="w-5 h-5 text-brand-600 dark:text-brand-500" />}
                            </div>
                            <p className="text-sm text-gray-500">Convidados + Aberto a todos</p>
                        </button>
                    </div>

                    {loadingSuppliers ? (
                        <div className="flex justify-center py-12">
                            <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
                        </div>
                    ) : (
                        <div>
                            {formData.assignmentType === 'HYBRID' && (
                                <div className="mb-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-4 rounded-xl flex gap-3 text-sm text-blue-800 dark:text-blue-300">
                                    <Info className="w-5 h-5 flex-shrink-0" />
                                    <p>
                                        No modo Híbrido, o pedido ficará visível na <strong>Bolsa de Pedidos</strong> para todas as facções qualificadas.
                                        Você também pode convidar facções específicas abaixo para notificá-las diretamente.
                                    </p>
                                </div>
                            )}

                            {suppliers.length === 0 ? (
                                <div className="text-center py-8 text-gray-500 bg-gray-50 dark:bg-gray-900/30 rounded-xl border border-gray-200 dark:border-gray-800 border-dashed">
                                    Nenhuma facção encontrada
                                </div>
                            ) : (
                                <div className="max-h-96 overflow-y-auto pr-2 space-y-2 custom-scrollbar">
                                    {sortedSuppliers.map((supplier, index) => {
                                        const isSelected = (formData.assignmentType === 'DIRECT' && formData.supplierId === supplier.id) ||
                                            ((formData.assignmentType === 'BIDDING' || formData.assignmentType === 'HYBRID') && formData.targetSupplierIds.includes(supplier.id));
                                        const isFavorite = favoriteSupplierIds.includes(supplier.id);

                                        return (
                                            <React.Fragment key={supplier.id}>
                                                {/* Separator between favorites and others */}
                                                {index > 0 && isFavorite === false && favoriteSupplierIds.includes(sortedSuppliers[index - 1].id) && (
                                                    <div className="flex items-center gap-2 py-2">
                                                        <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
                                                        <span className="text-xs text-gray-400 dark:text-gray-500 px-2">Outros fornecedores</span>
                                                        <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
                                                    </div>
                                                )}
                                                <div
                                                    onClick={() => {
                                                        if (formData.assignmentType === 'DIRECT') {
                                                            setFormData(prev => ({ ...prev, supplierId: supplier.id }));
                                                        } else {
                                                            handleSupplierToggle(supplier.id);
                                                        }
                                                    }}
                                                    className={`flex items-center p-4 rounded-xl border cursor-pointer transition-all group ${isSelected
                                                        ? 'bg-brand-50 dark:bg-brand-500/10 border-brand-500/50'
                                                        : 'bg-white dark:bg-gray-900/30 border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                                                        }`}
                                                >
                                                    <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mr-4 border border-gray-200 dark:border-gray-700 relative">
                                                        <Factory className={`w-5 h-5 ${isSelected ? 'text-brand-600 dark:text-brand-400' : 'text-gray-500'}`} />
                                                        {isFavorite && (
                                                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full flex items-center justify-center">
                                                                <Star className="w-2.5 h-2.5 text-white fill-current" />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2">
                                                            <p className={`font-medium ${isSelected ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>{supplier.tradeName}</p>
                                                            {isFavorite && (
                                                                <span className="text-[10px] font-semibold text-yellow-700 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30 px-1.5 py-0.5 rounded">
                                                                    Favorito
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            <div className="flex items-center text-xs text-yellow-600 dark:text-yellow-500 bg-yellow-100 dark:bg-yellow-500/10 px-1.5 py-0.5 rounded">
                                                                <Star className="w-3 h-3 fill-current mr-1" />
                                                                {supplier.avgRating ? Number(supplier.avgRating).toFixed(1) : 'N/A'}
                                                            </div>
                                                            <span className="text-xs text-gray-400 dark:text-gray-500">•</span>
                                                            <p className="text-xs text-gray-500 truncate max-w-[200px]">
                                                                {supplier.supplierProfile?.productTypes?.join(', ') || 'Diversos'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${isSelected
                                                        ? 'bg-brand-600 dark:bg-brand-500 border-brand-600 dark:border-brand-500'
                                                        : 'border-gray-300 dark:border-gray-600 group-hover:border-gray-400 dark:group-hover:border-gray-500'
                                                        }`}>
                                                        {isSelected && <CheckCircle className="w-4 h-4 text-white" />}
                                                    </div>
                                                </div>
                                            </React.Fragment>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </Section>

                {/* Footer Actions */}
                <div className="sticky bottom-0 bg-white/80 dark:bg-gray-950/80 backdrop-blur-lg border-t border-gray-200 dark:border-gray-800 p-4 -mx-4 sm:mx-0 sm:p-0 sm:bg-transparent sm:border-0 sm:relative flex justify-end gap-3 pt-6">
                    <button
                        type="button"
                        onClick={() => navigate('/brand/pedidos/lista')}
                        className="px-6 py-3 text-gray-500 dark:text-gray-400 font-medium hover:text-gray-900 dark:hover:text-white transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        disabled={isLoading ||
                            (formData.assignmentType === 'DIRECT' && !formData.supplierId) ||
                            (formData.assignmentType === 'BIDDING' && formData.targetSupplierIds.length === 0)} // HYBRID allows 0 targets
                        className="px-8 py-3 bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white font-semibold rounded-xl shadow-lg shadow-brand-500/20 transition-all disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {isLoading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <>
                                <Send className="w-5 h-5" />
                                Enviar Pedido
                            </>
                        )}
                    </button>
                </div>
            </form>

            {/* Order Created Success Modal */}
            {orderCreated && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                    <div className="relative bg-white dark:bg-gray-800 w-full max-w-md rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-6 text-center">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                            <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                            Pedido Criado!
                        </h3>
                        <p className="text-gray-500 dark:text-gray-400 mb-6">
                            Seu pedido foi enviado com sucesso.
                        </p>
                        <div className="flex flex-col gap-3">
                            <button
                                onClick={() => setShowSaveTemplateModal(true)}
                                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-medium rounded-xl transition-colors"
                            >
                                <Bookmark className="w-4 h-4" />
                                Salvar como Template
                            </button>
                            <button
                                onClick={() => navigate('/brand/pedidos')}
                                className="w-full px-4 py-3 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl shadow-sm transition-colors"
                            >
                                Ver Meus Pedidos
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Save as Template Modal */}
            <SaveAsTemplateModal
                isOpen={showSaveTemplateModal}
                onClose={() => {
                    setShowSaveTemplateModal(false);
                    navigate('/brand/pedidos');
                }}
                orderData={{
                    productType: formData.productType,
                    productCategory: formData.productCategory,
                    productName: formData.productName,
                    description: formData.description,
                    materialsProvided: formData.materialsProvided,
                    pricePerUnit: Number(formData.pricePerUnit) || undefined,
                    observations: formData.observations,
                }}
                onSaved={() => {
                    // Template saved, will auto-navigate
                }}
            />
        </div>
    );
};

// Helper Components
const Section: React.FC<{ title: string; description?: string; icon: React.ReactNode; children: React.ReactNode }> = ({ title, description, icon, children }) => (
    <div className="bg-white/50 dark:bg-gray-900/40 backdrop-blur-sm rounded-2xl border border-gray-200 dark:border-gray-800/60 p-6 md:p-8 hover:border-gray-300 dark:hover:border-gray-700/60 transition-colors shadow-sm dark:shadow-none">
        <div className="flex items-start gap-4 mb-6">
            <div className="p-3 bg-gray-100 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700/50">
                {icon}
            </div>
            <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white leading-tight">{title}</h2>
                {description && <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">{description}</p>}
            </div>
        </div>
        <div className="space-y-5 content-section">{children}</div>
    </div>
);

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label: string;
}

const Input: React.FC<InputProps> = ({ label, ...props }) => (
    <div className="group">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 group-focus-within:text-brand-600 dark:group-focus-within:text-brand-400 transition-colors">{label}</label>
        <input
            {...props}
            className="w-full px-4 py-3 bg-white dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500/50 transition-all shadow-sm dark:shadow-none"
        />
    </div>
);

export default CreateOrderPage;
