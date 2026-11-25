import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { CARS, MAPS, MODES, UPGRADE_TYPES } from './data.js';
import { loadSave, saveGame, upgradeCost, todayKey } from './storage.js';
import { AudioEngine } from './audio.js';
import { WorldBuilder, createCoinMaterial } from './world.js';
import { CarController, createCarVisual } from './car.js';
import './style.css';

const canvas = document.querySelector('#game-canvas');
const uiRoot = document.querySelector('#ui-root');
const save = loadSave();
const audio = new AudioEngine();
const state = {
  screen:'home', mode:'world', mapId:'city', running:false, paused:false,
  renderer:null, scene:null, camera:null, physics:null, worldBuilder:null, worldInfo:null, car:null,
  preview:null, previewRoot:null, lastTime:0, elapsed:0, raceTime:0, raceReward:0,
  totalScore:0, bossDamageCooldown:0, bossDefeated:false, finishDistance:0,
  eventTimer:24, activeEvent:null, eventObjects:[], cinematic:null, chest:null,
  toastTimer:0, garageCarId:null, worldReady:false, initializing:true, quality:save.settings.quality||'auto'
};
const input = { throttle:false, brake:false, left:false, right:false, jump:false, nitro:false, ability:false, drift:false, reverse:false };
const heldKeys = new Set();
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const fmt=(n)=>Math.floor(n).toLocaleString('en-US');
const isSecret=()=>!!save.secretActive;
const mapById=(id)=>MAPS.find(m=>m.id===id)||MAPS[0];
const carById=(id)=>CARS.find(c=>c.id===id)||CARS[0];

function toast(message, kind='') {
  let el=document.querySelector('.toast');
  if(!el){el=document.createElement('div');el.className='toast';uiRoot.appendChild(el);}
  el.textContent=message; el.className=`toast show ${kind}`;
  if(el._hideTimer)clearTimeout(el._hideTimer);
  el._hideTimer=setTimeout(()=>el.classList.remove('show'),2300);
  state.toastTimer=2.3;
}
function persist(){saveGame(save); updateCurrency();}
function addCoins(amount){
  const n=Math.max(0,Math.floor(amount)); save.coins+=n; save.totalCoinsEarned+=n; persist();
}
function addGems(amount){save.gems+=Math.max(0,Math.floor(amount));persist();}
function updateCurrency(){
  const c=document.querySelector('#currency-coins'); const g=document.querySelector('#currency-gems');
  if(c)c.textContent=fmt(save.coins); if(g)g.textContent=fmt(save.gems);
}
function applyTheme(){
  uiRoot.classList.toggle('hell',isSecret());
  document.documentElement.style.setProperty('--accent',isSecret()?'#d52c35':'#ff755e');
  document.documentElement.style.setProperty('--accent-2',isSecret()?'#f3bb4b':'#a7e4e4');
  document.title=isSecret()?'STUPID RACING // 1529':'STUPID RACING';
}

async function boot(){
  try{
    const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
    const coarse=window.matchMedia?.('(pointer:coarse)').matches||false;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,coarse?1.25:1.7));
    renderer.setSize(window.innerWidth,window.innerHeight);
    renderer.shadowMap.enabled=!coarse; renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    renderer.outputColorSpace=THREE.SRGBColorSpace;
    renderer.toneMapping=THREE.ACESFilmicToneMapping; renderer.toneMappingExposure=1.18;
    state.renderer=renderer;
    const scene=new THREE.Scene(); scene.background=new THREE.Color(isSecret()?0x170910:0x202531); state.scene=scene;
    const camera=new THREE.PerspectiveCamera(62,window.innerWidth/window.innerHeight,.1,2400);
    camera.position.set(0,10,19); state.camera=camera;
    await RAPIER.init();
    state.RAPIER=RAPIER;
    state.worldReady=true; state.initializing=false;
    createShowroom();
    renderScreen('home');
    window.__STUPID_RACING_READY?.();
    audio.setEnabled(save.settings.audio!==false);
    renderer.setAnimationLoop(animate);
  }catch(err){
    console.error(err); state.initializing=false;
    renderFatal(err);
  }
}

function createShowroom(){
  const scene=state.scene;
  if(state.previewRoot){state.previewRoot.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material){const list=Array.isArray(o.material)?o.material:[o.material];for(const m of list)m.dispose();}});scene.remove(state.previewRoot);}
  const root=new THREE.Group();state.previewRoot=root;scene.add(root);
  scene.background=new THREE.Color(isSecret()?0x16070d:0x181d27);
  scene.fog=new THREE.Fog(isSecret()?0x2c0a13:0x232936,35,110);
  root.add(new THREE.HemisphereLight(isSecret()?0x80333d:0xd8e5ff,0x2c2930,1.3));
  const key=new THREE.DirectionalLight(isSecret()?0xff5b37:0xffdfc5,2.3);key.position.set(-8,15,8);key.castShadow=true;key.shadow.mapSize.set(1024,1024);root.add(key);
  const spot=new THREE.PointLight(isSecret()?0xff2b38:0xff795d,26,60,2);spot.position.set(3,5,-4);root.add(spot);
  const floor=new THREE.Mesh(new THREE.CircleGeometry(25,64),new THREE.MeshStandardMaterial({color:isSecret()?0x271017:0x333944,roughness:.68,metalness:.25}));
  floor.rotation.x=-Math.PI/2;floor.position.y=-1.5;floor.receiveShadow=true;root.add(floor);
  const ring=new THREE.Mesh(new THREE.TorusGeometry(8,.12,12,80),new THREE.MeshStandardMaterial({color:isSecret()?0xb92b35:0x8e9ba7,metalness:.7,roughness:.28,emissive:isSecret()?0x35070c:0x111820,emissiveIntensity:.3}));ring.rotation.x=Math.PI/2;ring.position.y=-1.25;root.add(ring);
  for(let i=0;i<12;i++){
    const a=i/12*Math.PI*2;
    const pillar=new THREE.Mesh(new THREE.BoxGeometry(1.2,5+Math.sin(i)*1.3,1.2),new THREE.MeshStandardMaterial({color:isSecret()?0x421c24:0x404958,roughness:.72,metalness:.22}));
    pillar.position.set(Math.cos(a)*17,1,Math.sin(a)*17);pillar.rotation.y=-a;pillar.castShadow=true;root.add(pillar);
    if(isSecret()){
      const cap=new THREE.Mesh(new THREE.TorusGeometry(1,.14,8,24),new THREE.MeshStandardMaterial({color:0xc42b31,emissive:0x5c0d13,emissiveIntensity:.6,metalness:.45}));cap.position.copy(pillar.position);cap.position.y+=3;root.add(cap);
    }
  }
  const previewCarId=state.screen==='garage'?(state.garageCarId||save.selectedCar):save.selectedCar;
  const car=createCarVisual(carById(previewCarId),isSecret(),save.selectedSkin);car.position.set(0,0,0);root.add(car);state.preview=car;
  state.camera.position.set(10,7,15);state.camera.lookAt(0,1,0);
}

