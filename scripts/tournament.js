#!/usr/bin/env node
/* eslint-disable no-console */
// Round-robin tournament runner for all AI teams under result/
// - Pairs every team file against every other
// - Runs two matches per pair (swap colors once)
// - Uses simulator/worker.js to parallelize execution per match
// - Aggregates and writes a concise summary to result/MATCH.md

const fs = require('fs');
const path = require('path');
const os = require('os');
const { Worker } = require('worker_threads');
const { compileTeamFromCode } = require('../simulator/bot_loader');

const ROOT = path.resolve(__dirname, '..');
const RESULT_DIR = path.join(ROOT, 'result');
const SIM_ROOT = path.join(ROOT, 'simulator');

// Config (tweakable via env vars)
const MAX_TICKS = parseInt(process.env.TOURNAMENT_MAX_TICKS || '2000', 10);
const RUNNER_MODE = process.env.TOURNAMENT_RUNNER || 'secure'; // 'secure' | 'fast'
const FAST_ENGINE = process.env.TOURNAMENT_FAST === '1' || true; // engine fast path
const CONCURRENCY = Math.max(1, parseInt(process.env.TOURNAMENT_CONCURRENCY || String(Math.min(8, os.cpus().length || 4)), 10));
const SEED_BASE = process.env.TOURNAMENT_SEED || 'tournament';

function isTeamFile(filePath) {
  try {
    const stat = fs.statSync(filePath);
    if (!stat.isFile()) return false;
    const content = fs.readFileSync(filePath, 'utf8');
    // Must contain at least one robot definition per HTML convention
    return /\bfunction\s+name\s*\(\s*\)/.test(content) && /\bfunction\s+update\s*\(/.test(content);
  } catch (_e) {
    return false;
  }
}

function listAllTeamFiles(dir) {
  const acc = [];
  const stack = [dir];
  while (stack.length) {
    const d = stack.pop();
    let entries;
    try {
      entries = fs.readdirSync(d, { withFileTypes: true });
    } catch (_e) {
      continue;
    }
    for (const e of entries) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) {
        stack.push(p);
      } else if (e.isFile()) {
        if (isTeamFile(p)) acc.push(p);
      }
    }
  }
  // Ensure deterministic order
  acc.sort((a, b) => a.localeCompare(b));
  return acc;
}

function rel(p) {
  return path.relative(ROOT, p) || p;
}

function runWorkerMatch(redCode, blueCode, seed) {
  return new Promise((resolve, reject) => {
    const w = new Worker(path.join(SIM_ROOT, 'worker.js'), {
      workerData: {
        redCode,
        blueCode,
        runnerMode: RUNNER_MODE,
        seeds: [seed],
        maxTicks: MAX_TICKS,
        fast: FAST_ENGINE,
      },
    });
    w.on('message', (arr) => resolve(arr[0]));
    w.on('error', reject);
    w.on('exit', (code) => { if (code !== 0) reject(new Error(`Worker exited with code ${code}`)); });
  });
}

