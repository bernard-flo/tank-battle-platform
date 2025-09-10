function name(){return "HeliosX-T1";}
function type(){return Type.TANKER;}
let __s_0={last:null,tick:0,lastVel:null,side:((0*17)%2?1:-1)};
function update(tank,enemies,allies,bulletInfo){
const H=Math.hypot,D=(x,y)=>Math.atan2(y,x)*180/Math.PI,N=(a)=>{a%=360;if(a<0)a+=360;return a;},CL=(v,l,h)=>v<l?l:v>h?h:v;
const P={"rMin":170.118,"rMax":278.134,"strafe":20.788,"threatR":201.036,"threatH":4.091,"fleeBias":18.113,"sep":79.446,"edge":52.185,"leadCap":19.854,"leadW":1.192,"aimJitter":0.094,"aimBias":-0.038,"healthW":1.054,"distW":0.307,"finisherHP":24.264,"aggrRemain":2.898,"aggrIn":25.649,"aggrOut":21.044,"prefDealer":1.191,"prefNormal":-0.015,"bias":-8.113}; const S=__s_0; S.tick=(S.tick||0)+1;
let tgt=null,best=1e18; for(const e of enemies){ const tw=(e.health<=P.finisherHP?-80:0)+(P.prefDealer?(e.type===2?-10:0):0)+(P.prefNormal?(e.type===0?-6:0):0); const k=e.health*P.healthW+e.distance*P.distW+(e.x+e.y)*(P.tieBias||0)+tw; if(k<best){best=k;tgt=e;} }
if(tgt){ let ax=tgt.x,ay=tgt.y,vx=0,vy=0; if(S.last){ const lvx=S.lastVel?S.lastVel.vx:0,lvy=S.lastVel?S.lastVel.vy:0; const ivx=(tgt.x-S.last.x),ivy=(tgt.y-S.last.y); vx=lvx*0.5+ivx*0.5; vy=lvy*0.5+ivy*0.5; S.lastVel={vx,vy}; const rx=tgt.x-tank.x,ry=tgt.y-tank.y,s2=64; const aa=vx*vx+vy*vy-s2,bb=2*(rx*vx+ry*vy),cc=rx*rx+ry*ry; let tHit=0; if(Math.abs(aa)<1e-6){ tHit=bb!==0?CL(-cc/bb,0,P.leadCap):0; } else { const disc=bb*bb-4*aa*cc; if(disc>=0){ const sd=Math.sqrt(disc),t1=(-bb-sd)/(2*aa),t2=(-bb+sd)/(2*aa); const tc=t1>0&&t2>0?Math.min(t1,t2):(t1>0?t1:(t2>0?t2:0)); tHit=CL(tc,0,P.leadCap);} } ax=tgt.x+vx*P.leadW*tHit; ay=tgt.y+vy*P.leadW*tHit; } const jitter=(((S.tick*13+tank.x*7+tank.y*3+0*11)%23)-11)*0.07*(P.aimJitter||0)+(P.aimBias||0); tank.fire(D(ax-tank.x,ay-tank.y)+jitter); S.last={x:tgt.x,y:tgt.y}; }
let moved=0; const go=(a)=>{ if(moved>20) return true; moved++; return tank.move(N(a)); };
let hot=null,score=1e18; for(const b of bulletInfo){ const dx=b.x-tank.x,dy=b.y-tank.y; const v=H(b.vx,b.vy)||1; const nx=b.vx/v,ny=b.vy/v; const proj=dx*nx+dy*ny; if(proj>0){ const px=b.x-proj*nx,py=b.y-proj*ny; const dist=H(px-tank.x,py-tank.y); const tt=proj/v; const s=dist+tt*(P.threatH||4); if(dist<P.threatR && s<score){ score=s; hot=b; } } }
if(hot){ const a=D(hot.vx,hot.vy); const side=(S.side||1)*P.fleeBias+(P.bias||0)*0.5; for(const c of [a+90+side,a-90-side,a+120,a-120,a+70,a-70,a+150,a-150]){ if(go(c)) return; } }
if(tank.x<P.edge){ if(go(0)) return;} if(tank.x>900-P.edge){ if(go(180)) return;} if(tank.y<P.edge){ if(go(90)) return;} if(tank.y>600-P.edge){ if(go(270)) return;}
let near=null,ad=1e18; for(const a of allies){ if(a.distance<ad){ ad=a.distance; near=a; } } if(near && ad<P.sep){ const away=D(tank.x-near.x,tank.y-near.y); if(go(away)) return; if(go(away+18)) return; if(go(away-18)) return; }
if(tgt){ const to=D(tgt.x-tank.x,tgt.y-tank.y), d=tgt.distance; let r0=P.rMin,r1=P.rMax; if((tgt.health<=P.finisherHP)||enemies.length<=P.aggrRemain){ r0=Math.max(120,r0-(P.aggrIn||30)); r1=Math.max(160,r1-(P.aggrOut||20)); } if(d<r0){ const aw=to+180+(P.bias||0)*0.4; if(go(aw)) return; if(go(aw+16)) return; if(go(aw-16)) return; } else if(d>r1){ if(go(to)) return; if(go(to+14)) return; if(go(to-14)) return; } else { const s=to+((S.side||1)*P.strafe)+(P.bias||0)*0.5; if(go(s)) return; if(go(s+16)) return; if(go(s-16)) return; } }
for(const s of [0,60,120,180,240,300]){ if(go(s+(P.bias||0))) return; } }

