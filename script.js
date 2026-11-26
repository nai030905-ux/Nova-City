import * as THREE from 'three';

const IS_TEST = typeof globalThis !== 'undefined' && !!globalThis.__NOVA_TEST__;

// ================= CONSTANTES =================
const BLOCK = 60, ROADW = 14, GRID = 5;
const SIZE = GRID * (BLOCK + ROADW);
const ORIGIN = -SIZE / 2;
const cell = i => ORIGIN + i * (BLOCK + ROADW);
const roadCenters = [];
for (let i = 0; i <= GRID; i++) roadCenters.push(cell(i) + ROADW / 2);
const DAY_LENGTH = 240;
const SAVE_KEY = 'nova_city_save';

// ================= ÉTAT =================
let scene, camera, renderer, sunLight, hemiLight, clockObj;
const colliders = [];
const nightMats = [];
const lampLights = [];
const vehiclesParked = [];
const aiCars = [];
const npcs = [];
const pickups = [];
let playerMesh = null, playerPos = null, playerVel = null, onGround = true, walkPhase = 0;
let camYaw = 0.6, camPitch = 0.35;
let playerVehicle = null;
let missionTarget = null, missionMarker = null, deliveries = 0;
let money = 250, tod = 8 / 24, distW = 0, distD = 0, playtime = 0;
let transactions = [];
let gameState = 'menu';
let shadowsOn = true;
let autoSaveT = 0;
let health = 100, education = 0, hitCool = 0;
let insideInterior = null, outdoorPos = null;
const properties = {
  apartment: { name: 'Appartement Nova', price: 2000, owned: false },
  villa: { name: 'Villa Horizon', price: 8000, owned: false },
};
const FURNITURE = {
  sofa: { name: 'Canapé', price: 300 },
  tv: { name: 'Télévision', price: 400 },
  plant: { name: 'Plante verte', price: 80 },
  lamp: { name: 'Lampadaire', price: 120 },
  table: { name: 'Table basse', price: 150 },
};
const furniture = { apartment: [], villa: [] };
const placedFurniture = [];
const businesses = {
  burger: { name: 'Nova Burger', price: 4000, unitCost: 3, basePrice: 10, maxStock: 60 },
  hotel: { name: 'H\u00f4tel Nova', price: 12000, unitCost: 20, basePrice: 50, maxStock: 40 },
  gas: { name: 'Station Nova', price: 15000, unitCost: 60, basePrice: 120, maxStock: 30 },
  dealer: { name: 'Concessionnaire', price: 20000, unitCost: 400, basePrice: 800, maxStock: 10 },
};
for (const b of Object.values(businesses)) Object.assign(b, { owned: false, stock: 0, salePrice: b.basePrice, employees: 0, profit: 0, level: 1 });
let lastHour = -1;
let fishing = null, race = null, raceMarker = null, basketCool = 0, fitness = 0;
const stats = { baskets: 0, fish: 0, races: 0, workouts: 0 };
const story = {
  idx: 0, active: false, done: false,
  missions: [
    { title: 'Un nouveau départ', desc: 'Réussis une livraison (marqueur jaune).', reward: 300 },
    { title: 'Fais-toi des amis', desc: 'Discute avec un habitant (E).', reward: 200 },
    { title: 'Un chez-soi meublé', desc: 'Achète un logement puis un meuble.', reward: 500 },
    { title: 'La pilote du week-end', desc: 'Remporte une course de rue (parc).', reward: 800 },
    { title: 'Le grand choix', desc: 'Téléphone → Missions → Parler à Marc.', reward: 0 },
  ],
};
let messages = [];
let navTarget = null, dayCount = 1, volume = 0.8;
const WEATHERS = ['clair', 'pluie', 'orage', 'brouillard'];
let weather = 'clair', weatherT = 60, weatherCount = 1;
let rainMesh = null, lightningT = 0, flashT = 0, rainNode = null;
let grip = 1, qualityScale = 1, fpsFrames = 0, fpsTime = 0, fpsAvg = 60;
const SAVE_VERSION = 2;
const ACHIEVEMENTS = [
  { id: 'firstCar', name: 'Premier véhicule', check: () => ownedVehicles.length >= 1 },
  { id: 'richesse', name: 'Patrimoine 10 000 $', check: () => money >= 10000 },
  { id: 'boss', name: 'Patron d’un commerce', check: () => Object.values(businesses).some(b => b.owned) },
  { id: 'cerveau', name: 'Diplômé', check: () => education >= 5 },
  { id: 'athlete', name: 'Athlète complet', check: () => fitness >= 5 },
  { id: 'histoire', name: 'Histoire terminée', check: () => story.done },
  { id: 'livreur', name: '10 livraisons', check: () => deliveries >= 10 },
  { id: 'populaire', name: 'Populaire (relation 5)', check: () => npcs.some(n => n.rel >= 5) },
];
let unlockedAch = [];
const net = { ws: null, on: false, id: null, players: new Map(), sendT: 0 };
const doors = [];
const zones = [];
const interiorRooms = {};
const INTERIOR_BASE = 1400;
let interiorCount = 0;
const ownedVehicles = [];
let cityBus = null, ridingBus = false, getOffBus = false;
let dialog = null;
const anchorsMap = {};
const PARK_POINT = { x: cell(0) + ROADW + BLOCK / 2, z: cell(3) + ROADW + BLOCK / 2 };
const JOBS = [
  { id: 'employe', label: 'Employé', color: 0x34495e, work: ['hospital', 'dealer', 'gas', 'shop'] },
  { id: 'etudiant', label: 'Étudiant', color: 0x3498db, work: ['university'] },
  { id: 'commercant', label: 'Commerçant', color: 0x27ae60, work: ['shop'] },
  { id: 'retraite', label: 'Retraité', color: 0xe67e22, work: null },
  { id: 'chomeur', label: 'Sans emploi', color: 0x7f8c8d, work: null },
];
const NPC_NAMES = ['Léa', 'Marc', 'Fatou', 'Jules', 'Inès', 'Karim', 'Chloé', 'Noah', 'Maya', 'Louis', 'Zoé', 'Adam', 'Eva', 'Sacha', 'Nina', 'Théo', 'Rosa', 'Yanis', 'Alice', 'Omar', 'Jade', 'Lucas'];
const input = { f: 0, b: 0, l: 0, r: 0, run: 0, jump: 0 };
let toastT = 0;

const specs = {
  sedan: { accel: 14, maxSp: 26, turn: 1.9, color: 0xb03a2e, name: 'Berline', price: 1500, cap: 50 },
  sport: { accel: 22, maxSp: 42, turn: 2.4, color: 0xf1c40f, name: 'Sportive', price: 5000, cap: 60 },
  van:   { accel: 10, maxSp: 20, turn: 1.5, color: 0x7f8c8d, name: 'Fourgon', price: 1200, cap: 70 },
  taxi:  { accel: 13, maxSp: 24, turn: 1.8, color: 0xf39c12, name: 'Taxi', price: 2500, cap: 50 },
  moto:  { accel: 20, maxSp: 38, turn: 3.0, color: 0x9b59b6, name: 'Moto', price: 800, cap: 18 },
  bus:   { accel: 7, maxSp: 16, turn: 1.0, color: 0x2980b9, name: 'Bus', price: 4000, cap: 150 },
  boat:  { accel: 8, maxSp: 22, turn: 1.4, color: 0x16a085, name: 'Bateau', price: 1500, cap: 80, water: true },
  plane: { accel: 12, maxSp: 55, turn: 1.1, color: 0xecf0f1, name: 'Avion', price: 25000, cap: 200, air: true },
};
const WATER_X = SIZE / 2 + 58, WATER_MAX = SIZE / 2 + 135;
const RUNWAY_Z = -(SIZE / 2 + 70);

// ================= TEXTURES =================
function windowTexture(litRatio, base) {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = base; g.fillRect(0, 0, 128, 256);
  for (let y = 6; y < 250; y += 16) {
    for (let x = 6; x < 122; x += 16) {
      const lit = Math.random() < litRatio;
      g.fillStyle = lit ? '#ffe9a8' : '#16202e';
      g.fillRect(x, y, 10, 10);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function signTexture(text, bg, fg) {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, 256, 64);
  g.fillStyle = fg; g.font = 'bold 30px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, 128, 34);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// ================= HELPERS =================
function addCollider(x, z, w, d) {
  colliders.push({ x1: x - w / 2, x2: x + w / 2, z1: z - d / 2, z2: z + d / 2 });
}

function collideCircle(px, pz, r) {
  let nx = px, nz = pz;
  for (const c of colliders) {
    const cx = Math.max(c.x1, Math.min(px, c.x2));
    const cz = Math.max(c.z1, Math.min(pz, c.z2));
    const dx = px - cx, dz = pz - cz;
    const d2 = dx * dx + dz * dz;
    if (d2 < r * r) {
      const d = Math.sqrt(d2) || 0.001;
      const push = (r - d) / d;
      nx += dx * push; nz += dz * push;
    }
  }
  return { x: nx, z: nz };
}

function makeHumanoid(shirt, pants, skin) {
  const g = new THREE.Group();
  const mat = c => new THREE.MeshStandardMaterial({ color: c });
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.85, 0.36), mat(shirt));
  torso.position.y = 1.12; g.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 10), mat(skin));
  head.position.y = 1.78; g.add(head);
  const legGeo = new THREE.BoxGeometry(0.2, 0.72, 0.2);
  legGeo.translate(0, -0.36, 0);
  const armGeo = new THREE.BoxGeometry(0.15, 0.62, 0.15);
  armGeo.translate(0, -0.31, 0);
  const legs = [], arms = [];
  for (const s of [-1, 1]) {
    const leg = new THREE.Mesh(legGeo, mat(pants));
    leg.position.set(0.16 * s, 0.72, 0); g.add(leg); legs.push(leg);
    const arm = new THREE.Mesh(armGeo, mat(shirt));
    arm.position.set(0.4 * s, 1.5, 0); g.add(arm); arms.push(arm);
  }
  g.userData = { legs, arms };
  return g;
}

function animateWalk(group, phase, amp) {
  const u = group.userData;
  if (!u || !u.legs) return;
  u.legs[0].rotation.x = Math.sin(phase) * amp;
  u.legs[1].rotation.x = -Math.sin(phase) * amp;
  u.arms[0].rotation.x = -Math.sin(phase) * amp * 0.7;
  u.arms[1].rotation.x = Math.sin(phase) * amp * 0.7;
}

function makeVehicleMesh(type, color) {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color, metalness: 0.4, roughness: 0.4 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x14181f });
  let body = null;
  if (type === 'moto') {
    body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 2.1), bodyMat);
    body.position.y = 0.85; g.add(body);
    const wheelGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.14, 12);
    wheelGeo.rotateZ(Math.PI / 2);
    for (const wz of [0.95, -0.95]) {
      const wheel = new THREE.Mesh(wheelGeo, darkMat);
      wheel.position.set(0, 0.36, wz); g.add(wheel);
    }
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.08, 0.08), darkMat);
    bar.position.set(0, 1.2, 0.75); g.add(bar);
    g.userData.body = body;
    return g;
  }
  if (type === 'bus') {
    body = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.5, 9.5), bodyMat);
    body.position.y = 1.6; g.add(body);
    const band = new THREE.Mesh(new THREE.BoxGeometry(2.45, 0.8, 8.5), darkMat);
    band.position.set(0, 2.2, 0); g.add(band);
    const wheelGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.32, 12);
    wheelGeo.rotateZ(Math.PI / 2);
    for (const [wx, wz] of [[1.05, 3.4], [-1.05, 3.4], [1.05, -3.4], [-1.05, -3.4], [1.05, 0], [-1.05, 0]]) {
      const wheel = new THREE.Mesh(wheelGeo, darkMat);
      wheel.position.set(wx, 0.5, wz); g.add(wheel);
    }
    g.userData.body = body;
    return g;
  }
  if (type === 'boat') {
    body = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.9, 5.4), bodyMat);
    body.position.y = 0.45; g.add(body);
    const bow = new THREE.Mesh(new THREE.ConeGeometry(1.1, 1.8, 4), bodyMat);
    bow.rotation.x = Math.PI / 2; bow.rotation.y = Math.PI / 4;
    bow.position.set(0, 0.45, 3.5); g.add(bow);
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.8, 1.6), darkMat);
    cabin.position.set(0, 1.3, -0.6); g.add(cabin);
    g.userData.body = body;
    return g;
  }
  if (type === 'plane') {
    body = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.5, 7, 10), bodyMat);
    body.rotation.x = Math.PI / 2; body.position.y = 1.4; g.add(body);
    const wing = new THREE.Mesh(new THREE.BoxGeometry(11, 0.16, 1.8), bodyMat);
    wing.position.set(0, 1.5, 0.4); g.add(wing);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.12, 0.9), bodyMat);
    tail.position.set(0, 1.6, -3.1); g.add(tail);
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.2, 1), bodyMat);
    fin.position.set(0, 2.1, -3.1); g.add(fin);
    const prop = new THREE.Mesh(new THREE.BoxGeometry(0.14, 2.6, 0.14), darkMat);
    prop.position.set(0, 1.4, 3.6); g.add(prop);
    const wheelGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.18, 10);
    wheelGeo.rotateZ(Math.PI / 2);
    for (const [wx, wz] of [[1.2, 0.8], [-1.2, 0.8]]) {
      const wheel = new THREE.Mesh(wheelGeo, darkMat);
      wheel.position.set(wx, 0.3, wz); g.add(wheel);
    }
    g.userData.body = body; g.userData.prop = prop;
    return g;
  }
  let L = 4.6, W = 2.0;
  if (type === 'sport') { L = 4.4; W = 2.0; }
  if (type === 'van') { L = 5.2; W = 2.2; }
  body = new THREE.Mesh(new THREE.BoxGeometry(W, 0.75, L), bodyMat);
  body.position.y = 0.72; g.add(body);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(W * 0.86, 0.62, L * (type === 'van' ? 0.62 : 0.45)), darkMat);
  cabin.position.set(0, 1.36, type === 'van' ? 0.4 : -0.25); g.add(cabin);
  const wheelGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.3, 14);
  wheelGeo.rotateZ(Math.PI / 2);
  for (const [wx, wz] of [[W / 2 - 0.1, L / 2 - 0.9], [-W / 2 + 0.1, L / 2 - 0.9], [W / 2 - 0.1, -L / 2 + 0.9], [-W / 2 + 0.1, -L / 2 + 0.9]]) {
    const wheel = new THREE.Mesh(wheelGeo, darkMat);
    wheel.position.set(wx, 0.38, wz); g.add(wheel);
  }
  g.userData.body = body;
  return g;
}

function randSidewalkPoint() {
  const alongRoad = Math.random() < 0.5;
  const ri = Math.floor(Math.random() * roadCenters.length);
  const side = Math.random() < 0.5 ? -1 : 1;
  const off = (ROADW / 2 + 2) * side;
  const p = ORIGIN + 4 + Math.random() * (SIZE - 8);
  if (alongRoad) return { x: roadCenters[ri] + off, z: p };
  return { x: p, z: roadCenters[ri] + off };
}

