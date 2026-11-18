import { THREE } from './engine.js';
import { createWorld } from './world.js';
import { createInput } from './input.js';
import { createPlayer } from './player.js';
import { createVehicles } from './vehicles.js';
import { createTraffic } from './traffic.js';
import { createPolice } from './police.js';
import { createMissions } from './missions.js';
import { createCombat } from './combat.js';
import { createHUD } from './hud.js';
import { createAudio } from './audio.js';
import { loadSave } from './save.js';

const $=id=>document.getElementById(id);
try{boot();}catch(error){showError(error);}
function showError(error){console.error(error);$('error-message').textContent=`Verano Heat needs WebGL. Enable hardware acceleration and reload. ${error.message||''}`;$('error').hidden=false;}
function boot(){
  const canvas=$('game'),renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));renderer.outputEncoding=THREE.sRGBEncoding;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.08;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(58,innerWidth/innerHeight,.1,1400);
  const world=createWorld(scene),vehicles=createVehicles(scene,world),input=createInput(canvas);
  const player=createPlayer(scene,world,vehicles),traffic=createTraffic(scene,world,vehicles),police=createPolice(scene,world,vehicles),hud=createHUD(world),audio=createAudio();
  const saved=loadSave();player.money=saved?.money??250;
  let mode='menu',time=0,last=performance.now(),accumulator=0,checkpointNotice=0;
  const missions=createMissions(scene,world,player,vehicles,police,hud,audio,saved,complete);
  const combat=createCombat(scene,world,police,traffic,vehicles,audio);
  player.onCrime=amount=>police.crime(amount);
  const cameraTarget=new THREE.Vector3(),cameraDesired=new THREE.Vector3(),aim=new THREE.Vector3();
  if(saved){$('start').firstChild.textContent=saved.stage===5?'RETURN TO VERANO BAY ':'CONTINUE THE STORY ';$('new-game').hidden=false;$('save-note').textContent=`LOCAL CHECKPOINT / ${saved.stage===5?'STORY COMPLETE':saved.stage===0?'PROLOGUE':`CHAPTER ${saved.stage} OF 4`}`;}
  function resize(){camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);}
  window.addEventListener('resize',resize);resize();
  function setMode(next){
    mode=next;input.setEnabled(next==='play');document.body.classList.toggle('playing',next!=='menu');
    $('menu').hidden=next!=='menu';$('hud').hidden=next==='menu';$('pause').hidden=next!=='pause';$('ending').hidden=next!=='ending';
    accumulator=0;
  }
  function start(){
    missions.restore();missions.save();setMode('play');audio.start();
    hud.toast(missions.stage===5?'WELCOME BACK TO VERANO BAY':'WASD to move  /  Mouse to look  /  E to interact',5);
    if(missions.stage===0)hud.say('Rio. It’s Dana. I’m by the boardwalk. Come find me — I have a way out of this town.',8);
    else hud.say(missions.stage===4?'Keep the Aurora GT in one piece. Bring it to Mirage Pier, and lose your tail.':missions.info.text,6);
    updateCamera(1,true);
  }
  function recover(penalize=false){
    if(penalize)player.money=Math.max(0,player.money-100);
    missions.restore();missions.save();input.endFrame();updateCamera(1,true);
    hud.toast(penalize?'PATCHED UP / −$100  /  Story checkpoint restored':'STORY CHECKPOINT RESTORED',4);
  }
  function complete(){setMode('ending');$('end-money').textContent=`$${player.money.toLocaleString()}`;}
  $('start').addEventListener('click',()=>start());
  $('new-game').addEventListener('click',newStory);
  $('replay').addEventListener('click',newStory);
  function newStory(){
    // Save the initial checkpoint before a clean reload. No stale mission objects survive.
    try{localStorage.removeItem('verano-heat.story.v1');}catch{}
    location.href=location.pathname;
  }
  $('resume').addEventListener('click',()=>{setMode('play');audio.start();});
  $('recover').addEventListener('click',()=>{recover();setMode('play');audio.start();});
  $('free-roam').addEventListener('click',()=>{setMode('play');audio.start();hud.toast('THE CITY IS YOURS. STAY A WHILE.',4);});
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&mode==='play'){setMode('pause');audio.suspend();}});
  window.addEventListener('blur',()=>{if(mode==='play')setMode('pause');});
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();setMode('pause');hud.toast('Graphics context lost. Reload to restore your saved checkpoint.',20);});
  function interaction(){
    if(missions.interact())return;
    if(player.vehicle){
      if(Math.abs(player.vehicle.speed)>4){hud.toast('Slow down before getting out.');return;}
      if(!player.exit())hud.toast('The door is blocked. Move the car to an open spot.');
      else hud.toast('ON FOOT / Click or F to fire.');
      return;
    }
    const nearest=vehicles.nearest(player.position);
    if(nearest){
      if(nearest===vehicles.aurora&&missions.stage<3){hud.toast('The Aurora GT is locked. Finish Dana’s delivery first.');return;}
      if(nearest.kind==='traffic')nearest.kind='parked';
      player.enter(nearest);missions.onEnter(nearest);hud.toast(`${nearest.name} / WASD drive · Space handbrake · E exit`,4);
    }
  }
  function currentPrompt(){
    const missionPrompt=missions.prompt();if(missionPrompt)return missionPrompt;
    if(player.vehicle)return Math.abs(player.vehicle.speed)<4?'Exit vehicle':'Slow down to exit';
    const nearest=vehicles.nearest(player.position);
    if(nearest)return nearest===vehicles.aurora&&missions.stage<3?'Aurora GT / locked until Dana’s job':`Enter ${nearest.name}`;
    return '';
  }
  function updateCamera(dt,snap=false){
    const v=player.vehicle,distance=v?10.8:7.4;
    cameraTarget.copy(player.position);cameraTarget.y=v?1.4:1.5;
    cameraDesired.set(cameraTarget.x-Math.sin(player.cameraYaw)*distance,cameraTarget.y+3+Math.sin(player.cameraPitch)*distance*.75,cameraTarget.z-Math.cos(player.cameraYaw)*distance);
    // Pull the camera in when its chase arm crosses a building footprint.
    for(let i=1;i<=12;i++){
      const t=i/12,x=cameraTarget.x+(cameraDesired.x-cameraTarget.x)*t,z=cameraTarget.z+(cameraDesired.z-cameraTarget.z)*t;
      if(world.solids.some(b=>Math.abs(x-b.x)<b.w/2+.3&&Math.abs(z-b.z)<b.d/2+.3)){
        cameraDesired.lerpVectors(cameraTarget,cameraDesired,Math.max(.16,(i-1)/12));cameraDesired.y=Math.max(cameraDesired.y,cameraTarget.y+1.2);break;
      }
    }
    if(snap)camera.position.copy(cameraDesired);else camera.position.lerp(cameraDesired,1-Math.exp(-dt*8));
    aim.copy(cameraTarget).add(new THREE.Vector3(Math.sin(player.cameraYaw)*5,-.15,Math.cos(player.cameraYaw)*5));camera.lookAt(aim);
  }
  function simulate(dt){
    player.update(dt,input);vehicles.update(dt);traffic.update(dt,time,player,a=>police.crime(a));police.update(dt,time,player);
    combat.update(dt,input,player,camera);missions.update(time);
    if(player.health<=0){recover(true);checkpointNotice=0;}
    if(player.health<35){checkpointNotice+=dt;if(checkpointNotice>14){hud.toast('Need a breather? R restores the current story checkpoint.');checkpointNotice=0;}}
  }
  function frame(now){
    requestAnimationFrame(frame);
    const dt=Math.min((now-last)/1000,.1);last=now;
    if(mode==='menu'){
      time+=dt;const a=.32+Math.sin(time*.06)*.16;
      camera.position.set(210+Math.sin(a)*100,102,110+Math.cos(a)*110);camera.lookAt(18,9,-35);
      world.update(time,{x:80,z:20});missions.update(time);
      if(input.take('Enter'))start();
    }else{
      if(input.take('KeyP')||input.take('Escape')){
        if(mode==='play')setMode('pause');else if(mode==='pause'){setMode('play');audio.start();}
      }
      if(mode==='play'){
        if(input.take('KeyR'))recover();
        if(input.take('KeyE'))interaction();
        if(mode==='play'){
          accumulator+=dt;
          while(accumulator>=1/60){time+=1/60;simulate(1/60);accumulator-=1/60;}
          updateCamera(dt);world.update(time,player.position);hud.update(dt,time,player,vehicles,police,missions,currentPrompt());
        }
      }
    }
    input.endFrame();renderer.render(scene,camera);
  }
  // A small read-only status surface is useful for smoke tests and support, never for gameplay.
  window.verano={getStatus:()=>({mode,stage:missions.stage,health:player.health,money:player.money,wanted:police.stars,vehicle:player.vehicle?.name??null,position:{x:player.position.x,z:player.position.z},cars:vehicles.list.length,pedestrians:traffic.pedestrians.length,renderer:renderer.info.render})};
  updateCamera(1,true);requestAnimationFrame(frame);
  return {renderer};
}
