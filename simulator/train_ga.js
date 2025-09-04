import fs from 'fs';
import path from 'path';
import url from 'url';
import { initializeGame, step, isBattleOver, winner, Type } from './engine.js';
import { adversaryPack } from './adversaries.js';
import { buildTeam } from '../ai/param_team_builder.js';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

// 랜덤 유틸
function rand(){ return Math.random(); }
function randn(){ // Box-Muller
  let u=0,v=0; while(u===0)u=Math.random(); while(v===0)v=Math.random();
  return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v);
}
function clamp(v, lo, hi){ return Math.max(lo, Math.min(hi, v)); }

// 기본 파라미터 및 범위(역할별)
const baseParams = {
  bulldozer: { dodgeTTI: 24, dodgePad: 10, spreadFar: 10, spreadNear: 6, engageDist: 120, centerPull: 0.35 },
  anchor:    { lineNear: 120, dodgeTTI: 20, dodgePad: 6, fireJitter: 8 },
  striker:   { kite: 210, kiteTol: 40, leadScale: 0.25, dodgeTTI: 22 },
  sniper:    { prefer: 260, near: 40, far: 80, leadBase: 9, leadScale: 0.25, jitter: 4 },
  interceptor:{ centerDist: 220, dodgeTTI: 24 },
  sweeper:   { orbitNear: 200, offsetsFar: [-6,0,6], offsetsNear: [-4,0,4] }
};

const ranges = {
  bulldozer: { dodgeTTI:[16,32], dodgePad:[6,14], spreadFar:[6,14], spreadNear:[4,10], engageDist:[80,180], centerPull:[0,0.7] },
  anchor:    { lineNear:[80,180], dodgeTTI:[14,28], dodgePad:[4,12], fireJitter:[4,12] },
  striker:   { kite:[170,260], kiteTol:[20,70], leadScale:[0.15,0.5], dodgeTTI:[16,28] },
  sniper:    { prefer:[220,320], near:[20,80], far:[40,120], leadBase:[7,12], leadScale:[0.15,0.5], jitter:[2,8] },
  interceptor:{ centerDist:[160,280], dodgeTTI:[16,30] },
  sweeper:   { orbitNear:[160,260] }
};

function randomParams(){
  const p = JSON.parse(JSON.stringify(baseParams));
  for (const role of Object.keys(ranges)){
    for (const k of Object.keys(ranges[role])){
      const [lo,hi] = ranges[role][k];
      p[role][k] = lo + rand()*(hi-lo);
    }
  }
  return p;
}

function mutateParams(p, sigma=0.2){
  const q = JSON.parse(JSON.stringify(p));
  for (const role of Object.keys(ranges)){
    for (const k of Object.keys(ranges[role])){
      const [lo,hi] = ranges[role][k];
      const span = hi - lo; const noise = randn()*sigma*span;
      q[role][k] = clamp(q[role][k] + noise, lo, hi);
    }
  }
  return q;
}

function extractType(code){
  if (/return\s+Type\.TANKER/.test(code)) return Type.TANKER;
  if (/return\s+Type\.DEALER/.test(code)) return Type.DEALER;
  return Type.NORMAL;
}

function makePlayersFromTeam(teamCodes, oppCodes=adversaryPack){
  const players = [];
  for (let i=0;i<6;i++){
    const code = teamCodes[i];
    players.push({ id: `R${i+1}`, name: `R${i+1}`, code, team: 'red', type: extractType(code) });
  }
  oppCodes.forEach((code, i)=>{
    players.push({ id: `B${i+1}`, name: `OPP${i+1}`, code, team: 'blue', type: extractType(code) });
  });
  return players;
}

function runOne(players, seed){
  const prng = mulberry32(seed);
  const _rand = Math.random; Math.random = prng;
  initializeGame(players);
  let now=0; const dt=50; const maxTicks=6000;
  for (let t=0;t<maxTicks;t++){ step(now); if (isBattleOver()) break; now+=dt; }
  const w = winner(); Math.random = _rand; return w;
}

function mulberry32(a){
  return function(){
    let t=a+=0x6D2B79F5; t=Math.imul(t^(t>>>15), t|1); t^=t+Math.imul(t^(t>>>7), t|61); return ((t^(t>>>14))>>>0)/4294967296;
  };
}

