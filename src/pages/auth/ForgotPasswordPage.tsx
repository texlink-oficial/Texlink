import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, Loader2, CheckCircle } from 'lucide-react';
import { authService } from '../../services/auth.service';
import AuthLayout from '../../components/auth/AuthLayout';

const ForgotPasswordPage: React.FC = () => {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            await authService.forgotPassword(email);
        } catch {
            // Silently handle errors - do not reveal if email exists
        } finally {
            setIsLoading(false);
            setIsSubmitted(true);
        }
    };

    return (
        <AuthLayout>
            {isSubmitted ? (
                <div className="text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/20 mb-4">
                        <CheckCircle className="w-8 h-8 text-green-400" />
                    </div>
                    <h2 className="text-2xl font-semibold text-white lg:text-gray-900 lg:dark:text-white mb-3">E-mail enviado</h2>
                    <p className="text-brand-300 lg:text-gray-500 lg:dark:text-gray-400 text-sm leading-relaxed mb-6">
                        Se o e-mail estiver cadastrado, você receberá um link para redefinir sua senha. Verifique sua caixa de entrada e spam.
                    </p>
                    <Link
                        to="/login"
                        className="inline-flex items-center gap-2 text-brand-400 lg:text-brand-600 lg:dark:text-brand-400 hover:text-brand-300 text-sm font-medium transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Voltar para login
                    </Link>
                </div>
            ) : (
                <>
                    <h2 className="text-2xl font-semibold text-white lg:text-gray-900 lg:dark:text-white mb-2">Esqueci minha senha</h2>
                    <p className="text-brand-300 lg:text-gray-500 lg:dark:text-gray-400 text-sm mb-6">
                        Informe seu e-mail e enviaremos um link para redefinir sua senha.
                    </p>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block text-sm font-medium text-brand-200 lg:text-gray-700 lg:dark:text-gray-300 mb-2">
                                Email
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-400" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all lg:bg-gray-50 lg:dark:bg-gray-900 lg:border-gray-200 lg:dark:border-gray-700 lg:text-gray-900 lg:dark:text-white lg:placeholder-gray-400"
                                    placeholder="seu@email.com"
                                    required
                                    autoFocus
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-3 px-4 bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white font-semibold rounded-xl shadow-lg shadow-brand-500/25 transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                'Enviar link de recuperação'
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

export default ForgotPasswordPage;
