#!/usr/bin/env node
/* eslint-disable no-console */
// Iterative optimizer for tank_battle_platform.html teams.
// - Generates high-performance 6-bot code strings compatible with the HTML import format.
// - Simulates against existing results in result/ using simulator/cli (worker-based).
// - Iterates until a candidate outperforms current best aggregate among existing results.
// - Writes final team to result/<TS>/<TS>.txt and comparison to work/<TS>/RESULT.md.

const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const os = require('os');
const { Worker } = require('worker_threads');

const ROOT = path.resolve(__dirname, '..', '..');
const RESULT_DIR = path.join(ROOT, 'result');
const RUN_ID = path.basename(path.resolve(__dirname));
const OUT_DIR = path.join(RESULT_DIR, RUN_ID);
const SIM_DIR = path.join(ROOT, 'simulator');

function now() { return new Date().toISOString(); }

function byMtimeDesc(a, b) {
  return (b.mtimeMs || 0) - (a.mtimeMs || 0);
}

async function listResultTeams(limit = 18) {
  // List .txt under result/ (root + subdirs). Exclude our OUT_DIR.
  const files = [];
  async function walk(dir) {
    const entries = await fsp.readdir(dir, { withFileTypes: true });
    for (const e of entries) {
      const p = path.join(dir, e.name);
      if (path.resolve(p) === path.resolve(OUT_DIR)) continue; // exclude our fresh out dir
      if (e.isDirectory()) {
        await walk(p);
      } else if (e.isFile() && e.name.endsWith('.txt')) {
        const st = await fsp.stat(p).catch(() => null);
        files.push({ path: p, mtimeMs: st ? st.mtimeMs : 0 });
      }
    }
  }
  await walk(RESULT_DIR);
  files.sort(byMtimeDesc);
  return limit > 0 ? files.slice(0, limit) : files;
}

// Team generator
function randBetween(a, b) { return a + Math.random() * (b - a); }

function genParamsByRole(role) {
  const base = {
    minRange: role === 'TANKER' ? 170 : role === 'DEALER' ? 240 : 200,
    maxRange: role === 'TANKER' ? 260 : role === 'DEALER' ? 360 : 310,
    strafeAngle: role === 'DEALER' ? 34 : 28,
    threatRadius: role === 'TANKER' ? 150 : 120,
    threatFleeBias: role === 'TANKER' ? 14 : 20,
    allySep: 60,
    edgeMargin: 54,
    leadCap: 14,
    leadWeight: 0.86,
    aimJitter: role === 'DEALER' ? 0.12 : 0.18,
    targetHealthWeight: 1.08,
    targetDistWeight: 0.22,
    finishHp: role === 'DEALER' ? 34 : 26,
    finishRemain: 3,
    finishMinDelta: 20,
    finishMaxDelta: 40,
    bias: 0,
  };
  const jit = (v, p) => v + randBetween(-p, p);
  return {
    minRange: Math.round(jit(base.minRange, 25)),
    maxRange: Math.round(jit(base.maxRange, 25)),
    strafeAngle: Math.round(jit(base.strafeAngle, 6)),
    threatRadius: Math.round(jit(base.threatRadius, 20)),
    threatFleeBias: Math.round(jit(base.threatFleeBias, 6)),
    allySep: Math.round(jit(base.allySep, 10)),
    edgeMargin: Math.round(jit(base.edgeMargin, 8)),
    leadCap: +(Math.max(8, Math.min(22, jit(base.leadCap, 3))).toFixed(2)),
    leadWeight: +(Math.max(0.7, Math.min(1.05, jit(base.leadWeight, 0.12))).toFixed(2)),
    aimJitter: +(Math.max(0.08, Math.min(0.26, jit(base.aimJitter, 0.08))).toFixed(2)),
    targetHealthWeight: +(Math.max(0.7, Math.min(1.5, jit(base.targetHealthWeight, 0.1))).toFixed(2)),
    targetDistWeight: +(Math.max(0.12, Math.min(0.40, jit(base.targetDistWeight, 0.06))).toFixed(2)),
    finishHp: Math.round(jit(base.finishHp, 8)),
    finishRemain: Math.max(1, Math.round(jit(base.finishRemain, 1))),
    finishMinDelta: Math.round(jit(base.finishMinDelta, 8)),
    finishMaxDelta: Math.round(jit(base.finishMaxDelta, 10)),
    bias: Math.round(jit(base.bias, 25)),
  };
}

