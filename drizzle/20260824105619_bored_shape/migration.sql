CREATE TYPE "action" AS ENUM('CREATE', 'READ', 'CANCEL');--> statement-breakpoint
CREATE TYPE "entity_state" AS ENUM('SUBMITTED', 'COMPLETED', 'PARTIAL_COMPLETED', 'CANCELLED', 'FAILED');--> statement-breakpoint
CREATE TYPE "entity_type" AS ENUM('NOTIFICATION_REQUEST');--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "audit_log_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"api_key_id" integer NOT NULL,
	"entity_id" integer NOT NULL,
	"entity_type" "entity_type" NOT NULL,
	"entity_state" "entity_state" NOT NULL,
	"action" "action" NOT NULL,
	"clinic_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audit_log" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE INDEX "audit_log_clinic_id_index" ON "audit_log" ("clinic_id");--> statement-breakpoint
CREATE INDEX "audit_log_entity_type_entity_id_index" ON "audit_log" ("entity_type","entity_id");--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_api_key_id_api_key_id_fkey" FOREIGN KEY ("api_key_id") REFERENCES "api_key"("id");--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_clinic_id_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinic"("id");--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "audit_log" AS PERMISSIVE FOR ALL TO "caresignal_app" USING (clinic_id = current_setting('app.clinic_id')::int) WITH CHECK (clinic_id = current_setting('app.clinic_id')::int);