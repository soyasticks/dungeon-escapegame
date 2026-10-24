/**
 * algorithms.test.js
 * Run with:  node tests/algorithms.test.js
 *
 * Checks the five search algorithms and the maze generator against
 * independent reference implementations on hundreds of random mazes.
 * No test framework needed.
 */
'use strict';

const path = require('path');
const root = path.join(__dirname, '..', 'js');
[
  'core/constants.js',
  'core/rng.js',
  'core/priorityQueue.js',
  'core/grid.js',
  'algorithms/common.js',
  'algorithms/bfs.js',
  'algorithms/dfs.js',
  'algorithms/ucs.js',
  'algorithms/greedy.js',
  'algorithms/astar.js',
  'algorithms/registry.js',
  'maze/mazeGenerator.js',
].forEach((f) => require(path.join(root, f)));

const ADE = globalThis.ADE;
const { TILE, Grid, MinHeap, generateMaze, runSearch, ALGORITHMS } = ADE;

let passed = 0;
let failed = 0;
function check(cond, msg) {
  if (cond) passed++;
  else {
    failed++;
    if (failed <= 25) console.error('  FAIL: ' + msg);
  }
}

/* ---------- Reference implementations (deliberately naive) ---------- */

/** Minimum path cost by repeated relaxation (Bellman-Ford). O(V*E), no heap. */
function referenceMinCost(grid, start, goal, unit) {
  const dist = new Array(grid.size).fill(Infinity);
  dist[start] = 0;
  const nb = new Int32Array(4);
  let changed = true;
  while (changed) {
    changed = false;
    for (let i = 0; i < grid.size; i++) {
      if (dist[i] === Infinity || !grid.isWalkableIndex(i)) continue;
      const k = grid.neighbors(i, nb);
      for (let j = 0; j < k; j++) {
        const w = unit ? 1 : grid.cost(nb[j]);
        if (dist[i] + w < dist[nb[j]]) {
          dist[nb[j]] = dist[i] + w;
          changed = true;
        }
      }
    }
  }
  return dist[goal];
}

/** A path must start/end correctly, move one orthogonal step at a time, never cross walls. */
function validPath(grid, p, start, goal) {
  if (p.length === 0) return false;
  if (p[0] !== start || p[p.length - 1] !== goal) return false;
  const seen = new Set();
  for (let i = 0; i < p.length; i++) {
    if (!grid.isWalkableIndex(p[i])) return false;
    if (seen.has(p[i])) return false; // no repeated cells
    seen.add(p[i]);
    if (i > 0 && grid.manhattan(p[i - 1], p[i]) !== 1) return false;
  }
  return true;
}

/* ---------- Tests ---------- */

console.log('MinHeap ordering');
{
  const h = new MinHeap();
  const vals = [5, 3, 9, 1, 7, 3, 2, 8, 6, 4, 0];
  vals.forEach((v, i) => h.push(i, v));
  const out = [];
  while (!h.isEmpty()) out.push(h.pop().priority);
  check(JSON.stringify(out) === JSON.stringify([...vals].sort((a, b) => a - b)), 'heap pops in sorted order');
  const t = new MinHeap();
  t.push('a', 1, 5);
  t.push('b', 1, 2);
  t.push('c', 1, 2);
  check(t.pop().value === 'b' && t.pop().value === 'c' && t.pop().value === 'a', 'tie-break then FIFO');
}

console.log('Hand-made grid with known answers');
{
  // S at (1,1), G at (1,5). Direct route crosses water (cost 5) at (1,3);
  // the detour through row 3 is 6 steps of cost 1.
  const layout = [
    '#######',
    '#S.W.G#',
    '#.###.#',
    '#.....#',
    '#######',
  ];
  const g = new Grid(layout.length, layout[0].length);
  let s = -1;
  let goal = -1;
  layout.forEach((row, r) =>
    [...row].forEach((ch, c) => {
      const t = ch === '#' ? TILE.WALL : ch === 'W' ? TILE.WATER : TILE.FLOOR;
      g.set(r, c, t);
      if (ch === 'S') s = g.index(r, c);
      if (ch === 'G') goal = g.index(r, c);
    })
  );
  const bfs = runSearch('bfs', g, s, goal);
  check(bfs.pathLength === 4 && bfs.totalCost === 8, 'BFS takes 4 steps through water (cost 8), got ' + bfs.pathLength + '/' + bfs.totalCost);
  const ucs = runSearch('ucs', g, s, goal);
  check(ucs.totalCost === 8 && ucs.pathLength === 4, 'UCS: water route cost 1+5+1+1=8 vs detour 8 — equal cost ' + ucs.totalCost);
  const astar = runSearch('astar', g, s, goal);
  check(astar.totalCost === ucs.totalCost, 'A* cost equals UCS cost on hand grid');
  // Make water deeper by blocking with a second water cell -> detour must win.
  g.set(1, 2, TILE.WATER);
  const ucs2 = runSearch('ucs', g, s, goal);
  check(ucs2.totalCost === 8 && ucs2.pathLength === 8, 'UCS avoids two water tiles (detour cost 8, 8 steps), got ' + ucs2.pathLength + '/' + ucs2.totalCost);
  const bfs2 = runSearch('bfs', g, s, goal);
  check(bfs2.pathLength === 4 && bfs2.totalCost === 12, 'BFS still takes the 4-step water route (cost 12), got ' + bfs2.totalCost);
  // Unreachable goal
  g.set(1, 4, TILE.WALL);
  g.set(2, 5, TILE.WALL);
  for (const a of ALGORITHMS) {
    const r = runSearch(a.id, g, s, goal);
    check(!r.found && r.path.length === 0, a.short + ' reports no path when goal is walled off');
  }
}

