CREATE TABLE "authors" (
	"id" text PRIMARY KEY NOT NULL,
	"display_name" text NOT NULL,
	"sort_name" text,
	CONSTRAINT "authors_name_nonempty_ck" CHECK (length(trim("authors"."display_name")) > 0),
	CONSTRAINT "authors_sort_name_ck" CHECK ("authors"."sort_name" is null or length(trim("authors"."sort_name")) > 0)
);
--> statement-breakpoint
CREATE TABLE "catalog_change_events" (
	"id" text PRIMARY KEY NOT NULL,
	"change_type" text NOT NULL,
	"actor_ref" text NOT NULL,
	"payload_json" jsonb NOT NULL,
	"reason" text NOT NULL,
	"created_at" bigint NOT NULL,
	CONSTRAINT "catalog_change_events_type_ck" CHECK ("catalog_change_events"."change_type" in ('work_merge', 'work_split', 'edition_reassignment')),
	CONSTRAINT "catalog_change_events_nonempty_ck" CHECK (length(trim("catalog_change_events"."actor_ref")) > 0 and length(trim("catalog_change_events"."reason")) > 0)
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"label" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	CONSTRAINT "categories_nonempty_ck" CHECK (length(trim("categories"."slug")) > 0 and length(trim("categories"."label")) > 0),
	CONSTRAINT "categories_status_ck" CHECK ("categories"."status" in ('active', 'retired'))
);
--> statement-breakpoint
CREATE TABLE "cover_assets" (
	"id" text PRIMARY KEY NOT NULL,
	"object_key" text NOT NULL,
	"media_type" text,
	"width" integer,
	"height" integer,
	"bytes" bigint,
	"checksum" text,
	"state" text NOT NULL,
	"source_policy_id" text,
	CONSTRAINT "cover_assets_object_key_ck" CHECK (length(trim("cover_assets"."object_key")) > 0 and substring("cover_assets"."object_key" from 1 for 8) = '/covers/'),
	CONSTRAINT "cover_assets_state_ck" CHECK ("cover_assets"."state" in ('available', 'missing', 'withdrawn', 'failed')),
	CONSTRAINT "cover_assets_dimensions_ck" CHECK (("cover_assets"."width" is null or "cover_assets"."width" > 0)
        and ("cover_assets"."height" is null or "cover_assets"."height" > 0)
        and ("cover_assets"."bytes" is null or "cover_assets"."bytes" > 0))
);
--> statement-breakpoint
CREATE TABLE "edition_covers" (
	"edition_id" text NOT NULL,
	"cover_asset_id" text NOT NULL,
	"position" integer NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	CONSTRAINT "edition_covers_pk" PRIMARY KEY("edition_id","cover_asset_id"),
	CONSTRAINT "edition_covers_position_ck" CHECK ("edition_covers"."position" >= 0)
);
--> statement-breakpoint
CREATE TABLE "edition_identifiers" (
	"id" text PRIMARY KEY NOT NULL,
	"edition_id" text NOT NULL,
	"scheme" text NOT NULL,
	"value_normalized" text NOT NULL,
	"value_display" text,
	"is_primary" boolean DEFAULT false NOT NULL,
	CONSTRAINT "edition_identifiers_scheme_ck" CHECK ("edition_identifiers"."scheme" in ('isbn10', 'isbn13')),
	CONSTRAINT "edition_identifiers_value_ck" CHECK (length(trim("edition_identifiers"."value_normalized")) > 0)
);
--> statement-breakpoint
CREATE TABLE "edition_languages" (
	"edition_id" text NOT NULL,
	"language_tag" text NOT NULL,
	"position" integer NOT NULL,
	CONSTRAINT "edition_languages_pk" PRIMARY KEY("edition_id","language_tag"),
	CONSTRAINT "edition_languages_position_ck" CHECK ("edition_languages"."position" >= 0)
);
--> statement-breakpoint
CREATE TABLE "edition_publishers" (
	"edition_id" text NOT NULL,
	"publisher_id" text NOT NULL,
	"position" integer NOT NULL,
	"role" text,
	CONSTRAINT "edition_publishers_pk" PRIMARY KEY("edition_id","publisher_id"),
	CONSTRAINT "edition_publishers_position_ck" CHECK ("edition_publishers"."position" >= 0),
	CONSTRAINT "edition_publishers_role_ck" CHECK ("edition_publishers"."role" is null or "edition_publishers"."role" in ('publisher', 'co_publisher', 'imprint', 'distributor'))
);
--> statement-breakpoint
CREATE TABLE "editions" (
	"id" text PRIMARY KEY NOT NULL,
	"work_id" text NOT NULL,
	"title" text,
	"subtitle" text,
	"format" text,
	"publication_date" text,
	"publication_precision" text,
	"publication_sort_date" text,
	"pages" integer,
	"cataloged_at" bigint NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL,
	CONSTRAINT "editions_title_ck" CHECK ("editions"."title" is null or length(trim("editions"."title")) > 0),
	CONSTRAINT "editions_subtitle_ck" CHECK ("editions"."subtitle" is null or length(trim("editions"."subtitle")) > 0),
	CONSTRAINT "editions_format_ck" CHECK ("editions"."format" is null or "editions"."format" in ('hardcover', 'paperback', 'ebook', 'audiobook', 'other')),
	CONSTRAINT "editions_pages_ck" CHECK ("editions"."pages" is null or "editions"."pages" > 0),
	CONSTRAINT "editions_publication_precision_ck" CHECK ("editions"."publication_precision" is null or "editions"."publication_precision" in ('year', 'month', 'day')),
	CONSTRAINT "editions_publication_date_ck" CHECK ((
        "editions"."publication_date" is null
        and "editions"."publication_precision" is null
        and "editions"."publication_sort_date" is null
      ) or (
        "editions"."publication_precision" = 'year'
        and length("editions"."publication_date") = 4
        and "editions"."publication_sort_date" = "editions"."publication_date" || '-01-01'
      ) or (
        "editions"."publication_precision" = 'month'
        and length("editions"."publication_date") = 7
        and substring("editions"."publication_date" from 5 for 1) = '-'
        and "editions"."publication_sort_date" = "editions"."publication_date" || '-01'
      ) or (
        "editions"."publication_precision" = 'day'
        and length("editions"."publication_date") = 10
        and substring("editions"."publication_date" from 5 for 1) = '-'
        and substring("editions"."publication_date" from 8 for 1) = '-'
        and "editions"."publication_sort_date" = "editions"."publication_date"
      ))
);
--> statement-breakpoint
CREATE TABLE "entity_aliases" (
	"entity_type" text NOT NULL,
	"from_id" text NOT NULL,
	"to_id" text NOT NULL,
	"reason" text NOT NULL,
	"created_at" bigint NOT NULL,
	CONSTRAINT "entity_aliases_pk" PRIMARY KEY("entity_type","from_id"),
	CONSTRAINT "entity_aliases_ck" CHECK ("entity_aliases"."entity_type" in ('work', 'edition', 'author', 'category', 'publisher', 'cover_asset')
        and "entity_aliases"."from_id" <> "entity_aliases"."to_id"
        and length(trim("entity_aliases"."reason")) > 0)
);
--> statement-breakpoint
CREATE TABLE "field_observations" (
	"id" text PRIMARY KEY NOT NULL,
	"source_record_id" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"field_key" text NOT NULL,
	"value_json" jsonb NOT NULL,
	"comparison_hash" text NOT NULL,
	"provenance_kind" text NOT NULL,
	"source_path" text,
	"source_modified_at" bigint,
	"retrieved_at" bigint NOT NULL,
	"mapping_confidence" double precision NOT NULL,
	"state" text NOT NULL,
	"actor_ref" text,
	"reason" text,
	"derivation_name" text,
	"derivation_version" text,
	"parent_ids_json" jsonb,
	CONSTRAINT "field_observations_target_ck" CHECK ("field_observations"."entity_type" in ('work', 'edition', 'author', 'category', 'publisher', 'cover_asset') and "field_observations"."field_key" in ('work.preferred_title', 'work.description', 'work.preferred_edition', 'work.authors', 'work.categories', 'edition.title', 'edition.subtitle', 'edition.format', 'edition.publication_date', 'edition.pages', 'edition.publishers', 'edition.languages', 'edition.identifiers', 'edition.covers', 'author.display_name', 'category.label', 'publisher.display_name', 'cover_asset.object_key', 'legacy.rating', 'legacy.ratings_count')),
	CONSTRAINT "field_observations_hash_ck" CHECK (length("field_observations"."comparison_hash") = 64),
	CONSTRAINT "field_observations_provenance_ck" CHECK ("field_observations"."provenance_kind" in ('curated', 'imported', 'derived', 'synthetic')),
	CONSTRAINT "field_observations_state_ck" CHECK ("field_observations"."state" in ('active', 'stale', 'withdrawn', 'invalid')),
	CONSTRAINT "field_observations_confidence_ck" CHECK ("field_observations"."mapping_confidence" between 0 and 1),
	CONSTRAINT "field_observations_curated_ck" CHECK ("field_observations"."provenance_kind" <> 'curated'
        or (length(trim("field_observations"."actor_ref")) > 0 and length(trim("field_observations"."reason")) > 0)),
	CONSTRAINT "field_observations_derived_ck" CHECK ("field_observations"."provenance_kind" <> 'derived'
        or (
          length(trim("field_observations"."derivation_name")) > 0
          and length(trim("field_observations"."derivation_version")) > 0
          and "field_observations"."parent_ids_json" is not null
        ))
);
--> statement-breakpoint
CREATE TABLE "field_resolution_heads" (
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"field_key" text NOT NULL,
	"resolution_id" text NOT NULL,
	CONSTRAINT "field_resolution_heads_pk" PRIMARY KEY("entity_type","entity_id","field_key"),
	CONSTRAINT "field_resolution_heads_target_ck" CHECK ("field_resolution_heads"."entity_type" in ('work', 'edition', 'author', 'category', 'publisher', 'cover_asset') and "field_resolution_heads"."field_key" in ('work.preferred_title', 'work.description', 'work.preferred_edition', 'work.authors', 'work.categories', 'edition.title', 'edition.subtitle', 'edition.format', 'edition.publication_date', 'edition.pages', 'edition.publishers', 'edition.languages', 'edition.identifiers', 'edition.covers', 'author.display_name', 'category.label', 'publisher.display_name', 'cover_asset.object_key', 'legacy.rating', 'legacy.ratings_count'))
);
--> statement-breakpoint
CREATE TABLE "field_resolutions" (
	"id" text PRIMARY KEY NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"field_key" text NOT NULL,
	"selected_observation_id" text,
	"state" text NOT NULL,
	"reason" text NOT NULL,
	"previous_resolution_id" text,
	"actor_ref" text NOT NULL,
	"resolver_version" text NOT NULL,
	"resolved_at" bigint NOT NULL,
	CONSTRAINT "field_resolutions_target_ck" CHECK ("field_resolutions"."entity_type" in ('work', 'edition', 'author', 'category', 'publisher', 'cover_asset') and "field_resolutions"."field_key" in ('work.preferred_title', 'work.description', 'work.preferred_edition', 'work.authors', 'work.categories', 'edition.title', 'edition.subtitle', 'edition.format', 'edition.publication_date', 'edition.pages', 'edition.publishers', 'edition.languages', 'edition.identifiers', 'edition.covers', 'author.display_name', 'category.label', 'publisher.display_name', 'cover_asset.object_key', 'legacy.rating', 'legacy.ratings_count')),
	CONSTRAINT "field_resolutions_state_ck" CHECK ("field_resolutions"."state" in ('present', 'missing', 'conflicting', 'stale', 'withdrawn')),
	CONSTRAINT "field_resolutions_selection_ck" CHECK ((
        "field_resolutions"."state" in ('present', 'stale')
        and "field_resolutions"."selected_observation_id" is not null
      ) or (
        "field_resolutions"."state" in ('missing', 'conflicting', 'withdrawn')
        and "field_resolutions"."selected_observation_id" is null
      )),
	CONSTRAINT "field_resolutions_nonempty_ck" CHECK (length(trim("field_resolutions"."reason")) > 0
        and length(trim("field_resolutions"."actor_ref")) > 0
        and length(trim("field_resolutions"."resolver_version")) > 0)
);
--> statement-breakpoint
CREATE TABLE "languages" (
	"tag" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	CONSTRAINT "languages_nonempty_ck" CHECK (length(trim("languages"."tag")) > 0 and length(trim("languages"."label")) > 0)
);
--> statement-breakpoint
CREATE TABLE "metadata_sources" (
	"id" text PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"terms_url" text,
	"attribution_url" text,
	"reviewed_at" bigint,
	"approval_state" text NOT NULL,
	"metadata_policy" jsonb NOT NULL,
	"asset_policy" jsonb NOT NULL,
	"payload_policy" text NOT NULL,
	"refresh_interval_ms" bigint,
	CONSTRAINT "metadata_sources_nonempty_ck" CHECK (length(trim("metadata_sources"."key")) > 0 and length(trim("metadata_sources"."name")) > 0),
	CONSTRAINT "metadata_sources_approval_state_ck" CHECK ("metadata_sources"."approval_state" in ('pending', 'approved', 'suspended', 'retired')),
	CONSTRAINT "metadata_sources_payload_policy_ck" CHECK ("metadata_sources"."payload_policy" in ('none', 'selected_fields', 'full')),
	CONSTRAINT "metadata_sources_approved_review_ck" CHECK ("metadata_sources"."approval_state" <> 'approved' or "metadata_sources"."reviewed_at" is not null),
	CONSTRAINT "metadata_sources_refresh_ck" CHECK ("metadata_sources"."refresh_interval_ms" is null or "metadata_sources"."refresh_interval_ms" > 0)
);
--> statement-breakpoint
CREATE TABLE "publishers" (
	"id" text PRIMARY KEY NOT NULL,
	"display_name" text NOT NULL,
	CONSTRAINT "publishers_name_nonempty_ck" CHECK (length(trim("publishers"."display_name")) > 0)
);
--> statement-breakpoint
CREATE TABLE "source_record_links" (
	"source_record_id" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"match_kind" text NOT NULL,
	"mapping_confidence" double precision NOT NULL,
	"state" text NOT NULL,
	"actor_ref" text,
	"reason" text,
	"created_at" bigint NOT NULL,
	CONSTRAINT "source_record_links_pk" PRIMARY KEY("source_record_id","entity_type","entity_id"),
	CONSTRAINT "source_record_links_entity_type_ck" CHECK ("source_record_links"."entity_type" in ('work', 'edition', 'author', 'category', 'publisher', 'cover_asset')),
	CONSTRAINT "source_record_links_match_kind_ck" CHECK ("source_record_links"."match_kind" in ('exact_identifier', 'source_relationship', 'curated', 'candidate')),
	CONSTRAINT "source_record_links_state_ck" CHECK ("source_record_links"."state" in ('active', 'candidate', 'rejected')),
	CONSTRAINT "source_record_links_confidence_ck" CHECK ("source_record_links"."mapping_confidence" between 0 and 1),
	CONSTRAINT "source_record_links_actor_ck" CHECK ((
        "source_record_links"."match_kind" <> 'curated' and "source_record_links"."state" <> 'rejected'
      ) or (
        length(trim("source_record_links"."actor_ref")) > 0 and length(trim("source_record_links"."reason")) > 0
      ))
);
--> statement-breakpoint
CREATE TABLE "source_records" (
	"id" text PRIMARY KEY NOT NULL,
	"source_id" text NOT NULL,
	"record_key" text NOT NULL,
	"source_revision" text,
	"source_modified_at" bigint,
	"retrieved_at" bigint NOT NULL,
	"payload_json" jsonb,
	"payload_hash" text,
	"importer_version" text,
	"source_row_hash" text,
	"state" text NOT NULL,
	CONSTRAINT "source_records_key_nonempty_ck" CHECK (length(trim("source_records"."record_key")) > 0),
	CONSTRAINT "source_records_state_ck" CHECK ("source_records"."state" in ('active', 'withdrawn', 'deleted')),
	CONSTRAINT "source_records_import_hash_ck" CHECK (("source_records"."importer_version" is null and "source_records"."source_row_hash" is null)
        or (length(trim("source_records"."importer_version")) > 0 and length("source_records"."source_row_hash") = 64))
);
--> statement-breakpoint
CREATE TABLE "work_authors" (
	"work_id" text NOT NULL,
	"author_id" text NOT NULL,
	"role" text DEFAULT 'author' NOT NULL,
	"position" integer NOT NULL,
	CONSTRAINT "work_authors_pk" PRIMARY KEY("work_id","author_id","role"),
	CONSTRAINT "work_authors_role_ck" CHECK ("work_authors"."role" in ('author', 'editor', 'translator', 'illustrator')),
	CONSTRAINT "work_authors_position_ck" CHECK ("work_authors"."position" >= 0)
);
--> statement-breakpoint
CREATE TABLE "work_categories" (
	"work_id" text NOT NULL,
	"category_id" text NOT NULL,
	"position" integer NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	CONSTRAINT "work_categories_pk" PRIMARY KEY("work_id","category_id"),
	CONSTRAINT "work_categories_position_ck" CHECK ("work_categories"."position" >= 0)
);
--> statement-breakpoint
CREATE TABLE "works" (
	"id" text PRIMARY KEY NOT NULL,
	"preferred_title" text NOT NULL,
	"sort_title" text NOT NULL,
	"description" text,
	"preferred_edition_id" text,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL,
	CONSTRAINT "works_titles_nonempty_ck" CHECK (length(trim("works"."preferred_title")) > 0 and length(trim("works"."sort_title")) > 0)
);
--> statement-breakpoint
ALTER TABLE "cover_assets" ADD CONSTRAINT "cover_assets_source_policy_id_metadata_sources_id_fk" FOREIGN KEY ("source_policy_id") REFERENCES "public"."metadata_sources"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "edition_covers" ADD CONSTRAINT "edition_covers_edition_id_editions_id_fk" FOREIGN KEY ("edition_id") REFERENCES "public"."editions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "edition_covers" ADD CONSTRAINT "edition_covers_cover_asset_id_cover_assets_id_fk" FOREIGN KEY ("cover_asset_id") REFERENCES "public"."cover_assets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "edition_identifiers" ADD CONSTRAINT "edition_identifiers_edition_id_editions_id_fk" FOREIGN KEY ("edition_id") REFERENCES "public"."editions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "edition_languages" ADD CONSTRAINT "edition_languages_edition_id_editions_id_fk" FOREIGN KEY ("edition_id") REFERENCES "public"."editions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "edition_languages" ADD CONSTRAINT "edition_languages_language_tag_languages_tag_fk" FOREIGN KEY ("language_tag") REFERENCES "public"."languages"("tag") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "edition_publishers" ADD CONSTRAINT "edition_publishers_edition_id_editions_id_fk" FOREIGN KEY ("edition_id") REFERENCES "public"."editions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "edition_publishers" ADD CONSTRAINT "edition_publishers_publisher_id_publishers_id_fk" FOREIGN KEY ("publisher_id") REFERENCES "public"."publishers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "editions" ADD CONSTRAINT "editions_work_id_works_id_fk" FOREIGN KEY ("work_id") REFERENCES "public"."works"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "field_observations" ADD CONSTRAINT "field_observations_source_record_id_source_records_id_fk" FOREIGN KEY ("source_record_id") REFERENCES "public"."source_records"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "field_resolution_heads" ADD CONSTRAINT "field_resolution_heads_resolution_id_field_resolutions_id_fk" FOREIGN KEY ("resolution_id") REFERENCES "public"."field_resolutions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "field_resolutions" ADD CONSTRAINT "field_resolutions_selected_observation_id_field_observations_id_fk" FOREIGN KEY ("selected_observation_id") REFERENCES "public"."field_observations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "field_resolutions" ADD CONSTRAINT "field_resolutions_previous_resolution_id_field_resolutions_id_fk" FOREIGN KEY ("previous_resolution_id") REFERENCES "public"."field_resolutions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_record_links" ADD CONSTRAINT "source_record_links_source_record_id_source_records_id_fk" FOREIGN KEY ("source_record_id") REFERENCES "public"."source_records"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_records" ADD CONSTRAINT "source_records_source_id_metadata_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."metadata_sources"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_authors" ADD CONSTRAINT "work_authors_work_id_works_id_fk" FOREIGN KEY ("work_id") REFERENCES "public"."works"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_authors" ADD CONSTRAINT "work_authors_author_id_authors_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."authors"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_categories" ADD CONSTRAINT "work_categories_work_id_works_id_fk" FOREIGN KEY ("work_id") REFERENCES "public"."works"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_categories" ADD CONSTRAINT "work_categories_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "works" ADD CONSTRAINT "works_preferred_edition_id_editions_id_fk" FOREIGN KEY ("preferred_edition_id") REFERENCES "public"."editions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "authors_sort_name_idx" ON "authors" USING btree ("sort_name");--> statement-breakpoint
CREATE INDEX "catalog_change_events_type_created_idx" ON "catalog_change_events" USING btree ("change_type","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "categories_slug_uq" ON "categories" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "cover_assets_object_key_uq" ON "cover_assets" USING btree ("object_key");--> statement-breakpoint
CREATE UNIQUE INDEX "edition_covers_position_uq" ON "edition_covers" USING btree ("edition_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "edition_covers_primary_uq" ON "edition_covers" USING btree ("edition_id") WHERE "edition_covers"."is_primary";--> statement-breakpoint
CREATE INDEX "edition_covers_owner_position_idx" ON "edition_covers" USING btree ("edition_id","position");--> statement-breakpoint
CREATE INDEX "edition_covers_primary_lookup_idx" ON "edition_covers" USING btree ("edition_id","is_primary");--> statement-breakpoint
CREATE UNIQUE INDEX "edition_identifiers_value_uq" ON "edition_identifiers" USING btree ("scheme","value_normalized");--> statement-breakpoint
CREATE UNIQUE INDEX "edition_identifiers_primary_uq" ON "edition_identifiers" USING btree ("edition_id") WHERE "edition_identifiers"."is_primary";--> statement-breakpoint
CREATE INDEX "edition_identifiers_owner_idx" ON "edition_identifiers" USING btree ("edition_id");--> statement-breakpoint
CREATE UNIQUE INDEX "edition_languages_position_uq" ON "edition_languages" USING btree ("edition_id","position");--> statement-breakpoint
CREATE INDEX "edition_languages_owner_position_idx" ON "edition_languages" USING btree ("edition_id","position");--> statement-breakpoint
CREATE INDEX "edition_languages_language_edition_idx" ON "edition_languages" USING btree ("language_tag","edition_id");--> statement-breakpoint
CREATE UNIQUE INDEX "edition_publishers_position_uq" ON "edition_publishers" USING btree ("edition_id","position");--> statement-breakpoint
CREATE INDEX "edition_publishers_owner_position_idx" ON "edition_publishers" USING btree ("edition_id","position");--> statement-breakpoint
CREATE INDEX "editions_work_id_idx" ON "editions" USING btree ("work_id");--> statement-breakpoint
CREATE INDEX "editions_publication_sort_work_idx" ON "editions" USING btree ("publication_sort_date","work_id");--> statement-breakpoint
CREATE INDEX "entity_aliases_target_idx" ON "entity_aliases" USING btree ("entity_type","to_id");--> statement-breakpoint
CREATE UNIQUE INDEX "field_observations_identity_uq" ON "field_observations" USING btree ("id");--> statement-breakpoint
CREATE INDEX "field_observations_source_field_state_idx" ON "field_observations" USING btree ("source_record_id","field_key","state");--> statement-breakpoint
CREATE INDEX "field_observations_target_field_idx" ON "field_observations" USING btree ("entity_type","entity_id","field_key");--> statement-breakpoint
CREATE UNIQUE INDEX "field_resolution_heads_resolution_uq" ON "field_resolution_heads" USING btree ("resolution_id");--> statement-breakpoint
CREATE INDEX "field_resolution_heads_lookup_idx" ON "field_resolution_heads" USING btree ("entity_type","entity_id","field_key");--> statement-breakpoint
CREATE INDEX "field_resolutions_target_history_idx" ON "field_resolutions" USING btree ("entity_type","entity_id","field_key","resolved_at");--> statement-breakpoint
CREATE UNIQUE INDEX "metadata_sources_key_uq" ON "metadata_sources" USING btree ("key");--> statement-breakpoint
CREATE INDEX "source_record_links_entity_idx" ON "source_record_links" USING btree ("entity_type","entity_id","state");--> statement-breakpoint
CREATE UNIQUE INDEX "source_records_source_key_uq" ON "source_records" USING btree ("source_id","record_key");--> statement-breakpoint
CREATE INDEX "source_records_refresh_idx" ON "source_records" USING btree ("source_id","state","retrieved_at");--> statement-breakpoint
CREATE UNIQUE INDEX "work_authors_position_uq" ON "work_authors" USING btree ("work_id","position");--> statement-breakpoint
CREATE INDEX "work_authors_owner_position_idx" ON "work_authors" USING btree ("work_id","position");--> statement-breakpoint
CREATE INDEX "work_authors_author_work_idx" ON "work_authors" USING btree ("author_id","work_id");--> statement-breakpoint
CREATE UNIQUE INDEX "work_categories_position_uq" ON "work_categories" USING btree ("work_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "work_categories_primary_uq" ON "work_categories" USING btree ("work_id") WHERE "work_categories"."is_primary";--> statement-breakpoint
CREATE INDEX "work_categories_owner_position_idx" ON "work_categories" USING btree ("work_id","position");--> statement-breakpoint
CREATE INDEX "work_categories_category_work_idx" ON "work_categories" USING btree ("category_id","work_id");--> statement-breakpoint
CREATE INDEX "works_sort_title_id_idx" ON "works" USING btree ("sort_title","id");--> statement-breakpoint
CREATE INDEX "works_preferred_edition_idx" ON "works" USING btree ("preferred_edition_id");
