function name(){return "Nova-2-T1";}
function type(){return Type.TANKER;}
let __state={last:null, lastVel:null, tick:0};
function update(tank,enemies,allies,bulletInfo){
  const toDeg=(x,y)=>Math.atan2(y,x)*180/Math.PI; const toRad=(a)=>a*Math.PI/180; const norm=(a)=>{a%=360; if(a<0)a+=360; return a;};
  const clamp=(v,lo,hi)=>v<lo?lo:v>hi?hi:v; const H=Math.hypot;
  const P=Object.assign({}, {"leadCap":13.501,"leadWeight":0.984,"aimJitter":0.184,"minRange":164.694,"maxRange":255.463,"strafeAngle":27.514,"threatRadius":160.162,"threatFleeBias":14.077,"allySep":63.904,"edgeMargin":45.539,"bias":-9.548,"targetHealthWeight":1.649,"targetDistWeight":0.069,"finishHp":24.226,"finishRemain":2.734,"finishMinDelta":34.941,"finishMaxDelta":24.592,"lowHp":40.36,"lowHpPad":35.351,"sweep":[0,60,120,180,240,300]}); P.bias=(P.bias||0)+(-10).toFixed?-10:((-10)||0);
  __state.tick=(__state.tick||0)+1;

  // inferred speed by type
  const selfSpeed = (tank.type===1?3:(tank.type===2?6:5));

  // 1) target selection: prioritize low HP then distance
  let tgt=null, best=1e9; for(const e of enemies){ const key = e.health*P.targetHealthWeight + e.distance*P.targetDistWeight; if(key<best){best=key; tgt=e;} }

  // 2) predictive aim with velocity smoothing
  if(tgt){ let ax=tgt.x, ay=tgt.y; if(__state.last){ const vx=(tgt.x-__state.last.x); const vy=(tgt.y-__state.last.y); let lvx=__state.lastVel?__state.lastVel.vx:0, lvy=__state.lastVel?__state.lastVel.vy:0; const svx=lvx*0.5+vx*0.5, svy=lvy*0.5+vy*0.5; __state.lastVel={vx:svx,vy:svy}; const d=H(tgt.x-tank.x,tgt.y-tank.y); const tLead=clamp(d/8,0,P.leadCap); ax=tgt.x+svx*P.leadWeight*tLead; ay=tgt.y+svy*P.leadWeight*tLead; } const jitter = ((((tank.x*31+tank.y*17)|0)%23)-11)*0.06*P.aimJitter; tank.fire(toDeg(ax-tank.x,ay-tank.y)+jitter); __state.last={x:tgt.x,y:tgt.y}; }

  // Candidate angle scoring
  function riskForAngle(a){
    const ar = toRad(a);
    const dx = Math.cos(ar)*selfSpeed, dy=Math.sin(ar)*selfSpeed;
    const nx = tank.x + dx, ny = tank.y + dy;
    let risk=0;
    // edges
    if(nx<20||nx>880) risk += 2; if(ny<20||ny>580) risk+=2;
    // ally proximity
    for(const al of allies){ const d=H(nx-al.x, ny-al.y); if(d<P.allySep) risk += (P.allySep-d)*0.02; }
    // bullet danger (peek 3 ticks)
    for(const b of bulletInfo){ let minD=1e9; for(let t=0;t<3;t++){ const bx=b.x+b.vx*(t+1), by=b.y+b.vy*(t+1); const px=nx+dx*t, py=ny+dy*t; const d=H(px-bx,py-by); if(d<minD) minD=d; }
      if(minD<P.threatRadius){ risk += (P.threatRadius-minD)*0.08; }
    }
    // range fit if tgt
    if(tgt){ const nd = H(nx-tgt.x, ny-tgt.y); let MIN=P.minRange, MAX=P.maxRange; if(tgt.health<=P.finishHp || enemies.length<=P.finishRemain){ MIN-=P.finishMinDelta; MAX-=P.finishMaxDelta; } if(tank.health<P.lowHp) MIN+=P.lowHpPad; if(nd<MIN) risk += (MIN-nd)*0.02; else if(nd>MAX) risk += (nd-MAX)*0.01; }
    // inertia: prefer continuing direction
    if(__state.lastMove!==undefined){ const da=Math.abs(norm(a-__state.lastMove)); const turn=Math.min(da,360-da); risk += turn*0.002; }
    return risk;
  }

  // 3) assemble candidate angles: bullets perpendiculars, to/from target, strafes, sweep
  const cands=[];
  // bullet-based
  let hot=null, md=1e9; for(const b of bulletInfo){ const dx=b.x-tank.x, dy=b.y-tank.y; const v=H(b.vx,b.vy)||1; const nx=b.vx/v, ny=b.vy/v; const proj=dx*nx+dy*ny; if(proj>0){ const px=b.x-proj*nx, py=b.y-proj*ny; const d=H(px-tank.x,py-tank.y); if(d<md){ md=d; hot=b; } } }
  if(hot){ const a=toDeg(hot.vx,hot.vy); cands.push(a+90+P.threatFleeBias+P.bias*0.4, a-90-P.threatFleeBias-P.bias*0.4, a+120, a-120, a+70, a-70); }
  if(tgt){ const to=toDeg(tgt.x-tank.x,tgt.y-tank.y); cands.push(to, to+180+P.bias*0.4, to+P.strafeAngle+P.bias*0.5, to-P.strafeAngle-P.bias*0.5); }
  for(const s of P.sweep){ cands.push(s+P.bias); }
  // dedupe and clamp
  const seen={}; const uniq=[]; for(const a of cands){ const aa=norm(Math.round(a)); if(!seen[aa]){seen[aa]=1; uniq.push(aa);} }
  uniq.sort((a,b)=>riskForAngle(a)-riskForAngle(b));

  // Try best angles first
  for(const a of uniq){ if(tank.move(norm(a))){ __state.lastMove=a; return; } }
  // Fallback random
  const fallback = norm(((__state.tick*37 + tank.x + tank.y)|0)%360);
  if(tank.move(fallback)){ __state.lastMove=fallback; return; }
}


