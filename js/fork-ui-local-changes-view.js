/* Fork-style "Local Changes" view: Unstaged/Staged file trees, diff viewer, merge-conflict pane, commit box. */
(function () {
  const GL = window.GL, esc = GL.esc, FK = GL.FK, I = FK.icon;
  const BADGE = { A: '<i class="fb add">+</i>', M: '<i class="fb mod">M</i>', C: '' };

  // Render file paths as a folder tree (folders first, like Fork)
  function tree(items, area, w) {
    const root = { dirs: {}, files: [] };
    items.forEach((it) => {
      const parts = it.file.split('/'); let node = root;
      parts.slice(0, -1).forEach((p) => { node = node.dirs[p] = node.dirs[p] || { dirs: {}, files: [] }; });
      node.files.push(it);
    });
    const render = (node, dp) => Object.keys(node.dirs).sort().map((d) =>
      `<div class="fc-row" style="--dp:${dp}"><span class="fc-chev">${I.chevD}</span>${I.folder}<span>${esc(d)}</span></div>${render(node.dirs[d], dp + 1)}`).join('')
      + node.files.map((it) => {
        const sel = w.sel && w.sel.file === it.file && w.sel.area === area;
        return `<div class="fc-row file${sel ? ' sel' : ''}" style="--dp:${dp}" data-file="${esc(it.file)}" data-area="${area}"
          data-hint="file-row row:${esc(it.file)}${it.kind === 'C' ? ' conflict-row' : ''}">${BADGE[it.kind]}${it.kind === 'C' ? '<span class="fc-warn">⚠</span>' : I.file}<span>${esc(it.file.split('/').pop())}</span></div>`;
      }).join('');
    return items.length ? render(root, 0) : '';
  }

  function diffHtml(file, kind) {
    const lines = FK.diff(file, kind);
    if (!lines) return `<div class="fx-bin">${I.file}<p>Binary file · ${esc(file.split('/').pop())}</p><small>Ảnh / file nhị phân không hiện diff dạng chữ</small></div>`;
    const head = kind === 'A' ? `@@ -0,0 +1,${lines.length} @@` : '@@ -1,12 +1,13 @@';
    let n = 0;
    return `<div class="fx-diff"><div class="fx-line hunk"><span></span><code>${head}</code></div>${lines.map((l) => {
      if (l.t !== '-') n++;
      return `<div class="fx-line ${l.t === '+' ? 'add' : l.t === '-' ? 'del' : ''}"><span>${l.t === '-' ? '' : n}</span><code>${esc(l.s) || ' '}</code></div>`;
    }).join('')}</div>`;
  }

  function conflictPane(s, w, file) {
    const c = s.conflict, them = s.commits[c.other], us = s.headCommit;
    const card = (label, cm, key) => {
      const p = FK.person(cm.author);
      return `<div class="fx-card"><div class="fx-card-h">${I.branchSm}<b>${esc(label)}</b><span><i class="fb mod">M</i> modified</span></div>
        <div class="fx-card-c"><i class="fav" style="background:${p.color}">${p.letter}</i><code>${cm.id.slice(0, 6)}</code><span>${esc(cm.msg)}</span><small>${FK.date(cm.n).slice(0, 11)}</small></div>
        <input type="checkbox" class="fx-check ${key}" data-fk="cf-${key}" ${w.cfPick[key] ? 'checked' : ''} aria-label="Giữ thay đổi của ${esc(label)}"></div>`;
    };
    const none = !w.cfPick.theirs && !w.cfPick.mine;
    return `<div class="fx-conf"><h3>⚠ Merge conflict</h3><p>Select the changes or merge them manually</p>
      <div class="fx-path">${I.file} ${esc(file)}</div>
      <div class="fx-cards">${card(c.label, them, 'theirs')}<div class="fx-join"></div>${card(s.head, us, 'mine')}</div>
      <div class="fx-btns"><button data-fk="cf-merge" data-hint="cf-merge" ${none ? 'disabled' : ''}>Merge</button><button disabled title="Mô phỏng: không mở VS Code">Merge in VS Code</button></div></div>`;
  }

  FK.localChanges = (s, w) => {
    const unstaged = [...s.work, ...(s.conflict ? s.conflict.files.map((file) => ({ file, kind: 'C' })) : [])];
    const pool = w.sel && (w.sel.area === 'staged' ? s.staged : unstaged).find((x) => x.file === w.sel.file);
    if (!pool) w.sel = null;
    const right = !pool ? '<div class="fx-empty">Chọn một file để xem thay đổi</div>'
      : pool.kind === 'C' ? conflictPane(s, w, pool.file) : diffHtml(pool.file, pool.kind);
    const n = s.staged.length;
    return `<div class="fc">
      <div class="fc-left">
        <div class="fc-search">${I.search}<span class="fc-sp"></span>${I.chevD}</div>
        <div class="fc-sec"><div class="fc-h">Unstaged<button data-fk="stage" data-hint="stage-btn" ${unstaged.some((x) => x.kind !== 'C') ? '' : 'disabled'}>Stage</button></div>
          <div class="fc-list">${tree(unstaged, 'unstaged', w)}</div></div>
        <div class="fc-sec"><div class="fc-h">Staged<button data-fk="unstage" ${n && !s.conflict ? '' : 'disabled'}>Unstage</button></div>
          <div class="fc-list">${tree(s.staged, 'staged', w)}</div></div>
      </div>
      <div class="fc-right">
        <div class="fc-path">${pool ? `${I.file} ${esc(pool.file)}` : ''}</div>
        <div class="fc-view">${right}</div>
        <div class="fc-commit">
          <div class="fc-msg"><input class="fk-subject" data-hint="commit-subject" placeholder="Commit subject" maxlength="72"><textarea class="fk-desc" rows="2" placeholder="Description"></textarea></div>
          <div class="fc-cbar"><label><input type="checkbox" disabled> Amend</label>
            <button class="fc-cbtn" data-fk="commit" data-hint="commit-btn">Commit${n ? ` ${n} File${n > 1 ? 's' : ''}` : ''}</button></div>
        </div>
      </div></div>`;
  };
})();
