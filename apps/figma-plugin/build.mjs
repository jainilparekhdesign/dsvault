// Bundles the main thread (code.js) and inlines the UI script into ui.html,
// since Figma loads the UI as a single HTML string.
import { build } from 'esbuild';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const watch = process.argv.includes('--watch');
mkdirSync('dist', { recursive: true });
const common = { bundle: true, minify: !watch, target: 'es2019', logLevel: 'info' };

await build({ ...common, entryPoints: ['src/code.ts'], outfile: 'dist/code.js', format: 'iife' });
const ui = await build({ ...common, entryPoints: ['src/ui.ts'], write: false, format: 'iife' });
const js = ui.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
writeFileSync('dist/ui.html', readFileSync('src/ui.html', 'utf8').replace('/*__UI_SCRIPT__*/', () => js));
if (process.argv.includes('--harness')) await build({ ...common, minify: true, entryPoints: ['src/harness.ts'], outfile: 'dist/harness.js', format: 'iife' });
console.log('Built dist/code.js and dist/ui.html');
