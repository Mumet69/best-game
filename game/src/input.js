// Keyboard and mouse, read once a frame and handed to the world as a small
// snapshot: a move direction, an aim point, whether the trigger is held, and
// the edge-triggered actions (confirm, pause, mute, shop keys 1-7).
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_MUTE = 4;
export const ACTION_SHOP = 8;

export function createInput(canvas) {
  const keys = new Set();
  const actions = { bits: 0, shopIndex: -1 };
  const mouse = { x: 0, y: 0, down: false, clicked: false };
  let hadFocus = true;

  function keyName(event) {
    return event.key.length === 1 ? event.key.toLowerCase() : event.key;
  }

  function onKeyDown(event) {
    const key = keyName(event);
    if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) event.preventDefault();
    if (event.repeat) return;
    keys.add(key);
    if (key === ' ' || key === 'enter') actions.bits |= ACTION_CONFIRM;
    if (key === 'p' || key === 'escape') actions.bits |= ACTION_PAUSE;
    if (key === 'm') actions.bits |= ACTION_MUTE;
    const shop = '1234567'.indexOf(key);
    if (shop !== -1) {
      actions.bits |= ACTION_SHOP;
      actions.shopIndex = shop;
    }
  }

  function onKeyUp(event) {
    keys.delete(keyName(event));
  }

  function onMouseMove(event) {
    const rect = canvas.getBoundingClientRect();
    mouse.x = (event.clientX - rect.left) * (canvas.width / rect.width);
    mouse.y = (event.clientY - rect.top) * (canvas.height / rect.height);
  }

  function onMouseDown(event) {
    if (event.button !== 0) return;
    onMouseMove(event);
    mouse.down = true;
    mouse.clicked = true;
    actions.bits |= ACTION_CONFIRM;
  }

  function onMouseUp(event) {
    if (event.button === 0) mouse.down = false;
  }

  function onBlur() {
    keys.clear();
    mouse.down = false;
    hadFocus = false;
  }

  function onFocus() {
    hadFocus = true;
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);
  window.addEventListener('focus', onFocus);
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mouseup', onMouseUp);

  return {
    mouse,
    // -1, 0 or 1 on each axis, from WASD or the arrow keys.
    direction() {
      const x = (keys.has('d') || keys.has('arrowright') ? 1 : 0) - (keys.has('a') || keys.has('arrowleft') ? 1 : 0);
      const y = (keys.has('s') || keys.has('arrowdown') ? 1 : 0) - (keys.has('w') || keys.has('arrowup') ? 1 : 0);
      return { x, y };
    },
    firing() {
      return mouse.down || keys.has(' ');
    },
    // Edge-triggered actions since the last call; reading them clears them.
    takeActions() {
      const bits = actions.bits;
      const shopIndex = actions.shopIndex;
      actions.bits = 0;
      actions.shopIndex = -1;
      return { bits, shopIndex };
    },
    // True right after a click (used to skip a frame of firing on the start click).
    takeClick() {
      const clicked = mouse.clicked;
      mouse.clicked = false;
      return clicked;
    },
    lostFocus() {
      const lost = !hadFocus;
      hadFocus = true;
      return lost;
    },
  };
}
