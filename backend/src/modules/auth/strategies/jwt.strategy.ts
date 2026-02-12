import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../prisma/prisma.service';
import { CacheService } from '../../../common/services/cache.service';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}

const JWT_USER_CACHE_TTL = 300; // 5 minutes

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
    private cache: CacheService,
  ) {
    const secret = configService.get<string>('jwt.secret');
    if (!secret) {
      throw new Error('JWT_SECRET environment variable is required');
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: JwtPayload) {
    const cacheKey = `jwt:user:${payload.sub}`;
    const cached = await this.cache.get<any>(cacheKey);
    if (cached) {
      // Ensure cached user is still active
      if (!cached.isActive) {
        throw new UnauthorizedException('User not found or inactive');
      }
      return cached;
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        companyUsers: {
          include: {
            company: true,
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }

    // Extract companyId matching user role; fall back to first association
    const matchingCompanyUser =
      user.companyUsers?.find(
        (cu) => cu.company?.type === user.role,
      ) || user.companyUsers?.[0];
    const companyId = matchingCompanyUser?.companyId || null;
    const company = matchingCompanyUser?.company || null;
    const companyType = company?.type;

    const result = {
      ...user,
      companyId,
      company,
      // Add role-specific aliases for compatibility with services
      ...(companyType === 'SUPPLIER' && { supplierId: companyId }),
      ...(companyType === 'BRAND' && { brandId: companyId }),
    };

    await this.cache.set(cacheKey, result, JWT_USER_CACHE_TTL);

    return result;
  }
}
