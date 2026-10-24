CREATE TABLE "heal_sessions" (
	"token_hash" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"purpose" text DEFAULT 'full' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ip" text,
	"user_agent" text,
	CONSTRAINT "heal_sessions_purpose_check" CHECK ("heal_sessions"."purpose" in ('full', 'bind_google'))
);
--> statement-breakpoint
CREATE TABLE "heal_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"role" text DEFAULT 'staff' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"google_sub" text,
	"email" text,
	"name" text NOT NULL,
	"avatar_url" text,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "heal_users_google_sub_unique" UNIQUE("google_sub"),
	CONSTRAINT "heal_users_email_unique" UNIQUE("email"),
	CONSTRAINT "heal_users_role_check" CHECK ("heal_users"."role" in ('superadmin', 'admin', 'staff')),
	CONSTRAINT "heal_users_status_check" CHECK ("heal_users"."status" in ('pending', 'active', 'rejected', 'disabled'))
);
--> statement-breakpoint
ALTER TABLE "heal_sessions" ADD CONSTRAINT "heal_sessions_user_id_heal_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."heal_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "heal_users" ADD CONSTRAINT "heal_users_reviewed_by_heal_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."heal_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "heal_sessions_user_idx" ON "heal_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "heal_users_one_superadmin" ON "heal_users" USING btree ("role") WHERE "heal_users"."role" = 'superadmin';