import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import {
  CreateOrderDto,
  UpdateOrderStatusDto,
  CreateReviewDto,
  CreateChildOrderDto,
  SecondQualityItemDto,
} from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole, OrderStatus } from '@prisma/client';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  // ========== BRAND ENDPOINTS ==========

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.BRAND)
  async create(@Body() dto: CreateOrderDto, @CurrentUser('id') userId: string) {
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
  async accept(@Param('id') id: string, @CurrentUser('id') userId: string) {
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

  @Get(':id/transitions')
  async getTransitions(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.ordersService.getAvailableTransitions(id, userId);
  }

  @Get(':id')
  async getById(@Param('id') id: string, @CurrentUser('id') userId: string) {
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

  // ========== ORDER REVIEW ENDPOINTS ==========

  // Create a review for an order
  @Post(':id/reviews')
  async createReview(
    @Param('id') orderId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateReviewDto,
  ) {
    return this.ordersService.createReview(orderId, userId, dto);
  }

  // Get all reviews for an order
  @Get(':id/reviews')
  async getOrderReviews(@Param('id') orderId: string) {
    return this.ordersService.getOrderReviews(orderId);
  }

  // Create child order for rework
  @Post(':id/child-orders')
  async createChildOrder(
    @Param('id') parentOrderId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateChildOrderDto,
  ) {
    return this.ordersService.createChildOrder(parentOrderId, userId, dto);
  }

  // Get order hierarchy (parent + children)
  @Get(':id/hierarchy')
  async getOrderHierarchy(
    @Param('id') orderId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.ordersService.getOrderHierarchy(orderId, userId);
  }

  // Add second quality items
  @Post(':id/second-quality')
  async addSecondQualityItems(
    @Param('id') orderId: string,
    @CurrentUser('id') userId: string,
    @Body() items: SecondQualityItemDto[],
  ) {
    return this.ordersService.addSecondQualityItems(orderId, userId, items);
  }

  // Get second quality items
  @Get(':id/second-quality')
  async getSecondQualityItems(@Param('id') orderId: string) {
    return this.ordersService.getSecondQualityItems(orderId);
  }

  // Get review statistics
  @Get('stats/reviews')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.BRAND)
  async getReviewStats(@Query('companyId') companyId?: string) {
    return this.ordersService.getReviewStats(companyId);
  }

  // Get monthly statistics for brand dashboard
  @Get('stats/monthly/brand')
  @UseGuards(RolesGuard)
  @Roles(UserRole.BRAND)
  async getBrandMonthlyStats(
    @CurrentUser('id') userId: string,
    @Query('months') months?: string,
  ) {
    return this.ordersService.getMonthlyStats(
      userId,
      'BRAND',
      months ? parseInt(months, 10) : 6,
    );
  }

  // Get monthly statistics for supplier dashboard
  @Get('stats/monthly/supplier')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPPLIER)
  async getSupplierMonthlyStats(
    @CurrentUser('id') userId: string,
    @Query('months') months?: string,
  ) {
    return this.ordersService.getMonthlyStats(
      userId,
      'SUPPLIER',
      months ? parseInt(months, 10) : 6,
    );
  }
}
