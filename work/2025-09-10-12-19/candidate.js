function name(){return "HeliosX-T1";}
function type(){return Type.TANKER;}
let __state_0={last:null,tick:0,lastVel:null,side: ((0*17)%2?1:-1)};
function update(tank,enemies,allies,bulletInfo){
  const H=Math.hypot,D=(x,y)=>Math.atan2(y,x)*180/Math.PI,N=(a)=>{a%=360;if(a<0)a+=360;return a;},CL=(v,l,h)=>v<l?l:v>h?h:v; 
  const P={"rMin":177.072,"rMax":271.908,"strafe":16.32,"threatR":195.242,"threatH":3.987,"fleeBias":18.03,"sep":76.078,"edge":54.024,"leadCap":19.894,"leadW":1.161,"aimJitter":0.151,"aimBias":0.036,"healthW":1.124,"distW":0.2,"finisherHP":24.384,"aggrRemain":2.939,"aggrIn":27.624,"aggrOut":16.889,"prefDealer":1.086,"prefNormal":0.069,"bias":-8.116};
  const S=__state_0; S.tick=(S.tick||0)+1;
  // 1) Target selection (health-weighted, distance bias, finisher preference)
  let tgt=null,best=1e18; for(const e of enemies){ const tw=(e.health<=P.finisherHP?-80:0) + (P.prefDealer?(e.type===2?-10:0):0) + (P.prefNormal?(e.type===0?-6:0):0); const k=e.health*P.healthW + e.distance*P.distW + (e.x+e.y)*(P.tieBias||0) + tw; if(k<best){best=k; tgt=e;} }
  // 2) Predictive leading aim (quadratic intercept, low-pass velocity estimate)
  if(tgt){ let ax=tgt.x,ay=tgt.y,vx=0,vy=0; if(S.last){ const lvx=S.lastVel?S.lastVel.vx:0,lvy=S.lastVel?S.lastVel.vy:0; const ivx=(tgt.x-S.last.x),ivy=(tgt.y-S.last.y); vx=lvx*0.5+ivx*0.5; vy=lvy*0.5+ivy*0.5; S.lastVel={vx,vy}; const rx=tgt.x-tank.x,ry=tgt.y-tank.y,s2=64; const aa=vx*vx+vy*vy-s2, bb=2*(rx*vx+ry*vy), cc=rx*rx+ry*ry; let tHit=0; if(Math.abs(aa)<1e-6){ tHit=bb!==0?CL(-cc/bb,0,P.leadCap):0; } else { const disc=bb*bb-4*aa*cc; if(disc>=0){ const sd=Math.sqrt(disc), t1=(-bb-sd)/(2*aa), t2=(-bb+sd)/(2*aa); const tc=t1>0&&t2>0?Math.min(t1,t2):(t1>0?t1:(t2>0?t2:0)); tHit=CL(tc,0,P.leadCap);} } ax=tgt.x+vx*P.leadW*tHit; ay=tgt.y+vy*P.leadW*tHit; }
    const jitter=(((S.tick*13 + tank.x*7 + tank.y*3 + 0*11)%23)-11)*0.07*(P.aimJitter||0)+(P.aimBias||0); tank.fire(D(ax-tank.x,ay-tank.y)+jitter); S.last={x:tgt.x,y:tgt.y}; }
  // Helper to attempt moves
  let moved=0; const go=(a)=>{ if(moved>20) return true; moved++; return tank.move(N(a)); };
  // 3) Bullet avoidance: perpendicular sidestep weighted by time-to-closest-approach
  let hot=null,score=1e18; for(const b of bulletInfo){ const dx=b.x-tank.x,dy=b.y-tank.y; const v=H(b.vx,b.vy)||1; const nx=b.vx/v,ny=b.vy/v; const proj=dx*nx+dy*ny; if(proj>0){ const px=b.x-proj*nx,py=b.y-proj*ny; const dist=H(px-tank.x,py-tank.y); const tt=proj/v; const s=dist+tt*(P.threatH||4); if(dist<P.threatR && s<score){ score=s; hot=b; } } }
  if(hot){ const a=D(hot.vx,hot.vy); const side=(S.side||1)*P.fleeBias + (P.bias||0)*0.5; const opts=[a+90+side,a-90-side,a+120,a-120,a+70,a-70,a+150,a-150]; for(const c of opts){ if(go(c)) return; } }
  // 4) Wall avoidance
  if(tank.x<P.edge){ if(go(0)) return; } if(tank.x>900-P.edge){ if(go(180)) return; } if(tank.y<P.edge){ if(go(90)) return; } if(tank.y>600-P.edge){ if(go(270)) return; }
  // 5) Ally separation
  let near=null,ad=1e18; for(const a of allies){ if(a.distance<ad){ ad=a.distance; near=a; } } if(near && ad<P.sep){ const away=D(tank.x-near.x,tank.y-near.y); if(go(away)) return; if(go(away+18)) return; if(go(away-18)) return; }
  // 6) Range control & strafing
  if(tgt){ const to=D(tgt.x-tank.x,tgt.y-tank.y), d=tgt.distance; let r0=P.rMin,r1=P.rMax; if((tgt.health<=P.finisherHP)||enemies.length<=P.aggrRemain){ r0=Math.max(120,r0-(P.aggrIn||30)); r1=Math.max(160,r1-(P.aggrOut||20)); } if(d<r0){ const aw=to+180+(P.bias||0)*0.4; if(go(aw)) return; if(go(aw+16)) return; if(go(aw-16)) return; } else if(d>r1){ if(go(to)) return; if(go(to+14)) return; if(go(to-14)) return; } else { const s=to+((S.side||1)*P.strafe)+(P.bias||0)*0.5; if(go(s)) return; if(go(s+16)) return; if(go(s-16)) return; } }
  // 7) Sweep fallback
  for(const s of [0,60,120,180,240,300]){ if(go(s+(P.bias||0))) return; }
}

