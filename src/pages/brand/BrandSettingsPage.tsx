import React, { useState } from 'react';
import {
    Building2,
    CreditCard,
    Bell,
    Shield,
    MessageSquare,
} from 'lucide-react';
import CompanyDataSection from '../../components/settings/CompanyDataSection';
import BankDetailsSection from '../../components/settings/BankDetailsSection';
import NotificationsSection from '../../components/settings/NotificationsSection';
import SecuritySection from '../../components/settings/SecuritySection';
import SuggestionsSection from '../../components/settings/SuggestionsSection';

type TabId = 'company' | 'bank' | 'notifications' | 'security' | 'suggestions';

interface Tab {
    id: TabId;
    label: string;
    icon: React.ReactNode;
}

const tabs: Tab[] = [
    { id: 'company', label: 'Dados da Empresa', icon: <Building2 className="h-4 w-4" /> },
    { id: 'bank', label: 'Dados Bancarios', icon: <CreditCard className="h-4 w-4" /> },
    { id: 'notifications', label: 'Notificacoes', icon: <Bell className="h-4 w-4" /> },
    { id: 'security', label: 'Seguranca', icon: <Shield className="h-4 w-4" /> },
    { id: 'suggestions', label: 'Sugestoes', icon: <MessageSquare className="h-4 w-4" /> },
];

const BrandSettingsPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState<TabId>('company');

    const renderContent = () => {
        switch (activeTab) {
            case 'company':
                return <CompanyDataSection />;
            case 'bank':
                return <BankDetailsSection />;
            case 'notifications':
                return <NotificationsSection />;
            case 'security':
                return <SecuritySection />;
            case 'suggestions':
                return <SuggestionsSection />;
            default:
                return null;
        }
    };

    return (
        <div className="p-6 lg:p-8 max-w-7xl mx-auto">
            <div className="space-y-6">
                {/* Header */}
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Configuracoes</h1>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                        Gerencie as configuracoes da sua empresa
                    </p>
                </div>

                {/* Tabs */}
                <div className="border-b border-gray-200 dark:border-gray-700">
                    <nav className="flex flex-wrap gap-2 md:gap-0">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap ${activeTab === tab.id
                                        ? 'text-brand-600 dark:text-brand-400 border-b-2 border-brand-600 dark:border-brand-400 -mb-px'
                                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                                    }`}
                            >
                                {tab.icon}
                                <span className="hidden sm:inline">{tab.label}</span>
                            </button>
                        ))}
                    </nav>
                </div>

                {/* Content */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                    {renderContent()}
                </div>
            </div>
        </div>
    );
};

export default BrandSettingsPage;
