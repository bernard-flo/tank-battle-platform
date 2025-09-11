#!/usr/bin/env node
/*
Runs a round-robin tournament for all AI teams found under result/**/team.js
and writes a Markdown summary to result/MATCH.md.

Uses the headless simulator CLI (simulator/cli.js) with batch repeats and
worker concurrency for performance. Color-swap is applied for fairness.
*/

/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');

function listTeams() {
  const base = path.resolve('result');
  if (!fs.existsSync(base)) return [];
  const dirs = fs.readdirSync(base, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();
  const teams = [];
  for (const d of dirs) {
    const teamPath = path.join(base, d, 'team.js');
    if (fs.existsSync(teamPath)) {
      teams.push({ id: d, label: d, file: teamPath });
    }
  }
  return teams;
}

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function runBatch({ red, blue, repeat, baseSeed, concurrency, runner, fast, outPath }) {
  const args = [
    path.resolve('simulator/cli.js'),
    '--red', red,
    '--blue', blue,
    '--repeat', String(repeat),
    '--seed', String(baseSeed),
    '--concurrency', String(concurrency),
    '--runner', runner,
    '--json', outPath,
  ];
  if (fast) args.push('--fast');
  const res = spawnSync('node', args, { stdio: 'ignore' });
  if (res.status !== 0) {
    throw new Error(`Simulator failed (status=${res.status}) for ${path.basename(red)} vs ${path.basename(blue)}`);
  }
  const raw = fs.readFileSync(outPath, 'utf8');
  return JSON.parse(raw);
}

function formatPct(num) {
  return `${(num * 100).toFixed(1)}%`;
}

function main() {
  const teams = listTeams();
  if (teams.length < 2) {
    console.error('No sufficient teams found under result/**/team.js');
    process.exit(1);
  }

  // Config (can be overridden via env)
  const REPEAT = process.env.TOURNAMENT_REPEAT ? parseInt(process.env.TOURNAMENT_REPEAT, 10) : 200;
  const RUNNER = process.env.TOURNAMENT_RUNNER === 'fast' ? 'fast' : 'secure';
  const FAST = process.env.TOURNAMENT_FAST === '1' || process.env.TOURNAMENT_FAST === 'true' || true; // default true
  const CONC = process.env.TOURNAMENT_CONC ? parseInt(process.env.TOURNAMENT_CONC, 10) : Math.max(2, Math.min(8, (os.cpus()?.length || 4)));
  const BASE_SEED0 = process.env.TOURNAMENT_SEED ? parseInt(process.env.TOURNAMENT_SEED, 10) : 12345;
  const HIGH_WINRATE_THRESHOLD = process.env.TOURNAMENT_HI || 0.65; // over non-draws

  const tmpDir = path.resolve('work', 'tournament');
  ensureDir(tmpDir);

  const pairResults = [];
  const totals = new Map(); // id -> {wins,losses,draws}
  for (const t of teams) totals.set(t.id, { wins: 0, losses: 0, draws: 0 });

  let pairIdx = 0;
  for (let i = 0; i < teams.length; i++) {
    for (let j = i + 1; j < teams.length; j++) {
      const A = teams[i];
      const B = teams[j];
      const seed = BASE_SEED0 + pairIdx * 1000;
      pairIdx++;

      const outAB = path.join(tmpDir, `match_${A.id}_VS_${B.id}.json`);
      const outBA = path.join(tmpDir, `match_${B.id}_VS_${A.id}.json`);

      const resAB = runBatch({
        red: A.file,
        blue: B.file,
        repeat: REPEAT,
        baseSeed: seed,
        concurrency: CONC,
        runner: RUNNER,
        fast: FAST,
        outPath: outAB,
      });

      const resBA = runBatch({
        red: B.file,
        blue: A.file,
        repeat: REPEAT,
        baseSeed: seed,
        concurrency: CONC,
        runner: RUNNER,
        fast: FAST,
        outPath: outBA,
      });

      const aggAB = resAB.aggregate;
      const aggBA = resBA.aggregate;

      const aWins = aggAB.redWins + aggBA.blueWins;
      const bWins = aggAB.blueWins + aggBA.redWins;
      const draws = aggAB.draws + aggBA.draws;

      totals.get(A.id).wins += aWins;
      totals.get(A.id).losses += bWins;
      totals.get(A.id).draws += draws;
      totals.get(B.id).wins += bWins;
      totals.get(B.id).losses += aWins;
      totals.get(B.id).draws += draws;

      pairResults.push({
        a: A, b: B,
        seed,
        repeat: REPEAT,
        colorAB: { redWins: aggAB.redWins, blueWins: aggAB.blueWins, draws: aggAB.draws },
        colorBA: { redWins: aggBA.redWins, blueWins: aggBA.blueWins, draws: aggBA.draws },
        combined: { aWins, bWins, draws },
      });
    }
  }

  // Build standings
  const standings = teams.map((t) => {
    const { wins, losses, draws } = totals.get(t.id);
    const gp = wins + losses + draws;
    const nonDraw = wins + losses;
    const wr = nonDraw > 0 ? wins / nonDraw : 0;
    return { team: t, wins, losses, draws, games: gp, winrate: wr };
  }).sort((a, b) => b.winrate - a.winrate || b.wins - a.wins);

  const highWinners = standings.filter((s) => s.winrate >= HIGH_WINRATE_THRESHOLD);

  // Write Markdown report
  const outMd = path.resolve('result', 'MATCH.md');
  const lines = [];
  const now = new Date();
  lines.push(`# AI Tournament Results`);
  lines.push('');
  lines.push(`- Generated: ${now.toISOString()}`);
  lines.push(`- Teams: ${teams.length}`);
  lines.push(`- Repeats per color: ${REPEAT}`);
  lines.push(`- Runner: ${RUNNER}, Fast: ${FAST ? 'on' : 'off'}, Concurrency: ${CONC}`);
  lines.push(`- Base seed start: ${BASE_SEED0}`);
  lines.push('');
  lines.push('## Teams');
  for (const t of teams) {
    lines.push(`- ${t.label} (${t.file})`);
  }
  lines.push('');

  lines.push('## Pairwise Results (color-swapped)');
  for (const r of pairResults) {
    const aLbl = r.a.label;
    const bLbl = r.b.label;
    const aWins = r.combined.aWins;
    const bWins = r.combined.bWins;
    const draws = r.combined.draws;
    const nonDraw = aWins + bWins;
    const aWR = nonDraw > 0 ? aWins / nonDraw : 0;
    const bWR = nonDraw > 0 ? bWins / nonDraw : 0;
    lines.push(`- ${aLbl} vs ${bLbl}: ${aWins}-${bWins} (draws: ${draws}) | A WR: ${formatPct(aWR)}, B WR: ${formatPct(bWR)} [seed ${r.seed}]`);
    lines.push(`  - A as Red: W:${r.colorAB.redWins}, L:${r.colorAB.blueWins}, D:${r.colorAB.draws}`);
    lines.push(`  - B as Red: W:${r.colorBA.redWins}, L:${r.colorBA.blueWins}, D:${r.colorBA.draws}`);
  }
  lines.push('');

  lines.push('## Standings');
  for (const s of standings) {
    const wr = formatPct(s.winrate);
    lines.push(`- ${s.team.label}: W:${s.wins} L:${s.losses} D:${s.draws} | WR:${wr} (non-draw)`);
  }
  lines.push('');

  lines.push(`## High Win Rates (>= ${(HIGH_WINRATE_THRESHOLD * 100).toFixed(0)}%)`);
  if (highWinners.length === 0) {
    lines.push('- (none)');
  } else {
    for (const s of highWinners) {
      lines.push(`- ${s.team.label}: WR ${formatPct(s.winrate)} | W:${s.wins} L:${s.losses} D:${s.draws}`);
    }
  }
  lines.push('');

  fs.writeFileSync(outMd, lines.join('\n'));
  console.log(`Wrote ${outMd}`);
}

if (require.main === module) {
  try {
    main();
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

