#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { runMatch } from './engine.js';
import { loadBot } from './loader.js';

const seed = (process.argv.includes('--seed')? process.argv[process.argv.indexOf('--seed')+1] : '42');
const rounds = parseInt(process.argv.includes('--rounds')? process.argv[process.argv.indexOf('--rounds')+1] : '5');
const repeat = parseInt(process.argv.includes('--repeat')? process.argv[process.argv.indexOf('--repeat')+1] : '1');
const doCheck = process.argv.includes('--check');

const tanksDir = path.resolve('../..', 'tanks');
const files = ['01_tanker_guardian.js','02_dealer_sniper.js','03_dealer_flanker.js','04_normal_interceptor.js','05_normal_support.js','06_tanker_bruiser.js'];
const bots = files.map(f=>({key:f.replace(/\.js$/,''), path: path.join(tanksDir, f), bot: loadBot(path.join(tanksDir, f))}));

const resultsDir = path.resolve(path.dirname(new URL(import.meta.url).pathname), './results');
fs.mkdirSync(resultsDir,{recursive:true});
const csvPath = path.join(resultsDir, 'summary.csv');
fs.writeFileSync(csvPath, 'pair,winA,winB,avgAliveDiff,avgTime\n');

const summary = [];
for(let i=0;i<bots.length;i++){
  for(let j=i+1;j<bots.length;j++){
    const A=bots[i], B=bots[j];
    let winA=0, winB=0, timeSum=0, aliveDiffSum=0;
    for(let r=0;r<rounds*repeat;r++){
      const res = runMatch([A.bot],[B.bot],{seed: `${seed}:${A.key}vs${B.key}:${r}`});
      if (res.winner==='A') winA++; else if (res.winner==='B') winB++;
      timeSum += res.time; aliveDiffSum += (res.aliveA - res.aliveB);
    }
    const avgTime = timeSum/(rounds*repeat);
    const avgAliveDiff = aliveDiffSum/(rounds*repeat);
    summary.push({pair:`${A.key} vs ${B.key}`, winA, winB, avgAliveDiff, avgTime});
    fs.appendFileSync(csvPath, `${A.key} vs ${B.key},${winA},${winB},${avgAliveDiff.toFixed(3)},${avgTime.toFixed(3)}\n`);
  }
}

// 결정론 체크(옵션)
if (doCheck && summary.length>0){
  const firstPair = summary[0].pair.split(' vs ');
  const A = bots.find(b=>b.key===firstPair[0]);
  const B = bots.find(b=>b.key===firstPair[1]);
  const r1 = runMatch([A.bot],[B.bot],{seed:`${seed}:check:1`});
  const r2 = runMatch([A.bot],[B.bot],{seed:`${seed}:check:1`});
  console.log(`deterministic check: ${r1.winner===r2.winner && Math.abs(r1.time-r2.time)<1e-9 ? 'OK' : 'MISMATCH'}`);
}

const jsonPath = path.join(resultsDir,'summary.json');
fs.writeFileSync(jsonPath, JSON.stringify(summary,null,2));
console.log(`RR done. Pairs=${summary.length}. CSV/JSON saved.`);

