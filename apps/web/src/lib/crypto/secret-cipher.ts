import 'server-only';

import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

import { getSecretsEnv } from './env';

/**
 * Authenticated symmetric encryption for secrets stored at rest.
 *
 * AES-256-GCM: confidentiality *and* integrity — a tampered ciphertext fails
 * to decrypt rather than silently yielding garbage. The output is a
 * self-describing, versioned envelope so the key/algorithm can be rotated
 * later without guessing how an existing value was encoded:
 *
 *   v1.<iv_base64>.<authTag_base64>.<ciphertext_base64>
 *
 * Server-only by construction — this module must never reach a client
 * bundle, and nothing here is ever returned to the browser.
 */
const ALGORITHM = 'aes-256-gcm';
const ENVELOPE_VERSION = 'v1';
// 96-bit IV is the GCM-recommended size; random per encryption (never reused).
const IV_BYTES = 12;

function encryptionKey(): Buffer {
  return Buffer.from(getSecretsEnv().GITHUB_TOKEN_ENCRYPTION_KEY, 'base64');
}

export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [
    ENVELOPE_VERSION,
    iv.toString('base64'),
    authTag.toString('base64'),
    ciphertext.toString('base64'),
  ].join('.');
}

export function decryptSecret(envelope: string): string {
  const [version, ivB64, authTagB64, ciphertextB64] = envelope.split('.');

  if (version !== ENVELOPE_VERSION || !ivB64 || !authTagB64 || !ciphertextB64) {
    // Includes the case of a value encrypted under a future envelope version.
    throw new Error('Unrecognized secret envelope format');
  }

  const decipher = createDecipheriv(ALGORITHM, encryptionKey(), Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(authTagB64, 'base64'));

  return Buffer.concat([
    decipher.update(Buffer.from(ciphertextB64, 'base64')),
    decipher.final(),
  ]).toString('utf8');
}
