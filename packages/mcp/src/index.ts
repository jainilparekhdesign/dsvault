// A read-only Model Context Protocol server for design systems, transport-free:
// `handleMcp` takes one JSON-RPC message and returns the reply (or null for
// notifications). The web app serves it over Streamable HTTP at /api/mcp.
import { apcaLc, checkPair, evaluateChecklist, a11yReport } from '@dsvault/a11y';
import { EXPORTS, brandBookMarkdown, exportMarkdownPack } from '@dsvault/converters';
import { CHECKLIST, type SystemContent, criteriaFor } from '@dsvault/schema';

export type SystemRecord = { id: string; name: string; updatedAt: Date; content: SystemContent };
export type McpContext = {
  listSystems(): Promise<SystemRecord[]>;
  getSystem(id: string): Promise<SystemRecord | null>;
};

type Rpc = { jsonrpc: '2.0'; id?: string | number | null; method: string; params?: any };
type Reply = { jsonrpc: '2.0'; id: string | number | null; result?: unknown; error?: { code: number; message: string } };

export const PROTOCOL_VERSIONS = ['2025-06-18', '2025-03-26', '2024-11-05'];
const SERVER = { name: 'design-system-vault', title: 'Design System Vault', version: '1.0.0' };
const INSTRUCTIONS =
  'Read-only access to the user’s design systems. Start with list_systems. Before designing or writing UI for a system, call get_design_prompt for its brand book, tokens and rules, and use only its tokens. Use check_contrast before proposing any new color pair.';

const TEXT_FORMATS = EXPORTS.filter((e) => e.id !== 'sketch').map((e) => e.id);
const systemArg = { type: 'string', description: 'System id or name (from list_systems).' };
const readOnly = { readOnlyHint: true, openWorldHint: false };

export const TOOLS = [
  { name: 'list_systems', title: 'List design systems', description: 'Every design system in the vault, with its id, checklist score and token counts.', inputSchema: { type: 'object', properties: {} }, annotations: readOnly },
  { name: 'get_system', title: 'Get a design system', description: 'A summary of one system: description, token counts, themes, contrast results and checklist score.', inputSchema: { type: 'object', properties: { system: systemArg }, required: ['system'] }, annotations: readOnly },
  { name: 'get_design_prompt', title: 'Get a design prompt pack', description: 'The brand book, every token and the usage rules for one system, as markdown. Read this before designing with the system.', inputSchema: { type: 'object', properties: { system: systemArg }, required: ['system'] }, annotations: readOnly },
  { name: 'get_brand_book', title: 'Get the brand book', description: 'The brand book (vision, voice, guidelines) as markdown.', inputSchema: { type: 'object', properties: { system: systemArg }, required: ['system'] }, annotations: readOnly },
  {
    name: 'get_tokens', title: 'Export tokens', description: `The system’s tokens in a file format. Formats: ${TEXT_FORMATS.join(', ')}.`,
    inputSchema: { type: 'object', properties: { system: systemArg, format: { type: 'string', enum: TEXT_FORMATS, default: 'css' } }, required: ['system'] }, annotations: readOnly,
  },
  {
    name: 'get_component', title: 'Get a component', description: 'One component’s documentation: description, anatomy, props, variants, states, markup, styles, code and accessibility criteria. Omit name to list components.',
    inputSchema: { type: 'object', properties: { system: systemArg, name: { type: 'string', description: 'Component name, e.g. Button.' } }, required: ['system'] }, annotations: readOnly,
  },
  { name: 'get_checklist', title: 'Get checklist status', description: 'The design system checklist score and every open item, grouped by section.', inputSchema: { type: 'object', properties: { system: systemArg }, required: ['system'] }, annotations: readOnly },
  {
    name: 'check_contrast', title: 'Check a color pair', description: 'WCAG 2.2 ratio, APCA Lc and pass or fail for a foreground on a background, with the nearest passing color when it fails.',
    inputSchema: { type: 'object', properties: { foreground: { type: 'string', description: 'Hex color, e.g. #1f2321.' }, background: { type: 'string', description: 'Hex color.' }, use: { type: 'string', enum: ['text', 'large-text', 'non-text'], default: 'text' } }, required: ['foreground', 'background'] },
    annotations: readOnly,
  },
];

