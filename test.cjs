const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(__dirname+'/game.js','utf8');
const storage=new Map();
function harness(blockStorage=false,device={coarse:false,fine:true,touches:0}){
 const elements=new Map(),events={};
 const media=new Map();function matchMedia(q){if(!media.has(q))media.set(q,{matches:q.includes("coarse")?device.coarse:device.fine,addEventListener(type,fn){this.change=fn}});return media.get(q)}
 const body={dataset:{}};
 const ctx=new Proxy({}, {get:()=>()=>{}});
 function element(id){if(!elements.has(id))elements.set(id,{style:{},dataset:id==='#attack'?{key:' '}:id==='#dash'?{key:'shift'}:{},setPointerCapture(){},getBoundingClientRect(){return {left:0,top:0,width:124,height:124}},textContent:'',innerHTML:'',hidden:false,addEventListener(type,fn){events[id+type]=fn},focus(){},getContext:()=>ctx});return elements.get(id)}
 let seed=12345;const math=Object.create(Math);math.random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
 const box={navigator:{maxTouchPoints:device.touches},document:{body,querySelector:element,querySelectorAll:()=>[element('#attack'),element('#dash')],addEventListener(){}},window:{matchMedia,addEventListener(type,fn){events['window'+type]=fn}},localStorage:{getItem(k){if(blockStorage)throw Error();return storage.get(k)||null},setItem(k,v){if(blockStorage)throw Error();storage.set(k,v)}},Math:math,Date,requestAnimationFrame(){}};
 vm.createContext(box);vm.runInContext(source.replace(/\}\)\(\);\s*$/,`globalThis.test={start,update,draw,pause,hurt,slash,keys,spawnWeapon,equipWeapon,weapons,updateBoss,beginBossAttack,endBossAttack,down,finish,continueRun,exitCrypt,get drops(){return drops},get dropsSpawned(){return dropsSpawned},get threat(){return threat},get loop(){return loop},get completedLoops(){return completedLoops},get state(){return state},get player(){return player},get enemies(){return enemies},get coins(){return coins},get shots(){return shots},spawnSettings,spawnGoblin,rewardGoblin,get cleanStreak(){return cleanStreak},get cleanBonus(){return cleanBonus},get loopHits(){return loopHits},get bossHits(){return bossHits},get spawnTimer(){return spawnTimer},get boss(){return boss},get collected(){return collected},get score(){return score}};})();`),box);
 return {g:box.test,element,events,math,body,media};
}
const {g,element,events,math}=harness();g.draw();g.start();assert.equal(g.enemies.length,4);assert.equal(g.dropsSpawned,1);
g.keys.add('d');const x=g.player.x;g.update(.1);assert(g.player.x>x);g.keys.clear();g.pause();const px=g.player.x;g.update(10);assert.equal(g.player.x,px);g.pause();
g.keys.add('shift');g.update(.01);const hp=g.player.hp;g.hurt();assert.equal(g.player.hp,hp);g.keys.clear();g.player.dash=0;g.player.inv=0;g.hurt();g.hurt();assert.equal(g.player.hp,hp-1);
function clearCrypt(game){
 let steps=0;
 while(!game.boss&&steps++<10000){
  assert(game.collected<50);game.player.inv=100;
  if(game.coins.length){game.player.x=game.coins[0].x;game.player.y=game.coins[0].y}
  else if(game.enemies.length){const e=game.enemies[0];game.player.x=e.x;game.player.y=e.y;game.player.cool=0;game.slash()}
  game.update(.1);
 }
 assert(steps<10000);assert.equal(game.collected,50);assert(game.boss);assert.equal(game.enemies.length,0);
}
g.start();clearCrypt(g);assert.equal(g.dropsSpawned,2);for(let i=0;i<20;i++)g.spawnWeapon();assert.equal(g.dropsSpawned,2);g.draw();
// Half-damaged enemies and bosses keep their fraction on an upgrade.
g.boss.hp=g.boss.max/2;g.equipWeapon(4);assert.equal(g.boss.hp/g.boss.max,.5);
assert.equal(g.weapons[4].damage,4);assert.equal(g.weapons[4].cool,.48);assert.equal(g.weapons[4].range,88);
// Random attack selection, repeats, bounded fast chains, and real damage.
const random=math.random;
Object.assign(g.boss,{x:480,y:260,mode:'chase',timer:0,chain:0});Object.assign(g.player,{x:530,y:260,inv:0,dash:0,hp:6});
math.random=()=>0;g.beginBossAttack();assert.equal(g.boss.mode,'meleeReady');assert(g.boss.timer<.24);g.draw();g.updateBoss(.24);assert.equal(g.player.hp,5);assert.equal(g.boss.mode,'melee');g.updateBoss(.21);assert.equal(g.boss.mode,'recover');assert(g.boss.combo);assert(g.boss.timer<.2);g.updateBoss(.2);assert.equal(g.boss.mode,'meleeReady');
g.boss.chain=2;g.endBossAttack();assert.equal(g.boss.combo,false);assert(g.boss.timer>.2);
Object.assign(g.boss,{mode:'meleeReady',timer:0,angle:0});g.player.inv=0;g.player.dash=.2;g.updateBoss(.01);assert.equal(g.player.hp,5);g.player.dash=0;
math.random=()=>.5;g.beginBossAttack();assert.equal(g.boss.mode,'jumpReady');const tx=g.boss.tx,ty=g.boss.ty;g.draw();g.updateBoss(.24);assert.equal(g.boss.mode,'air');const bossHp=g.boss.hp;g.player.x=g.boss.x;g.player.y=g.boss.y;g.player.cool=0;g.slash();assert.equal(g.boss.hp,bossHp);g.updateBoss(.3);assert(g.boss.z>100);g.draw();g.player.x=tx;g.player.y=ty;g.player.inv=0;g.updateBoss(.36);assert.equal(g.boss.mode,'slam');assert.equal(g.player.hp,4);g.draw();
math.random=()=>.99;g.beginBossAttack();assert.equal(g.boss.mode,'volleyReady');g.updateBoss(.24);assert.equal(g.shots.length,7);assert(!g.boss.combo);math.random=random;
// Actual boss defeat presents both choices without restarting or saving prematurely.
g.boss.hp=1;g.boss.mode='recover';g.player.x=g.boss.x;g.player.y=g.boss.y;g.player.cool=0;g.player.inv=100;g.slash();g.update(.01);assert.equal(g.state,'win');assert.equal(element('#exit').hidden,false);assert(!storage.has('cache-goblin-runs'));
const bank=g.score,gear=g.player.weapon;events['#startclick']();assert.equal(g.loop,2);assert.equal(g.score,bank);assert.equal(g.player.weapon,gear);assert.equal(g.collected,0);assert.equal(g.player.hp,6);assert.equal(g.dropsSpawned,2);assert.equal(g.enemies.length,5);
clearCrypt(g);assert.equal(g.dropsSpawned,2);g.boss.hp=0;g.update(.01);assert.equal(g.state,'win');events['#exitclick']();assert.equal(g.state,'exited');assert.equal(element('#exit').hidden,true);
const records=JSON.parse(storage.get('cache-goblin-runs'));assert.equal(records[0].loops,2);assert.equal(records[0].score,g.score);assert.equal(records[0].reason,'escaped');g.exitCrypt();assert.equal(JSON.parse(storage.get('cache-goblin-runs')).length,1);
const reloaded=harness();assert(reloaded.element('#records').textContent.includes(String(g.score)));assert(reloaded.element('#best').textContent.includes(String(g.score)));
g.start();assert.equal(g.loop,1);assert.equal(g.score,0);assert.equal(g.player.weapon,0);assert.equal(g.dropsSpawned,1);for(let i=0;i<6;i++){g.player.inv=0;g.hurt()}assert.equal(g.state,'lose');
const denied=harness(true);denied.g.start();denied.g.finish(true);denied.g.exitCrypt();assert(denied.element('#description').innerHTML.includes('Storage unavailable'));
// Touch can move, attack, and dash simultaneously; releasing one finger keeps the others.
g.start();
const pointer=(id,x=62,y=62)=>({pointerId:id,clientX:x,clientY:y,preventDefault(){}});
events['#joystickpointerdown'](pointer(1,100,62));events['#attackpointerdown'](pointer(2));events['#dashpointerdown'](pointer(3));
const touchX=g.player.x;g.update(.01);assert(g.player.x>touchX);assert(g.player.slash>0);assert(g.player.dash>0);
events['#dashpointerup'](pointer(3));assert(g.down(' '));assert(!g.down('shift'));events['#attackpointercancel'](pointer(2));assert(!g.down(' '));
events['#joystickpointercancel'](pointer(1));assert.equal(element('#stick-knob').style.transform,'translate(0px,0px)');
events['#attackpointerdown'](pointer(4));events['#pause-touchclick']();assert.equal(g.state,'paused');assert(!g.down(' '));events['#pause-touchclick']();assert.equal(g.state,'playing');
events['#joystickpointerdown'](pointer(5,90,40));events['windowresize']();assert.equal(element('#stick-knob').style.transform,'translate(0px,0px)');
// Previous scores are retained by the one-time legacy-key migration.
storage.clear();storage.set('coin-goblin-best','12345');storage.set('coin-goblin-runs',JSON.stringify([{score:12345,loops:1}]));const migrated=harness();assert(migrated.element('#best').textContent.includes('12345'));assert.equal(storage.get('cache-goblin-best'),'12345');assert(migrated.element('#records').textContent.includes('12345'));
assert(!source.includes('drawBossTell'));assert(!source.includes('STRIKE NOW'));assert(!source.includes('MOVE!'));
console.log('PASS: movement, pause, dash, damage cooldown, 50-coin gate, continuous scaled spawning, two-drop run cap across loops, hammer balance, proportional scaling, random attacks and repeats, bounded rapid combos, melee damage, jump targeting/immunity/slam, volleys, victory choice, continued difficulty, exit save, reload persistence, defeat, reset, storage failure, legacy save migration, simultaneous mobile inputs/cancel/pause/rotation, and rendering smoke checks.');

