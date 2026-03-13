import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../contexts/AuthContext';
import { authService } from '../services/auth.service';
import { useMessageQueue } from './useMessageQueue';
import { useNetworkStatus } from './useNetworkStatus';

export interface ChatMessage {
    id: string;
    orderId: string;
    senderId: string;
    type: 'TEXT' | 'PROPOSAL';
    content?: string;
    proposalData?: {
        originalValues: {
            pricePerUnit: number;
            quantity: number;
            deliveryDeadline: string;
        };
        newValues: {
            pricePerUnit: number;
            quantity: number;
            deliveryDeadline: string;
        };
        status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
    };
    read: boolean;
    createdAt: string;
    sender: {
        id: string;
        name: string;
        role: string;
    };
    isPending?: boolean; // Flag for offline queued messages
}

interface TypingUser {
    userId: string;
    userName: string;
}

interface RateLimitInfo {
    remaining: number;
    blocked: boolean;
    retryAfter: number;
}

interface UseChatSocketOptions {
    onConnect?: () => void;
    onDisconnect?: () => void;
    onError?: (error: string) => void;
    onOrderUpdated?: (order: any) => void;
}

interface UseChatSocketReturn {
    messages: ChatMessage[];
    isConnected: boolean;
    isOnline: boolean;
    isLoading: boolean;
    typingUsers: TypingUser[];
    unreadCount: number;
    rateLimitInfo: RateLimitInfo;
    pendingCount: number;
    hasMore: boolean;
    isLoadingMore: boolean;
    sendMessage: (data: SendMessageData) => Promise<boolean>;
    sendTyping: (isTyping: boolean) => void;
    markAsRead: () => void;
    acceptProposal: (messageId: string) => Promise<boolean>;
    rejectProposal: (messageId: string) => Promise<boolean>;
    loadMessages: () => Promise<void>;
    loadMore: () => Promise<void>;
}

interface SendMessageData {
    type: 'TEXT' | 'PROPOSAL';
    content?: string;
    proposedPrice?: number;
    proposedQuantity?: number;
    proposedDeadline?: string;
}

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3000';

