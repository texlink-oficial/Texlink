import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { FavoritesService } from './favorites.service';
import {
  CreateTemplateDto,
  UpdateTemplateDto,
  CreateFavoriteSupplierDto,
  UpdateFavoriteSupplierDto,
  CreatePaymentPresetDto,
  UpdatePaymentPresetDto,
} from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Favoritos')
@ApiBearerAuth()
@Controller('favorites')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.BRAND)
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  // ==================== PRODUCT TEMPLATES ====================

  @Get('templates')
  async getTemplates(@CurrentUser('id') userId: string) {
    return this.favoritesService.getTemplates(userId);
  }

  @Get('templates/:id')
  async getTemplateById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.favoritesService.getTemplateById(id, userId);
  }

  @Post('templates')
  async createTemplate(
    @Body() dto: CreateTemplateDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.favoritesService.createTemplate(dto, userId);
  }

  @Patch('templates/:id')
  async updateTemplate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTemplateDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.favoritesService.updateTemplate(id, dto, userId);
  }

  @Delete('templates/:id')
  async deleteTemplate(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.favoritesService.deleteTemplate(id, userId);
  }

  // ==================== FAVORITE SUPPLIERS ====================

  @Get('suppliers')
  async getFavoriteSuppliers(@CurrentUser('id') userId: string) {
    return this.favoritesService.getFavoriteSuppliers(userId);
  }

  @Post('suppliers')
  async addFavoriteSupplier(
    @Body() dto: CreateFavoriteSupplierDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.favoritesService.addFavoriteSupplier(dto, userId);
  }

  @Patch('suppliers/:supplierId')
  async updateFavoriteSupplier(
    @Param('supplierId', ParseUUIDPipe) supplierId: string,
    @Body() dto: UpdateFavoriteSupplierDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.favoritesService.updateFavoriteSupplier(
      supplierId,
      dto,
      userId,
    );
  }

  @Delete('suppliers/:supplierId')
  async removeFavoriteSupplier(
    @Param('supplierId', ParseUUIDPipe) supplierId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.favoritesService.removeFavoriteSupplier(supplierId, userId);
  }

  @Get('suppliers/:supplierId/check')
  async isFavoriteSupplier(
    @Param('supplierId', ParseUUIDPipe) supplierId: string,
    @CurrentUser('id') userId: string,
  ) {
    const isFavorite = await this.favoritesService.isFavoriteSupplier(
      supplierId,
      userId,
    );
    return { isFavorite };
  }

  // ==================== PAYMENT TERMS PRESETS ====================

  @Get('payment-presets')
  async getPaymentPresets(@CurrentUser('id') userId: string) {
    return this.favoritesService.getPaymentPresets(userId);
  }

  @Post('payment-presets')
  async createPaymentPreset(
    @Body() dto: CreatePaymentPresetDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.favoritesService.createPaymentPreset(dto, userId);
  }

  @Patch('payment-presets/:id')
  async updatePaymentPreset(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePaymentPresetDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.favoritesService.updatePaymentPreset(id, dto, userId);
  }

  @Delete('payment-presets/:id')
  async deletePaymentPreset(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.favoritesService.deletePaymentPreset(id, userId);
  }
}
