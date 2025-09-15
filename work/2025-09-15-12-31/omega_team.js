function name(){return "Omega T1";}
function type(){return Type.TANKER;}
let __state={tick:0,last:{x:0,y:0,key:null},lvx:0,lvy:0,lastMove:undefined};
function update(tank,enemies,allies,bulletInfo){
  "use strict";
  __state.tick=(__state.tick||0)+1;
  const toDeg=(x,y)=>Math.atan2(y,x)*180/Math.PI; const toRad=(a)=>a*Math.PI/180; const norm=(a)=>{a%=360; if(a<0)a+=360; return a|0;};
  const H=Math.hypot; const clamp=(v,lo,hi)=>v<lo?lo:v>hi?hi:v; const dot=(ax,ay,bx,by)=>ax*bx+ay*by;
  const SPEED=(tank.type===1?3:(tank.type===2?6:5)); const BUL=8;
  // Target: prioritize DEALER -> low HP -> distance
  let tgt=null; let best=1e9; for(const e of enemies){ const typeBias=(e.health<35? -40:0) + (e.size<=34? -20:0); const key=e.health*1.3+e.distance*0.12+typeBias; if(key<best){best=key; tgt=e;} }
  // Predictive aim (intercept)
  if(tgt){ const key=(tgt.x|0)+":"+(tgt.y|0); let vx=0,vy=0; if(__state.last.key===key){ vx=tgt.x-__state.last.x; vy=tgt.y-__state.last.y; }
    __state.lvx=__state.lvx*0.62+vx*0.38; __state.lvy=__state.lvy*0.62+vy*0.38; const rx=tgt.x-tank.x, ry=tgt.y-tank.y; const vv=__state.lvx*__state.lvx+__state.lvy*__state.lvy; const rr=rx*rx+ry*ry; const rv=rx*__state.lvx+ry*__state.lvy; const A=vv-BUL*BUL, B=2*rv, C=rr; let t=0; if(Math.abs(A)<1e-6){ t=(B!==0?-C/B:0);} else { const disc=B*B-4*A*C; if(disc>=0){ const s=Math.sqrt(disc); const t1=(-B+s)/(2*A), t2=(-B-s)/(2*A); t=Math.max(t1,t2); if(t<0) t=Math.max(t1,t2); } }
    t=clamp(t,0,28); const ax=tgt.x+__state.lvx*t, ay=tgt.y+__state.lvy*t; const jitter=(((__state.tick*13+tank.x*19+tank.y*7)|0)%7-3)*0.22; tank.fire(toDeg(ax-tank.x,ay-tank.y)+jitter); __state.last={x:tgt.x,y:tgt.y,key}; }
  const P={edge:52, allySep:68, horizon:8, bulletRad:22, bulletWeight:0.12, etaW:0.18, inertia:0.0022, edgeW:0.09, rangeInW:0.02, rangeOutW:0.012,
           minRange:(tank.type===1?180:240), maxRange:(tank.type===1?280:380), lowHpPad:(tank.type===1?40:56), finishHp:26, orbit:(tank.type===1?30:36), fleeBias:(tank.type===1?16:12)};
  if(tgt&&tgt.health<=P.finishHp){ P.minRange-=44; P.maxRange-=32; }
  if(tank.health<50) P.minRange+=P.lowHpPad;
  function riskForAngle(a){ const ar=toRad(a); const dx=Math.cos(ar)*SPEED, dy=Math.sin(ar)*SPEED; let risk=0; let px=tank.x, py=tank.y; for(let k=1;k<=P.horizon;k++){
      px+=dx; py+=dy;
      // edges
      if(px<P.edge||px>900-P.edge) risk+=(P.edge-Math.min(px,900-px))*P.edgeW*0.7; if(py<P.edge||py>600-P.edge) risk+=(P.edge-Math.min(py,600-py))*P.edgeW*0.7;
      // allies separation
      for(const al of allies){ const d=H(px-al.x,py-al.y); if(d<P.allySep) risk+=(P.allySep-d)*0.03; }
      // bullets danger
      for(const b of bulletInfo){ const bx=b.x+b.vx*k, by=b.y+b.vy*k; const relx=px-bx, rely=py-by; const d=H(relx,rely); if(d<P.bulletRad){ const vmag=H(b.vx,b.vy)||1; const ux=b.vx/vmag, uy=b.vy/vmag; const along=dot(relx,rely,ux,uy); const eta=Math.max(0,-along)/BUL; const w=P.bulletWeight*(1+P.etaW*(P.horizon-k)); risk+=(P.bulletRad-d)*w*(1+0.3*Math.min(1,eta)); } }
      // range fit
      if(tgt){ const d=H(px-tgt.x,py-tgt.y); if(d<P.minRange) risk+=(P.minRange-d)*P.rangeInW; else if(d>P.maxRange) risk+=(d-P.maxRange)*P.rangeOutW; }
    }
    if(__state.lastMove!==undefined){ const da=Math.abs(((a-__state.lastMove)%360+540)%360-180); risk+=da*P.inertia; }
    return risk; }
  const cands=[]; const add=(ang)=>{ const k=norm(Math.round(ang)); if(!cands.includes(k)) cands.push(k); };
  if(tgt){ const base=toDeg(tgt.x-tank.x,tgt.y-tank.y); add(base); add(base+180); add(base+90+P.orbit); add(base-90-P.orbit); add(base+45); add(base-45); }
  // Bullet-driven: perpendicular to hottest incoming
  let hot=null, bestScore=-1e9; for(const b of bulletInfo){ const dx=b.x-tank.x, dy=b.y-tank.y; const v=H(b.vx,b.vy)||1; const ux=b.vx/v, uy=b.vy/v; const proj=dx*ux+dy*uy; if(proj>0){ const px=b.x-proj*ux, py=b.y-proj*uy; const d=H(px-tank.x,py-tank.y); const score= proj/(1+d); if(score>bestScore){ bestScore=score; hot=b; } } }
  if(hot){ const a=toDeg(hot.vx,hot.vy); add(a+90+P.fleeBias); add(a-90-P.fleeBias); add(a+120); add(a-120); add(a+135); add(a-135); }
  for(let s=0;s<360;s+=24) add(s);
  cands.sort((a,b)=>riskForAngle(a)-riskForAngle(b));
  for(const a of cands){ if(tank.move(a)){ __state.lastMove=a; return; } }
  const fb=norm((__state.tick*41+tank.x+tank.y)|0); if(tank.move(fb)){ __state.lastMove=fb; return; }
}

