import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { AppNotification, WebSocketNotificationPayload } from '../types/notification.types';

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3000';

interface UseNotificationSocketOptions {
    token: string | null;
    onNotification?: (notification: AppNotification) => void;
    onUnreadCountChange?: (count: number) => void;
    onConnectionChange?: (isConnected: boolean) => void;
}

interface UseNotificationSocketReturn {
    isConnected: boolean;
    socket: Socket | null;
    markAsRead: (notificationId: string) => void;
    markManyAsRead: (notificationIds: string[]) => void;
    markAllAsRead: () => void;
    getNotifications: (options?: { limit?: number; cursor?: string; unreadOnly?: boolean }) => void;
}

export function useNotificationSocket(options: UseNotificationSocketOptions): UseNotificationSocketReturn {
    const { token, onNotification, onUnreadCountChange, onConnectionChange } = options;
    const socketRef = useRef<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const reconnectAttempts = useRef(0);
    const maxReconnectAttempts = 5;

    // Connect to WebSocket
    useEffect(() => {
        if (!token) {
            if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current = null;
                setIsConnected(false);
            }
            return;
        }

        // Create socket connection
        const socket = io(`${SOCKET_URL}/notifications`, {
            auth: { token },
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: maxReconnectAttempts,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
        });

        socketRef.current = socket;

        // Connection events
        socket.on('connect', () => {
            console.log('[NotificationSocket] Connected');
            setIsConnected(true);
            onConnectionChange?.(true);
            reconnectAttempts.current = 0;
        });

        socket.on('disconnect', (reason) => {
            console.log('[NotificationSocket] Disconnected:', reason);
            setIsConnected(false);
            onConnectionChange?.(false);
        });

        socket.on('connect_error', (error) => {
            console.error('[NotificationSocket] Connection error:', error.message);
            reconnectAttempts.current++;

            if (reconnectAttempts.current >= maxReconnectAttempts) {
                console.error('[NotificationSocket] Max reconnection attempts reached');
                socket.disconnect();
            }
        });

        // Initial connection data
        socket.on('connected', (data: { userId: string; unreadCount: number }) => {
            console.log('[NotificationSocket] Authenticated:', data);
            onUnreadCountChange?.(data.unreadCount);
        });

        // New notification received
        socket.on('notification:new', (notification: WebSocketNotificationPayload) => {
            console.log('[NotificationSocket] New notification:', notification);

            const fullNotification: AppNotification = {
                ...notification,
                read: false,
            };

            onNotification?.(fullNotification);

            // Show desktop notification if permitted
            showDesktopNotification(notification);
        });

        // Unread count updated
        socket.on('unread-count', (data: { count: number }) => {
            onUnreadCountChange?.(data.count);
        });

        // Error handling
        socket.on('error', (error: { message: string; code?: string }) => {
            console.error('[NotificationSocket] Error:', error);
        });

        return () => {
            socket.disconnect();
            socketRef.current = null;
        };
    }, [token, onNotification, onUnreadCountChange, onConnectionChange]);

    // Mark single notification as read
    const markAsRead = useCallback((notificationId: string) => {
        socketRef.current?.emit('mark-read', { notificationId });
    }, []);

    // Mark multiple notifications as read
    const markManyAsRead = useCallback((notificationIds: string[]) => {
        socketRef.current?.emit('mark-read', { notificationIds });
    }, []);

    // Mark all as read
    const markAllAsRead = useCallback(() => {
        socketRef.current?.emit('mark-read', { markAll: true });
    }, []);

    // Get notifications via WebSocket
    const getNotifications = useCallback(
        (options?: { limit?: number; cursor?: string; unreadOnly?: boolean }) => {
            socketRef.current?.emit('get-notifications', options, (response: any) => {
                if (response.success) {
                    console.log('[NotificationSocket] Fetched notifications:', response.notifications.length);
                }
            });
        },
        []
    );

    return {
        isConnected,
        socket: socketRef.current,
        markAsRead,
        markManyAsRead,
        markAllAsRead,
        getNotifications,
    };
}

// Desktop notification helper
function showDesktopNotification(notification: WebSocketNotificationPayload): void {
    // Check if notifications are supported and permitted
    if (!('Notification' in window)) return;

    if (Notification.permission === 'granted') {
        new Notification(notification.title, {
            body: notification.body,
            icon: '/favicon.ico',
            tag: notification.id, // Prevent duplicate notifications
            data: {
                url: notification.actionUrl,
            },
        });
    } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then((permission) => {
            if (permission === 'granted') {
                showDesktopNotification(notification);
            }
        });
    }
}

export default useNotificationSocket;
