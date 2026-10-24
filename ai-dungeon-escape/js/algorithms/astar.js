/**
 * astar.js — A* Search
 *
 * Frontier: min-priority queue ordered by f(n) = g(n) + h(n)
 *   g(n) = exact cost from the start to n (terrain weights included)
 *   h(n) = Manhattan distance from n to the goal
 *
 * Why the result is optimal: every step costs at least 1 and a 4-directional
 * move changes the Manhattan distance by exactly 1, so h never
 * over-estimates (admissible) and h(n) <= cost(n, n') + h(n') (consistent).
 * With a consistent heuristic a node's g is final when it is expanded, so a
 * closed set is safe and the first expansion of the goal is a cheapest path.
 *
 * Ties on f are broken by the smaller h (prefer nodes nearer the goal),
 * then by insertion order. This does not affect optimality.
 *
 * Complete: yes   Optimal: yes (minimum cost)
 */
(function (ADE) {
  'use strict';

  const { makeResult, validateEndpoints } = ADE.searchCommon;
  const MinHeap = ADE.MinHeap;

  function astar(grid, start, goal) {
    validateEndpoints(grid, start, goal);
    const n = grid.size;
    const parent = new Int32Array(n).fill(-1);
    const closed = new Uint8Array(n);
    const g = new Float64Array(n).fill(Infinity);
    const nb = new Int32Array(4);
    const explored = [];
    const open = new MinHeap();
    let maxFrontier = 0;

    if (!grid.isWalkableIndex(start)) {
      return makeResult('astar', grid, start, goal, false, parent, explored, 0);
    }

    g[start] = 0;
    const h0 = grid.manhattan(start, goal);
    open.push(start, h0, h0);
    maxFrontier = 1;

    while (!open.isEmpty()) {
      const { value: cur } = open.pop();
      if (closed[cur]) continue; // stale entry
      closed[cur] = 1;
      explored.push(cur);
      if (cur === goal) {
        return makeResult('astar', grid, start, goal, true, parent, explored, maxFrontier);
      }
      const k = grid.neighbors(cur, nb);
      for (let i = 0; i < k; i++) {
        const next = nb[i];
        if (closed[next]) continue;
        const newG = g[cur] + grid.cost(next);
        if (newG < g[next]) {
          g[next] = newG;
          parent[next] = cur;
          const h = grid.manhattan(next, goal);
          open.push(next, newG + h, h); // f = g + h, tie-break on h
        }
      }
      if (open.size > maxFrontier) maxFrontier = open.size;
    }
    return makeResult('astar', grid, start, goal, false, parent, explored, maxFrontier);
  }

  ADE.algorithms = ADE.algorithms || {};
  ADE.algorithms.astar = astar;
})(globalThis.ADE = globalThis.ADE || {});
