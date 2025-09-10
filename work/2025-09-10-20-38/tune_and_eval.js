#!/usr/bin/env node
/* Tune and evaluate team candidates against existing results. */
const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const { generateTeam } = require('./build_team');

function sh(cmd, opts={}){ return cp.execSync(cmd, { stdio: 'pipe', encoding: 'utf8', ...opts }); }

const ROOT = path.resolve(__dirname, '..', '..');
const SIM = path.join(ROOT, 'simulator', 'cli.js');
const WD = __dirname;

function listCompetitors(limit=12){
  const all = sh(`bash -lc "find ${path.join(ROOT,'result')} -type f -name '*.txt' -printf '%p\n' | sort"`).trim().split(/\n/).filter(Boolean);
  // Prefer most recent ones
  const last = all.slice(-limit);
  return last;
}

function writeCandidate(name, cfg){
  const code = generateTeam(cfg);
  const out = path.join(WD, 'candidates', `${name}.txt`);
  fs.writeFileSync(out, code);
  return out;
}

function runBatch(redFile, blueFile, repeat=40){
  const outJson = path.join(WD, 'candidates', `result_${path.basename(redFile,'.txt')}_vs_${path.basename(path.dirname(blueFile))||'root'}_${path.basename(blueFile,'.txt')}.json`);
  const cmd = [
    'node', SIM,
    '--red', redFile,
    '--blue', blueFile,
    '--repeat', String(repeat),
    '--seed', '777',
    '--fast',
    '--runner', 'secure',
    '--concurrency', String(Math.min(8, require('os').cpus().length)),
    '--json', outJson,
  ];
  const out = sh(cmd.map((x)=>String(x)).join(' '));
  let data = null;
  try{ data = JSON.parse(fs.readFileSync(outJson,'utf8')); }catch(e){ data=null; }
  if(!data || !data.aggregate) throw new Error('No aggregate from '+outJson+'\n'+out);
  return data.aggregate;
}

function evaluateCandidate(candFile, competitors){
  let wins=0, losses=0, draws=0, matches=0;
  const perOpponent=[];
  for(const opp of competitors){
    const agg = runBatch(candFile, opp, 40);
    wins += agg.redWins; losses += agg.blueWins; draws += agg.draws; matches += agg.matches;
    perOpponent.push({ opponent: opp, redWins: agg.redWins, blueWins: agg.blueWins, draws: agg.draws });
  }
  const winRate = wins / Math.max(1, wins+losses) * 100;
  return { wins, losses, draws, matches, winRate, perOpponent };
}

