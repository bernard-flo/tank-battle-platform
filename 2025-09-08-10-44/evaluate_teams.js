/*
  result 디렉토리 내 기존 팀들과 신규 팀(인자 경로)을 휴리스틱 시나리오로 평가합니다.
  - 각 팀 파일을 function name()/type()/update() 블록 기준으로 분리하여 6개 로봇 단위로 로드
  - update를 호출할 때 Tank API를 스텁하여 이동/사격 각도를 수집
  - scoreMovement/scoreFire 휴리스틱으로 평균 점수를 계산해 비교
*/
const fs = require('fs');
const path = require('path');

const W = 900, H = 600;

function rnd(a, b) { return a + Math.random() * (b - a); }

function parseTeamFile(filePath) {
  const code = fs.readFileSync(filePath, 'utf8');
  const parts = code.split(/(?=function\s+name\s*\(\s*\))/g).map(s => s.trim()).filter(Boolean);
  const bots = parts.slice(0, 6).map((block, idx) => {
    // 안전하게 함수로 감싸 필요한 것만 반환
    const wrapper = `"use strict"; ${block}\n;return {name: name(), type: (typeof type=="function"? type():0), update: (typeof update=="function"? update: null)};`;
    const fn = new Function(wrapper);
    const obj = fn();
    if (typeof obj.update !== 'function') throw new Error('update() not found');
    return obj;
  });
  return bots;
}

function randomScenario() {
  const enemies = Array.from({ length: 3 + (Math.random() * 4) | 0 }, () => ({
    x: rnd(120, W - 120), y: rnd(80, H - 80), health: rnd(5, 30), distance: 0, angle: 0
  }));
  const allies = Array.from({ length: 2 + (Math.random() * 4) | 0 }, () => ({
    x: rnd(120, W - 120), y: rnd(80, H - 80), health: rnd(12, 35)
  }));
  const bullets = Array.from({ length: (Math.random() * 7) | 0 }, () => ({
    x: rnd(0, W), y: rnd(0, H), vx: rnd(-10, 10), vy: rnd(-10, 10)
  }));
  const tank = { x: rnd(200, W - 200), y: rnd(100, H - 100), health: rnd(10, 40), energy: 40, type: 0, size: 35 };
  enemies.forEach(e => { const dx=e.x-tank.x, dy=e.y-tank.y; e.distance=Math.hypot(dx,dy); e.angle=Math.atan2(dy,dx)*180/Math.PI; });
  return { tank, enemies, allies, bullets };
}

function scoreMovement(angleDeg, tank, enemies, allies, bullets) {
  const rad = angleDeg * Math.PI / 180; const mvx = Math.cos(rad), mvy = Math.sin(rad);
  let score = 0;
  for (const b of bullets) {
    const bv=Math.hypot(b.vx,b.vy); if(bv<1e-3) continue; const ux=b.vx/bv, uy=b.vy/bv;
    const perp=Math.abs(mvx*(-uy)+mvy*ux);
    const rx=b.x-tank.x, ry=b.y-tank.y; const d=Math.hypot(rx,ry)+1e-3; const closing=Math.max(0, -(rx*ux+ry*uy))/d;
    score += perp*closing*1.8;
  }
  const margin=60; const fx=(tank.x<margin?1-tank.x/margin:0)-(W-tank.x<margin?1-(W-tank.x)/margin:0); const fy=(tank.y<margin?1-tank.y/margin:0)-(H-tank.y<margin?1-(H-tank.y)/margin:0);
  score += (mvx*fx+mvy*fy)*0.8;
  if(enemies.length){
    const target=enemies.reduce((p,c)=>c.distance<p.distance?c:p,enemies[0]); const dx=target.x-tank.x, dy=target.y-tank.y; const dn=Math.hypot(dx,dy)+1e-6; const tx=dx/dn, ty=dy/dn; const strafe=Math.abs(mvx*(-ty)+mvy*tx);
    const away=-(mvx*tx+mvy*ty); const dist=dn; if(dist<=150) score+=away*0.9; else if(dist>=400) score+=(-away)*0.6; score+=strafe*0.6;
  }
  for(const a of allies){ const dx=tank.x-a.x, dy=tank.y-a.y; const d=Math.hypot(dx,dy)+1e-3; if(d<90){ const ux=dx/d, uy=dy/d; score += (mvx*ux+mvy*uy)*0.8; }}
  return score;
}

function scoreFire(angleDeg, tank, enemies) {
  if(!enemies.length) return 0; const target=enemies.reduce((p,c)=>c.distance<p.distance?c:p,enemies[0]);
  const aim=Math.atan2(target.y-tank.y,target.x-tank.x)*180/Math.PI; let err=Math.abs(((angleDeg-aim+540)%360)-180); return 1-Math.min(1,err/30);
}

function evalBot(updateFn, trials=250) {
  let total=0;
  for(let i=0;i<trials;i++){
    const {tank,enemies,allies,bullets}=randomScenario();
    const moves=[]; let lastFire=null;
    const api={
      move:(ang)=>{ moves.push(ang); return true; },
      fire:(ang)=>{ lastFire=ang; return true; },
      x:tank.x, y:tank.y, health:tank.health, energy:40, type:0, size:35
    };
    try{ updateFn(api, enemies, allies, bullets); }catch(e){ /* ignore bot runtime error */ }
    const ang = moves.length? moves[0] : 0;
    total += scoreMovement(ang, tank, enemies, allies, bullets) + (lastFire==null?0:1.1*scoreFire(lastFire, tank, enemies));
  }
  return total/trials;
}

function evalTeam(filePath) {
  const bots=parseTeamFile(filePath);
  const scores=bots.map(b=>evalBot(b.update, 220));
  return { file: filePath, avg: scores.reduce((a,b)=>a+b,0)/scores.length, scores };
}

function main() {
  const target = process.argv[2];
  if (!target) { console.error('Usage: node evaluate_teams.js <new_team_file>'); process.exit(1); }
  const files = fs.readdirSync('result').filter(f=>f.endsWith('.txt')).map(f=>path.join('result',f));
  const entries = [];
  for(const f of files){ try{ entries.push(evalTeam(f)); }catch(e){ console.error('skip', f, e.message); }}
  entries.sort((a,b)=>b.avg-a.avg);
  console.log('평가 결과 상위 10개:');
  entries.slice(0,10).forEach((e,i)=>console.log(`#${i+1} ${path.basename(e.file)} avg=${e.avg.toFixed(3)}`));
  const ours = entries.find(e=> e.file===path.resolve(target) || e.file===target || path.basename(e.file)===path.basename(target));
  if(ours){ console.log(`우리팀(${path.basename(ours.file)}) 순위: #${entries.indexOf(ours)+1}/${entries.length}, avg=${ours.avg.toFixed(3)}`); }
}

main();

