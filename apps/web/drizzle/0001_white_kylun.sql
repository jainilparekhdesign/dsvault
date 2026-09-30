CREATE TABLE IF NOT EXISTS "api_tokens" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"name" text DEFAULT '' NOT NULL,
	"hash" text NOT NULL,
	"prefix" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_used_at" timestamp with time zone
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "api_tokens_hash_idx" ON "api_tokens" USING btree ("hash");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "api_tokens_owner_idx" ON "api_tokens" USING btree ("owner_id");