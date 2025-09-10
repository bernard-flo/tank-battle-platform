#!/usr/bin/env node
/*
 Evaluates generated team profiles against all existing result teams.
 Runs headless simulator in batch with concurrency and aggregates win rates.

 Usage:
   node evaluate.js [repeat] [concurrency]

 Writes RESULT.md in this working directory and returns the chosen profile.
*/
const fs = require('fs');
const path = require('path');
const { execSync, spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const SIM = path.join(ROOT, 'simulator', 'cli.js');
const RESULT_DIR = path.join(ROOT, 'result');
const WORK_DIR = __dirname;

const PROFILES = ['astra-v1','astra-v2','astra-v3'];

function listOpponentFiles() {
  const files = [];
  const entries = fs.readdirSync(RESULT_DIR, { withFileTypes: true });
  for (const ent of entries) {
    if (ent.isFile() && ent.name.endsWith('.txt')) {
      files.push(path.join(RESULT_DIR, ent.name));
    } else if (ent.isDirectory()) {
      const sub = path.join(RESULT_DIR, ent.name);
      // skip our own timestamp dir if present
      if (sub === path.join(RESULT_DIR, path.basename(WORK_DIR))) continue;
      // include one .txt inside if exists
      for (const fn of fs.readdirSync(sub)) {
        if (fn.endsWith('.txt')) files.push(path.join(sub, fn));
      }
    }
  }
  return files;
}

function buildProfile(profile) {
  const gen = path.join(WORK_DIR, 'gen_team.js');
  const out = path.join(WORK_DIR, `${profile}.txt`);
  const code = spawnSync('node', [gen, profile], { encoding: 'utf8' });
  if (code.status !== 0) throw new Error(`gen_team failed: ${code.stderr}`);
  fs.writeFileSync(out, code.stdout);
  return out;
}

function runBatch(redFile, blueFile, repeat, concurrency, seedBase, tag) {
  const jsonOut = path.join(RESULT_DIR, `result_${tag}.json`);
  const args = [SIM, '--red', redFile, '--blue', blueFile, '--repeat', String(repeat), '--concurrency', String(concurrency), '--seed', String(seedBase), '--fast', '--runner', 'secure', '--json', jsonOut];
  const res = spawnSync('node', args, { encoding: 'utf8' });
  if (res.status !== 0) {
    throw new Error(`simulator failed: ${res.stderr || res.stdout}`);
  }
  const parsed = JSON.parse(fs.readFileSync(jsonOut, 'utf8'));
  return parsed.aggregate;
}

function nameFromPath(p) {
  return path.basename(p).replace(/\.[^.]+$/, '');
}

function main() {
  const repeat = process.argv[2] ? parseInt(process.argv[2], 10) : 40;
  const concurrency = process.argv[3] ? parseInt(process.argv[3], 10) : 8;
  const opponents = listOpponentFiles();
  if (opponents.length === 0) {
    console.error('No opponents found in result/.');
    process.exit(1);
  }

  const profileScores = {};
  const perOppResults = {};

  for (const prof of PROFILES) {
    const cand = buildProfile(prof);
    let wins = 0, losses = 0, draws = 0;
    const details = [];
    for (const opp of opponents) {
      const oppName = nameFromPath(opp);
      // run both sides to reduce side bias
      const tag1 = `${path.basename(prof)}_vs_${oppName}_A_${repeat}`;
      const agg1 = runBatch(cand, opp, repeat, concurrency, 4242, tag1);
      const tag2 = `${path.basename(prof)}_vs_${oppName}_B_${repeat}`;
      const agg2 = runBatch(opp, cand, repeat, concurrency, 8383, tag2);
      // candidate wins are redWins in agg1 and blueWins in agg2
      const w = agg1.redWins + agg2.blueWins;
      const l = agg1.blueWins + agg2.redWins;
      const d = agg1.draws + agg2.draws;
      wins += w; losses += l; draws += d;
      details.push({ opponent: oppName, wins: w, losses: l, draws: d, matches: (repeat*2) });
    }
    profileScores[prof] = { wins, losses, draws, total: wins+losses+draws, details };
    perOppResults[prof] = details;
  }

  // choose best by highest win rate; tie-break by fewer losses
  const ranking = Object.entries(profileScores).map(([k,v])=>{
    const wr = v.total>0 ? v.wins / v.total : 0;
    return { profile:k, ...v, winRate: wr };
  }).sort((a,b)=> b.winRate - a.winRate || a.losses - b.losses);

  const best = ranking[0];

  // Write RESULT.md
  const lines = [];
  lines.push(`# Evaluation Result (${new Date().toISOString()})`);
  lines.push('');
  lines.push(`Opponents: ${opponents.length}, Repeats per side: ${repeat}`);
  lines.push('');
  for (const r of ranking) {
    lines.push(`- ${r.profile}: winRate=${(r.winRate*100).toFixed(2)}% (W:${r.wins} L:${r.losses} D:${r.draws})`);
  }
  lines.push('');
  lines.push(`Chosen: ${best.profile}`);
  lines.push('');
  lines.push('## Per-opponent breakdown (chosen)');
  for (const d of perOppResults[best.profile]) {
    const rate = d.wins / d.matches;
    lines.push(`- vs ${d.opponent}: ${(rate*100).toFixed(2)}% (W:${d.wins} L:${d.losses} D:${d.draws} / ${d.matches})`);
  }
  fs.writeFileSync(path.join(WORK_DIR, 'RESULT.md'), lines.join('\n'));

  // Emit chosen profile to stdout for caller
  process.stdout.write(best.profile + '\n');
}

if (require.main === module) {
  main();
}