function buildBotBlock(label, typeLiteral, P) {
  return `function name(){return "${label}";}
function type(){return ${typeLiteral};}
let __s={last:null,tick:0,lastVel:null};
function update(tank,enemies,allies,bulletInfo){
  const toDeg=(x,y)=>Math.atan2(y,x)*180/Math.PI; const H=Math.hypot;
  const norm=(a)=>{a%=360; if(a<0)a+=360; return a;}; const clamp=(v,lo,hi)=>v<lo?lo:v>hi?hi:v;
  const P=${JSON.stringify(P)}; __s.tick=(__s.tick||0)+1; const rnd=((tank.x*97+tank.y*131)|0)%2?1:-1;
  // target selection
  let tgt=null,b=1e9; for(const e of enemies){ const k=e.health*P.targetHealthWeight + e.distance*P.targetDistWeight; if(k<b){b=k; tgt=e;} }
  if(tgt){
    let ax=tgt.x, ay=tgt.y;
    if(__s.last){ const vx=tgt.x-__s.last.x, vy=tgt.y-__s.last.y; const lvx=__s.lastVel?__s.lastVel.vx:0, lvy=__s.lastVel?__s.lastVel.vy:0; const svx=lvx*0.6+vx*0.4, svy=lvy*0.6+vy*0.4; __s.lastVel={vx:svx,vy:svy}; const d=H(tgt.x-tank.x,tgt.y-tank.y); const t=clamp(d/8,0,P.leadCap); ax=tgt.x+svx*P.leadWeight*t; ay=tgt.y+svy*P.leadWeight*t; }
    const jitter=((((tank.x*31+tank.y*17)%23)-11)*0.07)*P.aimJitter; tank.fire(toDeg(ax-tank.x,ay-tank.y)+jitter); __s.last={x:tgt.x,y:tgt.y};
  }
  let tries=0; const go=(a)=>{tries++; return tank.move(norm(a));};
  // bullet avoidance
  let hot=null,minR=1e9; for(const bu of bulletInfo){ const dx=bu.x-tank.x, dy=bu.y-tank.y; const v=H(bu.vx,bu.vy)||1; const nx=bu.vx/v, ny=bu.vy/v; const proj=dx*nx+dy*ny; if(proj>0){ const px=bu.x-proj*nx, py=bu.y-proj*ny; const d=H(px-tank.x,py-tank.y); if(d<minR && d<P.threatRadius){minR=d; hot=bu;} } }
  if(hot){ const a=toDeg(hot.vx,hot.vy); const side=(rnd>0?1:-1)*P.threatFleeBias + P.bias*0.6; const cand=[a+90+side,a-90-side,a+130,a-130,a+70,a-70]; for(const c of cand){ if(go(c)) return; } }
  // walls
  if(tank.x<P.edgeMargin){ if(go(0))return; } if(tank.x>900-P.edgeMargin){ if(go(180))return; } if(tank.y<P.edgeMargin){ if(go(90))return; } if(tank.y>600-P.edgeMargin){ if(go(270))return; }
  // ally separation
  let near=null,ad=1e9; for(const a of allies){ if(a.distance<ad){ad=a.distance; near=a;} } if(near && ad<P.allySep){ const away=toDeg(tank.x-near.x,tank.y-near.y); if(go(away))return; if(go(away+22))return; if(go(away-22))return; }
  // kiting ring control
  if(tgt){ const to=toDeg(tgt.x-tank.x,tgt.y-tank.y); const d=tgt.distance; let mn=P.minRange, mx=P.maxRange; const remain=enemies.length; if((tgt.health<=P.finishHp)||remain<=P.finishRemain){ mn=Math.max(80,mn-P.finishMinDelta); mx=Math.max(120,mx-P.finishMaxDelta); }
    if(d<mn){ const away=to+180+P.bias*0.4; if(go(away))return; if(go(away+18))return; if(go(away-18))return; }
    else if(d>mx){ if(go(to))return; if(go(to+16))return; if(go(to-16))return; }
    else { const side = to + ((((tank.x*13+tank.y*7)|0)%2)?P.strafeAngle:-P.strafeAngle) + P.bias*0.5; if(go(side))return; if(go(side+16))return; if(go(side-16))return; }
  }
  const sweep=[0,60,120,180,240,300]; for(const s of sweep){ if(go(s+P.bias)) return; }
}
`;
}

