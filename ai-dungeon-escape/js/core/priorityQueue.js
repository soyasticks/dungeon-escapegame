/**
 * priorityQueue.js
 * Binary min-heap used by Uniform Cost Search, Greedy Best-First Search
 * and A*. Implemented from scratch (no libraries).
 *
 * Each entry has a primary priority, a secondary tie-break key and an
 * insertion sequence number. Ordering:
 *   1. lower priority first
 *   2. then lower tie-break key
 *   3. then earlier insertion (FIFO) — makes results deterministic.
 *
 * push and pop are O(log n).
 */
(function (ADE) {
  'use strict';

  class MinHeap {
    constructor() {
      this.items = [];
      this.seq = 0;
    }

    get size() {
      return this.items.length;
    }

    isEmpty() {
      return this.items.length === 0;
    }

    /**
     * @param {*} value     payload (a cell index in this project)
     * @param {number} priority
     * @param {number} [tie=0] secondary key
     */
    push(value, priority, tie = 0) {
      const node = { value, priority, tie, seq: this.seq++ };
      const a = this.items;
      a.push(node);
      let i = a.length - 1;
      // Sift up.
      while (i > 0) {
        const parent = (i - 1) >> 1;
        if (!this._less(a[i], a[parent])) break;
        a[i] = a[parent];
        a[parent] = node;
        i = parent;
      }
    }

    /** Removes and returns the smallest entry ({value, priority, tie}) or undefined. */
    pop() {
      const a = this.items;
      if (a.length === 0) return undefined;
      const top = a[0];
      const last = a.pop();
      if (a.length > 0) {
        a[0] = last;
        // Sift down.
        let i = 0;
        const n = a.length;
        for (;;) {
          const l = 2 * i + 1;
          const r = l + 1;
          let smallest = i;
          if (l < n && this._less(a[l], a[smallest])) smallest = l;
          if (r < n && this._less(a[r], a[smallest])) smallest = r;
          if (smallest === i) break;
          const tmp = a[i];
          a[i] = a[smallest];
          a[smallest] = tmp;
          i = smallest;
        }
      }
      return top;
    }

    peek() {
      return this.items[0];
    }

    _less(x, y) {
      if (x.priority !== y.priority) return x.priority < y.priority;
      if (x.tie !== y.tie) return x.tie < y.tie;
      return x.seq < y.seq;
    }
  }

  ADE.MinHeap = MinHeap;
})(globalThis.ADE = globalThis.ADE || {});
