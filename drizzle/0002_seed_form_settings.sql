-- 6 張表單的開放設定，預設關閉
INSERT INTO "form_settings" ("form_id") VALUES ('hpv'), ('pap'), ('oral'), ('hp'), ('fit'), ('adult')
ON CONFLICT ("form_id") DO NOTHING;