function buildTeamCode(teamLabel, seedOffset = 0) {
  const roles = ['TANKER', 'TANKER', 'DEALER', 'DEALER', 'NORMAL', 'NORMAL'];
  const types = {
    TANKER: 'Type.TANKER',
    DEALER: 'Type.DEALER',
    NORMAL: 'Type.NORMAL',
  };
  const names = roles.map((r, i) => `${teamLabel}-${r[0]}${i + 1}`);
  const blocks = [];
  for (let i = 0; i < 6; i++) {
    const role = roles[i];
    const P = genParamsByRole(role);
    // add slight seedOffset bias to diversify
    P.bias += Math.round(((i + 1) * 7 + seedOffset) % 27) - 13;
    blocks.push(buildBotBlock(names[i], types[role], P));
  }
  return blocks.join('\n\n// ===== 다음 로봇 =====\n\n\n');
}

// Simulation helpers (parallel via simulator/worker.js)
function chunk(arr, n) { const out = []; for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n)); return out; }

async function runBatch(redCode, blueCode, repeat = 24, maxTicks = 4000, concurrency = Math.max(1, Math.min(os.cpus().length, 8))) {
  const baseSeed = Math.floor(Math.random() * 1e9);
  const seeds = Array.from({ length: repeat }, (_, i) => baseSeed + i);
  const workerPath = path.join(SIM_DIR, 'worker.js');
  const chunks = chunk(seeds, Math.min(concurrency, repeat)).filter((c) => c.length > 0);
  const tasks = chunks.map((seedChunk) => new Promise((resolve, reject) => {
    const w = new Worker(workerPath, { workerData: { redCode, blueCode, runnerMode: 'secure', seeds: seedChunk, maxTicks, fast: true } });
    w.on('message', (arr) => resolve(arr));
    w.on('error', reject);
    w.on('exit', (code) => { if (code !== 0) reject(new Error(`Worker exited ${code}`)); });
  }));
  const results = (await Promise.all(tasks)).flat();
  let red = 0, blue = 0, draw = 0;
  for (const r of results) {
    if (r.winner === 'red') red++; else if (r.winner === 'blue') blue++; else draw++;
  }
  return { red, blue, draw, matches: results.length };
}

async function evaluateAgainstOpponents(teamCode, opponentFiles, repeatPerOpp = 24) {
  const breakdown = [];
  let wins = 0, losses = 0, draws = 0, tests = 0;
  for (const opp of opponentFiles) {
    const oppCode = await fsp.readFile(opp.path, 'utf8');
    const r = await runBatch(teamCode, oppCode, repeatPerOpp);
    breakdown.push({ opponent: path.basename(opp.path), wins: r.red, losses: r.blue, draws: r.draw, matches: r.matches });
    wins += r.red; losses += r.blue; draws += r.draw; tests += r.matches;
  }
  const eff = Math.max(1, tests - draws);
  const wr = wins / eff;
  const margin = wins - losses;
  return { total: { wins, losses, draws, tests, wr, margin }, breakdown };
}

