#!/usr/bin/env node
/* eslint-disable no-console */
// High-performance team optimizer for tank_battle_platform.html using headless simulator.
// - Scans result/ for opponent .txt teams
// - Generates diversified candidate teams
// - Screens quickly vs newest opponents, then fully evaluates top candidates vs broader set
// - Exports best team to result/<RUN_ID>/<RUN_ID>.txt and writes RESULT.md

const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const os = require('os');
const { Worker } = require('worker_threads');

const ROOT = path.resolve(__dirname, '..', '..');
const RESULT_DIR = path.join(ROOT, 'result');
const RUN_ID = path.basename(path.resolve(__dirname));
const OUT_DIR = path.join(RESULT_DIR, RUN_ID);

function now() { return new Date().toISOString(); }

function hash(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

function withSeededRandom(seed, fn) {
  const prevRandom = Math.random;
  let s = (typeof seed === 'number' ? seed : hash(String(seed))) >>> 0;
  Math.random = function() {
    // xorshift32
    s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 0x100000000) / 0x100000000;
  };
  try { return fn(); } finally { Math.random = prevRandom; }
}

function randBetween(a, b) { return a + Math.random() * (b - a); }

function pickTypes() {
  // Role mix: 2 frontline tankers, 2 flexible normals, 2 backline dealers
  return [1, 1, 0, 0, 2, 2]; // 1=TANKER, 0=NORMAL, 2=DEALER
}

function jitter(v, p) { return v + randBetween(-p, p); }

function genParams(roleIndex) {
  // Tuned priors for robust engagement, kiting and survivability.
  const role = ['TANKER', 'TANKER', 'NORMAL', 'NORMAL', 'DEALER', 'DEALER'][roleIndex];
  const base = {
    rMin: role === 'TANKER' ? 170 : role === 'DEALER' ? 245 : 205,
    rMax: role === 'TANKER' ? 270 : role === 'DEALER' ? 365 : 305,
    strafe: role === 'DEALER' ? 35 : 28,
    threatR: role === 'TANKER' ? 180 : 125,
    fleeBias: role === 'TANKER' ? 14 : 20,
    sep: 64,
    edge: 56,
    leadCap: 14.5,
    leadW: 0.86,
    aimJitter: role === 'DEALER' ? 0.12 : 0.18,
    healthW: 1.12,
    distW: 0.2,
    finisherHP: role === 'DEALER' ? 34 : 28,
    aggrRemain: 3,
    aggrIn: 22,
    aggrOut: 18,
    bias: 0,
  };
  return {
    rMin: jitter(base.rMin, 28),
    rMax: jitter(base.rMax, 32),
    strafe: jitter(base.strafe, 9),
    threatR: jitter(base.threatR, 28),
    fleeBias: jitter(base.fleeBias, 6),
    sep: jitter(base.sep, 12),
    edge: jitter(base.edge, 10),
    leadCap: jitter(base.leadCap, 2.8),
    leadW: Math.max(0.7, Math.min(0.95, jitter(base.leadW, 0.12))),
    aimJitter: Math.max(0.08, Math.min(0.26, jitter(base.aimJitter, 0.1))),
    healthW: Math.max(0.9, Math.min(1.3, jitter(base.healthW, 0.14))),
    distW: Math.max(0.12, Math.min(0.35, jitter(base.distW, 0.09))),
    finisherHP: jitter(base.finisherHP, 10),
    aggrRemain: Math.max(1, Math.round(jitter(base.aggrRemain, 2))),
    aggrIn: jitter(base.aggrIn, 10),
    aggrOut: jitter(base.aggrOut, 10),
    bias: jitter(base.bias, 28),
  };
}

