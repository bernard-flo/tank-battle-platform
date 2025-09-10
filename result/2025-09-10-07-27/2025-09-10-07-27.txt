function name(){return "Apex-T1";}
function type(){return Type.TANKER;}
function update(tank,enemies,allies,bulletInfo){
  const toDeg=(x,y)=>Math.atan2(y,x)*180/Math.PI;
  const norm=(a)=>{a%=360; if(a<0)a+=360; return a;};
  const clamp=(v,lo,hi)=>v<lo?lo:v>hi?hi:v;
  const P={
    minRange:180,maxRange:280,strafe:26,threat:72,allySep:62,edge:44,bias:-10,aimJitter:0.20,leadCap:9,leadWeight:0.9
  };

  // Target: prioritize lowest health then nearest
  let tgt=null,best=1e9;
  for(const e of enemies){ const key=e.health*1.3 + e.distance*0.1; if(key<best){best=key; tgt=e;} }

  // Optional per-context state (persists in Node vm; not in browser)
  if(typeof update.__s==="undefined") update.__s={ last:null };

  // Fire with optional lead
  if(tgt){
    let ax=tgt.x, ay=tgt.y;
    const st=update.__s;
    if(st && st.last){
      const dt=1; const vx=(tgt.x-st.last.x)/dt, vy=(tgt.y-st.last.y)/dt;
      const dx=tgt.x-tank.x, dy=tgt.y-tank.y; const d=Math.hypot(dx,dy);
      const tLead = clamp(d/8,0,P.leadCap); // bullet speed 8 px/tick
      ax = tgt.x + vx*P.leadWeight*tLead; ay = tgt.y + vy*P.leadWeight*tLead;
    }
    const jitter = ((tank.x*31+tank.y*17)%23-11)*0.08*P.aimJitter;
    tank.fire(toDeg(ax-tank.x, ay-tank.y)+jitter);
    update.__s.last={x:tgt.x,y:tgt.y};
  }

  let tries=0; const go=(a)=>{tries++; return tank.move(norm(a));};

  // Bullet avoidance (nearest-approach test)
  let hot=null, minD=1e9;
  for(const b of bulletInfo){
    const dx=b.x-tank.x, dy=b.y-tank.y; const v=Math.hypot(b.vx,b.vy)||1; const nx=b.vx/v, ny=b.vy/v;
    const proj=dx*nx+dy*ny; if(proj>0){ const px=b.x-proj*nx, py=b.y-proj*ny; const d=Math.hypot(px-tank.x,py-tank.y); if(d<minD && d<P.threat){ minD=d; hot=b; } }
  }
  if(hot){ const a=toDeg(hot.vx,hot.vy); const cand=[a+90+P.bias, a-90-P.bias, a+115, a-115]; for(const c of cand){ if(go(c)) return; } }

  // Edges
  if(tank.x<P.edge){ if(go(0)) return; }
  if(tank.x>900-P.edge){ if(go(180)) return; }
  if(tank.y<P.edge){ if(go(90)) return; }
  if(tank.y>600-P.edge){ if(go(270)) return; }

  // Ally separation
  let near=null,ad=1e9; for(const a of allies){ if(a.distance<ad){ ad=a.distance; near=a; } }
  if(near && ad<P.allySep){ const away=toDeg(tank.x-near.x, tank.y-near.y); if(go(away)) return; if(go(away+30)) return; if(go(away-30)) return; }

  // Spacing vs target
  if(tgt){ const to=toDeg(tgt.x-tank.x,tgt.y-tank.y), d=tgt.distance; if(d<P.minRange){ const away=to+180+P.bias*0.5; if(go(away)) return; if(go(away+25)) return; if(go(away-25)) return; } else if(d>P.maxRange){ if(go(to)) return; if(go(to+18)) return; if(go(to-18)) return; } else { const side=to+(((tank.x*13+tank.y*7)%2)?P.strafe:-P.strafe)+P.bias*0.3; if(go(side)) return; if(go(side+18)) return; if(go(side-18)) return; } }

  // Sweep fallback
  for(const s of [0,60,120,180,240,300]){ if(go(s+P.bias)) return; }
}

// ===== 다음 로봇 =====

