#!/usr/bin/env node
/* Build team code from variant params into a single JS file (team.js-like). */
const fs = require('fs');
const path = require('path');

function makeBot(name, tankType, P) {
  // Create a JS snippet for one robot. Must be self-contained.
  // We inline helper functions and parameters.
  const code = `function name(){return ${JSON.stringify(name)};}
function type(){return ${tankType};}
function update(tank,enemies,allies,bulletInfo){
  const D=(x,y)=>Math.atan2(y,x)*180/Math.PI; const N=(a)=>{a%=360;return a<0?a+360:a;}; const C=(v,l,h)=>v<l?l:v>h?h:v; const H=(dx,dy)=>Math.hypot(dx,dy);
  const P=${JSON.stringify(P)};
  // Per-bot state
  if(!update.__S) update.__S={}; const key='k'; const S=(update.__S[key] ||= {ex:0,ey:0,t:0});

  // Select target: weighted by low health and proximity
  let T=null, sc=1e12; for(const e of enemies){ const s = e.health*P.hW + e.distance*P.dW + (e.health < 20 ? P.lowH : 0); if(s<sc){sc=s; T=e;} }

  // Fire with leading and micro jitter
  if(T){ let ax=T.x, ay=T.y; if(S.t>0){ const vx=T.x-S.ex, vy=T.y-S.ey; const d=H(T.x-tank.x,T.y-tank.y); const t=C(d/8,0,P.leadCap); ax=T.x+vx*P.leadW*t; ay=T.y+vy*P.leadW*t; }
    const j=((tank.x*P.jA+tank.y*P.jB)%(P.jM)-P.jH)*P.jF; tank.fire(D(ax-tank.x,ay-tank.y)+j); S.ex=T.x; S.ey=T.y; S.t++; }

  // Desired engagement range by type
  let MIN=P.minR, MAX=P.maxR; if(T){ if(T.health<P.finH){ MIN-=P.finN; MAX-=P.finX; } if(enemies.length<=2){ MIN-=P.lastN; MAX-=P.lastX; } MIN=Math.max(MIN,P.minCap); }

  // Movement executor with retries (engine limits internally)
  const GO=(a)=>tank.move(N(a));

  // Bullet avoidance: predict closest approach and sidestep
  let threat=null, md=1e12; for(const b of bulletInfo){ const dx=b.x-tank.x, dy=b.y-tank.y; const v=H(b.vx,b.vy)||1, nx=b.vx/v, ny=b.vy/v; const proj=dx*nx+dy*ny; if(proj>0){ const px=b.x-proj*nx, py=b.y-proj*ny; const d=H(px-tank.x,py-tank.y); const t=proj/v; if(d<md && d<P.threat && t<P.thTime){ md=d; threat=b; } } }
  if(threat){ const a=D(threat.vx,threat.vy); const k=(tank.x*13+tank.y*7)%2?1:-1; for(const off of [90+P.bias*k, -90-P.bias*k, 120, -120]){ if(GO(a+off)) return; } }

  // Arena bounds push-back
  if(tank.x<P.edge){ if(GO(0)) return; } if(tank.x>900-P.edge){ if(GO(180)) return; } if(tank.y<P.edge){ if(GO(90)) return; } if(tank.y>600-P.edge){ if(GO(270)) return; }

  // Ally separation
  let nearestA=null, ad=1e12; for(const a of allies){ if(a.distance<ad){ ad=a.distance; nearestA=a; } } if(nearestA && ad<P.sep){ const aw=D(tank.x-nearestA.x,tank.y-nearestA.y); if(GO(aw)) return; if(GO(aw+25)) return; if(GO(aw-25)) return; }

  // Engage target: approach/retreat/strafing
  if(T){ const to=D(T.x-tank.x,T.y-tank.y), d=T.distance; if(d<MIN){ const aw=to+180+P.bias*0.5; if(GO(aw)) return; if(GO(aw+22)) return; if(GO(aw-22)) return; }
    else if(d>MAX){ if(GO(to)) return; if(GO(to+14)) return; if(GO(to-14)) return; }
    else { const side=to+(((tank.x*17+tank.y*11)%2)?P.strafe:-P.strafe)+P.bias*0.35; if(GO(side)) return; if(GO(side+14)) return; if(GO(side-14)) return; } }

  // Fallback search pattern
  for(const s of [0,60,120,180,240,300]){ if(GO(s+P.bias)) return; }
}
`;
  return code;
}

function buildTeam(variant, outFile) {
  const chunks = [];
  const names = [
    'ZenithX-T1','ZenithX-D1','ZenithX-N1','ZenithX-N2','ZenithX-D2','ZenithX-T2',
  ];
  const types = [ 'Type.TANKER', 'Type.DEALER', 'Type.NORMAL', 'Type.NORMAL', 'Type.DEALER', 'Type.TANKER' ];
  const perRole = {
    TANKER: variant.tanker,
    DEALER: variant.dealer,
    NORMAL: variant.normal,
  };
  const roleOfIndex = ['TANKER','DEALER','NORMAL','NORMAL','DEALER','TANKER'];
  const biases = variant.biases || [ -12, -14, -8, 8, 12, 14 ];
  for (let i=0;i<6;i++){
    const role = roleOfIndex[i];
    const base = Object.assign({}, perRole[role]);
    base.bias = biases[i] || 0;
    base.jA = (i*7+17)%41+11; base.jB = (i*5+13)%37+9; base.jM = 23 + (i%7); base.jH = 10 + (i%5); base.jF = +(0.09 + (i%3)*0.02).toFixed(2);
    const name = names[i];
    const tankType = types[i];
    chunks.push(makeBot(name, tankType, base));
  }
  const glue = '\n\n// ===== 다음 로봇 =====\n\n';
  const code = chunks.join(glue);
  fs.writeFileSync(outFile, code);
}

function main(){
  const outDir = process.argv[2] || '.';
  const variantPath = process.argv[3];
  if(!variantPath){
    console.error('Usage: build.js <outDir> <variant.json>');
    process.exit(1);
  }
  const variant = JSON.parse(fs.readFileSync(variantPath,'utf8'));
  const outFile = path.join(outDir, variant.name + '.js');
  buildTeam(variant, outFile);
  console.log('Built', outFile);
}

if(require.main===module){
  main();
}

