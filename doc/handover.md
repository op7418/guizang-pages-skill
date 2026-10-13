# 归藏 Page — 交接文档

## 项目背景

歸藏原本准备发布微信公众号排版 Skill，看到 Dia 浏览器设计师 Christine Røde 的帖子后，认为值得一个更大命题：**如何用克制但可视化的方式展示文档和输出**。

于是把微信排版、PPT 和社交卡片三个 Skill 的能力和设计经验统一到了一个新项目中。

## 已完成工作

### v0.1 — 基础渲染系统
- 设计了"升格标注"架构：模型只输出 annotations.json，脚本做确定性渲染
- 用歸藏的 Skills 万字长文做第一个 demo
- 实现了 17 个组件的渲染
- 杂志风和瑞士风两套 CSS

### v0.2 — 布局系统
- 从 680px 单列改为 1200px + 12 列网格
- 左右各 80px margin，20px gutter
- 正文 col 2-12，全宽组件 col 1-12
- 章节编号从独立行改为与标题同行 flex baseline 对齐

### v0.3 — 瑞士风重做
- 从"线条语言"改为"卡片语言"——所有分隔用背景色和间距，不用线条
- Hero 改为全宽底图卡片（darken + luminosity + 网格点阵 overlay）
- 高亮卡片改为蓝色满底色块 + 上标签下正文（之前是竖排侧标签）
- 大编号回归但与标题同行，颜色极浅不抢正文

### v0.4 — 解释模式 + 双语处理
- 新增 figure（Unsplash 配图）、embed（SVG 信息图）、aside（提示卡）、summary-card（速查网格）
- 双语文档支持：`meta.lang` 字段，自动过滤非目标语言段落
- 中文标题提取正则：找到第一个中文字符后截取，而非匹配 `\w`
- 用动画 12 原则文章做了完整的解释模式 demo

### v0.5 — 交互功能
- 右下角设置面板：配色切换（3 组）+ 字体选择（3 组）
- 右上角导出：PDF / 长图（html2canvas）/ 公众号排版
- 文本 contenteditable 点击编辑
- TOC 左侧目录 + scroll spy
- 所有 emoji 图标替换为 Lucide SVG 内联图标

### v0.6 — 公众号导出器
- 第一版直接硬编码了公众号 Skill 的视觉样式，被歸藏指出应只借技术写法
- 重写为 `getComputedStyle()` 实时读取当前主题色值，保持视觉一致
- 调研了公众号 HTML/CSS 兼容性，确定了不可用属性列表
- 间距问题：空 section 在公众号被折叠 → 改用 `padding-top` + `<br>` 撑高度

### v0.7 — 命名定稿
- HyperFrames → guizang-page-skill
- 口碑传播名：**归藏 Page**
- 定位参考 PPT Skill："名字即场景"——Page 就是一个页面

## 核心设计决策记录

### 1. 为什么用"升格标注"而非直接生成 HTML？

**背景**：用户不希望文档内容被大幅删减，同时模型生成全文 HTML 会消耗大量 token。

**决策**：模型只输出一份标注 JSON（几百 token），标记哪些行需要升格为什么组件。渲染脚本拿着原始 markdown + 标注做确定性转换。

**效果**：原文零删减 + 极低 token 消耗 + 风格可切换。

### 2. 为什么瑞士风是"卡片语言"？

**背景**：第一版瑞士风只是换了配色，所有组件形态和杂志风完全一样。歸藏指出没有体现瑞士风的特征。

**决策**：瑞士风组件用背景色/色块做分隔，几乎不用线条。highlight 是蓝色满底色块，def-card 是左右分栏灰底卡片，process 是灰底卡片列表。

**之前的错误尝试**：
- 竖排侧标签 → 阅读体验差
- 过多分割线 → 一屏七八根线
- 大编号与标题分两行 → 间距过大，编号悬空

### 3. 为什么公众号导出用 getComputedStyle？

**背景**：第一版硬编码了公众号 Skill 的中文衬线风格，导致瑞士风导出变成了另一套完全不同的视觉。

**决策**：用 `getComputedStyle()` 在导出时实时读取页面上的实际样式值，确保公众号输出和网页版视觉一致。只借公众号 Skill 的三个技术规则（inline style / span leaf / section 代替 div），不借视觉。

### 4. 为什么叫"归藏 Page"而非"Artifact"？

**背景**：PPT Skill 爆火的核心原因是"名字即场景"——用户不需要思考能干什么。

**决策**："Artifact"是技术圈黑话（来自 Claude Artifacts），普通用户不懂。"Page"跟"PPT"一样，所有人都懂——就是一个页面。跟 PPT Skill 形成系列感：PPT 做演示，Page 做阅读。

## 技术栈

- **渲染脚本**：Node.js ESM（render.mjs）
- **图表**：Chart.js 4.x（CDN：cdn.jsdelivr.net）
- **长图截图**：html2canvas（CDN：cdn.jsdelivr.net）
- **图标**：Lucide 内联 SVG（无 CDN 依赖）
- **字体**：Google Fonts CDN（Inter、Noto Serif SC、JetBrains Mono、Playfair Display）

## 文件目录

```
html-skill/
├── SKILL.md                 # Agent 入口
├── doc/                     # 文档
│   ├── product.md           # 产品文档
│   ├── handover.md          # 本文件
│   └── known-issues.md      # 已知问题
├── assets/
│   ├── style-magazine.css   # 杂志风 CSS（含 print 样式）
│   ├── style-swiss.css      # 瑞士风 CSS（含 print 样式）
│   ├── ui.css               # UI 面板样式
│   ├── ui.js                # 设置/导出/编辑逻辑
│   └── wechat-export.js     # 公众号格式翻译器
├── references/
│   ├── components.md        # 17 个组件参考
│   └── design-rules.md      # 设计规则
└── scripts/
    └── render.mjs           # 确定性渲染脚本
```

## 相关资源

| 资源 | 路径 |
|------|------|
| 项目讨论和演示产物 | `/Users/guohao/Documents/op7418的仓库/项目/hyperframes/` |
| PPT Skill（视觉参考） | `~/.claude/skills/guizang-ppt-skill/` |
| 公众号 Skill（技术参考） | `~/.claude/skills/wechat-formatter/` |
| 社交卡片 Skill（布局参考） | `/Users/guohao/Documents/code/HyperFrames-test/guizang-social-card-skill/` |
| 记忆文件 | `~/.claude/projects/.../memory/guizang-page-skill.md` |
