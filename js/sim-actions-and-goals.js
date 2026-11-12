/* Shared by both simulators: action registry, step-by-step goal tracker, conflict resolver panel. */
(function () {
  const GL = window.GL, esc = GL.esc;

  // "op:arg" key -> [label, run(sim, widget)]
  const ACTIONS = {
    edit: (a) => [`✎ Sửa ${a.split("/").pop()}`, (s) => s.edit(a)],
    stageAll: () => ['+ Stage tất cả', (s) => s.stage()],
    commit: () => ['✓ Commit', (s, w) => s.commit(w.commitMsg())],
    push: () => ['↑ Push', (s) => s.push()],
    pull: () => ['↓ Pull', (s) => s.pull()],
    fetch: () => ['⟳ Fetch', (s) => s.fetchCmd()],
    teammate: (a) => [`👤 Đồng nghiệp push (${a.split("/").pop()})`, (s) => s.teammatePush(a)],
    branch: (a) => [`⑂ Tạo nhánh ${a}`, (s) => s.branch(a)],
    checkout: (a) => [`↪ Sang ${a}`, (s) => s.checkout(a)],
    merge: (a) => [`⇢ Merge ${a}`, (s) => s.merge(a)],
    rebase: (a) => [`⤴ Rebase lên ${a}`, (s) => s.rebase(a)],
    reset: (a) => [`⏪ reset --${a}`, (s) => s.reset(a)],
    revert: () => ['↩ Revert HEAD', (s) => s.revert()],
    stash: () => ['▣ Stash', (s) => s.stash()],
    stashPop: () => ['▤ Stash pop', (s) => s.stashPop()],
    cherry: (a) => [`🍒 Cherry-pick đỉnh ${a}`, (s) => s.cherryPick(a)],
    abort: () => ['✕ Huỷ merge', (s) => s.abortMerge()],
  };
  GL.action = (key) => {
    const [op, arg] = key.split(':'), def = ACTIONS[op];
    if (!def) throw new Error(`Unknown action ${key}`);
    const [label, run] = def(arg);
    return { key, label, run };
  };

  // Goals unlock sequentially; a goal latches once its check passes.
  GL.GoalTracker = class {
    constructor(goals, onDone) { this.goals = goals || []; this.i = 0; this.onDone = onDone; }
    update(sim, widget) {
      const before = this.i;
      while (this.i < this.goals.length && this.goals[this.i].check(sim, widget)) this.i++;
      if (before < this.goals.length && this.i === this.goals.length && this.onDone) this.onDone();
    }
    get hint() { return this.goals[this.i] && this.goals[this.i].hint; }
    html() {
      if (!this.goals.length) return '';
      const items = this.goals.map((g, k) => {
        const st = k < this.i ? 'done' : k === this.i ? 'now' : 'todo';
        return `<li class="goal is-${st}"><span class="goal-dot">${k < this.i ? '✓' : k + 1}</span>${g.text}</li>`;
      }).join('');
      const fin = this.i === this.goals.length ? '<div class="goal-fin">Xong rồi! Bấm <b>Tiếp →</b></div>' : '';
      return `<ol class="goals">${items}</ol>${fin}`;
    }
  };

  // Highlight elements for the current goal. hint = string or array; matches data-act exactly
  // or any token in a space-separated data-hint list.
  GL.applyPulse = function (root, hint) {
    root.querySelectorAll('.pulse').forEach((n) => n.classList.remove('pulse'));
    [].concat(hint || []).forEach((h) => {
      const q = JSON.stringify(h);
      root.querySelectorAll(`[data-act=${q}],[data-hint~=${q}]`).forEach((n) => { if (!n.disabled) n.classList.add("pulse"); });
    });
  };

  // Conflict resolver (classic widget)
  GL.conflictHtml = function (sim) {
    const c = sim.conflict;
    if (!c) return '';
    const files = c.files.map((f) => `
      <div class="cf-file">
        <div class="cf-name">⚠ ${esc(f)}</div>
        <pre class="cf-code"><span class="cf-m">&lt;&lt;&lt;&lt;&lt;&lt;&lt; HEAD (của bạn)</span>
<span class="cf-mine">tieu_de = "Phiên bản của BẠN"</span>
<span class="cf-m">=======</span>
<span class="cf-theirs">tieu_de = "Phiên bản của ${esc(c.label)}"</span>
<span class="cf-m">&gt;&gt;&gt;&gt;&gt;&gt;&gt; ${esc(c.label)}</span></pre>
        <div class="cf-btns" data-hint="resolve">
          <button class="btn sm" data-resolve="${esc(f)}|mine">Giữ của tôi</button>
          <button class="btn sm" data-resolve="${esc(f)}|theirs">Lấy của họ</button>
          <button class="btn sm" data-resolve="${esc(f)}|both">Giữ cả hai</button>
        </div>
      </div>`).join('');
    const done = !c.files.length
      ? '<p class="cf-ok">Đã xử lý hết → bấm <b>Commit</b> để hoàn tất merge.</p>' : '';
    return `<div class="conflict"><div class="cf-head"><b>Merge conflict</b><span>Cả hai bên cùng sửa một chỗ — Git không tự chọn được.</span>
      <button class="btn ghost sm" data-act="abort">Huỷ merge</button></div>${files}${done}</div>`;
  };

  // Click wiring common to both widgets (file chips, resolve buttons, actions)
  GL.bindCommonClicks = function (root, widget) {
    root.addEventListener('click', (e) => {
      const t = e.target.closest('[data-act],[data-stage],[data-unstage],[data-discard],[data-resolve]');
      if (!t || t.disabled) return;
      const s = widget.sim, d = t.dataset;
      if (d.act) GL.action(d.act).run(s, widget);
      else if (d.stage !== undefined) s.stage(d.stage || undefined);
      else if (d.unstage) s.unstage(d.unstage);
      else if (d.discard) s.discard(d.discard);
      else if (d.resolve) { const [f, ch] = d.resolve.split('|'); s.resolve(f, ch); }
    });
  };
})();
