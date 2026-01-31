import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTicketDto, SendMessageDto, UpdateTicketDto } from './dto';
import { SupportTicketStatus, SupportTicketCategory, SupportTicketPriority, UserRole } from '@prisma/client';

@Injectable()
export class SupportTicketsService {
    constructor(private readonly prisma: PrismaService) {}

    // ========== SUPPLIER/BRAND ENDPOINTS ==========

    // Create a new ticket
    async create(dto: CreateTicketDto, userId: string, companyId: string) {
        const displayId = await this.generateDisplayId();

        const ticket = await this.prisma.supportTicket.create({
            data: {
                displayId,
                title: dto.title,
                description: dto.description,
                category: dto.category,
                priority: dto.priority || SupportTicketPriority.MEDIA,
                companyId,
                createdById: userId,
            },
            include: {
                createdBy: { select: { id: true, name: true } },
                company: { select: { id: true, tradeName: true } },
            },
        });

        // Add initial message with description and attachments
        if (dto.attachments?.length) {
            await this.prisma.supportTicketMessage.create({
                data: {
                    ticketId: ticket.id,
                    senderId: userId,
                    content: dto.description,
                    attachments: dto.attachments,
                    isFromSupport: false,
                },
            });
        }

        // Create status history entry
        await this.prisma.supportTicketStatusHistory.create({
            data: {
                ticketId: ticket.id,
                toStatus: SupportTicketStatus.ABERTO,
                changedById: userId,
                notes: 'Chamado criado',
            },
        });

        return ticket;
    }

