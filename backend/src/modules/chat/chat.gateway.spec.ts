import { Test, TestingModule } from '@nestjs/testing';
import { ChatGateway } from './chat.gateway';
import { ChatService } from './chat.service';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { RateLimiterService } from '../../common/services/rate-limiter.service';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const VALID_USER_ID = 'user-1';
const VALID_USER_NAME = 'Test User';
const VALID_SOCKET_ID = 'socket-1';
const VALID_ORDER_ID = 'order-abc';
const VALID_MESSAGE_ID = 'msg-xyz';
const VALID_IP = '127.0.0.1';

// ---------------------------------------------------------------------------
// Mock factories
// ---------------------------------------------------------------------------

const createMockSocket = (overrides: Record<string, unknown> = {}): any => ({
  id: VALID_SOCKET_ID,
  handshake: {
    auth: { token: 'valid-jwt' },
    query: {},
    address: VALID_IP,
  },
  userId: undefined as string | undefined,
  userName: undefined as string | undefined,
  emit: jest.fn(),
  join: jest.fn(),
  leave: jest.fn(),
  to: jest.fn().mockReturnThis(),
  disconnect: jest.fn(),
  ...overrides,
});

const mockServer = {
  to: jest.fn().mockReturnThis(),
  emit: jest.fn(),
};

// ---------------------------------------------------------------------------
// Service mocks
// ---------------------------------------------------------------------------

const mockChatService = {
  verifyOrderAccess: jest.fn(),
  getUnreadCount: jest.fn(),
  sendMessage: jest.fn(),
  getMessages: jest.fn(),
  acceptProposal: jest.fn(),
  rejectProposal: jest.fn(),
};

const mockJwtService = {
  verify: jest.fn(),
};

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
  },
};