// ===== 다음 로봇 =====

function name(){return "HeliosX-D2";}
function type(){return Type.DEALER;}
let __s_1={last:null,tick:0,lastVel:null,side:((1*17)%2?1:-1)};
function update(tank,enemies,allies,bulletInfo){
const H=Math.hypot,D=(x,y)=>Math.atan2(y,x)*180/Math.PI,N=(a)=>{a%=360;if(a<0)a+=360;return a;},CL=(v,l,h)=>v<l?l:v>h?h:v;
const P={"rMin":232.868,"rMax":325.054,"strafe":31.37,"threatR":190.029,"threatH":4.904,"fleeBias":15.996,"sep":58.696,"edge":58.193,"leadCap":23.074,"leadW":1.271,"aimJitter":0.124,"aimBias":-0.26,"healthW":1.241,"distW":0.016,"finisherHP":15.821,"aggrRemain":1.963,"aggrIn":31.725,"aggrOut":27.821,"prefDealer":0.915,"prefNormal":0.043,"bias":-5.952}; const S=__s_1; S.tick=(S.tick||0)+1;
let tgt=null,best=1e18; for(const e of enemies){ const tw=(e.health<=P.finisherHP?-80:0)+(P.prefDealer?(e.type===2?-10:0):0)+(P.prefNormal?(e.type===0?-6:0):0); const k=e.health*P.healthW+e.distance*P.distW+(e.x+e.y)*(P.tieBias||0)+tw; if(k<best){best=k;tgt=e;} }
if(tgt){ let ax=tgt.x,ay=tgt.y,vx=0,vy=0; if(S.last){ const lvx=S.lastVel?S.lastVel.vx:0,lvy=S.lastVel?S.lastVel.vy:0; const ivx=(tgt.x-S.last.x),ivy=(tgt.y-S.last.y); vx=lvx*0.5+ivx*0.5; vy=lvy*0.5+ivy*0.5; S.lastVel={vx,vy}; const rx=tgt.x-tank.x,ry=tgt.y-tank.y,s2=64; const aa=vx*vx+vy*vy-s2,bb=2*(rx*vx+ry*vy),cc=rx*rx+ry*ry; let tHit=0; if(Math.abs(aa)<1e-6){ tHit=bb!==0?CL(-cc/bb,0,P.leadCap):0; } else { const disc=bb*bb-4*aa*cc; if(disc>=0){ const sd=Math.sqrt(disc),t1=(-bb-sd)/(2*aa),t2=(-bb+sd)/(2*aa); const tc=t1>0&&t2>0?Math.min(t1,t2):(t1>0?t1:(t2>0?t2:0)); tHit=CL(tc,0,P.leadCap);} } ax=tgt.x+vx*P.leadW*tHit; ay=tgt.y+vy*P.leadW*tHit; } const jitter=(((S.tick*13+tank.x*7+tank.y*3+1*11)%23)-11)*0.07*(P.aimJitter||0)+(P.aimBias||0); tank.fire(D(ax-tank.x,ay-tank.y)+jitter); S.last={x:tgt.x,y:tgt.y}; }
let moved=0; const go=(a)=>{ if(moved>20) return true; moved++; return tank.move(N(a)); };
let hot=null,score=1e18; for(const b of bulletInfo){ const dx=b.x-tank.x,dy=b.y-tank.y; const v=H(b.vx,b.vy)||1; const nx=b.vx/v,ny=b.vy/v; const proj=dx*nx+dy*ny; if(proj>0){ const px=b.x-proj*nx,py=b.y-proj*ny; const dist=H(px-tank.x,py-tank.y); const tt=proj/v; const s=dist+tt*(P.threatH||4); if(dist<P.threatR && s<score){ score=s; hot=b; } } }
if(hot){ const a=D(hot.vx,hot.vy); const side=(S.side||1)*P.fleeBias+(P.bias||0)*0.5; for(const c of [a+90+side,a-90-side,a+120,a-120,a+70,a-70,a+150,a-150]){ if(go(c)) return; } }
if(tank.x<P.edge){ if(go(0)) return;} if(tank.x>900-P.edge){ if(go(180)) return;} if(tank.y<P.edge){ if(go(90)) return;} if(tank.y>600-P.edge){ if(go(270)) return;}
let near=null,ad=1e18; for(const a of allies){ if(a.distance<ad){ ad=a.distance; near=a; } } if(near && ad<P.sep){ const away=D(tank.x-near.x,tank.y-near.y); if(go(away)) return; if(go(away+18)) return; if(go(away-18)) return; }
if(tgt){ const to=D(tgt.x-tank.x,tgt.y-tank.y), d=tgt.distance; let r0=P.rMin,r1=P.rMax; if((tgt.health<=P.finisherHP)||enemies.length<=P.aggrRemain){ r0=Math.max(120,r0-(P.aggrIn||30)); r1=Math.max(160,r1-(P.aggrOut||20)); } if(d<r0){ const aw=to+180+(P.bias||0)*0.4; if(go(aw)) return; if(go(aw+16)) return; if(go(aw-16)) return; } else if(d>r1){ if(go(to)) return; if(go(to+14)) return; if(go(to-14)) return; } else { const s=to+((S.side||1)*P.strafe)+(P.bias||0)*0.5; if(go(s)) return; if(go(s+16)) return; if(go(s-16)) return; } }
for(const s of [0,60,120,180,240,300]){ if(go(s+(P.bias||0))) return; } }

