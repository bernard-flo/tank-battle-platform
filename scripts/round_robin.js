#!/usr/bin/env node
/*
 Round-robin matcher for all teams under result/**
 - Discovers team files by scanning for "function name()" pattern.
 - Runs one match per unordered pair (A vs B) with A as Red, B as Blue.
 - Uses simulator CLI for each match with --fast for speed.
 - Aggregates per-team stats and writes result/MATCH.md.
*/
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');

function scanTeamFiles(rootDir) {
  const results = [];
  function walk(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) {
        walk(p);
      } else if (e.isFile()) {
        // Only consider reasonably small textual files
        try {
          const stat = fs.statSync(p);
          if (stat.size > 1024 * 1024) continue; // skip >1MB
          const txt = fs.readFileSync(p, 'utf8');
          if (/function\s+name\s*\(\s*\)/.test(txt)) {
            results.push(p);
          }
        } catch (_e) {}
      }
    }
  }
  walk(rootDir);
  // De-dup and sort for stable ordering
  return Array.from(new Set(results)).sort();
}

function inferTeamLabel(filePath) {
  // Try to extract first robot name string
  try {
    const txt = fs.readFileSync(filePath, 'utf8');
    const m = txt.match(/function\s+name\s*\(\s*\)\s*\{[^}]*?return\s+(["'`])([^\1]+?)\1\s*;?\s*\}/);
    if (m) return `${path.basename(path.dirname(filePath))}:${m[2]}`;
  } catch (_e) {}
  // Fallback to directory and filename
  const dir = path.basename(path.dirname(filePath));
  const base = path.basename(filePath);
  return `${dir}/${base}`;
}

function runMatchCLI(red, blue) {
  return new Promise((resolve, reject) => {
    const jsonOut = path.join(os.tmpdir(), `match-${Math.random().toString(36).slice(2)}.json`);
    const args = [
      path.resolve('simulator/cli.js'),
      '--red', red,
      '--blue', blue,
      '--fast',
      '--json', jsonOut,
    ];
    const proc = spawn('node', args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', (d) => { stdout += d.toString(); });
    proc.stderr.on('data', (d) => { stderr += d.toString(); });
    proc.on('error', reject);
    proc.on('close', (code) => {
      if (code !== 0) {
        return reject(new Error(`cli exit ${code}: ${stderr || stdout}`));
      }
      try {
        const raw = fs.readFileSync(jsonOut, 'utf8');
        fs.unlinkSync(jsonOut);
        const obj = JSON.parse(raw);
        // repeat=1 so we expect summary
        const s = obj.summary || (obj.summaries && obj.summaries[0]);
        if (!s) return resolve({ winner: 'draw', ticks: 0, redAlive: 0, blueAlive: 0 });
        resolve(s);
      } catch (e) {
        // Fallback parse from stdout when JSON missing
        const w = /Winner:\s+(RED|BLUE|DRAW)/.exec(stdout);
        const winner = w ? w[1].toLowerCase() : 'draw';
        resolve({ winner, ticks: 0, redAlive: 0, blueAlive: 0 });
      }
    });
  });
}

async function main() {
  const root = path.resolve('result');
  if (!fs.existsSync(root)) throw new Error('result/ directory not found');

  const teams = scanTeamFiles(root).map((p) => ({
    file: p,
    label: inferTeamLabel(p),
  }));
  if (teams.length < 2) throw new Error('Not enough teams found under result/**');

  // Stats container
  const stats = new Map(); // key=file, value={ label, played, wins, losses, draws }
  for (const t of teams) stats.set(t.file, { label: t.label, played: 0, wins: 0, losses: 0, draws: 0 });

  // Build pair list (unordered pairs, A vs B with A as red, B as blue)
  const pairs = [];
  for (let i = 0; i < teams.length; i++) {
    for (let j = i + 1; j < teams.length; j++) {
      pairs.push([teams[i], teams[j]]);
    }
  }

  const total = pairs.length;
  const concurrency = Math.max(2, Math.min(8, Math.floor(os.cpus().length / 2)));
  let completed = 0;
  let errors = 0;

  async function worker(workIdx) {
    while (true) {
      let pair;
      // fetch next index atomically
      const idx = nextIndex++;
      if (idx >= total) return;
      pair = pairs[idx];
      const red = pair[0];
      const blue = pair[1];
      try {
        const s = await runMatchCLI(red.file, blue.file);
        const redStat = stats.get(red.file);
        const blueStat = stats.get(blue.file);
        redStat.played++; blueStat.played++;
        if (s.winner === 'red') { redStat.wins++; blueStat.losses++; }
        else if (s.winner === 'blue') { blueStat.wins++; redStat.losses++; }
        else { redStat.draws++; blueStat.draws++; }
      } catch (e) {
        errors++;
      } finally {
        completed++;
        if (completed % 50 === 0 || completed === total) {
          process.stdout.write(`\rProcessed ${completed}/${total} pairs...`);
        }
      }
    }
  }

  let nextIndex = 0;
  const workers = [];
  for (let i = 0; i < concurrency; i++) workers.push(worker(i));
  await Promise.all(workers);
  process.stdout.write(`\n`);

  // Prepare ranking
  const arr = Array.from(stats.entries()).map(([file, s]) => {
    const winRate = s.played ? s.wins / s.played : 0;
    return { file, ...s, winRate };
  }).sort((a, b) => b.winRate - a.winRate || b.wins - a.wins);

  // High win rate threshold: >= 0.6
  const high = arr.filter((x) => x.winRate >= 0.6);

  // Write MATCH.md
  const lines = [];
  lines.push('# Round-Robin Match Results');
  lines.push('');
  lines.push(`- Teams: ${teams.length}`);
  lines.push(`- Pairings: ${total} (one match per unordered pair, Red=A, Blue=B)`);
  lines.push(`- Mode: --fast (secure runner), maxTicks default`);
  if (errors) lines.push(`- Errors: ${errors} (counted as draws)`);
  lines.push('');
  lines.push('## Ranking (by win rate)');
  lines.push('');
  lines.push('| Rank | Team | Played | Wins | Losses | Draws | Win Rate |');
  lines.push('|-----:|:-----|------:|----:|------:|-----:|--------:|');
  arr.forEach((r, i) => {
    lines.push(`| ${i + 1} | ${r.label} | ${r.played} | ${r.wins} | ${r.losses} | ${r.draws} | ${(r.winRate * 100).toFixed(1)}% |`);
  });
  lines.push('');
  lines.push('## High Win Rates (>= 60%)');
  lines.push('');
  if (high.length === 0) {
    lines.push('- None');
  } else {
    for (const r of high) {
      lines.push(`- ${r.label}: ${(r.winRate * 100).toFixed(1)}% (${r.wins}/${r.played})`);
    }
  }
  lines.push('');
  const outPath = path.resolve('result', 'MATCH.md');
  fs.writeFileSync(outPath, lines.join('\n'));
  console.log(`Wrote ${outPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

