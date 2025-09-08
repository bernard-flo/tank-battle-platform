// 시뮬레이션 실행: 기존 결과물과 비교하여 최적 팀을 선택하고 결과물 생성
const fs = require('fs');
const path = require('path');
const { parseCodeBlocks, simulateMatch } = require('./engine');
const { makeTeam, concatTeamCode } = require('./bot_factory');

function readOpponents(resultDir, exclude) {
  const entries = fs
    .readdirSync(resultDir)
    .filter((f) => f.endsWith('.txt') && f !== exclude)
    .map((f) => ({ file: path.join(resultDir, f), mtime: fs.statSync(path.join(resultDir, f)).mtimeMs }));
  // 최신 결과 위주로 최대 5개만 사용 (시간 제한 고려)
  const files = entries.sort((a,b)=>b.mtime-a.mtime).slice(0,3).map(e=>e.file);
  return files.map((file) => {
    const code = fs.readFileSync(file, 'utf8');
    const blocks = parseCodeBlocks(code).slice(0, 6);
    // 부족하면 기본 봇으로 채움
    const filler = `function name(){return 'Filler';}\nfunction type(){return 0;}\nfunction update(tank,enemies,allies,bulletInfo){ if(enemies.length){ let n=enemies[0]; for(const e of enemies){ if(e.distance<n.distance) n=e; } const a=Math.atan2(n.y-tank.y,n.x-tank.x)*180/Math.PI; tank.fire(a); if(!tank.move(a+180)) tank.move(Math.random()*360);} }`;
    while (blocks.length < 6) blocks.push(filler);
    return { file, blocks };
  });
}

async function main() {
  const tsDir = path.basename(__dirname);
  const resultDir = path.resolve(__dirname, '..', 'result');
  if (!fs.existsSync(resultDir)) fs.mkdirSync(resultDir);
  const outFile = path.join(resultDir, `${tsDir}.txt`);

  const opponents = readOpponents(resultDir, `${tsDir}.txt`);
  if (opponents.length) {
    console.log(`[INFO] 비교 대상: ${opponents.map((o) => path.basename(o.file)).join(', ')}`);
  } else {
    console.log('[WARN] 비교 대상 결과물이 없어 자체 평가로 진행합니다.');
  }

  // 탐색 전략: 더 많은 시드 + 샘플 재현성 강화
  // 시간 제한 고려: 적당한 시드 수로 탐색 (36개)
  const seeds = Array.from({ length: 4 }, (_, i) => 17 + i * 73);
  let best = { score: -Infinity, seed: null, team: null };

  const perSeedLog = [];
  for (const seed of seeds) {
    const myTeam = makeTeam(seed);
    let total = 0;
    let games = 0;
    if (opponents.length === 0) {
      const r = simulateMatch(myTeam, myTeam, { durationMs: 8000, seed });
      total += (r.scoreRed - r.scoreBlue);
      games += 1;
    } else {
      for (const opp of opponents) {
        const r1 = simulateMatch(myTeam, opp.blocks, { durationMs: 8000, seed: seed + 1 });
        const r2 = simulateMatch(opp.blocks, myTeam, { durationMs: 8000, seed: seed + 2 });
        total += (r1.scoreRed - r1.scoreBlue);
        total += (r2.scoreBlue - r2.scoreRed);
        games += 2;
      }
    }
    const avg = total / Math.max(1, games);
    perSeedLog.push({ seed, avg });
    if (avg > best.score) best = { score: avg, seed, team: myTeam };
    console.log(`[SEED ${seed}] 평균 득점: ${avg.toFixed(2)}`);
  }

  // 결과물 파일 저장
  const finalCode = concatTeamCode(best.team);
  fs.writeFileSync(outFile, finalCode);
  console.log(`[DONE] 결과 저장: ${outFile}`);

  // 요약 저장
  const summary = {
    timestamp: tsDir,
    bestSeed: best.seed,
    bestAvgScore: Number(best.score.toFixed(3)),
    opponents: opponents.map((o) => path.basename(o.file)),
    perSeed: perSeedLog,
  };
  fs.writeFileSync(path.join(__dirname, 'summary.json'), JSON.stringify(summary, null, 2));
}

main().catch((e) => { console.error(e); process.exit(1); });