    // Get my tickets (for company)
    async getMyTickets(
        companyId: string,
        status?: SupportTicketStatus,
        category?: SupportTicketCategory,
    ) {
        return this.prisma.supportTicket.findMany({
            where: {
                companyId,
                ...(status && { status }),
                ...(category && { category }),
            },
            include: {
                createdBy: { select: { id: true, name: true } },
                assignedTo: { select: { id: true, name: true } },
                _count: { select: { messages: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    // Get ticket by ID (with access check)
    async getById(id: string, userId: string, companyId: string, userRole: UserRole) {
        const ticket = await this.prisma.supportTicket.findUnique({
            where: { id },
            include: {
                createdBy: { select: { id: true, name: true } },
                assignedTo: { select: { id: true, name: true } },
                company: { select: { id: true, tradeName: true } },
                _count: { select: { messages: true } },
            },
        });

        if (!ticket) {
            throw new NotFoundException('Chamado não encontrado');
        }

        // Check access: only company members or admin can see
        if (userRole !== UserRole.ADMIN && ticket.companyId !== companyId) {
            throw new ForbiddenException('Acesso negado');
        }

        return ticket;
    }

    // Add message to ticket
    async addMessage(
        ticketId: string,
        userId: string,
        companyId: string,
        userRole: UserRole,
        dto: SendMessageDto,
    ) {
        const ticket = await this.prisma.supportTicket.findUnique({
            where: { id: ticketId },
        });

        if (!ticket) {
            throw new NotFoundException('Chamado não encontrado');
        }

        // Check access
        if (userRole !== UserRole.ADMIN && ticket.companyId !== companyId) {
            throw new ForbiddenException('Acesso negado');
        }

        // Check if ticket is closed
        if (ticket.status === SupportTicketStatus.FECHADO) {
            throw new ForbiddenException('Não é possível enviar mensagens em um chamado fechado');
        }

        const isFromSupport = userRole === UserRole.ADMIN;

        const message = await this.prisma.supportTicketMessage.create({
            data: {
                ticketId,
                senderId: userId,
                content: dto.content,
                attachments: dto.attachments || [],
                isFromSupport,
                isInternal: dto.isInternal || false,
            },
            include: {
                sender: { select: { id: true, name: true } },
            },
        });

        // Update ticket status based on who sent the message
        const newStatus = isFromSupport
            ? SupportTicketStatus.AGUARDANDO_RESPOSTA
            : SupportTicketStatus.EM_ANDAMENTO;

        if (ticket.status !== newStatus && ticket.status !== SupportTicketStatus.RESOLVIDO) {
            await this.updateTicketStatus(ticketId, ticket.status, newStatus, userId);
        }

        return message;
    }

    // Get messages for a ticket
    async getMessages(ticketId: string, userId: string, companyId: string, userRole: UserRole) {
        const ticket = await this.prisma.supportTicket.findUnique({
            where: { id: ticketId },
        });

        if (!ticket) {
            throw new NotFoundException('Chamado não encontrado');
        }

        // Check access
        if (userRole !== UserRole.ADMIN && ticket.companyId !== companyId) {
            throw new ForbiddenException('Acesso negado');
        }

        const isAdmin = userRole === UserRole.ADMIN;

        return this.prisma.supportTicketMessage.findMany({
            where: {
                ticketId,
                // Hide internal messages from non-admin users
                ...(isAdmin ? {} : { isInternal: false }),
            },
            include: {
                sender: { select: { id: true, name: true } },
            },
            orderBy: { createdAt: 'asc' },
        });
    }

    // Close ticket
    async closeTicket(id: string, userId: string, companyId: string, userRole: UserRole) {
        const ticket = await this.prisma.supportTicket.findUnique({
            where: { id },
        });

        if (!ticket) {
            throw new NotFoundException('Chamado não encontrado');
        }

        // Check access
        if (userRole !== UserRole.ADMIN && ticket.companyId !== companyId) {
            throw new ForbiddenException('Acesso negado');
        }

        if (ticket.status === SupportTicketStatus.FECHADO) {
            throw new ForbiddenException('Chamado já está fechado');
        }

        const updatedTicket = await this.prisma.supportTicket.update({
            where: { id },
            data: {
                status: SupportTicketStatus.FECHADO,
                closedAt: new Date(),
            },
            include: {
                createdBy: { select: { id: true, name: true } },
                assignedTo: { select: { id: true, name: true } },
            },
        });

        // Create status history entry
        await this.prisma.supportTicketStatusHistory.create({
            data: {
                ticketId: id,
                fromStatus: ticket.status,
                toStatus: SupportTicketStatus.FECHADO,
                changedById: userId,
                notes: 'Chamado fechado pelo usuário',
            },
        });

        return updatedTicket;
    }

    // ========== ADMIN ENDPOINTS ==========

    // Get all tickets (admin)
    async getAllTickets(
        status?: SupportTicketStatus,
        priority?: SupportTicketPriority,
        category?: SupportTicketCategory,
        companyId?: string,
        assignedToId?: string,
    ) {
        return this.prisma.supportTicket.findMany({
            where: {
                ...(status && { status }),
                ...(priority && { priority }),
                ...(category && { category }),
                ...(companyId && { companyId }),
                ...(assignedToId && { assignedToId }),
            },
            include: {
                createdBy: { select: { id: true, name: true } },
                assignedTo: { select: { id: true, name: true } },
                company: { select: { id: true, tradeName: true } },
                _count: { select: { messages: true } },
            },
            orderBy: [
                { priority: 'desc' },
                { createdAt: 'desc' },
            ],
        });
    }

    // Get stats (admin)
    async getStats() {
        const [total, abertos, emAndamento, resolvidos, urgentes] = await Promise.all([
            this.prisma.supportTicket.count(),
            this.prisma.supportTicket.count({ where: { status: SupportTicketStatus.ABERTO } }),
            this.prisma.supportTicket.count({ where: { status: SupportTicketStatus.EM_ANDAMENTO } }),
            this.prisma.supportTicket.count({ where: { status: SupportTicketStatus.RESOLVIDO } }),
            this.prisma.supportTicket.count({
                where: {
                    priority: SupportTicketPriority.URGENTE,
                    status: { notIn: [SupportTicketStatus.FECHADO, SupportTicketStatus.RESOLVIDO] },
                },
            }),
        ]);

        // Calculate average response time (hours)
        const ticketsWithResponses = await this.prisma.supportTicket.findMany({
            where: {
                status: { not: SupportTicketStatus.ABERTO },
            },
            select: {
                createdAt: true,
                messages: {
                    where: { isFromSupport: true },
                    orderBy: { createdAt: 'asc' },
                    take: 1,
                    select: { createdAt: true },
                },
            },
        });

        let totalResponseTime = 0;
        let countWithResponse = 0;

        for (const ticket of ticketsWithResponses) {
            if (ticket.messages.length > 0) {
                const responseTime = ticket.messages[0].createdAt.getTime() - ticket.createdAt.getTime();
                totalResponseTime += responseTime;
                countWithResponse++;
            }
        }

        const tempoMedioResposta = countWithResponse > 0
            ? Math.round((totalResponseTime / countWithResponse) / (1000 * 60 * 60) * 10) / 10
            : 0;

        return {
            total,
            abertos,
            emAndamento,
            resolvidos,
            urgentes,
            tempoMedioResposta,
        };
    }

    // Update ticket (admin)
    async updateTicket(id: string, dto: UpdateTicketDto, adminId: string) {
        const ticket = await this.prisma.supportTicket.findUnique({
            where: { id },
        });

        if (!ticket) {
            throw new NotFoundException('Chamado não encontrado');
        }

        const updateData: Record<string, unknown> = {};

        if (dto.priority !== undefined) {
            updateData.priority = dto.priority;
        }

        if (dto.assignedToId !== undefined) {
            updateData.assignedToId = dto.assignedToId;
        }

        if (dto.status !== undefined && dto.status !== ticket.status) {
            updateData.status = dto.status;

            if (dto.status === SupportTicketStatus.RESOLVIDO) {
                updateData.resolvedAt = new Date();
            } else if (dto.status === SupportTicketStatus.FECHADO) {
                updateData.closedAt = new Date();
            }

            // Create status history entry
            await this.prisma.supportTicketStatusHistory.create({
                data: {
                    ticketId: id,
                    fromStatus: ticket.status,
                    toStatus: dto.status,
                    changedById: adminId,
                    notes: dto.notes,
                },
            });
        }

        return this.prisma.supportTicket.update({
            where: { id },
            data: updateData,
            include: {
                createdBy: { select: { id: true, name: true } },
                assignedTo: { select: { id: true, name: true } },
                company: { select: { id: true, tradeName: true } },
            },
        });
    }

    // Reply as support (admin)
    async replyAsSupport(ticketId: string, adminId: string, dto: SendMessageDto) {
        const ticket = await this.prisma.supportTicket.findUnique({
            where: { id: ticketId },
        });

        if (!ticket) {
            throw new NotFoundException('Chamado não encontrado');
        }

        if (ticket.status === SupportTicketStatus.FECHADO) {
            throw new ForbiddenException('Não é possível enviar mensagens em um chamado fechado');
        }

        const message = await this.prisma.supportTicketMessage.create({
            data: {
                ticketId,
                senderId: adminId,
                content: dto.content,
                attachments: dto.attachments || [],
                isFromSupport: true,
                isInternal: dto.isInternal || false,
            },
            include: {
                sender: { select: { id: true, name: true } },
            },
        });

        // Update status to waiting for response (unless it's internal note)
        if (!dto.isInternal && ticket.status !== SupportTicketStatus.AGUARDANDO_RESPOSTA) {
            await this.updateTicketStatus(
                ticketId,
                ticket.status,
                SupportTicketStatus.AGUARDANDO_RESPOSTA,
                adminId,
            );
        }

        return message;
    }

    // ========== PRIVATE HELPERS ==========

    private async generateDisplayId(): Promise<string> {
        const today = new Date();
        const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');

        // Get count of tickets created today
        const startOfDay = new Date(today.setHours(0, 0, 0, 0));
        const endOfDay = new Date(today.setHours(23, 59, 59, 999));

        const count = await this.prisma.supportTicket.count({
            where: {
                createdAt: {
                    gte: startOfDay,
                    lte: endOfDay,
                },
            },
        });

        // Generate random 4-char alphanumeric suffix
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let suffix = '';
        for (let i = 0; i < 4; i++) {
            suffix += chars.charAt(Math.floor(Math.random() * chars.length));
        }

        return `SUP-${dateStr}-${suffix}`;
    }

    private async updateTicketStatus(
        ticketId: string,
        fromStatus: SupportTicketStatus,
        toStatus: SupportTicketStatus,
        changedById: string,
    ) {
        await this.prisma.supportTicket.update({
            where: { id: ticketId },
            data: { status: toStatus },
        });

        await this.prisma.supportTicketStatusHistory.create({
            data: {
                ticketId,
                fromStatus,
                toStatus,
                changedById,
            },
        });
    }
}
