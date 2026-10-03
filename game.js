'use strict';
(() => {
const canvas=document.querySelector('#game'),ctx=canvas.getContext('2d');
const overlay=document.querySelector('#overlay'),keys=new Set();
const touchKeys=new Map();let stick={x:0,y:0,pointer:null};
const down=k=>keys.has(k)||[...touchKeys.values()].includes(k);
function clearInput(){keys.clear();touchKeys.clear();stick={x:0,y:0,pointer:null};document.querySelector('#stick-knob').style.transform='translate(0px,0px)'}
let inputMode='';
const coarseInput=window.matchMedia('(pointer: coarse)');
const desktopInput=window.matchMedia('(pointer: fine) and (hover: hover)');
function updateInputHint(){
  const action=state==='paused'?'RESUME':state==='win'?'CONTINUE':state==='title'?'START':'PLAY AGAIN';
  document.querySelector('#hint').textContent=(inputMode==='touch'?'TAP THE BUTTON TO ':'PRESS ENTER TO ')+action;
}
function setInputMode(mode){
  if(inputMode===mode)return;
  clearInput();inputMode=mode;document.body.dataset.input=mode;
  document.querySelector('#input-mode').textContent=mode==='touch'?'TOUCH CONTROLS':'KEYBOARD CONTROLS';
  updateInputHint();
}
function detectInputMode(){
  setInputMode(coarseInput.matches||((navigator.maxTouchPoints||0)>0&&!desktopInput.matches)?'touch':'desktop');
}
const W=960,H=540,arena={l:42,r:918,t:87,b:493};
const weapons=[
{name:'RUSTY SWORD',kind:'sword',damage:1,cool:.31,range:64,push:19,color:'#eee2b4'},
{name:'QUICK DAGGER',kind:'dagger',damage:1,cool:.17,range:68,push:14,color:'#79dfbf'},
{name:'WAR AXE',kind:'axe',damage:3,cool:.39,range:78,push:35,color:'#78bfff'},
{name:'RUNE SPEAR',kind:'spear',damage:3,cool:.28,range:110,push:26,color:'#ce9bff'},
{name:'CROWN BREAKER',kind:'hammer',damage:4,cool:.48,range:88,push:28,color:'#ffcf60'}
];
let drops=[],dropsSpawned=0,loop=1,completedLoops=0,threat=0,notice='',noticeTime=0;
let spawnTimer=0,cleanStreak=0,cleanBonus=0,loopHits=0,bossHits=0,coinMisses=0;
function spawnSettings(){return {cap:Math.min(24,10+threat*2+(loop-1)*2),interval:Math.max(.35,1.2-threat*.07-(loop-1)*.1-collected*.005)}}
const toughness=()=>(1+threat*.48)*(1+(loop-1)*.3);
function spawnWeapon(){
  if(dropsSpawned>=2)return;
  const previousTier=Math.max(player.weapon,...drops.map(d=>d.tier));
  const tier=dropsSpawned===0?1+Math.floor(Math.random()*2):Math.min(4,previousTier+1+Math.floor(Math.random()*2));
  drops.push({x:rnd(145,815),y:rnd(160,420),tier});dropsSpawned++;
}
function equipWeapon(tier){
  if(tier<=player.weapon)return;
  const old=toughness();player.weapon=tier;threat=tier;
  // Preserve damage already dealt as a percentage, including on the boss.
  for(const e of [...enemies,...(boss?[boss]:[])])if(e.hp>0){e.hp*=toughness()/old;e.max*=toughness()/old}
  player.cool=0;notice=weapons[tier].name+'! THREAT '+threat+' — ENEMIES EMPOWERED';noticeTime=3;
  burst(player.x,player.y,weapons[tier].color,24);tone(900,.2);
}
let state='title',previous=0,time=0,player,enemies=[],coins=[],shots=[],particles=[],score=0,collected=0,boss=null,shake=0,muted=false,audio;
function savedValue(suffix){
  const current=localStorage.getItem('cache-goblin-'+suffix);
  if(current!==null)return current;
  const legacy=localStorage.getItem('coin-goblin-'+suffix);
  if(legacy!==null)localStorage.setItem('cache-goblin-'+suffix,legacy);
  return legacy;
}
let best=0;try{best=Number(savedValue('best'))||0}catch{}
document.querySelector('#best').textContent='BEST '+String(best).padStart(5,'0');
const rnd=(a,b)=>a+Math.random()*(b-a),clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
function tone(freq,duration=.08,type='square',volume=.035){if(muted)return;try{audio??=new(window.AudioContext||window.webkitAudioContext)();if(audio.state==='suspended')audio.resume();const o=audio.createOscillator(),g=audio.createGain();o.type=type;o.frequency.setValueAtTime(freq,audio.currentTime);o.frequency.exponentialRampToValueAtTime(freq*.5,audio.currentTime+duration);g.gain.setValueAtTime(volume,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+duration);o.connect(g);g.connect(audio.destination);o.start();o.stop(audio.currentTime+duration)}catch{}}
function burst(x,y,color,n=10){for(let i=0;i<n;i++)particles.push({x,y,vx:rnd(-110,110),vy:rnd(-110,110),life:rnd(.2,.6),color})}
function start(){state='playing';time=0;score=0;collected=0;boss=null;enemies=[];coins=[];shots=[];particles=[];drops=[];dropsSpawned=0;loop=1;completedLoops=0;threat=0;noticeTime=0;spawnTimer=0;cleanStreak=0;cleanBonus=0;loopHits=0;bossHits=0;coinMisses=0;player={x:480,y:330,hp:6,inv:0,slash:0,cool:0,dash:0,dashCool:0,dx:0,dy:-1,weapon:0};overlay.hidden=true;clearInput();canvas.focus();tone(440,.14);beginLevel()}
function spawnGoblin(){
  if(boss||collected>=50||enemies.length>=spawnSettings().cap)return;
  const spots=Array.from({length:12},(_,i)=>({x:480+Math.cos(i/12*Math.PI*2)*385,y:290+Math.sin(i/12*Math.PI*2)*180}));
  const safe=spots.filter(p=>Math.hypot(p.x-player.x,p.y-player.y)>170);
  const point=safe[Math.floor(Math.random()*safe.length)];
  const hp=(3+Math.floor(collected/15)*.3)*toughness();
  enemies.push({...point,hp,max:hp,speed:(74+Math.floor(collected/10)*3)*(1+(loop-1)*.08),hit:0,arrival:.45});
}
function beginLevel(){
  spawnTimer=1.2;loopHits=0;bossHits=0;coinMisses=0;cleanStreak=0;
  if(loop===1)spawnWeapon();
  for(let i=0;i<Math.min(8,4+loop-1);i++)spawnGoblin();
  document.querySelector('#status').textContent='LEVEL '+loop+' · ENDLESS GOBLIN SPAWNS · COLLECT 50 COINS FOR GRIBBLE';
}
function enterBoss(){
  if(boss||collected<50)return;
  enemies=[];coins=[];spawnTimer=0;bossHits=0;player.inv=Math.max(player.inv,1);
  boss={x:480,y:player.y<270?410:150,hp:64*toughness(),max:64*toughness(),hit:0,mode:'chase',timer:rnd(.5,1.2),chain:0,z:0};
  document.querySelector('#status').textContent='GRIBBLE · THE CRYPT HAS A KEEPER';tone(100,.5,'sawtooth');
}
function rewardGoblin(e){
  cleanStreak++;const bonus=Math.min(cleanStreak*10,100);cleanBonus+=bonus;score+=100+bonus;
  // A coin is a chance drop. A short bad-luck limit prevents endless dry streaks.
  if(collected+coins.length<50){
    if(Math.random()<.45||coinMisses>=3){coins.push({x:e.x,y:e.y});coinMisses=0}else coinMisses++;
  }
  tone(180,.1);
}
function showOverlay(title,desc,button){overlay.hidden=false;document.querySelector('#exit').hidden=state!=='win';document.querySelector('#home').hidden=state!=='lose';document.querySelector('#title').innerHTML=title;document.querySelector('#description').innerHTML=desc;document.querySelector('#start').textContent=button;updateInputHint();document.querySelector('#overline').textContent=state==='win'?'THE TREASURY IS SAFE':state==='paused'?'TAKE A BREATHER':'THE CRYPT KEEPS ITS SECRETS'}
function saveScore(reason){
  best=Math.max(best,score);let saved=false;
  try{
    const stored=JSON.parse(savedValue('runs')||'[]');
    const runs=Array.isArray(stored)?stored:[];
    runs.unshift({score,loops:completedLoops,reason,date:new Date().toISOString()});
    localStorage.setItem('cache-goblin-runs',JSON.stringify(runs.slice(0,10)));
    localStorage.setItem('cache-goblin-best',String(best));saved=true;
  }catch{}
  document.querySelector('#best').textContent='BEST '+String(best).padStart(5,'0');renderRecords();return saved;
}
function renderRecords(){
  const el=document.querySelector('#records');
  try{const runs=JSON.parse(savedValue('runs')||'[]');el.textContent=Array.isArray(runs)&&runs.length?'LAST SAVED RUN: '+runs[0].score+' POINTS · '+runs[0].loops+' LOOPS':'YOUR SAVED RUNS WILL APPEAR HERE'}catch{el.textContent='LOCAL SCORE STORAGE UNAVAILABLE'}
}
function finish(win){
  if(state!=='playing')return;
  state=win?'win':'lose';clearInput();shots=[];
  if(win){completedLoops++;
    const flawless=(bossHits===0?1000*loop:0)+(loopHits===0?1000*loop:0);cleanBonus+=flawless;
    score+=1500*loop+player.hp*100+flawless;
    showOverlay('CRYPT<br><span>CONQUERED.</span>','Level '+loop+' complete · SCORE '+score+'<br>NO-HIT BONUSES: '+cleanBonus+' TOTAL<br>Continue into a harder crypt with your gear,<br>or exit and save your score on this device.','CONTINUE · LOOP '+(loop+1)+' ↗');
  }else{const saved=saveScore('defeated');showOverlay('ONE MORE<br><span>HEIST?</span>','SCORE '+score+' · LOOPS '+completedLoops+'<br>'+(saved?'Your score was saved on this device.':'Storage unavailable — score: '+score),'PLAY AGAIN ↗')}
  tone(win?660:110,.5);document.querySelector('#status').textContent=win?'CONTINUE OR EXIT THE CRYPT':'HEIST FAILED';
}
function continueRun(){
  if(state!=='win')return;
  loop++;collected=0;boss=null;enemies=[];coins=[];shots=[];particles=[];
  player.x=480;player.y=330;player.hp=6;player.inv=1;player.cool=0;player.slash=0;player.dash=0;player.dashCool=0;
  state='playing';overlay.hidden=true;clearInput();beginLevel();canvas.focus();
}
function exitCrypt(){
  if(state!=='win')return;
  const saved=saveScore('escaped');state='exited';
  showOverlay('HOME WITH<br><span>THE GOLD.</span>','SCORE '+score+' · LOOPS '+completedLoops+'<br>'+(saved?'Score saved on this device.':'Storage unavailable. Record your score before closing.'),'START A NEW RUN ↗');
  document.querySelector('#status').textContent=saved?'ESCAPED · SCORE SAVED':'ESCAPED · SCORE '+score;
}
function returnHome(){
  if(state!=='lose')return;
  state='title';clearInput();player=null;boss=null;enemies=[];coins=[];shots=[];particles=[];drops=[];shake=0;noticeTime=0;
  showOverlay('SMALL HERO.<br>BIG <span>PROBLEM.</span>','Grab random weapons. Recover 50 stolen coins.<br>Stronger gear awakens stronger enemies.','ENTER THE CRYPT ↗');
  document.querySelector('#overline').textContent='THE TREASURY NEEDS A HERO';
  document.querySelector('#status').textContent='READY WHEN YOU ARE';
  document.querySelector('#mobile-hud').textContent='HP 6/6 · COLLECT 50 COINS';
  renderRecords();document.querySelector('#start').focus();
}
function primaryAction(){if(state==='paused')pause();else if(state==='win')continueRun();else start()}
renderRecords();
function pause(){if(state==='playing'){state='paused';clearInput();showOverlay('CRYPT ON<br><span>HOLD.</span>','Your heist will be right here.','RESUME ↗')}else if(state==='paused'){state='playing';overlay.hidden=true;canvas.focus()}}
function hurt(){if(state!=='playing'||player.inv>0||player.dash>0)return;player.hp--;cleanStreak=0;loopHits++;if(boss)bossHits++;player.inv=1.15;shake=8;burst(player.x,player.y,'#ff727d');tone(90,.15,'sawtooth');if(player.hp<=0)finish(false)}
function slash(){if(player.cool>0)return;const w=weapons[player.weapon];player.slash=Math.min(.19,w.cool);player.cool=w.cool;tone(300+player.weapon*80,.07,'triangle');const hit=e=>Math.hypot(e.x-player.x,e.y-player.y)<w.range+(e===boss?27:0);for(const e of enemies)if(hit(e)){e.hp-=w.damage;e.hit=.15;const d=Math.hypot(e.x-player.x,e.y-player.y)||1;e.x=clamp(e.x+(e.x-player.x)/d*w.push,arena.l+14,arena.r-14);e.y=clamp(e.y+(e.y-player.y)/d*w.push,arena.t+14,arena.b-14);burst(e.x,e.y,w.color,6)}if(boss&&boss.mode!=='air'&&hit(boss)){boss.hp-=w.damage*2;boss.hit=.15;burst(boss.x,boss.y,w.color,12);shake=3}for(const s of shots)if(Math.hypot(s.x-player.x,s.y-player.y)<w.range+4){s.dead=true;burst(s.x,s.y,w.color,4)}}
function update(dt){time+=dt;if(state!=='playing')return;noticeTime=Math.max(0,noticeTime-dt);for(const drop of drops){if(Math.hypot(drop.x-player.x,drop.y-player.y)<29)equipWeapon(drop.tier)}
drops=drops.filter(drop=>drop.tier>player.weapon);
for(const k of ['inv','slash','cool','dash','dashCool'])player[k]=Math.max(0,player[k]-dt);let dx=(down('d')||down('arrowright')?1:0)-(down('a')||down('arrowleft')?1:0),dy=(down('s')||down('arrowdown')?1:0)-(down('w')||down('arrowup')?1:0);if(stick.pointer!==null){dx=stick.x;dy=stick.y}const len=Math.hypot(dx,dy);if(len){if(len>1){dx/=len;dy/=len}player.dx=dx/len;player.dy=dy/len}if(down('shift')&&player.dashCool===0){player.dash=.17;player.dashCool=1.15;tone(600,.1,'triangle')}if(player.dash>0){dx=player.dx;dy=player.dy;if(Math.random()<.6)burst(player.x,player.y,'#78dbda',1)}player.x=clamp(player.x+dx*(player.dash>0?600:190)*dt,arena.l+14,arena.r-14);player.y=clamp(player.y+dy*(player.dash>0?600:190)*dt,arena.t+14,arena.b-14);if(down(' '))slash();
for(const e of enemies){e.hit=Math.max(0,e.hit-dt);const d=Math.hypot(player.x-e.x,player.y-e.y)||1;e.arrival=Math.max(0,(e.arrival||0)-dt);if(e.arrival<=0&&e.hp>0){e.x+=(player.x-e.x)/d*e.speed*(1+threat*.09)*dt;e.y+=(player.y-e.y)/d*e.speed*(1+threat*.09)*dt}if(d<25&&e.hp>0&&e.arrival<=0)hurt();if(state!=='playing')return;if(e.hp<=0&&!e.dead){e.dead=true;rewardGoblin(e)}}enemies=enemies.filter(e=>!e.dead);
coins=coins.filter(c=>{if(Math.hypot(c.x-player.x,c.y-player.y)<30){collected++;score+=50;burst(c.x,c.y,'#ffdf75');tone(880,.1);return false}return true});
if(!boss&&collected>=50)enterBoss();
if(loop===1&&dropsSpawned<2&&collected>=25)spawnWeapon();
if(boss&&state==='playing'){if(boss.hp<=0){burst(boss.x,boss.y,'#f7c75b',50);finish(true)}else updateBoss(dt)}
for(const s of shots){s.x+=s.vx*dt;s.y+=s.vy*dt;s.life-=dt;if(!s.dead&&Math.hypot(s.x-player.x,s.y-player.y)<17){hurt();if(state!=='playing')return;s.dead=true}}shots=shots.filter(s=>!s.dead&&s.life>0&&s.x>32&&s.x<928&&s.y>78&&s.y<505);
for(const p of particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt}particles=particles.filter(p=>p.life>0);shake=Math.max(0,shake-30*dt);if(!boss&&state==='playing'){spawnTimer-=dt;if(spawnTimer<=0){spawnGoblin();spawnTimer=spawnSettings().interval}}}
function updateBoss(dt){
  boss.hit=Math.max(0,boss.hit-dt);boss.timer-=dt;
  const dx=player.x-boss.x,dy=player.y-boss.y,d=Math.hypot(dx,dy)||1;
  if(boss.mode==='chase'){
    boss.x=clamp(boss.x+dx/d*64*(1+threat*.08)*dt,75,885);
    boss.y=clamp(boss.y+dy/d*64*(1+threat*.08)*dt,120,465);
    if(d<42)hurt();
    if(boss.timer<=0){
      beginBossAttack();
    }
  }else if(boss.mode==='meleeReady'&&boss.timer<=0){
    const delta=Math.atan2(Math.sin(Math.atan2(dy,dx)-boss.angle),Math.cos(Math.atan2(dy,dx)-boss.angle));
    if(d<120&&Math.abs(delta)<1.25)hurt();
    boss.mode='melee';boss.timer=.2;tone(90,.18);shake=5;
  }else if(boss.mode==='jumpReady'&&boss.timer<=0){
    boss.mode='air';boss.timer=.65;boss.sx=boss.x;boss.sy=boss.y;tone(240,.15);
  }else if(boss.mode==='air'){
    const p=clamp(1-boss.timer/.65,0,1);
    boss.x=boss.sx+(boss.tx-boss.sx)*p;boss.y=boss.sy+(boss.ty-boss.sy)*p;boss.z=Math.sin(p*Math.PI)*135;
    if(boss.timer<=0){boss.z=0;boss.mode='slam';boss.timer=.25;shake=12;burst(boss.x,boss.y,'#f7b467',35);tone(65,.3);if(Math.hypot(player.x-boss.x,player.y-boss.y)<100)hurt()}
  }else if(boss.mode==='volleyReady'&&boss.timer<=0){
    const spread=threat>=3?3:2,speed=190+threat*14+Math.min(loop-1,5)*12;
    for(let i=-spread;i<=spread;i++){const a=boss.angle+i*.3;shots.push({x:boss.x,y:boss.y,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,life:5})}
    endBossAttack();tone(140,.14);
  }else if((boss.mode==='melee'||boss.mode==='slam')&&boss.timer<=0){endBossAttack()}
  else if(boss.mode==='recover'&&boss.timer<=0){if(boss.combo)beginBossAttack();else{boss.mode='chase';boss.timer=rnd(.15,.55)}}
}
function beginBossAttack(){
  const roll=Math.random(),close=Math.hypot(player.x-boss.x,player.y-boss.y)<145;
  // No fixed rotation: repeats and short chains are possible.
  boss.mode=roll<(close?.46:.18)?'meleeReady':roll<.73?'jumpReady':'volleyReady';
  boss.timer=rnd(.08,.23);boss.angle=Math.atan2(player.y-boss.y,player.x-boss.x);
  boss.tx=clamp(player.x,95,865);boss.ty=clamp(player.y,145,445);
}
function endBossAttack(){
  const aggressive=boss.hp<boss.max/2;
  boss.combo=boss.chain<2&&Math.random()<(aggressive?.65:.45);
  boss.chain=boss.combo?boss.chain+1:0;
  boss.mode='recover';boss.timer=boss.combo?rnd(.07,.18):rnd(.65,1.5)/(1+threat*.06+Math.min(loop-1,5)*.06);
}
function drawBossImpact(){
  // Effects appear only after the hit, never as an advance warning.
  if(boss.mode==='slam'){ctx.strokeStyle='#ffab64';ctx.lineWidth=5;ctx.beginPath();ctx.arc(boss.x,boss.y,100*(1-boss.timer/.25),0,Math.PI*2);ctx.stroke()}
  if(boss.mode==='melee'){ctx.strokeStyle='#ffe0a6';ctx.lineWidth=7;ctx.beginPath();ctx.arc(boss.x,boss.y,115,boss.angle-1.25,boss.angle+1.25);ctx.stroke()}
}
function rect(x,y,w,h,c){ctx.fillStyle=c;ctx.fillRect(Math.round(x),Math.round(y),w,h)}
function text(s,x,y,size=14,color='#e9decb',align='left'){ctx.fillStyle=color;ctx.font='bold '+size+'px monospace';ctx.textAlign=align;ctx.fillText(s,x,y)}
const goblin=['......pppp......','.....pppppp.....','....pppppppp....','...pppppppppp...','..pppggggggppp..','ggppggggggggppgg','.gggYbggbYggggg.','..pggggggggggp..','..ppgwwwwwwgpp..','...ppggggggpp...','....pppppppp....','...ppppcppppp...','..gppppccppppg..','..ggppppppppgg..','....pppppppp....','....bb..bb......','...bbb..bbb.....'];
const hero=['..w..ww..w....','...wwwwwwww...','..wwwwwwwwww..','.wwwggggggww..','..wgcggcgcgw..','...gcsscsg....','...ssbssbs....','....ssssss....','..gggttgggg...','.gaggt tggag..'.replace(' ', 't'),'.gaagttggaag..','..sagttgaas...','..sggggggs....','...aaggaaa....','...aa..aa.....','..bbb..bbb....'];
function sprite(rows,x,y,scale,palette,flash=false){const ox=Math.round(x-rows[0].length*scale/2),oy=Math.round(y-rows.length*scale/2);for(let r=0;r<rows.length;r++)for(let c=0;c<rows[r].length;c++){const k=rows[r][c];if(k!=='.')rect(ox+c*scale,oy+r*scale,scale,scale,flash?'#fff0bd':palette[k])}}
function weaponIcon(x,y,w){
rect(x-2,y-8,4,23,'#a77b51');
if(w.kind==='axe'){rect(x-11,y-13,22,11,w.color);rect(x-14,y-11,5,15,w.color)}
else if(w.kind==='hammer'){rect(x-14,y-13,28,15,w.color);rect(x-8,y-10,16,4,'#fff0bd')}
else{const length=w.kind==='spear'?26:w.kind==='dagger'?12:19;rect(x-3,y-length,6,length,w.color);rect(x-8,y,16,3,w.color)}
}
function background(){rect(0,0,W,H,'#100e18');rect(24,68,912,444,'#3c3047');rect(36,80,888,420,'#211c2c');for(let y=84;y<500;y+=32)for(let x=40;x<920;x+=40){rect(x,y,38,30,((x/40+y/32)|0)%3?'#262030':'#292232');rect(x+3,y+28,32,1,'#30283a')}for(let x=40;x<930;x+=44){rect(x,64,40,14,'#51405a');rect(x,502,40,14,'#40324a')}for(const x of [65,891])for(const y of [125,449]){rect(x-7,y,14,22,'#644332');rect(x-5,y-12,10,17,'#ef973f');rect(x-2,y-17+Math.sin(time*9)*3,5,16,'#ffda70')}rect(431,83,98,23,'#17121e');rect(441,83,78,17,'#49374e');for(let i=0;i<5;i++)rect(449+i*14,83,5,16,'#ab8047');for(const [x,y]of [[190,215],[730,380],[690,165],[270,423]]){rect(x,y,25,2,'#17131f');rect(x+12,y,2,9,'#17131f')}}
function draw(){
if(player)document.querySelector('#mobile-hud').textContent='HP '+player.hp+'/6 · COINS '+collected+'/50 · SCORE '+score+' · STREAK '+cleanStreak+' · '+weapons[player.weapon].name+(boss?' · GRIBBLE '+Math.ceil(Math.max(0,boss.hp)/boss.max*100)+'%':'');
ctx.save();if(shake)ctx.translate(rnd(-shake,shake),rnd(-shake,shake));background();if(player){text('VITALS',43,28,10,'#998aab');for(let i=0;i<6;i++)text(i<player.hp?'♥':'♡',43+i*22,53,22,i<player.hp?'#f37f8c':'#58465e');text('COINS '+String(collected).padStart(2,'0')+'/50',265,44,17,'#f7c75b');text(boss?'THE CACHE GOBLIN':'LEVEL '+loop,W/2+25,44,15,'#c6b5d3','center');text('SCORE '+String(score).padStart(5,'0'),914,44,17,'#e9decb','right');
for(const drop of drops){const w=weapons[drop.tier],y=drop.y+Math.sin(time*4)*4;rect(drop.x-21,y-22,42,42,'#15111f');ctx.strokeStyle=w.color;ctx.lineWidth=2;ctx.strokeRect(drop.x-21,y-22,42,42);weaponIcon(drop.x,y,w);text(w.name,drop.x,y+34,10,w.color,'center');text('T'+drop.tier,drop.x,y-29,10,w.color,'center')}
for(const c of coins){const bob=Math.sin(time*6+c.x)*3;rect(c.x-6,c.y-8+bob,12,16,'#be8136');rect(c.x-4,c.y-8+bob,8,13,'#ffdc66');rect(c.x-1,c.y-5+bob,2,7,'#fff2b0')}
for(const e of enemies){rect(e.x-15,e.y+15,30,5,'#17131f');sprite(goblin,e.x,e.y,2,{p:'#665077',g:'#91bc4b',Y:'#ffe47d',b:'#1b1823',w:'#eee2b4',c:'#d8ae5c'},e.hit>0)}
if(boss){drawBossImpact();rect(boss.x-32,boss.y+32,64,8,'#17131f');sprite(goblin,boss.x,boss.y-(boss.z||0),4,{p:'#59415f',g:'#9ad340',Y:'#ffc64c',b:'#19131a',w:'#fff0aa',c:'#ffd45e'},boss.hit>0);rect(300,520,360,7,'#46344d');rect(300,520,360*Math.max(0,boss.hp)/boss.max,7,'#e8b64e');text('GRIBBLE',286,528,10,'#b39ac0','right')}
for(const s of shots){rect(s.x-6,s.y-6,12,12,'#be7834');rect(s.x-4,s.y-4,8,8,'#ffdf67')}
rect(player.x-12,player.y+15,24,5,'#14111b');if(player.inv<=0||Math.floor(time*15)%2===0)sprite(hero,player.x,player.y,3,{w:'#fff0dc',g:'#d6a14e',c:'#5be6ff',b:'#282039',s:'#efa773',t:'#346c9c',a:'#59465d'});

if(player.slash>0){const w=weapons[player.weapon];ctx.strokeStyle=w.color;ctx.lineWidth=7;ctx.beginPath();const a=Math.atan2(player.dy,player.dx);ctx.arc(player.x,player.y,w.range-12,0,Math.PI*2);ctx.stroke();ctx.strokeStyle='#e3ab51';ctx.lineWidth=2;ctx.beginPath();ctx.arc(player.x,player.y,w.range-3,0,Math.PI*2);ctx.stroke()}
text('NO-HIT STREAK '+cleanStreak+' / +'+Math.min((cleanStreak+1)*10,100)+' NEXT',265,17,10,'#91ddc2');
text(weapons[player.weapon].name+' / T'+player.weapon,915,527,11,weapons[player.weapon].color,'right');
text('LEVEL '+loop+' · THREAT '+threat+' / 4',915,17,10,threat?'#ff9e80':'#998aab','right');
if(noticeTime>0){rect(150,110,660,26,'#15111feb');text(notice,480,128,13,weapons[player.weapon].color,'center')}
for(const p of particles)rect(p.x,p.y,4,4,p.color);text(player.dashCool>0?'DASH RECHARGING':'DASH READY',47,531,10,player.dashCool>0?'#786d85':'#79cebd');}ctx.restore();ctx.fillStyle='#00000012';for(let y=0;y<H;y+=4)ctx.fillRect(0,y,W,1)}
function frame(now){const dt=Math.min((now-previous)/1000||0,.033);previous=now;update(dt);draw();requestAnimationFrame(frame)}
document.querySelector('#home').addEventListener('click',returnHome);
document.querySelector('#exit').addEventListener('click',exitCrypt);
document.querySelector('#start').addEventListener('click',primaryAction);document.querySelector('#sound').addEventListener('click',e=>{muted=!muted;e.currentTarget.textContent='SOUND: '+(muted?'OFF':'ON')});
window.addEventListener('keydown',e=>{const k=e.key.toLowerCase();if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright',' ','shift','enter','p','escape','tab'].includes(k))setInputMode('desktop');if(state!=='playing'&&(k==='enter'||k===' ')&&e.target?.closest?.('button'))return;if([' ','arrowup','arrowdown','arrowleft','arrowright','shift'].includes(k))e.preventDefault();if(k==='enter'&&state!=='playing'){e.preventDefault();if(!e.repeat)primaryAction();return}if(k==='p'||k==='escape'){if(!e.repeat)pause();return}keys.add(k)});window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));window.addEventListener('blur',()=>{clearInput();if(state==='playing')pause()});document.addEventListener('visibilitychange',()=>{if(document.hidden&&state==='playing')pause()});
for(const b of document.querySelectorAll('[data-key]')){
  b.addEventListener('pointerdown',e=>{e.preventDefault();if(state!=='playing')return;b.setPointerCapture(e.pointerId);touchKeys.set(e.pointerId,b.dataset.key)});
  for(const type of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(type,e=>touchKeys.delete(e.pointerId));
}
const joystick=document.querySelector('#joystick');
function moveStick(e){
  if(e.pointerId!==stick.pointer)return;
  const bounds=joystick.getBoundingClientRect(),radius=bounds.width*.32;
  let x=(e.clientX-bounds.left-bounds.width/2)/radius,y=(e.clientY-bounds.top-bounds.height/2)/radius;
  const length=Math.hypot(x,y);if(length>1){x/=length;y/=length}
  stick.x=Math.abs(x)<.12?0:x;stick.y=Math.abs(y)<.12?0:y;
  document.querySelector('#stick-knob').style.transform='translate('+x*radius+'px,'+y*radius+'px)';
}
joystick.addEventListener('pointerdown',e=>{e.preventDefault();if(state!=='playing'||stick.pointer!==null)return;stick.pointer=e.pointerId;joystick.setPointerCapture(e.pointerId);moveStick(e)});
joystick.addEventListener('pointermove',moveStick);
for(const type of ['pointerup','pointercancel','lostpointercapture'])joystick.addEventListener(type,e=>{if(stick.pointer===e.pointerId){stick={x:0,y:0,pointer:null};document.querySelector('#stick-knob').style.transform='translate(0px,0px)'}});
document.querySelector('#pause-touch').addEventListener('click',pause);
document.querySelector('#sound-touch').addEventListener('click',()=>document.querySelector('#sound').click());
window.addEventListener('resize',clearInput);
// Capture before game buttons receive the press; mouse movement alone never switches modes.
window.addEventListener('pointerdown',e=>{
  if(e.pointerType==='touch'||e.pointerType==='pen')setInputMode('touch');
  else if(e.pointerType==='mouse'&&!e.target?.closest?.('.touch'))setInputMode('desktop');
},true);
for(const query of [coarseInput,desktopInput]){
  if(query.addEventListener)query.addEventListener('change',detectInputMode);
  else if(query.addListener)query.addListener(detectInputMode);
}
detectInputMode();
requestAnimationFrame(frame);
})();
