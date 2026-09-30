import 'server-only';
import { type SystemContent, emptySystem, systemContent } from '@dsvault/schema';
import { and, desc, eq, max } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { db, systems, versions } from './db';

export type SystemSummary = { id: string; name: string; content: SystemContent; updatedAt: Date };

export async function listSystems(ownerId: string): Promise<SystemSummary[]> {
  const rows = await db.select().from(systems).where(eq(systems.ownerId, ownerId)).orderBy(desc(systems.updatedAt));
  return rows.map((r) => ({ id: r.id, name: r.name, content: systemContent.parse(r.content), updatedAt: r.updatedAt }));
}

export async function getSystem(ownerId: string, id: string) {
  const [row] = await db.select().from(systems).where(and(eq(systems.id, id), eq(systems.ownerId, ownerId)));
  return row ? { ...row, content: systemContent.parse(row.content) } : null;
}

export async function createSystem(ownerId: string, content: Partial<SystemContent> = {}, id = nanoid(12)) {
  const parsed = systemContent.parse({ ...emptySystem(), ...content });
  const [row] = await db.insert(systems).values({ id, ownerId, name: parsed.name, content: parsed }).returning();
  return row!;
}

export async function saveSystem(ownerId: string, id: string, content: unknown) {
  const parsed = systemContent.parse(content);
  const [row] = await db
    .update(systems)
    .set({ content: parsed, name: parsed.name, updatedAt: new Date() })
    .where(and(eq(systems.id, id), eq(systems.ownerId, ownerId)))
    .returning({ id: systems.id, updatedAt: systems.updatedAt });
  return row ?? null;
}

export async function deleteSystem(ownerId: string, id: string) {
  const rows = await db.delete(systems).where(and(eq(systems.id, id), eq(systems.ownerId, ownerId))).returning({ id: systems.id });
  return rows.length > 0;
}

export async function listVersions(ownerId: string, systemId: string) {
  return db
    .select({ id: versions.id, number: versions.number, label: versions.label, createdAt: versions.createdAt, content: versions.content })
    .from(versions)
    .where(and(eq(versions.systemId, systemId), eq(versions.ownerId, ownerId)))
    .orderBy(desc(versions.number));
}

export async function createVersion(ownerId: string, systemId: string, label: string) {
  const system = await getSystem(ownerId, systemId);
  if (!system) return null;
  const [{ n } = { n: 0 }] = await db.select({ n: max(versions.number) }).from(versions).where(eq(versions.systemId, systemId));
  const [row] = await db
    .insert(versions)
    .values({ id: nanoid(12), ownerId, systemId, number: (n ?? 0) + 1, label: label.trim().slice(0, 200), content: system.content })
    .returning();
  return row!;
}

export async function getVersion(ownerId: string, systemId: string, number: number) {
  const [row] = await db
    .select()
    .from(versions)
    .where(and(eq(versions.systemId, systemId), eq(versions.ownerId, ownerId), eq(versions.number, number)));
  return row ? { ...row, content: systemContent.parse(row.content) } : null;
}
