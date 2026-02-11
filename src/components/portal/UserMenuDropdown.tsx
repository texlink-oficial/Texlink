import React, { useState, useRef, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { User, Users, Settings, ChevronDown, LogOut } from 'lucide-react';

interface UserMenuDropdownProps {
  user: { name: string; email: string; companyUsers?: { company: { logoUrl?: string | null } }[] } | null;
  collapsed: boolean;
  onNavigate?: () => void;
  onLogout: () => void;
}

export const UserMenuDropdown: React.FC<UserMenuDropdownProps> = ({
  user,
  collapsed,
  onNavigate,
  onLogout,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Close dropdown on escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const handleLinkClick = () => {
    setIsOpen(false);
    onNavigate?.();
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        className={`w-full flex items-center ${
          collapsed ? 'justify-center' : 'gap-3'
        } px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors`}
      >
        {user?.companyUsers?.[0]?.company?.logoUrl ? (
          <img
            src={user.companyUsers[0].company.logoUrl}
            alt=""
            className="w-8 h-8 rounded-full object-cover flex-shrink-0 border border-gray-200 dark:border-gray-600"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
            <User className="h-4 w-4 text-gray-600 dark:text-gray-400" aria-hidden="true" />
          </div>
        )}
        {!collapsed && (
          <>
            <div className="flex-1 text-left min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {user?.name || 'Parceiro'}
              </p>
            </div>
            <ChevronDown
              className={`h-4 w-4 text-gray-500 transition-transform duration-200 ${
                isOpen ? 'rotate-180' : ''
              }`}
              aria-hidden="true"
            />
          </>
        )}
      </button>

      {isOpen && !collapsed && (
        <div
          className="absolute left-2 right-2 mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50 overflow-hidden animate-fade-up"
          role="menu"
          aria-orientation="vertical"
        >
          <NavLink
            to="/portal/perfil"
            onClick={handleLinkClick}
            role="menuitem"
            className={({ isActive }) =>
              `flex items-center gap-2 px-3 py-2.5 text-sm transition-colors ${
                isActive
                  ? 'bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-400'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`
            }
          >
            <User className="h-4 w-4" aria-hidden="true" />
            Meu Perfil
          </NavLink>
          <NavLink
            to="/portal/equipe"
            onClick={handleLinkClick}
            role="menuitem"
            className={({ isActive }) =>
              `flex items-center gap-2 px-3 py-2.5 text-sm transition-colors ${
                isActive
                  ? 'bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-400'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`
            }
          >
            <Users className="h-4 w-4" aria-hidden="true" />
            Equipe
          </NavLink>
          <NavLink
            to="/portal/configuracoes"
            onClick={handleLinkClick}
            role="menuitem"
            className={({ isActive }) =>
              `flex items-center gap-2 px-3 py-2.5 text-sm transition-colors ${
                isActive
                  ? 'bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-400'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`
            }
          >
            <Settings className="h-4 w-4" aria-hidden="true" />
            Configurações
          </NavLink>
          <div className="border-t border-gray-200 dark:border-gray-700" />
          <button
            onClick={() => {
              onLogout();
              setIsOpen(false);
            }}
            role="menuitem"
            className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Sair
          </button>
        </div>
      )}
    </div>
  );
};

export default UserMenuDropdown;
