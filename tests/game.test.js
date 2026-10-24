/**
 * game.test.js
 * Run with:  node tests/game.test.js
 *
 * Headless simulation of the game logic (no DOM). A bot player uses A* to
 * collect every key and reach the exit on all three levels while the test
 * checks, every frame, that neither the player nor any enemy is ever on a
 * wall and that every move is to an orthogonally adjacent tile.
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
  'game/levels.js',
  'game/entities.js',
  'game/game.js',
  'lab/labRunner.js',
].forEach((f) => require(path.join(root, f)));

const ADE = globalThis.ADE;
let passed = 0;
let failed = 0;
function check(cond, msg) {
  if (cond) passed++;
  else {
    failed++;
    if (failed <= 25) console.error('  FAIL: ' + msg);
  }
}

/** Bot: A* toward the nearest remaining key, then toward the exit. */
function makeBot(game) {
  let goal = -1;
  return {
    direction() {
      const g = game.grid;
      const p = game.player.cell;
      let target = game.exit;
      if (!game.exitOpen) {
        // Commit to one key until it is collected (avoids flip-flopping).
        const item = game.items.get(goal);
        if (!item || item.type !== 'key') {
          let best = Infinity;
          for (const [cell, it] of game.items) {
            if (it.type !== 'key') continue;
            const d = g.manhattan(p, cell);
            if (d < best) {
              best = d;
              goal = cell;
            }
          }
        }
        target = goal;
      }
      const res = ADE.algorithms.astar(g, p, target);
      if (!res.found || res.path.length < 2) return null;
      const next = res.path[1];
      const dr = g.row(next) - g.row(p);
      const dc = g.col(next) - g.col(p);
      return ADE.DIRS.find((d) => d.dr === dr && d.dc === dc);
    },
  };
}

function checkFrame(game, prev) {
  const g = game.grid;
  const all = [game.player, ...game.enemies];
  all.forEach((e, k) => {
    check(g.isWalkableIndex(e.cell), `entity ${k} on a wall at cell ${e.cell}`);
    check(g.isWalkableIndex(e.from), `entity ${k} came from a wall`);
    if (e.cell !== e.from) check(g.manhattan(e.cell, e.from) === 1, `entity ${k} made a non-adjacent step`);
    if (prev[k] !== undefined && prev[k] !== e.cell) {
      check(g.manhattan(prev[k], e.cell) === 1, `entity ${k} jumped ${prev[k]} -> ${e.cell}`);
    }
    prev[k] = e.cell;
  });
}

console.log('Level setup invariants (30 random games)');
for (let n = 0; n < 30; n++) {
  const game = new ADE.Game();
  game.startNewGame();
  for (let L = 0; L < ADE.LEVELS.length; L++) {
    game.loadLevel(L, 5);
    const g = game.grid;
    const dist = ADE.distanceMap(g, game.start);
    const cfg = ADE.LEVELS[L];
    const keys = [...game.items.values()].filter((i) => i.type === 'key').length;
    check(keys === cfg.keys, `level ${L + 1} has ${cfg.keys} keys (got ${keys})`);
    for (const cell of game.items.keys()) {
      check(g.isWalkableIndex(cell) && dist[cell] > 0, 'item placed on reachable floor');
      check(cell !== game.exit && cell !== game.start, 'item not on start/exit');
    }
    check(dist[game.exit] > 0, 'exit reachable');
    check(game.enemies.length === cfg.enemies.length, 'enemy count');
    for (const e of game.enemies) {
      check(g.isWalkableIndex(e.cell), 'enemy spawned on floor');
      check(dist[e.cell] >= 6, `enemy spawned away from player (dist ${dist[e.cell]})`);
    }
    for (const t of game.traps) check(g.isWalkableIndex(t.cell) && !game.items.has(t.cell), 'trap on free floor');
    const cells = new Set([...game.items.keys(), ...game.enemies.map((e) => e.cell), ...game.traps.map((t) => t.cell)]);
    check(cells.size === game.items.size + game.enemies.length + game.traps.length, 'no two objects share a tile');
  }
}

