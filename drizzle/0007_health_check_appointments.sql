CREATE TABLE "heal_appointment_notices" (
	"appointment_id" uuid NOT NULL,
	"recipient" text NOT NULL,
	"status" text NOT NULL,
	"batch_id" uuid NOT NULL,
	"attempted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"sent_at" timestamp with time zone,
	"message_id" text,
	"last_error_code" text,
	CONSTRAINT "heal_appointment_notices_appointment_id_recipient_pk" PRIMARY KEY("appointment_id","recipient"),
	CONSTRAINT "heal_appointment_notices_status_check" CHECK ("heal_appointment_notices"."status" in ('sending', 'sent', 'failed', 'uncertain'))
);
--> statement-breakpoint
ALTER TABLE "heal_appointment_notices" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "heal_appointment_settings" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"is_open" boolean DEFAULT false NOT NULL,
	"recipients" text[] DEFAULT '{}'::text[] NOT NULL,
	"updated_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "heal_appointment_settings_singleton_check" CHECK ("heal_appointment_settings"."id" = 1)
);
--> statement-breakpoint
ALTER TABLE "heal_appointment_settings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "heal_appointments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"id_no" text NOT NULL,
	"name" text NOT NULL,
	"birth_date" date NOT NULL,
	"appointment_date" date NOT NULL,
	"package_code" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"submission_id" uuid,
	"confirmed_by" uuid,
	"confirmed_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "heal_appointments_submission_id_unique" UNIQUE("submission_id"),
	CONSTRAINT "heal_appointments_package_check" CHECK ("heal_appointments"."package_code" in ('new_worker', 'new_worker_hbv', 'food_service', 'in_service')),
	CONSTRAINT "heal_appointments_status_check" CHECK ("heal_appointments"."status" in ('pending', 'confirmed', 'cancelled'))
);
--> statement-breakpoint
ALTER TABLE "heal_appointments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "heal_appointment_notices" ADD CONSTRAINT "heal_appointment_notices_appointment_id_heal_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."heal_appointments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "heal_appointment_settings" ADD CONSTRAINT "heal_appointment_settings_updated_by_heal_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."heal_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "heal_appointments" ADD CONSTRAINT "heal_appointments_submission_id_heal_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."heal_submissions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "heal_appointments" ADD CONSTRAINT "heal_appointments_confirmed_by_heal_users_id_fk" FOREIGN KEY ("confirmed_by") REFERENCES "public"."heal_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "heal_appointment_notices_batch_idx" ON "heal_appointment_notices" USING btree ("batch_id");--> statement-breakpoint
CREATE INDEX "heal_appointment_notices_recipient_idx" ON "heal_appointment_notices" USING btree ("recipient","attempted_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "heal_appointments_identity_idx" ON "heal_appointments" USING btree ("id_no","birth_date","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "heal_appointments_date_status_idx" ON "heal_appointments" USING btree ("appointment_date","status");--> statement-breakpoint
CREATE INDEX "heal_appointments_status_created_idx" ON "heal_appointments" USING btree ("status","created_at" DESC NULLS LAST);--> statement-breakpoint
INSERT INTO "heal_appointment_settings" ("id") VALUES (1) ON CONFLICT ("id") DO NOTHING;
