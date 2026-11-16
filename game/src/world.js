// The world: everything that happens in the arena. The player, the Heartseed,
// the waves and their budgets, bullets and enemy shots, pickups, the shop's
// economy and the win/lose rules. It steps in fixed 1/60 s slices and reports
// what happened as event bits, so main.js only has to switch screens.
import { ARENA, BULLET, ENEMIES, PLAYER, SEED, STEP, WAVES } from './config.js';
import { createEnemy, KIND_WARDEN, pickSpawnKind, spawnAtEdge, stepEnemy } from './enemies.js';
import { createPickup, dropsFor, PICKUP_HEART, PICKUP_SHARD, PICKUP_SHIELD, PICKUP_SPREAD, stepPickup } from './pickups.js';
import { buyUpgrade, createShop } from './upgrades.js';

export const EVENT_HIT = 1;
export const EVENT_OVER = 2;
export const EVENT_WIN = 4;
export const EVENT_WAVE_CLEAR = 8;
export const EVENT_SHOP = 16;
export const EVENT_BOSS = 32;

export const PHASE_ANNOUNCE = 'announce';
export const PHASE_FIGHT = 'fight';
export const PHASE_SHOP = 'shop';
export const PHASE_DONE = 'done';

function freshPlayer() {
  return {
    x: ARENA.width / 2,
    y: ARENA.height / 2 + 170,
    vx: 0, vy: 0,
    radius: PLAYER.radius,
    hp: PLAYER.hp,
    maxHp: PLAYER.hp,
    speed: PLAYER.speed,
    fireInterval: PLAYER.fireInterval,
    bulletDamage: PLAYER.bulletDamage,
    shots: 1,
    magnetRadius: PLAYER.magnetRadius,
    shields: 0,
    invulnerable: 0,
    fireCooldown: 0,
    spreadTimer: 0,
    aimX: ARENA.width / 2,
    aimY: ARENA.height / 2 - 100,
    moving: false,
  };
}

