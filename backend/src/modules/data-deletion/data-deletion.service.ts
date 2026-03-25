import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { DataDeletionStatus } from '@prisma/client';
import { randomUUID } from 'crypto';

@Injectable()
export class DataDeletionService {
  constructor(private prisma: PrismaService) {}

  /**
   * User requests deletion of their personal data (LGPD right-to-deletion).
   */
  async requestDeletion(userId: string, reason?: string) {
    // Check if user already has a pending or processing request
    const existing = await this.prisma.dataDeletionRequest.findFirst({
      where: {
        userId,
        status: { in: [DataDeletionStatus.PENDING, DataDeletionStatus.PROCESSING] },
      },
    });

    if (existing) {
      throw new BadRequestException(
        'Já existe uma solicitação de exclusão em andamento',
      );
    }

    return this.prisma.dataDeletionRequest.create({
      data: {
        userId,
        reason,
      },
    });
  }

  /**
   * Admin processes a deletion request — anonymizes PII and deactivates user.
   * All operations run in a transaction for consistency.
   */
  async processDeletion(requestId: string, adminId: string) {
    const request = await this.prisma.dataDeletionRequest.findUnique({
      where: { id: requestId },
      include: { user: true },
    });

    if (!request) {
      throw new NotFoundException('Solicitação de exclusão não encontrada');
    }

    if (request.status !== DataDeletionStatus.PENDING) {
      throw new BadRequestException(
        'Esta solicitação já foi processada',
      );
    }

    const anonymizedEmail = `deleted-${randomUUID()}@removed.texlink.com.br`;

    return this.prisma.$transaction(async (tx) => {
      // 1. Anonymize user PII and deactivate
      await tx.user.update({
        where: { id: request.userId },
        data: {
          name: 'Usuário Removido',
          email: anonymizedEmail,
          isActive: false,
          passwordChangedAt: new Date(), // Invalidates all existing JWT tokens
        },
      });

      // 2. Update request status to COMPLETED
      const updatedRequest = await tx.dataDeletionRequest.update({
        where: { id: requestId },
        data: {
          status: DataDeletionStatus.COMPLETED,
          processedAt: new Date(),
          processedBy: adminId,
        },
      });

      return updatedRequest;
    });
  }

  /**
   * User lists their own deletion requests.
   */
  async getMyRequests(userId: string) {
    return this.prisma.dataDeletionRequest.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Admin lists all pending deletion requests.
   */
  async getPendingRequests() {
    return this.prisma.dataDeletionRequest.findMany({
      where: { status: DataDeletionStatus.PENDING },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }
}