async function evaluateExistingTeam(file, others, repeatPerOpp = 18) {
  const code = await fsp.readFile(file.path, 'utf8');
  let wins = 0, losses = 0, draws = 0, tests = 0;
  for (const opp of others) {
    if (opp.path === file.path) continue;
    const oppCode = await fsp.readFile(opp.path, 'utf8');
    const r = await runBatch(code, oppCode, repeatPerOpp);
    wins += r.red; losses += r.blue; draws += r.draw; tests += r.matches;
  }
  const eff = Math.max(1, tests - draws);
  return { file: file.path, wins, losses, draws, tests, wr: wins / eff, margin: wins - losses };
}

async function currentChampion(opponentFiles) {
  // Evaluate a subset (newest K) to estimate the current best
  const K = Math.min(opponentFiles.length, 10);
  const subset = opponentFiles.slice(0, K);
  const CHAMP_REP = process.env.CHAMP_REP ? parseInt(process.env.CHAMP_REP, 10) : 14;
  let best = null;
  for (let i = 0; i < subset.length; i++) {
    const file = subset[i];
    const others = subset.filter((x) => x.path !== file.path);
    const r = await evaluateExistingTeam(file, others, CHAMP_REP);
    if (!best || r.wr > best.wr) best = r;
  }
  return best; // {file, wins, losses, draws, tests, wr, margin}
}

async function writeOutputs(bestCode, evalRes) {
  await fsp.mkdir(OUT_DIR, { recursive: true });
  const outFile = path.join(OUT_DIR, `${RUN_ID}.txt`);
  await fsp.writeFile(outFile, bestCode, 'utf8');

  const lines = [];
  lines.push(`# ${RUN_ID} - Optimized Team Results`);
  lines.push('');
  lines.push(`Generated at: ${now()}`);
  lines.push('- Referenced: .agent/SIMULATOR.md mechanics and CLI');
  lines.push('');
  lines.push('## Summary');
  const t = evalRes.total;
  lines.push(`- Matches: ${t.tests} (draws: ${t.draws})`);
  lines.push(`- Wins: ${t.wins}, Losses: ${t.losses}`);
  lines.push(`- WinRate (excl. draws): ${(t.wr * 100).toFixed(2)}%`);
  lines.push(`- Margin: ${t.margin}`);
  lines.push('');
  lines.push('## Per-Opponent Breakdown');
  for (const b of evalRes.breakdown) {
    const eff = Math.max(1, b.matches - b.draws);
    const wr = (b.wins / eff) * 100;
    lines.push(`- ${b.opponent}: W ${b.wins} / L ${b.losses} / D ${b.draws} | WR ${wr.toFixed(2)}%`);
  }
  lines.push('');
  lines.push('## Import');
  lines.push(`- Import: result/${RUN_ID}/${RUN_ID}.txt`);
  await fsp.writeFile(path.join(__dirname, 'RESULT.md'), lines.join('\n'), 'utf8');
  return outFile;
}

