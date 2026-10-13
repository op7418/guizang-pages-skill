/**
 * WeChat Export — translate Page HTML to WeChat-compatible inline-style HTML
 *
 * WeChat rules (verified):
 * - Inline styles ONLY (no <style>, no class, no CSS variables)
 * - visibility:visible; required on every style attribute
 * - <span leaf=""> wraps all text nodes
 * - <section> preferred over <div>
 * - NO position (absolute/relative/fixed — stripped by WeChat)
 * - NO id attributes (stripped)
 * - NO custom fonts (only system fonts: PingFang SC, Heiti, etc.)
 * - Units: px only (no em/rem/%)
 * - display: inline-block OK, flex partially OK, grid NOT OK
 * - line-height: 1.5-1.8 recommended
 * - background-color solid OK, gradient unreliable
 * - border, border-radius, box-shadow, opacity all OK
 * - padding/margin all OK in px
 * - max-width: 100% auto-applied to images
 */

function exportToWechat(containerEl) {
  const cs = getComputedStyle(document.documentElement);

  // Read computed CSS variable values
  const t = {
    fg: cs.getPropertyValue('--fg').trim() || '#0a0a0a',
    fg2: cs.getPropertyValue('--fg-secondary').trim() || '#525252',
    fg3: cs.getPropertyValue('--fg-tertiary').trim() || '#737373',
    bg: cs.getPropertyValue('--bg').trim() || '#fafaf8',
    bgCard: cs.getPropertyValue('--bg-card').trim() || '#f0f0ee',
    accent: cs.getPropertyValue('--accent').trim() || '#002FA7',
    accentOn: cs.getPropertyValue('--accent-on').trim() || '#ffffff',
  };

  // System-only fonts (custom fonts can't load in WeChat)
  const BODY = "-apple-system,'PingFang SC','Hiragino Sans GB','Microsoft YaHei',sans-serif";
  const MONO = "Menlo,Consolas,'Courier New',monospace";
  const V = 'visibility:visible;';

  function leaf(text) { return '<span leaf="">' + text + '</span>'; }

  // Standard wrappers
  function sec(style, inner) {
    return '<section style="' + style + V + '">' + inner + '</section>';
  }
  function container(inner) {
    return sec('max-width:640px;margin:0 auto;padding:0 16px;', inner);
  }
  function spacer(px) {
    return sec('max-width:640px;margin:0 auto;padding:' + px + 'px 0 0 0;font-size:0;line-height:0;', leaf('<br>'));
  }

  const out = [];

  // ── Chrome bar — use table for left/right alignment (flex unreliable in WeChat) ──
  const chromeBar = containerEl.querySelector('.doc-chrome-bar');
  if (chromeBar) {
    const leftParts = [];
    const rightParts = [];
    chromeBar.querySelectorAll('.chrome-l > *').forEach(el => {
      if (!el.classList.contains('chrome-sep')) leftParts.push(el.textContent.trim());
    });
    chromeBar.querySelectorAll('.chrome-r > *').forEach(el => {
      if (!el.classList.contains('chrome-sep')) rightParts.push(el.textContent.trim());
    });
    const leftText = leftParts.filter(Boolean).join(' · ');
    const rightText = rightParts.filter(Boolean).join(' · ');
    const S = 'font-family:' + MONO + ';font-size:12px;letter-spacing:2px;color:' + t.fg3 + ';padding:0;margin:0;white-space:nowrap;' + V;
    out.push(sec(
      'max-width:640px;margin:0 auto;padding:0;',
      '<table style="width:100%;border-collapse:collapse;background:' + t.bgCard + ';' + V + '"><tr>' +
      '<td style="padding:12px 16px;text-align:left;' + S + '">' + leaf(leftText) + '</td>' +
      '<td style="padding:12px 16px;text-align:right;' + S + '">' + leaf(rightText) + '</td>' +
      '</tr></table>'
    ));
    out.push(spacer(12));
  }

  // ── Chrome meta ──
  const chromeMeta = containerEl.querySelector('.doc-chrome-meta');
  if (chromeMeta) {
    const items = chromeMeta.querySelectorAll('.cm-item');
    const parts = [];
    items.forEach(item => {
      const key = item.querySelector('.cm-key');
      const val = item.querySelector('.cm-val');
      if (key && val) parts.push(key.textContent.trim() + ' ' + val.textContent.trim());
    });
    out.push(sec(
      'max-width:640px;margin:0 auto;padding:4px 16px 8px;font-family:' + MONO + ';font-size:11px;letter-spacing:1px;color:' + t.fg3 + ';',
      leaf(parts.join('  ·  '))
    ));
    out.push(spacer(28));
  }

  // ── Chrome tags ──
  const chromeTags = containerEl.querySelectorAll('.chrome-tag');
  if (chromeTags.length) {
    let tagsHtml = '';
    chromeTags.forEach(tag => {
      tagsHtml += '<span style="display:inline-block;font-family:' + MONO + ';font-size:11px;letter-spacing:1px;padding:3px 10px;margin:0 6px 6px 0;background:' + t.fg + ';color:' + t.bg + ';' + V + '">' + leaf(tag.textContent) + '</span>';
    });
    out.push(sec('max-width:640px;margin:0 auto;padding:0 16px 12px;', tagsHtml));
  }

  // ── Hero title ──
  const h1 = containerEl.querySelector('.hero h1, .hero-cover h1');
  if (h1) {
    out.push(spacer(28));
    out.push(sec(
      'max-width:640px;margin:0 auto;padding:0 16px;',
      '<p style="font-family:' + BODY + ';font-size:24px;font-weight:700;line-height:1.4;color:' + t.fg + ';margin:0 0 20px;' + V + '">' + leaf(h1.textContent) + '</p>'
    ));
  }

  const subtitle = containerEl.querySelector('.hero-subtitle');
  if (subtitle) {
    out.push(sec(
      'max-width:640px;margin:0 auto;padding:0 16px;',
      '<p style="font-family:' + BODY + ';font-size:15px;color:' + t.fg2 + ';line-height:1.75;margin:0 0 20px;' + V + '">' + leaf(subtitle.textContent) + '</p>'
    ));
    out.push(spacer(32));
  }

  // ── Sections ──
  containerEl.querySelectorAll('.section').forEach(section => {
    const h2 = section.querySelector('h2');
    if (h2) {
      // Spacer above divider + divider + spacer below
      out.push(spacer(20));
      out.push(sec('max-width:640px;margin:0 auto;padding:0 16px;', sec('border-top:1px solid ' + t.bgCard + ';height:0;', leaf('<br>'))));
      out.push(spacer(16));
      const num = section.querySelector('.section-number');
      const prefix = num ? num.textContent.trim() + '  ' : '';
      out.push(sec(
        'max-width:640px;margin:0 auto;padding:0 16px;',
        '<p style="font-family:' + BODY + ';font-size:20px;font-weight:700;line-height:1.4;color:' + t.fg + ';margin:0 0 24px;' + V + '">' + leaf(prefix + h2.textContent) + '</p>'
      ));
    }

    for (const el of section.children) {
      const tag = el.tagName.toLowerCase();
      const cls = el.className || '';

      if (cls.includes('section-header') || cls.includes('section-number') || tag === 'h2') continue;

      // ── H3 ──
      if (tag === 'h3') {
        out.push(spacer(28));
        out.push(sec(
          'max-width:640px;margin:0 auto;padding:0 16px;',
          '<p style="font-family:' + BODY + ';font-size:17px;font-weight:700;line-height:1.5;color:' + t.fg + ';margin:0 0 10px;' + V + '">' + leaf(el.textContent) + '</p>'
        ));
        continue;
      }

      // ── Paragraph ──
      if (tag === 'p') {
        out.push(sec(
          'max-width:640px;margin:0 auto;padding:0 16px;',
          '<p style="font-family:' + BODY + ';font-size:15px;color:' + t.fg + ';line-height:1.75;margin:0 0 20px;' + V + '">' + leaf(el.textContent) + '</p>'
        ));
        continue;
      }

      // ── Blockquote ──
      if (tag === 'blockquote') {
        out.push(sec(
          'max-width:640px;margin:0 auto;padding:0 16px;',
          sec(
            'background:' + t.bgCard + ';border-left:3px solid ' + t.accent + ';padding:14px 16px;margin:0 0 16px;',
            '<p style="font-family:' + BODY + ';font-size:15px;color:' + t.fg2 + ';line-height:1.75;margin:0;' + V + '">' + leaf(el.textContent.trim()) + '</p>'
          )
        ));
        continue;
      }

      // ── Highlight card ──
      if (cls.includes('highlight')) {
        const bodyP = el.querySelector('.hl-body p, p');
        const text = bodyP ? bodyP.textContent : el.textContent;
        out.push(sec(
          'max-width:640px;margin:0 auto;padding:0 16px;',
          sec(
            'background:' + t.accent + ';padding:16px 18px;margin:0 0 16px;',
            '<p style="font-family:' + BODY + ';font-size:15px;color:' + t.accentOn + ';line-height:1.75;margin:0;' + V + '">' + leaf(text) + '</p>'
          )
        ));
        continue;
      }

      // ── Pullquote ──
      if (cls.includes('pullquote')) {
        out.push(sec(
          'max-width:640px;margin:0 auto;padding:0 16px;',
          sec(
            'border-left:3px solid ' + t.accent + ';padding:14px 16px;margin:0 0 16px;',
            '<p style="font-family:' + BODY + ';font-size:17px;font-weight:300;color:' + t.fg + ';line-height:1.6;margin:0;' + V + '">' + leaf(el.textContent.trim()) + '</p>'
          )
        ));
        continue;
      }

      // ── Def card ──
      if (cls.includes('def-card')) {
        const term = el.querySelector('.def-card-term, .dc-term');
        const body = el.querySelector('.def-card-body, .dc-body');
        const termText = term ? term.textContent.replace(/^Term\s*/, '').trim() : '';
        const bodyText = body ? body.textContent : '';
        out.push(sec(
          'max-width:640px;margin:0 auto;padding:0 16px;',
          sec(
            'background:' + t.bgCard + ';padding:14px 16px;margin:0 0 20px;',
            '<p style="font-family:' + BODY + ';font-size:14px;color:' + t.fg + ';line-height:1.75;margin:0;' + V + '"><strong style="color:' + t.accent + ';font-weight:700;' + V + '">' + leaf(termText) + '</strong>' + leaf('：' + bodyText) + '</p>'
          )
        ));
        continue;
      }

      // ── Process steps ──
      if (cls.includes('process')) {
        out.push(spacer(28));
        el.querySelectorAll('.process-step').forEach((step, idx) => {
          const title = step.querySelector('.process-title');
          const desc = step.querySelector('.process-desc');
          out.push(sec(
            'max-width:640px;margin:0 auto;padding:0 16px;',
            sec(
              'background:' + t.bgCard + ';padding:12px 16px;margin:0 0 4px;',
              '<p style="font-family:' + BODY + ';font-size:14px;color:' + t.fg + ';line-height:1.75;margin:0;' + V + '"><span style="display:inline-block;font-family:' + MONO + ';font-size:12px;color:' + t.accentOn + ';background:' + t.accent + ';width:20px;height:20px;line-height:20px;text-align:center;margin-right:10px;' + V + '">' + (idx + 1) + '</span><strong style="font-weight:700;' + V + '">' + leaf(title ? title.textContent : '') + '</strong>' + leaf(desc ? '  ' + desc.textContent : '') + '</p>'
            )
          ));
        });
        continue;
      }

      // ── Lists ──
      if (tag === 'ul' || tag === 'ol') {
        el.querySelectorAll('li').forEach((li, idx) => {
          const marker = tag === 'ol'
            ? '<span style="font-family:' + MONO + ';font-size:13px;color:' + t.accent + ';margin-right:8px;' + V + '">' + (idx + 1) + '.</span>'
            : '<span style="font-size:15px;color:' + t.accent + ';margin-right:8px;' + V + '">•</span>';
          out.push(sec(
            'max-width:640px;margin:0 auto;padding:0 16px;',
            '<p style="font-family:' + BODY + ';font-size:15px;color:' + t.fg + ';line-height:1.75;margin:0 0 12px;' + V + '">' + marker + leaf(li.textContent) + '</p>'
          ));
        });
        continue;
      }

      // ── Table ──
      if (cls.includes('table-wrap') || tag === 'table') {
        const table = tag === 'table' ? el : el.querySelector('table');
        if (!table) continue;
        let html = '<table style="width:100%;border-collapse:collapse;font-family:' + BODY + ';font-size:14px;' + V + '">';
        const ths = table.querySelectorAll('th');
        if (ths.length) {
          html += '<thead><tr>';
          ths.forEach(th => {
            html += '<th style="background:' + t.fg + ';color:' + t.bg + ';font-weight:700;padding:10px 12px;border:1px solid ' + t.bgCard + ';text-align:left;' + V + '">' + leaf(th.textContent) + '</th>';
          });
          html += '</tr></thead>';
        }
        html += '<tbody>';
        table.querySelectorAll('tbody tr').forEach(tr => {
          html += '<tr>';
          tr.querySelectorAll('td').forEach(td => {
            html += '<td style="color:' + t.fg + ';padding:10px 12px;border:1px solid ' + t.bgCard + ';line-height:1.6;' + V + '">' + leaf(td.textContent) + '</td>';
          });
          html += '</tr>';
        });
        html += '</tbody></table>';
        out.push(sec('max-width:640px;margin:0 auto;padding:0 16px 14px;', html));
        continue;
      }

      // ── Summary card ──
      if (cls.includes('summary-card')) {
        const label = el.querySelector('.summary-label');
        if (label) {
          out.push(sec(
            'max-width:640px;margin:0 auto;padding:0 16px;',
            '<p style="display:inline-block;font-family:' + MONO + ';font-size:11px;color:' + t.accentOn + ';background:' + t.fg + ';padding:3px 10px;letter-spacing:1px;margin:0 0 10px;' + V + '">' + leaf(label.textContent) + '</p>'
          ));
        }
        el.querySelectorAll('.summary-item').forEach(item => {
          const title = item.querySelector('.summary-item-title');
          const desc = item.querySelector('.summary-item-desc');
          out.push(sec(
            'max-width:640px;margin:0 auto;padding:0 16px;',
            sec(
              'padding:8px 0;border-bottom:1px solid ' + t.bgCard + ';',
              '<p style="font-family:' + BODY + ';font-size:14px;color:' + t.fg + ';line-height:1.75;margin:0;' + V + '"><strong style="font-weight:700;' + V + '">' + leaf(title ? title.textContent : '') + '</strong>' + leaf(desc ? '：' + desc.textContent : '') + '</p>'
            )
          ));
        });
        continue;
      }

      // ── Aside card ──
      if (cls.includes('aside-card')) {
        const title = el.querySelector('.aside-title');
        const body = el.querySelector('.aside-content p');
        out.push(sec(
          'max-width:640px;margin:0 auto;padding:0 16px;',
          sec(
            'background:' + t.bgCard + ';padding:14px 16px;margin:0 0 20px;',
            '<p style="font-family:' + MONO + ';font-size:11px;color:' + t.accent + ';letter-spacing:1px;margin:0 0 6px;' + V + '">' + leaf(title ? title.textContent : '') + '</p>' +
            '<p style="font-family:' + BODY + ';font-size:14px;color:' + t.fg2 + ';line-height:1.75;margin:0;' + V + '">' + leaf(body ? body.textContent : '') + '</p>'
          )
        ));
        continue;
      }

      // ── Embed → text placeholder ──
      if (cls.includes('embed-card')) {
        const cap = el.querySelector('.embed-caption');
        if (cap) {
          out.push(sec(
            'max-width:640px;margin:0 auto;padding:0 16px;',
            '<p style="font-family:' + BODY + ';font-size:13px;color:' + t.fg3 + ';text-align:center;margin:0 0 20px;' + V + '">' + leaf('[图表] ' + cap.textContent) + '</p>'
          ));
        }
        continue;
      }

      // ── Figure ──
      if (cls.includes('figure-card') || tag === 'figure') {
        const img = el.querySelector('img');
        const cap = el.querySelector('figcaption');
        if (img && img.src) {
          out.push(sec(
            'max-width:640px;margin:0 auto;padding:0 16px 8px;',
            '<img src="' + img.src + '" style="max-width:100%;height:auto;display:block;' + V + '" />' +
            (cap ? '<p style="font-family:' + BODY + ';font-size:12px;color:' + t.fg3 + ';text-align:center;margin:8px 0 0;line-height:1.6;' + V + '">' + leaf(cap.textContent) + '</p>' : '')
          ));
        }
        continue;
      }

      // ── Big numbers ──
      if (cls.includes('big-number-row')) {
        out.push(spacer(28));
        let html = '';
        el.querySelectorAll('.big-number').forEach(n => {
          const num = n.querySelector('.num');
          const label = n.querySelector('.label');
          html += '<span style="display:inline-block;text-align:center;padding:12px 20px;margin:0 6px 6px 0;background:' + t.accent + ';' + V + '">' +
            '<span style="display:block;font-size:24px;font-weight:800;color:' + t.accentOn + ';line-height:1;' + V + '">' + (num ? num.textContent : '') + '</span>' +
            '<span style="display:block;font-family:' + MONO + ';font-size:10px;color:' + t.accentOn + ';opacity:0.55;margin-top:6px;letter-spacing:1px;' + V + '">' + (label ? label.textContent : '') + '</span>' +
            '</span>';
        });
        out.push(sec('max-width:640px;margin:0 auto;padding:0 16px;', html));
        out.push(spacer(28));
        continue;
      }

      // ── Gallery → text list ──
      if (cls.includes('gallery')) {
        el.querySelectorAll('.gallery-grid-item, .gallery-item').forEach(item => {
          const cap = item.querySelector('.gallery-cap');
          if (cap) {
            out.push(sec(
              'max-width:640px;margin:0 auto;padding:0 16px;',
              '<p style="font-family:' + BODY + ';font-size:13px;color:' + t.fg3 + ';margin:0 0 6px;' + V + '">' + leaf('▸ ' + cap.textContent) + '</p>'
            ));
          }
        });
        continue;
      }
    }
  });

  // Footer
  out.push(spacer(32));
  out.push(sec('max-width:640px;margin:0 auto;padding:0 16px;', sec('border-top:1px solid ' + t.bgCard + ';height:0;', leaf('<br>'))));
  out.push(sec('max-width:640px;margin:0 auto;padding:20px 16px 32px;', '<p style="font-family:' + MONO + ';font-size:11px;color:' + t.bgCard + ';text-align:center;letter-spacing:3px;margin:0;' + V + '">' + leaf('✦') + '</p>'));

  return '<section style="background:' + t.bg + ';padding:0;' + V + '">\n' + out.join('\n') + '\n</section>';
}

window._exportToWechat = exportToWechat;
