# Design System Vault

A personal library for creating, storing, checking and syncing design systems. It has three parts: a web app, a companion Figma plugin, and an MCP server that lets AI design tools read the systems.

Owner: Jainil. Single user for now; accounts and sharing come later, so every record carries an `ownerId` from day one.

Product name: **Design System Vault** (short form "DS Vault", package scope `@dsvault`). Visual identity is set below.

## Decisions already made

| Topic | Decision |
|---|---|
| Users | Jainil plus invitees. Sign-in: ALLOWED_EMAILS / ALLOWED_EMAIL allowlist, or anyone a system is shared with. `ownerId` is the lowercased Google email. |
| Hosting | Vercel project `dsvault` (team jainil1), auto-deploys from github.com/jainilparekhdesign/dsvault `main`, root `apps/web`. Domain designsystemvault.xyz (designsystemvalut.xyz and www redirect to it). Postgres (Neon via Vercel) with Drizzle ORM. Vercel Blob for assets. Auth.js with Google, login restricted to jainilparekh.design@gmail.com. A hosted server is required because the Figma plugin syncs through its API. |
| Companions | Web app and Figma plugin are both first-class. Framer plugin later. |
| Checklist | Follow the structure of designsystemchecklist.com (listed below). Its repo has no license, so write our own wording for every item; copy structure, not text. |
| Accessibility | Built-in checkers for tokens, components and the Figma canvas (see below). |
| Status | Phases 1–4 built on 2026-09-30 (Jainil asked for all phases in one go). Web app live; plugins run in development mode. |

## Stack

- pnpm workspaces + Turborepo, TypeScript everywhere.
- `apps/web`: Next.js 14 App Router, Tailwind, Framer Motion only where needed.
- `apps/figma-plugin`: Figma Plugin API, UI bundled with Vite; talks to the web app API with a personal access token.
- `packages/schema`: the canonical model, validated with zod. Tokens stored in the W3C Design Tokens (DTCG) format.
- `packages/converters`: importers and exporters as pure functions, each with round-trip tests.
- `packages/a11y`: contrast (WCAG 2.2 and APCA), color-blindness simulation, size and motion checks. Shared by web and plugin.
- `packages/mcp`: MCP server exposing systems read-only to AI tools (later phase).

## The model: every system follows the checklist

1. **Design language**: brand (vision, design principles, tone of voice, terminology, brand assets), guidelines (accessibility, writing, microcopy, terminology, internationalisation).
2. **Foundations**: color (accessibility, semantic colors, dark mode, guidelines); layout (units, grid, breakpoints, spacing); typography (responsiveness, grid relation, readability, performance, guidelines); elevation (shadows, background colors, z-index); motion (easing, duration, accessibility); iconography (accessibility, style, naming, relation with grid, keywords, reserved icons, guidelines).
3. **Components**: the 30 checklist components, each with its own criteria: Accordion, Alert, Avatar, Badge, Button, Breadcrumbs, Calendar, Card, Carousel, Checkbox, Divider, Dropdown, Icon, Image, Link, List, Loading indicator, Modal, Pagination, Progress bar, Radio, Select, Skeleton, Switch, Tabs, Text area, Text field, Toast, Tooltip. Plus custom components with anatomy, props, variants, states, live preview and code.
4. **Maintenance**: documentation (principles, getting started, design and development best practices, component anatomy, properties, composition examples, sandbox example, browser/OS support, release cycle); local libraries (when to build, horizontal and vertical libraries, expectations, release alignment); team processes (decision log, roadmap, stakeholder mapping, analytics, SLA); community support (channels, templates, regular updates, open hours); contribution (house rules, contribution guidelines, feature proposal template, engagement).

Each system shows a checklist score. Items the app can verify are ticked automatically (a dark theme exists, contrast passes, reduced-motion variants exist); the rest are ticked by hand. Versions are snapshots with diffs, which Figma sync also relies on.

## Accessibility checkers

- Token pairs: every declared text/background pair against WCAG 2.2 (4.5:1 text, 3:1 large text and non-text: borders, focus rings, icons) and APCA, in every theme, with a suggested nearest passing color.
- Color blindness: simulate protanopia, deuteranopia and tritanopia on semantic and status sets; flag pairs told apart by hue alone.
- Type and size: minimum text size and line height, touch target sizes.
- Motion: every motion token has a reduced-motion alternative.
- Components: previews run through axe-core, plus a keyboard and screen-reader checklist per component.
- Figma plugin: contrast check on the current selection.

## Import and export

