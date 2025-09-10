// Build team, simulate vs recent opponents, and write RESULT.md
// Usage: node evaluate.js

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const WORK = __dirname;
const RESULT_DIR = path.join(ROOT, 'result');

function sh(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: 'inherit', cwd: ROOT, ...opts });
    p.on('exit', (code) => {
      if (code === 0) resolve(); else reject(new Error(cmd + ' exited ' + code));
    });
  });
}

async function runCli(redPath, bluePath, outJson, opts = {}) {
  const args = [
    'simulator/cli.js',
    '--red', redPath,
    '--blue', bluePath,
    '--repeat', String(opts.repeat || 60),
    '--seed', String(opts.seed || 1001),
    '--concurrency', String(opts.concurrency || 8),
    '--runner', opts.runner || 'secure',
    '--fast',
    '--json', outJson,
  ];
  await sh('node', args);
}

function listRecentOpponentTxt(max = 12, excludePath) {
  const entries = fs.readdirSync(RESULT_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => ({ name: d.name, mtime: fs.statSync(path.join(RESULT_DIR, d.name)).mtime }))
    .sort((a, b) => b.mtime - a.mtime);

  const files = [];
  for (const e of entries) {
    const d = path.join(RESULT_DIR, e.name);
    if (excludePath && path.resolve(d) === path.resolve(excludePath)) continue;
    const txts = fs.readdirSync(d).filter(f => f.endsWith('.txt'));
    if (txts.length > 0) files.push(path.join(d, txts[0]));
    if (files.length >= max) break;
  }
  return files;
}

function readAggregate(jsonPath) {
  try {
    const raw = fs.readFileSync(jsonPath, 'utf8');
    const data = JSON.parse(raw);
    return data.aggregate;
  } catch (e) {
    return null;
  }
}

async function main() {
  const ts = fs.readFileSync(path.join(WORK, 'TIMESTAMP'), 'utf8').trim();
  const outTeamPath = path.join(RESULT_DIR, ts, `${ts}.txt`);

  // 1) Build team file
  await sh('node', [path.join(WORK, 'build_team.js'), outTeamPath]);

  // 2) Evaluate vs recent opponents
  const oppList = listRecentOpponentTxt(12, path.join(RESULT_DIR, ts));
  const summary = [];

  for (const opp of oppList) {
    const oppBase = path.basename(path.dirname(opp));
    const jsonOut = path.join(RESULT_DIR, ts, `result_${oppBase}_js_60.json`);
    await runCli(outTeamPath, opp, jsonOut, { repeat: 60, seed: 4242, concurrency: 8, runner: 'secure' });
    const agg = readAggregate(jsonOut);
    if (agg) {
      summary.push({ opponent: oppBase, matches: agg.matches, wins: agg.redWins, losses: agg.blueWins, draws: agg.draws, avgTicks: agg.avgTicks });
    } else {
      summary.push({ opponent: oppBase, error: true });
    }
  }

  // 3) Write RESULT.md
  let md = `# Evaluation Result for ${ts}\n\n`;
  md += `Team file: result/${ts}/${ts}.txt\n\n`;
  md += `Compared against ${summary.length} recent opponents (60 matches each).\n\n`;
  md += `| Opponent | Wins | Losses | Draws | WinRate | AvgTicks |\n`;
  md += `|---|---:|---:|---:|---:|---:|\n`;
  let totalWins=0,totalLoss=0,totalDraw=0,totalMatch=0;
  for (const s of summary) {
    if (s.error) { md += `| ${s.opponent} | - | - | - | - | - |\n`; continue; }
    const wr = s.matches ? (s.wins / s.matches) : 0;
    totalWins+=s.wins; totalLoss+=s.losses; totalDraw+=s.draws; totalMatch+=s.matches;
    md += `| ${s.opponent} | ${s.wins} | ${s.losses} | ${s.draws} | ${(wr*100).toFixed(1)}% | ${s.avgTicks.toFixed(1)} |\n`;
  }
  const overall = totalMatch ? (totalWins/totalMatch) : 0;
  md += `\n**Overall:** ${totalWins}-${totalLoss}-${totalDraw} across ${totalMatch} matches (WinRate ${(overall*100).toFixed(1)}%).\n`;

  fs.writeFileSync(path.join(WORK, 'RESULT.md'), md);
  console.log('Wrote RESULT.md');
}

main().catch(err => { console.error(err); process.exit(1); });

