const THREE_URL = new URL('/node_modules/three/build/three.module.js', self.location.href).href;
const workerModules = [];

async function loadAddon(path, replacements = {}) {
  const sourceUrl = new URL(path, self.location.href).href;
  let source = await (await fetch(sourceUrl)).text();
  source = source.replaceAll("from 'three'", `from '${THREE_URL}'`);
  for (const [from, to] of Object.entries(replacements)) {
    source = source.replaceAll(`from '${from}'`, `from '${to}'`);
  }
  const blobUrl = URL.createObjectURL(new Blob([source], { type: 'text/javascript' }));
  workerModules.push(blobUrl);
  return { url: blobUrl, module: await import(blobUrl) };
}

let THREE;
let renderer;
let scene;
let camO;
let camP;
let cam;
let blockLayer;
let loaded = 0;
let ready = false;
let xray = false;
let blockoutVisible = false;
let renderTimer;
let viewport = { width: 1400, height: 900 };
const center = { x: 5, y: 0, z: 7.5 };
const orbit = { azimuth: -0.794, elevation: 0.43, radius: 1200 };
const pending = [];

const ROUTE = [[-292, 170], [-240, 160], [-160, 150], [-60, 120], [0, 100], [60, 60], [120, 0], [140, -60], [110, -110], [100, -160], [100, -210], [40, -214], [20, -222], [20, -228]];
const SLICE = [[-120, 80], [-80, 60], [-40, 40], [0, 10], [40, -40], [60, -100], [50, -150], [48, -190]];
const INTERIORS = {
  'core-objective': [48, 6.25, -246, 48, 5.7, -258],
  'loading-hall': [-50, 1.7, 62, -50, 1.4, 40],
  tunnel: [80, -12.05, -197.8, 200, -12.05, -205],
  'security-hall': [43, 2.35, -164, 53, 1.85, -153],
  maintenance: [-184, 1.7, -20, -160, 1.5, -20],
};

function pointsFor(route) {
  const points = [];
  for (let i = 0; i < route.length - 1; i++) {
    const a = route[i], b = route[i + 1];
    const count = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 8));
    for (let k = 0; k < count; k++) {
      points.push([a[0] + (b[0] - a[0]) * k / count, a[1] + (b[1] - a[1]) * k / count]);
    }
  }
  points.push(route[route.length - 1]);
  return points;
}

function setSize(width, height) {
  viewport = { width: Math.max(1, width), height: Math.max(1, height) };
  if (!renderer) return;
  renderer.setSize(viewport.width, viewport.height, false);
  camP.aspect = viewport.width / viewport.height;
  camP.updateProjectionMatrix();
}

function setTopCamera() {
  cam = camO;
  camP.far = 4000;
  camP.updateProjectionMatrix();
}

function setOrbitCamera() {
  cam = camP;
  camP.far = 4000;
  camP.updateProjectionMatrix();
  updateOrbitCamera();
}

function updateOrbitCamera() {
  const horizontal = orbit.radius * Math.cos(orbit.elevation);
  camP.position.set(
    center.x + horizontal * Math.sin(orbit.azimuth),
    center.y + orbit.radius * Math.sin(orbit.elevation),
    center.z + horizontal * Math.cos(orbit.azimuth),
  );
  camP.lookAt(center.x, center.y, center.z);
}

function setPlayerCamera(x, z, targetX, targetZ, y = 1.7) {
  cam = camP;
  camP.far = 420;
  camP.updateProjectionMatrix();
  camP.position.set(x, y, z);
  camP.lookAt(targetX, 1.4, targetZ);
}

function setXray(value) {
  xray = value;
  scene.traverse(object => {
    if (!object.isMesh || !object.material || object === blockLayer || object.parent === blockLayer) return;
    const material = object.material;
    const opaque = material.userData.opaque ?? true;
    if (xray && opaque) {
      material.transparent = true;
      material.opacity = 0.22;
      material.depthWrite = false;
    } else if (!xray && opaque) {
      material.transparent = material.userData.wasTransparent ?? false;
      material.opacity = material.userData.wasTransparent ? 0.5 : 1;
      material.depthWrite = true;
    }
  });
}

