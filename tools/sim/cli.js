#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { runMatch } from './engine.js';

const argv = yargs(hideBin(process.argv))
  .option('a', { type:'string', demandOption:true })
  .option('b', { type:'string', demandOption:true })
  .option('rounds', { type:'number', default:5 })
  .option('seed', { type:'number', default:42 })
  .option('out', { type:'string', default:'results/last_match.csv' })
  .help().argv;

const pickLast = (v) => Array.isArray(v) ? v[v.length-1] : v;
const A = pickLast(argv.a);
const B = pickLast(argv.b);
const ROUNDS = Number(pickLast(argv.rounds));
const SEED = Number(pickLast(argv.seed));
const OUT = pickLast(argv.out);

fs.mkdirSync(path.dirname(OUT), { recursive: true });
const res = runMatch({ a: A, b: B, rounds: ROUNDS, seed: SEED });
// 간결 로그
console.log(`sim: ${path.basename(A)} vs ${path.basename(B)} | rounds=${ROUNDS} seed=${SEED}`);
// CSV 기록
fs.writeFileSync(OUT, 'round,winA,winB,aliveDiff,time\n');
for (const r of res.rounds) {
  fs.appendFileSync(OUT, `${r.round},${r.winA},${r.winB},${r.aliveDiff},${r.time.toFixed(3)}\n`);
}
