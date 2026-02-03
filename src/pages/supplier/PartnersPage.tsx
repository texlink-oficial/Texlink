import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    ArrowLeft, ExternalLink, Gift, Heart, Shield, Calculator,
    DollarSign, Cpu, GraduationCap, Umbrella, MoreHorizontal,
    RefreshCw, Tag, Mail, Phone, Check, Sparkles
} from 'lucide-react';
import { partnersService } from '../../services/partners.service';
import type { Partner, PartnerCategory, PartnerCategoryCount } from '../../types';
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

const CATEGORY_COLORS: Record<PartnerCategory, { bg: string; text: string; border: string }> = {
    HEALTH_WELLNESS: { bg: 'bg-pink-100 dark:bg-pink-500/10', text: 'text-pink-700 dark:text-pink-400', border: 'border-pink-200 dark:border-pink-500/20' },
    COMPLIANCE: { bg: 'bg-blue-100 dark:bg-blue-500/10', text: 'text-blue-700 dark:text-blue-400', border: 'border-blue-200 dark:border-blue-500/20' },
    ACCOUNTING: { bg: 'bg-green-100 dark:bg-green-500/10', text: 'text-green-700 dark:text-green-400', border: 'border-green-200 dark:border-green-500/20' },
    FINANCE: { bg: 'bg-yellow-100 dark:bg-yellow-500/10', text: 'text-yellow-700 dark:text-yellow-400', border: 'border-yellow-200 dark:border-yellow-500/20' },
    TECHNOLOGY: { bg: 'bg-purple-100 dark:bg-purple-500/10', text: 'text-purple-700 dark:text-purple-400', border: 'border-purple-200 dark:border-purple-500/20' },
    TRAINING: { bg: 'bg-orange-100 dark:bg-orange-500/10', text: 'text-orange-700 dark:text-orange-400', border: 'border-orange-200 dark:border-orange-500/20' },
    INSURANCE: { bg: 'bg-cyan-100 dark:bg-cyan-500/10', text: 'text-cyan-700 dark:text-cyan-400', border: 'border-cyan-200 dark:border-cyan-500/20' },
    OTHER: { bg: 'bg-gray-100 dark:bg-gray-500/10', text: 'text-gray-700 dark:text-gray-400', border: 'border-gray-200 dark:border-gray-500/20' },
};