// Device capabilities determine the initial controls, not window width.
const desktop=harness();assert.equal(desktop.body.dataset.input,'desktop');assert(desktop.element('#hint').textContent.startsWith('PRESS ENTER'));
const phone=harness(false,{coarse:true,fine:false,touches:5});assert.equal(phone.body.dataset.input,'touch');assert(phone.element('#hint').textContent.startsWith('TAP'));
const fallback=harness(false,{coarse:false,fine:false,touches:5});assert.equal(fallback.body.dataset.input,'touch');
const hybrid=harness(false,{coarse:false,fine:true,touches:10});assert.equal(hybrid.body.dataset.input,'desktop');
hybrid.events.windowpointerdown({pointerType:'touch'});assert.equal(hybrid.body.dataset.input,'touch');
hybrid.events.windowpointerdown({pointerType:'mouse',target:{closest:()=>true}});assert.equal(hybrid.body.dataset.input,'touch');
hybrid.events.windowpointerdown({pointerType:'mouse',target:{closest:()=>null}});assert.equal(hybrid.body.dataset.input,'desktop');
hybrid.events.windowpointerdown({pointerType:'pen'});assert.equal(hybrid.body.dataset.input,'touch');
hybrid.g.start();hybrid.events['#attackpointerdown'](pointer(10));assert(hybrid.g.down(' '));
hybrid.events.windowkeydown({key:'w',preventDefault(){}});assert.equal(hybrid.body.dataset.input,'desktop');assert(!hybrid.g.down(' '));assert(hybrid.g.down('w'));
hybrid.events.windowpointerdown({pointerType:'touch'});assert(!hybrid.g.down('w'));assert.equal(hybrid.body.dataset.input,'touch');hybrid.g.pause();assert(hybrid.element('#hint').textContent.includes('TAP THE BUTTON TO RESUME'));
const coarse=hybrid.media.get('(pointer: coarse)'),fine=hybrid.media.get('(pointer: fine) and (hover: hover)');coarse.matches=true;fine.matches=false;coarse.change();assert.equal(hybrid.body.dataset.input,'touch');coarse.matches=false;fine.matches=true;fine.change();assert.equal(hybrid.body.dataset.input,'desktop');
const css=fs.readFileSync(__dirname+'/style.css','utf8');assert(!css.includes('@media(any-pointer:coarse),(max-width:760px)'));assert(css.includes('body[data-input="touch"] .touch'));assert(css.includes('body[data-input="touch"] .controls{display:none}'));
console.log('PASS: desktop, phone, tablet fallback, hybrid laptop, pen, mouse/keyboard switching, input cleanup, prompts, and connected-device changes.');

