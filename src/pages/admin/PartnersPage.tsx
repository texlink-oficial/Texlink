import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    ArrowLeft, Gift, Plus, Pencil, Trash2, Eye, EyeOff,
    Save, X, Loader2, GripVertical, ExternalLink,
    Heart, Shield, Calculator, DollarSign, Cpu,
    GraduationCap, Umbrella, MoreHorizontal
} from 'lucide-react';
import { partnersService, CreatePartnerDto, UpdatePartnerDto } from '../../services/partners.service';
import type { Partner, PartnerCategory } from '../../types';
import { PARTNER_CATEGORY_LABELS } from '../../types';

const CATEGORY_ICONS: Record<PartnerCategory, React.ElementType> = {
    HEALTH_WELLNESS: Heart,
    COMPLIANCE: Shield,
    ACCOUNTING: Calculator,
    FINANCE: DollarSign,
    TECHNOLOGY: Cpu,
    TRAINING: GraduationCap,
    INSURANCE: Umbrella,
    OTHER: MoreHorizontal,
};

const EMPTY_FORM: CreatePartnerDto = {
    name: '',
    description: '',
    logoUrl: '',
    website: '',
    category: 'OTHER',
    benefits: [],
    contactEmail: '',
    contactPhone: '',
    discountCode: '',
    discountInfo: '',
    isActive: true,
    displayOrder: 0,
};

