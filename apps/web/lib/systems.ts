import 'server-only';
import { randomBytes } from 'node:crypto';
import { type SystemContent, emptySystem, systemContent } from '@dsvault/schema';
import { and, desc, eq, inArray, max, or } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { db, shares, systems, versions } from './db';

export type Role = 'owner' | 'editor' | 'viewer';
export type SystemSummary = { id: string; name: string; content: SystemContent; updatedAt: Date; role: Role; ownerId: string };

export class Forbidden extends Error {
  constructor(message = 'You can view this system but not change it.') { super(message); this.name = 'Forbidden'; }
}

const canEdit = (r: Role | null) => r === 'owner' || r === 'editor';

/** Every system the user owns or has been invited to. */
export async function listSystems(user: string): Promise<SystemSummary[]> {
  const invited = await db.select({ systemId: shares.systemId, role: shares.role }).from(shares).where(eq(shares.email, user));
  const roles = new Map(invited.map((s) => [s.systemId, s.role as Role]));
  const rows = await db.select().from(systems)
    .where(invited.length ? or(eq(systems.ownerId, user), inArray(systems.id, [...roles.keys()])) : eq(systems.ownerId, user))
    .orderBy(desc(systems.updatedAt));
  return rows.map((r) => ({
    id: r.id, name: r.name, content: systemContent.parse(r.content), updatedAt: r.updatedAt, ownerId: r.ownerId,
    role: r.ownerId === user ? 'owner' : roles.get(r.id) ?? 'viewer',
  }));
}

export async function getSystem(user: string, id: string) {
  const [row] = await db.select().from(systems).where(eq(systems.id, id));
  if (!row) return null;
  let role: Role | null = row.ownerId === user ? 'owner' : null;
  if (!role) {
    const [s] = await db.select({ role: shares.role }).from(shares).where(and(eq(shares.systemId, id), eq(shares.email, user)));
    role = (s?.role as Role) ?? null;
  }
  return role ? { ...row, content: systemContent.parse(row.content), role } : null;
}

export async function createSystem(ownerId: string, content: Partial<SystemContent> = {}, id = nanoid(12)) {
  const parsed = systemContent.parse({ ...emptySystem(), ...content });
  const [row] = await db.insert(systems).values({ id, ownerId, name: parsed.name, content: parsed }).returning();
  return row!;
}

export async function saveSystem(user: string, id: string, content: unknown) {
  const s = await getSystem(user, id);
  if (!s) return null;
  if (!canEdit(s.role)) throw new Forbidden();
  const parsed = systemContent.parse(content);
  const [row] = await db.update(systems).set({ content: parsed, name: parsed.name, updatedAt: new Date() }).where(eq(systems.id, id))
    .returning({ id: systems.id, updatedAt: systems.updatedAt });
  return row ?? null;
}

export async function deleteSystem(user: string, id: string) {
  const rows = await db.delete(systems).where(and(eq(systems.id, id), eq(systems.ownerId, user))).returning({ id: systems.id });
  if (!rows.length && (await getSystem(user, id))) throw new Forbidden('Only the owner can delete this system.');
  return rows.length > 0;
}

// ---- versions: readable by anyone with access, created and restored by editors ----

export async function listVersions(user: string, systemId: string) {
  if (!(await getSystem(user, systemId))) return null;
  return db.select({ id: versions.id, number: versions.number, label: versions.label, createdAt: versions.createdAt, content: versions.content })
    .from(versions).where(eq(versions.systemId, systemId)).orderBy(desc(versions.number));
}

export async function createVersion(user: string, systemId: string, label: string) {
  const system = await getSystem(user, systemId);
  if (!system) return null;
  if (!canEdit(system.role)) throw new Forbidden();
  const [{ n } = { n: 0 }] = await db.select({ n: max(versions.number) }).from(versions).where(eq(versions.systemId, systemId));
  const [row] = await db.insert(versions)
    .values({ id: nanoid(12), ownerId: user, systemId, number: (n ?? 0) + 1, label: label.trim().slice(0, 200), content: system.content })
    .returning();
  return row!;
}

export async function getVersion(user: string, systemId: string, number: number) {
  const system = await getSystem(user, systemId);
  if (!system) return null;
  const [row] = await db.select().from(versions).where(and(eq(versions.systemId, systemId), eq(versions.number, number)));
  return row ? { ...row, content: systemContent.parse(row.content), role: system.role } : null;
}

// ---- sharing: owner only ----

async function requireOwner(user: string, systemId: string) {
  const s = await getSystem(user, systemId);
  if (!s) return null;
  if (s.role !== 'owner') throw new Forbidden('Only the owner can change sharing.');
  return s;
}

export async function listShares(user: string, systemId: string) {
  const s = await getSystem(user, systemId);
  if (!s) return null;
  const people = await db.select({ email: shares.email, role: shares.role, createdAt: shares.createdAt }).from(shares).where(eq(shares.systemId, systemId)).orderBy(shares.createdAt);
  return { role: s.role, owner: s.ownerId, people, publicToken: s.role === 'owner' ? s.publicToken : null };
}

export async function share(user: string, systemId: string, email: string, role: 'viewer' | 'editor') {
  const s = await requireOwner(user, systemId);
  if (!s) return null;
  const e = email.trim().toLowerCase();
  if (e === user) throw new Forbidden('You already own this system.');
  await db.insert(shares).values({ id: nanoid(12), systemId, ownerId: user, email: e, role })
    .onConflictDoUpdate({ target: [shares.systemId, shares.email], set: { role } });
  return true;
}

export async function unshare(user: string, systemId: string, email: string) {
  if (!(await requireOwner(user, systemId))) return null;
  await db.delete(shares).where(and(eq(shares.systemId, systemId), eq(shares.email, email.trim().toLowerCase())));
  return true;
}

export async function setPublic(user: string, systemId: string, on: boolean) {
  if (!(await requireOwner(user, systemId))) return null;
  const token = on ? randomBytes(12).toString('base64url') : null;
  await db.update(systems).set({ publicToken: token }).where(eq(systems.id, systemId));
  return { token };
}

export async function getPublicSystem(token: string) {
  if (!token || token.length < 12) return null;
  const [row] = await db.select().from(systems).where(eq(systems.publicToken, token));
  return row ? { id: row.id, name: row.name, updatedAt: row.updatedAt, content: systemContent.parse(row.content) } : null;
}
