import { hashCanonicalJson } from "../../identity";
import type {
  DescriptionCandidateInput,
  DescriptionParentEvidence,
  DescriptionRejectionCode,
  DescriptionValidationResult,
  DescriptionWarningCode,
} from "./types";

const PROMOTIONAL_PATTERNS = [
  /\b(must[- ]read|masterpiece|unforgettable|best[- ]selling)\b/i,
  /\b(gripping|stunning|incredible|perfect|brilliant)\b/i,
  /\byou(?:'ll| will) (?:love|discover|experience)\b/i,
  /\bthe (?:best|greatest|most important)\b/i,
];

const SPOILER_PATTERNS = [
  /\b(?:dies|is killed|kills (?:himself|herself|themself))\b/i,
  /\bthe (?:killer|murderer|traitor) is\b/i,
  /\b(?:turns out|is revealed) to be\b/i,
  /\b(?:ends|concludes) with\b/i,
  /\bultimately (?:defeats|escapes|marries|returns|wins)\b/i,
];

const normalizeText = (value: string): string =>
  value
    .normalize("NFKC")
    .toLocaleLowerCase("en")
    .replace(/[^\p{L}\p{N}'-]+/gu, " ")
    .trim();

const words = (value: string): string[] =>
  normalizeText(value).split(/\s+/).filter(Boolean);

const syllables = (word: string): number => {
  const normalized = word
    .toLocaleLowerCase("en")
    .replace(/(?:es|ed|e)$/u, "")
    .replace(/^y/u, "");
  return Math.max(1, normalized.match(/[aeiouy]+/gu)?.length ?? 1);
};

export const descriptionReadability = (text: string): number => {
  const tokens = words(text);
  const sentences = Math.max(
    1,
    text.split(/[.!?]+/u).filter((sentence) => sentence.trim()).length,
  );
  const syllableCount = tokens.reduce(
    (total, token) => total + syllables(token),
    0,
  );
  if (tokens.length === 0) return 0;
  return Number(
    (
      206.835 -
      1.015 * (tokens.length / sentences) -
      84.6 * (syllableCount / tokens.length)
    ).toFixed(2),
  );
};

const ngrams = (tokens: readonly string[], length: number): Set<string> => {
  const values = new Set<string>();
  for (let index = 0; index <= tokens.length - length; index += 1) {
    values.add(tokens.slice(index, index + length).join(" "));
  }
  return values;
};

const intersects = (left: Set<string>, right: Set<string>): boolean => {
  for (const value of left) {
    if (right.has(value)) return true;
  }
  return false;
};

const jaccard = (left: Set<string>, right: Set<string>): number => {
  if (left.size === 0 || right.size === 0) return 0;
  let intersection = 0;
  for (const value of left) {
    if (right.has(value)) intersection += 1;
  }
  return intersection / (left.size + right.size - intersection);
};

const copyingSignals = (
  candidateText: string,
  comparisonTexts: readonly string[],
): { exactEight: boolean; highSimilarity: boolean } => {
  const candidateWords = words(candidateText);
  const candidateEight = ngrams(candidateWords, 8);
  const candidateTwenty = ngrams(candidateWords, 20);
  const candidateFive = ngrams(candidateWords, 5);
  let exactEight = false;
  let highSimilarity = false;
  for (const text of comparisonTexts) {
    const sourceWords = words(text);
    exactEight ||= intersects(candidateEight, ngrams(sourceWords, 8));
    highSimilarity ||=
      intersects(candidateTwenty, ngrams(sourceWords, 20)) ||
      jaccard(candidateFive, ngrams(sourceWords, 5)) >= 0.5;
  }
  return { exactEight, highSimilarity };
};

const add = <T extends string>(values: T[], value: T): void => {
  if (!values.includes(value)) values.push(value);
};

const isNonempty = (value: string | null | undefined): boolean =>
  Boolean(value?.trim());

const provenanceRejections = (
  input: DescriptionCandidateInput,
): DescriptionRejectionCode[] => {
  const result: DescriptionRejectionCode[] = [];
  if (input.descriptionClass === "licensed_verbatim") {
    const license = input.license;
    if (
      !isNonempty(license.name) ||
      !isNonempty(license.url) ||
      !isNonempty(license.sourceText)
    ) {
      add(result, "licensed_provenance_incomplete");
    }
    if (
      license.transformed &&
      (!license.derivativesPermitted ||
        normalizeText(license.sourceText) !== normalizeText(input.text))
    ) {
      add(result, "licensed_derivative_not_permitted");
    }
    if (
      !license.transformed &&
      normalizeText(license.sourceText) !== normalizeText(input.text)
    ) {
      add(result, "licensed_derivative_not_permitted");
    }
  } else if (input.descriptionClass === "bukie_editorial") {
    if (
      !isNonempty(input.editorial.editorRef) ||
      !isNonempty(input.editorial.reason) ||
      !isNonempty(input.editorial.revision)
    ) {
      add(result, "editorial_provenance_incomplete");
    }
  } else {
    const model = input.model;
    if (
      !isNonempty(model.modelId) ||
      !isNonempty(model.modelVersion) ||
      !isNonempty(model.promptVersion) ||
      !Number.isSafeInteger(model.generatedAt) ||
      !Number.isSafeInteger(model.generationDurationMs) ||
      model.generationDurationMs < 0 ||
      !Number.isSafeInteger(model.inputTokens) ||
      model.inputTokens < 0 ||
      !Number.isSafeInteger(model.outputTokens) ||
      model.outputTokens < 0 ||
      !Number.isSafeInteger(model.costMicrousd) ||
      model.costMicrousd < 0
    ) {
      add(result, "model_provenance_incomplete");
    }
  }
  return result;
};

export const validateDescriptionCandidate = (input: {
  candidate: DescriptionCandidateInput;
  parents: readonly DescriptionParentEvidence[];
}): DescriptionValidationResult => {
  const { candidate } = input;
  const parentById = new Map(
    input.parents.map((parent) => [parent.id, parent]),
  );
  const rejectionCodes = provenanceRejections(candidate);
  const warningCodes: DescriptionWarningCode[] = [];
  const wordCount = words(candidate.text).length;
  const readabilityScore = descriptionReadability(candidate.text);
  const minimumWords =
    candidate.descriptionClass === "licensed_verbatim" ? 40 : 80;
  const maximumWords =
    candidate.descriptionClass === "licensed_verbatim" ? 250 : 140;
  if (wordCount < minimumWords || wordCount > maximumWords) {
    add(rejectionCodes, "length_out_of_range");
  }
  if (readabilityScore < 20 || readabilityScore > 105) {
    add(rejectionCodes, "readability_out_of_range");
  } else if (readabilityScore < 40 || readabilityScore > 90) {
    add(warningCodes, "readability_borderline");
  }
  if (PROMOTIONAL_PATTERNS.some((pattern) => pattern.test(candidate.text))) {
    add(rejectionCodes, "tone_non_neutral");
  }
  if (SPOILER_PATTERNS.some((pattern) => pattern.test(candidate.text))) {
    add(rejectionCodes, "spoiler_risk");
  }

  const referencedIds = new Set<string>();
  for (const claim of candidate.claims) {
    if (claim.parentObservationIds.length === 0) {
      add(rejectionCodes, "claim_unsupported");
      continue;
    }
    for (const parentId of claim.parentObservationIds) {
      referencedIds.add(parentId);
      const parent = parentById.get(parentId);
      if (!parent) {
        add(rejectionCodes, "claim_unsupported");
        continue;
      }
      if (!parent.eligible) {
        add(rejectionCodes, "parent_evidence_ineligible");
      }
      if (parent.workId !== candidate.workId) {
        add(rejectionCodes, "identity_mismatch");
      }
      if (parent.unresolvedConflict) {
        add(rejectionCodes, "evidence_conflict_unresolved");
      }
    }
  }
  if (
    candidate.descriptionClass !== "licensed_verbatim" &&
    (candidate.claims.length < 2 || referencedIds.size < 2)
  ) {
    add(rejectionCodes, "specificity_insufficient");
  } else if (referencedIds.size < 3) {
    add(warningCodes, "sparse_evidence_review");
  }

  if (candidate.descriptionClass !== "licensed_verbatim") {
    const comparisonTexts = [
      ...candidate.comparisonTexts,
      ...input.parents
        .map((parent) => parent.sourceText)
        .filter((text): text is string => Boolean(text)),
    ];
    const copying = copyingSignals(candidate.text, comparisonTexts);
    if (copying.highSimilarity) {
      add(rejectionCodes, "copying_similarity_high");
    } else if (copying.exactEight) {
      add(warningCodes, "copying_exact_eight_word_match");
    }
  }
  if (candidate.ambiguousIdentity) {
    add(warningCodes, "ambiguous_identity_review");
  }
  if (candidate.sensitiveContent) {
    add(warningCodes, "sensitive_content_review");
  }
  if (candidate.descriptionClass === "model_assisted_candidate") {
    add(warningCodes, "initial_model_review");
  }
  if (candidate.descriptionClass === "bukie_editorial") {
    add(warningCodes, "editorial_review");
  }

  rejectionCodes.sort();
  warningCodes.sort();
  const qualityScore = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        100 -
          rejectionCodes.length * 20 -
          warningCodes.length * 4 -
          Math.abs(60 - readabilityScore) / 3,
      ),
    ),
  );
  return {
    rejectionCodes,
    warningCodes,
    requiresHumanReview: rejectionCodes.length === 0 && warningCodes.length > 0,
    wordCount,
    readabilityScore,
    qualityScore,
  };
};

export const descriptionGenerationInputHash = (
  input: DescriptionCandidateInput,
): string =>
  hashCanonicalJson({
    claims: input.claims,
    descriptionPolicyVersion: input.descriptionPolicyVersion,
    parentObservationIds: [
      ...new Set(input.claims.flatMap((claim) => claim.parentObservationIds)),
    ].sort(),
    sourcePolicyVersion: input.sourcePolicyVersion,
    ...(input.descriptionClass === "model_assisted_candidate"
      ? {
          modelId: input.model.modelId,
          modelVersion: input.model.modelVersion,
          promptVersion: input.model.promptVersion,
        }
      : {}),
  });
