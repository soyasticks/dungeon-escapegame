/**
 * grid.js
 * The maze as a 2-D grid of tiles.
 *
 * Cells are identified by a single integer index: index = row * cols + col.
 * Integer ids let the search algorithms use fast typed arrays for their
 * visited / parent / cost bookkeeping.
 */
(function (ADE) {
  'use strict';

  const { TILE, TERRAIN_COST, DIRS } = ADE;

  class Grid {
    /**
     * @param {number} rows
     * @param {number} cols
     * @param {number} [fill=TILE.WALL]
     */
    constructor(rows, cols, fill = TILE.WALL) {
      this.rows = rows;
      this.cols = cols;
      this.size = rows * cols;
      this.tiles = new Uint8Array(this.size).fill(fill);
    }

    clone() {
      const g = new Grid(this.rows, this.cols);
      g.tiles.set(this.tiles);
      return g;
    }

    index(r, c) {
      return r * this.cols + c;
    }

    row(i) {
      return Math.floor(i / this.cols);
    }

    col(i) {
      return i % this.cols;
    }

    inBounds(r, c) {
      return r >= 0 && r < this.rows && c >= 0 && c < this.cols;
    }

    get(r, c) {
      return this.tiles[r * this.cols + c];
    }

    set(r, c, tile) {
      this.tiles[r * this.cols + c] = tile;
    }

    /** True if (r, c) is inside the grid and not a wall. */
    isWalkable(r, c) {
      return this.inBounds(r, c) && this.tiles[r * this.cols + c] !== TILE.WALL;
    }

    isWalkableIndex(i) {
      return i >= 0 && i < this.size && this.tiles[i] !== TILE.WALL;
    }

    /** Cost of stepping INTO cell i. */
    cost(i) {
      return TERRAIN_COST[this.tiles[i]];
    }

    /**
     * Writes the walkable 4-neighbours of cell i into `out` (an Int32Array
     * or array with room for 4) in the fixed order Up, Right, Down, Left.
     * Returns how many neighbours were written. Allocation-free so it does
     * not distort the algorithm timings.
     */
    neighbors(i, out) {
      const cols = this.cols;
      const r = (i / cols) | 0;
      const c = i - r * cols;
      let k = 0;
      for (let d = 0; d < 4; d++) {
        const nr = r + DIRS[d].dr;
        const nc = c + DIRS[d].dc;
        if (nr < 0 || nr >= this.rows || nc < 0 || nc >= cols) continue;
        const ni = nr * cols + nc;
        if (this.tiles[ni] !== TILE.WALL) out[k++] = ni;
      }
      return k;
    }

    /** Manhattan distance |dr| + |dc| between two cell indices. */
    manhattan(a, b) {
      const cols = this.cols;
      const ar = (a / cols) | 0;
      const br = (b / cols) | 0;
      return Math.abs(ar - br) + Math.abs(a - ar * cols - (b - br * cols));
    }

    /** All walkable cell indices. */
    walkableCells() {
      const out = [];
      for (let i = 0; i < this.size; i++) if (this.tiles[i] !== TILE.WALL) out.push(i);
      return out;
    }
  }

  ADE.Grid = Grid;
})(globalThis.ADE = globalThis.ADE || {});
