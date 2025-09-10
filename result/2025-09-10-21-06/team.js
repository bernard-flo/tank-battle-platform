function name(){return "NovaE-T1";}
function type(){return Type.TANKER;}
function update(tank,enemies,allies,bulletInfo){
  const D=(x,y)=>Math.atan2(y,x)*180/Math.PI; const N=(a)=>{a%=360;return a<0?a+360:a;}; const C=(v,l,h)=>v<l?l:v>h?h:v;
  const P={"minR":190,"maxR":310,"strafe":36,"threat":85,"sep":66,"edge":46,"bias":-12,"jA":31,"jB":17,"jM":29,"jH":14,"jF":0.14,"leadCap":11,"leadW":0.92,"hW":1.55,"dW":0.11,"finN":28,"finX":18,"lastN":34,"lastX":34,"minCap":160};
  // Shared target memory per-bot id
  if(!update.__S) update.__S={}; const S=(update.__S[tank.x+'_'+tank.y+'_'+(tank.size||0)] ||= {ex:0,ey:0});
  let T=null, sc=1e9; for(const e of enemies){ let tw=0; // type preference: DEALER(-26), NORMAL(0), TANKER(+18)
    if(e.health!==undefined){ tw += (e.health<18? -12:0); }
    if(e.angle!==undefined){ tw += 0; }
    // approximate class weight via size heuristic if available on input elsewhere; keep zero here.
    const s = e.health*P.hW + e.distance*P.dW + tw; if(s<sc){sc=s; T=e;} }
  if(T){ let ax=T.x, ay=T.y; if(S.ex||S.ey){ const vx=T.x-S.ex, vy=T.y-S.ey; const d=Math.hypot(T.x-tank.x,T.y-tank.y); const t=C(d/8,0,P.leadCap); ax=T.x+vx*P.leadW*t; ay=T.y+vy*P.leadW*t; } const j=((tank.x*P.jA+tank.y*P.jB)%(P.jM)-P.jH)*P.jF; tank.fire(D(ax-tank.x,ay-tank.y)+j); S.ex=T.x; S.ey=T.y; }
  let MIN=P.minR, MAX=P.maxR; if(T){ if(T.health<20){ MIN-=P.finN; MAX-=P.finX; } if(enemies.length<=2){ MIN-=P.lastN; MAX-=P.lastX; } MIN=Math.max(MIN,P.minCap); }
  let tries=0; const GO=(a)=>{tries++; return tank.move(N(a));};
  // Threat bullets (incoming within cone and radius)
  let H=null, md=1e9; for(const b of bulletInfo){ const dx=b.x-tank.x, dy=b.y-tank.y; const v=Math.hypot(b.vx,b.vy)||1, nx=b.vx/v, ny=b.vy/v; const proj=dx*nx+dy*ny; if(proj>0){ const px=b.x-proj*nx, py=b.y-proj*ny; const d=Math.hypot(px-tank.x,py-tank.y); if(d<md && d<P.threat){ md=d; H=b; } } }
  if(H){ const a=D(H.vx,H.vy); for(const c of [a+92+P.bias, a-92-P.bias, a+118, a-118]){ if(GO(c)) return; } }
  // Keep inside arena
  if(tank.x<P.edge){ if(GO(0)) return; } if(tank.x>900-P.edge){ if(GO(180)) return; } if(tank.y<P.edge){ if(GO(90)) return; } if(tank.y>600-P.edge){ if(GO(270)) return; }
  // Ally separation
  let A=null, ad=1e9; for(const a of allies){ if(a.distance<ad){ ad=a.distance; A=a; } } if(A && ad<P.sep){ const aw=D(tank.x-A.x,tank.y-A.y); if(GO(aw)) return; if(GO(aw+28)) return; if(GO(aw-28)) return; }
  // Range-keeping and strafing
  if(T){ const to=D(T.x-tank.x,T.y-tank.y), d=T.distance; if(d<MIN){ const aw=to+180+P.bias*0.5; if(GO(aw)) return; if(GO(aw+24)) return; if(GO(aw-24)) return; } else if(d>MAX){ if(GO(to)) return; if(GO(to+16)) return; if(GO(to-16)) return; } else { const side=to+(((tank.x*13+tank.y*7)%2)?P.strafe:-P.strafe)+P.bias*0.3; if(GO(side)) return; if(GO(side+16)) return; if(GO(side-16)) return; } }
  for(const s of [0,60,120,180,240,300]){ if(GO(s+P.bias)) return; }
}

