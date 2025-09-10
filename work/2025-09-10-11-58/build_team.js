#!/usr/bin/env node
/*
  Generates a 6-bot team compatible with tank_battle_platform.html import format.
  Produces a single text with 6 blocks separated by "// ===== 다음 로봇 =====".

  Usage: node build_team.js [outfile]
*/

const fs = require('fs');
const path = require('path');

function botBlock(name, typeConst, idx, profile) {
  // Profile P controls movement/aim. We allow persistent state in simulator; HTML resets each tick but logic still works.
  const P = JSON.stringify(profile);
  return `function name(){return "${name}";}
function type(){return ${typeConst};}
// Persistent state in simulator; harmless in HTML
let __state_${idx} = { last:null, tick:0, lastVel:null, side: ((${idx}*17)%2?1:-1) };
function update(tank,enemies,allies,bulletInfo){
  const H=Math.hypot, D=(x,y)=>Math.atan2(y,x)*180/Math.PI;
  const N=(a)=>{a%=360; if(a<0)a+=360; return a;};
  const CL=(v,l,h)=>v<l?l:v>h?h:v;
  const P=${P};
  const S=__state_${idx};
  S.tick=(S.tick||0)+1;

  // 1) Target selection (low health, then distance)
  let tgt=null, best=1e18;
  for(const e of enemies){
    const k = e.health*P.healthW + e.distance*P.distW + (e.x+e.y)*(P.tieBias||0);
    if(k<best){best=k; tgt=e;}
  }

  // 2) Predictive aim (velocity estimated from last frame; gracefully degrades in HTML)
  if(tgt){
    let ax=tgt.x, ay=tgt.y;
    if(S.last){
      const vx=(tgt.x-S.last.x), vy=(tgt.y-S.last.y);
      const lvx=S.lastVel?S.lastVel.vx:0, lvy=S.lastVel?S.lastVel.vy:0;
      const svx=lvx*0.5+vx*0.5, svy=lvy*0.5+vy*0.5; // low-pass
      S.lastVel={vx:svx,vy:svy};
      const d=H(tgt.x-tank.x,tgt.y-tank.y);
      const tLead=CL(d/8,0,P.leadCap);
      ax=tgt.x + svx*P.leadW*tLead;
      ay=tgt.y + svy*P.leadW*tLead;
    }
    const jitter = (((S.tick*13 + tank.x*7 + tank.y*3 + ${idx}*11)%23)-11)*0.07*P.aimJitter + (P.aimBias||0);
    tank.fire(D(ax-tank.x,ay-tank.y) + jitter);
    S.last={x:tgt.x,y:tgt.y};
  }

  // Helper to attempt moves (HTML allows up to 10 failed attempts; we bound try count)
  let moved=0; const go=(a)=>{ if(moved>20) return true; moved++; return tank.move(N(a)); };

  // 3) Bullet avoidance (projected distance along bullet path)
  let hot=null,score=1e18;
  for(const b of bulletInfo){
    const dx=b.x-tank.x, dy=b.y-tank.y; const v=H(b.vx,b.vy)||1; const nx=b.vx/v, ny=b.vy/v;
    const proj=dx*nx+dy*ny; // forward along bullet
    if(proj>0){
      // Foot of perpendicular from tank to bullet line
      const px=b.x-proj*nx, py=b.y-proj*ny;
      const dist=H(px-tank.x,py-tank.y);
      const tt=proj/v; // time until closest approach
      const s = dist + tt*(P.threatH||4);
      if(dist<P.threatR && s<score){ score=s; hot=b; }
    }
  }
  if(hot){
    const a=D(hot.vx,hot.vy);
    const side = (S.side||1)*P.fleeBias + P.bias*0.5;
    const options=[a+90+side, a-90-side, a+120, a-120, a+70, a-70, a+150, a-150];
    for(const c of options){ if(go(c)) return; }
  }

  // 4) Wall avoidance
  if(tank.x<P.edge){ if(go(0)) return; }
  if(tank.x>900-P.edge){ if(go(180)) return; }
  if(tank.y<P.edge){ if(go(90)) return; }
  if(tank.y>600-P.edge){ if(go(270)) return; }

  // 5) Ally separation
  let near=null, ad=1e18; for(const a of allies){ if(a.distance<ad){ ad=a.distance; near=a; } }
  if(near && ad<P.sep){ const away=D(tank.x-near.x,tank.y-near.y); if(go(away)) return; if(go(away+18)) return; if(go(away-18)) return; }

  // 6) Range control and strafing
  if(tgt){
    const to=D(tgt.x-tank.x,tgt.y-tank.y), d=tgt.distance;
    let r0=P.rMin, r1=P.rMax;
    if((tgt.health<=P.finisherHP)||enemies.length<=P.aggrRemain){ r0=Math.max(120,r0-(P.aggrIn||30)); r1=Math.max(160,r1-(P.aggrOut||20)); }
    if(d<r0){ const aw=to+180+P.bias*0.4; if(go(aw)) return; if(go(aw+16)) return; if(go(aw-16)) return; }
    else if(d>r1){ if(go(to)) return; if(go(to+14)) return; if(go(to-14)) return; }
    else { const s=to + ((S.side||1) * P.strafe) + P.bias*0.5; if(go(s)) return; if(go(s+16)) return; if(go(s-16)) return; }
  }

  // 7) Fallback sweep
  for(const s of [0,60,120,180,240,300]){ if(go(s+P.bias)) return; }
}
`;
}

