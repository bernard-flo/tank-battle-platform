#!/usr/bin/env node
/*
  Team code generator for tank_battle_platform.html
  Outputs a single text blob containing 6 robots (function name/type/update) blocks
  separated by "// ===== 다음 로봇 =====" that the HTML importer and simulator accept.

  Usage:
    node generate_team.js --out team.txt --prefix Nova --style v1
*/

const fs = require('fs');
const path = require('path');

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith('--')) { args[key] = next; i++; }
      else { args[key] = true; }
    }
  }
  return args;
}

// Role presets drive type() and behavior biases
const Roles = {
  TANKER: { type: 'Type.TANKER', base: { rMin: 160, rMax: 260, strafe: 26, threatR: 190, fleeBias: 14 } },
  NORMAL: { type: 'Type.NORMAL', base: { rMin: 170, rMax: 270, strafe: 28, threatR: 185, fleeBias: 16 } },
  DEALER: { type: 'Type.DEALER', base: { rMin: 180, rMax: 300, strafe: 32, threatR: 180, fleeBias: 18 } },
};

function clamp(v, lo, hi){ return v < lo ? lo : v > hi ? hi : v; }

// Build a single robot block with embedded parameters
function buildRobot(name, role, biasDeg, seedOffset, params) {
  const rolePreset = Roles[role];
  const P = { ...rolePreset.base, ...params };
  // Serialize numeric params to compact JSON-like literal
  const PLIT = JSON.stringify({
    rMin: P.rMin, rMax: P.rMax, strafe: P.strafe, threatR: P.threatR, fleeBias: P.fleeBias,
    sep: P.sep ?? 60, edge: P.edge ?? 54, leadCap: P.leadCap ?? 14, leadW: P.leadW ?? 0.95,
    aimJitter: P.aimJitter ?? 0.14, healthW: P.healthW ?? 1.2, distW: P.distW ?? 0.12,
    finisherHP: P.finisherHP ?? 28, aggrRemain: P.aggrRemain ?? 3, aggrIn: P.aggrIn ?? 22, aggrOut: P.aggrOut ?? 16,
    bias: biasDeg, horizon: P.horizon ?? 10, samp: P.samp ?? 7, avoidW: P.avoidW ?? 1.0,
    edgeW: P.edgeW ?? 0.5, sepW: P.sepW ?? 0.35, rangeW: P.rangeW ?? 0.22,
  });

  // The AI code is compact but readable enough; avoid external globals.
  return (
`function name(){return ${JSON.stringify(name)};}
function type(){return ${rolePreset.type};}
let __s${seedOffset}={last:null,lastVel:null,tick:0};
function update(tank,enemies,allies,bulletInfo){
  "use strict";
  const P=${PLIT};
  const toDeg=(x,y)=>Math.atan2(y,x)*180/Math.PI, toRad=(a)=>a*Math.PI/180, H=Math.hypot;
  const norm=(a)=>{a%=360; if(a<0)a+=360; return a;};
  const rnd=((tank.x*97+tank.y*131+${seedOffset})|0)%2?1:-1; __s${seedOffset}.tick=(__s${seedOffset}.tick||0)+1;

  // 1) Target selection: weighted by health and distance
  let tgt=null,b=1e9; for(const e of enemies){ const k=e.health*P.healthW + e.distance*P.distW; if(k<b){b=k;tgt=e;} }

  // 2) Predictive aim with EW smoothing of enemy velocity and cap by leadCap
  if(tgt){ let ax=tgt.x, ay=tgt.y; if(__s${seedOffset}.last){
      const vx=tgt.x-__s${seedOffset}.last.x, vy=tgt.y-__s${seedOffset}.last.y;
      const lvx=__s${seedOffset}.lastVel?__s${seedOffset}.lastVel.vx:0, lvy=__s${seedOffset}.lastVel?__s${seedOffset}.lastVel.vy:0;
      const svx=lvx*0.55+vx*0.45, svy=lvy*0.55+vy*0.45; __s${seedOffset}.lastVel={vx:svx,vy:svy};
      const d=H(tgt.x-tank.x,tgt.y-tank.y); const t=clamp(d/8,0,P.leadCap); ax=tgt.x+svx*P.leadW*t; ay=tgt.y+svy*P.leadW*t; }
    const jitter=((((tank.x*31+tank.y*17+${seedOffset})%23)-11)*0.07)*P.aimJitter; tank.fire(toDeg(ax-tank.x,ay-tank.y)+jitter); __s${seedOffset}.last={x:tgt.x,y:tgt.y}; }

  let tries=0; const go=(a)=>{tries++; return tank.move(norm(a));};

  // 3) Bullet avoidance with time-to-closest-approach heuristic and multi-candidate sampling
  let hot=null,score=1e9; for(const bu of bulletInfo){ const dx=bu.x-tank.x, dy=bu.y-tank.y; const v=H(bu.vx,bu.vy)||1; const nx=bu.vx/v, ny=bu.vy/v; const proj=dx*nx+dy*ny; if(proj>0){ const px=bu.x-proj*nx, py=bu.y-proj*ny; const d=H(px-tank.x,py-tank.y); const tt=proj/v; const sc=d + tt*4; if(d<P.threatR && sc<score){ score=sc; hot=bu; } } }
  if(hot){ const a=toDeg(hot.vx,hot.vy); const side=(rnd>0?1:-1)*P.fleeBias + P.bias*0.6; const cand=[a+90+side, a-90-side, a+120, a-120, a+70, a-70, a+150, a-150]; for(const c of cand){ if(go(c)) return; }}

  // 4) Edge avoidance
  if(tank.x<P.edge){ if(go(0))return; } if(tank.x>900-P.edge){ if(go(180))return; } if(tank.y<P.edge){ if(go(90))return; } if(tank.y>600-P.edge){ if(go(270))return; }

  // 5) Ally separation
  let near=null,ad=1e9; for(const a of allies){ if(a.distance<ad){ad=a.distance;near=a;} } if(near && ad<P.sep){ const away=toDeg(tank.x-near.x,tank.y-near.y); if(go(away))return; if(go(away+22))return; if(go(away-22))return; }

  // 6) Range control relative to target
  if(tgt){ const to=toDeg(tgt.x-tank.x,tgt.y-tank.y), d=tgt.distance; let minR=P.rMin, maxR=P.rMax; if((tgt.health<=P.finisherHP)||enemies.length<=P.aggrRemain){ minR-=P.aggrIn; maxR-=P.aggrOut; }
    if(d<minR){ const away=to+180+P.bias*0.4; if(go(away))return; if(go(away+18))return; if(go(away-18))return; }
    else if(d>maxR){ if(go(to))return; if(go(to+14))return; if(go(to-14))return; }
    else { const side=to + (((${seedOffset}+(__s${seedOffset}.tick>>2))%2)?P.strafe:-P.strafe) + P.bias*0.5; if(go(side))return; if(go(side+16))return; if(go(side-16))return; } }

  // 7) Fallback sweep
  const sweep=[0,45,90,135,180,225,270,315]; for(const s of sweep){ if(go(s+P.bias)) return; }
}
`);
}

