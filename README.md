# VERANO HEAT

An original, offline third-person open-world browser game set in **Verano Bay**. Play as Rio, meet Dana, and complete four connected jobs: collect a package at Mirage Pier, deliver it across the city under police pressure, steal the Aurora GT, and lose your tail before returning to the pier. Completing the story unlocks continued free roaming.

## Play

Run `node serve.ts` and open `http://localhost:8080`. The complete game lives in `game/`: plain HTML, CSS, ES modules and the already-vendored **three.js r149**. No package install, build step, remote assets, analytics or network services. A local static server is needed for browser ES module loading; no internet connection is needed. Desktop keyboard and mouse; WebGL required.

- **WASD / arrow keys:** move relative to the camera on foot; accelerate, reverse and steer in a car.
- **Mouse:** look around after clicking the game. Dragging works when pointer lock is unavailable.
- **Shift:** sprint on foot. **Space:** handbrake in a car.
- **E:** talk, collect, deliver, enter or exit a car. Stop before exiting or delivering.
- **Click / F:** shoot on foot. Shooting, stealing and collisions can attract police.
- **P / Escape:** pause. Click Resume or press P again to continue.
- **R:** recover the current story checkpoint, including the Aurora during its getaway.

Follow gold world markers and the gold minimap diamond. The minimap shows the whole city, with Rio in pink, cars in cyan, the Aurora in coral, and pursuing police in red. Stars decay one at a time while out of police sight. Buildings block line of sight. The final handover requires the Aurora, a clear wanted level, a stopped car, and E at the end of the pier.

Mission progress and money save in localStorage at each checkpoint. Reloading restores a safe position and any vehicle/pursuit required for that chapter. Storage failure is handled gracefully with a session-only notice. Being caught costs $100 and restores the checkpoint; the R recovery option is free. “Start a new story” clears the local checkpoint. Saving does not attempt to preserve arbitrary vehicle positions.

## Source map

`main.js` owns boot, fixed-step simulation and camera; `world.js` builds instanced coastal geometry and collision; `player.js`, `vehicles.js`, `traffic.js` and `police.js` implement movement and AI; `missions.js` owns story checkpoints; `combat.js` handles shooting; `hud.js`, `input.js`, `audio.js` and `save.js` keep presentation, controls, synthesized sounds and persistence separate. All artwork is procedural geometry or locally drawn canvas textures. No third-party game assets or character names.

## Validate and package locally

```sh
find game -name '*.js' -exec node --check {} \;
node tests/game.test.mjs
MAKEFUN_OUTPUT_DIR=.local-output node main.ts
```

The last command rebuilds `dossier.json` in the repo and the local packaging tree; it does not submit or publish anything. `MAKEFUN_OUTPUT_DIR` can instead point at another writable local directory (the competition default is `/output`). The images in `screenshots/` are real, unedited renders of the shipped game, captured from the current build: `1-cover.jpg` (cover: Rio speeding north in the Aurora GT as a police car cuts across), `2-mission.jpg` (Rio meeting Dana on the beach), `3-combat.jpg` (a three-star police chase) and `4-steal.jpg` (Rio about to enter the Aurora GT at Luna Motor Club). `shots.json` has no automatic capture instructions.

The simulation suite uses the real vendored three.js scene graph and math to exercise the full mission chain, traversable driving routes, checkpoint recovery, car controls, shooting, police sight and escape, traffic, save validation, and the application loop/HUD. Its DOM and renderer adapters do not verify WebGL output. Browser rendering still needs a manual smoke test on a machine where the browser and local server can launch.
