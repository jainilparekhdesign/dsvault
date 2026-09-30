CREATE TABLE IF NOT EXISTS "shares" (
	"id" text PRIMARY KEY NOT NULL,
	"system_id" text NOT NULL,
	"owner_id" text NOT NULL,
	"email" text NOT NULL,
	"role" text DEFAULT 'viewer' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "systems" ADD COLUMN "public_token" text;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "shares" ADD CONSTRAINT "shares_system_id_systems_id_fk" FOREIGN KEY ("system_id") REFERENCES "public"."systems"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "shares_system_email_idx" ON "shares" USING btree ("system_id","email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "shares_email_idx" ON "shares" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "systems_public_token_idx" ON "systems" USING btree ("public_token");