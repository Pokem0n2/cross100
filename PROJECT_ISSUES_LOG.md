# Cross100 & Cross Solver — 全过程问题与解决方案总结

> 时间跨度：2026-05-27 ~ 2026-05-30
> 环境：Android 15 + Termux (aarch64)，无 PC，全程手机端开发

---

## 一、项目开发阶段（5月27日前，用户独立完成）

### 1.1 初始游戏开发（commit `38ec8a6`）

**成果：** 纯 HTML5 单文件游戏 `index.html`（10×10 颜色消除游戏）

**核心技术决策：**
- 单文件架构（HTML + CSS + JS 全部内联），零依赖
- CSS Grid 布局 10×10 网格
- Canvas 2D 叠加层用于粒子特效
- 两种主题：Valley（暖色调圆角）/ Pixel（暗黑霓虹锐角）

### 1.2 Android WebView 打包（commit `5464955`）

**环境搭建问题：**

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| Termux 无 Android SDK | 默认不预装 | 手动安装 aapt2、d8、apksigner 等独立工具 |
| 无 Gradle 构建系统 | Termux 不适合装 Android Studio | 采用纯命令行手动编译流程：javac → d8 → aapt2 → apksigner |
| ANDROID_HOME 未设置 | 环境变量缺失 | 硬编码路径 `/data/data/com.termux/files/home/android-sdk/platforms/android-34/android-34/android.jar` |
| debug.keystore 位置不确定 | 非标准位置 | 最终定位在 `/data/data/com.termux/files/home/tmp/debug.keystore` |

**编译工具链版本：**
| 工具 | 版本 | 来源 |
|------|------|------|
| javac | 21.0.11 | OpenJDK 21 (pkg install) |
| aapt2 | 2.19 | Termux 仓库 |
| d8 | 3.3.20-dev | R8/AOSP 构建 |
| apksigner | 0.9 | Termux 仓库 |

**手动编译流程（5步，无构建系统）：**
```
javac → d8 → aapt2 compile → aapt2 link → aapt add DEX → apksigner sign
```

### 1.3 Walkthrough 教学文档（commits `e15a389` → `3ddf966`）

- 初版 18 步，后续扩展为 40 步详细图文讲解
- 独立 HTML 文件（3551 行，812KB），暗色主题
- 纯 CSS 样式，响应式 768px 断点

### 1.4 i18n 国际化（commit `b62cea5`）

**问题：** 原版硬编码中文文本，无法切换语言

**解决方案：**
- 新增 34 个 i18n 键的 EN/CN 翻译表
- 所有 UI 元素添加 `data-i18n` 属性
- `applyLang()` 函数动态更新 DOM
- 语言偏好存储在 localStorage

**同步问题：** i18n 等功能只更新了 root `index.html`，**未同步到 `apk/assets/index.html`**。导致 APK 内嵌版本长期落后于开发版本。

---

## 二、求解器开发阶段（5月27-30日）

### 2.1 Gateway 中断问题

**问题：** 用户反馈 `hermes gateway run` 启动的 session 频繁中断，导致之前的求解器任务丢失。

**原因：** `gateway run` 是前台进程，以下情况会中断：
- Termux 被 Android OOM killer 回收
- 终端窗口关闭 / PTY 断开
- 网络断开导致 WebSocket 断连

**解决方案：** 改用后台服务模式：
```bash
hermes gateway install    # 安装为后台服务
hermes gateway start      # 启动后台服务
```

### 2.2 游戏内置求解器开发（commits `5460a30` → `10c0b5e`）

**第一版求解器（commit `5460a30`）：**
- 采用线性代数 + 贪心排序方案
- 存在 bug——未正确处理行列交叉点的重叠计数

**修复版（commit `10c0b5e`）：**
- 修正为 overlap-aware 线性代数模型
- 核心公式：`Z[i][j] = A[i] + B[j] - D[i][j]`
- 新增双条件验证：有内容格子 `z ≥ 0`，空格子 `z === 0`
- 贪心调度改为 while 循环 + used Set + break 重扫描模式

**求解器集成方式：** 求解器代码直接嵌入游戏 `index.html` 的 `crack()` 函数中。仅当预存解法 `sol[]` 为空时（导入网格场景）才调用。

### 2.3 APK 版本同步（v1.1.0 → v1.2.0）

**v1.1.0（commit `b62cea5`，2026-05-29）：**
- APK 内嵌的是**早期版本**的 index.html
- 无 i18n、无种子系统、无撤销、无导入、无求解器
- 仅有基础游戏 + 主题切换

