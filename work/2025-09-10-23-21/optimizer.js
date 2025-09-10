#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const os = require('os');
const { Worker } = require('worker_threads');
const { makeTeam } = require('./team_factory');

const ROOT = path.resolve(__dirname, '..', '..');
const SIM_DIR = path.join(ROOT, 'simulator');
const WORK_DIR = __dirname;

function listOpponents() {
  const resultDir = path.join(ROOT, 'result');
  const dirs = fs.readdirSync(resultDir).filter((d)=>d!== 'result');
  const entries = [];
  for (const d of dirs) {
    const full = path.join(resultDir, d);
    try {
      const stat = fs.statSync(full);
      if (!stat.isDirectory()) continue;
      const files = fs.readdirSync(full).filter((f)=>f.endsWith('.txt'));
      if (files.length === 0) continue;
      entries.push({ name: d, path: path.join(full, files[0]) });
    } catch (_) {}
  }
  return entries.sort((a,b)=>a.name.localeCompare(b.name));
}

function readText(p) { return fs.readFileSync(p, 'utf8'); }

async function runBatch(redCode, blueCode, seeds, opts={}){
  const workerPath = path.join(SIM_DIR, 'worker.js');
  const concurrency = Math.min(os.cpus().length, seeds.length, opts.concurrency || os.cpus().length);
  const chunks = Array.from({length:concurrency},()=>[]);
  for(let i=0;i<seeds.length;i++) chunks[i%concurrency].push(seeds[i]);
  const tasks = chunks.filter(c=>c.length>0).map((seedChunk)=>new Promise((resolve,reject)=>{
    const w = new Worker(workerPath, { workerData: {
      redCode, blueCode, runnerMode: 'secure', seeds: seedChunk, maxTicks: opts.maxTicks||4000, fast: true,
    }});
    w.on('message', (arr)=> resolve(arr));
    w.on('error', reject);
    w.on('exit', (code)=>{ if(code!==0) reject(new Error('Worker exit '+code)); });
  }));
  const batches = await Promise.all(tasks);
  return batches.flat();
}

function summarize(results){
  let red=0, blue=0, draw=0, rE=0, bE=0;
  for(const r of results){
    if(r.winner==='red') red++; else if(r.winner==='blue') blue++; else draw++;
    rE += r.redEnergy; bE += r.blueEnergy;
  }
  const n = results.length;
  return { red, blue, draw, n, redRate: red/n, blueRate: blue/n, avgRedE: rE/n, avgBlueE: bE/n };
}

async function duel(codeA, codeB, baseSeed=1234, repeat=24){
  const seeds = Array.from({length:repeat},(_,i)=> baseSeed + i);
  const r1 = await runBatch(codeA, codeB, seeds);
  const r2 = await runBatch(codeB, codeA, seeds);
  const s1 = summarize(r1);
  const s2 = summarize(r2);
  // red is codeA in r1; blue is codeA in r2 -> combine to overall rate for codeA
  const wins = s1.red + s2.blue;
  const total = s1.n + s2.n;
  return { wins, total, rate: wins/total, s1, s2 };
}

function mkParamsWithPerturb(base, scale){
  function jitter(v, pct){
    if (typeof v !== 'number') return v;
    const f = 1 + (Math.random()*2-1) * pct;
    return v * f;
  }
  return base.map((r)=>({
    name: r.name,
    tankType: r.tankType,
    P: Object.fromEntries(Object.entries(r.P).map(([k,v])=> [k, jitter(v, scale[k]||0.08)]) )
  }));
}

