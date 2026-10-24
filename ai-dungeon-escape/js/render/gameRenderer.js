/**
 * gameRenderer.js
 * Draws the game world onto the main canvas each frame:
 * static map → water shimmer → traps → exit → items → AI paths →
 * enemies → player → torches → lighting → floating text.
 */
(function (ADE) {
  'use strict';

  const { TILE, sprites, tileArt } = ADE;

  const MAX_W = 960;
  const MAX_H = 660;

  class GameRenderer {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.grid = null;
      this.tile = 32;
      this.bg = null;
    }

    /** Prepares the canvas size and pre-renders the static map for a new level. */
    setLevel(game) {
      const grid = game.grid;
      this.grid = grid;
      this.tile = Math.max(12, Math.floor(Math.min(MAX_W / grid.cols, MAX_H / grid.rows)));
      this.canvas.width = grid.cols * this.tile;
      this.canvas.height = grid.rows * this.tile;
      this.bg = document.createElement('canvas');
      this.bg.width = this.canvas.width;
      this.bg.height = this.canvas.height;
      tileArt.paintDungeon(this.bg.getContext('2d'), grid, this.tile);
      this.torches = tileArt.torchCells(grid);
      this.waterCells = [];
      for (let i = 0; i < grid.size; i++) if (grid.tiles[i] === TILE.WATER) this.waterCells.push(i);
    }

    draw(game, now) {
      if (!this.grid || game.grid !== this.grid) this.setLevel(game);
      const ctx = this.ctx;
      const T = this.tile;
      const grid = this.grid;
      const time = now / 1000;
      ctx.imageSmoothingEnabled = false;

      ctx.save();
      if (game.shake > 0) {
        const m = game.shake * 10;
        ctx.translate((Math.random() - 0.5) * m, (Math.random() - 0.5) * m);
      }
      ctx.drawImage(this.bg, 0, 0);

      this.drawWater(time);
      this.drawTraps(game);
      this.drawExit(game, time);
      this.drawItems(game, time);
      if (game.showPaths) this.drawEnemyPaths(game);
      this.drawEnemies(game, time);
      this.drawPlayer(game, time);
      this.drawTorches(time);
      this.drawLighting(game, time);
      this.drawEffects(game);
      ctx.restore();
    }

    cellXY(i) {
      return { x: this.grid.col(i) * this.tile, y: this.grid.row(i) * this.tile };
    }

    drawSprite(img, x, y, scale = 1, flip = false, alpha = 1) {
      const ctx = this.ctx;
      const s = this.tile * scale;
      const ox = x + (this.tile - s) / 2;
      const oy = y + (this.tile - s) / 2;
      ctx.globalAlpha = alpha;
      if (flip) {
        ctx.save();
        ctx.translate(ox + s, oy);
        ctx.scale(-1, 1);
        ctx.drawImage(img, 0, 0, s, s);
        ctx.restore();
      } else {
        ctx.drawImage(img, Math.round(ox), Math.round(oy), Math.round(s), Math.round(s));
      }
      ctx.globalAlpha = 1;
    }

    glow(cx, cy, radius, color) {
      const ctx = this.ctx;
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
      g.addColorStop(0, color);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);
    }

    drawWater(time) {
      const ctx = this.ctx;
      const T = this.tile;
      const px = T / 10;
      ctx.fillStyle = 'rgba(120,190,255,0.35)';
      for (const i of this.waterCells) {
        const { x, y } = this.cellXY(i);
        const off = ((time * 1.5 + tileArt.hash(i, 3) * 10) % 10) * px;
        ctx.fillRect(Math.round(x + ((off + 2 * px) % (8 * px))), Math.round(y + 3 * px), Math.round(px * 2), Math.max(1, Math.round(px * 0.6)));
        ctx.fillRect(Math.round(x + ((off + 6 * px) % (8 * px))), Math.round(y + 6 * px), Math.round(px * 2), Math.max(1, Math.round(px * 0.6)));
      }
    }

    drawTraps(game) {
      const ctx = this.ctx;
      const T = this.tile;
      const px = T / 10;
      for (const trap of game.traps) {
        const { x, y } = this.cellXY(trap.cell);
        const active = game.isTrapActive(trap);
        const phase = (game.time + trap.phase) % game.cfg.trapPeriod;
        const warning = !active && phase > game.cfg.trapPeriod - 0.45;
        // plate
        ctx.fillStyle = '#1b1922';
        ctx.fillRect(Math.round(x + px), Math.round(y + px), Math.round(px * 8), Math.round(px * 8));
        ctx.fillStyle = warning ? '#7a2a2a' : '#3a3644';
        ctx.fillRect(Math.round(x + px * 1.5), Math.round(y + px * 1.5), Math.round(px * 7), Math.round(px * 7));
        const spots = [
          [2.5, 2.5],
          [6, 2.5],
          [2.5, 6],
          [6, 6],
        ];
        for (const [sx, sy] of spots) {
          if (active) {
            ctx.fillStyle = '#d7dce4';
            ctx.beginPath();
            ctx.moveTo(x + (sx + 0.75) * px, y + (sy - 1.5) * px);
            ctx.lineTo(x + (sx + 1.7) * px, y + (sy + 1.5) * px);
            ctx.lineTo(x + (sx - 0.2) * px, y + (sy + 1.5) * px);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = '#ff5252';
            ctx.fillRect(Math.round(x + (sx + 0.5) * px), Math.round(y + (sy - 1.5) * px), Math.max(1, Math.round(px * 0.6)), Math.max(1, Math.round(px * 0.6)));
          } else {
            ctx.fillStyle = '#121016';
            ctx.fillRect(Math.round(x + sx * px), Math.round(y + sy * px), Math.round(px * 1.5), Math.round(px * 1.5));
          }
        }
        if (active) this.glow(x + T / 2, y + T / 2, T * 0.8, 'rgba(255,60,60,0.25)');
      }
    }

    drawExit(game, time) {
      const ctx = this.ctx;
      const T = this.tile;
      const px = T / 10;
      const { x, y } = this.cellXY(game.exit);
      const cx = x + T / 2;
      const cy = y + T / 2;
      if (game.exitOpen) {
        this.glow(cx, cy, T * 1.6, 'rgba(160,90,255,0.55)');
        for (let k = 0; k < 4; k++) {
          const rr = (((time * 0.8 + k / 4) % 1) * T) / 2;
          ctx.strokeStyle = `rgba(210,170,255,${1 - rr / (T / 2)})`;
          ctx.lineWidth = Math.max(1, px * 0.8);
          ctx.beginPath();
          ctx.ellipse(cx, cy, rr, rr * 1.2, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.fillStyle = '#e8d8ff';
        ctx.fillRect(Math.round(cx - px), Math.round(cy - px), Math.round(px * 2), Math.round(px * 2));
      } else {
        // Sealed iron gate with a padlock.
        ctx.fillStyle = '#3d3347';
        ctx.fillRect(Math.round(x + px), Math.round(y + px), Math.round(px * 8), Math.round(px * 9));
        ctx.fillStyle = '#1d1824';
        ctx.fillRect(Math.round(x + px * 2), Math.round(y + px * 2), Math.round(px * 6), Math.round(px * 8));
        ctx.fillStyle = '#7b6f8c';
        for (let b = 0; b < 3; b++) ctx.fillRect(Math.round(x + px * (2.6 + b * 2)), Math.round(y + px * 2), Math.max(1, Math.round(px * 0.8)), Math.round(px * 8));
        ctx.fillStyle = '#ffd54f';
        ctx.fillRect(Math.round(x + px * 4), Math.round(y + px * 5), Math.round(px * 2), Math.round(px * 2));
        this.glow(cx, cy, T, 'rgba(255,213,79,0.12)');
      }
    }

    drawItems(game, time) {
      for (const [cell, item] of game.items) {
        const { x, y } = this.cellXY(cell);
        const bob = Math.sin(time * 3 + cell) * this.tile * 0.05;
        const cx = x + this.tile / 2;
        const cy = y + this.tile / 2;
        if (item.type === 'key') this.glow(cx, cy, this.tile * 0.9, 'rgba(255,213,79,0.35)');
        else if (item.type === 'gem') this.glow(cx, cy, this.tile * 0.7, 'rgba(38,198,218,0.3)');
        else if (item.type === 'potion') this.glow(cx, cy, this.tile * 0.7, 'rgba(229,57,53,0.3)');
        else if (item.type === 'chest') this.glow(cx, cy, this.tile * 0.8, 'rgba(255,202,40,0.2)');
        this.drawSprite(sprites.get(item.type), x, y + bob, 0.85);
      }
    }

    drawEnemyPaths(game) {
      const ctx = this.ctx;
      const T = this.tile;
      for (const e of game.enemies) {
        if (e.path.length === 0) continue;
        const pos = e.renderPos(this.grid);
        ctx.strokeStyle = e.info.color;
        ctx.globalAlpha = e.hunting ? 0.75 : 0.35;
        ctx.lineWidth = Math.max(2, T / 10);
        ctx.setLineDash([T / 5, T / 6]);
        ctx.beginPath();
        ctx.moveTo((pos.c + 0.5) * T, (pos.r + 0.5) * T);
        for (const cell of e.path) {
          ctx.lineTo((this.grid.col(cell) + 0.5) * T, (this.grid.row(cell) + 0.5) * T);
        }
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;
      }
    }

    drawEnemies(game, time) {
      const ctx = this.ctx;
      const T = this.tile;
      for (const e of game.enemies) {
        const pos = e.renderPos(this.grid);
        const x = pos.c * T;
        const y = pos.r * T + Math.sin(time * 4 + e.bob) * T * 0.06;
        this.glow(x + T / 2, y + T / 2, T * 0.9, e.hunting ? 'rgba(255,40,40,0.35)' : 'rgba(120,80,200,0.2)');
        const alpha = e.stun > 0 ? 0.45 + 0.3 * Math.sin(time * 20) : 1;
        this.drawSprite(sprites.enemy(e.info.color), x, y, 0.9, e.facing < 0, alpha);
        // algorithm label
        const fs = Math.max(7, Math.round(T * 0.26));
        ctx.font = `${fs}px "Press Start 2P", monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        const label = e.info.short;
        const w = ctx.measureText(label).width + 6;
        ctx.fillStyle = 'rgba(10,6,16,0.8)';
        ctx.fillRect(Math.round(x + T / 2 - w / 2), Math.round(y - fs - 3), Math.round(w), fs + 4);
        ctx.fillStyle = e.info.color;
        ctx.fillText(label, x + T / 2, y);
        if (e.hunting) {
          ctx.fillStyle = '#ff5252';
          ctx.fillText('!', x + T / 2 + w / 2 + fs * 0.6, y);
        }
      }
    }

    drawPlayer(game, time) {
      const p = game.player;
      const T = this.tile;
      const pos = p.renderPos(this.grid);
      const x = pos.c * T;
      const y = pos.r * T;
      const walkBob = p.moving ? Math.abs(Math.sin(p.t * Math.PI)) * T * -0.08 : 0;
      this.glow(x + T / 2, y + T / 2, T * 1.1, 'rgba(255,190,110,0.25)');
      const flicker = p.invuln > 0 && Math.floor(time * 14) % 2 === 0;
      this.drawSprite(sprites.get('player'), x, y + walkBob, 0.92, p.facing < 0, flicker ? 0.25 : 1);
    }

    drawTorches(time) {
      const ctx = this.ctx;
      const T = this.tile;
      const px = T / 10;
      for (const i of this.torches) {
        const { x, y } = this.cellXY(i);
        const cx = x + T / 2;
        const fy = y + px * 4;
        const f = 0.85 + 0.15 * Math.sin(time * 9 + i);
        this.glow(cx, fy, T * 1.5 * f, 'rgba(255,150,60,0.22)');
        ctx.fillStyle = '#5d4037';
        ctx.fillRect(Math.round(cx - px * 0.5), Math.round(fy + px), Math.round(px), Math.round(px * 3));
        ctx.fillStyle = '#ff9800';
        ctx.fillRect(Math.round(cx - px), Math.round(fy - px * f), Math.round(px * 2), Math.round(px * 2));
        ctx.fillStyle = '#ffe082';
        ctx.fillRect(Math.round(cx - px * 0.5), Math.round(fy - px * 0.5 * f), Math.round(px), Math.round(px));
      }
    }

    /** Darkness that fades out around the player, like torch light in a dungeon. */
    drawLighting(game) {
      const ctx = this.ctx;
      const T = this.tile;
      const pos = game.player.renderPos(this.grid);
      const cx = (pos.c + 0.5) * T;
      const cy = (pos.r + 0.5) * T;
      const g = ctx.createRadialGradient(cx, cy, T * 3, cx, cy, T * 13);
      g.addColorStop(0, 'rgba(6,3,12,0)');
      g.addColorStop(1, 'rgba(6,3,12,0.45)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    drawEffects(game) {
      const ctx = this.ctx;
      const T = this.tile;
      const fs = Math.max(8, Math.round(T * 0.32));
      ctx.font = `${fs}px "Press Start 2P", monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (const fx of game.effects) {
        const rise = (1.1 - fx.life) * T * 0.9;
        ctx.globalAlpha = Math.min(1, fx.life * 1.5);
        ctx.fillStyle = '#000';
        ctx.fillText(fx.text, (fx.c + 0.5) * T + 2, fx.r * T - rise + 2);
        ctx.fillStyle = fx.color;
        ctx.fillText(fx.text, (fx.c + 0.5) * T, fx.r * T - rise);
      }
      ctx.globalAlpha = 1;
    }
  }

  ADE.GameRenderer = GameRenderer;
})(globalThis.ADE = globalThis.ADE || {});