// ================= CONSTRUCTION DU MONDE =================
function buildWorld() {
  scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x87ceeb, 60, 420);
  camera = new THREE.PerspectiveCamera(62, 16 / 9, 0.1, 900);

  hemiLight = new THREE.HemisphereLight(0xbfd8ff, 0x3a4a3a, 0.7);
  scene.add(hemiLight);
  sunLight = new THREE.DirectionalLight(0xffffff, 1.1);
  sunLight.position.set(120, 180, 60);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(2048, 2048);
  sunLight.shadow.camera.left = -160; sunLight.shadow.camera.right = 160;
  sunLight.shadow.camera.top = 160; sunLight.shadow.camera.bottom = -160;
  sunLight.shadow.camera.far = 600;
  scene.add(sunLight);

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(SIZE + 300, SIZE + 300),
    new THREE.MeshStandardMaterial({ color: 0x4a5d43, roughness: 1 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const roadMat = new THREE.MeshStandardMaterial({ color: 0x2b2f36, roughness: 0.95 });
  const roadGeoH = new THREE.PlaneGeometry(SIZE + 30, ROADW);
  const roadGeoV = new THREE.PlaneGeometry(ROADW, SIZE + 30);
  for (const rc of roadCenters) {
    const rh = new THREE.Mesh(roadGeoH, roadMat);
    rh.rotation.x = -Math.PI / 2; rh.position.set(0, 0.02, rc);
    rh.receiveShadow = true; scene.add(rh);
    const rv = new THREE.Mesh(roadGeoV, roadMat);
    rv.rotation.x = -Math.PI / 2; rv.position.set(rc, 0.02, 0);
    rv.receiveShadow = true; scene.add(rv);
  }

  const sideMat = new THREE.MeshStandardMaterial({ color: 0x9aa0a6, roughness: 1 });
  const PARK = { bx: 0, bz: 3 };
  const COMMERCIAL = { bx: 1, bz: 4 };
  const SPECIALS = [ { bx: 2, bz: 0, txt: 'SALLE NOVA', bg: '#d35400', interior: 'gym' }, { bx: 3, bz: 0, txt: 'HÔPITAL', bg: '#e74c3c', interior: 'hospital' }, { bx: 4, bz: 2, txt: 'UNIVERSITÉ', bg: '#3498db', interior: 'university' }, { bx: 0, bz: 1, txt: 'HÔTEL NOVA', bg: '#8e44ad', interior: 'hotel' }, { bx: 2, bz: 4, txt: 'RÉSIDENCE NOVA', bg: '#16a085', interior: 'apartment' }, { bx: 4, bz: 4, txt: 'VILLA HORIZON', bg: '#e67e22', interior: 'villa' }, { bx: 3, bz: 3, txt: 'CONCESSIONNAIRE', bg: '#2c3e50', interior: 'dealer' }, { bx: 1, bz: 1, txt: 'STATION NOVA', bg: '#c0392b', gas: true } ];

  for (let bx = 0; bx < GRID; bx++) {
    for (let bz = 0; bz < GRID; bz++) {
      const x0 = cell(bx) + ROADW, z0 = cell(bz) + ROADW;
      const cx = x0 + BLOCK / 2, cz = z0 + BLOCK / 2;
      const isPark = bx === PARK.bx && bz === PARK.bz;
      const isShop = bx === COMMERCIAL.bx && bz === COMMERCIAL.bz;

      const sw = new THREE.Mesh(new THREE.BoxGeometry(BLOCK, 0.24, BLOCK), sideMat);
      sw.position.set(cx, 0.12, cz);
      sw.receiveShadow = true; scene.add(sw);

      if (isPark) { buildPark(cx, cz); continue; }
      if (isShop) { buildShop(cx, cz); continue; }

      const spec = SPECIALS.find(s => s.bx === bx && s.bz === bz);
      if (spec) { buildSpecial(cx, cz, spec); continue; }

      const dist = Math.max(Math.abs(bx - 2), Math.abs(bz - 2));
      const hMin = dist === 0 ? 34 : dist === 1 ? 14 : 7;
      const hMax = dist === 0 ? 78 : dist === 1 ? 32 : 16;
      const base = windowTexture(0.35, ['#5d6673','#4c5560','#6a7380'][(bx + bz) % 3]);
      for (const lx of [-14, 14]) {
        for (const lz of [-14, 14]) {
          const w = 20 + Math.random() * 6, d = 20 + Math.random() * 6;
          const h = hMin + Math.random() * (hMax - hMin);
          const sideMatB = new THREE.MeshStandardMaterial({
            map: base.clone(), emissiveMap: base.clone(), emissive: 0xffffff, emissiveIntensity: 0,
            roughness: 0.85
          });
          sideMatB.map.repeat.set(w / 5, h / 4);
          sideMatB.map.needsUpdate = true;
          sideMatB.emissiveMap = sideMatB.map;
          const topMat = new THREE.MeshStandardMaterial({ color: 0x3a4048 });
          const mesh = new THREE.Mesh(
            new THREE.BoxGeometry(w, h, d),
            [sideMatB, sideMatB, topMat, topMat, sideMatB, sideMatB]
          );
          mesh.position.set(cx + lx + (Math.random()*4-2), h / 2 + 0.24, cz + lz + (Math.random()*4-2));
          mesh.castShadow = true; mesh.receiveShadow = true;
          scene.add(mesh);
          addCollider(mesh.position.x, mesh.position.z, w, d);
          nightMats.push(sideMatB);
        }
      }
    }
  }

  buildLamps();
  buildInteriors();
  buildWaterAndDock();
  buildAirport();
  buildBusLine();
  spawnVehicles();
  spawnNPCs();
  spawnPickups();
  setupMission();
}

function addDoor(x, z, label, fn, r) {
  doors.push({ x, z, r: r || 2.6, label, fn });
}
function addZone(x, z, label, fn, interior, r) {
  zones.push({ x, z, r: r || 2.6, label, fn, interior: interior || null });
}

function mkRoom(w, d, h, floorColor, wallColor) {
  const idx = interiorCount++;
  const cx = INTERIOR_BASE + idx * 90, cz = 0;
  const wallMat = new THREE.MeshStandardMaterial({ color: wallColor, roughness: 0.95 });
  const floor = new THREE.Mesh(new THREE.BoxGeometry(w, 0.3, d),
    new THREE.MeshStandardMaterial({ color: floorColor, roughness: 1 }));
  floor.position.set(cx, 0.15, cz); scene.add(floor);
  const ceil = new THREE.Mesh(new THREE.BoxGeometry(w, 0.3, d), wallMat);
  ceil.position.set(cx, h, cz); scene.add(ceil);
  const T = 0.5, x1 = cx - w / 2, x2 = cx + w / 2, z1 = cz - d / 2, z2 = cz + d / 2;
  const mkWall = (wx, wz, ww, wd) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(ww, h, wd), wallMat);
    m.position.set(wx, h / 2, wz); scene.add(m);
    addCollider(wx, wz, ww, wd);
  };
  mkWall(cx, z2, w, T);
  mkWall(x1 + T / 2, cz, T, d);
  mkWall(x2 - T / 2, cz, T, d);
  const door = 5;
  mkWall((x1 + cx - door / 2) / 2, z1, cx - door / 2 - x1, T);
  mkWall((cx + door / 2 + x2) / 2, z1, x2 - cx - door / 2, T);
  const light = new THREE.PointLight(0xffe9c8, 2.4, Math.max(w, d) * 1.6);
  light.position.set(cx, h - 1, cz); scene.add(light);
  return { id: idx, cx, cz, x1, x2, z1, z2, w, d, h,
    spawn: new THREE.Vector3(cx, 0, cz + d / 2 - 3), exit: { x: cx, z: z1 + 1.5 }, anchors: [] };
}

const FURN_MESHES = {
  sofa: () => new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.8, 1),
    new THREE.MeshStandardMaterial({ color: 0x8e44ad, roughness: 0.9 })),
  tv: () => {
    const g = new THREE.Group();
    const screen = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1, 0.15),
      new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0x2244ff, emissiveIntensity: 0.7 }));
    g.add(screen);
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.3, 0.4),
      new THREE.MeshStandardMaterial({ color: 0x222222 }));
    foot.position.y = -0.6; g.add(foot);
    return g;
  },
  plant: () => {
    const g = new THREE.Group();
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.25, 0.5, 8),
      new THREE.MeshStandardMaterial({ color: 0x8a5a2b }));
    pot.position.y = 0.25; g.add(pot);
    const crown = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 8),
      new THREE.MeshStandardMaterial({ color: 0x2d6a2d, roughness: 1 }));
    crown.position.y = 0.9; g.add(crown);
    return g;
  },
  lamp: () => {
    const g = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.5, 6),
      new THREE.MeshStandardMaterial({ color: 0x333333 }));
    pole.position.y = 0.75; g.add(pole);
    const shade = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.4, 8),
      new THREE.MeshStandardMaterial({ color: 0xffe9c8, emissive: 0xffdf9e, emissiveIntensity: 0.8 }));
    shade.position.y = 1.6; g.add(shade);
    return g;
  },
  table: () => new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.45, 0.8),
    new THREE.MeshStandardMaterial({ color: 0x6d4c41 })),
  bed: () => {
    const g = new THREE.Group();
    const base = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.5, 2.4),
      new THREE.MeshStandardMaterial({ color: 0xecf0f1 }));
    base.position.y = 0.35; g.add(base);
    const pillow = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.2, 0.5),
      new THREE.MeshStandardMaterial({ color: 0xffffff }));
    pillow.position.set(0, 0.7, -0.8); g.add(pillow);
    return g;
  },
};

function placeFurniture(propId, key, index) {
  const room = interiorRooms[propId];
  if (!room || !room.anchors.length) return;
  const a = room.anchors[index % room.anchors.length];
  const row = Math.floor(index / room.anchors.length);
  const m = FURN_MESHES[key] ? FURN_MESHES[key]() : null;
  if (!m) return;
  m.position.set(a.x + row * 1.4, 0.3, a.z);
  m.rotation.y = a.ry || 0;
  m.castShadow = true;
  scene.add(m);
  placedFurniture.push(m);
}

function rebuildFurniture() {
  for (const m of placedFurniture) scene.remove(m);
  placedFurniture.length = 0;
  for (const pid of Object.keys(furniture)) {
    furniture[pid].forEach((k, i) => placeFurniture(pid, k, i));
  }
}

function buildInteriors() {
  const hp = mkRoom(26, 20, 4.2, 0xe8ecf0, 0xd5dde4);
  interiorRooms.hospital = hp;
  const hcounter = new THREE.Mesh(new THREE.BoxGeometry(6, 1.1, 1.3),
    new THREE.MeshStandardMaterial({ color: 0xb8c2ca }));
  hcounter.position.set(hp.cx + 5, 0.85, hp.cz + 4); scene.add(hcounter);
  addCollider(hp.cx + 5, hp.cz + 4, 6, 1.3);
  for (let i = 0; i < 3; i++) {
    const bed = FURN_MESHES.bed();
    bed.position.set(hp.cx - 7 + (i % 2) * 4.5, 0.3, hp.cz - 5 + Math.floor(i / 2) * 4.5);
    scene.add(bed);
  }
  addZone(hp.cx + 5, hp.cz + 2.2, 'E — Se soigner (25 $)', healAction, 'hospital');

  const un = mkRoom(30, 22, 4.6, 0xd8cbb8, 0xcfc4b0);
  interiorRooms.university = un;
  const board = new THREE.Mesh(new THREE.PlaneGeometry(10, 2.6),
    new THREE.MeshStandardMaterial({ color: 0x1e3d2f }));
  board.position.set(un.cx, 2.4, un.cz + un.d / 2 - 0.4); scene.add(board);
  for (let i = 0; i < 6; i++) {
    const desk = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.8, 0.9),
      new THREE.MeshStandardMaterial({ color: 0x9a7b53 }));
    desk.position.set(un.cx - 8 + (i % 3) * 8, 0.7, un.cz - 4 + Math.floor(i / 3) * 4);
    scene.add(desk);
    addCollider(desk.position.x, desk.position.z, 1.8, 0.9);
  }
  addZone(un.cx, un.cz + 6.5, 'E — Suivre un cours (50 $)', courseAction, 'university', 3.2);

  const ho = mkRoom(24, 18, 5, 0x8a6d4f, 0xa98f6c);
  interiorRooms.hotel = ho;
  const lcounter = new THREE.Mesh(new THREE.BoxGeometry(5, 1.2, 1.3),
    new THREE.MeshStandardMaterial({ color: 0x5d4037 }));
  lcounter.position.set(ho.cx, 0.9, ho.cz + 4); scene.add(lcounter);
  addCollider(ho.cx, ho.cz + 4, 5, 1.3);
  const chand = new THREE.Mesh(new THREE.SphereGeometry(0.6, 10, 8),
    new THREE.MeshStandardMaterial({ color: 0xffe9c8, emissive: 0xffdf9e, emissiveIntensity: 1.2 }));
  chand.position.set(ho.cx, 3.6, ho.cz); scene.add(chand);
  addZone(ho.cx - 3.4, ho.cz + 2.4, 'E — Chambre (50 $ / nuit)', hotelSleepAction, 'hotel');

  const ap = mkRoom(22, 16, 3.8, 0xcdb89a, 0xd9cdb8);
  interiorRooms.apartment = ap;
  const kitchen = new THREE.Mesh(new THREE.BoxGeometry(7, 1, 1.2),
    new THREE.MeshStandardMaterial({ color: 0x90a4ae }));
  kitchen.position.set(ap.cx + 5, 0.8, ap.cz - 5.5); scene.add(kitchen);
  addCollider(ap.cx + 5, ap.cz - 5.5, 7, 1.2);
  const bedA = FURN_MESHES.bed();
  bedA.position.set(ap.cx - 7, 0.3, ap.cz - 4); bedA.rotation.y = Math.PI / 2; scene.add(bedA);
  addCollider(ap.cx - 7, ap.cz - 4, 1.6, 2.4);
  ap.anchors = [
    { x: ap.cx - 3, z: ap.cz + 3, ry: 0 },
    { x: ap.cx + 2, z: ap.cz + 3.5, ry: 0 },
    { x: ap.cx + 5, z: ap.cz + 2, ry: -Math.PI / 2 },
    { x: ap.cx - 1, z: ap.cz + 5, ry: 0 },
  ];
  addZone(ap.cx - 7, ap.cz - 1.6, 'E — Dormir', homeSleepAction, 'apartment', 2.4);

  const vi = mkRoom(34, 24, 5.2, 0xe8dfc8, 0xd9cdb8);
  interiorRooms.villa = vi;
  const pool = new THREE.Mesh(new THREE.BoxGeometry(8, 0.2, 5),
    new THREE.MeshStandardMaterial({ color: 0x1a6ea0, roughness: 0.2, metalness: 0.1 }));
  pool.position.set(vi.cx - 8, 0.32, vi.cz + 4); scene.add(pool);
  addCollider(vi.cx - 8, vi.cz + 4, 8, 5);
  const bedV = FURN_MESHES.bed();
  bedV.position.set(vi.cx + 10, 0.3, vi.cz - 6); scene.add(bedV);
  addCollider(vi.cx + 10, vi.cz - 6, 1.6, 2.4);
  vi.anchors = [
    { x: vi.cx + 2, z: vi.cz + 6, ry: 0 },
    { x: vi.cx + 6, z: vi.cz + 6, ry: 0 },
    { x: vi.cx + 10, z: vi.cz + 6, ry: 0 },
    { x: vi.cx - 2, z: vi.cz + 6, ry: 0 },
    { x: vi.cx + 2, z: vi.cz - 2, ry: Math.PI },
    { x: vi.cx - 6, z: vi.cz - 6, ry: 0 },
  ];
  addZone(vi.cx + 10, vi.cz - 3.4, 'E — Dormir', homeSleepAction, 'villa', 2.4);

  const de = mkRoom(30, 22, 5, 0xd5dde4, 0xbfc9d4);
  interiorRooms.dealer = de;
  const catalog = ['moto', 'sport', 'boat'];
  catalog.forEach((type, i) => {
    const s = specs[type];
    const platform = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.6, 0.3, 20),
      new THREE.MeshStandardMaterial({ color: 0x8395a7 }));
    platform.position.set(de.cx - 9 + i * 9, 0.3, de.cz - 3); scene.add(platform);
    const display = makeVehicleMesh(type, s.color);
    display.position.set(de.cx - 9 + i * 9, 0.45, de.cz - 3);
    display.rotation.y = Math.PI / 4;
    scene.add(display);
    addZone(de.cx - 9 + i * 9, de.cz - 0.2,
      'E — Acheter : ' + s.name + ' ($ ' + s.price + ')',
      () => buyVehicle(type), 'dealer', 3);
  });

  const gy = mkRoom(26, 20, 4.5, 0x36454f, 0x2f3e46);
  interiorRooms.gym = gy;
  for (let i = 0; i < 4; i++) {
    const rack = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.9, 0.8),
      new THREE.MeshStandardMaterial({ color: 0x2c3e50 }));
    rack.position.set(gy.cx - 8 + (i % 2) * 5, 0.75, gy.cz - 6 + Math.floor(i / 2) * 3.5);
    scene.add(rack);
    addCollider(rack.position.x, rack.position.z, 1.6, 0.8);
  }
  const bench = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.5, 1),
    new THREE.MeshStandardMaterial({ color: 0x7f1f1f }));
  bench.position.set(gy.cx + 5, 0.55, gy.cz - 4); scene.add(bench);
  addCollider(gy.cx + 5, gy.cz - 4, 2.4, 1);
  anchorsMap.gym = { x: gy.cx, z: gy.cz + gy.d / 2 + 3 };
  addZone(gy.cx + 4, gy.cz + 3, 'E — Séance de muscu (20 $)', gymAction, 'gym', 2.8);
}

function buildWaterAndDock() {
  const water = new THREE.Mesh(new THREE.BoxGeometry(WATER_MAX - WATER_X + 60, 0.2, SIZE + 340),
    new THREE.MeshStandardMaterial({ color: 0x1a6ea0, roughness: 0.15, metalness: 0.3 }));
  water.position.set((WATER_X + WATER_MAX + 60) / 2, 0.05, 0);
  water.receiveShadow = true; scene.add(water);
  const sand = new THREE.Mesh(new THREE.BoxGeometry(26, 0.18, SIZE + 340),
    new THREE.MeshStandardMaterial({ color: 0xe0c98f, roughness: 1 }));
  sand.position.set(SIZE / 2 + 22, 0.06, 0); scene.add(sand);
  const dock = new THREE.Mesh(new THREE.BoxGeometry(WATER_X - SIZE / 2 - 2, 0.5, 7),
    new THREE.MeshStandardMaterial({ color: 0x8a6d4f, roughness: 1 }));
  dock.position.set((WATER_X + SIZE / 2 + 2) / 2, 0.4, 20);
  dock.castShadow = true; dock.receiveShadow = true; scene.add(dock);
  addZone(WATER_X - 2.5, 20, () => {
    if (playerVehicle) return null;
    if (fishing) return fishing.biteT > 0 ? 'E — FERRER !' : '…un poisson approche…';
    return 'E — Pêcher au ponton';
  }, fishingZoneAction, null, 3);
  const mkBoat = (bz) => {
    const s = specs.boat;
    const mesh = makeVehicleMesh('boat', s.color);
    mesh.position.set(WATER_X + 26, 0, bz); mesh.rotation.y = -Math.PI / 2;
    mesh.castShadow = true; scene.add(mesh);
    vehiclesParked.push({ mesh, spec: s, type: 'boat', speed: 0, heading: -Math.PI / 2, fuel: s.cap, hp: 100 });
  };
  mkBoat(12); mkBoat(28);
}

function buildAirport() {
  const runway = new THREE.Mesh(new THREE.BoxGeometry(320, 0.15, 20),
    new THREE.MeshStandardMaterial({ color: 0x3a3f44, roughness: 0.9 }));
  runway.position.set(-50, 0.1, RUNWAY_Z); runway.receiveShadow = true; scene.add(runway);
  for (let x = -200; x <= 110; x += 18) {
    const dash = new THREE.Mesh(new THREE.BoxGeometry(8, 0.05, 0.6),
      new THREE.MeshStandardMaterial({ color: 0xe8d44d }));
    dash.position.set(x, 0.2, RUNWAY_Z); scene.add(dash);
  }
  const s = specs.plane;
  const mesh = makeVehicleMesh('plane', s.color);
  mesh.position.set(95, 0, RUNWAY_Z - 4); mesh.rotation.y = -Math.PI / 2;
  mesh.castShadow = true; scene.add(mesh);
  vehiclesParked.push({ mesh, spec: s, type: 'plane', speed: 0, heading: -Math.PI / 2, fuel: s.cap, hp: 100, alt: 0 });
  const tower = new THREE.Mesh(new THREE.BoxGeometry(8, 14, 8),
    new THREE.MeshStandardMaterial({ color: 0x95a5a6 }));
  tower.position.set(130, 7, RUNWAY_Z - 18); tower.castShadow = true; scene.add(tower);
  addCollider(130, RUNWAY_Z - 18, 8, 8);
  const top = new THREE.Mesh(new THREE.BoxGeometry(10, 2, 10),
    new THREE.MeshStandardMaterial({ color: 0x2c3e50, emissive: 0x2244ff, emissiveIntensity: 0.4 }));
  top.position.set(130, 15, RUNWAY_Z - 18); scene.add(top);
}

