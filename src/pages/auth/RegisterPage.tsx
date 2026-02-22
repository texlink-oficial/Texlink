import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import AuthLayout from '../../components/auth/AuthLayout';
import { UserPlus, Mail, Lock, User, Building2, Factory, Loader2, Eye, EyeOff, Phone, ArrowLeft, ArrowRight, Check, Search } from 'lucide-react';
import { formatCNPJ, validateCNPJ, stripCNPJ } from '../../utils/cnpj';
import api from '../../services/api';

const formatPhone = (value: string): string => {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 2) return digits.length > 0 ? `(${digits}` : '';
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
};

const isValidPhone = (value: string): boolean => {
    const digits = value.replace(/\D/g, '');
    return digits.length === 10 || digits.length === 11;
};

const RegisterPage: React.FC = () => {
    const navigate = useNavigate();
    const { register } = useAuth();
    const [searchParams] = useSearchParams();

    // Pre-fill from invitation query params
    const invitationToken = searchParams.get('token') || '';
    const isFromInvitation = !!invitationToken;

    // Step management
    const [step, setStep] = useState<1 | 2>(1);

    // Step 1 fields
    const [name, setName] = useState(searchParams.get('name') || '');
    const [email, setEmail] = useState(searchParams.get('email') || '');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    // Step 2 fields - force SUPPLIER when coming from invitation
    const [role, setRole] = useState<'BRAND' | 'SUPPLIER'>('SUPPLIER');
    const [legalName, setLegalName] = useState(searchParams.get('legalName') || '');
    const [tradeName, setTradeName] = useState(searchParams.get('tradeName') || '');
    const [cnpj, setCnpj] = useState(searchParams.get('cnpj') ? formatCNPJ(searchParams.get('cnpj')!) : '');
    const [phone, setPhone] = useState('');
    const [termsAccepted, setTermsAccepted] = useState(false);

    // Location (auto-filled from CNPJ)
    const [cidade, setCidade] = useState('');
    const [estado, setEstado] = useState('');

    // Validation state
    const [cnpjError, setCnpjError] = useState('');
    const [cnpjLoading, setCnpjLoading] = useState(false);
    const [error, setError] = useState('');
    const [step1Error, setStep1Error] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Auto-fetch CNPJ data on mount when pre-filled from invitation
    useEffect(() => {
        if (isFromInvitation && cnpj) {
            const digits = stripCNPJ(cnpj);
            if (digits.length === 14 && validateCNPJ(digits)) {
                handleCnpjBlur();
            }
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const validatePassword = (pwd: string): string | null => {
        if (pwd.length < 8) return 'A senha deve ter pelo menos 8 caracteres';
        if (!/[A-Z]/.test(pwd)) return 'A senha deve conter pelo menos uma letra maiúscula';
        if (!/[a-z]/.test(pwd)) return 'A senha deve conter pelo menos uma letra minúscula';
        if (!/\d/.test(pwd)) return 'A senha deve conter pelo menos um número';
        return null;
    };

    const passwordChecks = {
        length: password.length >= 8,
        uppercase: /[A-Z]/.test(password),
        lowercase: /[a-z]/.test(password),
        number: /\d/.test(password),
    };

    const handleCnpjBlur = async () => {
        const digits = stripCNPJ(cnpj);
        if (digits.length === 0) {
            setCnpjError('');
            return;
        }
        if (digits.length !== 14 || !validateCNPJ(digits)) {
            setCnpjError('CNPJ invalido. Verifique o numero informado.');
            return;
        }
        setCnpjError('');
        setCnpjLoading(true);
        try {
            const { data } = await api.get(`/auth/cnpj-lookup/${digits}`);
            if (data.found) {
                setLegalName(data.razaoSocial);
                if (data.nomeFantasia) setTradeName(data.nomeFantasia);
                if (data.cidade) setCidade(data.cidade);
                if (data.estado) setEstado(data.estado);
                if (data.situacao !== 'ATIVA') {
                    setCnpjError(`CNPJ com situacao "${data.situacao}". Verifique.`);
                }
            }
        } catch {
            // Silently ignore - user can type manually
        } finally {
            setCnpjLoading(false);
        }
    };

    const handleNextStep = () => {
        setStep1Error('');

        if (!name.trim()) {
            setStep1Error('Nome completo e obrigatorio.');
            return;
        }

        if (!email.trim()) {
            setStep1Error('E-mail e obrigatorio.');
            return;
        }

        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            setStep1Error('Informe um e-mail valido.');
            return;
        }

        if (!password) {
            setStep1Error('Senha e obrigatoria.');
            return;
        }

        const passwordError = validatePassword(password);
        if (passwordError) {
            setStep1Error(passwordError);
            return;
        }

        setStep(2);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!legalName.trim()) {
            setError('Razao social e obrigatoria.');
            return;
        }

        if (!validateCNPJ(cnpj)) {
            setError('CNPJ invalido. Verifique o numero informado.');
            setCnpjError('CNPJ invalido. Verifique o numero informado.');
            return;
        }

        if (!isValidPhone(phone)) {
            setError('Celular invalido. Informe o numero com DDD.');
            return;
        }

        if (!termsAccepted) {
            setError('Voce precisa aceitar os termos de uso e a politica de privacidade para continuar.');
            return;
        }

        setIsLoading(true);

        try {
            await register(email, password, name, role, {
                legalName,
                tradeName: tradeName || undefined,
                document: cnpj.replace(/\D/g, ''),
                phone: phone.replace(/\D/g, ''),
                city: cidade || undefined,
                state: estado || undefined,
                invitationToken: invitationToken || undefined,
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

    const StepIndicator = () => (
        <div className="flex items-center justify-center gap-3 mb-6">
            <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                    step === 1
                        ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/30'
                        : 'bg-brand-500 text-white'
                }`}>
                    {step > 1 ? <Check className="w-4 h-4" /> : '1'}
                </div>
                <span className={`text-sm font-medium transition-colors ${
                    step === 1 ? 'text-white lg:text-gray-900 lg:dark:text-white' : 'text-brand-300 lg:text-gray-400'
                }`}>
                    Seus Dados
                </span>
            </div>

            <div className="w-8 h-px bg-white/20 lg:bg-gray-200 lg:dark:bg-gray-700" />

            <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                    step === 2
                        ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/30'
                        : 'bg-white/10 text-brand-400 border border-white/20 lg:bg-gray-100 lg:text-gray-400 lg:border-gray-200 lg:dark:bg-gray-800 lg:dark:text-gray-500 lg:dark:border-gray-700'
                }`}>
                    2
                </div>
                <span className={`text-sm font-medium transition-colors ${
                    step === 2 ? 'text-white lg:text-gray-900 lg:dark:text-white' : 'text-brand-400 lg:text-gray-400'
                }`}>
                    Dados da Empresa
                </span>
            </div>
        </div>
    );

    return (
        <AuthLayout>
            <StepIndicator />

            {/* Step 1: Seus Dados */}
            {step === 1 && (
                <div>
                    <h2 className="text-2xl font-semibold text-white lg:text-gray-900 lg:dark:text-white mb-1">Seus Dados</h2>
                    <p className="text-brand-300 lg:text-gray-500 lg:dark:text-gray-400 mb-6 text-sm">Crie sua conta</p>

                    {step1Error && (
                        <div className="bg-red-500/20 border border-red-500/50 lg:bg-red-50 lg:border-red-200 lg:dark:bg-red-900/20 lg:dark:border-red-800 rounded-lg p-3 mb-4">
                            <p className="text-red-200 lg:text-red-600 lg:dark:text-red-400 text-sm">{step1Error}</p>
                        </div>
                    )}

                    <div className="space-y-5">
                        {/* Nome completo */}
                        <div>
                            <label className="block text-sm font-medium text-brand-200 lg:text-gray-700 lg:dark:text-gray-300 mb-2">
                                Nome completo
                            </label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-400 lg:text-gray-400" />
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 text-white placeholder-brand-400 lg:bg-gray-50 lg:dark:bg-gray-900 lg:border-gray-200 lg:dark:border-gray-700 lg:text-gray-900 lg:dark:text-white lg:placeholder-gray-400 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                                    placeholder="Seu nome completo"
                                    required
                                />
                            </div>
                        </div>

                        {/* E-mail */}
                        <div>
                            <label className="block text-sm font-medium text-brand-200 lg:text-gray-700 lg:dark:text-gray-300 mb-2">
                                E-mail
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-400 lg:text-gray-400" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 text-white placeholder-brand-400 lg:bg-gray-50 lg:dark:bg-gray-900 lg:border-gray-200 lg:dark:border-gray-700 lg:text-gray-900 lg:dark:text-white lg:placeholder-gray-400 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                                    placeholder="seu@email.com"
                                    required
                                />
                            </div>
                        </div>

                        {/* Senha */}
                        <div>
                            <label className="block text-sm font-medium text-brand-200 lg:text-gray-700 lg:dark:text-gray-300 mb-2">
                                Senha
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-400 lg:text-gray-400" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pl-11 pr-12 py-3 bg-white/5 border border-white/10 text-white placeholder-brand-400 lg:bg-gray-50 lg:dark:bg-gray-900 lg:border-gray-200 lg:dark:border-gray-700 lg:text-gray-900 lg:dark:text-white lg:placeholder-gray-400 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                                    placeholder="Crie uma senha segura"
                                    minLength={8}
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-400 lg:text-gray-400 hover:text-brand-300 transition-colors"
                                    tabIndex={-1}
                                >
                                    {showPassword ? (
                                        <EyeOff className="w-5 h-5" />
                                    ) : (
                                        <Eye className="w-5 h-5" />
                                    )}
                                </button>
                            </div>

                            {/* Password strength indicators */}
                            {password.length > 0 && (
                                <div className="mt-3 space-y-1.5">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center ${passwordChecks.length ? 'bg-green-500' : 'bg-white/10 lg:bg-gray-200 lg:dark:bg-gray-700'}`}>
                                            {passwordChecks.length && <Check className="w-2.5 h-2.5 text-white" />}
                                        </div>
                                        <span className={`text-xs ${passwordChecks.length ? 'text-green-400' : 'text-brand-400 lg:text-gray-400'}`}>
                                            Pelo menos 8 caracteres
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center ${passwordChecks.uppercase ? 'bg-green-500' : 'bg-white/10 lg:bg-gray-200 lg:dark:bg-gray-700'}`}>
                                            {passwordChecks.uppercase && <Check className="w-2.5 h-2.5 text-white" />}
                                        </div>
                                        <span className={`text-xs ${passwordChecks.uppercase ? 'text-green-400' : 'text-brand-400 lg:text-gray-400'}`}>
                                            Uma letra maiuscula
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center ${passwordChecks.lowercase ? 'bg-green-500' : 'bg-white/10 lg:bg-gray-200 lg:dark:bg-gray-700'}`}>
                                            {passwordChecks.lowercase && <Check className="w-2.5 h-2.5 text-white" />}
                                        </div>
                                        <span className={`text-xs ${passwordChecks.lowercase ? 'text-green-400' : 'text-brand-400 lg:text-gray-400'}`}>
                                            Uma letra minuscula
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center ${passwordChecks.number ? 'bg-green-500' : 'bg-white/10 lg:bg-gray-200 lg:dark:bg-gray-700'}`}>
                                            {passwordChecks.number && <Check className="w-2.5 h-2.5 text-white" />}
                                        </div>
                                        <span className={`text-xs ${passwordChecks.number ? 'text-green-400' : 'text-brand-400 lg:text-gray-400'}`}>
                                            Um numero
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>

                        <button
                            type="button"
                            onClick={handleNextStep}
                            className="w-full py-3 px-4 bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white font-semibold rounded-xl shadow-lg shadow-brand-500/25 transition-all duration-300 flex items-center justify-center gap-2"
                        >
                            Proximo
                            <ArrowRight className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            )}

            {/* Step 2: Dados da Empresa */}
            {step === 2 && (
                <div>
                    <h2 className="text-2xl font-semibold text-white lg:text-gray-900 lg:dark:text-white mb-6">Dados da Empresa</h2>

                    {error && (
                        <div className="bg-red-500/20 border border-red-500/50 lg:bg-red-50 lg:border-red-200 lg:dark:bg-red-900/20 lg:dark:border-red-800 rounded-lg p-3 mb-4">
                            <p className="text-red-200 lg:text-red-600 lg:dark:text-red-400 text-sm">{error}</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Role Selection - hidden when from invitation (always SUPPLIER) */}
                        {!isFromInvitation && (
                        <div>
                            <label className="block text-sm font-medium text-brand-200 lg:text-gray-700 lg:dark:text-gray-300 mb-3">
                                Tipo de Conta
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={() => setRole('SUPPLIER')}
                                    className={`p-4 rounded-xl border-2 transition-all ${role === 'SUPPLIER'
                                        ? 'bg-brand-500/20 border-brand-500 text-white lg:text-brand-600 lg:dark:text-brand-400'
                                        : 'bg-white/5 border-white/10 text-brand-300 hover:border-white/30 lg:bg-gray-50 lg:border-gray-200 lg:text-gray-600 lg:dark:bg-gray-900 lg:dark:border-gray-700 lg:dark:text-gray-400'
                                        }`}
                                >
                                    <Factory className="w-6 h-6 mx-auto mb-2" />
                                    <span className="text-sm font-medium">Faccao</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setRole('BRAND')}
                                    className={`p-4 rounded-xl border-2 transition-all ${role === 'BRAND'
                                        ? 'bg-brand-500/20 border-brand-500 text-white lg:text-brand-600 lg:dark:text-brand-400'
                                        : 'bg-white/5 border-white/10 text-brand-300 hover:border-white/30 lg:bg-gray-50 lg:border-gray-200 lg:text-gray-600 lg:dark:bg-gray-900 lg:dark:border-gray-700 lg:dark:text-gray-400'
                                        }`}
                                >
                                    <Building2 className="w-6 h-6 mx-auto mb-2" />
                                    <span className="text-sm font-medium">Marca</span>
                                </button>
                            </div>
                        </div>
                        )}

                        {/* CNPJ */}
                        <div>
                            <label className="block text-sm font-medium text-brand-200 lg:text-gray-700 lg:dark:text-gray-300 mb-2">
                                CNPJ
                            </label>
                            <div className="relative">
                                {cnpjLoading ? (
                                    <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-400 lg:text-gray-400 animate-spin" />
                                ) : (
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-400 lg:text-gray-400" />
                                )}
                                <input
                                    type="text"
                                    value={cnpj}
                                    onChange={(e) => {
                                        if (isFromInvitation) return;
                                        setCnpj(formatCNPJ(e.target.value));
                                        if (cnpjError) setCnpjError('');
                                    }}
                                    onBlur={handleCnpjBlur}
                                    readOnly={isFromInvitation}
                                    className={`w-full pl-11 pr-4 py-3 bg-white/5 border text-white placeholder-brand-400 lg:bg-gray-50 lg:dark:bg-gray-900 lg:border-gray-200 lg:dark:border-gray-700 lg:text-gray-900 lg:dark:text-white lg:placeholder-gray-400 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all ${cnpjError ? 'border-red-500' : 'border-white/10'} ${isFromInvitation ? 'opacity-60 cursor-not-allowed' : ''}`}
                                    placeholder="XX.XXX.XXX/XXXX-XX"
                                    required
                                    aria-invalid={!!cnpjError}
                                    aria-describedby={cnpjError ? 'cnpj-error' : undefined}
                                />
                            </div>
                            {cnpjError ? (
                                <p id="cnpj-error" className="text-xs text-red-400 mt-1" role="alert">
                                    {cnpjError}
                                </p>
                            ) : (
                                <p className="text-xs text-brand-400 lg:text-gray-400 mt-1">
                                    {cnpjLoading ? 'Buscando dados da empresa...' : 'Ao informar o CNPJ os dados da empresa serao preenchidos automaticamente.'}
                                </p>
                            )}
                        </div>

                        {/* Razao Social */}
                        <div>
                            <label className="block text-sm font-medium text-brand-200 lg:text-gray-700 lg:dark:text-gray-300 mb-2">
                                Razao Social
                            </label>
                            <div className="relative">
                                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-400 lg:text-gray-400" />
                                <input
                                    type="text"
                                    value={legalName}
                                    onChange={(e) => setLegalName(e.target.value)}
                                    className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 text-white placeholder-brand-400 lg:bg-gray-50 lg:dark:bg-gray-900 lg:border-gray-200 lg:dark:border-gray-700 lg:text-gray-900 lg:dark:text-white lg:placeholder-gray-400 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                                    placeholder="Nome registrado na Receita Federal"
                                    required
                                />
                            </div>
                        </div>

                        {/* Nome Fantasia */}
                        <div>
                            <label className="block text-sm font-medium text-brand-200 lg:text-gray-700 lg:dark:text-gray-300 mb-2">
                                Nome Fantasia
                                <span className="text-brand-400 lg:text-gray-400 font-normal ml-1">(opcional)</span>
                            </label>
                            <div className="relative">
                                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-400 lg:text-gray-400" />
                                <input
                                    type="text"
                                    value={tradeName}
                                    onChange={(e) => setTradeName(e.target.value)}
                                    className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 text-white placeholder-brand-400 lg:bg-gray-50 lg:dark:bg-gray-900 lg:border-gray-200 lg:dark:border-gray-700 lg:text-gray-900 lg:dark:text-white lg:placeholder-gray-400 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                                    placeholder="Nome comercial da empresa"
                                />
                            </div>
                        </div>

                        {/* Cidade e Estado */}
                        <div className="grid grid-cols-3 gap-3">
                            <div className="col-span-2">
                                <label className="block text-sm font-medium text-brand-200 lg:text-gray-700 lg:dark:text-gray-300 mb-2">
                                    Cidade
                                </label>
                                <input
                                    type="text"
                                    value={cidade}
                                    onChange={(e) => setCidade(e.target.value)}
                                    className="w-full px-4 py-3 bg-white/5 border border-white/10 text-white placeholder-brand-400 lg:bg-gray-50 lg:dark:bg-gray-900 lg:border-gray-200 lg:dark:border-gray-700 lg:text-gray-900 lg:dark:text-white lg:placeholder-gray-400 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                                    placeholder="Cidade"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-brand-200 lg:text-gray-700 lg:dark:text-gray-300 mb-2">
                                    UF
                                </label>
                                <input
                                    type="text"
                                    value={estado}
                                    onChange={(e) => setEstado(e.target.value.toUpperCase().slice(0, 2))}
                                    className="w-full px-4 py-3 bg-white/5 border border-white/10 text-white placeholder-brand-400 lg:bg-gray-50 lg:dark:bg-gray-900 lg:border-gray-200 lg:dark:border-gray-700 lg:text-gray-900 lg:dark:text-white lg:placeholder-gray-400 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                                    placeholder="UF"
                                    maxLength={2}
                                />
                            </div>
                        </div>

                        {/* Celular */}
                        <div>
                            <label className="block text-sm font-medium text-brand-200 lg:text-gray-700 lg:dark:text-gray-300 mb-2">
                                Telefone
                            </label>
                            <div className="relative">
                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-400 lg:text-gray-400" />
                                <input
                                    type="text"
                                    value={phone}
                                    onChange={(e) => setPhone(formatPhone(e.target.value))}
                                    className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 text-white placeholder-brand-400 lg:bg-gray-50 lg:dark:bg-gray-900 lg:border-gray-200 lg:dark:border-gray-700 lg:text-gray-900 lg:dark:text-white lg:placeholder-gray-400 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                                    placeholder="(XX) XXXXX-XXXX"
                                    required
                                />
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
                            <label htmlFor="termsAccepted" className="text-sm text-brand-300 lg:text-gray-500 lg:dark:text-gray-400 leading-relaxed cursor-pointer">
                                Eu aceito os termos de uso do aplicativo e estou de acordo com a politica de privacidade.
                            </label>
                        </div>

                        {/* Action buttons */}
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={() => { setStep(1); setError(''); }}
                                className="flex-shrink-0 py-3 px-4 bg-white/10 hover:bg-white/15 text-white font-medium rounded-xl border border-white/10 lg:bg-gray-100 lg:border-gray-200 lg:text-gray-700 lg:dark:bg-gray-800 lg:dark:border-gray-700 lg:dark:text-gray-300 transition-all duration-300 flex items-center justify-center gap-2"
                            >
                                <ArrowLeft className="w-5 h-5" />
                                Voltar
                            </button>
                            <button
                                type="submit"
                                disabled={isLoading || !termsAccepted || !!cnpjError}
                                className="flex-1 py-3 px-4 bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white font-semibold rounded-xl shadow-lg shadow-brand-500/25 transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
                        </div>
                    </form>
                </div>
            )}

            <div className="mt-6 text-center">
                <p className="text-brand-300 lg:text-gray-500 lg:dark:text-gray-400 text-sm">
                    Ja tem conta?{' '}
                    <Link to="/login" className="text-brand-400 lg:text-brand-600 lg:dark:text-brand-400 hover:text-brand-300 font-medium transition-colors">
                        Entrar
                    </Link>
                </p>
            </div>
        </AuthLayout>
    );
};

export default RegisterPage;
