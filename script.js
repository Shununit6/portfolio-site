(() => {
  const root = document.documentElement;
  const toggle = document.getElementById('themeToggle');
  const stored = localStorage.getItem('theme');
  const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
  const initial = stored || (prefersLight ? 'light' : 'dark');
  root.setAttribute('data-theme', initial);

  toggle?.addEventListener('click', () => {
    const next = root.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    root.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
  });

  const year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();

  const targets = document.querySelectorAll('.section, .hero, .card');
  targets.forEach((el) => el.classList.add('reveal'));

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    },
    { rootMargin: '0px 0px -10% 0px', threshold: 0.08 }
  );
  targets.forEach((el) => io.observe(el));

  // --- Edit mode ---
  const EDIT_KEY = 'portfolioEdits';
  const editToggle = document.getElementById('editToggle');
  const editorPanel = document.getElementById('editor');
  const editorBody = document.getElementById('editorBody');
  const editorClose = document.getElementById('editorClose');
  let editMode = false;
  let selected = null;

  const getState = () => {
    try { return JSON.parse(localStorage.getItem(EDIT_KEY) || '{}'); } catch { return {}; }
  };
  const setState = (s) => localStorage.setItem(EDIT_KEY, JSON.stringify(s));
  const saveEdit = (id, patch) => {
    const s = getState();
    s[id] = { ...(s[id] || {}), ...patch };
    setState(s);
  };

  // Assign IDs
  document.querySelectorAll('.hero, .section, .card').forEach((el, i) => {
    el.classList.add('editable');
    el.dataset.editId = el.dataset.editId || 'e' + i;
  });
  document.querySelectorAll(
    '.editable h1, .editable h2, .editable h3, .editable p, .editable li, .editable .hero__accent'
  ).forEach((el, i) => {
    el.dataset.textId = el.dataset.textId || 't' + i;
  });

  // Restore saved state
  const applyState = () => {
    const state = getState();
    Object.entries(state).forEach(([id, edit]) => {
      if (id.startsWith('__')) return;
      const el = document.querySelector(`[data-edit-id="${id}"], [data-text-id="${id}"]`);
      if (!el) return;
      if (edit.bg) el.style.backgroundColor = edit.bg;
      if (edit.color) el.style.color = edit.color;
      if (edit.fontSize) el.style.fontSize = edit.fontSize + 'px';
      if (edit.text !== undefined) el.innerHTML = edit.text;
    });
    const order = state.__order || {};
    if (order.projects) reorderChildren(document.querySelector('.projects'), order.projects);
    if (order.main) reorderChildren(document.querySelector('main'), order.main);
  };

  const reorderChildren = (parent, ids) => {
    if (!parent) return;
    ids.forEach((id) => {
      const el = parent.querySelector(`[data-edit-id="${id}"]`);
      if (el) parent.appendChild(el);
    });
  };

  const saveOrder = () => {
    const s = getState();
    s.__order = {
      projects: Array.from(document.querySelectorAll('.projects .card')).map(c => c.dataset.editId),
      main: Array.from(document.querySelectorAll('main > .hero, main > .section')).map(c => c.dataset.editId),
    };
    setState(s);
  };

  applyState();

  const setEditMode = (on) => {
    editMode = on;
    document.body.classList.toggle('edit-mode', on);
    editorPanel.hidden = !on;
    editToggle?.setAttribute('aria-pressed', String(on));
    if (!on) deselect();
    else renderHint();
  };

  const deselect = () => {
    if (selected) selected.classList.remove('selected');
    document.querySelectorAll('[contenteditable="true"]').forEach((el) => {
      el.contentEditable = 'false';
    });
    selected = null;
    if (editMode) renderHint();
  };

  const rgbToHex = (rgb) => {
    if (!rgb) return '#000000';
    if (rgb.startsWith('#')) return rgb.length === 7 ? rgb : '#000000';
    const m = rgb.match(/\d+/g);
    if (!m) return '#000000';
    return '#' + m.slice(0, 3).map((n) => Number(n).toString(16).padStart(2, '0')).join('');
  };

  const renderHint = () => {
    editorBody.innerHTML = `
      <p class="editor__hint">Click any section or card to select it. Click text inside a selected element to edit.</p>
      <button class="editor__reset" data-reset="all">RESET ALL</button>
    `;
    editorBody.querySelector('[data-reset="all"]').addEventListener('click', resetAll);
  };

  const renderFor = (el) => {
    const id = el.dataset.editId;
    const label = (el.querySelector('.section__title, .card__title, .hero__name')?.textContent || 'ELEMENT').trim();
    const bg = rgbToHex(el.style.backgroundColor || getComputedStyle(el).backgroundColor);
    const fg = rgbToHex(el.style.color || getComputedStyle(el).color);
    editorBody.innerHTML = `
      <p class="editor__target">» ${label.slice(0, 22).toUpperCase()}</p>
      <div class="editor__row"><label>BG</label><input type="color" data-k="bg" value="${bg}"></div>
      <div class="editor__row"><label>TEXT</label><input type="color" data-k="fg" value="${fg}"></div>
      <div class="editor__row"><label>SIZE</label>
        <button data-size="-2">A-</button>
        <button data-size="2">A+</button>
      </div>
      <div class="editor__row"><label>MOVE</label>
        <button data-move="up">↑ UP</button>
        <button data-move="down">↓ DN</button>
      </div>
      <button class="editor__reset" data-reset="1">RESET THIS</button>
      <button class="editor__reset" data-reset="all">RESET ALL</button>
    `;
    editorBody.querySelector('[data-k="bg"]').addEventListener('input', (e) => {
      el.style.backgroundColor = e.target.value;
      saveEdit(id, { bg: e.target.value });
    });
    editorBody.querySelector('[data-k="fg"]').addEventListener('input', (e) => {
      el.style.color = e.target.value;
      saveEdit(id, { color: e.target.value });
    });
    editorBody.querySelectorAll('[data-size]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const delta = Number(btn.dataset.size);
        const cur = parseFloat(el.style.fontSize) || parseFloat(getComputedStyle(el).fontSize);
        const next = Math.max(10, cur + delta);
        el.style.fontSize = next + 'px';
        saveEdit(id, { fontSize: next });
      });
    });
    editorBody.querySelectorAll('[data-move]').forEach((btn) => {
      btn.addEventListener('click', () => moveElement(el, btn.dataset.move));
    });
    editorBody.querySelector('[data-reset="1"]').addEventListener('click', () => resetOne(el));
    editorBody.querySelector('[data-reset="all"]').addEventListener('click', resetAll);
  };

  const moveElement = (el, dir) => {
    const target = dir === 'up' ? el.previousElementSibling : el.nextElementSibling;
    if (!target || !target.classList.contains('editable')) return;
    if (dir === 'up') el.parentNode.insertBefore(el, target);
    else el.parentNode.insertBefore(target, el);
    saveOrder();
  };

  const resetOne = (el) => {
    const id = el.dataset.editId;
    const state = getState();
    delete state[id];
    el.querySelectorAll('[data-text-id]').forEach((t) => { delete state[t.dataset.textId]; });
    setState(state);
    location.reload();
  };

  const resetAll = () => {
    if (!confirm('Reset all edits?')) return;
    localStorage.removeItem(EDIT_KEY);
    location.reload();
  };

  editToggle?.addEventListener('click', () => setEditMode(!editMode));
  editorClose?.addEventListener('click', () => setEditMode(false));

  document.addEventListener('click', (e) => {
    if (!editMode) return;
    if (e.target.closest('.editor, .nav, .footer')) return;
    const el = e.target.closest('.editable');
    if (!el) return;
    const textEl = e.target.closest('[data-text-id]');
    if (selected === el && textEl && textEl.contentEditable !== 'true') {
      textEl.contentEditable = 'true';
      textEl.focus();
      textEl.addEventListener('blur', () => {
        textEl.contentEditable = 'false';
        saveEdit(textEl.dataset.textId, { text: textEl.innerHTML });
      }, { once: true });
      return;
    }
    if (selected !== el) {
      deselect();
      selected = el;
      el.classList.add('selected');
      renderFor(el);
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && editMode) {
      if (selected) deselect();
      else setEditMode(false);
    }
  });
})();