// ===== 다음 로봇 =====

function name(){return "Omega T2";}
function type(){return Type.TANKER;}
let __state={tick:0,last:{x:0,y:0,key:null},lvx:0,lvy:0,lastMove:undefined};
function update(tank,enemies,allies,bulletInfo){
  "use strict";
  __state.tick=(__state.tick||0)+1; const toDeg=(x,y)=>Math.atan2(y,x)*180/Math.PI; const toRad=(a)=>a*Math.PI/180; const norm=(a)=>{a%=360; if(a<0)a+=360; return a|0;}; const H=Math.hypot; const clamp=(v,lo,hi)=>v<lo?lo:v>hi?hi:v; const dot=(ax,ay,bx,by)=>ax*bx+ay*by; const SPEED=(tank.type===1?3:(tank.type===2?6:5)); const BUL=8;
  let tgt=null; let best=1e9; for(const e of enemies){ const typeBias=(e.health<35? -38:0) + (e.size<=34? -22:0); const key=e.health*1.25+e.distance*0.11+typeBias; if(key<best){best=key; tgt=e;} }
  if(tgt){ const key=(tgt.x|0)+":"+(tgt.y|0); let vx=0,vy=0; if(__state.last.key===key){ vx=tgt.x-__state.last.x; vy=tgt.y-__state.last.y; } __state.lvx=__state.lvx*0.6+vx*0.4; __state.lvy=__state.lvy*0.6+vy*0.4; const rx=tgt.x-tank.x, ry=tgt.y-tank.y; const vv=__state.lvx*__state.lvx+__state.lvy*__state.lvy; const rr=rx*rx+ry*ry; const rv=rx*__state.lvx+ry*__state.lvy; const A=vv-BUL*BUL, B=2*rv, C=rr; let t=0; if(Math.abs(A)<1e-6){ t=(B!==0?-C/B:0);} else { const disc=B*B-4*A*C; if(disc>=0){ const s=Math.sqrt(disc); const t1=(-B+s)/(2*A), t2=(-B-s)/(2*A); t=Math.max(t1,t2); if(t<0) t=Math.max(t1,t2); } } t=clamp(t,0,28); const ax=tgt.x+__state.lvx*t, ay=tgt.y+__state.lvy*t; const jitter=(((__state.tick*17+tank.x*13+tank.y*5)|0)%7-3)*0.2; tank.fire(toDeg(ax-tank.x,ay-tank.y)+jitter); __state.last={x:tgt.x,y:tgt.y,key}; }
  const P={edge:52, allySep:68, horizon:8, bulletRad:22, bulletWeight:0.12, etaW:0.18, inertia:0.0022, edgeW:0.09, rangeInW:0.02, rangeOutW:0.012,
           minRange:(tank.type===1?180:240), maxRange:(tank.type===1?280:380), lowHpPad:(tank.type===1?40:56), finishHp:26, orbit:(tank.type===1?30:36), fleeBias:(tank.type===1?16:12)};
  if(tgt&&tgt.health<=P.finishHp){ P.minRange-=44; P.maxRange-=32; }
  if(tank.health<50) P.minRange+=P.lowHpPad;
  function riskForAngle(a){ const ar=toRad(a); const dx=Math.cos(ar)*SPEED, dy=Math.sin(ar)*SPEED; let risk=0; let px=tank.x, py=tank.y; for(let k=1;k<=P.horizon;k++){ px+=dx; py+=dy; if(px<P.edge||px>900-P.edge) risk+=(P.edge-Math.min(px,900-px))*P.edgeW*0.7; if(py<P.edge||py>600-P.edge) risk+=(P.edge-Math.min(py,600-py))*P.edgeW*0.7; for(const al of allies){ const d=H(px-al.x,py-al.y); if(d<P.allySep) risk+=(P.allySep-d)*0.03; } for(const b of bulletInfo){ const bx=b.x+b.vx*k, by=b.y+b.vy*k; const relx=px-bx, rely=py-by; const d=H(relx,rely); if(d<P.bulletRad){ const vmag=H(b.vx,b.vy)||1; const ux=b.vx/vmag, uy=b.vy/vmag; const along=dot(relx,rely,ux,uy); const eta=Math.max(0,-along)/BUL; const w=P.bulletWeight*(1+P.etaW*(P.horizon-k)); risk+=(P.bulletRad-d)*w*(1+0.3*Math.min(1,eta)); } } if(tgt){ const d=H(px-tgt.x,py-tgt.y); if(d<P.minRange) risk+=(P.minRange-d)*P.rangeInW; else if(d>P.maxRange) risk+=(d-P.maxRange)*P.rangeOutW; } } if(__state.lastMove!==undefined){ const da=Math.abs(((a-__state.lastMove)%360+540)%360-180); risk+=da*P.inertia; } return risk; }
  const cands=[]; const add=(ang)=>{ const k=norm(Math.round(ang)); if(!cands.includes(k)) cands.push(k); }; if(tgt){ const base=toDeg(tgt.x-tank.x,tgt.y-tank.y); add(base); add(base+180); add(base+90+P.orbit); add(base-90-P.orbit); add(base+45); add(base-45); }
  let hot=null, bestScore=-1e9; for(const b of bulletInfo){ const dx=b.x-tank.x, dy=b.y-tank.y; const v=H(b.vx,b.vy)||1; const ux=b.vx/v, uy=b.vy/v; const proj=dx*ux+dy*uy; if(proj>0){ const px=b.x-proj*ux, py=b.y-proj*uy; const d=H(px-tank.x,py-tank.y); const score= proj/(1+d); if(score>bestScore){ bestScore=score; hot=b; } } } if(hot){ const a=toDeg(hot.vx,hot.vy); add(a+90+P.fleeBias); add(a-90-P.fleeBias); add(a+120); add(a-120); add(a+135); add(a-135); }
  for(let s=0;s<360;s+=24) add(s); cands.sort((a,b)=>riskForAngle(a)-riskForAngle(b)); for(const a of cands){ if(tank.move(a)){ __state.lastMove=a; return; } } const fb=norm((__state.tick*43+tank.x+tank.y)|0); if(tank.move(fb)){ __state.lastMove=fb; return; }
}

