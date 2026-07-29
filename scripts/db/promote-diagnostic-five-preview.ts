import { readFileSync } from "node:fs";
import {
  APPROVED_COVER_PROPOSAL_IDS,
  DIAGNOSTIC_FIVE_COVER_APPROVAL_ID,
} from "@/db/catalog/enrichment/diagnostic-five-cover-promotion";
import {
  DIAGNOSTIC_FIVE_PROMOTION_APPROVAL,
  DIAGNOSTIC_FIVE_PROMOTION_APPROVAL_ID,
} from "@/db/catalog/enrichment/diagnostic-five-promotion";
import { promoteDiagnosticFivePostgres } from "@/db/catalog/enrichment/diagnostic-five-promotion-repository";

const required = (name: string): string => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
};

if (required("VERCEL_ENV") !== "preview") {
  throw new Error("Refusing promotion outside VERCEL_ENV=preview");
}
if (
  required("BUKIE_PREVIEW_PROMOTION_APPROVAL") !==
  DIAGNOSTIC_FIVE_COVER_APPROVAL_ID
) {
  throw new Error("Exact recorded issue #143 preview approval is required");
}
if (required("VERCEL_GIT_COMMIT_REF") !== "feat/catalog-enrichment-promotion") {
  throw new Error("Refusing promotion outside the PR #144 branch");
}

const url =
  process.env.DATABASE_URL ??
  process.env.DATABASE_URL_UNPOOLED ??
  process.env.POSTGRES_URL ??
  process.env.POSTGRES_URL_NON_POOLING;
if (!url) throw new Error("A Preview PostgreSQL URL is required");

const result = await promoteDiagnosticFivePostgres(url, {
  reportBytes: readFileSync(
    "docs/reports/catalog-enrichment-dry-run-2026-07-29.json",
  ),
  approvalId: DIAGNOSTIC_FIVE_PROMOTION_APPROVAL_ID,
  proposalIds: DIAGNOSTIC_FIVE_PROMOTION_APPROVAL.approvedProposalIds,
  coverProposalIds: APPROVED_COVER_PROPOSAL_IDS,
  actorRef: "review:github-issue-143-preview",
  executionTarget: "preview",
  previewTarget: {
    vercelEnv: "preview",
    vercelDeploymentId: required("VERCEL_DEPLOYMENT_ID"),
    gitBranch: "feat/catalog-enrichment-promotion",
    pullRequest: 144,
    neonBranchId: required("NEON_BRANCH_ID"),
    databaseHost: new URL(url).hostname,
  },
  promotedAt: Date.UTC(2026, 6, 29, 19, 0, 0),
});

console.log(
  JSON.stringify({
    changed: result.changed,
    coverProjectionCount: result.coverProjectionIds.length,
    dateResolutionCount: result.resolutionIds.length,
    publicProjectionHash: result.publicProjectionHash,
  }),
);