function name(){return "Apex-T2";}
function type(){return Type.TANKER;}
function update(tank,enemies,allies,bulletInfo){
  const toDeg=(x,y)=>Math.atan2(y,x)*180/Math.PI; const norm=(a)=>{a%=360; if(a<0)a+=360; return a;}; const clamp=(v,lo,hi)=>v<lo?lo:v>hi?hi:v;
  const P={minRange:180,maxRange:280,strafe:26,threat:72,allySep:62,edge:44,bias:10,aimJitter:0.20,leadCap:9,leadWeight:0.9};
  let tgt=null,best=1e9; for(const e of enemies){ const key=e.health*1.3 + e.distance*0.1; if(key<best){best=key; tgt=e;} }
  if(typeof update.__s==="undefined") update.__s={ last:null };
  if(tgt){ let ax=tgt.x, ay=tgt.y; const st=update.__s; if(st&&st.last){ const dt=1; const vx=(tgt.x-st.last.x)/dt, vy=(tgt.y-st.last.y)/dt; const dx=tgt.x-tank.x, dy=tgt.y-tank.y; const d=Math.hypot(dx,dy); const tLead=clamp(d/8,0,P.leadCap); ax=tgt.x+vx*P.leadWeight*tLead; ay=tgt.y+vy*P.leadWeight*tLead; } const jitter=((tank.x*29+tank.y*19)%23-11)*0.08*P.aimJitter; tank.fire(toDeg(ax-tank.x,ay-tank.y)+jitter); update.__s.last={x:tgt.x,y:tgt.y}; }
  let tries=0; const go=(a)=>{tries++; return tank.move(norm(a));};
  let hot=null, minD=1e9; for(const b of bulletInfo){ const dx=b.x-tank.x, dy=b.y-tank.y; const v=Math.hypot(b.vx,b.vy)||1; const nx=b.vx/v, ny=b.vy/v; const proj=dx*nx+dy*ny; if(proj>0){ const px=b.x-proj*nx, py=b.y-proj*ny; const d=Math.hypot(px-tank.x,py-tank.y); if(d<minD && d<P.threat){ minD=d; hot=b; } } }
  if(hot){ const a=toDeg(hot.vx,hot.vy); for(const c of [a+90+P.bias, a-90-P.bias, a+115, a-115]){ if(go(c)) return; } }
  if(tank.x<P.edge){ if(go(0)) return; } if(tank.x>900-P.edge){ if(go(180)) return; } if(tank.y<P.edge){ if(go(90)) return; } if(tank.y>600-P.edge){ if(go(270)) return; }
  let near=null,ad=1e9; for(const a of allies){ if(a.distance<ad){ ad=a.distance; near=a; } } if(near && ad<P.allySep){ const away=toDeg(tank.x-near.x,tank.y-near.y); if(go(away)) return; if(go(away+30)) return; if(go(away-30)) return; }
  if(tgt){ const to=toDeg(tgt.x-tank.x,tgt.y-tank.y), d=tgt.distance; if(d<P.minRange){ const away=to+180+P.bias*0.5; if(go(away)) return; if(go(away+25)) return; if(go(away-25)) return; } else if(d>P.maxRange){ if(go(to)) return; if(go(to+18)) return; if(go(to-18)) return; } else { const side=to+(((tank.x*11+tank.y*5)%2)?P.strafe:-P.strafe)+P.bias*0.3; if(go(side)) return; if(go(side+18)) return; if(go(side-18)) return; } }
  for(const s of [0,60,120,180,240,300]){ if(go(s+P.bias)) return; }
}

// ===== 다음 로봇 =====

