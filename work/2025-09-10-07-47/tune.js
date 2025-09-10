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

  const names = ['Nova-A1','Nova-A2','Nova-A3','Nova-A4','Nova-A5','Nova-A6'];
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

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function jitter(v, scale, lo, hi) { return clamp(v + (Math.random()*2-1)*scale, lo, hi); }

function mutateStyle(style) {
  const base = JSON.parse(JSON.stringify(style));
  const t = base.tune = base.tune || {};
  const ensure = (k, def) => { t[k] = Object.assign({}, def, t[k] || {}); };
  ensure('TANKER', { minRange: 160, maxRange: 255, strafeAngle: 26, threatRadius: 76, threatFleeBias: 16 });
  ensure('NORMAL', { minRange: 185, maxRange: 295, strafeAngle: 30, threatRadius: 74, threatFleeBias: 14 });
  ensure('DEALER', { minRange: 225, maxRange: 340, strafeAngle: 34, threatRadius: 72, threatFleeBias: 12 });
  if (t.leadCap === undefined) t.leadCap = 12;
  if (t.leadWeight === undefined) t.leadWeight = 1.0;
  if (t.aimJitter === undefined) t.aimJitter = 0.22;
  if (t.allySep === undefined) t.allySep = 62;
  if (t.edgeMargin === undefined) t.edgeMargin = 44;

  const s = 12; // typical scale in px/deg
  t.TANKER.minRange = Math.round(jitter(t.TANKER.minRange, s, 130, 220));
  t.TANKER.maxRange = Math.round(jitter(t.TANKER.maxRange, s, 220, 300));
  t.TANKER.strafeAngle = Math.round(jitter(t.TANKER.strafeAngle, 6, 18, 40));
  t.TANKER.threatRadius = Math.round(jitter(t.TANKER.threatRadius, 8, 60, 100));
  t.TANKER.threatFleeBias = Math.round(jitter(t.TANKER.threatFleeBias, 6, 8, 26));

  t.NORMAL.minRange = Math.round(jitter(t.NORMAL.minRange, s, 160, 230));
  t.NORMAL.maxRange = Math.round(jitter(t.NORMAL.maxRange, s, 250, 330));
  t.NORMAL.strafeAngle = Math.round(jitter(t.NORMAL.strafeAngle, 6, 18, 40));
  t.NORMAL.threatRadius = Math.round(jitter(t.NORMAL.threatRadius, 8, 60, 100));
  t.NORMAL.threatFleeBias = Math.round(jitter(t.NORMAL.threatFleeBias, 6, 8, 24));

  t.DEALER.minRange = Math.round(jitter(t.DEALER.minRange, s, 210, 270));
  t.DEALER.maxRange = Math.round(jitter(t.DEALER.maxRange, s, 310, 380));
  t.DEALER.strafeAngle = Math.round(jitter(t.DEALER.strafeAngle, 6, 20, 42));
  t.DEALER.threatRadius = Math.round(jitter(t.DEALER.threatRadius, 8, 60, 100));
  t.DEALER.threatFleeBias = Math.round(jitter(t.DEALER.threatFleeBias, 6, 8, 22));

  t.leadCap = Math.round(jitter(t.leadCap, 2, 8, 16));
  t.leadWeight = +(Math.max(0.85, Math.min(1.15, t.leadWeight + (Math.random()*0.2 - 0.1)))).toFixed(2);
  t.aimJitter = +clamp(t.aimJitter + (Math.random()*0.08 - 0.04), 0.12, 0.32).toFixed(2);
  t.allySep = Math.round(jitter(t.allySep, 6, 50, 80));
  t.edgeMargin = Math.round(jitter(t.edgeMargin, 6, 36, 66));

  // small chance to tweak composition
  if (Math.random() < 0.25) {
    const pools = [
      ['TANKER','TANKER','NORMAL','DEALER','DEALER','DEALER'],
      ['TANKER','TANKER','DEALER','DEALER','DEALER','NORMAL'],
      ['TANKER','NORMAL','DEALER','DEALER','DEALER','DEALER'],
      ['TANKER','DEALER','DEALER','NORMAL','DEALER','TANKER'],
      ['TANKER','TANKER','NORMAL','NORMAL','DEALER','DEALER'],
    ];
    base.comp = base.comp || {};
    base.comp.types = pools[Math.floor(Math.random()*pools.length)];
  }

  base.key = (base.key || 'mut') + '-' + Math.random().toString(36).slice(2, 7);
  return base;
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

function aggregateAgainstOpponents(teamPath, opponents, tag, repeat=120, seed=5000, concurrency=8) {
  let wins = 0, losses = 0, draws = 0, totalMatches = 0;
  const perOpp = [];
  for (const opp of opponents) {
    const json1 = path.join(WORK_DIR, `tmp_${tag}_vs_${path.basename(opp).replace(/\.[^/.]+$/, '')}.json`);
    const agg1 = runBatch(teamPath, opp, json1, repeat, seed, concurrency);
    wins += agg1.redWins; losses += agg1.blueWins; draws += agg1.draws; totalMatches += agg1.matches;
    perOpp.push({ side: 'red', opp: path.relative(RESULT_DIR, opp), agg: agg1 });

    const json2 = path.join(WORK_DIR, `tmp_${tag}_rev_${path.basename(opp).replace(/\.[^/.]+$/, '')}.json`);
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

  // 1) Candidate style portfolio
  const styles = [
    { key: 'balanced-v3', comp: {}, tune: {} },
    { key: 'agg-short+', comp: { types: ['TANKER','TANKER','NORMAL','DEALER','DEALER','DEALER'] }, tune: { TANKER:{minRange:148,maxRange:238,strafeAngle:28,threatRadius:80}, NORMAL:{minRange:168,maxRange:258,strafeAngle:28}, DEALER:{minRange:212,maxRange:318,strafeAngle:34}, aimJitter:0.20, leadCap:13 } },
    { key: 'kite-long+', comp: { types: ['TANKER','NORMAL','DEALER','DEALER','DEALER','DEALER'] }, tune: { NORMAL:{minRange:208,maxRange:328,strafeAngle:32}, DEALER:{minRange:248,maxRange:370,strafeAngle:36}, TANKER:{minRange:170,maxRange:260}, aimJitter:0.18 } },
    { key: 'double-front+', comp: { types: ['TANKER','TANKER','DEALER','DEALER','NORMAL','DEALER'] }, tune: { TANKER:{minRange:162,maxRange:252,strafeAngle:24}, NORMAL:{minRange:190,maxRange:300}, DEALER:{minRange:228,maxRange:338}, leadWeight:1.05 } },
    { key: 'anti-kite+', comp: { types: ['TANKER','TANKER','NORMAL','NORMAL','DEALER','DEALER'] }, tune: { NORMAL:{minRange:168,maxRange:258,strafeAngle:26}, DEALER:{minRange:212,maxRange:312,strafeAngle:32}, TANKER:{minRange:148,maxRange:238,strafeAngle:26}, leadWeight:0.95 } },
    { key: 'edge-safe+', comp: {}, tune: { edgeMargin: 54, allySep: 66, NORMAL:{minRange:195,maxRange:305}, DEALER:{minRange:235,maxRange:350} } },
    { key: 'tight-strafe+', comp: {}, tune: { NORMAL:{strafeAngle:26}, DEALER:{strafeAngle:30}, TANKER:{strafeAngle:24}, aimJitter:0.21, leadCap:11 } },
  ];

  const portfolio = [];
  for (let i = 0; i < styles.length; i++) {
    const params = makeParams(styles[i]);
    const candPath = path.join(WORK_DIR, `candidate_port_${i+1}.js`);
    writeTeam(candPath, params);
    const agg = aggregateAgainstOpponents(candPath, opponents, `p${i+1}`, 80, 777, 8);
    portfolio.push({ key: styles[i].key, path: candPath, ...agg, style: styles[i] });
    console.log(`[portfolio] ${styles[i].key} -> winRate=${(agg.winRate*100).toFixed(1)} minOpp=${(agg.minOppRate*100).toFixed(1)}`);
  }
  portfolio.sort((a,b)=> (b.minOppRate - a.minOppRate) || (b.winRate - a.winRate));
  let best = portfolio[0];

  // 2) Random local search around the best two styles
  const seeds = portfolio.slice(0, 2).map(p => p.style);
  const searchRounds = 10; // iterations (reduced for runtime)
  const variantsPerRound = 3;
  const quickRepeat = 60; // faster eval per side
  for (let r = 0; r < searchRounds; r++) {
    for (let s = 0; s < seeds.length; s++) {
      for (let v = 0; v < variantsPerRound; v++) {
        const mut = mutateStyle(seeds[s]);
        const params = makeParams(mut);
        const tag = `r${r+1}_s${s+1}_v${v+1}`;
        const pth = path.join(WORK_DIR, `candidate_${tag}.js`);
        writeTeam(pth, params);
        const agg = aggregateAgainstOpponents(pth, opponents, tag, quickRepeat, 9000 + r*97 + v*13, 8);
        if ((agg.minOppRate > best.minOppRate + 1e-9) || (agg.minOppRate === best.minOppRate && agg.winRate > best.winRate)) {
          best = { key: mut.key, path: pth, ...agg, style: mut };
          console.log(`[improve@${tag}] minOpp=${(agg.minOppRate*100).toFixed(1)} winRate=${(agg.winRate*100).toFixed(1)}`);
        }
      }
    }
  }

  // 3) Final robust evaluation with higher repeats
  const finalPath = best.path;
  const finalAgg = aggregateAgainstOpponents(finalPath, opponents, 'final', 120, 12345, 8);
  const final = { ...best, ...finalAgg };

  // 4) Save best to nested result directory: result/<workdir>/<workdir>.txt
  const outBase = path.basename(WORK_DIR);
  const outDir = path.join(RESULT_DIR, outBase);
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, `${outBase}.txt`);
  const bestCode = fs.readFileSync(final.path, 'utf8');
  fs.writeFileSync(outPath, bestCode);

  // 5) RESULT.md summary
  const oppList = listOpponents().map((p)=>path.relative(RESULT_DIR, p));
  let md = `# Tuning Result - ${outBase}\n\n`;
  md += `Import: result/${outBase}/${outBase}.txt\n\n`;
  md += `Opponents: ${oppList.join(', ')}\n\n`;
  md += `Best Candidate: ${final.key}\n`;
  md += `Aggregate: winRate=${(final.winRate*100).toFixed(1)}% minOpp=${(final.minOppRate*100).toFixed(1)}% (W:${final.wins} L:${final.losses} D:${final.draws} / M:${final.totalMatches})\n\n`;
  for (let i = 0; i < final.perOpp.length; i += 2) {
    const vs = final.perOpp[i];
    const rv = final.perOpp[i+1];
    const a1 = vs.agg, a2 = rv.agg;
    const oppKey = vs.opp;
    const winsAgg = (a1.redWins||0) + (a2.blueWins||0);
    const matchesAgg = (a1.matches||0) + (a2.matches||0);
    const combRate = matchesAgg>0? winsAgg/matchesAgg : 0;
    const wrRed = (a1.redWins/a1.matches);
    const wrBlue = (a2.blueWins/a2.matches);
    md += `## vs ${oppKey}\n`;
    md += `- as red: wr=${(wrRed*100).toFixed(1)}% (R:${a1.redWins} B:${a1.blueWins} D:${a1.draws})\n`;
    md += `- as blue: wr=${(wrBlue*100).toFixed(1)}% (R:${a2.redWins} B:${a2.blueWins} D:${a2.draws})\n`;
    md += `- combined: wr=${(combRate*100).toFixed(1)}%\n\n`;
  }
  md += `\nSaved best team to result/${outBase}/${outBase}.txt\n`;
  fs.writeFileSync(path.join(WORK_DIR, 'RESULT.md'), md);

  console.log(`Best candidate -> ${outPath}`);
}

if (require.main === module) {
  main();
}
