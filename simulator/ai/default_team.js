// 기본 예시 팀 코드 (6개 로봇)
// 각 로봇은 function name(), function type(), function update(...)를 포함합니다.

function name() {
  return 'Player R1';
}
function type() {
  return Type.NORMAL; // Type.TANKER, Type.DEALER
}
function update(tank, enemies, allies, bulletInfo) {
  if (enemies.length > 0) {
    let nearest = enemies[0];
    for (let enemy of enemies) {
      if (enemy.distance < nearest.distance) {
        nearest = enemy;
      }
    }
    const fireAngle = Math.atan2(nearest.y - tank.y, nearest.x - tank.x) * 180 / Math.PI;
    tank.fire(fireAngle);
    if(!tank.move(Math.random() * 360)) {
      tank.move(fireAngle + 180);
    }
  }
}

// ===== 다음 로봇 =====

function name() {
  return 'Player R2';
}
function type() {
  return Type.NORMAL; // Type.TANKER, Type.DEALER
}
function update(tank, enemies, allies, bulletInfo) {
  if (enemies.length > 0) {
    let nearest = enemies[0];
    for (let enemy of enemies) {
      if (enemy.distance < nearest.distance) {
        nearest = enemy;
      }
    }
    const fireAngle = Math.atan2(nearest.y - tank.y, nearest.x - tank.x) * 180 / Math.PI;
    tank.fire(fireAngle);
    if(!tank.move(Math.random() * 360)) {
      tank.move(fireAngle + 180);
    }
  }
}

// ===== 다음 로봇 =====

function name() {
  return 'Player R3';
}
function type() {
  return Type.NORMAL; // Type.TANKER, Type.DEALER
}
function update(tank, enemies, allies, bulletInfo) {
  if (enemies.length > 0) {
    let nearest = enemies[0];
    for (let enemy of enemies) {
      if (enemy.distance < nearest.distance) {
        nearest = enemy;
      }
    }
    const fireAngle = Math.atan2(nearest.y - tank.y, nearest.x - tank.x) * 180 / Math.PI;
    tank.fire(fireAngle);
    if(!tank.move(Math.random() * 360)) {
      tank.move(fireAngle + 180);
    }
  }
}

// ===== 다음 로봇 =====

function name() {
  return 'Player R4';
}
function type() {
  return Type.NORMAL; // Type.TANKER, Type.DEALER
}
function update(tank, enemies, allies, bulletInfo) {
  if (enemies.length > 0) {
    let nearest = enemies[0];
    for (let enemy of enemies) {
      if (enemy.distance < nearest.distance) {
        nearest = enemy;
      }
    }
    const fireAngle = Math.atan2(nearest.y - tank.y, nearest.x - tank.x) * 180 / Math.PI;
    tank.fire(fireAngle);
    if(!tank.move(Math.random() * 360)) {
      tank.move(fireAngle + 180);
    }
  }
}

// ===== 다음 로봇 =====

function name() {
  return 'Player R5';
}
function type() {
  return Type.NORMAL; // Type.TANKER, Type.DEALER
}
function update(tank, enemies, allies, bulletInfo) {
  if (enemies.length > 0) {
    let nearest = enemies[0];
    for (let enemy of enemies) {
      if (enemy.distance < nearest.distance) {
        nearest = enemy;
      }
    }
    const fireAngle = Math.atan2(nearest.y - tank.y, nearest.x - tank.x) * 180 / Math.PI;
    tank.fire(fireAngle);
    if(!tank.move(Math.random() * 360)) {
      tank.move(fireAngle + 180);
    }
  }
}

// ===== 다음 로봇 =====

function name() {
  return 'Player R6';
}
function type() {
  return Type.NORMAL; // Type.TANKER, Type.DEALER
}
function update(tank, enemies, allies, bulletInfo) {
  if (enemies.length > 0) {
    let nearest = enemies[0];
    for (let enemy of enemies) {
      if (enemy.distance < nearest.distance) {
        nearest = enemy;
      }
    }
    const fireAngle = Math.atan2(nearest.y - tank.y, nearest.x - tank.x) * 180 / Math.PI;
    tank.fire(fireAngle);
    if(!tank.move(Math.random() * 360)) {
      tank.move(fireAngle + 180);
    }
  }
}