function name(){return "Apex-D1";}
function type(){return Type.DEALER;}
function update(tank,enemies,allies,bulletInfo){
  const toDeg=(x,y)=>Math.atan2(y,x)*180/Math.PI; const norm=(a)=>{a%=360; if(a<0)a+=360; return a;}; const clamp=(v,lo,hi)=>v<lo?lo:v>hi?hi:v;
  const P={minRange:220,maxRange:330,strafe:32,threat:74,allySep:60,edge:44,bias:-6,aimJitter:0.22,leadCap:9,leadWeight:1.0};
  let tgt=null,best=1e9; for(const e of enemies){ const key=e.health*1.4 + e.distance*0.1; if(key<best){best=key; tgt=e;} }
  if(typeof update.__s==="undefined") update.__s={ last:null };
  if(tgt){ let ax=tgt.x, ay=tgt.y; const st=update.__s; if(st&&st.last){ const vx=(tgt.x-st.last.x), vy=(tgt.y-st.last.y); const d=Math.hypot(tgt.x-tank.x,tgt.y-tank.y); const tLead=clamp(d/8,0,P.leadCap); ax=tgt.x+vx*P.leadWeight*tLead; ay=tgt.y+vy*P.leadWeight*tLead; } const jitter=((tank.x*17+tank.y*13)%23-11)*0.09*P.aimJitter; tank.fire(toDeg(ax-tank.x,ay-tank.y)+jitter); update.__s.last={x:tgt.x,y:tgt.y}; }
  let tries=0; const go=(a)=>{tries++; return tank.move(norm(a));};
  let hot=null, minD=1e9; for(const b of bulletInfo){ const dx=b.x-tank.x, dy=b.y-tank.y; const v=Math.hypot(b.vx,b.vy)||1; const nx=b.vx/v, ny=b.vy/v; const proj=dx*nx+dy*ny; if(proj>0){ const px=b.x-proj*nx, py=b.y-proj*ny; const d=Math.hypot(px-tank.x,py-tank.y); if(d<minD && d<P.threat){ minD=d; hot=b; } } }
  if(hot){ const a=toDeg(hot.vx,hot.vy); for(const c of [a+95+P.bias, a-95-P.bias, a+115, a-115]){ if(go(c)) return; } }
  if(tank.x<P.edge){ if(go(0)) return; } if(tank.x>900-P.edge){ if(go(180)) return; } if(tank.y<P.edge){ if(go(90)) return; } if(tank.y>600-P.edge){ if(go(270)) return; }
  let near=null,ad=1e9; for(const a of allies){ if(a.distance<ad){ ad=a.distance; near=a; } } if(near && ad<P.allySep){ const away=toDeg(tank.x-near.x,tank.y-near.y); if(go(away)) return; if(go(away+30)) return; if(go(away-30)) return; }
  if(tgt){ const to=toDeg(tgt.x-tank.x,tgt.y-tank.y), d=tgt.distance; if(d<P.minRange){ const away=to+180+P.bias*0.4; if(go(away)) return; if(go(away+28)) return; if(go(away-28)) return; } else if(d>P.maxRange){ if(go(to)) return; if(go(to+16)) return; if(go(to-16)) return; } else { const side=to+(((tank.x*7+tank.y*19)%2)?P.strafe:-P.strafe)+P.bias*0.25; if(go(side)) return; if(go(side+16)) return; if(go(side-16)) return; } }
  for(const s of [0,50,100,150,200,250,300,350]){ if(go(s+P.bias)) return; }
}

// ===== 다음 로봇 =====

function name(){return "Apex-D2";}
function type(){return Type.DEALER;}
function update(tank,enemies,allies,bulletInfo){
  const toDeg=(x,y)=>Math.atan2(y,x)*180/Math.PI; const norm=(a)=>{a%=360; if(a<0)a+=360; return a;}; const clamp=(v,lo,hi)=>v<lo?lo:v>hi?hi:v;
  const P={minRange:220,maxRange:330,strafe:32,threat:74,allySep:60,edge:44,bias:6,aimJitter:0.22,leadCap:9,leadWeight:1.0};
  let tgt=null,best=1e9; for(const e of enemies){ const key=e.health*1.4 + e.distance*0.1; if(key<best){best=key; tgt=e;} }
  if(typeof update.__s==="undefined") update.__s={ last:null };
  if(tgt){ let ax=tgt.x, ay=tgt.y; const st=update.__s; if(st&&st.last){ const vx=(tgt.x-st.last.x), vy=(tgt.y-st.last.y); const d=Math.hypot(tgt.x-tank.x,tgt.y-tank.y); const tLead=clamp(d/8,0,P.leadCap); ax=tgt.x+vx*P.leadWeight*tLead; ay=tgt.y+vy*P.leadWeight*tLead; } const jitter=((tank.x*19+tank.y*11)%23-11)*0.09*P.aimJitter; tank.fire(toDeg(ax-tank.x,ay-tank.y)+jitter); update.__s.last={x:tgt.x,y:tgt.y}; }
  let tries=0; const go=(a)=>{tries++; return tank.move(norm(a));};
  let hot=null, minD=1e9; for(const b of bulletInfo){ const dx=b.x-tank.x, dy=b.y-tank.y; const v=Math.hypot(b.vx,b.vy)||1; const nx=b.vx/v, ny=b.vy/v; const proj=dx*nx+dy*ny; if(proj>0){ const px=b.x-proj*nx, py=b.y-proj*ny; const d=Math.hypot(px-tank.x,py-tank.y); if(d<minD && d<P.threat){ minD=d; hot=b; } } }
  if(hot){ const a=toDeg(hot.vx,hot.vy); for(const c of [a+95+P.bias, a-95-P.bias, a+115, a-115]){ if(go(c)) return; } }
  if(tank.x<P.edge){ if(go(0)) return; } if(tank.x>900-P.edge){ if(go(180)) return; } if(tank.y<P.edge){ if(go(90)) return; } if(tank.y>600-P.edge){ if(go(270)) return; }
  let near=null,ad=1e9; for(const a of allies){ if(a.distance<ad){ ad=a.distance; near=a; } } if(near && ad<P.allySep){ const away=toDeg(tank.x-near.x,tank.y-near.y); if(go(away)) return; if(go(away+30)) return; if(go(away-30)) return; }
  if(tgt){ const to=toDeg(tgt.x-tank.x,tgt.y-tank.y), d=tgt.distance; if(d<P.minRange){ const away=to+180+P.bias*0.4; if(go(away)) return; if(go(away+28)) return; if(go(away-28)) return; } else if(d>P.maxRange){ if(go(to)) return; if(go(to+16)) return; if(go(to-16)) return; } else { const side=to+(((tank.x*5+tank.y*23)%2)?P.strafe:-P.strafe)+P.bias*0.25; if(go(side)) return; if(go(side+16)) return; if(go(side-16)) return; } }
  for(const s of [0,50,100,150,200,250,300,350]){ if(go(s+P.bias)) return; }
}

