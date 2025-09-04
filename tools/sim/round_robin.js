#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { runMatch } from './engine.js';

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
  // 실제 엔진 호출 반복 평가
  const aPath = path.resolve(process.cwd(), '../../tanks', `${aKey}.js`);
  const bPath = path.resolve(process.cwd(), '../../tanks', `${bKey}.js`);
  let winA=0, winB=0, aliveSum=0, timeSum=0;
  for (let r=0;r<repeat;r++) {
    const res = runMatch({ a: aPath, b: bPath, rounds, seed: seed + r });
    winA += res.summary.winA;
    winB += res.summary.winB;
    aliveSum += res.summary.avgAliveDiff;
    timeSum += res.summary.avgTime;
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
  const ok = (r1.winA===r2.winA && r1.winB===r2.winB && Math.abs(r1.avgTime-r2.avgTime)<1e-9);
  console.log(`rr: deterministic check ${ok? 'OK':'FAIL'}`);
}

console.log(`rr: rounds=${ROUNDS} repeat=${REPEAT} seed=${SEED} pairs=${pairs.length}`);
