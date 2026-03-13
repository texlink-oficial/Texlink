import React from 'react';
import { X, Building2, Factory, Mail, Phone, MapPin, Calendar, FileText, Package } from 'lucide-react';

interface Company {
    id: string;
    legalName: string;
    tradeName: string | null;
    document: string;
    email?: string | null;
    phone?: string | null;
    city: string;
    state: string;
    status: string;
    type?: string;
    createdAt: string;
    _count?: {
        ordersAsBrand?: number;
        ordersAsSupplier?: number;
    };
    supplierProfile?: {
        productTypes?: string[];
        dailyCapacity?: number;
        onboardingComplete?: boolean;
    } | null;
}

interface Props {
    company: Company;
    onClose: () => void;
}

const formatDocument = (doc: string) => {
    if (!doc) return '-';
    if (doc.length === 14) {
        return doc.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }
    return doc;
};

const statusLabels: Record<string, { label: string; color: string }> = {
    ACTIVE: { label: 'Ativa', color: 'emerald' },
    PENDING: { label: 'Pendente', color: 'amber' },
    SUSPENDED: { label: 'Suspensa', color: 'rose' },
};

export default function CompanyDetailsModal({ company, onClose }: Props) {
    const isSupplier = company.type === 'SUPPLIER' || !!company.supplierProfile;
    const statusInfo = statusLabels[company.status] || statusLabels.PENDING;
    const ordersCount = isSupplier
        ? (company._count?.ordersAsSupplier || 0)
        : (company._count?.ordersAsBrand || 0);

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl max-w-lg w-full shadow-2xl overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-sky-500/10 rounded-xl flex items-center justify-center">
                            {isSupplier ? <Factory className="w-5 h-5 text-sky-500" /> : <Building2 className="w-5 h-5 text-sky-500" />}
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                                {company.tradeName || company.legalName}
                            </h2>
                            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 bg-${statusInfo.color}-500/10 text-${statusInfo.color}-600 dark:text-${statusInfo.color}-400 rounded-full text-[10px] font-bold uppercase tracking-wider`}>
                                <span className={`w-1.5 h-1.5 rounded-full bg-${statusInfo.color}-500`} />
                                {statusInfo.label}
                            </span>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                    {/* Legal Name */}
                    {company.tradeName && company.tradeName !== company.legalName && (
                        <div className="flex items-start gap-3">
                            <FileText className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                            <div>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Razão Social</p>
                                <p className="text-sm text-gray-900 dark:text-white font-medium">{company.legalName}</p>
                            </div>
                        </div>
                    )}

                    {/* CNPJ */}
                    <div className="flex items-start gap-3">
                        <FileText className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                        <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">CNPJ</p>
                            <p className="text-sm text-gray-900 dark:text-white font-mono">{formatDocument(company.document)}</p>
                        </div>
                    </div>

                    {/* Location */}
                    <div className="flex items-start gap-3">
                        <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                        <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Localidade</p>
                            <p className="text-sm text-gray-900 dark:text-white font-medium">{company.city}, {company.state}</p>
                        </div>
                    </div>

                    {/* Contact */}
                    {(company.email || company.phone) && (
                        <div className="grid grid-cols-2 gap-4">
                            {company.email && (
                                <div className="flex items-start gap-3">
                                    <Mail className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Email</p>
                                        <p className="text-sm text-gray-900 dark:text-white font-medium truncate">{company.email}</p>
                                    </div>
                                </div>
                            )}
                            {company.phone && (
                                <div className="flex items-start gap-3">
                                    <Phone className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Telefone</p>
                                        <p className="text-sm text-gray-900 dark:text-white font-medium">{company.phone}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Orders */}
                    <div className="flex items-start gap-3">
                        <Package className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                        <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Pedidos</p>
                            <p className="text-sm text-gray-900 dark:text-white font-bold">{ordersCount}</p>
                        </div>
                    </div>

                    {/* Created */}
                    <div className="flex items-start gap-3">
                        <Calendar className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                        <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Cadastrada em</p>
                            <p className="text-sm text-gray-900 dark:text-white font-medium">
                                {new Date(company.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                            </p>
                        </div>
                    </div>

                    {/* Supplier Profile */}
                    {isSupplier && company.supplierProfile && (
                        <>
                            {company.supplierProfile.productTypes && company.supplierProfile.productTypes.length > 0 && (
                                <div>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Especialidades</p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {company.supplierProfile.productTypes.map((type) => (
                                            <span key={type} className="px-2.5 py-1 bg-gray-100 dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.06] rounded-lg text-xs font-bold text-gray-600 dark:text-gray-400">
                                                {type}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end p-4 border-t border-gray-100 dark:border-gray-700">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-bold rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
                    >
                        Fechar
                    </button>
                </div>
            </div>
        </div>
    );
}
