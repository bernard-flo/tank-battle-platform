#!/usr/bin/env node
/* eslint-disable no-console */
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

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function parsePairFromFilename(filename) {
  // Expect pattern: <red>__vs__<blue>.json (we will URL-encode names when saving if needed)
  const base = path.basename(filename, '.json');
  const m = base.split('__vs__');
  if (m.length !== 2) return null;
  const decode = (s) => decodeURIComponent(s);
  return { redFile: decode(m[0]), blueFile: decode(m[1]) };
}

function main() {
  const args = parseArgs(process.argv);
  const dir = args.dir ? path.resolve(args.dir) : path.resolve('work/matches');
  const outPath = args.output ? path.resolve(args.output) : path.resolve('work/rankings.json');
  ensureDir(path.dirname(outPath));

  if (!fs.existsSync(dir)) {
    console.error(`No match results directory found: ${dir}`);
    process.exit(2);
  }

  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json'));
  const scores = new Map(); // name -> {wins, losses, draws, points, games}

  function touch(name) {
    if (!scores.has(name)) scores.set(name, { wins: 0, losses: 0, draws: 0, points: 0, games: 0 });
    return scores.get(name);
  }

  let pairsCount = 0;
  for (const f of files) {
    const full = path.join(dir, f);
    const pair = parsePairFromFilename(f);
    if (!pair) continue;
    let json;
    try {
      json = JSON.parse(fs.readFileSync(full, 'utf8'));
    } catch (e) {
      console.warn(`Skip invalid JSON: ${full}`);
      continue;
    }
    const agg = json.aggregate;
    if (!agg || typeof agg.redWins !== 'number') {
      console.warn(`Skip missing aggregate: ${full}`);
      continue;
    }
    const { redFile, blueFile } = pair;
    const red = touch(redFile);
    const blue = touch(blueFile);

    const m = agg.matches || (agg.redWins + agg.blueWins + agg.draws) || 0;
    red.wins += agg.redWins; red.losses += agg.blueWins; red.draws += agg.draws; red.games += m; red.points += agg.redWins + agg.draws * 0.5;
    blue.wins += agg.blueWins; blue.losses += agg.redWins; blue.draws += agg.draws; blue.games += m; blue.points += agg.blueWins + agg.draws * 0.5;
    pairsCount++;
  }

  const table = Array.from(scores.entries()).map(([name, s]) => {
    const winRate = s.games > 0 ? +(s.points / s.games).toFixed(4) : 0;
    return { name, ...s, winRate };
  }).sort((a, b) => (b.points - a.points) || (b.winRate - a.winRate) || (a.name.localeCompare(b.name)));

  const output = { pairsEvaluated: pairsCount, competitors: table.length, ranking: table };
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2));

  // Pretty print to console
  console.log('=== Rankings ===');
  table.forEach((row, i) => {
    console.log(`${String(i + 1).padStart(2, '0')}. ${row.name}  | Points: ${row.points.toFixed(2)} | Games: ${row.games} | W/D/L: ${row.wins}/${row.draws}/${row.losses} | WinRate: ${(row.winRate * 100).toFixed(2)}%`);
  });
  console.log(`Saved -> ${outPath}`);
}

if (require.main === module) {
  try { main(); }
  catch (e) { console.error(e); process.exit(1); }
}

