import { auth } from '@/auth';

/** The signed-in owner's id. Single user for now: the verified Google email. */
export async function currentOwner(): Promise<string | null> {
  const session = await auth();
  return session?.user?.email?.toLowerCase() ?? null;
}

export async function requireOwner(): Promise<string> {
  const owner = await currentOwner();
  if (!owner) throw new Error('Not signed in');
  return owner;
}
