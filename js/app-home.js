/* Home page: mode picker, lesson grid, progress (localStorage), theme toggle, hero graph. */
(function () {
  const GL = window.GL, esc = GL.esc;
  const MODES = [
    { id: 'basic', name: 'Cơ bản', who: 'Art, QA, PM, design — ai cũng học được', icon: '🌱', lessons: GL.LESSONS_BASIC },
    { id: 'advanced', name: 'Chuyên sâu', who: 'Cho dev — internals, rebase, reset', icon: '⚙️', lessons: GL.LESSONS_ADVANCED },
    { id: 'fork', name: 'Dùng app GUI', who: 'Bấm chuột trên giao diện kiểu Fork', icon: '🖱️', lessons: GL.LESSONS_FORK },
  ];
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage blocked: ignore */ } },
  };
  let mode = store.get('gl-mode', 'basic');
  let done = store.get('gl-done', {});
  if (!MODES.some((m) => m.id === mode)) mode = 'basic';

  const $ = (q) => document.querySelector(q);
  const doneCount = (m) => m.lessons.filter((l) => done[l.id]).length;

  function renderModes() {
    $('#modes').innerHTML = MODES.map((m) => `
      <button class="mode${m.id === mode ? ' on' : ''}" data-mode="${m.id}" aria-pressed="${m.id === mode}">
        <span class="mode-ico">${m.icon}</span><span class="mode-txt"><b>${m.name}</b><small>${m.who}</small></span>
        <span class="mode-prog mono">${doneCount(m)}/${m.lessons.length}</span></button>`).join('');
  }

  function renderLessons() {
    const m = MODES.find((x) => x.id === mode);
    $('#lessons-title').textContent = `${m.name} · ${m.lessons.length} bài`;
    $('#lessons').innerHTML = m.lessons.map((l, i) => {
      const n = l.slides.length, sims = l.slides.filter((s) => s.visual && (s.visual.sim || s.visual.fork || s.visual.submodule)).length;
      return `<article class="card${done[l.id] ? ' is-done' : ''}" style="--d:${i * 0.04}s">
        <div class="card-top"><span class="mono num">${String(i + 1).padStart(2, '0')}</span>${done[l.id] ? '<span class="tick">✓ Đã học</span>' : ''}</div>
        <h3>${esc(l.title)}</h3><p>${esc(l.desc)}</p>
        <div class="tags">${l.tags.map((t) => `<span>${esc(t)}</span>`).join('')}</div>
        <div class="card-foot"><span class="mono meta">${n} slide${sims ? ` · ${sims} mô phỏng` : ''}</span>
          <button class="btn pri sm" data-open="${l.id}">${done[l.id] ? 'Học lại' : 'Bắt đầu học'} →</button></div></article>`;
    }).join('');
  }

  function open(id) {
    const m = MODES.find((x) => x.id === mode), idx = m.lessons.findIndex((l) => l.id === id);
    GL.openLesson(m.lessons[idx], `${m.name.toUpperCase()} · BÀI ${String(idx + 1).padStart(2, '0')}`, () => {
      done[id] = true; store.set('gl-done', done); renderModes(); renderLessons();
    });
  }

  function heroGraph() {
    const s = new GL.GitSim();
    s.silently((x) => {
      x.quick('a', 'Bắt đầu'); x.setupRemote(); x.branch('feature'); x.quick('b', 'Thử ý tưởng'); x.checkout('main');
      x.quick('c', 'Sửa lỗi'); x.checkout('feature'); x.quick('d', 'Hoàn thiện'); x.checkout('main'); x.merge('feature'); x.push();
    });
    $('#hero-graph').innerHTML = GL.renderGraph(s);
  }

  function applyTheme(t) {
    if (t) document.documentElement.dataset.theme = t; else delete document.documentElement.dataset.theme;
  }

  document.addEventListener('click', (e) => {
    const m = e.target.closest('[data-mode]'), o = e.target.closest('[data-open]');
    if (m) { mode = m.dataset.mode; store.set('gl-mode', mode); renderModes(); renderLessons(); }
    if (o) open(o.dataset.open);
    if (e.target.closest('#theme')) {
      const dark = document.documentElement.dataset.theme
        ? document.documentElement.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
      const next = dark ? 'light' : 'dark';
      applyTheme(next); store.set('gl-theme', next);
    }
    if (e.target.closest('#start')) { $('#learn').scrollIntoView({ behavior: 'smooth' }); }
  });

  applyTheme(store.get('gl-theme', null));
  heroGraph(); renderModes(); renderLessons();
})();
