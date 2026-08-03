-- Aceptación de las reglas de participación, obligatoria para reservar.
--
-- Se añaden nulables, se rellenan y recién entonces se ponen NOT NULL: un
-- `ADD COLUMN ... NOT NULL` a secas (lo que genera drizzle-kit) revienta en
-- cualquier base que ya tenga reservas, como las sembradas con `db:seed`.
--
-- A esas filas viejas se les pone 'sin-reglamento' en vez del reglamento
-- vigente: nadie aceptó nada, y decir que sí sería falsear justo el dato que
-- estas columnas existen para sostener. La fecha se toma de `created_at`.
ALTER TABLE "reservations" ADD COLUMN "terms_version" text;--> statement-breakpoint
ALTER TABLE "reservations" ADD COLUMN "terms_accepted_at" timestamp with time zone;--> statement-breakpoint
UPDATE "reservations" SET "terms_version" = 'sin-reglamento', "terms_accepted_at" = "created_at" WHERE "terms_version" IS NULL;--> statement-breakpoint
ALTER TABLE "reservations" ALTER COLUMN "terms_version" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "reservations" ALTER COLUMN "terms_accepted_at" SET NOT NULL;
