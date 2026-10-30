# Guizang Page Skill · 网页排版 / 精排阅读页

![GitHub stars](https://img.shields.io/github/stars/op7418/guizang-pages-skill?style=flat-square)
![License](https://img.shields.io/github/license/op7418/guizang-pages-skill?style=flat-square)
![Skill](https://img.shields.io/badge/Skill-Agent-111111?style=flat-square)
![HTML Page](https://img.shields.io/badge/HTML-Page-0A7CFF?style=flat-square)
![Claude Code](https://img.shields.io/badge/Claude%20Code-Supported-6B5B95?style=flat-square)
![Codex](https://img.shields.io/badge/Codex-Supported-222222?style=flat-square)

一个适配 Claude Code、Codex 等 Agent 环境的排版 Skill，能把 Markdown 文档、文章或笔记排成**精排单页 HTML**，也可以导出 PDF 和长图。

> PPT Skill 做演示，Page Skill 做阅读。由 [歸藏](https://x.com/op7418) 创建与维护。

## 30 秒开始

```bash
npx skills add https://github.com/op7418/guizang-pages-skill --skill guizang-page-skill
```

也可以直接把这段话发给有 shell 权限的 AI Agent：

```text
帮我安装 guizang-page-skill。请把 https://github.com/op7418/guizang-pages-skill 克隆到 ~/.claude/skills/guizang-page-skill，安装完成后检查 SKILL.md、assets/、scripts/、references/ 是否存在。
```

已经安装过的话，用这段话更新：

```text
帮我更新 guizang-page-skill。请进入 ~/.claude/skills/guizang-page-skill 执行 git pull，然后告诉我当前最新 commit。
```

装好后可以直接对 Agent 说：

```text
帮我把这篇文章排成杂志风网页，忠实模式，保留原文。
把这份 Markdown 笔记做成瑞士风页面，用解释模式加配图和速查卡。
把这个页面导出成 PDF 和 1440 宽的长图。
```

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
| 杂志风 `magazine` | Monocle × 复印件 | 衬线标题、米白纸色、墨色为主、细线分隔 |
| 瑞士风 `swiss` | Helvetica Forever | 无衬线细体、冷灰底、单一锚点色、卡片语言、直角、左侧目录 |

配色和 [PPT](https://github.com/op7418/guizang-ppt-skill)、[图文卡片](https://github.com/op7418/guizang-social-card-skill) skill 共用同一套主题：杂志风 6 套（含深色午夜墨），瑞士风 4 套，见 [`references/themes.md`](references/themes.md)。用户给了品牌色时，渲染器按色彩科学把它收进风格允许的范围，生成受约束的品牌主题，不直接用原色。读者可以在页面右下角切换配色和字体。

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

### 方式一：一行命令安装（推荐）

```bash
npx skills add https://github.com/op7418/guizang-pages-skill --skill guizang-page-skill
```

### 方式二：手动命令行

```bash
git clone https://github.com/op7418/guizang-pages-skill.git ~/.claude/skills/guizang-page-skill
```

渲染需要 Node.js 18 或更高版本，不需要装依赖。把字体内置进页面（`--embed`）、导出 PDF 和长图时，先在 skill 目录装一次依赖；导出还需要本机有 Chrome 或 Chromium：

```bash
cd ~/.claude/skills/guizang-page-skill && npm install
```

## 使用

在对话里提到“排版”“生成网页”“做成页面”或“Page Skill”，Agent 就会按 [`SKILL.md`](SKILL.md) 的流程工作：确认风格和模式，生成标注，渲染页面，再检查结果。

也可以直接运行脚本：

```bash
# 渲染（--theme 选配色，--brand 用品牌色，--embed 内置字体）
node scripts/render.mjs input.md annotations.json output.html --style swiss
node scripts/render.mjs input.md annotations.json output.html --style magazine --theme forest-ink --embed

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
assets/               设计系统样式（gz-*.css，生成）、两套风格 CSS、配色与字体选项（themes.json，生成）、页面设置面板
references/           组件参考、设计规则、中文排版研究
doc/                  产品文档、交接说明、已知问题
```

## 贡献

排版问题、新组件需求，欢迎开 Issue 或 PR。新增设计规则请同步写进 `references/design-rules.md`，已知问题记录在 `doc/known-issues.md`。

主题、字号角色、字体和间距来自共享设计系统：`assets/gz-*.css`、`assets/themes.json`、`references/themes.md` 和 `scripts/gz-*.mjs` 是生成的，不要手改；新主题色或字号调整请提 Issue。`assets/style-*.css` 只写版式，颜色用语义变量，不写颜色值。

## License

AGPL-3.0 © 2026 [op7418](https://github.com/op7418)
