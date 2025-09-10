#!/usr/bin/env node
/*
 Generates a 6-bot team code compatible with tank_battle_platform.html import.
 The team implements predictive aiming, bullet dodging, range control, strafing,
 and ally separation. Parameters are tunable per role (TANKER/NORMAL/DEALER).
*/

const fs = require('fs');
const path = require('path');

function botSnippet(label, typeId, P) {
  const header = `function name(){return "${label}";}\nfunction type(){return ${typeId};}`;
  const body = `var __S = (typeof __S !== 'undefined') ? __S : {tick:0,last:null,lastV:null,side:1,initX:null,isRed:null,top:null};
function update(tank,enemies,allies,bulletInfo){
  const H=Math.hypot, D=(x,y)=>Math.atan2(y,x)*180/Math.PI, N=(a)=>{a%=360;if(a<0)a+=360;return a;}, CL=(v,l,h)=>v<l?l:v>h?h:v;
  const P=${JSON.stringify(P)};
  const S=__S; S.tick=(S.tick||0)+1; if(S.initX===null){ S.initX=tank.x; S.isRed = S.initX < 450; S.top = tank.y < 300; S.side = ((tank.x*97+tank.y*131)|0)%2?1:-1; }
  if((S.tick%${P.sideFlip||240})===0) S.side*=-1;
  const BIAS = (S.isRed? ${P.redBias ?? 6} : ${-Math.abs(P.redBias ?? 6)});

  // 1) Target selection: health-weighted distance + angle alignment bonus
  let tgt=null,b=1e18; for(const e of enemies){
    const dx=e.x-tank.x, dy=e.y-tank.y, ang=Math.abs(N(D(dx,dy))-N(S.lastAim||0));
    const align = 1 + Math.min(ang,360-ang)/180 * ${P.alignW ?? 0.0};
    const k=e.health*P.healthW + e.distance*P.distW * align; if(k<b){b=k;tgt=e;}
  }

  // 2) Aiming: smoothed velocity estimate + ballistic intercept (bullet speed=8)
  if(tgt){
    let ax=tgt.x, ay=tgt.y, vx=0, vy=0;
    if(S.last){
      const lv=S.lastV||{vx:0,vy:0};
      const ivx=tgt.x-S.last.x, ivy=tgt.y-S.last.y; // instant velocity
      vx=lv.vx*(1-P.smooth)+ivx*P.smooth; vy=lv.vy*(1-P.smooth)+ivy*P.smooth; S.lastV={vx,vy};
      const rx=tgt.x-tank.x, ry=tgt.y-tank.y, s2=64, aa=vx*vx+vy*vy-s2, bb=2*(rx*vx+ry*vy), cc=rx*rx+ry*ry; let t=0;
      if(Math.abs(aa)<1e-6){ t = bb!==0?CL(-cc/bb,0,P.leadCap):0; }
      else { const disc=bb*bb-4*aa*cc; if(disc>=0){ const sd=Math.sqrt(disc), t1=(-bb-sd)/(2*aa), t2=(-bb+sd)/(2*aa); t = CL((t1>0&&t2>0?Math.min(t1,t2):(t1>0?t1:(t2>0?t2:0))),0,P.leadCap);} else { t=CL(H(rx,ry)/8,0,P.leadCap);} }
      ax = tgt.x + vx*P.leadW*t; ay = tgt.y + vy*P.leadW*t;
    }
    const j = ((((S.tick*13 + ((tank.x*7+tank.y*3)|0) )%23)-11)*P.aimJ*0.08) + (P.aimBias||0);
    const aim = D(ax-tank.x,ay-tank.y)+j; S.lastAim = aim; tank.fire(aim); S.last={x:tgt.x,y:tgt.y};
  }

  // 3) Movement helpers
  let mv=0; const go=(a)=>{ if(mv>20) return true; mv++; return tank.move(N(a)); };

  // 3a) Bullet dodge: perpendicular + flee bias + time-to-impact weighting
  let hot=null,sc=1e18; for(const b of bulletInfo){
    const dx=b.x-tank.x,dy=b.y-tank.y; const v=H(b.vx,b.vy)||1, nx=b.vx/v, ny=b.vy/v, proj=dx*nx+dy*ny; if(proj>0){
      const px=b.x-proj*nx,py=b.y-proj*ny, dist=H(px-tank.x,py-tank.y), tt=proj/v, s=dist+tt*P.threatH; if(dist<P.threatR&&s<sc){sc=s;hot=b;}
    }
  }
  if(hot){ const a=D(hot.vx,hot.vy); const side=S.side*P.fleeBias + (BIAS)*0.5; for(const c of [a+90+side,a-90-side,a+120,a-120,a+70,a-70,a+150,a-150]){ if(go(c)) return; } }

  // 3b) Edge avoidance (map 900x600)
  if(tank.x<P.edge){ if(go(0)) return;} if(tank.x>900-P.edge){ if(go(180)) return;} if(tank.y<P.edge){ if(go(90)) return;} if(tank.y>600-P.edge){ if(go(270)) return;}

  // 3c) Ally separation
  let near=null,ad=1e18; for(const a of allies){ if(a.distance<ad){ad=a.distance;near=a;} } if(near&&ad<P.sep){ const aw=D(tank.x-near.x,tank.y-near.y); if(go(aw)) return; if(go(aw+18)) return; if(go(aw-18)) return; }

  // 3d) Opening drift to mitigate spawn bias
  if(S.tick<${P.openTicks||18}){ const open = S.isRed ? [0,12,-12] : [180,168,192]; for(const ang of open){ if(go(ang)) return; } }

  // 3e) Range control + strafing
  if(tgt){ const to=D(tgt.x-tank.x,tgt.y-tank.y), d=tgt.distance; let r0=P.rMin,r1=P.rMax; if((tgt.health<=P.finHP)||enemies.length<=P.aggrRemain){ r0=Math.max(120,r0-P.aggrIn); r1=Math.max(160,r1-P.aggrOut);} if(d<r0){ const aw=to+180+(BIAS)*0.4; if(go(aw)) return; if(go(aw+16)) return; if(go(aw-16)) return; } else if(d>r1){ if(go(to)) return; if(go(to+14)) return; if(go(to-14)) return; } else { const s=to+S.side*P.strafe+(BIAS)*0.5; if(go(s)) return; if(go(s+16)) return; if(go(s-16)) return; } }

  // 3f) Sweeping fallback
  for(const s of [0,60,120,180,240,300]){ if(go(s+(P.bias||0))) return; }
}`;
  return `${header}\n${body}`;
}