// ===== 다음 로봇 =====

function name(){return "HeliosX-N3";}
function type(){return Type.NORMAL;}
let __s_2={last:null,tick:0,lastVel:null,side:((2*17)%2?1:-1)};
function update(tank,enemies,allies,bulletInfo){
const H=Math.hypot,D=(x,y)=>Math.atan2(y,x)*180/Math.PI,N=(a)=>{a%=360;if(a<0)a+=360;return a;},CL=(v,l,h)=>v<l?l:v>h?h:v;
const P={"rMin":204.797,"rMax":311.458,"strafe":27.095,"threatR":183.773,"threatH":3.944,"fleeBias":15.821,"sep":65.292,"edge":52.585,"leadCap":21.065,"leadW":1.133,"aimJitter":0.181,"aimBias":0.001,"healthW":1.147,"distW":0.279,"finisherHP":21.018,"aggrRemain":2.884,"aggrIn":23.445,"aggrOut":16.969,"prefDealer":1.008,"prefNormal":0.94,"bias":-3.99}; const S=__s_2; S.tick=(S.tick||0)+1;
let tgt=null,best=1e18; for(const e of enemies){ const tw=(e.health<=P.finisherHP?-80:0)+(P.prefDealer?(e.type===2?-10:0):0)+(P.prefNormal?(e.type===0?-6:0):0); const k=e.health*P.healthW+e.distance*P.distW+(e.x+e.y)*(P.tieBias||0)+tw; if(k<best){best=k;tgt=e;} }
if(tgt){ let ax=tgt.x,ay=tgt.y,vx=0,vy=0; if(S.last){ const lvx=S.lastVel?S.lastVel.vx:0,lvy=S.lastVel?S.lastVel.vy:0; const ivx=(tgt.x-S.last.x),ivy=(tgt.y-S.last.y); vx=lvx*0.5+ivx*0.5; vy=lvy*0.5+ivy*0.5; S.lastVel={vx,vy}; const rx=tgt.x-tank.x,ry=tgt.y-tank.y,s2=64; const aa=vx*vx+vy*vy-s2,bb=2*(rx*vx+ry*vy),cc=rx*rx+ry*ry; let tHit=0; if(Math.abs(aa)<1e-6){ tHit=bb!==0?CL(-cc/bb,0,P.leadCap):0; } else { const disc=bb*bb-4*aa*cc; if(disc>=0){ const sd=Math.sqrt(disc),t1=(-bb-sd)/(2*aa),t2=(-bb+sd)/(2*aa); const tc=t1>0&&t2>0?Math.min(t1,t2):(t1>0?t1:(t2>0?t2:0)); tHit=CL(tc,0,P.leadCap);} } ax=tgt.x+vx*P.leadW*tHit; ay=tgt.y+vy*P.leadW*tHit; } const jitter=(((S.tick*13+tank.x*7+tank.y*3+2*11)%23)-11)*0.07*(P.aimJitter||0)+(P.aimBias||0); tank.fire(D(ax-tank.x,ay-tank.y)+jitter); S.last={x:tgt.x,y:tgt.y}; }
let moved=0; const go=(a)=>{ if(moved>20) return true; moved++; return tank.move(N(a)); };
let hot=null,score=1e18; for(const b of bulletInfo){ const dx=b.x-tank.x,dy=b.y-tank.y; const v=H(b.vx,b.vy)||1; const nx=b.vx/v,ny=b.vy/v; const proj=dx*nx+dy*ny; if(proj>0){ const px=b.x-proj*nx,py=b.y-proj*ny; const dist=H(px-tank.x,py-tank.y); const tt=proj/v; const s=dist+tt*(P.threatH||4); if(dist<P.threatR && s<score){ score=s; hot=b; } } }
if(hot){ const a=D(hot.vx,hot.vy); const side=(S.side||1)*P.fleeBias+(P.bias||0)*0.5; for(const c of [a+90+side,a-90-side,a+120,a-120,a+70,a-70,a+150,a-150]){ if(go(c)) return; } }
if(tank.x<P.edge){ if(go(0)) return;} if(tank.x>900-P.edge){ if(go(180)) return;} if(tank.y<P.edge){ if(go(90)) return;} if(tank.y>600-P.edge){ if(go(270)) return;}
let near=null,ad=1e18; for(const a of allies){ if(a.distance<ad){ ad=a.distance; near=a; } } if(near && ad<P.sep){ const away=D(tank.x-near.x,tank.y-near.y); if(go(away)) return; if(go(away+18)) return; if(go(away-18)) return; }
if(tgt){ const to=D(tgt.x-tank.x,tgt.y-tank.y), d=tgt.distance; let r0=P.rMin,r1=P.rMax; if((tgt.health<=P.finisherHP)||enemies.length<=P.aggrRemain){ r0=Math.max(120,r0-(P.aggrIn||30)); r1=Math.max(160,r1-(P.aggrOut||20)); } if(d<r0){ const aw=to+180+(P.bias||0)*0.4; if(go(aw)) return; if(go(aw+16)) return; if(go(aw-16)) return; } else if(d>r1){ if(go(to)) return; if(go(to+14)) return; if(go(to-14)) return; } else { const s=to+((S.side||1)*P.strafe)+(P.bias||0)*0.5; if(go(s)) return; if(go(s+16)) return; if(go(s-16)) return; } }
for(const s of [0,60,120,180,240,300]){ if(go(s+(P.bias||0))) return; } }