function renderFatal(err){
  uiRoot.innerHTML=`<div class="fatal-screen"><div class="eyebrow">STUPID RACING // BOOT ERROR</div><h1>THE ENGINE DID NOT START.</h1><p>The browser could not initialize the 3D renderer or physics engine.</p><pre>${String(err?.message||err).replace(/[<>&]/g,'')}</pre><p>Try the latest Safari / Chrome with WebGL enabled.</p><button class="btn primary" data-action="reload">RELOAD</button></div>`;
  window.__STUPID_RACING_READY?.();
}

function topBar(){return `<div class="topbar"><div class="brand-mark"><span class="brand-dot"></span> STUPID <b>RACING</b></div><div class="currency-row"><div class="currency coin-currency"><span class="coin-icon">${isSecret()?'1529':'¢'}</span><b id="currency-coins">${fmt(save.coins)}</b></div><div class="currency gem-currency"><span class="gem-icon">◆</span><b id="currency-gems">${fmt(save.gems)}</b></div></div></div>`;}
function navButtons(active){return `<nav class="nav-row">${[['home','HOME'],['maps','MAPS'],['garage','GARAGE'],['shop','SHOP'],['records','RECORDS']].map(([id,label])=>`<button class="nav-btn ${active===id?'active':''}" data-action="screen" data-screen="${id}">${label}</button>`).join('')}</nav>`;}

function renderScreen(screen){
  state.screen=screen; state.running=false; state.paused=false;
  if(screen==='garage'&&!state.garageCarId)state.garageCarId=save.selectedCar;
  applyTheme();
  if(!state.scene) return;
  if(state.physics||state.car||state.worldBuilder) cleanupGame();
  state.activeEvent=null;clearEvents();
  canvas.classList.remove('game-active');
  createShowroom();
  let content='';
  if(screen==='home')content=homeScreen();
  if(screen==='maps')content=mapsScreen();
  if(screen==='garage')content=garageScreen();
  if(screen==='shop')content=shopScreen();
  if(screen==='records')content=recordsScreen();
  uiRoot.innerHTML=`${topBar()}<main class="menu-shell">${navButtons(screen)}${content}</main><div class="version-tag">V1.0 // WEB BUILD</div>`;
  updateCurrency();
}

function homeScreen(){
  const mode=MODES.find(m=>m.id===state.mode)||MODES[0];
  const map=mapById(state.mapId);
  return `<section class="home-layout"><div class="hero-copy"><div class="eyebrow">NOT A NORMAL RACING GAME</div><h1 class="hero-title">STUPID<br><span>RACING</span><i>™</i></h1><p class="hero-description">Fast cars. Bad decisions.<br>Unreasonably serious physics.</p><div class="home-actions"><button class="btn primary huge" data-action="play">START RACE <span>↗</span></button><button class="btn ghost" data-action="screen" data-screen="maps">SELECT TRACK</button></div><div class="selected-strip"><div><small>SELECTED TRACK</small><b>${map.name}</b></div><div class="strip-divider"></div><div><small>GAME MODE</small><b>${mode.name}</b></div><button class="tiny-edit" data-action="screen" data-screen="maps">EDIT ↗</button></div></div><div class="hero-side"><div class="hero-art-label"><span class="live-dot"></span> GARAGE PREVIEW <span>01 / 08</span></div><div class="hero-tip">${carById(save.selectedCar).name}<small>${carById(save.selectedCar).ability}</small></div><div class="quick-mode"><div class="section-kicker">QUICK MODES</div><div class="mode-grid">${MODES.map(m=>`<button class="mode-chip ${state.mode===m.id?'selected':''}" data-action="mode" data-id="${m.id}"><b>${m.name}</b><small>${m.desc}</small></button>`).join('')}</div></div></div></section><section class="bottom-actions"><button class="feature-card secret-card" data-action="secret-modal"><span class="feature-symbol">⌘</span><span><b>SECRET CODE</b><small>Some doors are not on the map.</small></span><span class="feature-arrow">↗</span></button><button class="feature-card" data-action="screen" data-screen="records"><span class="feature-symbol">✦</span><span><b>DAILY + ACHIEVEMENTS</b><small>Make questionable progress.</small></span><span class="feature-arrow">↗</span></button><button class="feature-card" data-action="screen" data-screen="shop"><span class="feature-symbol">▣</span><span><b>UPGRADE BAY</b><small>More speed. Fewer excuses.</small></span><span class="feature-arrow">↗</span></button></section>`;
}

function mapsScreen(){
  return `<section class="page-heading"><div><div class="eyebrow">PICK YOUR PROBLEM</div><h1>THE WORLD IS<br><span>YOUR TRACK.</span></h1></div><p>Every map has a boss, a unique environment and a different way to ruin your afternoon.</p></section><div class="map-grid">${MAPS.filter(m=>!m.secret||isSecret()).map((m,i)=>{
    const unlocked=save.unlockedMaps.includes(m.id)||m.id==='abyss'&&isSecret();
    return `<button class="map-card ${state.mapId===m.id?'chosen':''} ${unlocked?'':'locked'} ${m.secret?'abyss-card':''}" data-action="select-map" data-id="${m.id}" ${unlocked?'':'disabled'}><div class="map-art art-${m.id}"><span class="map-index">0${i+1}</span><span class="map-state">${unlocked?'AVAILABLE':'LOCKED'}</span><div class="map-art-mark">${m.secret?'✦':m.id==='city'?'▦':m.id==='prehistoric'?'◢':m.id==='desert'?'◌':m.id==='night'?'⌁':'▤'}</div></div><div class="map-info"><div><h3>${m.name}</h3><p>${m.sub}</p></div><span class="map-arrow">↗</span></div><div class="map-boss"><small>${m.secret?'SECRET ROUTE':'BOSS'}</small><b>${m.boss||'THE ABYSS'}</b></div></button>`;
  }).join('')}</div><div class="page-footer"><span>SELECTED: <b>${mapById(state.mapId).name}</b></span><button class="btn primary" data-action="play">DRIVE THIS TRACK ↗</button></div>`;
}

