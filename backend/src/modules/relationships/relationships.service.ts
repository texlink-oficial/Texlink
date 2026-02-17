import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  SupplierBrandRelationship,
  RelationshipStatus,
  UserRole,
  CompanyType,
  CompanyStatus,
  Prisma,
} from '@prisma/client';
import { CreateRelationshipDto } from './dto/create-relationship.dto';
import { UpdateRelationshipDto } from './dto/update-relationship.dto';
import { RelationshipActionDto } from './dto/relationship-action.dto';

interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  brandId?: string;
  supplierId?: string;
}

@Injectable()
export class RelationshipsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Criar novo relacionamento entre facção e marca
   * Marca credencia facção existente do pool
   */
  async create(
    dto: CreateRelationshipDto,
    user: AuthUser,
  ): Promise<SupplierBrandRelationship> {
    // Verificar permissão
    if (user.role === UserRole.BRAND && user.brandId !== dto.brandId) {
      throw new ForbiddenException(
        'Você só pode credenciar fornecedores para sua própria marca',
      );
    }

    if (user.role !== UserRole.ADMIN && user.role !== UserRole.BRAND) {
      throw new ForbiddenException(
        'Apenas admin ou marca podem criar relacionamentos',
      );
    }

    // Verificar que supplier existe e completou onboarding
    const supplier = await this.prisma.company.findUnique({
      where: { id: dto.supplierId },
      include: {
        supplierProfile: true,
        onboarding: true,
      },
    });

    if (!supplier || supplier.type !== CompanyType.SUPPLIER) {
      throw new NotFoundException('Fornecedor não encontrado');
    }

    const onboardingComplete =
      supplier.supplierProfile?.onboardingComplete ||
      supplier.onboarding?.isCompleted;

    if (!onboardingComplete) {
      throw new BadRequestException(
        'Fornecedor ainda não completou o onboarding',
      );
    }

    // Verificar que brand existe
    const brand = await this.prisma.company.findUnique({
      where: { id: dto.brandId },
    });

    if (!brand) {
      throw new NotFoundException('Marca não encontrada');
    }

    // Verificar que relacionamento não existe
    const existing = await this.prisma.supplierBrandRelationship.findUnique({
      where: {
        supplierId_brandId: {
          supplierId: dto.supplierId,
          brandId: dto.brandId,
        },
      },
    });

    if (existing) {
      throw new ConflictException(
        'Já existe um relacionamento entre esta facção e marca',
      );
    }

    // Criar relacionamento
    const relationship = await this.prisma.supplierBrandRelationship.create({
      data: {
        supplierId: dto.supplierId,
        brandId: dto.brandId,
        status: RelationshipStatus.CONTRACT_PENDING,
        initiatedBy: user.id,
        initiatedByRole: user.role,
        internalCode: dto.internalCode,
        notes: dto.notes,
        priority: dto.priority || 0,
        updatedAt: new Date(),
      },
      include: {
        supplier: {
          include: {
            supplierProfile: true,
            onboarding: true,
          },
        },
        brand: true,
        initiatedByUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Criar histórico
    await this.prisma.relationshipStatusHistory.create({
      data: {
        relationshipId: relationship.id,
        status: RelationshipStatus.CONTRACT_PENDING,
        changedById: user.id,
        notes: `Relacionamento criado por ${user.name} (${user.role})`,
      },
    });

    return relationship;
  }

  /**
   * Listar relacionamentos da marca (fornecedores credenciados)
   */
  async findByBrand(
    brandId: string,
    user: AuthUser,
  ): Promise<SupplierBrandRelationship[]> {
    // Verificar permissão
    if (user.role === UserRole.BRAND && user.brandId !== brandId) {
      throw new ForbiddenException(
        'Você só pode ver fornecedores da sua própria marca',
      );
    }

    if (user.role !== UserRole.ADMIN && user.role !== UserRole.BRAND) {
      throw new ForbiddenException(
        'Apenas admin ou marca podem listar relacionamentos',
      );
    }

    return this.prisma.supplierBrandRelationship.findMany({
      where: { brandId },
      include: {
        supplier: {
          include: {
            supplierProfile: true,
            onboarding: {
              include: {
                documents: true,
              },
            },
          },
        },
        contracts: true,
        statusHistory: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    });
  }

  /**
   * Listar relacionamentos do fornecedor (marcas para as quais trabalha)
   */
  async findBySupplier(
    supplierId: string,
    user: AuthUser,
  ): Promise<SupplierBrandRelationship[]> {
    // Verificar permissão
    if (user.role === UserRole.SUPPLIER && user.supplierId !== supplierId) {
      throw new ForbiddenException(
        'Você só pode ver seus próprios relacionamentos',
      );
    }

    if (user.role !== UserRole.ADMIN && user.role !== UserRole.SUPPLIER) {
      throw new ForbiddenException(
        'Apenas admin ou fornecedor podem listar relacionamentos',
      );
    }

    return this.prisma.supplierBrandRelationship.findMany({
      where: { supplierId },
      include: {
        brand: true,
        contracts: true,
        statusHistory: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Listar facções disponíveis para marca credenciar
   * (Facções com onboarding completo, sem relacionamento com esta marca)
   */
  async findAvailableForBrand(brandId: string, user: AuthUser) {
    // Verificar permissão
    if (user.role === UserRole.BRAND && user.brandId !== brandId) {
      throw new ForbiddenException();
    }

    if (user.role !== UserRole.ADMIN && user.role !== UserRole.BRAND) {
      throw new ForbiddenException(
        'Apenas admin ou marca podem ver facções disponíveis',
      );
    }

    // Buscar IDs de suppliers já credenciados para esta marca
    const existingRelationships =
      await this.prisma.supplierBrandRelationship.findMany({
        where: { brandId },
        select: { supplierId: true },
      });

    const existingSupplierIds = existingRelationships.map((r) => r.supplierId);

    // Buscar suppliers com onboarding completo (via SupplierProfile OU SupplierOnboarding),
    // excluindo os já credenciados
    return this.prisma.company.findMany({
      where: {
        type: CompanyType.SUPPLIER,
        status: CompanyStatus.ACTIVE,
        id: {
          notIn: existingSupplierIds,
        },
        OR: [
          {
            supplierProfile: {
              onboardingComplete: true,
            },
          },
          {
            onboarding: {
              isCompleted: true,
            },
          },
        ],
      },
      include: {
        supplierProfile: true,
        onboarding: {
          include: {
            documents: true,
          },
        },
      },
      orderBy: { tradeName: 'asc' },
    });
  }

  /**
   * Buscar um relacionamento específico
   */
  async findOne(
    relationshipId: string,
    user: AuthUser,
  ): Promise<SupplierBrandRelationship> {
    const relationship = await this.prisma.supplierBrandRelationship.findUnique(
      {
        where: { id: relationshipId },
        include: {
          supplier: {
            include: {
              supplierProfile: true,
              onboarding: {
                include: {
                  documents: true,
                },
              },
            },
          },
          brand: true,
          contracts: true,
          specificDocuments: true,
          statusHistory: {
            include: {
              changedBy: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
            orderBy: { createdAt: 'desc' },
          },
          initiatedByUser: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
    );

    if (!relationship) {
      throw new NotFoundException('Relacionamento não encontrado');
    }

    // Verificar permissão
    const canView =
      user.role === UserRole.ADMIN ||
      (user.role === UserRole.BRAND && user.brandId === relationship.brandId) ||
      (user.role === UserRole.SUPPLIER &&
        user.supplierId === relationship.supplierId);

    if (!canView) {
      throw new ForbiddenException(
        'Você não tem permissão para visualizar este relacionamento',
      );
    }

    return relationship;
  }

  /**
   * Atualizar relacionamento
   */
  async update(
    relationshipId: string,
    dto: UpdateRelationshipDto,
    user: AuthUser,
  ): Promise<SupplierBrandRelationship> {
    const relationship = await this.findOne(relationshipId, user);

    // Apenas marca ou admin pode atualizar
    if (
      user.role !== UserRole.ADMIN &&
      (user.role !== UserRole.BRAND || user.brandId !== relationship.brandId)
    ) {
      throw new ForbiddenException(
        'Apenas admin ou a marca pode atualizar o relacionamento',
      );
    }

    return this.prisma.supplierBrandRelationship.update({
      where: { id: relationshipId },
      data: {
        ...dto,
        updatedAt: new Date(),
      },
      include: {
        supplier: {
          include: {
            supplierProfile: true,
          },
        },
        brand: true,
        contracts: true,
      },
    });
  }

  /**
   * Ativar relacionamento (após contrato assinado)
   */
  async activate(
    relationshipId: string,
    user: AuthUser,
  ): Promise<SupplierBrandRelationship> {
    // Buscar com contract incluído
    const relationship = await this.prisma.supplierBrandRelationship.findUnique(
      {
        where: { id: relationshipId },
        include: {
          contracts: true,
          supplier: {
            include: {
              supplierProfile: true,
            },
          },
          brand: true,
        },
      },
    );

    if (!relationship) {
      throw new NotFoundException('Relacionamento não encontrado');
    }

    // Verificar permissão
    if (
      user.role !== UserRole.ADMIN &&
      (user.role !== UserRole.BRAND || user.brandId !== relationship.brandId)
    ) {
      throw new ForbiddenException();
    }

    // Verificar que ao menos um contrato foi assinado
    const hasSignedContract = relationship.contracts?.some(
      (c) => c.supplierSignedAt != null,
    );
    if (!hasSignedContract) {
      throw new BadRequestException(
        'Contrato ainda não foi assinado pelo fornecedor',
      );
    }

    if (relationship.status === RelationshipStatus.ACTIVE) {
      throw new BadRequestException('Relacionamento já está ativo');
    }

    // Ativar
    const updated = await this.prisma.supplierBrandRelationship.update({
      where: { id: relationshipId },
      data: {
        status: RelationshipStatus.ACTIVE,
        activatedAt: new Date(),
        updatedAt: new Date(),
      },
      include: {
        supplier: {
          include: {
            supplierProfile: true,
          },
        },
        brand: true,
        contracts: true,
      },
    });

    // Criar histórico
    await this.prisma.relationshipStatusHistory.create({
      data: {
        relationshipId: relationshipId,
        status: RelationshipStatus.ACTIVE,
        changedById: user.id,
        notes: 'Relacionamento ativado após assinatura do contrato',
      },
    });

    return updated;
  }

  /**
   * Suspender relacionamento
   */
  async suspend(
    relationshipId: string,
    dto: RelationshipActionDto,
    user: AuthUser,
  ): Promise<SupplierBrandRelationship> {
    const relationship = await this.findOne(relationshipId, user);

    // Verificar permissão
    if (
      user.role !== UserRole.ADMIN &&
      (user.role !== UserRole.BRAND || user.brandId !== relationship.brandId)
    ) {
      throw new ForbiddenException();
    }

    if (relationship.status === RelationshipStatus.SUSPENDED) {
      throw new BadRequestException('Relacionamento já está suspenso');
    }

    if (relationship.status === RelationshipStatus.TERMINATED) {
      throw new BadRequestException('Relacionamento está encerrado');
    }

    const updated = await this.prisma.supplierBrandRelationship.update({
      where: { id: relationshipId },
      data: {
        status: RelationshipStatus.SUSPENDED,
        suspendedAt: new Date(),
        updatedAt: new Date(),
      },
      include: {
        supplier: {
          include: {
            supplierProfile: true,
          },
        },
        brand: true,
        contracts: true,
      },
    });

    await this.prisma.relationshipStatusHistory.create({
      data: {
        relationshipId: relationshipId,
        status: RelationshipStatus.SUSPENDED,
        changedById: user.id,
        notes: `Suspenso: ${dto.reason}`,
      },
    });

    return updated;
  }

  /**
   * Reativar relacionamento suspenso
   */
  async reactivate(
    relationshipId: string,
    user: AuthUser,
  ): Promise<SupplierBrandRelationship> {
    const relationship = await this.findOne(relationshipId, user);

    // Verificar permissão
    if (
      user.role !== UserRole.ADMIN &&
      (user.role !== UserRole.BRAND || user.brandId !== relationship.brandId)
    ) {
      throw new ForbiddenException();
    }

    if (relationship.status !== RelationshipStatus.SUSPENDED) {
      throw new BadRequestException('Relacionamento não está suspenso');
    }

    const updated = await this.prisma.supplierBrandRelationship.update({
      where: { id: relationshipId },
      data: {
        status: RelationshipStatus.ACTIVE,
        suspendedAt: null,
        updatedAt: new Date(),
      },
      include: {
        supplier: {
          include: {
            supplierProfile: true,
          },
        },
        brand: true,
        contracts: true,
      },
    });

    await this.prisma.relationshipStatusHistory.create({
      data: {
        relationshipId: relationshipId,
        status: RelationshipStatus.ACTIVE,
        changedById: user.id,
        notes: 'Relacionamento reativado',
      },
    });

    return updated;
  }

  /**
   * Encerrar relacionamento (permanente)
   */
  async terminate(
    relationshipId: string,
    dto: RelationshipActionDto,
    user: AuthUser,
  ): Promise<SupplierBrandRelationship> {
    const relationship = await this.findOne(relationshipId, user);

    // Verificar permissão
    if (
      user.role !== UserRole.ADMIN &&
      (user.role !== UserRole.BRAND || user.brandId !== relationship.brandId)
    ) {
      throw new ForbiddenException();
    }

    if (relationship.status === RelationshipStatus.TERMINATED) {
      throw new BadRequestException('Relacionamento já está encerrado');
    }

    const updated = await this.prisma.supplierBrandRelationship.update({
      where: { id: relationshipId },
      data: {
        status: RelationshipStatus.TERMINATED,
        terminatedAt: new Date(),
        updatedAt: new Date(),
      },
      include: {
        supplier: {
          include: {
            supplierProfile: true,
          },
        },
        brand: true,
        contracts: true,
      },
    });

    await this.prisma.relationshipStatusHistory.create({
      data: {
        relationshipId: relationshipId,
        status: RelationshipStatus.TERMINATED,
        changedById: user.id,
        notes: `Encerrado: ${dto.reason}`,
      },
    });

    return updated;
  }
}
