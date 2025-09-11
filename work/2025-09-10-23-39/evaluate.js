#!/usr/bin/env node
/*
  Evaluate generated teams against existing results (opponents) using the headless simulator.
  - Stage 1: coarse evaluation across multiple parameter variants vs a subset of opponents.
  - Stage 2: refined evaluation for top candidates vs top opponents.
  - Outputs: best team code to ./best.txt and writes summary to RESULT.md.

  This script respects the import format of tank_battle_platform.html and .agent/SIMULATOR.md.
*/

const fs = require('fs');
const path = require('path');
const { runMatch } = require('../../simulator/engine');
const { compileTeamFromCode } = require('../../simulator/bot_loader');

function readFile(p) { return fs.readFileSync(path.resolve(p), 'utf8'); }
function writeFile(p, s) { fs.writeFileSync(path.resolve(p), s); }

function listOpponentTxt(maxCount = 20) {
  const base = path.join(__dirname, '../../result');
  const items = fs.readdirSync(base).map(n => path.join(base, n)).filter(p => fs.existsSync(p));
  const dirs = items.filter(p => fs.statSync(p).isDirectory());
  const files = [];
  for (const d of dirs) {
    const entries = fs.readdirSync(d).filter(f => f.endsWith('.txt'));
    for (const f of entries) {
      const fp = path.join(d, f);
      files.push({ file: fp, mtime: fs.statSync(fp).mtimeMs });
    }
  }
  files.sort((a,b)=>b.mtime-a.mtime);
  return files.slice(0, maxCount).map(x => x.file);
}

function scorePair(redCode, blueCode, opts) {
  const red = compileTeamFromCode(redCode, 'red', 'secure');
  const blue = compileTeamFromCode(blueCode, 'blue', 'secure');
  const players = [...red, ...blue];
  const baseSeed = opts.baseSeed || 12345;
  const repeat = opts.repeat || 10;
  const maxTicks = opts.maxTicks || 4000;
  const fast = true; // speed up
  let rWins=0, bWins=0, draws=0;
  for (let i=0;i<repeat;i++) {
    const seed = baseSeed + i;
    const { winner } = runMatch(players, { seed, maxTicks, record: false, fast });
    if (winner === 'red') rWins++; else if (winner === 'blue') bWins++; else draws++;
  }
  return { rWins, bWins, draws, games: repeat };
}

function sumScore(arr){ return arr.reduce((a,b)=>({rWins:a.rWins+b.rWins,bWins:a.bWins+b.bWins,draws:a.draws+b.draws,games:a.games+b.games}),{rWins:0,bWins:0,draws:0,games:0}); }

function pct(n,d){ return d?+(100*n/d).toFixed(1):0; }

function buildTeamFromGenerator(genPath, outPath, prefix, tweak){
  const gen = require(path.resolve(genPath));
  const code = gen.buildTeam(prefix, 'v1', tweak||{});
  fs.writeFileSync(path.resolve(outPath), code);
  return code;
}

function stageEvaluate(candidates, opponents, opts) {
  const results = [];
  for (const cand of candidates) {
    let agg = { rWins:0,bWins:0,draws:0,games:0 };
    let vsBreakdown = [];
    for (const opp of opponents) {
      const blueCode = readFile(opp);
      const s1 = scorePair(cand.code, blueCode, { repeat: opts.repeatPerSide, baseSeed: 1000, maxTicks: opts.maxTicks });
      // swap sides
      const s2 = scorePair(blueCode, cand.code, { repeat: opts.repeatPerSide, baseSeed: 2000, maxTicks: opts.maxTicks });
      // normalize to cand perspective
      const s = { rWins: s1.rWins + s2.bWins, bWins: s1.bWins + s2.rWins, draws: s1.draws + s2.draws, games: s1.games + s2.games };
      agg = sumScore([agg, s]);
      vsBreakdown.push({ opponent: opp, ...s, winRate: pct(s.rWins, s.games) });
    }
    const winRate = pct(agg.rWins, agg.games);
    results.push({ name: cand.name, code: cand.code, tweak: cand.tweak, agg, winRate, vs: vsBreakdown });
  }
  results.sort((a,b)=>b.winRate - a.winRate);
  return results;
}