// ===== 다음 로봇 =====

function name(){return "NovaE-D1";}
function type(){return Type.DEALER;}
function update(tank,enemies,allies,bulletInfo){
  const D=(x,y)=>Math.atan2(y,x)*180/Math.PI; const N=(a)=>{a%=360;return a<0?a+360:a;}; const C=(v,l,h)=>v<l?l:v>h?h:v;
  const P={"minR":260,"maxR":380,"strafe":40,"threat":88,"sep":62,"edge":46,"bias":-14,"jA":17,"jB":13,"jM":25,"jH":12,"jF":0.11,"leadCap":12,"leadW":1,"hW":1.6,"dW":0.09,"finN":26,"finX":18,"lastN":32,"lastX":32,"minCap":180};
  // Shared target memory per-bot id
  if(!update.__S) update.__S={}; const S=(update.__S[tank.x+'_'+tank.y+'_'+(tank.size||0)] ||= {ex:0,ey:0});
  let T=null, sc=1e9; for(const e of enemies){ let tw=0; // type preference: DEALER(-26), NORMAL(0), TANKER(+18)
    if(e.health!==undefined){ tw += (e.health<18? -12:0); }
    if(e.angle!==undefined){ tw += 0; }
    // approximate class weight via size heuristic if available on input elsewhere; keep zero here.
    const s = e.health*P.hW + e.distance*P.dW + tw; if(s<sc){sc=s; T=e;} }
  if(T){ let ax=T.x, ay=T.y; if(S.ex||S.ey){ const vx=T.x-S.ex, vy=T.y-S.ey; const d=Math.hypot(T.x-tank.x,T.y-tank.y); const t=C(d/8,0,P.leadCap); ax=T.x+vx*P.leadW*t; ay=T.y+vy*P.leadW*t; } const j=((tank.x*P.jA+tank.y*P.jB)%(P.jM)-P.jH)*P.jF; tank.fire(D(ax-tank.x,ay-tank.y)+j); S.ex=T.x; S.ey=T.y; }
  let MIN=P.minR, MAX=P.maxR; if(T){ if(T.health<20){ MIN-=P.finN; MAX-=P.finX; } if(enemies.length<=2){ MIN-=P.lastN; MAX-=P.lastX; } MIN=Math.max(MIN,P.minCap); }
  let tries=0; const GO=(a)=>{tries++; return tank.move(N(a));};
  // Threat bullets (incoming within cone and radius)
  let H=null, md=1e9; for(const b of bulletInfo){ const dx=b.x-tank.x, dy=b.y-tank.y; const v=Math.hypot(b.vx,b.vy)||1, nx=b.vx/v, ny=b.vy/v; const proj=dx*nx+dy*ny; if(proj>0){ const px=b.x-proj*nx, py=b.y-proj*ny; const d=Math.hypot(px-tank.x,py-tank.y); if(d<md && d<P.threat){ md=d; H=b; } } }
  if(H){ const a=D(H.vx,H.vy); for(const c of [a+92+P.bias, a-92-P.bias, a+118, a-118]){ if(GO(c)) return; } }
  // Keep inside arena
  if(tank.x<P.edge){ if(GO(0)) return; } if(tank.x>900-P.edge){ if(GO(180)) return; } if(tank.y<P.edge){ if(GO(90)) return; } if(tank.y>600-P.edge){ if(GO(270)) return; }
  // Ally separation
  let A=null, ad=1e9; for(const a of allies){ if(a.distance<ad){ ad=a.distance; A=a; } } if(A && ad<P.sep){ const aw=D(tank.x-A.x,tank.y-A.y); if(GO(aw)) return; if(GO(aw+28)) return; if(GO(aw-28)) return; }
  // Range-keeping and strafing
  if(T){ const to=D(T.x-tank.x,T.y-tank.y), d=T.distance; if(d<MIN){ const aw=to+180+P.bias*0.5; if(GO(aw)) return; if(GO(aw+24)) return; if(GO(aw-24)) return; } else if(d>MAX){ if(GO(to)) return; if(GO(to+16)) return; if(GO(to-16)) return; } else { const side=to+(((tank.x*13+tank.y*7)%2)?P.strafe:-P.strafe)+P.bias*0.3; if(GO(side)) return; if(GO(side+16)) return; if(GO(side-16)) return; } }
  for(const s of [0,60,120,180,240,300]){ if(GO(s+P.bias)) return; }
}

