// Parametric 6-bot team template (importable by tank_battle_platform.html)
// Each robot is defined by name(), type(), update() and separated by the sentinel.

function makeBotCode(nameStr, tankType, P, stateVar) {
  return `function name(){return ${JSON.stringify(nameStr)};}
function type(){return ${tankType};}
let ${stateVar}={last:null,lastVel:null,tick:0};
function update(tank,enemies,allies,bulletInfo){
  "use strict";
  const P=${JSON.stringify(P)};
  const toDeg=(x,y)=>Math.atan2(y,x)*180/Math.PI, H=Math.hypot, clamp=(v,lo,hi)=>v<lo?lo:v>hi?hi:v;
  const norm=(a)=>{a%=360; if(a<0)a+=360; return a;};
  ${stateVar}.tick=(${stateVar}.tick||0)+1;

  // 0) Team centroid and enemy selection (weighted by health and distance)
  let cx=tank.x, cy=tank.y; if(allies && allies.length){ let sx=tank.x, sy=tank.y; for(const a of allies){ sx+=a.x; sy+=a.y; } cx=sx/(allies.length+1); cy=sy/(allies.length+1); }
  let tgt=null,b=1e9; for(const e of enemies){ const k=e.health*P.healthW + e.distance*P.distW + Math.abs(e.x-cx)*P.cxW + Math.abs(e.y-cy)*P.cyW; if(k<b){b=k;tgt=e;} }

  // 1) Predictive aim with EW smoothing of enemy velocity and capped lead time
  if(tgt){ let ax=tgt.x, ay=tgt.y; if(${stateVar}.last){
      const vx=tgt.x-${stateVar}.last.x, vy=tgt.y-${stateVar}.last.y;
      const lvx=${stateVar}.lastVel?${stateVar}.lastVel.vx:0, lvy=${stateVar}.lastVel?${stateVar}.lastVel.vy:0;
      const svx=lvx*P.smoothPrev+vx*(1-P.smoothPrev), svy=lvy*P.smoothPrev+vy*(1-P.smoothPrev); ${stateVar}.lastVel={vx:svx,vy:svy};
      const d=tgt.distance; const t=clamp(d/8,0,P.leadCap); ax=tgt.x+svx*P.leadW*t; ay=tgt.y+svy*P.leadW*t; }
    const dj=(((${stateVar}.tick*P.jTick + ((tank.x*31+tank.y*17+P.jSeed)%23))%23)-11)*0.07;
    const jitter=dj*P.aimJitter*(1-Math.min(1,(tgt.distance/600))); // less jitter at long range
    tank.fire(toDeg(ax-tank.x,ay-tank.y)+jitter); ${stateVar}.last={x:tgt.x,y:tgt.y}; }

  let _tries=0; const go=(a)=>{ if(_tries>=10) return false; _tries++; return tank.move(norm(a)); };

  // 2) Bullet avoidance using time-to-closest-approach heuristic
  let hot=null,score=1e9; for(const bu of bulletInfo){ const dx=bu.x-tank.x, dy=bu.y-tank.y; const v=H(bu.vx,bu.vy)||1; const nx=bu.vx/v, ny=bu.vy/v; const proj=dx*nx+dy*ny; if(proj>0){ const px=bu.x-proj*nx, py=bu.y-proj*ny; const d=H(px-tank.x,py-tank.y); const tt=proj/v; const sc=d + tt*P.ttcW; if(d<P.threatR && sc<score){ score=sc; hot=bu; } } }
  if(hot){ const a=toDeg(hot.vx,hot.vy); const side=(((${stateVar}.tick>>2)%2)?1:-1)*P.fleeBias + P.bias*0.6; const cand=[a+90+side, a-90-side, a+120, a-120, a+70, a-70, a+150, a-150]; for(const c of cand){ if(go(c)) return; }}

  // 3) Edge avoidance band
  if(tank.x<P.edge){ if(go(0))return; } if(tank.x>900-P.edge){ if(go(180))return; } if(tank.y<P.edge){ if(go(90))return; } if(tank.y>600-P.edge){ if(go(270))return; }

  // 4) Ally separation
  let near=null,ad=1e9; for(const a of allies){ if(a.distance<ad){ad=a.distance;near=a;} } if(near && ad<P.sep){ const away=toDeg(tank.x-near.x,tank.y-near.y); if(go(away))return; if(go(away+P.sepSpread))return; if(go(away-P.sepSpread))return; }

  // 5) Range control relative to target + adaptive strafing
  if(tgt){ const to=toDeg(tgt.x-tank.x,tgt.y-tank.y), d=tgt.distance; let minR=P.rMin, maxR=P.rMax; if((tgt.health<=P.finisherHP)||enemies.length<=P.aggrRemain){ minR=Math.max(80,minR-P.aggrIn); maxR=Math.max(minR+30,maxR-P.aggrOut); }
    if(d<minR){ const away=to+180+P.bias*0.4; if(go(away))return; if(go(away+P.rangeSpread))return; if(go(away-P.rangeSpread))return; }
    else if(d>maxR){ if(go(to))return; if(go(to+P.rangeSpread))return; if(go(to-P.rangeSpread))return; }
    else { const dir = (((${stateVar}.tick>>P.strafeTick)&1)?P.strafe:-P.strafe); const side=to + dir + P.bias*0.5; if(go(side))return; if(go(side+P.strafeSpread))return; if(go(side-P.strafeSpread))return; } }

  // 6) Fallback sweep
  const sweep=[0,45,90,135,180,225,270,315]; for(const s of sweep){ if(go(s+P.bias)) return; }
}`;
}

