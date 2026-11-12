/* Submodule simulator: parent repo stores only a pinned SHA of the child repo.
   cfg: { setup(model), actions:[keys], goals:[{text,check(model),hint}] } */
(function () {
  const GL = window.GL, esc = GL.esc;
  const PATH = 'Assets/BaseCode';
  let seq = 0;
  const sha = () => ['c41d9e2', 'e07b3a8', 'f5a2c71', '9d3e6b0', '2b8f4d5'][seq++ % 5];

  class SubModel {
    constructor() {
      seq = 0;
      this.sub = { remote: [{ id: 'a1f3c09', msg: 'Init base-code' }, { id: 'b72d4e1', msg: 'Thêm AudioManager' }], head: null, detached: false };
      this.parent = { pin: 'b72d4e1', remotePin: 'b72d4e1', log: ['Thêm submodule base-code'], ahead: 0, behind: 0 };
      this.log = []; this.quiet = false; this.onChange = null;
    }
    out(ok, msg, cmd) { if (!this.quiet) this.log.push({ ok, msg, cmd }); if (!this.quiet && this.onChange) this.onChange(); return ok; }
    did(prefix) { return this.log.some((l) => l.ok && l.cmd.startsWith(prefix)); }
    get latest() { return this.sub.remote[this.sub.remote.length - 1].id; }
    get synced() { return this.sub.head === this.parent.pin; }
    msgOf(id) { const c = this.sub.remote.find((x) => x.id === id); return c ? c.msg : ''; }

    update() {
      const cmd = 'git submodule update --init --recursive';
      if (this.synced) return this.out(true, 'Submodule đã khớp với con trỏ — không đổi gì', cmd);
      this.sub.head = this.parent.pin; this.sub.detached = true;
      return this.out(true, `Checkout base-code tại ${this.parent.pin} (detached HEAD)`, cmd);
    }
    subPull() {
      const cmd = `cd ${PATH} && git switch main && git pull`;
      if (!this.sub.head) return this.out(false, 'Thư mục submodule đang trống — cần init trước', cmd);
      this.sub.head = this.latest; this.sub.detached = false;
      return this.out(true, `base-code lên bản mới nhất ${this.latest} → repo cha thấy "modified"`, cmd);
    }
    teammateSub() {
      this.sub.remote.push({ id: sha(), msg: 'Fix crash khi load âm thanh' });
      return this.out(true, 'Đồng nghiệp vừa push commit mới lên repo base-code', '# đồng nghiệp push lên repo base-code');
    }
    commitPin() {
      const cmd = `git add ${PATH} && git commit -m "chore: bump base-code"`;
      if (!this.sub.head || this.synced) return this.out(false, 'Con trỏ không đổi — không có gì để commit', cmd);
      this.parent.pin = this.sub.head; this.parent.log.push(`chore: bump base-code → ${this.sub.head}`); this.parent.ahead++;
      return this.out(true, `Repo cha giờ trỏ tới ${this.sub.head} (chỉ lưu SHA, không lưu code)`, cmd);
    }
    pushParent() {
      if (!this.parent.ahead) return this.out(true, 'Everything up-to-date', 'git push');
      this.parent.remotePin = this.parent.pin; this.parent.ahead = 0;
      return this.out(true, 'Đã push repo cha — team sẽ nhận con trỏ mới', 'git push');
    }
    teammateBump() {
      if (this.latest === this.parent.remotePin) this.sub.remote.push({ id: sha(), msg: 'Thêm SaveSystem' });
      this.parent.remotePin = this.latest; this.parent.behind = 1;
      return this.out(true, 'Đồng nghiệp đổi con trỏ base-code và push repo cha', '# đồng nghiệp bump base-code ở repo cha');
    }
    pullParent() {
      if (!this.parent.behind) return this.out(true, 'Already up to date', 'git pull');
      this.parent.pin = this.parent.remotePin; this.parent.behind = 0; this.parent.log.push(`chore: bump base-code → ${this.parent.pin}`);
      return this.out(true, this.synced ? 'Đã pull' : `Repo cha trỏ ${this.parent.pin} nhưng thư mục vẫn ở ${this.sub.head} — LỆCH!`, 'git pull');
    }
  }

  const ACTS = {
    update: ['⟳ git submodule update --init', (m) => m.update()], subPull: ['↓ Pull trong submodule', (m) => m.subPull()],
    teammateSub: ['👤 Đồng nghiệp push base-code', (m) => m.teammateSub()], commitPin: ['✓ Commit con trỏ mới', (m) => m.commitPin()],
    pushParent: ['↑ Push repo cha', (m) => m.pushParent()], teammateBump: ['👤 Đồng nghiệp bump con trỏ', (m) => m.teammateBump()],
    pullParent: ['↓ Pull repo cha', (m) => m.pullParent()],
  };

  function status(m) {
    if (!m.sub.head) return '<div class="badge warn">Thư mục trống — chưa init</div>';
    if (!m.synced) return `<div class="badge warn">Lệch: đang ở ${m.sub.head}, repo cha cần ${m.parent.pin}</div>`;
    return m.sub.detached ? `<div class="badge info">Khớp · detached HEAD tại ${m.sub.head}</div>` : '<div class="badge ok">Khớp · trên nhánh main ✓</div>';
  }

  function view(m) {
    const p = m.parent;
    const commits = p.log.slice(-3).reverse().map((t) => `<li>${esc(t)}</li>`).join('');
    const chain = m.sub.remote.map((c) => `<div class="sm-c${c.id === p.pin ? ' is-pin' : ''}${c.id === m.sub.head ? ' is-head' : ''}">
      <code>${c.id}</code><span>${esc(c.msg)}</span>${c.id === m.sub.head ? '<b>HEAD</b>' : ''}</div>`).join('');
    const sync = p.ahead ? `<div class="badge info">${p.ahead} commit chưa push</div>` : p.behind ? '<div class="badge warn">remote có commit mới → pull</div>' : '<div class="badge">đồng bộ</div>';
    return `<div class="zone sm-parent"><h5>my-game <small>repo cha</small></h5><ul class="sm-log">${commits}</ul>
        <div class="sm-pin">📁 ${PATH}<span>trỏ tới</span><code>${p.pin}</code></div>${sync}</div>
      <div class="sm-link"><span>chỉ lưu SHA</span>→</div>
      <div class="zone sm-sub"><h5>base-code <small>repo con · thư mục ${PATH}</small></h5>
        <div class="sm-chain${m.sub.head ? '' : ' empty'}">${chain}</div>${status(m)}</div>`;
  }

  GL.mountSubmodule = function (el, cfg, onDone) {
    const goals = new GL.GoalTracker(cfg.goals, onDone);
    let m;
    el.innerHTML = `<div class="sim"><div class="sim-goals"></div><div class="sm-grid"></div>
      <div class="sim-bar">${(cfg.actions || []).map((k) => `<button class="btn" data-sm="${k}" data-hint="${k}">${esc(ACTS[k][0])}</button>`).join('')}
        <button class="btn ghost" data-restart title="Làm lại từ đầu">↺</button></div><div class="sim-term"></div></div>`;
    const $ = (q) => el.querySelector(q);
    function render() {
      goals.update(m);
      $('.sim-goals').innerHTML = goals.html();
      $('.sm-grid').innerHTML = view(m);
      $('.sim-term').innerHTML = m.log.slice(-5).map((l) => `<div class="t-line"><span class="t-cmd${l.cmd.startsWith('#') ? ' t-cm' : ''}">${l.cmd.startsWith('#') ? '' : '$ '}${esc(l.cmd)}</span>
        <span class="t-out ${l.ok ? 'ok' : 'err'}">${esc(l.msg)}</span></div>`).join('') || '<div class="t-line t-cm">Bấm một nút bên dưới để bắt đầu…</div>';
      GL.applyPulse(el, goals.hint);
    }
    function start() {
      m = new SubModel(); m.quiet = true;
      if (cfg.setup) cfg.setup(m);
      m.quiet = false; m.onChange = render; goals.i = 0; render();
    }
    el.addEventListener('click', (e) => {
      const b = e.target.closest('[data-sm]');
      if (b) ACTS[b.dataset.sm][1](m);
      if (e.target.closest('[data-restart]')) start();
    });
    start();
  };
})();
