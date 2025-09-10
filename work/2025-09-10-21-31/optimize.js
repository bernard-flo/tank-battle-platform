#!/usr/bin/env node
/* eslint-disable no-console */
// Optimizes a tank-battle team against existing results in result/.
// Produces final team code at result/<RUN_ID>/<RUN_ID>.txt and writes RESULT.md.

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

function seedRandom(seed) {
  // Small LCG for reproducible param sampling
  let s = (seed >>> 0) || 123456789;
  return () => { s = (1664525 * s + 1013904223) >>> 0; return s / 0x100000000; };
}

function jitter(rand, v, p) { return v + (rand() * 2 - 1) * p; }

function pickTypes() {
  // 2 TANKER (front), 2 NORMAL, 2 DEALER (flank)
  return [1, 1, 0, 0, 2, 2]; // Type constants: NORMAL=0, TANKER=1, DEALER=2
}

function genParams(rand, roleIndex) {
  // Parameter priors tuned for robust kiting + avoidance
  const role = ['TANKER', 'TANKER', 'NORMAL', 'NORMAL', 'DEALER', 'DEALER'][roleIndex];
  const base = {
    rMin: role === 'TANKER' ? 170 : role === 'DEALER' ? 240 : 200,
    rMax: role === 'TANKER' ? 260 : role === 'DEALER' ? 360 : 300,
    strafe: role === 'DEALER' ? 36 : 28,
    threatR: role === 'TANKER' ? 140 : 120,
    fleeBias: role === 'TANKER' ? 14 : 20,
    sep: 62,
    edge: 54,
    leadCap: 15,
    leadW: 0.86,
    aimJitter: role === 'DEALER' ? 0.12 : 0.18,
    healthW: 1.08,
    distW: 0.22,
    finisherHP: role === 'DEALER' ? 34 : 28,
    aggrRemain: 3,
    aggrIn: 20,
    aggrOut: 18,
    bias: 0,
  };
  return {
    rMin: jitter(rand, base.rMin, 30),
    rMax: jitter(rand, base.rMax, 30),
    strafe: jitter(rand, base.strafe, 8),
    threatR: jitter(rand, base.threatR, 25),
    fleeBias: jitter(rand, base.fleeBias, 6),
    sep: jitter(rand, base.sep, 12),
    edge: jitter(rand, base.edge, 8),
    leadCap: Math.max(10, Math.min(20, jitter(rand, base.leadCap, 2.5))),
    leadW: Math.max(0.72, Math.min(0.95, jitter(rand, base.leadW, 0.12))),
    aimJitter: Math.max(0.08, Math.min(0.25, jitter(rand, base.aimJitter, 0.1))),
    healthW: Math.max(0.9, Math.min(1.2, jitter(rand, base.healthW, 0.12))),
    distW: Math.max(0.15, Math.min(0.35, jitter(rand, base.distW, 0.08))),
    finisherHP: Math.max(10, jitter(rand, base.finisherHP, 12)),
    aggrRemain: Math.max(1, Math.round(jitter(rand, base.aggrRemain, 2))),
    aggrIn: jitter(rand, base.aggrIn, 10),
    aggrOut: jitter(rand, base.aggrOut, 8),
    bias: jitter(rand, base.bias, 28), // rotational bias to break symmetry
  };
}

