PRAGMA defer_foreign_keys=ON;--> statement-breakpoint
CREATE TABLE `__new_field_observations` (
	`id` text PRIMARY KEY NOT NULL,
	`source_record_id` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`field_key` text NOT NULL,
	`value_json` text NOT NULL,
	`comparison_hash` text NOT NULL,
	`provenance_kind` text NOT NULL,
	`source_path` text,
	`source_modified_at` integer,
	`retrieved_at` integer NOT NULL,
	`mapping_confidence` real NOT NULL,
	`state` text NOT NULL,
	`actor_ref` text,
	`reason` text,
	`derivation_name` text,
	`derivation_version` text,
	`parent_ids_json` text,
	FOREIGN KEY (`source_record_id`) REFERENCES `source_records`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "field_observations_target_ck" CHECK("__new_field_observations"."entity_type" in ('work', 'edition', 'author', 'category', 'publisher', 'cover_asset') and "__new_field_observations"."field_key" in ('work.preferred_title', 'work.description', 'work.first_publication_date', 'work.preferred_edition', 'work.authors', 'work.categories', 'edition.title', 'edition.subtitle', 'edition.format', 'edition.publication_date', 'edition.pages', 'edition.publishers', 'edition.languages', 'edition.identifiers', 'edition.covers', 'author.display_name', 'category.label', 'publisher.display_name', 'cover_asset.object_key', 'legacy.rating', 'legacy.ratings_count')),
	CONSTRAINT "field_observations_json_ck" CHECK(json_valid("__new_field_observations"."value_json") and ("__new_field_observations"."parent_ids_json" is null or json_valid("__new_field_observations"."parent_ids_json"))),
	CONSTRAINT "field_observations_hash_ck" CHECK(length("__new_field_observations"."comparison_hash") = 64),
	CONSTRAINT "field_observations_provenance_ck" CHECK("__new_field_observations"."provenance_kind" in ('curated', 'imported', 'derived', 'synthetic')),
	CONSTRAINT "field_observations_state_ck" CHECK("__new_field_observations"."state" in ('active', 'stale', 'withdrawn', 'invalid')),
	CONSTRAINT "field_observations_confidence_ck" CHECK("__new_field_observations"."mapping_confidence" between 0 and 1),
	CONSTRAINT "field_observations_curated_ck" CHECK("__new_field_observations"."provenance_kind" <> 'curated'
        or (length(trim("__new_field_observations"."actor_ref")) > 0 and length(trim("__new_field_observations"."reason")) > 0)),
	CONSTRAINT "field_observations_derived_ck" CHECK("__new_field_observations"."provenance_kind" <> 'derived'
        or (
          length(trim("__new_field_observations"."derivation_name")) > 0
          and length(trim("__new_field_observations"."derivation_version")) > 0
          and json_valid("__new_field_observations"."parent_ids_json")
        ))
);--> statement-breakpoint
INSERT INTO `__new_field_observations` SELECT * FROM `field_observations`;--> statement-breakpoint
CREATE TABLE `__new_field_resolutions` (
	`id` text PRIMARY KEY NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`field_key` text NOT NULL,
	`selected_observation_id` text,
	`state` text NOT NULL,
	`reason` text NOT NULL,
	`previous_resolution_id` text,
	`actor_ref` text NOT NULL,
	`resolver_version` text NOT NULL,
	`resolved_at` integer NOT NULL,
	FOREIGN KEY (`selected_observation_id`) REFERENCES `__new_field_observations`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`previous_resolution_id`) REFERENCES `__new_field_resolutions`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "field_resolutions_target_ck" CHECK("__new_field_resolutions"."entity_type" in ('work', 'edition', 'author', 'category', 'publisher', 'cover_asset') and "__new_field_resolutions"."field_key" in ('work.preferred_title', 'work.description', 'work.first_publication_date', 'work.preferred_edition', 'work.authors', 'work.categories', 'edition.title', 'edition.subtitle', 'edition.format', 'edition.publication_date', 'edition.pages', 'edition.publishers', 'edition.languages', 'edition.identifiers', 'edition.covers', 'author.display_name', 'category.label', 'publisher.display_name', 'cover_asset.object_key', 'legacy.rating', 'legacy.ratings_count')),
	CONSTRAINT "field_resolutions_state_ck" CHECK("__new_field_resolutions"."state" in ('present', 'missing', 'conflicting', 'stale', 'withdrawn')),
	CONSTRAINT "field_resolutions_selection_ck" CHECK((
        "__new_field_resolutions"."state" in ('present', 'stale')
        and "__new_field_resolutions"."selected_observation_id" is not null
      ) or (
        "__new_field_resolutions"."state" in ('missing', 'conflicting', 'withdrawn')
        and "__new_field_resolutions"."selected_observation_id" is null
      )),
	CONSTRAINT "field_resolutions_nonempty_ck" CHECK(length(trim("__new_field_resolutions"."reason")) > 0
        and length(trim("__new_field_resolutions"."actor_ref")) > 0
        and length(trim("__new_field_resolutions"."resolver_version")) > 0)
);--> statement-breakpoint
INSERT INTO `__new_field_resolutions` SELECT * FROM `field_resolutions`;--> statement-breakpoint
CREATE TABLE `__new_field_resolution_heads` (
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`field_key` text NOT NULL,
	`resolution_id` text NOT NULL,
	PRIMARY KEY(`entity_type`, `entity_id`, `field_key`),
	FOREIGN KEY (`resolution_id`) REFERENCES `__new_field_resolutions`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "field_resolution_heads_target_ck" CHECK("__new_field_resolution_heads"."entity_type" in ('work', 'edition', 'author', 'category', 'publisher', 'cover_asset') and "__new_field_resolution_heads"."field_key" in ('work.preferred_title', 'work.description', 'work.first_publication_date', 'work.preferred_edition', 'work.authors', 'work.categories', 'edition.title', 'edition.subtitle', 'edition.format', 'edition.publication_date', 'edition.pages', 'edition.publishers', 'edition.languages', 'edition.identifiers', 'edition.covers', 'author.display_name', 'category.label', 'publisher.display_name', 'cover_asset.object_key', 'legacy.rating', 'legacy.ratings_count'))
);--> statement-breakpoint
INSERT INTO `__new_field_resolution_heads` SELECT * FROM `field_resolution_heads`;--> statement-breakpoint
DROP TABLE `field_resolution_heads`;--> statement-breakpoint
DROP TABLE `field_resolutions`;--> statement-breakpoint
DROP TABLE `field_observations`;--> statement-breakpoint
ALTER TABLE `__new_field_observations` RENAME TO `field_observations`;--> statement-breakpoint
ALTER TABLE `__new_field_resolutions` RENAME TO `field_resolutions`;--> statement-breakpoint
ALTER TABLE `__new_field_resolution_heads` RENAME TO `field_resolution_heads`;--> statement-breakpoint
CREATE UNIQUE INDEX `field_observations_identity_uq` ON `field_observations` (`id`);--> statement-breakpoint
CREATE INDEX `field_observations_source_field_state_idx` ON `field_observations` (`source_record_id`,`field_key`,`state`);--> statement-breakpoint
CREATE INDEX `field_observations_target_field_idx` ON `field_observations` (`entity_type`,`entity_id`,`field_key`);--> statement-breakpoint
CREATE INDEX `field_resolutions_target_history_idx` ON `field_resolutions` (`entity_type`,`entity_id`,`field_key`,`resolved_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `field_resolution_heads_resolution_uq` ON `field_resolution_heads` (`resolution_id`);--> statement-breakpoint
CREATE INDEX `field_resolution_heads_lookup_idx` ON `field_resolution_heads` (`entity_type`,`entity_id`,`field_key`);--> statement-breakpoint
ALTER TABLE `works` ADD `first_publication_date` text;--> statement-breakpoint
ALTER TABLE `works` ADD `first_publication_precision` text CONSTRAINT "works_first_publication_precision_ck" CHECK(`first_publication_precision` is null or `first_publication_precision` in ('year', 'month', 'day'));--> statement-breakpoint
ALTER TABLE `works` ADD `first_publication_sort_date` text CONSTRAINT "works_first_publication_date_ck" CHECK((
	`first_publication_date` is null
	and `first_publication_precision` is null
	and `first_publication_sort_date` is null
) or (
	`first_publication_date` is not null
	and `first_publication_precision` is not null
	and `first_publication_sort_date` is not null
	and (
		(
			`first_publication_precision` = 'year'
			and length(`first_publication_date`) = 4
			and `first_publication_sort_date` = `first_publication_date` || '-01-01'
		) or (
			`first_publication_precision` = 'month'
			and length(`first_publication_date`) = 7
			and substr(`first_publication_date`, 5, 1) = '-'
			and `first_publication_sort_date` = `first_publication_date` || '-01'
		) or (
			`first_publication_precision` = 'day'
			and length(`first_publication_date`) = 10
			and substr(`first_publication_date`, 5, 1) = '-'
			and substr(`first_publication_date`, 8, 1) = '-'
			and `first_publication_sort_date` = `first_publication_date`
		)
	)
));
