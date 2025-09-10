#!/usr/bin/env node
/*
 Tuning and evaluation script.
 - Discovers competitor team files in result/*/*.txt (excluding our timestamp).
 - Generates candidate Helios parameter sets (randomized around defaults).
 - Evaluates candidates vs sampled competitors via simulator/cli.js in batch mode.
 - Selects best params, re-evaluates broadly, writes final team to result/<TS>/<TS>.txt
 - Saves comparison summary to RESULT.md in the working directory.
*/

const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const os = require('os');
const { defaultParams, generateTeam } = require('./generate_team');

const ROOT = path.resolve(path.join(__dirname, '..', '..'));
const SIM = path.join(ROOT, 'simulator', 'cli.js');
const RESULT_DIR = path.join(ROOT, 'result');
const WD = __dirname;
const TS = path.basename(WD);
const OUT_DIR = path.join(RESULT_DIR, TS);

function sh(cmd, opts={}) {
  return cp.execSync(cmd, { stdio: 'pipe', encoding: 'utf8', ...opts });
}

function listCompetitors(limitSample=12) {
  const entries = [];
  const dirs = fs.readdirSync(RESULT_DIR).filter(d => /\d{4}-\d{2}-\d{2}-\d{2}-\d{2}/.test(d));
  for (const d of dirs) {
    if (d === TS) continue; // exclude our working dir
    const dirPath = path.join(RESULT_DIR, d);
    if (!fs.statSync(dirPath).isDirectory()) continue;
    const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.txt'));
    for (const f of files) {
      const p = path.join(dirPath, f);
      const st = fs.statSync(p);
      entries.push({ path: p, mtime: st.mtimeMs, size: st.size });
    }
  }
  // Prefer newer and larger files (likely better bots)
  entries.sort((a,b)=> b.mtime - a.mtime || b.size - a.size);
  // Deduplicate by basename of directory to avoid huge number
  const picks = entries.slice(0, Math.max(4, Math.min(limitSample, entries.length)));
  return picks.map(e => e.path);
}

function jitter(x, pct) {
  const f = 1 + (Math.random()*2 - 1) * pct;
  return Array.isArray(x) ? x.map(v => Math.round(v*f)) : +(x * f).toFixed(3);
}

function makeCandidate(i, base) {
  // Randomize around base with small perturbations; bigger for distances/strafe
  const scale = (k, s) => jitter(base[k], s);
  const mk = (obj) => ({
    rMin: scale('rMin', 0.10), rMax: scale('rMax', 0.10),
    strafe: scale('strafe', 0.20), threatR: scale('threatR', 0.10), threatH: scale('threatH', 0.08),
    fleeBias: scale('fleeBias', 0.20), sep: scale('sep', 0.10), edge: scale('edge', 0.10),
    leadCap: scale('leadCap', 0.10), leadW: scale('leadW', 0.06), aimJ: scale('aimJ', 0.10),
    healthW: scale('healthW', 0.06), distW: scale('distW', 0.08), finHP: scale('finHP', 0.12),
    aggrRemain: Math.max(2, Math.round(scale('aggrRemain', 0.0))), aggrIn: scale('aggrIn', 0.20), aggrOut: scale('aggrOut', 0.20),
    bias: 0, smooth: scale('smooth', 0.08), openTicks: Math.max(12, Math.round(scale('openTicks', 0.0))), sideFlip: 240,
    redBias: base.redBias, alignW: scale('alignW', 0.20)
  });
  return {
    tanker: mk(base.tanker),
    dealer: mk(base.dealer),
    normal: mk(base.normal),
    id: `cand${i}`,
  };
}

function runBatch(redFile, blueFile, repeat=60, concurrency=Math.max(2, Math.min(os.cpus().length, 8))) {
  const seed = Math.floor(Math.random()*1e9);
  const cmd = `node ${SIM} --red ${redFile} --blue ${blueFile} --repeat ${repeat} --seed ${seed} --fast --concurrency ${concurrency}`;
  const out = sh(cmd, { cwd: ROOT });
  const m = out.match(/Wins\s+- Red:\s+(\d+), Blue:\s+(\d+), Draws:\s+(\d+)/);
  if (!m) return { red:0, blue:0, draws:0 };
  return { red: +m[1], blue: +m[2], draws: +m[3] };
}

