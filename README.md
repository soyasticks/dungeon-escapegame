# AI Dungeon Escape

A dark-fantasy pixel-art maze game for an Artificial Intelligence course project.
Escape three dungeon levels by collecting keys and reaching the exit gate, while monsters
hunt you using **five search algorithms implemented from scratch**: BFS, DFS, Uniform Cost
Search, Greedy Best-First Search and A\*. An **Algorithm Lab** runs all five on the same
maze, animates their exploration, and compares their real measured performance.

Plain HTML, CSS, vanilla JavaScript and Canvas. No frameworks, no backend, no external APIs,
no paid dependencies. The two pixel fonts are bundled locally (SIL Open Font License), so it
works fully offline.

**▶ Play it online:** https://YOUR-SITE-NAME.netlify.app  <!-- replace with your Netlify link -->

**Made by:** Name (Roll No) · Name (Roll No)  <!-- fill in -->
Course: Artificial Intelligence, SVKM's NMIMS MPSTME, AY 2026-27

### Key finding
Across about 1,300 generated mazes, **A\* always found the same optimal cost as UCS**, but how much
work it saved depended heavily on the maze layout: only **8% fewer nodes** in a maze with no loops
(long corridors fool the Manhattan heuristic), versus **82% fewer** in a very open maze. See
[section 8](#8-experiment-results).

---

## 1. How to run

### With VS Code Live Server (recommended)
1. Open the `ai-dungeon-escape` folder in VS Code.
2. Install the **Live Server** extension (by Ritwick Dey) if you don't have it.
3. Right-click `index.html` → **Open with Live Server**.
4. The game opens in your browser (usually at `http://127.0.0.1:5500/index.html`).

### Other ways
- Double-click `index.html`. The project uses plain `<script>` tags, not ES modules, so it also
  works from `file://`.
- Or run any static server in the folder, e.g. `python -m http.server 8000`, then visit
  `http://localhost:8000`.

### Hosting it online (GitHub + Netlify)
The project is a static site, so there is nothing to build.
1. Push this folder to a GitHub repository, with `index.html` at the top level of the repo.
2. On [Netlify](https://www.netlify.com/), choose **Add new site → Import an existing project → GitHub** and pick the repo.
3. Leave **Build command** and **Publish directory** empty, then click **Deploy**.
4. Every later `git push` redeploys the site automatically.

Without Git, you can also drag the folder onto [app.netlify.com/drop](https://app.netlify.com/drop).

### Running the automated tests (optional, needs Node.js)
```bash
node tests/algorithms.test.js   # algorithm correctness vs reference implementations
node tests/game.test.js         # headless game simulation and Lab metrics
node tests/experiment.js        # batch experiment over ~1,300 mazes (used in the report)
```

---

## 2. How to play

| Key | Action |
|---|---|
| `W A S D` / Arrow keys | Move |
| `P` / `Esc` | Pause / resume |
| `R` | Restart the current level (same maze) |
| `V` | Show / hide the enemies' planned paths |
| `M` | Sound on / off (also a button in the sidebar, pause menu and main menu) |
| `Enter` | Continue on the level-complete / game-over / victory screens |

On touch screens or narrow windows an on-screen D-pad appears under the maze.

- Collect **all keys** to unlock the **gate**, then step on it to clear the level.
- **Gems** +50, **chest** +150, **key** +100, **potion** restores one heart.
- **Spike traps** cycle up and down; they blink red just before rising. Standing on raised spikes costs a heart.
- **Mud** (cost 3) and **deep water** (cost 5) slow everyone down, the player included.
- Touching an enemy costs a heart. You have 5 hearts and briefly flash (invulnerable) after a hit.
- Clearing a level awards a level bonus, a time bonus and a bonus per remaining heart.
  The best score is stored in the browser.

| Level | Maze | Keys | Traps | Enemies (algorithm) |
|---|---|---|---|---|
| 1 · The Forgotten Cellar | 15×21 | 2 | 4 | BFS, DFS |
| 2 · Halls of the Lich | 19×27 | 3 | 8 | BFS, UCS, Greedy |
| 3 · The Abyssal Gate | 23×33 | 4 | 12 | A\* (exit guard), A\*, UCS, Greedy, DFS |

### Sound
All sound effects are **generated in code** with the browser's Web Audio API (square, triangle,
sine and sawtooth waves plus filtered noise). There are no audio files, so it still works offline.
Sounds play for footsteps (different on stone, mud and water), every pickup, getting hurt (an extra
metallic "shing" for spike traps), an enemy spotting you, the gate opening, a locked gate, pause and
resume, level clear, game over, victory, and the Algorithm Lab finishing. Browsers only allow audio
after you click or press a key, so sound starts after your first interaction. The mute setting is remembered.

---

## 3. Project structure

```
ai-dungeon-escape/
├── index.html                 All screens (menu, how-to, game, lab) + script order
├── css/style.css              Dark-fantasy pixel theme, responsive layout
├── assets/fonts/              Press Start 2P + VT323 (local, OFL licensed)
├── js/
│   ├── core/
│   │   ├── constants.js       Tile types, terrain costs, direction order
│   │   ├── rng.js             Seeded RNG (Mulberry32) — reproducible mazes
│   │   ├── priorityQueue.js   Binary min-heap (from scratch)
│   │   └── grid.js            Grid, walkability, neighbours, Manhattan distance
│   ├── algorithms/
│   │   ├── common.js          Shared result format, path reconstruction, path cost
│   │   ├── bfs.js             Breadth-First Search
│   │   ├── dfs.js             Depth-First Search
│   │   ├── ucs.js             Uniform Cost Search
│   │   ├── greedy.js          Greedy Best-First Search
│   │   ├── astar.js           A* Search
│   │   └── registry.js        Names, colours, metadata, runSearch()
│   ├── maze/mazeGenerator.js  Random solvable maze generation + verification
│   ├── game/
│   │   ├── levels.js          The three level configurations + scoring rules
│   │   ├── entities.js        Player and Enemy (enemy AI decision-making)
│   │   └── game.js            Game state machine, pickups, traps, collisions
│   ├── render/
│   │   ├── sprites.js         Pixel-art sprites as text grids
│   │   ├── tileArt.js         Procedural wall / floor / mud / water art
│   │   ├── gameRenderer.js    Draws the game each frame
│   │   └── labRenderer.js     Draws one Algorithm Lab panel
│   ├── lab/labRunner.js       Benchmarks all algorithms on one maze (real metrics)
│   ├── audio/soundFx.js       Retro sound effects synthesised with Web Audio
│   ├── ui/
│   │   ├── input.js           Keyboard + touch D-pad
│   │   ├── screens.js         Screen switching, pixel hearts
│   │   ├── gameScreen.js      HUD, enemy panel, overlays
│   │   └── labScreen.js       Algorithm Lab controls, table, insights, CSV
│   └── main.js                Wiring, buttons, shortcuts, frame loop
└── tests/
    ├── algorithms.test.js     Algorithm correctness vs reference implementations
    ├── game.test.js           Headless game simulation
    └── experiment.js          Batch experiment used in the report
```

Game logic (`game/`), algorithms (`algorithms/`), rendering (`render/`) and UI (`ui/`) are
separate. The algorithm and game-logic files never touch the DOM, which is why they can be
tested in Node.

---

## 4. The maze model

- The maze is a grid. Each cell is **floor (cost 1)**, **mud (cost 3)**, **water (cost 5)** or **wall** (impassable).
- Movement is **4-directional**: up, right, down, left. Every algorithm generates neighbours in that same fixed order, so results are reproducible.
- **Step cost** = the cost of the cell you *enter*. Path cost = the sum over the path, excluding the start cell.
- **Heuristic**: Manhattan distance, `h(n) = |row(n) − row(goal)| + |col(n) − col(goal)|`.
- Cells are stored as one integer index `row × cols + col`, so the algorithms can use fast typed arrays.

### Random but solvable mazes (`mazeGenerator.js`)
1. **Recursive backtracker** (randomized DFS) carves a *perfect maze*, which is a spanning tree, so every open cell is connected to every other one.
2. **Braiding** removes a fraction of interior walls to create loops. Removing walls can only add connections, so the maze stays solvable, and loops make the algorithms find visibly different paths.
3. **Terrain patches** (mud, water) are painted on floor cells. They are walkable, so connectivity is unchanged.
4. A **flood fill verifies** that every open cell is reachable from the start. If it ever failed, the generator would try the next seed instead of returning a broken maze.

Mazes are generated from a **seed**, so the same seed always produces the same maze. The seed is
shown in the game sidebar and in the Lab.

---

## 5. The five algorithms (viva notes)

All five share the same conventions:

- They return the same result shape: `path`, `explored` (cells in expansion order), `nodesExpanded`, `pathLength`, `totalCost`, `maxFrontier`.
- The **goal test happens on expansion** (when a node is removed from the frontier), so "nodes expanded" is comparable across algorithms.
- They keep a visited / closed set (graph search), so no cell is expanded twice.
- The path is rebuilt by following **parent pointers** back from the goal.

### BFS — Breadth-First Search (`bfs.js`)
- **Frontier:** FIFO queue. A cell is marked visited when it is first enqueued.
- **Idea:** explore in rings of equal step-distance from the start.
- **Complete:** yes. **Optimal:** yes for **number of steps** (unweighted). It ignores terrain cost, so on weighted terrain its path can be expensive.
- **Time / space:** O(V + E). On a grid E ≤ 4V, so O(V).
- **In the game:** the "Seeker Wisp". It takes the shortest route in *steps*, even straight through mud and water.

### DFS — Depth-First Search (`dfs.js`)
- **Frontier:** LIFO stack (iterative, so big mazes can't overflow the call stack). A cell is marked visited when popped. Each stack entry remembers who pushed it, so the parent pointer follows the branch DFS actually explored.
- **Idea:** dive down one branch until a dead end, then backtrack.
- **Complete:** yes on a finite grid with a visited set. **Optimal:** no. Paths are often long and winding.
- **Time:** O(V + E). **Space:** O(V) worst case.
- **In the game:** the "Wandering Shade". Its long, erratic routes make it a poor tracker, which illustrates non-optimality in practice. It is given a larger tracking range because its routes are long.

### UCS — Uniform Cost Search (`ucs.js`)
- **Frontier:** priority queue (binary min-heap) ordered by **g(n)**, the cheapest known cost from the start.
- **Idea:** always expand the cheapest frontier node. When the goal is expanded, its cost is minimal.
- Uses **lazy deletion**: a cheaper route to a cell pushes a new heap entry, and stale entries are skipped when popped.
- **Complete:** yes (all step costs ≥ 1). **Optimal:** yes, **minimum total cost**.
- **Time:** O(E log V) with a binary heap.
- **In the game:** the "Bog Crawler". It goes around mud and water when that is cheaper.

### Greedy Best-First Search (`greedy.js`)
- **Frontier:** priority queue ordered by **h(n)** only (Manhattan distance to the goal).
- **Idea:** always expand whatever *looks* closest to the goal, ignoring the cost already paid.
- **Complete:** yes on a finite grid with a visited set. **Optimal:** no. Walls and terrain mislead it.
- Usually expands the **fewest nodes**, but its path can be long or expensive.
- **In the game:** the "Hungry Imp". Fast to decide, sometimes takes silly routes.

### A\* Search (`astar.js`)
- **Frontier:** priority queue ordered by **f(n) = g(n) + h(n)**. Ties are broken by smaller h, then insertion order.
- **Idea:** UCS guided toward the goal by the heuristic.
- **Why Manhattan distance keeps A\* optimal here:**
  - *Admissible:* every move costs at least 1 and changes the Manhattan distance by exactly 1, so h never over-estimates the true remaining cost.
  - *Consistent (monotone):* h(n) ≤ cost(n → n′) + h(n′) for every move, because cost ≥ 1 and h changes by at most 1.
  - With a consistent heuristic, a node's g is final when it is expanded, so using a closed set is safe and the first expansion of the goal is a cheapest path.
- **Complete:** yes. **Optimal:** yes, minimum total cost, the same as UCS.
- Expands **no more nodes than UCS** (verified by the tests on hundreds of mazes). In mazes the saving is often modest, because corridors force detours the straight-line heuristic cannot see. That is a good viva discussion point.
- **In the game:** the "Lich Hunter" on level 3, one of which guards the exit.

### Quick comparison

| | Frontier | Priority | Complete | Optimal |
|---|---|---|---|---|
| BFS | Queue | — | Yes | Fewest steps (unweighted) |
| DFS | Stack | — | Yes (finite) | No |
| UCS | Min-heap | g(n) | Yes | Minimum cost |
| Greedy | Min-heap | h(n) | Yes (finite) | No |
| A\* | Min-heap | g(n) + h(n) | Yes | Minimum cost |

**Real example** (21×31 maze, seed 123, 15% loops, weighted terrain, from `tests/game.test.js`):

| | Nodes expanded | Path length (steps) | Total cost |
|---|---|---|---|
| BFS | 302 | 54 | 106 |
| DFS | 301 | 90 | 134 |
| UCS | 327 | 54 | **98** |
| Greedy | **77** | 64 | 122 |
| A\* | 325 | 54 | **98** |

UCS and A\* find the optimal cost (98). BFS finds the fewest steps (54) but pays 106 because it
walks through heavy terrain. Greedy expands by far the fewest nodes but its path costs 24% more.

---

## 6. How the enemies use the algorithms (`entities.js`)

Each enemy is assigned one algorithm (its label above its head and its colour show which):

1. **Patrol.** It picks a destination (a random tile, or a tile near the exit for the guard) and plans a route with its algorithm.
2. **Notice.** When the player is within its detection radius (Manhattan distance), it runs its algorithm to the player. It commits to the hunt only if that route is at most `track` steps long. The decision uses the algorithm's *real path length*, not straight-line distance, so enemies don't flip-flop when a wall forces a detour.
3. **Hunt.** It re-plans every fraction of a second toward the player's current tile, and gives up if the route grows too long (the player escaped).
4. **Movement** is tile-by-tile along the planned path. A step is only ever taken onto a walkable neighbour, and heavy terrain slows enemies just like the player.
5. **Traffic.** The algorithms only know walls and terrain. If another enemy blocks the next tile, the enemy waits, then plans a **detour with its own algorithm** on a copy of the maze where the blocked tile is a wall.

Press `V` to see every enemy's planned path. The sidebar shows each enemy's **most recent real
search**: nodes expanded, path length, cost and time.

---

## 7. Algorithm Lab

Open it from the main menu (or from the victory screen).

- All five algorithms run on **the same maze, start and goal**.
- Controls: maze size, extra loops, weighted terrain on/off, seed (type one and press *Load Seed* to reproduce a maze), and a **click tool** to move S/G, toggle walls or paint terrain (click or drag on any panel).
- **Run All** animates the cells each algorithm expanded, *in the order it expanded them*, then draws the final path. Every panel animates at the same rate, so algorithms that expand fewer nodes finish first. **Skip Animation** shows the results immediately.
- The **comparison table** lists: path found, time per run, number of timed runs, nodes expanded, path length, total cost, peak frontier size, and whether the cost is optimal. The best value in each column is highlighted.
- The **observations** under the table are generated from the measured numbers.
- **Export CSV** downloads the table for your report. If the page is embedded in another site (where downloads are blocked), the button becomes **Copy CSV** and copies the table to the clipboard instead.

### How the metrics are measured (nothing is faked)
- **Nodes expanded, path length, total cost, peak frontier** come straight from the algorithm's run. The browser test checks the table against fresh independent runs.
- **Time** is real wall-clock time from `performance.now()`. One search on a small maze takes microseconds, and browsers deliberately limit timer precision, so each algorithm gets 2 untimed warm-up runs (for JIT compilation) and is then run repeatedly for at least 25 ms. The table shows the **mean time per run** and **how many runs** were timed. Times vary between machines and runs; the node counts do not.
- **Cost-optimal?** compares each path's cost with UCS's cost, since UCS is provably optimal.
- If the goal is walled off, every algorithm reports **No path**.

---

## 8. Experiment results

`node tests/experiment.js` runs all five algorithms on 100 seeded mazes per setting (start top-left,
goal bottom-right, weighted terrain on). Node counts, path lengths and costs are exactly
reproducible; times depend on the machine.

**Average over 100 mazes of 29×41 (15% extra loops):**

| Algorithm | Nodes expanded | Steps | Cost | Cost-optimal | Extra cost |
|---|---|---|---|---|---|
| BFS | 590.1 | 74.6 | 109.4 | 13% | 14.9% |
| DFS | 184.6 | 142.4 | 210.1 | 0% | 124.6% |
| UCS | 573.2 | 78.4 | 95.4 | 100% | 0.0% |
| Greedy | 110.6 | 89.2 | 129.9 | 5% | 38.0% |
| A\* | 359.1 | 78.8 | 95.4 | 100% | 0.0% |

**Effect of maze openness (29×41, 100 mazes per row):**

| Extra loops | UCS nodes | A\* nodes | A\* saving | Greedy extra cost |
|---|---|---|---|---|
| 0% (perfect maze) | 352.7 | 323.9 | 8.2% | 0.0% |
| 20% | 604.9 | 368.4 | 39.1% | 37.0% |
| 40% | 699.9 | 262.5 | 62.5% | 41.8% |
| 100% (almost open) | 934.3 | 170.6 | 81.7% | 40.5% |

In a perfect maze there is only one route between two cells, so every algorithm finds the same
path, and the wall-blind Manhattan heuristic barely helps A\*. As walls are removed, the real
distance gets closer to the Manhattan distance, so A\* heads almost straight for the goal, while
Greedy starts picking routes that only *look* short. With terrain switched off, BFS is cost-optimal
in 100% of mazes; with mud and water switched on, in only 13%.

---

## 9. Testing

These tests were run during development and all pass:

- **`tests/algorithms.test.js`** (≈13,000 checks): on 120 random mazes of several sizes, plus random start/goal pairs:
  - every returned path starts and ends correctly, moves one orthogonal step at a time, never enters a wall and never repeats a cell;
  - **BFS** path length equals the true minimum step count;
  - **UCS** and **A\*** costs equal the true minimum cost from an independent, brute-force Bellman-Ford implementation;
  - A\* never expands more nodes than UCS; DFS and Greedy are never better than optimal;
  - a hand-made maze with known answers; unreachable goals reported as "no path";
  - the generator always produces odd sizes, a solid border, full connectivity, and identical mazes for identical seeds.
- **`tests/game.test.js`**: level setup invariants on 30 random games (key counts, reachability, no overlapping objects, enemies spawn away from the player); a bot that plays through all 3 levels while every frame checks that **no entity is ever on a wall** and every move is to an adjacent tile; damage, game over, restart, pause, locked exit; and Lab metrics being real and reproducible.
- A sound test rendered every effect offline to confirm it is audible, does not clip and ends cleanly; checked that each game event triggers its sound; and checked that muting works from every button and the `M` key and is remembered after a reload.
- An end-to-end browser test (headless Chromium) clicked every button, played with the keyboard and touch D-pad, ran the Lab, checked the table against fresh runs, and exported the CSV, with no console errors.

---

## 10. Possible viva questions

- **Why is A\* optimal with Manhattan distance here?** Because it is admissible and consistent on a 4-directional grid where every step costs ≥ 1 (see section 5).
- **Why does BFS give a cheaper-looking but more expensive path?** BFS minimises the *number of steps*; it ignores cell costs. UCS and A\* minimise the *sum of costs*.
- **Why does Greedy expand so few nodes yet return worse paths?** It only uses h(n), never g(n), so it rushes toward the goal and can't tell an expensive route from a cheap one.
- **Why might A\* only slightly beat UCS in a maze?** The heuristic ignores walls; in a maze the real path often has to move *away* from the goal, so many nodes still look promising to A\*. The experiment in section 8 measures this: 8% saving with no loops, 82% in an open maze.
- **What happens with an inadmissible heuristic?** A\* could return a suboptimal path. Manhattan distance is never larger than the true remaining cost here, so that can't happen.
- **How do you guarantee the maze is solvable?** The perfect-maze generator connects every cell; braiding and terrain never disconnect anything; a flood fill verifies it anyway.
- **Why goal-test on expansion instead of generation?** For UCS and A\* it is required for optimality, and applying the same rule to all five makes "nodes expanded" a fair comparison.

---

## 11. Credits

- Fonts: *Press Start 2P* (CodeMan38) and *VT323* (Peter Hull), SIL Open Font License 1.1. Licences are in `assets/fonts/`.
- All code, algorithms, sprites and tile art were written from scratch for this project.
