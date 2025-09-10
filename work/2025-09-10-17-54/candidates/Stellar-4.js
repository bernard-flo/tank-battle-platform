function name(){return "Stellar-4-T1";}
function type(){return Type.TANKER;}
let __state_0 = { last:null, tick:0, lastVel:null, side: ((0*17)%2?1:-1) };
function update(tank,enemies,allies,bulletInfo){
  const H=Math.hypot, D=(x,y)=>Math.atan2(y,x)*180/Math.PI;
  const N=(a)=>{a%=360; if(a<0)a+=360; return a;};
  const CL=(v,l,h)=>v<l?l:v>h?h:v;
  const P={"rMin":178,"rMax":281,"strafe":19,"threatR":212,"threatH":5,"fleeBias":16,"sep":74,"edge":56,"leadCap":20,"leadW":1,"aimJitter":0.13,"healthW":1.25,"distW":0.09,"finisherHP":26,"aggrRemain":3,"aggrIn":28,"aggrOut":18,"bias":-12};
  const S=__state_0;
  S.tick=(S.tick||0)+1;

  // 1) Target selection (low health priority; distance tie-breaker)
  let tgt=null, best=1e18;
  for(const e of enemies){
    const k = e.health*1.25 + e.distance*0.09;
    if(k<best){best=k; tgt=e;}
  }

  // 2) Predictive aim using quadratic intercept solve (fallback to linear lead)
  if(tgt){
    let ax=tgt.x, ay=tgt.y;
    let vx=0, vy=0;
    if(S.last){
      const lvx=S.lastVel?S.lastVel.vx:0, lvy=S.lastVel?S.lastVel.vy:0;
      const ivx=(tgt.x-S.last.x), ivy=(tgt.y-S.last.y);
      vx = lvx*0.5 + ivx*0.5; vy = lvy*0.5 + ivy*0.5; // low-pass
      S.lastVel={vx,vy};
      // Solve |r + v t|^2 = (s t)^2 with s=8 px/tick
      const rx = tgt.x - tank.x, ry = tgt.y - tank.y;
      const s2 = 64; // 8^2
      const aa = vx*vx + vy*vy - s2;
      const bb = 2*(rx*vx + ry*vy);
      const cc = rx*rx + ry*ry;
      let tHit = 0;
      if (Math.abs(aa) < 1e-6) {
        tHit = bb !== 0 ? CL(-cc / bb, 0, P.leadCap) : 0;
      } else {
        const disc = bb*bb - 4*aa*cc;
        if (disc >= 0) {
          const sd = Math.sqrt(disc);
          const t1 = (-bb - sd) / (2*aa);
          const t2 = (-bb + sd) / (2*aa);
          const tc = t1>0 && t2>0 ? Math.min(t1,t2) : (t1>0?t1:(t2>0?t2:0));
          tHit = CL(tc, 0, P.leadCap);
        } else {
          // fallback to distance-based lead
          const d = H(rx,ry); tHit = CL(d/8, 0, P.leadCap);
        }
      }
      ax = tgt.x + vx * P.leadW * tHit;
      ay = tgt.y + vy * P.leadW * tHit;
    }
    const jitter = (((S.tick*13 + tank.x*7 + tank.y*3 + 0*11)%23)-11) * (P.aimJitter||0.12) * 0.07 + (P.aimBias||0);
    tank.fire(D(ax-tank.x,ay-tank.y) + jitter);
    S.last={x:tgt.x,y:tgt.y};
  }

  // Helper to attempt moves (HTML allows up to 10 fails; we cap tries locally)
  let moved=0; const go=(a)=>{ if(moved>20) return true; moved++; return tank.move(N(a)); };

  // 3) Bullet avoidance (distance-to-line + time to closest approach weighting)
  let hot=null,score=1e18;
  for(const b of bulletInfo){
    const dx=b.x-tank.x, dy=b.y-tank.y; const v=H(b.vx,b.vy)||1;
    const nx=b.vx/v, ny=b.vy/v; const proj=dx*nx+dy*ny;
    if(proj>0){
      const px=b.x-proj*nx, py=b.y-proj*ny;
      const dist=H(px-tank.x,py-tank.y);
      const tt=proj/v;
      const s = dist + tt*(P.threatH||4);
      if(dist<P.threatR && s<score){ score=s; hot=b; }
    }
  }
  if(hot){
    const a=D(hot.vx,hot.vy);
    const side=(S.side||1)*P.fleeBias + (P.bias||0)*0.5;
    const options=[a+90+side, a-90-side, a+120, a-120, a+70, a-70, a+150, a-150];
    for(const c of options){ if(go(c)) return; }
  }

  // 4) Edge avoidance
  if(tank.x < P.edge){ if(go(0)) return; }
  if(tank.x > 900-P.edge){ if(go(180)) return; }
  if(tank.y < P.edge){ if(go(90)) return; }
  if(tank.y > 600-P.edge){ if(go(270)) return; }

  // 5) Ally separation
  let near=null, ad=1e18; for(const a of allies){ if(a.distance<ad){ ad=a.distance; near=a; } }
  if(near && ad < P.sep){ const away=D(tank.x-near.x,tank.y-near.y); if(go(away)) return; if(go(away+18)) return; if(go(away-18)) return; }

  // 6) Range control + strafing (adaptive when finishing or outnumbering)
  if(tgt){
    const to=D(tgt.x-tank.x,tgt.y-tank.y), d=tgt.distance;
    let r0=P.rMin, r1=P.rMax;
    if((tgt.health<=P.finisherHP)||enemies.length<=P.aggrRemain){ r0=Math.max(120,r0-(P.aggrIn||30)); r1=Math.max(160,r1-(P.aggrOut||20)); }
    if(d<r0){ const aw=to+180+(P.bias||0)*0.4; if(go(aw)) return; if(go(aw+16)) return; if(go(aw-16)) return; }
    else if(d>r1){ if(go(to)) return; if(go(to+14)) return; if(go(to-14)) return; }
    else { const s=to + ((S.side||1) * P.strafe) + (P.bias||0)*0.5; if(go(s)) return; if(go(s+16)) return; if(go(s-16)) return; }
  }

  // 7) Fallback sweep
  for(const s of [0,60,120,180,240,300]){ if(go(s+(P.bias||0))) return; }
}