// ===== 다음 로봇 =====

function name(){return "Apex-D3";}
function type(){return Type.DEALER;}
function update(tank,enemies,allies,bulletInfo){
  const toDeg=(x,y)=>Math.atan2(y,x)*180/Math.PI; const norm=(a)=>{a%=360; if(a<0)a+=360; return a;}; const clamp=(v,lo,hi)=>v<lo?lo:v>hi?hi:v;
  const P={minRange:220,maxRange:330,strafe:32,threat:74,allySep:60,edge:44,bias:0,aimJitter:0.22,leadCap:9,leadWeight:1.0};
  let tgt=null,best=1e9; for(const e of enemies){ const key=e.health*1.4 + e.distance*0.1; if(key<best){best=key; tgt=e;} }
  if(typeof update.__s==="undefined") update.__s={ last:null };
  if(tgt){ let ax=tgt.x, ay=tgt.y; const st=update.__s; if(st&&st.last){ const vx=(tgt.x-st.last.x), vy=(tgt.y-st.last.y); const d=Math.hypot(tgt.x-tank.x,tgt.y-tank.y); const tLead=clamp(d/8,0,P.leadCap); ax=tgt.x+vx*P.leadWeight*tLead; ay=tgt.y+vy*P.leadWeight*tLead; } const jitter=((tank.x*23+tank.y*5)%23-11)*0.09*P.aimJitter; tank.fire(toDeg(ax-tank.x,ay-tank.y)+jitter); update.__s.last={x:tgt.x,y:tgt.y}; }
  let tries=0; const go=(a)=>{tries++; return tank.move(norm(a));};
  let hot=null, minD=1e9; for(const b of bulletInfo){ const dx=b.x-tank.x, dy=b.y-tank.y; const v=Math.hypot(b.vx,b.vy)||1; const nx=b.vx/v, ny=b.vy/v; const proj=dx*nx+dy*ny; if(proj>0){ const px=b.x-proj*nx, py=b.y-proj*ny; const d=Math.hypot(px-tank.x,py-tank.y); if(d<minD && d<P.threat){ minD=d; hot=b; } } }
  if(hot){ const a=toDeg(hot.vx,hot.vy); for(const c of [a+95+P.bias, a-95-P.bias, a+115, a-115]){ if(go(c)) return; } }
  if(tank.x<P.edge){ if(go(0)) return; } if(tank.x>900-P.edge){ if(go(180)) return; } if(tank.y<P.edge){ if(go(90)) return; } if(tank.y>600-P.edge){ if(go(270)) return; }
  let near=null,ad=1e9; for(const a of allies){ if(a.distance<ad){ ad=a.distance; near=a; } } if(near && ad<P.allySep){ const away=toDeg(tank.x-near.x,tank.y-near.y); if(go(away)) return; if(go(away+30)) return; if(go(away-30)) return; }
  if(tgt){ const to=toDeg(tgt.x-tank.x,tgt.y-tank.y), d=tgt.distance; if(d<P.minRange){ const away=to+180+P.bias*0.4; if(go(away)) return; if(go(away+28)) return; if(go(away-28)) return; } else if(d>P.maxRange){ if(go(to)) return; if(go(to+16)) return; if(go(to-16)) return; } else { const side=to+(((tank.x*3+tank.y*29)%2)?P.strafe:-P.strafe)+P.bias*0.25; if(go(side)) return; if(go(side+16)) return; if(go(side-16)) return; } }
  for(const s of [0,50,100,150,200,250,300,350]){ if(go(s+P.bias)) return; }
}

