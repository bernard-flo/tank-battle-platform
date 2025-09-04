import fs from 'fs';
import path from 'path';
import minimist from 'minimist';
import seedrandom from 'seedrandom';
import { runMatch } from './engine.js';
import { loadBot } from './loader.js';

function ensureDir(p){ if(!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true }); }
function pickLast(v, def){ return Array.isArray(v) ? (v.length? v[v.length-1] : def) : (v ?? def); }

const args = minimist(process.argv.slice(2));
const botKey = pickLast(args.bot, '02_dealer_sniper');
const budget = Number(pickLast(args.budget, 100));
const beam = Number(pickLast(args.beam, 5));
const seed = Number(pickLast(args.seed, 7));
const mode = pickLast(args.mode, 'beam');
const opponentsArg = pickLast(args.opponents, '01_tanker_guardian,06_tanker_bruiser');
const opponents = opponentsArg.split(',').map(s=>s.trim()).filter(Boolean);
const timeW = Number(pickLast(args.timeW, 0.05));
const check = String(pickLast(args.check, 'false')) === 'true';

const rng = seedrandom(String(seed));
function R(){ return rng(); }

// 파라미터 공간 정의
const SPACE = {
  ideal_range: [120, 380],
  orbit_deg: [15, 110],
  radius: [140, 240],
  radius_jitter: [10, 80],
  strafe_deg: [8, 28],
  fire_every: [3, 8]
};

function sampleParams(){
  const p={};
  for (const k of Object.keys(SPACE)){
    const [a,b]=SPACE[k];
    p[k] = Math.round(a + (b-a)*R());
  }
  return p;
}

function mutate(p, sigma=0.2){
  const q={};
  for (const k of Object.keys(SPACE)){
    const [a,b]=SPACE[k];
    const span=b-a; const v=p[k] ?? Math.round((a+b)/2);
    const nv = Math.round(v + (R()*2-1)*span*sigma);
    q[k] = Math.max(a, Math.min(b, nv));
  }
  return q;
}

function saveParams(botKey, params){
  ensureDir('tools/sim/params');
  const file = path.resolve('tools/sim/params', botKey + '.json');
  fs.writeFileSync(file, JSON.stringify(params,null,2));
}

function readBot(file){ return loadBot(file, seed); }

function scoreBotAgainst(botFile, oppFiles, params){
  // trial 시작 전에 params/<bot>.json 덮어쓰기
  saveParams(path.basename(botFile).replace(/\.js$/,''), params);
  const bot = readBot(botFile);
  let total = 0; let sum = 0;
  const detail=[];
  for (const oppFile of oppFiles){
    const opp = readBot(oppFile);
    const res = runMatch({ botA: bot, botB: opp, seed, rounds: 5 });
    const w = res.reduce((a,b)=>a+b.winA,0);
    const avgTime = res.reduce((a,b)=>a+b.time,0)/res.length;
    const s = w + avgTime*timeW;
    sum += s; total += 1;
    detail.push({ opp: opp.name, wins: w, avgTime: Number(avgTime.toFixed(3)), score: Number(s.toFixed(3)) });
  }
  return { score: sum/total, detail };
}

function botPathOf(key){ return path.resolve('../../tanks', key + '.js'); }

async function main(){
  const botFile = botPathOf(botKey);
  const oppFiles = opponents.map(botPathOf);
  ensureDir('tools/sim/results'); ensureDir('tools/sim/params/history/'+botKey);
  const resCSV = path.resolve('tools/sim/results', `search_${botKey}.csv`);
  const detCSV = path.resolve('tools/sim/results', `search_detail_${botKey}.csv`);

  if (mode === 'ga'){
    // 간단 GA
    const gens = Number(pickLast(args.gens, 12));
    const popN = Number(pickLast(args.pop, 24));
    const eliteN = Number(pickLast(args.elite, 4));
    const mut = Number(pickLast(args.mut, 0.25));
    const gaCSV = path.resolve('tools/sim/results', `ga_${botKey}.csv`);
    fs.writeFileSync(gaCSV, 'gen,bestScore\n');
    let pop = Array.from({length:popN}, ()=>sampleParams());
    let best = null; let bestScore = -1e9;
    for (let g=0; g<gens; g++){
      const scored = pop.map(p=>({ p, ...scoreBotAgainst(botFile, oppFiles, p) }));
      scored.sort((a,b)=>b.score-a.score);
      const elites = scored.slice(0, eliteN).map(s=>s.p);
      if (scored[0].score > bestScore){ bestScore = scored[0].score; best = scored[0].p; saveParams(botKey, best); fs.writeFileSync(path.resolve('tools/sim/params/history', botKey, `gen${g}.json`), JSON.stringify(best,null,2)); }
      fs.appendFileSync(gaCSV, `${g},${bestScore.toFixed(3)}\n`);
      // 다음 세대: 엘리트 보존 + 변이
      const next = [...elites];
      while (next.length < popN){
        const base = elites[Math.floor(R()*elites.length)] || scored[Math.floor(R()*scored.length)].p;
        next.push(mutate(base, mut));
      }
      pop = next;
    }
    // 최종 best 저장
    saveParams(botKey, best);
    // 결정성 체크(선택)
    if (check){
      const a = scoreBotAgainst(botFile, oppFiles, best).score;
      const b = scoreBotAgainst(botFile, oppFiles, best).score;
      console.log(a===b? 'search: GA deterministic OK' : 'search: GA deterministic FAIL');
    }
    console.log(`search(GA): ${botKey} best=${bestScore.toFixed(3)}`);
    return;
  }

  // Beam 탐색
  fs.writeFileSync(resCSV, 'trial,score\n');
  fs.writeFileSync(detCSV, 'trial,opponent,wins,avgTime,score\n');
  const beamSet = [];
  let best=null, bestScore=-1e9;
  for (let i=0;i<budget;i++){
    const p = sampleParams();
    const { score, detail } = scoreBotAgainst(botFile, oppFiles, p);
    fs.appendFileSync(resCSV, `${i},${score.toFixed(3)}\n`);
    for (const d of detail){ fs.appendFileSync(detCSV, `${i},${d.opp},${d.wins},${d.avgTime},${d.score}\n`); }
    beamSet.push({ p, score });
    beamSet.sort((a,b)=>b.score-a.score);
    if (beamSet.length>beam) beamSet.length=beam;
    if (score > bestScore){ bestScore=score; best=p; saveParams(botKey, best); }
  }
  if (check){
    const s1 = scoreBotAgainst(botFile, oppFiles, best).score;
    const s2 = scoreBotAgainst(botFile, oppFiles, best).score;
    console.log(s1===s2? 'search: deterministic OK' : 'search: deterministic FAIL');
  }
  console.log(`search(beam): ${botKey} best=${bestScore.toFixed(3)}`);
}

main();

