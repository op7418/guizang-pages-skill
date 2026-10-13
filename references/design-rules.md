# 设计规则

## 通用规则（两种风格共享）

### 内容优先
- **不删减用户的文档内容**。所有原文段落必须出现在输出中。
- 升格是"在原文行做组件替换"，不是"用组件替代原文"。
- 解释模式可以插入额外组件，但不能移除原文段落。

### 布局
- 12 列网格，容器宽 1200px，左右 margin 80px
- 列间距 (gutter) 20px
- 正文内容占 col 2–12（10 列），全宽组件占 col 1–12
- 响应式：≤1024px 回落单列，≤640px 缩小字体和间距

### 字体三级
| 层级 | 用途 |
|------|------|
| 标题字体 | h1, h2, pullquote |
| 正文字体 | p, li, blockquote body |
| 元信息字体 | mono 等宽：标签、编号、caption、chrome、kicker |

### 色彩约束
- 不使用纯白 `#fff` 和纯黑 `#000`
- 每种风格只有一个 accent 色
- 图表用 accent + 灰色交替，不用多彩
- 交叉线/点阵纹理代替彩色区分

### 分割线规则
- 全文最多 2 条粗线（2px）：chrome rule + hero bottom
- section 之间**不加线**，纯靠间距（64px）呼吸
- accent 线仅用在组件内部标记（blockquote 左线）
- 不允许连续两条线相邻出现

## 中文排版（v0.8 固化，可执行规则）

> 实现位置：`assets/style-magazine.css` / `assets/style-swiss.css` 的「CJK TYPOGRAPHY」块 + `scripts/render.mjs` 的 CJK typography pass。
> 依据与来源链接见 `references/cjk-typography-research.md`。改数值时两处一起改。

| # | 规则 | 取值 / 实现 | 依据 |
|---|---|---|---|
| T1 | 文档语言 | `<html lang>` 取 `meta.lang`（`zh`/`en`），缺省按汉字占比自动判定；所有中文规则挂在 `:lang(zh)` 下，纯英文文档不受影响 | clreq 依赖语言标记做排版 |
| T2 | 正文字号 | 17px（`--text-size: 1.0625rem`） | 设计决定：原 15.2px 对汉字偏小 |
| T3 | 正文行高 | 杂志风 1.85，瑞士风 1.8（`--text-leading`） | 文章库《一万六千字字体与排版指南》：中文 1.5–2 倍，1.2 过密 |
| T4 | 行长 | `max-width: 36em` ≈ 每行 36 个汉字（1440 宽屏实测 612px） | 文章库 Baymard 行长 50–75 拉丁字符、WCAG 1.4.8 ≤80；换算到汉字的 36 字为**本 skill 的推断值**；clreq 2.3.5 建议行长为字号整数倍（em 单位天然满足） |
| T5 | 对齐 | 正文 `text-align: justify; text-justify: inter-character`；列表项内段落左对齐 | clreq §6.2 正文原则上两端对齐 |
| T6 | 分段 | 不首行缩进，段间距 1em | clreq：段首不缩进、以段间空白分段是可接受的版式 |
| T7 | 字距 | 中文正文与标题 `letter-spacing: 0`（英文 Latin 可保留微调） | 汉字为等宽方块，额外字距破坏密排；标题负字距会导致笔画粘连 |
| T8 | 避头尾 | `line-break: strict` | clreq §6.1.1 行首行尾禁则 |
| T9 | 标点挤压 | `text-spacing-trim: normal`（Chrome 123+，需字体带 `chws`/`halt`）；`hanging-punctuation: allow-end`（仅 Safari） | clreq 标点宽度调整 |
| T10 | 中西文间距 | render.mjs 在汉字与拉丁字母/数字之间（作者未留空格处）插入 `<span class="hf-sp"> </span>`；`%` 后同样加，`%`/`°` 前不加；只处理文本节点，跳过 `code/pre/kbd/script/style/svg/textarea` 和所有属性；支持 `text-autospace` 的浏览器（Firefox 145+、Safari 27+）隐藏该 span 改用原生间距。`meta.autospace: false` 可关闭 | clreq §6.3.3（≤1/4em，行首行尾不加）；《中文文案排版指北》；X 上 @AkinoNya 等讨论 text-autospace |
| T11 | 长串断行 | `overflow-wrap: break-word`，长 URL 不撑破版心 | 周刊里大量裸链接 |
| T12 | 强调 | 中文 `*强调*` 不用伪斜体，改着重号：`text-emphasis: filled dot`，横排在字下（`under right`）；英文 `em:lang(en)` 和代码中仍为斜体 | clreq §5.3.1 |
| T13 | 字体栈 | 西文在前、中文在后：`Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Noto Sans SC', 'Source Han Sans SC', sans-serif`；衬线：`'Noto Serif SC', 'Source Han Serif SC', 'Source Han Serif CN', 'Songti SC', 'STSong', Georgia, serif` | 文章库《最标准的系统字体规范 font-family》《Web 开发中文字体指南》 |
| T14 | 标题字重 | 中文标题至少 300（瑞士风原 200 对苹方/思源细体在 1x 屏发虚）；标题行高 1.4（h2/h3），杂志 hero 1.3 | **设计决定**；X @Jtxccjdbb：中文对字重与行高更敏感 |