function buildBusLine() {
  const s = specs.bus;
  const mesh = makeVehicleMesh('bus', s.color);
  scene.add(mesh);
  cityBus = { mesh, spec: s, type: 'bus', speed: 0, heading: 0, wp: 0, stopT: 2, fuel: s.cap, hp: 100, alt: 0 };
  const signMat = new THREE.MeshBasicMaterial({ map: signTexture('🚌 BUS', '#2980b9', '#fff') });
  for (const st of busStops()) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 3, 8),
      new THREE.MeshStandardMaterial({ color: 0x555 }));
    pole.position.set(st.x + 5.5, 1.5, st.z + 5.5); scene.add(pole);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(3, 0.9), signMat);
    sign.position.set(st.x + 5.5, 3.3, st.z + 5.5); scene.add(sign);
  }
}

function busStops() {
  return [
    { x: roadCenters[1], z: roadCenters[1] },
    { x: roadCenters[1], z: roadCenters[4] },
    { x: roadCenters[4], z: roadCenters[4] },
    { x: roadCenters[4], z: roadCenters[1] },
  ];
}

function updateBus(dt) {
  const b = cityBus;
  if (!b) return;
  if (b.stopT > 0) {
    b.stopT -= dt;
    b.speed = 0;
    if (getOffBus && b.stopT < 3.6) {
      getOffBus = false; ridingBus = false;
      playerMesh.visible = true;
      playerPos.set(b.mesh.position.x + 3, 0, b.mesh.position.z + 3);
      toast('🚌 Tu descends du bus.');
    }
    return;
  }
  const stops = busStops();
  const tgt = stops[b.wp % stops.length];
  const dx = tgt.x - b.mesh.position.x, dz = tgt.z - b.mesh.position.z;
  const d = Math.hypot(dx, dz);
  if (d < 3) {
    b.wp = (b.wp + 1) % stops.length;
    b.stopT = 4;
    return;
  }
  const targetA = Math.atan2(dx, dz);
  let da = targetA - b.heading;
  while (da > Math.PI) da -= Math.PI * 2;
  while (da < -Math.PI) da += Math.PI * 2;
  b.heading += Math.max(-1.4 * dt, Math.min(1.4 * dt, da));
  b.mesh.rotation.y = b.heading;
  b.speed = 9;
  b.mesh.position.x += Math.sin(b.heading) * b.speed * dt;
  b.mesh.position.z += Math.cos(b.heading) * b.speed * dt;
  if (ridingBus) playerPos.set(b.mesh.position.x, 0, b.mesh.position.z);
}

function boardBus() {
  if (money < 2) { toast('Pas assez d’argent (2 $)'); return; }
  money -= 2;
  addTransaction('🚌 Ticket de bus', -2);
  ridingBus = true;
  playerMesh.visible = false;
  toast('🚌 Bienvenue à bord — E pour demander l’arrêt');
}

function requestBusStop() {
  getOffBus = true;
  toast('🚌 Arrêt demandé — descente au prochain arrêt');
}

function spawnOwned(type, x, z, heading, hp, fuel) {
  const s = specs[type];
  const mesh = makeVehicleMesh(type, s.color);
  mesh.position.set(x, 0, z); mesh.rotation.y = heading;
  mesh.castShadow = true; scene.add(mesh);
  const v = { mesh, spec: s, type, speed: 0, heading, fuel: fuel !== undefined ? fuel : s.cap,
    hp: hp !== undefined ? hp : 100, alt: 0, owned: true };
  ownedVehicles.push(v);
  return v;
}

function clearOwned() {
  for (const v of ownedVehicles) scene.remove(v.mesh);
  ownedVehicles.length = 0;
}

function buyVehicle(type) {
  const s = specs[type];
  if (money < s.price) { toast('Pas assez d’argent ($ ' + s.price + ')'); return false; }
  money -= s.price;
  addTransaction('🔑 ' + s.name, -s.price);
  const x = roadCenters[3];
  const z = cell(3) + 40;
  spawnOwned(type, x, z, 0);
  toast('🔑 ' + s.name + ' livrée sur la route !');
  return true;
}

function sellVehicle() {
  const v = playerVehicle;
  if (!v || !v.owned) { toast('Seuls tes véhicules peuvent être vendus.'); return false; }
  const price = Math.floor(v.spec.price / 2);
  money += price;
  addTransaction('💸 Vente ' + v.spec.name, price);
  const idx = ownedVehicles.indexOf(v);
  if (idx >= 0) ownedVehicles.splice(idx, 1);
  scene.remove(v.mesh);
  playerVehicle = null;
  playerMesh.visible = true;
  playerPos.set(v.mesh.position.x + 3, 0, v.mesh.position.z);
  toast('💸 ' + v.spec.name + ' vendue pour $ ' + price);
  return true;
}

function refuelAction() {
  const v = playerVehicle;
  if (!v) { toast('Viens avec un véhicule.'); return false; }
  const missing = v.spec.cap - v.fuel;
  if (missing <= 0.05) { toast('⛽ Réservoir plein !'); return false; }
  const cost = Math.ceil(missing * 2);
  if (money < cost) { toast('Pas assez d’argent ($ ' + cost + ')'); return false; }
  money -= cost;
  v.fuel = v.spec.cap;
  addTransaction('⛽ Carburant ' + v.spec.name, -cost);
  toast('⛽ Plein fait ($ ' + cost + ')');
  return true;
}

function repairAction() {
  const v = playerVehicle;
  if (!v) { toast('Viens avec un véhicule.'); return false; }
  if (v.hp >= 100) { toast('🔧 Aucun dégât.'); return false; }
  if (money < 100) { toast('Pas assez d’argent ($ 100)'); return false; }
  money -= 100;
  v.hp = 100;
  addTransaction('🔧 Réparation ' + v.spec.name, -100);
  toast('🔧 Réparé comme neuf !');
  return true;
}

function enterDoorInterior(id) {
  if (properties[id] && !properties[id].owned) {
    toast('À vendre : ' + properties[id].name + ' — $ ' + properties[id].price + ' (téléphone 📱 → Immo)');
    return;
  }
  enterInterior(id);
}

function enterInterior(id) {
  const room = interiorRooms[id];
  if (!room) return;
  outdoorPos = outdoorPos || new THREE.Vector3();
  outdoorPos.copy(playerPos);
  insideInterior = id;
  playerPos.set(room.spawn.x, 0, room.spawn.z);
  toast('📍 ' + (properties[id] ? properties[id].name : { hospital: 'Hôpital', university: 'Université', hotel: 'Hôtel Nova' }[id] || id));
}

function exitInterior() {
  if (outdoorPos) playerPos.copy(outdoorPos);
  insideInterior = null;
}

function healAction() {
  if (health >= 100) { toast('Tu es en pleine forme !'); return; }
  if (money < 25) { toast('Pas assez d\u2019argent (25 $)'); return; }
  money -= 25;
  addTransaction('🏥 Soins hôpital', -25);
  health = 100;
  toast('❤️ Soigné !');
}

function courseAction() {
  if (education >= 5) { toast('Diplôme maximum atteint 🎓'); return; }
  if (money < 50) { toast('Pas assez d\u2019argent (50 $)'); return; }
  money -= 50;
  education += 1;
  addTransaction('🎓 Cours université', -50);
  toast('🎓 Études ' + education + '/5 — missions +10 %/niveau');
}

function hotelSleepAction() {
  if (money < 50) { toast('Pas assez d\u2019argent (50 $)'); return; }
  money -= 50;
  addTransaction('🏨 Chambre d\u2019hôtel', -50);
  sleepAction();
}

function sleepAction() {
  tod = 8 / 24;
  health = 100;
  toast('😴 Tu dors jusqu\u2019au matin…');
}

function homeSleepAction() { sleepAction(); }

function buyProperty(id) {
  const p = properties[id];
  if (!p || p.owned) return false;
  if (money < p.price) { toast('Pas assez d\u2019argent (' + p.price + ' $)'); return false; }
  money -= p.price;
  p.owned = true;
  addTransaction('🏠 ' + p.name, -p.price);
  toast('🏠 ' + p.name + ' achetée !');
  return true;
}

function buyFurniture(propId, key) {
  const f = FURNITURE[key];
  if (!f) return false;
  if (money < f.price) { toast('Pas assez d\u2019argent'); return false; }
  money -= f.price;
  addTransaction('🛋️ ' + f.name, -f.price);
  furniture[propId].push(key);
  placeFurniture(propId, key, furniture[propId].length - 1);
  toast('🛋️ ' + f.name + ' livré !');
  if (story.active && story.idx === 2 && (properties.apartment.owned || properties.villa.owned)) storyNext();
  return true;
}

function bizDemand(b) {
  const r = b.salePrice / b.basePrice;
  if (r <= 1) return 3;
  if (r <= 1.5) return 2;
  if (r <= 2) return 1;
  return 0;
}

function buyBusiness(id) {
  const b = businesses[id];
  if (!b || b.owned) return false;
  if (money < b.price) { toast('Pas assez d\u2019argent pour ce commerce (' + b.price + ' $)'); return false; }
  money -= b.price;
  b.owned = true; b.profit -= b.price;
  addTransaction('\ud83c\udfea ' + b.name + ' (achat)', -b.price);
  toast('\ud83c\udfea ' + b.name + ' est \u00e0 toi ! G\u00e8re-le via le t\u00e9l\u00e9phone (onglet Biz).');
  return true;
}

function hireEmployee(id) {
  const b = businesses[id];
  if (!b || !b.owned) return false;
  if (b.employees >= 2) { toast('Effectif complet (2 employ\u00e9s max).'); return false; }
  if (money < 500) { toast('Pas assez d\u2019argent (embauche : 500 $)'); return false; }
  money -= 500; b.employees++; b.profit -= 500;
  addTransaction('\ud83d\udc77 Employ\u00e9 \u2014 ' + b.name, -500);
  toast('\ud83d\udc77 Embauch\u00e9 ! Salaire : 100 $ / jour.');
  return true;
}

function fireEmployee(id) {
  const b = businesses[id];
  if (!b || !b.owned || b.employees <= 0) return false;
  b.employees--;
  toast('\ud83d\udc77 Employ\u00e9 renvoy\u00e9.');
  return true;
}

function restockBusiness(id) {
  const b = businesses[id];
  if (!b || !b.owned) return false;
  const missing = b.maxStock - b.stock;
  if (missing <= 0) { toast('Stock d\u00e9j\u00e0 plein.'); return false; }
  const qty = Math.min(10, missing), cost = qty * b.unitCost;
  if (money < cost) { toast('Pas assez d\u2019argent pour le r\u00e9assort (' + cost + ' $)'); return false; }
  money -= cost; b.stock += qty; b.profit -= cost;
  addTransaction('\ud83d\udce6 R\u00e9assort \u2014 ' + b.name + ' (+' + qty + ')', -cost);
  return true;
}

function setBizPrice(id, delta) {
  const b = businesses[id];
  if (!b || !b.owned) return false;
  b.salePrice = Math.max(Math.ceil(b.basePrice / 2), Math.min(b.basePrice * 3, b.salePrice + delta));
  return true;
}

function upgradeBiz(id) {
  const b = businesses[id];
  if (!b || !b.owned || b.level >= 3) return false;
  const cost = 2000 * b.level;
  if (money < cost) { toast('Pas assez d\u2019argent (' + cost + ' $)'); return false; }
  money -= cost; b.level++; b.profit -= cost;
  addTransaction('\u2b06\ufe0f Am\u00e9lioration \u2014 ' + b.name, -cost);
  toast('\u2b06\ufe0f ' + b.name + ' am\u00e9lior\u00e9 (niveau ' + b.level + ') : plus de clients !');
  return true;
}

function bizHourTick() {
  for (const b of Object.values(businesses)) {
    if (!b.owned) continue;
    const sold = Math.min(b.stock, b.employees * bizDemand(b) + (b.level - 1) * 2);
    if (sold > 0) {
      const income = sold * b.salePrice;
      money += income; b.profit += income; b.stock -= sold;
      addTransaction('\ud83d\udcb0 Ventes \u2014 ' + b.name + ' (' + sold + ')', income);
    }
    if (b.stock === 0 && b.employees > 0) toastOnce('\ud83d\udce6 Stock \u00e9puis\u00e9 \u2014 r\u00e9assort via le t\u00e9l\u00e9phone');
  }
}

function bizDayTick() {
  let total = 0;
  for (const b of Object.values(businesses)) if (b.owned) total += b.employees * 100;
  if (total === 0) return;
  if (money >= total) {
    money -= total;
    for (const b of Object.values(businesses)) if (b.owned && b.employees) b.profit -= b.employees * 100;
    addTransaction('\ud83d\udc77 Salaires', -total);
    toast('\ud83d\udc77 Salaires pay\u00e9s (' + total + ' $)');
  } else {
    const b = Object.values(businesses).find(x => x.owned && x.employees > 0);
    if (b) { b.employees--; toast('\ud83d\udc77 Un employ\u00e9 quitte ' + b.name + ' (salaires impay\u00e9s)'); }
  }
}

// ================= ACTIVITES / MINI-JEUX =================
function startFishing() {
  if (playerVehicle) { toast('Sors du véhicule pour pêcher.'); return; }
  fishing = { t: 1.5 + Math.random() * 3, biteT: 0 };
  toast('🎣 Ligne lancée… attends qu’un poisson morde.');
}
function fishingTick(dt) {
  if (!fishing) return;
  if (fishing.biteT > 0) {
    fishing.biteT -= dt;
    if (fishing.biteT <= 0) { fishing = null; toast('🎣 Le poisson s’est échappé…'); }
    return;
  }
  fishing.t -= dt;
  if (fishing.t <= 0) { fishing.biteT = 3; toastOnce('🎣 Ça mord ! Appuie sur E vite !'); }
}
function reelFish() {
  if (!fishing || fishing.biteT <= 0) return false;
  const val = 15 + Math.floor(Math.random() * 26);
  money += val; stats.fish++;
  addTransaction('🐟 Poisson vendu', val);
  toast('🐟 ' + (val >= 30 ? 'Gros poisson !' : 'Poisson capturé !') + ' +$ ' + val);
  fishing = null;
  return true;
}
function fishingZoneAction() {
  if (fishing && fishing.biteT > 0) reelFish();
  else if (!fishing) startFishing();
}
function gymAction() {
  if (money < 20) { toast('Pas assez d’argent (20 $)'); return false; }
  money -= 20;
  fitness = Math.min(5, fitness + 1);
  stats.workouts++;
  addTransaction('💪 Salle Nova', -20);
  toast('💪 Séance terminée ! Forme : ' + fitness + '/5 (course plus rapide)');
  return true;
}
function ensureRaceMarker() {
  if (!raceMarker) {
    raceMarker = new THREE.Mesh(
      new THREE.TorusGeometry(4, 0.5, 8, 24),
      new THREE.MeshBasicMaterial({ color: 0x2ecc71 })
    );
    scene.add(raceMarker);
  }
}
function startRace() {
  if (race) return false;
  const pts = [];
  for (let i = 0; i < 3; i++) {
    const a = Math.random() * Math.PI * 2, r = 120 + Math.random() * 140;
    pts.push({ x: Math.cos(a) * r, z: Math.sin(a) * r });
  }
  ensureRaceMarker();
  race = { idx: 0, t: 0, cps: pts };
  toast('🏁 Course lancée ! Traverse les 3 anneaux verts.');
  return true;
}
function updateRace(dt) {
  if (!race) return;
  race.t += dt;
  const cp = race.cps[race.idx];
  raceMarker.position.set(cp.x, 4, cp.z);
  if (Math.hypot(cp.x - playerPos.x, cp.z - playerPos.z) < 6) {
    race.idx++;
    if (race.idx >= race.cps.length) {
      const reward = Math.max(150, Math.round(500 - race.t * 4));
      money += reward; stats.races++;
      addTransaction('🏁 Course de rue', reward);
      toast('🏁 Course terminée en ' + race.t.toFixed(1) + ' s ! +$ ' + reward);
      race = null;
      raceMarker.position.set(0, -100, 0);
      if (story.active && story.idx === 3) storyNext();
    } else toast('✅ Checkpoint ' + race.idx + '/3');
  }
}
function shootBasket() {
  if (basketCool > 0) return false;
  basketCool = 2;
  if (Math.random() < 0.4 + fitness * 0.08) {
    money += 10; stats.baskets++;
    addTransaction('🏀 Panier !', 10);
    toast('🏀 Panier ! +$ 10');
    return true;
  }
  toast('🏀 Raté… retente ta chance.');
  return false;
}

// ================= HISTOIRE =================
function startStory() {
  if (story.active) return false;
  story.active = true;
  messages.unshift({ from: 'Marc', text: 'Bienvenue à Nova City ! Fais une livraison pour te faire la main.' });
  toast('📖 Histoire lancée : ' + story.missions[0].title);
  return true;
}
function storyNext() {
  const m = story.missions[story.idx];
  if (!m) return;
  if (m.reward) { money += m.reward; addTransaction('📖 ' + m.title, m.reward); }
  messages.unshift({ from: 'Marc', text: 'Bravo pour « ' + m.title + ' » ! Je t’appelle bientôt.' });
  story.idx++;
  if (story.idx >= story.missions.length) story.done = true;
  toast('📖 Mission accomplie : ' + m.title + (m.reward ? ' (+' + m.reward + ' $)' : ''));
}
function openFinalChoice() {
  dialog = {
    npc: { name: 'Marc', job: { label: 'Contact' }, rel: 0 },
    idx: 0,
    lines: ['Marc : J’ai une offre pour toi. 1 000 $ en cash, pas de questions.', 'Marc : Ou alors 500 $ propres. À toi de choisir.'],
    choices: [
      { label: 'Accepter le cash (+1 000 $)', fn: () => { money += 1000; addTransaction('🕶️ Marché sombre', 1000); storyNext(); } },
      { label: 'Refuser (+500 $, honnête)', fn: () => { money += 500; addTransaction('✅ Marché propre', 500); storyNext(); } },
    ],
  };
  document.getElementById('dialog').style.display = 'block';
  renderDialog();
}
function resolveChoice(i) {
  const c = dialog && dialog.choices && dialog.choices[i];
  if (!c) return;
  dialog = null;
  document.getElementById('dialog').style.display = 'none';
  c.fn();
}