function garageScreen(){
  const car=carById(state.garageCarId||save.selectedCar); const owned=save.ownedCars.includes(car.id); const upgrades=save.upgrades[car.id];
  const currentIndex=CARS.findIndex(c=>c.id===car.id);
  return `<section class="page-heading compact"><div><div class="eyebrow">YOUR VERY BAD IDEAS</div><h1>THE <span>GARAGE.</span></h1></div><p>Eight highly questionable vehicles. Each one drives differently and has its own special move.</p></section><section class="garage-layout"><div class="garage-selector"><button class="car-arrow" data-action="car-prev">←</button><div class="garage-model"><div class="model-number">0${currentIndex+1} / 08</div><div class="model-name">${car.name}</div><div class="model-status">${owned?'OWNED VEHICLE':'LOCKED VEHICLE'}</div></div><button class="car-arrow" data-action="car-next">→</button><div class="car-thumbs">${CARS.map((c,i)=>`<button class="car-thumb ${c.id===car.id?'active':''} ${save.ownedCars.includes(c.id)?'owned':''}" data-action="select-car" data-id="${c.id}"><span>0${i+1}</span><b>${c.name}</b></button>`).join('')}</div></div><div class="garage-details"><div class="detail-top"><div><div class="eyebrow">VEHICLE PROFILE</div><h2>${car.name}</h2><p>${car.abilityText}</p></div><div class="ability-badge"><small>SPECIAL ABILITY</small><b>${car.ability}</b></div></div><div class="stat-list">${[['TOP SPEED',car.speed+upgrades.engine*2.2,35],['ACCELERATION',car.accel*(1+upgrades.engine*.08),30],['HANDLING',car.grip+upgrades.handling*1.1,17],['WEIGHT',car.weight,560]].map(([n,val,max])=>`<div class="stat-row"><span>${n}</span><div class="stat-track"><i style="width:${clamp(val/max*100,5,100)}%"></i></div><b>${Math.round(val)}</b></div>`).join('')}</div><div class="garage-upgrade-preview"><div><b>PERFORMANCE UPGRADES</b><small>Five levels per category</small></div><button class="text-link" data-action="screen" data-screen="shop">OPEN SHOP ↗</button></div><div class="upgrade-mini">${UPGRADE_TYPES.map(u=>`<div><span>${u.name}</span><b>${upgrades[u.id]}/5</b></div>`).join('')}</div>${owned?`<button class="btn primary full" data-action="use-car" data-id="${car.id}">${save.selectedCar===car.id?'CURRENTLY SELECTED':'SELECT VEHICLE'}</button>`:`<button class="btn primary full" data-action="buy-car" data-id="${car.id}">BUY VEHICLE · ${fmt(car.price)} COINS</button>`}</div></section>`;
}

function shopScreen(){
  const car=carById(save.selectedCar),levels=save.upgrades[car.id];
  return `<section class="page-heading compact"><div><div class="eyebrow">SPEND IT LIKE YOU STOLE IT</div><h1>THE <span>WORKSHOP.</span></h1></div><p>Everything here is a real purchase. Your upgrades and cosmetics are saved to this browser.</p></section><div class="shop-car-line"><span>UPGRADING: <b>${car.name}</b></span><button class="text-link" data-action="screen" data-screen="garage">CHANGE VEHICLE ↗</button></div><div class="shop-layout"><div class="shop-upgrades"><div class="shop-section-title"><h2>PERFORMANCE</h2><small>LEVEL 0 — 5</small></div>${UPGRADE_TYPES.map(u=>{
    const level=levels[u.id]||0,cost=upgradeCost(u.id,level),max=level>=5;
    return `<div class="upgrade-card"><div class="upgrade-icon">${({engine:'↗',nitro:'ϟ',handling:'⌁',suspension:'↕',ability:'✦'})[u.id]}</div><div class="upgrade-copy"><b>${u.name}</b><small>${u.desc}</small><div class="level-pips">${[1,2,3,4,5].map(n=>`<i class="${n<=level?'filled':''}"></i>`).join('')}</div></div><button class="btn small ${max?'muted':'outline'}" data-action="buy-upgrade" data-id="${u.id}" ${max?'disabled':''}>${max?'MAXED':fmt(cost)+' ¢'}</button></div>`;
  }).join('')}</div><div class="shop-cosmetics"><div class="shop-section-title"><h2>PAINT BAY</h2><small>VISUAL CUSTOMS</small></div><div class="skin-grid">${[
    ['factory','FACTORY',0xaebbc3,0],['candy','CANDY SHIFT',0xff75b5,450],['midnight','MIDNIGHT',0x282d3a,650],['gold','GOLD STANDARD',0xd9a929,1200],['hazard','HAZARD TAPE',0xe5bc21,850],['traffic','TRAFFIC KING',0xc63a34,null],['fossil','FOSSIL FURY',0x65794f,null],['plastic','PLASTIC POP',0xffa3bc,null],['protocol','PROTOCOL BLUE',0x1c284d,null],['manager','MANAGER GREY',0x76746b,null],...(isSecret()?[['abyss','ABYSSAL',0x241016,null]]:[])
  ].map(([id,label,color,price])=>{const owned=save.skins.includes(id),bossOnly=price===null&&!owned;return `<button class="skin-card ${save.selectedSkin===id?'selected':''}" data-action="skin" data-id="${id}" ${bossOnly?'disabled':''}><span class="skin-swatch" style="--swatch:#${Number(color).toString(16).padStart(6,'0')}"></span><b>${label}</b><small>${owned?(save.selectedSkin===id?'EQUIPPED':'OWNED'):bossOnly?'BOSS REWARD':fmt(price)+' COINS'}</small></button>`;}).join('')}</div><div class="wheel-custom"><div><b>WHEEL SET</b><small>Standard alloy · included</small></div><span class="wheel-preview">◉ ◉</span></div><div class="shop-note"><b>GEMS</b><span>◆ ${fmt(save.gems)}</span><small>Daily challenges and boss clears award gems. More items coming to the bay.</small></div></div></div>`;
}

