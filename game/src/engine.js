// The only rendering dependency is the local three.js r149 classic build.
export const THREE = globalThis.THREE;
export const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
export const flatDistance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
export const angleDelta = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
const materials = new Map();
const cube = new THREE.BoxGeometry(1, 1, 1);
export function material(color, options = {}) {
  const key = color + JSON.stringify(options);
  if (!materials.has(key)) materials.set(key, new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...options }));
  return materials.get(key);
}
export function box(parent, color, x, y, z, w, h, d, options) {
  const mesh = new THREE.Mesh(cube, material(color, options));
  mesh.position.set(x, y, z); mesh.scale.set(w, h, d);
  mesh.castShadow = h > 1; mesh.receiveShadow = true; parent.add(mesh);
  return mesh;
}
export function cylinder(parent, color, x, y, z, top, bottom, height, sides = 8) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(top, bottom, height, sides), material(color));
  mesh.position.set(x, y, z); mesh.castShadow = true; parent.add(mesh); return mesh;
}
export function label(parent, text, x, y, z, color = '#fff2d3', scale = 12, background = '#163e46') {
  const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 128;
  const c = canvas.getContext('2d');
  c.fillStyle = background; c.fillRect(0, 0, 512, 128);
  c.strokeStyle = color; c.lineWidth = 4; c.strokeRect(9, 9, 494, 110);
  c.fillStyle = color; c.font = 'bold 44px Arial'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(text, 256, 65, 470);
  const texture = new THREE.CanvasTexture(canvas); texture.encoding = THREE.sRGBEncoding;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, depthWrite: false }));
  sprite.position.set(x, y, z); sprite.scale.set(scale, scale / 4, 1); parent.add(sprite); return sprite;
}
export function person(shirt = '#f3d9ab', pants = '#223947', skin = '#b47752') {
  const group = new THREE.Group();
  box(group, shirt, 0, 1.16, 0, .68, .78, .4);
  const head = new THREE.Mesh(new THREE.SphereGeometry(.24, 8, 6), material(skin)); head.position.set(0, 1.85, 0); group.add(head);
  box(group, '#24222a', 0, 2.02, .015, .44, .14, .4);
  const legs = [], arms = [];
  for (const side of [-1, 1]) {
    const leg = new THREE.Group(); leg.position.set(side * .19, .82, 0);
    box(leg, pants, 0, -.36, 0, .25, .73, .29); box(leg, '#f1ead4', 0, -.74, -.08, .29, .14, .46); group.add(leg); legs.push(leg);
    const arm = new THREE.Group(); arm.position.set(side * .46, 1.48, 0);
    box(arm, shirt, 0, -.17, 0, .24, .38, .3); box(arm, skin, 0, -.49, 0, .19, .34, .23); group.add(arm); arms.push(arm);
  }
  group.userData = { legs, arms }; return group;
}
export function animatePerson(model, phase, moving) {
  const { legs, arms } = model.userData;
  for (let i = 0; i < 2; i++) {
    const swing = moving ? Math.sin(phase + i * Math.PI) * .65 : 0;
    legs[i].rotation.x = swing; arms[i].rotation.x = -swing * .7;
  }
}

// Consolidate rigid geometry by material. A car then costs a handful of draw calls
// rather than one per body panel, wheel and lamp. Animated characters stay separate.
export function bakeRigid(group, excluded = []) {
  group.updateMatrixWorld(true);
  const batches = new Map(), originals = [];
  group.traverse(mesh => {
    if (!mesh.isMesh || excluded.includes(mesh) || Array.isArray(mesh.material)) return;
    const geometry = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone();
    geometry.applyMatrix4(mesh.matrixWorld);
    if (!batches.has(mesh.material)) batches.set(mesh.material, []);
    batches.get(mesh.material).push(geometry); originals.push(mesh);
  });
  for (const mesh of originals) mesh.removeFromParent();
  for (const [mat, geometries] of batches) {
    const result = new THREE.BufferGeometry();
    for (const name of ['position', 'normal', 'uv']) {
      const arrays = geometries.map(g => g.getAttribute(name));
      if (arrays.some(a => !a)) continue;
      const combined = new Float32Array(arrays.reduce((n, a) => n + a.array.length, 0));
      let offset = 0;
      for (const a of arrays) { combined.set(a.array, offset); offset += a.array.length; }
      result.setAttribute(name, new THREE.BufferAttribute(combined, arrays[0].itemSize));
    }
    const mesh = new THREE.Mesh(result, mat); mesh.castShadow = true; mesh.receiveShadow = true; group.add(mesh);
    geometries.forEach(g => g.dispose());
  }
}
