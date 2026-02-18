import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCompanyDto, UpdateCompanyDto } from './dto';
import { CompanyType, CompanyUserRole } from '@prisma/client';

@Injectable()
export class CompaniesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateCompanyDto, userId: string) {
    // Check if document (CNPJ/CPF) already exists
    const existing = await this.prisma.company.findUnique({
      where: { document: dto.document },
    });

    if (existing) {
      throw new ConflictException('Já existe uma empresa com este CNPJ/CPF');
    }

    // Create company and associate user as owner
    const company = await this.prisma.company.create({
      data: {
        ...dto,
        companyUsers: {
          create: {
            userId,
            role: CompanyUserRole.OWNER,
          },
        },
        // If it's a supplier, create the supplier profile
        ...(dto.type === CompanyType.SUPPLIER && {
          supplierProfile: {
            create: {
              onboardingPhase: 1,
            },
          },
        }),
      },
      include: {
        companyUsers: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
        supplierProfile: dto.type === CompanyType.SUPPLIER,
      },
    });

    return company;
  }

  async findMyCompanies(userId: string) {
    return this.prisma.company.findMany({
      where: {
        companyUsers: {
          some: { userId },
        },
      },
      include: {
        companyUsers: {
          where: { userId },
          select: { role: true },
        },
        supplierProfile: true,
      },
    });
  }

  async findById(id: string, userId: string) {
    const company = await this.prisma.company.findUnique({
      where: { id },
      include: {
        companyUsers: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
        supplierProfile: true,
        documents: true,
      },
    });

    if (!company) {
      throw new NotFoundException('Empresa não encontrada');
    }

    // Verify user belongs to this company
    const isMember = company.companyUsers.some(
      (cu) => cu.user.id === userId,
    );
    if (!isMember) {
      throw new ForbiddenException(
        'You do not have access to this company',
      );
    }

    return company;
  }

  async update(id: string, dto: UpdateCompanyDto, userId: string) {
    // Check if user is owner or manager
    const companyUser = await this.prisma.companyUser.findUnique({
      where: {
        userId_companyId: { userId, companyId: id },
      },
    });

    if (!companyUser || companyUser.role === CompanyUserRole.MEMBER) {
      throw new ForbiddenException(
        'You do not have permission to update this company',
      );
    }

    return this.prisma.company.update({
      where: { id },
      data: dto,
    });
  }

  async findAll(type?: CompanyType) {
    return this.prisma.company.findMany({
      where: type ? { type } : undefined,
      include: {
        supplierProfile: true,
        _count: {
          select: {
            ordersAsBrand: true,
            ordersAsSupplier: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
