/**
 * CROSS Universal Strict Solver
 * 
 * Solves any valid 10×10 CROSS puzzle using the strict constraint method:
 *   1. Find a valid cross position (row r, col c) for the final click
 *   2. Before the last click: only 19 gray cells remain on the cross, all others empty
 *   3. Click the cross intersection to clear all 19 gray cells at once
 *
 * Ported from Python solver_v2. No external dependencies.
 */
const CROSSSolver = (function () {
  'use strict';

  const N = 10;

  /* ── Simulation ── */
  function simulateClick(grid, r, c) {
    const g = grid.map(row => [...row]);
    for (let j = 0; j < N; j++)
      if (g[r][j] >= 0) g[r][j]--;
    for (let i = 0; i < N; i++)
      if (i !== r && g[i][c] >= 0) g[i][c]--;
    return g;
  }

  /* ── Verification ── */
  function verify(grid, result) {
    const { lastClick: { r, c }, clicks } = result;
    let g = grid.map(row => [...row]);
    for (const { r: cr, c: cc } of clicks) g = simulateClick(g, cr, cc);

    let grayCount = 0;
    for (let j = 0; j < N; j++) {
      if (g[r][j] !== 0) return false;
      grayCount++;
    }
    for (let i = 0; i < N; i++) {
      if (i !== r) {
        if (g[i][c] !== 0) return false;
        grayCount++;
      }
    }
    for (let i = 0; i < N; i++)
      for (let j = 0; j < N; j++)
        if (i !== r && j !== c && g[i][j] >= 0) return false;

    if (grayCount !== 19) return false;

    // Last click clears everything
    const afterLast = simulateClick(g, r, c);
    for (let i = 0; i < N; i++)
      for (let j = 0; j < N; j++)
        if (afterLast[i][j] >= 0) return false;

    return true;
  }

  /* ── Core Solver ── */
  function solveStrict(grid) {
    const results = [];

    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        if (grid[r][c] < 0) continue;

        // Check no empty cells in the union of row r and column c
        let hasEmpty = false;
        for (let j = 0; j < N; j++) if (grid[r][j] === -1) { hasEmpty = true; break; }
        if (!hasEmpty)
          for (let i = 0; i < N; i++) if (i !== r && grid[i][c] === -1) { hasEmpty = true; break; }
        if (hasEmpty) continue;

        // Compute S_row and S_col
        let S_row = 0, S_col = 0;
        for (let j = 0; j < N; j++) S_row += grid[r][j];
        for (let i = 0; i < N; i++) S_col += grid[i][c];

        const diff = S_row - S_col;
        if (diff % 9 !== 0) continue;

        const delta = diff / 9; // R[r] - C[c]
        const Rr_min = Math.max(0, delta);
        const Rr_max = grid[r][c] + delta;

        if (Rr_max < Rr_min) continue;

        for (let Rr = Rr_min; Rr <= Rr_max; Rr++) {
          const Cc = Rr - delta;
          if (Cc < 0) continue;

          const targetSumR = S_col - 9 * Cc - Rr;
          const targetSumC = S_row - 9 * Rr - Cc;
          if (targetSumR < 0 || targetSumC < 0) continue;

          const res = tryRC(grid, r, c, Rr, Cc, targetSumR, targetSumC);
          if (res) results.push(res);
        }
      }
    }

    // Deduplicate and sort by total clicks
    const seen = new Set();
    const unique = [];
    for (const res of results) {
      const key = `${res.lastClick.r},${res.lastClick.c}|${res.R}|${res.C}`;
      if (!seen.has(key)) { seen.add(key); unique.push(res); }
    }
    unique.sort((a, b) => a.totalClicks - b.totalClicks);

    // Return best verified solution
    for (const res of unique) {
      if (verify(grid, res)) return res;
    }
    return null;
  }

  function tryRC(grid, r, c, Rr, Cc, targetSumR, targetSumC) {
    // Initial lower bounds
    const R_min = new Array(N).fill(0);
    const C_min = new Array(N).fill(0);
    R_min[r] = Rr;
    C_min[c] = Cc;

    for (let i = 0; i < N; i++) if (i !== r) R_min[i] = Math.max(0, grid[i][c] - Cc);
    for (let j = 0; j < N; j++) if (j !== c) C_min[j] = Math.max(0, grid[r][j] - Rr);

    // Iterative tightening
    let feasible = true;
    for (let iter = 0; iter < 200; iter++) {
      let changed = false;
      for (let i = 0; i < N; i++) {
        if (i === r) continue;
        for (let j = 0; j < N; j++) {
          if (j === c) continue;
          if (grid[i][j] >= 0) {
            const need = grid[i][j] + 1 - R_min[i] - C_min[j];
            if (need > 0) { R_min[i] += need; changed = true; }
          }
        }
      }
      const sR = R_min.reduce((s, v, i) => i !== r ? s + v : s, 0);
      const sC = C_min.reduce((s, v, j) => j !== c ? s + v : s, 0);
      if (sR > targetSumR || sC > targetSumC) { feasible = false; break; }
      if (!changed) break;
    }
    if (!feasible) return null;

    const curSumR = R_min.reduce((s, v, i) => i !== r ? s + v : s, 0);
    const curSumC = C_min.reduce((s, v, j) => j !== c ? s + v : s, 0);
    if (curSumR > targetSumR || curSumC > targetSumC) return null;

    const remR = targetSumR - curSumR;
    const remC = targetSumC - curSumC;
    if (remR < 0 || remC < 0) return null;

    const otherRows = []; for (let i = 0; i < N; i++) if (i !== r) otherRows.push(i);
    const otherCols = []; for (let j = 0; j < N; j++) if (j !== c) otherCols.push(j);

    // Try 3 distribution strategies for the surplus
    const strategies = [distributeFirst, distributeEven, distributeByMaxLevel];
    for (const stratFn of strategies) {
      const { R, C, rR, rC } = stratFn(grid, R_min, C_min, remR, remC, r, c, otherRows, otherCols);
      if (rR > 0 || rC > 0) continue;

      // Check non-union constraints
      let ok = true;
      for (let i = 0; i < N && ok; i++)
        for (let j = 0; j < N && ok; j++)
          if (i !== r && j !== c && grid[i][j] >= 0 && R[i] + C[j] < grid[i][j] + 1)
            ok = false;
      if (!ok) continue;

      const xRes = buildX(grid, r, c, R, C, otherRows, otherCols);
      if (!xRes) continue;

      const { x, clicks, totalClicks } = xRes;
      return { lastClick: { r, c }, R, C, x, clicks, totalClicks };
    }
    return null;
  }

  /* ── Distribution strategies ── */
  function distributeFirst(grid, R_min, C_min, remR, remC, r, c, otherRows, otherCols) {
    const R = [...R_min], C = [...C_min];
    let rR = remR, rC = remC;
    for (const i of otherRows) { const a = Math.min(rR, 50); R[i] += a; rR -= a; if (rR <= 0) break; }
    for (const j of otherCols) { const a = Math.min(rC, 50); C[j] += a; rC -= a; if (rC <= 0) break; }
    return { R, C, rR, rC };
  }

  function distributeEven(grid, R_min, C_min, remR, remC, r, c, otherRows, otherCols) {
    const R = [...R_min], C = [...C_min];
    let rR = remR, rC = remC;
    if (otherRows.length > 0 && rR > 0) {
      const per = Math.floor(rR / otherRows.length), extra = rR % otherRows.length;
      for (let idx = 0; idx < otherRows.length; idx++) R[otherRows[idx]] += per + (idx < extra ? 1 : 0);
      rR = 0;
    }
    if (otherCols.length > 0 && rC > 0) {
      const per = Math.floor(rC / otherCols.length), extra = rC % otherCols.length;
      for (let idx = 0; idx < otherCols.length; idx++) C[otherCols[idx]] += per + (idx < extra ? 1 : 0);
      rC = 0;
    }
    return { R, C, rR, rC };
  }

  function distributeByMaxLevel(grid, R_min, C_min, remR, remC, r, c, otherRows, otherCols) {
    const R = [...R_min], C = [...C_min];
    let rR = remR, rC = remC;
    const sortedR = [...otherRows].sort((a, b) => {
      const ma = Math.max(...otherCols.map(j => grid[a][j] >= 0 ? grid[a][j] : 0));
      const mb = Math.max(...otherCols.map(j => grid[b][j] >= 0 ? grid[b][j] : 0));
      return mb - ma;
    });
    const sortedC = [...otherCols].sort((a, b) => {
      const ma = Math.max(...otherRows.map(i => grid[i][a] >= 0 ? grid[i][a] : 0));
      const mb = Math.max(...otherRows.map(i => grid[i][b] >= 0 ? grid[i][b] : 0));
      return mb - ma;
    });
    for (const i of sortedR) { const a = Math.min(rR, 50); R[i] += a; rR -= a; if (rR <= 0) break; }
    for (const j of sortedC) { const a = Math.min(rC, 50); C[j] += a; rC -= a; if (rC <= 0) break; }
    return { R, C, rR, rC };
  }

  /* ── Build x matrix and generate clicks ── */
  function buildX(grid, r, c, R, C, otherRows, otherCols) {
    const x = Array.from({ length: N }, () => new Array(N).fill(0));
    let valid = true;

    // Union cells on target row
    for (let j = 0; j < N; j++) {
      x[r][j] = R[r] + C[j] - grid[r][j];
      if (x[r][j] < 0) { valid = false; break; }
    }
    if (!valid) return null;

    // Union cells on target column
    for (let i = 0; i < N; i++) {
      if (i !== r) {
        x[i][c] = R[i] + C[c] - grid[i][c];
        if (x[i][c] < 0) { valid = false; break; }
      }
    }
    if (!valid) return null;

    // Row/col needs for non-union transportation
    const rowNeeds = {}, colNeeds = {};
    for (const i of otherRows) {
      const need = R[i] - x[i][c];
      if (need < 0) { valid = false; break; }
      rowNeeds[i] = need;
    }
    if (!valid) return null;

    for (const j of otherCols) {
      const need = C[j] - x[r][j];
      if (need < 0) { valid = false; break; }
      colNeeds[j] = need;
    }
    if (!valid) return null;

    const totalRN = Object.values(rowNeeds).reduce((a, b) => a + b, 0);
    const totalCN = Object.values(colNeeds).reduce((a, b) => a + b, 0);
    if (totalRN !== totalCN) return null;

    // Upper bounds for non-union cells
    const ub = {};
    for (const i of otherRows) {
      for (const j of otherCols) {
        if (grid[i][j] >= 0) {
          ub[i * N + j] = Math.max(0, R[i] + C[j] - grid[i][j] - 1);
        } else {
          ub[i * N + j] = Math.min(R[i] - x[i][c], C[j] - x[r][j]);
        }
      }
    }

    // Try greedy transportation with 3 sort orderings
    const sortFns = [
      arr => arr.sort((a, b) => a[2] - b[2]),      // ascending ub
      arr => arr.sort((a, b) => b[2] - a[2]),      // descending ub
      arr => arr.sort((a, b) => a[0] * N + a[1] - (b[0] * N + b[1])), // row-major
    ];

    for (const sortFn of sortFns) {
      const rn = { ...rowNeeds };
      const cn = { ...colNeeds };
      const xt = x.map(row => [...row]);

      const cells = [];
      for (const i of otherRows)
        for (const j of otherCols)
          cells.push([i, j, ub[i * N + j] || 0]);
      sortFn(cells);

      for (const [i, j, upper] of cells) {
        const amount = Math.min(rn[i] || 0, cn[j] || 0, upper);
        xt[i][j] = amount;
        rn[i] -= amount;
        cn[j] -= amount;
      }

      if (Object.values(rn).some(v => v !== 0) || Object.values(cn).some(v => v !== 0)) continue;

      // Verify row/col sums
      let ok = true;
      for (let i = 0; i < N && ok; i++)
        if (xt[i].reduce((a, b) => a + b, 0) !== R[i]) ok = false;
      if (!ok) continue;
      for (let j = 0; j < N && ok; j++) {
        let s = 0;
        for (let i = 0; i < N; i++) s += xt[i][j];
        if (s !== C[j]) ok = false;
      }
      if (!ok) continue;

      // Verify non-union hits
      for (let i = 0; i < N && ok; i++)
        for (let j = 0; j < N && ok; j++)
          if (i !== r && j !== c && grid[i][j] >= 0)
            if (R[i] + C[j] - xt[i][j] < grid[i][j] + 1) ok = false;
      if (!ok) continue;

      // Generate click sequence (row-major order, last click separate)
      const clicks = [];
      for (let i = 0; i < N; i++)
        for (let j = 0; j < N; j++)
          for (let k = 0; k < xt[i][j]; k++)
            clicks.push({ r: i, c: j });

      const totalClicks = clicks.length + 1; // +1 for last click
      return { x: xt, clicks, totalClicks };
    }

    return null;
  }

  /* ── Public API ── */
  return {
    /**
     * Solve a 10×10 CROSS puzzle grid.
     * @param {number[][]} grid - 10×10 array, values from -1 (empty) to 8 (black)
     * @returns {{ steps: {r:number,c:number}[], totalSteps: number, crossRow: number, crossCol: number } | null}
     */
    solve(grid) {
      if (!grid || grid.length !== N) return null;
      const result = solveStrict(grid);
      if (!result) return null;

      // Build final step list: all clicks + last click
      const steps = result.clicks.map(({ r, c }) => ({ r, c }));
      steps.push({ r: result.lastClick.r, c: result.lastClick.c });

      return {
        steps,
        totalSteps: result.totalClicks,
        crossRow: result.lastClick.r,
        crossCol: result.lastClick.c,
        R: result.R,
        C: result.C,
      };
    }
  };
})();
