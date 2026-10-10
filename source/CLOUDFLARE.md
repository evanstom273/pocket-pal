# Pocket Pal on Cloudflare

Open https://pocket-pal.evanstom273.workers.dev. No ChatGPT account or sign-in is required.

The browser receives a private access cookie automatically. Pet saves are held in Cloudflare D1. Different browsers have separate saves. Keep a JSON backup before clearing browser data or changing devices.

To move your existing pal, choose **Already have a backup? Bring your pal home** on the welcome screen, or **Settings → Restore backup**, then select your private Pocket Pal backup JSON. The source repository contains no personal pet backup.

For an MCP client, open **Settings → Copy MCP link**. The copied URL includes the private key for this browser's pet; anyone with it can read and change that pet. Use the whole link in your private connector. Clients supporting custom headers can instead use the base `/mcp` URL with `Authorization: Bearer <the key from the private link>`.

The connector and the browser share the same D1 save. There is no OAuth registration or ChatGPT sign-in dependency. The original Sites identity header is not accepted as authentication.

## Deployment

- Git repository root directory in Cloudflare: `source`
- Build command: `pnpm run build`
- Deploy command: `pnpm exec wrangler deploy --config dist/server/wrangler.json`
- Source configuration: `wrangler.jsonc`
- Database binding: `DB`, database name `pocket-pal`

The first two database migrations are already applied. For future schema changes, run `pnpm exec wrangler d1 migrations apply DB --remote` from `source` after reviewing the migration.

Local development: install with `pnpm install --frozen-lockfile`, apply migrations using `pnpm exec wrangler d1 migrations apply DB --local --persist-to .wrangler/state`, then run `pnpm run build` and `pnpm start`. `pnpm test` includes tests for save isolation and matching browser/MCP access.
