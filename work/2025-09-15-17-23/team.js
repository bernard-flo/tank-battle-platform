// Nova Overmind Team v1
// Six self-contained robots with predictive aiming, orbit kiting, and bullet-aware pathing.

function name(){return "Nova-T1";}
function type(){return Type.TANKER;}
let __state={tick:0,lastMove:undefined,lastTgt:null,lvx:0,lvy:0,spinBias:-1};
function update(tank,enemies,allies,bulletInfo){
  "use strict";
  __state.tick=(__state.tick||0)+1;
  const toDeg=(x,y)=>Math.atan2(y,x)*180/Math.PI; const toRad=(a)=>a*Math.PI/180; const norm=(a)=>{a%=360; if(a<0)a+=360; return a|0;};
  const H=Math.hypot; const BUL=8; const SPEED=(tank.type===1?3:(tank.type===2?6:5));
  const clamp=(v,lo,hi)=>v<lo?lo:v>hi?hi:v; const dot=(ax,ay,bx,by)=>ax*bx+ay*by;
  const W={wHealth:1.1,wDist:0.07,wDealer:24,wNormal:6,wFinish:14};
  let tgt=null,best=1e12; for(const e of enemies){ let s=e.health*W.wHealth + e.distance*W.wDist; if(e.health<=26) s-=W.wFinish; if(e.type===2) s-=W.wDealer; else if(e.type===0) s-=W.wNormal; if(s<best){best=s;tgt=e;} }
  if(tgt){ let vx=0,vy=0; if(__state.lastTgt && Math.abs(__state.lastTgt.x-tgt.x)<80 && Math.abs(__state.lastTgt.y-tgt.y)<80){ vx=tgt.x-__state.lastTgt.x; vy=tgt.y-__state.lastTgt.y; }
    __state.lvx=__state.lvx*0.6+vx*0.4; __state.lvy=__state.lvy*0.6+vy*0.4; const rx=tgt.x-tank.x, ry=tgt.y-tank.y;
    const vv=__state.lvx*__state.lvx+__state.lvy*__state.lvy, rv=rx*__state.lvx+ry*__state.lvy, rr=rx*rx+ry*ry; let t=0; const A=vv-BUL*BUL,B=2*rv,C=rr;
    if(Math.abs(A)<1e-6){ t=(B!==0?-C/B:0);} else { const disc=B*B-4*A*C; if(disc>=0){ const s=Math.sqrt(disc); const t1=(-B+s)/(2*A), t2=(-B-s)/(2*A); t=Math.max(t1,t2); if(t<0) t=Math.max(t1,t2);} }
    t=clamp(t,0,24); const ax=tgt.x+__state.lvx*t, ay=tgt.y+__state.lvy*t; const jitter=(((__state.tick*17+(tank.x*11+tank.y*7)|0)%9)-4)*0.14; tank.fire(toDeg(ax-tank.x,ay-tank.y)+jitter); __state.lastTgt={x:tgt.x,y:tgt.y}; }
  const P={edge:46, allySep:60, horizon:7, bulletRad:22, bulletWeight:0.11, etaW:0.16, minRange:140, maxRange:210, lowHpPad:36, finishHp:26, inertia:0.0021, edgeW:0.085, rangeInW:0.016, rangeOutW:0.011, orbit:16, fleeBias:12};
  if(tgt&&tgt.health<=P.finishHp){ P.minRange-=32; P.maxRange-=24; }
  if(tank.health<70) P.minRange+=P.lowHpPad;
  function riskForAngle(a){ const ar=toRad(a); const dx=Math.cos(ar)*SPEED, dy=Math.sin(ar)*SPEED; let risk=0; let px=tank.x, py=tank.y;
    for(let k=1;k<=P.horizon;k++){ px+=dx; py+=dy; if(px<P.edge||px>900-P.edge) risk+=(P.edge-Math.min(px,900-px))*P.edgeW; if(py<P.edge||py>600-P.edge) risk+=(P.edge-Math.min(py,600-py))*P.edgeW;
      for(const al of allies){ const d=H(px-al.x,py-al.y); if(d<P.allySep) risk+=(P.allySep-d)*0.028; }
      for(const b of bulletInfo){ const bx=b.x+b.vx*k, by=b.y+b.vy*k; const relx=px-bx, rely=py-by; const d=H(relx,rely); if(d<P.bulletRad){ const vmag=H(b.vx,b.vy)||1; const ux=b.vx/vmag, uy=b.vy/vmag; const along=dot(relx,rely,ux,uy); const eta=Math.max(0,-along)/BUL; const w=P.bulletWeight*(1+P.etaW*(P.horizon-k)); risk+=(P.bulletRad-d)*w*(1+0.18*Math.min(1,eta)); } }
      if(tgt){ const d=H(px-tgt.x,py-tgt.y); if(d<P.minRange) risk+=(P.minRange-d)*P.rangeInW; else if(d>P.maxRange) risk+=(d-P.maxRange)*P.rangeOutW; }
      for(const e of enemies){ const d=H(px-e.x,py-e.y); if(d<90) risk+=(90-d)*0.005; }
    }
    if(__state.lastMove!==undefined){ const da=Math.abs(((a-__state.lastMove)%360+540)%360-180); risk+=da*P.inertia; }
    return risk; }
  const cands=[]; const add=(ang)=>{ const k=norm(Math.round(ang)); if(!cands.includes(k)) cands.push(k); };
  if(tgt){ const base=toDeg(tgt.x-tank.x,tgt.y-tank.y); add(base); add(base+180); add(base+90+P.orbit*__state.spinBias); add(base-90-P.orbit*__state.spinBias); add(base+45*__state.spinBias); add(base-45*__state.spinBias); }
  let hot=null, md=1e9; for(const b of bulletInfo){ const dx=b.x-tank.x, dy=b.y-tank.y; const v=H(b.vx,b.vy)||1; const nx=b.vx/v, ny=b.vy/v; const proj=dx*nx+dy*ny; if(proj>0){ const px=b.x-proj*nx, py=b.y-proj*ny; const d=H(px-tank.x,py-tank.y); if(d<md){ md=d; hot=b; } } } if(hot){ const a=toDeg(hot.vx,hot.vy); add(a+90+P.fleeBias); add(a-90-P.fleeBias); add(a+120); add(a-120); }
  for(let s=0;s<360;s+=30) add(s);
  cands.sort((a,b)=>riskForAngle(a)-riskForAngle(b)); for(const a of cands){ if(tank.move(a)){ __state.lastMove=a; return; } } const fb=norm((__state.tick*37+tank.x+tank.y)|0); if(tank.move(fb)){ __state.lastMove=fb; return; }
}

