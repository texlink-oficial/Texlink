import React, { useEffect, useState } from 'react';
import {
    X, Building2, Factory, Mail, Phone, MapPin, Calendar, FileText, Package,
    Star, Users, Wallet, Gauge, Wrench, Loader2, Clock, CheckCircle, XCircle,
    TrendingUp, DollarSign
} from 'lucide-react';
import { adminService } from '../../services/admin.service';

interface CompanyBasic {
    id: string;
    legalName: string;
    tradeName: string | null;
    document: string;
    type?: string;
    status: string;
    city: string;
    state: string;
    createdAt: string;
    supplierProfile?: { productTypes?: string[] } | null;
    _count?: { ordersAsBrand?: number; ordersAsSupplier?: number };
}

interface Props {
    company: CompanyBasic;
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

const orderStatusLabels: Record<string, string> = {
    LANCADO_PELA_MARCA: 'Aguardando Aceite',
    EM_NEGOCIACAO: 'Em Negociação',
    ACEITO_PELA_FACCAO: 'Aceito',
    EM_PREPARACAO_SAIDA_MARCA: 'Preparando Envio',
    EM_TRANSITO_PARA_FACCAO: 'Em Trânsito',
    EM_PREPARACAO_ENTRADA_FACCAO: 'Conferindo Insumos',
    FILA_DE_PRODUCAO: 'Fila de Produção',
    EM_PRODUCAO: 'Em Produção',
    PRONTO: 'Pronto',
    EM_TRANSITO_PARA_MARCA: 'Em Trânsito (Devolução)',
    EM_REVISAO: 'Em Revisão',
    FINALIZADO: 'Finalizado',
    CANCELADO: 'Cancelado',
    RECUSADO_PELA_FACCAO: 'Recusado',
    DISPONIVEL_PARA_OUTRAS: 'Disponível',
    AGUARDANDO_RETRABALHO: 'Retrabalho',
};

const SectionTitle: React.FC<{ icon: React.ReactNode; title: string }> = ({ icon, title }) => (
    <div className="flex items-center gap-2 pt-4 pb-2 border-t border-gray-100 dark:border-gray-700 first:border-t-0 first:pt-0">
        <span className="text-gray-400">{icon}</span>
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">{title}</h3>
    </div>
);

const Field: React.FC<{ label: string; value?: string | number | null; mono?: boolean }> = ({ label, value, mono }) => {
    if (!value && value !== 0) return null;
    return (
        <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{label}</p>
            <p className={`text-sm text-gray-900 dark:text-white font-medium ${mono ? 'font-mono' : ''}`}>{value}</p>
        </div>
    );
};

export default function CompanyDetailsModal({ company, onClose }: Props) {
    const [details, setDetails] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    const isSupplier = company.type === 'SUPPLIER' || !!company.supplierProfile;
    const statusInfo = statusLabels[company.status] || statusLabels.PENDING;

    useEffect(() => {
        const load = async () => {
            try {
                const data = await adminService.getCompanyDetails(company.id);
                setDetails(data);
            } catch (err) {
                console.error('Error loading company details:', err);
            } finally {
                setIsLoading(false);
            }
        };
        load();
    }, [company.id]);

    const profile = details?.supplierProfile;
    const bank = details?.bankAccount;
    const users = details?.companyUsers || [];
    const orderStats = details?.orderStats || [];
    const avgRating = details?.avgRating;

    const totalOrders = orderStats.reduce((s: number, o: any) => s + o.count, 0);
    const totalRevenue = orderStats.reduce((s: number, o: any) => s + o.totalValue, 0);

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 bg-sky-500/10 rounded-xl flex items-center justify-center">
                            {isSupplier ? <Factory className="w-5 h-5 text-sky-500" /> : <Building2 className="w-5 h-5 text-sky-500" />}
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                                {company.tradeName || company.legalName}
                            </h2>
                            <div className="flex items-center gap-2 mt-0.5">
                                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 bg-${statusInfo.color}-500/10 text-${statusInfo.color}-600 dark:text-${statusInfo.color}-400 rounded-full text-[10px] font-bold uppercase tracking-wider`}>
                                    <span className={`w-1.5 h-1.5 rounded-full bg-${statusInfo.color}-500`} />
                                    {statusInfo.label}
                                </span>
                                {avgRating && avgRating.count > 0 && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 rounded-full text-[10px] font-bold">
                                        <Star className="w-3 h-3 fill-yellow-500 text-yellow-500" />
                                        {avgRating.average.toFixed(1)} ({avgRating.count})
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-3 max-h-[75vh] overflow-y-auto">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-16">
                            <Loader2 className="w-8 h-8 text-sky-500 animate-spin" />
                        </div>
                    ) : (
                        <>
                            {/* ===== DADOS DA EMPRESA ===== */}
                            <SectionTitle icon={<Building2 className="w-4 h-4" />} title="Dados da Empresa" />
                            <div className="grid grid-cols-2 gap-4">
                                <Field label="Razão Social" value={details?.legalName} />
                                <Field label="Nome Fantasia" value={details?.tradeName} />
                                <Field label="CNPJ" value={formatDocument(details?.document)} mono />
                                <Field label="Email" value={details?.email} />
                                <Field label="Telefone" value={details?.phone} />
                                <Field label="Cadastrada em" value={new Date(details?.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })} />
                            </div>

                            {/* Address */}
                            {(details?.street || details?.city) && (
                                <div className="grid grid-cols-2 gap-4 mt-2">
                                    <div className="col-span-2">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Endereço</p>
                                        <p className="text-sm text-gray-900 dark:text-white font-medium">
                                            {[details?.street, details?.number, details?.complement].filter(Boolean).join(', ')}
                                            {details?.neighborhood && ` - ${details.neighborhood}`}
                                        </p>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                            {[details?.zipCode, details?.city, details?.state].filter(Boolean).join(' - ')}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* ===== CAPACIDADE PRODUTIVA (Suppliers only) ===== */}
                            {isSupplier && profile && (
                                <>
                                    <SectionTitle icon={<Gauge className="w-4 h-4" />} title="Capacidade Produtiva" />
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                        <Field label="Costureiros Ativos" value={profile.activeWorkers || '-'} />
                                        <Field label="Horas/Dia" value={profile.hoursPerDay ? `${Number(profile.hoursPerDay)}h` : '-'} />
                                        <Field label="Capacidade Diária" value={profile.dailyCapacity ? `${profile.dailyCapacity} min` : '-'} />
                                        <Field label="Ocupação Atual" value={profile.currentOccupancy != null ? `${profile.currentOccupancy}%` : '-'} />
                                    </div>

                                    {/* Product Types */}
                                    {profile.productTypes && profile.productTypes.length > 0 && (
                                        <div className="mt-2">
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Tipos de Produto</p>
                                            <div className="flex flex-wrap gap-1.5">
                                                {profile.productTypes.map((t: string) => (
                                                    <span key={t} className="px-2.5 py-1 bg-sky-50 dark:bg-sky-500/10 border border-sky-200 dark:border-sky-500/20 rounded-lg text-xs font-bold text-sky-700 dark:text-sky-400">
                                                        {t}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Specialties / Machines */}
                                    {profile.specialties && profile.specialties.length > 0 && (
                                        <div className="mt-2">
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Máquinas / Especialidades</p>
                                            <div className="flex flex-wrap gap-1.5">
                                                {profile.specialties.map((s: string) => (
                                                    <span key={s} className="px-2.5 py-1 bg-gray-100 dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.06] rounded-lg text-xs font-bold text-gray-600 dark:text-gray-400">
                                                        {s}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Onboarding Status */}
                                    <div className="mt-2">
                                        <Field
                                            label="Onboarding"
                                            value={profile.onboardingComplete ? 'Completo' : `Fase ${profile.onboardingPhase || 1}/3`}
                                        />
                                    </div>
                                </>
                            )}

                            {/* ===== DADOS BANCÁRIOS ===== */}
                            {bank && (
                                <>
                                    <SectionTitle icon={<Wallet className="w-4 h-4" />} title="Dados Bancários" />
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                        <Field label="Banco" value={bank.bankName || bank.bankCode} />
                                        <Field label="Agência" value={bank.agency} mono />
                                        <Field label="Conta" value={bank.accountNumber} mono />
                                        <Field label="Tipo" value={bank.accountType === 'CORRENTE' ? 'Corrente' : bank.accountType === 'POUPANCA' ? 'Poupança' : bank.accountType} />
                                        <Field label="Titular" value={bank.accountHolder} />
                                        {bank.pixKeyType && <Field label="PIX" value={`${bank.pixKeyType}: ${bank.pixKey || '-'}`} />}
                                    </div>
                                </>
                            )}

                            {/* ===== EQUIPE ===== */}
                            {users.length > 0 && (
                                <>
                                    <SectionTitle icon={<Users className="w-4 h-4" />} title={`Equipe (${users.length})`} />
                                    <div className="space-y-2">
                                        {users.map((cu: any) => (
                                            <div key={cu.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/[0.06] rounded-xl">
                                                <div>
                                                    <p className="text-sm font-bold text-gray-900 dark:text-white">{cu.user.name}</p>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">{cu.user.email}</p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded">
                                                        {cu.companyRole || cu.role || 'MEMBER'}
                                                    </span>
                                                    <span className={`w-2 h-2 rounded-full ${cu.user.isActive ? 'bg-green-500' : 'bg-gray-300'}`} />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}

                            {/* ===== HISTÓRICO DE PEDIDOS ===== */}
                            {orderStats.length > 0 && (
                                <>
                                    <SectionTitle icon={<Package className="w-4 h-4" />} title="Histórico de Pedidos" />
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
                                        <div className="p-3 bg-sky-50 dark:bg-sky-500/10 rounded-xl text-center">
                                            <p className="text-2xl font-bold text-sky-700 dark:text-sky-400">{totalOrders}</p>
                                            <p className="text-[10px] font-bold text-sky-500 uppercase tracking-widest">Total</p>
                                        </div>
                                        <div className="p-3 bg-green-50 dark:bg-green-500/10 rounded-xl text-center">
                                            <p className="text-2xl font-bold text-green-700 dark:text-green-400">
                                                {orderStats.find((o: any) => o.status === 'FINALIZADO')?.count || 0}
                                            </p>
                                            <p className="text-[10px] font-bold text-green-500 uppercase tracking-widest">Finalizados</p>
                                        </div>
                                        <div className="p-3 bg-purple-50 dark:bg-purple-500/10 rounded-xl text-center">
                                            <p className="text-2xl font-bold text-purple-700 dark:text-purple-400">
                                                R$ {totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                                            </p>
                                            <p className="text-[10px] font-bold text-purple-500 uppercase tracking-widest">Receita</p>
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        {orderStats
                                            .sort((a: any, b: any) => b.count - a.count)
                                            .map((stat: any) => (
                                            <div key={stat.status} className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-white/[0.02] rounded-lg">
                                                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                                    {orderStatusLabels[stat.status] || stat.status}
                                                </span>
                                                <div className="flex items-center gap-3">
                                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                                        R$ {stat.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                                                    </span>
                                                    <span className="text-sm font-bold text-gray-900 dark:text-white w-8 text-right">{stat.count}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </>
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
