#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const CLI = path.join(ROOT, 'simulator', 'cli.js');
const WORKDIR = __dirname;
const OUR = path.join(WORKDIR, 'team.js');

function sh(cmd, opts={}){
  return cp.execSync(cmd, { stdio: 'pipe', encoding: 'utf8', ...opts });
}

function findOpponents(){
  const resDir = path.join(ROOT, 'result');
  // Collect timestamp .txt files both in result root and subdirs
  const files = [];
  for(const entry of fs.readdirSync(resDir)){
    const p = path.join(resDir, entry);
    try{
      const st = fs.statSync(p);
      if(st.isFile() && entry.endsWith('.txt')) files.push(p);
      else if(st.isDirectory()){
        const inner = path.join(p, `${entry}.txt`);
        if(fs.existsSync(inner)) files.push(inner);
        else{
          // any .txt inside
          for(const f of fs.readdirSync(p)){
            if(f.endsWith('.txt')) files.push(path.join(p, f));
          }
        }
      }
    }catch(_e){}
  }
  // remove our path if present
  const ourDirName = path.basename(WORKDIR);
  const ourOut = path.join(resDir, ourDirName, `${ourDirName}.txt`);
  const unique = Array.from(new Set(files.filter(f => path.resolve(f) !== path.resolve(ourOut))));
  // Sort by mtime desc
  unique.sort((a,b)=>fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
  return unique;
}

function runBatch(red, blue, repeat=120, concurrency=8){
  const tmp = path.join(WORKDIR, `.out_${Date.now()}_${Math.random().toString(36).slice(2)}.json`);
  const cmd = `node ${CLI} --red ${red} --blue ${blue} --repeat ${repeat} --concurrency ${concurrency} --seed 424242 --fast --runner secure --json ${tmp}`;
  const out = sh(cmd, { cwd: ROOT });
  const data = JSON.parse(fs.readFileSync(tmp, 'utf8'));
  fs.unlinkSync(tmp);
  const agg = data.aggregate;
  return { out: out.trim(), agg };
}

function evalVs(file){
  const a = runBatch(OUR, file);
  const b = runBatch(file, OUR);
  return {
    file,
    red: a.agg,
    blue: b.agg,
    score: (a.agg.redWins + b.agg.blueWins) - (a.agg.blueWins + b.agg.redWins),
  };
}

function mutateParams(code){
  // Slightly perturb numeric literals inside P={...} blocks by +/- up to 8%
  return code.replace(/(P\s*=\s*\{[\s\S]*?\})/g, (block)=>{
    return block.replace(/(\b\d+\.?\d*)/g, (m)=>{
      const v = parseFloat(m); if(!isFinite(v)) return m;
      const jitter = 1 + (Math.random()*0.16 - 0.08);
      const nv = Math.max(0, +(v*jitter).toFixed(2));
      return String(nv);
    });
  });
}

function loadBase(){
  return fs.readFileSync(OUR, 'utf8');
}

function saveCandidate(idx, code){
  const p = path.join(WORKDIR, `candidate_${idx}.js`);
  fs.writeFileSync(p, code);
  return p;
}

function pickSample(opps, max=8){
  // Prefer recent diverse opponents
  const list = opps.slice(0, max);
  return list;
}

(async function main(){
  console.log('Finding opponents...');
  const opponents = findOpponents();
  if(opponents.length === 0){
    console.log('No opponents found. Exiting.');
    process.exit(0);
  }
  const sample = pickSample(opponents, 10);
  console.log('Sample opponents:', sample.map(s=>path.basename(path.dirname(s))+'/' + path.basename(s)).join(', '));

  const base = loadBase();
  let best = { idx: 'base', code: base, score: -1e9, details: [] };

  function scoreTeam(teamPath){
    let total = 0; const details = [];
    for(const opp of sample){
      const r = evalVs(opp);
      const s = r.score;
      total += s;
      details.push({ opp, s, red: r.red, blue: r.blue });
      console.log(` vs ${path.basename(opp)} => score ${s} (redWins ${r.red.redWins} / blueWins ${r.blue.blueWins})`);
    }
    return { total, details };
  }

  console.log('Evaluating base...');
  const baseRes = scoreTeam(OUR);
  best = { idx: 'base', code: base, score: baseRes.total, details: baseRes.details };

  // Generate and test candidates
  const CAND = 5;
  for(let i=1;i<=CAND;i++){
    console.log(`\nTesting candidate ${i}...`);
    const candCode = mutateParams(base);
    const candPath = saveCandidate(i, candCode);
    const r = scoreTeam(candPath);
    if(r.total > best.score){
      best = { idx: i, code: candCode, score: r.total, details: r.details };
    }
  }

  // If best is not base, adopt it as final team
  const outName = path.basename(WORKDIR);
  const outPath = path.join(ROOT, 'result', outName, `${outName}.txt`);
  if(best.idx !== 'base'){
    fs.writeFileSync(OUR, best.code);
    fs.writeFileSync(outPath, best.code);
  }

  // Write RESULT.md
  const md = [];
  md.push(`# Evaluation Result for ${outName}`);
  md.push('');
  md.push(`Final variant: ${best.idx}`);
  md.push(`Total score vs sample: ${best.score}`);
  md.push('');
  for(const d of best.details){
    const bn = path.basename(d.opp);
    md.push(`- ${bn}: score ${d.s}, redWins ${d.red.redWins}, blueWins ${d.blue.blueWins}, draws ${d.red.draws + d.blue.draws}`);
  }
  fs.writeFileSync(path.join(WORKDIR, 'RESULT.md'), md.join('\n'));

  console.log('\nDone. Best:', best.idx, 'Score:', best.score);
})();
