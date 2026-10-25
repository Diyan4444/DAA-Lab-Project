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
   - Click **"⚡ Try with example data"** to test it instantly with a realistic 60-student college batch.
   - Or click **"Type it in"** and write your own students line by line.
   - Or click **"Upload a file"** to upload a `.csv` or `.txt` file from Excel or Google Sheets.

2. **Step 2: Choose your preferences.**
   - Pick the **First exam date**.
   - Pick how many **Exams per day** you want (usually 1 or 2).
   - Check or uncheck **Skip Saturdays and Sundays**.

3. **Step 3: Click "Make My Timetable".**
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
- **Upper Bound (Brooks' Theorem):** Any greedy coloring requires at most $\Delta(G) + 1$ slots, where $\Delta(G)$ is the maximum degree.

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
   - Selects the schedule with the fewest slots (tie-break: fewest same-day back-to-backs, then Welsh-Powell).
   - Guarantees an optimal or near-optimal timetable for any dataset.

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
2. It executes 14 test suites covering:
   - CSV parsing equivalence (Wide vs. Long)
   - Friendly format parsing equivalence (`Riya: Maths, Physics`)
   - Tiny graph topology & weights
   - Triangle graph ($K_3$) chromatic number
   - Empty edge graph coloring
   - Sample dataset verification (0 clashes across all algorithms)
   - 20 random seeded datasets stress test
   - Spread out exams soft constraint invariance
   - Room allocation capacity and double-booking invariants
   - Animation step sequence consistency
   - Beginner-friendly error handling cases a) through f)
   - Auto-best-method selection guarantee
   - Simple view jargon-free invariant (no technical terms in visible UI)
   - End-to-end user flow simulation

---

## 📄 File Structure

```text
exam-scheduler/
├── index.html        # Clean, accessible UI layout with Simple & Advanced views
├── style.css         # Modern dark styling, responsive layout, print formatting
├── sample-data.js    # Embedded 60-student engineering dataset & room templates
├── graph.js          # Pure logic: Multi-format parser & conflict graph builder
├── algorithms.js     # Pure logic: Handcrafted Sequential, Welsh-Powell, DSATUR
├── scheduler.js      # Pure logic: Timetable generator, soft optimizer, room allocator, verifier
├── ui.js             # Presentation logic: vis-network, animation, modes, friendly errors
├── tests.html        # In-browser test runner with 14 automated assertion suites
└── README.md         # Plain-English guide & comprehensive technical reference
```