const mockRateLimiter = {
  checkConnectionLimit: jest.fn(),
  checkMessageLimit: jest.fn(),
  getRemainingPoints: jest.fn(),
};

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('ChatGateway', () => {
  let gateway: ChatGateway;

  beforeEach(async () => {
    jest.clearAllMocks();

    // Default: rate limiters do not throw (no limit exceeded)
    mockRateLimiter.checkConnectionLimit.mockResolvedValue(undefined);
    mockRateLimiter.checkMessageLimit.mockResolvedValue(undefined);
    mockRateLimiter.getRemainingPoints.mockResolvedValue(9);

    // Default JWT verification returns a valid payload
    mockJwtService.verify.mockReturnValue({ sub: VALID_USER_ID });

    // Default Prisma user lookup returns a user
    mockPrisma.user.findUnique.mockResolvedValue({
      id: VALID_USER_ID,
      name: VALID_USER_NAME,
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatGateway,
        { provide: ChatService, useValue: mockChatService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RateLimiterService, useValue: mockRateLimiter },
      ],
    }).compile();

    gateway = module.get<ChatGateway>(ChatGateway);

    // Attach the mock server after compilation
    (gateway as any).server = mockServer;
  });

  // =========================================================================
  // handleConnection()
  // =========================================================================

  describe('handleConnection()', () => {
    it('deve desconectar cliente sem token', async () => {
      const client = createMockSocket({
        handshake: {
          auth: {},
          query: {},
          address: VALID_IP,
        },
      });

      await gateway.handleConnection(client);

      expect(client.disconnect).toHaveBeenCalled();
      expect(client.emit).not.toHaveBeenCalledWith('connected', expect.anything());
    });

    it('deve desconectar cliente com token inválido', async () => {
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('invalid signature');
      });

      const client = createMockSocket();

      await gateway.handleConnection(client);

      expect(client.disconnect).toHaveBeenCalled();
      expect(client.emit).toHaveBeenCalledWith(
        'error',
        expect.objectContaining({ message: 'Authentication failed' }),
      );
    });

    it('deve autenticar cliente com JWT válido e emitir evento "connected"', async () => {
      const client = createMockSocket();

      await gateway.handleConnection(client);

      expect(client.userId).toBe(VALID_USER_ID);
      expect(client.userName).toBe(VALID_USER_NAME);
      expect(client.emit).toHaveBeenCalledWith(
        'connected',
        expect.objectContaining({
          userId: VALID_USER_ID,
          userName: VALID_USER_NAME,
          socketId: VALID_SOCKET_ID,
        }),
      );
      expect(client.disconnect).not.toHaveBeenCalled();
    });

    it('deve bloquear conexão por rate limit de IP', async () => {
      mockRateLimiter.checkConnectionLimit.mockRejectedValue(
        new Error('Too many connection attempts. Try again in 300 seconds.'),
      );

      const client = createMockSocket();

      await gateway.handleConnection(client);

      expect(client.emit).toHaveBeenCalledWith(
        'error',
        expect.objectContaining({
          message: 'Too many connection attempts',
          code: 'RATE_LIMIT_EXCEEDED',
        }),
      );
      expect(client.disconnect).toHaveBeenCalled();
      // JWT should never be verified when rate-limited
      expect(mockJwtService.verify).not.toHaveBeenCalled();
    });

    it('deve desconectar cliente cujo usuário não existe no banco', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const client = createMockSocket();

      await gateway.handleConnection(client);

      expect(client.disconnect).toHaveBeenCalled();
      expect(client.emit).not.toHaveBeenCalledWith('connected', expect.anything());
    });

    it('deve aceitar token via query string quando auth está vazio', async () => {
      const client = createMockSocket({
        handshake: {
          auth: {},
          query: { token: 'valid-jwt-from-query' },
          address: VALID_IP,
        },
      });

      await gateway.handleConnection(client);

      expect(mockJwtService.verify).toHaveBeenCalledWith('valid-jwt-from-query');
      expect(client.userId).toBe(VALID_USER_ID);
    });

    it('deve registrar o socket no mapa userSockets após conexão bem-sucedida', async () => {
      const client = createMockSocket();

      await gateway.handleConnection(client);

      const userSockets = (gateway as any).userSockets as Map<string, Set<string>>;
      expect(userSockets.has(VALID_USER_ID)).toBe(true);
      expect(userSockets.get(VALID_USER_ID)!.has(VALID_SOCKET_ID)).toBe(true);
    });
  });

  // =========================================================================
  // handleJoinOrder()
  // =========================================================================

  describe('handleJoinOrder()', () => {
    it('deve adicionar cliente à sala order:{id}', async () => {
      mockChatService.verifyOrderAccess.mockResolvedValue(undefined);
      mockChatService.getUnreadCount.mockResolvedValue(3);

      const client = createMockSocket({
        userId: VALID_USER_ID,
        userName: VALID_USER_NAME,
      });

      const result = await gateway.handleJoinOrder(client, {
        orderId: VALID_ORDER_ID,
      });

      expect(client.join).toHaveBeenCalledWith(`order:${VALID_ORDER_ID}`);
      expect(result).toEqual(
        expect.objectContaining({
          success: true,
          room: `order:${VALID_ORDER_ID}`,
          unreadCount: 3,
        }),
      );
    });

    it('deve rejeitar acesso de usuário sem relação com o pedido', async () => {
      mockChatService.verifyOrderAccess.mockRejectedValue(
        new Error('Acesso negado a este pedido'),
      );

      const client = createMockSocket({
        userId: VALID_USER_ID,
        userName: VALID_USER_NAME,
      });

      const result = await gateway.handleJoinOrder(client, {
        orderId: VALID_ORDER_ID,
      });

      expect(client.join).not.toHaveBeenCalled();
      expect(result).toEqual(
        expect.objectContaining({
          success: false,
          error: 'Acesso negado a este pedido',
        }),
      );
    });

    it('deve retornar erro quando cliente não está autenticado', async () => {
      const client = createMockSocket({
        userId: undefined,
        userName: undefined,
      });

      const result = await gateway.handleJoinOrder(client, {
        orderId: VALID_ORDER_ID,
      });

      expect(result).toEqual(
        expect.objectContaining({
          success: false,
          error: 'Not authenticated',
        }),
      );
      expect(mockChatService.verifyOrderAccess).not.toHaveBeenCalled();
    });

    it('deve notificar outros na sala ao entrar', async () => {
      mockChatService.verifyOrderAccess.mockResolvedValue(undefined);
      mockChatService.getUnreadCount.mockResolvedValue(0);

      const client = createMockSocket({
        userId: VALID_USER_ID,
        userName: VALID_USER_NAME,
      });

      await gateway.handleJoinOrder(client, { orderId: VALID_ORDER_ID });

      expect(client.to).toHaveBeenCalledWith(`order:${VALID_ORDER_ID}`);
      expect(client.emit).toHaveBeenCalledWith(
        'user-joined',
        expect.objectContaining({
          userId: VALID_USER_ID,
          userName: VALID_USER_NAME,
        }),
      );
    });
  });

  // =========================================================================
  // handleSendMessage()
  // =========================================================================

  describe('handleSendMessage()', () => {
    it('deve bloquear mensagem maior que 5000 caracteres', async () => {
      const client = createMockSocket({
        userId: VALID_USER_ID,
        userName: VALID_USER_NAME,
      });

      const result = await gateway.handleSendMessage(client, {
        orderId: VALID_ORDER_ID,
        type: 'TEXT' as const,
        content: 'a'.repeat(5001),
      });

      expect(result).toEqual(
        expect.objectContaining({
          success: false,
          error: 'Mensagem muito longa (máximo 5000 caracteres)',
          code: 'MESSAGE_TOO_LONG',
        }),
      );
      expect(mockChatService.sendMessage).not.toHaveBeenCalled();
    });

    it('deve aceitar mensagem com exatamente 5000 caracteres', async () => {
      const mockMessage = {
        id: VALID_MESSAGE_ID,
        content: 'a'.repeat(5000),
        createdAt: new Date(),
      };

      mockChatService.sendMessage.mockResolvedValue(mockMessage);

      const client = createMockSocket({
        userId: VALID_USER_ID,
        userName: VALID_USER_NAME,
      });

      const result = await gateway.handleSendMessage(client, {
        orderId: VALID_ORDER_ID,
        type: 'TEXT' as const,
        content: 'a'.repeat(5000),
      });

      expect(result).toEqual(expect.objectContaining({ success: true }));
      expect(mockChatService.sendMessage).toHaveBeenCalled();
    });

    it('deve aplicar rate limit por userId', async () => {
      mockRateLimiter.checkMessageLimit.mockRejectedValue(
        new Error('Rate limit exceeded. Try again in 60 seconds.'),
      );

      const client = createMockSocket({
        userId: VALID_USER_ID,
        userName: VALID_USER_NAME,
      });

      const result = await gateway.handleSendMessage(client, {
        orderId: VALID_ORDER_ID,
        type: 'TEXT' as const,
        content: 'Olá!',
      });

      expect(result).toEqual(
        expect.objectContaining({
          success: false,
          code: 'RATE_LIMIT_EXCEEDED',
        }),
      );
      expect(mockChatService.sendMessage).not.toHaveBeenCalled();
    });

    it('deve enviar mensagem com sucesso e fazer broadcast na sala', async () => {
      const mockMessage = {
        id: VALID_MESSAGE_ID,
        content: 'Olá, tudo bem?',
        createdAt: new Date(),
      };

      mockChatService.sendMessage.mockResolvedValue(mockMessage);

      const client = createMockSocket({
        userId: VALID_USER_ID,
        userName: VALID_USER_NAME,
      });

      const result = await gateway.handleSendMessage(client, {
        orderId: VALID_ORDER_ID,
        type: 'TEXT' as const,
        content: 'Olá, tudo bem?',
      });

      expect(result).toEqual(expect.objectContaining({ success: true }));
      expect(mockServer.to).toHaveBeenCalledWith(`order:${VALID_ORDER_ID}`);
      expect(mockServer.emit).toHaveBeenCalledWith('new-message', mockMessage);
    });

    it('deve verificar o rate limit usando o userId do cliente', async () => {
      mockChatService.sendMessage.mockResolvedValue({ id: 'msg-1' });

      const client = createMockSocket({
        userId: VALID_USER_ID,
        userName: VALID_USER_NAME,
      });

      await gateway.handleSendMessage(client, {
        orderId: VALID_ORDER_ID,
        type: 'TEXT' as const,
        content: 'Mensagem de teste',
      });

      expect(mockRateLimiter.checkMessageLimit).toHaveBeenCalledWith(VALID_USER_ID);
    });
  });

  // =========================================================================
  // handleMarkRead()
  // =========================================================================

  describe('handleMarkRead()', () => {
    it('deve emitir evento "messages-read" para outros na sala', async () => {
      mockChatService.getMessages.mockResolvedValue({ messages: [], hasMore: false });

      const client = createMockSocket({
        userId: VALID_USER_ID,
        userName: VALID_USER_NAME,
      });

      const result = await gateway.handleMarkRead(client, { orderId: VALID_ORDER_ID });

      expect(result).toEqual({ success: true });
      expect(client.to).toHaveBeenCalledWith(`order:${VALID_ORDER_ID}`);
      expect(client.emit).toHaveBeenCalledWith(
        'messages-read',
        expect.objectContaining({
          orderId: VALID_ORDER_ID,
          userId: VALID_USER_ID,
          userName: VALID_USER_NAME,
        }),
      );
    });

    it('deve chamar chatService.getMessages para marcar mensagens como lidas', async () => {
      mockChatService.getMessages.mockResolvedValue({ messages: [], hasMore: false });

      const client = createMockSocket({
        userId: VALID_USER_ID,
        userName: VALID_USER_NAME,
      });

      await gateway.handleMarkRead(client, { orderId: VALID_ORDER_ID });

      expect(mockChatService.getMessages).toHaveBeenCalledWith(
        VALID_ORDER_ID,
        VALID_USER_ID,
      );
    });

    it('deve retornar erro quando chatService.getMessages lança exceção', async () => {
      mockChatService.getMessages.mockRejectedValue(new Error('Pedido não encontrado'));

      const client = createMockSocket({
        userId: VALID_USER_ID,
        userName: VALID_USER_NAME,
      });

      const result = await gateway.handleMarkRead(client, { orderId: VALID_ORDER_ID });

      expect(result).toEqual(
        expect.objectContaining({
          success: false,
          error: 'Pedido não encontrado',
        }),
      );
    });
  });

  // =========================================================================
  // handleAcceptProposal()
  // =========================================================================

  describe('handleAcceptProposal()', () => {
    it('deve emitir evento "proposal-updated" com status ACCEPTED', async () => {
      const mockUpdatedOrder = {
        id: VALID_ORDER_ID,
        pricePerUnit: 90,
        quantity: 60,
      };

      mockChatService.acceptProposal.mockResolvedValue(mockUpdatedOrder);

      const client = createMockSocket({
        userId: VALID_USER_ID,
        userName: VALID_USER_NAME,
      });

      const result = await gateway.handleAcceptProposal(client, {
        orderId: VALID_ORDER_ID,
        messageId: VALID_MESSAGE_ID,
      });

      expect(result).toEqual({ success: true });
      expect(mockServer.to).toHaveBeenCalledWith(`order:${VALID_ORDER_ID}`);
      expect(mockServer.emit).toHaveBeenCalledWith(
        'proposal-updated',
        expect.objectContaining({
          messageId: VALID_MESSAGE_ID,
          status: 'ACCEPTED',
          updatedOrder: mockUpdatedOrder,
        }),
      );
    });

    it('deve chamar chatService.acceptProposal com messageId e userId corretos', async () => {
      mockChatService.acceptProposal.mockResolvedValue({});

      const client = createMockSocket({
        userId: VALID_USER_ID,
        userName: VALID_USER_NAME,
      });

      await gateway.handleAcceptProposal(client, {
        orderId: VALID_ORDER_ID,
        messageId: VALID_MESSAGE_ID,
      });

      expect(mockChatService.acceptProposal).toHaveBeenCalledWith(
        VALID_MESSAGE_ID,
        VALID_USER_ID,
      );
    });

    it('deve retornar erro quando chatService.acceptProposal lança exceção', async () => {
      mockChatService.acceptProposal.mockRejectedValue(
        new Error('Proposta já foi processada'),
      );

      const client = createMockSocket({
        userId: VALID_USER_ID,
        userName: VALID_USER_NAME,
      });

      const result = await gateway.handleAcceptProposal(client, {
        orderId: VALID_ORDER_ID,
        messageId: VALID_MESSAGE_ID,
      });

      expect(result).toEqual(
        expect.objectContaining({
          success: false,
          error: 'Proposta já foi processada',
        }),
      );
      expect(mockServer.emit).not.toHaveBeenCalledWith('proposal-updated', expect.anything());
    });
  });

  // =========================================================================
  // handleDisconnect()
  // =========================================================================

  describe('handleDisconnect()', () => {
    it('deve remover socket do mapa userSockets ao desconectar', async () => {
      // First connect to populate the map
      const client = createMockSocket();
      await gateway.handleConnection(client);

      const userSocketsBefore = (gateway as any).userSockets as Map<string, Set<string>>;
      expect(userSocketsBefore.has(VALID_USER_ID)).toBe(true);

      // Now disconnect
      client.userId = VALID_USER_ID;
      gateway.handleDisconnect(client);

      const userSocketsAfter = (gateway as any).userSockets as Map<string, Set<string>>;
      expect(userSocketsAfter.has(VALID_USER_ID)).toBe(false);
    });

    it('não deve lançar erro ao desconectar cliente não autenticado', () => {
      const client = createMockSocket({ userId: undefined });

      expect(() => gateway.handleDisconnect(client)).not.toThrow();
    });
  });

  // =========================================================================
  // emitToUser() helper
  // =========================================================================

  describe('emitToUser()', () => {
    it('deve emitir evento para todos os sockets do usuário', async () => {
      const client = createMockSocket();
      await gateway.handleConnection(client);

      gateway.emitToUser(VALID_USER_ID, 'test-event', { data: 'value' });

      expect(mockServer.to).toHaveBeenCalledWith(VALID_SOCKET_ID);
      expect(mockServer.emit).toHaveBeenCalledWith('test-event', { data: 'value' });
    });

    it('não deve emitir nada quando userId não tem sockets rastreados', () => {
      gateway.emitToUser('unknown-user', 'test-event', {});

      expect(mockServer.to).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // emitToOrder() helper
  // =========================================================================

  describe('emitToOrder()', () => {
    it('deve emitir evento para a sala do pedido', () => {
      gateway.emitToOrder(VALID_ORDER_ID, 'order-event', { status: 'updated' });

      expect(mockServer.to).toHaveBeenCalledWith(`order:${VALID_ORDER_ID}`);
      expect(mockServer.emit).toHaveBeenCalledWith('order-event', { status: 'updated' });
    });
  });
});
