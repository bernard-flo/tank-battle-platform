#!/usr/bin/env node
/*
Searches parameter space to generate a strong team and evaluates it against existing results.

Outputs:
 - Writes final team to result/<STAMP>/<STAMP>.txt
 - Writes summary to work/<STAMP>/RESULT.md

Usage:
  node optimize.js --stamp 2025-09-10-18-11 --candidates 12 --seeds 24 --oppLimit 8 --concurrency 1
*/
const fs = require('fs');
const path = require('path');
const os = require('os');
const { runMatch } = require('../../simulator/engine');
const { compileTeamFromCode } = require('../../simulator/bot_loader');
const { generateTeamCode } = require('./gen_team');

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const k = a.slice(2);
      const n = argv[i + 1];
      if (n && !n.startsWith('--')) { args[k] = n; i++; }
      else { args[k] = true; }
    }
  }
  return args;
}

function findOpponentTxt(limit = 10, excludeStamp = null) {
  const resultDir = path.resolve('../../result');
  const dirs = fs.readdirSync(resultDir).filter((d) => fs.statSync(path.join(resultDir, d)).isDirectory());
  // prefer recent, filter those with a .txt whose name matches directory
  const entries = [];
  for (const d of dirs) {
    if (excludeStamp && d === excludeStamp) continue;
    const txtFiles = fs.readdirSync(path.join(resultDir, d)).filter((f) => f.endsWith('.txt'));
    if (txtFiles.length === 0) continue;
    // pick the largest .txt file as primary
    let pick = txtFiles[0];
    let bestSize = -1;
    for (const f of txtFiles) {
      const s = fs.statSync(path.join(resultDir, d, f)).size;
      if (s > bestSize) { bestSize = s; pick = f; }
    }
    entries.push({ dir: d, file: pick, path: path.join(resultDir, d, pick), size: bestSize });
  }
  entries.sort((a, b) => (a.dir < b.dir ? 1 : -1)); // reverse chronological by name
  return entries.slice(0, limit);
}

function scoreSummary(sum) {
  // Higher is better. Weight wins strongly, then energy diff.
  const winScore = (sum.redWins - sum.blueWins) * 1000;
  const energyScore = sum.avgRedEnergy - sum.avgBlueEnergy; // can be negative
  const aliveScore = (sum.avgRedAlive - sum.avgBlueAlive) * 50;
  return winScore + energyScore + aliveScore;
}

async function evaluateMatchup(redCode, blueCode, opts) {
  const seeds = Array.from({ length: opts.seeds }, (_, i) => opts.baseSeed + i);
  let redWins = 0, blueWins = 0, draws = 0, ticksSum = 0, redAliveSum = 0, blueAliveSum = 0, redEnergySum = 0, blueEnergySum = 0;
  const red = compileTeamFromCode(redCode, 'red', 'secure');
  const blue = compileTeamFromCode(blueCode, 'blue', 'secure');
  const players = [...red, ...blue];
  for (const s of seeds) {
    const result = runMatch(players, { seed: s, maxTicks: opts.maxTicks || 5000, fast: true });
    if (result.winner === 'red') redWins++; else if (result.winner === 'blue') blueWins++; else draws++;
    ticksSum += result.ticks;
    redAliveSum += result.stats.redAlive; blueAliveSum += result.stats.blueAlive;
    redEnergySum += Math.round(result.stats.redEnergy); blueEnergySum += Math.round(result.stats.blueEnergy);
  }
  const summaries = { matches: seeds.length, redWins, blueWins, draws, avgTicks: +(ticksSum/seeds.length).toFixed(2), avgRedAlive: +(redAliveSum/seeds.length).toFixed(3), avgBlueAlive: +(blueAliveSum/seeds.length).toFixed(3), avgRedEnergy: +(redEnergySum/seeds.length).toFixed(2), avgBlueEnergy: +(blueEnergySum/seeds.length).toFixed(2) };
  return summaries;
}

async function main() {
  const args = parseArgs(process.argv);
  const stamp = args.stamp || process.env.STAMP || path.basename(path.resolve('.'));
  const workDir = path.resolve(`.`);
  const rootDir = path.resolve('../../');
  const outResultDir = path.join(rootDir, 'result', stamp);
  const outTxt = path.join(outResultDir, `${stamp}.txt`);

  const candidates = Math.max(1, parseInt(args.candidates || '12', 10));
  const seeds = Math.max(6, parseInt(args.seeds || '24', 10));
  const oppLimit = Math.max(2, parseInt(args.oppLimit || '8', 10));
  const baseSeed = Math.floor(Math.random() * 1e9);

  const opponents = findOpponentTxt(oppLimit, stamp);
  if (opponents.length === 0) {
    console.error('No opponents found in result/. Exiting.');
    process.exit(1);
  }
  console.log(`Opponents (${opponents.length}):`);
  for (const o of opponents) console.log(` - ${o.dir}/${o.file}`);

  let best = null;
  const logs = [];
  for (let i = 0; i < candidates; i++) {
    const code = generateTeamCode({ seed: baseSeed + i, teamName: 'Nova' });
    let totalScore = 0;
    const sums = [];
    for (const opp of opponents) {
      const blueCode = fs.readFileSync(opp.path, 'utf8');
      const summary = await evaluateMatchup(code, blueCode, { seeds, baseSeed: baseSeed + 1000 + i * 100, maxTicks: 5000 });
      const sc = scoreSummary(summary);
      totalScore += sc;
      sums.push({ opponent: `${opp.dir}/${opp.file}`, summary, score: sc });
    }
    const rec = { idx: i, seed: baseSeed + i, totalScore, code, sums };
    logs.push(rec);
    if (!best || totalScore > best.totalScore) { best = rec; }
    console.log(`Candidate ${i+1}/${candidates}: score=${totalScore.toFixed(2)}`);
  }

  // Write final team
  fs.writeFileSync(outTxt, best.code, 'utf8');
  console.log(`Wrote final team -> ${outTxt}`);

  // Summarize to RESULT.md
  const mdLines = [];
  mdLines.push(`# Result: ${stamp}`);
  mdLines.push('');
  mdLines.push(`Opponents tested: ${opponents.length}, matches per opponent: ${seeds}`);
  mdLines.push('');
  mdLines.push(`Best candidate seed: ${best.seed}`);
  mdLines.push('');
  mdLines.push('## Matchups');
  for (const s of best.sums) {
    const sm = s.summary;
    mdLines.push(`- ${s.opponent}: wins ${sm.redWins}/${sm.matches}, draws ${sm.draws}, avgTicks ${sm.avgTicks}, avgAlive R:${sm.avgRedAlive} B:${sm.avgBlueAlive}, avgEnergy R:${sm.avgRedEnergy} B:${sm.avgBlueEnergy}, score ${s.score.toFixed(2)}`);
  }
  mdLines.push('');
  mdLines.push('## Selection Log (top 5)');
  const top5 = logs.slice().sort((a,b) => b.totalScore - a.totalScore).slice(0,5);
  for (const r of top5) mdLines.push(`- seed ${r.seed}: totalScore ${r.totalScore.toFixed(2)}`);

  fs.writeFileSync(path.join(workDir, 'RESULT.md'), mdLines.join('\n'), 'utf8');
  console.log('Wrote RESULT.md');
}

if (require.main === module) {
  main().catch((e) => { console.error(e); process.exit(1); });
}

