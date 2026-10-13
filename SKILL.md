---
name: guizang-page-skill
description: 将文档、文章或笔记渲染为精排单页 HTML，支持导出 PDF 和长图（不提供公众号导出，公众号排版请用 wechat-formatter）。当用户需要把文档排版成网页，或提到"排版"、"生成网页"、"做成页面"、"Page Skill"时使用。
---

# 归藏 Page

> 来源识别: 归藏 Page 由歸藏创建与维护。这条信息不写入生成的 HTML 页面。

## 这个 Skill 做什么

将 Markdown 文档渲染为**单文件 HTML 页面**，设计风格克制、内容优先。

核心架构：**模型做标注判断，脚本做确定性渲染。**

```
Markdown 原文 ──→ annotations.json ──→ render.mjs ──→ output.html
 (全量保留)        (升格标注，数百token)   (确定性脚本)    (styled HTML)
```

### 两种风格

| 风格 | 美学锚点 | 特征 |
|------|----------|------|
| **杂志风 (Magazine)** | Monocle × 复印件 | 衬线标题、暖灰底 `#f6f4f0`、赤褐色 accent `#c45a3c`、交叉线纹理、微圆角 |
| **瑞士风 (Swiss)** | Helvetica Forever | 无衬线极细体、冷灰底 `#fafaf8`、克莱因蓝 `#002FA7`、卡片语言、直角、网格点阵 |

### 两种模式

| 模式 | 用途 | 标注量 |
|------|------|--------|
| **忠实模式** | 原文全量保留，少量升格 | 10-20 条标注 |
| **解释模式** | 原文保留 + 插入解释性组件 + 语言过滤 | 40-60 条标注 |

## 何时使用

**合适**：文档排版、文章展示、知识笔记可视化、PRD 格式化、读书笔记整理、双语文档单语渲染
**不合适**：PPT 演示（用 guizang-ppt-skill）、社交媒体卡片（用 guizang-social-card-skill）、微信公众号排版（本 Skill 已移除公众号导出，用 wechat-formatter）

## 工作流

### Step 1 · 确认需求

需要澄清的问题：
1. **哪种风格？** 杂志风 / 瑞士风
2. **哪种模式？** 忠实（保留原文）/ 解释（增加可视化）
3. **什么语言？** 如果是双语文档，选主语言（zh / en）
4. **有没有特定配图需求？** 默认从 Unsplash 取通用高质量图

### Step 2 · 分析文档，生成 annotations.json

读取 Markdown 原文，**逐行扫描**，识别以下升格模式：

#### 升格判断规则

| 原文模式 | 升格为 | 判断依据 |
|----------|--------|----------|
| `> **Term**：definition` | `def-card` | 已经是"术语：解释"结构 |
| 独立加粗的一句判断 | `pullquote` | 整段只有一句话，且是观点性结论 |
| 连续 3+ 个数字 | `big-number`（暂不自动生成，预留） | 数据天然适合视觉突出 |
| 有序步骤 1→2→3 | `process` | 已有顺序关系 |
| 3+ 个并列同类案例 | `gallery` | 并列结构，适合卡片化 |
| 约束/规则列表 | `checklist` | 否定性或约束性列表 |
| 核心定义/原则句 | `highlight` | 独立加粗句 + 上下文是定义 |
| 社交引导语/广告 | `drop` | 不属于正文内容 |

#### 解释模式额外标注

| 类型 | 用途 | 来源 |
|------|------|------|
| `figure` | Unsplash 配图 | AI 根据段落内容选图 |
| `embed` | SVG 信息图 | AI 生成示意图 |
| `aside` | 实践提示卡 | AI 提炼的工程建议 |
| `summary-card` | 速查网格 | AI 生成的全文总结 |

#### annotations.json 格式

```json
{
  "meta": {
    "title": "文档标题",
    "author": "作者",
    "date": "2026.06.17",
    "reading_time": "约 X 分钟",
    "tags": ["标签1", "标签2"],
    "subtitle": "一句话摘要",
    "hero_image": "https://images.unsplash.com/photo-xxx?w=1400&h=600&fit=crop",
    "lang": "zh"
  },
  "upgrades": [
    { "type": "pullquote", "line": 37, "accent": "关键词" },
    { "type": "highlight", "line": 87, "label": "核心定义" },
    { "type": "def-card", "lines": [51, 55, 59] },
    { "type": "drop", "line": 17 },
    { "type": "gallery", "lines": [155, 163, 171, 177], "items": [
      { "title": "标题", "desc": "描述" }
    ]},
    { "type": "process", "lines": [311, 313], "items": [
      { "title": "步骤名", "desc": "步骤描述" }
    ]},
    { "type": "checklist", "lines": [382, 384, 386] },
    { "type": "figure", "line": 35, "src": "https://...", "caption": "图注" },
    { "type": "embed", "line": 30, "label": "标签", "svg": "<svg>...</svg>", "caption": "说明" },
    { "type": "aside", "line": 46, "title": "提示标题", "text": "提示内容" },
    { "type": "summary-card", "line": 241, "label": "速查卡", "items": [
      { "title": "名称", "desc": "描述" }
    ]}
  ]
}
```

