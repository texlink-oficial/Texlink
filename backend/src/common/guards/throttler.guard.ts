import { Injectable, ExecutionContext } from '@nestjs/common';
import {
  ThrottlerGuard,
  ThrottlerException,
  ThrottlerLimitDetail,
} from '@nestjs/throttler';

/**
 * Custom Throttler Guard with enhanced IP extraction
 * Handles proxies, load balancers, and provides better error messages
 */
@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  /**
   * Extract client IP from request, considering proxies
   */
  protected async getTracker(req: Record<string, any>): Promise<string> {
    // Check for forwarded headers (behind proxy/load balancer)
    const forwarded = req.headers?.['x-forwarded-for'];
    if (forwarded) {
      const ips = Array.isArray(forwarded)
        ? forwarded[0]
        : forwarded.split(',')[0];
      return ips.trim();
    }

    // Check for real IP header (nginx)
    const realIp = req.headers?.['x-real-ip'];
    if (realIp) {
      return Array.isArray(realIp) ? realIp[0] : realIp;
    }

    // Fallback to socket address
    return req.ip || req.socket?.remoteAddress || 'unknown';
  }

  /**
   * Custom error handler with retry-after header
   */
  protected async throwThrottlingException(
    context: ExecutionContext,
    throttlerLimitDetail: ThrottlerLimitDetail,
  ): Promise<void> {
    const response = context.switchToHttp().getResponse();
    const retryAfter = Math.ceil(throttlerLimitDetail.timeToExpire / 1000);

    response.header('Retry-After', retryAfter.toString());
    response.header('X-RateLimit-Limit', throttlerLimitDetail.limit.toString());
    response.header('X-RateLimit-Remaining', '0');
    response.header(
      'X-RateLimit-Reset',
      new Date(Date.now() + throttlerLimitDetail.timeToExpire).toISOString(),
    );

    throw new ThrottlerException(
      `Muitas requisições. Tente novamente em ${retryAfter} segundos.`,
    );
  }
}
