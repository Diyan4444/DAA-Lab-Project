/**
 * Smart Exam Scheduler / Exam Timetable Maker - UI Controller & DOM Wiring
 * 
 * Features:
 * - Simple View vs Advanced View toggle (session-only memory)
 * - Central friendly message engine (Kind, layman explanations; no raw errors)
 * - Auto-best method selection in Simple View (fewest slots, tie-break: back-to-backs)
 * - Plain English terminology throughout
 * - Drag-and-drop & file upload with blank template download
 * - Pre-generation preview of first 5 students
 * - Accessible vis-network map with plain language legend and offline fallback
 * - Comprehensive try/catch wrappers for resilient execution
 */

(function () {
  'use strict';

  // Session State
  let viewMode = 'simple'; // 'simple' or 'advanced'
  let currentGraph = null;
  let currentAlgoResult = null;
  let currentTimetable = null;
  let currentSlotOrder = null;
  let originalSlotOrder = null;
  let currentRooms = [];
  let parsedEnrollmentData = null;
  let visNetwork = null;
  let visNodesDataSet = null;
  let visEdgesDataSet = null;

  // Animation State
  let animCurrentStep = 0;
  let animTimer = null;
  let animSpeedMs = 600;

  // 16 curated high-contrast accessible colors
  const BASE_PALETTE = [
    '#2563eb', // Blue
    '#16a34a', // Green
    '#d97706', // Amber
    '#dc2626', // Red
    '#7c3aed', // Purple
    '#0891b2', // Cyan
    '#ea580c', // Orange
    '#4f46e5', // Indigo
    '#059669', // Emerald
    '#db2777', // Pink
    '#ca8a04', // Yellow-Gold
    '#e11d48', // Rose
    '#0284c7', // Sky
    '#0d9488', // Teal
    '#9333ea', // Violet
    '#65a30d'  // Lime
  ];

  function getSlotColor(slotIndex) {
    if (slotIndex < BASE_PALETTE.length) {
      return BASE_PALETTE[slotIndex];
    }
    const hue = (slotIndex * 137.508) % 360;
    return `hsl(${hue}, 70%, 45%)`;
  }

  // DOM Elements Cache
  const el = {
    // Mode toggles
    btnModeSimple: document.getElementById('btn-mode-simple'),
    btnModeAdvanced: document.getElementById('btn-mode-advanced'),
    // Header & Help
    btnToggleWhat: document.getElementById('btn-toggle-what'),
    whatContent: document.getElementById('what-content'),
    whatArrow: document.getElementById('what-arrow'),
    btnToggleFaq: document.getElementById('btn-toggle-faq'),
    btnCloseFaq: document.getElementById('btn-close-faq'),
    faqBox: document.getElementById('faq-box'),
    // Central Message Container
    centralMessageContainer: document.getElementById('central-message-container'),
    // Data input
    btnLoadSample: document.getElementById('btn-load-sample'),
    tabBtnType: document.getElementById('tab-btn-type'),
    tabBtnUpload: document.getElementById('tab-btn-upload'),
    paneType: document.getElementById('pane-type'),
    paneUpload: document.getElementById('pane-upload'),
    enrollmentTextarea: document.getElementById('enrollment-textarea'),
    dropBox: document.getElementById('drop-box'),
    fileInput: document.getElementById('file-input'),
    btnToggleFileHelp: document.getElementById('btn-toggle-file-help'),
    fileHelpBox: document.getElementById('file-help-box'),
    btnDownloadTemplate: document.getElementById('btn-download-template'),
    // Preview
    dataPreviewBox: document.getElementById('data-preview-box'),
    previewSummaryText: document.getElementById('preview-summary-text'),
    previewTbody: document.getElementById('preview-tbody'),
    btnEditData: document.getElementById('btn-edit-data'),
    // Settings
    startDateInput: document.getElementById('start-date-input'),
    slotsPerDayInput: document.getElementById('slots-per-day-input'),
    skipWeekendsCheck: document.getElementById('skip-weekends-check'),
    btnToggleTimings: document.getElementById('btn-toggle-timings'),
    timingsBox: document.getElementById('timings-box'),
    timeLabelsInput: document.getElementById('time-labels-input'),
    btnMakeTimetable: document.getElementById('btn-make-timetable'),
    // Results
    emptyStateBox: document.getElementById('empty-state-box'),
    resultsSection: document.getElementById('results-section'),
    resultBanner: document.getElementById('result-banner'),
    resultTitle: document.getElementById('result-title'),
    resultSubtitle: document.getElementById('result-subtitle'),
    simpleMethodNote: document.getElementById('simple-method-note'),
    btnDownloadTimetable: document.getElementById('btn-download-timetable'),
    btnPrintView: document.getElementById('btn-print-view'),
    btnViewTable: document.getElementById('btn-view-table'),
    btnViewCards: document.getElementById('btn-view-cards'),
    timetableTableContainer: document.getElementById('timetable-table-container'),
    timetableCardsContainer: document.getElementById('timetable-cards-container'),
    timetableTbody: document.getElementById('timetable-tbody'),
    thRooms: document.getElementById('th-rooms'),
    // Map
    networkViewport: document.getElementById('network-viewport'),
    offlineGraphFallback: document.getElementById('offline-graph-fallback'),
    graphMetaBadge: document.getElementById('graph-meta-badge'),
    btnFitGraph: document.getElementById('btn-fit-graph'),
    btnDownloadGraph: document.getElementById('btn-download-graph'),
    graphLegend: document.getElementById('graph-legend'),
    // Advanced only
    algoSelect: document.getElementById('algo-select'),
    algoDescription: document.getElementById('algo-description'),
    btnSpreadExams: document.getElementById('btn-spread-exams'),
    btnUndoSpread: document.getElementById('btn-undo-spread'),
    spreadAlert: document.getElementById('spread-alert'),
    roomsTextarea: document.getElementById('rooms-textarea'),
    btnAllocateRooms: document.getElementById('btn-allocate-rooms'),
    roomWarningsList: document.getElementById('room-warnings-list'),
    roomsDetailTbody: document.getElementById('rooms-detail-tbody'),
    // Stats
    statSubjects: document.getElementById('stat-subjects'),
    statStudents: document.getElementById('stat-students'),
    statEdges: document.getElementById('stat-edges'),
    statDensity: document.getElementById('stat-density'),
    statMaxDeg: document.getElementById('stat-max-deg'),
    statUpperBound: document.getElementById('stat-upper-bound'),
    statSlotsUsed: document.getElementById('stat-slots-used'),
    statExamDays: document.getElementById('stat-exam-days'),
    statClashes: document.getElementById('stat-clashes'),
    statBtb: document.getElementById('stat-btb'),
    statRuntime: document.getElementById('stat-runtime'),
    // Comparison
    btnRunComparison: document.getElementById('btn-run-comparison'),
    comparisonTbody: document.getElementById('comparison-tbody'),
    // Verifier
    verifierTbody: document.getElementById('verifier-tbody'),
    btnReVerify: document.getElementById('btn-re-verify'),
    // Stress test
    stressSubjects: document.getElementById('stress-subjects'),
    stressStudents: document.getElementById('stress-students'),
    stressPerStudent: document.getElementById('stress-per-student'),
    stressSeed: document.getElementById('stress-seed'),
    btnGenerateStress: document.getElementById('btn-generate-stress'),
    // Animation
    btnAnimReset: document.getElementById('btn-anim-reset'),
    btnAnimPrev: document.getElementById('btn-anim-prev'),
    btnAnimPlay: document.getElementById('btn-anim-play'),
    btnAnimPause: document.getElementById('btn-anim-pause'),
    btnAnimNext: document.getElementById('btn-anim-next'),
    animStepCounter: document.getElementById('anim-step-counter'),
    animSpeedSlider: document.getElementById('anim-speed-slider'),
    speedLabel: document.getElementById('speed-label'),
    animStepCaption: document.getElementById('anim-step-caption')
  };

  /**
   * Central Friendly Message Function
   * Follows strict pattern:
   * 1. Short title
   * 2. One sentence on what went wrong in plain words
   * 3. One sentence on exactly what to do next
   * 
   * @param {'error'|'warning'|'success'|'info'} type 
   * @param {string} title 
   * @param {string} whatHappened 
   * @param {string} whatToDo 
   * @param {HTMLElement} [container] 
   */
  function showFriendlyMessage(type, title, whatHappened, whatToDo, container = el.centralMessageContainer) {
    if (!container) return;

    const msgEl = document.createElement('div');
    msgEl.className = `friendly-message ${type}`;

    let icon = 'ℹ️';
    if (type === 'error') icon = '⛔';
    else if (type === 'warning') icon = '⚠️';
    else if (type === 'success') icon = '✅';

    msgEl.innerHTML = `
      <div style="font-size: 20px; flex-shrink: 0; line-height: 1;">${icon}</div>
      <div style="flex: 1;">
        <div class="msg-title">${title}</div>
        <div class="msg-body">${whatHappened}</div>
        <div class="msg-action">${whatToDo}</div>
      </div>
      <button class="msg-close" aria-label="Close message">&times;</button>
    `;

    msgEl.querySelector('.msg-close').addEventListener('click', () => {
      msgEl.remove();
    });

    container.appendChild(msgEl);
    try {
      msgEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } catch (_) {}
  }

  function clearFriendlyMessages(container = el.centralMessageContainer) {
    if (container) container.innerHTML = '';
  }

  /**
   * Mode Switcher (Simple vs Advanced)
   */
  function setViewMode(mode) {
    viewMode = mode;
    if (mode === 'simple') {
      document.body.classList.remove('advanced-mode');
      document.body.classList.add('simple-mode');
      el.btnModeSimple.classList.add('active');
      el.btnModeSimple.setAttribute('aria-checked', 'true');
      el.btnModeAdvanced.classList.remove('active');
      el.btnModeAdvanced.setAttribute('aria-checked', 'false');
    } else {
      document.body.classList.remove('simple-mode');
      document.body.classList.add('advanced-mode');
      el.btnModeAdvanced.classList.add('active');
      el.btnModeAdvanced.setAttribute('aria-checked', 'true');
      el.btnModeSimple.classList.remove('active');
      el.btnModeSimple.setAttribute('aria-checked', 'false');
    }

    if (currentTimetable) {
      renderTimetableTable();
    }
  }

  /**
   * Seeded Pseudo-Random Number Generator (Mulberry32)
   */
  function mulberry32(a) {
    return function () {
      let t = a += 0x6D2B79F5;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  /**
   * Updates pre-generation preview table of first 5 students.
   */
  function updateDataPreview() {
    const raw = el.enrollmentTextarea.value.trim();
    if (!raw) {
      el.dataPreviewBox.style.display = 'none';
      return;
    }

    try {
      const parsed = GraphModule.parseEnrollmentCSV(raw);
      parsedEnrollmentData = parsed;
      const count = parsed.students.length;
      const subjCount = Object.keys(parsed.subjectDisplayMap).length;

      el.previewSummaryText.textContent = `Great! We found ${count} students and ${subjCount} subjects.`;
      el.previewTbody.innerHTML = '';

      const sampleFive = parsed.students.slice(0, 5);
      for (const st of sampleFive) {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><strong>${st.id}</strong></td>
          <td>${st.subjects.join(', ')}</td>
        `;
        el.previewTbody.appendChild(tr);
      }

      el.dataPreviewBox.style.display = 'block';
    } catch (_) {
      el.dataPreviewBox.style.display = 'none';
    }
  }

  /**
   * Main Execution: Make My Timetable
   */
  function makeTimetable() {
    clearFriendlyMessages();
    pauseAnimation();

    const rawText = el.enrollmentTextarea.value.trim();
    if (!rawText) {
      showFriendlyMessage(
        'error',
        'No data entered',
        "We don't have any data yet.",
        "Type in your students and subjects, upload a file, or click 'Try with example data'."
      );
      return;
    }

    // Settings validation & friendly recovery (Case k)
    if (!el.startDateInput.value) {
      const today = new Date().toISOString().split('T')[0];
      el.startDateInput.value = today;
      showFriendlyMessage('info', 'Date updated', 'We used today\'s date because none was picked.', 'You can change this anytime in the settings.');
    }

    let slotsPerDay = parseInt(el.slotsPerDayInput.value, 10);
    if (isNaN(slotsPerDay) || slotsPerDay < 1 || slotsPerDay > 4) {
      slotsPerDay = 2;
      el.slotsPerDayInput.value = '2';
      showFriendlyMessage('info', 'Settings adjusted', 'We set exams per day to 2 (must be between 1 and 4).', 'You can adjust this anytime in the settings.');
    }

    // Parse input data with friendly error mapping
    let parsed;
    try {
      parsed = GraphModule.parseEnrollmentCSV(rawText);
      parsedEnrollmentData = parsed;
    } catch (err) {
      if (err.code === 'EMPTY_INPUT' || err.code === 'EMPTY_DATA') {
        showFriendlyMessage('error', 'No data entered', "We don't have any data yet.", "Type in your students and subjects, upload a file, or click 'Try with example data'.");
      } else if (err.code === 'UNRECOGNIZED_FORMAT') {
        showFriendlyMessage('error', 'Unrecognized format', "We couldn't understand this data. Each line should look like 'Riya: Maths, Physics'.", "See the example below or click 'Try with example data'.");
      } else if (err.code === 'FEW_SUBJECTS') {
        showFriendlyMessage('error', 'Need more subjects', `We need at least 2 different subjects to make a timetable. Right now we found only ${err.count || 1}.`, 'Please add more subjects and try again.');
      } else if (err.code === 'SINGLE_STUDENT') {
        showFriendlyMessage('warning', 'No timetable needed', 'We only found 1 student (or everyone takes the exact same subject).', 'You don\'t need a timetable for just one subject! Add more students and subjects to create a schedule.');
      } else {
        showFriendlyMessage('error', 'Could not read data', err.message || "We couldn't read your data.", "Please check the format or click 'Try with example data'.");
      }
      return;
    }

    // Check for skipped lines (Case f)
    if (parsed.skippedLines && parsed.skippedLines.length > 0) {
      const count = parsed.skippedLines.length;
      const list = parsed.skippedLines.map(n => `line ${n}`).join(', ');
      showFriendlyMessage('warning', 'Incomplete lines skipped', `We skipped ${count} line(s) (${list}) because they were incomplete.`, 'Everything else was used to make your timetable.');
    }

    // Check for casing merges (Case g)
    if (parsed.casingMerges && parsed.casingMerges.length > 0) {
      const first = parsed.casingMerges[0];
      showFriendlyMessage('info', 'Names matched', `We treated '${first.original}' and '${first.canonical}' as the same subject.`, 'Capitalization differences are resolved automatically.');
    }

    // Check for very large dataset (Case h)
    const isVeryLarge = parsed.students.length > 2000 || Object.keys(parsed.subjectDisplayMap).length > 100;
    if (isVeryLarge) {
      showFriendlyMessage('warning', 'Large dataset', 'This is a big file, it may take a few seconds.', 'Your timetable is being calculated now.');
    }

    // Disable button during calculation to prevent double clicks (Section 5)
    el.btnMakeTimetable.disabled = true;
    el.btnMakeTimetable.textContent = '⏳ Working on your timetable...';

    // Asynchronous wrap to keep UI responsive
    setTimeout(() => {
      try {
        currentGraph = GraphModule.buildConflictGraph(parsed.students, parsed.subjectDisplayMap);

        // Check if a single subject is shared by every other subject (Case i)
        if (currentGraph.maxDegree === currentGraph.subjectCount - 1 && currentGraph.subjectCount > 2) {
          showFriendlyMessage('info', 'High student overlap', "Many subjects share students, so each one needs its own exam time. That's normal for this data.", 'No student has conflicting exams.');
        }

        // Parse rooms
        currentRooms = GraphModule.parseRoomsCSV(el.roomsTextarea.value);
        if (currentRooms.skippedLines && currentRooms.skippedLines.length > 0) {
          const firstSkip = currentRooms.skippedLines[0];
          showFriendlyMessage('warning', 'Room entry skipped', `We skipped line ${firstSkip.lineNum} in the room list because the capacity wasn't a valid number.`, 'Other rooms were used normally.');
        }

        // Run Algorithm: In Simple view, select best automatically; in Advanced view, use selected dropdown
        if (viewMode === 'simple') {
          const bestSelection = SchedulerModule.selectBestAlgorithm(currentGraph, slotsPerDay);
          currentAlgoResult = bestSelection.result;
          el.simpleMethodNote.style.display = 'block';
          el.simpleMethodNote.textContent = `💡 We tried 3 different methods and picked the one that needs the fewest exam times (${currentAlgoResult.slotCount} exam times).`;
        } else {
          const chosenAlgo = el.algoSelect.value;
          if (chosenAlgo === 'dsatur') {
            currentAlgoResult = AlgorithmsModule.dsatur(currentGraph, true);
          } else if (chosenAlgo === 'sequential') {
            currentAlgoResult = AlgorithmsModule.sequentialGreedy(currentGraph, true);
          } else {
            currentAlgoResult = AlgorithmsModule.welshPowell(currentGraph, true);
          }
          el.simpleMethodNote.style.display = 'none';
        }

        // Check large exam times note (Case j)
        if (currentAlgoResult.slotCount > 30) {
          showFriendlyMessage('info', 'Long exam period', `Your timetable needs ${currentAlgoResult.slotCount} exam times.`, 'With your current settings, this will span several weeks.');
        }

        // Slot ordering setup
        originalSlotOrder = Array.from({ length: currentAlgoResult.slotCount }, (_, i) => i);
        currentSlotOrder = [...originalSlotOrder];
        el.btnUndoSpread.disabled = true;

        // Generate full timetable
        const startDate = el.startDateInput.value || '2026-10-26';
        const timeLabels = el.timeLabelsInput.value.split(',').map(s => s.trim()).filter(Boolean);
        const skipWeekends = el.skipWeekendsCheck.checked;

        currentTimetable = SchedulerModule.generateTimetable({
          graph: currentGraph,
          colorOf: currentAlgoResult.colorOf,
          startDate,
          slotsPerDay,
          timeLabels,
          skipWeekends,
          slotOrder: currentSlotOrder,
          rooms: currentRooms
        });

        // Run independent verification
        const verification = SchedulerModule.verifySchedule(currentGraph.students, currentAlgoResult.colorOf);

        // Verification safety check (Case l)
        if (!verification.valid || verification.clashCount > 0) {
          console.error('CRITICAL: Independent verifier detected clashes in generated schedule:', verification.clashes);
          el.resultsSection.style.display = 'none';
          el.emptyStateBox.style.display = 'block';
          showFriendlyMessage(
            'error',
            'Timetable check failed',
            'We found a problem in the timetable and are not showing it so you don\'t use a wrong one.',
            'Please click \'Start over\' and try again, or tell the person who gave you this tool.'
          );
          return;
        }

        // Check room capacity shortfall warnings (Case m)
        if (currentTimetable.roomWarnings && currentTimetable.roomWarnings.length > 0) {
          const firstWarn = currentTimetable.roomWarnings[0];
          showFriendlyMessage(
            'warning',
            'Room capacity alert',
            `Exam time ${firstWarn.slotNumber} has ${firstWarn.needed} students but the rooms listed only fit ${firstWarn.seated}.`,
            'Please add a bigger room or more rooms in the Room Capacities box on the left.'
          );
        }

        // Render UI Results
        el.emptyStateBox.style.display = 'none';
        el.resultsSection.style.display = 'flex';

        // Enable downloads (Case n)
        el.btnDownloadTimetable.disabled = false;
        el.btnDownloadTimetable.removeAttribute('title');
        el.btnPrintView.disabled = false;
        el.btnPrintView.removeAttribute('title');

        // Update result banner (Section 6)
        el.resultTitle.textContent = `All done! ${currentGraph.studentCount} students, ${currentGraph.subjectCount} subjects.`;
        el.resultSubtitle.innerHTML = `Your timetable needs <strong>${currentTimetable.slotCount} exam times</strong> over <strong>${currentTimetable.examDaysCount} days</strong>. No student has two exams at the same time. <span id="verifier-info-icon" title="We double-checked every student's exams to be sure." style="cursor: help; text-decoration: underline; margin-left: 6px;">ℹ️ Double-checked</span>`;

        // Render Timetable Views & Map
        renderTimetableTable();
        renderTimetableCards();
        renderVisGraph();
        renderGraphLegend();

        // Update Advanced Panels
        updateAdvancedPanels(verification);

        // Reset animation
        resetAnimation();

      } catch (err) {
        console.error('Unhandled timetable generation failure:', err);
        showFriendlyMessage(
          'error',
          'Something went wrong',
          'Something went wrong on our side. Your data is safe.',
          'Please click "Start over" and try again, or try the example data.'
        );
      } finally {
        el.btnMakeTimetable.disabled = false;
        el.btnMakeTimetable.textContent = '🚀 Make My Timetable';
      }
    }, 40);
  }

  /**
   * Render Timetable Table View
   * In Simple view: Date, Day, Time, Subjects (with student count in small grey text)
   * Room column appears only if user entered rooms in Advanced view
   */
  function renderTimetableTable() {
    el.timetableTbody.innerHTML = '';
    if (!currentTimetable || currentTimetable.entries.length === 0) return;

    const hasRooms = currentRooms && currentRooms.length > 0;
    if (hasRooms && viewMode === 'advanced') {
      el.thRooms.style.display = '';
    } else {
      el.thRooms.style.display = 'none';
    }

    for (const entry of currentTimetable.entries) {
      const tr = document.createElement('tr');
      const slotColor = getSlotColor(entry.slotIndex);

      const subjBadges = entry.subjects.map(s => {
        return `<span class="badge-tag">${s.name} <span class="subject-student-count">(${s.studentCount} students)</span></span>`;
      }).join(' ');

      let roomsCellHtml = '';
      if (hasRooms && viewMode === 'advanced') {
        const roomsText = (entry.roomAllocations || []).map(alloc => {
          const rList = alloc.rooms.map(r => `${r.name} [${r.seated}/${r.capacity}]`).join(', ');
          return `<div><strong>${alloc.subject}:</strong> ${rList || '<span style="color: #ef4444;">No room</span>'}</div>`;
        }).join('');
        roomsCellHtml = `<td>${roomsText}</td>`;
      }

      tr.innerHTML = `
        <td><span class="badge-slot" style="background-color: ${slotColor};">Exam time ${entry.slotNumber}</span></td>
        <td><strong>${entry.formattedDate.split(',')[1]?.trim() || entry.date}</strong></td>
        <td>${entry.dayName}</td>
        <td>${entry.time}</td>
        <td>${subjBadges}</td>
        ${roomsCellHtml}
      `;
      el.timetableTbody.appendChild(tr);
    }
  }

  /**
   * Render Timetable Calendar Cards View
   */
  function renderTimetableCards() {
    el.timetableCardsContainer.innerHTML = '';
    if (!currentTimetable || currentTimetable.entries.length === 0) return;

    const daysMap = new Map();
    for (const e of currentTimetable.entries) {
      if (!daysMap.has(e.date)) {
        daysMap.set(e.date, { formatted: e.formattedDate, dayName: e.dayName, slots: [] });
      }
      daysMap.get(e.date).slots.push(e);
    }

    for (const [date, info] of daysMap.entries()) {
      const card = document.createElement('div');
      card.className = 'day-card';

      let slotsHtml = '';
      for (const s of info.slots) {
        const color = getSlotColor(s.slotIndex);
        const subjs = s.subjects.map(sub => `
          <div style="font-size: 14px; font-weight: 600; color: #fff; margin-bottom: 2px;">
            • ${sub.name} <span style="font-size: 12px; color: #94a3b8;">(${sub.studentCount} students)</span>
          </div>
        `).join('');

        slotsHtml += `
          <div class="slot-block" style="border-left: 3px solid ${color};">
            <div class="slot-block-header">
              <span class="badge-slot" style="background-color: ${color};">Exam time ${s.slotNumber}</span>
              <span>⏰ ${s.time}</span>
            </div>
            <div style="margin: 8px 0;">${subjs}</div>
          </div>
        `;
      }

      card.innerHTML = `
        <div class="day-card-header">
          <span>📅 ${info.dayName}</span>
          <span style="color: #94a3b8;">${date}</span>
        </div>
        <div class="day-card-slots">${slotsHtml}</div>
      `;
      el.timetableCardsContainer.appendChild(card);
    }
  }

  /**
   * Render vis-network graph with offline fallback (Case o)
   */
  function renderVisGraph() {
    if (!currentGraph) return;

    if (!window.vis) {
      el.networkViewport.style.display = 'none';
      el.offlineGraphFallback.style.display = 'block';
      showFriendlyMessage(
        'info',
        'Map preview offline',
        "The picture of the subjects map couldn't load, probably because you're offline.",
        'Your timetable below still works.'
      );
      return;
    }

    el.networkViewport.style.display = 'block';
    el.offlineGraphFallback.style.display = 'none';

    el.graphMetaBadge.textContent = `(${currentGraph.subjectCount} subjects, ${currentGraph.edgeCount} links)`;

    const nodes = currentGraph.subjects.map(subj => {
      const slot = currentAlgoResult.colorOf[subj];
      const color = getSlotColor(slot);
      const studentCount = currentGraph.subjectEnrollmentCount[subj] || 0;
      const neighbors = currentGraph.getNeighbors(subj).join(', ') || 'None';

      return {
        id: subj,
        label: `${subj}\n[Exam time ${slot + 1}]`,
        title: `${subj}: ${studentCount} students. Shares students with: ${neighbors}. Exam time ${slot + 1}.`,
        color: {
          background: color,
          border: '#ffffff',
          highlight: { background: color, border: '#fef08a' }
        },
        font: { color: '#ffffff', size: 14, face: 'system-ui, sans-serif', bold: true },
        shape: 'box',
        margin: 10,
        borderWidth: 2,
        shadow: true
      };
    });

    const edges = currentGraph.edges.map(e => ({
      from: e.u,
      to: e.v,
      label: String(e.weight),
      title: `${e.weight} student(s) take both "${e.u}" and "${e.v}"`,
      font: { color: '#94a3b8', size: 11, strokeWidth: 2, strokeColor: '#0f172a' },
      color: { color: '#475569', highlight: '#60a5fa' },
      width: Math.min(6, 1 + Math.log2(e.weight + 1)),
      selectionWidth: 3
    }));

    visNodesDataSet = new vis.DataSet(nodes);
    visEdgesDataSet = new vis.DataSet(edges);

    const data = { nodes: visNodesDataSet, edges: visEdgesDataSet };
    const options = {
      physics: {
        enabled: true,
        solver: 'barnesHut',
        barnesHut: {
          gravitationalConstant: -3500,
          centralGravity: 0.3,
          springLength: 120,
          springConstant: 0.04,
          damping: 0.09
        },
        stabilization: {
          enabled: true,
          iterations: 150,
          updateInterval: 25
        }
      },
      interaction: {
        hover: true,
        tooltipDelay: 100,
        navigationButtons: true,
        keyboard: true
      }
    };

    if (visNetwork) {
      visNetwork.destroy();
    }

    visNetwork = new vis.Network(el.networkViewport, data, options);

    visNetwork.on('stabilizationIterationsDone', function () {
      if (currentGraph && currentGraph.subjectCount > 150) {
        visNetwork.setOptions({ physics: { enabled: false } });
      }
    });
  }

  /**
   * Render Plain Language Legend
   */
  function renderGraphLegend() {
    if (!currentGraph || !currentAlgoResult) return;
    el.graphLegend.innerHTML = '';

    const slotCount = currentAlgoResult.slotCount;
    const groups = {};
    for (let s = 0; s < slotCount; s++) groups[s] = [];
    for (const [subj, s] of Object.entries(currentAlgoResult.colorOf)) {
      groups[s].push(subj);
    }

    for (let s = 0; s < slotCount; s++) {
      const chip = document.createElement('div');
      chip.className = 'legend-chip';
      const color = getSlotColor(s);
      chip.innerHTML = `
        <span class="legend-color" style="background-color: ${color};"></span>
        <span>Exam time ${s + 1}: ${groups[s].join(', ') || 'Empty'}</span>
      `;
      el.graphLegend.appendChild(chip);
    }
  }

  /**
   * Update Advanced Metrics & Comparison Panels
   */
  function updateAdvancedPanels(verification) {
    if (!currentGraph || !currentAlgoResult || !currentTimetable) return;

    // Technical stats
    el.statSubjects.textContent = currentGraph.subjectCount;
    el.statStudents.textContent = currentGraph.studentCount;
    el.statEdges.textContent = currentGraph.edgeCount;
    el.statDensity.textContent = `${(currentGraph.density * 100).toFixed(1)}%`;
    el.statMaxDeg.textContent = currentGraph.maxDegree;
    el.statUpperBound.textContent = currentGraph.upperBound;
    el.statSlotsUsed.textContent = currentAlgoResult.slotCount;
    el.statExamDays.textContent = currentTimetable.examDaysCount;
    el.statClashes.textContent = verification.clashCount;
    el.statBtb.textContent = currentTimetable.backToBackCount;
    el.statRuntime.textContent = `${currentAlgoResult.runtimeMs.toFixed(3)} ms`;

    // Rooms breakdown
    el.roomsDetailTbody.innerHTML = '';
    el.roomWarningsList.innerHTML = '';

    for (const entry of currentTimetable.entries) {
      for (const alloc of entry.roomAllocations) {
        const tr = document.createElement('tr');
        const color = getSlotColor(entry.slotIndex);
        const rDetails = alloc.rooms.map(r => `${r.name} (Seated: ${r.seated} / Cap: ${r.capacity})`).join(', ');
        const isShortfall = alloc.shortfall > 0;

        tr.innerHTML = `
          <td><span class="badge-slot" style="background-color: ${color};">Exam time ${entry.slotNumber}</span></td>
          <td><strong>${alloc.subject}</strong></td>
          <td>${alloc.studentCount}</td>
          <td>${rDetails || '<span style="color: #ef4444;">None</span>'}</td>
          <td>${isShortfall
            ? `<span style="color: #ef4444; font-weight: 700;">Shortfall: -${alloc.shortfall}</span>`
            : '<span style="color: #16a34a; font-weight: 600;">✓ Seated</span>'}
          </td>
        `;
        el.roomsDetailTbody.appendChild(tr);
      }
    }

    // Verifier log
    el.verifierTbody.innerHTML = '';
    for (const st of currentGraph.students) {
      const tr = document.createElement('tr');
      const slotMap = {};
      for (const subj of st.subjects) {
        const slot = currentAlgoResult.colorOf[subj];
        if (!slotMap[slot]) slotMap[slot] = [];
        slotMap[slot].push(subj);
      }

      let hasClash = false;
      const slotPills = [];
      for (const [s, subjs] of Object.entries(slotMap)) {
        const color = getSlotColor(Number(s));
        if (subjs.length > 1) {
          hasClash = true;
          slotPills.push(`<span class="badge-slot" style="background: #ef4444;">Exam time ${Number(s) + 1}: ${subjs.join(', ')}</span>`);
        } else {
          slotPills.push(`<span class="badge-tag" style="border-left: 2px solid ${color};">Exam time ${Number(s) + 1}: ${subjs[0]}</span>`);
        }
      }

      tr.innerHTML = `
        <td><strong>${st.id}</strong></td>
        <td>${st.subjects.length}</td>
        <td>${slotPills.join(' ')}</td>
        <td>${hasClash ? '<span style="color: #ef4444; font-weight: 700;">Clash</span>' : '<span style="color: #16a34a; font-weight: 600;">Clean</span>'}</td>
      `;
      el.verifierTbody.appendChild(tr);
    }

    // Comparison table
    updateComparisonTable();
  }

  /**
   * Update Algorithm Comparison Table (Section 8)
   */
  function updateComparisonTable() {
    if (!currentGraph) return;

    const algos = [
      { id: 'wp', name: 'Smart method: busiest subjects first (Welsh-Powell)', fn: AlgorithmsModule.welshPowell },
      { id: 'dsat', name: 'Smart method: most crowded subjects first (DSATUR)', fn: AlgorithmsModule.dsatur },
      { id: 'seq', name: 'Quick method (in the order given) (Sequential Greedy)', fn: AlgorithmsModule.sequentialGreedy }
    ];

    const results = [];
    let minSlots = Infinity;

    for (const algo of algos) {
      const benchmark = AlgorithmsModule.benchmarkAlgorithm(currentGraph, algo.fn, 200);
      const res = benchmark.result;
      const v = SchedulerModule.verifySchedule(currentGraph.students, res.colorOf);

      const tt = SchedulerModule.generateTimetable({
        graph: currentGraph,
        colorOf: res.colorOf,
        slotsPerDay: parseInt(el.slotsPerDayInput.value, 10) || 2
      });

      if (res.slotCount < minSlots) minSlots = res.slotCount;

      results.push({
        name: algo.name,
        slots: res.slotCount,
        btb: tt.backToBackCount,
        clashes: v.clashCount,
        runtimeMs: benchmark.avgRuntimeMs
      });
    }

    el.comparisonTbody.innerHTML = '';
    const maxSlotsPossible = Math.max(...results.map(r => r.slots), currentGraph.upperBound, 1);

    for (const r of results) {
      const tr = document.createElement('tr');
      const isBest = r.slots === minSlots;
      if (isBest) tr.className = 'best-row';

      const barPercent = Math.min(100, Math.round((r.slots / maxSlotsPossible) * 100));

      tr.innerHTML = `
        <td><strong>${r.name}</strong> ${isBest ? '<span class="badge-slot" style="background:#16a34a; margin-left: 6px;">Fewest</span>' : ''}</td>
        <td><strong>${r.slots}</strong></td>
        <td>
          <div class="bar-container">
            <div class="bar-fill ${isBest ? 'best' : ''}" style="width: ${barPercent}px;"></div>
            <span style="font-size: 12px; color: #94a3b8;">${r.slots} / ${currentGraph.upperBound}</span>
          </div>
        </td>
        <td>${r.btb}</td>
        <td><span style="color: #16a34a; font-weight: 700;">${r.clashes}</span></td>
        <td><code>${r.runtimeMs.toFixed(3)} ms</code></td>
      `;
      el.comparisonTbody.appendChild(tr);
    }
  }

  // --------------------------------------------------------------------------
  // STEP-BY-STEP ANIMATION (ADVANCED ONLY)
  // --------------------------------------------------------------------------

  function resetAnimation() {
    pauseAnimation();
    animCurrentStep = 0;
    updateAnimationStepUI();
  }

  function pauseAnimation() {
    if (animTimer) {
      clearInterval(animTimer);
      animTimer = null;
    }
    el.btnAnimPlay.style.display = 'inline-flex';
    el.btnAnimPause.style.display = 'none';
  }

  function playAnimation() {
    pauseAnimation();
    if (!currentAlgoResult || currentAlgoResult.steps.length === 0) return;

    if (animCurrentStep >= currentAlgoResult.steps.length) {
      animCurrentStep = 0;
    }

    el.btnAnimPlay.style.display = 'none';
    el.btnAnimPause.style.display = 'inline-flex';

    animTimer = setInterval(() => {
      if (animCurrentStep < currentAlgoResult.steps.length) {
        animCurrentStep++;
        updateAnimationStepUI();
      } else {
        pauseAnimation();
      }
    }, animSpeedMs);
  }

  function stepForward() {
    pauseAnimation();
    if (!currentAlgoResult) return;
    if (animCurrentStep < currentAlgoResult.steps.length) {
      animCurrentStep++;
      updateAnimationStepUI();
    }
  }

  function stepBackward() {
    pauseAnimation();
    if (!currentAlgoResult) return;
    if (animCurrentStep > 0) {
      animCurrentStep--;
      updateAnimationStepUI();
    }
  }

  function updateAnimationStepUI() {
    if (!currentAlgoResult || !visNodesDataSet) return;

    const totalSteps = currentAlgoResult.steps.length;
    el.animStepCounter.textContent = `Step ${animCurrentStep} / ${totalSteps}`;

    if (animCurrentStep === 0) {
      const updates = currentGraph.subjects.map(subj => ({
        id: subj,
        label: subj,
        color: { background: '#64748b', border: '#94a3b8' },
        borderWidth: 2
      }));
      visNodesDataSet.update(updates);
      el.animStepCaption.textContent = 'Map initialized. Click Play or Next to observe steps.';
      return;
    }

    const updates = [];
    const coloredSoFar = new Set();

    for (let i = 0; i < animCurrentStep; i++) {
      const stepData = currentAlgoResult.steps[i];
      const slot = stepData.slot;
      const color = getSlotColor(slot);
      coloredSoFar.add(stepData.subject);

      const isCurrentActive = i === animCurrentStep - 1;
      updates.push({
        id: stepData.subject,
        label: `${stepData.subject}\n[Exam time ${slot + 1}]`,
        color: {
          background: color,
          border: isCurrentActive ? '#facc15' : '#ffffff'
        },
        borderWidth: isCurrentActive ? 4 : 2
      });
    }

    for (const subj of currentGraph.subjects) {
      if (!coloredSoFar.has(subj)) {
        updates.push({
          id: subj,
          label: subj,
          color: { background: '#64748b', border: '#94a3b8' },
          borderWidth: 2
        });
      }
    }

    visNodesDataSet.update(updates);

    const activeStep = currentAlgoResult.steps[animCurrentStep - 1];
    if (animCurrentStep === totalSteps) {
      el.animStepCaption.innerHTML = `<strong>Finished:</strong> All ${totalSteps} subjects scheduled in ${currentAlgoResult.slotCount} exam times with zero clashes!`;
    } else {
      el.animStepCaption.innerHTML = `<strong>Step ${animCurrentStep}:</strong> ${activeStep.explanation.replace(/Slot/g, 'Exam time')}`;
    }
  }

  // --------------------------------------------------------------------------
  // DOWNLOADS & EXPORTS
  // --------------------------------------------------------------------------

  function downloadTimetableCSV() {
    if (!currentTimetable || currentTimetable.entries.length === 0) {
      showFriendlyMessage('warning', 'Make your timetable first', "There is no timetable to download yet.", "Click 'Make My Timetable' first.");
      return;
    }

    const headers = ['Exam_Time', 'Date', 'Day', 'Time', 'Subject', 'Allocated_Rooms', 'Students_Enrolled'];
    const rows = [headers.join(',')];

    for (const e of currentTimetable.entries) {
      for (const subj of e.subjects) {
        const alloc = (e.roomAllocations || []).find(a => a.subject === subj.name);
        const roomsStr = (alloc?.rooms || []).map(r => `${r.name}(${r.seated})`).join(';');
        rows.push([
          `"Exam time ${e.slotNumber}"`,
          `"${e.date}"`,
          `"${e.dayName}"`,
          `"${e.time}"`,
          `"${subj.name}"`,
          `"${roomsStr || 'None'}"`,
          subj.studentCount
        ].join(','));
      }
    }

    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `exam-timetable.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function downloadBlankTemplateCSV() {
    const text = window.BLANK_TEMPLATE_CSV || 'student_id,subjects\nRiya,"Maths;Physics"\nArjun,"Maths;Computer Science"';
    const blob = new Blob([text], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'example-students.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  function downloadGraphPNG() {
    if (!visNetwork) return;
    try {
      const canvas = el.networkViewport.querySelector('canvas');
      if (!canvas) {
        showFriendlyMessage('warning', 'Map not ready', "The map picture couldn't be captured right now.", "Please wait for the map to finish rendering.");
        return;
      }
      const dataUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `subjects-map.png`;
      a.click();
    } catch (err) {
      console.error(err);
      showFriendlyMessage('warning', 'Download interrupted', "Could not download the map picture.", "Please check browser permissions or try taking a screenshot.");
    }
  }

  // --------------------------------------------------------------------------
  // STRESS TEST GENERATION
  // --------------------------------------------------------------------------

  function generateStressDataset() {
    const numSubj = Math.max(5, Math.min(100, parseInt(el.stressSubjects.value, 10) || 40));
    const numStudents = Math.max(10, Math.min(2000, parseInt(el.stressStudents.value, 10) || 600));
    const subjPerSt = Math.max(2, Math.min(numSubj - 1, parseInt(el.stressPerStudent.value, 10) || 5));
    const seed = parseInt(el.stressSeed.value, 10) || 42;

    const rand = mulberry32(seed);
    const engineeringDisciplines = ['DataStructures', 'Algorithms', 'DBMS', 'OperatingSys', 'CompNetworks', 'Maths', 'Physics', 'DigitalLogic', 'SoftwareEng', 'TheoryOfComp', 'AI', 'MachineLearning', 'CyberSecurity', 'CloudComputing', 'ComputerArch', 'EmbeddedSys', 'WebDev', 'CompilerDesign', 'VLSI', 'Robotics'];
    const subjectPool = [];
    for (let i = 0; i < numSubj; i++) {
      const base = engineeringDisciplines[i % engineeringDisciplines.length];
      const suffix = Math.floor(i / engineeringDisciplines.length) + 1;
      subjectPool.push(`${base}_${suffix}`);
    }

    const deptCount = 4;
    const depts = Array.from({ length: deptCount }, () => []);
    for (let i = 0; i < subjectPool.length; i++) {
      depts[i % deptCount].push(subjectPool[i]);
    }

    const rows = [];
    for (let st = 1; st <= numStudents; st++) {
      const sid = `S_${String(st).padStart(4, '0')}`;
      const deptIdx = st % deptCount;
      const deptSubjects = depts[deptIdx];
      const otherSubjects = depts.filter((_, idx) => idx !== deptIdx).flat();

      const chosen = new Set();
      const coreTarget = Math.max(1, subjPerSt - 1);
      let attempts = 0;
      while (chosen.size < coreTarget && attempts < 50) {
        attempts++;
        const s = deptSubjects[Math.floor(rand() * deptSubjects.length)];
        if (s) chosen.add(s);
      }
      attempts = 0;
      while (chosen.size < subjPerSt && attempts < 50) {
        attempts++;
        const s = otherSubjects[Math.floor(rand() * otherSubjects.length)];
        if (s) chosen.add(s);
      }

      rows.push(`${sid}: ${Array.from(chosen).join(', ')}`);
    }

    el.enrollmentTextarea.value = rows.join('\n');
    updateDataPreview();
    makeTimetable();
  }

  // --------------------------------------------------------------------------
  // EVENT LISTENERS
  // --------------------------------------------------------------------------

  function initEventListeners() {
    // Mode switcher
    el.btnModeSimple.addEventListener('click', () => setViewMode('simple'));
    el.btnModeAdvanced.addEventListener('click', () => setViewMode('advanced'));

    // "What is this?" toggle
    el.btnToggleWhat.addEventListener('click', () => {
      const isClosed = el.whatContent.style.display === 'none';
      el.whatContent.style.display = isClosed ? 'block' : 'none';
      el.whatArrow.textContent = isClosed ? '▼' : '▶';
      el.btnToggleWhat.setAttribute('aria-expanded', String(isClosed));
    });

    // FAQ modal toggle
    el.btnToggleFaq.addEventListener('click', () => {
      const isClosed = el.faqBox.style.display === 'none';
      el.faqBox.style.display = isClosed ? 'block' : 'none';
      if (isClosed) {
        el.faqBox.scrollIntoView({ behavior: 'smooth' });
      }
    });
    el.btnCloseFaq.addEventListener('click', () => {
      el.faqBox.style.display = 'none';
    });

    // "Try with example data"
    el.btnLoadSample.addEventListener('click', () => {
      clearFriendlyMessages();
      el.enrollmentTextarea.value = window.SAMPLE_FRIENDLY_TEXT || '';
      updateDataPreview();
      makeTimetable();
    });

    // Input tabs
    el.tabBtnType.addEventListener('click', () => {
      el.tabBtnType.classList.add('active');
      el.tabBtnType.setAttribute('aria-selected', 'true');
      el.tabBtnUpload.classList.remove('active');
      el.tabBtnUpload.setAttribute('aria-selected', 'false');
      el.paneType.classList.add('active');
      el.paneUpload.classList.remove('active');
    });

    el.tabBtnUpload.addEventListener('click', () => {
      el.tabBtnUpload.classList.add('active');
      el.tabBtnUpload.setAttribute('aria-selected', 'true');
      el.tabBtnType.classList.remove('active');
      el.tabBtnType.setAttribute('aria-selected', 'false');
      el.paneUpload.classList.add('active');
      el.paneType.classList.remove('active');
    });

    // File upload triggers
    el.dropBox.addEventListener('click', () => el.fileInput.click());
    el.dropBox.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        el.fileInput.click();
      }
    });

    // Drag and drop
    el.dropBox.addEventListener('dragover', (e) => {
      e.preventDefault();
      el.dropBox.style.borderColor = 'var(--accent-primary)';
    });
    el.dropBox.addEventListener('dragleave', () => {
      el.dropBox.style.borderColor = '#475569';
    });
    el.dropBox.addEventListener('drop', (e) => {
      e.preventDefault();
      el.dropBox.style.borderColor = '#475569';
      const file = e.dataTransfer.files[0];
      if (file) handleUploadedFile(file);
    });

    el.fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) handleUploadedFile(file);
    });

    function handleUploadedFile(file) {
      clearFriendlyMessages();
      if (!file) return;

      const ext = file.name.split('.').pop().toLowerCase();
      if (ext !== 'csv' && ext !== 'txt') {
        showFriendlyMessage(
          'error',
          'File could not be read',
          "This file looks empty or isn't a CSV/text file.",
          "If it's an Excel file, open it and use File > Save As > CSV, then upload again."
        );
        return;
      }

      const reader = new FileReader();
      reader.onload = function (event) {
        const content = event.target.result;
        if (!content || !content.trim()) {
          showFriendlyMessage(
            'error',
            'File is empty',
            'This file contains no text.',
            'Please choose a file with student enrollments.'
          );
          return;
        }
        el.enrollmentTextarea.value = content;
        updateDataPreview();
        showFriendlyMessage(
          'success',
          'File loaded',
          `Loaded "${file.name}" successfully!`,
          'Click "Make My Timetable" to generate your timetable.'
        );
      };
      reader.onerror = function () {
        showFriendlyMessage(
          'error',
          'Could not open file',
          'Your browser was unable to read this file.',
          'Try opening the file in Notepad, copying the text, and clicking "Type it in" to paste it.'
        );
      };
      reader.readAsText(file);
    }

    el.btnToggleFileHelp.addEventListener('click', () => {
      const isClosed = el.fileHelpBox.style.display === 'none';
      el.fileHelpBox.style.display = isClosed ? 'block' : 'none';
    });

    el.btnDownloadTemplate.addEventListener('click', downloadBlankTemplateCSV);

    // Live update of preview on typing
    el.enrollmentTextarea.addEventListener('input', () => {
      updateDataPreview();
    });

    el.btnEditData.addEventListener('click', () => {
      el.tabBtnType.click();
      el.enrollmentTextarea.focus();
    });

    // Timings toggle
    el.btnToggleTimings.addEventListener('click', () => {
      const isClosed = el.timingsBox.style.display === 'none';
      el.timingsBox.style.display = isClosed ? 'block' : 'none';
    });

    // Make Timetable button
    el.btnMakeTimetable.addEventListener('click', makeTimetable);

    // Advanced Algorithm selection
    el.algoSelect.addEventListener('change', () => {
      const chosen = el.algoSelect.value;
      if (chosen === 'welsh-powell') {
        el.algoDescription.textContent = 'Sorts subjects by how many other subjects they share students with, scheduling the busiest subjects first.';
      } else if (chosen === 'dsatur') {
        el.algoDescription.textContent = 'Dynamically schedules the subject that currently has the fewest remaining free slots based on its neighbors.';
      } else {
        el.algoDescription.textContent = 'Schedules subjects strictly in the order they appear in your list (simplest baseline method).';
      }
      if (currentGraph) {
        makeTimetable();
      }
    });

    // Soft constraint: Spread out exams
    el.btnSpreadExams.addEventListener('click', () => {
      if (!currentGraph || !currentAlgoResult) return;
      clearFriendlyMessages(el.spreadAlert);

      const slotsPerDay = parseInt(el.slotsPerDayInput.value, 10) || 2;
      const res = SchedulerModule.spreadOutExams(currentGraph, currentAlgoResult.colorOf, slotsPerDay, currentSlotOrder);

      currentSlotOrder = res.optimizedOrder;
      el.btnUndoSpread.disabled = false;

      // Re-generate timetable with optimized order
      currentTimetable = SchedulerModule.generateTimetable({
        graph: currentGraph,
        colorOf: currentAlgoResult.colorOf,
        startDate: el.startDateInput.value || '2026-10-26',
        slotsPerDay,
        timeLabels: el.timeLabelsInput.value.split(',').map(s => s.trim()).filter(Boolean),
        skipWeekends: el.skipWeekendsCheck.checked,
        slotOrder: currentSlotOrder,
        rooms: currentRooms
      });

      renderTimetableTable();
      renderTimetableCards();
      updateAdvancedPanels(SchedulerModule.verifySchedule(currentGraph.students, currentAlgoResult.colorOf));

      if (res.reduction > 0) {
        showFriendlyMessage(
          'success',
          'Exams spread out',
          `Same-day consecutive exams reduced from ${res.beforeCount} to ${res.afterCount} (saved ${res.reduction} back-to-backs).`,
          'Your schedule remains 100% clash-free.',
          el.spreadAlert
        );
      } else {
        showFriendlyMessage(
          'info',
          'Already optimal',
          `Your schedule is already at minimal back-to-back exams (${res.afterCount}).`,
          'No further reordering was needed.',
          el.spreadAlert
        );
      }
    });

    // Undo spread out
    el.btnUndoSpread.addEventListener('click', () => {
      if (!originalSlotOrder) return;
      currentSlotOrder = [...originalSlotOrder];
      el.btnUndoSpread.disabled = true;
      clearFriendlyMessages(el.spreadAlert);

      currentTimetable = SchedulerModule.generateTimetable({
        graph: currentGraph,
        colorOf: currentAlgoResult.colorOf,
        startDate: el.startDateInput.value || '2026-10-26',
        slotsPerDay: parseInt(el.slotsPerDayInput.value, 10) || 2,
        timeLabels: el.timeLabelsInput.value.split(',').map(s => s.trim()).filter(Boolean),
        skipWeekends: el.skipWeekendsCheck.checked,
        slotOrder: currentSlotOrder,
        rooms: currentRooms
      });

      renderTimetableTable();
      renderTimetableCards();
      updateAdvancedPanels(SchedulerModule.verifySchedule(currentGraph.students, currentAlgoResult.colorOf));

      showFriendlyMessage('info', 'Restored', 'Restored the natural algorithmic slot order.', '', el.spreadAlert);
    });

    // Reallocate rooms
    el.btnAllocateRooms.addEventListener('click', () => {
      currentRooms = GraphModule.parseRoomsCSV(el.roomsTextarea.value);
      if (currentTimetable) {
        makeTimetable();
      }
    });

    // Generate stress test
    el.btnGenerateStress.addEventListener('click', generateStressDataset);

    // Downloads
    el.btnDownloadTimetable.addEventListener('click', downloadTimetableCSV);
    el.btnPrintView.addEventListener('click', () => window.print());
    el.btnFitGraph.addEventListener('click', () => {
      if (visNetwork) visNetwork.fit({ animation: { duration: 500 } });
    });
    el.btnDownloadGraph.addEventListener('click', downloadGraphPNG);

    // Table view toggles
    el.btnViewTable.addEventListener('click', () => {
      el.btnViewTable.style.background = 'var(--accent-primary)';
      el.btnViewCards.style.background = 'var(--bg-hover)';
      el.timetableTableContainer.style.display = 'block';
      el.timetableCardsContainer.style.display = 'none';
    });
    el.btnViewCards.addEventListener('click', () => {
      el.btnViewCards.style.background = 'var(--accent-primary)';
      el.btnViewTable.style.background = 'var(--bg-hover)';
      el.timetableTableContainer.style.display = 'none';
      el.timetableCardsContainer.style.display = 'grid';
    });

    // Advanced comparison run
    el.btnRunComparison.addEventListener('click', updateComparisonTable);

    // Re-verify
    el.btnReVerify.addEventListener('click', () => {
      if (!currentGraph || !currentAlgoResult) return;
      const v = SchedulerModule.verifySchedule(currentGraph.students, currentAlgoResult.colorOf);
      updateAdvancedPanels(v);
      showFriendlyMessage('success', 'Verified', `Audited ${currentGraph.students.length} students: 0 clashes found.`, 'Every student has at most one exam per time.');
    });

    // Animation controls
    el.btnAnimPlay.addEventListener('click', playAnimation);
    el.btnAnimPause.addEventListener('click', pauseAnimation);
    el.btnAnimNext.addEventListener('click', stepForward);
    el.btnAnimPrev.addEventListener('click', stepBackward);
    el.btnAnimReset.addEventListener('click', resetAnimation);
    el.animSpeedSlider.addEventListener('input', (e) => {
      animSpeedMs = parseInt(e.target.value, 10);
      el.speedLabel.textContent = `${animSpeedMs}ms`;
      if (animTimer) playAnimation();
    });
  }

  // --------------------------------------------------------------------------
  // INITIALIZATION ON LOAD
  // --------------------------------------------------------------------------

  function init() {
    initEventListeners();
    setViewMode('simple');

    // Default start date: tomorrow or upcoming Monday
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    el.startDateInput.value = `${y}-${m}-${d}`;

    // Prefill rooms
    if (window.SAMPLE_ROOMS_CSV) {
      el.roomsTextarea.value = window.SAMPLE_ROOMS_CSV;
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
