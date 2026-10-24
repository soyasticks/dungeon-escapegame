/**
 * mazeGenerator.js
 * Random but always-solvable maze generation.
 *
 * 1. Carve a PERFECT maze with the randomized depth-first "recursive
 *    backtracker" on the odd-coordinate cells. A perfect maze is a spanning
 *    tree, so every open cell is connected to every other one — that is the
 *    solvability guarantee.
 * 2. "Braid" the maze by knocking out a fraction of the remaining interior
 *    walls. Removing walls can only ADD connections, so the maze stays
 *    solvable, and the extra loops mean different algorithms find visibly
 *    different paths.
 * 3. Paint patches of weighted terrain (mud = 3, water = 5) on floor cells.
 *    Terrain is always walkable, so connectivity is unchanged.
 * 4. Verify with a flood fill that the goal (and every required cell) is
 *    reachable from the start. If verification ever fails, the generator
 *    tries the next seed instead of returning a broken maze.
 */
(function (ADE) {
  'use strict';

  const { TILE, Grid, RNG } = ADE;

  /**
   * Step-distance from `src` to every cell (-1 = unreachable).
   * Simple flood fill used for validation and for placing game objects.
   */
  function distanceMap(grid, src) {
    const dist = new Int32Array(grid.size).fill(-1);
    if (!grid.isWalkableIndex(src)) return dist;
    const queue = new Int32Array(grid.size);
    const nb = new Int32Array(4);
    let head = 0;
    let tail = 0;
    queue[tail++] = src;
    dist[src] = 0;
    while (head < tail) {
      const cur = queue[head++];
      const k = grid.neighbors(cur, nb);
      for (let i = 0; i < k; i++) {
        if (dist[nb[i]] === -1) {
          dist[nb[i]] = dist[cur] + 1;
          queue[tail++] = nb[i];
        }
      }
    }
    return dist;
  }

  /** Forces a dimension to be odd and at least 5. */
  function oddSize(n) {
    n = Math.max(5, Math.floor(n));
    return n % 2 === 0 ? n + 1 : n;
  }

  function carvePerfectMaze(grid, rng) {
    const { rows, cols } = grid;
    const startR = 1;
    const startC = 1;
    grid.set(startR, startC, TILE.FLOOR);
    const stack = [[startR, startC]];
    const steps = [
      [-2, 0],
      [0, 2],
      [2, 0],
      [0, -2],
    ];
    while (stack.length) {
      const [r, c] = stack[stack.length - 1];
      const options = [];
      for (const [dr, dc] of steps) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr > 0 && nr < rows - 1 && nc > 0 && nc < cols - 1 && grid.get(nr, nc) === TILE.WALL) {
          options.push([nr, nc, dr, dc]);
        }
      }
      if (options.length === 0) {
        stack.pop(); // dead end: backtrack
        continue;
      }
      const [nr, nc, dr, dc] = rng.pick(options);
      grid.set(r + dr / 2, c + dc / 2, TILE.FLOOR); // knock down the wall between
      grid.set(nr, nc, TILE.FLOOR);
      stack.push([nr, nc]);
    }
  }

  function braid(grid, rng, loopFactor) {
    if (loopFactor <= 0) return;
    const { rows, cols } = grid;
    const candidates = [];
    for (let r = 1; r < rows - 1; r++) {
      for (let c = 1; c < cols - 1; c++) {
        if (grid.get(r, c) !== TILE.WALL) continue;
        const horizontal = grid.get(r, c - 1) !== TILE.WALL && grid.get(r, c + 1) !== TILE.WALL;
        const vertical = grid.get(r - 1, c) !== TILE.WALL && grid.get(r + 1, c) !== TILE.WALL;
        // Only walls separating two corridors in a straight line, never pillars.
        if (horizontal !== vertical) candidates.push(r * cols + c);
      }
    }
    rng.shuffle(candidates);
    const count = Math.floor(candidates.length * loopFactor);
    for (let i = 0; i < count; i++) grid.tiles[candidates[i]] = TILE.FLOOR;
  }

  function paintTerrain(grid, rng, tileType, ratio, protectedSet) {
    if (ratio <= 0) return;
    const floor = [];
    for (let i = 0; i < grid.size; i++) {
      if (grid.tiles[i] === TILE.FLOOR && !protectedSet.has(i)) floor.push(i);
    }
    let remaining = Math.floor(floor.length * ratio);
    const nb = new Int32Array(4);
    let guard = 0;
    while (remaining > 0 && floor.length && guard++ < 10000) {
      let cur = rng.pick(floor);
      const blob = rng.int(3, 7);
      for (let s = 0; s < blob && remaining > 0; s++) {
        if (grid.tiles[cur] === TILE.FLOOR && !protectedSet.has(cur)) {
          grid.tiles[cur] = tileType;
          remaining--;
        }
        const k = grid.neighbors(cur, nb);
        if (k === 0) break;
        cur = nb[rng.int(0, k - 1)]; // random walk to grow the patch
      }
    }
  }

  /**
   * Generates a maze.
   * @param {object} opts
   * @param {number} opts.rows        odd number recommended (forced odd)
   * @param {number} opts.cols        odd number recommended (forced odd)
   * @param {number} [opts.seed]      RNG seed (random if omitted)
   * @param {number} [opts.loopFactor=0.1]  fraction of interior walls removed
   * @param {number} [opts.mud=0.08]   fraction of floor turned to mud
   * @param {number} [opts.water=0.04] fraction of floor turned to water
   * @returns {{grid: Grid, start: number, goal: number, seed: number}}
   */
  function generateMaze(opts) {
    const rows = oddSize(opts.rows);
    const cols = oddSize(opts.cols);
    const baseSeed = opts.seed !== undefined ? opts.seed >>> 0 : RNG.randomSeed();
    const loopFactor = opts.loopFactor !== undefined ? opts.loopFactor : 0.1;
    const mud = opts.mud !== undefined ? opts.mud : 0.08;
    const water = opts.water !== undefined ? opts.water : 0.04;

    for (let attempt = 0; attempt < 50; attempt++) {
      const seed = (baseSeed + attempt) >>> 0;
      const rng = new RNG(seed);
      const grid = new Grid(rows, cols, TILE.WALL);
      carvePerfectMaze(grid, rng);
      braid(grid, rng, loopFactor);

      const start = grid.index(1, 1);
      const goal = grid.index(rows - 2, cols - 2);
      const protectedSet = new Set([start, goal]);
      paintTerrain(grid, rng, TILE.MUD, mud, protectedSet);
      paintTerrain(grid, rng, TILE.WATER, water, protectedSet);

      // Solvability check: every open cell must be reachable from the start.
      const dist = distanceMap(grid, start);
      let ok = dist[goal] !== -1;
      for (let i = 0; ok && i < grid.size; i++) {
        if (grid.tiles[i] !== TILE.WALL && dist[i] === -1) ok = false;
      }
      if (ok) return { grid, start, goal, seed, rng };
    }
    throw new Error('Could not generate a solvable maze');
  }

  ADE.generateMaze = generateMaze;
  ADE.distanceMap = distanceMap;
})(globalThis.ADE = globalThis.ADE || {});
