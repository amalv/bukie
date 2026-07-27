/**
 * Frozen input shape for the legacy_catalog source artifact.
 *
 * These fields are import evidence, not the application domain contract.
 * Synthetic rating/count and generated-description values are retained only
 * so normalized provenance rebuilds remain auditable and deterministic.
 */
export type LegacyCatalogArtifactRecord = {
  id: string;
  title: string;
  authors?: string[];
  author: string;
  cover: string;
  genre?: string;
  rating?: number;
  ratingsCount?: number;
  addedAt?: number;
  year?: number;
  description?: string;
  pages?: number;
  publisher?: string;
  isbn?: string;
};