function recordsScreen(){
  const today=todayKey();
  const daily=save.daily.date===today?save.daily.done:false;
  const achievements=[
    ['first-drive','FIRST DAY AT THE TRACK','Complete your first race',save.races>=1],
    ['boss-one','BOSS PROBLEM','Defeat a map boss',save.bossWins>=1],
    ['collector','LOOSE CHANGE','Collect 1,000 coins',save.totalCoinsEarned>=1000],
    ['car-fan','CAR PARK','Own four vehicles',save.ownedCars.length>=4],
    ['abyss','GOD OF THIS GAME','Claim the Abyss reward',save.abyssRewardClaimed]
  ];
  return `<section class="page-heading compact"><div><div class="eyebrow">A RECORD OF YOUR POOR JUDGMENT</div><h1>PROGRESS <span>REPORT.</span></h1></div><p>Challenges, trophies and the occasional reminder that you have been driving for a while.</p></section><div class="records-grid"><section class="daily-card"><div class="daily-head"><div class="eyebrow">TODAY'S ASSIGNMENT</div><span class="live-dot"></span></div><div class="daily-symbol">✦</div><h2>THE DAILY COMMUTE</h2><p>Finish one race and collect at least 3 coins. No excuses, the road is right there.</p><div class="daily-reward"><span>REWARD</span><b>350 COINS + 3 GEMS</b></div><div class="daily-status ${daily?'complete':''}">${daily?'COMPLETED TODAY':'NOT COMPLETED'}</div><button class="btn primary full" data-action="daily-play" ${daily?'disabled':''}>${daily?'COME BACK TOMORROW':'START DAILY CHALLENGE'}</button></section><section class="achievement-panel"><div class="shop-section-title"><h2>ACHIEVEMENTS</h2><small>${achievements.filter(a=>a[3]).length} / ${achievements.length} UNLOCKED</small></div>${achievements.map(([id,name,desc,done])=>`<div class="achievement-row ${done?'done':''}"><div class="achievement-icon">${done?'✦':'◇'}</div><div><b>${name}</b><small>${desc}</small></div><span>${done?'UNLOCKED':'LOCKED'}</span></div>`).join('')}<div class="stats-footer"><div><small>RACES</small><b>${fmt(save.races)}</b></div><div><small>BOSSES</small><b>${fmt(save.bossWins)}</b></div><div><small>COINS EARNED</small><b>${fmt(save.totalCoinsEarned)}</b></div><div><small>VEHICLES</small><b>${save.ownedCars.length}/8</b></div></div></section></div>`;
}

function renderSecretModal(){
  const wrap=document.createElement('div');wrap.className='modal-backdrop';wrap.innerHTML=`<div class="modal-card"><button class="modal-close" data-action="close-modal">×</button><div class="eyebrow">UNLISTED ACCESS TERMINAL</div><h2>SECRET <span>CODE.</span></h2><p>Four digits. One very questionable decision.</p><form id="secret-form"><input id="secret-input" type="password" inputmode="numeric" maxlength="4" autocomplete="off" placeholder="••••"/><button class="btn primary full" type="submit">UNLOCK</button></form><small class="modal-hint">THE CODE IS NOT IN THE MANUAL.</small></div>`;
  uiRoot.appendChild(wrap);wrap.querySelector('input').focus();
  wrap.querySelector('form').addEventListener('submit',(e)=>{e.preventDefault();const val=wrap.querySelector('input').value.trim();if(val==='1529'){save.secretActive=true;if(!save.unlockedMaps.includes('abyss'))save.unlockedMaps.push('abyss');persist();audio.setMood(true);audio.sfx('unlock');wrap.remove();applyTheme();state.mapId='abyss';renderScreen('maps');toast('ACCESS GRANTED // THE ABYSS IS OPEN');}else{audio.sfx('hit');wrap.querySelector('input').classList.add('wrong');toast('ACCESS DENIED');setTimeout(()=>wrap.querySelector('input')?.classList.remove('wrong'),450);}});
}

function renderGameHud(){
  uiRoot.innerHTML=`<div class="game-hud"><div class="hud-top"><div class="hud-brand"><span class="brand-dot"></span> STUPID RACING <small id="hud-mode">${mapById(state.mapId).name} // ${state.mode.toUpperCase()}</small></div><div class="hud-right"><div class="hud-coin"><span>${isSecret()?'1529':'¢'}</span><b id="hud-coins">${fmt(save.coins)}</b></div><button class="pause-btn" data-action="pause">Ⅱ</button></div></div><div class="hud-progress"><div><small id="hud-objective">${state.mode==='boss'?'DEFEAT THE BOSS':'RACE IN PROGRESS'}</small><b id="hud-message">${mapById(state.mapId).event}</b></div><div class="speed-panel"><b id="hud-speed">000</b><small>KM/H</small></div></div><div class="boss-hud" id="boss-hud" hidden><div class="boss-head"><span id="boss-name">BOSS</span><b id="boss-phase">PHASE 01</b></div><div class="boss-bar"><i id="boss-health"></i></div></div><div class="hud-bottom"><div class="nitro-wrap"><div class="nitro-label"><span>NITRO</span><b id="nitro-text">100%</b></div><div class="nitro-track"><i id="nitro-fill"></i></div></div><div class="race-timer" id="race-timer">00:00</div><div class="ability-hud"><b id="ability-name">ABILITY</b><small id="ability-cooldown">READY · E</small></div></div><div class="mobile-controls" id="mobile-controls"><div class="control-cluster steer-cluster"><button data-control="left">◀</button><button data-control="right">▶</button></div><div class="control-cluster pedal-cluster"><button data-control="brake" class="brake-control">BRAKE</button><button data-control="throttle" class="gas-control">GO</button></div><div class="action-cluster"><button data-control="drift" class="drift-control">DRIFT</button><button data-control="jump">JUMP</button><button data-control="nitro" class="nitro-control">NITRO</button><button data-control="ability" class="ability-control">E</button></div></div></div>`;
  const boss=state.worldInfo?.boss;
  if(boss){const b=document.querySelector('#boss-hud');b.hidden=false;document.querySelector('#boss-name').textContent=b.data.name;}
  const ability=carById(save.selectedCar).ability;document.querySelector('#ability-name').textContent=ability;
  updateHud();
}

function showPause(){
  state.paused=true;state.running=false;
  const panel=document.createElement('div');panel.className='overlay-panel pause-overlay';panel.id='pause-overlay';
  panel.innerHTML=`<div class="eyebrow">PIT STOP</div><h2>TAKE A <span>BREATHER.</span></h2><p>The road will still be questionable when you get back.</p><div class="pause-actions"><button class="btn primary full" data-action="resume">RESUME RACE</button><button class="btn outline full" data-action="restart">RESTART</button><button class="btn ghost full" data-action="quit">MAIN MENU</button></div>`;
  uiRoot.appendChild(panel);
}
function showEndScreen(title,subtitle,reward,success=true){
  state.running=false;state.paused=true;
  const panel=document.createElement('div');panel.className='overlay-panel end-overlay';panel.id='end-overlay';
  panel.innerHTML=`<div class="eyebrow">${success?'RUN COMPLETE':'RUN OVER'}</div><h2>${title}</h2><p>${subtitle}</p><div class="end-reward"><small>REWARD</small><b>+${fmt(reward)} COINS</b></div><button class="btn primary full" data-action="run-again">RUN AGAIN</button><button class="btn ghost full" data-action="quit">MAIN MENU</button>`;
  uiRoot.appendChild(panel);
}
function showAbyssWin(){
  const panel=document.createElement('div');panel.className='abyss-win';panel.id='abyss-win';
  panel.innerHTML=`<div class="win-kicker">THE ABYSS HAS ACCEPTED YOU</div><h1>YOU ARE THE<br><span>GOD OF THIS GAME.</span></h1><div class="win-reward">+999,999,999 <small>COINS</small></div><p>THE TREASURE IS REAL. THE SAVE IS PERMANENT.</p><button class="btn primary" data-action="claim-continue">RETURN TO THE GARAGE ↗</button>`;
  uiRoot.appendChild(panel);
}

