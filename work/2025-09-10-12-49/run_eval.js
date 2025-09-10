#!/usr/bin/env node
/* Run tournament-style evaluation vs prior results and pick best candidate. */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

function sh(cmd, args, opts={}){
  const r = spawnSync(cmd, args, { stdio: ['ignore','pipe','pipe'], ...opts });
  if(r.status!==0){
    throw new Error(`Command failed: ${cmd} ${args.join(' ')}\n${r.stderr.toString()}`);
  }
  return r.stdout.toString();
}

function readFile(p){ return fs.readFileSync(p,'utf8'); }
function writeFile(p,c){ fs.mkdirSync(path.dirname(p),{recursive:true}); fs.writeFileSync(p,c); }

function listOpponentFiles(resultDir, excludeDir){
  const files=[];
  function walk(dir){
    for(const name of fs.readdirSync(dir)){
      const full=path.join(dir,name);
      const st=fs.statSync(full);
      if(st.isDirectory()) walk(full);
      else if(st.isFile() && name.endsWith('.txt')) files.push(full);
    }
  }
  walk(resultDir);
  return files.filter(f=>!f.startsWith(excludeDir));
}

function makeCandidateVariants(baseCode){
  const variants=[];
  function tweak(num){
    // Adjust numeric fields by regex: minR/maxR/strafe/threat/avoidBias/edge/allySep/leadW
    let code=baseCode;
    function adj(pattern, fn){
      code = code.replace(pattern, (_, val)=>{
        const v = parseFloat(val);
        const nv = fn(v);
        return _.replace(val, String(nv));
      });
    }
    // More aggression
    if(num===1){
      adj(/minR:(\d+)/g, v=>Math.max(170, Math.round(v-14)));
      adj(/maxR:(\d+)/g, v=>Math.max(240, Math.round(v-12)));
      adj(/strafe:(\d+)/g, v=>Math.min(48, v+2));
    }
    // More defensive spacing
    if(num===2){
      adj(/minR:(\d+)/g, v=>Math.min(360, Math.round(v+14)));
      adj(/maxR:(\d+)/g, v=>Math.min(500, Math.round(v+16)));
      adj(/strafe:(\d+)/g, v=>Math.max(24, v-2));
    }
    // Dodge heavier
    if(num===3){
      adj(/threat:(\d+)/g, v=>Math.min(220, v+16));
      adj(/avoidBias:(-?\d+)/g, v=>Math.sign(v)===0? 14 : (v>0? v+4 : v-4));
      adj(/edge:(\d+)/g, v=>Math.min(70, v+6));
    }
    // Aim heavy
    if(num===4){
      adj(/leadW:(\d+\.?\d*)/g, v=>+(Math.min(1.2, v+0.04)).toFixed(2));
      adj(/aimJitter:(\d+\.?\d*)/g, v=>+(Math.max(0.10, v-0.04)).toFixed(2));
    }
    // Balanced alt bias
    if(num===5){
      adj(/avoidBias:(-?\d+)/g, v=>-v);
      adj(/strafe:(\d+)/g, v=>v);
      adj(/minR:(\d+)/g, v=>v);
      adj(/maxR:(\d+)/g, v=>v);
    }
    return code;
  }
  variants.push({ name:'base', code: baseCode });
  for(let i=1;i<=5;i++) variants.push({ name: 'v'+i, code: tweak(i) });
  return variants;
}

function runBatch(redFile, blueFile, repeat, seed, concurrency){
  const outPath = path.join(path.dirname(redFile), `tmp_${path.basename(redFile)}_${path.basename(blueFile)}_${repeat}.json`);
  const args = ['simulator/cli.js','--red', redFile, '--blue', blueFile, '--repeat', String(repeat), '--seed', String(seed), '--fast', '--runner', 'secure', '--concurrency', String(concurrency), '--json', outPath];
  sh('node', args, { cwd: path.resolve(__dirname, '..', '..') });
  const j = JSON.parse(fs.readFileSync(outPath,'utf8'));
  const agg = j.aggregate;
  return { redWins: agg.redWins, blueWins: agg.blueWins, draws: agg.draws, matches: agg.matches };
}

function main(){
  const cwd = __dirname;
  const projectRoot = path.resolve(cwd, '..', '..');
  const ts = path.basename(path.resolve(cwd));
  const myFile = path.resolve(projectRoot, 'result', ts, `${ts}.txt`);
  const opponents = listOpponentFiles(path.resolve(projectRoot, 'result'), path.resolve(projectRoot, 'result', ts))
    .sort((a,b)=>fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);

  // Limit opponents to speed: take up to 12 most recent .txt
  const opponentSample = opponents.slice(0, 12);
  if(opponentSample.length===0){
    console.log('No opponents found. Skipping evaluation.');
    process.exit(0);
  }

  const baseCode = readFile(myFile);
  const variants = makeCandidateVariants(baseCode);
  const tmpDir = path.resolve(projectRoot, 'work', ts, 'candidates');
  fs.mkdirSync(tmpDir, { recursive: true });
  const repeat = parseInt(process.env.REPEAT || '40', 10);
  const seed = parseInt(process.env.SEED || '1000', 10);
  const conc = parseInt(process.env.CONC || '8', 10);

  const scores = [];
  for(const v of variants){
    const candPath = path.join(tmpDir, `${v.name}.txt`);
    writeFile(candPath, v.code);
    let wins = 0, losses = 0, draws = 0, total = 0;
    for(const opp of opponentSample){
      // Our team as red
      const a = runBatch(candPath, opp, repeat, seed, conc);
      wins += a.redWins; losses += a.blueWins; draws += a.draws; total += a.matches;
      // Swap sides
      const b = runBatch(opp, candPath, repeat, seed+999, conc);
      wins += b.blueWins; losses += b.redWins; draws += b.draws; total += b.matches;
    }
    const wr = wins / Math.max(1, wins+losses);
    scores.push({ name: v.name, wins, losses, draws, total, winRate: wr, file: candPath });
    console.log(`[Candidate ${v.name}] W:${wins} L:${losses} D:${draws} WR:${(wr*100).toFixed(2)}%`);
  }

  scores.sort((a,b)=>b.winRate - a.winRate);
  const best = scores[0];
  if(best.file !== myFile){
    // Replace main output with best variant
    fs.copyFileSync(best.file, myFile);
  }

  // Write RESULT.md
  const lines=[];
  lines.push(`# Evaluation Result - ${ts}`);
  lines.push('');
  lines.push(`Opponents: ${opponentSample.length} files (most recent)`);
  lines.push(`Matches per pairing per side: ${repeat}`);
  lines.push('');
  for(const s of scores){
    lines.push(`- ${s.name}: WR ${(s.winRate*100).toFixed(2)}% (W${s.wins}/L${s.losses}/D${s.draws}, total ${s.total})`);
  }
  lines.push('');
  lines.push(`Winner: ${best.name} -> saved to result/${ts}/${ts}.txt`);
  writeFile(path.resolve(projectRoot, 'work', ts, 'RESULT.md'), lines.join('\n'));

  console.log(`\nBest: ${best.name} WR ${(best.winRate*100).toFixed(2)}%\nRESULT.md written.`);
}

if(require.main===module){
  try{ main(); } catch(e){ console.error(e); process.exit(1); }
}

