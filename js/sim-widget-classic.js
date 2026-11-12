/* Classic simulator: 4 zones (Working → Staging → Local → Remote) + commit graph + terminal log.
   cfg: { setup(sim), actions:[keys], goals:[{text,check,hint}], discard:bool, zones:bool } */
(function () {
  const GL = window.GL, esc = GL.esc;
  const KIND = { M: 'sửa', A: 'mới' };

  function chips(items, mode, allowDiscard) {
    if (!items.length) return '<span class="zone-empty">trống</span>';
    return items.map((it) => {
      const main = mode === 'work'
        ? `<button class="chip-main" data-stage="${esc(it.file)}" title="Bấm để stage">${esc(it.file)}</button>`
        : `<button class="chip-main" data-unstage="${esc(it.file)}" title="Bấm để bỏ stage">${esc(it.file)}</button>`;
      const x = mode === 'work' && allowDiscard ? `<button class="chip-x" data-discard="${esc(it.file)}" data-hint="discard" title="Discard">×</button>` : '';
      return `<span class="chip k-${it.kind}" data-hint="chip-${mode}"><i>${KIND[it.kind]}</i>${main}${x}</span>`;
    }).join('');
  }

  function zonesHtml(s, cfg) {
    const c = s.headCommit, count = s.ancestors(s.headId).size;
    let remote = '';
    if (s.remote) {
      const rb = s.remote.branches[s.head] ? s.head : 'main', tip = s.remote.branches[rb], unseen = s.remoteAhead();
      const localOnly = s.ancestors(s.headId).size - s.ancestors(tip).size;
      const badge = unseen ? `<div class="badge warn">+${unseen} commit mới chưa tải về</div>`
        : !s.isAncestor(tip, s.headId) ? '<div class="badge warn">có commit chưa gộp → pull</div>'
        : localOnly > 0 ? `<div class="badge info">bạn đi trước ${localOnly} commit → push</div>` : '<div class="badge ok">đồng bộ ✓</div>';
      remote = `<div class="arrow"><span>push ↑</span><span>↓ pull</span></div>
        <div class="zone z-remote"><h5>Remote <small>GitHub/GitLab</small></h5>
          <div class="z-commit"><b>origin/${esc(rb)}</b><span>${esc(s.commits[tip].msg)}</span></div>${badge}</div>`;
    }
    return `<div class="zones${s.remote ? '' : ' no-remote'}">
      <div class="zone z-work"><h5>Working <small>thư mục làm việc</small></h5><div class="chips">${chips(s.work, 'work', cfg.discard)}</div></div>
      <div class="arrow"><span>git add →</span></div>
      <div class="zone z-stage"><h5>Staging <small>chuẩn bị lưu</small></h5><div class="chips">${chips(s.staged, 'stage')}</div></div>
      <div class="arrow"><span>git commit →</span></div>
      <div class="zone z-local"><h5>Local repo <small>máy bạn</small></h5>
        <div class="z-commit"><b>⑂ ${esc(s.head)}</b><span>${esc(c.msg)}</span></div><div class="badge">${count} commit</div></div>
      ${remote}</div>`;
  }

  function termHtml(s) {
    const lines = s.log.slice(-5).map((l) => `<div class="t-line"><span class="t-cmd${l.cmd.startsWith('#') ? ' t-cm' : ''}">${l.cmd.startsWith('#') ? '' : '$ '}${esc(l.cmd)}</span>
      <span class="t-out ${l.ok ? 'ok' : 'err'}">${esc(l.msg)}</span></div>`).join('');
    return lines || '<div class="t-line t-cm">Bấm một nút bên dưới để bắt đầu…</div>';
  }

  GL.mountSim = function (el, cfg, onDone) {
    const w = { sim: null, maxN: 0 };
    const goals = new GL.GoalTracker(cfg.goals, onDone);
    const acts = (cfg.actions || []).map(GL.action);
    const hasCommit = (cfg.actions || []).includes('commit');
    el.innerHTML = `<div class="sim">
      <div class="sim-goals"></div>
      ${cfg.zones === false ? '' : '<div class="sim-zones"></div>'}
      <div class="sim-conflict"></div>
      <div class="sim-graph"></div>
      <div class="sim-bar">
        ${hasCommit ? '<input class="msg" maxlength="60" placeholder="Lời nhắn commit (tuỳ chọn)">' : ''}
        ${acts.map((a) => `<button class="btn" data-act="${a.key}">${esc(a.label)}</button>`).join('')}
        <button class="btn ghost" data-restart title="Làm lại từ đầu">↺</button>
      </div>
      <div class="sim-term"></div></div>`;
    const $ = (q) => el.querySelector(q), input = $('.msg');
    w.commitMsg = () => { const v = input ? input.value : ''; if (input) input.value = ''; return v; };

    function render() {
      const s = w.sim, newest = s.n - 1 > w.maxN ? s.n - 1 : -1;
      goals.update(s, w);
      $('.sim-goals').innerHTML = goals.html();
      if ($('.sim-zones')) $('.sim-zones').innerHTML = zonesHtml(s, cfg);
      $('.sim-conflict').innerHTML = GL.conflictHtml(s);
      const g = $('.sim-graph');
      g.innerHTML = GL.renderGraph(s, { newestN: newest });
      g.scrollLeft = g.scrollWidth;
      $('.sim-term').innerHTML = termHtml(s);
      w.maxN = s.n - 1;
      GL.applyPulse(el, goals.hint);
    }
    function start() {
      w.sim = new GL.GitSim();
      w.sim.silently((s) => cfg.setup && cfg.setup(s));
      w.maxN = w.sim.n - 1;
      w.sim.on(render);
      goals.i = 0;
      render();
    }
    GL.bindCommonClicks(el, w);
    $('[data-restart]').addEventListener('click', start);
    if (input) input.addEventListener('keydown', (e) => { if (e.key === 'Enter') w.sim.commit(w.commitMsg()); });
    start();
    return w;
  };
})();
