import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { PrismaService } from '../../prisma/prisma.service';
import { IntegrationService } from '../integrations/services/integration.service';
import { NotificationDispatcherService } from './services/notification-dispatcher.service';
import { GetNotificationsQueryDto } from './dto/notification.dto';

// ---------------------------------------------------------------------------
// Mock constants
// ---------------------------------------------------------------------------

const USER_ID = 'user-abc-123';
const OTHER_USER_ID = 'user-xyz-999';
const COMPANY_ID = 'company-aaa-111';
const OTHER_COMPANY_ID = 'company-bbb-222';
const NOTIFICATION_ID = 'notif-001';

const makeNotification = (overrides: Record<string, unknown> = {}) => ({
  id: NOTIFICATION_ID,
  type: 'ORDER_CREATED',
  priority: 'HIGH',
  recipientId: USER_ID,
  companyId: COMPANY_ID,
  title: 'Novo Pedido Recebido',
  body: 'Teste',
  read: false,
  readAt: null,
  createdAt: new Date('2026-03-01T10:00:00Z'),
  ...overrides,
});

// ---------------------------------------------------------------------------
// Mock objects
// ---------------------------------------------------------------------------

const mockPrisma = {
  notification: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    count: jest.fn(),
    updateMany: jest.fn(),
    deleteMany: jest.fn(),
    update: jest.fn(),
  },
  user: {
    findMany: jest.fn(),
  },
  supplierCredential: {
    findUnique: jest.fn(),
  },
};

const mockIntegrationService = {
  sendEmail: jest.fn(),
  validateCNPJ: jest.fn(),
};