// ===== 다음 로봇 =====

function name(){return "Nova-T2";}
function type(){return Type.TANKER;}
let __state={tick:0,lastMove:undefined,lastTgt:null,lvx:0,lvy:0,spinBias:1};
function update(tank,enemies,allies,bulletInfo){
  "use strict";
  __state.tick=(__state.tick||0)+1;
  const toDeg=(x,y)=>Math.atan2(y,x)*180/Math.PI; const toRad=(a)=>a*Math.PI/180; const norm=(a)=>{a%=360; if(a<0)a+=360; return a|0;};
  const H=Math.hypot; const BUL=8; const SPEED=(tank.type===1?3:(tank.type===2?6:5));
  const clamp=(v,lo,hi)=>v<lo?lo:v>hi?hi:v; const dot=(ax,ay,bx,by)=>ax*bx+ay*by;
  const W={wHealth:1.1,wDist:0.07,wDealer:24,wNormal:6,wFinish:14};
  let tgt=null,best=1e12; for(const e of enemies){ let s=e.health*W.wHealth + e.distance*W.wDist; if(e.health<=26) s-=W.wFinish; if(e.type===2) s-=W.wDealer; else if(e.type===0) s-=W.wNormal; if(s<best){best=s;tgt=e;} }
  if(tgt){ let vx=0,vy=0; if(__state.lastTgt && Math.abs(__state.lastTgt.x-tgt.x)<80 && Math.abs(__state.lastTgt.y-tgt.y)<80){ vx=tgt.x-__state.lastTgt.x; vy=tgt.y-__state.lastTgt.y; }
    __state.lvx=__state.lvx*0.6+vx*0.4; __state.lvy=__state.lvy*0.6+vy*0.4; const rx=tgt.x-tank.x, ry=tgt.y-tank.y;
    const vv=__state.lvx*__state.lvx+__state.lvy*__state.lvy, rv=rx*__state.lvx+ry*__state.lvy, rr=rx*rx+ry*ry; let t=0; const A=vv-BUL*BUL,B=2*rv,C=rr;
    if(Math.abs(A)<1e-6){ t=(B!==0?-C/B:0);} else { const disc=B*B-4*A*C; if(disc>=0){ const s=Math.sqrt(disc); const t1=(-B+s)/(2*A), t2=(-B-s)/(2*A); t=Math.max(t1,t2); if(t<0) t=Math.max(t1,t2);} }
    t=clamp(t,0,24); const ax=tgt.x+__state.lvx*t, ay=tgt.y+__state.lvy*t; const jitter=(((__state.tick*17+(tank.x*11+tank.y*7)|0)%9)-4)*0.14; tank.fire(toDeg(ax-tank.x,ay-tank.y)+jitter); __state.lastTgt={x:tgt.x,y:tgt.y}; }
  const P={edge:46, allySep:60, horizon:7, bulletRad:22, bulletWeight:0.11, etaW:0.16, minRange:140, maxRange:210, lowHpPad:36, finishHp:26, inertia:0.0021, edgeW:0.085, rangeInW:0.016, rangeOutW:0.011, orbit:16, fleeBias:12};
  if(tgt&&tgt.health<=P.finishHp){ P.minRange-=32; P.maxRange-=24; }
  if(tank.health<70) P.minRange+=P.lowHpPad;
  function riskForAngle(a){ const ar=toRad(a); const dx=Math.cos(ar)*SPEED, dy=Math.sin(ar)*SPEED; let risk=0; let px=tank.x, py=tank.y;
    for(let k=1;k<=P.horizon;k++){ px+=dx; py+=dy; if(px<P.edge||px>900-P.edge) risk+=(P.edge-Math.min(px,900-px))*P.edgeW; if(py<P.edge||py>600-P.edge) risk+=(P.edge-Math.min(py,600-py))*P.edgeW;
      for(const al of allies){ const d=H(px-al.x,py-al.y); if(d<P.allySep) risk+=(P.allySep-d)*0.028; }
      for(const b of bulletInfo){ const bx=b.x+b.vx*k, by=b.y+b.vy*k; const relx=px-bx, rely=py-by; const d=H(relx,rely); if(d<P.bulletRad){ const vmag=H(b.vx,b.vy)||1; const ux=b.vx/vmag, uy=b.vy/vmag; const along=dot(relx,rely,ux,uy); const eta=Math.max(0,-along)/BUL; const w=P.bulletWeight*(1+P.etaW*(P.horizon-k)); risk+=(P.bulletRad-d)*w*(1+0.18*Math.min(1,eta)); } }
      if(tgt){ const d=H(px-tgt.x,py-tgt.y); if(d<P.minRange) risk+=(P.minRange-d)*P.rangeInW; else if(d>P.maxRange) risk+=(d-P.maxRange)*P.rangeOutW; }
      for(const e of enemies){ const d=H(px-e.x,py-e.y); if(d<90) risk+=(90-d)*0.005; }
    }
    if(__state.lastMove!==undefined){ const da=Math.abs(((a-__state.lastMove)%360+540)%360-180); risk+=da*P.inertia; }
    return risk; }
  const cands=[]; const add=(ang)=>{ const k=norm(Math.round(ang)); if(!cands.includes(k)) cands.push(k); };
  if(tgt){ const base=toDeg(tgt.x-tank.x,tgt.y-tank.y); add(base); add(base+180); add(base+90+P.orbit*__state.spinBias); add(base-90-P.orbit*__state.spinBias); add(base+45*__state.spinBias); add(base-45*__state.spinBias); }
  let hot=null, md=1e9; for(const b of bulletInfo){ const dx=b.x-tank.x, dy=b.y-tank.y; const v=H(b.vx,b.vy)||1; const nx=b.vx/v, ny=b.vy/v; const proj=dx*nx+dy*ny; if(proj>0){ const px=b.x-proj*nx, py=b.y-proj*ny; const d=H(px-tank.x,py-tank.y); if(d<md){ md=d; hot=b; } } } if(hot){ const a=toDeg(hot.vx,hot.vy); add(a+90+P.fleeBias); add(a-90-P.fleeBias); add(a+120); add(a-120); }
  for(let s=0;s<360;s+=30) add(s);
  cands.sort((a,b)=>riskForAngle(a)-riskForAngle(b)); for(const a of cands){ if(tank.move(a)){ __state.lastMove=a; return; } } const fb=norm((__state.tick*37+tank.x+tank.y)|0); if(tank.move(fb)){ __state.lastMove=fb; return; }
}

