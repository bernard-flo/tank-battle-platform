#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { buildTeam } = require('./bot_factory');

// Always refer to simulator docs
// See: .agent/SIMULATOR.md (mirrors tank_battle_platform.html mechanics; do not modify the HTML)

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
  // Exclude any file under our own output folder (if exists)
  const myBase = path.basename(WORK_DIR);
  return all.filter((p) => !p.includes(path.join('result', myBase + path.sep)));
}

function makeParams(style) {
  // style: { key, comp, tune }
  const comp = Object.assign({
    types: ['TANKER','TANKER','DEALER','DEALER','DEALER','NORMAL'],
  }, style.comp || {});

  const tune = Object.assign({
    TANKER: { minRange: 160, maxRange: 255, threatRadius: 76, strafeAngle: 26, threatFleeBias: 16 },
    NORMAL: { minRange: 185, maxRange: 295, threatRadius: 74, strafeAngle: 30, threatFleeBias: 14 },
    DEALER: { minRange: 225, maxRange: 340, threatRadius: 72, strafeAngle: 34, threatFleeBias: 12 },
    leadCap: 12,
    leadWeight: 1.0,
    aimJitter: 0.22,
    allySep: 62,
    edgeMargin: 44,
  }, style.tune || {});

  const names = ['Helix-A1','Helix-A2','Helix-A3','Helix-A4','Helix-A5','Helix-A6'];
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

function runBatch(redFile, blueFile, jsonOut, repeat = 180, seed = 1000, concurrency = 8) {
  const args = [SIM, '--red', redFile, '--blue', blueFile, '--repeat', String(repeat), '--seed', String(seed), '--runner', 'secure', '--concurrency', String(concurrency), '--fast', '--json', jsonOut];
  try {
    execFileSync('node', args, { stdio: 'pipe' });
  } catch (e) {
    process.stdout.write(String(e.stdout || ''));
    process.stderr.write(String(e.stderr || e.message || ''));
    throw e;
  }
  const data = JSON.parse(fs.readFileSync(jsonOut, 'utf8'));
  return data.aggregate || data.summary;
}

function main() {
  const opponents = listOpponents();
  if (opponents.length === 0) {
    console.error('No opponent files in result/. Add at least one .txt team.');
    process.exit(1);
  }

  // Candidate style portfolio
  const styles = [
    { key: 'balanced-v2', comp: {}, tune: {} },
    { key: 'agg-short', comp: { types: ['TANKER','TANKER','NORMAL','DEALER','DEALER','DEALER'] }, tune: { TANKER:{minRange:150,maxRange:235,strafeAngle:28,threatRadius:78}, NORMAL:{minRange:170,maxRange:260,strafeAngle:28}, DEALER:{minRange:215,maxRange:320,strafeAngle:34}, aimJitter:0.20, leadCap:13 } },
    { key: 'kite-long', comp: { types: ['TANKER','NORMAL','DEALER','DEALER','DEALER','DEALER'] }, tune: { NORMAL:{minRange:205,maxRange:325,strafeAngle:32}, DEALER:{minRange:245,maxRange:365,strafeAngle:36}, TANKER:{minRange:170,maxRange:260}, aimJitter:0.18 } },
    { key: 'double-front', comp: { types: ['TANKER','TANKER','DEALER','DEALER','NORMAL','DEALER'] }, tune: { TANKER:{minRange:165,maxRange:255,strafeAngle:24}, NORMAL:{minRange:190,maxRange:300}, DEALER:{minRange:230,maxRange:340}, leadWeight:1.05 } },
    { key: 'dealer-swarm', comp: { types: ['TANKER','DEALER','DEALER','DEALER','DEALER','DEALER'] }, tune: { DEALER:{minRange:235,maxRange:355,strafeAngle:35}, TANKER:{minRange:160,maxRange:250}, aimJitter:0.2, leadCap:12 } },
    { key: 'normal-line', comp: { types: ['TANKER','NORMAL','NORMAL','DEALER','DEALER','DEALER'] }, tune: { NORMAL:{minRange:185,maxRange:285,strafeAngle:30}, DEALER:{minRange:225,maxRange:335}, TANKER:{minRange:165,maxRange:255} } },
    { key: 'anti-kite', comp: { types: ['TANKER','TANKER','NORMAL','NORMAL','DEALER','DEALER'] }, tune: { NORMAL:{minRange:170,maxRange:260,strafeAngle:26}, DEALER:{minRange:215,maxRange:315,strafeAngle:32}, TANKER:{minRange:150,maxRange:240,strafeAngle:26}, leadWeight:0.95 } },
    { key: 'edge-safe', comp: {}, tune: { edgeMargin: 52, allySep: 66, NORMAL:{minRange:195,maxRange:305}, DEALER:{minRange:235,maxRange:350} } },
    { key: 'pincer', comp: { types: ['TANKER','DEALER','DEALER','NORMAL','DEALER','TANKER'] }, tune: { TANKER:{minRange:160,maxRange:250}, NORMAL:{minRange:190,maxRange:295}, DEALER:{minRange:230,maxRange:340}, aimJitter:0.19 } },
    { key: 'tight-strafe', comp: {}, tune: { NORMAL:{strafeAngle:26}, DEALER:{strafeAngle:30}, TANKER:{strafeAngle:24}, aimJitter:0.21, leadCap:11 } },
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
      const json1 = path.join(WORK_DIR, `tmp_${idx+1}_vs_${path.basename(opp).replace(/\.[^/.]+$/, '')}.json`);
      const agg1 = runBatch(candPath, opp, json1, 180, 777, 8);
      wins += agg1.redWins; losses += agg1.blueWins; draws += agg1.draws; totalMatches += agg1.matches;
      perOpp.push({ side: 'red', opp: path.relative(RESULT_DIR, opp), agg: agg1 });

      const json2 = path.join(WORK_DIR, `tmp_${idx+1}_rev_${path.basename(opp).replace(/\.[^/.]+$/, '')}.json`);
      const agg2 = runBatch(opp, candPath, json2, 180, 888, 8);
      wins += agg2.blueWins; losses += agg2.redWins; draws += agg2.draws; totalMatches += agg2.matches;
      perOpp.push({ side: 'blue', opp: path.relative(RESULT_DIR, opp), agg: agg2 });
    }

    const winRate = totalMatches > 0 ? wins / totalMatches : 0;
    // Compute robust score: min aggregated win-rate across opponents (both sides combined)
    const aggByOpp = {};
    for (let i = 0; i < perOpp.length; i += 2) {
      const vs = perOpp[i];
      const rv = perOpp[i+1];
      const oppKey = vs.opp; // same as rv.opp
      const winsAgg = (vs.agg.redWins || 0) + (rv.agg.blueWins || 0);
      const matchesAgg = (vs.agg.matches || 0) + (rv.agg.matches || 0);
      aggByOpp[oppKey] = matchesAgg > 0 ? winsAgg / matchesAgg : 0;
    }
    const minOppRate = Math.min(...Object.values(aggByOpp));
    const item = { key: style.key, path: candPath, wins, losses, draws, totalMatches, winRate, perOpp, minOppRate, aggByOpp };
    report.push(item);
    // prefer higher minOppRate, tiebreak by winRate
    if (!best || (item.minOppRate > best.minOppRate + 1e-9) || (item.minOppRate === best.minOppRate && item.winRate > best.winRate)) best = item;
  });

  // Save best to nested result directory: result/<workdir>/<workdir>.txt
  const outBase = path.basename(WORK_DIR);
  const outDir = path.join(RESULT_DIR, outBase);
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, `${outBase}.txt`);
  const bestCode = fs.readFileSync(best.path, 'utf8');
  fs.writeFileSync(outPath, bestCode);

  // RESULT.md summary
  let md = `# Tuning Result - ${outBase}\n\n`;
  md += `Import: result/${outBase}/${outBase}.txt\n\n`;
  md += `Opponents: ${listOpponents().map((p)=>path.relative(RESULT_DIR, p)).join(', ')}\n\n`;
  for (const r of report) {
    md += `- ${r.key}: winRate=${(r.winRate*100).toFixed(1)}% minOpp=${(r.minOppRate*100).toFixed(1)}% (W:${r.wins} L:${r.losses} D:${r.draws} / M:${r.totalMatches})\n`;
    for (const p of r.perOpp) {
      const a = p.agg;
      const wr = p.side === 'red' ? (a.redWins/a.matches) : (a.blueWins/a.matches);
      md += `  - vs ${p.opp} as ${p.side}: wr=${(wr*100).toFixed(1)}% (R:${a.redWins} B:${a.blueWins} D:${a.draws})\n`;
    }
  }
  md += `\nBest: ${best.key} (minOpp=${(best.minOppRate*100).toFixed(1)}%), saved to result/${outBase}/${outBase}.txt\n`;
  fs.writeFileSync(path.join(WORK_DIR, 'RESULT.md'), md);

  console.log(`Best candidate: ${best.key} -> ${outPath}`);
}

if (require.main === module) {
  main();
}
