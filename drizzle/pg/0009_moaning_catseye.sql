ALTER TABLE "description_candidates" DROP CONSTRAINT "description_candidates_license_ck";--> statement-breakpoint
ALTER TABLE "description_candidates" ADD COLUMN "licensed_source_text_hash" text;--> statement-breakpoint
ALTER TABLE "description_candidates" ADD COLUMN "licensed_text_transformed" boolean;--> statement-breakpoint
UPDATE "description_candidates"
SET
  "licensed_source_text_hash" = "text_hash",
  "licensed_text_transformed" = false
WHERE "description_class" = 'licensed_verbatim';--> statement-breakpoint
ALTER TABLE "description_candidates" ADD CONSTRAINT "description_candidates_license_ck" CHECK ((
        "description_candidates"."description_class" = 'licensed_verbatim'
        and length(trim("description_candidates"."license_name")) > 0
        and length(trim("description_candidates"."license_url")) > 0
        and "description_candidates"."derivatives_permitted" is not null
        and length("description_candidates"."licensed_source_text_hash") = 64
        and "description_candidates"."licensed_text_transformed" is not null
      ) or (
        "description_candidates"."description_class" <> 'licensed_verbatim'
        and "description_candidates"."license_name" is null
        and "description_candidates"."license_url" is null
        and "description_candidates"."attribution_text" is null
        and "description_candidates"."derivatives_permitted" is null
        and "description_candidates"."licensed_source_text_hash" is null
        and "description_candidates"."licensed_text_transformed" is null
      ));
