/**
 * Smart Exam Scheduler - Timetable, Room Allocation, and Soft Constraint Engine
 * 
 * Includes:
 * 1. Timetable Generation with robust date/time mapping (avoiding timezone bugs).
 * 2. Back-to-back exam counter (same-day consecutive slots).
 * 3. Soft constraint optimizer ("Spread out exams" via slot reordering).
 * 4. Greedy Best-Fit-Decreasing Room Allocator with capacity shortfall warnings.
 * 5. Independent Clash Verifier.
 * 
 * STRICT: Pure logic, zero DOM dependencies.
 */

(function (global) {
  'use strict';

  const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  /**
   * Safe calendar date arithmetic using YYYY-MM-DD components.
   * Avoids UTC / local timezone boundary bugs.
   * 
   * @param {string} startDateStr YYYY-MM-DD
   * @param {number} dayOffset 0-indexed working day offset
   * @param {boolean} skipWeekends
   * @returns {{ dateStr: string, formatted: string, dayName: string }}
   */
  function computeExamDate(startDateStr, dayOffset, skipWeekends) {
    let year = 2026, month = 10, day = 26;
    if (startDateStr && /^\d{4}-\d{2}-\d{2}$/.test(startDateStr)) {
      const parts = startDateStr.split('-').map(Number);
      if (!isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
        year = parts[0];
        month = parts[1];
        day = parts[2];
      }
    }

    let cur = new Date(year, month - 1, day);
    if (isNaN(cur.getTime())) {
      cur = new Date(2026, 9, 26);
    }

    // If initial date is a weekend and skipWeekends is active, advance to Monday
    if (skipWeekends) {
      while (cur.getDay() === 0 || cur.getDay() === 6) {
        cur.setDate(cur.getDate() + 1);
      }
    }

    // Advance working days
    let added = 0;
    while (added < dayOffset) {
      cur.setDate(cur.getDate() + 1);
      if (skipWeekends && (cur.getDay() === 0 || cur.getDay() === 6)) {
        continue;
      }
      added++;
    }

    const y = cur.getFullYear();
    const m = String(cur.getMonth() + 1).padStart(2, '0');
    const d = String(cur.getDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${d}`;
    const dayName = DAY_NAMES[cur.getDay()];
    const formatted = `${dayName}, ${d} ${MONTH_NAMES[cur.getMonth()]} ${y}`;

    return { dateStr, formatted, dayName };
  }

  function localMulberry32(a) {
    return function () {
      let t = a += 0x6D2B79F5;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  /**
   * Precompute total conflict weight between two slot classes.
   * For two distinct slot classes A and B:
   * weight(A, B) = sum of edge weights between subjects in A and subjects in B.
   * 
   * @param {Object} graph 
   * @param {Object} colorClasses map of slotIndex -> array of subject names
   * @returns {number[][]}
   */
  function buildClassWeightMatrix(graph, colorClasses, slotCount) {
    const matrix = Array.from({ length: slotCount }, () => new Array(slotCount).fill(0));

    for (let a = 0; a < slotCount; a++) {
      const subjectsA = colorClasses[a] || [];
      for (let b = a + 1; b < slotCount; b++) {
        const subjectsB = colorClasses[b] || [];
        let total = 0;
        for (const sa of subjectsA) {
          for (const sb of subjectsB) {
            total += graph.getWeight(sa, sb);
          }
        }
        matrix[a][b] = total;
        matrix[b][a] = total;
      }
    }

    return matrix;
  }

  /**
   * Count the number of back-to-backs (same-day consecutive slots)
   * for a given slot ordering permutation.
   * 
   * @param {number[]} order Array of slot indices
   * @param {number[][]} weightMatrix 
   * @param {number} slotsPerDay 
   * @returns {number} Total back-to-back instances
   */
  function countBackToBackFromMatrix(order, weightMatrix, slotsPerDay) {
    if (slotsPerDay <= 1) return 0;
    let btb = 0;
    const K = order.length;

    for (let pos = 0; pos < K - 1; pos++) {
      const day1 = Math.floor(pos / slotsPerDay);
      const day2 = Math.floor((pos + 1) / slotsPerDay);
      if (day1 === day2) {
        const slotA = order[pos];
        const slotB = order[pos + 1];
        btb += weightMatrix[slotA][slotB];
      }
    }
    return btb;
  }

  /**
   * Soft constraint optimizer: "Spread out exams".
   * Reorders the color classes without altering any subject-to-slot assignment,
   * guaranteeing that the schedule remains 100% clash-free while minimizing
   * same-day back-to-back exams for students.
   * 
   * @param {Object} graph 
   * @param {Object} colorOf 
   * @param {number} slotsPerDay 
   * @param {number[]} [currentOrder]
   * @returns {{ originalOrder: number[], optimizedOrder: number[], beforeCount: number, afterCount: number, reduction: number }}
   */
  function spreadOutExams(graph, colorOf, slotsPerDay, currentOrder = null) {
    const slotCount = graph.subjects.length > 0 ? Math.max(...Object.values(colorOf)) + 1 : 0;
    if (slotCount <= 1 || slotsPerDay <= 1) {
      const natural = Array.from({ length: slotCount }, (_, i) => i);
      return {
        originalOrder: currentOrder || natural,
        optimizedOrder: currentOrder || natural,
        beforeCount: 0,
        afterCount: 0,
        reduction: 0
      };
    }

    const colorClasses = {};
    for (let s = 0; s < slotCount; s++) colorClasses[s] = [];
    for (const [subj, slot] of Object.entries(colorOf)) {
      colorClasses[slot].push(subj);
    }

    const weightMatrix = buildClassWeightMatrix(graph, colorClasses, slotCount);
    const naturalOrder = Array.from({ length: slotCount }, (_, i) => i);
    const initialOrder = currentOrder ? [...currentOrder] : naturalOrder;
    const beforeCount = countBackToBackFromMatrix(initialOrder, weightMatrix, slotsPerDay);

    let bestOrder = [...initialOrder];
    let bestCount = beforeCount;

    // If slotCount is small (<= 8), solve with exhaustive permutation search
    if (slotCount <= 8) {
      function permute(arr, l, r) {
        if (l === r) {
          const cost = countBackToBackFromMatrix(arr, weightMatrix, slotsPerDay);
          if (cost < bestCount) {
            bestCount = cost;
            bestOrder = [...arr];
          }
          return;
        }
        for (let i = l; i <= r; i++) {
          [arr[l], arr[i]] = [arr[i], arr[l]];
          permute(arr, l + 1, r);
          [arr[l], arr[i]] = [arr[i], arr[l]];
        }
      }
      permute([...naturalOrder], 0, slotCount - 1);
    } else {
      // For larger graphs, use multi-start 2-opt local search with seeded starts
      // Seed 0: Greedy nearest-neighbor
      // Seed 1: MST-preorder heuristic seed (Prim on weight matrix, ties by index)
      // Seeds 2..19: Deterministic seeded Fisher-Yates shuffle (Mulberry32)
      // Honest note: MST-preorder is a heuristic seed for a path through slots; 2-opt refines it.
      const runs = 20;

      for (let run = 0; run < runs; run++) {
        let order = [];
        const unassigned = new Set(naturalOrder);

        if (run === 0) {
          // Deterministic starting seed: greedy nearest-neighbor
          let cur = 0;
          order.push(cur);
          unassigned.delete(cur);
          while (unassigned.size > 0) {
            let nextSlot = null;
            let minWeight = Infinity;
            for (const cand of unassigned) {
              const w = weightMatrix[cur][cand];
              if (w < minWeight) {
                minWeight = w;
                nextSlot = cand;
              }
            }
            order.push(nextSlot);
            unassigned.delete(nextSlot);
            cur = nextSlot;
          }
        } else if (run === 1 && global.MSTModule && typeof global.MSTModule.prim === 'function' && typeof global.MSTModule.preorderFromTree === 'function') {
          // Heuristic seed: Prim MST preorder walk
          const primRes = global.MSTModule.prim(weightMatrix, 0);
          order = global.MSTModule.preorderFromTree(slotCount, primRes.edges, 0);
        } else {
          // Deterministic seeded Fisher-Yates shuffle using local mulberry32 PRNG
          order = [...naturalOrder];
          const rng = localMulberry32(1000 + run);
          for (let i = order.length - 1; i > 0; i--) {
            const j = Math.floor(rng() * (i + 1));
            [order[i], order[j]] = [order[j], order[i]];
          }
        }

        // 2-opt refinement
        let improved = true;
        let iter = 0;
        while (improved && iter < 100) {
          improved = false;
          iter++;
          for (let i = 0; i < slotCount - 1; i++) {
            for (let j = i + 1; j < slotCount; j++) {
              // Swap positions i and j
              [order[i], order[j]] = [order[j], order[i]];
              const currentCost = countBackToBackFromMatrix(order, weightMatrix, slotsPerDay);
              if (currentCost < bestCount) {
                bestCount = currentCost;
                bestOrder = [...order];
                improved = true;
              } else {
                // Revert
                [order[i], order[j]] = [order[j], order[i]];
              }
            }
          }
        }
      }
    }

    return {
      originalOrder: initialOrder,
      optimizedOrder: bestOrder,
      beforeCount,
      afterCount: bestCount,
      reduction: Math.max(0, beforeCount - bestCount)
    };
  }

  /**
   * Greedy Best-Fit-Decreasing Room Allocator
   * 
   * For each slot:
   * 1. Sort subjects by student count descending.
   * 2. For each subject:
   *    - Check if any single unbooked room fits the subject (capacity >= students).
   *      If so, pick the smallest single unbooked room that fits (minimizes wasted capacity).
   *      The room is marked booked for this slot (never double-booked).
   *    - If no single room fits:
   *      Split across the largest unbooked rooms until all students are seated.
   *      Each allocated room is marked booked for this slot.
   * 3. Rooms reset to free at the beginning of each new slot.
   * 4. If total free room capacity in a slot cannot seat all students,
   *    record a detailed shortfall warning.
   * 
   * @param {Object[]} timetableEntries 
   * @param {Array<{name: string, capacity: number}>} roomsList 
   * @returns {{ allocations: Object, warnings: Object[] }}
   */
  function allocateRooms(timetableEntries, roomsList) {
    const allocations = {}; // slotIndex -> [{ subject, studentCount, rooms: [{ room, seated }] }]
    const warnings = [];

    if (!roomsList || roomsList.length === 0) {
      warnings.push({
        slotNumber: 'All',
        message: 'No examination rooms provided. Please supply at least one room with capacity.'
      });
      return { allocations, warnings };
    }

    for (const entry of timetableEntries) {
      const slotIndex = entry.slotIndex;
      allocations[slotIndex] = [];

      // Clean list of available rooms for this slot
      const availableRooms = roomsList.map(r => ({ ...r, isBooked: false }));

      // Sort subjects in this slot by student count descending using counting sort when available
      const sortedSubjects = global.SortingModule && typeof global.SortingModule.countingSortBy === 'function'
        ? global.SortingModule.countingSortBy(entry.subjects, s => s.studentCount, { descending: true }).sorted
        : [...entry.subjects].sort((a, b) => b.studentCount - a.studentCount);

      for (const subj of sortedSubjects) {
        const needed = subj.studentCount;
        let remaining = needed;
        const assignedRooms = [];

        // 1. Try to find the smallest single unbooked room that fits
        let bestSingleRoomIdx = -1;
        let minSlack = Infinity;

        for (let i = 0; i < availableRooms.length; i++) {
          const room = availableRooms[i];
          if (!room.isBooked && room.capacity >= needed) {
            const slack = room.capacity - needed;
            if (slack < minSlack) {
              minSlack = slack;
              bestSingleRoomIdx = i;
            }
          }
        }

        if (bestSingleRoomIdx !== -1) {
          // Found best single room
          const room = availableRooms[bestSingleRoomIdx];
          room.isBooked = true;
          assignedRooms.push({
            name: room.name,
            seated: needed,
            capacity: room.capacity
          });
          remaining = 0;
        } else {
          // 2. No single room fits: split across largest unbooked rooms
          // Sort remaining unbooked rooms by capacity descending using counting sort when available
          const unbookedList = availableRooms.filter(r => !r.isBooked);
          const unbooked = global.SortingModule && typeof global.SortingModule.countingSortBy === 'function'
            ? global.SortingModule.countingSortBy(unbookedList, r => r.capacity, { descending: true }).sorted
            : unbookedList.sort((a, b) => b.capacity - a.capacity);

          for (const room of unbooked) {
            if (remaining <= 0) break;
            const seatCount = Math.min(room.capacity, remaining);
            room.isBooked = true;
            assignedRooms.push({
              name: room.name,
              seated: seatCount,
              capacity: room.capacity
            });
            remaining -= seatCount;
          }
        }

        if (remaining > 0) {
          warnings.push({
            slotIndex,
            slotNumber: entry.slotNumber,
            date: entry.date,
            time: entry.time,
            subject: subj.name,
            needed,
            seated: needed - remaining,
            shortfall: remaining,
            message: `Slot ${entry.slotNumber} (${entry.time}): "${subj.name}" needs ${needed} seats, but only ${needed - remaining} could be allocated (${remaining} students without seats).`
          });
        }

        allocations[slotIndex].push({
          subject: subj.name,
          studentCount: needed,
          rooms: assignedRooms,
          shortfall: remaining
        });
      }
    }

    return { allocations, warnings };
  }

  /**
   * Generates a complete examination timetable.
   * Maps colored slots to calendar dates and time slots,
   * runs room allocation, and computes back-to-back statistics.
   * 
   * @param {Object} params
   * @returns {Object} Timetable results
   */
  function generateTimetable(params) {
    const {
      graph,
      colorOf,
      startDate = '2026-10-26',
      slotsPerDay = 2,
      timeLabels = ['09:00 - 12:00', '14:00 - 17:00'],
      skipWeekends = true,
      slotOrder = null,
      rooms = []
    } = params;

    const slotCount = graph.subjects.length > 0 ? Math.max(...Object.values(colorOf)) + 1 : 0;
    const effectiveOrder = slotOrder || Array.from({ length: slotCount }, (_, i) => i);

    // Group subjects by color
    const subjectsInSlot = {};
    for (let s = 0; s < slotCount; s++) subjectsInSlot[s] = [];
    for (const [subj, slot] of Object.entries(colorOf)) {
      if (subjectsInSlot[slot]) {
        subjectsInSlot[slot].push({
          name: subj,
          studentCount: graph.subjectEnrollmentCount[subj] || 0
        });
      }
    }

    // Build ordered timetable entries
    const entries = [];
    for (let pos = 0; pos < effectiveOrder.length; pos++) {
      const slotIndex = effectiveOrder[pos];
      const dayOffset = Math.floor(pos / slotsPerDay);
      const timeIdx = pos % slotsPerDay;
      const timeLabel = timeLabels[timeIdx] || `Slot ${timeIdx + 1}`;
      const { dateStr, formatted, dayName } = computeExamDate(startDate, dayOffset, skipWeekends);

      const subjects = subjectsInSlot[slotIndex] || [];
      const totalStudents = subjects.reduce((sum, s) => sum + s.studentCount, 0);

      entries.push({
        position: pos + 1,
        slotNumber: pos + 1,
        slotIndex,
        date: dateStr,
        formattedDate: formatted,
        dayName,
        time: timeLabel,
        dayIndex: dayOffset,
        timeSlotIndex: timeIdx,
        subjects,
        totalStudentsInSlot: totalStudents
      });
    }

    // Allocate rooms
    const { allocations, warnings: roomWarnings } = allocateRooms(entries, rooms);

    // Merge room assignments into timetable entries
    for (const entry of entries) {
      entry.roomAllocations = allocations[entry.slotIndex] || [];
    }

    // Compute back-to-back count using student enrollment records
    const backToBackCount = countStudentBackToBack(entries, graph.students);

    // Calculate total exam days
    const uniqueDays = new Set(entries.map(e => e.date)).size;

    return {
      entries,
      slotOrder: effectiveOrder,
      slotCount,
      examDaysCount: uniqueDays,
      backToBackCount,
      roomWarnings,
      allocations
    };
  }

  /**
   * Independent exact counter for student back-to-back exams.
   * Checks every student against consecutive slots on the same calendar day.
   * 
   * @param {Object[]} entries Timetable entries
   * @param {Object[]} students Student enrollment list
   * @returns {number}
   */
  function countStudentBackToBack(entries, students) {
    if (entries.length <= 1) return 0;

    // Map each slotIndex to its set of subjects
    const slotSubjects = {};
    for (const e of entries) {
      slotSubjects[e.slotIndex] = new Set(e.subjects.map(s => s.name));
    }

    let btbCount = 0;

    // Check each consecutive pair on the same day
    for (let i = 0; i < entries.length - 1; i++) {
      const e1 = entries[i];
      const e2 = entries[i + 1];

      if (e1.date === e2.date && e1.timeSlotIndex + 1 === e2.timeSlotIndex) {
        const subjs1 = slotSubjects[e1.slotIndex];
        const subjs2 = slotSubjects[e2.slotIndex];

        for (const st of students) {
          const hasInSlot1 = st.subjects.some(s => subjs1.has(s));
          const hasInSlot2 = st.subjects.some(s => subjs2.has(s));
          if (hasInSlot1 && hasInSlot2) {
            btbCount++;
          }
        }
      }
    }

    return btbCount;
  }

  /**
   * INDEPENDENT CLASH VERIFIER
   * 
   * Audits the schedule strictly from first principles:
   * For every student, groups their enrolled subjects by assigned slot.
   * If any slot contains 2 or more subjects for that student, a clash is flagged.
   * 
   * @param {Array<{id: string, subjects: string[]}>} students 
   * @param {Object} colorOf (subject -> slot index)
   * @returns {{ valid: boolean, clashCount: number, clashes: Array<{studentId: string, slot: number, subjects: string[]}> }}
   */
  function verifySchedule(students, colorOf) {
    const clashes = [];

    for (const st of students) {
      const slotMap = {};

      for (const subj of st.subjects) {
        const slot = colorOf[subj];
        if (slot === undefined || slot === null) {
          // Unassigned subject flag
          clashes.push({
            studentId: st.id,
            slot: -1,
            subjects: [subj],
            reason: `Subject "${subj}" was not assigned any exam slot.`
          });
          continue;
        }

        if (!slotMap[slot]) {
          slotMap[slot] = [];
        }
        slotMap[slot].push(subj);
      }

      for (const [slot, subjs] of Object.entries(slotMap)) {
        if (subjs.length > 1) {
          clashes.push({
            studentId: st.id,
            slot: Number(slot),
            subjects: subjs,
            reason: `Student ${st.id} has ${subjs.length} exams in Slot ${slot}: [${subjs.join(', ')}].`
          });
        }
      }
    }

    return {
      valid: clashes.length === 0,
      clashCount: clashes.length,
      clashes
    };
  }

  /**
   * Selects the best coloring algorithm for the given graph:
   * Runs Sequential, Welsh-Powell, and DSATUR.
   * Compares candidates:
   * 1. Fewest slots used (minimum chromatic approximation)
   * 2. Fewer back-to-backs
   * 3. Welsh-Powell preferred over DSATUR, then Sequential
   * Verifies the chosen result has 0 clashes.
   * 
   * @param {Object} graph
   * @param {number} [slotsPerDay=2]
   * @returns {{ algorithmKey: string, algorithmName: string, friendlyName: string, result: Object, verification: Object, backToBackCount: number, candidates: Object[] }}
   */
  function selectBestAlgorithm(graph, slotsPerDay = 2) {
    const algos = [
      { key: 'welsh-powell', name: 'Welsh-Powell', friendlyName: 'Smart method: busiest subjects first', priority: 1, fn: global.AlgorithmsModule ? global.AlgorithmsModule.welshPowell : null },
      { key: 'dsatur', name: 'DSATUR', friendlyName: 'Smart method: most crowded subjects first', priority: 2, fn: global.AlgorithmsModule ? global.AlgorithmsModule.dsatur : null },
      { key: 'sequential', name: 'Sequential Greedy', friendlyName: 'Quick method (in the order given)', priority: 3, fn: global.AlgorithmsModule ? global.AlgorithmsModule.sequentialGreedy : null }
    ];

    const candidates = [];
    for (const a of algos) {
      if (!a.fn) continue;
      const res = a.fn(graph, true);
      const v = verifySchedule(graph.students, res.colorOf);
      const tt = generateTimetable({ graph, colorOf: res.colorOf, slotsPerDay });
      candidates.push({
        ...a,
        result: res,
        verification: v,
        backToBackCount: tt.backToBackCount,
        slotCount: res.slotCount
      });
    }

    candidates.sort((c1, c2) => {
      if (c1.verification.valid !== c2.verification.valid) {
        return c1.verification.valid ? -1 : 1;
      }
      if (c1.slotCount !== c2.slotCount) {
        return c1.slotCount - c2.slotCount;
      }
      if (c1.backToBackCount !== c2.backToBackCount) {
        return c1.backToBackCount - c2.backToBackCount;
      }
      return c1.priority - c2.priority;
    });

    const best = candidates[0];
    return {
      algorithmKey: best.key,
      algorithmName: best.name,
      friendlyName: best.friendlyName,
      result: best.result,
      verification: best.verification,
      backToBackCount: best.backToBackCount,
      candidates
    };
  }

  /**
   * 0/1 Knapsack optimization using bottom-up dynamic programming.
   * Maximizes total value within capacity, with deterministic backtracking.
   * 
   * @param {Array<{name: string, weight: number, value: number}>} items
   * @param {number} capacity
   * @returns {{ chosen: string[], totalWeight: number, totalValue: number, skipped: boolean, reason?: string }}
   */
  function knapsackSelect(items, capacity) {
    if (!items || items.length === 0 || capacity <= 0) {
      return { chosen: [], totalWeight: 0, totalValue: 0, skipped: false };
    }

    const n = items.length;
    const W = Math.floor(capacity);
    // Guard against memory explosion (> 4,000,000 cells)
    if ((n + 1) * (W + 1) > 4000000) {
      return { chosen: [], totalWeight: 0, totalValue: 0, skipped: true, reason: 'too-large' };
    }

    const cols = W + 1;
    const dp = new Int32Array((n + 1) * cols);

    for (let i = 1; i <= n; i++) {
      const item = items[i - 1];
      const wt = Math.floor(item.weight);
      const val = Math.floor(item.value);
      const rowPrev = (i - 1) * cols;
      const rowCurr = i * cols;

      for (let w = 0; w <= W; w++) {
        if (wt <= w) {
          const withItem = dp[rowPrev + (w - wt)] + val;
          const withoutItem = dp[rowPrev + w];
          dp[rowCurr + w] = withItem > withoutItem ? withItem : withoutItem;
        } else {
          dp[rowCurr + w] = dp[rowPrev + w];
        }
      }
    }

    // Deterministic backtracking: when dp[i][w] === dp[i-1][w], item i was NOT taken
    const chosen = [];
    let currW = W;
    let totalWeight = 0;
    let totalValue = 0;

    for (let i = n; i >= 1; i--) {
      const rowPrev = (i - 1) * cols;
      const rowCurr = i * cols;
      if (dp[rowCurr + currW] !== dp[rowPrev + currW]) {
        const item = items[i - 1];
        chosen.push(item.name);
        totalWeight += item.weight;
        totalValue += item.value;
        currW -= Math.floor(item.weight);
      }
    }

    chosen.reverse();
    return {
      chosen,
      totalWeight,
      totalValue,
      skipped: false
    };
  }

  /**
   * Plans room overflow moves for slots with insufficient capacity.
   * Uses 0/1 Knapsack to select the best subset of subjects to keep,
   * followed by an iterative reality check with allocateRooms.
   * 
   * @param {Object} timetable
   * @param {Array<{name: string, capacity: number}>} rooms
   * @returns {Array<{slotIndex: number, slotNumber: number, keep: string[], overflow: string[], unfixable: string[]}>}
   */
  function planRoomOverflow(timetable, rooms) {
    if (!timetable || !timetable.entries || !rooms || rooms.length === 0) {
      return [];
    }

    const totalCapacity = rooms.reduce((sum, r) => sum + (r.capacity || 0), 0);
    const plan = [];

    for (const entry of timetable.entries) {
      const totalNeeded = entry.subjects.reduce((sum, s) => sum + s.studentCount, 0);

      // Fast check: if total students fit in total capacity, check real allocation
      if (totalNeeded <= totalCapacity) {
        const testAlloc = allocateRooms([entry], rooms);
        if (testAlloc.warnings.length === 0) {
          continue; // Slot fits perfectly without warnings
        }
      }

      // Slot has shortfall: separate unfixable vs candidates
      const unfixable = [];
      const candidates = [];

      for (const subj of entry.subjects) {
        if (subj.studentCount > totalCapacity) {
          unfixable.push(subj.name);
        } else {
          candidates.push(subj);
        }
      }

      // Run 0/1 Knapsack on candidates
      const items = candidates.map(s => ({
        name: s.name,
        weight: s.studentCount,
        value: s.studentCount
      }));

      const ksRes = knapsackSelect(items, totalCapacity);
      const keepSet = new Set(ksRes.chosen);
      const overflowSet = new Set(candidates.filter(s => !keepSet.has(s.name)).map(s => s.name));

      // Reality check: allocateRooms gives whole rooms to subjects
      // Iteratively remove the subject named in the first warning until no warnings remain
      while (keepSet.size > 0) {
        const keptSubjects = entry.subjects.filter(s => keepSet.has(s.name));
        const testEntry = {
          slotIndex: entry.slotIndex,
          slotNumber: entry.slotNumber,
          date: entry.date,
          time: entry.time,
          subjects: keptSubjects
        };
        const testAlloc = allocateRooms([testEntry], rooms);
        if (testAlloc.warnings.length === 0) {
          break;
        }
        const warningSubj = testAlloc.warnings[0].subject;
        if (keepSet.has(warningSubj)) {
          keepSet.delete(warningSubj);
          overflowSet.add(warningSubj);
        } else {
          const firstKept = Array.from(keepSet)[0];
          keepSet.delete(firstKept);
          overflowSet.add(firstKept);
        }
      }

      const keep = entry.subjects.filter(s => keepSet.has(s.name)).map(s => s.name);
      const overflow = Array.from(overflowSet);

      if (overflow.length > 0 || unfixable.length > 0) {
        plan.push({
          slotIndex: entry.slotIndex,
          slotNumber: entry.slotNumber,
          keep,
          overflow,
          unfixable
        });
      }
    }

    return plan;
  }

  /**
   * Pure function: assigns overflow subjects to new slots.
   * Does NOT mutate inputs.
   * 
   * @param {Object} graph
   * @param {Object<string, number>} colorOf
   * @param {number[]} slotOrder
   * @param {Array<{slotIndex: number, slotNumber: number, keep: string[], overflow: string[], unfixable: string[]}>} plan
   * @returns {{ colorOf: Object<string, number>, slotOrder: number[], slotCount: number }}
   */
  function applyRoomOverflowPlan(graph, colorOf, slotOrder, plan) {
    const newColorOf = Object.assign({}, colorOf);
    let currentSlotCount = graph.subjects.length > 0 ? Math.max(...Object.values(colorOf)) + 1 : 0;
    const newSlotOrder = slotOrder ? [...slotOrder] : Array.from({ length: currentSlotCount }, (_, i) => i);

    if (Array.isArray(plan)) {
      for (const item of plan) {
        if (item.overflow && item.overflow.length > 0) {
          const newSlot = currentSlotCount++;
          for (const subj of item.overflow) {
            newColorOf[subj] = newSlot;
          }
          newSlotOrder.push(newSlot);
        }
      }
    }

    return {
      colorOf: newColorOf,
      slotOrder: newSlotOrder,
      slotCount: currentSlotCount
    };
  }

  const SchedulerModule = {
    computeExamDate,
    spreadOutExams,
    allocateRooms,
    generateTimetable,
    countStudentBackToBack,
    verifySchedule,
    selectBestAlgorithm,
    knapsackSelect,
    planRoomOverflow,
    applyRoomOverflowPlan
  };

  global.SchedulerModule = SchedulerModule;

})(typeof window !== 'undefined' ? window : globalThis);
