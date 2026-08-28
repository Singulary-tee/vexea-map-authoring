#!/usr/bin/env node
// gen-slice-cw-geometry.mjs — compile Courtyard<->Warehouse slice blockout + grammar
// into a real Three.js GLB (promoted geometry). INTENDED RUN ON THE CODESPACE (needs three).
// In the game repo node_modules resolve; run from repo root:
//   NODE_PATH=<gameRepo>/node_modules node tools/gen-slice-cw-geometry.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = p => JSON.parse(readFileSync(join(root, p), 'utf8'));
const blockout = read('blockout/blockout-slice-cw.json');

let THREE, GLTFExporter;
try {
  THREE = await import('three'); // r184: named exports on the namespace (import * as THREE)
  GLTFExporter = (await import('three/examples/jsm/exporters/GLTFExporter.js')).GLTFExporter;
} catch (e) {
  console.error('three import failed (run on codespace in the game repo, or set NODE_PATH):', e.message);
  process.exit(2);
}

const scene = new THREE.Scene();
const mat = c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.85 });

for (const s of blockout.segments){
  if (!s.bounds) continue;
  const [minX, minZ] = s.bounds.min, [maxX, maxZ] = s.bounds.max;
  const w = maxX - minX, d = maxZ - minZ;
  let h = s.height ?? 4, yBase = 0;
  if (s.bounds.y) { yBase = s.bounds.y.min; h = s.bounds.y.max - s.bounds.y.min; }
  let col = 0x5a5a5a;
  if (s.category === 'ground-surface-type') { col = 0x8a8a8a; h = 0.5; }
  else if (s.category === 'road') col = 0x2e2e2e;
  else if (s.category === 'warehouse-enterable') col = 0x7a6a4a;
  else if (s.category === 'building-enterable') col = 0x8a8a9a;
  else if (s.category === 'service-pressure') col = 0x9a8a3a;
  else if (s.category === 'wall-blocking') col = 0x6a6a6a;
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(col));
  mesh.position.set((minX + maxX) / 2, yBase + h / 2, (minZ + maxZ) / 2);
  mesh.name = s.id;
  scene.add(mesh);
}

const exporter = new GLTFExporter();
exporter.parse(scene, gltf => {
  const out = join(root, 'out'); mkdirSync(out, { recursive: true });
  const file = join(out, 'cw-slice.glb');
  writeFileSync(file, Buffer.from(gltf));
  console.log('WROTE', file, Buffer.from(gltf).length, 'bytes; segments', blockout.segments.length);
}, e => console.error('export err', e), { binary: true });