import { THREE, box, cylinder, flatDistance, clamp, bakeRigid } from './engine.js';
import { LOCATIONS } from './world.js';
export function carModel(color, sport = false, police = false) {
  const g = new THREE.Group();
  box(g, '#23333b', 0,.48,0,1.9,.28,4.25);
  box(g, color, 0,.83,0,2,.65,4.1);
  box(g, color, 0,1.06,1.34,1.94,.22,1.28);
  box(g, '#345866', 0,1.37,-.18,1.64,.66,1.86,{metalness:.3,roughness:.25});
  box(g, color, 0,1.73,-.28,1.72,.14,1.5);
  box(g, color, 0,1.37,.68,.1,.7,.12);
  for (const side of [-1,1]) {
    box(g,color,side*.84,1.35,-.93,.1,.72,.12);
    box(g,color,side*.84,1.35,.65,.1,.72,.12);
    box(g,'#ffe3ad',side*.64,.87,2.065,.46,.21,.05,{emissive:'#f4d39a',emissiveIntensity:.45});
    box(g,'#ee6871',side*.7,.85,-2.065,.38,.2,.05,{emissive:'#e25469',emissiveIntensity:.25});
    box(g,'#abbdb6',side*.45,.67,2.09,.35,.1,.06);
    box(g,'#d1d2b6',side*1.09,1.3,.45,.22,.12,.3);
  }
  const wheels = [];
  for (const x of [-1.02,1.02]) for (const z of [-1.32,1.3]) {
    const wheel = cylinder(g,'#233139',x,.46,z,.43,.43,.25,12); wheel.rotation.z = Math.PI/2;
    const hub = cylinder(g,'#bdc5bd',x*1.012,.46,z,.23,.23,.27,8); hub.rotation.z=Math.PI/2; wheels.push(wheel);
  }
  if(sport) {
    box(g,'#183e45',0,1.12,-1.75,1.9,.13,.45);
    for(const x of [-.65,.65]) box(g,'#203c43',x,1.02,-1.75,.1,.25,.14);
    box(g,'#fff2ce',0,1.18,1.34,.22,.02,1.27);
    g.scale.y=.85;
  }
  const lights=[];
  if(police) {
    box(g,'#f0ead9',0,.96,0,2.02,.35,1.6);
    box(g,'#24343a',0,1.84,-.2,1.4,.12,.4);
    for(const x of [-.4,.4]) lights.push(box(g,x<0?'#ef5c77':'#72cfee',x,1.98,-.2,.5,.2,.35,{emissive:x<0?'#ff174c':'#008eff',emissiveIntensity:1}));
  }
  // Bake before the sport-car root scale, retaining separate flashing light meshes.
  const scaleY = g.scale.y; g.scale.y = 1; bakeRigid(g, lights); g.scale.y = scaleY;
  g.userData = { lights }; return g;
}
export function createVehicles(scene,world) {
  const list = [];
  function add(x,z,yaw,color,name,sport=false,kind='parked') {
    const mesh=carModel(color,sport,kind==='police'); mesh.position.set(x,.22,z); mesh.rotation.y=yaw; scene.add(mesh);
    const v={mesh,position:mesh.position,yaw,speed:0,name,sport,kind,occupied:false,hp:100,stun:0}; list.push(v); return v;
  }
  const aurora=add(LOCATIONS.aurora.x,LOCATIONS.aurora.z,Math.PI,'#e99b80','AURORA GT',true);
  const parked=[
    [99,98,Math.PI,'#89b8ae','MARINA SEDAN'],[82,63,0,'#e4cb91','PALOMA COUPE'],
    [0,99,Math.PI/2,'#779ca6','COASTLINE WAGON'],[-79,-28,0,'#c9a2a3','MISTRAL'],
    [-142,-112,Math.PI,'#bfd0ba','MARINA SEDAN'],[19,-95,Math.PI,'#d5b67f','PALOMA COUPE'],
    [-118,179,Math.PI/2,'#9fadb8','COASTLINE WAGON'],[80,-170,0,'#b9877f','MISTRAL'],
  ];
  parked.forEach(args=>add(...args));
  function nearest(position) {
    let found=null, distance=4.3;
    for(const v of list) if(v.kind!=='police'&&!v.occupied&&Math.abs(v.speed)<3&&v.hp>0) {
      const d=flatDistance(position,v.position); if(d<distance){distance=d;found=v;}
    }
    return found;
  }
  function drive(v,input,dt,player) {
    const throttle=input.axis(['KeyW','ArrowUp'],['KeyS','ArrowDown']);
    const steer=input.axis(['KeyD','ArrowRight'],['KeyA','ArrowLeft']);
    const brake=input.held('Space');
    v.speed+=throttle*(v.sport?23:17)*dt;
    v.speed*=Math.exp(-(brake ? 3.2 : throttle ? .2 : .8)*dt);
    v.speed=clamp(v.speed,-13,v.sport?48:35);
    v.yaw-=steer*1.8*clamp(v.speed/12,-1,1)*dt*(brake?1.7:1);
    const before=Math.abs(v.speed);
    const hit=world.move(v.position,Math.sin(v.yaw)*v.speed*dt,Math.cos(v.yaw)*v.speed*dt,1.35);
    if(hit){v.speed*=-.22;if(before>12){v.hp=Math.max(1,v.hp-before*.13);player.damage(before*.09);}}
    for(const other of list) {
      if(other===v||flatDistance(v.position,other.position)>3.2) continue;
      const d=new THREE.Vector3().subVectors(v.position,other.position).setY(0).normalize();
      world.move(v.position,d.x*.5,d.z*.5,1.35); other.stun=.8;
      if(before>6){v.speed*=-.2; player.damage(before*.08); if(other.kind==='police') player.onCrime?.(1);}
    }
    v.mesh.rotation.y=v.yaw; v.mesh.rotation.z=steer*clamp(v.speed/40,-1,1)*.035;
  }
  function update(dt) {
    for(const v of list) {
      v.position.y=world.heightAt(v.position.x,v.position.z)+.02;
      v.stun=Math.max(0,v.stun-dt);
      if(!v.occupied&&v.kind==='parked')v.speed*=Math.exp(-dt*4);
    }
  }
  function reset() {
    aurora.position.set(LOCATIONS.aurora.x,.22,LOCATIONS.aurora.z); aurora.yaw=Math.PI; aurora.mesh.rotation.set(0,Math.PI,0); aurora.speed=0; aurora.hp=100;
    for(const v of list) {v.occupied=false; v.stun=0;}
  }
  return { list,aurora,add,nearest,drive,update,reset };
}
