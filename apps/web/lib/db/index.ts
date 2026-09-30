import { neon } from '@neondatabase/serverless';
import { type NeonHttpDatabase, drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

let instance: NeonHttpDatabase<typeof schema> | null = null;

// Connects on first query, so importing this module never needs the env.
export const db = new Proxy({} as NeonHttpDatabase<typeof schema>, {
  get(_, prop) {
    if (!instance) {
      const url = process.env.DATABASE_URL;
      if (!url) throw new Error('DATABASE_URL is not set');
      instance = drizzle(neon(url), { schema });
    }
    return Reflect.get(instance, prop, instance);
  },
});
export * from './schema';
