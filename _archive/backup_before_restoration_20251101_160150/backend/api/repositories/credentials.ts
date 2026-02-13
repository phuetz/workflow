import crypto from 'crypto';

export type CredentialKind = 'api_key' | 'basic' | 'bearer';

export interface BaseCredential {
  id: string;
  name: string;
  kind: CredentialKind;
  createdAt: string;
  updatedAt: string;
}

export type ApiKeyCredential = BaseCredential & { kind: 'api_key'; apiKey: string; headerName?: string };
export type BasicCredential = BaseCredential & { kind: 'basic'; username: string; password: string };
export type BearerCredential = BaseCredential & { kind: 'bearer'; token: string };

export type Credential = ApiKeyCredential | BasicCredential | BearerCredential;

interface Stored {
  id: string;
  name: string;
  kind: CredentialKind;
  createdAt: string;
  updatedAt: string;
  nonce: string;
  ciphertext: string;
  tag: string;
}

const credentials = new Map<string, Stored>();

function getKey(): Buffer {
  const raw = process.env.MASTER_KEY || 'dev-master-key-please-change-in-prod-32-bytes!';
  // Derive 32 bytes key from provided secret using SHA-256
  return crypto.createHash('sha256').update(raw).digest();
}

export function upsertCredential(input: Omit<Credential, 'createdAt' | 'updatedAt'> & Partial<Credential>): Credential {
  const id = input.id || crypto.randomUUID();
  const now = new Date().toISOString();
  const record: Credential = {
    ...(input as Credential),
    id,
    name: input.name || input.kind.toUpperCase(),
    createdAt: credentials.has(id) ? credentials.get(id)!.createdAt : now,
    updatedAt: now,
  } as Credential;

  // Encrypt secret fields
  const payload = JSON.stringify(record);
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const enc = Buffer.concat([cipher.update(payload, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  credentials.set(id, {
    id,
    name: record.name,
    kind: record.kind,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    nonce: iv.toString('base64'),
    ciphertext: enc.toString('base64'),
    tag: tag.toString('base64'),
  });

  return { ...record, // returned plaintext; caller may discard secrets for list views
  } as Credential;
}

export function getCredentialDecrypted(id: string): Credential | null {
  const stored = credentials.get(id);
  if (!stored) return null;
  const key = getKey();
  const iv = Buffer.from(stored.nonce, 'base64');
  const tag = Buffer.from(stored.tag, 'base64');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  const enc = Buffer.from(stored.ciphertext, 'base64');
  const dec = Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8');
  return JSON.parse(dec) as Credential;
}

export function listCredentials(): BaseCredential[] {
  return Array.from(credentials.values()).map(c => ({
    id: c.id,
    name: c.name,
    kind: c.kind,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  }));
}

export function deleteCredential(id: string): boolean {
  return credentials.delete(id);
}