function main(){
  const CWD = __dirname;
  const genPath = path.join(CWD, 'generate_team.js');
  const outBase = path.join(CWD, 'candidates');
  if (!fs.existsSync(outBase)) fs.mkdirSync(outBase, { recursive: true });

  // 1) Opponents: take recent ones
  const opponents = listOpponentTxt(18);
  if (opponents.length === 0) {
    console.error('No opponent .txt found under result/.');
    process.exit(1);
  }

  // 2) Candidate parameter variants (coarse search)
  const baseTweaks = [
    { tag:'A', rMin:168, rMax:280, strafe:28, fleeBias:16, aimJitter:0.14, leadW:0.95, biasShift:-4 },
    { tag:'B', rMin:176, rMax:288, strafe:30, fleeBias:18, aimJitter:0.16, leadW:0.96, biasShift:6 },
    { tag:'C', rMin:164, rMax:272, strafe:26, fleeBias:14, aimJitter:0.12, leadW:0.94, biasShift:0 },
    { tag:'D', rMin:170, rMax:300, strafe:32, fleeBias:18, aimJitter:0.18, leadW:0.93, biasShift:-8 },
    { tag:'E', rMin:178, rMax:292, strafe:29, fleeBias:17, aimJitter:0.15, leadW:0.95, biasShift:10 },
  ];

  const candidates = [];
  for (const t of baseTweaks) {
    // advanced style (v1)
    const file1 = path.join(outBase, `team_${t.tag}_v1.txt`);
    const gen1 = require(path.resolve(genPath));
    const code1 = gen1.buildTeam(`Nova-${t.tag}`, 'v1', t);
    fs.writeFileSync(file1, code1);
    candidates.push({ name: `Nova-${t.tag}-v1`, file: file1, code: code1, tweak: t });
    // simple style
    const file2 = path.join(outBase, `team_${t.tag}_simple.txt`);
    const code2 = gen1.buildTeam(`Nova-${t.tag}-S`, 'simple', t);
    fs.writeFileSync(file2, code2);
    candidates.push({ name: `Nova-${t.tag}-simple`, file: file2, code: code2, tweak: { ...t, style: 'simple' } });
  }

  // 3) Stage 1: quick evaluation
  const stage1 = stageEvaluate(candidates, opponents.slice(0, 10), { repeatPerSide: 6, maxTicks: 3600 });

  // Pick top 2
  const top = stage1.slice(0, 2);

  // 4) Stage 2: refined evaluation vs broader set
  const stage2 = stageEvaluate(top, opponents, { repeatPerSide: 12, maxTicks: 4200 });

  // Choose best
  let best = stage2[0];

  // 5) Stage 3: local mutation search around best
  const baseTweak = { ...(best.tweak || {}) };
  const jitter = (v, d, lo, hi) => Math.max(lo, Math.min(hi, v + (Math.random()*2-1)*d));
  const mutations = [];
  for (let i=0;i<8;i++) {
    mutations.push({
      rMin: Math.round(jitter(baseTweak.rMin||170, 12, 140, 220)),
      rMax: Math.round(jitter(baseTweak.rMax||280, 12, 230, 340)),
      strafe: Math.round(jitter(baseTweak.strafe||28, 6, 18, 42)),
      fleeBias: Math.round(jitter(baseTweak.fleeBias||16, 6, 8, 28)),
      aimJitter: +(jitter(baseTweak.aimJitter||0.15, 0.05, 0.05, 0.3)).toFixed(2),
      leadW: +(jitter(baseTweak.leadW||0.95, 0.05, 0.8, 1.0)).toFixed(2),
      biasShift: Math.round(jitter(baseTweak.biasShift||0, 10, -16, 16)),
    });
  }
  const gen = require(path.resolve(genPath));
  const localCandidates = mutations.map((t, idx) => {
    const file = path.join(outBase, `team_L${idx}.txt`);
    const code = gen.buildTeam(`Nova-L${idx}`, 'v1', t);
    fs.writeFileSync(file, code);
    return { name: `Nova-L${idx}`, file, code, tweak: t };
  });
  const stage3 = stageEvaluate(localCandidates, opponents, { repeatPerSide: 10, maxTicks: 4200 });
  if (stage3[0] && stage3[0].winRate > best.winRate) {
    best = stage3[0];
  }

  // 6) Save outputs
  const bestPath = path.join(CWD, 'best.txt');
  writeFile(bestPath, best.code);

  // Prepare RESULT.md
  const lines = [];
  lines.push(`# Evaluation Result`);
  lines.push('');
  lines.push(`Best: ${best.name} (winRate=${best.winRate}%)`);
  lines.push('');
  lines.push('## Stage 1 Summary');
  for (const r of stage1) {
    lines.push(`- ${r.name}: winRate=${r.winRate}% (games=${r.agg.games}, wins=${r.agg.rWins}, losses=${r.agg.bWins}, draws=${r.agg.draws})`);
  }
  lines.push('');
  lines.push('## Stage 2 Breakdown (Top Candidates)');
  for (const r of stage2) {
    lines.push(`### ${r.name}: winRate=${r.winRate}% (games=${r.agg.games}, wins=${r.agg.rWins}, losses=${r.agg.bWins}, draws=${r.agg.draws})`);
    for (const v of r.vs) {
      lines.push(`- vs ${path.basename(path.dirname(v.opponent))}/${path.basename(v.opponent)}: winRate=${v.winRate}%, W:${v.rWins} L:${v.bWins} D:${v.draws} (n=${v.games})`);
    }
    lines.push('');
  }
  writeFile(path.join(CWD, 'RESULT.md'), lines.join('\n'));

  console.log(`Best candidate: ${best.name} with winRate=${best.winRate}%`);
}

if (require.main === module) {
  main();
}
