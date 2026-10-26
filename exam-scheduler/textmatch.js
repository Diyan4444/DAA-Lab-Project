/**
 * Smart Exam Scheduler - Text Matching & Typo Catcher Module (DP)
 * 
 * Implements:
 * - Levenshtein Edit Distance (O(m * n) DP table)
 * - Longest Common Subsequence (LCS length, string backtracking, and ratio)
 * - Course level suffix detection (Maths-II vs Maths-III protection)
 * - findSimilarSubjects: Near-duplicate subject detector
 * - applySubjectMerges: Pure student record subject remapping
 * 
 * STRICT: Pure logic, zero DOM dependencies.
 */

(function (global) {
  'use strict';

  /**
   * Normalizes text: trims, lowercases, collapses whitespace runs to single space.
   */
  function normalizeName(s) {
    if (!s || typeof s !== 'string') return '';
    return s.trim().toLowerCase().replace(/\s+/g, ' ');
  }

  /**
   * Levenshtein Edit Distance via full (m+1) x (n+1) DP table.
   * Insertion, Deletion, and Substitution each cost 1.
   * 
   * @param {string} a 
   * @param {string} b 
   * @returns {number}
   */
  function levenshtein(a, b) {
    const s1 = a || '';
    const s2 = b || '';
    const m = s1.length;
    const n = s2.length;

    if (m === 0) return n;
    if (n === 0) return m;

    const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (s1[i - 1] === s2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1];
        } else {
          dp[i][j] = 1 + Math.min(
            dp[i - 1][j],     // deletion
            dp[i][j - 1],     // insertion
            dp[i - 1][j - 1]  // substitution
          );
        }
      }
    }

    return dp[m][n];
  }

  /**
   * Longest Common Subsequence (LCS) Length via full DP table.
   * 
   * @param {string} a 
   * @param {string} b 
   * @returns {number}
   */
  function lcsLength(a, b) {
    const s1 = a || '';
    const s2 = b || '';
    const m = s1.length;
    const n = s2.length;

    if (m === 0 || n === 0) return 0;

    const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (s1[i - 1] === s2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1] + 1;
        } else {
          dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
      }
    }

    return dp[m][n];
  }

  /**
   * Longest Common Subsequence (LCS) String by backtracking on DP table.
   * 
   * @param {string} a 
   * @param {string} b 
   * @returns {string}
   */
  function lcsString(a, b) {
    const s1 = a || '';
    const s2 = b || '';
    const m = s1.length;
    const n = s2.length;

    if (m === 0 || n === 0) return '';

    const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (s1[i - 1] === s2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1] + 1;
        } else {
          dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
      }
    }

    // Backtrack from dp[m][n]
    let i = m;
    let j = n;
    const chars = [];

    while (i > 0 && j > 0) {
      if (s1[i - 1] === s2[j - 1]) {
        chars.push(s1[i - 1]);
        i--;
        j--;
      } else if (dp[i - 1][j] >= dp[i][j - 1]) {
        i--;
      } else {
        j--;
      }
    }

    return chars.reverse().join('');
  }

  /**
   * LCS Similarity Ratio: 2 * lcsLength / (a.length + b.length).
   * Range [0, 1]. Returns 1 if both empty.
   */
  function lcsRatio(a, b) {
    const s1 = a || '';
    const s2 = b || '';
    const totalLen = s1.length + s2.length;
    if (totalLen === 0) return 1;
    const len = lcsLength(s1, s2);
    return (2 * len) / totalLen;
  }

  /**
   * Suffix level marker detection.
   * Detects trailing level indicators such as:
   * - Digits: "maths 2", "physics-1", "maths3"
   * - Roman numerals (i to x) strictly preceded by space, hyphen, or underscore:
   *   "Maths-II", "Physics_III", "Course I".
   * The separator requirement ensures that words like "Linux" are NEVER split.
   * 
   * @param {string} normalizedName 
   * @returns {{ core: string, suffix: string }}
   */
  function splitLevelSuffix(normalizedName) {
    const s = normalizedName || '';

    // Check for Roman numeral suffix preceded by space, hyphen, or underscore
    const romanRegex = /[\s\-_]+(i|ii|iii|iv|v|vi|vii|viii|ix|x)$/i;
    const romanMatch = s.match(romanRegex);
    if (romanMatch) {
      const suffix = romanMatch[1].toLowerCase();
      const core = s.slice(0, romanMatch.index).trim();
      return { core, suffix };
    }

    // Check for trailing digit(s) preceded by optional space/hyphen/underscore
    const digitRegex = /[\s\-_]*(\d+)$/;
    const digitMatch = s.match(digitRegex);
    if (digitMatch) {
      const suffix = digitMatch[1];
      const core = s.slice(0, digitMatch.index).trim();
      return { core, suffix };
    }

    return { core: s, suffix: '' };
  }

  /**
   * Find candidate similar subjects (typo catcher).
   * Compares all pairs of subject names.
   * 
   * @param {string[]} names 
   * @param {Object} enrollmentCounts Map of subjectName -> studentCount
   * @param {Object} [options]
   * @returns {{ pairs: Array, skipped: boolean }}
   */
  function findSimilarSubjects(names, enrollmentCounts = {}, options = {}) {
    const opts = Object.assign({
      maxDistance: 2,
      minLcsRatio: 0.85,
      minLength: 4,
      maxSubjects: 300,
      dismissed: null
    }, options);

    const dismissedSet = opts.dismissed instanceof Set
      ? opts.dismissed
      : new Set(opts.dismissed || []);

    const uniqueNames = Array.from(new Set(names || []));
    const V = uniqueNames.length;

    if (V > opts.maxSubjects) {
      const skippedArr = [];
      skippedArr.skipped = true;
      return skippedArr;
    }

    const candidatePairs = [];

    for (let i = 0; i < V; i++) {
      for (let j = i + 1; j < V; j++) {
        const rawA = uniqueNames[i];
        const rawB = uniqueNames[j];

        // Pair key is independent of order
        const pairKey = [rawA, rawB].sort().join('|||');
        if (dismissedSet.has(pairKey)) {
          continue;
        }

        const normA = normalizeName(rawA);
        const normB = normalizeName(rawB);

        // Skip if either is shorter than minLength
        if (normA.length < opts.minLength || normB.length < opts.minLength) {
          continue;
        }

        // Level suffix detection: Maths-II vs Maths-III are distinct courses, not typos
        const splitA = splitLevelSuffix(normA);
        const splitB = splitLevelSuffix(normB);

        if (splitA.suffix && splitB.suffix && splitA.core === splitB.core && splitA.suffix !== splitB.suffix) {
          continue; // Different levels
        }

        // Skip if names differ ONLY in digits
        const stripDigitsA = normA.replace(/\d+/g, '');
        const stripDigitsB = normB.replace(/\d+/g, '');
        if (stripDigitsA === stripDigitsB && normA !== normB) {
          continue;
        }

        const dist = levenshtein(normA, normB);
        const ratio = lcsRatio(normA, normB);

        // Extra space difference (dist === 0 on normalized, raw text differs)
        let isMatch = false;
        let reason = 'typo';

        if (normA === normB && rawA !== rawB) {
          isMatch = true;
          reason = 'extra spaces';
        } else if (dist <= opts.maxDistance && ratio >= opts.minLcsRatio) {
          isMatch = true;
          reason = 'similar spelling';
        }

        if (isMatch) {
          const countA = enrollmentCounts[rawA] || 0;
          const countB = enrollmentCounts[rawB] || 0;

          // Keep name with more students; tie-break alphabetically
          let keepName = rawA;
          let mergeName = rawB;

          if (countB > countA) {
            keepName = rawB;
            mergeName = rawA;
          } else if (countB === countA) {
            if (rawB.localeCompare(rawA) < 0) {
              keepName = rawB;
              mergeName = rawA;
            }
          }

          candidatePairs.push({
            a: rawA,
            b: rawB,
            distance: dist,
            lcsRatio: ratio,
            keepName,
            mergeName,
            countA,
            countB,
            reason,
            pairKey
          });
        }
      }
    }

    // Sort deterministically: distance ascending, then keepName, then mergeName
    candidatePairs.sort((x, y) => {
      if (x.distance !== y.distance) return x.distance - y.distance;
      const kCmp = x.keepName.localeCompare(y.keepName);
      if (kCmp !== 0) return kCmp;
      return x.mergeName.localeCompare(y.mergeName);
    });

    candidatePairs.skipped = false;
    return candidatePairs;
  }

  /**
   * Apply subject renames/merges to students array without mutating inputs.
   * De-duplicates and sorts subjects per student.
   * 
   * @param {Array<{id: string, subjects: string[]}>} students 
   * @param {Object|Map} mergeMap oldName -> newName
   * @returns {Array<{id: string, subjects: string[]}>}
   */
  function applySubjectMerges(students, mergeMap) {
    if (!students || !Array.isArray(students)) return [];

    const getReplacement = (name) => {
      if (!mergeMap) return name;
      if (mergeMap instanceof Map) {
        return mergeMap.has(name) ? mergeMap.get(name) : name;
      }
      return Object.prototype.hasOwnProperty.call(mergeMap, name) ? mergeMap[name] : name;
    };

    const result = [];
    for (let i = 0; i < students.length; i++) {
      const st = students[i];
      const mergedSet = new Set();
      for (let j = 0; j < st.subjects.length; j++) {
        const original = st.subjects[j];
        const replaced = getReplacement(original);
        if (replaced) {
          mergedSet.add(replaced);
        }
      }
      result.push({
        id: st.id,
        subjects: Array.from(mergedSet).sort((a, b) => a.localeCompare(b))
      });
    }

    return result;
  }

  const TextMatchModule = {
    normalizeName,
    levenshtein,
    lcsLength,
    lcsString,
    lcsRatio,
    splitLevelSuffix,
    findSimilarSubjects,
    applySubjectMerges
  };

  global.TextMatchModule = TextMatchModule;

})(typeof window !== 'undefined' ? window : globalThis);
