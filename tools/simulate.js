/* eslint-disable no-console */
const path = require('path');
const fs = require('fs');
const puppeteer = require('puppeteer');

// Split concatenated robots code into an array of 6 code snippets
function splitRobotCodes(codeText) {
  const parts = codeText.split(/(?=function\s+name\s*\(\s*\))/g);
  const robots = [];
  for (const p of parts) {
    const trimmed = p.trim();
    if (trimmed && /function\s+name\s*\(/.test(trimmed)) {
      robots.push(trimmed.replace(/\/\/\s*=+.*?=+\s*/g, '').trim());
    }
  }
  return robots.slice(0, 6);
}

async function runBattle({ redCodes, blueCodes, headless = true, timeoutMs = 45000 }) {
  const browser = await puppeteer.launch({
    headless,
    args: [
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--allow-file-access-from-files',
    ],
  });
  let page;
  let outcome = { winner: null, logs: [] };
  try {
    page = await browser.newPage();
    page.on('console', (msg) => {
      const txt = msg.text();
      outcome.logs.push(txt);
    });
    const fileUrl = 'file://' + path.resolve('tank_battle_platform.html');
    await page.goto(fileUrl, { waitUntil: 'load' });
    // Wait for setup screen to be ready
    await page.waitForSelector('#setup-screen');

    // Provide codes into textareas directly
    await page.evaluate((rc, bc) => {
      const ensureInputs = () => {
        if (!document.querySelector('#red-code-1')) {
          // Sometimes DOMContentLoaded may not yet have run; but platform adds inputs on DOMContentLoaded
          if (typeof createPlayerInputs === 'function') {
            createPlayerInputs();
          }
        }
      };
      ensureInputs();
      const setTeam = (team, codes) => {
        for (let i = 0; i < Math.min(codes.length, 6); i++) {
          const el = document.getElementById(`${team}-code-${i + 1}`);
          if (el) el.value = codes[i];
        }
      };
      // Set team names to minimize UI work
      const rn = document.getElementById('red-team-name');
      const bn = document.getElementById('blue-team-name');
      if (rn) rn.value = 'RED';
      if (bn) bn.value = 'BLUE';
      setTeam('red', rc);
      setTeam('blue', bc);
    }, redCodes, blueCodes);

    // Switch to battle screen and start
    await page.evaluate(() => {
      if (typeof startSetup === 'function') startSetup();
      if (typeof startBattle === 'function') startBattle();
    });

    // Wait for game end or timeout
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const state = await page.evaluate(() => {
        const running = typeof gameRunning !== 'undefined' ? gameRunning : false;
        let redAlive = 0, blueAlive = 0;
        let redEnergy = 0, blueEnergy = 0;
        if (typeof tanks !== 'undefined') {
          for (const t of tanks) {
            if (t.team === 'red') { if (t.alive) redAlive++; if (t.alive) redEnergy += Math.max(0, t.health); }
            else { if (t.alive) blueAlive++; if (t.alive) blueEnergy += Math.max(0, t.health); }
          }
        }
        return { running, redAlive, blueAlive, redEnergy, blueEnergy };
      });
      if (!state.running) {
        if (state.redAlive === 0 && state.blueAlive > 0) outcome.winner = 'blue';
        else if (state.blueAlive === 0 && state.redAlive > 0) outcome.winner = 'red';
        else outcome.winner = state.redEnergy >= state.blueEnergy ? 'red' : 'blue';
        break;
      }
      await new Promise(r => setTimeout(r, 100));
    }
    if (!outcome.winner) {
      // Timeout: decide by energy
      const state = await page.evaluate(() => {
        let redEnergy = 0, blueEnergy = 0;
        if (typeof tanks !== 'undefined') {
          for (const t of tanks) {
            if (t.team === 'red') { if (t.alive) redEnergy += Math.max(0, t.health); }
            else { if (t.alive) blueEnergy += Math.max(0, t.health); }
          }
        }
        return { redEnergy, blueEnergy };
      });
      outcome.winner = state.redEnergy >= state.blueEnergy ? 'red' : 'blue';
    }
  } finally {
    if (page) await page.close().catch(() => {});
    await browser.close().catch(() => {});
  }
  return outcome;
}

function readResultFile(filePath) {
  const text = fs.readFileSync(filePath, 'utf-8');
  return splitRobotCodes(text);
}

async function main() {
  if (process.argv.includes('--self-test')) {
    // Use default placeholder code from platform for both teams as sanity check
    const defaultRobot = (i, team) => `function name(){return '${team.toUpperCase()}${i}';}\nfunction type(){return 0;}\nfunction update(tank,enemies){ if(enemies.length){ const n=enemies[0]; for(const e of enemies){ if(e.distance<n.distance) n=e; } const a=Math.atan2(n.y-tank.y,n.x-tank.x)*180/Math.PI; tank.fire(a); tank.move((a+180+Math.random()*60-30+360)%360); } }`;
    const rc = Array.from({ length: 6 }, (_, i) => defaultRobot(i + 1, 'r'));
    const bc = Array.from({ length: 6 }, (_, i) => defaultRobot(i + 1, 'b'));
    const out = await runBattle({ redCodes: rc, blueCodes: bc, headless: 'new' });
    console.log('Self-test winner:', out.winner);
  } else {
    const a = process.argv[2];
    const b = process.argv[3];
    if (!a || !b) {
      console.error('Usage: node tools/simulate.js <red_file.txt> <blue_file.txt>');
      process.exit(2);
    }
    const redCodes = readResultFile(a);
    const blueCodes = readResultFile(b);
    const out = await runBattle({ redCodes, blueCodes, headless: 'new' });
    console.log(JSON.stringify(out));
  }
}

if (require.main === module) {
  main().catch((e) => { console.error(e); process.exit(1); });
}

module.exports = { runBattle, splitRobotCodes };

