import { Controller, Get, Patch, Param, Body, Query, UseGuards } from '@nestjs/common';
import { SuppliersService } from './suppliers.service';
import { OnboardingPhase2Dto, OnboardingPhase3Dto, SupplierFilterDto } from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@Controller('suppliers')
@UseGuards(JwtAuthGuard)
export class SuppliersController {
    constructor(private readonly suppliersService: SuppliersService) { }

    // ========== SUPPLIER ENDPOINTS ==========

    @Get('profile')
    @UseGuards(RolesGuard)
    @Roles(UserRole.SUPPLIER)
    async getMyProfile(@CurrentUser('id') userId: string) {
        return this.suppliersService.getMyProfile(userId);
    }

    @Patch('onboarding/phase2')
    @UseGuards(RolesGuard)
    @Roles(UserRole.SUPPLIER)
    async updatePhase2(
        @CurrentUser('id') userId: string,
        @Body() dto: OnboardingPhase2Dto,
    ) {
        return this.suppliersService.updatePhase2(userId, dto);
    }

    @Patch('onboarding/phase3')
    @UseGuards(RolesGuard)
    @Roles(UserRole.SUPPLIER)
    async updatePhase3(
        @CurrentUser('id') userId: string,
        @Body() dto: OnboardingPhase3Dto,
    ) {
        return this.suppliersService.updatePhase3(userId, dto);
    }

    @Get('dashboard')
    @UseGuards(RolesGuard)
    @Roles(UserRole.SUPPLIER)
    async getDashboard(@CurrentUser('id') userId: string) {
        return this.suppliersService.getDashboard(userId);
    }

    @Get('opportunities')
    @UseGuards(RolesGuard)
    @Roles(UserRole.SUPPLIER)
    async getOpportunities(@CurrentUser('id') userId: string) {
        return this.suppliersService.getOpportunities(userId);
    }

    // ========== BRAND/ADMIN ENDPOINTS ==========

    @Get()
    @UseGuards(RolesGuard)
    @Roles(UserRole.BRAND, UserRole.ADMIN)
    async search(@Query() filters: SupplierFilterDto) {
        return this.suppliersService.search(filters);
    }

    @Get(':id')
    @UseGuards(RolesGuard)
    @Roles(UserRole.BRAND, UserRole.ADMIN)
    async getById(@Param('id') id: string) {
        return this.suppliersService.getById(id);
    }
}
