# Running and deploying the complete game

## CPU/local play

Install Node.js 22+ and Python 3, then run:

```sh
npm ci
npm test
npm run build
npm start
```

Open http://localhost:8000. This static preview supports CPU and pass-the-device
play. `dist/nakama-offline.html` is also a standalone download with all art,
fonts and music embedded. It supports CPU/local play without a server.

## Online play locally

```sh
npx wrangler@4 dev
```

Wrangler uses `wrangler.jsonc` to run the Worker, its static assets, and a local
SQLite Durable Object namespace. Open the printed local URL from two separate
browser profiles (or an incognito window) and join the same room. The same
browser profile normally reuses its existing seat by design.

## Existing production deployment

The production site is already on Albert's Cloudflare account as Worker
`ultimate-nakama-battle`, with the SQLite class `NakamaRoom`, binding `ROOMS`,
and migration tag `nakama-online-v1`. Preserve these names to retain rooms.
There is no need to move hosting when moving source code to GitHub.

The existing deployment script uses only Python's standard library:

```sh
python3 scripts/deploy-cloudflare.py --check
python3 scripts/deploy-cloudflare.py
```

At the hidden prompt, enter a JSON object with `account` (Cloudflare account ID)
and `token` (a Cloudflare API token authorized to edit that account's Workers).
Obtain these in the account settings; never put the token in a source file,
commit, command argument, or chat message. The check command only verifies
access. The second command uploads assets and deploys the existing Worker.

Alternatively, after Cloudflare authentication, deploy with:

```sh
npx wrangler@4 deploy
```

Confirm the selected Cloudflare account first. The config already declares the
existing namespace migration. For a separate test deployment, use a different
Worker name rather than replacing the production worker.

GitHub Pages can host CPU/local play but cannot run the online server; online
rooms need the Worker and Durable Objects. Do not replace online play with a
static-only deployment.

## GitHub and future changes

The included GitHub Actions workflow runs the tests and checks the regenerated
offline download on pushes and pull requests. It does not deploy production.
`AGENTS.md` describes the project for coding agents. A later automatic
Cloudflare deployment can be configured with repository secrets when requested;
no account secrets are included in this migration.
