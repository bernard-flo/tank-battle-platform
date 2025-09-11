#!/usr/bin/env node
/*
 Pairwise tournament runner for result/ AIs.
 - Scans result/ for team .txt files containing function name()/update().
 - Compiles each team once using simulator/bot_loader.
 - Runs single headless match per pair (fast mode) to keep runtime reasonable.
 - Aggregates W/L/D per team and writes result/MATCH.md with a summary and high-win list.

 Usage:
   node scripts/tournament.js [--threshold 0.7] [--maxPairs N]

 Notes:
 - Uses fast engine mode for performance; runner remains 'secure'.
 - Draws are excluded when computing win-rate = wins / (wins + losses).
*/
const fs = require('fs');
const path = require('path');
const os = require('os');
const { runMatch } = require('../simulator/engine');
const { compileTeamFromCode } = require('../simulator/bot_loader');

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

function listTeamFiles(rootDir) {
  const results = [];
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(p);
      } else if (entry.isFile() && entry.name.endsWith('.txt')) {
        try {
          const txt = fs.readFileSync(p, 'utf8');
          if (/function\s+name\s*\(\s*\)/.test(txt) && /function\s+update\s*\(/.test(txt)) {
            results.push(p);
          }
        } catch (_) { /* ignore */ }
      }
    }
  }
  walk(rootDir);
  // de-dup and sort for stability
  return Array.from(new Set(results)).sort((a,b) => a.localeCompare(b));
}

function teamIdFromPath(p) {
  // Prefer the directory timestamp as ID if present; else the basename without ext
  const base = path.basename(p, '.txt');
  const parent = path.basename(path.dirname(p));
  if (/^\d{4}-\d{2}-\d{2}-/.test(parent)) return parent;
  return base;
}

function compileTeams(files) {
  const map = new Map();
  for (const f of files) {
    const code = fs.readFileSync(f, 'utf8');
    const redTeam = compileTeamFromCode(code, 'red', 'secure');
    const blueTeam = compileTeamFromCode(code, 'blue', 'secure');
    map.set(f, { redTeam, blueTeam, id: teamIdFromPath(f) });
  }
  return map;
}

function runPair(redTeam, blueTeam, seed) {
  const players = [...redTeam, ...blueTeam];
  const res = runMatch(players, { seed, maxTicks: 5000, fast: true });
  return res.winner; // 'red' | 'blue' | 'draw'
}

function formatPercent(x) {
  return (x * 100).toFixed(1) + '%';
}

function writeMarkdown(outPath, teams, stats, threshold) {
  const lines = [];
  const now = new Date();
  const totalTeams = teams.length;
  const totalPairs = (totalTeams * (totalTeams - 1)) / 2;

  // Sort by win rate (wins/(wins+losses)), then by wins
  const rows = teams.map((t) => {
    const s = stats.get(t.file);
    const denom = s.wins + s.losses;
    const wr = denom > 0 ? s.wins / denom : 0;
    return { id: t.id, file: t.file, wins: s.wins, losses: s.losses, draws: s.draws, wr };
  }).sort((a, b) => (b.wr - a.wr) || (b.wins - a.wins) || a.id.localeCompare(b.id));

  lines.push(`# Tournament Summary`);
  lines.push(``);
  lines.push(`- Date: ${now.toISOString()}`);
  lines.push(`- Teams: ${totalTeams}`);
  lines.push(`- Pairwise Matches: ${totalPairs} (1 game per pair, fast mode)`);
  lines.push(`- Win-Rate: wins/(wins+losses); draws excluded`);
  lines.push(``);

  lines.push(`## Overall Standings (sorted by win rate)`);
  lines.push(``);
  lines.push(`| Rank | Team ID | W | L | D | Win Rate |`);
  lines.push(`| ---- | ------- | - | - | - | -------- |`);
  rows.forEach((r, i) => {
    lines.push(`| ${i + 1} | ${r.id} | ${r.wins} | ${r.losses} | ${r.draws} | ${formatPercent(r.wr)} |`);
  });
  lines.push('');

  const high = rows.filter((r) => r.wr >= threshold);
  lines.push(`## High Win Rates (>= ${Math.round(threshold * 100)}%)`);
  if (high.length === 0) {
    lines.push(`- None`);
  } else {
    for (const r of high) {
      lines.push(`- ${r.id}: ${r.wins}-${r.losses}-${r.draws} (${formatPercent(r.wr)})`);
    }
  }
  lines.push('');

  fs.writeFileSync(outPath, lines.join('\n'));
}

async function main() {
  const args = parseArgs(process.argv);
  const threshold = args.threshold ? Math.min(0.99, Math.max(0, parseFloat(args.threshold))) : 0.7;
  const maxPairs = args.maxPairs ? parseInt(args.maxPairs, 10) : null; // for debugging

  const root = path.resolve('result');
  if (!fs.existsSync(root)) throw new Error('result/ directory not found');
  const files = listTeamFiles(root);
  if (files.length < 2) throw new Error('Need at least 2 team files in result/');

  const compiled = compileTeams(files);
  const teams = files.map((f) => ({ file: f, id: compiled.get(f).id }));

  // Initialize stats
  const stats = new Map();
  for (const f of files) stats.set(f, { wins: 0, losses: 0, draws: 0 });

  const pairs = [];
  for (let i = 0; i < files.length; i++) {
    for (let j = i + 1; j < files.length; j++) {
      pairs.push([i, j]);
    }
  }
  if (maxPairs && maxPairs > 0 && maxPairs < pairs.length) pairs.length = maxPairs;

  // Run all pairs sequentially (fast engine keeps this reasonable)
  // Seed with a stable value based on indices to keep determinism across runs.
  const baseSeed = 123456789;
  for (let p = 0; p < pairs.length; p++) {
    const [i, j] = pairs[p];
    const fA = files[i];
    const fB = files[j];
    const { redTeam } = compiled.get(fA);
    const { blueTeam } = compiled.get(fB);
    const seed = baseSeed + p;
    const winner = runPair(redTeam, blueTeam, seed);
    if (winner === 'red') { stats.get(fA).wins++; stats.get(fB).losses++; }
    else if (winner === 'blue') { stats.get(fA).losses++; stats.get(fB).wins++; }
    else { stats.get(fA).draws++; stats.get(fB).draws++; }
    if ((p + 1) % 100 === 0) {
      process.stdout.write(`Processed ${p + 1}/${pairs.length} pairs\r`);
    }
  }
  process.stdout.write(`Processed ${pairs.length}/${pairs.length} pairs\n`);

  const outPath = path.resolve('result', 'MATCH.md');
  writeMarkdown(outPath, teams, stats, threshold);
  console.log(`Wrote summary -> ${outPath}`);
}

if (require.main === module) {
  main().catch((err) => { console.error(err); process.exit(1); });
}