const PartnersPage: React.FC = () => {
    const [partners, setPartners] = useState<Partner[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
    const [formData, setFormData] = useState<CreatePartnerDto>(EMPTY_FORM);
    const [benefitInput, setBenefitInput] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [filterActive, setFilterActive] = useState<boolean | undefined>(undefined);

    useEffect(() => {
        loadPartners();
    }, [filterActive]);

    const loadPartners = async () => {
        try {
            setIsLoading(true);
            const data = await partnersService.getAllAdmin(undefined, filterActive);
            setPartners(data);
        } catch (error) {
            console.error('Error loading partners:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const openCreateModal = () => {
        setEditingPartner(null);
        setFormData({ ...EMPTY_FORM, displayOrder: partners.length });
        setBenefitInput('');
        setIsModalOpen(true);
    };

    const openEditModal = (partner: Partner) => {
        setEditingPartner(partner);
        setFormData({
            name: partner.name,
            description: partner.description,
            logoUrl: partner.logoUrl || '',
            website: partner.website,
            category: partner.category,
            benefits: partner.benefits,
            contactEmail: partner.contactEmail || '',
            contactPhone: partner.contactPhone || '',
            discountCode: partner.discountCode || '',
            discountInfo: partner.discountInfo || '',
            isActive: partner.isActive,
            displayOrder: partner.displayOrder,
        });
        setBenefitInput('');
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingPartner(null);
        setFormData(EMPTY_FORM);
        setBenefitInput('');
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
        }));
    };

    const addBenefit = () => {
        if (benefitInput.trim()) {
            setFormData(prev => ({
                ...prev,
                benefits: [...prev.benefits, benefitInput.trim()],
            }));
            setBenefitInput('');
        }
    };

    const removeBenefit = (index: number) => {
        setFormData(prev => ({
            ...prev,
            benefits: prev.benefits.filter((_, i) => i !== index),
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);

        try {
            const dto: CreatePartnerDto | UpdatePartnerDto = {
                ...formData,
                logoUrl: formData.logoUrl || undefined,
                contactEmail: formData.contactEmail || undefined,
                contactPhone: formData.contactPhone || undefined,
                discountCode: formData.discountCode || undefined,
                discountInfo: formData.discountInfo || undefined,
            };

            if (editingPartner) {
                await partnersService.update(editingPartner.id, dto);
            } else {
                await partnersService.create(dto as CreatePartnerDto);
            }

            closeModal();
            loadPartners();
        } catch (error) {
            console.error('Error saving partner:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleToggleActive = async (partner: Partner) => {
        try {
            await partnersService.toggleActive(partner.id);
            loadPartners();
        } catch (error) {
            console.error('Error toggling partner:', error);
        }
    };

    const handleDelete = async (partner: Partner) => {
        if (!confirm(`Tem certeza que deseja excluir "${partner.name}"?`)) return;

        try {
            await partnersService.delete(partner.id);
            loadPartners();
        } catch (error) {
            console.error('Error deleting partner:', error);
        }
    };

    return (
        <div className="min-h-screen bg-brand-950">
            {/* Header */}
            <header className="bg-brand-900/50 border-b border-brand-800 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Link to="/admin" className="text-brand-400 hover:text-white">
                                <ArrowLeft className="w-5 h-5" />
                            </Link>
                            <div>
                                <h1 className="text-xl font-bold text-white">Parceiros</h1>
                                <p className="text-sm text-brand-400">{partners.length} cadastrados</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <select
                                value={filterActive === undefined ? '' : String(filterActive)}
                                onChange={(e) => setFilterActive(e.target.value === '' ? undefined : e.target.value === 'true')}
                                className="px-4 py-2 bg-brand-800 border border-brand-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                            >
                                <option value="">Todos</option>
                                <option value="true">Ativos</option>
                                <option value="false">Inativos</option>
                            </select>

                            <button
                                onClick={openCreateModal}
                                className="flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-xl font-medium transition-colors"
                            >
                                <Plus className="w-5 h-5" />
                                Novo Parceiro
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                {isLoading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
                    </div>
                ) : partners.length === 0 ? (
                    <div className="text-center py-12">
                        <Gift className="w-12 h-12 text-brand-400 mx-auto mb-4" />
                        <p className="text-brand-300 mb-4">Nenhum parceiro cadastrado</p>
                        <button
                            onClick={openCreateModal}
                            className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-xl font-medium transition-colors"
                        >
                            Adicionar primeiro parceiro
                        </button>
                    </div>
                ) : (
                    <div className="bg-brand-900/50 rounded-xl border border-brand-800 overflow-hidden">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-brand-800">
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-brand-400 uppercase">Ordem</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-brand-400 uppercase">Parceiro</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-brand-400 uppercase">Categoria</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-brand-400 uppercase">Status</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-brand-400 uppercase">Benefícios</th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold text-brand-400 uppercase">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-brand-800">
                                {partners.map((partner) => {
                                    const Icon = CATEGORY_ICONS[partner.category];
                                    return (
                                        <tr key={partner.id} className="hover:bg-brand-800/30">
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <GripVertical className="w-4 h-4 text-brand-500" />
                                                    <span className="text-brand-400">{partner.displayOrder + 1}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-3">
                                                    {partner.logoUrl ? (
                                                        <img
                                                            src={partner.logoUrl}
                                                            alt={partner.name}
                                                            className="w-10 h-10 rounded-lg object-contain bg-white p-1"
                                                        />
                                                    ) : (
                                                        <div className="w-10 h-10 rounded-lg bg-brand-700 flex items-center justify-center">
                                                            <Icon className="w-5 h-5 text-brand-400" />
                                                        </div>
                                                    )}
                                                    <div>
                                                        <p className="font-medium text-white">{partner.name}</p>
                                                        <a
                                                            href={partner.website}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1"
                                                        >
                                                            {partner.website}
                                                            <ExternalLink className="w-3 h-3" />
                                                        </a>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-brand-700/50 rounded-lg text-sm text-brand-300">
                                                    <Icon className="w-4 h-4" />
                                                    {PARTNER_CATEGORY_LABELS[partner.category]}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                {partner.isActive ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-500/10 text-green-400 rounded-lg text-sm">
                                                        <Eye className="w-4 h-4" />
                                                        Ativo
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-500/10 text-red-400 rounded-lg text-sm">
                                                        <EyeOff className="w-4 h-4" />
                                                        Inativo
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="text-brand-400">{partner.benefits.length} benefícios</span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => handleToggleActive(partner)}
                                                        className={`p-2 rounded-lg transition-colors ${
                                                            partner.isActive
                                                                ? 'text-yellow-400 hover:bg-yellow-500/10'
                                                                : 'text-green-400 hover:bg-green-500/10'
                                                        }`}
                                                        title={partner.isActive ? 'Desativar' : 'Ativar'}
                                                    >
                                                        {partner.isActive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                    </button>
                                                    <button
                                                        onClick={() => openEditModal(partner)}
                                                        className="p-2 text-brand-400 hover:text-white hover:bg-brand-700 rounded-lg transition-colors"
                                                        title="Editar"
                                                    >
                                                        <Pencil className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(partner)}
                                                        className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                                                        title="Excluir"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </main>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-brand-900 rounded-2xl border border-brand-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-6 border-b border-brand-700">
                            <h2 className="text-lg font-bold text-white">
                                {editingPartner ? 'Editar Parceiro' : 'Novo Parceiro'}
                            </h2>
                            <button
                                onClick={closeModal}
                                className="p-2 text-brand-400 hover:text-white hover:bg-brand-700 rounded-lg"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-6">
                            {/* Basic Info */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-brand-300 mb-1">Nome *</label>
                                    <input
                                        type="text"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleInputChange}
                                        required
                                        className="w-full px-4 py-2 bg-brand-800 border border-brand-700 rounded-lg text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                                    />
                                </div>

                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-brand-300 mb-1">Descrição *</label>
                                    <textarea
                                        name="description"
                                        value={formData.description}
                                        onChange={handleInputChange}
                                        required
                                        rows={3}
                                        className="w-full px-4 py-2 bg-brand-800 border border-brand-700 rounded-lg text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent resize-none"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-brand-300 mb-1">Website *</label>
                                    <input
                                        type="url"
                                        name="website"
                                        value={formData.website}
                                        onChange={handleInputChange}
                                        required
                                        placeholder="https://"
                                        className="w-full px-4 py-2 bg-brand-800 border border-brand-700 rounded-lg text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-brand-300 mb-1">Categoria *</label>
                                    <select
                                        name="category"
                                        value={formData.category}
                                        onChange={handleInputChange}
                                        required
                                        className="w-full px-4 py-2 bg-brand-800 border border-brand-700 rounded-lg text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                                    >
                                        {Object.entries(PARTNER_CATEGORY_LABELS).map(([key, label]) => (
                                            <option key={key} value={key}>{label}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-brand-300 mb-1">URL do Logo</label>
                                    <input
                                        type="url"
                                        name="logoUrl"
                                        value={formData.logoUrl}
                                        onChange={handleInputChange}
                                        placeholder="https://"
                                        className="w-full px-4 py-2 bg-brand-800 border border-brand-700 rounded-lg text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                                    />
                                </div>
                            </div>

                            {/* Benefits */}
                            <div>
                                <label className="block text-sm font-medium text-brand-300 mb-1">Benefícios</label>
                                <div className="flex gap-2 mb-2">
                                    <input
                                        type="text"
                                        value={benefitInput}
                                        onChange={(e) => setBenefitInput(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addBenefit())}
                                        placeholder="Digite um benefício e pressione Enter"
                                        className="flex-1 px-4 py-2 bg-brand-800 border border-brand-700 rounded-lg text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                                    />
                                    <button
                                        type="button"
                                        onClick={addBenefit}
                                        className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-lg"
                                    >
                                        Adicionar
                                    </button>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {formData.benefits.map((benefit, idx) => (
                                        <span
                                            key={idx}
                                            className="inline-flex items-center gap-1 px-3 py-1 bg-brand-700 text-brand-200 rounded-full text-sm"
                                        >
                                            {benefit}
                                            <button
                                                type="button"
                                                onClick={() => removeBenefit(idx)}
                                                className="text-brand-400 hover:text-white"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {/* Contact Info */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-brand-300 mb-1">Email de Contato</label>
                                    <input
                                        type="email"
                                        name="contactEmail"
                                        value={formData.contactEmail}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-2 bg-brand-800 border border-brand-700 rounded-lg text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-brand-300 mb-1">Telefone</label>
                                    <input
                                        type="text"
                                        name="contactPhone"
                                        value={formData.contactPhone}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-2 bg-brand-800 border border-brand-700 rounded-lg text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                                    />
                                </div>
                            </div>

                            {/* Discount Info */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-brand-300 mb-1">Código de Desconto</label>
                                    <input
                                        type="text"
                                        name="discountCode"
                                        value={formData.discountCode}
                                        onChange={handleInputChange}
                                        placeholder="Ex: TEXLINK20"
                                        className="w-full px-4 py-2 bg-brand-800 border border-brand-700 rounded-lg text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-brand-300 mb-1">Descrição do Desconto</label>
                                    <input
                                        type="text"
                                        name="discountInfo"
                                        value={formData.discountInfo}
                                        onChange={handleInputChange}
                                        placeholder="Ex: 20% off nos primeiros 3 meses"
                                        className="w-full px-4 py-2 bg-brand-800 border border-brand-700 rounded-lg text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                                    />
                                </div>
                            </div>

                            {/* Display Order & Active */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-brand-300 mb-1">Ordem de Exibição</label>
                                    <input
                                        type="number"
                                        name="displayOrder"
                                        value={formData.displayOrder}
                                        onChange={handleInputChange}
                                        min={0}
                                        className="w-full px-4 py-2 bg-brand-800 border border-brand-700 rounded-lg text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                                    />
                                </div>
                                <div className="flex items-center">
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            name="isActive"
                                            checked={formData.isActive}
                                            onChange={handleInputChange}
                                            className="w-5 h-5 rounded border-brand-600 bg-brand-800 text-brand-500 focus:ring-brand-500"
                                        />
                                        <span className="text-brand-200">Parceiro ativo</span>
                                    </label>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex justify-end gap-3 pt-4 border-t border-brand-700">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="px-4 py-2 border border-brand-600 text-brand-300 rounded-lg hover:bg-brand-800 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                                >
                                    {isSaving ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Save className="w-4 h-4" />
                                    )}
                                    {editingPartner ? 'Salvar Alterações' : 'Criar Parceiro'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PartnersPage;
