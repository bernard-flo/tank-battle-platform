#!/usr/bin/env node
/*
 Round-robin tournament runner for Tank Battle AIs.

 - Discovers all .txt AI team files under result/ (recursively)
 - Runs oriented matches (A as red vs B as blue) for all A != B
 - Uses simulator/worker.js to execute each match in a worker thread
 - Aggregates per-AI win/loss/draw and writes result/MATCH.md

 Env/config (optional):
   CONCURRENCY: number of worker threads (default: os.cpus().length or 8)
   SEED:        base seed for all matches (default: 42)
   MAX_TICKS:   max ticks per match (default: 5000)
   RUNNER:      'secure' | 'fast' (default: 'secure')
   FAST_MODE:   '1' to enable engine fast mode (default: '1')
   LIST_LIMIT:  limit standings shown (default: show all)
*/

const fs = require('fs');
const path = require('path');
const os = require('os');
const { Worker } = require('worker_threads');

const ROOT = path.resolve(__dirname, '..');
const RESULT_DIR = path.join(ROOT, 'result');
const SIM_DIR = path.join(ROOT, 'simulator');

function findAllAITexts(rootDir) {
  const out = [];
  function walk(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      if (e.name.startsWith('.')) continue;
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        walk(full);
      } else if (e.isFile()) {
        if (e.name.toLowerCase() === 'match.md') continue;
        if (full.endsWith('.txt')) out.push(full);
      }
    }
  }
  walk(rootDir);
  return out.sort();
}

function formatName(p) {
  return path.basename(p);
}

async function runWorkerJob(job, opts) {
  const workerPath = path.join(SIM_DIR, 'worker.js');
  const { redCode, blueCode, seed } = job;
  return new Promise((resolve, reject) => {
    const w = new Worker(workerPath, {
      workerData: {
        redCode,
        blueCode,
        runnerMode: opts.runner,
        seeds: [seed],
        maxTicks: opts.maxTicks,
        fast: opts.fastMode,
      },
    });
    w.on('message', (arr) => resolve(arr[0]));
    w.on('error', reject);
    w.on('exit', (code) => { if (code !== 0) reject(new Error(`Worker exited with code ${code}`)); });
  });
}

