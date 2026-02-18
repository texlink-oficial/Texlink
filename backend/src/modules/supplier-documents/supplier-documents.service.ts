import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSupplierDocumentDto, UpdateSupplierDocumentDto } from './dto';
import {
  SupplierDocumentType,
  SupplierDocumentStatus,
  CompanyType,
  RelationshipStatus,
} from '@prisma/client';
import type { StorageProvider } from '../upload/storage.provider';
import { UploadedFile, STORAGE_PROVIDER } from '../upload/storage.provider';

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// Documents that typically have an expiration date
const DOCUMENTS_WITH_EXPIRY: SupplierDocumentType[] = [
  'CND_FEDERAL',
  'CRF_FGTS',
  'LICENCA_FUNCIONAMENTO',
  'AVCB',
  'LICENCA_AMBIENTAL',
  'LAUDO_NR1_GRO_PGR',
  'LAUDO_NR7_PCMSO',
  'LAUDO_NR10_SEGURANCA_ELETRICA',
  'LAUDO_NR15_INSALUBRIDADE',
  'LAUDO_NR17_AET',
];

// Documents that are monthly (competence-based)
const MONTHLY_DOCUMENTS: SupplierDocumentType[] = [
  'GUIA_INSS',
  'GUIA_FGTS',
  'GUIA_SIMPLES_DAS',
  'RELATORIO_EMPREGADOS',
];

