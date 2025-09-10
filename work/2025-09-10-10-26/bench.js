#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const { Type, runMatch } = require('../../simulator/engine');
const { compileTeamFromCode } = require('../../simulator/bot_loader');
const { buildTeamCode } = require('./team_builder');

function rosterHermes(prefix='Hermes') {
  const P = { rMin: 260, rMax: 370, strafe: 28, threatR: 130, fleeBias: 12, sep: 70, edge: 60, leadCap: 16, leadW: 0.9, aimJitter: 0.10, healthW: 1.15, distW: 0.22, finisherHP: 40, aggrRemain: 5, aggrIn: 14, aggrOut: 20, bias: 0 };
  const mk = (name, biasSeed, bias) => ({ name, type: Type.DEALER, P: { ...P, bias }, biasSeed });
  return [mk(`${prefix}-D1`, 1, -10), mk(`${prefix}-D2`, 2, 10), mk(`${prefix}-D3`, 3, -6), mk(`${prefix}-D4`, 4, 6), mk(`${prefix}-D5`, 5, -2), mk(`${prefix}-D6`, 6, 2)];
}
function rosterBulwark(prefix='Bulwark') {
  const P = { rMin: 170, rMax: 250, strafe: 34, threatR: 170, fleeBias: 16, sep: 64, edge: 58, leadCap: 12, leadW: 0.95, aimJitter: 0.16, healthW: 1.1, distW: 0.16, finisherHP: 22, aggrRemain: 4, aggrIn: 24, aggrOut: 16, bias: -8 };
  const mk = (name, biasSeed, bias) => ({ name, type: Type.TANKER, P: { ...P, bias }, biasSeed });
  return [mk(`${prefix}-T1`, 1, -14), mk(`${prefix}-T2`, 2, 14), mk(`${prefix}-T3`, 3, -8), mk(`${prefix}-T4`, 4, 8), mk(`${prefix}-T5`, 5, -4), mk(`${prefix}-T6`, 6, 4)];
}
function rosterChimera(prefix='Chimera') {
  const Pt = { rMin: 190, rMax: 280, strafe: 32, threatR: 160, fleeBias: 15, sep: 66, edge: 56, leadCap: 12, leadW: 0.92, aimJitter: 0.18, healthW: 1.1, distW: 0.18, finisherHP: 24, aggrRemain: 4, aggrIn: 24, aggrOut: 18, bias: -6 };
  const Pd = { rMin: 235, rMax: 340, strafe: 28, threatR: 130, fleeBias: 12, sep: 66, edge: 56, leadCap: 16, leadW: 0.88, aimJitter: 0.12, healthW: 1.2, distW: 0.2, finisherHP: 30, aggrRemain: 5, aggrIn: 20, aggrOut: 20, bias: 6 };
  return [
    { name: `${prefix}-T1`, type: Type.TANKER, P: { ...Pt, bias: -12 }, biasSeed: 1 },
    { name: `${prefix}-T2`, type: Type.TANKER, P: { ...Pt, bias: +12 }, biasSeed: 2 },
    { name: `${prefix}-D3`, type: Type.DEALER, P: { ...Pd, bias: -6 }, biasSeed: 3 },
    { name: `${prefix}-D4`, type: Type.DEALER, P: { ...Pd, bias: +6 }, biasSeed: 4 },
    { name: `${prefix}-D5`, type: Type.DEALER, P: { ...Pd, bias: -2 }, biasSeed: 5 },
    { name: `${prefix}-D6`, type: Type.DEALER, P: { ...Pd, bias: +2 }, biasSeed: 6 },
  ];
}

function compile(redCode, blueCode) {
  const red = compileTeamFromCode(redCode, 'red', 'secure');
  const blue = compileTeamFromCode(blueCode, 'blue', 'secure');
  return [...red, ...blue];
}

function evalWR(redCode, blueCode, repeat = 40, baseSeed = 777) {
  let redWins = 0, blueWins = 0; let draws = 0;
  for (let i = 0; i < repeat; i++) {
    const seed = baseSeed + i;
    const res = runMatch(compile(redCode, blueCode), { seed, fast: true, maxTicks: 4000 });
    if (res.winner === 'red') redWins++; else if (res.winner === 'blue') blueWins++; else draws++;
  }
  return { redWins, blueWins, draws, winRate: redWins / repeat };
}

function loadCompetitors(ROOT) {
  const resultDir = path.join(ROOT, 'result');
  const files = [];
  for (const ent of fs.readdirSync(resultDir, { withFileTypes: true })) {
    if (ent.isFile() && ent.name.endsWith('.txt')) files.push(path.join(resultDir, ent.name));
    if (ent.isDirectory()) {
      const dir = path.join(resultDir, ent.name);
      for (const f of fs.readdirSync(dir)) if (f.endsWith('.txt')) files.push(path.join(dir, f));
    }
  }
  files.sort((a,b)=>fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
  return files.slice(0,6).map((p)=>({ path:p, code:fs.readFileSync(p,'utf8') }));
}

function main(){
  const ROOT = path.resolve(__dirname, '..', '..');
  const comps = loadCompetitors(ROOT);
  console.log('Testing against:', comps.map(c=>path.basename(path.dirname(c.path))).join(', '));
  const teams = [
    { name:'Hermes-6D', code: buildTeamCode({ roster: rosterHermes() }) },
    { name:'Bulwark-6T', code: buildTeamCode({ roster: rosterBulwark() }) },
    { name:'Chimera-2T4D', code: buildTeamCode({ roster: rosterChimera() }) },
  ];
  for(const t of teams){
    let score=0; let beaten=0;
    console.log(`\nTeam ${t.name}`);
    for(const c of comps){
      const r = evalWR(t.code, c.code, 30, 1010);
      console.log(` vs ${path.basename(path.dirname(c.path))}: ${r.redWins}/${r.blueWins}/${r.draws} wr=${(r.winRate).toFixed(3)}`);
      score += r.winRate; if(r.redWins>r.blueWins) beaten++;
    }
    console.log(` -> score=${score.toFixed(3)} beaten=${beaten}/${comps.length}`);
  }
}

if (require.main === module) main();

