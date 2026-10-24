/**
 * levels.js
 * Configuration for the three progressively harder levels.
 *
 * Enemy fields:
 *   algo     which search algorithm the enemy uses to plan its route
 *   mode     'chase'  – hunts the player when within `aggro`, otherwise patrols
 *            'guard'  – patrols around the exit gate, hunts the player when close
 *            'wander' – roams the maze, hunts the player when within `aggro`
 *   stepTime seconds per tile on stone floor (lower = faster)
 *   aggro    Manhattan distance at which the enemy notices the player
 *   replan   seconds between re-running the search while hunting
 *   track    (optional) longest planned route it will chase; default 3 x aggro.
 *            DFS gets a larger value because its routes are long and winding.
 */
(function (ADE) {
  'use strict';

  const LEVELS = Object.freeze([
    {
      name: 'The Forgotten Cellar',
      rows: 15,
      cols: 21,
      loopFactor: 0.1,
      mud: 0.06,
      water: 0.02,
      keys: 2,
      gems: 5,
      chests: 1,
      potions: 0,
      traps: 4,
      trapPeriod: 2.6,
      trapActive: 0.9,
      enemies: [
        { algo: 'bfs', mode: 'chase', stepTime: 0.42, aggro: 8, replan: 0.6 },
        { algo: 'dfs', mode: 'wander', stepTime: 0.46, aggro: 7, replan: 1.2, track: 40 },
      ],
    },
    {
      name: 'Halls of the Lich',
      rows: 19,
      cols: 27,
      loopFactor: 0.12,
      mud: 0.1,
      water: 0.04,
      keys: 3,
      gems: 7,
      chests: 1,
      potions: 1,
      traps: 8,
      trapPeriod: 2.3,
      trapActive: 0.95,
      enemies: [
        { algo: 'bfs', mode: 'chase', stepTime: 0.37, aggro: 9, replan: 0.55 },
        { algo: 'ucs', mode: 'chase', stepTime: 0.38, aggro: 10, replan: 0.55 },
        { algo: 'greedy', mode: 'wander', stepTime: 0.35, aggro: 9, replan: 0.5 },
      ],
    },
    {
      name: 'The Abyssal Gate',
      rows: 23,
      cols: 33,
      loopFactor: 0.15,
      mud: 0.12,
      water: 0.05,
      keys: 4,
      gems: 9,
      chests: 1,
      potions: 1,
      traps: 12,
      trapPeriod: 2.0,
      trapActive: 1.0,
      enemies: [
        { algo: 'astar', mode: 'guard', stepTime: 0.31, aggro: 8, replan: 0.45 },
        { algo: 'astar', mode: 'chase', stepTime: 0.33, aggro: 12, replan: 0.45 },
        { algo: 'ucs', mode: 'chase', stepTime: 0.35, aggro: 10, replan: 0.5 },
        { algo: 'greedy', mode: 'wander', stepTime: 0.32, aggro: 9, replan: 0.45 },
        { algo: 'dfs', mode: 'wander', stepTime: 0.38, aggro: 8, replan: 1.2, track: 50 },
      ],
    },
  ]);

  const GAME_RULES = Object.freeze({
    maxHealth: 5,
    playerStepTime: 0.13,
    invulnTime: 1.4,
    enemyStunTime: 1.0,
    terrainSlowdown: 0.3, // step time multiplier = 1 + (cost - 1) * this
    score: { key: 100, gem: 50, chest: 150, potion: 25, levelClear: 500, heartBonus: 50 },
  });

  ADE.LEVELS = LEVELS;
  ADE.GAME_RULES = GAME_RULES;
})(globalThis.ADE = globalThis.ADE || {});
