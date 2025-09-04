import fs from 'fs';
import path from 'path';
import minimist from 'minimist';
import { runMatch } from './engine.js';
import { loadBot } from './loader.js';
const baseDir = path.dirname(new URL(import.meta.url).pathname);

function ensureDir(p){ if(!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true }); }

const args = minimist(process.argv.slice(2));
const aFile = Array.isArray(args.a) ? args.a[args.a.length-1] : args.a;
const bFile = Array.isArray(args.b) ? args.b[args.b.length-1] : args.b;
const seed = Number(Array.isArray(args.seed)?args.seed[args.seed.length-1]:args.seed ?? 42);
const rounds = Number(Array.isArray(args.rounds)?args.rounds[args.rounds.length-1]:args.rounds ?? 5);

if(!aFile || !bFile){
  console.log('usage: node cli.js --a <botA.js> --b <botB.js> [--seed 42] [--rounds 5]');
  process.exit(1);
}

const botA = loadBot(aFile, seed);
const botB = loadBot(bFile, seed);
const res = runMatch({ botA, botB, seed, rounds });

// 결과 저장
const outDir = path.join(baseDir, 'results'); ensureDir(outDir);
const out = path.join(outDir, 'last_match.csv');
const header = 'round,winA,winB,aliveDiff,time\n';
const lines = res.map(r=>[r.round,r.winA,r.winB,r.aliveDiff,r.time].join(','));
fs.writeFileSync(out, header + lines.join('\n'));

// 콘솔 요약 1줄
const sumA = res.reduce((a,b)=>a+b.winA,0); const sumB = res.reduce((a,b)=>a+b.winB,0);
console.log(`sim: ${botA.name} vs ${botB.name} => A:${sumA} B:${sumB} rounds:${rounds}`);
