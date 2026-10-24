/**
 * common.js
 * Helpers shared by all five search algorithms.
 *
 * Every algorithm returns a SearchResult object with the same shape, so the
 * game and the Algorithm Lab can treat them interchangeably:
 *
 *   {
 *     algorithm:     'bfs' | 'dfs' | 'ucs' | 'greedy' | 'astar',
 *     found:         boolean,
 *     path:          number[]   cell indices from start to goal ([] if none),
 *     explored:      number[]   cells in the order they were EXPANDED,
 *     nodesExpanded: number     cells removed from the frontier and expanded,
 *     pathLength:    number     number of moves (path.length - 1),
 *     totalCost:     number     sum of terrain costs of every cell entered,
 *     maxFrontier:   number     peak size of the queue / stack / heap,
 *   }
 *
 * Conventions used by every algorithm (so the metrics are comparable):
 *   - The goal test happens when a node is EXPANDED (removed from the
 *     frontier), not when it is generated.
 *   - Neighbours are always generated in the order Up, Right, Down, Left.
 *   - Step cost = cost of the cell being entered (floor 1, mud 3, water 5).
 */
(function (ADE) {
  'use strict';

  /** Follows parent pointers back from goal to start. */
  function reconstructPath(parent, start, goal) {
    const path = [];
    let cur = goal;
    while (cur !== -1) {
      path.push(cur);
      if (cur === start) break;
      cur = parent[cur];
    }
    path.reverse();
    return path;
  }

  /** Sum of the cost of every cell entered along the path (start excluded). */
  function pathCost(grid, path) {
    let total = 0;
    for (let i = 1; i < path.length; i++) total += grid.cost(path[i]);
    return total;
  }

  /** Builds the uniform result object. */
  function makeResult(algorithm, grid, start, goal, found, parent, explored, maxFrontier) {
    const path = found ? reconstructPath(parent, start, goal) : [];
    return {
      algorithm,
      found,
      path,
      explored,
      nodesExpanded: explored.length,
      pathLength: found ? path.length - 1 : 0,
      totalCost: found ? pathCost(grid, path) : 0,
      maxFrontier,
    };
  }

  /** Throws a clear error for invalid start / goal input. */
  function validateEndpoints(grid, start, goal) {
    if (!Number.isInteger(start) || start < 0 || start >= grid.size) {
      throw new RangeError('Invalid start cell: ' + start);
    }
    if (!Number.isInteger(goal) || goal < 0 || goal >= grid.size) {
      throw new RangeError('Invalid goal cell: ' + goal);
    }
  }

  ADE.searchCommon = { reconstructPath, pathCost, makeResult, validateEndpoints };
})(globalThis.ADE = globalThis.ADE || {});