// ===== 다음 로봇 =====

function name(){return "Omega D1";}
function type(){return Type.DEALER;}
let __state={tick:0,last:{x:0,y:0,key:null},lvx:0,lvy:0,lastMove:undefined};
function update(tank,enemies,allies,bulletInfo){
  "use strict"; __state.tick=(__state.tick||0)+1; const toDeg=(x,y)=>Math.atan2(y,x)*180/Math.PI; const toRad=(a)=>a*Math.PI/180; const norm=(a)=>{a%=360; if(a<0)a+=360; return a|0;}; const H=Math.hypot; const clamp=(v,lo,hi)=>v<lo?lo:v>hi?hi:v; const dot=(ax,ay,bx,by)=>ax*bx+ay*by; const SPEED=(tank.type===1?3:(tank.type===2?6:5)); const BUL=8;
  let tgt=null; let best=1e9; for(const e of enemies){ const typeBias=(e.health<35? -40:0) + (e.size<=34? -25:0); const key=e.health*1.28+e.distance*0.15+typeBias; if(key<best){best=key; tgt=e;} }
  if(tgt){ const key=(tgt.x|0)+":"+(tgt.y|0); let vx=0,vy=0; if(__state.last.key===key){ vx=tgt.x-__state.last.x; vy=tgt.y-__state.last.y; } __state.lvx=__state.lvx*0.62+vx*0.38; __state.lvy=__state.lvy*0.62+vy*0.38; const rx=tgt.x-tank.x, ry=tgt.y-tank.y; const vv=__state.lvx*__state.lvx+__state.lvy*__state.lvy; const rr=rx*rx+ry*ry; const rv=rx*__state.lvx+ry*__state.lvy; const A=vv-BUL*BUL, B=2*rv, C=rr; let t=0; if(Math.abs(A)<1e-6){ t=(B!==0?-C/B:0);} else { const disc=B*B-4*A*C; if(disc>=0){ const s=Math.sqrt(disc); const t1=(-B+s)/(2*A), t2=(-B-s)/(2*A); t=Math.max(t1,t2); if(t<0) t=Math.max(t1,t2); } } t=clamp(t,0,32); const ax=tgt.x+__state.lvx*t, ay=tgt.y+__state.lvy*t; const jitter=(((__state.tick*23+tank.x*17+tank.y*11)|0)%9-4)*0.17; tank.fire(toDeg(ax-tank.x,ay-tank.y)+jitter); __state.last={x:tgt.x,y:tgt.y,key}; }
  const P={edge:60, allySep:72, horizon:8, bulletRad:21, bulletWeight:0.11, etaW:0.22, inertia:0.002, edgeW:0.09, rangeInW:0.018, rangeOutW:0.011,
           minRange:260, maxRange:400, lowHpPad:60, finishHp:26, orbit:36, fleeBias:12};
  if(tgt&&tgt.health<=P.finishHp){ P.minRange-=44; P.maxRange-=32; }
  if(tank.health<45) P.minRange+=P.lowHpPad;
  function riskForAngle(a){ const ar=toRad(a); const dx=Math.cos(ar)*SPEED, dy=Math.sin(ar)*SPEED; let risk=0; let px=tank.x, py=tank.y; for(let k=1;k<=P.horizon;k++){ px+=dx; py+=dy; if(px<P.edge||px>900-P.edge) risk+=(P.edge-Math.min(px,900-px))*P.edgeW*0.6; if(py<P.edge||py>600-P.edge) risk+=(P.edge-Math.min(py,600-py))*P.edgeW*0.6; for(const al of allies){ const d=H(px-al.x,py-al.y); if(d<P.allySep) risk+=(P.allySep-d)*0.03; } for(const b of bulletInfo){ const bx=b.x+b.vx*k, by=b.y+b.vy*k; const relx=px-bx, rely=py-by; const d=H(relx,rely); if(d<P.bulletRad){ const vmag=H(b.vx,b.vy)||1; const ux=b.vx/vmag, uy=b.vy/vmag; const along=dot(relx,rely,ux,uy); const eta=Math.max(0,-along)/BUL; const w=P.bulletWeight*(1+P.etaW*(P.horizon-k)); risk+=(P.bulletRad-d)*w*(1+0.22*Math.min(1,eta)); } } if(tgt){ const d=H(px-tgt.x,py-tgt.y); if(d<P.minRange) risk+=(P.minRange-d)*P.rangeInW; else if(d>P.maxRange) risk+=(d-P.maxRange)*P.rangeOutW; } } if(__state.lastMove!==undefined){ const da=Math.abs(((a-__state.lastMove)%360+540)%360-180); risk+=da*P.inertia; } return risk; }
  const cands=[]; const add=(ang)=>{ const k=norm(Math.round(ang)); if(!cands.includes(k)) cands.push(k); }; if(tgt){ const base=toDeg(tgt.x-tank.x,tgt.y-tank.y); add(base); add(base+180); add(base+90+P.orbit); add(base-90-P.orbit); add(base+40); add(base-40); }
  let hot=null, bestScore=-1e9; for(const b of bulletInfo){ const dx=b.x-tank.x, dy=b.y-tank.y; const v=H(b.vx,b.vy)||1; const ux=b.vx/v, uy=b.vy/v; const proj=dx*ux+dy*uy; if(proj>0){ const px=b.x-proj*ux, py=b.y-proj*uy; const d=H(px-tank.x,py-tank.y); const score= proj/(1+d); if(score>bestScore){ bestScore=score; hot=b; } } } if(hot){ const a=toDeg(hot.vx,hot.vy); add(a+90+P.fleeBias); add(a-90-P.fleeBias); add(a+120); add(a-120); add(a+135); add(a-135); }
  for(let s=0;s<360;s+=24) add(s); cands.sort((a,b)=>riskForAngle(a)-riskForAngle(b)); for(const a of cands){ if(tank.move(a)){ __state.lastMove=a; return; } } const fb=norm((__state.tick*37+tank.x+tank.y)|0); if(tank.move(fb)){ __state.lastMove=fb; return; }
}

