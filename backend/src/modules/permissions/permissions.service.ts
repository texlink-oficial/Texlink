import { Injectable } from '@nestjs/common';
import { Permission, CompanyRole, CompanyUser, CompanyUserPermission } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ROLE_PERMISSIONS, ROLE_NAMES, ROLE_DESCRIPTIONS, PERMISSION_NAMES, PERMISSION_CATEGORIES } from './role-permissions.config';

type CompanyUserWithPermissions = CompanyUser & {
  permissions: CompanyUserPermission[];
};

@Injectable()
export class PermissionsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Obtém todas as permissões efetivas de um usuário em uma empresa
   * Prioridade:
   * 1. isCompanyAdmin = true → todas as permissões
   * 2. Override de negação (granted = false) → remove permissão
   * 3. Override de concessão (granted = true) → adiciona permissão
   * 4. Permissões do CompanyRole
   */
  async getUserPermissions(userId: string, companyId: string): Promise<Permission[]> {
    const companyUser = await this.prisma.companyUser.findUnique({
      where: {
        userId_companyId: { userId, companyId },
      },
      include: {
        permissions: true,
      },
    });

    if (!companyUser) {
      return [];
    }

    return this.calculateEffectivePermissions(companyUser);
  }

  /**
   * Calcula as permissões efetivas de um CompanyUser
   */
  calculateEffectivePermissions(companyUser: CompanyUserWithPermissions): Permission[] {
    // Admin tem todas as permissões
    if (companyUser.isCompanyAdmin) {
      return Object.values(Permission);
    }

    // Começa com as permissões do role
    const rolePermissions = new Set(ROLE_PERMISSIONS[companyUser.companyRole] || []);

    // Aplica os overrides
    for (const override of companyUser.permissions) {
      if (override.granted) {
        // Conceder permissão
        rolePermissions.add(override.permission);
      } else {
        // Negar permissão
        rolePermissions.delete(override.permission);
      }
    }

    return Array.from(rolePermissions);
  }

  /**
   * Verifica se o usuário tem uma permissão específica
   */
  async hasPermission(userId: string, companyId: string, permission: Permission): Promise<boolean> {
    const permissions = await this.getUserPermissions(userId, companyId);
    return permissions.includes(permission);
  }

  /**
   * Verifica se o usuário tem todas as permissões especificadas
   */
  async hasAllPermissions(userId: string, companyId: string, requiredPermissions: Permission[]): Promise<boolean> {
    const permissions = await this.getUserPermissions(userId, companyId);
    return requiredPermissions.every(p => permissions.includes(p));
  }

  /**
   * Verifica se o usuário tem pelo menos uma das permissões especificadas
   */
  async hasAnyPermission(userId: string, companyId: string, requiredPermissions: Permission[]): Promise<boolean> {
    const permissions = await this.getUserPermissions(userId, companyId);
    return requiredPermissions.some(p => permissions.includes(p));
  }

  /**
   * Verifica se o usuário é admin da empresa
   */
  async isCompanyAdmin(userId: string, companyId: string): Promise<boolean> {
    const companyUser = await this.prisma.companyUser.findUnique({
      where: {
        userId_companyId: { userId, companyId },
      },
    });

    return companyUser?.isCompanyAdmin ?? false;
  }

  /**
   * Obtém informações do CompanyUser com permissões calculadas
   */
  async getCompanyUserWithPermissions(userId: string, companyId: string) {
    const companyUser = await this.prisma.companyUser.findUnique({
      where: {
        userId_companyId: { userId, companyId },
      },
      include: {
        permissions: true,
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
          },
        },
        company: {
          select: {
            id: true,
            tradeName: true,
            type: true,
          },
        },
      },
    });

    if (!companyUser) {
      return null;
    }

    const effectivePermissions = this.calculateEffectivePermissions(companyUser);

    return {
      ...companyUser,
      effectivePermissions,
    };
  }

  /**
   * Adiciona ou atualiza um override de permissão
   */
  async setPermissionOverride(companyUserId: string, permission: Permission, granted: boolean) {
    return this.prisma.companyUserPermission.upsert({
      where: {
        companyUserId_permission: { companyUserId, permission },
      },
      update: { granted },
      create: {
        companyUserId,
        permission,
        granted,
      },
    });
  }

  /**
   * Remove um override de permissão
   */
  async removePermissionOverride(companyUserId: string, permission: Permission) {
    return this.prisma.companyUserPermission.delete({
      where: {
        companyUserId_permission: { companyUserId, permission },
      },
    }).catch(() => null); // Ignora se não existir
  }

  /**
   * Remove todos os overrides de permissão de um usuário
   */
  async clearPermissionOverrides(companyUserId: string) {
    return this.prisma.companyUserPermission.deleteMany({
      where: { companyUserId },
    });
  }

  /**
   * Obtém lista de todos os roles disponíveis com suas permissões
   */
  getRoles() {
    return Object.values(CompanyRole).map(role => ({
      role,
      name: ROLE_NAMES[role],
      description: ROLE_DESCRIPTIONS[role],
      permissions: ROLE_PERMISSIONS[role],
    }));
  }

  /**
   * Obtém informações de um role específico
   */
  getRoleInfo(role: CompanyRole) {
    return {
      role,
      name: ROLE_NAMES[role],
      description: ROLE_DESCRIPTIONS[role],
      permissions: ROLE_PERMISSIONS[role].map(p => ({
        permission: p,
        name: PERMISSION_NAMES[p],
      })),
    };
  }

  /**
   * Obtém todas as permissões organizadas por categoria
   */
  getPermissionCategories() {
    return Object.entries(PERMISSION_CATEGORIES).map(([key, category]) => ({
      key,
      name: category.name,
      permissions: category.permissions.map(p => ({
        permission: p,
        name: PERMISSION_NAMES[p],
      })),
    }));
  }

  /**
   * Verifica se pode alterar o role/permissões de outro usuário
   * Um admin não pode rebaixar o último admin
   */
  async canModifyMember(
    currentUserId: string,
    targetCompanyUserId: string,
    companyId: string,
  ): Promise<{ allowed: boolean; reason?: string }> {
    const currentUserMembership = await this.prisma.companyUser.findUnique({
      where: { userId_companyId: { userId: currentUserId, companyId } },
    });

    if (!currentUserMembership?.isCompanyAdmin) {
      return { allowed: false, reason: 'Apenas administradores podem modificar membros' };
    }

    const targetMembership = await this.prisma.companyUser.findUnique({
      where: { id: targetCompanyUserId },
    });

    if (!targetMembership || targetMembership.companyId !== companyId) {
      return { allowed: false, reason: 'Membro não encontrado' };
    }

    // Verificar se é o último admin
    if (targetMembership.isCompanyAdmin) {
      const adminCount = await this.prisma.companyUser.count({
        where: { companyId, isCompanyAdmin: true },
      });

      if (adminCount <= 1) {
        return { allowed: false, reason: 'Não é possível modificar o último administrador' };
      }
    }

    return { allowed: true };
  }
}