function buildTeam(prefix, style, tweak = {}) {
  // Layout: [TANKER, DEALER, NORMAL, TANKER, DEALER, NORMAL]
  const roles = ['TANKER','DEALER','NORMAL','TANKER','DEALER','NORMAL'];
  const biases = [-10, 8, -4, 12, -12, 6]; // slight angular biases for dispersion
  const blocks = [];
  for (let i=0;i<6;i++) {
    // minor per-slot tweaks for diversity
    const role = roles[i];
    const bias = biases[i] + (tweak.biasShift || 0);
    const base = {
      rMin: clamp((tweak.rMin ?? 170) + (i%2?6:-6), 120, 260),
      rMax: clamp((tweak.rMax ?? 280) + (i%2?-10:10), 200, 340),
      strafe: clamp((tweak.strafe ?? 28) + ((i%3)-1)*2, 16, 40),
      threatR: clamp((tweak.threatR ?? 190) + ((i%2)?-6:6), 130, 240),
      fleeBias: clamp((tweak.fleeBias ?? 16) + ((i%2)?2:-2), 8, 28),
      sep: clamp((tweak.sep ?? 62) + (i%2?2:-2), 40, 90),
      edge: clamp((tweak.edge ?? 52), 36, 80),
      leadCap: clamp((tweak.leadCap ?? 14), 8, 18),
      leadW: clamp((tweak.leadW ?? 0.95), 0.7, 1.0),
      aimJitter: clamp((tweak.aimJitter ?? 0.16) + (i===1?0.02:0), 0.05, 0.3),
      healthW: clamp((tweak.healthW ?? 1.22), 0.6, 2.0),
      distW: clamp((tweak.distW ?? 0.14), 0.05, 0.6),
      finisherHP: clamp((tweak.finisherHP ?? 28), 10, 60),
      aggrRemain: clamp((tweak.aggrRemain ?? 3), 1, 6),
      aggrIn: clamp((tweak.aggrIn ?? 22), 0, 40),
      aggrOut: clamp((tweak.aggrOut ?? 16), 0, 40),
      biasShift: 0, horizon: clamp((tweak.horizon ?? 10), 6, 16), samp: clamp((tweak.samp ?? 7), 5, 11),
      avoidW: clamp((tweak.avoidW ?? 1.0), 0.4, 2.0), edgeW: clamp((tweak.edgeW ?? 0.5), 0.2, 1.5), sepW: clamp((tweak.sepW ?? 0.35), 0.1, 1.5), rangeW: clamp((tweak.rangeW ?? 0.22), 0.1, 1.0)
    };
    const n = `${prefix}-${i+1}`;
    blocks.push(buildRobot(n, role, bias, i+1, base));
  }
  return blocks.join('\n\n// ===== 다음 로봇 =====\n\n');
}

function main(){
  const args = parseArgs(process.argv);
  const out = args.out || 'team.txt';
  const prefix = args.prefix || 'Nova';
  const style = args.style || 'v1';
  // tweak params via JSON file or inline JSON
  let tweak = {};
  if (args.tweakFile) tweak = JSON.parse(fs.readFileSync(path.resolve(args.tweakFile), 'utf8'));
  if (args.tweak) tweak = { ...tweak, ...JSON.parse(args.tweak) };
  const code = buildTeam(prefix, style, tweak);
  fs.writeFileSync(path.resolve(out), code);
  console.log(`Generated team -> ${out} (prefix=${prefix}, style=${style})`);
}

if (require.main === module) main();

module.exports = { buildTeam };

