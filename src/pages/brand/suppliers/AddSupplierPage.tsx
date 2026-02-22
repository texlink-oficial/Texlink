import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import {
    ArrowLeft,
    Plus,
    Search,
    Factory,
    CheckCircle,
    Loader2,
    Users,
    Building2,
    MapPin,
    Star,
    FileText,
    Info,
    AlertCircle,
    Mail,
    MessageCircle,
    Send,
    XCircle,
    FileSpreadsheet,
} from 'lucide-react';
import { relationshipsService, partnershipRequestsService } from '../../../services';
import { suppliersService, type CNPJValidationResult, type InvitationChannel } from '../../../services/suppliers.service';
import type { SupplierCompany, CreateRelationshipDto } from '../../../types/relationships';
import { RequestPartnershipModal, PartnershipRequestBadge } from '../../../components/partnership-requests';
import type { CheckExistingResponse } from '../../../services/partnershipRequests.service';
import BulkImportSuppliersModal from '../../../components/suppliers/BulkImportSuppliersModal';

type TabType = 'new' | 'pool';

interface NewSupplierForm {
    cnpj: string;
    contactName: string;
    contactEmail: string;
    contactPhone: string;
    contactWhatsapp: string;
    internalCode: string;
    notes: string;
}

const AddSupplierPage: React.FC = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<TabType>('pool');
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [availableSuppliers, setAvailableSuppliers] = useState<SupplierCompany[]>([]);
    const [filteredSuppliers, setFilteredSuppliers] = useState<SupplierCompany[]>([]);
    const [selectedSupplier, setSelectedSupplier] = useState<SupplierCompany | null>(null);
    const [showCredentialModal, setShowCredentialModal] = useState(false);
    const [showSuccessToast, setShowSuccessToast] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    // Bulk import modal state
    const [showBulkImportModal, setShowBulkImportModal] = useState(false);

    // Partnership Request Modal state
    const [showRequestModal, setShowRequestModal] = useState(false);
    const [supplierStatuses, setSupplierStatuses] = useState<Record<string, CheckExistingResponse>>({});

    // Form state for new supplier
    const [formData, setFormData] = useState<NewSupplierForm>({
        cnpj: '',
        contactName: '',
        contactEmail: '',
        contactPhone: '',
        contactWhatsapp: '',
        internalCode: '',
        notes: '',
    });
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});

    // CNPJ validation state
    const [cnpjValidation, setCnpjValidation] = useState<CNPJValidationResult | null>(null);
    const [isValidatingCnpj, setIsValidatingCnpj] = useState(false);

    // Send channel toggles
    const [sendEmail, setSendEmail] = useState(true);
    const [sendWhatsapp, setSendWhatsapp] = useState(false);
    const [customMessage, setCustomMessage] = useState('');

    // Credential form for pool supplier
    const [credentialForm, setCredentialForm] = useState({
        internalCode: '',
        notes: '',
        priority: 0,
    });

    const { user } = useAuth();
    const brandId = user?.brandId || user?.companyId;

    useEffect(() => {
        if (activeTab === 'pool') {
            loadAvailableSuppliers();
        }
    }, [activeTab, brandId]);

    useEffect(() => {
        applySearch();
    }, [availableSuppliers, searchTerm]);

    const loadAvailableSuppliers = async () => {
        try {
            setIsLoading(true);
            const data = await relationshipsService.getAvailableForBrand(brandId);
            setAvailableSuppliers(data);

            // Load partnership request status for all suppliers in a single batch call
            if (data.length > 0) {
                try {
                    const statuses = await partnershipRequestsService.checkExistingBatch(
                        data.map(s => s.id)
                    );
                    setSupplierStatuses(statuses);
                } catch {
                    // Ignore batch check errors - supplier cards will show default state
                }
            }
        } catch (error) {
            console.error('Error loading available suppliers:', error);
            setErrorMessage('Erro ao carregar fornecedores disponíveis');
        } finally {
            setIsLoading(false);
        }
    };

    const handleRequestPartnership = async (data: { supplierId: string; message?: string }) => {
        try {
            await partnershipRequestsService.create(data);
            setShowRequestModal(false);
            setSelectedSupplier(null);

            // Refresh status
            const status = await partnershipRequestsService.checkExisting(data.supplierId);
            setSupplierStatuses(prev => ({ ...prev, [data.supplierId]: status }));

            setShowSuccessToast(true);
            setTimeout(() => setShowSuccessToast(false), 3000);
        } catch (error: any) {
            setErrorMessage(error.response?.data?.message || 'Erro ao enviar solicitação');
        }
    };

    const handleOpenRequestModal = (supplier: SupplierCompany) => {
        setSelectedSupplier(supplier);
        setShowRequestModal(true);
    };

    const applySearch = () => {
        if (!searchTerm) {
            setFilteredSuppliers(availableSuppliers);
            return;
        }

        const term = searchTerm.toLowerCase();
        const filtered = availableSuppliers.filter(
            (s) =>
                s.tradeName?.toLowerCase().includes(term) ||
                s.legalName?.toLowerCase().includes(term) ||
                s.document?.includes(term) ||
                s.city?.toLowerCase().includes(term) ||
                s.state?.toLowerCase().includes(term)
        );
        setFilteredSuppliers(filtered);
    };

    // ==================== NEW SUPPLIER FORM ====================

    const applyCNPJMask = (value: string) => {
        const cleaned = value.replace(/\D/g, '');
        if (cleaned.length <= 14) {
            return cleaned.replace(
                /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
                '$1.$2.$3/$4-$5'
            );
        }
        return value;
    };

    const applyPhoneMask = (value: string) => {
        const cleaned = value.replace(/\D/g, '');
        if (cleaned.length <= 11) {
            if (cleaned.length <= 10) {
                return cleaned.replace(/^(\d{2})(\d{4})(\d{0,4})$/, '($1) $2-$3');
            }
            return cleaned.replace(/^(\d{2})(\d{5})(\d{0,4})$/, '($1) $2-$3');
        }
        return value;
    };

    const handleFormChange = (field: keyof NewSupplierForm, value: string) => {
        let processedValue = value;

        if (field === 'cnpj') {
            processedValue = applyCNPJMask(value);
        } else if (field === 'contactPhone' || field === 'contactWhatsapp') {
            processedValue = applyPhoneMask(value);
        }

        setFormData((prev) => ({ ...prev, [field]: processedValue }));

        if (formErrors[field]) {
            setFormErrors((prev) => {
                const newErrors = { ...prev };
                delete newErrors[field];
                return newErrors;
            });
        }
    };

    // Validate CNPJ when it changes (debounced)
    const validateCnpj = useCallback(async (cnpj: string) => {
        const cleaned = cnpj.replace(/\D/g, '');
        if (cleaned.length !== 14) {
            setCnpjValidation(null);
            return;
        }

        setIsValidatingCnpj(true);
        try {
            const result = await suppliersService.validateCnpj(cleaned);
            setCnpjValidation(result);

            // Auto-fill contact phone if available
            if (result.isValid && result.data?.telefone && !formData.contactPhone) {
                handleFormChange('contactPhone', result.data.telefone);
            }
        } catch (err) {
            setCnpjValidation({
                isValid: false,
                error: 'Erro ao validar CNPJ',
                source: 'ERROR',
                timestamp: new Date(),
            });
        } finally {
            setIsValidatingCnpj(false);
        }
    }, [formData.contactPhone]);

    // Trigger CNPJ validation on change
    useEffect(() => {
        const cleaned = formData.cnpj.replace(/\D/g, '');
        if (cleaned.length === 14) {
            const timer = setTimeout(() => {
                validateCnpj(formData.cnpj);
            }, 500);
            return () => clearTimeout(timer);
        } else {
            setCnpjValidation(null);
        }
    }, [formData.cnpj, validateCnpj]);

    const validateNewSupplierForm = (): boolean => {
        const errors: Record<string, string> = {};

        const cnpjDigits = formData.cnpj.replace(/\D/g, '');
        if (!cnpjDigits) {
            errors.cnpj = 'CNPJ é obrigatório';
        } else if (cnpjDigits.length !== 14) {
            errors.cnpj = 'CNPJ deve ter 14 dígitos';
        }

        if (!formData.contactName.trim()) {
            errors.contactName = 'Nome do contato é obrigatório';
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!formData.contactEmail) {
            errors.contactEmail = 'Email é obrigatório';
        } else if (!emailRegex.test(formData.contactEmail)) {
            errors.contactEmail = 'Email inválido';
        }

        const phoneDigits = formData.contactPhone.replace(/\D/g, '');
        if (!phoneDigits) {
            errors.contactPhone = 'Telefone é obrigatório';
        } else if (phoneDigits.length < 10 || phoneDigits.length > 11) {
            errors.contactPhone = 'Telefone inválido';
        }

        if (!sendEmail && !sendWhatsapp) {
            errors.sendVia = 'Selecione ao menos um canal de envio';
        }

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const getSendChannel = (): InvitationChannel => {
        if (sendEmail && sendWhatsapp) return 'BOTH';
        if (sendWhatsapp) return 'WHATSAPP';
        return 'EMAIL';
    };

    const handleCreateNewSupplier = async () => {
        if (!validateNewSupplierForm()) return;

        try {
            setIsSubmitting(true);
            setErrorMessage('');

            const result = await suppliersService.inviteSupplier({
                cnpj: formData.cnpj.replace(/\D/g, ''),
                contactName: formData.contactName,
                contactEmail: formData.contactEmail,
                contactPhone: formData.contactPhone.replace(/\D/g, ''),
                contactWhatsapp: formData.contactWhatsapp.replace(/\D/g, '') || undefined,
                customMessage: customMessage || undefined,
                sendVia: getSendChannel(),
                internalCode: formData.internalCode || undefined,
                notes: formData.notes || undefined,
            });

            // Success
            setShowSuccessToast(true);
            setTimeout(() => {
                navigate('/brand/fornecedores');
            }, 2000);
        } catch (error: any) {
            console.error('Error creating supplier:', error);
            setErrorMessage(error.response?.data?.message || 'Erro ao criar fornecedor');
        } finally {
            setIsSubmitting(false);
        }
    };

    // ==================== POOL SUPPLIER ====================

    const handleSelectSupplier = (supplier: SupplierCompany) => {
        setSelectedSupplier(supplier);
        setCredentialForm({
            internalCode: '',
            notes: '',
            priority: 0,
        });
        setShowCredentialModal(true);
    };

    const handleCredentialSupplier = async () => {
        if (!selectedSupplier) return;

        try {
            setIsSubmitting(true);
            setErrorMessage('');

            const dto: CreateRelationshipDto = {
                supplierId: selectedSupplier.id,
                brandId: brandId,
                internalCode: credentialForm.internalCode || undefined,
                notes: credentialForm.notes || undefined,
                priority: credentialForm.priority,
            };

            await relationshipsService.create(dto);

            // Generate contract
            // The backend should generate it automatically, but we can trigger it here if needed

            setShowCredentialModal(false);
            setShowSuccessToast(true);

            setTimeout(() => {
                navigate('/brand/fornecedores');
            }, 2000);
        } catch (error: any) {
            console.error('Error credentialing supplier:', error);
            setErrorMessage(
                error.response?.data?.message || 'Erro ao credenciar fornecedor'
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    // ==================== UI HELPERS ====================

    const getCapacityPercentage = (supplier: SupplierCompany) => {
        const profile = supplier.supplierProfile;
        if (!profile?.dailyCapacity) return 0;
        return Math.round((profile.currentOccupancy / profile.dailyCapacity) * 100);
    };

    const getCapacityColor = (percentage: number) => {
        if (percentage >= 90) return 'bg-red-500';
        if (percentage >= 70) return 'bg-amber-500';
        return 'bg-green-500';
    };

    return (
        <div className="p-6 lg:p-8 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/brand/fornecedores')}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                            Credenciar Fornecedor
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400">
                            Adicione uma nova facção à sua rede de fornecedores
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => setShowBulkImportModal(true)}
                    className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                    <FileSpreadsheet className="w-5 h-5" />
                    Importar Planilha
                </button>
            </div>

            {/* Error Message */}
            {errorMessage && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                        <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                        <p className="text-red-700 dark:text-red-300">{errorMessage}</p>
                    </div>
                </div>
            )}

            {/* Tabs */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                <div className="border-b border-gray-200 dark:border-gray-700">
                    <nav className="flex">
                        <button
                            onClick={() => setActiveTab('pool')}
                            className={`flex-1 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'pool'
                                ? 'border-brand-500 text-brand-600 dark:text-brand-400'
                                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                                }`}
                        >
                            <div className="flex items-center justify-center gap-2">
                                <Users className="w-5 h-5" />
                                Do Pool (Já Cadastrados)
                            </div>
                            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                                Facções com onboarding completo, prontas para credenciamento
                            </p>
                        </button>
                        <button
                            onClick={() => setActiveTab('new')}
                            className={`flex-1 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'new'
                                ? 'border-brand-500 text-brand-600 dark:text-brand-400'
                                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                                }`}
                        >
                            <div className="flex items-center justify-center gap-2">
                                <Plus className="w-5 h-5" />
                                Criar Novo Fornecedor
                            </div>
                            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                                Cadastrar facção nova que receberá convite de onboarding
                            </p>
                        </button>
                    </nav>
                </div>

                {/* Tab Content */}
                <div className="p-6">
                    {activeTab === 'pool' && (
                        <div className="space-y-6">
                            {/* Search */}
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Buscar por nome, CNPJ, cidade..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
                                />
                            </div>

                            {/* Info Banner */}
                            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                                <div className="flex items-start gap-3">
                                    <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                                    <div>
                                        <p className="text-sm text-blue-700 dark:text-blue-300">
                                            <strong>Pool de Fornecedores:</strong> Estas facções já
                                            completaram o onboarding e estão prontas para serem
                                            credenciadas. Ao credenciar, um contrato será gerado
                                            automaticamente para assinatura.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Suppliers Grid */}
                            {isLoading ? (
                                <div className="flex justify-center items-center py-20">
                                    <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
                                </div>
                            ) : filteredSuppliers.length === 0 ? (
                                <div className="text-center py-16">
                                    <Factory className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                                        {availableSuppliers.length === 0
                                            ? 'Nenhum fornecedor disponível'
                                            : 'Nenhum resultado encontrado'}
                                    </h3>
                                    <p className="text-gray-500 dark:text-gray-400">
                                        {availableSuppliers.length === 0
                                            ? 'Todas as facções do pool já estão credenciadas para sua marca'
                                            : 'Tente ajustar os termos de busca'}
                                    </p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                                    {filteredSuppliers.map((supplier) => (
                                        <div
                                            key={supplier.id}
                                            className="bg-gray-50 dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 hover:border-brand-300 dark:hover:border-brand-700 transition-all"
                                        >
                                            {/* Header */}
                                            <div className="flex items-start gap-3 mb-4">
                                                <div className="w-12 h-12 bg-gradient-to-br from-brand-500 to-brand-600 rounded-xl flex items-center justify-center flex-shrink-0">
                                                    <Factory className="w-6 h-6 text-white" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                                                        {supplier.tradeName || supplier.legalName}
                                                    </h3>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                                        CNPJ: {supplier.document}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Info Grid */}
                                            <div className="space-y-3 mb-4">
                                                {/* Location */}
                                                {(supplier.city || supplier.state) && (
                                                    <div className="flex items-center gap-2 text-sm">
                                                        <MapPin className="w-4 h-4 text-gray-400" />
                                                        <span className="text-gray-600 dark:text-gray-300">
                                                            {[supplier.city, supplier.state]
                                                                .filter(Boolean)
                                                                .join(' - ')}
                                                        </span>
                                                    </div>
                                                )}

                                                {/* Specialties */}
                                                {supplier.supplierProfile?.specialties &&
                                                    supplier.supplierProfile.specialties.length >
                                                    0 && (
                                                        <div className="flex flex-wrap gap-1">
                                                            {supplier.supplierProfile.specialties
                                                                .slice(0, 3)
                                                                .map((spec, i) => (
                                                                    <span
                                                                        key={i}
                                                                        className="px-2 py-0.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-xs"
                                                                    >
                                                                        {spec}
                                                                    </span>
                                                                ))}
                                                            {supplier.supplierProfile.specialties
                                                                .length > 3 && (
                                                                    <span className="px-2 py-0.5 text-gray-500 text-xs">
                                                                        +
                                                                        {supplier.supplierProfile
                                                                            .specialties.length - 3}
                                                                    </span>
                                                                )}
                                                        </div>
                                                    )}

                                                {/* Capacity */}
                                                {supplier.supplierProfile?.dailyCapacity && (
                                                    <div>
                                                        <div className="flex items-center justify-between text-xs mb-1">
                                                            <span className="text-gray-500 dark:text-gray-400">
                                                                Ocupação
                                                            </span>
                                                            <span className="text-gray-700 dark:text-gray-300">
                                                                {getCapacityPercentage(supplier)}%
                                                            </span>
                                                        </div>
                                                        <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                                            <div
                                                                className={`h-full ${getCapacityColor(
                                                                    getCapacityPercentage(supplier)
                                                                )} transition-all`}
                                                                style={{
                                                                    width: `${getCapacityPercentage(
                                                                        supplier
                                                                    )}%`,
                                                                }}
                                                            />
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Rating */}
                                                {supplier.supplierProfile?.avgRating && (
                                                    <div className="flex items-center gap-1">
                                                        <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                                                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                                                            {Number(supplier.supplierProfile.avgRating).toFixed(1)}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Onboarding Status */}
                                            <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400 mb-4">
                                                <CheckCircle className="w-4 h-4" />
                                                <span>Onboarding completo</span>
                                            </div>

                                            {/* Partnership Status & Action Button */}
                                            {supplierStatuses[supplier.id]?.hasActiveRelationship ? (
                                                <div className="w-full py-2.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-xl font-medium text-center flex items-center justify-center gap-2">
                                                    <CheckCircle className="w-4 h-4" />
                                                    Vinculado
                                                </div>
                                            ) : supplierStatuses[supplier.id]?.hasPendingRequest ? (
                                                <div className="w-full py-2.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded-xl font-medium text-center flex items-center justify-center gap-2">
                                                    <Loader2 className="w-4 h-4" />
                                                    Solicitação Pendente
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => handleOpenRequestModal(supplier)}
                                                    className="w-full py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                                                >
                                                    <Send className="w-4 h-4" />
                                                    Solicitar Parceria
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'new' && (
                        <div className="max-w-2xl mx-auto space-y-6">
                            {/* Info Banner */}
                            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
                                <div className="flex items-start gap-3">
                                    <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5" />
                                    <div>
                                        <p className="text-sm text-amber-700 dark:text-amber-300">
                                            <strong>Novo Fornecedor:</strong> Ao criar um novo
                                            fornecedor, ele receberá um convite por email para
                                            completar o processo de onboarding (cadastro de dados,
                                            documentos, capacidades). Após a conclusão, o contrato
                                            será gerado automaticamente.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Form */}
                            <div className="space-y-6">
                                {/* CNPJ with Validation */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        CNPJ da Facção *
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={formData.cnpj}
                                            onChange={(e) => handleFormChange('cnpj', e.target.value)}
                                            placeholder="00.000.000/0000-00"
                                            className={`w-full px-4 py-3 pr-10 bg-gray-50 dark:bg-gray-900 border rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 ${formErrors.cnpj
                                                ? 'border-red-500'
                                                : cnpjValidation?.isValid === false
                                                    ? 'border-red-300 dark:border-red-500'
                                                    : cnpjValidation?.isValid
                                                        ? 'border-green-300 dark:border-green-500'
                                                        : 'border-gray-200 dark:border-gray-700'
                                                }`}
                                        />
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                            {isValidatingCnpj && (
                                                <Loader2 className="h-5 w-5 text-gray-400 animate-spin" />
                                            )}
                                            {!isValidatingCnpj && cnpjValidation?.isValid && (
                                                <CheckCircle className="h-5 w-5 text-green-500" />
                                            )}
                                            {!isValidatingCnpj && cnpjValidation?.isValid === false && (
                                                <XCircle className="h-5 w-5 text-red-500" />
                                            )}
                                        </div>
                                    </div>
                                    {formErrors.cnpj && (
                                        <p className="mt-1 text-sm text-red-500">{formErrors.cnpj}</p>
                                    )}
                                    {cnpjValidation?.isValid === false && !formErrors.cnpj && (
                                        <p className="mt-1 text-sm text-red-500">{cnpjValidation.error}</p>
                                    )}
                                </div>

                                {/* Company Preview Panel */}
                                {cnpjValidation?.isValid && cnpjValidation.data && (
                                    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4">
                                        <div className="flex items-start gap-3">
                                            <div className="p-2 bg-green-100 dark:bg-green-900/50 rounded-lg">
                                                <Building2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cnpjValidation.data.situacao === 'ATIVA'
                                                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                                        : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                                        }`}>
                                                        {cnpjValidation.data.situacao}
                                                    </span>
                                                </div>
                                                <p className="font-semibold text-gray-900 dark:text-white">
                                                    {cnpjValidation.data.razaoSocial}
                                                </p>
                                                {cnpjValidation.data.nomeFantasia && (
                                                    <p className="text-sm text-gray-600 dark:text-gray-300">
                                                        {cnpjValidation.data.nomeFantasia}
                                                    </p>
                                                )}
                                                {cnpjValidation.data.endereco && (
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1">
                                                        <MapPin className="w-3 h-3" />
                                                        {cnpjValidation.data.endereco.municipio}/{cnpjValidation.data.endereco.uf}
                                                    </p>
                                                )}
                                                {cnpjValidation.data.atividadePrincipal && (
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                        {cnpjValidation.data.atividadePrincipal.descricao}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Contact Name */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Nome do Contato *
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.contactName}
                                        onChange={(e) =>
                                            handleFormChange('contactName', e.target.value)
                                        }
                                        placeholder="Nome completo do responsável"
                                        className={`w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 ${formErrors.contactName
                                            ? 'border-red-500'
                                            : 'border-gray-200 dark:border-gray-700'
                                            }`}
                                    />
                                    {formErrors.contactName && (
                                        <p className="mt-1 text-sm text-red-500">
                                            {formErrors.contactName}
                                        </p>
                                    )}
                                </div>

                                {/* Contact Email */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Email do Contato *
                                    </label>
                                    <input
                                        type="email"
                                        value={formData.contactEmail}
                                        onChange={(e) =>
                                            handleFormChange('contactEmail', e.target.value)
                                        }
                                        placeholder="email@empresa.com.br"
                                        className={`w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 ${formErrors.contactEmail
                                            ? 'border-red-500'
                                            : 'border-gray-200 dark:border-gray-700'
                                            }`}
                                    />
                                    {formErrors.contactEmail && (
                                        <p className="mt-1 text-sm text-red-500">
                                            {formErrors.contactEmail}
                                        </p>
                                    )}
                                </div>

                                {/* Contact Phone */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Telefone *
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.contactPhone}
                                            onChange={(e) =>
                                                handleFormChange('contactPhone', e.target.value)
                                            }
                                            placeholder="(00) 00000-0000"
                                            className={`w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 ${formErrors.contactPhone
                                                ? 'border-red-500'
                                                : 'border-gray-200 dark:border-gray-700'
                                                }`}
                                        />
                                        {formErrors.contactPhone && (
                                            <p className="mt-1 text-sm text-red-500">
                                                {formErrors.contactPhone}
                                            </p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            WhatsApp
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.contactWhatsapp}
                                            onChange={(e) =>
                                                handleFormChange('contactWhatsapp', e.target.value)
                                            }
                                            placeholder="(00) 00000-0000"
                                            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
                                        />
                                    </div>
                                </div>

                                {/* Internal Code */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Código Interno (opcional)
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.internalCode}
                                        onChange={(e) =>
                                            handleFormChange('internalCode', e.target.value)
                                        }
                                        placeholder="Ex: FAC-001"
                                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
                                    />
                                    <p className="mt-1 text-xs text-gray-500">
                                        Código de referência interna da sua empresa para este
                                        fornecedor
                                    </p>
                                </div>

                                {/* Notes */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Observações Internas
                                    </label>
                                    <textarea
                                        value={formData.notes}
                                        onChange={(e) => handleFormChange('notes', e.target.value)}
                                        rows={2}
                                        placeholder="Notas ou observações visíveis apenas para sua equipe..."
                                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                                    />
                                </div>

                                {/* Send Channel Toggles */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                                        Enviar Convite Via *
                                    </label>
                                    <div className="flex gap-4">
                                        <label className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 cursor-pointer transition-all ${sendEmail
                                                ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300'
                                                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                                            }`}>
                                            <input
                                                type="checkbox"
                                                checked={sendEmail}
                                                onChange={(e) => setSendEmail(e.target.checked)}
                                                className="sr-only"
                                            />
                                            <Mail className="h-5 w-5" />
                                            <span className="font-medium">Email</span>
                                        </label>
                                        <label className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 cursor-pointer transition-all ${sendWhatsapp
                                                ? 'border-green-500 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                                                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                                            }`}>
                                            <input
                                                type="checkbox"
                                                checked={sendWhatsapp}
                                                onChange={(e) => setSendWhatsapp(e.target.checked)}
                                                className="sr-only"
                                            />
                                            <MessageCircle className="h-5 w-5" />
                                            <span className="font-medium">WhatsApp</span>
                                        </label>
                                    </div>
                                    {formErrors.sendVia && (
                                        <p className="mt-2 text-sm text-red-500">{formErrors.sendVia}</p>
                                    )}
                                </div>

                                {/* Custom Message */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Mensagem Personalizada (opcional)
                                    </label>
                                    <textarea
                                        value={customMessage}
                                        onChange={(e) => setCustomMessage(e.target.value)}
                                        rows={3}
                                        placeholder="Adicione uma mensagem personalizada ao convite..."
                                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                                    />
                                </div>

                                {/* Submit Button */}
                                <div className="flex justify-end gap-3 pt-4">
                                    <button
                                        onClick={() => navigate('/brand/fornecedores')}
                                        className="px-6 py-3 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={handleCreateNewSupplier}
                                        disabled={isSubmitting || (!sendEmail && !sendWhatsapp)}
                                        className="px-6 py-3 bg-brand-500 hover:bg-brand-600 text-white rounded-xl font-medium transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <Loader2 className="w-5 h-5 animate-spin" />
                                                Enviando...
                                            </>
                                        ) : (
                                            <>
                                                <Send className="w-5 h-5" />
                                                Enviar Convite
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Credential Modal */}
            {showCredentialModal && selectedSupplier && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg">
                        {/* Modal Header */}
                        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                                Credenciar Fornecedor
                            </h3>
                            <p className="text-gray-500 dark:text-gray-400 mt-1">
                                Confirme o credenciamento de{' '}
                                <strong>{selectedSupplier.tradeName}</strong>
                            </p>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 space-y-4">
                            {/* Supplier Summary */}
                            <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-brand-500 rounded-lg flex items-center justify-center">
                                        <Factory className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-900 dark:text-white">
                                            {selectedSupplier.tradeName}
                                        </p>
                                        <p className="text-sm text-gray-500">
                                            {selectedSupplier.document}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Internal Code */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Código Interno (opcional)
                                </label>
                                <input
                                    type="text"
                                    value={credentialForm.internalCode}
                                    onChange={(e) =>
                                        setCredentialForm((prev) => ({
                                            ...prev,
                                            internalCode: e.target.value,
                                        }))
                                    }
                                    placeholder="Ex: FAC-001"
                                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
                                />
                            </div>

                            {/* Priority */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Prioridade
                                </label>
                                <select
                                    value={credentialForm.priority}
                                    onChange={(e) =>
                                        setCredentialForm((prev) => ({
                                            ...prev,
                                            priority: parseInt(e.target.value),
                                        }))
                                    }
                                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                                >
                                    <option value={0}>Normal</option>
                                    <option value={1}>Alta</option>
                                    <option value={2}>Muito Alta</option>
                                </select>
                            </div>

                            {/* Notes */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Observações
                                </label>
                                <textarea
                                    value={credentialForm.notes}
                                    onChange={(e) =>
                                        setCredentialForm((prev) => ({
                                            ...prev,
                                            notes: e.target.value,
                                        }))
                                    }
                                    rows={3}
                                    placeholder="Notas sobre este fornecedor..."
                                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                                />
                            </div>

                            {/* Info */}
                            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                                <div className="flex items-start gap-2">
                                    <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5" />
                                    <p className="text-xs text-blue-700 dark:text-blue-300">
                                        Um contrato será gerado automaticamente e enviado ao
                                        fornecedor para assinatura.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex gap-3">
                            <button
                                onClick={() => setShowCredentialModal(false)}
                                className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleCredentialSupplier}
                                disabled={isSubmitting}
                                className="flex-1 px-4 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Credenciando...
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle className="w-4 h-4" />
                                        Confirmar
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Request Partnership Modal */}
            {showRequestModal && selectedSupplier && (
                <RequestPartnershipModal
                    isOpen={showRequestModal}
                    onClose={() => {
                        setShowRequestModal(false);
                        setSelectedSupplier(null);
                    }}
                    onSubmit={handleRequestPartnership}
                    supplier={{
                        id: selectedSupplier.id,
                        tradeName: selectedSupplier.tradeName || undefined,
                        legalName: selectedSupplier.legalName || 'Empresa',
                        city: selectedSupplier.city || '',
                        state: selectedSupplier.state || '',
                        avgRating: selectedSupplier.supplierProfile?.avgRating ? Number(selectedSupplier.supplierProfile.avgRating) : undefined,
                        logoUrl: selectedSupplier.logoUrl || undefined,
                    }}
                    isLoading={isSubmitting}
                />
            )}

            {/* Success Toast */}
            {showSuccessToast && (
                <div className="fixed bottom-6 right-6 bg-green-600 text-white px-6 py-4 rounded-xl shadow-lg flex items-center gap-3 z-50">
                    <CheckCircle className="w-5 h-5" />
                    <span>Solicitação enviada com sucesso!</span>
                </div>
            )}

            {/* Bulk Import Modal */}
            <BulkImportSuppliersModal
                isOpen={showBulkImportModal}
                onClose={() => setShowBulkImportModal(false)}
                onComplete={(results) => {
                    if (results.success > 0) {
                        setShowSuccessToast(true);
                        setTimeout(() => setShowSuccessToast(false), 4000);
                    }
                }}
            />
        </div>
    );
};

export default AddSupplierPage;
