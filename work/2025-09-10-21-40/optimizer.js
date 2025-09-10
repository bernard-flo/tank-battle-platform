#!/usr/bin/env node
/*
  Optimizer for Tech of Tank AI teams.
  - Scans existing results in result/ for opponent team code (*.txt)
  - Evolves a parameterized 6-bot team using random search
  - Evaluates vs top-N recent opponents using simulator CLI with batching
  - Writes final team code to result/<TS>/<TS>.txt and a RESULT.md summary in work/<TS>
*/
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const os = require('os');
const cp = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const RESULT_DIR = path.join(ROOT, 'result');
const TS = path.basename(path.resolve(__dirname));
const WORK_DIR = path.resolve(__dirname);
const OUT_DIR = path.join(RESULT_DIR, TS);
const OUT_CODE = path.join(OUT_DIR, `${TS}.txt`);

function sh(cmd, opts = {}) {
  return cp.execSync(cmd, { stdio: 'pipe', encoding: 'utf8', ...opts });
}

function listOpponentFiles(limit = 8) {
  // Find *.txt in result/ root and its immediate subdirs, sorted by mtime desc
  const entries = [];
  const rootFiles = fs.readdirSync(RESULT_DIR);
  for (const f of rootFiles) {
    const p = path.join(RESULT_DIR, f);
    try {
      const st = fs.statSync(p);
      if (st.isFile() && f.endsWith('.txt')) {
        entries.push({ p, mtime: st.mtimeMs });
      } else if (st.isDirectory()) {
        // look for *.txt inside
        const sub = fs.readdirSync(p).filter(x => x.endsWith('.txt'));
        for (const s of sub) {
          const sp = path.join(p, s);
          const sst = fs.statSync(sp);
          entries.push({ p: sp, mtime: sst.mtimeMs });
        }
      }
    } catch (_) {}
  }
  entries.sort((a, b) => b.mtime - a.mtime);
  // Exclude our own output if rerun
  const filtered = entries.filter(e => !e.p.includes(`/${TS}/`));
  return filtered.slice(0, limit).map(e => e.p);
}

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

function baseParams() {
  return {
    rMin: 210,     // desired min engage distance
    rMax: 320,     // desired max engage distance
    strafe: 28,    // lateral movement bias
    threatR: 120,  // bullet avoidance radius
    fleeBias: 18,  // perpendicular offset when dodging
    sep: 68,       // ally separation distance
    edge: 58,      // edge avoidance buffer
    leadCap: 15.5, // max seconds for lead estimate (scaled by 1 tick units)
    leadW: 0.86,   // blending factor for lead distance
    aimJitter: 0.15, // small spread to desync shots
    healthW: 1.10,   // target score weight for health
    distW: 0.21,     // target score weight for distance
    finisherHP: 28,  // become aggressive when target HP below this
    aggrRemain: 2,   // aggression persistence ticks
    aggrIn: 14,      // shrink inner radius when aggressive
    aggrOut: 20,     // shrink outer radius when aggressive
    bias: 6,         // global angle bias per bot (will be shifted)
  };
}

function mutateParams(p, scale = 1.0, rng = Math.random) {
  const q = { ...p };
  function jitter(key, amt, min, max) {
    const v = q[key] + (rng()*2-1) * amt * scale;
    q[key] = clamp(v, min, max);
  }
  jitter('rMin', 40, 120, 320);
  jitter('rMax', 60, 200, 420);
  if (q.rMax < q.rMin + 50) q.rMax = q.rMin + 50;
  jitter('strafe', 15, 8, 50);
  jitter('threatR', 30, 80, 160);
  jitter('fleeBias', 12, 8, 40);
  jitter('sep', 20, 40, 100);
  jitter('edge', 10, 40, 80);
  jitter('leadCap', 4, 8, 20);
  jitter('leadW', 0.12, 0.75, 0.98);
  jitter('aimJitter', 0.18, 0, 0.35);
  jitter('healthW', 0.2, 0.8, 1.4);
  jitter('distW', 0.1, 0.05, 0.5);
  jitter('finisherHP', 10, 15, 45);
  jitter('aggrRemain', 2, 0, 6);
  jitter('aggrIn', 10, 0, 40);
  jitter('aggrOut', 10, 0, 40);
  jitter('bias', 20, -30, 30);
  return q;
}

