import type { SystemContent } from '@dsvault/schema';
import { index, integer, jsonb, pgTable, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';

// Every row carries ownerId so accounts and sharing can come later.
// A system's content (tokens, brand book, manual checklist ticks) is one
// validated JSON document: versions snapshot it whole and diff it.
export const systems = pgTable(
  'systems',
  {
    id: text('id').primaryKey(),
    ownerId: text('owner_id').notNull(),
    name: text('name').notNull().default(''),
    content: jsonb('content').$type<SystemContent>().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ ownerIdx: index('systems_owner_idx').on(t.ownerId, t.updatedAt) }),
);

export const versions = pgTable(
  'versions',
  {
    id: text('id').primaryKey(),
    ownerId: text('owner_id').notNull(),
    systemId: text('system_id')
      .notNull()
      .references(() => systems.id, { onDelete: 'cascade' }),
    number: integer('number').notNull(),
    label: text('label').notNull().default(''),
    content: jsonb('content').$type<SystemContent>().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ numberIdx: uniqueIndex('versions_system_number_idx').on(t.systemId, t.number) }),
);

export type SystemRow = typeof systems.$inferSelect;
export type VersionRow = typeof versions.$inferSelect;
