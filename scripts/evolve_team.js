#!/usr/bin/env node
/*
  Evolve/optimize a 6-bot team for Tech of Tank using the headless simulator.
  - Scans existing teams in result/<stamp>/<stamp>.txt as opponents.
  - Randomly perturbs a strong baseline policy and evaluates candidates.
  - Writes the best-performing team to result/<TS>/<TS>.txt and saves comparisons to work/<TS>/RESULT.md.

  Usage:
    node scripts/evolve_team.js [--ts 2025-09-10-22-24] [--rounds 12] [--seeds 30] [--concurrency 8]

  Notes:
    - Requires Node 18+.
    - Uses simulator/cli.js. No external deps.
*/
const fs = require('fs');
const path = require('path');
const cp = require('child_process');

function sh(cmd, opts = {}) {
  return cp.execSync(cmd, { stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8', ...opts });
}

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith('--')) { args[key] = next; i++; } else { args[key] = true; }
    }
  }
  return args;
}

function readLastTs() {
  const p = path.resolve('.agent/LAST_TS');
  if (fs.existsSync(p)) return fs.readFileSync(p, 'utf8').trim();
  const ts = sh('date +%F-%H-%M').trim();
  return ts;
}

function listOpponents(excludeTs) {
  const dir = path.resolve('result');
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir);
  const files = [];
  for (const e of entries) {
    if (e === excludeTs) continue;
    const p = path.join(dir, e, `${e}.txt`);
    if (fs.existsSync(p)) files.push(p);
  }
  return files.sort();
}

// Build a single robot code block with embedded parameters and a descriptive name
function buildRobotBlock(botName, botType, P, biasOffset = 0) {
  // Serialize params compactly for fast parsing in the sandbox
  const Pstr = JSON.stringify(P);
  return `function name(){return "${botName}";}
function type(){return ${botType};}
let __state={last:null, lastVel:null, tick:0};
function update(tank,enemies,allies,bulletInfo){
  const toDeg=(x,y)=>Math.atan2(y,x)*180/Math.PI; const norm=(a)=>{a%=360; if(a<0)a+=360; return a;};
  const clamp=(v,lo,hi)=>v<lo?lo:v>hi?hi:v; const hypot=Math.hypot;
  const P=Object.assign({}, ${Pstr});
  // mix in per-robot bias to desync patterns
  P.bias = (P.bias||0) + (${biasOffset}).toFixed ? ${biasOffset} : (${biasOffset}||0);
  __state.tick=(__state.tick||0)+1;

  // 1) target selection: prioritize low HP then distance
  let tgt=null, best=1e9;
  for(const e of enemies){ const key = e.health*P.targetHealthWeight + e.distance*P.targetDistWeight; if(key<best){best=key; tgt=e;} }

  // 2) predictive aim with simple velocity smoothing
  if(tgt){
    let aimX=tgt.x, aimY=tgt.y;
    if(__state.last){
      const vx=(tgt.x-__state.last.x); const vy=(tgt.y-__state.last.y);
      let lvx=__state.lastVel?__state.lastVel.vx:0; let lvy=__state.lastVel?__state.lastVel.vy:0;
      const svx=lvx*0.5 + vx*0.5; const svy=lvy*0.5 + vy*0.5; __state.lastVel={vx:svx,vy:svy};
      const d=hypot(tgt.x-tank.x,tgt.y-tank.y); const tLead=clamp(d/8,0,P.leadCap);
      aimX = tgt.x + svx*P.leadWeight*tLead; aimY = tgt.y + svy*P.leadWeight*tLead;
    }
    // small deterministic jitter to break symmetry
    const jitter = ((((tank.x*31+tank.y*17)|0)%23)-11)*0.06*P.aimJitter;
    tank.fire(toDeg(aimX-tank.x,aimY-tank.y)+jitter);
    __state.last={x:tgt.x,y:tgt.y};
  }

  let tries=0; const go=(a)=>{tries++; return tank.move(norm(a));};

  // 3) bullet avoidance: respond to nearest projected approach inside radius
  let hot=null, md=1e9; for(const b of bulletInfo){ const dx=b.x-tank.x, dy=b.y-tank.y; const v=hypot(b.vx,b.vy)||1; const nx=b.vx/v, ny=b.vy/v; const proj=dx*nx+dy*ny; if(proj>0){ const px=b.x-proj*nx, py=b.y-proj*ny; const d=hypot(px-tank.x,py-tank.y); if(d<md && d<P.threatRadius){ md=d; hot=b; } } }
  if(hot){ const a=toDeg(hot.vx,hot.vy); const side = P.threatFleeBias + P.bias*0.4; const cand=[a+90+side, a-90-side, a+120, a-120, a+70, a-70]; for(const c of cand){ if(go(c)) return; } }

  // 4) edge avoidance (map 900x600)
  if(tank.x < P.edgeMargin){ if(go(0)) return; } if(tank.x > 900-P.edgeMargin){ if(go(180)) return; } if(tank.y < P.edgeMargin){ if(go(90)) return; } if(tank.y > 600-P.edgeMargin){ if(go(270)) return; }

  // 5) ally separation
  let near=null, ad=1e9; for(const a of allies){ if(a.distance<ad){ ad=a.distance; near=a; } }
  if(near && ad < P.allySep){ const away=toDeg(tank.x-near.x,tank.y-near.y); if(go(away)) return; if(go(away+26)) return; if(go(away-26)) return; }

  // 6) spacing + strafing with health-aware aggression
  if(tgt){ const to=toDeg(tgt.x-tank.x,tgt.y-tank.y); const d=tgt.distance; let MIN=P.minRange, MAX=P.maxRange;
    if(tgt.health<=P.finishHp || enemies.length<=P.finishRemain) { MIN-=P.finishMinDelta; MAX-=P.finishMaxDelta; }
    if(tank.health< P.lowHp){ MIN+=P.lowHpPad; }
    if(d<MIN){ const away=to+180 + P.bias*0.4; if(go(away)) return; if(go(away+22)) return; if(go(away-22)) return; }
    else if(d>MAX){ if(go(to)) return; if(go(to+16)) return; if(go(to-16)) return; }
    else { const side = to + ((((__state.tick+tank.x+tank.y)|0)%2)?P.strafeAngle:-P.strafeAngle) + P.bias*0.5; if(go(side)) return; if(go(side+16)) return; if(go(side-16)) return; }
  }

  // 7) fallback sweeping
  for(const s of P.sweep){ if(go(s+P.bias)) return; }
}
`;
}

