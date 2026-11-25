import * as THREE from 'three';

const material=(color,roughness=.5,metalness=.12,extra={})=>new THREE.MeshStandardMaterial({color,roughness,metalness,...extra});
const v=(x,y,z)=>new THREE.Vector3(x,y,z);

export function createCarVisual(car, secret=false, skin='factory') {
  const group=new THREE.Group();
  const palettes={
    factory:[car.color,car.accent],
    candy:[0xff75b5,0x6ce4e5],
    midnight:[0x222531,0xaaaec0],
    gold:[0xd9a929,0xffedaa],
    hazard:[0xe5bc21,0x202226],
    abyss:[0x241016,0xe63b35],
    traffic:[0xc63a34,0xf3b646], fossil:[0x65794f,0xc9b88c], plastic:[0xffa3bc,0x66d5d4],
    protocol:[0x1c284d,0x4ddcff], manager:[0x76746b,0xe6d3a8]
  };
  const colors=secret?palettes.abyss:(palettes[skin]||palettes.factory);
  const bodyMat=material(colors[0],.34,.4);
  const trimMat=material(colors[1],.28,.65);
  const darkMat=material(0x171a20,.72,.18);
  const glassMat=material(secret?0x35131a:0x8bb8c8,.2,.3,{transparent:true,opacity:.78,metalness:.2});
  const chrome=material(secret?0x9a4a3f:0xbcc5ca,.24,.88);
  const rubber=material(0x101115,.95,.02);
  const wheelParts=[];
  const add=(geo,mat,pos,rot=null,parent=group)=>{
    const m=new THREE.Mesh(geo,mat); m.position.copy(pos); if(rot)m.rotation.set(rot.x||0,rot.y||0,rot.z||0); m.castShadow=true;m.receiveShadow=true;parent.add(m); return m;
  };
  const wheelX=car.shape==='bus'?2.05:1.8;
  const wheelZ=car.shape==='bus'?2.35:1.8;
  const wheelRadius=car.shape==='fridge'||car.shape==='toilet'?0.72:.82;
  const wheelPositions=[[-wheelX,-.23,-wheelZ],[wheelX,-.23,-wheelZ],[-wheelX,-.23,wheelZ],[wheelX,-.23,wheelZ]];
  const addWheel=(x,y,z,r=wheelRadius)=>{
    const pivot=new THREE.Group(); pivot.position.set(x,y,z); group.add(pivot);
    const tire=add(new THREE.CylinderGeometry(r,r,.56,20),rubber,v(0,0,0),{z:Math.PI/2},pivot);
    add(new THREE.CylinderGeometry(r*.52,r*.52,.59,16),chrome,v(0,0,0),{z:Math.PI/2},pivot);
    add(new THREE.CylinderGeometry(r*.2,r*.2,.61,12),trimMat,v(0,0,0),{z:Math.PI/2},pivot);
    wheelParts.push({pivot,tire});
  };

  // Shared undercarriage and wheel geometry.
  add(new THREE.BoxGeometry(3.3,.62,5.1),darkMat,v(0,-.18,0));
  wheelPositions.forEach(p=>addWheel(...p));

  switch(car.shape){
    case 'cart': {
      add(new THREE.BoxGeometry(3.2,.35,4.6),chrome,v(0,.12,0));
      add(new THREE.BoxGeometry(3.25,.2,4.55),bodyMat,v(0,.38,0));
      const basket=add(new THREE.BoxGeometry(3,1.65,3.2),bodyMat,v(0,1.2,-.1));
      add(new THREE.BoxGeometry(3.12,.1,.1),trimMat,v(0,2.06,-1.7));
      for(const x of [-1.45,1.45]) for(const z of [-1.62,1.42]) add(new THREE.BoxGeometry(.12,1.55,.12),chrome,v(x,1.22,z));
      for(let y=.66;y<1.95;y+=.42) add(new THREE.BoxGeometry(2.92,.055,.055),chrome,v(0,y,-.1));
      add(new THREE.TorusGeometry(.52,.1,8,18),trimMat,v(0,2.25,2.25),{x:Math.PI/2});
      break;
    }
    case 'sofa': {
      add(new THREE.BoxGeometry(4.4,1.15,4.9),bodyMat,v(0,.34,0));
      add(new THREE.BoxGeometry(4.25,2.2,.72),bodyMat,v(0,1.45,-2));
      add(new THREE.BoxGeometry(.65,1.2,4.35),bodyMat,v(-1.9,.83,0));
      add(new THREE.BoxGeometry(.65,1.2,4.35),bodyMat,v(1.9,.83,0));
      for(let x of [-1.15,0,1.15]) add(new THREE.BoxGeometry(1,.16,3.05),trimMat,v(x,.95,.05));
      for(let x of [-1.2,1.2]) add(new THREE.SphereGeometry(.24,12,10),trimMat,v(x,1.85,-1.7));
      break;
    }
    case 'fridge': {
      add(new THREE.BoxGeometry(3.75,4.55,3.8),bodyMat,v(0,1.45,0));
      add(new THREE.BoxGeometry(3.8,.1,3.88),chrome,v(0,3.72,0));
      add(new THREE.BoxGeometry(3.4,2.35,.1),glassMat,v(0,2.25,1.96));
      add(new THREE.BoxGeometry(.13,1.25,.15),trimMat,v(1.3,2.45,2.05));
      add(new THREE.BoxGeometry(3.45,.12,.15),chrome,v(0,.95,2.02));
      add(new THREE.BoxGeometry(3.5,.2,3.7),chrome,v(0,-.88,0));
      break;
    }
    case 'bus': {
      add(new THREE.BoxGeometry(4.3,2.85,8.1),bodyMat,v(0,.78,0));
      add(new THREE.BoxGeometry(4.32,.27,8.12),trimMat,v(0,2.23,0));
      add(new THREE.BoxGeometry(3.5,1.45,.12),glassMat,v(0,1.12,4.08));
      for(let z=-2.65;z<=2.7;z+=1.32){
        add(new THREE.BoxGeometry(.94,1.08,.08),glassMat,v(-2.17,1.25,z));
        add(new THREE.BoxGeometry(.94,1.08,.08),glassMat,v(2.17,1.25,z));
      }
      add(new THREE.BoxGeometry(4.4,.35,1),darkMat,v(0,-.5,3.75));
      add(new THREE.BoxGeometry(.3,.5,.3),trimMat,v(-1.9,2.45,-3.5));
      break;
    }
    case 'tub': {
      add(new THREE.BoxGeometry(4.2,.55,5.1),bodyMat,v(0,-.05,0));
      add(new THREE.BoxGeometry(4.35,1.25,.42),bodyMat,v(0,.55,2.25));
      add(new THREE.BoxGeometry(.42,1.25,4.6),bodyMat,v(-1.95,.55,0));
      add(new THREE.BoxGeometry(.42,1.25,4.6),bodyMat,v(1.95,.55,0));
      add(new THREE.BoxGeometry(4.05,1.05,.42),bodyMat,v(0,.55,-2.25));
      add(new THREE.BoxGeometry(3.55,.08,4.1),glassMat,v(0,.53,0));
      add(new THREE.TorusGeometry(1.5,.16,10,36),trimMat,v(0,1.2,-.4),{x:Math.PI/2});
      break;
    }
    case 'ikea': {
      add(new THREE.BoxGeometry(4.1,2.2,6.4),bodyMat,v(0,.54,0));
      add(new THREE.BoxGeometry(4.18,.44,6.48),trimMat,v(0,1.75,0));
      add(new THREE.BoxGeometry(3.15,1.18,.12),glassMat,v(0,1.0,3.22));
      add(new THREE.BoxGeometry(4.22,.42,1),trimMat,v(0,-.42,2.7));
      add(new THREE.BoxGeometry(4.4,.16,.22),chrome,v(0,2.12,-1.2));
      add(new THREE.BoxGeometry(.18,1.0,.18),chrome,v(-1.7,2.08,-1.2));
      add(new THREE.BoxGeometry(.18,1.0,.18),chrome,v(1.7,2.08,-1.2));
      break;
    }
    case 'ufo': {
      add(new THREE.CylinderGeometry(3.4,4.2,.8,36),bodyMat,v(0,.35,0));
      add(new THREE.TorusGeometry(3.35,.28,12,48),trimMat,v(0,.35,0));
      add(new THREE.SphereGeometry(2.0,24,16,0,Math.PI*2,0,Math.PI/2),glassMat,v(0,.72,0));
      for(let i=0;i<12;i++){
        const a=i/12*Math.PI*2;
        add(new THREE.SphereGeometry(.18,10,8),trimMat,v(Math.cos(a)*3.15,.18,Math.sin(a)*3.15));
      }
      break;
    }
    case 'toilet': {
      add(new THREE.BoxGeometry(3.8,1.35,3.8),bodyMat,v(0,.03,-.15));
      add(new THREE.CylinderGeometry(1.6,1.42,1.9,32),bodyMat,v(0,.95,.7));
      add(new THREE.TorusGeometry(1.48,.25,12,42),trimMat,v(0,1.96,.72),{x:Math.PI/2});
      add(new THREE.BoxGeometry(2.7,2.35,.75),bodyMat,v(0,1.25,-2.05));
      add(new THREE.BoxGeometry(1.1,.16,.18),chrome,v(0,2.45,-2.05));
      add(new THREE.SphereGeometry(.18,12,8),trimMat,v(0,2.5,-1.6));
      break;
    }
  }
  // Small front lights and rear details make orientation legible from the chase camera.
  for(const x of [-1.2,1.2]){
    add(new THREE.BoxGeometry(.55,.22,.15),material(secret?0xff4a24:0xfff3c6,.2,.15,{emissive:secret?0xff250e:0xffd88a,emissiveIntensity:.55}),v(x,.1,car.shape==='bus'?4.16:2.55));
    add(new THREE.BoxGeometry(.48,.22,.15),material(0xc72e35,.25,.1,{emissive:0x561016,emissiveIntensity:.35}),v(x,.05,-2.7));
  }
  group.userData.wheels=wheelParts;
  group.userData.materials={bodyMat,trimMat};
  group.scale.setScalar(car.shape==='bus'?.92:car.shape==='fridge'?.92:1);
  return group;
}

