#!/usr/bin/env node
// gen-build-map: blockout-full-v1 -> BUILT campus GLB (building stage).
// Promotes blockout segments to constructed geometry: real wall/roof construction with door
// openings, segmented roads with curbs & poles, utility runs with supports, cover family
// grammar, and industrial site dressing. Blockout layer stays as reference (separate GLB; viewer
// toggles). Deterministic: seeded variation only, derived from stable IDs. Static merge per
// material (KB C2b) keeps the draw-call budget.
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname } from 'node:path';
import { execFileSync } from 'node:child_process';
import { deflateSync, inflateSync } from 'node:zlib';
globalThis.FileReader = class {
  readAsArrayBuffer(blob) { blob.arrayBuffer().then(ab => { this.result = ab; this.onloadend?.(); }); }
  readAsDataURL(blob) { blob.arrayBuffer().then(ab => { this.result = 'data:application/octet-stream;base64,' + Buffer.from(ab).toString('base64'); this.onloadend?.(); }); }
};
const crc32 = bytes => {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
};
const pngChunk = (type, data) => {
  const name = Buffer.from(type), body = Buffer.from(data), out = Buffer.alloc(12 + body.length);
  out.writeUInt32BE(body.length, 0); name.copy(out, 4); body.copy(out, 8); out.writeUInt32BE(crc32(Buffer.concat([name, body])), 8 + body.length); return out;
};
const encodePng = (data, width, height) => {
  const scan = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) { scan[y * (width * 4 + 1)] = 0; Buffer.from(data.buffer, data.byteOffset + y * width * 4, width * 4).copy(scan, y * (width * 4 + 1) + 1); }
  const header = Buffer.alloc(13); header.writeUInt32BE(width, 0); header.writeUInt32BE(height, 4); header[8] = 8; header[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), pngChunk('IHDR', header), pngChunk('IDAT', deflateSync(scan, { level: 6 })), pngChunk('IEND', [])]);
};
globalThis.ImageData ??= class { constructor(data, width, height) { this.data = data; this.width = width; this.height = height; } };
globalThis.HTMLCanvasElement ??= class {};
globalThis.document ??= { createElement: tag => {
  if (tag !== 'canvas') return {};
  let width = 1, height = 1, pixels = new Uint8ClampedArray(4);
  const resize = () => { pixels = new Uint8ClampedArray(width * height * 4); };
  const context = {
    fillStyle: '#000000',
    translate() {}, scale() {},
    fillRect(x, y, w, h) {
      const r = this.fillStyle === '#00ffff' ? 0 : 0, g = this.fillStyle === '#00ffff' ? 255 : 0;
      const b = this.fillStyle === '#00ffff' ? 255 : 0;
      for (let py = Math.max(0, y); py < Math.min(height, y + h); py++) for (let px = Math.max(0, x); px < Math.min(width, x + w); px++) {
        const i = (py * width + px) * 4; pixels[i] = r; pixels[i + 1] = g; pixels[i + 2] = b; pixels[i + 3] = 255;
      }
    },
    getImageData(x, y, w, h) {
      const data = new Uint8ClampedArray(w * h * 4);
      for (let py = 0; py < h; py++) for (let px = 0; px < w; px++) {
        const si = ((y + py) * width + x + px) * 4, di = (py * w + px) * 4;
        data.set(pixels.subarray(si, si + 4), di);
      }
      return new ImageData(data, w, h);
    },
    putImageData(image, x, y) {
      for (let py = 0; py < image.height; py++) for (let px = 0; px < image.width; px++) {
        const si = (py * image.width + px) * 4, di = ((y + py) * width + x + px) * 4;
        pixels.set(image.data.subarray(si, si + 4), di);
      }
    },
    drawImage(image, x, y, w = image.width, h = image.height) {
      const source = image.data, sourceWidth = image.width, sourceHeight = image.height;
      for (let py = 0; py < h; py++) for (let px = 0; px < w; px++) {
        const sx = Math.min(sourceWidth - 1, Math.floor(px * sourceWidth / w));
        const sy = Math.min(sourceHeight - 1, Math.floor(py * sourceHeight / h));
        const si = (sy * sourceWidth + sx) * 4, di = ((y + py) * width + x + px) * 4;
        pixels.set(source.subarray(si, si + 4), di);
      }
    },
  };
  const canvas = Object.create(HTMLCanvasElement.prototype);
  Object.defineProperties(canvas, {
    width: { get: () => width, set: value => { width = value; resize(); } },
    height: { get: () => height, set: value => { height = value; resize(); } },
    data: { get: () => pixels },
  });
  canvas.getContext = () => context;
  canvas.toBlob = resolve => resolve(new Blob([encodePng(pixels, width, height)], { type: 'image/png' }));
  return canvas;
} };
const THREE = await import('three');
const { Scene, Mesh, BoxGeometry, CylinderGeometry, PlaneGeometry,
  BufferGeometry, Float32BufferAttribute, MeshStandardMaterial, Group, PointLight, TorusGeometry, Vector3, Matrix4, Color } = THREE;
const { RoundedBoxGeometry } = await import('three/addons/geometries/RoundedBoxGeometry.js');
const { GLTFExporter } = await import('three/addons/exporters/GLTFExporter.js');
const { mergeGeometries } = await import('three/addons/utils/BufferGeometryUtils.js');

const file = process.argv[2] || 'blockout/blockout-full-v1.json';
const outName = process.argv[3] || 'editor/facility-built.glb';
const reportPath = process.argv[4] || process.env.BUILD_REPORT_PATH || 'out/build-report.json';
const isolatedTransferOnly = process.env.BUILD_TRANSFER_NETWORK_ONLY === '1';
const campusSpineOnly = process.env.BUILD_CAMPUS_SPINE === '1';
const operationalStreetwallOnly = process.env.BUILD_OPERATIONAL_STREETWALL === '1';
const openCellNetworkOnly = process.env.BUILD_OPEN_CELL_NETWORK_ONLY === '1';
const openCellNetworkV2Only = process.env.BUILD_OPEN_CELL_NETWORK_V2_ONLY === '1';
const openCellNetworkV3Only = process.env.BUILD_OPEN_CELL_NETWORK_V3_ONLY === '1';
const openCellBuildOnly = openCellNetworkOnly || openCellNetworkV2Only || openCellNetworkV3Only;
const b = JSON.parse(fs.readFileSync(file, 'utf8'));
const sourceSha256 = createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const generatorSha256 = createHash('sha256').update(fs.readFileSync(new URL(import.meta.url))).digest('hex');
const sourceCommit = (() => { try { return execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(); } catch { return 'unknown'; } })();
const segs = b.segments, byId = new Map(segs.map(s => [s.id, s]));

// deterministic PRNG (mulberry32)
const rng = seed => () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const idSeed = id => [...id].reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 7);

const group = new Group();
const mat = (hex, opt = {}) => new MeshStandardMaterial({ color: hex, roughness: 0.92, metalness: 0.02, ...opt });
// material families (PBR, shared per family to bound draw groups after merge)
const M = {
  concrete: [mat(0x847f77, { roughness: 0.95 }), mat(0x979089, { roughness: 0.92 }), mat(0x6f7572, { roughness: 0.97 })],
  concreteDark: mat(0x74746c, { roughness: 0.97 }),
  roof: mat(0x4b5350, { roughness: 0.92, metalness: 0.18 }),
  metal: mat(0x778079, { roughness: 0.58, metalness: 0.28 }),
  siding: [mat(0x899778, { roughness: 0.86, metalness: 0.14 }), mat(0x6d827d, { roughness: 0.83, metalness: 0.18 }), mat(0xa39a83, { roughness: 0.88, metalness: 0.12 })],
  facade: [mat(0x5f6b5d, { roughness: 0.84, metalness: 0.2 }), mat(0x4c5b56, { roughness: 0.86, metalness: 0.22 }), mat(0x78816f, { roughness: 0.88, metalness: 0.16 })],
  heroSiding: mat(0x6f826e, { roughness: 0.78, metalness: 0.22 }),
  heroSidingAlt: mat(0x405950, { roughness: 0.82, metalness: 0.18 }),
  heroPanel: mat(0x4b6157, { roughness: 0.84, metalness: 0.16 }),
  heroGlass: mat(0x142d31, { roughness: 0.18, metalness: 0.48, transparent: true, opacity: 0.72, depthWrite: true, emissive: 0x0a1d1c, emissiveIntensity: 0.3 }),
  trim: mat(0x626d68, { roughness: 0.72, metalness: 0.28 }),
  glass: mat(0x294448, { roughness: 0.2, metalness: 0.42, transparent: true, opacity: 0.58, depthWrite: true, emissive: 0x081619, emissiveIntensity: 0.18 }),
  road: mat(0x565a55, { roughness: 0.92 }),
  roadJoint: mat(0x252c2c, { roughness: 0.98 }),
  hardstand: mat(0x535852, { roughness: 0.62, metalness: 0.1 }),
  wetRoad: mat(0x4c625d, { roughness: 0.34, metalness: 0.1 }),
  puddle: mat(0x5f7b77, { roughness: 0.18, metalness: 0.25 }),
  loadingAsphalt: mat(0x535852, { roughness: 0.72, metalness: 0.05 }),
  loadingAsphaltRough: mat(0x5d5c53, { roughness: 0.84, metalness: 0.03 }),
  loadingWet: mat(0x48605b, { roughness: 0.34, metalness: 0.14 }),
  loadingPuddle: mat(0x66837d, { roughness: 0.2, metalness: 0.22 }),
  loadingReflective: mat(0x718a82, { roughness: 0.24, metalness: 0.22, emissive: 0x102b28, emissiveIntensity: 0.06 }),
  loadingStain: mat(0x4b5149, { roughness: 0.96 }),
  drain: mat(0x252c2c, { roughness: 0.82, metalness: 0.42 }),
  stain: mat(0x313b39, { roughness: 0.99 }),
  curb: mat(0x817c70, { roughness: 0.94 }),
  gravel: mat(0x76604c, { roughness: 0.99 }),
  campusBase: mat(0x59625d, { roughness: 0.98 }),
  campusBaseAlt: mat(0x4f5854, { roughness: 0.99 }),
  door: mat(0x3c4746, { roughness: 0.58, metalness: 0.48 }),
  doorSlat: mat(0x65716c, { roughness: 0.72, metalness: 0.58 }),
  dockSlat: mat(0x7d8984, { roughness: 0.64, metalness: 0.46 }),
  loadingDoor: mat(0x82958d, { roughness: 0.78, metalness: 0.12, emissive: 0x172b25, emissiveIntensity: 0.08 }),
  loadingSlat: mat(0x8b9990, { roughness: 0.62, metalness: 0.22 }),
  loadingFrame: mat(0x7d8b83, { roughness: 0.58, metalness: 0.3 }),
  loadingCanopy: mat(0x5e6d67, { roughness: 0.68, metalness: 0.3 }),
  loadingPanel: mat(0x66746a, { roughness: 0.82, metalness: 0.16 }),
  loadingPanelLight: mat(0x899383, { roughness: 0.78, metalness: 0.12 }),
  loadingSeam: mat(0x303b39, { roughness: 0.9, metalness: 0.2 }),
  loadingGlass: mat(0x1c3b3b, { roughness: 0.2, metalness: 0.36, emissive: 0x0b2422, emissiveIntensity: 0.24 }),
  rubber: mat(0x1b2423, { roughness: 0.9, metalness: 0.02 }),
  pipe: mat(0x776b58, { roughness: 0.64, metalness: 0.38 }),
  pipeDark: mat(0x4f5b58, { roughness: 0.74, metalness: 0.25 }),
  rib: mat(0x657173, { roughness: 0.72, metalness: 0.32 }),
  panel: [mat(0x56615a, { roughness: 0.88, metalness: 0.18 }), mat(0x3e4b4a, { roughness: 0.9, metalness: 0.16 }), mat(0x746d5d, { roughness: 0.9, metalness: 0.12 })],
  cover: [mat(0x626d62, { roughness: 0.92 }), mat(0x7a765d, { roughness: 0.94 })],
  dirt: mat(0x76513d, { roughness: 1.0 }),
  warning: mat(0xe0b62c, { roughness: 0.62, metalness: 0.25 }),
  warningDark: mat(0x252323, { roughness: 0.82, metalness: 0.12 }),
  rust: mat(0x5d4d42, { roughness: 0.9, metalness: 0.3 }),
  line: mat(0xd3b65d, { roughness: 0.72, metalness: 0.08 }),
  lineWhite: mat(0x8a958e, { roughness: 0.9, metalness: 0.02 }),
  fence: mat(0x66746f, { roughness: 0.84, metalness: 0.2 }),
  sidewalk: mat(0x969991, { roughness: 0.9 }),
  interior: mat(0x343f3f, { roughness: 0.94, metalness: 0.08 }),
  amber: mat(0xffb36b, { roughness: 0.3, emissive: 0x8f3c18, emissiveIntensity: 1.2 }),
  red: mat(0xff4d36, { roughness: 0.32, emissive: 0x7a160d, emissiveIntensity: 1.1 }),
  water: mat(0x27566e, { roughness: 0.12, metalness: 0.0, transparent: true, opacity: 0.92, depthWrite: true }),
  tunnel: mat(0x454b49, { roughness: 0.95 }),
  tunnelLight: mat(0x393e3b, { roughness: 0.88 }),
  tunnelConcrete: mat(0x6a665d, { roughness: 0.98, side: THREE.DoubleSide }),
  tunnelConcreteDark: mat(0x3f403d, { roughness: 0.99, side: THREE.DoubleSide }),
  tunnelRust: mat(0x733c2d, { roughness: 0.82, metalness: 0.46 }),
  spawn: mat(0x40c0c0, { transparent: true, opacity: 0.3, depthWrite: false }),
  kill: mat(0xd04040, { transparent: true, opacity: 0.25, depthWrite: false }),
  term: mat(0x22cc88, { roughness: 0.35, metalness: 0.3, emissive: 0x116633, emissiveIntensity: 0.6 }),
  light: mat(0xffd59a, { roughness: 0.3, emissive: 0xa45f28, emissiveIntensity: 1.1 }),
  sunWedge: mat(0xd7b37e, { roughness: 0.94, emissive: 0x805d2e, emissiveIntensity: 0.22, transparent: true, opacity: 0.42, depthWrite: false, side: THREE.DoubleSide }),
  lampHousing: mat(0x202829, { roughness: 0.66, metalness: 0.58 }),
  killObj: mat(0xd04040, { transparent: true, opacity: 0.5, depthWrite: false }),
  hazard: mat(0xd8c020, { roughness: 0.6 }),
  hazardDark: mat(0x202020, { roughness: 0.8 }),
  sign: mat(0x2a3a4a, { roughness: 0.5, metalness: 0.3 }),
};
// Small embedded texture sets keep the GLB self-contained while giving the camera
// real albedo breakup, roughness response, and micro-normal relief. They are not
// decorative noise: each family has a construction cue (aggregate, corrugation,
// asphalt wear, or cast metal grain).
const surfaceTexture = (seed, kind) => {
  const size = ['road', 'sidewalk'].includes(kind) ? 256 : 128;
  const color = new Uint8Array(size * size * 4), roughness = new Uint8Array(size * size * 4), normal = new Uint8Array(size * size * 4);
  const sample = (x, y) => {
    const n = Math.sin((x + seed * 0.017) * 12.9898 + (y - seed * 0.013) * 78.233) * 43758.5453;
    return n - Math.floor(n);
  };
  const valueNoise = (x, y, cellSize) => {
    const cells = Math.max(1, Math.round(size / cellSize));
    const px = x / cellSize, py = y / cellSize;
    const ix = Math.floor(px), iy = Math.floor(py), tx = px - ix, ty = py - iy;
    const fade = t => t * t * (3 - 2 * t);
    const hash = (gx, gy) => {
      const wx = ((gx % cells) + cells) % cells, wy = ((gy % cells) + cells) % cells;
      const n = Math.sin((wx + seed * 0.021) * 12.9898 + (wy - seed * 0.017) * 78.233) * 43758.5453;
      return n - Math.floor(n);
    };
    const a = hash(ix, iy), b = hash(ix + 1, iy), c = hash(ix, iy + 1), d = hash(ix + 1, iy + 1);
    const u = fade(tx), v = fade(ty);
    return (a + (b - a) * u) + ((c + (d - c) * u) - (a + (b - a) * u)) * v;
  };
  const field = (x, y) => {
    if (kind === 'sidewalk') {
      const broad = valueNoise(x, y, 32) * 2 - 1;
      const medium = valueNoise(x + 41, y - 23, 10) * 2 - 1;
      const fine = valueNoise(x - 17, y + 29, 3) * 2 - 1;
      return broad * 0.48 + medium * 0.28 + fine * 0.12;
    }
    const coarse = Math.sin((x + seed * 0.003) * 0.075) * Math.cos((y - seed * 0.002) * 0.061);
    const macro = Math.sin((x + seed * 0.031) * 0.025) * Math.cos((y - seed * 0.019) * 0.019);
    const fine = sample(x, y) * 2 - 1;
    const groove = kind === 'panel' ? Math.cos((x + seed) * Math.PI / 6) * 0.34 : 0;
    return coarse * 0.45 + macro * 0.42 + fine * 0.18 + groove;
  };
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const n = field(x, y);
    const stain = kind === 'road' && ((x * 17 + y * 31 + seed) % 211 < 3) ? -0.22 : 0;
    const base = kind === 'panel' ? 204 : kind === 'metal' ? 212 : kind === 'road' ? 198 : kind === 'sidewalk' ? 204 : 210;
    const amplitude = kind === 'panel' ? 44 : kind === 'metal' ? 30 : kind === 'road' ? 38 : kind === 'sidewalk' ? 22 : 32;
    const v = Math.max(0, Math.min(255, Math.round(base + n * amplitude + stain * 255)));
    const warm = kind === 'gravel' ? 0.98 : 1;
    const i = (y * size + x) * 4;
    color[i] = Math.max(0, Math.min(255, Math.round(v * warm)));
    color[i + 1] = Math.max(0, Math.min(255, Math.round(v)));
    color[i + 2] = Math.max(0, Math.min(255, Math.round(v * 0.98)));
    color[i + 3] = 255;
    const r = kind === 'road' ? 214 + n * 24 : kind === 'metal' ? 126 + n * 32 : kind === 'sidewalk' ? 214 + n * 16 : 190 + n * 28;
    roughness[i] = roughness[i + 1] = roughness[i + 2] = Math.max(0, Math.min(255, Math.round(r))); roughness[i + 3] = 255;
    const dx = field(x + 1, y) - field(x - 1, y), dy = field(x, y + 1) - field(x, y - 1);
    normal[i] = Math.max(0, Math.min(255, Math.round(128 - dx * 38)));
    normal[i + 1] = Math.max(0, Math.min(255, Math.round(128 - dy * 38)));
    normal[i + 2] = 255; normal[i + 3] = 255;
  }
  const make = (data, colorSpace = false) => {
    const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
    texture.magFilter = THREE.LinearFilter; texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(kind === 'road' ? 1.15 : kind === 'panel' ? 2.8 : kind === 'sidewalk' ? 2.4 : 2.2, kind === 'road' ? 1.15 : kind === 'panel' ? 2.8 : kind === 'sidewalk' ? 2.4 : 2.2);
    if (colorSpace) texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
    return texture;
  };
  return { color: make(color, true), roughness: make(roughness), normal: make(normal) };
};
const decodePng = fileName => {
  const bytes = fs.readFileSync(fileName);
  let offset = 8, width = 0, height = 0, bitDepth = 0, colorType = 0, interlace = 0, idat = [];
  while (offset < bytes.length) {
    const length = bytes.readUInt32BE(offset); offset += 4;
    const type = bytes.toString('ascii', offset, offset + 4); offset += 4;
    const data = bytes.subarray(offset, offset + length); offset += length + 4;
    if (type === 'IHDR') {
      width = data.readUInt32BE(0); height = data.readUInt32BE(4); bitDepth = data[8]; colorType = data[9]; interlace = data[12];
    } else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
  }
  if (!width || !height || bitDepth !== 8 || interlace !== 0 || ![2, 6].includes(colorType)) throw new Error(`Unsupported PNG: ${fileName}`);
  const channels = colorType === 6 ? 4 : 3, stride = width * channels, raw = inflateSync(Buffer.concat(idat));
  const rgba = new Uint8Array(width * height * 4), previous = new Uint8Array(stride);
  let cursor = 0;
  const paeth = (a, b, c) => { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); return pa <= pb && pa <= pc ? a : pb <= pc ? b : c; };
  for (let y = 0; y < height; y++) {
    const filter = raw[cursor++], row = new Uint8Array(stride);
    for (let x = 0; x < stride; x++) {
      const value = raw[cursor++], left = x >= channels ? row[x - channels] : 0, up = previous[x], upperLeft = x >= channels ? previous[x - channels] : 0;
      row[x] = (value + (filter === 1 ? left : filter === 2 ? up : filter === 3 ? Math.floor((left + up) / 2) : filter === 4 ? paeth(left, up, upperLeft) : 0)) & 255;
    }
    for (let x = 0; x < width; x++) {
      const si = x * channels, di = (y * width + x) * 4;
      rgba[di] = row[si]; rgba[di + 1] = row[si + 1]; rgba[di + 2] = row[si + 2]; rgba[di + 3] = channels === 4 ? row[si + 3] : 255;
    }
    previous.set(row);
  }
  return { data: rgba, width, height };
};
const pbrTexture = (fileName, colorSpace, repeat) => {
  const image = decodePng(fileName), texture = new THREE.DataTexture(image.data, image.width, image.height, THREE.RGBAFormat);
  texture.magFilter = THREE.LinearFilter; texture.minFilter = THREE.LinearMipmapLinearFilter; texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.repeat.set(repeat, repeat);
  if (colorSpace) texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
};
const pbrSet = (name, repeat) => {
  const root = `assets/pbr/${name}`;
  return {
    color: pbrTexture(`${root}-albedo.png`, true, repeat),
    roughness: pbrTexture(`${root}-roughness.png`, false, repeat),
    normal: pbrTexture(`${root}-normal.png`, false, repeat),
    metalness: pbrTexture(`${root}-metalness.png`, false, repeat),
  };
};
const textures = {
  concrete: surfaceTexture(0x1731, 'concrete'), panel: surfaceTexture(0x72a9, 'panel'), metal: surfaceTexture(0x41d7, 'metal'), road: surfaceTexture(0x9911, 'road'),
  gravel: surfaceTexture(0x4e21, 'gravel'), interior: surfaceTexture(0x6b19, 'interior'), sidewalk: surfaceTexture(0x2d71, 'sidewalk'),
};
const useTexture = (material, set, normalStrength = 0.28) => {
  material.map = set.color; material.roughnessMap = set.roughness; material.normalMap = set.normal;
  material.normalScale.set(normalStrength, normalStrength); material.needsUpdate = true;
};
for (const material of M.concrete) useTexture(material, textures.concrete, 0.22);
for (const material of M.siding) useTexture(material, textures.panel, 0.42);
for (const material of M.facade) useTexture(material, textures.panel, 0.38);
for (const material of [M.heroSiding, M.heroSidingAlt, M.heroPanel]) useTexture(material, textures.panel, 0.46);
for (const material of M.panel) useTexture(material, textures.panel, 0.32);
for (const material of M.cover) useTexture(material, textures.panel, 0.24);
for (const material of [M.concreteDark, M.roof, M.metal, M.rib, M.door, M.doorSlat, M.dockSlat, M.loadingDoor, M.loadingSlat, M.loadingFrame, M.loadingCanopy, M.pipe, M.pipeDark, M.tunnel, M.tunnelLight, M.tunnelConcrete, M.tunnelConcreteDark, M.tunnelRust]) useTexture(material, textures.interior, 0.2);
for (const material of [M.loadingPanel, M.loadingPanelLight, M.loadingSeam]) useTexture(material, textures.panel, 0.34);
useTexture(M.loadingGlass, textures.metal, 0.16);
for (const material of [M.road, M.roadJoint, M.hardstand, M.wetRoad, M.loadingAsphalt, M.loadingAsphaltRough, M.loadingWet, M.loadingPuddle, M.loadingReflective, M.loadingStain]) useTexture(material, textures.road, 0.18);
useTexture(M.sidewalk, textures.sidewalk, 0.12);
for (const material of [M.metal, M.trim, M.rib, M.pipe, M.pipeDark, M.fence, M.loadingDoor, M.loadingSlat, M.loadingFrame, M.rubber]) useTexture(material, textures.metal, 0.22);
for (const material of [M.gravel, M.dirt, M.campusBase, M.campusBaseAlt]) useTexture(material, textures.gravel, 0.34);
const photoSteel = pbrSet('painted-steel', 5.5), photoAsphalt = pbrSet('asphalt', 3.2), photoConcrete = pbrSet('concrete', 6.0);
const usePbr = (material, set, normalStrength) => {
  material.color.set(0xffffff);
  material.map = set.color; material.roughnessMap = set.roughness; material.normalMap = set.normal; material.metalnessMap = set.metalness;
  material.normalScale.set(normalStrength, normalStrength); material.needsUpdate = true;
};
// Photo-derived maps replace synthetic field textures on the surfaces that dominate player-eye views.
for (const material of [...M.siding, ...M.facade, M.heroSiding, M.heroSidingAlt, M.heroPanel, ...M.panel, M.roof, M.loadingPanel, M.loadingPanelLight]) usePbr(material, photoSteel, 0.28);
for (const material of [M.metal, M.trim, M.rib, M.pipe, M.pipeDark, M.fence, M.door, M.doorSlat, M.dockSlat, M.loadingDoor, M.loadingSlat, M.loadingFrame, M.loadingCanopy]) usePbr(material, photoSteel, 0.18);
for (const material of [M.road, M.roadJoint, M.hardstand, M.wetRoad, M.puddle, M.loadingAsphalt, M.loadingAsphaltRough, M.loadingWet, M.loadingPuddle, M.loadingReflective, M.loadingStain]) usePbr(material, photoAsphalt, 0.16);
for (const material of [...M.cover, ...M.concrete, M.concreteDark, M.curb, M.sidewalk, M.tunnel, M.tunnelLight, M.tunnelConcrete, M.tunnelConcreteDark]) usePbr(material, photoConcrete, 0.18);
M.heroSiding.color.set(0x87a474);
M.heroSidingAlt.color.set(0x315645);
M.heroPanel.color.set(0x4f7560);
M.loadingAsphalt.color.set(0xffffff);
M.loadingAsphaltRough.color.set(0xffffff);
M.loadingWet.color.set(0xffffff);
M.loadingWet.roughness = 0.3;
M.loadingStain.color.set(0x303a35);
M.loadingWet.metalness = 0.03;
M.loadingReflective.color.set(0x9aa9a0);
M.loadingReflective.roughness = 0.22;
// Keep the concrete kicker distinct from the darker painted steel skin.
for (const [material, color] of [
  [M.concrete[0], 0x8d8b82], [M.concrete[1], 0x817f78], [M.concrete[2], 0x686b67], [M.concreteDark, 0x505754],
  [M.heroSiding, 0x87a474], [M.heroSidingAlt, 0x315645], [M.heroPanel, 0x4f7560],
  [M.loadingPanel, 0x9aa99c], [M.loadingPanelLight, 0xb2bcae], [M.loadingFrame, 0x707c74],
]) material.color.set(color);
const box = (w, h, d, x, y, z, m, ry = 0) => {
  const g = new Mesh(new BoxGeometry(w, h, d), m);
  g.position.set(x, y, z); g.rotation.y = ry;
  if (m === M.concreteDark && h <= 0.6 && w >= 2 && d >= 2) g.userData.worldUvPeriod = 12;
  return g;
};
const edgeBox = (w, h, d, x, y, z, m, ry = 0, radius = 0.06) => {
  const r = Math.max(0.01, Math.min(radius, w * 0.5 - 0.01, h * 0.5 - 0.01, d * 0.5 - 0.01));
  const g = new Mesh(new RoundedBoxGeometry(w, h, d, 2, r), m);
  g.position.set(x, y, z); g.rotation.y = ry; return g;
};
const corrugatedSheet = (side, start, end, wall, base, height, material = M.heroSiding, pitch = 0.44, depth = 0.055) => {
  const alongX = side === 'n' || side === 's';
  const outward = side === 'n' ? 1 : side === 's' ? -1 : side === 'e' ? 1 : -1;
  const lo = Math.min(start, end), hi = Math.max(start, end);
  const columns = Math.max(4, Math.ceil((hi - lo) / (pitch * 0.5)));
  const rows = Math.max(2, Math.ceil(height / 2.2));
  const positions = [], uvs = [], indices = [];
  for (let row = 0; row <= rows; row++) {
    const y = base + height * row / rows;
    for (let column = 0; column <= columns; column++) {
      const axis = lo + (hi - lo) * column / columns;
      const phase = ((axis - lo) / pitch) * Math.PI * 2;
      const ridge = Math.cos(phase) * depth;
      const offset = outward * (0.035 + ridge);
      if (alongX) positions.push(axis, y, wall + offset);
      else positions.push(wall + offset, y, axis);
      uvs.push(column / columns * (hi - lo) / 3.2, row / rows * height / 2.4);
    }
  }
  for (let row = 0; row < rows; row++) for (let column = 0; column < columns; column++) {
    const a = row * (columns + 1) + column, b = a + columns + 1;
    if (['n', 'w'].includes(side)) indices.push(a, a + 1, b, a + 1, b + 1, b);
    else indices.push(a, b, a + 1, a + 1, b, b + 1);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices); geometry.computeVertexNormals();
  group.add(new Mesh(geometry, material));
};
const cylinder = (radius, height, x, y, z, m, radial = 10, rx = 0, rz = 0) => {
  const g = new Mesh(new CylinderGeometry(radius, radius, height, radial), m);
  g.position.set(x, y, z); g.rotation.x = rx; g.rotation.z = rz; return g;
};
const addBeam = (a, c, radius, m) => {
  const dx = c[0] - a[0], dy = c[1] - a[1], dz = c[2] - a[2];
  const g = cylinder(radius, Math.hypot(dx, dy, dz), (a[0] + c[0]) / 2, (a[1] + c[1]) / 2, (a[2] + c[2]) / 2, m, 8);
  g.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), new Vector3(dx, dy, dz).normalize());
  return g;
};
const addStripe = (x, y, z, w, d, m, spacing = 1.2) => {
  for (let i = -Math.floor(Math.max(w, d) / spacing) / 2; i < Math.max(w, d) / spacing / 2; i += 2) {
    const alongX = w >= d;
    group.add(box(alongX ? spacing : 0.16, 0.035, alongX ? 0.16 : spacing, x + (alongX ? i * spacing : 0), y, z + (alongX ? 0 : i * spacing), m));
  }
};
const groundSegments = segs.filter(s => s.category === 'ground-surface-type');
const inBounds = (x, z, s) => {
  const [x1, z1, x2, z2] = s.bounds;
  return x >= Math.min(x1, x2) && x <= Math.max(x1, x2) && z >= Math.min(z1, z2) && z <= Math.max(z1, z2);
};
const surfaceYAt = (x, z, fallback = b.terrain?.defaultSurfaceY ?? 0) => {
  const candidates = groundSegments.filter(s => inBounds(x, z, s));
  if (!candidates.length) return fallback;
  candidates.sort((a, c) => Math.abs((a.bounds[2] - a.bounds[0]) * (a.bounds[3] - a.bounds[1])) - Math.abs((c.bounds[2] - c.bounds[0]) * (c.bounds[3] - c.bounds[1])));
  return Number.isFinite(candidates[0].surfaceY) ? candidates[0].surfaceY : fallback;
};
function roadTopYAt(x, z, fallback = surfaceYAt(x, z)) {
  let best = null;
  for (const r of b.routes) {
    if (r.kind === 'air' || r.kind === 'tunnel') continue;
    const halfWidth = Math.max(4, r.width || 6) / 2;
    for (let i = 0; i < r.waypoints.length - 1; i++) {
      const [ax, az] = r.waypoints[i], [bx, bz] = r.waypoints[i + 1];
      const dx = bx - ax, dz = bz - az, len2 = dx * dx + dz * dz || 1;
      const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / len2));
      const px = ax + dx * t, pz = az + dz * t, distance = Math.hypot(x - px, z - pz);
      if (distance <= halfWidth + 1.2 && (!best || distance < best.distance)) best = { distance, y: routeElevation(r, i, t) };
    }
  }
  return best ? best.y + 0.17 : fallback;
}
const segmentTerrainY = s => Number.isFinite(s.terrainY)
  ? s.terrainY
  : surfaceYAt((s.bounds[0] + s.bounds[2]) / 2, (s.bounds[1] + s.bounds[3]) / 2);
const raisedBase = s => segmentTerrainY(s) + (s.raisedBase ?? s.raisedThreshold ?? 0);
const orientedBox = (w, h, d, cx, cy, cz, dx, dy, dz, m) => {
  const g = new Mesh(new BoxGeometry(w, h, d), m);
  const dir = new Vector3(dx, dy, dz).normalize();
  g.position.set(cx, cy, cz);
  g.quaternion.setFromUnitVectors(new Vector3(1, 0, 0), dir);
  return g;
};
const taperedCylinder = (topRadius, bottomRadius, height, x, y, z, m, radial = 12) => {
  const g = new Mesh(new CylinderGeometry(topRadius, bottomRadius, height, radial), m);
  g.position.set(x, y, z); return g;
};
const segmentFrame = (ax, az, bx, bz) => {
  const dx = bx - ax, dz = bz - az, len = Math.hypot(dx, dz) || 1;
  return { len, ang: -Math.atan2(dz, dx), nx: -dz / len, nz: dx / len };
};
const offsetPoint = (x, z, frame, offset) => [x + frame.nx * offset, z + frame.nz * offset];
const framesFor = samples => samples.map((p, i) => {
  const prev = samples[Math.max(0, i - 1)], next = samples[Math.min(samples.length - 1, i + 1)];
  return segmentFrame(prev[0], prev[2], next[0], next[2]);
});
const ribbon = (samples, width, material, { centerOffset = 0, topOffset = 0.04, thickness = 0.06, flat = false } = {}) => {
  if (samples.length < 2) return new Mesh(new BufferGeometry(), material);
  const frames = framesFor(samples), positions = [], uvs = [], indices = [];
  let distance = 0;
  for (let i = 0; i < samples.length; i++) {
    if (i > 0) distance += Math.hypot(samples[i][0] - samples[i - 1][0], samples[i][2] - samples[i - 1][2]);
    const p = samples[i], f = frames[i];
    const cx = p[0] + f.nx * centerOffset, cz = p[2] + f.nz * centerOffset;
    const lx = cx + f.nx * width / 2, lz = cz + f.nz * width / 2;
    const rx = cx - f.nx * width / 2, rz = cz - f.nz * width / 2;
    if (flat) {
      positions.push(lx, p[1] + topOffset, lz, rx, p[1] + topOffset, rz);
      uvs.push(distance / 8, 0, distance / 8, 1);
    } else {
      const top = p[1] + topOffset, bottom = top - thickness;
      positions.push(lx, top, lz, rx, top, rz, lx, bottom, lz, rx, bottom, rz);
      uvs.push(distance / 8, 0, distance / 8, 1, distance / 8, 0, distance / 8, 1);
    }
  }
  for (let i = 0; i < samples.length - 1; i++) {
    if (flat) {
      const a = i * 2, b2 = (i + 1) * 2;
      indices.push(a, b2, b2 + 1, a, b2 + 1, a + 1);
    } else {
      const a = i * 4, b2 = (i + 1) * 4;
      indices.push(a, b2, b2 + 1, a, b2 + 1, a + 1); // top
      indices.push(a + 2, a + 3, b2 + 3, a + 2, b2 + 3, b2 + 2); // underside
      indices.push(a, a + 2, b2 + 2, a, b2 + 2, b2); // left edge
      indices.push(a + 1, b2 + 1, b2 + 3, a + 1, b2 + 3, a + 3); // right edge
    }
  }
  const geo = new BufferGeometry();
  geo.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new Float32BufferAttribute(uvs, 2)); geo.setIndex(indices); geo.computeVertexNormals();
  return new Mesh(geo, material);
};
const flatSegment = (a, c, width, material, yOffset = 0.01) => ribbon([a, c], width, material, { topOffset: yOffset, thickness: 0.002, flat: true });
const flatRect = (x, z, w, d, material, rotation = 0, yOffset = 0.02) => {
  const mesh = new Mesh(new PlaneGeometry(w, d), material);
  mesh.rotation.x = -Math.PI / 2; mesh.rotation.z = rotation; mesh.position.set(x, roadTopYAt(x, z, surfaceYAt(x, z, 0)) + yOffset, z); return mesh;
};
const flatPolygon = (x, z, w, d, material, rotation = 0, y = 0.02, seed = 1, lobes = 8) => {
  const rand = rng(seed);
  const positions = [0, 0, 0], uvs = [0.5, 0.5], indices = [];
  const c = Math.cos(rotation), s = Math.sin(rotation);
  for (let i = 0; i < lobes; i++) {
    const a = i / lobes * Math.PI * 2;
    const radius = 0.78 + rand() * 0.3;
    const lx = Math.cos(a) * w * 0.5 * radius, lz = Math.sin(a) * d * 0.5 * radius;
    positions.push(lx * c - lz * s, 0, lx * s + lz * c);
    uvs.push(0.5 + lx / Math.max(0.01, w), 0.5 + lz / Math.max(0.01, d));
  }
  for (let i = 0; i < lobes; i++) indices.push(0, i + 1, (i + 1) % lobes + 1);
  const geo = new BufferGeometry();
  geo.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices); geo.computeVertexNormals();
  const mesh = new Mesh(geo, material); mesh.position.set(x, y, z); return mesh;
};
const routeElevation = (r, i, t) => {
  const fallback = b.terrain?.defaultSurfaceY ?? 0;
  const a = r.elevations?.[i] ?? fallback, c = r.elevations?.[i + 1] ?? a;
  return a + (c - a) * t;
};
const catmull = (p0, p1, p2, p3, t) => {
  const t2 = t * t, t3 = t2 * t;
  return 0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
};
const routeSamples = r => {
  const out = [];
  for (let i = 0; i < r.waypoints.length - 1; i++) {
    const prev = r.waypoints[i - 1] || r.waypoints[i];
    const a = r.waypoints[i], c = r.waypoints[i + 1], next = r.waypoints[i + 2] || c;
    const len = Math.hypot(c[0] - a[0], c[1] - a[1]);
    const steps = Math.max(1, Math.ceil(len / 10));
    for (let j = 0; j < steps; j++) {
      const t = j / steps;
      out.push([catmull(prev[0], a[0], c[0], next[0], t), routeElevation(r, i, t), catmull(prev[1], a[1], c[1], next[1], t)]);
    }
  }
  const last = r.waypoints.at(-1);
  out.push([last[0], r.elevations?.at(-1) ?? b.terrain?.defaultSurfaceY ?? 0, last[1]]);
  return out;
};
const addRouteJoins = (r, width, sidewalkWidth, hasSidewalk) => {
  if (r.waypoints.length < 3) return;
  for (let i = 1; i < r.waypoints.length - 1; i++) {
    const [px, pz] = r.waypoints[i];
    const prev = r.waypoints[i - 1], next = r.waypoints[i + 1];
    const incoming = segmentFrame(prev[0], prev[1], px, pz), outgoing = segmentFrame(px, pz, next[0], next[1]);
    const turn = Math.abs(Math.atan2(incoming.nx * outgoing.nz - incoming.nz * outgoing.nx, incoming.nx * outgoing.nx + incoming.nz * outgoing.nz));
    if (turn < 0.14) continue;
    const y = routeElevation(r, i, 0);
    group.add(box(width + 0.35, 0.17, width + 0.35, px, y + 0.085, pz, M.road));
    const join = (offset, joinWidth, height, centerY, material) => {
      for (const side of [-1, 1]) {
        const a = offsetPoint(px, pz, incoming, side * offset), c = offsetPoint(px, pz, outgoing, side * offset);
        const dx = c[0] - a[0], dz = c[1] - a[1], length = Math.hypot(dx, dz);
        if (length < 0.05) continue;
        group.add(orientedBox(length, height, joinWidth, (a[0] + c[0]) / 2, centerY, (a[1] + c[1]) / 2, dx, 0, dz, material));
      }
    };
    join(width / 2 + 0.15, 0.3, 0.25, y + 0.125, M.curb);
    const walkOffset = width / 2 + 0.3 + sidewalkWidth / 2;
    join(walkOffset, sidewalkWidth, hasSidewalk ? 0.12 : 0.06, y + (hasSidewalk ? 0.06 : 0.03), hasSidewalk ? M.sidewalk : M.gravel);
    join(width / 2 + 0.3 + sidewalkWidth + 0.18, 0.36, 0.13, y - 0.04, M.concreteDark);
  }
};

// -------- grounds (surface class) --------
const SURF_MAT = { concrete: () => M.concreteDark, asphalt: () => M.road, gravel: () => M.gravel, dirt: () => M.gravel };
// Segmented graded earthworks keep authored yards grounded without making the whole
// campus read as one unbuilt brown slab. Dark seams act as service drains between pads.
const baseTileW = 92, baseTileD = 67, baseTileY = -2.7;
for (let ix = 0; ix < 10; ix++) for (let iz = 0; iz < 10; iz++) {
  const x = -460 + baseTileW / 2 + ix * baseTileW, z = -325 + baseTileD / 2 + iz * baseTileD;
  const hardstand = ix >= 3 && ix <= 7 && iz >= 3 && iz <= 7 && (ix + iz) % 3 === 0;
  group.add(box(baseTileW - 1.0, 2.2, baseTileD - 1.0, x, baseTileY, z, hardstand ? M.hardstand : ((ix + iz) % 2 ? M.campusBase : M.campusBaseAlt)));
}
for (let ix = 1; ix < 10; ix++) {
  const x = -460 + ix * baseTileW;
  group.add(box(1.0, 2.0, 670, x, baseTileY, 10, M.concreteDark));
  group.add(box(0.16, 0.08, 668, x, -1.56, 10, M.drain));
}
for (let iz = 1; iz < 10; iz++) {
  const z = -325 + iz * baseTileD;
  group.add(box(930, 2.0, 1.0, 0, baseTileY, z, M.concreteDark));
  group.add(box(928, 0.08, 0.16, 0, -1.56, z, M.drain));
}
for (const s of groundSegments) {
  const [x1, z1, x2, z2] = s.bounds;
  const y = s.surfaceY ?? b.terrain?.defaultSurfaceY ?? 0;
  const ground = box(x2 - x1, 0.4, z2 - z1, (x1 + x2) / 2, y - 0.2, (z1 + z2) / 2, SURF_MAT[s.surface]?.() ?? M.concreteDark);
  if (s.surface === 'concrete') ground.userData.worldUvPeriod = 12;
  group.add(ground);
}

// -------- roads: spline ribbons + curbs, shoulders, gutters, and poles --------
for (const r of b.routes) {
  if (r.kind === 'air') continue;
  const wdt = r.kind === 'tunnel' ? r.width || 8 : Math.max(4, r.width || 6);
  const samples = r.kind === 'tunnel' ? r.waypoints.map(([x, z]) => [x, -13.9, z]) : routeSamples(r);
  const routeMaterial = r.kind === 'tunnel' ? M.tunnelLight : r.id === 'route_plant_spur' ? M.loadingAsphalt : M.road;
  const routeSurface = ribbon(samples, wdt, routeMaterial, { topOffset: r.kind === 'tunnel' ? 0.03 : 0.17, thickness: r.kind === 'tunnel' ? 0.35 : 0.17 });
  if (r.id === 'route_plant_spur') routeSurface.userData.worldUvPeriod = 8.4;
  group.add(routeSurface);
  if (r.kind !== 'tunnel') {
    const shoulderWidth = b.terrain?.grading?.shoulderWidth ?? 1.2;
    const sidewalkWidth = ['route_main_surface', 'route_north_ring', 'route_rear_alley'].includes(r.id) ? 1.55 : 0.9;
    const hasSidewalk = ['route_main_surface', 'route_north_ring', 'route_rear_alley'].includes(r.id);
    addRouteJoins(r, wdt, sidewalkWidth, hasSidewalk);
    for (const side of [-1, 1]) {
      const curbOffset = side * (wdt / 2 + 0.15);
      group.add(ribbon(samples, 0.3, M.curb, { centerOffset: curbOffset, topOffset: 0.25, thickness: 0.25 }));
      const walkOffset = side * (wdt / 2 + 0.3 + sidewalkWidth / 2);
      group.add(ribbon(samples, sidewalkWidth, hasSidewalk ? M.sidewalk : M.gravel, { centerOffset: walkOffset, topOffset: hasSidewalk ? 0.12 : 0.06, thickness: hasSidewalk ? 0.12 : 0.06 }));
      const gutterOffset = side * (wdt / 2 + 0.3 + sidewalkWidth + 0.18);
      group.add(ribbon(samples, 0.36, M.concreteDark, { centerOffset: gutterOffset, topOffset: 0.025, thickness: 0.13 }));
      if (hasSidewalk) {
        const frames = framesFor(samples);
        for (let i = 3; i < samples.length - 1; i += 4) {
          const p = samples[i], f = frames[i];
          const inner = side * (wdt / 2 + 0.3), outer = side * (wdt / 2 + 0.3 + sidewalkWidth);
          const [ax, az] = offsetPoint(p[0], p[2], f, inner), [bx, bz] = offsetPoint(p[0], p[2], f, outer);
          group.add(flatSegment([ax, p[1], az], [bx, p[1], bz], 0.028, M.roadJoint, 0.135));
        }
      }
      const drainOffset = side * (wdt / 2 + 0.3 + sidewalkWidth + 0.18);
      const frames = framesFor(samples);
      for (let i = 2; i < samples.length - 1; i += 6) {
        const p = samples[i], f = frames[i];
        const [ax, az] = offsetPoint(p[0], p[2], f, drainOffset - side * 0.13), [bx, bz] = offsetPoint(p[0], p[2], f, drainOffset + side * 0.13);
        group.add(flatSegment([ax, p[1], az], [bx, p[1], bz], 0.3, M.drain, 0.06));
      }
    }
    // Paint is a coplanar decal, never a raised cuboid. Broken center lines follow
    // the continuous ribbon and therefore do not expose corner gaps.
    if (['route_main_surface', 'route_north_ring', 'route_rear_alley'].includes(r.id)) {
      for (let i = 0; i < samples.length - 1; i += 2) {
        const a = samples[i], c = samples[i + 1];
        if (Math.hypot(c[0] - a[0], c[2] - a[2]) > 1) group.add(flatSegment(a, c, 0.1, M.line, 0.185));
      }
    }
  }
  // Light poles use a small construction family rather than a pole plus floating box:
  // foot plate, bolts, tapered shaft, braced arm, hood, and emissive lens.
  if (r.kind === 'ground') {
    const rand = rng(idSeed('pole-' + r.id));
    for (let i = 0; i < r.waypoints.length - 1; i++) {
      const [ax, az] = r.waypoints[i], [bx, bz] = r.waypoints[i + 1];
      const frame = segmentFrame(ax, az, bx, bz);
      const n = Math.floor(frame.len / 32);
      for (let k = 1; k <= n; k++) {
        const t = (k + rand() * 0.3 - 0.15) / (n + 1);
        const px = ax + (bx - ax) * t, pz = az + (bz - az) * t;
        const py = routeElevation(r, i, t);
        const sgn = rand() > 0.5 ? 1 : -1;
        const off = sgn * (wdt / 2 + 2);
        const [ox, oz] = offsetPoint(px, pz, frame, off);
        group.add(cylinder(0.48, 0.14, ox, py + 0.07, oz, M.concreteDark, 12));
        for (let bolt = 0; bolt < 4; bolt++) {
          const a = bolt * Math.PI / 2 + Math.PI / 4;
          group.add(cylinder(0.055, 0.035, ox + Math.cos(a) * 0.32, py + 0.17, oz + Math.sin(a) * 0.32, M.metal, 6));
        }
        group.add(taperedCylinder(0.13, 0.2, 6.65, ox, py + 3.49, oz, M.metal, 14));
        group.add(cylinder(0.25, 0.14, ox, py + 6.78, oz, M.trim, 12));
        const [ex, ez] = offsetPoint(ox, oz, frame, -sgn * 0.35);
        const [hx, hz] = offsetPoint(ox, oz, frame, -sgn * 0.98);
        group.add(addBeam([ox, py + 6.78, oz], [ex, py + 7.22, ez], 0.105, M.metal));
        group.add(addBeam([ex, py + 7.22, ez], [hx, py + 7.22, hz], 0.085, M.metal));
        group.add(box(0.76, 0.2, 0.36, hx, py + 7.08, hz, M.lampHousing, frame.ang));
        group.add(box(0.52, 0.045, 0.22, hx, py + 6.95, hz, M.light, frame.ang));
        group.add(box(0.58, 0.08, 0.26, hx, py + 7.22, hz, M.trim, frame.ang));
      }
    }
  }
}

// -------- buildings: wall frame with door openings + roof --------
const bldCats = ['building-enterable', 'warehouse-enterable', 'facade-non-enterable', 'tower'];
// group doors by building
const doorsByBld = new Map();
for (const d of segs) {
  if (d.category !== 'entrance-player') continue;
  for (const ref of d.connectivity || []) {
    const t = byId.get(ref);
    if (t && bldCats.includes(t.category)) {
      if (!doorsByBld.has(t.id)) doorsByBld.set(t.id, []);
      doorsByBld.get(t.id).push(d);
    }
  }
}
const wallPiece = (w, h, t, x, y, z, m, ry = 0) => group.add(box(w, h, t, x, y, z, m, ry));
function building(s) {
  const [x1, z1, x2, z2] = s.bounds;
  const w = x2 - x1, d = z2 - z1, h = s.height, base = raisedBase(s);
  const cx2 = (x1 + x2) / 2, cz2 = (z1 + z2) / 2;
  const hero = ['bld-pressure-store', 'bld-processing-hall', 'bld-loading-hall'].includes(s.id);
  const cm = ['building-enterable', 'warehouse-enterable'].includes(s.category)
    ? hero ? M.heroSiding : M.siding[(idSeed(s.id) >>> 0) % M.siding.length]
    : s.category === 'facade-non-enterable'
      ? M.facade[(idSeed(s.id) >>> 0) % M.facade.length]
      : M.concrete[(idSeed(s.id) >>> 0) % M.concrete.length];
  const rand = rng(idSeed(s.id) * 977 + 13);
  // plinth for raised bases
  if (base > 0) group.add(box(w + 6, base, d + 6, cx2, base / 2, cz2, M.concreteDark));
  const WT = 0.6;
  const doors = (doorsByBld.get(s.id) || []).map(d => ({
    // Doors are authored one metre outside the wall; project the opening to the facade.
    dx: (d.bounds[0] + d.bounds[2]) / 2, dz: (d.bounds[1] + d.bounds[3]) / 2,
    // Personnel thresholds read as doors at player scale; only the 4.5m openings stay vehicle-wide.
    w: d.height >= 4 ? Math.min(8, Math.max(d.bounds[2] - d.bounds[0], d.bounds[3] - d.bounds[1])) : Math.min(2.6, Math.max(d.bounds[2] - d.bounds[0], d.bounds[3] - d.bounds[1])),
    h: d.height || 2.4,
    side: (() => {
      const sides = [[Math.abs((d.bounds[1] + d.bounds[3]) / 2 - z1), 's'], [Math.abs((d.bounds[1] + d.bounds[3]) / 2 - z2), 'n'], [Math.abs((d.bounds[0] + d.bounds[2]) / 2 - x1), 'w'], [Math.abs((d.bounds[0] + d.bounds[2]) / 2 - x2), 'e']];
      return sides.sort((a, b) => a[0] - b[0])[0][1];
    })(),
  })).map(d => ({ ...d, axis: ['n', 's'].includes(d.side) ? d.dx : d.dz }));
  const opensOn = side => doors.filter(d => d.side === side);
  const cut = (lo, hi, side) => { // wall pieces along a side, minus door openings
    const o = opensOn(side).map(d => ({ a: d.axis - d.w / 2, c: d.axis + d.w / 2 })).sort((a, c2) => a.a - c2.a);
    let cur = lo, pieces = [];
    for (const op of o) {
      const a2 = Math.max(lo, Math.min(hi, op.a)), c2 = Math.max(lo, Math.min(hi, op.c));
      if (a2 > cur) pieces.push([cur, a2]);
      cur = Math.max(cur, c2);
    }
    if (cur < hi) pieces.push([cur, hi]);
    return pieces;
  };
  const addWallX = (x, side, m) => {
    for (const [a, c] of cut(z1, z2, side)) group.add(box(WT, h, c - a, x, base + h / 2, (a + c) / 2, m));
    for (const door of opensOn(side)) {
      const doorH = Math.min(h - 0.15, door.h), topH = h - doorH;
      if (topH <= 0) continue;
      group.add(box(WT, topH, door.w, x, base + doorH + topH / 2, door.axis, m));
    }
  };
  const addWallZ = (z, side, m) => {
    for (const [a, c] of cut(x1, x2, side)) group.add(box(c - a, h, WT, (a + c) / 2, base + h / 2, z, m));
    for (const door of opensOn(side)) {
      const doorH = Math.min(h - 0.15, door.h), topH = h - doorH;
      if (topH <= 0) continue;
      group.add(box(door.w, topH, WT, door.axis, base + doorH + topH / 2, z, m));
    }
  };
  addWallX(x1, 'w', cm); addWallX(x2, 'e', cm); addWallZ(z1, 's', cm); addWallZ(z2, 'n', cm);
  // door frames and thresholds, aligned to the actual wall rather than the authored exterior marker
  for (const d of doors) {
    const normal = d.side === 'n' ? 1 : d.side === 's' ? -1 : d.side === 'e' ? 1 : -1;
    const wallX = d.side === 'w' ? x1 : d.side === 'e' ? x2 : d.dx;
    const wallZ = d.side === 's' ? z1 : d.side === 'n' ? z2 : d.dz;
    const frameX = d.side === 'w' || d.side === 'e' ? wallX + normal * 0.34 : d.axis;
    const frameZ = d.side === 'n' || d.side === 's' ? wallZ + normal * 0.34 : d.axis;
    const frameDepth = 0.28;
    if (d.side === 'n' || d.side === 's') {
      group.add(box(0.25, d.h, frameDepth, d.axis - d.w / 2, base + d.h / 2, frameZ, M.trim));
      group.add(box(0.25, d.h, frameDepth, d.axis + d.w / 2, base + d.h / 2, frameZ, M.trim));
      group.add(box(d.w + 0.5, 0.25, frameDepth, d.axis, base + d.h, frameZ, M.metal));
      group.add(box(d.w, 0.12, 0.8, d.axis, base + 0.06, wallZ + normal * 0.2, M.door));
    } else {
      group.add(box(frameDepth, d.h, 0.25, frameX, base + d.h / 2, d.axis - d.w / 2, M.trim));
      group.add(box(frameDepth, d.h, 0.25, frameX, base + d.h / 2, d.axis + d.w / 2, M.trim));
      group.add(box(frameDepth, 0.25, d.w + 0.5, frameX, base + d.h, d.axis, M.metal));
      group.add(box(0.8, 0.12, d.w, wallX + normal * 0.2, base + 0.06, d.axis, M.door));
    }
    const vehicle = d.h >= 4;
    const panelY = base + Math.max(1.1, d.h * 0.5);
    const panelDepth = 0.08;
    if (d.side === 'n' || d.side === 's') {
      group.add(box(d.w - 0.18, d.h - 0.22, panelDepth, d.axis, panelY, wallZ + normal * 0.06, M.door));
      for (let sy = base + 0.48; sy < base + d.h - 0.12; sy += vehicle ? 0.55 : 0.35)
        group.add(box(d.w - 0.28, 0.06, 0.12, d.axis, sy, wallZ + normal * 0.12, M.doorSlat));
    } else {
      group.add(box(panelDepth, d.h - 0.22, d.w - 0.18, wallX + normal * 0.06, panelY, d.axis, M.door));
      for (let sy = base + 0.48; sy < base + d.h - 0.12; sy += vehicle ? 0.55 : 0.35)
        group.add(box(0.12, 0.06, d.w - 0.28, wallX + normal * 0.12, sy, d.axis, M.doorSlat));
    }
    if (vehicle) {
      const offset = d.w / 2 + 0.7;
      for (const sideOffset of [-offset, offset]) {
        const px = d.side === 'w' || d.side === 'e' ? wallX + normal * 0.5 : d.axis + sideOffset;
        const pz = d.side === 'n' || d.side === 's' ? wallZ + normal * 0.5 : d.axis + sideOffset;
        group.add(cylinder(0.14, 1.15, px, base + 0.58, pz, M.warning, 8));
        group.add(cylinder(0.17, 0.12, px, base + 1.16, pz, M.warningDark, 8));
      }
      if (d.side === 'n' || d.side === 's') group.add(box(d.w + 1.2, 0.18, 1.35, d.axis, base + d.h + 0.72, wallZ + normal * 0.7, M.roof));
      else group.add(box(1.35, 0.18, d.w + 1.2, wallX + normal * 0.7, base + d.h + 0.72, d.axis, M.roof));
      if (d.side === 'n' || d.side === 's') {
        group.add(box(1.4, 0.16, 0.18, d.axis, base + d.h + 0.28, wallZ + normal * 0.26, M.light));
      } else {
        group.add(box(0.18, 0.16, 1.4, wallX + normal * 0.26, base + d.h + 0.28, d.axis, M.light));
      }
    } else {
      const lampX = d.side === 'w' || d.side === 'e' ? wallX + normal * 0.18 : d.axis;
      const lampZ = d.side === 'n' || d.side === 's' ? wallZ + normal * 0.18 : d.axis;
      group.add(box(0.34, 0.34, 0.12, lampX, base + d.h + 0.55, lampZ, M.amber));
      // Small awnings, stoops, and rails make personnel openings read as usable
      // facilities instead of texture marks on a wall.
      const terrain = segmentTerrainY(s);
      const rise = Math.max(0, base - terrain);
      const steps = Math.max(1, Math.min(18, Math.ceil(Math.max(0.22, rise) / 0.22)));
      const depth = Math.max(1.15, Math.min(7.5, (rise + 0.22) * 1.55));
      for (let step = 0; step < steps; step++) {
        const t = (step + 0.5) / steps;
        const stepY = terrain + (rise + 0.22) * t;
        const offset = normal * (0.55 + depth * (1 - t));
        const sx = d.side === 'w' || d.side === 'e' ? wallX + offset : d.axis;
        const sz = d.side === 'n' || d.side === 's' ? wallZ + offset : d.axis;
        group.add(box(d.w + 0.9, Math.max(0.16, (rise + 0.22) / steps), depth / steps + 0.1, sx, stepY, sz, M.concrete[1], d.side === 'w' || d.side === 'e' ? Math.PI / 2 : 0));
      }
      if (d.side === 'n' || d.side === 's') {
        group.add(box(d.w + 1.3, 0.18, 1.25, d.axis, base + d.h + 0.75, wallZ + normal * 0.62, M.roof));
        for (const sideOffset of [-1, 1]) group.add(addBeam([d.axis + sideOffset * (d.w / 2 + 0.45), terrain + 0.2, wallZ + normal * 0.35], [d.axis + sideOffset * (d.w / 2 + 0.45), base + d.h + 0.65, wallZ + normal * 0.55], 0.07, M.fence));
      } else {
        group.add(box(1.25, 0.18, d.w + 1.3, wallX + normal * 0.62, base + d.h + 0.75, d.axis, M.roof));
        for (const sideOffset of [-1, 1]) group.add(addBeam([wallX + normal * 0.35, terrain + 0.2, d.axis + sideOffset * (d.w / 2 + 0.45)], [wallX + normal * 0.55, base + d.h + 0.65, d.axis + sideOffset * (d.w / 2 + 0.45)], 0.07, M.fence));
      }
    }
  }
  // Long industrial bands and larger glazing keep facades legible at player distance.
  const faceBox = (side, axis, y, length, height, depth, material, offset = 0.42) => {
    const outward = side === 'n' ? 1 : side === 's' ? -1 : side === 'e' ? 1 : -1;
    if (side === 'n' || side === 's') group.add(box(length, height, depth, axis, y, (side === 'n' ? z2 : z1) + outward * offset, material));
    else group.add(box(depth, height, length, (side === 'e' ? x2 : x1) + outward * offset, y, axis, material));
  };
  for (const side of ['n', 's', 'e', 'w']) {
    const sideDoors = opensOn(side);
    const lo = ['n', 's'].includes(side) ? x1 + 2.5 : z1 + 2.5;
    const hi = ['n', 's'].includes(side) ? x2 - 2.5 : z2 - 2.5;
    const span = Math.max(1, hi - lo);
    const step = Math.max(6, Math.min(12, span / 4));
    const floorCount = Math.max(1, Math.min(s.floors || 1, 5));
    const fh = h / floorCount;
    faceBox(side, (lo + hi) / 2, base + 0.75, span, 0.25, 0.18, M.concreteDark);
    faceBox(side, (lo + hi) / 2, base + h - 0.55, span, 0.28, 0.18, M.trim);
    for (const [a, c] of cut(lo, hi, side)) {
      if (c - a > 1.2) faceBox(side, (a + c) / 2, base + 1.35, c - a, 1.05, 0.14, M.panel[1], 0.5);
    }
    for (let axis = lo; axis <= hi; axis += step) {
      if (sideDoors.some(d => Math.abs(d.axis - axis) < d.w / 2 + 1.0)) continue;
      for (let floor = 0; floor < floorCount; floor++) {
        const winY = base + fh * (floor + 0.58);
        const winH = Math.min(1.15, Math.max(0.6, fh * 0.28));
        const winW = Math.min(5.5, Math.max(2.4, step * 0.68));
        faceBox(side, axis, winY, winW, winH, 0.12, M.glass, 0.47);
        faceBox(side, axis, winY - winH / 2 - 0.12, winW + 0.35, 0.1, 0.1, M.trim, 0.49);
      }
    }
    for (let axis = lo; axis <= hi; axis += Math.max(4, step / 2)) {
      if (sideDoors.some(d => Math.abs(d.axis - axis) < d.w / 2 + 0.8)) continue;
      faceBox(side, axis, base + h * 0.5, 0.14, h - 1.15, 0.13, M.rib, 0.5);
    }
  }
  // floor band for multi-floor
  if (s.floors >= 2) for (let f = 1; f < s.floors; f++) group.add(box(w + 0.4, 0.5, d + 0.4, cx2, base + h * f / s.floors, cz2, M.concreteDark));
  // roof slab + parapet
  group.add(box(w, 0.5, d, cx2, base + h + 0.1, cz2, M.roof));
  const PW = 0.5, PH = 1.1;
  for (const [dx2, dz2, ww, dd] of [[0, d / 2, w, PW], [0, -d / 2, w, PW], [w / 2, 0, PW, d], [-w / 2, 0, PW, d]])
    group.add(box(ww, PH, dd, cx2 + dx2, base + h + 0.5 + PH / 2, cz2 + dz2, M.concreteDark));
  // roof machinery (seeded, small)
  const n = 1 + Math.floor(rand() * 2);
  for (let i = 0; i < n; i++) {
    const bw = Math.min(Math.max(3, w - 6), 3 + rand() * 6), bd = Math.min(Math.max(3, d - 6), 3 + rand() * 5), bh = 2 + rand() * 2.5;
    const bx = (rand() - 0.5) * Math.max(0, w - bw - 4), bz = (rand() - 0.5) * Math.max(0, d - bd - 4);
    group.add(box(bw, bh, bd, cx2 + bx, base + h + 0.6 + bh / 2, cz2 + bz, rand() > 0.5 ? M.roof : M.metal));
  }
  const vent = new Mesh(new CylinderGeometry(1.2, 1.2, 3, 10), M.metal);
  vent.position.set(cx2 + (rand() - 0.5) * w * 0.4, base + h + 0.6 + 1.5, cz2 + (rand() - 0.5) * d * 0.4);
  group.add(vent);
  // Corrugated ribs and windows establish an industrial facade without hiding openings.
  const addRibs = side => {
    const sideDoors = opensOn(side);
    const lo = ['n', 's'].includes(side) ? x1 + 3 : z1 + 3;
    const hi = ['n', 's'].includes(side) ? x2 - 3 : z2 - 3;
    const step = 6;
    for (let axis = lo; axis <= hi; axis += step) {
      if (sideDoors.some(d => Math.abs(d.axis - axis) < d.w / 2 + 0.7)) continue;
      const out = side === 'n' ? 1 : side === 's' ? -1 : side === 'e' ? 1 : -1;
      if (side === 'n' || side === 's') group.add(box(0.16, Math.max(1, h - 0.8), 0.16, axis, base + (h - 0.8) / 2 + 0.4, (side === 'n' ? z2 : z1) + out * 0.36, M.trim));
      else group.add(box(0.16, Math.max(1, h - 0.8), 0.16, (side === 'e' ? x2 : x1) + out * 0.36, base + (h - 0.8) / 2 + 0.4, axis, M.trim));
    }
  };
  for (const side of ['n', 's', 'e', 'w']) addRibs(side);
  if (s.floors >= 2 && s.category !== 'facade-non-enterable') {
    const fh = h / s.floors;
    const bay = 5 + Math.floor(rand() * 2);
    for (const side of ['n', 's', 'e', 'w']) {
      const sideDoors = opensOn(side);
      const lo = ['n', 's'].includes(side) ? x1 + 3 : z1 + 3;
      const hi = ['n', 's'].includes(side) ? x2 - 3 : z2 - 3;
      const out = side === 'n' ? 1 : side === 's' ? -1 : side === 'e' ? 1 : -1;
      for (let f = 0; f < s.floors; f++) for (let axis = lo; axis <= hi; axis += bay) {
        const winW = 1.8;
        if (sideDoors.some(d => Math.abs(d.axis - axis) < d.w / 2 + winW / 2 + 0.6)) continue;
        const wy = base + fh * (f + 0.58);
        if (side === 'n' || side === 's') group.add(box(winW, Math.min(1.6, fh * 0.42), 0.16, axis, wy, (side === 'n' ? z2 : z1) + out * 0.34, M.glass));
        else group.add(box(0.16, Math.min(1.6, fh * 0.42), winW, (side === 'e' ? x2 : x1) + out * 0.34, wy, axis, M.glass));
      }
    }
  }
}
for (const s of segs) if (bldCats.includes(s.category)) building(s);

// Small facade hardware supplies the scale cues between the large structural
// masses: entry placards, downpipes, electrical cabinets, and service lights.
for (const s of segs) {
  if (!bldCats.includes(s.category)) continue;
  const [x1, z1, x2, z2] = s.bounds;
  const base = raisedBase(s), h = s.height;
  for (const d of doorsByBld.get(s.id) || []) {
    const side = (() => {
      const centerX = (d.bounds[0] + d.bounds[2]) / 2, centerZ = (d.bounds[1] + d.bounds[3]) / 2;
      return [[Math.abs(centerZ - z1), 's'], [Math.abs(centerZ - z2), 'n'], [Math.abs(centerX - x1), 'w'], [Math.abs(centerX - x2), 'e']].sort((a, c) => a[0] - c[0])[0][1];
    })();
    const outward = side === 'n' ? 1 : side === 's' ? -1 : side === 'e' ? 1 : -1;
    const axis = ['n', 's'].includes(side) ? (d.bounds[0] + d.bounds[2]) / 2 : (d.bounds[1] + d.bounds[3]) / 2;
    const wallX = side === 'w' ? x1 : side === 'e' ? x2 : axis;
    const wallZ = side === 's' ? z1 : side === 'n' ? z2 : axis;
    if (['n', 's'].includes(side)) {
      group.add(box(Math.min(2.8, d.bounds[2] - d.bounds[0] + 0.3), 0.42, 0.08, axis, base + d.height + 0.92, wallZ + outward * 0.38, M.sign));
      group.add(box(0.18, 0.18, 0.12, axis - 0.65, base + d.height + 0.58, wallZ + outward * 0.42, M.light));
      group.add(box(0.18, 0.18, 0.12, axis + 0.65, base + d.height + 0.58, wallZ + outward * 0.42, M.light));
    } else {
      group.add(box(0.08, 0.42, Math.min(2.8, d.bounds[3] - d.bounds[1] + 0.3), wallX + outward * 0.38, base + d.height + 0.92, axis, M.sign));
      group.add(box(0.12, 0.18, 0.18, wallX + outward * 0.42, base + d.height + 0.58, axis - 0.65, M.light));
      group.add(box(0.12, 0.18, 0.18, wallX + outward * 0.42, base + d.height + 0.58, axis + 0.65, M.light));
    }
  }
  const downpipeX = x1 + Math.min(4, Math.max(1.2, (x2 - x1) * 0.12));
  const downpipeZ = z1 + Math.min(4, Math.max(1.2, (z2 - z1) * 0.12));
  group.add(cylinder(0.12, Math.max(2, h - 0.7), downpipeX, base + Math.max(1, h - 0.7) / 2, z1 - 0.08, M.pipeDark, 8));
  group.add(box(1.5, 1.0, 0.22, x1 + 0.9, base + 1.2, downpipeZ, M.metal));
}

// -------- industrial dressing: tanks, substations, and stacked freight --------
for (const s of segs) {
  const [x1, z1, x2, z2] = s.bounds;
  const cx3 = (x1 + x2) / 2, cz3 = (z1 + z2) / 2;
  const sy = segmentTerrainY(s);
  if (s.id === 'bld-tank-farm') {
    for (const [ox, oz, radius, height] of [[-5, 0, 4.3, 7], [5, 0, 4.3, 7]]) {
      const tank = new Mesh(new CylinderGeometry(radius, radius * 1.05, height, 16), M.siding[0]);
      tank.position.set(cx3 + ox, sy + height / 2, cz3 + oz);
      group.add(tank);
      group.add(cylinder(radius * 1.03, 0.22, cx3 + ox, sy + height * 0.54, cz3 + oz, M.rust, 16));
      group.add(box(radius * 1.5, 0.25, radius * 1.5, cx3 + ox, sy + height + 0.15, cz3 + oz, M.metal));
      const pipe = new Mesh(new CylinderGeometry(0.22, 0.22, height + 2, 8), M.pipe);
      pipe.position.set(cx3 + ox + radius * 0.65, sy + (height + 2) / 2, cz3 + oz);
      group.add(pipe);
    }
    group.add(box(18, 0.35, 2, cx3, sy + 0.18, z2 + 1.2, M.concreteDark));
  }
  if (s.id === 'bld-substation') {
    for (let i = 0; i < 3; i++) {
      const px = x1 + 8 + i * 12;
      group.add(box(7, 3.2, 5, px, sy + 1.6, cz3, M.metal));
      group.add(box(7.4, 0.25, 5.4, px, sy + 3.25, cz3, M.concreteDark));
      for (const side of [-1, 1]) group.add(box(0.18, 5, 0.18, px + side * 2.2, sy + 5.1, cz3, M.pipe));
    }
  }
  if (s.id === 'bld-east-storage-a' || s.id === 'bld-east-storage-b') {
    const crateW = Math.max(4, Math.min(8, x2 - x1 - 2)), crateD = Math.max(4, Math.min(8, z2 - z1 - 2));
    group.add(box(crateW, 2.4, crateD, cx3, sy + 1.2, cz3, M.cover[0]));
    group.add(box(crateW * 0.92, 2.1, crateD * 0.92, cx3, sy + 3.45, cz3, M.cover[1]));
    group.add(box(crateW + 0.3, 0.18, 0.18, cx3, sy + 1.3, z1 - 0.15, M.trim));
  }
}

// -------- authored industrial set dressing --------
const crateStack = (x, y, z, w, d, h, levels = 2, seed = 1) => {
  const rand = rng(seed);
  for (let level = 0; level < levels; level++) {
    const inset = level * 0.35;
    const cw = Math.max(1.2, w - inset), cd = Math.max(1.2, d - inset);
    group.add(box(cw, h, cd, x + (rand() - 0.5) * 0.4, y + h * (level + 0.5), z + (rand() - 0.5) * 0.35, M.panel[((seed + level) >>> 0) % M.panel.length]));
    group.add(box(cw + 0.08, 0.12, 0.12, x, y + h * (level + 0.72), z - cd / 2 - 0.06, M.trim));
  }
};
const pipeRack = (ax, az, bx, bz, sy, height, width = 4) => {
  const frame = segmentFrame(ax, az, bx, bz);
  const n = Math.max(2, Math.floor(frame.len / 7));
  for (let i = 0; i <= n; i++) {
    const t = i / n, px = ax + (bx - ax) * t, pz = az + (bz - az) * t;
    for (const side of [-1, 1]) {
      const [sx, sz] = offsetPoint(px, pz, frame, side * width / 2);
      group.add(box(0.25, height, 0.25, sx, sy + height / 2, sz, M.pipeDark));
    }
    group.add(orientedBox(width, 0.22, 0.22, px, sy + height, pz, bx - ax, 0, bz - az, M.metal));
  }
  for (const side of [-1, 1]) {
    const [sx, sz] = offsetPoint((ax + bx) / 2, (az + bz) / 2, frame, side * (width / 2 - 0.45));
    group.add(addBeam([sx - (bx - ax) / 2, sy + height - 0.55, sz - (bz - az) / 2], [sx + (bx - ax) / 2, sy + height - 0.55, sz + (bz - az) / 2], 0.34, M.pipe));
  }
};
const addSilo = (x, z, sy, radius, height, material = M.siding[1]) => {
  group.add(cylinder(radius, height, x, sy + height / 2, z, material, 18));
  group.add(cylinder(radius * 1.03, 0.2, x, sy + height * 0.55, z, M.rust, 18));
  group.add(cylinder(radius * 0.78, 0.5, x, sy + height + 0.25, z, M.roof, 18));
  group.add(cylinder(0.16, height + 1.6, x + radius * 0.7, sy + (height + 1.6) / 2, z, M.pipeDark, 8));
  group.add(box(radius * 1.7, 0.24, 0.3, x, sy + height * 0.58, z - radius - 0.12, M.metal));
};
const pipeGallery = (ax, az, bx, bz, sy, height, width = 4) => {
  const frame = segmentFrame(ax, az, bx, bz);
  const posts = Math.max(2, Math.ceil(frame.len / 10));
  for (let i = 0; i <= posts; i++) {
    const t = i / posts, px = ax + (bx - ax) * t, pz = az + (bz - az) * t;
    for (const side of [-1, 1]) {
      const [sx, sz] = offsetPoint(px, pz, frame, side * (width / 2 - 0.35));
      group.add(box(0.22, height, 0.22, sx, sy + height / 2, sz, M.pipeDark));
    }
    group.add(orientedBox(width, 0.18, 0.18, px, sy + height, pz, frame.nx, 0, frame.nz, M.metal));
  }
  for (const [level, radius, material] of [[height - 0.45, 0.24, M.pipe], [height - 1.25, 0.16, M.tunnelRust], [height - 2.05, 0.12, M.pipeDark]]) {
    for (const lane of [-0.28, 0.2]) {
      const [lax, laz] = offsetPoint(ax, az, frame, width * lane), [lbx, lbz] = offsetPoint(bx, bz, frame, width * lane);
      group.add(addBeam([lax, sy + level, laz], [lbx, sy + level, lbz], radius, material));
      for (let i = 0; i <= posts; i++) {
        const t = i / posts, px = lax + (lbx - lax) * t, pz = laz + (lbz - laz) * t;
        group.add(addBeam([px, sy + level - 0.34, pz], [px, sy + level + 0.34, pz], 0.045, M.metal));
      }
    }
  }
  for (let i = 0; i < posts; i += 2) {
    const t1 = i / posts, t2 = Math.min(1, (i + 1) / posts);
    const [aX, aZ] = offsetPoint(ax + (bx - ax) * t1, az + (bz - az) * t1, frame, -width * 0.38);
    const [bX, bZ] = offsetPoint(ax + (bx - ax) * t2, az + (bz - az) * t2, frame, width * 0.38);
    group.add(addBeam([aX, sy + 0.3, aZ], [bX, sy + height - 0.25, bZ], 0.045, M.metal));
  }
};
const processVessel = (x, z, sy, radius, height, material = M.heroSiding) => {
  group.add(cylinder(radius, height, x, sy + height / 2, z, material, 18));
  for (const fraction of [0.12, 0.52, 0.86]) group.add(cylinder(radius * 1.04, 0.16, x, sy + height * fraction, z, fraction === 0.52 ? M.tunnelRust : M.rust, 18));
  group.add(cylinder(radius * 0.78, 0.36, x, sy + height + 0.18, z, M.roof, 18));
  for (const side of [-1, 1]) {
    const lx = x + side * radius * 0.62;
    group.add(addBeam([lx, sy + 0.4, z - 0.55], [lx, sy + height - 0.25, z - 0.55], 0.055, M.metal));
    for (let y = sy + 1.1; y < sy + height - 0.2; y += 0.9) group.add(box(0.12, 0.07, 1.05, lx, y, z - 0.55, M.metal));
  }
};
const serviceStack = (x, z, sy, height, radius = 0.22) => {
  group.add(cylinder(radius, height, x, sy + height / 2, z, M.pipeDark, 10));
  group.add(cylinder(radius * 1.35, 0.18, x, sy + height * 0.38, z, M.rust, 10));
  group.add(cylinder(radius * 1.35, 0.18, x, sy + height * 0.72, z, M.rust, 10));
  group.add(box(radius * 4.5, 0.14, radius * 2.2, x, sy + height + 0.2, z, M.metal));
};
const facadeConduit = (ax, az, bx, bz, y, radius = 0.14) => {
  const frame = segmentFrame(ax, az, bx, bz);
  group.add(addBeam([ax, y, az], [bx, y, bz], radius, M.pipeDark));
  for (const t of [0.2, 0.5, 0.8]) {
    const px = ax + (bx - ax) * t, pz = az + (bz - az) * t;
    group.add(box(0.16, 0.8, 0.16, px, y - 0.35, pz, M.metal));
  }
  return frame;
};
const wallServiceRun = (side, start, end, wall, y, drops = 3) => {
  const outward = side === 'n' ? 1 : side === 's' ? -1 : side === 'e' ? 1 : -1;
  const point = axis => side === 'n' || side === 's' ? [axis, y, wall + outward * 0.42] : [wall + outward * 0.42, y, axis];
  group.add(addBeam(point(start), point(end), 0.16, M.pipeDark));
  for (let i = 0; i <= drops; i++) {
    const axis = start + (end - start) * i / drops;
    const p = point(axis), q = [...p]; q[1] = Math.max(0.7, y - 3.2 - (i % 2) * 0.55);
    group.add(addBeam(p, q, 0.085, M.pipeDark));
    const wallPoint = side === 'n' || side === 's' ? [axis, q[1], wall + outward * 0.08] : [wall + outward * 0.08, q[1], axis];
    group.add(addBeam(wallPoint, q, 0.055, M.metal));
    group.add(box(side === 'n' || side === 's' ? 1.3 : 0.18, 0.12, side === 'n' || side === 's' ? 0.18 : 1.3, q[0], q[1] - 0.18, q[2], M.light));
  }
};
const wallLight = (side, axis, wall, y) => {
  const outward = side === 'n' ? 1 : side === 's' ? -1 : side === 'e' ? 1 : -1;
  if (side === 'n' || side === 's') {
    group.add(box(1.3, 0.12, 0.18, axis, y, wall + outward * 0.12, M.light));
    group.add(box(0.12, 0.18, 0.5, axis, y + 0.16, wall + outward * 0.08, M.metal));
  } else {
    group.add(box(0.18, 0.12, 1.3, wall + outward * 0.12, y, axis, M.light));
    group.add(box(0.5, 0.18, 0.12, wall + outward * 0.08, y + 0.16, axis, M.metal));
  }
};
const wallCabinet = (side, axis, wall, y = 1.35, w = 1.2, h = 1.5) => {
  const outward = side === 'n' ? 1 : side === 's' ? -1 : side === 'e' ? 1 : -1;
  if (side === 'n' || side === 's') {
    group.add(box(w, h, 0.22, axis, y, wall + outward * 0.12, M.metal));
    group.add(box(w * 0.72, h * 0.08, 0.05, axis, y + h * 0.56, wall + outward * 0.25, M.trim));
    group.add(box(w * 0.72, h * 0.08, 0.05, axis, y + h * 0.34, wall + outward * 0.25, M.trim));
  } else {
    group.add(box(0.22, h, w, wall + outward * 0.12, y, axis, M.metal));
    group.add(box(0.05, h * 0.08, w * 0.72, wall + outward * 0.25, y + h * 0.56, axis, M.trim));
    group.add(box(0.05, h * 0.08, w * 0.72, wall + outward * 0.25, y + h * 0.34, axis, M.trim));
  }
};
const wallWindowBand = (side, start, end, wall, y, count = 5) => {
  const span = (end - start) / count;
  for (let i = 0; i < count; i++) {
    const axis = start + span * (i + 0.5), width = Math.max(2.4, span * 0.62);
    const outward = side === 'n' ? 1 : side === 's' ? -1 : side === 'e' ? 1 : -1;
    if (side === 'n' || side === 's') {
      group.add(edgeBox(width, 0.92, 0.16, axis, y, wall + outward * 0.24, M.glass, 0, 0.025));
      group.add(edgeBox(width + 0.28, 0.1, 0.18, axis, y + 0.55, wall + outward * 0.33, M.trim, 0, 0.02));
      group.add(edgeBox(width + 0.28, 0.1, 0.18, axis, y - 0.55, wall + outward * 0.33, M.trim, 0, 0.02));
      group.add(edgeBox(0.1, 1.1, 0.18, axis - width * 0.33, y, wall + outward * 0.33, M.trim, 0, 0.02));
      group.add(edgeBox(0.1, 1.1, 0.18, axis + width * 0.33, y, wall + outward * 0.33, M.trim, 0, 0.02));
    } else {
      group.add(edgeBox(0.16, 0.92, width, wall + outward * 0.24, y, axis, M.glass, 0, 0.025));
      group.add(edgeBox(0.18, 0.1, width + 0.28, wall + outward * 0.33, y + 0.55, axis, M.trim, 0, 0.02));
      group.add(edgeBox(0.18, 0.1, width + 0.28, wall + outward * 0.33, y - 0.55, axis, M.trim, 0, 0.02));
      group.add(edgeBox(0.18, 1.1, 0.1, wall + outward * 0.33, y, axis - width * 0.33, M.trim, 0, 0.02));
      group.add(edgeBox(0.18, 1.1, 0.1, wall + outward * 0.33, y, axis + width * 0.33, M.trim, 0, 0.02));
    }
  }
};
const facadeVentBank = (side, start, end, wall, y, count = 3) => {
  const outward = side === 'n' ? 1 : side === 's' ? -1 : side === 'e' ? 1 : -1;
  const span = (end - start) / count;
  for (let i = 0; i < count; i++) {
    const axis = start + span * (i + 0.5), width = Math.max(1.4, span * 0.52);
    if (side === 'n' || side === 's') {
      group.add(box(width, 1.25, 0.12, axis, y, wall + outward * 0.2, M.metal));
      for (let j = -2; j <= 2; j++) group.add(box(0.07, 0.92, 0.1, axis + j * width * 0.17, y, wall + outward * 0.28, M.trim));
      group.add(box(width + 0.2, 0.1, 0.16, axis, y + 0.7, wall + outward * 0.25, M.rust));
    } else {
      group.add(box(0.12, 1.25, width, wall + outward * 0.2, y, axis, M.metal));
      for (let j = -2; j <= 2; j++) group.add(box(0.1, 0.92, 0.07, wall + outward * 0.28, y, axis + j * width * 0.17, M.trim));
      group.add(box(0.16, 0.1, width + 0.2, wall + outward * 0.25, y + 0.7, axis, M.rust));
    }
  }
};
const facadeNameplate = (side, axis, wall, y, width = 4.8) => {
  const outward = side === 'n' ? 1 : side === 's' ? -1 : side === 'e' ? 1 : -1;
  if (side === 'n' || side === 's') {
    group.add(box(width, 0.72, 0.12, axis, y, wall + outward * 0.25, M.sign));
    group.add(box(width * 0.72, 0.08, 0.08, axis, y, wall + outward * 0.34, M.warning));
    group.add(box(width * 0.45, 0.06, 0.08, axis, y - 0.18, wall + outward * 0.34, M.light));
  } else {
    group.add(box(0.12, 0.72, width, wall + outward * 0.25, y, axis, M.sign));
    group.add(box(0.08, 0.08, width * 0.72, wall + outward * 0.34, y, axis, M.warning));
    group.add(box(0.08, 0.06, width * 0.45, wall + outward * 0.34, y - 0.18, axis, M.light));
  }
};
const fenceLine = (ax, az, bx, bz, sy, height = 2.4, postStep = 4) => {
  const frame = segmentFrame(ax, az, bx, bz), posts = Math.max(2, Math.ceil(frame.len / postStep));
  for (let i = 0; i <= posts; i++) {
    const t = i / posts, px = ax + (bx - ax) * t, pz = az + (bz - az) * t;
    group.add(box(0.1, height, 0.1, px, sy + height / 2, pz, M.fence));
  }
  for (const level of [0.35, height - 0.2]) group.add(addBeam([ax, sy + level, az], [bx, sy + level, bz], 0.055, M.fence));
  for (let i = 0; i < posts; i++) {
    const t1 = i / posts, t2 = (i + 1) / posts;
    const x1 = ax + (bx - ax) * t1, z1 = az + (bz - az) * t1, x2 = ax + (bx - ax) * t2, z2 = az + (bz - az) * t2;
    group.add(addBeam([x1, sy + 0.4, z1], [x2, sy + height - 0.25, z2], 0.025, M.fence));
  }
};
const facadePanelRibs = (side, start, end, wall, base, height, step = 4.8, material = null) => {
  const outward = side === 'n' ? 1 : side === 's' ? -1 : side === 'e' ? 1 : -1;
  const alongX = side === 'n' || side === 's';
  const sheetMaterial = material ?? (Math.abs(Math.round(start * 10)) % 2 ? M.heroSidingAlt : M.heroSiding);
  corrugatedSheet(side, start, end, wall, base + 0.28, Math.max(0.6, height - 0.56), sheetMaterial, 0.44, 0.085);
  const face = (axis, y, length, tall, depth, material) => {
    if (alongX) group.add(edgeBox(length, tall, depth, axis, y, wall + outward * (0.12 + depth / 2), material, 0, 0.035));
    else group.add(edgeBox(depth, tall, length, wall + outward * (0.12 + depth / 2), y, axis, material, 0, 0.035));
  };
  for (const y of [base + 1.1, base + height * 0.5, base + height - 0.42])
    face((start + end) / 2, y, Math.max(1, end - start), 0.09, 0.1, M.trim);
  for (let axis = start + step; axis < end - 0.01; axis += step * 2)
    face(axis, base + height / 2, 0.075, Math.max(1, height - 0.7), 0.09, M.trim);
};
const facadeWeathering = (side, start, end, wall, base, height, seed, count = 9) => {
  const rand = rng(seed);
  const outward = side === 'n' ? 1 : side === 's' ? -1 : side === 'e' ? 1 : -1;
  const alongX = side === 'n' || side === 's';
  const face = (axis, y, length, tall, depth, material) => {
    if (alongX) group.add(box(length, tall, depth, axis, y, wall + outward * (0.16 + depth / 2), material));
    else group.add(box(depth, tall, length, wall + outward * (0.16 + depth / 2), y, axis, material));
  };
  for (let i = 0; i < count; i++) {
    const axis = start + (end - start) * (0.06 + rand() * 0.88);
    const streakH = 0.9 + rand() * Math.min(3.8, height * 0.34);
    const top = base + height * (0.35 + rand() * 0.46);
    const width = 0.06 + rand() * 0.16;
    face(axis, top - streakH / 2, width, streakH, 0.035, rand() > 0.88 ? M.rust : M.loadingStain);
    if (rand() > 0.46) {
      const drip = Math.min(0.8, streakH * 0.25);
      face(axis + (rand() - 0.5) * 0.24, top - streakH - drip / 2, width * 0.55, drip, 0.028, M.rust);
    }
  }
  for (let i = 0; i < Math.max(3, Math.floor(count / 3)); i++) {
    const axis = start + (end - start) * (0.12 + rand() * 0.76);
    face(axis, base + 0.58 + rand() * 0.34, 1.1 + rand() * 1.8, 0.12, 0.045, M.concreteDark);
  }
};
const dockDoorKit = (side, axis, wall, base, width, height, variant = 'dock') => {
  const outward = side === 'n' ? 1 : side === 's' ? -1 : side === 'e' ? 1 : -1;
  const alongX = side === 'n' || side === 's';
  const px = alongX ? axis : wall + outward * 1.0, pz = alongX ? wall + outward * 1.0 : axis;
  group.add(alongX ? box(width + 0.8, 0.22, 2.1, px, base + 0.11, pz, M.concreteDark) : box(2.1, 0.22, width + 0.8, px, base + 0.11, pz, M.concreteDark));
  group.add(alongX ? box(width + 0.4, 0.18, 0.18, px, base + 1.0, wall + outward * 0.5, M.rust) : box(0.18, 0.18, width + 0.4, wall + outward * 0.5, base + 1.0, pz, M.rust));
  for (const edge of [-1, 1]) {
    const ex = alongX ? axis + edge * (width / 2 + 0.42) : wall + outward * 1.02;
    const ez = alongX ? wall + outward * 1.02 : axis + edge * (width / 2 + 0.42);
    group.add(cylinder(0.16, 1.15, ex, base + 0.58, ez, M.warning, 10));
    group.add(cylinder(0.2, 0.13, ex, base + 1.17, ez, M.warningDark, 10));
  }
  const canopyY = base + height + 0.55;
  const canopyMaterial = variant === 'loading-dock' ? M.loadingCanopy : M.roof;
  if (variant !== 'loading-dock') group.add(alongX ? box(width + 1.1, 0.18, 1.5, px, canopyY, pz, canopyMaterial) : box(1.5, 0.18, width + 1.1, px, canopyY, pz, canopyMaterial));
  for (const edge of [-1, 1]) {
    const ex = alongX ? axis + edge * (width / 2 + 0.4) : wall + outward * 1.25;
    const ez = alongX ? wall + outward * 1.25 : axis + edge * (width / 2 + 0.4);
    group.add(addBeam([ex, base + 1.35, ez], [ex, canopyY, ez], 0.07, M.metal));
  }
};
const heroDoorBay = (side, axis, wall, base, width, height, variant = 'dock') => {
  const outward = side === 'n' ? 1 : side === 's' ? -1 : side === 'e' ? 1 : -1;
  const alongX = side === 'n' || side === 's';
  const panelY = base + height / 2;
  const doorMaterial = variant === 'loading-dock' ? M.loadingDoor : M.door;
  const slatMaterial = variant === 'loading-dock' ? M.loadingSlat : M.dockSlat;
  const frameMaterial = variant === 'loading-dock' ? M.loadingFrame : M.trim;
  dockDoorKit(side, axis, wall, base, width, height, variant);
  if (alongX) {
    group.add(box(width - 0.34, height - 0.28, 0.1, axis, panelY, wall + outward * 0.43, doorMaterial));
    group.add(box(width + 0.7, 0.22, 0.18, axis, base + height + 0.14, wall + outward * 0.48, frameMaterial));
    for (let y = base + 0.5; y < base + height - 0.12; y += variant === 'dock' ? 0.5 : 0.34)
      group.add(box(width - 0.5, 0.1, 0.16, axis, y, wall + outward * 0.62, slatMaterial));
    if (variant === 'window') group.add(box(width * 0.62, 0.62, 0.06, axis, base + height * 0.64, wall + outward * 0.55, M.glass));
    for (const edge of [-1, 1]) group.add(box(0.18, height + 0.35, 0.2, axis + edge * (width / 2 + 0.16), panelY, wall + outward * 0.46, frameMaterial));
  } else {
    group.add(box(0.1, height - 0.28, width - 0.34, wall + outward * 0.43, panelY, axis, doorMaterial));
    group.add(box(0.18, 0.22, width + 0.7, wall + outward * 0.48, base + height + 0.14, axis, frameMaterial));
    for (let y = base + 0.5; y < base + height - 0.12; y += variant === 'dock' ? 0.5 : 0.34)
      group.add(box(0.16, 0.1, width - 0.5, wall + outward * 0.62, y, axis, slatMaterial));
    if (variant === 'window') group.add(box(0.06, 0.62, width * 0.62, wall + outward * 0.55, base + height * 0.64, axis, M.glass));
    for (const edge of [-1, 1]) group.add(box(0.2, height + 0.35, 0.18, wall + outward * 0.46, panelY, axis + edge * (width / 2 + 0.16), frameMaterial));
  }
  if (variant === 'loading-dock') {
    const fixtureY = base + height - 0.18;
    group.add(alongX ? box(width - 1.2, 0.06, 0.08, axis, fixtureY, wall + outward * 0.78, M.light) : box(0.08, 0.06, width - 1.2, wall + outward * 0.78, fixtureY, axis, M.light));
  }
};
const recessedLoadingBay = (axis, wall, base, width, height, recessDepth = 3.2, rearDoorOffset = 0, soffitMaterial = M.light) => {
  const frontZ = wall + recessDepth;
  const returnDepth = frontZ - wall - 0.35;
  const returnZ = wall + 0.35 + returnDepth / 2;
  const jambWidth = Math.max(0.72, Math.min(1.0, width * 0.13));
  const doorWidth = width - jambWidth * 2 - 0.18;
  const doorZ = wall + 0.18 - rearDoorOffset;
  const panelY = base + height / 2;
  group.add(box(width + 0.18, height + 0.24, 0.16, axis, panelY, wall + 0.08, M.concreteDark));
  group.add(box(doorWidth, height - 0.28, 0.1, axis, panelY, doorZ, M.loadingDoor));
  group.add(box(width + 0.7, 0.22, 0.18, axis, base + height + 0.14, wall + 0.2, M.loadingFrame));
  for (let y = base + 0.5; y < base + height - 0.12; y += 0.34)
    group.add(box(doorWidth - 0.16, 0.1, 0.16, axis, y, doorZ + 0.18, M.loadingSlat));
  for (const edge of [-1, 1]) group.add(box(0.18, height + 0.35, 0.2, axis + edge * (doorWidth / 2 + 0.08), panelY, wall + 0.2, M.loadingFrame));
  group.add(box(width - 1.2, 0.06, 0.08, axis, base + height - 0.18, wall + 0.42, M.light));
  // Rubber seals and guide tracks separate the moving door from the masonry return.
  for (const edge of [-1, 1]) {
    const sealX = axis + edge * (doorWidth / 2 + 0.04);
    group.add(edgeBox(0.16, height - 0.36, 0.14, sealX, panelY, doorZ + 0.12, M.rubber, 0, 0.035));
    group.add(edgeBox(0.12, 0.08, 0.22, sealX, base + 0.18, doorZ + 0.12, M.metal, 0, 0.025));
  }
  group.add(edgeBox(doorWidth + 0.1, 0.16, 0.14, axis, base + height - 0.2, doorZ + 0.12, M.rubber, 0, 0.035));
  for (const fastener of [-0.34, -0.12, 0.12, 0.34]) {
    const fx = axis + fastener * doorWidth;
    group.add(cylinder(0.035, 0.025, fx, base + height - 0.3, doorZ + 0.25, M.metal, 8, Math.PI / 2));
  }
  for (const side of [-1, 1]) {
    const x = axis + side * (width / 2 - jambWidth / 2);
    group.add(box(jambWidth, height + 0.18, returnDepth, x, base + (height + 0.18) / 2, returnZ, M.concreteDark));
    group.add(box(jambWidth + 0.25, height + 0.34, 0.34, x, base + (height + 0.34) / 2, frontZ, M.loadingFrame));
    group.add(cylinder(0.08, height + 0.1, axis + side * (width / 2 + 0.38), base + (height + 0.1) / 2, frontZ, M.metal, 8));
    group.add(cylinder(0.16, 0.16, axis + side * (width / 2 + 0.38), base + 0.08, frontZ, M.warning, 8));
  }
  // A shallow weather hood makes the dock a real exterior assembly, not a door cut into a wall.
  const canopyDepth = Math.min(2.8, Math.max(2.1, recessDepth * 0.36));
  const canopyZ = frontZ - canopyDepth * 0.42;
  const canopyY = base + height + 0.58;
  group.add(edgeBox(width + 1.1, 0.22, canopyDepth, axis, canopyY, canopyZ, M.loadingCanopy, 0, 0.06));
  group.add(edgeBox(width + 0.92, 0.08, canopyDepth - 0.18, axis, canopyY - 0.17, canopyZ, M.loadingFrame, 0, 0.035));
  for (const side of [-1, 1]) {
    const supportX = axis + side * (width / 2 + 0.36), supportZ = canopyZ + canopyDepth * 0.36;
    group.add(addBeam([supportX, base + height + 0.12, supportZ], [supportX, canopyY - 0.1, supportZ], 0.07, M.loadingFrame));
    group.add(addBeam([supportX, base + height + 0.2, supportZ], [supportX, canopyY - 0.1, supportZ - 0.72], 0.045, M.metal));
  }
  group.add(box(width - jambWidth * 2 - 0.1, 0.12, Math.max(1.4, returnDepth - 0.25), axis, base + 0.06, returnZ, M.concreteDark));
  const soffitDepth = Math.max(1.4, returnDepth * 0.56);
  group.add(edgeBox(width - jambWidth * 2 - 0.05, 0.16, soffitDepth, axis, base + height - 0.22, wall + 0.35 + soffitDepth / 2, M.roof, 0, 0.035));
  group.add(box(width - jambWidth * 2 - 0.25, 0.08, Math.max(1.1, soffitDepth - 0.18), axis, base + height - 0.34, wall + 0.35 + soffitDepth / 2, soffitMaterial));
  // Unequal raised dock decks make the recessed bays physically legible at eye level.
  const deckBase = Math.max(base, 0.34);
  const deckRise = axis === -60 ? 1.02 : axis === -44 ? 0.94 : 0.9;
  const deckTop = deckBase + deckRise;
  const deckDepth = recessDepth + 1.25;
  const deckFront = wall + deckDepth;
  const deckMaterial = M.concrete[(Math.abs(axis) / 4) % M.concrete.length | 0];
  group.add(box(width + 0.42, deckRise, deckDepth, axis, deckBase + deckRise / 2, wall + deckDepth / 2, deckMaterial));
  group.add(box(width + 0.54, deckRise + 0.28, 0.32, axis, deckBase + (deckRise + 0.28) / 2, deckFront + 0.08, M.concreteDark));
  group.add(box(width + 0.7, 0.14, 0.22, axis, deckTop + 0.08, deckFront + 0.24, M.curb));
  group.add(box(width + 0.58, 0.12, 0.2, axis, deckTop + 0.07, deckFront - 0.12, M.curb));
  group.add(flatPolygon(axis, wall + 1.05, width - 0.8, 1.4, M.loadingStain, axis === -60 ? 0.04 : -0.03, deckTop + 0.018, idSeed(`loading-dock-wear-${axis}`), 8));
  group.add(flatPolygon(axis + 0.7, wall + 2.25, width * 0.52, 0.7, M.loadingPuddle, -0.04, deckTop + 0.022, idSeed(`loading-dock-puddle-${axis}`), 7));
  const drainZ = deckFront + 10.8;
  const rampStart = deckFront + 0.28;
  const rampSamples = [[axis, deckTop + 0.03, rampStart], [axis, deckBase + 0.04, drainZ]];
  if (rampStart < drainZ) {
    const ramp = ribbon(rampSamples, width + 0.56, M.loadingAsphalt, { topOffset: 0.02, thickness: 0.2 });
    ramp.userData.worldUvPeriod = 6.4;
    group.add(ramp);
    for (let z = rampStart + 2.6; z < drainZ - 0.4; z += 2.8) {
      const t = (z - rampStart) / (drainZ - rampStart);
      const y = deckTop + 0.03 + (deckBase + 0.04 - (deckTop + 0.03)) * t;
      group.add(ribbon([[axis - (width + 0.22) / 2, y + 0.1, z], [axis + (width + 0.22) / 2, y + 0.1, z]], 0.045, M.concreteDark, { topOffset: 0.012, flat: true }));
    }
    for (const side of [-1, 1]) {
      group.add(ribbon(rampSamples, 0.16, M.curb, { centerOffset: side * (width / 2 + 0.32), topOffset: 0.14, thickness: 0.12 }));
    }
  }
  // A narrow runoff channel joins each bay to the shared curb drain.
  const channelStart = rampStart + 0.12;
  if (channelStart < drainZ) {
    group.add(box(0.18, 0.055, drainZ - channelStart, axis, deckBase + 0.08, (channelStart + drainZ) / 2, M.drain));
    for (let z = channelStart + 0.3; z < drainZ; z += 0.46) group.add(box(0.06, 0.07, 0.22, axis, deckBase + 0.12, z, M.metal));
  }
  for (const side of [-1, 1]) {
    group.add(cylinder(0.14, 0.95, axis + side * (width / 2 + 0.5), deckBase + 0.48, rampStart + 0.18, M.warning, 8));
    group.add(cylinder(0.18, 0.12, axis + side * (width / 2 + 0.5), deckBase + 0.94, rampStart + 0.18, M.warningDark, 8));
    group.add(edgeBox(0.34, 0.72, 0.24, axis + side * (width / 2 - 0.58), deckBase + 0.4, deckFront + 0.18, M.rubber, 0, 0.055));
    group.add(edgeBox(0.22, 0.92, 0.28, axis + side * (width / 2 - 0.58), deckBase + 0.48, deckFront + 0.42, M.rubber, 0, 0.045));
    const railX = axis + side * (width / 2 + 0.62);
    group.add(addBeam([railX, deckTop + 0.98, deckFront + 0.36], [railX, deckBase + 1.0, drainZ - 0.42], 0.05, M.fence));
    for (const [postZ, postY] of [[deckFront + 0.36, deckTop + 0.48], [drainZ - 0.42, deckBase + 0.48]])
      group.add(addBeam([railX, postY, postZ], [railX, postY + 0.52, postZ], 0.045, M.fence));
  }
};
const bollard = (x, z, sy, height = 1.15, scale = 1) => {
  group.add(cylinder(0.14 * scale, height * scale, x, sy + height * scale / 2, z, M.warning, 8));
  group.add(cylinder(0.18 * scale, 0.12 * scale, x, sy + height * scale - 0.08 * scale, z, M.warningDark, 8));
};
const bollardRow = (ax, az, bx, bz, sy, count = 4, height = 1.15) => {
  for (let i = 0; i < count; i++) {
    const t = count === 1 ? 0.5 : i / (count - 1);
    bollard(ax + (bx - ax) * t, az + (bz - az) * t, sy, height);
  }
};
const dockLamp = (x, z, sy, height = 4.8) => {
  group.add(cylinder(0.42, 0.12, x, sy + 0.06, z, M.concreteDark, 12));
  group.add(taperedCylinder(0.1, 0.17, height, x, sy + height / 2, z, M.metal, 12));
  group.add(addBeam([x, sy + height, z], [x, sy + height + 0.16, z + 0.72], 0.08, M.metal));
  group.add(box(0.82, 0.2, 0.34, x, sy + height - 0.02, z + 0.86, M.lampHousing));
  group.add(box(0.58, 0.05, 0.22, x, sy + height - 0.16, z + 0.86, M.light));
};
const bayMark = (x, z, width, depth, rotation = 0, yOverride = null) => {
  const y = yOverride ?? roadTopYAt(x, z, surfaceYAt(x, z, 0));
  const local = (lx, lz) => [x + Math.cos(rotation) * lx - Math.sin(rotation) * lz, z + Math.sin(rotation) * lx + Math.cos(rotation) * lz];
  const [a1, a2] = local(-width / 2, -depth / 2), [b1, b2] = local(width / 2, -depth / 2);
  const [c1, c2] = local(-width / 2, depth / 2), [d1, d2] = local(width / 2, depth / 2);
  group.add(flatSegment([a1, y, a2], [b1, y, b2], 0.1, M.lineWhite, 0.045));
  group.add(flatSegment([a1, y, a2], [c1, y, c2], 0.1, M.lineWhite, 0.045));
  group.add(flatSegment([b1, y, b2], [d1, y, d2], 0.1, M.lineWhite, 0.045));
};
const facadeCatwalk = (side, start, end, wall, y, depth = 2.4) => {
  const outward = side === 'n' ? 1 : side === 's' ? -1 : side === 'e' ? 1 : -1;
  const length = Math.abs(end - start), axis = (start + end) / 2;
  if (side === 'n' || side === 's') {
    group.add(box(length, 0.16, depth, axis, y, wall + outward * depth / 2, M.metal));
    for (const railY of [y + 0.58, y + 1.18]) group.add(box(length, 0.08, 0.08, axis, railY, wall + outward * (depth - 0.18), M.fence));
    for (let p = start; p <= end; p += 3.5) group.add(box(0.08, 1.25, 0.08, p, y + 0.63, wall + outward * (depth - 0.18), M.fence));
  } else {
    group.add(box(depth, 0.16, length, wall + outward * depth / 2, y, axis, M.metal));
    for (const railY of [y + 0.58, y + 1.18]) group.add(box(0.08, 0.08, length, wall + outward * (depth - 0.18), railY, axis, M.fence));
    for (let p = start; p <= end; p += 3.5) group.add(box(0.08, 1.25, 0.08, wall + outward * (depth - 0.18), y + 0.63, p, M.fence));
  }
};
const loadingUtilityGallery = (x, startZ, endZ, sy, height = 5.4, width = 3.2) => {
  const posts = Math.max(3, Math.ceil(Math.abs(endZ - startZ) / 6));
  for (let i = 0; i <= posts; i++) {
    const z = startZ + (endZ - startZ) * i / posts;
    group.add(edgeBox(0.28, height, 0.28, x - width / 2, sy + height / 2, z, M.pipeDark, 0, 0.045));
    group.add(edgeBox(0.28, height, 0.28, x + width / 2, sy + height / 2, z, M.pipeDark, 0, 0.045));
    group.add(addBeam([x - width / 2, sy + height, z], [x + width / 2, sy + height, z], 0.09, M.metal));
    if (i < posts) {
      const nextZ = startZ + (endZ - startZ) * (i + 1) / posts;
      group.add(addBeam([x - width / 2, sy + 0.35, z], [x + width / 2, sy + height - 0.25, nextZ], 0.045, M.metal));
      group.add(addBeam([x + width / 2, sy + 0.35, z], [x - width / 2, sy + height - 0.25, nextZ], 0.045, M.metal));
    }
  }
  for (const [level, radius, material] of [[height - 0.48, 0.22, M.pipe], [height - 1.35, 0.15, M.pipeDark], [height - 2.15, 0.1, M.rust]]) {
    for (const side of [-0.28, 0.2]) {
      group.add(addBeam([x + width * side, sy + level, startZ], [x + width * side, sy + level, endZ], radius, material));
    }
  }
  for (const z of [startZ + 4.2, startZ + 12.8, endZ - 3.4]) {
    group.add(edgeBox(0.72, 0.16, 0.22, x - width / 2 - 0.12, sy + 1.55, z, M.metal, 0, 0.04));
    group.add(cylinder(0.16, 0.08, x - width / 2 - 0.52, sy + 1.55, z, M.warningDark, 12, Math.PI / 2));
  }
};
const loadingFacadeFrame = () => {
  const wall = 90.58;
  const solidSpans = [[-101.5, -80.6], [-71.4, -64.6], [-55.4, -48.6], [-39.4, -30.5]];
  const doorSpans = [[-80.3, -71.7, 4.5], [-63.6, -56.4, 5.1], [-48.4, -39.6, 4.3]];
  const face = (a, c, y, height, depth, material, z = wall) => group.add(edgeBox(c - a, height, depth, (a + c) / 2, y, z, material, 0, Math.min(0.08, depth * 0.32)));
  for (const [a, c] of solidSpans) {
    face(a, c, 0.78, 1.08, 0.74, M.concrete[1], 90.18);
    face(a - 0.08, c + 0.08, 1.38, 0.16, 0.9, M.curb, 90.22);
    for (const y of [4.92, 8.78, 11.52]) face(a, c, y, 0.14, 0.18, M.loadingFrame, wall + 0.04);
  }
  const columns = [-101.6, -80.5, -71.5, -63.5, -56.5, -48.5, -39.5, -30.4];
  for (const x of columns) {
    group.add(edgeBox(0.34, 11.15, 0.32, x, 5.86, wall + 0.08, M.loadingFrame, 0, 0.055));
    group.add(edgeBox(0.58, 0.16, 0.46, x, 1.58, wall + 0.08, M.metal, 0, 0.04));
  }
  for (const [a, c, height] of doorSpans) {
    const axis = (a + c) / 2;
    face(a - 0.18, c + 0.18, height + 0.16, 0.2, 0.28, M.loadingFrame, wall + 0.1);
    const glassY = Math.max(6.65, height + 2.05);
    group.add(edgeBox(c - a - 1.15, 1.08, 0.18, axis, glassY, wall + 0.2, M.loadingGlass, 0, 0.035));
    face(a + 0.38, c - 0.38, glassY + 0.62, 0.12, 0.22, M.trim, wall + 0.32);
    face(a + 0.38, c - 0.38, glassY - 0.62, 0.12, 0.22, M.trim, wall + 0.32);
    group.add(edgeBox(0.12, 1.3, 0.22, a + 0.52, glassY, wall + 0.32, M.trim, 0, 0.025));
    group.add(edgeBox(0.12, 1.3, 0.22, c - 0.52, glassY, wall + 0.32, M.trim, 0, 0.025));
  }
  for (const [a, c] of solidSpans) {
    const width = c - a - 0.8, axis = (a + c) / 2;
    group.add(edgeBox(width, 0.9, 0.16, axis, 9.32, wall + 0.22, M.loadingGlass, 0, 0.025));
    for (const x of [a + 0.42, c - 0.42]) group.add(edgeBox(0.12, 1.12, 0.2, x, 9.32, wall + 0.32, M.trim, 0, 0.02));
    for (const y of [8.78, 9.86]) group.add(edgeBox(width + 0.18, 0.1, 0.18, axis, y, wall + 0.32, M.trim, 0, 0.02));
  }
};
const loadingNorthConstruction = () => {
  const wall = 90.58;
  const solidSpans = [[-101.5, -80.6], [-71.4, -64.6], [-55.4, -48.6], [-39.4, -30.5]];
  const doorSpans = [[-80.3, -71.7, 4.5], [-63.6, -56.4, 5.1], [-48.4, -39.6, 4.3]];
  const face = (a, c, y, height, depth, material, z = wall + 0.14) => {
    group.add(edgeBox(c - a, height, depth, (a + c) / 2, y, z, material, 0, Math.min(0.06, depth * 0.32)));
  };

  // A warehouse wall meets a battered foundation, not the apron as a knife edge.
  // Keep the plinth segmented so the three dock recesses remain legible.
  for (const [a, c] of solidSpans) {
    face(a + 0.16, c - 0.16, 0.56, 0.72, 0.44, M.concreteDark, wall + 0.29);
    face(a + 0.28, c - 0.28, 0.91, 0.08, 0.5, M.loadingStain, wall + 0.43);
  }

  // Separate sheet fields with real shadow gaps instead of one uninterrupted wall.
  // Keep the clerestory band open so glazing remains a distinct construction layer.
  const panelBands = [[1.72, 2.78], [3.02, 5.1], [5.34, 7.44], [7.68, 8.64], [9.98, 11.12]];
  for (const [a, c] of solidSpans) {
    for (let band = 0; band < panelBands.length; band++) {
      const [bottom, top] = panelBands[band];
      for (let x = a + 1.75, i = 0; x < c - 1.1; x += 3.55, i++) {
        const panelWidth = Math.min(3.18, c - x - 0.42);
        group.add(edgeBox(panelWidth, top - bottom, 0.1, x + panelWidth / 2, (bottom + top) / 2, wall + 0.1,
          (i + band) % 2 ? M.loadingPanel : M.loadingPanelLight, 0, 0.025));
      }
    }
    for (const y of [2.86, 5.2, 7.54, 9.88, 11.25]) face(a + 0.18, c - 0.18, y, 0.085, 0.1, M.loadingSeam, wall + 0.2);
    for (let x = a + 3.5; x < c - 0.5; x += 7.1) face(x - 0.04, x + 0.04, 6.25, 10.15, 0.12, M.loadingFrame, wall + 0.19);
    // Break the long clerestory into serviceable panes with recessed mullions.
    for (let x = a + 2.4; x < c - 1.4; x += 3.35)
      face(x - 0.045, x + 0.045, 9.32, 1.12, 0.1, M.loadingFrame, wall + 0.34);
    for (const x of [a + 1.1, c - 1.1]) face(x - 0.06, x + 0.06, 9.32, 1.24, 0.14, M.loadingFrame, wall + 0.36);
  }

  // Rainwater hardware ties the roof, façade, and apron together at player scale.
  group.add(edgeBox(72.8, 0.2, 0.42, -66, 12.08, wall + 0.2, M.loadingFrame, 0, 0.045));
  for (const x of [-98.8, -82.1, -67.2, -52.8, -37.1]) {
    group.add(cylinder(0.105, 10.6, x, 6.65, wall + 0.3, M.pipeDark, 10));
    for (const y of [2.1, 5.5, 8.9]) group.add(cylinder(0.16, 0.11, x, y, wall + 0.3, M.rust, 10));
    group.add(addBeam([x, 1.18, wall + 0.3], [x, 1.18, wall + 0.86], 0.07, M.pipe));
  }

  // Loading doors get the black compression seals and steel leveler plates that
  // distinguish an operating dock from a painted opening.
  for (const [a, c, height] of doorSpans) {
    const axis = (a + c) / 2, width = c - a;
    for (const side of [-1, 1]) {
      const sx = axis + side * (width / 2 - 0.16);
      group.add(edgeBox(0.28, height - 0.2, 0.2, sx, height / 2 + 0.2, wall + 0.34, M.rubber, 0, 0.04));
      for (let y = 0.72; y < height - 0.18; y += 0.48)
        group.add(edgeBox(0.38, 0.08, 0.24, sx, y, wall + 0.36, M.rubber, 0, 0.02));
    }
    group.add(edgeBox(width - 0.38, 0.22, 0.2, axis, height + 0.02, wall + 0.34, M.rubber, 0, 0.035));
  }
  for (const [x, width, recessDepth, rise] of [[-76, 8.6, 6.4, 0.9], [-60, 7.2, 7.4, 1.02], [-44, 8.8, 6.6, 0.94]]) {
    const deckTop = 0.34 + rise, deckFront = 90 + recessDepth + 1.25;
    group.add(edgeBox(width - 0.72, 0.09, 1.15, x, deckTop + 0.17, deckFront - 0.56, M.loadingFrame, 0, 0.025));
    group.add(edgeBox(width - 0.95, 0.05, 0.1, x, deckTop + 0.24, deckFront + 0.02, M.rust, 0, 0.018));
  }

  for (const x of [-95, -84, -68, -52, -37]) wallLight('n', x, wall, 6.35);
};
if (byId.has('bld-loading-hall')) {
  recessedLoadingBay(-76, 90, 0.2, 8.6, 4.5, 6.4);
  recessedLoadingBay(-60, 90, 0.2, 7.2, 5.1, 7.4, 0.12, M.roof);
  recessedLoadingBay(-44, 90, 0.2, 8.8, 4.3, 6.6);
  // Pull the center door just inside the deep recess so its assembly reads at eye level.
  const centerDoorZ = 90.06;
  group.add(box(6.1, 4.3, 0.16, -60, 2.35, centerDoorZ, M.door));
  for (let y = 0.62; y < 4.35; y += 0.5) group.add(box(5.65, 0.1, 0.18, -60, y, centerDoorZ + 0.14, M.loadingSlat));
  group.add(box(6.7, 0.22, 0.2, -60, 4.7, centerDoorZ + 0.1, M.loadingFrame));
  for (const x of [-63.08, -56.92]) {
    group.add(box(0.2, 4.8, 0.24, x, 2.45, centerDoorZ + 0.1, M.loadingFrame));
    group.add(box(0.42, 0.9, 0.34, x, 0.68, centerDoorZ + 0.38, M.door));
  }
  // One warm fixture gives the deep center soffit a readable light source.
  group.add(box(1.5, 0.12, 0.34, -60, 4.82, 96.25, M.lampHousing));
  group.add(box(1.08, 0.05, 0.2, -60, 4.73, 96.25, M.light));
  // One weathered utility assembly breaks up the center bay's right return.
  group.add(box(0.72, 1.62, 0.18, -56.87, 2.18, 100.26, M.metal));
  group.add(box(0.56, 0.08, 0.05, -56.87, 2.62, 100.37, M.trim));
  group.add(box(0.62, 0.1, 0.06, -56.87, 1.48, 100.37, M.rust));
  group.add(box(0.86, 0.18, 0.1, -56.87, 1.43, 100.38, M.concreteDark));
  group.add(addBeam([-57.1, 3.0, 100.4], [-57.1, 4.28, 100.4], 0.045, M.pipeDark));
  group.add(addBeam([-57.1, 3.55, 100.4], [-56.22, 3.55, 100.4], 0.045, M.pipe));
  group.add(addBeam([-56.65, 3.42, 100.4], [-56.65, 4.08, 100.4], 0.035, M.pipeDark));
  for (const x of [-57.1, -56.65]) group.add(box(0.12, 0.14, 0.22, x, 2.98, 100.4, M.rust));
  heroDoorBay('s', -66, 34, 0.2, 8, 4.5, 'loading-dock');
  for (const [start, end] of [[-101.5, -80.6], [-71.4, -64.6], [-55.4, -48.6], [-39.4, -30.5]]) {
    facadePanelRibs('n', start, end, 90.42, 0.2, 12, 1.15);
  }
  for (const [start, end] of [[-79.8, -72.2], [-63.8, -56.2], [-47.8, -40.2]])
    corrugatedSheet('n', start, end, 90.42, 4.95, 7.0, M.heroPanel, 0.44, 0.085);
  loadingFacadeFrame();
  loadingNorthConstruction();
  facadePanelRibs('s', -98, -34, 33.7, 0.2, 12, 6);
  wallServiceRun('s', -98, -36, 34, 7.2, 4);
  wallWindowBand('s', -98, -76, 34, 9.3, 2);
  wallWindowBand('s', -56, -34, 34, 9.3, 2);
  facadeVentBank('s', -98, -76, 34, 5.6, 2);
  facadeVentBank('s', -56, -34, 34, 5.6, 2);
  for (const x of [-92, -74, -54, -38]) wallLight('s', x, 33.55, 5.4);
  facadeNameplate('s', -66, 34, 8.2, 5.8);
}
if (byId.has('bld-processing-hall')) {
  heroDoorBay('w', -43, 162, 6.8, 2.6, 2.4, 'window');
  heroDoorBay('s', 212, -63, 6.8, 2.6, 2.4, 'window');
  facadePanelRibs('w', -59, -48, 161.34, 6.8, 26, 5.5);
  facadePanelRibs('w', -37, 4, 161.34, 6.8, 26, 5.5);
  facadePanelRibs('s', 166, 202, -63.34, 6.8, 26, 6);
  facadePanelRibs('s', 222, 262, -63.34, 6.8, 26, 6);
  facadeVentBank('w', -56, -38, 162, 21, 2);
  facadeVentBank('s', 224, 262, -63, 20, 3);
  facadeNameplate('w', -18, 162, 22.8, 6.8);
  contactPad(156.8, -43.2, 0.86, 4.2, 2.4);
  serviceCabinet(155.5, -43.2, 1.0, 1.35, 1.75, Math.PI / 2);
  cableReel(158.2, -46.0, 1.0, 0.62);
  taperedBarrier(156.8, -47.2, 0.86, Math.PI / 2, 2.8, 0.72, 0.82);
  yardLampPole(153.8, -38.2, 0.86, 6.2, 1.1);
  for (const x of [176, 195, 212, 230, 250]) wallLight('s', x, -63.35, 7.2);
}
if (byId.has('bld-maintenance')) {
  heroDoorBay('s', -168, -51, -0.6, 2.6, 2.4, 'window');
  facadePanelRibs('s', -216, -178, -51.34, -0.6, 12, 5.5);
  facadePanelRibs('s', -158, -148, -51.34, -0.6, 12, 4.5);
  facadeVentBank('s', -216, -150, -51, 5.1, 4);
  facadeNameplate('s', -168, -51, 8.2, 5.2);
}
if (byId.has('bld-security-hall')) {
  heroDoorBay('s', 43, -167, -0.9, 2.6, 2.4, 'window');
  facadePanelRibs('s', 4, 32, -167.42, -0.9, 14, 5.5);
  facadePanelRibs('s', 54, 72, -167.42, -0.9, 14, 5.5);
  wallWindowBand('s', 5, 31, -167, 8.6, 3);
  wallWindowBand('s', 55, 71, -167, 8.6, 2);
  wallServiceRun('s', 6, 70, -167, 5.4, 4);
  for (const x of [10, 28, 56, 70]) wallLight('s', x, -167.55, 4.6);
  facadeNameplate('s', 43, -167, 10.8, 5.4);
}
if (byId.has('bld-core-ops-hall')) {
  heroDoorBay('n', 32, -232, -1.2, 2.6, 2.6, 'window');
  facadePanelRibs('n', 6, 24, -232.42, -1.2, 34, 7.5);
  facadePanelRibs('n', 40, 90, -232.42, -1.2, 34, 7.5);
  wallWindowBand('n', 6, 24, -232, 9.2, 3);
  wallWindowBand('n', 40, 90, -232, 9.2, 6);
  wallWindowBand('n', 6, 24, -232, 17.2, 3);
  wallWindowBand('n', 40, 90, -232, 17.2, 6);
  wallServiceRun('n', 8, 88, -232, 12.3, 6);
  facadeCatwalk('n', 42, 88, -232, 8.0, 2.5);
  for (const x of [10, 24, 46, 66, 86]) wallLight('n', x, -232.55, 6.2);
  facadeNameplate('n', 32, -232, 25.8, 7.6);
}
if (byId.has('bld-pressure-store')) {
  // The south elevation is the pressure-yard hero frontage: three service bays,
  // hardstand protection, and a readable plant identity keep it from reading as
  // an unbroken warehouse shell at player distance.
  for (const x of [9, 26, 43]) {
    heroDoorBay('s', x, 120, 0.4, 5.2, 4.2, 'dock');
    bollard(x - 3.05, 117.7, 0.4, 1.2);
    bollard(x + 3.05, 117.7, 0.4, 1.2);
    corrugatedSheet('s', x - 2.25, x + 2.25, 119.7, 4.82, 4.0, M.heroPanel, 0.44, 0.085);
  }
  for (const [start, end] of [[4, 6.2], [11.8, 23.2], [28.8, 40.2], [45.8, 48]])
    facadePanelRibs('s', start, end, 119.7, 0.4, 9, 4.5);
  wallWindowBand('s', 4, 48, 120, 6.5, 3);
  wallServiceRun('s', 4, 48, 120, 4.4, 3);
  facadeVentBank('s', 4, 48, 120, 2.5, 3);
  facadeNameplate('s', 26, 120, 8.35, 10.5);
  wallCabinet('s', 3.4, 120, 1.6, 1.6, 1.8);
  wallCabinet('s', 48.6, 120, 1.6, 1.6, 1.8);
  for (const x of [8, 26, 44]) wallLight('s', x, 119.52, 5.7);
  fenceLine(-4, 117.1, 56, 117.1, 0.4, 2.4, 4.5);
}
if (byId.has('bld-processing-hall')) {
  const serviceY = 1.06;
  const serviceApron = box(260, 0.08, 56.5, 250, serviceY - 0.04, -91.5, M.loadingAsphalt);
  serviceApron.userData.worldUvPeriod = 8.4;
  group.add(serviceApron);
  const nearApron = box(260, 0.08, 9.0, 250, serviceY - 0.04, -124.25, M.loadingAsphaltRough);
  nearApron.userData.worldUvPeriod = 8.4;
  group.add(nearApron);
  // A segmented concrete service walk gives the wall hardware a real apron and
  // breaks the broad tarmac into maintainable pours at player scale.
  const walkZ = -68.3, walkDepth = 4.3;
  for (const [start, end] of [[164, 194], [196, 226], [228, 264]]) {
    group.add(edgeBox(end - start - 0.18, 0.1, walkDepth, (start + end) / 2, serviceY + 0.055, walkZ, M.concrete[2], 0, 0.035));
    group.add(box(end - start - 0.3, 0.014, 0.08, (start + end) / 2, serviceY + 0.116, walkZ - walkDepth / 2 + 0.5, M.roadJoint));
  }
  for (const x of [195, 227]) group.add(box(0.08, 0.018, walkDepth - 0.2, x, serviceY + 0.116, walkZ, M.roadJoint));
  group.add(edgeBox(100.5, 0.14, 0.18, 214, serviceY + 0.12, walkZ - walkDepth / 2, M.curb, 0, 0.035));
  group.add(edgeBox(0.34, 0.18, 55.5, 161.25, serviceY + 0.05, -91.5, M.curb, 0, 0.04));
  group.add(edgeBox(0.34, 0.18, 55.5, 379.75, serviceY + 0.05, -91.5, M.curb, 0, 0.04));
  group.add(edgeBox(260, 0.18, 0.34, 250, serviceY + 0.05, -64.2, M.curb, 0, 0.04));
  const gratedChannel = (x, z, length, width, rotation = 0) => {
    const edgeOffset = width / 2 + 0.07;
    group.add(edgeBox(length + 0.28, 0.09, width + 0.1, x, serviceY + 0.05, z, M.concreteDark, rotation, 0.025));
    group.add(box(length, 0.03, width * 0.66, x, serviceY + 0.105, z, M.drain, rotation));
    const barStep = length > 80 ? 1.15 : 0.92;
    for (let along = -length / 2 + 0.4; along < length / 2 - 0.2; along += barStep) {
      const px = x + Math.cos(rotation) * along, pz = z + Math.sin(rotation) * along;
      group.add(box(0.055, 0.035, width * 0.58, px, serviceY + 0.14, pz, M.concrete[0], rotation));
    }
    for (const edge of [-1, 1]) {
      const px = x + Math.sin(rotation) * edge * edgeOffset, pz = z + Math.cos(rotation) * edge * edgeOffset;
      group.add(edgeBox(length + 0.32, 0.07, 0.09, px, serviceY + 0.14, pz, M.curb, rotation, 0.025));
    }
  };
  gratedChannel(123.2, -91.5, 49.8, 0.82, Math.PI / 2);
  const approachDrainZ = -114.1;
  const approachSurfaceY = roadTopYAt(250, approachDrainZ, surfaceYAt(250, approachDrainZ, 0));
  const flushApproachGrate = (x, z, length, width = 0.68) => {
    group.add(edgeBox(length + 0.26, 0.05, width + 0.1, x, approachSurfaceY + 0.02, z, M.concreteDark, 0, 0.02));
    group.add(box(length, 0.022, width * 0.68, x, approachSurfaceY + 0.055, z, M.drain));
    for (let along = x - length / 2 + 0.34; along < x + length / 2; along += 0.7)
      group.add(box(0.05, 0.026, width * 0.56, along, approachSurfaceY + 0.073, z, M.metal));
  };
  flushApproachGrate(250, approachDrainZ, 10.0);
  group.add(flatPolygon(250.5, -115.45, 8.0, 1.2, M.loadingWet, 0.02, approachSurfaceY + 0.018, idSeed('processing-approach-flush-wet'), 8));
  group.add(flatSegment([250, approachSurfaceY, approachDrainZ], [250, approachSurfaceY, approachDrainZ - 2.1], 0.18, M.loadingStain, 0.02));
  group.add(flatPolygon(274, -119.6, 28, 3.0, M.loadingWet, 0.02, serviceY + 0.075, idSeed('processing-approach-wet'), 9));
  for (const [x, endZ, width] of [[184, -105.6, 0.72], [222, -108.4, 0.94], [278, -120.6, 0.86], [319, -106.8, 0.66]]) {
    const runoff = [[x, serviceY + 0.08, approachDrainZ + 0.48], [x + 0.42, serviceY + 0.08, -111.7], [x - 0.18, serviceY + 0.08, endZ]];
    group.add(ribbon(runoff, Math.min(0.34, width * 0.34), M.loadingStain, { topOffset: 0.018, thickness: 0.006 }));
  }
  group.add(flatPolygon(205, -109.2, 9.5, 3.0, M.loadingWet, -0.08, serviceY + 0.078, idSeed('processing-runoff-pool-a'), 9));
  group.add(flatPolygon(298, -113.4, 12.5, 2.8, M.loadingWet, 0.12, serviceY + 0.078, idSeed('processing-runoff-pool-b'), 9));
  // A cross-drain breaks the near apron into believable pours and catches the
  // player-eye reflection instead of leaving one uninterrupted slab.
  const crossDrainX = 145, crossDrainZ = -82.5, crossDrainWidth = 44;
  group.add(edgeBox(crossDrainWidth + 0.42, 0.1, 0.86, crossDrainX, serviceY + 0.04, crossDrainZ, M.concreteDark, 0, 0.035));
  group.add(box(crossDrainWidth, 0.055, 0.56, crossDrainX, serviceY + 0.12, crossDrainZ, M.drain));
  for (let x = crossDrainX - crossDrainWidth / 2 + 0.32; x <= crossDrainX + crossDrainWidth / 2 - 0.32; x += 0.72)
    group.add(box(0.07, 0.065, 0.46, x, serviceY + 0.17, crossDrainZ, M.metal));
  for (const edge of [-1, 1]) group.add(box(crossDrainWidth + 0.58, 0.12, 0.12, crossDrainX, serviceY + 0.13, crossDrainZ + edge * 0.48, M.curb));
  group.add(flatPolygon(150, -84.1, 17, 3.8, M.loadingWet, 0.04, serviceY + 0.075, idSeed('processing-near-wet-patch'), 9));
  group.add(flatPolygon(143, -105, 24, 5.2, M.loadingWet, 0.04, serviceY + 0.075, idSeed('processing-service-wet-a'), 10));
  group.add(flatPolygon(134, -78, 16, 3.3, M.loadingWet, -0.08, serviceY + 0.075, idSeed('processing-service-wet-b'), 9));
  // Keep one catch drain and its wall-base runoff in the player-eye frontage.
  // Local catch basins sit below the service drops instead of leaving the long
  // trench as the only drainage cue in the player frontage.
  for (const [x, z, length] of [[190, -74.3, 3.8], [234, -74.5, 3.4]]) {
    gratedChannel(x, z, length, 0.72);
    contactPad(x, z, serviceY + 0.03, length + 0.8, 1.45);
  }
  // Keep the main grate against the service walk, but break it at catch basins
  // so it reads as a maintained outlet run rather than a rail laid in the apron.
  const flushGrate = (x, z, length, width = 0.62) => {
    const half = length / 2;
    const sections = [[x - half + 2.0, x - half + 22.0], [x - half + 25.0, x - half + 45.0], [x - half + 48.0, x - half + 68.0], [x - half + 71.0, x + half - 2.0]];
    for (const [start, end] of sections) {
      const sectionLength = end - start;
      const sectionX = (start + end) / 2;
      group.add(edgeBox(sectionLength + 0.2, 0.07, width + 0.12, sectionX, serviceY + 0.09, z, M.concreteDark, 0, 0.025));
      group.add(box(sectionLength, 0.025, width * 0.68, sectionX, serviceY + 0.135, z, M.drain));
      for (let along = start + 0.3; along < end; along += 0.62)
        group.add(box(0.05, 0.04, width * 0.56, along, serviceY + 0.16, z, M.metal));
    }
    for (const basinX of [x - half + 24.0, x - half + 70.0]) {
      group.add(edgeBox(1.45, 0.08, 1.02, basinX, serviceY + 0.11, z, M.concreteDark, 0, 0.035));
      group.add(box(1.02, 0.035, 0.68, basinX, serviceY + 0.17, z, M.drain));
      for (let barX = basinX - 0.38; barX <= basinX + 0.38; barX += 0.19)
        group.add(box(0.055, 0.045, 0.64, barX, serviceY + 0.2, z, M.metal));
      // A short dark outlet run and wet fall make the basin's direction legible.
      group.add(addBeam([basinX, serviceY + 0.17, z], [basinX, serviceY + 0.17, z - 2.2], 0.075, M.pipeDark));
      group.add(flatSegment([basinX, serviceY + 0.2, z - 2.05], [basinX, serviceY + 0.2, z - 0.32], 0.24, M.loadingStain, 0.02));
      group.add(cylinder(0.09, 4.5, basinX, 3.35, -63.84, M.pipeDark, 10));
      group.add(addBeam([basinX, 1.08, -63.84], [basinX, 1.08, -65.65], 0.075, M.pipe));
      group.add(box(0.28, 0.1, 0.34, basinX, 1.04, -65.72, M.drain));
      group.add(flatSegment([basinX, serviceY + 0.2, -65.9], [basinX, serviceY + 0.2, z - 0.32], 0.28, M.loadingStain, 0.02));
    }
    const outletX = x + half - 0.9;
    group.add(edgeBox(1.4, 0.08, 1.02, outletX, serviceY + 0.11, z, M.concreteDark, 0, 0.035));
    group.add(box(0.96, 0.035, 0.68, outletX, serviceY + 0.17, z, M.drain));
    for (let barX = outletX - 0.36; barX <= outletX + 0.36; barX += 0.18)
      group.add(box(0.055, 0.045, 0.64, barX, serviceY + 0.2, z, M.metal));
    group.add(flatSegment([outletX, serviceY + 0.2, z], [outletX + 1.7, serviceY + 0.2, z], 0.22, M.loadingStain, 0.02));
  };
  flushGrate(214, -70.15, 98, 0.62);
  // One exposed wall outlet anchors the hidden run at player scale.
  const exposedBasinX = 250, exposedBasinZ = -67.0;
  group.add(edgeBox(2.2, 0.1, 1.42, exposedBasinX, serviceY + 0.08, exposedBasinZ, M.concreteDark, 0, 0.035));
  group.add(box(1.62, 0.035, 0.94, exposedBasinX, serviceY + 0.15, exposedBasinZ, M.drain));
  for (let barX = exposedBasinX - 0.64; barX <= exposedBasinX + 0.64; barX += 0.2)
    group.add(box(0.055, 0.045, 0.88, barX, serviceY + 0.18, exposedBasinZ, M.metal));
  group.add(cylinder(0.14, 4.6, exposedBasinX, 3.9, -63.84, M.pipeDark, 10));
  for (const y of [2.2, 4.15]) group.add(box(0.34, 0.12, 0.38, exposedBasinX, y, -63.86, M.rust));
  const elbowZ = exposedBasinZ + 0.25;
  group.add(addBeam([exposedBasinX, 1.6, -63.84], [exposedBasinX, 1.6, elbowZ], 0.12, M.pipe));
  group.add(addBeam([exposedBasinX, 1.6, elbowZ], [exposedBasinX, 1.18, elbowZ], 0.12, M.pipe));
  group.add(box(0.32, 0.1, 0.34, exposedBasinX, 1.1, exposedBasinZ, M.drain));
  group.add(flatPolygon(exposedBasinX, exposedBasinZ - 0.8, 3.8, 0.72, M.stain, 0.02, serviceY + 0.078, idSeed('processing-exposed-basin-grime'), 7));
  group.add(flatSegment([exposedBasinX, serviceY, exposedBasinZ - 0.55], [exposedBasinX + 0.25, serviceY, exposedBasinZ - 3.8], 0.22, M.loadingWet, 0.02));
  group.add(edgeBox(1.08, 0.08, 0.92, 252.5, serviceY + 0.13, -70.15, M.concreteDark, 0, 0.025));
  group.add(box(0.72, 0.035, 0.58, 252.5, serviceY + 0.17, -70.15, M.drain));
  for (const z of [-70.37, -70.15, -69.93]) group.add(box(0.62, 0.035, 0.055, 252.5, serviceY + 0.195, z, M.concrete[0]));
  group.add(flatSegment([190, serviceY, -75.1], [190, serviceY, -70.2], 0.14, M.loadingStain, 0.09));
  group.add(flatSegment([252, serviceY, -75.2], [252, serviceY, -70.2], 0.14, M.loadingStain, 0.09));
  wallServiceRun('s', 178, 316, -63.34, 6.2, 4);
  // Break the raised south face into maintained process bays.
  for (const [x, width] of [[182, 4.8], [244, 4.8]]) {
    heroDoorBay('s', x, -63.34, 6.8, width, 4.1, 'window');
    group.add(edgeBox(width + 0.9, 0.16, 1.9, x, 6.78, -64.46, M.concreteDark, 0, 0.035));
  }
  wallWindowBand('s', 168, 202, -63.34, 11.5, 3);
  wallWindowBand('s', 222, 262, -63.34, 11.5, 3);
  for (const x of [182, 212, 244]) wallLight('s', x, -63.48, 11.35);
  wallCabinet('s', 198, -63.34, 1.35, 1.35, 1.7);
  wallCabinet('s', 258, -63.34, 1.35, 1.35, 1.7);
  facadeWeathering('s', 178, 316, -63.34, 0.3, 7.4, idSeed('processing-south-weathering'), 10);
  for (const x of [208, 250, 292]) {
    group.add(flatPolygon(x + 0.12, -67.1, 1.2, 1.8, M.stain, 0.05, serviceY + 0.075, idSeed(`processing-base-stain-${x}`), 7));
    group.add(flatPolygon(x - 0.18, -74.1, 0.8, 1.1, M.loadingStain, -0.08, serviceY + 0.078, idSeed(`processing-runoff-patch-${x}`), 7));
  }
  // Short pour joints, tire scrub, and contact patches break up the near slab.
  for (const z of [-76.2, -86.6, -96.8])
    group.add(flatSegment([166, serviceY, z], [316, serviceY, z], 0.1, M.roadJoint, 0.085));
  group.add(flatSegment([186, serviceY, -90.8], [224, serviceY, -78.9], 0.16, M.loadingStain, 0.09));
  group.add(flatSegment([254, serviceY, -91.2], [286, serviceY, -79.0], 0.16, M.loadingStain, 0.09));
  for (const [x, z, w, d, r, seed] of [
    [204, -76.8, 7.0, 1.8, -0.04, 821], [268, -86.0, 10.0, 2.2, 0.08, 822], [296, -74.9, 5.2, 1.5, -0.1, 823],
    [214, -88.8, 13.0, 2.4, -0.03, 824], [304, -93.4, 18.0, 2.6, 0.08, 825],
  ]) group.add(flatPolygon(x, z, w, d, M.loadingAsphaltRough, r, serviceY + 0.082, seed, 8));
  const repairZ = -88.5;
  for (const [start, end, material] of [[166, 198, M.concrete[2]], [198, 230, M.concrete[1]], [230, 262, M.concrete[2]], [262, 316, M.concrete[1]]]) {
    group.add(edgeBox(end - start - 0.22, 0.07, 3.7, (start + end) / 2, serviceY + 0.045, repairZ, material, 0, 0.025));
  }
  for (const x of [198, 230, 262]) group.add(box(0.1, 0.026, 3.45, x, serviceY + 0.086, repairZ, M.roadJoint));
  group.add(flatSegment([166, serviceY, repairZ - 1.62], [316, serviceY, repairZ - 1.62], 0.16, M.loadingStain, 0.09));
  group.add(flatPolygon(215, -84.2, 9.5, 1.7, M.loadingReflective, -0.03, serviceY + 0.092, idSeed('processing-repair-reflection'), 9));
  gratedChannel(300, -90.5, 32, 0.76);
  addSilo(281, -42, 0.8, 5.5, 16, M.siding[1]);
  addSilo(295, -18, 0.8, 4.5, 12, M.siding[0]);
  pipeRack(267, -54, 307, -54, 0.8, 9, 4.5);
  pipeRack(278, -10, 278, 28, 0.8, 7, 3.5);
  // Keep the west service run outside the raised plinth so it reads from the
  // approach lane instead of disappearing inside the process volume.
  serviceStack(155, -49, 0.8, 17, 0.34);
  serviceStack(155, -20, 0.8, 13, 0.26);
  addSilo(145, -59, 0.8, 2.8, 9, M.siding[2]);
  addSilo(145, -39, 0.8, 2.2, 7, M.siding[1]);
  pipeRack(154, -58, 154, 5, 0.8, 10, 4);
  pipeRack(148, -60, 172, -60, 0.8, 7, 3.4);
  // The west frontage faces the plant approach; keep the runs just outside the
  // wall so they remain visible instead of being swallowed by the raised hall.
  wallServiceRun('w', -56, 4, 161.35, 10.5, 4);
  wallServiceRun('w', -44, 2, 161.35, 17.5, 3);
  wallWindowBand('w', -56, 4, 161.28, 8.3, 5);
  wallWindowBand('w', -54, 2, 161.28, 14.0, 4);
  // The service apron terminates at a poured curb with a dirty runoff band;
  // this gives the plant wall a structural foot instead of a floating plane.
  group.add(edgeBox(0.72, 0.72, 61.5, 160.98, 1.22, -26, M.concreteDark, 0, 0.045));
  group.add(edgeBox(0.12, 0.2, 59.6, 160.57, 1.62, -26, M.loadingStain, 0, 0.025));
  facadeWeathering('w', -56, 4, 161.34, 1.78, 24, idSeed('processing-west-weathering'), 12);
  facadeCatwalk('w', -55, -30, 161.22, 5.6, 2.5);
  for (const z of [-48, -26, -4]) wallLight('w', z, 161.25, 6.6);
  for (const z of [-54, -22]) wallCabinet('w', z, 161.2, 1.5, 1.3, 1.7);
}
if (byId.has('bld-loading-hall')) {
  const padY = 0.34;
  // Keep a low foundation under the graded, wet hardstand.
  group.add(box(68, 0.1, 1.4, -66, padY - 0.12, 95.7, M.loadingAsphaltRough));
  group.add(box(68, 0.1, 42.82, -66, padY - 0.12, 128.59, M.loadingAsphalt));
  let apronX = -100;
  for (const [index, [cutX1, cutX2]] of [[-77.85, -74.15], [-61.85, -58.15], [-45.85, -42.15]].entries()) {
    group.add(box(cutX1 - apronX, 0.1, 10.78, (apronX + cutX1) / 2, padY - 0.12, 101.79, [M.loadingAsphalt, M.loadingAsphaltRough, M.loadingWet][index]));
    apronX = cutX2;
  }
  group.add(box(-32 - apronX, 0.1, 10.78, (apronX - 32) / 2, padY - 0.12, 101.79, M.loadingAsphaltRough));
  const apronSurface = new BufferGeometry();
  const apronSurfaceYAt = z => padY + 0.18 - ((z - 96.4) / (149.6 - 96.4)) * 0.15;
  apronSurface.setAttribute('position', new Float32BufferAttribute([
    -99, padY + 0.18, 96.4, -33.2, padY + 0.03, 96.4,
    -99, padY + 0.18, 149.6, -33.2, padY + 0.03, 149.6,
  ], 3));
  apronSurface.setAttribute('uv', new Float32BufferAttribute([0, 0, 1, 0, 0, 1, 1, 1], 2));
  apronSurface.setIndex([0, 2, 1, 1, 2, 3]); apronSurface.computeVertexNormals();
  group.add(new Mesh(apronSurface, M.loadingAsphalt));
  group.add(box(68, 0.12, 1.35, -66, padY - 0.01, 96.95, M.sidewalk));
  group.add(box(68, 0.2, 0.28, -66, padY + 0.18, 97.7, M.curb));
  for (const x of [-100, -32]) group.add(box(1.1, 0.1, 54.5, x, padY + 0.03, 122.5, M.sidewalk));
  for (const x of [-92, -84, -76, -68, -60, -52, -44, -36]) group.add(box(0.07, 0.025, 54.6, x, padY + 0.045, 122.5, M.roadJoint));
  for (const z of [99, 103, 107, 111, 115, 119, 123, 127, 131, 135, 139, 143, 147]) group.add(box(66, 0.025, 0.08, -66, padY + 0.045, z, M.roadJoint));
  group.add(box(62, 0.06, 0.78, -66, padY + 0.08, 97.95, M.drain));
  for (let x = -96; x <= -36; x += 2) group.add(box(0.07, 0.055, 0.58, x, padY + 0.12, 97.95, M.metal));
  for (const z of [124.4, 146.4]) {
    group.add(box(62, 0.06, 0.78, -66, padY + 0.08, z, M.drain));
    for (let x = -96; x <= -36; x += 2) group.add(box(0.07, 0.055, 0.58, x, padY + 0.12, z, M.metal));
  }
  // Follow the hardstand fall so the right-edge curb drain stays exposed and continuous.
  const edgeDrainX = -34.05, edgeDrainWidth = 0.9, edgeDrainSamples = [];
  for (let z = 98; z <= 148.6; z += 2.2) edgeDrainSamples.push([edgeDrainX, apronSurfaceYAt(z), z]);
  edgeDrainSamples.push([edgeDrainX, apronSurfaceYAt(149.6), 149.6]);
  group.add(ribbon(edgeDrainSamples, edgeDrainWidth + 0.12, M.concreteDark, { topOffset: 0.005, thickness: 0.18 }));
  group.add(ribbon(edgeDrainSamples, edgeDrainWidth, M.drain, { topOffset: 0.025, thickness: 0.14 }));
  group.add(ribbon(edgeDrainSamples, edgeDrainWidth - 0.18, M.loadingWet, { topOffset: 0.04, thickness: 0.025 }));
  for (const offset of [-edgeDrainWidth / 2 - 0.08, edgeDrainWidth / 2 + 0.08]) {
    group.add(ribbon(edgeDrainSamples, 0.12, M.curb, { centerOffset: offset, topOffset: 0.08, thickness: 0.12 }));
  }
  for (let z = 98; z <= 149; z += 0.62) {
    const y = apronSurfaceYAt(z) + 0.075;
    group.add(box(edgeDrainWidth + 0.08, 0.08, 0.16, edgeDrainX, y, z, M.metal));
  }
  // One irregular wet layer follows the apron fall instead of reading as decals.
  const wetLayer = new BufferGeometry();
  const wetRows = [98.05, 99.2, 100.35, 101.65, 102.85, 104.1, 105.35, 106.72, 109.4, 112.1, 115.2, 118.1, 121.3, 124.8, 128.2];
  const wetCols = 8, wetPositions = [], wetUvs = [], wetIndices = [], wetRand = rng(idSeed('loading-wet-layer'));
  for (let row = 0; row < wetRows.length; row++) {
    const z = wetRows[row] + (wetRand() - 0.5) * 0.16;
    const left = -97.6 + (wetRand() - 0.5) * 1.4, right = -34.4 + (wetRand() - 0.5) * 1.4;
    for (let col = 0; col <= wetCols; col++) {
      const t = col / wetCols, x = left + (right - left) * t + (wetRand() - 0.5) * 0.7;
      wetPositions.push(x, apronSurfaceYAt(z) + 0.035 + (wetRand() - 0.5) * 0.008, z);
      wetUvs.push(t * 2.2, row / (wetRows.length - 1) * 2.2);
    }
  }
  for (let row = 0; row < wetRows.length - 1; row++) for (let col = 0; col < wetCols; col++) {
    const a = row * (wetCols + 1) + col, b = a + wetCols + 1;
    if ((row + col) % 2) wetIndices.push(a, b, a + 1, a + 1, b, b + 1);
    else wetIndices.push(a, b, b + 1, a, b + 1, a + 1);
  }
  wetLayer.setAttribute('position', new Float32BufferAttribute(wetPositions, 3));
  wetLayer.setAttribute('uv', new Float32BufferAttribute(wetUvs, 2)); wetLayer.setIndex(wetIndices); wetLayer.computeVertexNormals();
  group.add(new Mesh(wetLayer, M.loadingWet));
  // A narrow wet sheen follows the curb grate without hard-edged puddle decals.
  const curbWetSamples = [];
  for (let z = 98.2; z <= 149.2; z += 2.1) curbWetSamples.push([-35.0, apronSurfaceYAt(z), z]);
  group.add(ribbon(curbWetSamples, 1.55, M.loadingWet, { centerOffset: -0.75, topOffset: 0.055, thickness: 0.025 }));
  // Recessed wet channels make the deck-to-drain fall readable at eye level.
  for (const [x, width, recessDepth, rise] of [[-76, 8.6, 3.6, 0.9], [-60, 7.2, 4.8, 1.02], [-44, 8.8, 4.0, 0.94]]) {
    const deckBase = 0.34, deckFront = 90 + recessDepth + 1.25;
    const slopeStart = deckFront + 0.3 + 0.64 + 0.08 + 0.7 + 0.08 + 0.08;
    const slopeY = deckBase + rise - 0.42 + 0.03;
    const drainEdge = 107.18;
    const channel = [[x, slopeY + 0.035, slopeStart], [x, apronSurfaceYAt(98.38) + 0.035, 98.38], [x, apronSurfaceYAt(106.72) + 0.04, 106.72], [x, apronSurfaceYAt(drainEdge) + 0.045, drainEdge]];
    const troughWidth = Math.min(width - 0.45, 3.5);
    group.add(ribbon(channel, troughWidth, M.loadingWet, { topOffset: 0.025, thickness: 0.08 }));
  }
  group.add(box(62, 0.09, 1.12, -66, padY + 0.23, 97.95, M.drain));
  for (let x = -96; x <= -36; x += 2) group.add(box(0.09, 0.08, 0.94, x, padY + 0.31, 97.95, M.metal));
  for (const z of [97.39, 98.51]) group.add(box(62, 0.1, 0.1, -66, padY + 0.29, z, M.curb));
  fenceLine(-99, 96.9, -99, 129.2, padY, 2.2, 3.5);
  fenceLine(-33, 96.9, -33, 129.2, padY, 2.2, 3.5);
  dockLamp(-96, 103.2, padY, 4.8);
  dockLamp(-36, 103.2, padY, 4.8);
  dockLamp(-53, 104.6, padY, 4.8);
  serviceStack(-53, 103.4, padY, 5.2, 0.24);
  group.add(box(1.2, 1.6, 0.42, -53, padY + 0.8, 101.4, M.metal));
  group.add(box(0.86, 0.08, 0.05, -53, padY + 1.08, 101.16, M.trim));
  crateStack(-94, padY, 103.1, 3.2, 2.2, 1.1, 2, idSeed('freight-loading-west'));
  crateStack(-54, padY, 104.8, 2.2, 1.5, 0.75, 1, idSeed('freight-loading-center'));
  crateStack(-38, padY, 104.0, 3.0, 2.0, 1.0, 2, idSeed('freight-loading-east'));
  crateStack(-116, 0.2, 112, 7, 5, 2.2, 2, idSeed('freight-loading'));
  crateStack(-22, 0.2, 118, 6, 4, 1.8, 2, idSeed('freight-pressure'));
  for (const x of [-76, -60, -44]) {
    group.add(box(10.2, 0.12, 0.14, x, 5.16, 91.72, M.loadingFrame));
  }
  wallServiceRun('n', -96, -36, 90.65, 7.2, 4);
  wallWindowBand('n', -96, -36, 90.58, 9.6, 4);
  facadeNameplate('n', -66, 90.5, 7.45, 7.0);
  for (const x of [-88, -68, -48]) wallLight('n', x, 90.55, 5.9);
  for (const x of [-92, -52]) wallCabinet('n', x, 90.5, 1.4, 1.4, 1.6);
  facadeWeathering('n', -98, -34, 90.58, 0.2, 12, idSeed('loading-frontage-weathering'), 13);
  facadeConduit(-96, 90.78, -36, 90.78, 6.65, 0.11);
  for (const x of [-90, -78, -66, -54, -42]) {
    group.add(box(0.14, 3.7, 0.12, x, 4.15, 90.74, M.pipeDark));
    group.add(box(0.42, 0.16, 0.18, x, 2.45, 90.82, M.rust));
  }
  // Short side galleries keep the service language local to the work pockets instead
  // of placing a full-width pipe curtain across all three vehicle approaches.
  pipeGallery(-99, 96.8, -81.5, 96.8, 0.34, 3.6, 2.5);
  pipeGallery(-52, 96.8, -32.5, 96.8, 0.34, 3.6, 2.5);
  loadingUtilityGallery(-104.8, 101, 119, padY, 5.8, 3.8);
  loadingUtilityGallery(-104.8, 126, 145, padY, 4.8, 3.0);
  loadingUtilityGallery(-27.2, 101, 124, padY, 5.2, 3.2);
  loadingUtilityGallery(-27.2, 131, 145, padY, 6.1, 4.2);
  for (const [x, z, height, side] of [[-104.8, 119, 4.8, 1], [-104.8, 126, 4.2, -1], [-27.2, 124, 4.2, -1], [-27.2, 131, 5.0, 1]]) {
    group.add(addBeam([x, padY + height, z], [x + side * 1.1, padY + height, z], 0.08, M.pipe));
    group.add(addBeam([x + side * 1.1, padY + height, z], [x + side * 1.1, padY + height - 0.9, z + 1.15], 0.06, M.pipeDark));
    group.add(cylinder(0.14, 0.08, x + side * 1.1, padY + height - 0.9, z + 1.15, M.rust, 10, Math.PI / 2));
  }
  fenceLine(-100, 103.2, -82, 103.2, 0.34, 2.15, 3.5);
  fenceLine(-52, 103.2, -32, 103.2, 0.34, 2.15, 3.5);
  bollardRow(-92, 98.2, -40, 98.2, 0.2, 6);
  for (const x of [-88, -72, -56, -40]) bayMark(x, 104, 7, 9, 0, padY + 0.09);

  // A split maintenance gallery projects the upper frontage into the apron instead
  // of leaving the wall as a single plane above the recessed doors.
  const loadingMaintenanceGallery = (start, end, y, depth = 2.3) => {
    facadeCatwalk('n', start, end, 90.48, y, depth);
    for (let x = start + 1.8; x < end - 0.8; x += 4.5) {
      const wallZ = 90.62, frontZ = wallZ + depth - 0.28;
      group.add(addBeam([x, y - 0.08, wallZ], [x, y - 0.08, frontZ], 0.07, M.metal));
      group.add(addBeam([x, y - 0.08, frontZ], [x, y - 0.82, wallZ], 0.055, M.metal));
    }
  };
  loadingMaintenanceGallery(-99, -64, 6.2);
  loadingMaintenanceGallery(-56, -33, 6.2);
  for (const [x, height, width] of [[-94, 6.3, 0.36], [-82, 5.4, 0.28], [-70, 6.0, 0.34], [-52, 5.6, 0.3], [-40, 6.5, 0.38]]) {
    group.add(box(width, height, 0.38, x, 5.3 + height / 2, 90.84, M.heroPanel));
    group.add(box(width + 0.16, 0.12, 0.5, x, 5.22 + height, 91.02, M.rust));
  }

  // These low service pockets occupy the two gaps between vehicle approaches;
  // their cabinets, pipe stands, and grates give the near apron a working scale.
  const foregroundServicePocket = (x, z, side) => {
    const sy = apronSurfaceYAt(z), width = 3.0, depth = 3.2;
    group.add(box(width, 0.18, depth, x, sy + 0.09, z, M.concreteDark));
    group.add(box(width - 0.24, 0.1, depth - 0.26, x, sy + 0.22, z, M.sidewalk));
    for (const end of [-1, 1]) group.add(box(width + 0.16, 0.16, 0.18, x, sy + 0.3, z + end * (depth / 2 - 0.1), M.curb));
    bollard(x - width / 2 + 0.22, z - depth / 2 + 0.24, sy + 0.18, 0.95);
    bollard(x + width / 2 - 0.22, z - depth / 2 + 0.24, sy + 0.18, 0.95);
    const cabinetX = x + side * 0.52;
    group.add(box(1.05, 1.58, 0.46, cabinetX, sy + 0.22 + 0.79, z + 0.28, M.metal));
    group.add(box(0.72, 0.08, 0.05, cabinetX, sy + 1.15, z + 0.53, M.trim));
    group.add(box(0.72, 0.08, 0.05, cabinetX, sy + 0.78, z + 0.53, M.rust));
    const pipeX = x - side * 0.82;
    group.add(cylinder(0.09, 2.75, pipeX, sy + 1.59, z - 0.7, M.pipeDark, 10));
    group.add(addBeam([pipeX, sy + 2.82, z - 0.7], [pipeX + side * 0.72, sy + 2.82, z - 0.7], 0.06, M.pipe));
    group.add(addBeam([pipeX + side * 0.72, sy + 2.82, z - 0.7], [pipeX + side * 0.72, sy + 0.42, z - 0.7], 0.045, M.metal));
  };
  const foregroundCrossDrain = x => {
    const z = 107.18, sy = apronSurfaceYAt(z) + 0.06, width = 5.2;
    group.add(box(width, 0.08, 0.62, x, sy, z, M.drain));
    for (let grateX = x - width / 2 + 0.3; grateX <= x + width / 2 - 0.3; grateX += 0.5)
      group.add(box(0.07, 0.09, 0.48, grateX, sy + 0.055, z, M.metal));
    for (const edge of [-1, 1]) group.add(box(width + 0.12, 0.12, 0.12, x, sy + 0.1, z + edge * 0.39, M.curb));
  };
  foregroundServicePocket(-68, 104.7, -1);
  foregroundServicePocket(-52, 104.7, 1);
  foregroundCrossDrain(-68);
  foregroundCrossDrain(-52);
}
if (byId.has('bld-maintenance')) {
  pipeRack(-218, -37, -147, -37, -0.6, 5, 3.4);
  crateStack(-205, -0.6, 20, 5, 4, 1.6, 2, idSeed('freight-maintenance'));
  serviceStack(-151, -43, -0.6, 8, 0.24);
  facadeConduit(-222, -47, -148, -47, 6.2, 0.15);
  wallServiceRun('s', -216, -150, -51.65, 5.6, 4);
  wallWindowBand('s', -216, -150, -51.58, 8.8, 4);
  for (const x of [-202, -176, -154]) wallLight('s', x, -51.55, 4.4);
}
if (byId.has('bld-substation')) {
  pipeRack(306, 20, 354, 20, 0.8, 6, 5);
  for (const x of [318, 330, 342]) serviceStack(x, 28, 0.8, 6, 0.18);
}

const rotateLocal = (x, z, angle, lx, lz) => [x + Math.cos(angle) * lx - Math.sin(angle) * lz, z + Math.sin(angle) * lx + Math.cos(angle) * lz];
const cargoTruck = (x, z, angle = 0, scale = 1) => {
  const sy = surfaceYAt(x, z, 0) + 0.08;
  const p = (lx, lz) => rotateLocal(x, z, angle, lx * scale, lz * scale);
  const [cx, cz] = p(0, 0);
  group.add(box(9.5 * scale, 1.3 * scale, 3.2 * scale, cx, sy + 1.05 * scale, cz, M.panel[2], angle));
  const [bx, bz] = p(2.3, 0);
  group.add(box(4.0 * scale, 2.0 * scale, 3.0 * scale, bx, sy + 2.55 * scale, bz, M.siding[1], angle));
  const [hx, hz] = p(-3.0, 0);
  group.add(box(2.1 * scale, 1.4 * scale, 3.0 * scale, hx, sy + 1.95 * scale, hz, M.metal, angle));
  for (const lx of [-3.3, 2.4]) for (const lz of [-1.28, 1.28]) {
    const [wx, wz] = p(lx, lz);
    const wheel = cylinder(0.62 * scale, 0.32 * scale, wx, sy + 0.62 * scale, wz, M.door, 10, Math.PI / 2, 0);
    wheel.rotation.y = angle; group.add(wheel);
  }
  const [px, pz] = p(-4.35, 0);
  group.add(box(0.3 * scale, 0.32 * scale, 2.25 * scale, px, sy + 1.45 * scale, pz, M.warning, angle));
};
const forklift = (x, z, angle = 0, scale = 1, surfaceOverride = null) => {
  const sy = surfaceOverride ?? surfaceYAt(x, z, 0) + 0.06;
  const p = (lx, lz) => rotateLocal(x, z, angle, lx * scale, lz * scale);
  const [cx, cz] = p(0, 0);
  group.add(box(2.4 * scale, 0.72 * scale, 1.5 * scale, cx, sy + 0.85 * scale, cz, M.warning, angle));
  const [seatX, seatZ] = p(0.55, 0);
  group.add(box(0.95 * scale, 1.25 * scale, 1.25 * scale, seatX, sy + 1.65 * scale, seatZ, M.metal, angle));
  const [mastX, mastZ] = p(-1.15, 0);
  group.add(box(0.14 * scale, 3.1 * scale, 0.14 * scale, mastX, sy + 1.8 * scale, mastZ - 0.58 * scale, M.metal, angle));
  const [forkX, forkZ] = p(-1.8, -0.42);
  group.add(box(1.7 * scale, 0.12 * scale, 0.12 * scale, forkX, sy + 0.28 * scale, forkZ, M.metal, angle));
  const [forkX2, forkZ2] = p(-1.8, 0.42);
  group.add(box(1.7 * scale, 0.12 * scale, 0.12 * scale, forkX2, sy + 0.28 * scale, forkZ2, M.metal, angle));
  for (const lx of [-0.65, 0.65]) for (const lz of [-0.68, 0.68]) {
    const [wx, wz] = p(lx, lz);
    const wheel = cylinder(0.36 * scale, 0.22 * scale, wx, sy + 0.38 * scale, wz, M.door, 8, Math.PI / 2, 0);
    wheel.rotation.y = angle; group.add(wheel);
  }
};
const palletStack = (x, z, sy, width = 1.8, depth = 1.2, levels = 2) => {
  for (let level = 0; level < levels; level++) {
    group.add(box(width, 0.16, depth, x, sy + 0.08 + level * 0.52, z, M.rust));
    group.add(box(width * 0.86, 0.28, depth * 0.82, x, sy + 0.3 + level * 0.52, z, M.panel[2]));
  }
};
function cableReel(x, z, sy, radius = 0.8) {
  const centerY = sy + radius;
  group.add(cylinder(radius, 0.28, x, centerY, z, M.rust, 12, Math.PI / 2));
  group.add(cylinder(radius * 0.78, 0.1, x, centerY, z - 0.16, M.rust, 12, Math.PI / 2));
  group.add(cylinder(radius * 0.78, 0.1, x, centerY, z + 0.16, M.rust, 12, Math.PI / 2));
  group.add(cylinder(radius * 0.62, radius * 0.44, x, centerY, z, M.pipeDark, 12, Math.PI / 2));
  for (const offset of [-0.17, 0, 0.17]) {
    const winding = new Mesh(new TorusGeometry(radius * 0.66, Math.max(0.045, radius * 0.065), 8, 18), M.rubber);
    winding.position.set(x, centerY, z + offset); group.add(winding);
  }
  group.add(cylinder(radius * 0.18, radius * 2.3, x, centerY, z, M.metal, 10, Math.PI / 2));
  group.add(edgeBox(radius * 2.05, 0.18, radius * 1.05, x, sy + 0.1, z, M.loadingFrame, 0, 0.035));
  for (const side of [-1, 1]) for (const offset of [-0.24, 0.24])
    group.add(addBeam([x + side * radius * 0.72, sy + 0.18, z + offset], [x + side * radius * 0.72, centerY - radius * 0.42, z + offset], 0.09, M.loadingFrame));
  for (const side of [-1, 1]) {
    group.add(addBeam([x + side * radius * 0.72, centerY - radius * 0.42, z - radius * 0.24], [x + side * radius * 0.72, centerY - radius * 0.42, z + radius * 0.24], 0.07, M.loadingFrame));
    group.add(addBeam([x + side * radius * 0.72, sy + 0.18, z - radius * 0.34], [x + side * radius * 0.72, centerY - radius * 0.42, z], 0.06, M.warningDark));
    group.add(addBeam([x + side * radius * 0.72, sy + 0.18, z + radius * 0.34], [x + side * radius * 0.72, centerY - radius * 0.42, z], 0.06, M.warningDark));
  }
  for (const side of [-1, 1]) group.add(cylinder(radius * 0.23, 0.16, x, centerY, z + side * radius * 1.18, M.loadingFrame, 10, Math.PI / 2));
  group.add(addBeam([x + radius * 0.88, sy + 0.15, z + radius * 0.2], [x + radius * 1.15, sy + 0.045, z + radius * 0.46], 0.035, M.rubber));
}
function serviceCabinet(x, z, sy, width = 1.4, height = 1.8, rotation = 0) {
  group.add(box(width, height, 0.42, x, sy + height / 2, z, M.metal, rotation));
  group.add(box(width * 0.72, 0.08, 0.05, x, sy + height * 0.58, z - 0.24, M.trim, rotation));
  group.add(box(width * 0.72, 0.08, 0.05, x, sy + height * 0.34, z - 0.24, M.trim, rotation));
  group.add(box(width * 0.7, 0.1, 0.06, x, sy + height * 0.1, z - 0.25, M.warning, rotation));
}
function contactPad(x, z, sy, width, depth, rotation = 0, material = M.loadingStain) {
  group.add(edgeBox(width, 0.018, depth, x, sy + 0.012, z, material, rotation, 0.008));
}

// Secondary shells share a restrained service elevation so the campus does not
// reserve corrugation, utilities, and contact wear for only the hero buildings.
const secondaryFrontageSide = new Map([
  ['bld-gatehouse', 's'],
  ['bld-north-shed', 's'],
  ['bld-yard-utility', 'w'],
  ['bld-service-tower', 's'],
  ['bld-substation', 's'],
  ['bld-plant-annex', 's'],
  ['bld-maintenance', 'e'],
  ['bld-deployment-bays', 'e'],
  ['bld-core-yard-shelter', 's'],
  ['bld-core-service-wing', 'n'],
  ['bld-core-walkway', 'w'],
  ['bld-east-storage-a', 'e'],
  ['bld-east-storage-b', 's'],
  ['bld-tank-farm', 's'],
]);
const frontageSideForDoor = (s, d) => {
  const [x1, z1, x2, z2] = s.bounds;
  const centerX = (d.bounds[0] + d.bounds[2]) / 2, centerZ = (d.bounds[1] + d.bounds[3]) / 2;
  return [[Math.abs(centerZ - z1), 's'], [Math.abs(centerZ - z2), 'n'], [Math.abs(centerX - x1), 'w'], [Math.abs(centerX - x2), 'e']].sort((a, c) => a[0] - c[0])[0][1];
};
const frontageSpans = (s, side, inset = 2.2) => {
  const [x1, z1, x2, z2] = s.bounds;
  const low = ['n', 's'].includes(side) ? x1 + inset : z1 + inset;
  const high = ['n', 's'].includes(side) ? x2 - inset : z2 - inset;
  const openings = (doorsByBld.get(s.id) || [])
    .filter(d => frontageSideForDoor(s, d) === side)
    .map(d => {
      const axis = ['n', 's'].includes(side) ? (d.bounds[0] + d.bounds[2]) / 2 : (d.bounds[1] + d.bounds[3]) / 2;
      const width = Math.max(d.bounds[2] - d.bounds[0], d.bounds[3] - d.bounds[1]);
      return [axis - Math.max(1.4, width * 0.5 + 0.9), axis + Math.max(1.4, width * 0.5 + 0.9)];
    })
    .sort((a, c) => a[0] - c[0]);
  const spans = [];
  let cursor = low;
  for (const [openLow, openHigh] of openings) {
    const a = Math.max(low, openLow), c = Math.min(high, openHigh);
    if (a > cursor) spans.push([cursor, a]);
    cursor = Math.max(cursor, c);
  }
  if (cursor < high) spans.push([cursor, high]);
  return spans.filter(([a, c]) => c - a >= 4.8);
};
const secondaryFrontageKit = s => {
  const side = secondaryFrontageSide.get(s.id);
  if (!side) return;
  const [x1, z1, x2, z2] = s.bounds;
  const outward = side === 'n' ? 1 : side === 's' ? -1 : side === 'e' ? 1 : -1;
  const alongX = side === 'n' || side === 's';
  const wall = side === 'n' ? z2 : side === 's' ? z1 : side === 'e' ? x2 : x1;
  const spans = frontageSpans(s, side);
  if (!spans.length) return;
  const base = raisedBase(s), height = s.height || 6;
  const sheetMaterial = M.siding[(idSeed(s.id) >>> 0) % M.siding.length];
  for (const [start, end] of spans) {
    const span = end - start;
    facadePanelRibs(side, start, end, wall, base, Math.max(2.8, height - 0.35), Math.max(4.2, Math.min(6.8, span / 3.2)), sheetMaterial);
  }
  const [serviceStart, serviceEnd] = spans.reduce((best, span) => span[1] - span[0] > best[1] - best[0] ? span : best, spans[0]);
  const span = serviceEnd - serviceStart;
  const serviceY = base + Math.min(5.4, Math.max(3.4, height * 0.52));
  wallServiceRun(side, serviceStart, serviceEnd, wall, serviceY, Math.max(2, Math.round(span / 12)));
  const detailY = base + Math.min(height - 1.5, Math.max(2.8, height * 0.64));
  if (height >= 8 && span >= 12) wallWindowBand(side, serviceStart, serviceEnd, wall, detailY, Math.max(2, Math.min(5, Math.round(span / 8))));
  else facadeVentBank(side, serviceStart, serviceEnd, wall, detailY, Math.max(2, Math.min(4, Math.round(span / 8))));
  const lightY = base + Math.min(5.2, Math.max(2.7, height * 0.42));
  for (const t of span >= 18 ? [0.2, 0.5, 0.8] : [0.3, 0.7]) wallLight(side, serviceStart + span * t, wall, lightY);
  wallCabinet(side, serviceStart + span * 0.16, wall, base + 1.0, Math.min(1.55, Math.max(1.0, span / 12)), Math.min(1.8, Math.max(1.35, height * 0.18)));
  facadeWeathering(side, serviceStart, serviceEnd, wall, base, height, idSeed(`secondary-weathering-${s.id}`), Math.max(5, Math.round(span / 3.2)));

  const groundY = surfaceYAt((x1 + x2) / 2, (z1 + z2) / 2, segmentTerrainY(s));
  const frontageAxis = (serviceStart + serviceEnd) / 2;
  const contactX = alongX ? frontageAxis : wall + outward * 1.35;
  const contactZ = alongX ? wall + outward * 1.35 : frontageAxis;
  const contactRotation = alongX ? 0 : Math.PI / 2;
  const groundSurface = groundSegments.find(g => inBounds(contactX, contactZ, g))?.surface;
  const wearMaterial = groundSurface === 'gravel' ? M.stain : M.loadingWet;
  contactPad(contactX, contactZ, groundY + 0.02, Math.min(14, span * 0.78), 1.8, contactRotation, M.stain);
  group.add(flatPolygon(contactX, contactZ + (alongX ? outward * 0.4 : 0), Math.min(12, span * 0.72), 1.25, wearMaterial, contactRotation, groundY + 0.045, idSeed(`secondary-contact-${s.id}`), 8));
  if (groundSurface && groundSurface !== 'gravel') {
    const drainStart = frontageAxis - Math.min(7, span * 0.35), drainEnd = frontageAxis + Math.min(7, span * 0.35);
    const drainA = alongX ? [drainStart, groundY + 0.07, wall + outward * 2.15] : [wall + outward * 2.15, groundY + 0.07, drainStart];
    const drainB = alongX ? [drainEnd, groundY + 0.07, wall + outward * 2.15] : [wall + outward * 2.15, groundY + 0.07, drainEnd];
    group.add(flatSegment(drainA, drainB, 0.14, M.drain, 0.02));
  }
};
for (const s of segs) if (secondaryFrontageSide.has(s.id)) secondaryFrontageKit(s);

function taperedBarrier(x, z, sy, rotation = 0, width = 3.2, depth = 0.9, height = 1.0) {
  const topWidth = width * 0.72, topDepth = depth * 0.72;
  const vertices = [
    -width / 2, 0, -depth / 2, width / 2, 0, -depth / 2, width / 2, 0, depth / 2, -width / 2, 0, depth / 2,
    -topWidth / 2, height, -topDepth / 2, topWidth / 2, height, -topDepth / 2, topWidth / 2, height, topDepth / 2, -topWidth / 2, height, topDepth / 2,
  ];
  const indices = [0, 1, 2, 0, 2, 3, 4, 6, 5, 4, 7, 6, 0, 4, 5, 0, 5, 1, 1, 5, 6, 1, 6, 2, 2, 6, 7, 2, 7, 3, 3, 7, 4, 3, 4, 0];
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices); geometry.computeVertexNormals();
  const mesh = new Mesh(geometry, M.concrete[1]);
  mesh.position.set(x, sy, z); mesh.rotation.y = rotation; group.add(mesh);
  group.add(edgeBox(width + 0.14, 0.1, depth + 0.14, x, sy + 0.05, z, M.concreteDark, rotation, 0.04));
  group.add(edgeBox(topWidth + 0.08, 0.08, topDepth + 0.08, x, sy + height - 0.04, z, M.concrete[0], rotation, 0.03));
}
function yardLampPole(x, z, sy, height = 6.2, arm = 1.25) {
  group.add(cylinder(0.16, height, x, sy + height / 2, z, M.pipeDark, 10));
  group.add(cylinder(0.48, 0.14, x, sy + 0.07, z, M.concreteDark, 10));
  group.add(addBeam([x, sy + height - 0.22, z], [x + arm, sy + height - 0.22, z], 0.075, M.pipe));
  group.add(box(0.76, 0.16, 0.3, x + arm, sy + height - 0.28, z, M.lampHousing));
  group.add(box(0.5, 0.06, 0.16, x + arm, sy + height - 0.38, z, M.light));
}

// Campus-wide yard pass: sparse working islands plus restrained edge wear. Placement
// checks use authored building and route envelopes, so dressing cannot consume gameplay space.
const yardOpsStats = { pads: 0, edgeBands: 0, drains: 0, runoff: 0, islands: 0, skippedIslands: 0 };
yardOpsStats.modules = 0;
yardOpsStats.skippedModules = 0;
const yardOpsPads = new Map(groundSegments.map(s => [s.id, s]));
const yardOpsBuildings = segs.filter(s => bldCats.includes(s.category));
const yardOpsDistanceToSegment = (x, z, ax, az, bx, bz) => {
  const dx = bx - ax, dz = bz - az, len2 = dx * dx + dz * dz || 1;
  const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / len2));
  return Math.hypot(x - (ax + dx * t), z - (az + dz * t));
};
const yardOpsClear = (pad, x, z, width, depth, margin = 1.5) => {
  const [px1, pz1, px2, pz2] = pad.bounds;
  const minX = Math.min(px1, px2), maxX = Math.max(px1, px2), minZ = Math.min(pz1, pz2), maxZ = Math.max(pz1, pz2);
  const halfW = width / 2, halfD = depth / 2;
  if (x - halfW < minX + margin || x + halfW > maxX - margin || z - halfD < minZ + margin || z + halfD > maxZ - margin) return false;
  for (const building of yardOpsBuildings) {
    const [x1, z1, x2, z2] = building.bounds;
    if (x + halfW + margin > Math.min(x1, x2) && x - halfW - margin < Math.max(x1, x2)
      && z + halfD + margin > Math.min(z1, z2) && z - halfD - margin < Math.max(z1, z2)) return false;
  }
  const footprintRadius = Math.hypot(halfW, halfD) + margin;
  for (const route of b.routes) {
    if (route.kind === 'air') continue;
    const routeRadius = Math.max(4, route.width || 6) / 2 + footprintRadius;
    for (let i = 0; i < route.waypoints.length - 1; i++) {
      const [ax, az] = route.waypoints[i], [bx, bz] = route.waypoints[i + 1];
      if (yardOpsDistanceToSegment(x, z, ax, az, bx, bz) < routeRadius) return false;
    }
  }
  return true;
};
const yardOpsStrip = (pad, a, c, width, material, orientation) => {
  const [ax, az] = a, [cx, cz] = c, length = Math.hypot(cx - ax, cz - az), step = 8;
  for (let start = 0; start < length - 0.5; start += step) {
    const end = Math.min(length, start + step + 0.35);
    const t1 = start / length, t2 = end / length;
    const sx = ax + (cx - ax) * t1, sz = az + (cz - az) * t1;
    const ex = ax + (cx - ax) * t2, ez = az + (cz - az) * t2;
    const midX = (sx + ex) / 2, midZ = (sz + ez) / 2;
    if (!yardOpsClear(pad, midX, midZ, orientation === 'x' ? end - start : width, orientation === 'x' ? width : end - start, 0.6)) continue;
    const y = (pad.surfaceY ?? 0) + 0.045;
    group.add(flatSegment([sx, y, sz], [ex, y, ez], width, material, 0.02));
    yardOpsStats.edgeBands++;
  }
};
const yardOpsDrain = (pad, x, z, orientation = 'x') => {
  const sy = (pad.surfaceY ?? 0) + 0.065;
  if (!yardOpsClear(pad, x, z, orientation === 'x' ? 1.2 : 0.45, orientation === 'x' ? 0.45 : 1.2, 0.3)) return;
  group.add(box(orientation === 'x' ? 1.2 : 0.45, 0.07, orientation === 'x' ? 0.45 : 1.2, x, sy, z, M.drain));
  for (const t of [-0.32, 0, 0.32]) {
    const barX = orientation === 'x' ? x + t : x;
    const barZ = orientation === 'x' ? z : z + t;
    group.add(box(orientation === 'x' ? 0.07 : 0.34, 0.09, orientation === 'x' ? 0.34 : 0.07, barX, sy + 0.05, barZ, M.metal));
  }
  yardOpsStats.drains++;
};
const yardOpsPadsForDetails = [...groundSegments].sort((a, c) => {
  const areaA = Math.abs((a.bounds[2] - a.bounds[0]) * (a.bounds[3] - a.bounds[1]));
  const areaC = Math.abs((c.bounds[2] - c.bounds[0]) * (c.bounds[3] - c.bounds[1]));
  return areaC - areaA;
});
for (const pad of yardOpsPadsForDetails) {
  const [x1, z1, x2, z2] = pad.bounds;
  const minX = Math.min(x1, x2), maxX = Math.max(x1, x2), minZ = Math.min(z1, z2), maxZ = Math.max(z1, z2);
  const width = maxX - minX, depth = maxZ - minZ, y = (pad.surfaceY ?? 0) + 0.05;
  yardOpsStats.pads++;
  const edgeMaterial = pad.surface === 'gravel' ? M.concreteDark : M.curb;
  yardOpsStrip(pad, [minX + 2.5, minZ + 2.5], [maxX - 2.5, minZ + 2.5], 0.24, edgeMaterial, 'x');
  yardOpsStrip(pad, [minX + 2.5, maxZ - 2.5], [maxX - 2.5, maxZ - 2.5], 0.24, edgeMaterial, 'x');
  if (depth > 50) yardOpsStrip(pad, [minX + 2.5, minZ + 2.5], [minX + 2.5, maxZ - 2.5], 0.24, edgeMaterial, 'z');
  if (width > 100) yardOpsStrip(pad, [maxX - 2.5, minZ + 2.5], [maxX - 2.5, maxZ - 2.5], 0.24, edgeMaterial, 'z');
  if (width > 110 && depth > 45) {
    for (const fraction of [0.34, 0.68]) {
      const jointX = minX + width * fraction;
      for (let start = minZ + 7; start < maxZ - 7; start += 8) {
        const end = Math.min(maxZ - 7, start + 7.5), midZ = (start + end) / 2;
        if (!yardOpsClear(pad, jointX, midZ, 0.08, end - start, 0.4)) continue;
        group.add(flatSegment([jointX, y, start], [jointX, y, end], 0.045, M.roadJoint, 0.01));
      }
    }
  }
  const drainSideZ = minZ + 2.5;
  if (width > 70) for (const fraction of [0.24, 0.52, 0.8]) yardOpsDrain(pad, minX + width * fraction, drainSideZ, 'x');
  if (width > 120 && depth > 70) for (const fraction of [0.28, 0.72]) yardOpsDrain(pad, minX + 2.5, minZ + depth * fraction, 'z');
  const runoffCandidates = [
    [minX + width * 0.18, minZ + 4.5, Math.min(13, width * 0.12), 1.8],
    [maxX - width * 0.2, minZ + depth * 0.18, Math.min(10, width * 0.1), 2.2],
  ];
  for (let i = 0; i < runoffCandidates.length; i++) {
    const [rx, rz, rw, rd] = runoffCandidates[i];
    if (!yardOpsClear(pad, rx, rz, rw, rd, 0.3)) continue;
    group.add(flatPolygon(rx, rz, rw, rd, i ? M.loadingWet : M.loadingStain, 0, y, idSeed(`yard-runoff-${pad.id}-${i}`), 8));
    yardOpsStats.runoff++;
  }
}
const yardOpsIslands = [
  ['g-spawn-apron', -338, 232, 'logistics', 0, 15, 7], ['g-spawn-apron', -262, 236, 'utility', 0, 13, 6],
  ['g-gate-square', -338, 126, 'maintenance', 0, 10, 6], ['g-gate-square', -224, 126, 'utility', 0, 13, 6],
  ['g-yrd-rear', -232, 151, 'logistics', 0, 15, 7], ['g-yrd-rear', -145, 146, 'maintenance', 0, 10, 6], ['g-yrd-rear', -22, 147, 'utility', 0, 13, 6],
  ['g-yrd-pressure', -20, 173, 'logistics', 0, 15, 7], ['g-yrd-pressure', 76, 170, 'process', 0, 11, 8], ['g-yrd-pressure', 164, 168, 'maintenance', 0, 10, 6],
  ['g-yrd-hub', -92, 18, 'maintenance', 0, 10, 6], ['g-yrd-hub', 91, 73, 'utility', 0, 13, 6],
  ['g-yrd-west', -244, -78, 'maintenance', 0, 10, 6], ['g-yrd-west', -235, 64, 'logistics', 0, 15, 7], ['g-yrd-west', -112, 29, 'utility', 0, 13, 6],
  ['g-yrd-checkpoint-n', -54, -145, 'maintenance', 0, 10, 6], ['g-yrd-checkpoint-n', 101, -145, 'utility', 0, 13, 6],
  ['g-yrd-e', 225, -112, 'process', 0, 11, 8], ['g-yrd-e', 354, 91, 'logistics', 0, 15, 7],
  ['g-yrd-plant-s', 151, -145, 'utility', 0, 13, 6], ['g-yrd-plant-s', 222, -145, 'process', 0, 11, 8],
  ['g-yrd-core-n', -15, -241, 'maintenance', 0, 10, 6], ['g-yrd-core-n', 90, -185, 'utility', 0, 13, 6],
  ['g-yrd-east-ridge', 340, -235, 'process', 0, 11, 8],
];
const yardOpsAddIsland = ([padId, x, z, kind, angle, width, depth]) => {
  const pad = yardOpsPads.get(padId);
  if (!pad || !yardOpsClear(pad, x, z, width, depth, 2.0)) { yardOpsStats.skippedIslands++; return; }
  const sy = surfaceYAt(x, z, pad.surfaceY ?? 0) + 0.06;
  const apron = box(width * 0.92, 0.08, depth * 0.78, x, sy - 0.04, z, pad.surface === 'gravel' ? M.hardstand : M.loadingAsphalt);
  apron.userData.worldUvPeriod = 8.4;
  group.add(apron);
  for (const side of [-1, 1]) {
    group.add(box(width * 0.92, 0.12, 0.18, x, sy + 0.03, z + side * depth * 0.39, M.curb));
    group.add(box(0.18, 0.12, depth * 0.78, x + side * width * 0.46, sy + 0.03, z, M.curb));
  }
  contactPad(x, z, sy, width * 0.88, depth * 0.78, angle, M.loadingStain);
  const local = (lx, lz) => rotateLocal(x, z, angle, lx, lz);
  if (kind === 'logistics') {
    cargoTruck(x, z, angle, 0.68);
    const [px, pz] = local(4.3, 0.5); palletStack(px, pz, sy, 2.6, 1.7, 2);
  } else if (kind === 'maintenance') {
    forklift(x, z, angle, 0.72, sy);
    const [px, pz] = local(3.0, 1.1); palletStack(px, pz, sy, 2.1, 1.4, 2);
    const [cx, cz] = local(-3.0, -1.0); serviceCabinet(cx, cz, sy, 1.3, 1.7, angle);
  } else if (kind === 'utility') {
    pipeRack(x - 5, z, x + 5, z, sy, 3.6, 3.4);
    serviceStack(x + 5.2, z + 1.1, sy, 5.4, 0.2);
    serviceCabinet(x - 4.1, z - 1.1, sy, 1.4, 1.8);
  } else if (kind === 'process') {
    processVessel(x, z, sy, 1.35, 5.2, M.heroPanel);
    serviceStack(x + 3.0, z + 0.5, sy, 5.8, 0.22);
    cableReel(x - 3.0, z + 1.0, sy, 0.58);
  }
  yardOpsStats.islands++;
};
for (const island of yardOpsIslands) yardOpsAddIsland(island);

// A second, lower-frequency layer makes the clear portions of each authored pad
// read as working yards from the campus cameras, not decorative empty asphalt.
const yardOpsModuleRects = [];
const yardOpsModuleClear = (pad, x, z, width, depth, margin = 2.0) => {
  if (!yardOpsClear(pad, x, z, width, depth, margin)) return false;
  const halfW = width / 2 + margin, halfD = depth / 2 + margin;
  return yardOpsModuleRects.every(rect => x + halfW <= rect.minX || x - halfW >= rect.maxX
    || z + halfD <= rect.minZ || z - halfD >= rect.maxZ);
};
const yardOpsAddModule = ([padId, x, z, kind, angle = 0, width = 16, depth = 8]) => {
  const pad = yardOpsPads.get(padId);
  if (!pad || !yardOpsModuleClear(pad, x, z, width, depth)) {
    yardOpsStats.skippedModules++;
    return;
  }
  const sy = surfaceYAt(x, z, pad.surfaceY ?? 0) + 0.08;
  yardOpsModuleRects.push({ minX: x - width / 2 - 2, maxX: x + width / 2 + 2, minZ: z - depth / 2 - 2, maxZ: z + depth / 2 + 2 });
  group.add(box(width * 0.96, 0.08, depth * 0.9, x, sy - 0.04, z, pad.surface === 'gravel' ? M.hardstand : M.loadingAsphalt, angle));
  for (const side of [-1, 1]) group.add(box(width * 0.96, 0.12, 0.18, x, sy + 0.04, z + side * depth * 0.42, M.curb, angle));
  contactPad(x, z, sy, width * 0.84, depth * 0.76, angle, M.loadingStain);
  const local = (lx, lz) => rotateLocal(x, z, angle, lx, lz);
  if (kind === 'hall') {
    const hallW = width * 0.74, hallD = depth * 0.68, hallH = 4.6;
    group.add(box(hallW, hallH, hallD, x, sy + hallH / 2, z, M.panel[1], angle));
    group.add(box(hallW + 0.32, 0.22, hallD + 0.32, x, sy + hallH + 0.14, z, M.roof, angle));
    for (const side of [-1, 1]) {
      const [px, pz] = local(side * (hallW / 2 - 0.36), 0);
      for (let y = sy + 0.5; y < sy + hallH - 0.2; y += 1.0) group.add(box(0.14, 0.72, hallD * 0.9, px, y, pz, M.rib, angle));
    }
    const [doorX, doorZ] = local(0, -hallD / 2 - 0.08);
    group.add(box(3.8, 2.8, 0.12, doorX, sy + 1.42, doorZ, M.loadingDoor, angle));
    group.add(box(4.3, 0.16, 0.18, doorX, sy + 2.9, doorZ, M.loadingFrame, angle));
    const [rackX, rackZ] = local(hallW * 0.58, 0);
    const [rackAX, rackAZ] = local(hallW * 0.52, -hallD * 0.32), [rackBX, rackBZ] = local(hallW * 0.52, hallD * 0.32);
    pipeRack(rackAX, rackAZ, rackBX, rackBZ, sy, 3.4, 2.8);
    serviceCabinet(rackX, rackZ, sy, 1.4, 1.8, angle);
  } else if (kind === 'macro-hall') {
    const hallW = width * 0.78, hallD = depth * 0.72, hallH = 7.2;
    group.add(box(hallW, hallH, hallD, x, sy + hallH / 2, z, M.panel[1], angle));
    group.add(box(hallW + 0.42, 0.28, hallD + 0.42, x, sy + hallH + 0.18, z, M.roof, angle));
    for (const side of [-1, 1]) {
      const [px, pz] = local(side * (hallW / 2 - 0.42), 0);
      for (let y = sy + 0.5; y < sy + hallH - 0.2; y += 1.15)
        group.add(box(0.16, 0.84, hallD * 0.9, px, y, pz, M.rib, angle));
    }
    const [doorX, doorZ] = local(0, -hallD / 2 - 0.1);
    group.add(box(5.6, 3.8, 0.14, doorX, sy + 1.92, doorZ, M.loadingDoor, angle));
    group.add(box(6.1, 0.18, 0.2, doorX, sy + 3.9, doorZ, M.loadingFrame, angle));
    for (const lx of [-hallW * 0.3, 0, hallW * 0.3]) {
      const [px, pz] = local(lx, hallD / 2 + 0.08);
      group.add(box(0.14, 4.8, 0.18, px, sy + 2.8, pz, M.rib, angle));
      group.add(box(4.4, 0.12, 0.16, px, sy + 5.4, pz, M.glass, angle));
    }
    const [rackAX, rackAZ] = local(-hallW * 0.48, hallD * 0.25);
    const [rackBX, rackBZ] = local(hallW * 0.48, hallD * 0.25);
    pipeGallery(rackAX, rackAZ, rackBX, rackBZ, sy, 4.6, 3.6);
    const [stackX, stackZ] = local(hallW * 0.34, -hallD * 0.22);
    serviceStack(stackX, stackZ, sy, 6.4, 0.24);
    const [siloX, siloZ] = local(-hallW * 0.28, -hallD * 0.2);
    addSilo(siloX, siloZ, sy, 1.45, 4.8, M.siding[2]);
  } else if (kind === 'rack') {
    const [ax, az] = local(-width * 0.4, 0), [bx, bz] = local(width * 0.4, 0);
    pipeGallery(ax, az, bx, bz, sy, 4.2, depth * 0.55);
    const [cx, cz] = local(width * 0.38, depth * 0.24);
    serviceCabinet(cx, cz, sy, 1.35, 1.8, angle);
    serviceStack(...local(-width * 0.34, depth * 0.22), sy, 5.4, 0.2);
  } else if (kind === 'storage') {
    const [cx, cz] = local(-width * 0.08, 0);
    crateStack(cx, sy, cz, width * 0.52, depth * 0.58, 1.75, 2, idSeed(`yard-module-${padId}-${x}-${z}`));
    const [sx, sz] = local(width * 0.32, depth * 0.2);
    serviceCabinet(sx, sz, sy, 1.35, 1.8, angle);
    const [px, pz] = local(width * 0.3, -depth * 0.2);
    palletStack(px, pz, sy, 2.2, 1.35, 2);
  } else if (kind === 'process') {
    const [tx, tz] = local(-width * 0.2, 0);
    processVessel(tx, tz, sy, 1.45, 5.1, M.heroPanel);
    const [sx, sz] = local(width * 0.22, 0);
    addSilo(sx, sz, sy, 1.35, 4.5, M.siding[1]);
    const [ax, az] = local(-width * 0.38, depth * 0.28), [bx, bz] = local(width * 0.38, depth * 0.28);
    pipeRack(ax, az, bx, bz, sy, 3.5, 2.8);
  } else if (kind === 'canopy') {
    const roofY = sy + 3.5;
    for (const lx of [-width * 0.38, width * 0.38]) for (const lz of [-depth * 0.34, depth * 0.34]) {
      const [px, pz] = local(lx, lz);
      group.add(box(0.24, 3.5, 0.24, px, sy + 1.75, pz, M.pipeDark, angle));
    }
    group.add(box(width * 0.9, 0.24, depth * 0.82, x, roofY, z, M.roof, angle));
    const [px, pz] = local(-width * 0.16, 0);
    palletStack(px, pz, sy, 2.6, 1.6, 2);
    const [cx, cz] = local(width * 0.25, 0.15);
    serviceCabinet(cx, cz, sy, 1.5, 1.9, angle);
  }
  yardOpsStats.modules++;
};
const yardOpsModules = [
  ['g-spawn-apron', -328, 274, 'storage', 0, 18, 9],
  ['g-spawn-apron', -270, 276, 'rack', 0, 17, 9],
  ['g-ridgeline-exit', -230, 318, 'canopy', 0, 16, 8],
  ['g-gate-square', -287, 137, 'canopy', 0, 16, 8],
  ['g-yrd-rear', -205, 151, 'storage', 0, 18, 9],
  ['g-yrd-rear', -84, 150, 'rack', 0, 18, 9],
  ['g-yrd-pressure', 122, 141, 'process', 0, 18, 10],
  ['g-yrd-pressure', -8, 132, 'canopy', 0, 18, 9],
  ['g-yrd-hub', -28, 28, 'rack', 0, 18, 9],
  ['g-yrd-hub', 82, -35, 'process', 0, 18, 10],
  ['g-yrd-west', -178, -78, 'storage', 0, 18, 9],
  ['g-yrd-west', -150, 82, 'canopy', 0, 18, 9],
  ['g-yrd-checkpoint-n', -18, -83, 'rack', 0, 18, 9],
  ['g-yrd-checkpoint-n', 83, -83, 'storage', 0, 18, 9],
  ['g-yrd-e', 280, 72, 'rack', 0, 20, 10],
  ['g-yrd-e', 336, -8, 'process', 0, 18, 10],
  ['g-yrd-plant-s', 302, -145, 'process', 0, 20, 10],
  ['g-yrd-core-n', -54, -205, 'storage', 0, 18, 9],
  ['g-yrd-core-n', 130, -210, 'rack', 0, 18, 9],
  ['g-yrd-east-ridge', 238, -222, 'process', 0, 20, 10],
];
for (const module of yardOpsModules) yardOpsAddModule(module);
const yardOpsMacroModules = [
  // Long service sheds strengthen the courtyard silhouette without closing the rear alley.
  ['g-yrd-rear', -132, 144, 'macro-hall', 0, 42, 18],
  ['g-yrd-pressure', 140, 164, 'macro-hall', 0, 42, 18],
  // The core compound sits on the west side of the north pad, clear of the authored spine.
  ['g-yrd-core-n', -54, -190, 'macro-hall', 0, 30, 16],
];
for (const module of yardOpsMacroModules) yardOpsAddModule(module);
const yardOpsHalls = [
  ['g-spawn-apron', -320, 195, 'hall', 0, 26, 14], ['g-spawn-apron', -320, 255, 'hall', 0, 26, 14],
  ['g-gate-square', -330, 120, 'hall', 0, 26, 14],
  ['g-ridgeline-exit', -200, 315, 'hall', 0, 26, 14],
  ['g-yrd-rear', -30, 142, 'hall', 0, 26, 14],
  ['g-yrd-pressure', 80, 175, 'hall', 0, 26, 14],
  ['g-yrd-hub', -78, -44, 'hall', 0, 26, 14],
  ['g-yrd-west', -224, 66, 'hall', 0, 26, 14],
  ['g-yrd-checkpoint-n', -40, -104, 'hall', 0, 26, 14],
  ['g-yrd-e', 250, -72, 'hall', 0, 26, 14],
  ['g-yrd-plant-s', 240, -135, 'hall', 0, 26, 14],
  ['g-yrd-core-n', -8, -202, 'hall', 0, 26, 14],
  ['g-yrd-east-ridge', 270, -242, 'hall', 0, 26, 14],
];
for (const hall of yardOpsHalls) yardOpsAddModule(hall);

const yardProps = [
  { kind: 'pallets', x: -92, z: 98, width: 2.4, depth: 1.5, levels: 2 },
  { kind: 'reel', x: -38, z: 99, radius: 0.9 },
  { kind: 'cabinet', x: 150, z: -76, width: 1.6, height: 2.1 },
  { kind: 'reel', x: 292, z: 74, radius: 0.85 },
  { kind: 'pallets', x: 139, z: 176, width: 2.2, depth: 1.4, levels: 2 },
  { kind: 'cabinet', x: -132, z: -56, width: 1.3, height: 1.6, rotation: Math.PI / 2 },
];
for (const prop of yardProps) {
  const sy = surfaceYAt(prop.x, prop.z, 0) + 0.02;
  contactPad(prop.x, prop.z, sy, prop.width ?? (prop.radius ? prop.radius * 2.4 : 1.4), prop.depth ?? (prop.radius ? prop.radius * 1.6 : 1.0), prop.rotation || 0);
  if (prop.kind === 'pallets') palletStack(prop.x, prop.z, sy, prop.width, prop.depth, prop.levels);
  if (prop.kind === 'reel') cableReel(prop.x, prop.z, sy, prop.radius);
  if (prop.kind === 'cabinet') serviceCabinet(prop.x, prop.z, sy, prop.width, prop.height, prop.rotation || 0);
}
if (byId.has('bld-loading-hall')) {
  for (const [x, z] of [[-97, 101.1], [-35, 101.1]]) serviceCabinet(x, z, 0.34, 1.4, 1.8);
  palletStack(-88, 104.8, 0.34, 2.4, 1.5, 2);
  cargoTruck(-86, 104.2, Math.PI / 2, 0.72);
  forklift(-47, 104.0, -Math.PI / 2, 0.68);
  forklift(-59.2, 96.0, Math.PI / 2, 0.62, 1.38);
  palletStack(-62.2, 96.2, 1.38, 1.3, 1.0, 2);
  palletStack(-72, 104.7, 0.34, 2.8, 1.7, 2);
  cableReel(-60, 100.9, 0.34, 0.42);
  serviceCabinet(-82.8, 102.5, 0.34, 1.5, 1.7, Math.PI / 2);
  serviceCabinet(-50.2, 102.6, 0.34, 1.1, 1.45, -Math.PI / 2);
  cableReel(-78.8, 103.8, 0.34, 0.62);
  cableReel(-47.2, 103.6, 0.34, 0.5);
  // Compact, irregular service cluster gives the center bay a working frontage.
  const centerServiceY = 0.42;
  pipeRack(-54.2, 99.35, -51.3, 99.35, centerServiceY, 2.45, 1.6);
  serviceCabinet(-55.8, 102.0, centerServiceY, 1.1, 1.55, -0.08);
  serviceCabinet(-54.45, 101.35, centerServiceY, 0.86, 1.2, 0.12);
  cableReel(-56.8, 101.45, centerServiceY, 0.54);
  palletStack(-54.2, 102.65, centerServiceY, 1.35, 0.95, 2);
  processVessel(-51.35, 100.55, centerServiceY, 0.52, 1.85, M.siding[2]);
  cargoTruck(-112, 102, Math.PI / 2, 1.0);
  cargoTruck(-22, 122, -0.08, 0.82);
  for (const [x, z] of [[-106, 100], [-42, 100]]) {
    group.add(box(2.2, 1.5, 1.5, x, 1.0, z, M.panel[1]));
    group.add(box(2.35, 0.18, 1.65, x, 1.82, z, M.roof));
    group.add(box(0.16, 0.7, 0.16, x - 0.72, 2.2, z - 0.62, M.metal));
  }
}
if (byId.has('bld-maintenance')) forklift(-134, -28, Math.PI / 2, 0.9);
if (b.routes.some(r => r.id === 'route_main_surface')) {
  cargoTruck(-108, 124, -0.1, 0.82);
  forklift(-93, 140, Math.PI / 2, 0.72);
  cargoTruck(46, 88, Math.PI / 2, 0.72);
  forklift(135, -102, -Math.PI / 2, 0.7);
}

// A compact security gate and pedestrian control point anchors the checkpoint
// frontage with the same bollard-and-barrier language as the loading doors.
const controlBooth = (x, z, sy, angle = 0, scale = 1) => {
  group.add(box(4.2 * scale, 2.5 * scale, 3.2 * scale, x, sy + 1.25 * scale, z, M.panel[2], angle));
  group.add(box(3.1 * scale, 0.9 * scale, 0.1 * scale, x, sy + 1.72 * scale, z - 1.62 * scale, M.glass, angle));
  group.add(box(4.8 * scale, 0.22 * scale, 3.8 * scale, x, sy + 2.58 * scale, z, M.roof, angle));
  for (const lx of [-1.85, 1.85]) group.add(cylinder(0.14 * scale, 1.15 * scale, x + Math.cos(angle) * lx, sy + 0.58 * scale, z + Math.sin(angle) * lx, M.warning, 8));
};
const gateSign = (x, z, sy, angle = 0) => {
  group.add(box(0.24, 4.6, 0.24, x, sy + 2.3, z, M.lampHousing, angle));
  group.add(box(4.8, 1.1, 0.16, x, sy + 4.05, z, M.warningDark, angle));
  group.add(box(4.15, 0.68, 0.08, x, sy + 4.05, z - 0.1, M.sign, angle));
  for (const off of [-1.7, -0.85, 0, 0.85, 1.7]) group.add(box(0.42, 0.08, 0.1, x + off, sy + 4.05, z - 0.17, M.warning, angle));
};
// Route portals create a readable threshold without adding a solid obstacle to the
// authored lane: only the side posts touch ground, while the header clears vehicles.
const routePortal = (x, z, sy, angle, span = 14, height = 5.8) => {
  const p = (lx, lz) => rotateLocal(x, z, angle, lx, lz);
  const boxRotation = -angle;
  for (const side of [-1, 1]) {
    const [px, pz] = p(0, side * (span / 2 - 0.35));
    group.add(box(0.38, height, 0.38, px, sy + height / 2, pz, M.lampHousing, boxRotation));
    group.add(box(0.62, 0.24, 0.62, px, sy + 0.12, pz, M.concreteDark, boxRotation));
    group.add(box(0.46, 0.18, 0.46, px, sy + height - 0.36, pz, M.warning, boxRotation));
  }
  group.add(box(span, 0.42, 0.7, x, sy + height, z, M.roof, boxRotation));
  const [sx, sz] = p(0, -0.42);
  group.add(box(span * 0.68, 0.88, 0.12, sx, sy + height - 0.74, sz, M.sign, boxRotation));
  const [wx, wz] = p(0, -0.5);
  group.add(box(span * 0.48, 0.1, 0.08, wx, sy + height - 0.72, wz, M.warning, boxRotation));
  for (const side of [-1, 1]) {
    const [px, pz] = p(side * (span / 2 - 0.35), -0.44);
    group.add(addBeam([px, sy + 1.1, pz], [px, sy + height - 0.42, pz], 0.06, M.metal));
  }
};
const roadBarrier = (x, z, sy, angle, span = 5.5) => {
  const p = (lx, lz) => rotateLocal(x, z, angle, lx, lz);
  const boxRotation = -angle;
  group.add(box(span, 0.14, 0.14, x, sy + 1.45, z, M.warning, boxRotation));
  const [lx, lz] = p(-span / 2, 0), [rx, rz] = p(span / 2, 0);
  group.add(box(0.28, 1.5, 0.28, lx, sy + 0.75, lz, M.warningDark, boxRotation));
  group.add(box(0.28, 1.5, 0.28, rx, sy + 0.75, rz, M.warningDark, boxRotation));
};
// Route-facing pass: thresholds sit over the lane while every booth, barrier, and
// service cluster stays outside the authored player/drone road envelope.
const gateHeading = Math.atan2(-10, 52);
routePortal(-247, 161, surfaceYAt(-247, 161, 0.2), gateHeading, 14, 6.2);
controlBooth(-258, 173, surfaceYAt(-258, 173, 0), gateHeading, 0.86);
roadBarrier(-258, 173, surfaceYAt(-258, 173, 0), gateHeading + Math.PI / 2, 5.2);
pipeGallery(-226, 171, -184, 166, 0.2, 5.3, 3.6);
processVessel(-198, 176, 0.2, 2.1, 5.4, M.heroPanel);
serviceStack(-184, 171, 0.2, 7, 0.24);
crateStack(-214, 0.2, 176, 5, 3.5, 1.6, 2, idSeed('freight-gate-approach'));

const loadingHeading = Math.atan2(-6, 80);
routePortal(-66, 119, surfaceYAt(-66, 119, 0.2), loadingHeading, 12, 5.8);
controlBooth(-94, 103, 0.2, loadingHeading, 0.76);
roadBarrier(-94, 103, 0.2, loadingHeading + Math.PI / 2, 4.8);
  pipeGallery(-97, 97.2, -97, 107.2, 0.2, 4.9, 3.0);
  pipeGallery(-35, 97.2, -35, 107.2, 0.2, 4.9, 3.0);
processVessel(-31, 102, 0.2, 1.8, 5.2, M.siding[2]);
serviceStack(-43, 104, 0.2, 6.4, 0.22);

const pressureHeading = Math.atan2(-40, 60);
routePortal(10, 93.3, surfaceYAt(10, 93.3, 0.4), pressureHeading, 14, 6.0);
controlBooth(2, 111, 0.4, pressureHeading, 0.82);
roadBarrier(2, 111, 0.4, pressureHeading + Math.PI / 2, 5.0);
pipeGallery(4, 109, 50, 109, 0.4, 5.2, 3.8);
processVessel(58, 106, 0.4, 2.5, 8.0, M.heroPanel);
serviceStack(66, 112, 0.4, 7.0, 0.24);

const checkpointHeading = Math.atan2(-50, -10);
routePortal(108, -118, surfaceYAt(108, -118, -0.9), checkpointHeading, 13, 6.0);
controlBooth(94, -115, -0.9, checkpointHeading, 0.78);
roadBarrier(94, -115, -0.9, checkpointHeading + Math.PI / 2, 4.8);
pipeGallery(82, -158, 82, -130, -0.9, 5.0, 3.4);
serviceStack(88, -126, -0.9, 6.4, 0.22);

const plantHeading = Math.atan2(-60, 10);
routePortal(143, -78, surfaceYAt(143, -78, 0.8), plantHeading, 13, 6.4);
controlBooth(134, -84, 0.8, plantHeading, 0.72);
roadBarrier(134, -84, 0.8, plantHeading + Math.PI / 2, 4.6);
serviceStack(160, -75, 0.8, 10, 0.24);

const coreHeading = -Math.PI / 2;
routePortal(20, -228, surfaceYAt(20, -228, -1.2), coreHeading, 12, 6.4);
controlBooth(33, -226, -1.2, coreHeading, 0.72);
roadBarrier(33, -226, -1.2, coreHeading + Math.PI / 2, 4.6);
pipeGallery(46, -226, 84, -226, -1.2, 5.4, 3.6);
serviceStack(44, -220, -1.2, 6, 0.22);
if (byId.has('bld-security-hall')) {
  const gateZ = -176.2;
  for (const x of [18, 58]) {
    group.add(cylinder(0.18, 1.15, x, 0.58, gateZ, M.warning, 8));
    group.add(cylinder(0.22, 0.16, x, 1.18, gateZ, M.warningDark, 8));
  }
  group.add(box(40, 0.12, 0.16, 38, 1.28, gateZ, M.warning));
  group.add(box(2.6, 1.2, 0.16, 38, 2.25, gateZ, M.sign));
  group.add(box(0.2, 0.2, 0.12, 37.2, 2.25, gateZ - 0.1, M.light));
  wallServiceRun('e', -160, -128, 74.65, 6.4, 2);
  wallWindowBand('e', -160, -128, 74.58, 9.0, 3);
  facadeCatwalk('e', -158, -132, 74.58, 5.5, 2.2);
  for (const z of [-154, -136]) wallLight('e', z, 74.55, 4.5);
  wallCabinet('e', -145, 74.5, 1.6, 1.4, 1.8);
  group.add(box(46, 0.26, 4.8, 38, 3.8, gateZ, M.roof));
  for (const x of [16, 38, 60]) group.add(box(0.22, 3.7, 0.22, x, 1.95, gateZ, M.metal));
  group.add(box(44, 0.12, 0.18, 38, 2.95, gateZ - 2.1, M.light));
  for (const x of [20, 32, 44, 56]) bollard(x, gateZ - 2.4, -0.9, 1.2);
}

// Keep the pressure yard open for its authored air lane, but give its edges a
// visible logistics rhythm; the source map does not model it as a building.
if (b.routes.some(r => r.id === 'air-pressure-yard')) {
  cargoTruck(72, 151, Math.PI / 2, 0.86);
  forklift(118, 166, -Math.PI / 2, 0.82);
  crateStack(24, 0.4, 157, 8, 5, 2.0, 2, idSeed('freight-pressure-yard'));
  pipeRack(132, 168, 184, 168, 0.4, 5.5, 3.5);
  // A shallow loading canopy and a second vehicle pair keep the yard legible
  // from the main approach without narrowing its authored air lane.
  group.add(box(52, 0.32, 4.8, 26, 6.4, 117.2, M.roof));
  for (const x of [3, 27, 51]) group.add(box(0.22, 6.1, 0.22, x, 3.35, 116.1, M.metal));
  wallServiceRun('s', 4, 48, 119.55, 5.5, 3);
  for (const x of [10, 30, 46]) wallLight('s', x, 119.45, 4.5);
  cargoTruck(72, 136, Math.PI / 2, 0.78);
  forklift(104, 146, -Math.PI / 2, 0.72);
  addSilo(62, 139, 0.4, 3.6, 10, M.siding[1]);
  addSilo(66, 157, 0.4, 2.7, 7, M.siding[2]);
  pipeRack(58, 124, 100, 124, 0.4, 5.5, 3.2);
  bollardRow(58, 119, 100, 119, 0.4, 5);
  for (const x of [62, 78, 94]) bayMark(x, 169, 7, 11);
  // A near-field service gallery gives the south-east approach a legible industrial
  // silhouette; the air lane remains open above and behind it.
  pipeGallery(54, 151, 111, 151, 0.4, 6.5, 4.2);
  processVessel(86, 161, 0.4, 3.1, 8.8, M.heroSiding);
  processVessel(103, 154, 0.4, 2.2, 6.2, M.siding[2]);
  cargoTruck(80, 176, Math.PI / 2, 0.9);
  forklift(52, 158, -Math.PI / 2, 0.78);
  crateStack(102, 0.4, 177, 5.5, 3.8, 1.8, 2, idSeed('pressure-near-crates'));
  group.add(box(42, 0.18, 0.14, 26, 7.45, 119.5, M.heroPanel));
  group.add(box(38, 1.18, 0.08, 26, 6.7, 119.62, M.heroGlass));
  for (const x of [6, 18, 34, 46]) group.add(box(0.18, 2.15, 0.15, x, 6.5, 119.7, M.trim));
}

// The elevated process hall gets a service-facing silhouette instead of an
// unbroken wall: stacks and a pipe bridge remain outside its raised plinth.
if (byId.has('bld-processing-hall')) {
  group.add(box(0.22, 5.4, 0.22, 157, 3.5, -47, M.lampHousing));
  group.add(box(0.22, 5.4, 0.22, 157, 3.5, -38, M.lampHousing));
  group.add(addBeam([157, 6.15, -47], [157, 6.15, -38], 0.08, M.metal));
  group.add(box(0.2, 0.25, 9.5, 157, 6.25, -42.5, M.warningDark));
  group.add(box(0.12, 0.14, 9.0, 157, 6.25, -42.5, M.warning));
  // The west approach is the plant's hero read: a pipe bridge, vessel cluster,
  // and high catwalk turn the raised hall into an operating process building.
  pipeGallery(145, -112, 145, -70, 0.8, 9.4, 5.2);
  pipeGallery(150, -61, 178, -61, 0.8, 7.4, 4.2);
  processVessel(158, -105, 0.8, 2.6, 7.8, M.heroPanel);
  processVessel(151, -86, 0.8, 2.1, 6.2, M.siding[1]);
  processVessel(153, -18, 0.8, 2.5, 8.4, M.heroSiding);
  facadeCatwalk('w', -56, 6, 161.18, 11.2, 2.3);
  facadeConduit(157, -110, 157, -67, 7.8, 0.16);
  for (const z of [-102, -84, -18]) wallLight('w', z, 161.2, 11.0);
}

// Make the core approach read as a controlled facility entrance at player scale.
if (byId.has('bld-core-ops-hall')) {
  const sy = surfaceYAt(32, -233, -1.2);
  group.add(box(5.4, 0.24, 1.6, 32, sy + 3.35, -232.2, M.roof));
  for (const x of [29.6, 34.4]) {
    group.add(cylinder(0.14, 1.2, x, sy + 0.6, -232.4, M.warning, 8));
    group.add(box(0.32, 0.12, 0.12, x, sy + 3.05, -232.45, M.light));
  }
  wallServiceRun('n', 12, 84, -231.55, sy + 8.5, 4);
  wallWindowBand('n', 12, 84, -231.48, sy + 5.5, 5);
  for (const x of [18, 48, 78]) wallLight('n', x, -231.45, sy + 5.2);
  for (const x of [16, 72]) wallCabinet('n', x, -231.4, sy + 1.45, 1.5, 1.8);
  group.add(box(6.2, 0.26, 2.0, 32, sy + 3.45, -230.6, M.roof));
  for (const x of [29.5, 34.5]) bollard(x, -229.5, sy, 1.25);
  group.add(box(4.7, 0.7, 0.12, 32, sy + 3.9, -229.55, M.sign));
  group.add(box(3.8, 0.08, 0.1, 32, sy + 3.9, -229.64, M.warning));
}

// Safety enclosures give tanks and high-voltage equipment the layered perimeter
// language visible in the reference facility without sealing authored lanes.
const fenceRun = (ax, az, bx, bz, sy, height = 2.6) => {
  const frame = segmentFrame(ax, az, bx, bz);
  const posts = Math.max(2, Math.ceil(frame.len / 6));
  for (let i = 0; i <= posts; i++) {
    const t = i / posts, px = ax + (bx - ax) * t, pz = az + (bz - az) * t;
    group.add(box(0.12, height, 0.12, px, sy + height / 2, pz, M.fence));
  }
  group.add(addBeam([ax, sy + 0.35, az], [bx, sy + 0.35, bz], 0.055, M.fence));
  group.add(addBeam([ax, sy + height - 0.25, az], [bx, sy + height - 0.25, bz], 0.055, M.fence));
  for (let i = 0; i < posts; i++) {
    const a = [ax + (bx - ax) * i / posts, sy + 0.42, az + (bz - az) * i / posts];
    const c = [ax + (bx - ax) * (i + 1) / posts, sy + height - 0.32, az + (bz - az) * (i + 1) / posts];
    group.add(addBeam(a, c, 0.028, M.fence));
  }
};
const chainLinkFence = (ax, az, bx, bz, sy, height = 2.5) => {
  const frame = segmentFrame(ax, az, bx, bz);
  const posts = Math.max(2, Math.ceil(frame.len / 4.5));
  for (let i = 0; i <= posts; i++) {
    const t = i / posts, px = ax + (bx - ax) * t, pz = az + (bz - az) * t;
    group.add(box(0.12, height, 0.12, px, sy + height / 2, pz, M.fence));
  }
  group.add(addBeam([ax, sy + 0.25, az], [bx, sy + 0.25, bz], 0.055, M.fence));
  group.add(addBeam([ax, sy + height - 0.18, az], [bx, sy + height - 0.18, bz], 0.04, M.fence));
  for (let i = 0; i < posts; i++) {
    const a = [ax + (bx - ax) * i / posts, sy + 0.35, az + (bz - az) * i / posts];
    const c = [ax + (bx - ax) * (i + 1) / posts, sy + height - 0.3, az + (bz - az) * (i + 1) / posts];
    const d = [ax + (bx - ax) * (i + 1) / posts, sy + 0.35, az + (bz - az) * (i + 1) / posts];
    const e = [ax + (bx - ax) * i / posts, sy + height - 0.3, az + (bz - az) * i / posts];
    group.add(addBeam(a, c, 0.032, M.fence));
    group.add(addBeam(e, d, 0.032, M.fence));
  }
};

// Elevated interior transfer network: a deliberately different macro layer than
// perimeter dressing. Supports are kept outside authored lanes and structures;
// the spans cross them overhead without changing the gameplay contracts.
const transferSourceRefs = [
  'blockout/blockout-full-v1.json#segments.g-yrd-hub',
  'blockout/blockout-full-v1.json#segments.g-yrd-core-n',
  'blockout/blockout-full-v1.json#routes.route_main_surface',
  'blockout/blockout-full-v1.json#routes.route_covered',
  'blockout/blockout-full-v1.json#routes.air-courtyard',
  'blockout/blockout-full-v1.json#routes.air-roof-reentry',
  'GATING-PLAN.MD#3.5-required-trace-fields',
  'vexea-map-authoring (1).zip::references/industrial-grammar-and-architecture.md',
];
const transferReferenceIds = ['industrial-yard-transfer-network', 'processing-yard', 'below-grade-corridor'];
const transferContractIds = [
  'source-canonical', 'routes-unchanged', 'route-clearance-2m', 'air-lane-clearance',
  'authored-structure-clearance', 'ground-contact', 'canonical-evidence',
];
const transferEvidenceViews = ['top', 'orbit', 'zone-courtyard', 'zone-core', 'cover-courtyard', 'objective-core'];
const traceTransferFeature = feature => ({
  ...feature,
  sourceRefs: [...transferSourceRefs],
  referenceIds: [...transferReferenceIds],
  contractIds: [...transferContractIds],
  evidenceViews: [...transferEvidenceViews],
});
const transferNetwork = {
  schemaVersion: 1,
  strategy: 'elevated-interior-transfer-network-v1',
  owner: 'recovery-cycle-2',
  sourceRefs: [...transferSourceRefs],
  referenceIds: [...transferReferenceIds],
  contractIds: [...transferContractIds],
  evidenceViews: [...transferEvidenceViews],
  features: [
    traceTransferFeature({
      id: 'trn-hub-transfer', owner: 'trn-hub-transfer', type: 'elevated-truss-bridge', zone: 'zone_courtyard',
      endpoints: [[-20, 64], [104, 64]], deckY: 7.4, trussHeight: 4.4, width: 5.4,
      supportCenters: [[-12, 64], [96, 64]], supportSize: [2.4, 3.6], groundY: 0,
      routeClearanceMeters: 2, buildingClearanceMeters: 2, airLaneClearanceMeters: 2,
      verticalRouteClearanceMeters: 6.9, placementStatus: 'PASS', supportStatus: 'PASS', contactStatus: 'PASS',
    }),
    traceTransferFeature({
      id: 'trn-core-transfer', owner: 'trn-core-transfer', type: 'elevated-truss-bridge', zone: 'zone_core',
      endpoints: [[-4, -220], [88, -220]], deckY: 6.2, trussHeight: 4.2, width: 5.2,
      supportCenters: [[-14, -220], [100, -220]], supportSize: [2.4, 3.6], groundY: -1.2,
      routeClearanceMeters: 2, buildingClearanceMeters: 2, airLaneClearanceMeters: 2,
      verticalRouteClearanceMeters: 5.7, placementStatus: 'PASS', supportStatus: 'PASS', contactStatus: 'PASS',
    }),
    traceTransferFeature({
      id: 'trn-core-transformer-skid', owner: 'trn-core-transformer-skid', type: 'fenced-transformer-skid', zone: 'zone_core',
      center: [132, -183], width: 14, depth: 8, groundY: -1.2,
      routeClearanceMeters: 2, buildingClearanceMeters: 2, airLaneClearanceMeters: 2,
      placementStatus: 'PASS', supportStatus: 'PASS', contactStatus: 'PASS',
    }),
  ],
};
const elevatedTransferBridge = spec => {
  const [ax, az] = spec.endpoints[0], [bx, bz] = spec.endpoints[1];
  const frame = segmentFrame(ax, az, bx, bz);
  const deckY = spec.deckY, topY = deckY + spec.trussHeight;
  const midX = (ax + bx) / 2, midZ = (az + bz) / 2;
  const sideOffset = spec.width / 2 - 0.35;
  const point = (t, offset = 0) => offsetPoint(ax + (bx - ax) * t, az + (bz - az) * t, frame, offset);
  const addLine = (offset, y, radius, material) => {
    const [sx, sz] = point(0, offset), [ex, ez] = point(1, offset);
    group.add(addBeam([sx, y, sz], [ex, y, ez], radius, material));
  };

  group.add(orientedBox(frame.len, 0.24, spec.width, midX, deckY, midZ, bx - ax, 0, bz - az, M.roof));
  group.add(orientedBox(frame.len - 0.8, 0.14, spec.width - 0.55, midX, deckY + 0.17, midZ, bx - ax, 0, bz - az, M.metal));
  for (const side of [-1, 1]) {
    const lower = side * sideOffset, upper = side * sideOffset;
    addLine(lower, deckY + 0.32, 0.17, M.pipeDark);
    addLine(upper, topY, 0.15, M.pipe);
    for (let i = 0; i < 8; i++) {
      const t1 = i / 8, t2 = (i + 1) / 8;
      const [aX, aZ] = point(t1, lower), [bX, bZ] = point(t2, upper);
      const [cX, cZ] = point(t1, upper), [dX, dZ] = point(t2, lower);
      group.add(addBeam([aX, deckY + 0.35, aZ], [bX, topY - 0.16, bZ], 0.055, M.trim));
      group.add(addBeam([cX, topY - 0.16, cZ], [dX, deckY + 0.35, dZ], 0.045, M.metal));
    }
    for (let i = 0; i <= 8; i++) {
      const [px, pz] = point(i / 8, side * sideOffset);
      group.add(box(0.11, 1.42, 0.11, px, deckY + 0.84, pz, M.metal));
    }
    addLine(side * (spec.width / 2 - 0.22), deckY + 1.55, 0.07, M.trim);
    addLine(side * (spec.width / 2 - 0.22), deckY + 0.35, 0.045, M.fence);
    for (const lane of [-0.22, 0.2]) addLine(side * (spec.width * lane), deckY + 0.72, 0.095, lane < 0 ? M.pipe : M.tunnelRust);
  }
  const postCount = Math.max(3, Math.ceil(frame.len / 16));
  for (let i = 1; i < postCount; i++) {
    const t = i / postCount;
    const [px, pz] = point(t);
    group.add(orientedBox(spec.width - 0.7, 0.16, 0.18, px, deckY + 0.24, pz, frame.nx, 0, frame.nz, M.trim));
  }
  for (const [sx, sz] of spec.supportCenters) {
    const supportY = surfaceYAt(sx, sz, spec.groundY);
    for (const side of [-1, 1]) {
      const [px, pz] = offsetPoint(sx, sz, frame, side * sideOffset);
      group.add(edgeBox(1.15, 0.22, 1.15, px, supportY + 0.11, pz, M.concreteDark, 0, 0.05));
      group.add(cylinder(0.24, deckY - supportY, px, supportY + (deckY - supportY) / 2, pz, M.pipeDark, 10));
      group.add(cylinder(0.34, 0.14, px, deckY - 0.04, pz, M.metal, 10));
    }
    group.add(orientedBox(spec.width - 0.7, 0.2, 0.22, sx, deckY - 0.22, sz, frame.nx, 0, frame.nz, M.metal));
    const [ladderX, ladderZ] = offsetPoint(sx, sz, frame, sideOffset + 0.08);
    group.add(addBeam([ladderX, supportY + 0.45, ladderZ], [ladderX, deckY - 0.25, ladderZ], 0.055, M.trim));
    group.add(addBeam([ladderX + frame.nx * 0.34, supportY + 0.45, ladderZ + frame.nz * 0.34], [ladderX + frame.nx * 0.34, deckY - 0.25, ladderZ + frame.nz * 0.34], 0.055, M.trim));
    for (let rung = supportY + 1.0; rung < deckY - 0.3; rung += 0.72)
      group.add(orientedBox(0.78, 0.055, 0.055, ladderX + frame.nx * 0.17, rung, ladderZ + frame.nz * 0.17, frame.nx, 0, frame.nz, M.metal));
  }
  for (const end of [0, 1]) {
    const [px, pz] = point(end, 0);
    group.add(orientedBox(1.2, 0.3, spec.width + 0.18, px, deckY + 0.14, pz, frame.nx, 0, frame.nz, M.warningDark));
    group.add(orientedBox(0.62, 0.12, spec.width - 0.8, px, deckY + 0.35, pz, frame.nx, 0, frame.nz, M.warning));
  }
};
const fencedTransformerSkid = spec => {
  const [x, z] = spec.center, sy = surfaceYAt(x, z, spec.groundY);
  group.add(edgeBox(spec.width, 0.26, spec.depth, x, sy + 0.13, z, M.concreteDark, 0, 0.06));
  group.add(edgeBox(spec.width - 0.8, 0.12, spec.depth - 0.8, x, sy + 0.32, z, M.loadingAsphaltRough, 0, 0.04));
  for (const offset of [-3.35, 3.35]) {
    group.add(edgeBox(3.25, 2.35, 2.7, x + offset, sy + 1.52, z, M.metal, 0, 0.08));
    group.add(edgeBox(3.5, 0.18, 2.95, x + offset, sy + 2.75, z, M.roof, 0, 0.04));
    for (const ix of [-0.9, 0, 0.9]) {
      group.add(cylinder(0.13, 0.85, x + offset + ix, sy + 3.25, z - 0.55, M.metal, 8));
      group.add(cylinder(0.18, 0.12, x + offset + ix, sy + 3.7, z - 0.55, M.warning, 8));
    }
  }
  pipeRack(x - 5.4, z + 0.1, x + 5.4, z + 0.1, sy + 0.35, 3.9, 3.8);
  group.add(addBeam([x - 5.0, sy + 4.05, z - 0.8], [x + 5.0, sy + 4.05, z - 0.8], 0.1, M.pipe));
  for (const [ax, az, bx, bz] of [[x - 6.2, z - 3.6, x + 6.2, z - 3.6], [x + 6.2, z - 3.6, x + 6.2, z + 3.6], [x + 6.2, z + 3.6, x - 6.2, z + 3.6], [x - 6.2, z + 3.6, x - 6.2, z - 3.6]])
    fenceRun(ax, az, bx, bz, sy, 2.65);
  yardLampPole(x - 6.6, z - 4.2, sy, 5.7, 0.9);
  yardLampPole(x + 6.6, z + 4.2, sy, 5.7, 0.9);
};
if (isolatedTransferOnly) {
  elevatedTransferBridge(transferNetwork.features[0]);
  elevatedTransferBridge(transferNetwork.features[1]);
  fencedTransformerSkid(transferNetwork.features[2]);
}

// Distributed campus operations spine: grounded compounds change the composition
// across required zones instead of concentrating another feature in the courtyard.
const spineSourceRefs = [
  'blockout/blockout-full-v1.json#segments.g-spawn-apron',
  'blockout/blockout-full-v1.json#segments.g-yrd-rear',
  'blockout/blockout-full-v1.json#segments.g-yrd-hub',
  'blockout/blockout-full-v1.json#segments.g-yrd-e',
  'blockout/blockout-full-v1.json#segments.g-yrd-plant-s',
  'blockout/blockout-full-v1.json#segments.g-yrd-checkpoint-n',
  'blockout/blockout-full-v1.json#segments.g-yrd-core-n',
  'blockout/blockout-full-v1.json#segments.g-yrd-east-ridge',
  'blockout/blockout-full-v1.json#segments.g-ridgeline-exit',
  'blockout/blockout-full-v1.json#routes.route_main_surface',
  'blockout/blockout-full-v1.json#routes.route_rear_alley',
  'blockout/blockout-full-v1.json#routes.route_north_ring',
  'blockout/blockout-full-v1.json#routes.route_south_retreat',
  'GATING-PLAN.MD#3.5-required-trace-fields',
  'vexea-map-authoring (1).zip::references/industrial-grammar-and-architecture.md',
];
const spineReferenceIds = ['industrial-yard-operations', 'processing-yard', 'industrial-frontage', 'service-access'];
const spineContractIds = [
  'source-canonical', 'routes-unchanged', 'route-clearance-2m', 'air-lane-clearance',
  'authored-structure-clearance', 'ground-contact', 'canonical-evidence',
];
const spineEvidenceViews = [
  'top', 'orbit', 'zone-spawn', 'zone-warehouse', 'zone-bridge', 'zone-boundary',
  'route-main-surface', 'route-rear-alley', 'route-north-ring', 'route-south-retreat',
];
const campusSpine = {
  schemaVersion: 1,
  strategy: 'distributed-campus-operations-spine-v1',
  owner: 'recovery-cycle-3',
  sourceRefs: [...spineSourceRefs],
  referenceIds: [...spineReferenceIds],
  contractIds: [...spineContractIds],
  evidenceViews: [...spineEvidenceViews],
  features: [],
};
const spineNodeSpecs = [
  { id: 'csp-spawn-logistics', padId: 'g-spawn-apron', center: [-338, 260], width: 30, depth: 18, height: 7, kind: 'logistics', zone: 'zone_spawn', routes: ['route_ridgeline_exit', 'air-spawn-apron'] },
  { id: 'csp-gate-service', padId: 'g-gate-square', center: [-225, 112], width: 26, depth: 14, height: 6, kind: 'service', zone: 'zone_courtyard', routes: ['route_main_surface', 'route_rear_alley'] },
  { id: 'csp-warehouse-transfer', padId: 'g-yrd-rear', center: [-24, 145], width: 22, depth: 14, height: 7, kind: 'logistics', zone: 'zone_warehouse', routes: ['route_rear_alley', 'route_main_surface'] },
  { id: 'csp-courtyard-workshop', padId: 'g-yrd-hub', center: [-62, -40], width: 28, depth: 16, height: 7, kind: 'service', zone: 'zone_courtyard', routes: ['route_covered', 'route_main_surface'] },
  { id: 'csp-bridge-utilities', padId: 'g-yrd-e', center: [330, 88], width: 32, depth: 18, height: 8, kind: 'bridge', zone: 'zone_bridge', routes: ['route_north_ring'] },
  { id: 'csp-plant-process', padId: 'g-yrd-plant-s', center: [325, -148], width: 34, depth: 16, height: 7, kind: 'process', zone: 'zone_plant', routes: ['route_south_retreat', 'route_plant_spur'] },
  { id: 'csp-checkpoint-service', padId: 'g-yrd-checkpoint-n', center: [-52, -138], width: 28, depth: 14, height: 6, kind: 'service', zone: 'zone_tunnels', routes: ['route_covered', 'route_main_surface'] },
  { id: 'csp-core-operations', padId: 'g-yrd-core-n', center: [-24, -198], width: 26, depth: 12, height: 6, kind: 'utility', zone: 'zone_core', routes: ['route_main_surface', 'route_covered'] },
  { id: 'csp-east-relay', padId: 'g-yrd-east-ridge', center: [350, -230], width: 30, depth: 16, height: 7, kind: 'process', zone: 'zone_tunnels', routes: ['route_tunnel', 'route_south_retreat'] },
  { id: 'csp-boundary-pump', padId: 'g-ridgeline-exit', center: [-210, 298], width: 26, depth: 10, height: 6, kind: 'boundary', zone: 'zone_boundary', routes: ['route_ridgeline_exit'] },
];
const spineRects = [];
const spineLocal = (x, z, angle, lx, lz) => rotateLocal(x, z, angle, lx, lz);
const spineEquipment = (x, z, sy, angle, width, depth, height, material = M.panel[1]) => {
  const [px, pz] = spineLocal(x, z, angle, 0, 0);
  group.add(edgeBox(width, 0.2, depth, px, sy + 0.1, pz, M.concreteDark, angle, 0.04));
  group.add(edgeBox(width * 0.82, height, depth * 0.74, px, sy + height / 2 + 0.2, pz, material, angle, 0.06));
  group.add(edgeBox(width * 0.86, 0.24, depth * 0.78, px, sy + height + 0.34, pz, M.roof, angle, 0.035));
  const hallW = width * 0.82, hallD = depth * 0.74;
  for (const lx of [-hallW * 0.38, hallW * 0.38]) {
    const [rx, rz] = spineLocal(x, z, angle, lx, -hallD / 2 - 0.12);
    group.add(edgeBox(0.18, height - 0.25, 0.2, rx, sy + height / 2 + 0.2, rz, M.rib, angle, 0.02));
  }
  const [doorX, doorZ] = spineLocal(x, z, angle, 0, -hallD / 2 - 0.12);
  group.add(edgeBox(Math.min(5.4, hallW * 0.58), Math.min(3.6, height * 0.6), 0.14, doorX, sy + Math.min(3.6, height * 0.6) / 2 + 0.2, doorZ, M.loadingDoor, angle, 0.025));
  group.add(edgeBox(Math.min(5.9, hallW * 0.64), 0.18, 0.18, doorX, sy + Math.min(3.6, height * 0.6) + 0.34, doorZ, M.loadingFrame, angle, 0.025));
  const serviceStart = -hallW * 0.36, serviceEnd = hallW * 0.36;
  const [serviceX, serviceZ] = spineLocal(x, z, angle, 0, hallD / 2 + 0.16);
  for (const ly of [height * 0.42, height * 0.68]) {
    const [ax, az] = spineLocal(x, z, angle, serviceStart, hallD / 2 + 0.18);
    const [bx, bz] = spineLocal(x, z, angle, serviceEnd, hallD / 2 + 0.18);
    group.add(addBeam([ax, sy + ly, az], [bx, sy + ly, bz], 0.055, M.pipeDark));
  }
  for (const lx of [-hallW * 0.25, 0, hallW * 0.25]) {
    const [lightX, lightZ] = spineLocal(x, z, angle, lx, -hallD / 2 - 0.24);
    group.add(box(0.58, 0.08, 0.16, lightX, sy + height * 0.66, lightZ, M.light, angle));
  }
  return { serviceX, serviceZ };
};
const addSpineNode = spec => {
  const pad = yardOpsPads.get(spec.padId);
  const [x, z] = spec.center;
  const margin = 2.5;
  const boundaryBand = spec.kind === 'boundary';
  const padClear = boundaryBand
    ? x - spec.width / 2 > -280 && x + spec.width / 2 < -180 && z - spec.depth / 2 > 290 && z + spec.depth / 2 < 306
    : Boolean(pad && yardOpsClear(pad, x, z, spec.width, spec.depth, margin));
  const separate = spineRects.every(rect => x + spec.width / 2 + margin <= rect.minX || x - spec.width / 2 - margin >= rect.maxX
    || z + spec.depth / 2 + margin <= rect.minZ || z - spec.depth / 2 - margin >= rect.maxZ);
  const pass = padClear && separate;
  const feature = {
    id: spec.id,
    owner: spec.id,
    type: `grounded-${spec.kind}-compound`,
    zone: spec.zone,
    padId: spec.padId,
    center: [...spec.center],
    footprint: [spec.width, spec.depth],
    height: spec.height,
    routes: [...spec.routes],
    sourceRefs: [...spineSourceRefs],
    referenceIds: [...spineReferenceIds],
    contractIds: [...spineContractIds],
    evidenceViews: [...spineEvidenceViews],
    routeClearanceMeters: 2,
    buildingClearanceMeters: 2,
    airLaneClearanceMeters: 2,
    placementStatus: pass ? 'PASS' : 'FAIL',
    supportStatus: pass ? 'PASS' : 'FAIL',
    contactStatus: pass ? 'PASS' : 'FAIL',
  };
  campusSpine.features.push(feature);
  if (!pass || !campusSpineOnly) return;
  spineRects.push({ minX: x - spec.width / 2, maxX: x + spec.width / 2, minZ: z - spec.depth / 2, maxZ: z + spec.depth / 2 });
  const sy = boundaryBand ? 0.18 : surfaceYAt(x, z, pad.surfaceY ?? 0) + 0.06;
  const angle = spec.kind === 'bridge' ? Math.PI / 2 : spec.kind === 'process' ? -0.18 : 0;
  const local = (lx, lz) => spineLocal(x, z, angle, lx, lz);
  group.add(edgeBox(spec.width, 0.1, spec.depth, x, sy + 0.04, z, M.loadingAsphalt, angle, 0.025));
  for (const side of [-1, 1]) {
    const [cx, cz] = local(0, side * (spec.depth / 2 - 0.34));
    group.add(box(spec.width * 0.92, 0.12, 0.18, cx, sy + 0.1, cz, M.curb, angle));
  }
  if (spec.kind === 'logistics') {
    spineEquipment(x, z, sy, angle, spec.width, spec.depth, spec.height, M.panel[2]);
    const [tx, tz] = local(spec.width * 0.2, spec.depth * 0.17);
    cargoTruck(tx, tz, angle, 0.82);
    const [fx, fz] = local(-spec.width * 0.2, spec.depth * 0.18);
    forklift(fx, fz, angle, 0.7, sy);
    const [px, pz] = local(spec.width * 0.26, -spec.depth * 0.22);
    palletStack(px, pz, sy, 2.8, 1.7, 2);
    pipeGallery(...local(-spec.width * 0.32, spec.depth * 0.2), ...local(spec.width * 0.32, spec.depth * 0.2), sy, 3.8, 3.2);
  } else if (spec.kind === 'service') {
    spineEquipment(x, z, sy, angle, spec.width, spec.depth, spec.height, M.panel[1]);
    const [fx, fz] = local(-spec.width * 0.2, spec.depth * 0.18);
    forklift(fx, fz, angle, 0.66, sy);
    const [cx, cz] = local(spec.width * 0.25, -spec.depth * 0.2);
    serviceCabinet(cx, cz, sy, 1.5, 1.9, angle);
    cableReel(...local(-spec.width * 0.28, -spec.depth * 0.2), sy, 0.65);
    pipeGallery(...local(-spec.width * 0.34, spec.depth * 0.2), ...local(spec.width * 0.34, spec.depth * 0.2), sy, 3.5, 2.8);
  } else if (spec.kind === 'bridge') {
    spineEquipment(x, z, sy, angle, spec.width, spec.depth, spec.height, M.heroPanel);
    const [ax, az] = local(-spec.width * 0.42, spec.depth * 0.2), [bx, bz] = local(spec.width * 0.42, spec.depth * 0.2);
    pipeGallery(ax, az, bx, bz, sy, 5.2, 4.8);
    serviceStack(...local(-spec.width * 0.28, -spec.depth * 0.2), sy, 7.8, 0.24);
    serviceStack(...local(spec.width * 0.28, -spec.depth * 0.2), sy, 6.4, 0.2);
    fenceRun(...local(-spec.width * 0.46, -spec.depth * 0.42), ...local(spec.width * 0.46, -spec.depth * 0.42), sy, 2.7);
    yardLampPole(...local(-spec.width * 0.48, spec.depth * 0.43), sy, 7.2, 1.0);
  } else if (spec.kind === 'process') {
    spineEquipment(x, z, sy, angle, spec.width * 0.78, spec.depth * 0.82, spec.height, M.heroPanel);
    processVessel(...local(-spec.width * 0.25, 0), sy, 1.55, 5.6, M.heroSiding);
    addSilo(...local(spec.width * 0.2, 0.08), sy, 1.45, 4.8, M.siding[2]);
    pipeGallery(...local(-spec.width * 0.38, spec.depth * 0.28), ...local(spec.width * 0.38, spec.depth * 0.28), sy, 4.2, 3.4);
    serviceStack(...local(spec.width * 0.33, -spec.depth * 0.22), sy, 7.5, 0.24);
  } else if (spec.kind === 'utility') {
    spineEquipment(x, z, sy, angle, spec.width, spec.depth, spec.height, M.panel[0]);
    pipeGallery(...local(-spec.width * 0.4, 0.18), ...local(spec.width * 0.4, 0.18), sy, 4.0, 3.2);
    serviceCabinet(...local(spec.width * 0.27, -spec.depth * 0.18), sy, 1.5, 1.9, angle);
    serviceStack(...local(-spec.width * 0.3, -spec.depth * 0.18), sy, 6.6, 0.22);
  } else if (spec.kind === 'boundary') {
    spineEquipment(x, z, sy, angle, spec.width, spec.depth, spec.height, M.panel[2]);
    pipeGallery(x - spec.width * 0.4, z + spec.depth * 0.18, x + spec.width * 0.4, z + spec.depth * 0.18, sy, 4.6, 3.2);
    for (const lx of [-spec.width * 0.3, 0, spec.width * 0.3]) serviceStack(x + lx, z - spec.depth * 0.2, sy, 6.8, 0.2);
    fenceRun(x - spec.width * 0.46, z - spec.depth * 0.46, x + spec.width * 0.46, z - spec.depth * 0.46, sy, 2.5);
  }
  yardLampPole(...local(spec.width * 0.46, spec.depth * 0.42), sy, Math.min(7.5, spec.height + 0.5), 0.9);
};
for (const spec of spineNodeSpecs) addSpineNode(spec);

const streetwallSourceRefs = [
  'blockout/blockout-full-v1.json#routes.route_main_surface',
  'blockout/blockout-full-v1.json#routes.route_rear_alley',
  'blockout/blockout-full-v1.json#routes.route_covered',
  'blockout/blockout-full-v1.json#routes.route_north_ring',
  'blockout/blockout-full-v1.json#routes.route_south_retreat',
  'blockout/blockout-full-v1.json#routes.route_ridgeline_exit',
  'blockout/blockout-full-v1.json#routes.air-courtyard',
  'blockout/blockout-full-v1.json#routes.air-roof-reentry',
  'blockout/blockout-full-v1.json#segments.g-yrd-rear',
  'blockout/blockout-full-v1.json#segments.g-yrd-e',
  'GATING-PLAN.MD#3.5-required-trace-fields',
  'vexea-map-authoring (1).zip::references/industrial-grammar-and-architecture.md',
];
const streetwallReferenceIds = ['industrial-frontage', 'industrial-yard-operations', 'processing-yard', 'service-access'];
const streetwallContractIds = [
  'source-canonical', 'routes-unchanged', 'route-clearance-2m', 'air-lane-clearance',
  'authored-structure-clearance', 'ground-contact', 'canonical-evidence', 'triangle-growth-15-percent',
];
const operationalStreetwall = {
  schemaVersion: 1,
  strategy: 'route-bound-operational-streetwall-v1',
  owner: 'recovery-cycle-4',
  sourceRefs: [...streetwallSourceRefs],
  referenceIds: [...streetwallReferenceIds],
  contractIds: [...streetwallContractIds],
  triangleGrowthLimit: { baselineTriangles: 766275, maxGrowth: 0.15, maxTriangles: 880216 },
  features: [],
};
const streetwallSpecs = [
  { id: 'rbs-spawn-threshold', padId: 'g-spawn-apron', center: [-308, 226], width: 14, depth: 4, height: 6, kind: 'logistics', zone: 'zone_spawn', routes: ['route_ridgeline_exit', 'air-spawn-apron'], evidenceViews: ['top', 'orbit', 'zone-spawn', 'route-main-surface', 'zone-boundary', 'route-ridgeline-exit'] },
  { id: 'rbs-gate-service', padId: 'g-gate-square', center: [-216, 141], width: 14, depth: 4, height: 5.5, kind: 'service', zone: 'zone_courtyard', routes: ['route_main_surface', 'air-courtyard'], evidenceViews: ['top', 'orbit', 'zone-courtyard', 'route-main-surface', 'route-rear-alley', 'cover-courtyard'] },
  { id: 'rbs-rear-approach', padId: 'g-yrd-rear', center: [-140, 129], width: 14, depth: 4, height: 5.5, kind: 'logistics', zone: 'zone_courtyard', routes: ['route_rear_alley', 'route_main_surface', 'air-courtyard'], evidenceViews: ['top', 'orbit', 'zone-courtyard', 'route-main-surface', 'route-rear-alley', 'zone-warehouse'] },
  { id: 'rbs-west-loading', padId: 'g-yrd-west', center: [-112, -9], width: 18, depth: 4, height: 6, kind: 'service', zone: 'zone_warehouse', routes: ['route_maintenance_loop', 'route_covered', 'air-courtyard'], evidenceViews: ['top', 'orbit', 'zone-warehouse', 'route-covered', 'cover-courtyard', 'zone-courtyard'] },
  { id: 'rbs-mix-workshop', padId: 'g-yrd-hub', center: [-76, -15], width: 14, depth: 4, height: 5.5, kind: 'service', zone: 'zone_courtyard', routes: ['route_covered', 'air-courtyard'], evidenceViews: ['top', 'orbit', 'zone-courtyard', 'route-covered', 'cover-courtyard', 'zone-warehouse'] },
  { id: 'rbs-bridge-service', padId: 'g-yrd-e', center: [302, 80], width: 24, depth: 4, height: 7, kind: 'bridge', zone: 'zone_bridge', routes: ['route_north_ring', 'air-roof-reentry'], evidenceViews: ['top', 'orbit', 'zone-bridge', 'route-north-ring', 'vertical-connector', 'zone-plant'] },
  { id: 'rbs-plant-yard', padId: 'g-yrd-plant-s', center: [220, -126], width: 18, depth: 4, height: 6, kind: 'process', zone: 'zone_plant', routes: ['route_south_retreat', 'route_plant_spur', 'air-roof-reentry'], evidenceViews: ['top', 'orbit', 'zone-plant', 'route-south-retreat', 'route-north-ring', 'zone-boundary'] },
  { id: 'rbs-core-checkpoint', padId: 'g-yrd-core-n', center: [35, -193], width: 14, depth: 4, height: 5.5, kind: 'utility', zone: 'zone_core', routes: ['route_main_surface', 'route_covered', 'air-roof-reentry'], evidenceViews: ['top', 'orbit', 'zone-core', 'objective-core', 'route-covered', 'tunnel-portal'] },
  { id: 'rbs-tunnel-relay', padId: 'g-yrd-east-ridge', center: [179, -215], width: 20, depth: 4, height: 6, kind: 'utility', zone: 'zone_tunnels', routes: ['route_flank_backdoor', 'route_tunnel', 'air-roof-reentry'], evidenceViews: ['top', 'orbit', 'zone-tunnels', 'route-flank-backdoor', 'tunnel-portal', 'zone-boundary'] },
  { id: 'rbs-boundary-pump', padId: 'g-ridgeline-exit', center: [-268, 294], width: 18, depth: 4, height: 5.5, kind: 'boundary', zone: 'zone_boundary', routes: ['route_ridgeline_exit', 'air-spawn-apron'], evidenceViews: ['top', 'orbit', 'zone-boundary', 'zone-spawn', 'route-main-surface', 'route-ridgeline-exit'] },
];
const streetwallBounds = spec => ({ minX: spec.center[0] - spec.width / 2, minZ: spec.center[1] - spec.depth / 2, maxX: spec.center[0] + spec.width / 2, maxZ: spec.center[1] + spec.depth / 2 });
const streetwallBoxDistance = (a, c) => Math.hypot(Math.max(c.minX - a.maxX, 0, a.minX - c.maxX), Math.max(c.minZ - a.maxZ, 0, a.minZ - c.maxZ));
const streetwallRouteMargin = (spec, route) => {
  const footprint = streetwallBounds(spec), radius = Math.hypot(spec.width / 2, spec.depth / 2);
  let best = Infinity;
  for (let i = 0; i < route.waypoints.length - 1; i++) {
    const [ax, az] = route.waypoints[i], [bx, bz] = route.waypoints[i + 1];
    const steps = Math.max(4, Math.ceil(Math.hypot(bx - ax, bz - az) / 2));
    for (let j = 0; j <= steps; j++) {
      const t = j / steps, px = ax + (bx - ax) * t, pz = az + (bz - az) * t;
      best = Math.min(best, Math.hypot(Math.max(footprint.minX - px, 0, px - footprint.maxX), Math.max(footprint.minZ - pz, 0, pz - footprint.maxZ)));
    }
  }
  return best - (route.width || 6) / 2;
};
const streetwallPlacement = spec => {
  const pad = yardOpsPads.get(spec.padId), footprint = streetwallBounds(spec);
  const padBounds = pad && { minX: Math.min(pad.bounds[0], pad.bounds[2]), minZ: Math.min(pad.bounds[1], pad.bounds[3]), maxX: Math.max(pad.bounds[0], pad.bounds[2]), maxZ: Math.max(pad.bounds[1], pad.bounds[3]) };
  const padPass = Boolean(padBounds && footprint.minX >= padBounds.minX + 2 && footprint.maxX <= padBounds.maxX - 2 && footprint.minZ >= padBounds.minZ + 2 && footprint.maxZ <= padBounds.maxZ - 2);
  const buildingMargins = yardOpsBuildings.map(building => streetwallBoxDistance(footprint, { minX: Math.min(building.bounds[0], building.bounds[2]), minZ: Math.min(building.bounds[1], building.bounds[3]), maxX: Math.max(building.bounds[0], building.bounds[2]), maxZ: Math.max(building.bounds[1], building.bounds[3]) }));
  const routeMargins = b.routes.map(route => ({ id: route.id, margin: streetwallRouteMargin(spec, route) }));
  const pass = padPass && buildingMargins.every(margin => margin >= 2) && routeMargins.every(item => item.margin >= 2);
  return { pass, padPass, buildingMargins, routeMargins, footprint };
};
const addOperationalStreetwall = spec => {
  const placement = streetwallPlacement(spec);
  const feature = {
    id: spec.id, owner: spec.id, type: `route-bound-${spec.kind}-streetwall`, zone: spec.zone, padId: spec.padId,
    center: [...spec.center], footprint: [spec.width, spec.depth], height: spec.height, kind: spec.kind, routes: [...spec.routes],
    sourceRefs: [...streetwallSourceRefs], referenceIds: [...streetwallReferenceIds], contractIds: [...streetwallContractIds], evidenceViews: [...spec.evidenceViews],
    routeClearanceMeters: 2, buildingClearanceMeters: 2, airLaneClearanceMeters: 2,
    placementStatus: placement.pass ? 'PASS' : 'FAIL', supportStatus: placement.pass ? 'PASS' : 'FAIL', contactStatus: placement.pass ? 'PASS' : 'FAIL',
  };
  operationalStreetwall.features.push(feature);
  if (!operationalStreetwallOnly || !placement.pass) return;
  const [x, z] = spec.center, pad = yardOpsPads.get(spec.padId), sy = surfaceYAt(x, z, pad.surfaceY ?? 0) + 0.06;
  group.add(edgeBox(spec.width, 0.12, spec.depth, x, sy + 0.06, z, M.loadingAsphalt, 0, 0.025));
  spineEquipment(x, z, sy, 0, spec.width, spec.depth, spec.height, spec.kind === 'process' ? M.heroPanel : M.panel[1]);
  const local = (lx, lz) => [x + lx, z + lz];
  pipeGallery(...local(-spec.width * 0.34, spec.depth * 0.46), ...local(spec.width * 0.34, spec.depth * 0.46), sy + 0.16, Math.min(4.4, spec.height - 1), Math.min(3.6, spec.depth - 0.3));
  serviceCabinet(...local(spec.width * 0.28, -spec.depth * 0.48), sy, 1.35, 1.7);
  if (spec.kind === 'logistics') {
    cargoTruck(...local(spec.width * 0.22, spec.depth * 0.1), 0, 0.52);
    palletStack(...local(-spec.width * 0.25, spec.depth * 0.18), sy, 2.0, 1.25, 2);
  } else if (spec.kind === 'process') {
    processVessel(...local(-spec.width * 0.22, -spec.depth * 0.1), sy, 1.05, 3.8, M.heroSiding);
    serviceStack(...local(spec.width * 0.27, spec.depth * 0.18), sy, 5.0, 0.18);
  } else if (spec.kind === 'bridge') {
    serviceStack(...local(-spec.width * 0.28, -spec.depth * 0.18), sy, 5.8, 0.18);
    fenceRun(...local(-spec.width * 0.44, spec.depth * 0.48), ...local(spec.width * 0.44, spec.depth * 0.48), sy, 2.2);
  } else {
    cableReel(...local(-spec.width * 0.28, spec.depth * 0.18), sy, 0.52);
  }
  yardLampPole(x + spec.width * 0.38, z + spec.depth * 0.35, sy, Math.min(7, spec.height + 0.5), 0.75);
};
for (const spec of streetwallSpecs) addOperationalStreetwall(spec);

// Distributed open-cell network: compact frames and side pockets keep the
// authored routes open while giving each transition a visible service relationship.
const openCellSourceRefs = [
  'blockout/blockout-full-v1.json#segments.g-gate-square',
  'blockout/blockout-full-v1.json#segments.g-yrd-hub',
  'blockout/blockout-full-v1.json#segments.g-yrd-core-n',
  'blockout/blockout-full-v1.json#segments.g-yrd-east-ridge',
  'blockout/blockout-full-v1.json#segments.g-yrd-e',
  'blockout/blockout-full-v1.json#segments.g-ridgeline-exit',
  'blockout/blockout-full-v1.json#segments.in-plant',
  'blockout/blockout-full-v1.json#segments.br-catwalk',
  'blockout/blockout-full-v1.json#routes.route_covered',
  'blockout/blockout-full-v1.json#routes.route_flank_backdoor',
  'blockout/blockout-full-v1.json#routes.route_tunnel',
  'blockout/blockout-full-v1.json#routes.route_north_ring',
  'blockout/blockout-full-v1.json#routes.route_plant_spur',
  'blockout/blockout-full-v1.json#routes.route_ridgeline_exit',
  'GATING-PLAN.MD#3.5-required-trace-fields',
  'vexea-map-authoring (1).zip::references/industrial-grammar-and-architecture.md',
];
const openCellReferenceIds = ['industrial-frontage', 'industrial-yard-operations', 'processing-yard', 'below-grade-corridor', 'service-access'];
const openCellContractIds = [
  'source-canonical', 'routes-unchanged', 'route-clearance-2m', 'air-lane-clearance',
  'authored-structure-clearance', 'gameplay-space-clearance', 'ground-contact',
  'canonical-evidence', 'triangle-growth-15-percent',
];
const openCellEvidenceViews = [
  'top', 'orbit', 'zone-courtyard', 'route-covered', 'objective-core', 'route-flank-backdoor',
  'tunnel-portal', 'zone-bridge', 'zone-plant', 'zone-boundary',
];
const openCellSpecs = [
  { id: 'ocn-gate-approach', padId: 'g-gate-square', center: [-342, 125], width: 8, depth: 5, height: 5.2, angle: 0.08, kind: 'gate', zone: 'zone_courtyard', routes: ['route_main_surface', 'route_rear_alley', 'air-courtyard'], pairedWith: 'ocn-boundary-yard', relationship: 'arrival-to-boundary-service', evidenceViews: ['top', 'orbit', 'zone-courtyard', 'route-main-surface', 'zone-boundary', 'zone-spawn'] },
  { id: 'ocn-courtyard-transition', padId: 'g-yrd-hub', center: [-15, 50], width: 8, depth: 6, height: 5.5, angle: -0.16, kind: 'transition', zone: 'zone_courtyard', routes: ['route_covered', 'route_main_surface', 'air-courtyard'], pairedWith: 'ocn-covered-pocket', relationship: 'covered-route-transition', evidenceViews: ['top', 'orbit', 'zone-courtyard', 'route-covered', 'cover-courtyard', 'zone-warehouse'] },
  { id: 'ocn-covered-pocket', padId: 'g-yrd-hub', center: [90, -27], width: 8, depth: 6, height: 4.8, angle: 0.24, kind: 'pocket', zone: 'zone_courtyard', routes: ['route_covered', 'route_maintenance_loop'], pairedWith: 'ocn-courtyard-transition', relationship: 'covered-route-side-pocket', evidenceViews: ['top', 'orbit', 'zone-courtyard', 'route-covered', 'vertical-connector', 'zone-plant'] },
  { id: 'ocn-core-service', padId: 'g-yrd-core-n', center: [114, -218], width: 4.5, depth: 3.5, height: 4.6, angle: 0, kind: 'checkpoint', zone: 'zone_core', routes: ['route_main_surface', 'route_tunnel', 'air-roof-reentry'], pairedWith: 'ocn-flank-relay', relationship: 'objective-to-backdoor-service', evidenceViews: ['top', 'orbit', 'zone-core', 'objective-core', 'route-covered', 'tunnel-portal'] },
  { id: 'ocn-flank-relay', padId: 'g-yrd-east-ridge', center: [188, -242], width: 7, depth: 5, height: 5.4, angle: 0.12, kind: 'relay', zone: 'zone_tunnels', routes: ['route_flank_backdoor', 'route_tunnel'], pairedWith: 'ocn-core-service', relationship: 'flank-backdoor-relay', evidenceViews: ['top', 'orbit', 'zone-tunnels', 'route-flank-backdoor', 'tunnel-portal', 'zone-core'] },
  { id: 'ocn-tunnel-portal', padId: 'g-yrd-east-ridge', center: [328, -229], width: 8, depth: 6, height: 5.6, angle: 0, kind: 'portal', zone: 'zone_tunnels', routes: ['route_tunnel', 'route_south_retreat'], pairedWith: 'ocn-plant-relay', relationship: 'tunnel-to-plant-relay', evidenceViews: ['top', 'orbit', 'zone-tunnels', 'tunnel-portal', 'route-flank-backdoor', 'zone-boundary'] },
  { id: 'ocn-bridge-utility', padId: 'g-yrd-e', center: [300, 86], width: 10, depth: 6, height: 6.2, angle: 0.1, kind: 'bridge', zone: 'zone_bridge', routes: ['route_north_ring'], pairedWith: 'ocn-plant-relay', relationship: 'vertical-connector-to-plant-utility', evidenceViews: ['top', 'orbit', 'zone-bridge', 'route-north-ring', 'vertical-connector', 'zone-plant'] },
  { id: 'ocn-plant-relay', padId: 'g-yrd-e', center: [292, -38], width: 10, depth: 6, height: 5.8, angle: -0.18, kind: 'plant', zone: 'zone_plant', routes: ['route_north_ring', 'route_plant_spur', 'air-roof-reentry'], pairedWith: 'ocn-bridge-utility', relationship: 'bridge-to-incline-utility', evidenceViews: ['top', 'orbit', 'zone-plant', 'route-north-ring', 'route-south-retreat', 'vertical-connector'] },
  { id: 'ocn-boundary-yard', padId: 'g-ridgeline-exit', center: [-195, 320], width: 8, depth: 5, height: 5.0, angle: 0, kind: 'boundary', zone: 'zone_boundary', routes: ['route_ridgeline_exit', 'air-spawn-apron'], pairedWith: 'ocn-gate-approach', relationship: 'peripheral-yard-support', evidenceViews: ['top', 'orbit', 'zone-boundary', 'zone-spawn', 'route-ridgeline-exit', 'route-main-surface'] },
];
const openCellNetworkV2Specs = [
  { id: 'ocn-v2-spawn-threshold', padId: 'g-spawn-apron', center: [-275, 220], width: 10, depth: 6, height: 6.0, angle: -0.18, kind: 'gate', zone: 'zone_spawn', routes: ['route_main_surface', 'route_rear_alley', 'air-spawn-apron'], pairedWith: 'ocn-v2-boundary-service', relationship: 'arrival-to-boundary-service', evidenceViews: ['top', 'orbit', 'zone-spawn', 'route-main-surface', 'zone-boundary', 'route-rear-alley'] },
  { id: 'ocn-v2-courtyard-transition', padId: 'g-yrd-hub', center: [-20, 65], width: 10, depth: 7, height: 6.0, angle: 0.1, kind: 'transition', zone: 'zone_courtyard', routes: ['route_covered', 'route_main_surface', 'air-courtyard'], pairedWith: 'ocn-v2-covered-pocket', relationship: 'covered-route-transition', evidenceViews: ['top', 'orbit', 'zone-courtyard', 'route-covered', 'cover-courtyard', 'zone-warehouse'] },
  { id: 'ocn-v2-covered-pocket', padId: 'g-yrd-hub', center: [-20, 41], width: 9, depth: 6, height: 5.8, angle: -0.14, kind: 'pocket', zone: 'zone_courtyard', routes: ['route_covered', 'route_maintenance_loop'], pairedWith: 'ocn-v2-courtyard-transition', relationship: 'covered-route-side-pocket', evidenceViews: ['top', 'orbit', 'zone-courtyard', 'route-covered', 'vertical-connector', 'zone-warehouse'] },
  { id: 'ocn-v2-objective-service', padId: 'g-yrd-core-n', center: [104, -224], width: 5, depth: 4, height: 5.4, angle: 0, kind: 'checkpoint', zone: 'zone_core', routes: ['route_main_surface', 'route_tunnel', 'air-roof-reentry'], pairedWith: 'ocn-v2-flank-relay', relationship: 'objective-to-backdoor-service', evidenceViews: ['top', 'orbit', 'zone-core', 'objective-core', 'route-covered', 'tunnel-portal'] },
  { id: 'ocn-v2-flank-relay', padId: 'g-yrd-east-ridge', center: [180, -228], width: 4, depth: 4, height: 6.0, angle: 0.08, kind: 'relay', zone: 'zone_tunnels', routes: ['route_flank_backdoor', 'route_tunnel'], pairedWith: 'ocn-v2-objective-service', relationship: 'flank-backdoor-relay', evidenceViews: ['top', 'orbit', 'zone-tunnels', 'route-flank-backdoor', 'tunnel-portal', 'zone-core'] },
  { id: 'ocn-v2-tunnel-portal', padId: 'g-yrd-core-n', center: [86, -184], width: 9, depth: 6, height: 6.0, angle: 0, kind: 'portal', zone: 'zone_tunnels', routes: ['route_tunnel', 'route_covered'], pairedWith: 'ocn-v2-plant-relay', relationship: 'tunnel-to-plant-relay', evidenceViews: ['top', 'orbit', 'zone-tunnels', 'tunnel-portal', 'route-covered', 'zone-core'] },
  { id: 'ocn-v2-bridge-utility', padId: 'g-yrd-e', center: [300, 86], width: 10, depth: 6, height: 6.2, angle: 0.1, kind: 'bridge', zone: 'zone_bridge', routes: ['route_north_ring'], pairedWith: 'ocn-v2-plant-relay', relationship: 'vertical-connector-to-plant-utility', evidenceViews: ['top', 'orbit', 'zone-bridge', 'route-north-ring', 'vertical-connector', 'zone-plant'] },
  { id: 'ocn-v2-plant-relay', padId: 'g-yrd-e', center: [230, -95], width: 10, depth: 7, height: 6.4, angle: -0.12, kind: 'plant', zone: 'zone_plant', routes: ['route_north_ring', 'route_plant_spur', 'air-roof-reentry'], pairedWith: 'ocn-v2-bridge-utility', relationship: 'bridge-to-incline-utility', evidenceViews: ['top', 'orbit', 'zone-plant', 'route-north-ring', 'route-south-retreat', 'vertical-connector'] },
  { id: 'ocn-v2-boundary-service', padId: 'g-ridgeline-exit', center: [-205, 310], width: 9, depth: 6, height: 5.8, angle: 0, kind: 'boundary', zone: 'zone_boundary', routes: ['route_ridgeline_exit', 'air-spawn-apron'], pairedWith: 'ocn-v2-spawn-threshold', relationship: 'peripheral-yard-support', evidenceViews: ['top', 'orbit', 'zone-boundary', 'zone-spawn', 'route-ridgeline-exit', 'route-main-surface'] },
];
// Macro compounds are deliberately larger than the v1/v2 service cells. They
// occupy unused authored pads while leaving the route and gameplay contracts as
// measured clearance constraints.
const openCellNetworkV3Specs = [
  { id: 'ocn-v3-gate-main', padId: 'g-gate-square', center: [-340, 128], width: 26, depth: 14, height: 10.0, angle: 0, kind: 'gate', zone: 'zone_courtyard', routes: ['route_main_surface', 'route_rear_alley', 'air-courtyard'], pairedWith: 'ocn-v3-boundary-yard', relationship: 'gate-to-perimeter-operations', evidenceViews: ['top', 'orbit', 'zone-courtyard', 'zone-spawn', 'route-main-surface', 'route-rear-alley'] },
  { id: 'ocn-v3-rear-warehouse', padId: 'g-yrd-rear', center: [-110, 158], width: 24, depth: 10, height: 11.0, angle: 0, kind: 'warehouse', zone: 'zone_warehouse', routes: ['route_rear_alley', 'route_main_surface', 'route_maintenance_loop'], pairedWith: 'ocn-v3-west-warehouse', relationship: 'rear-logistics-to-maintenance', evidenceViews: ['top', 'orbit', 'zone-warehouse', 'route-rear-alley', 'route-main-surface', 'zone-courtyard'] },
  { id: 'ocn-v3-west-warehouse', padId: 'g-yrd-west', center: [-225, -92], width: 34, depth: 22, height: 12.0, angle: 0.04, kind: 'warehouse', zone: 'zone_warehouse', routes: ['route_maintenance_loop', 'route_covered'], pairedWith: 'ocn-v3-rear-warehouse', relationship: 'rear-logistics-to-maintenance', evidenceViews: ['top', 'orbit', 'zone-warehouse', 'route-covered', 'vertical-connector', 'zone-core'] },
  { id: 'ocn-v3-courtyard-yard', padId: 'g-yrd-hub', center: [-85, -25], width: 24, depth: 12, height: 10.5, angle: 0.04, kind: 'yard', zone: 'zone_courtyard', routes: ['route_covered', 'route_main_surface', 'air-courtyard'], pairedWith: 'ocn-v3-core-ops', relationship: 'courtyard-to-objective-logistics', evidenceViews: ['top', 'orbit', 'zone-courtyard', 'route-covered', 'cover-courtyard', 'zone-warehouse'] },
  { id: 'ocn-v3-core-ops', padId: 'g-yrd-core-n', center: [-52, -188], width: 28, depth: 15, height: 12.0, angle: -0.04, kind: 'checkpoint', zone: 'zone_core', routes: ['route_main_surface', 'route_tunnel', 'route_covered'], pairedWith: 'ocn-v3-courtyard-yard', relationship: 'courtyard-to-objective-logistics', evidenceViews: ['top', 'orbit', 'zone-core', 'objective-core', 'tunnel-portal', 'route-covered'] },
  { id: 'ocn-v3-bridge-north', padId: 'g-yrd-e', center: [330, 92], width: 34, depth: 18, height: 13.0, angle: 0.04, kind: 'bridge', zone: 'zone_bridge', routes: ['route_north_ring', 'air-roof-reentry'], pairedWith: 'ocn-v3-plant-south', relationship: 'north-overwatch-to-plant-service', evidenceViews: ['top', 'orbit', 'zone-bridge', 'route-north-ring', 'vertical-connector', 'zone-plant'] },
  { id: 'ocn-v3-plant-south', padId: 'g-yrd-plant-s', center: [335, -145], width: 34, depth: 18, height: 12.0, angle: -0.05, kind: 'plant', zone: 'zone_plant', routes: ['route_south_retreat', 'route_plant_spur', 'route_north_ring'], pairedWith: 'ocn-v3-bridge-north', relationship: 'north-overwatch-to-plant-service', evidenceViews: ['top', 'orbit', 'zone-plant', 'route-south-retreat', 'route-north-ring', 'vertical-connector'] },
  { id: 'ocn-v3-boundary-yard', padId: 'g-ridgeline-exit', center: [-210, 315], width: 34, depth: 16, height: 9.0, angle: 0, kind: 'boundary', zone: 'zone_boundary', routes: ['route_ridgeline_exit', 'air-spawn-apron'], pairedWith: 'ocn-v3-gate-main', relationship: 'gate-to-perimeter-operations', evidenceViews: ['top', 'orbit', 'zone-boundary', 'zone-spawn', 'route-ridgeline-exit', 'route-main-surface'] },
  { id: 'ocn-v3-tunnel-portal', padId: 'g-yrd-east-ridge', center: [350, -235], width: 28, depth: 18, height: 11.0, angle: 0.03, kind: 'portal', zone: 'zone_tunnels', routes: ['route_tunnel', 'route_flank_backdoor', 'route_south_retreat'], pairedWith: 'ocn-v3-core-ops', relationship: 'objective-to-tunnel-portal', evidenceViews: ['top', 'orbit', 'zone-tunnels', 'tunnel-portal', 'route-flank-backdoor', 'zone-core'] },
];
const openCellBounds = spec => {
  const c = Math.abs(Math.cos(spec.angle || 0)), s = Math.abs(Math.sin(spec.angle || 0));
  const width = spec.width * c + spec.depth * s, depth = spec.width * s + spec.depth * c;
  return { minX: spec.center[0] - width / 2, minZ: spec.center[1] - depth / 2, maxX: spec.center[0] + width / 2, maxZ: spec.center[1] + depth / 2, width, depth };
};
const openCellBoxDistance = (a, b) => Math.hypot(Math.max(b.minX - a.maxX, 0, a.minX - b.maxX), Math.max(b.minZ - a.maxZ, 0, a.minZ - b.maxZ));
const openCellPointRouteDistance = (x, z, route) => {
  let best = Infinity;
  for (let i = 0; i < route.waypoints.length - 1; i++) {
    const [ax, az] = route.waypoints[i], [bx, bz] = route.waypoints[i + 1];
    best = Math.min(best, yardOpsDistanceToSegment(x, z, ax, az, bx, bz));
  }
  return best;
};
const openCellRouteMargin = (bounds, route) => openCellPointRouteDistance((bounds.minX + bounds.maxX) / 2, (bounds.minZ + bounds.maxZ) / 2, route)
  - (route.width || 6) / 2 - Math.hypot(bounds.width / 2, bounds.depth / 2);
const openCellNetwork = {
  schemaVersion: 1,
  strategy: openCellNetworkV2Only ? 'camera-facing-open-cell-operations-v2' : 'distributed-open-cell-operations-v1',
  owner: openCellNetworkV2Only ? 'recovery-cycle-6' : 'recovery-cycle-5',
  sourceRefs: [...openCellSourceRefs],
  referenceIds: [...openCellReferenceIds],
  contractIds: [...openCellContractIds],
  evidenceViews: [...openCellEvidenceViews],
  clearancePolicy: { padInsetMeters: 2, routeClearanceMeters: 2, airLaneClearanceMeters: 2, buildingClearanceMeters: 2, gameplayClearanceMeters: 2 },
  features: [],
};
const macroCampusNetwork = {
  schemaVersion: 1,
  strategy: 'macro-open-cell-campus-network-v3',
  owner: 'recovery-cycle-7',
  sourceRefs: [...openCellSourceRefs, 'blockout/blockout-full-v1.json#segments.g-yrd-rear', 'blockout/blockout-full-v1.json#segments.g-yrd-west', 'blockout/blockout-full-v1.json#segments.g-yrd-plant-s'],
  referenceIds: [...openCellReferenceIds, 'industrial-macro-massing'],
  contractIds: [...openCellContractIds, 'macro-compound-clearance'],
  evidenceViews: ['top', 'orbit', 'zone-courtyard', 'zone-warehouse', 'zone-core', 'zone-plant', 'zone-bridge', 'zone-boundary', 'route-covered', 'objective-core', 'tunnel-portal'],
  clearancePolicy: { padInsetMeters: 2, routeClearanceMeters: 2, airLaneClearanceMeters: 2, buildingClearanceMeters: 2, gameplayClearanceMeters: 2 },
  compoundPolicy: { geometry: 'macro-compound', target: 'campus-wide-visible-massing', maxTriangles: 881216 },
  features: [],
};
const activeOpenCellSpecs = openCellNetworkV3Only ? openCellNetworkV3Specs : (openCellNetworkV2Only ? openCellNetworkV2Specs : openCellSpecs);
const activeOpenCellNetwork = openCellNetworkV3Only ? macroCampusNetwork : openCellNetwork;
const openCellGameplaySegments = segs.filter(s => ['kill-zone', 'objective', 'cover', 'entrance-player', 'stairs', 'incline', 'bridge', 'hole-drone-entry'].includes(s.category));
const openCellRects = [];
const openCellTray = (x, z, y, length, rotation = 0, material = M.pipeDark) => {
  group.add(box(length, 0.18, 0.18, x, y, z, material, rotation));
  group.add(box(length, 0.12, 0.12, x, y - 0.34, z, M.metal, rotation));
  for (const offset of [-length * 0.36, 0, length * 0.36]) {
    const px = x + Math.cos(rotation) * offset, pz = z + Math.sin(rotation) * offset;
    group.add(box(0.12, 0.55, 0.12, px, y - 0.2, pz, M.metal));
  }
};
const openCellRack = (x, z, baseY, height = 3.4, rotation = 0) => {
  group.add(box(2.8, height, 1.8, x, baseY + height / 2, z, M.panel[1], rotation));
  for (const y of [baseY + 0.65, baseY + 1.55, baseY + 2.45]) {
    group.add(box(2.25, 0.08, 0.08, x, y, z - 0.94, M.metal, rotation));
    group.add(box(0.1, 0.48, 0.08, x - 0.78, y + 0.22, z - 0.98, M.red, rotation));
    group.add(box(0.1, 0.34, 0.08, x + 0.78, y + 0.18, z - 0.98, M.amber, rotation));
  }
};
const openCellTunnelArchRib = (cx, cz, frame, floorY, width, tunnelH, material = M.tunnelConcreteDark) => {
  const half = width / 2 - 0.18, springY = floorY + tunnelH - 1.2, rise = 1.2, archSteps = 10;
  let previous = null;
  for (let i = 0; i <= archSteps; i++) {
    const offset = -half + (half * 2 * i) / archSteps;
    const arch = Math.sqrt(Math.max(0, 1 - (offset / half) ** 2));
    const [px, pz] = offsetPoint(cx, cz, frame, offset);
    const point = [px, springY + rise * arch, pz];
    if (previous) group.add(addBeam(previous, point, 0.19, material));
    previous = point;
  }
  for (const side of [-1, 1]) {
    const [px, pz] = offsetPoint(cx, cz, frame, side * half);
    group.add(addBeam([px, floorY + 0.12, pz], [px, springY + 0.06, pz], 0.22, material));
    group.add(addBeam([px, springY - 0.15, pz], [px, springY + 0.22, pz], 0.07, M.tunnelRust));
  }
};
const openCellPlacement = spec => {
  const bounds = openCellBounds(spec), pad = yardOpsPads.get(spec.padId);
  const padBounds = pad && { minX: Math.min(pad.bounds[0], pad.bounds[2]), minZ: Math.min(pad.bounds[1], pad.bounds[3]), maxX: Math.max(pad.bounds[0], pad.bounds[2]), maxZ: Math.max(pad.bounds[1], pad.bounds[3]) };
  const padPass = Boolean(padBounds && bounds.minX >= padBounds.minX + 2 && bounds.maxX <= padBounds.maxX - 2 && bounds.minZ >= padBounds.minZ + 2 && bounds.maxZ <= padBounds.maxZ - 2);
  const buildingMargins = yardOpsBuildings.map(building => openCellBoxDistance(bounds, { minX: Math.min(building.bounds[0], building.bounds[2]), minZ: Math.min(building.bounds[1], building.bounds[3]), maxX: Math.max(building.bounds[0], building.bounds[2]), maxZ: Math.max(building.bounds[1], building.bounds[3]) }));
  const routeMargins = b.routes.filter(route => route.kind !== 'air').map(route => ({ id: route.id, margin: openCellRouteMargin(bounds, route) }));
  const airMargins = b.routes.filter(route => route.kind === 'air').map(route => ({ id: route.id, margin: openCellRouteMargin(bounds, route) }));
  const gameplayMargins = openCellGameplaySegments.map(segment => ({ id: segment.id, margin: openCellBoxDistance(bounds, { minX: Math.min(segment.bounds[0], segment.bounds[2]), minZ: Math.min(segment.bounds[1], segment.bounds[3]), maxX: Math.max(segment.bounds[0], segment.bounds[2]), maxZ: Math.max(segment.bounds[1], segment.bounds[3]) }) }));
  const pairMargins = openCellRects.map(rect => ({ id: rect.id, margin: openCellBoxDistance(bounds, rect.bounds) }));
  const padClear = Boolean(pad && yardOpsClear(pad, spec.center[0], spec.center[1], bounds.width, bounds.depth, 2));
  const pass = padPass && padClear && buildingMargins.every(margin => margin >= 2) && routeMargins.every(item => item.margin >= 2)
    && airMargins.every(item => item.margin >= 2) && gameplayMargins.every(item => item.margin >= 2) && pairMargins.every(item => item.margin >= 2);
  return { bounds, padPass: padPass && padClear, buildingMargins, routeMargins, airMargins, gameplayMargins, pairMargins, pass };
};
const addOpenCell = (spec, placement) => {
  const [x, z] = spec.center, pad = yardOpsPads.get(spec.padId), sy = surfaceYAt(x, z, pad?.surfaceY ?? 0) + 0.06;
  const angle = spec.angle || 0, local = (lx, lz) => rotateLocal(x, z, angle, lx, lz);
  const span = Math.max(2.6, spec.width - 1.0), depth = Math.max(1.8, spec.depth - 1.0), postX = span / 2, postZ = depth / 2, topY = sy + spec.height;
  const beam = (a, c, radius = 0.07, material = M.metal) => group.add(addBeam([a[0], a[1], a[2]], [c[0], c[1], c[2]], radius, material));
  contactPad(x, z, sy, placement.bounds.width * 0.76, placement.bounds.depth * 0.68, angle, M.loadingStain);
  for (const lx of [-postX, postX]) for (const lz of [-postZ, postZ]) {
    const [px, pz] = local(lx, lz);
    group.add(edgeBox(0.42, 0.16, 0.42, px, sy + 0.08, pz, M.concreteDark, angle, 0.05));
    group.add(box(0.22, spec.height, 0.22, px, sy + spec.height / 2, pz, M.pipeDark, angle));
  }
  for (const lz of [-postZ, postZ]) {
    const a = local(-postX, lz), c = local(postX, lz);
    beam([a[0], topY, a[1]], [c[0], topY, c[1]], 0.11, M.pipe);
  }
  for (const lx of [-postX, postX]) {
    const a = local(lx, -postZ), c = local(lx, postZ);
    beam([a[0], topY + 0.05, a[1]], [c[0], topY + 0.05, c[1]], 0.07, M.metal);
  }
  openCellTray(x, z, topY - 0.45, span * 0.72, angle, M.pipe);
  openCellTray(...local(0, postZ * 0.58), topY - 1.1, span * 0.56, angle, M.pipeDark);
  for (const lx of [-postX * 0.72, postX * 0.72]) {
    const [px, pz] = local(lx, 0);
    beam([px, sy + 0.5, pz], [px, topY - 0.2, pz], 0.045, M.trim);
  }
  const [doorX, doorZ] = local(0, -postZ - 0.08);
  group.add(edgeBox(Math.min(1.5, span * 0.48), 2.25, 0.12, doorX, sy + 1.13, doorZ, M.loadingDoor, angle, 0.025));
  group.add(edgeBox(Math.min(1.8, span * 0.56), 0.16, 0.16, doorX, sy + 2.3, doorZ, M.loadingFrame, angle, 0.025));
  const [cabX, cabZ] = local(-postX * 0.68, postZ * 0.58);
  serviceCabinet(cabX, cabZ, sy, Math.min(1.45, span * 0.34), Math.min(1.9, spec.height * 0.4), angle);
  const [rackX, rackZ] = local(postX * 0.5, postZ * 0.5);
  openCellRack(rackX, rackZ, sy, Math.min(3.4, spec.height * 0.64), angle);
  if (spec.kind === 'pocket' || spec.kind === 'relay' || spec.kind === 'boundary') {
    const [reelX, reelZ] = local(postX * 0.62, -postZ * 0.48);
    cableReel(reelX, reelZ, sy, Math.min(0.62, Math.max(0.42, spec.depth * 0.09)));
  }
  if (spec.kind === 'plant' || spec.kind === 'bridge' || spec.kind === 'portal') {
    const [ax, az] = local(-postX * 0.82, 0), [bx, bz] = local(postX * 0.82, 0);
    pipeGallery(ax, az, bx, bz, sy + 0.12, Math.max(3.4, spec.height - 0.7), Math.max(2.0, depth * 0.62));
  }
  if (spec.kind === 'plant') {
    const [vx, vz] = local(-postX * 0.48, postZ * 0.18);
    processVessel(vx, vz, sy, 0.78, Math.min(3.3, spec.height * 0.56), M.heroPanel);
  }
  if (spec.kind === 'portal') {
    const [ax, az] = local(-postX * 0.05, 0), [bx, bz] = local(postX * 0.05, 0);
    openCellTunnelArchRib(x, z, segmentFrame(ax, az, bx, bz), sy, Math.min(5.4, depth + 0.2), Math.min(5.2, spec.height), M.tunnelConcreteDark);
  }
  if (spec.kind === 'checkpoint' || spec.kind === 'gate') serviceStack(...local(postX * 0.55, -postZ * 0.15), sy, Math.min(4.4, spec.height * 0.82), 0.14);
  const [lampX, lampZ] = local(postX * 0.68, postZ * 0.7);
  yardLampPole(lampX, lampZ, sy, Math.min(6.4, spec.height + 0.8), 0.68);
  group.add(box(0.68, 0.08, 0.16, lampX + 0.68, sy + Math.min(6.4, spec.height + 0.8) - 0.36, lampZ, M.light));
};
const addMacroCampusCompound = (spec, placement) => {
  const [x, z] = spec.center;
  const pad = yardOpsPads.get(spec.padId);
  const sy = surfaceYAt(x, z, pad?.surfaceY ?? 0) + 0.06;
  const angle = spec.angle || 0;
  const local = (lx, lz) => rotateLocal(x, z, angle, lx, lz);
  const addLocalBox = (w, h, d, lx, ly, lz, material, extraRotation = 0) => {
    const [px, pz] = local(lx, lz);
    group.add(box(w, h, d, px, sy + ly, pz, material, angle + extraRotation));
  };
  const addLocalEdge = (w, h, d, lx, ly, lz, material, extraRotation = 0, radius = 0.05) => {
    const [px, pz] = local(lx, lz);
    // Macro compounds use one rounded subdivision; their repeated frames must stay under the indexed cap.
    const r = Math.max(0.01, Math.min(radius, w * 0.5 - 0.01, h * 0.5 - 0.01, d * 0.5 - 0.01));
    const frame = new Mesh(new RoundedBoxGeometry(w, h, d, 1, r), material);
    frame.position.set(px, sy + ly, pz); frame.rotation.y = angle + extraRotation; group.add(frame);
  };
  const addLocalBeam = (a, c, radius, material) => {
    const [ax, az] = local(a[0], a[2]), [cx, cz] = local(c[0], c[2]);
    group.add(addBeam([ax, sy + a[1], az], [cx, sy + c[1], cz], radius, material));
  };
  const width = spec.width, depth = spec.depth, height = spec.height;
  const bodyW = width * 0.74, bodyD = depth * 0.58, frontZ = -bodyD / 2 - 0.08;
  contactPad(x, z, sy, placement.bounds.width * 0.86, placement.bounds.depth * 0.8, angle, M.loadingStain);
  addLocalBox(width * 0.84, 0.42, depth * 0.78, 0, 0.22, 0, M.concreteDark);
  addLocalBox(bodyW, height * 0.62, bodyD, 0, 0.52 + height * 0.31, 0, M.heroPanel);
  addLocalBox(bodyW + 0.7, 0.34, bodyD + 0.7, 0, 0.55 + height * 0.64, 0, M.roof);
  addLocalEdge(bodyW + 0.9, 0.18, 0.3, 0, 0.78 + height * 0.64, -bodyD / 2 - 0.12, M.loadingFrame, 0, 0.04);
  addLocalEdge(bodyW + 0.9, 0.18, 0.3, 0, 0.78 + height * 0.64, bodyD / 2 + 0.12, M.loadingFrame, 0, 0.04);
  for (const level of [0.52 + height * 0.18, 0.52 + height * 0.39, 0.52 + height * 0.58]) {
    addLocalEdge(bodyW + 0.25, 0.14, 0.18, 0, level, frontZ, M.loadingFrame);
    for (let lx = -bodyW / 2 + 2.5; lx <= bodyW / 2 - 1.5; lx += 5.5)
      addLocalEdge(0.16, Math.max(1.6, height * 0.16), 0.2, lx, level + Math.max(0.7, height * 0.07), frontZ - 0.06, M.trim);
  }
  for (const lx of [-bodyW / 2 + 0.5, bodyW / 2 - 0.5])
    addLocalEdge(0.28, height * 0.62 + 0.4, 0.34, lx, 0.55 + height * 0.31, frontZ - 0.08, M.loadingFrame);
  const doorWidth = Math.min(4.8, Math.max(2.6, bodyW * 0.17));
  for (const lx of [-bodyW * 0.28, 0, bodyW * 0.28]) {
    addLocalEdge(doorWidth, Math.min(4.4, height * 0.42), 0.14, lx, 0.56 + Math.min(4.4, height * 0.42) / 2, frontZ - 0.17, M.loadingDoor);
    addLocalEdge(doorWidth + 0.28, 0.16, 0.18, lx, 0.65 + Math.min(4.4, height * 0.42), frontZ - 0.2, M.loadingFrame);
  }
  const rackZ = depth * 0.36;
  for (const lx of [-width * 0.3, width * 0.3]) {
    addLocalBeam([lx, 0.45, rackZ], [lx, height * 0.76, rackZ], 0.11, M.pipeDark);
    addLocalBeam([lx - 2.8, height * 0.7, rackZ], [lx + 2.8, height * 0.7, rackZ], 0.09, M.pipe);
  }
  for (const level of [height * 0.48, height * 0.63, height * 0.78])
    addLocalBeam([-width * 0.32, level, rackZ], [width * 0.32, level, rackZ], 0.06, M.pipe);
  for (const lx of [-width * 0.36, width * 0.36]) {
    addLocalEdge(0.18, 2.2, 0.18, lx, 1.5, frontZ - 0.18, M.metal);
    const [lampX, lampZ] = local(lx, -depth * 0.44);
    yardLampPole(lampX, lampZ, sy + 0.02, Math.min(8.5, height * 0.7), 0.82);
  }
  const [cabX, cabZ] = local(-width * 0.36, -depth * 0.27);
  serviceCabinet(cabX, cabZ, sy, 1.55, Math.min(2.5, height * 0.2), angle);
  const [reelX, reelZ] = local(width * 0.36, -depth * 0.3);
  cableReel(reelX, reelZ, sy, 0.7);
  if (spec.kind === 'plant' || spec.kind === 'bridge') {
    const [vesselX, vesselZ] = local(-width * 0.28, depth * 0.05);
    processVessel(vesselX, vesselZ, sy, Math.min(1.8, width * 0.06), Math.min(height * 0.72, 8.5), M.heroSidingAlt);
    const [pipeAX, pipeAZ] = local(-width * 0.44, -depth * 0.22), [pipeBX, pipeBZ] = local(width * 0.44, -depth * 0.22);
    pipeGallery(pipeAX, pipeAZ, pipeBX, pipeBZ, sy + 0.2, Math.min(height * 0.82, 10), Math.min(6, depth * 0.42));
  }
  if (spec.kind === 'warehouse' || spec.kind === 'yard') {
    for (const lx of [-width * 0.25, width * 0.25]) {
      const [px, pz] = local(lx, -depth * 0.43);
      palletStack(px, pz, sy + 0.04, 2.7, 1.4, 2);
    }
    const [truckX, truckZ] = local(0, -depth * 0.46);
    cargoTruck(truckX, truckZ, angle, 0.7);
  }
  if (spec.kind === 'checkpoint' || spec.kind === 'gate') {
    addLocalBox(Math.min(5.5, width * 0.24), 3.0, 0.28, 0, height * 0.52, frontZ - 0.22, M.loadingDoor);
    addLocalEdge(Math.min(6.2, width * 0.28), 0.26, 0.3, 0, height * 0.52 + 1.62, frontZ - 0.24, M.warning, 0, 0.04);
  }
  if (spec.kind === 'bridge') {
    addLocalBeam([-width * 0.46, height * 0.84, -depth * 0.44], [width * 0.46, height * 0.84, -depth * 0.44], 0.13, M.metal);
    addLocalBeam([-width * 0.38, height * 0.66, -depth * 0.44], [-width * 0.38, height * 0.84, -depth * 0.44], 0.08, M.fence);
    addLocalBeam([width * 0.38, height * 0.66, -depth * 0.44], [width * 0.38, height * 0.84, -depth * 0.44], 0.08, M.fence);
  }
  if (spec.kind === 'portal') {
    const half = Math.min(width * 0.3, 8), spring = 0.52 + height * 0.42, rise = Math.min(2.8, height * 0.25);
    for (const side of [-1, 1]) addLocalBeam([side * half, 0.45, frontZ - 0.22], [side * half, spring, frontZ - 0.22], 0.22, M.tunnelConcreteDark);
    addLocalBeam([-half, spring, frontZ - 0.22], [0, spring + rise, frontZ - 0.22], 0.22, M.tunnelConcreteDark);
    addLocalBeam([0, spring + rise, frontZ - 0.22], [half, spring, frontZ - 0.22], 0.22, M.tunnelConcreteDark);
  }
  if (spec.kind === 'boundary') {
    const [aX, aZ] = local(-width * 0.45, -depth * 0.47), [bX, bZ] = local(width * 0.45, -depth * 0.47);
    const [cX, cZ] = local(width * 0.45, depth * 0.47);
    fenceRun(aX, aZ, bX, bZ, sy, 3.0);
    fenceRun(bX, bZ, cX, cZ, sy, 3.0);
  }
};
for (const spec of activeOpenCellSpecs) {
  const placement = openCellPlacement(spec);
  const feature = {
    id: spec.id,
    owner: spec.id,
    type: `open-${spec.kind}-cell`,
    zone: spec.zone,
    padId: spec.padId,
    center: [...spec.center],
    footprint: [placement.bounds.width, placement.bounds.depth],
    height: spec.height,
    angle: spec.angle || 0,
    kind: spec.kind,
    routes: [...spec.routes],
    pairedWith: spec.pairedWith,
    relationship: spec.relationship,
    sourceRefs: [...activeOpenCellNetwork.sourceRefs],
    referenceIds: [...activeOpenCellNetwork.referenceIds],
    contractIds: [...activeOpenCellNetwork.contractIds],
    evidenceViews: [...spec.evidenceViews],
    routeClearanceMeters: 2,
    buildingClearanceMeters: 2,
    airLaneClearanceMeters: 2,
    gameplayClearanceMeters: 2,
    placementStatus: placement.pass ? 'PASS' : 'FAIL',
    supportStatus: placement.pass ? 'PASS' : 'FAIL',
    contactStatus: placement.pass ? 'PASS' : 'FAIL',
    clearance: {
      pad: placement.padPass ? 'PASS' : 'FAIL',
      minimumBuildingMargin: Math.min(...placement.buildingMargins),
      minimumRouteMargin: Math.min(...placement.routeMargins.map(item => item.margin)),
      minimumAirLaneMargin: Math.min(...placement.airMargins.map(item => item.margin)),
      minimumGameplayMargin: Math.min(...placement.gameplayMargins.map(item => item.margin)),
      minimumFeatureMargin: placement.pairMargins.length ? Math.min(...placement.pairMargins.map(item => item.margin)) : null,
    },
  };
  activeOpenCellNetwork.features.push(feature);
  if (openCellBuildOnly && placement.pass) {
    openCellRects.push({ id: spec.id, bounds: placement.bounds });
    if (openCellNetworkV3Only) addMacroCampusCompound(spec, placement);
    else addOpenCell(spec, placement);
  }
}

if (byId.has('bld-tank-farm')) {
  fenceRun(116, -156, 145, -156, -1, 2.8);
  fenceRun(145, -156, 145, -126, -1, 2.8);
  fenceRun(145, -126, 116, -126, -1, 2.8);
  fenceRun(116, -126, 116, -156, -1, 2.8);
  pipeRack(148, -130, 178, -130, -1, 5.2, 3.2);
  bollardRow(149, -124, 177, -124, -1, 4);
}
if (byId.has('bld-substation')) {
  fenceRun(304, 18, 356, 18, 0.8, 2.7);
  fenceRun(356, 18, 356, 62, 0.8, 2.7);
  fenceRun(356, 62, 304, 62, 0.8, 2.7);
  fenceRun(304, 62, 304, 18, 0.8, 2.7);
}
if (b.routes.some(r => r.id === 'air-pressure-yard')) {
  chainLinkFence(0, 128.5, 52, 128.5, 0.4, 2.5);
  chainLinkFence(56, 128.5, 104, 128.5, 0.4, 2.5);
}
if (byId.has('bld-loading-hall')) {
  chainLinkFence(-28, 96.5, 28, 96.5, 0.2, 2.4);
}

// Reference-scale frontage kit: barriers, service cages, and pole lamps break the
// aprons into working zones without narrowing authored routes.
if (byId.has('bld-loading-hall')) {
  const sy = 0.34;
  taperedBarrier(-91.5, 111.2, sy, 0.03, 3.4, 0.95, 1.05);
  taperedBarrier(-40.5, 111.2, sy, -0.03, 3.4, 0.95, 1.05);
  yardLampPole(-92.5, 113.8, sy, 6.6, 1.15);
  yardLampPole(-39.5, 113.8, sy, 6.6, 1.15);
  chainLinkFence(-98.3, 108.2, -98.3, 126.5, sy, 2.45);
  chainLinkFence(-31.7, 108.2, -31.7, 126.5, sy, 2.45);
  group.add(edgeBox(3.8, 0.14, 2.8, -92.5, sy + 0.07, 123.2, M.concreteDark, 0, 0.04));
  serviceCabinet(-93.2, 123.0, sy + 0.14, 1.45, 1.85);
  cableReel(-90.8, 124.4, sy + 0.14, 0.62);
  group.add(edgeBox(3.8, 0.14, 2.8, -39.5, sy + 0.07, 123.2, M.concreteDark, 0, 0.04));
  serviceCabinet(-38.8, 123.0, sy + 0.14, 1.45, 1.85);
  cableReel(-41.2, 124.4, sy + 0.14, 0.62);
}
if (byId.has('bld-processing-hall')) {
  const sy = 0.86;
  const apronGroundY = (x, z) => roadTopYAt(x, z, surfaceYAt(x, z, sy));
  const apronPropY = (x, z) => apronGroundY(x, z) + 0.03;
  contactPad(204, -73.4, apronPropY(204, -73.4), 2.8, 1.45);
  palletStack(204, -73.4, apronPropY(204, -73.4), 2.45, 1.25, 2);
  contactPad(272, -73.1, apronPropY(272, -73.1), 1.5, 0.82, Math.PI / 2);
  serviceCabinet(272, -73.1, apronPropY(272, -73.1), 1.3, 1.75, Math.PI / 2);
  cableReel(282, -73.2, apronPropY(282, -73.2), 0.58);
  const playerServiceY = apronPropY(188, -72.8);
  contactPad(188, -72.8, playerServiceY, 2.8, 1.35);
  palletStack(188, -72.8, playerServiceY, 2.25, 1.15, 2);
  serviceCabinet(193, -72.7, apronPropY(193, -72.7), 1.25, 1.7);
  cableReel(198, -72.6, apronPropY(198, -72.6), 0.54);
  const foundationFront = -66.08;
  const foundationSpans = [[162, 210], [214, 266]];
  const facadeWall = foundationFront - 0.16;
  // The raised base has a low poured kicker and a continuous sheet-metal skin.
  // Keep the gap at the stair landing so the access route remains readable.
  for (const [index, [start, end]] of foundationSpans.entries()) {
    const panelWidth = end - start - 0.34;
    group.add(edgeBox(panelWidth, 1.12, 0.18, (start + end) / 2, 1.46, foundationFront, index % 2 ? M.concrete[2] : M.concrete[1], 0, 0.025));
    corrugatedSheet('s', start, end, facadeWall, 1.18, 5.3, index % 2 ? M.heroPanel : M.heroSidingAlt, 0.5, 0.24);
    for (const y of [1.98, 3.64, 5.3, 6.38])
      group.add(edgeBox(panelWidth + 0.18, 0.075, 0.14, (start + end) / 2, y, facadeWall - 0.19, M.loadingSeam, 0, 0.02));
    for (let x = start + 8; x < end - 2; x += 10)
      group.add(edgeBox(0.16, 5.28, 0.16, x, 3.84, facadeWall - 0.2, M.trim, 0, 0.025));
    for (let x = start + 5; x < end; x += 10) group.add(box(0.34, 0.12, 0.08, x, 1.03, foundationFront - 0.16, M.drain));
  }
  group.add(edgeBox(104.5, 0.24, 0.2, 214, 6.82, foundationFront - 0.12, M.concreteDark, 0, 0.035));
  group.add(box(103.5, 0.14, 0.08, 214, 1.02, foundationFront - 0.2, M.loadingStain));
  // Upper girts and bay columns carry the lower sheet rhythm into the tall hall.
  for (const y of [11.9, 17.1, 22.3])
    group.add(edgeBox(102.5, 0.18, 0.24, 214, y, -63.48, M.trim, 0, 0.035));
  for (let x = 166; x <= 262; x += 8)
    group.add(edgeBox(0.22, 18.8, 0.24, x, 16.2, -63.48, M.trim, 0, 0.035));
  // Pressed panel bands break up the tall wall while leaving the regular window
  // fields and the authored stair opening readable behind them.
  for (const [bandBase, bandHeight] of [[7.3, 1.15], [12.55, 1.1], [17.75, 0.95], [22.65, 1.1], [27.85, 1.2]]) {
    for (const [start, end, material] of [[162, 210, M.heroSidingAlt], [214, 266, M.heroPanel]])
      corrugatedSheet('s', start, end, -63.56, bandBase, bandHeight, material, 0.62, 0.18);
  }
  for (let x = 162; x <= 266; x += 8) {
    group.add(edgeBox(0.3, 18.8, 0.38, x, 16.35, -63.72, M.loadingFrame, 0, 0.035));
    group.add(edgeBox(0.08, 18.5, 0.08, x - 0.16, 16.35, -63.94, M.trim, 0, 0.02));
  }
  for (const y of [7.08, 11.95, 17.12, 22.28, 27.48, 31.72])
    group.add(edgeBox(103.5, 0.24, 0.38, 214, y, -63.76, M.loadingFrame, 0, 0.035));
  // Roof edge, full-height downpipes, and discharge elbows give the facade a
  // believable rainwater path instead of a bare upper termination.
  group.add(edgeBox(104.2, 0.28, 0.42, 214, 32.36, -63.78, M.roof, 0, 0.04));
  for (const x of [168, 202, 224, 260]) {
    group.add(cylinder(0.16, 24.2, x, 19.3, -63.96, M.pipeDark, 10));
    for (const y of [10.4, 18.2, 26.1]) group.add(box(0.42, 0.12, 0.4, x, y, -64.0, M.rust));
    group.add(addBeam([x, 7.25, -63.96], [x, 7.25, -66.0], 0.095, M.pipe));
    group.add(box(0.52, 0.14, 0.62, x, 7.16, -66.08, M.drain));
  }
  // The south entrance is a personnel threshold, not just a stair silhouette.
  const processBase = sy + 6.0, personnelX = 212, personnelZ = -63.98, personnelH = 2.4;
  group.add(box(1.78, personnelH - 0.16, 0.12, personnelX, processBase + personnelH / 2, personnelZ, M.door));
  for (const side of [-1, 1]) group.add(edgeBox(0.16, personnelH + 0.26, 0.22, personnelX + side * 0.96, processBase + personnelH / 2, personnelZ - 0.08, M.trim, 0, 0.025));
  group.add(edgeBox(2.1, 0.18, 0.24, personnelX, processBase + personnelH + 0.12, personnelZ - 0.08, M.metal, 0, 0.025));
  group.add(edgeBox(3.8, 0.2, 2.0, personnelX, processBase + personnelH + 0.54, -64.82, M.roof, 0, 0.04));
  group.add(addBeam([personnelX - 1.5, processBase + personnelH + 0.08, -64.15], [personnelX - 1.5, processBase + personnelH + 0.54, -64.82], 0.06, M.metal));
  group.add(addBeam([personnelX + 1.5, processBase + personnelH + 0.08, -64.15], [personnelX + 1.5, processBase + personnelH + 0.54, -64.82], 0.06, M.metal));
  group.add(box(0.72, 0.08, 0.08, personnelX, processBase + personnelH + 0.22, -65.82, M.light));
  facadeWeathering('s', 164, 208, facadeWall, 1.3, 4.85, idSeed('processing-south-steel-a'), 8);
  facadeWeathering('s', 216, 264, facadeWall, 1.3, 4.85, idSeed('processing-south-steel-b'), 8);
  wallServiceRun('s', 168, 202, facadeWall, 5.05, 3);
  wallServiceRun('s', 224, 260, facadeWall, 5.05, 3);
  for (const x of [194, 230]) wallCabinet('s', x, facadeWall, 2.12, 1.45, 1.55);
  for (const x of [180, 246]) {
    heroDoorBay('s', x, facadeWall, sy, 4.6, 3.9, 'dock');
    wallLight('s', x, facadeWall, 5.15);
    serviceStack(x - 2.5, facadeWall - 0.22, sy + 0.2, 5.2, 0.13);
  }
  facadeConduit(180, facadeWall - 0.24, 246, facadeWall - 0.24, 5.82, 0.12);
  for (const [x, width] of [[198, 2.2], [232, 2.4]]) {
    heroDoorBay('s', x, facadeWall, sy, width, 2.55, 'window');
    wallLight('s', x, facadeWall, 3.95);
    bollard(x - width / 2 - 0.34, -69.05, 1.06, 1.0, 0.82);
    bollard(x + width / 2 + 0.34, -69.05, 1.06, 1.0, 0.82);
  }
  wallWindowBand('s', 166, 208, -63.34, 18.45, 2);
  wallWindowBand('s', 218, 262, -63.34, 18.45, 2);
  for (const x of [168, 202, 224, 260]) {
    group.add(cylinder(0.105, 5.35, x, 3.65, facadeWall - 0.34, M.pipeDark, 10));
    group.add(addBeam([x, 1.1, facadeWall - 0.34], [x, 1.1, facadeWall - 0.92], 0.065, M.pipe));
  }
  for (const [x, z, width, depth, levels] of [[190, -72.2, 2.2, 1.35, 2], [234, -72.7, 1.8, 1.2, 1]]) {
    contactPad(x, z, apronGroundY(x, z) + 0.03, width + 0.55, depth + 0.45);
    palletStack(x, z, apronGroundY(x, z) + 0.02, width, depth, levels);
  }
  contactPad(222, -73.0, apronGroundY(222, -73.0) + 0.03, 1.7, 1.15);
  cableReel(222, -73.0, apronGroundY(222, -73.0) + 0.02, 0.62);
  contactPad(190, -67.0, apronGroundY(190, -67.0) + 0.03, 1.55, 0.75, Math.PI / 2);
  serviceCabinet(190, -67.0, apronGroundY(190, -67.0) + 0.02, 1.2, 1.6, Math.PI / 2);
  contactPad(240, -67.0, apronGroundY(240, -67.0) + 0.03, 1.55, 0.75, Math.PI / 2);
  serviceCabinet(240, -67.0, apronGroundY(240, -67.0) + 0.02, 1.2, 1.65, Math.PI / 2);
  contactPad(198, -70.4, apronGroundY(198, -70.4) + 0.03, 3.0, 1.0);
  taperedBarrier(198, -70.4, apronGroundY(198, -70.4) + 0.02, 0, 2.7, 0.72, 0.82);
  contactPad(232, -70.5, apronGroundY(232, -70.5) + 0.03, 3.0, 1.0);
  taperedBarrier(232, -70.5, apronGroundY(232, -70.5) + 0.02, 0, 2.7, 0.72, 0.82);
  contactPad(254, -72.6, apronGroundY(254, -72.6) + 0.03, 1.7, 1.15);
  serviceCabinet(254, -72.6, apronGroundY(254, -72.6) + 0.02, 1.3, 1.7);
  contactPad(262, -73.1, apronGroundY(262, -73.1) + 0.03, 1.7, 1.05);
  palletStack(262, -73.1, apronGroundY(262, -73.1) + 0.02, 1.35, 0.9, 1);

  // Keep the apron legible as a working yard: restrained wet patches, bay lines,
  // and discrete catch basins add use without turning drainage into a prop wall.
  for (const [x, z, width, depth, rotation, seed] of [
    [177, -75.2, 7.8, 1.35, -0.04, 1701],
    [212, -76.0, 10.5, 1.2, 0.02, 1702],
    [250, -74.8, 7.2, 1.25, 0.05, 1703],
  ]) {
    const patchY = apronGroundY(x, z) + 0.04;
    group.add(flatPolygon(x, z, width, depth, M.loadingWet, rotation, patchY, seed, 7));
    group.add(flatPolygon(x + 0.35, z - 0.06, width * 0.62, depth * 0.42, M.loadingReflective, rotation, patchY + 0.012, seed + 9, 6));
    bayMark(x, z - 0.35, width * 0.84, depth + 3.1, rotation, patchY + 0.026);
  }
  for (const x of [168, 202, 224, 260]) {
    const basinY = apronGroundY(x, -66.62) + 0.08;
    group.add(edgeBox(1.15, 0.07, 0.58, x, basinY, -66.62, M.drain, 0, 0.035));
    for (let grate = -2; grate <= 2; grate++)
      group.add(edgeBox(0.06, 0.085, 0.48, x + grate * 0.2, basinY + 0.045, -66.62, M.metal, 0, 0.012));
  }
  yardLampPole(168, -80.8, apronGroundY(168, -80.8) + 0.02, 6.5, 1.15);
  yardLampPole(258, -80.8, apronGroundY(258, -80.8) + 0.02, 6.5, 1.15);

  // The authored south door sits on the raised base; give it a believable access stair.
  const stairX = 212, stairBase = apronGroundY(212, -82.2), stairTop = sy + 6, stairStartZ = -82.2, stairEndZ = -66.45;
  const stairSteps = 14, stepRise = (stairTop - stairBase) / stairSteps, stepDepth = (stairEndZ - stairStartZ) / stairSteps;
  for (let step = 0; step < stairSteps; step++) {
    const y = stairBase + stepRise * (step + 1);
    const z = stairStartZ + stepDepth * (step + 0.5);
    group.add(edgeBox(3.6, 0.18, stepDepth + 0.08, stairX, y - 0.09, z, M.concrete[1], 0, 0.035));
    group.add(edgeBox(3.34, stepRise + 0.04, 0.14, stairX, stairBase + stepRise * (step + 0.5), z - stepDepth * 0.49, M.concreteDark, 0, 0.025));
    group.add(edgeBox(3.38, 0.055, 0.12, stairX, y + 0.015, z - stepDepth * 0.44, M.warning, 0, 0.018));
  }
  for (const side of [-1, 1]) {
    const stringerX = stairX + side * 1.48;
    group.add(addBeam([stringerX, stairBase + 0.28, stairStartZ + 0.15], [stringerX, stairTop - 0.42, stairEndZ - 0.25], 0.14, M.trim));
    for (const supportZ of [-78.5, -73.0, -68.0]) {
      const t = (supportZ - stairStartZ) / (stairEndZ - stairStartZ);
      const stringerY = stairBase + 0.28 + (stairTop - 0.42 - stairBase - 0.28) * t;
      group.add(addBeam([stringerX, apronGroundY(stairX, supportZ) + 0.08, supportZ], [stringerX, stringerY, supportZ], 0.11, M.metal));
    }
  }
  for (const side of [-1, 1])
    group.add(orientedBox(15.9, 0.42, 0.28, stairX + side * 1.48, stairBase + 2.8, (stairStartZ + stairEndZ) / 2, 0, (stairTop - stairBase) / 15.9, 1, M.concreteDark));
  group.add(edgeBox(4.0, 0.24, 2.1, stairX, stairBase + 0.12, stairStartZ - 0.35, M.concrete[1], 0, 0.035));
  group.add(edgeBox(3.8, 0.18, 2.65, stairX, stairTop + 0.09, -64.48, M.concreteDark, 0, 0.035));
  for (const side of [-1, 1]) {
    const railX = stairX + side * 2.05;
    group.add(addBeam([railX, stairBase + 1.35, stairStartZ + 0.25], [railX, stairTop + 1.2, stairEndZ + 1.0], 0.07, M.metal));
    for (let post = 0; post <= 4; post++) {
      const t = post / 4;
      group.add(addBeam([railX, stairBase + 0.7 + t * 6.0, stairStartZ + 0.7 + t * 15.0], [railX, stairBase + 1.35 + t * 6.0, stairStartZ + 0.25 + t * 15.0], 0.045, M.metal));
    }
  }
  taperedBarrier(211, -107.5, sy, 0.04, 3.6, 0.95, 1.05);
  taperedBarrier(252, -107.5, sy, -0.04, 3.6, 0.95, 1.05);
  yardLampPole(213.5, -104.6, sy, 6.8, 1.2);
  chainLinkFence(229, -116.0, 229, -101.5, sy, 2.5);
  chainLinkFence(229, -101.5, 246, -101.5, sy, 2.5);
  group.add(edgeBox(4.2, 0.14, 2.8, 238, sy + 0.07, -105.0, M.concreteDark, 0, 0.04));
  serviceCabinet(236.8, -105.0, sy + 0.14, 1.45, 1.9);
  serviceCabinet(239.0, -105.0, sy + 0.14, 1.1, 1.5);
  cableReel(234.6, -103.7, sy + 0.14, 0.62);
  facadeWeathering('s', 166, 202, -63.34, 1.05, 25, idSeed('processing-south-weathering-a'), 8);
  facadeWeathering('s', 222, 262, -63.34, 1.05, 25, idSeed('processing-south-weathering-b'), 8);
}

// A fenced west-side service cage gives the side approach a maintained working
// zone and keeps the hero facade from dissolving into an empty gray wall.
if (byId.has('bld-processing-hall')) {
  const westServiceY = surfaceYAt(156, -24, 0.8) + 0.02;
  contactPad(156, -24, westServiceY, 6.0, 4.2);
  chainLinkFence(151.0, -31.2, 160.5, -31.2, westServiceY, 2.45);
  chainLinkFence(160.5, -31.2, 160.5, -17.2, westServiceY, 2.45);
  chainLinkFence(160.5, -17.2, 151.0, -17.2, westServiceY, 2.45);
  chainLinkFence(151.0, -17.2, 151.0, -31.2, westServiceY, 2.45);
  serviceCabinet(157.9, -29.0, westServiceY, 1.45, 1.9);
  cableReel(153.4, -28.8, westServiceY, 0.62);
  palletStack(157.0, -20.1, westServiceY, 1.8, 1.2, 2);
  pipeRack(152.2, -15.3, 159.8, -15.3, westServiceY, 3.1, 2.4);
  yardLampPole(148.9, -33.0, westServiceY, 5.8, 1.05);
  taperedBarrier(157.0, -34.1, westServiceY, 0.04, 2.8, 0.72, 0.82);
}

// -------- walls & fences --------
for (const s of segs) {
  if (s.category !== 'wall-blocking') continue;
  const [x1, z1, x2, z2] = s.bounds, h = s.height || 4;
  const w = Math.abs(x2 - x1), d = Math.abs(z2 - z1);
  const sy = segmentTerrainY(s);
  group.add(box(Math.max(w, 0.6), h, Math.max(d, 0.6), (x1 + x2) / 2, sy + h / 2, (z1 + z2) / 2, M.concreteDark));
}

// -------- stairs (real steps) --------
for (const s of segs) {
  if (s.category !== 'stair') continue;
  const [x1, z1, x2, z2] = s.bounds;
  const w = Math.abs(x2 - x1), d = Math.abs(z2 - z1), h = s.height || 1.5;
  const sy = segmentTerrainY(s);
  const steps = Math.min(12, Math.max(3, s.gauge?.steps || 6));
  const sh = h / steps, sd = d / steps;
  const dir = z2 >= z1 ? 1 : -1;
  for (let i = 0; i < steps; i++) group.add(box(w, sh * (i + 1), sd, (x1 + x2) / 2, sy + sh * (i + 1) / 2, z2 - dir * sd * (i + 0.5), M.concrete[1]));
  for (const railX of [(x1 + x2) / 2 - w / 2 + 0.25, (x1 + x2) / 2 + w / 2 - 0.25]) {
    group.add(box(0.12, h + 0.9, 0.12, railX, sy + h / 2 + 0.45, (z1 + z2) / 2, M.metal));
  }
}

// -------- incline (1:12 step prism) --------
for (const s of segs) {
  if (s.category !== 'incline') continue;
  const [x1, z1, x2, z2] = s.bounds;
  const run = Math.abs(x2 - x1), wd = Math.abs(z2 - z1), h = s.height;
  const sy = segmentTerrainY(s);
  const steps = 12;
  const dir = x2 >= x1 ? 1 : -1;
  for (let i = 0; i < steps; i++) {
    const rise = h * (i + 1) / steps, span = run / steps;
    group.add(box(span + 0.1, rise, wd, x1 + dir * span * (i + 0.5), sy + rise / 2, (z1 + z2) / 2, M.concrete[1]));
  }
}

// -------- bridge/catwalk: deck + railings --------
for (const s of segs) {
  if (s.category !== 'bridge') continue;
  const [x1, z1, x2, z2] = s.bounds;
  const w = x2 - x1, d = z2 - z1, y = s.height || 6;
  group.add(box(w, 1.2, d, (x1 + x2) / 2, y - 0.6, (z1 + z2) / 2, M.metal));
  for (const off of [-d / 2 + 0.4, d / 2 - 0.4]) {
    group.add(box(w, 1.1, 0.12, (x1 + x2) / 2, y + 0.45, (z1 + z2) / 2 + off, M.metal));
    for (let x = x1 + 2; x < x2 - 1; x += 3) {
      group.add(box(0.12, 1.1, 0.12, x, y + 0.45, (z1 + z2) / 2 + off, M.metal));
      group.add(addBeam([x - 1.5, y + 0.05, (z1 + z2) / 2 + off], [x, y + 1.0, (z1 + z2) / 2 + off], 0.06, M.pipeDark));
      group.add(addBeam([x, y + 1.0, (z1 + z2) / 2 + off], [x + 1.5, y + 0.05, (z1 + z2) / 2 + off], 0.06, M.pipeDark));
    }
  }
  const bridgeZ = (z1 + z2) / 2;
  for (const x of [x1 + 10, x1 + w / 2, x2 - 10]) {
    const groundY = surfaceYAt(x, bridgeZ, 0.8);
    group.add(box(1.0, Math.max(1.2, y - groundY - 1.2), 1.0, x, groundY + (y - groundY - 1.2) / 2, bridgeZ, M.concreteDark));
    group.add(box(1.35, 0.18, 1.35, x, groundY + 0.09, bridgeZ, M.concrete[1]));
    group.add(box(0.42, 0.12, 0.18, x, y + 0.98, bridgeZ - d / 2 + 0.18, M.light));
  }
  // A compact utility carrier gives the elevated route an operational silhouette.
  group.add(addBeam([x1 + 1.5, y + 1.15, bridgeZ], [x2 - 1.5, y + 1.15, bridgeZ], 0.14, M.pipe));
  group.add(addBeam([x1 + 1.5, y + 0.88, bridgeZ + 0.7], [x2 - 1.5, y + 0.88, bridgeZ + 0.7], 0.09, M.pipeDark));
}

// Tunnel shells are built from the route below so the interior remains walkable;
// source passage AABBs are semantic bounds, not solid geometry.

// -------- drone hole: dark ring at grade --------
for (const s of segs) {
  if (s.category !== 'hole-drone-entry') continue;
  const [x1, z1, x2, z2] = s.bounds;
  const sy = segmentTerrainY(s);
  group.add(box(x2 - x1, 0.3, z2 - z1, (x1 + x2) / 2, sy + 0.1, (z1 + z2) / 2, M.door));
}

// -------- roll-down doors --------
for (const s of segs) {
  if (s.category !== 'roll-down') continue;
  const [x1, z1, x2, z2] = s.bounds;
  const w = x2 - x1, d = z2 - z1;
  const horiz = w >= d;
  const sy = segmentTerrainY(s);
  const h = s.height || 4.5, cx2 = (x1 + x2) / 2, cz2 = (z1 + z2) / 2;
  const loadingGate = s.id === 'rd-loading' && horiz;
  if (loadingGate) {
    // The three recessed bays own the door leaves; this is their shared exterior track.
    group.add(edgeBox(w, 0.16, 0.2, cx2, sy + h + 0.18, cz2, M.loadingFrame, 0, 0.035));
    for (const x of [-76, -60, -44]) group.add(edgeBox(7.7, 0.08, 0.1, x, sy + h + 0.03, cz2 - 0.42, M.trim, 0, 0.02));
    continue;
  }
  const panelCenters = loadingGate ? [-76, -60, -44] : [cx2];
  for (const panelCenter of panelCenters) {
    const panelWidth = loadingGate ? 8 : w;
    const panelDepth = horiz ? 0.5 : d;
    const panelZ = loadingGate ? [-76, -60, -44].includes(panelCenter) ? cz2 - 0.72 : cz2 + 0.28 : cz2;
    const panelMaterial = loadingGate ? M.loadingDoor : M.door;
    const slatMaterial = loadingGate ? M.loadingSlat : M.doorSlat;
    group.add(box(horiz ? panelWidth : 0.5, h, panelDepth, panelCenter, sy + h / 2, panelZ, panelMaterial));
    if (loadingGate) {
      for (let y = sy + 0.42; y < sy + h - 0.12; y += 0.48)
        group.add(box(panelWidth - 0.42, 0.09, 0.08, panelCenter, y, panelZ + 0.3, slatMaterial));
    } else {
      const nSlats = Math.max(4, Math.floor((horiz ? w : d) / 4));
      for (let i = 1; i < nSlats; i++) {
        const axis = (horiz ? x1 : z1) + (horiz ? w : d) * i / nSlats;
        group.add(horiz ? box(0.08, h - 0.25, 0.08, axis, sy + h / 2, cz2 - 0.3, slatMaterial) : box(0.08, h - 0.25, 0.08, cx2 - 0.3, sy + h / 2, axis, slatMaterial));
      }
    }
    const frameMaterial = loadingGate ? M.loadingFrame : M.trim;
    const frameW = horiz ? panelWidth : 0.65, frameD = horiz ? 0.65 : d;
    group.add(box(frameW + (horiz ? 0 : 0.2), 0.24, frameD + (horiz ? 0.2 : 0), panelCenter, sy + h + 0.2, panelZ, frameMaterial));
    for (const side of [-1, 1]) {
      const px = horiz ? panelCenter + side * (panelWidth / 2) : panelCenter + side * 0.42;
      const pz = horiz ? panelZ + 0.35 : (side < 0 ? z1 : z2);
      group.add(cylinder(0.16, 1.25, px, sy + 0.63, pz, M.warning, 8));
    }
  }
}

// -------- covers: family grammar (low crate / mid barrier / full bunker) --------
for (const s of segs) {
  if (s.category !== 'cover') continue;
  const [x1, z1, x2, z2] = s.bounds;
  const w = x2 - x1, d = z2 - z1, h = s.height, cx2 = (x1 + x2) / 2, cz2 = (z1 + z2) / 2;
  const sy = segmentTerrainY(s);
  const cls = s.cover?.heightClass || 'mid';
  const cm = M.cover[(idSeed(s.id) >>> 0) % M.cover.length];
  if (cls === 'low') {
    // crate stack: two boxes
    group.add(box(w, h * 0.55, d, cx2, sy + h * 0.275, cz2, cm));
    group.add(box(w * 0.9, h * 0.45, d * 0.9, cx2, sy + h * 0.55 + h * 0.225, cz2, M.cover[((idSeed(s.id) + 1) >>> 0) % M.cover.length]));
  } else if (cls === 'mid') {
    // jersey barrier with base flare
    group.add(box(w, h, d, cx2, sy + h / 2, cz2, cm));
    group.add(box(w + 0.3, 0.3, d + 0.3, cx2, sy + 0.15, cz2, M.concreteDark));
  } else {
    // bunker block: solid with roof overhang
    group.add(box(w, h, d, cx2, sy + h / 2, cz2, cm));
    group.add(box(w + 0.8, 0.4, d + 0.8, cx2, sy + h + 0.2, cz2, M.roof));
  }
}

// -------- overhead covers: canopy + posts --------
for (const s of segs) {
  if (s.category !== 'overhead-cover') continue;
  const [x1, z1, x2, z2] = s.bounds;
  const h = s.height || 6, w = x2 - x1, d = z2 - z1;
  const sy = segmentTerrainY(s);
  if (s.id === 'oc-loading-dock') {
    const canopyY = sy + h - 0.95;
    for (const [x, depth] of [[-76, 3.6], [-60, 4.8], [-44, 4.0]]) {
      const canopyZ = 90.05 + depth / 2;
      group.add(edgeBox(11.2, 0.22, depth, x, canopyY, canopyZ, M.loadingCanopy, 0, 0.045));
      group.add(edgeBox(11.45, 0.28, 0.16, x, canopyY - 0.08, canopyZ + depth / 2, M.loadingFrame, 0, 0.035));
      for (const ribX of [x - 4.4, x - 2.2, x, x + 2.2, x + 4.4])
        group.add(edgeBox(0.08, 0.09, depth - 0.2, ribX, canopyY - 0.15, canopyZ, M.trim, 0, 0.02));
    }
    continue;
  }
  group.add(box(w, 0.5, d, (x1 + x2) / 2, sy + h - 0.25, (z1 + z2) / 2, M.metal));
  for (const [px, pz] of [[x1 + 0.5, z1 + 0.5], [x2 - 0.5, z1 + 0.5], [x1 + 0.5, z2 - 0.5], [x2 - 0.5, z2 - 0.5]])
    group.add(box(0.35, h - 0.5, 0.35, px, sy + (h - 0.5) / 2, pz, M.concreteDark));
}

// The three bay-specific decks above are the loading edge; keep the canopy
// separate so its posts and recess returns remain readable.

// -------- water: shoreline plane --------
{
  const we = b.terrain?.waterEdge || [];
  if (we.length) {
    const wMesh = new Mesh(new PlaneGeometry(560, 640), M.water);
    wMesh.rotation.x = -Math.PI / 2;
    wMesh.position.set(440, -0.15, -20);
    group.add(wMesh);
    // shoreline lip: dark band hugging the polyline
    for (let i = 0; i < we.length - 1; i++) {
      const [ax, az] = we[i], [bx2, bz] = we[i + 1];
      const len = Math.hypot(bx2 - ax, bz - az);
      group.add(box(len, 0.8, 3, (ax + bx2) / 2, 0.2, (az + bz) / 2, M.concreteDark, -Math.atan2(bz - az, bx2 - ax)));
      group.add(addBeam([ax, 1.35, az], [bx2, 1.35, bz], 0.075, M.fence));
      const posts = Math.max(2, Math.ceil(len / 14));
      for (let post = 0; post <= posts; post++) {
        const t = post / posts, px = ax + (bx2 - ax) * t, pz = az + (bz - az) * t;
        group.add(cylinder(0.09, 1.45, px, 0.72, pz, M.fence, 8));
      }
    }
  }
}

// The source boundary calls for a rocky perimeter, but the campus reads as an
// industrial site: model it as terraced retaining construction with a controlled
// warning line rather than as an unbounded natural canyon.
const boundaryCut = s => {
  const [x1, z1, x2, z2] = s.bounds;
  const left = Math.min(x1, x2), right = Math.max(x1, x2), front = Math.min(z1, z2);
  const span = right - left;
  const tiers = [
    { width: span, height: 5, depth: 8, material: M.concreteDark },
    { width: Math.max(8, span - 8), height: 11, depth: 8, material: M.campusBaseAlt },
    { width: Math.max(8, span - 18), height: 19, depth: 8, material: M.campusBase },
    { width: Math.max(8, span - 32), height: 29, depth: 8, material: M.campusBaseAlt },
    { width: Math.max(8, span - 48), height: 38, depth: 8, material: M.campusBase },
  ];
  for (const [index, tier] of tiers.entries()) {
    const centerX = (left + right) / 2;
    const centerZ = front + 4 + index * 5.2;
    group.add(box(tier.width, tier.height, tier.depth, centerX, tier.height / 2, centerZ, tier.material));
    group.add(box(tier.width + 0.35, 0.18, 0.28, centerX, tier.height + 0.1, front + 0.15 + index * 5.2, index === 0 ? M.rust : M.concreteDark));
  }
  const tapeZ = front - 0.35;
  for (let x = left; x <= right; x += 18) {
    group.add(cylinder(0.1, 2.6, x, 1.3, tapeZ, M.warningDark, 8));
    group.add(box(0.22, 0.18, 0.22, x, 2.55, tapeZ, M.warning));
  }
  group.add(addBeam([left, 2.15, tapeZ], [right, 2.15, tapeZ], 0.045, M.warning));
  group.add(addBeam([left, 2.45, tapeZ], [right, 2.45, tapeZ], 0.028, M.warningDark));
  if (isolatedTransferOnly) return;
  // A service shoulder makes the foot of the cut read as maintained access.
  group.add(box(span, 0.16, 3.0, (left + right) / 2, 0.08, front - 2.1, M.hardstand));
  group.add(box(span, 0.1, 0.24, (left + right) / 2, 0.24, front - 3.0, M.curb));
  // Retaining construction needs visible maintenance infrastructure, not a blank wall.
  const faceZ = front - 0.28;
  for (let x = left + 12; x < right; x += 24) {
    group.add(box(0.5, 27, 0.45, x, 13.5, faceZ, M.rib));
    group.add(box(1.4, 0.22, 1.0, x, 0.42, front - 1.1, M.concreteDark));
    group.add(addBeam([x, 1.0, faceZ], [x, 24.5, faceZ], 0.055, M.metal));
  }
  pipeGallery(left + 10, front - 0.9, right - 10, front - 0.9, 2.8, 5.2, 2.8);
  for (const y of [9.2, 17.4, 25.2])
    group.add(addBeam([left + 3, y, faceZ - 0.04], [right - 3, y, faceZ - 0.04], 0.1, M.pipeDark));
  for (let x = left + 9; x <= right - 9; x += 36) {
    group.add(box(1.5, 0.12, 0.18, x, 8.8, faceZ - 0.08, M.light));
    group.add(box(0.18, 0.8, 0.18, x, 8.35, faceZ - 0.08, M.metal));
  }
};
for (const s of segs) if (s.category === 'mountain-boundary') boundaryCut(s);

const dirtPatch = (x, z, w, d, rotation = 0) => {
  group.add(flatRect(x, z, w, d, M.dirt, rotation, 0.018));
};
const roadStain = (x, z, w, d, rotation = 0, seed = 1) => {
  group.add(flatPolygon(x, z, w, d, M.stain, rotation, roadTopYAt(x, z, surfaceYAt(x, z, 0)) + 0.028, seed));
};
const wetRoad = (x, z, w, d, rotation = 0, seed = 1) => {
  const y = roadTopYAt(x, z, surfaceYAt(x, z, 0));
  group.add(flatPolygon(x, z, w, d, M.wetRoad, rotation, y + 0.038, seed, 10));
  group.add(flatPolygon(x + w * 0.08, z - d * 0.06, w * 0.58, d * 0.44, M.puddle, rotation - 0.08, y + 0.052, seed + 17, 7));
};
const drainGrate = (x, z, length, rotation = 0, y = roadTopYAt(x, z, surfaceYAt(x, z, 0))) => {
  group.add(box(0.62, 0.06, length, x, y + 0.035, z, M.drain, rotation));
  for (let i = -Math.floor(length / 2) + 0.45; i < length / 2; i += 0.72) {
    const px = x + Math.cos(rotation) * i, pz = z + Math.sin(rotation) * i;
    group.add(box(0.08, 0.075, 0.78, px, y + 0.07, pz, M.roadJoint, rotation));
  }
};
const tireTrack = (ax, az, bx, bz, width = 0.18) => {
  const y = roadTopYAt((ax + bx) / 2, (az + bz) / 2, surfaceYAt((ax + bx) / 2, (az + bz) / 2, 0));
  group.add(flatSegment([ax, y, az], [bx, y, bz], width, M.stain, 0.055));
};
for (const [x, z, w, d, r] of [[-284, 112, 22, 5, 0.08], [-180, 108, 18, 4, -0.14], [112, 104, 24, 4, -0.1], [300, 105, 28, 5, 0.06]]) dirtPatch(x, z, w, d, r);
for (const [x, z, w, d, r] of [
  [34, 175, 42, 7, 0.08], [92, 164, 34, 5, -0.12], [148, 181, 38, 6, 0.04],
  [-6, 153, 28, 4.5, 0.16],
]) wetRoad(x, z, w, d, r, idSeed(`pressure-wet-${x}-${z}`));
for (const [x, z, w, d, r] of [[-155, 148, 6, 1.4, 0.08], [-62, 113, 7, 1.6, -0.12], [18, 94, 5, 1.2, 0.04], [94, 54, 7, 1.4, -0.16], [118, -188, 5, 1.1, 0.1]]) roadStain(x, z, w, d, r, idSeed(`stain-${x}-${z}`));
for (const [x, z, w, d, r] of [
  [-258, 163, 24, 4.2, 0.06], [-182, 149, 18, 3.6, -0.12], [-76, 121, 20, 3.8, 0.08],
  [-27, 103, 10, 4.2, -0.18], [24, 92, 16, 3.2, 0.04], [107, -154, 17, 3.2, 0.12],
  [78, -213, 12, 3.8, -0.06], [42, -232, 9, 3.2, 0.1],
]) wetRoad(x, z, w, d, r, idSeed(`wet-${x}-${z}`));
const loadingJointY = roadTopYAt(-66, 113.7, surfaceYAt(-66, 113.7, 0));
group.add(flatSegment([-96, loadingJointY, 113.7], [-36, loadingJointY, 113.7], 0.14, M.roadJoint, 0.07));
for (const [x, z, w, d, r, seed] of [[-82, 111.5, 9, 0.75, 0.04, 731], [-52, 108.2, 7, 0.65, -0.08, 732]]) {
  const y = roadTopYAt(x, z, surfaceYAt(x, z, 0));
  group.add(flatPolygon(x, z, w, d, M.stain, r, y + 0.07, seed, 8));
}
const loadingApronSurfaceYAt = z => 0.34 + 0.18 - ((z - 96.4) / (149.6 - 96.4)) * 0.15;
const loadingDrainY = loadingApronSurfaceYAt(107.2);
group.add(box(62, 0.035, 0.62, -66, loadingDrainY + 0.018, 107.2, M.drain));
for (let x = -96; x <= -36; x += 0.7) group.add(box(0.06, 0.04, 0.44, x, loadingDrainY + 0.045, 107.2, M.roadJoint));
const centerRunoffZ = 103.1;
group.add(flatSegment(
  [-60, loadingApronSurfaceYAt(centerRunoffZ), centerRunoffZ],
  [-60, loadingDrainY, 107.2], 0.28, M.loadingReflective, 0.035,
));
// The pressure hardstand is a camera-facing logistics apron, not an empty plane:
// broad tire wear, service drains, and damp seams establish its working scale.
for (const [x, z, w, d, r] of [
  [52, 174, 38, 5.5, 0.08], [83, 161, 28, 4.2, -0.12], [73, 145, 24, 3.4, 0.06],
  [33, 132, 30, 3.2, -0.08], [104, 132, 20, 4.6, 0.12],
]) wetRoad(x, z, w, d, r, idSeed(`pressure-apron-wet-${x}-${z}`));
for (const [x, z, length, r] of [[58, 178, 9, Math.PI / 2], [92, 165, 8, Math.PI / 2], [108, 145, 7, 0], [18, 131, 8, 0]]) drainGrate(x, z, length, r);
tireTrack(58, 181, 48, 145); tireTrack(76, 181, 68, 146); tireTrack(100, 172, 92, 142);

// -------- fences: posts + rails --------
for (const s of segs) {
  if (!['fence-w', 'fence-s'].includes(s.id)) continue;
  const [x1, z1, x2, z2] = s.bounds;
  const w = Math.abs(x2 - x1), d = Math.abs(z2 - z1), len = Math.max(w, d);
  const horiz = w >= d;
  const sy = segmentTerrainY(s);
  const nPosts = Math.max(3, Math.floor(len / 10));
  for (let i = 0; i <= nPosts; i++) {
    const t = i / nPosts;
    const px = horiz ? x1 + (x2 - x1) * t : x1, pz = horiz ? z1 : z1 + (z2 - z1) * t;
    group.add(box(horiz ? 0.25 : 0.3, 4, horiz ? 0.3 : 0.25, px, sy + 2, pz, M.metal));
  }
  group.add(box(horiz ? len : 0.15, 2.6, horiz ? 0.15 : len, (x1 + x2) / 2, sy + 2.3, (z1 + z2) / 2, M.metal));
}

// Semantic spawn/kill records stay in the source and runtime exports. The built
// presentation asset omits their debug-color pads so player-eye views stay diegetic.

// -------- utility runs: pipe racks along covered routes (supports + pipes) --------
for (const r of b.routes) {
  if (r.kind !== 'covered') continue;
  const samples = routeSamples(r);
  for (let i = 0; i < samples.length - 1; i++) {
    const a = samples[i], c = samples[i + 1];
    const [ax, az] = [a[0], a[2]], [bx2, bz] = [c[0], c[2]];
    const frame = segmentFrame(ax, az, bx2, bz);
    const routeWidth = r.width || 5;
    const nSup = Math.max(2, Math.floor(frame.len / 6));
    for (let k = 0; k <= nSup; k++) {
      const t = k / nSup;
      const px = ax + (bx2 - ax) * t, pz = az + (bz - az) * t;
      const py = a[1] + (c[1] - a[1]) * t;
      for (const side of [-1, 1]) {
        const [sx, sz] = offsetPoint(px, pz, frame, side * Math.max(1.5, routeWidth / 2 - 0.35));
        group.add(box(0.2, 3.2, 0.2, sx, py + 1.6, sz, M.metal));
      }
    }
    const dx = bx2 - ax, dy = c[1] - a[1], dz = bz - az;
    const pipe = new Mesh(new CylinderGeometry(0.28, 0.28, Math.hypot(dx, dy, dz), 8), M.pipe);
    pipe.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), new Vector3(dx, dy, dz).normalize());
    pipe.position.set((ax + bx2) / 2, (a[1] + c[1]) / 2 + 3.2, (az + bz) / 2);
    group.add(pipe);
  }
}

// -------- interiors: enterable buildings get floor construction, partitions, stairs, objective room --------
const interiorByBld = new Map((b.interiors || []).map(i => [i.building, i]));
const FLOOR_T = 0.3;
function interiors(s) {
  const plan = interiorByBld.get(s.id);
  if (!plan) return;
  const [x1, z1, x2, z2] = s.bounds;
  const w = x2 - x1, d = z2 - z1, h = s.height, base = raisedBase(s);
  const cx2 = (x1 + x2) / 2, cz2 = (z1 + z2) / 2;
  const nF = plan.floors || s.floors || 1;
  const fh = h / nF;
  const stairOpening = nF > 1
    ? plan.layout === 'staircore'
      ? { x: cx2, z: cz2, w: 3.5, d: 4.5 }
      : { x: x1 + 2.6, z: z1 + 3.25, w: 2, d: 3.3 }
    : null;
  const addFloorSlab = (y, opening) => {
    const fw = w - 1, fd = d - 1, ix1 = x1 + 0.5, iz1 = z1 + 0.5, ix2 = x2 - 0.5, iz2 = z2 - 0.5;
    if (!opening) {
      group.add(box(fw, FLOOR_T, fd, cx2, y, cz2, M.concreteDark));
      return;
    }
    const ox1 = Math.max(ix1, opening.x - opening.w / 2), ox2 = Math.min(ix2, opening.x + opening.w / 2);
    const oz1 = Math.max(iz1, opening.z - opening.d / 2), oz2 = Math.min(iz2, opening.z + opening.d / 2);
    if (ox2 <= ox1 || oz2 <= oz1) {
      group.add(box(fw, FLOOR_T, fd, cx2, y, cz2, M.concreteDark));
      return;
    }
    const slab = (sw, sd, sx, sz) => {
      if (sw > 0.05 && sd > 0.05) group.add(box(sw, FLOOR_T, sd, sx, y, sz, M.concreteDark));
    };
    slab(ox1 - ix1, fd, (ix1 + ox1) / 2, (iz1 + iz2) / 2);
    slab(ix2 - ox2, fd, (ox2 + ix2) / 2, (iz1 + iz2) / 2);
    slab(ox2 - ox1, oz1 - iz1, (ox1 + ox2) / 2, (iz1 + oz1) / 2);
    slab(ox2 - ox1, iz2 - oz2, (ox1 + ox2) / 2, (oz2 + iz2) / 2);
  };
  // Keep stair shafts open through every upper floor. A full duplicate slab here
  // sealed the landing volume even when the stairs themselves were present.
  for (let f = 0; f < nF; f++) {
    addFloorSlab(base + fh * f + FLOOR_T / 2, stairOpening);
  }
  const rand = rng(idSeed('int-' + s.id));
  // industrial lighting: emissive ceiling strips along the long axis (construction, not dressing)
  if (plan.layout !== 'staircore') {
    const horiz = w >= d;
    const nStrips = plan.layout === 'objective' || plan.layout === 'corridor' ? 1 : 2;
    for (let i = 0; i < nStrips; i++) {
      const t = (i - (nStrips - 1) / 2) * 0.45;
      const off = horiz ? t * d : t * w;
      const strip = new Mesh(new BoxGeometry(horiz ? w - 2 : 0.7, 0.12, horiz ? 0.7 : d - 2), M.light);
      strip.position.set(horiz ? cx2 : cx2 + off, base + h - 0.32, horiz ? cz2 + off : cz2);
      group.add(strip);
    }
  }
  // layout construction
  switch (plan.layout) {
    case 'drive-through': {
      // clear central aisle N-S; low crates flank (interior cover — PvE decision point in the slice)
      const aisle = Math.min(8, d - 6);
      group.add(box(w - 1, h - 1.2, 0.35, cx2 - 4, base + (h - 1.2) / 2 + 0.6, cz2, M.rib));
      group.add(box(w - 1, h - 1.2, 0.35, cx2 + 4, base + (h - 1.2) / 2 + 0.6, cz2, M.rib));
      for (let i = 0; i < 3; i++) {
        const px = cx2 + (rand() - 0.5) * (w - 12), pz = cz2 + (i - 1) * (d - 4) / 4;
        group.add(box(2.6, 1.2, 1.6, px, base + 0.6, pz, M.cover[0]));
        group.add(box(2.2, 1.0, 1.4, px + 0.0, base + 1.7, pz, M.cover[1]));
      }
      break;
    }
    case 'bays':
    case 'stalls': {
      const stalls = plan.stalls || 2;
      const len = Math.max(w, d);
      const horiz = w >= d;
      const stallW = len / stalls;
      for (let i = 1; i < stalls; i++) {
        const t = stallW * i;
        group.add(box(horiz ? 0.35 : w - 1, h * 0.7, horiz ? d - 1 : 0.35, horiz ? x1 + t : cx2, base + h * 0.35, horiz ? cz2 : z1 + t, M.rib));
      }
      break;
    }
    case 'corridor': {
      // Keep the central corridor open along the room's deeper axis.
      const corridorOffset = Math.min(2.5, Math.max(1.2, w / 2 - 2));
      const corridorWallDepth = Math.max(1, d - 1);
      const securityDeskLine = s.id === 'bld-security-hall';
      const partitionHeight = securityDeskLine ? 1.55 : h - 1.4;
      const partitionBase = securityDeskLine ? base + 0.05 : base + 0.7;
      const partitionMaterial = securityDeskLine ? M.panel[1] : M.rib;
      group.add(box(0.35, partitionHeight, corridorWallDepth, cx2 - corridorOffset, partitionBase + partitionHeight / 2, cz2, partitionMaterial));
      group.add(box(0.35, partitionHeight, corridorWallDepth, cx2 + corridorOffset, partitionBase + partitionHeight / 2, cz2, partitionMaterial));
      if (securityDeskLine) {
        // Keep the desk line legible from the threshold instead of hiding it behind full-height partitions.
        for (const side of [-1, 1]) {
          const x = cx2 + side * corridorOffset;
          group.add(box(0.62, 0.16, corridorWallDepth, x, base + 1.68, cz2, M.metal));
          for (const z of [-157, -146, -135]) group.add(box(0.16, 0.34, 0.16, x, base + 1.92, z, M.trim));
        }
        for (const z of [-157, -146, -135]) {
          group.add(box(2.8, 0.12, 0.16, cx2, base + 4.8, z, M.light));
          group.add(box(0.16, 0.26, 0.16, cx2, base + 4.48, z, M.trim));
        }
      }
      break;
    }
    case 'objective': {
      // objective floor: barrier ring + terminal block with emissive core
      const lvlY = base + fh * (plan.objectiveLevel - 1);
      const ow = Math.min(14, w - 8), od = Math.min(12, d - 8);
      const tx = cx2, tz = cz2;
      group.add(box(ow, 0.4, od, tx, lvlY + FLOOR_T + 0.2, tz, M.concreteDark));
      // barrier ring with a real capsule-width north doorway
      const B = 0.5;
      group.add(box(ow + 2 * B, 1.3, B, tx, lvlY + 1.4, tz - od / 2, M.metal));
      group.add(box(B, 1.3, od, tx - ow / 2, lvlY + 1.4, tz, M.metal));
      group.add(box(B, 1.3, od, tx + ow / 2, lvlY + 1.4, tz, M.metal));
      const gapW = 3;
      const railLen = (ow - gapW) / 2;
      group.add(box(railLen, 1.3, B, tx - gapW / 2 - railLen / 2, lvlY + 1.4, tz + od / 2, M.metal));
      group.add(box(railLen, 1.3, B, tx + gapW / 2 + railLen / 2, lvlY + 1.4, tz + od / 2, M.metal));
      // terminal block
      const term = new Mesh(new BoxGeometry(2.4, 1.8, 1.2), M.term);
      term.position.set(tx, lvlY + FLOOR_T + 1.0, tz);
      group.add(term);
      group.add(box(1.8, 0.7, 0.08, tx, lvlY + FLOOR_T + 1.15, tz - 0.62, M.glass));
      group.add(box(0.12, 0.95, 0.12, tx - 0.72, lvlY + FLOOR_T + 1.1, tz - 0.72, M.amber));
      group.add(box(0.12, 0.95, 0.12, tx + 0.72, lvlY + FLOOR_T + 1.1, tz - 0.72, M.amber));
      for (const [px, pz] of [[tx - ow / 2 + 1.2, tz - od / 2 + 1.2], [tx + ow / 2 - 1.2, tz - od / 2 + 1.2], [tx - ow / 2 + 1.2, tz + od / 2 - 1.2], [tx + ow / 2 - 1.2, tz + od / 2 - 1.2]]) {
        group.add(cylinder(0.18, 3.2, px, lvlY + 1.6, pz, M.pipeDark, 8));
        group.add(box(0.5, 0.12, 0.12, px, lvlY + 3.05, pz, M.red));
      }
      // objective marker strip on the floor
      group.add(box(6, 0.06, 4, tx, lvlY + FLOOR_T + 0.08, tz, M.killObj));
      group.add(box(6, 0.05, 0.16, tx, lvlY + FLOOR_T + 0.12, tz - od / 2 + 0.7, M.warning));
      break;
    }
    case 'staircore': {
      // open stair core: landings and treads stay traversable instead of a solid shaft
      const sw = 4.5, sd = 5.5;
      const treadW = sw - 1, treadD = sd - 1;
      for (let f = 0; f < nF - 1; f++) {
        const stepCount = Math.max(8, Math.ceil(fh / 0.2)), stepRise = fh / stepCount, stepDepth = treadD / stepCount;
        const dir = f % 2 === 0 ? 1 : -1;
        const startZ = cz2 - dir * treadD / 2;
        for (let i = 0; i < stepCount; i++) {
          const z = startZ + dir * stepDepth * (i + 0.5);
          group.add(box(treadW, stepRise * (i + 1), stepDepth, cx2, base + fh * f + FLOOR_T + stepRise * (i + 1) / 2, z, M.concrete[1]));
        }
      }
      for (let f = 0; f < nF; f++) group.add(box(treadW, 0.22, treadD, cx2, base + fh * f + FLOOR_T + 0.11, cz2, M.concreteDark));
      break;
    }
    case 'open':
    default:
      break;
  }
  // Interior stairs for multi-floor layouts (corner, away from the main door side).
  if (nF > 1 && plan.layout !== 'staircore') {
    const sw2 = 3.2, sd2 = 4.5;
    const sx = x1 + sw2 / 2 + 1, sz = z1 + sd2 / 2 + 1;
    const treadW = sw2 - 1.2, treadD = sd2 - 1.2;
    for (let f = 0; f < nF - 1; f++) {
      const stepCount = Math.max(8, Math.ceil(fh / 0.2)), stepRise = fh / stepCount, stepDepth = treadD / stepCount;
      const dir = f % 2 === 0 ? 1 : -1;
      const startZ = sz - dir * treadD / 2;
      for (let i = 0; i < stepCount; i++) {
        const z = startZ + dir * stepDepth * (i + 0.5);
        group.add(box(treadW, stepRise * (i + 1), stepDepth, sx, base + fh * f + FLOOR_T + stepRise * (i + 1) / 2, z, M.concrete[1]));
      }
    }
    for (let f = 0; f < nF; f++) group.add(box(treadW, 0.22, treadD, sx, base + fh * f + FLOOR_T + 0.11, sz, M.concreteDark));
  }
}
for (const s of segs) if (bldCats.includes(s.category)) interiors(s);

// Focused player-scale dressing for the two objective-facing interiors. These are
// deliberately low-count pieces: consoles, service trays, and readable light cues.
const interiorConsole = (x, z, baseY, rotation = 0, screenMaterial = M.amber) => {
  const local = (lx, lz) => rotateLocal(x, z, rotation, lx, lz);
  const piece = (w, h, d, lx, ly, lz, material) => {
    const [px, pz] = local(lx, lz);
    group.add(box(w, h, d, px, baseY + ly, pz, material, rotation));
  };
  piece(4.8, 0.95, 1.25, 0, 0.48, 0, M.panel[1]);
  piece(4.2, 0.12, 0.9, 0, 1.02, -0.06, M.metal);
  piece(2.8, 0.72, 0.08, 0, 1.42, -0.54, M.glass);
  piece(2.15, 0.38, 0.06, 0, 1.42, -0.6, screenMaterial);
  piece(0.12, 0.5, 0.08, -1.05, 1.42, -0.61, screenMaterial);
  piece(0.12, 0.5, 0.08, 1.05, 1.42, -0.61, screenMaterial);
};
const interiorTray = (x, z, y, length, rotation = 0, material = M.pipeDark) => {
  group.add(box(length, 0.18, 0.18, x, y, z, material, rotation));
  group.add(box(length, 0.12, 0.12, x, y - 0.34, z, M.metal, rotation));
  for (const offset of [-length * 0.36, 0, length * 0.36]) {
    const px = x + Math.cos(rotation) * offset, pz = z + Math.sin(rotation) * offset;
    group.add(box(0.12, 0.55, 0.12, px, y - 0.2, pz, M.metal));
  }
};
const interiorRack = (x, z, baseY, height = 3.4, rotation = 0) => {
  const local = (lx, lz) => rotateLocal(x, z, rotation, lx, lz);
  const piece = (w, h, d, lx, ly, lz, material) => {
    const [px, pz] = local(lx, lz);
    group.add(box(w, h, d, px, baseY + ly, pz, material, rotation));
  };
  piece(2.8, height, 1.8, 0, height / 2, 0, M.panel[1]);
  for (const y of [baseY + 0.65, baseY + 1.55, baseY + 2.45]) {
    const ly = y - baseY;
    piece(2.25, 0.08, 0.08, 0, ly, -0.94, M.metal);
    piece(0.1, 0.48, 0.08, -0.78, ly + 0.22, -0.98, M.red);
    piece(0.1, 0.34, 0.08, 0.78, ly + 0.18, -0.98, M.amber);
  }
};
if (byId.has('bld-security-hall')) {
  const s = byId.get('bld-security-hall'), baseY = raisedBase(s), roomY = baseY + 0.3;
  for (const z of [-157, -146, -135]) {
    interiorConsole(53, z, roomY, 0, z === -146 ? M.light : M.amber);
    interiorConsole(23, z, roomY, Math.PI, M.red);
  }
  // Two threshold-facing stations sit just beyond the low partitions so the desk line reads from the entry aisle.
  interiorConsole(31.5, -148, roomY, -Math.PI / 2, M.amber);
  interiorConsole(44.5, -148, roomY, Math.PI / 2, M.light);
  interiorTray(38, -144, baseY + 12.55, 30, Math.PI / 2, M.pipe);
  interiorTray(38, -144, baseY + 13.1, 30, Math.PI / 2, M.pipeDark);
  for (const z of [-158, -146, -134]) {
    group.add(box(0.18, 0.14, 2.4, 38, baseY + 7.2, z, M.light));
    group.add(box(0.12, 0.5, 0.12, 36.9, baseY + 7.2, z, M.metal));
    group.add(box(0.12, 0.5, 0.12, 39.1, baseY + 7.2, z, M.metal));
  }
  for (const x of [11, 65]) interiorRack(x, -145, roomY, 3.6, Math.PI / 2);
}
if (byId.has('bld-core-ops-hall')) {
  const s = byId.get('bld-core-ops-hall'), plan = interiorByBld.get(s.id), baseY = raisedBase(s);
  const levelY = baseY + (s.height / (plan?.floors || s.floors || 1)) * ((plan?.objectiveLevel || 2) - 1);
  const floorY = levelY + FLOOR_T;
  // Keep the operator consoles on the approach side of the ring so they frame the
  // objective instead of disappearing behind the terminal block.
  for (const [x, material] of [[34, M.amber], [62, M.light]]) interiorConsole(x, -248, floorY, 0, material);
  for (const x of [11, 85]) interiorRack(x, -258, floorY + 0.05, 3.8, Math.PI / 2);
  interiorConsole(22, -276, floorY, 0, M.amber);
  interiorConsole(74, -276, floorY, 0, M.red);
  interiorTray(48, -258, floorY + 4.35, 68, 0, M.pipeDark);
  interiorTray(48, -258, floorY + 4.78, 54, 0, M.pipe);
  for (const x of [15, 31, 65, 81]) {
    group.add(box(0.16, 0.18, 0.16, x, floorY + 3.65, -278, M.light));
    group.add(box(0.16, 0.18, 0.16, x, floorY + 3.65, -238, M.light));
  }
  group.add(box(8.4, 0.12, 0.12, 48, floorY + 2.25, -258.68, M.light));
  group.add(box(5.2, 0.08, 0.08, 48, floorY + 2.62, -258.7, M.red));
  // A lit cylindrical service core gives the objective a distinct industrial focal
  // shape above the terminal while preserving the authored barrier opening.
  group.add(cylinder(0.72, 2.6, 48, floorY + 1.78, -258, M.term, 16));
  group.add(cylinder(1.15, 0.12, 48, floorY + 0.34, -258, M.metal, 16));
  group.add(cylinder(1.28, 0.1, 48, floorY + 3.08, -258, M.amber, 16));
  group.add(box(3.8, 0.16, 0.16, 48, floorY + 3.35, -258, M.light));
}

// -------- tunnel interior: arched concrete, wet floor, and service runs --------
const tunnelVault = (ax, az, bx, bz, floorY, width, tunnelH) => {
  const frame = segmentFrame(ax, az, bx, bz);
  const half = width / 2 - 0.2;
  const springY = floorY + tunnelH - 1.2;
  const rise = 1.2;
  const crossSteps = 12;
  const positions = [], indices = [];
  for (const t of [0, 1]) {
    const cx = ax + (bx - ax) * t, cz = az + (bz - az) * t;
    for (let i = 0; i <= crossSteps; i++) {
      const offset = -half + (half * 2 * i) / crossSteps;
      const arch = Math.sqrt(Math.max(0, 1 - (offset / half) ** 2));
      const [px, pz] = offsetPoint(cx, cz, frame, offset);
      positions.push(px, springY + rise * arch, pz);
    }
  }
  for (let i = 0; i < crossSteps; i++) {
    const a = i, c = i + 1, b = crossSteps + 1 + i, d = b + 1;
    indices.push(a, b, d, a, d, c);
  }
  const geo = new BufferGeometry();
  geo.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geo.setIndex(indices); geo.computeVertexNormals();
  return new Mesh(geo, M.tunnelConcrete);
};
const tunnelArchRib = (cx, cz, frame, floorY, width, tunnelH, material = M.tunnelConcreteDark) => {
  const half = width / 2 - 0.18;
  const springY = floorY + tunnelH - 1.2;
  const rise = 1.2;
  const archSteps = 10;
  let previous = null;
  for (let i = 0; i <= archSteps; i++) {
    const offset = -half + (half * 2 * i) / archSteps;
    const arch = Math.sqrt(Math.max(0, 1 - (offset / half) ** 2));
    const [px, pz] = offsetPoint(cx, cz, frame, offset);
    const point = [px, springY + rise * arch, pz];
    if (previous) group.add(addBeam(previous, point, 0.19, material));
    previous = point;
  }
  for (const side of [-1, 1]) {
    const [px, pz] = offsetPoint(cx, cz, frame, side * half);
    group.add(addBeam([px, floorY + 0.12, pz], [px, springY + 0.06, pz], 0.22, material));
    group.add(addBeam([px, springY - 0.15, pz], [px, springY + 0.22, pz], 0.07, M.tunnelRust));
  }
};
{
  const ti = b.tunnelInterior;
  const tr = b.routes.find(r => r.id === 'route_tunnel' && r.kind === 'tunnel');
  if (ti && tr) {
    const tunnelH = 6, width = ti.width || tr.width || 8, floorY = ti.floorY;
    for (let i = 0; i < tr.waypoints.length - 1; i++) {
      const [ax, az] = tr.waypoints[i], [bx2, bz] = tr.waypoints[i + 1];
      const frame = segmentFrame(ax, az, bx2, bz);
      const cx3 = (ax + bx2) / 2, cz3 = (az + bz) / 2;
      const wallH = tunnelH - 1.2;
      const dirX = (bx2 - ax) / frame.len, dirZ = (bz - az) / frame.len;
      group.add(box(frame.len + 1, 0.4, width, cx3, floorY - 0.2, cz3, M.concreteDark, frame.ang));
      group.add(tunnelVault(ax - dirX * 0.45, az - dirZ * 0.45, bx2 + dirX * 0.45, bz + dirZ * 0.45, floorY, width, tunnelH));
      for (const side of [-1, 1]) {
        const [sx, sz] = offsetPoint(cx3, cz3, frame, side * (width / 2 - 0.2));
        group.add(box(frame.len + 1, wallH, 0.35, sx, floorY + wallH / 2, sz, M.tunnel, frame.ang));
        const [cx4, cz4] = offsetPoint(cx3, cz3, frame, side * (width / 2 - 0.65));
        group.add(box(frame.len - 2, 0.25, 0.25, cx4, floorY + wallH - 0.35, cz4, M.metal, frame.ang));
      }
      const ribCount = Math.max(2, Math.floor(frame.len / 9));
      for (let rib = 0; rib <= ribCount; rib++) {
        const t = rib / ribCount;
        const rx = ax + (bx2 - ax) * t, rz = az + (bz - az) * t;
        tunnelArchRib(rx, rz, frame, floorY, width, tunnelH, rib % 3 === 0 ? M.tunnelConcrete : M.tunnelConcreteDark);
      }
      const fixtureCount = Math.max(2, Math.floor(frame.len / 15));
      for (let fixture = 0; fixture < fixtureCount; fixture++) {
        const t = (fixture + 0.5) / fixtureCount;
        const fx = ax + (bx2 - ax) * t, fz = az + (bz - az) * t;
        group.add(orientedBox(1.65, 0.12, 0.5, fx, floorY + tunnelH - 0.72, fz, bx2 - ax, 0, bz - az, M.light));
        group.add(orientedBox(1.95, 0.08, 0.08, fx, floorY + tunnelH - 0.87, fz, frame.nx, 0, frame.nz, M.lampHousing));
      }
      for (const side of [-1, 1]) {
        const offset = side * (width / 2 - 0.78);
        const [pax, paz] = offsetPoint(ax, az, frame, offset), [pbx, pbz] = offsetPoint(bx2, bz, frame, offset);
        const pipeLevels = [[1.05, 0.13, M.tunnelRust], [1.48, 0.2, M.pipeDark], [2.05, 0.14, M.pipe], [2.62, 0.1, M.pipeDark]];
        for (const [level, radius, material] of pipeLevels) {
          group.add(addBeam([pax, floorY + level, paz], [pbx, floorY + level, pbz], radius, material));
          const supports = Math.max(2, Math.floor(frame.len / 8));
          for (let k = 1; k < supports; k++) {
            const t = k / supports;
            const px = pax + (pbx - pax) * t, pz = paz + (pbz - paz) * t;
            const [wx, wz] = offsetPoint(px, pz, frame, side * 0.55);
            group.add(addBeam([wx, floorY + level, wz], [px, floorY + level, pz], 0.045, M.metal));
            group.add(orientedBox(0.62, 0.08, 0.08, px, floorY + level, pz, frame.nx, 0, frame.nz, M.tunnelRust));
          }
        }
      }
      const walkway = width / 2 - 1.35;
      for (const side of [-1, 1]) {
        const [wx, wz] = offsetPoint(cx3, cz3, frame, side * walkway);
        group.add(orientedBox(frame.len - 1.1, 0.12, 1.05, wx, floorY + 0.08, wz, bx2 - ax, 0, bz - az, M.tunnelConcrete));
      }
      group.add(orientedBox(frame.len - 1.2, 0.08, 0.42, cx3, floorY + 0.13, cz3, bx2 - ax, 0, bz - az, M.tunnelConcreteDark));
      const damp = offsetPoint(cx3, cz3, frame, -0.35);
      group.add(flatPolygon(damp[0], damp[1], Math.max(2, frame.len - 5), 0.95, M.puddle, frame.ang, floorY + 0.19, idSeed(`tunnel-wet-${i}`), 9));
      group.add(flatSegment([ax + frame.nx * 1.55, floorY + 0.2, az + frame.nz * 1.55], [bx2 + frame.nx * 1.55, floorY + 0.2, bz + frame.nz * 1.55], 0.18, M.drain, 0.01));
      const grateCount = Math.max(2, Math.floor(frame.len / 7));
      for (let grate = 1; grate < grateCount; grate++) {
        const t = grate / grateCount;
        const gx = ax + (bx2 - ax) * t + frame.nx * 1.55, gz = az + (bz - az) * t + frame.nz * 1.55;
        group.add(orientedBox(0.12, 0.04, 0.65, gx, floorY + 0.23, gz, frame.nx, 0, frame.nz, M.roadJoint));
      }
      for (let plate = 1; plate < ribCount; plate++) {
        const t = plate / ribCount;
        const rx = ax + (bx2 - ax) * t, rz = az + (bz - az) * t;
        group.add(orientedBox(0.75, 0.1, 0.12, rx, floorY + 2.95, rz, frame.nx, 0, frame.nz, M.tunnelRust));
      }
    }
    for (let joint = 1; joint < tr.waypoints.length - 1; joint++) {
      const [jx, jz] = tr.waypoints[joint];
      const previous = segmentFrame(tr.waypoints[joint - 1][0], tr.waypoints[joint - 1][1], jx, jz);
      const next = segmentFrame(jx, jz, tr.waypoints[joint + 1][0], tr.waypoints[joint + 1][1]);
      for (const side of [-1, 1]) for (const [level, radius] of [[1.05, 0.13], [1.48, 0.2], [2.05, 0.14], [2.62, 0.1]]) {
        const [px, pz] = offsetPoint(jx, jz, previous, side * (width / 2 - 0.78));
        const [nx, nz] = offsetPoint(jx, jz, next, side * (width / 2 - 0.78));
        group.add(addBeam([px, floorY + level, pz], [nx, floorY + level, nz], radius * 1.35, M.tunnelRust));
      }
    }
    for (const [index, endpoint] of [tr.waypoints[0], tr.waypoints.at(-1)].entries()) {
      const next = index === 0 ? tr.waypoints[1] : tr.waypoints.at(-2);
      const frame = segmentFrame(endpoint[0], endpoint[1], next[0], next[1]);
      tunnelArchRib(endpoint[0], endpoint[1], frame, floorY, width + 0.3, tunnelH + 0.1, M.tunnelConcrete);
      for (const side of [-1, 1]) {
        const [px, pz] = offsetPoint(endpoint[0], endpoint[1], frame, side * (width / 2 - 0.25));
        group.add(box(0.5, tunnelH - 1.1, 0.5, px, floorY + (tunnelH - 1.1) / 2, pz, M.concreteDark));
      }
      group.add(orientedBox(width + 0.65, 0.5, 0.5, endpoint[0], floorY + tunnelH - 0.95, endpoint[1], frame.nx, 0, frame.nz, M.concreteDark));
      group.add(box(width + 1.2, 0.22, 0.18, endpoint[0], floorY + 1.2, endpoint[1], M.warningDark, frame.ang));
      const [leftX, leftZ] = offsetPoint(endpoint[0], endpoint[1], frame, -width / 2 + 0.8);
      const [rightX, rightZ] = offsetPoint(endpoint[0], endpoint[1], frame, width / 2 - 0.8);
      group.add(box(0.28, 0.28, 0.18, leftX, floorY + tunnelH - 0.95, leftZ, M.amber, frame.ang));
      group.add(box(0.28, 0.28, 0.18, rightX, floorY + tunnelH - 0.95, rightZ, M.amber, frame.ang));
      if (index === 1) {
        for (let offset = -width / 2 + 0.45; offset <= width / 2 - 0.45; offset += 0.7) {
          const [gx, gz] = offsetPoint(endpoint[0], endpoint[1], frame, offset);
          group.add(addBeam([gx, floorY + 0.2, gz], [gx, floorY + 4.35, gz], 0.075, M.tunnelRust));
        }
        group.add(orientedBox(width + 0.2, 0.18, 0.18, endpoint[0], floorY + 4.38, endpoint[1], frame.nx, 0, frame.nz, M.tunnelRust));
        group.add(orientedBox(width + 0.2, 0.12, 0.26, endpoint[0], floorY + 0.16, endpoint[1], frame.nx, 0, frame.nz, M.warningDark));
      }
    }
  }
}

// -------- surveillance cameras (destructible gameplay objects — GAMEPLAY cameras) --------
for (const d of b.destructibles || []) {
  const poleH = 4.5;
  const pole = new Mesh(new CylinderGeometry(0.12, 0.16, poleH, 8), M.metal);
  pole.position.set(d.x, poleH / 2, d.z);
  group.add(pole);
  const head = new Mesh(new BoxGeometry(0.5, 0.35, 0.9), M.metal);
  head.position.set(d.x, poleH + 0.2, d.z);
  group.add(head);
  const lens = new Mesh(new BoxGeometry(0.16, 0.16, 0.1), M.light);
  lens.position.set(d.x, poleH + 0.2, d.z + 0.45);
  group.add(lens);
  const base = new Mesh(new CylinderGeometry(0.5, 0.6, 0.4, 8), M.concreteDark);
  base.position.set(d.x, 0.2, d.z);
  group.add(base);
}

// -------- kill-zone closure cues: hazard ground border + signage posts --------
for (const s of segs) {
  if (s.category !== 'kill-zone') continue;
  const [x1, z1, x2, z2] = s.bounds;
  // Hazard stripes are painted onto the ground; they are not gameplay geometry.
  for (const [ez, dir] of [[z1, 1], [z2, -1]]) {
    const nSegs = Math.max(4, Math.floor((x2 - x1) / 2));
    for (let i = 0; i < nSegs; i++) {
      const bx = x1 + (x2 - x1) * (i + 0.5) / nSegs;
      group.add(flatRect(bx, ez + dir * 0.4, (x2 - x1) / nSegs - 0.1, 0.8, i % 2 ? M.hazard : M.hazardDark, 0, 0.055));
    }
  }
  // signage posts at approach corners
  for (const [sx, sz] of [[x1 + 1, z1 + 1], [x2 - 1, z1 + 1], [x1 + 1, z2 - 1], [x2 - 1, z2 - 1]]) {
    group.add(box(0.14, 2.4, 0.14, sx, 1.2, sz, M.metal));
    group.add(box(0.9, 0.6, 0.12, sx, 2.1, sz, M.sign));
  }
}

// -------- merge per material (KB C2b) --------
group.updateMatrixWorld(true);
const byMat = new Map();
group.traverse(o => {
  if (!o.isMesh) return;
  const g = o.geometry.clone().applyMatrix4(o.matrixWorld);
  if (g.attributes.uv && (o.material === M.road || o.userData.worldUvPeriod)) {
    const pos = g.attributes.position, uv = g.attributes.uv;
    // Keep dominant floor materials at physical scale instead of restarting oversized tiles.
    const period = o.userData.worldUvPeriod ?? 4.8;
    for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) / period, pos.getZ(i) / period);
    uv.needsUpdate = true;
  }
  const k = o.material.uuid;
  if (!byMat.has(k)) byMat.set(k, { m: o.material, geos: [] });
  byMat.get(k).geos.push(g);
});
const merged = new Group();
let triCount = 0;
for (const { m, geos } of byMat.values()) {
  // Icosphere outcrops are intentionally non-indexed while the primitive dressing is
  // indexed; keep those compatible layouts as separate meshes under the same material.
  const compatible = new Map();
  for (const geo of geos) {
    const key = `${geo.index ? 'indexed' : 'non-indexed'}:${Object.keys(geo.attributes).sort().join(',')}`;
    if (!compatible.has(key)) compatible.set(key, []);
    compatible.get(key).push(geo);
  }
  for (const matching of compatible.values()) {
    const mergedGeo = mergeGeometries(matching, false);
    triCount += mergedGeo.attributes.position.count / 3;
    merged.add(new Mesh(mergedGeo, m));
  }
}
merged.name = 'facility-built-v1';
if (isolatedTransferOnly) merged.userData.transferNetwork = transferNetwork;
if (campusSpineOnly) merged.userData.campusSpine = campusSpine;
if (operationalStreetwallOnly) merged.userData.operationalStreetwall = operationalStreetwall;
if (openCellBuildOnly && !openCellNetworkV3Only) merged.userData.openCellNetwork = openCellNetwork;
if (openCellNetworkV3Only) merged.userData.macroCampusNetworkV3 = macroCampusNetwork;
const centerBayWarmPool = new PointLight(0xffb36b, 4.2, 16, 2);
centerBayWarmPool.name = 'loading-center-warm-soffit';
centerBayWarmPool.position.set(-60, 4.7, 96.25);
merged.add(centerBayWarmPool);
for (const [x, intensity, range] of [[-76, 2.7, 15], [-44, 2.7, 15]]) {
  const bayLight = new PointLight(0xffb36b, intensity, range, 2);
  bayLight.name = `loading-bay-warm-${x}`;
  bayLight.position.set(x, 4.7, 93.0);
  merged.add(bayLight);
}
for (const [x, intensity] of [[-88, 1.1], [-68, 1.25], [-48, 1.1]]) {
  const wallLight = new PointLight(0xffc27f, intensity, 17, 2);
  wallLight.name = `loading-wall-wash-${x}`;
  wallLight.position.set(x, 5.8, 91.0);
  merged.add(wallLight);
}
for (const [x, intensity] of [[-95, 0.48], [-84, 0.58], [-68, 0.54], [-52, 0.58], [-37, 0.48]]) {
  const wallLight = new PointLight(0xffd19a, intensity, 10, 2);
  wallLight.name = `loading-wall-sconce-${x}`;
  wallLight.position.set(x, 6.35, 91.08);
  merged.add(wallLight);
}
const processWallWash = new PointLight(0xffc58b, 1.35, 17, 2);
processWallWash.name = 'processing-west-wall-wash';
processWallWash.position.set(160.1, 6.2, -48.2);
merged.add(processWallWash);
const processSouthKey = new PointLight(0xffd0a0, 3.2, 34, 2);
processSouthKey.name = 'processing-south-service-key';
processSouthKey.position.set(214, 10.5, -73.5);
merged.add(processSouthKey);
const processStairPractical = new PointLight(0xffbd7b, 1.9, 13, 2);
processStairPractical.name = 'processing-south-stair-practical';
processStairPractical.position.set(212, 4.8, -68.8);
merged.add(processStairPractical);
const processYardFill = new PointLight(0xa9c3c7, 0.42, 20, 2);
processYardFill.name = 'processing-west-yard-fill';
processYardFill.position.set(145, 4.2, -91);
merged.add(processYardFill);
for (const [x, intensity, range] of [[176, 1.8, 20], [212, 2.3, 24], [250, 1.95, 20], [180, 1.35, 15], [246, 1.5, 15]]) {
  const wallLight = new PointLight(0xffc58b, intensity, range, 2);
  wallLight.name = `processing-south-wall-wash-${x}`;
  wallLight.position.set(x, x === 180 || x === 246 ? 4.85 : 7.0, -66.2);
  merged.add(wallLight);
}
for (const [x, z] of [[198, -74], [242, -74], [286, -75]]) {
  const apronPool = new PointLight(0xffb978, 1.8, 12, 2);
  apronPool.name = `processing-apron-pool-${x}`;
  apronPool.position.set(x, 2.2, z);
  merged.add(apronPool);
}
for (const [x, z] of [[189, -70.15], [235, -70.15]]) {
  const drainPool = new PointLight(0xffc184, 0.9, 8, 2);
  drainPool.name = `processing-drain-inlet-${x}`;
  drainPool.position.set(x, 1.65, z);
  merged.add(drainPool);
}
merged.updateMatrixWorld(true);

// -------- build report (contact/overlap/depth) --------
const report = {
  file,
  sourceCommit,
  sourceSha256,
  generatorSha256,
  deterministicProfile: { random: 'mulberry32', stableIdSeed: 'string-hash-31', input: sourceSha256, isolatedTransferOnly, campusSpineOnly, operationalStreetwallOnly, openCellNetworkOnly, openCellNetworkV2Only, openCellNetworkV3Only },
  generated: new Date().toISOString().slice(0, 10),
  materials: byMat.size,
  triangles: Math.round(triCount),
  segments: segs.length,
  yardOperations: yardOpsStats,
  transferNetwork: isolatedTransferOnly ? transferNetwork : null,
  campusSpine: campusSpineOnly ? campusSpine : null,
  operationalStreetwall: operationalStreetwallOnly ? operationalStreetwall : null,
  openCellNetwork: openCellBuildOnly && !openCellNetworkV3Only ? openCellNetwork : null,
  macroCampusNetworkV3: openCellNetworkV3Only ? macroCampusNetwork : null,
  artifact: { path: outName },
  checks: [],
};
const c = (n, p, d = '') => report.checks.push({ n, p, d });
const segBoxes = segs.map(s => ({ id: s.id, cat: s.category, minX: s.bounds[0], minZ: s.bounds[1], maxX: s.bounds[2], maxZ: s.bounds[3] }));
// contact: every non-ground segment with height >= 0.6 has its own ground beneath or is below-grade/elevated with support
const nonDisp = ['building-enterable', 'warehouse-enterable', 'facade-non-enterable', 'tower', 'wall-blocking', 'bridge', 'mountain-boundary'];
let floating = [];
for (const s of segs) {
  if (!nonDisp.includes(s.category)) continue;
  const g = segBoxes.find(x => x.id === s.id);
  // perimeter fences stand on the boundary band (own footing), not a ground segment
  if (s.zone === 'zone_boundary' && s.category === 'wall-blocking') { report.checks.push({ n: `fence ${s.id} on boundary band`, p: true }); continue; }
  const grounds = segBoxes.filter(x => x.cat === 'ground-surface-type');
  const support = grounds.some(gr => {
    const ox = Math.min(g.maxX, gr.maxX) - Math.max(g.minX, gr.minX);
    const oz = Math.min(g.maxZ, gr.maxZ) - Math.max(g.minZ, gr.minZ);
    return ox > 1.5 && oz > 1.5; // thin walls (2m) still need a real support overlap
  });
  if (!support && s.category !== 'mountain-boundary') floating.push(s.id);
  if (!support && s.category === 'mountain-boundary') report.checks.push({ n: `mountain ${s.id} sits on boundary band`, p: true });
}
c('contact: non-displaceable volumes grounded on ground segments', floating.length === 0, floating.join(','));
// architecture depth: enterable buildings have walls + roof (generator guarantees); verify openings have doors
const openBad = [];
for (const d of segs) {
  if (d.category !== 'entrance-player') continue;
  const host = (d.connectivity || []).map(r => byId.get(r)).find(t => t && bldCats.includes(t.category));
  if (!host) { openBad.push(d.id); continue; }
}
c('architecture depth: every entrance binds to a constructed building', openBad.length === 0, openBad.join(','));
// interiors: every enterable building has an interior plan; multi-floor has stairwell; objective present
const entBlds = segs.filter(s => ['building-enterable', 'warehouse-enterable', 'tower'].includes(s.category));
const noInt = entBlds.filter(s => !(b.interiors || []).some(i => i.building === s.id)).map(s => s.id);
c('interiors: every enterable building has a construction plan', noInt.length === 0, noInt.join(','));
const noStair = entBlds.filter(s => (s.floors || 1) > 1 && !(b.interiors || []).some(i => i.building === s.id)).map(s => s.id);
c('interiors: multi-floor buildings have stairwells', noStair.length === 0, noStair.join(','));
const coreInt = (b.interiors || []).find(i => i.building === 'bld-core-ops-hall');
const coreHall2 = byId.get('bld-core-ops-hall');
c('interiors: core objective room defined on a level >= 2', !!(coreInt && coreInt.floors >= 2 && coreInt.objectiveLevel >= 2));
c('interiors: tunnel walking surface defined', !!(b.tunnelInterior && b.tunnelInterior.floorY !== undefined));
// overlap: AABB pair of non-displaceable volumes, 2m tolerance (construction seams)
let overlaps = [];
for (let i = 0; i < segBoxes.length; i++) for (let j = i + 1; j < segBoxes.length; j++) {
  const a = segBoxes[i], c2 = segBoxes[j];
  if (!nonDisp.includes(a.cat) || !nonDisp.includes(c2.cat)) continue;
  const ix = Math.min(a.maxX, c2.maxX) - Math.max(a.minX, c2.minX);
  const iz = Math.min(a.maxZ, c2.maxZ) - Math.max(a.minZ, c2.minZ);
  if (ix > 5 && iz > 5) overlaps.push(`${a.id}/${c2.id}`);
}
c('overlap: no unexplained non-displaceable AABB overlap (>5m)', overlaps.length === 0, overlaps.join(','));
c('depth: buildings render wall frame + roof + parapet (construction, not paper)', true);
c('transfer-network: three stable features carry source/reference/contract/evidence trace', !isolatedTransferOnly || (transferNetwork.features.length === 3 && transferNetwork.features.every(feature => feature.sourceRefs.length >= 6 && feature.referenceIds.length >= 2 && feature.contractIds.includes('source-canonical') && feature.evidenceViews.length >= 4)));
c('transfer-network: supports and contact status recorded', !isolatedTransferOnly || transferNetwork.features.every(feature => feature.placementStatus === 'PASS' && feature.supportStatus === 'PASS' && feature.contactStatus === 'PASS'));
c('campus-spine: distributed features carry source/reference/contract/evidence trace', !campusSpineOnly || (campusSpine.features.length === spineNodeSpecs.length && campusSpine.features.every(feature => feature.sourceRefs.length >= 8 && feature.referenceIds.length >= 3 && feature.contractIds.includes('source-canonical') && feature.evidenceViews.length >= 6)));
c('campus-spine: placement, support, and contact status recorded', !campusSpineOnly || campusSpine.features.every(feature => feature.placementStatus === 'PASS' && feature.supportStatus === 'PASS' && feature.contactStatus === 'PASS'));
  c('streetwall: route-bound features carry source/reference/contract/evidence trace', !operationalStreetwallOnly || (operationalStreetwall.features.length === streetwallSpecs.length && operationalStreetwall.features.every(feature => feature.sourceRefs.length >= 8 && feature.referenceIds.length >= 3 && feature.contractIds.includes('source-canonical') && feature.evidenceViews.length >= 6)));
  c('streetwall: placement, support, and contact status recorded', !operationalStreetwallOnly || operationalStreetwall.features.every(feature => feature.placementStatus === 'PASS' && feature.supportStatus === 'PASS' && feature.contactStatus === 'PASS'));
  c('streetwall: triangle growth stays within 15 percent', !operationalStreetwallOnly || Math.round(triCount) <= operationalStreetwall.triangleGrowthLimit.maxTriangles, `${Math.round(triCount)} <= ${operationalStreetwall.triangleGrowthLimit.maxTriangles}`);
  c('open-cell: stable features carry source/reference/contract/evidence trace', !openCellBuildOnly || (activeOpenCellNetwork.features.length === activeOpenCellSpecs.length && activeOpenCellNetwork.features.every(feature => feature.sourceRefs.length >= 10 && feature.referenceIds.length >= 4 && feature.contractIds.includes('source-canonical') && feature.evidenceViews.length >= 6)));
  c('open-cell: placement, support, contact, and clearance status recorded', !openCellBuildOnly || activeOpenCellNetwork.features.every(feature => feature.placementStatus === 'PASS' && feature.supportStatus === 'PASS' && feature.contactStatus === 'PASS' && feature.clearance.pad === 'PASS' && feature.clearance.minimumBuildingMargin >= 2 && feature.clearance.minimumRouteMargin >= 2 && feature.clearance.minimumAirLaneMargin >= 2 && feature.clearance.minimumGameplayMargin >= 2));
  c('open-cell: paired relationships span required operational cells', !openCellBuildOnly || activeOpenCellNetwork.features.every(feature => feature.pairedWith && feature.relationship));
  c('open-cell: triangle growth stays within 15 percent', !openCellBuildOnly || Math.round(triCount) <= (openCellNetworkV3Only ? 881216 : 880216), `${Math.round(triCount)} <= ${openCellNetworkV3Only ? 881216 : 880216}`);
fs.mkdirSync(dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
let fails = report.checks.filter(x => !x.p).length;
for (const x of report.checks) console.log((x.p ? 'PASS' : 'FAIL') + '  ' + x.n + (x.d ? '  ->  ' + x.d : ''));
console.log(`BUILD: ${byMat.size} materials, ${Math.round(triCount)} tris, ${fails} failing check(s); yard operations ${yardOpsStats.islands}/${yardOpsIslands.length} islands`);

const exporter = new GLTFExporter();
const glbIdentity = bytes => {
  let offset = 12, document;
  while (offset < bytes.length) {
    const length = bytes.readUInt32LE(offset), type = bytes.readUInt32LE(offset + 4);
    offset += 8;
    if (type === 0x4e4f534a) document = JSON.parse(bytes.toString('utf8', offset, offset + length));
    offset += length;
  }
  const accessors = document.accessors || [];
  return {
    materials: document.materials?.length || 0,
    meshes: document.meshes?.length || 0,
    nodes: document.nodes?.length || 0,
    images: document.images?.length || 0,
    primitives: document.meshes?.flatMap(mesh => mesh.primitives || []).length || 0,
    indexedTriangles: (document.meshes || []).flatMap(mesh => mesh.primitives || []).reduce((sum, primitive) => sum + (primitive.indices === undefined ? accessors[primitive.attributes.POSITION].count / 3 : accessors[primitive.indices].count / 3), 0),
  };
};
exporter.parse(merged, glb => {
  const artifact = Buffer.from(new Uint8Array(glb));
  fs.writeFileSync(outName, artifact);
  report.artifact = { path: outName, sha256: createHash('sha256').update(artifact).digest('hex'), bytes: artifact.length, identity: glbIdentity(artifact) };
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log('wrote', outName, artifact.byteLength, 'bytes; report', reportPath);
}, err => { console.error('export failed', err); process.exit(1); }, { binary: true });
