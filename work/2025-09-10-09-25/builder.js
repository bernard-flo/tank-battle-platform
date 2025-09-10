// Team code builder for tank_battle_platform.html compatible format
// Generates 6 robot functions with parameterized behavior.

const fs = require('fs');
const path = require('path');

function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }

// Build one robot code block
function buildRobot(idx, role, namePrefix, P) {
  const botName = `${namePrefix}-${idx}`;
  const tankType = role; // 0=NORMAL,1=TANKER,2=DEALER

  // Inline params as JSON for speed and determinism
  const Pjson = JSON.stringify(P);

  // Shared update logic (stateless fallback for browser; stateful in simulator allowed)
  return `function name(){return "${botName}";}
function type(){return ${tankType};}
// Persistent state (simulator secure runner preserves; browser fallback is stateless)
var __state = (typeof __state !== 'undefined' && __state) || { tick:0, last:null, lastVel:null };
function update(tank,enemies,allies,bulletInfo){
  "use strict";
  const P=${Pjson};
  __state.tick = (__state.tick||0)+1;
  const toDeg=(x,y)=>Math.atan2(y,x)*180/Math.PI;
  const hypot=Math.hypot;
  const norm=(a)=>{a%=360; if(a<0)a+=360; return a;};

  // 1) Target selection: health-weighted then distance
  let tgt=null; let best=1e9;
  for(const e of enemies){
    // Prefer low health and closer targets
    const key = e.health*P.targetHealthWeight + e.distance*P.targetDistWeight;
    if(key<best){best=key; tgt=e;}
  }

  // 2) Predictive aim using simple linear lead (simulator keeps state)
  if(tgt){
    let aimX=tgt.x, aimY=tgt.y;
    if(__state.last){
      const vx=(tgt.x-__state.last.x);
      const vy=(tgt.y-__state.last.y);
      let lvx=__state.lastVel?__state.lastVel.vx:0;
      let lvy=__state.lastVel?__state.lastVel.vy:0;
      const svx = lvx*P.velSmooth + vx*(1-P.velSmooth);
      const svy = lvy*P.velSmooth + vy*(1-P.velSmooth);
      __state.lastVel = { vx: svx, vy: svy };
      const dx=tgt.x-tank.x, dy=tgt.y-tank.y; const d=hypot(dx,dy);
      const tLead=clamp(d/8, 0, P.leadCap);
      aimX = tgt.x + svx*P.leadWeight*tLead;
      aimY = tgt.y + svy*P.leadWeight*tLead;
    }
    const jitter = (((tank.x*31+tank.y*17)%23)-11) * P.aimJitter;
    const fireAngle = toDeg(aimX-tank.x, aimY-tank.y) + jitter;
    tank.fire(fireAngle);
    __state.last = { x:tgt.x, y:tgt.y };
  }

  let attempts=0; const tryMove=(a)=>{attempts++; return tank.move(norm(a));};

  // 3) Bullet avoidance: steer perpendicular away from hottest threat
  let threat=null; let minApproach=1e9;
  for(const b of bulletInfo){
    const rx=b.x-tank.x, ry=b.y-tank.y; const v=hypot(b.vx,b.vy)||1;
    const nx=b.vx/v, ny=b.vy/v; const proj=rx*nx+ry*ny; // forward component
    if(proj>0){
      // perpendicular distance at closest approach
      const px=b.x-nx*proj, py=b.y-ny*proj; const d=hypot(px-tank.x,py-tank.y);
      if(d<minApproach){minApproach=d; threat={b, nx, ny, proj, d};}
    }
  }
  if(threat && threat.d < P.threatRadius){
    const base = toDeg(threat.nx, threat.ny); // bullet heading
    const side = ( ((tank.x*97+tank.y*131)|0)%2 ? 1 : -1 ) * P.threatFleeBias;
    const cands = [base+90+side, base-90-side, base+120, base-120, base+70, base-70];
    for(const c of cands){ if(tryMove(c)) return; }
  }

  // 4) Edge avoidance
  if(tank.x < P.edgeMargin){ if(tryMove(0)) return; }
  if(tank.x > 900-P.edgeMargin){ if(tryMove(180)) return; }
  if(tank.y < P.edgeMargin){ if(tryMove(90)) return; }
  if(tank.y > 600-P.edgeMargin){ if(tryMove(270)) return; }

  // 5) Ally separation to reduce clustering
  let closestAlly=null, ad=1e9; for(const a of allies){ if(a.distance<ad){ ad=a.distance; closestAlly=a; } }
  if(closestAlly && ad < P.allySep){
    const away = toDeg(tank.x-closestAlly.x, tank.y-closestAlly.y);
    if(tryMove(away)) return; if(tryMove(away+20)) return; if(tryMove(away-20)) return;
  }

  // 6) Engagement spacing and strafing
  if(tgt){
    const to = toDeg(tgt.x-tank.x, tgt.y-tank.y);
    const d = tgt.distance;
    let minR=P.minRange, maxR=P.maxRange;
    const remain = enemies.length;
    if((tgt.health <= P.finishHp) || remain <= P.finishRemain){ minR -= P.finishMinDelta; maxR -= P.finishMaxDelta; }
    if(d < minR){
      const away = to+180 + P.bias*0.4;
      if(tryMove(away)) return; if(tryMove(away+P.escapeSpread)) return; if(tryMove(away-P.escapeSpread)) return;
    } else if(d > maxR){
      if(tryMove(to)) return; if(tryMove(to+P.approachSpread)) return; if(tryMove(to-P.approachSpread)) return;
    } else {
      const side = to + ((((tank.x*13+tank.y*7)|0)%2)?P.strafeAngle:-P.strafeAngle) + P.bias*0.5;
      if(tryMove(side)) return; if(tryMove(side+P.strafeSpread)) return; if(tryMove(side-P.strafeSpread)) return;
    }
  }

  // 7) Fallback sweep
  const sweep=[0,60,120,180,240,300];
  for(const s of sweep){ if(tryMove(s+P.bias)) return; }
}
`;
}

