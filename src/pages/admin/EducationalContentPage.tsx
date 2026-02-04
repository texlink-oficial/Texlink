import React, { useEffect, useState } from 'react';
import {
    GraduationCap, Plus, Pencil, Trash2, Eye, EyeOff,
    Save, X, Loader2, GripVertical, ExternalLink, Video, FileText,
    Image, BookOpen, Clock
} from 'lucide-react';
import { educationalContentService, CreateEducationalContentDto, UpdateEducationalContentDto } from '../../services/educationalContent.service';
import type { EducationalContent, EducationalContentType, EducationalContentCategory } from '../../types';
import { EDUCATIONAL_CATEGORY_LABELS, EDUCATIONAL_CONTENT_TYPE_LABELS } from '../../types';

const TYPE_ICONS: Record<EducationalContentType, React.ElementType> = {
    VIDEO: Video,
    IMAGE: Image,
    DOCUMENT: FileText,
    ARTICLE: BookOpen,
};

const EMPTY_FORM: CreateEducationalContentDto = {
    title: '',
    description: '',
    contentType: 'VIDEO',
    contentUrl: '',
    thumbnailUrl: '',
    category: 'TUTORIAL_SISTEMA',
    duration: '',
    isActive: true,
    displayOrder: 0,
};

const EducationalContentPage: React.FC = () => {
    const [contents, setContents] = useState<EducationalContent[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingContent, setEditingContent] = useState<EducationalContent | null>(null);
    const [formData, setFormData] = useState<CreateEducationalContentDto>(EMPTY_FORM);
    const [isSaving, setIsSaving] = useState(false);
    const [filterActive, setFilterActive] = useState<boolean | undefined>(undefined);
    const [filterType, setFilterType] = useState<EducationalContentType | ''>('');
    const [filterCategory, setFilterCategory] = useState<EducationalContentCategory | ''>('');

    useEffect(() => {
        loadContents();
    }, [filterActive, filterType, filterCategory]);

    const loadContents = async () => {
        try {
            setIsLoading(true);
            const data = await educationalContentService.getAllAdmin(
                filterCategory || undefined,
                filterType || undefined,
                filterActive
            );
            setContents(data);
        } catch (error) {
            console.error('Error loading educational contents:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const openCreateModal = () => {
        setEditingContent(null);
        setFormData({ ...EMPTY_FORM, displayOrder: contents.length });
        setIsModalOpen(true);
    };

    const openEditModal = (content: EducationalContent) => {
        setEditingContent(content);
        setFormData({
            title: content.title,
            description: content.description,
            contentType: content.contentType,
            contentUrl: content.contentUrl,
            thumbnailUrl: content.thumbnailUrl || '',
            category: content.category,
            duration: content.duration || '',
            isActive: content.isActive,
            displayOrder: content.displayOrder,
        });
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingContent(null);
        setFormData(EMPTY_FORM);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);

        try {
            const dto: CreateEducationalContentDto | UpdateEducationalContentDto = {
                ...formData,
                thumbnailUrl: formData.thumbnailUrl || undefined,
                duration: formData.duration || undefined,
            };

            if (editingContent) {
                await educationalContentService.update(editingContent.id, dto);
            } else {
                await educationalContentService.create(dto as CreateEducationalContentDto);
            }

            closeModal();
            loadContents();
        } catch (error) {
            console.error('Error saving content:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleToggleActive = async (content: EducationalContent) => {
        try {
            await educationalContentService.toggleActive(content.id);
            loadContents();
        } catch (error) {
            console.error('Error toggling content:', error);
        }
    };

    const handleDelete = async (content: EducationalContent) => {
        if (!confirm(`Tem certeza que deseja excluir "${content.title}"?`)) return;

        try {
            await educationalContentService.delete(content.id);
            loadContents();
        } catch (error) {
            console.error('Error deleting content:', error);
        }
    };

    const handlePreview = (content: EducationalContent) => {
        window.open(content.contentUrl, '_blank');
    };

    return (
        <div className="animate-fade-in">
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
                {/* Header Section */}
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white font-display">Conteúdo Educacional</h1>
                        <p className="text-gray-500 dark:text-gray-400 font-medium">{contents.length} conteúdos cadastrados no sistema</p>
                    </div>

                    <button
                        onClick={openCreateModal}
                        className="flex items-center gap-2 px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-xl font-bold transition-all shadow-lg shadow-sky-500/20 active:scale-[0.98]"
                    >
                        <Plus className="w-5 h-5" />
                        Novo Conteúdo
                    </button>
                </div>

                {/* Filters Row */}
                <div className="flex flex-wrap items-center gap-4">
                    <div className="relative group w-48">
                        <Video className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-sky-500 transition-colors pointer-events-none" />
                        <select
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value as EducationalContentType | '')}
                            className="w-full pl-10 pr-8 py-2.5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-white/[0.06] rounded-xl text-gray-700 dark:text-white appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-sky-500/50 shadow-sm transition-all font-medium"
                        >
                            <option value="">Todos os tipos</option>
                            {Object.entries(EDUCATIONAL_CONTENT_TYPE_LABELS).map(([key, label]) => (
                                <option key={key} value={key}>{label}</option>
                            ))}
                        </select>
                    </div>

                    <div className="relative group w-64">
                        <GraduationCap className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-sky-500 transition-colors pointer-events-none" />
                        <select
                            value={filterCategory}
                            onChange={(e) => setFilterCategory(e.target.value as EducationalContentCategory | '')}
                            className="w-full pl-10 pr-8 py-2.5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-white/[0.06] rounded-xl text-gray-700 dark:text-white appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-sky-500/50 shadow-sm transition-all font-medium"
                        >
                            <option value="">Todas as categorias</option>
                            {Object.entries(EDUCATIONAL_CATEGORY_LABELS).map(([key, label]) => (
                                <option key={key} value={key}>{label}</option>
                            ))}
                        </select>
                    </div>

                    <div className="relative group w-48">
                        <Eye className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-sky-500 transition-colors pointer-events-none" />
                        <select
                            value={filterActive === undefined ? '' : String(filterActive)}
                            onChange={(e) => setFilterActive(e.target.value === '' ? undefined : e.target.value === 'true')}
                            className="w-full pl-10 pr-8 py-2.5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-white/[0.06] rounded-xl text-gray-700 dark:text-white appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-sky-500/50 shadow-sm transition-all font-medium"
                        >
                            <option value="">Todos os status</option>
                            <option value="true">Somente Ativos</option>
                            <option value="false">Somente Inativos</option>
                        </select>
                    </div>
                </div>

                {/* Table Content */}
                <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-white/[0.06] rounded-2xl overflow-hidden shadow-sm">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-24 gap-4">
                            <div className="relative">
                                <div className="absolute inset-0 bg-sky-500/20 blur-xl rounded-full animate-pulse" />
                                <Loader2 className="w-10 h-10 text-sky-500 animate-spin relative" />
                            </div>
                            <p className="text-gray-500 dark:text-gray-400 font-medium tracking-tight">Recuperando trilhas de conhecimento...</p>
                        </div>
                    ) : contents.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-24 text-center px-6">
                            <div className="w-16 h-16 bg-gray-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center mb-6 shadow-xl shadow-black/5">
                                <GraduationCap className="w-8 h-8 text-gray-400" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 font-display">Nenhum conteúdo encontrado</h3>
                            <p className="text-gray-500 dark:text-gray-400 max-w-xs mx-auto mb-8">
                                Comece adicionando o primeiro vídeo ou artigo para capacitar sua rede.
                            </p>
                            <button
                                onClick={openCreateModal}
                                className="px-6 py-2.5 bg-sky-500 hover:bg-sky-600 text-white rounded-xl font-bold transition-all shadow-lg shadow-sky-500/20"
                            >
                                Adicionar Conteúdo
                            </button>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-gray-50 dark:bg-white/[0.02] border-b border-gray-100 dark:border-white/[0.06]">
                                        <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest w-20 text-center">Ordem</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Conteúdo</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Tipo</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Categoria</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest text-center">Status</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-white/[0.06]">
                                    {contents.map((content) => {
                                        const TypeIcon = TYPE_ICONS[content.contentType];
                                        return (
                                            <tr key={content.id} className="hover:bg-gray-50 dark:hover:bg-white/[0.01] transition-colors group">
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col items-center gap-1">
                                                        <GripVertical className="w-4 h-4 text-gray-300 dark:text-gray-600 cursor-grab" />
                                                        <span className="text-xs font-bold text-gray-500 dark:text-gray-500 font-mono">{(content.displayOrder + 1).toString().padStart(2, '0')}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 min-w-[300px]">
                                                    <div className="flex items-center gap-4">
                                                        <div className="flex-shrink-0 w-24 h-14 bg-gray-100 dark:bg-slate-800 rounded-xl overflow-hidden border border-gray-100 dark:border-white/[0.08] shadow-sm group-hover:shadow-md transition-shadow relative">
                                                            {content.thumbnailUrl ? (
                                                                <img
                                                                    src={content.thumbnailUrl}
                                                                    alt={content.title}
                                                                    className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-500"
                                                                />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-600">
                                                                    <TypeIcon className="w-6 h-6" />
                                                                </div>
                                                            )}
                                                            {content.duration && (
                                                                <div className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-black/70 backdrop-blur-sm rounded text-[8px] font-bold text-white uppercase tracking-tighter">
                                                                    {content.duration}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="font-bold text-gray-900 dark:text-white group-hover:text-sky-500 transition-colors font-display line-clamp-1">
                                                                {content.title}
                                                            </p>
                                                            <p className="text-[11px] text-gray-500 dark:text-gray-500 font-medium line-clamp-1 mt-0.5 leading-relaxed">
                                                                {content.description}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.08] rounded-lg text-xs font-semibold text-gray-600 dark:text-gray-300">
                                                        <TypeIcon className="w-3.5 h-3.5" />
                                                        {EDUCATIONAL_CONTENT_TYPE_LABELS[content.contentType]}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-sky-500/5 text-sky-600 dark:text-sky-400 border border-sky-500/10 rounded-lg text-xs font-bold uppercase tracking-wider">
                                                        {EDUCATIONAL_CATEGORY_LABELS[content.category]}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    {content.isActive ? (
                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg text-[10px] font-bold uppercase tracking-wider">
                                                            <Eye className="w-3.5 h-3.5" />
                                                            Publicado
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-500/10 text-gray-600 dark:text-gray-400 rounded-lg text-[10px] font-bold uppercase tracking-wider">
                                                            <EyeOff className="w-3.5 h-3.5" />
                                                            Oculto
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        <button
                                                            onClick={() => handlePreview(content)}
                                                            className="p-2 text-gray-400 hover:text-sky-500 hover:bg-sky-500/10 rounded-xl transition-all"
                                                            title="Ver conteúdo"
                                                        >
                                                            <ExternalLink className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleToggleActive(content)}
                                                            className={`p-2 rounded-xl transition-all ${content.isActive
                                                                ? 'text-amber-500 hover:bg-amber-500/10'
                                                                : 'text-emerald-500 hover:bg-emerald-500/10'
                                                                }`}
                                                            title={content.isActive ? 'Ocultar' : 'Publicar'}
                                                        >
                                                            {content.isActive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                        </button>
                                                        <button
                                                            onClick={() => openEditModal(content)}
                                                            className="p-2 text-gray-400 hover:text-sky-500 hover:bg-sky-500/10 rounded-xl transition-all"
                                                            title="Editar"
                                                        >
                                                            <Pencil className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(content)}
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
                    )}
                </div>
            </main>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-gray-200 dark:border-white/[0.06] w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-white/[0.06]">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-sky-500/10 rounded-2xl flex items-center justify-center shadow-lg shadow-sky-500/5 transition-all">
                                    <GraduationCap className="w-6 h-6 text-sky-500" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900 dark:text-white font-display leading-tight">
                                        {editingContent ? 'Editar Conteúdo' : 'Novo Conteúdo'}
                                    </h2>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium tracking-tight">Capacite as facções com novos conhecimentos</p>
                                </div>
                            </div>
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
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Título do Conteúdo *</label>
                                        <input
                                            type="text"
                                            name="title"
                                            value={formData.title}
                                            onChange={handleInputChange}
                                            required
                                            className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-white/[0.06] rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500/50 shadow-sm transition-all"
                                        />
                                    </div>

                                    <div className="col-span-2">
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Descrição Curta *</label>
                                        <textarea
                                            name="description"
                                            value={formData.description}
                                            onChange={handleInputChange}
                                            required
                                            rows={3}
                                            className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-white/[0.06] rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500/50 shadow-sm transition-all resize-none"
                                        />
                                    </div>

                                    <div className="group relative">
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Tipo de Mídia *</label>
                                        <div className="relative">
                                            <Video className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                            <select
                                                name="contentType"
                                                value={formData.contentType}
                                                onChange={handleInputChange}
                                                required
                                                className="w-full pl-10 pr-8 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-white/[0.06] rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500/50 appearance-none cursor-pointer font-medium"
                                            >
                                                {Object.entries(EDUCATIONAL_CONTENT_TYPE_LABELS).map(([key, label]) => (
                                                    <option key={key} value={key}>{label}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="group relative">
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Categoria *</label>
                                        <div className="relative">
                                            <GraduationCap className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                            <select
                                                name="category"
                                                value={formData.category}
                                                onChange={handleInputChange}
                                                required
                                                className="w-full pl-10 pr-8 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-white/[0.06] rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500/50 appearance-none cursor-pointer font-medium"
                                            >
                                                {Object.entries(EDUCATIONAL_CATEGORY_LABELS).map(([key, label]) => (
                                                    <option key={key} value={key}>{label}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="col-span-2">
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Link de Acesso (URL) *</label>
                                        <div className="relative">
                                            <ExternalLink className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                            <input
                                                type="url"
                                                name="contentUrl"
                                                value={formData.contentUrl}
                                                onChange={handleInputChange}
                                                required
                                                placeholder="https://..."
                                                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-white/[0.06] rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500/50 shadow-sm transition-all"
                                            />
                                        </div>
                                    </div>

                                    <div className="col-span-2">
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Link da Thumbnail (URL)</label>
                                        <div className="relative">
                                            <Image className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                            <input
                                                type="url"
                                                name="thumbnailUrl"
                                                value={formData.thumbnailUrl}
                                                onChange={handleInputChange}
                                                placeholder="https://..."
                                                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-white/[0.06] rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500/50 shadow-sm transition-all"
                                            />
                                        </div>
                                    </div>

                                    {formData.contentType === 'VIDEO' && (
                                        <div className="relative group">
                                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Duração</label>
                                            <div className="relative">
                                                <Clock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                                <input
                                                    type="text"
                                                    name="duration"
                                                    value={formData.duration}
                                                    onChange={handleInputChange}
                                                    placeholder="MM:SS"
                                                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-white/[0.06] rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500/50 shadow-sm transition-all"
                                                />
                                            </div>
                                        </div>
                                    )}

                                    <div className="relative group">
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Posição / Ordem</label>
                                        <div className="relative">
                                            <GripVertical className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                            <input
                                                type="number"
                                                name="displayOrder"
                                                value={formData.displayOrder}
                                                onChange={handleInputChange}
                                                min={0}
                                                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-white/[0.06] rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500/50 shadow-sm transition-all"
                                            />
                                        </div>
                                    </div>

                                    <div className="col-span-2 pt-2">
                                        <label className="flex items-center gap-3 cursor-pointer group w-fit">
                                            <div className="relative">
                                                <input
                                                    type="checkbox"
                                                    name="isActive"
                                                    checked={formData.isActive}
                                                    onChange={handleInputChange}
                                                    className="peer sr-only"
                                                />
                                                <div className="w-10 h-6 bg-gray-200 dark:bg-slate-800 rounded-full transition-colors group-hover:bg-gray-300 dark:group-hover:bg-slate-700 peer-checked:bg-emerald-500" />
                                                <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-4 shadow-sm" />
                                            </div>
                                            <span className="text-sm font-bold text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">Conteúdo disponível para usuáríos</span>
                                        </label>
                                    </div>
                                </div>
                            </div>

                            {/* Sticky Footer */}
                            <div className="sticky bottom-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md p-6 border-t border-gray-100 dark:border-white/[0.06] flex justify-end gap-3 mt-auto">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="px-6 py-2.5 text-gray-500 dark:text-gray-400 font-bold hover:text-gray-900 dark:hover:text-white transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="flex items-center gap-2 px-8 py-2.5 bg-sky-500 hover:bg-sky-600 text-white rounded-xl font-bold transition-all shadow-lg shadow-sky-500/20 disabled:opacity-50 active:scale-[0.98]"
                                >
                                    {isSaving ? (
                                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                                    ) : (
                                        <Save className="w-4 h-4 text-white" />
                                    )}
                                    {editingContent ? 'Salvar Alterações' : 'Publicar Conteúdo'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EducationalContentPage;