export function useChatSocket(
    orderId: string | null,
    options: UseChatSocketOptions = {}
): UseChatSocketReturn {
    const { user: authUser } = useAuth();
    const socketRef = useRef<Socket | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [rateLimitInfo, setRateLimitInfo] = useState<RateLimitInfo>({
        remaining: 10,
        blocked: false,
        retryAfter: 0,
    });
    const [hasMore, setHasMore] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const lastSyncTimestampRef = useRef<string | null>(null);
    const oldestCursorRef = useRef<string | null>(null);

    // Network status detection
    const isOnline = useNetworkStatus();

    // Message queue for offline support
    const {
        pendingCount,
        isProcessing,
        queueMessage,
        processQueue,
        cleanupOld,
    } = useMessageQueue({
        orderId: orderId || '',
        onSendSuccess: (msg) => {
            if (import.meta.env.DEV) console.log('Queued message sent successfully:', msg.id);
            // Remove mensagem temporária e adicionar a mensagem real do servidor
            setMessages(prev => prev.filter(m => m.id !== msg.id));
        },
        onSendError: (error) => {
            console.error('Failed to send queued message:', error);
            options.onError?.(error);
        },
    });

    // Stable refs for callback options (prevents socket reconnection on every render)
    const onOrderUpdatedRef = useRef(options.onOrderUpdated);
    const onConnectRef = useRef(options.onConnect);
    const onDisconnectRef = useRef(options.onDisconnect);
    const onErrorRef = useRef(options.onError);
    useEffect(() => {
        onOrderUpdatedRef.current = options.onOrderUpdated;
        onConnectRef.current = options.onConnect;
        onDisconnectRef.current = options.onDisconnect;
        onErrorRef.current = options.onError;
    });

    // Cleanup old messages on mount
    useEffect(() => {
        cleanupOld();
    }, [cleanupOld]);

    // SEC-F001: Get auth token from in-memory store
    const getToken = useCallback(() => {
        return authService.getToken();
    }, []);

    // Initialize socket connection
    useEffect(() => {
        if (!orderId) {
            setMessages([]);
            setIsLoading(false);
            return;
        }

        const token = getToken();
        if (!token) {
            console.error('No auth token available');
            setIsLoading(false);
            return;
        }

        // Create socket connection with exponential backoff
        const socket = io(`${SOCKET_URL}/chat`, {
            auth: { token },
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: 10, // Increased from 5 to 10
            reconnectionDelay: 1000, // Initial delay: 1s
            reconnectionDelayMax: 30000, // Maximum delay: 30s
            randomizationFactor: 0.5, // Add jitter to avoid thundering herd (±50%)
            timeout: 20000, // Connection timeout: 20s
        });

        socketRef.current = socket;

        // Connection events
        socket.on('connect', () => {
            if (import.meta.env.DEV) console.log('Chat socket connected, waiting for authentication...');
        });

        // Wait for server to confirm authentication before joining room
        socket.on('connected', (data: { userId: string; userName: string }) => {
            if (import.meta.env.DEV) console.log('Chat socket authenticated:', data.userName);
            setIsConnected(true);
            onConnectRef.current?.();

            // Join order room (now that we're authenticated)
            socket.emit('join-order', { orderId }, (response: any) => {
                if (response.success) {
                    setUnreadCount(response.unreadCount || 0);
                } else {
                    console.error('Failed to join order:', response.error);
                    onErrorRef.current?.(response.error);
                }
            });

            // Load initial messages with pagination
            socket.emit('get-messages', { orderId, limit: 50 }, (response: any) => {
                if (response.success) {
                    setMessages(response.messages || []);
                    setHasMore(response.hasMore || false);
                    // Set oldest cursor to first message (messages are in ascending order)
                    if (response.messages && response.messages.length > 0) {
                        oldestCursorRef.current = response.messages[0].id;
                    }
                }
                setIsLoading(false);
            });
        });

        socket.on('disconnect', (reason) => {
            if (import.meta.env.DEV) console.log('Chat socket disconnected:', reason);
            setIsConnected(false);
            onDisconnectRef.current?.();
        });

        socket.on('connect_error', (error) => {
            console.error('Chat socket connection error:', error.message);
            setIsLoading(false);
            onErrorRef.current?.(error.message);
        });

        // Log reconnection attempts
        socket.io.on('reconnect_attempt', (attempt) => {
            if (import.meta.env.DEV) console.log(`[Chat] Reconnection attempt ${attempt}`);
        });

        // Handle failed reconnection
        socket.io.on('reconnect_failed', () => {
            console.error('[Chat] All reconnection attempts failed');
            onErrorRef.current?.('Não foi possível reconectar ao servidor. Por favor, recarregue a página.');
        });

        socket.on('error', (error: { message: string; code?: string; retryAfter?: string }) => {
            console.error('Chat socket error:', error.message);
            setIsLoading(false);

            // Handle rate limit errors
            if (error.code === 'RATE_LIMIT_EXCEEDED') {
                const retryAfter = parseInt(error.retryAfter || '60');
                setRateLimitInfo({
                    remaining: 0,
                    blocked: true,
                    retryAfter: retryAfter,
                });

                // Auto-unblock after retry period
                setTimeout(() => {
                    setRateLimitInfo(prev => ({
                        ...prev,
                        blocked: false,
                        remaining: 10,
                    }));
                }, retryAfter * 1000);
            }

            onErrorRef.current?.(error.message);
        });

        // Message events
        socket.on('new-message', (message: ChatMessage) => {
            setMessages((prev) => {
                // Avoid duplicates
                if (prev.some((m) => m.id === message.id)) {
                    return prev;
                }
                return [...prev, message];
            });
        });

        socket.on('messages-read', ({ userId }: { userId: string }) => {
            setMessages((prev) =>
                prev.map((msg) => ({
                    ...msg,
                    read: msg.senderId === userId ? msg.read : true,
                }))
            );
            setUnreadCount(0);
        });

        socket.on('user-typing', (data: TypingUser & { isTyping: boolean }) => {
            setTypingUsers((prev) => {
                if (data.isTyping) {
                    if (prev.some((u) => u.userId === data.userId)) {
                        return prev;
                    }
                    return [...prev, { userId: data.userId, userName: data.userName }];
                } else {
                    return prev.filter((u) => u.userId !== data.userId);
                }
            });
        });

        socket.on('proposal-updated', ({ messageId, status, updatedOrder }: { messageId: string; status: string; updatedOrder?: any }) => {
            setMessages((prev) =>
                prev.map((msg) => {
                    if (msg.id === messageId && msg.proposalData) {
                        return {
                            ...msg,
                            proposalData: {
                                ...msg.proposalData,
                                status: status as 'PENDING' | 'ACCEPTED' | 'REJECTED',
                            },
                        };
                    }
                    return msg;
                })
            );
            if (updatedOrder && status === 'ACCEPTED') {
                onOrderUpdatedRef.current?.(updatedOrder);
            }
        });

        // Cleanup
        return () => {
            if (socket.connected) {
                socket.emit('leave-order', { orderId });
            }
            socket.disconnect();
            socketRef.current = null;
        };
    }, [orderId, getToken]);

    // Process queue when reconnecting
    useEffect(() => {
        if (isConnected && isOnline && pendingCount > 0 && !isProcessing) {
            if (import.meta.env.DEV) console.log(`Processing ${pendingCount} queued messages...`);
            // Use a simple send function that wraps the socket emit
            const simpleSend = async (data: SendMessageData): Promise<boolean> => {
                if (!socketRef.current || !orderId) return false;

                return new Promise((resolve) => {
                    socketRef.current!.emit(
                        'send-message',
                        { orderId, ...data },
                        (response: any) => {
                            resolve(response.success || false);
                        }
                    );
                });
            };

            processQueue(simpleSend);
        }
    }, [isConnected, isOnline, pendingCount, isProcessing, processQueue, orderId]);

    // Send message (with offline support)
    const sendMessage = useCallback(
        async (data: SendMessageData): Promise<boolean> => {
            if (!orderId) return false;

            const currentUserId = authUser?.id || 'unknown';
            const currentUserName = authUser?.name || 'Você';
            const currentUserRole = authUser?.role || 'BRAND';

            // If offline or not connected, queue the message
            if (!socketRef.current || !isConnected || !isOnline) {
                if (import.meta.env.DEV) console.log('Offline - queueing message');

                const tempId = await queueMessage({
                    orderId,
                    ...data,
                });

                // Add temporary message to UI
                const tempMessage: ChatMessage = {
                    id: tempId,
                    orderId,
                    senderId: currentUserId,
                    type: data.type,
                    content: data.content,
                    proposalData: data.type === 'PROPOSAL' && data.proposedPrice && data.proposedQuantity && data.proposedDeadline ? {
                        originalValues: {
                            pricePerUnit: 0, // Will be filled by server
                            quantity: 0,
                            deliveryDeadline: '',
                        },
                        newValues: {
                            pricePerUnit: data.proposedPrice,
                            quantity: data.proposedQuantity,
                            deliveryDeadline: data.proposedDeadline,
                        },
                        status: 'PENDING',
                    } : undefined,
                    read: false,
                    createdAt: new Date().toISOString(),
                    sender: {
                        id: currentUserId,
                        name: currentUserName,
                        role: currentUserRole,
                    },
                    isPending: true, // Special flag for offline messages
                };

                setMessages(prev => [...prev, tempMessage]);

                return true; // Return true because it was queued
            }

            // If online, send normally
            return new Promise((resolve) => {
                socketRef.current!.emit(
                    'send-message',
                    { orderId, ...data },
                    (response: any) => {
                        // Update rate limit info if provided
                        if (response.rateLimitRemaining !== undefined) {
                            setRateLimitInfo(prev => ({
                                ...prev,
                                remaining: response.rateLimitRemaining,
                            }));
                        }

                        // Handle rate limit errors
                        if (!response.success && response.code === 'RATE_LIMIT_EXCEEDED') {
                            const retryMatch = response.error?.match(/(\d+)\s*seconds/);
                            const retryAfter = retryMatch ? parseInt(retryMatch[1]) : 60;
                            setRateLimitInfo({
                                remaining: 0,
                                blocked: true,
                                retryAfter: retryAfter,
                            });

                            // Auto-unblock after retry period
                            setTimeout(() => {
                                setRateLimitInfo(prev => ({
                                    ...prev,
                                    blocked: false,
                                    remaining: 10,
                                }));
                            }, retryAfter * 1000);
                        }

                        resolve(response.success);
                    }
                );
            });
        },
        [orderId, isConnected, isOnline, queueMessage]
    );

    // Send typing indicator
    const sendTyping = useCallback(
        (isTyping: boolean) => {
            if (!socketRef.current || !orderId) return;

            // Clear previous timeout
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }

            socketRef.current.emit('typing', { orderId, isTyping });

            // Auto-stop typing after 3 seconds
            if (isTyping) {
                typingTimeoutRef.current = setTimeout(() => {
                    socketRef.current?.emit('typing', { orderId, isTyping: false });
                }, 3000);
            }
        },
        [orderId]
    );

    // Mark messages as read
    const markAsRead = useCallback(() => {
        if (!socketRef.current || !orderId) return;
        socketRef.current.emit('mark-read', { orderId });
        setUnreadCount(0);
    }, [orderId]);

    // Accept proposal
    const acceptProposal = useCallback(
        async (messageId: string): Promise<boolean> => {
            if (!socketRef.current || !orderId) return false;

            return new Promise((resolve) => {
                socketRef.current!.emit(
                    'accept-proposal',
                    { orderId, messageId },
                    (response: any) => {
                        resolve(response.success);
                    }
                );
            });
        },
        [orderId]
    );

    // Reject proposal
    const rejectProposal = useCallback(
        async (messageId: string): Promise<boolean> => {
            if (!socketRef.current || !orderId) return false;

            return new Promise((resolve) => {
                socketRef.current!.emit(
                    'reject-proposal',
                    { orderId, messageId },
                    (response: any) => {
                        resolve(response.success);
                    }
                );
            });
        },
        [orderId]
    );

    // Manual load messages
    const loadMessages = useCallback(async () => {
        if (!socketRef.current || !orderId) return;

        return new Promise<void>((resolve) => {
            socketRef.current!.emit('get-messages', { orderId, limit: 50 }, (response: any) => {
                if (response.success) {
                    setMessages(response.messages || []);
                    setHasMore(response.hasMore || false);
                    if (response.messages && response.messages.length > 0) {
                        oldestCursorRef.current = response.messages[0].id;
                    }
                }
                resolve();
            });
        });
    }, [orderId]);

    // Load more (older) messages
    const loadMore = useCallback(async () => {
        if (!socketRef.current || !orderId || isLoadingMore || !hasMore || !oldestCursorRef.current) {
            return;
        }

        setIsLoadingMore(true);

        return new Promise<void>((resolve) => {
            socketRef.current!.emit('get-messages', {
                orderId,
                limit: 50,
                cursor: oldestCursorRef.current,
                direction: 'before',
            }, (response: any) => {
                if (response.success) {
                    // Add older messages at the beginning
                    setMessages(prev => [...response.messages, ...prev]);
                    setHasMore(response.hasMore || false);
                    // Update cursor to the new oldest message
                    if (response.messages && response.messages.length > 0) {
                        oldestCursorRef.current = response.messages[0].id;
                    }
                }
                setIsLoadingMore(false);
                resolve();
            });
        });
    }, [orderId, isLoadingMore, hasMore]);

    return {
        messages,
        isConnected,
        isOnline,
        isLoading,
        typingUsers,
        unreadCount,
        rateLimitInfo,
        pendingCount,
        hasMore,
        isLoadingMore,
        sendMessage,
        sendTyping,
        markAsRead,
        acceptProposal,
        rejectProposal,
        loadMessages,
        loadMore,
    };
}
