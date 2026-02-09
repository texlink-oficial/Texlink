import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole, CompanyStatus, OrderStatus, SupplierDocumentType, SupplierDocumentStatus } from '@prisma/client';
import { AdminCreateCompanyDto, AdminUpdateCompanyDto, AddUserToCompanyDto } from './dto';

@ApiTags('Admin')
@ApiBearerAuth()
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard')
  async getDashboard() {
    return this.adminService.getDashboard();
  }

  @Get('approvals')
  async getPendingApprovals() {
    return this.adminService.getPendingApprovals();
  }

  @Patch('suppliers/:id/status')
  async updateSupplierStatus(
    @Param('id') id: string,
    @Body('status') status: CompanyStatus,
    @Body('reason') reason: string,
    @CurrentUser() user: any,
  ) {
    return this.adminService.updateSupplierStatus(id, status, user.id, reason);
  }

  @Get('actions')
  async getAdminActions(@Query('limit') limit?: string) {
    return this.adminService.getAdminActions(limit ? parseInt(limit, 10) : 50);
  }

  @Get('suppliers')
  async getSuppliers(@Query('status') status?: CompanyStatus) {
    return this.adminService.getSuppliers(status);
  }

  @Get('brands')
  async getBrands(@Query('status') status?: CompanyStatus) {
    return this.adminService.getBrands(status);
  }

  @Get('orders')
  async getOrders(@Query('status') status?: OrderStatus) {
    return this.adminService.getOrders(status);
  }

  @Get('documents')
  async getAllDocuments(
    @Query('supplierId') supplierId?: string,
    @Query('type') type?: SupplierDocumentType,
    @Query('status') status?: SupplierDocumentStatus,
  ) {
    return this.adminService.getAllDocuments(supplierId, type, status);
  }

  @Get('documents/stats')
  async getDocumentsStats() {
    return this.adminService.getDocumentsStats();
  }

  @Get('documents/:id/download')
  async getDocumentDownloadUrl(@Param('id') id: string) {
    return this.adminService.getDocumentDownloadUrl(id);
  }

  @Get('suppliers/:id/documents')
  async getSupplierDocuments(@Param('id') supplierId: string) {
    return this.adminService.getSupplierDocuments(supplierId);
  }

  @Get('dashboard/revenue-history')
  async getRevenueHistory(@Query('months') months?: string) {
    return this.adminService.getRevenueHistory(
      months ? parseInt(months, 10) : 6,
    );
  }

  @Get('dashboard/orders-stats')
  async getOrdersMonthlyStats(@Query('months') months?: string) {
    return this.adminService.getOrdersMonthlyStats(
      months ? parseInt(months, 10) : 6,
    );
  }

  // ========== Company CRUD ==========

  @Post('companies')
  async createCompany(
    @Body() dto: AdminCreateCompanyDto,
    @CurrentUser() user: any,
  ) {
    return this.adminService.createCompany(dto, user.id);
  }

  @Patch('companies/:id')
  async updateCompany(
    @Param('id') id: string,
    @Body() dto: AdminUpdateCompanyDto,
    @CurrentUser() user: any,
  ) {
    return this.adminService.updateCompany(id, dto, user.id);
  }

  @Post('companies/:id/users')
  async addUserToCompany(
    @Param('id') id: string,
    @Body() dto: AddUserToCompanyDto,
    @CurrentUser() user: any,
  ) {
    return this.adminService.addUserToCompany(id, dto, user.id);
  }

  @Delete('companies/:id/users/:userId')
  async removeUserFromCompany(
    @Param('id') id: string,
    @Param('userId') userId: string,
  ) {
    return this.adminService.removeUserFromCompany(id, userId);
  }
}
