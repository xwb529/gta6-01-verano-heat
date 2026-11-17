import { THREE, box, material, cylinder, label, clamp, bakeRigid } from './engine.js';
import { createRandom } from './random.js';
export const ROAD_X = [-150, -70, 10, 90];
export const ROAD_Z = [-150, -70, 10, 90, 170];
export const LOCATIONS = {
  spawn: { x: 101, z: 85 }, dana: { x: 105, z: 79 },
  package: { x: 208, z: 116 }, delivery: { x: -151, z: -133 },
  aurora: { x: -54, z: -134 }, finish: { x: 208, z: 116 },
};
export function createWorld(scene) {
  const random = createRandom(72491), solids = [], footprints = [];
  const batch = new Map();
  function staticBox(color, x, y, z, w, h, d, solid = false) {
    if (!batch.has(color)) batch.set(color, []);
    batch.get(color).push({ x, y, z, w, h, d });
    if (solid) { const bound = { x, z, w, d }; solids.push(bound); footprints.push(bound); }
  }
  scene.background = new THREE.Color('#c5c7b8'); scene.fog = new THREE.Fog('#c5c7b8', 120, 620);
  const hemi = new THREE.HemisphereLight('#e4f5e5', '#a97864', 1.6); scene.add(hemi);
  const sun = new THREE.DirectionalLight('#ffdbac', 2.5); sun.position.set(-110, 200, -170);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -95, right: 95, top: 95, bottom: -95, near: 1, far: 550 });
  sun.shadow.bias = -.0008; sun.shadow.normalBias = .06; scene.add(sun, sun.target);
  const sunDisc = new THREE.Mesh(new THREE.SphereGeometry(30, 24, 16), new THREE.MeshBasicMaterial({ color: '#ffe6b5', fog: false }));
  sunDisc.position.set(-260, 130, -530); scene.add(sunDisc);
  box(scene, '#b6b28c', -34, -.9, 0, 350, 1.8, 420);
  box(scene, '#ead2a0', 126, -.4, 0, 32, 1, 420);
  const water = new THREE.Mesh(new THREE.PlaneGeometry(1800, 1800), material('#3f9eaa', { roughness: .28, metalness: .22 }));
  water.rotation.x = -Math.PI / 2; water.position.set(1025, -.46, 0); scene.add(water);
  box(scene, '#4c929b', -34, -1.4, -420, 350, .2, 420);
  // Each color is one instanced draw call: windows and lane stripes stay inexpensive.
  for (const x of ROAD_X) {
    staticBox('#c4b99e', x, .015, 0, 24, .09, 400);
    staticBox('#48575a', x, .08, 0, 17, .12, 400);
    for (let z = -192; z < 197; z += 11) staticBox('#ead6a3', x, .15, z, .18, .025, 4);
  }
  for (const z of ROAD_Z) {
    staticBox('#c4b99e', -30, .025, z, 330, .09, 24);
    staticBox('#48575a', -30, .09, z, 330, .12, 17);
    for (let x = -190; x < 111; x += 11) staticBox('#ead6a3', x, .16, z, 4, .025, .18);
  }
  for (const x of ROAD_X) for (const z of ROAD_Z) {
    staticBox('#48575a', x, .17, z, 17, .04, 17);
    for (const side of [-1, 1]) for (let s = -6; s < 7; s += 2.2) {
      staticBox('#d4d7c6', x + s, .2, z + side * 11, 1.1, .025, 3.6);
      staticBox('#d4d7c6', x + side * 11, .2, z + s, 3.6, .025, 1.1);
    }
  }
  const colors = ['#d0b99c','#d5a797','#98b6ad','#ddd0ad','#b5b6a0','#c78e7d','#b6c2b7'];
  for (let ix = 0; ix < 3; ix++) for (let iz = 0; iz < 4; iz++) {
    const cx = ROAD_X[ix] + 40, cz = ROAD_Z[iz] + 40;
    staticBox('#c2b395', cx, .14, cz, 55, .3, 55);
    for (const ox of [-15, 15]) for (const oz of [-15, 15]) {
      // Leave the northwest garage courtyard open for the Aurora mission.
      if (ix === 1 && iz === 0 && ox < 0 && oz < 0) continue;
      const x = cx + ox, z = cz + oz, h = 9 + random() * (ix === 2 ? 23 : 43);
      const w = 19 + random() * 4, d = 18 + random() * 4;
      const col = colors[Math.floor(random() * colors.length)];
      staticBox(col, x, h / 2, z, w, h, d, true);
      staticBox('#f3dcc0', x, h + .15, z, w + .7, .6, d + .7);
      staticBox('#747c75', x + 2, h + .9, z - 2, 5, 1.3, 4);
      for (let y = 3; y < h - 1; y += 3.7) for (let a = -w / 2 + 2; a < w / 2 - 1; a += 4) {
        const windowColor = random() > .2 ? '#477078' : '#f1cd8d';
        staticBox(windowColor, x + a, y, z - d / 2 - .04, 1.9, 1.65, .08);
        staticBox(windowColor, x + a, y, z + d / 2 + .04, 1.9, 1.65, .08);
        staticBox('#477078', x - w / 2 - .04, y, z + a * .75, .08, 1.65, 1.7);
        staticBox('#477078', x + w / 2 + .04, y, z + a * .75, .08, 1.65, 1.7);
      }
      if (h < 22) staticBox('#427c79', x, 2.6, z + d / 2 + 1.2, w, .3, 2.5);
    }
  }
  // Landmark hotels on the beach boulevard and a low, drivable garage.
  staticBox('#e4b6a2', 63, 26, -120, 26, 52, 31, true);
  for (let y = 6; y < 52; y += 5) staticBox('#f3dfc0', 63, y, -103.6, 28, .65, 3);
  label(scene, 'HOTEL SOL', 64, 56, -103, '#ffd492', 22);
  staticBox('#dbbd98', -38, 3.5, -130, 17, 7, 32, true);
  label(scene, 'LUNA MOTOR CLUB', -42, 9, -124, '#95edcf', 21);
  staticBox('#996f63', -174, 4, -132, 17, 8, 22, true);
  label(scene, 'DANA’S / EXPORTS', -171, 10, -130, '#ffd596', 20);
  label(scene, 'VERANO BEACH', 118, 9, 42, '#f7d8b5', 20);
  // Waterfront promenade, a wide pier, pilings, lamps and a covered lookout.
  staticBox('#d7c7a6', 114, .18, 0, 8, .4, 400);
  staticBox('#9c8067', 161, .13, 116, 130, .55, 15);
  for (let x = 103; x < 226; x += 3) staticBox('#b99973', x, .44, 116, .12, .06, 15);
  for (let x = 137; x <= 224; x += 14) for (const z of [109, 123]) {
    staticBox('#806f5c', x, -2.4, z, .7, 6.4, .7);
    staticBox('#e5d2aa', x, 1.15, z, .25, 2, .25);
  }
  for (const z of [108.8,123.2]) staticBox('#dbbf92', 179, 1.6, z, 89, .2, .25);
  staticBox('#b58d68', 216, .4, 116, 18, .4, 23);
  staticBox('#4e8e8b', 216, 5.5, 116, 17, .65, 20);
  for (const x of [210,222]) for (const z of [109,123]) staticBox('#ead9b0', x, 2.8, z, .3, 5.3, .3);
  label(scene, 'MIRAGE PIER', 129, 6.5, 116, '#ffe4a9', 18);
  // Beach furniture.
  for (let z = -174; z < 185; z += 27) {
    const umbrella = new THREE.Mesh(new THREE.ConeGeometry(3.1, 1.2, 8), material(z % 2 ? '#d99583' : '#89b7aa'));
    umbrella.position.set(131, 3.6, z); scene.add(umbrella);
    cylinder(scene, '#e0d0a0', 131, 1.6, z, .09, .09, 3.8);
    staticBox('#f3dcc0', 128, .4, z + 3, 1.4, .5, 3.5);
  }
  const palms = new THREE.Group(); scene.add(palms);
  function palm(x, z, height = 9) {
    const trunk = cylinder(palms, '#957f5c', x, height / 2, z, .21, .44, height, 7); trunk.rotation.z = .08;
    const crown = new THREE.Group(); crown.position.set(x - height * .08, height, z); palms.add(crown);
    for (let n = 0; n < 7; n++) {
      const leaf = new THREE.Mesh(new THREE.ConeGeometry(.75, 5.7, 4), material(n % 2 ? '#42796b' : '#568a6c'));
      leaf.position.set(Math.sin(n * .9) * 2, -.1, Math.cos(n * .9) * 2);
      leaf.rotation.set(Math.cos(n * .9) * 1.35, 0, -Math.sin(n * .9) * 1.35); leaf.castShadow = true; crown.add(leaf);
    }
  }
  for (let z = -187; z < 200; z += 25) { if (Math.abs(z - 116) > 12) palm(109, z, 8 + random() * 3); }
  for (const x of [-139,-59,21]) for (let z = -187; z < 200; z += 80) palm(x, z, 7 + random() * 2);
  bakeRigid(palms);
  for (const x of ROAD_X) for (let z = -188; z < 190; z += 80) {
    staticBox('#37525a', x - 11, 3.3, z + 7, .18, 6.6, .18);
    staticBox('#37525a', x - 9.5, 6.5, z + 7, 3.2, .14, .18);
    staticBox('#f3d4a0', x - 8.2, 6.3, z + 7, .7, .2, .5);
  }
  for (const [color, transforms] of batch) {
    const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1), material(color), transforms.length);
    const dummy = new THREE.Object3D();
    transforms.forEach((t,i) => { dummy.position.set(t.x,t.y,t.z); dummy.scale.set(t.w,t.h,t.d); dummy.updateMatrix(); mesh.setMatrixAt(i,dummy.matrix); });
    mesh.castShadow = color !== '#48575a'; mesh.receiveShadow = true; scene.add(mesh);
  }
  const packageModel = new THREE.Group(); packageModel.position.set(208,1.08,116);
  box(packageModel,'#c1a273',0,0,0,1.1,.8,.8); box(packageModel,'#f2dd9f',0,.01,0,.14,.83,.83); scene.add(packageModel);
  const waves = [];
  for (let i=0;i<22;i++) {
    const wave = box(scene,'#bbded0',145 + (i%3)*3,-.35,-205+i*20,1,.035,12,{transparent:true,opacity:.35});
    waves.push(wave);
  }
  function blocked(x,z,radius) {
    if (x < -194 + radius || z < -198 + radius || z > 198 - radius) return true;
    if (x > 139 - radius && !(z > 109 + radius && z < 123 - radius && x < 224 - radius)) return true;
    return solids.some(b => x + radius > b.x - b.w/2 && x - radius < b.x + b.w/2 && z + radius > b.z - b.d/2 && z - radius < b.z + b.d/2);
  }
  function move(position, dx, dz, radius = .5) {
    const steps = Math.max(1, Math.ceil(Math.hypot(dx,dz)/.7)); let hit = false;
    for (let i=0;i<steps;i++) {
      if (!blocked(position.x+dx/steps,position.z,radius)) position.x += dx/steps; else hit = true;
      if (!blocked(position.x,position.z+dz/steps,radius)) position.z += dz/steps; else hit = true;
    }
    return hit;
  }
  return {
    solids, footprints, blocked, move, packageModel,
    heightAt(x,z) {
      if (x > 207 && z > 104 && z < 128) return .6;
      if (x > 137 && z > 108 && z < 124) return .47;
      if (x > 110 && x < 118) return .4;
      return .2;
    },
    district(p) { return p.x > 139 ? 'MIRAGE PIER' : p.x > 99 ? 'VERANO BEACH' : p.z < -95 ? 'NORTH / MOTOR DISTRICT' : p.x < -95 ? 'OLD QUARTER' : 'SUNSET STRIP'; },
    update(time, target) {
      waves.forEach((w,i) => { w.position.x = 144+(i%3)*3+Math.sin(time*.45+i)*1.3; w.material.opacity=.2+Math.sin(time+i)*.06; });
      sun.position.set(target.x-110,200,target.z-170); sun.target.position.set(target.x,0,target.z);
    },
    cameraPosition(p) { return { x: clamp(p.x,-200,230), y: p.y, z: clamp(p.z,-205,205) }; },
  };
}
