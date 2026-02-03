import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    ArrowLeft, GraduationCap, RefreshCw, Play, FileText, Image,
    BookOpen, ExternalLink, Clock, Search, X, Video, File
} from 'lucide-react';
import { educationalContentService } from '../../services/educationalContent.service';
import type { EducationalContent, EducationalContentCategory, EducationalContentCategoryCount, EducationalContentType } from '../../types';
import { EDUCATIONAL_CATEGORY_LABELS, EDUCATIONAL_CONTENT_TYPE_LABELS } from '../../types';

const CATEGORY_COLORS: Record<EducationalContentCategory, { bg: string; text: string; border: string }> = {
    TUTORIAL_SISTEMA: { bg: 'bg-blue-100 dark:bg-blue-500/10', text: 'text-blue-700 dark:text-blue-400', border: 'border-blue-200 dark:border-blue-500/20' },
    BOAS_PRATICAS: { bg: 'bg-green-100 dark:bg-green-500/10', text: 'text-green-700 dark:text-green-400', border: 'border-green-200 dark:border-green-500/20' },
    COMPLIANCE: { bg: 'bg-purple-100 dark:bg-purple-500/10', text: 'text-purple-700 dark:text-purple-400', border: 'border-purple-200 dark:border-purple-500/20' },
    PRODUCAO: { bg: 'bg-orange-100 dark:bg-orange-500/10', text: 'text-orange-700 dark:text-orange-400', border: 'border-orange-200 dark:border-orange-500/20' },
    FINANCEIRO: { bg: 'bg-yellow-100 dark:bg-yellow-500/10', text: 'text-yellow-700 dark:text-yellow-400', border: 'border-yellow-200 dark:border-yellow-500/20' },
    QUALIDADE: { bg: 'bg-cyan-100 dark:bg-cyan-500/10', text: 'text-cyan-700 dark:text-cyan-400', border: 'border-cyan-200 dark:border-cyan-500/20' },
    NOVIDADES: { bg: 'bg-pink-100 dark:bg-pink-500/10', text: 'text-pink-700 dark:text-pink-400', border: 'border-pink-200 dark:border-pink-500/20' },
};

const TYPE_ICONS: Record<EducationalContentType, React.ElementType> = {
    VIDEO: Video,
    IMAGE: Image,
    DOCUMENT: FileText,
    ARTICLE: BookOpen,
};

