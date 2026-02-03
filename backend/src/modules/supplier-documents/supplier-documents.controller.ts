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
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { SupplierDocumentsService } from './supplier-documents.service';
import { CreateSupplierDocumentDto, UpdateSupplierDocumentDto } from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  UserRole,
  SupplierDocumentType,
  SupplierDocumentStatus,
} from '@prisma/client';

@Controller('supplier-documents')
@UseGuards(JwtAuthGuard)
export class SupplierDocumentsController {
  constructor(
    private readonly supplierDocumentsService: SupplierDocumentsService,
  ) {}

  // List all documents for the supplier's company
  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPPLIER)
  async findAll(
    @CurrentUser('id') userId: string,
    @Query('type') type?: SupplierDocumentType,
    @Query('status') status?: SupplierDocumentStatus,
  ) {
    return this.supplierDocumentsService.findAll(userId, type, status);
  }

  // Get document summary (counts by status)
  @Get('summary')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPPLIER)
  async getSummary(@CurrentUser('id') userId: string) {
    return this.supplierDocumentsService.getSummary(userId);
  }

  // Get document checklist (all types with their status)
  @Get('checklist')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPPLIER)
  async getChecklist(@CurrentUser('id') userId: string) {
    return this.supplierDocumentsService.getDocumentChecklist(userId);
  }

  // Get a specific document
  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPPLIER)
  async findOne(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.supplierDocumentsService.findOne(id, userId);
  }

  // Create a document placeholder (without file)
  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPPLIER)
  async create(
    @Body() dto: CreateSupplierDocumentDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.supplierDocumentsService.create(dto, userId);
  }

  // Create a document with file upload
  @Post('upload')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPPLIER)
  @UseInterceptors(FileInterceptor('file'))
  async createWithFile(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: CreateSupplierDocumentDto,
    @CurrentUser('id') userId: string,
  ) {
    const uploadedFile = {
      fieldname: file.fieldname,
      originalname: file.originalname,
      encoding: file.encoding,
      mimetype: file.mimetype,
      buffer: file.buffer,
      size: file.size,
    };
    return this.supplierDocumentsService.createWithFile(
      dto,
      uploadedFile,
      userId,
    );
  }

  // Upload/replace file for an existing document
  @Patch(':id/upload')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPPLIER)
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser('id') userId: string,
  ) {
    const uploadedFile = {
      fieldname: file.fieldname,
      originalname: file.originalname,
      encoding: file.encoding,
      mimetype: file.mimetype,
      buffer: file.buffer,
      size: file.size,
    };
    return this.supplierDocumentsService.uploadFile(id, uploadedFile, userId);
  }

  // Update document metadata
  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPPLIER)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateSupplierDocumentDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.supplierDocumentsService.update(id, dto, userId);
  }

  // Delete a document
  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPPLIER)
  async remove(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.supplierDocumentsService.remove(id, userId);
  }

  // Get supplier documents for a brand (requires active relationship)
  @Get('brand/suppliers/:supplierId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.BRAND)
  async getSupplierDocumentsForBrand(
    @Param('supplierId') supplierId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.supplierDocumentsService.getSupplierDocumentsForBrand(
      supplierId,
      userId,
    );
  }
}