// ================= TELEPHONE : GPS / CONTACTS =================
function setGPS(target) {
  navTarget = target || missionTarget || null;
  if (!navTarget) { toast('Aucun objectif à afficher'); return false; }
  toast('📍 GPS activé — suis la ligne verte');
  return true;
}
function callContact(name) {
  const n = npcs.find(x => x.name === name && x.rel > 0);
  if (!n) { toast('Contact inconnu (discute d’abord avec des habitants).'); return false; }
  const replies = ['On se voit au parc ?', 'Je bosse, on parlera ce soir !', 'Tu as vu la nouvelle salle de sport ?', 'Passe à la boutique quand tu veux.', 'La pluie, encore…'];
  toast('📞 ' + n.name + ' : « ' + replies[Math.floor(Math.random() * replies.length)] + ' »');
  return true;
}
function cycleVolume() {
  volume = volume === 1 ? 0.5 : volume === 0.5 ? 0 : 1;
  toast('🔊 Volume : ' + Math.round(volume * 100) + ' %');
  return volume;
}

// ================= METEO =================
function setWeather(w) {
  weather = w; weatherCount++;
  grip = w === 'pluie' ? 0.75 : w === 'orage' ? 0.55 : 1;
  const far = w === 'brouillard' ? 120 : w === 'orage' ? 260 : w === 'pluie' ? 340 : 460;
  if (scene.fog) scene.fog.far = far;
  if (w === 'pluie' || w === 'orage') {
    if (!rainMesh) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(400 * 3), 3));
      rainMesh = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0x9fc5e8, size: 0.35 }));
      scene.add(rainMesh);
    }
    rainMesh.visible = true;
  } else if (rainMesh) rainMesh.visible = false;
  updateRainAudio();
  toast('🌦️ Météo : ' + w);
  return true;
}
function updateWeather(dt) {
  weatherT -= dt;
  if (weatherT <= 0) {
    weatherT = 45 + Math.random() * 75;
    const next = WEATHERS[Math.floor(Math.random() * WEATHERS.length)];
    if (next !== weather) setWeather(next);
  }
  if (rainMesh && rainMesh.visible) {
    const pos = rainMesh.geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      let y = pos.getY(i) - 26 * dt;
      if (y < 0) {
        y = 40;
        pos.setX(i, playerPos.x + (Math.random() - 0.5) * 80);
        pos.setZ(i, playerPos.z + (Math.random() - 0.5) * 80);
      }
      pos.setY(i, y);
    }
    pos.needsUpdate = true;
  }
  if (weather === 'orage') {
    lightningT -= dt;
    if (lightningT <= 0) { flashT = 0.12; lightningT = 4 + Math.random() * 8; }
  }
  if (flashT > 0) {
    flashT -= dt;
    if (hemiLight) hemiLight.intensity += 1.3;
  }
}
function updateRainAudio() {
  if (!AC) return;
  const rainy = weather === 'pluie' || weather === 'orage';
  if (rainy && !rainNode) {
    const buf = AC.createBuffer(1, AC.sampleRate * 2, AC.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    rainNode = AC.createBufferSource();
    rainNode.buffer = buf; rainNode.loop = true;
    const g = AC.createGain();
    g.gain.value = (weather === 'orage' ? 0.06 : 0.03) * volume;
    rainNode.connect(g); g.connect(AC.destination);
    rainNode.start();
  } else if (!rainy && rainNode) { rainNode.stop(); rainNode = null; }
}

// ================= OPTIMISATION =================
function applyQuality(fps) {
  fpsAvg = fps;
  const before = qualityScale;
  if (fps < 35 && qualityScale > 0.5) qualityScale -= 0.25;
  else if (fps > 58 && qualityScale < 1) qualityScale += 0.25;
  if (before !== qualityScale && renderer)
    renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio || 1, 2) * qualityScale);
  return qualityScale;
}

// ================= MULTIJoueur (client) =================
function sanitizeChat(s) { return String(s).slice(0, 120).replace(/[<>]/g, ''); }
function netConnect(url, name, token) {
  if (typeof WebSocket === 'undefined') { toast('Multijoueur : WebSocket indisponible ici.'); return false; }
  if (!url || !String(url).startsWith('ws')) { toast('URL de serveur invalide (ws://…)'); return false; }
  try { net.ws = new WebSocket(String(url)); } catch (e) { toast('Connexion impossible au serveur.'); return false; }
  net.ws.onopen = () => {
    net.on = true;
    net.ws.send(JSON.stringify({ t: 'join', name: String(name || 'Joueur').slice(0, 16), token: String(token || '') }));
    toast('🌐 Connecté au serveur Nova City');
  };
  net.ws.onclose = () => { net.on = false; net.ws = null; toast('🌐 Déconnecté du serveur.'); };
  net.ws.onerror = () => { toast('🌐 Erreur de connexion au serveur.'); };
  net.ws.onmessage = ev => { let m; try { m = JSON.parse(ev.data); } catch (e) { return; } netHandle(m); };
  return true;
}
function netDisconnect() {
  if (net.ws) net.ws.close();
  net.on = false;
  for (const rp of net.players.values()) scene.remove(rp.mesh);
  net.players.clear();
}
function netEnsure(p) {
  let rp = net.players.get(p.id);
  if (!rp) {
    rp = { id: p.id, name: p.name || 'Joueur', mesh: makeHumanoid(0x3498db, 0x2c3e50, 0xf5c9a0) };
    scene.add(rp.mesh);
    net.players.set(p.id, rp);
  }
  if (p.name) rp.name = p.name;
  return rp;
}
function netHandle(m) {
  if (!m || typeof m.t !== 'string') return;
  if (m.t === 'welcome') net.id = m.id;
  else if (m.t === 'players') { for (const p of m.list || []) netEnsure(p); }
  else if (m.t === 'state') {
    const rp = netEnsure({ id: m.id });
    if (Number.isFinite(m.x) && Number.isFinite(m.z)) rp.mesh.position.set(m.x, 0, m.z);
    rp.mesh.rotation.y = m.ry || 0;
  } else if (m.t === 'chat') {
    toast('💬 ' + sanitizeChat(m.name || '?') + ' : ' + sanitizeChat(m.text || ''));
  } else if (m.t === 'leave') {
    const rp = net.players.get(m.id);
    if (rp) { scene.remove(rp.mesh); net.players.delete(m.id); }
  }
}
function netUpdate(dt) {
  if (!net.on || !net.ws || net.ws.readyState !== 1) return;
  net.sendT -= dt;
  if (net.sendT <= 0) {
    net.sendT = 0.1;
    net.ws.send(JSON.stringify({
      t: 'state',
      x: +playerPos.x.toFixed(2), z: +playerPos.z.toFixed(2),
      ry: +(playerVehicle ? playerVehicle.mesh.rotation.y : playerMesh.rotation.y).toFixed(2),
      veh: playerVehicle ? playerVehicle.type : '',
    }));
  }
}
function netChat(text) {
  if (!net.on || !net.ws) { toast('Non connecté au multijoueur.'); return false; }
  net.ws.send(JSON.stringify({ t: 'chat', text: sanitizeChat(text) }));
  return true;
}

// ================= SUCCES =================
let achT = 0;
function checkAchievements() {
  for (const a of ACHIEVEMENTS) {
    if (!unlockedAch.includes(a.id) && a.check()) {
      unlockedAch.push(a.id);
      toast('🏆 Succès débloqué : ' + a.name);
    }
  }
}

function buildPark(cx, cz) {
  const grass = new THREE.Mesh(new THREE.BoxGeometry(BLOCK - 6, 0.1, BLOCK - 6),
    new THREE.MeshStandardMaterial({ color: 0x3f7a3f, roughness: 1 }));
  grass.position.set(cx, 0.28, cz); grass.receiveShadow = true; scene.add(grass);
  for (let i = 0; i < 9; i++) {
    const tx = cx + (Math.random() - 0.5) * 44, tz = cz + (Math.random() - 0.5) * 44;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 2.6, 8),
      new THREE.MeshStandardMaterial({ color: 0x6b4a2f }));
    trunk.position.set(tx, 1.6, tz); trunk.castShadow = true; scene.add(trunk);
    const crown = new THREE.Mesh(new THREE.SphereGeometry(2 + Math.random(), 10, 8),
      new THREE.MeshStandardMaterial({ color: 0x2d6a2d, roughness: 1 }));
    crown.position.set(tx, 3.8, tz); crown.castShadow = true; scene.add(crown);
    addCollider(tx, tz, 1, 1);
  }
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 3.6, 8),
    new THREE.MeshStandardMaterial({ color: 0x555c66 }));
  pole.position.set(cx + 10, 2.1, cz - 10); pole.castShadow = true; scene.add(pole);
  addCollider(cx + 10, cz - 10, 0.4, 0.4);
  const backb = new THREE.Mesh(new THREE.BoxGeometry(3, 2, 0.15),
    new THREE.MeshStandardMaterial({ color: 0xecf0f1 }));
  backb.position.set(cx + 10, 3.9, cz - 10.6); scene.add(backb);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.06, 8, 18),
    new THREE.MeshStandardMaterial({ color: 0xe74c3c }));
  ring.position.set(cx + 10, 3.05, cz - 10); ring.rotation.x = Math.PI / 2; scene.add(ring);
  addZone(cx + 8, cz - 8, 'E — Tir au panier (10 $ par panier)', shootBasket, null, 2.6);
  addZone(cx - 10, cz + 10, 'E — Course de rue (3 anneaux)', startRace, null, 2.8);
}

let shopRegister = null;
function buildShop(cx, cz) {
  const wallMat = new THREE.MeshStandardMaterial({ color: 0xc8b28a, roughness: 0.9 });
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x8a7a63, roughness: 1 });
  const Wd = 30, Dp = 24, Hh = 5, T = 0.5;
  const x1 = cx - Wd / 2, x2 = cx + Wd / 2, z1 = cz - Dp / 2, z2 = cz + Dp / 2;

  const floor = new THREE.Mesh(new THREE.BoxGeometry(Wd, 0.3, Dp), floorMat);
  floor.position.set(cx, 0.3, cz); floor.receiveShadow = true; scene.add(floor);

  const mkWall = (wx, wz, ww, wd) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(ww, Hh, wd), wallMat);
    m.position.set(wx, Hh / 2 + 0.3, wz); m.castShadow = true; scene.add(m);
    addCollider(wx, wz, ww, wd);
  };
  mkWall(cx, z2, Wd, T);
  mkWall(x1 + T / 2, cz, T, Dp);
  mkWall(x2 - T / 2, cz, T, Dp);
  const door = 5;
  mkWall((x1 + (cx - door / 2)) / 2, z1, (cx - door / 2) - x1, T);
  mkWall((cx + door / 2 + x2) / 2, z1, x2 - (cx + door / 2), T);
  const lintel = new THREE.Mesh(new THREE.BoxGeometry(door, 1.2, T), wallMat);
  lintel.position.set(cx, Hh - 0.6 + 0.3, z1); scene.add(lintel);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(Wd, 0.4, Dp),
    new THREE.MeshStandardMaterial({ color: 0x4a4238 }));
  roof.position.set(cx, Hh + 0.4, cz); roof.castShadow = true; scene.add(roof);

  const counter = new THREE.Mesh(new THREE.BoxGeometry(8, 1.1, 1.4),
    new THREE.MeshStandardMaterial({ color: 0x6d4c41 }));
  counter.position.set(cx - 4, 0.95, cz + 5); scene.add(counter);
  addCollider(cx - 4, cz + 5, 8, 1.4);

  const register = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.5, 0.6),
    new THREE.MeshStandardMaterial({ color: 0x2c3e50, emissive: 0x1a6ea0, emissiveIntensity: 0.6 }));
  register.position.set(cx - 6.5, 1.75, cz + 5); scene.add(register);
  shopRegister = { x: cx - 6.5, z: cz + 5 };
  anchorsMap.shop = { x: cx, z: z1 - 3 };
  addZone(cx - 10.5, cz + 3, () => businesses.burger.owned ? null
    : 'E \u2014 Acheter Nova Burger ($ ' + businesses.burger.price + ')', () => buyBusiness('burger'), null, 3);

  const sign = new THREE.Mesh(new THREE.PlaneGeometry(12, 2.6),
    new THREE.MeshBasicMaterial({ map: signTexture('🍔 NOVA BURGER', '#e67e22', '#fff') }));
  sign.position.set(cx, 4.2, z1 - 0.3); scene.add(sign);

  const inner = new THREE.PointLight(0xffe9c8, 2.2, 30);
  inner.position.set(cx, 4, cz); scene.add(inner);

  const cashier = makeHumanoid(0x27ae60, 0x2c3e50, 0xf5c9a0);
  cashier.position.set(cx - 4, 0.45, cz + 6.2);
  cashier.rotation.y = Math.PI;
  scene.add(cashier);
}

function buildSpecial(cx, cz, spec) {
  const w = 40, d = 30, h = 18;
  const mat = new THREE.MeshStandardMaterial({ color: 0xd8d8d0, roughness: 0.9 });
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  mesh.position.set(cx, h / 2 + 0.24, cz);
  mesh.castShadow = true; mesh.receiveShadow = true; scene.add(mesh);
  addCollider(cx, cz, w, d);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(20, 3.4),
    new THREE.MeshBasicMaterial({ map: signTexture(spec.txt, spec.bg, '#fff') }));
  sign.position.set(cx, h - 2.4, cz - d / 2 - 0.2); scene.add(sign);
  if (spec.interior) {
    const id = spec.interior;
    anchorsMap[id] = { x: cx, z: cz - d / 2 - 3 };
    addDoor(cx, cz - d / 2 - 1.6, 'E — Entrer : ' + spec.txt, () => enterDoorInterior(id));
    if (id === 'dealer') {
      addZone(cx + 7, cz - d / 2 - 1.6, () => {
        if (!playerVehicle) return null;
        if (!playerVehicle.owned) return 'Vente : uniquement TES véhicules (achetés au concessionnaire)';
        return 'E — Vendre la ' + playerVehicle.spec.name + ' ($ ' + Math.floor(playerVehicle.spec.price / 2) + ')';
      }, sellVehicle, null, 3.2);
    }
  }
  if (spec.gas) buildPumps(cx, cz, d);
  const bizId = spec.gas ? 'gas' : spec.interior;
  if (bizId && businesses[bizId]) {
    const zx = spec.gas ? cx + 9 : cx - 7;
    addZone(zx, cz - d / 2 - 1.6, () => businesses[bizId].owned ? null
      : 'E \u2014 Acheter : ' + businesses[bizId].name + ' ($ ' + businesses[bizId].price + ')',
      () => buyBusiness(bizId), null, 3);
  }
}

function buildPumps(cx, cz, d) {
  const pz = cz - d / 2 - 5;
  anchorsMap.gas = { x: cx, z: pz - 4 };
  for (const px of [cx - 7, cx + 7]) {
    const pump = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.4, 0.7),
      new THREE.MeshStandardMaterial({ color: 0xc0392b }));
    pump.position.set(px, 0.95, pz); pump.castShadow = true; scene.add(pump);
    addCollider(px, pz, 0.9, 0.7);
    const screen = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.4, 0.1),
      new THREE.MeshStandardMaterial({ color: 0x111, emissive: 0x2ecc71, emissiveIntensity: 0.8 }));
    screen.position.set(px, 1.6, pz - 0.4); scene.add(screen);
    addZone(px, pz - 1.8, () => {
      if (!playerVehicle) return null;
      const cost = Math.ceil((playerVehicle.spec.cap - playerVehicle.fuel) * 2);
      return cost > 0 ? 'E — Faire le plein ($ ' + cost + ')' : 'Réservoir plein';
    }, refuelAction, null, 3);
  }
  addZone(cx, pz - 1.8, () => {
    if (!playerVehicle) return null;
    return playerVehicle.hp < 100 ? 'E — Réparer ($ 100)' : null;
  }, repairAction, null, 3);
}

function buildLamps() {
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x444a52 });
  for (const rx of roadCenters) {
    for (const rz of roadCenters) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 6.5, 8), poleMat);
      pole.position.set(rx + ROADW / 2 - 1, 3.25, rz + ROADW / 2 - 1);
      pole.castShadow = true; scene.add(pole);
      const bulbMat = new THREE.MeshStandardMaterial({ color: 0x222, emissive: 0xffdf9e, emissiveIntensity: 0 });
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.32, 8, 8), bulbMat);
      bulb.position.set(pole.position.x, 6.6, pole.position.z); scene.add(bulb);
      nightMats.push(bulbMat);
    }
  }
  for (let i = 0; i < 6; i++) {
    const pl = new THREE.PointLight(0xffdf9e, 0, 40, 1.6);
    pl.position.set(roadCenters[(i * 2) % roadCenters.length], 6.4, roadCenters[(i * 2 + 1) % roadCenters.length]);
    scene.add(pl); lampLights.push(pl);
  }
}

function spawnVehicles() {
  const mk = (type, x, z, a) => {
    const s = specs[type];
    const mesh = makeVehicleMesh(type, s.color);
    mesh.position.set(x, 0, z); mesh.rotation.y = a;
    mesh.castShadow = true; scene.add(mesh);
    vehiclesParked.push({ mesh, spec: s, type, speed: 0, heading: a });
  };
  mk('sedan', roadCenters[2] + 3.5, cell(2) + 30, 0);
  mk('sport', roadCenters[3] - 3.5, cell(2) + 40, Math.PI);
  mk('van', roadCenters[2] - 3.5, cell(3) + 20, Math.PI / 2);

  for (let i = 0; i < 6; i++) {
    const type = ['sedan', 'taxi', 'van'][i % 3];
    const s = specs[type];
    const mesh = makeVehicleMesh(type, s.color);
    const vertical = i % 2 === 0;
    const lane = (i % 4 < 2 ? 3.5 : -3.5);
    const rc = roadCenters[1 + (i % 4)];
    const pos0 = ORIGIN + 20 + Math.random() * (SIZE - 40);
    const car = { mesh, spec: s, type, speed: 10 + Math.random() * 8, vertical, lane, rc, dir: lane > 0 ? 1 : -1 };
    if (vertical) { mesh.position.set(rc + lane, 0, pos0); mesh.rotation.y = car.dir > 0 ? 0 : Math.PI; }
    else { mesh.position.set(pos0, 0, rc + lane); mesh.rotation.y = car.dir > 0 ? Math.PI / 2 : -Math.PI / 2; }
    mesh.castShadow = true; scene.add(mesh);
    aiCars.push(car);
  }
}

