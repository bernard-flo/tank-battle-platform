#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const SIM = path.join(ROOT, 'simulator', 'cli.js');

function listCompetitors() {
  const resDir = path.join(ROOT, 'result');
  const list = [];
  for (const entry of fs.readdirSync(resDir)) {
    const p = path.join(resDir, entry);
    if (entry.endsWith('.txt')) {
      list.push(p);
    } else if (fs.statSync(p).isDirectory()) {
      const txt = path.join(p, `${entry}.txt`);
      if (fs.existsSync(txt)) list.push(txt);
    }
  }
  // Exclude any of our current session variants if already created to avoid self-play
  return list.filter((p) => !p.includes('2025-09-10-14-07') || p.endsWith('/2025-09-10-14-07.txt'));
}

function runBatch({ red, blue, matches=20, seed=1234, concurrency=8, fast=true, runner='secure', jsonOut }) {
  const args = [SIM, '--red', red, '--blue', blue, '--repeat', String(matches), '--seed', String(seed), '--concurrency', String(concurrency), '--runner', runner];
  if (fast) args.push('--fast');
  if (jsonOut) args.push('--json', jsonOut);
  const r = spawnSync('node', args, { encoding: 'utf8' });
  if (r.status !== 0) {
    console.error('Batch failed:', r.stderr || r.stdout);
    throw new Error('simulator run failed');
  }
  if (!jsonOut) return null;
  const j = JSON.parse(fs.readFileSync(jsonOut, 'utf8'));
  return j.aggregate || j.summary || j;
}

function evaluateTeam(teamPath, competitors, workDir) {
  const report = [];
  let wins=0, losses=0, draws=0, total=0;
  for (const opp of competitors) {
    if (path.resolve(opp) === path.resolve(teamPath)) continue;
    const base = path.basename(opp).replace(/\.txt$/, '');
    const outA = path.join(workDir, `result_${base}_A_${Date.now()%100000}.json`);
    const outB = path.join(workDir, `result_${base}_B_${Date.now()%100000}.json`);
    const A = runBatch({ red: teamPath, blue: opp, matches: 20, jsonOut: outA });
    const B = runBatch({ red: opp, blue: teamPath, matches: 20, jsonOut: outB });
    const redWinA = A.redWins; const blueWinA = A.blueWins; const drawA = A.draws;
    const redWinB = B.redWins; const blueWinB = B.blueWins; const drawB = B.draws;
    // In B, our team is blue
    const ourWins = redWinA + blueWinB;
    const ourLoss = blueWinA + redWinB;
    const ourDraw = drawA + drawB;
    wins += ourWins; losses += ourLoss; draws += ourDraw; total += (A.matches + B.matches);
    report.push({ opponent: base, matches: A.matches + B.matches, wins: ourWins, losses: ourLoss, draws: ourDraw });
  }
  const winRate = total>0 ? (wins/total) : 0;
  return { winRate, wins, losses, draws, total, details: report };
}

function writeResultMd(workDir, sessionName, selection, resultsByVariant) {
  const lines = [];
  lines.push(`# Nova-9 Evaluation (${sessionName})`);
  lines.push('');
  lines.push(`- Selected Variant: ${selection.variant}`);
  lines.push(`- Team File: result/${sessionName}/${sessionName}.txt`);
  lines.push(`- Overall WinRate: ${(selection.result.winRate*100).toFixed(2)}% (W:${selection.result.wins} L:${selection.result.losses} D:${selection.result.draws} / ${selection.result.total})`);
  lines.push('');
  for (const [v, res] of resultsByVariant) {
    lines.push(`## Variant ${v}`);
    lines.push(`WinRate: ${(res.winRate*100).toFixed(2)}% (W:${res.wins} L:${res.losses} D:${res.draws} / ${res.total})`);
    lines.push('');
    lines.push('| Opponent | Matches | Wins | Losses | Draws |');
    lines.push('|---------|---------:|-----:|-------:|------:|');
    for (const d of res.details) {
      lines.push(`| ${d.opponent} | ${d.matches} | ${d.wins} | ${d.losses} | ${d.draws} |`);
    }
    lines.push('');
  }
  fs.writeFileSync(path.join(workDir, 'RESULT.md'), lines.join('\n'));
}

function main() {
  const session = path.basename(path.resolve(__dirname));
  const outDir = path.join(ROOT, 'result', session);
  const teamBase = path.join(outDir, `${session}.txt`);
  const workDir = path.resolve(__dirname);
  const competitors = listCompetitors();
  console.log(`Found ${competitors.length} competitors.`);

  // Build 4 variants (0..3) and evaluate each against all competitors
  const variants = [0,1,2,3];
  const resultsByVariant = [];
  for (const v of variants) {
    // generate
    const gen = spawnSync('node', [path.join(workDir, 'build_team.js'), outDir, session, String(v)], { encoding: 'utf8' });
    if (gen.status !== 0) throw new Error('build_team failed');
    const res = evaluateTeam(teamBase, competitors, outDir);
    resultsByVariant.push([v, res]);
  }

  // Pick best
  resultsByVariant.sort((a,b)=>b[1].winRate - a[1].winRate);
  const best = resultsByVariant[0];
  const selection = { variant: best[0], result: best[1] };

  // Rebuild final selected variant
  spawnSync('node', [path.join(workDir, 'build_team.js'), outDir, session, String(selection.variant)], { encoding: 'utf8' });

  // Write RESULT.md
  writeResultMd(workDir, session, selection, resultsByVariant);

  console.log(`Selected variant ${selection.variant} with winrate ${(selection.result.winRate*100).toFixed(2)}%`);
}

if (require.main === module) main();
