#!/usr/bin/env node
/*
  Evaluate our team against all existing results in result/.
  - Tests multiple variants quickly to pick the best.
  - Runs a more thorough evaluation for the chosen variant.
  - Writes RESULT.md summarizing outcomes.

  Usage: node evaluate.js
*/
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const SIM = path.join(ROOT, 'simulator', 'cli.js');
const RESULT_DIR = path.join(ROOT, 'result');
const WORK_DIR = __dirname;
const TS = path.basename(WORK_DIR);
const OUR_OUT = path.join(WORK_DIR, `${TS}.txt`);
const OUR_RESULT_PATH = path.join(RESULT_DIR, TS, `${TS}.txt`);

function listOpponents() {
  const files = new Set();
  // Top-level .txt
  for (const f of (fs.readdirSync(RESULT_DIR))) {
    const p = path.join(RESULT_DIR, f);
    if (fs.statSync(p).isFile() && f.endsWith('.txt')) files.add(p);
  }
  // Nested timestamp dirs
  for (const d of (fs.readdirSync(RESULT_DIR))) {
    const p = path.join(RESULT_DIR, d);
    if (fs.statSync(p).isDirectory()) {
      for (const f of fs.readdirSync(p)) {
        if (f.endsWith('.txt')) files.add(path.join(p, f));
      }
    }
  }
  // Exclude our current output if present
  files.delete(OUR_RESULT_PATH);
  files.delete(OUR_OUT);
  return Array.from(files).sort();
}

function runBatch(red, blue, repeat, seed, concurrency=8) {
  const outPath = path.join(WORK_DIR, `tmp_${path.basename(red)}_vs_${path.basename(blue)}_${repeat}.json`);
  const args = [SIM, '--red', red, '--blue', blue, '--repeat', String(repeat), '--seed', String(seed), '--json', outPath, '--concurrency', String(concurrency), '--fast'];
  const r = spawnSync('node', args, { stdio: 'pipe' });
  if (r.status !== 0) {
    console.error(`CLI failed: ${r.stderr.toString()}`);
    throw new Error('sim failed');
  }
  const data = JSON.parse(fs.readFileSync(outPath, 'utf8'));
  return data.aggregate || { matches:1, redWins: data.summary.winner==='red'?1:0, blueWins: data.summary.winner==='blue'?1:0, draws: data.summary.winner==='draw'?1:0 };
}

function pickBestVariant(variants, opponents, quickRepeat=8) {
  const seed = 4242;
  const scores = [];
  for (const v of variants) {
    // Generate variant code
    const out = path.join(WORK_DIR, `${TS}.${v}.txt`);
    const g = spawnSync('node', [path.join(WORK_DIR, 'generate_team.js'), '--variant', v, '--out', out], { stdio: 'pipe' });
    if (g.status !== 0) throw new Error(`gen failed ${v}`);
    // Evaluate against a subset for speed (up to 12 opponents, favor latest)
    const subset = opponents.slice(-12);
    let wins = 0, games = 0;
    for (const opp of subset) {
      const a = runBatch(out, opp, quickRepeat, seed, 8); // us red
      const b = runBatch(opp, out, quickRepeat, seed, 8); // us blue
      wins += a.redWins + b.blueWins;
      games += (a.matches + b.matches - (a.draws + b.draws));
    }
    const winRate = games>0 ? wins / games : 0;
    scores.push({ variant: v, winRate });
  }
  scores.sort((x,y)=>y.winRate-x.winRate);
  return { best: scores[0], all: scores };
}

function thoroughEval(bestPath, opponents, repeat=20) {
  const seed = 9001;
  const details = [];
  let totalWins = 0, totalGames = 0, totalDraws=0;
  for (const opp of opponents) {
    const a = runBatch(bestPath, opp, repeat, seed, 8);
    const b = runBatch(opp, bestPath, repeat, seed, 8);
    const wins = a.redWins + b.blueWins;
    const games = (a.matches + b.matches - (a.draws + b.draws));
    const draws = a.draws + b.draws;
    const wr = games>0 ? wins / games : 0;
    details.push({ opponent: opp.replace(RESULT_DIR+path.sep, ''), winRate: +wr.toFixed(3), wins, games, draws });
    totalWins += wins; totalGames += games; totalDraws += draws;
  }
  const overall = { winRate: totalGames>0 ? +(totalWins/totalGames).toFixed(4) : 0, totalWins, totalGames, totalDraws };
  details.sort((a,b)=>a.winRate===b.winRate? a.opponent.localeCompare(b.opponent) : b.winRate - a.winRate);
  return { overall, details };
}

function writeResultMd(chosenVariant, pickScores, evalSummary) {
  const lines = [];
  lines.push(`# RESULT for ${TS}`);
  lines.push('');
  lines.push(`- Team: AquilaX (${chosenVariant})`);
  lines.push(`- Overall WinRate: ${(evalSummary.overall.winRate*100).toFixed(2)}% (${evalSummary.overall.totalWins}/${evalSummary.overall.totalGames}, Draws ${evalSummary.overall.totalDraws})`);
  lines.push('');
  lines.push('## Variant Comparison (quick)');
  for (const s of pickScores) {
    lines.push(`- ${s.variant}: ${(s.winRate*100).toFixed(2)}%`);
  }
  lines.push('');
  lines.push('## Per-Opponent WinRates');
  for (const d of evalSummary.details) {
    lines.push(`- ${d.opponent}: ${(d.winRate*100).toFixed(2)}% (${d.wins}/${d.games}, draws ${d.draws})`);
  }
  fs.writeFileSync(path.join(WORK_DIR, 'RESULT.md'), lines.join('\n'));
}

function main(){
  const opponents = listOpponents();
  if (opponents.length === 0) throw new Error('no opponents found in result/');
  // Ensure base file exists for reference
  if (!fs.existsSync(OUR_OUT)) {
    const g = spawnSync('node', [path.join(WORK_DIR, 'generate_team.js'), '--variant', 'base', '--out', OUR_OUT]);
    if (g.status !== 0) throw new Error('cannot generate base');
  }
  const { best, all } = pickBestVariant(['base','precision','aggressive','defensive'], opponents, 8);
  const bestPath = path.join(WORK_DIR, `${TS}.${best.variant}.txt`);
  const evalSummary = thoroughEval(bestPath, opponents, 20);
  writeResultMd(best.variant, all, evalSummary);
  // Copy chosen to result/<TS>/<TS>.txt as final
  fs.copyFileSync(bestPath, OUR_RESULT_PATH);
  console.log(`Best variant: ${best.variant}, Overall winRate ~ ${(evalSummary.overall.winRate*100).toFixed(2)}%`);
}

if (require.main === module) {
  main();
}

