# 归藏 Page — 已知问题

## 未解决

### P0 — 阻塞使用

#### TOC 侧边栏遮挡内容
- **现象**：左侧目录导航打开后只能看到一半，遮挡了页面正文
- **尝试过的方案**：
  1. `.toc` 容器设 `pointer-events: none` → 无效
  2. `.toc` 容器设 `width:0; height:0; overflow:visible` → 无效
  3. toggle 按钮和 panel 各自 `position: fixed` → 仍然遮挡
- **可能原因**：容器的 stacking context 或 z-index 与页面 grid 冲突，需要用浏览器 DevTools 逐层排查
- **建议方向**：把 TOC 从 `.article` 容器内部移到 `<body>` 直接子元素，避免 grid 布局影响 fixed 定位

#### 设置和导出按钮不显示
- **现象**：右下角设置 FAB 和右上角导出按钮在渲染后的页面上不出现
- **确认点**：ui.js 代码已注入到 output HTML 中（grep 可搜到 `fab-btn`、`toc-toggle`、`exportWechat` 等关键字）
- **可能原因**：
  1. JS 初始化时机问题：ui.js 中的 DOM 操作在 DOMContentLoaded 前执行
  2. CSS z-index 被其他元素覆盖
  3. ui.css 样式未正确内联或加载
- **建议方向**：在浏览器 DevTools 中检查 DOM 是否有 `.fab-container` 和 `.share-bar` 元素，以及它们的 computed style

### P1 — 影响体验

#### 公众号导出的标题间距
- **现象**：章节标题与分割线之间的间距已修复（用 padding-top + br 撑高度），但部分场景下仍有异常
- **根因**：公众号编辑器对空白元素有复杂的折叠规则，不同版本可能表现不同
- **缓解方案**：当前用 `padding-top` + `font-size:0; line-height:0` 的 `<br>` 组合，大部分情况可行

#### PDF 导出样式丢失
- **现象**：部分背景色和 accent 色块在 PDF 中消失
- **已做**：CSS 中加了 `print-color-adjust: exact; -webkit-print-color-adjust: exact`
- **根因**：部分浏览器 print 模式默认不打印背景色，需要用户手动勾选"背景图形"
- **建议方向**：在导出 PDF 时弹出提示"请在打印对话框中勾选「背景图形」选项"

#### 连续分割线问题
- **现象**：pullquote 组件自带上下 border，section 也有 border-bottom，连续出现时会双线
- **已做**：CSS 中用 `.pullquote + .section-divider` 选择器去重；Swiss 模式改为几乎零线条
- **残留**：杂志风中某些组件组合下仍可能出现

## 已解决

### 公众号导出纯文本（无样式）
- **原因**：第一版用 `import()` 加载 html2canvas，`file://` 协议下被 CORS 拦截
- **修复**：改为 `<script>` 标签加载

### 公众号导出风格不一致
- **原因**：硬编码了公众号 Skill 的衬线/居中样式，导致瑞士风的蓝色卡片变成了暖色衬线
- **修复**：改为 `getComputedStyle()` 实时读取当前主题色值

### 公众号间距被折叠
- **原因**：公众号编辑器会折叠空的 `<section>` 元素
- **修复**：改用 `padding-top` 撑高度 + 内部放 `font-size:0; line-height:0` 的 `<br>`

### 中英混合标题
- **原因**：标题提取正则 `([一-鿿（）\w\s·&]+)$` 中 `\w` 匹配了英文字母
- **修复**：改为"找到第一个中文字符位置，从那里截取到末尾"

### 过多分割线（Swiss）
- **原因**：45 条 border 声明，每个组件都自带上下 border
- **修复**：重建线规则——瑞士风用卡片语言，几乎零线条

### 大编号与标题分离
- **原因**：数字在上、标题在下分两行，导致间距过大
- **修复**：改为 flex 容器 baseline 对齐，编号和标题同一行

### 高亮卡片竖排标签
- **原因**：初版用 CSS `writing-mode: vertical-rl` 侧标签
- **修复**：改为上下两行——上方横排 mono 标签、下方正文

### 间距过大（首屏无内容）
- **原因**：highlight margin 48px、pullquote 48px、section padding 64px 叠加
- **修复**：组件 margin 统一缩到 16px，section padding 缩到 32px

### 图片不渲染（显示灰色占位块）
- **原因**：render.mjs 把 `![alt](url)` 渲染为 `img-placeholder` 而非真正的 `<img>` 标签
- **修复**：改为直接输出 `<img src="..." loading="lazy">`，alt 以 `img_` 开头的不显示 caption

### Markdown 表格和代码块不渲染
- **原因**：render.mjs 完全缺少竖线表格、HTML 表格和围栏代码块的解析逻辑
- **修复**：新增三个解析器——Markdown 竖线表格、HTML `<table>` pass-through、` ``` ` 围栏代码块

### 高亮卡片加粗文字消失
- **原因**：深色背景的 highlight-card 里 `<strong>` 默认黑色，在黑底上不可见
- **修复**：两套 CSS 都加了 `.highlight-card strong, .highlight-card b, .highlight-card a { color: var(--fg-highlight) }`

### 单行 HTML 表格吞掉后续所有内容
- **原因**：`<table>...</table>` 在同一行时，HTML table handler 的 while 循环从下一行开始找 `</table>`，永远找不到，一直吞到文件末尾另一个无关 `</table>`
- **修复**：先检查 `<table>` 和 `</table>` 是否在同一行，如果是直接渲染，不进 while 循环

### Footnote 脚注糊成一团
- **原因**：每条脚注 200+ 字，li 之间只有 `--space-sm`（4px）间距
- **修复**：标题匹配 Footnote/脚注/注释 的 section 自动加 `section-footnote` class，字体缩到 0.8rem，li 间距加大，颜色降级

### 全英文文档设了 lang:"zh" 导致内容丢失
- **原因**：GLM-5.2 文章是全英文，但 annotations 里设了 `lang: "zh"`，语言过滤把非结构性的英文段落全部跳过
- **修复**：单语文档的 lang 应设为 `null`，SKILL.md Gotchas 已更新说明

## 后续功能规划

### Demo 容器
- 为 AI 生成的 HTML demo 套统一的外壳（顶栏标题+描述、device frame）
- Code + Preview 分栏视图
- 组件 showcase 页面

### 页面模板系统
- 不经过 annotations，直接从指令生成 HTML 页面
- 模板类型：产品落地页、API 文档、Changelog、项目介绍

### 设计 Token 文件
- 抽出轻量的变量文件（色板、字体、间距）
- 其他 Skill 或 AI 生成的页面 import 后即可"看起来跟归藏 Page 是一家的"
