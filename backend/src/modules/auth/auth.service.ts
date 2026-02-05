import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { RegisterDto, LoginDto, UpdateProfileDto } from './dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    // Check if email already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    // Check if document already exists (for SUPPLIER)
    if (dto.role === 'SUPPLIER' && dto.document) {
      const existingCompany = await this.prisma.company.findUnique({
        where: { document: dto.document },
      });
      if (existingCompany) {
        throw new ConflictException('CNPJ/CPF já cadastrado');
      }
    }

    // Hash password
    const passwordHash = await bcrypt.hash(dto.password, 10);

    // Create user
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        name: dto.name,
        role: dto.role,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    // For SUPPLIER: Create Company and SupplierProfile
    let company: { id: string } | null = null;
    if (dto.role === 'SUPPLIER') {
      company = await this.prisma.company.create({
        data: {
          legalName: dto.companyName || dto.name,
          tradeName: dto.companyName || dto.name,
          document: dto.document || `PENDING_${user.id}`,
          type: 'SUPPLIER',
          city: dto.city || '',
          state: dto.state || '',
          phone: dto.phone,
          email: dto.email,
          status: 'PENDING', // PENDENTE_QUALIFICACAO
        },
      });

      // Link user to company
      await this.prisma.companyUser.create({
        data: {
          userId: user.id,
          companyId: company.id,
          role: 'OWNER',
        },
      });

      // Create supplier profile for onboarding
      await this.prisma.supplierProfile.create({
        data: {
          companyId: company.id,
          onboardingPhase: 1,
          onboardingComplete: false,
        },
      });
    }

    // Generate token
    const token = this.generateToken(user.id, user.email, user.role);

    return {
      user,
      company,
      accessToken: token,
      needsOnboarding: dto.role === 'SUPPLIER',
    };
  }

  async login(dto: LoginDto) {
    // Find user with company information
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: {
        companyUsers: {
          include: {
            company: {
              select: {
                id: true,
                tradeName: true,
                legalName: true,
                type: true,
                status: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is inactive');
    }

    // Generate token
    const token = this.generateToken(user.id, user.email, user.role);

    // Get company ID based on role
    const companyUser = user.companyUsers?.[0];
    const companyId = companyUser?.company?.id;
    const companyName = companyUser?.company?.tradeName || companyUser?.company?.legalName;
    const companyType = companyUser?.company?.type;

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        companyId,
        companyName,
        companyType,
        // Convenience aliases for frontend
        ...(companyType === 'SUPPLIER' && { supplierId: companyId }),
        ...(companyType === 'BRAND' && { brandId: companyId }),
      },
      accessToken: token,
    };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        companyUsers: {
          include: {
            company: {
              select: {
                id: true,
                tradeName: true,
                legalName: true,
                type: true,
                status: true,
                avgRating: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Extract primary company info for convenience
    const companyUser = user.companyUsers?.[0];
    const companyId = companyUser?.company?.id;
    const companyName = companyUser?.company?.tradeName || companyUser?.company?.legalName;
    const companyType = companyUser?.company?.type;

    return {
      ...user,
      companyId,
      companyName,
      companyType,
      // Convenience aliases for frontend
      ...(companyType === 'SUPPLIER' && { supplierId: companyId }),
      ...(companyType === 'BRAND' && { brandId: companyId }),
    };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    // If email is changing, check uniqueness
    if (dto.email) {
      const existing = await this.prisma.user.findFirst({
        where: {
          email: dto.email,
          id: { not: userId },
        },
      });

      if (existing) {
        throw new ConflictException('Este email já está em uso');
      }
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.email && { email: dto.email }),
      },
    });

    return this.getProfile(userId);
  }

  private generateToken(userId: string, email: string, role: string): string {
    return this.jwtService.sign({
      sub: userId,
      email,
      role,
    });
  }
}
