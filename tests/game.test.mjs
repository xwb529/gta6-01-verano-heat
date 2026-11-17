// Headless simulation tests use the actual vendored three.js math and scene graph.
// The canvas stub is only for procedurally generated sign textures; no images are captured.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import vm from 'node:vm';
import { resolve, dirname } from 'node:path';

vm.runInThisContext(readFileSync(new URL('../game/vendor/three.min.js', import.meta.url), 'utf8'));
const context=new Proxy({}, { get:()=>()=>{} ,set:()=>true });
globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>context})};
const store=new Map();
globalThis.localStorage={getItem:key=>store.get(key)??null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)};
const {THREE,flatDistance}=await import('../game/src/engine.js');
const {createWorld,LOCATIONS}=await import('../game/src/world.js');
const {createVehicles}=await import('../game/src/vehicles.js');
const {createPlayer}=await import('../game/src/player.js');
const {createTraffic}=await import('../game/src/traffic.js');
const {createPolice}=await import('../game/src/police.js');
const {createMissions}=await import('../game/src/missions.js');
const {createCombat}=await import('../game/src/combat.js');
const {loadSave,saveProgress}=await import('../game/src/save.js');
function input(keys=[],fire=false){return {held:k=>keys.includes(k),axis:(p,n)=>Number(p.some(k=>keys.includes(k)))-Number(n.some(k=>keys.includes(k))),look:()=>({x:0,y:0}),fire:()=>fire};}
function setup(saved=null){
 const scene=new THREE.Scene(),world=createWorld(scene),vehicles=createVehicles(scene,world),player=createPlayer(scene,world,vehicles);
 const traffic=createTraffic(scene,world,vehicles),police=createPolice(scene,world,vehicles);
 const messages=[],hud={toast:m=>messages.push(m),say:m=>messages.push(m),saveStatus:()=>{}},audio={success(){},shot(){}};
 let complete=false;
 player.money=saved?.money??250;
 const missions=createMissions(scene,world,player,vehicles,police,hud,audio,saved,()=>{complete=true;});
 return {scene,world,vehicles,player,traffic,police,missions,messages,audio,get complete(){return complete;}};
}
const g=setup();

test('city is a real 3D scene, with navigable objectives and solid buildings',()=>{
 assert.equal(THREE.REVISION,'149');assert.ok(g.scene.children.length>100);
 assert.ok(g.world.solids.length>40);
 for(const [name,p] of Object.entries(LOCATIONS))assert.equal(g.world.blocked(p.x,p.z,.5),false,name);
 for(const p of [LOCATIONS.aurora,LOCATIONS.finish,LOCATIONS.delivery])assert.equal(g.world.blocked(p.x,p.z,1.35),false);
 const b=g.world.solids[0];assert.equal(g.world.blocked(b.x,b.z,.5),true);
 const p=new THREE.Vector3(135,0,40);g.world.move(p,90,0,.5);assert.ok(p.x<139,'cannot walk into ocean');
 const q=new THREE.Vector3(135,0,116);g.world.move(q,72,0,1.35);assert.ok(q.x>205,'pier can be driven end to end');
 assert.equal(g.traffic.pedestrians.length,36);assert.equal(g.traffic.cars.length,10);
});

test('a connected drivable route exists between every mission destination',()=>{
 // Flood a one-metre navigation grid. This checks the actual collision function,
 // including the Aurora courtyard and the entrance from the boulevard to the pier.
 const targets=[LOCATIONS.spawn,LOCATIONS.delivery,LOCATIONS.aurora,LOCATIONS.finish];
 const key=(x,z)=>`${x},${z}`;
 const start={x:Math.round(targets[0].x),z:Math.round(targets[0].z)};
 const queue=[start],visited=new Set([key(start.x,start.z)]);
 for(let i=0;i<queue.length;i++){
  const p=queue[i];
  for(const [dx,dz] of [[2,0],[-2,0],[0,2],[0,-2]]){
   const x=p.x+dx,z=p.z+dz,k=key(x,z);
   if(visited.has(k)||g.world.blocked(x,z,1.35)||g.world.blocked(x-dx/2,z-dz/2,1.35))continue;
   visited.add(k);queue.push({x,z});
  }
 }
 for(const t of targets)assert.ok(queue.some(p=>Math.hypot(p.x-t.x,p.z-t.z)<3),JSON.stringify(t));
});

test('walking is camera-relative, sprint is faster, collisions preserve bounds',()=>{
 const p=g.player;p.reset({x:90,z:40});p.cameraYaw=0;
 const before=p.position.clone();for(let i=0;i<60;i++)p.update(1/60,input(['KeyW']));
 const walk=flatDistance(before,p.position);assert.ok(walk>5.5&&walk<6.5);
 p.reset({x:90,z:40});p.cameraYaw=0;for(let i=0;i<60;i++)p.update(1/60,input(['KeyW','ShiftLeft']));
 assert.ok(flatDistance(before,p.position)>walk*1.5);
});

