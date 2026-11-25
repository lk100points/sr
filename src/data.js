export const CARS = [
  { id:'cart', name:'SHOPPING CART', price:0, shape:'cart', speed:18, accel:16, grip:7, weight:130, ability:'WHEELIE', abilityText:'A quick front lift for a little extra airtime.', color:0xc6d0d7, accent:0xff5b43 },
  { id:'sofa', name:'SOFA GT', price:650, shape:'sofa', speed:21, accel:13, grip:6, weight:210, ability:'COUCH CUSHION', abilityText:'A springy bounce that softens landings.', color:0x9a5cbb, accent:0xffc5e4 },
  { id:'fridge', name:'FRIDGE 3000', price:1100, shape:'fridge', speed:17, accel:12, grip:9, weight:360, ability:'COLD SNAP', abilityText:'A short pulse that slows nearby hazards.', color:0xe7f0f5, accent:0x70d9ff },
  { id:'bus', name:'SCHOOL BUS', price:1800, shape:'bus', speed:20, accel:10, grip:6, weight:520, ability:'FIELD TRIP', abilityText:'A heavy shockwave that clears road clutter.', color:0xf2bd27, accent:0xfff1a6 },
  { id:'tub', name:'BATHTUB X', price:2400, shape:'tub', speed:23, accel:14, grip:7, weight:260, ability:'BUBBLE BOOST', abilityText:'A slippery burst of speed.', color:0xf4f3ed, accent:0x8de4f3 },
  { id:'ikea', name:'IKEA RUNNER', price:3200, shape:'ikea', speed:25, accel:15, grip:8, weight:190, ability:'FLAT-PACK', abilityText:'Temporarily folds down for a nimble dash.', color:0x1768b3, accent:0xf6d22c },
  { id:'ufo', name:'UFO CAR', price:5600, shape:'ufo', speed:26, accel:18, grip:8, weight:170, ability:'ABDUCT', abilityText:'A brief low-gravity lift.', color:0x66c9c4, accent:0xf7f4c5 },
  { id:'toilet', name:'GOLDEN TOILET', price:9000, shape:'toilet', speed:28, accel:17, grip:10, weight:240, ability:'ROYAL FLUSH', abilityText:'A powerful forward pulse with bonus coins.', color:0xd7a92e, accent:0xffe9a2 }
];

export const MAPS = [
  { id:'city', name:'BROKEN CITY', sub:'A traffic jam with a personal problem.', boss:'THE TRAFFIC KING', sky:0x8fa0b7, fog:0x9ba9b8, ground:0x343941, road:0x20242c, accent:0xff7049, event:'TRAFFIC TAKEOVER', unlock:0 },
  { id:'prehistoric', name:'LOST PREHISTORY', sub:'The road is old. The dinosaur is not.', boss:'REX-9000', sky:0x9bb7a4, fog:0x9fb39b, ground:0x6c7552, road:0x353b34, accent:0xe5aa55, event:'DINO PURSUIT', unlock:1 },
  { id:'desert', name:'PLASTIC DESERT', sub:'Heat haze, fake dunes, real danger.', boss:'THE INFLATABLE', sky:0xe8bd84, fog:0xe3ba91, ground:0xb98a61, road:0x594b45, accent:0xffa7bd, event:'SANDSTORM', unlock:2 },
  { id:'night', name:'NIGHT PROTOCOL', sub:'The city is online. You are not invited.', boss:'MOTHERBOARD', sky:0x171d35, fog:0x262a4a, ground:0x20253a, road:0x111522, accent:0x63c6ff, event:'GRAVITY ERROR', unlock:3 },
  { id:'wrong', name:'THE WRONG PLACE', sub:'Office hours have never been this hostile.', boss:'THE MANAGER', sky:0xa9a7a0, fog:0xaaa79d, ground:0x77746c, road:0x3e3d3b, accent:0xd7d1b7, event:'MEETING INVITE', unlock:4 },
  { id:'abyss', name:'THE ABYSS', sub:'There is no map back.', boss:'', sky:0x160a12, fog:0x230b17, ground:0x21151c, road:0x140f16, accent:0xd52b27, event:'NO SIGNAL', unlock:5, secret:true }
];

export const MODES = [
  { id:'world', name:'WORLD RACE', desc:'Race the route and earn your way forward.' },
  { id:'boss', name:'BOSS RUSH', desc:'Face the map boss and survive its phases.' },
  { id:'endless', name:'ENDLESS CHAOS', desc:'Drive until the road finally wins.' },
  { id:'time', name:'TIME ATTACK', desc:'Beat the clock. Collect time shards.' },
  { id:'stunt', name:'STUNT MODE', desc:'Big air, drifts and suspiciously poor decisions.' },
  { id:'daily', name:'DAILY CHALLENGE', desc:'A rotating challenge with a fixed reward.' }
];

export const UPGRADE_TYPES = [
  { id:'engine', name:'ENGINE', desc:'Higher top speed', costs:[250,450,750,1100,1600] },
  { id:'nitro', name:'NITRO', desc:'Longer and stronger boost', costs:[220,420,680,980,1450] },
  { id:'handling', name:'HANDLING', desc:'Sharper steering and grip', costs:[200,390,620,900,1300] },
  { id:'suspension', name:'SUSPENSION', desc:'Better landings and stability', costs:[230,430,700,1000,1500] },
  { id:'ability', name:'ABILITY', desc:'Improve your special move', costs:[300,550,850,1250,1800] }
];

export const BOSS_DATA = {
  city: { name:'THE TRAFFIC KING', color:0xff6848, maxHp:3, attacks:['ROAD BLOCK','HORN BLAST','TAXI SWARM'] },
  prehistoric: { name:'REX-9000', color:0x8dce77, maxHp:3, attacks:['TAIL SWEEP','FOSSIL STOMP','ROAR WAVE'] },
  desert: { name:'THE INFLATABLE', color:0xf08ab0, maxHp:3, attacks:['BOUNCE WALL','AIR LEAK','BEACH BALLS'] },
  night: { name:'MOTHERBOARD', color:0x65caff, maxHp:3, attacks:['PACKET LOSS','LASER GRID','SYSTEM REBOOT'] },
  wrong: { name:'THE MANAGER', color:0xd7d1b7, maxHp:3, attacks:['URGENT EMAIL','CALENDAR BLOCK','PERFORMANCE REVIEW'] }
};
