import {
  Controller,
  Post,
  Get,
  Patch,
  Param,
  Body,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto, UpdateProfileDto, ForgotPasswordDto, ResetPasswordDto, ToggleSuperAdminDto } from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  ThrottleAuth,
  ThrottleRead,
} from '../../common/decorators/throttle.decorator';
import { IntegrationService } from '../integrations/services/integration.service';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/audit-actions.enum';

@ApiTags('Autenticação')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly integrationService: IntegrationService,
    private readonly auditService: AuditService,
  ) {}

  @Get('cnpj-lookup/:cnpj')
  @ThrottleAuth() // 5 requests per minute - prevent abuse
  async cnpjLookup(@Param('cnpj') cnpj: string) {
    const clean = cnpj.replace(/\D/g, '');
    if (clean.length !== 14) {
      throw new BadRequestException('CNPJ deve conter 14 dígitos.');
    }
    const result = await this.integrationService.validateCNPJ(clean);
    if (!result.isValid || !result.data) {
      return { found: false, error: result.error };
    }
    return {
      found: true,
      razaoSocial: result.data.razaoSocial,
      nomeFantasia: result.data.nomeFantasia || null,
      cidade: result.data.endereco?.municipio || null,
      estado: result.data.endereco?.uf || null,
      situacao: result.data.situacao,
    };
  }

  @Post('register')
  @ThrottleAuth() // 5 requests per minute - prevent mass registration
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ThrottleAuth() // 5 requests per minute - prevent brute force
  async login(@Body() dto: LoginDto, @Req() req: Request) {
    const ipAddress = req.ip;
    const userAgent = req.headers['user-agent'];

    try {
      const result = await this.authService.login(dto);

      this.auditService.log({
        action: AuditAction.LOGIN_SUCCESS,
        userId: result.user.id,
        companyId: result.user.companyId,
        ipAddress,
        userAgent,
        metadata: { email: dto.email },
      });

      return result;
    } catch (error) {
      this.auditService.log({
        action: AuditAction.LOGIN_FAILED,
        ipAddress,
        userAgent,
        metadata: { email: dto.email, reason: error.message },
      });

      throw error;
    }
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ThrottleAuth() // 5 requests per minute - prevent abuse
  async forgotPassword(@Body() dto: ForgotPasswordDto, @Req() req: Request) {
    const result = await this.authService.forgotPassword(dto);

    this.auditService.log({
      action: AuditAction.PASSWORD_RESET_REQUESTED,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      metadata: { email: dto.email },
    });

    return result;
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ThrottleAuth() // 5 requests per minute - prevent brute force
  async resetPassword(@Body() dto: ResetPasswordDto, @Req() req: Request) {
    const result = await this.authService.resetPassword(dto);

    this.auditService.log({
      action: AuditAction.PASSWORD_CHANGED,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      metadata: { method: 'reset' },
    });

    return result;
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ThrottleRead() // 60 requests per minute - normal read operation
  async getProfile(@CurrentUser('id') userId: string) {
    return this.authService.getProfile(userId);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  @ThrottleAuth()
  async updateProfile(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.authService.updateProfile(userId, dto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ThrottleAuth() // 5 requests per minute
  async refreshTokens(@Body('refreshToken') refreshToken: string) {
    if (!refreshToken) {
      throw new BadRequestException('Token de renovação é obrigatório');
    }
    return this.authService.refreshTokens(refreshToken);
  }

  @Post('superadmin')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ThrottleAuth()
  async toggleSuperAdmin(
    @CurrentUser('id') userId: string,
    @Body() dto: ToggleSuperAdminDto,
  ) {
    return this.authService.toggleSuperAdmin(userId, dto.password, dto.targetUserId);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async logout(
    @Body('refreshToken') refreshToken: string,
    @CurrentUser('id') userId: string,
    @Req() req: Request,
  ) {
    if (refreshToken) {
      await this.authService.logout(refreshToken);
    }

    this.auditService.log({
      action: AuditAction.LOGOUT,
      userId,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return { message: 'Logged out successfully' };
  }
}