// ===== 다음 로봇 =====

function name(){return "Nova-D1";}
function type(){return Type.DEALER;}
let __state={tick:0,lastMove:undefined,lastTgt:null,lvx:0,lvy:0,spinBias:-1};
function update(tank,enemies,allies,bulletInfo){
  "use strict";
  __state.tick=(__state.tick||0)+1;
  const toDeg=(x,y)=>Math.atan2(y,x)*180/Math.PI; const toRad=(a)=>a*Math.PI/180; const norm=(a)=>{a%=360; if(a<0)a+=360; return a|0;};
  const H=Math.hypot; const BUL=8; const SPEED=(tank.type===1?3:(tank.type===2?6:5));
  const clamp=(v,lo,hi)=>v<lo?lo:v>hi?hi:v; const dot=(ax,ay,bx,by)=>ax*bx+ay*by;
  const W={wHealth:1.5,wDist:0.10,wDealer:30,wNormal:6,wFinish:20};
  let tgt=null,best=1e12; for(const e of enemies){ let s=e.health*W.wHealth + e.distance*W.wDist; if(e.health<=30) s-=W.wFinish; if(e.type===2) s-=W.wDealer; else if(e.type===0) s-=W.wNormal; if(s<best){best=s;tgt=e;} }
  if(tgt){ let vx=0,vy=0; if(__state.lastTgt && Math.abs(__state.lastTgt.x-tgt.x)<80 && Math.abs(__state.lastTgt.y-tgt.y)<80){ vx=tgt.x-__state.lastTgt.x; vy=tgt.y-__state.lastTgt.y; }
    __state.lvx=__state.lvx*0.6+vx*0.4; __state.lvy=__state.lvy*0.6+vy*0.4; const rx=tgt.x-tank.x, ry=tgt.y-tank.y;
    const vv=__state.lvx*__state.lvx+__state.lvy*__state.lvy, rv=rx*__state.lvx+ry*__state.lvy, rr=rx*rx+ry*ry; let t=0; const A=vv-BUL*BUL,B=2*rv,C=rr;
    if(Math.abs(A)<1e-6){ t=(B!==0?-C/B:0);} else { const disc=B*B-4*A*C; if(disc>=0){ const s=Math.sqrt(disc); const t1=(-B+s)/(2*A), t2=(-B-s)/(2*A); t=Math.max(t1,t2); if(t<0) t=Math.max(t1,t2);} }
    t=clamp(t,0,26); const ax=tgt.x+__state.lvx*t, ay=tgt.y+__state.lvy*t; const jitter=(((__state.tick*19+(tank.x*11+tank.y*7)|0)%9)-4)*0.18; tank.fire(toDeg(ax-tank.x,ay-tank.y)+jitter); __state.lastTgt={x:tgt.x,y:tgt.y}; }
  const P={edge:48, allySep:66, horizon:7, bulletRad:22, bulletWeight:0.12, etaW:0.17, minRange:230, maxRange:370, lowHpPad:30, finishHp:30, inertia:0.0023, edgeW:0.087, rangeInW:0.017, rangeOutW:0.011, orbit:26, fleeBias:12};
  if(tgt&&tgt.health<=P.finishHp){ P.minRange-=34; P.maxRange-=26; }
  if(tank.health<45) P.minRange+=P.lowHpPad;
  function riskForAngle(a){ const ar=toRad(a); const dx=Math.cos(ar)*SPEED, dy=Math.sin(ar)*SPEED; let risk=0; let px=tank.x, py=tank.y;
    for(let k=1;k<=P.horizon;k++){ px+=dx; py+=dy; if(px<P.edge||px>900-P.edge) risk+=(P.edge-Math.min(px,900-px))*P.edgeW; if(py<P.edge||py>600-P.edge) risk+=(P.edge-Math.min(py,600-py))*P.edgeW;
      for(const al of allies){ const d=H(px-al.x,py-al.y); if(d<P.allySep) risk+=(P.allySep-d)*0.03; }
      for(const b of bulletInfo){ const bx=b.x+b.vx*k, by=b.y+b.vy*k; const relx=px-bx, rely=py-by; const d=H(relx,rely); if(d<P.bulletRad){ const vmag=H(b.vx,b.vy)||1; const ux=b.vx/vmag, uy=b.vy/vmag; const along=dot(relx,rely,ux,uy); const eta=Math.max(0,-along)/BUL; const w=P.bulletWeight*(1+P.etaW*(P.horizon-k)); risk+=(P.bulletRad-d)*w*(1+0.2*Math.min(1,eta)); } }
      if(tgt){ const d=H(px-tgt.x,py-tgt.y); if(d<P.minRange) risk+=(P.minRange-d)*P.rangeInW; else if(d>P.maxRange) risk+=(d-P.maxRange)*P.rangeOutW; }
      for(const e of enemies){ const d=H(px-e.x,py-e.y); if(d<130) risk+=(130-d)*0.007; }
    }
    if(__state.lastMove!==undefined){ const da=Math.abs(((a-__state.lastMove)%360+540)%360-180); risk+=da*P.inertia; }
    return risk; }
  const cands=[]; const add=(ang)=>{ const k=norm(Math.round(ang)); if(!cands.includes(k)) cands.push(k); };
  if(tgt){ const base=toDeg(tgt.x-tank.x,tgt.y-tank.y); add(base); add(base+180); add(base+90+P.orbit*__state.spinBias); add(base-90-P.orbit*__state.spinBias); add(base+50*__state.spinBias); add(base-50*__state.spinBias); }
  let hot=null, md=1e9; for(const b of bulletInfo){ const dx=b.x-tank.x, dy=b.y-tank.y; const v=H(b.vx,b.vy)||1; const nx=b.vx/v, ny=b.vy/v; const proj=dx*nx+dy*ny; if(proj>0){ const px=b.x-proj*nx, py=b.y-proj*ny; const d=H(px-tank.x,py-tank.y); if(d<md){ md=d; hot=b; } } } if(hot){ const a=toDeg(hot.vx,hot.vy); add(a+90+P.fleeBias); add(a-90-P.fleeBias); add(a+120); add(a-120); }
  for(let s=0;s<360;s+=30) add(s);
  cands.sort((a,b)=>riskForAngle(a)-riskForAngle(b)); for(const a of cands){ if(tank.move(a)){ __state.lastMove=a; return; } } const fb=norm((__state.tick*39+tank.x+tank.y)|0); if(tank.move(fb)){ __state.lastMove=fb; return; }
}