// ===== 다음 로봇 =====



function name(){return "Stellar-4-T2";}
function type(){return Type.TANKER;}
let __state_1 = { last:null, tick:0, lastVel:null, side: ((1*17)%2?1:-1) };
function update(tank,enemies,allies,bulletInfo){
  const H=Math.hypot, D=(x,y)=>Math.atan2(y,x)*180/Math.PI;
  const N=(a)=>{a%=360; if(a<0)a+=360; return a;};
  const CL=(v,l,h)=>v<l?l:v>h?h:v;
  const P={"rMin":184,"rMax":289,"strafe":21,"threatR":212,"threatH":5,"fleeBias":16,"sep":74,"edge":56,"leadCap":20,"leadW":1,"aimJitter":0.13,"healthW":1.25,"distW":0.09,"finisherHP":26,"aggrRemain":3,"aggrIn":28,"aggrOut":18,"bias":-12};
  const S=__state_1;
  S.tick=(S.tick||0)+1;

  // 1) Target selection (low health priority; distance tie-breaker)
  let tgt=null, best=1e18;
  for(const e of enemies){
    const k = e.health*1.25 + e.distance*0.09;
    if(k<best){best=k; tgt=e;}
  }

  // 2) Predictive aim using quadratic intercept solve (fallback to linear lead)
  if(tgt){
    let ax=tgt.x, ay=tgt.y;
    let vx=0, vy=0;
    if(S.last){
      const lvx=S.lastVel?S.lastVel.vx:0, lvy=S.lastVel?S.lastVel.vy:0;
      const ivx=(tgt.x-S.last.x), ivy=(tgt.y-S.last.y);
      vx = lvx*0.5 + ivx*0.5; vy = lvy*0.5 + ivy*0.5; // low-pass
      S.lastVel={vx,vy};
      // Solve |r + v t|^2 = (s t)^2 with s=8 px/tick
      const rx = tgt.x - tank.x, ry = tgt.y - tank.y;
      const s2 = 64; // 8^2
      const aa = vx*vx + vy*vy - s2;
      const bb = 2*(rx*vx + ry*vy);
      const cc = rx*rx + ry*ry;
      let tHit = 0;
      if (Math.abs(aa) < 1e-6) {
        tHit = bb !== 0 ? CL(-cc / bb, 0, P.leadCap) : 0;
      } else {
        const disc = bb*bb - 4*aa*cc;
        if (disc >= 0) {
          const sd = Math.sqrt(disc);
          const t1 = (-bb - sd) / (2*aa);
          const t2 = (-bb + sd) / (2*aa);
          const tc = t1>0 && t2>0 ? Math.min(t1,t2) : (t1>0?t1:(t2>0?t2:0));
          tHit = CL(tc, 0, P.leadCap);
        } else {
          // fallback to distance-based lead
          const d = H(rx,ry); tHit = CL(d/8, 0, P.leadCap);
        }
      }
      ax = tgt.x + vx * P.leadW * tHit;
      ay = tgt.y + vy * P.leadW * tHit;
    }
    const jitter = (((S.tick*13 + tank.x*7 + tank.y*3 + 1*11)%23)-11) * (P.aimJitter||0.12) * 0.07 + (P.aimBias||0);
    tank.fire(D(ax-tank.x,ay-tank.y) + jitter);
    S.last={x:tgt.x,y:tgt.y};
  }

  // Helper to attempt moves (HTML allows up to 10 fails; we cap tries locally)
  let moved=0; const go=(a)=>{ if(moved>20) return true; moved++; return tank.move(N(a)); };

  // 3) Bullet avoidance (distance-to-line + time to closest approach weighting)
  let hot=null,score=1e18;
  for(const b of bulletInfo){
    const dx=b.x-tank.x, dy=b.y-tank.y; const v=H(b.vx,b.vy)||1;
    const nx=b.vx/v, ny=b.vy/v; const proj=dx*nx+dy*ny;
    if(proj>0){
      const px=b.x-proj*nx, py=b.y-proj*ny;
      const dist=H(px-tank.x,py-tank.y);
      const tt=proj/v;
      const s = dist + tt*(P.threatH||4);
      if(dist<P.threatR && s<score){ score=s; hot=b; }
    }
  }
  if(hot){
    const a=D(hot.vx,hot.vy);
    const side=(S.side||1)*P.fleeBias + (P.bias||0)*0.5;
    const options=[a+90+side, a-90-side, a+120, a-120, a+70, a-70, a+150, a-150];
    for(const c of options){ if(go(c)) return; }
  }

  // 4) Edge avoidance
  if(tank.x < P.edge){ if(go(0)) return; }
  if(tank.x > 900-P.edge){ if(go(180)) return; }
  if(tank.y < P.edge){ if(go(90)) return; }
  if(tank.y > 600-P.edge){ if(go(270)) return; }

  // 5) Ally separation
  let near=null, ad=1e18; for(const a of allies){ if(a.distance<ad){ ad=a.distance; near=a; } }
  if(near && ad < P.sep){ const away=D(tank.x-near.x,tank.y-near.y); if(go(away)) return; if(go(away+18)) return; if(go(away-18)) return; }

  // 6) Range control + strafing (adaptive when finishing or outnumbering)
  if(tgt){
    const to=D(tgt.x-tank.x,tgt.y-tank.y), d=tgt.distance;
    let r0=P.rMin, r1=P.rMax;
    if((tgt.health<=P.finisherHP)||enemies.length<=P.aggrRemain){ r0=Math.max(120,r0-(P.aggrIn||30)); r1=Math.max(160,r1-(P.aggrOut||20)); }
    if(d<r0){ const aw=to+180+(P.bias||0)*0.4; if(go(aw)) return; if(go(aw+16)) return; if(go(aw-16)) return; }
    else if(d>r1){ if(go(to)) return; if(go(to+14)) return; if(go(to-14)) return; }
    else { const s=to + ((S.side||1) * P.strafe) + (P.bias||0)*0.5; if(go(s)) return; if(go(s+16)) return; if(go(s-16)) return; }
  }

  // 7) Fallback sweep
  for(const s of [0,60,120,180,240,300]){ if(go(s+(P.bias||0))) return; }
}


