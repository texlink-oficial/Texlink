import {
  Controller,
  Post,
  Get,
  Patch,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto, UpdateProfileDto, ForgotPasswordDto, ResetPasswordDto } from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  ThrottleAuth,
  ThrottleRead,
} from '../../common/decorators/throttle.decorator';
import { IntegrationService } from '../integrations/services/integration.service';

@ApiTags('Autenticação')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly integrationService: IntegrationService,
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
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ThrottleAuth() // 5 requests per minute - prevent abuse
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ThrottleAuth() // 5 requests per minute - prevent brute force
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
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

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async logout(@Body('refreshToken') refreshToken: string) {
    if (refreshToken) {
      await this.authService.logout(refreshToken);
    }
    return { message: 'Logged out successfully' };
  }
}
