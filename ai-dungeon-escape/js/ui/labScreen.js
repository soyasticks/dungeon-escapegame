/**
 * labScreen.js
 * The Algorithm Lab screen: maze controls, five animated panels (one per
 * algorithm, all on the same maze), a comparison table filled with the
 * measured results, data-driven observations and CSV export.
 */
(function (ADE) {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const { TILE } = ADE;

  class LabScreen {
    constructor() {
      this.grid = null;
      this.start = -1;
      this.goal = -1;
      this.seed = 0;
      this.edited = false;
      this.rows = null; // benchmark rows from ADE.lab.runAll
      this.animating = false;
      this.dirty = true;
      this.buildPanels();
      this.bindControls();
      this.newMaze(ADE.RNG.randomSeed());
    }

    /* ---------------- setup ---------------- */

    buildPanels() {
      const host = $('lab-panels');
      host.innerHTML = '';
      this.panels = ADE.ALGORITHMS.map((info) => {
        const el = document.createElement('div');
        el.className = 'lab-panel panel';
        el.style.setProperty('--algo', info.color);
        el.innerHTML = `
          <div class="lab-panel-head">
            <span class="dot"></span><b>${info.short}</b><span class="lab-panel-name">${info.name}</span>
          </div>
          <div class="lab-canvas-box"><canvas></canvas></div>
          <div class="lab-panel-stats">Ready</div>`;
        host.appendChild(el);
        const canvas = el.querySelector('canvas');
        const panel = {
          info,
          el,
          canvas,
          stats: el.querySelector('.lab-panel-stats'),
          renderer: new ADE.LabRenderer(canvas, info.color),
          shown: 0,
          pathShown: 0,
        };
        this.bindCanvas(panel);
        return panel;
      });
      const legend = document.createElement('div');
      legend.className = 'lab-panel lab-legend panel';
      legend.innerHTML = `
        <h3>How to read the panels</h3>
        <ul class="legend">
          <li class="multi"><span class="sw" style="background:#4caf50"></span>S — start &nbsp; <span class="sw" style="background:#ffd54f"></span>G — goal</li>
          <li><span class="sw" style="background:linear-gradient(90deg,rgba(255,255,255,.25),rgba(255,255,255,.75))"></span><span>Expanded cells, tinted per algorithm (brighter = more recent)</span></li>
          <li><span class="sw" style="background:#fff3b0"></span><span>Final path returned by the algorithm</span></li>
          <li class="multi"><span class="sw sw-floor"></span>Floor 1 · <span class="sw sw-mud"></span>Mud 3 · <span class="sw sw-water"></span>Water 5</li>
        </ul>
        <p>Every panel animates at the same speed (cells per frame), so an algorithm that expands fewer nodes finishes first.</p>
        <p class="muted">Click or drag on any maze with the <b>Click tool</b> to move S/G, toggle walls or paint terrain. All panels share one maze.</p>`;
      host.appendChild(legend);
      window.addEventListener('resize', () => {
        if (this.grid) this.layout();
      });
    }

    bindControls() {
      $('lab-loops').addEventListener('input', (e) => {
        $('lab-loops-val').textContent = e.target.value + '%';
      });
      $('lab-speed').addEventListener('input', (e) => {
        $('lab-speed-val').textContent = e.target.value;
      });
      $('lab-new').addEventListener('click', () => this.newMaze(ADE.RNG.randomSeed()));
      $('lab-load').addEventListener('click', () => {
        const v = parseInt($('lab-seed').value, 10);
        this.newMaze(Number.isFinite(v) && v >= 0 ? v : ADE.RNG.randomSeed());
      });
      $('lab-size').addEventListener('change', () => this.newMaze(this.seed));
      $('lab-loops').addEventListener('change', () => this.newMaze(this.seed));
      $('lab-terrain').addEventListener('change', () => this.newMaze(this.seed));
      $('lab-run').addEventListener('click', () => this.run());
      $('lab-instant').addEventListener('click', () => this.skipAnimation());
      $('lab-clear').addEventListener('click', () => this.clearResults());
      $('lab-csv').addEventListener('click', () => this.exportCSV());
    }

    bindCanvas(panel) {
      let painting = false;
      let wallTarget = null;
      const apply = (evt, first) => {
        const cell = panel.renderer.cellAt(evt);
        if (cell < 0) return;
        const tool = $('lab-tool').value;
        if (tool === 'wall' && first) {
          wallTarget = this.grid.tiles[cell] === TILE.WALL ? TILE.FLOOR : TILE.WALL;
        }
        this.editCell(cell, tool, wallTarget);
      };
      panel.canvas.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        painting = true;
        panel.canvas.setPointerCapture(e.pointerId);
        apply(e, true);
      });
      panel.canvas.addEventListener('pointermove', (e) => {
        const tool = $('lab-tool').value;
        if (painting && tool !== 'start' && tool !== 'goal') apply(e, false);
      });
      const stop = () => {
        painting = false;
      };
      panel.canvas.addEventListener('pointerup', stop);
      panel.canvas.addEventListener('pointercancel', stop);
    }

    /* ---------------- maze ---------------- */

    newMaze(seed) {
      const [rows, cols] = $('lab-size').value.split('x').map(Number);
      const terrain = $('lab-terrain').checked;
      const m = ADE.generateMaze({
        rows,
        cols,
        seed,
        loopFactor: Number($('lab-loops').value) / 100,
        mud: terrain ? 0.12 : 0,
        water: terrain ? 0.06 : 0,
      });
      this.grid = m.grid;
      this.start = m.start;
      this.goal = m.goal;
      this.seed = m.seed;
      this.edited = false;
      $('lab-seed').value = m.seed;
      this.layout();
      this.clearResults();
    }

    /** Sizes every panel canvas to the available width. */
    layout() {
      const box = this.panels[0].el.querySelector('.lab-canvas-box');
      const width = Math.max(150, box.clientWidth || 300);
      for (const p of this.panels) p.renderer.setMaze(this.grid, width);
      this.dirty = true;
    }

    editCell(cell, tool, wallTarget) {
      const g = this.grid;
      const r = g.row(cell);
      const c = g.col(cell);
      if (r === 0 || c === 0 || r === g.rows - 1 || c === g.cols - 1) return; // keep border
      const before = g.tiles[cell];
      if (tool === 'start' || tool === 'goal') {
        const other = tool === 'start' ? this.goal : this.start;
        if (cell === other) return;
        if (g.tiles[cell] === TILE.WALL) g.tiles[cell] = TILE.FLOOR;
        if (tool === 'start') this.start = cell;
        else this.goal = cell;
      } else {
        if (cell === this.start || cell === this.goal) return;
        const map = { wall: wallTarget, mud: TILE.MUD, water: TILE.WATER, floor: TILE.FLOOR };
        const t = map[tool];
        if (t === undefined || t === null || g.tiles[cell] === t) return;
        g.tiles[cell] = t;
      }
      if (g.tiles[cell] !== before || tool === 'start' || tool === 'goal') {
        this.edited = true;
        this.layout(); // repaint base images
        this.clearResults();
      }
    }

    /* ---------------- running ---------------- */

    run() {
      this.rows = ADE.lab.runAll(this.grid, this.start, this.goal);
      this.panels.forEach((p) => {
        p.result = this.rows.find((r) => r.id === p.info.id).result;
        p.shown = 0;
        p.pathShown = 0;
      });
      this.animating = true;
      this.dirty = true;
      $('lab-tbody').innerHTML = `<tr><td colspan="10" class="muted">Measured. Animating the search… (press ⏭ Skip Animation to see the table now)</td></tr>`;
      $('lab-insights').innerHTML = '';
      $('lab-csv').disabled = true;
    }

    skipAnimation() {
      if (!this.rows) this.run();
      for (const p of this.panels) {
        p.shown = p.result.explored.length;
        p.pathShown = p.result.path.length;
      }
      this.finish();
    }

    finish() {
      const wasAnimating = this.animating;
      this.animating = false;
      if (wasAnimating && this.onFinish) this.onFinish();
      this.dirty = true;
      this.fillTable();
      $('lab-csv').disabled = false;
    }

    clearResults() {
      this.rows = null;
      this.animating = false;
      for (const p of this.panels) {
        p.result = null;
        p.shown = 0;
        p.pathShown = 0;
        p.stats.textContent = 'Ready';
      }
      $('lab-tbody').innerHTML =
        '<tr><td colspan="10" class="muted">Press ▶ Run All to fill this table with measured results.</td></tr>';
      $('lab-insights').innerHTML = '';
      $('lab-csv').disabled = true;
      this.updateMeta();
      this.dirty = true;
    }

    updateMeta() {
      const g = this.grid;
      const fmt = (i) => `${g.row(i)},${g.col(i)}`;
      $('lab-meta').textContent = `— ${g.rows}×${g.cols} maze, seed ${this.seed}${this.edited ? ' (edited)' : ''}, start (${fmt(this.start)}) → goal (${fmt(this.goal)})`;
    }

    /** Called every animation frame while the lab is visible. */
    tick() {
      if (this.animating) {
        const speed = Number($('lab-speed').value);
        let allDone = true;
        for (const p of this.panels) {
          const res = p.result;
          if (p.shown < res.explored.length) {
            p.shown = Math.min(res.explored.length, p.shown + speed);
            allDone = false;
          } else if (p.pathShown < res.path.length) {
            p.pathShown = Math.min(res.path.length, p.pathShown + Math.max(1, Math.ceil(speed / 2)));
            allDone = false;
          }
        }
        this.dirty = true;
        if (allDone) this.finish();
      }
      if (!this.dirty) return;
      this.dirty = false;
      for (const p of this.panels) {
        p.renderer.draw({
          start: this.start,
          goal: this.goal,
          result: p.result || null,
          shown: p.shown,
          pathShown: p.pathShown,
        });
        if (p.result) {
          const r = p.result;
          if (p.shown < r.explored.length) {
            p.stats.textContent = `Expanding… ${p.shown} / ${r.nodesExpanded}`;
          } else if (!r.found) {
            p.stats.textContent = `No path · ${r.nodesExpanded} expanded`;
          } else {
            p.stats.textContent = `${r.nodesExpanded} expanded · ${r.pathLength} steps · cost ${r.totalCost}`;
          }
        }
      }
    }

    /* ---------------- results ---------------- */

    fillTable() {
      const rows = this.rows;
      const found = rows.filter((r) => r.result.found);
      const best = (fn) => (found.length ? Math.min(...found.map(fn)) : null);
      const bTime = best((r) => r.timeMs);
      const bNodes = best((r) => r.result.nodesExpanded);
      const bLen = best((r) => r.result.pathLength);
      const bCost = best((r) => r.result.totalCost);
      const bFront = best((r) => r.result.maxFrontier);
      const cls = (ok, v, b) => (ok && v === b ? ' class="best"' : '');

      $('lab-tbody').innerHTML = rows
        .map((r) => {
          const res = r.result;
          const f = res.found;
          const opt = f ? (r.isCostOptimal ? '✔ Yes' : `✘ +${res.totalCost - r.optimalCost}`) : '—';
          return `<tr style="--algo:${r.info.color}">
            <td><span class="dot"></span>${r.info.name}</td>
            <td>${r.info.priority}</td>
            <td>${f ? 'Yes' : 'No'}</td>
            <td${cls(f, r.timeMs, bTime)}>${r.timeMs.toFixed(4)}</td>
            <td>${r.reps}</td>
            <td${cls(f, res.nodesExpanded, bNodes)}>${res.nodesExpanded}</td>
            <td${cls(f, res.pathLength, bLen)}>${f ? res.pathLength : '—'}</td>
            <td${cls(f, res.totalCost, bCost)}>${f ? res.totalCost : '—'}</td>
            <td${cls(f, res.maxFrontier, bFront)}>${res.maxFrontier}</td>
            <td class="${r.isCostOptimal ? 'ok' : 'bad'}">${opt}</td>
          </tr>`;
        })
        .join('');
      this.fillInsights();
    }

    /** Short observations computed from the measured numbers. */
    fillInsights() {
      const by = {};
      for (const r of this.rows) by[r.id] = r;
      const out = [];
      if (!by.ucs.result.found) {
        out.push('The goal is unreachable from the start — every algorithm explored the reachable region and reported no path.');
      } else {
        const opt = by.ucs.result.totalCost;
        const a = by.astar.result;
        const u = by.ucs.result;
        const pct = u.nodesExpanded ? Math.round((1 - a.nodesExpanded / u.nodesExpanded) * 100) : 0;
        out.push(
          `A* and UCS both found the optimal cost of <b>${opt}</b>; A* expanded <b>${a.nodesExpanded}</b> nodes vs UCS <b>${u.nodesExpanded}</b> ` +
            (pct >= 0 ? `(${pct}% fewer)` : `(${-pct}% more)`) +
            ' — the Manhattan heuristic focuses the search toward the goal.'
        );
        const b = by.bfs.result;
        if (b.totalCost > opt) {
          out.push(`BFS found the fewest moves (<b>${b.pathLength}</b>) but its path costs <b>${b.totalCost}</b>, because it ignores terrain weights. The cheapest path takes ${u.pathLength} moves.`);
        } else {
          out.push(`BFS's fewest-moves path (<b>${b.pathLength}</b> moves) is also cost-optimal on this maze.`);
        }
        const g = by.greedy.result;
        out.push(
          `Greedy Best-First expanded <b>${g.nodesExpanded}</b> nodes, ` +
            (g.totalCost === opt ? 'and its path happened to be optimal here.' : `but its path costs <b>${g.totalCost}</b> (${Math.round(((g.totalCost - opt) / opt) * 100)}% above optimal) — h(n) alone can mislead it.`)
        );
        const d = by.dfs.result;
        out.push(`DFS reached the goal after expanding <b>${d.nodesExpanded}</b> nodes with a path of <b>${d.pathLength}</b> moves (shortest possible: ${b.pathLength}).`);
        const fastest = [...this.rows].sort((x, y) => x.timeMs - y.timeMs)[0];
        out.push(`Fastest measured: <b>${fastest.info.short}</b> at ${fastest.timeMs.toFixed(4)} ms per run on this machine.`);
      }
      $('lab-insights').innerHTML = out.map((t) => `<li>${t}</li>`).join('');
    }

    exportCSV() {
      if (!this.rows) return;
      const g = this.grid;
      const csv = ADE.lab.toCSV(this.rows, {
        rows: g.rows,
        cols: g.cols,
        seed: this.seed + (this.edited ? ' (edited)' : ''),
        start: `${g.row(this.start)} ${g.col(this.start)}`,
        goal: `${g.row(this.goal)} ${g.col(this.goal)}`,
      });
      const blob = new Blob([csv], { type: 'text/csv' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `algorithm-lab-seed-${this.seed}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    }
  }

  ADE.LabScreen = LabScreen;
})(globalThis.ADE = globalThis.ADE || {});