function evaluate(params, seeds, hallOfFame=[]){
  const team = buildTeam(params).map(x=>x.code);
  let red=0, blue=0, draw=0;
  for (let idx=0; idx<seeds.length; idx++){
    const s = seeds[idx];
    // 홀 매치: 일부 시드에서는 명예의 전당과 대전해 과적합 방지
    let opp = adversaryPack;
    if (hallOfFame.length>0 && (idx % 3 === 0)){
      const rival = hallOfFame[Math.floor(Math.random()*hallOfFame.length)];
      opp = buildTeam(rival.params).map(x=>x.code);
    }
    const players = makePlayersFromTeam(team, opp);
    const res = runOne(players, s);
    if (res==='red') red++; else if (res==='blue') blue++; else draw++;
  }
  const wr = red / seeds.length;
  return { red, blue, draw, winRate: wr };
}

function saveTeamFiles(params, outName='OMEGA'){
  const team = buildTeam(params);
  const aiDir = path.join(__dirname, '..', 'ai');
  team.forEach(({file, code})=>{
    fs.writeFileSync(path.join(aiDir, file), code, 'utf8');
  });
  // 내보내기 파일 생성
  let exportTxt = `// ${outName} Team Export\n// 이 파일을 플랫폼의 팀 코드 가져오기에 붙여넣으세요.\n\n`;
  for (const {file, code} of team){
    exportTxt += `// ===== ${file.replace('.js','').toUpperCase()} =====\n` + code + '\n\n';
  }
  fs.writeFileSync(path.join(aiDir, `EXPORT_${outName}.txt`), exportTxt.trim()+"\n", 'utf8');
}

async function main(){
  // 설정: 세대 수/개체 수/시드 수
  const gens = parseInt(process.argv[2]||'',10) || 12;
  const popN = parseInt(process.argv[3]||'',10) || 14;
  const gamesPer = parseInt(process.argv[4]||'',10) || 30;
  const seedBase = parseInt(process.argv[5]||'',10) || 4242;

  let population = new Array(popN).fill(0).map(()=> randomParams());
  let seeds = new Array(gamesPer).fill(0).map((_,i)=> seedBase + i);
  let hall = [];

  for (let g=0; g<gens; g++){
    const scores = [];
    for (let i=0;i<population.length;i++){
      const p = population[i];
      const perf = evaluate(p, seeds, hall);
      scores.push({ idx:i, wr: perf.winRate, stat: perf });
    }
    scores.sort((a,b)=>b.wr - a.wr);
    const best = scores[0];
    const bestParams = population[best.idx];
    hall.push({ gen:g, wr: best.wr, params: bestParams });

    // 결과 저장/스냅샷
    const outDir = path.join(__dirname, '..', '.result');
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    const ts = new Date().toISOString().replace(/[:.]/g,'-');
    fs.writeFileSync(path.join(outDir, `ga_gen${g}_summary_${ts}.json`), JSON.stringify({ gen:g, pop: popN, gamesPer, best: scores[0], top5: scores.slice(0,5) }, null, 2));

    // 팀 파일 저장(스냅샷)
    saveTeamFiles(bestParams, `OMEGA_GEN${g}`);

    // 다음 세대 생성: 상위 k 생존 + 변이
    const eliteK = Math.max(2, Math.floor(popN*0.2));
    const elites = scores.slice(0, eliteK).map(s=>population[s.idx]);
    const next = [...elites];
    while (next.length < popN){
      const parent = elites[Math.floor(rand()*elites.length)];
      const child = mutateParams(parent, 0.18);
      next.push(child);
    }
    population = next;

    // 시퀀스 다양성 위해 시드 셔플/시드 교체
    seeds = seeds.map(s=> s + gamesPer);
  }

  // 최종 최고
  hall.sort((a,b)=>b.wr - a.wr);
  const champ = hall[0];
  saveTeamFiles(champ.params, 'OMEGA');

  const outDir = path.join(__dirname, '..', '.result');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g,'-');
  fs.writeFileSync(path.join(outDir, `ga_final_${ts}.json`), JSON.stringify({ best: champ }, null, 2));

  console.log('GA 완료. 최고 승률:', champ.wr);
}

main();
