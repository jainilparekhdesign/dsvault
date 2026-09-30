// CSS box-shadow parsing shared by exporters that need structured shadows.
export type ParsedShadow = { x: number; y: number; blur: number; spread: number; color: string; inset: boolean };

export function parseBoxShadow(css: string): ParsedShadow[] {
  return css.split(/,(?![^(]*\))/).map((s) => s.trim()).filter(Boolean).flatMap((p) => {
    const inset = /\binset\b/.test(p);
    const color = p.match(/(rgba?\([^)]*\)|hsla?\([^)]*\)|#[0-9a-f]{3,8})/i)?.[1] ?? 'rgba(0, 0, 0, 0.25)';
    const nums = p.replace(color, '').replace('inset', '').trim().split(/\s+/).map((n) => parseFloat(n)).filter((n) => !Number.isNaN(n));
    return nums.length < 2 ? [] : [{ x: nums[0]!, y: nums[1]!, blur: nums[2] ?? 0, spread: nums[3] ?? 0, color, inset }];
  });
}
