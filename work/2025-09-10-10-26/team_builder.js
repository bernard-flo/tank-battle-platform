// Team code generator for tank_battle_platform.html import format
// Produces a single string that concatenates 6 robots separated implicitly by function name() blocks.

const { Type } = require('../../simulator/engine');

function makeBot(name, tankType, P, biasSeed = 0) {
  // Compact yet strong AI with predictive aim, bullet dodging, spacing, strafe, edge+ally avoidance.
  // The code is emitted as a self-contained block with function name/type/update.
  const code = `function name(){return ${JSON.stringify(name)};}
function type(){return ${tankType === Type.TANKER ? 'Type.TANKER' : tankType === Type.DEALER ? 'Type.DEALER' : 'Type.NORMAL'};}
let __state={last:null,lastVel:null,tick:0};
function update(tank,enemies,allies,bulletInfo){
  const toDeg=(x,y)=>Math.atan2(y,x)*180/Math.PI, H=Math.hypot;
  const norm=(a)=>{a%=360; if(a<0)a+=360; return a;}, clamp=(v,lo,hi)=>v<lo?lo:v>hi?hi:v;
  const rnd=((tank.x*97+tank.y*131+${biasSeed})|0)%2?1:-1; const P=${JSON.stringify(P)};
  __state.tick=(__state.tick||0)+1;
  // Target: weigh health and distance; prefer low HP and closer
  let tgt=null,b=1e9; for(const e of enemies){ const k=e.health*P.healthW + e.distance*P.distW; if(k<b){b=k;tgt=e;} }
  if(tgt){
    // Predictive fire with smoothed velocity estimate and capped lead time
    let ax=tgt.x, ay=tgt.y;
    if(__state.last){
      const vx=tgt.x-__state.last.x, vy=tgt.y-__state.last.y;
      const lvx=__state.lastVel?__state.lastVel.vx:0, lvy=__state.lastVel?__state.lastVel.vy:0;
      const svx=lvx*0.6+vx*0.4, svy=lvy*0.6+vy*0.4; __state.lastVel={vx:svx,vy:svy};
      const d=H(tgt.x-tank.x,tgt.y-tank.y); const t=clamp(d/8,0,P.leadCap); ax=tgt.x+svx*P.leadW*t; ay=tgt.y+svy*P.leadW*t;
    }
    const jitter=((((tank.x*31+tank.y*17+${biasSeed})%23)-11)*0.07)*P.aimJitter; tank.fire(toDeg(ax-tank.x,ay-tank.y)+jitter);
    __state.last={x:tgt.x,y:tgt.y};
  }
  // Movement helper
  let tries=0; const go=(a)=>{tries++; return tank.move(norm(a));};
  // Bullet avoidance: pick hostile bullet approaching and near closest-approach
  let hot=null,minR=1e9; for(const bu of bulletInfo){ const dx=bu.x-tank.x, dy=bu.y-tank.y; const v=H(bu.vx,bu.vy)||1; const nx=bu.vx/v, ny=bu.vy/v; const proj=dx*nx+dy*ny; if(proj>0){ const px=bu.x-proj*nx, py=bu.y-proj*ny; const d=H(px-tank.x,py-tank.y); if(d<minR && d<P.threatR){minR=d;hot=bu;} } }
  if(hot){ const a=toDeg(hot.vx,hot.vy); const side=(rnd>0?1:-1)*P.fleeBias + P.bias*0.6; const cand=[a+90+side,a-90-side,a+130,a-130,a+70,a-70]; for(const c of cand){ if(go(c)) return; } }
  // Edge avoidance
  if(tank.x<P.edge){ if(go(0))return; } if(tank.x>900-P.edge){ if(go(180))return; } if(tank.y<P.edge){ if(go(90))return; } if(tank.y>600-P.edge){ if(go(270))return; }
  // Ally separation
  let near=null,ad=1e9; for(const a of allies){ if(a.distance<ad){ad=a.distance;near=a;} } if(near && ad<P.sep){ const away=toDeg(tank.x-near.x,tank.y-near.y); if(go(away))return; if(go(away+22))return; if(go(away-22))return; }
  // Spacing + strafe around target
  if(tgt){ const to=toDeg(tgt.x-tank.x,tgt.y-tank.y), d=tgt.distance; let minR=P.rMin, maxR=P.rMax; if((tgt.health<=P.finisherHP)||enemies.length<=P.aggrRemain){minR-=P.aggrIn; maxR-=P.aggrOut;} if(d<minR){ const away=to+180+P.bias*0.4; if(go(away))return; if(go(away+18))return; if(go(away-18))return; } else if(d>maxR){ if(go(to))return; if(go(to+14))return; if(go(to-14))return; } else { const side=to + ((((tank.x*13+tank.y*7+${biasSeed})|0)%2)?P.strafe:-P.strafe) + P.bias*0.5; if(go(side))return; if(go(side+16))return; if(go(side-16))return; } }
  // Fallback sweep
  const sweep=[0,45,90,135,180,225,270,315]; for(const s of sweep){ if(go(s+P.bias)) return; }
}
`;
  return code;
}

