/**
 * screens.js
 * Minimal screen manager: exactly one <section class="screen"> is visible.
 */
(function (ADE) {
  'use strict';

  class Screens {
    constructor() {
      this.current = 'menu';
      this.listeners = [];
    }

    show(name) {
      document.querySelectorAll('.screen').forEach((el) => {
        el.classList.toggle('active', el.id === 'screen-' + name);
      });
      const prev = this.current;
      this.current = name;
      this.listeners.forEach((fn) => fn(name, prev));
      window.scrollTo(0, 0);
    }

    onChange(fn) {
      this.listeners.push(fn);
    }
  }

  /** Small pixel-art heart as an inline SVG string. */
  function heartSVG(filled) {
    const rows = ['.XX.XX.', 'XXXXXXX', 'XXXXXXX', '.XXXXX.', '..XXX..', '...X...'];
    let rects = '';
    rows.forEach((row, y) =>
      [...row].forEach((ch, x) => {
        if (ch === 'X') rects += `<rect x="${x}" y="${y}" width="1" height="1"/>`;
      })
    );
    const fill = filled ? '#ff4d5e' : '#3a2a3f';
    return `<svg class="heart" viewBox="0 0 7 6" fill="${fill}" shape-rendering="crispEdges" aria-hidden="true">${rects}</svg>`;
  }

  ADE.Screens = Screens;
  ADE.heartSVG = heartSVG;
})(globalThis.ADE = globalThis.ADE || {});
