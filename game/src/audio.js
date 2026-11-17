// Synthesized cues only: no audio files, external resources or autoplay.
export function createAudio(){
  let context=null;
  function start(){try{context??=new (window.AudioContext||window.webkitAudioContext)();context.resume().catch(()=>{});}catch{}}
  function tone(frequency,duration,type='sine',volume=.035,slide=1){
    if(!context||context.state!=='running')return;
    const o=context.createOscillator(),g=context.createGain();o.type=type;o.frequency.setValueAtTime(frequency,context.currentTime);o.frequency.exponentialRampToValueAtTime(Math.max(20,frequency*slide),context.currentTime+duration);
    g.gain.setValueAtTime(volume,context.currentTime);g.gain.exponentialRampToValueAtTime(.001,context.currentTime+duration);o.connect(g);g.connect(context.destination);o.start();o.stop(context.currentTime+duration);
  }
  return {start,shot(){tone(110,.12,'sawtooth',.045,.2);},success(){tone(523,.25);setTimeout(()=>tone(784,.4),110);},notify(){tone(660,.13,'sine',.025);},suspend(){context?.suspend().catch(()=>{});}};
}
