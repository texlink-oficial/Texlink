import {
  Injectable,
  Inject,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from '../../common/services/cache.service';
import { RegisterDto, LoginDto, UpdateProfileDto } from './dto';
import type { StorageProvider } from '../upload/storage.provider';
import { STORAGE_PROVIDER } from '../upload/storage.provider';

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_SECONDS = 900; // 15 minutes

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private cache: CacheService,
    @Inject(STORAGE_PROVIDER) private readonly storage: StorageProvider,
  ) {}

  async register(dto: RegisterDto) {
    // Check if email already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    // Check if document already exists (for SUPPLIER and BRAND)
    if (dto.document) {
      const existingCompany = await this.prisma.company.findUnique({
        where: { document: dto.document },
      });
      if (existingCompany) {
        throw new ConflictException('CNPJ/CPF já cadastrado');
      }
    }

    // Hash password
    const passwordHash = await bcrypt.hash(dto.password, 12);

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

    // Create Company and Profile for both SUPPLIER and BRAND
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
          status: 'PENDING',
        },
      });

      await this.prisma.companyUser.create({
        data: {
          userId: user.id,
          companyId: company.id,
          role: 'OWNER',
        },
      });

      await this.prisma.supplierProfile.create({
        data: {
          companyId: company.id,
          onboardingPhase: 1,
          onboardingComplete: false,
        },
      });
    } else if (dto.role === 'BRAND') {
      company = await this.prisma.company.create({
        data: {
          legalName: dto.companyName || dto.name,
          tradeName: dto.companyName || dto.name,
          document: dto.document || `PENDING_${user.id}`,
          type: 'BRAND',
          city: dto.city || '',
          state: dto.state || '',
          phone: dto.phone,
          email: dto.email,
          status: 'PENDING',
        },
      });

      await this.prisma.companyUser.create({
        data: {
          userId: user.id,
          companyId: company.id,
          role: 'OWNER',
        },
      });

      await this.prisma.brandProfile.create({
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
      needsOnboarding: dto.role === 'SUPPLIER' || dto.role === 'BRAND',
    };
  }

  async login(dto: LoginDto) {
    const lockoutKey = `auth:lockout:${dto.email}`;
    const attemptsKey = `auth:attempts:${dto.email}`;

    // Check if account is locked
    const lockout = await this.cache.get<string>(lockoutKey);
    if (lockout) {
      throw new UnauthorizedException(
        'Conta temporariamente bloqueada por excesso de tentativas. Tente novamente em 15 minutos.',
      );
    }

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
                logoUrl: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!user) {
      await this.incrementFailedAttempts(attemptsKey, lockoutKey);
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      await this.incrementFailedAttempts(attemptsKey, lockoutKey);
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is inactive');
    }

    // Clear failed attempts on successful login
    await this.cache.del(attemptsKey);

    // Generate token
    const token = this.generateToken(user.id, user.email, user.role);

    // Get company matching user role; fall back to first association
    const companyUser =
      user.companyUsers?.find(
        (cu) => cu.company?.type === user.role,
      ) || user.companyUsers?.[0];
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
                logoUrl: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Extract primary company matching user role; fall back to first association
    const companyUser =
      user.companyUsers?.find(
        (cu) => cu.company?.type === user.role,
      ) || user.companyUsers?.[0];
    const companyId = companyUser?.company?.id;
    const companyName = companyUser?.company?.tradeName || companyUser?.company?.legalName;
    const companyType = companyUser?.company?.type;

    // Resolve logoUrls to presigned URLs
    const resolvedCompanyUsers = await Promise.all(
      (user.companyUsers || []).map(async (cu) => ({
        ...cu,
        company: cu.company
          ? {
              ...cu.company,
              logoUrl: await this.storage.resolveUrl?.(cu.company.logoUrl) ?? cu.company.logoUrl,
            }
          : cu.company,
      })),
    );

    return {
      ...user,
      companyUsers: resolvedCompanyUsers,
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

  private async incrementFailedAttempts(
    attemptsKey: string,
    lockoutKey: string,
  ): Promise<void> {
    const current = (await this.cache.get<number>(attemptsKey)) || 0;
    const attempts = current + 1;

    if (attempts >= MAX_LOGIN_ATTEMPTS) {
      await this.cache.set(lockoutKey, 'locked', LOCKOUT_DURATION_SECONDS);
      await this.cache.del(attemptsKey);
    } else {
      await this.cache.set(attemptsKey, attempts, LOCKOUT_DURATION_SECONDS);
    }
  }
}
