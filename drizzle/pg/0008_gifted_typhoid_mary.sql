CREATE TABLE "description_candidates" (
	"id" text PRIMARY KEY NOT NULL,
	"work_id" text NOT NULL,
	"observation_id" text NOT NULL,
	"description_class" text NOT NULL,
	"text_content" text NOT NULL,
	"text_hash" text NOT NULL,
	"source_revision" text NOT NULL,
	"source_policy_version" text NOT NULL,
	"description_policy_version" text NOT NULL,
	"license_name" text,
	"license_url" text,
	"attribution_text" text,
	"derivatives_permitted" boolean,
	"editor_ref" text,
	"editorial_reason" text,
	"editorial_revision" text,
	"model_id" text,
	"model_version" text,
	"prompt_version" text,
	"generation_input_hash" text,
	"generated_at" bigint,
	"generation_duration_ms" bigint,
	"input_tokens" integer,
	"output_tokens" integer,
	"cost_microusd" bigint,
	"quality_score" double precision,
	"ambiguous_identity" boolean DEFAULT false NOT NULL,
	"sensitive_content" boolean DEFAULT false NOT NULL,
	"created_at" bigint NOT NULL,
	CONSTRAINT "description_candidates_class_ck" CHECK ("description_candidates"."description_class" in ('licensed_verbatim', 'bukie_editorial', 'model_assisted_candidate')),
	CONSTRAINT "description_candidates_text_ck" CHECK (length(trim("description_candidates"."text_content")) > 0 and length("description_candidates"."text_hash") = 64),
	CONSTRAINT "description_candidates_versions_ck" CHECK (length(trim("description_candidates"."source_revision")) > 0
        and length(trim("description_candidates"."source_policy_version")) > 0
        and length(trim("description_candidates"."description_policy_version")) > 0),
	CONSTRAINT "description_candidates_license_ck" CHECK ((
        "description_candidates"."description_class" = 'licensed_verbatim'
        and length(trim("description_candidates"."license_name")) > 0
        and length(trim("description_candidates"."license_url")) > 0
        and "description_candidates"."derivatives_permitted" is not null
      ) or (
        "description_candidates"."description_class" <> 'licensed_verbatim'
        and "description_candidates"."license_name" is null
        and "description_candidates"."license_url" is null
        and "description_candidates"."attribution_text" is null
        and "description_candidates"."derivatives_permitted" is null
      )),
	CONSTRAINT "description_candidates_editorial_ck" CHECK ((
        "description_candidates"."description_class" = 'bukie_editorial'
        and length(trim("description_candidates"."editor_ref")) > 0
        and length(trim("description_candidates"."editorial_reason")) > 0
        and length(trim("description_candidates"."editorial_revision")) > 0
      ) or (
        "description_candidates"."description_class" <> 'bukie_editorial'
        and "description_candidates"."editor_ref" is null
        and "description_candidates"."editorial_reason" is null
        and "description_candidates"."editorial_revision" is null
      )),
	CONSTRAINT "description_candidates_model_ck" CHECK ((
        "description_candidates"."description_class" = 'model_assisted_candidate'
        and length(trim("description_candidates"."model_id")) > 0
        and length(trim("description_candidates"."model_version")) > 0
        and length(trim("description_candidates"."prompt_version")) > 0
        and length("description_candidates"."generation_input_hash") = 64
        and "description_candidates"."generated_at" is not null
        and "description_candidates"."generation_duration_ms" >= 0
        and "description_candidates"."input_tokens" >= 0
        and "description_candidates"."output_tokens" >= 0
        and "description_candidates"."cost_microusd" >= 0
      ) or (
        "description_candidates"."description_class" <> 'model_assisted_candidate'
        and "description_candidates"."model_id" is null
        and "description_candidates"."model_version" is null
        and "description_candidates"."prompt_version" is null
        and "description_candidates"."generation_input_hash" is null
        and "description_candidates"."generated_at" is null
        and "description_candidates"."generation_duration_ms" is null
        and "description_candidates"."input_tokens" is null
        and "description_candidates"."output_tokens" is null
        and "description_candidates"."cost_microusd" is null
      )),
	CONSTRAINT "description_candidates_quality_ck" CHECK ("description_candidates"."quality_score" is null or "description_candidates"."quality_score" between 0 and 100)
);
--> statement-breakpoint
CREATE TABLE "description_claim_evidence" (
	"claim_id" text NOT NULL,
	"observation_id" text NOT NULL,
	CONSTRAINT "description_claim_evidence_pk" PRIMARY KEY("claim_id","observation_id")
);
--> statement-breakpoint
CREATE TABLE "description_claims" (
	"id" text PRIMARY KEY NOT NULL,
	"candidate_id" text NOT NULL,
	"position" integer NOT NULL,
	"claim_text" text NOT NULL,
	"claim_hash" text NOT NULL,
	CONSTRAINT "description_claims_content_ck" CHECK ("description_claims"."position" >= 0
        and length(trim("description_claims"."claim_text")) > 0
        and length("description_claims"."claim_hash") = 64)
);
--> statement-breakpoint
CREATE TABLE "description_decision_heads" (
	"candidate_id" text PRIMARY KEY NOT NULL,
	"decision_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "description_decisions" (
	"id" text PRIMARY KEY NOT NULL,
	"candidate_id" text NOT NULL,
	"state" text NOT NULL,
	"rejection_codes_json" jsonb NOT NULL,
	"warning_codes_json" jsonb NOT NULL,
	"reviewer_ref" text,
	"review_reason" text,
	"previous_decision_id" text,
	"policy_version" text NOT NULL,
	"decided_at" bigint NOT NULL,
	CONSTRAINT "description_decisions_state_ck" CHECK ("description_decisions"."state" in ('candidate', 'review_required', 'paused', 'rejected', 'eligible', 'withdrawn', 'invalidated')),
	CONSTRAINT "description_decisions_review_ck" CHECK (("description_decisions"."reviewer_ref" is null and "description_decisions"."review_reason" is null)
        or (
          length(trim("description_decisions"."reviewer_ref")) > 0
          and length(trim("description_decisions"."review_reason")) > 0
        )),
	CONSTRAINT "description_decisions_policy_ck" CHECK (length(trim("description_decisions"."policy_version")) > 0)
);
--> statement-breakpoint
CREATE TABLE "description_projection_heads" (
	"work_id" text PRIMARY KEY NOT NULL,
	"projection_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "description_projections" (
	"id" text PRIMARY KEY NOT NULL,
	"work_id" text NOT NULL,
	"candidate_id" text,
	"state" text NOT NULL,
	"previous_projection_id" text,
	"reason_code" text NOT NULL,
	"actor_ref" text NOT NULL,
	"policy_version" text NOT NULL,
	"projected_at" bigint NOT NULL,
	CONSTRAINT "description_projections_state_ck" CHECK ("description_projections"."state" in ('selected', 'withdrawn', 'invalidated', 'rolled_back')),
	CONSTRAINT "description_projections_selection_ck" CHECK (("description_projections"."state" in ('selected', 'rolled_back') and "description_projections"."candidate_id" is not null)
        or ("description_projections"."state" in ('withdrawn', 'invalidated') and "description_projections"."candidate_id" is null)),
	CONSTRAINT "description_projections_nonempty_ck" CHECK (length(trim("description_projections"."reason_code")) > 0
        and length(trim("description_projections"."actor_ref")) > 0
        and length(trim("description_projections"."policy_version")) > 0)
);
--> statement-breakpoint
CREATE TABLE "description_review_queue" (
	"candidate_id" text PRIMARY KEY NOT NULL,
	"state" text NOT NULL,
	"priority" integer NOT NULL,
	"reason_codes_json" jsonb NOT NULL,
	"queued_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL,
	"reviewer_ref" text,
	CONSTRAINT "description_review_queue_state_ck" CHECK ("description_review_queue"."state" in ('queued', 'claimed', 'completed', 'cancelled')),
	CONSTRAINT "description_review_queue_values_ck" CHECK ("description_review_queue"."priority" >= 0
        and ("description_review_queue"."reviewer_ref" is null or length(trim("description_review_queue"."reviewer_ref")) > 0))
);
--> statement-breakpoint
ALTER TABLE "description_candidates" ADD CONSTRAINT "description_candidates_work_id_works_id_fk" FOREIGN KEY ("work_id") REFERENCES "public"."works"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "description_candidates" ADD CONSTRAINT "description_candidates_observation_id_field_observations_id_fk" FOREIGN KEY ("observation_id") REFERENCES "public"."field_observations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "description_claim_evidence" ADD CONSTRAINT "description_claim_evidence_claim_id_description_claims_id_fk" FOREIGN KEY ("claim_id") REFERENCES "public"."description_claims"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "description_claim_evidence" ADD CONSTRAINT "description_claim_evidence_observation_id_field_observations_id_fk" FOREIGN KEY ("observation_id") REFERENCES "public"."field_observations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "description_claims" ADD CONSTRAINT "description_claims_candidate_id_description_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."description_candidates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "description_decision_heads" ADD CONSTRAINT "description_decision_heads_candidate_id_description_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."description_candidates"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "description_decision_heads" ADD CONSTRAINT "description_decision_heads_decision_id_description_decisions_id_fk" FOREIGN KEY ("decision_id") REFERENCES "public"."description_decisions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "description_decisions" ADD CONSTRAINT "description_decisions_candidate_id_description_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."description_candidates"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "description_decisions" ADD CONSTRAINT "description_decisions_previous_decision_id_description_decisions_id_fk" FOREIGN KEY ("previous_decision_id") REFERENCES "public"."description_decisions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "description_projection_heads" ADD CONSTRAINT "description_projection_heads_work_id_works_id_fk" FOREIGN KEY ("work_id") REFERENCES "public"."works"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "description_projection_heads" ADD CONSTRAINT "description_projection_heads_projection_id_description_projections_id_fk" FOREIGN KEY ("projection_id") REFERENCES "public"."description_projections"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "description_projections" ADD CONSTRAINT "description_projections_work_id_works_id_fk" FOREIGN KEY ("work_id") REFERENCES "public"."works"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "description_projections" ADD CONSTRAINT "description_projections_candidate_id_description_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."description_candidates"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "description_projections" ADD CONSTRAINT "description_projections_previous_projection_id_description_projections_id_fk" FOREIGN KEY ("previous_projection_id") REFERENCES "public"."description_projections"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "description_review_queue" ADD CONSTRAINT "description_review_queue_candidate_id_description_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."description_candidates"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "description_candidates_observation_uq" ON "description_candidates" USING btree ("observation_id");--> statement-breakpoint
CREATE INDEX "description_candidates_work_created_idx" ON "description_candidates" USING btree ("work_id","created_at");--> statement-breakpoint
CREATE INDEX "description_claim_evidence_observation_idx" ON "description_claim_evidence" USING btree ("observation_id");--> statement-breakpoint
CREATE UNIQUE INDEX "description_claims_position_uq" ON "description_claims" USING btree ("candidate_id","position");--> statement-breakpoint
CREATE INDEX "description_claims_candidate_idx" ON "description_claims" USING btree ("candidate_id");--> statement-breakpoint
CREATE UNIQUE INDEX "description_decision_heads_decision_uq" ON "description_decision_heads" USING btree ("decision_id");--> statement-breakpoint
CREATE INDEX "description_decisions_candidate_history_idx" ON "description_decisions" USING btree ("candidate_id","decided_at");--> statement-breakpoint
CREATE UNIQUE INDEX "description_projection_heads_projection_uq" ON "description_projection_heads" USING btree ("projection_id");--> statement-breakpoint
CREATE INDEX "description_projections_work_history_idx" ON "description_projections" USING btree ("work_id","projected_at");--> statement-breakpoint
CREATE INDEX "description_review_queue_active_idx" ON "description_review_queue" USING btree ("state","priority","queued_at");