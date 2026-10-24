/**
 * registry.js
 * Metadata for the five algorithms plus a single `runSearch` entry point.
 * Colors are used consistently in the game (enemy tint) and the Lab.
 */
(function (ADE) {
  'use strict';

  const ALGORITHMS = Object.freeze([
    {
      id: 'bfs',
      name: 'Breadth-First Search',
      short: 'BFS',
      color: '#4fc3f7',
      frontier: 'FIFO queue',
      priority: '—',
      complete: 'Yes',
      optimal: 'Fewest steps (unweighted)',
      enemyName: 'Seeker Wisp',
    },
    {
      id: 'dfs',
      name: 'Depth-First Search',
      short: 'DFS',
      color: '#ba68c8',
      frontier: 'LIFO stack',
      priority: '—',
      complete: 'Yes (finite grid)',
      optimal: 'No',
      enemyName: 'Wandering Shade',
    },
    {
      id: 'ucs',
      name: 'Uniform Cost Search',
      short: 'UCS',
      color: '#81c784',
      frontier: 'Priority queue',
      priority: 'g(n)',
      complete: 'Yes',
      optimal: 'Minimum cost',
      enemyName: 'Bog Crawler',
    },
    {
      id: 'greedy',
      name: 'Greedy Best-First',
      short: 'GBFS',
      color: '#ffb74d',
      frontier: 'Priority queue',
      priority: 'h(n)',
      complete: 'Yes (finite grid)',
      optimal: 'No',
      enemyName: 'Hungry Imp',
    },
    {
      id: 'astar',
      name: 'A* Search',
      short: 'A*',
      color: '#ef5350',
      frontier: 'Priority queue',
      priority: 'g(n) + h(n)',
      complete: 'Yes',
      optimal: 'Minimum cost',
      enemyName: 'Lich Hunter',
    },
  ]);

  const BY_ID = {};
  for (const a of ALGORITHMS) BY_ID[a.id] = a;

  /** Runs the named algorithm and returns its SearchResult. */
  function runSearch(id, grid, start, goal) {
    const fn = ADE.algorithms[id];
    if (typeof fn !== 'function') throw new Error('Unknown algorithm: ' + id);
    return fn(grid, start, goal);
  }

  ADE.ALGORITHMS = ALGORITHMS;
  ADE.algorithmInfo = (id) => BY_ID[id];
  ADE.runSearch = runSearch;
})(globalThis.ADE = globalThis.ADE || {});
