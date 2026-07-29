ALTER TABLE "field_observations" DROP CONSTRAINT "field_observations_target_ck";--> statement-breakpoint
ALTER TABLE "field_resolution_heads" DROP CONSTRAINT "field_resolution_heads_target_ck";--> statement-breakpoint
ALTER TABLE "field_resolutions" DROP CONSTRAINT "field_resolutions_target_ck";--> statement-breakpoint
ALTER TABLE "works" ADD COLUMN "first_publication_date" text;--> statement-breakpoint
ALTER TABLE "works" ADD COLUMN "first_publication_precision" text;--> statement-breakpoint
ALTER TABLE "works" ADD COLUMN "first_publication_sort_date" text;--> statement-breakpoint
ALTER TABLE "field_observations" ADD CONSTRAINT "field_observations_target_ck" CHECK ("field_observations"."entity_type" in ('work', 'edition', 'author', 'category', 'publisher', 'cover_asset') and "field_observations"."field_key" in ('work.preferred_title', 'work.description', 'work.first_publication_date', 'work.preferred_edition', 'work.authors', 'work.categories', 'edition.title', 'edition.subtitle', 'edition.format', 'edition.publication_date', 'edition.pages', 'edition.publishers', 'edition.languages', 'edition.identifiers', 'edition.covers', 'author.display_name', 'category.label', 'publisher.display_name', 'cover_asset.object_key', 'legacy.rating', 'legacy.ratings_count'));--> statement-breakpoint
ALTER TABLE "field_resolution_heads" ADD CONSTRAINT "field_resolution_heads_target_ck" CHECK ("field_resolution_heads"."entity_type" in ('work', 'edition', 'author', 'category', 'publisher', 'cover_asset') and "field_resolution_heads"."field_key" in ('work.preferred_title', 'work.description', 'work.first_publication_date', 'work.preferred_edition', 'work.authors', 'work.categories', 'edition.title', 'edition.subtitle', 'edition.format', 'edition.publication_date', 'edition.pages', 'edition.publishers', 'edition.languages', 'edition.identifiers', 'edition.covers', 'author.display_name', 'category.label', 'publisher.display_name', 'cover_asset.object_key', 'legacy.rating', 'legacy.ratings_count'));--> statement-breakpoint
ALTER TABLE "field_resolutions" ADD CONSTRAINT "field_resolutions_target_ck" CHECK ("field_resolutions"."entity_type" in ('work', 'edition', 'author', 'category', 'publisher', 'cover_asset') and "field_resolutions"."field_key" in ('work.preferred_title', 'work.description', 'work.first_publication_date', 'work.preferred_edition', 'work.authors', 'work.categories', 'edition.title', 'edition.subtitle', 'edition.format', 'edition.publication_date', 'edition.pages', 'edition.publishers', 'edition.languages', 'edition.identifiers', 'edition.covers', 'author.display_name', 'category.label', 'publisher.display_name', 'cover_asset.object_key', 'legacy.rating', 'legacy.ratings_count'));--> statement-breakpoint
ALTER TABLE "works" ADD CONSTRAINT "works_first_publication_precision_ck" CHECK ("works"."first_publication_precision" is null or "works"."first_publication_precision" in ('year', 'month', 'day'));--> statement-breakpoint
ALTER TABLE "works" ADD CONSTRAINT "works_first_publication_date_ck" CHECK ((
        "works"."first_publication_date" is null
        and "works"."first_publication_precision" is null
        and "works"."first_publication_sort_date" is null
      ) or (
        "works"."first_publication_date" is not null
        and "works"."first_publication_precision" is not null
        and "works"."first_publication_sort_date" is not null
        and (
          (
            "works"."first_publication_precision" = 'year'
            and length("works"."first_publication_date") = 4
            and "works"."first_publication_sort_date" = "works"."first_publication_date" || '-01-01'
          ) or (
            "works"."first_publication_precision" = 'month'
            and length("works"."first_publication_date") = 7
            and substring("works"."first_publication_date" from 5 for 1) = '-'
            and "works"."first_publication_sort_date" = "works"."first_publication_date" || '-01'
          ) or (
            "works"."first_publication_precision" = 'day'
            and length("works"."first_publication_date") = 10
            and substring("works"."first_publication_date" from 5 for 1) = '-'
            and substring("works"."first_publication_date" from 8 for 1) = '-'
            and "works"."first_publication_sort_date" = "works"."first_publication_date"
          )
        )
      ));