async function main() {
  const concurrency = Math.max(1, parseInt(process.env.CONCURRENCY || String(Math.min(os.cpus().length, 8)), 10));
  const baseSeed = parseInt(process.env.SEED || '42', 10);
  const maxTicks = Math.max(1, parseInt(process.env.MAX_TICKS || '5000', 10));
  const runner = (process.env.RUNNER === 'fast' || process.env.RUNNER === 'secure') ? process.env.RUNNER : 'secure';
  const fastMode = (process.env.FAST_MODE || '1') === '1';
  const listLimit = process.env.LIST_LIMIT ? Math.max(1, parseInt(process.env.LIST_LIMIT, 10)) : null;

  const aiFiles = findAllAITexts(RESULT_DIR);
  if (aiFiles.length < 2) {
    console.error('Not enough AI files found under result/');
    process.exit(1);
  }

  // Preload codes to reduce I/O during scheduling
  const codeCache = new Map();
  for (const f of aiFiles) codeCache.set(f, fs.readFileSync(f, 'utf8'));

  // Build oriented pair jobs (A as red vs B as blue for all A != B)
  const jobs = [];
  let jid = 0;
  for (let i = 0; i < aiFiles.length; i++) {
    for (let j = 0; j < aiFiles.length; j++) {
      if (i === j) continue;
      jobs.push({
        id: jid++,
        redPath: aiFiles[i],
        bluePath: aiFiles[j],
        redCode: codeCache.get(aiFiles[i]),
        blueCode: codeCache.get(aiFiles[j]),
        seed: baseSeed, // same seed for all oriented matches for reproducibility
      });
    }
  }

  // Aggregation structures
  const stats = new Map(); // path -> { wins, losses, draws }
  const ensure = (p) => { if (!stats.has(p)) stats.set(p, { wins: 0, losses: 0, draws: 0 }); return stats.get(p); };

  const meta = {
    participants: aiFiles.length,
    jobs: jobs.length,
    seed: baseSeed,
    maxTicks,
    runner,
    fastMode,
    timestamp: new Date().toISOString(),
  };

  console.log(`Participants: ${aiFiles.length}, Oriented matches: ${jobs.length}`);
  console.log(`Concurrency: ${concurrency}, seed=${baseSeed}, maxTicks=${maxTicks}, runner=${runner}, fast=${fastMode}`);

  // Run with a simple job queue and worker pool size = concurrency
  let idx = 0;
  let completed = 0;

  async function next() {
    if (idx >= jobs.length) return null;
    const job = jobs[idx++];
    try {
      const res = await runWorkerJob(job, { runner, maxTicks, fastMode });
      // res: { winner: 'red'|'blue'|'draw', ticks, ... }
      const redS = ensure(job.redPath);
      const blueS = ensure(job.bluePath);
      if (res.winner === 'red') { redS.wins++; blueS.losses++; }
      else if (res.winner === 'blue') { blueS.wins++; redS.losses++; }
      else { redS.draws++; blueS.draws++; }
    } catch (e) {
      console.error(`Job ${job.id} failed: ${formatName(job.redPath)} vs ${formatName(job.bluePath)} ->`, e.message);
      // Treat as draw to avoid skewing totals
      ensure(job.redPath).draws++;
      ensure(job.bluePath).draws++;
    } finally {
      completed++;
      if (completed % 50 === 0 || completed === jobs.length) {
        process.stdout.write(`\rProgress: ${completed}/${jobs.length}`);
      }
    }
    return true;
  }

  const workers = Array.from({ length: concurrency }, async () => {
    while (await next()) {}
  });
  await Promise.all(workers);
  process.stdout.write('\n');

  // Build standings
  const standings = aiFiles.map((p) => {
    const s = ensure(p);
    const games = s.wins + s.losses; // ignore draws for win rate denominator
    const winRate = games > 0 ? (s.wins / games) : 0;
    return { path: p, name: formatName(p), ...s, games, winRate };
  }).sort((a, b) => {
    if (b.winRate !== a.winRate) return b.winRate - a.winRate;
    if (b.wins !== a.wins) return b.wins - a.wins;
    return a.losses - b.losses;
  });

  const highThreshold = 0.6; // 60%+ win rate (ignoring draws)
  const top = standings.filter((s) => s.games > 0 && s.winRate >= highThreshold);

  // Render MATCH.md
  const lines = [];
  lines.push('# Round-robin Tournament Summary');
  lines.push('');
  lines.push('Settings:');
  lines.push(`- participants: ${meta.participants}`);
  lines.push(`- oriented_matches: ${meta.jobs}`);
  lines.push(`- seed: ${meta.seed}`);
  lines.push(`- max_ticks: ${meta.maxTicks}`);
  lines.push(`- runner: ${meta.runner}`);
  lines.push(`- fast_mode: ${meta.fastMode}`);
  lines.push(`- generated_at: ${meta.timestamp}`);
  lines.push('');
  lines.push('Participants:');
  for (const f of aiFiles) lines.push(`- ${formatName(f)}`);
  lines.push('');
  lines.push('Overall Standings (sorted by win rate):');
  const toShow = listLimit ? standings.slice(0, listLimit) : standings;
  for (const s of toShow) {
    const wr = (s.winRate * 100).toFixed(1).padStart(5, ' ');
    lines.push(`- ${s.name} | W:${s.wins} L:${s.losses} D:${s.draws} | WR:${wr}%`);
  }
  if (listLimit && standings.length > listLimit) {
    lines.push(`... and ${standings.length - listLimit} more`);
  }
  lines.push('');
  lines.push(`High Win Rate AIs (>= ${(highThreshold * 100)|0}%):`);
  if (top.length === 0) {
    lines.push('- (none)');
  } else {
    for (const s of top) {
      const wr = (s.winRate * 100).toFixed(1).padStart(5, ' ');
      lines.push(`- ${s.name} | W:${s.wins} L:${s.losses} D:${s.draws} | WR:${wr}%`);
    }
  }

  const outPath = path.join(RESULT_DIR, 'MATCH.md');
  fs.writeFileSync(outPath, lines.join('\n'));
  console.log(`Wrote summary -> ${path.relative(ROOT, outPath)}`);
}

if (require.main === module) {
  main().catch((e) => { console.error(e); process.exit(1); });
}