function buildTeamCode(config) {
  // config: { teamName, roster: [ { name, type, P, biasSeed }, ... 6 items ] }
  const parts = config.roster.map((r) => makeBot(r.name, r.type, r.P, r.biasSeed || 0));
  return parts.join('\n\n// ===== 다음 로봇 =====\n\n');
}

function defaultRoster(prefix = 'Ares', seed = 0) {
  // Provide a strong default roster: 2 Tankers front, 3 Dealers back, 1 Normal flex
  const base = {
    tanker: { rMin: 185, rMax: 275, strafe: 32, threatR: 150, fleeBias: 14, sep: 66, edge: 56, leadCap: 12, leadW: 0.9, aimJitter: 0.18, healthW: 1.15, distW: 0.17, finisherHP: 26, aggrRemain: 4, aggrIn: 26, aggrOut: 18 },
    dealer: { rMin: 230, rMax: 340, strafe: 28, threatR: 120, fleeBias: 12, sep: 66, edge: 56, leadCap: 16, leadW: 0.85, aimJitter: 0.10, healthW: 1.20, distW: 0.20, finisherHP: 30, aggrRemain: 5, aggrIn: 22, aggrOut: 20 },
    normal: { rMin: 210, rMax: 300, strafe: 30, threatR: 135, fleeBias: 13, sep: 66, edge: 56, leadCap: 14, leadW: 0.88, aimJitter: 0.14, healthW: 1.18, distW: 0.18, finisherHP: 28, aggrRemain: 5, aggrIn: 24, aggrOut: 19 },
  };
  const mkP = (baseP, bias) => ({ ...baseP, bias });
  return [
    { name: `${prefix}-T1`, type: Type.TANKER, P: mkP(base.tanker, -12), biasSeed: seed + 1 },
    { name: `${prefix}-T2`, type: Type.TANKER, P: mkP(base.tanker, +13), biasSeed: seed + 2 },
    { name: `${prefix}-D3`, type: Type.DEALER, P: mkP(base.dealer, -6), biasSeed: seed + 3 },
    { name: `${prefix}-D4`, type: Type.DEALER, P: mkP(base.dealer, +7), biasSeed: seed + 4 },
    { name: `${prefix}-D5`, type: Type.DEALER, P: mkP(base.dealer, -3), biasSeed: seed + 5 },
    { name: `${prefix}-N6`, type: Type.NORMAL, P: mkP(base.normal, +4), biasSeed: seed + 6 },
  ];
}

function buildDefaultTeam(prefix = 'Ares', seed = 0) {
  return buildTeamCode({ roster: defaultRoster(prefix, seed) });
}

module.exports = { buildTeamCode, defaultRoster, buildDefaultTeam };

