(function () {
  'use strict';

  // Theme options live in assets/themes.json; render.mjs writes the controls
  // into the HTML statically, so this file only wires up behaviour.
  const style = document.documentElement.dataset.hfStyle || 'swiss';
  const $ = (id) => document.getElementById(id);
  const STORE = 'hf-page-prefs:' + style;

  // ── Helpers ──
  function closeAllDropdowns() {
    document.querySelectorAll('.hf-dropdown.open').forEach(d => d.classList.remove('open'));
  }

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.hf-dropdown') && !e.target.closest('.hf-fab-btn')) {
      closeAllDropdowns();
    }
  });

  // PDF / long-image export is no longer in the page: the model runs scripts/export.mjs.

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
    // Background/surface palette follows the colour theme (tinted bg; dark theme = dark bg).
    // Clear vars set by the previous swatch first so stylesheet defaults come back.
    (root.dataset.hfVars || '').split(',').filter(Boolean).forEach(k => root.style.removeProperty(k));
    let vars = {};
    try { vars = JSON.parse(sw.dataset.vars || '{}'); } catch (_) {}
    Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v));
    root.dataset.hfVars = Object.keys(vars).join(',');
    root.dataset.scheme = sw.dataset.scheme || 'light';
    root.style.colorScheme = root.dataset.scheme;
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
