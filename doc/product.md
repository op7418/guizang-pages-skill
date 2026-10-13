# 归藏 Page — 产品文档

## 定位

将文档、文章或笔记渲染为精排单页 HTML，支持导出 PDF 和长图。

**一句话理解**：PPT Skill 做演示，Page Skill 做阅读。

**设计哲学**：来自 Dia 浏览器设计师 Christine Røde ——"限制本身就是设计语言"。输出物的感觉是"你的助手帮你做了研究，带着这份草稿回来了"。

## 核心架构

```
Markdown 原文 ──→ annotations.json ──→ render.mjs ──→ output.html
 (全量保留)       (升格标注,几百token)  (确定性脚本)   (styled HTML)
```

**模型做判断，脚本做渲染。** 模型只输出一份标注 JSON（哪些行要升格为什么组件），不生成完整 HTML。渲染脚本拿着原始 markdown + 标注表做确定性转换。

这样做的好处：
- 省 token：标注 JSON 只需几百 token，而非全文 HTML 的数万 token
- 零删减：原文每一行都进入输出，不会被模型"总结"掉
- 风格解耦：同一份标注 JSON，换 CSS 即换风格

## 两种风格

| 风格 | 美学锚点 | 核心特征 |
|------|----------|----------|
| **杂志风 (Magazine)** | Monocle × 复印件 | 衬线标题 Noto Serif SC、暖灰底 `#f6f4f0`、赤褐色 accent `#c45a3c`、交叉线纹理、微圆角 3px |
| **瑞士风 (Swiss)** | Helvetica Forever × 信息设计 | 无衬线极细体 Inter 200、冷灰底 `#fafaf8`、克莱因蓝 `#002FA7`、卡片语言、直角 0px、网格点阵 |

关键差异：
- 杂志风用**线条**做分隔（细线、交叉线纹理）
- 瑞士风用**卡片和色块**做分隔（背景色、间距，几乎零线条）

## 两种模式

| 模式 | 用途 | 标注量 | 内容处理 |
|------|------|--------|----------|
| **忠实模式** | 文档排版 | 10-20 条 | 原文全量保留，少量升格 |
| **解释模式** | 知识可视化 | 40-60 条 | 原文保留 + 插入配图/信息图/提示卡 + 双语过滤 |

## 组件体系

### 页面级组件（自动生成）

| 组件 | 说明 |
|------|------|
| doc-chrome | 文档顶栏（类型/状态/作者/日期/阅读时长/标签） |
| hero | 主标题区（杂志风纯文字，瑞士风全宽底图+文字叠加） |
| section-header | 章节标题（大编号+标题文字） |
| TOC sidebar | 左侧目录导航 + scroll spy（仅 Swiss） |

### 内容升格组件（标注触发）

| 组件 | 触发模式 | 说明 |
|------|----------|------|
| pullquote | 独立强判断句 | 大字引用，accent 关键词高亮 |
| highlight | 核心定义/原则 | 全宽色块卡片 |
| def-card | `> **Term**：definition` | 术语定义卡片 |
| gallery | 3+ 并列案例 | 图片/卡片网格 |
| process | 有序步骤 | 步骤卡片列表 |
| checklist | 约束/规则列表 | 勾选列表 |
| big-number | 连续 3+ 统计数字 | 数字展示色块 |

### 解释模式专用组件

| 组件 | 说明 |
|------|------|
| figure | Unsplash 配图（全宽+图注） |
| embed | AI 生成的 SVG 信息图/UI 预览 |
| aside | 实践提示卡（灯泡图标+标题+正文） |
| summary-card | 速查网格（多卡片 auto-fill） |

### 数据组件

| 组件 | 说明 |
|------|------|
| table | markdown 表格渲染（瑞士风：黑底白字表头+隔行灰底） |
| chart | Chart.js 图表（CDN 加载，配色跟主题走） |

## 交互功能

### 设置面板（右下角 FAB）
- 配色切换：每种风格 3 组配色方案，点击色块即时切换
- 字体选择：每种风格 3 组字体方案

### 导出功能（右上角）
- **PDF**：`window.print()` + print CSS（小块不拆、长块可跨页、标题不落页尾），打印前提示勾选「背景图形」
- **长图**：html2canvas CDN，截图前自动隐藏 UI 元素
- ~~公众号排版~~：v0.8 移除。公众号编辑器兼容性太差，无法还原网页排版；需要发公众号请用 wechat-formatter

### 文本编辑
- 正文和标题 contenteditable，点击即进入编辑状态
- 装饰性内容（chrome、标签、图标）不可编辑

## 公众号导出（已移除）

v0.8 起删除公众号导出（`wechat-export.js` 与导出菜单入口）。原因：公众号编辑器会剥离 class/position/变量/自定义字体并折叠空元素，翻译后的版式无法还原网页效果。历史兼容规则见 git 历史（基线提交 7dccdc7）。

## 文件结构

```
html-skill/
├── SKILL.md                        # Skill 主入口（Agent 读取）
├── doc/
│   ├── product.md                  # 本文件：产品文档
│   ├── handover.md                 # 交接文档
│   └── known-issues.md             # 已知问题记录
├── assets/
│   ├── style-magazine.css          # 杂志风 CSS
│   ├── style-swiss.css             # 瑞士风 CSS
│   ├── ui.css                      # 设置/导出面板样式
│   ├── ui.js                       # 设置/导出/编辑逻辑
│   └── themes.json                 # 配色与字体选项（render.mjs 静态写入面板）
├── references/
│   ├── components.md               # 17 个组件的完整参考
│   └── design-rules.md             # 设计规则
└── scripts/
    └── render.mjs                  # 确定性渲染脚本
```

## 适用场景

- 文档排版：技术文章、产品文档、读书笔记
- 知识可视化：双语文档单语渲染、PRD 格式化
- 内容发布：网页阅读、PDF / 长图分享

## 不适用场景

- PPT 演示 → 用 guizang-ppt-skill
- 社交媒体卡片 → 用 guizang-social-card-skill
- 微信公众号排版 → 用 wechat-formatter（本 Skill 不再提供公众号导出）
