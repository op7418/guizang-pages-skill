#!/usr/bin/env node
/**
 * 归藏 Page Renderer
 *
 * Reads a markdown file + annotations.json → outputs a single styled HTML file.
 * The markdown content flows through UNCHANGED except at annotated lines,
 * where standard prose is "upgraded" to richer visual components.
 *
 * Usage: node render.mjs <input.md> <annotations.json> <output.html> [--style swiss|magazine]
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { resolve, dirname } from 'path';

const args = process.argv.slice(2);
const styleIdx = args.indexOf('--style');
let styleName = 'magazine';
if (styleIdx !== -1) {
  styleName = args[styleIdx + 1] || 'magazine';
  args.splice(styleIdx, 2);
}
const [mdPath, annoPath, outPath] = args;
if (!mdPath || !annoPath || !outPath) {
  console.error('Usage: node render.mjs <input.md> <annotations.json> <output.html> [--style swiss|magazine]');
  process.exit(1);
}

const mdRaw = readFileSync(resolve(mdPath), 'utf-8');
const anno = JSON.parse(readFileSync(resolve(annoPath), 'utf-8'));

// ── Parse markdown into lines, extract YAML frontmatter ──
let lines = mdRaw.split('\n');
let fmEnd = 0;
const frontmatter = {};
if (lines[0].trim() === '---') {
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '---') { fmEnd = i + 1; break; }
    const kv = lines[i].match(/^(\w+):\s*(.+)$/);
    if (kv) frontmatter[kv[1]] = kv[2].replace(/^["']|["']$/g, '');
  }
}
lines = lines.slice(fmEnd);
// Re-index: line numbers in annotations are 1-based from original file
// We need a mapping: original line number → content
const originalLines = mdRaw.split('\n');

// ── Build upgrade lookup: line number → upgrade instruction ──
const upgradeMap = new Map(); // lineNum → upgrade object
const dropLines = new Set();
const defCardLines = new Set();
const galleryRange = new Set();
const processRange = new Set();
const checklistRange = new Set();

for (const u of anno.upgrades) {
  if (u.type === 'drop') {
    dropLines.add(u.line);
  } else if (u.type === 'pullquote') {
    upgradeMap.set(u.line, u);
  } else if (u.type === 'highlight') {
    upgradeMap.set(u.line, u);
  } else if (u.type === 'def-card') {
    for (const ln of u.lines) {
      defCardLines.add(ln);
      upgradeMap.set(ln, { type: 'def-card' });
    }
  } else if (u.type === 'gallery') {
    upgradeMap.set(u.lines[0], u);
    for (const ln of u.lines) galleryRange.add(ln);
  } else if (u.type === 'process') {
    upgradeMap.set(u.lines[0], u);
    for (const ln of u.lines) processRange.add(ln);
  } else if (u.type === 'checklist') {
    upgradeMap.set(u.lines[0], u);
    for (const ln of u.lines) checklistRange.add(ln);
  } else if (u.type === 'embed' || u.type === 'figure' || u.type === 'aside' || u.type === 'summary-card') {
    upgradeMap.set(u.line, u);
  }
}

// ── Inline markdown helpers ──
function inlineMd(text) {
  // Arrows & dashes typed in plain markdown — skipped inside `code` spans.
  const glyphs = (t) => {
  // Arrows & dashes typed in plain markdown (-> <- => -- …) → proper glyphs.
  // Done before HTML is produced, so only author text is touched (no tags yet).
  t = t.replace(/<->/g, '↔').replace(/(^|[^-<!])->/g, '$1→').replace(/<-(?!-)/g, '←').replace(/(^|[^=<>])=>/g, '$1⇒');
  // Paired ASCII double hyphen used as Chinese dash: "-- 插入语 --" / "--插入语--" → ——插入语——
  t = t.replace(/(^|[^-])\s?--(?!-)\s?([^-\n]+?)\s?--(?!-)\s?/g, '$1——$2——');
  t = t.replace(/(^|[^-])\s--\s/g, '$1——');
  // Dash-enclosed emphasis / interjection ——…—— : keep each "——" unbreakable and mark the span
  t = t.replace(/——([^—\n]{1,120}?)——/g, '<span class="dash-em"><span class="dash">——</span>$1<span class="dash">——</span></span>');
  t = t.replace(/——(?![^<]*<\/span>)/g, '<span class="dash">——</span>');
    return t;
  };
  text = text.split(/(`[^`]+`)/).map((seg, k) => k % 2 ? seg : glyphs(seg)).join('');
  // Bold
  text = text.replace(/\*\*\[([^\]]+)\]\(([^)]+)\)\*\*/g, '<strong><a href="$2">$1</a></strong>');
  text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  // Italic
  text = text.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  // Links
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  // Inline code
  text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
  return text;
}

