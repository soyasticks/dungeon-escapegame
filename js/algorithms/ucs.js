/**
 * ucs.js — Uniform Cost Search (Dijkstra-style)
 *
 * Frontier: min-priority queue ordered by g(n), the cheapest known cost
 * from the start to n. The cheapest frontier node is always expanded
 * next, so when the goal is expanded its path has MINIMUM TOTAL COST,
 * taking terrain weights (floor 1, mud 3, water 5) into account.
 *
 * Uses "lazy deletion": when a cheaper route to a cell is found it is
 * pushed again; outdated heap entries are skipped when popped.
 *
 * Complete: yes (all step costs >= 1)   Optimal: yes (minimum cost)
 * Time: O(E log V) with a binary heap
 */
(function (ADE) {
  'use strict';

  const { makeResult, validateEndpoints } = ADE.searchCommon;
  const MinHeap = ADE.MinHeap;

  function ucs(grid, start, goal) {
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
      return makeResult('ucs', grid, start, goal, false, parent, explored, 0);
    }

    g[start] = 0;
    open.push(start, 0);
    maxFrontier = 1;

    while (!open.isEmpty()) {
      const { value: cur } = open.pop();
      if (closed[cur]) continue; // stale entry (lazy deletion)
      closed[cur] = 1;
      explored.push(cur);
      if (cur === goal) {
        return makeResult('ucs', grid, start, goal, true, parent, explored, maxFrontier);
      }
      const k = grid.neighbors(cur, nb);
      for (let i = 0; i < k; i++) {
        const next = nb[i];
        if (closed[next]) continue;
        const newG = g[cur] + grid.cost(next);
        if (newG < g[next]) {
          g[next] = newG;
          parent[next] = cur;
          open.push(next, newG);
        }
      }
      if (open.size > maxFrontier) maxFrontier = open.size;
    }
    return makeResult('ucs', grid, start, goal, false, parent, explored, maxFrontier);
  }

  ADE.algorithms = ADE.algorithms || {};
  ADE.algorithms.ucs = ucs;
})(globalThis.ADE = globalThis.ADE || {});
