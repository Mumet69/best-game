// Pickups: starshards (the shop's currency), hearts (rare, heal one) and
// power-ups (a spread shot or a shield, for a short while). They drift a
// little, get pulled toward the player inside the magnet radius, and are
// collected on touch.
export const PICKUP_SHARD = 'shard';
export const PICKUP_HEART = 'heart';
export const PICKUP_SPREAD = 'spread';
export const PICKUP_SHIELD = 'shield';

export function createPickup(kind, x, y, value = 1) {
  return {
    kind, x, y, value,
    vx: 0, vy: 0,
    age: 0,
    life: 14,
    radius: kind === PICKUP_SHARD ? 8 : 13,
    bob: Math.random() * Math.PI * 2,
  };
}

export function stepPickup(pickup, dt, player) {
  pickup.age += dt;
  pickup.bob += dt * 3;
  const dx = player.x - pickup.x;
  const dy = player.y - pickup.y;
  const dist = Math.hypot(dx, dy) || 1;
  if (dist < player.magnetRadius) {
    const pull = 520 * (1 - dist / (player.magnetRadius + 60));
    pickup.vx += (dx / dist) * pull * dt * 6;
    pickup.vy += (dy / dist) * pull * dt * 6;
  }
  pickup.vx *= 1 - 3 * dt;
  pickup.vy *= 1 - 3 * dt;
  pickup.x += pickup.vx * dt;
  pickup.y += pickup.vy * dt;
}

// What a kill drops: always its shards, sometimes a heart or a power-up.
export function dropsFor(enemy, random) {
  const drops = [];
  for (let i = 0; i < enemy.shards; i += 1) {
    drops.push(createPickup(PICKUP_SHARD, enemy.x + random.range(-14, 14), enemy.y + random.range(-14, 14), 1));
  }
  const roll = random.next();
  if (enemy.kind === 'brute' || enemy.kind === 'warden') {
    drops.push(createPickup(random.next() < 0.5 ? PICKUP_HEART : PICKUP_SPREAD, enemy.x, enemy.y, 1));
  } else if (roll < 0.03) {
    drops.push(createPickup(PICKUP_HEART, enemy.x, enemy.y, 1));
  } else if (roll < 0.06) {
    drops.push(createPickup(random.next() < 0.5 ? PICKUP_SPREAD : PICKUP_SHIELD, enemy.x, enemy.y, 1));
  }
  return drops;
}