function botCodeTemplate(idx, name, typeId, Pobj) {
  // Inject a distinct phase to decorrelate movement and aiming jitter per bot
  const phase = idx + 1; // 1..6
  const P = JSON.stringify(Pobj);
  return `function name(){return "${name}";}
function type(){return ${typeId};}
let __s={last:null,lastVel:null,tick:0,aggr:0};
function update(tank,enemies,allies,bulletInfo){
  const toDeg=(x,y)=>Math.atan2(y,x)*180/Math.PI, H=Math.hypot;
  const norm=(a)=>{a%=360; if(a<0)a+=360; return a;}, clamp=(v,lo,hi)=>v<lo?lo:v>hi?hi:v;
  const P=${P};
  __s.tick=(__s.tick||0)+1; __s.aggr=Math.max(0,(__s.aggr||0)-1);

  // Target selection: prioritize low HP and closer distance
  let tgt=null,b=1e9; for(const e of enemies){ const score=e.health*P.healthW + e.distance*P.distW; if(score<b){b=score;tgt=e;} }
  if(tgt){
    // Predictive fire with smoothed velocity estimate and capped lead time
    let ax=tgt.x, ay=tgt.y;
    if(__s.last){
      const vx=tgt.x-__s.last.x, vy=tgt.y-__s.last.y;
      const lvx=__s.lastVel?__s.lastVel.vx:0, lvy=__s.lastVel?__s.lastVel.vy:0;
      const svx=lvx*0.6+vx*0.4, svy=lvy*0.6+vy*0.4; __s.lastVel={vx:svx,vy:svy};
      const d=H(tgt.x-tank.x,tgt.y-tank.y); const t=clamp(d/8,0,P.leadCap); ax=tgt.x+svx*P.leadW*t; ay=tgt.y+svy*P.leadW*t;
    }
    const jitter=(((__s.tick*31+${phase})%23)-11)*0.07*P.aimJitter; tank.fire(toDeg(ax-tank.x,ay-tank.y)+jitter);
    __s.last={x:tgt.x,y:tgt.y};
  }

  // Movement helpers
  let tries=0; const go=(a)=>{tries++; return tank.move(norm(a));};
  const trySet=(arr)=>{ for(const a of arr){ if(go(a)) return true; } return false; };

  // Bullet avoidance: consider bullets with positive closing projection and small miss distance
  let hot=null,minR=1e9; for(const bu of bulletInfo){ const dx=bu.x-tank.x, dy=bu.y-tank.y; const v=H(bu.vx,bu.vy)||1; const nx=bu.vx/v, ny=bu.vy/v; const proj=dx*nx+dy*ny; if(proj>0){ const px=bu.x-proj*nx, py=bu.y-proj*ny; const d=H(px-tank.x,py-tank.y); if(d<minR && d<P.threatR){minR=d;hot=bu;} } }
  if(hot){ const a=toDeg(hot.vx,hot.vy); const side=((${phase}+1)%2?1:-1)*P.fleeBias + P.bias*0.6; if(trySet([a+90+side,a-90-side,a+130,a-130,a+70,a-70])) return; }

  // Edge avoidance (prefer turning inward)
  if(tank.x<P.edge){ if(go(0))return; } if(tank.x>900-P.edge){ if(go(180))return; } if(tank.y<P.edge){ if(go(90))return; } if(tank.y>600-P.edge){ if(go(270))return; }

  // Ally separation
  let near=null,ad=1e9; for(const a of allies){ if(a.distance<ad){ad=a.distance;near=a;} } if(near && ad<P.sep){ const away=toDeg(tank.x-near.x,tank.y-near.y); if(trySet([away,away+28,away-28])) return; }

  // Engagement ring with adaptive aggression towards low-HP targets
  if(tgt){
    const to=toDeg(tgt.x-tank.x,tgt.y-tank.y); const d=tgt.distance;
    let minR=P.rMin, maxR=P.rMax;
    if(tgt.health<P.finisherHP) { __s.aggr=P.aggrRemain; }
    if(__s.aggr>0) { minR-=P.aggrIn; maxR-=P.aggrOut; }
    if(d<minR){ if(trySet([to+180+P.bias,to+150,to+210,to+180+P.bias*0.5])) return; }
    if(d>maxR){ if(trySet([to+P.bias,to+P.bias+20,to+P.bias-20])) return; }
    const strafe = P.strafe + ((__s.tick>>3)%2?8:-8);
    if(trySet([to+90+strafe+P.bias, to-90-strafe+P.bias, to+60, to-60])) return;
  }

  // Fallback wandering to break symmetry and avoid deadlocks
  const r=((__s.tick*13+${phase+2})%360)+P.bias; trySet([r, r+120, r-120]);
}
`;
}

