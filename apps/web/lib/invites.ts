import { eq } from 'drizzle-orm';
import { db, shares } from './db';

/** Whether anyone has shared a system with this email. */
export async function hasInvite(email: string) {
  const [row] = await db.select({ id: shares.id }).from(shares).where(eq(shares.email, email.toLowerCase())).limit(1);
  return !!row;
}
