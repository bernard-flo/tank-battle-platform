#!/usr/bin/env node
// 고급 전략 팀 생성 및 간이 평가 후 result/<ts>.txt 저장
const fs = require('fs');
const path = require('path');
const { runMatch, parseTeamFile, Type } = require('../tools/simulator');

function timestamp(){
  const d = new Date(); const pad=n=>String(n).padStart(2,'0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}-${pad(d.getHours())}-${pad(d.getMinutes())}`;
}

function joinBlocks(blocks){
  return blocks.map((b,i)=> i===0? b : (`\n\n// ===== 다음 로봇 =====\n\n`+b)).join('\n');
}

function makeStatefulBot({ botName, typeConst, engageDist, kiteDist, dodgeAgg, strafeBias, focus='closest' }){
  // state: 마지막 적 좌표/시간 저장 -> 탄도 선행사격
  return `// ${botName}
function name(){return "${botName}";}
function type(){return ${typeConst};}
(function(){
  let lastSeen = {x:0,y:0,t:0};
  let lastAim = 0;
  function norm(a){a%=360; if(a<0)a+=360; return a;}
  function ang(x,y){return Math.atan2(y,x)*180/Math.PI;}
  function pickTarget(enemies){
    if(!enemies.length) return null;
    if ('${focus}'==='low'){
      let r=enemies[0]; for(const e of enemies){ if(e.health < r.health) r=e; } return r;
    } else {
      let r=enemies[0]; for(const e of enemies){ if(e.distance < r.distance) r=e; } return r;
    }
  }
  function leadAngle(tx,ty, ex,ey, bs){
    // 목표의 속도 추정 (마지막 프레임과 비교). dt ~ 50ms per tick 기준 추정
    const now = Date.now();
    const dt = Math.max(50, Math.min(250, now - lastSeen.t || 100));
    const vx = (ex - lastSeen.x) / (dt/50);
    const vy = (ey - lastSeen.y) / (dt/50);
    const dx = ex - tx, dy = ey - ty;
    // 선행 점 t를 근사적으로 추정 (해석적 계산 대신 반복 근사)
    let t=1.0; // ticks
    for(let i=0;i<3;i++){
      const px = ex + vx * t, py = ey + vy * t;
      const dist = Math.hypot(px - tx, py - ty);
      t = dist / bs; // ticks to reach
    }
    const aimX = ex + vx * t, aimY = ey + vy * t;
    return ang(aimX - tx, aimY - ty);
  }
  function threat(b, tank){
    // 우리쪽으로 접근하며 경로가 근접
    const dx=b.x-tank.x, dy=b.y-tank.y; const sp=Math.hypot(b.vx,b.vy)||1; const nx=b.vx/sp, ny=b.vy/sp;
    const proj = dx*nx + dy*ny; if (proj <= 0) return false; // 지나감
    const px = b.x - proj*nx, py = b.y - proj*ny; const d = Math.hypot(px-tank.x, py-tank.y);
    return d < ${dodgeAgg};
  }
  function avoidAllies(tank, allies){
    let ax=0, ay=0; let cnt=0;
    for(const a of allies){ if(a.distance<70){ ax += tank.x - a.x; ay += tank.y - a.y; cnt++; } }
    if(cnt>0){ const a = ang(ax, ay); if(tank.move(norm(a))) return true; if(tank.move(norm(a+20))) return true; if(tank.move(norm(a-20))) return true; }
    return false;
  }
  function strafeAround(tank, to){
    const side = to + (${strafeBias});
    return tank.move(norm(side)) || tank.move(norm(side+25)) || tank.move(norm(side-25));
  }
  function update(tank,enemies,allies,bulletInfo){
    const tgt = pickTarget(enemies);
    if (tgt){
      const aim = leadAngle(tank.x, tank.y, tgt.x, tgt.y, 8);
      lastAim = aim; tank.fire(aim);
      lastSeen = {x:tgt.x, y:tgt.y, t: Date.now()};
    } else {
      tank.fire(lastAim);
    }
    // 회피 최우선
    let hot=null, md=1e9; for(const b of bulletInfo){ const d=Math.hypot(b.x-tank.x,b.y-tank.y); if(d<md && threat(b,tank)){ md=d; hot=b; } }
    if (hot){
      const a = ang(hot.vx, hot.vy);
      if (tank.move(norm(a+90+(${strafeBias})))) return;
      if (tank.move(norm(a-90-(${strafeBias})))) return;
    }
    if (avoidAllies(tank, allies)) return;
    if (tgt){
      const d = tgt.distance; const to = ang(tgt.x - tank.x, tgt.y - tank.y);
      if (d < ${kiteDist}){
        const away = to+180 + (${strafeBias});
        if (tank.move(norm(away))) return; if (tank.move(norm(away+20))) return; if (tank.move(norm(away-20))) return;
      } else if (d > ${engageDist}){
        if (tank.move(norm(to))) return; if (tank.move(norm(to+20))) return; if (tank.move(norm(to-20))) return;
      } else {
        if (strafeAround(tank, to)) return;
      }
    }
    const pref=[0,90,180,270]; for(const p of pref){ if (tank.move(norm(p+(${strafeBias})))) return; }
  }
  this.update = update; // 노출
})();
function update(tank,enemies,allies,bulletInfo){ return this.update(tank,enemies,allies,bulletInfo); }
`;
}

function makeTeamPreset(preset){
  const bots=[];
  if (preset==='apex'){ // 고급: 2 탱커, 3 딜러, 1 노멀
    bots.push(makeStatefulBot({ botName:'Apex-T1', typeConst:'Type.TANKER', engageDist:270, kiteDist:170, dodgeAgg:70, strafeBias:-10, focus:'closest' }));
    bots.push(makeStatefulBot({ botName:'Apex-T2', typeConst:'Type.TANKER', engageDist:270, kiteDist:170, dodgeAgg:70, strafeBias:10, focus:'closest' }));
    bots.push(makeStatefulBot({ botName:'Apex-D1', typeConst:'Type.DEALER', engageDist:340, kiteDist:230, dodgeAgg:78, strafeBias:25, focus:'low' }));
    bots.push(makeStatefulBot({ botName:'Apex-D2', typeConst:'Type.DEALER', engageDist:340, kiteDist:230, dodgeAgg:78, strafeBias:-25, focus:'low' }));
    bots.push(makeStatefulBot({ botName:'Apex-D3', typeConst:'Type.DEALER', engageDist:330, kiteDist:230, dodgeAgg:78, strafeBias:0, focus:'closest' }));
    bots.push(makeStatefulBot({ botName:'Apex-N',  typeConst:'Type.NORMAL', engageDist:310, kiteDist:210, dodgeAgg:72, strafeBias:0, focus:'closest' }));
  } else if (preset==='vanguard'){
    bots.push(makeStatefulBot({ botName:'Vanguard-T1', typeConst:'Type.TANKER', engageDist:260, kiteDist:160, dodgeAgg:68, strafeBias:-5, focus:'closest' }));
    bots.push(makeStatefulBot({ botName:'Vanguard-T2', typeConst:'Type.TANKER', engageDist:260, kiteDist:160, dodgeAgg:68, strafeBias:5, focus:'closest' }));
    bots.push(makeStatefulBot({ botName:'Vanguard-D1', typeConst:'Type.DEALER', engageDist:350, kiteDist:240, dodgeAgg:80, strafeBias:20, focus:'low' }));
    bots.push(makeStatefulBot({ botName:'Vanguard-D2', typeConst:'Type.DEALER', engageDist:350, kiteDist:240, dodgeAgg:80, strafeBias:-20, focus:'low' }));
    bots.push(makeStatefulBot({ botName:'Vanguard-D3', typeConst:'Type.DEALER', engageDist:340, kiteDist:230, dodgeAgg:80, strafeBias:0, focus:'closest' }));
    bots.push(makeStatefulBot({ botName:'Vanguard-N',  typeConst:'Type.NORMAL', engageDist:300, kiteDist:200, dodgeAgg:72, strafeBias:0, focus:'closest' }));
  } else { // fallback
    bots.push(makeStatefulBot({ botName:'Fallback-N1', typeConst:'Type.NORMAL', engageDist:300, kiteDist:200, dodgeAgg:70, strafeBias:0, focus:'closest' }));
    bots.push(makeStatefulBot({ botName:'Fallback-N2', typeConst:'Type.NORMAL', engageDist:300, kiteDist:200, dodgeAgg:70, strafeBias:0, focus:'closest' }));
    bots.push(makeStatefulBot({ botName:'Fallback-N3', typeConst:'Type.NORMAL', engageDist:300, kiteDist:200, dodgeAgg:70, strafeBias:0, focus:'closest' }));
    bots.push(makeStatefulBot({ botName:'Fallback-N4', typeConst:'Type.NORMAL', engageDist:300, kiteDist:200, dodgeAgg:70, strafeBias:0, focus:'closest' }));
    bots.push(makeStatefulBot({ botName:'Fallback-N5', typeConst:'Type.NORMAL', engageDist:300, kiteDist:200, dodgeAgg:70, strafeBias:0, focus:'closest' }));
    bots.push(makeStatefulBot({ botName:'Fallback-N6', typeConst:'Type.NORMAL', engageDist:300, kiteDist:200, dodgeAgg:70, strafeBias:0, focus:'closest' }));
  }
  return bots;
}

function pickOpponents(maxN=12){
  const dir = path.join(process.cwd(), 'result');
  const files = fs.existsSync(dir)? fs.readdirSync(dir).filter(f=>f.endsWith('.txt')): [];
  files.sort((a,b)=> fs.statSync(path.join(dir,b)).mtimeMs - fs.statSync(path.join(dir,a)).mtimeMs);
  const out=[]; for(const f of files){ if(out.length>=maxN) break; out.push(path.join(dir,f)); }
  return out;
}

function main(){
  const ts = timestamp();
  const workDir = path.join(process.cwd(), ts);
  if (!fs.existsSync(workDir)) fs.mkdirSync(workDir);

  const presets = ['apex','vanguard'];
  const opponents = pickOpponents(16);
  const scores=[];
  for(const p of presets){
    const team = makeTeamPreset(p);
    // parse to blocks for sim
    const blocks = team; // already code blocks
    let wins=0, games=0;
    if (opponents.length===0){
      const r = runMatch(blocks, blocks, { seed:1 });
      if (r.winner==='draw') wins+=0; else wins += 1; games += 1;
    } else {
      for(const oppFile of opponents){
        const oppBlocks = parseTeamFile(fs.readFileSync(oppFile,'utf8'));
        const r1 = runMatch(blocks, oppBlocks, { seed:1 });
        const r2 = runMatch(oppBlocks, blocks, { seed:2 });
        if (r1.winner==='red') wins++; if (r2.winner==='blue') wins++; games += 2;
      }
    }
    scores.push({ preset:p, wins, games, winrate: wins/Math.max(1,games), blocks});
  }
  scores.sort((a,b)=> b.wins - a.wins);
  const best = scores[0];
  const outPath = path.join(process.cwd(), 'result', `${ts}.txt`);
  if (!fs.existsSync(path.dirname(outPath))) fs.mkdirSync(path.dirname(outPath));
  fs.writeFileSync(outPath, joinBlocks(best.blocks));
  fs.writeFileSync(path.join(workDir, 'adv_summary.json'), JSON.stringify(scores,null,2));
  console.log(`[ADV] 선택: ${best.preset} (${best.wins}/${best.games}) -> ${outPath}`);
}

if (require.main===module){ main(); }
