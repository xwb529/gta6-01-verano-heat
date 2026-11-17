export function createInput(canvas) {
  const held = new Set(), pressed = new Set();
  let dx = 0, dy = 0, dragging = false, enabled = false, firing = false;
  const gameKeys = new Set(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','ShiftLeft','ShiftRight','KeyE','KeyF','KeyR','KeyP','Escape','Enter']);
  function clear() { held.clear(); pressed.clear(); firing = false; dragging = false; dx = 0; dy = 0; }
  window.addEventListener('keydown', e => {
    if (!gameKeys.has(e.code)) return;
    if (!e.repeat) pressed.add(e.code);
    held.add(e.code); if (enabled) e.preventDefault();
  });
  window.addEventListener('keyup', e => held.delete(e.code));
  window.addEventListener('blur', clear);
  canvas.addEventListener('pointerdown', e => {
    if (!enabled) return;
    dragging = true; if (e.button === 0) firing = true;
    if (document.pointerLockElement !== canvas) {
      try { const p = canvas.requestPointerLock?.(); p?.catch?.(() => {}); } catch { /* Drag-to-look is always available. */ }
    }
  });
  window.addEventListener('pointerup', () => { dragging = false; firing = false; });
  window.addEventListener('pointermove', e => {
    if (enabled && (document.pointerLockElement === canvas || dragging)) { dx += e.movementX || 0; dy += e.movementY || 0; }
  });
  canvas.addEventListener('contextmenu', e => e.preventDefault());
  return {
    held: code => held.has(code),
    axis: (positive, negative) => Number(positive.some(k => held.has(k))) - Number(negative.some(k => held.has(k))),
    take(code) { const value = pressed.has(code); pressed.delete(code); return value; },
    look() { const value = { x: dx, y: dy }; dx = 0; dy = 0; return value; },
    fire: () => firing || held.has('KeyF'),
    setEnabled(value) { enabled = value; clear(); if (!value && document.pointerLockElement) document.exitPointerLock?.(); },
    endFrame() { pressed.clear(); },
  };
}
