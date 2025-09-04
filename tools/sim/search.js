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
const mode = argv.mode || 'beam';
const gens = +argv.gens || 10;
const pop = +argv.pop || 16;
const elite = +argv.elite || 3;
const mut = +argv.mut || 0.25;

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
  const here = path.dirname(new URL(import.meta.url).pathname);
  const tanksRoot = path.resolve(path.join(here,'..','..','tanks'));
  const aPath = path.join(tanksRoot, `${key}.js`);
  const bPath = path.join(tanksRoot, `${opp}.js`);
  return runMatch({aPath,bPath,seed,rounds:5});
}

const detailRows = [];
let best;
if(mode==='ga'){
  const space = paramSpace();
  let popArr = Array.from({length:pop},()=>sample(space));
  // 시드 1개 포함(현재 파일값)
  const cur = readParams(botKey); if(Object.keys(cur).length) popArr[0]=clampParam(cur);
  const gaCSV = [['gen,rank,score']];
  for(let g=0; g<gens; g++){
    const scored = [];
    for(let i=0;i<popArr.length;i++){
      const cand = popArr[i]; writeParams(botKey, cand);
      const oppList = opponents.length? opponents : ['01_tanker_guardian','06_tanker_bruiser'];
      let resAgg=[]; for(const opp of oppList){ const res = runAgainst(botKey, opp); resAgg=resAgg.concat(res); const s=scoreResult(res); detailRows.push({trial:`g${g}i${i}`, opp, score:s}); }
      const s = scoreResult(resAgg); scored.push({params:cand, score:s});
    }
    scored.sort((a,b)=>b.score-a.score);
    for(let k=0;k<Math.min(elite, scored.length);k++) gaCSV.push([`${g},${k+1},${scored[k].score.toFixed(4)}`]);
    best = scored[0];
    // 선택+교배+변이
    const next=[...scored.slice(0,elite).map(s=>s.params)];
    while(next.length<pop){
      const p1 = scored[Math.floor(Math.pow(rng(),0.5)*scored.length)];
      const p2 = scored[Math.floor(Math.pow(rng(),0.5)*scored.length)];
      // 균등 교차
      const child={}; for(const k in space){ child[k] = (rng()<0.5? p1.params[k]:p2.params[k]); }
      // 변이
      for(const k in space){ if(rng()<mut){ const [a,b]=space[k]; const sigma=(b-a)*0.1; child[k] = clampParam({[k]: child[k] + (rng()*2-1)*sigma})[k]; }}
      next.push(child);
    }
    popArr = next;
  }
  writeParams(botKey, clampParam(best.params));
  fs.writeFileSync(path.join(outDir, `ga_${botKey}.csv`), gaCSV.map(r=>r.join('\n')).join('\n'));
} else {
  let candidates = [];
  for(let i=0;i<budget;i++){
    const cand = sample(paramSpace());
    writeParams(botKey, cand);
    let resAgg=[]; const oppList = opponents.length? opponents : ['01_tanker_guardian','06_tanker_bruiser'];
    for(const opp of oppList){ const res = runAgainst(botKey, opp); resAgg = resAgg.concat(res); const s = scoreResult(res); detailRows.push({trial:i, opp, score:s}); }
    const s = scoreResult(resAgg);
    candidates.push({trial:i, params:cand, score:s});
    candidates.sort((a,b)=>b.score-a.score); candidates = candidates.slice(0, beam);
  }
  best = candidates[0];
  writeParams(botKey, clampParam(best.params));
  fs.writeFileSync(path.join(outDir, `search_${botKey}.csv`), ['rank,trial,score'].concat(candidates.map((c,i)=>`${i+1},${c.trial},${c.score.toFixed(4)}`)).join('\n'));
}

fs.writeFileSync(path.join(outDir, `search_detail_${botKey}.csv`), ['trial,opp,score'].concat(detailRows.map(r=>`${r.trial},${r.opp},${r.score.toFixed(4)}`)).join('\n'));

// 스냅샷 저장
const histDir = path.join(paramsDir, 'history', botKey);
fs.mkdirSync(histDir, {recursive:true});
fs.writeFileSync(path.join(histDir, `${Date.now()}.json`), JSON.stringify(best.params, null, 2));

if(check){
  const res = opponents.map(o=>runAgainst(botKey,o)).flat();
  const s2 = scoreResult(res);
  console.log(`Search best score recheck: ${(Math.abs(best.score - s2)<1e-6)?'OK':'DRIFT'}`);
}
console.log(`Search done: ${botKey}, best saved to params/${botKey}.json`);
