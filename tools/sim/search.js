import fs from 'fs';
import path from 'path';
import minimist from 'minimist';
import seedrandom from 'seedrandom';
import { runMatch, ensureDirs } from './engine.js';

const argv = minimist(process.argv.slice(2));
const botKey = argv.bot; // e.g., 02_dealer_sniper
const budget = +argv.budget || 100;
const beam = +argv.beam || 5;
const seed = argv.seed ?? 7;
const opponents = (argv.opponents||'').split(',').filter(Boolean);
const check = argv.check === true || argv.check === 'true';
const timeW = argv.timeW ? +argv.timeW : 0.05;

if(!botKey){ console.log('Usage: node search.js --bot 02_dealer_sniper --budget 100 [--beam 5]'); process.exit(1); }

const rng = seedrandom(String(seed));
const outDir = ensureDirs();
const paramsDir = path.join(path.dirname(new URL(import.meta.url).pathname), 'params');
if(!fs.existsSync(paramsDir)) fs.mkdirSync(paramsDir,{recursive:true});

function paramSpace(){
  return {
    ideal_range: [120, 480],
    orbit_deg: [10, 120],
    lead_max_deg: [5, 20],
    evade_weight: [0.2, 2.0],
    strafe_deg: [8, 40],
    fire_every_frames: [3, 9]
  };
}
function sample(space){ const s={}; for(const k in space){ const [a,b]=space[k]; s[k]=a+(b-a)*rng(); } s.fire_every_frames = Math.round(s.fire_every_frames); return s; }
function clampParam(p){ const s=paramSpace(); const o={}; for(const k in p){ const [a,b]=s[k]||[p[k],p[k]]; o[k]=Math.max(a, Math.min(b, p[k])); } return o; }

function paramsPath(key){ return path.join(paramsDir, `${key}.json`); }
function writeParams(key,obj){ fs.writeFileSync(paramsPath(key), JSON.stringify(obj,null,2)); }
function readParams(key){ try{ return JSON.parse(fs.readFileSync(paramsPath(key),'utf8')); }catch{ return {}; } }

function scoreResult(arr){ const win = arr.filter(r=>r.winA).length; const time = arr.reduce((s,r)=>s+r.time,0)/arr.length; return win + (1/time)*timeW; }

function runAgainst(key, opp){
  const aPath = path.resolve(path.join(process.cwd(),'..','tanks', `${key}.js`));
  const bPath = path.resolve(path.join(process.cwd(),'..','tanks', `${opp}.js`));
  return runMatch({aPath,bPath,seed,rounds:5});
}

const detailRows = [];
let candidates = [];
for(let i=0;i<budget;i++){
  const cand = sample(paramSpace());
  // trial 적용: params/<botKey>.json 덮어쓰기
  writeParams(botKey, cand);
  let resAgg=[];
  const oppList = opponents.length? opponents : ['01_tanker_guardian','06_tanker_bruiser'];
  for(const opp of oppList){ const res = runAgainst(botKey, opp); resAgg = resAgg.concat(res); const s = scoreResult(res); detailRows.push({trial:i, opp, score:s}); }
  const s = scoreResult(resAgg);
  candidates.push({trial:i, params:cand, score:s});
  candidates.sort((a,b)=>b.score-a.score); candidates = candidates.slice(0, beam);
}

// best 저장
const best = candidates[0];
writeParams(botKey, clampParam(best.params));
fs.writeFileSync(path.join(outDir, `search_${botKey}.csv`), ['rank,trial,score'].concat(candidates.map((c,i)=>`${i+1},${c.trial},${c.score.toFixed(4)}`)).join('\n'));
fs.writeFileSync(path.join(outDir, `search_detail_${botKey}.csv`), ['trial,opp,score'].concat(detailRows.map(r=>`${r.trial},${r.opp},${r.score.toFixed(4)}`)).join('\n'));

if(check){
  // 결정적성 간단 체크: 동일 시드에서 best.score 재계산 동일 여부
  const res = opponents.map(o=>runAgainst(botKey,o)).flat();
  const s2 = scoreResult(res);
  console.log(`Search best score recheck: ${(Math.abs(best.score - s2)<1e-6)?'OK':'DRIFT'}`);
}
console.log(`Search done: ${botKey}, best saved to params/${botKey}.json`);

