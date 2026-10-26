# Exam Timetable Maker (Smart Exam Scheduler)

> **Make an exam timetable where no student has two exams at the same time.**  
> A pure client-side web application designed to eliminate student examination conflicts, minimize same-day stress, and generate ready-to-print schedules.

---

## 🟢 For Non-Technical Users (Quick Start Guide)

### What is this?
Imagine a college where some students take both **Mathematics** and **Physics**. If both of those exams are scheduled at the same time on the same morning, those students have a clash and cannot write both exams.

**Exam Timetable Maker** solves this problem automatically. It analyzes which students take which subjects and creates a schedule where:
- **No student ever has two exams at the same time.**
- Exams are spread out as much as possible so students don't have exhausting back-to-back exams on the same day.
- Everything runs directly inside your web browser on your computer. **No data is sent over the internet, and no server or software installation is needed.**

---

### 3 Simple Steps to Create Your Timetable:

1. **Step 1: Add your students and their subjects.**
   - Click **"Try with example data"** to test it instantly with a realistic 60-student college batch.
   - Or click **"Type it in"** and write your own students line by line.
   - Or click **"Upload a file"** to upload a `.csv` or `.txt` file from Excel or Google Sheets.

2. **Step 2: Choose your preferences.**
   - Pick the **First exam date**.
   - Pick how many **Exams per day** you want (usually 1 or 2).
   - Check or uncheck **Skip Saturdays and Sundays**.

3. **Step 3: Click "Make my timetable".**
   - In less than a second, your complete timetable will appear.
   - Download it as a spreadsheet (`.csv`) or click **Print View** to print it directly or save as PDF.

---

### Example Input Format:

You can write students and subjects in plain English:
```text
Riya: Mathematics, Physics, Chemistry
Arjun: Mathematics, Computer Science
Ananya: Physics, Chemistry
Kiran: Mathematics, English, Economics
Sara: Physics, Computer Science
```
Or you can upload a CSV file with headers:
```csv
student_id,subjects
S001,"Mathematics;Physics;Chemistry"
S002,"Mathematics;Computer Science"
```

---

### What the Output Means:
- **Your Subjects Map:** Each subject is drawn as a bubble. Two bubbles are connected by a line if any student takes both subjects.
- **Colors = Exam Times:** Bubbles that share the same color can safely be held at the exact same time without any student clashing. Bubbles connected by a line get different colors.
- **Timetable Table & Calendar Cards:** Displays the exact Date, Day of the week, Time window, and scheduled subjects for each exam session.

---
---

## ⚙️ Technical Documentation (For DAA Evaluation & Project Viva)

This application was engineered for the Data Structures & Algorithms (DAA) assignment: **"Project on real-life application solving using Algorithms"**.

### Theoretical Mapping to Graph Coloring
- **Vertices (Nodes $V$):** Each subject offered represents a vertex in an undirected conflict graph $G = (V, E)$.
- **Edges (Conflicts $E$):** An undirected edge $(u, v)$ connects subjects $u$ and $v$ if and only if at least one student is enrolled in both.
- **Edge Weight ($w$):** The number of students enrolled in both courses.
- **Vertex Coloring:** A proper vertex coloring assigns non-negative integer colors (representing exam time slots) such that:
  $$\forall (u, v) \in E \implies \text{slot}(u) \neq \text{slot}(v)$$
  Because subjects sharing students are adjacent, they cannot receive the same slot. **Student clashes are mathematically zero.**
- **Upper Bounds & Brooks' Theorem:**
  - *Greedy Upper Bound:* Any greedy vertex coloring on an arbitrary graph with maximum degree $\Delta(G)$ uses at most $\Delta(G) + 1$ colors/slots.
  - *Brooks' Theorem (1941):* For every connected undirected graph $G$ that is neither a complete graph ($K_n$) nor an odd cycle ($C_{2k+1}$), the chromatic number satisfies $\chi(G) \le \Delta(G)$. Complete graphs and odd cycles are the only graphs where $\chi(G) = \Delta(G) + 1$.

---

### 🧠 The Three Handcrafted Algorithms

All algorithms are implemented by hand in [`algorithms.js`](algorithms.js) with deterministic tie-breaking (alphabetical by subject name):

1. **Sequential (Naive) Greedy:**
   - Colors vertices in input sequence order.
   - For each vertex, finds the smallest non-negative integer slot not used by any already-colored neighbor.
   - Baseline for comparison. Time complexity: $O(V + E)$.

