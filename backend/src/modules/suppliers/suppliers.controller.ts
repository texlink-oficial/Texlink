import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
  Res,
  ParseUUIDPipe,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { SuppliersService } from './suppliers.service';
import { ConsentService } from './services/consent.service';
import type { RevokeConsentDto } from './services/consent.service';
import {
  OnboardingPhase2Dto,
  OnboardingPhase3Dto,
  SupplierFilterDto,
  InviteSupplierDto,
  ResendInvitationDto,
} from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

interface AuthUser {
  id: string;
  companyId: string;
}

@ApiTags('Fornecedores')
@ApiBearerAuth()
@Controller('suppliers')
export class SuppliersController {
  constructor(
    private readonly suppliersService: SuppliersService,
    private readonly consentService: ConsentService,
  ) { }

  // ========== PUBLIC ENDPOINTS ==========

  /**
   * Get invitation details by token (no auth required)
   */
  @Get('invitation/:token')
  async getInvitationByToken(@Param('token') token: string) {
    return this.suppliersService.getInvitationByToken(token);
  }

  /**
   * Accept an invitation (no auth required)
   */
  @Post('accept-invite/:token')
  async acceptInvitation(@Param('token') token: string) {
    return this.suppliersService.acceptInvitation(token);
  }

  // ========== SUPPLIER ENDPOINTS ==========

  @Get('profile')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPPLIER)
  async getMyProfile(@CurrentUser('id') userId: string) {
    return this.suppliersService.getMyProfile(userId);
  }

  @Patch('onboarding/phase2')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPPLIER)
  async updatePhase2(
    @CurrentUser('id') userId: string,
    @Body() dto: OnboardingPhase2Dto,
  ) {
    return this.suppliersService.updatePhase2(userId, dto);
  }

  @Patch('onboarding/phase3')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPPLIER)
  async updatePhase3(
    @CurrentUser('id') userId: string,
    @Body() dto: OnboardingPhase3Dto,
  ) {
    return this.suppliersService.updatePhase3(userId, dto);
  }

  @Patch('onboarding/complete')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPPLIER)
  async completeOnboarding(@CurrentUser('id') userId: string) {
    return this.suppliersService.completeOnboarding(userId);
  }

  @Get('dashboard')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPPLIER)
  async getDashboard(@CurrentUser('id') userId: string) {
    return this.suppliersService.getDashboard(userId);
  }

  @Get('reports')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPPLIER)
  async getReports(
    @CurrentUser('id') userId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.suppliersService.getReports(
      userId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get('reports/export')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPPLIER)
  async exportReport(
    @CurrentUser('id') userId: string,
    @Query('format') format: string = 'pdf',
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Res() res?: Response,
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    const dateStr = new Date().toISOString().split('T')[0];

    if (format === 'excel') {
      const buffer = await this.suppliersService.exportReportExcel(
        userId,
        start,
        end,
      );
      res!.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      res!.setHeader(
        'Content-Disposition',
        `attachment; filename="relatorio-${dateStr}.xlsx"`,
      );
      res!.send(buffer);
    } else {
      const buffer = await this.suppliersService.exportReportPdf(
        userId,
        start,
        end,
      );
      res!.setHeader('Content-Type', 'application/pdf');
      res!.setHeader(
        'Content-Disposition',
        `attachment; filename="relatorio-${dateStr}.pdf"`,
      );
      res!.send(buffer);
    }
  }

  @Get('opportunities')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPPLIER)
  async getOpportunities(
    @CurrentUser('id') userId: string,
    @Query('search') search?: string,
    @Query('category') category?: string,
    @Query('minValue') minValue?: string,
    @Query('maxValue') maxValue?: string,
    @Query('deadlineFrom') deadlineFrom?: string,
    @Query('deadlineTo') deadlineTo?: string,
    @Query('sort') sort?: string,
  ) {
    return this.suppliersService.getOpportunities(userId, {
      search,
      category,
      minValue: minValue ? parseFloat(minValue) : undefined,
      maxValue: maxValue ? parseFloat(maxValue) : undefined,
      deadlineFrom,
      deadlineTo,
      sort,
    });
  }

  @Post('opportunities/:orderId/interest')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPPLIER)
  async expressInterest(
    @CurrentUser('id') userId: string,
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Body('message') message?: string,
  ) {
    return this.suppliersService.expressInterest(userId, orderId, message);
  }

  // ========== BRAND INVITATION ENDPOINTS ==========

  /**
   * Validate CNPJ via Brasil API
   */
  @Get('validate-cnpj/:cnpj')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BRAND, UserRole.ADMIN)
  async validateCnpj(@Param('cnpj') cnpj: string) {
    return this.suppliersService.validateCnpj(cnpj);
  }

  /**
   * Invite a new supplier
   */
  @Post('invite')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BRAND)
  async inviteSupplier(
    @Body() dto: InviteSupplierDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.suppliersService.inviteSupplier(dto, user);
  }

  /**
   * List all invitations for current brand
   */
  @Get('invitations')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BRAND)
  async getInvitations(@CurrentUser() user: AuthUser) {
    return this.suppliersService.getInvitations(user.companyId);
  }

  /**
   * Resend an invitation
   */
  @Post('invitations/:id/resend')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BRAND)
  async resendInvitation(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ResendInvitationDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.suppliersService.resendInvitation(id, user, dto);
  }

  // ========== BRAND/ADMIN SEARCH ENDPOINTS ==========

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BRAND, UserRole.ADMIN)
  async search(@Query() filters: SupplierFilterDto) {
    return this.suppliersService.search(filters);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BRAND, UserRole.ADMIN)
  async getById(@Param('id', ParseUUIDPipe) id: string) {
    return this.suppliersService.getById(id);
  }

  // ========== CONSENT ENDPOINTS (Supplier only) ==========

  /**
   * Revoke document sharing consent for a relationship
   * This also terminates the relationship per LGPD requirements
   */
  @Post('relationships/:id/revoke-consent')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPPLIER)
  async revokeConsent(
    @Param('id', ParseUUIDPipe) relationshipId: string,
    @Body() dto: RevokeConsentDto,
    @CurrentUser('id') userId: string,
    @Req() req: Request,
  ) {
    const clientIp = req.headers['x-forwarded-for']?.toString().split(',')[0] || req.ip || 'unknown';
    return this.consentService.revokeConsent(relationshipId, userId, dto, clientIp);
  }

  /**
   * Get consent status for a relationship
   */
  @Get('relationships/:id/consent')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPPLIER, UserRole.BRAND)
  async getConsentStatus(
    @Param('id', ParseUUIDPipe) relationshipId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.consentService.getConsentStatus(relationshipId, userId);
  }

  /**
   * Update document sharing consent (grant consent without terminating relationship)
   */
  @Patch('relationships/:id/consent')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPPLIER)
  async updateConsent(
    @Param('id', ParseUUIDPipe) relationshipId: string,
    @Body('consent') consent: boolean,
    @CurrentUser('id') userId: string,
    @Req() req: Request,
  ) {
    const clientIp = req.headers['x-forwarded-for']?.toString().split(',')[0] || req.ip || 'unknown';
    return this.consentService.updateConsent(relationshipId, userId, consent, clientIp);
  }
}