function buildTeamCode(paramsSeed) {
  // Compose 6 bots with slight param variations and mixed types
  const names = ['Aegis-1','Aegis-2','Aegis-3','Aegis-4','Aegis-5','Aegis-6'];
  // Types: 2 Tankers front-liners, 2 Normals, 2 Dealers
  const types = [1,1,0,0,2,2];
  const bots = [];
  const rng = (s => () => (s = (s*1664525+1013904223)>>>0, (s>>>8)/16777216))(paramsSeed>>>0);
  const base = baseParams();
  for (let i = 0; i < 6; i++) {
    const scale = 0.6 + 0.6 * rng();
    const p = mutateParams(base, scale, rng);
    // Nudge distance band per role
    if (types[i] === 1) { // tanker: closer pressure
      p.rMin = clamp(p.rMin - 20, 120, 360);
      p.rMax = clamp(p.rMax - 10, 180, 480);
      p.sep = clamp(p.sep + 6, 30, 120);
    } else if (types[i] === 2) { // dealer: longer kiting
      p.rMin = clamp(p.rMin + 10, 120, 420);
      p.rMax = clamp(p.rMax + 30, 200, 520);
      p.strafe = clamp(p.strafe + 6, 5, 60);
    }
    // Unique bias per bot
    p.bias = clamp((p.bias||0) + (i-2.5)*4, -45, 45);
    bots.push(botCodeTemplate(i, names[i], types[i], p));
  }
  return bots.join('\n\n// ===== 다음 로봇 =====\n\n');
}

function evaluateTeam(candidateFile, opponents, opts = {}) {
  const cli = path.join(ROOT, 'simulator', 'cli.js');
  const repeats = opts.repeats || 60; // per side
  const seed = opts.seed || 12345;
  const concurrency = opts.concurrency || Math.min(8, os.cpus().length || 2);
  let totalWins = 0;
  let totalMatches = 0;
  const details = [];

  for (const opp of opponents) {
    for (const side of ['red','blue']) {
      const red = side === 'red' ? candidateFile : opp;
      const blue = side === 'red' ? opp : candidateFile;
      const cmd = `node ${cli} --red ${red} --blue ${blue} --repeat ${repeats} --seed ${seed} --fast --runner secure --concurrency ${concurrency}`;
      const out = sh(cmd);
      // Parse summary line "Wins   - Red: X, Blue: Y, Draws: Z"
      const m = out.match(/Wins\s+-\s+Red:\s+(\d+),\s+Blue:\s+(\d+),\s+Draws:\s+(\d+)/);
      let redWins=0, blueWins=0, draws=0;
      if (m) { redWins = +m[1]; blueWins = +m[2]; draws = +m[3]; }
      const wins = (side === 'red') ? redWins : blueWins;
      const matches = redWins + blueWins + draws;
      totalWins += wins;
      totalMatches += matches;
      details.push({ opponent: opp, side, redWins, blueWins, draws });
    }
  }

  const winRate = totalMatches ? totalWins / totalMatches : 0;
  return { winRate, totalWins, totalMatches, details };
}

function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const opponents = listOpponentFiles(8);
  if (opponents.length === 0) {
    console.log('No opponent *.txt found in result/. Creating default team without evaluation.');
    const code = buildTeamCode(Date.now()|0);
    fs.writeFileSync(OUT_CODE, code);
    console.log('Wrote team ->', OUT_CODE);
    return;
  }
  console.log('Opponents:', opponents.map(p=>path.basename(path.dirname(p)) + '/' + path.basename(p)).join(', '));

  const tmpCand = path.join(WORK_DIR, 'candidate.txt');
  const iters = 10;
  const repeats = 80; // per side
  let best = { winRate: -1, seed: 0, details: [] };

  for (let i = 0; i < iters; i++) {
    const seed = (Date.now() * 1103515245 + i) >>> 0;
    const code = buildTeamCode(seed);
    fs.writeFileSync(tmpCand, code);
    const res = evaluateTeam(tmpCand, opponents, { repeats, seed: 777 + i, concurrency: Math.min(8, os.cpus().length || 2) });
    console.log(`Iter ${i+1}/${iters}: seed=${seed} winRate=${(res.winRate*100).toFixed(2)}% (${res.totalWins}/${res.totalMatches})`);
    if (res.winRate > best.winRate) best = { ...res, seed, code };
  }

  fs.writeFileSync(OUT_CODE, best.code || buildTeamCode(best.seed));
  console.log('Best seed:', best.seed, 'winRate:', (best.winRate*100).toFixed(2)+'%');
  console.log('Wrote team ->', OUT_CODE);

  // Write RESULT.md
  const md = [];
  md.push(`# Result Summary - ${TS}`);
  md.push('');
  md.push(`Opponents evaluated (${opponents.length}):`);
  for (const opp of opponents) md.push(`- ${opp}`);
  md.push('');
  md.push(`Best seed: ${best.seed}`);
  md.push(`Best win rate: ${(best.winRate*100).toFixed(2)}% (${best.totalWins}/${best.totalMatches})`);
  md.push('');
  md.push('Pairwise details:');
  for (const d of best.details) {
    md.push(`- vs ${d.opponent} as ${d.side}: Red ${d.redWins} / Blue ${d.blueWins} / Draws ${d.draws}`);
  }
  fs.writeFileSync(path.join(WORK_DIR, 'RESULT.md'), md.join('\n'));
}

if (require.main === module) {
  main();
}

