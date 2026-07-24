
    const canvas = document.getElementById('game');
    const ctx = canvas.getContext('2d');
    const WIDTH = canvas.width;
    const HEIGHT = canvas.height;
    const DEPLOY_ZONE_WIDTH = 240;
    const MAX_LIVES = 1;

    const stickmanTypes = [
      { id: 1, name: 'Wizard', icon: '🧙', face: '😄', cost: 90, range: 180, fireRate: 75, damage: 24, health: 110, color: '#8b5cf6' },
      { id: 2, name: 'Sniper', icon: '🎯', face: '😎', cost: 95, range: 240, fireRate: 90, damage: 32, health: 80, color: '#06b6d4' },
      { id: 3, name: 'Machinegunner', icon: '💥', face: '😠', cost: 85, range: 120, fireRate: 40, damage: 18, health: 120, color: '#fb923c' },
      { id: 4, name: 'Puncher', icon: '🥊', face: '😤', cost: 65, range: 80, fireRate: 45, damage: 36, health: 130, color: '#ef4444' },
      { id: 5, name: 'Ninja', icon: '🥷', face: '😶', cost: 75, range: 145, fireRate: 55, damage: 24, health: 90, color: '#0f172a' },
      { id: 6, name: 'Swordsman', icon: '⚔️', face: '😐', cost: 70, range: 130, fireRate: 60, damage: 26, health: 100, color: '#a855f7' },
      { id: 7, name: 'Archer', icon: '🏹', face: '🙂', cost: 65, range: 190, fireRate: 65, damage: 20, health: 90, color: '#22c55e' },
      { id: 8, name: 'Lightsaber', icon: '🔦', face: '😈', cost: 100, range: 165, fireRate: 70, damage: 30, health: 95, color: '#38bdf8' },
    ];

    const state = {
      towers: [
        { x: 100, y: HEIGHT / 2 + 20, range: 120, fireRate: 70, cooldown: 0, health: 1000, maxHealth: 1000, base: true, label: 'Left Tower', color: '#06d6a0' },
        { x: WIDTH / 2, y: HEIGHT / 2 + 20, range: 160, fireRate: 40, cooldown: 0, health: 5000, maxHealth: 5000, base: true, label: 'Center Tower', color: '#ffd166' },
        { x: WIDTH - 100, y: HEIGHT / 2 + 20, range: 120, fireRate: 70, cooldown: 0, health: 1000, maxHealth: 1000, base: true, label: 'Right Tower', color: '#06d6a0' },
      ],
      enemies: [],
      bullets: [],
      money: 100,
      moneyFloat: 100,
      lives: MAX_LIVES,
      wave: 1,
      spawnTimer: 0,
      enemiesLeft: 10,
      gameOver: false,
      message: 'Drag a unit to deploy to the battlefield.',
    };

    let dragState = null;
    let lastTimestamp = 0;

    const unitBox = document.getElementById('unitBox');
    const dragPreview = document.getElementById('dragPreview');
    const waveText = document.getElementById('waveText');
    const moneyText = document.getElementById('moneyText');
    const messageText = document.getElementById('messageText');

    function createUnitCard(type) {
      const card = document.createElement('div');
      card.className = 'unit-card';
      card.dataset.unitId = type.id;

      const icon = document.createElement('div');
      icon.className = 'unit-icon';
      icon.style.background = type.color;
      icon.innerHTML = `<span class="unit-icon-weapon">${type.icon}</span><span class="unit-icon-face">${type.face}</span>`;

      const details = document.createElement('div');
      details.className = 'unit-details';
      details.innerHTML = `
        <div><strong>${type.name}</strong></div>
        <div class="unit-cost">Price: ${type.cost}</div>
        <div class="unit-stats">
          <span>DMG:${type.damage}</span>
          <span>HP:${type.health}</span>
          <span>RNG:${type.range}</span>
        </div>
      `;

      card.append(icon, details);
      card.addEventListener('pointerdown', (event) => {
        event.preventDefault();
        dragState = {
          type,
          offsetX: 45,
          offsetY: 45,
        };
        dragPreview.style.display = 'block';
        dragPreview.textContent = `${type.name} - $${type.cost}`;
        updateDragPreviewPosition(event.clientX, event.clientY);
      });

      return card;
    }

    function populateUnitBox() {
      stickmanTypes.forEach((type) => {
        unitBox.appendChild(createUnitCard(type));
      });
    }

    function updateDragPreviewPosition(pageX, pageY) {
      dragPreview.style.left = `${pageX + 12}px`;
      dragPreview.style.top = `${pageY + 12}px`;
    }

    function placeUnit(x, y, type) {
      const positionY = Math.max(HEIGHT / 2 - 40, Math.min(HEIGHT / 2 + 40, y));
      state.towers.push({
        x,
        y: positionY,
        range: type.range,
        fireRate: type.fireRate,
        cooldown: 0,
        health: type.health * 10,
        maxHealth: type.health * 10,
        base: false,
        label: type.name,
        color: type.color,
      });
      state.money -= type.cost;
      state.message = `${type.name} deployed\!`;
    }

    function isOverlappingTower(x, y) {
      return state.towers.some((tower) => Math.hypot(tower.x - x, tower.y - y) < 50);
    }

    document.addEventListener('pointermove', (event) => {
      if (\!dragState) return;
      updateDragPreviewPosition(event.clientX, event.clientY);
    });

    document.addEventListener('pointerup', (event) => {
      if (\!dragState) return;
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      if (event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom) {
        if (x > DEPLOY_ZONE_WIDTH) {
          state.message = 'Drop into the left deployment zone.';
        } else if (state.money < dragState.type.cost) {
          state.message = 'Not enough money for that unit.';
        } else if (isOverlappingTower(x, y)) {
          state.message = 'Too close to another tower.';
        } else {
          placeUnit(x, y, dragState.type);
        }
      } else {
        state.message = 'Drop a unit inside the battlefield area.';
      }
      dragState = null;
      dragPreview.style.display = 'none';
    });

    function createEnemy() {
      const speed = 1 + state.wave * 0.08;
      const health = 20 + state.wave * 6;
      return { x: -30, y: HEIGHT / 2 + 20, speed, maxHealth: health, health, dead: false };
    }

    function drawStickman(x, y, scale = 1, color = '#ffffff') {
      ctx.strokeStyle = color;
      ctx.lineWidth = 2 * scale;
      ctx.beginPath();
      ctx.arc(x, y - 14 * scale, 8 * scale, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x, y - 6 * scale);
      ctx.lineTo(x, y + 14 * scale);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x, y + 2 * scale);
      ctx.lineTo(x - 8 * scale, y + 10 * scale);
      ctx.moveTo(x, y + 2 * scale);
      ctx.lineTo(x + 8 * scale, y + 10 * scale);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x, y + 14 * scale);
      ctx.lineTo(x - 7 * scale, y + 24 * scale);
      ctx.moveTo(x, y + 14 * scale);
      ctx.lineTo(x + 7 * scale, y + 24 * scale);
      ctx.stroke();
    }

    function drawTower(tower) {
      const size = tower.base ? 52 : 32;
      ctx.fillStyle = tower.color;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = tower.base ? 3 : 2;
      ctx.beginPath();
      ctx.arc(tower.x, tower.y - 12, size / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      drawStickman(tower.x, tower.y, tower.base ? 1.2 : 0.85, '#082032');
      if (tower.base) {
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(tower.label, tower.x, tower.y + size / 2 + 16);
      }
      const healthWidth = tower.base ? 88 : 58;
      const healthHeight = 8;
      const healthPct = Math.max(0, tower.health / tower.maxHealth);
      ctx.fillStyle = '#1f2937';
      ctx.fillRect(tower.x - healthWidth / 2, tower.y + size / 2 + 6, healthWidth, healthHeight);
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(tower.x - healthWidth / 2, tower.y + size / 2 + 6, healthWidth * healthPct, healthHeight);
    }

    function drawEnemy(enemy) {
      drawStickman(enemy.x, enemy.y, 1, '#fff3c4');
      const healthWidth = 30;
      const healthHeight = 6;
      const healthPct = Math.max(0, enemy.health / enemy.maxHealth);
      ctx.fillStyle = '#1f2937';
      ctx.fillRect(enemy.x - healthWidth / 2, enemy.y - 36, healthWidth, healthHeight);
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(enemy.x - healthWidth / 2, enemy.y - 36, healthWidth * healthPct, healthHeight);
    }

    function drawBullet(bullet) {
      ctx.fillStyle = '#8ecae6';
      ctx.beginPath();
      ctx.arc(bullet.x, bullet.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    function update(delta) {
      if (state.gameOver) return;
      state.moneyFloat += 100 * (delta / 1000);
      state.money = Math.floor(state.moneyFloat);
      if (state.enemiesLeft > 0) {
        state.spawnTimer -= delta;
        if (state.spawnTimer <= 0) {
          state.enemies.push(createEnemy());
          state.enemiesLeft -= 1;
          state.spawnTimer = 900;
        }
      }
      state.enemies.forEach((enemy) => {
        enemy.x += enemy.speed;
        if (\!enemy.dead) {
          state.towers.forEach((tower) => {
            if (tower.base && tower.health > 0) {
              const dx = enemy.x - tower.x;
              const dy = enemy.y - tower.y;
              if (Math.hypot(dx, dy) < 24) {
                tower.health -= 12;
                enemy.dead = true;
                state.message = `${tower.label} was hit\!`;
                if (tower.health <= 0) {
                  tower.health = 0;
                  state.message = `${tower.label} destroyed\!`;
                }
              }
            }
          });
        }
        if (enemy.x > WIDTH + 20) {
          enemy.dead = true;
          state.lives -= 1;
          state.message = 'A stickman got through\!';
        }
      });
      state.towers.forEach((tower) => {
        if (tower.base && tower.health <= 0) return;
        if (tower.cooldown > 0) tower.cooldown -= delta;
        if (tower.cooldown <= 0) {
          const target = state.enemies.filter((enemy) => \!enemy.dead).find((enemy) => {
            const dx = enemy.x - tower.x;
            const dy = enemy.y - tower.y;
            return Math.sqrt(dx * dx + dy * dy) <= tower.range;
          });
          if (target) {
            state.bullets.push({ x: tower.x + 14, y: tower.y - 10, vx: (target.x - tower.x) / 18, vy: (target.y - tower.y) / 18, target });
            tower.cooldown = tower.fireRate;
          }
        }
      });
      state.bullets.forEach((bullet) => {
        bullet.x += bullet.vx;
        bullet.y += bullet.vy;
        if (bullet.target.dead) bullet.dead = true;
        else if (Math.hypot(bullet.x - bullet.target.x, bullet.y - bullet.target.y) < 12) {
          bullet.dead = true;
          bullet.target.health -= 12;
          if (bullet.target.health <= 0) {
            bullet.target.dead = true;
            state.moneyFloat += 12;
            state.money = Math.floor(state.moneyFloat);
            state.message = 'Stickman defeated\!';
          }
        }
      });
      state.enemies = state.enemies.filter((enemy) => \!enemy.dead || enemy.health > 0);
      state.bullets = state.bullets.filter((bullet) => \!bullet.dead && bullet.x >= -20 && bullet.x <= WIDTH + 20);
      if (state.enemiesLeft === 0 && state.enemies.length === 0) {
        state.wave += 1;
        state.enemiesLeft = 8 + state.wave * 2;
        state.spawnTimer = 900;
        state.message = `Wave ${state.wave} begins\!`;
      }
      if (state.lives <= 0) {
        state.lives = 0;
        state.gameOver = true;
        state.message = 'Game Over\! Refresh to play again.';
      }
      waveText.textContent = `Wave: ${state.wave}`;
      moneyText.textContent = `Money: ${state.money}`;
      messageText.textContent = state.message;
    }

    function draw() {
      ctx.clearRect(0, 0, WIDTH, HEIGHT);
      ctx.fillStyle = '#121b2f';
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
      ctx.fillStyle = 'rgba(255,255,255,0.05)';
      ctx.fillRect(0, 0, DEPLOY_ZONE_WIDTH, HEIGHT);
      ctx.fillStyle = '#a3d8ff';
      ctx.font = '16px Arial';
      ctx.fillText('Deployment Zone', 16, 30);
      ctx.strokeStyle = '#4c8bf5';
      ctx.lineWidth = 2;
      ctx.strokeRect(6, 6, DEPLOY_ZONE_WIDTH - 12, HEIGHT - 12);
      ctx.fillStyle = '#18263f';
      ctx.fillRect(0, HEIGHT / 2 - 60, WIDTH, 120);
      ctx.strokeStyle = '#74c0fc';
      ctx.lineWidth = 2;
      ctx.setLineDash([10, 10]);
      ctx.beginPath();
      ctx.moveTo(0, HEIGHT / 2 + 20);
      ctx.lineTo(WIDTH, HEIGHT / 2 + 20);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#caf0f8';
      ctx.font = '20px Arial';
      ctx.fillText('Income: 100 / sec', 14, 48);
      ctx.fillText('Drag units into left zone', 14, 72);
      state.towers.forEach(drawTower);
      state.enemies.forEach(drawEnemy);
      state.bullets.forEach(drawBullet);
    }

    function loop(timestamp) {
      const delta = lastTimestamp ? timestamp - lastTimestamp : 16;
      lastTimestamp = timestamp;
      update(delta);
      draw();
      requestAnimationFrame(loop);
    }

    populateUnitBox();
    state.spawnTimer = 900;
    state.enemiesLeft = 10;
    loop();
  