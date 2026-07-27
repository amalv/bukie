# Cover fetching guide

Cover tooling reads `artifacts/catalog/index.ts`, downloads selected assets into
the ignored `public/covers` staging directory, and optionally publishes them to
private R2. It never mutates runtime catalog tables.

Normalized `cover_assets.object_key` values remain provider-neutral
`/covers/<legacy-record-id>.<ext>` keys. Work and edition IDs do not determine
cover object names.

## Commands

```powershell
bun run covers:fetch -- --id=<legacy-record-id> --concurrency=1
bun run covers:fetch -- --limit=10 --concurrency=2
bun run covers:fetch -- --limit=50 --concurrency=4 --force
```

Important flags:

- `--id=<id>` selects one artifact record.
- `--limit=<n>` bounds eligible records.
- `--concurrency=<n>` controls parallel downloads.
- `--dry-run` disables R2 upload while retaining local staging behavior.
- `--no-optimize` preserves the downloaded format instead of WebP.
- `--check-files` includes artifact keys missing from local staging.
- `--force` includes records that already have non-placeholder keys.
- `--upload-r2` explicitly enables publishing.

The default fetch strategy uses ISBN when present, then title/author search and
curated overrides. Source policy and request guidance must be reviewed before a
bulk refresh.

## Runtime resolution

`src/db/catalog/repository.ts` returns the selected available cover asset.
`src/media/covers.ts` maps its object key to either a local URL or the private
R2-backed media route. Missing, failed, or withdrawn selections use the local
placeholder; no alternative factual cover is invented at read time.

See [adding-covers.md](./adding-covers.md) for publishing and
[media-storage.md](./media-storage.md) for R2 operations.
