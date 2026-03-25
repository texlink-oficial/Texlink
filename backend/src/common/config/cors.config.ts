export function getCorsOrigins(): string[] {
  if (process.env.CORS_ORIGINS) {
    return process.env.CORS_ORIGINS.split(',');
  }

  const defaults = [
    'http://localhost:5173',
    'http://localhost:3001',
  ];

  // Include Railway staging/production frontend URLs
  if (process.env.FRONTEND_URL) {
    defaults.push(process.env.FRONTEND_URL);
  }
  if (process.env.NODE_ENV === 'staging' || process.env.NODE_ENV === 'production') {
    defaults.push(
      'https://texlink-frontend-staging.up.railway.app',
      'https://app.texlink.com.br',
    );
  }

  return defaults;
}
