import React from 'react';
import { WORKSHOP_PROFILE } from '../constants';
import { Bell, Search, Settings, Store, Power, Menu, Star, Moon, Sun, Activity } from 'lucide-react';

interface DashboardHeaderProps {
  toggleMobileMenu: () => void;
  darkMode: boolean;
  toggleDarkMode: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({ toggleMobileMenu, darkMode, toggleDarkMode, searchQuery, setSearchQuery }) => {
  // Logic for capacity color
  const getCapacityColor = (usage: number) => {
    if (usage >= 90) return 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]';
    if (usage >= 70) return 'bg-amber-400';
    return 'bg-brand-400';
  };

  return (
    <header className="bg-brand-900 dark:bg-gray-900 border-b border-brand-800 dark:border-gray-800 sticky top-0 z-30 shadow-lg transition-colors duration-300">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          
          {/* Logo & Mobile Menu */}
          <div className="flex items-center">
            <button 
              onClick={toggleMobileMenu}
              className="p-2 mr-2 -ml-2 rounded-md text-brand-200 hover:text-white hover:bg-brand-800 dark:hover:bg-gray-800 md:hidden transition-colors"
            >
              <Menu className="h-6 w-6" />
            </button>
            <div className="flex-shrink-0 flex items-center gap-2">
              {/* Logo Icon - Blue Square with Arrow */}
              <svg 
                className="h-9 w-9 text-brand-400" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2.5" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
              <span className="font-bold text-2xl text-white hidden sm:block tracking-tight">Texlink</span>
            </div>
            
            {/* Divider */}
            <div className="h-6 w-px bg-brand-700 dark:bg-gray-700 mx-4 hidden md:block"></div>
            
            {/* Workshop Status (Desktop) */}
            <div className="hidden md:flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Store className="h-5 w-5 text-brand-300" />
                <div className="flex flex-col">
                   <div className="flex items-center gap-2">
                     <span className="font-medium text-brand-50">{WORKSHOP_PROFILE.name}</span>
                     <div className="flex items-center bg-brand-800 dark:bg-gray-800 px-1.5 py-0 rounded border border-brand-700 dark:border-gray-700">
                        <Star className="h-2.5 w-2.5 text-yellow-400 fill-yellow-400 mr-1" />
                        <span className="text-[10px] font-bold text-yellow-400">{WORKSHOP_PROFILE.rating}</span>
                     </div>
                   </div>
                </div>
              </div>

              {/* Capacity Indicator - Suggestion 2 */}
              <div className="flex flex-col w-32 group cursor-help">
                 <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] uppercase font-semibold text-brand-300 tracking-wider flex items-center gap-1">
                        <Activity className="h-3 w-3" /> Capacidade
                    </span>
                    <span className="text-[10px] font-bold text-white">{WORKSHOP_PROFILE.capacityUsage}%</span>
                 </div>
                 <div className="h-2 bg-brand-800 dark:bg-gray-700 rounded-full overflow-hidden border border-brand-700 dark:border-gray-600">
                    <div 
                        className={`h-full rounded-full transition-all duration-500 ${getCapacityColor(WORKSHOP_PROFILE.capacityUsage)}`}
                        style={{ width: `${WORKSHOP_PROFILE.capacityUsage}%` }}
                    ></div>
                 </div>
              </div>
              
