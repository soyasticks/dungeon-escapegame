/**
 * tileArt.js
 * Procedural pixel-art for the static maze (walls, floor, mud, water).
 * The map is painted once per level into an off-screen canvas; the game
 * renderer then just copies that image each frame.
 */
(function (ADE) {
  'use strict';

  const { TILE } = ADE;

  const COLORS = {
    wallTop: '#0e0a15',
    wallRim: '#5b4a7a',
    wallFace: '#4a3a66',
    wallMortar: '#221935',
    wallHi: '#7a66a0',
    floorA: '#3d3949',
    floorB: '#383444',
    floorSpeck: '#4a4658',
    floorDark: '#2a2734',
    mud: '#6b4a2b',
    mudDark: '#4e351e',
    mudHi: '#86603a',
    water: '#1f5a91',
    waterDark: '#164572',
    waterHi: '#3f86c4',
  };

  /** Deterministic pseudo-random value in [0,1) for cell i and salt k. */
  function hash(i, k) {
    let x = (i * 374761393 + k * 668265263) >>> 0;
    x = Math.imul(x ^ (x >>> 13), 1274126177) >>> 0;
    return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
  }

  function isWall(grid, r, c) {
    return !grid.inBounds(r, c) || grid.get(r, c) === TILE.WALL;
  }

  /** Paints the detailed dungeon look for the game. */
  function paintDungeon(ctx, grid, tile) {
    const px = tile / 10; // one "art pixel"
    const P = (v) => Math.round(v);
    ctx.imageSmoothingEnabled = false;

    for (let r = 0; r < grid.rows; r++) {
      for (let c = 0; c < grid.cols; c++) {
        const i = grid.index(r, c);
        const x = c * tile;
        const y = r * tile;
        const t = grid.tiles[i];

        if (t === TILE.WALL) {
          const faceVisible = !isWall(grid, r + 1, c);
          ctx.fillStyle = COLORS.wallTop;
          ctx.fillRect(x, y, tile, tile);
          if (faceVisible) {
            // Brick face on the south side of walls that border a corridor.
            const faceY = y + P(px * 3);
            ctx.fillStyle = COLORS.wallFace;
            ctx.fillRect(x, faceY, tile, tile - P(px * 3));
            ctx.fillStyle = COLORS.wallMortar;
            for (let row = 0; row < 3; row++) {
              const by = faceY + P(row * px * 2.4);
              ctx.fillRect(x, by, tile, Math.max(1, P(px * 0.5)));
              const offset = row % 2 ? px * 2.5 : 0;
              for (let bx = offset; bx < 10; bx += 5) {
                ctx.fillRect(P(x + bx * px), by, Math.max(1, P(px * 0.5)), P(px * 2.4));
              }
            }
            ctx.fillStyle = COLORS.wallHi;
            ctx.fillRect(x, faceY, tile, Math.max(1, P(px * 0.6)));
          } else {
            // Top of the wall: subtle stone speckles.
            ctx.fillStyle = COLORS.wallMortar;
            for (let k = 0; k < 3; k++) {
              ctx.fillRect(P(x + hash(i, k) * 8 * px), P(y + hash(i, k + 9) * 8 * px), P(px), P(px));
            }
          }
          // Lit rim where the wall top meets a corridor, so walls read clearly.
          const rim = Math.max(1, P(px * 0.7));
          ctx.fillStyle = COLORS.wallRim;
          if (!isWall(grid, r - 1, c)) ctx.fillRect(x, y, tile, rim);
          if (!isWall(grid, r, c - 1)) ctx.fillRect(x, y, rim, faceVisible ? P(px * 3) : tile);
          if (!isWall(grid, r, c + 1)) ctx.fillRect(x + tile - rim, y, rim, faceVisible ? P(px * 3) : tile);
          continue;
        }

        // ---- walkable tiles ----
        if (t === TILE.MUD) {
          ctx.fillStyle = COLORS.mud;
          ctx.fillRect(x, y, tile, tile);
          ctx.fillStyle = COLORS.mudDark;
          for (let k = 0; k < 5; k++) {
            ctx.fillRect(P(x + hash(i, k) * 8 * px), P(y + hash(i, k + 20) * 8 * px), P(px * 2), P(px));
          }
          ctx.fillStyle = COLORS.mudHi;
          for (let k = 0; k < 3; k++) {
            ctx.fillRect(P(x + hash(i, k + 40) * 9 * px), P(y + hash(i, k + 50) * 9 * px), P(px), P(px));
          }
        } else if (t === TILE.WATER) {
          ctx.fillStyle = COLORS.water;
          ctx.fillRect(x, y, tile, tile);
          ctx.fillStyle = COLORS.waterDark;
          ctx.fillRect(x, P(y + px * 7), tile, P(px * 3));
        } else {
          ctx.fillStyle = (r + c) % 2 ? COLORS.floorA : COLORS.floorB;
          ctx.fillRect(x, y, tile, tile);
          ctx.fillStyle = COLORS.floorSpeck;
          for (let k = 0; k < 3; k++) {
            ctx.fillRect(P(x + hash(i, k) * 9 * px), P(y + hash(i, k + 30) * 9 * px), P(px), P(px));
          }
          if (hash(i, 99) < 0.15) {
            // occasional crack
            ctx.fillStyle = COLORS.floorDark;
            const cx = x + hash(i, 7) * 5 * px;
            const cy = y + hash(i, 8) * 5 * px;
            ctx.fillRect(P(cx), P(cy), P(px * 3), P(px * 0.6) || 1);
            ctx.fillRect(P(cx + px * 2), P(cy), P(px * 0.6) || 1, P(px * 3));
          }
        }
        // Shadow cast by a wall directly above.
        if (isWall(grid, r - 1, c)) {
          ctx.fillStyle = 'rgba(0,0,0,0.3)';
          ctx.fillRect(x, y, tile, P(px * 1.5));
        }
        // Thin grid line for readability.
        ctx.fillStyle = 'rgba(0,0,0,0.18)';
        ctx.fillRect(x, y + tile - 1, tile, 1);
        ctx.fillRect(x + tile - 1, y, 1, tile);
      }
    }
  }

  /** Flat, high-contrast look for the Algorithm Lab. */
  function paintFlat(ctx, grid, tile) {
    for (let r = 0; r < grid.rows; r++) {
      for (let c = 0; c < grid.cols; c++) {
        const t = grid.get(r, c);
        ctx.fillStyle =
          t === TILE.WALL ? '#14101d' : t === TILE.MUD ? '#5a4128' : t === TILE.WATER ? '#1d4a78' : '#34313f';
        ctx.fillRect(c * tile, r * tile, tile, tile);
        if (t !== TILE.WALL && tile >= 6) {
          ctx.fillStyle = 'rgba(0,0,0,0.25)';
          ctx.fillRect(c * tile, r * tile + tile - 1, tile, 1);
          ctx.fillRect(c * tile + tile - 1, r * tile, 1, tile);
        }
      }
    }
  }

  /** Wall cells with a visible face where torches hang (deterministic). */
  function torchCells(grid) {
    const out = [];
    for (let r = 1; r < grid.rows - 1; r++) {
      for (let c = 1; c < grid.cols - 1; c++) {
        const i = grid.index(r, c);
        if (grid.tiles[i] === TILE.WALL && !isWall(grid, r + 1, c) && hash(i, 777) < 0.12) out.push(i);
      }
    }
    return out;
  }

  ADE.tileArt = { paintDungeon, paintFlat, torchCells, hash, COLORS };
})(globalThis.ADE = globalThis.ADE || {});
