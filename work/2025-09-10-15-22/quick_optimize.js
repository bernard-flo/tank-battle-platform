#!/usr/bin/env node
/* eslint-disable no-console */
// Fast candidate search against existing results using simulator/cli.js
// Produces: result/<TS>/<TS>.txt and work/<TS>/RESULT.md

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { buildTeam } = require('./bot_factory');

const ROOT = path.resolve(__dirname, '..', '..');
const RESULT_DIR = path.join(ROOT, 'result');
const SIM = path.join(ROOT, 'simulator', 'cli.js');
const RUN_ID = path.basename(path.resolve(__dirname));
const OUT_DIR = path.join(RESULT_DIR, RUN_ID);

function listOpponentsRec(dir, out = []) {
  const ents = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of ents) {
    const p = path.join(dir, e.name);
    if (path.resolve(p) === path.resolve(OUT_DIR)) continue; // exclude our result dir
    if (e.isDirectory()) listOpponentsRec(p, out);
    else if (e.isFile() && e.name.endsWith('.txt')) out.push(p);
  }
  return out;
}

function listOpponents(limit = 16) {
  const all = listOpponentsRec(RESULT_DIR);
  // newest first
  all.sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
  return all.slice(0, limit);
}

function makeParams(style) {
  const comp = Object.assign({ types: ['TANKER','TANKER','NORMAL','DEALER','DEALER','DEALER'] }, style.comp || {});
  const tune = Object.assign({
    TANKER: { minRange: 150, maxRange: 238, threatRadius: 86, strafeAngle: 28, threatFleeBias: 16 },
    NORMAL: { minRange: 172, maxRange: 262, threatRadius: 82, strafeAngle: 28, threatFleeBias: 14 },
    DEALER: { minRange: 210, maxRange: 320, threatRadius: 78, strafeAngle: 34, threatFleeBias: 12 },
    leadCap: 13,
    leadWeight: 1.04,
    aimJitter: 0.21,
    allySep: 64,
    edgeMargin: 52,
  }, style.tune || {});
  const names = ['Nova-Q1','Nova-Q2','Nova-Q3','Nova-Q4','Nova-Q5','Nova-Q6'];
  const biases = [-12, +12, -6, +6, -3, +3];
  return comp.types.map((t, i) => ({
    name: names[i],
    type: t,
    params: Object.assign({
      bias: biases[i],
      leadCap: tune.leadCap,
      leadWeight: tune.leadWeight,
      aimJitter: tune.aimJitter,
      allySep: tune.allySep,
      edgeMargin: tune.edgeMargin,
      threatFleeBias: (tune[t] && tune[t].threatFleeBias) || 14,
    }, tune[t])
  }));
}

function writeTeam(filePath, paramList) {
  const code = buildTeam(paramList);
  fs.writeFileSync(filePath, code);
}

function runBatch(redFile, blueFile, jsonOut, repeat = 36, seed = 4000, concurrency = 8) {
  const args = [SIM, '--red', redFile, '--blue', blueFile, '--repeat', String(repeat), '--seed', String(seed), '--runner', 'secure', '--concurrency', String(concurrency), '--fast', '--json', jsonOut];
  execFileSync('node', args, { stdio: 'pipe' });
  const data = JSON.parse(fs.readFileSync(jsonOut, 'utf8'));
  return data.aggregate || data.summary;
}

