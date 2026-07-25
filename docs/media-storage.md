# Media Storage

Bukie stores production book covers in a private Cloudflare R2 bucket and serves
them through the Vercel-hosted Next.js media route.

## Runtime flow

```text
Browser
  -> https://bukie.vercel.app/api/media/covers/<file>
  -> Vercel CDN
  -> Next.js route on a cache miss
  -> authenticated S3-compatible read from private R2
```

Catalogs and database rows retain provider-neutral values such as
`/covers/<id>.webp`. `src/media/covers.ts` changes those values into the media
route only at the application boundary.

The placeholder stays local at `public/covers/placeholder.svg`. Other cover
files are ignored by both Git and Vercel, so deployments exercise the R2 path.

## Environment variables

The private production path requires:

```dotenv
MEDIA_BACKEND=r2
R2_ACCOUNT_ID=<cloudflare-account-id>
R2_BUCKET=bukie-covers-dev
R2_ACCESS_KEY_ID=<bucket-scoped-access-key>
R2_SECRET_ACCESS_KEY=<bucket-scoped-secret>
```

`MEDIA_BACKEND=r2` selects `/api/media/covers/*` when no public origin is
configured. `MEDIA_CACHE_ENABLED=1` optionally makes that route check
`.cache/covers` before reading R2; it is normally left disabled in Vercel.

`R2_PUBLIC_BASE_URL` is optional and enables direct public delivery. Leave it
unset for private production delivery. An `r2.dev` development URL must not be
used as the production delivery origin.

## Credentials

Create separate credentials by responsibility:

- Vercel runtime: **Object Read only**, scoped to the production cover bucket.
- Local/CI upload workflow: **Object Read & Write**, scoped to the relevant
  cover bucket.

Never expose either credential to browser code or use a `NEXT_PUBLIC_` prefix.
Store Vercel values as sensitive environment variables.

## Vercel delivery

`src/app/api/media/covers/[...coverPath]/route.ts`:

- rejects traversal and malformed paths;
- reads `covers/<file>` with Cloudflare's S3-compatible endpoint;
- preserves R2 content type, ETag, length, and modification metadata;
- applies immutable browser and Vercel CDN caching;
- returns 404 for missing objects, 503 for missing configuration, and 502 for
  origin failures.

The UI bypasses Vercel Image Optimization for these already-optimized WebP
files, avoiding unnecessary transformations and cache-write usage.

No Vercel MCP is required. The linked Vercel CLI is sufficient for environment
configuration and preview deployments.

## Cloudflare and Wrangler setup

Wrangler is used for bucket management and uploads:

```powershell
bunx wrangler login
bunx wrangler r2 bucket list
bun run covers:r2:status
bun run covers:r2:reconcile
bun run covers:r2:backfill
```

The existing `bukie-covers-dev` bucket currently contains the backfilled cover
set. Before a final production cutover, either rename the operational intent or
create `bukie-covers-prod` and reconcile the same object set into it.

The backfill maps:

```text
public/covers/<file> -> <R2_BUCKET>/covers/<file>
```

The placeholder is excluded because it remains part of the application.

## Local development

There are two supported modes:

1. `MEDIA_BACKEND=local`: read the working set from `public/covers`.
2. `MEDIA_BACKEND=r2`: exercise the same private route used in production.

An optional disposable cache lives under `.cache/covers`. Hydrate it with:

```powershell
bun run covers:cache:hydrate
```

The hydrate command reads through the same bucket-scoped private R2 credentials.
It is a development convenience, not the production serving path.

## Safe cutover

1. Backfill all optimized cover objects.
2. Reconcile local keys and R2 keys.
3. Add the private R2 variables to Vercel Preview.
4. Deploy and verify representative and missing cover requests.
5. Remove committed covers on the feature branch, retaining the placeholder and
   intentional fixtures.
6. Push the branch and verify the Git-triggered Preview without bundled covers.
7. Add the same variables to Production and merge/deploy.
8. Verify production responses and cache headers.
9. Disable the public `r2.dev` development URL.

Keep the removal isolated to the feature branch until Preview succeeds. The
production branch remains a recoverable fallback until the merge.

## Ongoing cover workflow

For covers fetched locally:

```powershell
bun run covers:fetch
bun run images:optimize
bun run covers:r2:backfill
```

For immediate publishing through the existing scripts:

```powershell
bun run covers:fetch:r2
bun run images:optimize:r2
```

Future tooling should upload to R2 first and treat local files as temporary
staging artifacts rather than durable repository content.
