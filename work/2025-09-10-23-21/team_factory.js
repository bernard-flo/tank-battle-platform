// Generates a 6-robot team code string compatible with tank_battle_platform.html and simulator
// Each robot defines: function name(), function type(), function update(...)

function makeRobotCode(role) {
  // role: { name, tankType, P, biasName }
  // P: parameter object controlling behavior
  const { name, tankType, P } = role;
  const code = `function name(){return ${JSON.stringify(name)};}
function type(){return ${tankType};}
let __state = { tick:0, lastTgt:null, lastVel:{vx:0,vy:0} };
function update(tank,enemies,allies,bulletInfo){
  "use strict";
  const W=900,H=600;
  const toDeg=(x,y)=>Math.atan2(y,x)*180/Math.PI;
  const toRad=(a)=>a*Math.PI/180;
  const norm=(a)=>{a%=360; if(a<0)a+=360; return a;};
  const clamp=(v,lo,hi)=>v<lo?lo:v>hi?hi:v;
  const hypot=Math.hypot;
  const P=${JSON.stringify(P)};

  __state.tick=(__state.tick||0)+1;

  // 1) Target selection: health-first, distance-second
  let tgt=null, best=1e12;
  for(const e of enemies){
    const s = e.health*P.targetHealthWeight + e.distance*P.targetDistWeight;
    if(s<best){best=s; tgt=e;}
  }

  // 2) Predictive aim by analytic intercept using est. velocity
  if(tgt){
    // Estimate target velocity (EMA)
    if(__state.lastTgt){
      const vx=(tgt.x-__state.lastTgt.x);
      const vy=(tgt.y-__state.lastTgt.y);
      __state.lastVel.vx = __state.lastVel.vx*P.velEma + vx*(1-P.velEma);
      __state.lastVel.vy = __state.lastVel.vy*P.velEma + vy*(1-P.velEma);
    }
    const rx=tgt.x-tank.x, ry=tgt.y-tank.y;
    const vx=__state.lastVel.vx, vy=__state.lastVel.vy; // px/tick
    const vb=8.0; // bullet speed px/tick
    const a = (vx*vx+vy*vy) - vb*vb;
    const b = 2*(rx*vx+ry*vy);
    const c = rx*rx+ry*ry;
    let t = 0;
    if (Math.abs(a) < 1e-6) {
      t = c>0 ? -c/b : 0; // linear
    } else {
      const d = b*b - 4*a*c;
      if (d >= 0) {
        const s1 = (-b + Math.sqrt(d)) / (2*a);
        const s2 = (-b - Math.sqrt(d)) / (2*a);
        t = Math.min(s1, s2);
        if (t < 0) t = Math.max(s1, s2);
      } else {
        t = 0;
      }
    }
    t = clamp(t, 0, P.leadCap);
    const aimX = tgt.x + vx*t*P.leadWeight;
    const aimY = tgt.y + vy*t*P.leadWeight;
    const jitter = ((((tank.x*31+tank.y*17)%23)-11)*0.08) * P.aimJitter;
    const fireAngle = toDeg(aimX-tank.x, aimY-tank.y) + jitter + P.fireBias;
    tank.fire(fireAngle);
    __state.lastTgt={x:tgt.x,y:tgt.y};
  }

  // Movement helpers
  let tries=0; const tryMove=(a)=>{tries++; return tank.move(norm(a));};

  // 3) Bullet avoidance using closest approach
  let hot=null, minD=1e9, minT=1e9;
  for(const b of bulletInfo){
    const dx=b.x-tank.x, dy=b.y-tank.y; const v=hypot(b.vx,b.vy)||1;
    const nx=b.vx/v, ny=b.vy/v; // bullet unit velocity
    const proj=dx*nx+dy*ny; // forward distance along bullet path
    if(proj>0){
      const px=b.x-proj*nx, py=b.y-proj*ny; // closest point on path
      const d=hypot(px-tank.x,py-tank.y);
      const tca=proj/v; // ticks to closest approach
      if(d<minD && d<P.threatRadius && tca<P.threatTime){ minD=d; minT=tca; hot=b; }
    }
  }
  if(hot){
    const a=toDeg(hot.vx,hot.vy);
    // Prefer perpendicular escape but bias away if very close
    const fleeBias = (minD< P.threatTight ? P.threatFleeBias+10 : P.threatFleeBias);
    const cands=[a+90+P.sidePref+fleeBias, a-90-P.sidePref-fleeBias, a+120, a-120, a+60, a-60];
    for(const c of cands){ if(tryMove(c)) return; }
  }

  // 4) Edge avoidance
  if(tank.x < P.edgeMargin){ if(tryMove(0+P.bias)) return; }
  if(tank.x > W-P.edgeMargin){ if(tryMove(180+P.bias)) return; }
  if(tank.y < P.edgeMargin){ if(tryMove(90+P.bias)) return; }
  if(tank.y > H-P.edgeMargin){ if(tryMove(270+P.bias)) return; }

  // 5) Ally separation (closest only)
  let near=null, ad=1e9; for(const a of allies){ if(a.distance<ad){ ad=a.distance; near=a; } }
  if(near && ad < P.allySep){
    const away=toDeg(tank.x-near.x,tank.y-near.y);
    if(tryMove(away)) return; if(tryMove(away+28)) return; if(tryMove(away-28)) return;
  }

  // 6) Engagement spacing + strafing
  if(tgt){
    const to = toDeg(tgt.x-tank.x, tgt.y-tank.y);
    const d = tgt.distance;
    let minR=P.minRange, maxR=P.maxRange;
    const remain=enemies.length;
    if((tgt.health<=P.finishHp) || remain<=P.finishRemain){ minR-=P.finishMinDelta; maxR-=P.finishMaxDelta; }
    if(d < minR){
      const away = to+180 + P.bias*0.4; if(tryMove(away)) return; if(tryMove(away+22)) return; if(tryMove(away-22)) return;
    } else if(d > maxR){
      if(tryMove(to)) return; if(tryMove(to+18)) return; if(tryMove(to-18)) return;
    } else {
      const sign = (((tank.x*13+tank.y*7)|0)%2)?1:-1;
      const side = to + sign*P.strafeAngle + P.bias*0.5;
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

function makeTeam(params){
  // params: array of 6 role configs or undefined -> defaults
  const Type = { NORMAL: 0, TANKER: 1, DEALER: 2 };
  const defaults = [
    { name: 'Bulwark-L', tankType: 'Type.TANKER', P: {
      leadCap: 16, leadWeight: 1.00, aimJitter: 0.10, fireBias: 0,
      minRange: 170, maxRange: 300, strafeAngle: 24,
      threatRadius: 175, threatTime: 30, threatTight: 110, threatFleeBias: 12,
      allySep: 62, edgeMargin: 46, bias: -10, sidePref: -8,
      targetHealthWeight: 1.25, targetDistWeight: 0.10,
      finishHp: 24, finishRemain: 3, finishMinDelta: 30, finishMaxDelta: 24,
      velEma: 0.55
    }},
    { name: 'Bulwark-R', tankType: 'Type.TANKER', P: {
      leadCap: 16, leadWeight: 1.00, aimJitter: 0.10, fireBias: 0,
      minRange: 170, maxRange: 300, strafeAngle: 24,
      threatRadius: 175, threatTime: 30, threatTight: 110, threatFleeBias: 12,
      allySep: 62, edgeMargin: 46, bias: 10, sidePref: 8,
      targetHealthWeight: 1.25, targetDistWeight: 0.10,
      finishHp: 24, finishRemain: 3, finishMinDelta: 30, finishMaxDelta: 24,
      velEma: 0.55
    }},
    { name: 'Striker-1', tankType: 'Type.DEALER', P: {
      leadCap: 18, leadWeight: 1.02, aimJitter: 0.07, fireBias: 0,
      minRange: 250, maxRange: 420, strafeAngle: 36,
      threatRadius: 165, threatTime: 26, threatTight: 105, threatFleeBias: 15,
      allySep: 62, edgeMargin: 46, bias: -6, sidePref: 8,
      targetHealthWeight: 1.4, targetDistWeight: 0.08,
      finishHp: 22, finishRemain: 3, finishMinDelta: 28, finishMaxDelta: 22,
      velEma: 0.50
    }},
    { name: 'Striker-2', tankType: 'Type.DEALER', P: {
      leadCap: 18, leadWeight: 1.02, aimJitter: 0.07, fireBias: 0,
      minRange: 250, maxRange: 420, strafeAngle: 36,
      threatRadius: 165, threatTime: 26, threatTight: 105, threatFleeBias: 15,
      allySep: 62, edgeMargin: 46, bias: 6, sidePref: -8,
      targetHealthWeight: 1.4, targetDistWeight: 0.08,
      finishHp: 22, finishRemain: 3, finishMinDelta: 28, finishMaxDelta: 22,
      velEma: 0.50
    }},
    { name: 'Striker-3', tankType: 'Type.DEALER', P: {
      leadCap: 18, leadWeight: 1.02, aimJitter: 0.07, fireBias: 0,
      minRange: 250, maxRange: 420, strafeAngle: 36,
      threatRadius: 165, threatTime: 26, threatTight: 105, threatFleeBias: 15,
      allySep: 62, edgeMargin: 46, bias: -2, sidePref: 8,
      targetHealthWeight: 1.4, targetDistWeight: 0.08,
      finishHp: 22, finishRemain: 3, finishMinDelta: 28, finishMaxDelta: 22,
      velEma: 0.50
    }},
    { name: 'Anchor', tankType: 'Type.NORMAL', P: {
      leadCap: 16, leadWeight: 1.00, aimJitter: 0.10, fireBias: 0,
      minRange: 220, maxRange: 350, strafeAngle: 30,
      threatRadius: 168, threatTime: 30, threatTight: 110, threatFleeBias: 13,
      allySep: 62, edgeMargin: 46, bias: 4, sidePref: 8,
      targetHealthWeight: 1.32, targetDistWeight: 0.10,
      finishHp: 24, finishRemain: 3, finishMinDelta: 28, finishMaxDelta: 22,
      velEma: 0.55
    }},
  ];
  const cfgs = (Array.isArray(params) && params.length===6) ? params : defaults;
  const pieces = cfgs.map((role) => makeRobotCode(role).replace('Type.', 'Type.'));
  return pieces.join("\n\n// ===== 다음 로봇 =====\n\n");
}

module.exports = { makeTeam };