              <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium border ${WORKSHOP_PROFILE.isActive ? 'bg-green-900/30 text-green-400 border-green-800' : 'bg-red-900/30 text-red-400 border-red-800'}`}>
                <div className={`h-2 w-2 rounded-full ${WORKSHOP_PROFILE.isActive ? 'bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.5)]' : 'bg-red-400'}`}></div>
                {WORKSHOP_PROFILE.isActive ? 'Disponível' : 'Indisponível'}
              </div>
            </div>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="relative hidden sm:block group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-brand-400 dark:text-gray-500 group-focus-within:text-brand-500 dark:group-focus-within:text-brand-400 transition-colors" />
              </div>
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar pedido, marca ou ref..." 
                className="block w-full pl-10 pr-3 py-1.5 border border-brand-700 dark:border-gray-700 rounded-md leading-5 bg-brand-800 dark:bg-gray-800 text-brand-50 dark:text-gray-200 placeholder-brand-400 dark:placeholder-gray-500 focus:outline-none focus:bg-white dark:focus:bg-gray-700 focus:text-gray-900 dark:focus:text-white focus:placeholder-gray-400 focus:ring-1 focus:ring-brand-500 focus:border-brand-500 sm:text-sm transition-all duration-200 ease-in-out w-64 focus:w-80"
              />
            </div>

            <button 
                onClick={toggleDarkMode}
                className="p-2 text-brand-300 dark:text-gray-400 hover:text-white hover:bg-brand-800 dark:hover:bg-gray-800 rounded-full transition-colors"
                title={darkMode ? "Mudar para modo claro" : "Mudar para modo escuro"}
            >
                {darkMode ? <Sun className="h-6 w-6" /> : <Moon className="h-6 w-6" />}
            </button>

            <button className="p-2 text-brand-300 dark:text-gray-400 hover:text-white hover:bg-brand-800 dark:hover:bg-gray-800 rounded-full transition-colors relative">
              <Bell className="h-6 w-6" />
              <span className="absolute top-1.5 right-1.5 block h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-brand-900 dark:ring-gray-900"></span>
            </button>
            <button className="p-2 text-brand-300 dark:text-gray-400 hover:text-white hover:bg-brand-800 dark:hover:bg-gray-800 rounded-full transition-colors">
              <Settings className="h-6 w-6" />
            </button>
             <button className="p-2 text-brand-300 dark:text-gray-400 hover:text-red-400 hover:bg-brand-800 dark:hover:bg-gray-800 rounded-full transition-colors">
              <Power className="h-6 w-6" />
            </button>
            
            <div className="ml-2 flex items-center md:hidden">
               <img className="h-8 w-8 rounded-full bg-brand-800 border border-brand-700" src="https://ui-avatars.com/api/?name=Oficina+da+Maria&background=random" alt="" />
            </div>
          </div>
        </div>
      </div>
      
      {/* Mobile Stats Bar (Sub-header) */}
      <div className="md:hidden bg-brand-800 dark:bg-gray-800 px-4 py-2 border-b border-brand-700 dark:border-gray-700 flex justify-between items-center text-xs transition-colors">
         <span className="font-semibold text-brand-50 dark:text-gray-200">{WORKSHOP_PROFILE.name}</span>
         <div className="flex items-center gap-3">
             {/* Mobile Capacity */}
             <div className="flex items-center gap-1.5">
                 <div className="w-10 h-1.5 bg-brand-900 dark:bg-gray-700 rounded-full overflow-hidden border border-brand-700">
                     <div className={`h-full ${getCapacityColor(WORKSHOP_PROFILE.capacityUsage)}`} style={{ width: `${WORKSHOP_PROFILE.capacityUsage}%` }}></div>
                 </div>
                 <span className="text-[10px] text-brand-200">{WORKSHOP_PROFILE.capacityUsage}%</span>
             </div>
            <div className="flex items-center gap-1.5 bg-brand-900/50 dark:bg-gray-900/50 px-2 py-0.5 rounded-full border border-brand-700 dark:border-gray-600">
                <span className={`h-1.5 w-1.5 rounded-full ${WORKSHOP_PROFILE.isActive ? 'bg-green-400 shadow-[0_0_4px_rgba(74,222,128,0.5)]' : 'bg-red-400'}`}></span>
                <span className="text-[10px] font-medium text-brand-100 dark:text-gray-300">{WORKSHOP_PROFILE.isActive ? 'Online' : 'Offline'}</span>
            </div>
         </div>
      </div>
    </header>
  );
};