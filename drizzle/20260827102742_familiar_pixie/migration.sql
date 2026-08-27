ALTER TABLE "patient" ADD COLUMN "email_hash" text;--> statement-breakpoint
ALTER TABLE "patient" ALTER COLUMN "email" SET DATA TYPE text USING "email"::text;--> statement-breakpoint
CREATE INDEX "patient_email_hash_index" ON "patient" ("email_hash");