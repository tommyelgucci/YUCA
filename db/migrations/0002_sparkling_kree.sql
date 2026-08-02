ALTER TYPE "public"."convocatoria_audience" ADD VALUE 'tiendas' BEFORE 'emprendimientos';--> statement-breakpoint
ALTER TABLE "exhibitors" ADD COLUMN "guardian_name" text;--> statement-breakpoint
ALTER TABLE "exhibitors" ADD COLUMN "guardian_contact" text;--> statement-breakpoint
ALTER TABLE "exhibitors" ADD COLUMN "guardian_consent_at" timestamp with time zone;