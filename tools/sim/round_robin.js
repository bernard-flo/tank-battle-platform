#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { makeRng } from './engine.js';

const argv = yargs(hideBin(process.argv))
  .option('seed',{ type:'number', default:42 })
  .option('rounds',{ type:'number', default:5 })
  .option('repeat',{ type:'number', default:3 })
  .option('check',{ type:'boolean', default:false })
  .help().argv;

const SEED = Number(Array.isArray(argv.seed) ? argv.seed[0] : argv.seed);
const ROUNDS = Number(Array.isArray(argv.rounds) ? argv.rounds[0] : argv.rounds);
const REPEAT = Number(Array.isArray(argv.repeat) ? argv.repeat[0] : argv.repeat);

fs.mkdirSync('results', { recursive: true });

function listBots() {
  const dir = path.resolve(process.cwd(), '../../tanks');
  const files = fs.readdirSync(dir).filter(f=>f.endsWith('.js')).sort();
  return files.map(f=>({ key: f.replace(/\.js$/,''), file: path.join(dir, f) }));
}

function evalPair(aKey, bKey, seed, rounds, repeat) {
  // 엔진 미구현 상태에서 결정적 의사 결과 생성
  const rng = makeRng(seed ^ (aKey.length*97 + bKey.length*53));
  let winA=0, winB=0, aliveSum=0, timeSum=0;
  for (let r=0;r<repeat;r++) {
    let t = 0;
    for (let i=0;i<rounds;i++) {
      const rv = rng();
      if (rv < 0.5) winA++; else winB++;
      t += 50 + Math.floor(rng()*40); // 50~90
    }
    timeSum += t/rounds;
    aliveSum += (rng() - 0.5) * 2; // -1..1 평균 0 근처
  }
  return { winA, winB, avgAliveDiff: aliveSum/repeat, avgTime: timeSum/repeat };
}

const bots = listBots();
const pairs = [];
const csvPath = 'results/summary.csv';
fs.writeFileSync(csvPath, 'pair,winA,winB,avgAliveDiff,avgTime\n');

for (let i=0;i<bots.length;i++) {
  for (let j=i+1;j<bots.length;j++) {
    const A=bots[i], B=bots[j];
    const res = evalPair(A.key, B.key, SEED, ROUNDS, REPEAT);
    pairs.push({ pair: `${A.key} vs ${B.key}`, ...res });
    fs.appendFileSync(csvPath, `${A.key}vs${B.key},${res.winA},${res.winB},${res.avgAliveDiff.toFixed(3)},${res.avgTime.toFixed(2)}\n`);
  }
}

const summary = { pairs, seed: SEED, rounds: ROUNDS, repeat: REPEAT };
fs.writeFileSync('results/summary.json', JSON.stringify(summary, null, 2));

// 결정성 체크: 첫 페어 2회 재평가 동일성 확인
if (argv.check && pairs.length>0) {
  const [firstA, firstB] = bots.slice(0,2);
  const r1 = evalPair(firstA.key, firstB.key, SEED, ROUNDS, REPEAT);
  const r2 = evalPair(firstA.key, firstB.key, SEED, ROUNDS, REPEAT);
  const ok = (r1.winA===r2.winA && r1.winB===r2.winB && Math.abs(r1.avgTime-r2.avgTime)<1e-12);
  console.log(`rr: deterministic check ${ok? 'OK':'FAIL'}`);
}

console.log(`rr: rounds=${ROUNDS} repeat=${REPEAT} seed=${SEED} pairs=${pairs.length}`);
