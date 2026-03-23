import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Request } from 'express';
import { UserRole, CompanyStatus } from '@prisma/client';

interface AuthenticatedUser {
  id: string;
  role: UserRole;
  company?: { status?: CompanyStatus } | null;
}

interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

/**
 * Guard that ensures the user's company is ACTIVE.
 * Blocks PENDING and SUSPENDED companies from accessing protected endpoints.
 * ADMINs are always allowed through.
 */
@Injectable()
export class ActiveCompanyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    if (!user) {
      return false;
    }

    // Admins always pass
    if (user.role === UserRole.ADMIN) {
      return true;
    }

    const companyStatus = user.company?.status;

    if (companyStatus === CompanyStatus.ACTIVE) {
      return true;
    }

    if (companyStatus === CompanyStatus.PENDING) {
      throw new ForbiddenException(
        'Sua empresa está aguardando homologação. O acesso aos fornecedores será liberado após aprovação.',
      );
    }

    if (companyStatus === CompanyStatus.SUSPENDED) {
      throw new ForbiddenException(
        'Sua empresa está suspensa. Entre em contato com o suporte.',
      );
    }

    throw new ForbiddenException(
      'Acesso negado. Status da empresa inválido.',
    );
  }
}