class ToolError extends Error {}

async function findSystem(ctx: McpContext, ref: unknown): Promise<SystemRecord> {
  const key = String(ref ?? '').trim();
  if (!key) throw new ToolError('Pass a system id or name. Call list_systems to see them.');
  const byId = await ctx.getSystem(key);
  if (byId) return byId;
  const all = await ctx.listSystems();
  const hit = all.find((s) => s.name.toLowerCase() === key.toLowerCase()) ?? all.find((s) => s.name.toLowerCase().includes(key.toLowerCase()));
  if (!hit) throw new ToolError(`No system matches "${key}". Available: ${all.map((s) => `${s.name || 'Untitled'} (${s.id})`).join(', ') || 'none'}.`);
  return hit;
}

async function callTool(ctx: McpContext, name: string, args: Record<string, unknown>): Promise<string> {
  switch (name) {
    case 'list_systems': {
      const all = await ctx.listSystems();
      if (!all.length) return 'No design systems yet.';
      return all.map((s) => {
        const t = s.content.tokens;
        return `- ${s.name || 'Untitled system'} (id: ${s.id}) — checklist ${evaluateChecklist(s.content).score}%, ${t.colors.length} colors, ${t.type.length} type styles, ${s.content.components.length} components, updated ${s.updatedAt.toISOString().slice(0, 10)}`;
      }).join('\n');
    }
    case 'get_system': {
      const s = await findSystem(ctx, args.system);
      const c = s.content, t = c.tokens, r = a11yReport(c), score = evaluateChecklist(c, r);
      const pass = r.pairs.filter((p) => p.pass).length;
      return [
        `# ${c.name || 'Untitled system'} (id: ${s.id})`, '', c.description || '_No description._', '',
        'Themes: light and dark (every color has both).',
        `Tokens: ${t.colors.length} colors, ${t.type.length} type styles, ${t.spacing.length} spacing, ${t.radius.length} radius, ${t.breakpoints.length} breakpoints, ${t.shadows.length} shadows, ${t.durations.length} durations, ${t.easings.length} easings.`,
        `Components: ${c.components.map((x) => x.name).join(', ') || 'none'}.`,
        `Contrast: ${pass} of ${r.pairs.length} declared pairs pass WCAG 2.2 in both themes.`,
        `Checklist: ${score.score}% (${score.done} of ${score.total}).`,
        '', 'Call get_design_prompt for the full brand book, tokens and rules.',
      ].join('\n');
    }
    case 'get_design_prompt':
      return exportMarkdownPack((await findSystem(ctx, args.system)).content).text;
    case 'get_brand_book':
      return brandBookMarkdown((await findSystem(ctx, args.system)).content);
    case 'get_tokens': {
      const s = await findSystem(ctx, args.system);
      const id = String(args.format ?? 'css');
      const f = EXPORTS.find((e) => e.id === id && e.id !== 'sketch');
      if (!f) throw new ToolError(`Unknown format "${id}". Use one of: ${TEXT_FORMATS.join(', ')}.`);
      const files = await f.run(s.content);
      return files.map((x) => (files.length > 1 ? `--- ${x.filename} ---\n${x.text}` : x.text ?? '')).join('\n');
    }
    case 'get_component': {
      const s = await findSystem(ctx, args.system);
      const list = s.content.components;
      if (!args.name) return list.length ? list.map((c) => `- ${c.name}${c.kind && c.kind !== c.name ? ` (${c.kind})` : ''}: ${c.description || 'no description'}`).join('\n') : 'This system has no components yet.';
      const q = String(args.name).toLowerCase();
      const c = list.find((x) => x.name.toLowerCase() === q) ?? list.find((x) => x.kind.toLowerCase() === q) ?? list.find((x) => x.name.toLowerCase().includes(q));
      if (!c) throw new ToolError(`No component "${args.name}". Components: ${list.map((x) => x.name).join(', ') || 'none'}.`);
      const crit = criteriaFor(c.kind);
      return [
        `# ${c.name}`, '', c.description, '',
        c.anatomy && `## Anatomy\n\n${c.anatomy}\n`,
        c.props.length ? `## Props\n\n| Name | Type | Default | Description |\n| --- | --- | --- | --- |\n${c.props.map((p) => `| ${p.name} | \`${p.type}\` | ${p.default} | ${p.description} |`).join('\n')}\n` : '',
        c.variants.length ? `Variants: ${c.variants.join(', ')}` : '', c.states.length ? `States: ${c.states.join(', ')}\n` : '',
        `## Accessibility\n\n${crit.map((k) => `- [${c.checks[k.key] ? 'x' : ' '}] ${k.text}`).join('\n')}\n\naxe: ${c.axe ? `${c.axe.light} issues in light, ${c.axe.dark} in dark` : 'not run'}\n`,
        c.html && `## Markup\n\n\`\`\`html\n${c.html}\n\`\`\`\n`, c.css && `## Styles\n\n\`\`\`css\n${c.css}\n\`\`\`\n`, c.code && `## Usage\n\n\`\`\`\n${c.code}\n\`\`\``,
      ].filter(Boolean).join('\n');
    }
    case 'get_checklist': {
      const s = await findSystem(ctx, args.system);
      const res = evaluateChecklist(s.content);
      const lines = [`# Checklist: ${res.score}% (${res.done} of ${res.total})`];
      for (const sec of CHECKLIST) {
        const open = sec.topics.flatMap((t) => t.items).filter((i) => !res.items[i.key]!.done);
        if (!open.length) continue;
        lines.push('', `## ${sec.title} (${open.length} open)`, ...open.map((i) => `- ${i.title}: ${res.items[i.key]!.reason || i.detail}`));
      }
      return lines.join('\n');
    }
    case 'check_contrast': {
      const use = (['text', 'large-text', 'non-text'].includes(String(args.use)) ? args.use : 'text') as 'text';
      const r = checkPair(String(args.foreground), String(args.background), use);
      if (r.ratio == null) throw new ToolError('Pass colors as 6-digit hex, e.g. #1f2321.');
      const lc = apcaLc(String(args.foreground), String(args.background));
      return `${r.ratio.toFixed(2)}:1 — WCAG 2.2 ${r.wcagPass ? 'pass' : 'fail'} for ${use.replace('-', ' ')}. APCA Lc ${Math.abs(lc ?? 0).toFixed(1)}.${r.suggestion ? ` Nearest passing foreground with the same hue: ${r.suggestion}.` : ''}`;
    }
    default:
      throw new ToolError(`Unknown tool ${name}.`);
  }
}