// ===== 다음 로봇 =====

function name(){return "Nova-D2";}
function type(){return Type.DEALER;}
let __state={tick:0,lastMove:undefined,lastTgt:null,lvx:0,lvy:0,spinBias:1};
function update(tank,enemies,allies,bulletInfo){
  "use strict";
  __state.tick=(__state.tick||0)+1;
  const toDeg=(x,y)=>Math.atan2(y,x)*180/Math.PI; const toRad=(a)=>a*Math.PI/180; const norm=(a)=>{a%=360; if(a<0)a+=360; return a|0;};
  const H=Math.hypot; const BUL=8; const SPEED=(tank.type===1?3:(tank.type===2?6:5));
  const clamp=(v,lo,hi)=>v<lo?lo:v>hi?hi:v; const dot=(ax,ay,bx,by)=>ax*bx+ay*by;
  const W={wHealth:1.5,wDist:0.10,wDealer:30,wNormal:6,wFinish:20};
  let tgt=null,best=1e12; for(const e of enemies){ let s=e.health*W.wHealth + e.distance*W.wDist; if(e.health<=30) s-=W.wFinish; if(e.type===2) s-=W.wDealer; else if(e.type===0) s-=W.wNormal; if(s<best){best=s;tgt=e;} }
  if(tgt){ let vx=0,vy=0; if(__state.lastTgt && Math.abs(__state.lastTgt.x-tgt.x)<80 && Math.abs(__state.lastTgt.y-tgt.y)<80){ vx=tgt.x-__state.lastTgt.x; vy=tgt.y-__state.lastTgt.y; }
    __state.lvx=__state.lvx*0.6+vx*0.4; __state.lvy=__state.lvy*0.6+vy*0.4; const rx=tgt.x-tank.x, ry=tgt.y-tank.y;
    const vv=__state.lvx*__state.lvx+__state.lvy*__state.lvy, rv=rx*__state.lvx+ry*__state.lvy, rr=rx*rx+ry*ry; let t=0; const A=vv-BUL*BUL,B=2*rv,C=rr;
    if(Math.abs(A)<1e-6){ t=(B!==0?-C/B:0);} else { const disc=B*B-4*A*C; if(disc>=0){ const s=Math.sqrt(disc); const t1=(-B+s)/(2*A), t2=(-B-s)/(2*A); t=Math.max(t1,t2); if(t<0) t=Math.max(t1,t2);} }
    t=clamp(t,0,26); const ax=tgt.x+__state.lvx*t, ay=tgt.y+__state.lvy*t; const jitter=(((__state.tick*19+(tank.x*11+tank.y*7)|0)%9)-4)*0.18; tank.fire(toDeg(ax-tank.x,ay-tank.y)+jitter); __state.lastTgt={x:tgt.x,y:tgt.y}; }
  const P={edge:48, allySep:66, horizon:7, bulletRad:22, bulletWeight:0.12, etaW:0.17, minRange:230, maxRange:370, lowHpPad:30, finishHp:30, inertia:0.0023, edgeW:0.087, rangeInW:0.017, rangeOutW:0.011, orbit:26, fleeBias:12};
  if(tgt&&tgt.health<=P.finishHp){ P.minRange-=34; P.maxRange-=26; }
  if(tank.health<45) P.minRange+=P.lowHpPad;
  function riskForAngle(a){ const ar=toRad(a); const dx=Math.cos(ar)*SPEED, dy=Math.sin(ar)*SPEED; let risk=0; let px=tank.x, py=tank.y;
    for(let k=1;k<=P.horizon;k++){ px+=dx; py+=dy; if(px<P.edge||px>900-P.edge) risk+=(P.edge-Math.min(px,900-px))*P.edgeW; if(py<P.edge||py>600-P.edge) risk+=(P.edge-Math.min(py,600-py))*P.edgeW;
      for(const al of allies){ const d=H(px-al.x,py-al.y); if(d<P.allySep) risk+=(P.allySep-d)*0.03; }
      for(const b of bulletInfo){ const bx=b.x+b.vx*k, by=b.y+b.vy*k; const relx=px-bx, rely=py-by; const d=H(relx,rely); if(d<P.bulletRad){ const vmag=H(b.vx,b.vy)||1; const ux=b.vx/vmag, uy=b.vy/vmag; const along=dot(relx,rely,ux,uy); const eta=Math.max(0,-along)/BUL; const w=P.bulletWeight*(1+P.etaW*(P.horizon-k)); risk+=(P.bulletRad-d)*w*(1+0.2*Math.min(1,eta)); } }
      if(tgt){ const d=H(px-tgt.x,py-tgt.y); if(d<P.minRange) risk+=(P.minRange-d)*P.rangeInW; else if(d>P.maxRange) risk+=(d-P.maxRange)*P.rangeOutW; }
      for(const e of enemies){ const d=H(px-e.x,py-e.y); if(d<130) risk+=(130-d)*0.007; }
    }
    if(__state.lastMove!==undefined){ const da=Math.abs(((a-__state.lastMove)%360+540)%360-180); risk+=da*P.inertia; }
    return risk; }
  const cands=[]; const add=(ang)=>{ const k=norm(Math.round(ang)); if(!cands.includes(k)) cands.push(k); };
  if(tgt){ const base=toDeg(tgt.x-tank.x,tgt.y-tank.y); add(base); add(base+180); add(base+90+P.orbit*__state.spinBias); add(base-90-P.orbit*__state.spinBias); add(base+50*__state.spinBias); add(base-50*__state.spinBias); }
  let hot=null, md=1e9; for(const b of bulletInfo){ const dx=b.x-tank.x, dy=b.y-tank.y; const v=H(b.vx,b.vy)||1; const nx=b.vx/v, ny=b.vy/v; const proj=dx*nx+dy*ny; if(proj>0){ const px=b.x-proj*nx, py=b.y-proj*ny; const d=H(px-tank.x,py-tank.y); if(d<md){ md=d; hot=b; } } } if(hot){ const a=toDeg(hot.vx,hot.vy); add(a+90+P.fleeBias); add(a-90-P.fleeBias); add(a+120); add(a-120); }
  for(let s=0;s<360;s+=30) add(s);
  cands.sort((a,b)=>riskForAngle(a)-riskForAngle(b)); for(const a of cands){ if(tank.move(a)){ __state.lastMove=a; return; } } const fb=norm((__state.tick*39+tank.x+tank.y)|0); if(tank.move(fb)){ __state.lastMove=fb; return; }
}

