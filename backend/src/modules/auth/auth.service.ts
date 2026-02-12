import {
  Injectable,
  Inject,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
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
  private readonly refreshSecret: string;
  private readonly refreshExpiresIn: string;

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private cache: CacheService,
    @Inject(STORAGE_PROVIDER) private readonly storage: StorageProvider,
  ) {
    this.refreshSecret =
      this.configService.get<string>('jwt.refreshSecret') ||
      this.configService.get<string>('jwt.secret') + '-refresh';
    this.refreshExpiresIn =
      this.configService.get<string>('jwt.refreshExpiresIn') || '7d';
  }

  async register(dto: RegisterDto) {
    // Hash password before transaction (CPU-intensive, don't hold tx open)
    const passwordHash = await bcrypt.hash(dto.password, 12);

    const result = await this.prisma.$transaction(async (tx) => {
      // Check if email already exists
      const existingUser = await tx.user.findUnique({
        where: { email: dto.email },
      });

      if (existingUser) {
        throw new ConflictException('Email already registered');
      }

      // Check if document already exists (for SUPPLIER and BRAND)
      if (dto.document) {
        const existingCompany = await tx.company.findUnique({
          where: { document: dto.document },
        });
        if (existingCompany) {
          throw new ConflictException('CNPJ/CPF já cadastrado');
        }
      }

      // Create user
      const user = await tx.user.create({
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
        company = await tx.company.create({
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

        await tx.companyUser.create({
          data: {
            userId: user.id,
            companyId: company.id,
            role: 'OWNER',
          },
        });

        await tx.supplierProfile.create({
          data: {
            companyId: company.id,
            onboardingPhase: 1,
            onboardingComplete: false,
          },
        });
      } else if (dto.role === 'BRAND') {
        company = await tx.company.create({
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

        await tx.companyUser.create({
          data: {
            userId: user.id,
            companyId: company.id,
            role: 'OWNER',
          },
        });

        await tx.brandProfile.create({
          data: {
            companyId: company.id,
            onboardingPhase: 1,
            onboardingComplete: false,
          },
        });
      }

      return { user, company };
    });

    // Generate tokens (outside transaction - no DB needed)
    const accessToken = this.generateToken(result.user.id, result.user.email, result.user.role);
    const refreshToken = this.generateRefreshToken(result.user.id, result.user.email, result.user.role);

    return {
      user: result.user,
      company: result.company,
      accessToken,
      refreshToken,
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

    // Generate tokens
    const accessToken = this.generateToken(user.id, user.email, user.role);
    const refreshToken = this.generateRefreshToken(user.id, user.email, user.role);

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
      accessToken,
      refreshToken,
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

    // Invalidate JWT user cache so next request picks up new data
    await this.cache.del(`jwt:user:${userId}`);

    return this.getProfile(userId);
  }

  async refreshTokens(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.refreshSecret,
      });

      // Verify user still exists and is active
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, email: true, role: true, isActive: true },
      });

      if (!user || !user.isActive) {
        throw new UnauthorizedException('User not found or inactive');
      }

      // Check if token was invalidated (logout)
      const isBlacklisted = await this.cache.get<string>(
        `auth:refresh:blacklist:${refreshToken}`,
      );
      if (isBlacklisted) {
        throw new UnauthorizedException('Token has been revoked');
      }

      const newAccessToken = this.generateToken(user.id, user.email, user.role);
      const newRefreshToken = this.generateRefreshToken(user.id, user.email, user.role);

      // Blacklist the old refresh token to prevent reuse
      const ttl = Math.max(
        0,
        Math.floor((payload.exp - Date.now() / 1000)),
      );
      if (ttl > 0) {
        await this.cache.set(
          `auth:refresh:blacklist:${refreshToken}`,
          'revoked',
          ttl,
        );
      }

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.refreshSecret,
      });
      const ttl = Math.max(
        0,
        Math.floor((payload.exp - Date.now() / 1000)),
      );
      if (ttl > 0) {
        await this.cache.set(
          `auth:refresh:blacklist:${refreshToken}`,
          'revoked',
          ttl,
        );
      }
      // Invalidate JWT user cache
      if (payload.sub) {
        await this.cache.del(`jwt:user:${payload.sub}`);
      }
    } catch {
      // Token already expired or invalid — no need to blacklist
    }
  }

  private generateToken(userId: string, email: string, role: string): string {
    return this.jwtService.sign({
      sub: userId,
      email,
      role,
    });
  }

  private generateRefreshToken(userId: string, email: string, role: string): string {
    return this.jwtService.sign(
      { sub: userId, email, role, type: 'refresh' },
      { secret: this.refreshSecret, expiresIn: this.refreshExpiresIn as any },
    );
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
