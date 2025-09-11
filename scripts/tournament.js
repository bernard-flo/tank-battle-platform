#!/usr/bin/env node
/*
 Runs a round-robin tournament among all AIs under result/*/team.js
 Uses the headless simulator CLI with secure runner and fast engine optimizations.

 Output: result/MATCH.md (summary + high win-rate list)
*/
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');

const REPO_ROOT = path.resolve(__dirname, '..');
const RESULT_DIR = path.join(REPO_ROOT, 'result');
const MATCH_MD = path.join(RESULT_DIR, 'MATCH.md');

// Tunables
const REPEAT_PER_SIDE = parseInt(process.env.TOURN_REPEAT || '50', 10); // matches per side (A-red vs B-blue, then swapped)
const CONCURRENCY = Math.max(1, Math.min(os.cpus().length, parseInt(process.env.TOURN_CONCURRENCY || String(Math.max(1, os.cpus().length - 1)), 10)));
const RUNNER = process.env.TOURN_RUNNER || 'secure'; // 'secure' | 'fast'
const FAST_FLAG = process.env.TOURN_FAST === '0' ? false : true; // default true
const MAX_TICKS = parseInt(process.env.TOURN_MAX_TICKS || '5000', 10);

function findTeams() {
  if (!fs.existsSync(RESULT_DIR)) return [];
  const subdirs = fs.readdirSync(RESULT_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => path.join(RESULT_DIR, d.name));
  const teams = [];
  for (const d of subdirs) {
    const teamPath = path.join(d, 'team.js');
    if (fs.existsSync(teamPath)) {
      teams.push({ id: path.basename(d), file: teamPath });
    }
  }
  return teams.sort((a, b) => a.id.localeCompare(b.id));
}

function runBatch(redFile, blueFile) {
  const args = [
    path.join(REPO_ROOT, 'simulator', 'cli.js'),
    '--red', redFile,
    '--blue', blueFile,
    '--repeat', String(REPEAT_PER_SIDE),
    '--runner', RUNNER,
    '--maxTicks', String(MAX_TICKS),
    '--concurrency', String(CONCURRENCY),
  ];
  if (FAST_FLAG) args.push('--fast');

  // Write JSON to a temp file for reliable parsing
  const jsonOut = path.join(os.tmpdir(), `match_${path.basename(redFile)}_vs_${path.basename(blueFile)}_${Date.now()}_${Math.random().toString(36).slice(2)}.json`);
  args.push('--json', jsonOut);

  const res = spawnSync('node', args, { encoding: 'utf8' });
  if (res.error) throw res.error;
  if (res.status !== 0) {
    console.error(res.stdout);
    console.error(res.stderr);
    throw new Error(`Simulator exited with ${res.status}`);
  }
  let parsed;
  try {
    const raw = fs.readFileSync(jsonOut, 'utf8');
    parsed = JSON.parse(raw);
  } finally {
    try { fs.unlinkSync(jsonOut); } catch (_) {}
  }
  if (!parsed || !parsed.aggregate) throw new Error('Invalid JSON output from simulator');
  const { redWins, blueWins, draws, matches } = parsed.aggregate;
  return { redWins, blueWins, draws, matches };
}

function roundRobin(teams) {
  const pairResults = [];
  const totals = new Map();
  for (const t of teams) totals.set(t.id, { wins: 0, losses: 0, draws: 0, games: 0 });

  for (let i = 0; i < teams.length; i++) {
    for (let j = i + 1; j < teams.length; j++) {
      const A = teams[i];
      const B = teams[j];

      // A (red) vs B (blue)
      const r1 = runBatch(A.file, B.file);
      // B (red) vs A (blue)
      const r2 = runBatch(B.file, A.file);

      const aWins = r1.redWins + r2.blueWins;
      const bWins = r1.blueWins + r2.redWins;
      const draws = r1.draws + r2.draws;
      const games = r1.matches + r2.matches;

      pairResults.push({ A: A.id, B: B.id, aWins, bWins, draws, games });

      const aTot = totals.get(A.id);
      aTot.wins += aWins; aTot.losses += bWins; aTot.draws += draws; aTot.games += games;
      const bTot = totals.get(B.id);
      bTot.wins += bWins; bTot.losses += aWins; bTot.draws += draws; bTot.games += games;
    }
  }
  return { pairResults, totals };
}

