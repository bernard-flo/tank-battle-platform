// 팀 봇 코드 생성기 (향상판)
// 각 봇은 function name()/type()/update() 형식으로 export 가능한 문자열을 반환

const { Type } = require('./engine');

function genBotCode({ botName, tankType, params }) {
  const p = Object.assign(
    {
      wall: 0.95,
      bullet: 1.18,
      attack: 0.88,
      strafe: 0.86,
      cohesion: 0.12,
      separation: 0.44,
      retreat: 0.85,
      retreatHP: 26,
      jitterNear: 4,
      jitterFar: 11,
      sideSweep: 5,
    },
    params || {}
  );

  return `function name(){return ${JSON.stringify(botName)};}
function type(){return ${tankType};}
function update(tank,enemies,allies,bulletInfo){
  function ang(a){a%=360; if(a<0)a+=360; return a;}
  function deg(x,y){return Math.atan2(y,x)*180/Math.PI;}
  function nrm(x,y){const m=Math.hypot(x,y)||1; return [x/m,y/m];}
  const W=900,H=600;

  // 1) 타겟 선정: 거리/체력/가까운 적 가중 + 약한 적 우선
  let target=null, best=1e9;
  for(const e of enemies){
    const s = e.distance*0.85 + Math.max(0,e.health)*0.55 - Math.min(35,e.health)*0.4;
    if(s<best){best=s; target=e;}
  }

  // 2) 총알 회피: 우리에게 접근하며, 가까운 탄일수록 강하게 회피 (수직 이탈)
  let evx=0,evy=0, th=0; for(const b of bulletInfo){
    const rx=b.x-tank.x, ry=b.y-tank.y; const d=Math.hypot(rx,ry)||1e-6;
    const bv=Math.hypot(b.vx,b.vy)||1e-6; const ux=b.vx/bv, uy=b.vy/bv;
    const closing = -(rx*ux+ry*uy)/d; // 양수면 접근중
    if(closing>0){ const px=-uy, py=ux; const w = (closing)/(1+0.065*d); evx+=px*w; evy+=py*w; th+=w; }
  }
  ;[evx,evy]=nrm(evx,evy);

  // 3) 벽 회피: 가장자리에서 안쪽으로 밀기
  let wx=0,wy=0; const m=60;
  if(tank.x<m) wx+=1- tank.x/m; if(W-tank.x<m) wx-=1- (W-tank.x)/m;
  if(tank.y<m) wy+=1- tank.y/m; if(H-tank.y<m) wy-=1- (H-tank.y)/m;
  ;[wx,wy]=nrm(wx,wy);

  // 4) 아군 응집/분리: 간격 유지 및 군집 형성
  let ax=0,ay=0; for(const a of allies){ax+=a.x; ay+=a.y;} const c=Math.max(1,allies.length); ax/=c; ay/=c;
  let cx=ax?ax-tank.x:0, cy=ay?ay-tank.y:0; ;[cx,cy]=nrm(cx,cy);
  let sx=0,sy=0; for(const a of allies){ const dx=tank.x-a.x, dy=tank.y-a.y; const d=Math.hypot(dx,dy)||1; if(d<85){ sx+=dx/(d*d); sy+=dy/(d*d);} } ;[sx,sy]=nrm(sx,sy);

  // 5) 교전 벡터: 접근/측면 + 저체력 시 이탈
  let atx=0,aty=0, obx=0,oby=0, rtx=0,rty=0; if(target){
    atx=(target.x-tank.x); aty=(target.y-tank.y); const n=Math.hypot(atx,aty)||1; atx/=n; aty/=n;
    obx=-aty; oby=atx; // 스트레이프(측면)
    if(tank.health<${p.retreatHP}){ rtx=-atx; rty=-aty; }
  }

  // 6) 타입 기반 가중치 미세 조정
  const isT=tank.type===1, isD=tank.type===2;
  const wB=${p.bullet}*(isD?1.15:(isT?0.92:1));
  const wA=${p.attack}*(isD?1.07:(isT?0.95:1));
  const wS=${p.strafe}*(isD?1.15:1);
  const wR=${p.retreat}*(isD?1.12:1);

  // 7) 최종 이동 벡터 합성
  const mvx = evx*wB + wx*${p.wall} + atx*wA + obx*wS + cx*${p.cohesion} + sx*${p.separation} + rtx*wR;
  const mvy = evy*wB + wy*${p.wall} + aty*wA + oby*wS + cy*${p.cohesion} + sy*${p.separation} + rty*wR;
  const mvAng = deg(mvx,mvy);

  // 8) 사격: 거리 기반 지터 + 스트레이프 방향을 미세 리드로 활용
  if(target){
    const base = target.angle;
    const dist = Math.max(1, target.distance);
    const jitter = (dist<210? ${p.jitterNear} : ${p.jitterFar})*(Math.random()-0.5);
    const sweep = ${p.sideSweep}*(Math.random()-0.5);
    const lead = (obx||oby)? deg(obx,oby)*0.12 : 0;
    tank.fire(ang(base + jitter + sweep + lead));
  }

  // 9) 이동: 실패 시 우회 각도
  if(!tank.move(ang(mvAng))){ if(!tank.move(ang(mvAng+70))){ if(!tank.move(ang(mvAng-70))){ tank.move(Math.random()*360); }}}
}`;
}