function buildTeam(namePrefix, roles) {
  const bots = [];
  // Role presets tuned from experiments, can be mutated by optimizer
  const base = {
    rMin: 176, rMax: 296, strafe: 30, strafeSpread: 16, strafeTick: 2,
    threatR: 196, fleeBias: 18, sep: 60, sepSpread: 22, edge: 52,
    leadCap: 14, leadW: 0.96, smoothPrev: 0.55, aimJitter: 0.16,
    healthW: 1.18, distW: 0.14, cxW: 0.02, cyW: 0.02,
    finisherHP: 28, aggrRemain: 3, aggrIn: 22, aggrOut: 16,
    bias: 0, horizon: 10, samp: 7, avoidW: 1, edgeW: 0.5, rangeW: 0.22,
    rangeSpread: 18, ttcW: 4, jTick: 1, jSeed: 1,
  };
  const presets = {
    TANKER: { ...base, rMin: 160, rMax: 280, fleeBias: 12, bias: -6, aimJitter: 0.14, jSeed: 11 },
    DEALER: { ...base, rMin: 184, rMax: 305, fleeBias: 22, bias: 12, aimJitter: 0.18, strafe: 34, jSeed: 7 },
    NORMAL: { ...base, rMin: 170, rMax: 298, fleeBias: 16, bias: 4, jSeed: 3 },
  };

  for (let i = 0; i < roles.length; i++) {
    const role = roles[i];
    const P = { ...presets[role.kind], bias: presets[role.kind].bias + (role.bias||0), rMin: presets[role.kind].rMin + (role.rMin||0), rMax: presets[role.kind].rMax + (role.rMax||0), jSeed: presets[role.kind].jSeed + i };
    const botName = `${namePrefix}-${i+1}`;
    const tankType = role.kind === 'TANKER' ? 'Type.TANKER' : (role.kind === 'DEALER' ? 'Type.DEALER' : 'Type.NORMAL');
    bots.push(makeBotCode(botName, tankType, P, `__s${i+1}`));
  }
  return bots.join('\n\n\n// ===== 다음 로봇 =====\n\n');
}

module.exports = { buildTeam };