// ===== 다음 로봇 =====

function name(){return "HeliosX-N4";}
function type(){return Type.NORMAL;}
let __s_3={last:null,tick:0,lastVel:null,side:((3*17)%2?1:-1)};
function update(tank,enemies,allies,bulletInfo){
const H=Math.hypot,D=(x,y)=>Math.atan2(y,x)*180/Math.PI,N=(a)=>{a%=360;if(a<0)a+=360;return a;},CL=(v,l,h)=>v<l?l:v>h?h:v;
const P={"rMin":204.797,"rMax":311.458,"strafe":27.095,"threatR":183.773,"threatH":3.944,"fleeBias":15.821,"sep":65.292,"edge":52.585,"leadCap":21.065,"leadW":1.133,"aimJitter":0.181,"aimBias":0.001,"healthW":1.147,"distW":0.279,"finisherHP":21.018,"aggrRemain":2.884,"aggrIn":23.445,"aggrOut":16.969,"prefDealer":1.008,"prefNormal":0.94,"bias":8.01}; const S=__s_3; S.tick=(S.tick||0)+1;
let tgt=null,best=1e18; for(const e of enemies){ const tw=(e.health<=P.finisherHP?-80:0)+(P.prefDealer?(e.type===2?-10:0):0)+(P.prefNormal?(e.type===0?-6:0):0); const k=e.health*P.healthW+e.distance*P.distW+(e.x+e.y)*(P.tieBias||0)+tw; if(k<best){best=k;tgt=e;} }
if(tgt){ let ax=tgt.x,ay=tgt.y,vx=0,vy=0; if(S.last){ const lvx=S.lastVel?S.lastVel.vx:0,lvy=S.lastVel?S.lastVel.vy:0; const ivx=(tgt.x-S.last.x),ivy=(tgt.y-S.last.y); vx=lvx*0.5+ivx*0.5; vy=lvy*0.5+ivy*0.5; S.lastVel={vx,vy}; const rx=tgt.x-tank.x,ry=tgt.y-tank.y,s2=64; const aa=vx*vx+vy*vy-s2,bb=2*(rx*vx+ry*vy),cc=rx*rx+ry*ry; let tHit=0; if(Math.abs(aa)<1e-6){ tHit=bb!==0?CL(-cc/bb,0,P.leadCap):0; } else { const disc=bb*bb-4*aa*cc; if(disc>=0){ const sd=Math.sqrt(disc),t1=(-bb-sd)/(2*aa),t2=(-bb+sd)/(2*aa); const tc=t1>0&&t2>0?Math.min(t1,t2):(t1>0?t1:(t2>0?t2:0)); tHit=CL(tc,0,P.leadCap);} } ax=tgt.x+vx*P.leadW*tHit; ay=tgt.y+vy*P.leadW*tHit; } const jitter=(((S.tick*13+tank.x*7+tank.y*3+3*11)%23)-11)*0.07*(P.aimJitter||0)+(P.aimBias||0); tank.fire(D(ax-tank.x,ay-tank.y)+jitter); S.last={x:tgt.x,y:tgt.y}; }
let moved=0; const go=(a)=>{ if(moved>20) return true; moved++; return tank.move(N(a)); };
let hot=null,score=1e18; for(const b of bulletInfo){ const dx=b.x-tank.x,dy=b.y-tank.y; const v=H(b.vx,b.vy)||1; const nx=b.vx/v,ny=b.vy/v; const proj=dx*nx+dy*ny; if(proj>0){ const px=b.x-proj*nx,py=b.y-proj*ny; const dist=H(px-tank.x,py-tank.y); const tt=proj/v; const s=dist+tt*(P.threatH||4); if(dist<P.threatR && s<score){ score=s; hot=b; } } }
if(hot){ const a=D(hot.vx,hot.vy); const side=(S.side||1)*P.fleeBias+(P.bias||0)*0.5; for(const c of [a+90+side,a-90-side,a+120,a-120,a+70,a-70,a+150,a-150]){ if(go(c)) return; } }
if(tank.x<P.edge){ if(go(0)) return;} if(tank.x>900-P.edge){ if(go(180)) return;} if(tank.y<P.edge){ if(go(90)) return;} if(tank.y>600-P.edge){ if(go(270)) return;}
let near=null,ad=1e18; for(const a of allies){ if(a.distance<ad){ ad=a.distance; near=a; } } if(near && ad<P.sep){ const away=D(tank.x-near.x,tank.y-near.y); if(go(away)) return; if(go(away+18)) return; if(go(away-18)) return; }
if(tgt){ const to=D(tgt.x-tank.x,tgt.y-tank.y), d=tgt.distance; let r0=P.rMin,r1=P.rMax; if((tgt.health<=P.finisherHP)||enemies.length<=P.aggrRemain){ r0=Math.max(120,r0-(P.aggrIn||30)); r1=Math.max(160,r1-(P.aggrOut||20)); } if(d<r0){ const aw=to+180+(P.bias||0)*0.4; if(go(aw)) return; if(go(aw+16)) return; if(go(aw-16)) return; } else if(d>r1){ if(go(to)) return; if(go(to+14)) return; if(go(to-14)) return; } else { const s=to+((S.side||1)*P.strafe)+(P.bias||0)*0.5; if(go(s)) return; if(go(s+16)) return; if(go(s-16)) return; } }
for(const s of [0,60,120,180,240,300]){ if(go(s+(P.bias||0))) return; } }

