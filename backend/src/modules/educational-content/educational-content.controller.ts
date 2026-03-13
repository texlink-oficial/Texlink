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
  UseInterceptors,
  UploadedFile as NestUploadedFile,
  ParseUUIDPipe,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
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

  @Get()
  @UseGuards(JwtAuthGuard)
  async findAllActive(
    @Query('category') category?: EducationalContentCategory,
    @Query('type') contentType?: EducationalContentType,
  ) {
    return this.educationalContentService.findAllActive(category, contentType);
  }

  @Get('categories')
  @UseGuards(JwtAuthGuard)
  async getCategories() {
    return this.educationalContentService.getCategories();
  }

  // Video URL endpoint (presigned for S3, direct for external) — must be before :id
  @Get(':id/video-url')
  @UseGuards(JwtAuthGuard)
  async getVideoUrl(@Param('id', ParseUUIDPipe) id: string) {
    return this.educationalContentService.getVideoUrl(id);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findOnePublic(@Param('id', ParseUUIDPipe) id: string) {
    return this.educationalContentService.findOnePublic(id);
  }

  // ========== ADMIN ENDPOINTS ==========

  // Upload endpoints must be before admin/:id to avoid route conflicts

  @Post('admin/upload/video')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  async uploadVideo(@NestUploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Nenhum arquivo de vídeo enviado.');
    }
    return this.educationalContentService.uploadVideo(file);
  }

  @Post('admin/upload/thumbnail')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  async uploadThumbnail(@NestUploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Nenhum arquivo de thumbnail enviado.');
    }
    return this.educationalContentService.uploadThumbnail(file);
  }

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

  @Get('admin/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.educationalContentService.findOne(id);
  }

  @Post('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async create(@Body() dto: CreateEducationalContentDto) {
    return this.educationalContentService.create(dto);
  }

  @Patch('admin/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEducationalContentDto,
  ) {
    return this.educationalContentService.update(id, dto);
  }

  @Delete('admin/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.educationalContentService.remove(id);
  }

  @Patch('admin/:id/toggle')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async toggleActive(@Param('id', ParseUUIDPipe) id: string) {
    return this.educationalContentService.toggleActive(id);
  }

  @Patch('admin/order')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async updateOrder(@Body() items: { id: string; displayOrder: number }[]) {
    return this.educationalContentService.updateOrder(items);
  }
}
