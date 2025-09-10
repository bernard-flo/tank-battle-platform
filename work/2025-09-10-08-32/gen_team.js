#!/usr/bin/env node
/*
 Generates a 6-robot team code string compatible with tank_battle_platform.html
 and the headless simulator. Accepts an optional profile name to tweak params.

 Usage:
   node gen_team.js [profile]

 Prints team code to STDOUT.
*/

function buildRobotCode({ name, type, params }) {
  // params: object of tunables merged into per-bot defaults
  // We inline everything as simple JS so the HTML/simulator can eval it.
  const code = `
function name(){return ${JSON.stringify(name)};}
function type(){return ${type};}
// VM-persistent state per robot
let __state = { last:null, tick:0 };
function update(tank,enemies,allies,bulletInfo){
  const toDeg=(x,y)=>Math.atan2(y,x)*180/Math.PI;
  const norm=(a)=>{a%=360; if(a<0)a+=360; return a;};
  const clamp=(v,lo,hi)=>v<lo?lo:v>hi?hi:v;
  const hypot=Math.hypot;

  // Tunables (merged per profile and role)
  const P = ${JSON.stringify(params)};

  __state.tick = (__state.tick||0) + 1;

  // 1) Target selection: sort by health, then distance, then x+y for determinism
  let tgt=null; let best=1e18;
  for(const e of enemies){
    const k = e.health*P.healthWeight + e.distance*P.distWeight + (e.x+e.y)*P.tieBias;
    if(k<best){ best=k; tgt=e; }
  }

  // 2) Predictive aim with capped linear lead; slight index-based spread
  if(tgt){
    let aimX=tgt.x, aimY=tgt.y;
    if(__state.last && __state.last.x!==undefined){
      const vx=(tgt.x-__state.last.x);
      const vy=(tgt.y-__state.last.y);
      const dx=tgt.x-tank.x, dy=tgt.y-tank.y; const d=hypot(dx,dy);
      const tLead=clamp(d/8, 0, P.leadCap);
      aimX = tgt.x + vx*P.leadWeight*tLead;
      aimY = tgt.y + vy*P.leadWeight*tLead;
    }
    const jitter = (((tank.x*31+tank.y*17)%23)-11)*0.08 * P.aimJitter;
    const fireAngle = toDeg(aimX-tank.x, aimY-tank.y) + jitter + P.aimBias;
    tank.fire(fireAngle);
    __state.last = { x:tgt.x, y:tgt.y };
  }

  // Movement helper
  let tries=0; const tryMove=(a)=>{tries++; return tank.move(norm(a));};

  // 3) Bullet avoidance using nearest-approach + time-to-collision gate
  let hot=null; let minD=1e9; let eta=1e9;
  for(const b of bulletInfo){
    const dx=b.x-tank.x, dy=b.y-tank.y; const v=hypot(b.vx,b.vy)||1;
    const nx=b.vx/v, ny=b.vy/v; const proj=dx*nx+dy*ny;
    if(proj>0){
      const px=b.x-proj*nx, py=b.y-proj*ny; const d=hypot(px-tank.x,py-tank.y);
      const ttc = proj/v; // ticks to closest point
      if(d<minD && d<P.threatRadius && ttc < P.threatHorizon){ minD=d; hot=b; eta=ttc; }
    }
  }
  if(hot){
    const a=toDeg(hot.vx,hot.vy);
    const sideBias = P.threatFleeBias + (P.aimBias*0.5);
    const cands=[a+90+sideBias, a-90-sideBias, a+120, a-120, a+70, a-70];
    for(const c of cands){ if(tryMove(c)) return; }
  }

  // 4) Edge avoidance
  if(tank.x < P.edgeMargin){ if(tryMove(0)) return; }
  if(tank.x > 900-P.edgeMargin){ if(tryMove(180)) return; }
  if(tank.y < P.edgeMargin){ if(tryMove(90)) return; }
  if(tank.y > 600-P.edgeMargin){ if(tryMove(270)) return; }

  // 5) Ally separation
  let near=null, ad=1e9; for(const a of allies){ if(a.distance<ad){ ad=a.distance; near=a; } }
  if(near && ad < P.allySep){
    const away = toDeg(tank.x-near.x, tank.y-near.y);
    if(tryMove(away)) return; if(tryMove(away+28)) return; if(tryMove(away-28)) return;
  }

  // 6) Engagement spacing + adaptive strafing
  if(tgt){
    const to = toDeg(tgt.x-tank.x, tgt.y-tank.y);
    const d = tgt.distance;
    let minR=P.minRange, maxR=P.maxRange;
    // tighten ring when target low or outnumbered
    if((tgt.health<=P.finishHP) || enemies.length<=P.aggrRemain){ minR-=P.aggrTighten; maxR-=P.aggrTighten*0.7; }
    if(d < minR){
      const away = to+180 + P.bias*0.4;
      if(tryMove(away)) return; if(tryMove(away+24)) return; if(tryMove(away-24)) return;
    } else if(d > maxR){
      if(tryMove(to)) return; if(tryMove(to+18)) return; if(tryMove(to-18)) return;
    } else {
      const side = to + (((tank.x*13+tank.y*7)|0)%2?P.strafeAngle:-P.strafeAngle) + P.bias*0.5;
      if(tryMove(side)) return; if(tryMove(side+18)) return; if(tryMove(side-18)) return;
    }
  }

  // 7) Fallback sweeping
  const sweep=[0,60,120,180,240,300];
  for(const s of sweep){ if(tryMove(s+P.bias)) return; }
}
`;
  return code;
}

