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

function listOpponents() {
  const files = fs.readdirSync(RESULT_DIR)
    .filter((f) => f.endsWith('.txt'))
    .map((f) => path.join(RESULT_DIR, f));
  return files;
}

function makeParams(style) {
  // style: { name, comp, tune }
  // Composition defaults
  const comp = Object.assign({
    // order: [0..5]
    types: ['TANKER','TANKER','DEALER','DEALER','DEALER','NORMAL'],
  }, style.comp || {});
  const tune = Object.assign({
    // role presets
    TANKER: { minRange: 160, maxRange: 260, threatRadius: 70, strafeAngle: 24 },
    NORMAL: { minRange: 180, maxRange: 290, threatRadius: 68, strafeAngle: 28 },
    DEALER: { minRange: 220, maxRange: 330, threatRadius: 72, strafeAngle: 32 },
    // globals
    leadCap: 10,
    leadWeight: 1.0,
    aimJitter: 0.25,
    allySep: 60,
    edgeMargin: 45,
  }, style.tune || {});

  const names = ['Vanguard-A1','Vanguard-A2','Vanguard-A3','Vanguard-A4','Vanguard-A5','Vanguard-A6'];
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
    }, tune[t])
  }));
}

function writeTeam(filePath, paramList) {
  const code = buildTeam(paramList);
  fs.writeFileSync(filePath, code);
}

function runBatch(redFile, blueFile, jsonOut, repeat = 200, seed = 1000) {
  const args = [SIM, '--red', redFile, '--blue', blueFile, '--repeat', String(repeat), '--seed', String(seed), '--runner', 'secure', '--concurrency', '8', '--fast', '--json', jsonOut];
  try {
    execFileSync('node', args, { stdio: 'pipe' });
  } catch (e) {
    // forward console
    process.stdout.write(String(e.stdout || ''));
    process.stderr.write(String(e.stderr || e.message || ''));
    throw e;
  }
  const data = JSON.parse(fs.readFileSync(jsonOut, 'utf8'));
  return data.aggregate || data.summary;
}

function scoreAggregate(agg) {
  // Favor higher total wins and higher energy
  return (agg.redWins || 0) / (agg.matches || 1);
}

function main() {
  const opponents = listOpponents();
  if (opponents.length === 0) {
    console.error('No opponent files in result/. Add at least one .txt team.');
    process.exit(1);
  }

  // Define candidate styles
  const styles = [
    { key: 'balanced-v1', comp: {}, tune: {} },
    { key: 'agg-v2', comp: { types: ['TANKER','TANKER','DEALER','DEALER','NORMAL','DEALER'] }, tune: { TANKER:{minRange:150,maxRange:240,strafeAngle:26}, DEALER:{minRange:210,maxRange:320,strafeAngle:34}, aimJitter:0.2, leadCap:11 } },
    { key: 'def-v3', comp: { types: ['TANKER','TANKER','DEALER','DEALER','DEALER','DEALER'] }, tune: { TANKER:{minRange:170,maxRange:270}, DEALER:{minRange:230,maxRange:340}, leadWeight:1.1 } },
    { key: 'kite-v4', comp: {}, tune: { NORMAL:{minRange:200,maxRange:320,strafeAngle:32}, DEALER:{minRange:240,maxRange:360,strafeAngle:36}, aimJitter:0.2, leadCap:12 } },
    { key: 'close-v5', comp: { types: ['TANKER','TANKER','NORMAL','NORMAL','DEALER','DEALER'] }, tune: { NORMAL:{minRange:160,maxRange:260,strafeAngle:24}, DEALER:{minRange:210,maxRange:310,strafeAngle:30}, leadWeight:0.9 } },
  ];

  const report = [];
  let best = null;

  styles.forEach((style, idx) => {
    const params = makeParams(style);
    const candPath = path.join(WORK_DIR, `candidate_${idx+1}.js`);
    writeTeam(candPath, params);
    let wins = 0, losses = 0, draws = 0, totalMatches = 0;
    const perOpp = [];

    for (const opp of opponents) {
      const json1 = path.join(WORK_DIR, `tmp_${idx+1}_vs_${path.basename(opp)}.json`);
      const agg1 = runBatch(candPath, opp, json1, 220, 777);
      wins += agg1.redWins; losses += agg1.blueWins; draws += agg1.draws; totalMatches += agg1.matches;
      perOpp.push({ side: 'red', opp: path.basename(opp), agg: agg1 });

      const json2 = path.join(WORK_DIR, `tmp_${idx+1}_rev_${path.basename(opp)}.json`);
      const agg2 = runBatch(opp, candPath, json2, 220, 888);
      wins += agg2.blueWins; losses += agg2.redWins; draws += agg2.draws; totalMatches += agg2.matches;
      perOpp.push({ side: 'blue', opp: path.basename(opp), agg: agg2 });
    }

    const winRate = totalMatches > 0 ? wins / totalMatches : 0;
    const item = { key: style.key, path: candPath, wins, losses, draws, totalMatches, winRate, perOpp };
    report.push(item);
    if (!best || winRate > best.winRate) best = item;
  });

  // Save best to result
  const outName = path.basename(WORK_DIR) + '.txt';
  const outPath = path.join(RESULT_DIR, outName);
  const bestCode = fs.readFileSync(best.path, 'utf8');
  fs.writeFileSync(outPath, bestCode);

  // RESULT.md
  let md = `# Tuning Result - ${path.basename(WORK_DIR)}\n\n`;
  md += `Opponents: ${opponents.map((p)=>path.basename(p)).join(', ')}\n\n`;
  for (const r of report) {
    md += `- ${r.key}: winRate=${(r.winRate*100).toFixed(1)}% (W:${r.wins} L:${r.losses} D:${r.draws} / M:${r.totalMatches})\n`;
    for (const p of r.perOpp) {
      const a = p.agg;
      const wr = p.side === 'red' ? (a.redWins/a.matches) : (a.blueWins/a.matches);
      md += `  - vs ${p.opp} as ${p.side}: wr=${(wr*100).toFixed(1)}% (R:${a.redWins} B:${a.blueWins} D:${a.draws})\n`;
    }
  }
  md += `\nBest: ${best.key}, saved to result/${outName}\n`;
  fs.writeFileSync(path.join(WORK_DIR, 'RESULT.md'), md);

  console.log(`Best candidate: ${best.key} -> ${outPath}`);
}

if (require.main === module) {
  main();
}