// ===== 다음 로봇 =====

function name(){return "HeliosX-D2";}
function type(){return Type.DEALER;}
let __state_1={last:null,tick:0,lastVel:null,side: ((1*17)%2?1:-1)};
function update(tank,enemies,allies,bulletInfo){
  const H=Math.hypot,D=(x,y)=>Math.atan2(y,x)*180/Math.PI,N=(a)=>{a%=360;if(a<0)a+=360;return a;},CL=(v,l,h)=>v<l?l:v>h?h:v; 
  const P={"rMin":222.272,"rMax":334.291,"strafe":35.496,"threatR":186.716,"threatH":4.968,"fleeBias":15.967,"sep":59.324,"edge":48.381,"leadCap":23.115,"leadW":1.169,"aimJitter":0.105,"aimBias":-0.362,"healthW":1.239,"distW":0.05,"finisherHP":19.942,"aggrRemain":1.904,"aggrIn":34.373,"aggrOut":22.638,"prefDealer":0.947,"prefNormal":0.047,"bias":-5.993};
  const S=__state_1; S.tick=(S.tick||0)+1;
  // 1) Target selection (health-weighted, distance bias, finisher preference)
  let tgt=null,best=1e18; for(const e of enemies){ const tw=(e.health<=P.finisherHP?-80:0) + (P.prefDealer?(e.type===2?-10:0):0) + (P.prefNormal?(e.type===0?-6:0):0); const k=e.health*P.healthW + e.distance*P.distW + (e.x+e.y)*(P.tieBias||0) + tw; if(k<best){best=k; tgt=e;} }
  // 2) Predictive leading aim (quadratic intercept, low-pass velocity estimate)
  if(tgt){ let ax=tgt.x,ay=tgt.y,vx=0,vy=0; if(S.last){ const lvx=S.lastVel?S.lastVel.vx:0,lvy=S.lastVel?S.lastVel.vy:0; const ivx=(tgt.x-S.last.x),ivy=(tgt.y-S.last.y); vx=lvx*0.5+ivx*0.5; vy=lvy*0.5+ivy*0.5; S.lastVel={vx,vy}; const rx=tgt.x-tank.x,ry=tgt.y-tank.y,s2=64; const aa=vx*vx+vy*vy-s2, bb=2*(rx*vx+ry*vy), cc=rx*rx+ry*ry; let tHit=0; if(Math.abs(aa)<1e-6){ tHit=bb!==0?CL(-cc/bb,0,P.leadCap):0; } else { const disc=bb*bb-4*aa*cc; if(disc>=0){ const sd=Math.sqrt(disc), t1=(-bb-sd)/(2*aa), t2=(-bb+sd)/(2*aa); const tc=t1>0&&t2>0?Math.min(t1,t2):(t1>0?t1:(t2>0?t2:0)); tHit=CL(tc,0,P.leadCap);} } ax=tgt.x+vx*P.leadW*tHit; ay=tgt.y+vy*P.leadW*tHit; }
    const jitter=(((S.tick*13 + tank.x*7 + tank.y*3 + 1*11)%23)-11)*0.07*(P.aimJitter||0)+(P.aimBias||0); tank.fire(D(ax-tank.x,ay-tank.y)+jitter); S.last={x:tgt.x,y:tgt.y}; }
  // Helper to attempt moves
  let moved=0; const go=(a)=>{ if(moved>20) return true; moved++; return tank.move(N(a)); };
  // 3) Bullet avoidance: perpendicular sidestep weighted by time-to-closest-approach
  let hot=null,score=1e18; for(const b of bulletInfo){ const dx=b.x-tank.x,dy=b.y-tank.y; const v=H(b.vx,b.vy)||1; const nx=b.vx/v,ny=b.vy/v; const proj=dx*nx+dy*ny; if(proj>0){ const px=b.x-proj*nx,py=b.y-proj*ny; const dist=H(px-tank.x,py-tank.y); const tt=proj/v; const s=dist+tt*(P.threatH||4); if(dist<P.threatR && s<score){ score=s; hot=b; } } }
  if(hot){ const a=D(hot.vx,hot.vy); const side=(S.side||1)*P.fleeBias + (P.bias||0)*0.5; const opts=[a+90+side,a-90-side,a+120,a-120,a+70,a-70,a+150,a-150]; for(const c of opts){ if(go(c)) return; } }
  // 4) Wall avoidance
  if(tank.x<P.edge){ if(go(0)) return; } if(tank.x>900-P.edge){ if(go(180)) return; } if(tank.y<P.edge){ if(go(90)) return; } if(tank.y>600-P.edge){ if(go(270)) return; }
  // 5) Ally separation
  let near=null,ad=1e18; for(const a of allies){ if(a.distance<ad){ ad=a.distance; near=a; } } if(near && ad<P.sep){ const away=D(tank.x-near.x,tank.y-near.y); if(go(away)) return; if(go(away+18)) return; if(go(away-18)) return; }
  // 6) Range control & strafing
  if(tgt){ const to=D(tgt.x-tank.x,tgt.y-tank.y), d=tgt.distance; let r0=P.rMin,r1=P.rMax; if((tgt.health<=P.finisherHP)||enemies.length<=P.aggrRemain){ r0=Math.max(120,r0-(P.aggrIn||30)); r1=Math.max(160,r1-(P.aggrOut||20)); } if(d<r0){ const aw=to+180+(P.bias||0)*0.4; if(go(aw)) return; if(go(aw+16)) return; if(go(aw-16)) return; } else if(d>r1){ if(go(to)) return; if(go(to+14)) return; if(go(to-14)) return; } else { const s=to+((S.side||1)*P.strafe)+(P.bias||0)*0.5; if(go(s)) return; if(go(s+16)) return; if(go(s-16)) return; } }
  // 7) Sweep fallback
  for(const s of [0,60,120,180,240,300]){ if(go(s+(P.bias||0))) return; }
}

