function name(){return "Aegis-1";}
function type(){return Type.TANKER;}
let __s={last:null,lastV:null,t:0};
function update(tank,enemies,allies,bulletInfo){
  const H=Math.hypot,D=(x,y)=>Math.atan2(y,x)*180/Math.PI,N=(a)=>{a%=360;if(a<0)a+=360;return a;},CL=(v,l,h)=>v<l?l:v>h?h:v;
  __s.t=(__s.t||0)+1;
  const Par={"rMin":158,"rMax":272,"strafe":23,"threatR":216,"fleeBias":13,"sep":69,"edge":43,"leadCap":15,"leadW":0.89,"aimJitter":0.13,"healthW":1.01,"distW":0.18,"finisherHP":22,"aggrRemain":3,"aggrIn":22,"aggrOut":18,"bias":4};
  let tgt=null,b=1e9; for(const e of enemies){const k=e.health*Par.healthW + e.distance*Par.distW; if(k<b){b=k;tgt=e;}}
  if(tgt){ let ax=tgt.x, ay=tgt.y; if(__s.last){ const vx=tgt.x-__s.last.x, vy=tgt.y-__s.last.y; const lvx=__s.lastV?__s.lastV.vx:0, lvy=__s.lastV?__s.lastV.vy:0; const svx=lvx*0.55+vx*0.45, svy=lvy*0.55+vy*0.45; __s.lastV={vx:svx,vy:sVy=vY=svy}; const d=H(tgt.x-tank.x,tgt.y-tank.y); const t=CL(d/8,0,Par.leadCap); ax=tgt.x+svx*Par.leadW*t; ay=tgt.y+svy*Par.leadW*t; }
    const j=(((__s.t*13 + tank.x*7 + tank.y*3 + 0*11)%23)-11)*0.07*Par.aimJitter; tank.fire(D(ax-tank.x,ay-tank.y)+j); __s.last={x:tgt.x,y:tgt.y}; }
  let moved=0; const go=(a)=>{ if(moved>20) return true; moved++; return tank.move(N(a)); };
  let hot=null,sc=1e9; for(const bu of bulletInfo){ const dx=bu.x-tank.x, dy=bu.y-tank.y; const v=H(bu.vx,bu.vy)||1; const nx=bu.vx/v, ny=bu.vy/v; const proj=dx*nx+dy*ny; if(proj>0){ const px=bu.x-proj*nx, py=bu.y-proj*ny; const d=H(px-tank.x,py-tank.y); const tt=proj/v; const s=d + tt*4; if(d<Par.threatR && s<sc){ sc=s; hot=bu; } } }
  if(hot){ const a=D(hot.vx,hot.vy); const side=(((31)%2)?1:-1)*Par.fleeBias + Par.bias*0.6; const C=[a+90+side,a-90-side,a+120,a-120,a+70,a-70,a+150,a-150]; for(const c of C){ if(go(c)) return; } }
  if(tank.x<Par.edge){ if(go(0)) return; } if(tank.x>900-Par.edge){ if(go(180)) return; } if(tank.y<Par.edge){ if(go(90)) return; } if(tank.y>600-Par.edge){ if(go(270)) return; }
  let near=null,ad=1e9; for(const al of allies){ if(al.distance<ad){ad=al.distance; near=al;} } if(near && ad<Par.sep){ const away=D(tank.x-near.x,tank.y-near.y); if(go(away)) return; if(go(away+18)) return; if(go(away-18)) return; }
  if(tgt){ const to=D(tgt.x-tank.x,tgt.y-tank.y), d=tgt.distance; let r0=Par.rMin,r1=Par.rMax; if((tgt.health<=Par.finisherHP)||enemies.length<=Par.aggrRemain){ r0-=Par.aggrIn; r1-=Par.aggrOut; }
    if(d<r0){ const aw=to+180+Par.bias*0.4; if(go(aw)) return; if(go(aw+16)) return; if(go(aw-16)) return; }
    else if(d>r1){ if(go(to)) return; if(go(to+14)) return; if(go(to-14)) return; }
    else { const s=to + (1 * Par.strafe) + Par.bias*0.5; if(go(s)) return; if(go(s+16)) return; if(go(s-16)) return; } }
  const sweep=[0,60,120,180,240,300]; for(const s of sweep){ if(go(s+Par.bias)) return; }
}

// ===== 다음 로봇 =====

