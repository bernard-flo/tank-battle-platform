#!/usr/bin/env node
/* eslint-disable no-console */
// Picks the best-performing team among recent result/*.txt and saves it as this run's final output.
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const os = require('os');
const { Worker } = require('worker_threads');

const ROOT = path.resolve(__dirname, '..', '..');
const RESULT_DIR = path.join(ROOT, 'result');
const RUN_ID = path.basename(path.resolve(__dirname));
const OUT_DIR = path.join(RESULT_DIR, RUN_ID);
const SIM_DIR = path.join(ROOT, 'simulator');

function now(){ return new Date().toISOString(); }

async function listResultFiles(limit = 16){
  const files=[];
  async function walk(dir){
    const ents = await fsp.readdir(dir,{withFileTypes:true});
    for(const e of ents){
      const p = path.join(dir, e.name);
      if(e.isDirectory()) await walk(p);
      else if(e.isFile() && e.name.endsWith('.txt')) files.push(p);
    }
  }
  await walk(RESULT_DIR);
  const withMtime = await Promise.all(files.map(async p => ({ path:p, st: await fsp.stat(p).catch(()=>null) })));
  const sorted = withMtime.filter(x=>x.st).sort((a,b)=>b.st.mtimeMs - a.st.mtimeMs).map(x=>x.path);
  return sorted.filter(p=>!p.startsWith(OUT_DIR)).slice(0, limit);
}

function chunk(arr, n){ const out=[]; for(let i=0;i<arr.length;i+=n) out.push(arr.slice(i,i+n)); return out; }

async function runBatch(redCode, blueCode, repeat = 10, maxTicks = 4000, concurrency = Math.max(1, Math.min(os.cpus().length, 8))){
  const baseSeed = Math.floor(Math.random()*1e9);
  const seeds = Array.from({length:repeat},(_,i)=>baseSeed+i);
  const workerPath = path.join(SIM_DIR, 'worker.js');
  const chunks = chunk(seeds, Math.min(concurrency, repeat)).filter(c=>c.length>0);
  const tasks = chunks.map(seedChunk => new Promise((resolve,reject)=>{
    const w = new Worker(workerPath, { workerData: { redCode, blueCode, runnerMode: 'secure', seeds: seedChunk, maxTicks, fast: true } });
    w.on('message', arr=>resolve(arr)); w.on('error', reject); w.on('exit', code=>{ if(code!==0) reject(new Error(`Worker exited ${code}`)); });
  }));
  const results = (await Promise.all(tasks)).flat();
  let red=0, blue=0, draw=0; for(const r of results){ if(r.winner==='red') red++; else if(r.winner==='blue') blue++; else draw++; }
  return { red, blue, draw, matches: results.length };
}

async function readFile(p){ return fsp.readFile(p,'utf8'); }

async function main(){
  const OPP_LIMIT = parseInt(process.env.OPP_LIMIT || '12', 10);
  const REPEAT = parseInt(process.env.REPEAT || '8', 10);
  const files = await listResultFiles(OPP_LIMIT);
  if(files.length<2){ console.error('Not enough opponent files in result/.'); process.exit(1); }

  // Evaluate each candidate vs others
  const summaries = [];
  for(let i=0;i<files.length;i++){
    const f = files[i];
    const codeA = await readFile(f);
    let wins=0, losses=0, draws=0, tests=0;
    for(let j=0;j<files.length;j++){
      if(i===j) continue;
      const g = files[j];
      const codeB = await readFile(g);
      const r = await runBatch(codeA, codeB, REPEAT);
      wins += r.red; losses += r.blue; draws += r.draw; tests += r.matches;
    }
    const eff = Math.max(1, tests - draws);
    summaries.push({ file: f, wins, losses, draws, tests, wr: wins/eff, margin: wins - losses });
    console.log(`[${i+1}/${files.length}] ${path.basename(f)} -> WR ${(wins/eff*100).toFixed(2)}% (+${wins-losses})`);
  }
  summaries.sort((a,b)=> (b.wr - a.wr) || (b.margin - a.margin));
  const best = summaries[0];
  await fsp.mkdir(OUT_DIR, { recursive: true });
  const outFile = path.join(OUT_DIR, `${RUN_ID}.txt`);
  await fsp.copyFile(best.file, outFile);

  // RESULT.md
  const lines=[]; lines.push(`# ${RUN_ID} - Champion Selection`); lines.push('');
  lines.push(`Generated at: ${now()}`); lines.push(`- Opponents considered: ${files.length}`); lines.push(`- Repeats per pairing: ${REPEAT}`); lines.push('');
  lines.push(`Champion: ${path.basename(best.file)} | WR ${(best.wr*100).toFixed(2)}% | Margin ${best.margin}`); lines.push('');
  lines.push('Leaderboard:');
  for(const s of summaries){ lines.push(`- ${path.basename(s.file)}: WR ${(s.wr*100).toFixed(2)}% | Margin ${s.margin}`); }
  await fsp.writeFile(path.join(__dirname, 'RESULT.md'), lines.join('\n'), 'utf8');
  console.log('Saved champion output to', path.relative(ROOT, outFile));
}

if(require.main===module){ main().catch(e=>{ console.error(e); process.exit(1); }); }