function setInput(key,value){input[key]=value;}
function releaseAll(){for(const k of Object.keys(input))input[k]=false;heldKeys.clear();}

function setupControlEvents(){
  uiRoot.addEventListener('pointerdown',(e)=>{
    const b=e.target.closest('[data-control]');if(!b)return;
    e.preventDefault();b.classList.add('pressed');setInput(b.dataset.control,true);
    try{b.setPointerCapture(e.pointerId);}catch{}
  });
  const release=(e)=>{
    const b=e.target?.closest?.('[data-control]');
    if(b){b.classList.remove('pressed');setInput(b.dataset.control,false);}
  };
  uiRoot.addEventListener('pointerup',release);uiRoot.addEventListener('pointercancel',release);uiRoot.addEventListener('lostpointercapture',release);
  uiRoot.addEventListener('click',(e)=>{
    const btn=e.target.closest('[data-action]');if(!btn)return;
    const action=btn.dataset.action;
    if(action==='screen')renderScreen(btn.dataset.screen);
    else if(action==='play')startGame(state.mapId,state.mode);
    else if(action==='mode'){state.mode=btn.dataset.id;audio.sfx('click');renderScreen('home');}
    else if(action==='select-map'){state.mapId=btn.dataset.id;audio.sfx('click');renderScreen('maps');}
    else if(action==='secret-modal')renderSecretModal();
    else if(action==='close-modal')btn.closest('.modal-backdrop')?.remove();
    else if(action==='car-prev'||action==='car-next')cycleCar(action==='car-next'?1:-1);
    else if(action==='select-car'){state.garageCarId=btn.dataset.id;audio.sfx('click');renderScreen('garage');}
    else if(action==='use-car'){const id=btn.dataset.id||state.garageCarId||save.selectedCar;if(save.ownedCars.includes(id)){save.selectedCar=id;state.garageCarId=id;persist();audio.sfx('unlock');renderScreen('garage');toast(`${carById(id).name} SELECTED`);}}
    else if(action==='buy-car')buyCar(btn.dataset.id);
    else if(action==='buy-upgrade')buyUpgrade(btn.dataset.id);
    else if(action==='skin')selectSkin(btn.dataset.id);
    else if(action==='pause')showPause();
    else if(action==='resume'){document.querySelector('#pause-overlay')?.remove();state.paused=false;state.running=true;}
    else if(action==='restart')startGame(state.mapId,state.mode);
    else if(action==='quit'){document.querySelector('#pause-overlay')?.remove();document.querySelector('#end-overlay')?.remove();renderScreen('home');}
    else if(action==='run-again'){startGame(state.mapId,state.mode);}
    else if(action==='daily-play'){state.mode='daily';state.mapId=MAPS.find(m=>save.unlockedMaps.includes(m.id)&&!m.secret)?.id||'city';startGame(state.mapId,'daily');}
    else if(action==='claim-continue'){document.querySelector('#abyss-win')?.remove();renderScreen('home');}
    else if(action==='reload')location.reload();
    audio.sfx('click');
  });
  window.addEventListener('keydown',(e)=>{
    if(e.repeat)return;
    heldKeys.add(e.code);
    if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code))e.preventDefault();
    if(e.code==='Escape'&&state.running){showPause();return;}
    if(e.code==='KeyW'||e.code==='ArrowUp')input.throttle=true;
    if(e.code==='KeyS'||e.code==='ArrowDown')input.brake=true;
    if(e.code==='KeyA'||e.code==='ArrowLeft')input.left=true;
    if(e.code==='KeyD'||e.code==='ArrowRight')input.right=true;
    if(e.code==='Space')input.jump=true;
    if(e.code==='ShiftLeft'||e.code==='ShiftRight')input.nitro=true;
    if(e.code==='KeyE')input.ability=true;
    if(e.code==='KeyC')input.drift=true;
  });
  window.addEventListener('keyup',(e)=>{
    heldKeys.delete(e.code);
    if(e.code==='KeyW'||e.code==='ArrowUp')input.throttle=false;
    if(e.code==='KeyS'||e.code==='ArrowDown')input.brake=false;
    if(e.code==='KeyA'||e.code==='ArrowLeft')input.left=false;
    if(e.code==='KeyD'||e.code==='ArrowRight')input.right=false;
    if(e.code==='Space')input.jump=false;
    if(e.code==='ShiftLeft'||e.code==='ShiftRight')input.nitro=false;
    if(e.code==='KeyE')input.ability=false;
    if(e.code==='KeyC')input.drift=false;
  });
  window.addEventListener('blur',releaseAll);
  window.addEventListener('resize',onResize);
}

function cycleCar(dir){
  let idx=CARS.findIndex(c=>c.id===(state.garageCarId||save.selectedCar));
  idx=(idx+dir+CARS.length)%CARS.length;state.garageCarId=CARS[idx].id;renderScreen('garage');
}
function buyCar(id){
  const car=carById(id);if(save.ownedCars.includes(id))return;
  if(save.coins<car.price){toast('NOT ENOUGH COINS');return;}
  save.coins-=car.price;save.ownedCars.push(id);save.selectedCar=id;state.garageCarId=id;persist();audio.sfx('unlock');renderScreen('garage');toast(`${car.name} PURCHASED`);
}
function buyUpgrade(id){
  const car=carById(save.selectedCar),level=save.upgrades[car.id][id]||0,cost=upgradeCost(id,level);
  if(level>=5){toast('UPGRADE ALREADY MAXED');return;}
  if(save.coins<cost){toast('NOT ENOUGH COINS');return;}
  save.coins-=cost;save.upgrades[car.id][id]=level+1;persist();audio.sfx('unlock');renderScreen('shop');toast(`${id.toUpperCase()} UPGRADED TO LV.${level+1}`);
}
function selectSkin(id){
  const prices={factory:0,candy:450,midnight:650,gold:1200,hazard:850,abyss:0};
  if(!save.skins.includes(id)){
    const cost=prices[id]??Infinity;if(save.coins<cost){toast('NOT ENOUGH COINS');return;}
    save.coins-=cost;save.skins.push(id);audio.sfx('unlock');
  }
  save.selectedSkin=id;persist();renderScreen('shop');toast(`${id.toUpperCase()} SKIN EQUIPPED`);
}

