import { THREE } from './engine.js';
export function createCombat(scene,world,police,traffic,vehicles,audio) {
  const direction=new THREE.Vector3(),tracers=[];
  let cooldown=0;
  const flash=new THREE.PointLight('#ffce81',0,7);scene.add(flash);
  function update(dt,input,player,camera){
    cooldown-=dt;flash.intensity*=Math.exp(-dt*30);
    for(let i=tracers.length-1;i>=0;i--){const t=tracers[i];t.life-=dt;if(t.life<=0){scene.remove(t.line);t.line.geometry.dispose();t.line.material.dispose();tracers.splice(i,1);}}
    if(!input.fire()||player.vehicle||cooldown>0)return;
    cooldown=.28;player.aimTimer=.8;police.crime(1);traffic.panic(player.position);audio.shot();
    camera.getWorldDirection(direction);direction.y=0;direction.normalize();
    const start=player.position.clone().add(new THREE.Vector3(0,1.3,0));
    const end=start.clone().addScaledVector(direction,95);
    // World geometry blocks hits and traces; use the same colliders as movement.
    let wallDistance=95;
    for(let n=1;n<95;n+=1){const x=start.x+direction.x*n,z=start.z+direction.z*n;if(world.solids.some(b=>Math.abs(x-b.x)<b.w/2&&Math.abs(z-b.z)<b.d/2)){wallDistance=n;break;}}
    const targets=[...vehicles.list.map(v=>({position:v.position,vehicle:v})),...traffic.pedestrians.map(p=>({position:p.mesh.position,ped:p}))];
    let closest=wallDistance,hit=null;
    for(const t of targets){const dx=t.position.x-start.x,dz=t.position.z-start.z,along=dx*direction.x+dz*direction.z;
      if(along<=0||along>=closest)continue;
      if(Math.hypot(dx-direction.x*along,dz-direction.z*along)<(t.vehicle?1.6:.8)){closest=along;hit=t;}}
    end.copy(start).addScaledVector(direction,closest);
    if(hit?.vehicle){const v=hit.vehicle;v.hp=Math.max(1,v.hp-24);v.stun=2;if(v.kind==='police')police.crime(2,true);}
    if(hit?.ped){hit.ped.hit=5;police.crime(2,true);}
    const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints([start,end]),new THREE.LineBasicMaterial({color:'#ffe4aa',transparent:true,opacity:.85}));scene.add(line);tracers.push({line,life:.075});
    flash.position.copy(start).addScaledVector(direction,.8);flash.intensity=3;
  }
  return {update};
}
