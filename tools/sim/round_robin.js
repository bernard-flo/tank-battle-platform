#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

const argv = yargs(hideBin(process.argv))
  .option('seed',{ type:'number', default:42 })
  .option('rounds',{ type:'number', default:5 })
  .option('repeat',{ type:'number', default:3 })
  .help().argv;

fs.mkdirSync('tools/sim/results', { recursive: true });
const summary = { pairs: [], seed: argv.seed, rounds: argv.rounds, repeat: argv.repeat };
// 스텁: 파일만 생성
fs.writeFileSync('tools/sim/results/summary.csv', 'pair,winA,winB,avgAliveDiff,avgTime\n');
fs.writeFileSync('tools/sim/results/summary.json', JSON.stringify(summary, null, 2));
console.log(`rr: rounds=${argv.rounds} repeat=${argv.repeat} seed=${argv.seed}`);

