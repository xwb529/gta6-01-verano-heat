import { THREE, person, animatePerson, box, clamp, angleDelta } from './engine.js';
import { LOCATIONS } from './world.js';
export function createPlayer(scene,world,vehicles) {
  const mesh=person('#e8b04b','#28545a','#ae704b');
  box(mesh,'#d95f4b',-.18,1.28,.21,.12,.58,.025);
  const gun=box(mesh,'#253b43',-.5,1.11,.36,.14,.17,.48); gun.visible=false;
  mesh.position.set(LOCATIONS.spawn.x,.23,LOCATIONS.spawn.z); scene.add(mesh);
  let phase=0,invulnerable=0;
  const p={mesh,position:mesh.position,health:100,money:250,vehicle:null,cameraYaw:Math.PI,cameraPitch:.31,aimTimer:0,onCrime:null,damageFlash:0,
    damage(amount){if(invulnerable>0)return;p.health=Math.max(0,p.health-amount);p.damageFlash=.7;invulnerable=.35;},
    enter(v){p.vehicle=v;v.occupied=true;mesh.visible=false;p.cameraYaw=v.yaw;},
    exit(force=false){
      const v=p.vehicle;if(!v)return false;
      if(!force&&Math.abs(v.speed)>4)return false;
      const exits=[[-Math.cos(v.yaw)*3,Math.sin(v.yaw)*3],[Math.cos(v.yaw)*3,-Math.sin(v.yaw)*3],[-Math.sin(v.yaw)*4,-Math.cos(v.yaw)*4]];
      const spot=exits.find(([dx,dz])=>!world.blocked(v.position.x+dx,v.position.z+dz,.5));
      if(!spot&&!force)return false;
      mesh.position.set(v.position.x+(spot?.[0]||0),.23,v.position.z+(spot?.[1]||0));v.occupied=false;v.speed=0;p.vehicle=null;mesh.visible=true;return true;
    },
    reset(position=LOCATIONS.spawn){p.exit(true);mesh.position.set(position.x,.23,position.z);p.health=100;p.cameraYaw=Math.PI;p.cameraPitch=.31;invulnerable=3;},
  };
  function update(dt,input) {
    invulnerable=Math.max(0,invulnerable-dt);p.damageFlash=Math.max(0,p.damageFlash-dt*2);p.aimTimer=Math.max(0,p.aimTimer-dt);
    const look=input.look();p.cameraYaw-=look.x*.0026;p.cameraPitch=clamp(p.cameraPitch+look.y*.0018,.08,.8);
    if(p.vehicle){
      vehicles.drive(p.vehicle,input,dt,p);mesh.position.copy(p.vehicle.position);
      // Automatic chase view yields to active mouse-look.
      if(!look.x&&(input.held('KeyW')||input.held('KeyS')||input.held('ArrowUp')||input.held('ArrowDown')))p.cameraYaw+=angleDelta(p.vehicle.yaw,p.cameraYaw)*Math.min(1,dt*2.7);
      return;
    }
    const forward=input.axis(['KeyW','ArrowUp'],['KeyS','ArrowDown']);
    const right=input.axis(['KeyD','ArrowRight'],['KeyA','ArrowLeft']);
    const direction=new THREE.Vector3(Math.sin(p.cameraYaw)*forward-Math.cos(p.cameraYaw)*right,0,Math.cos(p.cameraYaw)*forward+Math.sin(p.cameraYaw)*right);
    const moving=direction.lengthSq()>0;
    const sprint=input.held('ShiftLeft')||input.held('ShiftRight');
    if(moving){direction.normalize();world.move(mesh.position,direction.x*(sprint?10:6)*dt,direction.z*(sprint?10:6)*dt,.5);mesh.rotation.y=Math.atan2(direction.x,direction.z);}
    mesh.position.y=world.heightAt(mesh.position.x,mesh.position.z)+.03;
    if(p.aimTimer>0)mesh.rotation.y=p.cameraYaw;
    phase+=dt*(sprint?14:10);animatePerson(mesh,phase,moving);gun.visible=p.aimTimer>0;
  }
  return Object.assign(p,{update});
}