function pickJob() {
  const r = Math.random();
  if (r < 0.3) return JOBS[0];
  if (r < 0.5) return JOBS[1];
  if (r < 0.65) return JOBS[2];
  if (r < 0.85) return JOBS[3];
  return JOBS[4];
}

function jobLine(n) {
  return {
    employe: 'Je travaille en ville.',
    etudiant: 'Je suis étudiant à l\u2019université.',
    commercant: 'Je tiens une boutique ici.',
    retraite: 'Retraité — je profite du parc.',
    chomeur: 'Je cherche un boulot, quoi.',
  }[n.job.id];
}

function spawnNPCs() {
  const pants = [0x2c3e50, 0x34495e, 0x6d4c41, 0x5d6d7e];
  const skins = [0xf5c9a0, 0xd9a066, 0x8d5524, 0xffdbac];
  for (let i = 0; i < 22; i++) {
    const job = pickJob();
    const g = makeHumanoid(job.color, pants[i % pants.length], skins[i % skins.length]);
    const p = randSidewalkPoint();
    g.position.set(p.x, 0.24, p.z);
    g.castShadow = true;
    scene.add(g);
    const home = randSidewalkPoint();
    let workAnchor = null;
    if (job.work) {
      const wId = job.work[i % job.work.length];
      workAnchor = anchorsMap[wId] || anchorsMap[job.work[0]] || null;
    }
    const leisure = Math.random() < 0.6 ? PARK_POINT : (anchorsMap.hotel || PARK_POINT);
    npcs.push({
      mesh: g, tx: home.x, tz: home.z, speed: 1.2 + Math.random() * 1.2,
      phase: Math.random() * 6, idle: 0, flee: 0,
      name: NPC_NAMES[i % NPC_NAMES.length], job, home, workAnchor, leisure,
      bucket: -1, wanderX: 0, wanderZ: 0, rel: 0, chatCount: 0,
      busUser: Math.random() < 0.35, onBus: false,
    });
  }
}

function spawnPickups() {
  for (let i = 0; i < 12; i++) {
    const p = randSidewalkPoint();
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.6),
      new THREE.MeshStandardMaterial({ color: 0x2ecc71, emissive: 0x2ecc71, emissiveIntensity: 0.5 }));
    mesh.position.set(p.x, 1.1, p.z); scene.add(mesh);
    pickups.push({ mesh, value: 25, active: true, respawn: 0 });
  }
}

function setupMission() {
  const p = randSidewalkPoint();
  missionTarget = new THREE.Vector3(p.x, 0, p.z);
  if (!missionMarker) {
    missionMarker = new THREE.Mesh(
      new THREE.CylinderGeometry(2.2, 2.2, 9, 18, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xffd94d, transparent: true, opacity: 0.45, side: THREE.DoubleSide })
    );
    scene.add(missionMarker);
  }
  missionMarker.position.set(p.x, 4.5, p.z);
}

// ================= ECONOMIE / INTERACTIONS =================
function addTransaction(label, amount) {
  transactions.unshift({ label, amount, time: clockString() });
  if (transactions.length > 20) transactions.pop();
}

function buyBurger() {
  if (money < 10) { toast('Pas assez d\u2019argent !'); return false; }
  money -= 10;
  addTransaction('🍔 Nova Burger', -10);
  toast('🍔 Burger acheté (-10 $)');
  return true;
}

function nearestEnterable() {
  let best = null, bd = 4.2;
  const all = [...vehiclesParked, ...aiCars, ...ownedVehicles];
  for (const v of all) {
    const d = Math.hypot(v.mesh.position.x - playerPos.x, v.mesh.position.z - playerPos.z);
    if (d < bd) { bd = d; best = v; }
  }
  return best;
}

function enterVehicle(v) {
  playerVehicle = v;
  let idx = vehiclesParked.indexOf(v);
  if (idx >= 0) vehiclesParked.splice(idx, 1);
  idx = aiCars.indexOf(v);
  if (idx >= 0) aiCars.splice(idx, 1);
  idx = ownedVehicles.indexOf(v);
  if (idx >= 0) ownedVehicles.splice(idx, 1);
  playerMesh.visible = false;
  toast(v.spec.name + ' — E pour sortir');
}

function exitVehicle() {
  const v = playerVehicle;
  const side = new THREE.Vector3(Math.cos(v.mesh.rotation.y), 0, -Math.sin(v.mesh.rotation.y)).multiplyScalar(2.4);
  playerPos.set(v.mesh.position.x + side.x, 0, v.mesh.position.z + side.z);
  const c = collideCircle(playerPos.x, playerPos.z, 0.5);
  playerPos.x = c.x; playerPos.z = c.z;
  v.speed = 0;
  if (v.owned) ownedVehicles.push(v); else vehiclesParked.push(v);
  playerVehicle = null;
  playerMesh.visible = true;
}

function setupMissionNew() { setupMission(); }

// ================= SAUVEGARDE =================
function doSave() {
  const data = {
    v: SAVE_VERSION,
    money, tod, deliveries, distW, distD, playtime, transactions,
    health, education, fitness, weather, dayCount, volume,
    story: { idx: story.idx, active: story.active, done: story.done },
    ach: unlockedAch,
    stats,
    biz: Object.fromEntries(Object.entries(businesses).map(([k, b]) =>
      [k, { owned: b.owned, stock: b.stock, salePrice: b.salePrice, employees: b.employees, profit: b.profit, level: b.level }])),
    props: { apartment: properties.apartment.owned, villa: properties.villa.owned },
    furn: JSON.parse(JSON.stringify(furniture)),
    owned: ownedVehicles.map(v => ({ type: v.type, x: v.mesh.position.x, z: v.mesh.position.z,
      heading: v.mesh.rotation.y, hp: v.hp, fuel: v.fuel })),
    npcs: npcs.map(n => ({ rel: n.rel, chat: n.chatCount })),
    x: playerPos.x, z: playerPos.z, yaw: camYaw,
  };
  localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  toast('💾 Sauvegardé');
}

function hasSave() { return !!localStorage.getItem(SAVE_KEY); }

function doLoad() {
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) { toast('Aucune sauvegarde'); return false; }
  const d = JSON.parse(raw);
  money = d.money; tod = d.tod; deliveries = d.deliveries;
  distW = d.distW; distD = d.distD; playtime = d.playtime; transactions = d.transactions || [];
  playerPos.set(d.x, 0, d.z);
  camYaw = d.yaw || 0.6;
  health = d.health !== undefined ? d.health : 100;
  education = d.education || 0;
  if (d.props) {
    properties.apartment.owned = !!d.props.apartment;
    properties.villa.owned = !!d.props.villa;
  }
  if (d.furn) {
    for (const k of Object.keys(furniture)) furniture[k] = d.furn[k] || [];
    rebuildFurniture();
  }
  clearOwned();
  if (d.owned) {
    for (const ov of d.owned) spawnOwned(ov.type, ov.x, ov.z, ov.heading, ov.hp, ov.fuel);
  }
  if (d.npcs) {
    d.npcs.forEach((sn, i) => {
      if (npcs[i]) { npcs[i].rel = sn.rel || 0; npcs[i].chatCount = sn.chat || 0; }
    });
  }
  if (d.biz) {
    for (const k of Object.keys(d.biz)) if (businesses[k]) Object.assign(businesses[k], d.biz[k]);
  }
  fitness = d.fitness || 0;
  weather = d.weather || 'clair';
  setWeather(weather);
  dayCount = d.dayCount || 1;
  volume = d.volume !== undefined ? d.volume : 0.8;
  if (d.story) Object.assign(story, d.story);
  unlockedAch = d.ach || [];
  if (d.stats) Object.assign(stats, d.stats);
  lastHour = Math.floor(tod * 24);
  toast('💾 Partie chargée');
  return true;
}

// ================= JOUEUR / VEHICULES / PNJ =================
function updatePlayer(dt) {
  const run = input.run && !input.b ? 1 : 0;
  const swim = playerPos.x > WATER_X + 2;
  const speed = swim ? 2.4 : run ? 8 + fitness * 0.5 : 4.4;
  let mx = (input.r - input.l), mz = (input.b - input.f);
  const len = Math.hypot(mx, mz);
  let moving = false;
  if (len > 0) {
    mx /= len; mz /= len;
    const fx = -Math.sin(camYaw), fz = -Math.cos(camYaw);
    const rx = Math.cos(camYaw), rz = -Math.sin(camYaw);
    const dx = fx * -mz + rx * mx;
    const dz = fz * -mz + rz * mx;
    const old = { x: playerPos.x, z: playerPos.z };
    let nx = playerPos.x + dx * speed * dt;
    let nz = playerPos.z + dz * speed * dt;
    const c = collideCircle(nx, nz, 0.5);
    const lim = SIZE / 2 + 140;
    playerPos.x = Math.max(-lim, Math.min(lim, c.x));
    playerPos.z = Math.max(-lim, Math.min(lim, c.z));
    distW += Math.hypot(playerPos.x - old.x, playerPos.z - old.z);
    playerMesh.rotation.y = Math.atan2(dx, dz);
    moving = true;
  }
  if (input.jump && onGround && !swim) { playerVel.y = 7; onGround = false; }
  playerVel.y -= 20 * dt;
  playerPos.y += playerVel.y * dt;
  if (playerPos.y <= 0) { playerPos.y = 0; playerVel.y = 0; onGround = true; }
  playerMesh.position.set(playerPos.x, playerPos.y, playerPos.z);
  if (moving) {
    walkPhase += dt * (run ? 13 : 9);
    animateWalk(playerMesh, walkPhase, 0.7);
  } else animateWalk(playerMesh, walkPhase, 0);
}

function updateVehicle(dt) {
  const v = playerVehicle;
  const spec = v.spec;
  if (v.fuel === undefined) v.fuel = spec.cap;
  if (v.hp === undefined) v.hp = 100;
  let throttle = input.f ? 1 : input.b ? -0.55 : 0;
  if (v.fuel <= 0) { throttle = 0; if (Math.abs(v.speed) > 1) toastOnce('⛽ Panne sèche ! Va à la station.'); }
  const old = { x: v.mesh.position.x, z: v.mesh.position.z };
  const steer = (input.l - input.r);
  const lim = SIZE / 2 + 140;

  if (spec.water) {
    v.speed += throttle * spec.accel * dt;
    v.speed *= input.jump ? 0.97 : 0.995;
    v.speed = Math.max(-5, Math.min(spec.maxSp, v.speed));
    v.mesh.rotation.y += steer * spec.turn * dt * Math.min(1, Math.abs(v.speed) / 8) * Math.sign(v.speed || 1);
    const fx = Math.sin(v.mesh.rotation.y), fz = Math.cos(v.mesh.rotation.y);
    v.mesh.position.x += fx * v.speed * dt;
    v.mesh.position.z += fz * v.speed * dt;
    v.mesh.position.x = Math.max(WATER_X + 6, Math.min(WATER_MAX, v.mesh.position.x));
    v.mesh.position.z = Math.max(-SIZE / 2 - 150, Math.min(SIZE / 2 + 150, v.mesh.position.z));
  } else if (spec.air) {
    v.speed += throttle * spec.accel * dt;
    v.speed *= (v.alt > 0.5 ? 0.996 : 0.998);
    v.speed = Math.max(0, Math.min(spec.maxSp, v.speed));
    v.mesh.rotation.y += steer * spec.turn * dt * Math.min(1, v.speed / 15);
    const fx = Math.sin(v.mesh.rotation.y), fz = Math.cos(v.mesh.rotation.y);
    v.mesh.position.x += fx * v.speed * dt;
    v.mesh.position.z += fz * v.speed * dt;
    if (v.speed > 32) v.alt = Math.min(85, v.alt + (v.speed - 32) * 0.35 * dt * 10);
    else v.alt = Math.max(0, v.alt - (32 - v.speed) * 0.4 * dt * 10);
    v.mesh.position.x = Math.max(-340, Math.min(340, v.mesh.position.x));
    v.mesh.position.z = Math.max(-340, Math.min(340, v.mesh.position.z));
    v.mesh.position.y = v.alt;
    if (v.mesh.userData.prop) v.mesh.userData.prop.rotation.z += dt * (6 + v.speed);
    if (v.alt <= 0.5) {
      const c = collideCircle(v.mesh.position.x, v.mesh.position.z, 2.6);
      if (Math.hypot(c.x - v.mesh.position.x, c.z - v.mesh.position.z) > 0.01) v.speed = 0;
      v.mesh.position.x = Math.max(-lim - 100, Math.min(lim + 100, c.x));
      v.mesh.position.z = Math.max(-lim - 100, Math.min(lim + 100, c.z));
    }
  } else {
    v.speed += throttle * spec.accel * grip * dt;
    v.speed *= 0.995;
    const brake = input.jump ? 0.96 : 1;
    v.speed *= brake;
    v.speed = Math.max(-10, Math.min(spec.maxSp, v.speed));
    v.mesh.rotation.y += steer * spec.turn * grip * dt * Math.min(1, Math.abs(v.speed) / 12) * Math.sign(v.speed || 1);
    const fx = Math.sin(v.mesh.rotation.y), fz = Math.cos(v.mesh.rotation.y);
    const nx = v.mesh.position.x + fx * v.speed * dt;
    const nz = v.mesh.position.z + fz * v.speed * dt;
    const c = collideCircle(nx, nz, 2.2);
    if (Math.hypot(c.x - nx, c.z - nz) > 0.01) {
      if (Math.abs(v.speed) > 6) { v.hp = Math.max(0, v.hp - Math.abs(v.speed) * 0.5); toastOnce('💥 Choc !'); }
      v.speed *= -0.3;
    }
    v.mesh.position.x = Math.max(-lim, Math.min(lim, c.x));
    v.mesh.position.z = Math.max(-lim, Math.min(lim, c.z));
  }

  v.fuel = Math.max(0, v.fuel - Math.abs(v.speed) * dt * (spec.air ? 0.012 : 0.008));
  if (v.mesh.userData.body) {
    const dmg = 1 - v.hp / 100;
    v.mesh.userData.body.material.color.copy(baseColorOf(v)).lerp(new THREE.Color(0x2e2e2e), Math.min(0.75, dmg * 0.8));
  }
  const moved = Math.hypot(v.mesh.position.x - old.x, v.mesh.position.z - old.z);
  distD += moved;
  playerPos.set(v.mesh.position.x, v.mesh.position.y, v.mesh.position.z);
}

let lastToastMsg = '', lastToastT = 0;
function toastOnce(msg) {
  if (msg === lastToastMsg && lastToastT > 0) return;
  lastToastMsg = msg; lastToastT = 3;
  toast(msg);
}

function baseColorOf(v) {
  if (!v._baseColor) v._baseColor = new THREE.Color(v.spec.color);
  return v._baseColor;
}

function updateAICars(dt) {
  for (const car of aiCars) {
    const m = car.mesh;
    if (car.vertical) {
      m.position.z += car.dir * car.speed * dt;
      if (Math.abs(m.position.z) > SIZE / 2 + 10) m.position.z = -Math.sign(m.position.z) * (SIZE / 2 + 10);
      m.position.x = car.rc + car.lane;
    } else {
      m.position.x += car.dir * car.speed * dt;
      if (Math.abs(m.position.x) > SIZE / 2 + 10) m.position.x = -Math.sign(m.position.x) * (SIZE / 2 + 10);
      m.position.z = car.rc + car.lane;
    }
  }
}

function npcBucket(n) {
  const h = tod * 24;
  if (n.job.work && n.workAnchor) {
    if (h >= 7 && h < 18) return 0;
    if (h >= 18 && h < 22) return 1;
    return 2;
  }
  if (n.job.id === 'retraite') return (h >= 8 && h < 20) ? 1 : 2;
  return 3;
}

function npcGoalPoint(n) {
  const b = npcBucket(n);
  if (b === 0) return n.workAnchor;
  if (b === 1) return n.leisure;
  if (b === 2) return n.home;
  return null;
}

function retarget(n) {
  const goal = npcGoalPoint(n);
  if (goal) {
    n.wanderX = (Math.random() - 0.5) * 16;
    n.wanderZ = (Math.random() - 0.5) * 16;
  } else {
    const t = randSidewalkPoint();
    n.tx = t.x; n.tz = t.z;
  }
}

function nearestNPC(r) {
  let best = null, bd = r;
  for (const n of npcs) {
    if (n.onBus) continue;
    const d = Math.hypot(n.mesh.position.x - playerPos.x, n.mesh.position.z - playerPos.z);
    if (d < bd) { bd = d; best = n; }
  }
  return best;
}

function updateNPCs(dt) {
  for (const n of npcs) {
    if (!n.onBus && !n.busUser && n.mesh.position.distanceTo(playerPos) > 130) continue;
    n.phase += dt * 8;
    if (n.onBus) {
      if (cityBus) {
        n.mesh.position.set(cityBus.mesh.position.x, 0, cityBus.mesh.position.z);
        if (cityBus.stopT > 0.5 && Math.random() < dt * 2) {
          n.onBus = false;
          n.mesh.visible = true;
          n.mesh.position.set(cityBus.mesh.position.x + 3, 0, cityBus.mesh.position.z + 3);
          n.bucket = -1;
        }
      } else { n.onBus = false; n.mesh.visible = true; }
      continue;
    }
    if (n.busUser && cityBus && cityBus.stopT > 0.5 && !ridingBus) {
      const bd = Math.hypot(cityBus.mesh.position.x - n.mesh.position.x, cityBus.mesh.position.z - n.mesh.position.z);
      if (bd < 8 && Math.random() < dt * 2) { n.onBus = true; n.mesh.visible = false; continue; }
    }
    let dx = n.tx - n.mesh.position.x, dz = n.tz - n.mesh.position.z;
    let d = Math.hypot(dx, dz);
    if (n.flee > 0) {
      n.flee -= dt;
      n.mesh.position.x += Math.sin(n.mesh.rotation.y) * 5.5 * dt;
      n.mesh.position.z += Math.cos(n.mesh.rotation.y) * 5.5 * dt;
      animateWalk(n.mesh, n.phase, 0.9);
      continue;
    }
    const bucket = npcBucket(n);
    if (bucket !== n.bucket) { n.bucket = bucket; n.idle = 0; retarget(n); }
    const goal = npcGoalPoint(n);
    const gx = goal ? goal.x + n.wanderX : n.tx;
    const gz = goal ? goal.z + n.wanderZ : n.tz;
    dx = gx - n.mesh.position.x; dz = gz - n.mesh.position.z;
    d = Math.hypot(dx, dz);
    if (n.idle > 0) { n.idle -= dt; animateWalk(n.mesh, 0, 0); continue; }
    if (d < 1.5) {
      if (Math.random() < 0.4) n.idle = 1 + Math.random() * 2.5;
      retarget(n);
      continue;
    }
    dx /= d; dz /= d;
    n.mesh.position.x += dx * n.speed * dt;
    n.mesh.position.z += dz * n.speed * dt;
    n.mesh.rotation.y = Math.atan2(dx, dz);
    animateWalk(n.mesh, n.phase, 0.6);
    if (playerVehicle && Math.abs(playerVehicle.speed) > 14) {
      const pd = Math.hypot(n.mesh.position.x - playerPos.x, n.mesh.position.z - playerPos.z);
      if (pd < 9) {
        n.flee = 1.6;
        n.mesh.rotation.y = Math.atan2(n.mesh.position.x - playerPos.x, n.mesh.position.z - playerPos.z);
      }
    }
  }
}

