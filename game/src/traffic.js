import { THREE, person, animatePerson, flatDistance } from './engine.js';
import { ROAD_X, ROAD_Z } from './world.js';
export function createTraffic(scene,world,vehicles) {
  const cars=[],pedestrians=[];
  const palette=['#6fae7d','#cf7355','#e0aa4e','#4e8fa8','#b85c70'];
  // Lane-separated rectangular circuits; stolen traffic cars leave their AI circuit.
  for(let i=0;i<10;i++) {
    const left=ROAD_X[i%3]+3.8,right=ROAD_X[Math.min(3,i%3+1)]-3.8;
    const top=ROAD_Z[i%4]+3.8,bottom=ROAD_Z[Math.min(4,i%4+1)]-3.8;
    const route=[{x:left,z:top},{x:left,z:bottom},{x:right,z:bottom},{x:right,z:top}];
    const index=i%4,p=route[index];
    const car=vehicles.add(p.x,p.z,0,palette[i%5],i%2?'PALOMA COUPE':'MARINA SEDAN',false,'traffic');
    cars.push({car,route,index:(index+1)%4,cruise:8+i%4});
  }
  for(let i=0;i<36;i++) {
    const mesh=person(palette[i%5],i%3?'#3a5960':'#8f795e',i%2?'#a66a4c':'#d0a079');
    const x=i<15?105:ROAD_X[i%4]+(i%2?11:-11),z=-180+(i*31)%355;
    mesh.position.set(x,.22,z);scene.add(mesh);
    pedestrians.push({mesh,baseX:x,baseZ:z,phase:i*1.7,direction:i%2?1:-1,panic:0,hit:0});
  }
  function update(dt,time,player,onCrime) {
    for(const data of cars){
      const {car,route}=data;if(car.occupied||car.kind!=='traffic')continue;
      if(car.stun>0){car.speed=0;continue;}
      const target=route[data.index],dx=target.x-car.position.x,dz=target.z-car.position.z,d=Math.hypot(dx,dz);
      if(d<1){data.index=(data.index+1)%4;continue;}
      car.yaw=Math.atan2(dx,dz);car.mesh.rotation.y=car.yaw;
      const nearby=flatDistance(car.position,player.position);
      const obstacle=vehicles.list.some(v=>v!==car&&flatDistance(v.position,car.position)<4&&((v.position.x-car.position.x)*dx+(v.position.z-car.position.z)*dz)>0);
      car.speed=obstacle||(!player.vehicle&&nearby<4)?0:data.cruise;
      world.move(car.position,dx/d*car.speed*dt,dz/d*car.speed*dt,1.25);
      if(player.vehicle&&nearby<3.1&&Math.abs(player.vehicle.speed)>6){car.stun=1.3;player.vehicle.speed*=.5;onCrime(1);}
    }
    for(const ped of pedestrians){
      ped.hit=Math.max(0,ped.hit-dt);ped.panic=Math.max(0,ped.panic-dt);
      const model=ped.mesh;model.visible=ped.hit<=0;
      if(ped.hit>0)continue;
      const near=flatDistance(model.position,player.position);
      if(player.vehicle&&Math.abs(player.vehicle.speed)>6&&near<1.9){ped.hit=4;onCrime(1);continue;}
      const dir=ped.panic>0?Math.atan2(model.position.x-player.position.x,model.position.z-player.position.z):ped.direction>0?0:Math.PI;
      model.rotation.y=dir;const speed=ped.panic>0?5:1.1;
      if(world.move(model.position,Math.sin(dir)*speed*dt,Math.cos(dir)*speed*dt,.4)||Math.abs(model.position.z-ped.baseZ)>27)ped.direction*=-1;
      animatePerson(model,time*(ped.panic>0?14:7)+ped.phase,true);
    }
  }
  function panic(position){for(const p of pedestrians)if(flatDistance(p.mesh.position,position)<45)p.panic=8;}
  return { cars,pedestrians,update,panic };
}
