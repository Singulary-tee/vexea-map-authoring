#!/usr/bin/env node
// Capture the canonical authored-view survey from the current built GLB.
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { basename, join, relative, resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { request } from 'node:http';
import { deflateSync } from 'node:zlib';

const root = resolve(new URL('..', import.meta.url).pathname);
const local = join(root, 'node_modules');
const require = createRequire(existsSync(local) ? local : '/workspaces/vexea-international/node_modules/');
const { chromium } = require('playwright');

const port = Number(process.env.SURVEY_PORT || 8123);
const viewportWidth = Number(process.env.SURVEY_WIDTH || 1400);
const viewportHeight = Number(process.env.SURVEY_HEIGHT || 900);
const screenshotTimeoutMs = Number(process.env.SURVEY_SCREENSHOT_TIMEOUT_MS || 12000);
const captureMode = process.env.SURVEY_CAPTURE_MODE || 'pixels';
const cdpPort = Number(process.env.SURVEY_CDP_PORT || 0);
const loadTimeoutMs = Number(process.env.SURVEY_LOAD_TIMEOUT_MS || 180000);
const performanceMode = process.env.SURVEY_PERF === '1';
const performanceTimeoutMs = Number(process.env.PERF_VIEW_TIMEOUT_MS || 30000);
const performanceFrames = Number(process.env.PERF_SAMPLE_FRAMES || 90);
const lateFrameDelayMs = Number(process.env.PERF_LATE_DELAY_MS || 1200);
const sourcePath = resolve(root, process.env.SURVEY_SOURCE_PATH || 'blockout/blockout-full-v1.json');
const generatorPath = resolve(root, process.env.SURVEY_GENERATOR_PATH || 'tools/gen-build-map.mjs');
const artifactPath = resolve(root, process.env.SURVEY_ARTIFACT_PATH || 'editor/facility-built.glb');
const surveyOutputDir = resolve(root, process.env.SURVEY_OUTPUT_DIR || 'artifacts');
const surveyManifestPath = resolve(root, process.env.SURVEY_MANIFEST_PATH || 'out/visual-survey.json');
const buildReportPath = resolve(root, process.env.SURVEY_BUILD_REPORT_PATH || 'out/build-report.json');
const temporaryPage = join(root, 'editor/.built-survey.html');
const artifactUrl = relative(join(root, 'editor'), artifactPath).split('\\').join('/');
mkdirSync(surveyOutputDir, { recursive: true });
const artifactSha256 = createHash('sha256').update(readFileSync(artifactPath)).digest('hex');
const generatorSha256 = createHash('sha256').update(readFileSync(generatorPath)).digest('hex');
const sourceSha256 = createHash('sha256').update(readFileSync(sourcePath)).digest('hex');
const crc32 = bytes => {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
};
const pngChunk = (type, data) => {
  const name = Buffer.from(type), body = Buffer.from(data), chunk = Buffer.alloc(12 + body.length);
  chunk.writeUInt32BE(body.length, 0); name.copy(chunk, 4); body.copy(chunk, 8);
  chunk.writeUInt32BE(crc32(Buffer.concat([name, body])), 8 + body.length);
  return chunk;
};
const encodeRgbaPng = (pixels, width, height) => {
  const scan = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    scan[y * (width * 4 + 1)] = 0;
    const sourceOffset = (height - 1 - y) * width * 4;
    Buffer.from(pixels.buffer, pixels.byteOffset + sourceOffset, width * 4).copy(scan, y * (width * 4 + 1) + 1);
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0); header.writeUInt32BE(height, 4); header[8] = 8; header[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk('IHDR', header), pngChunk('IDAT', deflateSync(scan, { level: 6 })), pngChunk('IEND', []),
  ]);
};

