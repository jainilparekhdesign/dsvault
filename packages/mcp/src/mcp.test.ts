import { emptySystem } from '@dsvault/schema';
import { describe, expect, it } from 'vitest';
import { type McpContext, TOOLS, handleMcp } from './index';

const sys = emptySystem('Portfolio');
sys.tokens.colors = [
  { id: 'bg', name: 'paper', light: '#f5f6f3', dark: '#141715', usage: 'Page', role: 'background' },
  { id: 'fg', name: 'graphite', light: '#1f2321', dark: '#e6e9e4', usage: 'Text', role: 'text' },
];
sys.tokens.pairs = [{ id: 'p', fg: 'fg', bg: 'bg', kind: 'text' }];
sys.components = [{ id: 'b', name: 'Button', kind: 'Button', description: 'Starts an action.', anatomy: '', props: [{ name: 'variant', type: 'string', default: 'secondary', description: '' }], variants: [], states: [], html: '<button>Go</button>', css: '', code: '', checks: { kbd: true }, axe: { light: 0, dark: 0, at: '' } }];
const ctx: McpContext = {
  listSystems: async () => [{ id: 's1', name: 'Portfolio', updatedAt: new Date('2026-09-30'), content: sys }],
  getSystem: async (id) => (id === 's1' ? { id: 's1', name: 'Portfolio', updatedAt: new Date('2026-09-30'), content: sys } : null),
};
const call = async (name: string, args: object = {}) => {
  const r: any = await handleMcp({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name, arguments: args } }, ctx);
  return { text: r.result.content[0].text as string, isError: r.result.isError as boolean };
};

describe('MCP server', () => {
  it('initializes, negotiating the protocol version', async () => {
    const r: any = await handleMcp({ jsonrpc: '2.0', id: 0, method: 'initialize', params: { protocolVersion: '2025-03-26' } }, ctx);
    expect(r.result.protocolVersion).toBe('2025-03-26');
    expect(r.result.capabilities.tools).toBeDefined();
    expect(await handleMcp({ jsonrpc: '2.0', method: 'notifications/initialized' }, ctx)).toBeNull();
  });
  it('lists read-only tools', async () => {
    const r: any = await handleMcp({ jsonrpc: '2.0', id: 1, method: 'tools/list' }, ctx);
    expect(r.result.tools.map((t: any) => t.name)).toEqual(TOOLS.map((t) => t.name));
    expect(r.result.tools.every((t: any) => t.annotations.readOnlyHint)).toBe(true);
  });
  it('finds systems by id or name and answers each tool', async () => {
    expect((await call('list_systems')).text).toContain('Portfolio (id: s1)');
    expect((await call('get_system', { system: 'portfolio' })).text).toContain('1 of 1 declared pairs pass');
    expect((await call('get_design_prompt', { system: 's1' })).text).toContain('`--graphite`');
    expect((await call('get_tokens', { system: 's1', format: 'css' })).text).toContain('--paper: #f5f6f3;');
    expect((await call('get_tokens', { system: 's1', format: 'style-dictionary' })).text).toContain('--- sd.config.mjs ---');
    expect((await call('get_component', { system: 's1', name: 'button' })).text).toContain('- [x] Every interactive part');
    expect((await call('get_checklist', { system: 's1' })).text).toMatch(/^# Checklist: \d+%/);
    expect((await call('check_contrast', { foreground: '#777777', background: '#ffffff' })).text).toMatch(/4\.48:1 — WCAG 2\.2 fail.*Nearest passing/);
  });
  it('reports usage mistakes as tool errors, not protocol errors', async () => {
    const r = await call('get_system', { system: 'nope' });
    expect(r.isError).toBe(true);
    expect(r.text).toContain('Available: Portfolio (s1)');
    const bad: any = await handleMcp({ jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'delete_everything' } }, ctx);
    expect(bad.error.code).toBe(-32602);
  });
});
