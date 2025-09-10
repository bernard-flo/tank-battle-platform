// Generates a 6-robot team file compatible with tank_battle_platform.html import
// Usage: node build_team.js <outfile>
// Writes a single text file with 6 robot blocks separated by the import delimiter.

const fs = require('fs');

function robotBlock(label, typeConst, idx, P) {
  // Single robot code block string. Uses only ES5-compatible constructs.
  // The platform executes each block in isolation; variables are per-robot.
  const safeP = JSON.stringify(P);
  return `function name(){return "Quasar-10-${label}";}
function type(){return ${typeConst};}
let __S_${idx} = { last:null, tick:0, lastVel:null, flipTick:0, side: ${idx % 2 ? 1 : -1} };
function update(tank,enemies,allies,bulletInfo){
  var H=Math.hypot;
  function D(x,y){ return Math.atan2(y,x)*180/Math.PI; }
  function N(a){ a%=360; if(a<0)a+=360; return a; }
  function CL(v,l,h){ return v<l?l:v>h?h:v; }
  var P=${safeP};
  var S=__S_${idx};
  S.tick=(S.tick||0)+1;

  // 1) Target selection: low HP focus, distance secondary. Deterministic tie bias.
  var tgt=null, best=1e18;
  for (var i=0;i<enemies.length;i++){
    var e=enemies[i];
    var key = e.health*(P.healthW||1.2) + e.distance*(P.distW||0.1) + (i*0.0003);
    if(key<best){best=key; tgt=e;}
  }

  // 2) Predictive fire: quadratic intercept solve using smoothed velocity
  if(tgt){
    var aimX=tgt.x, aimY=tgt.y;
    var vx=0, vy=0;
    if(S.last){
      var lvx=S.lastVel?S.lastVel.vx:0, lvy=S.lastVel?S.lastVel.vy:0;
      var ivx=(tgt.x-S.last.x), ivy=(tgt.y-S.last.y);
      vx = lvx*0.55 + ivx*0.45; vy = lvy*0.55 + ivy*0.45; // mild low-pass
      S.lastVel={vx:vx,vy:vy};
      var rx=tgt.x-tank.x, ry=tgt.y-tank.y;
      var s2=64; // 8^2
      var aa=vx*vx+vy*vy - s2;
      var bb=2*(rx*vx+ry*vy);
      var cc=rx*rx+ry*ry;
      var tHit=0;
      if (Math.abs(aa) < 1e-6){
        tHit = bb!==0 ? CL(-cc/bb, 0, P.leadCap||18) : 0;
      } else {
        var disc=bb*bb - 4*aa*cc;
        if (disc>=0){
          var sd=Math.sqrt(disc);
          var t1=(-bb-sd)/(2*aa), t2=(-bb+sd)/(2*aa);
          var tc = (t1>0 && t2>0) ? (t1<t2?t1:t2) : (t1>0?t1:(t2>0?t2:0));
          tHit = CL(tc, 0, P.leadCap||18);
        } else {
          var d=H(rx,ry); tHit=CL(d/8, 0, P.leadCap||18);
        }
      }
      aimX = tgt.x + vx*(P.leadW||1.08)*tHit;
      aimY = tgt.y + vy*(P.leadW||1.08)*tHit;
    }
    var jitterSeed = (S.tick*13 + ((tank.x*97+tank.y*131)|0) + ${idx}*17)%23 - 11;
    var jitter = jitterSeed * (P.aimJitter||0.12) * 0.07 + (P.aimBias||0);
    tank.fire(D(aimX-tank.x, aimY-tank.y) + jitter);
    S.last={x:tgt.x,y:tgt.y};
  }

  // Movement helpers
  var moved=0; function go(a){ if(moved>20) return true; moved++; return tank.move(N(a)); }

  // 3) Bullet avoidance: pick dodge angle by scoring projected separation and time-to-approach
  var hot=null,score=1e18;
  for(var i2=0;i2<bulletInfo.length;i2++){
    var b=bulletInfo[i2];
    var dx=b.x-tank.x, dy=b.y-tank.y; var v=H(b.vx,b.vy)||1;
    var nx=b.vx/v, ny=b.vy/v; var proj=dx*nx+dy*ny;
    if(proj>0){
      var px=b.x-proj*nx, py=b.y-proj*ny;
      var dist=H(px-tank.x,py-tank.y);
      var tt=proj/v; // ticks to closest approach
      var s = dist + tt*(P.threatH||5);
      if(dist<(P.threatR||200) && s<score){ score=s; hot=b; }
    }
  }
  if(hot){
    var ba=D(hot.vx,hot.vy);
    var sideBias=(S.side||1)*(P.fleeBias||16) + (P.bias||0)*0.5;
    var cands=[ba+90+sideBias, ba-90-sideBias, ba+120, ba-120, ba+70, ba-70, ba+150, ba-150];
    // Score each candidate by predicted post-move risk
    function riskAtAngle(a){
      var rad=a*Math.PI/180;
      var nx=tank.x+Math.cos(rad)*tank.speed, ny=tank.y+Math.sin(rad)*tank.speed;
      var r=0, i; // accumulate inverse distance with time weighting
      for(i=0;i<bulletInfo.length;i++){
        var b=bulletInfo[i];
        var dx=b.x-nx, dy=b.y-ny; var v=H(b.vx,b.vy)||1; var ux=b.vx/v, uy=b.vy/v; var proj=dx*ux+dy*uy; if(proj<=0) continue;
        var px=b.x-proj*ux, py=b.y-proj*uy; var dist=H(px-nx,py-ny); var tt=proj/v; if(dist>(P.threatR||200)) continue; r += (1/(1+dist)) + (tt*(P.threatH||5))*0.002;
      }
      // Edge and clustering penalties
      if(nx < (P.edge||60) || nx > 900-(P.edge||60) || ny < (P.edge||60) || ny > 600-(P.edge||60)) r += 0.5;
      // mild center bias to avoid corners
      var cx=Math.abs(450-nx)/450, cy=Math.abs(300-ny)/300; r += 0.05*(cx+cy);
      return r;
    }
    cands.sort(function(a,b){ return riskAtAngle(a)-riskAtAngle(b); });
    for(var j=0;j<cands.length;j++){ if(go(cands[j])) return; }
  }

  // 4) Edge avoidance
  if(tank.x < (P.edge||60)) { if(go(0)) return; }
  if(tank.x > 900-(P.edge||60)) { if(go(180)) return; }
  if(tank.y < (P.edge||60)) { if(go(90)) return; }
  if(tank.y > 600-(P.edge||60)) { if(go(270)) return; }

  // 5) Ally separation
  var near=null, ad=1e18; for(var k=0;k<allies.length;k++){ var a=allies[k]; if(a.distance<ad){ ad=a.distance; near=a; } }
  if(near && ad < (P.sep||72)){
    var away=D(tank.x-near.x, tank.y-near.y);
    if(go(away)) return; if(go(away+18)) return; if(go(away-18)) return;
  }

  // 6) Range control + adaptive strafing
  if(tgt){
    var to=D(tgt.x-tank.x, tgt.y-tank.y), d=tgt.distance;
    var r0=P.rMin||220, r1=P.rMax||340;
    if((tgt.health<=(P.finisherHP||24)) || enemies.length<=(P.aggrRemain||3)){
      r0=Math.max(120, r0-(P.aggrIn||28)); r1=Math.max(160, r1-(P.aggrOut||20));
    }
    if(d<r0){ var aw=to+180+(P.bias||0)*0.4; if(go(aw)) return; if(go(aw+16)) return; if(go(aw-16)) return; }
    else if(d>r1){ if(go(to)) return; if(go(to+14)) return; if(go(to-14)) return; }
    else {
      // Flip strafe direction every few seconds to be less predictable
      if((S.tick - (S.flipTick||0)) > (P.flipEvery||90)) { S.side = -S.side; S.flipTick=S.tick; }
      var s=to + (S.side*(P.strafe||24)) + (P.bias||0)*0.5;
      if(go(s)) return; if(go(s+16)) return; if(go(s-16)) return;
    }
  }

  // 7) Fallback sweep
  var sweep=[0,60,120,180,240,300];
  for(var q=0;q<sweep.length;q++){ if(go(sweep[q]+(P.bias||0))) return; }
}
`;
}

