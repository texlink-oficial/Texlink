import React from 'react';
import { Outlet } from 'react-router-dom';
import { BrandPortalSidebar } from './BrandPortalSidebar';

export const BrandPortalLayout: React.FC = () => {
    return (
        <div className="h-screen overflow-hidden bg-gray-50 dark:bg-gray-900 flex">
            {/* Sidebar */}
            <BrandPortalSidebar />

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0">
                <main className="flex-1 overflow-auto">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default BrandPortalLayout;
