#!/usr/bin/env node
// Produce per-opponent summary for the final tuned bot
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');

const WORKDIR = __dirname;
const REPO = path.resolve(WORKDIR, '..', '..');
const SIM_CLI = path.join(REPO, 'simulator', 'cli.js');

function getTimestamp(){ try { return fs.readFileSync(path.join(WORKDIR,'.timestamp'),'utf8').trim(); } catch { return path.basename(WORKDIR); } }
const TS = getTimestamp();
const OUT_FILE = path.join(REPO, 'result', TS, `${TS}.txt`);

function listOpponents(){
  const base = path.join(REPO, 'result');
  const out = [];
  for (const entry of fs.readdirSync(base)) {
    const p = path.join(base, entry);
    const st = fs.statSync(p);
    if (st.isFile() && p.endsWith('.txt')) out.push(p);
    else if (st.isDirectory()) {
      for (const f of fs.readdirSync(p)) if (f.endsWith('.txt')) out.push(path.join(p,f));
    }
  }
  return out.filter(p => path.resolve(p)!==path.resolve(OUT_FILE)).sort();
}

function nproc(){ try { return os.cpus().length; } catch { return 2; } }

function runBatch(red, blue, repeat=24, seed=202409, concurrency=Math.min(8,nproc())){
  const tmp = path.join(WORKDIR, `cmp_${path.basename(blue).replace(/\W+/g,'_')}_${repeat}.json`);
  execFileSync('node',[SIM_CLI,'--red',red,'--blue',blue,'--repeat',String(repeat),'--seed',String(seed),'--json',tmp,'--runner','secure','--fast','--concurrency',String(concurrency)],{stdio:['ignore','pipe','pipe']});
  const data = JSON.parse(fs.readFileSync(tmp,'utf8'));
  try { fs.unlinkSync(tmp); } catch {}
  const a = data.aggregate;
  return { redWins:a.redWins, blueWins:a.blueWins, draws:a.draws, matches:a.matches, avgTicks:a.avgTicks };
}

function main(){
  const opponents = listOpponents();
  const repeat = Math.max(18, Math.min(30, 4 * Math.ceil(Math.sqrt(opponents.length))));
  const conc = Math.min(8, nproc());
  const rows = [];
  let W=0,L=0,D=0,M=0;
  for (const opp of opponents){
    const r = runBatch(OUT_FILE, opp, repeat, 13579, conc);
    rows.push({ name: path.relative(REPO,opp), W:r.redWins, L:r.blueWins, D:r.draws, M:r.matches, winRate: (r.redWins/r.matches) });
    W+=r.redWins; L+=r.blueWins; D+=r.draws; M+=r.matches;
    console.log(`${path.basename(opp)} -> ${r.redWins}/${r.matches} (${(r.redWins/r.matches*100).toFixed(1)}%)`);
  }
  const lines=[];
  lines.push('\n\n## Per-Opponent Breakdown');
  lines.push('');
  lines.push('- Matches per opponent: '+repeat+', Concurrency: '+conc);
  lines.push('');
  lines.push('| Opponent | Wins | Losses | Draws | WinRate |');
  lines.push('|---|---:|---:|---:|---:|');
  for (const r of rows){
    lines.push(`| ${r.name} | ${r.W} | ${r.L} | ${r.D} | ${(r.winRate*100).toFixed(1)}% |`);
  }
  lines.push('');
  lines.push(`- Total: ${M}, Wins: ${W}, Losses: ${L}, Draws: ${D}, WinRate: ${((W/(M||1))*100).toFixed(2)}%`);
  fs.appendFileSync(path.join(WORKDIR,'RESULT.md'), lines.join('\n'));
}

if (require.main===module){ main(); }