// ===== 다음 로봇 =====

function name(){return "HeliosX-N3";}
function type(){return Type.NORMAL;}
let __state_2={last:null,tick:0,lastVel:null,side: ((2*17)%2?1:-1)};
function update(tank,enemies,allies,bulletInfo){
  const H=Math.hypot,D=(x,y)=>Math.atan2(y,x)*180/Math.PI,N=(a)=>{a%=360;if(a<0)a+=360;return a;},CL=(v,l,h)=>v<l?l:v>h?h:v; 
  const P={"rMin":195.034,"rMax":299.832,"strafe":31.767,"threatR":191.478,"threatH":3.987,"fleeBias":15.905,"sep":63.592,"edge":58.087,"leadCap":21.076,"leadW":1.036,"aimJitter":0.17,"aimBias":-0.047,"healthW":1.136,"distW":0.166,"finisherHP":22.985,"aggrRemain":2.907,"aggrIn":22.205,"aggrOut":22.22,"prefDealer":0.993,"prefNormal":0.914,"bias":-3.979};
  const S=__state_2; S.tick=(S.tick||0)+1;
  // 1) Target selection (health-weighted, distance bias, finisher preference)
  let tgt=null,best=1e18; for(const e of enemies){ const tw=(e.health<=P.finisherHP?-80:0) + (P.prefDealer?(e.type===2?-10:0):0) + (P.prefNormal?(e.type===0?-6:0):0); const k=e.health*P.healthW + e.distance*P.distW + (e.x+e.y)*(P.tieBias||0) + tw; if(k<best){best=k; tgt=e;} }
  // 2) Predictive leading aim (quadratic intercept, low-pass velocity estimate)
  if(tgt){ let ax=tgt.x,ay=tgt.y,vx=0,vy=0; if(S.last){ const lvx=S.lastVel?S.lastVel.vx:0,lvy=S.lastVel?S.lastVel.vy:0; const ivx=(tgt.x-S.last.x),ivy=(tgt.y-S.last.y); vx=lvx*0.5+ivx*0.5; vy=lvy*0.5+ivy*0.5; S.lastVel={vx,vy}; const rx=tgt.x-tank.x,ry=tgt.y-tank.y,s2=64; const aa=vx*vx+vy*vy-s2, bb=2*(rx*vx+ry*vy), cc=rx*rx+ry*ry; let tHit=0; if(Math.abs(aa)<1e-6){ tHit=bb!==0?CL(-cc/bb,0,P.leadCap):0; } else { const disc=bb*bb-4*aa*cc; if(disc>=0){ const sd=Math.sqrt(disc), t1=(-bb-sd)/(2*aa), t2=(-bb+sd)/(2*aa); const tc=t1>0&&t2>0?Math.min(t1,t2):(t1>0?t1:(t2>0?t2:0)); tHit=CL(tc,0,P.leadCap);} } ax=tgt.x+vx*P.leadW*tHit; ay=tgt.y+vy*P.leadW*tHit; }
    const jitter=(((S.tick*13 + tank.x*7 + tank.y*3 + 2*11)%23)-11)*0.07*(P.aimJitter||0)+(P.aimBias||0); tank.fire(D(ax-tank.x,ay-tank.y)+jitter); S.last={x:tgt.x,y:tgt.y}; }
  // Helper to attempt moves
  let moved=0; const go=(a)=>{ if(moved>20) return true; moved++; return tank.move(N(a)); };
  // 3) Bullet avoidance: perpendicular sidestep weighted by time-to-closest-approach
  let hot=null,score=1e18; for(const b of bulletInfo){ const dx=b.x-tank.x,dy=b.y-tank.y; const v=H(b.vx,b.vy)||1; const nx=b.vx/v,ny=b.vy/v; const proj=dx*nx+dy*ny; if(proj>0){ const px=b.x-proj*nx,py=b.y-proj*ny; const dist=H(px-tank.x,py-tank.y); const tt=proj/v; const s=dist+tt*(P.threatH||4); if(dist<P.threatR && s<score){ score=s; hot=b; } } }
  if(hot){ const a=D(hot.vx,hot.vy); const side=(S.side||1)*P.fleeBias + (P.bias||0)*0.5; const opts=[a+90+side,a-90-side,a+120,a-120,a+70,a-70,a+150,a-150]; for(const c of opts){ if(go(c)) return; } }
  // 4) Wall avoidance
  if(tank.x<P.edge){ if(go(0)) return; } if(tank.x>900-P.edge){ if(go(180)) return; } if(tank.y<P.edge){ if(go(90)) return; } if(tank.y>600-P.edge){ if(go(270)) return; }
  // 5) Ally separation
  let near=null,ad=1e18; for(const a of allies){ if(a.distance<ad){ ad=a.distance; near=a; } } if(near && ad<P.sep){ const away=D(tank.x-near.x,tank.y-near.y); if(go(away)) return; if(go(away+18)) return; if(go(away-18)) return; }
  // 6) Range control & strafing
  if(tgt){ const to=D(tgt.x-tank.x,tgt.y-tank.y), d=tgt.distance; let r0=P.rMin,r1=P.rMax; if((tgt.health<=P.finisherHP)||enemies.length<=P.aggrRemain){ r0=Math.max(120,r0-(P.aggrIn||30)); r1=Math.max(160,r1-(P.aggrOut||20)); } if(d<r0){ const aw=to+180+(P.bias||0)*0.4; if(go(aw)) return; if(go(aw+16)) return; if(go(aw-16)) return; } else if(d>r1){ if(go(to)) return; if(go(to+14)) return; if(go(to-14)) return; } else { const s=to+((S.side||1)*P.strafe)+(P.bias||0)*0.5; if(go(s)) return; if(go(s+16)) return; if(go(s-16)) return; } }
  // 7) Sweep fallback
  for(const s of [0,60,120,180,240,300]){ if(go(s+(P.bias||0))) return; }
}

