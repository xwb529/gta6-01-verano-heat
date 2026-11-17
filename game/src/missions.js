import { THREE, person, flatDistance, cylinder } from './engine.js';
import { LOCATIONS } from './world.js';
import { saveProgress } from './save.js';
const CHAPTERS=[
  {eyebrow:'PROLOGUE / THE FIRST CALL',title:'An old friend',text:'Dana is waiting by the boardwalk. Get close and press E to talk.',label:'DANA',target:'dana'},
  {eyebrow:'01 / SALT WATER BUSINESS',title:'Special delivery',text:'Pick up Dana’s package at the end of Mirage Pier.',label:'THE PACKAGE',target:'package'},
  {eyebrow:'02 / NO QUESTIONS ASKED',title:'Across the line',text:'Take the package to Dana’s export garage across town. Expect company.',label:'DANA’S EXPORTS',target:'delivery'},
  {eyebrow:'03 / SOMETHING BORROWED',title:'The Aurora job',text:'Steal the coral Aurora GT outside Luna Motor Club. Find the gold marker.',label:'AURORA GT',target:'aurora'},
  {eyebrow:'04 / THE LAST LIGHT',title:'A clean getaway',text:'Bring the Aurora GT to Mirage Pier. Lose the police, then hand it over.',label:'MIRAGE PIER',target:'finish'},
  {eyebrow:'VERANO BAY / AFTER HOURS',title:'The city is yours',text:'Story complete. Cruise the coast, explore the city, or find your next bad idea.',label:'FREE ROAM',target:null},
];
export function createMissions(scene,world,player,vehicles,police,hud,audio,initial,onComplete){
  let stage=initial?.stage??0;
  const dana=person('#c26e78','#eee0bd','#ba8661');dana.position.set(LOCATIONS.dana.x,.23,LOCATIONS.dana.z);dana.rotation.y=-.6;scene.add(dana);
  const ring=new THREE.Mesh(new THREE.TorusGeometry(3,.075,6,48),new THREE.MeshBasicMaterial({color:'#ffda88',transparent:true,opacity:.85,depthWrite:false}));ring.rotation.x=Math.PI/2;scene.add(ring);
  const diamond=new THREE.Mesh(new THREE.OctahedronGeometry(.75),new THREE.MeshStandardMaterial({color:'#ffda88',emissive:'#e4ab53',emissiveIntensity:.6,roughness:.4}));scene.add(diamond);
  const beam=cylinder(scene,'#f5d48b',0,5,0,.45,2.4,10,16);beam.material=new THREE.MeshBasicMaterial({color:'#f5d48b',transparent:true,opacity:.08,depthWrite:false});
  function save(){const ok=saveProgress(stage,player.money);hud.saveStatus(ok);return ok;}
  function target(){if(stage===3)return vehicles.aurora.position;const key=CHAPTERS[stage].target;return key?LOCATIONS[key]:null;}
  function change(next,reward,line){
    stage=next;player.money+=reward;player.health=Math.min(100,player.health+30);save();audio.success();
    hud.toast(reward?`JOB COMPLETE  /  +$${reward.toLocaleString()}`:'CHECKPOINT SAVED',4);
    hud.say(line,8);world.packageModel.visible=stage===1;
  }
  function interact(){
    const t=target();if(!t)return false;
    const distance=flatDistance(player.position,t);
    if(stage===0&&distance<5&&!player.vehicle){change(1,0,'Rio. One quiet pickup. Package is at the end of Mirage Pier. Bring a car — and don’t open it.');return true;}
    if(stage===1&&distance<4&&!player.vehicle){change(2,500,'Got it? Good. My export garage is across town, in the northwest. Someone tipped off Bay Patrol. Keep moving.');police.crime(2,true);return true;}
    if(stage===2&&distance<8){
      if(player.vehicle&&Math.abs(player.vehicle.speed)>4){hud.toast('Stop the car to deliver the package.');return true;}
      change(3,1000,'Package is safe. One more favor: the coral Aurora GT at Luna Motor Club. Bring it back to the pier, clean.');police.clear();return true;
    }
    if(stage===4&&distance<10){
      if(player.vehicle!==vehicles.aurora){hud.toast('Dana needs the Aurora GT. Follow its coral icon on the map.');return true;}
      if(police.stars>0){hud.toast('Lose the police first. Stay out of sight until the stars clear.');return true;}
      if(Math.abs(player.vehicle.speed)>3){hud.toast('Stop the Aurora GT to hand it over.');return true;}
      change(5,2000,'You actually did it, Rio. No more favors tonight. The keys are yours. Enjoy the good life.');onComplete();return true;
    }
    return false;
  }
  function onEnter(vehicle){
    if(stage===3&&vehicle===vehicles.aurora){change(4,750,'That’s the one. Bay Patrol knows that engine. Take the coast, break their line of sight, and meet me on Mirage Pier.');police.crime(3,true);return;}
    police.crime(1);
  }
  function prompt(){
    const t=target(),d=t?flatDistance(player.position,t):Infinity;
    if(stage===0&&d<5&&!player.vehicle)return 'Talk to Dana';
    if(stage===1&&d<4&&!player.vehicle)return 'Pick up the package';
    if(stage===1&&d<5&&player.vehicle)return 'Exit the car to collect the package';
    if(stage===2&&d<8)return 'Deliver the package';
    if(stage===4&&d<10)return police.stars?'Lose the police before the handover':'Hand over the Aurora GT';
    return '';
  }
  function restore(){
    vehicles.reset();police.reset();
    const spawn=stage===0?LOCATIONS.spawn:stage===1?{x:105,z:82}:stage===2?{x:133,z:116}:stage===3?{x:-151,z:-133}:stage===4?{x:-57,z:-132}:{x:208,z:116};
    player.reset(spawn);
    if(stage===2)police.crime(2,true);
    if(stage===4) {player.enter(vehicles.aurora);player.position.copy(vehicles.aurora.position);police.crime(3,true);}
    world.packageModel.visible=stage===1;
  }
  function update(time){
    const t=target(),visible=Boolean(t);ring.visible=diamond.visible=beam.visible=visible;
    if(t){ring.position.set(t.x,.52,t.z);diamond.position.set(t.x,4+Math.sin(time*2)*.3,t.z);diamond.rotation.y=time*.8;beam.position.set(t.x,5,t.z);}
    if(stage===4){dana.position.set(212,.65,120);dana.rotation.y=Math.PI;}
    else dana.position.set(LOCATIONS.dana.x,.23,LOCATIONS.dana.z);
    world.packageModel.rotation.y=Math.sin(time*.8)*.08;
  }
  restore();
  return {get stage(){return stage;},get info(){return CHAPTERS[stage];},target,interact,onEnter,prompt,restore,update,save};
}
