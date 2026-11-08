/* Learn C++ 中文 · 本地版交互 */
(function () {
  'use strict';

  const ROOT = document.body.dataset.root || '';
  const PAGE = document.body.dataset.page || '';
  const TYPE = document.body.dataset.type || '';
  const NAV = window.LCPP_NAV || null;
  const $ = (sel, ctx) => (ctx || document).querySelector(sel);
  const $$ = (sel, ctx) => Array.from((ctx || document).querySelectorAll(sel));
  const readKey = 'lcpp:read';
  const lastKey = 'lcpp:last';
  const recentKey = 'lcpp:recent';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function safeParse(s, fallback) {
    try { const v = JSON.parse(s); return v == null ? fallback : v; } catch { return fallback; }
  }
  function getRead() {
    const v = safeParse(localStorage.getItem(readKey) || '[]', []);
    return Array.isArray(v) ? v : [];
  }
  function setRead(href, on) {
    const set = new Set(getRead());
    if (on) set.add(href); else set.delete(href);
    try { localStorage.setItem(readKey, JSON.stringify([...set])); } catch {}
    document.dispatchEvent(new CustomEvent('lcpp:progress'));
    return set;
  }
  function isRead(href) { return getRead().includes(href); }
  function siteHref(href) { return ROOT + href; }
  function stripRoot(href) {
    return String(href || '').replace(/^\.\.\//, '').replace(/^\.\//, '').replace(/^\/+/, '').split('#')[0];
  }
  function fmtMinutes(m) {
    if (!m) return '';
    if (m >= 60) { const h = Math.floor(m / 60), r = m % 60; return h + ' 小时' + (r ? ' ' + r + ' 分' : ''); }
    return m + ' 分钟';
  }

  /* ---------------- theme ---------------- */
  const themeToggle = $('#theme-toggle');
  function currentTheme() { return document.documentElement.dataset.theme || 'light'; }
  function setTheme(t) {
    document.documentElement.dataset.theme = t;
    try { localStorage.setItem('lcpp:theme', t); } catch {}
    if (themeToggle) themeToggle.setAttribute('aria-label', t === 'dark' ? '切换到浅色模式' : '切换到深色模式');
  }
  if (themeToggle) {
    themeToggle.addEventListener('click', () => setTheme(currentTheme() === 'dark' ? 'light' : 'dark'));
  }
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  mq.addEventListener && mq.addEventListener('change', e => {
    if (!localStorage.getItem('lcpp:theme')) setTheme(e.matches ? 'dark' : 'light');
  });

  /* ---------------- font size ---------------- */
  const fontToggle = $('#font-toggle');
  const fontMenu = $('#font-menu');
  function setFont(size) {
    document.documentElement.dataset.font = size;
    try { localStorage.setItem('lcpp:font', size); } catch {}
    if (fontMenu) {
      $$('button[data-font]', fontMenu).forEach(b => {
        b.setAttribute('aria-checked', b.dataset.font === size ? 'true' : 'false');
      });
    }
  }
  if (fontToggle && fontMenu) {
    fontToggle.addEventListener('click', e => {
      e.stopPropagation();
      const open = fontMenu.hidden;
      fontMenu.hidden = !open;
      fontToggle.setAttribute('aria-expanded', String(open));
    });
    $$('button[data-font]', fontMenu).forEach(b => {
      b.addEventListener('click', () => { setFont(b.dataset.font); fontMenu.hidden = true; fontToggle.setAttribute('aria-expanded', 'false'); });
    });
    document.addEventListener('click', e => {
      if (!fontMenu.hidden && !fontMenu.contains(e.target) && !fontToggle.contains(e.target)) {
        fontMenu.hidden = true; fontToggle.setAttribute('aria-expanded', 'false');
      }
    });
  }
  setFont(localStorage.getItem('lcpp:font') || 'm');

  /* ---------------- sidebar ---------------- */
  const sidebar = $('#sidebar');
  const backdrop = $('.sidebar-backdrop');
  function closeSidebar() {
    document.body.classList.remove('sidebar-open');
    const btn = $('#menu-toggle');
    if (btn) btn.setAttribute('aria-expanded', 'false');
  }
  function openSidebar() {
    document.body.classList.add('sidebar-open');
    const btn = $('#menu-toggle');
    if (btn) btn.setAttribute('aria-expanded', 'true');
  }
  const menuBtn = $('#menu-toggle');
  if (menuBtn) menuBtn.addEventListener('click', () => {
    document.body.classList.contains('sidebar-open') ? closeSidebar() : openSidebar();
  });
  if (backdrop) backdrop.addEventListener('click', closeSidebar);
  const sidebarClose = $('#sidebar-close');
  if (sidebarClose) sidebarClose.addEventListener('click', closeSidebar);
  $$('.sidebar a').forEach(a => a.addEventListener('click', () => { if (window.innerWidth <= 1080) closeSidebar(); }));

  if (NAV && sidebar) {
    const navEl = $('#sidebar-nav');
    if (navEl) {
      const currentChapter = document.body.dataset.chapter || '';
      const parts = [];
      NAV.chapters.forEach(c => {
        let p = parts.find(x => x.name === c.part);
        if (!p) { p = { name: c.part, chapters: [] }; parts.push(p); }
        p.chapters.push(c);
      });
      const quick = `
        <div class="nav-quick">
          <a href="${siteHref('index.html')}" class="${TYPE === 'home' ? 'active' : ''}">
            ${icon('home')} 首页
          </a>
          <a href="${siteHref('catalog.html')}" class="${TYPE === 'catalog' ? 'active' : ''}">
            ${icon('list')} 完整目录
          </a>
          <a href="${siteHref(NAV.glossary.href)}" class="${TYPE === 'glossary' || TYPE === 'glossary-index' ? 'active' : ''}">
            ${icon('book')} 词汇表
          </a>
          <a href="${siteHref('quiz/')}">
            ${icon('quiz')} 习题库
          </a>
          <a href="${siteHref('app/moc.html')}" class="${PAGE === 'app/moc.html' ? 'active' : ''}">
            ${icon('map')} 内容地图
          </a>
        </div>`;
      let groups = '';
      parts.forEach(part => {
        groups += `<div class="nav-label">${esc(part.name)}</div>`;
        part.chapters.forEach(c => {
          const isCurrent = currentChapter === c.code || (PAGE === 'c' + c.code + '/index.html');
          const lessons = c.lessons.map(l => {
            const href = stripRoot(l.href);
            const active = PAGE === href;
            return `<li><a href="${siteHref(l.href)}" class="${active ? 'active' : ''}${isRead(href) ? ' read' : ''}" data-href="${esc(href)}">
              <span class="lnum">${esc(l.num || '·')}</span><span class="ltitle">${esc(l.title)}</span>
            </a></li>`;
          }).join('');
          groups += `<details class="nav-chapter ${isCurrent ? 'current' : ''}" data-code="${esc(c.code)}" ${isCurrent ? 'open' : ''}>
            <summary>
              <span class="num">${esc(c.code)}</span>
              <span class="nav-title">${esc(c.title)}</span>
              <span class="nav-count">${c.count}</span>
              ${icon('chevron', 'chev')}
            </summary>
            <ul class="nav-lessons">
              <li class="nav-overview"><a href="${siteHref(c.href)}">章节概览 · ${fmtMinutes(c.minutes)}</a></li>
              ${lessons}
            </ul>
          </details>`;
        });
      });
      navEl.innerHTML = quick + groups;
    }
    const foot = $('#sidebar-progress');
    if (foot) {
      foot.innerHTML = `
        <div class="progress-top"><span>学习进度</span><strong><span data-read-count>0</span> / ${NAV.stats.lessons}</strong></div>
        <div class="progress-track"><span data-progress-fill></span></div>`;
    }
    // 滚动到当前小节
    setTimeout(() => {
      const active = $('.nav-lessons a.active');
      if (active) {
        const scroller = $('.sidebar-scroll');
        if (scroller) {
          const top = active.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop;
          scroller.scrollTop = Math.max(0, top - scroller.clientHeight * 0.55);
        }
      }
    }, 60);
  }

  function icon(name, cls) {
    const c = cls ? ` class="${cls}"` : '';
    const icons = {
      home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m3 10 9-7 9 7v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/></svg>',
      list: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>',
      book: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>',
      map: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3z"/><path d="M9 3v15M15 6v15"/></svg>',
      quiz: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h3"/></svg>',
      chevron: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>',
    };
    return (icons[name] || '').replace('<svg', `<svg${c}`);
  }

  /* ---------------- reading progress / stats ---------------- */
  function updateStats() {
    const read = new Set(getRead());
    if (NAV) {
      const total = NAV.stats.lessons;
      $$('[data-read-count]').forEach(el => { el.textContent = Math.min(read.size, total); });
      $$('[data-progress-fill]').forEach(el => { el.style.width = (total ? Math.min(100, read.size / total * 100) : 0) + '%'; });
      $$('[data-stat-read]').forEach(el => { el.textContent = read.size; });
      $$('[data-stat-total]').forEach(el => { el.textContent = total; });
      if (NAV.chapters) {
        NAV.chapters.forEach(c => {
          const done = c.lessons.filter(l => read.has(stripRoot(l.href))).length;
          const pct = c.count ? done / c.count * 100 : 0;
          $$(`[data-chapter-progress="${c.code}"]`).forEach(el => { el.style.width = pct + '%'; });
          $$(`[data-chapter-pct="${c.code}"]`).forEach(el => { el.textContent = pct >= 99 ? '已完成' : done ? Math.round(pct) + '%' : ''; });
        });
      }
    }
    // 章节页
    $$('.lesson-list li[data-href]').forEach(li => {
      li.classList.toggle('is-read', read.has(stripRoot(li.dataset.href)));
    });
    const chapterBar = $('[data-chapter-bar]');
    if (chapterBar) {
      const items = $$('.lesson-list li[data-href]');
      const done = items.filter(li => read.has(stripRoot(li.dataset.href))).length;
      chapterBar.style.width = (items.length ? done / items.length * 100 : 0) + '%';
      const pct = $('[data-chapter-pct]');
      if (pct) pct.textContent = done + ' / ' + items.length;
    }
    // 侧栏小节状态
    $$('.nav-lessons a[data-href]').forEach(a => {
      a.classList.toggle('read', read.has(stripRoot(a.dataset.href)));
    });
    // MOC 任务列表
    $$('.task-list-item').forEach(li => {
      const input = li.querySelector('input[type="checkbox"]');
      const a = li.querySelector('a[href]');
      if (!input || !a) return;
      const href = stripRoot(a.getAttribute('href'));
      input.disabled = false;
      input.checked = read.has(href);
      input.dataset.readHref = href;
    });
    // 本页按钮
    if (TYPE === 'lesson') {
      const on = read.has(PAGE);
      $$('[data-read-toggle]').forEach(btn => {
        btn.classList.toggle('is-read', on);
        const label = btn.querySelector('[data-read-label]');
        if (label) label.textContent = on ? '已学完' : (btn.dataset.readLong ? '标记为已学完' : '标记已读');
        btn.setAttribute('aria-pressed', String(on));
      });
    }
  }
  document.addEventListener('lcpp:progress', updateStats);
  updateStats();

  /* ---------------- mark read ---------------- */
  $$('[data-read-toggle]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!PAGE) return;
      const on = !isRead(PAGE);
      setRead(PAGE, on);
      if (on) showToast('已标记为学完');
    });
  });
  function showToast(msg) {
    let t = $('#toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'toast';
      t.className = 'toast';
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(showToast._timer);
    showToast._timer = setTimeout(() => t.classList.remove('show'), 1800);
  }

  /* ---------------- last visit ---------------- */
  if (TYPE === 'lesson' && PAGE) {
    const item = {
      href: PAGE,
      title: document.body.dataset.title || document.title,
      chapter: document.body.dataset.chapterTitle || '',
      num: document.body.dataset.num || '',
      ts: Date.now(),
    };
    try { localStorage.setItem(lastKey, JSON.stringify(item)); } catch {}
    try {
      let recent = safeParse(localStorage.getItem(recentKey) || '[]', []);
      if (!Array.isArray(recent)) recent = [];
      recent = recent.filter(x => x && x.href !== PAGE);
      recent.unshift(item);
      localStorage.setItem(recentKey, JSON.stringify(recent.slice(0, 6)));
    } catch {}
  }
  const continueStrip = $('#continue-strip');
  if (continueStrip) {
    const last = safeParse(localStorage.getItem(lastKey) || 'null', null);
    if (last && last.href) {
      const title = $('#continue-title'), chapter = $('#continue-chapter'), link = $('#continue-link');
      if (title) title.textContent = (last.num ? last.num + ' · ' : '') + last.title;
      if (chapter) chapter.textContent = last.chapter || '';
      if (link) link.href = siteHref(last.href);
      continueStrip.hidden = false;
    }
  }

  /* ---------------- theme / font boot ---------------- */
  if (themeToggle) themeToggle.setAttribute('aria-label', currentTheme() === 'dark' ? '切换到浅色模式' : '切换到深色模式');

  /* ---------------- reading progress ---------------- */
  const bar = $('#reading-bar');
  const articleBody = $('.article-body');
  if (bar && articleBody) {
    let ticking = false;
    function updateProgress() {
      ticking = false;
      const rect = articleBody.getBoundingClientRect();
      const top = rect.top + window.scrollY;
      const height = Math.max(1, articleBody.offsetHeight - window.innerHeight * 0.65);
      const p = Math.max(0, Math.min(1, (window.scrollY - top + 120) / height));
      bar.style.width = (p * 100).toFixed(2) + '%';
      const toTop = $('#to-top');
      if (toTop) toTop.classList.toggle('show', window.scrollY > 700);
    }
    window.addEventListener('scroll', () => {
      if (!ticking) { ticking = true; requestAnimationFrame(updateProgress); }
    }, { passive: true });
    window.addEventListener('resize', updateProgress, { passive: true });
    updateProgress();
  }

  /* ---------------- TOC scroll spy ---------------- */
  const tocLinks = $$('.toc a[href^="#"], .article-toc-mobile a[href^="#"]');
  if (tocLinks.length) {
    const headings = tocLinks.map(a => {
      const id = decodeURIComponent(a.getAttribute('href').slice(1));
      return { id, el: document.getElementById(id), links: [] };
    }).filter(h => h.el);
    tocLinks.forEach(a => {
      const id = decodeURIComponent(a.getAttribute('href').slice(1));
      const h = headings.find(x => x.id === id);
      if (h) h.links.push(a);
    });
    let tocTick = false;
    function updateToc() {
      tocTick = false;
      let active = headings[0];
      const y = window.scrollY + (parseInt(getComputedStyle(document.documentElement).getPropertyValue('--header-h')) || 60) + 40;
      headings.forEach(h => { if (h.el.offsetTop <= y) active = h; });
      headings.forEach(h => h.links.forEach(a => a.classList.toggle('active', h === active)));
    }
    window.addEventListener('scroll', () => {
      if (!tocTick) { tocTick = true; requestAnimationFrame(updateToc); }
    }, { passive: true });
    updateToc();
  }

  /* ---------------- copy code ---------------- */
  $$('.copy-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const block = btn.closest('.codeblock');
      const code = block && block.querySelector('pre code');
      if (!code) return;
      const lineNodes = code.querySelectorAll('span[data-line]');
      const text = lineNodes.length ? Array.from(lineNodes).map(n => n.textContent).join('\n') : code.innerText;
      let ok = false;
      try {
        await navigator.clipboard.writeText(text);
        ok = true;
      } catch {
        try {
          const ta = document.createElement('textarea');
          ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
          document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); ok = true;
        } catch {}
      }
      if (ok) {
        const label = btn.querySelector('span');
        const old = label ? label.textContent : '';
        btn.classList.add('copied');
        if (label) label.textContent = '已复制';
        setTimeout(() => { btn.classList.remove('copied'); if (label) label.textContent = old || '复制'; }, 1600);
      }
    });
  });

  /* ---------------- search ---------------- */
  const searchModal = $('#search-modal');
  const searchInput = $('#search-input');
  const searchResults = $('#search-results');
  let searchData = null;
  let searchPromise = null;
  let searchActive = -1;
  let searchTimer = null;

  function loadSearchData() {
    if (window.LCPP_SEARCH) { searchData = window.LCPP_SEARCH; return Promise.resolve(searchData); }
    if (searchPromise) return searchPromise;
    searchPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = ROOT + 'assets/search-data.js';
      s.onload = () => { searchData = window.LCPP_SEARCH || []; resolve(searchData); };
      s.onerror = reject;
      document.head.appendChild(s);
    });
    return searchPromise;
  }
  function openSearch() {
    if (!searchModal) return;
    searchModal.hidden = false;
    document.body.classList.add('no-scroll');
    if (searchInput) { searchInput.value = ''; searchInput.focus(); }
    renderSearchEmpty();
    loadSearchData().then(() => { if (searchInput && searchInput.value.trim()) runSearch(searchInput.value); }).catch(() => {});
  }
  function closeSearch() {
    if (!searchModal) return;
    searchModal.hidden = true;
    document.body.classList.remove('no-scroll');
    searchActive = -1;
  }
  $$('#search-open').forEach(btn => btn.addEventListener('click', openSearch));
  const searchCloseBtn = $('.search-close');
  if (searchCloseBtn) searchCloseBtn.addEventListener('click', closeSearch);
  if (searchModal) {
    searchModal.addEventListener('click', e => { if (e.target === searchModal) closeSearch(); });
    if (searchInput) {
      searchInput.addEventListener('input', () => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => runSearch(searchInput.value), 90);
      });
      searchInput.addEventListener('keydown', e => {
        const items = $$('.search-result', searchResults);
        if (e.key === 'ArrowDown') { e.preventDefault(); moveSearch(1, items); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); moveSearch(-1, items); }
        else if (e.key === 'Enter') {
          e.preventDefault();
          const active = $('.search-result.active', searchResults) || items[0];
          if (active) location.href = active.getAttribute('href');
        } else if (e.key === 'Escape') { closeSearch(); }
      });
    }
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && !searchModal.hidden) closeSearch();
    });
  }
  function moveSearch(delta, items) {
    if (!items.length) return;
    searchActive = (searchActive + delta + items.length) % items.length;
    items.forEach((it, i) => it.classList.toggle('active', i === searchActive));
    items[searchActive].scrollIntoView({ block: 'nearest' });
  }
  function renderSearchEmpty() {
    if (!searchResults) return;
    const recent = safeParse(localStorage.getItem(recentKey) || '[]', []);
    let html = '';
    if (Array.isArray(recent) && recent.length) {
      html += '<div class="search-hint" style="padding-bottom:10px;text-align:left"><strong>最近阅读</strong></div>';
      html += recent.slice(0, 4).map(r => `<a class="search-result" href="${siteHref(r.href)}">
        <span class="res-type">课程</span>
        <span class="res-body"><span class="res-title">${esc((r.num ? r.num + ' · ' : '') + r.title)}</span>
        <span class="res-meta">${esc(r.chapter || '')}</span></span></a>`).join('');
      html += '<div class="search-hint" style="padding:16px 20px 8px">输入关键词搜索全部课程与术语<kbd style="margin-left:6px">Esc</kbd> 关闭</div>';
    } else {
      html = '<div class="search-hint">输入关键词，搜索 <strong>' + ((NAV && NAV.stats.lessons) || 359) + '</strong> 节课程与 <strong>' + ((NAV && NAV.stats.glossary) || 287) + '</strong> 个术语<br><span style="font-size:11px;opacity:.7">支持中英文、代码标识符</span></div>';
    }
    searchResults.innerHTML = html;
  }
  function runSearch(raw) {
    const q = String(raw || '').trim().toLowerCase();
    if (!q) { renderSearchEmpty(); searchActive = -1; return; }
    if (!searchData) { loadSearchData().then(() => runSearch(raw)).catch(() => {}); return; }
    const tokens = q.split(/\s+/).filter(Boolean);
    const found = [];
    for (const d of searchData) {
      const title = (d.t || '').toLowerCase();
      const headings = (d.h || '').toLowerCase();
      const text = (d.x || '').toLowerCase();
      const hay = title + ' ' + (d.n || '') + ' ' + (d.ch || '') + ' ' + headings + ' ' + text;
      if (!tokens.every(t => hay.includes(t))) continue;
      let score = 0;
      if (title.includes(q)) score += 120;
      for (const t of tokens) {
        if (title.includes(t)) score += 50;
        if (headings.includes(t)) score += 16;
        if (text.includes(t)) score += 6;
      }
      score -= Math.min(20, (d.n ? 0 : 0));
      found.push({ d, score });
    }
    found.sort((a, b) => b.score - a.score || (a.d.t || '').localeCompare(b.d.t || '', 'zh'));
    const top = found.slice(0, 40);
    searchActive = -1;
    if (!top.length) {
      searchResults.innerHTML = `<div class="search-empty">没有找到与 “${esc(raw)}” 相关的内容<br><span style="font-size:11px">试试更短的关键词，或搜索英文术语</span></div>`;
      return;
    }
    searchResults.innerHTML = top.map(({ d }) => {
      const snippet = makeSnippet(d, tokens);
      const typeLabel = d.ty === 'glossary' ? '术语' : '课程';
      return `<a class="search-result ${d.ty === 'glossary' ? 'glossary' : ''}" href="${siteHref(d.u)}">
        <span class="res-type">${typeLabel}</span>
        <span class="res-body">
          <span class="res-title">${highlight(titleOf(d), tokens)}</span>
          <span class="res-meta">${esc(d.n ? d.n + ' · ' : '')}${esc(d.ch || '')}</span>
          <span class="res-snip">${snippet}</span>
        </span>
      </a>`;
    }).join('');
    const first = $('.search-result', searchResults);
    if (first) first.classList.add('active');
    searchActive = 0;
  }
  function titleOf(d) { return d.t || ''; }
  function makeSnippet(d, tokens) {
    const text = d.x || '';
    if (!text) return '';
    const lower = text.toLowerCase();
    let idx = -1;
    for (const t of tokens) { const i = lower.indexOf(t); if (i >= 0 && (idx < 0 || i < idx)) idx = i; }
    if (idx < 0) idx = 0;
    const start = Math.max(0, idx - 48);
    let snip = text.slice(start, start + 190);
    if (start > 0) snip = '…' + snip;
    if (start + 190 < text.length) snip += '…';
    return highlight(snip, tokens);
  }
  function highlight(text, tokens) {
    let out = esc(text);
    const uniq = [...new Set(tokens.filter(Boolean))].sort((a, b) => b.length - a.length);
    for (const t of uniq) {
      if (!t) continue;
      const re = new RegExp(escapeReg(t), 'gi');
      out = out.replace(re, m => '\u0001' + m + '\u0002');
    }
    return out.replace(/\u0001/g, '<mark>').replace(/\u0002/g, '</mark>');
  }
  function escapeReg(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  document.addEventListener('keydown', e => {
    const tag = (e.target.tagName || '').toLowerCase();
    const typing = tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openSearch(); }
    else if (e.key === '/' && !typing && !e.ctrlKey && !e.metaKey && !e.altKey) { e.preventDefault(); openSearch(); }
    else if (e.key === 'Escape' && document.body.classList.contains('sidebar-open')) { closeSidebar(); }
    else if (!typing && !searchModal?.hidden) { /* noop */ }
    else if (!typing && (e.key === 'ArrowLeft' || e.key === 'ArrowRight') && !e.ctrlKey && !e.metaKey && !e.altKey) {
      const link = document.querySelector(e.key === 'ArrowLeft' ? 'link[rel="prev"]' : 'link[rel="next"]');
      if (link) location.href = link.href;
    }
  });

  /* ---------------- image lightbox ---------------- */
  let lightbox = null;
  function ensureLightbox() {
    if (lightbox) return lightbox;
    lightbox = document.createElement('div');
    lightbox.className = 'lightbox';
    lightbox.hidden = true;
    lightbox.innerHTML = '<button class="lightbox-close" aria-label="关闭">×</button><img alt="">';
    document.body.appendChild(lightbox);
    lightbox.addEventListener('click', e => {
      if (e.target === lightbox || e.target.classList.contains('lightbox-close')) closeLightbox();
    });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeLightbox(); });
    return lightbox;
  }
  function closeLightbox() {
    if (!lightbox) return;
    lightbox.hidden = true;
    document.body.classList.remove('no-scroll');
  }
  $$('.article-body img.zoomable').forEach(img => {
    img.addEventListener('click', () => {
      const lb = ensureLightbox();
      const big = lb.querySelector('img');
      big.src = img.currentSrc || img.src;
      big.alt = img.alt || '';
      lb.hidden = false;
      document.body.classList.add('no-scroll');
    });
  });

  /* ---------------- MOC task lists ---------------- */
  $$('.task-list-item input[type="checkbox"]').forEach(input => {
    input.addEventListener('change', () => {
      const href = input.dataset.readHref;
      if (href) setRead(href, input.checked);
    });
  });

  /* ---------------- glossary filter ---------------- */
  const gFilter = $('#glossary-filter');
  if (gFilter) {
    const cards = $$('.glossary-card');
    const count = $('#glossary-count');
    const empty = $('#glossary-empty');
    window.__filterGlossary = function () {
      const q = gFilter.value.trim().toLowerCase();
      let shown = 0;
      cards.forEach(c => {
        const hit = !q || (c.dataset.search || '').includes(q);
        c.hidden = !hit;
        if (hit) shown++;
      });
      if (count) count.textContent = shown + ' 条';
      if (empty) empty.hidden = shown !== 0;
    };
    gFilter.addEventListener('input', window.__filterGlossary);
    window.__filterGlossary();
  }

  /* ---------------- catalog filter ---------------- */
  const cFilter = $('#catalog-filter');
  if (cFilter) {
    const chapters = $$('.catalog-chapter');
    const count = $('#catalog-count');
    cFilter.addEventListener('input', () => {
      const q = cFilter.value.trim().toLowerCase();
      let shown = 0;
      chapters.forEach(ch => {
        let any = false;
        $$('.catalog-lessons li', ch).forEach(li => {
          const hit = !q || li.textContent.toLowerCase().includes(q);
          li.hidden = !hit;
          if (hit) { any = true; shown++; }
        });
        ch.hidden = !any;
      });
      if (count) count.textContent = shown + ' 节';
    });
  }

  /* ---------------- to top ---------------- */
  const toTop = $('#to-top');
  if (toTop) toTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

  /* ---------------- external links ---------------- */
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href]');
    if (!a) return;
    if (a.getAttribute('target') === '_blank' && !a.hasAttribute('rel')) a.setAttribute('rel', 'noopener noreferrer');
  });
})();
