// 간단 파라미터 탐색 스텁(탱크 코드 파라미터화는 추후 적용)
import path from 'path';
import fs from 'fs';
import { loadBot } from './loader.js';
import { runMatch } from './engine.js';

function parseArgs() { const a=process.argv.slice(2); const o={}; for(let i=0;i<a.length;i+=2) o[a[i].replace(/^--/,'')]=a[i+1]; return o; }
const argv = parseArgs();
const seed = Number(argv.seed || 7);
const budget = Number(argv.budget || 50);
const botKey = argv.bot || '02_dealer_sniper';

const tankDir = path.resolve('../../tanks');
const base = loadBot(path.join(tankDir, `${botKey}.js`));
const opponent = loadBot(path.join(tankDir, '06_tanker_bruiser.js'));

const paramsDir = path.join(process.cwd(), 'params');
fs.mkdirSync(paramsDir, { recursive: true });

// 현재는 더미 점수(승수)만 기록
const results = [];
for (let i = 0; i < budget; i++) {
  const r = runMatch({ botsA: [base], botsB: [opponent], seed: seed + i, rounds: 5 });
  const wins = r.reduce((acc, rr) => acc + (rr.aliveA > rr.aliveB ? 1 : 0), 0);
  results.push({ trial: i+1, wins });
}
fs.writeFileSync(path.join(paramsDir, `${botKey}.json`), JSON.stringify(results, null, 2));
console.log(`[search] ${botKey} trials=${budget} saved params/${botKey}.json`);