async function main() {
  // Discover teams
  const teamFiles = listAllTeamFiles(RESULT_DIR);
  if (teamFiles.length < 2) {
    console.error('Not enough team files found under result/');
    process.exit(1);
  }

  console.log(`Discovered ${teamFiles.length} team files.`);
  // Preload codes for faster worker spin-up
  const teamCodeMap = new Map();
  for (const f of teamFiles) teamCodeMap.set(f, fs.readFileSync(f, 'utf8'));

  // Validate compilability early (fails fast for broken inputs)
  for (const f of teamFiles) {
    try {
      compileTeamFromCode(teamCodeMap.get(f), 'red', RUNNER_MODE);
    } catch (e) {
      console.warn(`Warning: failed to compile ${rel(f)}: ${e?.message || e}`);
    }
  }

  // Build all unique pairs
  const pairs = [];
  for (let i = 0; i < teamFiles.length; i++) {
    for (let j = i + 1; j < teamFiles.length; j++) {
      pairs.push([teamFiles[i], teamFiles[j]]);
    }
  }
  console.log(`Total pairs: ${pairs.length}`);

  // Aggregation structures
  const perAI = new Map(); // path -> { wins, losses, draws, matches }
  const pairResults = []; // { a, b, aWins, bWins, draws }

  function ensureAIEntry(p) {
    if (!perAI.has(p)) perAI.set(p, { wins: 0, losses: 0, draws: 0, matches: 0 });
    return perAI.get(p);
  }

  // Simple concurrency control
  let active = 0;
  let idx = 0;
  let completedPairs = 0;

  async function runNext() {
    if (idx >= pairs.length) return;
    const [a, b] = pairs[idx++];
    active++;
    try {
      const baseSeed = `${SEED_BASE}-${idx}`;
      // A(red) vs B(blue)
      const r1 = await runWorkerMatch(teamCodeMap.get(a), teamCodeMap.get(b), `${baseSeed}-A`);
      // B(red) vs A(blue)
      const r2 = await runWorkerMatch(teamCodeMap.get(b), teamCodeMap.get(a), `${baseSeed}-B`);

      let aWins = 0, bWins = 0, draws = 0;
      if (r1.winner === 'red') aWins++; else if (r1.winner === 'blue') bWins++; else draws++;
      if (r2.winner === 'blue') aWins++; else if (r2.winner === 'red') bWins++; else draws++;

      pairResults.push({ a, b, aWins, bWins, draws });

      const aStat = ensureAIEntry(a);
      const bStat = ensureAIEntry(b);
      aStat.wins += aWins; aStat.losses += bWins; aStat.draws += draws; aStat.matches += (aWins + bWins + draws);
      bStat.wins += bWins; bStat.losses += aWins; bStat.draws += draws; bStat.matches += (aWins + bWins + draws);

      completedPairs++;
      if (completedPairs % 50 === 0 || completedPairs === pairs.length) {
        process.stdout.write(`\rProcessed pairs: ${completedPairs}/${pairs.length}`);
      }
    } catch (e) {
      console.error(`\nError in pair ${rel(a)} vs ${rel(b)}: ${e?.message || e}`);
    } finally {
      active--;
      if (idx < pairs.length) await runNext();
    }
  }

  // Kick off workers up to CONCURRENCY
  const starters = [];
  for (let k = 0; k < Math.min(CONCURRENCY, pairs.length); k++) starters.push(runNext());
  await Promise.all(starters);
  console.log('\nAll pairs processed.');

  // Build MATCH.md content
  const lines = [];
  const now = new Date();
  lines.push('# Tournament Summary');
  lines.push('');
  lines.push(`- Date: ${now.toISOString()}`);
  lines.push(`- Teams: ${teamFiles.length}`);
  lines.push(`- Pairs: ${pairs.length}`);
  lines.push(`- Matches per pair: 2 (color-swapped)`);
  lines.push(`- Engine: maxTicks=${MAX_TICKS}, fast=${FAST_ENGINE}, runner=${RUNNER_MODE}`);
  lines.push(`- Concurrency: ${CONCURRENCY}`);
  lines.push('');

  // Leaderboard
  const leaderboard = teamFiles.map((p) => {
    const s = ensureAIEntry(p);
    const nonDraw = s.wins + s.losses;
    const winRate = nonDraw > 0 ? s.wins / nonDraw : 0;
    return { path: p, ...s, winRate };
  }).sort((x, y) => y.winRate - x.winRate || y.wins - x.wins);

  lines.push('## Leaderboard (Win Rate, excluding draws)');
  lines.push('');
  lines.push('| Rank | Team | W | L | D | WinRate |');
  lines.push('|-----:|:-----|--:|--:|--:|--------:|');
  leaderboard.forEach((e, i) => {
    lines.push(`| ${i + 1} | ${rel(e.path)} | ${e.wins} | ${e.losses} | ${e.draws} | ${(e.winRate * 100).toFixed(1)}% |`);
  });
  lines.push('');

  // High-win list
  const threshold = parseFloat(process.env.TOURNAMENT_HIGH_THRESHOLD || '0.65');
  const strong = leaderboard.filter((e) => e.winRate >= threshold);
  lines.push(`## High-Win Teams (>= ${(threshold * 100).toFixed(0)}% win rate)`);
  if (strong.length === 0) {
    lines.push('None');
  } else {
    for (const e of strong) {
      lines.push(`- ${rel(e.path)}: ${(e.winRate * 100).toFixed(1)}% (${e.wins}-${e.losses}-${e.draws})`);
    }
  }
  lines.push('');

  // Optional compact pairwise summary (not exhaustive details)
  lines.push('## Pairwise Summary (counts over 2 games)');
  lines.push('');
  lines.push('Format: TeamA vs TeamB — A:Wins, B:Wins, Draws');
  for (const pr of pairResults) {
    lines.push(`- ${rel(pr.a)} vs ${rel(pr.b)} — A:${pr.aWins}, B:${pr.bWins}, D:${pr.draws}`);
  }
  lines.push('');

  // Write MATCH.md
  const outPath = path.join(RESULT_DIR, 'MATCH.md');
  fs.writeFileSync(outPath, lines.join('\n'));
  console.log(`Wrote summary -> ${rel(outPath)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

