import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

// ---------------------------------------------------------------------------
// Mock socket.io-client
// Must be declared before importing the hook so vi.mock hoisting works.
// ---------------------------------------------------------------------------

// We need a mutable mock socket that can be controlled per-test.
let mockSocketHandlers: Record<string, ((...args: any[]) => void)[]> = {};
let mockManagerHandlers: Record<string, ((...args: any[]) => void)[]> = {};

const mockSocket = {
  on: vi.fn((event: string, handler: (...args: any[]) => void) => {
    if (!mockSocketHandlers[event]) mockSocketHandlers[event] = [];
    mockSocketHandlers[event].push(handler);
  }),
  off: vi.fn(),
  emit: vi.fn(),
  connect: vi.fn(),
  disconnect: vi.fn(),
  connected: false,
  io: {
    on: vi.fn((event: string, handler: (...args: any[]) => void) => {
      if (!mockManagerHandlers[event]) mockManagerHandlers[event] = [];
      mockManagerHandlers[event].push(handler);
    }),
  },
};

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => mockSocket),
}));

// ---------------------------------------------------------------------------
// Mock AuthContext
// ---------------------------------------------------------------------------
vi.mock('../contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 'user-1', name: 'Usuário Teste', role: 'BRAND' },
  })),
}));

// ---------------------------------------------------------------------------
// Mock auth.service (getToken used inside hook)
// ---------------------------------------------------------------------------
vi.mock('../services/auth.service', () => ({
  authService: {
    getToken: vi.fn(() => 'mock-jwt-token'),
  },
}));

// ---------------------------------------------------------------------------
// Mock useNetworkStatus
// ---------------------------------------------------------------------------
let mockIsOnline = true;
vi.mock('./useNetworkStatus', () => ({
  useNetworkStatus: vi.fn(() => mockIsOnline),
}));

// ---------------------------------------------------------------------------
// Mock useMessageQueue
// ---------------------------------------------------------------------------
let mockPendingCount = 0;
let mockIsProcessing = false;
const mockQueueMessage = vi.fn(async () => 'temp-id-123');
const mockProcessQueue = vi.fn();
const mockCleanupOld = vi.fn();

vi.mock('./useMessageQueue', () => ({
  useMessageQueue: vi.fn(() => ({
    pendingCount: mockPendingCount,
    isProcessing: mockIsProcessing,
    queueMessage: mockQueueMessage,
    processQueue: mockProcessQueue,
    cleanupOld: mockCleanupOld,
  })),
}));

// ---------------------------------------------------------------------------
// Import the hook after mocks are in place
// ---------------------------------------------------------------------------
import { useChatSocket } from './useChatSocket';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Trigger a socket event as if the server emitted it. */
function emitSocketEvent(event: string, ...args: any[]) {
  const handlers = mockSocketHandlers[event] || [];
  handlers.forEach((h) => h(...args));
}

