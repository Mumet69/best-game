// A small seeded generator (mulberry32) plus the helpers the world uses, so a
// seed always replays the same arena: the same spawns, the same drops, the same
// screenshot. The live game seeds from Math.random; ?seed=N fixes it.
export function createRandom(seed) {
  let state = (seed >>> 0) || 1;
  const next = () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    // A float in [min, max).
    range(min, max) {
      return min + next() * (max - min);
    },
    // An integer in [min, max].
    int(min, max) {
      return min + Math.floor(next() * (max - min + 1));
    },
    // One element of a non-empty array.
    pick(list) {
      return list[Math.floor(next() * list.length)];
    },
    // An angle in radians, uniform over the circle.
    angle() {
      return next() * Math.PI * 2;
    },
  };
}
