import { Controller, Get } from '@nestjs/common';
import { HealthService, HealthStatus } from './health.service';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  /**
   * Basic health check - returns 200 if the server is running
   * Used by load balancers and container orchestration
   */
  @Get()
  check(): { status: string } {
    return { status: 'ok' };
  }

  /**
   * Detailed health check - returns status of all dependencies
   * Useful for debugging and monitoring dashboards
   */
  @Get('detailed')
  async detailedCheck(): Promise<HealthStatus> {
    return this.healthService.check();
  }

  /**
   * Liveness probe - is the application alive?
   * Used by Kubernetes liveness probes
   */
  @Get('live')
  live(): { status: string } {
    return { status: 'alive' };
  }

  /**
   * Readiness probe - is the application ready to receive traffic?
   * Used by Kubernetes readiness probes
   */
  @Get('ready')
  async ready(): Promise<{ status: string; ready: boolean }> {
    const health = await this.healthService.check();
    return {
      status: health.status,
      ready: health.status === 'healthy',
    };
  }
}
