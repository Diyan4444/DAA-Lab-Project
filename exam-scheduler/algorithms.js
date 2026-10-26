/**
 * Smart Exam Scheduler - Handcrafted Graph Coloring Algorithms
 * 
 * Implements:
 * 1. Sequential (Naive) Greedy Coloring (Baseline)
 * 2. Welsh-Powell Coloring (Main Algorithm - Degree descending, Class-by-Class)
 * 3. DSATUR (Brelaz's Degree of Saturation Algorithm)
 * 
 * STRICT: Handcrafted pure logic, deterministic tie-breaking (alphabetical),
 * records step logs for visualization, free of DOM dependencies.
 */

(function (global) {
  'use strict';

  /**
   * Helper to get high-resolution timestamp in both browser and Node.js.
   */
  function now() {
    if (typeof performance !== 'undefined' && performance.now) {
      return performance.now();
    }
    return Date.now();
  }

  /**
   * Identifies which neighbors of a subject have been assigned colors,
   * grouped by slot index.
   * 
   * @param {Object} graph 
   * @param {string} subject 
   * @param {Object} colorOf (subject -> slot)
   * @returns {Object} map of slotNumber -> array of neighbor names
   */
  function getNeighborColorMap(graph, subject, colorOf) {
    const blocked = {};
    const neighbors = graph.getNeighbors(subject);
    for (const nb of neighbors) {
      const col = colorOf[nb];
      if (col !== undefined && col !== null) {
        if (!blocked[col]) blocked[col] = [];
        blocked[col].push(nb);
      }
    }
    return blocked;
  }

  /**
   * Finds the smallest non-negative integer slot not present in the usedSlots set.
   * @param {Set<number>} usedSlots 
   * @returns {number}
   */
  function findSmallestAvailableSlot(usedSlots) {
    let slot = 0;
    while (usedSlots.has(slot)) {
      slot++;
    }
    return slot;
  }

  /**
   * 1. SEQUENTIAL (NAIVE) GREEDY COLORING
   * Colors vertices in the order they are listed in graph.subjects.
   * For each vertex, assigns the smallest available slot not used by its neighbors.
   * 
   * @param {Object} graph 
   * @param {boolean} [recordSteps=true]
   * @returns {Object} { colorOf, slotCount, steps, runtimeMs, algorithmName }
   */
  function sequentialGreedy(graph, recordSteps = true) {
    const startTime = now();
    const colorOf = {};
    const steps = [];

    // Subjects in initial order
    const subjects = [...graph.subjects];

    for (let i = 0; i < subjects.length; i++) {
      const subject = subjects[i];
      const blockedMap = getNeighborColorMap(graph, subject, colorOf);
      const usedSlots = new Set(Object.keys(blockedMap).map(Number));

      const chosenSlot = findSmallestAvailableSlot(usedSlots);
      colorOf[subject] = chosenSlot;

      if (recordSteps) {
        steps.push({
          stepIndex: steps.length + 1,
          subject,
          slot: chosenSlot,
          blockedSlots: blockedMap,
          explanation: chosenSlot === 0
            ? `${subject} -> Slot 0 (no colored neighbors yet)`
            : `${subject} -> Slot ${chosenSlot} (lower slots blocked by: ${
                Array.from(usedSlots)
                  .filter(s => s < chosenSlot)
                  .map(s => `Slot ${s} [${(blockedMap[s] || []).join(', ')}]`)
                  .join('; ')
              })`
        });
      }
    }

    const slotCount = subjects.length > 0
      ? Math.max(...Object.values(colorOf)) + 1
      : 0;

    const runtimeMs = now() - startTime;

    return {
      algorithmName: 'Sequential Greedy',
      colorOf,
      slotCount,
      steps,
      runtimeMs
    };
  }

  /**
   * 2. WELSH-POWELL COLORING (CLASS-BY-CLASS)
   * 1. Sort vertices by degree descending.
   *    Ties: weighted degree descending, then alphabetical by name ascending.
   * 2. While uncolored vertices remain:
   *    - Pick the first uncolored vertex in sorted order, assign it the current slot c.
   *    - Scan the remaining uncolored vertices in sorted order; assign slot c to any
   *      vertex not adjacent to ANY vertex already assigned slot c in this round.
   *    - Move to slot c + 1.
   * 
   * @param {Object} graph 
   * @param {boolean} [recordSteps=true]
   * @returns {Object} { colorOf, slotCount, steps, runtimeMs, algorithmName }
   */
  function welshPowell(graph, recordSteps = true) {
    const startTime = now();
    const colorOf = {};
    const steps = [];

    // Stable multi-key radix-style sort using Counting Sort:
    // 1. Least significant key: subject name ascending (comparison sort)
    // 2. Middle key: weighted degree descending (stable counting sort)
    // 3. Most significant key: degree descending (stable counting sort)
    let sorted = [...graph.subjects].sort((a, b) => a.localeCompare(b));
    if (global.SortingModule && global.SortingModule.countingSortBy) {
      sorted = global.SortingModule.countingSortBy(sorted, s => graph.weightedDegrees[s] || 0, { descending: true }).sorted;
      sorted = global.SortingModule.countingSortBy(sorted, s => graph.degrees[s] || 0, { descending: true }).sorted;
    } else {
      sorted.sort((a, b) => {
        const degDiff = graph.degrees[b] - graph.degrees[a];
        if (degDiff !== 0) return degDiff;
        const wDegDiff = graph.weightedDegrees[b] - graph.weightedDegrees[a];
        if (wDegDiff !== 0) return wDegDiff;
        return a.localeCompare(b);
      });
    }

    let uncolored = [...sorted];
    let currentSlot = 0;

    while (uncolored.length > 0) {
      const currentClass = [];
      const remainingUncolored = [];

      for (let i = 0; i < uncolored.length; i++) {
        const candidate = uncolored[i];

        // Check if candidate is adjacent to ANY subject already assigned currentSlot
        let hasConflictInSlot = false;
        for (const member of currentClass) {
          if (graph.hasEdge(candidate, member)) {
            hasConflictInSlot = true;
            break;
          }
        }

        if (!hasConflictInSlot) {
          // Color this candidate with currentSlot
          colorOf[candidate] = currentSlot;
          currentClass.push(candidate);

          if (recordSteps) {
            const blockedMap = getNeighborColorMap(graph, candidate, colorOf);
            // Identify which neighbors blocked previous slots
            const lowerSlots = [];
            for (let s = 0; s < currentSlot; s++) {
              if (blockedMap[s] && blockedMap[s].length > 0) {
                lowerSlots.push(`Slot ${s} [${blockedMap[s].join(', ')}]`);
              }
            }

            const reason = lowerSlots.length > 0
              ? ` (earlier slots blocked by: ${lowerSlots.join('; ')})`
              : currentClass.length > 1
                ? ` (independent of ${currentClass.slice(0, -1).join(', ')})`
                : ' (first in sorted degree order)';

            steps.push({
              stepIndex: steps.length + 1,
              subject: candidate,
              slot: currentSlot,
              degree: graph.degrees[candidate],
              blockedSlots: blockedMap,
              explanation: `${candidate} (deg ${graph.degrees[candidate]}) -> Slot ${currentSlot}${reason}`
            });
          }
        } else {
          remainingUncolored.push(candidate);
        }
      }

      uncolored = remainingUncolored;
      currentSlot++;
    }

    const slotCount = graph.subjects.length > 0 ? currentSlot : 0;
    const runtimeMs = now() - startTime;

    return {
      algorithmName: 'Welsh-Powell',
      colorOf,
      slotCount,
      steps,
      runtimeMs
    };
  }

  /**
   * 3. DSATUR (Degree of Saturation)
   * Dynamically chooses the vertex with the maximum saturation degree
   * (number of distinct colors assigned to its neighbors).
   * Ties broken by:
   * 1. Higher degree in the original graph
   * 2. Alphabetical order by name ascending
   * Assigns the lowest available color not used by its neighbors.
   * 
   * @param {Object} graph 
   * @param {boolean} [recordSteps=true]
   * @returns {Object} { colorOf, slotCount, steps, runtimeMs, algorithmName }
   */
  function dsatur(graph, recordSteps = true) {
    const startTime = now();
    const colorOf = {};
    const steps = [];

    // Track neighbor colors for each vertex
    const neighborColors = {};
    for (const subj of graph.subjects) {
      neighborColors[subj] = new Set();
    }

    const uncolored = new Set(graph.subjects);

    while (uncolored.size > 0) {
      // Find vertex with maximum saturation degree
      let bestVertex = null;
      let maxSat = -1;
      let maxDeg = -1;

      for (const v of uncolored) {
        const sat = neighborColors[v].size;
        const deg = graph.degrees[v];

        if (sat > maxSat) {
          maxSat = sat;
          maxDeg = deg;
          bestVertex = v;
        } else if (sat === maxSat) {
          if (deg > maxDeg) {
            maxDeg = deg;
            bestVertex = v;
          } else if (deg === maxDeg) {
            // Alphabetical tie-breaker
            if (!bestVertex || v.localeCompare(bestVertex) < 0) {
              bestVertex = v;
            }
          }
        }
      }

      // Assign smallest slot not used by bestVertex's neighbors
      const usedSlots = neighborColors[bestVertex];
      const chosenSlot = findSmallestAvailableSlot(usedSlots);
      colorOf[bestVertex] = chosenSlot;
      uncolored.delete(bestVertex);

      // Update neighbor saturation sets
      const neighbors = graph.getNeighbors(bestVertex);
      for (const nb of neighbors) {
        neighborColors[nb].add(chosenSlot);
      }

      if (recordSteps) {
        const blockedMap = getNeighborColorMap(graph, bestVertex, colorOf);
        const lowerBlocked = [];
        for (let s = 0; s < chosenSlot; s++) {
          if (blockedMap[s] && blockedMap[s].length > 0) {
            lowerBlocked.push(`Slot ${s} [${blockedMap[s].join(', ')}]`);
          }
        }

        steps.push({
          stepIndex: steps.length + 1,
          subject: bestVertex,
          slot: chosenSlot,
          saturation: maxSat,
          degree: maxDeg,
          blockedSlots: blockedMap,
          explanation: `${bestVertex} (sat: ${maxSat}, deg: ${maxDeg}) -> Slot ${chosenSlot}` +
            (lowerBlocked.length > 0 ? ` (blocked by: ${lowerBlocked.join('; ')})` : '')
        });
      }
    }

    const slotCount = graph.subjects.length > 0
      ? Math.max(...Object.values(colorOf)) + 1
      : 0;

    const runtimeMs = now() - startTime;

    return {
      algorithmName: 'DSATUR',
      colorOf,
      slotCount,
      steps,
      runtimeMs
    };
  }

  /**
   * Benchmark an algorithm by running it multiple times and averaging runtimeMs.
   * Steps recording is disabled during benchmarks to measure pure algorithmic performance.
   * 
   * @param {Object} graph 
   * @param {Function} algorithmFn 
   * @param {number} [repetitions=200]
   * @returns {{ avgRuntimeMs: number, result: Object }}
   */
  function benchmarkAlgorithm(graph, algorithmFn, repetitions = 200) {
    // Warmup run
    const result = algorithmFn(graph, false);

    const start = now();
    for (let r = 0; r < repetitions; r++) {
      algorithmFn(graph, false);
    }
    const totalMs = now() - start;
    const avgRuntimeMs = totalMs / repetitions;

    return {
      avgRuntimeMs,
      result
    };
  }

  const AlgorithmsModule = {
    sequentialGreedy,
    welshPowell,
    dsatur,
    benchmarkAlgorithm
  };

  global.AlgorithmsModule = AlgorithmsModule;

})(typeof window !== 'undefined' ? window : globalThis);