function aggregateAgainstOpponents(teamPath, opponents, tag, repeat=36, seed=5000, concurrency=8) {
  let wins = 0, losses = 0, draws = 0, totalMatches = 0;
  const perOpp = [];
  for (const opp of opponents) {
    const json1 = path.join(__dirname, `agg_${tag}_vs_${path.basename(opp).replace(/\.[^/.]+$/, '')}.json`);
    const agg1 = runBatch(teamPath, opp, json1, repeat, seed, concurrency);
    wins += agg1.redWins; losses += agg1.blueWins; draws += agg1.draws; totalMatches += agg1.matches;
    perOpp.push({ side: 'red', opp: path.relative(RESULT_DIR, opp), agg: agg1 });
    const json2 = path.join(__dirname, `agg_${tag}_rev_${path.basename(opp).replace(/\.[^/.]+$/, '')}.json`);
    const agg2 = runBatch(opp, teamPath, json2, repeat, seed+137, concurrency);
    wins += agg2.blueWins; losses += agg2.redWins; draws += agg2.draws; totalMatches += agg2.matches;
    perOpp.push({ side: 'blue', opp: path.relative(RESULT_DIR, opp), agg: agg2 });
  }
  const winRate = totalMatches > 0 ? wins / totalMatches : 0;
  const oppRates = {};
  for (let i = 0; i < perOpp.length; i += 2) {
    const vs = perOpp[i];
    const rv = perOpp[i+1];
    const oppKey = vs.opp;
    const winsAgg = (vs.agg.redWins || 0) + (rv.agg.blueWins || 0);
    const matchesAgg = (vs.agg.matches || 0) + (rv.agg.matches || 0);
    oppRates[oppKey] = matchesAgg > 0 ? winsAgg / matchesAgg : 0;
  }
  const minOppRate = Math.min(...Object.values(oppRates));
  return { wins, losses, draws, totalMatches, winRate, perOpp, minOppRate, oppRates };
}

function main() {
  const opponents = listOpponents(14);
  if (opponents.length === 0) {
    console.error('No opponent files in result/. Add at least one .txt team.');
    process.exit(1);
  }

  const candidates = [
    { key: 'core', comp: {}, tune: {} },
    { key: 'lead+', comp: {}, tune: { leadWeight:1.06, leadCap:14 } },
    { key: 'tight', comp: {}, tune: { NORMAL:{minRange:175,maxRange:252,strafeAngle:27}, DEALER:{minRange:208,maxRange:312,strafeAngle:32}, TANKER:{minRange:145,maxRange:230,strafeAngle:26}, aimJitter:0.20 } },
    { key: 'wide', comp: {}, tune: { NORMAL:{maxRange:272}, DEALER:{maxRange:330} } },
    { key: 'threat++', comp: {}, tune: { TANKER:{threatRadius:96}, NORMAL:{threatRadius:92}, DEALER:{threatRadius:88}, edgeMargin:56 } },
  ];

  const report = [];
  let best = null;
  for (let i = 0; i < candidates.length; i++) {
    const params = makeParams(candidates[i]);
    const candPath = path.join(__dirname, `candidate_${i+1}.js`);
    writeTeam(candPath, params);
    const agg = aggregateAgainstOpponents(candPath, opponents, `c${i+1}`, 32, 7200, 8);
    const item = { key: candidates[i].key, path: candPath, ...agg };
    report.push(item);
    if (!best || (item.minOppRate > best.minOppRate + 1e-9) || (item.minOppRate === best.minOppRate && item.winRate > best.winRate)) best = item;
    console.log(`Candidate ${i+1}/${candidates.length} ${candidates[i].key}: WR ${(item.winRate*100).toFixed(1)}% | minOpp ${(item.minOppRate*100).toFixed(1)}%`);
  }

  // Save best as final output
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
  const outPath = path.join(OUT_DIR, `${RUN_ID}.txt`);
  const bestCode = fs.readFileSync(best.path, 'utf8');
  fs.writeFileSync(outPath, bestCode);

  // RESULT.md
  let md = `# ${RUN_ID} - Quick Optimization Result\n\n`;
  md += `Referenced: .agent/SIMULATOR.md mechanics and CLI\n\n`;
  md += `Import: result/${RUN_ID}/${RUN_ID}.txt\n\n`;
  md += `Opponents (${opponents.length}):\n`;
  for (const o of opponents) md += `- ${path.relative(RESULT_DIR, o)}\n`;
  md += `\nCandidates:\n`;
  for (const r of report) {
    md += `- ${r.key}: winRate=${(r.winRate*100).toFixed(1)}% minOpp=${(r.minOppRate*100).toFixed(1)}% (W:${r.wins} L:${r.losses} D:${r.draws} / M:${r.totalMatches})\n`;
  }
  md += `\nSelected: ${best.key} (minOpp=${(best.minOppRate*100).toFixed(1)}%, winRate=${(best.winRate*100).toFixed(1)}%)\n`;
  fs.writeFileSync(path.join(__dirname, 'RESULT.md'), md);

  console.log(`Best candidate -> ${outPath}`);
}

if (require.main === module) {
  main();
}

