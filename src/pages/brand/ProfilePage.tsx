import React from 'react';
import ProfileSection from '../../components/settings/ProfileSection';

const BrandProfilePage: React.FC = () => {
    return (
        <div className="p-6 lg:p-8 max-w-7xl mx-auto">
            <div className="space-y-6">
                {/* Header */}
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Meu Perfil</h1>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                        Visualize e edite suas informações pessoais
                    </p>
                </div>

                {/* Content */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                    <ProfileSection />
                </div>
            </div>
        </div>
    );
};

export default BrandProfilePage;
