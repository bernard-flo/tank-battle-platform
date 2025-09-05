'use strict';
const fs = require('fs');

function lcg(seed){
  let s = seed >>> 0;
  return () => { s = (s*1664525 + 1013904223) >>> 0; return s / 0xFFFFFFFF; };
}

function genWeights(inp=16,hid=6,out=5,scale1=1.15,scale2=1.05,seed=1){
  const rnd = lcg(seed);
  const ru=(a,b)=>a+(b-a)*rnd();
  const W1=Array.from({length:hid},()=>Array.from({length:inp},()=>ru(-scale1,scale1)));
  const b1=Array.from({length:hid},()=>ru(-0.9,0.9));
  const W2=Array.from({length:out},()=>Array.from({length:hid},()=>ru(-scale2,scale2)));
  const b2=Array.from({length:out},()=>ru(-1.0,1.0));
  return {W1,b1,W2,b2};
}

function makeBlock(bot){
  const {W1,b1,W2,b2} = genWeights(16,6,5,1.15,1.05,bot.seed||1);
  const bias = bot.bias || {ev:1,at:1,ob:1,wall:1,lead:1};
  const scales = [bias.ev,bias.at,bias.ob,bias.wall,bias.lead];
  for(let j=0;j<5;j++){ for(let k=0;k<W2[j].length;k++) W2[j][k]*=scales[j]; b2[j]*=scales[j]; }
  const js = (x)=>JSON.stringify(x);
  return `function name(){return '${bot.name}';}
function type(){return ${bot.type};}
function update(tank,enemies,allies,bulletInfo){
  function ang(a){return (a+360)%360;} function deg(x,y){return Math.atan2(y,x)*180/Math.PI;} function clamp(v,a,b){return Math.max(a,Math.min(b,v));}
  function mlp(x,W1,b1,W2,b2){const h=b1.map((bi,j)=>Math.tanh(bi+x.reduce((s,xi,i)=>s+xi*W1[j][i],0)));return b2.map((bo,k)=>bo+h.reduce((s,hj,j)=>s+hj*W2[k][j],0));}
  const W=900,H=600;
  let nx=null, nd=1e9, ex=0,ey=0; for(const e of enemies){ if(e.distance<nd){nd=e.distance; nx=e;} ex+=e.x; ey+=e.y; }
  const ecx=(ex/Math.max(1,enemies.length)||tank.x)-tank.x, ecy=(ey/Math.max(1,enemies.length)||tank.y)-tank.y; const ecd=Math.hypot(ecx,ecy)+1e-6;
  let ax=0,ay=0; for(const a of allies){ax+=a.x; ay+=a.y;} ax/=Math.max(1,allies.length); ay/=Math.max(1,allies.length); const acx=(ax||tank.x)-tank.x, acy=(ay||tank.y)-tank.y; const acd=Math.hypot(acx,acy)+1e-6;
  let evx=0,evy=0,th=0; for(const b of bulletInfo){ const rx=b.x-tank.x, ry=b.y-tank.y; const d=Math.hypot(rx,ry)+1e-6; const bv=Math.hypot(b.vx,b.vy)+1e-6; const ux=b.vx/bv, uy=b.vy/bv; const closing=-(rx*ux+ry*uy)/d; if(closing>0){ const px=-uy, py=ux; const w=closing/(1+0.07*d); evx+=px*w; evy+=py*w; th+=w; }} const en=Math.hypot(evx,evy)+1e-6; evx/=en; evy/=en;
  let wx=0,wy=0; const m=60; if(tank.x<m) wx+=1- tank.x/m; if(W-tank.x<m) wx-=1- (W-tank.x)/m; if(tank.y<m) wy+=1- tank.y/m; if(H-tank.y<m) wy-=1- (H-tank.y)/m; const wn=Math.hypot(wx,wy)+1e-6; wx/=wn; wy/=wn;
  const t0 = tank.type===0?1:0, t1=tank.type===1?1:0, t2=tank.type===2?1:0;
  const inVec=[ tank.x/W*2-1, tank.y/H*2-1, Math.tanh(tank.health/150), t0,t1,t2, Math.tanh(nd/400), (nx?((nx.x-tank.x)/Math.max(1,nd)):0), (nx?((nx.y-tank.y)/Math.max(1,nd)):0), ecx/ecd, ecy/ecd, acx/acd, acy/acd, Math.tanh(th), wx, wy ];
  const W1=${'${'}JSON.stringify(W1)${'}'}; const b1=${'${'}JSON.stringify(b1)${'}'}; const W2=${'${'}JSON.stringify(W2)${'}'}; const b2=${'${'}JSON.stringify(b2)${'}'};
  const o=mlp(inVec,W1,b1,W2,b2); let wEv=Math.max(0,o[0]), wAt=Math.max(0,o[1]), wOb=Math.max(0,o[2]), wWall=Math.max(0,o[3]); const s=wEv+wAt+wOb+wWall+1e-6; wEv/=s; wAt/=s; wOb/=s; wWall/=s; const aimLead=o[4];
  const atx = (nx?((nx.x-tank.x)/Math.max(1e-6,nd)): (ecx/ecd)), aty=(nx?((nx.y-tank.y)/Math.max(1e-6,nd)):(ecy/ecd)); const obx=-aty, oby=atx;
  const mvx=evx*wEv + atx*wAt + obx*wOb + wx*wWall, mvy=evy*wEv + aty*wAt + oby*wOb + wy*wWall; const mvAng=deg(mvx,mvy);
  if(nx){ const aim=deg(nx.x-tank.x, nx.y-tank.y); const lead=Math.max(-14,Math.min(18,aimLead)); tank.fire(ang(aim+lead)); }
  if(!tank.move(ang(mvAng))){ if(!tank.move(ang(mvAng+70))){ if(!tank.move(ang(mvAng-70))){ tank.move(Math.random()*360); }}} 
}
`;}

function main(){
  const cfgPath = process.argv[2] || '.scratchpad/ai_config.json';
  const outPath = 'result/ai.txt';
  const cfg = JSON.parse(fs.readFileSync(cfgPath,'utf8'));
  const blocks = cfg.bots.map(makeBlock);
  const sep = "\n\n// ===== 다음 로봇 =====\n\n";
  const content = blocks.join(sep)+"\n";
  fs.writeFileSync(outPath, content);
  console.log('Generated', cfg.bots.length, 'bots into', outPath);
}

if (require.main === module) main();