async function main() {
  console.log(`[${now()}] Listing opponents in result/ ...`);
  const OPP_LIMIT = process.env.OPP_LIMIT ? parseInt(process.env.OPP_LIMIT, 10) : 24;
  const opponents = await listResultTeams(OPP_LIMIT);
  if (opponents.length === 0) {
    console.error('No opponent files in result/. Add at least one .txt team.');
    process.exit(1);
  }
  console.log(`Found ${opponents.length} opponents (newest first).`);

  console.log(`[${now()}] Estimating current champion among latest set ...`);
  const CHAMP_SAMPLE = process.env.CHAMP_SAMPLE ? parseInt(process.env.CHAMP_SAMPLE, 10) : 10;
  const champ = await currentChampion(opponents.slice(0, CHAMP_SAMPLE));
  console.log(`Champion approx: ${path.basename(champ.file)} | WR ${(champ.wr * 100).toFixed(2)}% vs recent peers`);

  // Iterative candidate search
  let globalBest = null;
  const teamLabel = 'Astra';

  const ROUNDS = process.env.ROUNDS ? parseInt(process.env.ROUNDS, 10) : 3;
  const CAND0 = process.env.CAND0 ? parseInt(process.env.CAND0, 10) : 14;
  const CANDN = process.env.CANDN ? parseInt(process.env.CANDN, 10) : 10;
  const REP_SCREEN0 = process.env.REP_SCREEN0 ? parseInt(process.env.REP_SCREEN0, 10) : 18;
  const REP_SCREENN = process.env.REP_SCREENN ? parseInt(process.env.REP_SCREENN, 10) : 24;
  const FINALISTS = process.env.FINALISTS ? parseInt(process.env.FINALISTS, 10) : 3;
  const REP_FULL = process.env.REP_FULL ? parseInt(process.env.REP_FULL, 10) : 26;
  const STOP_DW = process.env.STOP_DW ? parseFloat(process.env.STOP_DW) : 0.01; // stop when best wr > champ.wr+STOP_DW

  for (let round = 1; round <= ROUNDS; round++) {
    const candidateCount = round === 1 ? CAND0 : CANDN;
    const repeatScreen = round === 1 ? REP_SCREEN0 : REP_SCREENN;
    console.log(`[${now()}] Round ${round}: generating ${candidateCount} candidates ...`);

    const screened = [];
    const SCREEN_OPP = process.env.SCREEN_OPP ? parseInt(process.env.SCREEN_OPP, 10) : 8;
    const screenOpps = opponents.slice(0, SCREEN_OPP); // screen on newest subset to reduce cost
    for (let i = 0; i < candidateCount; i++) {
      const code = buildTeamCode(teamLabel, i * 37 + round * 101);
      const res = await evaluateAgainstOpponents(code, screenOpps, repeatScreen);
      screened.push({ idx: i, code, res, score: res.total.wr + 1e-4 * res.total.margin });
      console.log(`  cand#${i} WR=${(res.total.wr * 100).toFixed(1)}% (+${res.total.margin}) on screen set`);
    }
    screened.sort((a, b) => b.score - a.score);
    const finalists = screened.slice(0, Math.min(FINALISTS, screened.length));

    console.log(`[${now()}] Final evaluation of top ${finalists.length} vs full set ...`);
    for (const f of finalists) {
      const full = await evaluateAgainstOpponents(f.code, opponents, REP_FULL);
      const score = full.total.wr + 1e-4 * full.total.margin;
      if (!globalBest || score > globalBest.score) {
        globalBest = { code: f.code, res: full, score };
      }
      console.log(`  finalist#${f.idx} -> WR ${(full.total.wr * 100).toFixed(2)}% (+${full.total.margin})`);
    }

    if (globalBest && globalBest.res.total.wr > champ.wr + STOP_DW) {
      console.log(`[${now()}] Surpassed champion WR ${(champ.wr * 100).toFixed(2)}% with ${(globalBest.res.total.wr * 100).toFixed(2)}%. Stopping.`);
      break;
    } else {
      console.log(`[${now()}] Not yet surpassing champion. Continuing iterations ...`);
    }
  }

  if (!globalBest) {
    console.error('Failed to produce a candidate.');
    process.exit(1);
  }

  const outFile = await writeOutputs(globalBest.code, globalBest.res);
  console.log(`[${now()}] Wrote outputs:`);
  console.log(' -', path.relative(ROOT, outFile));
  console.log(' -', path.relative(ROOT, path.join(__dirname, 'RESULT.md')));
}

if (require.main === module) {
  main().catch((err) => { console.error(err); process.exit(1); });
}
