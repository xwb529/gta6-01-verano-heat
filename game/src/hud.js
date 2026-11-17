import { flatDistance, clamp } from './engine.js';
import { ROAD_X, ROAD_Z, LOCATIONS } from './world.js';
const byId=id=>document.getElementById(id);
export function createHUD(world){
  const ids=['chapter','mission-title','mission-text','objective-label','distance','district','wanted','heat-state','money','health','health-value','mode','map-label','speed-box','speed','car-name','prompt','damage-flash'];
  const el=Object.fromEntries(ids.map(id=>[id,byId(id)]));
  const canvas=byId('minimap'),c=canvas.getContext('2d');
  const base=document.createElement('canvas');base.width=420;base.height=420;const b=base.getContext('2d');
  const sx=x=>(x+207)/450*420,sz=z=>(z+218)/450*420;
  b.fillStyle='#397681';b.fillRect(0,0,420,420);
  b.fillStyle='#e2c48f';b.fillRect(sx(111),sz(-205),sx(141)-sx(111),sz(205)-sz(-205));
  b.fillStyle='#315456';b.fillRect(sx(-198),sz(-205),sx(111)-sx(-198),sz(205)-sz(-205));
  b.fillStyle='#718b81';
  for(const x of ROAD_X)b.fillRect(sx(x-8),sz(-200),sx(x+8)-sx(x-8),sz(200)-sz(-200));
  for(const z of ROAD_Z)b.fillRect(sx(-195),sz(z-8),sx(113)-sx(-195),sz(z+8)-sz(z-8));
  b.fillStyle='#99a591';for(const f of world.footprints)b.fillRect(sx(f.x-f.w/2),sz(f.z-f.d/2),f.w/450*420,f.d/450*420);
  b.fillStyle='#b4a07a';b.fillRect(sx(113),sz(109),sx(224)-sx(113),sz(123)-sz(109));
  b.fillStyle='#f3e0b6';b.font='bold 10px Arial';b.globalAlpha=.65;b.fillText('OLD TOWN',sx(-131),sz(43));b.fillText('THE COAST',sx(112),sz(-80));b.globalAlpha=1;
  let toastTimer=0,sayTimer=0,lastStage=-1;
  function toast(text,seconds=3){byId('toast').textContent=text;byId('toast').classList.add('visible');toastTimer=seconds;}
  function say(text,seconds=7){byId('dialogue-text').textContent=text;byId('dialogue').classList.add('visible');sayTimer=seconds;}
  function dot(position,color,size){c.fillStyle=color;c.beginPath();c.arc(sx(position.x),sz(position.z),size,0,Math.PI*2);c.fill();}
  function map(player,vehicles,police,missions,time){
    c.clearRect(0,0,420,420);c.drawImage(base,0,0);
    const target=missions.target();
    if(target){
      c.strokeStyle='#f5d58a';c.lineWidth=2;c.setLineDash([4,6]);c.beginPath();c.moveTo(sx(player.position.x),sz(player.position.z));c.lineTo(sx(target.x),sz(target.z));c.stroke();c.setLineDash([]);
    }
    for(const v of vehicles.list)if(v.kind!=='police'&&!v.occupied)dot(v.position,v===vehicles.aurora?'#ff9c85':'#87cfc3',v===vehicles.aurora?4.5:2.5);
    for(const u of police.units)dot(u.car.position,police.stars?'#ff6d85':'#9ac5d6',4);
    if(missions.stage===0)dot(LOCATIONS.dana,'#f5d58a',5);
    if(target){c.save();c.translate(sx(target.x),sz(target.z));c.rotate(Math.PI/4);c.fillStyle='#f5d58a';const size=6+Math.sin(time*3);c.fillRect(-size,-size,size*2,size*2);c.restore();}
    c.save();c.translate(sx(player.position.x),sz(player.position.z));
    c.fillStyle='#ff8496';c.beginPath();c.arc(0,0,10,0,Math.PI*2);c.fill();c.rotate(-(player.vehicle?.yaw??player.mesh.rotation.y));
    c.fillStyle='#fff2d9';c.beginPath();c.moveTo(0,7);c.lineTo(-4,-4);c.lineTo(4,-4);c.closePath();c.fill();c.restore();
  }
  function update(dt,time,player,vehicles,police,missions,prompt){
    toastTimer-=dt;sayTimer-=dt;if(toastTimer<=0)byId('toast').classList.remove('visible');if(sayTimer<=0)byId('dialogue').classList.remove('visible');
    const info=missions.info;
    if(lastStage!==missions.stage){
      lastStage=missions.stage;el.chapter.textContent=info.eyebrow;el['mission-title'].textContent=info.title;el['mission-text'].textContent=info.text;el['objective-label'].textContent=info.label;el['map-label'].textContent=missions.stage===5?'AFTER HOURS':info.label;
      byId('chapters').querySelectorAll('i').forEach((s,i)=>{s.className=i<missions.stage-1?'complete':i===missions.stage-1?'active':'';});
    }
    const target=missions.target();el.distance.textContent=target?`${Math.round(flatDistance(player.position,target))} M`:'∞';
    el.district.textContent=world.district(player.position);
    el.wanted.textContent='★'.repeat(police.stars)+'☆'.repeat(5-police.stars);el.wanted.setAttribute('aria-label',`${police.stars} wanted stars`);
    el['heat-state'].textContent=police.stars?(police.searching?`SEARCHING / ${Math.round(police.escapeProgress*100)}% CLEAR`:'BAY PATROL / IN PURSUIT'):'KEEP A LOW PROFILE';
    el['heat-state'].style.color=police.stars?'#ff9a9d':'#8be1cb';
    el.money.textContent=`$${Math.round(player.money).toLocaleString()}`;
    el.health.style.width=`${clamp(player.health,0,100)}%`;el['health-value'].textContent=Math.ceil(player.health);
    el['speed-box'].hidden=!player.vehicle;el.mode.textContent=player.vehicle?'DRIVING':'ON FOOT';
    if(player.vehicle){el.speed.textContent=Math.round(Math.abs(player.vehicle.speed)*3.6);el['car-name'].textContent=player.vehicle.name;}
    el.prompt.classList.toggle('visible',Boolean(prompt));el.prompt.replaceChildren();
    if(prompt){const key=document.createElement('kbd');key.textContent='E';el.prompt.append(key,document.createTextNode(prompt));}
    byId('crosshair').hidden=Boolean(player.vehicle);
    el['damage-flash'].style.opacity=player.damageFlash;
    map(player,vehicles,police,missions,time);
  }
  return {update,toast,say,saveStatus(ok){byId('save-status').textContent=ok?'● STORY CHECKPOINT SAVED':'○ STORAGE UNAVAILABLE / SESSION ONLY';},invalidate(){lastStage=-1;}};
}