// ===== 다음 로봇 =====

function name(){return "NovaE-N1";}
function type(){return Type.NORMAL;}
function update(tank,enemies,allies,bulletInfo){
  const D=(x,y)=>Math.atan2(y,x)*180/Math.PI; const N=(a)=>{a%=360;return a<0?a+360:a;}; const C=(v,l,h)=>v<l?l:v>h?h:v;
  const P={"minR":220,"maxR":340,"strafe":38,"threat":86,"sep":64,"edge":46,"bias":-12,"jA":19,"jB":29,"jM":27,"jH":13,"jF":0.12,"leadCap":11,"leadW":0.96,"hW":1.55,"dW":0.1,"finN":28,"finX":18,"lastN":34,"lastX":34,"minCap":170};
  // Shared target memory per-bot id
  if(!update.__S) update.__S={}; const S=(update.__S[tank.x+'_'+tank.y+'_'+(tank.size||0)] ||= {ex:0,ey:0});
  let T=null, sc=1e9; for(const e of enemies){ let tw=0; // type preference: DEALER(-26), NORMAL(0), TANKER(+18)
    if(e.health!==undefined){ tw += (e.health<18? -12:0); }
    if(e.angle!==undefined){ tw += 0; }
    // approximate class weight via size heuristic if available on input elsewhere; keep zero here.
    const s = e.health*P.hW + e.distance*P.dW + tw; if(s<sc){sc=s; T=e;} }
  if(T){ let ax=T.x, ay=T.y; if(S.ex||S.ey){ const vx=T.x-S.ex, vy=T.y-S.ey; const d=Math.hypot(T.x-tank.x,T.y-tank.y); const t=C(d/8,0,P.leadCap); ax=T.x+vx*P.leadW*t; ay=T.y+vy*P.leadW*t; } const j=((tank.x*P.jA+tank.y*P.jB)%(P.jM)-P.jH)*P.jF; tank.fire(D(ax-tank.x,ay-tank.y)+j); S.ex=T.x; S.ey=T.y; }
  let MIN=P.minR, MAX=P.maxR; if(T){ if(T.health<20){ MIN-=P.finN; MAX-=P.finX; } if(enemies.length<=2){ MIN-=P.lastN; MAX-=P.lastX; } MIN=Math.max(MIN,P.minCap); }
  let tries=0; const GO=(a)=>{tries++; return tank.move(N(a));};
  // Threat bullets (incoming within cone and radius)
  let H=null, md=1e9; for(const b of bulletInfo){ const dx=b.x-tank.x, dy=b.y-tank.y; const v=Math.hypot(b.vx,b.vy)||1, nx=b.vx/v, ny=b.vy/v; const proj=dx*nx+dy*ny; if(proj>0){ const px=b.x-proj*nx, py=b.y-proj*ny; const d=Math.hypot(px-tank.x,py-tank.y); if(d<md && d<P.threat){ md=d; H=b; } } }
  if(H){ const a=D(H.vx,H.vy); for(const c of [a+92+P.bias, a-92-P.bias, a+118, a-118]){ if(GO(c)) return; } }
  // Keep inside arena
  if(tank.x<P.edge){ if(GO(0)) return; } if(tank.x>900-P.edge){ if(GO(180)) return; } if(tank.y<P.edge){ if(GO(90)) return; } if(tank.y>600-P.edge){ if(GO(270)) return; }
  // Ally separation
  let A=null, ad=1e9; for(const a of allies){ if(a.distance<ad){ ad=a.distance; A=a; } } if(A && ad<P.sep){ const aw=D(tank.x-A.x,tank.y-A.y); if(GO(aw)) return; if(GO(aw+28)) return; if(GO(aw-28)) return; }
  // Range-keeping and strafing
  if(T){ const to=D(T.x-tank.x,T.y-tank.y), d=T.distance; if(d<MIN){ const aw=to+180+P.bias*0.5; if(GO(aw)) return; if(GO(aw+24)) return; if(GO(aw-24)) return; } else if(d>MAX){ if(GO(to)) return; if(GO(to+16)) return; if(GO(to-16)) return; } else { const side=to+(((tank.x*13+tank.y*7)%2)?P.strafe:-P.strafe)+P.bias*0.3; if(GO(side)) return; if(GO(side+16)) return; if(GO(side-16)) return; } }
  for(const s of [0,60,120,180,240,300]){ if(GO(s+P.bias)) return; }
}