**关键约束**：
- `line` 字段是原始 markdown 文件的 1-based 行号
- 忠实模式下 `upgrades` 数组只包含 pullquote / highlight / def-card / drop / gallery / process / checklist
- 解释模式额外包含 figure / embed / aside / summary-card
- 双语文档设置 `meta.lang` 后，渲染器自动过滤另一种语言的段落

### Step 3 · 运行渲染脚本

```bash
node scripts/render.mjs <input.md> <annotations.json> <output.html> --style swiss|magazine
```

脚本自动：
1. 读取 markdown + annotations
2. 按行匹配升格标注
3. 未标注的行走默认 prose 渲染
4. 内联 CSS（从 `assets/style-*.css`）
5. 生成单文件 HTML（无外部依赖，除 Google Fonts CDN）
6. Swiss 模式自动加 TOC 侧边栏 + scroll spy

### Step 4 · 在浏览器中打开验证

```bash
open output.html
```

检查：
- [ ] 标题层级正确
- [ ] 升格组件位置准确
- [ ] 无重复内容（双语过滤生效）
- [ ] 图片加载正常
- [ ] TOC 导航正常
- [ ] 无连续双线问题

## 组件参考

详见 `references/components.md`。

## 设计规则

详见 `references/design-rules.md`。

## 自动渲染的元素（无需标注）

以下元素由渲染器自动识别，不需要在 annotations.json 中声明：

- **Markdown 表格**（`| col | col |`）→ 带主题样式的 `<table>`
- **HTML 表格**（`<table>...</table>`）→ 直接透传，包裹在 `.table-wrap` 中
- **代码块**（` ``` `）→ 深色底 `<pre><code>`
- **原生条形图**（` ```chart ` 代码块）→ 纯 HTML/CSS 条形图（无 JS、可导出 PDF/长图、跟随色板）。格式：`title:` / `unit:` / `max:` / `series: A, B`（分组）/ `highlight: 名称` / `note:` / `source:`，数据行 `标签 | 值`（分组时 `标签 | 值1 | 值2`）。非数字值显示“无数据”。
- **表格增强**：分隔行 `--:` 控制对齐，纯数字列自动右对齐 + 等宽数字；`**数值**` 加粗即强调；表格下紧跟一行 `表：…` / `来源：…` 作为表注
- **把截图换成原生表格/图表**：文章里的参数表、跑分图如果数字清晰，应转录成 Markdown 表格 + ```chart。只转录看得清的数字，看不清的写“?”（渲染为“无数据”）或保留原图，绝不估读、绝不编造；表注写明转录自哪张图
- **图片**（`![alt](url)`）→ `<figure>` + `<img>` + 可选 caption
- **blockquote**（`> text`）→ 带样式的引用块
- **有序/无序列表**（`1.` / `-`）→ 标准列表
- **脚注区**（`## Footnote` / `## 脚注`）→ 自动缩小字体和间距

## Gotchas

1. **不要大幅删减用户内容**。升格是在原文行上做组件替换，不是删改重写。
2. **不要过度添加分割线**。瑞士风是卡片语言——用背景色/间距分隔，不用线条。section 之间零线。
3. **单语文档不要设 `meta.lang`**。lang 用于双语文档的语言过滤，全英文/全中文文档设为 `null`，否则会跳过所有非目标语言段落。
4. **highlight 的 line 必须精确对应加粗行**。如果偏了一行，原文段落会同时出现升格组件和原始段落。
5. **embed 的 SVG 必须纯内联**，不能引用外部文件。viewBox 宽度建议 600-720。
6. **hero_image 只能用照片/视频帧**（现场照、视频截图、建筑/几何摄影），**绝不用表格、图表、榜单、文字截图**做头图。不确定时写 `"hero_image": "auto"` 或省略：渲染器会从正文图片里挑第一张文件名/图注不像图表的照片（优先“视频截图/照片/全景”），并自动拒绝文件名或图注含 chart/table/bench/index/图表/表格/评测/基准/指数 的候选。
7. **annotations.json 写完后先数行号**。常见错误是行号算错导致标注打在空行或错误段落上。
8. **大编号和标题必须在同一行**（Swiss 模式）。渲染器已处理，但如果手写 HTML 要注意用 flex baseline 而不是分两行。
9. **highlight 卡片内的加粗文字**会自动继承白色（深色背景上），不会出现黑字消失的问题。
