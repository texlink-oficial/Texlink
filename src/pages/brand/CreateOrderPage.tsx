import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { ordersService, suppliersService, uploadService } from '../../services';
import {
    ArrowLeft, Package, DollarSign, Calendar,
    Send, Loader2, Factory, FileText, Upload, X, Image, CheckCircle, AlertCircle
} from 'lucide-react';

interface SupplierOption {
    id: string;
    tradeName: string;
    avgRating: number;
    supplierProfile?: {
        productTypes: string[];
        monthlyCapacity: number;
    };
}

const CreateOrderPage: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const preselectedSupplierId = searchParams.get('supplierId');
    const [isLoading, setIsLoading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<'idle' | 'uploading' | 'done' | 'error'>('idle');
    const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
    const [loadingSuppliers, setLoadingSuppliers] = useState(true);
    const [techSheetFiles, setTechSheetFiles] = useState<File[]>([]);
    const [dragActive, setDragActive] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [formData, setFormData] = useState({
        productType: '',
        productCategory: '',
        productName: '',
        description: '',
        quantity: '',
        pricePerUnit: '',
        deliveryDeadline: '',
        paymentTerms: '',
        materialsProvided: false,
        observations: '',
        assignmentType: 'DIRECT' as 'DIRECT' | 'BIDDING',
        supplierId: preselectedSupplierId || '',
        targetSupplierIds: [] as string[],
    });

    useEffect(() => {
        loadSuppliers();
    }, []);

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
                supplierId: formData.assignmentType === 'DIRECT' ? formData.supplierId : undefined,
                targetSupplierIds: formData.assignmentType === 'BIDDING' ? formData.targetSupplierIds : undefined,
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

            navigate('/brand/pedidos');
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
        const validFiles = files.filter(file => {
            const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
            return validTypes.includes(file.type) && file.size <= 10 * 1024 * 1024; // 10MB max
        });
        setTechSheetFiles(prev => [...prev, ...validFiles].slice(0, 5)); // Max 5 files
    };

    const removeFile = (index: number) => {
        setTechSheetFiles(prev => prev.filter((_, i) => i !== index));
    };

    const totalValue = (Number(formData.quantity) || 0) * (Number(formData.pricePerUnit) || 0);

    return (
        <div className="min-h-screen bg-brand-950">
            {/* Header */}
            <header className="bg-brand-900/50 border-b border-brand-800 sticky top-0 z-10">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center gap-4">
                        <Link to="/brand/orders" className="text-brand-400 hover:text-white">
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <div>
                            <h1 className="text-xl font-bold text-white">Novo Pedido</h1>
                            <p className="text-sm text-brand-400">Preencha os dados do pedido</p>
                        </div>
                    </div>
                </div>
            </header>

            <form onSubmit={handleSubmit} className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
                {/* Product Info */}
                <Section title="Produto" icon={<Package className="w-5 h-5 text-brand-400" />}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                            label="Tipo de Produto *"
                            name="productType"
                            value={formData.productType}
                            onChange={handleChange}
                            placeholder="Ex: Camiseta, Calça, Vestido"
                            required
                        />
                        <Input
                            label="Categoria"
                            name="productCategory"
                            value={formData.productCategory}
                            onChange={handleChange}
                            placeholder="Ex: Casual, Fitness, Social"
                        />
                    </div>
                    <Input
                        label="Nome do Produto *"
                        name="productName"
                        value={formData.productName}
                        onChange={handleChange}
                        placeholder="Ex: Camiseta Básica Algodão"
                        required
                    />
                    <div>
                        <label className="block text-sm font-medium text-brand-200 mb-2">Descrição</label>
                        <textarea
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            rows={3}
                            className="w-full px-4 py-3 bg-brand-800/50 border border-brand-700 rounded-xl text-white placeholder-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                            placeholder="Descreva detalhes do produto, medidas, cores..."
                        />
                    </div>

                    {/* Tech Sheet Upload */}
                    <div>
                        <label className="block text-sm font-medium text-brand-200 mb-2">
                            Ficha Técnica / Anexos
                        </label>
                        <div
                            onDragEnter={handleDrag}
                            onDragLeave={handleDrag}
                            onDragOver={handleDrag}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${dragActive
                                ? 'border-brand-500 bg-brand-500/10'
                                : 'border-brand-700 hover:border-brand-600 hover:bg-brand-800/30'
                                }`}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                multiple
                                accept=".pdf,.jpg,.jpeg,.png,.webp"
                                onChange={handleFileChange}
                                className="hidden"
                            />
                            <Upload className={`w-8 h-8 mx-auto mb-2 ${dragActive ? 'text-brand-400' : 'text-brand-500'}`} />
                            <p className="text-brand-200 font-medium">Arraste arquivos ou clique para selecionar</p>
                            <p className="text-brand-400 text-sm mt-1">PDF, JPG, PNG (máx. 10MB cada, até 5 arquivos)</p>
                        </div>

                        {/* File Previews */}
                        {techSheetFiles.length > 0 && (
                            <div className="mt-3 space-y-2">
                                {techSheetFiles.map((file, index) => (
                                    <div
                                        key={index}
                                        className="flex items-center gap-3 p-3 bg-brand-800/50 rounded-xl"
                                    >
                                        {file.type.startsWith('image/') ? (
                                            <Image className="w-5 h-5 text-brand-400" />
                                        ) : (
                                            <FileText className="w-5 h-5 text-brand-400" />
                                        )}
                                        <span className="flex-1 text-brand-200 text-sm truncate">{file.name}</span>
                                        <span className="text-brand-400 text-xs">
                                            {(file.size / 1024 / 1024).toFixed(2)} MB
                                        </span>
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                removeFile(index);
                                            }}
                                            className="p-1 hover:bg-brand-700 rounded-lg transition-colors"
                                        >
                                            <X className="w-4 h-4 text-brand-400" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </Section>

                {/* Order Details */}
                <Section title="Detalhes do Pedido" icon={<DollarSign className="w-5 h-5 text-brand-400" />}>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Input
                            label="Quantidade *"
                            name="quantity"
                            type="number"
                            value={formData.quantity}
                            onChange={handleChange}
                            placeholder="100"
                            min="1"
                            required
                        />
                        <Input
                            label="Preço por Unidade (R$) *"
                            name="pricePerUnit"
                            type="number"
                            step="0.01"
                            value={formData.pricePerUnit}
                            onChange={handleChange}
                            placeholder="15.00"
                            min="0.01"
                            required
                        />
                        <div className="flex flex-col justify-end">
                            <p className="text-sm text-brand-400 mb-1">Valor Total</p>
                            <p className="text-2xl font-bold text-brand-300">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalValue)}
                            </p>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                            label="Data de Entrega *"
                            name="deliveryDeadline"
                            type="date"
                            value={formData.deliveryDeadline}
                            onChange={handleChange}
                            required
                        />
                        <Input
                            label="Condições de Pagamento"
                            name="paymentTerms"
                            value={formData.paymentTerms}
                            onChange={handleChange}
                            placeholder="Ex: 50% adiantado, 50% na entrega"
                        />
                    </div>
                    <div className="flex items-center gap-3">
                        <input
                            type="checkbox"
                            id="materialsProvided"
                            name="materialsProvided"
                            checked={formData.materialsProvided}
                            onChange={handleChange}
                            className="w-5 h-5 rounded border-brand-700 bg-brand-800 text-brand-500 focus:ring-brand-500"
                        />
                        <label htmlFor="materialsProvided" className="text-brand-200">
                            Materiais serão fornecidos pela marca
                        </label>
                    </div>
                </Section>

                {/* Supplier Selection */}
                <Section title="Selecionar Facção" icon={<Factory className="w-5 h-5 text-brand-400" />}>
                    <div className="flex gap-4 mb-4">
                        <button
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, assignmentType: 'DIRECT', targetSupplierIds: [] }))}
                            className={`flex-1 py-3 rounded-xl font-medium transition-all ${formData.assignmentType === 'DIRECT'
                                ? 'bg-brand-600 text-white'
                                : 'bg-brand-800 text-brand-300 hover:bg-brand-700'
                                }`}
                        >
                            Direto (1 facção)
                        </button>
                        <button
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, assignmentType: 'BIDDING', supplierId: '' }))}
                            className={`flex-1 py-3 rounded-xl font-medium transition-all ${formData.assignmentType === 'BIDDING'
                                ? 'bg-brand-600 text-white'
                                : 'bg-brand-800 text-brand-300 hover:bg-brand-700'
                                }`}
                        >
                            Licitação (múltiplas)
                        </button>
                    </div>

                    {loadingSuppliers ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="w-6 h-6 text-brand-500 animate-spin" />
                        </div>
                    ) : suppliers.length === 0 ? (
                        <p className="text-brand-400 text-center py-4">Nenhuma facção disponível</p>
                    ) : (
                        <div className="space-y-2">
                            {suppliers.map((supplier) => (
                                <div
                                    key={supplier.id}
                                    onClick={() => {
                                        if (formData.assignmentType === 'DIRECT') {
                                            setFormData(prev => ({ ...prev, supplierId: supplier.id }));
                                        } else {
                                            handleSupplierToggle(supplier.id);
                                        }
                                    }}
                                    className={`p-4 rounded-xl border cursor-pointer transition-all ${(formData.assignmentType === 'DIRECT' && formData.supplierId === supplier.id) ||
                                        (formData.assignmentType === 'BIDDING' && formData.targetSupplierIds.includes(supplier.id))
                                        ? 'bg-brand-600/20 border-brand-500'
                                        : 'bg-brand-800/50 border-brand-700 hover:border-brand-600'
                                        }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-white font-medium">{supplier.tradeName}</p>
                                            <p className="text-sm text-brand-400">
                                                ⭐ {supplier.avgRating?.toFixed(1) || 'N/A'} •
                                                {supplier.supplierProfile?.productTypes?.join(', ') || 'Diversos'}
                                            </p>
                                        </div>
                                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${(formData.assignmentType === 'DIRECT' && formData.supplierId === supplier.id) ||
                                            (formData.assignmentType === 'BIDDING' && formData.targetSupplierIds.includes(supplier.id))
                                            ? 'bg-brand-500 border-brand-500'
                                            : 'border-brand-600'
                                            }`}>
                                            {((formData.assignmentType === 'DIRECT' && formData.supplierId === supplier.id) ||
                                                (formData.assignmentType === 'BIDDING' && formData.targetSupplierIds.includes(supplier.id))) && (
                                                    <div className="w-2 h-2 bg-white rounded-full" />
                                                )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </Section>

                {/* Submit */}
                <button
                    type="submit"
                    disabled={isLoading ||
                        (formData.assignmentType === 'DIRECT' && !formData.supplierId) ||
                        (formData.assignmentType === 'BIDDING' && formData.targetSupplierIds.length === 0)}
                    className="w-full py-4 bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white font-semibold rounded-xl shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
            </form>
        </div>
    );
};

// Helper Components
const Section: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode }> = ({ title, icon, children }) => (
    <div className="bg-brand-900/50 rounded-2xl border border-brand-800 p-6">
        <div className="flex items-center gap-2 mb-4">
            {icon}
            <h2 className="text-lg font-semibold text-white">{title}</h2>
        </div>
        <div className="space-y-4">{children}</div>
    </div>
);

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label: string;
}

const Input: React.FC<InputProps> = ({ label, ...props }) => (
    <div>
        <label className="block text-sm font-medium text-brand-200 mb-2">{label}</label>
        <input
            {...props}
            className="w-full px-4 py-3 bg-brand-800/50 border border-brand-700 rounded-xl text-white placeholder-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
    </div>
);

export default CreateOrderPage;