function buildTeamCode(seedParams) {
  // Baseline parameter templates per role
  const base = {
    TANKER: {
      leadCap: 14, leadWeight: 0.98, aimJitter: 0.20,
      minRange: 165, maxRange: 255, strafeAngle: 28,
      threatRadius: 160, threatFleeBias: 14,
      allySep: 64, edgeMargin: 46, bias: -10,
      targetHealthWeight: 1.25, targetDistWeight: 0.10,
      finishHp: 24, finishRemain: 3, finishMinDelta: 35, finishMaxDelta: 25,
      lowHp: 40, lowHpPad: 35,
      sweep: [0,60,120,180,240,300],
    },
    DEALER: {
      leadCap: 15, leadWeight: 1.00, aimJitter: 0.22,
      minRange: 240, maxRange: 380, strafeAngle: 36,
      threatRadius: 170, threatFleeBias: 16,
      allySep: 62, edgeMargin: 44, bias: 12,
      targetHealthWeight: 1.40, targetDistWeight: 0.07,
      finishHp: 22, finishRemain: 3, finishMinDelta: 40, finishMaxDelta: 35,
      lowHp: 35, lowHpPad: 50,
      sweep: [0,50,100,150,200,250,300,350],
    },
    NORMAL: {
      leadCap: 14, leadWeight: 0.99, aimJitter: 0.20,
      minRange: 200, maxRange: 320, strafeAngle: 32,
      threatRadius: 165, threatFleeBias: 15,
      allySep: 62, edgeMargin: 46, bias: -6,
      targetHealthWeight: 1.30, targetDistWeight: 0.09,
      finishHp: 22, finishRemain: 3, finishMinDelta: 36, finishMaxDelta: 28,
      lowHp: 40, lowHpPad: 40,
      sweep: [0,60,120,180,240,300],
    },
  };

  // Apply random perturbations when requested
  function jitter(p, j) {
    const q = { ...p };
    for (const k of Object.keys(q)) {
      const v = q[k];
      if (typeof v === 'number') {
        const mag = Math.abs(v) < 1 ? j*0.1 : j; // keep small params stable
        const delta = (Math.random()*2-1) * mag;
        q[k] = +(v + delta).toFixed(3);
      } else if (Array.isArray(v)) {
        // leave sweeps as-is
      }
    }
    // enforce positive bounds for some
    q.minRange = Math.max(120, q.minRange);
    q.maxRange = Math.max(q.minRange+40, q.maxRange);
    q.leadCap = Math.min(18, Math.max(8, q.leadCap));
    q.leadWeight = Math.max(0.7, Math.min(1.1, q.leadWeight));
    q.aimJitter = Math.max(0, Math.min(0.35, q.aimJitter));
    q.threatRadius = Math.max(80, Math.min(220, q.threatRadius));
    q.allySep = Math.max(40, Math.min(90, q.allySep));
    q.edgeMargin = Math.max(30, Math.min(70, q.edgeMargin));
    q.lowHp = Math.max(10, Math.min(70, q.lowHp));
    q.lowHpPad = Math.max(10, Math.min(80, q.lowHpPad));
    return q;
  }

  const T = {
    tankers: [ jitter(base.TANKER, seedParams.jitter), jitter(base.TANKER, seedParams.jitter) ],
    dealers: [ jitter(base.DEALER, seedParams.jitter), jitter(base.DEALER, seedParams.jitter), jitter(base.DEALER, seedParams.jitter) ],
    normal: jitter(base.NORMAL, seedParams.jitter),
  };

  const blocks = [];
  // Two tankers
  blocks.push(buildRobotBlock(seedParams.prefix+"-T1", 'Type.TANKER', T.tankers[0], -10));
  blocks.push('\n\n// ===== 다음 로봇 =====\n\n');
  blocks.push(buildRobotBlock(seedParams.prefix+"-T2", 'Type.TANKER', T.tankers[1], +8));
  blocks.push('\n\n// ===== 다음 로봇 =====\n\n');
  // Dealers
  blocks.push(buildRobotBlock(seedParams.prefix+"-D1", 'Type.DEALER', T.dealers[0], -14));
  blocks.push('\n\n// ===== 다음 로봇 =====\n\n');
  blocks.push(buildRobotBlock(seedParams.prefix+"-D2", 'Type.DEALER', T.dealers[1], +12));
  blocks.push('\n\n// ===== 다음 로봇 =====\n\n');
  blocks.push(buildRobotBlock(seedParams.prefix+"-D3", 'Type.DEALER', T.dealers[2], +2));
  blocks.push('\n\n// ===== 다음 로봇 =====\n\n');
  // Flex normal
  blocks.push(buildRobotBlock(seedParams.prefix+"-N1", 'Type.NORMAL', T.normal, -6));

  return blocks.join('');
}

