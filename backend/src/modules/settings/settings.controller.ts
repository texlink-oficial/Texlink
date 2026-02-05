import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';
import { SettingsService } from './settings.service';
import {
  UpdateCompanyDataDto,
  UpdateBankAccountDto,
  UpdateNotificationSettingsDto,
  UpdateCapacityDto,
  ChangePasswordDto,
  CreateSuggestionDto,
} from './dto';

@Controller('settings')
@UseGuards(JwtAuthGuard)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  // ==================== COMPANY DATA ====================

  @Get('company')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPPLIER, UserRole.BRAND)
  async getCompanyData(@CurrentUser('id') userId: string) {
    return this.settingsService.getCompanyData(userId);
  }

  @Patch('company')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPPLIER, UserRole.BRAND)
  async updateCompanyData(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateCompanyDataDto,
  ) {
    return this.settingsService.updateCompanyData(userId, dto);
  }

  @Post('company/logo')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPPLIER, UserRole.BRAND)
  @UseInterceptors(FileInterceptor('file'))
  async uploadLogo(
    @CurrentUser('id') userId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const uploadedFile = {
      fieldname: file.fieldname,
      originalname: file.originalname,
      encoding: file.encoding,
      mimetype: file.mimetype,
      buffer: file.buffer,
      size: file.size,
    };
    return this.settingsService.uploadLogo(userId, uploadedFile);
  }

  // ==================== BANK ACCOUNT ====================

  @Get('bank-account')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPPLIER, UserRole.BRAND)
  async getBankAccount(@CurrentUser('id') userId: string) {
    return this.settingsService.getBankAccount(userId);
  }

  @Put('bank-account')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPPLIER, UserRole.BRAND)
  async updateBankAccount(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateBankAccountDto,
  ) {
    return this.settingsService.updateBankAccount(userId, dto);
  }

  // ==================== CAPACITY ====================

  @Get('capacity')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPPLIER)
  async getCapacitySettings(@CurrentUser('id') userId: string) {
    return this.settingsService.getCapacitySettings(userId);
  }

  @Patch('capacity')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPPLIER)
  async updateCapacitySettings(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateCapacityDto,
  ) {
    return this.settingsService.updateCapacitySettings(userId, dto);
  }

  // ==================== NOTIFICATIONS ====================

  @Get('notifications')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPPLIER, UserRole.BRAND)
  async getNotificationSettings(@CurrentUser('id') userId: string) {
    return this.settingsService.getNotificationSettings(userId);
  }

  @Patch('notifications')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPPLIER, UserRole.BRAND)
  async updateNotificationSettings(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateNotificationSettingsDto,
  ) {
    return this.settingsService.updateNotificationSettings(userId, dto);
  }

  // ==================== SECURITY ====================

  @Post('security/change-password')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPPLIER, UserRole.BRAND)
  async changePassword(
    @CurrentUser('id') userId: string,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.settingsService.changePassword(userId, dto);
  }

  // ==================== SUGGESTIONS ====================

  @Get('suggestions')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPPLIER, UserRole.BRAND)
  async getSuggestions(@CurrentUser('id') userId: string) {
    return this.settingsService.getSuggestions(userId);
  }

  @Post('suggestions')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPPLIER, UserRole.BRAND)
  async createSuggestion(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateSuggestionDto,
  ) {
    return this.settingsService.createSuggestion(userId, dto);
  }
}
