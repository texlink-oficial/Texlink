import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { teamService } from '../services/team.service';
import { Permission, CompanyRole, ALL_PERMISSIONS } from '../types/permissions';

interface PermissionContextType {
  permissions: Permission[];
  companyRole: CompanyRole | null;
  isCompanyAdmin: boolean;
  isLoading: boolean;
  error: string | null;
  hasPermission: (permission: Permission) => boolean;
  hasAnyPermission: (permissions: Permission[]) => boolean;
  hasAllPermissions: (permissions: Permission[]) => boolean;
  refreshPermissions: () => Promise<void>;
}

const PermissionContext = createContext<PermissionContextType | undefined>(undefined);

interface PermissionProviderProps {
  children: ReactNode;
  companyId?: string;
}

export const PermissionProvider: React.FC<PermissionProviderProps> = ({ children, companyId }) => {
  const { user, isAuthenticated } = useAuth();
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [companyRole, setCompanyRole] = useState<CompanyRole | null>(null);
  const [isCompanyAdmin, setIsCompanyAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Determinar o companyId a usar: prefer company matching user role
  const matchingCompanyUser =
    user?.companyUsers?.find((cu) => cu.company?.type === user?.role) ||
    user?.companyUsers?.[0];
  const effectiveCompanyId = companyId || matchingCompanyUser?.company?.id;

  const loadPermissions = useCallback(async () => {
    if (!isAuthenticated || !effectiveCompanyId) {
      setPermissions([]);
      setCompanyRole(null);
      setIsCompanyAdmin(false);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const data = await teamService.getMyPermissions(effectiveCompanyId);

      setPermissions(data.effectivePermissions);
      setCompanyRole(data.companyRole);
      setIsCompanyAdmin(data.isCompanyAdmin);
    } catch (err) {
      console.error('Erro ao carregar permissões:', err);
      setError('Erro ao carregar permissões');

      // Em caso de erro, definir permissões padrão baseado no tipo de usuário
      // Isso é útil para modo demo ou quando o backend não está disponível
      if (matchingCompanyUser?.role === 'OWNER') {
        setPermissions(ALL_PERMISSIONS);
        setCompanyRole('ADMIN');
        setIsCompanyAdmin(true);
      } else {
        setPermissions([
          'ORDERS_VIEW',
          'SUPPLIERS_VIEW',
          'MESSAGES_VIEW',
          'REPORTS_VIEW',
        ]);
        setCompanyRole('VIEWER');
        setIsCompanyAdmin(false);
      }
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, effectiveCompanyId, user?.companyUsers]);

  useEffect(() => {
    loadPermissions();
  }, [loadPermissions]);

  const hasPermission = useCallback(
    (permission: Permission): boolean => {
      if (isCompanyAdmin) return true;
      return permissions.includes(permission);
    },
    [permissions, isCompanyAdmin]
  );

  const hasAnyPermission = useCallback(
    (requiredPermissions: Permission[]): boolean => {
      if (isCompanyAdmin) return true;
      return requiredPermissions.some(p => permissions.includes(p));
    },
    [permissions, isCompanyAdmin]
  );

  const hasAllPermissions = useCallback(
    (requiredPermissions: Permission[]): boolean => {
      if (isCompanyAdmin) return true;
      return requiredPermissions.every(p => permissions.includes(p));
    },
    [permissions, isCompanyAdmin]
  );

  const refreshPermissions = useCallback(async () => {
    await loadPermissions();
  }, [loadPermissions]);

  return (
    <PermissionContext.Provider
      value={{
        permissions,
        companyRole,
        isCompanyAdmin,
        isLoading,
        error,
        hasPermission,
        hasAnyPermission,
        hasAllPermissions,
        refreshPermissions,
      }}
    >
      {children}
    </PermissionContext.Provider>
  );
};

export const usePermissions = (): PermissionContextType => {
  const context = useContext(PermissionContext);
  if (context === undefined) {
    throw new Error('usePermissions must be used within a PermissionProvider');
  }
  return context;
};

// Hook de conveniência para verificar uma permissão
export const useHasPermission = (permission: Permission): boolean => {
  const { hasPermission, isLoading } = usePermissions();
  if (isLoading) return false;
  return hasPermission(permission);
};

// Hook de conveniência para verificar múltiplas permissões (OR)
export const useHasAnyPermission = (permissions: Permission[]): boolean => {
  const { hasAnyPermission, isLoading } = usePermissions();
  if (isLoading) return false;
  return hasAnyPermission(permissions);
};

// Hook de conveniência para verificar múltiplas permissões (AND)
export const useHasAllPermissions = (permissions: Permission[]): boolean => {
  const { hasAllPermissions, isLoading } = usePermissions();
  if (isLoading) return false;
  return hasAllPermissions(permissions);
};