// ===== 다음 로봇 =====

function name(){return "Omega D2";}
function type(){return Type.DEALER;}
let __state={tick:0,last:{x:0,y:0,key:null},lvx:0,lvy:0,lastMove:undefined};
function update(tank,enemies,allies,bulletInfo){
  "use strict"; __state.tick=(__state.tick||0)+1; const toDeg=(x,y)=>Math.atan2(y,x)*180/Math.PI; const toRad=(a)=>a*Math.PI/180; const norm=(a)=>{a%=360; if(a<0)a+=360; return a|0;}; const H=Math.hypot; const clamp=(v,lo,hi)=>v<lo?lo:v>hi?hi:v; const dot=(ax,ay,bx,by)=>ax*bx+ay*by; const SPEED=(tank.type===1?3:(tank.type===2?6:5)); const BUL=8;
  let tgt=null; let best=1e9; for(const e of enemies){ const typeBias=(e.health<35? -40:0) + (e.size<=34? -25:0); const key=e.health*1.28+e.distance*0.15+typeBias; if(key<best){best=key; tgt=e;} }
  if(tgt){ const key=(tgt.x|0)+":"+(tgt.y|0); let vx=0,vy=0; if(__state.last.key===key){ vx=tgt.x-__state.last.x; vy=tgt.y-__state.last.y; } __state.lvx=__state.lvx*0.62+vx*0.38; __state.lvy=__state.lvy*0.62+vy*0.38; const rx=tgt.x-tank.x, ry=tgt.y-tank.y; const vv=__state.lvx*__state.lvx+__state.lvy*__state.lvy; const rr=rx*rx+ry*ry; const rv=rx*__state.lvx+ry*__state.lvy; const A=vv-BUL*BUL, B=2*rv, C=rr; let t=0; if(Math.abs(A)<1e-6){ t=(B!==0?-C/B:0);} else { const disc=B*B-4*A*C; if(disc>=0){ const s=Math.sqrt(disc); const t1=(-B+s)/(2*A), t2=(-B-s)/(2*A); t=Math.max(t1,t2); if(t<0) t=Math.max(t1,t2); } } t=clamp(t,0,32); const ax=tgt.x+__state.lvx*t, ay=tgt.y+__state.lvy*t; const jitter=(((__state.tick*29+tank.x*13+tank.y*9)|0)%9-4)*0.16; tank.fire(toDeg(ax-tank.x,ay-tank.y)+jitter); __state.last={x:tgt.x,y:tgt.y,key}; }
  const P={edge:60, allySep:72, horizon:8, bulletRad:21, bulletWeight:0.11, etaW:0.22, inertia:0.002, edgeW:0.09, rangeInW:0.018, rangeOutW:0.011,
           minRange:260, maxRange:400, lowHpPad:60, finishHp:26, orbit:36, fleeBias:12};
  if(tgt&&tgt.health<=P.finishHp){ P.minRange-=44; P.maxRange-=32; }
  if(tank.health<45) P.minRange+=P.lowHpPad;
  function riskForAngle(a){ const ar=toRad(a); const dx=Math.cos(ar)*SPEED, dy=Math.sin(ar)*SPEED; let risk=0; let px=tank.x, py=tank.y; for(let k=1;k<=P.horizon;k++){ px+=dx; py+=dy; if(px<P.edge||px>900-P.edge) risk+=(P.edge-Math.min(px,900-px))*P.edgeW*0.6; if(py<P.edge||py>600-P.edge) risk+=(P.edge-Math.min(py,600-py))*P.edgeW*0.6; for(const al of allies){ const d=H(px-al.x,py-al.y); if(d<P.allySep) risk+=(P.allySep-d)*0.03; } for(const b of bulletInfo){ const bx=b.x+b.vx*k, by=b.y+b.vy*k; const relx=px-bx, rely=py-by; const d=H(relx,rely); if(d<P.bulletRad){ const vmag=H(b.vx,b.vy)||1; const ux=b.vx/vmag, uy=b.vy/vmag; const along=dot(relx,rely,ux,uy); const eta=Math.max(0,-along)/BUL; const w=P.bulletWeight*(1+P.etaW*(P.horizon-k)); risk+=(P.bulletRad-d)*w*(1+0.22*Math.min(1,eta)); } } if(tgt){ const d=H(px-tgt.x,py-tgt.y); if(d<P.minRange) risk+=(P.minRange-d)*P.rangeInW; else if(d>P.maxRange) risk+=(d-P.maxRange)*P.rangeOutW; } } if(__state.lastMove!==undefined){ const da=Math.abs(((a-__state.lastMove)%360+540)%360-180); risk+=da*P.inertia; } return risk; }
  const cands=[]; const add=(ang)=>{ const k=norm(Math.round(ang)); if(!cands.includes(k)) cands.push(k); }; if(tgt){ const base=toDeg(tgt.x-tank.x,tgt.y-tank.y); add(base); add(base+180); add(base+90+P.orbit); add(base-90-P.orbit); add(base+40); add(base-40); }
  let hot=null, bestScore=-1e9; for(const b of bulletInfo){ const dx=b.x-tank.x, dy=b.y-tank.y; const v=H(b.vx,b.vy)||1; const ux=b.vx/v, uy=b.vy/v; const proj=dx*ux+dy*uy; if(proj>0){ const px=b.x-proj*ux, py=b.y-proj*uy; const d=H(px-tank.x,py-tank.y); const score= proj/(1+d); if(score>bestScore){ bestScore=score; hot=b; } } } if(hot){ const a=toDeg(hot.vx,hot.vy); add(a+90+P.fleeBias); add(a-90-P.fleeBias); add(a+120); add(a-120); add(a+135); add(a-135); }
  for(let s=0;s<360;s+=24) add(s); cands.sort((a,b)=>riskForAngle(a)-riskForAngle(b)); for(const a of cands){ if(tank.move(a)){ __state.lastMove=a; return; } } const fb=norm((__state.tick*35+tank.x+tank.y)|0); if(tank.move(fb)){ __state.lastMove=fb; return; }
}

