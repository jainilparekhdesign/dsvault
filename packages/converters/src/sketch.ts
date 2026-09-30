import type { SystemContent } from '@dsvault/schema';
import JSZip from 'jszip';
import { type ImportResult, finish, idFor } from './util';

// Sketch .sketch files are zipped JSON (document.json, pages/*.json,
// meta.json, user.json). We write colors as Color Variables (swatches) named
// "Light/<name>" and "Dark/<name>", and type as shared text styles. Output is
// validated against the official Sketch file-format schema in tests.

const uuid = () =>
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16).toUpperCase();
  });

type Color = { _class: 'color'; alpha: number; red: number; green: number; blue: number };

export function cssToSketchColor(v: string): Color | null {
  const hex = v.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i)?.[1];
  if (hex) {
    const h = hex.length === 3 ? hex.split('').map((c) => c + c).join('') : hex;
    const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
    return { _class: 'color', alpha: 1, red: r!, green: g!, blue: b! };
  }
  const m = v.trim().match(/^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+))?\s*\)$/i);
  if (!m) return null;
  return { _class: 'color', alpha: m[4] == null ? 1 : +m[4], red: +m[1]! / 255, green: +m[2]! / 255, blue: +m[3]! / 255 };
}

export function sketchColorToCss(c: Color): string {
  const b = (v: number) => Math.round(Math.min(1, Math.max(0, v)) * 255);
  if (c.alpha < 0.999) return `rgba(${b(c.red)}, ${b(c.green)}, ${b(c.blue)}, ${Math.round(c.alpha * 100) / 100})`;
  return `#${[c.red, c.green, c.blue].map((v) => b(v).toString(16).padStart(2, '0')).join('')}`;
}

const WEIGHTS: Record<number, string> = { 100: 'Thin', 200: 'ExtraLight', 300: 'Light', 400: 'Regular', 500: 'Medium', 600: 'SemiBold', 700: 'Bold', 800: 'ExtraBold', 900: 'Black' };
const psName = (family: string, weight: number) => `${family.replace(/\s+/g, '')}-${WEIGHTS[Math.round(weight / 100) * 100] ?? 'Regular'}`;

function style(textStyle?: object) {
  return {
    _class: 'style', do_objectID: uuid(), endMarkerType: 0, miterLimit: 10, startMarkerType: 0, windingRule: 1,
    blur: { _class: 'blur', isEnabled: false, center: '{0.5, 0.5}', motionAngle: 0, radius: 10, saturation: 1, type: 0 },
    borderOptions: { _class: 'borderOptions', isEnabled: true, dashPattern: [], lineCapStyle: 0, lineJoinStyle: 0 },
    borders: [], fills: [], shadows: [], innerShadows: [],
    colorControls: { _class: 'colorControls', isEnabled: false, brightness: 0, contrast: 1, hue: 0, saturation: 1 },
    contextSettings: { _class: 'graphicsContextSettings', blendMode: 0, opacity: 1 },
    ...(textStyle ? { textStyle } : {}),
  };
}

export function sketchDocument(c: SystemContent) {
  const t = c.tokens;
  const pageId = uuid();
  const swatches = (['light', 'dark'] as const).flatMap((mode) => t.colors.flatMap((x) => {
    const value = cssToSketchColor(x[mode]);
    return value ? [{ _class: 'swatch', do_objectID: uuid(), name: `${mode === 'light' ? 'Light' : 'Dark'}/${x.name}`, value }] : [];
  }));
  const text = cssToSketchColor(t.colors.find((x) => x.role === 'text')?.light ?? '#000000') ?? cssToSketchColor('#000000')!;
  const textStyles = t.type.map((x) => {
    const em = x.letterSpacing.match(/^(-?[\d.]+)em$/), pxv = x.letterSpacing.match(/^(-?[\d.]+)px$/);
    const kerning = em ? parseFloat(em[1]!) * x.size : pxv ? parseFloat(pxv[1]!) : 0;
    return {
      _class: 'sharedStyle', do_objectID: uuid(), name: `${c.name || 'System'}/${x.name}`,
      value: style({
        _class: 'textStyle', verticalAlignment: 0,
        encodedAttributes: {
          MSAttributedStringFontAttribute: { _class: 'fontDescriptor', attributes: { name: psName(x.family || 'Helvetica', x.weight), size: x.size } },
          MSAttributedStringColorAttribute: text,
          paragraphStyle: { _class: 'paragraphStyle', alignment: 0, minimumLineHeight: x.lineHeight, maximumLineHeight: x.lineHeight },
          textStyleVerticalAlignmentKey: 0,
          ...(kerning ? { kerning } : {}),
        },
      }),
    };
  });
  const document = {
    _class: 'document', do_objectID: uuid(), colorSpace: 1, currentPageIndex: 0,
    assets: { _class: 'assetCollection', do_objectID: uuid(), colorAssets: [], gradientAssets: [], images: [], colors: [], gradients: [], exportPresets: [] },
    foreignLayerStyles: [], foreignSymbols: [], foreignTextStyles: [], foreignSwatches: [], perDocumentLibraries: [],
    layerStyles: { _class: 'sharedStyleContainer', do_objectID: uuid(), objects: [] },
    layerTextStyles: { _class: 'sharedTextStyleContainer', do_objectID: uuid(), objects: textStyles },
    sharedSwatches: { _class: 'swatchContainer', do_objectID: uuid(), objects: swatches },
    pages: [{ _class: 'MSJSONFileReference', _ref_class: 'MSImmutablePage', _ref: `pages/${pageId}` }],
  };
  const page = {
    _class: 'page', do_objectID: pageId, name: 'Tokens', booleanOperation: -1, isFixedToViewport: false, isFlippedHorizontal: false, isFlippedVertical: false,
    isLocked: false, isTemplate: false, isVisible: true, layerListExpandedType: 0, nameIsFixed: false, resizingConstraint: 63, resizingType: 0, rotation: 0,
    shouldBreakMaskChain: false, hasClickThrough: true, layers: [],
    exportOptions: { _class: 'exportOptions', exportFormats: [], includedLayerIds: [], layerOptions: 0, shouldTrim: false },
    frame: { _class: 'rect', constrainProportions: true, height: 0, width: 0, x: 0, y: 0 },
    horizontalRulerData: { _class: 'rulerData', base: 0, guides: [] },
    verticalRulerData: { _class: 'rulerData', base: 0, guides: [] },
    groupLayout: { _class: 'MSImmutableFreeformGroupLayout' },
    style: style(),
  };
  const commit = '0000000000000000000000000000000000000000';
  const meta = {
    commit, appVersion: '99.0', build: 0, app: 'com.bohemiancoding.sketch3', autosaved: 0, variant: 'NONAPPSTORE', version: 146, compatibilityVersion: 99,
    created: { commit, appVersion: '99.0', build: 0, app: 'com.bohemiancoding.sketch3', compatibilityVersion: 99, variant: 'NONAPPSTORE', version: 146 },
    saveHistory: ['NONAPPSTORE.0'], pagesAndArtboards: { [pageId]: { name: 'Tokens', artboards: {} } },
  };
  const user = { document: { pageListHeight: 85, pageListCollapsed: 0 } };
  return { document, page, pageId, meta, user };
}