const html = `<!doctype html>
<html><head><meta charset="utf-8"><style>html,body{margin:0;height:100%;overflow:hidden;background:#a8bdd2}canvas{display:block}</style>
<script type="importmap">{"imports":{"three":"/node_modules/three/build/three.module.js","three/addons/":"/node_modules/three/examples/jsm/"}}</script></head>
<body><script type="module">
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
const scene = new THREE.Scene();
const SKY = new THREE.Color(0xa8bdd2);
scene.background = SKY;
scene.fog = new THREE.FogExp2(SKY, 0.00035);
const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'low-power', preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(${viewportWidth}, ${viewportHeight}, false);
renderer.setClearColor(SKY, 1);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
document.body.appendChild(renderer.domElement);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.14;
pmrem.dispose();
scene.add(new THREE.HemisphereLight(0xc0d0d4, 0x333832, 0.6));
scene.add(new THREE.AmbientLight(0xb8c4bc, 0.18));
const sun = new THREE.DirectionalLight(0xfff0d5, 2.7);
sun.position.set(-450, 380, 320);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
sun.shadow.camera.left = -700;
sun.shadow.camera.right = 700;
sun.shadow.camera.top = 700;
sun.shadow.camera.bottom = -700;
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 1800;
sun.shadow.bias = -0.0005;
sun.shadow.normalBias = 0.02;
scene.add(sun);
const fill = new THREE.DirectionalLight(0x9bb8ba, 0.42);
fill.position.set(120, 180, -300);
const frontKey = new THREE.DirectionalLight(0xe2c8a9, 3.0);
frontKey.position.set(-330, 260, -260);
scene.add(fill, frontKey);
for (const [x, y, z, intensity, distance] of [
  [48, 7, -254, 4.5, 38], [48, 6.2, -270, 3.0, 32], [32, 6.8, -231, 2.0, 30],
  [-96, 6.2, 74, 2.0, 30], [-72, 6.2, 54, 2.0, 30], [-48, 6.2, 36, 2.0, 30],
  [-66, 6.2, 34, 2.2, 28], [-92, 6.2, 92, 2.0, 30], [-68, 6.2, 92, 2.0, 30],
  [-44, 6.2, 92, 2.0, 30], [-91, 6.3, 114, 1.6, 24], [-40, 6.3, 114, 1.6, 24],
  [42, 5, -157, 2.0, 24], [56, 4.3, -145, 1.6, 22],
  [70, -11.7, -198, 1.5, 22], [150, -11.7, -202, 1.5, 22], [230, -11.7, -207, 1.5, 22],
]) {
  const light = new THREE.PointLight(0xffbd7b, intensity, distance, 2);
  light.position.set(x, y, z);
  scene.add(light);
}
const cam = new THREE.PerspectiveCamera(50, ${viewportWidth} / ${viewportHeight}, 0.1, 4000);
const ortho = new THREE.OrthographicCamera(-560, 560, 360, -360, 1, 3000);
const topTarget = new THREE.Vector3(5, 0, 10);
let active = cam;
let model;
let xray = false;
let rendering = true;
let frameSerial = 0;
let routeMotion = null;
const xrayMaterials = new Map();
function setXray(value) {
  if (value === xray) return;
  xray = value;
  if (!model) return;
  model.traverse(object => {
    if (!object.isMesh || !object.material) return;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of materials) {
      if (value) {
        if (!xrayMaterials.has(material)) xrayMaterials.set(material, {
          transparent: material.transparent,
          opacity: material.opacity,
          depthWrite: material.depthWrite,
          wireframe: material.wireframe,
          color: material.color?.getHex(),
        });
        material.transparent = false;
        material.opacity = 1;
        material.depthWrite = true;
        material.wireframe = false;
        material.color?.set(0x58d4e7);
        material.needsUpdate = true;
      } else {
        const original = xrayMaterials.get(material);
        if (!original) continue;
        material.transparent = original.transparent;
        material.opacity = original.opacity;
        material.depthWrite = original.depthWrite;
        material.wireframe = original.wireframe;
        if (original.color !== undefined) material.color?.setHex(original.color);
        material.needsUpdate = true;
      }
    }
  });
}
function top() {
  active = ortho;
  ortho.position.set(5, 900, 10);
  ortho.up.set(0, 0, 1);
  ortho.lookAt(topTarget);
}
function orbit() {
  active = cam;
  cam.position.set(-760, 470, 720);
  cam.lookAt(topTarget);
}
function pose(x, y, z, tx, ty, tz) {
  active = cam;
  cam.position.set(x, y, z);
  cam.lookAt(tx, ty, tz);
}
const ROUTE = [[-292, 170], [-240, 160], [-160, 150], [-60, 120], [0, 100], [60, 60], [120, 0], [140, -60], [110, -110], [100, -160], [100, -210], [40, -214], [20, -222], [20, -228]];
function moveRoute(durationMs = 6000) {
  routeMotion = { started: performance.now(), duration: durationMs };
}
function stopRoute() {
  routeMotion = null;
}
function updateRouteMotion(now) {
  if (!routeMotion) return;
  const progress = ((now - routeMotion.started) % routeMotion.duration) / routeMotion.duration;
  const scaled = progress * (ROUTE.length - 1);
  const index = Math.min(ROUTE.length - 2, Math.floor(scaled));
  const local = scaled - index;
  const p = ROUTE[index], q = ROUTE[index + 1];
  const x = p[0] + (q[0] - p[0]) * local;
  const z = p[1] + (q[1] - p[1]) * local;
  const next = ROUTE[Math.min(index + 2, ROUTE.length - 1)];
  pose(x, 1.7, z, next[0], 3.2, next[1]);
}
function metrics() {
  return { frameSerial, calls: renderer.info.render.calls, triangles: renderer.info.render.triangles };
}
async function measureVisible(sampleFrames, lateDelay, timeoutMs) {
  const startedAt = performance.now();
  const waitForFrames = (count) => new Promise(resolveWait => {
    const startFrame = frameSerial;
    const check = () => {
      if (frameSerial - startFrame >= count) return resolveWait({ frames: frameSerial - startFrame, elapsedMs: performance.now() - startedAt });
      if (performance.now() - startedAt >= timeoutMs) return resolveWait(null);
      setTimeout(check, 25);
    };
    check();
  });
  const steady = await waitForFrames(sampleFrames);
  if (!steady) return { status: 'blocked', frames: frameSerial, timeoutMs };
  const lateStart = performance.now();
  await new Promise(resolveDelay => setTimeout(resolveDelay, lateDelay));
  const late = await waitForFrames(Math.max(30, Math.round(sampleFrames / 3)));
  if (!late) return { status: 'blocked', frames: steady.frames, timeoutMs, lateFrameTimeout: true };
  return {
    status: 'pass',
    frames: steady.frames,
    avgFrameMs: +(steady.elapsedMs / steady.frames).toFixed(2),
    lateFrames: late.frames,
    lateAvgFrameMs: +((performance.now() - lateStart) / late.frames).toFixed(2),
    drawCalls: renderer.info.render.calls,
    triangles: renderer.info.render.triangles,
  };
}
const renderOnce = () => {
  scene.updateMatrixWorld(true);
  active.updateMatrixWorld(true);
  renderer.render(scene, active);
  renderer.getContext().flush();
};
const freeze = () => { rendering = false; renderOnce(); };
const resume = () => { if (!rendering) { rendering = true; render(); } };
const readPixels = () => {
  const gl = renderer.getContext();
  const width = renderer.domElement.width, height = renderer.domElement.height;
  const pixels = new Uint8Array(width * height * 4);
  gl.finish();
  gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
  let binary = '';
  for (let offset = 0; offset < pixels.length; offset += 0x8000) binary += String.fromCharCode(...pixels.subarray(offset, Math.min(offset + 0x8000, pixels.length)));
  return {
    width,
    height,
    base64: btoa(binary),
    sample: Array.from(pixels.subarray(0, 4)),
    clear: Array.from(gl.getParameter(gl.COLOR_CLEAR_VALUE)),
    contextLost: gl.isContextLost(),
    metrics: { calls: renderer.info.render.calls, triangles: renderer.info.render.triangles },
  };
};
window.__survey = { top, orbit, pose, xray: setXray, freeze, resume, readPixels, moveRoute, stopRoute, metrics, measureVisible };
new GLTFLoader().load('${artifactUrl}', loaded => {
  model = loaded.scene;
  model.traverse(object => { if (object.isMesh) { object.castShadow = true; object.receiveShadow = true; } });
  scene.add(model);
  top();
  window.__ready = true;
}, undefined, error => { window.__error = String(error); });
function render(now) {
  if (!rendering) return;
  requestAnimationFrame(render);
  updateRouteMotion(now);
  renderOnce();
  frameSerial += 1;
}
render();
</script></body></html>`;

