import { SetMetadata } from '@nestjs/common';
import { Permission } from '@prisma/client';

export const PERMISSIONS_KEY = 'permissions';

/**
 * Decorator para especificar as permissões necessárias para acessar um endpoint
 *
 * @example
 * @RequirePermissions(Permission.ORDERS_CREATE)
 * async createOrder() { }
 *
 * @example
 * // Requer qualquer uma das permissões (OR)
 * @RequirePermissions(Permission.ORDERS_VIEW, Permission.REPORTS_VIEW)
 * async viewData() { }
 */
export const RequirePermissions = (...permissions: Permission[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

/**
 * Decorator para requerer todas as permissões (AND)
 */
export const PERMISSIONS_ALL_KEY = 'permissions_all';
export const RequireAllPermissions = (...permissions: Permission[]) =>
  SetMetadata(PERMISSIONS_ALL_KEY, permissions);
