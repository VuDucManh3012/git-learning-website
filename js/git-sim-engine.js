/* Mini Git engine (in-memory, no real git).
   Models: working dir, staging, commits, branches, remote, stash, merge conflicts.
   Every public op returns {ok,msg} and logs the equivalent git command. */
(function () {
  const GL = (window.GL = window.GL || {});
  GL.esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const rid = () => Math.random().toString(16).slice(2, 9).padEnd(7, '0');
  const addUnique = (list, items) => items.forEach((it) => { if (!list.some((x) => x.file === it.file)) list.push(it); });

  class GitSim {
    constructor() { this.subs = []; this.init(); }

    init() {
      Object.assign(this, { commits: {}, n: 0, branches: {}, head: 'main', work: [], staged: [],
        remote: null, known: new Set(), stashes: [], conflict: null, log: [], quiet: false, lastMsg: '', lastOk: true });
      this.branches.main = this._mk('Khởi tạo dự án', [], ['README.md'], 'main');
    }

    on(fn) { this.subs.push(fn); }
    emit() { if (!this.quiet) this.subs.forEach((f) => f(this)); }
    get headId() { return this.branches[this.head]; }
    get headCommit() { return this.commits[this.headId]; }
    did(prefix) { return this.log.some((l) => l.ok && l.cmd.startsWith(prefix)); }

    _mk(msg, parents, files, lane, author = 'Bạn', known = true) {
      const id = rid();
      this.commits[id] = { id, msg, parents, files: [...files], lane, author, n: this.n++ };
      if (known) this.known.add(id);
      return id;
    }
    _out(ok, msg, cmd) {
      if (!this.quiet) this.log.push({ cmd, msg, ok });
      this.lastMsg = msg; this.lastOk = ok; this.emit();
      return { ok, msg };
    }

    /* ---------- graph helpers ---------- */
    ancestors(id) {
      const seen = new Set(), stack = [id];
      while (stack.length) { const c = stack.pop(); if (!c || seen.has(c)) continue; seen.add(c); stack.push(...this.commits[c].parents); }
      return seen;
    }
    isAncestor(a, b) { return this.ancestors(b).has(a); }
    mergeBase(a, b) {
      const A = this.ancestors(a); let best = null;
      for (const c of this.ancestors(b)) if (A.has(c) && (!best || this.commits[c].n > this.commits[best].n)) best = c;
      return best;
    }
    changedSince(tip, base) {
      const B = this.ancestors(base), files = new Set();
      for (const c of this.ancestors(tip)) if (!B.has(c)) this.commits[c].files.forEach((f) => files.add(f));
      return files;
    }
    tracked() { const f = new Set(); for (const c of this.ancestors(this.headId)) this.commits[c].files.forEach((x) => f.add(x)); return f; }
    remoteAhead() { // remote commits that local has not fetched yet
      if (!this.remote) return 0;
      const ids = new Set(); Object.values(this.remote.branches).forEach((t) => this.ancestors(t).forEach((c) => ids.add(c)));
      return [...ids].filter((c) => !this.known.has(c)).length;
    }
    visible() { // commits reachable from local branches + known remote tips
      const ids = new Set();
      Object.values(this.branches).forEach((t) => this.ancestors(t).forEach((c) => ids.add(c)));
      if (this.remote) Object.values(this.remote.branches).forEach((t) => { if (this.known.has(t)) this.ancestors(t).forEach((c) => ids.add(c)); });
      return [...ids].filter((c) => this.known.has(c)).map((c) => this.commits[c]).sort((a, b) => a.n - b.n);
    }

    /* ---------- scenario helpers (silent) ---------- */
    silently(fn) { this.quiet = true; try { fn(this); } finally { this.quiet = false; } }
    quick(file, msg) { this.edit(file); this.stage(file); this.commit(msg); }
    setupRemote() { this.remote = { branches: { main: this.branches.main } }; }

    /* ---------- working dir & staging ---------- */
    edit(file) {
      const cmd = `# bạn sửa ${file} trong editor`;
      if (this.work.some((w) => w.file === file)) return this._out(true, `${file} được sửa thêm`, cmd);
      const kind = this.tracked().has(file) || this.staged.some((s) => s.file === file) ? 'M' : 'A';
      this.work.push({ file, kind });
      return this._out(true, `${file} đã thay đổi (chưa stage)`, cmd);
    }
    stage(file) {
      const cmd = file ? `git add ${file}` : 'git add .';
      const list = this.work.filter((w) => !file || w.file === file);
      if (!list.length) return this._out(false, 'Không có thay đổi nào để stage', cmd);
      this.work = this.work.filter((w) => !list.includes(w));
      addUnique(this.staged, list);
      return this._out(true, `Đã đưa ${list.map((w) => w.file).join(', ')} vào staging`, cmd);
    }
    unstage(file) {
      const cmd = `git restore --staged ${file}`, item = this.staged.find((s) => s.file === file);
      if (!item || this.conflict) return this._out(false, 'Không thể bỏ stage file này', cmd);
      this.staged = this.staged.filter((s) => s !== item); addUnique(this.work, [item]);
      return this._out(true, `${file} quay lại thư mục làm việc`, cmd);
    }
    discard(file) {
      const item = this.work.find((w) => w.file === file);
      const cmd = item && item.kind === 'A' ? `git clean -f ${file}` : `git restore ${file}`;
      if (!item) return this._out(false, 'File này không có thay đổi', cmd);
      this.work = this.work.filter((w) => w !== item);
      return this._out(true, `Đã huỷ thay đổi của ${file} — không lấy lại được!`, cmd);
    }
    commit(msg) {
      msg = (msg || '').trim();
      if (this.conflict) {
        const c = this.conflict, cmd = `git commit -m "${msg || c.msg}"`;
        if (c.files.length) return this._out(false, 'Còn file conflict chưa giải quyết', cmd);
        this.branches[this.head] = this._mk(msg || c.msg, [this.headId, c.other], this.staged.map((s) => s.file), this.head);
        this.staged = []; this.conflict = null;
        return this._out(true, 'Đã tạo merge commit — xong conflict!', cmd);
      }
      if (!this.staged.length) return this._out(false, 'Staging đang trống — cần stage (git add) trước', `git commit -m "${msg || '...'}"`);
      msg = msg || `Cập nhật ${this.staged.map((s) => s.file).join(', ')}`;
      const id = this._mk(msg, [this.headId], this.staged.map((s) => s.file), this.head);
      this.branches[this.head] = id; this.staged = [];
      return this._out(true, `Đã lưu commit ${id}`, `git commit -m "${msg}"`);
    }
  }
  GL.GitSim = GitSim;
})();
