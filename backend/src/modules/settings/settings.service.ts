import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CompanyType } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import {
  UpdateCompanyDataDto,
  UpdateBankAccountDto,
  UpdateNotificationSettingsDto,
  UpdateCapacityDto,
  ChangePasswordDto,
  CreateSuggestionDto,
} from './dto';
import type { StorageProvider } from '../upload/storage.provider';
import { UploadedFile, STORAGE_PROVIDER } from '../upload/storage.provider';

const ALLOWED_LOGO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_LOGO_SIZE = 2 * 1024 * 1024; // 2MB

@Injectable()
export class SettingsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(STORAGE_PROVIDER) private readonly storage: StorageProvider,
  ) {}

  // Get company for any user (BRAND or SUPPLIER)
  // Filters by matching company type to user role to avoid returning a wrong company
  private async getUserCompanyId(userId: string): Promise<string> {
    // First get the user's role to filter by matching company type
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    // Build where clause: filter by company type matching user role when applicable
    const companyTypeFilter =
      user?.role === 'BRAND' || user?.role === 'SUPPLIER'
        ? { company: { type: user.role as CompanyType } }
        : {};

    const companyUser = await this.prisma.companyUser.findFirst({
      where: {
        userId,
        ...companyTypeFilter,
      },
      orderBy: { createdAt: 'asc' },
    });

    if (!companyUser) {
      throw new ForbiddenException(
        'Você deve estar associado a uma empresa',
      );
    }

    return companyUser.companyId;
  }

  // Get supplier company for user (capacity-only)
  private async getSupplierCompanyId(userId: string): Promise<string> {
    const companyUser = await this.prisma.companyUser.findFirst({
      where: {
        userId,
        company: { type: CompanyType.SUPPLIER },
      },
    });

    if (!companyUser) {
      throw new ForbiddenException(
        'Você deve estar associado a uma empresa fornecedora',
      );
    }

    return companyUser.companyId;
  }

  // ==================== COMPANY DATA ====================

  async getCompanyData(userId: string) {
    const companyId = await this.getUserCompanyId(userId);

    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: {
        id: true,
        legalName: true,
        tradeName: true,
        document: true,
        phone: true,
        email: true,
        city: true,
        state: true,
        logoUrl: true,
        street: true,
        number: true,
        complement: true,
        neighborhood: true,
        zipCode: true,
      },
    });

    if (!company) {
      throw new NotFoundException('Empresa não encontrada');
    }

    return {
      ...company,
      logoUrl: await this.storage.resolveUrl?.(company.logoUrl) ?? company.logoUrl,
    };
  }

  async updateCompanyData(userId: string, dto: UpdateCompanyDataDto) {
    const companyId = await this.getUserCompanyId(userId);

    // Normalize zipCode
    if (dto.zipCode) {
      dto.zipCode = dto.zipCode.replace(/\D/g, '');
    }

    const updated = await this.prisma.company.update({
      where: { id: companyId },
      data: dto,
      select: {
        id: true,
        legalName: true,
        tradeName: true,
        document: true,
        phone: true,
        email: true,
        city: true,
        state: true,
        logoUrl: true,
        street: true,
        number: true,
        complement: true,
        neighborhood: true,
        zipCode: true,
      },
    });

    return {
      ...updated,
      logoUrl: await this.storage.resolveUrl?.(updated.logoUrl) ?? updated.logoUrl,
    };
  }

  async uploadLogo(userId: string, file: UploadedFile) {
    const companyId = await this.getUserCompanyId(userId);

    // Validate file
    if (!ALLOWED_LOGO_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        `Tipo de arquivo inválido. Permitidos: ${ALLOWED_LOGO_TYPES.join(', ')}`,
      );
    }

    if (file.size > MAX_LOGO_SIZE) {
      throw new BadRequestException(
        `Arquivo muito grande. Máximo: ${MAX_LOGO_SIZE / (1024 * 1024)}MB`,
      );
    }

    // Get current logo to delete
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { logoUrl: true },
    });

    // Delete old logo if exists
    if (company?.logoUrl) {
      const oldKey = company.logoUrl.split('/uploads/')[1];
      if (oldKey) {
        await this.storage.delete(oldKey).catch(() => {
          /* ignore */
        });
      }
    }

    // Upload new logo
    const { url } = await this.storage.upload(file, `logos/${companyId}`);

    // Update company
    await this.prisma.company.update({
      where: { id: companyId },
      data: { logoUrl: url },
    });

    const resolvedUrl = await this.storage.resolveUrl?.(url) ?? url;
    return { logoUrl: resolvedUrl };
  }

  // ==================== BANK ACCOUNT ====================

  async getBankAccount(userId: string) {
    const companyId = await this.getUserCompanyId(userId);

    const bankAccount = await this.prisma.bankAccount.findUnique({
      where: { companyId },
    });

    return bankAccount;
  }

  async updateBankAccount(userId: string, dto: UpdateBankAccountDto) {
    const companyId = await this.getUserCompanyId(userId);

    // Normalize document
    dto.holderDocument = dto.holderDocument.replace(/\D/g, '');

    const existing = await this.prisma.bankAccount.findUnique({
      where: { companyId },
    });

    if (existing) {
      return this.prisma.bankAccount.update({
        where: { companyId },
        data: dto,
      });
    }

    return this.prisma.bankAccount.create({
      data: {
        companyId,
        ...dto,
      },
    });
  }

  // ==================== CAPACITY ====================

  async getCapacitySettings(userId: string) {
    const companyId = await this.getSupplierCompanyId(userId);

    const profile = await this.prisma.supplierProfile.findUnique({
      where: { companyId },
      select: {
        dailyCapacity: true,
        currentOccupancy: true,
        activeWorkers: true,
        hoursPerDay: true,
        productTypes: true,
        specialties: true,
      },
    });

    if (!profile) {
      // Return default values
      return {
        dailyCapacity: null,
        currentOccupancy: 0,
        activeWorkers: null,
        hoursPerDay: null,
        productTypes: [],
        specialties: [],
      };
    }

    return profile;
  }

  async updateCapacitySettings(userId: string, dto: UpdateCapacityDto) {
    const companyId = await this.getSupplierCompanyId(userId);

    const existing = await this.prisma.supplierProfile.findUnique({
      where: { companyId },
    });

    if (existing) {
      return this.prisma.supplierProfile.update({
        where: { companyId },
        data: dto,
        select: {
          dailyCapacity: true,
          currentOccupancy: true,
          activeWorkers: true,
          hoursPerDay: true,
          productTypes: true,
          specialties: true,
        },
      });
    }

    return this.prisma.supplierProfile.create({
      data: {
        companyId,
        ...dto,
      },
      select: {
        dailyCapacity: true,
        currentOccupancy: true,
        activeWorkers: true,
        hoursPerDay: true,
        productTypes: true,
        specialties: true,
      },
    });
  }

  // ==================== NOTIFICATIONS ====================

  async getNotificationSettings(userId: string) {
    const companyId = await this.getUserCompanyId(userId);

    let settings = await this.prisma.notificationSettings.findUnique({
      where: { companyId },
    });

    // Create default settings if not exists
    if (!settings) {
      settings = await this.prisma.notificationSettings.create({
        data: { companyId },
      });
    }

    return settings;
  }

  async updateNotificationSettings(
    userId: string,
    dto: UpdateNotificationSettingsDto,
  ) {
    const companyId = await this.getUserCompanyId(userId);

    const existing = await this.prisma.notificationSettings.findUnique({
      where: { companyId },
    });

    if (existing) {
      return this.prisma.notificationSettings.update({
        where: { companyId },
        data: dto,
      });
    }

    return this.prisma.notificationSettings.create({
      data: {
        companyId,
        ...dto,
      },
    });
  }

  // ==================== SECURITY ====================

  async changePassword(userId: string, dto: ChangePasswordDto) {
    // Validate passwords match
    if (dto.newPassword !== dto.confirmPassword) {
      throw new BadRequestException('As senhas não coincidem');
    }

    // Get user
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, passwordHash: true },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(
      dto.currentPassword,
      user.passwordHash,
    );
    if (!isValidPassword) {
      throw new BadRequestException('Senha atual incorreta');
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(dto.newPassword, 12);

    // Update password
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: newPasswordHash,
        passwordChangedAt: new Date(),
      },
    });

    return { success: true, message: 'Senha alterada com sucesso' };
  }

  // ==================== SUGGESTIONS ====================

  async getSuggestions(userId: string) {
    const companyId = await this.getUserCompanyId(userId);

    return this.prisma.suggestion.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        category: true,
        title: true,
        description: true,
        status: true,
        adminNotes: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async createSuggestion(userId: string, dto: CreateSuggestionDto) {
    const companyId = await this.getUserCompanyId(userId);

    return this.prisma.suggestion.create({
      data: {
        companyId,
        userId,
        ...dto,
      },
      select: {
        id: true,
        category: true,
        title: true,
        description: true,
        status: true,
        createdAt: true,
      },
    });
  }
}
