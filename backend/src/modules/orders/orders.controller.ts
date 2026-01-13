import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto, UpdateOrderStatusDto } from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole, OrderStatus } from '@prisma/client';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
    constructor(private readonly ordersService: OrdersService) { }

    // ========== BRAND ENDPOINTS ==========

    @Post()
    @UseGuards(RolesGuard)
    @Roles(UserRole.BRAND)
    async create(
        @Body() dto: CreateOrderDto,
        @CurrentUser('id') userId: string,
    ) {
        return this.ordersService.create(dto, userId);
    }

    @Get('brand')
    @UseGuards(RolesGuard)
    @Roles(UserRole.BRAND)
    async getBrandOrders(
        @CurrentUser('id') userId: string,
        @Query('status') status?: OrderStatus,
    ) {
        return this.ordersService.getMyOrders(userId, 'BRAND', status);
    }

    // ========== SUPPLIER ENDPOINTS ==========

    @Get('supplier')
    @UseGuards(RolesGuard)
    @Roles(UserRole.SUPPLIER)
    async getSupplierOrders(
        @CurrentUser('id') userId: string,
        @Query('status') status?: OrderStatus,
    ) {
        return this.ordersService.getMyOrders(userId, 'SUPPLIER', status);
    }

    @Patch(':id/accept')
    @UseGuards(RolesGuard)
    @Roles(UserRole.SUPPLIER)
    async accept(
        @Param('id') id: string,
        @CurrentUser('id') userId: string,
    ) {
        return this.ordersService.accept(id, userId);
    }

    @Patch(':id/reject')
    @UseGuards(RolesGuard)
    @Roles(UserRole.SUPPLIER)
    async reject(
        @Param('id') id: string,
        @CurrentUser('id') userId: string,
        @Body('reason') reason?: string,
    ) {
        return this.ordersService.reject(id, userId, reason);
    }

    // ========== COMMON ENDPOINTS ==========

    @Get(':id')
    async getById(
        @Param('id') id: string,
        @CurrentUser('id') userId: string,
    ) {
        return this.ordersService.getById(id, userId);
    }

    @Patch(':id/status')
    async updateStatus(
        @Param('id') id: string,
        @CurrentUser('id') userId: string,
        @Body() dto: UpdateOrderStatusDto,
    ) {
        return this.ordersService.updateStatus(id, userId, dto);
    }

    // ========== ADMIN ENDPOINTS ==========

    @Get()
    @UseGuards(RolesGuard)
    @Roles(UserRole.ADMIN)
    async getAllOrders(@Query('status') status?: OrderStatus) {
        return this.ordersService.getAllOrders(status);
    }
}