// ===== 다음 로봇 =====

function name(){return "HeliosX-N4";}
function type(){return Type.NORMAL;}
let __state_3={last:null,tick:0,lastVel:null,side: ((3*17)%2?1:-1)};
function update(tank,enemies,allies,bulletInfo){
  const H=Math.hypot,D=(x,y)=>Math.atan2(y,x)*180/Math.PI,N=(a)=>{a%=360;if(a<0)a+=360;return a;},CL=(v,l,h)=>v<l?l:v>h?h:v; 
  const P={"rMin":195.034,"rMax":299.832,"strafe":31.767,"threatR":191.478,"threatH":3.987,"fleeBias":15.905,"sep":63.592,"edge":58.087,"leadCap":21.076,"leadW":1.036,"aimJitter":0.17,"aimBias":-0.047,"healthW":1.136,"distW":0.166,"finisherHP":22.985,"aggrRemain":2.907,"aggrIn":22.205,"aggrOut":22.22,"prefDealer":0.993,"prefNormal":0.914,"bias":8.021};
  const S=__state_3; S.tick=(S.tick||0)+1;
  // 1) Target selection (health-weighted, distance bias, finisher preference)
  let tgt=null,best=1e18; for(const e of enemies){ const tw=(e.health<=P.finisherHP?-80:0) + (P.prefDealer?(e.type===2?-10:0):0) + (P.prefNormal?(e.type===0?-6:0):0); const k=e.health*P.healthW + e.distance*P.distW + (e.x+e.y)*(P.tieBias||0) + tw; if(k<best){best=k; tgt=e;} }
  // 2) Predictive leading aim (quadratic intercept, low-pass velocity estimate)
  if(tgt){ let ax=tgt.x,ay=tgt.y,vx=0,vy=0; if(S.last){ const lvx=S.lastVel?S.lastVel.vx:0,lvy=S.lastVel?S.lastVel.vy:0; const ivx=(tgt.x-S.last.x),ivy=(tgt.y-S.last.y); vx=lvx*0.5+ivx*0.5; vy=lvy*0.5+ivy*0.5; S.lastVel={vx,vy}; const rx=tgt.x-tank.x,ry=tgt.y-tank.y,s2=64; const aa=vx*vx+vy*vy-s2, bb=2*(rx*vx+ry*vy), cc=rx*rx+ry*ry; let tHit=0; if(Math.abs(aa)<1e-6){ tHit=bb!==0?CL(-cc/bb,0,P.leadCap):0; } else { const disc=bb*bb-4*aa*cc; if(disc>=0){ const sd=Math.sqrt(disc), t1=(-bb-sd)/(2*aa), t2=(-bb+sd)/(2*aa); const tc=t1>0&&t2>0?Math.min(t1,t2):(t1>0?t1:(t2>0?t2:0)); tHit=CL(tc,0,P.leadCap);} } ax=tgt.x+vx*P.leadW*tHit; ay=tgt.y+vy*P.leadW*tHit; }
    const jitter=(((S.tick*13 + tank.x*7 + tank.y*3 + 3*11)%23)-11)*0.07*(P.aimJitter||0)+(P.aimBias||0); tank.fire(D(ax-tank.x,ay-tank.y)+jitter); S.last={x:tgt.x,y:tgt.y}; }
  // Helper to attempt moves
  let moved=0; const go=(a)=>{ if(moved>20) return true; moved++; return tank.move(N(a)); };
  // 3) Bullet avoidance: perpendicular sidestep weighted by time-to-closest-approach
  let hot=null,score=1e18; for(const b of bulletInfo){ const dx=b.x-tank.x,dy=b.y-tank.y; const v=H(b.vx,b.vy)||1; const nx=b.vx/v,ny=b.vy/v; const proj=dx*nx+dy*ny; if(proj>0){ const px=b.x-proj*nx,py=b.y-proj*ny; const dist=H(px-tank.x,py-tank.y); const tt=proj/v; const s=dist+tt*(P.threatH||4); if(dist<P.threatR && s<score){ score=s; hot=b; } } }
  if(hot){ const a=D(hot.vx,hot.vy); const side=(S.side||1)*P.fleeBias + (P.bias||0)*0.5; const opts=[a+90+side,a-90-side,a+120,a-120,a+70,a-70,a+150,a-150]; for(const c of opts){ if(go(c)) return; } }
  // 4) Wall avoidance
  if(tank.x<P.edge){ if(go(0)) return; } if(tank.x>900-P.edge){ if(go(180)) return; } if(tank.y<P.edge){ if(go(90)) return; } if(tank.y>600-P.edge){ if(go(270)) return; }
  // 5) Ally separation
  let near=null,ad=1e18; for(const a of allies){ if(a.distance<ad){ ad=a.distance; near=a; } } if(near && ad<P.sep){ const away=D(tank.x-near.x,tank.y-near.y); if(go(away)) return; if(go(away+18)) return; if(go(away-18)) return; }
  // 6) Range control & strafing
  if(tgt){ const to=D(tgt.x-tank.x,tgt.y-tank.y), d=tgt.distance; let r0=P.rMin,r1=P.rMax; if((tgt.health<=P.finisherHP)||enemies.length<=P.aggrRemain){ r0=Math.max(120,r0-(P.aggrIn||30)); r1=Math.max(160,r1-(P.aggrOut||20)); } if(d<r0){ const aw=to+180+(P.bias||0)*0.4; if(go(aw)) return; if(go(aw+16)) return; if(go(aw-16)) return; } else if(d>r1){ if(go(to)) return; if(go(to+14)) return; if(go(to-14)) return; } else { const s=to+((S.side||1)*P.strafe)+(P.bias||0)*0.5; if(go(s)) return; if(go(s+16)) return; if(go(s-16)) return; } }
  // 7) Sweep fallback
  for(const s of [0,60,120,180,240,300]){ if(go(s+(P.bias||0))) return; }
}