// ===== 다음 로봇 =====

function name(){return "HeliosX-D5";}
function type(){return Type.DEALER;}
let __s_4={last:null,tick:0,lastVel:null,side:((4*17)%2?1:-1)};
function update(tank,enemies,allies,bulletInfo){
const H=Math.hypot,D=(x,y)=>Math.atan2(y,x)*180/Math.PI,N=(a)=>{a%=360;if(a<0)a+=360;return a;},CL=(v,l,h)=>v<l?l:v>h?h:v;
const P={"rMin":232.868,"rMax":325.054,"strafe":31.37,"threatR":190.029,"threatH":4.904,"fleeBias":15.996,"sep":58.696,"edge":58.193,"leadCap":23.074,"leadW":1.271,"aimJitter":0.124,"aimBias":-0.26,"healthW":1.241,"distW":0.016,"finisherHP":15.821,"aggrRemain":1.963,"aggrIn":31.725,"aggrOut":27.821,"prefDealer":0.915,"prefNormal":0.043,"bias":-17.951999999999998}; const S=__s_4; S.tick=(S.tick||0)+1;
let tgt=null,best=1e18; for(const e of enemies){ const tw=(e.health<=P.finisherHP?-80:0)+(P.prefDealer?(e.type===2?-10:0):0)+(P.prefNormal?(e.type===0?-6:0):0); const k=e.health*P.healthW+e.distance*P.distW+(e.x+e.y)*(P.tieBias||0)+tw; if(k<best){best=k;tgt=e;} }
if(tgt){ let ax=tgt.x,ay=tgt.y,vx=0,vy=0; if(S.last){ const lvx=S.lastVel?S.lastVel.vx:0,lvy=S.lastVel?S.lastVel.vy:0; const ivx=(tgt.x-S.last.x),ivy=(tgt.y-S.last.y); vx=lvx*0.5+ivx*0.5; vy=lvy*0.5+ivy*0.5; S.lastVel={vx,vy}; const rx=tgt.x-tank.x,ry=tgt.y-tank.y,s2=64; const aa=vx*vx+vy*vy-s2,bb=2*(rx*vx+ry*vy),cc=rx*rx+ry*ry; let tHit=0; if(Math.abs(aa)<1e-6){ tHit=bb!==0?CL(-cc/bb,0,P.leadCap):0; } else { const disc=bb*bb-4*aa*cc; if(disc>=0){ const sd=Math.sqrt(disc),t1=(-bb-sd)/(2*aa),t2=(-bb+sd)/(2*aa); const tc=t1>0&&t2>0?Math.min(t1,t2):(t1>0?t1:(t2>0?t2:0)); tHit=CL(tc,0,P.leadCap);} } ax=tgt.x+vx*P.leadW*tHit; ay=tgt.y+vy*P.leadW*tHit; } const jitter=(((S.tick*13+tank.x*7+tank.y*3+4*11)%23)-11)*0.07*(P.aimJitter||0)+(P.aimBias||0); tank.fire(D(ax-tank.x,ay-tank.y)+jitter); S.last={x:tgt.x,y:tgt.y}; }
let moved=0; const go=(a)=>{ if(moved>20) return true; moved++; return tank.move(N(a)); };
let hot=null,score=1e18; for(const b of bulletInfo){ const dx=b.x-tank.x,dy=b.y-tank.y; const v=H(b.vx,b.vy)||1; const nx=b.vx/v,ny=b.vy/v; const proj=dx*nx+dy*ny; if(proj>0){ const px=b.x-proj*nx,py=b.y-proj*ny; const dist=H(px-tank.x,py-tank.y); const tt=proj/v; const s=dist+tt*(P.threatH||4); if(dist<P.threatR && s<score){ score=s; hot=b; } } }
if(hot){ const a=D(hot.vx,hot.vy); const side=(S.side||1)*P.fleeBias+(P.bias||0)*0.5; for(const c of [a+90+side,a-90-side,a+120,a-120,a+70,a-70,a+150,a-150]){ if(go(c)) return; } }
if(tank.x<P.edge){ if(go(0)) return;} if(tank.x>900-P.edge){ if(go(180)) return;} if(tank.y<P.edge){ if(go(90)) return;} if(tank.y>600-P.edge){ if(go(270)) return;}
let near=null,ad=1e18; for(const a of allies){ if(a.distance<ad){ ad=a.distance; near=a; } } if(near && ad<P.sep){ const away=D(tank.x-near.x,tank.y-near.y); if(go(away)) return; if(go(away+18)) return; if(go(away-18)) return; }
if(tgt){ const to=D(tgt.x-tank.x,tgt.y-tank.y), d=tgt.distance; let r0=P.rMin,r1=P.rMax; if((tgt.health<=P.finisherHP)||enemies.length<=P.aggrRemain){ r0=Math.max(120,r0-(P.aggrIn||30)); r1=Math.max(160,r1-(P.aggrOut||20)); } if(d<r0){ const aw=to+180+(P.bias||0)*0.4; if(go(aw)) return; if(go(aw+16)) return; if(go(aw-16)) return; } else if(d>r1){ if(go(to)) return; if(go(to+14)) return; if(go(to-14)) return; } else { const s=to+((S.side||1)*P.strafe)+(P.bias||0)*0.5; if(go(s)) return; if(go(s+16)) return; if(go(s-16)) return; } }
for(const s of [0,60,120,180,240,300]){ if(go(s+(P.bias||0))) return; } }