console.log('Random mazes vs reference implementations');
const sizes = [
  [11, 11],
  [15, 21],
  [21, 31],
  [29, 41],
];
let mazes = 0;
for (let seed = 1; seed <= 120; seed++) {
  const [rows, cols] = sizes[seed % sizes.length];
  const loop = (seed % 5) * 0.05;
  const m = generateMaze({ rows, cols, seed: seed * 7919, loopFactor: loop, mud: 0.1, water: 0.05 });
  mazes++;
  const { grid } = m;
  // pick random start/goal pairs as well as the default corners
  const cells = grid.walkableCells();
  const pairs = [[m.start, m.goal]];
  const rng = new ADE.RNG(seed);
  for (let k = 0; k < 2; k++) pairs.push([rng.pick(cells), rng.pick(cells)]);

  for (const [s, g] of pairs) {
    const minCost = referenceMinCost(grid, s, g, false);
    const minSteps = referenceMinCost(grid, s, g, true);
    const res = {};
    for (const a of ALGORITHMS) {
      const r = runSearch(a.id, grid, s, g);
      res[a.id] = r;
      check(r.found, `${a.short} finds a path (seed ${seed})`);
      check(validPath(grid, r.path, s, g), `${a.short} path is valid & wall-free (seed ${seed})`);
      check(r.pathLength === r.path.length - 1, `${a.short} pathLength consistent`);
      check(r.nodesExpanded === r.explored.length, `${a.short} nodesExpanded == explored.length`);
      check(new Set(r.explored).size === r.explored.length, `${a.short} never expands a cell twice`);
      check(r.explored[r.explored.length - 1] === g, `${a.short} last expanded node is the goal`);
    }
    check(res.bfs.pathLength === minSteps, `BFS gives fewest steps ${res.bfs.pathLength} vs ${minSteps} (seed ${seed})`);
    check(res.ucs.totalCost === minCost, `UCS optimal cost ${res.ucs.totalCost} vs ${minCost} (seed ${seed})`);
    check(res.astar.totalCost === minCost, `A* optimal cost ${res.astar.totalCost} vs ${minCost} (seed ${seed})`);
    check(res.astar.nodesExpanded <= res.ucs.nodesExpanded, `A* expands no more than UCS (${res.astar.nodesExpanded} vs ${res.ucs.nodesExpanded}, seed ${seed})`);
    check(res.dfs.totalCost >= minCost && res.greedy.totalCost >= minCost, 'non-optimal algorithms never beat the optimum');
  }

  // generator guarantees
  check(grid.rows % 2 === 1 && grid.cols % 2 === 1, 'odd dimensions');
  let borderOk = true;
  for (let r = 0; r < grid.rows; r++)
    for (let c = 0; c < grid.cols; c++)
      if ((r === 0 || c === 0 || r === grid.rows - 1 || c === grid.cols - 1) && grid.get(r, c) !== TILE.WALL) borderOk = false;
  check(borderOk, 'outer border is solid wall');
  const dist = ADE.distanceMap(grid, m.start);
  check(cells.every((i) => dist[i] >= 0), 'every open cell reachable (seed ' + seed + ')');
}

console.log('Determinism: same seed gives same maze');
{
  const a = generateMaze({ rows: 21, cols: 31, seed: 42 });
  const b = generateMaze({ rows: 21, cols: 31, seed: 42 });
  check(Buffer.from(a.grid.tiles).equals(Buffer.from(b.grid.tiles)), 'identical tiles for identical seed');
}

console.log(`\n${mazes} random mazes tested.`);
console.log(`${passed} checks passed, ${failed} failed.`);
process.exit(failed ? 1 : 0);
