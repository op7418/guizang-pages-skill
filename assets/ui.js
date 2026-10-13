(function () {
  'use strict';

  // Theme options live in assets/themes.json; render.mjs writes the controls
  // into the HTML statically, so this file only wires up behaviour.
  const style = document.documentElement.dataset.hfStyle || 'swiss';
  const $ = (id) => document.getElementById(id);
  const STORE = 'hf-page-prefs:' + style;

  // ── Helpers ──
  function toast(msg, ms) {
    let t = document.querySelector('.hf-toast');
    if (!t) {
      t = document.createElement('div');
      t.className = 'hf-toast';
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(t._h);
    t._h = setTimeout(() => t.classList.remove('show'), ms || 2200);
  }

  function closeAllDropdowns() {
    document.querySelectorAll('.hf-dropdown.open').forEach(d => d.classList.remove('open'));
  }

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.hf-dropdown') && !e.target.closest('.hf-fab-btn') && !e.target.closest('.hf-share-btn')) {
      closeAllDropdowns();
    }
  });

  // ── Load html2canvas via script tag (works with file:// protocol) ──
  function loadHtml2Canvas() {
    return new Promise((resolve, reject) => {
      if (window.html2canvas) return resolve(window.html2canvas);
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';
      s.onload = () => resolve(window.html2canvas);
      s.onerror = () => reject(new Error('Failed to load html2canvas'));
      document.head.appendChild(s);
    });
  }

  document.getElementById('hf-share-toggle').addEventListener('click', (e) => {
    e.stopPropagation();
    const dd = document.getElementById('hf-share-dropdown');
    const wasOpen = dd.classList.contains('open');
    closeAllDropdowns();
    if (!wasOpen) dd.classList.add('open');
  });

  // PDF: use browser print dialog
  document.getElementById('hf-export-pdf').addEventListener('click', () => {
    closeAllDropdowns();
    // Chrome/Edge/Safari drop background colours unless "Background graphics"
    // is ticked in the print dialog; CSS print-color-adjust:exact covers Chrome
    // but not every browser, so tell the user before the dialog opens.
    toast('打印对话框里展开「更多设置」，勾选「背景图形」，目标选「另存为 PDF」', 4200);
    setTimeout(() => window.print(), 1200);
  });

  // Image: html2canvas → PNG download
  document.getElementById('hf-export-image').addEventListener('click', async () => {
    closeAllDropdowns();
    toast('正在生成长图…');
    try {
      eagerImages();
      await Promise.all([...document.images].map(i => i.complete ? 0 : new Promise(r => { i.onload = i.onerror = r; })));
      const h2c = await loadHtml2Canvas();
      // Hide UI elements during capture
      document.querySelectorAll('.hf-fab, .hf-share, .toc').forEach(el => el.style.display = 'none');
      // Remove contenteditable outlines
      document.querySelectorAll('[contenteditable]').forEach(el => {
        el.dataset.wasEditable = 'true';
        el.removeAttribute('contenteditable');
      });

      const container = document.querySelector('.container');
      const canvas = await h2c(container, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: getComputedStyle(document.body).backgroundColor,
        width: container.scrollWidth,
        height: container.scrollHeight,
        scrollX: 0,
        scrollY: -window.scrollY,
      });

      // Restore UI
      document.querySelectorAll('.hf-fab, .hf-share, .toc').forEach(el => el.style.display = '');
      document.querySelectorAll('[data-was-editable]').forEach(el => {
        el.setAttribute('contenteditable', 'true');
        delete el.dataset.wasEditable;
      });

      const link = document.createElement('a');
      link.download = (document.title || 'guizang-page') + '.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
      toast('长图已下载');
    } catch (err) {
      // Restore UI on error
      document.querySelectorAll('.hf-fab, .hf-share, .toc').forEach(el => el.style.display = '');
      document.querySelectorAll('[data-was-editable]').forEach(el => {
        el.setAttribute('contenteditable', 'true');
        delete el.dataset.wasEditable;
      });
      toast('导出失败：' + err.message);
    }
  });

  // WeChat: generate inline-style HTML and copy to clipboard
  document.getElementById('hf-copy-wechat').addEventListener('click', async () => {
    closeAllDropdowns();
    toast('正在转换公众号格式…');

    const container = document.querySelector('.container');

    // Use wechat exporter if loaded
    if (typeof window._exportToWechat === 'function') {
      const wechatHtml = window._exportToWechat(container);
      try {
        const blob = new Blob([wechatHtml], { type: 'text/html' });
        const textBlob = new Blob([container.innerText], { type: 'text/plain' });
        await navigator.clipboard.write([
          new ClipboardItem({ 'text/html': blob, 'text/plain': textBlob })
        ]);
        toast('公众号排版已复制，可直接粘贴');
      } catch {
        // Fallback: inject into temp element and copy
        const tmp = document.createElement('div');
        tmp.innerHTML = wechatHtml;
        tmp.style.position = 'fixed';
        tmp.style.left = '-9999px';
        document.body.appendChild(tmp);
        const range = document.createRange();
        range.selectNodeContents(tmp);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
        document.execCommand('copy');
        sel.removeAllRanges();
        document.body.removeChild(tmp);
        toast('公众号排版已复制（降级模式）');
      }
    } else {
      // No exporter loaded, raw copy
      const sel = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(container);
      sel.removeAllRanges();
      sel.addRange(range);
      document.execCommand('copy');
      sel.removeAllRanges();
      toast('已复制（无公众号格式优化）');
    }
  });

  document.getElementById('hf-settings-toggle').addEventListener('click', (e) => {
    e.stopPropagation();
    const dd = document.getElementById('hf-settings-dropdown');
    const wasOpen = dd.classList.contains('open');
    closeAllDropdowns();
    if (!wasOpen) dd.classList.add('open');
  });

  // ── Color switching ──
  // Old bug: magazine CSS only used --accent in ~10 low-visibility places
  // (hover states, a 10px label), so switching looked like "nothing happens".
  // style-magazine.css now routes section numbers, quote rules, list markers,
  // highlight labels etc. through --accent; this just sets the variables.
  function applyAccent(sw) {
    document.querySelectorAll('.hf-swatch').forEach(s => s.classList.toggle('active', s === sw));
    const root = document.documentElement;
    root.style.setProperty('--accent', sw.dataset.accent);
    if (sw.dataset.accentBright) root.style.setProperty('--accent-bright', sw.dataset.accentBright);
    else root.style.removeProperty('--accent-bright');
    root.style.setProperty('--accent-on', sw.dataset.accentOn || '#ffffff');
  }
  // ── Font switching ──
  // Old bug: Google Fonts URL was built from the display name with weights 200–800;
  // "Noto Serif"/"Source Serif" are not real family names and Playfair has no 200,
  // so the CSS request 400'd and the font never changed. Each option now carries
  // an exact Google Fonts query (themes.json).
  function applyFont(opt) {
    document.querySelectorAll('.hf-font-option').forEach(o => o.classList.toggle('active', o === opt));
    document.documentElement.style.setProperty(opt.dataset.var || '--font-sans', opt.dataset.family);
    const q = opt.dataset.google;
    if (q && !document.querySelector(`link[data-hf-font="${q}"]`)) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.dataset.hfFont = q;
      link.href = `https://fonts.googleapis.com/css2?family=${q}&display=swap`;
      document.head.appendChild(link);
    }
  }
  function save() {
    try {
      const sw = document.querySelector('.hf-swatch.active');
      const fo = document.querySelector('.hf-font-option.active');
      localStorage.setItem(STORE, JSON.stringify({ accent: sw && sw.dataset.accent, font: fo && fo.dataset.family }));
    } catch (e) {}
  }
  document.querySelectorAll('.hf-swatch').forEach(sw => sw.addEventListener('click', (e) => { e.stopPropagation(); applyAccent(sw); save(); }));
  document.querySelectorAll('.hf-font-option').forEach(opt => opt.addEventListener('click', (e) => { e.stopPropagation(); applyFont(opt); save(); }));
  try {
    const prefs = JSON.parse(localStorage.getItem(STORE) || 'null');
    if (prefs) {
      const sw = [...document.querySelectorAll('.hf-swatch')].find(s => s.dataset.accent === prefs.accent);
      if (sw && !sw.classList.contains('active')) applyAccent(sw);
      const fo = [...document.querySelectorAll('.hf-font-option')].find(o => o.dataset.family === prefs.font);
      if (fo && !fo.classList.contains('active')) applyFont(fo);
    }
  } catch (e) {}

  // ── Make lazy images print/export-safe ──
  // loading="lazy" images below the fold are blank in PDF/long-image exports.
  function eagerImages() { document.querySelectorAll('img[loading="lazy"]').forEach(i => { i.loading = 'eager'; }); }
  window.addEventListener('beforeprint', eagerImages);
  if (document.readyState === 'complete') setTimeout(eagerImages, 800);
  else window.addEventListener('load', () => setTimeout(eagerImages, 800));

  // ── Editable text ──
  const editableSelectors = [
    '.hero h1',
    '.hero-subtitle',
    '.hero-cover h1',
    '.hero-cover .hero-subtitle',
    '.section h2',
    '.section h3',
    '.section p',
    '.section li',
    '.pullquote p',
    '.pullquote-swiss .pq-content p',
    '.highlight-card p',
    '.highlight-swiss .hl-body p',
    '.def-card-body',
    '.def-card-swiss .dc-body',
    '.process-title',
    '.process-desc',
    '.aside-content p',
    '.summary-item-title',
    '.summary-item-desc',
    'blockquote p',
    'td',
  ];
  editableSelectors.forEach(sel => {
    document.querySelectorAll(sel).forEach(el => {
      el.setAttribute('contenteditable', 'true');
      el.setAttribute('spellcheck', 'false');
    });
  });
})();