test('vehicle enter, acceleration, handbrake, stopped exit and moving-exit guard',()=>{
 const {player:p,vehicles:v}=g;const car=v.list[1];car.position.set(90,.22,40);car.yaw=0;car.speed=0;p.reset({x:93,z:40});
 assert.equal(v.nearest(p.position),car);p.enter(car);
 assert.equal(car.occupied,true);assert.equal(p.mesh.visible,false);
 for(let i=0;i<100;i++)p.update(1/60,input(['KeyW']));
 assert.ok(car.speed>10);assert.equal(p.exit(),false);
 for(let i=0;i<150;i++)p.update(1/60,input(['Space']));
 assert.ok(Math.abs(car.speed)<1);assert.equal(p.exit(),true);assert.equal(p.mesh.visible,true);
});

test('complete four-mission chain, enforce Aurora and wanted checks, save completion',()=>{
 const {missions:m,player:p,vehicles:v,police}=g;
 p.reset(LOCATIONS.dana);assert.equal(m.interact(),true);assert.equal(m.stage,1);
 p.reset(LOCATIONS.package);m.interact();assert.equal(m.stage,2);assert.equal(police.stars,2);assert.equal(p.money,750);
 p.position.set(LOCATIONS.delivery.x,.22,LOCATIONS.delivery.z);m.interact();assert.equal(m.stage,3);assert.equal(police.stars,0);
 p.enter(v.aurora);m.onEnter(v.aurora);assert.equal(m.stage,4);assert.equal(police.stars,3);
 p.position.set(208,.22,116);v.aurora.position.copy(p.position);v.aurora.speed=0;
 m.interact();assert.equal(m.stage,4,'pursuit blocks handover');
 police.clear();p.exit(true);p.position.set(208,.22,116);m.interact();assert.equal(m.stage,4,'wrong vehicle blocks handover');
 p.enter(v.list[1]);p.position.set(208,.22,116);m.interact();assert.equal(m.stage,4);
 p.exit(true);p.enter(v.aurora);p.position.set(208,.22,116);v.aurora.speed=8;m.interact();assert.equal(m.stage,4,'must stop');
 v.aurora.speed=0;m.interact();assert.equal(m.stage,5);assert.equal(g.complete,true);assert.equal(p.money,4500);
 assert.deepEqual(loadSave(),{stage:5,money:4500});
});

test('checkpoint restore preserves the required getaway car and resets damage',()=>{
 const state=setup({stage:4,money:2500});const {missions:m,player:p,vehicles:v,police}=state;
 assert.equal(p.vehicle,v.aurora);assert.equal(police.stars,3);
 v.aurora.position.set(180,.22,116);p.health=3;m.restore();
 assert.equal(p.health,100);assert.equal(p.vehicle,v.aurora);assert.equal(p.position.x,LOCATIONS.aurora.x);
 assert.equal(p.money,2500);
 for(let stage=0;stage<=5;stage++){
  const h=setup({stage,money:250});assert.equal(h.world.blocked(h.player.position.x,h.player.position.z,.5),false,`checkpoint ${stage}`);
 }
});

test('police pursue, buildings occlude sight, and wanted levels eventually clear',()=>{
 const {police,player,world}=g;police.reset();player.exit(true);player.reset({x:90,z:40});
 police.crime(2,true);const unit=police.units[0];unit.car.position.set(90,.22,5);
 const d=flatDistance(unit.car.position,player.position);
 for(let i=0;i<400;i++)police.update(1/60,i/60,player);
 assert.ok(flatDistance(unit.car.position,player.position)<d,'police closes distance');
 const b=world.solids[5];assert.equal(police.hasSight({x:b.x-b.w,z:b.z},{x:b.x+b.w,z:b.z}),false);
 player.position.set(216,.22,116);
 for(const u of police.units){u.car.position.set(-190,.22,-190);u.car.stun=1000;}
 for(let i=0;i<4800;i++)police.update(1/60,i/60,player);
 assert.equal(police.stars,0);
});

test('on-foot shooting creates traces, alerts police and panics pedestrians',()=>{
 const {scene,world,police,traffic,vehicles,player,audio}=g;player.exit(true);player.reset({x:90,z:40});police.reset();
 const camera=new THREE.PerspectiveCamera();camera.position.set(90,5,30);camera.lookAt(90,1,70);camera.updateMatrixWorld();
 const combat=createCombat(scene,world,police,traffic,vehicles,audio);const before=scene.children.length;
 combat.update(1/60,input([],true),player,camera);
 assert.equal(police.stars,1);assert.ok(player.aimTimer>0);assert.ok(scene.children.length>before);
 combat.update(1,input(),player,camera);assert.equal(scene.children.length,before);
});

test('traffic and pedestrians update without corrupting position or entering buildings',()=>{
 g.player.reset({x:105,z:90});
 for(let frame=0;frame<900;frame++)g.traffic.update(1/60,frame/60,g.player,()=>{});
 for(const v of g.vehicles.list)assert.ok(Number.isFinite(v.position.x)&&Number.isFinite(v.position.z));
 for(const p of g.traffic.pedestrians)assert.ok(Number.isFinite(p.mesh.position.x));
});