const views = [
  { id: 'top', mode: 'top', path: 'artifacts/canonical-top.png', camera: { kind: 'orthographic', position: [5, 900, 10], target: [5, 0, 10] } },
  { id: 'orbit', mode: 'orbit', path: 'artifacts/canonical-orbit.png', camera: { kind: 'perspective', position: [-760, 470, 720], target: [5, 0, 10] } },
  { id: 'xray', mode: 'xray-top', path: 'artifacts/canonical-xray.png', camera: { kind: 'orthographic', position: [5, 900, 10], target: [5, 0, 10] } },
  { id: 'zone-spawn', mode: 'pose', path: 'artifacts/canonical-zone-spawn.png', zone: 'zone_spawn', camera: { position: [-310, 1.7, 214], target: [-236, 4.5, 176] } },
  { id: 'zone-courtyard', mode: 'pose', path: 'artifacts/canonical-zone-courtyard.png', zone: 'zone_courtyard', camera: { position: [-105, 1.7, 119], target: [-64, 5.0, 82] } },
  { id: 'zone-warehouse', mode: 'pose', path: 'artifacts/canonical-zone-warehouse.png', zone: 'zone_warehouse', camera: { position: [-164, 1.7, 34], target: [-118, 5.0, -10] } },
  { id: 'zone-plant', mode: 'pose', path: 'artifacts/canonical-zone-plant.png', zone: 'zone_plant', camera: { position: [188, 1.7, -92], target: [238, 6.0, -48] } },
  { id: 'zone-bridge', mode: 'pose', path: 'artifacts/canonical-zone-bridge.png', zone: 'zone_bridge', camera: { position: [250, 1.7, 112], target: [292, 8.0, 62] } },
  { id: 'zone-tunnels', mode: 'pose', path: 'artifacts/canonical-zone-tunnels.png', zone: 'zone_tunnels', camera: { position: [72, -11.9, -198], target: [160, -11.2, -201] } },
  { id: 'zone-core', mode: 'pose', path: 'artifacts/canonical-zone-core.png', zone: 'zone_core', camera: { position: [40, 1.7, -190], target: [48, 7.0, -248] } },
  { id: 'zone-boundary', mode: 'pose', path: 'artifacts/canonical-zone-boundary.png', zone: 'zone_boundary', camera: { position: [-40, 1.7, 292], target: [90, 6.0, 310] } },
  { id: 'route-main-surface', mode: 'pose', path: 'artifacts/canonical-route-main-surface.png', route: 'route_main_surface', camera: { position: [-242, 1.7, 160], target: [-160, 3.2, 150] } },
  { id: 'route-covered', mode: 'pose', path: 'artifacts/canonical-route-covered.png', route: 'route_covered', camera: { position: [-102, 1.7, 70], target: [-40, 3.0, 30] } },
  { id: 'route-rear-alley', mode: 'pose', path: 'artifacts/canonical-route-rear-alley.png', route: 'route_rear_alley', camera: { position: [-180, 1.7, 125], target: [-100, 4.0, 110] } },
  { id: 'route-north-ring', mode: 'pose', path: 'artifacts/canonical-route-north-ring.png', route: 'route_north_ring', camera: { position: [100, 1.7, 105], target: [158, 4.0, 70] } },
  { id: 'route-south-retreat', mode: 'pose', path: 'artifacts/canonical-route-south-retreat.png', route: 'route_south_retreat', camera: { position: [100, 1.7, -120], target: [220, 4.0, -160] } },
  { id: 'route-flank-backdoor', mode: 'pose', path: 'artifacts/canonical-route-flank-backdoor.png', route: 'route_flank_backdoor', camera: { position: [148, 1.7, -222], target: [148, 4.0, -245] } },
  { id: 'objective-core', mode: 'pose', path: 'artifacts/canonical-objective-core.png', requirement: 'objective', camera: { position: [40, 5.7, -250], target: [48, 5.7, -258] } },
  { id: 'cover-courtyard', mode: 'pose', path: 'artifacts/canonical-cover-courtyard.png', requirement: 'cover', camera: { position: [-82, 1.7, 16], target: [-48, 2.0, 12] } },
  { id: 'tunnel-portal', mode: 'pose', path: 'artifacts/canonical-tunnel-portal.png', requirement: 'tunnel', camera: { position: [44, -11.2, -196], target: [90, -10.7, -198] } },
  { id: 'vertical-connector', mode: 'pose', path: 'artifacts/canonical-vertical-connector.png', requirement: 'vertical connector', camera: { position: [302, 1.7, 82], target: [316, 5.2, 62] } },
];
const requestedViewIds = process.env.SURVEY_VIEWS?.split(',').map(value => value.trim()).filter(Boolean) || null;
const selectedViews = requestedViewIds ? views.filter(view => requestedViewIds.includes(view.id)) : views;
if (!selectedViews.length) throw new Error(`no survey views matched SURVEY_VIEWS=${process.env.SURVEY_VIEWS}`);
const outputPathFor = view => join(surveyOutputDir, basename(view.path));

