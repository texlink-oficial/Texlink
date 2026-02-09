import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import { useNotificationSocket } from '../hooks/useNotificationSocket';
import { notificationsService } from '../services/notifications.service';
import { notificationsDb } from '../db/notifications-db';
import { AppNotification, NotificationContextData } from '../types/notification.types';

const NotificationContext = createContext<NotificationContextData | undefined>(undefined);

interface NotificationProviderProps {
    children: React.ReactNode;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
    const { token, user } = useAuth();
    const { success: toastSuccess, info: toastInfo } = useToast();

    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [nextCursor, setNextCursor] = useState<string | undefined>();

    // Handle new notification from WebSocket
    const handleNewNotification = useCallback((notification: AppNotification) => {
        // Add to state
        setNotifications((prev) => {
            // Check if already exists
            if (prev.some((n) => n.id === notification.id)) {
                return prev;
            }
            return [notification, ...prev];
        });

        // Update unread count
        setUnreadCount((prev) => prev + 1);

        // Store in IndexedDB
        notificationsDb.storeNotification(notification);

        // Show toast notification
        toastInfo(notification.title, notification.body);
    }, [toastInfo]);

    // Handle unread count change from WebSocket
    const handleUnreadCountChange = useCallback((count: number) => {
        setUnreadCount(count);
    }, []);

    // Handle connection change
    const handleConnectionChange = useCallback((connected: boolean) => {
        if (connected) {
            // Sync notifications when reconnected
            fetchNotifications();
        }
    }, []);

    // WebSocket connection
    const { isConnected, markAsRead: wsMarkAsRead, markAllAsRead: wsMarkAllAsRead } = useNotificationSocket({
        token,
        onNotification: handleNewNotification,
        onUnreadCountChange: handleUnreadCountChange,
        onConnectionChange: handleConnectionChange,
    });

    // Fetch notifications from API
    const fetchNotifications = useCallback(async (cursor?: string) => {
        if (!token) return;

        setIsLoading(true);
        try {
            const response = await notificationsService.getNotifications({
                limit: 20,
                cursor,
            });

            if (cursor) {
                // Append to existing
                setNotifications((prev) => {
                    const newNotifications = response.notifications.filter(
                        (n) => !prev.some((existing) => existing.id === n.id)
                    );
                    return [...prev, ...newNotifications];
                });
            } else {
                // Replace all
                setNotifications(response.notifications);
            }

            setUnreadCount(response.unreadCount);
            setHasMore(response.hasMore);
            setNextCursor(response.nextCursor);

            // Store in IndexedDB for offline access
            await notificationsDb.storeNotifications(response.notifications);
        } catch (error) {
            console.error('Failed to fetch notifications:', error);

            // Fall back to IndexedDB if offline
            if (user?.id) {
                const offlineNotifications = await notificationsDb.getNotifications(user.id, { limit: 50 });
                const offlineUnreadCount = await notificationsDb.getUnreadCount(user.id);
                setNotifications(offlineNotifications);
                setUnreadCount(offlineUnreadCount);
            }
        } finally {
            setIsLoading(false);
        }
    }, [token, user?.id]);

    // Mark a single notification as read
    const markAsRead = useCallback(async (notificationId: string) => {
        try {
            // Optimistic update
            setNotifications((prev) =>
                prev.map((n) =>
                    n.id === notificationId ? { ...n, read: true, readAt: new Date().toISOString() } : n
                )
            );
            setUnreadCount((prev) => Math.max(0, prev - 1));

            // Update via WebSocket if connected
            if (isConnected) {
                wsMarkAsRead(notificationId);
            } else {
                // Fall back to API
                await notificationsService.markOneAsRead(notificationId);
            }

            // Update IndexedDB
            await notificationsDb.markAsRead(notificationId);
        } catch (error) {
            console.error('Failed to mark notification as read:', error);
            // Rollback optimistic update
            fetchNotifications();
        }
    }, [isConnected, wsMarkAsRead, fetchNotifications]);

    // Mark all notifications as read
    const markAllAsRead = useCallback(async () => {
        try {
            // Optimistic update
            const now = new Date().toISOString();
            setNotifications((prev) =>
                prev.map((n) => ({ ...n, read: true, readAt: now }))
            );
            setUnreadCount(0);

            // Always persist via API (reliable)
            await notificationsService.markAllAsRead();

            // Also notify via WebSocket for real-time count sync
            if (isConnected) {
                wsMarkAllAsRead();
            }

            // Update IndexedDB
            if (user?.id) {
                await notificationsDb.markAllAsRead(user.id);
            }

            toastSuccess('Notificações marcadas como lidas');
        } catch (error) {
            console.error('Failed to mark all notifications as read:', error);
            fetchNotifications();
        }
    }, [isConnected, wsMarkAllAsRead, user?.id, toastSuccess, fetchNotifications]);

    // Clear notifications from state
    const clearNotifications = useCallback(() => {
        setNotifications([]);
        setUnreadCount(0);
        setHasMore(true);
        setNextCursor(undefined);
    }, []);

    // Initial fetch when authenticated
    useEffect(() => {
        if (token) {
            fetchNotifications();
        } else {
            clearNotifications();
        }
    }, [token, fetchNotifications, clearNotifications]);

    // Request notification permission on mount
    useEffect(() => {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }, []);

    // Cleanup old notifications periodically
    useEffect(() => {
        const cleanup = async () => {
            const deleted = await notificationsDb.deleteOldNotifications(30);
            if (deleted > 0) {
                console.log(`Cleaned up ${deleted} old notifications from IndexedDB`);
            }
        };

        cleanup();
        const interval = setInterval(cleanup, 24 * 60 * 60 * 1000); // Daily

        return () => clearInterval(interval);
    }, []);

    const value = useMemo<NotificationContextData>(() => ({
        notifications,
        unreadCount,
        isConnected,
        isLoading,
        hasMore,
        fetchNotifications: async (cursor?: string) => {
            await fetchNotifications(cursor || nextCursor);
        },
        markAsRead,
        markAllAsRead,
        clearNotifications,
    }), [
        notifications,
        unreadCount,
        isConnected,
        isLoading,
        hasMore,
        nextCursor,
        fetchNotifications,
        markAsRead,
        markAllAsRead,
        clearNotifications,
    ]);

    return (
        <NotificationContext.Provider value={value}>
            {children}
        </NotificationContext.Provider>
    );
}

export function useNotifications(): NotificationContextData {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotifications must be used within a NotificationProvider');
    }
    return context;
}

export default NotificationContext;