// ===== 다음 로봇 =====

function name(){return "Omega D3";}
function type(){return Type.DEALER;}
let __state={tick:0,last:{x:0,y:0,key:null},lvx:0,lvy:0,lastMove:undefined};
function update(tank,enemies,allies,bulletInfo){
  "use strict"; __state.tick=(__state.tick||0)+1; const toDeg=(x,y)=>Math.atan2(y,x)*180/Math.PI; const toRad=(a)=>a*Math.PI/180; const norm=(a)=>{a%=360; if(a<0)a+=360; return a|0;}; const H=Math.hypot; const clamp=(v,lo,hi)=>v<lo?lo:v>hi?hi:v; const dot=(ax,ay,bx,by)=>ax*bx+ay*by; const SPEED=(tank.type===1?3:(tank.type===2?6:5)); const BUL=8;
  let tgt=null; let best=1e9; for(const e of enemies){ const typeBias=(e.health<35? -40:0) + (e.size<=34? -25:0); const key=e.health*1.28+e.distance*0.15+typeBias; if(key<best){best=key; tgt=e;} }
  if(tgt){ const key=(tgt.x|0)+":"+(tgt.y|0); let vx=0,vy=0; if(__state.last.key===key){ vx=tgt.x-__state.last.x; vy=tgt.y-__state.last.y; } __state.lvx=__state.lvx*0.62+vx*0.38; __state.lvy=__state.lvy*0.62+vy*0.38; const rx=tgt.x-tank.x, ry=tgt.y-tank.y; const vv=__state.lvx*__state.lvx+__state.lvy*__state.lvy; const rr=rx*rx+ry*ry; const rv=rx*__state.lvx+ry*__state.lvy; const A=vv-BUL*BUL, B=2*rv, C=rr; let t=0; if(Math.abs(A)<1e-6){ t=(B!==0?-C/B:0);} else { const disc=B*B-4*A*C; if(disc>=0){ const s=Math.sqrt(disc); const t1=(-B+s)/(2*A), t2=(-B-s)/(2*A); t=Math.max(t1,t2); if(t<0) t=Math.max(t1,t2); } } t=clamp(t,0,32); const ax=tgt.x+__state.lvx*t, ay=tgt.y+__state.lvy*t; const jitter=(((__state.tick*31+tank.x*19+tank.y*7)|0)%9-4)*0.15; tank.fire(toDeg(ax-tank.x,ay-tank.y)+jitter); __state.last={x:tgt.x,y:tgt.y,key}; }
  const P={edge:60, allySep:72, horizon:8, bulletRad:21, bulletWeight:0.11, etaW:0.22, inertia:0.002, edgeW:0.09, rangeInW:0.018, rangeOutW:0.011,
           minRange:260, maxRange:400, lowHpPad:60, finishHp:26, orbit:36, fleeBias:12};
  if(tgt&&tgt.health<=P.finishHp){ P.minRange-=44; P.maxRange-=32; }
  if(tank.health<45) P.minRange+=P.lowHpPad;
  function riskForAngle(a){ const ar=toRad(a); const dx=Math.cos(ar)*SPEED, dy=Math.sin(ar)*SPEED; let risk=0; let px=tank.x, py=tank.y; for(let k=1;k<=P.horizon;k++){ px+=dx; py+=dy; if(px<P.edge||px>900-P.edge) risk+=(P.edge-Math.min(px,900-px))*P.edgeW*0.6; if(py<P.edge||py>600-P.edge) risk+=(P.edge-Math.min(py,600-py))*P.edgeW*0.6; for(const al of allies){ const d=H(px-al.x,py-al.y); if(d<P.allySep) risk+=(P.allySep-d)*0.03; } for(const b of bulletInfo){ const bx=b.x+b.vx*k, by=b.y+b.vy*k; const relx=px-bx, rely=py-by; const d=H(relx,rely); if(d<P.bulletRad){ const vmag=H(b.vx,b.vy)||1; const ux=b.vx/vmag, uy=b.vy/vmag; const along=dot(relx,rely,ux,uy); const eta=Math.max(0,-along)/BUL; const w=P.bulletWeight*(1+P.etaW*(P.horizon-k)); risk+=(P.bulletRad-d)*w*(1+0.22*Math.min(1,eta)); } } if(tgt){ const d=H(px-tgt.x,py-tgt.y); if(d<P.minRange) risk+=(P.minRange-d)*P.rangeInW; else if(d>P.maxRange) risk+=(d-P.maxRange)*P.rangeOutW; } } if(__state.lastMove!==undefined){ const da=Math.abs(((a-__state.lastMove)%360+540)%360-180); risk+=da*P.inertia; } return risk; }
  const cands=[]; const add=(ang)=>{ const k=norm(Math.round(ang)); if(!cands.includes(k)) cands.push(k); }; if(tgt){ const base=toDeg(tgt.x-tank.x,tgt.y-tank.y); add(base); add(base+180); add(base+90+P.orbit); add(base-90-P.orbit); add(base+40); add(base-40); }
  let hot=null, bestScore=-1e9; for(const b of bulletInfo){ const dx=b.x-tank.x, dy=b.y-tank.y; const v=H(b.vx,b.vy)||1; const ux=b.vx/v, uy=b.vy/v; const proj=dx*ux+dy*uy; if(proj>0){ const px=b.x-proj*ux, py=b.y-proj*uy; const d=H(px-tank.x,py-tank.y); const score= proj/(1+d); if(score>bestScore){ bestScore=score; hot=b; } } } if(hot){ const a=toDeg(hot.vx,hot.vy); add(a+90+P.fleeBias); add(a-90-P.fleeBias); add(a+120); add(a-120); add(a+135); add(a-135); }
  for(let s=0;s<360;s+=24) add(s); cands.sort((a,b)=>riskForAngle(a)-riskForAngle(b)); for(const a of cands){ if(tank.move(a)){ __state.lastMove=a; return; } } const fb=norm((__state.tick*33+tank.x+tank.y)|0); if(tank.move(fb)){ __state.lastMove=fb; return; }
}