function main(){
  const competitors = listCompetitors(14);
  if (competitors.length === 0) throw new Error('No competitors found in result/.');
  console.log('Competitors:', competitors.map((p)=>path.relative(ROOT,p)).join(', '));

  const candidates = [];
  // Base
  candidates.push({ name: 'nova_base', cfg: { teamName: 'Nova-Prime' } });
  // Aggressive
  candidates.push({ name: 'nova_agg', cfg: { teamName: 'Nova-Agg', base: { minRange: undefined } } });
  // Defensive (more spacing and dodge)
  candidates.push({ name: 'nova_def', cfg: { teamName: 'Nova-Def', Ptype: {
    TANKER: { leadCap:14, leadWeight:1.0, aimJitter:0.18, minRange:170,maxRange:280,strafeAngle:26,strafePeriod:14, threatRadius:175,threatFleeBias:16,maxThreatTime:18,timeWeight:5.0, allySep:66,edgeMargin:50,bias:-8, targetHealthWeight:1.3,targetDistWeight:0.1, finishHp:26,finishRemain:3,finishMinDelta:38,finishMaxDelta:26 },
    NORMAL: { leadCap:14, leadWeight:1.0, aimJitter:0.18, minRange:200,maxRange:320,strafeAngle:28,strafePeriod:12, threatRadius:165,threatFleeBias:16,maxThreatTime:18,timeWeight:5.0, allySep:64,edgeMargin:50,bias:6, targetHealthWeight:1.28,targetDistWeight:0.1, finishHp:24,finishRemain:3,finishMinDelta:34,finishMaxDelta:24 },
    DEALER: { leadCap:16, leadWeight:1.06, aimJitter:0.14, minRange:240,maxRange:390,strafeAngle:36,strafePeriod:10, threatRadius:158,threatFleeBias:16,maxThreatTime:20,timeWeight:5.5, allySep:64,edgeMargin:50,bias:-2, targetHealthWeight:1.35,targetDistWeight:0.1, finishHp:22,finishRemain:3,finishMinDelta:36,finishMaxDelta:26 },
  }}});
  // High lead weight (better prediction)
  candidates.push({ name: 'nova_lead_hi', cfg: { teamName: 'Nova-LeadHi', Ptype: {
    TANKER: { leadCap:16, leadWeight:1.08, aimJitter:0.16, minRange:150,maxRange:250,strafeAngle:28,strafePeriod:14, threatRadius:165,threatFleeBias:14,maxThreatTime:16,timeWeight:4.0, allySep:64,edgeMargin:46,bias:-10, targetHealthWeight:1.30,targetDistWeight:0.10, finishHp:25,finishRemain:3,finishMinDelta:35,finishMaxDelta:25 },
    NORMAL: { leadCap:16, leadWeight:1.08, aimJitter:0.16, minRange:185,maxRange:305,strafeAngle:28,strafePeriod:12, threatRadius:158,threatFleeBias:14,maxThreatTime:16,timeWeight:4.0, allySep:62,edgeMargin:46,bias:6, targetHealthWeight:1.28,targetDistWeight:0.10, finishHp:24,finishRemain:3,finishMinDelta:32,finishMaxDelta:24 },
    DEALER: { leadCap:18, leadWeight:1.10, aimJitter:0.14, minRange:225,maxRange:370,strafeAngle:34,strafePeriod:10, threatRadius:150,threatFleeBias:14,maxThreatTime:18,timeWeight:5.0, allySep:62,edgeMargin:46,bias:-2, targetHealthWeight:1.35,targetDistWeight:0.10, finishHp:22,finishRemain:3,finishMinDelta:36,finishMaxDelta:26 },
  }}});
  // Low lead weight (safer vs erratic)
  candidates.push({ name: 'nova_lead_lo', cfg: { teamName: 'Nova-LeadLo', Ptype: {
    TANKER: { leadCap:12, leadWeight:0.94, aimJitter:0.22, minRange:155,maxRange:255,strafeAngle:26,strafePeriod:14, threatRadius:170,threatFleeBias:14,maxThreatTime:16,timeWeight:4.5, allySep:64,edgeMargin:46,bias:-8, targetHealthWeight:1.30,targetDistWeight:0.10, finishHp:26,finishRemain:3,finishMinDelta:36,finishMaxDelta:26 },
    NORMAL: { leadCap:12, leadWeight:0.94, aimJitter:0.22, minRange:190,maxRange:310,strafeAngle:26,strafePeriod:12, threatRadius:160,threatFleeBias:14,maxThreatTime:16,timeWeight:4.5, allySep:62,edgeMargin:46,bias:6, targetHealthWeight:1.28,targetDistWeight:0.10, finishHp:24,finishRemain:3,finishMinDelta:32,finishMaxDelta:24 },
    DEALER: { leadCap:14, leadWeight:0.96, aimJitter:0.20, minRange:230,maxRange:375,strafeAngle:32,strafePeriod:10, threatRadius:152,threatFleeBias:14,maxThreatTime:18,timeWeight:5.0, allySep:62,edgeMargin:46,bias:-2, targetHealthWeight:1.35,targetDistWeight:0.10, finishHp:22,finishRemain:3,finishMinDelta:36,finishMaxDelta:26 },
  }}});
  // Wide strafe
  candidates.push({ name: 'nova_wide_strafe', cfg: { teamName: 'Nova-Wide', Ptype: {
    TANKER: { leadCap:14, leadWeight:1.0, aimJitter:0.18, minRange:150,maxRange:250,strafeAngle:34,strafePeriod:12, threatRadius:165,threatFleeBias:14,maxThreatTime:16,timeWeight:4.0, allySep:64,edgeMargin:46,bias:-10, targetHealthWeight:1.30,targetDistWeight:0.10, finishHp:25,finishRemain:3,finishMinDelta:35,finishMaxDelta:25 },
    NORMAL: { leadCap:14, leadWeight:1.0, aimJitter:0.18, minRange:185,maxRange:305,strafeAngle:34,strafePeriod:10, threatRadius:158,threatFleeBias:14,maxThreatTime:16,timeWeight:4.0, allySep:62,edgeMargin:46,bias:6, targetHealthWeight:1.28,targetDistWeight:0.10, finishHp:24,finishRemain:3,finishMinDelta:32,finishMaxDelta:24 },
    DEALER: { leadCap:16, leadWeight:1.05, aimJitter:0.16, minRange:225,maxRange:370,strafeAngle:38,strafePeriod:8,  threatRadius:150,threatFleeBias:14,maxThreatTime:18,timeWeight:5.0, allySep:62,edgeMargin:46,bias:-2, targetHealthWeight:1.35,targetDistWeight:0.10, finishHp:22,finishRemain:3,finishMinDelta:36,finishMaxDelta:26 },
  }}});

  const results=[];
  for(const cand of candidates){
    const file = writeCandidate(cand.name, cand.cfg);
    console.log('Evaluating', cand.name);
    const res = evaluateCandidate(file, competitors);
    results.push({ name: cand.name, file, ...res });
    console.log(' -> winRate:', res.winRate.toFixed(2)+'%', 'W/L/D', res.wins, res.losses, res.draws);
  }

  results.sort((a,b)=>b.winRate - a.winRate);
  const best = results[0];
  console.log('BEST:', best.name, best.winRate.toFixed(2)+'%');

  // Save final output to result/<ts>/<ts>.txt
  const ts = path.basename(WD);
  const outDir = path.join(ROOT, 'result', ts);
  fs.mkdirSync(outDir, { recursive: true });
  const finalPath = path.join(outDir, `${ts}.txt`);
  fs.copyFileSync(best.file, finalPath);

  // Compose RESULT.md
  const lines=[];
  lines.push(`# RESULT ${ts}`);
  lines.push('');
  lines.push(`Best Candidate: ${best.name}`);
  lines.push(`WinRate: ${best.winRate.toFixed(2)}%  (W/L/D: ${best.wins}/${best.losses}/${best.draws}, Matches: ${best.matches})`);
  lines.push('');
  lines.push('Compared against:');
  for(const p of competitors){ lines.push(`- ${path.relative(ROOT,p)}`); }
  lines.push('');
  lines.push('Per-candidate summary:');
  for(const r of results){ lines.push(`- ${r.name}: ${r.winRate.toFixed(2)}% (W/L/D: ${r.wins}/${r.losses}/${r.draws})`); }
  fs.writeFileSync(path.join(WD, 'RESULT.md'), lines.join('\n'));

  console.log('Saved final team to', path.relative(ROOT, finalPath));
  console.log('Saved summary to', path.relative(ROOT, path.join(WD,'RESULT.md')));
}

if(require.main===module){
  main();
}
