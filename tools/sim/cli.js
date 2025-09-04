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

fs.mkdirSync(path.dirname(argv.out), { recursive: true });
const res = runMatch({ a: argv.a, b: argv.b, rounds: argv.rounds, seed: argv.seed });
// 간결 로그
console.log(`sim: ${path.basename(argv.a)} vs ${path.basename(argv.b)} | rounds=${argv.rounds} seed=${argv.seed}`);
// CSV 기록
fs.writeFileSync(argv.out, 'round,winA,winB,aliveDiff,time\n');
for (const r of res.rounds) {
  fs.appendFileSync(argv.out, `${r.round},${r.winA},${r.winB},${r.aliveDiff},${r.time.toFixed(3)}\n`);
}
