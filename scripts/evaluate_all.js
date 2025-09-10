#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const cp = require('child_process');

function sh(cmd, opts = {}) {
  return cp.execSync(cmd, { stdio: 'pipe', encoding: 'utf8', ...opts });
}

function usage() {
  console.log('Usage: OUR=path/to/team.txt WD=work/<ts> [MAX_OPP=NN] [REPEAT=NN] [CONCURRENCY=N] node scripts/evaluate_all.js');
  process.exit(1);
}

function main() {
  const ROOT = path.resolve(__dirname, '..');
  const CLI = path.join(ROOT, 'simulator', 'cli.js');
  const OUR = process.env.OUR;
  const WD = process.env.WD;
  const MAX_OPP = +(process.env.MAX_OPP || 60); // cap opponents for runtime
  const REPEAT = +(process.env.REPEAT || 32);   // matches per direction
  const CONC = +(process.env.CONCURRENCY || 8);
  const SEED = +(process.env.SEED || 135791);

  if (!OUR || !WD) usage();

  // Discover opponents (.txt) under result/, excluding OUR
  const resDir = path.join(ROOT, 'result');
  const ourAbs = path.resolve(OUR);
  const opps = [];
  function walk(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) {
        walk(p);
      } else if (e.isFile() && p.endsWith('.txt')) {
        if (path.resolve(p) !== ourAbs) opps.push(p);
      }
    }
  }
  walk(resDir);
  // Sort by mtime desc (newest first) and cap
  opps.sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
  const pick = opps.slice(0, MAX_OPP);

  function runBatch(red, blue) {
    const tmp = path.join(WD, `.out_${Date.now()}_${Math.random().toString(36).slice(2)}.json`);
    const cmd = `node ${CLI} --red ${red} --blue ${blue} --repeat ${REPEAT} --concurrency ${CONC} --seed ${SEED} --fast --runner secure --json ${tmp}`;
    sh(cmd, { cwd: ROOT });
    const data = JSON.parse(fs.readFileSync(tmp, 'utf8'));
    fs.unlinkSync(tmp);
    return data.aggregate || data.summary;
  }

  let totalScore = 0, totalWins = 0, totalLoss = 0, totalDraws = 0;
  const rows = [];
  for (const opp of pick) {
    const red = runBatch(OUR, opp);
    const blue = runBatch(opp, OUR);
    const score = (red.redWins + blue.blueWins) - (red.blueWins + blue.redWins);
    totalScore += score;
    totalWins += red.redWins + blue.blueWins;
    totalLoss += red.blueWins + blue.redWins;
    totalDraws += red.draws + blue.draws;
    rows.push({ opp, score, redWins: red.redWins, blueWins: blue.blueWins, redLoss: red.blueWins, blueLoss: blue.redWins, draws: red.draws + blue.draws });
  }
  rows.sort((a, b) => b.score - a.score);

  // Write/append RESULT.md
  const md = [];
  md.push(`## Head-to-Head vs ${pick.length} opponents`);
  md.push(`- Repeat per side: ${REPEAT}, Concurrency: ${CONC}, SeedBase: ${SEED}`);
  md.push(`- Total score: ${totalScore}`);
  md.push(`- Wins: ${totalWins}, Losses: ${totalLoss}, Draws: ${totalDraws}`);
  md.push('');
  md.push('| Opponent | Score | Wins | Losses | Draws |');
  md.push('|---|---:|---:|---:|---:|');
  for (const r of rows) {
    const bn = path.basename(r.opp);
    md.push(`| ${bn} | ${r.score} | ${r.redWins + r.blueWins} | ${r.redLoss + r.blueLoss} | ${r.draws} |`);
  }
  md.push('');

  fs.appendFileSync(path.join(WD, 'RESULT.md'), '\n' + md.join('\n'));
  console.log(`Evaluation appended to ${path.join(WD, 'RESULT.md')}`);
}

if (require.main === module) {
  main();
}

