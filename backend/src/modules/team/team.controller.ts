import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../permissions/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permission } from '@prisma/client';
import { TeamService } from './team.service';
import { PermissionsService } from '../permissions/permissions.service';
import {
  InviteUserDto,
  CreateUserDto,
  UpdateMemberDto,
  UpdateMemberPermissionsDto,
} from './dto';

@ApiTags('Equipe')
@ApiBearerAuth()
@Controller()
export class TeamController {
  constructor(
    private teamService: TeamService,
    private permissionsService: PermissionsService,
  ) {}

  // ==================== Team Management ====================

  /**
   * Lista membros da equipe
   */
  @Get('companies/:companyId/team')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.TEAM_VIEW)
  async getTeamMembers(@Param('companyId', ParseUUIDPipe) companyId: string) {
    return this.teamService.getTeamMembers(companyId);
  }

  /**
   * Obtém detalhes de um membro
   */
  @Get('companies/:companyId/team/:memberId')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.TEAM_VIEW)
  async getMember(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
  ) {
    return this.teamService.getMember(companyId, memberId);
  }

  /**
   * Convida um usuário por email
   */
  @Post('companies/:companyId/team/invite')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.TEAM_INVITE)
  async inviteUser(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Body() dto: InviteUserDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.teamService.inviteUser(companyId, userId, dto);
  }

  /**
   * Cria um usuário diretamente
   */
  @Post('companies/:companyId/team/create')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.TEAM_MANAGE)
  async createUser(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Body() dto: CreateUserDto,
  ) {
    return this.teamService.createUser(companyId, dto);
  }

  /**
   * Atualiza role/admin de um membro
   */
  @Patch('companies/:companyId/team/:memberId')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.TEAM_MANAGE)
  async updateMember(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @Body() dto: UpdateMemberDto,
    @CurrentUser('id') currentUserId: string,
  ) {
    return this.teamService.updateMember(
      companyId,
      memberId,
      currentUserId,
      dto,
    );
  }

  /**
   * Atualiza permissões personalizadas de um membro
   */
  @Patch('companies/:companyId/team/:memberId/permissions')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.TEAM_MANAGE_PERMISSIONS)
  async updateMemberPermissions(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @Body() dto: UpdateMemberPermissionsDto,
    @CurrentUser('id') currentUserId: string,
  ) {
    return this.teamService.updateMemberPermissions(
      companyId,
      memberId,
      currentUserId,
      dto,
    );
  }

  /**
   * Ativa/desativa um membro da equipe
   */
  @Patch('companies/:companyId/team/:memberId/toggle-active')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.TEAM_MANAGE)
  async toggleMemberActive(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @CurrentUser('id') currentUserId: string,
  ) {
    return this.teamService.toggleMemberActive(
      companyId,
      memberId,
      currentUserId,
    );
  }

  /**
   * Remove um membro da equipe
   */
  @Delete('companies/:companyId/team/:memberId')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.TEAM_MANAGE)
  async removeMember(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @CurrentUser('id') currentUserId: string,
  ) {
    return this.teamService.removeMember(companyId, memberId, currentUserId);
  }

  // ==================== Invitations (Company Side) ====================

  /**
   * Lista convites pendentes da empresa
   */
  @Get('companies/:companyId/team/invitations')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.TEAM_VIEW)
  async getPendingInvitations(@Param('companyId', ParseUUIDPipe) companyId: string) {
    return this.teamService.getPendingInvitations(companyId);
  }

  /**
   * Cancela um convite
   */
  @Delete('companies/:companyId/team/invitations/:invitationId')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.TEAM_INVITE)
  async cancelInvitation(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('invitationId', ParseUUIDPipe) invitationId: string,
  ) {
    return this.teamService.cancelInvitation(companyId, invitationId);
  }

  /**
   * Reenvia um convite
   */
  @Post('companies/:companyId/team/invitations/:invitationId/resend')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.TEAM_INVITE)
  async resendInvitation(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('invitationId', ParseUUIDPipe) invitationId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.teamService.resendInvitation(companyId, invitationId, userId);
  }

  // ==================== Invitations (Public/User Side) ====================

  /**
   * Obtém detalhes de um convite pelo token (público)
   */
  @Get('invitations/:token')
  async getInvitation(@Param('token') token: string) {
    return this.teamService.getInvitationByToken(token);
  }

  /**
   * Aceita um convite
   */
  @Post('invitations/:token/accept')
  async acceptInvitation(
    @Param('token') token: string,
    @Body() body: { name?: string; password?: string },
    @CurrentUser('id') userId?: string,
  ) {
    const newUserData =
      body.name && body.password
        ? { name: body.name, password: body.password }
        : undefined;
    return this.teamService.acceptInvitation(token, userId, newUserData);
  }

  /**
   * Recusa um convite
   */
  @Post('invitations/:token/decline')
  async declineInvitation(@Param('token') token: string) {
    return this.teamService.declineInvitation(token);
  }

  /**
   * Lista convites pendentes do usuário atual
   */
  @Get('invitations/pending')
  @UseGuards(JwtAuthGuard)
  async getMyPendingInvitations(@CurrentUser('email') email: string) {
    return this.teamService.getMyPendingInvitations(email);
  }

  // ==================== Roles Info ====================

  /**
   * Lista todos os roles disponíveis
   */
  @Get('roles')
  @UseGuards(JwtAuthGuard)
  async getRoles() {
    return this.permissionsService.getRoles();
  }

  /**
   * Obtém detalhes de um role
   */
  @Get('roles/:role')
  @UseGuards(JwtAuthGuard)
  async getRoleInfo(@Param('role') role: string) {
    return this.permissionsService.getRoleInfo(role as any);
  }

  /**
   * Lista permissões por categoria
   */
  @Get('permissions/categories')
  @UseGuards(JwtAuthGuard)
  async getPermissionCategories() {
    return this.permissionsService.getPermissionCategories();
  }

  // ==================== User Permissions ====================

  /**
   * Obtém as permissões do usuário atual em uma empresa
   */
  @Get('companies/:companyId/my-permissions')
  @UseGuards(JwtAuthGuard)
  async getMyPermissions(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.permissionsService.getCompanyUserWithPermissions(
      userId,
      companyId,
    );
  }
}
