import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';

interface AuthenticatedUser {
  id: string;
  email: string;
  role: string;
  isSuperAdmin?: boolean;
  companyId?: string | null;
  supplierId?: string | null;
  brandId?: string | null;
  [key: string]: unknown;
}

interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

/**
 * Guard that processes the X-View-As-Company header for SuperAdmin users.
 * Must run AFTER JwtAuthGuard. When a SuperAdmin sends this header,
 * the guard overrides companyId/supplierId/brandId on request.user
 * so downstream services operate in the context of the target company.
 */
@Injectable()
export class ViewAsGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    if (!user) return true;

    const viewAsCompanyId = request.headers['x-view-as-company'] as string | undefined;
    if (!viewAsCompanyId) return true;

    // Only SuperAdmins can use View As
    if (user.role !== 'ADMIN' || !user.isSuperAdmin) return true;

    // Verify the target company exists
    const company = await this.prisma.company.findUnique({
      where: { id: viewAsCompanyId },
      select: { id: true, type: true, tradeName: true },
    });

    if (!company) return true;

    // Override the user context with the target company
    user.companyId = company.id;
    user.company = company;

    if (company.type === 'SUPPLIER') {
      user.supplierId = company.id;
      user.brandId = null;
    } else if (company.type === 'BRAND') {
      user.brandId = company.id;
      user.supplierId = null;
    }

    // Mark the request as a ViewAs session for audit/logging
    (request as any).isViewAs = true;
    (request as any).viewAsCompanyId = company.id;

    return true;
  }
}
