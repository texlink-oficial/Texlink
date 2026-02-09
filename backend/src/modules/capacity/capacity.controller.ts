import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';
import { CapacityService } from './capacity.service';
import { UpdateCapacityConfigDto } from './dto/update-capacity-config.dto';
import { CalendarQueryDto } from './dto/calendar-query.dto';
import { AcceptOrderCapacityDto } from './dto/accept-order-capacity.dto';

@ApiTags('Capacidade')
@ApiBearerAuth()
@Controller('capacity')
@UseGuards(JwtAuthGuard)
export class CapacityController {
  constructor(private readonly capacityService: CapacityService) {}

  // ==================== CONFIG ====================

  @Get('config')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPPLIER)
  async getConfig(@CurrentUser('id') userId: string) {
    return this.capacityService.getConfig(userId);
  }

  @Patch('config')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPPLIER)
  async updateConfig(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateCapacityConfigDto,
  ) {
    return this.capacityService.updateConfig(userId, dto);
  }

  // ==================== CALENDAR ====================

  @Get('calendar')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPPLIER)
  async getCalendar(
    @CurrentUser('id') userId: string,
    @Query() query: CalendarQueryDto,
  ) {
    return this.capacityService.getCalendar(userId, query);
  }

  // ==================== ACCEPT ORDER ====================

  @Post('accept-order')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPPLIER)
  async acceptOrderWithCapacity(
    @CurrentUser('id') userId: string,
    @Body() dto: AcceptOrderCapacityDto,
  ) {
    return this.capacityService.acceptOrderWithCapacity(userId, dto);
  }
}
