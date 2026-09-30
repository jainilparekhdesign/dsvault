// Dev helper: prints the Figma pull plan for a system against an optional snapshot file.
import { readFileSync } from 'node:fs';
import { systemContent } from '@dsvault/schema';
import { eq } from 'drizzle-orm';
import { planPull } from '../../figma-plugin/src/sync';
import { db, systems } from '../lib/db';

async function main() {
  const [id = 'jainil-portfolio', snapFile] = process.argv.slice(2);
const [row] = await db.select().from(systems).where(eq(systems.id, id));
if (!row) throw new Error(`No system ${id}`);
const snap = snapFile ? JSON.parse(readFileSync(snapFile, 'utf8')) : { collection: null, variables: [], textStyles: [], effectStyles: [] };
process.stdout.write(JSON.stringify(planPull(systemContent.parse(row.content), snap)));
}
main().then(() => process.exit(0), (e) => { console.error(e); process.exit(1); });
