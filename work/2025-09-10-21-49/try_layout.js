#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { generateTeamCode } = require('./agent_template');
const botLoader = require('../../simulator/bot_loader');
const engine = require('../../simulator/engine');

function listOpponents(root){
  const out=[];
  const entries = fs.readdirSync(root, { withFileTypes: true });
  for(const ent of entries){
    if(ent.isFile() && ent.name.endsWith('.txt')){
      out.push(path.join(root, ent.name));
    } else if(ent.isDirectory()){
      const dir = path.join(root, ent.name);
      const txt = path.join(dir, `${ent.name}.txt`);
      if(fs.existsSync(txt)) out.push(txt);
      for(const f of fs.readdirSync(dir)){
        if(f.endsWith('.txt')) out.push(path.join(dir, f));
      }
    }
  }
  return Array.from(new Set(out));
}

function runSeries(redCode, blueCode, repeat=6){
  const red = botLoader.compileTeamFromCode(redCode, 'red', 'secure');
  const blue = botLoader.compileTeamFromCode(blueCode, 'blue', 'secure');
  let redWins=0, blueWins=0, draws=0;
  let redEnergy=0, blueEnergy=0;
  let ticks=0;
  const players=[...red,...blue];
  for(let i=0;i<repeat;i++){
    const res = engine.runMatch(players, { seed: 3000+i, maxTicks: 4500, fast: true });
    if(res.winner==='red') redWins++; else if(res.winner==='blue') blueWins++; else draws++;
    redEnergy += res.stats.redEnergy;
    blueEnergy += res.stats.blueEnergy;
    ticks += res.ticks;
  }
  return { redWins, blueWins, draws, avgTicks: ticks/repeat, avgRedEnergy: redEnergy/repeat, avgBlueEnergy: blueEnergy/repeat };
}

function main(){
  const preset = process.env.PRESET || 'allD';
  const ts = path.basename(__dirname);
  const projectRoot = path.resolve(__dirname, '..', '..');
  const opponents = listOpponents(path.join(projectRoot, 'result')).filter(p=>!p.includes(ts));

  const configs = {
    allD: {
      names: ['Rapier-1','Rapier-2','Rapier-3','Rapier-4','Rapier-5','Rapier-6'],
      layout: ['DEALER','DEALER','DEALER','DEALER','DEALER','DEALER'],
      biases: [ -8, 8, -10, 10, -6, 6 ],
      params: {
        TANKER: { minRange:180, maxRange:300, strafeAngle:26, threatRadius:170, leadWeight:1.0, aimJitter:0.1, targetHealthWeight:1.3, targetDistWeight:0.1 },
        NORMAL: { minRange:210, maxRange:330, strafeAngle:30, threatRadius:162, leadWeight:1.0, aimJitter:0.12, targetHealthWeight:1.3, targetDistWeight:0.1 },
        DEALER: { minRange:255, maxRange:420, strafeAngle:36, threatRadius:158, leadWeight:1.01, aimJitter:0.08, targetHealthWeight:1.35, targetDistWeight:0.08 },
      }
    },
    oneT_fourD: {
      names: ['Vanguard','Skirm-1','Skirm-2','Skirm-3','Skirm-4','Anchor'],
      layout: ['TANKER','DEALER','DEALER','DEALER','DEALER','NORMAL'],
      biases: [ -12, -6, 6, -4, 8, 4 ],
      params: {
        TANKER: { minRange:170, maxRange:290, strafeAngle:24, threatRadius:175, leadWeight:0.99, aimJitter:0.12, targetHealthWeight:1.3, targetDistWeight:0.09 },
        NORMAL: { minRange:210, maxRange:330, strafeAngle:30, threatRadius:162, leadWeight:0.99, aimJitter:0.12, targetHealthWeight:1.3, targetDistWeight:0.1 },
        DEALER: { minRange:250, maxRange:410, strafeAngle:35, threatRadius:158, leadWeight:1.01, aimJitter:0.08, targetHealthWeight:1.35, targetDistWeight:0.08 },
      }
    }
  };

  const cfg = configs[preset];
  const code = generateTeamCode(cfg);

  let W=0,L=0,D=0;
  for(const opp of opponents){
    const blueCode = fs.readFileSync(opp, 'utf8');
    const r = runSeries(code, blueCode, 6);
    W += r.redWins; L += r.blueWins; D += r.draws;
  }
  console.log('Preset', preset, 'vs', opponents.length, 'opponents =>', 'W/L/D=', W, L, D);

  // Save if better
  const outDir = path.join(projectRoot, 'result', ts);
  if(!fs.existsSync(outDir)) fs.mkdirSync(outDir, {recursive:true});
  fs.writeFileSync(path.join(outDir, `${ts}.txt`), code, 'utf8');
  fs.writeFileSync(path.join(__dirname, 'RESULT.md'), `# RESULT for ${ts}\n\nPreset ${preset} aggregate W/L/D = ${W}/${L}/${D} vs ${opponents.length} opponents.`, 'utf8');
}

if(require.main===module){
  main();
}
