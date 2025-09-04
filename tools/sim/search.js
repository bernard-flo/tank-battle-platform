#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { runMatch } from './engine.js';
import { loadBot } from './loader.js';

const seed = (process.argv.includes('--seed')? process.argv[process.argv.indexOf('--seed')+1] : '7');
const mode = (process.argv.includes('--mode')? process.argv[process.argv.indexOf('--mode')+1] : 'beam');
const botKey = (process.argv.includes('--bot')? process.argv[process.argv.indexOf('--bot')+1] : '02_dealer_sniper');
const budget = parseInt(process.argv.includes('--budget')? process.argv[process.argv.indexOf('--budget')+1] : '200');
const beam = parseInt(process.argv.includes('--beam')? process.argv[process.argv.indexOf('--beam')+1] : '5');
const gens = parseInt(process.argv.includes('--gens')? process.argv[process.argv.indexOf('--gens')+1] : '15');
const pop = parseInt(process.argv.includes('--pop')? process.argv[process.argv.indexOf('--pop')+1] : '24');
const elite = parseInt(process.argv.includes('--elite')? process.argv[process.argv.indexOf('--elite')+1] : '4');
const mut = parseFloat(process.argv.includes('--mut')? process.argv[process.argv.indexOf('--mut')+1] : '0.25');
const timeW = parseFloat(process.argv.includes('--timeW')? process.argv[process.argv.indexOf('--timeW')+1] : '0.05');
const doCheck = process.argv.includes('--check');
const oppArg = (process.argv.includes('--opponents')? process.argv[process.argv.indexOf('--opponents')+1] : '01_tanker_guardian,06_tanker_bruiser');
const opponents = oppArg.split(',').filter(Boolean);

const tanksDir = path.resolve('../..','tanks');
const botPath = path.join(tanksDir, `${botKey}.js`);
const resultsDir = path.resolve(path.dirname(new URL(import.meta.url).pathname), './results');
const paramsDir = path.resolve(path.dirname(new URL(import.meta.url).pathname), './params');
fs.mkdirSync(resultsDir,{recursive:true}); fs.mkdirSync(paramsDir,{recursive:true});

function saveParams(key, obj){
  const p = path.join(paramsDir, `${key}.json`);
  fs.writeFileSync(p, JSON.stringify(obj,null,2));
}
function snapshotParams(key, obj){
  const dir = path.join(paramsDir,'history',key); fs.mkdirSync(dir,{recursive:true});
  const ts = new Date().toISOString().replace(/[:.]/g,'-');
  fs.writeFileSync(path.join(dir, `${ts}.json`), JSON.stringify(obj,null,2));
}

// 파라미터 공간 정의(범위)
const space = {
  ideal_range: [160, 360],
  orbit_deg: [40, 120],
  lead_max_deg: [0, 8],
  evade_weight: [0.5, 3.0],
  strafe_deg: [10, 35]
};
function randIn([a,b]){ return a + Math.random()*(b-a); }
function clamp(v,[a,b]){ return Math.max(a, Math.min(b,v)); }
function randomParams(){
  return {
    ideal_range: Math.round(randIn(space.ideal_range)),
    orbit_deg: Math.round(randIn(space.orbit_deg)),
    lead_max_deg: randIn(space.lead_max_deg),
    evade_weight: +randIn(space.evade_weight).toFixed(2),
    strafe_deg: Math.round(randIn(space.strafe_deg))
  };
}
function crossover(a,b){
  const c={}; for(const k of Object.keys(space)){ c[k] = Math.random()<0.5? a[k]: b[k]; } return c;
}
function mutate(x, rate){
  const y={...x}; for(const k of Object.keys(space)){ if(Math.random()<rate){
    const r = (space[k][1]-space[k][0]); const noise = (Math.random()*2-1)*0.2*r; y[k]=clamp(y[k]+noise, space[k]); if(Number.isInteger(x[k])) y[k]=Math.round(y[k]); }
  } return y;
}

