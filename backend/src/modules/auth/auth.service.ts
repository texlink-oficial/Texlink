import {
  Injectable,
  Inject,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from '../../common/services/cache.service';
import { IntegrationService } from '../integrations/services/integration.service';
import { RegisterDto, LoginDto, UpdateProfileDto, ForgotPasswordDto, ResetPasswordDto } from './dto';
import { generatePasswordResetEmailHtml } from './templates/password-reset-email.template';
import type { StorageProvider } from '../upload/storage.provider';
import { STORAGE_PROVIDER } from '../upload/storage.provider';

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_SECONDS = 900; // 15 minutes
const PASSWORD_RESET_EXPIRY_HOURS = 24;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly refreshSecret: string;
  private readonly refreshExpiresIn: string;

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private cache: CacheService,
    private integrationService: IntegrationService,
    @Inject(STORAGE_PROVIDER) private readonly storage: StorageProvider,
  ) {
    this.refreshSecret =
      this.configService.getOrThrow<string>('jwt.refreshSecret');
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
        throw new ConflictException('Este e-mail já está cadastrado');
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
      throw new UnauthorizedException('E-mail ou senha incorretos');
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      await this.incrementFailedAttempts(attemptsKey, lockoutKey);
      throw new UnauthorizedException('E-mail ou senha incorretos');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Conta inativa. Entre em contato com o suporte.');
    }

    // Clear failed attempts on successful login
    await this.cache.del(attemptsKey);

    // Generate tokens
    const accessToken = this.generateToken(user.id, user.email, user.role);
    const refreshToken = this.generateRefreshToken(user.id, user.email, user.role);

    // Get active company matching user role; fall back to first active association
    const companyUser =
      user.companyUsers?.find(
        (cu) => cu.company?.type === user.role && cu.isActive,
      ) || user.companyUsers?.find((cu) => cu.isActive);

    // If all company associations are deactivated, deny login for non-ADMIN users
    if (!companyUser && user.role !== 'ADMIN' && user.companyUsers?.length > 0) {
      throw new UnauthorizedException(
        'Sua conta está desativada nesta empresa. Entre em contato com o administrador.',
      );
    }

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
      throw new UnauthorizedException('Usuário não encontrado');
    }

    // Extract primary active company matching user role; fall back to first active
    const companyUser =
      user.companyUsers?.find(
        (cu) => cu.company?.type === user.role && cu.isActive,
      ) || user.companyUsers?.find((cu) => cu.isActive);
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
        throw new UnauthorizedException('Usuário não encontrado ou inativo');
      }

      // Check if token was invalidated (logout)
      const isBlacklisted = await this.cache.get<string>(
        `auth:refresh:blacklist:${refreshToken}`,
      );
      if (isBlacklisted) {
        throw new UnauthorizedException('Sessão expirada. Faça login novamente.');
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
      throw new UnauthorizedException('Sessão inválida. Faça login novamente.');
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

  async forgotPassword(dto: ForgotPasswordDto): Promise<{ message: string }> {
    const message =
      'Se o e-mail estiver cadastrado, você receberá um link para redefinir sua senha.';

    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      select: { id: true, name: true, email: true, isActive: true },
    });

    // Always return success to avoid email enumeration
    if (!user || !user.isActive) {
      return { message };
    }

    // Generate cryptographically secure token
    const token = crypto.randomBytes(32).toString('hex');
    // Hash the token before storing — only the hash is persisted in the DB
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Calculate expiry
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + PASSWORD_RESET_EXPIRY_HOURS);

    // Store hashed token (raw token is sent to user via email)
    await this.prisma.passwordReset.create({
      data: {
        token: hashedToken,
        userId: user.id,
        expiresAt,
      },
    });

    // Build reset URL
    const frontendUrl = this.configService.getOrThrow<string>('frontendUrl');
    const resetUrl = `${frontendUrl}/redefinir-senha?token=${token}`;

    // Send email
    const emailHtml = generatePasswordResetEmailHtml({
      userName: user.name,
      resetUrl,
      expiresInHours: PASSWORD_RESET_EXPIRY_HOURS,
    });

    const emailResult = await this.integrationService.sendEmail({
      to: user.email,
      subject: 'Redefinir sua senha - Texlink',
      content: emailHtml,
    });

    if (!emailResult.success) {
      this.logger.warn(
        `Falha ao enviar e-mail de redefinição de senha para userId=${user.id}: ${emailResult.error}`,
      );
      // TODO: Implement retry via queue if email sending fails
    }

    return { message };
  }

  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    // Hash the raw token from the URL to match against stored hash
    const hashedToken = crypto.createHash('sha256').update(dto.token).digest('hex');

    // Find valid, unused, non-expired token
    const passwordReset = await this.prisma.passwordReset.findUnique({
      where: { token: hashedToken },
      include: {
        user: {
          select: { id: true, isActive: true },
        },
      },
    });

    if (!passwordReset) {
      throw new BadRequestException(
        'Token inválido ou expirado. Solicite uma nova redefinição de senha.',
      );
    }

    if (passwordReset.usedAt) {
      throw new BadRequestException(
        'Este link já foi utilizado. Solicite uma nova redefinição de senha.',
      );
    }

    if (new Date() > passwordReset.expiresAt) {
      throw new BadRequestException(
        'Este link expirou. Solicite uma nova redefinição de senha.',
      );
    }

    if (!passwordReset.user.isActive) {
      throw new BadRequestException(
        'Conta inativa. Entre em contato com o suporte.',
      );
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(dto.password, 12);

    // Update password and mark token as used in a transaction
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: passwordReset.userId },
        data: {
          passwordHash,
          passwordChangedAt: new Date(),
        },
      });

      // Invalidate ALL tokens for this user (not just the one used)
      await tx.passwordReset.updateMany({
        where: { userId: passwordReset.userId, usedAt: null },
        data: { usedAt: new Date() },
      });
    });

    // Invalidate JWT user cache so next request picks up new data
    await this.cache.del(`jwt:user:${passwordReset.userId}`);

    return { message: 'Senha redefinida com sucesso.' };
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
