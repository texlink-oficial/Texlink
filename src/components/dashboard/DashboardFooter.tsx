import React from 'react';
import { Link } from 'react-router-dom';

interface DashboardFooterProps {
    variant?: 'portal' | 'brand' | 'admin';
}

export const DashboardFooter: React.FC<DashboardFooterProps> = ({ variant = 'portal' }) => {
    const currentYear = new Date().getFullYear();

    const getSupportLink = () => {
        switch (variant) {
            case 'brand':
                return '/brand/suporte';
            case 'admin':
                return '/admin/support';
            default:
                return '/portal/suporte';
        }
    };

    return (
        <footer className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700/50">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-gray-500 dark:text-gray-400">
                {/* Copyright */}
                <div className="flex items-center gap-2">
                    <span>© {currentYear} Texlink. Todos os direitos reservados.</span>
                </div>

                {/* Links */}
                <nav className="flex flex-wrap items-center justify-center gap-4 md:gap-6">
                    <Link
                        to="/termos-de-uso"
                        className="hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                    >
                        Termos de Uso
                    </Link>
                    <Link
                        to="/politica-de-privacidade"
                        className="hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                    >
                        Política de Privacidade
                    </Link>
                    <Link
                        to="/politica-de-cookies"
                        className="hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                    >
                        Política de Cookies
                    </Link>
                    <Link
                        to={getSupportLink()}
                        className="hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                    >
                        Central de Ajuda
                    </Link>
                    <a
                        href="mailto:suporte@texlink.com.br"
                        className="hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                    >
                        Contato
                    </a>
                </nav>
            </div>

            {/* Version info (optional, subtle) */}
            <div className="text-center text-xs text-gray-400 dark:text-gray-500 mt-4">
                v1.0.0
            </div>
        </footer>
    );
};

export default DashboardFooter;