function buildTeam(variant = 'base') {
  // Roles: 0,1,2,3,4,5
  const sets = {
    base: [
      { name: 'ZephyrX-T1', type: 'Type.TANKER', P: { rMin:170, rMax:265, strafe:22, threatR:190, threatH:4, fleeBias:18, sep:70, edge:52, leadCap:16, leadW:0.96, aimJitter:0.14, healthW:1.25, distW:0.10, finisherHP:26, aggrRemain:3, aggrIn:26, aggrOut:16, bias:-10 } },
      { name: 'ZephyrX-D1', type: 'Type.DEALER', P: { rMin:210, rMax:330, strafe:30, threatR:170, threatH:5, fleeBias:16, sep:64, edge:56, leadCap:18, leadW:1.08, aimJitter:0.12, healthW:1.20, distW:0.08, finisherHP:22, aggrRemain:2, aggrIn:35, aggrOut:24, bias:-8, aimBias:-0.6 } },
      { name: 'ZephyrX-N1', type: 'Type.NORMAL', P: { rMin:180, rMax:290, strafe:26, threatR:180, threatH:4, fleeBias:16, sep:66, edge:50, leadCap:16, leadW:1.02, aimJitter:0.16, healthW:1.25, distW:0.10, finisherHP:24, aggrRemain:3, aggrIn:28, aggrOut:18, bias:-6 } },
      { name: 'ZephyrX-T2', type: 'Type.TANKER', P: { rMin:165, rMax:260, strafe:22, threatR:190, threatH:4, fleeBias:20, sep:72, edge:52, leadCap:16, leadW:0.98, aimJitter:0.16, healthW:1.30, distW:0.10, finisherHP:26, aggrRemain:3, aggrIn:26, aggrOut:16, bias:10 } },
      { name: 'ZephyrX-D2', type: 'Type.DEALER', P: { rMin:215, rMax:335, strafe:30, threatR:170, threatH:5, fleeBias:16, sep:64, edge:56, leadCap:18, leadW:1.08, aimJitter:0.12, healthW:1.20, distW:0.08, finisherHP:22, aggrRemain:2, aggrIn:35, aggrOut:24, bias:8, aimBias:0.6 } },
      { name: 'ZephyrX-N2', type: 'Type.NORMAL', P: { rMin:180, rMax:290, strafe:26, threatR:180, threatH:4, fleeBias:16, sep:66, edge:50, leadCap:16, leadW:1.02, aimJitter:0.16, healthW:1.25, distW:0.10, finisherHP:24, aggrRemain:3, aggrIn:28, aggrOut:18, bias:6 } },
    ],
    aggro: [
      { name: 'ZephyrX-T1a', type: 'Type.TANKER', P: { rMin:155, rMax:245, strafe:24, threatR:185, threatH:4, fleeBias:16, sep:68, edge:50, leadCap:16, leadW:1.0, aimJitter:0.12, healthW:1.25, distW:0.08, finisherHP:28, aggrRemain:4, aggrIn:34, aggrOut:20, bias:-8 } },
      { name: 'ZephyrX-D1a', type: 'Type.DEALER', P: { rMin:200, rMax:320, strafe:32, threatR:165, threatH:5, fleeBias:14, sep:62, edge:54, leadCap:18, leadW:1.10, aimJitter:0.10, healthW:1.15, distW:0.08, finisherHP:24, aggrRemain:3, aggrIn:40, aggrOut:28, bias:-6, aimBias:-0.4 } },
      { name: 'ZephyrX-N1a', type: 'Type.NORMAL', P: { rMin:170, rMax:280, strafe:28, threatR:175, threatH:4, fleeBias:16, sep:64, edge:50, leadCap:16, leadW:1.04, aimJitter:0.14, healthW:1.25, distW:0.10, finisherHP:26, aggrRemain:3, aggrIn:32, aggrOut:20, bias:-4 } },
      { name: 'ZephyrX-T2a', type: 'Type.TANKER', P: { rMin:155, rMax:245, strafe:24, threatR:185, threatH:4, fleeBias:18, sep:70, edge:50, leadCap:16, leadW:1.0, aimJitter:0.12, healthW:1.30, distW:0.10, finisherHP:28, aggrRemain:4, aggrIn:34, aggrOut:20, bias:8 } },
      { name: 'ZephyrX-D2a', type: 'Type.DEALER', P: { rMin:200, rMax:320, strafe:32, threatR:165, threatH:5, fleeBias:14, sep:62, edge:54, leadCap:18, leadW:1.10, aimJitter:0.10, healthW:1.15, distW:0.08, finisherHP:24, aggrRemain:3, aggrIn:40, aggrOut:28, bias:6, aimBias:0.4 } },
      { name: 'ZephyrX-N2a', type: 'Type.NORMAL', P: { rMin:170, rMax:280, strafe:28, threatR:175, threatH:4, fleeBias:16, sep:64, edge:50, leadCap:16, leadW:1.04, aimJitter:0.14, healthW:1.25, distW:0.10, finisherHP:26, aggrRemain:3, aggrIn:32, aggrOut:20, bias:4 } },
    ],
    kite: [
      { name: 'ZephyrX-T1k', type: 'Type.TANKER', P: { rMin:180, rMax:280, strafe:20, threatR:195, threatH:5, fleeBias:20, sep:72, edge:56, leadCap:16, leadW:0.95, aimJitter:0.16, healthW:1.30, distW:0.12, finisherHP:24, aggrRemain:2, aggrIn:22, aggrOut:16, bias:-10 } },
      { name: 'ZephyrX-D1k', type: 'Type.DEALER', P: { rMin:230, rMax:350, strafe:34, threatR:175, threatH:6, fleeBias:18, sep:66, edge:60, leadCap:18, leadW:1.06, aimJitter:0.12, healthW:1.20, distW:0.08, finisherHP:22, aggrRemain:2, aggrIn:30, aggrOut:22, bias:-8, aimBias:-0.8 } },
      { name: 'ZephyrX-N1k', type: 'Type.NORMAL', P: { rMin:190, rMax:305, strafe:28, threatR:185, threatH:5, fleeBias:18, sep:68, edge:54, leadCap:16, leadW:1.0, aimJitter:0.16, healthW:1.25, distW:0.10, finisherHP:24, aggrRemain:2, aggrIn:26, aggrOut:18, bias:-6 } },
      { name: 'ZephyrX-T2k', type: 'Type.TANKER', P: { rMin:180, rMax:280, strafe:20, threatR:195, threatH:5, fleeBias:20, sep:72, edge:56, leadCap:16, leadW:0.95, aimJitter:0.16, healthW:1.30, distW:0.12, finisherHP:24, aggrRemain:2, aggrIn:22, aggrOut:16, bias:10 } },
      { name: 'ZephyrX-D2k', type: 'Type.DEALER', P: { rMin:230, rMax:350, strafe:34, threatR:175, threatH:6, fleeBias:18, sep:66, edge:60, leadCap:18, leadW:1.06, aimJitter:0.12, healthW:1.20, distW:0.08, finisherHP:22, aggrRemain:2, aggrIn:30, aggrOut:22, bias:8, aimBias:0.8 } },
      { name: 'ZephyrX-N2k', type: 'Type.NORMAL', P: { rMin:190, rMax:305, strafe:28, threatR:185, threatH:5, fleeBias:18, sep:68, edge:54, leadCap:16, leadW:1.0, aimJitter:0.16, healthW:1.25, distW:0.10, finisherHP:24, aggrRemain:2, aggrIn:26, aggrOut:18, bias:6 } },
    ],
  };
  const roles = sets[variant] || sets.base;

  const parts = roles.map((r, i) => botBlock(r.name, r.type, i, r.P));
  return parts.join("\n\n// ===== 다음 로봇 =====\n\n");
}

function main() {
  const outFile = process.argv[2] || path.resolve(__dirname, 'team_v1.txt');
  const variant = process.env.VARIANT || 'base';
  const code = buildTeam(variant);
  fs.writeFileSync(outFile, code);
  console.log('Wrote team to', outFile);
}

if (require.main === module) main();
