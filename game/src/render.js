// Everything the player sees: the grove at night, the Heartseed, the wisp,
// every enemy kind drawn its own way, the HUD, and the title, shop, pause,
// game-over and victory screens. All art is drawn in code — no images.
import { ARENA, PALETTE, SEED, WAVES } from './config.js';
import { KIND_BRUTE, KIND_DART, KIND_MOTE, KIND_SPITTER, KIND_WARDEN } from './enemies.js';
import { PICKUP_HEART, PICKUP_SHARD, PICKUP_SHIELD, PICKUP_SPREAD } from './pickups.js';
import { shopEntries } from './upgrades.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_SHOP = 'shop';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';
export const SCREEN_WIN = 'win';

// Stars and grass tufts, placed once from a fixed table so the backdrop never
// shivers between frames.
const STARS = [];
for (let i = 0; i < 90; i += 1) {
  const s = (i * 2654435761) % 1000 / 1000;
  STARS.push({
    x: ((i * 7919) % 1280),
    y: ((i * 104729) % 420),
    r: 0.6 + s * 1.4,
    twinkle: (i * 31) % 6,
  });
}
const TUFTS = [];
for (let i = 0; i < 46; i += 1) {
  TUFTS.push({
    x: ((i * 15485863) % 1280),
    y: 430 + ((i * 32452843) % 270),
    h: 8 + ((i * 7) % 10),
  });
}

function circle(ctx, x, y, radius) {
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
}

function drawStar(ctx, x, y, radius, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < 8; i += 1) {
    const angle = (i / 8) * Math.PI * 2;
    const r = i % 2 === 0 ? radius : radius * 0.45;
    const px = x + Math.cos(angle) * r;
    const py = y + Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
}

function drawHeart(ctx, x, y, size, filled, color) {
  ctx.fillStyle = filled ? color : 'rgba(255,125,156,0.25)';
  ctx.beginPath();
  ctx.moveTo(x, y + size * 0.9);
  ctx.bezierCurveTo(x - size * 1.2, y, x - size * 0.6, y - size, x, y - size * 0.35);
  ctx.bezierCurveTo(x + size * 0.6, y - size, x + size * 1.2, y, x, y + size * 0.9);
  ctx.fill();
}

