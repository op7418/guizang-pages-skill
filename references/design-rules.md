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
