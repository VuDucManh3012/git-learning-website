/* Fork-style (Windows, dark) Git client simulator. Real interactions: click to select, double-click,
   right-click context menus and confirm dialogs. Rendering lives in fork-ui-*.js.
   cfg: { setup(sim), events:[action keys happening outside the app], goals, view, newBranch } */
(function () {
  const GL = window.GL, esc = GL.esc, FK = GL.FK;
  const REPO = 'my-game';
  const row = (k, v) => `<div class="fdlg-row"><span>${k}</span><b>${esc(v)}</b></div>`;
  const tick = (label, on) => `<label class="fdlg-chk"><input type="checkbox" disabled ${on ? 'checked' : ''}> ${label}</label>`;

  GL.mountFork = function (el, cfg, onDone) {
    const w = {};
    const goals = new GL.GoalTracker(cfg.goals, onDone);
    const nb = cfg.newBranch || 'feature/shop';
    el.innerHTML = `<div class="sim-goals"></div>
      <div class="fw-scroll"><div class="fw"><div class="fw-chrome"></div><div class="fw-bslot"></div>
        <div class="fw-body"><aside class="fs"></aside><main class="fm"></main></div><div class="fw-over"></div></div></div>
      <div class="fk-events"><span>Bên ngoài app:</span>${(cfg.events || []).map((k) => `<button class="btn sm" data-act="${esc(k)}">${esc(GL.action(k).label)}</button>`).join('')}
        <button class="btn ghost sm" data-restart>↺ Làm lại</button></div>
      <div class="fk-log"></div>`;
    const $ = (q) => el.querySelector(q);

    const DIALOGS = {
      fetch: () => ({ title: 'Fetch', body: row('Remote', 'origin') + tick('Fetch all remotes', true), ok: 'Fetch', run: (s) => s.fetchCmd() }),
      pull: (s) => ({ title: 'Pull', body: row('Remote branch', `origin/${s.head}`) + row('Into', s.head) + tick('Rebase instead of merge', false), ok: 'Pull', run: () => s.pull() }),
      push: (s) => ({ title: 'Push', body: row('Branch', s.head) + row('To', `origin/${s.head}`) + tick('Force push', false), ok: 'Push', run: () => s.push() }),
      stash: () => ({ title: 'Stash Changes', body: '<input class="fdlg-in" placeholder="Message (tuỳ chọn)">', ok: 'Stash', run: (s) => s.stash() }),
      branch: () => ({ title: 'Create Branch', body: `<label class="fdlg-lb">Name<input class="fdlg-in" value="${esc(nb)}"></label>${tick('Check out after create', true)}`,
        ok: 'Create and Checkout', run: (s) => s.branch(($('.fdlg-in').value.trim() || nb).replace(/[^\w\-/.]/g, '-')) }),
      discard: (s, f) => ({ title: 'Discard Changes', danger: true, body: `<p>Discard thay đổi trong <b>${esc(f)}</b>?<br>Thao tác này <b>không thể hoàn tác</b>.</p>`, ok: 'Discard', run: () => s.discard(f) }),
      merge: (s, b) => ({ title: 'Merge', body: row('Merge', b) + row('Into', s.head), ok: 'Merge', run: () => s.merge(b) }),
    };
    const openDialog = (kind, arg) => { w.menu = null; w.dialog = DIALOGS[kind](w.sim, arg); render(); };

    function overlay() {
      if (w.dialog) {
        const d = w.dialog;
        return `<div class="fdlg-back"><div class="fdlg" role="dialog" aria-label="${esc(d.title)}"><div class="fdlg-h">${esc(d.title)}<button data-fk="dlg-cancel" aria-label="Đóng">✕</button></div>
          <div class="fdlg-b">${d.body}</div><div class="fdlg-f"><button data-fk="dlg-cancel">Cancel</button><button class="pri${d.danger ? ' danger' : ''}" data-fk="dlg-ok" data-hint="dlg-ok">${esc(d.ok)}</button></div></div></div>`;
      }
      if (w.menu) return `<div class="fmenu" style="left:${w.menu.x}px;top:${w.menu.y}px">${w.menu.items.map((it, i) => `<div data-mi="${i}" data-hint="${it.hint || ''}">${esc(it.label)}</div>`).join('')}</div>`;
      return '';
    }

    function syncCommitBtn() {
      const s = w.sim, b = $('.fc-cbtn'), sub = $('.fk-subject');
      if (!b) return;
      const ready = s.conflict ? !s.conflict.files.length : s.staged.length > 0;
      b.disabled = !ready || !sub.value.trim();
    }

    function render() {
      const s = w.sim, last = s.log[s.log.length - 1], justCommitted = last && last.ok && last.cmd.startsWith('git commit');
      const sub = $('.fk-subject'), desc = $('.fk-desc');
      let keepSub = sub && !justCommitted ? sub.value : '', keepDesc = desc && !justCommitted ? desc.value : '';
      if (s.conflict && !keepSub) { keepSub = `Merge branch '${s.conflict.label}' into ${s.head}`; keepDesc = `# Conflicts:\n#\t${s.conflict.files.join('\n#\t')}`; }
      goals.update(s, w);
      $('.sim-goals').innerHTML = goals.html();
      $('.fw-chrome').innerHTML = FK.chrome(s, REPO);
      $('.fw-bslot').innerHTML = FK.banner(s);
      $('.fs').innerHTML = FK.sidebar(s, w, REPO);
      $('.fm').innerHTML = w.view === 'changes' ? FK.localChanges(s, w) : FK.allCommits(s, w);
      $('.fw-over').innerHTML = overlay();
      if ($('.fk-subject')) { $('.fk-subject').value = keepSub; $('.fk-desc').value = keepDesc; }
      syncCommitBtn();
      $('.fk-log').innerHTML = last ? `<span>Lệnh git tương đương:</span><code>${esc(last.cmd)}</code><b class="${last.ok ? 'ok' : 'err'}">${esc(last.msg)}</b>` : '<span>Mỗi thao tác sẽ hiện lệnh git tương đương ở đây.</span>';
      GL.applyPulse(el, goals.hint);
    }

    function start() {
      Object.assign(w, { sim: new GL.GitSim(), view: cfg.view || 'changes', sel: null, selCommit: null, pickedCommit: false, menu: null, dialog: null, cfPick: { theirs: true, mine: true } });
      w.opened = new Set([w.view]);
      w.sim.silently((s) => cfg.setup && cfg.setup(s));
      w.sim.on(render);
      goals.i = 0;
      render();
    }

    function onFk(k) {
      const s = w.sim, sel = w.sel;
      if (DIALOGS[k] && ['fetch', 'pull', 'push', 'stash', 'branch'].includes(k)) return openDialog(k);
      if (k === 'dlg-ok') { const d = w.dialog; w.dialog = null; d.run(s); return render(); }
      if (k === 'dlg-cancel') { w.dialog = null; return render(); }
      if (k === 'stage') return sel && sel.area === 'unstaged' && s.work.some((x) => x.file === sel.file) ? s.stage(sel.file) : s.stage();
      if (k === 'unstage') return sel && sel.area === 'staged' ? s.unstage(sel.file) : [...s.staged].forEach((x) => s.unstage(x.file));
      if (k === 'commit') return s.commit($('.fk-subject').value);
      if (k === 'abort') return s.abortMerge();
      if (k === 'cf-theirs' || k === 'cf-mine') { const key = k.slice(3); w.cfPick[key] = !w.cfPick[key]; return render(); }
      if (k === 'cf-merge' && sel) {
        const p = w.cfPick, choice = p.theirs && p.mine ? 'both' : p.theirs ? 'theirs' : 'mine';
        w.sel = null; w.cfPick = { theirs: true, mine: true };
        return s.resolve(sel.file, choice);
      }
    }

    function contextMenu(e) {
      const t = e.target.closest('[data-file],[data-branch],[data-stash]');
      if (!t) return;
      e.preventDefault();
      const s = w.sim, d = t.dataset, items = [];
      if (d.file) {
        w.sel = { file: d.file, area: d.area };
        const isConflict = s.conflict && s.conflict.files.includes(d.file);
        if (d.area === 'staged') items.push({ label: 'Unstage', run: () => s.unstage(d.file) });
        else if (isConflict) items.push({ label: 'Resolve Conflict…', run: render });
        else items.push({ label: 'Stage', run: () => s.stage(d.file) }, { label: 'Discard Changes…', hint: 'menu-discard', run: () => openDialog('discard', d.file) });
      } else if (d.branch) {
        if (d.branch === s.head) items.push({ label: `Push '${d.branch}'…`, run: () => openDialog('push') });
        else items.push({ label: 'Checkout', hint: 'menu-checkout', run: () => s.checkout(d.branch) },
          { label: `Merge into '${s.head}'…`, hint: 'menu-merge', run: () => openDialog('merge', d.branch) });
      } else items.push({ label: 'Pop Stash', hint: 'menu-pop', run: () => s.stashPop() }, { label: 'Apply Stash', run: () => s.stashPop() });
      const r = $('.fw').getBoundingClientRect();
      w.menu = { x: e.clientX - r.left, y: e.clientY - r.top, items };
      render();
    }

    GL.bindCommonClicks(el, w); // "outside the app" event buttons (data-act)
    el.addEventListener('click', (e) => {
      const t = e.target;
      if (t.closest('[data-restart]')) return start();
      const mi = t.closest('[data-mi]');
      if (w.menu && !mi) { w.menu = null; render(); }
      if (mi) { const it = w.menu.items[+mi.dataset.mi]; w.menu = null; render(); return it.run(); }
      const fk = t.closest('[data-fk]'), v = t.closest('[data-view]'), f = t.closest('[data-file]'), c = t.closest('[data-commit]');
      if (fk && !fk.disabled) onFk(fk.dataset.fk);
      else if (v) { w.view = v.dataset.view; w.opened.add(w.view); render(); }
      else if (f) { w.sel = { file: f.dataset.file, area: f.dataset.area }; render(); }
      else if (c) { w.selCommit = c.dataset.commit; w.pickedCommit = true; render(); }
    });
    el.addEventListener('dblclick', (e) => {
      const f = e.target.closest('[data-file]'), b = e.target.closest('[data-branch]'), s = w.sim;
      if (f) { if (f.dataset.area === 'staged') s.unstage(f.dataset.file); else if (s.work.some((x) => x.file === f.dataset.file)) s.stage(f.dataset.file); }
      if (b && b.dataset.branch !== s.head) s.checkout(b.dataset.branch);
    });
    el.addEventListener('contextmenu', contextMenu);
    el.addEventListener('input', (e) => { if (e.target.classList.contains('fk-subject')) syncCommitBtn(); });
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && e.target.classList.contains('fk-subject') && !$('.fc-cbtn').disabled) w.sim.commit(e.target.value);
    });
    start();
    return w;
  };
})();
