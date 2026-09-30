// Test harness: exposes the document operations on globalThis so they can be
// run in a real Figma file without the plugin UI. Plans are computed outside.
// Links live in memory here, since the test runner doesn't allow plugin data.
import { apply, contrast, snapshot, useStore } from './figma-ops';

const mem = new Map<string, string>();
useStore({ get: (n, k) => mem.get(`${n.id}:${k}`) ?? '', set: (n, k, v) => { mem.set(`${n.id}:${k}`, v); } });
(globalThis as any).dsvault = { apply, contrast, snapshot };
