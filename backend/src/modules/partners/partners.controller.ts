import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Param,
    Body,
    Query,
    UseGuards,
} from '@nestjs/common';
import { PartnersService } from './partners.service';
import { CreatePartnerDto, UpdatePartnerDto } from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole, PartnerCategory } from '@prisma/client';

@Controller('partners')
export class PartnersController {
    constructor(private readonly partnersService: PartnersService) {}

    // ========== PUBLIC ENDPOINTS (for suppliers) ==========

    // List active partners
    @Get()
    @UseGuards(JwtAuthGuard)
    async findAllActive(@Query('category') category?: PartnerCategory) {
        return this.partnersService.findAllActive(category);
    }

    // Get categories with counts
    @Get('categories')
    @UseGuards(JwtAuthGuard)
    async getCategories() {
        return this.partnersService.getCategories();
    }

    // Get partner by ID (public)
    @Get(':id')
    @UseGuards(JwtAuthGuard)
    async findOnePublic(@Param('id') id: string) {
        return this.partnersService.findOnePublic(id);
    }

    // ========== ADMIN ENDPOINTS ==========

    // List all partners (admin)
    @Get('admin/all')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    async findAll(
        @Query('category') category?: PartnerCategory,
        @Query('isActive') isActive?: string,
    ) {
        const active = isActive === 'true' ? true : isActive === 'false' ? false : undefined;
        return this.partnersService.findAll(category, active);
    }

    // Get partner by ID (admin)
    @Get('admin/:id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    async findOne(@Param('id') id: string) {
        return this.partnersService.findOne(id);
    }

    // Create partner
    @Post('admin')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    async create(@Body() dto: CreatePartnerDto) {
        return this.partnersService.create(dto);
    }

    // Update partner
    @Patch('admin/:id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    async update(@Param('id') id: string, @Body() dto: UpdatePartnerDto) {
        return this.partnersService.update(id, dto);
    }

    // Delete partner
    @Delete('admin/:id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    async remove(@Param('id') id: string) {
        return this.partnersService.remove(id);
    }

    // Toggle active status
    @Patch('admin/:id/toggle')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    async toggleActive(@Param('id') id: string) {
        return this.partnersService.toggleActive(id);
    }

    // Update display order
    @Patch('admin/order')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    async updateOrder(@Body() items: { id: string; displayOrder: number }[]) {
        return this.partnersService.updateOrder(items);
    }
}
