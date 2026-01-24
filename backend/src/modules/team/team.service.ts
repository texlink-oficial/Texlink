import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PermissionsService } from '../permissions/permissions.service';
import { InviteUserDto, CreateUserDto, UpdateMemberDto, UpdateMemberPermissionsDto } from './dto';
import { CompanyRole, InvitationStatus, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

@Injectable()
export class TeamService {
  constructor(
    private prisma: PrismaService,
    private permissionsService: PermissionsService,
  ) {}

  /**
   * Lista todos os membros de uma empresa
   */
  async getTeamMembers(companyId: string) {
    const members = await this.prisma.companyUser.findMany({
      where: { companyId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            isActive: true,
            createdAt: true,
          },
        },
        permissions: true,
      },
      orderBy: [
        { isCompanyAdmin: 'desc' },
        { createdAt: 'asc' },
      ],
    });

    return members.map(member => ({
      id: member.id,
      userId: member.user.id,
      email: member.user.email,
      name: member.user.name,
      userRole: member.user.role,
      isActive: member.user.isActive,
      companyRole: member.companyRole,
      isCompanyAdmin: member.isCompanyAdmin,
      permissionOverrides: member.permissions,
      effectivePermissions: this.permissionsService.calculateEffectivePermissions(member),
      joinedAt: member.createdAt,
    }));
  }

  /**
   * Obtém detalhes de um membro específico
   */
  async getMember(companyId: string, memberId: string) {
    const member = await this.prisma.companyUser.findFirst({
      where: {
        id: memberId,
        companyId,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            isActive: true,
          },
        },
        permissions: true,
      },
    });

    if (!member) {
      throw new NotFoundException('Membro não encontrado');
    }

    return {
      id: member.id,
      userId: member.user.id,
      email: member.user.email,
      name: member.user.name,
      userRole: member.user.role,
      isActive: member.user.isActive,
      companyRole: member.companyRole,
      isCompanyAdmin: member.isCompanyAdmin,
      permissionOverrides: member.permissions,
      effectivePermissions: this.permissionsService.calculateEffectivePermissions(member),
      joinedAt: member.createdAt,
    };
  }

  /**
   * Convida um usuário por email
   */
  async inviteUser(companyId: string, invitedById: string, dto: InviteUserDto) {
    // Verificar se já existe um usuário com esse email na empresa
    const existingMember = await this.prisma.companyUser.findFirst({
      where: {
        companyId,
        user: { email: dto.email },
      },
    });

    if (existingMember) {
      throw new ConflictException('Este usuário já faz parte da empresa');
    }

    // Verificar se já existe um convite pendente
    const existingInvite = await this.prisma.invitation.findFirst({
      where: {
        companyId,
        email: dto.email,
        status: InvitationStatus.PENDING,
      },
    });

    if (existingInvite) {
      throw new ConflictException('Já existe um convite pendente para este email');
    }

    // Criar convite com expiração de 7 dias
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const invitation = await this.prisma.invitation.create({
      data: {
        companyId,
        email: dto.email,
        companyRole: dto.companyRole || CompanyRole.VIEWER,
        invitedById,
        expiresAt,
      },
      include: {
        company: { select: { tradeName: true } },
        invitedBy: { select: { name: true } },
      },
    });

    return {
      id: invitation.id,
      email: invitation.email,
      companyRole: invitation.companyRole,
      token: invitation.token,
      inviteUrl: `/convite/${invitation.token}`,
      expiresAt: invitation.expiresAt,
      company: invitation.company.tradeName,
      invitedBy: invitation.invitedBy.name,
    };
  }

  /**
   * Cria um usuário diretamente (sem convite)
   */
  async createUser(companyId: string, dto: CreateUserDto) {
    // Verificar se email já existe
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      // Se o usuário já existe, apenas adicionar à empresa
      const existingMember = await this.prisma.companyUser.findFirst({
        where: {
          companyId,
          userId: existingUser.id,
        },
      });

      if (existingMember) {
        throw new ConflictException('Este usuário já faz parte da empresa');
      }

      // Adicionar usuário existente à empresa
      const companyUser = await this.prisma.companyUser.create({
        data: {
          userId: existingUser.id,
          companyId,
          companyRole: dto.companyRole || CompanyRole.VIEWER,
          isCompanyAdmin: dto.isCompanyAdmin || false,
        },
        include: {
          user: { select: { id: true, email: true, name: true } },
        },
      });

      return {
        id: companyUser.id,
        userId: companyUser.user.id,
        email: companyUser.user.email,
        name: companyUser.user.name,
        companyRole: companyUser.companyRole,
        isCompanyAdmin: companyUser.isCompanyAdmin,
        isNewUser: false,
      };
    }

    // Obter tipo da empresa para definir role do usuário
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      throw new NotFoundException('Empresa não encontrada');
    }

    const userRole = company.type === 'BRAND' ? UserRole.BRAND : UserRole.SUPPLIER;

    // Criar novo usuário
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        name: dto.name,
        passwordHash: hashedPassword,
        role: userRole,
        companyUsers: {
          create: {
            companyId,
            companyRole: dto.companyRole || CompanyRole.VIEWER,
            isCompanyAdmin: dto.isCompanyAdmin || false,
          },
        },
      },
      include: {
        companyUsers: {
          where: { companyId },
        },
      },
    });

    return {
      id: user.companyUsers[0].id,
      userId: user.id,
      email: user.email,
      name: user.name,
      companyRole: user.companyUsers[0].companyRole,
      isCompanyAdmin: user.companyUsers[0].isCompanyAdmin,
      isNewUser: true,
    };
  }

  /**
   * Atualiza o role/admin status de um membro
   */
  async updateMember(companyId: string, memberId: string, currentUserId: string, dto: UpdateMemberDto) {
    // Verificar permissão de modificação
    const canModify = await this.permissionsService.canModifyMember(currentUserId, memberId, companyId);
    if (!canModify.allowed) {
      throw new ForbiddenException(canModify.reason);
    }

    const member = await this.prisma.companyUser.findFirst({
      where: { id: memberId, companyId },
    });

    if (!member) {
      throw new NotFoundException('Membro não encontrado');
    }

    // Se estiver removendo admin, verificar se não é o último
    if (member.isCompanyAdmin && dto.isCompanyAdmin === false) {
      const adminCount = await this.prisma.companyUser.count({
        where: { companyId, isCompanyAdmin: true },
      });

      if (adminCount <= 1) {
        throw new BadRequestException('Não é possível remover o último administrador');
      }
    }

    const updated = await this.prisma.companyUser.update({
      where: { id: memberId },
      data: {
        companyRole: dto.companyRole,
        isCompanyAdmin: dto.isCompanyAdmin,
      },
      include: {
        user: { select: { id: true, email: true, name: true } },
        permissions: true,
      },
    });

    return {
      id: updated.id,
      userId: updated.user.id,
      email: updated.user.email,
      name: updated.user.name,
      companyRole: updated.companyRole,
      isCompanyAdmin: updated.isCompanyAdmin,
      effectivePermissions: this.permissionsService.calculateEffectivePermissions(updated),
    };
  }

  /**
   * Atualiza as permissões personalizadas de um membro
   */
  async updateMemberPermissions(
    companyId: string,
    memberId: string,
    currentUserId: string,
    dto: UpdateMemberPermissionsDto,
  ) {
    // Verificar permissão de modificação
    const canModify = await this.permissionsService.canModifyMember(currentUserId, memberId, companyId);
    if (!canModify.allowed) {
      throw new ForbiddenException(canModify.reason);
    }

    const member = await this.prisma.companyUser.findFirst({
      where: { id: memberId, companyId },
    });

    if (!member) {
      throw new NotFoundException('Membro não encontrado');
    }

    // Limpar overrides se solicitado
    if (dto.clearOverrides) {
      await this.permissionsService.clearPermissionOverrides(memberId);
    }

    // Aplicar novos overrides
    if (dto.permissionOverrides && dto.permissionOverrides.length > 0) {
      for (const override of dto.permissionOverrides) {
        await this.permissionsService.setPermissionOverride(
          memberId,
          override.permission,
          override.granted,
        );
      }
    }

    // Retornar membro atualizado
    return this.getMember(companyId, memberId);
  }

  /**
   * Remove um membro da empresa
   */
  async removeMember(companyId: string, memberId: string, currentUserId: string) {
    // Verificar permissão de modificação
    const canModify = await this.permissionsService.canModifyMember(currentUserId, memberId, companyId);
    if (!canModify.allowed) {
      throw new ForbiddenException(canModify.reason);
    }

    const member = await this.prisma.companyUser.findFirst({
      where: { id: memberId, companyId },
      include: { user: true },
    });

    if (!member) {
      throw new NotFoundException('Membro não encontrado');
    }

    // Não permitir auto-remoção
    if (member.userId === currentUserId) {
      throw new BadRequestException('Você não pode remover a si mesmo');
    }

    // Verificar se é o último admin
    if (member.isCompanyAdmin) {
      const adminCount = await this.prisma.companyUser.count({
        where: { companyId, isCompanyAdmin: true },
      });

      if (adminCount <= 1) {
        throw new BadRequestException('Não é possível remover o último administrador');
      }
    }

    await this.prisma.companyUser.delete({
      where: { id: memberId },
    });

    return { success: true, message: 'Membro removido com sucesso' };
  }

  /**
   * Lista convites pendentes da empresa
   */
  async getPendingInvitations(companyId: string) {
    const invitations = await this.prisma.invitation.findMany({
      where: {
        companyId,
        status: InvitationStatus.PENDING,
      },
      include: {
        invitedBy: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return invitations.map(inv => ({
      id: inv.id,
      email: inv.email,
      companyRole: inv.companyRole,
      token: inv.token,
      inviteUrl: `/convite/${inv.token}`,
      expiresAt: inv.expiresAt,
      isExpired: new Date() > inv.expiresAt,
      invitedBy: inv.invitedBy.name,
      createdAt: inv.createdAt,
    }));
  }

  /**
   * Cancela um convite pendente
   */
  async cancelInvitation(companyId: string, invitationId: string) {
    const invitation = await this.prisma.invitation.findFirst({
      where: {
        id: invitationId,
        companyId,
        status: InvitationStatus.PENDING,
      },
    });

    if (!invitation) {
      throw new NotFoundException('Convite não encontrado');
    }

    await this.prisma.invitation.update({
      where: { id: invitationId },
      data: { status: InvitationStatus.CANCELLED },
    });

    return { success: true, message: 'Convite cancelado' };
  }

  /**
   * Reenvia um convite (cria um novo token)
   */
  async resendInvitation(companyId: string, invitationId: string, invitedById: string) {
    const invitation = await this.prisma.invitation.findFirst({
      where: {
        id: invitationId,
        companyId,
        status: InvitationStatus.PENDING,
      },
    });

    if (!invitation) {
      throw new NotFoundException('Convite não encontrado');
    }

    // Cancelar convite antigo e criar novo
    await this.prisma.invitation.update({
      where: { id: invitationId },
      data: { status: InvitationStatus.CANCELLED },
    });

    return this.inviteUser(companyId, invitedById, {
      email: invitation.email,
      companyRole: invitation.companyRole,
    });
  }

  /**
   * Obtém detalhes de um convite pelo token (público)
   */
  async getInvitationByToken(token: string) {
    const invitation = await this.prisma.invitation.findUnique({
      where: { token },
      include: {
        company: { select: { id: true, tradeName: true, type: true } },
        invitedBy: { select: { name: true } },
      },
    });

    if (!invitation) {
      throw new NotFoundException('Convite não encontrado');
    }

    const isExpired = new Date() > invitation.expiresAt;
    const isValid = invitation.status === InvitationStatus.PENDING && !isExpired;

    return {
      id: invitation.id,
      email: invitation.email,
      companyRole: invitation.companyRole,
      company: invitation.company,
      invitedBy: invitation.invitedBy.name,
      status: invitation.status,
      isExpired,
      isValid,
      expiresAt: invitation.expiresAt,
    };
  }

  /**
   * Aceita um convite
   */
  async acceptInvitation(token: string, userId?: string, newUserData?: { name: string; password: string }) {
    const invitation = await this.prisma.invitation.findUnique({
      where: { token },
      include: {
        company: true,
      },
    });

    if (!invitation) {
      throw new NotFoundException('Convite não encontrado');
    }

    if (invitation.status !== InvitationStatus.PENDING) {
      throw new BadRequestException('Este convite já foi utilizado ou cancelado');
    }

    if (new Date() > invitation.expiresAt) {
      await this.prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: InvitationStatus.EXPIRED },
      });
      throw new BadRequestException('Este convite expirou');
    }

    // Verificar se o usuário já existe
    let user = await this.prisma.user.findUnique({
      where: { email: invitation.email },
    });

    if (!user && !newUserData) {
      // Usuário não existe e não foram fornecidos dados para criar
      return {
        requiresRegistration: true,
        email: invitation.email,
        company: invitation.company.tradeName,
      };
    }

    if (!user && newUserData) {
      // Criar novo usuário
      const userRole = invitation.company.type === 'BRAND' ? UserRole.BRAND : UserRole.SUPPLIER;
      const hashedPassword = await bcrypt.hash(newUserData.password, 10);

      user = await this.prisma.user.create({
        data: {
          email: invitation.email,
          name: newUserData.name,
          passwordHash: hashedPassword,
          role: userRole,
        },
      });
    }

    if (userId && user && user.id !== userId) {
      throw new BadRequestException('Este convite foi enviado para outro email');
    }

    // Verificar se usuário já está na empresa
    const existingMember = await this.prisma.companyUser.findUnique({
      where: {
        userId_companyId: { userId: user!.id, companyId: invitation.companyId },
      },
    });

    if (existingMember) {
      throw new ConflictException('Você já faz parte desta empresa');
    }

    // Criar associação com a empresa
    const companyUser = await this.prisma.companyUser.create({
      data: {
        userId: user!.id,
        companyId: invitation.companyId,
        companyRole: invitation.companyRole,
        isCompanyAdmin: invitation.companyRole === CompanyRole.ADMIN,
      },
    });

    // Marcar convite como aceito
    await this.prisma.invitation.update({
      where: { id: invitation.id },
      data: { status: InvitationStatus.ACCEPTED },
    });

    return {
      success: true,
      companyUser: {
        id: companyUser.id,
        companyRole: companyUser.companyRole,
        isCompanyAdmin: companyUser.isCompanyAdmin,
      },
      company: {
        id: invitation.company.id,
        tradeName: invitation.company.tradeName,
        type: invitation.company.type,
      },
    };
  }

  /**
   * Declina um convite
   */
  async declineInvitation(token: string) {
    const invitation = await this.prisma.invitation.findUnique({
      where: { token },
    });

    if (!invitation) {
      throw new NotFoundException('Convite não encontrado');
    }

    if (invitation.status !== InvitationStatus.PENDING) {
      throw new BadRequestException('Este convite já foi processado');
    }

    await this.prisma.invitation.update({
      where: { id: invitation.id },
      data: { status: InvitationStatus.CANCELLED },
    });

    return { success: true, message: 'Convite recusado' };
  }

  /**
   * Lista convites pendentes do usuário atual
   */
  async getMyPendingInvitations(email: string) {
    const invitations = await this.prisma.invitation.findMany({
      where: {
        email,
        status: InvitationStatus.PENDING,
        expiresAt: { gt: new Date() },
      },
      include: {
        company: { select: { id: true, tradeName: true, type: true } },
        invitedBy: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return invitations.map(inv => ({
      id: inv.id,
      token: inv.token,
      companyRole: inv.companyRole,
      company: inv.company,
      invitedBy: inv.invitedBy.name,
      expiresAt: inv.expiresAt,
      createdAt: inv.createdAt,
    }));
  }
}
