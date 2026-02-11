import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreatePartnershipRequestDto,
  RespondPartnershipRequestDto,
  PartnershipRequestFilterDto,
} from './dto';
import {
  PartnershipRequestStatus,
  CompanyType,
  RelationshipStatus,
  UserRole,
} from '@prisma/client';
import {
  PARTNERSHIP_REQUEST_RECEIVED,
  PARTNERSHIP_REQUEST_ACCEPTED,
  PARTNERSHIP_REQUEST_REJECTED,
  PARTNERSHIP_REQUEST_CANCELLED,
} from '../notifications/events/notification.events';
import type { StorageProvider } from '../upload/storage.provider';
import { STORAGE_PROVIDER } from '../upload/storage.provider';

@Injectable()
export class PartnershipRequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    @Inject(STORAGE_PROVIDER) private readonly storage: StorageProvider,
  ) {}

  private async resolveCompanyLogos<T extends { logoUrl?: string | null }>(company: T): Promise<T> {
    if (company?.logoUrl) {
      return { ...company, logoUrl: await this.storage.resolveUrl?.(company.logoUrl) ?? company.logoUrl };
    }
    return company;
  }

  /**
   * Create a new partnership request from brand to supplier
   */
  async create(dto: CreatePartnershipRequestDto, userId: string) {
    // Get the brand company for this user
    const companyUser = await this.prisma.companyUser.findFirst({
      where: {
        userId,
        company: { type: CompanyType.BRAND },
      },
      include: {
        company: true,
        user: true,
      },
    });

    if (!companyUser) {
      throw new ForbiddenException('Usuário não pertence a uma marca');
    }

    const brandId = companyUser.companyId;

    // Verify supplier exists and is active
    const supplier = await this.prisma.company.findFirst({
      where: {
        id: dto.supplierId,
        type: CompanyType.SUPPLIER,
        status: 'ACTIVE',
      },
    });

    if (!supplier) {
      throw new NotFoundException('Fornecedor não encontrado ou não está ativo');
    }

    // Check if already has an active relationship
    const existingRelationship = await this.prisma.supplierBrandRelationship.findUnique({
      where: {
        supplierId_brandId: {
          supplierId: dto.supplierId,
          brandId,
        },
      },
    });

    if (existingRelationship && existingRelationship.status === RelationshipStatus.ACTIVE) {
      throw new ConflictException('Já existe um relacionamento ativo com este fornecedor');
    }

    // Check if there's already a pending request
    const existingRequest = await this.prisma.partnershipRequest.findFirst({
      where: {
        brandId,
        supplierId: dto.supplierId,
        status: PartnershipRequestStatus.PENDING,
      },
    });

    if (existingRequest) {
      throw new ConflictException('Já existe uma solicitação pendente para este fornecedor');
    }

    // Calculate expiration date (30 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    // Create the request
    const request = await this.prisma.partnershipRequest.create({
      data: {
        brandId,
        supplierId: dto.supplierId,
        requestedById: userId,
        message: dto.message,
        expiresAt,
      },
      include: {
        brand: {
          select: { id: true, tradeName: true, legalName: true, city: true, state: true },
        },
        supplier: {
          select: { id: true, tradeName: true, legalName: true, city: true, state: true },
        },
        requestedBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // Emit event for notification
    this.eventEmitter.emit(PARTNERSHIP_REQUEST_RECEIVED, {
      requestId: request.id,
      brandId: request.brandId,
      brandName: request.brand.tradeName || request.brand.legalName,
      supplierId: request.supplierId,
      supplierName: request.supplier.tradeName || request.supplier.legalName,
      requestedById: request.requestedById,
      requestedByName: request.requestedBy.name,
      message: request.message,
    });

    return request;
  }

  /**
   * Get requests sent by brand
   */
  async findSentByBrand(userId: string, filters: PartnershipRequestFilterDto) {
    const companyUser = await this.prisma.companyUser.findFirst({
      where: {
        userId,
        company: { type: CompanyType.BRAND },
      },
    });

    if (!companyUser) {
      throw new ForbiddenException('Usuário não pertence a uma marca');
    }

    const brandId = companyUser.companyId;
    const { status, page = 1, limit = 10 } = filters;

    const where = {
      brandId,
      ...(status && { status }),
    };

    const [requests, total] = await Promise.all([
      this.prisma.partnershipRequest.findMany({
        where,
        include: {
          supplier: {
            select: {
              id: true,
              tradeName: true,
              legalName: true,
              city: true,
              state: true,
              avgRating: true,
              logoUrl: true,
            },
          },
          respondedBy: {
            select: { id: true, name: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.partnershipRequest.count({ where }),
    ]);

    const resolvedRequests = await Promise.all(
      requests.map(async (r) => ({
        ...r,
        supplier: await this.resolveCompanyLogos(r.supplier),
      })),
    );

    return {
      data: resolvedRequests,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get requests received by supplier
   */
  async findReceivedBySupplier(userId: string, filters: PartnershipRequestFilterDto) {
    const companyUser = await this.prisma.companyUser.findFirst({
      where: {
        userId,
        company: { type: CompanyType.SUPPLIER },
      },
    });

    if (!companyUser) {
      throw new ForbiddenException('Usuário não pertence a um fornecedor');
    }

    const supplierId = companyUser.companyId;
    const { status, page = 1, limit = 10 } = filters;

    const where = {
      supplierId,
      ...(status && { status }),
    };

    const [requests, total] = await Promise.all([
      this.prisma.partnershipRequest.findMany({
        where,
        include: {
          brand: {
            select: {
              id: true,
              tradeName: true,
              legalName: true,
              city: true,
              state: true,
              logoUrl: true,
            },
          },
          requestedBy: {
            select: { id: true, name: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.partnershipRequest.count({ where }),
    ]);

    const resolvedRequests = await Promise.all(
      requests.map(async (r) => ({
        ...r,
        brand: await this.resolveCompanyLogos(r.brand),
      })),
    );

    return {
      data: resolvedRequests,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get a single request by ID
   */
  async findById(id: string, userId: string) {
    const request = await this.prisma.partnershipRequest.findUnique({
      where: { id },
      include: {
        brand: {
          select: {
            id: true,
            tradeName: true,
            legalName: true,
            city: true,
            state: true,
            logoUrl: true,
          },
        },
        supplier: {
          select: {
            id: true,
            tradeName: true,
            legalName: true,
            city: true,
            state: true,
            avgRating: true,
            logoUrl: true,
          },
        },
        requestedBy: {
          select: { id: true, name: true, email: true },
        },
        respondedBy: {
          select: { id: true, name: true },
        },
      },
    });

    if (!request) {
      throw new NotFoundException('Solicitação não encontrada');
    }

    // Check if user has access
    const companyUser = await this.prisma.companyUser.findFirst({
      where: {
        userId,
        companyId: { in: [request.brandId, request.supplierId] },
      },
    });

    if (!companyUser) {
      throw new ForbiddenException('Você não tem acesso a esta solicitação');
    }

    return {
      ...request,
      brand: await this.resolveCompanyLogos(request.brand),
      supplier: await this.resolveCompanyLogos(request.supplier),
    };
  }

  /**
   * Check if there's an existing request or relationship
   */
  async checkExisting(supplierId: string, userId: string) {
    const companyUser = await this.prisma.companyUser.findFirst({
      where: {
        userId,
        company: { type: CompanyType.BRAND },
      },
    });

    if (!companyUser) {
      throw new ForbiddenException('Usuário não pertence a uma marca');
    }

    const brandId = companyUser.companyId;

    // Check for existing relationship
    const relationship = await this.prisma.supplierBrandRelationship.findUnique({
      where: {
        supplierId_brandId: {
          supplierId,
          brandId,
        },
      },
    });

    // Check for pending request
    const pendingRequest = await this.prisma.partnershipRequest.findFirst({
      where: {
        brandId,
        supplierId,
        status: PartnershipRequestStatus.PENDING,
      },
    });

    return {
      hasActiveRelationship: relationship?.status === RelationshipStatus.ACTIVE,
      hasPendingRequest: !!pendingRequest,
      pendingRequestId: pendingRequest?.id || null,
      relationshipStatus: relationship?.status || null,
    };
  }

  /**
   * Respond to a partnership request (accept or reject)
   */
  async respond(id: string, dto: RespondPartnershipRequestDto, userId: string, clientIp?: string) {
    const request = await this.prisma.partnershipRequest.findUnique({
      where: { id },
      include: {
        brand: true,
        supplier: true,
      },
    });

    if (!request) {
      throw new NotFoundException('Solicitação não encontrada');
    }

    // Verify user belongs to supplier
    const companyUser = await this.prisma.companyUser.findFirst({
      where: {
        userId,
        companyId: request.supplierId,
      },
      include: {
        user: true,
      },
    });

    if (!companyUser) {
      throw new ForbiddenException('Apenas o fornecedor pode responder a esta solicitação');
    }

    if (request.status !== PartnershipRequestStatus.PENDING) {
      throw new BadRequestException('Esta solicitação já foi respondida ou expirou');
    }

    // Check if request has expired
    if (new Date() > request.expiresAt) {
      await this.prisma.partnershipRequest.update({
        where: { id },
        data: { status: PartnershipRequestStatus.EXPIRED },
      });
      throw new BadRequestException('Esta solicitação expirou');
    }

    if (dto.accepted) {
      // Accept: Create relationship and update request
      const documentSharingConsent = dto.documentSharingConsent ?? false;

      const result = await this.prisma.$transaction(async (tx) => {
        // Create or update relationship with LGPD consent fields
        const relationship = await tx.supplierBrandRelationship.upsert({
          where: {
            supplierId_brandId: {
              supplierId: request.supplierId,
              brandId: request.brandId,
            },
          },
          create: {
            supplierId: request.supplierId,
            brandId: request.brandId,
            status: RelationshipStatus.ACTIVE,
            initiatedBy: request.requestedById,
            initiatedByRole: UserRole.BRAND,
            activatedAt: new Date(),
            // LGPD Document Sharing Consent
            documentSharingConsent,
            documentSharingConsentAt: documentSharingConsent ? new Date() : null,
            documentSharingConsentIp: documentSharingConsent ? clientIp : null,
          },
          update: {
            status: RelationshipStatus.ACTIVE,
            activatedAt: new Date(),
            suspendedAt: null,
            terminatedAt: null,
            // LGPD Document Sharing Consent
            documentSharingConsent,
            documentSharingConsentAt: documentSharingConsent ? new Date() : null,
            documentSharingConsentIp: documentSharingConsent ? clientIp : null,
            documentSharingRevokedAt: null,
            documentSharingRevokedReason: null,
          },
        });

        // Update request
        const updatedRequest = await tx.partnershipRequest.update({
          where: { id },
          data: {
            status: PartnershipRequestStatus.ACCEPTED,
            respondedById: userId,
            respondedAt: new Date(),
            relationshipId: relationship.id,
          },
          include: {
            brand: true,
            supplier: true,
            respondedBy: true,
          },
        });

        return { request: updatedRequest, relationship };
      });

      // Emit accepted event
      this.eventEmitter.emit(PARTNERSHIP_REQUEST_ACCEPTED, {
        requestId: result.request.id,
        brandId: result.request.brandId,
        brandName: result.request.brand.tradeName || result.request.brand.legalName,
        supplierId: result.request.supplierId,
        supplierName: result.request.supplier.tradeName || result.request.supplier.legalName,
        respondedById: userId,
        respondedByName: companyUser.user.name,
        relationshipId: result.relationship.id,
      });

      return result.request;
    } else {
      // Reject
      if (!dto.rejectionReason) {
        throw new BadRequestException('Motivo da recusa é obrigatório');
      }

      const updatedRequest = await this.prisma.partnershipRequest.update({
        where: { id },
        data: {
          status: PartnershipRequestStatus.REJECTED,
          respondedById: userId,
          respondedAt: new Date(),
          rejectionReason: dto.rejectionReason,
        },
        include: {
          brand: true,
          supplier: true,
          respondedBy: true,
        },
      });

      // Emit rejected event
      this.eventEmitter.emit(PARTNERSHIP_REQUEST_REJECTED, {
        requestId: updatedRequest.id,
        brandId: updatedRequest.brandId,
        brandName: updatedRequest.brand.tradeName || updatedRequest.brand.legalName,
        supplierId: updatedRequest.supplierId,
        supplierName: updatedRequest.supplier.tradeName || updatedRequest.supplier.legalName,
        respondedById: userId,
        respondedByName: companyUser.user.name,
        rejectionReason: dto.rejectionReason,
      });

      return updatedRequest;
    }
  }

  /**
   * Cancel a pending request (brand only)
   */
  async cancel(id: string, userId: string) {
    const request = await this.prisma.partnershipRequest.findUnique({
      where: { id },
      include: {
        brand: true,
        supplier: true,
      },
    });

    if (!request) {
      throw new NotFoundException('Solicitação não encontrada');
    }

    // Verify user belongs to brand
    const companyUser = await this.prisma.companyUser.findFirst({
      where: {
        userId,
        companyId: request.brandId,
      },
      include: {
        user: true,
      },
    });

    if (!companyUser) {
      throw new ForbiddenException('Apenas a marca pode cancelar esta solicitação');
    }

    if (request.status !== PartnershipRequestStatus.PENDING) {
      throw new BadRequestException('Apenas solicitações pendentes podem ser canceladas');
    }

    const updatedRequest = await this.prisma.partnershipRequest.update({
      where: { id },
      data: {
        status: PartnershipRequestStatus.CANCELLED,
      },
      include: {
        brand: true,
        supplier: true,
      },
    });

    // Emit cancelled event
    this.eventEmitter.emit(PARTNERSHIP_REQUEST_CANCELLED, {
      requestId: updatedRequest.id,
      brandId: updatedRequest.brandId,
      brandName: updatedRequest.brand.tradeName || updatedRequest.brand.legalName,
      supplierId: updatedRequest.supplierId,
      supplierName: updatedRequest.supplier.tradeName || updatedRequest.supplier.legalName,
      cancelledById: userId,
      cancelledByName: companyUser.user.name,
    });

    return updatedRequest;
  }

  /**
   * Get pending requests count for a supplier (for badge)
   */
  async getPendingCountForSupplier(userId: string): Promise<number> {
    const companyUser = await this.prisma.companyUser.findFirst({
      where: {
        userId,
        company: { type: CompanyType.SUPPLIER },
      },
    });

    if (!companyUser) {
      return 0;
    }

    return this.prisma.partnershipRequest.count({
      where: {
        supplierId: companyUser.companyId,
        status: PartnershipRequestStatus.PENDING,
      },
    });
  }

  /**
   * Expire old pending requests (to be called by scheduled job)
   */
  async expireOldRequests(): Promise<number> {
    const result = await this.prisma.partnershipRequest.updateMany({
      where: {
        status: PartnershipRequestStatus.PENDING,
        expiresAt: {
          lt: new Date(),
        },
      },
      data: {
        status: PartnershipRequestStatus.EXPIRED,
      },
    });

    return result.count;
  }
}
