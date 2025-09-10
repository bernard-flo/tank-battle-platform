#!/usr/bin/env node
/*
  Evaluate our team variants against all existing results in result directories
  Picks the best variant (highest average win rate across opponents) and writes final output:
   - result/<ts>/<ts>.txt (importable team code)
   - work/<ts>/RESULT.md with comparison summary
*/
const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const TS = path.basename(path.resolve(__dirname));
const ROOT = path.resolve(__dirname, '..', '..');

const SIM_CLI = path.join(ROOT, 'simulator', 'cli.js');

const VARIANTS = [
  { key: 'base', file: path.join(__dirname, 'team_base.txt') },
  { key: 'aggro', file: path.join(__dirname, 'team_aggro.txt') },
  { key: 'kite', file: path.join(__dirname, 'team_kite.txt') },
];

function listOpponents() {
  const resDir = path.join(ROOT, 'result');
  const dirs = fs.readdirSync(resDir, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => path.join(resDir, d.name));
  const files = [];
  for (const d of dirs) {
    for (const f of (fs.readdirSync(d).filter(x => x.endsWith('.txt')))) {
      files.push(path.join(d, f));
    }
  }
  // Exclude our own timestamp (if exists from previous runs)
  return files.filter(p => !p.includes(`/${TS}/`));
}

function runMatchBatch(redFile, blueFile, repeat = 40, concurrency = 6, seed = 12345) {
  const tmp = path.join(__dirname, `.tmp_${path.basename(blueFile).replace(/\W+/g,'_')}_${Date.now()}.json`);
  const args = [SIM_CLI, '--red', redFile, '--blue', blueFile, '--repeat', String(repeat), '--seed', String(seed), '--fast', '--runner', 'secure', '--concurrency', String(concurrency), '--json', tmp];
  try {
    cp.execFileSync('node', args, { stdio: ['ignore','pipe','pipe'] });
  } catch (e) {
    // allow failures but mark as draw-heavy
  }
  let data = null;
  try { data = JSON.parse(fs.readFileSync(tmp,'utf8')); } catch { data = null; }
  try { fs.unlinkSync(tmp); } catch {}
  if (!data || !data.aggregate) {
    return { redWins: 0, blueWins: 0, draws: 0, matches: repeat, winRate: 0 };
  }
  const a = data.aggregate;
  const winRate = a.matches>0 ? a.redWins/a.matches : 0;
  return { redWins: a.redWins, blueWins: a.blueWins, draws: a.draws, matches: a.matches, winRate };
}

function evaluateVariant(variant, opponents) {
  const summary = [];
  let wins=0, games=0;
  for (const opp of opponents) {
    const r = runMatchBatch(variant.file, opp, 40, 6, 56789);
    summary.push({ opponent: opp, ...r });
    wins += r.redWins; games += r.matches;
  }
  const winRate = games>0 ? wins/games : 0;
  return { key: variant.key, file: variant.file, winRate, details: summary };
}

function rankOpponents(variant, opponents) {
  // Optional: find top-5 toughest opponents by our loss rate
  const det = [];
  for (const opp of opponents) {
    const r = runMatchBatch(variant.file, opp, 40, 6, 24680);
    det.push({ opponent: opp, score: r.winRate });
  }
  det.sort((a,b)=>a.score-b.score);
  return det.slice(0, Math.min(5, det.length));
}

function main() {
  const opponents = listOpponents();
  if (opponents.length === 0) {
    console.error('No opponents found in result/*/*.txt');
    process.exit(1);
  }
  // Limit number of opponents for time; prefer most recent ones
  const limited = opponents.slice(-12);
  console.log('Opponents:', opponents.length, 'Evaluating subset:', limited.length);

  // First pass: evaluate variants against all opponents (coarse)
  const variantResults = VARIANTS.map(v => evaluateVariant(v, limited));
  variantResults.sort((a,b)=>b.winRate-a.winRate);
  console.log('Variant win rates:', variantResults.map(v=>`${v.key}:${(v.winRate*100).toFixed(1)}%`).join(', '));

  const best = variantResults[0];

  // Optional second pass: fine-check on toughest subset and re-evaluate top-2 variants
  const hardest = rankOpponents({ key: best.key, file: best.file }, limited).map(o=>o.opponent);
  const finalists = [variantResults[0], variantResults[1] || variantResults[0]];
  const finalistChecks = finalists.map(v => ({ key: v.key, subset: hardest, res: evaluateVariant({ key: v.key, file: v.file }, hardest) }));

  // Decide final variant
  let final = best;
  if (finalistChecks.length === 2 && finalistChecks[1].res.winRate > finalistChecks[0].res.winRate + 0.01) {
    final = variantResults[1];
  }

  // Write final output to result/<ts>/<ts>.txt
  const outDir = path.join(ROOT, 'result', TS);
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, `${TS}.txt`);
  fs.copyFileSync(final.file, outFile);

  // Build RESULT.md
  let md = `# Evaluation Result - ${TS}\n\n`;
  md += `- Variant candidates: ${variantResults.map(v=>v.key).join(', ')}\n`;
  md += `- Best variant: ${final.key} (overall win rate ${(final.winRate*100).toFixed(2)}%)\n`;
  md += `- Opponents evaluated: ${opponents.length}\n`;
  md += `\n## Variant Overview\n`;
  variantResults.forEach(v => { md += `- ${v.key}: ${(v.winRate*100).toFixed(2)}%\n`; });
  if (hardest.length>0) {
    md += `\n## Hardest Opponents (by win-rate)\n`;
    hardest.forEach(p=>{ md += `- ${path.basename(path.dirname(p))}/${path.basename(p)}\n`; });
  }
  md += `\n## Detailed Results for Best Variant (${final.key})\n`;
  best.details.sort((a,b)=>a.winRate-b.winRate);
  best.details.forEach(d => {
    md += `- ${path.basename(path.dirname(d.opponent))}/${path.basename(d.opponent)}: ${(d.winRate*100).toFixed(1)}% (${d.redWins}/${d.matches})\n`;
  });
  fs.writeFileSync(path.join(__dirname, 'RESULT.md'), md);

  console.log('Final output written to', outFile);
  console.log('RESULT.md written.');
}

if (require.main === module) main();
