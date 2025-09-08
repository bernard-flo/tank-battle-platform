// 우리 팀 봇 코드 생성기
// 각 봇은 function name()/type()/update() 형식으로 export 가능한 문자열을 반환

const { Type } = require('./engine');

function genBotCode({ botName, tankType, params }) {
  // params: 가중치 등 하이퍼파라미터
  // 플랫폼의 보안 모델상 상태를 저장하기 어렵기 때문에 순수/무상태 알고리즘 구현
  const p = Object.assign(
    {
      wallWeight: 0.85,
      bulletWeight: 1.0,
      attackWeight: 0.75,
      strafeWeight: 0.65,
      allyCohesion: 0.15,
      allySeparation: 0.35,
      fireJitter: 8,
    },
    params || {}
  );

  // 코드 문자열 생성
  return `function name(){return ${JSON.stringify(botName)};}
function type(){return ${tankType};}
function update(tank,enemies,allies,bulletInfo){
  function ang(a){return (a+360)%360;}
  function deg(x,y){return Math.atan2(y,x)*180/Math.PI;}
  function nrm(x,y){const m=Math.hypot(x,y)+1e-6; return [x/m,y/m];}
  const W=900,H=600;

  // 타겟 선정: 가장 가까운 적 우선, 동률이면 체력 낮은 적
  let target=null, best=1e9;
  for(const e of enemies){const d=e.distance; const k=d - e.health*0.02; if(k<best){best=k; target=e;}}

  // 총알 회피 벡터: 닫히는 탄만 고려, 탄에 수직인 방향으로 이탈
  let evx=0, evy=0, evScore=0;
  for(const b of bulletInfo){
    const rx=b.x-tank.x, ry=b.y-tank.y; const d=Math.hypot(rx,ry)+1e-6;
    const bv=Math.hypot(b.vx,b.vy)+1e-6; const ux=b.vx/bv, uy=b.vy/bv;
    const closing=-(rx*ux+ry*uy)/d; // 양수면 접근중
    if(closing>0){ const px=-uy, py=ux; const w=closing/(1+0.06*d); evx+=px*w; evy+=py*w; evScore+=w; }
  }
  ;[evx,evy]=nrm(evx,evy);

  // 벽 회피 벡터
  let wx=0,wy=0; const m=60;
  if(tank.x<m) wx+=1- tank.x/m; if(W-tank.x<m) wx-=1- (W-tank.x)/m;
  if(tank.y<m) wy+=1- tank.y/m; if(H-tank.y<m) wy-=1- (H-tank.y)/m;
  ;[wx,wy]=nrm(wx,wy);

  // 아군 응집/분리
  let ax=0,ay=0; for(const a of allies){ax+=a.x; ay+=a.y;} const ac=allies.length>0?1/allies.length:0; ax*=ac; ay*=ac;
  let cx=ax?ax-tank.x:0, cy=ay?ay-tank.y:0; ;[cx,cy]=nrm(cx,cy);
  let sx=0,sy=0; for(const a of allies){ const dx=tank.x-a.x, dy=tank.y-a.y; const d=Math.hypot(dx,dy)+1e-6; if(d<80){ sx+=dx/(d*d); sy+=dy/(d*d);} } ;[sx,sy]=nrm(sx,sy);

  // 공격/견제 벡터 (타겟 기준)
  let atx=0,aty=0, obx=0,oby=0; if(target){
    atx=(target.x-tank.x); aty=(target.y-tank.y); const n=Math.hypot(atx,aty)+1e-6; atx/=n; aty/=n;
    obx=-aty; oby=atx; // 측면 기동(스트레이프)
  }

  // 가중합
  const mvx = evx*${p.bulletWeight} + wx*${p.wallWeight} + atx*${p.attackWeight} + obx*${p.strafeWeight} + cx*${p.allyCohesion} + sx*${p.allySeparation};
  const mvy = evy*${p.bulletWeight} + wy*${p.wallWeight} + aty*${p.attackWeight} + oby*${p.strafeWeight} + cy*${p.allyCohesion} + sy*${p.allySeparation};
  const mvAng = deg(mvx,mvy);

  // 사격: 간단한 리드 + 지터 스윕
  if(target){
    const base = target.angle; // 엔진이 제공하는 적에 대한 극각
    const jitter = ((${p.fireJitter}.0) * (Math.random()-0.5));
    const aim = ang(base + jitter);
    tank.fire(aim);
  }

  // 이동: 실패시 우회 각도 시도
  if(!tank.move(ang(mvAng))){ if(!tank.move(ang(mvAng+70))){ if(!tank.move(ang(mvAng-70))){ tank.move(Math.random()*360); }}}
}`;
}

function makeTeam(seed = 0) {
  // 시드 기반으로 소폭 파라미터 변이를 주어 6기 편성
  function r(n) {
    // 간단한 난수 (seed 기반)
    seed = (seed * 9301 + 49297) % 233280;
    return (seed / 233280) * 2 - 1; // [-1,1]
  }

  const bots = [
    { name: 'Gumiho', type: Type.TANKER, base: { bulletWeight: 1.2, wallWeight: 0.9, strafeWeight: 0.5 } },
    { name: 'Bison',  type: Type.TANKER, base: { bulletWeight: 1.1, wallWeight: 0.95, attackWeight: 0.6 } },
    { name: 'Manta',  type: Type.DEALER, base: { attackWeight: 0.9, strafeWeight: 0.8 } },
    { name: 'Comet',  type: Type.DEALER, base: { attackWeight: 0.85, strafeWeight: 0.75, allySeparation: 0.4 } },
    { name: 'Osprey', type: Type.DEALER, base: { attackWeight: 0.8, strafeWeight: 0.85 } },
    { name: 'Kite',   type: Type.NORMAL, base: { wallWeight: 0.8, bulletWeight: 1.0, allyCohesion: 0.2 } },
  ];

  return bots.map((b, i) => {
    const params = Object.fromEntries(
      Object.entries(b.base).map(([k, v]) => [k, v * (1 + 0.15 * r(i + 1))])
    );
    params.fireJitter = 6 + Math.floor(Math.abs(r(i + 7)) * 10);
    const code = genBotCode({ botName: b.name, tankType: b.type, params });
    return code;
  });
}

function concatTeamCode(blocks) {
  return blocks.map((b, i) => `${b}\n\n// ===== 다음 로봇 =====\n`).join('\n');
}

module.exports = { makeTeam, concatTeamCode };