// ===== 다음 로봇 =====

function name(){return "Nova-2-T2";}
function type(){return Type.TANKER;}
let __state={last:null, lastVel:null, tick:0};
function update(tank,enemies,allies,bulletInfo){
  const toDeg=(x,y)=>Math.atan2(y,x)*180/Math.PI; const toRad=(a)=>a*Math.PI/180; const norm=(a)=>{a%=360; if(a<0)a+=360; return a;};
  const clamp=(v,lo,hi)=>v<lo?lo:v>hi?hi:v; const H=Math.hypot;
  const P=Object.assign({}, {"leadCap":13.792,"leadWeight":1.026,"aimJitter":0.219,"minRange":165.145,"maxRange":255.137,"strafeAngle":27.868,"threatRadius":159.932,"threatFleeBias":13.997,"allySep":64.218,"edgeMargin":46.322,"bias":-10.354,"targetHealthWeight":1.738,"targetDistWeight":0.12,"finishHp":23.715,"finishRemain":2.642,"finishMinDelta":34.634,"finishMaxDelta":24.893,"lowHp":40.3,"lowHpPad":35.226,"sweep":[0,60,120,180,240,300]}); P.bias=(P.bias||0)+(8).toFixed?8:((8)||0);
  __state.tick=(__state.tick||0)+1;

  // inferred speed by type
  const selfSpeed = (tank.type===1?3:(tank.type===2?6:5));

  // 1) target selection: prioritize low HP then distance
  let tgt=null, best=1e9; for(const e of enemies){ const key = e.health*P.targetHealthWeight + e.distance*P.targetDistWeight; if(key<best){best=key; tgt=e;} }

  // 2) predictive aim with velocity smoothing
  if(tgt){ let ax=tgt.x, ay=tgt.y; if(__state.last){ const vx=(tgt.x-__state.last.x); const vy=(tgt.y-__state.last.y); let lvx=__state.lastVel?__state.lastVel.vx:0, lvy=__state.lastVel?__state.lastVel.vy:0; const svx=lvx*0.5+vx*0.5, svy=lvy*0.5+vy*0.5; __state.lastVel={vx:svx,vy:svy}; const d=H(tgt.x-tank.x,tgt.y-tank.y); const tLead=clamp(d/8,0,P.leadCap); ax=tgt.x+svx*P.leadWeight*tLead; ay=tgt.y+svy*P.leadWeight*tLead; } const jitter = ((((tank.x*31+tank.y*17)|0)%23)-11)*0.06*P.aimJitter; tank.fire(toDeg(ax-tank.x,ay-tank.y)+jitter); __state.last={x:tgt.x,y:tgt.y}; }

  // Candidate angle scoring
  function riskForAngle(a){
    const ar = toRad(a);
    const dx = Math.cos(ar)*selfSpeed, dy=Math.sin(ar)*selfSpeed;
    const nx = tank.x + dx, ny = tank.y + dy;
    let risk=0;
    // edges
    if(nx<20||nx>880) risk += 2; if(ny<20||ny>580) risk+=2;
    // ally proximity
    for(const al of allies){ const d=H(nx-al.x, ny-al.y); if(d<P.allySep) risk += (P.allySep-d)*0.02; }
    // bullet danger (peek 3 ticks)
    for(const b of bulletInfo){ let minD=1e9; for(let t=0;t<3;t++){ const bx=b.x+b.vx*(t+1), by=b.y+b.vy*(t+1); const px=nx+dx*t, py=ny+dy*t; const d=H(px-bx,py-by); if(d<minD) minD=d; }
      if(minD<P.threatRadius){ risk += (P.threatRadius-minD)*0.08; }
    }
    // range fit if tgt
    if(tgt){ const nd = H(nx-tgt.x, ny-tgt.y); let MIN=P.minRange, MAX=P.maxRange; if(tgt.health<=P.finishHp || enemies.length<=P.finishRemain){ MIN-=P.finishMinDelta; MAX-=P.finishMaxDelta; } if(tank.health<P.lowHp) MIN+=P.lowHpPad; if(nd<MIN) risk += (MIN-nd)*0.02; else if(nd>MAX) risk += (nd-MAX)*0.01; }
    // inertia: prefer continuing direction
    if(__state.lastMove!==undefined){ const da=Math.abs(norm(a-__state.lastMove)); const turn=Math.min(da,360-da); risk += turn*0.002; }
    return risk;
  }

  // 3) assemble candidate angles: bullets perpendiculars, to/from target, strafes, sweep
  const cands=[];
  // bullet-based
  let hot=null, md=1e9; for(const b of bulletInfo){ const dx=b.x-tank.x, dy=b.y-tank.y; const v=H(b.vx,b.vy)||1; const nx=b.vx/v, ny=b.vy/v; const proj=dx*nx+dy*ny; if(proj>0){ const px=b.x-proj*nx, py=b.y-proj*ny; const d=H(px-tank.x,py-tank.y); if(d<md){ md=d; hot=b; } } }
  if(hot){ const a=toDeg(hot.vx,hot.vy); cands.push(a+90+P.threatFleeBias+P.bias*0.4, a-90-P.threatFleeBias-P.bias*0.4, a+120, a-120, a+70, a-70); }
  if(tgt){ const to=toDeg(tgt.x-tank.x,tgt.y-tank.y); cands.push(to, to+180+P.bias*0.4, to+P.strafeAngle+P.bias*0.5, to-P.strafeAngle-P.bias*0.5); }
  for(const s of P.sweep){ cands.push(s+P.bias); }
  // dedupe and clamp
  const seen={}; const uniq=[]; for(const a of cands){ const aa=norm(Math.round(a)); if(!seen[aa]){seen[aa]=1; uniq.push(aa);} }
  uniq.sort((a,b)=>riskForAngle(a)-riskForAngle(b));

  // Try best angles first
  for(const a of uniq){ if(tank.move(norm(a))){ __state.lastMove=a; return; } }
  // Fallback random
  const fallback = norm(((__state.tick*37 + tank.x + tank.y)|0)%360);
  if(tank.move(fallback)){ __state.lastMove=fallback; return; }
}