function makeTeam(seed = 0) {
  // 시드 기반 변이 + 역할 조합: 2 탱커, 3 딜러, 1 올라운더
  function r() { seed = (seed * 1103515245 + 12345) >>> 0; return ((seed >>> 8) / 0x01000000) * 2 - 1; }
  const roster = [
    { name: 'Bulwark', type: Type.TANKER, base: { bullet: 1.05, wall: 0.98, strafe: 0.58, attack: 0.78, separation: 0.38, retreat: 0.72, retreatHP: 30, jitterNear: 3, jitterFar: 9, sideSweep: 4 } },
    { name: 'Aegis',   type: Type.TANKER, base: { bullet: 1.02, wall: 1.02, strafe: 0.52, attack: 0.75, separation: 0.42, retreat: 0.78, retreatHP: 32, jitterNear: 3, jitterFar: 9, sideSweep: 4 } },
    { name: 'Viper',   type: Type.DEALER, base: { bullet: 1.22, wall: 0.86, strafe: 0.98, attack: 0.92, cohesion: 0.1, separation: 0.46, retreat: 0.88, retreatHP: 28, jitterNear: 5, jitterFar: 12, sideSweep: 6 } },
    { name: 'Wraith',  type: Type.DEALER, base: { bullet: 1.18, wall: 0.88, strafe: 0.96, attack: 0.92, cohesion: 0.12, separation: 0.46, retreat: 0.88, retreatHP: 28, jitterNear: 5, jitterFar: 12, sideSweep: 6 } },
    { name: 'Falcon',  type: Type.DEALER, base: { bullet: 1.12, wall: 0.9,  strafe: 0.92, attack: 0.94, cohesion: 0.12, separation: 0.44, retreat: 0.9,  retreatHP: 26, jitterNear: 5, jitterFar: 12, sideSweep: 6 } },
    { name: 'Anchor',  type: Type.NORMAL, base: { bullet: 1.12, wall: 0.96, strafe: 0.74, attack: 0.86, cohesion: 0.15, separation: 0.42, retreat: 0.84, retreatHP: 26, jitterNear: 4, jitterFar: 10, sideSweep: 5 } },
  ];

  return roster.map((b, i) => {
    const params = {};
    for (const [k, v] of Object.entries(b.base)) {
      const spread = (k === 'retreatHP') ? 3 : (k === 'cohesion' || k === 'separation') ? 0.08 : 0.15;
      params[k] = v * (k === 'retreatHP' ? 1 + 0.12 * r() : 1 + spread * r());
      if (k === 'retreatHP') params[k] = Math.max(16, Math.min(45, params[k]));
    }
    const code = genBotCode({ botName: b.name, tankType: b.type, params });
    return code;
  });
}

function concatTeamCode(blocks) {
  return blocks.map((b) => `${b}\n\n// ===== 다음 로봇 =====\n`).join('\n');
}

module.exports = { makeTeam, concatTeamCode };

