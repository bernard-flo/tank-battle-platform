/*
  무작위 가중치 탐색으로 update() 이동벡터 조합 가중치를 최적화하여
  6개 봇(2x Tanker, 3x Dealer, 1x Normal)의 코드를 생성합니다.
  결과는 result/<TS>.txt 로 저장합니다.
*/

const fs = require('fs');
const path = require('path');

const TS = fs.readFileSync(path.join(process.cwd(), 'CURRENT_WORKDIR'), 'utf8').trim();
const OUT = path.join('result', `${TS}.txt`);

// 전장 크기 (HTML과 동일)
const W = 900, H = 600;

// 난수 유틸
const rnd = (a, b) => a + Math.random() * (b - a);
const choice = (arr) => arr[(Math.random() * arr.length) | 0];

// 각 역할(Role)별 탐색 범위(휴리스틱)
const ROLE_PARAM_BOUNDS = {
  TANKER: {
    // [ev, w, at, ob, c, s, rt] (각 이동성분 가중치 범위)
    min: [-0.1,  0.00, -0.35,  0.05, -0.05, -0.10,  0.00],
    max: [ 0.25, 0.20,  0.05,  0.25,  0.08,  0.05,  0.30],
    jitter: [0.5, 1.2], // 사격 지터 범위(도 단위 근사)
    fleeHP: [12, 25],  // 후퇴 체력 임계치
  },
  DEALER: {
    min: [ 0.00, 0.00, -0.40,  0.12, -0.12, -0.08,  0.10],
    max: [ 0.30, 0.15, -0.05,  0.30,  0.06,  0.00,  0.35],
    jitter: [0.2, 0.9],
    fleeHP: [14, 28],
  },
  NORMAL: {
    min: [ 0.00, 0.00, -0.30,  0.05,  0.02, -0.05,  0.05],
    max: [ 0.25, 0.20,  0.10,  0.20,  0.12,  0.05,  0.25],
    jitter: [0.2, 1.0],
    fleeHP: [15, 26],
  }
};

// 시나리오 생성: 적/아군/총알 무작위 구성
function randomScenario() {
  // 적 3~6, 아군 2~5, 총알 0~6
  const enemies = Array.from({ length: 3 + (Math.random() * 4) | 0 }, () => ({
    x: rnd(120, W - 120),
    y: rnd(80, H - 80),
    distance: 0, // 후에 계산되지만 update 인자로는 사전계산 제공된다고 가정
    angle: 0,
    health: rnd(5, 30),
  }));
  const allies = Array.from({ length: 2 + (Math.random() * 4) | 0 }, () => ({
    x: rnd(120, W - 120),
    y: rnd(80, H - 80),
    health: rnd(12, 35),
  }));
  const bullets = Array.from({ length: (Math.random() * 7) | 0 }, () => ({
    x: rnd(0, W), y: rnd(0, H),
    vx: rnd(-10, 10), vy: rnd(-10, 10)
  }));

  const tank = {
    x: rnd(200, W - 200), y: rnd(100, H - 100),
    health: rnd(10, 40), energy: 40,
    type: 0, size: 35
  };

  // distance/angle 채움
  enemies.forEach(e => {
    const dx = e.x - tank.x, dy = e.y - tank.y;
    e.distance = Math.hypot(dx, dy);
    e.angle = Math.atan2(dy, dx) * 180 / Math.PI;
  });

  return { tank, enemies, allies, bullets };
}