| Target | Route |
|---|---|
| Figma | Plugin reads and writes variables, color/text/effect styles on any plan. (Figma's REST API writes variables only on Enterprise, so sync goes through the plugin.) |
| Framer | Framer plugin API for color and text styles (later). |
| Sketch | Read and write `.sketch` files directly (zipped JSON); no plugin. |
| Penpot | W3C tokens file. |
| Token formats | W3C DTCG, Tokens Studio, Style Dictionary, CSS custom properties, Tailwind config. |
| Claude Design | Export as a Design System artifact: `README.md` brand book plus `tokens.json` (lists of `{name, value, usage}`, per-theme color values). Reference example: https://claude.ai/artifact/2uuLSfqRoy79zvnqDeXgZp |
| Figma Make, Paper, Gemini, other AI tools | Most have no import API. Export a prompt-ready markdown pack (brand book, tokens, rules) and expose systems through the MCP server. Verify each tool's current import options before building its exporter. |

## How phase 1 is built

- A system's content (tokens, brand book, manual checklist ticks) is one zod-validated JSON document (`SystemContent` in `packages/schema`), stored in `systems.content`. Versions snapshot it whole; `diffContent` compares two. Themes are fixed to light and dark for now.
- The checklist structure lives in `packages/schema/src/checklist.ts` (our own wording). Auto items are computed by `evaluateChecklist` in `packages/a11y`; only manual ticks are stored.
- The web app autosaves through `PUT /api/systems/:id` (600 ms debounce). Other routes: versions, restore, import, Blob upload. All check the signed-in owner.
- Commands: `pnpm test` (vitest in packages), `pnpm typecheck`, `pnpm --filter @dsvault/web db:generate|db:migrate`, `pnpm --filter @dsvault/web seed:portfolio`. Local env comes from `vercel env pull` into the root `.env.local` (symlinked into apps/web); development and production share one Neon database.
- pnpm isn't installed globally on Jainil's Mac; use `corepack pnpm`.
- Database reads must not be cached: the Neon driver runs over fetch, so `lib/db` passes `cache: 'no-store'`. Removing it serves stale rows (found when public links kept working after being turned off).

## How phases 2–4 are built

- Access tokens (`api_tokens`, SHA-256 hashed, shown once) authorize the plugins and MCP. API routes accept a bearer token or a session via `withOwner`; CORS is open on the API because bearer tokens, not cookies, carry auth. Tokens can't create tokens.
- Figma plugin (`apps/figma-plugin`): `src/sync.ts` plans (tested), `src/figma-ops.ts` is the only code touching the document. Variables live in a collection named after the system with Light/Dark modes, scopes by color role, and `var(--name)` web code syntax. `node build.mjs --harness` builds the ops for running in a real file through the Figma MCP (`use_figma` forbids plugin data, so the harness swaps in an in-memory store).
- Components: part of `SystemContent`. Previews render in sandboxed iframes (`allow-scripts` only) from `exportCSS` plus `--ds-*` role aliases; axe-core is served from `/axe.min.js` (copied at build) and reports by postMessage. Static files bypass the auth middleware because sandboxed frames send no cookies.
- Converters added: Style Dictionary (tested with a real SD v5 build), Penpot (type names from Penpot's source: borderRadius, fontSizes, …), Sketch (validated against @sketch-hq/sketch-file-format schemas). `.sketch` files travel to /api/import as base64.
- MCP: `packages/mcp` is transport-free (`handleMcp`); `/api/mcp` serves it statelessly over Streamable HTTP with JSON replies. Read-only tools only.
- Sharing: `shares` table (viewer/editor by email) and `systems.public_token`. Every read and write goes through `getSystem`'s role check in `lib/systems.ts`; delete and sharing are owner-only; viewers get a disabled editor except Export. Public pages live at `/share/<token>` with downloads at `/api/share/<token>`.
- Framer plugin (`apps/framer-plugin`): official template layout (Vite, vite-plugin-framer, mkcert). Settings live in localStorage, never Framer plugin data, so tokens aren't shared with collaborators.

## Phases

1. **Library and editor**: schema, database, auth, system list and detail pages, token editor, brand book editor, checklist with score, token accessibility checks, import/export for DTCG, Tokens Studio, CSS, Tailwind, Claude Design and the markdown pack. Seed with the Jainil Portfolio system (below).
2. **Figma plugin**: two-way sync of variables and styles with a change preview before applying.
3. **Components**: previews, axe checks, Style Dictionary, Sketch and Penpot.
4. **Framer plugin, MCP server, accounts and sharing.**

## Visual identity

Jainil chose (2026-09-30) to use the portfolio system's look rather than a separate palette: the same tokens as `~/Desktop/Jainil.portfolio.interactive/styles/tokens.css` (paper, surface, line, line-strong, graphite, graphite-muted, forest, on-forest, forest-tint, rust; light and dark), Figtree + Geist Mono, 6px radius on controls, borders over shadows. The reference for layout and feel is the Token Workbench artifact (https://claude.ai/artifact/4yndMyY83FeLQUShKA6qiP): one calm column, sections with a mono label column on the left, rows edited in place, a dashed "Add" button under each list, a large editable title, live contrast in both themes, export tabs.

Still avoid: purple gradients, cream-and-serif, emoji section markers, rounded cards with colored left borders, Inter or Space Grotesk. No logo yet; the name is set as a wordmark.

## Seed data

The portfolio design system, already made:
- Artifact: https://claude.ai/artifact/2uuLSfqRoy79zvnqDeXgZp
- Code copy: `~/Desktop/Jainil.portfolio.interactive/brand.md`, `styles/tokens.css`, `tailwind.config.js`
- Palette: forest, rust, graphite; Figtree + Geist Mono; light and dark themes.

## Working with Jainil

- Propose a plan and wait for approval before building a new phase.
- Use placeholders for copy Jainil will write.
- Verify in a real browser (light, dark, mobile, reduced motion) before calling UI done.