function main() {
  const out = process.argv[2];
  if (!out) {
    console.error('Usage: node build_team.js <outfile>');
    process.exit(2);
  }

  // Role parameter presets (tuned starting points)
  const presets = [
    // Two TANKERs (frontliners)
    { label: 'T1', type: 'Type.TANKER', P: { rMin: 182, rMax: 296, strafe: 22, threatR: 232, threatH: 5, fleeBias: 16, sep: 78, edge: 60, leadCap: 20, leadW: 1.06, aimJitter: 0.12, healthW: 1.25, distW: 0.09, finisherHP: 28, aggrRemain: 3, aggrIn: 30, aggrOut: 20, bias: -10, flipEvery: 92 } },
    { label: 'T2', type: 'Type.TANKER', P: { rMin: 190, rMax: 304, strafe: 24, threatR: 232, threatH: 5, fleeBias: 16, sep: 78, edge: 60, leadCap: 21, leadW: 1.06, aimJitter: 0.12, healthW: 1.23, distW: 0.09, finisherHP: 28, aggrRemain: 3, aggrIn: 30, aggrOut: 20, bias: 8, flipEvery: 98 } },
    // Four DEALERs (backline DPS)
    { label: 'D1', type: 'Type.DEALER', P: { rMin: 274, rMax: 430, strafe: 30, threatR: 206, threatH: 6, fleeBias: 14, sep: 72, edge: 62, leadCap: 22, leadW: 1.12, aimJitter: 0.10, healthW: 1.18, distW: 0.08, finisherHP: 22, aggrRemain: 2, aggrIn: 30, aggrOut: 22, aimBias: -0.6, bias: -8, flipEvery: 84 } },
    { label: 'D2', type: 'Type.DEALER', P: { rMin: 286, rMax: 444, strafe: 30, threatR: 206, threatH: 6, fleeBias: 14, sep: 72, edge: 62, leadCap: 22, leadW: 1.12, aimJitter: 0.10, healthW: 1.18, distW: 0.08, finisherHP: 22, aggrRemain: 2, aggrIn: 30, aggrOut: 22, aimBias: -0.6, bias: 8,  flipEvery: 88 } },
    { label: 'D3', type: 'Type.DEALER', P: { rMin: 268, rMax: 418, strafe: 28, threatR: 206, threatH: 6, fleeBias: 14, sep: 72, edge: 62, leadCap: 22, leadW: 1.12, aimJitter: 0.11, healthW: 1.20, distW: 0.08, finisherHP: 22, aggrRemain: 2, aggrIn: 30, aggrOut: 22, aimBias: -0.6, bias: -4, flipEvery: 86 } },
    { label: 'D4', type: 'Type.DEALER', P: { rMin: 292, rMax: 452, strafe: 32, threatR: 206, threatH: 6, fleeBias: 14, sep: 72, edge: 62, leadCap: 23, leadW: 1.12, aimJitter: 0.10, healthW: 1.18, distW: 0.08, finisherHP: 22, aggrRemain: 2, aggrIn: 30, aggrOut: 22, aimBias: -0.6, bias: 4,  flipEvery: 90 } },
  ];

  const blocks = presets.map((p, i) => robotBlock(p.label, p.type, i, p.P));
  const DELIM = '\n\n\n// ===== 다음 로봇 =====\n\n\n\n';
  const final = blocks.join(DELIM);
  fs.writeFileSync(out, final);
  console.log('Wrote team file to', out);
}

if (require.main === module) {
  main();
}