// 이동 방향 벡터 점수화: 총알 회피, 벽 회피, 측면 이동, 목표 접근/거리 관리
function scoreMovement(angleDeg, tank, enemies, allies, bullets) {
  const rad = angleDeg * Math.PI / 180;
  const mvx = Math.cos(rad), mvy = Math.sin(rad);
  let score = 0;

  // 총알 회피: 총알 속도 방향에 수직일수록 가산, 접근(Closing) 강할수록 가중치↑
  for (const b of bullets) {
    const bv = Math.hypot(b.vx, b.vy);
    if (bv < 1e-3) continue;
    const ux = b.vx / bv, uy = b.vy / bv;
    // 수직 성분 크기 |v x u|
    const perp = Math.abs(mvx * (-uy) + mvy * ux);
    const rx = b.x - tank.x, ry = b.y - tank.y;
    const d = Math.hypot(rx, ry) + 1e-3;
    const closing = Math.max(0, -(rx * ux + ry * uy)) / d; // approaching only
    score += perp * closing * 1.8; // 가중
  }

  // 벽 회피: 가장 가까운 벽에서 멀어지는 방향이면 가점
  const margin = 60;
  const fx = (tank.x < margin ? 1 - tank.x / margin : 0) - (W - tank.x < margin ? 1 - (W - tank.x) / margin : 0);
  const fy = (tank.y < margin ? 1 - tank.y / margin : 0) - (H - tank.y < margin ? 1 - (H - tank.y) / margin : 0);
  const wallDot = mvx * fx + mvy * fy; // 멀어질수록 양수
  score += wallDot * 0.8;

  // 타겟 기준 측면 스트레이프: 최근접 적에 대해 수직 성분 선호
  if (enemies.length) {
    const target = enemies.reduce((p, c) => (c.distance < p.distance ? c : p), enemies[0]);
    const dx = target.x - tank.x, dy = target.y - tank.y;
    const dn = Math.hypot(dx, dy) + 1e-6;
    const tx = dx / dn, ty = dy / dn;
    // m dot perp(t) => 측면 이동 정도
    const strafe = Math.abs(mvx * (-ty) + mvy * tx);
    // 너무 가까우면 (<=150) 멀어지는 경향 가점, 너무 멀면(>=400) 접근 가점
    const away = -(mvx * tx + mvy * ty);
    const dist = dn;
    if (dist <= 150) score += away * 0.9;
    else if (dist >= 400) score += (-(away)) * 0.6; // 접근
    score += strafe * 0.6;
  }

  // 아군과의 충돌 회피(근접시 분리)
  for (const a of allies) {
    const dx = tank.x - a.x, dy = tank.y - a.y;
    const d = Math.hypot(dx, dy) + 1e-3;
    if (d < 90) {
      const ux = dx / d, uy = dy / d;
      score += (mvx * ux + mvy * uy) * 0.8;
    }
  }

  return score;
}

// 사격 점수: 최근접 적을 향한 각도 정확도
function scoreFire(angleDeg, tank, enemies) {
  if (!enemies.length) return 0;
  const target = enemies.reduce((p, c) => (c.distance < p.distance ? c : p), enemies[0]);
  const aim = Math.atan2(target.y - tank.y, target.x - tank.x) * 180 / Math.PI;
  let err = Math.abs(((angleDeg - aim + 540) % 360) - 180);
  return 1 - Math.min(1, err / 30); // 30도 이내면 높은 점수
}

