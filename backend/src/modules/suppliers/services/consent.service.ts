import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../../prisma/prisma.service';
import { CompanyType, RelationshipStatus } from '@prisma/client';
import { DOCUMENT_SHARING_CONSENT_REVOKED } from '../../notifications/events/notification.events';

export interface RevokeConsentDto {
  reason: string;
}

@Injectable()
export class ConsentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Revoke document sharing consent and terminate the relationship
   * Only the supplier can revoke consent
   */
  async revokeConsent(
    relationshipId: string,
    userId: string,
    dto: RevokeConsentDto,
    clientIp?: string,
  ) {
    // Find the relationship
    const relationship = await this.prisma.supplierBrandRelationship.findUnique({
      where: { id: relationshipId },
      include: {
        supplier: true,
        brand: true,
      },
    });

    if (!relationship) {
      throw new NotFoundException('Relacionamento não encontrado');
    }

    // Verify user belongs to supplier
    const companyUser = await this.prisma.companyUser.findFirst({
      where: {
        userId,
        companyId: relationship.supplierId,
        company: { type: CompanyType.SUPPLIER },
      },
      include: {
        user: true,
      },
    });

    if (!companyUser) {
      throw new ForbiddenException('Apenas o fornecedor pode revogar o consentimento');
    }

    if (!relationship.documentSharingConsent) {
      throw new BadRequestException('Este relacionamento não possui consentimento de compartilhamento ativo');
    }

    if (relationship.status !== RelationshipStatus.ACTIVE) {
      throw new BadRequestException('Só é possível revogar consentimento de relacionamentos ativos');
    }

    if (!dto.reason || dto.reason.trim().length < 10) {
      throw new BadRequestException('O motivo da revogação deve ter pelo menos 10 caracteres');
    }

    // Revoke consent and terminate relationship
    const updatedRelationship = await this.prisma.$transaction(async (tx) => {
      // Update relationship
      const updated = await tx.supplierBrandRelationship.update({
        where: { id: relationshipId },
        data: {
          documentSharingConsent: false,
          documentSharingRevokedAt: new Date(),
          documentSharingRevokedReason: dto.reason,
          status: RelationshipStatus.TERMINATED,
          terminatedAt: new Date(),
        },
        include: {
          supplier: true,
          brand: true,
        },
      });

      // Add to status history
      await tx.relationshipStatusHistory.create({
        data: {
          relationshipId,
          status: RelationshipStatus.TERMINATED,
          notes: `Consentimento de compartilhamento de documentos revogado: ${dto.reason}`,
          changedById: userId,
        },
      });

      return updated;
    });

    // Emit event for notification
    this.eventEmitter.emit(DOCUMENT_SHARING_CONSENT_REVOKED, {
      relationshipId: updatedRelationship.id,
      supplierId: updatedRelationship.supplierId,
      supplierName: updatedRelationship.supplier.tradeName || updatedRelationship.supplier.legalName,
      brandId: updatedRelationship.brandId,
      brandName: updatedRelationship.brand.tradeName || updatedRelationship.brand.legalName,
      revokedById: userId,
      revokedByName: companyUser.user.name,
      reason: dto.reason,
      clientIp,
    });

    return {
      success: true,
      message: 'Consentimento revogado e relacionamento encerrado com sucesso',
      relationship: {
        id: updatedRelationship.id,
        status: updatedRelationship.status,
        documentSharingConsent: updatedRelationship.documentSharingConsent,
        documentSharingRevokedAt: updatedRelationship.documentSharingRevokedAt,
      },
    };
  }

  /**
   * Get consent status for a relationship
   */
  async getConsentStatus(relationshipId: string, userId: string) {
    const relationship = await this.prisma.supplierBrandRelationship.findUnique({
      where: { id: relationshipId },
    });

    if (!relationship) {
      throw new NotFoundException('Relacionamento não encontrado');
    }

    // Verify user has access to this relationship
    const companyUser = await this.prisma.companyUser.findFirst({
      where: {
        userId,
        companyId: { in: [relationship.supplierId, relationship.brandId] },
      },
    });

    if (!companyUser) {
      throw new ForbiddenException('Você não tem acesso a este relacionamento');
    }

    return {
      relationshipId: relationship.id,
      documentSharingConsent: relationship.documentSharingConsent,
      documentSharingConsentAt: relationship.documentSharingConsentAt,
      documentSharingRevokedAt: relationship.documentSharingRevokedAt,
      documentSharingRevokedReason: relationship.documentSharingRevokedReason,
      status: relationship.status,
    };
  }

  /**
   * Update consent status (supplier only) - for granting consent after relationship was created without it
   */
  async updateConsent(
    relationshipId: string,
    userId: string,
    consent: boolean,
    clientIp?: string,
  ) {
    const relationship = await this.prisma.supplierBrandRelationship.findUnique({
      where: { id: relationshipId },
    });

    if (!relationship) {
      throw new NotFoundException('Relacionamento não encontrado');
    }

    // Verify user belongs to supplier
    const companyUser = await this.prisma.companyUser.findFirst({
      where: {
        userId,
        companyId: relationship.supplierId,
        company: { type: CompanyType.SUPPLIER },
      },
    });

    if (!companyUser) {
      throw new ForbiddenException('Apenas o fornecedor pode alterar o consentimento');
    }

    if (relationship.status !== RelationshipStatus.ACTIVE) {
      throw new BadRequestException('Só é possível alterar consentimento de relacionamentos ativos');
    }

    const updatedRelationship = await this.prisma.supplierBrandRelationship.update({
      where: { id: relationshipId },
      data: {
        documentSharingConsent: consent,
        documentSharingConsentAt: consent ? new Date() : relationship.documentSharingConsentAt,
        documentSharingConsentIp: consent ? clientIp : relationship.documentSharingConsentIp,
        // Clear revocation data when consenting again
        documentSharingRevokedAt: consent ? null : relationship.documentSharingRevokedAt,
        documentSharingRevokedReason: consent ? null : relationship.documentSharingRevokedReason,
      },
    });

    return {
      success: true,
      message: consent ? 'Consentimento concedido com sucesso' : 'Consentimento removido com sucesso',
      documentSharingConsent: updatedRelationship.documentSharingConsent,
      documentSharingConsentAt: updatedRelationship.documentSharingConsentAt,
    };
  }
}
