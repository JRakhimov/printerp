import { ConfigService } from '@nestjs/config';

/**
 * JWT signing secret. There is deliberately no fallback: a default secret
 * committed to the repository would let anyone forge tokens.
 */
export function getJwtSecret(config: ConfigService): string {
  const secret = config.get<string>('JWT_SECRET');

  if (!secret) {
    throw new Error('JWT_SECRET is not set. Generate one with: openssl rand -hex 32');
  }

  return secret;
}
