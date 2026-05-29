# Cross100 — Color Puzzle 项目总结

> **版本:** v1.2.0 | **许可证:** MIT | **仓库:** `https://github.com/Pokem0n2/cross100.git`

---

## 1. 项目概览

Cross100 是一款极简风格的 HTML5 颜色解谜游戏。核心玩法基于 10×10 网格上的十字消行机制——点击一个方块会使其所在整行和整列的所有方块各降一级颜色。游戏目标：**最后一次点击恰好消除 19 个灰色方块**即为通关。

### 关键特性一览

| 特性 | 说明 |
|------|------|
| **通用求解器** | 基于线性代数的 `universalSolver`，可求解任意合法局面 |
| **种子系统** | Mulberry32 PRNG，种子为 32 位无符号整数（8 位十六进制） |
| **矩阵导入** | 支持粘贴 10×10 数字矩阵直接生成关卡 |
| **双主题** | Monument Valley（暖色调）/ Pixel（暗黑霓虹） |
| **双语言** | 英文 / 中文，34 个 i18n 键 |
| **粒子特效** | Canvas 粒子爆发 + 四方向冲击波 |
| **撤销系统** | 基于栈的深度快照撤销 |
| **卡死检测** | 300ms 轮询看门狗，剩余 < 19 方块自动提示 |
| **解法演示** | `crack()` 逐步动画播放求解器输出 |
| **Android APK** | WebView 壳打包，手动工具链编译（无 Gradle） |
| **Walkthrough** | 812KB 独立 HTML 文档，40 步图文详解 |

---

## 2. 核心游戏机制

### 2.1 网格与颜色

10×10 网格，每个格子值域 `[-1, 8]`：

| 值 | 颜色 | Valley 色值 | Pixel 色值 |
|----|------|-------------|------------|
| -1 | 空（已消除） | — | — |
| 0 | 灰 | `#a8a098` | `#7f8c8d` |
| 1 | 红 | `#b86868` | `#e74c3c` |
| 2 | 橙 | `#c89060` | `#e67e22` |
| 3 | 黄 | `#c8b860` | `#f1c40f` |
| 4 | 绿 | `#7aab6b` | `#2ecc71` |
| 5 | 青 | `#6baa9f` | `#1abc9c` |
| 6 | 蓝 | `#6b8fb8` | `#3498db` |
| 7 | 紫 | `#9b7fb8` | `#9b59b6` |
| 8 | 黑 | `#3d3535` | `#2c3e50` |

颜色循环：**黑(8) → 紫(7) → 蓝(6) → 青(5) → 绿(4) → 黄(3) → 橙(2) → 红(1) → 灰(0) → 空(-1)**

### 2.2 操作规则

点击格子 `(r, c)`：
- 整行 `r` 所有非空格子各 -1
- 整列 `c` 所有非空格子各 -1
- 交叉点 `(r, c)` 只减一次
- 一次点击影响 **19 个格子**（10 行 + 10 列 - 1 交叉点 = 19）

### 2.3 胜负条件

| 条件 | 结果 |
|------|------|
| 所有格子为空 且 最后一步消除恰好 19 个灰格 | **通关** ✦ |
| 所有格子为空 但 最后一步消除数 ≠ 19 | **失败** ✗ |
| 剩余方块 1–18 个（不可能再凑 19） | **卡死** ⚠ |

---

## 3. 技术架构

### 3.1 文件结构

```
cross100/
├── index.html              # 886 行，单文件游戏（HTML+CSS+JS）
├── walkthrough.html        # 3551 行，解谜过关分析文档
├── README.md               # 项目说明
├── cross100.apk            # 预编译 APK
└── apk/
    ├── AndroidManifest.xml
    ├── assets/index.html   # APK 内嵌资源（与根目录 index.html 相同）
    ├── res/drawable/ic_launcher.png
    ├── src/com/cross100/game/MainActivity.java
    └── build/
        ├── cross100.apk
        ├── cross100.unsigned.apk
        ├── cross100.apk.idsig
        ├── dex/classes.dex
        ├── compiled/drawable_ic_launcher.png.flat
        └── obj/com/cross100/game/MainActivity.class
```

### 3.2 技术栈

- **纯 HTML5** — 无框架、无构建步骤、无外部依赖
- **内联 CSS** — 约 212 行 `<style>` 标签
- **内联 JS** — 约 600 行 IIFE `<script>` 标签
- **Canvas 2D** — 粒子和冲击波动画

### 3.3 HTML 结构

