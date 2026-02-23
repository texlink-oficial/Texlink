import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from '../../common/services/cache.service';
import { UserRole } from '@prisma/client';
import { AdminCreateUserDto, AdminUpdateUserDto } from '../admin/dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private cache: CacheService,
  ) {}

  async findAll(role?: UserRole) {
    return this.prisma.user.findMany({
      where: role ? { role } : undefined,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        isSuperAdmin: true,
        createdAt: true,
        companyUsers: {
          include: {
            company: {
              select: {
                id: true,
                tradeName: true,
                type: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        companyUsers: {
          include: {
            company: true,
          },
        },
      },
    });
  }

  async updateStatus(id: string, isActive: boolean) {
    const result = await this.prisma.user.update({
      where: { id },
      data: { isActive },
      select: {
        id: true,
        email: true,
        name: true,
        isActive: true,
      },
    });

    // Invalidate JWT cache so the status change takes effect immediately
    await this.invalidateUserCache(id);

    return result;
  }

  async createUser(dto: AdminCreateUserDto) {
    const email = dto.email.toLowerCase().trim();

    const existing = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existing) {
      throw new ConflictException('Já existe um usuário com este email');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 12);

    const user = await this.prisma.user.create({
      data: {
        email,
        name: dto.name,
        passwordHash: hashedPassword,
        role: dto.role,
        ...(dto.companyId && {
          companyUsers: {
            create: {
              companyId: dto.companyId,
              companyRole: dto.isCompanyAdmin ? 'ADMIN' : 'VIEWER',
              isCompanyAdmin: dto.isCompanyAdmin ?? false,
            },
          },
        }),
      },
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
              select: { id: true, tradeName: true, type: true },
            },
          },
        },
      },
    });

    return user;
  }

  async updateUser(id: string, dto: AdminUpdateUserDto) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    if (dto.email && dto.email !== user.email) {
      const existing = await this.prisma.user.findUnique({
        where: { email: dto.email },
      });
      if (existing) {
        throw new ConflictException('Já existe um usuário com este email');
      }
    }

    const result = await this.prisma.user.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.email !== undefined && { email: dto.email }),
        ...(dto.role !== undefined && { role: dto.role }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        isSuperAdmin: true,
        createdAt: true,
        companyUsers: {
          include: {
            company: {
              select: { id: true, tradeName: true, type: true },
            },
          },
        },
      },
    });

    // Invalidate JWT cache when user data changes (role, isActive, email, name)
    await this.invalidateUserCache(id);

    return result;
  }

  async deleteUser(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    const result = await this.prisma.user.update({
      where: { id },
      data: { isActive: false },
      select: {
        id: true,
        email: true,
        name: true,
        isActive: true,
      },
    });

    // Invalidate JWT cache so deactivated user is blocked immediately
    await this.invalidateUserCache(id);

    return result;
  }

  /**
   * Invalidates the JWT user cache so auth re-fetches from database
   */
  private async invalidateUserCache(userId: string): Promise<void> {
    await this.cache.del(`jwt:user:${userId}`);
  }

  async resetPassword(id: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    return this.prisma.user.update({
      where: { id },
      data: { passwordHash: hashedPassword },
      select: {
        id: true,
        email: true,
        name: true,
      },
    });
  }
}
