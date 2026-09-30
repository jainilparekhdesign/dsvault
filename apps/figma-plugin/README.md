# Design System Vault for Figma

Two-way sync between a vault system and a Figma file, with a preview of every change before it's applied, and a contrast check for the current selection.

## Install (development)

1. `corepack pnpm --filter @dsvault/figma-plugin build`
2. In Figma desktop: Plugins → Development → Import plugin from manifest → pick `apps/figma-plugin/manifest.json`.
3. In the vault, open Settings and tokens, create a token, and paste it into the plugin with the server address.

## What syncs

| Vault | Figma |
|---|---|
| Colors (light and dark) | Color variables in a collection named after the system, with Light and Dark modes. Scopes follow each color's role. |
| Spacing, radius, breakpoints, z-index | Number variables (`spacing/…`, `radius/…`, `breakpoint/…`, `z-index/…`) |
| Durations, easing | Number and string variables (`duration/…`, `easing/…`) |
| Type styles | Text styles named `<system>/<style>` |
| Shadows | Effect styles named `<system>/<shadow>` |

Every variable gets its CSS name as Web code syntax, so Dev Mode shows `var(--name)`. Links between Figma objects and vault tokens live in plugin data, so renames on either side stay linked. The plugin only removes variables and styles it created.

## Code

- `src/sync.ts`: pure planning (vault → Figma plan, Figma → vault merge), unit-tested.
- `src/figma-ops.ts`: the only code that reads or writes the document.
- `src/code.ts` and `src/ui.ts`: the plugin's main thread and window.
- `node build.mjs --harness` builds `dist/harness.js`, which exposes the document operations for running in a real file without the UI.