export async function exportSketch(c: SystemContent): Promise<Uint8Array> {
  const { document, page, pageId, meta, user } = sketchDocument(c);
  const zip = new JSZip();
  zip.file('document.json', JSON.stringify(document));
  zip.file(`pages/${pageId}.json`, JSON.stringify(page));
  zip.file('meta.json', JSON.stringify(meta));
  zip.file('user.json', JSON.stringify(user));
  return zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });
}

/** Colors from swatches (or document colors) and type from shared text styles. */
export async function importSketch(bytes: Uint8Array, name = ''): Promise<ImportResult> {
  const warnings: string[] = [];
  const zip = await JSZip.loadAsync(bytes);
  const docFile = zip.file('document.json');
  if (!docFile) throw Object.assign(new Error('That isn’t a Sketch file: document.json is missing.'), { name: 'ImportError' });
  const doc = JSON.parse(await docFile.async('string'));
  const byName = new Map<string, { light?: string; dark?: string }>();
  const put = (full: string, css: string) => {
    const m = full.match(/^(light|dark)\/(.+)$/i);
    const key = m ? m[2]! : full;
    const e = byName.get(key) ?? {};
    if (m && m[1]!.toLowerCase() === 'dark') e.dark = css; else e.light = css;
    byName.set(key, e);
  };
  for (const s of doc.sharedSwatches?.objects ?? []) put(s.name, sketchColorToCss(s.value));
  for (const a of doc.assets?.colorAssets ?? []) put(a.name || `color-${byName.size + 1}`, sketchColorToCss(a.color));
  const colors = [...byName].map(([n, e]) => ({ id: idFor('color', n), name: n.replace(/\//g, '-'), light: e.light ?? e.dark!, dark: e.dark ?? e.light!, usage: '', role: '' }));
  const type = (doc.layerTextStyles?.objects ?? []).flatMap((s: any) => {
    const a = s.value?.textStyle?.encodedAttributes;
    const font = a?.MSAttributedStringFontAttribute?.attributes;
    if (!font) return [];
    const [family = '', styleName = 'Regular'] = String(font.name).split('-');
    const weight = Number(Object.entries(WEIGHTS).find(([, n]) => n.toLowerCase() === styleName.toLowerCase())?.[0] ?? 400);
    const leaf = String(s.name).split('/').pop()!;
    const lh = a.paragraphStyle?.maximumLineHeight ?? a.paragraphStyle?.minimumLineHeight;
    if (!lh) warnings.push(`${s.name} has automatic line height; set to 1.5×.`);
    const kerning = Number(a.kerning ?? 0);
    return [{
      id: idFor('type', leaf), name: leaf, family: family.replace(/([a-z])([A-Z])/g, '$1 $2'), size: font.size, lineHeight: lh || Math.round(font.size * 1.5), weight,
      letterSpacing: kerning ? `${+(kerning / font.size).toFixed(4)}em` : '', sample: '',
    }];
  });
  if (!colors.length && !type.length) warnings.push('No color variables, document colors or text styles found.');
  return finish({ name: name || doc.name || '', tokens: { colors, type } }, warnings);
}
