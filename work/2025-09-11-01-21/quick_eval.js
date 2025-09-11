#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const SIM = path.join(ROOT, 'simulator', 'cli.js');
const WORKDIR = __dirname;

function sh(cmd) { return cp.execSync(cmd, { stdio: 'pipe', encoding: 'utf8' }); }

function findOpponents(limit=10) {
  const base = path.join(ROOT, 'result');
  const files = [];
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.name.startsWith('.')) continue;
      const p = path.join(dir, e.name);
      if (e.isDirectory()) { walk(p); continue; }
      if (!/\.(js|txt)$/i.test(e.name)) continue;
      try { const txt = fs.readFileSync(p,'utf8'); if (/function\s+name\s*\(/.test(txt)) files.push(p); } catch(_){}
    }
  };
  walk(base);
  const strong = files.filter(f=>/Nova|Stellar|Helios|Orion|Aquila|Hyperion|Vanguard/i.test(f));
  const rest = files.filter(f=>!strong.includes(f));
  const pick = strong.slice(0, Math.min(limit, strong.length));
  return pick.length<limit ? pick.concat(rest.slice(0, limit-pick.length)) : pick;
}

function buildVariants() {
  const varDir = path.join(WORKDIR, 'variants');
  const outDir = path.join(WORKDIR, 'variants_out');
  fs.mkdirSync(outDir, { recursive: true });
  const variants = fs.readdirSync(varDir).filter(f=>f.endsWith('.json')).map(f=>path.join(varDir,f));
  const built=[];
  for(const v of variants){ sh(`${path.join(WORKDIR,'build.js')} ${outDir} ${v}`); const name=JSON.parse(fs.readFileSync(v,'utf8')).name; built.push({name, file: path.join(outDir, name+'.js')}); }
  return built;
}

function runBatch(redFile, blueFile, repeat=40, concurrency=8) {
  const jsonTmp = path.join(WORKDIR, `.tmp_${Date.now()}_${Math.random().toString(36).slice(2)}.json`);
  sh(`node ${SIM} --red ${redFile} --blue ${blueFile} --repeat ${repeat} --concurrency ${concurrency} --fast --json ${jsonTmp}`);
  const js = JSON.parse(fs.readFileSync(jsonTmp,'utf8'));
  fs.unlinkSync(jsonTmp);
  return js.aggregate;
}

function main(){
  const opponents = findOpponents(parseInt(process.env.LIMIT||'10',10));
  const vars = buildVariants();
  const scores=[];
  for(const v of vars){ let wins=0, losses=0, total=0; for(const o of opponents){
      const a = runBatch(v.file, o, parseInt(process.env.REPEAT||'30',10)); wins+=a.redWins; losses+=a.blueWins; total+=a.matches;
      const b = runBatch(o, v.file, parseInt(process.env.REPEAT||'30',10)); wins+=b.blueWins; losses+=b.redWins; total+=b.matches;
    }
    scores.push({name:v.name, file:v.file, wr: wins/total});
    console.log(`VAR ${v.name}: ${(wins/total*100).toFixed(2)}% over ${opponents.length} opps`);
  }
  scores.sort((a,b)=>b.wr-a.wr);
  console.log('Best quick:', scores[0]);
}

if(require.main===module){ main(); }

