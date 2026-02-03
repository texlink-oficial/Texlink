import { Throttle, SkipThrottle } from '@nestjs/throttler';

/**
 * Rate Limit Profiles for different endpoint types
 *
 * These decorators provide pre-configured rate limits for common scenarios.
 * Apply them at controller or method level.
 */

/**
 * Very strict limit for authentication endpoints
 * 5 requests per minute - prevents brute force attacks
 *
 * Use for: login, register, password reset request
 */
export const ThrottleAuth = () =>
  Throttle({
    default: {
      ttl: 60000, // 1 minute
      limit: 5, // 5 attempts
    },
  });

/**
 * Strict limit for sensitive operations
 * 3 requests per minute - prevents abuse of sensitive endpoints
 *
 * Use for: password creation, token validation, OTP verification
 */
export const ThrottleSensitive = () =>
  Throttle({
    default: {
      ttl: 60000, // 1 minute
      limit: 3, // 3 attempts
    },
  });

/**
 * Moderate limit for public endpoints
 * 10 requests per minute - allows reasonable usage while preventing abuse
 *
 * Use for: onboarding steps, public API endpoints
 */
export const ThrottlePublic = () =>
  Throttle({
    default: {
      ttl: 60000, // 1 minute
      limit: 10, // 10 requests
    },
  });

/**
 * Higher limit for webhooks from trusted services
 * 100 requests per minute - services like SendGrid may send bursts
 *
 * Use for: SendGrid webhooks, Stripe webhooks, etc.
 */
export const ThrottleWebhook = () =>
  Throttle({
    default: {
      ttl: 60000, // 1 minute
      limit: 100, // 100 requests
    },
  });

/**
 * Standard API limit for authenticated users
 * 30 requests per minute - balanced for normal API usage
 *
 * Use for: general API endpoints requiring authentication
 */
export const ThrottleApi = () =>
  Throttle({
    default: {
      ttl: 60000, // 1 minute
      limit: 30, // 30 requests
    },
  });

/**
 * Relaxed limit for read-only operations
 * 60 requests per minute - higher limit for GET requests
 *
 * Use for: listing, searching, reading data
 */
export const ThrottleRead = () =>
  Throttle({
    default: {
      ttl: 60000, // 1 minute
      limit: 60, // 60 requests
    },
  });

/**
 * Skip rate limiting entirely
 * Use sparingly - only for internal health checks or similar
 *
 * Use for: /health, /metrics (if protected by other means)
 */
export const ThrottleSkip = () => SkipThrottle();