// ===== 다음 로봇 =====

function name(){return "Apex-N1";}
function type(){return Type.NORMAL;}
function update(tank,enemies,allies,bulletInfo){
  const toDeg=(x,y)=>Math.atan2(y,x)*180/Math.PI; const norm=(a)=>{a%=360; if(a<0)a+=360; return a;}; const clamp=(v,lo,hi)=>v<lo?lo:v>hi?hi:v;
  const P={minRange:190,maxRange:300,strafe:28,threat:70,allySep:60,edge:44,bias:4,aimJitter:0.20,leadCap:9,leadWeight:0.95};
  let tgt=null,best=1e9; for(const e of enemies){ const key=e.health*1.35 + e.distance*0.1; if(key<best){best=key; tgt=e;} }
  if(typeof update.__s==="undefined") update.__s={ last:null };
  if(tgt){ let ax=tgt.x, ay=tgt.y; const st=update.__s; if(st&&st.last){ const vx=(tgt.x-st.last.x), vy=(tgt.y-st.last.y); const d=Math.hypot(tgt.x-tank.x,tgt.y-tank.y); const tLead=clamp(d/8,0,P.leadCap); ax=tgt.x+vx*P.leadWeight*tLead; ay=tgt.y+vy*P.leadWeight*tLead; } const jitter=((tank.x*7+tank.y*23)%23-11)*0.08*P.aimJitter; tank.fire(toDeg(ax-tank.x,ay-tank.y)+jitter); update.__s.last={x:tgt.x,y:tgt.y}; }
  let tries=0; const go=(a)=>{tries++; return tank.move(norm(a));};
  let hot=null, minD=1e9; for(const b of bulletInfo){ const dx=b.x-tank.x, dy=b.y-tank.y; const v=Math.hypot(b.vx,b.vy)||1; const nx=b.vx/v, ny=b.vy/v; const proj=dx*nx+dy*ny; if(proj>0){ const px=b.x-proj*nx, py=b.y-proj*ny; const d=Math.hypot(px-tank.x,py-tank.y); if(d<minD && d<P.threat){ minD=d; hot=b; } } }
  if(hot){ const a=toDeg(hot.vx,hot.vy); for(const c of [a+90+P.bias, a-90-P.bias, a+110, a-110]){ if(go(c)) return; } }
  if(tank.x<P.edge){ if(go(0)) return; } if(tank.x>900-P.edge){ if(go(180)) return; } if(tank.y<P.edge){ if(go(90)) return; } if(tank.y>600-P.edge){ if(go(270)) return; }
  let near=null,ad=1e9; for(const a of allies){ if(a.distance<ad){ ad=a.distance; near=a; } } if(near && ad<P.allySep){ const away=toDeg(tank.x-near.x,tank.y-near.y); if(go(away)) return; if(go(away+30)) return; if(go(away-30)) return; }
  if(tgt){ const to=toDeg(tgt.x-tank.x,tgt.y-tank.y), d=tgt.distance; if(d<P.minRange){ const away=to+180+P.bias*0.5; if(go(away)) return; if(go(away+25)) return; if(go(away-25)) return; } else if(d>P.maxRange){ if(go(to)) return; if(go(to+18)) return; if(go(to-18)) return; } else { const side=to+(((tank.x*17+tank.y*3)%2)?P.strafe:-P.strafe)+P.bias*0.3; if(go(side)) return; if(go(side+18)) return; if(go(side-18)) return; } }
  for(const s of [0,60,120,180,240,300]){ if(go(s+P.bias)) return; }
}