// ===== 다음 로봇 =====

function name(){return "Nova-2-D1";}
function type(){return Type.DEALER;}
let __state={last:null, lastVel:null, tick:0};
function update(tank,enemies,allies,bulletInfo){
  const toDeg=(x,y)=>Math.atan2(y,x)*180/Math.PI; const toRad=(a)=>a*Math.PI/180; const norm=(a)=>{a%=360; if(a<0)a+=360; return a;};
  const clamp=(v,lo,hi)=>v<lo?lo:v>hi?hi:v; const H=Math.hypot;
  const P=Object.assign({}, {"leadCap":14.988,"leadWeight":0.77,"aimJitter":0.193,"minRange":240.361,"maxRange":379.783,"strafeAngle":36.321,"threatRadius":170.201,"threatFleeBias":16.067,"allySep":61.678,"edgeMargin":43.92,"bias":11.753,"targetHealthWeight":1.334,"targetDistWeight":0.047,"finishHp":21.934,"finishRemain":2.922,"finishMinDelta":39.554,"finishMaxDelta":34.903,"lowHp":34.856,"lowHpPad":50.456,"sweep":[0,50,100,150,200,250,300,350]}); P.bias=(P.bias||0)+(-14).toFixed?-14:((-14)||0);
  __state.tick=(__state.tick||0)+1;

  // inferred speed by type
  const selfSpeed = (tank.type===1?3:(tank.type===2?6:5));

  // 1) target selection: prioritize low HP then distance
  let tgt=null, best=1e9; for(const e of enemies){ const key = e.health*P.targetHealthWeight + e.distance*P.targetDistWeight; if(key<best){best=key; tgt=e;} }

  // 2) predictive aim with velocity smoothing
  if(tgt){ let ax=tgt.x, ay=tgt.y; if(__state.last){ const vx=(tgt.x-__state.last.x); const vy=(tgt.y-__state.last.y); let lvx=__state.lastVel?__state.lastVel.vx:0, lvy=__state.lastVel?__state.lastVel.vy:0; const svx=lvx*0.5+vx*0.5, svy=lvy*0.5+vy*0.5; __state.lastVel={vx:svx,vy:svy}; const d=H(tgt.x-tank.x,tgt.y-tank.y); const tLead=clamp(d/8,0,P.leadCap); ax=tgt.x+svx*P.leadWeight*tLead; ay=tgt.y+svy*P.leadWeight*tLead; } const jitter = ((((tank.x*31+tank.y*17)|0)%23)-11)*0.06*P.aimJitter; tank.fire(toDeg(ax-tank.x,ay-tank.y)+jitter); __state.last={x:tgt.x,y:tgt.y}; }

  // Candidate angle scoring
  function riskForAngle(a){
    const ar = toRad(a);
    const dx = Math.cos(ar)*selfSpeed, dy=Math.sin(ar)*selfSpeed;
    const nx = tank.x + dx, ny = tank.y + dy;
    let risk=0;
    // edges
    if(nx<20||nx>880) risk += 2; if(ny<20||ny>580) risk+=2;
    // ally proximity
    for(const al of allies){ const d=H(nx-al.x, ny-al.y); if(d<P.allySep) risk += (P.allySep-d)*0.02; }
    // bullet danger (peek 3 ticks)
    for(const b of bulletInfo){ let minD=1e9; for(let t=0;t<3;t++){ const bx=b.x+b.vx*(t+1), by=b.y+b.vy*(t+1); const px=nx+dx*t, py=ny+dy*t; const d=H(px-bx,py-by); if(d<minD) minD=d; }
      if(minD<P.threatRadius){ risk += (P.threatRadius-minD)*0.08; }
    }
    // range fit if tgt
    if(tgt){ const nd = H(nx-tgt.x, ny-tgt.y); let MIN=P.minRange, MAX=P.maxRange; if(tgt.health<=P.finishHp || enemies.length<=P.finishRemain){ MIN-=P.finishMinDelta; MAX-=P.finishMaxDelta; } if(tank.health<P.lowHp) MIN+=P.lowHpPad; if(nd<MIN) risk += (MIN-nd)*0.02; else if(nd>MAX) risk += (nd-MAX)*0.01; }
    // inertia: prefer continuing direction
    if(__state.lastMove!==undefined){ const da=Math.abs(norm(a-__state.lastMove)); const turn=Math.min(da,360-da); risk += turn*0.002; }
    return risk;
  }

  // 3) assemble candidate angles: bullets perpendiculars, to/from target, strafes, sweep
  const cands=[];
  // bullet-based
  let hot=null, md=1e9; for(const b of bulletInfo){ const dx=b.x-tank.x, dy=b.y-tank.y; const v=H(b.vx,b.vy)||1; const nx=b.vx/v, ny=b.vy/v; const proj=dx*nx+dy*ny; if(proj>0){ const px=b.x-proj*nx, py=b.y-proj*ny; const d=H(px-tank.x,py-tank.y); if(d<md){ md=d; hot=b; } } }
  if(hot){ const a=toDeg(hot.vx,hot.vy); cands.push(a+90+P.threatFleeBias+P.bias*0.4, a-90-P.threatFleeBias-P.bias*0.4, a+120, a-120, a+70, a-70); }
  if(tgt){ const to=toDeg(tgt.x-tank.x,tgt.y-tank.y); cands.push(to, to+180+P.bias*0.4, to+P.strafeAngle+P.bias*0.5, to-P.strafeAngle-P.bias*0.5); }
  for(const s of P.sweep){ cands.push(s+P.bias); }
  // dedupe and clamp
  const seen={}; const uniq=[]; for(const a of cands){ const aa=norm(Math.round(a)); if(!seen[aa]){seen[aa]=1; uniq.push(aa);} }
  uniq.sort((a,b)=>riskForAngle(a)-riskForAngle(b));

  // Try best angles first
  for(const a of uniq){ if(tank.move(norm(a))){ __state.lastMove=a; return; } }
  // Fallback random
  const fallback = norm(((__state.tick*37 + tank.x + tank.y)|0)%360);
  if(tank.move(fallback)){ __state.lastMove=fallback; return; }
}


