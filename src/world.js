import * as THREE from 'three';
import { BOSS_DATA } from './data.js';

const v3 = (x,y,z) => new THREE.Vector3(x,y,z);
const seeded = (seed) => () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };

function mat(color, roughness=0.76, metalness=0.04, extra={}) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness, ...extra });
}

export function createCoinMaterial(secret=false) {
  const canvas = document.createElement('canvas');
  canvas.width = 256; canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const g = ctx.createLinearGradient(0,0,256,256);
  if (secret) { g.addColorStop(0,'#fff0a3'); g.addColorStop(.42,'#f6a900'); g.addColorStop(1,'#a90e17'); }
  else { g.addColorStop(0,'#fff4a1'); g.addColorStop(.48,'#f6b82a'); g.addColorStop(1,'#b46a16'); }
  ctx.fillStyle = g; ctx.fillRect(0,0,256,256);
  ctx.strokeStyle = secret ? '#6e0e1a' : '#9b5a12'; ctx.lineWidth = 14; ctx.strokeRect(13,13,230,230);
  ctx.fillStyle = secret ? '#7d1119' : '#8d5818'; ctx.font = '900 68px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(secret ? '1529' : 'COIN',128,130);
  const tex = new THREE.CanvasTexture(canvas); tex.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshStandardMaterial({ map:tex, metalness:.82, roughness:.22 });
}

