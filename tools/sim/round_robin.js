import fs from 'fs';
import path from 'path';
import minimist from 'minimist';
import { runMatch, ensureDirs } from './engine.js';

const argv = minimist(process.argv.slice(2));
const seed = argv.seed ?? 42; const rounds = argv.rounds ?? 5; const repeat = argv.repeat ?? 1; const check = argv.check === true || argv.check === 'true';
const outDir = ensureDirs();

// 6개 탱크 대상
const here = path.dirname(new URL(import.meta.url).pathname);
const root = path.resolve(path.join(here, '..', '..', 'tanks'));
const bots = [
  '01_tanker_guardian.js','02_dealer_sniper.js','03_dealer_flanker.js',
  '04_normal_interceptor.js','05_normal_support.js','06_tanker_bruiser.js'
].map(f=>path.join(root,f));

const pairs = [];
for(let i=0;i<bots.length;i++) for(let j=i+1;j<bots.length;j++) pairs.push([bots[i], bots[j]]);

const summary = [];
for(const [a,b] of pairs){
  let all=[]; for(let k=0;k<repeat;k++){ all = all.concat(runMatch({aPath:a,bPath:b,seed:seed+k,rounds:rounds})); }
  const winA=all.filter(r=>r.winA).length, winB=all.filter(r=>r.winB).length;
  const avgTime = +(all.reduce((s,r)=>s+r.time,0)/all.length).toFixed(3);
  const avgAliveDiff = +((all.reduce((s,r)=>s+(r.aliveA-r.aliveB),0)/all.length).toFixed(3));
  summary.push({pair: `${path.basename(a)}-${path.basename(b)}`, winA, winB, avgAliveDiff, avgTime});
}

// 저장
fs.writeFileSync(path.join(outDir,'summary.json'), JSON.stringify({ seed, rounds, repeat, summary }, null, 2));
const csvHdr = 'pair,winA,winB,avgAliveDiff,avgTime';
const csv = [csvHdr].concat(summary.map(s=>`${s.pair},${s.winA},${s.winB},${s.avgAliveDiff},${s.avgTime}`)).join('\n');
fs.writeFileSync(path.join(outDir,'summary.csv'), csv);

if(check){
  // 결정적성 체크: 첫 페어 2회 반복 동일성
  const [a,b]=pairs[0];
  const r1 = runMatch({aPath:a,bPath:b,seed,rounds});
  const r2 = runMatch({aPath:a,bPath:b,seed,rounds});
  const same = JSON.stringify(r1)===JSON.stringify(r2);
  console.log(`Deterministic check: ${same?'OK':'MISMATCH'}`);
}

console.log(`RR done: ${pairs.length} pairs -> summary.csv/json saved`);