function hideBlockout() {
  blockoutVisible = false;
  if (blockLayer) blockLayer.visible = false;
}

function applyCommand(command) {
  if (!renderer && command.type !== 'resize') return;
  if (command.type === 'resize') {
    setSize(command.width, command.height);
    return;
  }
  if (command.type === 'top') {
    setTopCamera();
    return;
  }
  if (command.type === 'orbit') {
    setOrbitCamera();
    return;
  }
  if (command.type === 'orbit-delta') {
    if (cam !== camP) setOrbitCamera();
    orbit.azimuth -= command.dx * 0.005;
    orbit.elevation = Math.max(-1.35, Math.min(1.35, orbit.elevation - command.dy * 0.005));
    updateOrbitCamera();
    return;
  }
  if (command.type === 'orbit-zoom') {
    orbit.radius = Math.max(80, Math.min(2600, orbit.radius * Math.exp(command.delta * 0.001)));
    updateOrbitCamera();
    return;
  }
  if (command.type === 'xray') {
    setXray(command.value);
    return;
  }
  if (command.type === 'blockout') {
    blockoutVisible = command.value;
    if (blockLayer) blockLayer.visible = blockoutVisible;
    return;
  }
  if (command.type === 'player-pose') {
    hideBlockout();
    setPlayerCamera(command.x, command.z, command.targetX, command.targetZ, command.y);
    return;
  }
  if (command.type === 'interior') {
    const pose = INTERIORS[command.name];
    if (pose) {
      hideBlockout();
      setPlayerCamera(pose[0], pose[2], pose[3], pose[5], pose[1]);
    }
    return;
  }
  if (command.type === 'force') return;
}

function command(command) {
  if (!ready && command.type !== 'resize') pending.push(command);
  else applyCommand(command);
}

function addLights() {
  const light = new THREE.HemisphereLight(0xd8dfd9, 0x39413d, 0.9);
  const sun = new THREE.DirectionalLight(0xe6ddc9, 1.45);
  sun.position.set(-260, 360, 280);
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
  const fill = new THREE.DirectionalLight(0x9bb8ba, 0.42);
  fill.position.set(120, 180, -300);
  const frontKey = new THREE.DirectionalLight(0xe2c8a9, 2.2);
  frontKey.position.set(-330, 260, -260);
  scene.add(light, sun, fill, frontKey);
  for (const [x, y, z, intensity, distance] of [
    [-92, 6.2, 92, 1.45, 26], [-68, 6.2, 92, 1.45, 26], [-44, 6.2, 92, 1.45, 26],
    [-91, 6.3, 114, 1.1, 20], [-40, 6.3, 114, 1.1, 20], [-66, 6.2, 34, 1.25, 22],
    [26, 5.1, 120, 1.35, 24], [44, 5.1, 120, 1.35, 24], [158, 7.2, -45, 1.55, 28],
    [214, 6.5, -105, 1.15, 22], [42, 3.8, -169, 1.35, 22], [32, 6.8, -231, 1.7, 26],
    [70, 6.8, -231, 1.35, 24], [106, 4.5, -102, 1.2, 22], [176, 7, -66.2, 1.55, 20],
    [212, 7, -66.2, 1.9, 24], [250, 7, -66.2, 1.6, 20], [180, 4.85, -66.2, 1.15, 15],
    [246, 4.85, -66.2, 1.25, 15], [198, 4, -66.9, 0.9, 12], [232, 4, -66.9, 0.9, 12],
    [190, 3.2, -69, 0.62, 16], [240, 3.2, -69, 0.62, 16], [42, 5, -157, 2, 22],
    [56, 4.3, -145, 1.5, 20], [48, 7, -254, 2, 24], [48, 6.2, -270, 1.35, 20],
    [70, -11.7, -198, 1.15, 18], [150, -11.7, -202, 1.15, 18], [230, -11.7, -207, 1.15, 18],
    [285, -11.7, -210, 1.15, 18], [60, -8.55, -196.7, 1.35, 24], [92, -8.55, -198.4, 1.25, 24],
    [128, -8.55, -200.5, 1.28, 24], [166, -8.55, -203.1, 1.18, 24], [204, -8.55, -205.2, 1.24, 24],
    [246, -8.55, -207.7, 1.2, 24], [282, -8.55, -209.2, 1.3, 24],
  ]) {
    const lamp = new THREE.PointLight(0xffbd7b, intensity, distance, 2);
    lamp.position.set(x, y, z);
    scene.add(lamp);
  }
}

