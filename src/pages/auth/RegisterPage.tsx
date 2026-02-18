import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { UserPlus, Mail, Lock, User, Building2, Factory, Loader2, Eye, EyeOff, Phone } from 'lucide-react';

const formatCNPJ = (value: string): string => {
    const digits = value.replace(/\D/g, '').slice(0, 14);
    if (digits.length <= 2) return digits;
    if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
    if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
    if (digits.length <= 12) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
};

const formatPhone = (value: string): string => {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 2) return digits.length > 0 ? `(${digits}` : '';
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
};

const isValidCNPJ = (value: string): boolean => {
    const digits = value.replace(/\D/g, '');
    return digits.length === 14;
};

const isValidPhone = (value: string): boolean => {
    const digits = value.replace(/\D/g, '');
    return digits.length === 10 || digits.length === 11;
};

const RegisterPage: React.FC = () => {
    const navigate = useNavigate();
    const { register } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [cnpj, setCnpj] = useState('');
    const [phone, setPhone] = useState('');
    const [role, setRole] = useState<'BRAND' | 'SUPPLIER'>('SUPPLIER');
    const [showPassword, setShowPassword] = useState(false);
    const [termsAccepted, setTermsAccepted] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const validatePassword = (pwd: string): string | null => {
        if (pwd.length < 8) return 'A senha deve ter pelo menos 8 caracteres';
        if (!/[A-Z]/.test(pwd)) return 'A senha deve conter pelo menos uma letra maiúscula';
        if (!/[a-z]/.test(pwd)) return 'A senha deve conter pelo menos uma letra minúscula';
        if (!/\d/.test(pwd)) return 'A senha deve conter pelo menos um número';
        return null;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!isValidCNPJ(cnpj)) {
            setError('CNPJ inválido. Informe os 14 dígitos.');
            return;
        }

        if (!isValidPhone(phone)) {
            setError('Celular inválido. Informe o número com DDD.');
            return;
        }

        const passwordError = validatePassword(password);
        if (passwordError) {
            setError(passwordError);
            return;
        }

        if (!termsAccepted) {
            setError('Você precisa aceitar os termos de uso e a política de privacidade para continuar.');
            return;
        }

        setIsLoading(true);

        try {
            await register(email, password, name, role, {
                document: cnpj.replace(/\D/g, ''),
                phone: phone.replace(/\D/g, ''),
            });
            // Redirect to onboarding based on role
            navigate(role === 'SUPPLIER' ? '/onboarding' : '/brand-onboarding');
        } catch (err: any) {
            const msg = err.response?.data?.message;
            setError(Array.isArray(msg) ? msg.join('. ') : msg || 'Erro ao criar conta');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-brand-900 via-brand-800 to-brand-950 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="relative inline-flex items-center justify-center mb-4">
                        <div className="absolute inset-0 bg-brand-500/30 blur-2xl rounded-full animate-pulse" />
                        <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center shadow-lg shadow-brand-500/30">
                            <svg
                                className="h-9 w-9 text-white"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                aria-hidden="true"
                            >
                                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                                <polyline points="15 3 21 3 21 9" />
                                <line x1="10" y1="14" x2="21" y2="3" />
                            </svg>
                        </div>
                    </div>
                    <h1 className="text-4xl font-bold text-white mb-2">TEXLINK</h1>
                    <p className="text-brand-300">Crie sua conta</p>
                </div>

                {/* Card */}
                <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-8 border border-white/20 shadow-2xl">
                    <h2 className="text-2xl font-semibold text-white mb-6">Cadastrar</h2>

                    {error && (
                        <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 mb-4">
                            <p className="text-red-200 text-sm">{error}</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Role Selection */}
                        <div>
                            <label className="block text-sm font-medium text-brand-200 mb-3">
                                Tipo de Conta
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={() => setRole('SUPPLIER')}
                                    className={`p-4 rounded-xl border-2 transition-all ${role === 'SUPPLIER'
                                        ? 'bg-brand-500/20 border-brand-500 text-white'
                                        : 'bg-white/5 border-white/10 text-brand-300 hover:border-white/30'
                                        }`}
                                >
                                    <Factory className="w-6 h-6 mx-auto mb-2" />
                                    <span className="text-sm font-medium">Facção de Costura</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setRole('BRAND')}
                                    className={`p-4 rounded-xl border-2 transition-all ${role === 'BRAND'
                                        ? 'bg-brand-500/20 border-brand-500 text-white'
                                        : 'bg-white/5 border-white/10 text-brand-300 hover:border-white/30'
                                        }`}
                                >
                                    <Building2 className="w-6 h-6 mx-auto mb-2" />
                                    <span className="text-sm font-medium">Marca</span>
                                </button>
                            </div>
                        </div>

                        {/* Nome */}
                        <div>
                            <label className="block text-sm font-medium text-brand-200 mb-2">
                                Nome
                            </label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-400" />
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                                    placeholder="Seu nome"
                                    required
                                />
                            </div>
                        </div>

                        {/* CNPJ */}
                        <div>
                            <label className="block text-sm font-medium text-brand-200 mb-2">
                                CNPJ
                            </label>
                            <div className="relative">
                                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-400" />
                                <input
                                    type="text"
                                    value={cnpj}
                                    onChange={(e) => setCnpj(formatCNPJ(e.target.value))}
                                    className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                                    placeholder="XX.XXX.XXX/XXXX-XX"
                                    required
                                />
                            </div>
                            <p className="text-xs text-brand-400 mt-1">
                                A unicidade do CNPJ será validada no servidor.
                            </p>
                        </div>

                        {/* E-mail */}
                        <div>
                            <label className="block text-sm font-medium text-brand-200 mb-2">
                                E-mail
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-400" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                                    placeholder="seu@email.com"
                                    required
                                />
                            </div>
                        </div>

                        {/* Celular */}
                        <div>
                            <label className="block text-sm font-medium text-brand-200 mb-2">
                                Celular
                            </label>
                            <div className="relative">
                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-400" />
                                <input
                                    type="text"
                                    value={phone}
                                    onChange={(e) => setPhone(formatPhone(e.target.value))}
                                    className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                                    placeholder="(XX) XXXXX-XXXX"
                                    required
                                />
                            </div>
                        </div>

                        {/* Senha */}
                        <div>
                            <label className="block text-sm font-medium text-brand-200 mb-2">
                                Senha
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-400" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pl-11 pr-12 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                                    placeholder="Mínimo 8 caracteres (maiúscula, minúscula e número)"
                                    minLength={8}
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-400 hover:text-brand-300 transition-colors"
                                    tabIndex={-1}
                                >
                                    {showPassword ? (
                                        <EyeOff className="w-5 h-5" />
                                    ) : (
                                        <Eye className="w-5 h-5" />
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Termos de Uso */}
                        <div className="flex items-start gap-3">
                            <input
                                type="checkbox"
                                id="termsAccepted"
                                checked={termsAccepted}
                                onChange={(e) => setTermsAccepted(e.target.checked)}
                                className="mt-1 h-4 w-4 rounded border-white/20 bg-white/5 text-brand-500 focus:ring-brand-500 focus:ring-offset-0"
                            />
                            <label htmlFor="termsAccepted" className="text-sm text-brand-300 leading-relaxed cursor-pointer">
                                Eu aceito os termos de uso do aplicativo e estou de acordo com a política de privacidade.
                            </label>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading || !termsAccepted}
                            className="w-full py-3 px-4 bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white font-semibold rounded-xl shadow-lg shadow-brand-500/25 transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    <UserPlus className="w-5 h-5" />
                                    Criar Conta
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <p className="text-brand-300 text-sm">
                            Já tem conta?{' '}
                            <Link to="/login" className="text-brand-400 hover:text-brand-300 font-medium transition-colors">
                                Entrar
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RegisterPage;
