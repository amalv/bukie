PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_description_candidates` (
	`id` text PRIMARY KEY NOT NULL,
	`work_id` text NOT NULL,
	`observation_id` text NOT NULL,
	`description_class` text NOT NULL,
	`text_content` text NOT NULL,
	`text_hash` text NOT NULL,
	`source_revision` text NOT NULL,
	`source_policy_version` text NOT NULL,
	`description_policy_version` text NOT NULL,
	`license_name` text,
	`license_url` text,
	`attribution_text` text,
	`derivatives_permitted` integer,
	`licensed_source_text_hash` text,
	`licensed_text_transformed` integer,
	`editor_ref` text,
	`editorial_reason` text,
	`editorial_revision` text,
	`model_id` text,
	`model_version` text,
	`prompt_version` text,
	`generation_input_hash` text,
	`generated_at` integer,
	`generation_duration_ms` integer,
	`input_tokens` integer,
	`output_tokens` integer,
	`cost_microusd` integer,
	`quality_score` real,
	`ambiguous_identity` integer DEFAULT false NOT NULL,
	`sensitive_content` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`work_id`) REFERENCES `works`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`observation_id`) REFERENCES `field_observations`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "description_candidates_class_ck" CHECK("__new_description_candidates"."description_class" in ('licensed_verbatim', 'bukie_editorial', 'model_assisted_candidate')),
	CONSTRAINT "description_candidates_text_ck" CHECK(length(trim("__new_description_candidates"."text_content")) > 0 and length("__new_description_candidates"."text_hash") = 64),
	CONSTRAINT "description_candidates_versions_ck" CHECK(length(trim("__new_description_candidates"."source_revision")) > 0
        and length(trim("__new_description_candidates"."source_policy_version")) > 0
        and length(trim("__new_description_candidates"."description_policy_version")) > 0),
	CONSTRAINT "description_candidates_license_ck" CHECK((
        "__new_description_candidates"."description_class" = 'licensed_verbatim'
        and length(trim("__new_description_candidates"."license_name")) > 0
        and length(trim("__new_description_candidates"."license_url")) > 0
        and "__new_description_candidates"."derivatives_permitted" is not null
        and length("__new_description_candidates"."licensed_source_text_hash") = 64
        and "__new_description_candidates"."licensed_text_transformed" is not null
      ) or (
        "__new_description_candidates"."description_class" <> 'licensed_verbatim'
        and "__new_description_candidates"."license_name" is null
        and "__new_description_candidates"."license_url" is null
        and "__new_description_candidates"."attribution_text" is null
        and "__new_description_candidates"."derivatives_permitted" is null
        and "__new_description_candidates"."licensed_source_text_hash" is null
        and "__new_description_candidates"."licensed_text_transformed" is null
      )),
	CONSTRAINT "description_candidates_editorial_ck" CHECK((
        "__new_description_candidates"."description_class" = 'bukie_editorial'
        and length(trim("__new_description_candidates"."editor_ref")) > 0
        and length(trim("__new_description_candidates"."editorial_reason")) > 0
        and length(trim("__new_description_candidates"."editorial_revision")) > 0
      ) or (
        "__new_description_candidates"."description_class" <> 'bukie_editorial'
        and "__new_description_candidates"."editor_ref" is null
        and "__new_description_candidates"."editorial_reason" is null
        and "__new_description_candidates"."editorial_revision" is null
      )),
	CONSTRAINT "description_candidates_model_ck" CHECK((
        "__new_description_candidates"."description_class" = 'model_assisted_candidate'
        and length(trim("__new_description_candidates"."model_id")) > 0
        and length(trim("__new_description_candidates"."model_version")) > 0
        and length(trim("__new_description_candidates"."prompt_version")) > 0
        and length("__new_description_candidates"."generation_input_hash") = 64
        and "__new_description_candidates"."generated_at" is not null
        and "__new_description_candidates"."generation_duration_ms" >= 0
        and "__new_description_candidates"."input_tokens" >= 0
        and "__new_description_candidates"."output_tokens" >= 0
        and "__new_description_candidates"."cost_microusd" >= 0
      ) or (
        "__new_description_candidates"."description_class" <> 'model_assisted_candidate'
        and "__new_description_candidates"."model_id" is null
        and "__new_description_candidates"."model_version" is null
        and "__new_description_candidates"."prompt_version" is null
        and "__new_description_candidates"."generation_input_hash" is null
        and "__new_description_candidates"."generated_at" is null
        and "__new_description_candidates"."generation_duration_ms" is null
        and "__new_description_candidates"."input_tokens" is null
        and "__new_description_candidates"."output_tokens" is null
        and "__new_description_candidates"."cost_microusd" is null
      )),
	CONSTRAINT "description_candidates_quality_ck" CHECK("__new_description_candidates"."quality_score" is null or "__new_description_candidates"."quality_score" between 0 and 100)
);
--> statement-breakpoint
INSERT INTO `__new_description_candidates`("id", "work_id", "observation_id", "description_class", "text_content", "text_hash", "source_revision", "source_policy_version", "description_policy_version", "license_name", "license_url", "attribution_text", "derivatives_permitted", "licensed_source_text_hash", "licensed_text_transformed", "editor_ref", "editorial_reason", "editorial_revision", "model_id", "model_version", "prompt_version", "generation_input_hash", "generated_at", "generation_duration_ms", "input_tokens", "output_tokens", "cost_microusd", "quality_score", "ambiguous_identity", "sensitive_content", "created_at") SELECT "id", "work_id", "observation_id", "description_class", "text_content", "text_hash", "source_revision", "source_policy_version", "description_policy_version", "license_name", "license_url", "attribution_text", "derivatives_permitted", case when "description_class" = 'licensed_verbatim' then "text_hash" else null end, case when "description_class" = 'licensed_verbatim' then 0 else null end, "editor_ref", "editorial_reason", "editorial_revision", "model_id", "model_version", "prompt_version", "generation_input_hash", "generated_at", "generation_duration_ms", "input_tokens", "output_tokens", "cost_microusd", "quality_score", "ambiguous_identity", "sensitive_content", "created_at" FROM `description_candidates`;--> statement-breakpoint
DROP TABLE `description_candidates`;--> statement-breakpoint
ALTER TABLE `__new_description_candidates` RENAME TO `description_candidates`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `description_candidates_observation_uq` ON `description_candidates` (`observation_id`);--> statement-breakpoint
CREATE INDEX `description_candidates_work_created_idx` ON `description_candidates` (`work_id`,`created_at`);
