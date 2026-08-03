-- El acompañante pasa a ser un expositor registrado (lo pidió la organización).
--
-- Este SQL asume que no hay acompañantes de texto libre guardados. Es cierto
-- hoy: ninguna base real ha existido nunca y `db:seed` no siembra ninguno.
--
-- Si algún día falla aquí, NO lo fuerces: significa que hay acompañantes sin
-- perfil detrás, y qué hacer con ellos —invitarles a registrarse, o borrarlos—
-- es una decisión de la organización, no algo que deba resolver una migración
-- en silencio.
--
-- `instagram` y `contacto` se van porque ahora esos datos salen del perfil del
-- acompañante. Tenerlos copiados aquí sólo servía para quedarse viejos.

ALTER TABLE "stand_companions" DROP CONSTRAINT "stand_companions_exhibitor_id_exhibitors_id_fk";
--> statement-breakpoint
ALTER TABLE "stand_companions" ALTER COLUMN "exhibitor_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "stand_companions" ADD CONSTRAINT "stand_companions_exhibitor_id_exhibitors_id_fk" FOREIGN KEY ("exhibitor_id") REFERENCES "public"."exhibitors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "stand_companions_exhibitor_idx" ON "stand_companions" USING btree ("exhibitor_id");--> statement-breakpoint
ALTER TABLE "stand_companions" DROP COLUMN "instagram";--> statement-breakpoint
ALTER TABLE "stand_companions" DROP COLUMN "contacto";