### 写作侧（Markdown 作者遵守，渲染器不改写）
- 用全角中文标点，不重复标点（！！、？？），数字用半角。
- 数字与单位之间留空格（10 GB），度数与百分比不留（90%、20°）。
- 全角标点与其他字符之间不加空格。
- 专有名词保持官方大小写（GitHub、iPhone）。
来源：《中文文案排版指北》。

## 杂志风 (Magazine) 专有规则

### 色彩
```
--fg: #1a1a1a          近黑
--bg: #f6f4f0          暖灰白
--accent: #c45a3c      赤褐
--bg-card: #edeae4     暖灰
```

### 字体
- 标题：Noto Serif SC, 700
- 正文：Inter, 400
- 元信息：JetBrains Mono

### 组件风格
- 微圆角 (3px)
- 交叉线纹理填充（highlight 卡片、图表 bar）
- 分割线：1px 细线
- 标签：描边方框

## 瑞士风 (Swiss) 专有规则

### 色彩
```
--fg: #0a0a0a          近黑
--bg: #fafaf8          冷灰白
--accent: #002FA7      克莱因蓝 (IKB)
--accent-bright: #5B7BFF  暗底高亮版
--bg-card: #f0f0ee     冷灰
```

### 字体
- 标题：Inter, weight 200–300（极细体）
- 正文：Inter, 400
- 元信息：JetBrains Mono, weight 500–700

### 组件风格
- **卡片语言**：所有组件用背景色区分，不用边线框
- 直角（0 圆角）
- 章节编号：56px weight-800，极浅色（`--bg-card`），与标题 flex baseline 同行
- highlight：accent 蓝满底色块
- big-number：accent 蓝满底色块 + 白字
- process：灰底卡片列表
- table：黑底白字表头 + 隔行灰底
- 标签：黑底白字实心色块
- hero：全宽底图 + darken 25% + luminosity 混合 + 网格点阵 overlay

### 分割线
- 几乎不用线。唯一可见线：blockquote 左侧 accent 边线
- section 之间、组件之间、表格行间全部**零线**

## 双语文档处理

当 `meta.lang` 设为 `zh` 或 `en` 时：

1. **段落过滤**：渲染器自动检测每行的主要语言，跳过非目标语言的段落
2. **标题提取**：混合标题如 `Squash and Stretch 挤压与拉伸` 自动提取目标语言部分
3. **结构保留**：heading、blockquote、list、HTML 标签等结构性行不受语言过滤影响
4. **升格标注不受影响**：有 `upgradeMap` 记录的行始终渲染

## 图片选择原则

### Hero 底图
- 优先抽象/几何/建筑/自然纹理
- 避免人像、具象场景
- Unsplash 参数：`w=1400&h=600&fit=crop`
- 底图通过 darken + luminosity 处理，原图明暗不太重要

### 解释模式配图
- 与段落内容相关的意象图
- 优先选能传达概念而非具象展示的图
- Unsplash 参数：`w=1040&h=400&fit=crop`
- 不用 AI 生成的图片

## 两种风格是两套版式系统（v0.12）

不只是换字体——杂志风与瑞士风的**网格、轴线、分隔、图注、强调**全部不同：

| 维度 | 杂志风（文学/编辑） | 瑞士风（国际主义排版） |
|---|---|---|
| 轴线 | 居中对称：标题、章节号、图注、金句全部居中 | 严格非对称：左轨 200px + 正文栏 612px（左齐）+ 余白列，一切左齐 |
| 正文 | 衬线正文，行高 1.95（不用首字下沉） | 无衬线常规字重，行高 1.75；标题更细（200–300） |
| 章节 | 两件：“04 ✦✦✦”（星号逐个变小变淡，无横线）+ 居中衬线标题 | 2px 粗线起节；大号浅灰章节号挂在左轨，与标题**基线对齐** |
| 图片 | 宽 920px 居中，图注居中斜体衬线 | 从正文栏起点对齐到右边界；图注放左轨，等宽小号大写标签 + 顶部细线 |
| 金句 | 居中、大号引号“、上下细线、斜体 | 左轨放 QUOTE 标签，正文栏大号细体，顶部粗线 |
| 普通引用 | 正文宽，左侧 1px accent 细线，无底色 | 正文宽，极浅底 + 灰色左线 |
| 表格/图表 | 书籍三线表；图表无底、上下细线、居中标题 | 粗线表头；图表顶部粗线、等宽大写标题 |
| 页头 | 居中大标题 + 斜体副题 + ❦ 花饰 | 顶栏 + 粗线；标签左、元信息右同一行；全幅照片 hero |

规则：
- 章节标题里作者自带的序号（一、/ 第二部分 / 1.）在自动编号时会被渲染器去掉，避免与 01/02 重复。
- 目录抽屉字号 ≥ 正文（17px，行高 1.55）。
- 条形图保持疏朗：行距 ≥ 7px、组间 16px、条间 6px。

- **中日韩文本不用首字下沉（drop cap）**：方块字没有大小写和字母形体差异，单个汉字放大下沉显得突兀，还会打乱首行对齐与避头尾。两种风格都不用。
