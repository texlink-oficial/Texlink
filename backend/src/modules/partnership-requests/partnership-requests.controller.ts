import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { PartnershipRequestsService } from './partnership-requests.service';
import {
  CreatePartnershipRequestDto,
  RespondPartnershipRequestDto,
  PartnershipRequestFilterDto,
} from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Solicitações de Parceria')
@ApiBearerAuth()
@Controller('partnership-requests')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PartnershipRequestsController {
  constructor(
    private readonly partnershipRequestsService: PartnershipRequestsService,
  ) {}

  /**
   * Create a new partnership request (Brand only)
   */
  @Post()
  @Roles(UserRole.BRAND)
  create(
    @Body() dto: CreatePartnershipRequestDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.partnershipRequestsService.create(dto, userId);
  }

  /**
   * Get requests sent by brand
   */
  @Get('sent')
  @Roles(UserRole.BRAND)
  findSent(
    @Query() filters: PartnershipRequestFilterDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.partnershipRequestsService.findSentByBrand(userId, filters);
  }

  /**
   * Get requests received by supplier
   */
  @Get('received')
  @Roles(UserRole.SUPPLIER)
  findReceived(
    @Query() filters: PartnershipRequestFilterDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.partnershipRequestsService.findReceivedBySupplier(userId, filters);
  }

  /**
   * Get pending requests count for supplier (for badge)
   */
  @Get('pending-count')
  @Roles(UserRole.SUPPLIER)
  getPendingCount(@CurrentUser('id') userId: string) {
    return this.partnershipRequestsService.getPendingCountForSupplier(userId);
  }

  /**
   * Check if there's an existing request or relationship with a supplier
   */
  @Get('check/:supplierId')
  @Roles(UserRole.BRAND)
  checkExisting(
    @Param('supplierId', ParseUUIDPipe) supplierId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.partnershipRequestsService.checkExisting(supplierId, userId);
  }

  /**
   * Check existing requests/relationships for multiple suppliers at once (batch)
   */
  @Post('check-batch')
  @Roles(UserRole.BRAND)
  checkExistingBatch(
    @Body() dto: { supplierIds: string[] },
    @CurrentUser('id') userId: string,
  ) {
    return this.partnershipRequestsService.checkExistingBatch(dto.supplierIds, userId);
  }

  /**
   * Get request by ID
   */
  @Get(':id')
  findById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.partnershipRequestsService.findById(id, userId);
  }

  /**
   * Respond to a request (Supplier only)
   */
  @Post(':id/respond')
  @Roles(UserRole.SUPPLIER)
  respond(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RespondPartnershipRequestDto,
    @CurrentUser('id') userId: string,
    @Req() req: Request,
  ) {
    const clientIp = req.headers['x-forwarded-for']?.toString().split(',')[0] || req.ip || 'unknown';
    return this.partnershipRequestsService.respond(id, dto, userId, clientIp);
  }

  /**
   * Cancel a pending request (Brand only)
   */
  @Post(':id/cancel')
  @Roles(UserRole.BRAND)
  cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.partnershipRequestsService.cancel(id, userId);
  }
}