// ===== 다음 로봇 =====

function name(){return "HeliosX-D5";}
function type(){return Type.DEALER;}
let __state_4={last:null,tick:0,lastVel:null,side: ((4*17)%2?1:-1)};
function update(tank,enemies,allies,bulletInfo){
  const H=Math.hypot,D=(x,y)=>Math.atan2(y,x)*180/Math.PI,N=(a)=>{a%=360;if(a<0)a+=360;return a;},CL=(v,l,h)=>v<l?l:v>h?h:v; 
  const P={"rMin":222.272,"rMax":334.291,"strafe":35.496,"threatR":186.716,"threatH":4.968,"fleeBias":15.967,"sep":59.324,"edge":48.381,"leadCap":23.115,"leadW":1.169,"aimJitter":0.105,"aimBias":-0.362,"healthW":1.239,"distW":0.05,"finisherHP":19.942,"aggrRemain":1.904,"aggrIn":34.373,"aggrOut":22.638,"prefDealer":0.947,"prefNormal":0.047,"bias":-17.993000000000002};
  const S=__state_4; S.tick=(S.tick||0)+1;
  // 1) Target selection (health-weighted, distance bias, finisher preference)
  let tgt=null,best=1e18; for(const e of enemies){ const tw=(e.health<=P.finisherHP?-80:0) + (P.prefDealer?(e.type===2?-10:0):0) + (P.prefNormal?(e.type===0?-6:0):0); const k=e.health*P.healthW + e.distance*P.distW + (e.x+e.y)*(P.tieBias||0) + tw; if(k<best){best=k; tgt=e;} }
  // 2) Predictive leading aim (quadratic intercept, low-pass velocity estimate)
  if(tgt){ let ax=tgt.x,ay=tgt.y,vx=0,vy=0; if(S.last){ const lvx=S.lastVel?S.lastVel.vx:0,lvy=S.lastVel?S.lastVel.vy:0; const ivx=(tgt.x-S.last.x),ivy=(tgt.y-S.last.y); vx=lvx*0.5+ivx*0.5; vy=lvy*0.5+ivy*0.5; S.lastVel={vx,vy}; const rx=tgt.x-tank.x,ry=tgt.y-tank.y,s2=64; const aa=vx*vx+vy*vy-s2, bb=2*(rx*vx+ry*vy), cc=rx*rx+ry*ry; let tHit=0; if(Math.abs(aa)<1e-6){ tHit=bb!==0?CL(-cc/bb,0,P.leadCap):0; } else { const disc=bb*bb-4*aa*cc; if(disc>=0){ const sd=Math.sqrt(disc), t1=(-bb-sd)/(2*aa), t2=(-bb+sd)/(2*aa); const tc=t1>0&&t2>0?Math.min(t1,t2):(t1>0?t1:(t2>0?t2:0)); tHit=CL(tc,0,P.leadCap);} } ax=tgt.x+vx*P.leadW*tHit; ay=tgt.y+vy*P.leadW*tHit; }
    const jitter=(((S.tick*13 + tank.x*7 + tank.y*3 + 4*11)%23)-11)*0.07*(P.aimJitter||0)+(P.aimBias||0); tank.fire(D(ax-tank.x,ay-tank.y)+jitter); S.last={x:tgt.x,y:tgt.y}; }
  // Helper to attempt moves
  let moved=0; const go=(a)=>{ if(moved>20) return true; moved++; return tank.move(N(a)); };
  // 3) Bullet avoidance: perpendicular sidestep weighted by time-to-closest-approach
  let hot=null,score=1e18; for(const b of bulletInfo){ const dx=b.x-tank.x,dy=b.y-tank.y; const v=H(b.vx,b.vy)||1; const nx=b.vx/v,ny=b.vy/v; const proj=dx*nx+dy*ny; if(proj>0){ const px=b.x-proj*nx,py=b.y-proj*ny; const dist=H(px-tank.x,py-tank.y); const tt=proj/v; const s=dist+tt*(P.threatH||4); if(dist<P.threatR && s<score){ score=s; hot=b; } } }
  if(hot){ const a=D(hot.vx,hot.vy); const side=(S.side||1)*P.fleeBias + (P.bias||0)*0.5; const opts=[a+90+side,a-90-side,a+120,a-120,a+70,a-70,a+150,a-150]; for(const c of opts){ if(go(c)) return; } }
  // 4) Wall avoidance
  if(tank.x<P.edge){ if(go(0)) return; } if(tank.x>900-P.edge){ if(go(180)) return; } if(tank.y<P.edge){ if(go(90)) return; } if(tank.y>600-P.edge){ if(go(270)) return; }
  // 5) Ally separation
  let near=null,ad=1e18; for(const a of allies){ if(a.distance<ad){ ad=a.distance; near=a; } } if(near && ad<P.sep){ const away=D(tank.x-near.x,tank.y-near.y); if(go(away)) return; if(go(away+18)) return; if(go(away-18)) return; }
  // 6) Range control & strafing
  if(tgt){ const to=D(tgt.x-tank.x,tgt.y-tank.y), d=tgt.distance; let r0=P.rMin,r1=P.rMax; if((tgt.health<=P.finisherHP)||enemies.length<=P.aggrRemain){ r0=Math.max(120,r0-(P.aggrIn||30)); r1=Math.max(160,r1-(P.aggrOut||20)); } if(d<r0){ const aw=to+180+(P.bias||0)*0.4; if(go(aw)) return; if(go(aw+16)) return; if(go(aw-16)) return; } else if(d>r1){ if(go(to)) return; if(go(to+14)) return; if(go(to-14)) return; } else { const s=to+((S.side||1)*P.strafe)+(P.bias||0)*0.5; if(go(s)) return; if(go(s+16)) return; if(go(s-16)) return; } }
  // 7) Sweep fallback
  for(const s of [0,60,120,180,240,300]){ if(go(s+(P.bias||0))) return; }
}

