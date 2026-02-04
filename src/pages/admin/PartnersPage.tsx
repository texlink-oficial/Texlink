import React, { useEffect, useState } from 'react';
import {
    Gift, Plus, Pencil, Trash2, Eye, EyeOff,
    Save, X, Loader2, GripVertical, ExternalLink,
    Heart, Shield, Calculator, DollarSign, Cpu,
    GraduationCap, Umbrella, MoreHorizontal, Filter, CheckCircle
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
        <div className="animate-fade-in">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
                {/* Header */}
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white font-display">Parceiros de Benefícios</h1>
                        <p className="text-gray-500 dark:text-gray-400 font-medium">{partners.length} parceiros credenciados no programa</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <div className="relative">
                            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                            <select
                                value={filterActive === undefined ? '' : String(filterActive)}
                                onChange={(e) => setFilterActive(e.target.value === '' ? undefined : e.target.value === 'true')}
                                className="pl-10 pr-8 py-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-white/[0.06] rounded-xl text-gray-700 dark:text-white appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-sm transition-all"
                            >
                                <option value="">Todos os status</option>
                                <option value="true">Ativos</option>
                                <option value="false">Inativos</option>
                            </select>
                        </div>

                        <button
                            onClick={openCreateModal}
                            className="flex items-center gap-2 px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-xl font-bold transition-all shadow-lg shadow-sky-500/20 active:scale-[0.98]"
                        >
                            <Plus className="w-5 h-5" />
                            Novo Parceiro
                        </button>
                    </div>
                </div>

                {/* Content */}
                {isLoading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="w-8 h-8 text-sky-500 animate-spin" />
                    </div>
                ) : partners.length === 0 ? (
                    <div className="bg-white dark:bg-slate-900/50 border border-gray-200 dark:border-white/[0.06] rounded-2xl p-12 text-center">
                        <Gift className="w-12 h-12 text-gray-300 dark:text-slate-700 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 font-display">Nenhum parceiro encontrado</h3>
                        <p className="text-gray-500 dark:text-gray-400 mb-6 font-medium">Comece adicionando seu primeiro parceiro de benefícios</p>
                        <button
                            onClick={openCreateModal}
                            className="px-6 py-2.5 bg-sky-500 hover:bg-sky-600 text-white rounded-xl font-bold transition-all shadow-lg shadow-sky-500/20"
                        >
                            Adicionar Parceiro
                        </button>
                    </div>
                ) : (
                    <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-white/[0.06] rounded-2xl overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-gray-50 dark:bg-white/[0.02] border-b border-gray-100 dark:border-white/[0.06]">
                                        <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-20">Ordem</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Parceiro</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Categoria</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Benefícios</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-white/[0.06]">
                                    {partners.map((partner) => {
                                        const Icon = CATEGORY_ICONS[partner.category];
                                        return (
                                            <tr key={partner.id} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-colors group">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <GripVertical className="w-4 h-4 text-gray-400 group-hover:text-sky-500 transition-colors" />
                                                        <span className="text-gray-600 dark:text-gray-400 font-medium">#{partner.displayOrder + 1}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-12 h-12 rounded-xl border border-gray-100 dark:border-white/[0.08] bg-white dark:bg-slate-800 p-2 flex items-center justify-center transition-all group-hover:border-sky-500/50 group-hover:shadow-lg group-hover:shadow-sky-500/5">
                                                            {partner.logoUrl ? (
                                                                <img
                                                                    src={partner.logoUrl}
                                                                    alt={partner.name}
                                                                    className="max-w-full max-h-full object-contain"
                                                                />
                                                            ) : (
                                                                <Icon className="w-6 h-6 text-gray-400 group-hover:text-sky-500 transition-colors" />
                                                            )}
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-gray-900 dark:text-white group-hover:text-sky-500 transition-colors font-display">{partner.name}</p>
                                                            {partner.website && (
                                                                <a
                                                                    href={partner.website}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="text-xs text-gray-500 dark:text-gray-400 hover:text-sky-500 flex items-center gap-1 mt-0.5"
                                                                >
                                                                    {partner.website.replace(/^https?:\/\/(www\.)?/, '')}
                                                                    <ExternalLink className="w-3 h-3" />
                                                                </a>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.08] rounded-lg text-xs font-semibold text-gray-600 dark:text-gray-300">
                                                        <Icon className="w-3.5 h-3.5" />
                                                        {PARTNER_CATEGORY_LABELS[partner.category]}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {partner.isActive ? (
                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg text-xs font-bold uppercase tracking-wider">
                                                            <CheckCircle className="w-3.5 h-3.5" />
                                                            Ativo
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-500/10 text-red-600 dark:text-red-400 rounded-lg text-xs font-bold uppercase tracking-wider">
                                                            <X className="w-3.5 h-3.5" />
                                                            Inativo
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-2 h-2 rounded-full bg-sky-500" />
                                                        <span className="text-gray-600 dark:text-gray-400 font-medium text-sm">{partner.benefits.length} benefícios</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button
                                                            onClick={() => handleToggleActive(partner)}
                                                            className={`p-2 rounded-xl transition-all ${partner.isActive
                                                                ? 'text-amber-500 hover:bg-amber-500/10'
                                                                : 'text-emerald-500 hover:bg-emerald-500/10'
                                                                }`}
                                                            title={partner.isActive ? 'Desativar' : 'Ativar'}
                                                        >
                                                            {partner.isActive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                        </button>
                                                        <button
                                                            onClick={() => openEditModal(partner)}
                                                            className="p-2 text-gray-400 hover:text-sky-500 hover:bg-sky-500/10 rounded-xl transition-all"
                                                            title="Editar"
                                                        >
                                                            <Pencil className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(partner)}
                                                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
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
                    </div>
                )}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-gray-200 dark:border-white/[0.06] w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-white/[0.06]">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white font-display">
                                {editingPartner ? 'Editar Parceiro' : 'Novo Parceiro'}
                            </h2>
                            <button
                                onClick={closeModal}
                                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[calc(90vh-140px)]">
                            <div className="p-6 space-y-6">
                                {/* Basic Info */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-2">
                                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Nome do Parceiro *</label>
                                        <input
                                            type="text"
                                            name="name"
                                            value={formData.name}
                                            onChange={handleInputChange}
                                            required
                                            className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-white/[0.06] rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all shadow-sm"
                                        />
                                    </div>

                                    <div className="col-span-2">
                                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Descrição *</label>
                                        <textarea
                                            name="description"
                                            value={formData.description}
                                            onChange={handleInputChange}
                                            required
                                            rows={3}
                                            className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-white/[0.06] rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all resize-none shadow-sm"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Website *</label>
                                        <input
                                            type="url"
                                            name="website"
                                            value={formData.website}
                                            onChange={handleInputChange}
                                            required
                                            placeholder="https://"
                                            className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-white/[0.06] rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all shadow-sm"
                                        />
                                    </div>

                                    <div className="relative">
                                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Categoria *</label>
                                        <select
                                            name="category"
                                            value={formData.category}
                                            onChange={handleInputChange}
                                            required
                                            className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-white/[0.06] rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all appearance-none cursor-pointer shadow-sm"
                                        >
                                            {Object.entries(PARTNER_CATEGORY_LABELS).map(([key, label]) => (
                                                <option key={key} value={key}>{label}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="col-span-2">
                                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">URL do Logo</label>
                                        <input
                                            type="url"
                                            name="logoUrl"
                                            value={formData.logoUrl}
                                            onChange={handleInputChange}
                                            placeholder="https://"
                                            className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-white/[0.06] rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all shadow-sm"
                                        />
                                    </div>
                                </div>

                                {/* Benefits */}
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Benefícios e Diferenciais</label>
                                    <div className="flex gap-2 mb-4">
                                        <input
                                            type="text"
                                            value={benefitInput}
                                            onChange={(e) => setBenefitInput(e.target.value)}
                                            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addBenefit())}
                                            placeholder="Digite um benefício e pressione Enter"
                                            className="flex-1 px-4 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-white/[0.06] rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all shadow-sm"
                                        />
                                        <button
                                            type="button"
                                            onClick={addBenefit}
                                            className="px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-xl font-bold transition-all shadow-lg shadow-sky-500/20 active:scale-[0.98]"
                                        >
                                            Adicionar
                                        </button>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {formData.benefits.map((benefit, idx) => (
                                            <span
                                                key={idx}
                                                className="inline-flex items-center gap-1.5 px-3 py-1 bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 rounded-full text-xs font-medium"
                                            >
                                                {benefit}
                                                <button
                                                    type="button"
                                                    onClick={() => removeBenefit(idx)}
                                                    className="hover:text-red-500 transition-colors"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </span>
                                        ))}
                                        {formData.benefits.length === 0 && (
                                            <p className="text-sm text-gray-500 italic">Nenhum benefício adicionado.</p>
                                        )}
                                    </div>
                                </div>

                                {/* Contact & Discount */}
                                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100 dark:border-white/[0.06]">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Email de Contato</label>
                                        <input
                                            type="email"
                                            name="contactEmail"
                                            value={formData.contactEmail}
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-white/[0.06] rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all shadow-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Telefone</label>
                                        <input
                                            type="text"
                                            name="contactPhone"
                                            value={formData.contactPhone}
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-white/[0.06] rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all shadow-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Cupom de Desconto</label>
                                        <input
                                            type="text"
                                            name="discountCode"
                                            value={formData.discountCode}
                                            onChange={handleInputChange}
                                            placeholder="Ex: TEXLINK20"
                                            className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-white/[0.06] rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all font-mono shadow-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Info do Desconto</label>
                                        <input
                                            type="text"
                                            name="discountInfo"
                                            value={formData.discountInfo}
                                            onChange={handleInputChange}
                                            placeholder="Ex: 20% OFF"
                                            className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-white/[0.06] rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all shadow-sm"
                                        />
                                    </div>
                                </div>

                                {/* Order & Active */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Ordem de Exibição</label>
                                        <input
                                            type="number"
                                            name="displayOrder"
                                            value={formData.displayOrder}
                                            onChange={handleInputChange}
                                            min={0}
                                            className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-white/[0.06] rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all shadow-sm"
                                        />
                                    </div>
                                    <div className="flex items-end pb-2.5">
                                        <label className="flex items-center gap-3 cursor-pointer group">
                                            <div className="relative">
                                                <input
                                                    type="checkbox"
                                                    name="isActive"
                                                    checked={formData.isActive}
                                                    onChange={handleInputChange}
                                                    className="sr-only"
                                                />
                                                <div className={`w-12 h-6 rounded-full transition-colors ${formData.isActive ? 'bg-sky-500' : 'bg-gray-200 dark:bg-slate-700'}`} />
                                                <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${formData.isActive ? 'translate-x-6' : 'translate-x-0'}`} />
                                            </div>
                                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-sky-500 transition-colors">Parceiro ativo</span>
                                        </label>
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="p-6 border-t border-gray-100 dark:border-white/[0.06] flex justify-end gap-3 bg-gray-50 dark:bg-white/[0.01]">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="px-6 py-2.5 border border-gray-200 dark:border-white/[0.1] text-gray-600 dark:text-gray-400 rounded-xl hover:bg-gray-100 dark:hover:bg-white/[0.05] transition-all font-bold"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="flex items-center gap-2 px-8 py-2.5 bg-sky-500 hover:bg-sky-600 text-white rounded-xl font-bold transition-all shadow-lg shadow-sky-500/20 disabled:opacity-50 active:scale-[0.98]"
                                >
                                    {isSaving ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <Save className="w-5 h-5" />
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
