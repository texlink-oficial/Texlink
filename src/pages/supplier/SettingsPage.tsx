import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
    User,
    Users,
    Building2,
    CreditCard,
    Factory,
    Bell,
    Shield,
    MessageSquare,
} from 'lucide-react';
import ProfileSection from '../../components/settings/ProfileSection';
import SecuritySection from '../../components/settings/SecuritySection';
import CompanyDataSection from '../../components/settings/CompanyDataSection';
import BankDetailsSection from '../../components/settings/BankDetailsSection';
import CapacitySection from '../../components/settings/CapacitySection';
import NotificationsSection from '../../components/settings/NotificationsSection';
import SuggestionsSection from '../../components/settings/SuggestionsSection';
import TeamPage from '../settings/TeamPage';

type MainTab = 'profile' | 'team' | 'company';
type CompanySubTab = 'data' | 'bank' | 'capacity' | 'notifications' | 'security' | 'suggestions';

interface MainTabDef {
    id: MainTab;
    label: string;
    icon: React.ReactNode;
}

const mainTabs: MainTabDef[] = [
    { id: 'profile', label: 'Meu Perfil', icon: <User className="h-4 w-4" /> },
    { id: 'team', label: 'Minha Equipe', icon: <Users className="h-4 w-4" /> },
    { id: 'company', label: 'Minha Empresa', icon: <Building2 className="h-4 w-4" /> },
];

interface CompanySubTabDef {
    id: CompanySubTab;
    label: string;
    icon: React.ReactNode;
}

const companySubTabs: CompanySubTabDef[] = [
    { id: 'data', label: 'Dados da Empresa', icon: <Building2 className="h-4 w-4" /> },
    { id: 'bank', label: 'Dados Bancários', icon: <CreditCard className="h-4 w-4" /> },
    { id: 'capacity', label: 'Capacidade Produtiva', icon: <Factory className="h-4 w-4" /> },
    { id: 'notifications', label: 'Notificações', icon: <Bell className="h-4 w-4" /> },
    { id: 'suggestions', label: 'Sugestões', icon: <MessageSquare className="h-4 w-4" /> },
];

const SettingsPage: React.FC = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const tabParam = searchParams.get('tab') as MainTab | null;
    const [activeTab, setActiveTab] = useState<MainTab>(tabParam || 'profile');
    const [companySubTab, setCompanySubTab] = useState<CompanySubTab>('data');

    useEffect(() => {
        if (tabParam && ['profile', 'team', 'company'].includes(tabParam)) {
            setActiveTab(tabParam);
        }
    }, [tabParam]);

    const handleTabChange = (tab: MainTab) => {
        setActiveTab(tab);
        setSearchParams({ tab });
    };

    const renderCompanyContent = () => {
        switch (companySubTab) {
            case 'data':
                return <CompanyDataSection />;
            case 'bank':
                return <BankDetailsSection />;
            case 'capacity':
                return <CapacitySection />;
            case 'notifications':
                return <NotificationsSection />;
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
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Configurações</h1>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                        Gerencie seu perfil, equipe e dados da empresa
                    </p>
                </div>

                {/* Main Tabs */}
                <div className="border-b border-gray-200 dark:border-gray-700">
                    <nav className="flex gap-1">
                        {mainTabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => handleTabChange(tab.id)}
                                className={`flex items-center gap-2 px-5 py-3 text-sm font-medium transition-colors whitespace-nowrap rounded-t-lg ${activeTab === tab.id
                                        ? 'text-brand-600 dark:text-brand-400 border-b-2 border-brand-600 dark:border-brand-400 -mb-px bg-white dark:bg-gray-800'
                                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                                    }`}
                            >
                                {tab.icon}
                                {tab.label}
                            </button>
                        ))}
                    </nav>
                </div>

                {/* Content */}
                {activeTab === 'profile' && (
                    <div className="space-y-6">
                        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                            <ProfileSection />
                        </div>
                        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                            <div className="flex items-center gap-2 mb-4">
                                <Shield className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Segurança</h3>
                            </div>
                            <SecuritySection />
                        </div>
                    </div>
                )}

                {activeTab === 'team' && (
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                        <TeamPage embedded />
                    </div>
                )}

                {activeTab === 'company' && (
                    <div className="space-y-4">
                        {/* Company Sub-tabs */}
                        <div className="flex flex-wrap gap-2">
                            {companySubTabs.map((sub) => (
                                <button
                                    key={sub.id}
                                    onClick={() => setCompanySubTab(sub.id)}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-full transition-colors ${companySubTab === sub.id
                                            ? 'bg-brand-600 text-white'
                                            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                        }`}
                                >
                                    {sub.icon}
                                    <span className="hidden sm:inline">{sub.label}</span>
                                </button>
                            ))}
                        </div>

                        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                            {renderCompanyContent()}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SettingsPage;
