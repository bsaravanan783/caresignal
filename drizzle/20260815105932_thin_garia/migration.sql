CREATE INDEX "notification_offset_notification_request_id_index" ON "notification_offset" ("notification_request_id");--> statement-breakpoint
CREATE INDEX "notification_request_status_target_date_index" ON "notification_request" ("status","target_date");--> statement-breakpoint
CREATE INDEX "notification_request_clinic_id_index" ON "notification_request" ("clinic_id");--> statement-breakpoint
CREATE INDEX "notification_status_next_attempt_at_index" ON "notification" ("status","next_attempt_at");--> statement-breakpoint
CREATE INDEX "notification_notification_request_id_index" ON "notification" ("notification_request_id");--> statement-breakpoint
CREATE INDEX "patient_clinic_id_index" ON "patient" ("clinic_id");