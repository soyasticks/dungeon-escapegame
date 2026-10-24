/**
 * entities.js
 * Player and Enemy classes.
 *
 * Both move tile-by-tile. `cell` is the logical tile the entity occupies
 * (set to the destination as soon as a step starts); `from` and `t` are only
 * used to draw smooth movement between tiles. Movement is ONLY ever started
 * onto a walkable neighbouring tile, so nothing can pass through walls.
 */
(function (ADE) {
  'use strict';

  const { GAME_RULES } = ADE;

  /** Step duration on a tile, slowed down by heavy terrain. */
  function stepDuration(grid, cell, base) {
    return base * (1 + (grid.cost(cell) - 1) * GAME_RULES.terrainSlowdown);
  }

  class Mover {
    constructor(cell) {
      this.cell = cell;
      this.from = cell;
      this.t = 1;
      this.dur = 0.1;
      this.facing = 1; // 1 = right, -1 = left (sprite flip)
    }

    get moving() {
      return this.t < 1;
    }

    /** Begins a step to `to`. Caller must have checked that `to` is a walkable neighbour. */
    startStep(grid, to, duration) {
      const dc = grid.col(to) - grid.col(this.cell);
      if (dc !== 0) this.facing = dc > 0 ? 1 : -1;
      this.from = this.cell;
      this.cell = to;
      this.t = 0;
      this.dur = duration;
    }

    /** Advances the step animation. Returns true on the frame the step completes. */
    advance(dt) {
      if (this.t >= 1) return false;
      this.t = Math.min(1, this.t + dt / this.dur);
      return this.t >= 1;
    }

    /** Tile currently "under" the entity (switches at the midpoint of a step). */
    standingCell() {
      return this.t >= 0.5 ? this.cell : this.from;
    }

    /** Fractional (row, col) for drawing. */
    renderPos(grid) {
      const fr = grid.row(this.from);
      const fc = grid.col(this.from);
      const tr = grid.row(this.cell);
      const tc = grid.col(this.cell);
      const e = this.t; // linear interpolation keeps grid movement crisp
      return { r: fr + (tr - fr) * e, c: fc + (tc - fc) * e };
    }
  }

  /** True when `a` and `b` are orthogonally adjacent walkable cells. */
  function isLegalStep(grid, a, b) {
    return grid.isWalkableIndex(b) && grid.manhattan(a, b) === 1;
  }

  class Player extends Mover {
    constructor(cell) {
      super(cell);
      this.health = GAME_RULES.maxHealth;
      this.invuln = 0;
    }

    /** Tries to step in direction {dr, dc}. Returns true if a step started. */
    tryMove(grid, dir) {
      if (this.moving || !dir) return false;
      const r = grid.row(this.cell) + dir.dr;
      const c = grid.col(this.cell) + dir.dc;
      if (dir.dc !== 0) this.facing = dir.dc > 0 ? 1 : -1;
      if (!grid.isWalkable(r, c)) return false; // wall collision
      const to = grid.index(r, c);
      this.startStep(grid, to, stepDuration(grid, to, GAME_RULES.playerStepTime));
      return true;
    }
  }

  class Enemy extends Mover {
    /**
     * @param {object} cfg  entry from LEVELS[n].enemies
     * @param {number} cell spawn cell
     * @param {number} id
     */
    constructor(cfg, cell, id) {
      super(cell);
      this.id = id;
      this.algo = cfg.algo;
      this.mode = cfg.mode;
      this.stepTime = cfg.stepTime;
      this.aggro = cfg.aggro;
      this.track = cfg.track || cfg.aggro * 3; // max route length it will chase
      this.replanInterval = cfg.replan;
      this.noticeTimer = 0;
      this.info = ADE.algorithmInfo(cfg.algo);
      this.path = []; // remaining cells to walk (excluding current)
      this.target = -1;
      this.hunting = false;
      this.replanTimer = 0;
      this.stun = 0;
      this.patrolTarget = -1;
      this.waitTimer = 0;
      this.lastPlan = null; // {expanded, length, cost, ms, target}
      this.plans = 0;
      this.bob = Math.random() * Math.PI * 2;
    }

    /** Runs this enemy's search algorithm from its cell to `target` and follows the result. */
    plan(grid, target) {
      const res = this.probe(grid, target);
      this.target = target;
      this.path = res.found ? res.path.slice(1) : [];
      this.replanTimer = this.replanInterval;
      return res;
    }

    /** Runs the search and records its statistics without changing the current path. */
    probe(grid, target) {
      const t0 = performance.now();
      const res = ADE.runSearch(this.algo, grid, this.cell, target);
      const ms = performance.now() - t0;
      this.lastPlan = {
        expanded: res.nodesExpanded,
        length: res.pathLength,
        cost: res.totalCost,
        ms,
        found: res.found,
      };
      this.plans++;
      return res;
    }

    /**
     * Decides between hunting the player and patrolling, and (re)plans.
     *
     * Noticing: the player must be within `aggro` (Manhattan). The enemy
     * then plans a route with its algorithm; it commits to the hunt only if
     * that route is at most `track` steps long. While hunting it re-plans
     * every `replan` seconds and gives up when its route grows longer than
     * `track` (the player escaped). Deciding on the algorithm's real path
     * length — not straight-line distance — stops enemies from flip-flopping
     * when the maze forces a detour away from the player.
     */
    think(game) {
      const grid = game.grid;
      const playerCell = game.player.cell;
      const alive = game.player.health > 0;

      if (this.hunting) {
        if (!alive) {
          this.hunting = false;
        } else if (this.replanTimer <= 0 || this.path.length === 0 || this.target !== playerCell && this.path.length <= 1) {
          if (playerCell !== this.cell) this.plan(grid, playerCell);
          if (!this.lastPlan.found || this.lastPlan.length > this.track) {
            this.hunting = false; // lost the trail
            this.noticeTimer = 2;
            this.path = [];
            this.patrolTarget = -1;
          }
        }
        if (this.hunting) return;
      } else if (alive && this.noticeTimer <= 0 && grid.manhattan(this.cell, playerCell) <= this.aggro) {
        this.noticeTimer = 0.75;
        const res = this.probe(grid, playerCell);
        if (res.found && res.pathLength <= this.track) {
          this.hunting = true;
          this.target = playerCell;
          this.path = res.path.slice(1);
          this.replanTimer = this.replanInterval;
          return;
        }
        // Too far around the walls — keep following the current patrol route.
      }

      // Patrol: guards circle the exit gate, others roam the whole maze.
      if (this.patrolTarget === -1 || this.patrolTarget === this.cell) {
        const near = game.cellsNearExit;
        this.patrolTarget =
          this.mode === 'guard' && near.length ? game.rng.pick(near) : game.rng.pick(game.walkable);
      }
      if ((this.path.length === 0 || this.target !== this.patrolTarget) && this.patrolTarget !== this.cell) {
        this.plan(grid, this.patrolTarget);
      }
    }

    /**
     * Another enemy stands on the next tile of our path. The search
     * algorithms only know walls and terrain, so:
     *  1. wait a moment (the other enemy usually moves on);
     *  2. then plan a detour with the same algorithm on a copy of the maze
     *     where the blocked tile is treated as a wall;
     *  3. if no detour exists (e.g. two enemies meet head-on in a dead-end
     *     corridor), a patrolling enemy picks a new destination; a hunting
     *     one backs off one tile.
     */
    resolveBlock(game, blockedCell) {
      const grid = game.grid;
      this.blockedTime = (this.blockedTime || 0) + 0.25;
      this.waitTimer = 0.25;
      if (this.blockedTime < 0.75) return;
      this.blockedTime = 0;

      const goal = this.target;
      if (goal >= 0 && goal !== blockedCell) {
        const detourGrid = grid.clone();
        detourGrid.tiles[blockedCell] = ADE.TILE.WALL;
        this.plan(detourGrid, goal);
        if (this.lastPlan.found) return;
      }
      this.path = [];
      if (!this.hunting) {
        this.patrolTarget = game.rng.pick(game.walkable); // go somewhere else
        this.target = -1;
        return;
      }
      const nb = new Int32Array(4);
      const k = grid.neighbors(this.cell, nb);
      const free = [];
      for (let i = 0; i < k; i++) if (!game.isEnemyBlocking(nb[i], this)) free.push(nb[i]);
      if (free.length) {
        const step = game.rng.pick(free);
        this.startStep(grid, step, stepDuration(grid, step, this.stepTime));
      }
    }

    update(dt, game) {
      const grid = game.grid;
      this.advance(dt);
      if (this.stun > 0) {
        this.stun -= dt;
        return;
      }
      this.replanTimer -= dt;
      this.noticeTimer -= dt;
      if (this.moving) return;

      this.think(game);

      if (this.waitTimer > 0) {
        this.waitTimer -= dt;
        return;
      }
      if (this.path.length === 0) return;

      const next = this.path[0];
      if (!isLegalStep(grid, this.cell, next)) {
        // Path no longer starts next to us (should not happen) — replan next tick.
        this.path = [];
        return;
      }
      if (game.isEnemyBlocking(next, this)) {
        this.resolveBlock(game, next);
        return;
      }
      this.blockedTime = 0;
      this.path.shift();
      this.startStep(grid, next, stepDuration(grid, next, this.stepTime));
    }
  }

  ADE.Player = Player;
  ADE.Enemy = Enemy;
  ADE.stepDuration = stepDuration;
})(globalThis.ADE = globalThis.ADE || {});
