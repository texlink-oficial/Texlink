import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { NotificationsGateway } from './notifications.gateway';
import { PrismaService } from '../../prisma/prisma.service';
import { RateLimiterService } from '../../common/services/rate-limiter.service';

// ---------------------------------------------------------------------------
// Mock constants
// ---------------------------------------------------------------------------

const USER_ID = 'user-abc-123';
const USER_NAME = 'Test User';
const COMPANY_ID = 'company-aaa-111';
const SOCKET_ID = 'socket-001';
const SOCKET_ID_2 = 'socket-002';
const VALID_TOKEN = 'valid.jwt.token';
const INVALID_TOKEN = 'bad.token';

// ---------------------------------------------------------------------------
// Socket factory
// ---------------------------------------------------------------------------

function makeSocket(overrides: Record<string, unknown> = {}) {
  return {
    id: SOCKET_ID,
    handshake: {
      address: '127.0.0.1',
      auth: { token: VALID_TOKEN },
      query: {},
    },
    join: jest.fn().mockResolvedValue(undefined),
    emit: jest.fn(),
    disconnect: jest.fn(),
    userId: undefined as string | undefined,
    userName: undefined as string | undefined,
    companyId: undefined as string | undefined,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Mock objects
// ---------------------------------------------------------------------------

const mockJwtService = {
  verify: jest.fn(),
};

const mockPrisma = {
  notification: {
    count: jest.fn(),
    updateMany: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
  },
};

const mockRateLimiter = {
  checkConnectionLimit: jest.fn(),
  checkMessageLimit: jest.fn(),
};

// ---------------------------------------------------------------------------
// Mock server
// ---------------------------------------------------------------------------

const mockServer = {
  to: jest.fn().mockReturnThis(),
  emit: jest.fn(),
};

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('NotificationsGateway', () => {
  let gateway: NotificationsGateway;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsGateway,
        { provide: JwtService, useValue: mockJwtService },
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RateLimiterService, useValue: mockRateLimiter },
      ],
    }).compile();

    gateway = module.get<NotificationsGateway>(NotificationsGateway);
    // Inject mocked server
    (gateway as any).server = mockServer;
  });

  // =========================================================================
  // handleConnection()
  // =========================================================================

  describe('handleConnection()', () => {
    const mockUser = {
      id: USER_ID,
      name: USER_NAME,
      companyUsers: [{ companyId: COMPANY_ID }],
    };

    it('conexao autenticada deve juntar usuario a sala user:{userId}', async () => {
      mockRateLimiter.checkConnectionLimit.mockResolvedValue(undefined);
      mockJwtService.verify.mockReturnValue({ sub: USER_ID });
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.notification.count.mockResolvedValue(2);

      const client = makeSocket() as any;
      await gateway.handleConnection(client);

      expect(client.join).toHaveBeenCalledWith(`user:${USER_ID}`);
      expect(client.userId).toBe(USER_ID);
    });

    it('conexao autenticada deve juntar usuario a sala company:{companyId}', async () => {
      mockRateLimiter.checkConnectionLimit.mockResolvedValue(undefined);
      mockJwtService.verify.mockReturnValue({ sub: USER_ID });
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.notification.count.mockResolvedValue(0);

      const client = makeSocket() as any;
      await gateway.handleConnection(client);

      expect(client.join).toHaveBeenCalledWith(`company:${COMPANY_ID}`);
      expect(client.companyId).toBe(COMPANY_ID);
    });

    it('deve emitir evento connected com unreadCount apos autenticacao bem-sucedida', async () => {
      mockRateLimiter.checkConnectionLimit.mockResolvedValue(undefined);
      mockJwtService.verify.mockReturnValue({ sub: USER_ID });
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.notification.count.mockResolvedValue(4);

      const client = makeSocket() as any;
      await gateway.handleConnection(client);

      expect(client.emit).toHaveBeenCalledWith(
        'connected',
        expect.objectContaining({
          userId: USER_ID,
          userName: USER_NAME,
          socketId: SOCKET_ID,
          unreadCount: 4,
        }),
      );
    });

    it('deve desconectar cliente sem token', async () => {
      mockRateLimiter.checkConnectionLimit.mockResolvedValue(undefined);

      const client = makeSocket({
        handshake: { address: '127.0.0.1', auth: {}, query: {} },
      }) as any;

      await gateway.handleConnection(client);

      expect(client.disconnect).toHaveBeenCalled();
      expect(client.join).not.toHaveBeenCalled();
    });

    it('deve desconectar cliente com token invalido', async () => {
      mockRateLimiter.checkConnectionLimit.mockResolvedValue(undefined);
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('invalid signature');
      });

      const client = makeSocket({
        handshake: {
          address: '127.0.0.1',
          auth: { token: INVALID_TOKEN },
          query: {},
        },
      }) as any;

      await gateway.handleConnection(client);

      expect(client.disconnect).toHaveBeenCalled();
      expect(client.emit).toHaveBeenCalledWith(
        'error',
        expect.objectContaining({ message: 'Authentication failed' }),
      );
    });

    it('deve desconectar cliente quando rate limit e excedido', async () => {
      mockRateLimiter.checkConnectionLimit.mockRejectedValue(
        new Error('Too many connection attempts. Try again in 60 seconds.'),
      );

      const client = makeSocket() as any;
      await gateway.handleConnection(client);

      expect(client.disconnect).toHaveBeenCalled();
      expect(client.emit).toHaveBeenCalledWith(
        'error',
        expect.objectContaining({ code: 'RATE_LIMIT_EXCEEDED' }),
      );
    });

    it('deve desconectar quando usuario nao e encontrado no banco', async () => {
      mockRateLimiter.checkConnectionLimit.mockResolvedValue(undefined);
      mockJwtService.verify.mockReturnValue({ sub: 'ghost-user' });
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const client = makeSocket() as any;
      await gateway.handleConnection(client);

      expect(client.disconnect).toHaveBeenCalled();
    });

    it('deve desconectar quando payload nao contem sub', async () => {
      mockRateLimiter.checkConnectionLimit.mockResolvedValue(undefined);
      mockJwtService.verify.mockReturnValue({ role: 'SUPPLIER' }); // sem sub

      const client = makeSocket() as any;
      await gateway.handleConnection(client);

      expect(client.disconnect).toHaveBeenCalled();
    });

    it('deve rastrear o socket no userSockets map', async () => {
      mockRateLimiter.checkConnectionLimit.mockResolvedValue(undefined);
      mockJwtService.verify.mockReturnValue({ sub: USER_ID });
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.notification.count.mockResolvedValue(0);

      const client = makeSocket() as any;
      await gateway.handleConnection(client);

      expect(gateway.isUserOnline(USER_ID)).toBe(true);
    });

    it('notificacao enviada via gateway deve ser emitida apenas para o userId correto', async () => {
      mockRateLimiter.checkConnectionLimit.mockResolvedValue(undefined);
      mockJwtService.verify.mockReturnValue({ sub: USER_ID });
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.notification.count.mockResolvedValue(1);

      const client = makeSocket() as any;
      await gateway.handleConnection(client);

      // Emitir notificacao via emitToUser
      gateway.emitToUser(USER_ID, 'notification:new', { id: 'n1' });

      expect(mockServer.to).toHaveBeenCalledWith(`user:${USER_ID}`);
      expect(mockServer.emit).toHaveBeenCalledWith('notification:new', {
        id: 'n1',
      });
    });

    it('notificacao deve ser entregue a todas as abas do usuario via sala user:{userId}', async () => {
      mockRateLimiter.checkConnectionLimit.mockResolvedValue(undefined);
      mockJwtService.verify.mockReturnValue({ sub: USER_ID });
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.notification.count.mockResolvedValue(0);

      // Simular duas conexoes do mesmo usuario
      const client1 = makeSocket({ id: SOCKET_ID }) as any;
      const client2 = makeSocket({ id: SOCKET_ID_2 }) as any;

      await gateway.handleConnection(client1);
      await gateway.handleConnection(client2);

      // emitToUser usa a sala user:{userId} que cobre todos os sockets
      gateway.emitToUser(USER_ID, 'test-event', { data: 'ok' });

      expect(mockServer.to).toHaveBeenCalledWith(`user:${USER_ID}`);
    });
  });

  // =========================================================================
  // handleDisconnect()
  // =========================================================================

  describe('handleDisconnect()', () => {
    it('deve remover o socket do userSockets ao desconectar', async () => {
      mockRateLimiter.checkConnectionLimit.mockResolvedValue(undefined);
      mockJwtService.verify.mockReturnValue({ sub: USER_ID });
      mockPrisma.user.findUnique.mockResolvedValue({
        id: USER_ID,
        name: USER_NAME,
        companyUsers: [{ companyId: COMPANY_ID }],
      });
      mockPrisma.notification.count.mockResolvedValue(0);

      const client = makeSocket() as any;
      await gateway.handleConnection(client);

      expect(gateway.isUserOnline(USER_ID)).toBe(true);

      gateway.handleDisconnect(client);

      expect(gateway.isUserOnline(USER_ID)).toBe(false);
    });

    it('deve lidar com desconexao de socket nao autenticado sem erro', () => {
      const client = makeSocket() as any; // userId undefined
      expect(() => gateway.handleDisconnect(client)).not.toThrow();
    });
  });

  // =========================================================================
  // handleMarkRead()
  // =========================================================================

  describe('handleMarkRead()', () => {
    const authenticatedClient = () => {
      const client = makeSocket() as any;
      client.userId = USER_ID;
      client.companyId = COMPANY_ID;
      return client;
    };

    it('deve marcar notificacoes como lidas e emitir unread-count atualizado', async () => {
      const client = authenticatedClient();
      mockPrisma.notification.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.notification.count.mockResolvedValue(2);

      const result = await gateway.handleMarkRead(client, {
        notificationId: 'notif-001',
      });

      expect(result.success).toBe(true);
      expect(result.updatedCount).toBe(1);

      // Deve emitir unread-count para todos os sockets do usuario
      expect(mockServer.to).toHaveBeenCalledWith(`user:${USER_ID}`);
      expect(mockServer.emit).toHaveBeenCalledWith('unread-count', {
        count: 2,
      });
    });

    it('com markAll:true deve marcar todas as notificacoes do companyId', async () => {
      const client = authenticatedClient();
      mockPrisma.notification.updateMany.mockResolvedValue({ count: 5 });
      mockPrisma.notification.count.mockResolvedValue(0);

      const result = await gateway.handleMarkRead(client, { markAll: true });

      expect(result.success).toBe(true);
      expect(result.updatedCount).toBe(5);
      expect(mockPrisma.notification.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            recipientId: USER_ID,
            companyId: COMPANY_ID,
            read: false,
          }),
        }),
      );
    });

    it('deve retornar erro quando usuario nao esta autenticado', async () => {
      const client = makeSocket() as any; // sem userId

      const result = await gateway.handleMarkRead(client, { markAll: true });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Not authenticated');
    });

    it('deve emitir unread-count via emitToUser apos marcar como lido', async () => {
      const client = authenticatedClient();
      mockPrisma.notification.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.notification.count.mockResolvedValue(3);

      await gateway.handleMarkRead(client, { notificationId: 'notif-001' });

      expect(mockServer.to).toHaveBeenCalledWith(`user:${USER_ID}`);
      expect(mockServer.emit).toHaveBeenCalledWith('unread-count', {
        count: 3,
      });
    });
  });

  // =========================================================================
  // handleGetUnreadCount()
  // =========================================================================

  describe('handleGetUnreadCount()', () => {
    it('deve retornar contagem correta filtrada por companyId', async () => {
      const client = makeSocket() as any;
      client.userId = USER_ID;
      client.companyId = COMPANY_ID;
      mockPrisma.notification.count.mockResolvedValue(7);

      const result = await gateway.handleGetUnreadCount(client);

      expect(result.success).toBe(true);
      expect(result.count).toBe(7);
      expect(mockPrisma.notification.count).toHaveBeenCalledWith({
        where: expect.objectContaining({
          recipientId: USER_ID,
          read: false,
          companyId: COMPANY_ID,
        }),
      });
    });

    it('deve retornar erro quando usuario nao esta autenticado', async () => {
      const client = makeSocket() as any; // sem userId

      const result = await gateway.handleGetUnreadCount(client);

      expect(result.success).toBe(false);
      expect(result.count).toBe(0);
    });
  });

  // =========================================================================
  // handleGetNotifications()
  // =========================================================================

  describe('handleGetNotifications()', () => {
    const notif = {
      id: 'notif-001',
      recipientId: USER_ID,
      companyId: COMPANY_ID,
      read: false,
      createdAt: new Date('2026-03-01T10:00:00Z'),
    };

    it('deve retornar notificacoes filtradas por companyId', async () => {
      const client = makeSocket() as any;
      client.userId = USER_ID;
      client.companyId = COMPANY_ID;
      mockPrisma.notification.findMany.mockResolvedValue([notif]);

      const result = await gateway.handleGetNotifications(client, {
        limit: 10,
      });

      expect(result.success).toBe(true);
      expect(result.notifications).toHaveLength(1);
      expect(mockPrisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            recipientId: USER_ID,
            companyId: COMPANY_ID,
          }),
        }),
      );
    });

    it('deve retornar erro quando usuario nao esta autenticado', async () => {
      const client = makeSocket() as any; // sem userId

      const result = await gateway.handleGetNotifications(client, {});

      expect(result.success).toBe(false);
      expect(result.notifications).toHaveLength(0);
    });

    it('deve respeitar o limite maximo de 50 por pagina', async () => {
      const client = makeSocket() as any;
      client.userId = USER_ID;
      client.companyId = COMPANY_ID;
      mockPrisma.notification.findMany.mockResolvedValue([]);

      await gateway.handleGetNotifications(client, { limit: 200 });

      expect(mockPrisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 51, // 50 + 1 para verificar hasMore
        }),
      );
    });

    it('deve filtrar por cursor quando fornecido', async () => {
      const client = makeSocket() as any;
      client.userId = USER_ID;
      client.companyId = COMPANY_ID;
      const cursor = '2026-03-01T10:00:00.000Z';
      mockPrisma.notification.findMany.mockResolvedValue([]);

      await gateway.handleGetNotifications(client, { cursor });

      const calledWhere =
        mockPrisma.notification.findMany.mock.calls[0][0].where;
      expect(calledWhere.createdAt).toEqual({ lt: new Date(cursor) });
    });
  });

  // =========================================================================
  // sendNotification()
  // =========================================================================

  describe('sendNotification()', () => {
    const notification = {
      id: 'notif-001',
      type: 'ORDER_CREATED',
      priority: 'HIGH',
      recipientId: USER_ID,
      companyId: COMPANY_ID,
      title: 'Novo Pedido Recebido',
      body: 'Teste',
      data: null,
      actionUrl: null,
      entityType: null,
      entityId: null,
      createdAt: new Date('2026-03-01T10:00:00Z'),
    };

    it('deve emitir notification:new para a sala user:{userId}', async () => {
      mockPrisma.notification.count.mockResolvedValue(3);

      await gateway.sendNotification(notification);

      expect(mockServer.to).toHaveBeenCalledWith(`user:${USER_ID}`);
      expect(mockServer.emit).toHaveBeenCalledWith(
        'notification:new',
        notification,
      );
    });

    it('deve emitir unread-count atualizado apos enviar notificacao', async () => {
      mockPrisma.notification.count.mockResolvedValue(5);

      await gateway.sendNotification(notification);

      expect(mockServer.emit).toHaveBeenCalledWith('unread-count', {
        count: 5,
      });
    });

    it('deve atualizar websocketStatus para DELIVERED quando usuario esta online', async () => {
      mockRateLimiter.checkConnectionLimit.mockResolvedValue(undefined);
      mockJwtService.verify.mockReturnValue({ sub: USER_ID });
      mockPrisma.user.findUnique.mockResolvedValue({
        id: USER_ID,
        name: USER_NAME,
        companyUsers: [{ companyId: COMPANY_ID }],
      });
      mockPrisma.notification.count.mockResolvedValue(0);

      // Conectar um socket para colocar o usuario "online"
      const client = makeSocket() as any;
      await gateway.handleConnection(client);

      mockPrisma.notification.update.mockResolvedValue({});
      mockPrisma.notification.count.mockResolvedValue(1);

      await gateway.sendNotification(notification);

      expect(mockPrisma.notification.update).toHaveBeenCalledWith({
        where: { id: 'notif-001' },
        data: expect.objectContaining({
          websocketStatus: 'DELIVERED',
          websocketSentAt: expect.any(Date),
        }),
      });
    });

    it('NAO deve atualizar websocketStatus quando usuario esta offline', async () => {
      // Nenhum socket conectado para USER_ID
      mockPrisma.notification.count.mockResolvedValue(0);
      mockPrisma.notification.update.mockResolvedValue({});

      await gateway.sendNotification(notification);

      expect(mockPrisma.notification.update).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // emitToUser() / emitToCompany()
  // =========================================================================

  describe('emitToUser()', () => {
    it('deve emitir para a sala user:{userId}', () => {
      gateway.emitToUser(USER_ID, 'custom-event', { payload: 1 });

      expect(mockServer.to).toHaveBeenCalledWith(`user:${USER_ID}`);
      expect(mockServer.emit).toHaveBeenCalledWith('custom-event', {
        payload: 1,
      });
    });
  });

  describe('emitToCompany()', () => {
    it('deve emitir para a sala company:{companyId}', () => {
      gateway.emitToCompany(COMPANY_ID, 'company-event', { msg: 'hello' });

      expect(mockServer.to).toHaveBeenCalledWith(`company:${COMPANY_ID}`);
      expect(mockServer.emit).toHaveBeenCalledWith('company-event', {
        msg: 'hello',
      });
    });
  });

  // =========================================================================
  // isUserOnline() / getOnlineCompanyUsersCount()
  // =========================================================================

  describe('isUserOnline()', () => {
    it('deve retornar false quando usuario nao tem sockets conectados', () => {
      expect(gateway.isUserOnline('usuario-inexistente')).toBe(false);
    });
  });

  describe('getOnlineCompanyUsersCount()', () => {
    it('deve retornar 0 quando nenhum usuario da empresa esta online', () => {
      expect(gateway.getOnlineCompanyUsersCount('empresa-vazia')).toBe(0);
    });
  });
});
