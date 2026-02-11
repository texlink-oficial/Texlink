import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { RateLimiterService } from '../../common/services/rate-limiter.service';

interface AuthenticatedSocket extends Socket {
  userId: string;
  userName: string;
  companyId?: string;
}

interface MarkReadPayload {
  notificationId?: string;
  notificationIds?: string[];
  markAll?: boolean;
}

@WebSocketGateway({
  namespace: 'notifications',
  cors: {
    origin: process.env.CORS_ORIGINS?.split(',') || [
      'http://localhost:5173',
      'http://localhost:3001',
    ],
    credentials: true,
  },
})
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationsGateway.name);
  private readonly userSockets: Map<string, Set<string>> = new Map(); // userId -> Set of socketIds
  private readonly companyUsers: Map<string, Set<string>> = new Map(); // companyId -> Set of userIds

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly rateLimiter: RateLimiterService,
  ) { }

  /**
   * Handle new WebSocket connection
   * Validates JWT token from handshake
   */
  async handleConnection(client: AuthenticatedSocket) {
    try {
      // Rate limit by IP address
      const clientIp = client.handshake.address;
      try {
        await this.rateLimiter.checkConnectionLimit(clientIp);
      } catch (error) {
        this.logger.error(
          `Connection rate limited for IP ${clientIp}: ${error.message}`,
        );
        client.emit('error', {
          message: 'Too many connection attempts',
          code: 'RATE_LIMIT_EXCEEDED',
        });
        client.disconnect();
        return;
      }

      // Extract token from handshake auth or query
      const token =
        client.handshake.auth?.token || client.handshake.query?.token;

      if (!token) {
        this.logger.warn(
          `Client ${client.id} attempted connection without token`,
        );
        client.disconnect();
        return;
      }

      let userId: string;
      let userName: string;
      let companyId: string | undefined;

      // Check for mock token (development mode only)
      if (
        (token as string).startsWith('mock-token-') &&
        process.env.NODE_ENV !== 'production'
      ) {
        const tokenParts = (token as string).split('-');
        const role = tokenParts[2]?.toLowerCase();

        const demoUserIds: Record<string, string> = {
          brand: 'demo-brand-001',
          supplier: 'demo-supplier-001',
          admin: 'demo-admin-001',
        };

        const demoUserId = demoUserIds[role] || 'demo-brand-001';

        const mockUser = await this.prisma.user.findUnique({
          where: { id: demoUserId },
          select: {
            id: true,
            name: true,
            companyUsers: {
              select: { companyId: true },
              take: 1,
            },
          },
        });

        if (!mockUser) {
          this.logger.warn(`Demo user not found: ${demoUserId}`);
          client.disconnect();
          return;
        }

        userId = mockUser.id;
        userName = mockUser.name;
        companyId = mockUser.companyUsers[0]?.companyId;
      } else {
        // Verify JWT token
        const payload = this.jwtService.verify(token as string);

        if (!payload.sub) {
          this.logger.warn('Invalid token payload');
          client.disconnect();
          return;
        }

        // Get user info
        const user = await this.prisma.user.findUnique({
          where: { id: payload.sub },
          select: {
            id: true,
            name: true,
            companyUsers: {
              select: { companyId: true },
              take: 1,
            },
          },
        });

        if (!user) {
          this.logger.warn(`User not found for token: ${payload.sub}`);
          client.disconnect();
          return;
        }

        userId = user.id;
        userName = user.name;
        companyId = user.companyUsers[0]?.companyId;
      }

      // Attach user info to socket
      client.userId = userId;
      client.userName = userName;
      client.companyId = companyId;

      // Track user's sockets
      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId)!.add(client.id);

      // Join user room
      await client.join(`user:${userId}`);

      // Track and join company room if applicable
      if (companyId) {
        await client.join(`company:${companyId}`);

        if (!this.companyUsers.has(companyId)) {
          this.companyUsers.set(companyId, new Set());
        }
        this.companyUsers.get(companyId)!.add(userId);
      }

      this.logger.log(
        `Notification client connected: ${client.id} (User: ${userName})`,
      );

      // Get unread count and send initial state
      const unreadCount = await this.getUnreadCount(userId, companyId);

      // Emit connection success
      client.emit('connected', {
        userId,
        userName,
        socketId: client.id,
        unreadCount,
      });
    } catch (error) {
      this.logger.error(`Connection error: ${error.message}`);
      client.emit('error', { message: 'Authentication failed' });
      client.disconnect();
    }
  }

  /**
   * Handle WebSocket disconnection
   */
  handleDisconnect(client: AuthenticatedSocket) {
    if (client.userId) {
      const userSocketSet = this.userSockets.get(client.userId);
      if (userSocketSet) {
        userSocketSet.delete(client.id);
        if (userSocketSet.size === 0) {
          this.userSockets.delete(client.userId);

          // Remove from company tracking
          if (client.companyId) {
            const companyUserSet = this.companyUsers.get(client.companyId);
            if (companyUserSet) {
              companyUserSet.delete(client.userId);
              if (companyUserSet.size === 0) {
                this.companyUsers.delete(client.companyId);
              }
            }
          }
        }
      }
    }
    this.logger.log(`Notification client disconnected: ${client.id}`);
  }

  /**
   * Mark notification(s) as read
   */
  @SubscribeMessage('mark-read')
  async handleMarkRead(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: MarkReadPayload,
  ) {
    try {
      if (!client.userId) {
        return { success: false, error: 'Not authenticated' };
      }

      const now = new Date();
      let updatedCount = 0;

      if (data.markAll) {
        // Mark all as read (scoped to company)
        const markAllWhere: any = {
          recipientId: client.userId,
          read: false,
        };
        if (client.companyId) {
          markAllWhere.companyId = client.companyId;
        }
        const result = await this.prisma.notification.updateMany({
          where: markAllWhere,
          data: {
            read: true,
            readAt: now,
          },
        });
        updatedCount = result.count;
      } else if (data.notificationIds && data.notificationIds.length > 0) {
        // Mark multiple as read
        const result = await this.prisma.notification.updateMany({
          where: {
            id: { in: data.notificationIds },
            recipientId: client.userId,
            read: false,
          },
          data: {
            read: true,
            readAt: now,
          },
        });
        updatedCount = result.count;
      } else if (data.notificationId) {
        // Mark single as read
        const result = await this.prisma.notification.updateMany({
          where: {
            id: data.notificationId,
            recipientId: client.userId,
            read: false,
          },
          data: {
            read: true,
            readAt: now,
          },
        });
        updatedCount = result.count;
      }

      // Get new unread count (scoped to company)
      const unreadCount = await this.getUnreadCount(client.userId, client.companyId);

      // Emit updated count to all user's sockets
      this.emitToUser(client.userId, 'unread-count', { count: unreadCount });

      return {
        success: true,
        updatedCount,
        unreadCount,
      };
    } catch (error) {
      this.logger.error(
        `Error marking notifications as read: ${error.message}`,
      );
      return { success: false, error: error.message };
    }
  }

  /**
   * Get unread count
   */
  @SubscribeMessage('get-unread-count')
  async handleGetUnreadCount(@ConnectedSocket() client: AuthenticatedSocket) {
    try {
      if (!client.userId) {
        return { success: false, error: 'Not authenticated', count: 0 };
      }

      const count = await this.getUnreadCount(client.userId, client.companyId);
      return { success: true, count };
    } catch (error) {
      return { success: false, error: error.message, count: 0 };
    }
  }

  /**
   * Get recent notifications
   */
  @SubscribeMessage('get-notifications')
  async handleGetNotifications(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody()
    data: { limit?: number; cursor?: string; unreadOnly?: boolean },
  ) {
    try {
      if (!client.userId) {
        return {
          success: false,
          error: 'Not authenticated',
          notifications: [],
        };
      }

      const limit = Math.min(data.limit || 20, 50);

      const where: any = {
        recipientId: client.userId,
      };

      // Filter by company context to enforce tenant isolation
      if (client.companyId) {
        where.companyId = client.companyId;
      }

      if (data.unreadOnly) {
        where.read = false;
      }

      if (data.cursor) {
        where.createdAt = { lt: new Date(data.cursor) };
      }

      const notifications = await this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit + 1, // Fetch one extra to check if there's more
      });

      const hasMore = notifications.length > limit;
      const items = hasMore ? notifications.slice(0, -1) : notifications;
      const nextCursor =
        hasMore && items.length > 0
          ? items[items.length - 1].createdAt.toISOString()
          : null;

      return {
        success: true,
        notifications: items,
        hasMore,
        nextCursor,
      };
    } catch (error) {
      return { success: false, error: error.message, notifications: [] };
    }
  }

  // ==================== HELPER METHODS ====================

  /**
   * Get unread notification count for a user
   */
  private async getUnreadCount(userId: string, companyId?: string): Promise<number> {
    const where: any = {
      recipientId: userId,
      read: false,
    };
    if (companyId) {
      where.companyId = companyId;
    }
    return this.prisma.notification.count({ where });
  }

  /**
   * Check if user is online (has active socket connections)
   */
  isUserOnline(userId: string): boolean {
    const sockets = this.userSockets.get(userId);
    return sockets ? sockets.size > 0 : false;
  }

  /**
   * Get online users count for a company
   */
  getOnlineCompanyUsersCount(companyId: string): number {
    const users = this.companyUsers.get(companyId);
    return users ? users.size : 0;
  }

  /**
   * Emit to all sockets of a specific user
   */
  emitToUser(userId: string, event: string, data: any) {
    this.server.to(`user:${userId}`).emit(event, data);
  }

  /**
   * Emit to all users in a company
   */
  emitToCompany(companyId: string, event: string, data: any) {
    this.server.to(`company:${companyId}`).emit(event, data);
  }

  /**
   * Send a new notification to a user
   * Called by NotificationsService after persisting
   */
  async sendNotification(notification: {
    id: string;
    type: string;
    priority: string;
    recipientId: string;
    companyId?: string | null;
    title: string;
    body: string;
    data?: any;
    actionUrl?: string | null;
    entityType?: string | null;
    entityId?: string | null;
    createdAt: Date;
  }) {
    const isOnline = this.isUserOnline(notification.recipientId);
    this.logger.log(
      `Sending notification to user ${notification.recipientId}. Online: ${isOnline}`,
    );

    // Emit to user
    this.emitToUser(notification.recipientId, 'notification:new', notification);

    // Update unread count (scoped to notification's company)
    const unreadCount = await this.getUnreadCount(
      notification.recipientId,
      notification.companyId || undefined,
    );
    this.emitToUser(notification.recipientId, 'unread-count', {
      count: unreadCount,
    });

    this.logger.log(
      `Notification sent. Unread count: ${unreadCount}`,
    );

    // Update websocket status
    if (this.isUserOnline(notification.recipientId)) {
      await this.prisma.notification.update({
        where: { id: notification.id },
        data: {
          websocketStatus: 'DELIVERED',
          websocketSentAt: new Date(),
        },
      });
    }

    return this.isUserOnline(notification.recipientId);
  }

  /**
   * Broadcast a notification to multiple users
   */
  async broadcastNotification(
    userIds: string[],
    notification: Omit<
      Parameters<typeof this.sendNotification>[0],
      'recipientId'
    >,
  ) {
    const results: { userId: string; delivered: boolean }[] = [];

    for (const userId of userIds) {
      const delivered = await this.sendNotification({
        ...notification,
        recipientId: userId,
      });
      results.push({ userId, delivered });
    }

    return results;
  }
}
