#!/usr/bin/env node
/*
 Round-robin matcher for all AI team files under result/.
 - Discovers files containing "function name()" in result/ recursively (e.g., timestamp dirs, team.js, *.txt)
 - Runs pairwise matches using simulator/cli.js with repeat and concurrency
 - Aggregates per-team W/L/D and win rates
 - Writes Markdown summary to result/MATCH.md

 Usage:
   node scripts/round_robin.js [--repeat 10] [--pairConcurrency 2] [--internalConcurrency 8] [--seed 1000]
*/
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const RESULT_DIR = path.join(ROOT, 'result');
const SIM_CLI = path.join(ROOT, 'simulator', 'cli.js');

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

function listFilesRec(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'MATCH.md') continue; // skip previous report
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listFilesRec(p));
    else out.push(p);
  }
  return out;
}

function containsSignature(p) {
  try {
    const buf = fs.readFileSync(p, 'utf8');
    return /function\s+name\s*\(\s*\)/.test(buf);
  } catch { return false; }
}

function discoverTeams() {
  const files = listFilesRec(RESULT_DIR);
  const teamFiles = files.filter((p) => /\.(txt|js)$/i.test(p) && containsSignature(p));
  // sort for stable order
  teamFiles.sort((a, b) => a.localeCompare(b));
  return teamFiles;
}

function idFor(p) {
  // Make a readable id relative to result/
  const rel = path.relative(RESULT_DIR, p);
  return rel;
}

function runCliMatch(red, blue, opts) {
  return new Promise((resolve, reject) => {
    const tmpJson = path.join(os.tmpdir(), `tb_summary_${Date.now()}_${Math.random().toString(36).slice(2)}.json`);
    const args = [SIM_CLI,
      '--red', red,
      '--blue', blue,
      '--repeat', String(opts.repeat),
      '--concurrency', String(opts.internalConcurrency),
      '--seed', String(opts.seed),
      '--fast', '--runner', 'secure',
      '--json', tmpJson,
    ];
    const child = spawn('node', args, { cwd: ROOT });
    let stderr = '';
    child.stderr.on('data', (d) => { stderr += d.toString(); });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code !== 0) {
        return reject(new Error(`simulator exited with code ${code}: ${stderr}`));
      }
      try {
        const raw = fs.readFileSync(tmpJson, 'utf8');
        fs.unlinkSync(tmpJson);
        const json = JSON.parse(raw);
        const agg = json.aggregate;
        if (!agg) throw new Error('No aggregate in simulator output');
        resolve(agg);
      } catch (e) {
        reject(e);
      }
    });
  });
}

async function main() {
  const args = parseArgs(process.argv);
  const repeat = args.repeat ? parseInt(String(args.repeat), 10) : 10;
  const pairConcurrency = args.pairConcurrency ? parseInt(String(args.pairConcurrency), 10) : 2;
  const internalConcurrency = args.internalConcurrency ? parseInt(String(args.internalConcurrency), 10) : Math.min(8, Math.max(1, os.cpus().length - 1));
  const seed = args.seed ? parseInt(String(args.seed), 10) : 1000;

  const teams = discoverTeams();
  if (teams.length < 2) {
    console.error('No sufficient AI teams found in result/.');
    process.exit(1);
  }

  console.log(`Discovered ${teams.length} teams. Running round-robin with repeat=${repeat}.`);

  const ids = teams.map(idFor);
  const indexById = new Map(ids.map((id, i) => [id, i]));

  // Per-team aggregate
  const stats = ids.map(() => ({ wins: 0, losses: 0, draws: 0 }));
  const pairResults = []; // { redId, blueId, redWins, blueWins, draws }

  // Build all pairs
  const tasks = [];
  for (let i = 0; i < teams.length; i++) {
    for (let j = i + 1; j < teams.length; j++) {
      const red = teams[i];
      const blue = teams[j];
      const redId = ids[i];
      const blueId = ids[j];
      tasks.push(async () => {
        const agg = await runCliMatch(red, blue, { repeat, internalConcurrency, seed });
        const { redWins, blueWins, draws } = agg;
        pairResults.push({ redId, blueId, redWins, blueWins, draws });
        const ir = indexById.get(redId);
        const ib = indexById.get(blueId);
        stats[ir].wins += redWins; stats[ir].losses += blueWins; stats[ir].draws += draws;
        stats[ib].wins += blueWins; stats[ib].losses += redWins; stats[ib].draws += draws;
        console.log(`Done ${redId} vs ${blueId} => R:${redWins} B:${blueWins} D:${draws}`);
      });
    }
  }

  // Run with limited concurrency across pairs
  let cursor = 0;
  async function worker() {
    while (cursor < tasks.length) {
      const idx = cursor++;
      try { await tasks[idx](); } catch (e) {
        console.error(`Pair task ${idx} failed:`, e.message);
      }
    }
  }
  const workers = Array.from({ length: pairConcurrency }, () => worker());
  await Promise.all(workers);

  // Compute totals and win rates
  const totalMatchesPerPair = repeat; // per pair
  const totalPairs = (teams.length * (teams.length - 1)) / 2;
  const totalMatches = totalPairs * totalMatchesPerPair;

  const summary = ids.map((id, i) => {
    const s = stats[i];
    const games = s.wins + s.losses + s.draws;
    const winRate = games > 0 ? s.wins / games : 0;
    return { id, wins: s.wins, losses: s.losses, draws: s.draws, games, winRate };
  });

  // Sort by win rate desc, then wins desc
  const ranked = [...summary].sort((a, b) => (b.winRate - a.winRate) || (b.wins - a.wins));

  // High performers: winRate >= 0.65
  const highCut = 0.65;
  const high = ranked.filter((r) => r.winRate >= highCut);

  // Write MATCH.md
  const md = [];
  md.push(`# Round-Robin Match Results`);
  md.push('');
  md.push(`- Teams: ${teams.length}`);
  md.push(`- Pairs: ${totalPairs}`);
  md.push(`- Repeat per pair: ${repeat}`);
  md.push(`- Internal concurrency: ${internalConcurrency}`);
  md.push(`- Pair concurrency: ${pairConcurrency}`);
  md.push(`- Base seed: ${seed}`);
  md.push('');
  md.push('## Overall Ranking (by Win Rate)');
  md.push('');
  md.push('| Rank | Team (result/relative) | W | L | D | Games | Win% |');
  md.push('|-----:|-------------------------|---:|---:|---:|-----:|-----:|');
  ranked.forEach((r, idx) => {
    const pct = (r.winRate * 100).toFixed(2);
    md.push(`| ${idx + 1} | ${r.id} | ${r.wins} | ${r.losses} | ${r.draws} | ${r.games} | ${pct}% |`);
  });
  md.push('');
  md.push('## High Win-Rate Teams');
  md.push('');
  md.push(`Threshold: Win% >= ${(highCut * 100).toFixed(0)}%`);
  if (high.length === 0) {
    md.push('None');
  } else {
    high.forEach((r, idx) => {
      const pct = (r.winRate * 100).toFixed(2);
      md.push(`- ${r.id}: ${pct}% (${r.wins}-${r.losses}-${r.draws})`);
    });
  }
  md.push('');
  md.push('## Pairwise Summaries (sample)');
  md.push('');
  pairResults.slice(0, 200).forEach((p) => {
    md.push(`- ${p.redId} vs ${p.blueId}: R ${p.redWins} / B ${p.blueWins} / D ${p.draws}`);
  });

  const outPath = path.join(RESULT_DIR, 'MATCH.md');
  fs.writeFileSync(outPath, md.join('\n'));
  console.log(`Wrote ${outPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

