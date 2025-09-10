#!/usr/bin/env node
/* eslint-disable no-console */
// Optimizes team parameters by simulating against existing results/* teams.

const fs = require('fs');
const path = require('path');
const { buildDefaultTeam, buildTeamCode, defaultRoster } = require('./team_builder');
const { Type, runMatch } = require('../../simulator/engine');
const { compileTeamFromCode } = require('../../simulator/bot_loader');

function listCompetitorTeams(resultDir) {
  const entries = [];
  const items = fs.readdirSync(resultDir, { withFileTypes: true });
  for (const it of items) {
    if (it.isFile() && it.name.endsWith('.txt')) {
      entries.push(path.join(resultDir, it.name));
    } else if (it.isDirectory()) {
      const dir = path.join(resultDir, it.name);
      const inner = fs.readdirSync(dir).filter((f) => f.endsWith('.txt'));
      for (const f of inner) entries.push(path.join(dir, f));
    }
  }
  // Sort by mtime desc to prioritize latest
  entries.sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
  return entries;
}

function readTeamCode(file) {
  try { return fs.readFileSync(file, 'utf8'); } catch { return null; }
}

function compileSides(redCode, blueCode) {
  const red = compileTeamFromCode(redCode, 'red', 'secure');
  const blue = compileTeamFromCode(blueCode, 'blue', 'secure');
  return [...red, ...blue];
}

function evalOne(redCode, blueCode, opts = {}) {
  const { seed, maxTicks = 4000, fast = true } = opts;
  const players = compileSides(redCode, blueCode);
  const result = runMatch(players, { seed, maxTicks, fast });
  return result;
}

function evalBatch(redCode, blueCode, repeat = 30, baseSeed = 12345) {
  let redWins = 0, blueWins = 0, draws = 0, ticksSum = 0;
  let redEnergy = 0, blueEnergy = 0, redAlive = 0, blueAlive = 0;
  for (let i = 0; i < repeat; i++) {
    const seed = typeof baseSeed === 'number' ? baseSeed + i : `${baseSeed}-${i}`;
    const r = evalOne(redCode, blueCode, { seed, fast: true });
    if (r.winner === 'red') redWins++; else if (r.winner === 'blue') blueWins++; else draws++;
    ticksSum += r.ticks; redEnergy += r.stats.redEnergy; blueEnergy += r.stats.blueEnergy;
    redAlive += r.stats.redAlive; blueAlive += r.stats.blueAlive;
  }
  const agg = {
    matches: repeat,
    redWins, blueWins, draws,
    avgTicks: +(ticksSum / repeat).toFixed(2),
    avgRedEnergy: +(redEnergy / repeat).toFixed(2),
    avgBlueEnergy: +(blueEnergy / repeat).toFixed(2),
    avgRedAlive: +(redAlive / repeat).toFixed(3),
    avgBlueAlive: +(blueAlive / repeat).toFixed(3),
    winRate: +(redWins / repeat).toFixed(3),
  };
  return agg;
}

function jitter(x, span) { return x + (Math.random() * 2 - 1) * span; }

function makeCandidateRoster(prefix, baseRoster) {
  // Randomize parameters slightly to explore neighborhood
  const jittered = baseRoster.map((r, idx) => {
    const P = { ...r.P };
    const s = (k, span, lo, hi) => { P[k] = Math.max(lo, Math.min(hi, jitter(P[k], span))); };
    s('rMin', 18, 140, 320); s('rMax', 22, 200, 380);
    s('strafe', 6, 16, 46); s('threatR', 20, 80, 200); s('fleeBias', 8, 0, 28);
    s('sep', 8, 40, 100); s('edge', 8, 36, 90);
    s('leadCap', 4, 4, 20); s('leadW', 0.12, 0.6, 1.0); s('aimJitter', 0.08, 0, 0.35);
    s('healthW', 0.15, 0.6, 1.6); s('distW', 0.06, 0.05, 0.4);
    s('finisherHP', 6, 10, 60); s('aggrRemain', 2, 1, 6);
    s('aggrIn', 8, 0, 60); s('aggrOut', 8, 0, 60);
    s('bias', 10, -30, 30);
    return { ...r, name: `${prefix}-${idx+1}`, P };
  });
  return jittered;
}