async function startGame(mapId,mode){
  try {
  if(!state.worldReady){toast('ENGINE IS STILL LOADING');return;}
  if(mapId==='abyss'&&!isSecret()){toast('ACCESS DENIED');return;}
  if(!save.unlockedMaps.includes(mapId)&&mapId!=='abyss'){toast('TRACK LOCKED');return;}
  try { await audio.start(); } catch(audioError) { console.warn('Audio unavailable:',audioError); }
  audio.setMood(isSecret());audio.sfx('unlock');
  cleanupGame();
  if(state.previewRoot){state.scene.remove(state.previewRoot);state.previewRoot=null;state.preview=null;}
  state.mode=mode;state.mapId=mapId;state.elapsed=0;state.raceTime=0;state.totalScore=0;state.raceReward=0;state.bossDamageCooldown=0;state.bossDefeated=false;state.eventTimer=20;state.activeEvent=null;state.cinematic=null;state.chest=null;
  const map=mapById(mapId);
  state.physics=new RAPIER.World({x:0,y:-9.81,z:0});
  state.worldBuilder=new WorldBuilder(state.scene,RAPIER,state.physics);
  const info=state.worldBuilder.build(map,isSecret());
  state.worldInfo=info;
  let spawn=info.spawn.clone(),yaw=info.yaw;
  if(mode==='boss'&&!info.abyss){spawn.set(-20,2,-42);yaw=.25;}
  if(mode==='stunt'){spawn.set(-6,2,-120);yaw=Math.PI/2;}
  const data=carById(save.selectedCar),upgrades=save.upgrades[data.id];
  state.car=new CarController(RAPIER,state.physics,data,upgrades,spawn,yaw,isSecret(),save.selectedSkin);
  state.scene.add(state.car.visual);
  state.preview?.parent?.remove(state.preview);state.preview=null;
  canvas.classList.add('game-active');
  state.camera.position.set(spawn.x-12,spawn.y+8,spawn.z-15);state.camera.lookAt(spawn.x,spawn.y,spawn.z+5);
  state.running=true;state.paused=false;state.screen='game';releaseAll();renderGameHud();
  state.finishDistance=mode==='time'?850:mode==='world'?1100:mode==='stunt'?1400:900;
  if(mode==='daily')state.finishDistance=700;
  } catch(err) {
    console.error('Game start failed:',err);
    cleanupGame();
    canvas.classList.remove('game-active');
    renderScreen('home');
    toast('GAME COULD NOT START — CHECK WEBGL SUPPORT');
  }
}

function cleanupGame(){
  releaseAll();clearEvents();
  if(state.car){try{state.scene.remove(state.car.visual);state.car.dispose();}catch{} state.car=null;}
  if(state.worldBuilder){try{state.worldBuilder.dispose();}catch{}state.worldBuilder=null;}
  if(state.physics){try{state.physics.free();}catch{}state.physics=null;}
  if(state.preview?.parent)state.preview.parent.remove(state.preview);
  state.worldInfo=null;
}
function clearEvents(){
  for(const event of state.eventObjects){
    const obj=event.mesh;
    if(!obj)continue;
    obj.traverse(o=>{
      if(o.geometry)o.geometry.dispose();
      if(o.material){
        const list=Array.isArray(o.material)?o.material:[o.material];
        for(const m of list){if(m.map)m.map.dispose();m.dispose();}
      }
    });
    state.scene?.remove(obj);
  }
  state.eventObjects=[];state.activeEvent=null;
}

function triggerRandomEvent(){
  if(!state.car||state.worldInfo?.abyss)return;
  const events=['DINO PURSUIT','METEOR SHOWER','UFO SIGHTING','GRAVITY ERROR','EARTHQUAKE','GIANT WAVE','ROAD CHAOS'];
  const name=events[Math.floor(Math.random()*events.length)];
  state.activeEvent={name,time:10,initial:10};state.eventTimer=26+Math.random()*18;
  const banner=document.querySelector('#hud-message');if(banner)banner.textContent=name;
  const accent=isSecret()?0xff3038:mapById(state.mapId).accent;
  const basicMat=new THREE.MeshStandardMaterial({color:accent,roughness:.4,metalness:.25,emissive:accent,emissiveIntensity:.28});
  if(name==='DINO PURSUIT'){
    const dino=new THREE.Group();
    const body=new THREE.Mesh(new THREE.BoxGeometry(5,4,10),new THREE.MeshStandardMaterial({color:isSecret()?0x55151d:0x557f42,roughness:.9}));body.position.y=4;dino.add(body);
    const head=new THREE.Mesh(new THREE.BoxGeometry(4,3,4),body.material);head.position.set(0,5,6);dino.add(head);
    for(const x of [-1.5,1.5]){const leg=new THREE.Mesh(new THREE.BoxGeometry(1.3,4,1.6),body.material);leg.position.set(x,1,1);dino.add(leg);}
    dino.position.set(0,0,-150);state.scene.add(dino);state.eventObjects.push({mesh:dino,type:'dino'});
  }else if(name==='UFO SIGHTING'){
    const ufo=new THREE.Group();ufo.add(new THREE.Mesh(new THREE.CylinderGeometry(7,9,1.3,32),basicMat));const dome=new THREE.Mesh(new THREE.SphereGeometry(4,20,12,0,Math.PI*2,0,Math.PI/2),new THREE.MeshStandardMaterial({color:0x9de2ee,metalness:.4,roughness:.2,transparent:true,opacity:.8}));dome.position.y=.6;ufo.add(dome);ufo.position.set(0,24,0);state.scene.add(ufo);state.eventObjects.push({mesh:ufo,type:'ufo'});
  }else if(name==='METEOR SHOWER'){
    for(let i=0;i<4;i++){const m=new THREE.Mesh(new THREE.DodecahedronGeometry(2.1,1),new THREE.MeshStandardMaterial({color:0x4d3230,emissive:0x9a301b,emissiveIntensity:1}));m.position.set((Math.random()-.5)*95,30+Math.random()*16,-30+Math.random()*100);state.scene.add(m);state.eventObjects.push({mesh:m,type:'meteor',fall:8+Math.random()*5});}
  }else if(name==='GIANT WAVE'){
    const wave=new THREE.Mesh(new THREE.BoxGeometry(130,16,6),new THREE.MeshStandardMaterial({color:0x4facc9,transparent:true,opacity:.7,metalness:.2,roughness:.25}));wave.position.set(-100,6,0);state.scene.add(wave);state.eventObjects.push({mesh:wave,type:'wave'});
  }else if(name==='ROAD CHAOS'){
    for(let i=0;i<8;i++){const cone=new THREE.Mesh(new THREE.ConeGeometry(1.3,3,12),new THREE.MeshStandardMaterial({color:i%2?0xf1ce39:0xef563f}));cone.position.set((Math.random()-.5)*28,1.5,-20-Math.random()*100);state.scene.add(cone);state.eventObjects.push({mesh:cone,type:'cone'});}
  }else if(name==='EARTHQUAKE'){
    state.eventObjects.push({type:'quake'});
  }else if(name==='GRAVITY ERROR'){
    state.eventObjects.push({type:'gravity'});state.physics.gravity={x:0,y:-4,z:0};
  }
  toast(`RANDOM EVENT: ${name}`,'event-toast');audio.sfx('boss');
}

