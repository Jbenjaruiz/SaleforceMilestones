const REQUIRED = ['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'] as const;

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

  return env;
}
