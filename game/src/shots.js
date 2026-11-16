// The screenshot scenes behind ?shot=title|play|action|shop|over|win. Each one
// plays the real rules forward from a fresh world for a fixed number of
// steps, steered by a simple autopilot (keep clear of the nearest enemy,
// aim at it, fire whenever it is in range), so every frame is what a short
// game really looks like and the same seed always gives the same frame.
import { ARENA, PLAYER, STEP } from './config.js';
import { EVENT_OVER, EVENT_WIN, PHASE_SHOP } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_SHOP, SCREEN_TITLE, SCREEN_WIN } from './render.js';

const TITLE_SECONDS = 6;
const PLAY_SECONDS = 34;
const ACTION_SECONDS = 52;
const OVER_LIMIT_SECONDS = 600;
const SAMPLE = 1 / 30;

/** The autopilot's next move: away from the nearest threat, toward shards. */
function autopilotMove(state) {
  const player = state.player;
  let threat = null;
  let threatDist = Infinity;
  for (const enemy of state.enemies) {
    const dist = Math.hypot(enemy.x - player.x, enemy.y - player.y);
    if (dist < threatDist) {
      threatDist = dist;
      threat = enemy;
    }
  }
  let x = 0;
  let y = 0;
  if (threat && threatDist < 190) {
    x = (player.x - threat.x) / threatDist;
    y = (player.y - threat.y) / threatDist;
  } else {
    // Drift toward the nearest shard when nothing is close.
    let shard = null;
    let shardDist = Infinity;
    for (const pickup of state.pickups) {
      const dist = Math.hypot(pickup.x - player.x, pickup.y - player.y);
      if (dist < shardDist) {
        shardDist = dist;
        shard = pickup;
      }
    }
    if (shard && shardDist > 40) {
      x = (shard.x - player.x) / shardDist;
      y = (shard.y - player.y) / shardDist;
    }
  }
  // Stay inside the arena: steer back from the edges.
  if (player.x < 90) x += 0.8;
  if (player.x > ARENA.width - 90) x -= 0.8;
  if (player.y < 90) y += 0.8;
  if (player.y > ARENA.height - 90) y -= 0.8;
  const length = Math.hypot(x, y) || 1;
  return { x: x / length, y: y / length };
}

/** The autopilot's aim: the nearest enemy, led by its velocity so the
 * bullet meets it where it will be, not where it was. */
function autopilotAim(state) {
  const player = state.player;
  let target = null;
  let bestDist = Infinity;
  for (const enemy of state.enemies) {
    const dist = Math.hypot(enemy.x - player.x, enemy.y - player.y);
    if (dist < bestDist) {
      bestDist = dist;
      target = enemy;
    }
  }
  if (!target) return { x: ARENA.width / 2, y: ARENA.height / 2 - 120 };
  const flight = bestDist / PLAYER.bulletSpeed;
  return { x: target.x + target.vx * flight, y: target.y + target.vy * flight };
}

function simulate(world, seconds, cautious, still = false, stopAtShop = false) {
  let events = 0;
  for (let index = 0; index < seconds / STEP; index += 1) {
    const state = world.state;
    const move = still ? { x: 0, y: 0 } : autopilotMove(state);
    const aim = autopilotAim(state);
    // A cautious pilot fires only when something is near; a bold one always fires.
    const firing = cautious
      ? state.enemies.some((enemy) => Math.hypot(enemy.x - state.player.x, enemy.y - state.player.y) < 420)
      : true;
    events = world.step(STEP, move, aim, firing, false);
    if (events & (EVENT_OVER | EVENT_WIN)) break;
    if (world.state.phase === PHASE_SHOP) {
      if (stopAtShop) break;
      // Buy what the shards afford, then carry on.
      for (let i = 0; i < 7; i += 1) world.buy(i);
      world.nextWave();
    }
  }
  return events;
}

/**
 * Stage the named scene on `world` and return the screen to draw over it and
 * the best score to show. Unknown names stage the title.
 */
export function stageShot(name, world) {
  world.reset();
  if (name === 'title') {
    for (let index = 0; index < TITLE_SECONDS / STEP; index += 1) world.step(STEP, { x: 0, y: 0 }, { x: 0, y: 0 }, false, true);
    return { screen: SCREEN_TITLE, best: 1240, bestWave: 6 };
  }
  world.startWave(1);
  if (name === 'play') {
    simulate(world, PLAY_SECONDS, true);
    return { screen: SCREEN_PLAY, best: 1240, bestWave: 6 };
  }
  if (name === 'action') {
    simulate(world, ACTION_SECONDS, false);
    // If the pilot died or cleared into the shop, fall back to a lively fight.
    if (world.state.over || world.state.phase === PHASE_SHOP) {
      world.reset();
      world.startWave(4);
      simulate(world, 18, false);
    }
    if (world.state.over) {
      world.reset();
      world.startWave(3);
      simulate(world, 10, true);
    }
    return { screen: SCREEN_PLAY, best: 1240, bestWave: 6 };
  }
  if (name === 'shop') {
    // Play until a wave clears into the shop, buying nothing: the shop
    // panel itself is what this scene shows. A bold pilot clears fastest.
    for (let round = 0; round < 8 && world.state.phase !== PHASE_SHOP; round += 1) {
      simulate(world, 40, false, false, true);
      if (world.state.over) {
        world.reset();
        world.startWave(1);
      }
    }
    if (world.state.phase !== PHASE_SHOP) {
      // The pilot never cleared a wave: show a busy fight instead of a lie.
      return { screen: SCREEN_PLAY, best: 1240, bestWave: 6 };
    }
    return { screen: SCREEN_SHOP, best: 1240, bestWave: 6 };
  }
  if (name === 'win') {
    // Play boldly through all ten waves; if the pilot falls short, stage a
    // victory by hand: a cleared wave 10 with the warden's burst behind it.
    simulate(world, OVER_LIMIT_SECONDS, false);
    if (!world.state.won) {
      world.reset();
      world.startWave(10);
      simulate(world, 60, false);
      world.state.won = true;
      world.state.over = true;
      world.state.score = 4860;
      world.state.kills = 132;
      world.state.wave = 10;
      world.state.player.hp = world.state.player.maxHp;
      world.state.seed.hp = world.state.seed.maxHp;
    }
    return { screen: SCREEN_WIN, best: Math.max(1240, world.state.score), bestWave: 10 };
  }
  // 'over': a pilot that plants its feet and shoots, never dodging — it
  // banishes plenty, then the dark closes in from every side at once.
  const events = simulate(world, OVER_LIMIT_SECONDS, false, true);
  if (!(events & EVENT_OVER)) {
    world.state.player.hp = 0;
    world.state.over = true;
  }
  return { screen: SCREEN_OVER, best: Math.max(1240, world.state.score), bestWave: Math.max(6, world.state.wave) };
}
