# Move Pocket Pal off ChatGPT Sites

This is a migration guide for the exported source. Migration changes have not been applied to `source/` and no replacement service has been deployed.

## What needs moving

| Part | Current implementation | Independent deployment requirement |
| --- | --- | --- |
| Website | React/TypeScript, Vinext + Vite | A compatible server build and host. |
| Game and content | `lib/pet/`, `app/`, and components | Retain these; no redesign or new pet is needed. |
| Persistence | Cloudflare D1, binding `DB` | Your own database and the supplied SQL migrations. |
| Website API | `app/api/pet/route.ts` | Keep it on the same service/database as MCP. |
| MCP | `app/mcp/route.ts`, `lib/pet/tools.ts` | Preserve Streamable HTTP and the 36 tool contracts. |
| User identity | `oai-authenticated-user-id` supplied by Sites | Replace with verified server-side authentication for the website and MCP. |
| Login paths | `/signin-with-chatgpt` and related platform routes | Implement your own supported login flow. These platform routes are not in the exported app. |
| Pebble | Portable JSON in `private-backup/` | Restore it through the existing import UI after hosting works. |

**Cloudflare Workers + D1 is the closest fit to the actual code**, because `lib/pet/storage.ts` imports `cloudflare:workers` and calls the D1 binding directly. This is an inference from the source, not a claim that the ZIP is already configured for your Cloudflare account. A Vercel deployment needs the runtime/storage integration adapted. A static GitHub Pages deployment alone cannot run the current API, database or MCP server.

## Practical migration sequence

1. **Start from `source/`.** Keep `private-backup/` out of a public repository. The original manifest identifies the existing Site; it is provenance, not credentials or a new hosting setup.
2. **Install the declared toolchain.** `package.json` requires Node.js 22.13.0 or newer and declares pnpm 11.25.0. In `source/`, install that pnpm version if needed, then run `pnpm install --frozen-lockfile`. The lockfile is included. Run `pnpm test` and `pnpm exec tsc --noEmit` after dependencies are installed. These commands were not rerun during export.
3. **Create a new Cloudflare D1 database in your account**, if choosing Workers. Bind it as `DB`. Cloudflare documents creation with `wrangler d1 create <database-name>` and binding the returned database ID to a Worker. Use your returned ID, not the placeholder currently in `vite.config.ts`. [5]
4. **Apply the existing schema to that new database**, in order: `drizzle/0000_wise_tyger_tiger.sql`, then `drizzle/0001_brainy_cable.sql`. They create `pet_saves`, `pet_archives` and `pet_memories`. Configure the migrations directory if using Wrangler's migration runner. Do not reapply initial create-table SQL blindly to a populated database. [6]
5. **Adapt the build/deployment configuration.** Review `vite.config.ts`, `build/sites-worker.ts`, `build/sites-vite-plugin.ts`, `scripts/run-framework.mjs` and `.openai/hosting.json`. Give the independent Worker its own configuration, real database binding, compatible Vinext build, and static assets. No external connected-app service is used by the pet logic; the connector-preview scaffolding is development infrastructure.
6. **Replace the Sites authentication boundary before publishing.** `lib/pet/storage.ts::identity()` currently trusts an identity header because Sites supplies it. On your own host, never accept a caller's claimed owner ID as authentication. Verify login/session or token credentials server-side and map both website and MCP requests to one stable owner. Replace the sign-in link in `app/page.tsx`; adapt `app/chatgpt-auth.ts` wherever used. Protect backup export/import as well as care tools.
7. **Provide MCP-compatible external authentication.** For Claude web/mobile, implement a standards-compliant OAuth flow using a maintained library/provider. It should offer authorization metadata, client registration supported by Claude, token validation, refresh and resource/audience checks. Allow the documented hosted callback `https://claude.ai/api/mcp/auth_callback`; Claude Code uses a separate loopback callback. A browser-only login cookie or interactive website login page is not sufficient for remote MCP calls. [4]
8. **Publish and verify the new HTTPS website and `/mcp`.** Keep the existing `operate()` service as the single place for pet changes. Check unauthenticated data access is rejected; verify tool discovery, initialize, a read, and synchronization with the website. Keep UI and MCP behind the same owner mapping and database.
9. **Restore the included Pebble backup**, using the existing “Bring your pal home” or Settings → Restore backup flow. Confirm identity, birthday, old memories, pantry, wallet and belongings. Then add the new URL in Claude using `CONNECT-MCP.md`.

