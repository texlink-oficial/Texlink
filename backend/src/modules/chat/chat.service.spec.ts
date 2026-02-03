import { Test, TestingModule } from '@nestjs/testing';
import { ChatService } from './chat.service';
import { PrismaService } from '../../prisma/prisma.service';
import { SanitizerService } from '../../common/services/sanitizer.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { MessageType, ProposalStatus } from '@prisma/client';

describe('ChatService', () => {
  let service: ChatService;
  let prisma: PrismaService;
  let sanitizer: SanitizerService;
  let eventEmitter: EventEmitter2;

  const mockPrisma = {
    order: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    message: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      count: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockSanitizer = {
    sanitizeText: jest.fn((text) => text),
    sanitizeNumber: jest.fn((num) => Number(num)),
    sanitizeDate: jest.fn((date) => new Date(date)),
  };

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
        {
          provide: SanitizerService,
          useValue: mockSanitizer,
        },
        {
          provide: EventEmitter2,
          useValue: mockEventEmitter,
        },
      ],
    }).compile();

    service = module.get<ChatService>(ChatService);
    prisma = module.get<PrismaService>(PrismaService);
    sanitizer = module.get<SanitizerService>(SanitizerService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('sendMessage', () => {
    const mockOrder = {
      id: 'order-1',
      brandId: 'brand-1',
      supplierId: 'supplier-1',
      pricePerUnit: 100,
      quantity: 50,
      deliveryDeadline: new Date('2026-03-01'),
      brand: {
        companyUsers: [{ userId: 'user-1' }],
      },
      supplier: {
        companyUsers: [{ userId: 'user-2' }],
      },
    };

    const mockMessage = {
      id: 'msg-1',
      orderId: 'order-1',
      senderId: 'user-1',
      type: MessageType.TEXT,
      content: 'Test message',
      read: false,
      createdAt: new Date(),
      sender: {
        id: 'user-1',
        name: 'Test User',
        role: 'BRAND',
      },
    };

    it('should send text message successfully', async () => {
      jest.spyOn(service, 'verifyOrderAccess').mockResolvedValue(undefined);
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder);
      mockPrisma.message.create.mockResolvedValue(mockMessage);

      const result = await service.sendMessage('order-1', 'user-1', {
        type: MessageType.TEXT,
        content: 'Test message',
      });

      expect(result).toEqual(mockMessage);
      expect(mockSanitizer.sanitizeText).toHaveBeenCalledWith('Test message');
      expect(mockPrisma.message.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          orderId: 'order-1',
          senderId: 'user-1',
          type: MessageType.TEXT,
          content: 'Test message',
        }),
        include: expect.any(Object),
      });
    });

    it('should send proposal message with data', async () => {
      jest.spyOn(service, 'verifyOrderAccess').mockResolvedValue(undefined);
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder);
      mockPrisma.message.create.mockResolvedValue({
        ...mockMessage,
        type: MessageType.PROPOSAL,
      });

      const futureDate = '2026-03-15';
      const result = await service.sendMessage('order-1', 'user-1', {
        type: MessageType.PROPOSAL,
        proposedPrice: 90,
        proposedQuantity: 60,
        proposedDeadline: futureDate,
      });

      expect(mockSanitizer.sanitizeNumber).toHaveBeenCalledWith(90);
      expect(mockSanitizer.sanitizeNumber).toHaveBeenCalledWith(60);
      expect(mockSanitizer.sanitizeDate).toHaveBeenCalledWith(futureDate);
      expect(mockPrisma.message.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: MessageType.PROPOSAL,
          proposalData: expect.objectContaining({
            originalValues: expect.any(Object),
            newValues: expect.objectContaining({
              pricePerUnit: 90,
              quantity: 60,
            }),
            status: 'PENDING',
          }),
        }),
        include: expect.any(Object),
      });
    });

    it('should throw NotFoundException if order not found', async () => {
      jest.spyOn(service, 'verifyOrderAccess').mockResolvedValue(undefined);
      mockPrisma.order.findUnique.mockResolvedValue(null);

      await expect(
        service.sendMessage('order-1', 'user-1', {
          type: MessageType.TEXT,
          content: 'Test',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for invalid content', async () => {
      jest.spyOn(service, 'verifyOrderAccess').mockResolvedValue(undefined);
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder);
      mockSanitizer.sanitizeText.mockReturnValue('');

      await expect(
        service.sendMessage('order-1', 'user-1', {
          type: MessageType.TEXT,
          content: '<script>alert("xss")</script>',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for negative proposal values', async () => {
      jest.spyOn(service, 'verifyOrderAccess').mockResolvedValue(undefined);
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder);

      await expect(
        service.sendMessage('order-1', 'user-1', {
          type: MessageType.PROPOSAL,
          proposedPrice: -10,
          proposedQuantity: 50,
          proposedDeadline: '2026-03-15',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getMessages', () => {
    it('should return messages with pagination', async () => {
      const mockMessages = [
        {
          id: 'msg-1',
          content: 'Message 1',
          read: false,
          createdAt: new Date('2026-01-01'),
        },
        {
          id: 'msg-2',
          content: 'Message 2',
          read: true,
          createdAt: new Date('2026-01-02'),
        },
      ];

      jest.spyOn(service, 'verifyOrderAccess').mockResolvedValue(undefined);
      mockPrisma.message.findMany.mockResolvedValue(mockMessages);
      mockPrisma.message.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.getMessages('order-1', 'user-1', {
        limit: 50,
      });

      expect(result.messages).toHaveLength(2);
      expect(result.hasMore).toBe(false);
      expect(mockPrisma.message.updateMany).toHaveBeenCalledWith({
        where: {
          id: { in: ['msg-1', 'msg-2'] },
          senderId: { not: 'user-1' },
          read: false,
        },
        data: { read: true },
      });
    });

    it('should handle cursor-based pagination', async () => {
      const mockMessages = [
        {
          id: 'msg-3',
          content: 'Message 3',
          createdAt: new Date('2026-01-03'),
        },
      ];

      jest.spyOn(service, 'verifyOrderAccess').mockResolvedValue(undefined);
      mockPrisma.message.findUnique.mockResolvedValue({
        id: 'msg-2',
        createdAt: new Date('2026-01-02'),
      });
      mockPrisma.message.findMany.mockResolvedValue(mockMessages);
      mockPrisma.message.updateMany.mockResolvedValue({ count: 0 });

      const result = await service.getMessages('order-1', 'user-1', {
        limit: 50,
        cursor: 'msg-2',
        direction: 'before',
      });

      expect(mockPrisma.message.findUnique).toHaveBeenCalledWith({
        where: { id: 'msg-2' },
        select: { createdAt: true },
      });
      expect(result.messages).toHaveLength(1);
    });

    it('should indicate hasMore when there are more messages', async () => {
      const mockMessages = Array(51)
        .fill(null)
        .map((_, i) => ({
          id: `msg-${i}`,
          content: `Message ${i}`,
          createdAt: new Date(Date.now() - i * 1000),
        }));

      jest.spyOn(service, 'verifyOrderAccess').mockResolvedValue(undefined);
      mockPrisma.message.findMany.mockResolvedValue(mockMessages);
      mockPrisma.message.updateMany.mockResolvedValue({ count: 0 });

      const result = await service.getMessages('order-1', 'user-1', {
        limit: 50,
      });

      expect(result.messages).toHaveLength(50);
      expect(result.hasMore).toBe(true);
      // Last message in the returned list (reversed from desc order)
      expect(result.nextCursor).toBe(
        result.messages[result.messages.length - 1].id,
      );
    });
  });

  describe('acceptProposal', () => {
    it('should accept proposal and update order in transaction', async () => {
      const mockProposalMessage = {
        id: 'msg-1',
        orderId: 'order-1',
        type: MessageType.PROPOSAL,
        sender: {
          id: 'user-2',
          name: 'Proposal Sender',
        },
        proposalData: {
          originalValues: {
            pricePerUnit: 100,
            quantity: 50,
            deliveryDeadline: '2026-03-01',
          },
          newValues: {
            pricePerUnit: 90,
            quantity: 60,
            deliveryDeadline: '2026-03-15',
          },
          status: ProposalStatus.PENDING,
        },
      };

      const mockUpdatedOrder = {
        id: 'order-1',
        pricePerUnit: 90,
        quantity: 60,
        totalValue: 5400,
        deliveryDeadline: new Date('2026-03-15'),
      };

      mockPrisma.message.findUnique.mockResolvedValue(mockProposalMessage);
      mockPrisma.user.findUnique.mockResolvedValue({ name: 'Test User' });
      jest.spyOn(service, 'verifyOrderAccess').mockResolvedValue(undefined);

      // Mock transaction
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        const tx = {
          message: { update: jest.fn().mockResolvedValue({}) },
          order: { update: jest.fn().mockResolvedValue(mockUpdatedOrder) },
        };
        return callback(tx);
      });

      const result = await service.acceptProposal('msg-1', 'user-1');

      expect(result).toEqual(mockUpdatedOrder);
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it('should throw error if proposal already processed', async () => {
      const mockProposalMessage = {
        id: 'msg-1',
        orderId: 'order-1',
        type: MessageType.PROPOSAL,
        proposalData: {
          status: ProposalStatus.ACCEPTED,
        },
      };

      mockPrisma.message.findUnique.mockResolvedValue(mockProposalMessage);
      jest.spyOn(service, 'verifyOrderAccess').mockResolvedValue(undefined);

      await expect(service.acceptProposal('msg-1', 'user-1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw NotFoundException if message not found', async () => {
      mockPrisma.message.findUnique.mockResolvedValue(null);

      await expect(service.acceptProposal('msg-999', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException if message is not a proposal', async () => {
      const mockTextMessage = {
        id: 'msg-1',
        orderId: 'order-1',
        type: MessageType.TEXT,
        content: 'Not a proposal',
      };

      mockPrisma.message.findUnique.mockResolvedValue(mockTextMessage);

      await expect(service.acceptProposal('msg-1', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('rejectProposal', () => {
    it('should reject proposal successfully', async () => {
      const mockProposalMessage = {
        id: 'msg-1',
        orderId: 'order-1',
        type: MessageType.PROPOSAL,
        sender: {
          id: 'user-2',
          name: 'Proposal Sender',
        },
        proposalData: {
          status: ProposalStatus.PENDING,
        },
      };

      const mockUpdatedMessage = {
        ...mockProposalMessage,
        proposalData: {
          status: ProposalStatus.REJECTED,
        },
      };

      mockPrisma.message.findUnique.mockResolvedValue(mockProposalMessage);
      mockPrisma.user.findUnique.mockResolvedValue({ name: 'Test User' });
      jest.spyOn(service, 'verifyOrderAccess').mockResolvedValue(undefined);
      mockPrisma.message.update.mockResolvedValue(mockUpdatedMessage);

      const result = await service.rejectProposal('msg-1', 'user-1');

      expect(result.proposalData.status).toBe(ProposalStatus.REJECTED);
      expect(mockPrisma.message.update).toHaveBeenCalled();
    });
  });

  describe('getUnreadCount', () => {
    it('should return correct unread count', async () => {
      mockPrisma.message.count.mockResolvedValue(5);

      const count = await service.getUnreadCount('order-1', 'user-1');

      expect(count).toBe(5);
      expect(mockPrisma.message.count).toHaveBeenCalledWith({
        where: {
          orderId: 'order-1',
          senderId: { not: 'user-1' },
          read: false,
        },
      });
    });

    it('should return 0 when no unread messages', async () => {
      mockPrisma.message.count.mockResolvedValue(0);

      const count = await service.getUnreadCount('order-1', 'user-1');

      expect(count).toBe(0);
    });
  });

  describe('verifyOrderAccess', () => {
    it('should allow access for brand user', async () => {
      const mockOrder = {
        id: 'order-1',
        brand: {
          companyUsers: [{ userId: 'user-1' }],
        },
        supplier: {
          companyUsers: [{ userId: 'user-2' }],
        },
      };

      mockPrisma.order.findUnique.mockResolvedValue(mockOrder);

      await expect(
        service.verifyOrderAccess('order-1', 'user-1'),
      ).resolves.not.toThrow();
    });

    it('should allow access for supplier user', async () => {
      const mockOrder = {
        id: 'order-1',
        brand: {
          companyUsers: [{ userId: 'user-1' }],
        },
        supplier: {
          companyUsers: [{ userId: 'user-2' }],
        },
      };

      mockPrisma.order.findUnique.mockResolvedValue(mockOrder);

      await expect(
        service.verifyOrderAccess('order-1', 'user-2'),
      ).resolves.not.toThrow();
    });

    it('should deny access for unrelated user', async () => {
      const mockOrder = {
        id: 'order-1',
        brand: {
          companyUsers: [{ userId: 'user-1' }],
        },
        supplier: {
          companyUsers: [{ userId: 'user-2' }],
        },
      };

      mockPrisma.order.findUnique.mockResolvedValue(mockOrder);

      await expect(
        service.verifyOrderAccess('order-1', 'user-999'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if order not found', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(null);

      await expect(
        service.verifyOrderAccess('order-999', 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
