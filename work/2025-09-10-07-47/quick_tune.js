#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { buildTeam } = require('./bot_factory');

const ROOT = path.resolve(__dirname, '..', '..');
const SIM = path.join(ROOT, 'simulator', 'cli.js');
const RESULT_DIR = path.join(ROOT, 'result');
const WORK_DIR = __dirname;

function listOpponentsRec(dir, out = []) {
  const ents = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of ents) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) listOpponentsRec(p, out);
    else if (e.isFile() && e.name.endsWith('.txt')) out.push(p);
  }
  return out;
}
function listOpponents() {
  const all = listOpponentsRec(RESULT_DIR);
  const myBase = path.basename(WORK_DIR);
  return all.filter((p) => !p.includes(path.join('result', myBase + path.sep)));
}

function makeParams(style) {
  const comp = Object.assign({ types: ['TANKER','TANKER','NORMAL','DEALER','DEALER','DEALER'] }, style.comp || {});
  const tune = Object.assign({
    TANKER: { minRange: 150, maxRange: 238, threatRadius: 80, strafeAngle: 28, threatFleeBias: 16 },
    NORMAL: { minRange: 170, maxRange: 260, threatRadius: 78, strafeAngle: 28, threatFleeBias: 14 },
    DEALER: { minRange: 212, maxRange: 318, threatRadius: 74, strafeAngle: 34, threatFleeBias: 12 },
    leadCap: 13,
    leadWeight: 1.00,
    aimJitter: 0.20,
    allySep: 62,
    edgeMargin: 46,
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

function runBatch(redFile, blueFile, jsonOut, repeat = 120, seed = 1000, concurrency = 8) {
  const args = [SIM, '--red', redFile, '--blue', blueFile, '--repeat', String(repeat), '--seed', String(seed), '--runner', 'secure', '--concurrency', String(concurrency), '--fast', '--json', jsonOut];
  execFileSync('node', args, { stdio: 'pipe' });
  const data = JSON.parse(fs.readFileSync(jsonOut, 'utf8'));
  return data.aggregate || data.summary;
}

function aggregateAgainstOpponents(teamPath, opponents, tag, repeat=80, seed=7000, concurrency=8) {
  let wins = 0, losses = 0, draws = 0, totalMatches = 0;
  const perOpp = [];
  for (const opp of opponents) {
    const json1 = path.join(WORK_DIR, `quick_${tag}_vs_${path.basename(opp).replace(/\.[^/.]+$/, '')}.json`);
    const agg1 = runBatch(teamPath, opp, json1, repeat, seed, concurrency);
    wins += agg1.redWins; losses += agg1.blueWins; draws += agg1.draws; totalMatches += agg1.matches;
    perOpp.push({ side: 'red', opp: path.relative(RESULT_DIR, opp), agg: agg1 });
    const json2 = path.join(WORK_DIR, `quick_${tag}_rev_${path.basename(opp).replace(/\.[^/.]+$/, '')}.json`);
    const agg2 = runBatch(opp, teamPath, json2, repeat, seed+111, concurrency);
    wins += agg2.blueWins; losses += agg2.redWins; draws += agg2.draws; totalMatches += agg2.matches;
    perOpp.push({ side: 'blue', opp: path.relative(RESULT_DIR, opp), agg: agg2 });
  }
  const winRate = totalMatches > 0 ? wins / totalMatches : 0;
  const aggByOpp = {};
  for (let i = 0; i < perOpp.length; i += 2) {
    const vs = perOpp[i];
    const rv = perOpp[i+1];
    const oppKey = vs.opp;
    const winsAgg = (vs.agg.redWins || 0) + (rv.agg.blueWins || 0);
    const matchesAgg = (vs.agg.matches || 0) + (rv.agg.matches || 0);
    aggByOpp[oppKey] = matchesAgg > 0 ? winsAgg / matchesAgg : 0;
  }
  const minOppRate = Math.min(...Object.values(aggByOpp));
  return { wins, losses, draws, totalMatches, winRate, perOpp, minOppRate, aggByOpp };
}

function main() {
  const opponents = listOpponents();
  if (opponents.length === 0) {
    console.error('No opponent files in result/. Add at least one .txt team.');
    process.exit(1);
  }

  const candidates = [
    { key: 'agg-core', comp: {}, tune: {} },
    { key: 'agg-wide', comp: {}, tune: { NORMAL:{maxRange:270}, DEALER:{maxRange:325} } },
    { key: 'agg-tight', comp: {}, tune: { NORMAL:{minRange:175,maxRange:250,strafeAngle:26}, DEALER:{minRange:210,maxRange:310,strafeAngle:32}, TANKER:{minRange:145,maxRange:230,strafeAngle:26}, aimJitter:0.21 } },
    { key: 'lead-boost', comp: {}, tune: { leadWeight:1.06, leadCap:14 } },
    { key: 'threat-high', comp: {}, tune: { TANKER:{threatRadius:90}, NORMAL:{threatRadius:88}, DEALER:{threatRadius:86} } },
    { key: 'edge-safe', comp: {}, tune: { edgeMargin: 54, allySep: 66 } },
  ];

  let best = null;
  const report = [];
  for (let i = 0; i < candidates.length; i++) {
    const params = makeParams(candidates[i]);
    const candPath = path.join(WORK_DIR, `quick_candidate_${i+1}.js`);
    writeTeam(candPath, params);
    const agg = aggregateAgainstOpponents(candPath, opponents, `c${i+1}`, 70, 8600, 8);
    const item = { key: candidates[i].key, path: candPath, ...agg };
    report.push(item);
    if (!best || (item.minOppRate > best.minOppRate + 1e-9) || (item.minOppRate === best.minOppRate && item.winRate > best.winRate)) best = item;
  }

  const outBase = path.basename(WORK_DIR);
  const outDir = path.join(RESULT_DIR, outBase);
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, `${outBase}.txt`);
  const bestCode = fs.readFileSync(best.path, 'utf8');
  fs.writeFileSync(outPath, bestCode);

  let md = `# Quick Tuning Result - ${outBase}\n\n`;
  md += `Import: result/${outBase}/${outBase}.txt\n\n`;
  md += `Opponents: ${listOpponents().map((p)=>path.relative(RESULT_DIR, p)).join(', ')}\n\n`;
  for (const r of report) {
    md += `- ${r.key}: winRate=${(r.winRate*100).toFixed(1)}% minOpp=${(r.minOppRate*100).toFixed(1)}% (W:${r.wins} L:${r.losses} D:${r.draws} / M:${r.totalMatches})\n`;
  }
  md += `\nBest: ${best.key} (minOpp=${(best.minOppRate*100).toFixed(1)}%), saved to result/${outBase}/${outBase}.txt\n`;
  fs.writeFileSync(path.join(WORK_DIR, 'RESULT.md'), md);
  console.log(`Best candidate (quick) -> ${outPath}`);
}

if (require.main === module) {
  main();
}