function profileParams(profile) {
  // Base constants influenced by profile
  const base = {
    // targeting weights
    healthWeight: 1.25,
    distWeight: 0.12,
    tieBias: 0.0005,
    // aim
    leadCap: 13,
    leadWeight: 1.05,
    aimJitter: 0.18,
    aimBias: 0,
    // bullet avoidance
    threatRadius: 78,
    threatHorizon: 18,
    threatFleeBias: 14,
    // movement envelope
    minRange: 200,
    maxRange: 310,
    strafeAngle: 30,
    allySep: 62,
    edgeMargin: 44,
    // macro behaviour
    finishHP: 22,
    aggrRemain: 3,
    aggrTighten: 35,
    // base bias to de-sync paths
    bias: 0,
  };

  const variants = {
    'astra-v1': { ...base },
    'astra-v2': { ...base, leadCap: 14, aimJitter: 0.14, distWeight: 0.10, threatRadius: 82 },
    'astra-v3': { ...base, leadWeight: 1.12, strafeAngle: 34, aggrTighten: 28, threatHorizon: 16 },
  };
  return variants[(profile||'astra-v1').toLowerCase()] || variants['astra-v1'];
}

function buildTeam(profile) {
  const P = profileParams(profile);
  // 6 robots: 2 tankers(front), 3 dealers(DPS), 1 normal(support)
  const bots = [
    { name: 'Astra-T1', type: 'Type.TANKER', bias: -12, min: 160, max: 255, strafe: 26, aim: -0.8 },
    { name: 'Astra-T2', type: 'Type.TANKER', bias: 12,  min: 160, max: 255, strafe: 26, aim: 0.7 },
    { name: 'Astra-D1', type: 'Type.DEALER', bias: -6,  min: 220, max: 330, strafe: 34, aim: -0.3 },
    { name: 'Astra-D2', type: 'Type.DEALER', bias: 6,   min: 220, max: 330, strafe: 34, aim: 0.3 },
    { name: 'Astra-D3', type: 'Type.DEALER', bias: -3,  min: 220, max: 330, strafe: 32, aim: 0.0 },
    { name: 'Astra-N1', type: 'Type.NORMAL', bias: 3,   min: 185, max: 295, strafe: 28, aim: 0.0 },
  ];

  const pieces = bots.map((b) => buildRobotCode({
    name: b.name,
    type: b.type,
    params: {
      ...P,
      bias: b.bias,
      minRange: b.min,
      maxRange: b.max,
      strafeAngle: b.strafe,
      aimBias: b.aim,
    },
  }));
  return pieces.join('\n\n// ===== 다음 로봇 =====\n\n');
}

if (require.main === module) {
  const profile = process.argv[2] || 'astra-v1';
  process.stdout.write(buildTeam(profile));
}

module.exports = { buildTeam };

