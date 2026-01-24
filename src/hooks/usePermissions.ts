/**
 * Hook para verificar permissões do usuário
 *
 * Re-exporta os hooks do PermissionContext para facilitar o uso
 */
export {
  usePermissions,
  useHasPermission,
  useHasAnyPermission,
  useHasAllPermissions,
} from '../contexts/PermissionContext';
