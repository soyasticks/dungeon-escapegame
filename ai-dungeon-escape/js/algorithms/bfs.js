/**
 * bfs.js — Breadth-First Search
 *
 * Frontier: FIFO queue.
 * Explores the maze in "rings" of equal step-distance from the start, so
 * the first time the goal is expanded the path has the FEWEST MOVES.
 * It ignores terrain cost, so on weighted terrain its path may be costly.
 *
 * Complete: yes   Optimal: yes for unweighted grids (step count)
 * Time / space: O(V + E) on a grid (V cells, E <= 4V edges)
 */
(function (ADE) {
  'use strict';

  const { makeResult, validateEndpoints } = ADE.searchCommon;

  function bfs(grid, start, goal) {
    validateEndpoints(grid, start, goal);
    const n = grid.size;
    const parent = new Int32Array(n).fill(-1);
    const visited = new Uint8Array(n); // marked when a cell is first ADDED to the queue
    const queue = new Int32Array(n); // each cell is enqueued at most once
    const nb = new Int32Array(4);
    const explored = [];
    let head = 0;
    let tail = 0;
    let maxFrontier = 1;

    if (!grid.isWalkableIndex(start)) {
      return makeResult('bfs', grid, start, goal, false, parent, explored, 0);
    }

    queue[tail++] = start;
    visited[start] = 1;

    while (head < tail) {
      const cur = queue[head++]; // dequeue (FIFO)
      explored.push(cur);
      if (cur === goal) {
        return makeResult('bfs', grid, start, goal, true, parent, explored, maxFrontier);
      }
      const k = grid.neighbors(cur, nb);
      for (let i = 0; i < k; i++) {
        const next = nb[i];
        if (!visited[next]) {
          visited[next] = 1;
          parent[next] = cur;
          queue[tail++] = next;
        }
      }
      if (tail - head > maxFrontier) maxFrontier = tail - head;
    }
    return makeResult('bfs', grid, start, goal, false, parent, explored, maxFrontier);
  }

  ADE.algorithms = ADE.algorithms || {};
  ADE.algorithms.bfs = bfs;
})(globalThis.ADE = globalThis.ADE || {});
