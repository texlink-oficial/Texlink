import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface AuditLogParams {
  action: string;
  userId?: string;
  companyId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create an audit log entry. Fire-and-forget — never throws.
   */
  log(params: AuditLogParams): void {
    this.prisma.auditLog
      .create({
        data: {
          action: params.action,
          userId: params.userId,
          companyId: params.companyId,
          ipAddress: params.ipAddress,
          userAgent: params.userAgent,
          metadata: params.metadata ?? undefined,
        },
      })
      .catch((error) => {
        this.logger.error(
          `Failed to write audit log: ${error.message}`,
          error.stack,
        );
      });
  }

  async findByUser(
    userId: string,
    options?: { skip?: number; take?: number },
  ) {
    return this.prisma.auditLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip: options?.skip ?? 0,
      take: options?.take ?? 50,
    });
  }

  async findByCompany(
    companyId: string,
    options?: { skip?: number; take?: number },
  ) {
    return this.prisma.auditLog.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
      skip: options?.skip ?? 0,
      take: options?.take ?? 50,
    });
  }

  async findByAction(
    action: string,
    options?: { skip?: number; take?: number },
  ) {
    return this.prisma.auditLog.findMany({
      where: { action },
      orderBy: { createdAt: 'desc' },
      skip: options?.skip ?? 0,
      take: options?.take ?? 50,
    });
  }

  async findAll(filters: {
    userId?: string;
    action?: string;
    companyId?: string;
    from?: Date;
    to?: Date;
    skip?: number;
    take?: number;
  }) {
    const where: Record<string, any> = {};

    if (filters.userId) where.userId = filters.userId;
    if (filters.action) where.action = filters.action;
    if (filters.companyId) where.companyId = filters.companyId;

    if (filters.from || filters.to) {
      where.createdAt = {};
      if (filters.from) where.createdAt.gte = filters.from;
      if (filters.to) where.createdAt.lte = filters.to;
    }

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: filters.skip ?? 0,
        take: filters.take ?? 50,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { data, total };
  }

  async findById(id: string) {
    return this.prisma.auditLog.findUnique({ where: { id } });
  }
}
