ALTER TABLE "idempotency" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "notification_log" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "notification_offset" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "notification_request" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "notification" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "patient" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "idempotency" AS PERMISSIVE FOR ALL TO "caresignal_app" USING (clinic_id=current_setting('app.clinic_id')::int) WITH CHECK (clinic_id=current_setting('app.clinic_id')::int);--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "notification_log" AS PERMISSIVE FOR ALL TO "caresignal_app" USING (EXISTS(
        SELECT 1 FROM notification n
        JOIN notification_request nr ON notification_request_id=nr.id 
        WHERE n.id = notification_id 
        AND nr.clinic_id = current_setting('app.clinic_id')::int
        )) WITH CHECK (EXISTS(
        SELECT 1 FROM notification n
        JOIN notification_request nr ON notification_request_id=nr.id
        WHERE n.id = notification_id
        AND nr.clinic_id = current_setting('app.clinic_id')::int
        ));--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "notification_offset" AS PERMISSIVE FOR ALL TO "caresignal_app" USING (EXISTS(
    SELECT 1 FROM notification_request nr
    WHERE nr.id=notification_request_id
    AND nr.clinic_id=current_setting('app.clinic_id')::int
    )) WITH CHECK (EXISTS(
    SELECT 1 FROM notification_request nr
    WHERE nr.id=notification_request_id
    AND nr.clinic_id=current_setting('app.clinic_id')::int
    ));--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "notification_request" AS PERMISSIVE FOR ALL TO "caresignal_app" USING (clinic_id=current_setting('app.clinic_id')::int) WITH CHECK (clinic_id=current_setting('app.clinic_id')::int);--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "notification" AS PERMISSIVE FOR ALL TO "caresignal_app" USING (EXISTS(
        SELECT 1 FROM notification_request nr
        WHERE nr.id = notification_request_id
        AND nr.clinic_id = current_setting('app.clinic_id')::int
    )) WITH CHECK (EXISTS(
        SELECT 1 FROM notification_request nr
        WHERE nr.id = notification_request_id
        AND nr.clinic_id = current_setting('app.clinic_id')::int
    ));--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "patient" AS PERMISSIVE FOR ALL TO "caresignal_app" USING (clinic_id = current_setting('app.clinic_id')::int) WITH CHECK (clinic_id = current_setting('app.clinic_id')::int);