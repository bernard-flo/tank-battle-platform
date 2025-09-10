#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const { buildTeam, saveTeam } = require('./builder');

const ROOT = path.resolve(path.join(__dirname, '..', '..'));
const RUNID = path.basename(path.resolve(__dirname));
const WKDIR = path.resolve(__dirname);
const RSDIR = path.join(ROOT, 'result', RUNID);

function sh(cmd, opts = {}) {
  return cp.execSync(cmd, { stdio: 'pipe', encoding: 'utf8', ...opts });
}

function listOpponents(maxCount = 6) {
  const resultDir = path.join(ROOT, 'result');
  const entries = [];
  for (const d of fs.readdirSync(resultDir)) {
    const p = path.join(resultDir, d);
    if (fs.statSync(p).isFile() && d.endsWith('.txt')) {
      if (d.startsWith(RUNID)) continue;
      entries.push(p);
    } else if (fs.statSync(p).isDirectory()) {
      if (d === RUNID) continue; // exclude our own current run dir
      const f = path.join(p, `${d}.txt`);
      if (fs.existsSync(f)) entries.push(f);
    }
  }
  // sort by mtime desc
  entries.sort((a,b)=>fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
  // unique by filename
  const seen = new Set();
  const out = [];
  for (const p of entries) {
    const key = path.basename(p);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(p);
    if (out.length >= maxCount) break;
  }
  return out;
}

function defaultParams() {
  return {
    leadCap: 14,
    leadWeight: 1.0,
    aimJitter: 0.18,
    velSmooth: 0.60,
    minRange: 150,
    maxRange: 260,
    strafeAngle: 28,
    strafeSpread: 18,
    approachSpread: 16,
    escapeSpread: 22,
    threatRadius: 165,
    threatFleeBias: 14,
    allySep: 62,
    edgeMargin: 44,
    bias: 10,
    targetHealthWeight: 1.25,
    targetDistWeight: 0.11,
    finishHp: 24,
    finishRemain: 3,
    finishMinDelta: 32,
    finishMaxDelta: 24,
  };
}

function randomize(p, scale = 1.0) {
  function jitter(v, r) { return v + (Math.random()*2-1)*r*scale; }
  return {
    leadCap: clampInt(jitter(p.leadCap, 3), 6, 20),
    leadWeight: clamp(jitter(p.leadWeight, 0.12), 0.7, 1.1),
    aimJitter: clamp(jitter(p.aimJitter, 0.08), 0, 0.5),
    velSmooth: clamp(jitter(p.velSmooth, 0.2), 0, 0.95),
    minRange: clampInt(jitter(p.minRange, 40), 90, 240),
    maxRange: clampInt(jitter(p.maxRange, 40), 180, 320),
    strafeAngle: clampInt(jitter(p.strafeAngle, 12), 8, 50),
    strafeSpread: clampInt(jitter(p.strafeSpread, 10), 6, 36),
    approachSpread: clampInt(jitter(p.approachSpread, 10), 6, 36),
    escapeSpread: clampInt(jitter(p.escapeSpread, 12), 8, 40),
    threatRadius: clampInt(jitter(p.threatRadius, 20), 100, 220),
    threatFleeBias: clampInt(jitter(p.threatFleeBias, 8), 6, 28),
    allySep: clampInt(jitter(p.allySep, 12), 40, 110),
    edgeMargin: clampInt(jitter(p.edgeMargin, 10), 24, 80),
    bias: clampInt(jitter(p.bias, 8), -30, 30),
    targetHealthWeight: clamp(jitter(p.targetHealthWeight, 0.4), 0.6, 2.0),
    targetDistWeight: clamp(jitter(p.targetDistWeight, 0.06), 0.02, 0.3),
    finishHp: clampInt(jitter(p.finishHp, 8), 12, 40),
    finishRemain: clampInt(jitter(p.finishRemain, 1.6), 1, 5),
    finishMinDelta: clampInt(jitter(p.finishMinDelta, 10), 10, 60),
    finishMaxDelta: clampInt(jitter(p.finishMaxDelta, 10), 8, 60),
  };
}

function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }
function clampInt(v, lo, hi) { return Math.round(clamp(v, lo, hi)); }

function evaluate(teamFile, oppFile, opts) {
  const seed = opts.seed ?? 251052;
  const repeat = opts.repeat ?? 30;
  const conc = opts.concurrency ?? 8;
  const fast = opts.fast ?? true;
  const cli = path.join(ROOT, 'simulator', 'cli.js');

  // Our team as red
  const out1 = path.join(WKDIR, `tmp_${path.basename(teamFile, path.extname(teamFile))}_vs_${path.basename(oppFile, '.txt')}_R.json`);
  sh(`node ${cli} --red ${teamFile} --blue ${oppFile} --repeat ${repeat} --seed ${seed} ${fast?'--fast':''} --concurrency ${conc} --json ${out1}`);
  const r1 = JSON.parse(fs.readFileSync(out1, 'utf8'));

  // Our team as blue
  const out2 = path.join(WKDIR, `tmp_${path.basename(teamFile, path.extname(teamFile))}_vs_${path.basename(oppFile, '.txt')}_B.json`);
  sh(`node ${cli} --red ${oppFile} --blue ${teamFile} --repeat ${repeat} --seed ${seed} ${fast?'--fast':''} --concurrency ${conc} --json ${out2}`);
  const r2 = JSON.parse(fs.readFileSync(out2, 'utf8'));

  // Aggregate score: our wins across both sides
  const redWins = r1.aggregate.redWins;
  const blueWins = r2.aggregate.blueWins; // when we are blue
  const draws = r1.aggregate.draws + r2.aggregate.draws;
  const total = r1.aggregate.matches + r2.aggregate.matches;
  return { redWins, blueWins, draws, total, winRate: (redWins + blueWins) / total };
}

