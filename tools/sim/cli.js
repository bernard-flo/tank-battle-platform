import minimist from 'minimist';
import fs from 'fs';
import path from 'path';
import { runMatch, ensureDirs } from './engine.js';

const argv = minimist(process.argv.slice(2));
const aPath = argv.a || argv.A;
const bPath = argv.b || argv.B;
const seed = argv.seed ?? 42;
const rounds = argv.rounds ?? 5;
if(!aPath || !bPath){
  console.log('Usage: node cli.js --a <pathA> --b <pathB> [--seed 42] [--rounds 5]');
  process.exit(1);
}
const outDir = ensureDirs();
const t0 = Date.now();
const res = runMatch({aPath, bPath, seed, rounds});
const t1 = Date.now();
const winsA = res.filter(r=>r.winA).length; const winsB = res.filter(r=>r.winB).length; const avgTime=(res.reduce((s,r)=>s+r.time,0)/res.length).toFixed(3);
console.log(`A:${path.basename(aPath)} vs B:${path.basename(bPath)} => ${winsA}-${winsB}, avgTime:${avgTime}s`);
console.log(`perf: ${(t1-t0)}ms for ${rounds} rounds`);
// CSV 저장
const csvPath = path.join(outDir, 'last_match.csv');
const csv = ['round,winA,winB,aliveA,aliveB,time'].concat(res.map((r,i)=>`${i+1},${+r.winA},${+r.winB},${r.aliveA},${r.aliveB},${r.time.toFixed(3)}`)).join('\n');
fs.writeFileSync(csvPath, csv);