function buildTeam(params, namePrefix = 'Helios') {
  // Roles: [TANKER, DEALER, DEALER, NORMAL, DEALER, TANKER]
  const roles = [1, 2, 2, 0, 2, 1];
  const pieces = [];
  for (let i = 0; i < 6; i++) {
    // Slight per-bot param tweaks for diversity
    const tweak = (base, delta) => base + (i%2?1:-1) * delta;
    const P = {
      leadCap: params.leadCap,
      leadWeight: params.leadWeight,
      aimJitter: params.aimJitter * (1 + (i%3-1)*0.15),
      velSmooth: clamp(params.velSmooth, 0, 0.95),
      minRange: tweak(params.minRange, 8),
      maxRange: tweak(params.maxRange, 8),
      strafeAngle: tweak(params.strafeAngle, 4),
      strafeSpread: params.strafeSpread,
      approachSpread: params.approachSpread,
      escapeSpread: params.escapeSpread,
      threatRadius: params.threatRadius,
      threatFleeBias: params.threatFleeBias * (i%2?1:-1),
      allySep: params.allySep,
      edgeMargin: params.edgeMargin,
      bias: (i<3?-1:1) * params.bias,
      targetHealthWeight: params.targetHealthWeight,
      targetDistWeight: params.targetDistWeight,
      finishHp: params.finishHp,
      finishRemain: params.finishRemain,
      finishMinDelta: params.finishMinDelta,
      finishMaxDelta: params.finishMaxDelta,
    };
    pieces.push(buildRobot(i+1, roles[i], namePrefix, P));
  }
  return pieces.join('\n\n\n// ===== 다음 로봇 =====\n\n\n');
}

function saveTeam(filePath, code) {
  fs.writeFileSync(path.resolve(filePath), code, 'utf8');
}

module.exports = { buildTeam, saveTeam };

