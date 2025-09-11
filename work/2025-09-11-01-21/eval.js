#!/usr/bin/env node
/*
 Evaluates AI variants against existing teams in result/.
 - Builds each variant into JS
 - Finds opponent code files (team.js or .txt) that contain function name()
 - Runs batch sims in both directions and aggregates winrates
 - Picks best variant and writes summary to RESULT.md
*/
const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const SIM = path.join(ROOT, 'simulator', 'cli.js');
const WORKDIR = __dirname;
const RESULTDIR = path.join(ROOT, 'result', path.basename(WORKDIR));

function sh(cmd, opts={}) {
  return cp.execSync(cmd, { stdio: 'pipe', encoding: 'utf8', ...opts });
}

function findOpponents() {
  const base = path.join(ROOT, 'result');
  const files = [];
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.name.startsWith('.')) continue;
      const p = path.join(dir, e.name);
      if (e.isDirectory()) { if (p !== RESULTDIR) walk(p); continue; }
      if (!/\.(js|txt)$/i.test(e.name)) continue;
      try {
        const txt = fs.readFileSync(p, 'utf8');
        if (/function\s+name\s*\(/.test(txt)) files.push(p);
      } catch (_) {}
    }
  };
  walk(base);
  // Prefer a diverse yet limited set: pick up to 24 strongest-looking by name heuristics
  const strongFirst = files.sort((a,b)=>{
    const wa = /Nova|Stellar|Helios|Aquila|Orion|Hyperion/i.test(a) ? -1 : 1;
    const wb = /Nova|Stellar|Helios|Aquila|Orion|Hyperion/i.test(b) ? -1 : 1;
    if (wa !== wb) return wa - wb;
    return a.localeCompare(b);
  });
  return strongFirst.slice(0, 24);
}

function buildVariants() {
  const varDir = path.join(WORKDIR, 'variants');
  const outDir = path.join(WORKDIR, 'variants_out');
  fs.mkdirSync(outDir, { recursive: true });
  const variants = fs.readdirSync(varDir).filter((f)=>f.endsWith('.json')).map((f)=>path.join(varDir,f));
  const built = [];
  for (const v of variants) {
    const out = sh(`${path.join(WORKDIR,'build.js')} ${outDir} ${v}`);
    const name = JSON.parse(fs.readFileSync(v,'utf8')).name;
    built.push({ name, file: path.join(outDir, name + '.js'), variantPath: v });
  }
  return built;
}

function runBatch(redFile, blueFile, repeat=80, concurrency=8) {
  const jsonTmp = path.join(WORKDIR, `.tmp_${Date.now()}_${Math.random().toString(36).slice(2)}.json`);
  const cmd = `node ${SIM} --red ${redFile} --blue ${blueFile} --repeat ${repeat} --concurrency ${concurrency} --fast --json ${jsonTmp}`;
  const out = sh(cmd);
  const js = JSON.parse(fs.readFileSync(jsonTmp, 'utf8'));
  fs.unlinkSync(jsonTmp);
  return js.aggregate;
}

function evaluate() {
  const opponents = findOpponents();
  if (opponents.length === 0) {
    console.error('No opponent teams found in result/.');
    process.exit(1);
  }
  const variants = buildVariants();
  const scoreboard = [];
  for (const v of variants) {
    let wins=0, losses=0, draws=0;
    let redWins=0, blueWins=0, total=0;
    for (const opp of opponents) {
      // Our variant as Red
      const a = runBatch(v.file, opp, 60, 8);
      redWins += a.redWins; losses += a.blueWins; draws += a.draws; wins += a.redWins; total += a.matches;
      // Our variant as Blue (swap sides)
      const b = runBatch(opp, v.file, 60, 8);
      blueWins += b.blueWins; wins += b.blueWins; losses += b.redWins; draws += b.draws; total += b.matches;
    }
    const wr = total>0 ? wins/total : 0;
    scoreboard.push({ name: v.name, file: v.file, variantPath: v.variantPath, wins, losses, draws, total, winRate: +wr.toFixed(4) });
    console.log(`Variant ${v.name}: winRate ${(wr*100).toFixed(2)}% over ${opponents.length} opponents`);
  }
  scoreboard.sort((a,b)=> b.winRate - a.winRate);
  return { scoreboard, opponents };
}

function writeResult(best, scoreboard, opponents) {
  const md = [];
  md.push(`# Evaluation Result - ${path.basename(WORKDIR)}\n`);
  md.push(`Tested ${scoreboard.length} variants against ${opponents.length} opponent teams.`);
  md.push('');
  md.push(`Best Variant: ${best.name}`);
  md.push(`- WinRate: ${(best.winRate*100).toFixed(2)}% (${best.wins}/${best.total}, draws ${best.draws})`);
  md.push(`- Source: ${path.relative(ROOT, best.variantPath)}`);
  md.push(`- Built: ${path.relative(ROOT, best.file)}`);
  md.push('');
  md.push('Top Variants:');
  for (const s of scoreboard.slice(0, 5)) {
    md.push(`- ${s.name}: ${(s.winRate*100).toFixed(2)}% (${s.wins}/${s.total}, d=${s.draws})`);
  }
  md.push('');
  md.push('Opponents considered:');
  for (const o of opponents) md.push(`- ${path.relative(ROOT, o)}`);
  fs.writeFileSync(path.join(WORKDIR, 'RESULT.md'), md.join('\n'));
}

function finalize(best) {
  // Copy the best file to result/<ts>/team.js for import into platform
  fs.copyFileSync(best.file, path.join(RESULTDIR, 'team.js'));
}

function main(){
  const { scoreboard, opponents } = evaluate();
  const best = scoreboard[0];
  writeResult(best, scoreboard, opponents);
  finalize(best);
  console.log('Best variant:', best.name, '->', path.join(RESULTDIR, 'team.js'));
}

if(require.main===module){
  main();
}

