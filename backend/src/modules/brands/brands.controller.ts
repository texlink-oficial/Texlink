import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { BrandsService } from './brands.service';
import { BrandOnboardingPhase2Dto, BrandOnboardingPhase3Dto } from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Marcas')
@ApiBearerAuth()
@Controller('brands')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.BRAND)
export class BrandsController {
  constructor(private readonly brandsService: BrandsService) {}

  @Get('profile')
  async getMyProfile(@CurrentUser('id') userId: string) {
    return this.brandsService.getMyProfile(userId);
  }

  @Patch('onboarding/phase2')
  async updatePhase2(
    @CurrentUser('id') userId: string,
    @Body() dto: BrandOnboardingPhase2Dto,
  ) {
    return this.brandsService.updatePhase2(userId, dto);
  }

  @Patch('onboarding/phase3')
  async updatePhase3(
    @CurrentUser('id') userId: string,
    @Body() dto: BrandOnboardingPhase3Dto,
  ) {
    return this.brandsService.updatePhase3(userId, dto);
  }

  @Patch('onboarding/complete')
  async completeOnboarding(@CurrentUser('id') userId: string) {
    return this.brandsService.completeOnboarding(userId);
  }
}
