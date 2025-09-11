#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const { buildTeam } = require('./TEAM_TEMPLATE');

const ROOT = path.resolve(path.join(__dirname, '..', '..'));
const SIM = path.join(ROOT, 'simulator', 'cli.js');
const RESULT_DIR = path.join(ROOT, 'result');
const WORK_DIR = __dirname;
const TS = path.basename(WORK_DIR);

function listOpponents(max = 12) {
  const entries = fs.readdirSync(RESULT_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .filter((n) => /\d{4}-\d{2}-\d{2}-\d{2}-\d{2}/.test(n) && n !== TS)
    .sort();
  const picked = entries.slice(-max);
  const opponents = [];
  for (const dir of picked) {
    const folder = path.join(RESULT_DIR, dir);
    const files = fs.readdirSync(folder).filter((f) => f.endsWith('.txt'));
    if (files.length === 0) continue;
    opponents.push({ id: dir, file: path.join(folder, files[0]) });
  }
  return opponents;
}

function writeTeam(file, code) {
  fs.writeFileSync(file, code);
}

function runMatch(redFile, blueFile, repeat = 40, concurrency = 8, seed = 1000) {
  const jsonTmp = path.join(WORK_DIR, `.tmp_${path.basename(redFile)}_${path.basename(blueFile)}.json`);
  const args = [SIM, '--red', redFile, '--blue', blueFile, '--repeat', String(repeat), '--concurrency', String(concurrency), '--seed', String(seed), '--fast', '--runner', 'secure', '--json', jsonTmp];
  try {
    cp.execFileSync('node', args, { stdio: 'pipe' });
    const out = JSON.parse(fs.readFileSync(jsonTmp, 'utf8'));
    fs.unlinkSync(jsonTmp);
    return out.aggregate;
  } catch (e) {
    console.error('Simulation failed against', blueFile, e.message);
    return null;
  }
}

function totalScore(agg) {
  if (!agg) return -Infinity;
  // Score: win rate primary, then average energy margin
  const total = agg.matches;
  const winRate = (agg.redWins - agg.blueWins) / total;
  const energyDiff = (agg.avgRedEnergy - agg.avgBlueEnergy) / 1000; // small weight
  return winRate + energyDiff * 0.2;
}

function buildVariant(name) {
  // Roles: sequence with slight per-slot tweaks
  const roles = [
    { kind: 'TANKER', bias: -6 },
    { kind: 'DEALER', bias: +8, rMax: +10 },
    { kind: 'NORMAL', bias: +2 },
    { kind: 'DEALER', bias: +10, rMin: +6 },
    { kind: 'NORMAL', bias: 0 },
    { kind: 'TANKER', bias: -4, rMin: -6 },
  ];
  const tweak = (fn) => roles.map((r, i) => fn({ ...r }, i));
  switch (name) {
    case 'aggr':
      return tweak((r, i) => { r.bias += 6; if (r.kind !== 'TANKER') r.rMin = (r.rMin||0) + 6; return r; });
    case 'kite':
      return tweak((r, i) => { r.bias += (i%2?10:4); r.rMin = (r.rMin||0) + 10; r.rMax = (r.rMax||0) + 16; r.strafe = (r.strafe||30) + 6; r.strafeTick = 1; return r; });
    case 'safe':
      return tweak((r) => { r.bias -= 6; r.rMin = (r.rMin||0) + 6; r.rMax = (r.rMax||0) + 6; r.threatR = 220; r.fleeBias = (r.fleeBias||18) + 6; r.openTicks = 28; return r; });
    case 'wide':
      return tweak((r) => { r.rMax = (r.rMax||0) + 22; r.rangeSpread = 22; return r; });
    case 'close':
      return tweak((r) => { r.rMin = (r.rMin||0) - 12; r.bias -= 4; return r; });
    case 'evade':
      return tweak((r, i) => { r.threatR = 230; r.fleeBias = (r.fleeBias||18) + 10; r.ttcW = 6; r.openTicks = 30; r.openSpread = 26; r.strafe = (r.strafe||30) + 4; r.strafeSpread = 18; return r; });
    case 'burst':
      return tweak((r, i) => { r.leadW = 0.98; r.aimJitter = 0.14; r.rMin = (r.rMin||0) - 4; r.bias += (i%2?6:2); return r; });
    case 'lock':
      return tweak((r) => { r.aimJitter = 0.08; r.leadCap = 16; r.smoothPrev = 0.6; return r; });
    default:
      return roles;
  }
}

function generateTeamCode(label, variant) {
  const code = buildTeam(label, variant);
  // Prepend a small header comment for readability
  return `// ${label} - generated ${new Date().toISOString()}\n` + code + '\n';
}

function main() {
  // Build candidate variants
  const labels = ['base', 'aggr', 'kite', 'safe', 'wide', 'close', 'evade', 'burst', 'lock'];
  const candidates = labels.map((lab) => ({ label: lab, roles: buildVariant(lab) }));

  // Write candidate files
  const candFiles = [];
  for (const c of candidates) {
    const file = path.join(WORK_DIR, `${c.label}.js`);
    writeTeam(file, generateTeamCode(`Hyperion-${c.label}`, c.roles));
    candFiles.push({ ...c, file });
  }

  const opponents = listOpponents(12);
  if (opponents.length === 0) {
    console.error('No opponents found in result/.');
    process.exit(1);
  }
  console.log('Opponents:', opponents.map(o=>o.id).join(', '));

  // Evaluate each candidate vs all opponents and sum scores
  const summary = [];
  for (const cand of candFiles) {
    let aggWins = 0, aggLoss = 0, aggDraw = 0, scoreSum = 0;
    for (const opp of opponents) {
      const agg = runMatch(cand.file, opp.file, 40, 8, 1000);
      if (!agg) continue;
      aggWins += agg.redWins; aggLoss += agg.blueWins; aggDraw += agg.draws; scoreSum += totalScore(agg);
    }
    summary.push({ label: cand.label, file: cand.file, wins: aggWins, losses: aggLoss, draws: aggDraw, score: +scoreSum.toFixed(3) });
    console.log(`Candidate ${cand.label}: W:${aggWins} L:${aggLoss} D:${aggDraw} score:${scoreSum.toFixed(3)}`);
  }

  summary.sort((a,b)=> b.score - a.score);
  const best = summary[0];
  console.log('Best candidate:', best);

  // Save best team to result/<TS>/<TS>.txt and WORK_DIR/RESULT.md
  const bestCode = fs.readFileSync(best.file, 'utf8');
  const outDir = path.join(RESULT_DIR, TS);
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, `${TS}.txt`);
  fs.writeFileSync(outFile, bestCode);

  // Build RESULT.md
  const md = [];
  md.push(`# RESULT - ${TS}`);
  md.push('');
  md.push('Opponents evaluated:');
  for (const o of opponents) md.push(`- ${o.id}`);
  md.push('');
  md.push('Candidate summary:');
  for (const s of summary) md.push(`- ${s.label}: W:${s.wins} L:${s.losses} D:${s.draws} score:${s.score}`);
  md.push('');
  md.push(`Best: ${best.label}`);
  md.push('');
  md.push('Import the team by pasting the contents of the .txt into the platform Import modal.');
  fs.writeFileSync(path.join(WORK_DIR, 'RESULT.md'), md.join('\n'));

  console.log('Saved best team to', outFile);
}

if (require.main === module) {
  main();
}
