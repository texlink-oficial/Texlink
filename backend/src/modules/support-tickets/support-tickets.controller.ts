import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { SupportTicketsService } from './support-tickets.service';
import { CreateTicketDto, SendMessageDto, UpdateTicketDto } from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  UserRole,
  SupportTicketStatus,
  SupportTicketCategory,
  SupportTicketPriority,
  CompanyType,
} from '@prisma/client';

@ApiTags('Suporte')
@ApiBearerAuth()
@Controller('support-tickets')
@UseGuards(JwtAuthGuard)
export class SupportTicketsController {
  constructor(private readonly supportTicketsService: SupportTicketsService) {}

  // ========== ADMIN ENDPOINTS (must be before parameterized routes) ==========

  // Get all tickets (admin)
  @Get('admin/all')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async getAllTickets(
    @Query('status') status?: SupportTicketStatus,
    @Query('priority') priority?: SupportTicketPriority,
    @Query('category') category?: SupportTicketCategory,
    @Query('companyId') companyId?: string,
    @Query('assignedToId') assignedToId?: string,
    @Query('companyType') companyType?: CompanyType,
  ) {
    return this.supportTicketsService.getAllTickets(
      status,
      priority,
      category,
      companyId,
      assignedToId,
      companyType,
    );
  }

  // Get stats (admin)
  @Get('admin/stats')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async getStats() {
    return this.supportTicketsService.getStats();
  }

  // Update ticket (admin)
  @Patch('admin/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async updateTicket(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTicketDto,
  ) {
    return this.supportTicketsService.updateTicket(id, dto, req.user.id);
  }

  // Reply as support (admin)
  @Post('admin/:id/messages')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async replyAsSupport(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.supportTicketsService.replyAsSupport(id, req.user.id, dto);
  }

  // ========== SUPPLIER/BRAND ENDPOINTS ==========

  // Create a new ticket
  @Post()
  async create(@Request() req, @Body() dto: CreateTicketDto) {
    return this.supportTicketsService.create(
      dto,
      req.user.id,
      req.user.companyId,
    );
  }

  // Get my tickets
  @Get()
  async getMyTickets(
    @Request() req,
    @Query('status') status?: SupportTicketStatus,
    @Query('category') category?: SupportTicketCategory,
  ) {
    return this.supportTicketsService.getMyTickets(
      req.user.companyId,
      status,
      category,
    );
  }

  // Get ticket by ID (must be after static routes)
  @Get(':id')
  async getById(@Request() req, @Param('id', ParseUUIDPipe) id: string) {
    return this.supportTicketsService.getById(
      id,
      req.user.id,
      req.user.companyId,
      req.user.role,
    );
  }

  // Add message to ticket
  @Post(':id/messages')
  async addMessage(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.supportTicketsService.addMessage(
      id,
      req.user.id,
      req.user.companyId,
      req.user.role,
      dto,
    );
  }

  // Get messages for a ticket
  @Get(':id/messages')
  async getMessages(@Request() req, @Param('id', ParseUUIDPipe) id: string) {
    return this.supportTicketsService.getMessages(
      id,
      req.user.id,
      req.user.companyId,
      req.user.role,
    );
  }

  // Close ticket
  @Patch(':id/close')
  async closeTicket(@Request() req, @Param('id', ParseUUIDPipe) id: string) {
    return this.supportTicketsService.closeTicket(
      id,
      req.user.id,
      req.user.companyId,
      req.user.role,
    );
  }
}