// ===== 다음 로봇 =====

function name(){return "HeliosX-N6";}
function type(){return Type.NORMAL;}
let __s_5={last:null,tick:0,lastVel:null,side:((5*17)%2?1:-1)};
function update(tank,enemies,allies,bulletInfo){
const H=Math.hypot,D=(x,y)=>Math.atan2(y,x)*180/Math.PI,N=(a)=>{a%=360;if(a<0)a+=360;return a;},CL=(v,l,h)=>v<l?l:v>h?h:v;
const P={"rMin":204.797,"rMax":311.458,"strafe":27.095,"threatR":183.773,"threatH":3.944,"fleeBias":15.821,"sep":65.292,"edge":52.585,"leadCap":21.065,"leadW":1.133,"aimJitter":0.181,"aimBias":0.001,"healthW":1.147,"distW":0.279,"finisherHP":21.018,"aggrRemain":2.884,"aggrIn":23.445,"aggrOut":16.969,"prefDealer":1.008,"prefNormal":0.94,"bias":2.01}; const S=__s_5; S.tick=(S.tick||0)+1;
let tgt=null,best=1e18; for(const e of enemies){ const tw=(e.health<=P.finisherHP?-80:0)+(P.prefDealer?(e.type===2?-10:0):0)+(P.prefNormal?(e.type===0?-6:0):0); const k=e.health*P.healthW+e.distance*P.distW+(e.x+e.y)*(P.tieBias||0)+tw; if(k<best){best=k;tgt=e;} }
if(tgt){ let ax=tgt.x,ay=tgt.y,vx=0,vy=0; if(S.last){ const lvx=S.lastVel?S.lastVel.vx:0,lvy=S.lastVel?S.lastVel.vy:0; const ivx=(tgt.x-S.last.x),ivy=(tgt.y-S.last.y); vx=lvx*0.5+ivx*0.5; vy=lvy*0.5+ivy*0.5; S.lastVel={vx,vy}; const rx=tgt.x-tank.x,ry=tgt.y-tank.y,s2=64; const aa=vx*vx+vy*vy-s2,bb=2*(rx*vx+ry*vy),cc=rx*rx+ry*ry; let tHit=0; if(Math.abs(aa)<1e-6){ tHit=bb!==0?CL(-cc/bb,0,P.leadCap):0; } else { const disc=bb*bb-4*aa*cc; if(disc>=0){ const sd=Math.sqrt(disc),t1=(-bb-sd)/(2*aa),t2=(-bb+sd)/(2*aa); const tc=t1>0&&t2>0?Math.min(t1,t2):(t1>0?t1:(t2>0?t2:0)); tHit=CL(tc,0,P.leadCap);} } ax=tgt.x+vx*P.leadW*tHit; ay=tgt.y+vy*P.leadW*tHit; } const jitter=(((S.tick*13+tank.x*7+tank.y*3+5*11)%23)-11)*0.07*(P.aimJitter||0)+(P.aimBias||0); tank.fire(D(ax-tank.x,ay-tank.y)+jitter); S.last={x:tgt.x,y:tgt.y}; }
let moved=0; const go=(a)=>{ if(moved>20) return true; moved++; return tank.move(N(a)); };
let hot=null,score=1e18; for(const b of bulletInfo){ const dx=b.x-tank.x,dy=b.y-tank.y; const v=H(b.vx,b.vy)||1; const nx=b.vx/v,ny=b.vy/v; const proj=dx*nx+dy*ny; if(proj>0){ const px=b.x-proj*nx,py=b.y-proj*ny; const dist=H(px-tank.x,py-tank.y); const tt=proj/v; const s=dist+tt*(P.threatH||4); if(dist<P.threatR && s<score){ score=s; hot=b; } } }
if(hot){ const a=D(hot.vx,hot.vy); const side=(S.side||1)*P.fleeBias+(P.bias||0)*0.5; for(const c of [a+90+side,a-90-side,a+120,a-120,a+70,a-70,a+150,a-150]){ if(go(c)) return; } }
if(tank.x<P.edge){ if(go(0)) return;} if(tank.x>900-P.edge){ if(go(180)) return;} if(tank.y<P.edge){ if(go(90)) return;} if(tank.y>600-P.edge){ if(go(270)) return;}
let near=null,ad=1e18; for(const a of allies){ if(a.distance<ad){ ad=a.distance; near=a; } } if(near && ad<P.sep){ const away=D(tank.x-near.x,tank.y-near.y); if(go(away)) return; if(go(away+18)) return; if(go(away-18)) return; }
if(tgt){ const to=D(tgt.x-tank.x,tgt.y-tank.y), d=tgt.distance; let r0=P.rMin,r1=P.rMax; if((tgt.health<=P.finisherHP)||enemies.length<=P.aggrRemain){ r0=Math.max(120,r0-(P.aggrIn||30)); r1=Math.max(160,r1-(P.aggrOut||20)); } if(d<r0){ const aw=to+180+(P.bias||0)*0.4; if(go(aw)) return; if(go(aw+16)) return; if(go(aw-16)) return; } else if(d>r1){ if(go(to)) return; if(go(to+14)) return; if(go(to-14)) return; } else { const s=to+((S.side||1)*P.strafe)+(P.bias||0)*0.5; if(go(s)) return; if(go(s+16)) return; if(go(s-16)) return; } }
for(const s of [0,60,120,180,240,300]){ if(go(s+(P.bias||0))) return; } }