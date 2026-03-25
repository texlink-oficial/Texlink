export function getCorsOrigins(): string[] {
  return process.env.CORS_ORIGINS?.split(',') || [
    'http://localhost:5173',
    'http://localhost:3001',
  ];
}
