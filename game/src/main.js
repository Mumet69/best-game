// Boot and the one loop: input is read every frame, the world advances in
// fixed 1/60 s steps (several in a slow frame, none in a fast one), and the
// renderer paints what is there. The game moves between six screens: title,
// play, shop, paused, game over and victory.
//
// ?seed=N fixes the spawn pattern. ?shot=title|play|action|shop|over|win (with
// &seed=N) stages that scene instead of running the loop, paints it twice
// and sets window.__shotReady for a screenshot.
import { BEST_KEY, BEST_WAVE_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import { createEffects } from './particles.js';
import { createAudio } from './audio.js';
import { createWorld, EVENT_OVER, EVENT_SHOP, EVENT_WAVE_CLEAR, EVENT_WIN, PHASE_SHOP } from './world.js';
import { ACTION_CONFIRM, ACTION_MUTE, ACTION_PAUSE, ACTION_SHOP, createInput } from './input.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_SHOP, SCREEN_TITLE, SCREEN_WIN } from './render.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall is dropped. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const effects = createEffects();
const audio = createAudio();
const world = createWorld(createRandom(seed), effects, audio);
const renderer = createRenderer(canvas);

function readBest(key) {
  try {
    return Number.parseInt(window.localStorage.getItem(key) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(key, value) {
  try {
    window.localStorage.setItem(key, String(value));
  } catch {
    // Storage can be off (private windows): the best then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.best, scene.bestWave, effects);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest(BEST_KEY);
  let bestWave = readBest(BEST_WAVE_KEY);
  let accumulator = 0;
  let last = performance.now();

  // A small read-only handle for automated play-testing: the screen, the
  // wave, the score and the vitals, nothing that can change the game.
  window.__groveState = () => ({
    screen,
    wave: world.state.wave,
    score: world.state.score,
    hp: world.state.player.hp,
    maxHp: world.state.player.maxHp,
    seedHp: world.state.seed.hp,
    kills: world.state.kills,
    shards: world.state.shards,
    phase: world.state.phase,
  });

  // Screen readers (and anyone watching the page's text) hear the changes.
  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    audio.unlock();
    world.reset();
    accumulator = 0;
    screen = SCREEN_PLAY;
    world.startWave(1);
    announce('Playing. Defend the Heartseed through 10 waves.');
  }

  function finishRun(won) {
    screen = won ? SCREEN_WIN : SCREEN_OVER;
    if (world.state.score > best) {
      best = world.state.score;
      saveBest(BEST_KEY, best);
    }
    if (world.state.wave > bestWave) {
      bestWave = world.state.wave;
      saveBest(BEST_WAVE_KEY, bestWave);
    }
    announce(won ? `Victory! Score ${world.state.score}.` : `Game over. Score ${world.state.score}. Best ${best}.`);
  }

  function handleActions() {
    const { bits, shopIndex } = input.takeActions();
    if (bits & ACTION_MUTE) {
      audio.setMuted(!audio.isMuted());
      announce(audio.isMuted() ? 'Muted.' : 'Sound on.');
    }
    if (screen === SCREEN_TITLE || screen === SCREEN_OVER || screen === SCREEN_WIN) {
      if (bits & ACTION_CONFIRM) startGame();
    } else if (screen === SCREEN_PLAY) {
      if (bits & ACTION_PAUSE) {
        screen = SCREEN_PAUSED;
        announce('Paused.');
      }
    } else if (screen === SCREEN_PAUSED) {
      if (bits & (ACTION_PAUSE | ACTION_CONFIRM)) {
        screen = SCREEN_PLAY;
        announce('Playing.');
      }
    } else if (screen === SCREEN_SHOP) {
      if (bits & ACTION_SHOP) {
        if (world.buy(shopIndex)) audio.buy();
        else audio.denied();
      } else if (bits & ACTION_CONFIRM) {
        world.nextWave();
        screen = SCREEN_PLAY;
        announce(`Wave ${world.state.wave}.`);
      }
    }
  }

  function step() {
    if (screen === SCREEN_TITLE) {
      world.step(STEP, { x: 0, y: 0 }, { x: 0, y: 0 }, false, true);
      return;
    }
    if (screen !== SCREEN_PLAY) return;
    const events = world.step(STEP, input.direction(), input.mouse, input.firing(), false);
    if (events & EVENT_WIN) finishRun(true);
    else if (events & EVENT_OVER) finishRun(false);
    else if (events & EVENT_SHOP) {
      screen = SCREEN_SHOP;
      announce(`Wave ${world.state.wave} clear. Spend your starshards.`);
    } else if (events & EVENT_WAVE_CLEAR) {
      announce(`Wave ${world.state.wave} clear.`);
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY) {
      while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) {
        step();
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(world.state, screen, best, bestWave, effects);
  }

  // Leaving the tab pauses a running game rather than letting waves run unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('Starlight Grove. Press Space or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
