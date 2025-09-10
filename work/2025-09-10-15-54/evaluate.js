#!/usr/bin/env node
const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const SIM = path.join(ROOT, 'simulator', 'cli.js');

const CANDIDATES = [
  { name: 'ARES-alpha', file: path.join(__dirname, 'ares_alpha.txt') },
  { name: 'ARES-beta',  file: path.join(__dirname, 'ares_beta.txt')  },
  { name: 'ARES-gamma', file: path.join(__dirname, 'ares_gamma.txt') },
];

function findCompetitors() {
  const resultDir = path.join(ROOT, 'result');
  const entries = fs.readdirSync(resultDir);
  const files = [];
  for (const e of entries) {
    const p = path.join(resultDir, e);
    try {
      const stat = fs.statSync(p);
      if (stat.isFile() && (e.endsWith('.txt') || e.endsWith('.js'))) {
        files.push(p);
      } else if (stat.isDirectory()) {
        const inner = path.join(p, `${e}.txt`);
        if (fs.existsSync(inner)) files.push(inner);
        else {
          // any .txt inside
          const sub = fs.readdirSync(p).filter(f=>f.endsWith('.txt')||f.endsWith('.js')).map(f=>path.join(p,f));
          files.push(...sub);
        }
      }
    } catch (_) {}
  }
  // De-dup and sort
  return Array.from(new Set(files)).filter(f=>fs.existsSync(f));
}

function runMatch(redFile, blueFile, repeat=30, concurrency=6) {
  return new Promise((resolve, reject) => {
    const jsonPath = path.join(__dirname, `tmp_${path.basename(blueFile).replace(/\W+/g,'_')}.json`);
    const args = [SIM, '--red', redFile, '--blue', blueFile, '--repeat', String(repeat), '--concurrency', String(concurrency), '--fast', '--runner', 'secure', '--json', jsonPath];
    execFile('node', args, { cwd: ROOT, maxBuffer: 1024*1024*10 }, (err, stdout, stderr) => {
      if (err) return reject(new Error(`Exec failed for ${path.basename(blueFile)}: ${err.message}\n${stdout}\n${stderr}`));
      let agg = null;
      try {
        const j = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
        agg = j.aggregate || j.summary;
      } catch (e) {
        return reject(new Error(`Failed to parse JSON for ${blueFile}: ${e.message}`));
      }
      resolve(agg);
    });
  });
}

async function main(){
  const competitors = findCompetitors();
  // Exclude any potential self entries by timestamp patterns in work dir name if present
  const selfTs = path.basename(__dirname);
  const filtered = competitors.filter(f => !f.includes(selfTs));
  const repeat = process.env.REPEAT ? parseInt(process.env.REPEAT,10) : 30;
  const conc   = process.env.CONC   ? parseInt(process.env.CONC,10)   : 6;

  const results = {};
  for (const cand of CANDIDATES) {
    const candRes = { total: { matches:0, redWins:0, blueWins:0, draws:0 }, vs: [] };
    console.log(`\n=== Evaluating ${cand.name} ===`);
    for (const opp of filtered) {
      process.stdout.write(`vs ${path.basename(path.dirname(opp))||'root'}:${path.basename(opp)} ... `);
      try {
        const agg = await runMatch(cand.file, opp, repeat, conc);
        candRes.total.matches += agg.matches || 1;
        candRes.total.redWins += agg.redWins || (agg.winner==='red'?1:0);
        candRes.total.blueWins += agg.blueWins || (agg.winner==='blue'?1:0);
        candRes.total.draws += agg.draws || 0;
        const winRate = (agg.redWins||0)/ (agg.matches||1);
        candRes.vs.push({ opponent: opp, aggregate: agg, winRate });
        console.log(`done. WinRate=${(winRate*100).toFixed(1)}%`);
      } catch (e) {
        console.warn(`error: ${e.message}`);
      }
    }
    // sort by worst opponents
    candRes.vs.sort((a,b)=>a.winRate-b.winRate);
    results[cand.name] = candRes;
  }

  const outPath = path.join(__dirname, 'EVAL_SUMMARY.json');
  fs.writeFileSync(outPath, JSON.stringify(results, null, 2));
  console.log(`\nSaved summary -> ${outPath}`);
}

main().catch(e=>{ console.error(e); process.exit(1); });
