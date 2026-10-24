/**
 * main.js
 * Entry point: creates the game, renderer, input, sound and screens, routes
 * all buttons ([data-action]) and keyboard shortcuts, and runs the frame loop.
 */
(function (ADE) {
  'use strict';

  const $ = (id) => document.getElementById(id);

  const game = new ADE.Game();
  const renderer = new ADE.GameRenderer($('game-canvas'));
  const input = new ADE.Input();
  const screens = new ADE.Screens();
  const gameScreen = new ADE.GameScreen(game);
  const lab = new ADE.LabScreen();
  const sfx = new ADE.SoundFX();

  input.attach(window);
  input.attachButtons(document);

  /* ---------------- sound ---------------- */
  // Browsers only allow audio after a user gesture, so unlock on the first one.
  const unlockAudio = () => sfx.unlock();
  window.addEventListener('pointerdown', unlockAudio);
  window.addEventListener('keydown', unlockAudio);

  function refreshSoundButtons() {
    const label = sfx.supported ? `♪ Sound: ${sfx.muted ? 'Off' : 'On'}` : '♪ No audio';
    document.querySelectorAll('.sound-toggle').forEach((b) => {
      b.textContent = label;
      b.classList.toggle('is-off', sfx.muted || !sfx.supported);
    });
  }
  refreshSoundButtons();

  game.on('step', (d) => sfx.play('step', d));
  game.on('pickup', (d) => sfx.play(d.type));
  game.on('damage', (d) => sfx.play('hurt', d));
  game.on('alert', () => sfx.play('alert'));
  game.on('gateOpen', () => sfx.play('gateOpen'));
  game.on('gateLocked', () => sfx.play('gateLocked'));
  let prevState = game.state;
  game.on('state', (s) => {
    if (s === 'paused') sfx.play('pause');
    else if (s === 'playing') sfx.play(prevState === 'paused' ? 'resume' : 'levelStart');
    else if (s === 'levelComplete') sfx.play('levelClear');
    else if (s === 'victory') sfx.play('victory');
    else if (s === 'gameOver') sfx.play('gameOver');
    prevState = s;
  });
  lab.onFinish = () => sfx.play('labDone');

  // Where "How to Play" should return to.
  let howtoReturn = 'menu';

  /* ---------------- menu decoration ---------------- */
  $('menu-chips').innerHTML = ADE.ALGORITHMS.map(
    (a) => `<li style="--algo:${a.color}"><span class="dot"></span>${a.short}</li>`
  ).join('');
  function refreshHighScore() {
    $('menu-highscore').textContent = ADE.Game.highScore();
  }
  refreshHighScore();

  /* ---------------- actions ---------------- */
  const actions = {
    play() {
      screens.show('game');
      game.startNewGame();
    },
    'new-game'() {
      screens.show('game');
      game.startNewGame();
    },
    lab() {
      if (game.state === 'playing') game.pause();
      screens.show('lab');
    },
    howto() {
      howtoReturn = 'menu';
      screens.show('howto');
    },
    'howto-from-game'() {
      howtoReturn = 'game';
      screens.show('howto');
    },
    menu() {
      if (screens.current === 'howto' && howtoReturn === 'game') {
        screens.show('game');
        return;
      }
      if (game.state === 'playing') game.pause();
      refreshHighScore();
      screens.show('menu');
    },
    pause() {
      game.togglePause();
    },
    resume() {
      game.resume();
    },
    'restart-level'() {
      if (game.grid) game.restartLevel();
    },
    'next-level'() {
      game.nextLevel();
    },
    'toggle-sound'() {
      sfx.unlock();
      sfx.toggleMuted();
      refreshSoundButtons();
    },
    'toggle-paths'() {
      game.showPaths = !game.showPaths;
      $('btn-paths').textContent = `◎ Paths: ${game.showPaths ? 'On' : 'Off'}`;
    },
  };

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const fn = actions[btn.dataset.action];
    if (fn) {
      fn();
      btn.blur(); // keep keyboard focus on the game, not the button
    }
  });

  // Soft click for every button (screen changes and lab controls included).
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn');
    if (btn && !btn.disabled) sfx.play('click');
  });

  // How-to "Back" button label depends on where we came from.
  screens.onChange((name) => {
    input.enabled = name === 'game';
    input.clear();
    if (name === 'howto') {
      document.querySelector('#screen-howto [data-action="menu"]').textContent =
        howtoReturn === 'game' ? '← Back to Game' : '← Back';
    }
    if (name === 'lab') lab.layout();
  });

  /* ---------------- keyboard shortcuts ---------------- */
  window.addEventListener('keydown', (e) => {
    if (e.target && /INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return;
    if (e.code === 'KeyM') {
      actions['toggle-sound']();
      return;
    }
    if (screens.current !== 'game') return;
    switch (e.code) {
      case 'KeyP':
      case 'Escape':
        e.preventDefault();
        game.togglePause();
        break;
      case 'KeyR':
        if (game.state !== 'idle') game.restartLevel();
        break;
      case 'KeyV':
        actions['toggle-paths']();
        break;
      case 'Enter':
      case 'Space':
        if (game.state === 'levelComplete') {
          e.preventDefault();
          game.nextLevel();
        } else if (game.state === 'gameOver') {
          e.preventDefault();
          game.restartLevel();
        } else if (game.state === 'victory') {
          e.preventDefault();
          game.startNewGame();
        }
        break;
      default:
    }
  });

  // Auto-pause when the tab is hidden so enemies don't catch an absent player.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) game.pause();
  });

  game.on('state', (s) => {
    if (s === 'playing') renderer.setLevel(game);
    if (s === 'victory' || s === 'levelComplete') refreshHighScore();
  });

  /* ---------------- frame loop ---------------- */
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); // clamp big gaps (tab switches)
    last = now;
    if (screens.current === 'game' && game.grid) {
      game.update(dt, input);
      renderer.draw(game, now);
      gameScreen.update(dt);
    } else if (screens.current === 'lab') {
      lab.tick();
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // Exposed for debugging from the browser console.
  ADE.app = { game, renderer, lab, screens, input, sfx };
})(globalThis.ADE = globalThis.ADE || {});