export function createRenderer(canvas) {
  canvas.width = ARENA.width;
  canvas.height = ARENA.height;
  const ctx = canvas.getContext('2d');

  function drawBackground(time) {
    const gradient = ctx.createLinearGradient(0, 0, 0, ARENA.height);
    gradient.addColorStop(0, PALETTE.bg0);
    gradient.addColorStop(0.55, PALETTE.bg1);
    gradient.addColorStop(1, PALETTE.ground);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, ARENA.width, ARENA.height);

    for (const star of STARS) {
      const alpha = 0.35 + 0.4 * Math.abs(Math.sin(time * 0.7 + star.twinkle));
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#cfe0ff';
      circle(ctx, star.x, star.y, star.r);
    }
    ctx.globalAlpha = 1;

    // The moon, low and bright in the bottom-left corner, clear of the HUD.
    const moon = ctx.createRadialGradient(150, 620, 8, 150, 620, 70);
    moon.addColorStop(0, 'rgba(255,244,200,0.9)');
    moon.addColorStop(0.25, 'rgba(255,244,200,0.35)');
    moon.addColorStop(1, 'rgba(255,244,200,0)');
    ctx.fillStyle = moon;
    ctx.fillRect(70, 540, 160, 160);
    ctx.fillStyle = '#fff3c4';
    circle(ctx, 150, 620, 26);

    // The grove floor: a soft clearing around the Heartseed.
    const clearing = ctx.createRadialGradient(SEED.x, SEED.y, 40, SEED.x, SEED.y, 340);
    clearing.addColorStop(0, 'rgba(62,122,94,0.5)');
    clearing.addColorStop(1, 'rgba(62,122,94,0)');
    ctx.fillStyle = clearing;
    ctx.fillRect(SEED.x - 340, SEED.y - 340, 680, 680);

    // Grass tufts and fireflies.
    ctx.strokeStyle = 'rgba(124,227,139,0.35)';
    ctx.lineWidth = 2;
    for (const tuft of TUFTS) {
      ctx.beginPath();
      ctx.moveTo(tuft.x, tuft.y);
      ctx.lineTo(tuft.x - 3, tuft.y - tuft.h);
      ctx.moveTo(tuft.x + 3, tuft.y);
      ctx.lineTo(tuft.x + 5, tuft.y - tuft.h * 0.8);
      ctx.stroke();
    }
    for (let i = 0; i < 12; i += 1) {
      const fx = SEED.x + Math.cos(time * 0.4 + i * 1.7) * (120 + (i % 4) * 55);
      const fy = SEED.y + Math.sin(time * 0.55 + i * 2.3) * (80 + (i % 3) * 40);
      ctx.globalAlpha = 0.4 + 0.4 * Math.sin(time * 2 + i);
      ctx.fillStyle = '#ffe9a8';
      circle(ctx, fx, fy, 2);
    }
    ctx.globalAlpha = 1;
  }

  function drawSeed(seed, time) {
    const pulse = 1 + Math.sin(time * 2.2) * 0.05;
    const glow = ctx.createRadialGradient(SEED.x, SEED.y, 6, SEED.x, SEED.y, 120 * pulse);
    const flash = seed.flash > 0 ? '255,93,115' : '255,215,106';
    glow.addColorStop(0, `rgba(${flash},0.55)`);
    glow.addColorStop(1, `rgba(${flash},0)`);
    ctx.fillStyle = glow;
    ctx.fillRect(SEED.x - 130, SEED.y - 130, 260, 260);

    // Trunk and branches.
    ctx.strokeStyle = '#5d3f2a';
    ctx.lineWidth = 9;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(SEED.x, SEED.y + 30);
    ctx.quadraticCurveTo(SEED.x - 6, SEED.y, SEED.x, SEED.y - 26);
    ctx.stroke();
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(SEED.x, SEED.y - 12);
    ctx.quadraticCurveTo(SEED.x - 22, SEED.y - 34, SEED.x - 34, SEED.y - 44);
    ctx.moveTo(SEED.x, SEED.y - 12);
    ctx.quadraticCurveTo(SEED.x + 22, SEED.y - 34, SEED.x + 34, SEED.y - 44);
    ctx.stroke();

    // The glowing heart: a cluster of leaves around a bright core.
    ctx.fillStyle = '#7ce38b';
    for (let i = 0; i < 7; i += 1) {
      const angle = (i / 7) * Math.PI * 2 + time * 0.15;
      ctx.beginPath();
      ctx.ellipse(SEED.x + Math.cos(angle) * 22, SEED.y - 34 + Math.sin(angle) * 12, 12, 7, angle, 0, Math.PI * 2);
      ctx.fill();
    }
    const core = ctx.createRadialGradient(SEED.x, SEED.y - 30, 2, SEED.x, SEED.y - 30, 20 * pulse);
    core.addColorStop(0, '#fff7d6');
    core.addColorStop(0.6, '#ffd76a');
    core.addColorStop(1, 'rgba(255,215,106,0)');
    ctx.fillStyle = core;
    circle(ctx, SEED.x, SEED.y - 30, 20 * pulse);

    // Seed health as small leaves under the tree.
    for (let i = 0; i < seed.maxHp; i += 1) {
      const x = SEED.x - (seed.maxHp - 1) * 11 + i * 22;
      ctx.fillStyle = i < seed.hp ? '#7ce38b' : 'rgba(124,227,139,0.2)';
      ctx.beginPath();
      ctx.ellipse(x, SEED.y + 44, 7, 4, -0.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawPlayer(player, time) {
    const blink = player.invulnerable > 0 && Math.floor(time * 14) % 2 === 0;
    if (blink) ctx.globalAlpha = 0.35;
    const glow = ctx.createRadialGradient(player.x, player.y, 4, player.x, player.y, 54);
    glow.addColorStop(0, 'rgba(255,233,168,0.75)');
    glow.addColorStop(1, 'rgba(255,233,168,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(player.x - 54, player.y - 54, 108, 108);

    // The wisp: a bright body, a little flame tail, two eyes toward the aim.
    const aimAngle = Math.atan2(player.aimY - player.y, player.aimX - player.x);
    ctx.fillStyle = '#ffcf5c';
    ctx.beginPath();
    ctx.moveTo(player.x - Math.cos(aimAngle) * 14, player.y - Math.sin(aimAngle) * 14);
    ctx.quadraticCurveTo(
      player.x - Math.cos(aimAngle) * 30 + Math.sin(time * 9) * 4,
      player.y - Math.sin(aimAngle) * 30,
      player.x - Math.cos(aimAngle) * 16,
      player.y - Math.sin(aimAngle) * 16,
    );
    ctx.fill();
    const body = ctx.createRadialGradient(player.x - 4, player.y - 5, 2, player.x, player.y, 17);
    body.addColorStop(0, PALETTE.playerCore);
    body.addColorStop(1, PALETTE.player);
    ctx.fillStyle = body;
    circle(ctx, player.x, player.y, 16);
    ctx.fillStyle = '#1b2f57';
    circle(ctx, player.x + Math.cos(aimAngle) * 5 - 3, player.y + Math.sin(aimAngle) * 5 - 2, 2.2);
    circle(ctx, player.x + Math.cos(aimAngle) * 5 + 3, player.y + Math.sin(aimAngle) * 5 + 2, 2.2);
    if (player.shields > 0) {
      ctx.strokeStyle = 'rgba(142,241,255,0.85)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(player.x, player.y, 24 + Math.sin(time * 3) * 1.5, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  function drawEnemy(enemy, time) {
    const flash = enemy.flash > 0;
    const color = flash ? '#ffffff' : enemy.color;
    ctx.save();
    ctx.translate(enemy.x, enemy.y);
    if (enemy.kind === KIND_MOTE) {
      // A spiky shadow mote.
      ctx.fillStyle = color;
      ctx.beginPath();
      for (let i = 0; i < 12; i += 1) {
        const angle = (i / 12) * Math.PI * 2 + time * 0.8;
        const r = i % 2 === 0 ? enemy.radius : enemy.radius * 0.6;
        const px = Math.cos(angle) * r;
        const py = Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#0b1026';
      circle(ctx, -4, -2, 2.5);
      circle(ctx, 4, -2, 2.5);
    } else if (enemy.kind === KIND_DART) {
      ctx.rotate(Math.atan2(enemy.vy, enemy.vx));
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(enemy.radius + 6, 0);
      ctx.lineTo(-enemy.radius, -enemy.radius * 0.8);
      ctx.lineTo(-enemy.radius * 0.4, 0);
      ctx.lineTo(-enemy.radius, enemy.radius * 0.8);
      ctx.closePath();
      ctx.fill();
    } else if (enemy.kind === KIND_SPITTER) {
      ctx.rotate(time * 0.6);
      ctx.fillStyle = color;
      ctx.beginPath();
      for (let i = 0; i < 4; i += 1) {
        const angle = (i / 4) * Math.PI * 2;
        const px = Math.cos(angle) * enemy.radius;
        const py = Math.sin(angle) * enemy.radius;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.rotate(-time * 0.6);
      ctx.fillStyle = '#0b1026';
      circle(ctx, 0, 0, 5);
    } else if (enemy.kind === KIND_BRUTE) {
      ctx.rotate(time * 0.25);
      ctx.fillStyle = color;
      ctx.beginPath();
      for (let i = 0; i < 6; i += 1) {
        const angle = (i / 6) * Math.PI * 2;
        const px = Math.cos(angle) * enemy.radius;
        const py = Math.sin(angle) * enemy.radius;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.rotate(-time * 0.25);
      ctx.fillStyle = 'rgba(11,16,38,0.7)';
      circle(ctx, 0, 0, enemy.radius * 0.5);
    } else if (enemy.kind === KIND_WARDEN) {
      // The Hollow Warden: a crowned dark sun.
      ctx.rotate(time * 0.4);
      ctx.fillStyle = color;
      ctx.beginPath();
      for (let i = 0; i < 16; i += 1) {
        const angle = (i / 16) * Math.PI * 2;
        const r = i % 2 === 0 ? enemy.radius + 10 : enemy.radius * 0.75;
        const px = Math.cos(angle) * r;
        const py = Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.rotate(-time * 0.4);
      ctx.fillStyle = '#241a05';
      circle(ctx, 0, 0, enemy.radius * 0.62);
      ctx.fillStyle = '#e8d44d';
      circle(ctx, -10, -4, 4);
      circle(ctx, 10, -4, 4);
      ctx.strokeStyle = '#e8d44d';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 4, 12, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.stroke();
    }
    ctx.restore();

    // A health bar over anything hurt.
    if (enemy.hp < enemy.maxHp) {
      const width = enemy.radius * 2;
      ctx.fillStyle = 'rgba(11,16,38,0.7)';
      ctx.fillRect(enemy.x - width / 2, enemy.y - enemy.radius - 12, width, 5);
      ctx.fillStyle = '#ff5d73';
      ctx.fillRect(enemy.x - width / 2, enemy.y - enemy.radius - 12, width * (enemy.hp / enemy.maxHp), 5);
    }
  }

  function drawPickups(pickups, time) {
    for (const pickup of pickups) {
      const bobY = pickup.y + Math.sin(pickup.bob) * 3;
      const fade = pickup.life < 3 ? 0.4 + 0.6 * Math.abs(Math.sin(time * 6)) : 1;
      ctx.globalAlpha = fade;
      if (pickup.kind === PICKUP_SHARD) {
        ctx.fillStyle = '#8ef1ff';
        drawStar(ctx, pickup.x, bobY, 8, '#8ef1ff');
        ctx.fillStyle = '#eaf2ff';
        circle(ctx, pickup.x, bobY, 2.5);
      } else if (pickup.kind === PICKUP_HEART) {
        drawHeart(ctx, pickup.x, bobY, 10, true, '#ff7d9c');
      } else if (pickup.kind === PICKUP_SPREAD) {
        ctx.fillStyle = '#ffe9a8';
        drawStar(ctx, pickup.x - 6, bobY, 7, '#ffe9a8');
        drawStar(ctx, pickup.x + 6, bobY, 7, '#ffe9a8');
      } else if (pickup.kind === PICKUP_SHIELD) {
        ctx.strokeStyle = '#8ef1ff';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(pickup.x, bobY, 10, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = '#8ef1ff';
        circle(ctx, pickup.x, bobY, 4);
      }
      ctx.globalAlpha = 1;
    }
  }

  function drawEffects(effects) {
    for (const particle of effects.particles) {
      const alpha = 1 - particle.age / particle.life;
      if (particle.ring) {
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = particle.color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.maxRadius * (particle.age / particle.life), 0, Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.globalAlpha = alpha;
        ctx.fillStyle = particle.color;
        circle(ctx, particle.x, particle.y, particle.size);
      }
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center';
    for (const text of effects.texts) {
      ctx.globalAlpha = 1 - text.age / text.life;
      ctx.font = `bold ${text.size}px system-ui, sans-serif`;
      ctx.fillStyle = text.color;
      ctx.fillText(text.message, text.x, text.y);
    }
    ctx.globalAlpha = 1;
  }

  function drawHud(state, screen, best) {
    const player = state.player;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    // Hearts, top left.
    for (let i = 0; i < player.maxHp; i += 1) {
      drawHeart(ctx, 34 + i * 30, 34, 11, i < player.hp, '#ff7d9c');
    }
    if (player.shields > 0) {
      ctx.fillStyle = '#8ef1ff';
      ctx.font = 'bold 15px system-ui, sans-serif';
      ctx.fillText(`🛡 ${player.shields}`, 34 + player.maxHp * 30 + 8, 40);
    }
    // Score, shards, kills, top right.
    ctx.textAlign = 'right';
    ctx.fillStyle = PALETTE.text;
    ctx.font = 'bold 26px system-ui, sans-serif';
    ctx.fillText(`${state.score}`, ARENA.width - 24, 38);
    ctx.font = 'bold 16px system-ui, sans-serif';
    ctx.fillStyle = '#8ef1ff';
    ctx.fillText(`✦ ${state.shards} shards`, ARENA.width - 24, 62);
    ctx.fillStyle = PALETTE.dim;
    ctx.fillText(`${state.kills} banished`, ARENA.width - 24, 84);
    // Wave, top centre.
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.text;
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.fillText(state.wave > 0 ? `Wave ${state.wave} / ${WAVES.total}` : 'Starlight Grove', ARENA.width / 2, 36);
    if (best > 0) {
      ctx.fillStyle = PALETTE.dim;
      ctx.font = '15px system-ui, sans-serif';
      ctx.fillText(`Best ${best}`, ARENA.width / 2, 58);
    }
    // Boss bar.
    const boss = state.enemies.find((enemy) => enemy.kind === KIND_WARDEN);
    if (boss) {
      const width = 420;
      const x = ARENA.width / 2 - width / 2;
      ctx.fillStyle = 'rgba(11,16,38,0.75)';
      ctx.fillRect(x - 6, 66, width + 12, 20);
      ctx.fillStyle = '#e8d44d';
      ctx.fillRect(x, 70, width * (boss.hp / boss.maxHp), 12);
      ctx.fillStyle = '#241a05';
      ctx.font = 'bold 12px system-ui, sans-serif';
      ctx.fillText('THE HOLLOW WARDEN', ARENA.width / 2, 79);
    }
    // Wave banner while the wave is announced.
    if (screen === SCREEN_PLAY && state.phase === 'announce' && state.wave > 0) {
      ctx.globalAlpha = Math.min(1, state.phaseTimer);
      ctx.fillStyle = PALETTE.gold;
      ctx.font = 'bold 54px system-ui, sans-serif';
      const isBoss = state.wave % WAVES.bossEvery === 0;
      ctx.fillText(isBoss ? 'THE HOLLOW WARDEN' : `WAVE ${state.wave}`, ARENA.width / 2, 300);
      ctx.fillStyle = PALETTE.text;
      ctx.font = '20px system-ui, sans-serif';
      ctx.fillText(isBoss ? 'Defeat the Warden to clear the wave' : 'Defend the Heartseed', ARENA.width / 2, 336);
      ctx.globalAlpha = 1;
    }
    // Spread-shot timer, bottom left.
    if (player.spreadTimer > 0) {
      ctx.textAlign = 'left';
      ctx.fillStyle = '#ffe9a8';
      ctx.font = 'bold 15px system-ui, sans-serif';
      ctx.fillText(`Twin Bloom ${Math.ceil(player.spreadTimer)}s`, 24, ARENA.height - 24);
    }
  }

  function panel(x, y, width, height) {
    ctx.fillStyle = 'rgba(11,16,38,0.82)';
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, 18);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,215,106,0.4)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  function drawTitle(state, best, bestWave) {
    ctx.fillStyle = 'rgba(11,16,38,0.55)';
    ctx.fillRect(0, 0, ARENA.width, ARENA.height);
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.gold;
    ctx.font = 'bold 76px Georgia, serif';
    ctx.fillText('STARLIGHT GROVE', ARENA.width / 2, 210);
    ctx.fillStyle = PALETTE.text;
    ctx.font = '22px Georgia, serif';
    ctx.fillText('A wisp defends the last Heartseed against the hollow dark.', ARENA.width / 2, 252);
    ctx.font = '17px system-ui, sans-serif';
    ctx.fillStyle = PALETTE.dim;
    ctx.fillText('WASD or arrows to move  •  Mouse to aim  •  Hold click or Space to shoot', ARENA.width / 2, 300);
    ctx.fillText('Banish the waves, gather starshards, buy upgrades between waves.', ARENA.width / 2, 326);
    ctx.fillText('Survive all 10 waves and defeat the Hollow Warden to win.', ARENA.width / 2, 352);
    ctx.fillStyle = '#ffe9a8';
    ctx.font = 'bold 24px system-ui, sans-serif';
    ctx.fillText('Click or press Space to begin', ARENA.width / 2, 430);
    if (best > 0) {
      ctx.fillStyle = PALETTE.dim;
      ctx.font = '17px system-ui, sans-serif';
      ctx.fillText(`Best score ${best}  •  Best wave ${bestWave}`, ARENA.width / 2, 472);
    }
    ctx.fillStyle = PALETTE.dim;
    ctx.font = '14px system-ui, sans-serif';
    ctx.fillText('P pause  •  M mute  •  1–7 buy in the shop', ARENA.width / 2, 690);
  }

  function drawShop(state) {
    ctx.fillStyle = 'rgba(11,16,38,0.6)';
    ctx.fillRect(0, 0, ARENA.width, ARENA.height);
    const entries = shopEntries(state.shop, state.shards);
    const width = 640;
    const height = 120 + entries.length * 52;
    const x = ARENA.width / 2 - width / 2;
    const y = 84;
    panel(x, y, width, height);
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.gold;
    ctx.font = 'bold 34px system-ui, sans-serif';
    ctx.fillText(`Wave ${state.wave} clear!`, ARENA.width / 2, y + 52);
    ctx.fillStyle = PALETTE.text;
    ctx.font = '17px system-ui, sans-serif';
    ctx.fillText(`You hold ✦ ${state.shards} starshards — spend them before the next wave.`, ARENA.width / 2, y + 82);
    ctx.textAlign = 'left';
    entries.forEach((entry, i) => {
      const rowY = y + 108 + i * 52;
      ctx.fillStyle = entry.soldOut ? PALETTE.dim : entry.affordable ? PALETTE.text : 'rgba(234,242,255,0.45)';
      ctx.font = 'bold 18px system-ui, sans-serif';
      ctx.fillText(`${i + 1}. ${entry.name}`, x + 28, rowY);
      ctx.font = '15px system-ui, sans-serif';
      ctx.fillStyle = PALETTE.dim;
      ctx.fillText(entry.desc, x + 240, rowY);
      ctx.textAlign = 'right';
      ctx.fillStyle = entry.soldOut ? PALETTE.dim : '#8ef1ff';
      ctx.font = 'bold 16px system-ui, sans-serif';
      ctx.fillText(entry.soldOut ? 'MAXED' : `✦ ${entry.cost}`, x + width - 28, rowY);
      ctx.textAlign = 'left';
      // Level pips.
      for (let level = 0; level < entry.max; level += 1) {
        ctx.fillStyle = level < entry.level ? '#ffd76a' : 'rgba(255,215,106,0.25)';
        circle(ctx, x + width - 120 + level * 14, rowY - 5, 4);
      }
    });
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffe9a8';
    ctx.font = 'bold 20px system-ui, sans-serif';
    ctx.fillText('Press 1–7 to buy  •  Space or click for the next wave', ARENA.width / 2, y + height - 22);
  }

  function drawPaused() {
    ctx.fillStyle = 'rgba(11,16,38,0.65)';
    ctx.fillRect(0, 0, ARENA.width, ARENA.height);
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.text;
    ctx.font = 'bold 52px system-ui, sans-serif';
    ctx.fillText('PAUSED', ARENA.width / 2, 350);
    ctx.font = '19px system-ui, sans-serif';
    ctx.fillStyle = PALETTE.dim;
    ctx.fillText('Press P or Space to keep playing', ARENA.width / 2, 392);
  }

  function drawEnd(state, best, bestWave, won) {
    ctx.fillStyle = won ? 'rgba(20,40,24,0.72)' : 'rgba(30,10,18,0.72)';
    ctx.fillRect(0, 0, ARENA.width, ARENA.height);
    ctx.textAlign = 'center';
    ctx.fillStyle = won ? '#ffe9a8' : '#ff8fa3';
    ctx.font = 'bold 62px Georgia, serif';
    ctx.fillText(won ? 'THE GROVE BLOOMS' : 'THE GROVE FADES', ARENA.width / 2, 240);
    ctx.fillStyle = PALETTE.text;
    ctx.font = '21px Georgia, serif';
    ctx.fillText(
      won
        ? 'The Hollow Warden is banished. Starlight returns to the grove.'
        : state.seed.hp <= 0
          ? 'The Heartseed has fallen. The dark takes the grove.'
          : 'Your light goes out. The grove waits for another wisp.',
      ARENA.width / 2,
      284,
    );
    const rows = [
      ['Score', `${state.score}`],
      ['Best score', `${Math.max(best, state.score)}`],
      ['Wave reached', `${state.wave} / ${WAVES.total}`],
      ['Best wave', `${Math.max(bestWave, state.wave)}`],
      ['Banished', `${state.kills}`],
      ['Time', `${Math.floor(state.time / 60)}:${String(Math.floor(state.time % 60)).padStart(2, '0')}`],
    ];
    ctx.font = '19px system-ui, sans-serif';
    rows.forEach(([label, value], i) => {
      const rowY = 340 + i * 32;
      ctx.textAlign = 'right';
      ctx.fillStyle = PALETTE.dim;
      ctx.fillText(label, ARENA.width / 2 - 12, rowY);
      ctx.textAlign = 'left';
      ctx.fillStyle = PALETTE.text;
      ctx.fillText(value, ARENA.width / 2 + 12, rowY);
    });
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffe9a8';
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.fillText('Click or press Space to play again', ARENA.width / 2, 560);
  }

  return {
    draw(state, screen, best, bestWave, effects) {
      const time = state.time;
      const offset = effects.offset();
      ctx.save();
      ctx.translate(offset.x, offset.y);
      drawBackground(time);
      drawSeed(state.seed, time);
      drawPickups(state.pickups, time);
      for (const enemy of state.enemies) drawEnemy(enemy, time);
      for (const bullet of state.bullets) {
        ctx.fillStyle = PALETTE.bullet;
        circle(ctx, bullet.x, bullet.y, bullet.radius);
        ctx.fillStyle = 'rgba(255,233,168,0.4)';
        circle(ctx, bullet.x - bullet.vx * 0.012, bullet.y - bullet.vy * 0.012, bullet.radius * 0.6);
      }
      for (const shot of state.enemyShots) {
        ctx.fillStyle = shot.color;
        circle(ctx, shot.x, shot.y, shot.radius);
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        circle(ctx, shot.x, shot.y, 2.5);
      }
      if (screen !== SCREEN_TITLE) drawPlayer(state.player, time);
      drawEffects(effects);
      ctx.restore();
      drawHud(state, screen, best);
      if (screen === SCREEN_TITLE) drawTitle(state, best, bestWave);
      else if (screen === SCREEN_SHOP) drawShop(state);
      else if (screen === SCREEN_PAUSED) drawPaused();
      else if (screen === SCREEN_OVER) drawEnd(state, best, bestWave, false);
      else if (screen === SCREEN_WIN) drawEnd(state, best, bestWave, true);
    },
  };
}
