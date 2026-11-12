/* Fork-style window chrome (Windows title bar, toolbar, repo tabs, conflict banner) and left sidebar. */
(function () {
  const GL = window.GL, esc = GL.esc, FK = GL.FK, I = FK.icon;

  // Commits the local branch has that its remote doesn't (ahead) and known remote commits it lacks (behind)
  FK.aheadBehind = (s, b) => {
    const r = s.remote && s.remote.branches[b];
    if (!r || !s.branches[b]) return { ahead: 0, behind: 0 };
    const L = s.ancestors(s.branches[b]), R = s.ancestors(r);
    return { ahead: [...L].filter((c) => !R.has(c)).length, behind: [...R].filter((c) => s.known.has(c) && !L.has(c)).length };
  };

  const tool = (fk, icon, label, badge, extra = '') =>
    `<button class="ft-btn" data-fk="${fk}" data-hint="tb-${fk}"${extra}>${icon}${badge ? `<i class="ft-badge">${badge}</i>` : ''}<span>${label}</span></button>`;

  FK.chrome = (s, repo) => {
    const ab = FK.aheadBehind(s, s.head);
    return `<div class="fw-title"><nav class="fw-menu"><span>File</span><span>View</span><span>Repository</span><span>Window</span><span>Help</span></nav>
        <b>Fork</b><div class="fw-sys"><span>${I.bell}</span><span>${I.smile}</span><span class="fw-win">${I.win.min}</span><span class="fw-win">${I.win.max}</span><span class="fw-win x">${I.win.close}</span></div></div>
      <div class="ft">
        <button class="ft-btn ft-ico">${I.sidebar}</button>
        <button class="ft-btn">${I.launch}<span>Quick Launch</span></button>
        ${tool('fetch', I.fetch, 'Fetch')}${tool('pull', I.pull, 'Pull', ab.behind)}${tool('push', I.push, 'Push', ab.ahead)}${tool('stash', I.stash, 'Stash')}
        <div class="ft-repo"><span class="ft-lines">≡</span><div><b>${esc(repo)}</b><small>${I.branchSm} ${esc(s.head)}</small></div></div>
        ${tool('branch', I.branch, 'Branch')}
        <span class="ft-gap"></span>
        <button class="ft-btn">${I.openIn}<span>Open in</span></button><button class="ft-btn">${I.console}<span>Console</span></button><button class="ft-btn">${I.appearance}<span>Appearance</span></button>
      </div>
      <div class="fw-tabs"><span>art-assets</span><span>game-client</span><span class="on">${esc(repo)}</span><span>tools</span><b>+</b></div>`;
  };

  FK.banner = (s) => s.conflict
    ? `<div class="fw-banner"><span><i class="fw-warn">⚠</i> Merging branch '<a>${esc(s.conflict.label)}</a>' into '<a>${esc(s.head)}</a>'. Fix ${s.conflict.files.length} conflict${s.conflict.files.length === 1 ? '' : 's'} and then continue.</span>
        <button data-fk="abort" data-hint="cf-abort">Abort</button></div>` : '';

  function branchRows(s) {
    const groups = {};
    Object.keys(s.branches).forEach((b) => { const k = b.includes('/') ? b.split('/')[0] : ''; (groups[k] = groups[k] || []).push(b); });
    const row = (b, depth) => {
      const cur = b === s.head, ab = FK.aheadBehind(s, b), leaf = b.includes('/') ? b.split('/').slice(1).join('/') : b;
      const cnt = `${ab.ahead ? `${ab.ahead}↑` : ''}${ab.behind ? ` ${ab.behind}↓` : ''}`;
      return `<div class="fs-row${cur ? ' cur' : ''}" style="--dp:${depth}" data-branch="${esc(b)}" data-hint="branch:${esc(b)}${cur ? '' : ' branch-row'}">
        <span class="fs-ic">${cur ? '✓' : I.branchSm}</span><span class="fs-name">${esc(leaf)}</span>${cnt ? `<em>${cnt}</em>` : ''}</div>`;
    };
    return Object.entries(groups).map(([g, list]) => g
      ? `<div class="fs-row" style="--dp:1"><span class="fs-ic">${I.chevD}</span>${I.folder}<span class="fs-name">${esc(g)}</span></div>${list.map((b) => row(b, 2)).join('')}`
      : list.map((b) => row(b, 1)).join('')).join('');
  }

  FK.sidebar = (s, w, repo) => {
    const n = s.work.length + s.staged.length + (s.conflict ? s.conflict.files.length : 0);
    const remotes = s.remote ? `<div class="fs-row" style="--dp:1"><span class="fs-ic">${I.chevD}</span>${I.remote}<span class="fs-name">origin</span></div>
      ${Object.keys(s.remote.branches).map((b) => `<div class="fs-row" style="--dp:2"><span class="fs-ic">${I.branchSm}</span><span class="fs-name">${esc(b)}</span></div>`).join('')}` : '';
    const stashes = s.stashes.map((st, i) => `<div class="fs-row" style="--dp:1" data-stash="${i}" data-hint="stash-row"><span class="fs-ic">${I.stash}</span>
      <span class="fs-name">stash@{${s.stashes.length - 1 - i}}: WIP on ${esc(s.head)}</span></div>`).reverse().join('');
    return `<div class="fs-repo"><b>${esc(repo)}</b>${I.gear}</div>
      <div class="fs-nav${w.view === 'changes' ? ' on' : ''}" data-view="changes" data-hint="nav-changes">${I.local}Local Changes${n ? ` (${n})` : ''}</div>
      <div class="fs-nav${w.view === 'commits' ? ' on' : ''}" data-view="commits" data-hint="nav-commits">${I.history}All Commits</div>
      <div class="fs-tools"><span class="on">${I.branchSm}</span><span>${I.search}</span><span>${I.remote}</span></div>
      <div class="fs-filter">${I.search}<span>Filter</span></div>
      <div class="fs-tree">
        <div class="fs-h"><span class="fs-ic">${I.chevD}</span>Branches</div>${branchRows(s)}
        <div class="fs-h"><span class="fs-ic">${s.remote ? I.chevD : I.chevR}</span>Remotes</div>${remotes}
        <div class="fs-h"><span class="fs-ic">${I.chevR}</span>Tags</div>
        <div class="fs-h"><span class="fs-ic">${s.stashes.length ? I.chevD : ''}</span>Stashes</div>${stashes}
      </div>`;
  };
})();
