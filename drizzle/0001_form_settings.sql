CREATE TABLE "heal_form_settings" (
	"form_id" text PRIMARY KEY NOT NULL,
	"is_open" boolean DEFAULT false NOT NULL,
	"opens_at" timestamp with time zone,
	"closes_at" timestamp with time zone,
	"updated_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "heal_form_settings_form_id_check" CHECK ("heal_form_settings"."form_id" in ('hpv', 'pap', 'oral', 'hp', 'fit', 'adult')),
	CONSTRAINT "heal_form_settings_period_check" CHECK ("heal_form_settings"."opens_at" is null or "heal_form_settings"."closes_at" is null or "heal_form_settings"."opens_at" < "heal_form_settings"."closes_at")
);
--> statement-breakpoint
ALTER TABLE "heal_form_settings" ADD CONSTRAINT "heal_form_settings_updated_by_heal_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."heal_users"("id") ON DELETE set null ON UPDATE no action;