function name(){return "Aegis-2";}
function type(){return Type.TANKER;}
let __s={last:null,lastV:null,t:0};
function update(tank,enemies,allies,bulletInfo){
  const H=Math.hypot,D=(x,y)=>Math.atan2(y,x)*180/Math.PI,N=(a)=>{a%=360;if(a<0)a+=360;return a;},CL=(v,l,h)=>v<l?l:v>h?h:v;
  __s.t=(__s.t||0)+1;
  const Par={"rMin":158,"rMax":272,"strafe":23,"threatR":216,"fleeBias":13,"sep":69,"edge":43,"leadCap":15,"leadW":0.89,"aimJitter":0.13,"healthW":1.01,"distW":0.18,"finisherHP":22,"aggrRemain":3,"aggrIn":22,"aggrOut":18,"bias":12};
  let tgt=null,b=1e9; for(const e of enemies){const k=e.health*Par.healthW + e.distance*Par.distW; if(k<b){b=k;tgt=e;}}
  if(tgt){ let ax=tgt.x, ay=tgt.y; if(__s.last){ const vx=tgt.x-__s.last.x, vy=tgt.y-__s.last.y; const lvx=__s.lastV?__s.lastV.vx:0, lvy=__s.lastV?__s.lastV.vy:0; const svx=lvx*0.55+vx*0.45, svy=lvy*0.55+vy*0.45; __s.lastV={vx:svx,vy:sVy=vY=svy}; const d=H(tgt.x-tank.x,tgt.y-tank.y); const t=CL(d/8,0,Par.leadCap); ax=tgt.x+svx*Par.leadW*t; ay=tgt.y+svy*Par.leadW*t; }
    const j=(((__s.t*13 + tank.x*7 + tank.y*3 + 1*11)%23)-11)*0.07*Par.aimJitter; tank.fire(D(ax-tank.x,ay-tank.y)+j); __s.last={x:tgt.x,y:tgt.y}; }
  let moved=0; const go=(a)=>{ if(moved>20) return true; moved++; return tank.move(N(a)); };
  let hot=null,sc=1e9; for(const bu of bulletInfo){ const dx=bu.x-tank.x, dy=bu.y-tank.y; const v=H(bu.vx,bu.vy)||1; const nx=bu.vx/v, ny=bu.vy/v; const proj=dx*nx+dy*ny; if(proj>0){ const px=bu.x-proj*nx, py=bu.y-proj*ny; const d=H(px-tank.x,py-tank.y); const tt=proj/v; const s=d + tt*4; if(d<Par.threatR && s<sc){ sc=s; hot=bu; } } }
  if(hot){ const a=D(hot.vx,hot.vy); const side=(((48)%2)?1:-1)*Par.fleeBias + Par.bias*0.6; const C=[a+90+side,a-90-side,a+120,a-120,a+70,a-70,a+150,a-150]; for(const c of C){ if(go(c)) return; } }
  if(tank.x<Par.edge){ if(go(0)) return; } if(tank.x>900-Par.edge){ if(go(180)) return; } if(tank.y<Par.edge){ if(go(90)) return; } if(tank.y>600-Par.edge){ if(go(270)) return; }
  let near=null,ad=1e9; for(const al of allies){ if(al.distance<ad){ad=al.distance; near=al;} } if(near && ad<Par.sep){ const away=D(tank.x-near.x,tank.y-near.y); if(go(away)) return; if(go(away+18)) return; if(go(away-18)) return; }
  if(tgt){ const to=D(tgt.x-tank.x,tgt.y-tank.y), d=tgt.distance; let r0=Par.rMin,r1=Par.rMax; if((tgt.health<=Par.finisherHP)||enemies.length<=Par.aggrRemain){ r0-=Par.aggrIn; r1-=Par.aggrOut; }
    if(d<r0){ const aw=to+180+Par.bias*0.4; if(go(aw)) return; if(go(aw+16)) return; if(go(aw-16)) return; }
    else if(d>r1){ if(go(to)) return; if(go(to+14)) return; if(go(to-14)) return; }
    else { const s=to + (-1 * Par.strafe) + Par.bias*0.5; if(go(s)) return; if(go(s+16)) return; if(go(s-16)) return; } }
  const sweep=[0,60,120,180,240,300]; for(const s of sweep){ if(go(s+Par.bias)) return; }
}

// ===== 다음 로봇 =====