// 한 후보 파라미터의 평균 점수
function evaluateParams(params, role, trials = 250) {
  let total = 0;
  const fleeHP = params.fleeHP;
  const jitter = params.jitter;
  for (let i = 0; i < trials; i++) {
    const { tank, enemies, allies, bullets } = randomScenario();
    const tHealth = tank.health;
    const low = tHealth < fleeHP ? 1 : 0;

    // target, evasion, etc. 가중합으로 이동각 산출 (update와 유사한 방식)
    // [ev, w, at, ob, c, s, rt]
    const [wev, ww, wat, wob, wc, ws, wrt] = params.w;

    // 주 벡터 구성
    let target = null, best = 1e9;
    for (const e of enemies) {
      const s = e.distance * 0.9 + Math.max(0, e.health) * 0.4;
      if (s < best) { best = s; target = e; }
    }

    // ev: 총알 수직 회피 벡터 합
    let evx = 0, evy = 0;
    for (const b of bullets) {
      const rx = b.x - tank.x, ry = b.y - tank.y;
      const d = Math.hypot(rx, ry) + 1e-6;
      const bv = Math.hypot(b.vx, b.vy) + 1e-6;
      const ux = b.vx / bv, uy = b.vy / bv;
      const closing = -(rx * ux + ry * uy) / d;
      if (closing > 0) {
        const px = -uy, py = ux; // 수직
        const w = closing / (1 + 0.065 * d);
        evx += px * w; evy += py * w;
      }
    }
    const evn = Math.hypot(evx, evy) || 1; evx /= evn; evy /= evn;

    // w: 벽 회피
    let wx = 0, wy = 0; const m = 60;
    if (tank.x < m) wx += 1 - tank.x / m;
    if (W - tank.x < m) wx -= 1 - (W - tank.x) / m;
    if (tank.y < m) wy += 1 - tank.y / m;
    if (H - tank.y < m) wy -= 1 - (H - tank.y) / m;
    const wn = Math.hypot(wx, wy) || 1; wx /= wn; wy /= wn;

    // at/ob: 타겟 방향/측면
    let atx = 0, aty = 0, obx = 0, oby = 0;
    if (target) {
      atx = target.x - tank.x; aty = target.y - tank.y;
      const n = Math.hypot(atx, aty) || 1; atx /= n; aty /= n;
      obx = -aty; oby = atx;
    }

    // c: 아군 중심 지향
    let ax = 0, ay = 0; for (const a of allies) { ax += a.x; ay += a.y; }
    const c = Math.max(1, allies.length); ax /= c; ay /= c;
    let cx = ax ? ax - tank.x : 0, cy = ay ? ay - tank.y : 0;
    const cn = Math.hypot(cx, cy) || 1; cx /= cn; cy /= cn;

    // s: 근접 분리
    let sx = 0, sy = 0; for (const a of allies) {
      const dx = tank.x - a.x, dy = tank.y - a.y; const d = Math.hypot(dx, dy) || 1;
      if (d < 85) { sx += dx / (d * d); sy += dy / (d * d); }
    }
    const sn = Math.hypot(sx, sy) || 1; sx /= sn; sy /= sn;

    // rt: 저체력 후퇴
    let rtx = 0, rty = 0;
    if (low) {
      rtx = -(cx || atx); rty = -(cy || aty);
      const rn = Math.hypot(rtx, rty) || 1; rtx /= rn; rty /= rn;
    }

    const mvx = wev * evx + ww * wx + wat * atx + wob * obx + wc * cx + ws * sx + wrt * rtx;
    const mvy = wev * evy + ww * wy + wat * aty + wob * oby + wc * cy + ws * sy + wrt * rty;
    const mvAng = Math.atan2(mvy, mvx) * 180 / Math.PI;

    // 사격 각도: 타겟 + 지터
    let fireAng = 0;
    if (target) {
      const aim = Math.atan2(target.y - tank.y, target.x - tank.x) * 180 / Math.PI;
      const jit = rnd(-jitter, jitter);
      fireAng = aim + jit;
    }

    const moveScore = scoreMovement(mvAng, tank, enemies, allies, bullets);
    const fireScore = scoreFire(fireAng, tank, enemies);
    total += moveScore * 1.0 + fireScore * 1.1;
  }
  return total / trials;
}

function randomParams(role) {
  const b = ROLE_PARAM_BOUNDS[role];
  const w = b.min.map((mn, i) => rnd(mn, b.max[i]));
  const jitter = rnd(b.jitter[0], b.jitter[1]);
  const fleeHP = rnd(b.fleeHP[0], b.fleeHP[1]);
  return { w, jitter, fleeHP };
}

function tuneRole(role, iterations = 800) {
  let best = null, bestScore = -1e9;
  for (let i = 0; i < iterations; i++) {
    const p = randomParams(role);
    const s = evaluateParams(p, role, 220);
    if (s > bestScore) { bestScore = s; best = p; }
  }
  return { params: best, score: bestScore };
}

