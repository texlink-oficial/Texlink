import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { DataDeletionService } from './data-deletion.service';
import { RequestDeletionDto } from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Exclusão de Dados (LGPD)')
@ApiBearerAuth()
@Controller()
@UseGuards(JwtAuthGuard)
export class DataDeletionController {
  constructor(private readonly dataDeletionService: DataDeletionService) {}

  // ========== User endpoints ==========

  @Post('users/me/deletion-request')
  async requestDeletion(
    @CurrentUser('id') userId: string,
    @Body() dto: RequestDeletionDto,
  ) {
    return this.dataDeletionService.requestDeletion(userId, dto.reason);
  }

  @Get('users/me/deletion-requests')
  async getMyRequests(@CurrentUser('id') userId: string) {
    return this.dataDeletionService.getMyRequests(userId);
  }

  // ========== Admin endpoints ==========

  @Get('admin/deletion-requests')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async getPendingRequests() {
    return this.dataDeletionService.getPendingRequests();
  }

  @Post('admin/deletion-requests/:id/process')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async processDeletion(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') adminId: string,
  ) {
    return this.dataDeletionService.processDeletion(id, adminId);
  }
}