export class WorldBuilder {
  constructor(scene, rapier, physicsWorld) {
    this.scene = scene;
    this.R = rapier;
    this.physics = physicsWorld;
    this.root = new THREE.Group();
    this.scene.add(this.root);
    this.coins = [];
    this.decor = [];
    this.boss = null;
    this.hazards = [];
    this.map = null;
    this.secret = false;
    this.coinMaterial = null;
    this.elapsed = 0;
  }
  fixedBox(x,y,z,hx,hy,hz, friction=1.0) {
    const body = this.physics.createRigidBody(this.R.RigidBodyDesc.fixed().setTranslation(x,y,z));
    const collider = this.R.ColliderDesc.cuboid(hx,hy,hz).setFriction(friction).setRestitution(.06);
    this.physics.createCollider(collider, body);
    return body;
  }
  addMesh(geometry, material, position, rotation=null, parent=this.root) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(position);
    if (rotation) mesh.rotation.set(rotation.x||0,rotation.y||0,rotation.z||0);
    mesh.castShadow = true; mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }
  clear() {
    this.scene.remove(this.root);
    this.root.traverse(o => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) { const list=Array.isArray(o.material)?o.material:[o.material]; for (const m of list) { if (m.map) m.map.dispose(); m.dispose(); } }
    });
    this.root = new THREE.Group(); this.scene.add(this.root);
    this.coins = []; this.decor = []; this.boss = null; this.hazards = []; this.map = null;
  }
  build(map, secret=false) {
    this.clear();
    this.map = map; this.secret = secret;
    this.elapsed = 0;
    this.coinMaterial = createCoinMaterial(secret);
    const abyss = map.id === 'abyss';
    const rng = seeded(map.id.length * 9187 + (secret?1529:51));
    this.scene.background = new THREE.Color(secret ? (abyss ? 0x10060c : 0x1d080d) : map.sky);
    this.scene.fog = new THREE.Fog(secret ? (abyss ? 0x240a12 : 0x34111a) : map.fog, abyss ? 65 : 135, abyss ? 850 : 520);
    this.buildLighting(map, secret);
    const groundMat = mat(secret ? 0x241219 : map.ground, .95);
    const roadMat = mat(secret ? 0x171014 : map.road, .9);
    if (abyss) this.buildAbyss(groundMat, roadMat, rng);
    else this.buildCircuit(groundMat, roadMat, rng);
    this.buildEnvironment(map, rng);
    this.buildCoins(map, rng, secret);
    if (!abyss) this.buildBoss(map, secret);
    return {
      spawn: abyss ? v3(0,2,-1850) : v3(-12,2,-125),
      yaw: abyss ? 0 : Math.PI/2,
      finishZ: abyss ? 1740 : null,
      abyss,
      boss: this.boss
    };
  }
  buildLighting(map, secret) {
    const hemi = new THREE.HemisphereLight(secret ? 0x5a1c28 : 0xe5efff, secret ? 0x16080d : 0x44434a, secret ? .62 : 1.15);
    this.root.add(hemi);
    const sun = new THREE.DirectionalLight(secret ? 0xff4b31 : 0xffe6c5, secret ? 1.35 : 2.0);
    sun.position.set(-70,110,45); sun.castShadow = true;
    sun.shadow.mapSize.set(1024,1024);
    sun.shadow.camera.left=-180; sun.shadow.camera.right=180; sun.shadow.camera.top=180; sun.shadow.camera.bottom=-180;
    sun.shadow.bias=-0.00035; this.root.add(sun);
    const fill = new THREE.PointLight(secret ? 0xc32334 : map.accent, secret ? 34 : 20, 180, 2);
    fill.position.set(24,24,-20); this.root.add(fill);
    if (secret) {
      const lava = new THREE.PointLight(0xff421d, 55, 300, 2); lava.position.set(0,-12,1500); this.root.add(lava);
    }
  }
  buildCircuit(groundMat, roadMat, rng) {
    const floor = this.addMesh(new THREE.PlaneGeometry(1000,1000), groundMat, v3(0,-1.65,0), {x:-Math.PI/2,z:0});
    this.fixedBox(0,-2.25,0,500,.5,500,1.4);
    const layouts={
      city:[[0,-130],[95,-130],[145,-82],[145,62],[92,122],[-92,122],[-145,62],[-145,-78],[-90,-130],[0,-130]],
      prehistoric:[[0,-130],[118,-130],[166,-74],[128,-5],[166,72],[118,132],[20,158],[-96,132],[-166,52],[-118,-58],[-78,-130],[0,-130]],
      desert:[[0,-130],[105,-130],[145,-96],[112,-30],[151,42],[115,132],[0,132],[-112,132],[-151,55],[-112,-26],[-78,-130],[0,-130]],
      night:[[0,-130],[82,-130],[126,-98],[52,-54],[142,4],[82,76],[144,132],[0,132],[-142,104],[-54,38],[-148,-34],[-82,-112],[0,-130]],
      wrong:[[0,-130],[132,-130],[132,-56],[76,-18],[76,18],[132,58],[132,132],[-132,132],[-132,54],[-72,5],[-132,-62],[-132,-130],[0,-130]]
    };
    const points=(layouts[this.map.id]||layouts.city).map(([x,z])=>v3(x,0,z));
    this.addRoadRibbon(points, 31, roadMat, false);
    this.addRails(points, 31, this.secret ? 0x74202a : 0x737b85);
    this.fixedBox(0,-.14,0,500,.3,500,1.5);
    this.buildTrackProps(points, rng);
    const padMat = mat(this.secret ? 0x541922 : this.map.accent, .4, .15, {emissive:this.secret?0x25040a:0x1b0904,emissiveIntensity:.16});
    for (let i=0;i<5;i++) {
      const x = 5 + i*20, z = -126;
      this.addMesh(new THREE.BoxGeometry(13,1.1,9), padMat, v3(x,.15,z), {x:-.22,y:0,z:0});
      this.fixedBox(x,.05,z,6.5,.45,4.5,.75);
    }
  }
  addRoadRibbon(points, width, material, linear=false) {
    const half=width/2, verts=[], uv=[], indices=[];
    for(let i=0;i<points.length;i++){
      const prev=points[Math.max(0,i-1)], next=points[Math.min(points.length-1,i+1)];
      const d=v3(next.x-prev.x,0,next.z-prev.z).normalize();
      const n=v3(-d.z,0,d.x);
      const p=points[i];
      verts.push(p.x+n.x*half,.16,p.z+n.z*half,p.x-n.x*half,.16,p.z-n.z*half);
      uv.push(0,i/2,1,i/2);
      if(i>0){const a=(i-1)*2,b=a+1,c=i*2,didx=c+1;indices.push(a,b,c,b,didx,c);}
    }
    const geo=new THREE.BufferGeometry(); geo.setAttribute('position',new THREE.Float32BufferAttribute(verts,3)); geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2)); geo.setIndex(indices); geo.computeVertexNormals();
    this.addMesh(geo,material,v3(0,0,0));
  }
  addRails(points,width,color) {
    const railMat=mat(color,.58,.24);
    for(let i=1;i<points.length;i++){
      const a=points[i-1],b=points[i]; const dx=b.x-a.x,dz=b.z-a.z; const len=Math.hypot(dx,dz); const angle=Math.atan2(-dx,dz);
      const mid=v3((a.x+b.x)/2,1.05,(a.z+b.z)/2); const side=v3(dz/len,0,-dx/len);
      for(const s of [-1,1]){
        const p=mid.clone().addScaledVector(side,s*(width/2+1.1));
        const rail=this.addMesh(new THREE.BoxGeometry(2.2,1.8,len),railMat,p,{y:angle});
        this.fixedBox(p.x,1.0,p.z,1.1,.9,len/2,.9);
      }
    }
  }
  buildTrackProps(points,rng) {
    const colors=[0xff674e,0x6d8b9d,0xf2b84b,0xa9b5bf];
    for(let i=0;i<32;i++){
      const seg=1+Math.floor(rng()*(points.length-2)); const a=points[seg-1],b=points[seg];
      const t=.18+rng()*.66; const x=THREE.MathUtils.lerp(a.x,b.x,t),z=THREE.MathUtils.lerp(a.z,b.z,t);
      const side=rng()>.5?1:-1; const d=v3(b.x-a.x,0,b.z-a.z).normalize(); const n=v3(-d.z,0,d.x);
      const p=v3(x+n.x*side*(11+rng()*9),0,z+n.z*side*(11+rng()*9));
      const kind=i%4;
      if(kind===0){
        const cone=this.addMesh(new THREE.ConeGeometry(1.1,2.8,12),mat(colors[i%colors.length],.7),v3(p.x,1.45,p.z));
        cone.rotation.y=rng()*Math.PI*2; this.fixedBox(p.x,1.35,p.z,.9,1.3,.9,.35);
      }else if(kind===1){
        this.addCrate(p.x,p.z,2.3,colors[i%colors.length]);
      }else if(kind===2){
        const barrel=this.addMesh(new THREE.CylinderGeometry(1.15,1.15,2.6,16),mat(colors[i%colors.length],.48,.3),v3(p.x,1.3,p.z));
        this.fixedBox(p.x,1.3,p.z,1.1,1.3,1.1,.65);
      }else{
        this.addMesh(new THREE.TorusGeometry(2.1,.36,8,24),mat(this.secret?0xbc2c31:0xd1d7dc,.34,.48),v3(p.x,2.3,p.z),{x:Math.PI/2});
      }
    }
  }
  addCrate(x,z,size,color) {
    const crate=this.addMesh(new THREE.BoxGeometry(size,size,size),mat(color,.88),v3(x,size/2,z),{y:(x+z)*.01});
    const bar=this.addMesh(new THREE.BoxGeometry(size*1.03,.22,.3),mat(0x24272b,.8),v3(x,size/2,z));
    this.fixedBox(x,size/2,z,size/2,size/2,size/2,.7);
    return crate;
  }
  buildEnvironment(map,rng) {
    const city=map.id==='city', forest=map.id==='prehistoric', desert=map.id==='desert', night=map.id==='night', office=map.id==='wrong';
    const accent=mat(this.secret?0x6f1722:map.accent,.62,.14,{emissive:this.secret?0x21030a:0x000000,emissiveIntensity:.3});
    const neutral=mat(this.secret?0x321923:(city?0x67727e:forest?0x596b4c:desert?0xc49c70:night?0x303858:0xb7b5ac),.9,.04);
    for(let i=0;i<110;i++){
      let x=(rng()-.5)*600,z=(rng()-.5)*600;
      if(Math.abs(x)<185&&Math.abs(z)<175) continue;
      const h=3+rng()*20;
      if(city||office||night){
        const w=6+rng()*15,d=6+rng()*15;
        const block=this.addMesh(new THREE.BoxGeometry(w,h,d),neutral,v3(x,h/2-1.7,z),{y:rng()*.25});
        if(city && rng()>.5){
          for(let k=0;k<3;k++) this.addMesh(new THREE.BoxGeometry(w*.6,.5,.16),mat(0x9bc0d6,.42,.2,{emissive:0x284154,emissiveIntensity:.4}),v3(x,h*(.25+k*.22),z+d/2+.1));
        }
        if(night){const sign=this.addMesh(new THREE.BoxGeometry(w*.35,.35,.35),accent,v3(x,h*.65,z)); sign.material=accent;}
      }else if(forest){
        const trunk=this.addMesh(new THREE.CylinderGeometry(.8,1.4,h*.52,7),mat(0x574234),v3(x,h*.26-1,z));
        this.addMesh(new THREE.ConeGeometry(3+rng()*3,h*.8,7),mat(rng()>.5?0x53694c:0x788250),v3(x,h*.75-1,z));
        if(rng()>.75) this.addMesh(new THREE.BoxGeometry(5,.35,1),mat(0xd8cfb6),v3(x,1,z));
      }else if(desert){
        this.addMesh(new THREE.DodecahedronGeometry(2+rng()*5,1),neutral,v3(x,-.2,z),{x:rng(),y:rng()*4,z:rng()});
        if(rng()>.55){this.addMesh(new THREE.CylinderGeometry(.45,.65,4+rng()*4,7),mat(0x39845a),v3(x+7,2,z+5));}
      }else{
        const pillar=this.addMesh(new THREE.CylinderGeometry(2+rng()*2,2+rng()*2,h,8),neutral,v3(x,h/2-1,z));
        if(night && rng()>.55) this.addMesh(new THREE.TorusGeometry(4,.22,8,32),accent,v3(x,h*.68,z),{x:Math.PI/2});
      }
    }
    if(city){
      for(let i=0;i<14;i++){
        const x=(rng()-.5)*330,z=(rng()-.5)*280;
        this.addMesh(new THREE.BoxGeometry(13,1,5),mat(0xe2e4e4,.65),v3(x,2,z));
        this.addMesh(new THREE.BoxGeometry(1,3,1),mat(0xff8a55,.45,.1,{emissive:0x8c2812,emissiveIntensity:.3}),v3(x-4,3,z));
      }
    }
    if(desert){
      for(let i=0;i<35;i++){
        const x=(rng()-.5)*650,z=(rng()-.5)*650;
        this.addMesh(new THREE.SphereGeometry(6+rng()*9,12,8),mat(0xd0a274,.98),v3(x,-4,z),{x:0,y:rng()*2,z:0});
      }
    }
    if(office){
      for(let i=0;i<16;i++){
        const x=(rng()-.5)*300,z=(rng()-.5)*300;
        this.addMesh(new THREE.BoxGeometry(10,1,8),mat(0x9b9a91),v3(x,3,z));
        this.addMesh(new THREE.CylinderGeometry(.18,.18,3,8),mat(0x77766e),v3(x,1.5,z));
      }
    }
  }
  buildCoins(map,rng,secret) {
    const positions=[];
    for(let i=0;i<26;i++){
      const x=(rng()-.5)*220,z=(rng()-.5)*220;
      if(Math.abs(x)<35&&Math.abs(z)<35) continue;
      positions.push([x,2.6,z]);
    }
    if(map.id==='abyss'){
      for(let z=-1770;z<1710;z+=78){ const x=Math.sin(z*.006)*7; positions.push([x,3,z]); }
    }
    const coinGeo=new THREE.CylinderGeometry(.9,.9,.22,32);
    for(const [x,y,z] of positions){
      const group=new THREE.Group();
      const face=new THREE.Mesh(coinGeo,this.coinMaterial); face.rotation.x=Math.PI/2; face.castShadow=true;
      const rim=new THREE.Mesh(new THREE.TorusGeometry(.82,.13,10,32),mat(secret?0xffcc54:0xffdf75,.24,.85));
      group.add(face,rim); group.position.set(x,y,z); this.root.add(group);
      this.coins.push({mesh:group,pos:v3(x,y,z),value:secret?1529:35,active:true});
    }
  }
  buildAbyss(groundMat,roadMat,rng) {
    this.addMesh(new THREE.PlaneGeometry(420,4100),mat(0x100b10,.98),v3(0,-34,0),{x:-Math.PI/2});
    this.addMesh(new THREE.PlaneGeometry(420,4100),mat(0x6d1719,.55,.2,{emissive:0x8b160d,emissiveIntensity:.55}),v3(0,-30,0),{x:-Math.PI/2});
    const sections=[[-1950,-1270],[-1252,-620],[-602,20],[38,660],[678,1300],[1318,1778]];
    for(const [a,b] of sections){
      const length=b-a,center=(a+b)/2;
      this.addMesh(new THREE.PlaneGeometry(44,length),roadMat,v3(0,-.05,center),{x:-Math.PI/2});
      this.fixedBox(0,-.7,center,21,.65,length/2,1.1);
    }
    for(let side of [-1,1]){
      for(let i=0;i<35;i++){
        const z=-1580+i*92, x=side*(28+rng()*60), h=15+rng()*65;
        const rock=this.addMesh(new THREE.DodecahedronGeometry(8+rng()*13,1),mat(i%3===0?0x3a2028:0x1c151d,.98),v3(x,-5+h*.2,z),{x:rng(),y:rng()*4,z:rng()});
        rock.scale.y=1.2+rng();
      }
      for(let i=0;i<10;i++){
        const z=-1700+i*340;
        const chainMat=mat(0x4d3338,.28,.82);
        const chain=this.addMesh(new THREE.TorusGeometry(11,.7,8,32),chainMat,v3(side*(38+i%3*8),14,z),{x:Math.PI/2,y:.6});
        chain.scale.set(1,1.5,1);
      }
    }
    const broken=[-1261,-611,29,669,1309];
    for(const z of broken){
      const x=(rng()-.5)*7;
      this.addMesh(new THREE.BoxGeometry(18,1.3,23),mat(0x403139,.9),v3(x,.3,z),{z:(rng()-.5)*.12});
      if(rng()>.4) this.addMesh(new THREE.BoxGeometry(5,1,18),mat(0x34272e),v3(x+13,-1,z+6),{z:.2});
    }
    for(let i=0;i<18;i++){
      const z=-1450+i*165;
      const x=(i%2?1:-1)*(35+rng()*20);
      const arch=this.addMesh(new THREE.TorusGeometry(13,2,10,36),mat(0x58313a,.42,.68),v3(x,18,z),{x:Math.PI/2,y:rng()});
      arch.scale.set(1,1.8,1);
    }
    // Heavy debris sits on alternating lanes; the open gaps are short enough to jump with timing.
    const debrisMat=mat(0x493039,.92,.08);
    for(const [i,z] of [-1540,-930,-280,360,990,1510].entries()){
      const x=(i%2===0?-1:1)*(8+rng()*5);
      this.addMesh(new THREE.DodecahedronGeometry(3.1,1),debrisMat,v3(x,2.1,z),{x:rng(),y:rng()*3,z:rng()});
      this.fixedBox(x,2.0,z,2.8,2.6,2.8,.65);
      const coinX=-x*.2;
      this.addMesh(new THREE.TorusGeometry(1.4,.2,8,24),mat(0xf3bd4c,.28,.7),v3(coinX,5.8,z),{x:Math.PI/2});
    }
    // The final causeway ends over an illuminated lava basin.
    this.addMesh(new THREE.BoxGeometry(42,1.5,18),mat(0x281a22),v3(0,-.05,1760));
    this.addMesh(new THREE.BoxGeometry(3,9,3),mat(0x4a2229),v3(-20,4,1754));
    this.addMesh(new THREE.BoxGeometry(3,9,3),mat(0x4a2229),v3(20,4,1754));
    this.addMesh(new THREE.TorusGeometry(17,.8,12,48),mat(0xb52b25,.28,.55,{emissive:0x6c0b10,emissiveIntensity:.8}),v3(0,1,1766),{x:Math.PI/2});
    // Side cliffs and distant monoliths make the long ride readable.
    for(let i=0;i<57;i++){
      const side=i%2?1:-1,z=-1900+i*68,x=side*(42+rng()*30),h=20+rng()*48;
      this.addMesh(new THREE.ConeGeometry(5+rng()*7,h,5),mat(0x21151e,.99),v3(x,h/2-2,z),{z:(rng()-.5)*.3,y:rng()*3});
    }
  }
  buildBoss(map,secret) {
    const data=BOSS_DATA[map.id]; if(!data) return;
    const group=new THREE.Group();
    const main=mat(secret?0x42141e:data.color,.3,.56,{emissive:secret?0x6e0918:data.color,emissiveIntensity:.28});
    const dark=mat(0x17151a,.32,.75);
    const eye=mat(secret?0xffb32d:0xfff3b2,.24,.2,{emissive:secret?0xff321d:0xffaf44,emissiveIntensity:1.5});
    const core=new THREE.Mesh(new THREE.SphereGeometry(6,24,18),main); core.position.y=9; core.castShadow=true; group.add(core);
    const shell=new THREE.Mesh(new THREE.BoxGeometry(15,8,8),dark); shell.position.set(0,8,1); shell.castShadow=true; group.add(shell);
    const eyeL=new THREE.Mesh(new THREE.SphereGeometry(1.2,16,12),eye); eyeL.position.set(-3.2,10,5.1); group.add(eyeL);
    const eyeR=eyeL.clone(); eyeR.position.x=3.2; group.add(eyeR);
    for(const s of [-1,1]){
      const arm=new THREE.Mesh(new THREE.CylinderGeometry(1.1,1.8,8,10),main); arm.position.set(s*9,6,0); arm.rotation.z=s*.34; arm.castShadow=true; group.add(arm);
      const wheel=new THREE.Mesh(new THREE.TorusGeometry(2.2,.7,10,24),dark); wheel.position.set(s*7,2,0); wheel.rotation.x=Math.PI/2; group.add(wheel);
    }
    group.position.set(0,0,0); this.root.add(group);
    const ring=this.addMesh(new THREE.TorusGeometry(15,.28,8,64),mat(secret?0xd72b30:data.color,.4,.45,{emissive:secret?0x53070f:data.color,emissiveIntensity:.45}),v3(0,.18,0),{x:Math.PI/2});
    const marker=this.addMesh(new THREE.CylinderGeometry(.6,.6,24,12),eye,v3(0,12,0)); marker.material.transparent=true; marker.material.opacity=.26;
    this.boss={group,ring,marker,data,hp:data.maxHp,maxHp:data.maxHp,phase:1,attackTimer:4,attackIndex:0,stun:0,defeated:false};
  }
  update(dt, playerPos) {
    this.elapsed+=dt;
    for(const coin of this.coins){ if(coin.active){ coin.mesh.rotation.y+=dt*2.1; coin.mesh.position.y=coin.pos.y+Math.sin(this.elapsed*2.4+coin.pos.z*.03)*.18; } }
    if(this.boss && !this.boss.defeated){
      const b=this.boss;
      b.group.position.x=Math.sin(this.elapsed*.55)*19;
      b.group.position.z=22+Math.cos(this.elapsed*.3)*10;
      b.group.position.y=Math.sin(this.elapsed*1.7)*1.1;
      b.group.rotation.y=Math.sin(this.elapsed*.6)*.35;
      b.ring.rotation.z+=dt*.45;
      b.attackTimer-=dt;
      if(b.stun>0) b.stun-=dt;
      if(b.attackTimer<=0){
        b.attackIndex=(b.attackIndex+1)%b.data.attacks.length;
        const pulse=this.addMesh(new THREE.TorusGeometry(3,.38,8,32),mat(this.secret?0xff3030:b.data.color,.4,.3,{emissive:this.secret?0x9c0715:b.data.color,emissiveIntensity:.7}),v3(b.group.position.x,.4,b.group.position.z),{x:Math.PI/2});
        pulse.userData.life=2.4; this.hazards.push(pulse);
        b.attackTimer=Math.max(3.4,5.4-b.phase*.55);
      }
      if(playerPos && playerPos.distanceTo(b.group.position)<10 && b.stun<=0){
        // Contact briefly pushes the player away; the damage window is handled by the race controller.
      }
    }
    for(let i=this.hazards.length-1;i>=0;i--){
      const h=this.hazards[i]; h.userData.life-=dt; h.scale.multiplyScalar(1+dt*.8); h.material.opacity=Math.max(0,h.userData.life/2.4); h.material.transparent=true;
      if(h.userData.life<=0){this.root.remove(h);this.hazards.splice(i,1);}
    }
  }
  hitBoss() {
    if(!this.boss||this.boss.defeated||this.boss.stun>0) return false;
    const b=this.boss; b.hp--; b.stun=1.7; b.phase=Math.min(3,Math.floor((b.maxHp-b.hp)/1)+1);
    b.group.scale.setScalar(1.12); setTimeout(()=>{if(b.group) b.group.scale.setScalar(1);},180);
    if(b.hp<=0){b.defeated=true; b.group.rotation.x=-.9; b.group.position.y=-5; b.ring.material.opacity=.25;}
    return true;
  }
  collectCoin(coin) { if(!coin?.active) return 0; coin.active=false; coin.mesh.visible=false; return coin.value; }
  dispose() {
    if (!this.root) return;
    this.scene.remove(this.root);
    this.root.traverse(o => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) { const list=Array.isArray(o.material)?o.material:[o.material]; for (const m of list) { if (m.map) m.map.dispose(); m.dispose(); } }
    });
    this.root=null; this.coins=[]; this.decor=[]; this.boss=null; this.hazards=[];
  }
}