// ===== 다음 로봇 =====

function name(){return "NovaE-N2";}
function type(){return Type.NORMAL;}
function update(tank,enemies,allies,bulletInfo){
  const D=(x,y)=>Math.atan2(y,x)*180/Math.PI; const N=(a)=>{a%=360;return a<0?a+360:a;}; const C=(v,l,h)=>v<l?l:v>h?h:v;
  const P={"minR":220,"maxR":340,"strafe":38,"threat":86,"sep":64,"edge":46,"bias":-12,"jA":19,"jB":29,"jM":27,"jH":13,"jF":0.12,"leadCap":11,"leadW":0.96,"hW":1.55,"dW":0.1,"finN":28,"finX":18,"lastN":34,"lastX":34,"minCap":170};
  // Shared target memory per-bot id
  if(!update.__S) update.__S={}; const S=(update.__S[tank.x+'_'+tank.y+'_'+(tank.size||0)] ||= {ex:0,ey:0});
  let T=null, sc=1e9; for(const e of enemies){ let tw=0; // type preference: DEALER(-26), NORMAL(0), TANKER(+18)
    if(e.health!==undefined){ tw += (e.health<18? -12:0); }
    if(e.angle!==undefined){ tw += 0; }
    // approximate class weight via size heuristic if available on input elsewhere; keep zero here.
    const s = e.health*P.hW + e.distance*P.dW + tw; if(s<sc){sc=s; T=e;} }
  if(T){ let ax=T.x, ay=T.y; if(S.ex||S.ey){ const vx=T.x-S.ex, vy=T.y-S.ey; const d=Math.hypot(T.x-tank.x,T.y-tank.y); const t=C(d/8,0,P.leadCap); ax=T.x+vx*P.leadW*t; ay=T.y+vy*P.leadW*t; } const j=((tank.x*P.jA+tank.y*P.jB)%(P.jM)-P.jH)*P.jF; tank.fire(D(ax-tank.x,ay-tank.y)+j); S.ex=T.x; S.ey=T.y; }
  let MIN=P.minR, MAX=P.maxR; if(T){ if(T.health<20){ MIN-=P.finN; MAX-=P.finX; } if(enemies.length<=2){ MIN-=P.lastN; MAX-=P.lastX; } MIN=Math.max(MIN,P.minCap); }
  let tries=0; const GO=(a)=>{tries++; return tank.move(N(a));};
  // Threat bullets (incoming within cone and radius)
  let H=null, md=1e9; for(const b of bulletInfo){ const dx=b.x-tank.x, dy=b.y-tank.y; const v=Math.hypot(b.vx,b.vy)||1, nx=b.vx/v, ny=b.vy/v; const proj=dx*nx+dy*ny; if(proj>0){ const px=b.x-proj*nx, py=b.y-proj*ny; const d=Math.hypot(px-tank.x,py-tank.y); if(d<md && d<P.threat){ md=d; H=b; } } }
  if(H){ const a=D(H.vx,H.vy); for(const c of [a+92+P.bias, a-92-P.bias, a+118, a-118]){ if(GO(c)) return; } }
  // Keep inside arena
  if(tank.x<P.edge){ if(GO(0)) return; } if(tank.x>900-P.edge){ if(GO(180)) return; } if(tank.y<P.edge){ if(GO(90)) return; } if(tank.y>600-P.edge){ if(GO(270)) return; }
  // Ally separation
  let A=null, ad=1e9; for(const a of allies){ if(a.distance<ad){ ad=a.distance; A=a; } } if(A && ad<P.sep){ const aw=D(tank.x-A.x,tank.y-A.y); if(GO(aw)) return; if(GO(aw+28)) return; if(GO(aw-28)) return; }
  // Range-keeping and strafing
  if(T){ const to=D(T.x-tank.x,T.y-tank.y), d=T.distance; if(d<MIN){ const aw=to+180+P.bias*0.5; if(GO(aw)) return; if(GO(aw+24)) return; if(GO(aw-24)) return; } else if(d>MAX){ if(GO(to)) return; if(GO(to+16)) return; if(GO(to-16)) return; } else { const side=to+(((tank.x*13+tank.y*7)%2)?P.strafe:-P.strafe)+P.bias*0.3; if(GO(side)) return; if(GO(side+16)) return; if(GO(side-16)) return; } }
  for(const s of [0,60,120,180,240,300]){ if(GO(s+P.bias)) return; }
}

