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

## Recommended: fetch and publish one cover

Run this from the repository root:

```powershell
bun run covers:fetch:r2 -- --id=<work-id> --concurrency=1 --force
```

This command:

1. finds a candidate through Open Library;
2. optimizes it to WebP;
3. writes the ignored staging file to
   `public/covers/<work-id>.webp`;
4. uploads it to `R2_BUCKET/covers/<work-id>.webp`.

The command never mutates a runtime database. Catalog rebuild/import derives
the normalized cover relation from the reviewed artifact. If any publishing
job fails, the command finishes the remaining queue and exits nonzero.

Upload the object before deploying catalog or database changes that reference
it. Until the object exists, the app deliberately displays the placeholder.

## Review before publishing

To inspect a new image locally before uploading:

```powershell
bun run covers:fetch -- --id=<work-id> --concurrency=1 --force
```

Open `public/covers/<work-id>.webp`, then publish exactly that file:

```powershell
bunx wrangler r2 object put "<bucket>/covers/<work-id>.webp" `
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
