import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../../prisma/prisma.service';
import { NotificationsService } from '../notifications.service';
import {
  TICKET_CREATED,
  TICKET_MESSAGE_ADDED,
  TICKET_STATUS_CHANGED,
} from '../events/notification.events';
import type {
  TicketCreatedEvent,
  TicketMessageAddedEvent,
  TicketStatusChangedEvent,
} from '../events/notification.events';

@Injectable()
export class TicketEventsHandler {
  private readonly logger = new Logger(TicketEventsHandler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) { }

  /**
   * Handle ticket created event
   * Notify admin users about the new ticket
   */
  @OnEvent(TICKET_CREATED)
  async handleTicketCreated(payload: Record<string, unknown>) {
    const event = payload as unknown as TicketCreatedEvent;
    this.logger.log(`Handling ticket.created for ticket ${event.displayId}`);

    try {
      // Notify admin users
      const adminUsers = await this.prisma.user.findMany({
        where: { role: 'ADMIN', isActive: true },
        select: { id: true },
      });

      for (const admin of adminUsers) {
        await this.notificationsService.notifyTicketUpdate(admin.id, {
          ticketId: event.ticketId,
          displayId: event.displayId,
          title: event.title,
          type: 'created',
        });
      }
    } catch (error) {
      this.logger.error(`Error handling ticket.created: ${error.message}`, error.stack);
    }
  }

  /**
   * Handle ticket message added event
   * Notify all users of the company about the new message
   */
  @OnEvent(TICKET_MESSAGE_ADDED)
  async handleTicketMessageAdded(payload: Record<string, unknown>) {
    const event = payload as unknown as TicketMessageAddedEvent;
    this.logger.log(
      `Handling ticket.message.added for ticket ${event.displayId}`,
    );

    try {
      // Get ticket details with separate queries (more robust than nested includes)
      const ticket = await this.prisma.supportTicket.findUnique({
        where: { id: event.ticketId },
        select: {
          title: true,
          companyId: true,
          company: { select: { type: true } },
        },
      });

      if (!ticket) return;

      if (event.isFromSupport) {
        // Query direct - notify all users of the company (excluding sender)
        const companyUsers = await this.prisma.companyUser.findMany({
          where: {
            companyId: ticket.companyId,
            userId: { not: event.senderId },
          },
          select: { userId: true },
        });

        const actionUrl =
          ticket.company.type === 'SUPPLIER'
            ? `/portal/suporte/${event.ticketId}`
            : `/brand/suporte/${event.ticketId}`;

        for (const cu of companyUsers) {
          await this.notificationsService.notifyTicketUpdate(cu.userId, {
            ticketId: event.ticketId,
            displayId: event.displayId,
            title: ticket.title,
            type: 'message',
            senderName: event.senderName,
            actionUrl,
          });
        }

        this.logger.log(
          `Sent ${companyUsers.length} ticket notifications to company ${ticket.companyId}`,
        );
      } else {
        // Message from user - notify all admin users
        const adminUsers = await this.prisma.user.findMany({
          where: { role: 'ADMIN', isActive: true },
          select: { id: true },
        });

        for (const admin of adminUsers) {
          await this.notificationsService.notifyTicketUpdate(admin.id, {
            ticketId: event.ticketId,
            displayId: event.displayId,
            title: ticket.title,
            type: 'message',
            senderName: event.senderName,
            actionUrl: `/admin/suporte/${event.ticketId}`,
          });
        }

        this.logger.log(
          `Sent ${adminUsers.length} ticket notifications to admins`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Error handling ticket.message.added: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Handle ticket status changed event
   * Notify the ticket creator about the status change
   */
  @OnEvent(TICKET_STATUS_CHANGED)
  async handleTicketStatusChanged(payload: Record<string, unknown>) {
    const event = payload as unknown as TicketStatusChangedEvent;
    this.logger.log(
      `Handling ticket.status.changed for ticket ${event.displayId}`,
    );

    try {
      // Get ticket details
      const ticket = await this.prisma.supportTicket.findUnique({
        where: { id: event.ticketId },
        select: { title: true },
      });

      if (!ticket) return;

      // Don't notify if the creator made the change
      if (event.creatorId === event.changedById) return;

      const statusLabels: Record<string, string> = {
        ABERTO: 'Aberto',
        EM_ANDAMENTO: 'Em Andamento',
        AGUARDANDO_RESPOSTA: 'Aguardando Resposta',
        RESOLVIDO: 'Resolvido',
        FECHADO: 'Fechado',
      };

      await this.notificationsService.notifyTicketUpdate(event.creatorId, {
        ticketId: event.ticketId,
        displayId: event.displayId,
        title: ticket.title,
        type: 'status_changed',
        newStatus: statusLabels[event.newStatus] || event.newStatus,
      });
    } catch (error) {
      this.logger.error(
        `Error handling ticket.status.changed: ${error.message}`,
        error.stack,
      );
    }
  }
}
