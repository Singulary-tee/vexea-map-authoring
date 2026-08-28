#!/usr/bin/env node
// check-editor-html.mjs — VM/codespace-safe sanity: parses editor HTML, extracts the
// module script, and syntax-checks the logic (imports stripped). Also verifies the
// referenced blockout file loads and validates. Usage: node tools/check-editor-html.mjs
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const htmlPath = join(root, 'editor/index.html');
const html = readFileSync(htmlPath, 'utf8');

const m = html.match(/<script type="module">([\s\S]*?)<\/script>/);
if (!m) { console.error('NO MODULE SCRIPT'); process.exit(1); }
const srcLines = m[1].split('\n').filter(l => !/^import\s/.test(l.trim()));
const src = srcLines.join('\n');
let err = null;
try { new Function(src); } catch (e) { err = e.message; }
console.log(err ? `EDITOR JS FAIL: ${err}` : `EDITOR JS PARSES OK (${m[1].split('\n').length} script lines)`);
if (err) process.exit(1);

// referenced blockout fetch path
const ref = html.match(/fetch\(['"]([^'"]+)['"]\)/);
if (ref) {
  const p = join(root, 'editor', ref[1].replace('./', '')); // page dir
  try { const b = JSON.parse(readFileSync(p, 'utf8'));
    console.log(`editor default load -> ${ref[1]} resolves to ${p.replace(root + '/', '')} (${b.segments?.length ?? 0} segments)`);
  } catch (e) { console.error(`editor default load target missing/bad: ${ref[1]} (${e.message})`); process.exit(1); }
}
console.log('EDITOR CHECK GREEN');