CREATE TYPE "public"."convocatoria_audience" AS ENUM('artistas', 'comidas', 'emprendimientos');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('qr');--> statement-breakpoint
CREATE TYPE "public"."reservation_status" AS ENUM('pendiente', 'confirmada', 'expirada', 'cancelada');--> statement-breakpoint
CREATE TYPE "public"."stand_kind" AS ENUM('ilustrador', 'emprendimiento', 'tienda', 'comida', 'organizacion');--> statement-breakpoint
CREATE TYPE "public"."stand_status" AS ENUM('disponible', 'reservado', 'ocupado');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('asistente', 'expositor', 'staff');--> statement-breakpoint
CREATE TABLE "activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"edition_id" text NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"kind" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"banner_url" text,
	"conditions" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"capacity" integer,
	"schedule" text DEFAULT '' NOT NULL,
	"location" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "activity_registrations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"activity_id" uuid NOT NULL,
	"clerk_user_id" text NOT NULL,
	"display_name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "editions" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"date_label" text NOT NULL,
	"venue" text NOT NULL,
	"address" text DEFAULT '' NOT NULL,
	"city" text DEFAULT '' NOT NULL,
	"ticket_price_bob" integer,
	"ticket_label" text DEFAULT 'Entrada libre' NOT NULL,
	"stand_price_bob" integer DEFAULT 0 NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"has_feria" boolean DEFAULT false NOT NULL,
	"reservation_ttl_minutes" integer DEFAULT 2880 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "espacios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"edition_id" text NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exhibitors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerk_user_id" text NOT NULL,
	"slug" text NOT NULL,
	"display_name" text NOT NULL,
	"audience" "convocatoria_audience" DEFAULT 'artistas' NOT NULL,
	"categories" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"verified" boolean DEFAULT false NOT NULL,
	"avatar_url" text,
	"bio" text DEFAULT '' NOT NULL,
	"instagram" text,
	"tiktok" text,
	"facebook" text,
	"web" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reservations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"stand_id" uuid NOT NULL,
	"exhibitor_id" uuid NOT NULL,
	"status" "reservation_status" DEFAULT 'pendiente' NOT NULL,
	"method" "payment_method" DEFAULT 'qr' NOT NULL,
	"preventa_id" text,
	"amount_bob" integer NOT NULL,
	"proof_reference" text,
	"proof_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"confirmed_by" text,
	"confirmed_at" timestamp with time zone,
	"cancelled_reason" text
);
--> statement-breakpoint
CREATE TABLE "stand_companions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reservation_id" uuid NOT NULL,
	"display_name" text NOT NULL,
	"exhibitor_id" uuid,
	"instagram" text,
	"contacto" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stands" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"edition_id" text NOT NULL,
	"espacio_id" uuid NOT NULL,
	"code" text NOT NULL,
	"numero" integer NOT NULL,
	"x" integer NOT NULL,
	"y" integer NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"rotate" integer,
	"status" "stand_status" DEFAULT 'disponible' NOT NULL,
	"kind" "stand_kind" DEFAULT 'ilustrador' NOT NULL,
	"max_companeros" integer DEFAULT 1 NOT NULL,
	"external_name" text
);
--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_edition_id_editions_id_fk" FOREIGN KEY ("edition_id") REFERENCES "public"."editions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_registrations" ADD CONSTRAINT "activity_registrations_activity_id_activities_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."activities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "espacios" ADD CONSTRAINT "espacios_edition_id_editions_id_fk" FOREIGN KEY ("edition_id") REFERENCES "public"."editions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_stand_id_stands_id_fk" FOREIGN KEY ("stand_id") REFERENCES "public"."stands"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_exhibitor_id_exhibitors_id_fk" FOREIGN KEY ("exhibitor_id") REFERENCES "public"."exhibitors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stand_companions" ADD CONSTRAINT "stand_companions_reservation_id_reservations_id_fk" FOREIGN KEY ("reservation_id") REFERENCES "public"."reservations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stand_companions" ADD CONSTRAINT "stand_companions_exhibitor_id_exhibitors_id_fk" FOREIGN KEY ("exhibitor_id") REFERENCES "public"."exhibitors"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stands" ADD CONSTRAINT "stands_edition_id_editions_id_fk" FOREIGN KEY ("edition_id") REFERENCES "public"."editions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stands" ADD CONSTRAINT "stands_espacio_id_espacios_id_fk" FOREIGN KEY ("espacio_id") REFERENCES "public"."espacios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "activities_edition_slug_key" ON "activities" USING btree ("edition_id","slug");--> statement-breakpoint
CREATE UNIQUE INDEX "activity_registrations_unica_key" ON "activity_registrations" USING btree ("activity_id","clerk_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "espacios_edition_code_key" ON "espacios" USING btree ("edition_id","code");--> statement-breakpoint
CREATE UNIQUE INDEX "exhibitors_clerk_user_id_key" ON "exhibitors" USING btree ("clerk_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "exhibitors_slug_key" ON "exhibitors" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "reservations_stand_activa_key" ON "reservations" USING btree ("stand_id") WHERE "reservations"."status" in ('pendiente', 'confirmada');--> statement-breakpoint
CREATE UNIQUE INDEX "reservations_exhibitor_activa_key" ON "reservations" USING btree ("exhibitor_id") WHERE "reservations"."status" in ('pendiente', 'confirmada');--> statement-breakpoint
CREATE INDEX "reservations_status_idx" ON "reservations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "stand_companions_reservation_idx" ON "stand_companions" USING btree ("reservation_id");--> statement-breakpoint
CREATE UNIQUE INDEX "stands_edition_code_key" ON "stands" USING btree ("edition_id","code");--> statement-breakpoint
CREATE INDEX "stands_edition_status_idx" ON "stands" USING btree ("edition_id","status");