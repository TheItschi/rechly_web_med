# Updating a Local (Laptop) Installation

For people who clone this repository and run Rechly for themselves on their
own machine (`npm run dev`, or `npm run build` + `npm run start` against
their own Appwrite). Hosted users never see any of this: the update banner
only renders on `localhost` / `127.0.0.1`, and the update endpoint only
accepts loopback requests.

## How updates are detected

`GET /api/update/check` (checked at most every 30 minutes, 5 s timeout,
silent when offline) compares this install against GitHub:

1. **Releases first** — if the repository publishes GitHub Releases, a tag
   newer than `version` in `package.json` counts as an update.
2. **Main branch otherwise** — this project ships by pushing to `main`, so a
   newer `main` commit than the running checkout also counts. The banner's
   "What's new" link opens the GitHub compare view for exactly those commits.

When an update exists, a dismissible banner appears in the dashboard
(dismissal is remembered per version in the browser).

## Updating

### In the app

Click **Update now** in the banner. It starts `scripts/update.mjs` as a
detached process and polls `/api/update/status` until it finishes. This
endpoint is loopback-only, requires a custom header, and can be disabled
with `RECHLY_ALLOW_IN_APP_UPDATE=0`.

### In the terminal (always works)

```bash
npm run update:check   # only tell me if an update exists
npm run update         # download + install it
npm run update -- --build   # also rebuild (needed for `npm run start` users)
```

With `npm run dev` no further step is needed — Next.js picks the new code
up. With `npm run start`, restart the server after updating.

## What the updater does (and never does)

`scripts/update.mjs` runs, in order:

1. Refuses to run outside a git clone, or with uncommitted tracked changes
   (it lists them; commit or `git stash` first). Nothing is overwritten.
2. `git fetch` + `git pull --ff-only` — fast-forward only, never a merge,
   never a reset. A diverged branch stops the update with instructions.
3. `npm install`.
4. If `.env.local` exists (and this is not a desktop/SQLite install), the
   additive, idempotent Appwrite schema migrations
   `scripts/migrate-einvoice.mjs` and `scripts/migrate-company-numbering.mjs`
   run. A failure here is a warning, not data loss; re-run manually with
   `node --env-file=.env.local scripts/<name>`. Skip with
   `RECHLY_UPDATE_MIGRATIONS=0`.
5. `npm run build` only with `--build`.

It never touches `.env.local`, Appwrite data, or uploaded files, and it
never restarts a production deployment — hosted installs (Coolify etc.)
keep updating by rebuilding from `main` as before.

## Configuration

| Variable | Default | Meaning |
|---|---|---|
| `RECHLY_UPDATE_CHECK` | `1` | `0` disables update checks entirely |
| `RECHLY_ALLOW_IN_APP_UPDATE` | `1` | `0` disables the in-app Update button |
| `RECHLY_UPDATE_REPO` | from `NEXT_PUBLIC_REPOSITORY_URL` | `owner/repo` checked on GitHub |
| `RECHLY_UPDATE_BRANCH` | `main` | Branch/commit feed used when no releases exist |
| `RECHLY_UPDATE_GITHUB_TOKEN` | — | Optional; raises GitHub API rate limits |
| `RECHLY_UPDATE_MIGRATIONS` | `1` | `0` skips Appwrite schema migrations during update |
| `RECHLY_GIT_COMMIT` | from `git rev-parse HEAD` | Override the running commit (packaged installs) |

## For maintainers: publishing a version laptop users can pick up

Works today with zero extra steps — every push to `main` becomes an
offered update via the commit check. For clearer versions, additionally
tag a release and bump `version` in `package.json`:

```bash
# bump "version" in package.json first, then:
git tag v0.2.0 && git push origin v0.2.0
gh release create v0.2.0 --generate-notes   # or via the GitHub web UI
```

Release tags win over the commit check, and the banner links users to the
release notes instead of a commit comparison.
