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
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { EducationalContentService } from './educational-content.service';
import {
  CreateEducationalContentDto,
  UpdateEducationalContentDto,
} from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  UserRole,
  EducationalContentType,
  EducationalContentCategory,
} from '@prisma/client';

@ApiTags('Conteúdo Educacional')
@ApiBearerAuth()
@Controller('educational-content')
export class EducationalContentController {
  constructor(
    private readonly educationalContentService: EducationalContentService,
  ) {}

  // ========== PUBLIC ENDPOINTS (for suppliers) ==========

  // List active educational contents
  @Get()
  @UseGuards(JwtAuthGuard)
  async findAllActive(
    @Query('category') category?: EducationalContentCategory,
    @Query('type') contentType?: EducationalContentType,
  ) {
    return this.educationalContentService.findAllActive(category, contentType);
  }

  // Get categories with counts
  @Get('categories')
  @UseGuards(JwtAuthGuard)
  async getCategories() {
    return this.educationalContentService.getCategories();
  }

  // Get content by ID (public)
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findOnePublic(@Param('id', ParseUUIDPipe) id: string) {
    return this.educationalContentService.findOnePublic(id);
  }

  // ========== ADMIN ENDPOINTS ==========

  // List all educational contents (admin)
  @Get('admin/all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async findAll(
    @Query('category') category?: EducationalContentCategory,
    @Query('type') contentType?: EducationalContentType,
    @Query('isActive') isActive?: string,
  ) {
    const active =
      isActive === 'true' ? true : isActive === 'false' ? false : undefined;
    return this.educationalContentService.findAll(
      category,
      contentType,
      active,
    );
  }

  // Get content by ID (admin)
  @Get('admin/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.educationalContentService.findOne(id);
  }

  // Create educational content
  @Post('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async create(@Body() dto: CreateEducationalContentDto) {
    return this.educationalContentService.create(dto);
  }

  // Update educational content
  @Patch('admin/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEducationalContentDto,
  ) {
    return this.educationalContentService.update(id, dto);
  }

  // Delete educational content
  @Delete('admin/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.educationalContentService.remove(id);
  }

  // Toggle active status
  @Patch('admin/:id/toggle')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async toggleActive(@Param('id', ParseUUIDPipe) id: string) {
    return this.educationalContentService.toggleActive(id);
  }

  // Update display order
  @Patch('admin/order')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async updateOrder(@Body() items: { id: string; displayOrder: number }[]) {
    return this.educationalContentService.updateOrder(items);
  }
}
