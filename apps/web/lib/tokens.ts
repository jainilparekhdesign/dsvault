import 'server-only';
import { createHash, randomBytes } from 'node:crypto';
import { and, desc, eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { apiTokens, db } from './db';

const PREFIX = 'dsv_';
export const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

export async function createToken(ownerId: string, name: string) {
  const token = PREFIX + randomBytes(24).toString('base64url');
  const row = { id: nanoid(12), ownerId, name: name.trim().slice(0, 100) || 'Untitled token', hash: hashToken(token), prefix: token.slice(0, 8) };
  await db.insert(apiTokens).values(row);
  return { id: row.id, name: row.name, token };
}

export async function listTokens(ownerId: string) {
  return db.select({ id: apiTokens.id, name: apiTokens.name, prefix: apiTokens.prefix, createdAt: apiTokens.createdAt, lastUsedAt: apiTokens.lastUsedAt })
    .from(apiTokens).where(eq(apiTokens.ownerId, ownerId)).orderBy(desc(apiTokens.createdAt));
}

export async function revokeToken(ownerId: string, id: string) {
  const rows = await db.delete(apiTokens).where(and(eq(apiTokens.id, id), eq(apiTokens.ownerId, ownerId))).returning({ id: apiTokens.id });
  return rows.length > 0;
}

/** The owner a bearer token belongs to, or null. */
export async function ownerForToken(token: string): Promise<string | null> {
  if (!token.startsWith(PREFIX)) return null;
  const [row] = await db.select({ id: apiTokens.id, ownerId: apiTokens.ownerId }).from(apiTokens).where(eq(apiTokens.hash, hashToken(token)));
  if (!row) return null;
  void db.update(apiTokens).set({ lastUsedAt: new Date() }).where(eq(apiTokens.id, row.id)).catch(() => {});
  return row.ownerId;
}
