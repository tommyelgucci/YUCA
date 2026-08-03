CREATE TYPE "public"."producto_estado" AS ENUM('borrador', 'publicado', 'agotado');--> statement-breakpoint
CREATE TABLE "producto_fotos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"producto_id" uuid NOT NULL,
	"url" text NOT NULL,
	"alt" text DEFAULT '' NOT NULL,
	"orden" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "productos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"exhibitor_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"nombre" text NOT NULL,
	"descripcion" text DEFAULT '' NOT NULL,
	"precio_bob" integer NOT NULL,
	"stock" integer,
	"estado" "producto_estado" DEFAULT 'borrador' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "resenas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"exhibitor_id" uuid NOT NULL,
	"autor_clerk_user_id" text NOT NULL,
	"autor_nombre" text NOT NULL,
	"estrellas" integer NOT NULL,
	"comentario" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "resenas_estrellas_rango" CHECK ("resenas"."estrellas" between 1 and 5)
);
--> statement-breakpoint
ALTER TABLE "exhibitors" ADD COLUMN "tienda_abierta" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "producto_fotos" ADD CONSTRAINT "producto_fotos_producto_id_productos_id_fk" FOREIGN KEY ("producto_id") REFERENCES "public"."productos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "productos" ADD CONSTRAINT "productos_exhibitor_id_exhibitors_id_fk" FOREIGN KEY ("exhibitor_id") REFERENCES "public"."exhibitors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resenas" ADD CONSTRAINT "resenas_exhibitor_id_exhibitors_id_fk" FOREIGN KEY ("exhibitor_id") REFERENCES "public"."exhibitors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "producto_fotos_producto_idx" ON "producto_fotos" USING btree ("producto_id");--> statement-breakpoint
CREATE UNIQUE INDEX "productos_tienda_slug_key" ON "productos" USING btree ("exhibitor_id","slug");--> statement-breakpoint
CREATE INDEX "productos_estado_idx" ON "productos" USING btree ("estado");--> statement-breakpoint
CREATE UNIQUE INDEX "resenas_autor_vendedor_key" ON "resenas" USING btree ("exhibitor_id","autor_clerk_user_id");--> statement-breakpoint
CREATE INDEX "resenas_exhibitor_idx" ON "resenas" USING btree ("exhibitor_id");