// ===== 다음 로봇 =====

function name(){return "NovaE-D2";}
function type(){return Type.DEALER;}
function update(tank,enemies,allies,bulletInfo){
  const D=(x,y)=>Math.atan2(y,x)*180/Math.PI; const N=(a)=>{a%=360;return a<0?a+360:a;}; const C=(v,l,h)=>v<l?l:v>h?h:v;
  const P={"minR":260,"maxR":380,"strafe":40,"threat":88,"sep":62,"edge":46,"bias":-14,"jA":17,"jB":13,"jM":25,"jH":12,"jF":0.11,"leadCap":12,"leadW":1,"hW":1.6,"dW":0.09,"finN":26,"finX":18,"lastN":32,"lastX":32,"minCap":180};
  // Shared target memory per-bot id
  if(!update.__S) update.__S={}; const S=(update.__S[tank.x+'_'+tank.y+'_'+(tank.size||0)] ||= {ex:0,ey:0});
  let T=null, sc=1e9; for(const e of enemies){ let tw=0; // type preference: DEALER(-26), NORMAL(0), TANKER(+18)
    if(e.health!==undefined){ tw += (e.health<18? -12:0); }
    if(e.angle!==undefined){ tw += 0; }
    // approximate class weight via size heuristic if available on input elsewhere; keep zero here.
    const s = e.health*P.hW + e.distance*P.dW + tw; if(s<sc){sc=s; T=e;} }
  if(T){ let ax=T.x, ay=T.y; if(S.ex||S.ey){ const vx=T.x-S.ex, vy=T.y-S.ey; const d=Math.hypot(T.x-tank.x,T.y-tank.y); const t=C(d/8,0,P.leadCap); ax=T.x+vx*P.leadW*t; ay=T.y+vy*P.leadW*t; } const j=((tank.x*P.jA+tank.y*P.jB)%(P.jM)-P.jH)*P.jF; tank.fire(D(ax-tank.x,ay-tank.y)+j); S.ex=T.x; S.ey=T.y; }
  let MIN=P.minR, MAX=P.maxR; if(T){ if(T.health<20){ MIN-=P.finN; MAX-=P.finX; } if(enemies.length<=2){ MIN-=P.lastN; MAX-=P.lastX; } MIN=Math.max(MIN,P.minCap); }
  let tries=0; const GO=(a)=>{tries++; return tank.move(N(a));};
  // Threat bullets (incoming within cone and radius)
  let H=null, md=1e9; for(const b of bulletInfo){ const dx=b.x-tank.x, dy=b.y-tank.y; const v=Math.hypot(b.vx,b.vy)||1, nx=b.vx/v, ny=b.vy/v; const proj=dx*nx+dy*ny; if(proj>0){ const px=b.x-proj*nx, py=b.y-proj*ny; const d=Math.hypot(px-tank.x,py-tank.y); if(d<md && d<P.threat){ md=d; H=b; } } }
  if(H){ const a=D(H.vx,H.vy); for(const c of [a+92+P.bias, a-92-P.bias, a+118, a-118]){ if(GO(c)) return; } }
  // Keep inside arena
  if(tank.x<P.edge){ if(GO(0)) return; } if(tank.x>900-P.edge){ if(GO(180)) return; } if(tank.y<P.edge){ if(GO(90)) return; } if(tank.y>600-P.edge){ if(GO(270)) return; }
  // Ally separation
  let A=null, ad=1e9; for(const a of allies){ if(a.distance<ad){ ad=a.distance; A=a; } } if(A && ad<P.sep){ const aw=D(tank.x-A.x,tank.y-A.y); if(GO(aw)) return; if(GO(aw+28)) return; if(GO(aw-28)) return; }
  // Range-keeping and strafing
  if(T){ const to=D(T.x-tank.x,T.y-tank.y), d=T.distance; if(d<MIN){ const aw=to+180+P.bias*0.5; if(GO(aw)) return; if(GO(aw+24)) return; if(GO(aw-24)) return; } else if(d>MAX){ if(GO(to)) return; if(GO(to+16)) return; if(GO(to-16)) return; } else { const side=to+(((tank.x*13+tank.y*7)%2)?P.strafe:-P.strafe)+P.bias*0.3; if(GO(side)) return; if(GO(side+16)) return; if(GO(side-16)) return; } }
  for(const s of [0,60,120,180,240,300]){ if(GO(s+P.bias)) return; }
}

