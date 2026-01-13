import { Controller, Get, Patch, Param, Query, Body, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole, CompanyStatus, OrderStatus } from '@prisma/client';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminController {
    constructor(private readonly adminService: AdminService) { }

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
    ) {
        return this.adminService.updateSupplierStatus(id, status);
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
}