function evalOne(p){
  // trial 전 PARAMS 저장(덮어쓰기)
  saveParams(botKey, p);
  const bot = loadBot(botPath);
  let total=0, timeSum=0; const detail=[];
  for(const oppKey of opponents){
    const oppPath = path.join(tanksDir, `${oppKey}.js`);
    const opp = loadBot(oppPath);
    let w=0, rounds=5; for(let r=0;r<rounds;r++){ const res = runMatch([bot],[opp],{seed:`${seed}:${botKey}:${oppKey}:${JSON.stringify(p)}:${r}`}); if(res.winner==='A') w++; timeSum += res.time; }
    const score = w + timeW*(timeSum/rounds);
    total += score; detail.push({opp:oppKey, w, score});
  }
  return {score: total/opponents.length, time: timeSum/(opponents.length*5), params: p, detail};
}

const detailPath = path.join(resultsDir, `search_detail_${botKey}.csv`);
fs.writeFileSync(detailPath, 'trial,opp,wins,subScore\n');
const csvPath = path.join(resultsDir, `search_${botKey}.csv`);
fs.writeFileSync(csvPath, 'trial,score,avgTime,ideal_range,orbit_deg,lead_max_deg,evade_weight,strafe_deg\n');

function record(trial, res){
  fs.appendFileSync(csvPath, `${trial},${res.score.toFixed(3)},${res.time.toFixed(3)},${res.params.ideal_range},${res.params.orbit_deg},${res.params.lead_max_deg.toFixed(2)},${res.params.evade_weight.toFixed(2)},${res.params.strafe_deg}\n`);
  for(const d of res.detail){ fs.appendFileSync(detailPath, `${trial},${d.opp},${d.w},${d.score.toFixed(3)}\n`); }
}

if (mode==='ga'){
  // GA: 초기개체(랜덤 + 현행 프리셋 1개 if exist)
  let popu = Array.from({length:pop}, ()=>randomParams());
  // seed preset
  try{ const preset = JSON.parse(fs.readFileSync(path.join(paramsDir, `${botKey}.json`),'utf8')); popu[0]=preset; }catch{}
  let best=null; let trial=0;
  const gaPath = path.join(resultsDir, `ga_${botKey}.csv`);
  fs.writeFileSync(gaPath, 'gen,rank,score,avgTime,ideal_range,orbit_deg,lead_max_deg,evade_weight,strafe_deg\n');
  for(let g=0; g<gens; g++){
    const scored = popu.map(p=>{ const r=evalOne(p); trial++; record(trial,r); return r; }).sort((a,b)=>b.score-a.score);
    if (!best || scored[0].score>best.score) best = scored[0];
    for(let k=0;k<Math.min(beam, scored.length);k++){
      const r = scored[k]; fs.appendFileSync(gaPath, `${g},${k+1},${r.score.toFixed(3)},${r.time.toFixed(3)},${r.params.ideal_range},${r.params.orbit_deg},${r.params.lead_max_deg.toFixed(2)},${r.params.evade_weight.toFixed(2)},${r.params.strafe_deg}\n`);
    }
    // 선택/교배/변이
    const elites = scored.slice(0, elite).map(x=>x.params);
    const next=[...elites];
    while(next.length<pop){ const a=elites[Math.floor(Math.random()*elites.length)], b=scored[Math.floor(Math.random()*scored.length)].params; next.push(mutate(crossover(a,b), mut)); }
    popu = next;
  }
  if (best){ snapshotParams(botKey, best.params); saveParams(botKey, best.params); }
  if (doCheck){ const r1=evalOne(best.params), r2=evalOne(best.params); console.log(`deterministic check: ${(Math.abs(r1.score-r2.score)<1e-9)?'OK':'MISMATCH'}`); }
  console.log(`GA done. Best=${best.score.toFixed(3)} params saved.`);
} else {
  // Beam-like: budget 샘플 중 상위 N 유지
  let pool=[]; let trial=0;
  for(let i=0;i<budget;i++){
    const p = randomParams(); const r=evalOne(p); trial++; record(trial,r); pool.push(r); pool.sort((a,b)=>b.score-a.score); if (pool.length>beam) pool.length=beam;
  }
  const best = pool[0]; if (best){ snapshotParams(botKey, best.params); saveParams(botKey, best.params); }
  if (doCheck){ const r1=evalOne(best.params), r2=evalOne(best.params); console.log(`deterministic check: ${(Math.abs(r1.score-r2.score)<1e-9)?'OK':'MISMATCH'}`); }
  console.log(`Search done. Best=${best.score.toFixed(3)} params saved.`);
}

