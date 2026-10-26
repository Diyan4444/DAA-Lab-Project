/**
 * Exam Timetable Maker — UI Controller & Presentation Engine
 * "Exam Notice Board" Design Direction
 * 
 * Features:
 * - Simple View vs Advanced View mode switch (session memory)
 * - Notice board aesthetics with stamped "Checked" verification
 * - Plain English terminology throughout
 * - SVG icons strictly by shape (no emoji anywhere)
 * - Pinned unpkg vis-network styling with CSS variable tokens
 * - Accessible roving-tabindex tablists for input and advanced panels
 * - Complete absence of native alert, confirm, prompt dialogs
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

  // Typo & Merge State (Session only)
  const confirmedMerges = new Map(); // oldName -> newName
  const dismissedTypoPairs = new Set(); // 'subjA|||subjB'
  let currentHuffmanResult = null;

  // Design System CSS Custom Property Helper
  const CSS_VAR_FALLBACKS = {
    '--paper': '#E8EBE4',
    '--sheet': '#FBFBF7',
    '--ink': '#1E2824',
    '--ink-soft': '#4A5852',
    '--board': '#1F4D3F',
    '--board-dark': '#163A30',
    '--marker': '#F2CC3C',
    '--stamp': '#9B2D30',
    '--rule': '#B9C0B5',
    '--edge': '#6C7A72',
    '--warn-bg': '#F7E7B8',
    '--warn-ink': '#6B4500',
    '--err-bg': '#F3DAD6',
    '--info-bg': '#DDE3DB',
    '--ok-bg': '#D5E6DC',
    '--slot-1': '#F6D55C',
    '--slot-2': '#9ED9A0',
    '--slot-3': '#F4A8A0',
    '--slot-4': '#8FD3D0',
    '--slot-5': '#F7B96B',
    '--slot-6': '#C9E265',
    '--slot-7': '#E8A1C4',
    '--slot-8': '#A9C9A4',
    '--slot-9': '#F0C8A0',
    '--slot-10': '#7FC8B0',
    '--slot-11': '#E6D98C',
    '--slot-12': '#D9A7A0'
  };

  function cssVar(name) {
    if (typeof window !== 'undefined' && window.document && document.documentElement) {
      const val = getComputedStyle(document.documentElement).getPropertyValue(name);
      if (val && val.trim()) return val.trim();
    }
    return CSS_VAR_FALLBACKS[name] || '';
  }

  function escapeHtml(str) {
    if (typeof str !== 'string') return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function getLocalDateString(d = new Date()) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function sanitizeCSVField(val) {
    if (val === null || val === undefined) return '""';
    let str = String(val);
    if (/^[\t\r\n ]*[=+\-@\t\r]/.test(str)) {
      str = "'" + str;
    }
    return '"' + str.replace(/"/g, '""') + '"';
  }

  if (typeof window !== 'undefined') {
    window.UIHelpers = {
      escapeHtml,
      getLocalDateString,
      sanitizeCSVField
    };
  }

  function resetTypoDecisions() {
    confirmedMerges.clear();
    dismissedTypoPairs.clear();
    if (el.typoSuggestionsBox) {
      el.typoSuggestionsBox.style.display = 'none';
    }
    if (el.typoList) {
      el.typoList.innerHTML = '';
    }
    if (el.typoConfirmedList) {
      el.typoConfirmedList.innerHTML = '';
    }
  }

  // Animation State
  let animCurrentStep = 0;
  let animTimer = null;
  let animSpeedMs = 600;

  // Curated Slot Colors (Warm earthy tones)
  function getSlotColor(slotIndex) {
    if (slotIndex >= 0 && slotIndex < 12) {
      return cssVar(`--slot-${slotIndex + 1}`);
    }
    const h = (slotIndex * 47) % 190;
    return `hsl(${h}, 55%, 78%)`;
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
    animStepCaption: document.getElementById('anim-step-caption'),
    // New Feature Controls
    typoSuggestionsBox: document.getElementById('typo-suggestions-box'),
    typoConfirmedList: document.getElementById('typo-confirmed-list'),
    typoList: document.getElementById('typo-list'),
    chkShowMst: document.getElementById('chk-show-mst'),
    mstInfoBadge: document.getElementById('mst-info-badge'),
    roomFixBox: document.getElementById('room-fix-box'),
    btnSuggestRoomFix: document.getElementById('btn-suggest-room-fix'),
    btnApplyRoomFix: document.getElementById('btn-apply-room-fix'),
    roomFixDetails: document.getElementById('room-fix-details'),
    studentHistogramContainer: document.getElementById('student-histogram-container'),
    btnRunHuffman: document.getElementById('btn-run-huffman'),
    btnDownloadHuffman: document.getElementById('btn-download-huffman'),
    huffmanResults: document.getElementById('huffman-results')
  };

  /**
   * Inline SVG Icon Builder (Strictly differentiated shapes, zero emoji)
   */
  function createSvgIcon(type) {
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('width', '20');
    svg.setAttribute('height', '20');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '2');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    svg.setAttribute('aria-hidden', 'true');

    if (type === 'error') {
      // Circle with cross
      const circle = document.createElementNS(ns, 'circle');
      circle.setAttribute('cx', '12');
      circle.setAttribute('cy', '12');
      circle.setAttribute('r', '10');
      const l1 = document.createElementNS(ns, 'line');
      l1.setAttribute('x1', '15'); l1.setAttribute('y1', '9');
      l1.setAttribute('x2', '9'); l1.setAttribute('y2', '15');
      const l2 = document.createElementNS(ns, 'line');
      l2.setAttribute('x1', '9'); l2.setAttribute('y1', '9');
      l2.setAttribute('x2', '15'); l2.setAttribute('y2', '15');
      svg.appendChild(circle);
      svg.appendChild(l1);
      svg.appendChild(l2);
    } else if (type === 'warning') {
      // Triangle with exclamation mark
      const path = document.createElementNS(ns, 'path');
      path.setAttribute('d', 'M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z');
      const l1 = document.createElementNS(ns, 'line');
      l1.setAttribute('x1', '12'); l1.setAttribute('y1', '9');
      l1.setAttribute('x2', '12'); l1.setAttribute('y2', '13');
      const l2 = document.createElementNS(ns, 'line');
      l2.setAttribute('x1', '12'); l2.setAttribute('y1', '17');
      l2.setAttribute('x2', '12.01'); l2.setAttribute('y2', '17');
      svg.appendChild(path);
      svg.appendChild(l1);
      svg.appendChild(l2);
    } else if (type === 'success') {
      // Circle with check tick
      const circle = document.createElementNS(ns, 'circle');
      circle.setAttribute('cx', '12');
      circle.setAttribute('cy', '12');
      circle.setAttribute('r', '10');
      const poly = document.createElementNS(ns, 'polyline');
      poly.setAttribute('points', '9 11 12 14 22 4');
      svg.appendChild(circle);
      svg.appendChild(poly);
    } else {
      // Info: circle with i
      const circle = document.createElementNS(ns, 'circle');
      circle.setAttribute('cx', '12');
      circle.setAttribute('cy', '12');
      circle.setAttribute('r', '10');
      const l1 = document.createElementNS(ns, 'line');
      l1.setAttribute('x1', '12'); l1.setAttribute('y1', '16');
      l1.setAttribute('x2', '12'); l1.setAttribute('y2', '12');
      const l2 = document.createElementNS(ns, 'line');
      l2.setAttribute('x1', '12'); l2.setAttribute('y1', '8');
      l2.setAttribute('x2', '12.01'); l2.setAttribute('y2', '8');
      svg.appendChild(circle);
      svg.appendChild(l1);
      svg.appendChild(l2);
    }
    return svg;
  }

  function createCloseSvg() {
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('width', '20');
    svg.setAttribute('height', '20');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '2');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    svg.setAttribute('aria-hidden', 'true');
    const l1 = document.createElementNS(ns, 'line');
    l1.setAttribute('x1', '18'); l1.setAttribute('y1', '6');
    l1.setAttribute('x2', '6'); l1.setAttribute('y2', '18');
    const l2 = document.createElementNS(ns, 'line');
    l2.setAttribute('x1', '6'); l2.setAttribute('y1', '6');
    l2.setAttribute('x2', '18'); l2.setAttribute('y2', '18');
    svg.appendChild(l1);
    svg.appendChild(l2);
    return svg;
  }

  /**
   * Central Friendly Message Function
   * Follows strict pattern:
   * 1. Short title
   * 2. What went wrong in plain words
   * 3. Exactly what to do next
   */
  function showFriendlyMessage(type, title, whatHappened, whatToDo, container = el.centralMessageContainer) {
    if (!container) return;

    const msgEl = document.createElement('div');
    msgEl.className = `friendly-message ${type}`;
    msgEl.setAttribute('role', type === 'error' ? 'alert' : 'status');

    const iconDiv = document.createElement('div');
    iconDiv.className = 'msg-icon';
    iconDiv.appendChild(createSvgIcon(type));

    const contentDiv = document.createElement('div');
    contentDiv.className = 'msg-content';

    const titleDiv = document.createElement('div');
    titleDiv.className = 'msg-title';
    titleDiv.textContent = title;

    const bodyDiv = document.createElement('div');
    bodyDiv.className = 'msg-body';
    bodyDiv.textContent = whatHappened;

    const actionDiv = document.createElement('div');
    actionDiv.className = 'msg-action';
    actionDiv.textContent = whatToDo;

    contentDiv.appendChild(titleDiv);
    contentDiv.appendChild(bodyDiv);
    contentDiv.appendChild(actionDiv);

    const closeBtn = document.createElement('button');
    closeBtn.className = 'msg-close';
    closeBtn.setAttribute('aria-label', 'Close message');
    closeBtn.appendChild(createCloseSvg());
    closeBtn.addEventListener('click', () => {
      msgEl.remove();
    });

    msgEl.appendChild(iconDiv);
    msgEl.appendChild(contentDiv);
    msgEl.appendChild(closeBtn);

    container.appendChild(msgEl);
    try {
      msgEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } catch (_) {}
  }

  function clearFriendlyMessages(container = el.centralMessageContainer) {
    if (container) container.textContent = '';
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
      el.previewTbody.textContent = '';

      const sampleFive = parsed.students.slice(0, 5);
      for (const st of sampleFive) {
        const tr = document.createElement('tr');
        const tdId = document.createElement('td');
        const strongId = document.createElement('strong');
        strongId.textContent = st.id;
        tdId.appendChild(strongId);

        const tdSubj = document.createElement('td');
        tdSubj.textContent = st.subjects.join(', ');

        tr.appendChild(tdId);
        tr.appendChild(tdSubj);
        el.previewTbody.appendChild(tr);
      }

      el.dataPreviewBox.style.display = 'block';
    } catch (_) {
      el.dataPreviewBox.style.display = 'none';
    }
  }

  /**
   * Render Typo & Near-Duplicate Subject Suggestions
   */
  function renderTypoSuggestions(similar, subjectCounts) {
    if (!el.typoSuggestionsBox) return;

    const hasConfirmed = confirmedMerges.size > 0;
    const hasSuggestions = similar && Array.isArray(similar) && similar.length > 0;

    if (!hasConfirmed && !hasSuggestions) {
      el.typoSuggestionsBox.style.display = 'none';
      return;
    }

    el.typoSuggestionsBox.style.display = 'block';

    // Render confirmed merges with Undo buttons
    if (el.typoConfirmedList) {
      el.typoConfirmedList.textContent = '';
      confirmedMerges.forEach((newName, oldName) => {
        const row = document.createElement('div');
        row.className = 'typo-confirmed-row';

        const textSpan = document.createElement('span');
        textSpan.textContent = `Combined '${oldName}' into '${newName}'.`;

        const undoBtn = document.createElement('button');
        undoBtn.className = 'btn btn-tertiary btn-sm';
        undoBtn.textContent = 'Undo';
        undoBtn.addEventListener('click', () => {
          confirmedMerges.delete(oldName);
          makeTimetable();
        });

        row.appendChild(textSpan);
        row.appendChild(undoBtn);
        el.typoConfirmedList.appendChild(row);
      });
    }

    // Render pending suggestions
    if (el.typoList) {
      el.typoList.textContent = '';
      if (hasSuggestions) {
        similar.forEach(item => {
          const row = document.createElement('div');
          row.className = 'typo-row';

          const desc = document.createElement('div');
          const countA = (subjectCounts && subjectCounts[item.a]) || 0;
          const countB = (subjectCounts && subjectCounts[item.b]) || 0;
          desc.textContent = `These two subject names look almost the same: '${item.a}' (${countA} students) and '${item.b}' (${countB} students). Are they the same subject?`;
          row.appendChild(desc);

          const actions = document.createElement('div');
          actions.className = 'typo-row-actions';

          const yesBtn = document.createElement('button');
          yesBtn.className = 'btn btn-primary btn-sm';
          yesBtn.textContent = 'Yes, same subject';
          yesBtn.addEventListener('click', () => {
            confirmedMerges.set(item.mergeName, item.keepName);
            makeTimetable();
          });

          const noBtn = document.createElement('button');
          noBtn.className = 'btn btn-secondary btn-sm';
          noBtn.textContent = 'No, they are different';
          noBtn.addEventListener('click', () => {
            const pairKey = [item.a, item.b].sort().join('|||');
            dismissedTypoPairs.add(pairKey);
            row.remove();
            if (el.typoList.children.length === 0 && confirmedMerges.size === 0) {
              el.typoSuggestionsBox.style.display = 'none';
            }
          });

          actions.appendChild(yesBtn);
          actions.appendChild(noBtn);
          row.appendChild(actions);
          el.typoList.appendChild(row);
        });
      }
    }
  }

  /**
   * Helper to render all UI results
   */
  function renderAllResults(verification) {
    el.emptyStateBox.style.display = 'none';
    el.resultsSection.style.display = 'flex';

    // Enable downloads
    el.btnDownloadTimetable.disabled = false;
    el.btnDownloadTimetable.removeAttribute('title');
    el.btnPrintView.disabled = false;
    el.btnPrintView.removeAttribute('title');

    // Trigger stamp landing animation
    const stamp = el.resultBanner ? el.resultBanner.querySelector('.checked-stamp') : null;
    if (stamp) {
      stamp.classList.remove('landed');
      void stamp.offsetWidth;
      stamp.classList.add('landed');
    }

    // Update result banner text
    el.resultTitle.textContent = `${currentGraph.studentCount} students, ${currentGraph.subjectCount} subjects, ${currentTimetable.slotCount} exam times over ${currentTimetable.examDaysCount} days.`;
    el.resultSubtitle.textContent = `No student has two exams at the same time. We checked all ${currentGraph.studentCount} students one by one.`;

    // Render Timetable Views & Map
    renderTimetableTable();
    renderTimetableCards();
    renderVisGraph();
    renderGraphLegend();

    // Update Advanced Panels
    updateAdvancedPanels(verification);

    // Reset animation
    resetAnimation();

    // Move focus to results heading and scroll into view (guarded)
    const resultsHeading = document.getElementById('results-heading');
    if (resultsHeading) {
      try {
        resultsHeading.focus({ preventScroll: true });
        const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        resultsHeading.scrollIntoView({ behavior: prefersReduced ? 'auto' : 'smooth', block: 'start' });
      } catch (_) {}
    }
  }

  /**
   * Main Execution: Make my timetable
   */
  function makeTimetable() {
    clearFriendlyMessages();
    pauseAnimation();

    const rawText = el.enrollmentTextarea.value.trim();
    if (!rawText) {
      el.resultsSection.style.display = 'none';
      el.emptyStateBox.style.display = 'block';
      el.btnDownloadTimetable.disabled = true;
      el.btnPrintView.disabled = true;
      currentTimetable = null;
      currentGraph = null;
      showFriendlyMessage(
        'error',
        'No data entered',
        "We don't have any data yet.",
        "Type in your students and subjects, upload a file, or click 'Try with example data'."
      );
      return;
    }

    // Settings validation & friendly recovery
    if (!el.startDateInput.value) {
      el.startDateInput.value = getLocalDateString();
      showFriendlyMessage('info', 'Date updated', "We used today's date because none was picked.", 'You can change this anytime in the settings.');
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
      el.resultsSection.style.display = 'none';
      el.emptyStateBox.style.display = 'block';
      el.btnDownloadTimetable.disabled = true;
      el.btnPrintView.disabled = true;
      currentTimetable = null;
      currentGraph = null;
      if (err.code === 'EMPTY_INPUT' || err.code === 'EMPTY_DATA') {
        showFriendlyMessage('error', 'No data entered', "We don't have any data yet.", "Type in your students and subjects, upload a file, or click 'Try with example data'.");
      } else if (err.code === 'UNRECOGNIZED_FORMAT') {
        showFriendlyMessage('error', 'Unrecognized format', "We couldn't understand this data. Each line should look like 'Riya: Maths, Physics'.", "See the example below or click 'Try with example data'.");
      } else if (err.code === 'FEW_SUBJECTS') {
        showFriendlyMessage('error', 'Need more subjects', `We need at least 2 different subjects to make a timetable. Right now we found only ${err.count || 1}.`, 'Please add more subjects and try again.');
      } else if (err.code === 'SINGLE_STUDENT') {
        showFriendlyMessage('warning', 'No timetable needed', 'We only found 1 student (or everyone takes the exact same subject).', "You don't need a timetable for just one subject! Add more students and subjects to create a schedule.");
      } else {
        showFriendlyMessage('error', 'Could not read data', err.message || "We couldn't read your data.", "Please check the format or click 'Try with example data'.");
      }
      return;
    }

    // Check for skipped lines
    if (parsed.skippedLines && parsed.skippedLines.length > 0) {
      const count = parsed.skippedLines.length;
      const list = parsed.skippedLines.map(n => `line ${n}`).join(', ');
      showFriendlyMessage('warning', 'Incomplete lines skipped', `We skipped ${count} line(s) (${list}) because they were incomplete.`, 'Everything else was used to make your timetable.');
    }

    // Check for casing merges
    if (parsed.casingMerges && parsed.casingMerges.length > 0) {
      const first = parsed.casingMerges[0];
      showFriendlyMessage('info', 'Names matched', `We treated '${first.original}' and '${first.canonical}' as the same subject.`, 'Capitalization differences are resolved automatically.');
    }

    // Check for very large dataset
    const isVeryLarge = parsed.students.length > 2000 || Object.keys(parsed.subjectDisplayMap).length > 100;
    if (isVeryLarge) {
      showFriendlyMessage('warning', 'Large dataset', 'This is a big file, it may take a few seconds.', 'Your timetable is being calculated now.');
    }

    el.btnMakeTimetable.disabled = true;
    el.btnMakeTimetable.textContent = 'Making your timetable...';

    // Asynchronous wrap to keep UI responsive
    setTimeout(() => {
      try {
        let studentsToUse = parsed.students;
        let displayMapToUse = Object.assign({}, parsed.subjectDisplayMap);

        if (window.TextMatchModule || globalThis.TextMatchModule) {
          const TM = window.TextMatchModule || globalThis.TextMatchModule;
          studentsToUse = TM.applySubjectMerges(parsed.students, confirmedMerges);

          for (const [oldName, newName] of confirmedMerges.entries()) {
            delete displayMapToUse[oldName.toLowerCase()];
            displayMapToUse[newName.toLowerCase()] = newName;
          }

          const distinctSubjSet = new Set();
          const subjectCounts = {};
          for (const st of studentsToUse) {
            for (const s of st.subjects) {
              distinctSubjSet.add(s);
              subjectCounts[s] = (subjectCounts[s] || 0) + 1;
            }
          }
          const distinctSubjects = Array.from(distinctSubjSet);

          const similar = TM.findSimilarSubjects(distinctSubjects, {
            dismissedPairs: dismissedTypoPairs,
            subjectEnrollmentCount: subjectCounts
          });

          renderTypoSuggestions(similar, subjectCounts);
        }

        // Build conflict graph
        currentGraph = GraphModule.buildConflictGraph(studentsToUse, displayMapToUse);

        // Parse optional room capacities
        currentRooms = [];
        const rawRooms = el.roomsTextarea.value.trim();
        if (rawRooms) {
          try {
            currentRooms = SchedulerModule.parseRoomsCSV(rawRooms);
          } catch (_) {
            currentRooms = [];
          }
        }

        // Run coloring algorithm
        if (viewMode === 'simple') {
          const best = SchedulerModule.selectBestAlgorithm(currentGraph, slotsPerDay);
          currentAlgoResult = best.result;
          el.simpleMethodNote.textContent = 'We tried three methods and kept the one that needs the fewest exam times.';
        } else {
          const chosen = el.algoSelect.value;
          if (chosen === 'welsh-powell') {
            currentAlgoResult = AlgorithmsModule.welshPowell(currentGraph, true);
          } else if (chosen === 'dsatur') {
            currentAlgoResult = AlgorithmsModule.dsatur(currentGraph, true);
          } else {
            currentAlgoResult = AlgorithmsModule.sequentialGreedy(currentGraph, true);
          }
        }

        // Slot ordering & soft constraints
        currentSlotOrder = Array.from({ length: currentAlgoResult.slotCount }, (_, i) => i);
        originalSlotOrder = [...currentSlotOrder];
        el.btnUndoSpread.disabled = true;
        el.spreadAlert.textContent = '';

        if (currentAlgoResult.slotCount > 20) {
          showFriendlyMessage('info', 'Long exam period', `Your timetable needs ${currentAlgoResult.slotCount} exam times.`, 'With your current settings, this will span several weeks.');
        }

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

        if (!verification.valid || verification.clashCount > 0) {
          el.resultsSection.style.display = 'none';
          el.emptyStateBox.style.display = 'block';
          showFriendlyMessage(
            'error',
            'Timetable check failed',
            "We found a problem in the timetable and are not showing it so you don't use a wrong one.",
            "Please click 'Start over' and try again, or tell the person who gave you this tool."
          );
          return;
        }

        // Check room capacity shortfall warnings
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
        renderAllResults(verification);

      } catch (err) {
        showFriendlyMessage(
          'error',
          'Something went wrong',
          'Something went wrong on our side. Your data is safe.',
          'Please click "Start over" and try again, or try the example data.'
        );
      } finally {
        el.btnMakeTimetable.disabled = false;
        el.btnMakeTimetable.textContent = 'Make my timetable';
      }
    }, 40);
  }

  /**
   * Render Timetable Table View (Grouped by Date)
   */
  function renderTimetableTable() {
    el.timetableTbody.textContent = '';
    if (!currentTimetable || currentTimetable.entries.length === 0) return;

    const hasRooms = currentRooms && currentRooms.length > 0;
    if (hasRooms && viewMode === 'advanced') {
      el.thRooms.style.display = '';
    } else {
      el.thRooms.style.display = 'none';
    }

    const totalCols = (hasRooms && viewMode === 'advanced') ? 4 : 3;
    let lastDate = null;

    for (const entry of currentTimetable.entries) {
      if (entry.date !== lastDate) {
        lastDate = entry.date;
        const groupTr = document.createElement('tr');
        groupTr.className = 'date-group-row';
        const groupTd = document.createElement('td');
        groupTd.colSpan = totalCols;
        groupTd.className = 'date-group-header';
        groupTd.textContent = entry.formattedDate || `${entry.dayName}, ${entry.date}`;
        groupTr.appendChild(groupTd);
        el.timetableTbody.appendChild(groupTr);
      }

      const tr = document.createElement('tr');
      const slotColor = getSlotColor(entry.slotIndex);

      // Time cell
      const tdTime = document.createElement('td');
      tdTime.setAttribute('data-label', 'Time');
      tdTime.textContent = entry.time;

      // Subjects cell
      const tdSubjs = document.createElement('td');
      tdSubjs.setAttribute('data-label', 'Subjects');
      entry.subjects.forEach((s) => {
        const badge = document.createElement('span');
        badge.className = 'badge-tag';
        badge.appendChild(document.createTextNode(s.name + ' '));
        const countSpan = document.createElement('span');
        countSpan.className = 'subject-student-count';
        countSpan.textContent = `${s.studentCount} students`;
        badge.appendChild(countSpan);
        tdSubjs.appendChild(badge);
      });

      // Exam time pill cell
      const tdSlot = document.createElement('td');
      tdSlot.setAttribute('data-label', 'Exam time');
      const slotBadge = document.createElement('span');
      slotBadge.className = 'badge-slot';
      slotBadge.style.backgroundColor = slotColor;
      slotBadge.textContent = `Exam time ${entry.slotNumber}`;
      tdSlot.appendChild(slotBadge);

      tr.appendChild(tdTime);
      tr.appendChild(tdSubjs);
      tr.appendChild(tdSlot);

      // Optional Rooms cell
      if (hasRooms && viewMode === 'advanced') {
        const tdRooms = document.createElement('td');
        tdRooms.setAttribute('data-label', 'Rooms');
        tdRooms.className = 'advanced-only';
        (entry.roomAllocations || []).forEach(alloc => {
          const div = document.createElement('div');
          const strong = document.createElement('strong');
          strong.textContent = `${alloc.subject}: `;
          div.appendChild(strong);

          const rList = (alloc.rooms || []).map(r => `${r.name} [${r.seated}/${r.capacity}]`).join(', ');
          if (rList) {
            div.appendChild(document.createTextNode(rList));
          } else {
            const noRoomSpan = document.createElement('span');
            noRoomSpan.className = 'status-shortfall';
            noRoomSpan.textContent = 'No room';
            div.appendChild(noRoomSpan);
          }
          tdRooms.appendChild(div);
        });
        tr.appendChild(tdRooms);
      }

      el.timetableTbody.appendChild(tr);
    }
  }

  /**
   * Render Timetable Calendar Cards View
   */
  function renderTimetableCards() {
    el.timetableCardsContainer.textContent = '';
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

      const header = document.createElement('div');
      header.className = 'day-card-header';
      header.textContent = info.formatted || `${info.dayName}, ${date}`;
      card.appendChild(header);

      const slotsContainer = document.createElement('div');
      slotsContainer.className = 'day-card-slots';

      for (const s of info.slots) {
        const color = getSlotColor(s.slotIndex);
        const slotBlock = document.createElement('div');
        slotBlock.className = 'slot-block';
        slotBlock.style.borderLeftColor = color;

        const slotHeader = document.createElement('div');
        slotHeader.className = 'slot-block-header';

        const badge = document.createElement('span');
        badge.className = 'badge-slot';
        badge.style.backgroundColor = color;
        badge.textContent = `Exam time ${s.slotNumber}`;

        const timeSpan = document.createElement('span');
        timeSpan.textContent = s.time;

        slotHeader.appendChild(badge);
        slotHeader.appendChild(timeSpan);
        slotBlock.appendChild(slotHeader);

        const subjsDiv = document.createElement('div');
        subjsDiv.style.marginTop = '6px';

        s.subjects.forEach(sub => {
          const badge = document.createElement('span');
          badge.className = 'badge-tag';
          badge.appendChild(document.createTextNode(sub.name + ' '));
          const countSpan = document.createElement('span');
          countSpan.className = 'subject-student-count';
          countSpan.textContent = `${sub.studentCount} students`;
          badge.appendChild(countSpan);
          subjsDiv.appendChild(badge);
        });

        slotBlock.appendChild(subjsDiv);
        slotsContainer.appendChild(slotBlock);
      }

      card.appendChild(slotsContainer);
      el.timetableCardsContainer.appendChild(card);
    }
  }

  /**
   * Render vis-network visual map with offline fallback
   */
  function renderVisGraph() {
    if (!currentGraph) return;

    if (!window.vis) {
      if (el.chkShowMst) el.chkShowMst.disabled = true;
      if (el.btnFitGraph) el.btnFitGraph.disabled = true;
      if (el.btnDownloadGraph) el.btnDownloadGraph.disabled = true;
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
    if (el.chkShowMst) el.chkShowMst.disabled = false;
    if (el.btnFitGraph) el.btnFitGraph.disabled = false;
    if (el.btnDownloadGraph) el.btnDownloadGraph.disabled = false;

    el.graphMetaBadge.textContent = `(${currentGraph.subjectCount} subjects, ${currentGraph.edgeCount} links)`;

    const inkColor = cssVar('--ink');
    const boardColor = cssVar('--board');
    const inkSoftColor = cssVar('--ink-soft');
    const sheetColor = cssVar('--sheet');

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
          border: inkColor,
          highlight: { background: color, border: boardColor },
          hover: { background: color, border: boardColor }
        },
        font: { color: inkColor, size: 15, face: 'Atkinson Hyperlegible, Verdana, sans-serif', bold: true },
        shape: 'box',
        shapeProperties: { borderRadius: 4 },
        margin: 10,
        borderWidth: 1.5,
        shadow: false
      };
    });

    const edges = currentGraph.edges.map(e => ({
      id: `${e.u}--${e.v}`,
      from: e.u,
      to: e.v,
      label: String(e.weight),
      title: `${e.weight} student(s) take both "${e.u}" and "${e.v}"`,
      font: { color: inkSoftColor, size: 12, strokeWidth: 3, strokeColor: sheetColor },
      color: { color: '#8C978F', highlight: boardColor, hover: boardColor },
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

    if (el.chkShowMst && el.chkShowMst.checked) {
      applyMstHighlight(true);
    }
  }

  /**
   * Applies or removes Spanning Tree edge styling on vis-network
   */
  function applyMstHighlight(enable) {
    if (!el.chkShowMst) return;
    if (!window.vis || !visEdgesDataSet || !currentGraph) {
      el.chkShowMst.disabled = true;
      return;
    }
    el.chkShowMst.disabled = false;

    if (!window.MSTModule && !globalThis.MSTModule) return;
    const MST = window.MSTModule || globalThis.MSTModule;

    if (enable) {
      const mstRes = MST.kruskal(currentGraph.subjects, currentGraph.edges, { maximize: true });
      const mstEdgeSet = new Set(mstRes.edges.map(e => [e.u, e.v].sort().join('|||')));

      if (el.mstInfoBadge) {
        const pieceWord = mstRes.components === 1 ? 'part' : 'parts';
        el.mstInfoBadge.textContent = `(${mstRes.totalWeight} shared students, ${mstRes.components} ${pieceWord})`;
      }

      const boardColor = cssVar('--board');
      const ruleColor = cssVar('--rule');

      const updates = currentGraph.edges.map(e => {
        const key = [e.u, e.v].sort().join('|||');
        const isMst = mstEdgeSet.has(key);
        return {
          id: `${e.u}--${e.v}`,
          width: isMst ? 5 : 1,
          color: { color: isMst ? boardColor : ruleColor, highlight: boardColor }
        };
      });
      visEdgesDataSet.update(updates);
    } else {
      if (el.mstInfoBadge) {
        el.mstInfoBadge.textContent = '';
      }
      const boardColor = cssVar('--board');
      const restores = currentGraph.edges.map(e => ({
        id: `${e.u}--${e.v}`,
        width: Math.min(6, 1 + Math.log2(e.weight + 1)),
        color: { color: '#8C978F', highlight: boardColor }
      }));
      visEdgesDataSet.update(restores);
    }
  }

  /**
   * Render Plain Language Legend
   */
  function renderGraphLegend() {
    if (!currentGraph || !currentAlgoResult) return;
    el.graphLegend.textContent = '';

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

      const colorSpan = document.createElement('span');
      colorSpan.className = 'legend-color';
      colorSpan.style.backgroundColor = color;

      const textSpan = document.createElement('span');
      textSpan.textContent = `Exam time ${s + 1}: ${groups[s].join(', ') || 'Empty'}`;

      chip.appendChild(colorSpan);
      chip.appendChild(textSpan);
      el.graphLegend.appendChild(chip);
    }
  }

  /**
   * Update Advanced Metrics & Comparison Panels
   */
  function updateAdvancedPanels(verification) {
    if (!currentGraph || !currentAlgoResult || !currentTimetable) return;

    // Technical stats
    el.statSubjects.textContent = String(currentGraph.subjectCount);
    el.statStudents.textContent = String(currentGraph.studentCount);
    el.statEdges.textContent = String(currentGraph.edgeCount);
    el.statDensity.textContent = `${(currentGraph.density * 100).toFixed(1)}%`;
    el.statMaxDeg.textContent = String(currentGraph.maxDegree);
    el.statUpperBound.textContent = String(currentGraph.upperBound);
    el.statSlotsUsed.textContent = String(currentAlgoResult.slotCount);
    el.statExamDays.textContent = String(currentTimetable.examDaysCount);
    el.statClashes.textContent = String(verification.clashCount);
    el.statBtb.textContent = String(currentTimetable.backToBackCount);
    el.statRuntime.textContent = `${currentAlgoResult.runtimeMs.toFixed(3)} ms`;

    // Rooms breakdown
    el.roomsDetailTbody.textContent = '';
    el.roomWarningsList.textContent = '';

    if (currentTimetable.roomWarnings && currentTimetable.roomWarnings.length > 0) {
      for (const warn of currentTimetable.roomWarnings) {
        const warnDiv = document.createElement('div');
        warnDiv.className = 'room-warning-item';
        warnDiv.textContent = `Room capacity alert: Exam time ${warn.slotNumber} needs ${warn.needed} seats, but available rooms only fit ${warn.seated}.`;
        el.roomWarningsList.appendChild(warnDiv);
      }
    }

    for (const entry of currentTimetable.entries) {
      for (const alloc of entry.roomAllocations) {
        const tr = document.createElement('tr');
        const color = getSlotColor(entry.slotIndex);
        const rDetails = alloc.rooms.map(r => `${r.name} (${r.seated}/${r.capacity})`).join(', ');
        const isShortfall = alloc.shortfall > 0;

        const tdSlot = document.createElement('td');
        const badge = document.createElement('span');
        badge.className = 'badge-slot';
        badge.style.backgroundColor = color;
        badge.textContent = `Exam time ${entry.slotNumber}`;
        tdSlot.appendChild(badge);

        const tdSubj = document.createElement('td');
        const strongSubj = document.createElement('strong');
        strongSubj.textContent = alloc.subject;
        tdSubj.appendChild(strongSubj);

        const tdCount = document.createElement('td');
        tdCount.textContent = String(alloc.studentCount);

        const tdRooms = document.createElement('td');
        if (rDetails) {
          tdRooms.textContent = rDetails;
        } else {
          const noneSpan = document.createElement('span');
          noneSpan.className = 'status-shortfall';
          noneSpan.textContent = 'None';
          tdRooms.appendChild(noneSpan);
        }

        const tdStatus = document.createElement('td');
        if (isShortfall) {
          const shortSpan = document.createElement('span');
          shortSpan.className = 'status-shortfall';
          shortSpan.textContent = `Shortfall: -${alloc.shortfall}`;
          tdStatus.appendChild(shortSpan);
        } else {
          const seatedSpan = document.createElement('span');
          seatedSpan.className = 'status-seated';
          seatedSpan.textContent = 'Seated';
          tdStatus.appendChild(seatedSpan);
        }

        tr.appendChild(tdSlot);
        tr.appendChild(tdSubj);
        tr.appendChild(tdCount);
        tr.appendChild(tdRooms);
        tr.appendChild(tdStatus);
        el.roomsDetailTbody.appendChild(tr);
      }
    }

    // Verifier log
    el.verifierTbody.textContent = '';
    for (const st of currentGraph.students) {
      const tr = document.createElement('tr');
      const slotMap = {};
      for (const subj of st.subjects) {
        const slot = currentAlgoResult.colorOf[subj];
        if (!slotMap[slot]) slotMap[slot] = [];
        slotMap[slot].push(subj);
      }

      let hasClash = false;
      const pillsContainer = document.createElement('div');

      const sortedSlots = Object.keys(slotMap).map(Number).sort((a, b) => a - b);
      for (const s of sortedSlots) {
        const subjs = slotMap[s];
        const color = getSlotColor(s);
        const pill = document.createElement('span');
        if (subjs.length > 1) {
          hasClash = true;
          pill.className = 'badge-slot';
          pill.style.backgroundColor = cssVar('--stamp');
          pill.style.color = cssVar('--sheet');
          pill.style.marginRight = '4px';
          pill.textContent = `Exam time ${s + 1}: ${subjs.join(', ')}`;
        } else {
          pill.className = 'badge-tag';
          pill.style.borderLeft = `3px solid ${color}`;
          pill.style.marginRight = '4px';
          pill.textContent = `Exam time ${s + 1}: ${subjs[0]}`;
        }
        pillsContainer.appendChild(pill);
      }

      const tdId = document.createElement('td');
      const strongId = document.createElement('strong');
      strongId.textContent = st.id;
      tdId.appendChild(strongId);

      const tdCount = document.createElement('td');
      tdCount.textContent = String(st.subjects.length);

      const tdPills = document.createElement('td');
      tdPills.appendChild(pillsContainer);

      const tdStatus = document.createElement('td');
      const statusSpan = document.createElement('span');
      if (hasClash) {
        statusSpan.className = 'status-clash';
        statusSpan.textContent = 'Clash';
      } else {
        statusSpan.className = 'status-clean';
        statusSpan.textContent = 'Clean';
      }
      tdStatus.appendChild(statusSpan);

      tr.appendChild(tdId);
      tr.appendChild(tdCount);
      tr.appendChild(tdPills);
      tr.appendChild(tdStatus);
      el.verifierTbody.appendChild(tr);
    }

    // Render Counting Sort histogram
    if (el.studentHistogramContainer && (window.SortingModule || globalThis.SortingModule)) {
      const SM = window.SortingModule || globalThis.SortingModule;
      if (typeof SM.buildHistogram === 'function') {
        el.studentHistogramContainer.textContent = '';
        const subjCounts = currentGraph.students.map(st => st.subjects.length);
        const hist = SM.buildHistogram(subjCounts);
        let maxCount = 0;
        for (let i = 0; i < hist.length; i++) {
          if (hist[i] > maxCount) maxCount = hist[i];
        }

        for (let numSubj = 1; numSubj < hist.length; numSubj++) {
          const count = hist[numSubj] || 0;
          if (count === 0 && numSubj > 8) continue;

          const row = document.createElement('div');
          row.className = 'hist-bar-row';

          const label = document.createElement('div');
          label.className = 'hist-bar-label';
          label.textContent = `${numSubj} ${numSubj === 1 ? 'subject' : 'subjects'}:`;

          const track = document.createElement('div');
          track.className = 'hist-bar-track';

          const fill = document.createElement('div');
          fill.className = 'hist-bar-fill';
          const pct = maxCount > 0 ? (count / maxCount) * 100 : 0;
          fill.style.width = `${pct}%`;

          const countSpan = document.createElement('div');
          countSpan.className = 'hist-bar-count';
          countSpan.textContent = `${count} st.`;

          track.appendChild(fill);
          row.appendChild(label);
          row.appendChild(track);
          row.appendChild(countSpan);
          el.studentHistogramContainer.appendChild(row);
        }
      }
    }

    // Room Shortage Fix box state
    if (el.roomFixBox) {
      if (currentTimetable.roomWarnings && currentTimetable.roomWarnings.length > 0) {
        el.roomFixBox.style.display = 'block';
        el.btnSuggestRoomFix.disabled = false;
      } else {
        el.roomFixBox.style.display = 'none';
        el.btnApplyRoomFix.disabled = true;
      }
    }

    // Comparison table
    updateComparisonTable();
  }

  /**
   * Update Algorithm Comparison Table
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

    el.comparisonTbody.textContent = '';
    const maxSlotsPossible = Math.max(...results.map(r => r.slots), currentGraph.upperBound, 1);

    for (const r of results) {
      const tr = document.createElement('tr');
      const isBest = r.slots === minSlots;
      if (isBest) tr.className = 'best-row';

      const barPercent = Math.min(100, Math.round((r.slots / maxSlotsPossible) * 100));

      const tdName = document.createElement('td');
      const strongName = document.createElement('strong');
      strongName.textContent = r.name;
      tdName.appendChild(strongName);
      if (isBest) {
        const bestBadge = document.createElement('span');
        bestBadge.className = 'badge-slot';
        bestBadge.style.backgroundColor = cssVar('--ok-bg');
        bestBadge.style.color = cssVar('--board');
        bestBadge.style.marginLeft = '8px';
        bestBadge.textContent = 'Fewest';
        tdName.appendChild(bestBadge);
      }

      const tdSlots = document.createElement('td');
      const strongSlots = document.createElement('strong');
      strongSlots.textContent = String(r.slots);
      tdSlots.appendChild(strongSlots);

      const tdBar = document.createElement('td');
      const barContainer = document.createElement('div');
      barContainer.className = 'bar-container';

      const barFill = document.createElement('div');
      barFill.className = `bar-fill ${isBest ? 'best' : ''}`;
      barFill.style.width = `${barPercent}px`;

      const barText = document.createElement('span');
      barText.style.fontSize = '12px';
      barText.style.color = cssVar('--ink-soft');
      barText.textContent = `${r.slots} / ${currentGraph.upperBound}`;

      barContainer.appendChild(barFill);
      barContainer.appendChild(barText);
      tdBar.appendChild(barContainer);

      const tdBtb = document.createElement('td');
      tdBtb.textContent = String(r.btb);

      const tdClashes = document.createElement('td');
      const clashSpan = document.createElement('span');
      clashSpan.className = 'status-clean';
      clashSpan.textContent = String(r.clashes);
      tdClashes.appendChild(clashSpan);

      const tdRuntime = document.createElement('td');
      const codeRuntime = document.createElement('code');
      codeRuntime.textContent = `${r.runtimeMs.toFixed(3)} ms`;
      tdRuntime.appendChild(codeRuntime);

      tr.appendChild(tdName);
      tr.appendChild(tdSlots);
      tr.appendChild(tdBar);
      tr.appendChild(tdBtb);
      tr.appendChild(tdClashes);
      tr.appendChild(tdRuntime);
      el.comparisonTbody.appendChild(tr);
    }
  }

  /**
   * Step-by-Step Animation (Advanced Only)
   */
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
    if (!currentAlgoResult || !currentAlgoResult.steps) return;
    el.btnAnimPlay.style.display = 'none';
    el.btnAnimPause.style.display = 'inline-flex';

    if (animCurrentStep >= currentAlgoResult.steps.length) {
      animCurrentStep = 0;
    }

    animTimer = setInterval(() => {
      if (animCurrentStep < currentAlgoResult.steps.length) {
        animCurrentStep++;
        updateAnimationStepUI();
      } else {
        pauseAnimation();
      }
    }, animSpeedMs);
  }

  function stepNext() {
    pauseAnimation();
    if (currentAlgoResult && currentAlgoResult.steps && animCurrentStep < currentAlgoResult.steps.length) {
      animCurrentStep++;
      updateAnimationStepUI();
    }
  }

  function stepPrev() {
    pauseAnimation();
    if (animCurrentStep > 0) {
      animCurrentStep--;
      updateAnimationStepUI();
    }
  }

  function updateAnimationStepUI() {
    if (!currentAlgoResult || !currentAlgoResult.steps || !visNodesDataSet) return;

    const totalSteps = currentAlgoResult.steps.length;
    el.animStepCounter.textContent = `Step ${animCurrentStep} / ${totalSteps}`;

    if (animCurrentStep === 0) {
      const resetNodes = currentGraph.subjects.map(subj => ({
        id: subj,
        label: subj,
        color: { background: '#D5DAD2', border: cssVar('--edge') },
        borderWidth: 1.5
      }));
      visNodesDataSet.update(resetNodes);
      el.animStepCaption.textContent = 'Click Play or Next to see how the method assigns an exam time to each subject one by one.';
      return;
    }

    const updates = [];
    const coloredSoFar = new Set();
    const inkColor = cssVar('--ink');
    const boardColor = cssVar('--board');
    const edgeColor = cssVar('--edge');

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
          border: isCurrentActive ? inkColor : boardColor
        },
        borderWidth: isCurrentActive ? 4 : 2
      });
    }

    for (const subj of currentGraph.subjects) {
      if (!coloredSoFar.has(subj)) {
        updates.push({
          id: subj,
          label: subj,
          color: { background: '#D5DAD2', border: edgeColor },
          borderWidth: 1.5
        });
      }
    }

    visNodesDataSet.update(updates);

    const activeStep = currentAlgoResult.steps[animCurrentStep - 1];
    el.animStepCaption.textContent = '';
    const strongPrefix = document.createElement('strong');
    if (animCurrentStep === totalSteps) {
      strongPrefix.textContent = 'Finished: ';
      el.animStepCaption.appendChild(strongPrefix);
      el.animStepCaption.appendChild(document.createTextNode(`All ${totalSteps} subjects scheduled in ${currentAlgoResult.slotCount} exam times with zero clashes!`));
    } else {
      strongPrefix.textContent = `Step ${animCurrentStep}: `;
      el.animStepCaption.appendChild(strongPrefix);
      el.animStepCaption.appendChild(document.createTextNode(activeStep.explanation.replace(/Slot/g, 'Exam time')));
    }
  }

  // --------------------------------------------------------------------------
  // DOWNLOADS & EXPORTS
  // --------------------------------------------------------------------------

  function downloadTimetableCSV() {
    if (!currentTimetable || currentTimetable.entries.length === 0) {
      showFriendlyMessage('warning', 'Make your timetable first', "There is no timetable to download yet.", "Click 'Make my timetable' first.");
      return;
    }

    const headers = ['Exam_Time', 'Date', 'Day', 'Time', 'Subject', 'Allocated_Rooms', 'Students_Enrolled'];
    const rows = [headers.map(sanitizeCSVField).join(',')];

    for (const e of currentTimetable.entries) {
      for (const subj of e.subjects) {
        const alloc = (e.roomAllocations || []).find(a => a.subject === subj.name);
        const roomsStr = (alloc?.rooms || []).map(r => `${r.name}(${r.seated})`).join(';');
        rows.push([
          sanitizeCSVField(`Exam time ${e.slotNumber}`),
          sanitizeCSVField(e.date),
          sanitizeCSVField(e.dayName),
          sanitizeCSVField(e.time),
          sanitizeCSVField(subj.name),
          sanitizeCSVField(roomsStr || 'None'),
          sanitizeCSVField(subj.studentCount)
        ].join(','));
      }
    }

    const csvContent = '\uFEFF' + rows.join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
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

    const rng = mulberry32(seed);

    const STEM_NAMES = [
      'Calculus', 'Linear Algebra', 'Mechanics', 'Thermodynamics', 'Electromagnetism',
      'Quantum Physics', 'Organic Chemistry', 'Inorganic Chemistry', 'Data Structures', 'Algorithms',
      'Operating Systems', 'Databases', 'Computer Networks', 'Software Engineering', 'Artificial Intelligence',
      'Microbiology', 'Biochemistry', 'Genetics', 'Statistics', 'Microeconomics',
      'Macroeconomics', 'Financial Accounting', 'Corporate Finance', 'Marketing', 'Organizational Behavior',
      'World History', 'Ethics', 'Psychology', 'Sociology', 'Digital Electronics'
    ];

    const subjects = [];
    for (let i = 0; i < numSubj; i++) {
      if (i < STEM_NAMES.length) {
        subjects.push(STEM_NAMES[i]);
      } else {
        subjects.push(`Course-${i + 1}`);
      }
    }

    const rows = ['student_id,subjects'];
    for (let s = 1; s <= numStudents; s++) {
      const stId = `STU${String(s).padStart(4, '0')}`;
      const chosen = [];
      const pool = [...subjects];

      const k = Math.max(2, Math.min(pool.length, Math.round(subjPerSt + (rng() * 2 - 1))));
      for (let j = 0; j < k; j++) {
        const idx = Math.floor(rng() * pool.length);
        chosen.push(pool[idx]);
        pool.splice(idx, 1);
      }
      rows.push(`${stId},"${chosen.join(';')}"`);
    }

    el.enrollmentTextarea.value = rows.join('\n');
    resetTypoDecisions();
    updateDataPreview();

    showFriendlyMessage(
      'success',
      'Big dataset generated',
      `Created ${numStudents} students across ${numSubj} subjects (seed ${seed}).`,
      'Click "Make my timetable" below to schedule.'
    );
  }

  // --------------------------------------------------------------------------
  // ACCESSIBLE TAB CONTROLLERS
  // --------------------------------------------------------------------------

  function initInputTabs() {
    const tabs = [
      { btn: el.tabBtnType, pane: el.paneType },
      { btn: el.tabBtnUpload, pane: el.paneUpload }
    ].filter(t => t.btn && t.pane);

    function selectTab(index) {
      tabs.forEach((t, i) => {
        const isSel = i === index;
        t.btn.classList.toggle('active', isSel);
        t.btn.setAttribute('aria-selected', isSel ? 'true' : 'false');
        t.btn.tabIndex = isSel ? 0 : -1;
        t.pane.style.display = isSel ? 'block' : 'none';
        if (isSel) t.btn.focus();
      });
    }

    tabs.forEach((t, i) => {
      t.btn.addEventListener('click', () => selectTab(i));
      t.btn.addEventListener('keydown', (e) => {
        let target = -1;
        if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') target = 1 - i;
        else if (e.key === 'Home') target = 0;
        else if (e.key === 'End') target = 1;
        if (target >= 0) {
          e.preventDefault();
          selectTab(target);
        }
      });
    });
  }

  function initAdvTabs() {
    const tabs = [
      { btn: document.getElementById('tab-adv-numbers'), pane: document.getElementById('pane-adv-numbers') },
      { btn: document.getElementById('tab-adv-compare'), pane: document.getElementById('pane-adv-compare') },
      { btn: document.getElementById('tab-adv-rooms'), pane: document.getElementById('pane-adv-rooms') },
      { btn: document.getElementById('tab-adv-shrink'), pane: document.getElementById('pane-adv-shrink') },
      { btn: document.getElementById('tab-adv-check'), pane: document.getElementById('pane-adv-check') }
    ].filter(t => t.btn && t.pane);

    function selectTab(index) {
      tabs.forEach((t, i) => {
        const isSel = i === index;
        t.btn.classList.toggle('active', isSel);
        t.btn.setAttribute('aria-selected', isSel ? 'true' : 'false');
        t.btn.tabIndex = isSel ? 0 : -1;
        t.pane.style.display = isSel ? 'block' : 'none';
        if (isSel) t.btn.focus();
      });
    }

    tabs.forEach((t, i) => {
      t.btn.addEventListener('click', () => selectTab(i));
      t.btn.addEventListener('keydown', (e) => {
        let target = -1;
        if (e.key === 'ArrowRight') target = (i + 1) % tabs.length;
        else if (e.key === 'ArrowLeft') target = (i - 1 + tabs.length) % tabs.length;
        else if (e.key === 'Home') target = 0;
        else if (e.key === 'End') target = tabs.length - 1;
        if (target >= 0) {
          e.preventDefault();
          selectTab(target);
        }
      });
    });
  }

  function initViewSwitch() {
    if (!el.btnViewTable || !el.btnViewCards) return;

    el.btnViewTable.addEventListener('click', () => {
      el.btnViewTable.classList.add('active');
      el.btnViewTable.setAttribute('aria-selected', 'true');
      el.btnViewCards.classList.remove('active');
      el.btnViewCards.setAttribute('aria-selected', 'false');
      el.timetableTableContainer.style.display = 'block';
      el.timetableCardsContainer.style.display = 'none';
    });

    el.btnViewCards.addEventListener('click', () => {
      el.btnViewCards.classList.add('active');
      el.btnViewCards.setAttribute('aria-selected', 'true');
      el.btnViewTable.classList.remove('active');
      el.btnViewTable.setAttribute('aria-selected', 'false');
      el.timetableTableContainer.style.display = 'none';
      el.timetableCardsContainer.style.display = 'flex';
    });
  }

  // --------------------------------------------------------------------------
  // EVENT LISTENERS INITIALIZATION
  // --------------------------------------------------------------------------

  function initEventListeners() {
    // Mode toggles
    el.btnModeSimple.addEventListener('click', () => setViewMode('simple'));
    el.btnModeAdvanced.addEventListener('click', () => setViewMode('advanced'));

    // FAQ Toggle
    if (el.btnToggleFaq && el.faqBox) {
      el.btnToggleFaq.addEventListener('click', () => {
        const isClosed = el.faqBox.style.display === 'none';
        el.faqBox.style.display = isClosed ? 'block' : 'none';
        el.btnToggleFaq.setAttribute('aria-expanded', isClosed ? 'true' : 'false');
      });
    }
    if (el.btnCloseFaq && el.faqBox) {
      el.btnCloseFaq.addEventListener('click', () => {
        el.faqBox.style.display = 'none';
        if (el.btnToggleFaq) el.btnToggleFaq.setAttribute('aria-expanded', 'false');
      });
    }

    // What is this disclosure
    if (el.btnToggleWhat && el.whatContent) {
      el.btnToggleWhat.addEventListener('click', () => {
        const isOpen = el.whatContent.hasAttribute('open');
        el.btnToggleWhat.setAttribute('aria-expanded', (!isOpen) ? 'true' : 'false');
      });
    }

    // Back to Step 1 link
    const linkBack = document.getElementById('btn-back-to-step1');
    if (linkBack) {
      linkBack.addEventListener('click', (e) => {
        e.preventDefault();
        try {
          const step1 = document.getElementById('step-1-section');
          if (step1) {
            step1.scrollIntoView({ behavior: 'smooth', block: 'start' });
            el.enrollmentTextarea.focus();
          }
        } catch (_) {}
      });
    }

    // Sample data button
    el.btnLoadSample.addEventListener('click', () => {
      resetTypoDecisions();
      el.enrollmentTextarea.value = window.SAMPLE_FRIENDLY_TEXT || '';
      if (window.SAMPLE_ROOMS_CSV) {
        el.roomsTextarea.value = window.SAMPLE_ROOMS_CSV;
      }
      updateDataPreview();
      showFriendlyMessage(
        'info',
        'Example data loaded',
        'We loaded 60 sample students across 12 subjects.',
        'Click "Make my timetable" below to schedule.'
      );
    });

    // File drag & drop
    el.dropBox.addEventListener('click', () => el.fileInput.click());
    el.dropBox.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        el.fileInput.click();
      }
    });

    el.dropBox.addEventListener('dragover', (e) => {
      e.preventDefault();
      el.dropBox.style.borderColor = cssVar('--board');
    });

    el.dropBox.addEventListener('dragleave', () => {
      el.dropBox.style.borderColor = cssVar('--edge');
    });

    el.dropBox.addEventListener('drop', (e) => {
      e.preventDefault();
      el.dropBox.style.borderColor = cssVar('--edge');
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handleFileUpload(e.dataTransfer.files[0]);
      }
    });

    el.fileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files.length > 0) {
        handleFileUpload(e.target.files[0]);
      }
    });

    function handleFileUpload(file) {
      resetTypoDecisions();
      const reader = new FileReader();
      reader.onload = function (event) {
        const content = event.target.result;
        el.enrollmentTextarea.value = content;
        el.tabBtnType.click();
        updateDataPreview();
        showFriendlyMessage(
          'success',
          'File loaded',
          `Successfully loaded "${file.name}".`,
          'Click "Make my timetable" below to schedule.'
        );
      };
      reader.onerror = function () {
        showFriendlyMessage('error', 'Could not open file', "We couldn't read the file you selected.", 'Please try opening it or type your students in.');
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
      resetTypoDecisions();
      updateDataPreview();
    });

    el.btnEditData.addEventListener('click', () => {
      resetTypoDecisions();
      el.tabBtnType.click();
      el.enrollmentTextarea.focus();
    });

    // Timings toggle
    el.btnToggleTimings.addEventListener('click', (e) => {
      // Handled natively by details element
    });

    // Make Timetable button
    el.btnMakeTimetable.addEventListener('click', makeTimetable);

    // Advanced Algorithm selection
    el.algoSelect.addEventListener('change', () => {
      const chosen = el.algoSelect.value;
      if (chosen === 'welsh-powell') {
        el.algoDescription.textContent = 'Sorts subjects by how many other subjects they share students with, scheduling the busiest subjects first.';
      } else if (chosen === 'dsatur') {
        el.algoDescription.textContent = 'At each step, colors the subject that currently has the most conflicting exam times already placed next to it.';
      } else {
        el.algoDescription.textContent = 'Assigns exam times in the exact order subjects appear in your list.';
      }
      if (currentTimetable) {
        makeTimetable();
      }
    });

    // Breathing room optimizer (2-Opt)
    el.btnSpreadExams.addEventListener('click', () => {
      if (!currentGraph || !currentAlgoResult || !currentTimetable) return;

      const opt = SchedulerModule.optimizeBackToBack({
        graph: currentGraph,
        colorOf: currentAlgoResult.colorOf,
        slotsPerDay: parseInt(el.slotsPerDayInput.value, 10) || 2,
        currentOrder: currentSlotOrder
      });

      currentSlotOrder = opt.order;

      // Re-generate timetable with optimized order
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

      el.btnUndoSpread.disabled = false;
      const btbReduced = opt.initialBtb - opt.optimizedBtb;
      if (btbReduced > 0) {
        el.spreadAlert.textContent = `Improved! Same-day back-to-backs reduced by ${btbReduced}.`;
      } else {
        el.spreadAlert.textContent = 'No same-day back-to-backs could be reduced further.';
      }
    });

    el.btnUndoSpread.addEventListener('click', () => {
      if (!originalSlotOrder) return;
      currentSlotOrder = [...originalSlotOrder];

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

      el.btnUndoSpread.disabled = true;
      el.spreadAlert.textContent = 'Restored initial exam time order.';
    });

    // Reallocate rooms
    el.btnAllocateRooms.addEventListener('click', () => {
      if (currentTimetable) {
        makeTimetable();
      }
    });

    // Fit Graph & Download Graph
    el.btnFitGraph.addEventListener('click', () => {
      if (visNetwork) visNetwork.fit({ animation: { duration: 600, easingFunction: 'easeInOutQuad' } });
    });
    el.btnDownloadGraph.addEventListener('click', downloadGraphPNG);

    // Downloads
    el.btnDownloadTimetable.addEventListener('click', downloadTimetableCSV);
    el.btnPrintView.addEventListener('click', () => window.print());

    // Comparison & Re-verify
    el.btnRunComparison.addEventListener('click', updateComparisonTable);
    el.btnReVerify.addEventListener('click', () => {
      if (!currentGraph || !currentAlgoResult) return;
      const v = SchedulerModule.verifySchedule(currentGraph.students, currentAlgoResult.colorOf);
      updateAdvancedPanels(v);
      if (v.valid) {
        showFriendlyMessage('success', 'Double-check complete', `All ${currentGraph.students.length} students verified clash-free.`, 'Your timetable is safe to use.');
      }
    });

    // Stress test generator
    el.btnGenerateStress.addEventListener('click', generateStressDataset);

    // Animation controls
    el.btnAnimReset.addEventListener('click', resetAnimation);
    el.btnAnimPrev.addEventListener('click', stepPrev);
    el.btnAnimPlay.addEventListener('click', playAnimation);
    el.btnAnimPause.addEventListener('click', pauseAnimation);
    el.btnAnimNext.addEventListener('click', stepNext);

    el.animSpeedSlider.addEventListener('input', () => {
      animSpeedMs = parseInt(el.animSpeedSlider.value, 10);
      el.speedLabel.textContent = `${animSpeedMs}ms`;
      if (animTimer) {
        playAnimation();
      }
    });

    // MST Checkbox
    if (el.chkShowMst) {
      el.chkShowMst.addEventListener('change', () => {
        applyMstHighlight(el.chkShowMst.checked);
      });
    }

    // Room Shortage Knapsack Suggest & Apply
    if (el.btnSuggestRoomFix) {
      el.btnSuggestRoomFix.addEventListener('click', () => {
        try {
          if (!currentTimetable) {
            showFriendlyMessage('info', 'Make your timetable first', 'We need a generated timetable before checking room allocations.', "Click 'Make my timetable' above.");
            return;
          }
          const plan = SchedulerModule.planRoomOverflow(currentTimetable, currentRooms);
          el.roomFixBox.style.display = 'block';
          el.roomFixDetails.textContent = '';

          if (!plan || plan.length === 0) {
            el.roomFixDetails.textContent = 'All exams fit in the available rooms without any shortfall! No changes are needed.';
            el.btnApplyRoomFix.disabled = true;
            return;
          }

          let hasOverflow = false;
          plan.forEach(item => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'room-fix-plan-item';

            const title = document.createElement('strong');
            title.textContent = `Exam time ${item.slotNumber}: `;
            itemDiv.appendChild(title);

            const parts = [];
            if (item.keep.length > 0) {
              parts.push(`Keep: ${item.keep.join(', ')}`);
            }
            if (item.overflow.length > 0) {
              hasOverflow = true;
              parts.push(`Move to an extra exam time: ${item.overflow.join(', ')}`);
            }
            const textSpan = document.createElement('span');
            textSpan.textContent = parts.join(' | ');
            itemDiv.appendChild(textSpan);

            if (item.unfixable && item.unfixable.length > 0) {
              const totalCap = currentRooms.reduce((s, r) => s + r.capacity, 0);
              item.unfixable.forEach(subjName => {
                const needed = currentGraph ? currentGraph.subjectEnrollmentCount[subjName] : '?';
                const unfixDiv = document.createElement('div');
                unfixDiv.className = 'status-shortfall';
                unfixDiv.textContent = `"${subjName}" has ${needed} students, but all rooms together only seat ${totalCap}. Please add a bigger room.`;
                itemDiv.appendChild(unfixDiv);
              });
            }

            el.roomFixDetails.appendChild(itemDiv);
          });

          el.btnApplyRoomFix.disabled = !hasOverflow;
        } catch (err) {
          showFriendlyMessage('error', 'Room suggestion failed', 'Could not compute room plan.', 'Please check room inputs.');
        }
      });
    }

    if (el.btnApplyRoomFix) {
      el.btnApplyRoomFix.addEventListener('click', () => {
        try {
          if (!currentTimetable || !currentGraph || !currentAlgoResult) return;

          const startDate = el.startDateInput.value || '2026-10-26';
          const slotsPerDay = parseInt(el.slotsPerDayInput.value, 10) || 2;
          const timeLabels = el.timeLabelsInput.value.split(',').map(s => s.trim()).filter(Boolean);
          const skipWeekends = el.skipWeekendsCheck.checked;

          let pass = 0;

          while (pass < 10) {
            pass++;
            const plan = SchedulerModule.planRoomOverflow(currentTimetable, currentRooms);
            const actionable = plan.filter(p => p.overflow && p.overflow.length > 0);
            if (actionable.length === 0) break;

            const applied = SchedulerModule.applyRoomOverflowPlan(
              currentGraph,
              currentAlgoResult.colorOf,
              currentSlotOrder,
              actionable
            );

            const nextAlgoResult = Object.assign({}, currentAlgoResult, {
              colorOf: applied.colorOf,
              slotCount: applied.slotCount
            });

            const nextTimetable = SchedulerModule.generateTimetable({
              graph: currentGraph,
              colorOf: nextAlgoResult.colorOf,
              startDate,
              slotsPerDay,
              timeLabels,
              skipWeekends,
              slotOrder: applied.slotOrder,
              rooms: currentRooms
            });

            const v = SchedulerModule.verifySchedule(currentGraph.students, nextAlgoResult.colorOf);
            if (!v.valid || v.clashCount > 0) {
              showFriendlyMessage(
                'error',
                'Timetable check failed',
                'Applying room overflow caused a conflict. Changes were discarded.',
                'Please add larger rooms in settings.'
              );
              return;
            }

            currentAlgoResult = nextAlgoResult;
            currentTimetable = nextTimetable;
            originalSlotOrder = [...applied.slotOrder];
            currentSlotOrder = [...applied.slotOrder];
          }

          renderTimetableTable();
          renderTimetableCards();
          updateAdvancedPanels(SchedulerModule.verifySchedule(currentGraph.students, currentAlgoResult.colorOf));

          el.resultTitle.textContent = `${currentGraph.studentCount} students, ${currentGraph.subjectCount} subjects, ${currentTimetable.slotCount} exam times over ${currentTimetable.examDaysCount} days.`;
          el.resultSubtitle.textContent = `No student has two exams at the same time. We checked all ${currentGraph.studentCount} students one by one.`;

          if (el.animStepCaption) {
            el.animStepCaption.textContent = 'The animation shows the original timetable, before the room fix.';
          }

          showFriendlyMessage('success', 'Room fix applied', 'Overflow exams have been assigned to new exam times.', 'See updated timetable and room breakdown below.');
        } catch (err) {
          showFriendlyMessage('error', 'Could not apply room fix', 'An error occurred while updating the schedule.', 'Please check room sizes.');
        }
      });
    }

    // Huffman Compression
    if (el.btnRunHuffman) {
      el.btnRunHuffman.addEventListener('click', () => {
        try {
          if (!currentGraph) {
            showFriendlyMessage('info', 'Make your timetable first', 'We need enrollment data loaded before compressing.', "Click 'Make my timetable' above.");
            return;
          }
          if (!window.HuffmanModule && !globalThis.HuffmanModule) return;
          const HM = window.HuffmanModule || globalThis.HuffmanModule;
          const comp = HM.compressEnrollments(currentGraph.students);
          currentHuffmanResult = comp;

          const decomp = HM.decompressEnrollments(comp.bytes);
          let roundTripPass = decomp.length === currentGraph.students.length;
          if (roundTripPass) {
            for (let i = 0; i < decomp.length; i++) {
              const a = decomp[i].subjects.slice().sort().join(',');
              const b = currentGraph.students[i].subjects.slice().sort().join(',');
              if (a !== b) {
                roundTripPass = false;
                break;
              }
            }
          }

          el.huffmanResults.style.display = 'block';
          el.btnDownloadHuffman.disabled = false;

          const savedSign = comp.savedPercent >= 0 ? '+' : '';

          el.huffmanResults.innerHTML = `
            <div class="huffman-stat-grid">
              <div class="huffman-stat-box">
                <div class="huffman-stat-label">Distinct symbols</div>
                <div class="huffman-stat-val">${comp.subjectNames.length + 1}</div>
              </div>
              <div class="huffman-stat-box">
                <div class="huffman-stat-label">Fixed-length size</div>
                <div class="huffman-stat-val">${comp.fixedBitLength} bits</div>
              </div>
              <div class="huffman-stat-box">
                <div class="huffman-stat-label">Huffman size</div>
                <div class="huffman-stat-val">${comp.bitLength} bits</div>
              </div>
              <div class="huffman-stat-box">
                <div class="huffman-stat-label">Space saved</div>
                <div class="huffman-stat-val">
                  ${savedSign}${comp.savedPercent.toFixed(1)}%
                </div>
              </div>
              <div class="huffman-stat-box">
                <div class="huffman-stat-label">Packed file size</div>
                <div class="huffman-stat-val">${comp.bytes.length} bytes</div>
              </div>
            </div>
            <div class="${roundTripPass ? 'status-clean' : 'status-clash'}" style="margin-bottom: 10px; font-weight: 600; font-size: 13px;">
              ${roundTripPass ? 'Round-trip check: decoded data matches the original exactly.' : 'Round-trip check failed.'}
            </div>
            <div class="table-wrap" style="max-height: 200px; overflow-y: auto;">
              <table class="notice-table">
                <thead>
                  <tr>
                    <th>Subject</th>
                    <th>Students</th>
                    <th>Huffman code</th>
                    <th>Length</th>
                  </tr>
                </thead>
                <tbody id="huffman-codes-tbody"></tbody>
              </table>
            </div>
          `;

          const tbody = document.getElementById('huffman-codes-tbody');
          if (tbody) {
            tbody.textContent = '';
            comp.subjectNames.forEach((name, id) => {
              const tr = document.createElement('tr');
              const code = comp.codes[id] || '';
              const freq = comp.freqById[id] || 0;

              const tdName = document.createElement('td');
              const strong = document.createElement('strong');
              strong.textContent = name;
              tdName.appendChild(strong);

              const tdFreq = document.createElement('td');
              tdFreq.textContent = String(freq);

              const tdCode = document.createElement('td');
              const codeEl = document.createElement('code');
              codeEl.textContent = code;
              tdCode.appendChild(codeEl);

              const tdLen = document.createElement('td');
              tdLen.textContent = `${code.length} bits`;

              tr.appendChild(tdName);
              tr.appendChild(tdFreq);
              tr.appendChild(tdCode);
              tr.appendChild(tdLen);
              tbody.appendChild(tr);
            });
            const endId = comp.subjectNames.length;
            const endCode = comp.codes[endId] || '';
            const endFreq = comp.freqById[endId] || 0;
            const trEnd = document.createElement('tr');

            const tdEndName = document.createElement('td');
            const em = document.createElement('em');
            em.textContent = '[End-of-student marker]';
            tdEndName.appendChild(em);

            const tdEndFreq = document.createElement('td');
            tdEndFreq.textContent = String(endFreq);

            const tdEndCode = document.createElement('td');
            const codeEl = document.createElement('code');
            codeEl.textContent = endCode;
            tdEndCode.appendChild(codeEl);

            const tdEndLen = document.createElement('td');
            tdEndLen.textContent = `${endCode.length} bits`;

            trEnd.appendChild(tdEndName);
            trEnd.appendChild(tdEndFreq);
            trEnd.appendChild(tdEndCode);
            trEnd.appendChild(tdEndLen);
            tbody.appendChild(trEnd);
          }
        } catch (err) {
          showFriendlyMessage('error', 'Compression failed', 'Could not compress data.', 'Please try again.');
        }
      });
    }

    if (el.btnDownloadHuffman) {
      el.btnDownloadHuffman.addEventListener('click', () => {
        try {
          if (!currentHuffmanResult || (!window.HuffmanModule && !globalThis.HuffmanModule)) return;
          const HM = window.HuffmanModule || globalThis.HuffmanModule;
          const dlObj = HM.buildDownloadObject(currentHuffmanResult);
          const jsonStr = JSON.stringify(dlObj, null, 2);
          const blob = new Blob([jsonStr], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'enrollment-compressed.json';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        } catch (err) {
          showFriendlyMessage('error', 'Download failed', 'Could not export compressed file.', 'Please try again.');
        }
      });
    }

    // Initialize Accessible Tabs & Views
    initInputTabs();
    initAdvTabs();
    initViewSwitch();
  }

  // --------------------------------------------------------------------------
  // INITIALIZATION ON LOAD
  // --------------------------------------------------------------------------

  function init() {
    initEventListeners();
    setViewMode('simple');

    // Default start date: today
    el.startDateInput.value = getLocalDateString();

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