function robotBlock(idx, teamName, typeConst, params) {
  const botName = `${teamName}-${idx + 1}`;
  const P = JSON.stringify(params);
  return `function name(){return "${botName}";}
function type(){return ${typeConst};}
let __s={last:null,lastVel:null,tick:0,aggr:0};
function update(tank,enemies,allies,bulletInfo){
  const toDeg=(x,y)=>Math.atan2(y,x)*180/Math.PI, H=Math.hypot;
  const norm=(a)=>{a%=360; if(a<0)a+=360; return a;}, clamp=(v,lo,hi)=>v<lo?lo:v>hi?hi:v;
  const P=${P};
  __s.tick=(__s.tick||0)+1; __s.aggr=Math.max(0,__s.aggr-1);

  // Target: weigh health and distance; prefer low HP and closer
  let tgt=null,b=1e9; for(const e of enemies){ const k=e.health*P.healthW + e.distance*P.distW; if(k<b){b=k;tgt=e;} }
  if(tgt){
    // Predictive fire with smoothed velocity estimate and capped lead time
    let ax=tgt.x, ay=tgt.y;
    if(__s.last){
      const vx=tgt.x-__s.last.x, vy=tgt.y-__s.last.y;
      const lvx=__s.lastVel?__s.lastVel.vx:0, lvy=__s.lastVel?__s.lastVel.vy:0;
      const svx=lvx*0.6+vx*0.4, svy=lvy*0.6+vy*0.4; __s.lastVel={vx:svx,vy:svy};
      const d=H(tgt.x-tank.x,tgt.y-tank.y); const t=clamp(d/8,0,P.leadCap); ax=tgt.x+svx*P.leadW*t; ay=tgt.y+svy*P.leadW*t;
    }
    const jitter=(((__s.tick*31+${idx+1})%23)-11)*0.07*P.aimJitter; tank.fire(toDeg(ax-tank.x,ay-tank.y)+jitter);
    __s.last={x:tgt.x,y:tgt.y};
  }

  // Movement helpers
  let tries=0; const go=(a)=>{tries++; return tank.move(norm(a));};
  const trySet=(arr)=>{ for(const a of arr){ if(go(a)) return true; } return false; };

  // Bullet avoidance: pick hostile bullet approaching and near closest-approach
  let hot=null,minR=1e9; for(const bu of bulletInfo){ const dx=bu.x-tank.x, dy=bu.y-tank.y; const v=H(bu.vx,bu.vy)||1; const nx=bu.vx/v, ny=bu.vy/v; const proj=dx*nx+dy*ny; if(proj>0){ const px=bu.x-proj*nx, py=bu.y-proj*ny; const d=H(px-tank.x,py-tank.y); if(d<minR && d<P.threatR){minR=d;hot=bu;} } }
  if(hot){ const a=toDeg(hot.vx,hot.vy); const side=((${idx}+1)%2?1:-1)*P.fleeBias + P.bias*0.6; if(trySet([a+90+side,a-90-side,a+130,a-130,a+70,a-70])) return; }

  // Edge avoidance
  if(tank.x<P.edge){ if(go(0))return; } if(tank.x>900-P.edge){ if(go(180))return; } if(tank.y<P.edge){ if(go(90))return; } if(tank.y>600-P.edge){ if(go(270))return; }

  // Ally separation
  let near=null,ad=1e9; for(const a of allies){ if(a.distance<ad){ad=a.distance;near=a;} } if(near && ad<P.sep){ const away=toDeg(tank.x-near.x,tank.y-near.y); if(trySet([away,away+28,away-28])) return; }

  // Engagement ring with adaptive aggression
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

  // Fallback wandering
  const r=((__s.tick*13+${idx+3})%360)+P.bias; trySet([r, r+120, r-120]);
}`;
}

function buildTeamCode(teamName, seed) {
  const types = pickTypes();
  const rand = seedRandom(seed);
  const blocks = [];
  for (let i = 0; i < 6; i++) {
    const params = genParams(rand, i);
    blocks.push(robotBlock(i, teamName, types[i], params));
    blocks.push('\n\n');
  }
  return blocks.join('');
}

async function listOpponentFiles(limitNewest = 9999) {
  const entries = await fsp.readdir(RESULT_DIR, { withFileTypes: true });
  const files = [];
  for (const ent of entries) {
    if (ent.isDirectory()) {
      const sub = path.join(RESULT_DIR, ent.name);
      const subs = await fsp.readdir(sub, { withFileTypes: true }).catch(() => []);
      for (const s of subs) {
        if (s.isFile() && s.name.endsWith('.txt')) {
          const p = path.join(sub, s.name);
          const st = await fsp.stat(p).catch(() => null);
          if (st) files.push({ path: p, mtime: st.mtimeMs });
        }
      }
    } else if (ent.isFile() && ent.name.endsWith('.txt')) {
      const p = path.join(RESULT_DIR, ent.name);
      const st = await fsp.stat(p).catch(() => null);
      if (st) files.push({ path: p, mtime: st.mtimeMs });
    }
  }
  files.sort((a, b) => b.mtime - a.mtime);
  return files.slice(0, limitNewest);
}

function seedsArray(count, base) {
  const arr = [];
  for (let i = 0; i < count; i++) arr.push(base + i);
  return arr;
}

async function runBatch(redCode, blueCode, repeat = 24) {
  const seeds = seedsArray(repeat, 10_000);
  const concurrency = Math.min(os.cpus().length, Math.max(1, Math.floor(repeat / 2)));
  const chunks = Array.from({ length: concurrency }, () => []);
  for (let i = 0; i < seeds.length; i++) chunks[i % concurrency].push(seeds[i]);

  const workerPath = path.resolve(ROOT, 'simulator', 'worker.js');
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
  for (const r of res) {
    if (r.winner === 'red') red++; else if (r.winner === 'blue') blue++; else draw++;
  }
  return { red, blue, draw, matches: res.length };
}

async function evaluateAgainstOpponents(teamCode, opponents, repeatPerOpp = 32) {
  let total = { wins: 0, losses: 0, draws: 0, tests: 0 };
  const breakdown = [];
  for (const opp of opponents) {
    const oppCode = await fsp.readFile(opp.path, 'utf8');
    const r = await runBatch(teamCode, oppCode, repeatPerOpp);
    breakdown.push({ opponent: path.basename(opp.path), wins: r.red, losses: r.blue, draws: r.draw, matches: r.matches });
    total.wins += r.red; total.losses += r.blue; total.draws += r.draw; total.tests += r.matches;
  }
  return { total, breakdown };
}

