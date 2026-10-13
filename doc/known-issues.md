# 归藏 Page — 已知问题

## 未解决

### P2
#### PDF 个别页底部仍有留白（≤ 0.42 页）
- **现象**：标题与紧随的大图被 `break-after: avoid` 绑在同一页时，前一页底部留白
- **数据**（Chrome A4，排除末页）：示例文章杂志风最大 0.20、瑞士风 0.42；192 期周刊 0.31 / 0.38
- **说明**：这是「标题不落单」的有意代价；把图片上限压到 100mm 测过，没有改善
#### Chrome 下中西间距靠渲染器插空格
- Chrome/Edge 不支持 `text-autospace`，由 render.mjs 插 `.hf-sp`；手写 HTML 片段（components 里的 raw HTML）不经过这一步
#### 标点挤压依赖字体
- `text-spacing-trim` 只在 Chromium 且字体带 `chws`/`halt` 时生效；Safari/Firefox 无效
#### 无 JS 时设置/导出按钮可见但不可用
- 按钮现在静态写进 HTML，但交互仍依赖 ui.js

## 已解决（v0.8，2026-10-13）

### TOC 侧边栏遮挡内容
- **原因**：TOC 打开时正文不让位，窄屏也没有遮罩/关闭逻辑
- **修复**：>1024px 打开时 `body` 左移 300px；≤1024px 改抽屉 + `.toc-scrim`，Esc/点遮罩关闭；1440/1280 宽实测零重叠
### 设置和导出按钮不显示
- **原因**：按钮由 ui.js 运行时注入，JS 未执行即无按钮；render.mjs 读不到资源文件时静默跳过
- **修复**：按钮标记静态写入 HTML；缺资源直接报错退出；z-index 提到 1000
### 衬线主题（杂志风）换色无变化
- **原因**：杂志风几乎没有元素使用 `--accent`，换色只改到 1 个元素；Playfair 字体查询串错误加载失败
- **修复**：新增 ACCENT CARRIERS（编号、引用线、列表符号、卡片、pullquote、链接下划线…），实测换色改到 27 个元素；字体查询统一放 `assets/themes.json`
### PDF 大片空白
- **原因**：`.hero, .section { break-inside: avoid }` 让整节内容不可拆分，一节放不下就整页跳过
- **修复**：去掉整节不拆分，只对小块/figure 防拆分；标题 `break-after: avoid`；`@page` A4；图片限高 120mm；导出前提示勾选「背景图形」；lazy 图片打印前转 eager
- **数据**：最大底部留白 0.90 → 0.20（杂志）、0.79 → 0.42（瑞士）
### 公众号导出
- 按需求整体移除（`wechat-export.js`、菜单项、文档）
### 连续分割线 / `---` 漏成文字
- **原因**：Markdown 的 `---` 没被解析，作为 `<p>---</p>` 原样显示；pullquote 与 divider 相邻时双线
- **修复**：`---/***/___` 渲染为 `hr.divider`；节首节尾、pullquote 后、连续 divider 自动隐藏；瑞士风 divider 只留间距
### 长图导出失败（v0.8 回归，已修）
- **原因**：新加的 `color-mix()` 被 html2canvas 解析失败
- **修复**：改用纯 `var(--accent)`；规则：样式表里不要用 `color-mix()/oklch()/color()`
### 中文排版无统一规则
- **修复**：见 `references/design-rules.md` §中文排版 T1–T14 与 `references/cjk-typography-research.md`


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