// ── Parse a def-card blockquote line ──
function parseDefCard(line) {
  // Format: > **Term**：Definition text
  const m = line.match(/^>\s*\*\*([^*]+)\*\*[：:]\s*(.+)$/);
  if (m) return { term: m[1], body: m[2] };
  return null;
}

// ── Blockquote renderer: nesting (> >, >>), multi-paragraph (blank ">"), attribution ──
// Attribution = last paragraph starting with —— / — / -- / ―, rendered as <footer><cite>.
function renderQuote(rawLines, depth = 0) {
  const lines = rawLines.map(l => l.replace(/^>\s?/, ''));
  const parts = []; let para = [];
  const flushPara = () => { if (para.length) { parts.push({ t: 'p', text: para.join(' ') }); para = []; } };
  for (let k = 0; k < lines.length; k++) {
    const l = lines[k].trim();
    if (/^>/.test(l)) {
      flushPara();
      const nested = [];
      while (k < lines.length && /^>/.test(lines[k].trim())) { nested.push(lines[k].trim()); k++; }
      k--;
      parts.push({ t: 'q', lines: nested });
    } else if (l === '') flushPara();
    else para.push(l);
  }
  flushPara();
  let cite = '';
  const last = parts[parts.length - 1];
  if (last && last.t === 'p' && /^(——|—|―|--)\s*\S/.test(last.text) && parts.length > 1) {
    cite = last.text.replace(/^(——|—|―|--)\s*/, '');
    parts.pop();
  }
  const inner = parts.map(pt => pt.t === 'q' ? renderQuote(pt.lines, depth + 1) : `<p>${inlineMd(pt.text)}</p>`).join('');
  const cls = depth ? ' class="bq-nested"' : '';
  return `<blockquote${cls}>${inner}${cite ? `<footer class="bq-cite"><span class="dash">——</span><cite>${inlineMd(cite)}</cite></footer>` : ''}</blockquote>`;
}

// ── Main render loop ──
const sections = [];
let currentSection = null;
let inSection = false;
let sectionCount = 0;
let skipUntil = 0;

function flushSection() {
  if (currentSection) {
    sections.push(currentSection);
    currentSection = null;
    inSection = false;
  }
}

function ensureSection() {
  if (!inSection) {
    currentSection = { num: null, title: null, blocks: [] };
    inSection = true;
  }
}

function addBlock(html) {
  ensureSection();
  currentSection.blocks.push(html);
}