// ===== 다음 로봇 =====

function name(){return "Nova-N1";}
function type(){return Type.NORMAL;}
let __state={tick:0,lastMove:undefined,lastTgt:null,lvx:0,lvy:0,spinBias:-1};
function update(tank,enemies,allies,bulletInfo){
  "use strict";
  __state.tick=(__state.tick||0)+1;
  const toDeg=(x,y)=>Math.atan2(y,x)*180/Math.PI; const toRad=(a)=>a*Math.PI/180; const norm=(a)=>{a%=360; if(a<0)a+=360; return a|0;};
  const H=Math.hypot; const BUL=8; const SPEED=(tank.type===1?3:(tank.type===2?6:5));
  const clamp=(v,lo,hi)=>v<lo?lo:v>hi?hi:v; const dot=(ax,ay,bx,by)=>ax*bx+ay*by;
  const W={wHealth:1.35,wDist:0.095,wDealer:26,wNormal:7,wFinish:18};
  let tgt=null,best=1e12; for(const e of enemies){ let s=e.health*W.wHealth + e.distance*W.wDist; if(e.health<=28) s-=W.wFinish; if(e.type===2) s-=W.wDealer; else if(e.type===0) s-=W.wNormal; if(s<best){best=s;tgt=e;} }
  if(tgt){ let vx=0,vy=0; if(__state.lastTgt && Math.abs(__state.lastTgt.x-tgt.x)<80 && Math.abs(__state.lastTgt.y-tgt.y)<80){ vx=tgt.x-__state.lastTgt.x; vy=tgt.y-__state.lastTgt.y; }
    __state.lvx=__state.lvx*0.6+vx*0.4; __state.lvy=__state.lvy*0.6+vy*0.4; const rx=tgt.x-tank.x, ry=tgt.y-tank.y;
    const vv=__state.lvx*__state.lvx+__state.lvy*__state.lvy, rv=rx*__state.lvx+ry*__state.lvy, rr=rx*rx+ry*ry; let t=0; const A=vv-BUL*BUL,B=2*rv,C=rr;
    if(Math.abs(A)<1e-6){ t=(B!==0?-C/B:0);} else { const disc=B*B-4*A*C; if(disc>=0){ const s=Math.sqrt(disc); const t1=(-B+s)/(2*A), t2=(-B-s)/(2*A); t=Math.max(t1,t2); if(t<0) t=Math.max(t1,t2);} }
    t=clamp(t,0,25); const ax=tgt.x+__state.lvx*t, ay=tgt.y+__state.lvy*t; const jitter=(((__state.tick*18+(tank.x*11+tank.y*7)|0)%9)-4)*0.16; tank.fire(toDeg(ax-tank.x,ay-tank.y)+jitter); __state.lastTgt={x:tgt.x,y:tgt.y}; }
  const P={edge:46, allySep:64, horizon:7, bulletRad:22, bulletWeight:0.11, etaW:0.16, minRange:170, maxRange:270, lowHpPad:34, finishHp:28, inertia:0.0022, edgeW:0.085, rangeInW:0.016, rangeOutW:0.011, orbit:22, fleeBias:12};
  if(tgt&&tgt.health<=P.finishHp){ P.minRange-=34; P.maxRange-=26; }
  if(tank.health<55) P.minRange+=P.lowHpPad;
  function riskForAngle(a){ const ar=toRad(a); const dx=Math.cos(ar)*SPEED, dy=Math.sin(ar)*SPEED; let risk=0; let px=tank.x, py=tank.y;
    for(let k=1;k<=P.horizon;k++){ px+=dx; py+=dy; if(px<P.edge||px>900-P.edge) risk+=(P.edge-Math.min(px,900-px))*P.edgeW; if(py<P.edge||py>600-P.edge) risk+=(P.edge-Math.min(py,600-py))*P.edgeW;
      for(const al of allies){ const d=H(px-al.x,py-al.y); if(d<P.allySep) risk+=(P.allySep-d)*0.03; }
      for(const b of bulletInfo){ const bx=b.x+b.vx*k, by=b.y+b.vy*k; const relx=px-bx, rely=py-by; const d=H(relx,rely); if(d<P.bulletRad){ const vmag=H(b.vx,b.vy)||1; const ux=b.vx/vmag, uy=b.vy/vmag; const along=dot(relx,rely,ux,uy); const eta=Math.max(0,-along)/BUL; const w=P.bulletWeight*(1+P.etaW*(P.horizon-k)); risk+=(P.bulletRad-d)*w*(1+0.18*Math.min(1,eta)); } }
      if(tgt){ const d=H(px-tgt.x,py-tgt.y); if(d<P.minRange) risk+=(P.minRange-d)*P.rangeInW; else if(d>P.maxRange) risk+=(d-P.maxRange)*P.rangeOutW; }
      for(const e of enemies){ const d=H(px-e.x,py-e.y); if(d<115) risk+=(115-d)*0.006; }
    }
    if(__state.lastMove!==undefined){ const da=Math.abs(((a-__state.lastMove)%360+540)%360-180); risk+=da*P.inertia; }
    return risk; }
  const cands=[]; const add=(ang)=>{ const k=norm(Math.round(ang)); if(!cands.includes(k)) cands.push(k); };
  if(tgt){ const base=toDeg(tgt.x-tank.x,tgt.y-tank.y); add(base); add(base+180); add(base+90+P.orbit*__state.spinBias); add(base-90-P.orbit*__state.spinBias); add(base+45*__state.spinBias); add(base-45*__state.spinBias); }
  let hot=null, md=1e9; for(const b of bulletInfo){ const dx=b.x-tank.x, dy=b.y-tank.y; const v=H(b.vx,b.vy)||1; const nx=b.vx/v, ny=b.vy/v; const proj=dx*nx+dy*ny; if(proj>0){ const px=b.x-proj*nx, py=b.y-proj*ny; const d=H(px-tank.x,py-tank.y); if(d<md){ md=d; hot=b; } } } if(hot){ const a=toDeg(hot.vx,hot.vy); add(a+90+P.fleeBias); add(a-90-P.fleeBias); add(a+120); add(a-120); }
  for(let s=0;s<360;s+=30) add(s);
  cands.sort((a,b)=>riskForAngle(a)-riskForAngle(b)); for(const a of cands){ if(tank.move(a)){ __state.lastMove=a; return; } } const fb=norm((__state.tick*37+tank.x+tank.y)|0); if(tank.move(fb)){ __state.lastMove=fb; return; }
}

