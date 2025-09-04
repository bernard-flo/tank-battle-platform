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
let firstPairMetrics = null;
for (const [i, j] of pairs) {
  let winA = 0, winB = 0;
  let sumAliveDiff = 0;
  let sumTime = 0;
  let totalRounds = 0;
  for (let r = 0; r < repeat; r++) {
    const results = runMatch({ botsA: [bots[i]], botsB: [bots[j]], seed: seed + r, rounds });
    const s = results.reduce((acc, rr) => acc + (rr.aliveA > rr.aliveB ? 1 : 0), 0);
    winA += s; winB += (rounds - s);
    sumAliveDiff += results.reduce((acc, rr) => acc + (rr.aliveA - rr.aliveB), 0);
    sumTime += results.reduce((acc, rr) => acc + rr.time, 0);
    totalRounds += results.length;
  }
  const avgAliveDiff = totalRounds ? (sumAliveDiff / totalRounds) : 0;
  const avgTime = totalRounds ? (sumTime / totalRounds) : 0;
  const row = { A: bots[i].name, B: bots[j].name, winA, winB, avgAliveDiff: +avgAliveDiff.toFixed(3), avgTime: +avgTime.toFixed(3) };
  summary.push(row);
  console.log(`[rr] ${row.A} vs ${row.B} => A ${row.winA} - B ${row.winB} | avgAliveDiff=${row.avgAliveDiff} avgTime=${row.avgTime}`);

  if (!firstPairMetrics) firstPairMetrics = { i, j };
}

const outDir = path.join(process.cwd(), 'results');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'summary.json'), JSON.stringify(summary, null, 2));

// summary.csv (pair,winA,winB,avgAliveDiff,avgTime)
const csv = ['pair,winA,winB,avgAliveDiff,avgTime']
  .concat(summary.map(row => `${JSON.stringify(`${row.A} vs ${row.B}`)},${row.winA},${row.winB},${row.avgAliveDiff},${row.avgTime}`))
  .join('\n');
fs.writeFileSync(path.join(outDir, 'summary.csv'), csv);

// 결정적 재현성 체크: 첫 페어를 동일 시드로 2회 실행하여 동일성 확인
if (firstPairMetrics) {
  const { i, j } = firstPairMetrics;
  const runAgg = () => {
    let winA = 0, winB = 0, sumAliveDiff = 0, sumTime = 0, totalRounds = 0;
    for (let r = 0; r < repeat; r++) {
      const results = runMatch({ botsA: [bots[i]], botsB: [bots[j]], seed: seed + r, rounds });
      const s = results.reduce((acc, rr) => acc + (rr.aliveA > rr.aliveB ? 1 : 0), 0);
      winA += s; winB += (rounds - s);
      sumAliveDiff += results.reduce((acc, rr) => acc + (rr.aliveA - rr.aliveB), 0);
      sumTime += results.reduce((acc, rr) => acc + rr.time, 0);
      totalRounds += results.length;
    }
    const avgAliveDiff = totalRounds ? (sumAliveDiff / totalRounds) : 0;
    const avgTime = totalRounds ? (sumTime / totalRounds) : 0;
    return { winA, winB, avgAliveDiff: +avgAliveDiff.toFixed(3), avgTime: +avgTime.toFixed(3) };
  };

  const a = runAgg();
  const b = runAgg();
  const same = a.winA === b.winA && a.winB === b.winB && a.avgAliveDiff === b.avgAliveDiff && a.avgTime === b.avgTime;
  console.log(`[rr-check] seed=${seed} deterministic=${same} firstPair=${bots[firstPairMetrics.i].name} vs ${bots[firstPairMetrics.j].name} | A ${a.winA}-${b.winA} B ${a.winB}-${b.winB} avgAliveDiff ${a.avgAliveDiff}-${b.avgAliveDiff} avgTime ${a.avgTime}-${b.avgTime}`);
}
