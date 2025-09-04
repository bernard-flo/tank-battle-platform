#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

const argv = yargs(hideBin(process.argv))
  .option('bot', { type:'string', demandOption:true })
  .option('budget', { type:'number', default:50 })
  .option('seed', { type:'number', default:7 })
  .help().argv;

fs.mkdirSync('tools/sim/results', { recursive: true });
fs.mkdirSync('tools/sim/params', { recursive: true });
const out = `tools/sim/results/search_${argv.bot}.csv`;
fs.writeFileSync(out, 'trial,score,json\n');
console.log(`search(stub): bot=${argv.bot} budget=${argv.budget} seed=${argv.seed}`);

