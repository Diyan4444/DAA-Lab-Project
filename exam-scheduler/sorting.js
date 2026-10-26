/**
 * Smart Exam Scheduler - Counting Sort & Histogram Module
 * 
 * Provides:
 * - countingSortBy: O(n + k) stable integer sorting with automatic safety fallback
 * - buildHistogram: Counting array builder for distributions
 * 
 * STRICT: Pure logic, zero DOM dependencies.
 */

(function (global) {
  'use strict';

  /**
   * Stable Counting Sort on items by an integer key.
   * 
   * @param {Array} items Array of items to sort
   * @param {Function} keyFn Function returning a non-negative integer key for an item
   * @param {Object} [options]
   * @param {boolean} [options.descending=false]
   * @param {number} [options.maxRange=1000000]
   * @returns {{ sorted: Array, usedCounting: boolean, range: number }}
   */
  function countingSortBy(items, keyFn, options) {
    const opts = Object.assign({ descending: false, maxRange: 1000000 }, options);

    if (!Array.isArray(items) || items.length <= 1) {
      return {
        sorted: items ? [...items] : [],
        usedCounting: true,
        range: 0
      };
    }

    const n = items.length;
    let minKey = Infinity;
    let maxKey = -Infinity;
    let needsFallback = false;

    // Validate keys & determine min/max
    const keys = new Array(n);
    for (let i = 0; i < n; i++) {
      const k = keyFn(items[i]);
      if (typeof k !== 'number' || !Number.isInteger(k) || k < 0 || isNaN(k)) {
        needsFallback = true;
        break;
      }
      keys[i] = k;
      if (k < minKey) minKey = k;
      if (k > maxKey) maxKey = k;
    }

    const range = (maxKey >= minKey && !needsFallback) ? (maxKey - minKey + 1) : 0;
    if (needsFallback || range > opts.maxRange) {
      // Stable comparison sort fallback
      const indexed = items.map((item, idx) => ({ item, idx, key: keyFn(item) }));
      indexed.sort((a, b) => {
        if (a.key !== b.key) {
          return opts.descending ? (b.key > a.key ? 1 : -1) : (a.key > b.key ? 1 : -1);
        }
        return a.idx - b.idx; // Preserve original order
      });
      return {
        sorted: indexed.map(entry => entry.item),
        usedCounting: false,
        range
      };
    }

    // Stable Counting Sort implementation
    const count = new Array(range).fill(0);

    if (!opts.descending) {
      // Ascending
      for (let i = 0; i < n; i++) {
        count[keys[i] - minKey]++;
      }
      const pos = new Array(range);
      pos[0] = 0;
      for (let i = 1; i < range; i++) {
        pos[i] = pos[i - 1] + count[i - 1];
      }
      const output = new Array(n);
      for (let i = 0; i < n; i++) {
        const bucket = keys[i] - minKey;
        output[pos[bucket]++] = items[i];
      }
      return { sorted: output, usedCounting: true, range };
    } else {
      // Descending: bucket index = maxKey - key (stable relative order preserved)
      for (let i = 0; i < n; i++) {
        count[maxKey - keys[i]]++;
      }
      const pos = new Array(range);
      pos[0] = 0;
      for (let i = 1; i < range; i++) {
        pos[i] = pos[i - 1] + count[i - 1];
      }
      const output = new Array(n);
      for (let i = 0; i < n; i++) {
        const bucket = maxKey - keys[i];
        output[pos[bucket]++] = items[i];
      }
      return { sorted: output, usedCounting: true, range };
    }
  }

  /**
   * Build frequency histogram array for integer values.
   * Index i holds the count of occurrences of integer i.
   * 
   * @param {number[]} intValues 
   * @returns {number[]}
   */
  function buildHistogram(intValues) {
    if (!Array.isArray(intValues) || intValues.length === 0) {
      return [0];
    }
    let max = 0;
    for (let i = 0; i < intValues.length; i++) {
      const v = intValues[i];
      if (typeof v === 'number' && Number.isInteger(v) && v > max) {
        max = v;
      }
    }
    const hist = new Array(max + 1).fill(0);
    for (let i = 0; i < intValues.length; i++) {
      const v = intValues[i];
      if (typeof v === 'number' && Number.isInteger(v) && v >= 0) {
        hist[v]++;
      }
    }
    return hist;
  }

  const SortingModule = {
    countingSortBy,
    buildHistogram
  };

  global.SortingModule = SortingModule;

})(typeof window !== 'undefined' ? window : globalThis);
