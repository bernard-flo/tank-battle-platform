// 팀 봇 코드 생성기 (강화판 무상태 전술)
// 각 봇은 tank_battle_platform.html 에서 그대로 import 가능한 형식의 코드 블록을 문자열로 반환

const { Type } = require('./engine');

function genBotCode({ botName, tankType, params }) {
  // 하이퍼파라미터 병합
  const p = Object.assign(
    {
      // 회피/이동 계수
      wall: 1.0,
      bullet: 1.2,
      attack: 0.9,
      strafe: 0.9,
      cohesion: 0.12,
      separation: 0.45,
      retreat: 0.9,
      // 사격 오차
      fireJitterNear: 3,
      fireJitterFar: 9,
      // 원하는 전투거리 (탱크 타입별로 스케일)
      rangeDealer: 260,
      rangeNormal: 220,
      rangeTanker: 160,
      // 측면 스윕 강도
      sweepDealer: 7,
      sweepOther: 4,
      // 저체력 이탈 임계치 (절대값)
      retreatHP: 30,
    },
    params || {}
  );

  // 코드 문자열 생성 (무상태, 매 tick 재평가)
  return `function name(){return ${JSON.stringify(botName)};}
function type(){return ${tankType};}
function update(tank,enemies,allies,bulletInfo){
  "use strict";
  function ang(a){a%=360; if(a<0)a+=360; return a;}
  function deg(x,y){return Math.atan2(y,x)*180/Math.PI;}
  function nrm(x,y){const m=Math.hypot(x,y)||1; return [x/m,y/m];}
  const W=900,H=600, BS=8; // 총알속도 추정

  // 1) 타겟 선정: 체력/거리/가까운 아군 수 가중 (집중사격)
  let target=null, best=1e9;
  for(const e of enemies){
    let nearAllies=0; for(const a of allies){ if(Math.hypot(a.x-e.x,a.y-e.y)<140) nearAllies++; }
    const k = e.distance*0.85 + Math.max(0,e.health)*0.5 - Math.min(35,e.health)*0.6 - nearAllies*6;
    if(k<best){best=k; target=e;}
  }

  // 2) 위협 회피: 접근/근접 총알에 강하게 반응, 시간가중 회피벡터
  let evx=0,evy=0; // 회피 벡터
  for(const b of bulletInfo){
    const rx=b.x-tank.x, ry=b.y-tank.y; const d=Math.hypot(rx,ry)||1e-6;
    const bv=Math.hypot(b.vx,b.vy)||1e-6; const ux=b.vx/bv, uy=b.vy/bv;
    const approach=-(rx*ux+ry*uy); // >0 이면 접근중
    if(approach>0){
      // 충돌 예상 시간 ~ d/BS, 가까울수록 가중
      const ttc = d/BS; const w = approach/(1+0.06*d) * (1/(0.5+ttc));
      const px=-uy, py=ux; // 수직 회피
      evx += px*w; evy += py*w;
    }
  }
  ;[evx,evy]=nrm(evx,evy);

  // 3) 벽 회피: 소프트 펜스
  let wx=0,wy=0; const m=70;
  if(tank.x<m) wx+=1- tank.x/m; if(W-tank.x<m) wx-=1- (W-tank.x)/m;
  if(tank.y<m) wy+=1- tank.y/m; if(H-tank.y<m) wy-=1- (H-tank.y)/m;
  ;[wx,wy]=nrm(wx,wy);

  // 4) 아군 응집/분리로 충돌 방지 및 라인 유지
  let ax=0,ay=0; for(const a of allies){ax+=a.x; ay+=a.y;} const cnt=Math.max(1,allies.length); ax/=cnt; ay/=cnt;
  let cx=ax?ax-tank.x:0, cy=ay?ay-tank.y:0; ;[cx,cy]=nrm(cx,cy);
  let sx=0,sy=0; for(const a of allies){ const dx=tank.x-a.x, dy=tank.y-a.y; const d=Math.hypot(dx,dy)||1; if(d<85){ sx+=dx/(d*d); sy+=dy/(d*d);} } ;[sx,sy]=nrm(sx,sy);

  // 5) 목표 기반 전투거리 제어 + 측면기동
  let atx=0,aty=0, obx=0,oby=0, ringx=0,ringy=0, rtx=0,rty=0; if(target){
    // 기본 목표/측면 벡터
    atx=(target.x-tank.x); aty=(target.y-tank.y); const n=Math.hypot(atx,aty)||1; atx/=n; aty/=n;
    obx=-aty; oby=atx; // 스트레이프

    // 타입별 선호 거리
    const isT=tank.type===1, isD=tank.type===2;
    const prefer = isD? ${p.rangeDealer} : isT? ${p.rangeTanker} : ${p.rangeNormal};
    const d = Math.max(1, target.distance);
    const diff = d - prefer; // +면 멀다 -> 접근, -면 가깝다 -> 이탈
    const g = Math.max(-1, Math.min(1, diff/180)); // 완만한 링 제어 게인
    ringx = atx * (g>0? +1 : -1) * Math.abs(g);
    ringy = aty * (g>0? +1 : -1) * Math.abs(g);

    // 저체력 시 후퇴 성향 강화
    const low = tank.health < ${p.retreatHP};
    if(low){ rtx=-atx; rty=-aty; }
  }

  // 6) 가중치 (타입 보정)
  const isT=tank.type===1, isD=tank.type===2;
  const wBullet=${p.bullet}*(isD?1.15:isT?0.9:1.0);
  const wAttack=${p.attack}*(isD?1.05:isT?0.95:1.0);
  const wStrafe=${p.strafe}*(isD?1.2:1.0);
  const wRetreat=${p.retreat}*(isD?1.1:1.0);

  // 7) 최종 이동 벡터 합성
  const mvx = evx*wBullet + wx*${p.wall} + atx*wAttack + obx*wStrafe + ringx*0.9 + cx*${p.cohesion} + sx*${p.separation} + rtx*wRetreat;
  const mvy = evy*wBullet + wy*${p.wall} + aty*wAttack + oby*wStrafe + ringy*0.9 + cy*${p.cohesion} + sy*${p.separation} + rty*wRetreat;
  let mvAng = deg(mvx,mvy);

  // 8) 사격: 거리 기반 지터 + 소폭 스윕 + 스트레이프 리드 힌트
  if(target){
    const base = target.angle;
    const dist = Math.max(1, target.distance);
    const J = (dist<200? ${p.fireJitterNear} : ${p.fireJitterFar});
    const jitter = J*(Math.random()-0.5);
    const sweep = (isD? ${p.sweepDealer} : ${p.sweepOther})*(Math.random()-0.5);
    const leadHint = (obx||oby)? deg(obx,oby)*0.18 : 0;
    const aim = ang(base + jitter + sweep + leadHint);
    tank.fire(aim);
  }

  // 9) 이동: 실패 시 우회 각도 → 무작위 분산
  const a0=ang(mvAng);
  if(!tank.move(a0)){
    if(!tank.move(ang(a0+70))){ if(!tank.move(ang(a0-70))){ tank.move(Math.random()*360); }}
  }
}`;
}