function evaluateCandidate(params, opponents, tmpDir) {
  const code = generateTeam(params);
  const tmpFile = path.join(tmpDir, `candidate_${Date.now()}_${Math.random().toString(36).slice(2)}.txt`);
  fs.writeFileSync(tmpFile, code);
  let wins=0, losses=0, draws=0;
  for (const opp of opponents) {
    const { red, blue, draws:dr } = runBatch(tmpFile, opp);
    wins += red; losses += blue; draws += dr;
  }
  fs.unlinkSync(tmpFile);
  const games = wins + losses + draws;
  const wr = games ? wins / Math.max(1, wins+losses) : 0;
  return { wins, losses, draws, wr };
}

function writeFinal(code, summary) {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
  const outFile = path.join(OUT_DIR, `${TS}.txt`);
  fs.writeFileSync(outFile, code);
  return outFile;
}

function main() {
  const opponents = listCompetitors(12);
  if (!opponents.length) {
    console.log('No competitor .txt files found under result/. Generating default team only.');
    const code = generateTeam(defaultParams());
    const out = writeFinal(code, null);
    console.log(`Wrote team -> ${out}`);
    return;
  }
  console.log('Sampled opponents:\n' + opponents.map(p=>` - ${path.relative(ROOT,p)}`).join('\n'));

  const base = defaultParams();
  const tmpDir = fs.mkdtempSync(path.join(WD, 'tmp_'));
  const trials = 8; // coarse search
  let best = { params: base, wr: -1, wins:0, losses:0, draws:0 };
  for (let i=0;i<trials;i++) {
    const cand = makeCandidate(i+1, base);
    const evalRes = evaluateCandidate(cand, opponents, tmpDir);
    console.log(`Trial ${i+1}/${trials}: WR=${(evalRes.wr*100).toFixed(1)}% (W:${evalRes.wins} L:${evalRes.losses} D:${evalRes.draws})`);
    if (evalRes.wr > best.wr) best = { params: cand, ...evalRes };
  }
  fs.rmSync(tmpDir, { recursive: true, force: true });

  // Re-evaluate best more thoroughly vs all discovered opponents (lower repeats per pair to bound time)
  const finalOpponents = listCompetitors(50);
  const code = generateTeam(best.params);
  const finalTmp = path.join(WD, `final_candidate.txt`);
  fs.writeFileSync(finalTmp, code);
  let agg = [];
  for (const opp of finalOpponents) {
    const res = runBatch(finalTmp, opp, 80, Math.max(2, Math.min(os.cpus().length, 8)));
    const wr = res.red / Math.max(1, res.red + res.blue);
    agg.push({ opp, ...res, wr });
  }
  fs.unlinkSync(finalTmp);

  // Write outputs
  const outFile = writeFinal(code, agg);

  // RESULT.md
  let md = `# Tank Battle AI Result (Helios)\n\n`;
  md += `Timestamp: ${TS}\n\n`;
  md += `Generated team: ${path.relative(ROOT, outFile)}\n\n`;
  md += `Opponents evaluated: ${agg.length}\n\n`;
  const overallWins = agg.reduce((a,x)=>a+x.red,0);
  const overallLoss = agg.reduce((a,x)=>a+x.blue,0);
  const overallDraw = agg.reduce((a,x)=>a+x.draws,0);
  const overallWR = overallWins/Math.max(1, overallWins+overallLoss);
  md += `Overall WR: ${(overallWR*100).toFixed(2)}%  (W:${overallWins} L:${overallLoss} D:${overallDraw})\n\n`;
  md += `## Per-Opponent Summary\n`;
  for (const r of agg) {
    md += `- ${path.relative(ROOT,r.opp)} -> WR ${(r.wr*100).toFixed(1)}%  (W:${r.red} L:${r.blue} D:${r.draws})\n`;
  }
  fs.writeFileSync(path.join(WD, 'RESULT.md'), md);

  console.log(`\nFinal team written to: ${outFile}`);
  console.log(`Summary saved to: ${path.join(WD,'RESULT.md')}`);
}

if (require.main === module) {
  main();
}