test('save validation rejects corruption and storage failure is nonfatal',()=>{
 store.clear();assert.equal(loadSave(),null);
 assert.equal(saveProgress(2,750),true);assert.deepEqual(loadSave(),{stage:2,money:750});
 for(const value of ['{','null','{"version":1,"stage":-1,"money":50}','{"version":1,"stage":2,"money":"bad"}']){store.set('verano-heat.story.v1',value);assert.equal(loadSave(),null);}
 const storage=globalThis.localStorage;globalThis.localStorage={getItem(){throw Error('disabled');},setItem(){throw Error('disabled');}};
 assert.equal(loadSave(),null);assert.equal(saveProgress(1,250),false);globalThis.localStorage=storage;
});

test('all game references resolve locally and no remote service is used',()=>{
 const root=resolve('game');const files=[];function walk(dir){for(const entry of readdirSync(dir,{withFileTypes:true})){const p=resolve(dir,entry.name);entry.isDirectory()?walk(p):files.push(p);}}walk(root);
 for(const file of files.filter(p=>!p.includes('/vendor/')&&/\.(js|html|css)$/.test(p))){
  const text=readFileSync(file,'utf8');
  assert.doesNotMatch(text,/https?:\/\//,file);
  for(const m of text.matchAll(/(?:from\s*|(?:src|href)=)["'](\.\.?\/[^"']+)["']/g))assert.ok(existsSync(resolve(dirname(file),m[1])),`${file}: ${m[1]}`);
 }
});

test('main loop boots, updates the HUD, responds to controls and recovers checkpoints',async()=>{
 // Exercise the complete app with a DOM adapter and a renderer boundary stub.
 // Restricted process/socket permissions prevent launching Chromium in this workspace.
 class Element {
  constructor(id=''){this.id=id;this.hidden=['hud','pause','ending','error','new-game','speed-box'].includes(id);this.style={};this.textContent='';this.listeners={};this.firstChild={textContent:''};this.children=[];this.classList={toggle(){},add(){},remove(){}};}
  addEventListener(type,fn){(this.listeners[type]??=[]).push(fn);}
  click(){for(const fn of this.listeners.click??[])fn({});}
  setAttribute(){} append(...items){this.children.push(...items);} replaceChildren(){this.children=[];}
  getContext(){return context;} querySelectorAll(){return [new Element(),new Element(),new Element(),new Element()];}
 }
 const elements=new Map(),get=id=>{if(!elements.has(id))elements.set(id,new Element(id));return elements.get(id);};
 const windowListeners={};
 globalThis.window=globalThis;
 globalThis.innerWidth=1440;globalThis.innerHeight=900;globalThis.devicePixelRatio=1;
 globalThis.addEventListener=(type,fn)=>(windowListeners[type]??=[]).push(fn);
 globalThis.document={getElementById:get,createElement:()=>new Element(),createTextNode:t=>t,body:new Element(),addEventListener(){},hidden:false,pointerLockElement:null};
 globalThis.location={pathname:'/',href:'',reload(){}};
 let frame;
 globalThis.requestAnimationFrame=fn=>{frame=fn;};
 const RealRenderer=THREE.WebGLRenderer;
 THREE.WebGLRenderer=class{constructor(){this.shadowMap={};this.info={render:{calls:0}};}setPixelRatio(){}setSize(){}render(){}};
 store.clear();
 try{
  await import('../game/src/main.js');
  assert.equal(get('error').hidden,true,'app boots without error overlay');
  assert.equal(globalThis.verano.getStatus().mode,'menu');
  get('start').click();assert.equal(globalThis.verano.getStatus().mode,'play');
  let now=performance.now();for(let i=0;i<20;i++)frame(now+=1000/60);
  assert.equal(get('mission-title').textContent,'An old friend');
  assert.equal(get('health-value').textContent,100);
  function key(type,code){for(const fn of windowListeners[type]??[])fn({code,repeat:false,preventDefault(){}});}
  const before=globalThis.verano.getStatus().position;
  key('keydown','KeyW');for(let i=0;i<40;i++)frame(now+=1000/60);key('keyup','KeyW');
  const after=globalThis.verano.getStatus().position;assert.ok(Math.hypot(after.x-before.x,after.z-before.z)>3);
  key('keydown','KeyP');frame(now+=17);key('keyup','KeyP');assert.equal(globalThis.verano.getStatus().mode,'pause');assert.equal(get('pause').hidden,false);
  get('resume').click();assert.equal(globalThis.verano.getStatus().mode,'play');
  key('keydown','KeyF');for(let i=0;i<10;i++)frame(now+=17);key('keyup','KeyF');assert.ok(globalThis.verano.getStatus().wanted>=1);
  key('keydown','KeyR');frame(now+=17);key('keyup','KeyR');assert.equal(globalThis.verano.getStatus().health,100);
  assert.deepEqual(globalThis.verano.getStatus().position,LOCATIONS.spawn);
 }finally{THREE.WebGLRenderer=RealRenderer;}
});
