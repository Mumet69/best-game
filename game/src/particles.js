// Particles, floating score text and screen shake: the feedback layer. The
// world spawns effects here; the renderer draws them. Everything is pooled
// in plain arrays and fades out on its own, so nothing here can leak.
export function createEffects() {
  const particles = [];
  const texts = [];
  let shakeTime = 0;
  let shakePower = 0;

  return {
    // A burst of coloured sparks at (x, y).
    burst(x, y, color, count, speed = 180) {
      for (let i = 0; i < count; i += 1) {
        const angle = Math.random() * Math.PI * 2;
        const velocity = speed * (0.3 + Math.random() * 0.9);
        particles.push({
          x, y,
          vx: Math.cos(angle) * velocity,
          vy: Math.sin(angle) * velocity,
          life: 0.35 + Math.random() * 0.35,
          age: 0,
          size: 2 + Math.random() * 3,
          color,
        });
      }
      if (particles.length > 400) particles.splice(0, particles.length - 400);
    },
    // A short ring that expands and fades (wave starts, boss deaths).
    ring(x, y, color, maxRadius = 90) {
      particles.push({ x, y, vx: 0, vy: 0, life: 0.6, age: 0, size: 3, color, ring: true, maxRadius });
    },
    // Score text that floats up and fades.
    floatText(x, y, message, color = '#eaf2ff', size = 15) {
      texts.push({ x, y, message, color, size, life: 0.9, age: 0 });
      if (texts.length > 40) texts.shift();
    },
    // A shake that decays over `seconds`; stronger shakes override weaker ones.
    shake(seconds, power) {
      if (power >= shakePower || shakeTime <= 0) {
        shakeTime = seconds;
        shakePower = power;
      }
    },
    // How far the camera should be offset this frame.
    offset() {
      if (shakeTime <= 0) return { x: 0, y: 0 };
      const strength = shakePower * (shakeTime / 0.3);
      return {
        x: (Math.random() * 2 - 1) * strength,
        y: (Math.random() * 2 - 1) * strength,
      };
    },
    step(dt) {
      shakeTime = Math.max(0, shakeTime - dt);
      if (shakeTime === 0) shakePower = 0;
      for (let i = particles.length - 1; i >= 0; i -= 1) {
        const p = particles[i];
        p.age += dt;
        if (p.age >= p.life) {
          particles.splice(i, 1);
          continue;
        }
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vx *= 1 - 2.2 * dt;
        p.vy *= 1 - 2.2 * dt;
      }
      for (let i = texts.length - 1; i >= 0; i -= 1) {
        const t = texts[i];
        t.age += dt;
        t.y -= 42 * dt;
        if (t.age >= t.life) texts.splice(i, 1);
      }
    },
    particles,
    texts,
    clear() {
      particles.length = 0;
      texts.length = 0;
      shakeTime = 0;
      shakePower = 0;
    },
  };
}
