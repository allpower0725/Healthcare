ALTER TABLE "heal_form_settings" DROP CONSTRAINT "heal_form_settings_form_id_check";--> statement-breakpoint
ALTER TABLE "heal_submissions" DROP CONSTRAINT "heal_submissions_form_id_check";--> statement-breakpoint
ALTER TABLE "heal_form_settings" ADD CONSTRAINT "heal_form_settings_form_id_check" CHECK ("heal_form_settings"."form_id" in ('hpv', 'pap', 'oral', 'hp', 'fit', 'adult', 'labor'));--> statement-breakpoint
ALTER TABLE "heal_submissions" ADD CONSTRAINT "heal_submissions_form_id_check" CHECK ("heal_submissions"."form_id" in ('hpv', 'pap', 'oral', 'hp', 'fit', 'adult', 'labor'));--> statement-breakpoint
INSERT INTO "heal_form_settings" ("form_id", "is_open") VALUES ('labor', false) ON CONFLICT ("form_id") DO NOTHING;
