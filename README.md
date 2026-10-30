# 归藏 Page Skill

把 Markdown 文档、文章或笔记排成**精排单页 HTML**，也可以导出 PDF 和长图。

> PPT Skill 做演示，Page Skill 做阅读。

由 [歸藏](https://x.com/op7418) 创建与维护。

## 工作原理

**模型负责判断，脚本负责渲染。**

```
Markdown 原文 ──→ annotations.json ──→ render.mjs ──→ output.html
 (全量保留)        (升格标注，数百 token)  (确定性脚本)    (单文件 HTML)
```

模型不会重写整篇 HTML，只输出一份标注 JSON，说明哪几行要升格成哪种组件（引用、定义卡、流程、清单等）。原文每一行都会进入最终页面，不会被删减或改写，而且同一份标注换一套 CSS 就能换风格。

## 两种风格

| 风格 | 美学锚点 | 特征 |
|------|----------|------|
| 杂志风 `magazine` | Monocle × 复印件 | 衬线标题、暖灰底、赤褐色强调色、细线分隔 |
| 瑞士风 `swiss` | Helvetica Forever | 无衬线细体、冷灰底、克莱因蓝、卡片语言、直角、左侧目录 |

## 两种模式

| 模式 | 用途 | 标注量 |
|------|------|--------|
| 忠实模式 | 保留原文，少量升格 | 10–20 条 |
| 解释模式 | 在原文基础上插入配图、SVG 信息图、提示卡和速查卡 | 40–60 条 |

## 中文排版

- 正文窄栏居中（每行 30–32 字），图片和强调组件可以更宽
- 高对比度
- 中文不用斜体，不用首字下沉
- 来源和链接不做两端对齐，裸 URL 自动转成短链接显示
- 移动端页头不溢出、不重叠

详细规则见 [`references/design-rules.md`](references/design-rules.md) 和 [`references/cjk-typography-research.md`](references/cjk-typography-research.md)。

## 安装

把这个仓库放进你所用 Agent 的 skills 目录，比如 Claude Code：

```bash
git clone https://github.com/op7418/guizang-pages-skill.git ~/.claude/skills/guizang-page-skill
```

渲染需要 Node.js 18 或更高版本。导出 PDF 和长图还要装 Chrome 或 Chromium，以及 `puppeteer-core`：

```bash
cd ~/.claude/skills/guizang-page-skill && npm i puppeteer-core
```

## 使用

在对话里提到“排版”“生成网页”“做成页面”或“Page Skill”，Agent 就会按 [`SKILL.md`](SKILL.md) 的流程工作：确认风格和模式，生成标注，渲染页面，再检查结果。

也可以直接运行脚本：

```bash
# 渲染
node scripts/render.mjs input.md annotations.json output.html --style swiss

# 导出 PDF（A4）和全页长图
node scripts/export.mjs output.html --pdf output.pdf
node scripts/export.mjs output.html --png output.png --width 1440
```

渲染器会自动处理 Markdown 表格、代码块、图片、引用、列表、脚注，以及用 ` ```chart ` 写的纯 HTML/CSS 条形图。

## 不适合的场景

- PPT 演示：请用 guizang-ppt-skill
- 社交媒体卡片：请用 guizang-social-card-skill
- 微信公众号排版：请用 wechat-formatter

## 目录结构

```
SKILL.md              Agent 使用说明（工作流、标注格式、注意事项）
scripts/render.mjs    Markdown + 标注 → 单文件 HTML
scripts/export.mjs    HTML → PDF / 长图
assets/               两套风格 CSS、配色主题、页面设置面板
references/           组件参考、设计规则、中文排版研究
doc/                  产品文档、交接说明、已知问题
```
