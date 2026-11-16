// Starlight Grove — tuning constants and the palette. One place for every number
// a designer would want to change: arena, player, enemies, waves, pickups, shop.
export const STEP = 1 / 60;
export const BEST_KEY = 'starlight-grove-best';
export const BEST_WAVE_KEY = 'starlight-grove-best-wave';

export const ARENA = { width: 1280, height: 720 };

// The Heartseed stands at the arena centre: a glowing tree the wisp defends.
// Enemies that reach it gnaw it; if it falls, the grove is lost.
export const SEED = { x: ARENA.width / 2, y: ARENA.height / 2, radius: 34, hp: 12 };

export const PLAYER = {
  radius: 16,
  speed: 300,
  hp: 5,
  fireInterval: 0.22,
  bulletSpeed: 620,
  bulletRadius: 5,
  bulletDamage: 1,
  pickupRadius: 26,
  magnetRadius: 90,
  invulnerableSeconds: 1.1,
};

export const BULLET = { life: 1.4, spread: 0.09 };

// Enemy kinds. cost: wave-budget points. hp, speed, radius, damage, score, shards.
export const ENEMIES = {
  mote:    { cost: 1, hp: 1, speed: 62,  radius: 13, damage: 1, score: 10,  shards: 1, color: '#b78cff' },
  dart:    { cost: 2, hp: 1, speed: 168, radius: 10, damage: 1, score: 20,  shards: 1, color: '#ff9d5c' },
  spitter: { cost: 3, hp: 2, speed: 74,  radius: 15, damage: 1, score: 30,  shards: 2, color: '#7ce38b' },
  brute:   { cost: 5, hp: 8, speed: 42,  radius: 26, damage: 2, score: 60,  shards: 3, color: '#ff6b81' },
  warden:  { cost: 0, hp: 90, speed: 34, radius: 44, damage: 2, score: 500, shards: 12, color: '#e8d44d' },
};

export const WAVES = {
  total: 10,
  bossEvery: 5,
  // Points of enemies a wave may spend; grows each wave.
  budget: (wave) => 4 + wave * 3,
  // Seconds between spawn ticks; faster as waves climb.
  spawnInterval: (wave) => Math.max(0.35, 1.05 - wave * 0.07),
  // How many enemies may be alive at once.
  aliveCap: (wave) => 6 + wave * 2,
};

// Starshards dropped by kills pay for the between-wave shop.
export const SHOP = [
  { id: 'rapid',  name: 'Swift Petals',  desc: '+18% fire rate',      cost: 6,  max: 5, apply: (p) => { p.fireInterval *= 0.85; } },
  { id: 'power',  name: 'Sun Lance',     desc: '+1 bullet damage',    cost: 8,  max: 4, apply: (p) => { p.bulletDamage += 1; } },
  { id: 'spread', name: 'Twin Bloom',    desc: '+1 bullet per shot',  cost: 10, max: 3, apply: (p) => { p.shots += 1; } },
  { id: 'swift',  name: 'Wind Step',     desc: '+12% move speed',     cost: 5,  max: 4, apply: (p) => { p.speed *= 1.12; } },
  { id: 'heart',  name: 'Deep Roots',    desc: '+1 max heart, heal 1', cost: 9, max: 3, apply: (p) => { p.maxHp += 1; p.hp = Math.min(p.maxHp, p.hp + 1); } },
  { id: 'magnet', name: 'Star Pull',     desc: '+60% shard pull',     cost: 4,  max: 3, apply: (p) => { p.magnetRadius *= 1.6; } },
  { id: 'shield', name: 'Bark Shield',   desc: 'Block one hit',       cost: 7,  max: 3, apply: (p) => { p.shields += 1; } },
];

export const PALETTE = {
  bg0: '#0b1026',
  bg1: '#14204a',
  ground: '#1b2f57',
  grove: '#274b73',
  player: '#ffe9a8',
  playerCore: '#fff7d6',
  bullet: '#ffe9a8',
  shard: '#8ef1ff',
  heart: '#ff7d9c',
  text: '#eaf2ff',
  dim: '#9fb4dd',
  gold: '#ffd76a',
  danger: '#ff5d73',
};
