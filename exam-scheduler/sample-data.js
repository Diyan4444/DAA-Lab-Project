/**
 * Smart Exam Scheduler - Sample Dataset & Templates
 * 
 * Contains:
 * - Realistic engineering college dataset (12 subjects, 60 students, 4-5 subjects each)
 * - Supported in Wide CSV, Long CSV, and Friendly "Name: Subj, Subj" formats
 * - Sample examination rooms
 * - Blank downloadable template CSV
 */

(function (global) {
  'use strict';

  // Sample room capacities
  const SAMPLE_ROOMS_CSV = `room_name,capacity
Auditorium,150
Hall-A,90
Hall-B,80
LH-101,60
LH-102,60
Lab-101,40
Lab-102,40
Seminar-Hall,50`;

  // Wide format sample CSV: student_id,subjects (semicolon-separated)
  const SAMPLE_WIDE_CSV = `student_id,subjects
S001,"Data Structures;Algorithms;Database Management Systems;Theory of Computation;Software Engineering"
S002,"Data Structures;Algorithms;Database Management Systems;Theory of Computation;Software Engineering"
S003,"Data Structures;Algorithms;Mathematics-III;Physics;Artificial Intelligence"
S004,"Data Structures;Digital Logic Design;Computer Networks;Artificial Intelligence"
S005,"Operating Systems;Algorithms;Mathematics-III;Theory of Computation;Artificial Intelligence"
S006,"Data Structures;Digital Logic Design;Database Management Systems;Computer Networks;Software Engineering"
S007,"Operating Systems;Digital Logic Design;Database Management Systems;Theory of Computation;Artificial Intelligence"
S008,"Data Structures;Digital Logic Design;Mathematics-III;Artificial Intelligence"
S009,"Data Structures;Algorithms;Mathematics-III;Physics;Artificial Intelligence"
S010,"Operating Systems;Digital Logic Design;Mathematics-III;Computer Networks;Artificial Intelligence"
S011,"Operating Systems;Digital Logic Design;Database Management Systems;Computer Networks;Artificial Intelligence"
S012,"Data Structures;Mathematics-III;Theory of Computation;Software Engineering"
S013,"Data Structures;Engineering Graphics;Database Management Systems;Theory of Computation;Artificial Intelligence"
S014,"Operating Systems;Algorithms;Mathematics-III;Theory of Computation;Software Engineering"
S015,"Data Structures;Digital Logic Design;Database Management Systems;Theory of Computation;Software Engineering"
S016,"Data Structures;Digital Logic Design;Mathematics-III;Software Engineering"
S017,"Operating Systems;Algorithms;Database Management Systems;Computer Networks;Artificial Intelligence"
S018,"Data Structures;Engineering Graphics;Mathematics-III;Physics;Artificial Intelligence"
S019,"Data Structures;Digital Logic Design;Database Management Systems;Theory of Computation;Software Engineering"
S020,"Data Structures;Algorithms;Database Management Systems;Software Engineering"
S021,"Operating Systems;Algorithms;Database Management Systems;Theory of Computation;Artificial Intelligence"
S022,"Data Structures;Engineering Graphics;Mathematics-III;Physics;Artificial Intelligence"
S023,"Data Structures;Digital Logic Design;Mathematics-III;Computer Networks;Software Engineering"
S024,"Algorithms;Mathematics-III;Computer Networks;Artificial Intelligence"
S025,"Data Structures;Engineering Graphics;Database Management Systems;Computer Networks;Software Engineering"
S026,"Operating Systems;Algorithms;Database Management Systems;Physics;Software Engineering"
S027,"Operating Systems;Algorithms;Database Management Systems;Physics;Software Engineering"
S028,"Data Structures;Algorithms;Mathematics-III;Software Engineering"
S029,"Data Structures;Digital Logic Design;Database Management Systems;Theory of Computation;Software Engineering"
S030,"Operating Systems;Digital Logic Design;Database Management Systems;Theory of Computation;Artificial Intelligence"
S031,"Operating Systems;Digital Logic Design;Database Management Systems;Computer Networks;Artificial Intelligence"
S032,"Operating Systems;Database Management Systems;Physics;Software Engineering"
S033,"Operating Systems;Engineering Graphics;Database Management Systems;Theory of Computation;Artificial Intelligence"
S034,"Data Structures;Digital Logic Design;Mathematics-III;Theory of Computation;Software Engineering"
S035,"Data Structures;Engineering Graphics;Mathematics-III;Theory of Computation;Artificial Intelligence"
S036,"Data Structures;Engineering Graphics;Mathematics-III;Computer Networks;Artificial Intelligence"
S037,"Data Structures;Engineering Graphics;Database Management Systems;Theory of Computation;Software Engineering"
S038,"Data Structures;Algorithms;Database Management Systems;Physics;Artificial Intelligence"
S039,"Data Structures;Digital Logic Design;Mathematics-III;Physics;Software Engineering"
S040,"Operating Systems;Digital Logic Design;Mathematics-III;Computer Networks"
S041,"Operating Systems;Digital Logic Design;Mathematics-III;Theory of Computation;Software Engineering"
S042,"Operating Systems;Algorithms;Mathematics-III;Computer Networks;Artificial Intelligence"
S043,"Operating Systems;Digital Logic Design;Database Management Systems;Computer Networks;Artificial Intelligence"
S044,"Operating Systems;Digital Logic Design;Database Management Systems;Software Engineering"
S045,"Data Structures;Engineering Graphics;Mathematics-III;Theory of Computation;Software Engineering"
S046,"Operating Systems;Algorithms;Mathematics-III;Computer Networks;Software Engineering"
S047,"Operating Systems;Algorithms;Mathematics-III;Theory of Computation;Artificial Intelligence"
S048,"Operating Systems;Algorithms;Mathematics-III;Software Engineering"
S049,"Operating Systems;Digital Logic Design;Mathematics-III;Theory of Computation;Artificial Intelligence"
S050,"Operating Systems;Digital Logic Design;Database Management Systems;Theory of Computation;Software Engineering"
S051,"Operating Systems;Digital Logic Design;Mathematics-III;Physics;Artificial Intelligence"
S052,"Data Structures;Digital Logic Design;Mathematics-III;Software Engineering"
S053,"Operating Systems;Digital Logic Design;Mathematics-III;Physics;Artificial Intelligence"
S054,"Operating Systems;Digital Logic Design;Database Management Systems;Physics;Software Engineering"
S055,"Operating Systems;Algorithms;Mathematics-III;Physics;Software Engineering"
S056,"Data Structures;Digital Logic Design;Mathematics-III;Artificial Intelligence"
S057,"Operating Systems;Engineering Graphics;Mathematics-III;Theory of Computation;Software Engineering"
S058,"Operating Systems;Engineering Graphics;Mathematics-III;Computer Networks;Artificial Intelligence"
S059,"Data Structures;Engineering Graphics;Mathematics-III;Physics;Software Engineering"
S060,"Data Structures;Digital Logic Design;Database Management Systems;Theory of Computation;Software Engineering"`;

  // Long format sample CSV
  function convertWideToLong(wideCsv) {
    const lines = wideCsv.trim().split(/\r?\n/);
    const out = ['student_id,subject'];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const firstComma = line.indexOf(',');
      if (firstComma === -1) continue;
      const id = line.substring(0, firstComma).trim();
      let rest = line.substring(firstComma + 1).trim();
      if (rest.startsWith('"') && rest.endsWith('"')) {
        rest = rest.substring(1, rest.length - 1);
      }
      const subjects = rest.split(';').map(s => s.trim()).filter(Boolean);
      for (const subj of subjects) {
        out.push(`${id},${subj}`);
      }
    }
    return out.join('\n');
  }

  // Friendly format text: "Name: Subj1, Subj2, Subj3"
  function convertWideToFriendly(wideCsv) {
    const lines = wideCsv.trim().split(/\r?\n/);
    const out = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const firstComma = line.indexOf(',');
      if (firstComma === -1) continue;
      const id = line.substring(0, firstComma).trim();
      let rest = line.substring(firstComma + 1).trim();
      if (rest.startsWith('"') && rest.endsWith('"')) {
        rest = rest.substring(1, rest.length - 1);
      }
      const subjects = rest.split(';').map(s => s.trim()).filter(Boolean);
      out.push(`${id}: ${subjects.join(', ')}`);
    }
    return out.join('\n');
  }

  // Blank template for user download
  const BLANK_TEMPLATE_CSV = `student_id,subjects
Riya,"Maths;Physics;Chemistry"
Arjun,"Maths;Computer Science"
Ananya,"Physics;Chemistry"
Kiran,"Maths;English;Economics"
Sara,"Physics;Computer Science"`;

  const SAMPLE_LONG_CSV = convertWideToLong(SAMPLE_WIDE_CSV);
  const SAMPLE_FRIENDLY_TEXT = convertWideToFriendly(SAMPLE_WIDE_CSV);

  global.SAMPLE_WIDE_CSV = SAMPLE_WIDE_CSV;
  global.SAMPLE_LONG_CSV = SAMPLE_LONG_CSV;
  global.SAMPLE_FRIENDLY_TEXT = SAMPLE_FRIENDLY_TEXT;
  global.SAMPLE_ROOMS_CSV = SAMPLE_ROOMS_CSV;
  global.BLANK_TEMPLATE_CSV = BLANK_TEMPLATE_CSV;

})(typeof window !== 'undefined' ? window : globalThis);
