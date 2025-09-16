#!/usr/bin/env node
/*
 Aggregate rankings from per-pair JSONs produced by scripts/round_robin.js.

 Usage:
   node scripts/aggregate_ranking.js --dir work/round_robin/<stamp>/pairs

 - Computes points (win=1, draw=0.5), W-D-L, and energyDiff tie-breaker
 - Prints ranking and writes ranking.json beside the pairs directory
*/

const fs = require('fs');
const path = require('path');

function parseCLI() {
  const args = {};
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) {
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

function niceNameFromPairFile(fp) {
  const base = path.basename(fp).replace(/\.json$/, '');
  const parts = base.split('__vs__');
  if (parts.length !== 2) return null;
  return { red: parts[0], blue: parts[1] };
}

function initBoard() {
  return {};
}

function ensureTeam(board, key) {
  if (!board[key]) {
    board[key] = { name: key, wins: 0, losses: 0, draws: 0, points: 0, energyDiff: 0, vs: {} };
  }
}

function applyAggregate(board, redKey, blueKey, aggregate) {
  ensureTeam(board, redKey);
  ensureTeam(board, blueKey);
  const red = board[redKey];
  const blue = board[blueKey];
  const { redWins, blueWins, draws, avgRedEnergy, avgBlueEnergy } = aggregate;
  red.wins += redWins; red.losses += blueWins; red.draws += draws; red.points += redWins + draws * 0.5; red.energyDiff += (avgRedEnergy - avgBlueEnergy);
  blue.wins += blueWins; blue.losses += redWins; blue.draws += draws; blue.points += blueWins + draws * 0.5; blue.energyDiff += (avgBlueEnergy - avgRedEnergy);
  if (!red.vs[blueKey]) red.vs[blueKey] = { wins: 0, losses: 0, draws: 0, points: 0 };
  if (!blue.vs[redKey]) blue.vs[redKey] = { wins: 0, losses: 0, draws: 0, points: 0 };
  red.vs[blueKey].wins += redWins; red.vs[blueKey].losses += blueWins; red.vs[blueKey].draws += draws; red.vs[blueKey].points += redWins + draws * 0.5;
  blue.vs[redKey].wins += blueWins; blue.vs[redKey].losses += redWins; blue.vs[redKey].draws += draws; blue.vs[redKey].points += blueWins + draws * 0.5;
}

function toRankingArray(board) {
  const arr = Object.values(board);
  arr.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.wins !== a.wins) return b.wins - a.wins;
    if (b.energyDiff !== a.energyDiff) return b.energyDiff - a.energyDiff;
    return a.name.localeCompare(b.name);
  });
  return arr;
}

function main() {
  const cli = parseCLI();
  const pairsDir = cli.dir ? path.resolve(cli.dir) : null;
  if (!pairsDir) throw new Error('Usage: node scripts/aggregate_ranking.js --dir <pairsDir>');
  const files = fs.readdirSync(pairsDir).filter((f) => f.endsWith('.json')).map((f) => path.join(pairsDir, f)).sort();
  if (files.length === 0) throw new Error(`No JSON files found in ${pairsDir}`);
  const board = initBoard();
  let repeat = null;
  let seed = null;
  let concurrency = null;
  for (const fp of files) {
    const names = niceNameFromPairFile(fp);
    if (!names) continue;
    const data = JSON.parse(fs.readFileSync(fp, 'utf8'));
    const agg = data.aggregate || data.summary || {};
    if (repeat == null && agg.matches != null) repeat = agg.matches;
    if (seed == null && agg.baseSeed != null) seed = agg.baseSeed;
    if (concurrency == null && agg.concurrency != null) concurrency = agg.concurrency;
    applyAggregate(board, names.red, names.blue, agg);
  }
  const ranking = toRankingArray(board);
  const out = { timestamp: new Date().toISOString(), config: { repeat, seed, concurrency }, ranking };
  const base = path.dirname(pairsDir);
  const outPath = path.join(base, 'ranking.json');
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
  console.log('=== Ranking (points, W-D-L, energyDiff) ===');
  ranking.forEach((r, i) => {
    const l = r.losses; const d = r.draws; const w = r.wins;
    console.log(`#${i + 1} ${r.name}  : ${r.points.toFixed(1)} pts  (${w}-${d}-${l})  ΔE=${r.energyDiff.toFixed(1)}`);
  });
  console.log(`\nSaved -> ${outPath}`);
}

if (require.main === module) {
  try { main(); } catch (e) { console.error(e.message || e); process.exit(1); }
}