export class CarController {
  constructor(rapier, physics, carData, upgrades, spawn, yaw, secret=false, skin='factory') {
    this.R=rapier; this.world=physics; this.data=carData; this.upgrades=upgrades||{}; this.secret=secret;
    this.mass=carData.weight;
    this.half={x:carData.shape==='bus'?2.25:carData.shape==='sofa'?2.25:1.9,y:carData.shape==='fridge'?2.25:carData.shape==='bus'?1.55:carData.shape==='sofa'?1.4:carData.shape==='toilet'?1.4:1.05,z:carData.shape==='bus'?4.2:carData.shape==='ikea'?3.3:2.65};
    const q={x:0,y:Math.sin(yaw/2),z:0,w:Math.cos(yaw/2)};
    const rbDesc=rapier.RigidBodyDesc.dynamic().setTranslation(spawn.x,spawn.y,spawn.z).setRotation(q).setLinearDamping(.12).setAngularDamping(2.2).setCanSleep(false);
    this.body=physics.createRigidBody(rbDesc);
    const collider=rapier.ColliderDesc.cuboid(this.half.x,this.half.y,this.half.z).setMass(this.mass).setFriction(1.65).setRestitution(.1);
    physics.createCollider(collider,this.body);
    this.visual=createCarVisual(carData,secret,skin);
    this.visual.position.set(spawn.x,spawn.y,spawn.z); this.visual.quaternion.set(q.x,q.y,q.z,q.w);
    this.cooldowns={jump:0,ability:0}; this.nitro=100; this.abilityTimer=0; this.distance=0; this.airTime=0; this.jumps=0;
    this.speed=0; this.boosting=false; this.drifting=false; this.lastSafe=spawn.clone();
  }
  get forward() { const q=this.body.rotation(); return new THREE.Vector3(0,0,1).applyQuaternion(new THREE.Quaternion(q.x,q.y,q.z,q.w)); }
  get position() { const p=this.body.translation(); return v(p.x,p.y,p.z); }
  getVelocity() { const v0=this.body.linvel(); return v(v0.x,v0.y,v0.z); }
  get stats() {
    const u=this.upgrades;
    return {
      maxSpeed:this.data.speed + (u.engine||0)*2.2,
      accel:this.data.accel*(1+(u.engine||0)*.08),
      grip:this.data.grip+(u.handling||0)*1.1,
      jump:6.5+(u.suspension||0)*.45,
      nitroPower:1+(u.nitro||0)*.16
    };
  }
  update(dt,input,worldGravity=-9.81) {
    const R=this.R, body=this.body, p=body.translation(), velocity=body.linvel();
    const q=body.rotation(); const quat=new THREE.Quaternion(q.x,q.y,q.z,q.w);
    const forward=new THREE.Vector3(0,0,1).applyQuaternion(quat);
    const right=new THREE.Vector3(1,0,0).applyQuaternion(quat);
    const stats=this.stats;
    const signedSpeed=velocity.x*forward.x+velocity.z*forward.z;
    this.speed=Math.hypot(velocity.x,velocity.z);
    const grounded=p.y<=this.half.y+.24 && Math.abs(velocity.y)<2.2;
    this.drifting=!!input.drift && this.speed>5;
    this.boosting=!!input.nitro&&this.nitro>0&&this.speed>1;
    if(input.throttle){
      const force=stats.accel*this.mass*dt*(signedSpeed>stats.maxSpeed?Math.max(.08,1-(signedSpeed-stats.maxSpeed)*.15):1);
      body.applyImpulse({x:forward.x*force,y:0,z:forward.z*force},true);
    }
    if(input.brake){
      if(this.speed>1.1 && signedSpeed>0.8){const brake=Math.min(this.speed,this.data.accel*1.6*dt);body.applyImpulse({x:-velocity.x/this.speed*this.mass*brake,y:0,z:-velocity.z/this.speed*this.mass*brake},true);}
      else {body.applyImpulse({x:-forward.x*this.mass*stats.accel*.58*dt,y:0,z:-forward.z*this.mass*stats.accel*.58*dt},true);}
    }
    if(this.boosting){
      const boost=this.mass*stats.nitroPower*22*dt;
      body.applyImpulse({x:forward.x*boost,y:grounded?0.45:0,z:forward.z*boost},true);
      this.nitro=Math.max(0,this.nitro-dt*25);
    }else this.nitro=Math.min(100,this.nitro+dt*(grounded?7:3));
    // Lateral grip is tuned per vehicle; holding drift loosens it for controllable slides.
    const lateral=velocity.x*right.x+velocity.z*right.z;
    const grip=this.drifting ? 0.34 : (0.72+stats.grip*.055);
    const sideImpulse=Math.min(Math.abs(lateral)*this.mass*grip*dt, this.mass*4*dt);
    if(Math.abs(lateral)>.03) body.applyImpulse({x:-right.x*Math.sign(lateral)*sideImpulse,y:0,z:-right.z*Math.sign(lateral)*sideImpulse},true);
    const speedFactor=THREE.MathUtils.clamp(this.speed/5,.16,1.4);
    const turnRate=(.48+stats.grip*.045)*speedFactor;
    if(input.left||input.right){
      const steer=(input.left?1:0)-(input.right?1:0);
      const direction=signedSpeed<-.8?-1:1;
      body.setAngvel({x:velocity.y*.018,y:steer*turnRate*direction,z:0},true);
    }else{
      const av=body.angvel(); body.setAngvel({x:av.x*.3,y:av.y*.82,z:av.z*.3},true);
    }
    if(input.jump && grounded && this.cooldowns.jump<=0){
      body.applyImpulse({x:0,y:this.mass*stats.jump,z:0},true);
      this.cooldowns.jump=0.9; this.jumps++;
    }
    if(input.ability && this.cooldowns.ability<=0){
      this.activateAbility();
    }
    if(this.data.id==='ufo'&&this.abilityTimer>0){ body.applyImpulse({x:0,y:this.mass*7.2*dt,z:0},true); }
    if(this.abilityTimer>0) this.abilityTimer=Math.max(0,this.abilityTimer-dt);
    this.cooldowns.jump=Math.max(0,this.cooldowns.jump-dt);
    this.cooldowns.ability=Math.max(0,this.cooldowns.ability-dt);
    const cap=stats.maxSpeed+(this.boosting?18:0);
    const horizontal=Math.hypot(velocity.x,velocity.z);
    if(horizontal>cap){const k=cap/horizontal;body.setLinvel({x:velocity.x*k,y:velocity.y,z:velocity.z*k},true);}
    if(grounded&&Math.abs(velocity.y)<1.8){this.lastSafe=this.position;this.airTime=0;}else this.airTime+=dt;
    this.distance+=this.speed*dt;
    const pos=body.translation();
    this.visual.position.set(pos.x,pos.y,pos.z);
    const rot=body.rotation(); this.visual.quaternion.set(rot.x,rot.y,rot.z,rot.w);
    for(const wheel of this.visual.userData.wheels||[]) wheel.pivot.rotation.x+=this.speed*dt*1.8;
    return {grounded,speed:this.speed,position:this.position,boosting:this.boosting,drifting:this.drifting};
  }
  activateAbility() {
    if(this.cooldowns.ability>0) return false;
    const level=this.upgrades.ability||0;
    const cooldown=Math.max(7,13-level*.8);
    this.cooldowns.ability=cooldown;
    this.abilityTimer=2.2+level*.25;
    if(this.data.id==='cart'||this.data.id==='sofa'){
      this.body.applyImpulse({x:0,y:this.mass*(this.data.id==='sofa'?7.8:4.2),z:0},true);
    }else if(this.data.id==='fridge'||this.data.id==='bus'){
      const vel=this.body.linvel(); const speed=Math.hypot(vel.x,vel.z);
      if(speed>1)this.body.applyImpulse({x:vel.x/speed*this.mass*3.4,y:0,z:vel.z/speed*this.mass*3.4},true);
    }else if(this.data.id==='tub'||this.data.id==='ikea'){
      const f=this.forward; this.body.applyImpulse({x:f.x*this.mass*8,y:0,z:f.z*this.mass*8},true);
    }else if(this.data.id==='ufo'){
      this.body.applyImpulse({x:0,y:this.mass*7,z:0},true);
    }else if(this.data.id==='toilet'){
      const f=this.forward; this.body.applyImpulse({x:f.x*this.mass*10,y:this.mass*1.5,z:f.z*this.mass*10},true);
    }
    return true;
  }
  dispose() { this.world.removeRigidBody(this.body); this.visual.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material){const list=Array.isArray(o.material)?o.material:[o.material];for(const m of list){if(m.map)m.map.dispose();m.dispose();}}}); }
}