const PartnersPage: React.FC = () => {
    const [partners, setPartners] = useState<Partner[]>([]);
    const [categories, setCategories] = useState<PartnerCategoryCount[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState<PartnerCategory | ''>('');

    useEffect(() => {
        loadData();
    }, [selectedCategory]);

    const loadData = async () => {
        try {
            setIsLoading(true);
            const [partnersData, categoriesData] = await Promise.all([
                partnersService.getAll(selectedCategory || undefined),
                partnersService.getCategories(),
            ]);
            setPartners(partnersData);
            setCategories(categoriesData);
        } catch (error) {
            console.error('Error loading partners:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const totalPartners = categories.reduce((acc, c) => acc + c.count, 0);

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
                            <Gift className="w-8 h-8 text-brand-600 dark:text-brand-400" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Parceiros & Benefícios</h1>
                            <p className="text-gray-500 dark:text-gray-400">
                                Soluções exclusivas para impulsionar seu negócio
                            </p>
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-6 mt-6">
                        <div className="flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-yellow-500" />
                            <span className="text-gray-900 dark:text-white font-medium">{totalPartners} parceiros disponíveis</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Tag className="w-5 h-5 text-green-500" />
                            <span className="text-gray-500 dark:text-gray-400">Descontos exclusivos Texlink</span>
                        </div>
                    </div>
                </div>
            </header>

            {/* Category Filter */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={() => setSelectedCategory('')}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                            selectedCategory === ''
                                ? 'bg-brand-500 text-white'
                                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
                        }`}
                    >
                        Todos ({totalPartners})
                    </button>
                    {categories.map(({ category, count }) => {
                        const Icon = CATEGORY_ICONS[category];
                        const colors = CATEGORY_COLORS[category];
                        const isSelected = selectedCategory === category;

                        return (
                            <button
                                key={category}
                                onClick={() => setSelectedCategory(category)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                                    isSelected
                                        ? `${colors.bg} ${colors.text} ${colors.border} border`
                                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
                                }`}
                            >
                                <Icon className="w-4 h-4" />
                                {PARTNER_CATEGORY_LABELS[category]} ({count})
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Partners Grid */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
                {partners.length === 0 ? (
                    <div className="text-center py-12">
                        <Gift className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                            Nenhum parceiro encontrado
                        </h3>
                        <p className="text-gray-500 dark:text-gray-400">
                            Não há parceiros disponíveis nesta categoria no momento.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {partners.map((partner) => {
                            const Icon = CATEGORY_ICONS[partner.category];
                            const colors = CATEGORY_COLORS[partner.category];

                            return (
                                <div
                                    key={partner.id}
                                    className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:border-brand-500 dark:hover:border-brand-500 transition-all group shadow-sm hover:shadow-md"
                                >
                                    {/* Card Header */}
                                    <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                                        <div className="flex items-start justify-between gap-4 mb-4">
                                            <div className="flex items-center gap-3">
                                                {partner.logoUrl ? (
                                                    <img
                                                        src={partner.logoUrl}
                                                        alt={partner.name}
                                                        className="w-12 h-12 rounded-xl object-contain bg-gray-100 dark:bg-white p-1"
                                                    />
                                                ) : (
                                                    <div className={`w-12 h-12 rounded-xl ${colors.bg} flex items-center justify-center`}>
                                                        <Icon className={`w-6 h-6 ${colors.text}`} />
                                                    </div>
                                                )}
                                                <div>
                                                    <h3 className="font-bold text-gray-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                                                        {partner.name}
                                                    </h3>
                                                    <span className={`text-xs font-medium ${colors.text}`}>
                                                        {PARTNER_CATEGORY_LABELS[partner.category]}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <p className="text-gray-500 dark:text-gray-400 text-sm line-clamp-3">
                                            {partner.description}
                                        </p>
                                    </div>

                                    {/* Benefits */}
                                    <div className="p-6 space-y-4">
                                        <div>
                                            <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                                                Benefícios
                                            </h4>
                                            <ul className="space-y-2">
                                                {partner.benefits.slice(0, 4).map((benefit, idx) => (
                                                    <li key={idx} className="flex items-start gap-2 text-sm">
                                                        <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                                                        <span className="text-gray-600 dark:text-gray-300">{benefit}</span>
                                                    </li>
                                                ))}
                                                {partner.benefits.length > 4 && (
                                                    <li className="text-sm text-gray-400 dark:text-gray-500">
                                                        +{partner.benefits.length - 4} mais benefícios
                                                    </li>
                                                )}
                                            </ul>
                                        </div>

                                        {/* Discount Badge */}
                                        {(partner.discountCode || partner.discountInfo) && (
                                            <div className="bg-green-50 dark:bg-gradient-to-r dark:from-green-500/10 dark:to-emerald-500/10 rounded-xl p-4 border border-green-200 dark:border-green-500/20">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <Tag className="w-4 h-4 text-green-600 dark:text-green-400" />
                                                    <span className="text-green-700 dark:text-green-400 font-semibold text-sm">
                                                        Oferta Exclusiva Texlink
                                                    </span>
                                                </div>
                                                {partner.discountInfo && (
                                                    <p className="text-green-600 dark:text-green-300 text-sm">{partner.discountInfo}</p>
                                                )}
                                                {partner.discountCode && (
                                                    <div className="mt-2 inline-flex items-center gap-2 bg-green-100 dark:bg-green-500/20 px-3 py-1 rounded-lg">
                                                        <span className="text-xs text-green-600 dark:text-green-300">Código:</span>
                                                        <span className="font-mono font-bold text-green-700 dark:text-green-400">
                                                            {partner.discountCode}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Contact Info */}
                                        {(partner.contactEmail || partner.contactPhone) && (
                                            <div className="flex flex-wrap gap-3 text-sm">
                                                {partner.contactEmail && (
                                                    <a
                                                        href={`mailto:${partner.contactEmail}`}
                                                        className="flex items-center gap-1 text-gray-500 dark:text-gray-400 hover:text-brand-600 dark:hover:text-white transition-colors"
                                                    >
                                                        <Mail className="w-4 h-4" />
                                                        {partner.contactEmail}
                                                    </a>
                                                )}
                                                {partner.contactPhone && (
                                                    <a
                                                        href={`tel:${partner.contactPhone}`}
                                                        className="flex items-center gap-1 text-gray-500 dark:text-gray-400 hover:text-brand-600 dark:hover:text-white transition-colors"
                                                    >
                                                        <Phone className="w-4 h-4" />
                                                        {partner.contactPhone}
                                                    </a>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Card Footer */}
                                    <div className="p-6 pt-0">
                                        <a
                                            href={partner.website}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center justify-center gap-2 w-full py-3 bg-brand-500 hover:bg-brand-600 text-white font-medium rounded-xl transition-colors"
                                        >
                                            <ExternalLink className="w-4 h-4" />
                                            Saiba mais
                                        </a>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default PartnersPage;