export function createWorld(random, effects, audio) {
  const state = {
    player: freshPlayer(),
    seed: { hp: SEED.hp, maxHp: SEED.hp, flash: 0 },
    enemies: [],
    bullets: [],
    enemyShots: [],
    pickups: [],
    shop: createShop(),
    wave: 0,
    phase: PHASE_ANNOUNCE,
    phaseTimer: 0,
    budgetLeft: 0,
    spawnTimer: 0,
    score: 0,
    shards: 0,
    kills: 0,
    time: 0,
    bossAlive: false,
    over: false,
    won: false,
  };

  function startWave(wave) {
    state.wave = wave;
    state.phase = PHASE_ANNOUNCE;
    state.phaseTimer = 2.2;
    state.budgetLeft = WAVES.budget(wave);
    state.spawnTimer = 0.6;
    state.bossAlive = false;
    if (wave % WAVES.bossEvery === 0) {
      state.bossAlive = true;
    }
    audio.wave();
  }

  function spawnBoss() {
    const boss = createEnemy(KIND_WARDEN, ARENA.width / 2, -60, state.wave);
    state.enemies.push(boss);
    audio.boss();
    effects.shake(0.5, 9);
    effects.ring(ARENA.width / 2, 120, '#e8d44d', 160);
  }

  function spawnOne() {
    const kind = pickSpawnKind(random, state.wave, state.budgetLeft);
    if (!kind) return;
    state.budgetLeft -= ENEMIES[kind].cost;
    state.enemies.push(spawnAtEdge(random, kind, state.wave));
  }

  function fireBullets() {
    const player = state.player;
    const count = player.shots + (player.spreadTimer > 0 ? 1 : 0);
    const baseAngle = Math.atan2(player.aimY - player.y, player.aimX - player.x);
    for (let i = 0; i < count; i += 1) {
      const offset = (i - (count - 1) / 2) * BULLET.spread;
      const angle = baseAngle + offset;
      state.bullets.push({
        x: player.x + Math.cos(angle) * (player.radius + 6),
        y: player.y + Math.sin(angle) * (player.radius + 6),
        vx: Math.cos(angle) * PLAYER.bulletSpeed,
        vy: Math.sin(angle) * PLAYER.bulletSpeed,
        damage: player.bulletDamage,
        radius: PLAYER.bulletRadius,
        life: BULLET.life,
        hostile: false,
      });
    }
    player.fireCooldown = player.fireInterval;
    audio.shoot();
    effects.burst(player.x + Math.cos(baseAngle) * 22, player.y + Math.sin(baseAngle) * 22, '#ffe9a8', 2, 90);
  }

  function damagePlayer(amount) {
    const player = state.player;
    if (player.invulnerable > 0 || state.over) return false;
    if (player.shields > 0) {
      player.shields -= 1;
      player.invulnerable = 0.8;
      effects.ring(player.x, player.y, '#8ef1ff', 60);
      effects.floatText(player.x, player.y - 24, 'Blocked!', '#8ef1ff', 14);
      audio.enemyHit();
      return false;
    }
    player.hp -= amount;
    player.invulnerable = PLAYER.invulnerableSeconds;
    effects.shake(0.35, 8);
    effects.burst(player.x, player.y, '#ff5d73', 14, 220);
    audio.playerHit();
    return true;
  }

  function damageSeed(amount, x, y) {
    state.seed.hp -= amount;
    state.seed.flash = 0.3;
    effects.shake(0.3, 6);
    effects.burst(x, y, '#ff5d73', 10, 160);
    audio.playerHit();
    if (state.seed.hp <= 0) {
      state.seed.hp = 0;
      state.over = true;
    }
  }

  function killEnemy(index) {
    const enemy = state.enemies[index];
    state.enemies.splice(index, 1);
    state.score += enemy.score;
    state.kills += 1;
    effects.burst(enemy.x, enemy.y, enemy.color, enemy.kind === KIND_WARDEN ? 40 : 12, 240);
    effects.floatText(enemy.x, enemy.y - enemy.radius, `+${enemy.score}`, '#ffd76a', 14);
    for (const drop of dropsFor(enemy, random)) state.pickups.push(drop);
    audio.enemyDie();
    if (enemy.kind === KIND_WARDEN) {
      state.bossAlive = false;
      effects.ring(enemy.x, enemy.y, '#e8d44d', 200);
      effects.shake(0.6, 10);
      state.score += 250;
    }
  }

  function collectPickup(index) {
    const pickup = state.pickups[index];
    state.pickups.splice(index, 1);
    const player = state.player;
    if (pickup.kind === PICKUP_SHARD) {
      state.shards += pickup.value;
      audio.shard();
      effects.burst(pickup.x, pickup.y, '#8ef1ff', 4, 120);
    } else if (pickup.kind === PICKUP_HEART) {
      player.hp = Math.min(player.maxHp, player.hp + 1);
      audio.heart();
      effects.floatText(player.x, player.y - 26, '+1 heart', '#ff7d9c', 15);
    } else if (pickup.kind === PICKUP_SPREAD) {
      player.spreadTimer = 12;
      audio.heart();
      effects.floatText(player.x, player.y - 26, 'Twin Bloom!', '#ffe9a8', 15);
    } else if (pickup.kind === PICKUP_SHIELD) {
      player.shields = Math.min(3, player.shields + 1);
      audio.heart();
      effects.floatText(player.x, player.y - 26, 'Bark Shield!', '#8ef1ff', 15);
    }
  }

  function stepPlay(dt, move, aim, firing) {
    const player = state.player;
    state.time += dt;
    player.invulnerable = Math.max(0, player.invulnerable - dt);
    player.spreadTimer = Math.max(0, player.spreadTimer - dt);
    state.seed.flash = Math.max(0, state.seed.flash - dt);

    // Movement, normalised so diagonals are not faster.
    const length = Math.hypot(move.x, move.y) || 1;
    const nx = move.x / length;
    const ny = move.y / length;
    player.moving = move.x !== 0 || move.y !== 0;
    player.x = Math.max(PLAYER.radius, Math.min(ARENA.width - PLAYER.radius, player.x + nx * player.speed * dt * (player.moving ? 1 : 0)));
    player.y = Math.max(PLAYER.radius, Math.min(ARENA.height - PLAYER.radius, player.y + ny * player.speed * dt * (player.moving ? 1 : 0)));
    player.aimX = aim.x;
    player.aimY = aim.y;

    player.fireCooldown -= dt;
    if (firing && player.fireCooldown <= 0) fireBullets();

    // Wave announce: the banner shows, then the fight begins.
    if (state.phase === PHASE_ANNOUNCE) {
      state.phaseTimer -= dt;
      if (state.phaseTimer <= 0) {
        state.phase = PHASE_FIGHT;
        if (state.bossAlive) spawnBoss();
      }
    }

    // Spawn from the wave budget while the fight runs.
    if (state.phase === PHASE_FIGHT && state.budgetLeft > 0) {
      state.spawnTimer -= dt;
      if (state.spawnTimer <= 0 && state.enemies.length < WAVES.aliveCap(state.wave)) {
        state.spawnTimer = WAVES.spawnInterval(state.wave);
        spawnOne();
      }
    }

    // Enemies move; the ones that reach the Heartseed chew it and burst.
    const shots = [];
    for (let i = state.enemies.length - 1; i >= 0; i -= 1) {
      const enemy = state.enemies[i];
      stepEnemy(enemy, dt, player, state.seed, shots);
      const seedDx = enemy.x - SEED.x;
      const seedDy = enemy.y - SEED.y;
      if (Math.hypot(seedDx, seedDy) < SEED.radius + enemy.radius - 4) {
        damageSeed(enemy.damage, enemy.x, enemy.y);
        state.enemies.splice(i, 1);
        effects.burst(enemy.x, enemy.y, enemy.color, 10, 200);
      }
    }
    for (const shot of shots) state.enemyShots.push(shot);

    // Bullets fly and hit enemies.
    for (let i = state.bullets.length - 1; i >= 0; i -= 1) {
      const bullet = state.bullets[i];
      bullet.life -= dt;
      bullet.x += bullet.vx * dt;
      bullet.y += bullet.vy * dt;
      let dead = bullet.life <= 0 || bullet.x < -20 || bullet.x > ARENA.width + 20 || bullet.y < -20 || bullet.y > ARENA.height + 20;
      if (!dead) {
        for (let j = state.enemies.length - 1; j >= 0; j -= 1) {
          const enemy = state.enemies[j];
          const dx = bullet.x - enemy.x;
          const dy = bullet.y - enemy.y;
          if (dx * dx + dy * dy < (bullet.radius + enemy.radius) * (bullet.radius + enemy.radius)) {
            enemy.hp -= bullet.damage;
            enemy.flash = 0.12;
            effects.burst(bullet.x, bullet.y, enemy.color, 3, 120);
            audio.enemyHit();
            if (enemy.hp <= 0) killEnemy(j);
            dead = true;
            break;
          }
        }
      }
      if (dead) state.bullets.splice(i, 1);
    }

    // Enemy shots fly and hit the player or the Heartseed.
    for (let i = state.enemyShots.length - 1; i >= 0; i -= 1) {
      const shot = state.enemyShots[i];
      shot.x += shot.vx * dt;
      shot.y += shot.vy * dt;
      let dead = shot.x < -20 || shot.x > ARENA.width + 20 || shot.y < -20 || shot.y > ARENA.height + 20;
      if (!dead) {
        const dx = shot.x - player.x;
        const dy = shot.y - player.y;
        if (dx * dx + dy * dy < (shot.radius + PLAYER.radius) * (shot.radius + PLAYER.radius)) {
          damagePlayer(shot.damage);
          dead = true;
        }
      }
      if (!dead) {
        const sdx = shot.x - SEED.x;
        const sdy = shot.y - SEED.y;
        if (sdx * sdx + sdy * sdy < (shot.radius + SEED.radius) * (shot.radius + SEED.radius)) {
          damageSeed(shot.damage, shot.x, shot.y);
          dead = true;
        }
      }
      if (dead) state.enemyShots.splice(i, 1);
    }

    // Enemies touching the player hurt them.
    for (let i = state.enemies.length - 1; i >= 0; i -= 1) {
      const enemy = state.enemies[i];
      const dx = enemy.x - player.x;
      const dy = enemy.y - player.y;
      if (dx * dx + dy * dy < (enemy.radius + PLAYER.radius) * (enemy.radius + PLAYER.radius)) {
        if (damagePlayer(enemy.damage)) {
          // A hit knocks the enemy back so it cannot drain the player at once.
          enemy.x += (dx / (Math.hypot(dx, dy) || 1)) * 26;
          enemy.y += (dy / (Math.hypot(dx, dy) || 1)) * 26;
        }
      }
    }

    // Pickups drift, get pulled in, and are collected.
    for (let i = state.pickups.length - 1; i >= 0; i -= 1) {
      const pickup = state.pickups[i];
      stepPickup(pickup, dt, player);
      pickup.life -= dt;
      const dx = pickup.x - player.x;
      const dy = pickup.y - player.y;
      const reach = PLAYER.pickupRadius + pickup.radius;
      if (dx * dx + dy * dy < reach * reach) collectPickup(i);
      else if (pickup.life <= 0) state.pickups.splice(i, 1);
    }

    effects.step(dt);

    // Wave cleared: no budget left and no enemies standing.
    if (state.phase === PHASE_FIGHT && state.budgetLeft <= 0 && state.enemies.length === 0) {
      const bonus = 50 * state.wave;
      state.score += bonus;
      state.shards += 3;
      if (state.wave >= WAVES.total) {
        state.phase = PHASE_DONE;
        state.won = true;
        state.over = true;
        audio.victory();
        return EVENT_WIN;
      }
      state.phase = PHASE_SHOP;
      audio.buy();
      return EVENT_WAVE_CLEAR | EVENT_SHOP;
    }

    if (player.hp <= 0 || state.seed.hp <= 0) {
      state.over = true;
      state.phase = PHASE_DONE;
      effects.shake(0.6, 12);
      return EVENT_OVER;
    }
    return 0;
  }

  // The title screen's living backdrop: motes drift in, circle the Heartseed
  // and fade, so the title never sits over a still frame.
  function stepDemo(dt) {
    state.time += dt;
    if (state.enemies.length < 7 && Math.random() < dt * 1.2) {
      const angle = random.angle();
      const enemy = createEnemy('mote', SEED.x + Math.cos(angle) * 420, SEED.y + Math.sin(angle) * 260, 1);
      enemy.vx = 0;
      enemy.vy = 0;
      state.enemies.push(enemy);
    }
    for (let i = state.enemies.length - 1; i >= 0; i -= 1) {
      const enemy = state.enemies[i];
      enemy.t += dt;
      const angle = Math.atan2(enemy.y - SEED.y, enemy.x - SEED.x) + dt * 0.25;
      const radius = 200 + Math.sin(enemy.t * 0.5) * 40;
      enemy.x = SEED.x + Math.cos(angle) * radius;
      enemy.y = SEED.y + Math.sin(angle) * radius * 0.7;
      if (enemy.t > 9) state.enemies.splice(i, 1);
    }
    effects.step(dt);
    return 0;
  }

  return {
    state,
    reset() {
      state.player = freshPlayer();
      state.seed = { hp: SEED.hp, maxHp: SEED.hp, flash: 0 };
      state.enemies.length = 0;
      state.bullets.length = 0;
      state.enemyShots.length = 0;
      state.pickups.length = 0;
      state.shop = createShop();
      state.wave = 0;
      state.phase = PHASE_ANNOUNCE;
      state.phaseTimer = 0;
      state.budgetLeft = 0;
      state.spawnTimer = 0;
      state.score = 0;
      state.shards = 0;
      state.kills = 0;
      state.time = 0;
      state.bossAlive = false;
      state.over = false;
      state.won = false;
      effects.clear();
    },
    startWave,
    buy(index) {
      return buyUpgrade(state.shop, state, index);
    },
    // Begin the next wave after the shop; called from the shop screen.
    nextWave() {
      if (state.phase !== PHASE_SHOP) return;
      startWave(state.wave + 1);
    },
    // One fixed step. `demo` runs the title backdrop instead of the fight.
    step(dt, move, aim, firing, demo = false) {
      if (demo) return stepDemo(dt);
      if (state.over || state.phase === PHASE_SHOP) {
        effects.step(dt);
        return 0;
      }
      return stepPlay(dt, move, aim, firing);
    },
  };
}
