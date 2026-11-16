// Bundle src/*.js with Rollup and inline the result into src/index.html, producing a single dist/index.html.
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { rollup } from 'rollup';

const root = resolve(import.meta.dirname, '..');
const src = resolve(root, 'src'), out = resolve(root, 'dist');
const TAG = '<script type="module" src="main.js"></script>';

const problems = [];
const bundle = await rollup({
  input: resolve(src, 'main.js'),
  // A circular import usually means a module boundary is in the wrong place; treat it (and any other warning) as an error.
  onwarn: w => problems.push(w.message),
});
const { output: [chunk] } = await bundle.generate({ format: 'iife' });
await bundle.close();

// Every module in src/ must end up in the page. A module that only attaches handlers and is never imported
// would otherwise be dropped silently.
const sources = readdirSync(src).filter(f => f.endsWith('.js')).map(f => resolve(src, f));
for (const f of sources) {
  const m = chunk.modules[f];
  if (!m || m.renderedLength === 0) problems.push(`${f} is not included in the bundle (is it imported from main.js?)`);
}
if (problems.length) {
  console.error(problems.map(p => '✗ ' + p).join('\n'));
  process.exit(1);
}

const html = readFileSync(resolve(src, 'index.html'), 'utf8');
if (html.split(TAG).length !== 2) throw new Error(`src/index.html must contain ${TAG} exactly once`);
if (chunk.code.includes('</script')) throw new Error('the bundle contains "</script", which would end the inline script early');
mkdirSync(out, { recursive: true });
const page = html.replace(TAG, () => `<script>\n${chunk.code.trimEnd()}\n</script>`);
writeFileSync(resolve(out, 'index.html'), page);
console.log(`dist/index.html: ${Buffer.byteLength(page)} bytes, ${sources.length} modules`);
