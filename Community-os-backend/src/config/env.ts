const REQUIRED_ENV_VARS = [
  'DATABASE_URL',
  'JWT_SECRET',
  'JWT_EXPIRES_IN',
  'REFRESH_SECRET',
  'REFRESH_EXPIRES_IN',
] as const;

const RECOMMENDED_ENV_VARS = [
  { key: 'APP_URL', default: 'http://localhost:5173' },
  { key: 'COOKIE_SECURE', default: 'false' },
  { key: 'NODE_ENV', default: 'development' },
] as const;

export function validateEnv() {
  const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}.\n` +
        'Create a .env file from .env.example in Community-os-backend/ and fill in the values.',
    );
  }

  for (const { key, default: defaultValue } of RECOMMENDED_ENV_VARS) {
    if (process.env[key] === undefined) {
      console.warn(
        `[env] ${key} is not set; defaulting to "${defaultValue}". ` +
          'Set it explicitly in .env for production deployments.',
      );
    }
  }
}