// ===== 다음 로봇 =====



function name(){return "Stellar-4-D1";}
function type(){return Type.DEALER;}
let __state_2 = { last:null, tick:0, lastVel:null, side: ((2*17)%2?1:-1) };
function update(tank,enemies,allies,bulletInfo){
  const H=Math.hypot, D=(x,y)=>Math.atan2(y,x)*180/Math.PI;
  const N=(a)=>{a%=360; if(a<0)a+=360; return a;};
  const CL=(v,l,h)=>v<l?l:v>h?h:v;
  const P={"rMin":258,"rMax":406,"strafe":25,"threatR":182,"threatH":6,"fleeBias":14,"sep":68,"edge":60,"leadCap":22,"leadW":1.06,"aimJitter":0.11,"healthW":1.2,"distW":0.08,"finisherHP":22,"aggrRemain":2,"aggrIn":30,"aggrOut":22,"aimBias":-0.6,"bias":-8};
  const S=__state_2;
  S.tick=(S.tick||0)+1;

  // 1) Target selection (low health priority; distance tie-breaker)
  let tgt=null, best=1e18;
  for(const e of enemies){
    const k = e.health*1.2 + e.distance*0.08;
    if(k<best){best=k; tgt=e;}
  }

  // 2) Predictive aim using quadratic intercept solve (fallback to linear lead)
  if(tgt){
    let ax=tgt.x, ay=tgt.y;
    let vx=0, vy=0;
    if(S.last){
      const lvx=S.lastVel?S.lastVel.vx:0, lvy=S.lastVel?S.lastVel.vy:0;
      const ivx=(tgt.x-S.last.x), ivy=(tgt.y-S.last.y);
      vx = lvx*0.5 + ivx*0.5; vy = lvy*0.5 + ivy*0.5; // low-pass
      S.lastVel={vx,vy};
      // Solve |r + v t|^2 = (s t)^2 with s=8 px/tick
      const rx = tgt.x - tank.x, ry = tgt.y - tank.y;
      const s2 = 64; // 8^2
      const aa = vx*vx + vy*vy - s2;
      const bb = 2*(rx*vx + ry*vy);
      const cc = rx*rx + ry*ry;
      let tHit = 0;
      if (Math.abs(aa) < 1e-6) {
        tHit = bb !== 0 ? CL(-cc / bb, 0, P.leadCap) : 0;
      } else {
        const disc = bb*bb - 4*aa*cc;
        if (disc >= 0) {
          const sd = Math.sqrt(disc);
          const t1 = (-bb - sd) / (2*aa);
          const t2 = (-bb + sd) / (2*aa);
          const tc = t1>0 && t2>0 ? Math.min(t1,t2) : (t1>0?t1:(t2>0?t2:0));
          tHit = CL(tc, 0, P.leadCap);
        } else {
          // fallback to distance-based lead
          const d = H(rx,ry); tHit = CL(d/8, 0, P.leadCap);
        }
      }
      ax = tgt.x + vx * P.leadW * tHit;
      ay = tgt.y + vy * P.leadW * tHit;
    }
    const jitter = (((S.tick*13 + tank.x*7 + tank.y*3 + 2*11)%23)-11) * (P.aimJitter||0.12) * 0.07 + (P.aimBias||0);
    tank.fire(D(ax-tank.x,ay-tank.y) + jitter);
    S.last={x:tgt.x,y:tgt.y};
  }

  // Helper to attempt moves (HTML allows up to 10 fails; we cap tries locally)
  let moved=0; const go=(a)=>{ if(moved>20) return true; moved++; return tank.move(N(a)); };

  // 3) Bullet avoidance (distance-to-line + time to closest approach weighting)
  let hot=null,score=1e18;
  for(const b of bulletInfo){
    const dx=b.x-tank.x, dy=b.y-tank.y; const v=H(b.vx,b.vy)||1;
    const nx=b.vx/v, ny=b.vy/v; const proj=dx*nx+dy*ny;
    if(proj>0){
      const px=b.x-proj*nx, py=b.y-proj*ny;
      const dist=H(px-tank.x,py-tank.y);
      const tt=proj/v;
      const s = dist + tt*(P.threatH||4);
      if(dist<P.threatR && s<score){ score=s; hot=b; }
    }
  }
  if(hot){
    const a=D(hot.vx,hot.vy);
    const side=(S.side||1)*P.fleeBias + (P.bias||0)*0.5;
    const options=[a+90+side, a-90-side, a+120, a-120, a+70, a-70, a+150, a-150];
    for(const c of options){ if(go(c)) return; }
  }

  // 4) Edge avoidance
  if(tank.x < P.edge){ if(go(0)) return; }
  if(tank.x > 900-P.edge){ if(go(180)) return; }
  if(tank.y < P.edge){ if(go(90)) return; }
  if(tank.y > 600-P.edge){ if(go(270)) return; }

  // 5) Ally separation
  let near=null, ad=1e18; for(const a of allies){ if(a.distance<ad){ ad=a.distance; near=a; } }
  if(near && ad < P.sep){ const away=D(tank.x-near.x,tank.y-near.y); if(go(away)) return; if(go(away+18)) return; if(go(away-18)) return; }

  // 6) Range control + strafing (adaptive when finishing or outnumbering)
  if(tgt){
    const to=D(tgt.x-tank.x,tgt.y-tank.y), d=tgt.distance;
    let r0=P.rMin, r1=P.rMax;
    if((tgt.health<=P.finisherHP)||enemies.length<=P.aggrRemain){ r0=Math.max(120,r0-(P.aggrIn||30)); r1=Math.max(160,r1-(P.aggrOut||20)); }
    if(d<r0){ const aw=to+180+(P.bias||0)*0.4; if(go(aw)) return; if(go(aw+16)) return; if(go(aw-16)) return; }
    else if(d>r1){ if(go(to)) return; if(go(to+14)) return; if(go(to-14)) return; }
    else { const s=to + ((S.side||1) * P.strafe) + (P.bias||0)*0.5; if(go(s)) return; if(go(s+16)) return; if(go(s-16)) return; }
  }

  // 7) Fallback sweep
  for(const s of [0,60,120,180,240,300]){ if(go(s+(P.bias||0))) return; }
}