async function initialize(canvas, width, height) {
  viewport = { width, height };
  THREE = await import(THREE_URL);
  const geometryUtils = await loadAddon('/node_modules/three/examples/jsm/utils/BufferGeometryUtils.js');
  const skeletonUtils = await loadAddon('/node_modules/three/examples/jsm/utils/SkeletonUtils.js');
  const loaderAddon = await loadAddon('/node_modules/three/examples/jsm/loaders/GLTFLoader.js', {
    '../utils/BufferGeometryUtils.js': geometryUtils.url,
    '../utils/SkeletonUtils.js': skeletonUtils.url,
  });
  const environmentAddon = await loadAddon('/node_modules/three/examples/jsm/environments/RoomEnvironment.js');
  const { GLTFLoader } = loaderAddon.module;
  const { RoomEnvironment } = environmentAddon.module;

  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.18;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.setSize(width, height, false);

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x858e8a);
  scene.fog = new THREE.Fog(0x858e8a, 460, 1100);
  const span = 940;
  camO = new THREE.OrthographicCamera(-span * 0.55, span * 0.55, span * 0.55, -span * 0.55, 1, 3000);
  camO.position.set(center.x, 900, center.z + 0.01);
  camO.up.set(0, 0, 1);
  camO.lookAt(center.x, 0, center.z);
  camP = new THREE.PerspectiveCamera(50, width / height, 1, 4000);
  camP.position.set(-760, 520, 760);
  camP.lookAt(center.x, 0, center.z);
  cam = camO;

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.28;
  pmrem.dispose();
  addLights();

  const loader = new GLTFLoader();
  const markReady = () => {
    loaded += 1;
    if (loaded !== 2) return;
    renderer.setSize(1, 1, false);
    renderer.render(scene, camO);
    setXray(true);
    renderer.render(scene, camO);
    setXray(false);
    setPlayerCamera(0, 0, 20, -20);
    renderer.render(scene, camP);
    setTopCamera();
    setSize(viewport.width, viewport.height);
    renderer.render(scene, camO);
    setOrbitCamera();
    renderer.render(scene, camP);
    setTopCamera();
    renderer.shadowMap.autoUpdate = false;
    ready = true;
    while (pending.length) applyCommand(pending.shift());
    renderTimer = setInterval(() => renderer.render(scene, cam), 16);
    let meshes = 0, pointLights = 0;
    scene.traverse(object => { if (object.isMesh) meshes += 1; if (object.isPointLight) pointLights += 1; });
    self.postMessage({ type: 'ready', meshes, pointLights });
  };

  loader.load('/editor/facility-built.glb', gltf => {
    gltf.scene.traverse(object => {
      if (!object.isMesh) return;
      const material = object.material;
      object.castShadow = true;
      object.receiveShadow = true;
      material.userData.wasTransparent = material.transparent;
      material.userData.opaque = !(material.transparent && material.opacity < 0.9);
      if (!xray && !material.userData.wasTransparent) material.transparent = false;
    });
    scene.add(gltf.scene);
    markReady();
  }, undefined, error => self.postMessage({ type: 'error', message: String(error) }));

  loader.load('/editor/blockout-full.glb', gltf => {
    gltf.scene.traverse(object => {
      if (!object.isMesh) return;
      object.material = object.material.clone();
      object.material.transparent = true;
      object.material.opacity = 0.35;
      object.material.depthWrite = false;
      object.receiveShadow = true;
    });
    blockLayer = gltf.scene;
    blockLayer.visible = blockoutVisible;
    scene.add(blockLayer);
    markReady();
  }, undefined, error => self.postMessage({ type: 'error', message: String(error) }));
}

self.onmessage = async event => {
  const message = event.data;
  try {
    if (message.type === 'init') {
      await initialize(message.canvas, message.width, message.height);
      return;
    }
    command(message);
  } catch (error) {
    self.postMessage({ type: 'error', message: String(error), stack: error?.stack });
  }
};
