// The things that want the Heartseed gone. Each kind has one behaviour:
// motes drift straight at the player, darts zigzag fast, spitters hold range
// and shoot, brutes walk through bullets, and the Hollow Warden — the boss
// of waves 5 and 10 — fires radial bursts and calls motes to its side.
import { ARENA, ENEMIES, WAVES } from './config.js';

export const KIND_MOTE = 'mote';
export const KIND_DART = 'dart';
export const KIND_SPITTER = 'spitter';
export const KIND_BRUTE = 'brute';
export const KIND_WARDEN = 'warden';

// Which kinds a wave may spend its budget on; later waves unlock the nastier ones.
function kindsForWave(wave) {
  const kinds = [KIND_MOTE];
  if (wave >= 2) kinds.push(KIND_DART);
  if (wave >= 3) kinds.push(KIND_SPITTER);
  if (wave >= 4) kinds.push(KIND_BRUTE);
  return kinds;
}

// Pick one kind the wave can still afford, weighted toward the cheap ones.
export function pickSpawnKind(random, wave, budgetLeft) {
  const kinds = kindsForWave(wave).filter((kind) => ENEMIES[kind].cost <= budgetLeft);
  if (kinds.length === 0) return null;
  const weights = kinds.map((kind) => (kind === KIND_MOTE ? 5 : kind === KIND_DART ? 3 : kind === KIND_SPITTER ? 2 : 1));
  let total = 0;
  for (const weight of weights) total += weight;
  let roll = random.next() * total;
  for (let i = 0; i < kinds.length; i += 1) {
    roll -= weights[i];
    if (roll <= 0) return kinds[i];
  }
  return kinds[kinds.length - 1];
}

export function createEnemy(kind, x, y, wave) {
  const base = ENEMIES[kind];
  const hpScale = 1 + (wave - 1) * 0.12;
  return {
    kind,
    x, y,
    vx: 0, vy: 0,
    hp: Math.round(base.hp * hpScale),
    maxHp: Math.round(base.hp * hpScale),
    speed: base.speed * (1 + (wave - 1) * 0.03),
    radius: base.radius,
    damage: base.damage,
    score: base.score,
    shards: base.shards,
    color: base.color,
    // Per-kind timers: dart zigzag phase, spitter shot cooldown, warden bursts.
    t: Math.random() * 10,
    shootCooldown: 2 + Math.random() * 2,
    flash: 0,
    spawnAge: 0,
  };
}

export function spawnAtEdge(random, kind, wave) {
  const margin = 30;
  const side = random.int(0, 3);
  let x;
  let y;
  if (side === 0) { x = random.range(margin, ARENA.width - margin); y = -margin; }
  else if (side === 1) { x = ARENA.width + margin; y = random.range(margin, ARENA.height - margin); }
  else if (side === 2) { x = random.range(margin, ARENA.width - margin); y = ARENA.height + margin; }
  else { x = -margin; y = random.range(margin, ARENA.height - margin); }
  return createEnemy(kind, x, y, wave);
}

// Move one enemy for a step. Returns enemy shots fired this step (spitter and
// warden projectiles) as {x, y, vx, vy, damage, radius, color} objects.
export function stepEnemy(enemy, dt, player, seed, shots) {
  enemy.t += dt;
  enemy.spawnAge += dt;
  enemy.flash = Math.max(0, enemy.flash - dt);
  const dx = player.x - enemy.x;
  const dy = player.y - enemy.y;
  const dist = Math.hypot(dx, dy) || 1;
  const nx = dx / dist;
  const ny = dy / dist;

  if (enemy.kind === KIND_MOTE) {
    enemy.vx = nx * enemy.speed;
    enemy.vy = ny * enemy.speed;
  } else if (enemy.kind === KIND_DART) {
    // Fast, with a sideways sine wobble so it never flies in a straight line.
    const wobble = Math.sin(enemy.t * 6) * 0.7;
    enemy.vx = (nx - ny * wobble) * enemy.speed;
    enemy.vy = (ny + nx * wobble) * enemy.speed;
  } else if (enemy.kind === KIND_SPITTER) {
    // Hold about 260 px away and lob a seed at the player.
    const want = 260;
    const toward = dist > want + 30 ? 1 : dist < want - 30 ? -1 : 0;
    enemy.vx = nx * enemy.speed * toward;
    enemy.vy = ny * enemy.speed * toward;
    enemy.shootCooldown -= dt;
    if (enemy.shootCooldown <= 0 && dist < 520) {
      enemy.shootCooldown = 2.6;
      const speed = 190;
      shots.push({
        x: enemy.x, y: enemy.y,
        vx: nx * speed, vy: ny * speed,
        damage: enemy.damage, radius: 7, color: '#a5f2a5', hostile: true,
      });
    }
  } else if (enemy.kind === KIND_BRUTE) {
    enemy.vx = nx * enemy.speed;
    enemy.vy = ny * enemy.speed;
  } else if (enemy.kind === KIND_WARDEN) {
    enemy.vx = nx * enemy.speed;
    enemy.vy = ny * enemy.speed;
    enemy.shootCooldown -= dt;
    if (enemy.shootCooldown <= 0) {
      enemy.shootCooldown = 2.2;
      // A radial burst of eight thorns.
      for (let i = 0; i < 8; i += 1) {
        const angle = (i / 8) * Math.PI * 2 + enemy.t;
        shots.push({
          x: enemy.x, y: enemy.y,
          vx: Math.cos(angle) * 150, vy: Math.sin(angle) * 150,
          damage: 1, radius: 7, color: '#e8d44d', hostile: true,
        });
      }
    }
  }

  enemy.x += enemy.vx * dt;
  enemy.y += enemy.vy * dt;
  // Stay inside the arena once arrived.
  enemy.x = Math.max(enemy.radius, Math.min(ARENA.width - enemy.radius, enemy.x));
  enemy.y = Math.max(enemy.radius, Math.min(ARENA.height - enemy.radius, enemy.y));
}

// How many enemies a wave of `wave` fields in total, boss included.
export function waveEnemyCount(wave) {
  const budget = WAVES.budget(wave);
  let count = 0;
  let left = budget;
  // Simulate the spend with a throwaway average: motes cost 1, the rest more.
  while (left > 0) {
    count += 1;
    left -= left > 8 ? 2 : 1;
  }
  if (wave % WAVES.bossEvery === 0) count += 1;
  return count;
}
