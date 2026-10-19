const REQUIRED = ['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD', 'JWT_SECRET'] as const;
const MIN_JWT_SECRET_LENGTH = 32;

/** Fails at startup with a readable message instead of a cryptic driver error later on. */
export function validateEnv(env: Record<string, unknown>): Record<string, unknown> {
  const missing = REQUIRED.filter((key) => typeof env[key] !== 'string' || env[key] === '');
  if (missing.length > 0) {
    throw new Error(
      `Missing environment variables: ${missing.join(', ')}. Copy apps/api/.env.example to apps/api/.env and fill them in.`,
    );
  }

  const port = env.DB_PORT;
  if (port !== undefined && port !== '' && !Number.isInteger(Number(port))) {
    throw new Error(`DB_PORT must be a number, got "${String(port)}".`);
  }

  if (String(env.JWT_SECRET).length < MIN_JWT_SECRET_LENGTH) {
    throw new Error(`JWT_SECRET must have at least ${MIN_JWT_SECRET_LENGTH} characters.`);
  }

  return env;
}
