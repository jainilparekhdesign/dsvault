// Document operations: read a snapshot, apply a plan, check contrast.
// Kept apart from code.ts so a test harness can run them without the UI.
import { checkPair } from '@dsvault/a11y/src/contrast';
import type { DesiredEffectStyle, DesiredTextStyle, DesiredVariable, Op, PullPlan } from './sync';
import { type FigmaSnapshot, type Mode, type RGBA, type VarValue, formatShadows, fromRGBA, parseShadows } from './values';

const KEY = 'vaultId';
const SYSTEM_KEY = 'vaultSystem';

/** Where links between Figma objects and vault tokens are kept. The plugin uses plugin data. */
type Store = { get(node: PluginDataMixin & { id: string }, key: string): string; set(node: PluginDataMixin & { id: string }, key: string, value: string): void };
let store: Store = { get: (n, k) => n.getPluginData(k), set: (n, k, v) => n.setPluginData(k, v) };
export function useStore(s: Store) { store = s; }

// ---- snapshot ----

async function findCollection(systemId: string, systemName: string) {
  const all = await figma.variables.getLocalVariableCollectionsAsync();
  return all.find((c) => store.get(c, SYSTEM_KEY) === systemId) ?? all.find((c) => c.name === systemName) ?? null;
}

function modeIds(collection: VariableCollection): Record<Mode, string> {
  const find = (n: string) => collection.modes.find((m) => m.name.toLowerCase() === n)?.modeId;
  const first = collection.modes[0]!.modeId;
  return { light: find('light') ?? first, dark: find('dark') ?? collection.modes[1]?.modeId ?? first };
}

async function resolve(v: Variable, modeId: string, depth = 0): Promise<VarValue> {
  const raw = v.valuesByMode[modeId];
  if (raw && typeof raw === 'object' && 'type' in raw && raw.type === 'VARIABLE_ALIAS' && depth < 8) {
    const target = await figma.variables.getVariableByIdAsync(raw.id);
    if (target) return resolve(target, Object.keys(target.valuesByMode)[0]!, depth + 1);
  }
  if (raw && typeof raw === 'object' && 'r' in raw) { const c = raw as RGB & { a?: number }; return { r: c.r, g: c.g, b: c.b, a: c.a ?? 1 }; }
  return raw as number | string;
}

const pxOrNull = (lh: LineHeight) => (lh.unit === 'PIXELS' ? lh.value : null);
const spacingCss = (ls: LetterSpacing) => (!ls.value ? '' : ls.unit === 'PERCENT' ? `${+(ls.value / 100).toFixed(4)}em` : `${ls.value}px`);

export async function snapshot(systemId: string, systemName: string): Promise<FigmaSnapshot> {
  const col = await findCollection(systemId, systemName);
  const variables: FigmaSnapshot['variables'] = [];
  if (col) {
    const modes = modeIds(col);
    for (const id of col.variableIds) {
      const v = await figma.variables.getVariableByIdAsync(id);
      if (!v || !['COLOR', 'FLOAT', 'STRING'].includes(v.resolvedType)) continue;
      variables.push({
        figmaId: v.id, vaultId: store.get(v, KEY) || null, name: v.name, type: v.resolvedType as 'COLOR' | 'FLOAT' | 'STRING', description: v.description,
        values: { light: await resolve(v, modes.light), dark: await resolve(v, modes.dark) },
      });
    }
  }
  const mine = <S extends BaseStyle>(s: S) => store.get(s, SYSTEM_KEY) === systemId || s.name.startsWith(`${systemName}/`);
  const textStyles = (await figma.getLocalTextStylesAsync()).filter(mine).map((s) => ({
    figmaId: s.id, vaultId: store.get(s, KEY) || null, name: s.name, family: s.fontName.family, style: s.fontName.style,
    size: s.fontSize, lineHeight: pxOrNull(s.lineHeight), letterSpacing: spacingCss(s.letterSpacing),
  }));
  const effectStyles = (await figma.getLocalEffectStylesAsync()).filter(mine).map((s) => ({
    figmaId: s.id, vaultId: store.get(s, KEY) || null, name: s.name,
    value: formatShadows(s.effects.filter((e): e is DropShadowEffect | InnerShadowEffect => e.type === 'DROP_SHADOW' || e.type === 'INNER_SHADOW').map((e) => ({
      x: e.offset.x, y: e.offset.y, blur: e.radius, spread: e.spread ?? 0, color: e.color, inset: e.type === 'INNER_SHADOW',
    }))),
  }));
  return { collection: col?.name ?? null, variables, textStyles, effectStyles };
}