**v1.2.0（commit `10c0b5e`，2026-05-30）：**
- 将 `apk/assets/index.html` 全量同步到最新版
- 新增：i18n、种子系统、撤销、矩阵导入、PRNG、求解器
- 用户反馈：**安装两个版本后感受不到区别**

**用户感受不到区别的原因分析：**
1. v1.2.0 的核心新增是求解器，但求解器是**隐藏功能**——正常玩游戏时 `sol[]` 已有预存解法，永远不会触发 `universalSolver()`
2. i18n 默认语言从中文改为英文，但如果用户界面是中文则无感
3. 种子/导入/撤销等功能对纯游玩用户来说不是核心体验

---

## 三、项目总结文档阶段（5月30日）

### 3.1 需求：20 轮审查的 PROJECT_SUMMARY.md

**用户要求：** "编辑一份细节完整的 cross100 项目总结，对总结进行 20 轮检查是否有遗漏需要补充"

**执行过程：**
- 初版 825 行（16 个章节），通过 3 个子代理并行提取数据
- 第 1 轮审查：发现 **35 个问题**并全部修正
- 第 2 轮审查：发现 **6 个问题**，修正 4 个有意义的
- 第 3 轮审查：发现 **16 个问题**（主要集中在 HTML 结构树精度）
- 第 4-20 轮审查：分 3 个维度并行——行为准确性、跨章节一致性、最终抽查

**累计修正 55+ 个问题，主要类别：**

| 类别 | 数量 | 典型问题 |
|------|------|----------|
| 求解器代码不精确 | 6 | Math.floor → Math.round、贪心调度算法重写 |
| HTML 结构树细节 | 12 | 缺少 header/footer 包装、覆层子元素、按钮类名 |
| CSS 变量遗漏 | 8 | Pixel 主题缺 7 个变量、--sh 未记录 |
| i18n 键值表不完整 | 1 | 只列了 11 个键，实际 34 个 |
| 行为描述不准确 | 5 | 重力非主题相关、覆层关闭行为差异 |
| 交叉引用不一致 | 3 | 求解器代码两处写法不同、walkthrough 文件大小 |
| 死代码未标注 | 1 | `showStuck()` 从未被调用 |

**最终版本：** 850+ 行，4 次 git 提交，推送至 `865acb3`

---

## 四、独立求解器 APK 阶段（5月30日）

### 4.1 需求理解错误

**用户的原始需求：** "用相同的编程语言和 UI 制作一个单独的求解器 APK"

**我的错误理解：** 将求解器代码嵌入游戏本体的 `index.html` 中，作为 `crack()` 函数的内部功能。

**正确理解：** 用户要的是一个**完全独立的应用**——包名不同、APK 独立安装、专注于求解功能。

### 4.2 求解器 APK 开发

**新建文件结构：**
```
solver/
├── solver.html              # 独立页面（15KB）
├── AndroidManifest.xml      # 包名 com.cross100.solver
├── src/com/cross100/solver/MainActivity.java
├── assets/solver.html       # APK 内嵌资源
├── res/drawable/ic_launcher.png  # 复用游戏图标
└── build/                   # 编译产物
```

**功能设计：**
- 粘贴 10×10 数字矩阵 → 求解 → 文字列表输出步骤
- 加载 8 位十六进制种子 → 还原关卡 → 求解
- 双主题（Valley / Pixel），EN/CN 语言切换
- 输出格式：`Step 01, R 5 C 10`

### 4.3 APK 编译问题（共 3 个）

**问题 1：`android.jar` 路径错误**

```
error: Unable to find package java.lang in platform classes
```

**原因：** `$ANDROID_HOME` 环境变量未设置，`$ANDROID_HOME/platforms/android-34/android-34/android.jar` 路径不存在。

**解决：** 用 `find / -name "android.jar"` 定位实际路径：
```
/data/data/com.termux/files/home/android-sdk/platforms/android-34/android-34/android.jar
```

**问题 2：`debug.keystore` 路径错误**

```
java.io.FileNotFoundException: /data/data/com.termux/files/home/debug.keystore
```

**原因：** keystore 不在 `$HOME` 根目录。

**解决：** `find` 定位到 `/data/data/com.termux/files/home/tmp/debug.keystore`

**问题 3：APK 安装失败 — "安装包异常"（2 次）**

**第一次尝试：** APK 正常签名，但安装时提示"安装包异常"。

