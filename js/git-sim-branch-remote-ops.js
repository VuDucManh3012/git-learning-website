/* Branch, merge/conflict, remote and advanced ops (rebase, reset, revert, stash, cherry-pick)
   added onto GL.GitSim.prototype. */
(function () {
  const P = window.GL.GitSim.prototype;
  const addUnique = (list, items) => items.forEach((it) => { if (!list.some((x) => x.file === it.file)) list.push(it); });

  /* ---------- branches ---------- */
  P.branch = function (name) {
    const cmd = `git switch -c ${name}`;
    if (this.branches[name]) return this._out(false, `Nhánh ${name} đã tồn tại`, cmd);
    this.branches[name] = this.headId; this.head = name;
    return this._out(true, `Tạo nhánh ${name} và chuyển sang nó`, cmd);
  };
  P.checkout = function (name) {
    const cmd = `git switch ${name}`;
    if (!this.branches[name]) return this._out(false, `Không có nhánh ${name}`, cmd);
    if (this.conflict) return this._out(false, 'Đang conflict — giải quyết trước khi đổi nhánh', cmd);
    if (this.head === name) return this._out(true, `Đang ở ${name} rồi`, cmd);
    this.head = name;
    return this._out(true, `HEAD giờ trỏ vào ${name}`, cmd);
  };

  /* ---------- merge (shared by merge & pull) ---------- */
  P._mergeId = function (other, cmd, label) {
    const me = this.headId;
    if (this.conflict) return this._out(false, 'Đang có conflict chưa xử lý', cmd);
    if (!other || this.isAncestor(other, me)) return this._out(true, 'Already up to date — không có gì mới', cmd);
    // Like real git: refuse if incoming changes would overwrite uncommitted edits
    const incoming = this.changedSince(other, this.mergeBase(me, other));
    const dirty = [...this.work, ...this.staged].map((x) => x.file).filter((f) => incoming.has(f));
    if (dirty.length) return this._out(false, `Bị chặn: thay đổi chưa commit ở ${dirty.join(', ')} sẽ bị ghi đè → commit hoặc stash trước`, cmd);
    if (this.isAncestor(me, other)) {
      this.branches[this.head] = other;
      return this._out(true, `Fast-forward: ${this.head} nhảy thẳng tới ${label}`, cmd);
    }
    const base = this.mergeBase(me, other);
    const theirs = this.changedSince(other, base);
    const clash = [...this.changedSince(me, base)].filter((f) => theirs.has(f));
    const msg = `Merge ${label} vào ${this.head}`;
    if (clash.length) {
      this.conflict = { other, files: clash, msg, label };
      return this._out(false, `CONFLICT ở ${clash.join(', ')} — cả hai bên cùng sửa`, cmd);
    }
    this.branches[this.head] = this._mk(msg, [me, other], [], this.head);
    return this._out(true, 'Merge xong — tạo merge commit', cmd);
  };
  P.merge = function (name) {
    if (!this.branches[name]) return this._out(false, `Không có nhánh ${name}`, `git merge ${name}`);
    return this._mergeId(this.branches[name], `git merge ${name}`, name);
  };
  P.resolve = function (file, choice) {
    if (!this.conflict || !this.conflict.files.includes(file)) return this._out(false, 'File không ở trạng thái conflict', `git add ${file}`);
    this.conflict.files = this.conflict.files.filter((f) => f !== file);
    addUnique(this.staged, [{ file, kind: 'M' }]);
    const how = { mine: 'giữ bản của bạn', theirs: 'lấy bản của họ', both: 'giữ cả hai' }[choice];
    return this._out(true, `${file}: ${how} → đã stage`, `git add ${file}`);
  };
  P.abortMerge = function () {
    if (!this.conflict) return this._out(false, 'Không có merge nào đang dở', 'git merge --abort');
    this.conflict = null; this.staged = [];
    return this._out(true, 'Đã huỷ merge, quay về như trước', 'git merge --abort');
  };

  /* ---------- remote ---------- */
  P._fetch = function () { Object.values(this.remote.branches).forEach((t) => this.ancestors(t).forEach((c) => this.known.add(c))); };
  P.fetchCmd = function () {
    if (!this.remote) return this._out(false, 'Chưa có remote', 'git fetch');
    const n = this.remoteAhead(); this._fetch();
    return this._out(true, n ? `Tải về ${n} commit mới (chưa gộp vào nhánh của bạn)` : 'Không có gì mới', 'git fetch');
  };
  P.push = function () {
    const b = this.head, cmd = `git push origin ${b}`;
    if (!this.remote) return this._out(false, 'Chưa có remote', cmd);
    const r = this.remote.branches[b];
    if (r === this.headId) return this._out(true, 'Everything up-to-date — remote đã có hết', cmd);
    if (r && !this.isAncestor(r, this.headId)) return this._out(false, 'Bị từ chối! Remote có commit bạn chưa có → pull trước', cmd);
    this.remote.branches[b] = this.headId;
    return this._out(true, `Đã đẩy ${b} lên remote`, cmd);
  };
  P.pull = function () {
    const cmd = `git pull origin ${this.head}`;
    if (!this.remote) return this._out(false, 'Chưa có remote', cmd);
    if (!this.remote.branches[this.head]) return this._out(false, `Remote chưa có nhánh ${this.head}`, cmd);
    this._fetch();
    return this._mergeId(this.remote.branches[this.head], cmd, `origin/${this.head}`);
  };
  P.teammatePush = function (file, msg) {
    const tip = this.remote.branches.main;
    this.remote.branches.main = this._mk(msg || `Đồng nghiệp sửa ${file}`, [tip], [file], 'origin/main', 'Đồng nghiệp', false);
    return this._out(true, 'Đồng nghiệp vừa push 1 commit lên remote', `# đồng nghiệp push (sửa ${file})`);
  };

  /* ---------- advanced ---------- */
  P._copyOnto = function (commit, parent) { return this._mk(commit.msg, [parent], commit.files, this.head, commit.author); };
  const BUSY = 'Đang có conflict chưa xử lý — giải quyết hoặc huỷ merge trước';
  P.rebase = function (onto) {
    const cmd = `git rebase ${onto}`, target = this.branches[onto], me = this.headId;
    if (this.conflict) return this._out(false, BUSY, cmd);
    if (!target) return this._out(false, `Không có nhánh ${onto}`, cmd);
    if (this.work.length || this.staged.length) return this._out(false, 'Còn thay đổi chưa commit → commit hoặc stash trước khi rebase', cmd);
    if (this.isAncestor(target, me)) return this._out(true, `Đã nằm trên ${onto} rồi`, cmd);
    const T = this.ancestors(target);
    const mine = [...this.ancestors(me)].filter((c) => !T.has(c)).map((c) => this.commits[c])
      .filter((c) => c.parents.length === 1).sort((a, b) => a.n - b.n);
    let tip = target;
    mine.forEach((c) => { tip = this._copyOnto(c, tip); });
    this.branches[this.head] = tip;
    return this._out(true, `Chép ${mine.length} commit lên đầu ${onto} — hash MỚI, lịch sử thẳng`, cmd);
  };
  P.reset = function (mode) {
    const cmd = `git reset --${mode} HEAD~1`, c = this.headCommit;
    if (!c.parents.length) return this._out(false, 'Không còn commit nào phía trước', cmd);
    if (this.conflict && mode === 'soft') return this._out(false, 'Không thể reset --soft giữa lúc đang merge', cmd);
    this.conflict = null; // mixed/hard reset also drops the in-progress merge
    this.branches[this.head] = c.parents[0];
    const t = this.tracked(), files = c.files.map((file) => ({ file, kind: t.has(file) ? 'M' : 'A' }));
    if (mode === 'soft') addUnique(this.staged, files);
    if (mode === 'mixed') { addUnique(this.work, [...this.staged, ...files]); this.staged = []; }
    if (mode === 'hard') { this.staged = []; this.work = this.work.filter((w) => w.kind === 'A'); } // untracked files survive
    const where = { soft: 'thay đổi nằm lại ở Staging', mixed: 'thay đổi nằm lại ở Working', hard: 'thay đổi bị XOÁ luôn' }[mode];
    return this._out(true, `Lùi 1 commit — ${where}`, cmd);
  };
  P.revert = function () {
    const c = this.headCommit;
    if (this.conflict) return this._out(false, BUSY, 'git revert HEAD');
    if (!c.parents.length) return this._out(false, 'Không revert được commit đầu tiên', 'git revert HEAD');
    this.branches[this.head] = this._mk(`Revert "${c.msg}"`, [this.headId], c.files, this.head);
    return this._out(true, 'Tạo commit MỚI đảo ngược commit cũ — lịch sử giữ nguyên', 'git revert HEAD');
  };
  P.stash = function () {
    const items = [...this.work, ...this.staged];
    const cmd = this.work.some((w) => w.kind === 'A') ? 'git stash -u' : 'git stash'; // plain stash skips untracked files
    if (this.conflict) return this._out(false, BUSY, cmd);
    if (!items.length) return this._out(false, 'Không có gì để cất', cmd);
    this.stashes.push(items); this.work = []; this.staged = [];
    return this._out(true, `Cất tạm ${items.length} thay đổi vào stash — thư mục sạch`, cmd);
  };
  P.stashPop = function () {
    if (this.conflict) return this._out(false, BUSY, 'git stash pop');
    if (!this.stashes.length) return this._out(false, 'Stash đang trống', 'git stash pop');
    addUnique(this.work, this.stashes.pop());
    return this._out(true, 'Lấy thay đổi từ stash ra lại', 'git stash pop');
  };
  P.cherryPick = function (branch) {
    const src = this.commits[this.branches[branch]], cmd = `git cherry-pick ${src ? src.id : branch}`;
    if (this.conflict) return this._out(false, BUSY, cmd);
    if (!src) return this._out(false, `Không có nhánh ${branch}`, cmd);
    if (this.isAncestor(src.id, this.headId)) return this._out(false, 'Commit này đã có trong nhánh hiện tại', cmd);
    this.branches[this.head] = this._copyOnto(src, this.headId);
    return this._out(true, `Chép đúng 1 commit "${src.msg}" sang ${this.head}`, cmd);
  };
})();
