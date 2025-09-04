import fs from 'fs';
import path from 'path';
import url from 'url';
import { initializeGame, step, isBattleOver, winner, Type } from './engine.js';
import { adversaryPack } from './adversaries.js';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

function readCode(file){
  return fs.readFileSync(path.join(__dirname, '..', 'ai', file), 'utf8');
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
  // blue: adversaries
  adversaryPack.forEach((code, i)=>{
    players.push({ id: `B${i+1}`, name: `ADV${i+1}` , code, team: 'blue', type: extractType(code) });
  });
  return players;
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

async function main(){
  const ourTeam = ourFiles.map(readCode);
  const argN = parseInt(process.argv[2]||'',10);
  const N = Number.isFinite(argN) && argN>0 ? argN : 100;
  const seedBase = parseInt(process.argv[3]||'',10);
  const base = Number.isFinite(seedBase) ? seedBase : 2222;
  let red=0, blue=0, draw=0;
  for (let i=0;i<N;i++){
    const players = makePlayers(ourTeam);
    const res = runOne(players, base + i);
    if (res==='red') red++; else if (res==='blue') blue++; else draw++;
  }
  const report = { total: N, ourWins: red, advWins: blue, draws: draw, winRate: red/N, seedBase: base };
  console.log(report);

  const outDir = path.join(__dirname, '..', '.result');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g,'-');
  fs.writeFileSync(path.join(outDir, `sim_adv_result_${ts}.json`), JSON.stringify(report, null, 2));
}

main();