async function main(){
  const opponents = listOpponents();
  const sample = opponents.slice(0, 12); // sample set for tuning
  const baseParams = [
    { name: 'Bulwark-L', tankType: 'Type.TANKER', P: { leadCap:16,leadWeight:1.00,aimJitter:0.10,fireBias:0,minRange:170,maxRange:300,strafeAngle:24,threatRadius:175,threatTime:30,threatTight:110,threatFleeBias:12,allySep:62,edgeMargin:46,bias:-10,sidePref:-8,targetHealthWeight:1.25,targetDistWeight:0.10,finishHp:24,finishRemain:3,finishMinDelta:30,finishMaxDelta:24,velEma:0.55 }},
    { name: 'Bulwark-R', tankType: 'Type.TANKER', P: { leadCap:16,leadWeight:1.00,aimJitter:0.10,fireBias:0,minRange:170,maxRange:300,strafeAngle:24,threatRadius:175,threatTime:30,threatTight:110,threatFleeBias:12,allySep:62,edgeMargin:46,bias:10,sidePref:8,targetHealthWeight:1.25,targetDistWeight:0.10,finishHp:24,finishRemain:3,finishMinDelta:30,finishMaxDelta:24,velEma:0.55 }},
    { name: 'Striker-1', tankType: 'Type.DEALER', P: { leadCap:18,leadWeight:1.02,aimJitter:0.07,fireBias:0,minRange:250,maxRange:420,strafeAngle:36,threatRadius:165,threatTime:26,threatTight:105,threatFleeBias:15,allySep:62,edgeMargin:46,bias:-6,sidePref:8,targetHealthWeight:1.4,targetDistWeight:0.08,finishHp:22,finishRemain:3,finishMinDelta:28,finishMaxDelta:22,velEma:0.50 }},
    { name: 'Striker-2', tankType: 'Type.DEALER', P: { leadCap:18,leadWeight:1.02,aimJitter:0.07,fireBias:0,minRange:250,maxRange:420,strafeAngle:36,threatRadius:165,threatTime:26,threatTight:105,threatFleeBias:15,allySep:62,edgeMargin:46,bias:6,sidePref:-8,targetHealthWeight:1.4,targetDistWeight:0.08,finishHp:22,finishRemain:3,finishMinDelta:28,finishMaxDelta:22,velEma:0.50 }},
    { name: 'Striker-3', tankType: 'Type.DEALER', P: { leadCap:18,leadWeight:1.02,aimJitter:0.07,fireBias:0,minRange:250,maxRange:420,strafeAngle:36,threatRadius:165,threatTime:26,threatTight:105,threatFleeBias:15,allySep:62,edgeMargin:46,bias:-2,sidePref:8,targetHealthWeight:1.4,targetDistWeight:0.08,finishHp:22,finishRemain:3,finishMinDelta:28,finishMaxDelta:22,velEma:0.50 }},
    { name: 'Anchor', tankType: 'Type.NORMAL', P: { leadCap:16,leadWeight:1.00,aimJitter:0.10,fireBias:0,minRange:220,maxRange:350,strafeAngle:30,threatRadius:168,threatTime:30,threatTight:110,threatFleeBias:13,allySep:62,edgeMargin:46,bias:4,sidePref:8,targetHealthWeight:1.32,targetDistWeight:0.10,finishHp:24,finishRemain:3,finishMinDelta:28,finishMaxDelta:22,velEma:0.55 }},
  ];
  const scale = { leadCap:0.0, leadWeight:0.04, aimJitter:0.4, minRange:0.15, maxRange:0.12, strafeAngle:0.25, threatRadius:0.12, threatTime:0.20, threatTight:0.20, threatFleeBias:0.25, allySep:0.10, edgeMargin:0.0, bias:0.8, sidePref:0.8, targetHealthWeight:0.15, targetDistWeight:0.15, finishHp:0.25, finishRemain:0.0, finishMinDelta:0.25, finishMaxDelta:0.25, velEma:0.15 };

  let bestParams = baseParams;
  let bestScore = -1;
  const baseCode = makeTeam(bestParams);
  // Evaluate base vs sample
  let totalRate = 0; let oppCount = 0;
  for (const o of sample){
    const opp = readText(o.path);
    const r = await duel(baseCode, opp, 20240000, 12); // 24x2 matches total per opponent
    totalRate += r.rate; oppCount++;
  }
  bestScore = totalRate/oppCount;
  console.log('Base avg rate vs sample:', bestScore.toFixed(3));

  // Random search iterations
  for (let iter=0; iter<6; iter++){
    const cand = mkParamsWithPerturb(bestParams, scale);
    const code = makeTeam(cand);
    let sum = 0; let n=0;
    for(const o of sample){
      const opp = readText(o.path);
      const r = await duel(code, opp, 20240000 + iter*1000, 10);
      sum += r.rate; n++;
    }
    const avg = sum/n;
    console.log(`Iter ${iter}: avg ${avg.toFixed(3)} (best ${bestScore.toFixed(3)})`);
    if (avg > bestScore) { bestScore = avg; bestParams = cand; }
  }

  // Finalize best code
  const finalCode = makeTeam(bestParams);

  // Evaluate against all opponents
  const allOpp = opponents;
  const perOpp = [];
  for(const o of allOpp){
    const opp = readText(o.path);
    const r = await duel(finalCode, opp, 42420000, 12);
    perOpp.push({ name:o.name, rate:+r.rate.toFixed(4), wins:r.wins, total:r.total });
  }
  perOpp.sort((a,b)=> b.rate - a.rate);
  const overallWins = perOpp.reduce((s,x)=>s+x.wins,0);
  const overallTotal = perOpp.reduce((s,x)=>s+x.total,0);
  const overallRate = overallWins/overallTotal;

  // Save outputs
  const ts = path.basename(WORK_DIR);
  const resDir = path.join(ROOT, 'result', ts);
  fs.mkdirSync(resDir, { recursive: true });
  const outFile = path.join(resDir, `${ts}.txt`);
  fs.writeFileSync(outFile, finalCode);

  const summary = {
    timestamp: ts,
    opponents: perOpp,
    overall: { wins: overallWins, total: overallTotal, rate: +overallRate.toFixed(4) },
    notes: 'Evaluated with 24 matches per opponent (12 seeds as red + 12 seeds as blue). Engine fast=true, maxTicks=4000.'
  };
  const sumPath = path.join(resDir, `summary_${ts}.json`);
  fs.writeFileSync(sumPath, JSON.stringify(summary, null, 2));

  // RESULT.md in work dir
  const lines = [];
  lines.push(`# Result ${ts}`);
  lines.push('');
  lines.push('- Reference: .agent/SIMULATOR.md');
  lines.push('- Evaluated vs existing result opponents.');
  lines.push('');
  lines.push(`Overall win rate: ${(overallRate*100).toFixed(2)}% (${overallWins}/${overallTotal})`);
  lines.push('');
  lines.push('Top 10 opponents by win rate:');
  for (const x of perOpp.slice(0,10)) lines.push(`- ${x.name}: ${(x.rate*100).toFixed(1)}% (${x.wins}/${x.total})`);
  lines.push('');
  lines.push('Bottom 10 opponents by win rate:');
  for (const x of perOpp.slice(-10)) lines.push(`- ${x.name}: ${(x.rate*100).toFixed(1)}% (${x.wins}/${x.total})`);
  fs.writeFileSync(path.join(WORK_DIR, 'RESULT.md'), lines.join('\n'));

  console.log('Saved team ->', outFile);
  console.log('Saved summary ->', sumPath);
  console.log('Saved RESULT.md');
}

if (require.main === module) {
  main().catch((e)=>{ console.error(e); process.exit(1); });
}

