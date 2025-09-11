#!/usr/bin/env node
/*
Round-robin tournament for all AIs under result/**/team.js.
Runs pairwise matches in both directions (red/blue), aggregates W/L/D,
and writes summary to result/MATCH.md.

Usage:
  node scripts/run_round_robin.js [--repeat 50] [--concurrency 8] [--seed 4242]

Notes:
- Uses simulator/cli.js for execution and JSON summaries.
- Does not modify tank_battle_platform.html.
*/

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

function parseArgs(argv) {
  const args = { repeat: 50, concurrency: Math.max(1, require('os').cpus().length - 1), seed: 4242 };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--repeat') args.repeat = parseInt(argv[++i], 10);
    else if (a === '--concurrency') args.concurrency = parseInt(argv[++i], 10);
    else if (a === '--seed') args.seed = parseInt(argv[++i], 10);
  }
  return args;
}

function findTeams(root) {
  const teams = [];
  function walk(dir) {
    const ents = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of ents) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.isFile() && e.name === 'team.js') teams.push(p);
    }
  }
  walk(root);
  return teams.sort();
}

function firstBotName(file) {
  try {
    const txt = fs.readFileSync(file, 'utf8');
    const m = txt.match(/function\s+name\s*\(\)\s*{\s*return\s+\"([^\"]+)\";\s*}/);
    if (m) return m[1];
  } catch {}
  return null;
}

function safeId(p) {
  // Use directory name as id (e.g., result/2025-.../team.js -> 2025-...)
  const dir = path.basename(path.dirname(p));
  return dir || path.basename(p);
}

function runBatch(redFile, blueFile, repeat, concurrency, seed, pairIndex, directionTag) {
  const simCli = path.resolve(__dirname, '..', 'simulator', 'cli.js');
  const outDir = path.resolve(__dirname, '..', 'work', 'round_robin');
  fs.mkdirSync(outDir, { recursive: true });
  const outName = `${safeId(redFile)}__vs__${safeId(blueFile)}__${directionTag}.json`;
  const outPath = path.join(outDir, outName);
  const baseSeed = seed + pairIndex * 1000;
  const args = [simCli,
    '--red', redFile,
    '--blue', blueFile,
    '--repeat', String(repeat),
    '--concurrency', String(concurrency),
    '--seed', String(baseSeed),
    '--json', outPath,
    '--fast',
    '--runner', 'secure',
  ];
  const res = spawnSync('node', args, { encoding: 'utf8' });
  if (res.error) throw res.error;
  if (res.status !== 0) {
    console.error(res.stdout);
    console.error(res.stderr);
    throw new Error(`Simulator failed: exit ${res.status}`);
  }
  // Read and parse JSON
  const data = JSON.parse(fs.readFileSync(outPath, 'utf8'));
  if (!data.aggregate) throw new Error('Unexpected JSON format');
  return data.aggregate;
}

function main() {
  const { repeat, concurrency, seed } = parseArgs(process.argv);
  const teamFiles = findTeams(path.resolve('result'));
  if (teamFiles.length < 2) {
    console.log('No sufficient AIs found under result/**/team.js');
    process.exit(0);
  }

  const teams = teamFiles.map((f) => ({
    id: safeId(f),
    path: f,
    label: `${safeId(f)} (${firstBotName(f) || 'Unknown'})`,
    W: 0, L: 0, D: 0,
  }));

  const idx = new Map(teams.map((t, i) => [t.id, i]));
  const pairSummaries = [];

  let pairCounter = 0;
  for (let i = 0; i < teams.length; i++) {
    for (let j = i + 1; j < teams.length; j++) {
      const A = teams[i];
      const B = teams[j];
      const pIdx = pairCounter++;
      // A as red vs B as blue
      const agg1 = runBatch(A.path, B.path, repeat, concurrency, seed, pIdx, 'Ared_Bblue');
      // Update standings
      A.W += agg1.redWins; A.L += agg1.blueWins; A.D += agg1.draws;
      B.W += agg1.blueWins; B.L += agg1.redWins; B.D += agg1.draws;

      // B as red vs A as blue
      const agg2 = runBatch(B.path, A.path, repeat, concurrency, seed, pIdx, 'Bred_Ablue');
      B.W += agg2.redWins; B.L += agg2.blueWins; B.D += agg2.draws;
      A.W += agg2.blueWins; A.L += agg2.redWins; A.D += agg2.draws;

      pairSummaries.push({
        A: A.id, B: B.id,
        A_label: A.label, B_label: B.label,
        // Combined over both directions
        A_wins: agg1.redWins + agg2.blueWins,
        B_wins: agg1.blueWins + agg2.redWins,
        draws: agg1.draws + agg2.draws,
        details: {
          Ared: agg1, Bred: agg2,
        },
      });
    }
  }

  // Compute win rates
  for (const t of teams) {
    const games = t.W + t.L; // exclude draws for rate
    t.rate = games > 0 ? t.W / games : 0;
  }

  // Sort standings
  teams.sort((a, b) => b.rate - a.rate || b.W - a.W || a.id.localeCompare(b.id));

  // Write MATCH.md
  const outMd = [];
  outMd.push('# Round-Robin Results');
  outMd.push('');
  outMd.push(`- Date: ${new Date().toISOString()}`);
  outMd.push(`- Teams: ${teams.length}`);
  outMd.push(`- Repeats per direction: ${repeat}`);
  outMd.push('- Runner: secure, Fast mode: on, Concurrency: ' + concurrency);
  outMd.push('');

  outMd.push('## Teams');
  for (const t of teams) outMd.push(`- ${t.label} -> ${t.path}`);
  outMd.push('');

  outMd.push('## Standings (by win rate)');
  outMd.push('');
  outMd.push('| Rank | Team | W | L | D | Win Rate |');
  outMd.push('| ---- | ---- | - | - | - | -------- |');
  teams.forEach((t, k) => {
    const ratePct = (t.rate * 100).toFixed(1) + '%';
    outMd.push(`| ${k + 1} | ${t.label} | ${t.W} | ${t.L} | ${t.D} | ${ratePct} |`);
  });
  outMd.push('');

  // High win rates: >= 60%
  const high = teams.filter((t) => t.rate >= 0.6);
  outMd.push('## High Win Rates (>= 60%)');
  if (high.length === 0) outMd.push('- None');
  else for (const t of high) outMd.push(`- ${t.label}: ${t.W}-${t.L}-${t.D} (${(t.rate*100).toFixed(1)}%)`);
  outMd.push('');

  outMd.push('## Pairwise Results');
  outMd.push('');
  for (const p of pairSummaries) {
    outMd.push(`- ${p.A_label} vs ${p.B_label}: A ${p.A_wins} - B ${p.B_wins} (Draws ${p.draws})`);
  }
  outMd.push('');

  const mdPath = path.resolve('result', 'MATCH.md');
  // Ensure we can write even if an old file has restrictive perms
  try {
    fs.writeFileSync(mdPath, outMd.join('\n'));
  } catch (e) {
    try {
      // Attempt to change permissions if needed
      fs.chmodSync(mdPath, 0o666);
      fs.writeFileSync(mdPath, outMd.join('\n'));
    } catch (e2) {
      // Write to a temp and rename
      const tmp = mdPath + '.tmp';
      fs.writeFileSync(tmp, outMd.join('\n'));
      fs.renameSync(tmp, mdPath);
    }
  }
  console.log(`Wrote summary -> ${mdPath}`);
}

if (require.main === module) {
  main();
}

