const REQUIRED_ENV_VARS = [
  'DATABASE_URL',
  'JWT_SECRET',
  'JWT_EXPIRES_IN',
  'REFRESH_SECRET',
  'REFRESH_EXPIRES_IN',
] as const;

export function validateEnv() {
  const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}.\n` +
        'Create a .env file from .env.example in Community-os-backend/ and fill in the values.',
    );
  }
}
