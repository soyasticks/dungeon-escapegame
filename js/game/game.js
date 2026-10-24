/**
 * game.js
 * Core game logic: level setup, the update loop, collisions, pickups,
 * traps, scoring and the game state machine. No DOM or drawing code here.
 *
 * States: 'idle' → 'playing' ⇄ 'paused'
 *                  'playing' → 'levelComplete' → 'playing' (next level)
 *                  'playing' → 'gameOver' | 'victory'
 *
 * The UI listens for events via game.on(type, handler):
 *   'state'    (state)          state machine changed
 *   'pickup'   ({type, points}) item collected
 *   'damage'   ({source})       player was hurt
 *   'message'  (text)           short status message to show
 *   'step'     ({tile})         player started a step (tile = terrain type)
 *   'alert'    ({enemy})        an enemy started hunting the player
 *   'gateOpen' ()               the last key was collected
 *   'gateLocked' ()             player stepped on the gate without all keys
 */
(function (ADE) {
  'use strict';

  const { LEVELS, GAME_RULES, Player, Enemy, generateMaze, distanceMap, RNG } = ADE;

  class Game {
    constructor() {
      this.state = 'idle';
      this.levelIndex = 0;
      this.score = 0;
      this.listeners = {};
      this.effects = []; // floating text / particles for the renderer
      this.shake = 0;
      this.showPaths = true;
      this.levelSeeds = [];
      this.resetCounters();
    }

    resetCounters() {
      this.levelTime = 0;
      this.totalTime = 0;
      this.time = 0;
    }

    /* ---------------- events ---------------- */

    on(type, fn) {
      (this.listeners[type] = this.listeners[type] || []).push(fn);
    }

    emit(type, data) {
      (this.listeners[type] || []).forEach((fn) => fn(data));
    }

    setState(s) {
      this.state = s;
      this.emit('state', s);
    }

    /* ---------------- lifecycle ---------------- */

    startNewGame() {
      this.score = 0;
      this.totalTime = 0;
      this.levelSeeds = LEVELS.map(() => RNG.randomSeed());
      this.loadLevel(0, GAME_RULES.maxHealth);
    }

    /** Reloads the current level with the same maze. Score is restored to what it was on entry. */
    restartLevel() {
      this.score = this.scoreAtLevelStart;
      this.loadLevel(this.levelIndex, this.healthAtLevelStart);
    }

    nextLevel() {
      if (this.levelIndex + 1 < LEVELS.length) {
        this.loadLevel(this.levelIndex + 1, this.player.health);
      }
    }

    pause() {
      if (this.state === 'playing') this.setState('paused');
    }

    resume() {
      if (this.state === 'paused') this.setState('playing');
    }

    togglePause() {
      if (this.state === 'playing') this.pause();
      else if (this.state === 'paused') this.resume();
    }

    /* ---------------- level construction ---------------- */

    loadLevel(index, health) {
      const cfg = LEVELS[index];
      this.levelIndex = index;
      this.cfg = cfg;
      this.scoreAtLevelStart = this.score;
      this.healthAtLevelStart = health;

      const maze = generateMaze({
        rows: cfg.rows,
        cols: cfg.cols,
        seed: this.levelSeeds[index],
        loopFactor: cfg.loopFactor,
        mud: cfg.mud,
        water: cfg.water,
      });
      this.seed = maze.seed;
      this.grid = maze.grid;
      this.start = maze.start;
      this.exit = maze.goal;
      this.rng = new RNG(maze.seed ^ 0x9e3779b9); // separate stream for object placement

      const grid = this.grid;
      this.walkable = grid.walkableCells();
      this.distFromStart = distanceMap(grid, this.start);
      const exitDist = distanceMap(grid, this.exit);
      this.cellsNearExit = this.walkable.filter((i) => exitDist[i] >= 1 && exitDist[i] <= 5);

      this.player = new Player(this.start);
      this.player.health = health;
      this.items = new Map(); // cell -> {type}
      this.traps = []; // {cell, phase}
      this.trapCells = new Map();
      this.keysNeeded = cfg.keys;
      this.keysCollected = 0;
      this.levelTime = 0;
      this.effects = [];
      this.exitHintTimer = 0;

      const occupied = new Set([this.start, this.exit]);
      this.placeItems('key', cfg.keys, occupied, 6, true);
      this.placeItems('chest', cfg.chests, occupied, 8, true);
      this.placeItems('gem', cfg.gems, occupied, 3, false);
      this.placeItems('potion', cfg.potions, occupied, 5, false);
      this.placeTraps(cfg.traps, occupied);
      this.placeEnemies(cfg.enemies, occupied);

      this.setState('playing');
      this.emit('message', `Level ${index + 1}: ${cfg.name}`);
    }

    /**
     * Places `count` items. When `spread` is true, each item goes to the
     * candidate tile farthest (Manhattan) from everything already placed,
     * sampled from a random subset — keys end up spread over the maze.
     * Every walkable cell is reachable (the generator verifies it), so all
     * keys and treasure can always be collected.
     */
    placeItems(type, count, occupied, minDist, spread) {
      for (let n = 0; n < count; n++) {
        const candidates = this.walkable.filter(
          (i) => !occupied.has(i) && this.distFromStart[i] >= minDist
        );
        if (candidates.length === 0) break;
        let best = this.rng.pick(candidates);
        if (spread) {
          let bestScore = -1;
          for (let s = 0; s < 40; s++) {
            const c = this.rng.pick(candidates);
            let d = Infinity;
            for (const o of occupied) d = Math.min(d, this.grid.manhattan(c, o));
            if (d > bestScore) {
              bestScore = d;
              best = c;
            }
          }
        }
        occupied.add(best);
        this.items.set(best, { type });
      }
    }

    placeTraps(count, occupied) {
      const { TILE } = ADE;
      const nb = new Int32Array(4);
      // Prefer corridor tiles (exactly two open neighbours) so traps matter.
      const corridor = this.walkable.filter(
        (i) =>
          !occupied.has(i) &&
          this.grid.tiles[i] === TILE.FLOOR &&
          this.distFromStart[i] >= 4 &&
          this.grid.neighbors(i, nb) === 2
      );
      this.rng.shuffle(corridor);
      for (let n = 0; n < count && n < corridor.length; n++) {
        const cell = corridor[n];
        occupied.add(cell);
        const trap = { cell, phase: this.rng.next() * this.cfg.trapPeriod };
        this.traps.push(trap);
        this.trapCells.set(cell, trap);
      }
    }

    placeEnemies(list, occupied) {
      this.enemies = [];
      const maxDist = Math.max(...this.walkable.map((i) => this.distFromStart[i]));
      list.forEach((cfg, id) => {
        let pool;
        if (cfg.mode === 'guard') {
          pool = this.cellsNearExit.filter((i) => !occupied.has(i));
        } else {
          const minD = Math.min(14, Math.floor(maxDist * 0.45));
          pool = this.walkable.filter((i) => !occupied.has(i) && this.distFromStart[i] >= minD);
        }
        if (pool.length === 0) pool = this.walkable.filter((i) => !occupied.has(i) && this.distFromStart[i] >= 6);
        const cell = this.rng.pick(pool);
        occupied.add(cell);
        this.enemies.push(new Enemy(cfg, cell, id));
      });
    }

    /* ---------------- queries ---------------- */

    isEnemyBlocking(cell, self) {
      for (const e of this.enemies) {
        if (e === self) continue;
        if (e.cell === cell || (e.moving && e.from === cell)) return true;
      }
      return false;
    }

    isTrapActive(trap) {
      return (this.time + trap.phase) % this.cfg.trapPeriod < this.cfg.trapActive;
    }

    get exitOpen() {
      return this.keysCollected >= this.keysNeeded;
    }

    /* ---------------- main update ---------------- */

    /**
     * @param {number} dt seconds since last frame (clamped by caller)
     * @param {{direction: function(): ({dr,dc}|null)}} input
     */
    update(dt, input) {
      this.updateEffects(dt);
      if (this.state !== 'playing') return;
      this.time += dt;
      this.levelTime += dt;
      this.totalTime += dt;
      if (this.exitHintTimer > 0) this.exitHintTimer -= dt;

      const p = this.player;
      if (p.invuln > 0) p.invuln -= dt;

      // --- player movement ---
      const arrived = p.advance(dt);
      if (arrived) this.onPlayerArrive(p.cell);
      if (this.state !== 'playing') return;
      if (!p.moving) {
        const dir = input.direction();
        if (dir && p.tryMove(this.grid, dir)) this.emit('step', { tile: this.grid.tiles[p.cell] });
      }

      // --- enemies (each plans with its own search algorithm) ---
      for (const e of this.enemies) {
        const wasHunting = e.hunting;
        e.update(dt, this);
        if (e.hunting && !wasHunting) this.emit('alert', { enemy: e });
      }

      // --- hazards ---
      const standing = p.standingCell();
      const trap = this.trapCells.get(standing);
      if (trap && this.isTrapActive(trap)) this.hurtPlayer('trap');

      const pp = p.renderPos(this.grid);
      for (const e of this.enemies) {
        if (e.stun > 0) continue;
        const ep = e.renderPos(this.grid);
        if (Math.abs(pp.r - ep.r) + Math.abs(pp.c - ep.c) < 0.65) {
          if (this.hurtPlayer(e.info.short)) e.stun = GAME_RULES.enemyStunTime;
        }
      }
    }

    onPlayerArrive(cell) {
      const item = this.items.get(cell);
      if (item) {
        this.items.delete(cell);
        const pts = GAME_RULES.score[item.type];
        this.score += pts;
        if (item.type === 'key') {
          this.keysCollected++;
          const left = this.keysNeeded - this.keysCollected;
          this.emit('message', left > 0 ? `Key found! ${left} more to unlock the gate.` : 'All keys found — the gate is open!');
        } else if (item.type === 'potion') {
          this.player.health = Math.min(GAME_RULES.maxHealth, this.player.health + 1);
          this.emit('message', 'Healing potion: +1 heart');
        }
        this.addFloat(cell, '+' + pts, item.type === 'key' ? '#ffd54f' : '#80deea');
        this.emit('pickup', { type: item.type, points: pts });
        if (item.type === 'key' && this.exitOpen) this.emit('gateOpen');
      }
      if (cell === this.exit) {
        if (this.exitOpen) this.completeLevel();
        else if (this.exitHintTimer <= 0) {
          this.exitHintTimer = 2;
          this.emit('gateLocked');
          this.emit('message', `The gate is sealed. Find ${this.keysNeeded - this.keysCollected} more key(s).`);
        }
      }
    }

    hurtPlayer(source) {
      const p = this.player;
      if (p.invuln > 0 || p.health <= 0) return false;
      p.health -= 1;
      p.invuln = GAME_RULES.invulnTime;
      this.shake = 0.3;
      this.addFloat(p.cell, '-1 ♥', '#ff5252');
      this.emit('damage', { source });
      if (p.health <= 0) this.setState('gameOver');
      return true;
    }

    completeLevel() {
      const s = GAME_RULES.score;
      const timeBonus = Math.max(0, Math.round(300 - this.levelTime * 2));
      const clear = s.levelClear * (this.levelIndex + 1);
      const hearts = this.player.health * s.heartBonus;
      this.lastBonus = { clear, timeBonus, hearts, time: this.levelTime };
      this.score += clear + timeBonus + hearts;
      this.saveHighScore();
      if (this.levelIndex + 1 >= LEVELS.length) this.setState('victory');
      else this.setState('levelComplete');
    }

    saveHighScore() {
      try {
        const best = Number(localStorage.getItem('ade.highscore') || 0);
        if (this.score > best) localStorage.setItem('ade.highscore', String(this.score));
      } catch (e) {
        /* storage unavailable (private mode / tests) — ignore */
      }
    }

    static highScore() {
      try {
        return Number(localStorage.getItem('ade.highscore') || 0);
      } catch (e) {
        return 0;
      }
    }

    /* ---------------- effects ---------------- */

    addFloat(cell, text, color) {
      this.effects.push({
        r: this.grid.row(cell),
        c: this.grid.col(cell),
        text,
        color,
        life: 1.1,
      });
    }

    updateEffects(dt) {
      if (this.shake > 0) this.shake = Math.max(0, this.shake - dt);
      for (const fx of this.effects) fx.life -= dt;
      this.effects = this.effects.filter((fx) => fx.life > 0);
    }
  }

  ADE.Game = Game;
})(globalThis.ADE = globalThis.ADE || {});
