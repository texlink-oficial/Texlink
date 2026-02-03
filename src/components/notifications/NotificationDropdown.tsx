import React, { useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCheck, Loader2, Bell } from 'lucide-react';
import { useNotifications } from '../../contexts/NotificationContext';
import { NotificationItem } from './NotificationItem';

interface NotificationDropdownProps {
    isOpen: boolean;
    onClose: () => void;
    anchorRef: React.RefObject<HTMLElement>;
}

export function NotificationDropdown({ isOpen, onClose, anchorRef }: NotificationDropdownProps) {
    const navigate = useNavigate();
    const dropdownRef = useRef<HTMLDivElement>(null);
    const {
        notifications,
        unreadCount,
        isLoading,
        hasMore,
        fetchNotifications,
        markAsRead,
        markAllAsRead,
    } = useNotifications();

    // Handle click outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target as Node) &&
                anchorRef.current &&
                !anchorRef.current.contains(event.target as Node)
            ) {
                onClose();
            }
        }

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen, onClose, anchorRef]);

    // Handle scroll for infinite loading
    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
        if (scrollHeight - scrollTop <= clientHeight + 50 && hasMore && !isLoading) {
            fetchNotifications();
        }
    };

    if (!isOpen) return null;

    return (
        <div
            ref={dropdownRef}
            className="absolute left-0 mt-2 w-80 sm:w-96 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50 overflow-hidden"
        >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                        Notificações
                    </h3>
                    {unreadCount > 0 && (
                        <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 rounded-full">
                            {unreadCount}
                        </span>
                    )}
                </div>
                {unreadCount > 0 && (
                    <button
                        onClick={markAllAsRead}
                        className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                    >
                        <CheckCheck className="h-3.5 w-3.5" />
                        Marcar todas como lidas
                    </button>
                )}
            </div>

            {/* Notification list */}
            <div
                className="max-h-96 overflow-y-auto"
                onScroll={handleScroll}
            >
                {notifications.length === 0 && !isLoading ? (
                    <div className="flex flex-col items-center justify-center py-12 px-4">
                        <Bell className="h-12 w-12 text-gray-300 dark:text-gray-600 mb-3" />
                        <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                            Nenhuma notificação
                        </p>
                    </div>
                ) : (
                    <>
                        {notifications.map((notification) => (
                            <NotificationItem
                                key={notification.id}
                                notification={notification}
                                onMarkAsRead={markAsRead}
                                onClose={onClose}
                            />
                        ))}
                        {isLoading && (
                            <div className="flex justify-center py-4">
                                <Loader2 className="h-5 w-5 text-gray-400 animate-spin" />
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
                <div className="border-t border-gray-200 dark:border-gray-700 p-2">
                    <button
                        onClick={() => {
                            navigate('/notificacoes');
                            onClose();
                        }}
                        className="w-full text-center text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 py-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                        Ver todas as notificações
                    </button>
                </div>
            )}
        </div>
    );
}

export default NotificationDropdown;