function fmtPct(numer, denom) {
  if (denom === 0) return '0.0%';
  return `${((numer / denom) * 100).toFixed(1)}%`;
}

function writeMarkdown(teams, pairResults, totals) {
  const lines = [];
  const now = new Date();
  lines.push(`# Tank Battle Tournament Results`);
  lines.push('');
  lines.push(`- Date: ${now.toISOString()}`);
  lines.push(`- Teams: ${teams.length}`);
  lines.push(`- Config: repeat/side=${REPEAT_PER_SIDE}, concurrency=${CONCURRENCY}, runner=${RUNNER}, fast=${FAST_FLAG}, maxTicks=${MAX_TICKS}`);
  lines.push('');

  // Overall ranking
  const overall = Array.from(totals.entries()).map(([id, t]) => ({ id, ...t, winRate: t.games > 0 ? (t.wins / t.games) : 0 }));
  overall.sort((x, y) => y.winRate - x.winRate || y.wins - x.wins);

  lines.push('## Overall Ranking');
  lines.push('');
  lines.push('| Rank | Team | Wins | Losses | Draws | Games | Win Rate |');
  lines.push('|---:|:---|---:|---:|---:|---:|---:|');
  overall.forEach((t, idx) => {
    lines.push(`| ${idx + 1} | ${t.id} | ${t.wins} | ${t.losses} | ${t.draws} | ${t.games} | ${fmtPct(t.wins, t.games)} |`);
  });
  lines.push('');

  // High win-rate list (>= 65%)
  const HIGH_THRESHOLD = parseFloat(process.env.TOURN_HIGH_THRESH || '0.65');
  const highs = overall.filter((t) => t.winRate >= HIGH_THRESHOLD);
  lines.push(`## High Win Rates (>= ${(HIGH_THRESHOLD * 100).toFixed(0)}%)`);
  lines.push('');
  if (highs.length === 0) {
    lines.push('_None meet the threshold._');
  } else {
    highs.forEach((t) => {
      lines.push(`- ${t.id}: ${fmtPct(t.wins, t.games)} (${t.wins}/${t.games})`);
    });
  }
  lines.push('');

  // Pairwise detail
  lines.push('## Pairwise Results');
  lines.push('');
  lines.push('| Team A | Team B | A Wins | B Wins | Draws | Games | A Win Rate | B Win Rate |');
  lines.push('|:--|:--|--:|--:|--:|--:|--:|--:|');
  for (const p of pairResults) {
    const aWR = fmtPct(p.aWins, p.games);
    const bWR = fmtPct(p.bWins, p.games);
    lines.push(`| ${p.A} | ${p.B} | ${p.aWins} | ${p.bWins} | ${p.draws} | ${p.games} | ${aWR} | ${bWR} |`);
  }
  lines.push('');

  fs.writeFileSync(MATCH_MD, lines.join('\n'));
}

function main() {
  const teams = findTeams();
  if (teams.length < 2) {
    console.log('No sufficient teams found under result/*/team.js');
    console.log('Nothing to do.');
    process.exit(0);
  }

  console.log(`Found ${teams.length} teams. Running round-robin...`);
  console.log(teams.map((t) => ` - ${t.id}`).join('\n'));

  const { pairResults, totals } = roundRobin(teams);
  writeMarkdown(teams, pairResults, totals);

  console.log(`Wrote summary -> ${path.relative(REPO_ROOT, MATCH_MD)}`);
}

if (require.main === module) {
  main();
}