function robotBlock(idx, teamName, typeConst, params) {
  const botName = `${teamName}-${idx + 1}`;
  const P = JSON.stringify(params);
  return `function name(){return "${botName}";}
function type(){return ${typeConst};}
let __state={last:null,lastVel:null,tick:0};
function update(tank,enemies,allies,bulletInfo){
  const toDeg=(x,y)=>Math.atan2(y,x)*180/Math.PI, H=Math.hypot;
  const norm=(a)=>{a%=360; if(a<0)a+=360; return a;}, clamp=(v,lo,hi)=>v<lo?lo:v>hi?hi:v;
  const rnd=((tank.x*97+tank.y*131+${idx+1})|0)%2?1:-1; const P=${P};
  __state.tick=(__state.tick||0)+1;
  // Target: prefer low HP then nearer targets
  let tgt=null,b=1e9; for(const e of enemies){ const k=e.health*P.healthW + e.distance*P.distW; if(k<b){b=k;tgt=e;} }
  if(tgt){
    // Predictive aim with smoothed velocity estimate and capped lead time
    let ax=tgt.x, ay=tgt.y;
    if(__state.last){
      const vx=tgt.x-__state.last.x, vy=tgt.y-__state.last.y;
      const lvx=__state.lastVel?__state.lastVel.vx:0, lvy=__state.lastVel?__state.lastVel.vy:0;
      const svx=lvx*0.6+vx*0.4, svy=lvy*0.6+vy*0.4; __state.lastVel={vx:svx,vy:svy};
      const d=H(tgt.x-tank.x,tgt.y-tank.y); const t=clamp(d/8,0,P.leadCap); ax=tgt.x+svx*P.leadW*t; ay=tgt.y+svy*P.leadW*t;
    }
    const jitter=((((tank.x*31+tank.y*17+${idx+1})%23)-11)*0.07)*P.aimJitter; tank.fire(toDeg(ax-tank.x,ay-tank.y)+jitter);
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
  if(tgt){ const to=toDeg(tgt.x-tank.x,tgt.y-tank.y), d=tgt.distance; let minR=P.rMin, maxR=P.rMax; if((tgt.health<=P.finisherHP)||enemies.length<=P.aggrRemain){minR-=P.aggrIn; maxR-=P.aggrOut;} if(d<minR){ const away=to+180+P.bias*0.4; if(go(away))return; if(go(away+18))return; if(go(away-18))return; } else if(d>maxR){ if(go(to))return; if(go(to+14))return; if(go(to-14))return; } else { const side=to + ((((tank.x*13+tank.y*7+${idx+1})|0)%2)?P.strafe:-P.strafe) + P.bias*0.5; if(go(side))return; if(go(side+16))return; if(go(side-16))return; } }
  // Fallback sweep
  const sweep=[0,45,90,135,180,225,270,315]; for(const s of sweep){ if(go(s+P.bias)) return; }
}
`;
}

function buildTeamCode(teamName, paramSeed) {
  return withSeededRandom(paramSeed, () => {
    const types = pickTypes();
    const blocks = [];
    for (let i = 0; i < 6; i++) {
      const p = genParams(i);
      const typeConst = (types[i] === 1) ? 'Type.TANKER' : (types[i] === 2) ? 'Type.DEALER' : 'Type.NORMAL';
      blocks.push(robotBlock(i, teamName, typeConst, p));
    }
    return blocks.join('\n\n// ===== 다음 로봇 =====\n\n');
  });
}

async function listOpponentFiles(limit = 10) {
  const entries = await fsp.readdir(RESULT_DIR, { withFileTypes: true });
  const files = [];
  for (const ent of entries) {
    if (ent.isFile() && ent.name.endsWith('.txt')) {
      const p = path.join(RESULT_DIR, ent.name);
      const st = await fsp.stat(p);
      files.push({ path: p, mtime: st.mtimeMs });
    } else if (ent.isDirectory()) {
      const sub = path.join(RESULT_DIR, ent.name);
      try {
        const subEntries = await fsp.readdir(sub, { withFileTypes: true });
        for (const se of subEntries) {
          if (se.isFile() && se.name.endsWith('.txt')) {
            const p = path.join(sub, se.name);
            const st = await fsp.stat(p);
            files.push({ path: p, mtime: st.mtimeMs });
          }
        }
      } catch (_) {}
    }
  }
  files.sort((a, b) => b.mtime - a.mtime);
  const filtered = files.filter(f => !f.path.startsWith(OUT_DIR));
  return filtered.slice(0, limit);
}

function chunk(arr, n) {
  const out = Array.from({ length: n }, () => []);
  for (let i = 0; i < arr.length; i++) out[i % n].push(arr[i]);
  return out;
}

async function runBatch(redCode, blueCode, repeat = 36, concurrency = Math.min(8, os.cpus().length)) {
  const seeds = Array.from({ length: repeat }, (_, i) => 2000 + i);
  const chunks = chunk(seeds, Math.min(concurrency, repeat)).filter(c => c.length > 0);
  const workerPath = path.join(ROOT, 'simulator', 'worker.js');
  const tasks = chunks.map((seedChunk) => new Promise((resolve, reject) => {
    const w = new Worker(workerPath, {
      workerData: { redCode, blueCode, runnerMode: 'secure', seeds: seedChunk, maxTicks: 4000, fast: true },
    });
    w.on('message', (arr) => resolve(arr));
    w.on('error', reject);
    w.on('exit', (code) => { if (code !== 0) reject(new Error(`Worker exited ${code}`)); });
  }));
  const res = (await Promise.all(tasks)).flat();
  let red=0, blue=0, draw=0;
  for (const r of res) { if (r.winner === 'red') red++; else if (r.winner === 'blue') blue++; else draw++; }
  return { red, blue, draw, matches: res.length };
}