// ===== 다음 로봇 =====

function name(){return "Nova-2-D2";}
function type(){return Type.DEALER;}
let __state={last:null, lastVel:null, tick:0};
function update(tank,enemies,allies,bulletInfo){
  const toDeg=(x,y)=>Math.atan2(y,x)*180/Math.PI; const toRad=(a)=>a*Math.PI/180; const norm=(a)=>{a%=360; if(a<0)a+=360; return a;};
  const clamp=(v,lo,hi)=>v<lo?lo:v>hi?hi:v; const H=Math.hypot;
  const P=Object.assign({}, {"leadCap":14.989,"leadWeight":0.878,"aimJitter":0.233,"minRange":239.927,"maxRange":379.806,"strafeAngle":35.768,"threatRadius":170.019,"threatFleeBias":15.901,"allySep":62.07,"edgeMargin":43.502,"bias":11.721,"targetHealthWeight":1.742,"targetDistWeight":0.039,"finishHp":22.383,"finishRemain":2.758,"finishMinDelta":40.247,"finishMaxDelta":34.607,"lowHp":35.044,"lowHpPad":50.055,"sweep":[0,50,100,150,200,250,300,350]}); P.bias=(P.bias||0)+(12).toFixed?12:((12)||0);
  __state.tick=(__state.tick||0)+1;

  // inferred speed by type
  const selfSpeed = (tank.type===1?3:(tank.type===2?6:5));

  // 1) target selection: prioritize low HP then distance
  let tgt=null, best=1e9; for(const e of enemies){ const key = e.health*P.targetHealthWeight + e.distance*P.targetDistWeight; if(key<best){best=key; tgt=e;} }

  // 2) predictive aim with velocity smoothing
  if(tgt){ let ax=tgt.x, ay=tgt.y; if(__state.last){ const vx=(tgt.x-__state.last.x); const vy=(tgt.y-__state.last.y); let lvx=__state.lastVel?__state.lastVel.vx:0, lvy=__state.lastVel?__state.lastVel.vy:0; const svx=lvx*0.5+vx*0.5, svy=lvy*0.5+vy*0.5; __state.lastVel={vx:svx,vy:svy}; const d=H(tgt.x-tank.x,tgt.y-tank.y); const tLead=clamp(d/8,0,P.leadCap); ax=tgt.x+svx*P.leadWeight*tLead; ay=tgt.y+svy*P.leadWeight*tLead; } const jitter = ((((tank.x*31+tank.y*17)|0)%23)-11)*0.06*P.aimJitter; tank.fire(toDeg(ax-tank.x,ay-tank.y)+jitter); __state.last={x:tgt.x,y:tgt.y}; }

  // Candidate angle scoring
  function riskForAngle(a){
    const ar = toRad(a);
    const dx = Math.cos(ar)*selfSpeed, dy=Math.sin(ar)*selfSpeed;
    const nx = tank.x + dx, ny = tank.y + dy;
    let risk=0;
    // edges
    if(nx<20||nx>880) risk += 2; if(ny<20||ny>580) risk+=2;
    // ally proximity
    for(const al of allies){ const d=H(nx-al.x, ny-al.y); if(d<P.allySep) risk += (P.allySep-d)*0.02; }
    // bullet danger (peek 3 ticks)
    for(const b of bulletInfo){ let minD=1e9; for(let t=0;t<3;t++){ const bx=b.x+b.vx*(t+1), by=b.y+b.vy*(t+1); const px=nx+dx*t, py=ny+dy*t; const d=H(px-bx,py-by); if(d<minD) minD=d; }
      if(minD<P.threatRadius){ risk += (P.threatRadius-minD)*0.08; }
    }
    // range fit if tgt
    if(tgt){ const nd = H(nx-tgt.x, ny-tgt.y); let MIN=P.minRange, MAX=P.maxRange; if(tgt.health<=P.finishHp || enemies.length<=P.finishRemain){ MIN-=P.finishMinDelta; MAX-=P.finishMaxDelta; } if(tank.health<P.lowHp) MIN+=P.lowHpPad; if(nd<MIN) risk += (MIN-nd)*0.02; else if(nd>MAX) risk += (nd-MAX)*0.01; }
    // inertia: prefer continuing direction
    if(__state.lastMove!==undefined){ const da=Math.abs(norm(a-__state.lastMove)); const turn=Math.min(da,360-da); risk += turn*0.002; }
    return risk;
  }

  // 3) assemble candidate angles: bullets perpendiculars, to/from target, strafes, sweep
  const cands=[];
  // bullet-based
  let hot=null, md=1e9; for(const b of bulletInfo){ const dx=b.x-tank.x, dy=b.y-tank.y; const v=H(b.vx,b.vy)||1; const nx=b.vx/v, ny=b.vy/v; const proj=dx*nx+dy*ny; if(proj>0){ const px=b.x-proj*nx, py=b.y-proj*ny; const d=H(px-tank.x,py-tank.y); if(d<md){ md=d; hot=b; } } }
  if(hot){ const a=toDeg(hot.vx,hot.vy); cands.push(a+90+P.threatFleeBias+P.bias*0.4, a-90-P.threatFleeBias-P.bias*0.4, a+120, a-120, a+70, a-70); }
  if(tgt){ const to=toDeg(tgt.x-tank.x,tgt.y-tank.y); cands.push(to, to+180+P.bias*0.4, to+P.strafeAngle+P.bias*0.5, to-P.strafeAngle-P.bias*0.5); }
  for(const s of P.sweep){ cands.push(s+P.bias); }
  // dedupe and clamp
  const seen={}; const uniq=[]; for(const a of cands){ const aa=norm(Math.round(a)); if(!seen[aa]){seen[aa]=1; uniq.push(aa);} }
  uniq.sort((a,b)=>riskForAngle(a)-riskForAngle(b));

  // Try best angles first
  for(const a of uniq){ if(tank.move(norm(a))){ __state.lastMove=a; return; } }
  // Fallback random
  const fallback = norm(((__state.tick*37 + tank.x + tank.y)|0)%360);
  if(tank.move(fallback)){ __state.lastMove=fallback; return; }
}


