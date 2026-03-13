import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CompanyType } from '@prisma/client';
import {
  CreateTemplateDto,
  UpdateTemplateDto,
  CreateFavoriteSupplierDto,
  UpdateFavoriteSupplierDto,
  CreatePaymentPresetDto,
  UpdatePaymentPresetDto,
} from './dto';

@Injectable()
export class FavoritesService {
  constructor(private prisma: PrismaService) {}

  // Helper to get user's brand company
  private async getBrandCompany(userId: string) {
    const companyUser = await this.prisma.companyUser.findFirst({
      where: {
        userId,
        company: { type: CompanyType.BRAND },
      },
      include: { company: true },
    });

    if (!companyUser) {
      throw new ForbiddenException(
        'You must have a brand company to use favorites',
      );
    }

    return companyUser.company;
  }

  // ==================== PRODUCT TEMPLATES ====================

  async getTemplates(userId: string) {
    const company = await this.getBrandCompany(userId);

    return this.prisma.productTemplate.findMany({
      where: {
        companyId: company.id,
        isActive: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getTemplateById(id: string, userId: string) {
    const company = await this.getBrandCompany(userId);

    const template = await this.prisma.productTemplate.findUnique({
      where: { id },
    });

    if (!template) {
      throw new NotFoundException('Template não encontrado');
    }

    if (template.companyId !== company.id) {
      throw new ForbiddenException('Você não tem acesso a este template');
    }

    return template;
  }

  async createTemplate(dto: CreateTemplateDto, userId: string) {
    const company = await this.getBrandCompany(userId);

    return this.prisma.productTemplate.create({
      data: {
        ...dto,
        companyId: company.id,
      },
    });
  }

  async updateTemplate(id: string, dto: UpdateTemplateDto, userId: string) {
    const template = await this.getTemplateById(id, userId);

    return this.prisma.productTemplate.update({
      where: { id: template.id },
      data: dto,
    });
  }

  async deleteTemplate(id: string, userId: string) {
    const template = await this.getTemplateById(id, userId);

    return this.prisma.productTemplate.update({
      where: { id: template.id },
      data: { isActive: false },
    });
  }

  // ==================== FAVORITE SUPPLIERS ====================

  async getFavoriteSuppliers(userId: string) {
    const company = await this.getBrandCompany(userId);

    return this.prisma.favoriteSupplier.findMany({
      where: { companyId: company.id },
      include: {
        supplier: {
          select: {
            id: true,
            tradeName: true,
            avgRating: true,
            city: true,
            state: true,
            supplierProfile: {
              select: {
                productTypes: true,
                dailyCapacity: true,
              },
            },
          },
        },
      },
      orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async addFavoriteSupplier(dto: CreateFavoriteSupplierDto, userId: string) {
    const company = await this.getBrandCompany(userId);

    // Check if supplier exists
    const supplier = await this.prisma.company.findUnique({
      where: { id: dto.supplierId },
    });

    if (!supplier || supplier.type !== CompanyType.SUPPLIER) {
      throw new NotFoundException('Facção não encontrada');
    }

    // Check if already favorited
    const existing = await this.prisma.favoriteSupplier.findUnique({
      where: {
        companyId_supplierId: {
          companyId: company.id,
          supplierId: dto.supplierId,
        },
      },
    });

    if (existing) {
      throw new ConflictException('Esta facção já está nos favoritos');
    }

    return this.prisma.favoriteSupplier.create({
      data: {
        companyId: company.id,
        supplierId: dto.supplierId,
        notes: dto.notes,
        priority: dto.priority ?? 0,
      },
      include: {
        supplier: {
          select: {
            id: true,
            tradeName: true,
            avgRating: true,
          },
        },
      },
    });
  }

  async updateFavoriteSupplier(
    supplierId: string,
    dto: UpdateFavoriteSupplierDto,
    userId: string,
  ) {
    const company = await this.getBrandCompany(userId);

    const favorite = await this.prisma.favoriteSupplier.findUnique({
      where: {
        companyId_supplierId: {
          companyId: company.id,
          supplierId,
        },
      },
    });

    if (!favorite) {
      throw new NotFoundException('Facção favorita não encontrada');
    }

    return this.prisma.favoriteSupplier.update({
      where: { id: favorite.id },
      data: dto,
    });
  }

  async removeFavoriteSupplier(supplierId: string, userId: string) {
    const company = await this.getBrandCompany(userId);

    const favorite = await this.prisma.favoriteSupplier.findUnique({
      where: {
        companyId_supplierId: {
          companyId: company.id,
          supplierId,
        },
      },
    });

    if (!favorite) {
      throw new NotFoundException('Facção favorita não encontrada');
    }

    return this.prisma.favoriteSupplier.delete({
      where: { id: favorite.id },
    });
  }

  async isFavoriteSupplier(
    supplierId: string,
    userId: string,
  ): Promise<boolean> {
    const company = await this.getBrandCompany(userId);

    const favorite = await this.prisma.favoriteSupplier.findUnique({
      where: {
        companyId_supplierId: {
          companyId: company.id,
          supplierId,
        },
      },
    });

    return !!favorite;
  }

  // ==================== PAYMENT TERMS PRESETS ====================

  async getPaymentPresets(userId: string) {
    const company = await this.getBrandCompany(userId);

    return this.prisma.paymentTermsPreset.findMany({
      where: { companyId: company.id },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async createPaymentPreset(dto: CreatePaymentPresetDto, userId: string) {
    const company = await this.getBrandCompany(userId);

    // If setting as default, unset others
    if (dto.isDefault) {
      await this.prisma.paymentTermsPreset.updateMany({
        where: { companyId: company.id },
        data: { isDefault: false },
      });
    }

    return this.prisma.paymentTermsPreset.create({
      data: {
        ...dto,
        companyId: company.id,
      },
    });
  }

  async updatePaymentPreset(
    id: string,
    dto: UpdatePaymentPresetDto,
    userId: string,
  ) {
    const company = await this.getBrandCompany(userId);

    const preset = await this.prisma.paymentTermsPreset.findUnique({
      where: { id },
    });

    if (!preset) {
      throw new NotFoundException('Configuração de pagamento não encontrada');
    }

    if (preset.companyId !== company.id) {
      throw new ForbiddenException('Você não tem acesso a esta configuração');
    }

    // If setting as default, unset others
    if (dto.isDefault) {
      await this.prisma.paymentTermsPreset.updateMany({
        where: {
          companyId: company.id,
          id: { not: id },
        },
        data: { isDefault: false },
      });
    }

    return this.prisma.paymentTermsPreset.update({
      where: { id },
      data: dto,
    });
  }

  async deletePaymentPreset(id: string, userId: string) {
    const company = await this.getBrandCompany(userId);

    const preset = await this.prisma.paymentTermsPreset.findUnique({
      where: { id },
    });

    if (!preset) {
      throw new NotFoundException('Configuração de pagamento não encontrada');
    }

    if (preset.companyId !== company.id) {
      throw new ForbiddenException('Você não tem acesso a esta configuração');
    }

    return this.prisma.paymentTermsPreset.delete({
      where: { id },
    });
  }
}
