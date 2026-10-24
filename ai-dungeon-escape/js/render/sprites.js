/**
 * sprites.js
 * Pixel-art sprites defined as text grids. Each character maps to a colour
 * in a palette ('.' = transparent). Sprites are rasterised once into small
 * off-screen canvases and then scaled up with image smoothing disabled,
 * which keeps the crisp pixel-art look at any tile size.
 */
(function (ADE) {
  'use strict';

  const ART = {
    player: [
      '...hHHh...',
      '..hHHHHh..',
      '..hSSSSh..',
      '..SESSES..',
      '...SSSS...',
      '..CBBBBC..',
      '.SCBGGBCS.',
      '..CbBBbC..',
      '...L..L...',
      '..LL..LL..',
    ],
    wraith: [
      '...MMMM...',
      '..MMMMMM..',
      '.MMDDDDMM.',
      '.MDYDDYDM.',
      '.MDDDDDDM.',
      '.MMDDDDMM.',
      '.MMMMMMMM.',
      'MMMMMMMMMM',
      'MM.MMMM.MM',
      'M...MM...M',
    ],
    key: [
      '..........',
      '...GGGG...',
      '..Gg..gG..',
      '..G....G..',
      '..Gg..gG..',
      '...GGGG...',
      '....GG....',
      '....GGG...',
      '....GG....',
      '....GGG...',
    ],
    gem: [
      '..........',
      '..........',
      '...wCCc...',
      '..wCCCCc..',
      '.wCCCCCCd.',
      '..CCCCCd..',
      '...CCCd...',
      '....Cd....',
      '..........',
      '..........',
    ],
    chest: [
      '..........',
      '..........',
      '.bbbbbbbb.',
      '.bBBBBBBb.',
      '.bBBBBBBb.',
      '.YYYYYYYY.',
      '.bBBkkBBb.',
      '.bBBYYBBb.',
      '.bBBBBBBb.',
      '.bbbbbbbb.',
    ],
    potion: [
      '..........',
      '....KK....',
      '....GG....',
      '...G..G...',
      '..GRRRRG..',
      '.GRWRRRrG.',
      '.GRRRRRrG.',
      '.GRRRRrrG.',
      '..GrrrrG..',
      '...GGGG...',
    ],
  };

  const PALETTES = {
    player: {
      H: '#a9b3c1', h: '#5d6673', S: '#f1c27d', E: '#1a1a1a',
      B: '#3f7fd6', b: '#2a568f', C: '#b23a48', L: '#3b2f2f', G: '#e0b84a',
    },
    key: { G: '#ffd54f', g: '#c79a1e' },
    gem: { w: '#e0f7fa', C: '#26c6da', c: '#00acc1', d: '#00838f' },
    chest: { B: '#8d5a2b', b: '#5d3a1a', Y: '#ffca28', k: '#3e2611' },
    potion: { R: '#e53935', r: '#b71c1c', W: '#ffffff', G: '#b0bec5', K: '#8d6e63' },
  };

  /** Darkens a #rrggbb colour by factor f (0..1). */
  function shade(hex, f) {
    const n = parseInt(hex.slice(1), 16);
    const r = Math.round(((n >> 16) & 255) * f);
    const g = Math.round(((n >> 8) & 255) * f);
    const b = Math.round((n & 255) * f);
    return `rgb(${r},${g},${b})`;
  }

  const cache = new Map();

  function rasterise(art, palette) {
    const h = art.length;
    const w = art[0].length;
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d');
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const col = palette[art[y][x]];
        if (col) {
          ctx.fillStyle = col;
          ctx.fillRect(x, y, 1, 1);
        }
      }
    }
    return c;
  }

  /** Returns the cached canvas for a named sprite. */
  function get(name) {
    if (!cache.has(name)) cache.set(name, rasterise(ART[name], PALETTES[name]));
    return cache.get(name);
  }

  /** Enemy sprite tinted with an algorithm colour. */
  function enemy(color) {
    const key = 'wraith:' + color;
    if (!cache.has(key)) {
      cache.set(key, rasterise(ART.wraith, { M: color, D: shade(color, 0.35), Y: '#fff6a0' }));
    }
    return cache.get(key);
  }

  ADE.sprites = { get, enemy, shade };
})(globalThis.ADE = globalThis.ADE || {});