```
<div id="app">
  <header>
    <div class="hdr-top">
      <span class="logo">CROSS</span>
      <div class="hdr-btns">
        <button id="blang" class="lang-btn">          <!-- 语言切换 EN/CN -->
        <button id="bh" class="btn-icon">?</button>   <!-- 帮助 -->
      </div>
    </div>
    <div class="stats">
      <div class="stat"><span class="stat-l" data-i18n="taps">Taps</span>
        <span id="sc" class="stat-v">0</span></div>
      <div class="stat"><span class="stat-l" data-i18n="left">Left</span>
        <span id="rm" class="stat-v">100</span></div>
    </div>
    <div id="seedRow" class="seed-row">
      <span data-i18n="seed">seed</span>: <span id="seedVal"></span>
    </div>
    <div class="seed-btns">
      <button id="bLoadSeed" class="btn btn-sm" data-i18n="loadSeed">Load Seed</button>
      <button id="bImport" class="btn btn-sm" data-i18n="importMatrix">Import Matrix</button>
      <button id="bCopySeed" class="btn btn-sm" data-i18n="copySeed">Copy Seed</button>
    </div>
  </header>
  <main id="game">
    <div id="gwrap">
      <div id="grid"></div>       <!-- 10×10 CSS Grid -->
      <canvas id="cv"></canvas>   <!-- 粒子叠加层 -->
    </div>
  </main>
  <footer>
    <button id="bt" class="btn-icon">   <!-- 主题切换 (◆/■) -->
    <button id="bn2" class="btn">NEW GAME</button>
    <button id="bc" class="btn-icon disabled">  <!-- 演示解法 (▶/✕) -->
  </footer>
  <button id="bu" class="undo-btn disabled"><!-- SVG undo arrow icon --></button>
  <!-- 通关/失败覆层 -->
  <div id="ov" class="ov hide">
    <div class="ov-card">
      <div id="oi" class="ov-icon">✦</div>
      <h2 id="ot" class="ov-title">CLEARED!</h2>
      <p class="ov-score"><span data-i18n="taps">Taps</span>: <strong id="fs">0</strong></p>
      <p id="om" class="ov-msg"></p>
      <button id="bx" class="btn btn-pri" data-i18n="newGame">NEW GAME</button>
    </div>
  </div>
  <!-- 种子加载覆层 -->
  <div id="seedOv" class="help-overlay hide">
    <div class="help-card">
      <h3 data-i18n="loadSeedTitle">LOAD SEED</h3>
      <p class="help-hint" data-i18n="loadSeedHint">Enter seed ID to load a level</p>
      <input id="seedIn" class="seed-input" maxlength="8" inputmode="hex" />
      <button id="seedConfirm" class="btn btn-pri" data-i18n="confirm">Confirm</button>
    </div>
  </div>
  <!-- 网格导入覆层 -->
  <div id="importOv" class="help-overlay hide">
    <div class="help-card">
      <h3 data-i18n="importGridTitle">IMPORT GRID</h3>
      <p class="help-hint" data-i18n="importGridHint">Paste 10×10 number matrix</p>
      <textarea id="gridIn" class="grid-textarea" rows="10"></textarea>
      <button id="importConfirm" class="btn btn-pri" data-i18n="confirm">Confirm</button>
    </div>
  </div>
</div>
```

### 3.4 覆层系统