function runBatch(redFile, blueFile, opts) {
  const jsonPath = path.resolve(opts.jsonOut);
  const cmd = [
    'node', 'simulator/cli.js',
    '--red', redFile,
    '--blue', blueFile,
    '--repeat', String(opts.repeat),
    '--seed', String(opts.seed),
    '--concurrency', String(opts.concurrency||1),
    '--fast', '--runner', 'secure',
    '--json', jsonPath,
  ].join(' ');
  const out = sh(cmd);
  const j = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  return { out, json: j };
}

function scoreAggregate(agg) {
  // score = win rate with mild tie credit
  const total = agg.matches;
  const wins = agg.redWins;
  const ties = agg.draws;
  return (wins + 0.25*ties) / total;
}

async function main() {
  const args = parseArgs(process.argv);
  const TS = args.ts ? String(args.ts) : readLastTs();
  const workDir = path.resolve('work', TS);
  const resultDir = path.resolve('result', TS);
  if (!fs.existsSync(workDir)) fs.mkdirSync(workDir, { recursive: true });
  if (!fs.existsSync(resultDir)) fs.mkdirSync(resultDir, { recursive: true });

  const opponents = listOpponents(TS);
  if (opponents.length === 0) {
    console.log('No opponents found in result/. Exiting.');
    process.exit(0);
  }

  const rounds = args.rounds ? parseInt(args.rounds, 10) : 12;
  const seeds = args.seeds ? parseInt(args.seeds, 10) : 30;
  const concurrency = args.concurrency ? parseInt(args.concurrency, 10) : 8;

  // Select a diverse subset of opponents for tuning (cap ~14)
  const tuneOpponents = opponents.slice(0, Math.min(14, opponents.length));
  console.log(`Tuning against ${tuneOpponents.length} opponents (of ${opponents.length} total).`);

  const candPath = path.join(workDir, 'candidate.js');
  let best = { score: -1, code: null, name: null, scores: null };

  for (let r = 0; r < rounds; r++) {
    const seedParams = { prefix: `Nova-${r+1}`, jitter: r === 0 ? 0.0 : (0.5 + 0.3*Math.random()) };
    const code = buildTeamCode(seedParams);
    fs.writeFileSync(candPath, code);

    // Evaluate aggregate score across tuneOpponents with side-swap
    let totalScore = 0;
    let count = 0;
    for (const opp of tuneOpponents) {
      const json1 = path.join(workDir, `tmp_r${r}_vs_${path.basename(path.dirname(opp))}_1.json`);
      const res1 = runBatch(candPath, opp, { repeat: seeds, seed: 1000, concurrency, jsonOut: json1 });
      const s1 = scoreAggregate(res1.json.aggregate);
      // swap sides
      const json2 = path.join(workDir, `tmp_r${r}_vs_${path.basename(path.dirname(opp))}_2.json`);
      const res2 = runBatch(opp, candPath, { repeat: seeds, seed: 2000, concurrency, jsonOut: json2 });
      const agg2 = res2.json.aggregate;
      // When candidate is blue, wins are blueWins
      const total2 = agg2.matches; const wins2 = agg2.blueWins; const ties2 = agg2.draws; const s2 = (wins2 + 0.25*ties2) / total2;
      const avg = 0.5*(s1 + s2);
      totalScore += avg; count++;
    }
    const avgScore = totalScore / Math.max(1, count);
    console.log(`Round ${r+1}/${rounds} => avgScore=${avgScore.toFixed(4)}`);
    if (avgScore > best.score) {
      best = { score: avgScore, code, name: seedParams.prefix };
    }
  }

  // Write best team to result/<TS>/<TS>.txt
  const outFile = path.join(resultDir, `${TS}.txt`);
  fs.writeFileSync(outFile, best.code);
  console.log(`Saved best team -> ${outFile}`);

  // Final evaluation vs all opponents
  const finalCand = outFile;
  const rows = [];
  let winsum = 0, tiesum = 0, losssum = 0;
  for (const opp of opponents) {
    const base = path.basename(path.dirname(opp));
    const j1 = path.join(workDir, `final_${base}_1.json`);
    const r1 = runBatch(finalCand, opp, { repeat: Math.max(20, Math.min(seeds, 40)), seed: 4242, concurrency, jsonOut: j1 });
    const a1 = r1.json.aggregate;
    const s1 = scoreAggregate(a1);
    const j2 = path.join(workDir, `final_${base}_2.json`);
    const r2 = runBatch(opp, finalCand, { repeat: Math.max(20, Math.min(seeds, 40)), seed: 7777, concurrency, jsonOut: j2 });
    const a2 = r2.json.aggregate;
    const total2 = a2.matches; const wins2 = a2.blueWins; const ties2a = a2.draws; const s2 = (wins2 + 0.25*ties2a)/total2;
    const avg = 0.5*(s1+s2);
    const wr = 0.5*(a1.redWins/a1.matches + a2.blueWins/a2.matches);
    const dr = 0.5*(a1.draws/a1.matches + a2.draws/a2.matches);
    const lr = 1 - wr - dr;
    winsum += wr; tiesum += dr; losssum += lr;
    rows.push({ opp: base, wr, dr, lr, a1, a2 });
  }
  rows.sort((a,b)=>b.wr - a.wr);

  // Produce RESULT.md
  const lines = [];
  lines.push(`# Tech of Tank – Evaluation (${TS})`);
  lines.push('');
  lines.push(`- Team: ${best.name}`);
  lines.push(`- Opponents compared: ${opponents.length}`);
  lines.push('');
  lines.push('## Per-Opponent Results (side-swapped average)');
  lines.push('');
  lines.push('| Opponent | WinRate | DrawRate | LossRate |');
  lines.push('|---|---:|---:|---:|');
  for (const r of rows) {
    lines.push(`| ${r.opp} | ${(r.wr*100).toFixed(1)}% | ${(r.dr*100).toFixed(1)}% | ${(r.lr*100).toFixed(1)}% |`);
  }
  const overallWr = winsum/rows.length; const overallDr = tiesum/rows.length; const overallLr = losssum/rows.length;
  lines.push('');
  lines.push('## Overall');
  lines.push(`- Weighted WinRate: ${(overallWr*100).toFixed(2)}%`);
  lines.push(`- Weighted DrawRate: ${(overallDr*100).toFixed(2)}%`);
  lines.push(`- Weighted LossRate: ${(overallLr*100).toFixed(2)}%`);
  lines.push('');
  lines.push('This report averages results across side-swapped matches to reduce spawn bias.');

  const resultMd = path.join(workDir, 'RESULT.md');
  fs.writeFileSync(resultMd, lines.join('\n'));
  console.log(`Saved evaluation -> ${resultMd}`);
}

if (require.main === module) {
  main().catch((e)=>{ console.error(e); process.exit(1); });
}