// ===== 다음 로봇 =====

function name(){return "Omega D4";}
function type(){return Type.DEALER;}
let __state={tick:0,last:{x:0,y:0,key:null},lvx:0,lvy:0,lastMove:undefined};
function update(tank,enemies,allies,bulletInfo){
  "use strict"; __state.tick=(__state.tick||0)+1; const toDeg=(x,y)=>Math.atan2(y,x)*180/Math.PI; const toRad=(a)=>a*Math.PI/180; const norm=(a)=>{a%=360; if(a<0)a+=360; return a|0;}; const H=Math.hypot; const clamp=(v,lo,hi)=>v<lo?lo:v>hi?hi:v; const dot=(ax,ay,bx,by)=>ax*bx+ay*by; const SPEED=(tank.type===1?3:(tank.type===2?6:5)); const BUL=8;
  let tgt=null; let best=1e9; for(const e of enemies){ const typeBias=(e.health<35? -40:0) + (e.size<=34? -25:0); const key=e.health*1.28+e.distance*0.15+typeBias; if(key<best){best=key; tgt=e;} }
  if(tgt){ const key=(tgt.x|0)+":"+(tgt.y|0); let vx=0,vy=0; if(__state.last.key===key){ vx=tgt.x-__state.last.x; vy=tgt.y-__state.last.y; } __state.lvx=__state.lvx*0.62+vx*0.38; __state.lvy=__state.lvy*0.62+vy*0.38; const rx=tgt.x-tank.x, ry=tgt.y-tank.y; const vv=__state.lvx*__state.lvx+__state.lvy*__state.lvy; const rr=rx*rx+ry*ry; const rv=rx*__state.lvx+ry*__state.lvy; const A=vv-BUL*BUL, B=2*rv, C=rr; let t=0; if(Math.abs(A)<1e-6){ t=(B!==0?-C/B:0);} else { const disc=B*B-4*A*C; if(disc>=0){ const s=Math.sqrt(disc); const t1=(-B+s)/(2*A), t2=(-B-s)/(2*A); t=Math.max(t1,t2); if(t<0) t=Math.max(t1,t2); } } t=clamp(t,0,32); const ax=tgt.x+__state.lvx*t, ay=tgt.y+__state.lvy*t; const jitter=(((__state.tick*27+tank.x*19+tank.y*13)|0)%9-4)*0.15; tank.fire(toDeg(ax-tank.x,ay-tank.y)+jitter); __state.last={x:tgt.x,y:tgt.y,key}; }
  const P={edge:60, allySep:72, horizon:8, bulletRad:21, bulletWeight:0.11, etaW:0.22, inertia:0.002, edgeW:0.09, rangeInW:0.018, rangeOutW:0.011,
           minRange:260, maxRange:400, lowHpPad:60, finishHp:26, orbit:36, fleeBias:12};
  if(tgt&&tgt.health<=P.finishHp){ P.minRange-=44; P.maxRange-=32; }
  if(tank.health<45) P.minRange+=P.lowHpPad;
  function riskForAngle(a){ const ar=toRad(a); const dx=Math.cos(ar)*SPEED, dy=Math.sin(ar)*SPEED; let risk=0; let px=tank.x, py=tank.y; for(let k=1;k<=P.horizon;k++){ px+=dx; py+=dy; if(px<P.edge||px>900-P.edge) risk+=(P.edge-Math.min(px,900-px))*P.edgeW*0.6; if(py<P.edge||py>600-P.edge) risk+=(P.edge-Math.min(py,600-py))*P.edgeW*0.6; for(const al of allies){ const d=H(px-al.x,py-al.y); if(d<P.allySep) risk+=(P.allySep-d)*0.03; } for(const b of bulletInfo){ const bx=b.x+b.vx*k, by=b.y+b.vy*k; const relx=px-bx, rely=py-by; const d=H(relx,rely); if(d<P.bulletRad){ const vmag=H(b.vx,b.vy)||1; const ux=b.vx/vmag, uy=b.vy/vmag; const along=dot(relx,rely,ux,uy); const eta=Math.max(0,-along)/BUL; const w=P.bulletWeight*(1+P.etaW*(P.horizon-k)); risk+=(P.bulletRad-d)*w*(1+0.22*Math.min(1,eta)); } } if(tgt){ const d=H(px-tgt.x,py-tgt.y); if(d<P.minRange) risk+=(P.minRange-d)*P.rangeInW; else if(d>P.maxRange) risk+=(d-P.maxRange)*P.rangeOutW; } } if(__state.lastMove!==undefined){ const da=Math.abs(((a-__state.lastMove)%360+540)%360-180); risk+=da*P.inertia; } return risk; }
  const cands=[]; const add=(ang)=>{ const k=norm(Math.round(ang)); if(!cands.includes(k)) cands.push(k); }; if(tgt){ const base=toDeg(tgt.x-tank.x,tgt.y-tank.y); add(base); add(base+180); add(base+90+P.orbit); add(base-90-P.orbit); add(base+40); add(base-40); }
  let hot=null, bestScore=-1e9; for(const b of bulletInfo){ const dx=b.x-tank.x, dy=b.y-tank.y; const v=H(b.vx,b.vy)||1; const ux=b.vx/v, uy=b.vy/v; const proj=dx*ux+dy*uy; if(proj>0){ const px=b.x-proj*ux, py=b.y-proj*uy; const d=H(px-tank.x,py-tank.y); const score= proj/(1+d); if(score>bestScore){ bestScore=score; hot=b; } } } if(hot){ const a=toDeg(hot.vx,hot.vy); add(a+90+P.fleeBias); add(a-90-P.fleeBias); add(a+120); add(a-120); add(a+135); add(a-135); }
  for(let s=0;s<360;s+=24) add(s); cands.sort((a,b)=>riskForAngle(a)-riskForAngle(b)); for(const a of cands){ if(tank.move(a)){ __state.lastMove=a; return; } } const fb=norm((__state.tick*31+tank.x+tank.y)|0); if(tank.move(fb)){ __state.lastMove=fb; return; }
}
