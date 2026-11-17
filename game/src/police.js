import { THREE, flatDistance, clamp, angleDelta } from './engine.js';
import { ROAD_X, ROAD_Z } from './world.js';
const closest=(value,values)=>values.reduce((a,b)=>Math.abs(a-value)<Math.abs(b-value)?a:b);
export function createPolice(scene,world,vehicles) {
  const units=[];
  const starts=[[-150,10],[10,-150],[-70,170],[90,-70]];
  for(const [x,z] of starts){
    const car=vehicles.add(x+3.5,z,0,'#293c47','BAY PATROL',false,'police');
    units.push({car,spawn:{x:x+3.5,z},path:[],repath:0,hitTimer:0});
  }
  let stars=0,unseen=0,grace=0,crimeCooldown=0;
  function crime(amount=1,force=false){
    if(crimeCooldown>0&&!force)return;
    stars=clamp(Math.max(stars,amount)+(force?0:stars?1:0),1,5);unseen=0;crimeCooldown=2;
  }
  function hasSight(a,b){
    const n=Math.ceil(flatDistance(a,b)/4);
    for(let i=1;i<n;i++){const t=i/n;if(world.solids.some(s=>Math.abs(a.x+(b.x-a.x)*t-s.x)<s.w/2&&Math.abs(a.z+(b.z-a.z)*t-s.z)<s.d/2))return false;}
    return true;
  }
  // Road graph routing avoids the buildings that a straight-line pursuer would get stuck in.
  function route(a,b){
    const ax=closest(a.x,ROAD_X),az=closest(a.z,ROAD_Z),bx=closest(b.x,ROAD_X),bz=closest(b.z,ROAD_Z);
    const path=[];
    if(Math.abs(a.x-ax)<Math.abs(a.z-az))path.push({x:ax,z:a.z},{x:ax,z:az});
    else path.push({x:a.x,z:az},{x:ax,z:az});
    path.push({x:ax,z:bz},{x:bx,z:bz});
    if(Math.abs(b.x-bx)<Math.abs(b.z-bz))path.push({x:bx,z:b.z});else path.push({x:b.x,z:bz});
    return path;
  }
  function update(dt,time,player) {
    crimeCooldown=Math.max(0,crimeCooldown-dt);grace=Math.max(0,grace-dt);
    let seen=false;
    for(let i=0;i<units.length;i++){
      const u=units[i],v=u.car;u.hitTimer=Math.max(0,u.hitTimer-dt);u.repath-=dt;
      v.mesh.userData.lights.forEach((l,j)=>{l.visible=stars>0&&(Math.floor(time*8+j)%2===0);});
      const distance=flatDistance(v.position,player.position),active=stars>0&&i<Math.min(stars+1,4)&&grace<=0;
      const sight=active&&distance<65&&hasSight(v.position,player.position);
      if(sight)seen=true;
      if(!active){v.speed=0;continue;}
      if(v.stun>0){v.speed=0;continue;}
      if(u.repath<=0){u.path=route(v.position,player.position);u.repath=1.5;}
      let target=u.path[0];
      if(sight&&distance<35)target=player.position;
      else if(target&&flatDistance(v.position,target)<3){u.path.shift();target=u.path[0];}
      if(!target)target=player.position;
      const heading=Math.atan2(target.x-v.position.x,target.z-v.position.z);
      v.yaw+=clamp(angleDelta(heading,v.yaw),-dt*2.9,dt*2.9);v.mesh.rotation.y=v.yaw;
      v.speed=distance<3?2:(player.vehicle?17+stars*2.4:9+stars*.8);
      if(world.move(v.position,Math.sin(v.yaw)*v.speed*dt,Math.cos(v.yaw)*v.speed*dt,1.3)){
        v.yaw+=dt*4;u.repath=0;
      }
      if(distance<4&&u.hitTimer<=0){player.damage(player.vehicle?7:12);u.hitTimer=1.5;if(player.vehicle)player.vehicle.speed*=.6;}
    }
    if(stars>0){unseen=seen?0:unseen+dt;if(unseen>12+stars*2){stars--;unseen=stars?5:0;}}
  }
  function reset(){stars=0;unseen=0;grace=4;crimeCooldown=0;for(const u of units){u.car.position.set(u.spawn.x,.22,u.spawn.z);u.car.speed=0;u.car.hp=100;u.car.stun=0;u.path=[];u.repath=0;}}
  return {units,crime,update,reset,hasSight,get stars(){return stars;},get searching(){return stars>0&&unseen>1;},get escapeProgress(){return stars?unseen/(12+stars*2):0;},clear(){stars=0;unseen=0;}};
}