// ===== 다음 로봇 =====



function name(){return "Stellar-4-D2";}
function type(){return Type.DEALER;}
let __state_3 = { last:null, tick:0, lastVel:null, side: ((3*17)%2?1:-1) };
function update(tank,enemies,allies,bulletInfo){
  const H=Math.hypot, D=(x,y)=>Math.atan2(y,x)*180/Math.PI;
  const N=(a)=>{a%=360; if(a<0)a+=360; return a;};
  const CL=(v,l,h)=>v<l?l:v>h?h:v;
  const P={"rMin":272,"rMax":422,"strafe":25,"threatR":182,"threatH":6,"fleeBias":14,"sep":68,"edge":60,"leadCap":22,"leadW":1.06,"aimJitter":0.11,"healthW":1.2,"distW":0.08,"finisherHP":22,"aggrRemain":2,"aggrIn":30,"aggrOut":22,"aimBias":-0.6,"bias":-8};
  const S=__state_3;
  S.tick=(S.tick||0)+1;

  // 1) Target selection (low health priority; distance tie-breaker)
  let tgt=null, best=1e18;
  for(const e of enemies){
    const k = e.health*1.2 + e.distance*0.08;
    if(k<best){best=k; tgt=e;}
  }

  // 2) Predictive aim using quadratic intercept solve (fallback to linear lead)
  if(tgt){
    let ax=tgt.x, ay=tgt.y;
    let vx=0, vy=0;
    if(S.last){
      const lvx=S.lastVel?S.lastVel.vx:0, lvy=S.lastVel?S.lastVel.vy:0;
      const ivx=(tgt.x-S.last.x), ivy=(tgt.y-S.last.y);
      vx = lvx*0.5 + ivx*0.5; vy = lvy*0.5 + ivy*0.5; // low-pass
      S.lastVel={vx,vy};
      // Solve |r + v t|^2 = (s t)^2 with s=8 px/tick
      const rx = tgt.x - tank.x, ry = tgt.y - tank.y;
      const s2 = 64; // 8^2
      const aa = vx*vx + vy*vy - s2;
      const bb = 2*(rx*vx + ry*vy);
      const cc = rx*rx + ry*ry;
      let tHit = 0;
      if (Math.abs(aa) < 1e-6) {
        tHit = bb !== 0 ? CL(-cc / bb, 0, P.leadCap) : 0;
      } else {
        const disc = bb*bb - 4*aa*cc;
        if (disc >= 0) {
          const sd = Math.sqrt(disc);
          const t1 = (-bb - sd) / (2*aa);
          const t2 = (-bb + sd) / (2*aa);
          const tc = t1>0 && t2>0 ? Math.min(t1,t2) : (t1>0?t1:(t2>0?t2:0));
          tHit = CL(tc, 0, P.leadCap);
        } else {
          // fallback to distance-based lead
          const d = H(rx,ry); tHit = CL(d/8, 0, P.leadCap);
        }
      }
      ax = tgt.x + vx * P.leadW * tHit;
      ay = tgt.y + vy * P.leadW * tHit;
    }
    const jitter = (((S.tick*13 + tank.x*7 + tank.y*3 + 3*11)%23)-11) * (P.aimJitter||0.12) * 0.07 + (P.aimBias||0);
    tank.fire(D(ax-tank.x,ay-tank.y) + jitter);
    S.last={x:tgt.x,y:tgt.y};
  }

  // Helper to attempt moves (HTML allows up to 10 fails; we cap tries locally)
  let moved=0; const go=(a)=>{ if(moved>20) return true; moved++; return tank.move(N(a)); };

  // 3) Bullet avoidance (distance-to-line + time to closest approach weighting)
  let hot=null,score=1e18;
  for(const b of bulletInfo){
    const dx=b.x-tank.x, dy=b.y-tank.y; const v=H(b.vx,b.vy)||1;
    const nx=b.vx/v, ny=b.vy/v; const proj=dx*nx+dy*ny;
    if(proj>0){
      const px=b.x-proj*nx, py=b.y-proj*ny;
      const dist=H(px-tank.x,py-tank.y);
      const tt=proj/v;
      const s = dist + tt*(P.threatH||4);
      if(dist<P.threatR && s<score){ score=s; hot=b; }
    }
  }
  if(hot){
    const a=D(hot.vx,hot.vy);
    const side=(S.side||1)*P.fleeBias + (P.bias||0)*0.5;
    const options=[a+90+side, a-90-side, a+120, a-120, a+70, a-70, a+150, a-150];
    for(const c of options){ if(go(c)) return; }
  }

  // 4) Edge avoidance
  if(tank.x < P.edge){ if(go(0)) return; }
  if(tank.x > 900-P.edge){ if(go(180)) return; }
  if(tank.y < P.edge){ if(go(90)) return; }
  if(tank.y > 600-P.edge){ if(go(270)) return; }

  // 5) Ally separation
  let near=null, ad=1e18; for(const a of allies){ if(a.distance<ad){ ad=a.distance; near=a; } }
  if(near && ad < P.sep){ const away=D(tank.x-near.x,tank.y-near.y); if(go(away)) return; if(go(away+18)) return; if(go(away-18)) return; }

  // 6) Range control + strafing (adaptive when finishing or outnumbering)
  if(tgt){
    const to=D(tgt.x-tank.x,tgt.y-tank.y), d=tgt.distance;
    let r0=P.rMin, r1=P.rMax;
    if((tgt.health<=P.finisherHP)||enemies.length<=P.aggrRemain){ r0=Math.max(120,r0-(P.aggrIn||30)); r1=Math.max(160,r1-(P.aggrOut||20)); }
    if(d<r0){ const aw=to+180+(P.bias||0)*0.4; if(go(aw)) return; if(go(aw+16)) return; if(go(aw-16)) return; }
    else if(d>r1){ if(go(to)) return; if(go(to+14)) return; if(go(to-14)) return; }
    else { const s=to + ((S.side||1) * P.strafe) + (P.bias||0)*0.5; if(go(s)) return; if(go(s+16)) return; if(go(s-16)) return; }
  }

  // 7) Fallback sweep
  for(const s of [0,60,120,180,240,300]){ if(go(s+(P.bias||0))) return; }
}


