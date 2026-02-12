import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import {
  SupplierCredentialStatus,
  ContractStatus,
  ContractType,
  ContractRevisionStatus,
  Prisma,
} from '@prisma/client';
import PDFDocument from 'pdfkit';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import {
  DEFAULT_CONTRACT_TEMPLATE,
  DEFAULT_PAYMENT_TERMS,
  DEFAULT_PENALTY_RATE,
} from './templates/default-contract.template';
import {
  CreateContractDto,
  UploadContractDto,
  ContractFilterDto,
  RequestRevisionDto,
  RespondRevisionDto,
} from './dto';
import {
  CONTRACT_SENT_FOR_SIGNATURE,
  CONTRACT_REVISION_REQUESTED,
  CONTRACT_REVISION_RESPONDED,
  CONTRACT_SIGNED,
  CONTRACT_FULLY_SIGNED,
  CONTRACT_CANCELLED,
} from '../notifications/events/notification.events';

@Injectable()
export class ContractsService {
  private readonly logger = new Logger(ContractsService.name);
  private readonly uploadsPath = path.join(
    process.cwd(),
    'uploads',
    'contracts',
  );

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    // Criar diretório de uploads se não existir
    if (!fs.existsSync(this.uploadsPath)) {
      fs.mkdirSync(this.uploadsPath, { recursive: true });
    }
  }

  // ==================== CONTRACT MANAGEMENT METHODS ====================

  /**
   * Criar contrato a partir de template
   */
  async createContract(dto: CreateContractDto, userId: string) {
    // Buscar relacionamento
    const relationship = await this.prisma.supplierBrandRelationship.findUnique({
      where: { id: dto.relationshipId },
      include: {
        supplier: true,
        brand: true,
      },
    });

    if (!relationship) {
      throw new NotFoundException('Relacionamento não encontrado');
    }

    // Gerar displayId único
    const displayId = await this.generateDisplayId();

    // Preparar variáveis do template
    const variables = {
      brandName: relationship.brand.legalName || relationship.brand.tradeName,
      brandCnpj: this.formatCNPJ(relationship.brand.document),
      brandAddress: this.formatAddress(relationship.brand),
      supplierName:
        relationship.supplier.legalName || relationship.supplier.tradeName,
      supplierCnpj: this.formatCNPJ(relationship.supplier.document),
      supplierAddress: this.formatAddress(relationship.supplier),
      date: new Date().toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      }),
      paymentTerms: dto.terms?.paymentTerms || DEFAULT_PAYMENT_TERMS,
      penaltyRate: dto.terms?.penaltyRate || DEFAULT_PENALTY_RATE,
      contractTitle: dto.title || 'Contrato de Prestação de Serviços',
      contractValue: dto.value
        ? new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
          }).format(dto.value)
        : 'A definir por pedido',
      validFrom: new Date(dto.validFrom).toLocaleDateString('pt-BR'),
      validUntil: new Date(dto.validUntil).toLocaleDateString('pt-BR'),
    };

    // Substituir variáveis no template
    let contractText = DEFAULT_CONTRACT_TEMPLATE;
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      contractText = contractText.replace(regex, String(value));
    });

    // Gerar PDF
    const fileName = `${displayId}.pdf`;
    const filePath = path.join(this.uploadsPath, fileName);

    await this.generatePDF(contractText, filePath, dto.title);

    // Calcular hash do documento
    const documentHash = await this.calculateFileHash(filePath);

    // Criar registro do contrato
    const contract = await this.prisma.supplierContract.create({
      data: {
        displayId,
        relationshipId: dto.relationshipId,
        supplierId: relationship.supplierId,
        brandId: relationship.brandId,
        type: dto.type,
        title: dto.title,
        description: dto.description,
        value: dto.value ? new Prisma.Decimal(dto.value) : null,
        validFrom: new Date(dto.validFrom),
        validUntil: new Date(dto.validUntil),
        documentUrl: `/uploads/contracts/${fileName}`,
        documentHash,
        terms: dto.terms as any,
        parentContractId: dto.parentContractId,
        createdById: userId,
        status: ContractStatus.DRAFT,
      },
      include: {
        brand: { select: { tradeName: true, legalName: true } },
        supplier: { select: { tradeName: true, legalName: true } },
      },
    });

    this.logger.log(
      `Contrato criado: ${displayId} para relationship ${dto.relationshipId}`,
    );

    return contract;
  }

  /**
   * Upload de contrato PDF customizado
   */
  async uploadContract(
    dto: UploadContractDto,
    file: Express.Multer.File,
    userId: string,
  ) {
    // Buscar relacionamento
    const relationship = await this.prisma.supplierBrandRelationship.findUnique({
      where: { id: dto.relationshipId },
      include: {
        supplier: true,
        brand: true,
      },
    });

    if (!relationship) {
      throw new NotFoundException('Relacionamento não encontrado');
    }

    // Gerar displayId único
    const displayId = await this.generateDisplayId();

    // Salvar arquivo
    const fileName = `${displayId}.pdf`;
    const filePath = path.join(this.uploadsPath, fileName);
    fs.writeFileSync(filePath, file.buffer);

    // Calcular hash do documento
    const documentHash = await this.calculateFileHash(filePath);

    // Criar registro do contrato
    const contract = await this.prisma.supplierContract.create({
      data: {
        displayId,
        relationshipId: dto.relationshipId,
        supplierId: relationship.supplierId,
        brandId: relationship.brandId,
        type: dto.type,
        title: dto.title,
        validFrom: new Date(dto.validFrom),
        validUntil: new Date(dto.validUntil),
        documentUrl: `/uploads/contracts/${fileName}`,
        documentHash,
        parentContractId: dto.parentContractId,
        createdById: userId,
        status: ContractStatus.DRAFT,
      },
      include: {
        brand: { select: { tradeName: true, legalName: true } },
        supplier: { select: { tradeName: true, legalName: true } },
      },
    });

    this.logger.log(`Contrato uploaded: ${displayId}`);

    return contract;
  }

  /**
   * Enviar contrato para assinatura
   */
  async sendForSignature(contractId: string, userId: string, message?: string) {
    const contract = await this.prisma.supplierContract.findUnique({
      where: { id: contractId },
      include: {
        brand: true,
        supplier: true,
      },
    });

    if (!contract) {
      throw new NotFoundException('Contrato não encontrado');
    }

    if (contract.status !== ContractStatus.DRAFT) {
      throw new BadRequestException(
        'Apenas contratos em rascunho podem ser enviados para assinatura',
      );
    }

    // Atualizar status
    const updated = await this.prisma.supplierContract.update({
      where: { id: contractId },
      data: {
        status: ContractStatus.PENDING_SUPPLIER_SIGNATURE,
      },
      include: {
        brand: { select: { tradeName: true, legalName: true } },
        supplier: { select: { tradeName: true, legalName: true } },
      },
    });

    this.logger.log(`Contrato ${contract.displayId} enviado para assinatura`);

    this.eventEmitter.emit(CONTRACT_SENT_FOR_SIGNATURE, {
      contractId: contract.id,
      displayId: contract.displayId,
      brandId: contract.brandId,
      brandName: contract.brand?.tradeName || contract.brand?.legalName,
      supplierId: contract.supplierId,
      supplierName: contract.supplier?.tradeName || contract.supplier?.legalName,
      title: contract.title,
      sentById: userId,
      sentByName: '',
      message,
    });

    return updated;
  }

  /**
   * Solicitar revisão de contrato (facção)
   */
  async requestRevision(dto: RequestRevisionDto, userId: string) {
    const contract = await this.prisma.supplierContract.findUnique({
      where: { id: dto.contractId },
    });

    if (!contract) {
      throw new NotFoundException('Contrato não encontrado');
    }

    if (contract.status !== ContractStatus.PENDING_SUPPLIER_SIGNATURE) {
      throw new BadRequestException(
        'Apenas contratos pendentes de assinatura podem ter revisão solicitada',
      );
    }

    // Verificar se já existe revisão pendente
    const existingPending = await this.prisma.contractRevision.findFirst({
      where: {
        contractId: dto.contractId,
        status: ContractRevisionStatus.PENDING,
      },
    });

    if (existingPending) {
      throw new BadRequestException(
        'Já existe uma solicitação de revisão pendente para este contrato',
      );
    }

    // Criar solicitação de revisão
    const revision = await this.prisma.contractRevision.create({
      data: {
        contractId: dto.contractId,
        requestedById: userId,
        message: dto.message,
        status: ContractRevisionStatus.PENDING,
      },
      include: {
        requestedBy: { select: { name: true, email: true } },
      },
    });

    this.logger.log(
      `Revisão solicitada para contrato ${contract.displayId} por ${userId}`,
    );

    this.eventEmitter.emit(CONTRACT_REVISION_REQUESTED, {
      revisionId: revision.id,
      contractId: contract.id,
      displayId: contract.displayId,
      brandId: contract.brandId,
      brandName: '',
      supplierId: contract.supplierId,
      supplierName: revision.requestedBy?.name || '',
      requestedById: userId,
      requestedByName: revision.requestedBy?.name || '',
      message: dto.message,
    });

    return revision;
  }

  /**
   * Responder solicitação de revisão (marca)
   */
  async respondToRevision(dto: RespondRevisionDto, userId: string) {
    const revision = await this.prisma.contractRevision.findUnique({
      where: { id: dto.revisionId },
      include: {
        contract: true,
      },
    });

    if (!revision) {
      throw new NotFoundException('Solicitação de revisão não encontrada');
    }

    if (revision.status !== ContractRevisionStatus.PENDING) {
      throw new BadRequestException(
        'Esta solicitação de revisão já foi respondida',
      );
    }

    // Atualizar revisão
    const updated = await this.prisma.contractRevision.update({
      where: { id: dto.revisionId },
      data: {
        status: dto.status,
        respondedById: userId,
        respondedAt: new Date(),
        responseNotes: dto.responseNotes,
      },
      include: {
        requestedBy: { select: { name: true, email: true } },
        respondedBy: { select: { name: true, email: true } },
        contract: { select: { displayId: true } },
      },
    });

    this.logger.log(
      `Revisão ${dto.revisionId} respondida com status ${dto.status}`,
    );

    this.eventEmitter.emit(CONTRACT_REVISION_RESPONDED, {
      revisionId: updated.id,
      contractId: revision.contract.id,
      displayId: updated.contract?.displayId || '',
      brandId: revision.contract.brandId,
      supplierId: revision.contract.supplierId,
      supplierName: '',
      respondedById: userId,
      respondedByName: updated.respondedBy?.name || '',
      status: dto.status,
      responseNotes: dto.responseNotes,
    });

    return updated;
  }

  /**
   * Assinar contrato como marca
   */
  async signAsBrand(
    contractId: string,
    userId: string,
    signerName: string,
    ipAddress: string,
  ) {
    const contract = await this.prisma.supplierContract.findUnique({
      where: { id: contractId },
    });

    if (!contract) {
      throw new NotFoundException('Contrato não encontrado');
    }

    if (contract.brandSignedAt) {
      throw new BadRequestException('Contrato já foi assinado pela marca');
    }

    // Atualizar assinatura
    const updated = await this.prisma.supplierContract.update({
      where: { id: contractId },
      data: {
        brandSignedAt: new Date(),
        brandSignedById: userId,
        brandSignerName: signerName,
        brandSignatureIp: ipAddress,
        status: contract.supplierSignedAt
          ? ContractStatus.SIGNED
          : ContractStatus.PENDING_SUPPLIER_SIGNATURE,
      },
      include: {
        brand: { select: { tradeName: true, legalName: true } },
        supplier: { select: { tradeName: true, legalName: true } },
      },
    });

    this.logger.log(
      `Contrato ${contract.displayId} assinado pela marca (${signerName})`,
    );

    this.eventEmitter.emit(CONTRACT_SIGNED, {
      contractId: contract.id,
      displayId: contract.displayId,
      brandId: contract.brandId,
      brandName: updated.brand?.tradeName || updated.brand?.legalName || '',
      supplierId: contract.supplierId,
      supplierName: updated.supplier?.tradeName || updated.supplier?.legalName || '',
      signedBy: 'BRAND',
      signerName,
      signerId: userId,
    });

    if (updated.status === ContractStatus.SIGNED) {
      this.eventEmitter.emit(CONTRACT_FULLY_SIGNED, {
        contractId: contract.id,
        displayId: contract.displayId,
        brandId: contract.brandId,
        brandName: updated.brand?.tradeName || updated.brand?.legalName || '',
        supplierId: contract.supplierId,
        supplierName: updated.supplier?.tradeName || updated.supplier?.legalName || '',
        title: contract.title,
      });
    }

    return updated;
  }

  /**
   * Assinar contrato como fornecedor
   */
  async signAsSupplier(
    contractId: string,
    userId: string,
    signerName: string,
    ipAddress: string,
  ) {
    const contract = await this.prisma.supplierContract.findUnique({
      where: { id: contractId },
    });

    if (!contract) {
      throw new NotFoundException('Contrato não encontrado');
    }

    if (
      contract.status !== ContractStatus.PENDING_SUPPLIER_SIGNATURE &&
      contract.status !== ContractStatus.PENDING_BRAND_SIGNATURE
    ) {
      throw new BadRequestException(
        'Este contrato não está aguardando assinatura',
      );
    }

    if (contract.supplierSignedAt) {
      throw new BadRequestException('Contrato já foi assinado pelo fornecedor');
    }

    // Verificar se há revisões pendentes
    const pendingRevision = await this.prisma.contractRevision.findFirst({
      where: {
        contractId,
        status: ContractRevisionStatus.PENDING,
      },
    });

    if (pendingRevision) {
      throw new BadRequestException(
        'Existe uma solicitação de revisão pendente para este contrato',
      );
    }

    // Atualizar assinatura
    const updated = await this.prisma.supplierContract.update({
      where: { id: contractId },
      data: {
        supplierSignedAt: new Date(),
        supplierSignedById: userId,
        supplierSignerName: signerName,
        supplierSignatureIp: ipAddress,
        status: contract.brandSignedAt
          ? ContractStatus.SIGNED
          : ContractStatus.PENDING_BRAND_SIGNATURE,
      },
      include: {
        brand: { select: { tradeName: true, legalName: true } },
        supplier: { select: { tradeName: true, legalName: true } },
      },
    });

    this.logger.log(
      `Contrato ${contract.displayId} assinado pelo fornecedor (${signerName})`,
    );

    this.eventEmitter.emit(CONTRACT_SIGNED, {
      contractId: contract.id,
      displayId: contract.displayId,
      brandId: contract.brandId,
      brandName: updated.brand?.tradeName || updated.brand?.legalName || '',
      supplierId: contract.supplierId,
      supplierName: updated.supplier?.tradeName || updated.supplier?.legalName || '',
      signedBy: 'SUPPLIER',
      signerName,
      signerId: userId,
    });

    if (updated.status === ContractStatus.SIGNED) {
      this.eventEmitter.emit(CONTRACT_FULLY_SIGNED, {
        contractId: contract.id,
        displayId: contract.displayId,
        brandId: contract.brandId,
        brandName: updated.brand?.tradeName || updated.brand?.legalName || '',
        supplierId: contract.supplierId,
        supplierName: updated.supplier?.tradeName || updated.supplier?.legalName || '',
        title: contract.title,
      });
    }

    // Se ambos assinaram, ativar relacionamento
    if (updated.status === ContractStatus.SIGNED && updated.relationshipId) {
      await this.prisma.supplierBrandRelationship.update({
        where: { id: updated.relationshipId },
        data: {
          status: 'ACTIVE',
          activatedAt: new Date(),
        },
      });
    }

    return updated;
  }

  /**
   * Cancelar contrato
   */
  async cancelContract(contractId: string, userId: string, reason?: string) {
    const contract = await this.prisma.supplierContract.findUnique({
      where: { id: contractId },
    });

    if (!contract) {
      throw new NotFoundException('Contrato não encontrado');
    }

    if (contract.status === ContractStatus.SIGNED) {
      throw new BadRequestException(
        'Contratos já assinados não podem ser cancelados diretamente',
      );
    }

    if (contract.status === ContractStatus.CANCELLED) {
      throw new BadRequestException('Contrato já está cancelado');
    }

    const updated = await this.prisma.supplierContract.update({
      where: { id: contractId },
      data: {
        status: ContractStatus.CANCELLED,
      },
      include: {
        brand: { select: { tradeName: true, legalName: true } },
        supplier: { select: { tradeName: true, legalName: true } },
      },
    });

    this.logger.log(`Contrato ${contract.displayId} cancelado por ${userId}`);

    this.eventEmitter.emit(CONTRACT_CANCELLED, {
      contractId: contract.id,
      displayId: contract.displayId,
      brandId: contract.brandId,
      brandName: updated.brand?.tradeName || updated.brand?.legalName || '',
      supplierId: contract.supplierId,
      supplierName: updated.supplier?.tradeName || updated.supplier?.legalName || '',
      cancelledById: userId,
      cancelledByName: '',
      reason,
    });

    return updated;
  }

  /**
   * Listar contratos de uma marca
   */
  async findByBrand(brandId: string, filters: ContractFilterDto) {
    const where: Prisma.SupplierContractWhereInput = {
      brandId,
      ...(filters.type && { type: filters.type }),
      ...(filters.status && { status: filters.status }),
      ...(filters.supplierId && { supplierId: filters.supplierId }),
      ...(filters.relationshipId && { relationshipId: filters.relationshipId }),
      ...(filters.search && {
        OR: [
          { displayId: { contains: filters.search, mode: 'insensitive' } },
          { title: { contains: filters.search, mode: 'insensitive' } },
        ],
      }),
    };

    const [contracts, total] = await Promise.all([
      this.prisma.supplierContract.findMany({
        where,
        include: {
          supplier: { select: { tradeName: true, legalName: true, document: true } },
          brand: { select: { tradeName: true, legalName: true } },
          revisions: {
            where: { status: ContractRevisionStatus.PENDING },
            take: 1,
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: ((filters.page || 1) - 1) * (filters.limit || 10),
        take: filters.limit || 10,
      }),
      this.prisma.supplierContract.count({ where }),
    ]);

    return {
      data: contracts,
      meta: {
        total,
        page: filters.page || 1,
        limit: filters.limit || 10,
        totalPages: Math.ceil(total / (filters.limit || 10)),
      },
    };
  }

  /**
   * Listar contratos de um fornecedor
   */
  async findBySupplier(supplierId: string, filters: ContractFilterDto) {
    const where: Prisma.SupplierContractWhereInput = {
      supplierId,
      ...(filters.type && { type: filters.type }),
      ...(filters.status && { status: filters.status }),
      ...(filters.brandId && { brandId: filters.brandId }),
      ...(filters.relationshipId && { relationshipId: filters.relationshipId }),
      ...(filters.search && {
        OR: [
          { displayId: { contains: filters.search, mode: 'insensitive' } },
          { title: { contains: filters.search, mode: 'insensitive' } },
        ],
      }),
    };

    const [contracts, total] = await Promise.all([
      this.prisma.supplierContract.findMany({
        where,
        include: {
          brand: { select: { tradeName: true, legalName: true, document: true } },
          supplier: { select: { tradeName: true, legalName: true } },
          revisions: {
            where: { status: ContractRevisionStatus.PENDING },
            take: 1,
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: ((filters.page || 1) - 1) * (filters.limit || 10),
        take: filters.limit || 10,
      }),
      this.prisma.supplierContract.count({ where }),
    ]);

    return {
      data: contracts,
      meta: {
        total,
        page: filters.page || 1,
        limit: filters.limit || 10,
        totalPages: Math.ceil(total / (filters.limit || 10)),
      },
    };
  }

  /**
   * Buscar contrato por ID
   */
  async findById(contractId: string, userId?: string) {
    const contract = await this.prisma.supplierContract.findUnique({
      where: { id: contractId },
      include: {
        brand: {
          select: {
            id: true,
            tradeName: true,
            legalName: true,
            document: true,
            city: true,
            state: true,
          },
        },
        supplier: {
          select: {
            id: true,
            tradeName: true,
            legalName: true,
            document: true,
            city: true,
            state: true,
          },
        },
        brandSignedBy: { select: { name: true, email: true } },
        supplierSignedBy: { select: { name: true, email: true } },
        createdBy: { select: { name: true, email: true } },
        revisions: {
          include: {
            requestedBy: { select: { name: true, email: true } },
            respondedBy: { select: { name: true, email: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        amendments: {
          select: {
            id: true,
            displayId: true,
            title: true,
            status: true,
            createdAt: true,
          },
        },
        parentContract: {
          select: {
            id: true,
            displayId: true,
            title: true,
          },
        },
      },
    });

    if (!contract) {
      throw new NotFoundException('Contrato não encontrado');
    }

    // Verify user has access (belongs to brand or supplier company)
    if (userId) {
      const companyIds = [contract.brandId, contract.supplierId].filter(
        (id): id is string => id != null,
      );
      const isMember = await this.prisma.companyUser.findFirst({
        where: {
          userId,
          companyId: { in: companyIds },
        },
      });
      if (!isMember) {
        throw new ForbiddenException(
          'Você não tem acesso a este contrato',
        );
      }
    }

    return contract;
  }

  /**
   * Buscar contratos vencendo em X dias
   */
  async getExpiringContracts(days: number) {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + days);

    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    return this.prisma.supplierContract.findMany({
      where: {
        status: ContractStatus.SIGNED,
        validUntil: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: {
        brand: { select: { tradeName: true, legalName: true } },
        supplier: { select: { tradeName: true, legalName: true } },
      },
    });
  }

  /**
   * Marcar contratos expirados
   */
  async markExpiredContracts() {
    const now = new Date();

    const result = await this.prisma.supplierContract.updateMany({
      where: {
        status: ContractStatus.SIGNED,
        validUntil: {
          lt: now,
        },
      },
      data: {
        status: ContractStatus.EXPIRED,
      },
    });

    if (result.count > 0) {
      this.logger.log(`${result.count} contratos marcados como expirados`);
    }

    return result;
  }

  /**
   * Gerar ID amigável único (CTR-YYYYMMDD-XXXX)
   */
  async generateDisplayId(): Promise<string> {
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0].replace(/-/g, '');
    const prefix = `CTR-${dateStr}`;

    // Buscar último contrato do dia
    const lastContract = await this.prisma.supplierContract.findFirst({
      where: {
        displayId: {
          startsWith: prefix,
        },
      },
      orderBy: {
        displayId: 'desc',
      },
    });

    let sequence = 1;
    if (lastContract) {
      const lastSequence = parseInt(lastContract.displayId.split('-')[2], 10);
      sequence = lastSequence + 1;
    }

    return `${prefix}-${sequence.toString().padStart(4, '0')}`;
  }

  // ==================== LEGACY METHODS (Credential-based) ====================

  /**
   * Gera contrato em PDF para um credenciamento
   * @deprecated Use createContract() para novos contratos
   */
  async generateContract(credentialId: string, terms?: Record<string, any>) {
    // Buscar credential com dados necessários
    const credential = await this.prisma.supplierCredential.findUnique({
      where: { id: credentialId },
      include: {
        brand: true,
      },
    });

    // Verificar se já existe contrato
    const existingContract = await this.prisma.supplierContract.findUnique({
      where: { credentialId },
    });

    if (!credential) {
      throw new NotFoundException('Credenciamento não encontrado');
    }

    if (existingContract) {
      this.logger.log(
        `Contrato já existe para credential ${credentialId}, retornando existente`,
      );
      return existingContract;
    }

    // Gerar displayId
    const displayId = await this.generateDisplayId();

    // Preparar variáveis do template
    const variables = {
      brandName: credential.brand.legalName || credential.brand.tradeName,
      brandCnpj: this.formatCNPJ(credential.brand.document),
      brandAddress: this.formatAddress(credential.brand),
      supplierName: credential.legalName || credential.tradeName,
      supplierCnpj: this.formatCNPJ(credential.cnpj),
      supplierAddress: this.formatAddress(credential),
      date: new Date().toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      }),
      paymentTerms: terms?.paymentTerms || DEFAULT_PAYMENT_TERMS,
      penaltyRate: terms?.penaltyRate || DEFAULT_PENALTY_RATE,
    };

    // Substituir variáveis no template
    let contractText = DEFAULT_CONTRACT_TEMPLATE;
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      contractText = contractText.replace(regex, value);
    });

    // Gerar PDF
    const fileName = `${displayId}.pdf`;
    const filePath = path.join(this.uploadsPath, fileName);

    await this.generatePDF(contractText, filePath);

    // Calcular hash do documento
    const documentHash = await this.calculateFileHash(filePath);

    // Criar registro do contrato
    const contract = await this.prisma.supplierContract.create({
      data: {
        displayId,
        credentialId,
        templateId: 'default',
        templateVersion: '1.0',
        documentUrl: `/uploads/contracts/${fileName}`,
        documentHash,
        terms: terms as any,
        // Marca assina automaticamente (pode ser alterado futuramente)
        brandSignedAt: new Date(),
        brandSignedById: credential.brandId,
        brandSignatureIp: 'AUTO',
      },
    });

    // Atualizar status do credenciamento
    await this.updateCredentialStatus(
      credentialId,
      SupplierCredentialStatus.CONTRACT_PENDING,
      'Contrato gerado e aguardando assinatura da facção',
    );

    this.logger.log(
      `Contrato gerado com sucesso: ${contract.id} para credential ${credentialId}`,
    );

    return contract;
  }

  /**
   * Assinatura do contrato pela facção (fluxo de credential)
   * @deprecated Use signAsSupplier() para novos contratos
   */
  async signContract(
    credentialId: string,
    supplierId: string,
    ipAddress: string,
  ) {
    // Buscar contrato
    const contract = await this.prisma.supplierContract.findUnique({
      where: { credentialId },
      include: {
        credential: true,
      },
    });

    if (!contract) {
      throw new NotFoundException(
        'Contrato não encontrado. Gere o contrato primeiro.',
      );
    }

    // Verificar se já foi assinado
    if (contract.supplierSignedAt) {
      throw new BadRequestException('Contrato já foi assinado');
    }

    // Atualizar assinatura
    await this.prisma.supplierContract.update({
      where: { id: contract.id },
      data: {
        supplierSignedAt: new Date(),
        supplierSignedById: supplierId,
        supplierSignatureIp: ipAddress,
        status: ContractStatus.SIGNED,
      },
    });

    // Atualizar status do credenciamento para CONTRACT_SIGNED
    await this.updateCredentialStatus(
      credentialId,
      SupplierCredentialStatus.CONTRACT_SIGNED,
      'Contrato assinado pela facção',
    );

    // Ativar fornecedor automaticamente após assinatura
    await this.activateSupplier(credentialId);

    this.logger.log(
      `Contrato ${contract.id} assinado por ${supplierId} (IP: ${ipAddress})`,
    );

    return {
      success: true,
      signedAt: new Date(),
    };
  }

  /**
   * Buscar contrato por credentialId
   * @deprecated Use findById() para novos contratos
   */
  async getContract(credentialId: string) {
    const contract = await this.prisma.supplierContract.findUnique({
      where: { credentialId },
      include: {
        credential: {
          include: {
            brand: {
              select: {
                tradeName: true,
                legalName: true,
                document: true,
              },
            },
          },
        },
      },
    });

    if (!contract) {
      throw new NotFoundException('Contrato não encontrado');
    }

    return contract;
  }

  // ==================== RELATIONSHIP-BASED METHODS (N:M) ====================

  /**
   * Gera contrato para um relacionamento marca-facção
   * (Arquitetura N:M)
   * @deprecated Use createContract() com relationshipId
   */
  async generateContractForRelationship(
    relationshipId: string,
    terms?: Record<string, any>,
  ) {
    // Buscar relacionamento com supplier e brand
    const relationship = await this.prisma.supplierBrandRelationship.findUnique(
      {
        where: { id: relationshipId },
        include: {
          supplier: true,
          brand: true,
        },
      },
    );

    if (!relationship) {
      throw new NotFoundException('Relacionamento não encontrado');
    }

    // Verificar se já existe contrato SERVICE_AGREEMENT para este relacionamento
    const existingContract = await this.prisma.supplierContract.findFirst({
      where: {
        relationshipId,
        type: ContractType.SERVICE_AGREEMENT,
      },
    });

    if (existingContract) {
      this.logger.log(
        `Contrato já existe para relationship ${relationshipId}, retornando existente`,
      );
      return existingContract;
    }

    // Gerar displayId
    const displayId = await this.generateDisplayId();

    // Preparar variáveis do template
    const variables = {
      brandName: relationship.brand.legalName || relationship.brand.tradeName,
      brandCnpj: this.formatCNPJ(relationship.brand.document),
      brandAddress: this.formatAddress(relationship.brand),
      supplierName:
        relationship.supplier.legalName || relationship.supplier.tradeName,
      supplierCnpj: this.formatCNPJ(relationship.supplier.document),
      supplierAddress: this.formatAddress(relationship.supplier),
      date: new Date().toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      }),
      paymentTerms: terms?.paymentTerms || DEFAULT_PAYMENT_TERMS,
      penaltyRate: terms?.penaltyRate || DEFAULT_PENALTY_RATE,
    };

    // Substituir variáveis no template
    let contractText = DEFAULT_CONTRACT_TEMPLATE;
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      contractText = contractText.replace(regex, String(value));
    });

    // Gerar PDF
    const fileName = `contract-${displayId}.pdf`;
    const filePath = path.join(this.uploadsPath, fileName);

    await this.generatePDF(contractText, filePath);

    // Calcular hash do documento
    const fileBuffer = fs.readFileSync(filePath);
    const documentHash = crypto
      .createHash('sha256')
      .update(fileBuffer)
      .digest('hex');

    const documentUrl = `/uploads/contracts/${fileName}`;

    // Criar registro do contrato
    const contract = await this.prisma.supplierContract.create({
      data: {
        displayId,
        relationshipId,
        supplierId: relationship.supplierId,
        brandId: relationship.brandId,
        type: ContractType.SERVICE_AGREEMENT,
        documentUrl,
        documentHash,
        terms: terms as any,
      },
    });

    this.logger.log(
      `Contrato gerado para relationship ${relationshipId}: ${documentUrl}`,
    );

    return contract;
  }

  /**
   * Assinar contrato de um relacionamento
   * @deprecated Use signAsSupplier() para novos contratos
   */
  async signContractForRelationship(
    relationshipId: string,
    supplierId: string,
    ipAddress: string,
  ) {
    // Buscar contrato
    const contract = await this.prisma.supplierContract.findFirst({
      where: {
        relationshipId,
        type: ContractType.SERVICE_AGREEMENT,
      },
    });

    if (!contract) {
      throw new NotFoundException(
        'Contrato não encontrado. Gere o contrato primeiro.',
      );
    }

    // Verificar se já foi assinado
    if (contract.supplierSignedAt) {
      throw new BadRequestException('Contrato já foi assinado');
    }

    // Atualizar assinatura
    await this.prisma.supplierContract.update({
      where: { id: contract.id },
      data: {
        supplierSignedAt: new Date(),
        supplierSignedById: supplierId,
        supplierSignatureIp: ipAddress,
        status: ContractStatus.SIGNED,
      },
    });

    // Atualizar status do relacionamento para ACTIVE
    await this.prisma.supplierBrandRelationship.update({
      where: { id: relationshipId },
      data: {
        status: 'ACTIVE',
        activatedAt: new Date(),
      },
    });

    // Criar histórico
    await this.prisma.relationshipStatusHistory.create({
      data: {
        relationshipId,
        status: 'ACTIVE',
        notes: 'Contrato assinado pelo fornecedor',
        changedById: supplierId,
      },
    });

    this.logger.log(
      `Contrato do relationship ${relationshipId} assinado por supplier ${supplierId}`,
    );

    return contract;
  }

  /**
   * Buscar contrato por relacionamento
   * @deprecated Use findById() para novos contratos
   */
  async getContractByRelationship(relationshipId: string) {
    const contract = await this.prisma.supplierContract.findFirst({
      where: {
        relationshipId,
        type: ContractType.SERVICE_AGREEMENT,
      },
      include: {
        relationship: {
          include: {
            brand: {
              select: {
                tradeName: true,
                legalName: true,
                document: true,
              },
            },
            supplier: {
              select: {
                tradeName: true,
                legalName: true,
                document: true,
              },
            },
          },
        },
      },
    });

    if (!contract) {
      throw new NotFoundException('Contrato não encontrado');
    }

    return contract;
  }

  // ==================== PRIVATE HELPERS ====================

  /**
   * Gera PDF usando PDFKit
   */
  private async generatePDF(
    text: string,
    outputPath: string,
    title?: string,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margins: {
            top: 50,
            bottom: 50,
            left: 50,
            right: 50,
          },
        });

        const stream = fs.createWriteStream(outputPath);

        doc.pipe(stream);

        // Cabeçalho
        doc
          .fontSize(16)
          .font('Helvetica-Bold')
          .text(title || 'CONTRATO DE PRESTAÇÃO DE SERVIÇOS', { align: 'center' })
          .moveDown();

        // Corpo do contrato
        doc.fontSize(10).font('Helvetica').text(text, {
          align: 'justify',
          lineGap: 2,
        });

        // Rodapé
        doc
          .fontSize(8)
          .text(
            `\n\nDocumento gerado eletronicamente pela plataforma TexLink em ${new Date().toLocaleString('pt-BR')}`,
            { align: 'center' },
          );

        doc.end();

        stream.on('finish', resolve);
        stream.on('error', reject);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Calcula hash SHA-256 do arquivo
   */
  private async calculateFileHash(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256');
      const stream = fs.createReadStream(filePath);

      stream.on('data', (data) => hash.update(data));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', reject);
    });
  }

  /**
   * Atualiza status do credenciamento
   */
  private async updateCredentialStatus(
    credentialId: string,
    newStatus: SupplierCredentialStatus,
    reason: string,
  ) {
    const credential = await this.prisma.supplierCredential.findUnique({
      where: { id: credentialId },
    });

    if (!credential) return;

    await this.prisma.supplierCredential.update({
      where: { id: credentialId },
      data: { status: newStatus },
    });

    await this.prisma.credentialStatusHistory.create({
      data: {
        credentialId,
        fromStatus: credential.status,
        toStatus: newStatus,
        performedById: 'SYSTEM',
        reason,
      },
    });
  }

  /**
   * Ativa fornecedor após assinatura
   */
  private async activateSupplier(credentialId: string) {
    await this.updateCredentialStatus(
      credentialId,
      SupplierCredentialStatus.ACTIVE,
      'Fornecedor ativado após assinatura do contrato',
    );

    this.logger.log(`Fornecedor ${credentialId} ativado com sucesso`);
  }

  /**
   * Formata CNPJ para exibição
   */
  private formatCNPJ(cnpj: string): string {
    const clean = cnpj.replace(/\D/g, '');
    if (clean.length !== 14) return cnpj;

    return clean.replace(
      /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
      '$1.$2.$3/$4-$5',
    );
  }

  /**
   * Formata endereço para exibição
   */
  private formatAddress(entity: any): string {
    const parts = [
      entity.street,
      entity.number,
      entity.complement,
      entity.neighborhood,
      entity.city,
      entity.state,
      entity.zipCode,
    ].filter(Boolean);

    return parts.join(', ');
  }
}
