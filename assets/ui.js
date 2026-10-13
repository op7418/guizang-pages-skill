(function () {
  'use strict';

  // ── Theme config ──
  const THEMES = {
    swiss: {
      colors: [
        { name: 'IKB Blue', accent: '#002FA7', accentBright: '#5B7BFF' },
        { name: 'Cadmium Yellow', accent: '#FFD500', accentBright: '#FFE34D', accentOn: '#0a0a0a' },
        { name: 'Safety Orange', accent: '#FF6B35', accentBright: '#FF9A6C' },
        { name: 'Highlighter Green', accent: '#C5E803', accentBright: '#D4F040', accentOn: '#0a0a0a' },
      ],
      fonts: [
        { name: 'Inter', family: "'Inter','Helvetica Neue','Noto Sans SC',sans-serif", weight: '200' },
        { name: 'DM Sans', family: "'DM Sans','Noto Sans SC',sans-serif", weight: '300' },
        { name: 'Space Grotesk', family: "'Space Grotesk','Noto Sans SC',sans-serif", weight: '300' },
      ],
    },
    magazine: {
      colors: [
        { name: 'Terracotta', accent: '#c45a3c' },
        { name: 'Forest', accent: '#3d6b4f' },
        { name: 'Indigo', accent: '#3f4d8c' },
        { name: 'Charcoal', accent: '#4a4a4a' },
      ],
      fonts: [
        { name: 'Noto Serif', family: "'Noto Serif SC','Source Han Serif SC','Songti SC',Georgia,serif", weight: '700' },
        { name: 'Playfair', family: "'Playfair Display','Noto Serif SC',Georgia,serif", weight: '700' },
        { name: 'Source Serif', family: "'Source Serif 4','Noto Serif SC',Georgia,serif", weight: '700' },
      ],
    },
  };

  const style = document.documentElement.dataset.hfStyle || 'swiss';
  const theme = THEMES[style] || THEMES.swiss;

  // ── Helpers ──
  function toast(msg) {
    let t = document.querySelector('.hf-toast');
    if (!t) {
      t = document.createElement('div');
      t.className = 'hf-toast';
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 2200);
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

  // ── Share / Export button (top-right) ──
  // Lucide icons: arrow-up-right, file-text, image, clipboard-copy
  const shareHtml = `
    <div class="hf-share">
      <button class="hf-share-btn" id="hf-share-toggle">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17l9.2-9.2M17 17V7H7"/></svg>
        EXPORT
      </button>
      <div class="hf-dropdown" id="hf-share-dropdown">
        <button class="hf-dropdown-item" id="hf-export-pdf">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
          导出 PDF
        </button>
        <button class="hf-dropdown-item" id="hf-export-image">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
          导出长图
        </button>
        <div class="hf-dropdown-divider"></div>
        <button class="hf-dropdown-item" id="hf-copy-wechat">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          复制公众号排版
        </button>
      </div>
    </div>`;
  document.body.insertAdjacentHTML('beforeend', shareHtml);

  document.getElementById('hf-share-toggle').addEventListener('click', (e) => {
    e.stopPropagation();
    const dd = document.getElementById('hf-share-dropdown');
    closeAllDropdowns();
    dd.classList.toggle('open');
  });

  // PDF: use browser print dialog
  document.getElementById('hf-export-pdf').addEventListener('click', () => {
    closeAllDropdowns();
    toast('正在打开打印对话框…');
    setTimeout(() => window.print(), 300);
  });

  // Image: html2canvas → PNG download
  document.getElementById('hf-export-image').addEventListener('click', async () => {
    closeAllDropdowns();
    toast('正在生成长图…');
    try {
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

  // ── Settings FAB (bottom-right) ──
  // Lucide: sliders-horizontal icon
  const colorSwatches = theme.colors.map((c, i) =>
    `<div class="hf-swatch${i === 0 ? ' active' : ''}" data-accent="${c.accent}" data-accent-bright="${c.accentBright || ''}" data-accent-on="${c.accentOn || '#ffffff'}" style="background:${c.accent}" title="${c.name}"></div>`
  ).join('');

  const fontOptions = theme.fonts.map((f, i) =>
    `<button class="hf-font-option${i === 0 ? ' active' : ''}" data-family="${f.family}" data-weight="${f.weight}">
      <span class="font-preview" style="font-family:${f.family}">${style === 'magazine' ? '衬线' : 'Aa'}</span>
      <span class="font-name">${f.name}</span>
    </button>`
  ).join('');

  const fabHtml = `
    <div class="hf-fab">
      <button class="hf-fab-btn" id="hf-settings-toggle" title="设置">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></svg>
      </button>
      <div class="hf-dropdown" id="hf-settings-dropdown">
        <div class="hf-dropdown-label">配色</div>
        <div class="hf-swatches">${colorSwatches}</div>
        <div class="hf-dropdown-divider"></div>
        <div class="hf-dropdown-label">字体</div>
        <div class="hf-font-options">${fontOptions}</div>
      </div>
    </div>`;
  document.body.insertAdjacentHTML('beforeend', fabHtml);

  document.getElementById('hf-settings-toggle').addEventListener('click', (e) => {
    e.stopPropagation();
    const dd = document.getElementById('hf-settings-dropdown');
    closeAllDropdowns();
    dd.classList.toggle('open');
  });

  // Color switching
  document.querySelectorAll('.hf-swatch').forEach(swatch => {
    swatch.addEventListener('click', () => {
      document.querySelectorAll('.hf-swatch').forEach(s => s.classList.remove('active'));
      swatch.classList.add('active');
      const root = document.documentElement;
      root.style.setProperty('--accent', swatch.dataset.accent);
      if (swatch.dataset.accentBright) root.style.setProperty('--accent-bright', swatch.dataset.accentBright);
      root.style.setProperty('--accent-on', swatch.dataset.accentOn);
    });
  });

  // Font switching
  document.querySelectorAll('.hf-font-option').forEach(opt => {
    opt.addEventListener('click', () => {
      document.querySelectorAll('.hf-font-option').forEach(o => o.classList.remove('active'));
      opt.classList.add('active');
      const root = document.documentElement;
      if (style === 'magazine') {
        root.style.setProperty('--font-serif', opt.dataset.family);
      } else {
        root.style.setProperty('--font-sans', opt.dataset.family);
      }
      const fontName = opt.querySelector('.font-name').textContent;
      if (!document.querySelector(`link[data-hf-font="${fontName}"]`)) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.dataset.hfFont = fontName;
        link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontName)}:wght@200;300;400;500;600;700;800&display=swap`;
        document.head.appendChild(link);
      }
    });
  });

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