// ===== 다음 로봇 =====



function name(){return "Stellar-4-N1";}
function type(){return Type.NORMAL;}
let __state_4 = { last:null, tick:0, lastVel:null, side: ((4*17)%2?1:-1) };
function update(tank,enemies,allies,bulletInfo){
  const H=Math.hypot, D=(x,y)=>Math.atan2(y,x)*180/Math.PI;
  const N=(a)=>{a%=360; if(a<0)a+=360; return a;};
  const CL=(v,l,h)=>v<l?l:v>h?h:v;
  const P={"rMin":208,"rMax":326,"strafe":21,"threatR":197,"threatH":5,"fleeBias":15,"sep":70,"edge":58,"leadCap":20,"leadW":1.02,"aimJitter":0.13,"healthW":1.22,"distW":0.09,"finisherHP":24,"aggrRemain":3,"aggrIn":28,"aggrOut":20,"bias":0};
  const S=__state_4;
  S.tick=(S.tick||0)+1;

  // 1) Target selection (low health priority; distance tie-breaker)
  let tgt=null, best=1e18;
  for(const e of enemies){
    const k = e.health*1.22 + e.distance*0.09;
    if(k<best){best=k; tgt=e;}
  }

  // 2) Predictive aim using quadratic intercept solve (fallback to linear lead)
  if(tgt){
    let ax=tgt.x, ay=tgt.y;
    let vx=0, vy=0;
    if(S.last){
      const lvx=S.lastVel?S.lastVel.vx:0, lvy=S.lastVel?S.lastVel.vy:0;
      const ivx=(tgt.x-S.last.x), ivy=(tgt.y-S.last.y);
      vx = lvx*0.5 + ivx*0.5; vy = lvy*0.5 + ivy*0.5; // low-pass
      S.lastVel={vx,vy};
      // Solve |r + v t|^2 = (s t)^2 with s=8 px/tick
      const rx = tgt.x - tank.x, ry = tgt.y - tank.y;
      const s2 = 64; // 8^2
      const aa = vx*vx + vy*vy - s2;
      const bb = 2*(rx*vx + ry*vy);
      const cc = rx*rx + ry*ry;
      let tHit = 0;
      if (Math.abs(aa) < 1e-6) {
        tHit = bb !== 0 ? CL(-cc / bb, 0, P.leadCap) : 0;
      } else {
        const disc = bb*bb - 4*aa*cc;
        if (disc >= 0) {
          const sd = Math.sqrt(disc);
          const t1 = (-bb - sd) / (2*aa);
          const t2 = (-bb + sd) / (2*aa);
          const tc = t1>0 && t2>0 ? Math.min(t1,t2) : (t1>0?t1:(t2>0?t2:0));
          tHit = CL(tc, 0, P.leadCap);
        } else {
          // fallback to distance-based lead
          const d = H(rx,ry); tHit = CL(d/8, 0, P.leadCap);
        }
      }
      ax = tgt.x + vx * P.leadW * tHit;
      ay = tgt.y + vy * P.leadW * tHit;
    }
    const jitter = (((S.tick*13 + tank.x*7 + tank.y*3 + 4*11)%23)-11) * (P.aimJitter||0.12) * 0.07 + (P.aimBias||0);
    tank.fire(D(ax-tank.x,ay-tank.y) + jitter);
    S.last={x:tgt.x,y:tgt.y};
  }

  // Helper to attempt moves (HTML allows up to 10 fails; we cap tries locally)
  let moved=0; const go=(a)=>{ if(moved>20) return true; moved++; return tank.move(N(a)); };

  // 3) Bullet avoidance (distance-to-line + time to closest approach weighting)
  let hot=null,score=1e18;
  for(const b of bulletInfo){
    const dx=b.x-tank.x, dy=b.y-tank.y; const v=H(b.vx,b.vy)||1;
    const nx=b.vx/v, ny=b.vy/v; const proj=dx*nx+dy*ny;
    if(proj>0){
      const px=b.x-proj*nx, py=b.y-proj*ny;
      const dist=H(px-tank.x,py-tank.y);
      const tt=proj/v;
      const s = dist + tt*(P.threatH||4);
      if(dist<P.threatR && s<score){ score=s; hot=b; }
    }
  }
  if(hot){
    const a=D(hot.vx,hot.vy);
    const side=(S.side||1)*P.fleeBias + (P.bias||0)*0.5;
    const options=[a+90+side, a-90-side, a+120, a-120, a+70, a-70, a+150, a-150];
    for(const c of options){ if(go(c)) return; }
  }

  // 4) Edge avoidance
  if(tank.x < P.edge){ if(go(0)) return; }
  if(tank.x > 900-P.edge){ if(go(180)) return; }
  if(tank.y < P.edge){ if(go(90)) return; }
  if(tank.y > 600-P.edge){ if(go(270)) return; }

  // 5) Ally separation
  let near=null, ad=1e18; for(const a of allies){ if(a.distance<ad){ ad=a.distance; near=a; } }
  if(near && ad < P.sep){ const away=D(tank.x-near.x,tank.y-near.y); if(go(away)) return; if(go(away+18)) return; if(go(away-18)) return; }

  // 6) Range control + strafing (adaptive when finishing or outnumbering)
  if(tgt){
    const to=D(tgt.x-tank.x,tgt.y-tank.y), d=tgt.distance;
    let r0=P.rMin, r1=P.rMax;
    if((tgt.health<=P.finisherHP)||enemies.length<=P.aggrRemain){ r0=Math.max(120,r0-(P.aggrIn||30)); r1=Math.max(160,r1-(P.aggrOut||20)); }
    if(d<r0){ const aw=to+180+(P.bias||0)*0.4; if(go(aw)) return; if(go(aw+16)) return; if(go(aw-16)) return; }
    else if(d>r1){ if(go(to)) return; if(go(to+14)) return; if(go(to-14)) return; }
    else { const s=to + ((S.side||1) * P.strafe) + (P.bias||0)*0.5; if(go(s)) return; if(go(s+16)) return; if(go(s-16)) return; }
  }

  // 7) Fallback sweep
  for(const s of [0,60,120,180,240,300]){ if(go(s+(P.bias||0))) return; }
}