function run() {
  const opps = listOpponents(6);
  if (opps.length === 0) {
    console.error('No opponents found in result/');
    process.exit(1);
  }
  console.log('Opponents:', opps.map(p=>path.basename(path.dirname(p)) || path.basename(p)).join(', '));

  const base = defaultParams();
  const candidates = [base];
  for (let i=0;i<8;i++) candidates.push(randomize(base, 1.0));

  let best = null;
  let bestScore = -1;
  let bestParams = null;

  for (let i=0;i<candidates.length;i++) {
    const p = candidates[i];
    const code = buildTeam(p, 'Helios');
    const tf = path.join(WKDIR, `cand_${i}.js`);
    saveTeam(tf, code);
    let sum = 0; let totalPairs=0; const details=[];
    for (const opp of opps) {
      const { winRate, total } = evaluate(tf, opp, { repeat: 25, concurrency: 8, fast: true });
      sum += winRate; totalPairs += 1; details.push({ opp: path.basename(opp), winRate, matches: total });
      console.log(`[cand ${i}] vs ${path.basename(opp)} => winRate=${(winRate*100).toFixed(1)}%`);
    }
    const score = sum / totalPairs;
    if (score > bestScore) { bestScore = score; best = { file: tf, details }; bestParams = p; }
    console.log(`Candidate ${i} avg winRate = ${(score*100).toFixed(2)}%`);
  }

  // Local refinement around best
  for (let i=0;i<5;i++) {
    const p = randomize(bestParams, 0.6);
    const code = buildTeam(p, 'Helios');
    const tf = path.join(WKDIR, `refine_${i}.js`);
    saveTeam(tf, code);
    let sum = 0; let totalPairs=0; const details=[];
    for (const opp of opps) {
      const { winRate, total } = evaluate(tf, opp, { repeat: 25, concurrency: 8, fast: true });
      sum += winRate; totalPairs += 1; details.push({ opp: path.basename(opp), winRate, matches: total });
      console.log(`[ref ${i}] vs ${path.basename(opp)} => winRate=${(winRate*100).toFixed(1)}%`);
    }
    const score = sum / totalPairs;
    if (score > bestScore) { bestScore = score; best = { file: tf, details }; bestParams = p; }
    console.log(`Refined ${i} avg winRate = ${(score*100).toFixed(2)}%`);
  }

  // Identify toughest opponents (lowest winRate) and focus fine-tuning
  best.details.sort((a,b)=>a.winRate-b.winRate);
  const hard = best.details.slice(0, Math.min(3, best.details.length)).map(d=>d.opp);
  console.log('Hardest opponents:', hard.join(', '));
  function evaluateFocused(tf) {
    let sum=0, n=0; const list=[];
    for (const oppBase of hard) {
      const opp = opps.find(p=>path.basename(p)===oppBase);
      if (!opp) continue;
      const { winRate, total } = evaluate(tf, opp, { repeat: 30, concurrency: 8, fast: true });
      sum += winRate; n++; list.push({ opp: oppBase, winRate, matches: total });
    }
    return { score: n?sum/n:0, list };
  }
  let focusedBest = { params: bestParams, score: -1, file: best.file };
  for (let i=0;i<12;i++) {
    const p = randomize(bestParams, 0.4);
    const code = buildTeam(p, 'Helios');
    const tf = path.join(WKDIR, `focus_${i}.js`);
    saveTeam(tf, code);
    const { score } = evaluateFocused(tf);
    if (score > focusedBest.score) { focusedBest = { params: p, score, file: tf }; }
    console.log(`[focus ${i}] score=${(score*100).toFixed(1)}%`);
  }
  if (focusedBest.score > 0) {
    // Evaluate the focused-best against all opponents to see overall performance
    let sum=0; let totalPairs=0; const details=[];
    for (const opp of opps) {
      const { winRate, total } = evaluate(focusedBest.file, opp, { repeat: 25, concurrency: 8, fast: true });
      sum += winRate; totalPairs += 1; details.push({ opp: path.basename(opp), winRate, matches: total });
    }
    const score = sum / totalPairs;
    if (score > bestScore) { bestScore = score; best = { file: focusedBest.file, details }; bestParams = focusedBest.params; }
    console.log(`Focused best avg winRate = ${(score*100).toFixed(2)}%`);
  }

  // Save final team code to result dir
  const finalCode = buildTeam(bestParams, 'Helios');
  const outPath = path.join(RSDIR, `${RUNID}.txt`);
  fs.writeFileSync(outPath, finalCode, 'utf8');
  console.log(`Saved final team -> ${outPath}`);

  // Write RESULT.md with comparison summary
  let md = `# Result ${RUNID}\n\n`;
  md += `Average win rate vs recent opponents: ${(bestScore*100).toFixed(2)}%\\n\n`;
  md += `## Opponent Breakdown\\n`;
  for (const d of best.details) {
    md += `- ${d.opp}: ${(d.winRate*100).toFixed(1)}% over ${d.matches} games\\n`;
  }
  fs.writeFileSync(path.join(WKDIR, 'RESULT.md'), md, 'utf8');

  // Also drop a copy of the chosen params for reproducibility
  fs.writeFileSync(path.join(WKDIR, 'params.json'), JSON.stringify(bestParams, null, 2));
}

run();