function updateEvents(dt){
  if(state.activeEvent){
    state.activeEvent.time-=dt;
    if(state.activeEvent.time<=0){
      if(state.activeEvent.name==='GRAVITY ERROR'&&state.physics)state.physics.gravity={x:0,y:-9.81,z:0};
      clearEvents();const banner=document.querySelector('#hud-message');if(banner)banner.textContent=state.bossDefeated?'BOSS DEFEATED':'RACE IN PROGRESS';
    }
  }
  for(const e of state.eventObjects){
    if(!e.mesh)continue;
    const p=e.mesh.position;
    if(e.type==='dino'){const carPos=state.car.position;p.z+=dt*10;p.x+=(carPos.x-p.x)*dt*.1;e.mesh.rotation.y=Math.sin(state.elapsed*3)*.08;}
    if(e.type==='ufo'){p.x=Math.sin(state.elapsed*.9)*26;p.z=Math.cos(state.elapsed*.7)*22;p.y=23+Math.sin(state.elapsed*2)*2;}
    if(e.type==='meteor'){p.y-=dt*e.fall;p.x+=dt*3;if(p.y<0){p.y=0;e.mesh.scale.setScalar(.5);}}
    if(e.type==='wave'){p.x+=dt*20;if(p.x>100)p.x=-100;}
    if(e.type==='cone'){e.mesh.rotation.y+=dt*.5;}
  }
  if(state.activeEvent?.name==='EARTHQUAKE'&&state.camera){state.camera.position.x+=Math.sin(state.elapsed*40)*.08;state.camera.position.y+=Math.cos(state.elapsed*37)*.06;}
}

function updateHud(){
  if(!state.car)return;
  const speed=state.car.speed*3.6;
  const s=document.querySelector('#hud-speed');if(s)s.textContent=String(Math.round(speed)).padStart(3,'0');
  const coin=document.querySelector('#hud-coins');if(coin)coin.textContent=fmt(save.coins);
  const nit=document.querySelector('#nitro-fill');if(nit)nit.style.width=`${state.car.nitro}%`;
  const nt=document.querySelector('#nitro-text');if(nt)nt.textContent=`${Math.round(state.car.nitro)}%`;
  const timer=document.querySelector('#race-timer');if(timer){const t=Math.floor(state.raceTime);timer.textContent=`${String(Math.floor(t/60)).padStart(2,'0')}:${String(t%60).padStart(2,'0')}`;}
  const boss=state.worldInfo?.boss;
  if(boss){const h=document.querySelector('#boss-health');if(h)h.style.width=`${boss.hp/boss.maxHp*100}%`;const p=document.querySelector('#boss-phase');if(p)p.textContent=`PHASE 0${boss.phase}`;const msg=document.querySelector('#hud-message');if(msg&&!boss.defeated)msg.textContent=boss.data.attacks[boss.attackIndex];}
  const ability=document.querySelector('#ability-cooldown');if(ability&&state.car)ability.textContent=state.car.cooldowns.ability<=0?'READY · E':`${state.car.cooldowns.ability.toFixed(1)}s · E`;
}

function updateGame(dt){
  if(!state.running||!state.car||!state.physics)return;
  state.elapsed+=dt;state.raceTime+=dt;
  state.eventTimer-=dt;
  if(state.eventTimer<=0)triggerRandomEvent();
  updateEvents(dt);
  state.physics.timestep=dt;
  state.physics.step();
  const result=state.car.update(dt,input,state.physics.gravity.y);
  state.worldBuilder.update(dt,result.position);
  const forward=state.car.forward;
  const desired=result.position.clone().addScaledVector(forward,-13);desired.y+=6.5;
  state.camera.position.lerp(desired,1-Math.pow(.001,dt));
  const look=result.position.clone().addScaledVector(forward,7);look.y+=1.9;
  state.camera.lookAt(look);
  state.bossDamageCooldown=Math.max(0,state.bossDamageCooldown-dt);
  const boss=state.worldInfo?.boss;
  if(boss&&!boss.defeated&&state.bossDamageCooldown<=0){
    const d=result.position.distanceTo(boss.group.position);
    if(d<13&&result.speed>8){
      if(state.worldBuilder.hitBoss()){
        state.bossDamageCooldown=1.8;
        state.car.body.applyImpulse({x:0,y:state.car.mass*1.6,z:-state.car.mass*2.4},true);
        audio.sfx('hit');toast(`${boss.data.name}: HIT`);
        if(boss.hp<=0)onBossDefeated();
      }
    }
  }
  for(const coin of state.worldBuilder.coins){
    if(coin.active&&result.position.distanceTo(coin.pos)<3.2){
      const value=state.worldBuilder.collectCoin(coin);addCoins(value);state.raceReward+=value;audio.sfx('coin');
    }
  }
  if(result.position.y<-28){
    if(state.worldInfo.abyss&&result.position.z>state.worldInfo.finishZ-40){startAbyssCinematic();return;}
    const safe=state.car.lastSafe;state.car.body.setTranslation({x:safe.x,y:safe.y+2,z:safe.z},true);state.car.body.setLinvel({x:0,y:0,z:0},true);audio.sfx('hit');toast('RESET TO THE LAST SAFE POINT');
  }
  if(state.mode==='stunt'){
    state.totalScore+=Math.max(0,state.car.airTime>0.3?state.car.airTime*result.speed*.8:0)*dt;
    if(state.car.drifting)state.totalScore+=dt*result.speed*.25;
    const msg=document.querySelector('#hud-objective');if(msg)msg.textContent=`STUNT SCORE ${fmt(state.totalScore)}`;
  }
  if(state.mode==='time'&&state.raceTime>90){finishRace(false);return;}
  if(state.mode==='endless'&&state.raceTime>180){finishRace(true);return;}
  if(state.mode==='boss'&&boss?.defeated){finishRace(true);return;}
  if(state.worldInfo.abyss){
    if(result.position.z>state.worldInfo.finishZ&&state.cinematic===null)startAbyssCinematic();
  }else if(state.mode==='world'||state.mode==='time'||state.mode==='stunt'||state.mode==='daily'){
    if(state.car.distance>state.finishDistance)finishRace(true);
  }
  if(state.toastTimer>0){state.toastTimer-=dt;if(state.toastTimer<=0)document.querySelector('.toast')?.classList.remove('show');}
  if(Math.floor(state.elapsed*5)%2===0)updateHud();
}