function summaryScore(res) {
  const eff = res.total.tests - res.total.draws;
  const wr = eff > 0 ? res.total.wins / eff : 0;
  // Penalize if losing to too many opponents head-to-head
  let head = 0; for (const b of res.breakdown) { if (b.wins > b.losses) head++; }
  const headFrac = res.breakdown.length ? head / res.breakdown.length : 0;
  return wr + headFrac * 0.1; // prioritize win rate, sprinkle head-to-head
}

async function main() {
  const FAST = process.env.FAST === '1';
  const num = (v, d) => (v !== undefined ? Number(v) : d);
  const OPP_LIMIT = num(process.env.OPP_LIMIT, FAST ? 16 : 9999);
  const BASELINE_LIMIT = num(process.env.BASELINE_LIMIT, FAST ? 2 : 3);
  const CANDS = num(process.env.CANDS, FAST ? 8 : 16);
  const TOPK = num(process.env.TOPK, FAST ? 3 : 4);
  const BASE_REP = num(process.env.BASE_REP, FAST ? 12 : 24);
  const FULL_REP = num(process.env.FULL_REP, FAST ? 16 : 28);
  const ROUNDS = num(process.env.ROUNDS, FAST ? 2 : 3);

  console.log(`[${now()}] Listing opponents...`);
  const opponents = await listOpponentFiles(OPP_LIMIT);
  if (opponents.length === 0) throw new Error('No opponent .txt files found in result/.');
  console.log(`Found ${opponents.length} opponent teams.`);

  const teamName = 'Helios';

  let globalBest = null;
  
  for (let round = 1; round <= ROUNDS; round++) {
    console.log(`[${now()}] Round ${round}: generating candidates...`);
    const baseline = opponents.slice(0, BASELINE_LIMIT); // newest for initial screen
    const candidates = [];
    for (let i = 0; i < CANDS; i++) {
      const code = buildTeamCode(teamName, round * 10007 + i * 1337 + 7);
      const res = await evaluateAgainstOpponents(code, baseline, BASE_REP);
      const eff = res.total.tests - res.total.draws; const wr = eff>0 ? res.total.wins/eff : 0;
      candidates.push({ idx: i, code, score: wr, res });
      console.log(`  cand#${i}: WR=${(wr*100).toFixed(1)}% vs baseline`);
    }

    candidates.sort((a, b) => b.score - a.score);
    const topK = candidates.slice(0, TOPK);
    console.log(`[${now()}] Evaluating top ${topK.length} across all opponents (${opponents.length})...`);

    for (const c of topK) {
      const res = await evaluateAgainstOpponents(c.code, opponents, FULL_REP);
      const score = summaryScore(res);
      const eff = res.total.tests - res.total.draws; const wr = eff>0 ? res.total.wins/eff : 0;
      const head = res.breakdown.filter(b => b.wins > b.losses).length;
      console.log(`  cand#${c.idx}: WR=${(wr*100).toFixed(1)}%, Head ${head}/${res.breakdown.length}, Score ${score.toFixed(4)}`);
      if (!globalBest || score > globalBest.score) globalBest = { code: c.code, res, score, round, idx: c.idx };
    }

    // Early stop if strong enough
    const tot = globalBest.res.total; const eff = tot.tests - tot.draws; const wr = eff>0 ? tot.wins/eff : 0;
    const head = globalBest.res.breakdown.filter(b => b.wins > b.losses).length;
    if (wr >= 0.58 || head >= Math.ceil(opponents.length * 0.7)) {
      console.log(`[${now()}] Early stop: strong candidate achieved.`);
      break;
    }
  }

  if (!globalBest) throw new Error('No candidate selected.');
  console.log(`[${now()}] Selected candidate from round ${globalBest.round} (idx ${globalBest.idx}) with score=${globalBest.score.toFixed(4)}`);

  await fsp.mkdir(OUT_DIR, { recursive: true });
  const outFile = path.join(OUT_DIR, `${RUN_ID}.txt`);
  await fsp.writeFile(outFile, globalBest.code, 'utf8');

  // Produce RESULT.md
  const lines = [];
  lines.push(`# ${RUN_ID} - Helios Team Results`);
  lines.push('');
  lines.push(`Generated at: ${now()}`);
  lines.push(`Team name prefix: Helios`);
  lines.push('');
  lines.push('## Summary');
  const tot = globalBest.res.total;
  const eff = tot.tests - tot.draws;
  const wrTot = eff > 0 ? (tot.wins / eff) * 100 : 0;
  const head = globalBest.res.breakdown.filter(b => b.wins > b.losses).length;
  lines.push(`- Matches: ${tot.tests} (draws: ${tot.draws})`);
  lines.push(`- Wins: ${tot.wins}, Losses: ${tot.losses}, WinRate(excl. draws): ${wrTot.toFixed(2)}%`);
  lines.push(`- Head-to-head wins: ${head} / ${globalBest.res.breakdown.length}`);
  lines.push('');
  lines.push('## Per-Opponent Breakdown');
  lines.push('');
  for (const b of globalBest.res.breakdown) {
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
