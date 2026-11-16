-- heal_care schema 與角色由管理帳號預先建立，應用帳號沒有 CREATE DATABASE/SCHEMA 權限。
CREATE TABLE "heal_care"."appointment_attempt_limits" (
	"key_hash" text PRIMARY KEY NOT NULL,
	"attempts" integer NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "heal_care"."appointment_attempt_limits" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "heal_care"."appointment_notices" (
	"appointment_id" uuid NOT NULL,
	"recipient" text NOT NULL,
	"status" text NOT NULL,
	"batch_id" uuid NOT NULL,
	"attempted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"sent_at" timestamp with time zone,
	"message_id" text,
	"last_error_code" text,
	CONSTRAINT "appointment_notices_appointment_id_recipient_pk" PRIMARY KEY("appointment_id","recipient"),
	CONSTRAINT "appointment_notices_status_check" CHECK ("heal_care"."appointment_notices"."status" in ('sending', 'sent', 'failed', 'uncertain'))
);
--> statement-breakpoint
ALTER TABLE "heal_care"."appointment_notices" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "heal_care"."appointment_settings" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"is_open" boolean DEFAULT false NOT NULL,
	"recipients" text[] DEFAULT '{}'::text[] NOT NULL,
	"booking_min_days" integer DEFAULT 15 NOT NULL,
	"booking_max_days" integer DEFAULT 90 NOT NULL,
	"closed_dates" date[] DEFAULT '{}'::date[] NOT NULL,
	"updated_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "appointment_settings_singleton_check" CHECK ("heal_care"."appointment_settings"."id" = 1),
	CONSTRAINT "appointment_settings_booking_days_check" CHECK ("heal_care"."appointment_settings"."booking_min_days" between 1 and 365 and "heal_care"."appointment_settings"."booking_max_days" between "heal_care"."appointment_settings"."booking_min_days" and 365)
);
--> statement-breakpoint
ALTER TABLE "heal_care"."appointment_settings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "heal_care"."appointments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"id_no" text NOT NULL,
	"name" text NOT NULL,
	"birth_date" date NOT NULL,
	"appointment_date" date NOT NULL,
	"package_code" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"submission_id" uuid,
	"management_code_hash" text,
	"confirmed_by" uuid,
	"confirmed_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "appointments_submission_id_unique" UNIQUE("submission_id"),
	CONSTRAINT "appointments_package_check" CHECK ("heal_care"."appointments"."package_code" in ('new_worker', 'new_worker_hbv', 'food_service', 'in_service')),
	CONSTRAINT "appointments_status_check" CHECK ("heal_care"."appointments"."status" in ('pending', 'confirmed', 'cancelled'))
);
--> statement-breakpoint
ALTER TABLE "heal_care"."appointments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "heal_care"."form_settings" (
	"form_id" text PRIMARY KEY NOT NULL,
	"is_open" boolean DEFAULT false NOT NULL,
	"opens_at" timestamp with time zone,
	"closes_at" timestamp with time zone,
	"updated_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "form_settings_form_id_check" CHECK ("heal_care"."form_settings"."form_id" in ('hpv', 'pap', 'oral', 'hp', 'fit', 'adult', 'labor')),
	CONSTRAINT "form_settings_period_check" CHECK ("heal_care"."form_settings"."opens_at" is null or "heal_care"."form_settings"."closes_at" is null or "heal_care"."form_settings"."opens_at" < "heal_care"."form_settings"."closes_at")
);
--> statement-breakpoint
ALTER TABLE "heal_care"."form_settings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "heal_care"."sessions" (
	"token_hash" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"purpose" text DEFAULT 'full' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ip" text,
	"user_agent" text,
	CONSTRAINT "sessions_purpose_check" CHECK ("heal_care"."sessions"."purpose" in ('full', 'bind_google'))
);
--> statement-breakpoint
ALTER TABLE "heal_care"."sessions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "heal_care"."submission_events" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "heal_care"."submission_events_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"submission_id" uuid NOT NULL,
	"action" text NOT NULL,
	"actor_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "submission_events_action_check" CHECK ("heal_care"."submission_events"."action" in ('submitted', 'returned', 'resubmitted', 'completed', 'reopened', 'voided', 'restored'))
);
--> statement-breakpoint
ALTER TABLE "heal_care"."submission_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "heal_care"."submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"form_id" text NOT NULL,
	"status" text NOT NULL,
	"id_no" text NOT NULL,
	"name" text NOT NULL,
	"birth_date" date,
	"public_data" jsonb NOT NULL,
	"staff_data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"device_token_hash" text,
	"device_expires_at" timestamp with time zone,
	"public_submitted_at" timestamp with time zone NOT NULL,
	"staff_updated_by" uuid,
	"staff_updated_at" timestamp with time zone,
	"completed_by" uuid,
	"completed_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "submissions_form_id_check" CHECK ("heal_care"."submissions"."form_id" in ('hpv', 'pap', 'oral', 'hp', 'fit', 'adult', 'labor')),
	CONSTRAINT "submissions_status_check" CHECK ("heal_care"."submissions"."status" in ('submitted', 'returned', 'completed', 'voided'))
);
--> statement-breakpoint
ALTER TABLE "heal_care"."submissions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "heal_care"."users" (
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
	CONSTRAINT "users_google_sub_unique" UNIQUE("google_sub"),
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_role_check" CHECK ("heal_care"."users"."role" in ('superadmin', 'admin', 'staff')),
	CONSTRAINT "users_status_check" CHECK ("heal_care"."users"."status" in ('pending', 'active', 'rejected', 'disabled'))
);
--> statement-breakpoint
ALTER TABLE "heal_care"."users" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "heal_care"."appointment_notices" ADD CONSTRAINT "appointment_notices_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "heal_care"."appointments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "heal_care"."appointment_settings" ADD CONSTRAINT "appointment_settings_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "heal_care"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "heal_care"."appointments" ADD CONSTRAINT "appointments_submission_id_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "heal_care"."submissions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "heal_care"."appointments" ADD CONSTRAINT "appointments_confirmed_by_users_id_fk" FOREIGN KEY ("confirmed_by") REFERENCES "heal_care"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "heal_care"."form_settings" ADD CONSTRAINT "form_settings_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "heal_care"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "heal_care"."sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "heal_care"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "heal_care"."submission_events" ADD CONSTRAINT "submission_events_submission_id_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "heal_care"."submissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "heal_care"."submission_events" ADD CONSTRAINT "submission_events_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "heal_care"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "heal_care"."submissions" ADD CONSTRAINT "submissions_staff_updated_by_users_id_fk" FOREIGN KEY ("staff_updated_by") REFERENCES "heal_care"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "heal_care"."submissions" ADD CONSTRAINT "submissions_completed_by_users_id_fk" FOREIGN KEY ("completed_by") REFERENCES "heal_care"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "heal_care"."users" ADD CONSTRAINT "users_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "heal_care"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "appointment_attempt_limits_expiry_idx" ON "heal_care"."appointment_attempt_limits" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "appointment_notices_batch_idx" ON "heal_care"."appointment_notices" USING btree ("batch_id");--> statement-breakpoint
CREATE INDEX "appointment_notices_recipient_idx" ON "heal_care"."appointment_notices" USING btree ("recipient","attempted_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "appointments_identity_idx" ON "heal_care"."appointments" USING btree ("id_no","birth_date","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "appointments_date_status_idx" ON "heal_care"."appointments" USING btree ("appointment_date","status");--> statement-breakpoint
CREATE INDEX "appointments_status_created_idx" ON "heal_care"."appointments" USING btree ("status","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "heal_care"."sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "submission_events_submission_idx" ON "heal_care"."submission_events" USING btree ("submission_id");--> statement-breakpoint
CREATE INDEX "submissions_id_no_idx" ON "heal_care"."submissions" USING btree ("id_no");--> statement-breakpoint
CREATE INDEX "submissions_form_status_idx" ON "heal_care"."submissions" USING btree ("form_id","status");--> statement-breakpoint
CREATE INDEX "submissions_created_idx" ON "heal_care"."submissions" USING btree ("created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "submissions_submitted_at_idx" ON "heal_care"."submissions" USING btree ("public_submitted_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "submissions_completed_at_idx" ON "heal_care"."submissions" USING btree ("completed_at");--> statement-breakpoint
CREATE INDEX "submissions_device_idx" ON "heal_care"."submissions" USING btree ("device_token_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "users_one_superadmin" ON "heal_care"."users" USING btree ("role") WHERE "heal_care"."users"."role" = 'superadmin';
--> statement-breakpoint
INSERT INTO "heal_care"."form_settings" ("form_id") VALUES ('hpv'), ('pap'), ('oral'), ('hp'), ('fit'), ('adult'), ('labor');
--> statement-breakpoint
INSERT INTO "heal_care"."appointment_settings" ("id") VALUES (1);