**排查过程：**
- 对比游戏 APK 和求解器 APK 的结构
- 发现：游戏 APK 的 `classes.dex` 在根目录，求解器 APK 的在 `dex/classes.dex` 子目录

**根因：** `aapt add solver.unsigned.apk dex/classes.dex` 将文件以 `dex/classes.dex` 路径添加到 APK 内部。Android 要求 `classes.dex` 必须在 APK 根目录。

**解决：** 先 `cp dex/classes.dex .`，再 `aapt add solver.unsigned.apk classes.dex`

**第二次尝试：** DEX 路径修正后仍安装失败，截图显示"版本号 null"。

**根因：** `aapt2 link` 命令未传 `--version-code` 和 `--version-name` 参数。虽然 AndroidManifest.xml 中有 `android:versionCode` 属性，但 aapt2 不会自动读取——必须通过命令行参数注入。

**解决：** 添加 `--version-code 1 --version-name 1.0.0` 参数。

### 4.4 UI 问题

**问题：** 页面底部有两个主题切换按钮（header 的 `#bt` + footer 的 `#bt2`）

**解决：** 移除 footer 的 `#bt2` 按钮及其相关 JS 事件绑定，只保留右上角的 `#bt`。

### 4.5 步骤排序问题

**问题：** 求解器输出的步骤按求解器的贪心调度顺序排列（按格子值降序），用户认为应该按 R、C 升序排列。

**示例期望：**
```
Step 01, R  1 C  1
Step 02, R  1 C  1
Step 03, R  1 C  2
Step 04, R  2 C  1
```

**解决方案：**
1. 求解器输出后，对步骤按 `(r, c)` 升序排序
2. **排序后模拟验证**——用排序后的步骤顺序执行，检查是否仍能清空网格
3. 若验证通过则使用排序结果，否则回退到原始顺序（理论上不会发生）

**数学依据：** 同一格子的多次点击可任意排列（操作的交换律），不同格子的操作在某些条件下也可交换。对于线性代数求解器产生的解，排序后几乎总是有效。

---

## 五、环境与工具问题汇总

| 问题 | 影响 | 解决方案 |
|------|------|----------|
| Termux 无 Android SDK | 无法编译 APK | 手动安装 aapt2/d8/apksigner + 定位 android.jar |
| ANDROID_HOME 未设置 | javac/d8/aapt2 找不到 android.jar | 硬编码绝对路径 |
| debug.keystore 位置非标准 | apksigner 签名失败 | find 定位后硬编码路径 |
| classes.dex 路径错误 | APK 安装异常 | 先复制到当前目录再 aapt add |
| 缺少 versionCode/versionName | APK 安装异常（版本号 null） | aapt2 link 添加 --version-code/--version-name |
| Gateway 前台进程频繁中断 | 任务丢失 | 改用 gateway install/start 后台服务 |
| index.html 与 apk/assets 不同步 | APK 版本落后 | v1.2.0 全量同步 |
| d8 警告 android.app.Activity 未找到 | 仅为 desugaring 警告，运行时正常 | 无需处理，--min-api 21 即可 |

---

## 六、需求变更时间线

| 时间 | 需求 | 结果 |
|------|------|------|
| 5月27日 | 检查 Harness engineering 环境 | 确认 javac/aapt2/d8/apksigner 可用 |
| 5月27日 | 更新 README 添加编译步骤 | 推送 `27c3fa2` |
| 5月27日 | 编辑完整项目总结 + 20 轮检查 | 850+ 行文档，55+ 处修正 |
| 5月30日 | v1.1.0 vs v1.2.0 对比报告 | 详细分析两者差异 |
| 5月30日 | **纠正需求理解**：求解器应该是独立 APK | 发现之前理解错误 |
| 5月30日 | 独立求解器 APK（文字步骤输出） | 编译完成，解决 3 个编译/安装问题 |
| 5月30日 | 移除多余 UI 按钮 | 保留右上角主题切换 |
| 5月30日 | 步骤按 R,C 升序排列 | 排序 + 模拟验证 |

---

## 七、关键教训

1. **APK 内 classes.dex 必须在根目录**——aapt add 时注意路径
2. **aapt2 link 需要 --version-code/--version-name**——XML 属性不够
3. **需求理解要确认**——"求解器"可以是游戏内置功能，也可以是独立应用，必须明确
4. **index.html 和 apk/assets/ 要同步**——避免版本漂移
5. **Termux 编译 Android APK 完全可行**——关键是找到正确的 android.jar 和 keystore 路径

---

*文档生成时间：2026-05-30*
