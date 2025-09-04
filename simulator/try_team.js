import fs from 'fs';
import path from 'path';
import url from 'url';
import { initializeGame, step, isBattleOver, winner, Type } from './engine.js';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

function readCode(file){
  return fs.readFileSync(path.join(__dirname, '..', 'ai', file), 'utf8');
}

function extractType(code){
  if (/return\s+Type\.TANKER/.test(code)) return Type.TANKER;
  if (/return\s+Type\.DEALER/.test(code)) return Type.DEALER;
  return Type.NORMAL;
}

function runOne(players, seed){
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
  };
}

function makePlayers(ourFiles, blueCodes){
  const ourTeam = ourFiles.map(readCode);
  const players = [];
  for (let i=0;i<6;i++){
    const code = ourTeam[i];
    players.push({ id: `R${i+1}`, name: `R${i+1}`, code, team: 'red', type: extractType(code) });
  }
  for (let i=0;i<6;i++){
    const code = blueCodes[i];
    players.push({ id: `B${i+1}`, name: `B${i+1}`, code, team: 'blue', type: extractType(code) });
  }
  return players;
}

function sampleCode(name){
  return `function name(){return '${name}';}\n  function type(){return Type.NORMAL;}\n  function update(tank,enemies,allies,bulletInfo){\n    if (enemies.length>0){\n      let nearest=enemies[0];\n      for (let e of enemies){ if (e.distance<nearest.distance) nearest=e; }\n      const fireAngle=Math.atan2(nearest.y-tank.y, nearest.x-tank.x)*180/Math.PI;\n      tank.fire(fireAngle);\n      if(!tank.move(Math.random()*360)) tank.move(fireAngle+180);\n    }\n  }`;
}

async function main(){
  const args = process.argv.slice(2);
  if (args.length<1){
    console.error('usage: node simulator/try_team.js <csv 6 files> [N=100] [seedBase=1000] [blue=sample|adversary]');
    process.exit(1);
  }
  const ourFiles = args[0].split(',');
  if (ourFiles.length!==6){
    console.error('need exactly 6 files'); process.exit(1);
  }
  const N = Number.isFinite(parseInt(args[1],10)) && parseInt(args[1],10)>0 ? parseInt(args[1],10) : 100;
  const base = Number.isFinite(parseInt(args[2],10)) ? parseInt(args[2],10) : 1000;
  const mode = args[3]||'sample';

  let blueCodes = [];
  if (mode==='sample'){
    blueCodes = new Array(6).fill(0).map((_,i)=>sampleCode(`S${i+1}`));
  } else if (mode==='adversary'){
    const { adversaryPack } = await import('./adversaries.js');
    blueCodes = adversaryPack;
  } else {
    console.error('unknown mode'); process.exit(1);
  }

  let red=0, blue=0, draw=0;
  for (let i=0;i<N;i++){
    const players = makePlayers(ourFiles, blueCodes);
    const res = runOne(players, base + i);
    if (res==='red') red++; else if (res==='blue') blue++; else draw++;
  }
  const report = { total:N, ourWins:red, oppWins:blue, draws:draw, winRate: red/N };
  console.log(report);
}

main();

