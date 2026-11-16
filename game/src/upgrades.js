// The between-wave shop: starshards earned in the arena buy lasting
// upgrades, one choice at a time. Each upgrade tracks how many times it was
// bought and refuses to sell past its cap or when the player is short.
import { SHOP } from './config.js';

export function createShop() {
  return {
    bought: Object.fromEntries(SHOP.map((item) => [item.id, 0])),
  };
}

// The shop entries with their live price, level and whether they can be bought.
export function shopEntries(shop, shards) {
  return SHOP.map((item, index) => {
    const level = shop.bought[item.id] || 0;
    const soldOut = level >= item.max;
    return {
      ...item,
      index,
      level,
      soldOut,
      affordable: !soldOut && shards >= item.cost,
    };
  });
}

// Try to buy entry `index`. Returns true when the purchase went through.
export function buyUpgrade(shop, state, index) {
  const item = SHOP[index];
  if (!item) return false;
  const level = shop.bought[item.id] || 0;
  if (level >= item.max) return false;
  if (state.shards < item.cost) return false;
  state.shards -= item.cost;
  shop.bought[item.id] = level + 1;
  item.apply(state.player);
  return true;
}