function name(){return "Aegis-3";}
function type(){return Type.NORMAL;}
let __s={last:null,lastV:null,t:0};
function update(tank,enemies,allies,bulletInfo){
  const H=Math.hypot,D=(x,y)=>Math.atan2(y,x)*180/Math.PI,N=(a)=>{a%=360;if(a<0)a+=360;return a;},CL=(v,l,h)=>v<l?l:v>h?h:v;
  __s.t=(__s.t||0)+1;
  const Par={"rMin":158,"rMax":272,"strafe":23,"threatR":216,"fleeBias":13,"sep":69,"edge":43,"leadCap":15,"leadW":0.89,"aimJitter":0.13,"healthW":1.01,"distW":0.18,"finisherHP":22,"aggrRemain":3,"aggrIn":22,"aggrOut":18,"bias":4};
  let tgt=null,b=1e9; for(const e of enemies){const k=e.health*Par.healthW + e.distance*Par.distW; if(k<b){b=k;tgt=e;}}
  if(tgt){ let ax=tgt.x, ay=tgt.y; if(__s.last){ const vx=tgt.x-__s.last.x, vy=tgt.y-__s.last.y; const lvx=__s.lastV?__s.lastV.vx:0, lvy=__s.lastV?__s.lastV.vy:0; const svx=lvx*0.55+vx*0.45, svy=lvy*0.55+vy*0.45; __s.lastV={vx:svx,vy:sVy=vY=svy}; const d=H(tgt.x-tank.x,tgt.y-tank.y); const t=CL(d/8,0,Par.leadCap); ax=tgt.x+svx*Par.leadW*t; ay=tgt.y+svy*Par.leadW*t; }
    const j=(((__s.t*13 + tank.x*7 + tank.y*3 + 2*11)%23)-11)*0.07*Par.aimJitter; tank.fire(D(ax-tank.x,ay-tank.y)+j); __s.last={x:tgt.x,y:tgt.y}; }
  let moved=0; const go=(a)=>{ if(moved>20) return true; moved++; return tank.move(N(a)); };
  let hot=null,sc=1e9; for(const bu of bulletInfo){ const dx=bu.x-tank.x, dy=bu.y-tank.y; const v=H(bu.vx,bu.vy)||1; const nx=bu.vx/v, ny=bu.vy/v; const proj=dx*nx+dy*ny; if(proj>0){ const px=bu.x-proj*nx, py=bu.y-proj*ny; const d=H(px-tank.x,py-tank.y); const tt=proj/v; const s=d + tt*4; if(d<Par.threatR && s<sc){ sc=s; hot=bu; } } }
  if(hot){ const a=D(hot.vx,hot.vy); const side=(((65)%2)?1:-1)*Par.fleeBias + Par.bias*0.6; const C=[a+90+side,a-90-side,a+120,a-120,a+70,a-70,a+150,a-150]; for(const c of C){ if(go(c)) return; } }
  if(tank.x<Par.edge){ if(go(0)) return; } if(tank.x>900-Par.edge){ if(go(180)) return; } if(tank.y<Par.edge){ if(go(90)) return; } if(tank.y>600-Par.edge){ if(go(270)) return; }
  let near=null,ad=1e9; for(const al of allies){ if(al.distance<ad){ad=al.distance; near=al;} } if(near && ad<Par.sep){ const away=D(tank.x-near.x,tank.y-near.y); if(go(away)) return; if(go(away+18)) return; if(go(away-18)) return; }
  if(tgt){ const to=D(tgt.x-tank.x,tgt.y-tank.y), d=tgt.distance; let r0=Par.rMin,r1=Par.rMax; if((tgt.health<=Par.finisherHP)||enemies.length<=Par.aggrRemain){ r0-=Par.aggrIn; r1-=Par.aggrOut; }
    if(d<r0){ const aw=to+180+Par.bias*0.4; if(go(aw)) return; if(go(aw+16)) return; if(go(aw-16)) return; }
    else if(d>r1){ if(go(to)) return; if(go(to+14)) return; if(go(to-14)) return; }
    else { const s=to + (1 * Par.strafe) + Par.bias*0.5; if(go(s)) return; if(go(s+16)) return; if(go(s-16)) return; } }
  const sweep=[0,60,120,180,240,300]; for(const s of sweep){ if(go(s+Par.bias)) return; }
}

// ===== 다음 로봇 =====

