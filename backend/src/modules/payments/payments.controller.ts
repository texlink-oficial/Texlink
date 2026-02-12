import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto, UpdatePaymentDto } from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Pagamentos')
@ApiBearerAuth()
@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('orders/:orderId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.BRAND)
  async create(
    @Param('orderId') orderId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreatePaymentDto,
  ) {
    return this.paymentsService.create(orderId, userId, dto);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdatePaymentDto,
  ) {
    return this.paymentsService.update(id, userId, dto);
  }

  @Get('orders/:orderId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.BRAND, UserRole.SUPPLIER, UserRole.ADMIN)
  async getOrderPayments(
    @Param('orderId') orderId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.paymentsService.getOrderPayments(orderId, userId);
  }

  @Get('summary')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPPLIER)
  async getFinancialSummary(@CurrentUser('id') userId: string) {
    return this.paymentsService.getSupplierFinancialSummary(userId);
  }
}