function generateTeam(params) {
  const pieces = [];
  const T = { NORMAL: 'Type.NORMAL', TANKER: 'Type.TANKER', DEALER: 'Type.DEALER' };

  // Order: 2 Tankers (front), 2 Dealers (wings), 2 Normals (mid)
  pieces.push(botSnippet('Helios-T1', T.TANKER, params.tanker));
  pieces.push(botSnippet('Helios-T2', T.TANKER, params.tanker));
  pieces.push(botSnippet('Helios-D1', T.DEALER, params.dealer));
  pieces.push(botSnippet('Helios-D2', T.DEALER, params.dealer));
  pieces.push(botSnippet('Helios-N1', T.NORMAL, params.normal));
  pieces.push(botSnippet('Helios-N2', T.NORMAL, params.normal));

  return pieces.join('\n\n// ===== 다음 로봇 =====\n\n');
}

function defaultParams() {
  return {
    tanker: {
      rMin: 180, rMax: 300, strafe: 25, threatR: 210, threatH: 5.8, fleeBias: 17, sep: 72, edge: 54,
      leadCap: 22, leadW: 1.10, aimJ: 0.14, healthW: 1.25, distW: 0.095, finHP: 26, aggrRemain: 3,
      aggrIn: 28, aggrOut: 18, bias: 0, smooth: 0.52, openTicks: 18, sideFlip: 240, redBias: 6, alignW: 0.10
    },
    normal: {
      rMin: 210, rMax: 335, strafe: 28, threatR: 192, threatH: 6.0, fleeBias: 16, sep: 66, edge: 54,
      leadCap: 22, leadW: 1.15, aimJ: 0.15, healthW: 1.22, distW: 0.090, finHP: 24, aggrRemain: 3,
      aggrIn: 26, aggrOut: 20, bias: 0, smooth: 0.50, openTicks: 18, sideFlip: 240, redBias: 6, alignW: 0.10
    },
    dealer: {
      rMin: 245, rMax: 375, strafe: 33, threatR: 186, threatH: 6.4, fleeBias: 19, sep: 64, edge: 56,
      leadCap: 23, leadW: 1.18, aimJ: 0.14, healthW: 1.18, distW: 0.100, finHP: 22, aggrRemain: 3,
      aggrIn: 30, aggrOut: 24, bias: 0, smooth: 0.52, openTicks: 18, sideFlip: 240, redBias: 6, alignW: 0.12
    }
  };
}

function main() {
  const outDir = process.argv[2] || process.env.OUT_DIR || process.cwd();
  const outName = process.argv[3] || path.basename(outDir);
  const paramsPath = process.argv[4];

  let params = defaultParams();
  if (paramsPath && fs.existsSync(paramsPath)) {
    const ext = path.extname(paramsPath);
    if (ext === '.json') params = JSON.parse(fs.readFileSync(paramsPath, 'utf8'));
  }
  const code = generateTeam(params);
  const outFile = path.join(outDir, `${outName}.txt`);
  fs.writeFileSync(outFile, code);
  console.log(`Generated team -> ${outFile}`);
}

if (require.main === module) main();

module.exports = { generateTeam, defaultParams };

