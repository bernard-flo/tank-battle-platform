// 우리 팀 봇 코드 생성기 (개선판)
// 각 봇은 function name()/type()/update() 형식으로 export 가능한 문자열을 반환

const { Type } = require('./engine');

function genBotCode({ botName, tankType, params }) {
  // params: 가중치 등 하이퍼파라미터
  const p = Object.assign(
    {
      wall: 0.95,
      bullet: 1.15,
      attack: 0.85,
      strafe: 0.8,
      cohesion: 0.12,
      separation: 0.42,
      retreat: 0.9,
      fireJitterNear: 4,
      fireJitterFar: 10,
      retreatHP: 28,
    },
    params || {}
  );

  // 코드 문자열 생성 (무상태, 보안 제약 내 계산만 사용)
  return `function name(){return ${JSON.stringify(botName)};}
function type(){return ${tankType};}
function update(tank,enemies,allies,bulletInfo){
  function ang(a){a%=360; if(a<0)a+=360; return a;}
  function deg(x,y){return Math.atan2(y,x)*180/Math.PI;}
  function nrm(x,y){const m=Math.hypot(x,y)||1; return [x/m,y/m];}
  const W=900,H=600;

  // 1) 타겟 선정: 체력이 낮고 가까운 적 우선
  let target=null, score=1e9;
  for(const e of enemies){
    const k=e.distance*0.9 + Math.max(0, e.health)*0.6 - Math.min(40,e.health)*0.5;
    if(k<score){score=k; target=e;}
  }

  // 2) 위협 추정: 접근중인 총알만 회피, 거리 가중치
  let evx=0,evy=0, threat=0;
  for(const b of bulletInfo){
    const rx=b.x-tank.x, ry=b.y-tank.y; const d=Math.hypot(rx,ry)||1e-6;
    const bv=Math.hypot(b.vx,b.vy)||1e-6; const ux=b.vx/bv, uy=b.vy/bv;
    const closing=-(rx*ux+ry*uy)/d; // 양수면 접근중
    if(closing>0){ const px=-uy, py=ux; const w=closing/(1+0.07*d); evx+=px*w; evy+=py*w; threat+=w; }
  }
  ;[evx,evy]=nrm(evx,evy);

  // 3) 벽 회피
  let wx=0,wy=0; const m=60;
  if(tank.x<m) wx+=1- tank.x/m; if(W-tank.x<m) wx-=1- (W-tank.x)/m;
  if(tank.y<m) wy+=1- tank.y/m; if(H-tank.y<m) wy-=1- (H-tank.y)/m;
  ;[wx,wy]=nrm(wx,wy);

  // 4) 아군 응집/분리로 충돌 줄이기
  let ax=0,ay=0; for(const a of allies){ax+=a.x; ay+=a.y;} const cnt=Math.max(1,allies.length); ax/=cnt; ay/=cnt;
  let cx=ax?ax-tank.x:0, cy=ay?ay-tank.y:0; ;[cx,cy]=nrm(cx,cy);
  let sx=0,sy=0; for(const a of allies){ const dx=tank.x-a.x, dy=tank.y-a.y; const d=Math.hypot(dx,dy)||1; if(d<85){ sx+=dx/(d*d); sy+=dy/(d*d);} } ;[sx,sy]=nrm(sx,sy);

  // 5) 공격/측면기동 + 저체력 시 이탈 벡터
  let atx=0,aty=0, obx=0,oby=0, rtx=0,rty=0; if(target){
    atx=(target.x-tank.x); aty=(target.y-tank.y); const n=Math.hypot(atx,aty)||1; atx/=n; aty/=n;
    obx=-aty; oby=atx; // 측면 기동
    const hp = tank.health; // 절대 체력 사용 (플랫폼에서 타입별 체력이 다름)
    const low = hp < ${p.retreatHP};
    if(low){ rtx=-atx; rty=-aty; }
  }

  // 6) 타입에 따른 가중치 미세 조정
  const isTanker = tank.type===1, isDealer=tank.type===2;
  const wBullet = ${p.bullet} * (isDealer?1.15: isTanker?0.9:1.0);
  const wAttack = ${p.attack} * (isDealer?1.05: isTanker?0.95:1.0);
  const wStrafe = ${p.strafe} * (isDealer?1.15: 1.0);
  const wRetreat = ${p.retreat} * (isDealer?1.1:1.0);

  // 7) 최종 이동 벡터
  const mvx = evx*wBullet + wx*${p.wall} + atx*wAttack + obx*wStrafe + cx*${p.cohesion} + sx*${p.separation} + rtx*wRetreat;
  const mvy = evy*wBullet + wy*${p.wall} + aty*wAttack + oby*wStrafe + cy*${p.cohesion} + sy*${p.separation} + rty*wRetreat;
  let mvAng = deg(mvx,mvy);

  // 8) 사격: 거리 기반 지터, 측면각 보정 약간
  if(target){
    const base = target.angle;
    const dist = Math.max(1, target.distance);
    const jitter = (dist<200? ${p.fireJitterNear} : ${p.fireJitterFar})*(Math.random()-0.5);
    const sweep = (isDealer? 6 : 3) * (Math.random()-0.5); // 소폭 스윕
    const leadHint = obx!==0||oby!==0 ? deg(obx,oby)*0.15 : 0; // 스트레이프 방향을 약한 리드로 사용
    const aim = ang(base + jitter + sweep + leadHint);
    tank.fire(aim);
  }

  // 9) 이동: 실패 시 우회 각도 시도
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
    { name: 'Bulwark', type: Type.TANKER, base: { bullet: 1.05, wall: 0.95, strafe: 0.55, attack: 0.7, separation: 0.35, retreat: 0.7 } },
    { name: 'Aegis',   type: Type.TANKER, base: { bullet: 1.0,  wall: 1.0,  strafe: 0.5,  attack: 0.7, separation: 0.4,  retreat: 0.75 } },
    { name: 'Viper',   type: Type.DEALER, base: { bullet: 1.2,  wall: 0.85, strafe: 0.95, attack: 0.9, cohesion: 0.1, separation: 0.45, retreatHP: 30 } },
    { name: 'Wraith',  type: Type.DEALER, base: { bullet: 1.15, wall: 0.88, strafe: 0.9,  attack: 0.9, cohesion: 0.12, separation: 0.45, retreatHP: 32 } },
    { name: 'Falcon',  type: Type.DEALER, base: { bullet: 1.1,  wall: 0.9,  strafe: 0.9,  attack: 0.92, cohesion: 0.12, separation: 0.42, retreatHP: 28 } },
    { name: 'Anchor',  type: Type.NORMAL, base: { bullet: 1.1,  wall: 0.95, strafe: 0.7,  attack: 0.8, cohesion: 0.15, separation: 0.4,  retreat: 0.8 } },
  ];

  return bots.map((b, i) => {
    const params = Object.fromEntries(
      Object.entries(b.base).map(([k, v]) => [k, v * (1 + 0.15 * r(i + 1))])
    );
    params.fireJitterNear = Math.max(2, Math.round(4 + 3 * r(i + 7)));
    params.fireJitterFar = Math.max(6, Math.round(10 + 6 * r(i + 9)));
    const code = genBotCode({ botName: b.name, tankType: b.type, params });
    return code;
  });
}

function concatTeamCode(blocks) {
  return blocks.map((b) => `${b}\n\n// ===== 다음 로봇 =====\n`).join('\n');
}

module.exports = { makeTeam, concatTeamCode };
