import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Loader2,
    Building2,
    CheckCircle,
    XCircle,
    Clock,
    AlertTriangle,
    Mail,
    User,
} from 'lucide-react';
import api from '../../services/api';

interface InvitationDetails {
    id: string;
    status: 'VALID' | 'EXPIRED' | 'ACCEPTED' | 'USED';
    brand: {
        name: string;
        logoUrl?: string;
    };
    supplier: {
        legalName: string;
        tradeName?: string;
        cnpj: string;
        contactName?: string;
        contactEmail?: string;
    };
    expiresAt: string;
    isExpired: boolean;
    isUsed: boolean;
}

const AcceptInvitationPage: React.FC = () => {
    const { token } = useParams<{ token: string }>();
    const navigate = useNavigate();

    const [status, setStatus] = useState<'loading' | 'valid' | 'expired' | 'used' | 'accepted' | 'error'>('loading');
    const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isAccepting, setIsAccepting] = useState(false);
    const [acceptSuccess, setAcceptSuccess] = useState(false);

    useEffect(() => {
        if (token) {
            loadInvitation();
        }
    }, [token]);

    const loadInvitation = async () => {
        try {
            setStatus('loading');
            const response = await api.get<InvitationDetails>(`/suppliers/invitation/${token}`);
            setInvitation(response.data);

            if (response.data.status === 'ACCEPTED') {
                setStatus('accepted');
            } else if (response.data.status === 'USED') {
                setStatus('used');
            } else if (response.data.isExpired) {
                setStatus('expired');
            } else {
                setStatus('valid');
            }
        } catch (err: unknown) {
            console.error('Error loading invitation:', err);
            setStatus('error');
            if (err && typeof err === 'object' && 'response' in err) {
                const errorResponse = err as { response?: { data?: { message?: string } } };
                setError(errorResponse.response?.data?.message || 'Convite não encontrado');
            } else {
                setError('Erro ao carregar convite');
            }
        }
    };

    const handleAccept = async () => {
        if (!token) return;

        try {
            setIsAccepting(true);
            await api.post(`/suppliers/accept-invite/${token}`);
            setAcceptSuccess(true);
            // Redirect to login after 3 seconds
            setTimeout(() => {
                navigate('/login', { state: { message: 'Convite aceito! Faça login para continuar.' } });
            }, 3000);
        } catch (err: unknown) {
            console.error('Error accepting invitation:', err);
            if (err && typeof err === 'object' && 'response' in err) {
                const errorResponse = err as { response?: { data?: { message?: string } } };
                setError(errorResponse.response?.data?.message || 'Erro ao aceitar convite');
            } else {
                setError('Erro ao aceitar convite');
            }
        } finally {
            setIsAccepting(false);
        }
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
        });
    };

    // Loading state
    if (status === 'loading') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 text-brand-500 animate-spin mx-auto mb-4" />
                    <p className="text-white text-lg">Carregando convite...</p>
                </div>
            </div>
        );
    }

    // Error state
    if (status === 'error') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-6">
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-8 text-center">
                    <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                        <XCircle className="w-8 h-8 text-red-500" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                        Convite Não Encontrado
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                        {error || 'Este convite não existe ou já foi utilizado.'}
                    </p>
                    <a
                        href="/"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-brand-500 hover:bg-brand-600 text-white rounded-xl font-medium transition-colors"
                    >
                        Voltar para o início
                    </a>
                </div>
            </div>
        );
    }

    // Already accepted state
    if (status === 'accepted' || acceptSuccess) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-6">
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-8 text-center">
                    <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle className="w-8 h-8 text-green-500" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                        {acceptSuccess ? 'Convite Aceito!' : 'Convite Já Aceito'}
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                        {acceptSuccess
                            ? 'Você será redirecionado para fazer login em instantes...'
                            : 'Este convite já foi aceito anteriormente.'}
                    </p>
                    {acceptSuccess && (
                        <Loader2 className="w-6 h-6 text-brand-500 animate-spin mx-auto" />
                    )}
                    {!acceptSuccess && (
                        <a
                            href="/login"
                            className="inline-flex items-center gap-2 px-6 py-3 bg-brand-500 hover:bg-brand-600 text-white rounded-xl font-medium transition-colors"
                        >
                            Ir para login
                        </a>
                    )}
                </div>
            </div>
        );
    }

    // Expired state
    if (status === 'expired') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-6">
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-8 text-center">
                    <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Clock className="w-8 h-8 text-amber-500" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                        Convite Expirado
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                        Este convite expirou em {invitation?.expiresAt && formatDate(invitation.expiresAt)}.
                    </p>
                    <p className="text-gray-500 dark:text-gray-500 text-sm mb-6">
                        Entre em contato com <strong>{invitation?.brand.name}</strong> para solicitar um novo convite.
                    </p>
                    <a
                        href="/"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-xl font-medium transition-colors"
                    >
                        Voltar para o início
                    </a>
                </div>
            </div>
        );
    }

    // Used state (different from expired)
    if (status === 'used') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-6">
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-8 text-center">
                    <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-6">
                        <AlertTriangle className="w-8 h-8 text-gray-500" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                        Convite Já Utilizado
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                        Este convite já foi utilizado anteriormente.
                    </p>
                    <a
                        href="/login"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-brand-500 hover:bg-brand-600 text-white rounded-xl font-medium transition-colors"
                    >
                        Ir para login
                    </a>
                </div>
            </div>
        );
    }

    // Valid invitation - show acceptance form
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-6">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-brand-500 to-brand-600 p-6 text-white text-center">
                    {invitation?.brand.logoUrl ? (
                        <img
                            src={invitation.brand.logoUrl}
                            alt={invitation.brand.name}
                            className="h-12 mx-auto mb-4 object-contain"
                        />
                    ) : (
                        <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <Building2 className="w-8 h-8" />
                        </div>
                    )}
                    <h1 className="text-2xl font-bold mb-2">Convite para Parceria</h1>
                    <p className="text-white/90">
                        <strong>{invitation?.brand.name}</strong> está convidando você!
                    </p>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* Supplier Info */}
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                        <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                            Empresa Convidada
                        </h3>
                        <div className="space-y-2">
                            <p className="text-lg font-semibold text-gray-900 dark:text-white">
                                {invitation?.supplier.tradeName || invitation?.supplier.legalName}
                            </p>
                            {invitation?.supplier.tradeName && invitation?.supplier.legalName && (
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    {invitation.supplier.legalName}
                                </p>
                            )}
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                CNPJ: {invitation?.supplier.cnpj}
                            </p>
                            {invitation?.supplier.contactName && (
                                <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                                    <User className="w-4 h-4" />
                                    {invitation.supplier.contactName}
                                </p>
                            )}
                            {invitation?.supplier.contactEmail && (
                                <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                                    <Mail className="w-4 h-4" />
                                    {invitation.supplier.contactEmail}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Benefits */}
                    <div>
                        <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                            Ao aceitar, você terá acesso a:
                        </h3>
                        <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                            <li className="flex items-center gap-2">
                                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                                Pedidos diretamente de {invitation?.brand.name}
                            </li>
                            <li className="flex items-center gap-2">
                                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                                Gestão integrada de produção
                            </li>
                            <li className="flex items-center gap-2">
                                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                                Comunicação facilitada via plataforma
                            </li>
                            <li className="flex items-center gap-2">
                                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                                Pagamentos seguros e rastreáveis
                            </li>
                        </ul>
                    </div>

                    {/* Expiry Notice */}
                    {invitation?.expiresAt && (
                        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3 text-center">
                            <p className="text-sm text-amber-700 dark:text-amber-300">
                                ⏰ Este convite expira em <strong>{formatDate(invitation.expiresAt)}</strong>
                            </p>
                        </div>
                    )}

                    {/* Error Message */}
                    {error && (
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3 text-center">
                            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                        </div>
                    )}

                    {/* Accept Button */}
                    <button
                        onClick={handleAccept}
                        disabled={isAccepting}
                        className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 text-white rounded-xl font-semibold text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
                    >
                        {isAccepting ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Aceitando convite...
                            </>
                        ) : (
                            <>
                                <CheckCircle className="w-5 h-5" />
                                Aceitar Convite
                            </>
                        )}
                    </button>

                    {/* Terms */}
                    <p className="text-xs text-center text-gray-500 dark:text-gray-400">
                        Ao aceitar, você concorda com os{' '}
                        <a href="/terms" className="text-brand-500 hover:underline">
                            Termos de Uso
                        </a>{' '}
                        e{' '}
                        <a href="/privacy" className="text-brand-500 hover:underline">
                            Política de Privacidade
                        </a>{' '}
                        da TexLink.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default AcceptInvitationPage;