function makeTeam(seed = 0) {
  // 시드 기반으로 하이퍼파라미터 소폭 변이 + 조합 다양화
  function r(n) {
    seed = (seed * 1103515245 + 12345) >>> 0;
    return ((seed >>> 8) / 0x01000000) * 2 - 1; // [-1,1]
  }

  const bots = [
    { name: 'Bulwark', type: Type.TANKER, base: { bullet: 1.05, wall: 0.95, strafe: 0.55, attack: 0.7, separation: 0.35, retreat: 0.7, rangeTanker: 150 } },
    { name: 'Aegis',   type: Type.TANKER, base: { bullet: 1.0,  wall: 1.0,  strafe: 0.5,  attack: 0.7, separation: 0.4,  retreat: 0.75, rangeTanker: 165 } },
    { name: 'Viper',   type: Type.DEALER, base: { bullet: 1.2,  wall: 0.85, strafe: 1.0, attack: 0.92, cohesion: 0.1, separation: 0.45, retreatHP: 30, rangeDealer: 270 } },
    { name: 'Wraith',  type: Type.DEALER, base: { bullet: 1.15, wall: 0.9,  strafe: 0.95, attack: 0.92, cohesion: 0.12, separation: 0.45, retreatHP: 32, rangeDealer: 255 } },
    { name: 'Falcon',  type: Type.DEALER, base: { bullet: 1.1,  wall: 0.92, strafe: 0.95, attack: 0.94, cohesion: 0.12, separation: 0.42, retreatHP: 28, rangeDealer: 250 } },
    { name: 'Anchor',  type: Type.NORMAL, base: { bullet: 1.1,  wall: 0.95, strafe: 0.7,  attack: 0.82, cohesion: 0.15, separation: 0.4,  retreat: 0.8, rangeNormal: 220 } },
  ];

  return bots.map((b, i) => {
    const params = Object.fromEntries(
      Object.entries(b.base).map(([k, v]) => [k, v * (1 + 0.15 * r(i + 1))])
    );
    params.fireJitterNear = Math.max(2, Math.round(4 + 3 * r(i + 7)));
    params.fireJitterFar = Math.max(6, Math.round(10 + 6 * r(i + 9)));
    params.sweepDealer = Math.max(5, Math.round(7 + 2 * r(i + 11)));
    params.sweepOther = Math.max(3, Math.round(4 + 2 * r(i + 13)));
    const code = genBotCode({ botName: b.name, tankType: b.type, params });
    return code;
  });
}

function concatTeamCode(blocks) {
  return blocks.map((b) => `${b}\n\n// ===== 다음 로봇 =====\n`).join('\n');
}

module.exports = { makeTeam, concatTeamCode };

