#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { runMatch } from './engine.js';
import { loadBot } from './loader.js';

function arg(name, def){ const i=process.argv.indexOf(`--${name}`); return i>0? process.argv[i+1]: def; }
const aPath = arg('a', '../../tanks/01_tanker_guardian.js');
const bPath = arg('b', '../../tanks/02_dealer_sniper.js');
const seed = arg('seed','42');
const rounds = parseInt(arg('rounds','3'));

const botA = loadBot(aPath);
const botB = loadBot(bPath);

const resultsDir = path.resolve(path.dirname(new URL(import.meta.url).pathname), './results');
fs.mkdirSync(resultsDir, {recursive:true});
const csvPath = path.join(resultsDir, 'last_match.csv');
fs.writeFileSync(csvPath, 'round,winner,time,aliveA,aliveB,avgAliveA,avgAliveB\n');

let winA=0, winB=0, draw=0; let totalTime=0;
for(let r=0;r<rounds;r++){
  const res = runMatch([botA],[botB],{seed: seed+':'+r});
  if (res.winner==='A') winA++; else if (res.winner==='B') winB++; else draw++;
  totalTime += res.time;
  fs.appendFileSync(csvPath, `${r+1},${res.winner},${res.time.toFixed(3)},${res.aliveA},${res.aliveB},${res.avgAliveA.toFixed(3)},${res.avgAliveB.toFixed(3)}\n`);
}

console.log(`A vs B => A:${winA} B:${winB} D:${draw} avgT:${(totalTime/rounds).toFixed(2)}s`);
