// Serves axe-core from our own origin so sandboxed component previews can load it.
import { copyFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
mkdirSync('public', { recursive: true });
copyFileSync(require.resolve('axe-core/axe.min.js'), 'public/axe.min.js');
