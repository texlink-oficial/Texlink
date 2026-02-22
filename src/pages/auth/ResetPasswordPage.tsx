import React, { useState, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Lock, ArrowLeft, Loader2, CheckCircle, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import { authService } from '../../services/auth.service';
import AuthLayout from '../../components/auth/AuthLayout';

interface PasswordValidation {
    minLength: boolean;
    hasUppercase: boolean;
    hasLowercase: boolean;
    hasNumber: boolean;
}

const ResetPasswordPage: React.FC = () => {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token') || '';

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState('');

    const validation: PasswordValidation = useMemo(() => ({
        minLength: password.length >= 8,
        hasUppercase: /[A-Z]/.test(password),
        hasLowercase: /[a-z]/.test(password),
        hasNumber: /\d/.test(password),
    }), [password]);

    const isPasswordValid = validation.minLength && validation.hasUppercase && validation.hasLowercase && validation.hasNumber;
    const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!isPasswordValid) {
            setError('A senha não atende aos requisitos mínimos.');
            return;
        }

        if (!passwordsMatch) {
            setError('As senhas não coincidem.');
            return;
        }

        if (!token) {
            setError('Token de redefinição não encontrado. Solicite um novo link.');
            return;
        }

        setIsLoading(true);

        try {
            await authService.resetPassword(token, password);
            setIsSuccess(true);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : '';
            if (message.includes('expired') || message.includes('invalid') || message.includes('token')) {
                setError('O link de redefinição é inválido ou expirou. Solicite um novo link.');
            } else {
                setError('Erro ao redefinir a senha. Tente novamente.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const ValidationItem: React.FC<{ met: boolean; label: string }> = ({ met, label }) => (
        <li className={`flex items-center gap-2 text-xs ${met ? 'text-green-400' : 'text-brand-400 lg:text-gray-400'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${met ? 'bg-green-400' : 'bg-brand-500'}`} />
            {label}
        </li>
    );

    return (
        <AuthLayout>
            {isSuccess ? (
                <div className="text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/20 mb-4">
                        <CheckCircle className="w-8 h-8 text-green-400" />
                    </div>
                    <h2 className="text-2xl font-semibold text-white lg:text-gray-900 lg:dark:text-white mb-3">Senha redefinida</h2>
                    <p className="text-brand-300 lg:text-gray-500 lg:dark:text-gray-400 text-sm mb-6">
                        Sua senha foi alterada com sucesso. Você já pode fazer login com a nova senha.
                    </p>
                    <Link
                        to="/login"
                        className="inline-flex items-center justify-center gap-2 w-full py-3 px-4 bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white font-semibold rounded-xl shadow-lg shadow-brand-500/25 transition-all duration-300"
                    >
                        Ir para login
                    </Link>
                </div>
            ) : (
                <>
                    <h2 className="text-2xl font-semibold text-white lg:text-gray-900 lg:dark:text-white mb-2">Nova senha</h2>
                    <p className="text-brand-300 lg:text-gray-500 lg:dark:text-gray-400 text-sm mb-6">
                        Escolha uma nova senha para sua conta.
                    </p>

                    {error && (
                        <div className="bg-red-500/20 border border-red-500/50 lg:bg-red-50 lg:border-red-200 lg:dark:bg-red-900/20 lg:dark:border-red-800 rounded-lg p-3 mb-4 flex items-start gap-3">
                            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-red-200 lg:text-red-600 lg:dark:text-red-300 text-sm">{error}</p>
                                {error.includes('expirou') && (
                                    <Link
                                        to="/esqueci-senha"
                                        className="text-red-300 hover:text-red-200 lg:text-red-500 lg:hover:text-red-600 lg:dark:text-red-400 lg:dark:hover:text-red-300 text-sm font-medium underline mt-1 inline-block"
                                    >
                                        Solicitar novo link
                                    </Link>
                                )}
                            </div>
                        </div>
                    )}

                    {!token && (
                        <div className="bg-amber-500/20 border border-amber-500/50 lg:bg-amber-50 lg:border-amber-200 lg:dark:bg-amber-900/20 lg:dark:border-amber-800 rounded-lg p-3 mb-4 flex items-start gap-3">
                            <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-amber-200 lg:text-amber-600 lg:dark:text-amber-300 text-sm">
                                    Token de redefinição não encontrado. Use o link enviado por e-mail ou solicite um novo.
                                </p>
                                <Link
                                    to="/esqueci-senha"
                                    className="text-amber-300 hover:text-amber-200 lg:text-amber-500 lg:hover:text-amber-600 lg:dark:text-amber-400 lg:dark:hover:text-amber-300 text-sm font-medium underline mt-1 inline-block"
                                >
                                    Solicitar novo link
                                </Link>
                            </div>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block text-sm font-medium text-brand-200 lg:text-gray-700 lg:dark:text-gray-300 mb-2">
                                Nova senha
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-400" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pl-11 pr-12 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all lg:bg-gray-50 lg:dark:bg-gray-900 lg:border-gray-200 lg:dark:border-gray-700 lg:text-gray-900 lg:dark:text-white lg:placeholder-gray-400"
                                    placeholder="Mínimo 8 caracteres"
                                    required
                                    autoFocus
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-400 hover:text-brand-300 transition-colors"
                                    aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>

                            {password.length > 0 && (
                                <ul className="mt-2 space-y-1">
                                    <ValidationItem met={validation.minLength} label="Mínimo 8 caracteres" />
                                    <ValidationItem met={validation.hasUppercase} label="Uma letra maiúscula" />
                                    <ValidationItem met={validation.hasLowercase} label="Uma letra minúscula" />
                                    <ValidationItem met={validation.hasNumber} label="Um número" />
                                </ul>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-brand-200 lg:text-gray-700 lg:dark:text-gray-300 mb-2">
                                Confirmar senha
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-400" />
                                <input
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className={`w-full pl-11 pr-12 py-3 bg-white/5 border rounded-xl text-white placeholder-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all lg:bg-gray-50 lg:dark:bg-gray-900 lg:border-gray-200 lg:dark:border-gray-700 lg:text-gray-900 lg:dark:text-white lg:placeholder-gray-400 ${
                                        confirmPassword.length > 0 && !passwordsMatch
                                            ? 'border-red-500/50'
                                            : 'border-white/10 lg:border-gray-200 lg:dark:border-gray-700'
                                    }`}
                                    placeholder="Repita a nova senha"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-400 hover:text-brand-300 transition-colors"
                                    aria-label={showConfirmPassword ? 'Ocultar senha' : 'Mostrar senha'}
                                >
                                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                            {confirmPassword.length > 0 && !passwordsMatch && (
                                <p className="mt-1 text-xs text-red-400">As senhas não coincidem</p>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading || !isPasswordValid || !passwordsMatch || !token}
                            className="w-full py-3 px-4 bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white font-semibold rounded-xl shadow-lg shadow-brand-500/25 transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                'Redefinir senha'
                            )}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <Link
                            to="/login"
                            className="inline-flex items-center gap-2 text-brand-400 lg:text-brand-600 lg:dark:text-brand-400 hover:text-brand-300 text-sm font-medium transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Voltar para login
                        </Link>
                    </div>
                </>
            )}
        </AuthLayout>
    );
};

export default ResetPasswordPage;