const EducaPage: React.FC = () => {
    const [contents, setContents] = useState<EducationalContent[]>([]);
    const [categories, setCategories] = useState<EducationalContentCategoryCount[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState<EducationalContentCategory | ''>('');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedVideo, setSelectedVideo] = useState<EducationalContent | null>(null);

    useEffect(() => {
        loadData();
    }, [selectedCategory]);

    const loadData = async () => {
        try {
            setIsLoading(true);
            const [contentsData, categoriesData] = await Promise.all([
                educationalContentService.getAll(selectedCategory || undefined),
                educationalContentService.getCategories(),
            ]);
            setContents(contentsData);
            setCategories(categoriesData);
        } catch (error) {
            console.error('Error loading educational content:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleContentClick = (content: EducationalContent) => {
        if (content.contentType === 'VIDEO') {
            setSelectedVideo(content);
        } else {
            // Open documents, images, and articles in a new tab
            window.open(content.contentUrl, '_blank');
        }
    };

    const getVideoEmbedUrl = (url: string): string => {
        // Convert YouTube watch URL to embed URL
        const youtubeMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&]+)/);
        if (youtubeMatch) {
            return `https://www.youtube.com/embed/${youtubeMatch[1]}`;
        }
        // Convert Vimeo URL to embed URL
        const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
        if (vimeoMatch) {
            return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
        }
        return url;
    };

    const filteredContents = contents.filter(content =>
        content.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        content.description.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalContents = categories.reduce((acc, c) => acc + c.count, 0);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                <RefreshCw className="w-8 h-8 text-brand-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            {/* Header */}
            <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <div className="flex items-center gap-4 mb-4">
                        <Link to="/portal" className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors">
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <div className="p-3 bg-brand-100 dark:bg-brand-500/20 rounded-xl">
                            <GraduationCap className="w-8 h-8 text-brand-600 dark:text-brand-400" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Texlink Educa</h1>
                            <p className="text-gray-500 dark:text-gray-400">
                                Aprenda a usar a plataforma e melhore sua produção
                            </p>
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-6 mt-6">
                        <div className="flex items-center gap-2">
                            <BookOpen className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                            <span className="text-gray-900 dark:text-white font-medium">{totalContents} conteúdos disponíveis</span>
                        </div>
                    </div>
                </div>
            </header>

            {/* Search Bar */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Buscar conteúdo..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                    {searchTerm && (
                        <button
                            onClick={() => setSearchTerm('')}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-white"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    )}
                </div>
            </div>

            {/* Category Filter */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-6">
                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={() => setSelectedCategory('')}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                            selectedCategory === ''
                                ? 'bg-brand-500 text-white'
                                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
                        }`}
                    >
                        Todos ({totalContents})
                    </button>
                    {categories.map(({ category, count }) => {
                        const colors = CATEGORY_COLORS[category];
                        const isSelected = selectedCategory === category;

                        return (
                            <button
                                key={category}
                                onClick={() => setSelectedCategory(category)}
                                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                                    isSelected
                                        ? `${colors.bg} ${colors.text} ${colors.border} border`
                                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
                                }`}
                            >
                                {EDUCATIONAL_CATEGORY_LABELS[category]} ({count})
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Content Grid */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
                {filteredContents.length === 0 ? (
                    <div className="text-center py-12">
                        <GraduationCap className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                            Nenhum conteúdo encontrado
                        </h3>
                        <p className="text-gray-500 dark:text-gray-400">
                            {searchTerm
                                ? 'Tente buscar por outro termo.'
                                : 'Não há conteúdos disponíveis nesta categoria no momento.'}
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredContents.map((content) => {
                            const TypeIcon = TYPE_ICONS[content.contentType];
                            const colors = CATEGORY_COLORS[content.category];

                            return (
                                <div
                                    key={content.id}
                                    onClick={() => handleContentClick(content)}
                                    className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:border-brand-500 dark:hover:border-brand-500 transition-all cursor-pointer group shadow-sm hover:shadow-md"
                                >
                                    {/* Thumbnail / Media Preview */}
                                    <div className="relative aspect-video bg-gray-100 dark:bg-gray-700">
                                        {content.thumbnailUrl ? (
                                            <img
                                                src={content.thumbnailUrl}
                                                alt={content.title}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <TypeIcon className="w-16 h-16 text-gray-400 dark:text-gray-600" />
                                            </div>
                                        )}

                                        {/* Type overlay icon */}
                                        <div className="absolute top-3 left-3">
                                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-black/60 rounded-lg text-xs text-white">
                                                <TypeIcon className="w-3 h-3" />
                                                {EDUCATIONAL_CONTENT_TYPE_LABELS[content.contentType]}
                                            </span>
                                        </div>

                                        {/* Play button for videos */}
                                        {content.contentType === 'VIDEO' && (
                                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                <div className="w-16 h-16 bg-brand-500/90 rounded-full flex items-center justify-center">
                                                    <Play className="w-8 h-8 text-white ml-1" />
                                                </div>
                                            </div>
                                        )}

                                        {/* Duration for videos */}
                                        {content.duration && (
                                            <div className="absolute bottom-3 right-3">
                                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-black/60 rounded-lg text-xs text-white">
                                                    <Clock className="w-3 h-3" />
                                                    {content.duration}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Content Info */}
                                    <div className="p-6">
                                        <div className="flex items-start justify-between gap-2 mb-2">
                                            <h3 className="font-bold text-gray-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors line-clamp-2">
                                                {content.title}
                                            </h3>
                                        </div>

                                        <p className="text-gray-500 dark:text-gray-400 text-sm line-clamp-2 mb-4">
                                            {content.description}
                                        </p>

                                        <div className="flex items-center justify-between">
                                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium ${colors.bg} ${colors.text}`}>
                                                {EDUCATIONAL_CATEGORY_LABELS[content.category]}
                                            </span>

                                            {content.contentType !== 'VIDEO' && (
                                                <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                                                    <ExternalLink className="w-3 h-3" />
                                                    Abrir
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Video Modal */}
            {selectedVideo && (
                <div
                    className="fixed inset-0 bg-black/70 dark:bg-black/80 flex items-center justify-center z-50 p-4"
                    onClick={() => setSelectedVideo(null)}
                >
                    <div
                        className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 w-full max-w-4xl overflow-hidden shadow-xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                            <div>
                                <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                                    {selectedVideo.title}
                                </h2>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    {EDUCATIONAL_CATEGORY_LABELS[selectedVideo.category]}
                                    {selectedVideo.duration && ` • ${selectedVideo.duration}`}
                                </p>
                            </div>
                            <button
                                onClick={() => setSelectedVideo(null)}
                                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="aspect-video">
                            <iframe
                                src={getVideoEmbedUrl(selectedVideo.contentUrl)}
                                className="w-full h-full"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                            />
                        </div>

                        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                            <p className="text-gray-600 dark:text-gray-300 text-sm">
                                {selectedVideo.description}
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EducaPage;
