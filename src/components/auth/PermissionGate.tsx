import React, { ReactNode, cloneElement, isValidElement } from 'react';
import { usePermissions } from '../../contexts/PermissionContext';
import { Permission } from '../../types/permissions';

interface PermissionGateProps {
  /**
   * Permissão única necessária
   */
  permission?: Permission;

  /**
   * Múltiplas permissões - usuário precisa ter TODAS
   */
  allPermissions?: Permission[];

  /**
   * Múltiplas permissões - usuário precisa ter PELO MENOS UMA
   */
  anyPermission?: Permission[];

  /**
   * Modo de comportamento quando sem permissão:
   * - 'hide': esconde o elemento (padrão)
   * - 'disable': desabilita o elemento (adiciona disabled prop)
   * - 'blur': mostra o elemento com blur e não interativo
   */
  mode?: 'hide' | 'disable' | 'blur';

  /**
   * Elemento alternativo a ser exibido quando sem permissão (para mode='hide')
   */
  fallback?: ReactNode;

  /**
   * Conteúdo a ser renderizado
   */
  children: ReactNode;

  /**
   * Se true, inverte a lógica (mostra quando NÃO tem permissão)
   */
  inverse?: boolean;
}

/**
 * Componente para renderização condicional baseada em permissões
 *
 * @example
 * // Esconder botão se não tem permissão
 * <PermissionGate permission="ORDERS_CREATE">
 *   <Button>Criar Pedido</Button>
 * </PermissionGate>
 *
 * @example
 * // Desabilitar botão se não tem permissão
 * <PermissionGate permission="ORDERS_CREATE" mode="disable">
 *   <Button>Criar Pedido</Button>
 * </PermissionGate>
 *
 * @example
 * // Com fallback
 * <PermissionGate permission="TEAM_MANAGE" fallback={<span>Sem acesso</span>}>
 *   <TeamManagement />
 * </PermissionGate>
 *
 * @example
 * // Múltiplas permissões (OR)
 * <PermissionGate anyPermission={['ORDERS_VIEW', 'REPORTS_VIEW']}>
 *   <Dashboard />
 * </PermissionGate>
 *
 * @example
 * // Múltiplas permissões (AND)
 * <PermissionGate allPermissions={['TEAM_MANAGE', 'TEAM_MANAGE_PERMISSIONS']}>
 *   <AdvancedTeamSettings />
 * </PermissionGate>
 */
export const PermissionGate: React.FC<PermissionGateProps> = ({
  permission,
  allPermissions,
  anyPermission,
  mode = 'hide',
  fallback = null,
  children,
  inverse = false,
}) => {
  const { hasPermission, hasAllPermissions, hasAnyPermission, isLoading } = usePermissions();

  // Enquanto carrega, não mostra nada
  if (isLoading) {
    return null;
  }

  // Determinar se tem permissão
  let hasAccess = true;

  if (permission) {
    hasAccess = hasPermission(permission);
  }

  if (allPermissions && allPermissions.length > 0) {
    hasAccess = hasAccess && hasAllPermissions(allPermissions);
  }

  if (anyPermission && anyPermission.length > 0) {
    hasAccess = hasAccess && hasAnyPermission(anyPermission);
  }

  // Inverter se necessário
  if (inverse) {
    hasAccess = !hasAccess;
  }

  // Se tem acesso, renderiza normalmente
  if (hasAccess) {
    return <>{children}</>;
  }

  // Comportamento quando não tem acesso
  switch (mode) {
    case 'hide':
      return <>{fallback}</>;

    case 'disable':
      // Tenta adicionar prop disabled aos filhos
      if (isValidElement(children)) {
        return cloneElement(children as React.ReactElement<any>, {
          disabled: true,
          'aria-disabled': true,
          style: {
            ...((children as React.ReactElement<any>).props.style || {}),
            opacity: 0.5,
            cursor: 'not-allowed',
          },
        });
      }
      return <>{children}</>;

    case 'blur':
      return (
        <div
          style={{
            filter: 'blur(4px)',
            pointerEvents: 'none',
            userSelect: 'none',
          }}
          aria-hidden="true"
        >
          {children}
        </div>
      );

    default:
      return <>{fallback}</>;
  }
};

/**
 * Componente para verificar se é admin da empresa
 */
export const AdminOnly: React.FC<{
  children: ReactNode;
  fallback?: ReactNode;
}> = ({ children, fallback = null }) => {
  const { isCompanyAdmin, isLoading } = usePermissions();

  if (isLoading) return null;

  return isCompanyAdmin ? <>{children}</> : <>{fallback}</>;
};

/**
 * Hook para usar em componentes que precisam de verificação de permissão
 */
export const useCanAccess = (
  permission?: Permission,
  allPermissions?: Permission[],
  anyPermission?: Permission[]
): boolean => {
  const { hasPermission, hasAllPermissions, hasAnyPermission, isLoading } = usePermissions();

  if (isLoading) return false;

  let hasAccess = true;

  if (permission) {
    hasAccess = hasPermission(permission);
  }

  if (allPermissions && allPermissions.length > 0) {
    hasAccess = hasAccess && hasAllPermissions(allPermissions);
  }

  if (anyPermission && anyPermission.length > 0) {
    hasAccess = hasAccess && hasAnyPermission(anyPermission);
  }

  return hasAccess;
};

export default PermissionGate;
