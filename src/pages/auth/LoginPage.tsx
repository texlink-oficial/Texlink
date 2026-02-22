import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import AuthLayout from '../../components/auth/AuthLayout';
import { LogIn, Mail, Lock, Loader2, Users, Building2, Shield } from 'lucide-react';
// Only import demo credentials in development (tree-shaken in production)
const DEMO_CREDENTIALS = import.meta.env.DEV
    ? { brand: { email: 'demo-brand@texlink.com', password: 'demo123' }, supplier: { email: 'demo-supplier@texlink.com', password: 'demo123' }, admin: { email: 'demo-admin@texlink.com', password: 'demo123' } }
    : { brand: { email: '', password: '' }, supplier: { email: '', password: '' }, admin: { email: '', password: '' } };

const LoginPage: React.FC = () => {
    const navigate = useNavigate();
    const { login } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            await login(email, password);
            navigate('/dashboard');
        } catch (err: any) {
            setError(err.message || err.response?.data?.message || 'Erro ao fazer login');
        } finally {
            setIsLoading(false);
        }
    };

    const fillDemoCredentials = (type: 'brand' | 'supplier' | 'admin') => {
        setEmail(DEMO_CREDENTIALS[type].email);
        setPassword(DEMO_CREDENTIALS[type].password);
        setError('');
    };

    return (
        <AuthLayout>
            {/* Demo Quick Access - only visible in development */}
            {import.meta.env.DEV && (
                <div className="bg-amber-500/20 border border-amber-500/50 rounded-xl p-4 mb-4 backdrop-blur-sm lg:bg-amber-50 lg:border-amber-200 lg:backdrop-blur-none lg:dark:bg-amber-900/20 lg:dark:border-amber-800">
                    <p className="text-amber-200 text-sm font-medium text-center mb-3 lg:text-amber-700 lg:dark:text-amber-300">
                        Acesso Rápido (Dev)
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                        <button
                            type="button"
                            onClick={() => fillDemoCredentials('brand')}
                            className="flex flex-col items-center gap-1 p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-all text-white text-xs lg:bg-amber-100 lg:hover:bg-amber-200 lg:text-amber-800 lg:dark:bg-amber-900/30 lg:dark:hover:bg-amber-900/50 lg:dark:text-amber-200"
                        >
                            <Building2 className="w-4 h-4" />
                            <span>Marca</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => fillDemoCredentials('supplier')}
                            className="flex flex-col items-center gap-1 p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-all text-white text-xs lg:bg-amber-100 lg:hover:bg-amber-200 lg:text-amber-800 lg:dark:bg-amber-900/30 lg:dark:hover:bg-amber-900/50 lg:dark:text-amber-200"
                        >
                            <Users className="w-4 h-4" />
                            <span>Facção de Costura</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => fillDemoCredentials('admin')}
                            className="flex flex-col items-center gap-1 p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-all text-white text-xs lg:bg-amber-100 lg:hover:bg-amber-200 lg:text-amber-800 lg:dark:bg-amber-900/30 lg:dark:hover:bg-amber-900/50 lg:dark:text-amber-200"
                        >
                            <Shield className="w-4 h-4" />
                            <span>Admin</span>
                        </button>
                    </div>
                </div>
            )}

            {/* Form */}
            <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-8 border border-white/20 shadow-2xl lg:bg-transparent lg:backdrop-blur-none lg:border-0 lg:shadow-none lg:p-0">
                <h2 className="text-2xl font-semibold text-white lg:text-gray-900 lg:dark:text-white mb-6">Entrar</h2>

                {error && (
                    <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 mb-4 lg:bg-red-50 lg:border-red-200 lg:dark:bg-red-900/20 lg:dark:border-red-800">
                        <p className="text-red-200 text-sm lg:text-red-600 lg:dark:text-red-300">{error}</p>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-brand-200 lg:text-gray-700 lg:dark:text-gray-300 mb-2">
                            Email
                        </label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-400 lg:text-gray-400 lg:dark:text-gray-500" />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all lg:bg-gray-50 lg:dark:bg-gray-900 lg:border-gray-200 lg:dark:border-gray-700 lg:text-gray-900 lg:dark:text-white lg:placeholder-gray-400"
                                placeholder="seu@email.com"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-brand-200 lg:text-gray-700 lg:dark:text-gray-300 mb-2">
                            Senha
                        </label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-400 lg:text-gray-400 lg:dark:text-gray-500" />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all lg:bg-gray-50 lg:dark:bg-gray-900 lg:border-gray-200 lg:dark:border-gray-700 lg:text-gray-900 lg:dark:text-white lg:placeholder-gray-400"
                                placeholder="••••••••"
                                required
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
                            <>
                                <LogIn className="w-5 h-5" />
                                Entrar
                            </>
                        )}
                    </button>
                </form>

                <div className="mt-4 text-center">
                    <Link to="/esqueci-senha" className="text-brand-400 lg:text-brand-600 lg:dark:text-brand-400 hover:text-brand-300 text-sm font-medium transition-colors">
                        Esqueci minha senha
                    </Link>
                </div>

                <div className="mt-4 text-center">
                    <p className="text-brand-300 lg:text-gray-500 lg:dark:text-gray-400 text-sm">
                        Não tem conta?{' '}
                        <Link to="/register" className="text-brand-400 lg:text-brand-600 lg:dark:text-brand-400 hover:text-brand-300 font-medium transition-colors">
                            Cadastre-se
                        </Link>
                    </p>
                </div>
            </div>
        </AuthLayout>
    );
};

export default LoginPage;
