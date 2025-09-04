import { loadBot } from './loader.js';
import { runMatch } from './engine.js';
import fs from 'fs';
import path from 'path';

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {};
  for (let i = 0; i < args.length; i += 2) out[args[i].replace(/^--/, '')] = args[i+1];
  return out;
}

const argv = parseArgs();
const aPath = argv.a || '../../tanks/01_tanker_guardian.js';
const bPath = argv.b || '../../tanks/02_dealer_sniper.js';
const seed = Number(argv.seed || 42);
const rounds = Number(argv.rounds || 5);

const botA = loadBot(aPath);
const botB = loadBot(bPath);

const botsA = [botA];
const botsB = [botB];

const results = runMatch({ botsA, botsB, seed, rounds });

const summary = results.reduce((acc, r) => ({
  rounds: (acc.rounds||0)+1,
  winA: acc.winA + (r.aliveA > r.aliveB ? 1 : 0),
  winB: acc.winB + (r.aliveB > r.aliveA ? 1 : 0)
}), { winA: 0, winB: 0 });

console.log(`[sim] ${botA.name} vs ${botB.name} | rounds=${rounds} seed=${seed}`);
console.log(`[sim] result: A ${summary.winA} - B ${summary.winB}`);

// 저장
const resDir = path.join(process.cwd(), 'results');
fs.mkdirSync(resDir, { recursive: true });
const csv = ['round,aliveA,aliveB,time']
  .concat(results.map((r, i) => `${i+1},${r.aliveA},${r.aliveB},${r.time.toFixed(3)}`))
  .join('\n');
fs.writeFileSync(path.join(resDir, 'last_match.csv'), csv);

