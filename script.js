(() => {
  const root = document.documentElement;

  // Theme
  const themeToggle = document.getElementById('themeToggle');
  const stored = localStorage.getItem('theme');
  const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
  root.setAttribute('data-theme', stored || (prefersLight ? 'light' : 'dark'));
  themeToggle?.addEventListener('click', () => {
    const next = root.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    root.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
  });

  // Year
  const year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();

  // Clock in status bar
  const clock = document.getElementById('clock');
  const updateClock = () => {
    if (!clock) return;
    const d = new Date();
    clock.textContent = d.toTimeString().slice(0, 5);
  };
  updateClock();
  setInterval(updateClock, 30 * 1000);

  // Reveal on scroll
  const revealTargets = document.querySelectorAll('.section, .hero, .tree__node');
  revealTargets.forEach((el) => el.classList.add('reveal'));
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.05 }
  );
  revealTargets.forEach((el) => io.observe(el));

  // Hero typewriter
  const heroName = document.getElementById('heroName');
  if (heroName) {
    const target = heroName.firstChild.textContent; // before the cursor span
    const cursorEl = heroName.querySelector('.cursor');
    heroName.firstChild.textContent = '';
    let i = 0;
    const tick = () => {
      if (i <= target.length) {
        heroName.firstChild.textContent = target.slice(0, i);
        i++;
        setTimeout(tick, 70 + Math.random() * 40);
      }
    };
    setTimeout(tick, 300);
  }

  // Active tab highlighting on scroll
  const tabs = document.querySelectorAll('.tab');
  const sections = ['#about', '#projects', '#contact']
    .map((id) => document.querySelector(id))
    .filter(Boolean);
  const setActive = (id) => {
    tabs.forEach((t) => {
      t.classList.toggle('is-active', t.getAttribute('href') === id);
    });
  };
  let userScrolled = window.scrollY > 50;
  window.addEventListener('scroll', () => { userScrolled = true; }, { passive: true });
  const tabObserver = new IntersectionObserver(
    (entries) => {
      if (!userScrolled) return;
      entries.forEach((e) => {
        if (e.isIntersecting) setActive('#' + e.target.id);
      });
    },
    { rootMargin: '-40% 0px -50% 0px' }
  );
  sections.forEach((s) => tabObserver.observe(s));

  // Command palette
  const cmdk = document.getElementById('cmdk');
  const cmdkToggle = document.getElementById('cmdkToggle');
  const cmdkInput = document.getElementById('cmdkInput');
  const cmdkList = document.getElementById('cmdkList');

  const commands = [
    { icon: '›', label: 'Go to About', hint: 'about.md', action: () => scrollTo('#about') },
    { icon: '›', label: 'Go to Projects', hint: 'projects/', action: () => scrollTo('#projects') },
    { icon: '›', label: 'Go to Contact', hint: 'contact.txt', action: () => scrollTo('#contact') },
    { icon: '✉', label: 'Send email', hint: 'shununit6@gmail.com', action: () => (location.href = 'mailto:shununit6@gmail.com') },
    { icon: '⌥', label: 'Open GitHub', hint: 'github.com/Shununit6', action: () => window.open('https://github.com/Shununit6', '_blank', 'noopener') },
    { icon: '◐', label: 'Toggle theme', hint: 'dark ↔ light', action: () => themeToggle?.click() },
    { icon: '↑', label: 'Scroll to top', hint: '~/', action: () => scrollTo('#top') },
  ];

  let filtered = commands.slice();
  let activeIdx = 0;

  const scrollTo = (hash) => {
    const el = document.querySelector(hash);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    closeCmdk();
  };

  const renderList = () => {
    if (filtered.length === 0) {
      cmdkList.innerHTML = '<div class="cmdk__empty">no matches — try "about" or "projects"</div>';
      return;
    }
    cmdkList.innerHTML = filtered
      .map(
        (c, i) => `
      <li class="cmdk__item ${i === activeIdx ? 'is-active' : ''}" data-idx="${i}" role="option">
        <span class="cmdk__item-icon">${c.icon}</span>
        <span class="cmdk__item-label">${c.label}</span>
        <span class="cmdk__item-hint">${c.hint}</span>
      </li>`
      )
      .join('');
    cmdkList.querySelectorAll('.cmdk__item').forEach((li) => {
      li.addEventListener('click', () => {
        activeIdx = Number(li.dataset.idx);
        runActive();
      });
      li.addEventListener('mouseenter', () => {
        activeIdx = Number(li.dataset.idx);
        updateActive();
      });
    });
  };
  const updateActive = () => {
    cmdkList.querySelectorAll('.cmdk__item').forEach((li, i) => {
      li.classList.toggle('is-active', i === activeIdx);
    });
  };
  const runActive = () => {
    const c = filtered[activeIdx];
    if (c) c.action();
  };

  const filter = (q) => {
    const needle = q.trim().toLowerCase();
    filtered = !needle
      ? commands.slice()
      : commands.filter(
          (c) =>
            c.label.toLowerCase().includes(needle) ||
            c.hint.toLowerCase().includes(needle)
        );
    activeIdx = 0;
    renderList();
  };

  const openCmdk = () => {
    cmdk.hidden = false;
    cmdk.setAttribute('aria-hidden', 'false');
    filter('');
    setTimeout(() => cmdkInput.focus(), 0);
  };
  const closeCmdk = () => {
    cmdk.hidden = true;
    cmdk.setAttribute('aria-hidden', 'true');
    cmdkInput.value = '';
  };

  cmdkToggle?.addEventListener('click', openCmdk);
  cmdk?.querySelector('[data-close]')?.addEventListener('click', closeCmdk);
  cmdkInput?.addEventListener('input', (e) => filter(e.target.value));
  cmdkInput?.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      activeIdx = Math.min(filtered.length - 1, activeIdx + 1);
      updateActive();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      activeIdx = Math.max(0, activeIdx - 1);
      updateActive();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      runActive();
    } else if (e.key === 'Escape') {
      closeCmdk();
    }
  });

  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      if (cmdk.hidden) openCmdk();
      else closeCmdk();
    }
  });
})();