// ===== 다음 로봇 =====

function name(){return "NovaE-T2";}
function type(){return Type.TANKER;}
function update(tank,enemies,allies,bulletInfo){
  const D=(x,y)=>Math.atan2(y,x)*180/Math.PI; const N=(a)=>{a%=360;return a<0?a+360:a;}; const C=(v,l,h)=>v<l?l:v>h?h:v;
  const P={"minR":190,"maxR":310,"strafe":36,"threat":85,"sep":66,"edge":46,"bias":-12,"jA":31,"jB":17,"jM":29,"jH":14,"jF":0.14,"leadCap":11,"leadW":0.92,"hW":1.55,"dW":0.11,"finN":28,"finX":18,"lastN":34,"lastX":34,"minCap":160};
  // Shared target memory per-bot id
  if(!update.__S) update.__S={}; const S=(update.__S[tank.x+'_'+tank.y+'_'+(tank.size||0)] ||= {ex:0,ey:0});
  let T=null, sc=1e9; for(const e of enemies){ let tw=0; // type preference: DEALER(-26), NORMAL(0), TANKER(+18)
    if(e.health!==undefined){ tw += (e.health<18? -12:0); }
    if(e.angle!==undefined){ tw += 0; }
    // approximate class weight via size heuristic if available on input elsewhere; keep zero here.
    const s = e.health*P.hW + e.distance*P.dW + tw; if(s<sc){sc=s; T=e;} }
  if(T){ let ax=T.x, ay=T.y; if(S.ex||S.ey){ const vx=T.x-S.ex, vy=T.y-S.ey; const d=Math.hypot(T.x-tank.x,T.y-tank.y); const t=C(d/8,0,P.leadCap); ax=T.x+vx*P.leadW*t; ay=T.y+vy*P.leadW*t; } const j=((tank.x*P.jA+tank.y*P.jB)%(P.jM)-P.jH)*P.jF; tank.fire(D(ax-tank.x,ay-tank.y)+j); S.ex=T.x; S.ey=T.y; }
  let MIN=P.minR, MAX=P.maxR; if(T){ if(T.health<20){ MIN-=P.finN; MAX-=P.finX; } if(enemies.length<=2){ MIN-=P.lastN; MAX-=P.lastX; } MIN=Math.max(MIN,P.minCap); }
  let tries=0; const GO=(a)=>{tries++; return tank.move(N(a));};
  // Threat bullets (incoming within cone and radius)
  let H=null, md=1e9; for(const b of bulletInfo){ const dx=b.x-tank.x, dy=b.y-tank.y; const v=Math.hypot(b.vx,b.vy)||1, nx=b.vx/v, ny=b.vy/v; const proj=dx*nx+dy*ny; if(proj>0){ const px=b.x-proj*nx, py=b.y-proj*ny; const d=Math.hypot(px-tank.x,py-tank.y); if(d<md && d<P.threat){ md=d; H=b; } } }
  if(H){ const a=D(H.vx,H.vy); for(const c of [a+92+P.bias, a-92-P.bias, a+118, a-118]){ if(GO(c)) return; } }
  // Keep inside arena
  if(tank.x<P.edge){ if(GO(0)) return; } if(tank.x>900-P.edge){ if(GO(180)) return; } if(tank.y<P.edge){ if(GO(90)) return; } if(tank.y>600-P.edge){ if(GO(270)) return; }
  // Ally separation
  let A=null, ad=1e9; for(const a of allies){ if(a.distance<ad){ ad=a.distance; A=a; } } if(A && ad<P.sep){ const aw=D(tank.x-A.x,tank.y-A.y); if(GO(aw)) return; if(GO(aw+28)) return; if(GO(aw-28)) return; }
  // Range-keeping and strafing
  if(T){ const to=D(T.x-tank.x,T.y-tank.y), d=T.distance; if(d<MIN){ const aw=to+180+P.bias*0.5; if(GO(aw)) return; if(GO(aw+24)) return; if(GO(aw-24)) return; } else if(d>MAX){ if(GO(to)) return; if(GO(to+16)) return; if(GO(to-16)) return; } else { const side=to+(((tank.x*13+tank.y*7)%2)?P.strafe:-P.strafe)+P.bias*0.3; if(GO(side)) return; if(GO(side+16)) return; if(GO(side-16)) return; } }
  for(const s of [0,60,120,180,240,300]){ if(GO(s+P.bias)) return; }
}