CREATE TABLE "heal_appointment_attempt_limits" (
	"key_hash" text PRIMARY KEY NOT NULL,
	"attempts" integer NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "heal_appointment_attempt_limits" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "heal_appointment_settings" ADD COLUMN "booking_min_days" integer DEFAULT 15 NOT NULL;--> statement-breakpoint
ALTER TABLE "heal_appointment_settings" ADD COLUMN "booking_max_days" integer DEFAULT 90 NOT NULL;--> statement-breakpoint
ALTER TABLE "heal_appointment_settings" ADD COLUMN "closed_dates" date[] DEFAULT '{}'::date[] NOT NULL;--> statement-breakpoint
ALTER TABLE "heal_appointments" ADD COLUMN "management_code_hash" text;--> statement-breakpoint
CREATE INDEX "heal_appointment_attempt_limits_expiry_idx" ON "heal_appointment_attempt_limits" USING btree ("expires_at");--> statement-breakpoint
ALTER TABLE "heal_appointment_settings" ADD CONSTRAINT "heal_appointment_settings_booking_days_check" CHECK ("heal_appointment_settings"."booking_min_days" between 1 and 365 and "heal_appointment_settings"."booking_max_days" between "heal_appointment_settings"."booking_min_days" and 365);