// ===== 다음 로봇 =====

function name(){return "Nova-N2";}
function type(){return Type.NORMAL;}
let __state={tick:0,lastMove:undefined,lastTgt:null,lvx:0,lvy:0,spinBias:1};
function update(tank,enemies,allies,bulletInfo){
  "use strict";
  __state.tick=(__state.tick||0)+1;
  const toDeg=(x,y)=>Math.atan2(y,x)*180/Math.PI; const toRad=(a)=>a*Math.PI/180; const norm=(a)=>{a%=360; if(a<0)a+=360; return a|0;};
  const H=Math.hypot; const BUL=8; const SPEED=(tank.type===1?3:(tank.type===2?6:5));
  const clamp=(v,lo,hi)=>v<lo?lo:v>hi?hi:v; const dot=(ax,ay,bx,by)=>ax*bx+ay*by;
  const W={wHealth:1.35,wDist:0.095,wDealer:26,wNormal:7,wFinish:18};
  let tgt=null,best=1e12; for(const e of enemies){ let s=e.health*W.wHealth + e.distance*W.wDist; if(e.health<=28) s-=W.wFinish; if(e.type===2) s-=W.wDealer; else if(e.type===0) s-=W.wNormal; if(s<best){best=s;tgt=e;} }
  if(tgt){ let vx=0,vy=0; if(__state.lastTgt && Math.abs(__state.lastTgt.x-tgt.x)<80 && Math.abs(__state.lastTgt.y-tgt.y)<80){ vx=tgt.x-__state.lastTgt.x; vy=tgt.y-__state.lastTgt.y; }
    __state.lvx=__state.lvx*0.6+vx*0.4; __state.lvy=__state.lvy*0.6+vy*0.4; const rx=tgt.x-tank.x, ry=tgt.y-tank.y;
    const vv=__state.lvx*__state.lvx+__state.lvy*__state.lvy, rv=rx*__state.lvx+ry*__state.lvy, rr=rx*rx+ry*ry; let t=0; const A=vv-BUL*BUL,B=2*rv,C=rr;
    if(Math.abs(A)<1e-6){ t=(B!==0?-C/B:0);} else { const disc=B*B-4*A*C; if(disc>=0){ const s=Math.sqrt(disc); const t1=(-B+s)/(2*A), t2=(-B-s)/(2*A); t=Math.max(t1,t2); if(t<0) t=Math.max(t1,t2);} }
    t=clamp(t,0,25); const ax=tgt.x+__state.lvx*t, ay=tgt.y+__state.lvy*t; const jitter=(((__state.tick*18+(tank.x*11+tank.y*7)|0)%9)-4)*0.16; tank.fire(toDeg(ax-tank.x,ay-tank.y)+jitter); __state.lastTgt={x:tgt.x,y:tgt.y}; }
  const P={edge:46, allySep:64, horizon:7, bulletRad:22, bulletWeight:0.11, etaW:0.16, minRange:170, maxRange:270, lowHpPad:34, finishHp:28, inertia:0.0022, edgeW:0.085, rangeInW:0.016, rangeOutW:0.011, orbit:22, fleeBias:12};
  if(tgt&&tgt.health<=P.finishHp){ P.minRange-=34; P.maxRange-=26; }
  if(tank.health<55) P.minRange+=P.lowHpPad;
  function riskForAngle(a){ const ar=toRad(a); const dx=Math.cos(ar)*SPEED, dy=Math.sin(ar)*SPEED; let risk=0; let px=tank.x, py=tank.y;
    for(let k=1;k<=P.horizon;k++){ px+=dx; py+=dy; if(px<P.edge||px>900-P.edge) risk+=(P.edge-Math.min(px,900-px))*P.edgeW; if(py<P.edge||py>600-P.edge) risk+=(P.edge-Math.min(py,600-py))*P.edgeW;
      for(const al of allies){ const d=H(px-al.x,py-al.y); if(d<P.allySep) risk+=(P.allySep-d)*0.03; }
      for(const b of bulletInfo){ const bx=b.x+b.vx*k, by=b.y+b.vy*k; const relx=px-bx, rely=py-by; const d=H(relx,rely); if(d<P.bulletRad){ const vmag=H(b.vx,b.vy)||1; const ux=b.vx/vmag, uy=b.vy/vmag; const along=dot(relx,rely,ux,uy); const eta=Math.max(0,-along)/BUL; const w=P.bulletWeight*(1+P.etaW*(P.horizon-k)); risk+=(P.bulletRad-d)*w*(1+0.18*Math.min(1,eta)); } }
      if(tgt){ const d=H(px-tgt.x,py-tgt.y); if(d<P.minRange) risk+=(P.minRange-d)*P.rangeInW; else if(d>P.maxRange) risk+=(d-P.maxRange)*P.rangeOutW; }
      for(const e of enemies){ const d=H(px-e.x,py-e.y); if(d<115) risk+=(115-d)*0.006; }
    }
    if(__state.lastMove!==undefined){ const da=Math.abs(((a-__state.lastMove)%360+540)%360-180); risk+=da*P.inertia; }
    return risk; }
  const cands=[]; const add=(ang)=>{ const k=norm(Math.round(ang)); if(!cands.includes(k)) cands.push(k); };
  if(tgt){ const base=toDeg(tgt.x-tank.x,tgt.y-tank.y); add(base); add(base+180); add(base+90+P.orbit*__state.spinBias); add(base-90-P.orbit*__state.spinBias); add(base+45*__state.spinBias); add(base-45*__state.spinBias); }
  let hot=null, md=1e9; for(const b of bulletInfo){ const dx=b.x-tank.x, dy=b.y-tank.y; const v=H(b.vx,b.vy)||1; const nx=b.vx/v, ny=b.vy/v; const proj=dx*nx+dy*ny; if(proj>0){ const px=b.x-proj*nx, py=b.y-proj*ny; const d=H(px-tank.x,py-tank.y); if(d<md){ md=d; hot=b; } } } if(hot){ const a=toDeg(hot.vx,hot.vy); add(a+90+P.fleeBias); add(a-90-P.fleeBias); add(a+120); add(a-120); }
  for(let s=0;s<360;s+=30) add(s);
  cands.sort((a,b)=>riskForAngle(a)-riskForAngle(b)); for(const a of cands){ if(tank.move(a)){ __state.lastMove=a; return; } } const fb=norm((__state.tick*37+tank.x+tank.y)|0); if(tank.move(fb)){ __state.lastMove=fb; return; }
}