/** Simulate server-side emit callback (acknowledgement). */
function resolveEmitCallback(callIndex: number, response: any) {
  const call = mockSocket.emit.mock.calls[callIndex];
  if (call) {
    const callback = call[call.length - 1];
    if (typeof callback === 'function') callback(response);
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useChatSocket', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSocketHandlers = {};
    mockManagerHandlers = {};
    mockPendingCount = 0;
    mockIsProcessing = false;
    mockIsOnline = true;
    // Reset connected state
    mockSocket.connected = false;
    // Re-register the on/emit stubs to capture new handlers
    mockSocket.on.mockImplementation((event: string, handler: (...args: any[]) => void) => {
      if (!mockSocketHandlers[event]) mockSocketHandlers[event] = [];
      mockSocketHandlers[event].push(handler);
    });
    mockSocket.io.on.mockImplementation((event: string, handler: (...args: any[]) => void) => {
      if (!mockManagerHandlers[event]) mockManagerHandlers[event] = [];
      mockManagerHandlers[event].push(handler);
    });
    // Default emit: auto-resolve acknowledgements with success
    mockSocket.emit.mockImplementation((_event: string, _data: any, callback?: (r: any) => void) => {
      if (typeof callback === 'function') {
        callback({ success: true });
      }
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // -------------------------------------------------------------------------
  // TC-01: Socket should only be initialized when orderId is not null
  // -------------------------------------------------------------------------
  it('deve inicializar socket apenas quando orderId não é null', async () => {
    const { io } = await import('socket.io-client');

    // orderId = null — socket should NOT be created
    const { result, rerender } = renderHook(
      ({ orderId }: { orderId: string | null }) => useChatSocket(orderId),
      { initialProps: { orderId: null } },
    );

    expect(vi.mocked(io)).not.toHaveBeenCalled();
    expect(result.current.isConnected).toBe(false);

    // Pass a valid orderId — socket should be created
    rerender({ orderId: 'order-abc' });

    await waitFor(() => {
      expect(vi.mocked(io)).toHaveBeenCalledTimes(1);
    });
  });

  // -------------------------------------------------------------------------
  // TC-02: sendMessage() should queue the message when isConnected = false
  // -------------------------------------------------------------------------
  it('sendMessage() deve enfileirar mensagem quando isConnected = false', async () => {
    // Hook renders with a valid orderId but socket never fires 'connected'
    // so isConnected stays false.
    const { result } = renderHook(() => useChatSocket('order-abc'));

    let sendResult: boolean | undefined;
    await act(async () => {
      sendResult = await result.current.sendMessage({ type: 'TEXT', content: 'Olá' });
    });

    expect(mockQueueMessage).toHaveBeenCalledWith(
      expect.objectContaining({ orderId: 'order-abc', type: 'TEXT', content: 'Olá' }),
    );
    expect(sendResult).toBe(true);
  });

  // -------------------------------------------------------------------------
  // TC-03: sendMessage() should emit via socket when isConnected = true
  // -------------------------------------------------------------------------
  it('sendMessage() deve enviar via socket quando isConnected = true', async () => {
    const { result } = renderHook(() => useChatSocket('order-abc'));

    // Simulate the server's 'connected' event to set isConnected = true
    act(() => {
      emitSocketEvent('connected', { userId: 'user-1', userName: 'Usuário Teste' });
    });

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    let sendResult: boolean | undefined;
    await act(async () => {
      sendResult = await result.current.sendMessage({ type: 'TEXT', content: 'Mensagem online' });
    });

    expect(mockSocket.emit).toHaveBeenCalledWith(
      'send-message',
      expect.objectContaining({ orderId: 'order-abc', type: 'TEXT', content: 'Mensagem online' }),
      expect.any(Function),
    );
    expect(sendResult).toBe(true);
  });

  // -------------------------------------------------------------------------
  // TC-04: acceptProposal() should emit 'accept-proposal' event
  // -------------------------------------------------------------------------
  it('acceptProposal() deve emitir evento accept-proposal', async () => {
    const { result } = renderHook(() => useChatSocket('order-abc'));

    // Make socket connected
    act(() => {
      emitSocketEvent('connected', { userId: 'user-1', userName: 'Usuário Teste' });
    });

    await waitFor(() => expect(result.current.isConnected).toBe(true));

    let accepted: boolean | undefined;
    await act(async () => {
      accepted = await result.current.acceptProposal('msg-001');
    });

    expect(mockSocket.emit).toHaveBeenCalledWith(
      'accept-proposal',
      { orderId: 'order-abc', messageId: 'msg-001' },
      expect.any(Function),
    );
    expect(accepted).toBe(true);
  });

  // -------------------------------------------------------------------------
  // TC-05: rejectProposal() should emit 'reject-proposal' event
  // -------------------------------------------------------------------------
  it('rejectProposal() deve emitir evento reject-proposal', async () => {
    const { result } = renderHook(() => useChatSocket('order-abc'));

    act(() => {
      emitSocketEvent('connected', { userId: 'user-1', userName: 'Usuário Teste' });
    });

    await waitFor(() => expect(result.current.isConnected).toBe(true));

    let rejected: boolean | undefined;
    await act(async () => {
      rejected = await result.current.rejectProposal('msg-002');
    });

    expect(mockSocket.emit).toHaveBeenCalledWith(
      'reject-proposal',
      { orderId: 'order-abc', messageId: 'msg-002' },
      expect.any(Function),
    );
    expect(rejected).toBe(true);
  });

  // -------------------------------------------------------------------------
  // TC-06: loadMore() should use cursor from the oldest message
  // -------------------------------------------------------------------------
  it('loadMore() deve usar cursor do oldest message', async () => {
    // Prepare emit mock to respond to get-messages with messages on first call
    // and with more messages on subsequent calls.
    let emitCallCount = 0;
    mockSocket.emit.mockImplementation((_event: string, data: any, callback?: (r: any) => void) => {
      if (!callback) return;
      if (_event === 'join-order') {
        callback({ success: true, unreadCount: 0 });
      } else if (_event === 'get-messages') {
        emitCallCount++;
        if (emitCallCount === 1) {
          // Initial load: return messages, oldest has id 'msg-oldest'
          callback({
            success: true,
            messages: [
              { id: 'msg-oldest', orderId: 'order-abc', senderId: 'u1', type: 'TEXT', content: 'Primeira', read: true, createdAt: '2024-01-01T10:00:00Z', sender: { id: 'u1', name: 'A', role: 'BRAND' } },
              { id: 'msg-newer', orderId: 'order-abc', senderId: 'u1', type: 'TEXT', content: 'Segunda', read: true, createdAt: '2024-01-01T11:00:00Z', sender: { id: 'u1', name: 'A', role: 'BRAND' } },
            ],
            hasMore: true,
          });
        } else {
          // loadMore call: return older messages
          callback({ success: true, messages: [], hasMore: false });
        }
      } else {
        callback({ success: true });
      }
    });

    const { result } = renderHook(() => useChatSocket('order-abc'));

    act(() => {
      emitSocketEvent('connected', { userId: 'user-1', userName: 'Usuário Teste' });
    });

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
      expect(result.current.messages.length).toBe(2);
    });

    await act(async () => {
      await result.current.loadMore();
    });

    // The second get-messages call (loadMore) must include cursor = id of oldest message
    const loadMoreCall = mockSocket.emit.mock.calls.find(
      (call) => call[0] === 'get-messages' && call[1]?.cursor === 'msg-oldest',
    );
    expect(loadMoreCall).toBeDefined();
    expect(loadMoreCall?.[1]).toMatchObject({
      orderId: 'order-abc',
      cursor: 'msg-oldest',
      direction: 'before',
    });
  });

  // -------------------------------------------------------------------------
  // TC-07: On reconnect, pending messages queue should be processed
  // -------------------------------------------------------------------------
  it('ao reconectar deve processar fila de mensagens pendentes', async () => {
    // Start with pendingCount > 0 so queue processing triggers
    mockPendingCount = 2;

    const { rerender } = renderHook(() => useChatSocket('order-abc'));

    // Simulate reconnect: fire connected event
    act(() => {
      emitSocketEvent('connected', { userId: 'user-1', userName: 'Usuário Teste' });
    });

    await waitFor(() => {
      expect(mockProcessQueue).toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // TC-08: rateLimitInfo.blocked should be true on RATE_LIMIT_EXCEEDED error
  // -------------------------------------------------------------------------
  it('rateLimitInfo.blocked deve ser true ao receber erro RATE_LIMIT_EXCEEDED', async () => {
    const { result } = renderHook(() => useChatSocket('order-abc'));

    act(() => {
      emitSocketEvent('connected', { userId: 'user-1', userName: 'Usuário Teste' });
    });

    await waitFor(() => expect(result.current.isConnected).toBe(true));

    // Server emits a rate limit error
    act(() => {
      emitSocketEvent('error', {
        message: 'Too many requests',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: '30',
      });
    });

    expect(result.current.rateLimitInfo.blocked).toBe(true);
    expect(result.current.rateLimitInfo.remaining).toBe(0);
    expect(result.current.rateLimitInfo.retryAfter).toBe(30);
  });

  // -------------------------------------------------------------------------
  // TC-09: Socket should be disconnected when component unmounts
  // -------------------------------------------------------------------------
  it('socket deve ser desconectado ao desmontar o componente', async () => {
    mockSocket.connected = false;

    const { unmount } = renderHook(() => useChatSocket('order-abc'));

    unmount();

    expect(mockSocket.disconnect).toHaveBeenCalled();
  });
});