async function evaluateAgainstOpponents(teamCode, opponents, repeatPerOpp = 24) {
  let total = { wins: 0, losses: 0, draws: 0, tests: 0 };
  const breakdown = [];
  for (const opp of opponents) {
    const oppCode = await fsp.readFile(opp.path, 'utf8');
    // as red
    const a = await runBatch(teamCode, oppCode, repeatPerOpp);
    // as blue (swap sides)
    const b = await runBatch(oppCode, teamCode, repeatPerOpp);
    const wins = a.red + b.blue; // our wins
    const losses = a.blue + b.red; // our losses
    const draws = a.draw + b.draw;
    const matches = a.matches + b.matches;
    breakdown.push({ opponent: path.basename(opp.path), wins, losses, draws, matches });
    total.wins += wins; total.losses += losses; total.draws += draws; total.tests += matches;
  }
  return { total, breakdown };
}

async function main() {
  console.log(`[${now()}] Refer to .agent/SIMULATOR.md for engine details.`);
  console.log(`[${now()}] Scanning opponents in result/ ...`);
  const opponents = await listOpponentFiles(10);
  if (opponents.length === 0) throw new Error('No opponent .txt files found in result/.');
  console.log(`Opponents (${opponents.length}):`);
  opponents.forEach(o => console.log(' -', path.relative(ROOT, o.path)));

  const teamName = 'Hyperion';

  // Phase 1: quick screen candidates vs newest 3 opponents (reduce overfit with small set)
  const baseline = opponents.slice(0, 3);
  const candidates = [];
  const N = 18; // number of candidates to try
  console.log(`[${now()}] Generating ${N} candidates and screening vs ${baseline.length} opponents...`);
  for (let i = 0; i < N; i++) {
    const code = buildTeamCode(teamName, i * 9973 + 123);
    const res = await evaluateAgainstOpponents(code, baseline, 16);
    const eff = res.total.tests - res.total.draws;
    const wr = eff > 0 ? res.total.wins / eff : 0;
    candidates.push({ idx: i, code, score: wr, screen: res });
    console.log(`  cand#${i}: WR=${(wr*100).toFixed(1)}% on screen`);
  }

  candidates.sort((a, b) => b.score - a.score);
  const topK = candidates.slice(0, 4);
  console.log(`[${now()}] Evaluating top ${topK.length} candidates vs full set...`);

  let best = null;
  for (const c of topK) {
    const res = await evaluateAgainstOpponents(c.code, opponents, 24);
    const effMatches = res.total.tests - res.total.draws;
    const wr = effMatches > 0 ? res.total.wins / effMatches : 0;
    const margin = res.total.wins - res.total.losses;
    const score = wr + 0.0001 * margin;
    if (!best || score > best.score) best = { code: c.code, res, score, idx: c.idx };
    console.log(`  cand#${c.idx} -> WR=${(wr*100).toFixed(2)}%, margin=${margin}`);
  }

  if (!best) throw new Error('No best candidate selected.');
  console.log(`[${now()}] Selected candidate #${best.idx}, score=${best.score.toFixed(4)}.`);

  await fsp.mkdir(OUT_DIR, { recursive: true });
  const outFile = path.join(OUT_DIR, `${RUN_ID}.txt`);
  await fsp.writeFile(outFile, best.code, 'utf8');

  // Result summary
  const lines = [];
  lines.push(`# ${RUN_ID} - ${teamName} Team Results`);
  lines.push('');
  lines.push(`Generated at: ${now()}`);
  lines.push(`Team name prefix: ${teamName}`);
  lines.push('');
  lines.push('## Summary');
  const tot = best.res.total;
  const eff = tot.tests - tot.draws;
  const wrTot = eff > 0 ? (tot.wins / eff) * 100 : 0;
  lines.push(`- Matches: ${tot.tests} (draws: ${tot.draws})`);
  lines.push(`- Wins: ${tot.wins}, Losses: ${tot.losses}, WinRate(excl. draws): ${wrTot.toFixed(2)}%`);
  lines.push('');
  lines.push('## Per-Opponent Breakdown');
  lines.push('');
  for (const b of best.res.breakdown) {
    const eff2 = b.matches - b.draws;
    const wr2 = eff2 > 0 ? (b.wins / eff2) * 100 : 0;
    lines.push(`- ${b.opponent}: W ${b.wins} / L ${b.losses} / D ${b.draws} | WR ${wr2.toFixed(2)}%`);
  }
  lines.push('');
  lines.push('## Import Instructions');
  lines.push('');
  lines.push(`- Open tank_battle_platform.html, click Import for a team, and paste the contents of result/${RUN_ID}/${RUN_ID}.txt.`);
  lines.push('- The file contains six robots split by function name() blocks and matches the platform format.');
  lines.push('');
  await fsp.writeFile(path.join(__dirname, 'RESULT.md'), lines.join('\n'), 'utf8');

  console.log(`[${now()}] Wrote outputs:`);
  console.log(' -', path.relative(ROOT, outFile));
  console.log(' -', path.relative(ROOT, path.join(__dirname, 'RESULT.md')));
}

if (require.main === module) {
  main().catch((err) => { console.error(err); process.exit(1); });
}