function name(){return "Aegis-4";}
function type(){return Type.NORMAL;}
let __s={last:null,lastV:null,t:0};
function update(tank,enemies,allies,bulletInfo){
  const H=Math.hypot,D=(x,y)=>Math.atan2(y,x)*180/Math.PI,N=(a)=>{a%=360;if(a<0)a+=360;return a;},CL=(v,l,h)=>v<l?l:v>h?h:v;
  __s.t=(__s.t||0)+1;
  const Par={"rMin":158,"rMax":272,"strafe":23,"threatR":216,"fleeBias":13,"sep":69,"edge":43,"leadCap":15,"leadW":0.89,"aimJitter":0.13,"healthW":1.01,"distW":0.18,"finisherHP":22,"aggrRemain":3,"aggrIn":22,"aggrOut":18,"bias":-4};
  let tgt=null,b=1e9; for(const e of enemies){const k=e.health*Par.healthW + e.distance*Par.distW; if(k<b){b=k;tgt=e;}}
  if(tgt){ let ax=tgt.x, ay=tgt.y; if(__s.last){ const vx=tgt.x-__s.last.x, vy=tgt.y-__s.last.y; const lvx=__s.lastV?__s.lastV.vx:0, lvy=__s.lastV?__s.lastV.vy:0; const svx=lvx*0.55+vx*0.45, svy=lvy*0.55+vy*0.45; __s.lastV={vx:svx,vy:sVy=vY=svy}; const d=H(tgt.x-tank.x,tgt.y-tank.y); const t=CL(d/8,0,Par.leadCap); ax=tgt.x+svx*Par.leadW*t; ay=tgt.y+svy*Par.leadW*t; }
    const j=(((__s.t*13 + tank.x*7 + tank.y*3 + 3*11)%23)-11)*0.07*Par.aimJitter; tank.fire(D(ax-tank.x,ay-tank.y)+j); __s.last={x:tgt.x,y:tgt.y}; }
  let moved=0; const go=(a)=>{ if(moved>20) return true; moved++; return tank.move(N(a)); };
  let hot=null,sc=1e9; for(const bu of bulletInfo){ const dx=bu.x-tank.x, dy=bu.y-tank.y; const v=H(bu.vx,bu.vy)||1; const nx=bu.vx/v, ny=bu.vy/v; const proj=dx*nx+dy*ny; if(proj>0){ const px=bu.x-proj*nx, py=bu.y-proj*ny; const d=H(px-tank.x,py-tank.y); const tt=proj/v; const s=d + tt*4; if(d<Par.threatR && s<sc){ sc=s; hot=bu; } } }
  if(hot){ const a=D(hot.vx,hot.vy); const side=(((82)%2)?1:-1)*Par.fleeBias + Par.bias*0.6; const C=[a+90+side,a-90-side,a+120,a-120,a+70,a-70,a+150,a-150]; for(const c of C){ if(go(c)) return; } }
  if(tank.x<Par.edge){ if(go(0)) return; } if(tank.x>900-Par.edge){ if(go(180)) return; } if(tank.y<Par.edge){ if(go(90)) return; } if(tank.y>600-Par.edge){ if(go(270)) return; }
  let near=null,ad=1e9; for(const al of allies){ if(al.distance<ad){ad=al.distance; near=al;} } if(near && ad<Par.sep){ const away=D(tank.x-near.x,tank.y-near.y); if(go(away)) return; if(go(away+18)) return; if(go(away-18)) return; }
  if(tgt){ const to=D(tgt.x-tank.x,tgt.y-tank.y), d=tgt.distance; let r0=Par.rMin,r1=Par.rMax; if((tgt.health<=Par.finisherHP)||enemies.length<=Par.aggrRemain){ r0-=Par.aggrIn; r1-=Par.aggrOut; }
    if(d<r0){ const aw=to+180+Par.bias*0.4; if(go(aw)) return; if(go(aw+16)) return; if(go(aw-16)) return; }
    else if(d>r1){ if(go(to)) return; if(go(to+14)) return; if(go(to-14)) return; }
    else { const s=to + (-1 * Par.strafe) + Par.bias*0.5; if(go(s)) return; if(go(s+16)) return; if(go(s-16)) return; } }
  const sweep=[0,60,120,180,240,300]; for(const s of sweep){ if(go(s+Par.bias)) return; }
}

