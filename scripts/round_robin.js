#!/usr/bin/env node
/*
 Round-robin runner and ranker for tank battle scripts in result/.

 - Enumerates all .txt files under result/
 - Runs pairwise matches (A as red vs B as blue) using simulator/cli.js
 - Args: --repeat 10 --seed 1 --concurrency 10 (as requested)
 - Stores per-pair JSON outputs under work/round_robin/<timestamp>/pairs/
 - Aggregates wins/draws/losses and points (win=1, draw=0.5) to rank teams
 - Prints a ranking table and writes work/round_robin/<timestamp>/ranking.json

 Notes:
 - Each pairing is executed as a separate CLI command (no multi-match single CLI).
 - Only one direction per pair (A red vs B blue) for efficiency.
*/

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const RESULT_DIR = path.join(PROJECT_ROOT, 'result');
const SIM_CLI = path.join(PROJECT_ROOT, 'simulator', 'cli.js');

const REPEAT = 10;
const SEED = 1;
const CONCURRENCY = 10;

function listTeamFiles(dir) {
  const files = fs.readdirSync(dir)
    .filter((f) => f.endsWith('.txt'))
    .map((f) => path.join(dir, f))
    .sort();
  if (files.length < 2) {
    throw new Error(`Need at least 2 team files in ${dir}`);
  }
  return files;
}

function niceName(fp) {
  return path.basename(fp).replace(/\.txt$/, '');
}

async function runPair(redFile, blueFile, outJson) {
  return new Promise((resolve, reject) => {
    const args = [SIM_CLI, '--red', redFile, '--blue', blueFile,
      '--repeat', String(REPEAT), '--seed', String(SEED), '--concurrency', String(CONCURRENCY),
      '--json', outJson,
    ];
    const p = spawn('node', args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    p.stdout.on('data', (d) => { stdout += d.toString(); });
    p.stderr.on('data', (d) => { stderr += d.toString(); });
    p.on('error', reject);
    p.on('exit', (code) => {
      if (code !== 0) {
        reject(new Error(`CLI exited with ${code}:\n${stderr}`));
        return;
      }
      try {
        const data = JSON.parse(fs.readFileSync(outJson, 'utf8'));
        resolve({ stdout, stderr, data });
      } catch (e) {
        reject(new Error(`Failed to read JSON ${outJson}: ${e.message}\nCLI output:\n${stdout}\n${stderr}`));
      }
    });
  });
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function createOutDirs() {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const base = path.join(PROJECT_ROOT, 'work', 'round_robin', stamp);
  const pairs = path.join(base, 'pairs');
  ensureDir(pairs);
  return { base, pairs };
}

function initScoreboard(files) {
  const board = {};
  for (const f of files) {
    const key = niceName(f);
    board[key] = {
      file: f,
      name: key,
      wins: 0,
      losses: 0,
      draws: 0,
      points: 0, // win=1, draw=0.5
      energyDiff: 0, // tie-breaker: sum of avg energy diffs across pairs
      vs: {}, // opponent -> { wins, losses, draws, points }
    };
  }
  return board;
}

function applyAggregate(board, redKey, blueKey, aggregate) {
  const red = board[redKey];
  const blue = board[blueKey];
  const { redWins, blueWins, draws, avgRedEnergy, avgBlueEnergy } = aggregate;

  // Update red side
  red.wins += redWins;
  red.losses += blueWins;
  red.draws += draws;
  red.points += redWins + draws * 0.5;
  red.energyDiff += (avgRedEnergy - avgBlueEnergy);
  if (!red.vs[blueKey]) red.vs[blueKey] = { wins: 0, losses: 0, draws: 0, points: 0 };
  red.vs[blueKey].wins += redWins;
  red.vs[blueKey].losses += blueWins;
  red.vs[blueKey].draws += draws;
  red.vs[blueKey].points += redWins + draws * 0.5;

  // Update blue side (mirror)
  blue.wins += blueWins;
  blue.losses += redWins;
  blue.draws += draws;
  blue.points += blueWins + draws * 0.5;
  blue.energyDiff += (avgBlueEnergy - avgRedEnergy);
  if (!blue.vs[redKey]) blue.vs[redKey] = { wins: 0, losses: 0, draws: 0, points: 0 };
  blue.vs[redKey].wins += blueWins;
  blue.vs[redKey].losses += redWins;
  blue.vs[redKey].draws += draws;
  blue.vs[redKey].points += blueWins + draws * 0.5;
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

async function main() {
  const cli = parseCLI();
  const files = listTeamFiles(RESULT_DIR);
  const outDirs = createOutDirs();
  const board = initScoreboard(files);

  const pairs = [];
  for (let i = 0; i < files.length; i++) {
    for (let j = i + 1; j < files.length; j++) {
      pairs.push([files[i], files[j]]);
    }
  }

  const totalPairs = pairs.length;
  const start = cli.start ? Math.max(0, parseInt(cli.start, 10)) : 0;
  const count = cli.count ? Math.max(1, parseInt(cli.count, 10)) : (totalPairs - start);
  const end = Math.min(totalPairs, start + count);

  console.log(`Found ${files.length} team scripts. Total pairings: ${totalPairs}. Running range [${start}, ${end}).`);

  for (let idx = start; idx < end; idx++) {
    const [redFile, blueFile] = pairs[idx];
    const redKey = niceName(redFile);
    const blueKey = niceName(blueFile);
    const outJson = path.join(outDirs.pairs, `${redKey}__vs__${blueKey}.json`);
    process.stdout.write(`[${idx + 1}/${totalPairs}] ${redKey} (red) vs ${blueKey} (blue) ... `);
    const { data } = await runPair(redFile, blueFile, outJson);
    const agg = data.aggregate || data.summary || {};
    if (!agg || (agg.matches !== undefined && agg.matches !== REPEAT)) {
      throw new Error(`Unexpected JSON structure for ${outJson}`);
    }
    applyAggregate(board, redKey, blueKey, agg);
    console.log(`done (R:${agg.redWins} B:${agg.blueWins} D:${agg.draws})`);
  }

  const ranking = toRankingArray(board);
  const out = {
    config: { repeat: REPEAT, seed: SEED, concurrency: CONCURRENCY, direction: 'one-way (red vs blue)' },
    timestamp: new Date().toISOString(),
    ranking,
  };
  fs.writeFileSync(path.join(outDirs.base, 'ranking.json'), JSON.stringify(out, null, 2));

  // Pretty print
  console.log('\n=== Ranking (points, W-D-L, energyDiff) ===');
  ranking.forEach((r, i) => {
    const l = r.losses;
    const d = r.draws;
    const w = r.wins;
    console.log(`#${i + 1} ${r.name}  : ${r.points.toFixed(1)} pts  (${w}-${d}-${l})  ΔE=${r.energyDiff.toFixed(1)}`);
  });
  console.log(`\nSaved ranking and pair results under: ${outDirs.base}`);
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
