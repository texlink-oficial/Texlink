import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Permission } from '@prisma/client';
import {
  PERMISSIONS_KEY,
  PERMISSIONS_ALL_KEY,
} from '../../common/decorators/permissions.decorator';
import { PermissionsService } from './permissions.service';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private permissionsService: PermissionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Obtém permissões do decorator (OR - qualquer uma)
    const requiredPermissions = this.reflector.getAllAndOverride<Permission[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Obtém permissões do decorator (AND - todas)
    const requiredAllPermissions = this.reflector.getAllAndOverride<
      Permission[]
    >(PERMISSIONS_ALL_KEY, [context.getHandler(), context.getClass()]);

    // Se nenhum decorator foi aplicado, permite acesso
    if (!requiredPermissions && !requiredAllPermissions) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Usuário não autenticado');
    }

    // Obtém o companyId do request (pode vir de params, body ou query)
    const companyId = this.extractCompanyId(request);

    if (!companyId) {
      throw new ForbiddenException('Company ID não fornecido');
    }

    // Verifica se o usuário tem as permissões necessárias
    if (requiredAllPermissions && requiredAllPermissions.length > 0) {
      const hasAll = await this.permissionsService.hasAllPermissions(
        user.id,
        companyId,
        requiredAllPermissions,
      );

      if (!hasAll) {
        throw new ForbiddenException('Permissões insuficientes');
      }
    }

    if (requiredPermissions && requiredPermissions.length > 0) {
      const hasAny = await this.permissionsService.hasAnyPermission(
        user.id,
        companyId,
        requiredPermissions,
      );

      if (!hasAny) {
        throw new ForbiddenException('Permissões insuficientes');
      }
    }

    return true;
  }

  /**
   * Extrai o companyId do request
   * Prioridade: params > body > query > user's first company
   */
  private extractCompanyId(request: any): string | undefined {
    // Do route params (ex: /companies/:companyId/team)
    if (request.params?.companyId) {
      return request.params.companyId;
    }

    // Do body
    if (request.body?.companyId) {
      return request.body.companyId;
    }

    // Da query string
    if (request.query?.companyId) {
      return request.query.companyId;
    }

    // Do usuário autenticado (role-matched companyId from JWT strategy)
    if (request.user?.companyId) {
      return request.user.companyId;
    }

    // Fallback: role-matched company from companyUsers array
    const matchingCu =
      request.user?.companyUsers?.find(
        (cu: any) => cu.company?.type === request.user?.role,
      ) || request.user?.companyUsers?.[0];
    if (matchingCu?.company?.id) {
      return matchingCu.company.id;
    }

    return undefined;
  }
}