for (let i = 0; i < originalLines.length; i++) {
  const lineNum = i + 1; // 1-based
  if (lineNum <= fmEnd) continue;
  if (lineNum < skipUntil) continue;

  const raw = originalLines[i];
  const trimmed = raw.trim();

  // Skip dropped lines
  if (dropLines.has(lineNum)) continue;

  // Skip empty lines
  if (trimmed === '') continue;

  // Language filtering: if meta.lang is set, skip lines that are the "other" language
  // Works for bilingual docs where EN/ZH alternate line by line
  if (anno.meta.lang) {
    const lang = anno.meta.lang; // 'zh' or 'en'
    const isChinese = /[一-鿿]/.test(trimmed);
    const isEnglish = /^[A-Za-z\[*_>#\d]/.test(trimmed) && !isChinese;
    // Headings and special syntax always pass through
    const isStructural = /^#{1,6}\s|^>|^[-*]\s|^\d+\.\s|^<|^!\[|^\[/.test(trimmed);
    if (!isStructural && !upgradeMap.has(lineNum)) {
      if (lang === 'zh' && isEnglish && !isChinese) continue;
      if (lang === 'en' && isChinese && !isEnglish) continue;
    }
  }

  // Skip HTML-only lines (sub/sup references, video tags, svg blocks)
  if (/^<(sub|sup|video|svg|\/svg)/.test(trimmed)) continue;
  // Skip footnote definition lines
  if (/^\[\^\d+\]:/.test(trimmed)) continue;

  // Image lines — render as real <img> with figure wrapper
  if (/^!\[.*\]\(.*\)$/.test(trimmed)) {
    const imgMatch = trimmed.match(/^!\[([^\]]*)\]\(([^)]+)\)/);
    if (imgMatch) {
      const alt = imgMatch[1] || '';
      const src = imgMatch[2];
      addBlock(`<figure class="figure-card"><img src="${escHtml(src)}" alt="${escHtml(alt)}" loading="lazy" style="width:100%;display:block;border-radius:${styleName === 'magazine' ? '3px' : '0'}" />${alt && !alt.startsWith('img_') ? `<figcaption style="font-family:var(--font-mono);font-size:0.75rem;color:var(--fg-muted);margin-top:8px">${escHtml(alt)}</figcaption>` : ''}</figure>`);
    }
    continue;
  }

  // ── Code blocks (fenced ``` ) ──
  if (trimmed.startsWith('```')) {
    const lang = trimmed.slice(3).trim();
    let codeLines = [];
    let j = i + 1;
    while (j < originalLines.length) {
      if (originalLines[j].trim().startsWith('```')) { j++; break; }
      codeLines.push(originalLines[j]);
      j++;
    }
    skipUntil = j + 1;
    addBlock(`<pre><code${lang ? ` class="language-${escHtml(lang)}"` : ''}>${escHtml(codeLines.join('\n'))}</code></pre>`);
    continue;
  }

  // ── Markdown pipe tables ( | col | col | ) ──
  if (/^\|(.+)\|$/.test(trimmed)) {
    let tableLines = [trimmed];
    let j = i + 1;
    while (j < originalLines.length) {
      const nextTrimmed = originalLines[j].trim();
      if (/^\|(.+)\|$/.test(nextTrimmed)) {
        tableLines.push(nextTrimmed);
        j++;
      } else if (nextTrimmed === '') {
        j++;
        break;
      } else {
        break;
      }
    }
    skipUntil = j + 1;
    // Parse: first line = header, second line = separator (skip), rest = body
    const parseRow = (row) => row.split('|').slice(1, -1).map(c => c.trim());
    const headers = parseRow(tableLines[0]);
    const bodyRows = tableLines.filter((_, idx) => idx >= 2).map(parseRow);
    let tableHtml = '<div class="table-wrap"><table><thead><tr>';
    headers.forEach(h => { tableHtml += `<th>${inlineMd(h)}</th>`; });
    tableHtml += '</tr></thead><tbody>';
    bodyRows.forEach(row => {
      tableHtml += '<tr>';
      row.forEach(cell => { tableHtml += `<td>${inlineMd(cell)}</td>`; });
      tableHtml += '</tr>';
    });
    tableHtml += '</tbody></table></div>';
    addBlock(tableHtml);
    continue;
  }

  // ── HTML table pass-through ──
  if (trimmed.startsWith('<table')) {
    // Check if table is on a single line
    if (trimmed.includes('</table>')) {
      addBlock(`<div class="table-wrap">${trimmed}</div>`);
      continue;
    }
    // Multi-line HTML table
    let htmlBlock = [trimmed];
    let j = i + 1;
    while (j < originalLines.length) {
      const nextLine = originalLines[j];
      htmlBlock.push(nextLine);
      if (nextLine.includes('</table>')) { j++; break; }
      j++;
    }
    skipUntil = j + 1;
    addBlock(`<div class="table-wrap">${htmlBlock.join('\n')}</div>`);
    continue;
  }

  // ── Document title (# ) — already shown in the hero from meta.title ──
  if (/^#\s+/.test(trimmed) && !trimmed.startsWith('##')) {
    const h1 = trimmed.replace(/^#\s+/, '').trim();
    const norm = t => t.replace(/[\s*_`]/g, '');
    if (norm(h1) !== norm(anno.meta.title || '')) addBlock(`<h3>${inlineMd(h1)}</h3>`);
    continue;
  }

  // ── Thematic break (---, ***, ___) ── used to leak out as a literal "---" paragraph
  if (/^(?:-{3,}|\*{3,}|_{3,})$/.test(trimmed.replace(/\s+/g, ''))) {
    addBlock('<hr class="divider">');
    continue;
  }

  // ── Section headings ──
  if (trimmed.startsWith('## ')) {
    flushSection();
    sectionCount++;
    // For zh mode: extract Chinese portion from mixed headings like "Squash and Stretch 挤压与拉伸"
    let headingText = trimmed.replace(/^##\s+/, '');
    if (anno.meta.lang === 'zh') {
      // Extract Chinese portion: find the first Chinese character, take everything from there
      const zhStart = headingText.search(/[一-鿿]/);
      if (zhStart !== -1) headingText = headingText.slice(zhStart).trim();
    } else if (anno.meta.lang === 'en') {
      // Keep only the English part before Chinese characters
      const enMatch = headingText.match(/^([^一-鿿]+)/);
      if (enMatch) headingText = enMatch[1].trim();
    }
    currentSection = {
      num: String(sectionCount).padStart(2, '0'),
      title: headingText,
      blocks: []
    };
    inSection = true;
    continue;
  }

  if (trimmed.startsWith('### ')) {
    addBlock(`<h3>${inlineMd(trimmed.replace(/^###\s+/, ''))}</h3>`);
    continue;
  }

  // ── Check upgrades ──
  const upgrade = upgradeMap.get(lineNum);

  // Pullquote — Swiss: vertical accent bar left, large light text right
  if (upgrade && upgrade.type === 'pullquote') {
    // Pullquote may sit on a "> …" line: strip the markdown marker (it used to leak as a literal ">")
    let text = trimmed.replace(/^(>\s?)+/, '').trim().replace(/^\*\*/, '').replace(/\*\*$/, '');
    let pqCite = '';
    const cm = text.match(/^(.*[”"」』）)])\s*[（(]([^（）()]{1,80})[）)]\s*[。.]?$/);
    if (cm) { text = cm[1]; pqCite = cm[2]; }
    let rendered = inlineMd(text);
    if (upgrade.accent) {
      rendered = rendered.replace(upgrade.accent, `<span class="accent-mark">${upgrade.accent}</span>`);
    }
    if (styleName === 'swiss') {
      addBlock(`<div class="pullquote pullquote-swiss"><div class="pq-bar"></div><div class="pq-content"><p>${rendered}</p>${pqCite ? `<div class="pq-cite">${inlineMd(pqCite)}</div>` : ''}</div></div>`);
    } else {
      addBlock(`<div class="pullquote"><p>${rendered}</p>${pqCite ? `<div class="pq-cite">${inlineMd(pqCite)}</div>` : ''}</div>`);
    }
    continue;
  }

  // Highlight card — Swiss: split layout with accent sidebar label
  if (upgrade && upgrade.type === 'highlight') {
    let text = trimmed.replace(/^\*\*/, '').replace(/\*\*$/, '');
    if (upgrade.lines_end) {
      const endLine = upgrade.lines_end;
      let combined = [];
      for (let j = i; j < originalLines.length && (j + 1) <= endLine; j++) {
        const lt = originalLines[j].trim();
        if (lt && !/^!\[/.test(lt)) combined.push(lt);
      }
      text = combined.join(' ');
      skipUntil = endLine + 1;
    }
    text = text.replace(/^\*\*/, '').replace(/\*\*$/, '');
    if (styleName === 'swiss') {
      addBlock(`<div class="highlight-card highlight-swiss"><div class="hl-label">${upgrade.label || ''}</div><div class="hl-body"><p>${inlineMd(text)}</p></div></div>`);
    } else {
      addBlock(`<div class="highlight-card"><p>${inlineMd(text)}</p><div class="attr">${upgrade.label || ''}</div></div>`);
    }
    continue;
  }

  // Def card — Swiss: inline left-right term/definition
  if (upgrade && upgrade.type === 'def-card') {
    const parsed = parseDefCard(trimmed);
    if (parsed) {
      if (styleName === 'swiss') {
        addBlock(`<div class="def-card def-card-swiss"><div class="dc-term"><span class="dc-label">Term</span>${escHtml(parsed.term)}</div><div class="dc-body">${inlineMd(parsed.body)}</div></div>`);
      } else {
        addBlock(`<div class="def-card"><div class="def-card-label">术语</div><div class="def-card-term">${escHtml(parsed.term)}</div><div class="def-card-body">${inlineMd(parsed.body)}</div></div>`);
      }
      continue;
    }
  }

  // Gallery — Swiss: grid tiles instead of scroll
  if (upgrade && upgrade.type === 'gallery') {
    if (styleName === 'swiss') {
      let html = '<div class="gallery-grid">';
      for (const item of upgrade.items) {
        html += `<div class="gallery-grid-item"><div class="img-placeholder"><span>${escHtml(item.title)}</span></div><div class="gallery-cap">${escHtml(item.desc)}</div></div>`;
      }
      html += '</div>';
      addBlock(html);
    } else {
      let html = '<div class="gallery-hint">← 横向滚动查看更多 →</div><div class="gallery">';
      for (const item of upgrade.items) {
        html += `<div class="gallery-item"><div class="img-placeholder"><span>${escHtml(item.title)}</span></div><div class="gallery-cap">${escHtml(item.desc)}</div></div>`;
      }
      html += '</div>';
      addBlock(html);
    }
    continue;
  }

  // Process / timeline
  if (upgrade && upgrade.type === 'process') {
    let html = '<div class="process">';
    upgrade.items.forEach((item, idx) => {
      html += `<div class="process-step"><div class="process-num">${String(idx + 1).padStart(2, '0')}</div><div class="process-content"><div class="process-title">${escHtml(item.title)}</div><div class="process-desc">${inlineMd(item.desc)}</div></div></div>`;
    });
    html += '</div>';
    addBlock(html);
    // Skip the original numbered list lines
    for (const ln of anno.upgrades.find(u => u.type === 'process').lines) {
      dropLines.add(ln);
    }
    continue;
  }

  // Checklist
  if (upgrade && upgrade.type === 'checklist') {
    let html = '<ul class="checklist">';
    // Gather list items from original lines
    for (const ln of anno.upgrades.find(u => u.type === 'checklist').lines) {
      const content = originalLines[ln - 1].trim().replace(/^[-*]\s*/, '');
      html += `<li>${inlineMd(content)}</li>`;
      if (ln !== lineNum) dropLines.add(ln);
    }
    html += '</ul>';
    addBlock(html);
    continue;
  }

  // Embed card — AI-generated SVG/UI preview
  if (upgrade && upgrade.type === 'embed') {
    addBlock(`<div class="embed-card"><div class="embed-label">${escHtml(upgrade.label || 'Preview')}</div><div class="embed-body">${upgrade.svg || upgrade.html || ''}</div>${upgrade.caption ? `<div class="embed-caption">${escHtml(upgrade.caption)}</div>` : ''}</div>`);
    continue;
  }

  // Figure — Unsplash/external image with caption
  if (upgrade && upgrade.type === 'figure') {
    addBlock(`<figure class="figure-card"><img src="${upgrade.src}" alt="${escHtml(upgrade.alt || '')}" />${upgrade.caption ? `<figcaption>${escHtml(upgrade.caption)}</figcaption>` : ''}</figure>`);
    continue;
  }

  // Aside — side note / annotation that adds context
  if (upgrade && upgrade.type === 'aside') {
    addBlock(`<div class="aside-card"><div class="aside-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg></div><div class="aside-content"><div class="aside-title">${escHtml(upgrade.title || '补充')}</div><p>${inlineMd(upgrade.text)}</p></div></div>`);
    continue;
  }

  // Summary card — key takeaway grid
  if (upgrade && upgrade.type === 'summary-card') {
    let html = '<div class="summary-card"><div class="summary-label">' + escHtml(upgrade.label || 'Key Takeaways') + '</div><div class="summary-grid">';
    for (const item of (upgrade.items || [])) {
      html += `<div class="summary-item"><div class="summary-item-title">${escHtml(item.title)}</div><div class="summary-item-desc">${escHtml(item.desc)}</div></div>`;
    }
    html += '</div></div>';
    addBlock(html);
    continue;
  }

  // Skip lines consumed by gallery/process/checklist
  if (galleryRange.has(lineNum) || processRange.has(lineNum) || checklistRange.has(lineNum)) {
    if (!upgradeMap.has(lineNum)) continue;
  }

  // ── Standard blockquote (non-def-card) ──
  if (/^>/.test(trimmed) && !defCardLines.has(lineNum)) {
    const parsed = parseDefCard(trimmed);
    if (parsed) {
      if (styleName === 'swiss') {
        addBlock(`<div class="def-card def-card-swiss"><div class="dc-term"><span class="dc-label">Term</span>${escHtml(parsed.term)}</div><div class="dc-body">${inlineMd(parsed.body)}</div></div>`);
      } else {
        addBlock(`<div class="def-card"><div class="def-card-label">术语</div><div class="def-card-term">${escHtml(parsed.term)}</div><div class="def-card-body">${inlineMd(parsed.body)}</div></div>`);
      }
      continue;
    }
    // Regular blockquote — collect contiguous ">" lines (a blank line ends the quote,
    // as in CommonMark; old code swallowed blanks and merged separate quotes).
    let bqRaw = [trimmed];
    let j = i + 1;
    while (j < originalLines.length && /^>/.test(originalLines[j].trim())) { bqRaw.push(originalLines[j].trim()); j++; }
    skipUntil = j + 1;
    addBlock(renderQuote(bqRaw));
    continue;
  }

  // ── Ordered list ──
  if (/^\d+\.\s/.test(trimmed)) {
    let items = [trimmed.replace(/^\d+\.\s*/, '')];
    let j = i + 1;
    while (j < originalLines.length) {
      const nextTrimmed = originalLines[j].trim();
      if (/^\d+\.\s/.test(nextTrimmed)) {
        if (!dropLines.has(j + 1)) items.push(nextTrimmed.replace(/^\d+\.\s*/, ''));
        j++;
      } else if (nextTrimmed === '') {
        j++;
      } else {
        break;
      }
    }
    skipUntil = j + 1;
    addBlock('<ol>' + items.map(it => `<li>${inlineMd(it)}</li>`).join('') + '</ol>');
    continue;
  }

  // ── Unordered list ──
  if (/^[-*]\s/.test(trimmed)) {
    let items = [trimmed.replace(/^[-*]\s*/, '')];
    let j = i + 1;
    while (j < originalLines.length) {
      const nextTrimmed = originalLines[j].trim();
      if (/^[-*]\s/.test(nextTrimmed) && !dropLines.has(j + 1)) {
        items.push(nextTrimmed.replace(/^[-*]\s*/, ''));
        j++;
      } else if (nextTrimmed === '') {
        j++;
      } else {
        break;
      }
    }
    skipUntil = j + 1;
    addBlock('<ul>' + items.map(it => `<li>${inlineMd(it)}</li>`).join('') + '</ul>');
    continue;
  }

  // ── Default: paragraph ──
  addBlock(`<p>${inlineMd(trimmed)}</p>`);
}

flushSection();

// ── HTML escape helper ──
function escHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ── Assemble full HTML ──
const meta = anno.meta;
const isSwiss = styleName === 'swiss';
const tagsHtml = meta.tags.map(t => `<span>${escHtml(t)}</span>`).join('');

let bodyHtml = '';

const docType = (frontmatter.type || 'article').toUpperCase();
const docStatus = (frontmatter.status || 'final').toUpperCase();

const chromeMetaItems = [
  ['author', meta.author],
  ['date', meta.date],
  ['reading', meta.reading_time],
].map(([k, v]) =>
  `<div class="cm-item"><span class="cm-key">${escHtml(k)}</span> <span class="cm-val">${escHtml(v)}</span></div>`
);

const chromeTagsHtml = meta.tags.map(t =>
  `<span class="chrome-tag">${escHtml(t)}</span>`
).join('');

bodyHtml += `
<div class="doc-chrome">
  <div class="doc-chrome-bar">
    <div class="chrome-l">
      <span class="chrome-accent">${escHtml(docType)}</span>
      <span class="chrome-sep"></span>
      <span>${escHtml(docStatus)}</span>
    </div>
    <div class="chrome-r">
      <span>归藏 Page</span>
      <span class="chrome-sep"></span>
      <span>${escHtml(meta.date)}</span>
    </div>
  </div>
  <div class="doc-chrome-rule"></div>
  <div class="doc-chrome-meta">
    ${chromeMetaItems.join('<div class="cm-dot"></div>')}
  </div>
  <div class="doc-chrome-tags">${chromeTagsHtml}</div>
</div>
`;

// Hero — Swiss uses cover card with configurable image
const heroImg = meta.hero_image || 'https://images.unsplash.com/photo-1509023464722-18d996393ca8?w=1400&h=600&fit=crop';
if (isSwiss) {
  bodyHtml += `
<header class="hero hero-cover">
  <img class="hero-bg" src="${heroImg}" alt="" />
  <div class="hero-overlay">
    <div class="hero-kicker">${escHtml(docType)} — ${escHtml(meta.date)}</div>
    <h1>${escHtml(meta.title)}</h1>
    <p class="hero-subtitle">${escHtml(meta.subtitle)}</p>
  </div>
</header>
`;
} else {
  bodyHtml += `
<header class="hero">
  <h1>${escHtml(meta.title)}</h1>
  <p class="hero-subtitle">${escHtml(meta.subtitle)}</p>
</header>
`;
}

// Build TOC + Sections
const tocItems = [];
let secIdx = 0;
for (const sec of sections) {
  const secId = sec.num ? `s-${sec.num}` : `s-${secIdx}`;
  if (sec.title) tocItems.push({ id: secId, num: sec.num, title: sec.title });
  const isFootnote = sec.title && /footnote|脚注|注释|注脚/i.test(sec.title);
  bodyHtml += `<section class="section${isFootnote ? ' section-footnote' : ''}" id="${secId}">`;
  if (isSwiss && sec.num && sec.title) {
    bodyHtml += `<div class="section-header"><div class="section-number">${sec.num}</div><h2>${inlineMd(sec.title)}</h2></div>`;
  } else {
    if (sec.num) bodyHtml += `<div class="section-number">${sec.num}</div>`;
    if (sec.title) bodyHtml += `<h2>${inlineMd(sec.title)}</h2>`;
  }
  bodyHtml += sec.blocks.join('\n');
  bodyHtml += '</section>';
  secIdx++;
}

// Footer
bodyHtml += `
<div class="divider-dot">· · ·</div>
<footer><p>归藏 Page · Built with constrained HTML</p></footer>
`;

// ── Load CSS based on style flag ──
// import.meta.dirname only exists on Node >= 20.11; older Node used to fall back to '.'
// and then silently skip ui.css/ui.js (empty try/catch) -> no buttons. Resolve robustly.
const scriptDir = import.meta.dirname || dirname(fileURLToPath(import.meta.url));
let assetsDir = resolve(scriptDir, '..', 'assets');
if (!existsSync(assetsDir)) assetsDir = scriptDir;
const cssFile = styleName === 'swiss' ? 'style-swiss.css' : 'style-magazine.css';
const css = readFileSync(resolve(assetsDir, cssFile), 'utf-8');
function readAsset(name) {
  const p = resolve(assetsDir, name);
  if (!existsSync(p)) { console.error(`✗ missing asset: ${p}`); process.exit(1); }
  return readFileSync(p, 'utf-8');
}
const uiCss = readAsset('ui.css');
const uiJs = readAsset('ui.js');
const themes = JSON.parse(readAsset('themes.json'));
const theme = themes[styleName] || themes.swiss;

// Static UI markup (export button + settings FAB). Rendered into the HTML itself so the
// controls exist even before/without JS; ui.js only wires up behaviour.
const ICON = {
  arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17l9.2-9.2M17 17V7H7"/></svg>',
  pdf: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>',
  image: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>',
  sliders: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></svg>',
};
const attr = v => String(v).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
const uiMarkup = `
<div class="hf-share">
  <button class="hf-share-btn" id="hf-share-toggle" type="button" aria-haspopup="true">${ICON.arrow}EXPORT</button>
  <div class="hf-dropdown" id="hf-share-dropdown">
    <button class="hf-dropdown-item" id="hf-export-pdf" type="button">${ICON.pdf}导出 PDF</button>
    <button class="hf-dropdown-item" id="hf-export-image" type="button">${ICON.image}导出长图</button>
  </div>
</div>
<div class="hf-fab">
  <button class="hf-fab-btn" id="hf-settings-toggle" type="button" title="设置" aria-haspopup="true">${ICON.sliders}</button>
  <div class="hf-dropdown" id="hf-settings-dropdown">
    <div class="hf-dropdown-label">配色</div>
    <div class="hf-swatches">${theme.colors.map((c, i) =>
      `<button type="button" class="hf-swatch${i === 0 ? ' active' : ''}" data-accent="${c.accent}" data-accent-bright="${c.accentBright || ''}" data-accent-on="${c.accentOn || '#ffffff'}" data-vars="${attr(JSON.stringify(c.vars || {}))}" data-scheme="${c.scheme || 'light'}" style="background:${c.swatch || c.accent}" title="${attr(c.name)}" aria-label="${attr(c.name)}"></button>`).join('')}</div>
    <div class="hf-dropdown-divider"></div>
    <div class="hf-dropdown-label">字体</div>
    <div class="hf-font-options">${theme.fonts.map((f, i) =>
      `<button type="button" class="hf-font-option${i === 0 ? ' active' : ''}" data-var="${theme.fontVar}" data-family="${attr(f.family)}" data-google="${attr(f.google || '')}"><span class="font-preview" style="font-family:${attr(f.family)}">${styleName === 'magazine' ? '衬线 Aa' : '黑体 Aa'}</span><span class="font-name">${attr(f.name)}</span></button>`).join('')}</div>
  </div>
</div>`;

const fontsHref = styleName === 'swiss'
  ? 'https://fonts.googleapis.com/css2?family=Inter:wght@200;300;400;500;600;700;800&family=Noto+Sans+SC:wght@200;300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap'
  : 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Noto+Serif+SC:wght@400;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap';

const chartScript = isSwiss ? `
<script src="https://cdn.jsdelivr.net/npm/chart.js@4/dist/chart.umd.min.js"></script>
<script>
function initCharts() {
  const accent = '${anno.meta.accent || '#002FA7'}';
  const grey = '#d4d4d2';
  const fg = '#0a0a0a';
  const defaults = Chart.defaults;
  defaults.font.family = "'Inter','Helvetica Neue',sans-serif";
  defaults.font.size = 12;
  defaults.color = '#737373';
  defaults.plugins.legend.display = false;
  defaults.animation.duration = 900;
  defaults.animation.easing = 'easeOutQuart';
  defaults.scale.grid = { color: '#f0f0ee', lineWidth: 1 };
  defaults.scale.border = { display: false };

  const barEl = document.getElementById('chart-bar');
  if (barEl) new Chart(barEl, {
    type: 'bar',
    data: {
      labels: ['设计类','写作类','开发类','视频类','行业类','硬件类'],
      datasets: [{
        data: [2400, 1800, 3100, 900, 1500, 600],
        backgroundColor: [accent, grey, accent, grey, accent, grey],
        borderRadius: 0, maxBarThickness: 48
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      scales: { y: { beginAtZero: true, ticks: { stepSize: 1000 } }, x: { grid: { display: false } } }
    }
  });

  const lineEl = document.getElementById('chart-line');
  if (lineEl) new Chart(lineEl, {
    type: 'line',
    data: {
      labels: ['1月','2月','3月','4月','5月','6月'],
      datasets: [{
        data: [82, 85, 88, 91, 93, 94],
        borderColor: accent, borderWidth: 2,
        pointBackgroundColor: accent, pointRadius: 4, pointHoverRadius: 6,
        fill: true,
        backgroundColor: accent + '12',
        tension: 0.3
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      scales: { y: { min: 75, max: 100, ticks: { callback: v => v+'%' } }, x: { grid: { display: false } } }
    }
  });
}
if (typeof Chart !== 'undefined') initCharts();
else document.querySelector('script[src*="chart.js"]').onload = initCharts;
</script>` : '';

// Build TOC HTML
const tocHtml = tocItems.map(t =>
  `<a class="toc-item" href="#${t.id}">${t.num ? `<span class="toc-num">${t.num}</span>` : ''}${escHtml(t.title)}</a>`
).join('\n');

const tocSidebar = `
<div class="toc-scrim" id="toc-scrim"></div>
<nav class="toc" id="toc">
  <button class="toc-toggle" id="toc-toggle" aria-label="Toggle table of contents">
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M2 4h14M2 9h10M2 14h14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
  </button>
  <div class="toc-panel" id="toc-panel">
    <div class="toc-header">目录</div>
    ${tocHtml}
  </div>
</nav>`;

const tocScript = `
<script>
(function(){
  const toggle = document.getElementById('toc-toggle');
  const panel = document.getElementById('toc-panel');
  const toc = document.getElementById('toc');
  const scrim = document.getElementById('toc-scrim');
  const narrow = window.matchMedia('(max-width: 1024px)');
  let open = false;
  function setOpen(v) {
    open = v;
    toc.classList.toggle('toc-open', v);
    document.documentElement.classList.toggle('toc-is-open', v);
    toggle.setAttribute('aria-expanded', String(v));
  }
  toggle.addEventListener('click', (e) => { e.stopPropagation(); setOpen(!open); });
  if (scrim) scrim.addEventListener('click', () => setOpen(false));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && open) setOpen(false); });
  panel.addEventListener('click', (e) => {
    // On narrow screens the drawer covers the text, so close it after jumping;
    // on wide screens it sits beside the text and can stay open.
    if (e.target.closest('.toc-item') && narrow.matches) setOpen(false);
  });
  // Scroll spy
  const sections = document.querySelectorAll('.section[id]');
  const links = document.querySelectorAll('.toc-item');
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        links.forEach(l => l.classList.remove('toc-active'));
        const active = panel.querySelector('a[href="#'+entry.target.id+'"]');
        if (active) active.classList.add('toc-active');
      }
    });
  }, { rootMargin: '-20% 0px -70% 0px' });
  sections.forEach(s => observer.observe(s));
})();
</script>`;

// ── CJK typography pass (references/design-rules.md §中文排版) ──
// 1) Document language for :lang(zh) rules: meta.lang wins, else detect by Han ratio.
const hanCount = (mdRaw.match(/[\u3400-\u9fff]/g) || []).length;
const latinCount = (mdRaw.match(/[A-Za-z]/g) || []).length;
const docLang = anno.meta.lang === 'en' ? 'en'
  : anno.meta.lang === 'zh' ? 'zh-CN'
  : (hanCount > latinCount * 0.25 ? 'zh-CN' : 'en');
// 2) Han ↔ Latin/digit spacing ("盘古之白"). clreq §6.3.3: ≤ 1/4 em between Han and
//    Western letters/numerals, none at line start/end. Chrome has no text-autospace yet,
//    so insert a real (collapsible) space wrapped in .hf-sp where the author left none;
//    browsers that support text-autospace hide the span and use the native spacing.
//    Only text nodes are touched — never tags/attributes, <code>, <pre>, <script>, <svg>.
function autospace(html) {
  const HAN = '[\\u3400-\\u4dbf\\u4e00-\\u9fff\\uf900-\\ufaff]';
  const LAT = '[A-Za-z0-9]';
  const re1 = new RegExp(`(${HAN})(${LAT})`, 'g');
  const re2 = new RegExp(`(${LAT}|%)(${HAN})`, 'g');
  const SP = '<span class="hf-sp"> </span>';
  let out = '', skip = 0;
  for (const part of html.split(/(<[^>]+>)/)) {
    if (part.startsWith('<')) {
      const m = part.match(/^<(\/?)(code|pre|script|style|svg|kbd|textarea)\b/i);
      if (m) skip += m[1] ? -1 : (/\/>$/.test(part) ? 0 : 1);
      out += part;
    } else if (skip > 0 || !part) {
      out += part;
    } else {
      out += part.replace(re1, `$1${SP}$2`).replace(re2, `$1${SP}$2`);
    }
  }
  return out;
}
if (docLang.startsWith('zh') && anno.meta.autospace !== false) bodyHtml = autospace(bodyHtml);

const fullHtml = `<!DOCTYPE html>
<html lang="${docLang}" data-hf-style="${styleName}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escHtml(meta.title)}</title>
<style>${css}</style>
<style>${uiCss}</style>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="${fontsHref}" rel="stylesheet">
</head>
<body>
${tocSidebar}
<div class="container">
${bodyHtml}
</div>
${chartScript}
${tocScript}
${uiMarkup}
<script>${uiJs}</script>
</body>
</html>`;

writeFileSync(resolve(outPath), fullHtml, 'utf-8');
console.log(`✓ Rendered ${sections.length} sections → ${outPath}`);
