/**
 * input.js
 * Keyboard + on-screen D-pad movement input.
 *
 * Keeps the list of held direction keys (the most recently pressed one
 * wins) plus a one-shot "tap" buffer, so a quick key press made while the
 * player is still finishing a step is not lost.
 */
(function (ADE) {
  'use strict';

  const KEY_TO_DIR = {
    ArrowUp: 'up', KeyW: 'up',
    ArrowRight: 'right', KeyD: 'right',
    ArrowDown: 'down', KeyS: 'down',
    ArrowLeft: 'left', KeyA: 'left',
  };

  const DIR_BY_NAME = {};
  for (const d of ADE.DIRS) DIR_BY_NAME[d.name] = d;

  class Input {
    constructor() {
      this.held = [];
      this.tap = null;
      this.enabled = false;
    }

    attach(target) {
      target.addEventListener('keydown', (e) => {
        const dir = KEY_TO_DIR[e.code];
        if (!dir || !this.enabled) return;
        e.preventDefault(); // stop arrow keys from scrolling the page
        this.press(dir);
      });
      target.addEventListener('keyup', (e) => {
        const dir = KEY_TO_DIR[e.code];
        if (dir) this.release(dir);
      });
      target.addEventListener('blur', () => this.clear());
    }

    /** Wires the touch D-pad buttons (elements with data-dir). */
    attachButtons(root) {
      root.querySelectorAll('[data-dir]').forEach((btn) => {
        const dir = btn.dataset.dir;
        const down = (e) => {
          e.preventDefault();
          this.press(dir);
        };
        const up = (e) => {
          e.preventDefault();
          this.release(dir);
        };
        btn.addEventListener('pointerdown', down);
        btn.addEventListener('pointerup', up);
        btn.addEventListener('pointerleave', up);
        btn.addEventListener('pointercancel', up);
      });
    }

    press(dir) {
      if (!this.held.includes(dir)) this.held.push(dir);
      this.tap = dir;
    }

    release(dir) {
      this.held = this.held.filter((d) => d !== dir);
    }

    clear() {
      this.held = [];
      this.tap = null;
    }

    /** Direction to move this frame ({dr, dc, name}) or null. */
    direction() {
      if (this.tap) {
        const d = this.tap;
        this.tap = null;
        return DIR_BY_NAME[d];
      }
      if (this.held.length) return DIR_BY_NAME[this.held[this.held.length - 1]];
      return null;
    }
  }

  ADE.Input = Input;
})(globalThis.ADE = globalThis.ADE || {});