function buildDialog(n) {
  const lines = [];
  lines.push('Salut, moi c’est ' + n.name + '. ' + jobLine(n));
  const h = tod * 24;
  if (h < 7) lines.push('Il est tard… je rentre chez moi.');
  else if (h < 12) lines.push('Belle matinée à Nova City !');
  else if (h < 18) lines.push(n.job.work ? 'Je file au travail. Le bus, seul vrai luxe de cette ville.' : 'Journée tranquille aujourd’hui.');
  else lines.push('Les nuits ici, tout s’allume. J’adore.');
  if (!playerVehicle) lines.push('Tu devrais prendre le bus — 2 $ le ticket.');
  else if (playerVehicle.type === 'sport') lines.push('Whoa, belle sportive !');
  else if (playerVehicle.type === 'plane') lines.push('Tu pilotes un avion ?? Respect.');
  else if (playerVehicle.type === 'boat') lines.push('Le lac est superbe en bateau.');
  else if (playerVehicle.type === 'moto') lines.push('Prudent avec cette moto !');
  else if (playerVehicle.type === 'bus') lines.push('Toi, tu conduits le bus ? Merci pour le service !');
  else lines.push('Bonne route avec ton ' + playerVehicle.spec.name.toLowerCase() + '.');
  if (education >= 3) lines.push('Vu ton niveau d’études, tu dois bien gagner ta vie.');
  if (deliveries >= 3) lines.push('C’est toi, le livreur dont tout le monde parle ?');
  if (health < 60) lines.push('Tu sembles blessé… l’hôpital est là, suis les enseignes.');
  if (properties.apartment.owned || properties.villa.owned) lines.push('Félicitations pour ton nouveau chez-toi !');
  if (n.rel >= 2) lines.push('Ça fait plaisir de te revoir !');
  return lines;
}

function openDialog(n) {
  dialog = { npc: n, idx: 0, lines: buildDialog(n) };
  document.getElementById('dialog').style.display = 'block';
  renderDialog();
}

function renderDialog() {
  document.getElementById('dname').textContent =
    dialog.npc.name + ' — ' + dialog.npc.job.label + ' ' + '♥'.repeat(Math.min(5, dialog.npc.rel));
  if (dialog.idx >= dialog.lines.length && dialog.choices) {
    document.getElementById('dtext').innerHTML = dialog.choices.map((c, i) =>
      '<button class="act dchoice" data-ch="' + i + '">' + c.label + '</button>').join('');
    document.querySelectorAll('#dtext [data-ch]').forEach(b =>
      b.addEventListener('click', () => resolveChoice(+b.dataset.ch)));
    return;
  }
  document.getElementById('dtext').textContent = dialog.lines[dialog.idx];
}

function advanceDialog() {
  dialog.idx++;
  if (dialog.idx >= dialog.lines.length) {
    if (dialog.choices) { renderDialog(); return; }
    closeDialog(); return;
  }
  renderDialog();
}

function closeDialog() {
  const n = dialog.npc;
  dialog = null;
  document.getElementById('dialog').style.display = 'none';
  n.chatCount++;
  n.rel++;
  if (n.chatCount % 3 === 0) {
    const gift = 20 + Math.floor(Math.random() * 30);
    money += gift;
    addTransaction('🎁 Cadeau de ' + n.name, gift);
    toast('🎁 ' + n.name + ' t’offre $ ' + gift + ' pour l’amitié !');
  }
  if (story.active && story.idx === 1) storyNext();
}

function updatePickups(dt) {
  for (const pk of pickups) {
    pk.mesh.rotation.y += dt * 2;
    if (!pk.active) {
      pk.respawn -= dt;
      if (pk.respawn <= 0) {
        const p = randSidewalkPoint();
        pk.mesh.position.set(p.x, 1.1, p.z);
        pk.active = true; pk.mesh.visible = true;
      }
      continue;
    }
    if (Math.hypot(pk.mesh.position.x - playerPos.x, pk.mesh.position.z - playerPos.z) < 1.6) {
      money += pk.value;
      addTransaction('💵 Argent trouvé', pk.value);
      pk.active = false; pk.mesh.visible = false; pk.respawn = 25;
      toast('+ $' + pk.value);
    }
  }
}

function updateMission(dt) {
  if (!missionTarget || insideInterior) return;
  missionMarker.rotation.y += dt;
  const r = playerVehicle ? 5 : 3;
  if (Math.hypot(missionTarget.x - playerPos.x, missionTarget.z - playerPos.z) < r) {
    const reward = Math.round((100 + deliveries * 25) * (1 + education * 0.1));
    money += reward;
    deliveries += 1;
    addTransaction('📦 Livraison #' + deliveries, reward);
    toast('📦 Livraison réussie ! + $' + reward);
    setupMission();
    if (story.active && story.idx === 0) storyNext();
  }
}

// ================= CIEL / LUMIERE =================
function clockString() {
  const h = Math.floor(tod * 24), m = Math.floor((tod * 24 % 1) * 60);
  return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
}

function updateSky() {
  const ang = (tod - 0.25) * Math.PI * 2;
  const sy = Math.sin(ang);
  sunLight.position.set(Math.cos(ang) * 220, Math.max(sy, -0.3) * 220 + 20, 80);
  const f = Math.max(0, Math.min(1, sy * 2.2 + 0.15));
  const day = new THREE.Color(0x87ceeb), night = new THREE.Color(0x0a1030), dusk = new THREE.Color(0xff9a5a);
  const sky = night.clone().lerp(day, f);
  if (sy < 0.35 && sy > -0.15) sky.lerp(dusk, Math.max(0, 1 - Math.abs(sy) / 0.35) * 0.55);
  scene.background = sky;
  scene.fog.color.copy(sky);
  hemiLight.intensity = 0.25 + f * 0.55;
  sunLight.intensity = f * 1.15;
  const nightF = 1 - f;
  for (const m of nightMats) m.emissiveIntensity = nightF * 0.85;
  for (const l of lampLights) l.intensity = nightF * 2.4;
}

function updateCamera(dt) {
  let target, desired;
  if (playerVehicle) {
    const v = playerVehicle;
    const fx = Math.sin(v.mesh.rotation.y), fz = Math.cos(v.mesh.rotation.y);
    target = new THREE.Vector3(v.mesh.position.x, 1.8, v.mesh.position.z);
    desired = new THREE.Vector3(v.mesh.position.x - fx * 9.5, 4.6, v.mesh.position.z - fz * 9.5);
  } else {
    target = new THREE.Vector3(playerPos.x, playerPos.y + 1.7, playerPos.z);
    const cp = Math.cos(camPitch);
    desired = new THREE.Vector3(
      target.x + Math.sin(camYaw) * cp * 5.5,
      target.y + Math.sin(camPitch) * 5.5,
      target.z + Math.cos(camYaw) * cp * 5.5
    );
  }
  const k = 1 - Math.exp(-8 * dt);
  camera.position.lerp(desired, k);
  camera.lookAt(target);
}

// ================= HUD =================
let hudT = 0;
function updateHUD(dt) {
  hudT -= dt;
  if (hudT > 0) return;
  hudT = 0.12;
  document.getElementById('money').textContent = money;
  document.getElementById('clock').textContent = clockString();
  document.getElementById('speed').textContent = playerVehicle
    ? Math.abs(playerVehicle.speed * 3.6).toFixed(0) + ' km/h — ' + playerVehicle.spec.name +
      ' ⛽ ' + Math.round(playerVehicle.fuel) + ' L' +
      (playerVehicle.alt > 0.5 ? ' ✈ ' + playerVehicle.alt.toFixed(0) + ' m' : '') +
      (playerVehicle.hp < 40 ? ' 🔧 endommagé' : '')
    : '';
  document.getElementById('mission').textContent = missionTarget
    ? '📦 Livraison : suis le marqueur jaune (' + deliveries + ' livrées)'
    : '';
  const tgt = currentActionTarget();
  const prompt = tgt ? tgt.label : '';
  document.getElementById('health').textContent = '❤️ ' + Math.max(0, Math.round(health));
  const pe = document.getElementById('prompt');
  pe.textContent = prompt;
  pe.style.display = prompt ? 'block' : 'none';
  drawMinimap();
}

function toast(txt) {
  const el = document.getElementById('toast');
  el.textContent = txt; el.style.opacity = 1; toastT = 2.2;
}

function drawMinimap() {
  const mm = document.getElementById('minimap');
  if (!mm || !mm.getContext) return;
  const g = mm.getContext('2d');
  const S = 160, s = S / (SIZE + 60);
  g.fillStyle = '#20301c'; g.fillRect(0, 0, S, S);
  g.save();
  g.translate(S / 2, S / 2); g.scale(s, s);
  g.fillStyle = '#2b2f36';
  for (const rc of roadCenters) {
    g.fillRect(-SIZE / 2 - 15, rc - ROADW / 2, SIZE + 30, ROADW);
    g.fillRect(rc - ROADW / 2, -SIZE / 2 - 15, ROADW, SIZE + 30);
  }
  g.fillStyle = '#3f7a3f';
  const px = cell(0) + ROADW, pz = cell(3) + ROADW;
  g.fillRect(px, pz, BLOCK, BLOCK);
  g.fillStyle = '#1a6ea0';
  g.fillRect(WATER_X, -SIZE / 2 - 150, WATER_MAX - WATER_X + 50, SIZE + 300);
  g.fillStyle = '#e0c98f';
  g.fillRect(SIZE / 2 + 9, -SIZE / 2 - 150, 26, SIZE + 300);
  g.fillStyle = '#3a3f44';
  g.fillRect(-210, RUNWAY_Z - 10, 320, 20);
  for (const c of colliders) {
    g.fillStyle = '#565e6e';
    g.fillRect(c.x1, c.z1, c.x2 - c.x1, c.z2 - c.z1);
  }
  g.fillStyle = '#ffd94d';
  if (missionTarget) { g.beginPath(); g.arc(missionTarget.x, missionTarget.z, 6, 0, 7); g.fill(); }
  g.fillStyle = '#8ecfff';
  for (const c of aiCars) { g.fillRect(c.mesh.position.x - 4, c.mesh.position.z - 4, 8, 8); }
  if (cityBus) { g.fillStyle = '#27ae60'; g.fillRect(cityBus.mesh.position.x - 5, cityBus.mesh.position.z - 5, 10, 10); }
  g.fillStyle = '#fff';
  for (const n of npcs) { g.fillRect(n.mesh.position.x - 2, n.mesh.position.z - 2, 4, 4); }
  g.fillStyle = '#ff4757';
  g.beginPath(); g.arc(playerPos.x, playerPos.z, 7, 0, 7); g.fill();
  g.restore();
}

// ================= TELEPHONE =================
let phoneOpen = false, phoneTab = 'bank';
function openPhone() {
  phoneOpen = true;
  document.getElementById('phone').style.display = 'flex';
  renderPhone();
}
function closePhone() {
  phoneOpen = false;
  document.getElementById('phone').style.display = 'none';
}
function renderPhone() {
  document.querySelectorAll('#phone .ptabs button').forEach(b =>
    b.classList.toggle('on', b.dataset.tab === phoneTab));
  const body = document.getElementById('pbody');
  if (phoneTab === 'bank') {
    let rows = transactions.slice(0, 10).map(tr =>
      '<div class="row"><span>' + tr.label + ' <small>' + tr.time + '</small></span><span style="color:' + (tr.amount > 0 ? '#7dff8a' : '#ff8a8a') + '">' + (tr.amount > 0 ? '+' : '') + tr.amount + ' $</span></div>').join('');
    body.innerHTML = '<div class="big">$ ' + money + '</div>' +
      '<div style="color:#8fa3c8;margin-bottom:8px;">Historique des transactions</div>' + (rows || '<i>Aucune transaction.</i>');
  } else if (phoneTab === 'missions') {
    let html = '';
    if (story.done) html += '<div class="big">📖 Histoire terminée !</div>';
    else if (story.active) {
      const sm = story.missions[story.idx];
      html += '<div class="big">📖 ' + sm.title + '</div><div>' + sm.desc + '</div>';
    } else html += '<button class="act" id="btnStory">📖 Démarrer l\'histoire principale</button>';
    if (story.active && story.idx === 4) html += '<button class="act" id="btnChoice">🗣️ Parler à Marc (choix final)</button>';
    html += '<hr style="border-color:#ffffff22">' +
      '<div class="big">📦 ' + deliveries + '</div><div>livraisons effectuées</div>' +
      '<div>Objectif actuel : rejoindre le marqueur jaune.<br>Récompense : $ ' + (100 + deliveries * 25) + '</div>' +
      '<button class="act" id="btnGps">📍 Activer le GPS vers l\'objectif</button>';
    body.innerHTML = html;
    const bs = document.getElementById('btnStory');
    if (bs) bs.addEventListener('click', () => { startStory(); renderPhone(); });
    const bc = document.getElementById('btnChoice');
    if (bc) bc.addEventListener('click', () => { closePhone(); openFinalChoice(); });
    document.getElementById('btnGps').addEventListener('click', () => { setGPS(); renderPhone(); });
  } else if (phoneTab === 'stats') {
    const hh = Math.floor(playtime / 60), mmn = Math.floor(playtime % 60);
    let html =
      '<div class="row"><span>Jour en ville</span><span>Jour ' + dayCount + '</span></div>' +
      '<div class="row"><span>Temps de jeu</span><span>' + hh + ' min ' + mmn + ' s</span></div>' +
      '<div class="row"><span>Distance à pied</span><span>' + distW.toFixed(0) + ' m</span></div>' +
      '<div class="row"><span>Distance en véhicule</span><span>' + distD.toFixed(0) + ' m</span></div>' +
      '<div class="row"><span>Livraisons</span><span>' + deliveries + '</span></div>' +
      '<div class="row"><span>Santé</span><span>❤️ ' + Math.round(health) + '</span></div>' +
      '<div class="row"><span>Forme</span><span>💪 ' + fitness + '/5</span></div>' +
      '<div class="row"><span>Éducation</span><span>' + education + '/5</span></div>' +
      '<div class="row"><span>Fortune</span><span>$ ' + money + '</span></div>' +
      '<div class="row"><span>Poissons / paniers / courses</span><span>' + stats.fish + ' / ' + stats.baskets + ' / ' + stats.races + '</span></div>' +
      '<div style="color:#8fa3c8;margin-top:8px;">Succès (' + unlockedAch.length + '/' + ACHIEVEMENTS.length + ')</div>';
    for (const a of ACHIEVEMENTS) {
      html += '<div class="row"><span>' + (unlockedAch.includes(a.id) ? '🏆' : '🔒') + ' ' + a.name + '</span></div>';
    }
    body.innerHTML = html;
  } else if (phoneTab === 'social') {
    let html = '<div style="color:#8fa3c8;">Messages</div>';
    html += messages.slice(0, 5).map(m =>
      '<div class="row"><span>💬 ' + m.from + '</span></div><div style="font-size:11px;color:#c8d4ee;margin-bottom:6px;">' + m.text + '</div>').join('')
      || '<i>Aucun message.</i>';
    html += '<div style="color:#8fa3c8;margin-top:8px;">Contacts (habitants rencontrés)</div>';
    const contacts = npcs.filter(n => n.rel > 0).slice(0, 12);
    html += contacts.map(n =>
      '<div class="row"><span>' + n.name + ' ' + '♥'.repeat(Math.min(5, n.rel)) + '</span><button class="act" data-call="' + n.name + '">📞 Appeler</button></div>').join('')
      || '<i>Discute avec les habitants pour créer des contacts.</i>';
    body.innerHTML = html;
    body.querySelectorAll('[data-call]').forEach(b =>
      b.addEventListener('click', () => callContact(b.dataset.call)));
  } else if (phoneTab === 'immo') {
    let html = '';
    for (const id of Object.keys(properties)) {
      const p = properties[id];
      html += '<div class="row"><span>🏠 ' + p.name + '</span><span>' +
        (p.owned ? '✔ Possédé' : '$ ' + p.price) + '</span></div>';
      if (!p.owned) {
        html += '<button class="act" data-buy="' + id + '">Acheter ($ ' + p.price + ')</button>';
      } else {
        html += '<div style="color:#8fa3c8;">Meubles : ' +
          (furniture[id].length ? furniture[id].map(k => FURNITURE[k].name).join(', ') : 'aucun') + '</div>';
        for (const k of Object.keys(FURNITURE)) {
          html += '<button class="act" data-furn="' + id + ':' + k + '">' + FURNITURE[k].name + ' ($ ' + FURNITURE[k].price + ')</button>';
        }
      }
    }
    body.innerHTML = html;
    body.querySelectorAll('[data-buy]').forEach(b =>
      b.addEventListener('click', () => { buyProperty(b.dataset.buy); renderPhone(); }));
    body.querySelectorAll('[data-furn]').forEach(b => {
      const parts = b.dataset.furn.split(':');
      b.addEventListener('click', () => { buyFurniture(parts[0], parts[1]); renderPhone(); });
    });
  } else if (phoneTab === 'biz') {
    let html = '';
    for (const id of Object.keys(businesses)) {
      const b = businesses[id];
      html += '<div class="row"><span>🏪 ' + b.name + (b.level > 1 ? ' (niv. ' + b.level + ')' : '') + '</span><span>' +
        (b.owned ? '✔ Possédé' : '$ ' + b.price) + '</span></div>';
      if (!b.owned) {
        html += '<button class="act" data-bbuy="' + id + '">Acheter ($ ' + b.price + ')</button>';
      } else {
        html += '<div class="row"><span>📦 Stock</span><span>' + b.stock + ' / ' + b.maxStock + '</span></div>';
        html += '<div class="row"><span>🏷️ Prix de vente</span><span>$ ' + b.salePrice + '</span></div>';
        html += '<div class="row"><span>👔 Employés</span><span>' + b.employees + ' / 2</span></div>';
        html += '<div class="row"><span>📈 Bénéfice</span><span style="color:' + (b.profit >= 0 ? '#7dff8a' : '#ff8a8a') + '">' + (b.profit >= 0 ? '+' : '') + b.profit + ' $</span></div>';
        html += '<button class="act" data-brestock="' + id + '">Réassort +10 ($ ' + (10 * b.unitCost) + ')</button>';
        html += '<button class="act" data-bup="' + id + '">Améliorer le local (' + (2000 * b.level) + ' $)</button>';
        html += '<button class="act" data-bminus="' + id + '">Prix − 1 $</button>';
        html += '<button class="act" data-bplus="' + id + '">Prix + 1 $</button>';
        if (b.employees < 2) html += '<button class="act" data-bhire="' + id + '">Embaucher ($ 500 + 100 $/jour)</button>';
        else html += '<button class="act" data-bfire="' + id + '">Renvoyer un employé</button>';
      }
    }
    body.innerHTML = html;
    body.querySelectorAll('[data-bbuy]').forEach(b =>
      b.addEventListener('click', () => { buyBusiness(b.dataset.bbuy); renderPhone(); }));
    body.querySelectorAll('[data-brestock]').forEach(b =>
      b.addEventListener('click', () => { restockBusiness(b.dataset.brestock); renderPhone(); }));
    body.querySelectorAll('[data-bup]').forEach(b =>
      b.addEventListener('click', () => { upgradeBiz(b.dataset.bup); renderPhone(); }));
    body.querySelectorAll('[data-bplus]').forEach(b =>
      b.addEventListener('click', () => { setBizPrice(b.dataset.bplus, 1); renderPhone(); }));
    body.querySelectorAll('[data-bminus]').forEach(b =>
      b.addEventListener('click', () => { setBizPrice(b.dataset.bminus, -1); renderPhone(); }));
    body.querySelectorAll('[data-bhire]').forEach(b =>
      b.addEventListener('click', () => { hireEmployee(b.dataset.bhire); renderPhone(); }));
    body.querySelectorAll('[data-bfire]').forEach(b =>
      b.addEventListener('click', () => { fireEmployee(b.dataset.bfire); renderPhone(); }));
  } else if (phoneTab === 'settings') {
    body.innerHTML =
      '<button class="act" id="optShadows">Ombres dynamiques : ' + (shadowsOn ? 'ON' : 'OFF') + '</button>' +
      '<button class="act" id="optVol">🔊 Volume : ' + Math.round(volume * 100) + ' %</button>' +
      '<div class="row"><span>Qualité auto (FPS ' + Math.round(fpsAvg) + ')</span><span>' + Math.round(qualityScale * 100) + ' %</span></div>' +
      '<div style="color:#8fa3c8;margin-top:10px;">Multijoueur — serveur réel requis (voir server/)</div>' +
      '<input id="mpUrl" placeholder="ws://adresse:7777" style="width:100%;background:#0d1424;border:1px solid #ffffff22;color:#e8eefc;padding:6px;border-radius:6px;box-sizing:border-box;">' +
      '<button class="act" id="mpConnect">Se connecter</button>' +
      '<button class="act" id="mpDisconnect">Se déconnecter</button>' +
      (net.on ? '<div>🟢 Connecté — ' + net.players.size + ' joueur(s) en ligne</div>' : '<div>⚪ Hors ligne</div>');
    const b = document.getElementById('optShadows');
    b.addEventListener('click', () => {
      shadowsOn = !shadowsOn;
      if (renderer) sunLight.castShadow = shadowsOn;
      renderPhone();
    });
    document.getElementById('optVol').addEventListener('click', () => { cycleVolume(); renderPhone(); });
    document.getElementById('mpConnect').addEventListener('click', () => {
      netConnect(document.getElementById('mpUrl').value, 'Joueur', ''); renderPhone();
    });
    document.getElementById('mpDisconnect').addEventListener('click', () => {
      netDisconnect(); renderPhone();
    });
  } else if (phoneTab === 'save') {
    body.innerHTML =
      '<button class="act" id="optSave">💾 Sauvegarder maintenant</button>' +
      '<button class="act" id="optLoad">📂 Charger la sauvegarde</button>' +
      '<div style="color:#8fa3c8;">Sauvegarde auto : 30 s</div>';
    document.getElementById('optSave').addEventListener('click', () => { doSave(); renderPhone(); });
    document.getElementById('optLoad').addEventListener('click', () => { doLoad(); renderPhone(); });
  }
}