// ===== 다음 로봇 =====

function name(){return "Aegis-5";}
function type(){return Type.DEALER;}
let __s={last:null,lastV:null,t:0};
function update(tank,enemies,allies,bulletInfo){
  const H=Math.hypot,D=(x,y)=>Math.atan2(y,x)*180/Math.PI,N=(a)=>{a%=360;if(a<0)a+=360;return a;},CL=(v,l,h)=>v<l?l:v>h?h:v;
  __s.t=(__s.t||0)+1;
  const Par={"rMin":158,"rMax":272,"strafe":23,"threatR":216,"fleeBias":13,"sep":69,"edge":43,"leadCap":15,"leadW":0.89,"aimJitter":0.13,"healthW":1.01,"distW":0.18,"finisherHP":22,"aggrRemain":3,"aggrIn":22,"aggrOut":18,"bias":-12};
  let tgt=null,b=1e9; for(const e of enemies){const k=e.health*Par.healthW + e.distance*Par.distW; if(k<b){b=k;tgt=e;}}
  if(tgt){ let ax=tgt.x, ay=tgt.y; if(__s.last){ const vx=tgt.x-__s.last.x, vy=tgt.y-__s.last.y; const lvx=__s.lastV?__s.lastV.vx:0, lvy=__s.lastV?__s.lastV.vy:0; const svx=lvx*0.55+vx*0.45, svy=lvy*0.55+vy*0.45; __s.lastV={vx:svx,vy:sVy=vY=svy}; const d=H(tgt.x-tank.x,tgt.y-tank.y); const t=CL(d/8,0,Par.leadCap); ax=tgt.x+svx*Par.leadW*t; ay=tgt.y+svy*Par.leadW*t; }
    const j=(((__s.t*13 + tank.x*7 + tank.y*3 + 4*11)%23)-11)*0.07*Par.aimJitter; tank.fire(D(ax-tank.x,ay-tank.y)+j); __s.last={x:tgt.x,y:tgt.y}; }
  let moved=0; const go=(a)=>{ if(moved>20) return true; moved++; return tank.move(N(a)); };
  let hot=null,sc=1e9; for(const bu of bulletInfo){ const dx=bu.x-tank.x, dy=bu.y-tank.y; const v=H(bu.vx,bu.vy)||1; const nx=bu.vx/v, ny=bu.vy/v; const proj=dx*nx+dy*ny; if(proj>0){ const px=bu.x-proj*nx, py=bu.y-proj*ny; const d=H(px-tank.x,py-tank.y); const tt=proj/v; const s=d + tt*4; if(d<Par.threatR && s<sc){ sc=s; hot=bu; } } }
  if(hot){ const a=D(hot.vx,hot.vy); const side=(((99)%2)?1:-1)*Par.fleeBias + Par.bias*0.6; const C=[a+90+side,a-90-side,a+120,a-120,a+70,a-70,a+150,a-150]; for(const c of C){ if(go(c)) return; } }
  if(tank.x<Par.edge){ if(go(0)) return; } if(tank.x>900-Par.edge){ if(go(180)) return; } if(tank.y<Par.edge){ if(go(90)) return; } if(tank.y>600-Par.edge){ if(go(270)) return; }
  let near=null,ad=1e9; for(const al of allies){ if(al.distance<ad){ad=al.distance; near=al;} } if(near && ad<Par.sep){ const away=D(tank.x-near.x,tank.y-near.y); if(go(away)) return; if(go(away+18)) return; if(go(away-18)) return; }
  if(tgt){ const to=D(tgt.x-tank.x,tgt.y-tank.y), d=tgt.distance; let r0=Par.rMin,r1=Par.rMax; if((tgt.health<=Par.finisherHP)||enemies.length<=Par.aggrRemain){ r0-=Par.aggrIn; r1-=Par.aggrOut; }
    if(d<r0){ const aw=to+180+Par.bias*0.4; if(go(aw)) return; if(go(aw+16)) return; if(go(aw-16)) return; }
    else if(d>r1){ if(go(to)) return; if(go(to+14)) return; if(go(to-14)) return; }
    else { const s=to + (1 * Par.strafe) + Par.bias*0.5; if(go(s)) return; if(go(s+16)) return; if(go(s-16)) return; } }
  const sweep=[0,60,120,180,240,300]; for(const s of sweep){ if(go(s+Par.bias)) return; }
}