// ===== 다음 로봇 =====

function name(){return "HeliosX-N6";}
function type(){return Type.NORMAL;}
let __state_5={last:null,tick:0,lastVel:null,side: ((5*17)%2?1:-1)};
function update(tank,enemies,allies,bulletInfo){
  const H=Math.hypot,D=(x,y)=>Math.atan2(y,x)*180/Math.PI,N=(a)=>{a%=360;if(a<0)a+=360;return a;},CL=(v,l,h)=>v<l?l:v>h?h:v; 
  const P={"rMin":195.034,"rMax":299.832,"strafe":31.767,"threatR":191.478,"threatH":3.987,"fleeBias":15.905,"sep":63.592,"edge":58.087,"leadCap":21.076,"leadW":1.036,"aimJitter":0.17,"aimBias":-0.047,"healthW":1.136,"distW":0.166,"finisherHP":22.985,"aggrRemain":2.907,"aggrIn":22.205,"aggrOut":22.22,"prefDealer":0.993,"prefNormal":0.914,"bias":2.021};
  const S=__state_5; S.tick=(S.tick||0)+1;
  // 1) Target selection (health-weighted, distance bias, finisher preference)
  let tgt=null,best=1e18; for(const e of enemies){ const tw=(e.health<=P.finisherHP?-80:0) + (P.prefDealer?(e.type===2?-10:0):0) + (P.prefNormal?(e.type===0?-6:0):0); const k=e.health*P.healthW + e.distance*P.distW + (e.x+e.y)*(P.tieBias||0) + tw; if(k<best){best=k; tgt=e;} }
  // 2) Predictive leading aim (quadratic intercept, low-pass velocity estimate)
  if(tgt){ let ax=tgt.x,ay=tgt.y,vx=0,vy=0; if(S.last){ const lvx=S.lastVel?S.lastVel.vx:0,lvy=S.lastVel?S.lastVel.vy:0; const ivx=(tgt.x-S.last.x),ivy=(tgt.y-S.last.y); vx=lvx*0.5+ivx*0.5; vy=lvy*0.5+ivy*0.5; S.lastVel={vx,vy}; const rx=tgt.x-tank.x,ry=tgt.y-tank.y,s2=64; const aa=vx*vx+vy*vy-s2, bb=2*(rx*vx+ry*vy), cc=rx*rx+ry*ry; let tHit=0; if(Math.abs(aa)<1e-6){ tHit=bb!==0?CL(-cc/bb,0,P.leadCap):0; } else { const disc=bb*bb-4*aa*cc; if(disc>=0){ const sd=Math.sqrt(disc), t1=(-bb-sd)/(2*aa), t2=(-bb+sd)/(2*aa); const tc=t1>0&&t2>0?Math.min(t1,t2):(t1>0?t1:(t2>0?t2:0)); tHit=CL(tc,0,P.leadCap);} } ax=tgt.x+vx*P.leadW*tHit; ay=tgt.y+vy*P.leadW*tHit; }
    const jitter=(((S.tick*13 + tank.x*7 + tank.y*3 + 5*11)%23)-11)*0.07*(P.aimJitter||0)+(P.aimBias||0); tank.fire(D(ax-tank.x,ay-tank.y)+jitter); S.last={x:tgt.x,y:tgt.y}; }
  // Helper to attempt moves
  let moved=0; const go=(a)=>{ if(moved>20) return true; moved++; return tank.move(N(a)); };
  // 3) Bullet avoidance: perpendicular sidestep weighted by time-to-closest-approach
  let hot=null,score=1e18; for(const b of bulletInfo){ const dx=b.x-tank.x,dy=b.y-tank.y; const v=H(b.vx,b.vy)||1; const nx=b.vx/v,ny=b.vy/v; const proj=dx*nx+dy*ny; if(proj>0){ const px=b.x-proj*nx,py=b.y-proj*ny; const dist=H(px-tank.x,py-tank.y); const tt=proj/v; const s=dist+tt*(P.threatH||4); if(dist<P.threatR && s<score){ score=s; hot=b; } } }
  if(hot){ const a=D(hot.vx,hot.vy); const side=(S.side||1)*P.fleeBias + (P.bias||0)*0.5; const opts=[a+90+side,a-90-side,a+120,a-120,a+70,a-70,a+150,a-150]; for(const c of opts){ if(go(c)) return; } }
  // 4) Wall avoidance
  if(tank.x<P.edge){ if(go(0)) return; } if(tank.x>900-P.edge){ if(go(180)) return; } if(tank.y<P.edge){ if(go(90)) return; } if(tank.y>600-P.edge){ if(go(270)) return; }
  // 5) Ally separation
  let near=null,ad=1e18; for(const a of allies){ if(a.distance<ad){ ad=a.distance; near=a; } } if(near && ad<P.sep){ const away=D(tank.x-near.x,tank.y-near.y); if(go(away)) return; if(go(away+18)) return; if(go(away-18)) return; }
  // 6) Range control & strafing
  if(tgt){ const to=D(tgt.x-tank.x,tgt.y-tank.y), d=tgt.distance; let r0=P.rMin,r1=P.rMax; if((tgt.health<=P.finisherHP)||enemies.length<=P.aggrRemain){ r0=Math.max(120,r0-(P.aggrIn||30)); r1=Math.max(160,r1-(P.aggrOut||20)); } if(d<r0){ const aw=to+180+(P.bias||0)*0.4; if(go(aw)) return; if(go(aw+16)) return; if(go(aw-16)) return; } else if(d>r1){ if(go(to)) return; if(go(to+14)) return; if(go(to-14)) return; } else { const s=to+((S.side||1)*P.strafe)+(P.bias||0)*0.5; if(go(s)) return; if(go(s+16)) return; if(go(s-16)) return; } }
  // 7) Sweep fallback
  for(const s of [0,60,120,180,240,300]){ if(go(s+(P.bias||0))) return; }
}