// ================= BOUCLE =================
function update(dt) {
  if (gameState !== 'play') return;
  tod = (tod + dt / DAY_LENGTH) % 1;
  playtime += dt;
  const hour = Math.floor(tod * 24);
  if (hour !== lastHour) {
    lastHour = hour;
    bizHourTick();
    if (hour === 0) { bizDayTick(); dayCount++; }
  }
  fishingTick(dt);
  updateRace(dt);
  basketCool -= dt;
  updateWeather(dt);
  netUpdate(dt);
  achT -= dt;
  if (achT <= 0) { achT = 2; checkAchievements(); }
  if (playerVehicle) updateVehicle(dt); else updatePlayer(dt);
  updateAICars(dt);
  updateBus(dt);
  if (lastToastT > 0) lastToastT -= dt;
  updateNPCs(dt);
  hitCool -= dt;
  if (!playerVehicle && !insideInterior) {
    for (const car of aiCars) {
      const m = car.mesh;
      if (hitCool <= 0 && Math.hypot(m.position.x - playerPos.x, m.position.z - playerPos.z) < 2.4) {
        health -= 15; hitCool = 1;
        const kx = playerPos.x - m.position.x, kz = playerPos.z - m.position.z;
        const kl = Math.hypot(kx, kz) || 1;
        const c = collideCircle(playerPos.x + kx / kl * 4, playerPos.z + kz / kl * 4, 0.5);
        playerPos.x = c.x; playerPos.z = c.z;
        toast('💥 Percuté ! Va à l\u2019hôpital ou dors.');
        break;
      }
    }
  }
  if (health <= 0) {
    health = 100;
    money = Math.floor(money * 0.8);
    playerPos.set(roadCenters[2] + ROADW / 2 + 2.5, 0, cell(2) + 30);
    toast('WASTED 💀 — réveil à l\u2019hôpital (-20 % d\u2019argent)');
  }
  updatePickups(dt);
  updateMission(dt);
  updateCamera(dt);
  updateSky();
  updateHUD(dt);
  if (toastT > 0) { toastT -= dt; if (toastT <= 0) document.getElementById('toast').style.opacity = 0; }
  autoSaveT += dt;
  if (autoSaveT > 30) { autoSaveT = 0; doSave(); }
}

function currentActionTarget() {
  if (playerVehicle) return { label: 'E — Sortir', fn: exitVehicle };
  if (insideInterior) {
    const room = interiorRooms[insideInterior];
    if (Math.hypot(room.exit.x - playerPos.x, room.exit.z - playerPos.z) < 3)
      return { label: 'E — Sortir', fn: exitInterior };
  }
  for (const z of zones) {
    if (z.interior && z.interior !== insideInterior) continue;
    if (!z.interior && insideInterior) continue;
    if (Math.hypot(z.x - playerPos.x, z.z - playerPos.z) < z.r) {
      const label = typeof z.label === 'function' ? z.label() : z.label;
      if (label) return { label, fn: z.fn };
    }
  }
  if (!insideInterior && !ridingBus) {
    const n = nearestNPC(2.2);
    if (n) return { label: 'E — Parler à ' + n.name + ' (' + n.job.label + ')', fn: () => openDialog(n) };
  }
  if (cityBus) {
    if (ridingBus) return { label: 'E — Descendre au prochain arrêt', fn: requestBusStop };
    const bd = Math.hypot(cityBus.mesh.position.x - playerPos.x, cityBus.mesh.position.z - playerPos.z);
    if (cityBus.stopT > 0 && bd < 7) return { label: 'E — Monter dans le bus (2 $)', fn: boardBus };
  }
  if (!insideInterior) {
    for (const d of doors) {
      if (Math.hypot(d.x - playerPos.x, d.z - playerPos.z) < d.r) return d;
    }
    const v = nearestEnterable();
    if (v) return { label: 'E — Entrer dans la ' + v.spec.name, fn: () => enterVehicle(v) };
    if (shopRegister && Math.hypot(shopRegister.x - playerPos.x, shopRegister.z - playerPos.z) < 2.6)
      return { label: 'E — Acheter un burger (10 $)', fn: buyBurger };
  }
  return null;
}

function interact() {
  if (dialog) { advanceDialog(); return; }
  const t = currentActionTarget();
  if (t && t.fn) t.fn();
}

function startGameState(fresh) {
  if (!fresh && hasSave()) doLoad();
  else {
    money = 250; tod = 8 / 24; deliveries = 0; distW = 0; distD = 0; playtime = 0; transactions = [];
    health = 100; education = 0;
    clearOwned();
    for (const b of Object.values(businesses)) {
      b.owned = false; b.stock = 0; b.salePrice = b.basePrice; b.employees = 0; b.profit = 0; b.level = 1;
    }
    story.idx = 0; story.active = false; story.done = false; messages = [];
    fitness = 0; unlockedAch = [];
    Object.assign(stats, { baskets: 0, fish: 0, races: 0, workouts: 0 });
    navTarget = null; dayCount = 1; fishing = null; race = null;
    setWeather('clair');
    lastHour = -1;
    ridingBus = false; getOffBus = false;
    playerPos.set(roadCenters[2] + ROADW / 2 + 2.5, 0, cell(2) + 30);
  }
  gameState = 'play';
}

// ================= BOOT NAVIGATEUR =================
function boot() {
  renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('game'), antialias: true });
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  buildWorld();
  playerMesh = makeHumanoid(0xe74c3c, 0x2c3e50, 0xf5c9a0);
  playerMesh.castShadow = true;
  scene.add(playerMesh);
  playerPos = new THREE.Vector3(roadCenters[2] + ROADW / 2 + 2.5, 0, cell(2) + 30);
  playerVel = new THREE.Vector3(0, 0, 0);

  const canvas = renderer.domElement;
  canvas.addEventListener('click', () => { if (gameState === 'play' && !phoneOpen) canvas.requestPointerLock(); });
  document.addEventListener('pointerlockchange', () => {
    if (document.pointerLockElement !== canvas && gameState === 'play' && !phoneOpen) showPause();
  });
  document.addEventListener('mousemove', e => {
    if (document.pointerLockElement !== canvas) return;
    camYaw -= e.movementX * 0.0026;
    camPitch = Math.max(0.05, Math.min(1.15, camPitch + e.movementY * 0.0022));
  });
  addEventListener('keydown', e => {
    if (e.code === 'Tab') { e.preventDefault(); phoneOpen ? closePhone() : openPhone(); return; }
    if (e.code === 'Escape') {
      if (dialog) { closeDialog(); return; }
      if (phoneOpen) { closePhone(); return; }
      if (gameState === 'play') showPause(); else if (gameState === 'pause') hidePause();
      return;
    }
    if (gameState !== 'play') return;
    switch (e.code) {
      case 'KeyW': case 'KeyZ': case 'ArrowUp': input.f = 1; break;
      case 'KeyS': case 'ArrowDown': input.b = 1; break;
      case 'KeyA': case 'KeyQ': case 'ArrowLeft': input.l = 1; break;
      case 'KeyD': case 'ArrowRight': input.r = 1; break;
      case 'ShiftLeft': case 'ShiftRight': input.run = 1; break;
      case 'Space': input.jump = 1; e.preventDefault(); break;
      case 'KeyE': if (!e.repeat) interact(); break;
      case 'KeyH': horn(); break;
    }
  });
  addEventListener('keyup', e => {
    switch (e.code) {
      case 'KeyW': case 'KeyZ': case 'ArrowUp': input.f = 0; break;
      case 'KeyS': case 'ArrowDown': input.b = 0; break;
      case 'KeyA': case 'KeyQ': case 'ArrowLeft': input.l = 0; break;
      case 'KeyD': case 'ArrowRight': input.r = 0; break;
      case 'ShiftLeft': case 'ShiftRight': input.run = 0; break;
      case 'Space': input.jump = 0; break;
    }
  });
  addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });
  document.querySelectorAll('#phone .ptabs button').forEach(b =>
    b.addEventListener('click', () => { phoneTab = b.dataset.tab; renderPhone(); }));

  const menu = document.getElementById('menu');
  const pause = document.getElementById('pause');
  document.getElementById('btnContinue').disabled = !hasSave();
  document.getElementById('btnNew').addEventListener('click', () => {
    initAudio();
    menu.style.display = 'none';
    startGameState(true);
  });
  document.getElementById('btnContinue').addEventListener('click', () => {
    initAudio();
    menu.style.display = 'none';
    startGameState(false);
  });
  function showPause() {
    gameState = 'pause';
    pause.style.display = 'flex';
    document.getElementById('btnLoad').disabled = !hasSave();
  }
  function hidePause() {
    gameState = 'play';
    pause.style.display = 'none';
  }
  window._showPause = showPause; window._hidePause = hidePause;
  document.getElementById('btnResume').addEventListener('click', hidePause);
  document.getElementById('btnSave').addEventListener('click', () => { doSave(); document.getElementById('btnLoad').disabled = false; });
  document.getElementById('btnLoad').addEventListener('click', () => { doLoad(); });
  document.getElementById('btnMenu').addEventListener('click', () => {
    gameState = 'menu';
    pause.style.display = 'none';
    menu.style.display = 'flex';
    document.getElementById('btnContinue').disabled = !hasSave();
  });

  let last = performance.now();
  fpsFrames = 0; fpsTime = 0;
  function loop() {
    requestAnimationFrame(loop);
    const now = performance.now();
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    fpsFrames++; fpsTime += dt;
    if (fpsTime >= 2) { applyQuality(fpsFrames / fpsTime); fpsFrames = 0; fpsTime = 0; }
    update(dt);
    if (renderer && playerMesh) renderer.render(scene, camera);
  }
  loop();
}

// ================= AUDIO =================
let AC = null, engineOsc = null, engineGain = null;
function initAudio() {
  if (AC) return;
  try {
    AC = new (window.AudioContext || window.webkitAudioContext)();
  } catch (e) { AC = null; }
}
function horn() {
  if (!AC) return;
  const o = AC.createOscillator(), g = AC.createGain();
  o.type = 'square'; o.frequency.value = 392;
  g.gain.setValueAtTime(0.08 * volume, AC.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, AC.currentTime + 0.35);
  o.connect(g); g.connect(AC.destination);
  o.start(); o.stop(AC.currentTime + 0.4);
}