export async function handleMcp(msg: Rpc, ctx: McpContext): Promise<Reply | null> {
  const id = msg.id ?? null;
  const ok = (result: unknown): Reply => ({ jsonrpc: '2.0', id, result });
  const fail = (code: number, message: string): Reply => ({ jsonrpc: '2.0', id, error: { code, message } });
  if (msg.id === undefined) return null; // notifications need no reply
  switch (msg.method) {
    case 'initialize': {
      const asked = msg.params?.protocolVersion;
      return ok({
        protocolVersion: PROTOCOL_VERSIONS.includes(asked) ? asked : PROTOCOL_VERSIONS[0],
        capabilities: { tools: { listChanged: false } },
        serverInfo: SERVER,
        instructions: INSTRUCTIONS,
      });
    }
    case 'ping':
      return ok({});
    case 'tools/list':
      return ok({ tools: TOOLS });
    case 'tools/call': {
      const name = msg.params?.name;
      if (!TOOLS.some((t) => t.name === name)) return fail(-32602, `Unknown tool: ${name}`);
      try {
        return ok({ content: [{ type: 'text', text: await callTool(ctx, name, msg.params?.arguments ?? {}) }], isError: false });
      } catch (e) {
        if (e instanceof ToolError) return ok({ content: [{ type: 'text', text: e.message }], isError: true });
        throw e;
      }
    }
    default:
      return fail(-32601, `Method not found: ${msg.method}`);
  }
}
