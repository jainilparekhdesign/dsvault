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
    /** Set when the owner turns on a public read-only link. */
    publicToken: text('public_token'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ ownerIdx: index('systems_owner_idx').on(t.ownerId, t.updatedAt), publicIdx: uniqueIndex('systems_public_token_idx').on(t.publicToken) }),
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

// Personal access tokens for the Figma and Framer plugins and the MCP server.
// Only a SHA-256 hash is stored; the token is shown once when created.
export const apiTokens = pgTable(
  'api_tokens',
  {
    id: text('id').primaryKey(),
    ownerId: text('owner_id').notNull(),
    name: text('name').notNull().default(''),
    hash: text('hash').notNull(),
    prefix: text('prefix').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
  },
  (t) => ({ hashIdx: uniqueIndex('api_tokens_hash_idx').on(t.hash), ownerIdx: index('api_tokens_owner_idx').on(t.ownerId) }),
);
export type ApiTokenRow = typeof apiTokens.$inferSelect;

// People a system is shared with, by email. Viewers read; editors also change
// tokens, brand book, components and versions. Only the owner deletes or shares.
export const shares = pgTable(
  'shares',
  {
    id: text('id').primaryKey(),
    systemId: text('system_id').notNull().references(() => systems.id, { onDelete: 'cascade' }),
    ownerId: text('owner_id').notNull(),
    email: text('email').notNull(),
    role: text('role').$type<'viewer' | 'editor'>().notNull().default('viewer'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ pairIdx: uniqueIndex('shares_system_email_idx').on(t.systemId, t.email), emailIdx: index('shares_email_idx').on(t.email) }),
);
export type ShareRow = typeof shares.$inferSelect;
