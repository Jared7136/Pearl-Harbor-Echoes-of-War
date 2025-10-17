// === BASIC CONFIG ===
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
let cw, ch;

let game = {
  running: false,
  elapsed: 0,
  timer: 60,
  score: 0,
  lives: 3,
  laneCount: 3,
  laneY: [],
  obstacles: [],
  projectiles: [],
  spawnTimer: 0,
  spawnInterval: 900,
  educationalMessages: [
    "The attack on Pearl Harbor occurred December 7, 1941.",
    "The Japanese strike force used six aircraft carriers.",
    "Radio silence and careful planning were key to the operation."
  ],
  nextMsgIndex: 0,
};

// === LANE CALC ===
function computeLanes() {
  const top = ch * 0.2;
  const bottom = ch * 0.8;
  const gap = (bottom - top) / (game.laneCount - 1);
  game.laneY = [];
  for (let i = 0; i < game.laneCount; i++) game.laneY.push(top + i * gap);
}

// === PLAYER ===
class Player {
  constructor() {
    this.lane = 1;
    this.x = cw * 0.15;
    this.y = 0;
    this.radius = 20;
    this.color = "#ffd77a";
    this.reload = 0;
    this.reloadTime = 350;
  }
  moveTo(lane) {
    this.lane = Math.max(0, Math.min(game.laneCount - 1, lane));
  }
  update(dt) {
    if (this.reload > 0) this.reload = Math.max(0, this.reload - dt);
    const targetY = game.laneY[this.lane];
    this.y += (targetY - this.y) * 0.25;
  }
  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.ellipse(0, 0, 28, 16, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#b35b00";
    ctx.fillRect(-6, -20, 12, 6);
    ctx.restore();
  }
  shoot() {
    if (this.reload > 0) return;
    this.reload = this.reloadTime;
    game.projectiles.push(new Projectile(this.x + 36, this.y));
  }
}

// enemies
class Obstacle {
  constructor(type, lane, speed) {
    this.type = type;
    this.lane = lane;
    this.x = cw + 80;
    this.y = game.laneY[lane];
    this.speed = speed;
    this.radius = type === "mine" ? 20 : type === "bird" ? 14 : 18;
    this.hit = false;
  }
  update(dt) { this.x -= this.speed * (dt / 16); }
  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    if (this.type === "mine") {
      ctx.fillStyle = "#8b1a1a";
      ctx.beginPath(); ctx.arc(0, 0, this.radius, 0, Math.PI * 2); ctx.fill();
    } else if (this.type === "bird") {
      ctx.fillStyle = "#c4e6ff";
      ctx.beginPath();
      ctx.ellipse(0, 0, this.radius + 6, this.radius - 2, 0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = "#b8c3ff";
      ctx.beginPath();
      ctx.ellipse(0, 0, this.radius + 8, this.radius + 6, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

class Projectile {
  constructor(x, y) { this.x = x; this.y = y; this.speed = 10; this.radius = 6; this.dead = false; }
  update(dt) { this.x += this.speed * (dt / 16); if (this.x > cw + 50) this.dead = true; }
  draw(ctx) {
    ctx.save();
    ctx.fillStyle = "#fff8b0";
    ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
}

// inputs
let player;
const keys = {};
window.addEventListener("keydown", e => {
  keys[e.code] = true;
  if (e.code === "ArrowUp" || e.code === "KeyW") player.moveTo(player.lane - 1);
  if (e.code === "ArrowDown" || e.code === "KeyS") player.moveTo(player.lane + 1);
  if (e.code === "Space") player.shoot();
});
window.addEventListener("keyup", e => keys[e.code] = false);

// collisons
function checkCollisions() {
  game.projectiles.forEach(p => {
    game.obstacles.forEach(o => {
      if (!o.hit && Math.hypot(p.x - o.x, p.y - o.y) < p.radius + o.radius) {
        o.hit = true; p.dead = true; game.score += o.type === "fighter" ? 50 : 15;
      }
    });
  });
  game.obstacles.forEach(o => {
    if (!o.hit && Math.hypot(player.x - o.x, player.y - o.y) < player.radius + o.radius - 2) {
      o.hit = true; game.lives -= 1; if (game.lives <= 0) endGame(false);
    }
  });
}

// other
function spawnRandom() {
  const r = Math.random();
  let type = "mine";
  if (r > 0.85) type = "fighter"; else if (r > 0.6) type = "bird";
  const lane = Math.floor(Math.random() * game.laneCount);
  const speed = 3 + Math.random() * 3 + game.elapsed / 20000;
  game.obstacles.push(new Obstacle(type, lane, speed));
}

function updateHUD() {
  document.getElementById("score").innerText = Math.floor(game.score);
  document.getElementById("time").innerText = Math.ceil(game.timer);
  document.getElementById("lives").innerText = game.lives;
}
function endGame(win) {
  game.running = false;
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.fillRect(0, 0, cw, ch);
  ctx.fillStyle = "#fff";
  ctx.font = "28px sans-serif";
  ctx.fillText(win ? "You Survived!" : "Game Over", cw/2 - 100, ch/2);
  ctx.restore();
}

// loop
function loop(ts) {
  const dt = ts - game.lastTime;
  game.lastTime = ts;
  if (game.running) {
    game.elapsed += dt;
    game.spawnTimer += dt;
    if (game.spawnTimer > game.spawnInterval) {
      spawnRandom(); game.spawnTimer = 0;
    }
    game.timer -= dt / 1000;
    if (game.timer <= 0) endGame(true);
    player.update(dt);
    game.projectiles.forEach(p => p.update(dt));
    game.obstacles.forEach(o => o.update(dt));
    checkCollisions();
    game.projectiles = game.projectiles.filter(p => !p.dead);
    game.obstacles = game.obstacles.filter(o => !o.hit && o.x > -100);
    game.score += dt * 0.02;
    updateHUD();
  }

  ctx.clearRect(0, 0, cw, ch);
  const grd = ctx.createLinearGradient(0,0,0,ch);
  grd.addColorStop(0,'#4ec3ff'); grd.addColorStop(1,'#0b486b');
  ctx.fillStyle = grd; ctx.fillRect(0,0,cw,ch);
  for(let i=0;i<game.laneCount;i++){
    const y = game.laneY[i];
    ctx.fillStyle='rgba(255,255,255,0.03)';
    ctx.fillRect(0,y-40,cw,80);
  }
  player.draw(ctx);
  game.projectiles.forEach(p => p.draw(ctx));
  game.obstacles.forEach(o => o.draw(ctx));

  if (game.running) requestAnimationFrame(loop);
}

// start
function resizeCanvas() {
  cw = canvas.width = window.innerWidth;
  ch = canvas.height = window.innerHeight;
  computeLanes();
}
window.addEventListener("resize", resizeCanvas);
function startGame() {
  game.running = true;
  game.elapsed = 0;
  game.timer = 80;
  game.score = 0;
  game.lives = 3;
  game.obstacles = [];
  game.projectiles = [];
  game.spawnTimer = 0;
  player = new Player();
  computeLanes();
  player.y = game.laneY[player.lane];
  game.lastTime = performance.now();
  requestAnimationFrame(loop);
}
resizeCanvas();
startGame();