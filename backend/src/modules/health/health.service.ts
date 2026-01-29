import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface ServiceHealth {
  status: 'up' | 'down';
  latency?: number;
  error?: string;
}

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  services: {
    database: ServiceHealth;
    redis: ServiceHealth;
  };
}

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);
  private readonly startTime = Date.now();

  constructor(private readonly prisma: PrismaService) {}

  async check(): Promise<HealthStatus> {
    const [database, redis] = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
    ]);

    const services = { database, redis };

    // Determine overall status
    const allUp = Object.values(services).every((s) => s.status === 'up');
    const allDown = Object.values(services).every((s) => s.status === 'down');

    let status: 'healthy' | 'degraded' | 'unhealthy';
    if (allUp) {
      status = 'healthy';
    } else if (allDown) {
      status = 'unhealthy';
    } else {
      status = 'degraded';
    }

    return {
      status,
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      version: process.env.npm_package_version || '1.0.0',
      services,
    };
  }

  private async checkDatabase(): Promise<ServiceHealth> {
    const start = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        status: 'up',
        latency: Date.now() - start,
      };
    } catch (error) {
      this.logger.error('Database health check failed', error);
      return {
        status: 'down',
        latency: Date.now() - start,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async checkRedis(): Promise<ServiceHealth> {
    const start = Date.now();
    try {
      // If Redis is not configured, report as up (using in-memory fallback)
      if (!process.env.REDIS_URL) {
        return {
          status: 'up',
          latency: 0,
        };
      }

      // TODO: Implement actual Redis ping when Redis client is available
      // For now, report as up if URL is configured
      return {
        status: 'up',
        latency: Date.now() - start,
      };
    } catch (error) {
      this.logger.error('Redis health check failed', error);
      return {
        status: 'down',
        latency: Date.now() - start,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}