2. **Welsh-Powell (Degree Descending, Class-by-Class):**
   - Computes degrees and sorts all vertices descending by degree (ties broken by weighted degree, then name).
   - In each round for slot $c$, colors the first uncolored vertex. Then scans the remaining list and colors any vertex that is **not adjacent to any vertex already given slot $c$ in this round**.
   - Time complexity: $O(V \log V + V^2) = O(V^2)$.

3. **DSATUR (Brelaz's Degree of Saturation):**
   - The saturation degree $\text{sat}(v)$ is the number of *distinct* colors currently assigned to $v$'s neighbors.
   - In each step, picks the uncolored vertex with the highest saturation degree (ties broken by degree in original graph, then name).
   - Colors the most constrained vertex with the lowest available color not used by its neighbors, then updates neighbor saturation sets.
   - Time complexity: $O(V^2 + E)$.

4. **Automatic Best-Method Selection (Simple View):**
   - Runs all three algorithms internally.
   - Selects the schedule with the fewest slots among evaluated candidates (tie-break: fewest same-day back-to-backs, then Welsh-Powell priority).
   - Because finding the minimum chromatic number $\chi(G)$ is NP-hard, this heuristic selection guarantees the best candidate among the implemented polynomial-time algorithms, without falsely claiming to compute a formally proven global minimum.

---

### 🧮 Comprehensive Algorithms Reference (All Handcrafted Implementations)

This project features **nine handcrafted algorithms**, with zero external library implementations:

| Algorithm | File Location | Purpose in Application | Time Complexity | Implementation Notes & Assumptions |
| :--- | :--- | :--- | :--- | :--- |
| **Counting Sort** | [`sorting.js`](sorting.js)<br>`SortingModule.countingSortBy` | Integer sorting for subject degrees, student counts, room capacities, and histogram distribution | $O(n + k)$ | Stable integer sorting using count array and prefix sums. Automatically falls back to stable comparison sort if keys are non-integers, negative, or range exceeds $10^6$. |
| **Huffman Encoding** | [`huffman.js`](huffman.js)<br>`HuffmanModule.compressEnrollments` | Compresses the enrollment student-subject records into a bitstream | $O(n \log n)$ | Uses custom binary `MinHeap` with deterministic tie-breaking. Packs bits into `Uint8Array`. Note: Space savings reflect the encoded stream; small code table metadata is stored alongside. |
| **0/1 Knapsack (Dynamic Programming)** | [`scheduler.js`](scheduler.js)<br>`SchedulerModule.knapsackSelect` | Selects optimal subset of subjects to keep in room-shortfall slots | $O(n \cdot W)$ | Bottom-up DP with deterministic backtracking. Guarded against $> 4 \times 10^6$ table cells. Combined with iterative `allocateRooms` reality check. |
| **Kruskal's Spanning Tree / Forest** | [`mst.js`](mst.js)<br>`MSTModule.kruskal` | Identifies strongest conflict links in network overlay | $O(E \log E)$ or $O(E + k)$ | Union-Find with path compression and union by rank. Generates spanning forest on disconnected graphs. |
| **Prim's Algorithm** | [`mst.js`](mst.js)<br>`MSTModule.prim` | Dense slot-conflict matrix spanning tree generation | $O(K^2)$ | Array-based dense symmetric matrix Prim. Used as heuristic preorder seed in 2-opt slot ordering. |
| **Levenshtein Distance & LCS** | [`textmatch.js`](textmatch.js)<br>`TextMatchModule.findSimilarSubjects` | Typo catcher detecting near-duplicate subject names (e.g., "Mathematcs" vs "Mathematics") | $O(m \cdot n)$ per pair | $O(V^2 \cdot m \cdot n)$ overall. Protects course level suffixes ("Maths-II" vs "Maths-III") and preserves words like "Linux". Never merges without user consent. |
| **Welsh-Powell Graph Coloring** | [`algorithms.js`](algorithms.js)<br>`AlgorithmsModule.welshPowell` | Core heuristic coloring: busiest subjects scheduled first | $O(V^2)$ | Radix-style stable counting sorts on degree and weighted degree after initial name sorting. Produces minimal slot assignments. |
| **DSATUR Graph Coloring** | [`algorithms.js`](algorithms.js)<br>`AlgorithmsModule.dsatur` | Saturation-degree heuristic: most constrained subjects scheduled first | $O(V^2 + E)$ | Dynamically updates neighbor color saturation sets after each coloring step. |
| **Sequential Greedy Coloring** | [`algorithms.js`](algorithms.js)<br>`AlgorithmsModule.sequentialGreedy` | Baseline graph coloring in natural input order | $O(V + E)$ | Scans neighbor colors for first available non-conflicting slot index. |

---

### ⚖️ Algorithm Assumptions & Honesty Notes

1. **MST-Preorder Heuristic:** A Minimum Spanning Tree traversal is an approximation heuristic to seed a path through exam slots; the subsequent 2-opt search iteratively improves same-day spacing.
2. **Knapsack Room Shortage Reality Check:** Knapsack on total capacity is optimistic because exam rooms cannot be shared across multiple subjects in the same slot. Our iterative post-processing with `allocateRooms` guarantees that the final kept subjects can actually be seated by physical rooms without any shortfall.
3. **Typo Catcher Discretion:** Levenshtein and LCS string matching detects phonetic and typing slips, but unusual naming styles or legitimate look-alikes may be flagged. To maintain strict data integrity, the system never alters student enrollment data without explicit user confirmation.

---

### ⏱️ Complexity Analysis Table

| Component | Operation | Time Complexity | Assumptions |
| :--- | :--- | :--- | :--- |
| **Parsing** | Tokenization & normalization | $O(S \cdot C)$ | $S$ students, $C$ subjects per student ($C \le 6$) |
| **Graph Construction** | Edge generation from pairs | $O(S \cdot C^2) = O(S + V)$ | $C$ is a small constant, edge lookups are $O(1)$ |
| **Sequential Greedy** | Greedy neighbor scanning | $O(V + E)$ | Sum of degrees is $2E$ |
| **Welsh-Powell** | Degree sort + class scan | $O(V \log V + V^2)$ | Pairwise non-adjacency checks in class rounds |
| **DSATUR** | Saturation degree search | $O(V^2 + E)$ | $V$ rounds, degree scans for lowest available color |
| **Spread Out Exams** | 2-opt / permutation search | $O(V + E + K! \cdot K)$ (small $K$) | Precomputed conflict matrix $W[A][B]$ |
| **Room Allocation** | Best-Fit-Decreasing | $O(V \log V + V \cdot R)$ | $R$ available examination rooms |
| **Clash Verifier** | Student enrollment audit | $O(S \cdot C)$ | Independent first-principles audit |

---

### 🏛️ Room Allocation Strategy (Best-Fit-Decreasing)

1. For each slot, subjects are processed in descending order of enrolled students.
2. **Single-Room Best Fit:** Searches for the smallest free room whose capacity can seat the entire subject ($\text{capacity} \ge \text{students}$), minimizing wasted seats. Once booked, that room is locked for that slot.
3. **Multi-Room Splitting:** If no single room is large enough, the subject is split across the largest available unbooked rooms until all students are seated.
4. **Zero Double-Booking:** A room is assigned to at most one subject in any given slot.
5. **Fresh Rooms Each Slot:** All rooms reset to available at the start of each new time slot.
6. **Shortfall Warnings:** If total free room capacity in a slot cannot seat all students, the engine emits an alert specifying the slot number, subject, and shortfall count without failing silently.

---

### ⚠️ Theoretical Limitations
- **NP-Hardness:** Finding the exact minimum chromatic number $\chi(G)$ of a general graph is NP-hard. The implemented algorithms are polynomial-time approximation heuristics that guarantee a valid, 100% clash-free coloring bounded by $\chi(G) \le \Delta(G) + 1$, but may not reach the theoretical optimum on pathological graphs.
- **Human Soft Constraints:** The tool optimizes same-day consecutive exams (back-to-backs). It does not model teacher/invigilator availability or individual student commute preferences.

---

### 🔮 Future Scope
1. **Invigilator / Faculty Allocation:** Dual-layer bipartite matching to assign proctors to examination halls fairly.
2. **Multi-Campus Logistics:** Adding travel buffer constraints for colleges with geographically separated campuses.
3. **Student Fatigue Spacing:** Formulating a quadratic penalty function to spread exams over 10–14 days for optimal student revision.
4. **Lightweight SAT/MILP Solver:** Integrating a small WebAssembly SAT solver for exact global chromatic numbers on small graphs ($\le 30$ vertices).

---

## 🧪 Automated Test Harness (`tests.html`)

To run the automated verification suite:
1. Double-click `tests.html` in your browser.
2. It executes 23 test suites covering:
   - 1. CSV parsing equivalence (Wide vs. Long)
   - 2. Known tiny graph topology & weights
   - 3. Triangle graph ($K_3$) chromatic number
   - 4. Empty edge graph coloring
   - 5. Sample dataset verification (0 clashes across all algorithms)
   - 6. 20 random seeded datasets stress test
   - 7. Spread out exams soft constraint invariance
   - 8. Room allocation capacity and double-booking invariants
   - 9. Animation step sequence consistency
   - 10. Friendly format parsing equivalence (`Riya: Maths, Physics`)
   - 11. Beginner-friendly error handling cases a) through f)
   - 12. Auto-best-method selection guarantee
   - 13. Simple view jargon-free invariant (no technical terms in visible UI)
   - 14. End-to-end user flow simulation
   - 15. Counting Sort verification (stability, ascending/descending, radix equivalence, fallback)
   - 16. Huffman Encoding verification (224-bit hand example, prefix-free, pack/unpack, round-trip on 20 random datasets)
   - 17. 0/1 Knapsack & Room Shortage verification (DP table, oversize guard, reality check with allocateRooms, clash-free overflow)
   - 18. Spanning Trees verification (Kruskal & Prim weight equivalence, forest components, preorder permutation, reproducible 2-opt)
   - 19. DP String Matching verification (Levenshtein, LCS, level protection, typo detection flags, merge remapping)
   - 20. XSS & Safe String Rendering Invariant (untrusted strings in preview, timetable, and messages render strictly as text)
   - 21. CSV Formula Injection Sanitization (guards against `=`, `+`, `-`, `@`, `\t`, `\r` DDE spreadsheet attacks)
   - 22. Independent Verifier Negative Test (intentional clashes and unassigned subjects are caught and flagged)
   - 23. Calendar Date Arithmetic & Boundary Edge Cases (weekend skipping, month rollover, leap years, and safe fallback)

