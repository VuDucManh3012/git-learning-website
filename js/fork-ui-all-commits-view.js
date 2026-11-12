/* Fork-style "All Commits" view: graph + commit rows on top, commit details panel below. */
(function () {
  const GL = window.GL, esc = GL.esc, FK = GL.FK, I = FK.icon;
  const ROW_H = 24;

  function refTags(s, refs, id) {
    return (refs[id] || []).map((r) => {
      const c = GL.laneColor(s, r.name);
      if (r.remote) return `<span class="fr remote" style="--c:${c}">${I.remote}${esc(r.name)}</span>`;
      return `<span class="fr${r.head ? ' head' : ''}" style="--c:${c}">${r.head ? '✓ ' : ''}${esc(r.name)}</span>`;
    }).join('');
  }

  function details(s, cm, refs) {
    const p = FK.person(cm.author);
    const files = cm.files.length ? cm.files : ['(merge commit — không đổi file riêng)'];
    const rlist = (refs[cm.id] || []).map((r) => `<span class="fd-ref">${esc(r.name)}</span>`).join('') || '—';
    return `<div class="fd-tabs"><span class="on">Commit</span><span>Changes</span><span>File Tree</span></div>
      <div class="fd-body">
        <div class="fd-author"><i class="fav big" style="background:${p.color}">${p.letter}</i>
          <div><small>AUTHOR</small><b>${p.name}</b> <span class="fd-mail">${p.email}</span><div class="fd-date">${FK.date(cm.n)} +07:00</div></div></div>
        <dl class="fd-meta"><dt>REFS</dt><dd>${rlist}</dd><dt>SHA</dt><dd><code>${FK.fullSha(cm.id)}</code></dd>
          <dt>PARENTS</dt><dd>${cm.parents.map((x) => `<a>${x.slice(0, 7)}</a>`).join(' ') || '—'}</dd></dl>
        <h4 class="fd-msg">${esc(cm.msg)}</h4>
        <div class="fd-files">${files.map((f) => `<div><span class="fc-chev">${I.chevR}</span>${cm.files.length ? '<i class="fb mod">M</i>' : ''}${I.file}<span>${esc(f)}</span></div>`).join('')}</div>
      </div>`;
  }

  FK.allCommits = (s, w) => {
    const vis = s.visible(), refs = GL.refsOf(s);
    if (!vis.some((c) => c.id === w.selCommit)) w.selCommit = s.headId;
    const gw = 18 + GL.usedLaneCount(s) * 16;
    const rows = [...vis].reverse().map((c) => {
      const p = FK.person(c.author);
      return `<div class="fh-row${c.id === w.selCommit ? ' sel' : ''}${c.id === s.headId ? ' head' : ''}" data-commit="${c.id}" data-hint="commit-row" style="height:${ROW_H}px">
        <span class="fh-msg">${refTags(s, refs, c.id)}<span>${esc(c.msg)}</span></span>
        <span class="fh-auth"><i class="fav" style="background:${p.color}">${p.letter}</i>${p.name}</span>
        <code>${c.id.slice(0, 7)}</code><span class="fh-date">${FK.date(c.n)}</span></div>`;
    }).join('');
    return `<div class="fh"><div class="fh-list" style="--gw:${gw}px"><div class="fh-graph">${GL.renderGraph(s, { vertical: true, rowH: ROW_H })}</div>${rows}</div>
      <div class="fh-detail">${details(s, s.commits[w.selCommit], refs)}</div></div>`;
  };
})();
