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
  scene.background = new THREE.Color('#8fb6c6'); scene.fog = new THREE.Fog('#a7c3c9', 300, 1000);
  // Gradient sky dome: warm horizon melting into a deep zenith. It follows the
  // player (see update) so the horizon never gets closer, and ignores fog.
  const skyGeo = new THREE.SphereGeometry(1150, 24, 12);
  {
    const pos = skyGeo.attributes.position, cols = [];
    const zen = new THREE.Color('#2c6aa0'), mid = new THREE.Color('#79aec8'), hor = new THREE.Color('#f4cd97'), c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const t = Math.max(0, pos.getY(i) / 1150);
      if (t < .18) c.copy(hor).lerp(mid, t / .18); else c.copy(mid).lerp(zen, (t - .18) / .82);
      cols.push(c.r, c.g, c.b);
    }
    skyGeo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
  }
  const sky = new THREE.Mesh(skyGeo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false }));
  sky.renderOrder = -1; sky.frustumCulled = false; scene.add(sky);
  const hemi = new THREE.HemisphereLight('#cfe6ef', '#9a6a4e', 0.5); scene.add(hemi);
  const sun = new THREE.DirectionalLight('#ffc182', 2.55); sun.position.set(-150, 150, -235);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -95, right: 95, top: 95, bottom: -95, near: 1, far: 650 });
  sun.shadow.bias = -.0008; sun.shadow.normalBias = .1; scene.add(sun, sun.target);
  const sunDisc = new THREE.Mesh(new THREE.SphereGeometry(34, 24, 16), new THREE.MeshBasicMaterial({ color: '#ffdca3', fog: false }));
  sunDisc.position.set(-300, 265, -470); scene.add(sunDisc);
  box(scene, '#a79a6d', -34, -.9, 0, 350, 1.8, 420);
  box(scene, '#eac078', 126, -.4, 0, 32, 1, 420);
  const water = new THREE.Mesh(new THREE.PlaneGeometry(1800, 1800), material('#1f7d99', { roughness: .14, metalness: .05 }));
  water.rotation.x = -Math.PI / 2; water.position.set(1025, -.46, 0); scene.add(water);
  box(scene, '#2e6e84', -34, -1.4, -420, 350, .2, 420);
  // Each color is one instanced draw call: windows and lane stripes stay inexpensive.
  for (const x of ROAD_X) {
    staticBox('#bfae87', x, .015, 0, 24, .09, 400);
    staticBox('#3d4c52', x, .08, 0, 17, .12, 400);
    for (let z = -192; z < 197; z += 11) staticBox('#f0bd4a', x, .15, z, .18, .025, 4);
  }
  for (const z of ROAD_Z) {
    staticBox('#bfae87', -30, .025, z, 330, .09, 24);
    staticBox('#3d4c52', -30, .09, z, 330, .12, 17);
    for (let x = -190; x < 111; x += 11) staticBox('#f0bd4a', x, .16, z, 4, .025, .18);
  }
  for (const x of ROAD_X) for (const z of ROAD_Z) {
    staticBox('#3d4c52', x, .17, z, 17, .04, 17);
    for (const side of [-1, 1]) for (let s = -6; s < 7; s += 2.2) {
      staticBox('#e8e6da', x + s, .2, z + side * 11, 1.1, .025, 3.6);
      staticBox('#e8e6da', x + side * 11, .2, z + s, 3.6, .025, 1.1);
    }
  }
  const colors = ['#cf9a62','#e08a6a','#57a99b','#e7c66e','#a8a06b','#cf7355','#6db3a8'];
  for (let ix = 0; ix < 3; ix++) for (let iz = 0; iz < 4; iz++) {
    const cx = ROAD_X[ix] + 40, cz = ROAD_Z[iz] + 40;
    staticBox('#b3a075', cx, .14, cz, 55, .3, 55);
    for (const ox of [-15, 15]) for (const oz of [-15, 15]) {
      // Leave the northwest garage courtyard open for the Aurora mission.
      if (ix === 1 && iz === 0 && ox < 0 && oz < 0) continue;
      const x = cx + ox, z = cz + oz, h = 9 + random() * (ix === 2 ? 23 : 43);
      const w = 19 + random() * 4, d = 18 + random() * 4;
      const col = colors[Math.floor(random() * colors.length)];
      staticBox(col, x, h / 2, z, w, h, d, true);
      staticBox('#e8c491', x, h + .15, z, w + .7, .6, d + .7);
      staticBox('#5f6b62', x + 2, h + .9, z - 2, 5, 1.3, 4);
      for (let y = 3; y < h - 1; y += 3.7) for (let a = -w / 2 + 2; a < w / 2 - 1; a += 4) {
        const windowColor = random() > .2 ? '#2e5a68' : '#ffd98a';
        staticBox(windowColor, x + a, y, z - d / 2 - .04, 1.9, 1.65, .08);
        staticBox(windowColor, x + a, y, z + d / 2 + .04, 1.9, 1.65, .08);
        staticBox('#2e5a68', x - w / 2 - .04, y, z + a * .75, .08, 1.65, 1.7);
        staticBox('#2e5a68', x + w / 2 + .04, y, z + a * .75, .08, 1.65, 1.7);
      }
      if (h < 22) staticBox('#2f7f78', x, 2.6, z + d / 2 + 1.2, w, .3, 2.5);
    }
  }
  // Landmark hotels on the beach boulevard and a low, drivable garage.
  staticBox('#e09a7a', 63, 26, -120, 26, 52, 31, true);
  for (let y = 6; y < 52; y += 5) staticBox('#f0d09a', 63, y, -103.6, 28, .65, 3);
  label(scene, 'HOTEL SOL', 64, 56, -103, '#ffd492', 22);
  staticBox('#d9ac72', -38, 3.5, -130, 17, 7, 32, true);
  label(scene, 'LUNA MOTOR CLUB', -42, 9, -124, '#95edcf', 21);
  staticBox('#9c5f4a', -174, 4, -132, 17, 8, 22, true);
  label(scene, 'DANA’S / EXPORTS', -171, 10, -130, '#ffd596', 20);
  label(scene, 'VERANO BEACH', 118, 9, 42, '#f7d8b5', 20);
  // Waterfront promenade, a wide pier, pilings, lamps and a covered lookout.
  staticBox('#cbb489', 114, .18, 0, 8, .4, 400);
  staticBox('#8a6a4e', 161, .13, 116, 130, .55, 15);
  for (let x = 103; x < 226; x += 3) staticBox('#a67c52', x, .44, 116, .12, .06, 15);
  for (let x = 137; x <= 224; x += 14) for (const z of [109, 123]) {
    staticBox('#6e5942', x, -2.4, z, .7, 6.4, .7);
    staticBox('#e8cc92', x, 1.15, z, .25, 2, .25);
  }
  for (const z of [108.8,123.2]) staticBox('#cfa96e', 179, 1.6, z, 89, .2, .25);
  staticBox('#a67c52', 216, .4, 116, 18, .4, 23);
  staticBox('#2f7f78', 216, 5.5, 116, 17, .65, 20);
  for (const x of [210,222]) for (const z of [109,123]) staticBox('#e8cc92', x, 2.8, z, .3, 5.3, .3);
  label(scene, 'MIRAGE PIER', 129, 6.5, 116, '#ffe4a9', 18);
  // Beach furniture.
  for (let z = -174; z < 185; z += 27) {
    const umbrella = new THREE.Mesh(new THREE.ConeGeometry(3.1, 1.2, 8), material(z % 2 ? '#e07856' : '#3fa08e'));
    umbrella.position.set(131, 3.6, z); scene.add(umbrella);
    cylinder(scene, '#d9bd7f', 131, 1.6, z, .09, .09, 3.8);
    staticBox('#e8c491', 128, .4, z + 3, 1.4, .5, 3.5);
  }
  const palms = new THREE.Group(); scene.add(palms);
  function palm(x, z, height = 9) {
    const trunk = cylinder(palms, '#86683f', x, height / 2, z, .21, .44, height, 7); trunk.rotation.z = .08;
    const crown = new THREE.Group(); crown.position.set(x - height * .08, height, z); palms.add(crown);
    for (let n = 0; n < 7; n++) {
      const leaf = new THREE.Mesh(new THREE.ConeGeometry(.75, 5.7, 4), material(n % 2 ? '#2e7d46' : '#45a05c'));
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
    staticBox('#ffd98a', x - 8.2, 6.3, z + 7, .7, .2, .5);
  }
  for (const [color, transforms] of batch) {
    const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1), material(color), transforms.length);
    const dummy = new THREE.Object3D();
    transforms.forEach((t,i) => { dummy.position.set(t.x,t.y,t.z); dummy.scale.set(t.w,t.h,t.d); dummy.updateMatrix(); mesh.setMatrixAt(i,dummy.matrix); });
    mesh.castShadow = color !== '#3d4c52'; mesh.receiveShadow = true; scene.add(mesh);
  }
  const packageModel = new THREE.Group(); packageModel.position.set(208,1.08,116);
  box(packageModel,'#c1a273',0,0,0,1.1,.8,.8); box(packageModel,'#f2dd9f',0,.01,0,.14,.83,.83); scene.add(packageModel);
  const waves = [];
  for (let i=0;i<22;i++) {
    const wave = box(scene,'#cfe8dd',145 + (i%3)*3,-.35,-205+i*20,1,.035,12,{transparent:true,opacity:.35});
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
      sun.position.set(target.x-150,150,target.z-235); sun.target.position.set(target.x,0,target.z);
      sky.position.set(target.x,0,target.z);
    },
    cameraPosition(p) { return { x: clamp(p.x,-200,230), y: p.y, z: clamp(p.z,-205,205) }; },
  };
}