// ---- apply ----

const toFigma = (v: VarValue): VariableValue => (typeof v === 'object' ? { r: v.r, g: v.g, b: v.b, a: v.a } : v);

export async function apply(systemId: string, plan: PullPlan) {
  let done = 0;
  const failed: string[] = [];
  let col = await findCollection(systemId, plan.collectionName);
  if (!col) {
    col = figma.variables.createVariableCollection(plan.collectionName);
    col.renameMode(col.modes[0]!.modeId, 'Light');
    col.addMode('Dark');
    done++;
  }
  store.set(col, SYSTEM_KEY, systemId);
  if (col.name !== plan.collectionName) col.name = plan.collectionName;
  if (!col.modes.some((m) => m.name.toLowerCase() === 'dark')) col.addMode('Dark');
  const modes = modeIds(col);

  const setVar = (v: Variable, want: DesiredVariable) => {
    v.name = want.name;
    v.description = want.description;
    store.set(v, KEY, want.vaultId);
    v.scopes = want.scopes as VariableScope[];
    v.setVariableCodeSyntax('WEB', want.css);
    v.setValueForMode(modes.light, toFigma(want.values.light));
    v.setValueForMode(modes.dark, toFigma(want.values.dark));
  };
  for (const op of plan.variables) {
    try {
      if (op.op === 'create') setVar(figma.variables.createVariable(op.want.name, col, op.want.type), op.want);
      else if (op.op === 'update') {
        let v = await figma.variables.getVariableByIdAsync(op.figmaId);
        if (v && v.resolvedType !== op.want.type) { v.remove(); v = null; }
        setVar(v ?? figma.variables.createVariable(op.want.name, col, op.want.type), op.want);
      } else (await figma.variables.getVariableByIdAsync(op.figmaId))?.remove();
      done++;
    } catch (e) { failed.push(`${label(op)}: ${(e as Error).message}`); }
  }

  const textById = new Map((await figma.getLocalTextStylesAsync()).map((s) => [s.id, s]));
  for (const op of plan.textStyles) {
    try {
      if (op.op === 'remove') { textById.get(op.figmaId)?.remove(); done++; continue; }
      const s = op.op === 'update' ? textById.get(op.figmaId) ?? figma.createTextStyle() : figma.createTextStyle();
      await setText(s, op.want, systemId);
      done++;
    } catch (e) { failed.push(`${label(op)}: ${(e as Error).message}`); }
  }

  const effectById = new Map((await figma.getLocalEffectStylesAsync()).map((s) => [s.id, s]));
  for (const op of plan.effectStyles) {
    try {
      if (op.op === 'remove') { effectById.get(op.figmaId)?.remove(); done++; continue; }
      const s = op.op === 'update' ? effectById.get(op.figmaId) ?? figma.createEffectStyle() : figma.createEffectStyle();
      setEffect(s, op.want, systemId);
      done++;
    } catch (e) { failed.push(`${label(op)}: ${(e as Error).message}`); }
  }
  return { done, failed };
}

function label(op: Op<{ name: string }>) {
  return op.op === 'remove' ? op.name : op.want.name;
}

