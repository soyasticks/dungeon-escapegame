/**
 * soundFx.js
 * Retro sound effects synthesised live with the Web Audio API.
 *
 * There are no audio files: every sound is built from oscillators
 * (square / triangle / sine / sawtooth waves) and filtered white noise,
 * shaped with short volume envelopes. This keeps the project offline and
 * dependency-free, and gives an 8-bit feel that matches the pixel art.
 *
 * Browsers only allow audio after the user interacts with the page, so the
 * AudioContext is created on the first click or key press (unlock()).
 * The mute setting is remembered in localStorage.
 */
(function (ADE) {
  'use strict';

  const STORE_KEY = 'ade.muted';
  const MASTER_VOLUME = 0.9;

  /** Minimum seconds between two plays of the same sound (prevents spam). */
  const THROTTLE = {
    step: 0.07,
    alert: 0.45,
    hurt: 0.12,
    gateLocked: 0.8,
    click: 0.04,
  };

  // Note frequencies (Hz) used by the jingles.
  const N = {
    C4: 261.63, D4: 293.66, E4: 329.63, G4: 392.0, A4: 440.0, B4: 493.88,
    C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99, A5: 880.0,
    C6: 1046.5, E6: 1318.5, G6: 1568.0, Eb4: 311.13, Bb3: 233.08, G3: 196.0,
  };

  function loadMuted() {
    try {
      return localStorage.getItem(STORE_KEY) === '1';
    } catch (e) {
      return false;
    }
  }

  function saveMuted(m) {
    try {
      localStorage.setItem(STORE_KEY, m ? '1' : '0');
    } catch (e) {
      /* storage unavailable — setting just won't persist */
    }
  }

  class SoundFX {
    constructor() {
      this.ctx = null;
      this.master = null;
      this.noiseBuffer = null;
      this.muted = loadMuted();
      this.lastPlayed = {};
    }

    get supported() {
      return typeof window !== 'undefined' && !!(window.AudioContext || window.webkitAudioContext);
    }

    /** Creates / resumes the audio context. Call from a user gesture. */
    unlock() {
      if (!this.supported) return;
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AC();
        const comp = this.ctx.createDynamicsCompressor();
        comp.threshold.value = -12;
        comp.ratio.value = 6;
        this.master = this.ctx.createGain();
        this.master.gain.value = this.muted ? 0 : MASTER_VOLUME;
        this.master.connect(comp);
        comp.connect(this.ctx.destination);
        // One second of white noise, reused by every noise-based sound.
        const len = this.ctx.sampleRate;
        this.noiseBuffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
        const data = this.noiseBuffer.getChannelData(0);
        for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      }
      if (this.ctx.state === 'suspended') this.ctx.resume();
    }

    setMuted(m) {
      this.muted = m;
      saveMuted(m);
      if (this.master) {
        const t = this.ctx.currentTime;
        this.master.gain.cancelScheduledValues(t);
        this.master.gain.setTargetAtTime(m ? 0 : MASTER_VOLUME, t, 0.02);
      }
    }

    toggleMuted() {
      this.setMuted(!this.muted);
      return this.muted;
    }

    /** Plays a named sound (see SOUNDS below). Silently ignored if muted or not unlocked. */
    play(name, opts) {
      if (this.muted || !this.ctx || this.ctx.state !== 'running') return;
      const fn = SOUNDS[name];
      if (!fn) return;
      const now = this.ctx.currentTime;
      const gap = THROTTLE[name] || 0;
      if (gap && this.lastPlayed[name] !== undefined && now - this.lastPlayed[name] < gap) return;
      this.lastPlayed[name] = now;
      fn(this, now + 0.005, opts || {});
    }

    /* ---------------- building blocks ---------------- */

    /**
     * A single oscillator note with an attack/decay envelope.
     * @param {object} o {type, freq, to (end freq), at (start time), dur, vol, attack}
     */
    tone(o) {
      const ctx = this.ctx;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const at = o.at;
      const dur = o.dur;
      const vol = o.vol !== undefined ? o.vol : 0.3;
      const attack = o.attack !== undefined ? o.attack : 0.005;
      osc.type = o.type || 'square';
      osc.frequency.setValueAtTime(o.freq, at);
      if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, at + dur);
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(vol, at + attack);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + dur);
      osc.connect(gain);
      gain.connect(this.master);
      osc.start(at);
      osc.stop(at + dur + 0.02);
    }

    /**
     * A burst of filtered white noise.
     * @param {object} o {at, dur, vol, filter ('lowpass'|'highpass'|'bandpass'), freq, to, q}
     */
    noise(o) {
      const ctx = this.ctx;
      const src = ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      const filter = ctx.createBiquadFilter();
      filter.type = o.filter || 'lowpass';
      filter.frequency.setValueAtTime(o.freq || 1000, o.at);
      if (o.to) filter.frequency.exponentialRampToValueAtTime(o.to, o.at + o.dur);
      filter.Q.value = o.q || 1;
      const gain = ctx.createGain();
      const vol = o.vol !== undefined ? o.vol : 0.3;
      gain.gain.setValueAtTime(0.0001, o.at);
      gain.gain.exponentialRampToValueAtTime(vol, o.at + 0.004);
      gain.gain.exponentialRampToValueAtTime(0.0001, o.at + o.dur);
      src.connect(filter);
      filter.connect(gain);
      gain.connect(this.master);
      src.start(o.at, Math.random() * 0.5);
      src.stop(o.at + o.dur + 0.02);
    }

    /** Plays a list of notes one after another. */
    melody(notes, at, o) {
      let t = at;
      for (const n of notes) {
        const len = n[1] || o.len;
        if (n[0]) this.tone({ type: o.type, freq: n[0], at: t, dur: len * (o.legato || 0.9), vol: o.vol });
        t += len;
      }
      return t;
    }
  }

  /* ---------------- the sound library ---------------- */

  const { TILE } = ADE;

  const SOUNDS = {
    /** Footstep — the sound depends on the terrain stepped onto. */
    step(s, t, o) {
      if (o.tile === TILE.WATER) {
        s.noise({ at: t, dur: 0.16, vol: 0.12, filter: 'bandpass', freq: 1400, to: 500, q: 1.5 });
      } else if (o.tile === TILE.MUD) {
        s.noise({ at: t, dur: 0.12, vol: 0.14, filter: 'lowpass', freq: 500, to: 180 });
        s.tone({ type: 'sine', freq: 140, to: 70, at: t, dur: 0.1, vol: 0.08 });
      } else {
        s.noise({ at: t, dur: 0.04, vol: 0.08, filter: 'highpass', freq: 2500 });
      }
    },

    key(s, t) {
      s.melody([[N.C6], [N.E6], [N.G6, 0.14]], t, { type: 'square', len: 0.06, vol: 0.14 });
    },

    gem(s, t) {
      s.tone({ type: 'triangle', freq: N.E6, at: t, dur: 0.08, vol: 0.25 });
      s.tone({ type: 'triangle', freq: N.G6 * 1.335, at: t + 0.06, dur: 0.16, vol: 0.2 });
    },

    chest(s, t) {
      s.noise({ at: t, dur: 0.08, vol: 0.15, filter: 'lowpass', freq: 600 }); // lid thud
      s.melody([[N.G5], [N.C6], [N.E6], [N.G6], [N.C6 * 2, 0.2]], t + 0.06, { type: 'triangle', len: 0.055, vol: 0.2 });
    },

    potion(s, t) {
      for (let i = 0; i < 4; i++) {
        s.tone({ type: 'sine', freq: 400 + i * 160, to: 800 + i * 220, at: t + i * 0.06, dur: 0.07, vol: 0.18 });
      }
      s.tone({ type: 'triangle', freq: N.C5, to: N.C6, at: t + 0.22, dur: 0.25, vol: 0.15 });
    },

    hurt(s, t, o) {
      if (o.source === 'trap') {
        s.tone({ type: 'square', freq: 2200, to: 1800, at: t, dur: 0.07, vol: 0.08 }); // metallic spike
      }
      s.tone({ type: 'sawtooth', freq: 320, to: 70, at: t, dur: 0.22, vol: 0.22 });
      s.noise({ at: t, dur: 0.15, vol: 0.2, filter: 'lowpass', freq: 1200, to: 200 });
    },

    /** An enemy spotted the player and started hunting. */
    alert(s, t) {
      s.tone({ type: 'square', freq: N.A4, at: t, dur: 0.08, vol: 0.1 });
      s.tone({ type: 'square', freq: N.D5, at: t + 0.09, dur: 0.12, vol: 0.1 });
    },

    gateOpen(s, t) {
      s.tone({ type: 'sawtooth', freq: 110, to: 440, at: t, dur: 0.6, vol: 0.08, attack: 0.1 });
      s.melody([[N.C5], [N.E5], [N.G5], [N.C6, 0.35]], t + 0.15, { type: 'triangle', len: 0.09, vol: 0.18 });
      s.noise({ at: t, dur: 0.6, vol: 0.05, filter: 'bandpass', freq: 3000, to: 6000, q: 4 });
    },

    gateLocked(s, t) {
      s.tone({ type: 'square', freq: 110, at: t, dur: 0.1, vol: 0.12 });
      s.tone({ type: 'square', freq: 98, at: t + 0.12, dur: 0.16, vol: 0.12 });
    },

    levelStart(s, t) {
      s.noise({ at: t, dur: 0.5, vol: 0.06, filter: 'bandpass', freq: 400, to: 2000, q: 2 });
      s.melody([[N.G4], [N.C5, 0.18]], t + 0.1, { type: 'triangle', len: 0.1, vol: 0.15 });
    },

    levelClear(s, t) {
      s.melody(
        [[N.C5], [N.E5], [N.G5], [N.C6, 0.16], [0, 0.04], [N.G5], [N.C6, 0.4]],
        t,
        { type: 'square', len: 0.09, vol: 0.13 }
      );
      s.melody([[N.C4, 0.36], [N.G4, 0.13], [N.C5, 0.4]], t, { type: 'triangle', len: 0.1, vol: 0.18 });
    },

    victory(s, t) {
      const end = s.melody(
        [[N.G4], [N.C5], [N.E5], [N.G5, 0.2], [N.E5], [N.G5, 0.2], [N.C6, 0.15], [N.D5 * 2, 0.15], [N.E6, 0.6]],
        t,
        { type: 'square', len: 0.1, vol: 0.12 }
      );
      s.melody([[N.C4, 0.6], [N.F5 / 2, 0.45], [N.G4, 0.3], [N.C5, 0.6]], t, { type: 'triangle', len: 0.3, vol: 0.18 });
      s.noise({ at: end - 0.5, dur: 0.6, vol: 0.05, filter: 'highpass', freq: 5000 });
    },

    gameOver(s, t) {
      s.melody([[N.G4, 0.22], [N.Eb4, 0.22], [N.C4, 0.22], [N.Bb3, 0.22], [N.G3, 0.7]], t, {
        type: 'triangle',
        len: 0.2,
        vol: 0.22,
        legato: 0.95,
      });
      s.tone({ type: 'sawtooth', freq: 98, to: 49, at: t + 0.9, dur: 0.8, vol: 0.08 });
    },

    pause(s, t) {
      s.tone({ type: 'square', freq: N.E5, at: t, dur: 0.06, vol: 0.08 });
      s.tone({ type: 'square', freq: N.C5, at: t + 0.07, dur: 0.08, vol: 0.08 });
    },

    resume(s, t) {
      s.tone({ type: 'square', freq: N.C5, at: t, dur: 0.06, vol: 0.08 });
      s.tone({ type: 'square', freq: N.E5, at: t + 0.07, dur: 0.08, vol: 0.08 });
    },

    /** UI button click. */
    click(s, t) {
      s.tone({ type: 'square', freq: 880, to: 660, at: t, dur: 0.04, vol: 0.06 });
    },

    /** Algorithm Lab: all animations finished. */
    labDone(s, t) {
      s.melody([[N.E5], [N.A5, 0.18]], t, { type: 'triangle', len: 0.07, vol: 0.15 });
    },
  };

  SoundFX.library = SOUNDS; // exposed for offline rendering tests
  ADE.SoundFX = SoundFX;
  ADE.SOUND_NAMES = Object.keys(SOUNDS);
})(globalThis.ADE = globalThis.ADE || {});
