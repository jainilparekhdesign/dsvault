CREATE TABLE IF NOT EXISTS "systems" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"name" text DEFAULT '' NOT NULL,
	"content" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "versions" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"system_id" text NOT NULL,
	"number" integer NOT NULL,
	"label" text DEFAULT '' NOT NULL,
	"content" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "versions" ADD CONSTRAINT "versions_system_id_systems_id_fk" FOREIGN KEY ("system_id") REFERENCES "public"."systems"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "systems_owner_idx" ON "systems" USING btree ("owner_id","updated_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "versions_system_number_idx" ON "versions" USING btree ("system_id","number");