const waitForServer = () => new Promise((resolveWait, reject) => {
  const started = Date.now();
  const probe = () => request({ host: '127.0.0.1', port, path: '/editor/.built-survey.html' }, response => {
    response.resume();
    if (response.statusCode === 200) resolveWait();
    else retry();
  }).on('error', retry).end();
  const retry = () => {
    if (Date.now() - started > 10000) reject(new Error('survey server did not start'));
    else setTimeout(probe, 100);
  };
  probe();
});

let server;
let browser;
let page;
let ownsBrowser = false;
try {
  writeFileSync(temporaryPage, html);
  server = spawn('python3', ['-m', 'http.server', String(port), '--directory', root], { stdio: 'ignore' });
  await waitForServer();
  if (cdpPort) {
    browser = await chromium.connectOverCDP(`http://127.0.0.1:${cdpPort}`);
    const context = browser.contexts()[0];
    if (!context) throw new Error(`no browser context available on CDP port ${cdpPort}`);
    for (const existingPage of context.pages()) await existingPage.close().catch(() => {});
    page = await context.newPage();
  } else {
    ownsBrowser = true;
    browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader', '--in-process-gpu', '--no-sandbox'] });
    page = await browser.newPage({ viewport: { width: viewportWidth, height: viewportHeight } });
  }
  await page.setViewportSize({ width: viewportWidth, height: viewportHeight });
  page.on('pageerror', error => console.error('[survey pageerror]', error.message));
  await page.goto(`http://127.0.0.1:${port}/editor/.built-survey.html`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction('window.__ready === true || window.__error', null, { timeout: loadTimeoutMs });
  const error = await page.evaluate(() => window.__error || null);
  if (error) throw new Error(error);
  await page.waitForTimeout(700);
  if (performanceMode) {
    const performanceViews = [
      { id: 'top-ortho', setup: () => { window.__survey.stopRoute(); window.__survey.xray(false); window.__survey.top(); } },
      { id: 'orbit-persp', setup: () => { window.__survey.stopRoute(); window.__survey.xray(false); window.__survey.orbit(); } },
      { id: 'xray-top', setup: () => { window.__survey.stopRoute(); window.__survey.xray(true); window.__survey.top(); } },
      { id: 'interior-core', setup: () => { window.__survey.xray(false); window.__survey.pose(40, 5.7, -250, 48, 5.7, -258); } },
      { id: 'player-route', setup: () => { window.__survey.stopRoute(); window.__survey.xray(false); window.__survey.pose(-60, 1.7, 120, 0, 3.2, 100); } },
      { id: 'moving-route', setup: () => { window.__survey.xray(false); window.__survey.moveRoute(6000); } },
    ];
    const performanceViewsOut = [];
    for (const view of performanceViews) {
      await page.evaluate(view.setup);
      await page.waitForTimeout(700);
      const result = await page.evaluate(({ frames, lateDelay, timeout }) => window.__survey.measureVisible(frames, lateDelay, timeout), {
        frames: performanceFrames, lateDelay: lateFrameDelayMs, timeout: performanceTimeoutMs,
      });
      performanceViewsOut.push({ view: view.id, ...result });
      console.log(`${view.id} ${result.status}${result.avgFrameMs ? ` ${result.avgFrameMs}ms` : ''}`);
    }
    await page.evaluate(() => window.__survey.stopRoute());
    const artifactBytes = readFileSync(artifactPath);
    const artifactGeometry = (() => {
      let offset = 12, document;
      while (offset < artifactBytes.length) {
        const length = artifactBytes.readUInt32LE(offset), type = artifactBytes.readUInt32LE(offset + 4);
        offset += 8;
        if (type === 0x4e4f534a) document = JSON.parse(artifactBytes.toString('utf8', offset, offset + length));
        offset += length;
      }
      const accessors = document.accessors || [];
      const indexedTriangles = (document.meshes || []).flatMap(mesh => mesh.primitives || [])
        .reduce((sum, primitive) => sum + (primitive.indices !== undefined
          ? accessors[primitive.indices].count / 3
          : accessors[primitive.attributes.POSITION].count / 3), 0);
      return {
        meshes: document.meshes?.length || 0,
        nodes: document.nodes?.length || 0,
        materials: document.materials?.length || 0,
        images: document.images?.length || 0,
        indexedTriangles,
      };
    })();
    const report = {
      schemaVersion: 4,
      status: performanceViewsOut.some(view => view.status === 'blocked') ? 'BLOCKED' : 'PASS',
      sourceCommit: (await new Promise((resolveCommit, rejectCommit) => {
        const p = spawn('git', ['rev-parse', 'HEAD'], { cwd: root }); let out = '';
        p.stdout.on('data', chunk => { out += chunk; });
        p.on('close', code => code ? rejectCommit(new Error('git rev-parse failed')) : resolveCommit(out.trim()));
      })),
      renderer: 'WebGL2 (swiftshader software GL, direct visible canvas)',
      artifactSha256,
      materials: artifactGeometry.materials,
      triangles: JSON.parse(readFileSync(buildReportPath, 'utf8')).triangles,
      drawItems: artifactGeometry.meshes,
      segments: JSON.parse(readFileSync(join(root, 'out/build-report.json'), 'utf8')).segments,
      glbBytes: artifactBytes.length,
      blockoutLayerBytes: readFileSync(join(root, 'editor/blockout-full.glb')).length,
      artifactGeometry,
      views: performanceViewsOut,
      sampleFrames: performanceFrames,
      lateFrameDelayMs,
      note: 'Samples render the full candidate through a visible non-preserved WebGL canvas; each frame is a real scene render, with late-frame sampling after sustained output.',
    };
    writeFileSync(join(root, 'out/perf-report.json'), JSON.stringify(report, null, 2) + '\n');
    console.log(`PERF ${report.status}: ${performanceViewsOut.length} views; artifact ${artifactSha256}`);
    if (report.status === 'BLOCKED') process.exitCode = 2;
  } else {
    for (const [index, view] of selectedViews.entries()) {
      if (view.mode === 'top') await page.evaluate(() => { window.__survey.xray(false); window.__survey.top(); });
      else if (view.mode === 'orbit') await page.evaluate(() => { window.__survey.xray(false); window.__survey.orbit(); });
      else if (view.mode === 'xray-top') {
        await page.evaluate(() => { window.__survey.xray(false); window.__survey.top(); });
        await page.waitForTimeout(260);
        await page.evaluate(() => window.__survey.xray(true));
      }
      else await page.evaluate(camera => { window.__survey.xray(false); window.__survey.pose(...camera.position, ...camera.target); }, view.camera);
      await page.waitForTimeout(260);
      await page.evaluate(() => window.__survey.freeze());
      const output = outputPathFor(view);
      if (captureMode === 'pixels') {
        const frame = await page.evaluate(() => window.__survey.readPixels());
        writeFileSync(output, encodeRgbaPng(Buffer.from(frame.base64, 'base64'), frame.width, frame.height));
        console.log(`captured ${view.id} via readPixels sample=${frame.sample.join(',')} clear=${frame.clear.join(',')} contextLost=${frame.contextLost} calls=${frame.metrics.calls} triangles=${frame.metrics.triangles}`);
      } else {
        try {
          await page.screenshot({ path: output, timeout: screenshotTimeoutMs, animations: 'disabled' });
          console.log(`captured ${view.id} via screenshot`);
        } catch (error) {
          console.log(`screenshot fallback ${view.id}: ${error.message}`);
          const frame = await page.evaluate(() => window.__survey.readPixels());
          writeFileSync(output, encodeRgbaPng(Buffer.from(frame.base64, 'base64'), frame.width, frame.height));
          console.log(`captured ${view.id} via readPixels`);
        }
      }
    }
  }
  const sourceCommit = (await new Promise((resolveCommit, rejectCommit) => {
    const p = spawn('git', ['rev-parse', 'HEAD'], { cwd: root }); let out = ''; p.stdout.on('data', chunk => { out += chunk; }); p.on('close', code => code ? rejectCommit(new Error('git rev-parse failed')) : resolveCommit(out.trim()));
  }));
  if (!performanceMode && (process.env.SURVEY_WRITE_MANIFEST === '1' || selectedViews.length === views.length)) writeFileSync(surveyManifestPath, JSON.stringify({
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    sourceCommit,
    sourceSha256,
    generatorSha256,
    artifact: { path: relative(root, artifactPath), sha256: artifactSha256, bytes: readFileSync(artifactPath).length },
    renderer: 'standalone Playwright Chromium SwiftShader; direct WebGL canvas',
    views: selectedViews.map(({ id, path, zone, route, requirement, camera }) => ({ id, path: relative(root, outputPathFor({ path })), zone: zone || null, route: route || null, requirement: requirement || null, camera })),
  }, null, 2) + '\n');
  if (!performanceMode) console.log(`SURVEY PASS: ${selectedViews.length}/${views.length} views; artifact ${artifactSha256}`);
} finally {
  await page?.close().catch(() => {});
  if (ownsBrowser) await browser?.close().catch(() => {});
  server?.kill('SIGTERM');
  try { unlinkSync(temporaryPage); } catch {}
}