async function setText(s: TextStyle, want: DesiredTextStyle, systemId: string) {
  let font: FontName = { family: want.family, style: want.style };
  try { await figma.loadFontAsync(font); }
  catch {
    // Fall back to the family's closest available style, then to Inter.
    const fonts = (await figma.listAvailableFontsAsync()).filter((f) => f.fontName.family === want.family);
    font = fonts.find((f) => f.fontName.style === 'Regular')?.fontName ?? fonts[0]?.fontName ?? { family: 'Inter', style: 'Regular' };
    await figma.loadFontAsync(font);
  }
  s.name = want.name;
  s.fontName = font;
  s.fontSize = want.size;
  s.lineHeight = { unit: 'PIXELS', value: want.lineHeight };
  const em = want.letterSpacing.match(/^(-?[\d.]+)em$/), px = want.letterSpacing.match(/^(-?[\d.]+)px$/);
  s.letterSpacing = em ? { unit: 'PERCENT', value: parseFloat(em[1]!) * 100 } : px ? { unit: 'PIXELS', value: parseFloat(px[1]!) } : { unit: 'PERCENT', value: 0 };
  store.set(s, KEY, want.vaultId);
  store.set(s, SYSTEM_KEY, systemId);
}

function setEffect(s: EffectStyle, want: DesiredEffectStyle, systemId: string) {
  s.name = want.name;
  s.effects = parseShadows(want.value).map((x) => ({
    type: x.inset ? 'INNER_SHADOW' : 'DROP_SHADOW', color: x.color, offset: { x: x.x, y: x.y }, radius: x.blur, spread: x.spread,
    visible: true, blendMode: 'NORMAL', ...(x.inset ? {} : { showShadowBehindNode: false }),
  }) as Effect);
  store.set(s, KEY, want.vaultId);
  store.set(s, SYSTEM_KEY, systemId);
}

// ---- contrast on selection ----

type ContrastResult = { name: string; fg: string; bg: string; ratio: number | null; large: boolean; pass: boolean; suggestion: string | null; note?: string };

function solid(paints: readonly Paint[] | typeof figma.mixed): RGBA | null {
  if (paints === figma.mixed) return null;
  const p = [...paints].reverse().find((x) => x.visible !== false && x.type === 'SOLID') as SolidPaint | undefined;
  return p ? { ...p.color, a: (p.opacity ?? 1) } : null;
}

function backgroundFor(node: SceneNode): RGBA | null {
  let n: BaseNode | null = node.parent;
  while (n && n.type !== 'PAGE' && n.type !== 'DOCUMENT') {
    if ('fills' in n) { const c = solid((n as GeometryMixin).fills); if (c && c.a > 0.99) return c; }
    n = n.parent;
  }
  const page = figma.currentPage.backgrounds;
  return solid(page) ?? { r: 1, g: 1, b: 1, a: 1 };
}

export async function contrast(): Promise<ContrastResult[]> {
  const texts: TextNode[] = [];
  const walk = (n: SceneNode) => {
    if (texts.length >= 200) return;
    if (n.type === 'TEXT') texts.push(n);
    else if ('children' in n) n.children.forEach(walk);
  };
  figma.currentPage.selection.forEach(walk);
  return texts.map((t) => {
    const fg = solid(t.fills), bg = backgroundFor(t);
    const size = t.fontSize === figma.mixed ? 16 : t.fontSize;
    const weight = t.fontWeight === figma.mixed ? 400 : t.fontWeight;
    const large = size >= 24 || (size >= 18.66 && weight >= 700);
    if (!fg || !bg) return { name: t.name, fg: '', bg: '', ratio: null, large, pass: false, suggestion: null, note: 'Mixed or non-solid fill.' };
    // Blend a translucent text color over its background before measuring.
    const mix = (k: 'r' | 'g' | 'b') => fg[k] * fg.a + bg[k] * (1 - fg.a);
    const fgHex = fromRGBA({ r: mix('r'), g: mix('g'), b: mix('b'), a: 1 }), bgHex = fromRGBA(bg);
    const r = checkPair(fgHex, bgHex, large ? 'large-text' : 'text');
    return { name: t.name, fg: fgHex, bg: bgHex, ratio: r.ratio, large, pass: r.wcagPass, suggestion: r.suggestion };
  });
}
