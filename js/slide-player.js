/* Full-screen slide player. Slide: { title, text, points?, wide?, visual: { sim | fork | html } } */
(function () {
  const GL = window.GL, esc = GL.esc;
  let root = null, state = null;

  function mountVisual(el, v, onDone) {
    if (!v) return;
    if (v.sim) GL.mountSim(el, v.sim, onDone);
    else if (v.fork) GL.mountFork(el, v.fork, onDone);
    else if (v.submodule) GL.mountSubmodule(el, v.submodule, onDone);
    else if (v.html) el.innerHTML = typeof v.html === 'function' ? v.html() : v.html;
  }

  function show(i, dir) {
    const { lesson } = state, n = lesson.slides.length, sl = lesson.slides[i];
    state.i = i;
    const pts = (sl.points || []).map((p) => `<li>${p}</li>`).join('');
    const stage = root.querySelector('.pl-stage');
    stage.innerHTML = `<article class="slide${sl.wide ? ' is-wide' : ''} enter-${dir}">
      <div class="sl-text"><span class="sl-num">${String(i + 1).padStart(2, '0')} / ${String(n).padStart(2, '0')}</span>
        <h2>${sl.title}</h2>${sl.text ? `<p>${sl.text}</p>` : ''}${pts ? `<ul class="sl-points">${pts}</ul>` : ''}</div>
      <div class="sl-visual"></div></article>`;
    stage.scrollTop = 0;
    const next = root.querySelector('[data-next]');
    next.classList.remove('glow');
    mountVisual(stage.querySelector('.sl-visual'), sl.visual, () => next.classList.add('glow'));
    root.querySelector('[data-prev]').disabled = i === 0;
    next.innerHTML = i === n - 1 ? 'Hoàn thành ✓' : 'Tiếp →';
    root.querySelector('.pl-bar i').style.width = `${((i + 1) / n) * 100}%`;
    root.querySelectorAll('.pl-dots button').forEach((d, k) => d.classList.toggle('on', k === i));
  }

  function go(delta) {
    const n = state.lesson.slides.length, j = state.i + delta;
    if (j < 0) return;
    if (j >= n) { const cb = state.onFinish; close(); if (cb) cb(); return; }
    show(j, delta > 0 ? 'r' : 'l');
  }

  function close() {
    if (!root) return;
    root.remove(); root = null; state = null;
    document.body.classList.remove('no-scroll');
    document.removeEventListener('keydown', onKey);
  }

  function onKey(e) {
    if (!state || /INPUT|TEXTAREA/.test(document.activeElement.tagName)) return;
    if (e.key === 'ArrowRight') go(1);
    else if (e.key === 'ArrowLeft') go(-1);
    else if (e.key === 'Escape') close();
  }

  GL.openLesson = function (lesson, label, onFinish) {
    close();
    state = { lesson, i: 0, onFinish };
    root = document.createElement('div');
    root.className = 'player';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-label', lesson.title);
    root.innerHTML = `<header class="pl-head">
        <div class="pl-title"><span class="mono-tag">${esc(label)}</span><b>${esc(lesson.title)}</b></div>
        <div class="pl-dots">${lesson.slides.map((_, k) => `<button data-dot="${k}" aria-label="Slide ${k + 1}"></button>`).join('')}</div>
        <button class="btn ghost icon" data-close aria-label="Đóng">✕</button></header>
      <div class="pl-bar"><i></i></div>
      <div class="pl-stage"></div>
      <footer class="pl-foot"><button class="btn ghost" data-prev>← Trước</button>
        <span class="pl-key">phím ← → để chuyển · Esc để thoát</span>
        <button class="btn pri" data-next>Tiếp →</button></footer>`;
    root.addEventListener('click', (e) => {
      if (e.target.closest('[data-close]')) close();
      else if (e.target.closest('[data-next]')) go(1);
      else if (e.target.closest('[data-prev]')) go(-1);
      else if (e.target.closest('[data-dot]')) { const k = +e.target.closest('[data-dot]').dataset.dot; show(k, k > state.i ? 'r' : 'l'); }
    });
    document.body.appendChild(root);
    document.body.classList.add('no-scroll');
    document.addEventListener('keydown', onKey);
    show(0, 'r');
  };
})();
