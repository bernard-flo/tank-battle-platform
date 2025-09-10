#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { buildTeamCode } = require('./team_builder');

const ROOT = path.resolve(__dirname, '..', '..');
const SIM_CLI = path.join(ROOT, 'simulator', 'cli.js');
const WORKDIR = __dirname;
const TS = path.basename(WORKDIR);
const RESULTDIR = path.join(ROOT, 'result', TS);

function listOpponentFiles(maxCount = 8) {
  const resDir = path.join(ROOT, 'result');
  const files = [];
  // Root-level .txt
  for (const entry of fs.readdirSync(resDir)) {
    const p = path.join(resDir, entry);
    if (fs.statSync(p).isFile() && entry.endsWith('.txt')) files.push(p);
  }
  // Subdir .txt
  for (const entry of fs.readdirSync(resDir)) {
    const p = path.join(resDir, entry);
    try {
      if (fs.statSync(p).isDirectory()) {
        for (const f of fs.readdirSync(p)) {
          const fp = path.join(p, f);
          if (fs.statSync(fp).isFile() && f.endsWith('.txt')) files.push(fp);
        }
      }
    } catch (_) {}
  }
  // Sort by mtime desc and pick latest
  files.sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
  // Exclude our own target output if exists
  const outPath = path.join(RESULTDIR, `${TS}.txt`);
  return files.filter((f) => path.resolve(f) !== path.resolve(outPath)).slice(0, maxCount);
}

function writeTempCandidate(prefix, overrides) {
  const code = buildTeamCode(prefix, overrides || {});
  const tmp = path.join('/tmp', `${prefix}.txt`);
  fs.writeFileSync(tmp, code);
  return tmp;
}

function runBatch(redFile, blueFile, repeat = 60, seed = 424242, concurrency = 8) {
  const outJson = path.join(WORKDIR, `tmp_${path.basename(redFile).replace(/\W+/g, '_')}_vs_${path.basename(blueFile).replace(/\W+/g, '_')}_${repeat}.json`);
  const cmd = [
    'node', SIM_CLI,
    '--red', redFile,
    '--blue', blueFile,
    '--repeat', String(repeat),
    '--seed', String(seed),
    '--concurrency', String(concurrency),
    '--fast',
    '--json', outJson,
  ];
  execSync(cmd.map(String).join(' '), { stdio: 'inherit', cwd: ROOT });
  const data = JSON.parse(fs.readFileSync(outJson, 'utf8'));
  return data.aggregate || data.summary;
}

function sumResults(arr) {
  return arr.reduce((acc, a) => {
    acc.matches += a.matches || (a.redWins + a.blueWins + a.draws) || 0;
    acc.redWins += a.redWins || 0;
    acc.blueWins += a.blueWins || 0;
    acc.draws += a.draws || 0;
    return acc;
  }, { matches: 0, redWins: 0, blueWins: 0, draws: 0 });
}

function variantSet() {
  // Role-specific tweaks for exploration
  return [
    { key: 'A', overrides: {} },
    { key: 'B', overrides: { DEALER: { rMin: 258, rMax: 390, leadW: 1.22, aimJ: 0.12 }, NORMAL: { strafe: 31 }, TANKER: { rMin: 182, rMax: 296 } } },
    { key: 'C', overrides: { TANKER: { rMin: 176, rMax: 292, aggrIn: 34, aggrOut: 22 }, NORMAL: { aggrIn: 32, aggrOut: 22 }, DEALER: { rMin: 252, rMax: 372 } } },
    { key: 'D', overrides: { TANKER: { threatH: 5.8 }, NORMAL: { threatH: 6.0 }, DEALER: { threatH: 6.4, strafe: 33 } } },
    { key: 'E', overrides: { TANKER: { strafe: 29 }, NORMAL: { rMin: 218, rMax: 340 }, DEALER: { aimJ: 0.10, leadCap: 24 } } },
  ];
}

function ensureDirs() {
  if (!fs.existsSync(RESULTDIR)) fs.mkdirSync(RESULTDIR, { recursive: true });
}

function main() {
  ensureDirs();
  const opponents = listOpponentFiles(12);
  if (opponents.length === 0) {
    console.error('No opponents found in result/.');
    process.exit(1);
  }

  console.log('Opponents:', opponents.map((p) => path.relative(ROOT, p)).join(', '));

  const variants = variantSet();
  const variantScores = [];

  for (const v of variants) {
    const prefix = `Hyperion-6-${v.key}`;
    const candFile = writeTempCandidate(prefix, v.overrides);
    const perOpp = [];
    for (const opp of opponents) {
      const agg = runBatch(candFile, opp, 40, 98765, 8);
      perOpp.push({ opponent: opp, agg });
    }
    const sum = sumResults(perOpp.map(p => p.agg));
    const winRate = sum.matches ? (sum.redWins / sum.matches) : 0;
    variantScores.push({ key: v.key, prefix, file: candFile, perOpp, sum, winRate });
    console.log(`Variant ${v.key} winRate=${(winRate*100).toFixed(2)}% (vs ${opponents.length} opponents)`);
  }

  // Select best by win rate, tie-break by fewer losses then more draws
  variantScores.sort((a,b)=> b.winRate - a.winRate || (b.sum.blueWins - a.sum.blueWins) || (a.sum.draws - b.sum.draws));
  const best = variantScores[0];
  const finalPrefix = `Hyperion-6`; // stable final export name
  const finalCode = buildTeamCode(finalPrefix, variants.find(v=>v.key===best.key).overrides);

  // Save final output in result/<TS>/<TS>.txt for HTML import
  const outPath = path.join(RESULTDIR, `${TS}.txt`);
  fs.writeFileSync(outPath, finalCode);

  // Build RESULT.md summary
  let md = `# Result Summary for ${TS}\n\n`;
  md += `Final Variant: ${best.key} (winRate ${(best.winRate*100).toFixed(2)}%)\\n`;
  md += `Opponents evaluated: ${opponents.length}, Matches per opponent: 40\\n\n`;
  md += `## Per-opponent aggregate (red=candidate)\\n`;
  for (const p of best.perOpp) {
    const rel = path.relative(ROOT, p.opponent);
    const a = p.agg;
    md += `- ${rel}: wins ${a.redWins}, losses ${a.blueWins}, draws ${a.draws}\\n`;
  }
  fs.writeFileSync(path.join(WORKDIR, 'RESULT.md'), md);

  console.log('\nSaved final team and RESULT.md');
}

if (require.main === module) {
  main();
}
