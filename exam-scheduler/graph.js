/**
 * Smart Exam Scheduler - Graph & Parsing Engine
 * 
 * Handles parsing:
 * 1. Friendly format: "Riya: Maths, Physics, Chemistry"
 * 2. Wide CSV format: "student_id,subjects"
 * 3. Long CSV format: "student_id,subject"
 * 
 * Tracks skipped lines, casing normalizations, and builds conflict graph.
 * STRICT: Pure logic, zero DOM dependencies.
 */

(function (global) {
  'use strict';

  /**
   * RFC 4180 compliant CSV line tokenizer.
   * Handles commas within quotes and escaped quotes ("").
   * @param {string} text 
   * @returns {string[][]} Array of row tokens
   */
  function tokenizeCSV(text) {
    if (!text || typeof text !== 'string') return [];

    // Strip UTF-8 BOM if present
    if (text.charCodeAt(0) === 0xFEFF) {
      text = text.slice(1);
    }

    const rows = [];
    let currentRow = [];
    let currentCell = '';
    let insideQuotes = false;
    let i = 0;
    const len = text.length;

    while (i < len) {
      const char = text[i];
      const nextChar = text[i + 1];

      if (insideQuotes) {
        if (char === '"') {
          if (nextChar === '"') {
            currentCell += '"';
            i += 2;
            continue;
          } else {
            insideQuotes = false;
            i++;
            continue;
          }
        } else {
          currentCell += char;
          i++;
          continue;
        }
      } else {
        if (char === '"') {
          insideQuotes = true;
          i++;
          continue;
        } else if (char === ',') {
          currentRow.push(currentCell.trim());
          currentCell = '';
          i++;
          continue;
        } else if (char === '\r') {
          if (nextChar === '\n') i++;
          currentRow.push(currentCell.trim());
          if (currentRow.some(c => c.length > 0)) {
            rows.push(currentRow);
          }
          currentRow = [];
          currentCell = '';
          i++;
          continue;
        } else if (char === '\n') {
          currentRow.push(currentCell.trim());
          if (currentRow.some(c => c.length > 0)) {
            rows.push(currentRow);
          }
          currentRow = [];
          currentCell = '';
          i++;
          continue;
        } else {
          currentCell += char;
          i++;
          continue;
        }
      }
    }

    currentRow.push(currentCell.trim());
    if (currentRow.some(c => c.length > 0)) {
      rows.push(currentRow);
    }

    return rows;
  }

  /**
   * Parse student enrollments from raw text.
   * Supports:
   * 1. Friendly format: "Student Name: Subj1, Subj2, Subj3"
   * 2. Wide CSV format: "student_id,subjects"
   * 3. Long CSV format: "student_id,subject"
   * 
   * @param {string} rawText 
   * @returns {{
   *   students: Array<{id: string, subjects: string[]}>,
   *   subjectDisplayMap: Object,
   *   skippedLines: number[],
   *   casingMerges: Array<{original: string, canonical: string}>,
   *   format: string
   * }}
   */
  function parseEnrollmentCSV(rawText) {
    if (!rawText || !rawText.trim()) {
      const err = new Error("We don't have any data yet. Type in your students and subjects, upload a file, or click 'Try with example data'.");
      err.code = 'EMPTY_INPUT';
      throw err;
    }

    // Strip UTF-8 BOM if present
    let cleanText = rawText;
    if (cleanText.charCodeAt(0) === 0xFEFF) {
      cleanText = cleanText.slice(1);
    }

    const lines = cleanText.split(/\r?\n/);
    const skippedLines = [];
    const casingMerges = [];
    const subjectDisplayMap = {};

    const getCanonicalSubject = (rawName) => {
      const trimmed = rawName.trim();
      if (!trimmed) return null;
      const lower = trimmed.toLowerCase();
      if (!subjectDisplayMap[lower]) {
        subjectDisplayMap[lower] = trimmed;
      } else if (subjectDisplayMap[lower] !== trimmed) {
        if (!casingMerges.some(m => m.original === trimmed && m.canonical === subjectDisplayMap[lower])) {
          casingMerges.push({ original: trimmed, canonical: subjectDisplayMap[lower] });
        }
      }
      return subjectDisplayMap[lower];
    };

    // Auto-detect format
    // Check if first non-empty line has CSV header
    let firstNonEmptyLine = '';
    for (const l of lines) {
      if (l.trim()) {
        firstNonEmptyLine = l.trim();
        break;
      }
    }

    const lowerFirst = firstNonEmptyLine.toLowerCase();
    const isCsvHeader = lowerFirst.includes('student_id') && (lowerFirst.includes('subjects') || lowerFirst.includes('subject'));
    const hasColon = lines.some(l => l.includes(':'));

    let format = 'friendly';
    if (isCsvHeader) {
      format = lowerFirst.includes('subjects') ? 'wide' : 'long';
    } else if (!hasColon) {
      // If no colon and not CSV header, check if it looks like comma separated lines
      const tokens = tokenizeCSV(cleanText);
      if (tokens.length > 0 && tokens[0].length >= 2) {
        // Maybe headerless CSV or unrecognized header
        const err = new Error("We couldn't understand this data. Each line should look like 'Riya: Maths, Physics'. See the example below or click 'Try with example data'.");
        err.code = 'UNRECOGNIZED_FORMAT';
        throw err;
      } else {
        const err = new Error("We couldn't understand this data. Each line should look like 'Riya: Maths, Physics'. See the example below or click 'Try with example data'.");
        err.code = 'UNRECOGNIZED_FORMAT';
        throw err;
      }
    }

    const studentEnrollments = new Map(); // studentId -> Set of canonical subjects

    if (format === 'friendly') {
      // Parse friendly format line-by-line: "Name: Subj1, Subj2, Subj3"
      for (let i = 0; i < lines.length; i++) {
        const lineNum = i + 1;
        const line = lines[i].trim();
        if (!line) continue; // blank lines ignored silently

        const colonIdx = line.indexOf(':');
        if (colonIdx === -1) {
          skippedLines.push(lineNum);
          continue;
        }

        const studentId = line.substring(0, colonIdx).trim();
        const subjectPart = line.substring(colonIdx + 1).trim();

        if (!studentId || !subjectPart) {
          skippedLines.push(lineNum);
          continue;
        }

        // Split subjects by comma or semicolon
        const rawSubjs = subjectPart.split(/[,;]/).map(s => s.trim()).filter(Boolean);
        if (rawSubjs.length === 0) {
          skippedLines.push(lineNum);
          continue;
        }

        if (!studentEnrollments.has(studentId)) {
          studentEnrollments.set(studentId, new Set());
        }
        const subjSet = studentEnrollments.get(studentId);

        for (const s of rawSubjs) {
          const canon = getCanonicalSubject(s);
          if (canon) subjSet.add(canon);
        }
      }
    } else {
      // Standard CSV parsing (wide or long)
      const rows = tokenizeCSV(cleanText);
      if (rows.length <= 1) {
        const err = new Error("We don't have any data yet. Type in your students and subjects, upload a file, or click 'Try with example data'.");
        err.code = 'EMPTY_DATA';
        throw err;
      }

      const header = rows[0].map(h => h.trim().toLowerCase());
      const idIndex = header.indexOf('student_id');
      const subjIndex = format === 'wide' ? header.indexOf('subjects') : header.indexOf('subject');

      for (let r = 1; r < rows.length; r++) {
        const lineNum = r + 1;
        const row = rows[r];
        if (!row || row.length === 0 || (row.length === 1 && !row[0])) continue;

        const studentId = row[idIndex]?.trim();
        const subjectData = row[subjIndex]?.trim() || '';

        if (!studentId || !subjectData) {
          skippedLines.push(lineNum);
          continue;
        }

        if (!studentEnrollments.has(studentId)) {
          studentEnrollments.set(studentId, new Set());
        }
        const subjSet = studentEnrollments.get(studentId);

        if (format === 'wide') {
          const splitSubjects = subjectData.split(';').map(s => s.trim()).filter(Boolean);
          if (splitSubjects.length === 0) {
            skippedLines.push(lineNum);
            continue;
          }
          for (const s of splitSubjects) {
            const canon = getCanonicalSubject(s);
            if (canon) subjSet.add(canon);
          }
        } else {
          const canon = getCanonicalSubject(subjectData);
          if (canon) subjSet.add(canon);
          else skippedLines.push(lineNum);
        }
      }
    }

    // Build students array
    const students = [];
    for (const [id, subjSet] of studentEnrollments.entries()) {
      if (subjSet.size > 0) {
        students.push({
          id: id,
          subjects: Array.from(subjSet).sort()
        });
      }
    }

    if (students.length === 0) {
      const err = new Error("We couldn't find any students with subjects in this data. Please check your data or try the example data.");
      err.code = 'NO_STUDENTS';
      throw err;
    }

    const distinctSubjects = Object.values(subjectDisplayMap);
    if (distinctSubjects.length < 2) {
      const err = new Error(`We need at least 2 different subjects to make a timetable. Right now we found only ${distinctSubjects.length}.`);
      err.code = 'FEW_SUBJECTS';
      err.count = distinctSubjects.length;
      throw err;
    }

    // Check if only one student or every student has the exact same single subject
    if (students.length === 1) {
      const err = new Error("We only found 1 student. You don't need an exam timetable for just one student! Add more students to make a schedule.");
      err.code = 'SINGLE_STUDENT';
      throw err;
    }

    return {
      students,
      subjectDisplayMap,
      skippedLines,
      casingMerges,
      format
    };
  }

  /**
   * Parse room capacities from CSV/text.
   * Header: room_name,capacity
   * 
   * @param {string} csvText 
   * @returns {Array<{name: string, capacity: number}>}
   */
  function parseRoomsCSV(csvText) {
    if (!csvText || !csvText.trim()) return [];

    const rows = tokenizeCSV(csvText);
    if (rows.length === 0) return [];

    const header = rows[0].map(h => h.toLowerCase());
    const nameIdx = header.indexOf('room_name') !== -1 ? header.indexOf('room_name') : 0;
    const capIdx = header.indexOf('capacity') !== -1 ? header.indexOf('capacity') : 1;

    const rooms = [];
    const skippedRoomLines = [];

    for (let r = 1; r < rows.length; r++) {
      const lineNum = r + 1;
      const row = rows[r];
      if (!row || row.length === 0 || (row.length === 1 && !row[0])) continue;

      const name = row[nameIdx]?.trim();
      const cap = parseInt(row[capIdx]?.trim(), 10);

      if (name && !isNaN(cap) && cap > 0) {
        rooms.push({ name, capacity: cap });
      } else {
        skippedRoomLines.push({ lineNum, text: row.join(',') });
      }
    }

    rooms.skippedLines = skippedRoomLines;
    return rooms;
  }

  /**
   * Build the undirected conflict graph from student enrollments.
   * 
   * @param {Array<{id: string, subjects: string[]}>} students 
   * @param {Object} [subjectDisplayMap]
   * @returns {Object} Graph representation
   */
  function buildConflictGraph(students, subjectDisplayMap = {}) {
    const subjectSet = new Set();
    const subjectEnrollmentCount = {};

    for (const st of students) {
      for (const subj of st.subjects) {
        subjectSet.add(subj);
        subjectEnrollmentCount[subj] = (subjectEnrollmentCount[subj] || 0) + 1;
      }
    }

    const subjects = Array.from(subjectSet).sort();
    const adjacency = {};
    for (const subj of subjects) {
      adjacency[subj] = {};
    }

    for (const st of students) {
      const subjs = st.subjects;
      const n = subjs.length;
      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          const u = subjs[i];
          const v = subjs[j];
          adjacency[u][v] = (adjacency[u][v] || 0) + 1;
          adjacency[v][u] = (adjacency[v][u] || 0) + 1;
        }
      }
    }

    const degrees = {};
    const weightedDegrees = {};
    const edges = [];
    let maxDegree = 0;

    for (let i = 0; i < subjects.length; i++) {
      const u = subjects[i];
      const neighbors = Object.keys(adjacency[u]);
      degrees[u] = neighbors.length;
      if (degrees[u] > maxDegree) {
        maxDegree = degrees[u];
      }

      let weightSum = 0;
      for (const v of neighbors) {
        const w = adjacency[u][v];
        weightSum += w;
        if (u < v) {
          edges.push({ u, v, weight: w });
        }
      }
      weightedDegrees[u] = weightSum;
    }

    const V = subjects.length;
    const E = edges.length;
    const density = V >= 2 ? (2 * E) / (V * (V - 1)) : 0;

    return {
      subjects,
      students,
      adjacency,
      degrees,
      weightedDegrees,
      edges,
      subjectEnrollmentCount,
      studentCount: students.length,
      subjectCount: V,
      edgeCount: E,
      maxDegree,
      upperBound: maxDegree + 1,
      density,
      getNeighbors: function (subj) {
        return Object.keys(adjacency[subj] || {});
      },
      hasEdge: function (u, v) {
        return Boolean(adjacency[u] && adjacency[u][v] > 0);
      },
      getWeight: function (u, v) {
        return (adjacency[u] && adjacency[u][v]) || 0;
      }
    };
  }

  const GraphModule = {
    tokenizeCSV,
    parseEnrollmentCSV,
    parseRoomsCSV,
    buildConflictGraph
  };

  global.GraphModule = GraphModule;

})(typeof window !== 'undefined' ? window : globalThis);
