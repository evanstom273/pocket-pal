# Pocket Pal — a bigger little world

Owner-private virtual pet Site and stateless HTTP MCP server. The original code-drawn Piplet stays at the centre of a persistent life: care, sleep, personality, inventory, a home, outings and memories.

## Shared state and safe updates

D1 `pet_saves` is keyed by the Sites-authenticated user ID. `/api/pet` and `/mcp` both use `operate()` in `lib/pet/service.ts`. Every visit applies real elapsed time and writes with revision-based compare-and-swap. Conflicts reload/retry. The last 100 request IDs and SHA-256 command signatures prevent duplicate actions and purchases. Retries still simulate elapsed time, without repeating their action.

Version 1 saves migrate once, in place. All original profile fields, personality, care statistics, identity, dates, bond and memories survive. Migration archives the untouched original JSON in the same D1 transaction as the update. Existing pets receive a one-time **300.00 Dewdrop legacy grant**, stocked supplies, a cloudball and cushion; new pets receive 35.00. Durable grant markers survive ordinary updates and restores. Never seed or reset production data during startup/build/deployment. Applied Drizzle migrations are immutable; append migrations only.

The `pet_memories` table permanently retains meaningful events. The active save includes 400 recent entries; journal pagination and JSON export read the permanent log. There is no history deletion during ordinary updates. Reset and import require explicit confirmation and archive the old save. Imports validate schema, bounded stats, inventory/equipped references, adventure references and dates before replacing anything.

All data-bearing endpoints require Sites identity. Keep this Site owner-private. MCP discovery contains no private data. Cross-origin writes are rejected. The dashboard refreshes every five seconds while visible and on focus. Never embed owner identity, credentials or production saves in source or browser assets.

## Economy and care

Dewdrops are fictional in-game currency, stored as integer hundredths plus a fractional accrual remainder. Excellent care earns approximately 5.00 per hour; good care 4.25, comfortable care 3.00, poor care less, serious neglect zero. Food and water begin at 0.25. No debt, purchases with real money, or paid medicine. A limited emergency basket helps when both pantry and purse are empty. The shop has rotating daily discounts and optional storage upgrades.

Simulation is capped at 48 hours per absence, including offline earnings. Needs have forgiving floors and there is no death. Age uses actual elapsed time. Hunger 0 means full; other needs are best at 100. Hydration is separate and deliberately simple. Food, drinks and treats consume real stock, including autonomous use. No meal appears from an empty pantry. Treats have diminishing returns and a three-per-hour cap, including when invoked via use_item. Care and play cooldowns prevent repeated button farming.

Sleep restores energy and ends naturally after about eight hours. Exhaustion can prompt a nap; illness responds to food, cleanliness, hydration, rest and free medicine on a four-hour cooldown. Babies need direct feeding/drinking. Children can sip and play with owned toys. Bonded teens can self-feed; adult companions can manage basic stocked needs. Independent care can be paused. Natural sleep and dreams continue. Original traits remain stable; routines, confidence, learned tendencies, relationships and favourites grow from actual experience.

## Original content

- 204 items: 50 meals, 32 drinks, 26 treats, 26 toys, 20 collectibles, and furnishings, clothing, grooming, outing gear, special items, storage and upgrades.
- 60 activities across six categories, each with three outcomes.
- 24 destinations with residents, fictional weather, discoveries and gentle hazards.
- 36 choice-based adventures, 116 nodes, 144 endings and 160 paths of two or three decisions. The run, page and transcript persist. Stale choices are rejected; outcomes update relationships, confidence, belongings and permanent history. Return visits can recognise an earlier acquaintance.
- 84 dreams with a 45-day per-dream cooldown, personal context, and five-hour spacing.
- 326 care/context reactions and 44 ambient events, with persistent anti-repeat queues and personality weighting.

Owned toys can become favourites, get temporarily boring, be brought to the player, go missing briefly, or be searched for. Furnishings and selected accessories appear in the habitat. Passive comfort, sleep, grooming, exploration and self-care benefits have small capped effects. Storage expands the pantry; it never gates free basic baths or medicine.

## MCP and interface

36 tools expose all care and expanded systems. Use `get_shop` then `purchase_item`; `get_pantry` supplies valid stocked choices. `get_activities` and `get_destinations` list options. `take_a_walk` creates a saved story; `get_adventure` returns actual choices, and `choose_adventure_option` requires run/page/choice IDs. Agents must use recorded state and reactions, never invent completed adventures or personal memories. Reuse the existing provisioned Pocket Pal plugin on redeploy.

The responsive Site has My pal, Pantry, Shop, Belongings, Activities, Outings, Journal and About areas. Milestones/statistics are linked from About. Settings include motion, numbers, prompts, independent care, timezone, full JSON export/import and guarded reset. No sound or mandatory sharing.

## Verification

Run `node scripts/test-pocket-pal.mjs` (or the package test script) and `node node_modules/typescript/bin/tsc --noEmit`. The 25 tests cover migration with concurrent readers, one-time grants, original-save archives, simulation/caps, exact stock/currency effects, retry deduplication, all care actions, sleep, illness/recovery, age-dependent autonomy, favourites, toy boredom/search, every adventure graph, stale choices, dream anti-repeat, permanent history/export, identity isolation and MCP/Site shared state.

`tests/ui-harness.tsx` is local-only and uses the isolated `qa-pocket-expansion` identity. It ran 54 real HTTP MCP/API checks, including all 36 tools, purchases and stories in both directions, export and authentication rejection. Desktop onboarding/purchase and 390-pixel mobile home/shop/outings were inspected; document width matched viewport with no horizontal overflow. Generated `/public/__qa` assets must be removed before building or packaging. They are ignored in Git but build output still copies public assets, so removal is mandatory.

Publish with the Sites source helper and native owner-private deployment. Publication never invokes hatch/reset/import or writes fixture state. Verify the installed production plugin with a read-only `get_pet` after deploy, comparing its identity and original memories with the pre-deploy baseline.