// Return home preserves the saved defeat and allows a clean new run.
const home=harness();home.g.start();home.g.finish(false);assert.equal(home.element('#home').hidden,false);
const savedBeforeHome=storage.get('cache-goblin-runs');
let prevented=false;home.events.windowkeydown({key:'Enter',target:{closest:()=>true},preventDefault(){prevented=true}});assert.equal(prevented,false);assert.equal(home.g.state,'lose');
home.events['#homeclick']();assert.equal(home.g.state,'title');assert.equal(home.g.player,null);assert.equal(home.element('#home').hidden,true);assert.equal(home.element('#exit').hidden,true);assert.equal(storage.get('cache-goblin-runs'),savedBeforeHome);assert(home.element('#start').textContent.includes('ENTER THE CRYPT'));home.g.draw();
home.events['#startclick']();assert.equal(home.g.state,'playing');assert.equal(home.g.player.hp,6);assert.equal(home.g.collected,0);assert.equal(home.g.score,0);
console.log('PASS: game-over home button, keyboard activation, preserved score, restored home screen, and new run.');

// Spawning never waits for a clear, freezes in menus, and respects the active cap.
const spawn=harness();spawn.g.start();const initial=spawn.g.enemies.length;spawn.g.player.inv=100;spawn.g.update(1.3);assert.equal(spawn.g.enemies.length,initial+1);
const baseline=spawn.g.spawnSettings();spawn.g.equipWeapon(3);assert(spawn.g.spawnSettings().cap>baseline.cap);assert(spawn.g.spawnSettings().interval<baseline.interval);
for(let i=0;i<100;i++)spawn.g.spawnGoblin();assert.equal(spawn.g.enemies.length,spawn.g.spawnSettings().cap);
spawn.g.pause();const timer=spawn.g.spawnTimer;spawn.g.update(10);assert.equal(spawn.g.spawnTimer,timer);spawn.g.pause();
// Reduced drops plus a guaranteed coin after three misses; no drops beyond the target.
const loot=harness();loot.g.start();loot.math.random=()=>.99;const lootPoint={x:100,y:100};
for(let i=0;i<3;i++)loot.g.rewardGoblin(lootPoint);assert.equal(loot.g.coins.length,0);loot.g.rewardGoblin(lootPoint);assert.equal(loot.g.coins.length,1);
loot.math.random=()=>0;for(let i=0;i<100;i++)loot.g.rewardGoblin(lootPoint);assert.equal(loot.g.coins.length,50);assert.equal(loot.g.boss,null);
// 49 coins must be collected before the final coin can open the fight.
loot.g.coins.forEach((c,i)=>{c.x=i===49?850:480;c.y=i===49?400:330});loot.g.player.inv=100;loot.g.update(.01);assert.equal(loot.g.collected,49);assert.equal(loot.g.boss,null);assert.equal(loot.g.dropsSpawned,2);
loot.g.player.x=850;loot.g.player.y=400;loot.g.update(.01);assert.equal(loot.g.collected,50);assert(loot.g.boss);const bossCount=loot.g.enemies.length;loot.g.update(3);assert.equal(loot.g.enemies.length,bossCount);
// Clean kills add increasing bonus points, actual hits reset the streak, immunity does not.
const clean=harness();clean.g.start();clean.math.random=()=>.99;clean.g.rewardGoblin(lootPoint);assert.equal(clean.g.score,110);clean.g.rewardGoblin(lootPoint);assert.equal(clean.g.score,230);assert.equal(clean.g.cleanBonus,30);
clean.g.player.dash=.2;clean.g.hurt();assert.equal(clean.g.cleanStreak,2);clean.g.player.dash=0;clean.g.hurt();assert.equal(clean.g.cleanStreak,0);assert.equal(clean.g.loopHits,1);clean.g.hurt();assert.equal(clean.g.loopHits,1);clean.g.rewardGoblin(lootPoint);assert.equal(clean.g.score,340);
const levelHits=clean.g.loopHits;clean.g.player.hp=6;assert.equal(clean.g.loopHits,levelHits);
// A flawless loop awards both milestone bonuses; taking boss damage removes both.
const flawless=harness();flawless.g.start();clearCrypt(flawless.g);const preWin=flawless.g.score;flawless.g.boss.hp=0;flawless.g.update(.01);assert.equal(flawless.g.score-preWin,1500+600+2000);
const damaged=harness();damaged.g.start();clearCrypt(damaged.g);damaged.g.player.inv=0;damaged.g.hurt();const preDamaged=damaged.g.score;damaged.g.boss.hp=0;damaged.g.update(.01);assert.equal(damaged.g.score-preDamaged,1500+500);
console.log('PASS: continuous spawn timing/cap/scaling, pause freeze, reduced drops with bad-luck protection, exact collection gate, clean streak scoring, damage reset, immunity, and flawless bonuses.');