console.log('Bot plays through all 3 levels (invulnerable run, 10 games)');
let victories = 0;
let enemyPlans = 0;
let huntsSeen = 0;
for (let n = 0; n < 10; n++) {
  const game = new ADE.Game();
  game.startNewGame();
  const bot = makeBot(game);
  const prev = [];
  let lastLevel = 0;
  const dt = 1 / 60;
  for (let frame = 0; frame < 60 * 60 * 6 && game.state !== 'victory'; frame++) {
    game.player.health = 5; // keep the bot alive to test progression
    game.update(dt, bot);
    if (game.state === 'levelComplete') {
      game.nextLevel();
      prev.length = 0;
      continue;
    }
    if (game.levelIndex !== lastLevel) {
      lastLevel = game.levelIndex;
      prev.length = 0;
    }
    checkFrame(game, prev);
    for (const e of game.enemies) if (e.hunting) huntsSeen++;
  }
  enemyPlans += [].concat(game.enemies).reduce((s, e) => s + e.plans, 0);
  if (game.state === 'victory') victories++;
  check(game.state === 'victory', `game ${n} reached victory (state ${game.state}, level ${game.levelIndex + 1})`);
  check(game.score > 0, 'score increased');
}
check(enemyPlans > 0, 'enemies ran their search algorithms');
check(huntsSeen > 0, 'enemies switched to hunting the player');
console.log(`  victories: ${victories}/10, enemy plans on final levels: ${enemyPlans}`);

console.log('Damage, game over, restart, pause');
{
  const game = new ADE.Game();
  game.startNewGame();
  const idle = { direction: () => null };
  let frames = 0;
  // Stand still on level 1: enemies or traps must eventually hurt the player.
  game.loadLevel(2, 5); // level 3 has the most enemies
  const scoreBefore = game.score;
  while (game.state === 'playing' && frames < 60 * 600) {
    game.update(1 / 60, idle);
    frames++;
  }
  check(game.state === 'gameOver', `idle player is eventually defeated (state ${game.state} after ${(frames / 60).toFixed(0)}s)`);
  game.restartLevel();
  check(game.state === 'playing' && game.player.health === 5 && game.score === scoreBefore, 'restart restores level-start health and score');
  game.pause();
  const t = game.levelTime;
  game.update(1, idle);
  check(game.state === 'paused' && game.levelTime === t, 'paused game does not advance');
  game.resume();
  game.update(0.1, idle);
  check(game.levelTime > t, 'resumed game advances');
}

console.log('Exit stays locked until all keys are collected');
{
  const game = new ADE.Game();
  game.startNewGame();
  game.onPlayerArrive(game.exit);
  check(game.state === 'playing', 'locked gate does not end the level');
  game.keysCollected = game.keysNeeded;
  game.onPlayerArrive(game.exit);
  check(game.state === 'levelComplete', 'open gate completes the level');
}

console.log('Lab benchmark produces real metrics');
{
  const m = ADE.generateMaze({ rows: 21, cols: 31, seed: 123, loopFactor: 0.15, mud: 0.12, water: 0.06 });
  const rows = ADE.lab.runAll(m.grid, m.start, m.goal, { minTimeMs: 10 });
  check(rows.length === 5, 'five rows');
  for (const r of rows) {
    check(r.reps >= 5 && r.timeMs > 0 && Number.isFinite(r.timeMs), `${r.info.short} measured time ${r.timeMs}`);
    const fresh = ADE.runSearch(r.id, m.grid, m.start, m.goal);
    check(fresh.nodesExpanded === r.result.nodesExpanded && fresh.totalCost === r.result.totalCost, `${r.info.short} metrics reproducible`);
  }
  check(rows.find((r) => r.id === 'astar').isCostOptimal && rows.find((r) => r.id === 'ucs').isCostOptimal, 'A* and UCS flagged optimal');
  const csv = ADE.lab.toCSV(rows, { rows: 21, cols: 31, seed: 123, start: '1 1', goal: '19 29' });
  check(csv.split('\n').length === 7, 'CSV has header + 5 rows');
  console.log('  sample (seed 123, 21x31):');
  for (const r of rows) {
    console.log(
      `   ${r.info.short.padEnd(5)} expanded ${String(r.result.nodesExpanded).padStart(4)}  steps ${String(r.result.pathLength).padStart(3)}  cost ${String(r.result.totalCost).padStart(3)}  ${r.timeMs.toFixed(4)} ms x${r.reps}`
    );
  }
}

console.log(`\n${passed} checks passed, ${failed} failed.`);
process.exit(failed ? 1 : 0);
