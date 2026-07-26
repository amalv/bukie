# Documentation-only validation

Bukie treats a pull request as documentation-only when every changed path is
under `docs/**` or is a Markdown file (`**/*.md`). Any other changed path runs
the full application pipeline.

## GitHub Actions

Biome, unit, Playwright, Storybook, and Qlty workflows use GitHub Actions'
native `paths-ignore` filters. A genuinely documentation-only pull request does
not start those workflows. Commitlint and the lightweight Documentation
workflow continue to run.

The Documentation workflow uses Markdownlint CLI2 for heading spacing and final
newlines, plus Lychee in offline mode for local repository links. Both actions
are pinned to immutable release commits. Generated dependency, build, and test
report directories are excluded.

GitHub evaluates the complete pull-request diff, not only the latest commit.
Adding a documentation commit to a pull request that already changes
application files therefore still runs the application workflows.

Path-filtered workflows must not be configured as required checks: GitHub can
leave a required but filtered workflow pending. The current repository has no
branch protection or rulesets. If required checks are introduced, require an
always-running gate such as Documentation or Commitlint, or add a dedicated
required gate that accounts for path filtering.

## Vercel

[`vercel.json`](../vercel.json) uses Vercel's Ignored Build Step with a direct
`git diff` command:

- exit `0` cancels a documentation-only build;
- exit `1` continues a build with application changes; and
- an unavailable comparison commit or other Git error is normalized to exit
  `1`, so the build continues instead of failing the deployment.

The command compares the current commit with `VERCEL_GIT_PREVIOUS_SHA`, falling
back to `HEAD^` when that environment variable is unavailable. It excludes
`docs/**` and Markdown files case-insensitively from the diff. Rename detection
is disabled so both sides of a rename are considered. A `.vercelignore` file
controls uploaded files, not whether a Git build starts.

For an intentional redeploy, choose **Redeploy** in Vercel and clear **Use
project's Ignore Build Step**.

References:

- [GitHub Actions path filters](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax#onpushpull_requestpull_request_targetpathspaths-ignore)
- [Markdownlint CLI2 Action](https://github.com/DavidAnson/markdownlint-cli2-action)
- [Lychee offline link checking](https://github.com/lycheeverse/lychee)
- [Vercel Ignored Build Step](https://vercel.com/kb/guide/how-do-i-use-the-ignored-build-step-field-on-vercel)
