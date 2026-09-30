# Design System Vault for Framer

Syncs a vault system into a Framer project's color styles (with light and dark values) and text styles, with a preview before anything changes. Colors can also be read back from Framer into the vault.

## Run it

1. `corepack pnpm --filter @dsvault/framer-plugin dev`. The first run asks for your Mac password once, to trust a local HTTPS certificate (Framer only loads plugins over HTTPS).
2. In Framer: Plugins → Open Development Plugin.
3. Paste the server address (`https://designsystemvault.xyz`) and an access token from the vault's Settings and tokens page.

The token is stored in this browser only, never in the Framer project, so collaborators can't see it.

## What syncs

| Vault | Framer |
|---|---|
| Colors (light and dark) | Color styles in a folder named after the system |
| Type styles | Text styles in the same folder; display, title and heading map to h1, h2 and h3 |

Styles are linked to vault tokens with plugin data, so renames stay linked. Only styles the plugin created are ever removed.

## Code

- `src/sync.ts`: pure planning, tested in `src/sync.test.ts`.
- `src/main.ts`: the plugin window and Framer API calls.
