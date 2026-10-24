/**
 * rng.js
 * Small seeded pseudo-random number generator (Mulberry32).
 * Seeding makes every maze reproducible: the same seed always gives the
 * same maze, which is essential for fair algorithm comparisons.
 */
(function (ADE) {
  'use strict';

  class RNG {
    /** @param {number} seed any 32-bit integer */
    constructor(seed) {
      this.seed = seed >>> 0;
      this.state = this.seed;
    }

    /** Uniform float in [0, 1). */
    next() {
      let t = (this.state = (this.state + 0x6d2b79f5) >>> 0);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }

    /** Integer in [min, max] (inclusive). */
    int(min, max) {
      return min + Math.floor(this.next() * (max - min + 1));
    }

    /** Random element of an array. */
    pick(arr) {
      return arr[Math.floor(this.next() * arr.length)];
    }

    /** True with probability p. */
    chance(p) {
      return this.next() < p;
    }

    /** In-place Fisher-Yates shuffle; returns the array. */
    shuffle(arr) {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(this.next() * (i + 1));
        const tmp = arr[i];
        arr[i] = arr[j];
        arr[j] = tmp;
      }
      return arr;
    }
  }

  /** A fresh random seed (uses Math.random only to choose the seed). */
  RNG.randomSeed = function () {
    return Math.floor(Math.random() * 1e9);
  };

  ADE.RNG = RNG;
})(globalThis.ADE = globalThis.ADE || {});