---

## 📄 File Structure

```text
exam-scheduler/
├── index.html        # Semantic HTML notice board layout with Simple & Advanced views
├── style.css         # "Exam Notice Board" drafting-paper design with stamped verification
├── sample-data.js    # Embedded 60-student engineering dataset & room templates
├── sorting.js        # Pure logic: Handcrafted Counting Sort & histogram builder
├── graph.js          # Pure logic: Multi-format parser & conflict graph builder
├── mst.js            # Pure logic: Handcrafted Kruskal, Prim, and tree preorder traversal
├── algorithms.js     # Pure logic: Handcrafted Sequential, Welsh-Powell, DSATUR
├── textmatch.js      # Pure logic: Handcrafted Levenshtein & LCS dynamic programming typo catcher
├── huffman.js        # Pure logic: Handcrafted Min-Heap, Huffman tree, bit packing, compression
├── scheduler.js      # Pure logic: Timetable generator, soft optimizer, 0/1 Knapsack room planner
├── ui.js             # Presentation logic: vis-network, animation, modes, friendly errors
├── tests.html        # In-browser test runner with 23 automated assertion suites
├── screenshots/      # High-fidelity visual captures across 1366px, 1024px, 768px, and 390px
└── README.md         # Plain-English guide & comprehensive technical reference
```

---

## 🖼️ User Interface & Visual Showcase

The redesigned user interface follows an **"Exam Notice Board"** physical aesthetic:
- **Paper & Ink Foundation:** Drafting-sheet grey-green (`#E8EBE4`) background, soft natural sheets (`#FBFBF7`), deep ink (`#1E2824`) typography, and subtle ruled separators (`#B9C0B5`).
- **Typography:** Google Fonts *Zilla Slab* (editorial serif headers) paired with *Atkinson Hyperlegible* (high-clarity sans-serif for numbers, tables, and buttons).
- **Physical Verification Stamp:** When a clash-free timetable is generated, a red stamped badge ("Checked: Zero clashes") lands with a quick, deliberate single stamp animation.
- **Subjects Map:** Color-coded conflict bubbles with live step-by-step coloring replay and Minimum Spanning Tree (MST) conflict backbone highlight.
- **Complete Responsive Support:** Tested and verified from ultra-wide displays down to 360px mobile viewports with zero horizontal overflow.
- **Clean Print Styling:** Uses native `@media print` rules to hide interactive controls and print a clean, high-contrast, date-grouped paper notice.
