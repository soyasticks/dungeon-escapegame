/**
 * labRunner.js
 * Runs the five algorithms on the same maze and measures them honestly.
 *
 * Metrics (all computed from the real run, nothing estimated):
 *   nodesExpanded  cells removed from the frontier and expanded
 *   pathLength     moves in the returned path
 *   totalCost      sum of terrain costs along the path
 *   maxFrontier    peak size of the queue / stack / heap
 *   timeMs         MEAN wall-clock time of one complete search.
 *
 * Why a mean: a single search on a small maze takes microseconds, and
 * browsers deliberately coarsen performance.now() (to ~0.1 ms or 5 µs
 * depending on the browser) for security. So each algorithm is first run
 * twice as warm-up (JIT compilation), then repeatedly until at least
 * `minTimeMs` of total time has elapsed (between minReps and maxReps runs),
 * and the total is divided by the number of runs. The number of runs is
 * reported alongside the time.
 */
(function (ADE) {
  'use strict';

  const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

  /**
   * @returns {{result: object, timeMs: number, reps: number, totalMs: number}}
   */
  function benchmark(id, grid, start, goal, opts = {}) {
    const minTimeMs = opts.minTimeMs !== undefined ? opts.minTimeMs : 25;
    const minReps = opts.minReps !== undefined ? opts.minReps : 5;
    const maxReps = opts.maxReps !== undefined ? opts.maxReps : 2000;

    // Warm-up runs (not timed) so JIT compilation does not dominate.
    let result = ADE.runSearch(id, grid, start, goal);
    ADE.runSearch(id, grid, start, goal);

    let reps = 0;
    const t0 = now();
    let elapsed = 0;
    while (reps < minReps || (elapsed < minTimeMs && reps < maxReps)) {
      result = ADE.runSearch(id, grid, start, goal);
      reps++;
      elapsed = now() - t0;
    }
    return { result, timeMs: elapsed / reps, reps, totalMs: elapsed };
  }

  /**
   * Runs every algorithm in ADE.ALGORITHMS on the same maze.
   * @returns {Array<{id, info, result, timeMs, reps, optimalCost, isCostOptimal, isStepOptimal}>}
   */
  function runAll(grid, start, goal, opts) {
    const rows = ADE.ALGORITHMS.map((info) => {
      const b = benchmark(info.id, grid, start, goal, opts);
      return { id: info.id, info, ...b };
    });
    // Reference optima taken from the algorithms proven optimal for each measure.
    const ucs = rows.find((r) => r.id === 'ucs');
    const bfs = rows.find((r) => r.id === 'bfs');
    const optimalCost = ucs && ucs.result.found ? ucs.result.totalCost : null;
    const minSteps = bfs && bfs.result.found ? bfs.result.pathLength : null;
    for (const r of rows) {
      r.optimalCost = optimalCost;
      r.isCostOptimal = r.result.found && optimalCost !== null && r.result.totalCost === optimalCost;
      r.isStepOptimal = r.result.found && minSteps !== null && r.result.pathLength === minSteps;
    }
    return rows;
  }

  /** CSV text of a results table (for the project report). */
  function toCSV(rows, meta) {
    const head = [
      'algorithm',
      'found',
      'time_ms_mean',
      'timed_runs',
      'nodes_expanded',
      'path_length_steps',
      'total_cost',
      'peak_frontier',
      'cost_optimal',
    ];
    const lines = [
      `# maze ${meta.rows}x${meta.cols}, seed ${meta.seed}, start (${meta.start}), goal (${meta.goal})`,
      head.join(','),
    ];
    for (const r of rows) {
      lines.push(
        [
          r.info.short,
          r.result.found,
          r.timeMs.toFixed(5),
          r.reps,
          r.result.nodesExpanded,
          r.result.pathLength,
          r.result.totalCost,
          r.result.maxFrontier,
          r.isCostOptimal,
        ].join(',')
      );
    }
    return lines.join('\n');
  }

  ADE.lab = { benchmark, runAll, toCSV };
})(globalThis.ADE = globalThis.ADE || {});
