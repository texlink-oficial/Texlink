import React from 'react';
import { Outlet } from 'react-router-dom';
import { PortalSidebar } from './PortalSidebar';

export const PortalLayout: React.FC = () => {
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex">
            {/* Sidebar */}
            <PortalSidebar />

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0">
                <main className="flex-1 overflow-auto">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default PortalLayout;