The portable local development profile has a localhost-only mock login (`local_seedy`). It is for local development, not production or an internet-facing MCP connection. The original `pnpm dev`/`pnpm build` scripts do not by themselves replace platform login or migrate the database.

Do not paste a source-repository token, platform bypass credential or an OAuth access token into frontend code. None is included in this export. The pet engine itself does not require paid AI inference: MCP lets your chosen assistant call its existing functions. Hosting charges, if any, are separate from that.

## Handoff prompt for Claude or a coding assistant

Copy the following text with this ZIP attached, or give your coding assistant access to the extracted files:

> Migrate this existing Pocket Pal application from ChatGPT Sites to an independent deployment in my own hosting account. Start by reading START-HERE.md, CONNECT-MCP.md and the existing source. Prefer Cloudflare Workers + D1 because the code already uses cloudflare:workers and D1. Preserve the current UI, Piplet artwork, game balance, economy, inventory, autonomous care, dreams, adventures, memories and every existing MCP tool. This is a hosting/authentication migration, not a redesign.
>
> The untouched application is in source/. Pebble's private restorable backup is in private-backup/Pebble-2026-10-10.json. Never commit that backup or embed it in public assets, source code, a build or seed data. Preserve the backup byte-for-byte and import it only through an authenticated restore process. Do not hatch or reset a pet automatically. Her ID must remain 697dfc8c-651a-4d76-af43-8ae65c323479 and her original createdAt must remain 2026-10-02T12:55:35.939Z.
>
> Replace Sites-provided authentication with verified production authentication. The browser and MCP must resolve to the same stable owner and call the same operate() service with the same D1 database. Never trust user-supplied oai-authenticated-user-id headers on a public endpoint. Implement standards-compliant remote MCP authentication compatible with Claude's hosted custom connectors; use current official docs. Avoid requiring an OpenAI or Anthropic inference API key. Do not use a temporary access token as permanent authentication.
>
> Configure my own Worker/database bindings and migrations, adapt Sites-specific build/login code, preserve the 36 tools and the existing backup import/export format, and provide exact run/deploy instructions for the resulting implementation. Run the existing meaningful tests and verify unauthenticated requests are rejected, authorized API/MCP reads return the same pet, and backup restoration preserves the original identity, inventory and all 91 exported journal entries. Check restoration in an isolated database before touching any current save. Tell me any remaining hosting/account setup I must do. Return the new website and MCP URLs once deployed and verified.

This prompt describes the work still required. The export does not claim it has already been completed.

## Implementation map

| Path under `source/` | What it contains |
| --- | --- |
| `app/page.tsx`, `app/world-panels.tsx`, `app/piplet.tsx`, `app/globals.css` | Website, world panels, drawn pet and styles. |
| `lib/pet/model.ts` | Pet/backup schemas and settings. |
| `lib/pet/engine.ts`, `lib/pet/world.ts` | Time passage, care, progression and world behavior. |
| `lib/pet/service.ts` | Shared operations, revision checks, request deduplication, permanent memories and import/export. |
| `lib/pet/storage.ts` | D1 access, identity and HTTP helpers. |
| `lib/pet/catalogue.ts`, `story-content.ts`, `world-content.ts` | Shop, narrative and activity content. |
| `lib/pet/tools.ts`, `app/mcp/route.ts` | MCP tool definitions, validation, dispatch and protocol handling. |
| `db/`, `drizzle/` | Database schema and migrations. |
| `tests/` | Existing behavior, migration, persistence and UI test infrastructure. |

## References

4. [Build an MCP server for Claude](https://claude.com/docs/connectors/building)
5. [Cloudflare D1: Getting started](https://developers.cloudflare.com/d1/get-started/)
6. [Cloudflare D1 migrations](https://developers.cloudflare.com/d1/reference/migrations/)
