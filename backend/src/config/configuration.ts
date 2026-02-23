export default () => {
  // Validate required environment variables in production
  if (process.env.NODE_ENV === 'production') {
    const requiredEnvVars = ['JWT_SECRET', 'JWT_REFRESH_SECRET', 'DATABASE_URL', 'CORS_ORIGINS', 'FRONTEND_URL'];
    const missing = requiredEnvVars.filter((v) => !process.env[v]);
    if (missing.length > 0) {
      throw new Error(
        `Missing required environment variables: ${missing.join(', ')}`,
      );
    }

    // Validate SUPERADMIN_MASTER_PASSWORD strength
    if (
      process.env.SUPERADMIN_MASTER_PASSWORD &&
      process.env.SUPERADMIN_MASTER_PASSWORD.length < 16
    ) {
      throw new Error(
        'SUPERADMIN_MASTER_PASSWORD must be at least 16 characters in production',
      );
    }

    // Validate JWT_SECRET is not using default/weak values
    const weakSecrets = [
      'default-secret',
      'texlink-dev-secret-change-in-production',
      'jwt_secret_change_in_production',
      'secret',
      'changeme',
    ];
    if (weakSecrets.includes(process.env.JWT_SECRET || '')) {
      throw new Error(
        'JWT_SECRET must be changed from default value in production',
      );
    }
  }

  return {
    port: parseInt(process.env.PORT || '3000', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
    database: {
      url: process.env.DATABASE_URL,
    },
    jwt: {
      secret: process.env.JWT_SECRET,
      refreshSecret: process.env.JWT_REFRESH_SECRET,
      expiresIn: process.env.JWT_EXPIRATION || '1h',
      refreshExpiresIn: process.env.JWT_REFRESH_EXPIRATION || '7d',
    },
    cors: {
      origins: process.env.CORS_ORIGINS?.split(',') || [
        'http://localhost:5173',
        'http://localhost:3001',
      ],
    },
    redis: {
      url: process.env.REDIS_URL,
    },
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
    webhooks: {
      sendgridValidation:
        process.env.SENDGRID_WEBHOOK_SIGNATURE_VALIDATION === 'true',
      twilioValidation:
        process.env.TWILIO_WEBHOOK_SIGNATURE_VALIDATION === 'true',
    },
    storage: {
      type: process.env.STORAGE_TYPE || 'local', // 'local' or 's3'
      aws: {
        region: process.env.AWS_REGION || 'us-east-1',
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        s3Bucket: process.env.AWS_S3_BUCKET,
        cloudFrontDomain: process.env.CLOUDFRONT_DOMAIN,
      },
    },
    credit: {
      provider: process.env.CREDIT_PROVIDER || 'mock', // 'mock', 'serasa', or 'spc'
      serasa: {
        apiUrl: process.env.SERASA_API_URL,
        clientId: process.env.SERASA_CLIENT_ID,
        clientSecret: process.env.SERASA_CLIENT_SECRET,
      },
      spc: {
        apiUrl: process.env.SPC_API_URL,
        username: process.env.SPC_USERNAME,
        password: process.env.SPC_PASSWORD,
      },
    },
  };
};
