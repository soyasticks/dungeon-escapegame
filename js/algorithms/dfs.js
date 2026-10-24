/**
 * dfs.js — Depth-First Search
 *
 * Frontier: LIFO stack (iterative, so large mazes cannot overflow the call stack).
 * Always dives down the most recently discovered branch until it hits a
 * dead end, then backtracks. It finds *a* path, not necessarily a short one.
 *
 * Implementation notes:
 *   - A cell is marked visited when it is POPPED (expanded). A cell may be
 *     pushed more than once; stale copies are skipped when popped.
 *   - Each stack entry remembers which cell pushed it, so the parent pointer
 *     reflects the branch DFS actually followed.
 *   - Neighbours are pushed in reverse order so they are expanded in the
 *     usual Up, Right, Down, Left order.
 *
 * Complete: yes on a finite grid with a visited set   Optimal: no
 * Time: O(V + E)   Space: O(V) in the worst case
 */
(function (ADE) {
  'use strict';

  const { makeResult, validateEndpoints } = ADE.searchCommon;

  function dfs(grid, start, goal) {
    validateEndpoints(grid, start, goal);
    const n = grid.size;
    const parent = new Int32Array(n).fill(-1);
    const closed = new Uint8Array(n);
    const nb = new Int32Array(4);
    const explored = [];
    const stackCell = [];
    const stackFrom = [];
    let maxFrontier = 0;

    if (!grid.isWalkableIndex(start)) {
      return makeResult('dfs', grid, start, goal, false, parent, explored, 0);
    }

    stackCell.push(start);
    stackFrom.push(-1);
    maxFrontier = 1;

    while (stackCell.length > 0) {
      const cur = stackCell.pop(); // LIFO
      const from = stackFrom.pop();
      if (closed[cur]) continue; // stale duplicate
      closed[cur] = 1;
      parent[cur] = from;
      explored.push(cur);
      if (cur === goal) {
        return makeResult('dfs', grid, start, goal, true, parent, explored, maxFrontier);
      }
      const k = grid.neighbors(cur, nb);
      for (let i = k - 1; i >= 0; i--) {
        const next = nb[i];
        if (!closed[next]) {
          stackCell.push(next);
          stackFrom.push(cur);
        }
      }
      if (stackCell.length > maxFrontier) maxFrontier = stackCell.length;
    }
    return makeResult('dfs', grid, start, goal, false, parent, explored, maxFrontier);
  }

  ADE.algorithms = ADE.algorithms || {};
  ADE.algorithms.dfs = dfs;
})(globalThis.ADE = globalThis.ADE || {});