// ===== 다음 로봇 =====

function name(){return "Nova-2-D3";}
function type(){return Type.DEALER;}
let __state={last:null, lastVel:null, tick:0};
function update(tank,enemies,allies,bulletInfo){
  const toDeg=(x,y)=>Math.atan2(y,x)*180/Math.PI; const toRad=(a)=>a*Math.PI/180; const norm=(a)=>{a%=360; if(a<0)a+=360; return a;};
  const clamp=(v,lo,hi)=>v<lo?lo:v>hi?hi:v; const H=Math.hypot;
  const P=Object.assign({}, {"leadCap":14.923,"leadWeight":1.1,"aimJitter":0.221,"minRange":240.23,"maxRange":379.853,"strafeAngle":36.334,"threatRadius":170.424,"threatFleeBias":15.532,"allySep":62.027,"edgeMargin":44.378,"bias":11.529,"targetHealthWeight":1.39,"targetDistWeight":0.099,"finishHp":22.192,"finishRemain":3.016,"finishMinDelta":40.443,"finishMaxDelta":35.393,"lowHp":34.695,"lowHpPad":50.147,"sweep":[0,50,100,150,200,250,300,350]}); P.bias=(P.bias||0)+(2).toFixed?2:((2)||0);
  __state.tick=(__state.tick||0)+1;

  // inferred speed by type
  const selfSpeed = (tank.type===1?3:(tank.type===2?6:5));

  // 1) target selection: prioritize low HP then distance
  let tgt=null, best=1e9; for(const e of enemies){ const key = e.health*P.targetHealthWeight + e.distance*P.targetDistWeight; if(key<best){best=key; tgt=e;} }

  // 2) predictive aim with velocity smoothing
  if(tgt){ let ax=tgt.x, ay=tgt.y; if(__state.last){ const vx=(tgt.x-__state.last.x); const vy=(tgt.y-__state.last.y); let lvx=__state.lastVel?__state.lastVel.vx:0, lvy=__state.lastVel?__state.lastVel.vy:0; const svx=lvx*0.5+vx*0.5, svy=lvy*0.5+vy*0.5; __state.lastVel={vx:svx,vy:svy}; const d=H(tgt.x-tank.x,tgt.y-tank.y); const tLead=clamp(d/8,0,P.leadCap); ax=tgt.x+svx*P.leadWeight*tLead; ay=tgt.y+svy*P.leadWeight*tLead; } const jitter = ((((tank.x*31+tank.y*17)|0)%23)-11)*0.06*P.aimJitter; tank.fire(toDeg(ax-tank.x,ay-tank.y)+jitter); __state.last={x:tgt.x,y:tgt.y}; }

  // Candidate angle scoring
  function riskForAngle(a){
    const ar = toRad(a);
    const dx = Math.cos(ar)*selfSpeed, dy=Math.sin(ar)*selfSpeed;
    const nx = tank.x + dx, ny = tank.y + dy;
    let risk=0;
    // edges
    if(nx<20||nx>880) risk += 2; if(ny<20||ny>580) risk+=2;
    // ally proximity
    for(const al of allies){ const d=H(nx-al.x, ny-al.y); if(d<P.allySep) risk += (P.allySep-d)*0.02; }
    // bullet danger (peek 3 ticks)
    for(const b of bulletInfo){ let minD=1e9; for(let t=0;t<3;t++){ const bx=b.x+b.vx*(t+1), by=b.y+b.vy*(t+1); const px=nx+dx*t, py=ny+dy*t; const d=H(px-bx,py-by); if(d<minD) minD=d; }
      if(minD<P.threatRadius){ risk += (P.threatRadius-minD)*0.08; }
    }
    // range fit if tgt
    if(tgt){ const nd = H(nx-tgt.x, ny-tgt.y); let MIN=P.minRange, MAX=P.maxRange; if(tgt.health<=P.finishHp || enemies.length<=P.finishRemain){ MIN-=P.finishMinDelta; MAX-=P.finishMaxDelta; } if(tank.health<P.lowHp) MIN+=P.lowHpPad; if(nd<MIN) risk += (MIN-nd)*0.02; else if(nd>MAX) risk += (nd-MAX)*0.01; }
    // inertia: prefer continuing direction
    if(__state.lastMove!==undefined){ const da=Math.abs(norm(a-__state.lastMove)); const turn=Math.min(da,360-da); risk += turn*0.002; }
    return risk;
  }

  // 3) assemble candidate angles: bullets perpendiculars, to/from target, strafes, sweep
  const cands=[];
  // bullet-based
  let hot=null, md=1e9; for(const b of bulletInfo){ const dx=b.x-tank.x, dy=b.y-tank.y; const v=H(b.vx,b.vy)||1; const nx=b.vx/v, ny=b.vy/v; const proj=dx*nx+dy*ny; if(proj>0){ const px=b.x-proj*nx, py=b.y-proj*ny; const d=H(px-tank.x,py-tank.y); if(d<md){ md=d; hot=b; } } }
  if(hot){ const a=toDeg(hot.vx,hot.vy); cands.push(a+90+P.threatFleeBias+P.bias*0.4, a-90-P.threatFleeBias-P.bias*0.4, a+120, a-120, a+70, a-70); }
  if(tgt){ const to=toDeg(tgt.x-tank.x,tgt.y-tank.y); cands.push(to, to+180+P.bias*0.4, to+P.strafeAngle+P.bias*0.5, to-P.strafeAngle-P.bias*0.5); }
  for(const s of P.sweep){ cands.push(s+P.bias); }
  // dedupe and clamp
  const seen={}; const uniq=[]; for(const a of cands){ const aa=norm(Math.round(a)); if(!seen[aa]){seen[aa]=1; uniq.push(aa);} }
  uniq.sort((a,b)=>riskForAngle(a)-riskForAngle(b));

  // Try best angles first
  for(const a of uniq){ if(tank.move(norm(a))){ __state.lastMove=a; return; } }
  // Fallback random
  const fallback = norm(((__state.tick*37 + tank.x + tank.y)|0)%360);
  if(tank.move(fallback)){ __state.lastMove=fallback; return; }
}


