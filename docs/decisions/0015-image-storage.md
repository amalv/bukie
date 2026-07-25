# Image Storage Decision
- Status: accepted

## Context
Bukie currently stores curated book covers as optimized local assets in `public/covers` and commits them to the repository. This keeps rendering deterministic and works well with the existing catalog import and sync scripts.

As of 2026-03-15, the current repository footprint is modest: `public/covers` contains about 501 files totaling about 11.75 MB. That is easy to serve today, but it does not answer the longer-term question of how Bukie should handle image growth, mutable assets, or future user uploads.

We also need to decide whether a free-tier object store is a better default than committing covers to the repository. Vercel Blob is operationally cleaner for mutable assets, but the Hobby plan includes limited storage and operations. Cloudflare R2 offers a more generous free tier for simple asset hosting, especially because Bukie already pre-optimizes covers before serving them.

## Decision Drivers
- Keep the current curated catalog simple and reliable on the free tier
- Avoid premature runtime dependencies for assets that rarely change
- Preserve deterministic SSR and stable cover URLs
- Create a clean path for mutable or user-generated images
- Reduce future repository and deployment bloat before it becomes painful

## Considered Options
- Keep all images committed in the repository
- Move all book covers to an external object store now
- Use a hybrid strategy: keep curated seed covers in the repo for now, and use object storage only for mutable or user-generated assets

## Decision Outcome
Chosen option: Move production book covers to Cloudflare R2.

Bukie will keep provider-neutral `/covers/<id>.webp` values in catalogs and the
database, store the objects in a private R2 bucket, and serve them through a
Vercel-hosted media route. The placeholder remains committed locally.

### Rationale
- Moving the current set establishes one durable workflow before the catalog
  grows and prevents binary churn from accumulating in Git history.
- Provider-neutral keys preserve deterministic SSR and stable cover URLs.
- A Vercel media route allows the bucket to remain private without requiring a
  separately registered domain.
- Vercel Blob is not a clearly better default for the current catalog on Hobby because its free tier is modest.
- Cloudflare R2 is a stronger future external-store candidate because its current free tier includes:
  - 10 GB-month storage per month
  - 1 million Class A operations per month
  - 10 million Class B operations per month
  - free egress to the Internet
- R2 is a particularly good fit here because Bukie already generates optimized cover assets ahead of time and does not need a complex dynamic image pipeline on day one.
- Immutable Vercel CDN caching limits repeated function executions and R2 reads.

## Pros and Cons
### Keep all images committed in the repository
**Pros:**
- Very simple operationally
- Deterministic assets for SSR, previews, and local development
- No runtime dependency on external object storage

**Cons:**
- Repository history and deployment artifacts grow over time
- Poor fit for frequently updated or user-generated images
- Encourages mixing immutable seed assets with mutable content

### Move all book covers to an external object store now
**Pros:**
- Cleaner separation between code and media
- Better long-term fit for mutable assets
- Avoids committing binary churn into Git history

**Cons:**
- Adds runtime storage dependency and quota management immediately
- Requires storage-provider setup, credentials, and asset backfill work
- Requires app and script changes before there is a strong product need

### Private R2 behind the Vercel media route
**Pros:**
- Removes cover binaries from the deployed Git source of truth
- Keeps `bukie.vercel.app` URLs and the R2 bucket private
- Creates the same storage boundary needed for future uploads

**Cons:**
- Adds R2 credentials and an object-storage dependency to the Vercel runtime
- Cache misses consume Vercel function/data-transfer and R2 read allowances

## Consequences
- R2 is the production source of truth for curated covers.
- `public/covers` may be used as a disposable local staging area by cover tools.
- The placeholder and intentional fixtures remain committed.
- Production uses bucket-scoped, read-only S3 credentials.
- Upload tooling uses a separate write-capable credential or Wrangler login.

## Migration Safety
- Backfill and reconcile every object before changing production.
- Validate a Vercel preview deployment against private R2.
- Remove committed covers on an isolated feature branch after reconciliation,
  then validate its Preview before merging the removal into production.
- Keep the placeholder local so missing-object failures remain legible.

## References
- Cloudflare R2 get started: https://developers.cloudflare.com/r2/get-started/
- Cloudflare R2 pricing: https://developers.cloudflare.com/r2/pricing/
- Cloudflare R2 S3 authentication: https://developers.cloudflare.com/r2/api/tokens/
- Cloudflare R2 public buckets: https://developers.cloudflare.com/r2/buckets/public-buckets/
- Vercel Blob pricing: https://vercel.com/docs/vercel-blob/usage-and-pricing
