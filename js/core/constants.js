/**
 * constants.js
 * Shared constants: tile types, terrain movement costs and grid directions.
 *
 * Every script in this project attaches itself to a single global
 * namespace object, ADE ("AI Dungeon Escape"). Plain <script> tags are used
 * instead of ES modules so the game also works when index.html is opened
 * directly, and so the algorithm files can be unit-tested with Node.
 */
(function (ADE) {
  'use strict';

  /** Tile types stored in the grid. */
  const TILE = Object.freeze({
    FLOOR: 0,
    WALL: 1,
    MUD: 2,
    WATER: 3,
  });

  /**
   * Cost of ENTERING a tile. Walls are impassable (Infinity).
   * Every walkable tile costs at least 1, which is what keeps the
   * Manhattan-distance heuristic admissible on weighted terrain.
   */
  const TERRAIN_COST = Object.freeze({
    [TILE.FLOOR]: 1,
    [TILE.WALL]: Infinity,
    [TILE.MUD]: 3,
    [TILE.WATER]: 5,
  });

  const TERRAIN_NAME = Object.freeze({
    [TILE.FLOOR]: 'Stone floor',
    [TILE.WALL]: 'Wall',
    [TILE.MUD]: 'Mud',
    [TILE.WATER]: 'Deep water',
  });

  /**
   * Four-directional movement. The order (Up, Right, Down, Left) is fixed
   * so every algorithm expands neighbours in the same, reproducible order.
   */
  const DIRS = Object.freeze([
    Object.freeze({ dr: -1, dc: 0, name: 'up' }),
    Object.freeze({ dr: 0, dc: 1, name: 'right' }),
    Object.freeze({ dr: 1, dc: 0, name: 'down' }),
    Object.freeze({ dr: 0, dc: -1, name: 'left' }),
  ]);

  ADE.TILE = TILE;
  ADE.TERRAIN_COST = TERRAIN_COST;
  ADE.TERRAIN_NAME = TERRAIN_NAME;
  ADE.DIRS = DIRS;
})(globalThis.ADE = globalThis.ADE || {});
