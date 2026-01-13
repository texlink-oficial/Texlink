import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SendMessageDto } from './dto';
import { MessageType, ProposalStatus } from '@prisma/client';
import { Prisma } from '@prisma/client';

@Injectable()
export class ChatService {
    constructor(private prisma: PrismaService) { }

    // Get messages for an order
    async getMessages(orderId: string, userId: string) {
        // Verify user has access to this order
        await this.verifyOrderAccess(orderId, userId);

        // Mark messages as read
        await this.prisma.message.updateMany({
            where: {
                orderId,
                senderId: { not: userId },
                read: false,
            },
            data: { read: true },
        });

        return this.prisma.message.findMany({
            where: { orderId },
            include: {
                sender: { select: { id: true, name: true, role: true } },
            },
            orderBy: { createdAt: 'asc' },
        });
    }

    // Send a message
    async sendMessage(orderId: string, userId: string, dto: SendMessageDto) {
        await this.verifyOrderAccess(orderId, userId);

        const order = await this.prisma.order.findUnique({
            where: { id: orderId },
        });

        if (!order) {
            throw new NotFoundException('Order not found');
        }

        const messageData: any = {
            orderId,
            senderId: userId,
            type: dto.type,
            content: dto.content,
        };

        // If proposal, add proposal data
        if (dto.type === MessageType.PROPOSAL) {
            messageData.proposalData = {
                originalValues: {
                    pricePerUnit: Number(order.pricePerUnit),
                    quantity: order.quantity,
                    deliveryDeadline: order.deliveryDeadline.toISOString(),
                },
                newValues: {
                    pricePerUnit: dto.proposedPrice || Number(order.pricePerUnit),
                    quantity: dto.proposedQuantity || order.quantity,
                    deliveryDeadline: dto.proposedDeadline || order.deliveryDeadline.toISOString(),
                },
                status: 'PENDING',
            };
        }

        return this.prisma.message.create({
            data: messageData,
            include: {
                sender: { select: { id: true, name: true, role: true } },
            },
        });
    }

    // Accept a proposal
    async acceptProposal(messageId: string, userId: string) {
        const message = await this.prisma.message.findUnique({
            where: { id: messageId },
            include: { order: true },
        });

        if (!message || message.type !== MessageType.PROPOSAL) {
            throw new NotFoundException('Proposal not found');
        }

        await this.verifyOrderAccess(message.orderId, userId);

        const proposalData = message.proposalData as any;

        if (proposalData.status !== ProposalStatus.PENDING) {
            throw new ForbiddenException('Proposal already processed');
        }

        // Update message
        await this.prisma.message.update({
            where: { id: messageId },
            data: {
                proposalData: {
                    ...proposalData,
                    status: ProposalStatus.ACCEPTED,
                },
            },
        });

        // Update order with new values
        return this.prisma.order.update({
            where: { id: message.orderId },
            data: {
                pricePerUnit: proposalData.newValues.pricePerUnit,
                quantity: proposalData.newValues.quantity,
                totalValue: proposalData.newValues.pricePerUnit * proposalData.newValues.quantity,
                deliveryDeadline: new Date(proposalData.newValues.deliveryDeadline),
            },
        });
    }

    // Reject a proposal
    async rejectProposal(messageId: string, userId: string) {
        const message = await this.prisma.message.findUnique({
            where: { id: messageId },
        });

        if (!message || message.type !== MessageType.PROPOSAL) {
            throw new NotFoundException('Proposal not found');
        }

        await this.verifyOrderAccess(message.orderId, userId);

        const proposalData = message.proposalData as any;

        return this.prisma.message.update({
            where: { id: messageId },
            data: {
                proposalData: {
                    ...proposalData,
                    status: ProposalStatus.REJECTED,
                },
            },
        });
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

    private async verifyOrderAccess(orderId: string, userId: string) {
        const order = await this.prisma.order.findUnique({
            where: { id: orderId },
            include: {
                brand: { include: { companyUsers: true } },
                supplier: { include: { companyUsers: true } },
            },
        });

        if (!order) {
            throw new NotFoundException('Order not found');
        }

        const hasAccess =
            order.brand.companyUsers.some((cu) => cu.userId === userId) ||
            (order.supplier && order.supplier.companyUsers.some((cu) => cu.userId === userId));

        if (!hasAccess) {
            throw new ForbiddenException('You do not have access to this order');
        }
    }
}
