/**
 * labRenderer.js
 * Draws one Algorithm Lab panel: the maze, cells explored so far (in the
 * order the algorithm actually expanded them), the final path, and the
 * start / goal markers.
 */
(function (ADE) {
  'use strict';

  const { tileArt } = ADE;

  function hexToRgb(hex) {
    const n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  class LabRenderer {
    /**
     * @param {HTMLCanvasElement} canvas
     * @param {string} color algorithm colour
     */
    constructor(canvas, color) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.color = color;
      this.rgb = hexToRgb(color);
      this.grid = null;
      this.tile = 8;
    }

    setMaze(grid, maxWidth) {
      this.grid = grid;
      this.tile = Math.max(4, Math.floor(maxWidth / grid.cols));
      this.canvas.width = grid.cols * this.tile;
      this.canvas.height = grid.rows * this.tile;
      this.base = document.createElement('canvas');
      this.base.width = this.canvas.width;
      this.base.height = this.canvas.height;
      tileArt.paintFlat(this.base.getContext('2d'), grid, this.tile);
    }

    /** Converts a mouse event to a cell index (or -1). */
    cellAt(evt) {
      const rect = this.canvas.getBoundingClientRect();
      const x = ((evt.clientX - rect.left) / rect.width) * this.canvas.width;
      const y = ((evt.clientY - rect.top) / rect.height) * this.canvas.height;
      const c = Math.floor(x / this.tile);
      const r = Math.floor(y / this.tile);
      if (!this.grid || !this.grid.inBounds(r, c)) return -1;
      return this.grid.index(r, c);
    }

    /**
     * @param {object} view {start, goal, result|null, shown (#explored drawn), pathShown (#path cells drawn)}
     */
    draw(view) {
      const ctx = this.ctx;
      const T = this.tile;
      const grid = this.grid;
      if (!grid) return;
      ctx.drawImage(this.base, 0, 0);
      const [cr, cg, cb] = this.rgb;
      const res = view.result;

      if (res) {
        const n = Math.min(view.shown, res.explored.length);
        // Older expansions are dimmer; the most recent ~40 glow brighter.
        for (let k = 0; k < n; k++) {
          const i = res.explored[k];
          const recent = n - k < 40 ? 1 - (n - k) / 40 : 0;
          ctx.fillStyle = `rgba(${cr},${cg},${cb},${0.32 + 0.45 * recent})`;
          ctx.fillRect(grid.col(i) * T, grid.row(i) * T, T, T);
        }
        if (n > 0 && n < res.explored.length) {
          const i = res.explored[n - 1];
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(grid.col(i) * T + 1, grid.row(i) * T + 1, T - 2, T - 2);
        }
        const m = Math.min(view.pathShown, res.path.length);
        if (m > 0) {
          ctx.fillStyle = 'rgba(255,236,140,0.85)';
          for (let k = 0; k < m; k++) {
            const i = res.path[k];
            const pad = Math.max(1, Math.floor(T * 0.22));
            ctx.fillRect(grid.col(i) * T + pad, grid.row(i) * T + pad, T - pad * 2, T - pad * 2);
          }
          ctx.strokeStyle = '#fff3b0';
          ctx.lineWidth = Math.max(1.5, T * 0.22);
          ctx.lineJoin = 'round';
          ctx.beginPath();
          for (let k = 0; k < m; k++) {
            const i = res.path[k];
            const x = (grid.col(i) + 0.5) * T;
            const y = (grid.row(i) + 0.5) * T;
            if (k === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();
        }
      }
      this.marker(view.start, '#4caf50', 'S');
      this.marker(view.goal, '#ffd54f', 'G');
    }

    marker(i, color, letter) {
      const ctx = this.ctx;
      const T = this.tile;
      const x = this.grid.col(i) * T;
      const y = this.grid.row(i) * T;
      ctx.fillStyle = '#000';
      ctx.fillRect(x, y, T, T);
      ctx.fillStyle = color;
      ctx.fillRect(x + 1, y + 1, T - 2, T - 2);
      if (T >= 9) {
        ctx.fillStyle = '#000';
        ctx.font = `${Math.floor(T * 0.6)}px "Press Start 2P", monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(letter, x + T / 2 + 0.5, y + T / 2 + 1);
      }
    }
  }

  ADE.LabRenderer = LabRenderer;
})(globalThis.ADE = globalThis.ADE || {});
