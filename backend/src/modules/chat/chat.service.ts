import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import { SendMessageDto } from './dto';
import { MessageType, ProposalStatus } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { SanitizerService } from '../../common/services/sanitizer.service';
import {
  MESSAGE_SENT,
  PROPOSAL_SENT,
  PROPOSAL_RESPONDED,
  MessageSentEvent,
  ProposalSentEvent,
  ProposalRespondedEvent,
} from '../notifications/events/notification.events';

interface GetMessagesOptions {
  limit?: number;
  cursor?: string; // messageId para cursor-based pagination
  direction?: 'before' | 'after';
}

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    private prisma: PrismaService,
    private sanitizer: SanitizerService,
    private eventEmitter: EventEmitter2,
  ) {}

  // Get messages for an order with pagination
  async getMessages(
    orderId: string,
    userId: string,
    options: GetMessagesOptions = {},
  ): Promise<{
    messages: any[];
    hasMore: boolean;
    nextCursor: string | null;
  }> {
    // Verify user has access to this order
    await this.verifyOrderAccess(orderId, userId);

    const limit = Math.min(options.limit || 50, 100); // Max 100
    const { cursor, direction = 'before' } = options;

    const where: any = { orderId };

    // Cursor-based pagination
    if (cursor) {
      const referenceMsg = await this.prisma.message.findUnique({
        where: { id: cursor },
        select: { createdAt: true },
      });

      if (referenceMsg) {
        where.createdAt =
          direction === 'before'
            ? { lt: referenceMsg.createdAt }
            : { gt: referenceMsg.createdAt };
      }
    }

    // Buscar limit + 1 para saber se tem mais
    const messages = await this.prisma.message.findMany({
      where,
      take: limit + 1,
      orderBy: { createdAt: direction === 'before' ? 'desc' : 'asc' },
      include: {
        sender: { select: { id: true, name: true, role: true } },
      },
    });

    // Marcar como lidas (apenas as retornadas, não a +1)
    const messageIds = messages.slice(0, limit).map((m) => m.id);
    if (messageIds.length > 0) {
      await this.prisma.message.updateMany({
        where: {
          id: { in: messageIds },
          senderId: { not: userId },
          read: false,
        },
        data: { read: true },
      });
    }

    const hasMore = messages.length > limit;
    const returnMessages = messages.slice(0, limit);

    // Se estava em ordem desc (before), reverter para asc
    if (direction === 'before') {
      returnMessages.reverse();
    }

    const nextCursor = hasMore
      ? returnMessages[returnMessages.length - 1].id
      : null;

    return {
      messages: returnMessages,
      hasMore,
      nextCursor,
    };
  }

  // Send a message
  async sendMessage(orderId: string, userId: string, dto: SendMessageDto) {
    await this.verifyOrderAccess(orderId, userId);

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        brandId: true,
        supplierId: true,
        pricePerUnit: true,
        netValue: true,
        quantity: true,
        deliveryDeadline: true,
        supplier: { select: { companyUsers: { select: { userId: true } } } },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Determine if sender is supplier (for price masking)
    const isSenderSupplier = order.supplier?.companyUsers.some(
      (cu) => cu.userId === userId,
    );

    const messageData: any = {
      orderId,
      senderId: userId,
      type: dto.type,
    };

    // Sanitizar conteúdo de texto
    if (dto.content) {
      const sanitized = this.sanitizer.sanitizeText(dto.content);

      if (!sanitized) {
        throw new BadRequestException('Conteúdo inválido');
      }

      messageData.content = sanitized;
    }

    // Validar e sanitizar proposta
    if (dto.type === MessageType.PROPOSAL) {
      const proposedPrice = this.sanitizer.sanitizeNumber(dto.proposedPrice);
      const proposedQuantity = this.sanitizer.sanitizeNumber(
        dto.proposedQuantity,
      );
      const proposedDeadline = this.sanitizer.sanitizeDate(
        dto.proposedDeadline,
      );

      if (!proposedPrice || !proposedQuantity || !proposedDeadline) {
        throw new BadRequestException('Dados de proposta inválidos');
      }

      // Validar que valores fazem sentido
      if (proposedPrice <= 0 || proposedQuantity <= 0) {
        throw new BadRequestException('Valores devem ser positivos');
      }

      if (proposedDeadline < new Date()) {
        throw new BadRequestException(
          'Data de entrega não pode ser no passado',
        );
      }

      // Use net price for supplier (what they actually see), raw price for brand
      const visiblePrice =
        isSenderSupplier && order.netValue
          ? Number(order.netValue) / order.quantity
          : Number(order.pricePerUnit);

      messageData.proposalData = {
        originalValues: {
          pricePerUnit: visiblePrice,
          quantity: order.quantity,
          deliveryDeadline: order.deliveryDeadline.toISOString(),
        },
        newValues: {
          pricePerUnit: proposedPrice,
          quantity: proposedQuantity,
          deliveryDeadline: proposedDeadline.toISOString(),
        },
        status: 'PENDING',
      };
    }

    const message = await this.prisma.message.create({
      data: messageData,
      include: {
        sender: { select: { id: true, name: true, role: true } },
      },
    });

    // Emit events - handler resolves all recipients via brandId/supplierId
    if (dto.type === MessageType.PROPOSAL) {
      const proposalData = message.proposalData as any;
      const event: ProposalSentEvent = {
        messageId: message.id,
        orderId,
        senderId: userId,
        senderName: message.sender.name,
        brandId: order.brandId,
        supplierId: order.supplierId ?? undefined,
        proposedPrice: proposalData?.newValues?.pricePerUnit,
        proposedQuantity: proposalData?.newValues?.quantity,
        proposedDeadline: proposalData?.newValues?.deliveryDeadline
          ? new Date(proposalData.newValues.deliveryDeadline)
          : undefined,
      };
      this.eventEmitter.emit(PROPOSAL_SENT, event);
      this.logger.log(`Emitted proposal.sent event for order ${orderId}`);
    } else {
      const event: MessageSentEvent = {
        messageId: message.id,
        orderId,
        senderId: userId,
        senderName: message.sender.name,
        brandId: order.brandId,
        supplierId: order.supplierId ?? undefined,
        type: dto.type,
        content: dto.content,
      };
      this.eventEmitter.emit(MESSAGE_SENT, event);
      this.logger.log(`Emitted message.sent event for order ${orderId}`);
    }

    return message;
  }

  // Accept a proposal
  async acceptProposal(messageId: string, userId: string) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      include: { order: true, sender: { select: { id: true, name: true } } },
    });

    if (!message || message.type !== MessageType.PROPOSAL) {
      throw new NotFoundException('Proposal not found');
    }

    await this.verifyOrderAccess(message.orderId, userId);

    const proposalData = message.proposalData as any;

    if (proposalData.status !== ProposalStatus.PENDING) {
      throw new ForbiddenException('Proposal already processed');
    }

    const responder = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });

    // Use transaction to ensure data consistency
    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Update message status
      await tx.message.update({
        where: { id: messageId },
        data: {
          proposalData: {
            ...proposalData,
            status: ProposalStatus.ACCEPTED,
            acceptedAt: new Date().toISOString(),
            acceptedBy: userId,
          },
        },
      });

      // 2. Update order with new values (include relations for frontend convertApiOrder)
      const updatedOrder = await tx.order.update({
        where: { id: message.orderId },
        data: {
          pricePerUnit: proposalData.newValues.pricePerUnit,
          quantity: proposalData.newValues.quantity,
          totalValue:
            proposalData.newValues.pricePerUnit *
            proposalData.newValues.quantity,
          deliveryDeadline: new Date(proposalData.newValues.deliveryDeadline),
        },
        include: {
          brand: { select: { id: true, tradeName: true, avgRating: true } },
          supplier: { select: { id: true, tradeName: true, avgRating: true } },
        },
      });

      return updatedOrder;
    });

    // Emit proposal responded event
    const event: ProposalRespondedEvent = {
      messageId,
      orderId: message.orderId,
      responderId: userId,
      responderName: responder?.name || 'Unknown',
      proposerId: message.sender.id,
      status: 'ACCEPTED',
    };
    this.eventEmitter.emit(PROPOSAL_RESPONDED, event);
    this.logger.log(
      `Emitted proposal.responded (ACCEPTED) event for order ${message.orderId}`,
    );

    return result;
  }

  // Reject a proposal
  async rejectProposal(messageId: string, userId: string) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      include: { sender: { select: { id: true, name: true } } },
    });

    if (!message || message.type !== MessageType.PROPOSAL) {
      throw new NotFoundException('Proposal not found');
    }

    await this.verifyOrderAccess(message.orderId, userId);

    const proposalData = message.proposalData as any;

    if (proposalData.status !== ProposalStatus.PENDING) {
      throw new ForbiddenException('Proposal already processed');
    }

    const responder = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });

    const result = await this.prisma.message.update({
      where: { id: messageId },
      data: {
        proposalData: {
          ...proposalData,
          status: ProposalStatus.REJECTED,
          rejectedAt: new Date().toISOString(),
          rejectedBy: userId,
        },
      },
    });

    // Emit proposal responded event
    const event: ProposalRespondedEvent = {
      messageId,
      orderId: message.orderId,
      responderId: userId,
      responderName: responder?.name || 'Unknown',
      proposerId: message.sender.id,
      status: 'REJECTED',
    };
    this.eventEmitter.emit(PROPOSAL_RESPONDED, event);
    this.logger.log(
      `Emitted proposal.responded (REJECTED) event for order ${message.orderId}`,
    );

    return result;
  }

  // Get unread count
  async getUnreadCount(orderId: string, userId: string) {
    return this.prisma.message.count({
      where: {
        orderId,
        senderId: { not: userId },
        read: false,
      },
    });
  }

  async verifyOrderAccess(orderId: string, userId: string) {
    console.log(
      `[ChatService] verifyOrderAccess - orderId: ${orderId}, userId: ${userId}`,
    );

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        brand: { include: { companyUsers: true } },
        supplier: { include: { companyUsers: true } },
      },
    });

    if (!order) {
      console.log(`[ChatService] Order not found: ${orderId}`);
      throw new NotFoundException('Order not found');
    }

    console.log(
      `[ChatService] Order found - brandId: ${order.brandId}, supplierId: ${order.supplierId}`,
    );
    console.log(
      `[ChatService] Brand users: ${order.brand.companyUsers.map((cu) => cu.userId).join(', ')}`,
    );
    console.log(
      `[ChatService] Supplier users: ${order.supplier?.companyUsers.map((cu) => cu.userId).join(', ') || 'N/A'}`,
    );

    const hasAccess =
      order.brand.companyUsers.some((cu) => cu.userId === userId) ||
      (order.supplier &&
        order.supplier.companyUsers.some((cu) => cu.userId === userId));

    console.log(`[ChatService] Has access: ${hasAccess}`);

    if (!hasAccess) {
      throw new ForbiddenException('You do not have access to this order');
    }
  }
}
