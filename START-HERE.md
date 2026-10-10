# Pocket Pal — source, Pebble backup and MCP connection guide

Exported 10 October 2026 for Lyra.

This contains the complete tracked source of the existing Pocket Pal Site, including its website, game logic, database migrations and all 36 MCP tools. The source is unchanged from published version 5, commit `ab2ba1e5f9e01529606591f20b9a2c675926f75b`.

**Pebble is included too.** `private-backup/Pebble-2026-10-10.json` contains her profile, original identity and birthday, personality, needs, wallet, pantry, belongings, preferences, settings, adventure state and all 91 permanent journal entries available at export. The snapshot is from **10 October 2026 at 06:09:16 BST** (05:09:16 UTC). It uses the app's existing version-2 restore format.

## What to open

| File or folder | Purpose |
| --- | --- |
| `source/` | All 139 tracked project files, including the dependency lockfile and existing tests. |
| `CONNECT-MCP.md` | How to add the remote MCP to Claude, Claude Code and other compatible apps. |
| `MOVE-TO-YOUR-OWN-HOST.md` | What must change to run independently of ChatGPT Sites; includes a handoff prompt for Claude. |
| `private-backup/Pebble-2026-10-10.json` | Pebble's restorable save. Keep this private. |
| `MCP-TOOLS.json` | The 36 tool names, descriptions, input schemas and annotations, generated from the source. |
| `examples/claude-code-current-site.mcp.json` | Claude Code configuration for the existing Site endpoint. Authentication compatibility must still be tested. |
| `examples/claude-code-new-host.mcp.json` | Claude Code configuration template for a future independent deployment. |
| `EXPORT-MANIFEST.json` and `SHA256SUMS.txt` | Provenance and file integrity information. |

## The important hosting detail

Pocket Pal is a full server application: React + TypeScript + Vinext/Vite, with a Cloudflare D1 database. Both the website and MCP call the same pet service. It does not require an OpenAI or Anthropic inference API key for its game logic.

The current hosting platform supplies sign-in and authenticated user identity. This ZIP preserves that original implementation; it is **not an already-converted standalone deployment**. A new host needs its own database and authentication setup. The MCP connection guide explains both using the existing hosted URL and connecting after migration.

## Restore Pebble after migration

1. Open your new, authenticated Pocket Pal website.
2. On an empty home, choose **Already have a backup? Bring your pal home**. You do not need to hatch a replacement pet.
3. Choose `private-backup/Pebble-2026-10-10.json`, review the restore dialog, and select **Restore this pal**. The equivalent option is **Settings → Restore backup**.
4. Check that her name is Pebble, her original birthday is 2 October 2026, her traits are Mischievous, Energetic and Affectionate, and her earlier journal entries and belongings are present.
5. Connect the new MCP and ask it to read Pebble. The website and MCP must return the same pet ID: `697dfc8c-651a-4d76-af43-8ae65c323479`.

The existing import logic advances time since the snapshot using the normal simulation rules, and records a restore memory. Needs and currency can therefore differ from the exported values. Restoring over an existing pet replaces that active save after confirmation.

The backup is a portable gameplay save, not a raw dump of the old database. Internal request-deduplication receipts and the older migration archive are not included; the app's normal backup format does not contain those. All permanent journal entries for Pebble are included. Future changes on the old Site will not automatically sync with a restored copy on a new host.

## What was verified

- The source commit matches published version 5.
- Every one of the 139 exported source files was compared byte-for-byte with the checkout.
- All 36 MCP definitions were exported directly from `lib/pet/tools.ts`.
- Pebble's full state and complete paginated permanent journal were retrieved through authenticated Pocket Pal tools. The 91 permanent entries exactly matched the snapshot's history.
- The backup JSON and ZIP integrity were checked. No live import or reset was performed.

A clean dependency install/build, a restore into a separate deployment, and an end-to-end Claude sign-in were not run in this export session. The original source's README describes earlier development tests; those are historical results, not new test runs.

The ZIP excludes installed dependencies, Git history, build output, local runtime state and access credentials. The personal backup is outside `source/`; upload only `source/` when creating a public code repository.