const mockDispatcher = {
  dispatch: jest.fn(),
  dispatchBulk: jest.fn(),
};

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('NotificationsService', () => {
  let service: NotificationsService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: IntegrationService, useValue: mockIntegrationService },
        { provide: NotificationDispatcherService, useValue: mockDispatcher },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
  });

  // =========================================================================
  // getNotifications()
  // =========================================================================

  describe('getNotifications()', () => {
    const baseQuery: GetNotificationsQueryDto = { limit: 10 };

    it('deve filtrar pelo userId E companyId (duplo filtro tenant)', async () => {
      const items = [makeNotification()];
      mockPrisma.notification.findMany.mockResolvedValue(items);
      mockPrisma.notification.count.mockResolvedValue(0);

      await service.getNotifications(USER_ID, baseQuery, COMPANY_ID);

      expect(mockPrisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            recipientId: USER_ID,
            companyId: COMPANY_ID,
          }),
        }),
      );
    });

    it('NAO deve retornar notificacoes de outro companyId', async () => {
      // Notificacoes do outro tenant NAO devem aparecer
      mockPrisma.notification.findMany.mockResolvedValue([]);
      mockPrisma.notification.count.mockResolvedValue(0);

      const result = await service.getNotifications(
        USER_ID,
        baseQuery,
        COMPANY_ID,
      );

      // Confirmar que a query filtra pelo companyId correto e nao pelo outro
      expect(mockPrisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            companyId: COMPANY_ID,
          }),
        }),
      );
      const calledWhere =
        mockPrisma.notification.findMany.mock.calls[0][0].where;
      expect(calledWhere.companyId).toBe(COMPANY_ID);
      expect(calledWhere.companyId).not.toBe(OTHER_COMPANY_ID);
      expect(result.notifications).toHaveLength(0);
    });

    it('deve retornar notificacoes sem filtro de companyId quando companyId e nulo', async () => {
      mockPrisma.notification.findMany.mockResolvedValue([]);
      mockPrisma.notification.count.mockResolvedValue(0);

      await service.getNotifications(USER_ID, baseQuery, null);

      const calledWhere =
        mockPrisma.notification.findMany.mock.calls[0][0].where;
      expect(calledWhere.companyId).toBeUndefined();
      expect(calledWhere.recipientId).toBe(USER_ID);
    });

    it('deve respeitar o limite maximo de 50 itens', async () => {
      mockPrisma.notification.findMany.mockResolvedValue([]);
      mockPrisma.notification.count.mockResolvedValue(0);

      await service.getNotifications(USER_ID, { limit: 200 }, COMPANY_ID);

      expect(mockPrisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 51, // limit(50) + 1 para verificar hasMore
        }),
      );
    });

    it('deve retornar hasMore=true e nextCursor quando ha mais paginas', async () => {
      // Retorna limit+1 itens para indicar que ha mais
      const items = Array.from({ length: 11 }, (_, i) =>
        makeNotification({
          id: `notif-${i}`,
          createdAt: new Date(2026, 2, i + 1, 10, 0, 0),
        }),
      );
      mockPrisma.notification.findMany.mockResolvedValue(items);
      mockPrisma.notification.count.mockResolvedValue(2);

      const result = await service.getNotifications(
        USER_ID,
        { limit: 10 },
        COMPANY_ID,
      );

      expect(result.hasMore).toBe(true);
      expect(result.nextCursor).toBeDefined();
      expect(result.notifications).toHaveLength(10);
    });

    it('deve filtrar por unreadOnly quando informado', async () => {
      mockPrisma.notification.findMany.mockResolvedValue([]);
      mockPrisma.notification.count.mockResolvedValue(0);

      await service.getNotifications(
        USER_ID,
        { limit: 10, unreadOnly: true },
        COMPANY_ID,
      );

      const calledWhere =
        mockPrisma.notification.findMany.mock.calls[0][0].where;
      expect(calledWhere.read).toBe(false);
    });
  });

  // =========================================================================
  // getUnreadCount()
  // =========================================================================

  describe('getUnreadCount()', () => {
    it('deve retornar zero quando todas as notificacoes foram lidas', async () => {
      mockPrisma.notification.count.mockResolvedValue(0);

      const result = await service.getUnreadCount(USER_ID, COMPANY_ID);

      expect(result).toBe(0);
      expect(mockPrisma.notification.count).toHaveBeenCalledWith({
        where: {
          recipientId: USER_ID,
          read: false,
          companyId: COMPANY_ID,
        },
      });
    });

    it('deve retornar a contagem de nao lidas filtrada por companyId', async () => {
      mockPrisma.notification.count.mockResolvedValue(5);

      const result = await service.getUnreadCount(USER_ID, COMPANY_ID);

      expect(result).toBe(5);
    });

    it('deve omitir companyId do filtro quando nulo', async () => {
      mockPrisma.notification.count.mockResolvedValue(3);

      await service.getUnreadCount(USER_ID, null);

      const calledWhere = mockPrisma.notification.count.mock.calls[0][0].where;
      expect(calledWhere.recipientId).toBe(USER_ID);
      expect(calledWhere.read).toBe(false);
      expect(calledWhere.companyId).toBeUndefined();
    });
  });

  // =========================================================================
  // getNotification()
  // =========================================================================

  describe('getNotification()', () => {
    it('deve retornar a notificacao quando ela pertence ao usuario', async () => {
      const notification = makeNotification();
      mockPrisma.notification.findFirst.mockResolvedValue(notification);

      const result = await service.getNotification(NOTIFICATION_ID, USER_ID);

      expect(result).toEqual(notification);
      expect(mockPrisma.notification.findFirst).toHaveBeenCalledWith({
        where: {
          id: NOTIFICATION_ID,
          recipientId: USER_ID,
        },
      });
    });

    it('deve lancar NotFoundException quando notificacao pertence a outro usuario', async () => {
      // findFirst retorna null porque a query usa recipientId: USER_ID
      // mas a notificacao pertence a OTHER_USER_ID
      mockPrisma.notification.findFirst.mockResolvedValue(null);

      await expect(
        service.getNotification(NOTIFICATION_ID, OTHER_USER_ID),
      ).rejects.toThrow(NotFoundException);

      await expect(
        service.getNotification(NOTIFICATION_ID, OTHER_USER_ID),
      ).rejects.toThrow('Notificação não encontrada');
    });

    it('deve lancar NotFoundException quando notificacao nao existe', async () => {
      mockPrisma.notification.findFirst.mockResolvedValue(null);

      await expect(
        service.getNotification('id-inexistente', USER_ID),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // =========================================================================
  // markAsRead()
  // =========================================================================

  describe('markAsRead()', () => {
    it('com markAll:true deve marcar todas as notificacoes do companyId', async () => {
      mockPrisma.notification.updateMany.mockResolvedValue({ count: 3 });

      const result = await service.markAsRead(
        USER_ID,
        { markAll: true },
        COMPANY_ID,
      );

      expect(result).toEqual({ updatedCount: 3 });
      expect(mockPrisma.notification.updateMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          recipientId: USER_ID,
          read: false,
          companyId: COMPANY_ID,
        }),
        data: expect.objectContaining({
          read: true,
          readAt: expect.any(Date),
        }),
      });
    });

    it('com markAll:true NAO deve marcar notificacoes de outro companyId', async () => {
      mockPrisma.notification.updateMany.mockResolvedValue({ count: 2 });

      await service.markAsRead(USER_ID, { markAll: true }, COMPANY_ID);

      const calledWhere =
        mockPrisma.notification.updateMany.mock.calls[0][0].where;
      expect(calledWhere.companyId).toBe(COMPANY_ID);
      expect(calledWhere.companyId).not.toBe(OTHER_COMPANY_ID);
    });

    it('com notificationId deve marcar apenas a notificacao especifica', async () => {
      mockPrisma.notification.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.markAsRead(
        USER_ID,
        { notificationId: NOTIFICATION_ID },
        COMPANY_ID,
      );

      expect(result).toEqual({ updatedCount: 1 });
      expect(mockPrisma.notification.updateMany).toHaveBeenCalledWith({
        where: {
          id: NOTIFICATION_ID,
          recipientId: USER_ID,
          read: false,
        },
        data: expect.objectContaining({
          read: true,
        }),
      });
    });

    it('deve retornar updatedCount:0 quando notificacao nao pertence ao usuario', async () => {
      // updateMany retorna 0 porque recipientId nao bate
      mockPrisma.notification.updateMany.mockResolvedValue({ count: 0 });

      const result = await service.markAsRead(
        OTHER_USER_ID,
        { notificationId: NOTIFICATION_ID },
        COMPANY_ID,
      );

      expect(result.updatedCount).toBe(0);
    });

    it('com notificationIds deve marcar multiplas notificacoes', async () => {
      const ids = ['notif-001', 'notif-002'];
      mockPrisma.notification.updateMany.mockResolvedValue({ count: 2 });

      const result = await service.markAsRead(
        USER_ID,
        { notificationIds: ids },
        COMPANY_ID,
      );

      expect(result).toEqual({ updatedCount: 2 });
      expect(mockPrisma.notification.updateMany).toHaveBeenCalledWith({
        where: {
          id: { in: ids },
          recipientId: USER_ID,
          read: false,
        },
        data: expect.objectContaining({ read: true }),
      });
    });

    it('deve retornar updatedCount:0 quando nenhuma opcao e fornecida', async () => {
      const result = await service.markAsRead(USER_ID, {}, COMPANY_ID);

      expect(result).toEqual({ updatedCount: 0 });
      expect(mockPrisma.notification.updateMany).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // notify() / notifyMany()
  // =========================================================================

  describe('notify()', () => {
    it('deve delegar para o dispatcher', async () => {
      const payload = {
        type: 'ORDER_CREATED' as any,
        recipientId: USER_ID,
        title: 'Teste',
        body: 'Corpo',
      };
      mockDispatcher.dispatch.mockResolvedValue({ id: 'notif-new' });

      const result = await service.notify(payload);

      expect(mockDispatcher.dispatch).toHaveBeenCalledWith(payload);
      expect(result).toEqual({ id: 'notif-new' });
    });
  });

  describe('notifyMany()', () => {
    it('deve delegar para o dispatcher em massa', async () => {
      const recipientIds = [USER_ID, OTHER_USER_ID];
      const payload = { type: 'SYSTEM_ANNOUNCEMENT' as any, title: 'Aviso', body: 'Geral' };
      mockDispatcher.dispatchBulk.mockResolvedValue([]);

      await service.notifyMany(recipientIds, payload);

      expect(mockDispatcher.dispatchBulk).toHaveBeenCalledWith(
        recipientIds,
        payload,
      );
    });
  });

  // =========================================================================
  // deleteOldNotifications()
  // =========================================================================

  describe('deleteOldNotifications()', () => {
    it('deve deletar notificacoes lidas mais antigas que daysOld', async () => {
      mockPrisma.notification.deleteMany.mockResolvedValue({ count: 7 });

      const result = await service.deleteOldNotifications(90);

      expect(result).toBe(7);
      expect(mockPrisma.notification.deleteMany).toHaveBeenCalledWith({
        where: {
          read: true,
          createdAt: { lt: expect.any(Date) },
        },
      });
    });

    it('deve usar 90 dias como padrao quando nao especificado', async () => {
      mockPrisma.notification.deleteMany.mockResolvedValue({ count: 0 });

      await service.deleteOldNotifications();

      expect(mockPrisma.notification.deleteMany).toHaveBeenCalledTimes(1);
    });
  });
});
