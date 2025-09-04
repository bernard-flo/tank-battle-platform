import fs from 'fs';
import path from 'path';
import url from 'url';
import { initializeGame, step, isBattleOver, winner, Type } from './engine.js';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

function readCode(file){
  return fs.readFileSync(path.join(__dirname, '..', 'ai', file), 'utf8');
}

function sampleCode(name){
  return `function name(){return '${name}';}
  function type(){return Type.NORMAL;}
  function update(tank,enemies,allies,bulletInfo){
    if (enemies.length>0){
      let nearest=enemies[0];
      for (let e of enemies){ if (e.distance<nearest.distance) nearest=e; }
      const fireAngle=Math.atan2(nearest.y-tank.y, nearest.x-tank.x)*180/Math.PI;
      tank.fire(fireAngle);
      if(!tank.move(Math.random()*360)) tank.move(fireAngle+180);
    }
  }`;
}

const ourFiles = [
  'alpha_bulldozer.js',
  'bravo_striker.js',
  'charlie_sweeper.js',
  'delta_guardian.js',
  'echo_interceptor.js',
  'golf_anchor.js'
];

function makePlayers(ourTeam){
  const players = [];
  // red: our bots
  for (let i=0;i<6;i++){
    const code = ourTeam[i];
    players.push({ id: `R${i+1}`, name: `R${i+1}`, code, team: 'red', type: extractType(code) });
  }
  // blue: sample bots
  for (let i=0;i<6;i++){
    const code = sampleCode(`SampleB${i+1}`);
    players.push({ id: `B${i+1}`, name: `B${i+1}`, code, team: 'blue', type: extractType(code) });
  }
  return players;
}

function extractType(code){
  // 실행하지 않고 간단 파싱: type() { return Type.X; }
  if (/return\s+Type\.TANKER/.test(code)) return Type.TANKER;
  if (/return\s+Type\.DEALER/.test(code)) return Type.DEALER;
  return Type.NORMAL;
}

function runOne(players, seed){
  // 간단 시드: Math.random을 대체 (결과 재현 목표 아님)
  const prng = mulberry32(seed);
  const _rand = Math.random; Math.random = prng;
  initializeGame(players);
  let now = 0; const dt = 50; const maxTicks = 6000;
  for (let t=0;t<maxTicks;t++){
    step(now);
    if (isBattleOver()) break;
    now += dt;
  }
  const w = winner();
  Math.random = _rand;
  return w;
}

function mulberry32(a){
  return function(){
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
}

async function main(){
  const ourTeam = ourFiles.map(readCode);
  const argN = parseInt(process.argv[2]||'',10);
  const N = Number.isFinite(argN) && argN>0 ? argN : 50;
  const seedBase = parseInt(process.argv[3]||'',10);
  const base = Number.isFinite(seedBase) ? seedBase : 1234;
  let red=0, blue=0, draw=0;
  for (let i=0;i<N;i++){
    const players = makePlayers(ourTeam);
    const res = runOne(players, base + i);
    if (res==='red') red++; else if (res==='blue') blue++; else draw++;
  }
  const report = { total: N, ourWins: red, sampleWins: blue, draws: draw, winRate: red/N, seedBase: base };
  console.log(report);

  // 결과 저장
  const outDir = path.join(__dirname, '..', '.result');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g,'-');
  fs.writeFileSync(path.join(outDir, `sim_result_${ts}.json`), JSON.stringify(report, null, 2));
}

main();
