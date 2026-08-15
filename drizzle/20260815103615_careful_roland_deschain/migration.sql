CREATE TYPE "notification_offset_type" AS ENUM('EMAIL');--> statement-breakpoint
CREATE TYPE "notification_request_status" AS ENUM('SUBMITTED', 'COMPLETED', 'PARTIAL_COMPLETED', 'FAILED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "notification_status" AS ENUM('QUEUED', 'PROCESSING', 'SENT', 'FAILED', 'CANCELLED');--> statement-breakpoint
CREATE TABLE "clinic" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "clinic_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "idempotency" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "idempotency_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"key" varchar(255) NOT NULL,
	"body" text NOT NULL,
	"response" text NOT NULL,
	"clinic_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "idempotency_clinic_id_key_unique" UNIQUE("clinic_id","key")
);
--> statement-breakpoint
CREATE TABLE "notification_log" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "notification_log_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"attempt_no" integer NOT NULL,
	"response" text NOT NULL,
	"message_provider_id" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"notification_id" integer
);
--> statement-breakpoint
CREATE TABLE "notification_offset" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "notification_offset_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"offset" integer NOT NULL,
	"type" "notification_offset_type" NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"notification_request_id" integer NOT NULL,
	CONSTRAINT "notification_offset_offset_notification_request_id_unique" UNIQUE("offset","notification_request_id")
);
--> statement-breakpoint
CREATE TABLE "notification_request" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "notification_request_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"status" "notification_request_status" DEFAULT 'SUBMITTED'::"notification_request_status" NOT NULL,
	"target_date" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"clinic_id" integer NOT NULL,
	"patient_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "notification_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"status" "notification_status" DEFAULT 'QUEUED'::"notification_status" NOT NULL,
	"next_attempt_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"notification_request_id" integer NOT NULL,
	"notification_offset_id" integer NOT NULL UNIQUE,
	CONSTRAINT "notification_notification_offset_id_notification_request_id_unique" UNIQUE("notification_offset_id","notification_request_id")
);
--> statement-breakpoint
CREATE TABLE "patient" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "patient_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"phone_number" varchar(20),
	"clinic_id" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "idempotency" ADD CONSTRAINT "idempotency_clinic_id_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "notification_log" ADD CONSTRAINT "notification_log_notification_id_notification_id_fkey" FOREIGN KEY ("notification_id") REFERENCES "notification"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "notification_offset" ADD CONSTRAINT "notification_offset_xDQb4AeabmE7_fkey" FOREIGN KEY ("notification_request_id") REFERENCES "notification_request"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "notification_request" ADD CONSTRAINT "notification_request_clinic_id_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "notification_request" ADD CONSTRAINT "notification_request_patient_id_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "notification" ADD CONSTRAINT "notification_TXBywXlaqb17_fkey" FOREIGN KEY ("notification_request_id") REFERENCES "notification_request"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "notification" ADD CONSTRAINT "notification_notification_offset_id_notification_offset_id_fkey" FOREIGN KEY ("notification_offset_id") REFERENCES "notification_offset"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "patient" ADD CONSTRAINT "patient_clinic_id_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;