// ===== 다음 로봇 =====

function name(){return "Aegis-6";}
function type(){return Type.DEALER;}
let __s={last:null,lastV:null,t:0};
function update(tank,enemies,allies,bulletInfo){
  const H=Math.hypot,D=(x,y)=>Math.atan2(y,x)*180/Math.PI,N=(a)=>{a%=360;if(a<0)a+=360;return a;},CL=(v,l,h)=>v<l?l:v>h?h:v;
  __s.t=(__s.t||0)+1;
  const Par={"rMin":158,"rMax":272,"strafe":23,"threatR":216,"fleeBias":13,"sep":69,"edge":43,"leadCap":15,"leadW":0.89,"aimJitter":0.13,"healthW":1.01,"distW":0.18,"finisherHP":22,"aggrRemain":3,"aggrIn":22,"aggrOut":18,"bias":-4};
  let tgt=null,b=1e9; for(const e of enemies){const k=e.health*Par.healthW + e.distance*Par.distW; if(k<b){b=k;tgt=e;}}
  if(tgt){ let ax=tgt.x, ay=tgt.y; if(__s.last){ const vx=tgt.x-__s.last.x, vy=tgt.y-__s.last.y; const lvx=__s.lastV?__s.lastV.vx:0, lvy=__s.lastV?__s.lastV.vy:0; const svx=lvx*0.55+vx*0.45, svy=lvy*0.55+vy*0.45; __s.lastV={vx:svx,vy:sVy=vY=svy}; const d=H(tgt.x-tank.x,tgt.y-tank.y); const t=CL(d/8,0,Par.leadCap); ax=tgt.x+svx*Par.leadW*t; ay=tgt.y+svy*Par.leadW*t; }
    const j=(((__s.t*13 + tank.x*7 + tank.y*3 + 5*11)%23)-11)*0.07*Par.aimJitter; tank.fire(D(ax-tank.x,ay-tank.y)+j); __s.last={x:tgt.x,y:tgt.y}; }
  let moved=0; const go=(a)=>{ if(moved>20) return true; moved++; return tank.move(N(a)); };
  let hot=null,sc=1e9; for(const bu of bulletInfo){ const dx=bu.x-tank.x, dy=bu.y-tank.y; const v=H(bu.vx,bu.vy)||1; const nx=bu.vx/v, ny=bu.vy/v; const proj=dx*nx+dy*ny; if(proj>0){ const px=bu.x-proj*nx, py=bu.y-proj*ny; const d=H(px-tank.x,py-tank.y); const tt=proj/v; const s=d + tt*4; if(d<Par.threatR && s<sc){ sc=s; hot=bu; } } }
  if(hot){ const a=D(hot.vx,hot.vy); const side=(((116)%2)?1:-1)*Par.fleeBias + Par.bias*0.6; const C=[a+90+side,a-90-side,a+120,a-120,a+70,a-70,a+150,a-150]; for(const c of C){ if(go(c)) return; } }
  if(tank.x<Par.edge){ if(go(0)) return; } if(tank.x>900-Par.edge){ if(go(180)) return; } if(tank.y<Par.edge){ if(go(90)) return; } if(tank.y>600-Par.edge){ if(go(270)) return; }
  let near=null,ad=1e9; for(const al of allies){ if(al.distance<ad){ad=al.distance; near=al;} } if(near && ad<Par.sep){ const away=D(tank.x-near.x,tank.y-near.y); if(go(away)) return; if(go(away+18)) return; if(go(away-18)) return; }
  if(tgt){ const to=D(tgt.x-tank.x,tgt.y-tank.y), d=tgt.distance; let r0=Par.rMin,r1=Par.rMax; if((tgt.health<=Par.finisherHP)||enemies.length<=Par.aggrRemain){ r0-=Par.aggrIn; r1-=Par.aggrOut; }
    if(d<r0){ const aw=to+180+Par.bias*0.4; if(go(aw)) return; if(go(aw+16)) return; if(go(aw-16)) return; }
    else if(d>r1){ if(go(to)) return; if(go(to+14)) return; if(go(to-14)) return; }
    else { const s=to + (-1 * Par.strafe) + Par.bias*0.5; if(go(s)) return; if(go(s+16)) return; if(go(s-16)) return; } }
  const sweep=[0,60,120,180,240,300]; for(const s of sweep){ if(go(s+Par.bias)) return; }
}