// ===== 다음 로봇 =====

function name(){return "Nova-2-N1";}
function type(){return Type.NORMAL;}
let __state={last:null, lastVel:null, tick:0};
function update(tank,enemies,allies,bulletInfo){
  const toDeg=(x,y)=>Math.atan2(y,x)*180/Math.PI; const toRad=(a)=>a*Math.PI/180; const norm=(a)=>{a%=360; if(a<0)a+=360; return a;};
  const clamp=(v,lo,hi)=>v<lo?lo:v>hi?hi:v; const H=Math.hypot;
  const P=Object.assign({}, {"leadCap":14.322,"leadWeight":0.998,"aimJitter":0.159,"minRange":200.077,"maxRange":319.515,"strafeAngle":31.779,"threatRadius":164.617,"threatFleeBias":14.965,"allySep":61.673,"edgeMargin":46.213,"bias":-6.225,"targetHealthWeight":1.464,"targetDistWeight":0.069,"finishHp":22.335,"finishRemain":2.519,"finishMinDelta":35.836,"finishMaxDelta":27.512,"lowHp":40.189,"lowHpPad":40.215,"sweep":[0,60,120,180,240,300]}); P.bias=(P.bias||0)+(-6).toFixed?-6:((-6)||0);
  __state.tick=(__state.tick||0)+1;

  // inferred speed by type
  const selfSpeed = (tank.type===1?3:(tank.type===2?6:5));

  // 1) target selection: prioritize low HP then distance
  let tgt=null, best=1e9; for(const e of enemies){ const key = e.health*P.targetHealthWeight + e.distance*P.targetDistWeight; if(key<best){best=key; tgt=e;} }

  // 2) predictive aim with velocity smoothing
  if(tgt){ let ax=tgt.x, ay=tgt.y; if(__state.last){ const vx=(tgt.x-__state.last.x); const vy=(tgt.y-__state.last.y); let lvx=__state.lastVel?__state.lastVel.vx:0, lvy=__state.lastVel?__state.lastVel.vy:0; const svx=lvx*0.5+vx*0.5, svy=lvy*0.5+vy*0.5; __state.lastVel={vx:svx,vy:svy}; const d=H(tgt.x-tank.x,tgt.y-tank.y); const tLead=clamp(d/8,0,P.leadCap); ax=tgt.x+svx*P.leadWeight*tLead; ay=tgt.y+svy*P.leadWeight*tLead; } const jitter = ((((tank.x*31+tank.y*17)|0)%23)-11)*0.06*P.aimJitter; tank.fire(toDeg(ax-tank.x,ay-tank.y)+jitter); __state.last={x:tgt.x,y:tgt.y}; }

  // Candidate angle scoring
  function riskForAngle(a){
    const ar = toRad(a);
    const dx = Math.cos(ar)*selfSpeed, dy=Math.sin(ar)*selfSpeed;
    const nx = tank.x + dx, ny = tank.y + dy;
    let risk=0;
    // edges
    if(nx<20||nx>880) risk += 2; if(ny<20||ny>580) risk+=2;
    // ally proximity
    for(const al of allies){ const d=H(nx-al.x, ny-al.y); if(d<P.allySep) risk += (P.allySep-d)*0.02; }
    // bullet danger (peek 3 ticks)
    for(const b of bulletInfo){ let minD=1e9; for(let t=0;t<3;t++){ const bx=b.x+b.vx*(t+1), by=b.y+b.vy*(t+1); const px=nx+dx*t, py=ny+dy*t; const d=H(px-bx,py-by); if(d<minD) minD=d; }
      if(minD<P.threatRadius){ risk += (P.threatRadius-minD)*0.08; }
    }
    // range fit if tgt
    if(tgt){ const nd = H(nx-tgt.x, ny-tgt.y); let MIN=P.minRange, MAX=P.maxRange; if(tgt.health<=P.finishHp || enemies.length<=P.finishRemain){ MIN-=P.finishMinDelta; MAX-=P.finishMaxDelta; } if(tank.health<P.lowHp) MIN+=P.lowHpPad; if(nd<MIN) risk += (MIN-nd)*0.02; else if(nd>MAX) risk += (nd-MAX)*0.01; }
    // inertia: prefer continuing direction
    if(__state.lastMove!==undefined){ const da=Math.abs(norm(a-__state.lastMove)); const turn=Math.min(da,360-da); risk += turn*0.002; }
    return risk;
  }

  // 3) assemble candidate angles: bullets perpendiculars, to/from target, strafes, sweep
  const cands=[];
  // bullet-based
  let hot=null, md=1e9; for(const b of bulletInfo){ const dx=b.x-tank.x, dy=b.y-tank.y; const v=H(b.vx,b.vy)||1; const nx=b.vx/v, ny=b.vy/v; const proj=dx*nx+dy*ny; if(proj>0){ const px=b.x-proj*nx, py=b.y-proj*ny; const d=H(px-tank.x,py-tank.y); if(d<md){ md=d; hot=b; } } }
  if(hot){ const a=toDeg(hot.vx,hot.vy); cands.push(a+90+P.threatFleeBias+P.bias*0.4, a-90-P.threatFleeBias-P.bias*0.4, a+120, a-120, a+70, a-70); }
  if(tgt){ const to=toDeg(tgt.x-tank.x,tgt.y-tank.y); cands.push(to, to+180+P.bias*0.4, to+P.strafeAngle+P.bias*0.5, to-P.strafeAngle-P.bias*0.5); }
  for(const s of P.sweep){ cands.push(s+P.bias); }
  // dedupe and clamp
  const seen={}; const uniq=[]; for(const a of cands){ const aa=norm(Math.round(a)); if(!seen[aa]){seen[aa]=1; uniq.push(aa);} }
  uniq.sort((a,b)=>riskForAngle(a)-riskForAngle(b));

  // Try best angles first
  for(const a of uniq){ if(tank.move(norm(a))){ __state.lastMove=a; return; } }
  // Fallback random
  const fallback = norm(((__state.tick*37 + tank.x + tank.y)|0)%360);
  if(tank.move(fallback)){ __state.lastMove=fallback; return; }
}