@Injectable()
export class SupplierDocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(STORAGE_PROVIDER) private readonly storage: StorageProvider,
  ) {}

  // Extract S3 key from a full URL (for backward compatibility with docs missing fileKey)
  private extractKeyFromUrl(url: string): string | null {
    // Local storage: http://localhost:3000/uploads/supplier-documents/...
    const localMatch = url.match(/\/uploads\/(.+)$/);
    if (localMatch) return localMatch[1];

    // S3: https://bucket.s3.region.amazonaws.com/supplier-documents/...
    // CloudFront or CDN: https://cdn.domain.com/supplier-documents/...
    const httpsMatch = url.match(/^https?:\/\/[^/]+\/(.+)$/);
    if (httpsMatch) return httpsMatch[1];

    return null;
  }

  // Generate an accessible URL (presigned for S3, direct for local storage)
  private async getAccessibleUrl(document: {
    fileUrl: string | null;
    fileKey?: string | null;
  }): Promise<string> {
    if (!document.fileUrl) return '';
    const key = document.fileKey || this.extractKeyFromUrl(document.fileUrl);
    if (!key) return document.fileUrl;

    if (this.storage.getPresignedUrl) {
      return this.storage.getPresignedUrl(key, 3600);
    }
    return document.fileUrl;
  }

  // Calculate document status based on expiration date
  private calculateStatus(expiresAt: Date | null): SupplierDocumentStatus {
    if (!expiresAt) {
      return SupplierDocumentStatus.VALID;
    }

    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    if (expiresAt < now) {
      return SupplierDocumentStatus.EXPIRED;
    } else if (expiresAt < thirtyDaysFromNow) {
      return SupplierDocumentStatus.EXPIRING_SOON;
    }

    return SupplierDocumentStatus.VALID;
  }

  // Get supplier company for user
  private async getSupplierCompanyId(userId: string): Promise<string> {
    const companyUser = await this.prisma.companyUser.findFirst({
      where: {
        userId,
        company: { type: CompanyType.SUPPLIER },
      },
    });

    if (!companyUser) {
      throw new ForbiddenException(
        'You must be associated with a supplier company',
      );
    }

    return companyUser.companyId;
  }

  // List all documents for the supplier
  async findAll(
    userId: string,
    type?: SupplierDocumentType,
    status?: SupplierDocumentStatus,
  ) {
    const companyId = await this.getSupplierCompanyId(userId);

    const whereClause: any = { companyId };

    if (type) {
      whereClause.type = type;
    }

    if (status) {
      whereClause.status = status;
    }

    const documents = await this.prisma.supplierDocument.findMany({
      where: whereClause,
      include: {
        uploadedBy: { select: { id: true, name: true } },
      },
      orderBy: [{ type: 'asc' }, { createdAt: 'desc' }],
    });

    // Update status for documents with expiration
    const updatedDocs = documents.map((doc) => {
      if (doc.expiresAt && doc.fileUrl) {
        const newStatus = this.calculateStatus(doc.expiresAt);
        if (newStatus !== doc.status) {
          // Update status in background (don't await)
          this.prisma.supplierDocument
            .update({
              where: { id: doc.id },
              data: { status: newStatus },
            })
            .catch(() => {
              /* ignore */
            });
        }
        return { ...doc, status: newStatus };
      }
      return doc;
    });

    return updatedDocs;
  }

  // Get document by ID
  async findOne(id: string, userId: string) {
    const companyId = await this.getSupplierCompanyId(userId);

    const document = await this.prisma.supplierDocument.findFirst({
      where: { id, companyId },
      include: {
        uploadedBy: { select: { id: true, name: true } },
      },
    });

    if (!document) {
      throw new NotFoundException('Documento não encontrado');
    }

    return document;
  }

  // Create document placeholder (without file)
  async create(dto: CreateSupplierDocumentDto, userId: string) {
    const companyId = await this.getSupplierCompanyId(userId);

    // Check if document of this type already exists (for non-monthly docs)
    if (!MONTHLY_DOCUMENTS.includes(dto.type)) {
      const existing = await this.prisma.supplierDocument.findFirst({
        where: {
          companyId,
          type: dto.type,
        },
      });

      if (existing) {
        throw new BadRequestException(
          'A document of this type already exists. Please update the existing one.',
        );
      }
    }

    const expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : null;

    return this.prisma.supplierDocument.create({
      data: {
        companyId,
        type: dto.type,
        status: SupplierDocumentStatus.PENDING,
        competenceMonth: dto.competenceMonth,
        competenceYear: dto.competenceYear,
        expiresAt,
        notes: dto.notes,
        uploadedById: userId,
      },
      include: {
        uploadedBy: { select: { id: true, name: true } },
      },
    });
  }

  // Upload file for a document
  async uploadFile(id: string, file: UploadedFile, userId: string) {
    const companyId = await this.getSupplierCompanyId(userId);

    // Validate file
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid file type. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}`,
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException(
        `File too large. Maximum: ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
      );
    }

    const document = await this.prisma.supplierDocument.findFirst({
      where: { id, companyId },
    });

    if (!document) {
      throw new NotFoundException('Documento não encontrado');
    }

    // Delete old file if exists
    if (document.fileUrl) {
      const oldKey = document.fileUrl.split('/uploads/')[1];
      if (oldKey) {
        await this.storage.delete(oldKey).catch(() => {
          /* ignore */
        });
      }
    }

    // Upload new file
    const { url, key } = await this.storage.upload(
      file,
      `supplier-documents/${companyId}`,
    );

    // Calculate status
    const status = document.expiresAt
      ? this.calculateStatus(document.expiresAt)
      : SupplierDocumentStatus.VALID;

    return this.prisma.supplierDocument.update({
      where: { id },
      data: {
        fileName: file.originalname,
        fileUrl: url,
        fileKey: key,
        fileSize: file.size,
        mimeType: file.mimetype,
        uploadedAt: new Date(),
        uploadedById: userId,
        status,
      },
      include: {
        uploadedBy: { select: { id: true, name: true } },
      },
    });
  }

  // Create document with file in one step
  async createWithFile(
    dto: CreateSupplierDocumentDto,
    file: UploadedFile,
    userId: string,
  ) {
    const companyId = await this.getSupplierCompanyId(userId);

    // Validate file
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid file type. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}`,
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException(
        `File too large. Maximum: ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
      );
    }

    // Check if document of this type already exists (for non-monthly docs)
    if (!MONTHLY_DOCUMENTS.includes(dto.type)) {
      const existing = await this.prisma.supplierDocument.findFirst({
        where: {
          companyId,
          type: dto.type,
        },
      });

      if (existing) {
        // Update existing document instead
        return this.uploadFile(existing.id, file, userId);
      }
    }

    // Upload file
    const { url, key } = await this.storage.upload(
      file,
      `supplier-documents/${companyId}`,
    );

    const expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : null;
    const status = expiresAt
      ? this.calculateStatus(expiresAt)
      : SupplierDocumentStatus.VALID;

    return this.prisma.supplierDocument.create({
      data: {
        companyId,
        type: dto.type,
        status,
        fileName: file.originalname,
        fileUrl: url,
        fileKey: key,
        fileSize: file.size,
        mimeType: file.mimetype,
        uploadedAt: new Date(),
        competenceMonth: dto.competenceMonth,
        competenceYear: dto.competenceYear,
        expiresAt,
        notes: dto.notes,
        uploadedById: userId,
      },
      include: {
        uploadedBy: { select: { id: true, name: true } },
      },
    });
  }

  // Update document metadata
  async update(id: string, dto: UpdateSupplierDocumentDto, userId: string) {
    const companyId = await this.getSupplierCompanyId(userId);

    const document = await this.prisma.supplierDocument.findFirst({
      where: { id, companyId },
    });

    if (!document) {
      throw new NotFoundException('Documento não encontrado');
    }

    const expiresAt = dto.expiresAt
      ? new Date(dto.expiresAt)
      : document.expiresAt;
    const status =
      expiresAt && document.fileUrl
        ? this.calculateStatus(expiresAt)
        : document.status;

    return this.prisma.supplierDocument.update({
      where: { id },
      data: {
        ...dto,
        expiresAt,
        status,
      },
      include: {
        uploadedBy: { select: { id: true, name: true } },
      },
    });
  }

  // Delete document
  async remove(id: string, userId: string) {
    const companyId = await this.getSupplierCompanyId(userId);

    const document = await this.prisma.supplierDocument.findFirst({
      where: { id, companyId },
    });

    if (!document) {
      throw new NotFoundException('Documento não encontrado');
    }

    // Delete file if exists
    if (document.fileUrl) {
      const key = document.fileUrl.split('/uploads/')[1];
      if (key) {
        await this.storage.delete(key).catch(() => {
          /* ignore */
        });
      }
    }

    await this.prisma.supplierDocument.delete({
      where: { id },
    });

    return { success: true };
  }

  // Get document summary (counts by status)
  async getSummary(userId: string) {
    const companyId = await this.getSupplierCompanyId(userId);

    const documents = await this.prisma.supplierDocument.findMany({
      where: { companyId },
    });

    // Recalculate status for accuracy
    let valid = 0;
    let expiringSoon = 0;
    let expired = 0;
    let pending = 0;

    documents.forEach((doc) => {
      if (!doc.fileUrl) {
        pending++;
      } else if (doc.expiresAt) {
        const status = this.calculateStatus(doc.expiresAt);
        switch (status) {
          case SupplierDocumentStatus.VALID:
            valid++;
            break;
          case SupplierDocumentStatus.EXPIRING_SOON:
            expiringSoon++;
            break;
          case SupplierDocumentStatus.EXPIRED:
            expired++;
            break;
        }
      } else {
        valid++;
      }
    });

    return {
      total: documents.length,
      valid,
      expiringSoon,
      expired,
      pending,
    };
  }

  // Get all document types with their status for the supplier
  async getDocumentChecklist(userId: string) {
    const companyId = await this.getSupplierCompanyId(userId);

    const documents = await this.prisma.supplierDocument.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
    });

    // Create a map of document types to their latest document
    const docMap = new Map<SupplierDocumentType, (typeof documents)[0]>();
    documents.forEach((doc) => {
      if (!docMap.has(doc.type)) {
        docMap.set(doc.type, doc);
      }
    });

    // Build checklist
    const allTypes = Object.values(
      SupplierDocumentType,
    ) as SupplierDocumentType[];
    return allTypes.map((type) => {
      const doc = docMap.get(type);
      if (doc) {
        const status =
          doc.fileUrl && doc.expiresAt
            ? this.calculateStatus(doc.expiresAt)
            : doc.fileUrl
              ? SupplierDocumentStatus.VALID
              : SupplierDocumentStatus.PENDING;
        return {
          type,
          documentId: doc.id,
          status,
          hasFile: !!doc.fileUrl,
          expiresAt: doc.expiresAt,
          isMonthly: MONTHLY_DOCUMENTS.includes(type),
          requiresExpiry: DOCUMENTS_WITH_EXPIRY.includes(type),
        };
      }
      return {
        type,
        documentId: null,
        status: SupplierDocumentStatus.PENDING,
        hasFile: false,
        expiresAt: null,
        isMonthly: MONTHLY_DOCUMENTS.includes(type),
        requiresExpiry: DOCUMENTS_WITH_EXPIRY.includes(type),
      };
    });
  }

  // Get brand company for user
  private async getBrandCompanyId(userId: string): Promise<string> {
    const companyUser = await this.prisma.companyUser.findFirst({
      where: {
        userId,
        company: { type: CompanyType.BRAND },
      },
    });

    if (!companyUser) {
      throw new ForbiddenException(
        'You must be associated with a brand company',
      );
    }

    return companyUser.companyId;
  }

  // Get supplier documents for a brand (with active relationship and consent verification)
  async getSupplierDocumentsForBrand(
    supplierId: string,
    userId: string,
    type?: SupplierDocumentType,
    status?: SupplierDocumentStatus,
  ) {
    const brandId = await this.getBrandCompanyId(userId);

    // Verify there is an ACTIVE relationship with document sharing consent
    const relationship = await this.prisma.supplierBrandRelationship.findFirst({
      where: {
        brandId,
        supplierId,
        status: RelationshipStatus.ACTIVE,
        documentSharingConsent: true,
      },
    });

    if (!relationship) {
      // Check if relationship exists but without consent
      const relationshipWithoutConsent = await this.prisma.supplierBrandRelationship.findFirst({
        where: {
          brandId,
          supplierId,
          status: RelationshipStatus.ACTIVE,
        },
      });

      if (relationshipWithoutConsent) {
        throw new ForbiddenException(
          'O fornecedor não autorizou o compartilhamento de documentos com sua marca',
        );
      }

      throw new ForbiddenException(
        'Você não possui um relacionamento ativo com este fornecedor',
      );
    }

    // Build where clause with optional filters
    const whereClause: any = { companyId: supplierId };
    if (type) {
      whereClause.type = type;
    }

    // Get documents for the supplier
    const documents = await this.prisma.supplierDocument.findMany({
      where: whereClause,
      include: {
        uploadedBy: { select: { id: true, name: true } },
      },
      orderBy: [{ type: 'asc' }, { createdAt: 'desc' }],
    });

    // Recalculate status for accuracy and filter if status param provided
    const processedDocs = documents.map((doc) => {
      let calculatedStatus = doc.status;
      if (doc.expiresAt && doc.fileUrl) {
        calculatedStatus = this.calculateStatus(doc.expiresAt);
      } else if (!doc.fileUrl) {
        calculatedStatus = SupplierDocumentStatus.PENDING;
      }
      return { ...doc, status: calculatedStatus };
    });

    // Filter by status if provided
    if (status) {
      return processedDocs.filter((doc) => doc.status === status);
    }

    return processedDocs;
  }

  // Get document summary for brand viewing supplier documents
  async getSupplierDocumentsSummaryForBrand(supplierId: string, userId: string) {
    const brandId = await this.getBrandCompanyId(userId);

    // Verify there is an ACTIVE relationship
    const relationship = await this.prisma.supplierBrandRelationship.findFirst({
      where: {
        brandId,
        supplierId,
        status: RelationshipStatus.ACTIVE,
      },
    });

    if (!relationship) {
      throw new ForbiddenException(
        'Você não possui um relacionamento ativo com este fornecedor',
      );
    }

    // Check consent status
    if (!relationship.documentSharingConsent) {
      return {
        hasConsent: false,
        consentedAt: null,
        total: 0,
        valid: 0,
        expiringSoon: 0,
        expired: 0,
        pending: 0,
        compliancePercentage: 0,
        message: 'O fornecedor não autorizou o compartilhamento de documentos',
      };
    }

    const documents = await this.prisma.supplierDocument.findMany({
      where: { companyId: supplierId },
    });

    // Calculate counts
    let valid = 0;
    let expiringSoon = 0;
    let expired = 0;
    let pending = 0;

    documents.forEach((doc) => {
      if (!doc.fileUrl) {
        pending++;
      } else if (doc.expiresAt) {
        const status = this.calculateStatus(doc.expiresAt);
        switch (status) {
          case SupplierDocumentStatus.VALID:
            valid++;
            break;
          case SupplierDocumentStatus.EXPIRING_SOON:
            expiringSoon++;
            break;
          case SupplierDocumentStatus.EXPIRED:
            expired++;
            break;
        }
      } else {
        valid++;
      }
    });

    const total = documents.length;
    const compliantDocs = valid + expiringSoon;
    const compliancePercentage = total > 0 ? Math.round((compliantDocs / total) * 100) : 0;

    return {
      hasConsent: true,
      consentedAt: relationship.documentSharingConsentAt,
      total,
      valid,
      expiringSoon,
      expired,
      pending,
      compliancePercentage,
    };
  }

  // Get download URL for a specific document (brand access)
  async getDocumentDownloadUrlForBrand(
    supplierId: string,
    documentId: string,
    userId: string,
  ) {
    const brandId = await this.getBrandCompanyId(userId);

    // Verify there is an ACTIVE relationship with consent
    const relationship = await this.prisma.supplierBrandRelationship.findFirst({
      where: {
        brandId,
        supplierId,
        status: RelationshipStatus.ACTIVE,
        documentSharingConsent: true,
      },
    });

    if (!relationship) {
      throw new ForbiddenException(
        'Você não tem permissão para acessar os documentos deste fornecedor',
      );
    }

    // Get the document
    const document = await this.prisma.supplierDocument.findFirst({
      where: {
        id: documentId,
        companyId: supplierId,
      },
    });

    if (!document) {
      throw new NotFoundException('Documento não encontrado');
    }

    if (!document.fileUrl) {
      throw new BadRequestException('Este documento ainda não possui arquivo anexado');
    }

    const url = await this.getAccessibleUrl(document);

    return {
      url,
      fileName: document.fileName,
      mimeType: document.mimeType,
      expiresIn: 3600,
    };
  }

  // Get download URL for a document (supplier's own access)
  async getDocumentDownloadUrl(documentId: string, userId: string) {
    const companyId = await this.getSupplierCompanyId(userId);

    const document = await this.prisma.supplierDocument.findFirst({
      where: {
        id: documentId,
        companyId,
      },
    });

    if (!document) {
      throw new NotFoundException('Documento não encontrado');
    }

    if (!document.fileUrl) {
      throw new BadRequestException(
        'Este documento ainda não possui arquivo anexado',
      );
    }

    const url = await this.getAccessibleUrl(document);

    return {
      url,
      fileName: document.fileName,
      mimeType: document.mimeType,
      expiresIn: 3600,
    };
  }
}