// ===== 다음 로봇 =====



function name(){return "Stellar-4-N2";}
function type(){return Type.NORMAL;}
let __state_5 = { last:null, tick:0, lastVel:null, side: ((5*17)%2?1:-1) };
function update(tank,enemies,allies,bulletInfo){
  const H=Math.hypot, D=(x,y)=>Math.atan2(y,x)*180/Math.PI;
  const N=(a)=>{a%=360; if(a<0)a+=360; return a;};
  const CL=(v,l,h)=>v<l?l:v>h?h:v;
  const P={"rMin":208,"rMax":326,"strafe":21,"threatR":197,"threatH":5,"fleeBias":15,"sep":70,"edge":58,"leadCap":20,"leadW":1.02,"aimJitter":0.13,"healthW":1.22,"distW":0.09,"finisherHP":24,"aggrRemain":3,"aggrIn":28,"aggrOut":20,"bias":2};
  const S=__state_5;
  S.tick=(S.tick||0)+1;

  // 1) Target selection (low health priority; distance tie-breaker)
  let tgt=null, best=1e18;
  for(const e of enemies){
    const k = e.health*1.22 + e.distance*0.09;
    if(k<best){best=k; tgt=e;}
  }

  // 2) Predictive aim using quadratic intercept solve (fallback to linear lead)
  if(tgt){
    let ax=tgt.x, ay=tgt.y;
    let vx=0, vy=0;
    if(S.last){
      const lvx=S.lastVel?S.lastVel.vx:0, lvy=S.lastVel?S.lastVel.vy:0;
      const ivx=(tgt.x-S.last.x), ivy=(tgt.y-S.last.y);
      vx = lvx*0.5 + ivx*0.5; vy = lvy*0.5 + ivy*0.5; // low-pass
      S.lastVel={vx,vy};
      // Solve |r + v t|^2 = (s t)^2 with s=8 px/tick
      const rx = tgt.x - tank.x, ry = tgt.y - tank.y;
      const s2 = 64; // 8^2
      const aa = vx*vx + vy*vy - s2;
      const bb = 2*(rx*vx + ry*vy);
      const cc = rx*rx + ry*ry;
      let tHit = 0;
      if (Math.abs(aa) < 1e-6) {
        tHit = bb !== 0 ? CL(-cc / bb, 0, P.leadCap) : 0;
      } else {
        const disc = bb*bb - 4*aa*cc;
        if (disc >= 0) {
          const sd = Math.sqrt(disc);
          const t1 = (-bb - sd) / (2*aa);
          const t2 = (-bb + sd) / (2*aa);
          const tc = t1>0 && t2>0 ? Math.min(t1,t2) : (t1>0?t1:(t2>0?t2:0));
          tHit = CL(tc, 0, P.leadCap);
        } else {
          // fallback to distance-based lead
          const d = H(rx,ry); tHit = CL(d/8, 0, P.leadCap);
        }
      }
      ax = tgt.x + vx * P.leadW * tHit;
      ay = tgt.y + vy * P.leadW * tHit;
    }
    const jitter = (((S.tick*13 + tank.x*7 + tank.y*3 + 5*11)%23)-11) * (P.aimJitter||0.12) * 0.07 + (P.aimBias||0);
    tank.fire(D(ax-tank.x,ay-tank.y) + jitter);
    S.last={x:tgt.x,y:tgt.y};
  }

  // Helper to attempt moves (HTML allows up to 10 fails; we cap tries locally)
  let moved=0; const go=(a)=>{ if(moved>20) return true; moved++; return tank.move(N(a)); };

  // 3) Bullet avoidance (distance-to-line + time to closest approach weighting)
  let hot=null,score=1e18;
  for(const b of bulletInfo){
    const dx=b.x-tank.x, dy=b.y-tank.y; const v=H(b.vx,b.vy)||1;
    const nx=b.vx/v, ny=b.vy/v; const proj=dx*nx+dy*ny;
    if(proj>0){
      const px=b.x-proj*nx, py=b.y-proj*ny;
      const dist=H(px-tank.x,py-tank.y);
      const tt=proj/v;
      const s = dist + tt*(P.threatH||4);
      if(dist<P.threatR && s<score){ score=s; hot=b; }
    }
  }
  if(hot){
    const a=D(hot.vx,hot.vy);
    const side=(S.side||1)*P.fleeBias + (P.bias||0)*0.5;
    const options=[a+90+side, a-90-side, a+120, a-120, a+70, a-70, a+150, a-150];
    for(const c of options){ if(go(c)) return; }
  }

  // 4) Edge avoidance
  if(tank.x < P.edge){ if(go(0)) return; }
  if(tank.x > 900-P.edge){ if(go(180)) return; }
  if(tank.y < P.edge){ if(go(90)) return; }
  if(tank.y > 600-P.edge){ if(go(270)) return; }

  // 5) Ally separation
  let near=null, ad=1e18; for(const a of allies){ if(a.distance<ad){ ad=a.distance; near=a; } }
  if(near && ad < P.sep){ const away=D(tank.x-near.x,tank.y-near.y); if(go(away)) return; if(go(away+18)) return; if(go(away-18)) return; }

  // 6) Range control + strafing (adaptive when finishing or outnumbering)
  if(tgt){
    const to=D(tgt.x-tank.x,tgt.y-tank.y), d=tgt.distance;
    let r0=P.rMin, r1=P.rMax;
    if((tgt.health<=P.finisherHP)||enemies.length<=P.aggrRemain){ r0=Math.max(120,r0-(P.aggrIn||30)); r1=Math.max(160,r1-(P.aggrOut||20)); }
    if(d<r0){ const aw=to+180+(P.bias||0)*0.4; if(go(aw)) return; if(go(aw+16)) return; if(go(aw-16)) return; }
    else if(d>r1){ if(go(to)) return; if(go(to+14)) return; if(go(to-14)) return; }
    else { const s=to + ((S.side||1) * P.strafe) + (P.bias||0)*0.5; if(go(s)) return; if(go(s+16)) return; if(go(s-16)) return; }
  }

  // 7) Fallback sweep
  for(const s of [0,60,120,180,240,300]){ if(go(s+(P.bias||0))) return; }
}
