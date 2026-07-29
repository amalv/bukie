# Adding Book Covers

Production covers live in private Cloudflare R2. Local files under
`public/covers` are ignored staging files; only `placeholder.svg` belongs in
Git.

## The important rule

Uploading covers is an explicit publishing action. Normal development, CI, and
Vercel builds never upload to R2:

- `bun run build` migrates and seeds the database, then runs `next build`.
- `bun run build:ci` only runs `next build`.
- `.gitignore` and `.vercelignore` exclude staged cover files.
- A unit test rejects R2-writing commands in `prebuild`, `build`, `build:ci`,
  or `postbuild`.

Do not add a cover upload command to a build lifecycle script or the Vercel
Build Command. That would repeat writes on every deployment and make builds
responsible for mutating production data.

## Prerequisites

1. The record exists in the typed catalog artifact.
2. You know its stable `<work-id>`.
3. Local `.env` contains `R2_BUCKET`.
4. Wrangler is logged in with a bucket-scoped **Object Read & Write**
   credential. Vercel itself should keep using a separate **Object Read only**
   credential.

## Inspect an exact-edition candidate

Run this from the repository root:

```powershell
bun run covers:fetch -- --id=<legacy-record-id> --concurrency=1 --force
```

This command:

1. finds a candidate through the selected edition's exact ISBN;
2. optimizes it to WebP;
3. decodes it and records deterministic technical/review signals in the
   command output;
4. writes the ignored staging file to
   `public/covers/<legacy-record-id>.webp`.

The command never mutates a runtime database or a public cover projection.
Works without an exact selected-edition ISBN remain review candidates instead
of falling back to title/author search. Inspection flags are advisory; identity
and approved-source policy remain hard gates. During the PoC, issue #143
defers display-rights clearance for covers only. Such candidates must record
`rightsStatus: deferred_poc`, `rightsCleared: false`, provenance, deterministic
withdrawal/purge support, and mandatory re-review before definitive production
launch. Explicitly denied assets remain ineligible.

`covers:fetch:r2` is deliberately blocked while the recorded Open Library
asset policy is pending. Publishing resumes only after a reviewed dry run and
an approved policy permit caching, transformation, and display. Until then,
missing or rejected candidates use the accessible placeholder.

## Review before publishing

After dry-run approval, open the staged image and publish exactly that reviewed
file with the approved versioned object key:

```powershell
bunx wrangler r2 object put "<bucket>/covers/<approved-versioned-key>.webp" `
  --file="public/covers/<work-id>.webp" `
  --content-type="image/webp" `
  --cache-control="public, max-age=31536000, immutable" `
  --remote `
  --env-file=".env"
```

For a batch of new staged files, inspect the pending set and then backfill:

```powershell
bun run covers:r2:status
bun run covers:r2:backfill
```

`covers:r2:backfill` is resumable and skips filenames already recorded as
uploaded. Existing keys are served with immutable cache headers and should not
normally be overwritten; handle a replacement as a separately planned,
versioned-key migration.

## Verify

Check that the bucket contains the expected keys:

```powershell
bun run covers:r2:reconcile
```

Then run the app against private R2:

```dotenv
MEDIA_BACKEND=r2
MEDIA_CACHE_ENABLED=0
```

```powershell
bun run dev
```

The expected runtime behavior is:

- object exists: the optimized cover is returned through
  `/api/media/covers/<work-id>.webp`;
- object is missing, R2 is unavailable, or configuration is missing: the route
  redirects to `/covers/placeholder.svg`;
- `MEDIA_BACKEND=local`: an existing ignored local staging file is shown;
  otherwise the placeholder is shown.

## Commit and deploy

Commit catalog, database, code, and documentation changes as usual. Do not
force-add `public/covers/*.webp`; those files are intentionally ignored.

Pushing code triggers Vercel, but the deployment only reads the already
published R2 object. It does not upload the local staging directory.
