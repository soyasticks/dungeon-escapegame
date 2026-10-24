/**
 * greedy.js — Greedy Best-First Search
 *
 * Frontier: min-priority queue ordered ONLY by the heuristic h(n), the
 * Manhattan distance from n to the goal:  h(n) = |r_n - r_goal| + |c_n - c_goal|
 *
 * It always expands whichever node *looks* closest to the goal and ignores
 * the cost already paid (g). This usually expands very few nodes, but the
 * path can be long or expensive because walls and terrain can mislead it.
 *
 * Each cell is added to the frontier at most once (first discovery wins).
 *
 * Complete: yes on a finite grid with a visited set   Optimal: no
 */
(function (ADE) {
  'use strict';

  const { makeResult, validateEndpoints } = ADE.searchCommon;
  const MinHeap = ADE.MinHeap;

  function greedy(grid, start, goal) {
    validateEndpoints(grid, start, goal);
    const n = grid.size;
    const parent = new Int32Array(n).fill(-1);
    const discovered = new Uint8Array(n);
    const nb = new Int32Array(4);
    const explored = [];
    const open = new MinHeap();
    let maxFrontier = 0;

    if (!grid.isWalkableIndex(start)) {
      return makeResult('greedy', grid, start, goal, false, parent, explored, 0);
    }

    discovered[start] = 1;
    open.push(start, grid.manhattan(start, goal));
    maxFrontier = 1;

    while (!open.isEmpty()) {
      const { value: cur } = open.pop();
      explored.push(cur);
      if (cur === goal) {
        return makeResult('greedy', grid, start, goal, true, parent, explored, maxFrontier);
      }
      const k = grid.neighbors(cur, nb);
      for (let i = 0; i < k; i++) {
        const next = nb[i];
        if (discovered[next]) continue;
        discovered[next] = 1;
        parent[next] = cur;
        open.push(next, grid.manhattan(next, goal)); // priority = h(n) only
      }
      if (open.size > maxFrontier) maxFrontier = open.size;
    }
    return makeResult('greedy', grid, start, goal, false, parent, explored, maxFrontier);
  }

  ADE.algorithms = ADE.algorithms || {};
  ADE.algorithms.greedy = greedy;
})(globalThis.ADE = globalThis.ADE || {});
