import fs from 'fs';
import path from 'path';
import minimist from 'minimist';
import { runMatch } from './engine.js';
import { loadBot } from './loader.js';
const baseDir = path.dirname(new URL(import.meta.url).pathname);

function ensureDir(p){ if(!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true }); }
function pickLast(v, def){ return Array.isArray(v) ? (v.length? v[v.length-1] : def) : (v ?? def); }

const args = minimist(process.argv.slice(2));
const seed = Number(pickLast(args.seed, 42));
const rounds = Number(pickLast(args.rounds, 5));
const repeat = Number(pickLast(args.repeat, 3));
const check = String(pickLast(args.check, 'false')) === 'true';

const botFiles = [
  path.resolve('../../tanks/01_tanker_guardian.js'),
  path.resolve('../../tanks/02_dealer_sniper.js'),
  path.resolve('../../tanks/03_dealer_flanker.js'),
  path.resolve('../../tanks/04_normal_interceptor.js'),
  path.resolve('../../tanks/05_normal_support.js'),
  path.resolve('../../tanks/06_tanker_bruiser.js'),
];

const bots = botFiles.map(f=>loadBot(f, seed));

const pairs = [];
for (let i=0;i<bots.length;i++){
  for (let j=i+1;j<bots.length;j++){
    pairs.push([bots[i], bots[j]]);
  }
}

const outDir = path.join(baseDir, 'results'); ensureDir(outDir);

const summary = [];
for (const [A,B] of pairs){
  let winA=0, winB=0, aliveSum=0, timeSum=0, total=0;
  for (let k=0;k<repeat;k++){
    const res = runMatch({ botA:A, botB:B, seed: seed + k, rounds });
    winA += res.reduce((a,b)=>a+b.winA,0);
    winB += res.reduce((a,b)=>a+b.winB,0);
    aliveSum += res.reduce((a,b)=>a+b.aliveDiff,0) / res.length;
    timeSum += res.reduce((a,b)=>a+b.time,0) / res.length;
    total += 1;
  }
  const avgAliveDiff = Number((aliveSum/total).toFixed(3));
  const avgTime = Number((timeSum/total).toFixed(3));
  summary.push({ pair: `${A.name} vs ${B.name}`, winA, winB, avgAliveDiff, avgTime });
}

// 저장: CSV/JSON
const csv = ['pair,winA,winB,avgAliveDiff,avgTime', ...summary.map(s=>`${s.pair},${s.winA},${s.winB},${s.avgAliveDiff},${s.avgTime}`)].join('\n');
fs.writeFileSync(path.join(outDir,'summary.csv'), csv);
fs.writeFileSync(path.join(outDir,'summary.json'), JSON.stringify(summary,null,2));

if (check){
  // 결정성: 동일 인자로 한 번 더 실행해 바이트 동일성 확인
  const csv1 = fs.readFileSync(path.join(outDir,'summary.csv'));
  const json1 = fs.readFileSync(path.join(outDir,'summary.json'));
  // 재실행
  const summary2 = [];
  for (const [A,B] of pairs){
    let winA=0, winB=0, aliveSum=0, timeSum=0, total=0;
    for (let k=0;k<repeat;k++){
      const res = runMatch({ botA:A, botB:B, seed: seed + k, rounds });
      winA += res.reduce((a,b)=>a+b.winA,0);
      winB += res.reduce((a,b)=>a+b.winB,0);
      aliveSum += res.reduce((a,b)=>a+b.aliveDiff,0) / res.length;
      timeSum += res.reduce((a,b)=>a+b.time,0) / res.length;
      total += 1;
    }
    const avgAliveDiff = Number((aliveSum/total).toFixed(3));
    const avgTime = Number((timeSum/total).toFixed(3));
    summary2.push({ pair: `${A.name} vs ${B.name}`, winA, winB, avgAliveDiff, avgTime });
  }
  const csv2 = ['pair,winA,winB,avgAliveDiff,avgTime', ...summary2.map(s=>`${s.pair},${s.winA},${s.winB},${s.avgAliveDiff},${s.avgTime}`)].join('\n');
  const json2 = JSON.stringify(summary2,null,2);
  const ok = (csv === csv2) && (JSON.stringify(JSON.parse(json1),null,2) === json2);
  console.log(ok ? 'rr: deterministic check OK' : 'rr: deterministic check FAIL');
}

// 간단 성능 로그(1줄)
console.log(`rr: pairs=${pairs.length} rounds=${rounds} repeat=${repeat}`);
