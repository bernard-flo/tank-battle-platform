import path from 'path';
import fs from 'fs';
import { loadBot } from './loader.js';
import { runMatch } from './engine.js';

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {};
  for (let i = 0; i < args.length; i += 2) out[args[i].replace(/^--/, '')] = args[i+1];
  return out;
}

const argv = parseArgs();
const seed = Number(argv.seed || 42);
const rounds = Number(argv.rounds || 5);
const repeat = Number(argv.repeat || 3);

const tankDir = path.resolve('../../tanks');
const files = [
  '01_tanker_guardian.js',
  '02_dealer_sniper.js',
  '03_dealer_flanker.js',
  '04_normal_interceptor.js',
  '05_normal_support.js',
  '06_tanker_bruiser.js'
];
const bots = files.map(f => loadBot(path.join(tankDir, f)));

const pairs = [];
for (let i = 0; i < bots.length; i++) {
  for (let j = i + 1; j < bots.length; j++) pairs.push([i, j]);
}

const summary = [];
for (const [i, j] of pairs) {
  let winA = 0, winB = 0;
  for (let r = 0; r < repeat; r++) {
    const results = runMatch({ botsA: [bots[i]], botsB: [bots[j]], seed: seed + r, rounds });
    const s = results.reduce((acc, rr) => acc + (rr.aliveA > rr.aliveB ? 1 : 0), 0);
    winA += s; winB += (rounds - s);
  }
  summary.push({ A: bots[i].name, B: bots[j].name, winA, winB });
  console.log(`[rr] ${bots[i].name} vs ${bots[j].name} => A ${winA} - B ${winB}`);
}

const outDir = path.join(process.cwd(), 'results');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'summary.json'), JSON.stringify(summary, null, 2));

// summary.csv (pair,winA,winB)
const csv = ['pair,winA,winB']
  .concat(summary.map(row => `${JSON.stringify(`${row.A} vs ${row.B}`)},${row.winA},${row.winB}`))
  .join('\n');
fs.writeFileSync(path.join(outDir, 'summary.csv'), csv);
