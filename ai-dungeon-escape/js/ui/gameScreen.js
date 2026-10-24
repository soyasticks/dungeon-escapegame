/**
 * gameScreen.js
 * Connects the Game to the DOM: HUD, enemy AI panel, toasts and the
 * pause / level-complete / game-over / victory overlays.
 */
(function (ADE) {
  'use strict';

  const $ = (id) => document.getElementById(id);

  function formatTime(sec) {
    const s = Math.floor(sec);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  }

  class GameScreen {
    constructor(game) {
      this.game = game;
      this.lastHearts = -1;
      this.listTimer = 0;
      this.toastTimer = null;

      game.on('state', (s) => this.onState(s));
      game.on('message', (msg) => this.toast(msg));
      game.on('damage', () => {
        const wrap = $('canvas-wrap');
        wrap.classList.remove('hurt');
        void wrap.offsetWidth; // restart CSS animation
        wrap.classList.add('hurt');
      });
    }

    showOverlay(id) {
      document.querySelectorAll('#canvas-wrap .overlay').forEach((el) => {
        el.classList.toggle('active', el.id === id);
      });
    }

    onState(state) {
      const g = this.game;
      $('btn-pause').textContent = state === 'paused' ? '▶ Resume' : '❚❚ Pause';
      if (state === 'playing') {
        this.showOverlay(null);
        $('hud-level').textContent = `${g.levelIndex + 1}/${ADE.LEVELS.length}`;
        $('hud-level-name').textContent = g.cfg.name;
        $('hud-seed').textContent = g.seed;
        this.buildEnemyList();
        this.lastHearts = -1;
      } else if (state === 'paused') {
        this.showOverlay('overlay-pause');
      } else if (state === 'levelComplete') {
        this.fillBonus($('level-bonus'));
        this.showOverlay('overlay-level');
      } else if (state === 'gameOver') {
        $('gameover-text').textContent = `Level ${g.levelIndex + 1} — score ${g.score}. Retry restores the score you had when this level began.`;
        this.showOverlay('overlay-gameover');
      } else if (state === 'victory') {
        $('victory-text').textContent = `You escaped all ${ADE.LEVELS.length} levels in ${formatTime(g.totalTime)}.`;
        this.fillBonus($('victory-bonus'), true);
        this.showOverlay('overlay-victory');
      }
      this.update(0, true);
    }

    fillBonus(table, final) {
      const g = this.game;
      const b = g.lastBonus;
      const rows = [
        ['Level clear', '+' + b.clear],
        [`Time bonus (${formatTime(b.time)})`, '+' + b.timeBonus],
        [`Hearts left (${g.player.health})`, '+' + b.hearts],
        [final ? 'Final score' : 'Score', String(g.score)],
        ['Best score', String(Math.max(g.score, ADE.Game.highScore()))],
      ];
      table.innerHTML = rows.map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join('');
    }

    buildEnemyList() {
      const ul = $('enemy-list');
      ul.innerHTML = '';
      this.enemyRows = this.game.enemies.map((e) => {
        const li = document.createElement('li');
        li.style.setProperty('--algo', e.info.color);
        li.innerHTML = `
          <div class="enemy-head"><span class="dot"></span><b>${e.info.short}</b> <span class="enemy-name">${e.info.enemyName}</span><span class="state"></span></div>
          <div class="enemy-stats">Last plan: <span class="plan">—</span></div>`;
        ul.appendChild(li);
        return { li, state: li.querySelector('.state'), plan: li.querySelector('.plan') };
      });
    }

    /** Called every frame while the game screen is visible. */
    update(dt, force) {
      const g = this.game;
      if (!g.player) return;
      if (g.player.health !== this.lastHearts) {
        this.lastHearts = g.player.health;
        let html = '';
        for (let i = 0; i < ADE.GAME_RULES.maxHealth; i++) html += ADE.heartSVG(i < g.player.health);
        $('hud-hearts').innerHTML = html;
      }
      $('hud-keys').textContent = `${g.keysCollected}/${g.keysNeeded}`;
      $('hud-keys').classList.toggle('done', g.exitOpen);
      $('hud-score').textContent = g.score;
      $('hud-time').textContent = formatTime(g.levelTime);

      this.listTimer -= dt;
      if ((this.listTimer <= 0 || force) && this.enemyRows) {
        this.listTimer = 0.2;
        g.enemies.forEach((e, k) => {
          const row = this.enemyRows[k];
          if (!row) return;
          const mode = e.stun > 0 ? 'stunned' : e.hunting ? 'hunting!' : e.mode === 'guard' ? 'guarding exit' : 'patrolling';
          row.state.textContent = mode;
          row.li.classList.toggle('hunting', e.hunting);
          const p = e.lastPlan;
          row.plan.textContent = p
            ? `${p.expanded} nodes · ${p.length} steps · cost ${p.cost} · ${p.ms.toFixed(2)} ms`
            : '—';
        });
      }
    }

    toast(msg) {
      const el = $('toast');
      el.textContent = msg;
      el.classList.add('show');
      clearTimeout(this.toastTimer);
      this.toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
    }
  }

  ADE.GameScreen = GameScreen;
})(globalThis.ADE = globalThis.ADE || {});
