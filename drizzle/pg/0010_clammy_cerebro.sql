CREATE TABLE "cover_candidates" (
	"id" text PRIMARY KEY NOT NULL,
	"work_id" text NOT NULL,
	"edition_id" text,
	"source_record_id" text NOT NULL,
	"representation_type" text NOT NULL,
	"identity_match_kind" text NOT NULL,
	"identity_evidence_json" jsonb NOT NULL,
	"permission_state" text NOT NULL,
	"rights_basis" text,
	"attribution_text" text,
	"attribution_url" text,
	"source_url" text NOT NULL,
	"source_revision" text NOT NULL,
	"source_policy_version" text NOT NULL,
	"object_key" text NOT NULL,
	"transformation_history_json" jsonb NOT NULL,
	"created_at" bigint NOT NULL,
	CONSTRAINT "cover_candidates_representation_ck" CHECK ("cover_candidates"."representation_type" in ('selected_edition', 'work_representative')
        and (
          ("cover_candidates"."representation_type" = 'selected_edition' and "cover_candidates"."edition_id" is not null)
          or ("cover_candidates"."representation_type" = 'work_representative' and "cover_candidates"."edition_id" is null)
        )),
	CONSTRAINT "cover_candidates_identity_ck" CHECK ("cover_candidates"."identity_match_kind" in ('exact_isbn', 'provider_edition_relation', 'approved_strong_edition_tuple', 'provider_work_relation', 'curated_work_relation', 'title_creator_candidate', 'conflicting')),
	CONSTRAINT "cover_candidates_permission_ck" CHECK ("cover_candidates"."permission_state" in ('approved', 'pending', 'denied')),
	CONSTRAINT "cover_candidates_nonempty_ck" CHECK (length(trim("cover_candidates"."source_url")) > 0
        and length(trim("cover_candidates"."source_revision")) > 0
        and length(trim("cover_candidates"."source_policy_version")) > 0
        and length(trim("cover_candidates"."object_key")) > 0
        and substring("cover_candidates"."object_key" from 1 for 8) = '/covers/')
);
--> statement-breakpoint
CREATE TABLE "cover_decision_heads" (
	"candidate_id" text PRIMARY KEY NOT NULL,
	"decision_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cover_decisions" (
	"id" text PRIMARY KEY NOT NULL,
	"candidate_id" text NOT NULL,
	"inspection_id" text NOT NULL,
	"state" text NOT NULL,
	"gate_codes_json" jsonb NOT NULL,
	"warning_codes_json" jsonb NOT NULL,
	"reviewer_ref" text,
	"review_reason" text,
	"purge_state" text NOT NULL,
	"previous_decision_id" text,
	"policy_version" text NOT NULL,
	"decided_at" bigint NOT NULL,
	CONSTRAINT "cover_decisions_state_ck" CHECK ("cover_decisions"."state" in ('review_required', 'eligible', 'rejected', 'withdrawn')),
	CONSTRAINT "cover_decisions_purge_ck" CHECK ("cover_decisions"."purge_state" in ('not_required', 'pending', 'completed', 'failed')),
	CONSTRAINT "cover_decisions_review_ck" CHECK (("cover_decisions"."reviewer_ref" is null and "cover_decisions"."review_reason" is null)
        or (
          length(trim("cover_decisions"."reviewer_ref")) > 0
          and length(trim("cover_decisions"."review_reason")) > 0
        )),
	CONSTRAINT "cover_decisions_policy_ck" CHECK (length(trim("cover_decisions"."policy_version")) > 0)
);
--> statement-breakpoint
CREATE TABLE "cover_inspections" (
	"id" text PRIMARY KEY NOT NULL,
	"candidate_id" text NOT NULL,
	"media_type" text,
	"byte_size" bigint NOT NULL,
	"width" integer,
	"height" integer,
	"aspect_ratio" double precision,
	"checksum" text NOT NULL,
	"decode_result" text NOT NULL,
	"flags_json" jsonb NOT NULL,
	"quality_score" double precision NOT NULL,
	"duplicate_of_candidate_id" text,
	"inspection_version" text NOT NULL,
	"inspected_at" bigint NOT NULL,
	CONSTRAINT "cover_inspections_decode_ck" CHECK ("cover_inspections"."decode_result" in ('decoded', 'corrupt', 'unsupported')
        and (
          ("cover_inspections"."decode_result" = 'decoded'
            and "cover_inspections"."media_type" is not null
            and "cover_inspections"."width" > 0
            and "cover_inspections"."height" > 0
            and "cover_inspections"."aspect_ratio" > 0)
          or ("cover_inspections"."decode_result" <> 'decoded'
            and "cover_inspections"."width" is null
            and "cover_inspections"."height" is null
            and "cover_inspections"."aspect_ratio" is null)
        )),
	CONSTRAINT "cover_inspections_values_ck" CHECK ("cover_inspections"."byte_size" > 0
        and length("cover_inspections"."checksum") = 64
        and "cover_inspections"."quality_score" between 0 and 100
        and length(trim("cover_inspections"."inspection_version")) > 0)
);
--> statement-breakpoint
CREATE TABLE "cover_projection_heads" (
	"work_id" text PRIMARY KEY NOT NULL,
	"projection_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cover_projections" (
	"id" text PRIMARY KEY NOT NULL,
	"work_id" text NOT NULL,
	"candidate_id" text,
	"state" text NOT NULL,
	"previous_projection_id" text,
	"reason_code" text NOT NULL,
	"actor_ref" text NOT NULL,
	"policy_version" text NOT NULL,
	"projected_at" bigint NOT NULL,
	CONSTRAINT "cover_projections_state_ck" CHECK ("cover_projections"."state" in ('selected', 'placeholder', 'withdrawn', 'rolled_back')),
	CONSTRAINT "cover_projections_selection_ck" CHECK (("cover_projections"."state" in ('selected', 'rolled_back') and "cover_projections"."candidate_id" is not null)
        or ("cover_projections"."state" in ('placeholder', 'withdrawn') and "cover_projections"."candidate_id" is null)),
	CONSTRAINT "cover_projections_nonempty_ck" CHECK (length(trim("cover_projections"."reason_code")) > 0
        and length(trim("cover_projections"."actor_ref")) > 0
        and length(trim("cover_projections"."policy_version")) > 0)
);
--> statement-breakpoint
ALTER TABLE "cover_candidates" ADD CONSTRAINT "cover_candidates_work_id_works_id_fk" FOREIGN KEY ("work_id") REFERENCES "public"."works"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cover_candidates" ADD CONSTRAINT "cover_candidates_edition_id_editions_id_fk" FOREIGN KEY ("edition_id") REFERENCES "public"."editions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cover_candidates" ADD CONSTRAINT "cover_candidates_source_record_id_source_records_id_fk" FOREIGN KEY ("source_record_id") REFERENCES "public"."source_records"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cover_decision_heads" ADD CONSTRAINT "cover_decision_heads_candidate_id_cover_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."cover_candidates"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cover_decision_heads" ADD CONSTRAINT "cover_decision_heads_decision_id_cover_decisions_id_fk" FOREIGN KEY ("decision_id") REFERENCES "public"."cover_decisions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cover_decisions" ADD CONSTRAINT "cover_decisions_candidate_id_cover_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."cover_candidates"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cover_decisions" ADD CONSTRAINT "cover_decisions_inspection_id_cover_inspections_id_fk" FOREIGN KEY ("inspection_id") REFERENCES "public"."cover_inspections"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cover_decisions" ADD CONSTRAINT "cover_decisions_previous_decision_id_cover_decisions_id_fk" FOREIGN KEY ("previous_decision_id") REFERENCES "public"."cover_decisions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cover_inspections" ADD CONSTRAINT "cover_inspections_candidate_id_cover_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."cover_candidates"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cover_inspections" ADD CONSTRAINT "cover_inspections_duplicate_of_candidate_id_cover_candidates_id_fk" FOREIGN KEY ("duplicate_of_candidate_id") REFERENCES "public"."cover_candidates"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cover_projection_heads" ADD CONSTRAINT "cover_projection_heads_work_id_works_id_fk" FOREIGN KEY ("work_id") REFERENCES "public"."works"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cover_projection_heads" ADD CONSTRAINT "cover_projection_heads_projection_id_cover_projections_id_fk" FOREIGN KEY ("projection_id") REFERENCES "public"."cover_projections"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cover_projections" ADD CONSTRAINT "cover_projections_work_id_works_id_fk" FOREIGN KEY ("work_id") REFERENCES "public"."works"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cover_projections" ADD CONSTRAINT "cover_projections_candidate_id_cover_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."cover_candidates"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cover_projections" ADD CONSTRAINT "cover_projections_previous_projection_id_cover_projections_id_fk" FOREIGN KEY ("previous_projection_id") REFERENCES "public"."cover_projections"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cover_candidates_work_created_idx" ON "cover_candidates" USING btree ("work_id","created_at");--> statement-breakpoint
CREATE INDEX "cover_candidates_source_record_idx" ON "cover_candidates" USING btree ("source_record_id");--> statement-breakpoint
CREATE UNIQUE INDEX "cover_decision_heads_decision_uq" ON "cover_decision_heads" USING btree ("decision_id");--> statement-breakpoint
CREATE INDEX "cover_decisions_candidate_history_idx" ON "cover_decisions" USING btree ("candidate_id","decided_at");--> statement-breakpoint
CREATE UNIQUE INDEX "cover_inspections_identity_uq" ON "cover_inspections" USING btree ("candidate_id","checksum","inspection_version");--> statement-breakpoint
CREATE INDEX "cover_inspections_checksum_idx" ON "cover_inspections" USING btree ("checksum");--> statement-breakpoint
CREATE INDEX "cover_inspections_candidate_idx" ON "cover_inspections" USING btree ("candidate_id");--> statement-breakpoint
CREATE UNIQUE INDEX "cover_projection_heads_projection_uq" ON "cover_projection_heads" USING btree ("projection_id");--> statement-breakpoint
CREATE INDEX "cover_projections_work_history_idx" ON "cover_projections" USING btree ("work_id","projected_at");