| 覆层 | ID / Class | z-index | 用途 |
|------|------------|---------|------|
| 通关/失败 | `#ov` (.ov) | 100 | 显示结果、分数、操作按钮 |
| 加载种子 | `#seedOv` (.help-overlay) | 200 | 输入 8 位十六进制种子 |
| 导入网格 | `#importOv` (.help-overlay) | 200 | 粘贴 10×10 数字矩阵 |
| 帮助 | 动态创建 (.help-overlay) | 200 | 游戏规则说明 |
| 卡死横幅 | 动态创建 (#stuckBanner) | 99999 | 全屏卡死提示 |

- 种子覆层、导入覆层支持点击遮罩区域关闭（精确检测 `e.target === overlay`）
- 帮助覆层点击**任意位置**关闭（包括卡片内部，未做 target 检测）
- 通关/失败覆层 `#ov` 仅通过按钮 `#bx` 操作，**不支持**点击遮罩关闭
- 卡死横幅仅通过两个按钮操作，**不支持**点击遮罩关闭
- 种子覆层支持虚拟键盘自动上移（`visualViewport` 事件）

---

## 4. 主题系统

### 4.1 Valley 主题（默认）

温暖大地色调，圆角设计：

```css
:root {
  --bg1: #f5ebe0;        /* 主背景 */
  --bg2: #eddecf;        /* 次背景 */
  --hdr: rgba(245,235,224,.92);  /* 头部半透明 */
  --grid: #cdc1b4;       /* 网格线 */
  --cell-empty: rgba(187,173,160,.12);
  --txt: #5a4e44;        /* 主文字 */
  --txt-l: #f9f6f2;      /* 亮文字 */
  --txt-m: #8b7e74;      /* 中等文字 */
  --accent: #b87060;     /* 强调色 */
  --glow: rgba(184,112,96,.35);
  --rad: 16px;           /* 大圆角 */
  --crad: 8px;           /* 小圆角 */
  --gap: 4px;
  --font: 'Segoe UI', system-ui, -apple-system, sans-serif;
  --speed: .3s;          /* 动画速度 */
  --sh: rgba(90,78,68,.12);  /* 阴影色 */
}
```

- 背景装饰：径向渐变 + 30s `bgF` 浮动动画
- Logo：轻量 300 weight

### 4.2 Pixel 主题

暗黑霓虹风格，锐利边角：

```css
[data-theme="pixel"] {
  --bg1: #0a0a1a;
  --bg2: #12122a;
  --hdr: rgba(10,10,26,.95);
  --grid: #1a1a3a;
  --cell-empty: rgba(30,30,80,.25);
  --txt: #e0e0ff;
  --txt-l: #fff;
  --txt-m: #6060a0;
  --accent: #ffd700;
  --glow: rgba(255,215,0,.3);
  --sh: rgba(0,0,0,.4);
  --rad: 4px;
  --crad: 2px;
  --gap: 3px;
  --font: 'Courier New', Consolas, monospace;
  --speed: .15s;         /* 更快的动画 */
}
```

- 网格线图案（24px 重复）+ CRT 暗角 + 扫描线叠加
- Logo：粗体 700 + 发光文字阴影
- 点击时网格震动（`shake` 动画）
- 按钮强调色覆盖为 `#c0392b`（深红）提升可读性

---

## 5. 国际化系统

### 5.1 i18n 机制

- 双语言：`en`（英文）/ `cn`（中文）
- 34 个键值对
- `t(key, n)` 函数：查找键值，支持 `{n}` 占位符替换
- `applyLang()` 函数：更新所有 `[data-i18n]` 属性的 DOM 元素，设置按钮 title
- 语言偏好存储于 localStorage

### 5.2 完整键值表

| 键 | 英文 | 中文 |
|----|------|------|
| `taps` | Taps | 点击 |
| `left` | Left | 剩余 |
| `seed` | seed | 种子 |
| `loadSeed` | Load Seed | 加载种子 |
| `importMatrix` | Import Matrix | 导入网格 |
| `copySeed` | Copy Seed | 复制种子 |
| `newGame` | NEW GAME | 新游戏 |
| `confirm` | Confirm | 确认 |
| `helpTitle` | HOW TO PLAY | 游戏规则 |
| `helpGoal` | Goal: On your final tap, clear exactly 19 gray blocks to win. | 目标：最后一次点击恰好消除 19 个灰色方块即可通关。 |
| `helpOp` | How: Tap any block — its entire row + column each drop one color level. | 操作：点击任意色块，该色块所在的整行 + 整列所有色块颜色各降一级。 |
| `helpColors` | Colors: Black→Purple→Blue→Cyan→Green→Yellow→Orange→Red→Gray→Empty | 颜色等级：黑→紫→蓝→青→绿→黄→橙→红→灰→无色 |
| `helpScore` | Score: Fewer taps is better. | 得分：点击次数越少越好。 |
| `helpClose` | Tap anywhere to close | 点击任意位置关闭 |
| `loadSeedTitle` | LOAD SEED | 加载种子 |
| `loadSeedHint` | Enter seed ID to load a level | 输入种子ID加载指定关卡 |
| `importGridTitle` | IMPORT GRID | 导入网格 |
| `importGridHint` | Paste 10×10 number matrix | 粘贴10×10数字矩阵（逗号或空格分隔，-1为空） |
| `tapOutside` | Tap outside to close | 点击遮罩关闭 |
| `copied` | Copied ! | 已复制 ! |
| `winTitle` | CLEARED! | 通关！ |
| `winMsg` | Cleared exactly 19 gray blocks! | 成功消除 19 个灰色方块！ |
| `failTitle` | ALMOST! | 差一点！ |
| `failMsg` | Need to clear exactly 19 gray blocks in the final move | 最后一次点击需要恰好消除 19 个灰色方块 |
| `failCleared` | Cleared {n} gray | 消除了 {n} 个灰色 |
| `retry` | RETRY | 重试 |
| `stuckTitle` | FAILED | 失败 |
| `stuckMsg` | Remaining {n} blocks < 19 | 剩余 {n} 个方块 < 19 |
| `stuckSub` | Cannot win this round | 本局无法获胜 |
| `restart` | RESTART | 重新开始 |
| `showSolution` | Show Solution | 演示解法 |
| `switchTheme` | Switch Theme | 切换主题 |
| `undo` | Undo | 撤销 |
| `help` | Help | 帮助 |

---

## 6. 种子与关卡生成

### 6.1 PRNG — Mulberry32

```js
function mulberry32(a) {
  return function() {
    a |= 0;
    a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t ^= t + Math.imul(t ^ t >>> 7, 61 | t);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
}
```

- 标准 32 位整数 PRNG
- 输出范围 `[0, 1)`（除以 2³²）
- 种子显示为 8 位零填充十六进制
- 新游戏种子：`(Math.random() * 0xFFFFFFFF) >>> 0`

### 6.2 关卡生成 — `gen(seed)`

```
1. 创建 10×10 网格，所有格子初始化为 -1（空）
2. 循环：
   a. 用 PRNG 随机选择 (r, c)
   b. 如果行 r 或列 c 中任何格子 ≥ 8 → 停止
   c. 否则：行 r 所有格子 +1，列 c 所有格子（除交叉点）+1
3. 记录每次放置位置到序列 seq[]
4. 解法 = seq.reverse()  ← 生成序列的逆序即为解法
5. 当 `seed` 为 `null` 时，回退使用 `Math.random` 直接作为 RNG
```

**关键洞察：** 生成过程是"逆向解法"——每次放置相当于反向执行一步操作，因此反转放置序列就得到正向解法。

---

## 7. 通用求解器

### 7.1 数学推导

设 `g[i][j]` 为当前网格值，求解最优点击序列。

**Step 1 — 需求矩阵 D：**

$$D[i][j] = \begin{cases} g[i][j] + 1 & \text{if } g[i][j] \geq 0 \\ 0 & \text{if } g[i][j] = -1 \end{cases}$$

**Step 2 — 总点击数验证：**

$$T = \sum_{i,j} D[i][j]$$

每次点击影响 19 个格子，因此 $S = T / 19$ 必须为整数，否则无解。

**Step 3 — 行/列点击次数：**

$$A[i] = \operatorname{round}\left(\frac{\sum_j D[i][j] - S}{9}\right) \quad \text{（行 i 的点击次数，必须为非负整数）}$$

$$B[j] = \operatorname{round}\left(\frac{\sum_i D[i][j] - S}{9}\right) \quad \text{（列 j 的点击次数，必须为非负整数）}$$

$A[i]$ 和 $B[j]$ 必须为非负整数（使用 `Math.round` 验证，非 `Math.floor`）。

**Step 4 — 格子点击矩阵：**

$$Z[i][j] = A[i] + B[j] - D[i][j]$$

对有内容的格子：$Z[i][j] \geq 0$；对空格子：$Z[i][j] = 0$。

**Step 5 — 贪心调度：**

将所有 $(r, c, Z[r][c])$ 按格子值降序排列，逐个尝试：模拟执行该点击，若不会导致任何格子过度递减（低于 -1），则执行；否则跳过。

### 7.2 核心代码

```js
function universalSolver(g) {
  const N = 10;
  // 构建需求矩阵 D
  let D = [], T = 0, Di = Array(N).fill(0), Ej = Array(N).fill(0);
  for (let i = 0; i < N; i++) {
    D[i] = [];
    for (let j = 0; j < N; j++) {
      D[i][j] = g[i][j] >= 0 ? g[i][j] + 1 : 0;
      T += D[i][j];
    }
  }
  if (T % 19 !== 0) return null;
  const S = T / 19;

  // 分别计算行列和
  for (let i = 0; i < N; i++)
    for (let j = 0; j < N; j++) { Di[i] += D[i][j]; Ej[j] += D[i][j]; }

  // 计算行列点击次数（使用 Math.round 验证）
  let A = [], B = [];
  for (let i = 0; i < N; i++) {
    A[i] = (Di[i] - S) / 9;
    if (A[i] < 0 || A[i] !== Math.round(A[i])) return null;
  }
  for (let j = 0; j < N; j++) {
    B[j] = (Ej[j] - S) / 9;
    if (B[j] < 0 || B[j] !== Math.round(B[j])) return null;
  }

  // 构建点击列表（无 v 属性）
  let taps = [];
  for (let i = 0; i < N; i++)
    for (let j = 0; j < N; j++) {
      const z = A[i] + B[j] - D[i][j];
      if (g[i][j] >= 0 && z < 0) return null;   // 有内容格子：z 必须 ≥ 0
      if (g[i][j] < 0 && z !== 0) return null;   // 空格子：z 必须恰好为 0
      for (let k = 0; k < z; k++) taps.push({r: i, c: j});
    }
  // 按格子值降序排序（通过查原网格）
  taps.sort((a, b) => g[b.r][b.c] - g[a.r][a.c]);

  // 贪心调度：遍历点击列表，找到可执行的点击就应用并重启扫描
  let seq = [], sim = g.map(row => [...row]);
  let used = new Set();
  while (seq.length < taps.length) {
    let found = false;
    for (let idx = 0; idx < taps.length; idx++) {
      if (used.has(idx)) continue;
      const tp = taps[idx];
      if (sim[tp.r][tp.c] < 0) { used.add(idx); continue; }
      // 检查此点击是否安全（不导致任何格子低于 -1）
      let ok = true;
      for (let k = 0; k < N; k++) {
        if (sim[tp.r][k] >= 0 && sim[tp.r][k] - 1 < -1) { ok = false; break; }
      }
      if (ok) for (let k = 0; k < N; k++) {
        if (k !== tp.r && sim[k][tp.c] >= 0 && sim[k][tp.c] - 1 < -1) { ok = false; break; }
      }
      if (!ok) continue;
      // 执行此点击
      for (let k = 0; k < N; k++) {
        if (sim[tp.r][k] >= 0) sim[tp.r][k]--;
        if (k !== tp.r && sim[k][tp.c] >= 0) sim[k][tp.c]--;
      }
      seq.push({r: tp.r, c: tp.c});
      used.add(idx);
      found = true;
      break;  // 重新从头扫描（新状态可能解锁前面跳过的点击）
    }
    if (!found) return null;  // 无可执行点击 → 无解
  }
  return seq;
}
```

---

## 8. 粒子与动画系统

### 8.1 粒子系统 (`parts[]`)

每消除一个格子发射 10 个粒子：

```js
{
  x, y,      // 位置
  vx, vy,    // 速度（cos/sin(angle) * speed）
  sz,        // 尺寸（Valley: 2.5–6px, Pixel: 1.5–4px）
  c,         // 颜色字符串
  life,      // 生命值（1.0 → 0）
  dec,       // 衰减速率（0.015–0.035/帧）
  sq         // 是否方形（Pixel 主题）
}
```

- 角度分布：`2π × i/10 + 随机偏移 × 0.4`（均匀散布 + 抖动）
- 速度：`1.2 + 随机 × 2.5`
- 所有粒子均有重力：`vy += 0.06`（与主题无关）

**粒子颜色：**
- Valley: `['#f5ebe0', '#eddecf', '#cdc1b4', '#b87060', '#c8b860', '#6baa9f']`
- Pixel: `['#ffd700', '#ff6b6b', '#4ecdc4', '#a855f7', '#3498db', '#2ecc71']`

### 8.2 冲击波系统 (`shockwaves[]`)

每次点击发射 4 个方向（上/下/左/右）冲击波：

```js
{
  x, y,      // 原点位置
  dx, dy,    // 方向单位向量
  pos,       // 当前位置偏移
  spd,       // 速度（Valley: 9, Pixel: 14）
  life,      // 生命值，衰减 0.028/帧
  col        // 颜色（Valley: #b87060, Pixel: #ffd700）
}
```

渲染：双层描边（外层 `lineWidth 3+life*4, alpha life*0.35` + 内层 `1.5+life*1.5, alpha life*0.7`）+ 带白色核心的头部光点 + `shadowBlur` 发光效果。

### 8.3 CSS 动画

| 名称 | 效果 | 触发时机 |
|------|------|----------|
| `spop` | 统计数字弹跳 (scale 1→1.25→1) | 每次点击更新计数 |
| `tapA` | 点击格子缩放 (scale 1→0.82→1) | 点击格子时 |
| `popA` | 颜色变化弹跳 (scale 1→1.15→1) | 格子颜色降级 |
| `goneA` | 消失闪烁 (scale up + fade) | 格子被消除 |
| `hintA` | 求解提示脉冲 (1→1.18→1 + accent 光晕) | crack() 演示解法时 |
| `shake` | 网格震动 (translate 抖动) | Pixel 主题点击时 |
| `bgF` | 背景浮动 (translate 2%, -2%) | Valley 背景装饰 |

### 8.4 动画循环

`tickParts()` 通过 `requestAnimationFrame` 递归调用：
1. 清除 Canvas
2. `tickSW()` — 更新并渲染冲击波
3. 更新并渲染粒子
4. 移除生命值 ≤ 0 的元素

---

## 9. 操作系统

### 9.1 撤销系统

- `undoStack` 存储网格深度快照（`grid.map(row => [...row])`）
- 每次点击前推入快照（点击前状态）
- `undo()`：弹出快照，taps 计数 -1（最低 0）
- 若通关/失败覆层正在显示，撤销时会自动关闭它
- 栈空时：禁用撤销按钮，重置 `tapped=false`，重新启用解法按钮

### 9.2 卡死检测（看门狗）

```js
setInterval(function() {
  // 1. 统计剩余方块数 rem 并更新 #rm 显示
  // 2. 若 rem 在 1–18 之间且未在演示解法中：
  if (rem > 0 && rem < 19 && !cracking && !stuckBanner) {
    // 创建全屏卡死横幅
    // 显示 "剩余 N 个方块 < 19，无法获胜"
    // 两个按钮：重新开始 / 新游戏
  }
}, 300);
```

### 9.3 解法演示 — `crack()`

1. 保存当前网格 + taps 状态
2. 若无预计算解法，运行 `universalSolver`；若无解则 `alert('No solution found for this grid.')` 并返回
3. 演示期间 `#bc` 按钮变为播放图标（`SVG_PLAY`）、添加 `disabled` 类、opacity 设为 0.6；结束后恢复为 `SVG_X`、移除 disabled、opacity 恢复为 1
4. 逐步动画：高亮格子 (`.hint`, 450ms) → 执行 tap → 间隔 650ms
5. 演示完毕后恢复原始状态（2s 延迟）
6. 可通过 `crackStop` 标志中途停止；该标志在 `step()` 入口、2s 完成延迟、hint 超时回调三处检查
7. `newGame`/`restartLevel`/`loadSeedFromInput`/`importGrid` 均会设置 `crackStop=true`

### 9.4 矩阵导入

- 解析文本域内容：按 `[\n\r]+` 分行，按 `[,\s]+` 分列
- 验证：恰好 10 行 × 10 列，无 NaN
- 导入后 `sol=[]`（强制求解器重新计算）
- 种子显示 "imported"

---

## 10. Android 打包

### 10.1 AndroidManifest.xml

```xml
<manifest package="com.cross100.game">
  <uses-sdk android:minSdkVersion="21" android:targetSdkVersion="34" />
  <application android:hardwareAccelerated="true" android:label="Cross100">
    <activity android:name=".MainActivity"
              android:exported="true"
              android:screenOrientation="portrait"
              android:configChanges="orientation|screenSize|keyboardHidden"
              android:theme="@android:style/Theme.NoTitleBar.Fullscreen">
      <intent-filter>
        <action android:name="android.intent.action.MAIN" />
        <category android:name="android.intent.category.LAUNCHER" />
      </intent-filter>
    </activity>
  </application>
</manifest>
```

- **无权限声明** — 仅加载本地资源
- minSdk 21（Android 5.0）兼容 99%+ 设备

### 10.2 MainActivity.java

```java
public class MainActivity extends Activity {
  private WebView webView;

  @Override protected void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    // 全屏
    requestWindowFeature(Window.FEATURE_NO_TITLE);
    getWindow().setFlags(FLAG_FULLSCREEN, FLAG_FULLSCREEN);

    webView = new WebView(this);
    WebSettings ws = webView.getSettings();
    ws.setJavaScriptEnabled(true);
    ws.setDomStorageEnabled(true);
    ws.setCacheMode(WebSettings.LOAD_NO_CACHE);
    ws.setAllowFileAccess(true);
    ws.setUseWideViewPort(true);
    ws.setLoadWithOverviewMode(true);

    webView.setWebViewClient(new WebViewClient());
    webView.setWebChromeClient(new WebChromeClient());
    webView.loadUrl("file:///android_asset/index.html");
    setContentView(webView);
  }

  @Override public void onBackPressed() {
    if (webView.canGoBack()) webView.goBack();
    else super.onBackPressed();
  }
}
```

### 10.3 编译工具链

| 工具 | 版本 | 用途 |
|------|------|------|
| javac | 21.0.11 | OpenJDK 21 Java 编译器 |
| aapt2 | 2.19 | Android 资源打包工具 |
| d8 | 3.3.20-dev | D8 DEX 编译器 |
| apksigner | 0.9 | APK 签名工具 |

**编译流程（无 Gradle，手动 shell 命令）：**

```bash
ANDROID_JAR=$ANDROID_HOME/platforms/android-34/android-34/android.jar

# 1. 编译 Java
javac -source 8 -target 8 -bootclasspath $ANDROID_JAR \
  -d build/obj apk/src/com/cross100/game/MainActivity.java

# 2. 生成 DEX
d8 --output build/dex build/obj/com/cross100/game/MainActivity.class

# 3. 打包资源
aapt2 compile -o build/compiled/ --dir apk/res
aapt2 link -o build/cross100.unsigned.apk \
  -I $ANDROID_JAR --manifest apk/AndroidManifest.xml \
  --auto-add-overlay -A apk/assets build/compiled/*.flat

# 4. 注入 DEX
cd build && aapt add cross100.unsigned.apk dex/classes.dex

# 5. 签名
apksigner sign --ks debug.keystore \
  --ks-pass pass:android --key-pass pass:android \
  --out cross100.apk cross100.unsigned.apk
```

Java 源码/目标级别：8。签名密钥：debug keystore。

---

## 11. Walkthrough 分析文档

`walkthrough.html` 是一份独立的中文解谜教学文档（3551 行，约 812KB）。

### 结构

1. **标题区** — "CROSS 解谜过关分析 - 40步详细讲解"
2. **颜色图例** — 10 种格子状态映射表
3. **概览面板** — 关键数据：100 个初始非空格、40 步、十字线第 9 行 × 第 5 列、最终 19 个灰格
4. **40 张步骤卡片** — 每张包含：
   - 标题：步骤编号 + 点击位置（如"点击 第1行 第1列"）
   - 双栏布局：左侧棋盘 before/after 对比表格 + 右侧分析文字
   - 进度条 + 行列状态标签（如 `行1:1/8`，绿=完成，黄=进行中，灰=未开始）
5. **总结区** — 完成统计

### 解法策略

- **核心思路：** 选择十字线（第 9 行 × 第 5 列），39 步准备阶段将所有非十字线格子系统性降为空，第 40 步点击十字线交叉点一次性消除 19 个灰格
- **行点击计划：** 行1×8, 行2×3, 行3×1, 行4×6, 行5×2, 行6×4, 行7×4, 行8×3, 行9×3, 行10×5 = 39 + 1 = 40 步

### 样式

- 暗色主题（`#0f0f1a` 背景）
- 纯 CSS，无框架
- 响应式：768px 断点折叠双栏为单栏，格子从 38px 缩至 28px
- 步骤卡片颜色编码：普通（蓝色）、最终步（红色）、完成（绿色）

### Meta 标签（来自 index.html）

> 注意：walkthrough.html 仅使用简化的 `<meta name="viewport" content="width=device-width, initial-scale=1.0">`

```html
<meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
<meta http-equiv="Pragma" content="no-cache">
<meta http-equiv="Expires" content="0">
<meta name="viewport" content="width=device-width, initial-scale=1,
  maximum-scale=1, user-scalable=no, viewport-fit=cover">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
```

- 禁用缓存（适合开发阶段）
- 视口锁定禁止缩放 + 安全区域适配
- 支持全屏 PWA 模式

---

## 12. 持久化

- **localStorage 键：** `'cross'`
- **存储内容：** `{t: theme, l: lang}` — 仅主题和语言偏好
- 网格状态、种子、撤销栈 **不持久化**（刷新丢失）

---

## 13. 事件监听完整列表

| 目标 | 事件 | 处理函数 |
|------|------|----------|
| `#blang` | click | 切换语言 en↔cn，applyLang，save |
| `#bc` | click | `crack()` |
| `#bn2` | click | `newGame()` |
| `#bt` | click | `togTheme()` |
| `#bu` | click | `undo()` |
| `#bh` | click | `showHelp()` |
| `#bCopySeed` | click | 写入剪贴板种子十六进制 |
| `#bLoadSeed` | click | 显示种子覆层，聚焦输入框 |
| `#seedOv` | click | 关闭种子覆层（仅点击遮罩区域时） |
| `#seedConfirm` | click | `loadSeedFromInput()` |
| `#seedIn` | keydown | Enter → `loadSeedFromInput()` |
| `#bImport` | click | 显示导入覆层 |
| `#importOv` | click | 关闭导入覆层（仅点击遮罩区域时） |
| `#importConfirm` | click | `importGrid()` |
| `#bx` | click | 根据 dataset.action 执行重试/新游戏 |
| window | resize | `resizeCv()` |
| visualViewport | resize/scroll | 种子输入框键盘适配 |
| .cell | click | `tap(r, c)`（render() 中动态绑定） |
| `#stuckRetry` | click | `restartLevel()`（看门狗动态创建） |
| `#stuckNew` | click | `newGame()`（看门狗动态创建） |

---

## 14. JavaScript 函数完整索引

| 函数 | 签名 | 用途 |
|------|------|------|
| `$` | `$(id)` | `getElementById` 快捷方式 |
| `t` | `t(key, n)` | i18n 查找 + `{n}` 替换 |
| `applyLang` | `applyLang()` | 应用语言到 DOM |
| `load` | `load()` | 读取 localStorage |
| `save` | `save()` | 写入 localStorage |
| `mulberry32` | `mulberry32(a)` | 返回 PRNG 函数 |
| `showSeed` | `showSeed()` | 显示种子十六进制 |
| `gen` | `gen(seed)` | 生成关卡网格 + 解法 |
| `cellColor` | `cellColor(v)` | 返回格子 CSS 颜色 |
| `render` | `render()` | 完整网格重渲染 |
| `upd` | `upd(r, c)` | 更新单个格子背景 |
| `tap` | `tap(r, c)` | 处理点击事件 |
| `chkGray` | `chkGray(gc)` | 检查胜负（灰格计数） |
| `checkStuck` | `checkStuck()` | 检查卡死状态 |
| `popSc` | `popSc()` | 更新分数 + 弹跳动画 |
| `updRem` | `updRem()` | 统计并显示剩余方块 |
| `showWin` | `showWin()` | 显示通关覆层 |
| `showFail` | `showFail()` | 显示失败覆层 |
| `showStuck` | `showStuck()` | 显示卡死覆层（**死代码**：看门狗直接内联创建 UI，从未调用此函数） |
| `universalSolver` | `universalSolver(g)` | 线性代数求解器 |
| `crack` | `crack()` | 逐步动画播放解法 |
| `newGame` | `newGame()` | 生成新随机游戏 |
| `restartLevel` | `restartLevel()` | 从 initGrid 重启 |
| `undo` | `undo()` | 弹出撤销栈 |
| `loadSeedFromInput` | `loadSeedFromInput()` | 从输入框加载种子 |
| `importGrid` | `importGrid()` | 从文本域导入网格 |
| `togTheme` | `togTheme()` | 切换主题 |
| `showHelp` | `showHelp()` | 动态创建并显示帮助 |
| `resizeCv` | `resizeCv()` | 调整 Canvas 尺寸 |
| `emit` | `emit(r, c)` | 发射粒子 |
| `emitSW` | `emitSW(r, c)` | 发射冲击波 |
| `tickSW` | `tickSW()` | 更新冲击波动画 |
| `tickParts` | `tickParts()` | 主动画循环 (RAF) |
| `init` | `init()` | 引导初始化 |

---

## 15. 状态变量

```js
let grid = [];          // 10×10 网格（-1=空, 0=灰 ... 8=黑）
let taps = 0;           // 点击计数
let busy = false;       // 动画锁
let theme = 'valley';   // 主题 ('valley' | 'pixel')
let lang = 'en';        // 语言 ('en' | 'cn')
let lastGray = 0;       // 最后一步消除的灰格数
let sol = [];           // 预计算解法序列 [{r,c},...]
let cracking = false;   // 解法演示进行中
let crackStop = false;  // 停止演示信号
let initGrid = null;    // 初始网格快照（用于重启）
let tapped = false;     // 用户是否已点击（禁用解法按钮）
let undoStack = [];     // 撤销栈（网格深度快照）
let curSeed = 0;        // 当前种子（uint32）
let parts = [];         // 粒子数组
let shockwaves = [];    // 冲击波数组
```

### 15.1 SVG 常量

| 名称 | 描述 |
|------|------|
| `SVG_DIAMOND` | 16×16 菱形多边形（Valley 主题切换图标） |
| `SVG_SQUARE` | 14×14 方形矩形（Pixel 主题切换图标） |
| `SVG_PLAY` | 16×16 播放三角形 |
| `SVG_X` | 14×14 X 叉号（两条线段） |

### 15.2 预缓存 DOM 引用

```js
const $g = $('grid');     // 网格容器
const $sc = $('sc');      // 点击计数显示
const $ov = $('ov');      // 通关/失败覆层
const $fs = $('fs');      // 最终分数显示
const $cv = $('cv');      // Canvas 元素
const $bx = $('bx');      // 覆层操作按钮
const ctx = $cv.getContext('2d');  // Canvas 2D 绘图上下文
```

> 注意：`$` 函数在代码中后定义但先调用——依赖 JavaScript 函数提升特性。

### 15.3 颜色渲染数组

```js
// Valley 主题格子颜色（cellColor() 实际使用）
const CV = ['#a8a098','#b86868','#c89060','#c8b860','#7aab6b','#6baa9f','#6b8fb8','#9b7fb8','#3d3535'];
// Pixel 主题格子颜色
const CP = ['#7f8c8d','#e74c3c','#e67e22','#f1c40f','#2ecc71','#1abc9c','#3498db','#9b59b6','#2c3e50'];
```

> 注意：`COLORS` 对象（含 `v`/`p` 属性）在代码中定义但从未用于渲染——`cellColor()` 实际使用 `CV`/`CP` 平面数组。

---

## 16. 版本历史

| 版本 | 标签 |
|------|------|
| v1.1.0 | 初始发布 |
| v1.2.0 | 当前版本 |

---

*文档生成时间：2026-05-30 | 基于 index.html (886行) + walkthrough.html (3551行) + apk/ 完整分析*