function onBossDefeated(){
  state.bossDefeated=true;audio.sfx('win');save.bossWins++;
  const index=MAPS.findIndex(m=>m.id===state.mapId),next=MAPS[index+1];
  if(next&&!next.secret&&!save.unlockedMaps.includes(next.id))save.unlockedMaps.push(next.id);
  const rewardSkins={city:'traffic',prehistoric:'fossil',desert:'plastic',night:'protocol',wrong:'manager'};
  const skin=rewardSkins[state.mapId];if(skin&&!save.skins.includes(skin))save.skins.push(skin);
  addCoins(450+Math.max(0,index)*220);addGems(3);persist();toast(`${mapById(state.mapId).boss} DEFEATED // NEW REWARD UNLOCKED`,'win-toast');
}
function finishRace(success){
  if(state.paused)return;
  state.running=false;state.paused=true;
  const scoreBonus=state.mode==='stunt'?Math.floor(state.totalScore/30):0;
  const reward=success?Math.floor(180+state.raceReward*.2+Math.max(0,100-state.raceTime)*1.2+scoreBonus):Math.floor(state.raceReward*.25);
  addCoins(reward);save.races++;
  if(state.mode==='daily'){
    if(save.daily.date!==todayKey()){save.daily.date=todayKey();save.daily.done=false;}
    if(!save.daily.done){save.daily.done=true;addCoins(350);addGems(3);toast('DAILY REWARD CLAIMED');}
  }
  if(state.mode==='time'){
    const old=save.bestTimes[state.mapId]||Infinity;if(state.raceTime<old)save.bestTimes[state.mapId]=state.raceTime;
  }
  if(state.mode==='world'&&state.raceTime<90)save.bestTimes[state.mapId]=Math.min(save.bestTimes[state.mapId]||Infinity,state.raceTime);
  persist();audio.sfx(success?'win':'hit');
  showEndScreen(success?'NICE DRIVE.':'CLOCK RAN OUT.',success?'You survived the route. That is technically a victory.':'The timer won this round. The car is probably fine.',reward,success);
}

function startAbyssCinematic(){
  if(state.cinematic!==null)return;
  state.running=false;state.paused=false;releaseAll();state.cinematic={stage:0,time:0};
  audio.sfx('hit');
  if(audio.musicGain&&audio.ctx)audio.musicGain.gain.setTargetAtTime(0,audio.ctx.currentTime,.2);
  // Chest remains hidden until the vehicle disappears into the lava.
  const chest=new THREE.Group();
  const dark=new THREE.MeshStandardMaterial({color:0x211018,metalness:.62,roughness:.3});
  const gold=new THREE.MeshStandardMaterial({color:0xe0a82f,metalness:.86,roughness:.22,emissive:0x542313,emissiveIntensity:.35});
  const base=new THREE.Mesh(new THREE.BoxGeometry(10,5.5,7),dark);base.position.y=2.75;chest.add(base);
  for(const x of [-4.7,4.7])for(const z of [-3.2,3.2]){const rail=new THREE.Mesh(new THREE.BoxGeometry(.45,5.7,.45),gold);rail.position.set(x,2.7,z);chest.add(rail);}
  for(const y of [1,4.5]){const band=new THREE.Mesh(new THREE.BoxGeometry(10.25,.42,7.25),gold);band.position.y=y;chest.add(band);}
  const lidPivot=new THREE.Group();lidPivot.position.set(0,5.3,-3.35);chest.add(lidPivot);
  const lid=new THREE.Mesh(new THREE.BoxGeometry(10.1,1.2,7.1),dark);lid.position.set(0,.2,3.35);lidPivot.add(lid);
  const emblem=new THREE.Mesh(new THREE.TorusGeometry(1.4,.25,12,32),gold);emblem.position.set(0,.9,3.35);lidPivot.add(emblem);
  chest.position.set(0,-33,1800);chest.visible=false;state.worldBuilder.root.add(chest);state.chest={group:chest,lidPivot};
  const line=document.createElement('div');line.className='cinematic-caption';line.id='cinematic-caption';line.textContent='';uiRoot.appendChild(line);
}

function updateCinematic(dt){
  if(!state.cinematic)return;
  const c=state.cinematic;c.time+=dt;
  if(c.stage===0){
    // Let the car continue its momentum off the broken edge.
    const b=state.car.body;
    b.applyImpulse({x:0,y:-state.car.mass*2.4*dt,z:state.car.mass*2*dt},true);
    if(state.physics){state.physics.timestep=dt;state.physics.step();}
    const p=b.translation();
    const rot=b.rotation();
    state.car.visual.position.set(p.x,p.y,p.z);state.car.visual.quaternion.set(rot.x,rot.y,rot.z,rot.w);
    const pos=state.car.position;
    state.camera.position.lerp(new THREE.Vector3(pos.x-8,pos.y+5,pos.z-11),.06);state.camera.lookAt(pos.x,pos.y-3,pos.z+8);
    if(c.time>2.6||p.y<-28){state.scene.remove(state.car.visual);c.stage=1;c.time=0;const caption=document.querySelector('#cinematic-caption');if(caption)caption.textContent='...';}
  }else if(c.stage===1){
    const chest=state.chest.group;chest.visible=true;chest.position.y=THREE.MathUtils.lerp(-32, -9, clamp(c.time/3,0,1));
    if(c.time>3){c.stage=2;c.time=0;audio.sfx('boss');const caption=document.querySelector('#cinematic-caption');if(caption)caption.textContent='A GIFT FROM BELOW';}
  }else if(c.stage===2){
    state.chest.lidPivot.rotation.x=-clamp(c.time/1.7,0,1)*1.25;
    if(c.time>2){c.stage=3;c.time=0;audio.sfx('unlock');if(!save.abyssRewardClaimed){save.coins+=999999999;save.totalCoinsEarned+=999999999;save.abyssRewardClaimed=true;save.abyssComplete=true;if(!save.skins.includes('abyss'))save.skins.push('abyss');persist();}showAbyssWin();}
  }
}

function animate(now){
  const dt=clamp((now-state.lastTime)/1000||0,0,.035);state.lastTime=now;
  if(state.preview&&state.screen!=='game'){state.preview.rotation.y+=dt*.3;state.preview.position.y=Math.sin(now*.001)*.12;}
  if(state.running)updateGame(dt);
  if(state.cinematic)updateCinematic(dt);
  if(state.renderer&&state.scene&&state.camera)state.renderer.render(state.scene,state.camera);
}

function onResize(){
  if(!state.renderer||!state.camera)return;
  state.renderer.setSize(window.innerWidth,window.innerHeight);
  const coarse=window.matchMedia?.('(pointer:coarse)').matches||false;
  state.renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,state.quality==='low'?0.95:coarse?1.25:1.7));
  state.camera.aspect=window.innerWidth/window.innerHeight;state.camera.updateProjectionMatrix();
}

setupControlEvents();
boot();
