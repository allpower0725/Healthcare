CREATE TABLE "submission_events" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "submission_events_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"submission_id" uuid NOT NULL,
	"action" text NOT NULL,
	"actor_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "submission_events_action_check" CHECK ("submission_events"."action" in ('submitted', 'returned', 'resubmitted', 'completed', 'reopened', 'voided', 'restored'))
);
--> statement-breakpoint
CREATE TABLE "submissions" (
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
	CONSTRAINT "submissions_form_id_check" CHECK ("submissions"."form_id" in ('hpv', 'pap', 'oral', 'hp', 'fit', 'adult')),
	CONSTRAINT "submissions_status_check" CHECK ("submissions"."status" in ('submitted', 'returned', 'completed', 'voided'))
);
--> statement-breakpoint
ALTER TABLE "submission_events" ADD CONSTRAINT "submission_events_submission_id_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."submissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submission_events" ADD CONSTRAINT "submission_events_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_staff_updated_by_users_id_fk" FOREIGN KEY ("staff_updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_completed_by_users_id_fk" FOREIGN KEY ("completed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "submission_events_submission_idx" ON "submission_events" USING btree ("submission_id");--> statement-breakpoint
CREATE INDEX "submissions_id_no_idx" ON "submissions" USING btree ("id_no");--> statement-breakpoint
CREATE INDEX "submissions_form_status_idx" ON "submissions" USING btree ("form_id","status");--> statement-breakpoint
CREATE INDEX "submissions_created_idx" ON "submissions" USING btree ("created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "submissions_device_idx" ON "submissions" USING btree ("device_token_hash");