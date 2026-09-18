import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = process.cwd();
const source = fs.readFileSync(path.join(root, '.context/ab/director-macro-cycle-4/v31/assemble-evidence-v31.mjs'), 'utf8')
  .replaceAll('V31', 'V32')
  .replaceAll('v31', 'v32')
  .replace('Campus still reads as a sparse constructed blockout with localized industrial families, not a consistently operational campus at supplied reference density.', 'Campus has more camera-visible contacts, but still fails supplied reference density, layered perimeter context, and consistently operational yards.');
const temporaryPath = path.join(root, '.context/ab/director-macro-cycle-4/v32/.runtime-assemble-evidence-v32.mjs');
fs.writeFileSync(temporaryPath, source);
try {
  await import(`${pathToFileURL(temporaryPath).href}?v32=1`);
} finally {
  fs.rmSync(temporaryPath, { force: true });
}