// ================= AUTO-TEST =================
function selfTest() {
  const log = {};
  buildWorld();
  playerPos = new THREE.Vector3(roadCenters[2] + ROADW / 2 + 2.5, 0, cell(2) + 30);
  playerVel = new THREE.Vector3();
  playerMesh = makeHumanoid(0xe74c3c, 0x2c3e50, 0xf5c9a0);
  scene.add(playerMesh);
  gameState = 'play';
  startGameState(true);

  input.f = 1;
  const p0 = playerPos.clone();
  for (let i = 0; i < 120; i++) update(1 / 60);
  input.f = 0;
  log.walk = playerPos.distanceTo(p0) > 3;

  const pv = vehiclesParked[0];
  playerPos.set(pv.mesh.position.x + 2, 0, pv.mesh.position.z);
  const v = nearestEnterable();
  log.vehicleFound = !!v;
  if (v) {
    enterVehicle(v);
    log.inVehicle = !!playerVehicle;
    input.f = 1;
    const c0 = playerPos.clone();
    for (let i = 0; i < 240; i++) update(1 / 60);
    log.drives = Math.abs(playerVehicle.speed) > 8;
    log.vehicleMoved = playerPos.distanceTo(c0) > 20;
    log.inBounds = Math.abs(playerPos.x) < SIZE / 2 + 150 && Math.abs(playerPos.z) < SIZE / 2 + 150;
    input.f = 0;
    exitVehicle();
    log.exited = !playerVehicle;
  }

  money = 100;
  const m0 = money;
  log.purchase = buyBurger() && money === m0 - 10 && transactions.length > 0;

  const d0 = deliveries, mo0 = money;
  playerPos.set(missionTarget.x, 0, missionTarget.z);
  for (let i = 0; i < 10; i++) update(1 / 60);
  log.mission = deliveries === d0 + 1 && money > mo0;

  const n0 = npcs[0].mesh.position.clone();
  for (let i = 0; i < 90; i++) update(1 / 60);
  log.npcMoved = npcs.some(n => n.mesh.position.distanceTo(n0) > 0.5);

  const a0 = aiCars[0].mesh.position.clone();
  for (let i = 0; i < 60; i++) update(1 / 60);
  log.traffic = aiCars[0].mesh.position.distanceTo(a0) > 1;

  const tod0 = tod;
  for (let i = 0; i < 120; i++) update(1 / 60);
  log.dayCycle = tod !== tod0;
  updateSky();

  money = 777; playerPos.set(5, 0, 5);
  doSave();
  money = 0; playerPos.set(0, 0, 0);
  log.load = doLoad() && money === 777 && Math.abs(playerPos.x - 5) < 0.01;

  phoneTab = 'stats'; openPhone();
  log.phone = phoneOpen;
  closePhone();

  money = 5000; tod = 0; distW = 100; distD = 200; deliveries = 7; playtime = 99;
  playerPos.set(-12, 0, 33); camYaw = 1.23;
  doSave();
  money = 0; tod = 0.5; distW = 0; distD = 0; deliveries = 0; playtime = 0;
  playerPos.set(0, 0, 0); camYaw = 0;
  doLoad();
  log.saveRoundtrip = money === 5000 && deliveries === 7 && Math.abs(camYaw - 1.23) < 0.001
    && Math.abs(playerPos.x + 12) < 0.01 && Math.abs(distD - 200) < 0.01;

  // PHASE 3 : intérieurs & immobilier
  const doorHosp = doors.find(d => d.label.includes('HÔPITAL'));
  log.doorExists = !!doorHosp;
  playerPos.set(doorHosp.x, 0, doorHosp.z);
  doorHosp.fn();
  log.enterHospital = insideInterior === 'hospital';
  const healZone = zones.find(z => z.interior === 'hospital');
  health = 40; money = 100;
  healZone.fn();
  log.heal = health === 100 && money === 75;
  const roomH = interiorRooms.hospital;
  playerPos.set(roomH.exit.x, 0, roomH.exit.z);
  interact();
  log.exitInterior = insideInterior === null;

  money = 5000;
  log.buyProp = buyProperty('apartment') && properties.apartment.owned && money === 3000;
  log.buyFurn = buyFurniture('apartment', 'sofa') && furniture.apartment.length === 1
    && money === 2700 && placedFurniture.length === 1;

  const doorApt = doors.find(d => d.label.includes('RÉSIDENCE'));
  playerPos.set(doorApt.x, 0, doorApt.z);
  doorApt.fn();
  log.enterApt = insideInterior === 'apartment';
  const sleepZone = zones.find(z => z.interior === 'apartment');
  tod = 0.9; health = 40;
  sleepZone.fn();
  log.sleep = tod === 8 / 24 && health === 100;

  const doorUni = doors.find(d => d.label.includes('UNIVERSITÉ'));
  playerPos.set(doorUni.x, 0, doorUni.z);
  doorUni.fn();
  const course = zones.find(z => z.interior === 'university');
  money = 200;
  const edu0 = education;
  course.fn();
  log.course = education === edu0 + 1 && money === 150;
  const roomU = interiorRooms.university;
  playerPos.set(roomU.exit.x, 0, roomU.exit.z);
  interact();
  log.exitUni = insideInterior === null;

  const doorVilla = doors.find(d => d.label.includes('VILLA'));
  playerPos.set(doorVilla.x, 0, doorVilla.z);
  doorVilla.fn();
  log.villaLocked = properties.villa.owned === false && insideInterior === null;

  doorApt.fn();
  const roomA = interiorRooms.apartment;
  playerPos.set(roomA.exit.x, 0, roomA.exit.z);
  interact();
  log.exitApt = insideInterior === null;

  money = 12000;
  buyProperty('villa');
  buyFurniture('villa', 'tv');
  education = 3; health = 88;
  const snapMoney = money, snapEdu = education, snapHp = health;
  doSave();
  properties.villa.owned = false; furniture.villa = []; money = 0; education = 0; health = 0;
  doLoad();
  log.saveProps = properties.villa.owned === true && furniture.villa.includes('tv')
    && money === snapMoney && education === snapEdu && health === snapHp;

  // PHASE 4 : véhicules avancés
  log.dealerDoor = doors.some(d => d.label.includes('CONCESSIONNAIRE'));
  money = 30000;
  log.buyMoto = buyVehicle('moto') && ownedVehicles.length === 1 && money === 30000 - 800;
  log.buySport = buyVehicle('sport') && ownedVehicles.length === 2;
  const mine = ownedVehicles[0];
  playerPos.set(mine.mesh.position.x + 2, 0, mine.mesh.position.z);
  enterVehicle(mine);
  input.f = 1;
  const fuel0 = mine.fuel;
  for (let i = 0; i < 300; i++) update(1 / 60);
  log.motoDrives = Math.abs(mine.speed) > 10;
  log.fuelDrains = mine.fuel < fuel0 && mine.fuel > 0;
  input.f = 0;
  money = 5000;
  const refOk = refuelAction();
  log.refuel = refOk && playerVehicle.fuel === playerVehicle.spec.cap;
  playerVehicle.hp = 50;
  log.repair = repairAction() && playerVehicle.hp === 100;
  const c0 = mine.mesh.userData.body.material.color.clone();
  mine.hp = 20;
  input.f = 1; update(1 / 60); update(1 / 60); input.f = 0;
  const c1 = mine.mesh.userData.body.material.color;
  log.visualDamage = c1.getHex() !== c0.getHex();
  exitVehicle();

  const boat = vehiclesParked.find(v => v.type === 'boat');
  playerPos.set(boat.mesh.position.x, 0, boat.mesh.position.z);
  enterVehicle(boat);
  input.f = 1;
  for (let i = 0; i < 240; i++) update(1 / 60);
  log.boatSails = Math.abs(boat.speed) > 8 && boat.mesh.position.x >= WATER_X + 5;
  input.f = 0;
  exitVehicle();

  const plane = vehiclesParked.find(v => v.type === 'plane');
  playerPos.set(plane.mesh.position.x, 0, plane.mesh.position.z);
  enterVehicle(plane);
  input.f = 1;
  for (let i = 0; i < 400; i++) update(1 / 60);
  log.planeFlies = plane.alt > 2 && plane.speed > 30;
  input.f = 0;
  for (let i = 0; i < 1500; i++) update(1 / 60);
  log.planeLands = plane.alt === 0;
  exitVehicle();

  const b0 = cityBus.mesh.position.clone();
  for (let i = 0; i < 240; i++) update(1 / 60);
  log.busMoves = cityBus.mesh.position.distanceTo(b0) > 10;
  let guard = 0;
  while (cityBus.stopT <= 0 && guard++ < 2000) update(1 / 60);
  playerPos.set(cityBus.mesh.position.x + 2, 0, cityBus.mesh.position.z);
  money += 10;
  boardBus();
  log.boardBus = ridingBus === true;
  const bp0 = playerPos.clone();
  for (let i = 0; i < 600; i++) update(1 / 60);
  log.busRide = playerPos.distanceTo(bp0) > 10;
  requestBusStop();
  guard = 0;
  while (ridingBus && guard++ < 3000) update(1 / 60);
  log.leaveBus = ridingBus === false;

  buyVehicle('van');
  const ownedCount = ownedVehicles.length;
  playerPos.set(3, 0, 4);
  doSave();
  clearOwned();
  const cleared = ownedVehicles.length === 0;
  doLoad();
  log.saveOwned = cleared && ownedVehicles.length === ownedCount;

  // PHASE 5 : PNJ avancés
  log.npcPersonalities = npcs.every(n => n.name && n.job && n.home)
    && new Set(npcs.map(n => n.job.id)).size >= 4;
  tod = 0.5;
  const worker = npcs.find(n => n.job.work && n.workAnchor);
  log.workerExists = !!worker;
  if (worker) {
    const d0 = Math.hypot(worker.mesh.position.x - worker.workAnchor.x, worker.mesh.position.z - worker.workAnchor.z);
    for (let i = 0; i < 300; i++) update(1 / 60);
    const d1 = Math.hypot(worker.mesh.position.x - worker.workAnchor.x, worker.mesh.position.z - worker.workAnchor.z);
    log.npcGoesToWork = npcBucket(worker) === 0 && d1 <= d0 + 1;
  }
  const rider = npcs.find(n => n.busUser && !n.onBus);
  rider.mesh.position.set(cityBus.mesh.position.x + 3, 0, cityBus.mesh.position.z + 3);
  let g2 = 0;
  while (!rider.onBus && g2++ < 600) { cityBus.stopT = 4; update(1 / 60); }
  log.npcBoardsBus = rider.onBus === true;
  g2 = 0;
  while (rider.onBus && g2++ < 2000) { cityBus.stopT = 4; update(1 / 60); }
  log.npcLeavesBus = rider.onBus === false && rider.mesh.visible === true;

  tod = 0.5;
  const talker = npcs.find(n => !n.onBus && n.rel === 0);
  playerPos.set(talker.mesh.position.x + 1, 0, talker.mesh.position.z);
  interact();
  log.dialogOpens = dialog !== null && dialog.npc === talker;
  const giftBefore = money;
  talker.chatCount = 2;
  let g3 = 0;
  while (dialog && g3++ < 30) interact();
  log.dialogCloses = dialog === null && talker.chatCount === 3 && talker.rel === 1;
  log.friendGift = money > giftBefore;

  talker.rel = 7; talker.chatCount = 5;
  playerPos.set(3, 0, 4);
  doSave();
  talker.rel = 0; talker.chatCount = 0;
  doLoad();
  log.saveRels = talker.rel === 7 && talker.chatCount === 5;

  // PHASE 6 : entreprises
  log.bizZones = zones.some(z => typeof z.label === 'function' && (z.label() || '').includes('Nova Burger'))
    && zones.some(z => typeof z.label === 'function' && (z.label() || '').includes('Hôtel Nova'))
    && zones.some(z => typeof z.label === 'function' && (z.label() || '').includes('Station Nova'))
    && zones.some(z => typeof z.label === 'function' && (z.label() || '').includes('Concessionnaire'));
  money = 5000;
  log.buyBiz = buyBusiness('burger') && businesses.burger.owned && money === 1000;
  log.hireEmp = hireEmployee('burger') && businesses.burger.employees === 1 && money === 500;
  log.restock = restockBusiness('burger') && businesses.burger.stock === 10 && money === 470;
  log.setPrice = setBizPrice('burger', 2) && businesses.burger.salePrice === 12;
  money = 3000;
  log.upgBiz = upgradeBiz('burger') && businesses.burger.level === 2 && money === 1000;
  log.setPrice2 = setBizPrice('burger', -2) && businesses.burger.salePrice === 10;
  const mSales = money;
  businesses.burger.stock = 20;
  tod = 8.98 / 24; lastHour = 8;
  for (let i = 0; i < 130; i++) update(1 / 60);
  log.bizSales = businesses.burger.stock === 15 && money === mSales + 50
    && transactions.some(t => t.label.includes('Ventes \u2014 Nova Burger (5)'));
  businesses.burger.stock = 0;
  money = 1000; businesses.burger.employees = 1;
  tod = 23.5 / 24; lastHour = 23;
  for (let i = 0; i < 7300; i++) update(1 / 60);
  log.bizSalary = money === 900 && businesses.burger.employees === 1;
  const bizSnap = { o: businesses.burger.owned, s: businesses.burger.stock, p: businesses.burger.salePrice, e: businesses.burger.employees, pr: businesses.burger.profit, l: businesses.burger.level };
  playerPos.set(3, 0, 4);
  doSave();
  businesses.burger.owned = false; businesses.burger.stock = 0; businesses.burger.salePrice = 1;
  businesses.burger.employees = 0; businesses.burger.profit = 0; businesses.burger.level = 1;
  doLoad();
  log.saveBiz = businesses.burger.owned === bizSnap.o && businesses.burger.stock === bizSnap.s
    && businesses.burger.salePrice === bizSnap.p && businesses.burger.employees === bizSnap.e
    && businesses.burger.profit === bizSnap.pr && businesses.burger.level === bizSnap.l;
  phoneTab = 'biz'; openPhone();
  log.bizTab = phoneOpen && document.getElementById('pbody') !== undefined;
  closePhone();

  // PHASE 7 : activités
  playerPos.set(WATER_X + 6, 0, 0);
  camYaw = -Math.PI / 2;
  const s0 = playerPos.clone();
  input.f = 1;
  for (let i = 0; i < 60; i++) update(1 / 60);
  input.f = 0;
  log.swim = playerPos.x > s0.x && playerPos.distanceTo(s0) > 1 && playerPos.distanceTo(s0) < 4;

  const fz = zones.find(z => typeof z.label === 'function' && (z.label() || '').includes('Pêcher'));
  log.fishZone = !!fz;
  playerPos.set(fz.x, 0, fz.z);
  fz.fn();
  log.fishCast = fishing !== null;
  fishing.t = 0.01;
  update(1 / 60);
  log.fishBite = fishing !== null && fishing.biteT > 0;
  const mFish = money;
  interact();
  log.fishCatch = fishing === null && stats.fish === 1 && money > mFish;

  const doorGym = doors.find(d => d.label.includes('SALLE'));
  playerPos.set(doorGym.x, 0, doorGym.z);
  doorGym.fn();
  log.enterGym = insideInterior === 'gym';
  money = 100;
  const fit0 = fitness;
  const gz = zones.find(z => z.interior === 'gym');
  gz.fn();
  log.gymWorkout = fitness === Math.min(5, fit0 + 1) && money === 80;
  const roomG = interiorRooms.gym;
  playerPos.set(roomG.exit.x, 0, roomG.exit.z);
  interact();
  log.exitGym = insideInterior === null;

  const zoneLabel = z => (typeof z.label === 'function' ? z.label() : z.label) || '';
  const rz = zones.find(z => zoneLabel(z).includes('Course de rue'));
  log.raceZone = !!rz;
  playerPos.set(rz.x + 1, 0, rz.z);
  rz.fn();
  log.raceStart = race !== null && race.cps.length === 3;
  for (const cp of race.cps) {
    playerPos.set(cp.x, 0, cp.z);
    update(1 / 60);
  }
  log.raceComplete = race === null && stats.races === 1 && money > 80;

  const bz2 = zones.find(z => zoneLabel(z).includes('panier'));
  log.basketZone = !!bz2;
  fitness = 5; basketCool = 0;
  const mB = money, bB = stats.baskets;
  for (let t = 0; t < 30; t++) { basketCool = 0; shootBasket(); }
  log.basket = stats.baskets > bB && money - mB === (stats.baskets - bB) * 10;

  // PHASE 8 : histoire
  log.storyStart = startStory() === true;
  const dS = deliveries;
  playerPos.set(missionTarget.x, 0, missionTarget.z);
  for (let i = 0; i < 10; i++) update(1 / 60);
  log.storyM1 = story.idx === 1 && deliveries === dS + 1;

  const t2 = npcs.find(n => !n.onBus);
  playerPos.set(t2.mesh.position.x + 0.6, 0, t2.mesh.position.z);
  interact();
  const dlgStory = dialog !== null;
  let g5 = 0;
  while (dialog && g5++ < 40) interact();
  log.storyM2 = dlgStory && story.idx === 2;

  money = 5000;
  buyFurniture('apartment', 'plant');
  log.storyM3 = story.idx === 3;

  playerPos.set(rz.x + 1, 0, rz.z);
  rz.fn();
  for (const cp of race.cps) { playerPos.set(cp.x, 0, cp.z); update(1 / 60); }
  log.storyM4 = story.idx === 4;

  openFinalChoice();
  log.choiceShown = dialog !== null && dialog.choices && dialog.choices.length === 2;
  resolveChoice(1);
  log.storyM5 = story.done === true && story.idx === 5 && messages.length >= 6;

  // PHASE 9 : téléphone complet
  log.gps = setGPS() && navTarget !== null;
  phoneTab = 'social'; openPhone();
  log.socialTab = phoneOpen;
  closePhone();
  const cName = npcs.find(n => n.rel > 0).name;
  log.contactCall = callContact(cName) === true;
  log.contactUnknown = callContact('InconnuXYZ') === false;
  const v0 = volume;
  cycleVolume();
  log.volumeCycle = volume !== v0 && volume >= 0 && volume <= 1;
  log.dayCount = dayCount === 2;

  // PHASE 10 : météo & optimisation
  const w0 = weather;
  let gw = 0;
  weatherT = 0.01;
  while (weather === w0 && gw++ < 50) { weatherT = 0.01; update(1 / 60); }
  log.weatherChanges = weather !== w0;
  setWeather('pluie');
  log.weatherRain = grip === 0.75 && scene.fog.far === 340 && rainMesh.visible === true;
  setWeather('brouillard');
  log.weatherFog = scene.fog.far === 120 && rainMesh.visible === false;
  setWeather('clair');
  const q0 = qualityScale;
  log.autoQuality = applyQuality(20) < q0 && applyQuality(60) === 1;
  const fnpc = npcs.find(n => !n.onBus && !n.busUser);
  fnpc.mesh.position.set(WATER_X + 80, 0, 0);
  const fref = fnpc.mesh.position.clone();
  for (let i = 0; i < 60; i++) update(1 / 60);
  log.npcCulling = fnpc.mesh.position.distanceTo(fref) < 0.001;

  // PHASE 11 : succès & sauvegarde v2
  money = 12000; education = 5; fitness = 5;
  checkAchievements();
  log.achievements = unlockedAch.includes('richesse') && unlockedAch.includes('boss')
    && unlockedAch.includes('cerveau') && unlockedAch.includes('athlete')
    && unlockedAch.includes('histoire') && unlockedAch.length >= 5;
  const achN = unlockedAch.length, wS = weather, dS2 = dayCount, fitS = fitness, stS = story.idx;
  playerPos.set(3, 0, 4);
  doSave();
  const savedData = JSON.parse(localStorage.getItem(SAVE_KEY));
  log.saveVersion = savedData.v === 2 && savedData.fitness === 5 && savedData.ach.length === achN;
  money = 0; weather = 'orage'; dayCount = 99; fitness = 0; story.idx = 0; unlockedAch = [];
  doLoad();
  log.saveAll = money === 12000 && weather === wS && dayCount === dS2 && fitness === fitS
    && story.idx === stS && unlockedAch.length === achN;
  localStorage.setItem(SAVE_KEY, JSON.stringify({ money: 4321, tod: 0.5, x: 1, z: 2 }));
  money = 0;
  log.migrateV1 = doLoad() === true && money === 4321;

  // PHASE 12 : multijoueur (protocole client réel)
  netHandle({ t: 'state', id: 'p1', x: 5, z: 6, ry: 1 });
  log.netRemote = net.players.get('p1') !== undefined && net.players.get('p1').mesh.position.x === 5;
  netHandle({ t: 'players', list: [{ id: 'p2', name: 'Zoé', x: 1, z: 2, ry: 0, veh: '' }] });
  log.netPlayers = net.players.get('p2') !== undefined && net.players.get('p2').name === 'Zoé';
  netHandle({ t: 'leave', id: 'p1' });
  netHandle({ t: 'leave', id: 'p2' });
  log.netLeave = !net.players.has('p1') && !net.players.has('p2');
  log.netSanitize = sanitizeChat('<b>salut</b>') === 'bsalut/b' && sanitizeChat('x'.repeat(300)).length === 120;
  log.netChatOffline = netChat('salut') === false;

  console.log('__NOVA_TEST__ ' + JSON.stringify(log));
  const failed = Object.entries(log).filter(([, v]) => !v);
  if (failed.length) { console.error('TESTS ECHOUES: ' + failed.map(f => f[0]).join(', ')); process.exitCode = 1; }
}

if (IS_TEST) selfTest();
else if (typeof document !== 'undefined' && document.getElementById && document.getElementById('game')) boot();