function botCodeTemplate(botName, typeNum, p) {
  const [wev, ww, wat, wob, wc, ws, wrt] = p.w;
  const jitter = p.jitter;
  const fleeHP = p.fleeHP;
  return `function name(){return "${botName}";}
function type(){return ${typeNum};}
function update(tank,enemies,allies,bulletInfo){
  function ang(a){a%=360; if(a<0)a+=360; return a;}
  function deg(x,y){return Math.atan2(y,x)*180/Math.PI;}
  function nrm(x,y){const m=Math.hypot(x,y)||1e-6; return [x/m,y/m];}
  const W=${W},H=${H};
  let target=null,best=1e9;
  for(const e of enemies){const s=e.distance*0.9+Math.max(0,e.health)*0.4; if(s<best){best=s; target=e;}}
  let evx=0,evy=0; for(const b of bulletInfo){const rx=b.x-tank.x,ry=b.y-tank.y;const d=Math.hypot(rx,ry)||1e-6;const bv=Math.hypot(b.vx,b.vy)||1e-6;const ux=b.vx/bv,uy=b.vy/bv;const closing=-(rx*ux+ry*uy)/d; if(closing>0){const px=-uy,py=ux;const w=closing/(1+0.065*d); evx+=px*w; evy+=py*w;}} ;[evx,evy]=nrm(evx,evy);
  let wx=0,wy=0; const m=60; if(tank.x<m) wx+=1-tank.x/m; if(W-tank.x<m) wx-=1-(W-tank.x)/m; if(tank.y<m) wy+=1-tank.y/m; if(H-tank.y<m) wy-=1-(H-tank.y)/m; ;[wx,wy]=nrm(wx,wy);
  let atx=0,aty=0,obx=0,oby=0; if(target){atx=target.x-tank.x; aty=target.y-tank.y; const n=Math.hypot(atx,aty)||1; atx/=n; aty/=n; obx=-aty; oby=atx;}
  let ax=0,ay=0; for(const a of allies){ax+=a.x; ay+=a.y;} const c=Math.max(1,allies.length); ax/=c; ay/=c; let cx=ax?ax-tank.x:0, cy=ay?ay-tank.y:0; ;[cx,cy]=nrm(cx,cy);
  let sx=0,sy=0; for(const a of allies){const dx=tank.x-a.x,dy=tank.y-a.y; const d=Math.hypot(dx,dy)||1; if(d<85){sx+=dx/(d*d); sy+=dy/(d*d);}} ;[sx,sy]=nrm(sx,sy);
  let rtx=0,rty=0; if(tank.health<${fleeHP.toFixed(6)}){rtx=-(cx||atx); rty=-(cy||aty); const rn=Math.hypot(rtx,rty)||1; rtx/=rn; rty/=rn;}
  const mvx=evx*${wev}+wx*${ww}+atx*${wat}+obx*${wob}+cx*${wc}+sx*${ws}+rtx*${wrt};
  const mvy=evy*${wev}+wy*${ww}+aty*${wat}+oby*${wob}+cy*${wc}+sy*${ws}+rty*${wrt};
  const mvAng=deg(mvx,mvy);
  if(target){const aim=deg(target.x-tank.x,target.y-tank.y); const jitter=${jitter}*(Math.random()-0.5); tank.fire(ang(aim+jitter));}
  if(!tank.move(ang(mvAng))){ if(!tank.move(ang(mvAng+70))){ if(!tank.move(ang(mvAng-70))){ tank.move(Math.random()*360); }}}
}`;
}

function main() {
  console.log(`[build] 역할별 파라미터 튜닝 시작`);
  const tunedTanker = tuneRole('TANKER', 700);
  const tunedDealer = tuneRole('DEALER', 900);
  const tunedNormal = tuneRole('NORMAL', 600);
  console.log(`[build] TANKER score=${tunedTanker.score.toFixed(3)}`);
  console.log(`[build] DEALER score=${tunedDealer.score.toFixed(3)}`);
  console.log(`[build] NORMAL score=${tunedNormal.score.toFixed(3)}`);

  const bots = [];
  bots.push(botCodeTemplate('Vanguard-1', 1, tunedTanker.params));
  bots.push(botCodeTemplate('Vanguard-2', 1, tunedTanker.params));
  bots.push(botCodeTemplate('Reaper-1', 2, tunedDealer.params));
  bots.push(botCodeTemplate('Reaper-2', 2, tunedDealer.params));
  bots.push(botCodeTemplate('Reaper-3', 2, tunedDealer.params));
  bots.push(botCodeTemplate('Coordinator', 0, tunedNormal.params));

  const content = bots.map((b,i)=> i===0? b : `\n\n// ===== 다음 로봇 =====\n\n`+b).join('');
  fs.writeFileSync(OUT, content);
  console.log(`[build] 결과 저장: ${OUT}`);
}

main();

