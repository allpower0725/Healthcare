CREATE TABLE "heal_care"."security_verification_events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"action" text NOT NULL,
	"source" text NOT NULL,
	"outcome" text NOT NULL,
	"code" text NOT NULL,
	"details" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"deployment_id" text,
	CONSTRAINT "security_verification_events_action_check" CHECK ("heal_care"."security_verification_events"."action" in ('public_submit', 'public_resubmit', 'public_return', 'appointment_lookup', 'appointment_create', 'appointment_cancel', 'unknown_action')),
	CONSTRAINT "security_verification_events_source_check" CHECK ("heal_care"."security_verification_events"."source" in ('client', 'server')),
	CONSTRAINT "security_verification_events_outcome_check" CHECK ("heal_care"."security_verification_events"."outcome" in ('accepted', 'rejected', 'unavailable')),
	CONSTRAINT "security_verification_events_code_check" CHECK ("heal_care"."security_verification_events"."code" in ('client_configuration', 'script_load_error', 'script_load_timeout', 'api_not_ready', 'execute_error', 'execute_timeout', 'token_empty', 'configuration_missing', 'token_missing_or_invalid', 'token_invalid', 'action_mismatch', 'hostname_mismatch', 'token_time_invalid', 'token_expired', 'score_invalid', 'score_below_threshold', 'http_error', 'request_timeout', 'response_invalid', 'assessment_error', 'accepted')),
	CONSTRAINT "security_verification_events_details_check" CHECK (jsonb_typeof("heal_care"."security_verification_events"."details") = 'object' and ("heal_care"."security_verification_events"."details" - ARRAY['score','minScore','tokenValid','invalidReason','tokenAgeMs','actionMatches','hostnameAllowed','httpStatus','riskReasons']::text[]) = '{}'::jsonb)
);
--> statement-breakpoint
ALTER TABLE "heal_care"."security_verification_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE INDEX "security_verification_events_time_idx" ON "heal_care"."security_verification_events" USING btree ("occurred_at");
--> statement-breakpoint
REVOKE ALL ON TABLE "heal_care"."security_verification_events" FROM PUBLIC;