async function main() {
  const ROOT = path.resolve(__dirname, '..', '..');
  const RESULT_DIR = path.join(ROOT, 'result');
  const WORKDIR = __dirname;

  const compFiles = listCompetitorTeams(RESULT_DIR)
    .filter((f) => /\d{4}-\d{2}-\d{2}-\d{2}-\d{2}\.txt$/.test(f))
    .slice(0, 4); // focus on latest/top 4 teams for speed
  if (compFiles.length === 0) {
    console.error('No competitor teams found in result/.');
    process.exit(1);
  }
  console.log('Competitors:', compFiles.map((f) => path.basename(path.dirname(f)) + '/' + path.basename(f)).join(', '));

  const compCodes = compFiles.map(readTeamCode).filter(Boolean);
  const baseTeam = buildDefaultTeam('Ares', Math.floor(Math.random() * 9999));

  const candidates = [];
  const baseRoster = defaultRoster('Ares');
  candidates.push({ name: 'base', code: baseTeam, roster: baseRoster });
  const NUM_CAND = 28;
  for (let i = 0; i < NUM_CAND; i++) {
    const roster = makeCandidateRoster('Ares', baseRoster);
    const code = buildTeamCode({ roster });
    candidates.push({ name: `cand${i+1}`, code, roster });
  }

  // Evaluate each candidate vs all competitors
  const repeat = 40; // stronger sample while still reasonable
  let best = null;
  for (const cand of candidates) {
    let totalWR = 0;
    let beatCount = 0;
    const perComp = [];
    for (const comp of compCodes) {
      const agg = evalBatch(cand.code, comp, repeat, 4242);
      perComp.push(agg);
      totalWR += agg.winRate;
      if (agg.redWins > agg.blueWins) beatCount++;
      process.stdout.write(`\n${cand.name} vs comp: winRate=${agg.winRate}, redWins=${agg.redWins}`);
    }
    const score = totalWR + beatCount * 0.5; // simple composite
    console.log(`\nCandidate ${cand.name} score=${score.toFixed(3)} (beat ${beatCount}/${compCodes.length})`);
    cand.score = score; cand.perComp = perComp;
    if (!best || cand.score > best.score) best = cand;
  }

  if (!best) {
    console.error('No best candidate determined');
    process.exit(2);
  }

  // Save best team code to result/<timestamp>/<timestamp>.txt
  const now = new Date();
  const ts = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}-${String(now.getHours()).padStart(2,'0')}-${String(now.getMinutes()).padStart(2,'0')}`;
  const outDir = path.join(ROOT, 'result', path.basename(WORKDIR));
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, `${path.basename(WORKDIR)}.txt`);
  fs.writeFileSync(outFile, best.code);

  // Write RESULT.md in working dir
  const lines = [];
  lines.push(`# Optimization Result - ${path.basename(WORKDIR)}`);
  lines.push('');
  lines.push(`Best Candidate: ${best.name}`);
  lines.push('');
  lines.push('Competitors evaluated:');
  for (const f of compFiles) lines.push(`- ${path.basename(path.dirname(f))}/${path.basename(f)}`);
  lines.push('');
  lines.push('Per-competitor performance (repeat=30):');
  for (const agg of best.perComp) {
    lines.push(`- winRate=${agg.winRate}, redWins=${agg.redWins}, blueWins=${agg.blueWins}, draws=${agg.draws}, avgTicks=${agg.avgTicks}`);
  }
  lines.push('');
  lines.push(`Saved team to: result/${path.basename(WORKDIR)}/${path.basename(WORKDIR)}.txt`);
  fs.writeFileSync(path.join(WORKDIR, 'RESULT.md'), lines.join('\n'));

  console.log(`\nSaved best team -> ${outFile}`);
}

if (require.main === module) {
  main().catch((e) => { console.error(e); process.exit(1); });
}
