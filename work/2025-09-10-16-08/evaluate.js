#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');

function pickRecentTxtResults(resultDir, limit = 12) {
  const entries = [];
  // root-level .txt
  for (const f of fs.readdirSync(resultDir)) {
    const p = path.join(resultDir, f);
    try {
      const st = fs.statSync(p);
      if (st.isFile() && f.endsWith('.txt')) entries.push({ p, mtime: st.mtimeMs });
    } catch {}
  }
  // subdirectories with a single .txt
  for (const d of fs.readdirSync(resultDir)) {
    const dp = path.join(resultDir, d);
    try {
      const st = fs.statSync(dp);
      if (!st.isDirectory()) continue;
      const files = fs.readdirSync(dp).filter((f) => f.endsWith('.txt'));
      if (files.length) {
        const f = files.sort().pop();
        const p = path.join(dp, f);
        const st2 = fs.statSync(p);
        entries.push({ p, mtime: Math.max(st.mtimeMs, st2.mtimeMs) });
      }
    } catch {}
  }
  entries.sort((a, b) => b.mtime - a.mtime);
  const unique = [];
  const seen = new Set();
  for (const e of entries) {
    if (seen.has(e.p)) continue;
    seen.add(e.p);
    unique.push(e);
    if (unique.length >= limit) break;
  }
  return unique.map((e) => e.p);
}

function runBatch(redFile, blueFile, repeat = 40, concurrency = 8, seedBase = 1000) {
  const cli = path.resolve(__dirname, '../../simulator/cli.js');
  const args = [cli, '--red', redFile, '--blue', blueFile, '--repeat', String(repeat), '--concurrency', String(concurrency), '--seed', String(seedBase), '--fast'];
  const out = spawnSync('node', args, { encoding: 'utf8' });
  if (out.error) throw out.error;
  const stdout = out.stdout || '';
  // Parse summary lines
  const m = stdout.match(/Wins\s*- Red: (\d+), Blue: (\d+), Draws: (\d+)/);
  if (!m) {
    return { redWins: 0, blueWins: 0, draws: 0, ok: false, raw: stdout };
  }
  return { redWins: +m[1], blueWins: +m[2], draws: +m[3], ok: true, raw: stdout };
}

function main() {
  const wd = __dirname;
  const resultDir = path.resolve(__dirname, '../../result');
  const ts = path.basename(wd);
  const candidates = fs.readdirSync(wd).filter((f) => /^candidate_.*\.(txt|js)$/.test(f)).map((f) => path.join(wd, f));
  if (candidates.length === 0) {
    console.error('No candidate_*.txt/js files found.');
    process.exit(1);
  }
  const maxCompetitors = process.env.MAX_COMPETITORS ? parseInt(process.env.MAX_COMPETITORS, 10) : 12;
  const repeat = process.env.REPEAT ? parseInt(process.env.REPEAT, 10) : 40;
  const concurrency = process.env.CONCURRENCY ? parseInt(process.env.CONCURRENCY, 10) : Math.min(8, os.cpus().length || 4);
  const competitors = pickRecentTxtResults(resultDir, maxCompetitors).filter((p) => !candidates.includes(p));
  if (competitors.length === 0) {
    console.error('No competitors found in result/.');
    process.exit(1);
  }

  console.log(`Evaluating ${candidates.length} candidate(s) vs ${competitors.length} competitors...`);
  const table = {};
  for (const cand of candidates) {
    let totalWins = 0; let totalMatches = 0; let totalDraws = 0;
    const perOpp = [];
    for (const opp of competitors) {
      // our as red
      const r1 = runBatch(cand, opp, repeat, concurrency, 1000);
      // our as blue (reverse sides)
      const r2 = runBatch(opp, cand, repeat, concurrency, 2000);
      const wins = r1.redWins + r2.blueWins;
      const matches = repeat * 2 - (r1.draws + r2.draws);
      totalWins += wins;
      totalMatches += repeat * 2; // include draws in denominator for rate stability
      totalDraws += (r1.draws + r2.draws);
      perOpp.push({ opponent: opp, redWins: r1.redWins, blueWins: r2.blueWins, draws: r1.draws + r2.draws });
      console.log(`- ${path.basename(cand)} vs ${path.basename(opp)} => W:${wins} D:${r1.draws + r2.draws}/${repeat*2}`);
    }
    const winRate = totalWins / totalMatches;
    table[cand] = { winRate, totalWins, totalMatches, totalDraws, perOpp };
  }

  // Pick best candidate
  const best = Object.entries(table).sort((a, b) => b[1].winRate - a[1].winRate)[0];
  if (!best) {
    console.error('Failed to evaluate candidates.');
    process.exit(1);
  }
  const [bestPath, bestStats] = best;
  console.log(`Best candidate: ${path.basename(bestPath)} (winRate ${(bestStats.winRate*100).toFixed(2)}%)`);

  // Export to result/<ts>/<ts>.txt
  const outDir = path.join(resultDir, ts);
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, `${ts}.txt`);
  fs.copyFileSync(bestPath, outFile);

  // Write RESULT.md
  const md = [];
  md.push(`# Evaluation Result - ${ts}`);
  md.push('');
  md.push(`- Best: \
${path.basename(bestPath)} (winRate ${(bestStats.winRate*100).toFixed(2)}%)`);
  md.push(`- Candidates: ${candidates.map((p) => path.basename(p)).join(', ')}`);
  md.push(`- Competitors (${competitors.length}):\n  ${competitors.map((p) => path.relative(resultDir, p)).join('\n  ')}`);
  md.push('');
  md.push('## Per-Opponent Summary (wins as Red + Blue, with draws)');
  for (const row of bestStats.perOpp) {
    md.push(`- ${path.relative(resultDir, row.opponent)}: W=${row.redWins+row.blueWins}, D=${row.draws}`);
  }
  fs.writeFileSync(path.join(wd, 'RESULT.md'), md.join('\n'));

  // Persist summary JSON
  fs.writeFileSync(path.join(wd, 'EVAL_SUMMARY.json'), JSON.stringify({ table, best: { path: bestPath, stats: bestStats } }, null, 2));

  console.log(`Exported winner to: ${outFile}`);
  console.log(`Wrote summary: work/${ts}/RESULT.md`);
}

if (require.main === module) {
  try { main(); } catch (e) { console.error(e); process.exit(1); }
}

