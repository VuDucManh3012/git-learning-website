/* GUI mode lessons — learn Git by using a Fork-style Windows client: click, double-click, right-click, dialogs. */
(function () {
  const GL = window.GL, V = GL.V, C = GL.C;
  const P = { player: 'Assets/Scripts/PlayerController.cs', shopUi: 'Assets/Scripts/UI/ShopUI.cs', prefab: 'Assets/Prefabs/Shop.prefab',
    logo: 'Assets/Art/UI/logo.png', log: 'Assets/debug.log', psd: 'Assets/Art/Source/banner.psd', hud: 'Assets/Scenes/Main.unity' };
  const base = (s) => { s.quick(P.player, 'feat: điều khiển nhân vật'); s.quick(P.prefab, 'feat: prefab Shop'); };
  const withRemote = (fn) => (s) => { base(s); s.setupRemote(); if (fn) fn(s); };
  const STAGE = ['stage-btn', 'file-row'], COMMIT = ['commit-subject', 'commit-btn'];
  const newBranch = (s) => Object.keys(s.branches).find((b) => b !== 'main');

  GL.LESSONS_FORK = [
    { id: 'f-tour', title: 'Làm quen giao diện', desc: 'Mỗi khu vực trên Fork dùng để làm gì.', tags: ['toolbar', 'sidebar'], slides: [
      { title: 'Bốn khu vực chính', text: 'Fork trên Windows: toolbar ở trên, sidebar bên trái, nội dung ở giữa.', visual: { html: V.tiles([
        { icon: '🧰', t: 'Toolbar', s: 'Fetch · Pull · Push · Stash · Branch' }, { icon: '📚', t: 'Sidebar', s: 'Branches, Remotes, Stashes' },
        { icon: '📝', t: 'Local Changes', s: 'File đang sửa + diff' }, { icon: '🕓', t: 'All Commits', s: 'Lịch sử dạng cây' }]) } },
      { title: 'Đi một vòng', text: 'Bấm theo ô đang sáng viền cam.', wide: true, visual: { fork: {
        setup: (s) => { base(s); s.branch('feature/shop'); s.quick(P.shopUi, 'feat: giao diện Shop'); s.checkout('main'); s.edit(P.player); },
        goals: [{ text: 'Bấm 1 file trong <b>Unstaged</b> để xem diff', check: (s, w) => !!w.sel, hint: 'file-row' },
          { text: 'Mở <b>All Commits</b>', check: (s, w) => w.opened.has('commits'), hint: 'nav-commits' },
          { text: 'Bấm 1 commit để xem chi tiết', check: (s, w) => w.pickedCommit, hint: 'commit-row' },
          { text: 'Quay lại <b>Local Changes</b>', check: (s, w) => w.view === 'changes', hint: 'nav-changes' }] } } },
    ] },
    { id: 'f-commit', title: 'Commit bằng chuột', desc: 'Chọn file, Stage, gõ subject, Commit.', tags: ['stage', 'commit'], slides: [
      { title: 'Commit trong Fork', text: 'Sửa file trong Unity/Photoshop → Fork tự thấy. Double-click file cũng là Stage.', wide: true, visual: { fork: { setup: base,
        events: [`edit:${P.player}`, `edit:${P.logo}`],
        goals: [{ text: 'Sửa một file (nút bên dưới cửa sổ)', check: C.dirty, hint: `edit:${P.player}` },
          { text: 'Bấm file để xem diff', check: (s, w) => !!w.sel, hint: 'file-row' },
          { text: 'Bấm <b>Stage</b> (hoặc double-click file)', check: C.staged, hint: STAGE },
          { text: 'Gõ <b>Commit subject</b> rồi bấm <b>Commit</b>', check: C.committed, hint: COMMIT }] } } },
    ] },
    { id: 'f-discard', title: 'Discard trong Fork', desc: 'Chuột phải → Discard Changes.', tags: ['discard'], slides: [
      { title: 'Lỡ tay? <em>Discard</em>', text: 'Chuột phải vào file → Discard Changes… → xác nhận. ⚠ Không lấy lại được.', wide: true, visual: { fork: {
        setup: (s) => { base(s); s.quick(P.log, 'chore: log'); s.edit(P.player); s.edit(P.log); },
        goals: [{ text: '<b>Chuột phải</b> debug.log → <b>Discard Changes…</b> → Discard', check: (s) => !s.work.some((x) => x.file === P.log), hint: [`row:${P.log}`, 'menu-discard', 'dlg-ok'] },
          { text: 'Stage & commit PlayerController.cs', check: C.committed, hint: [...STAGE, ...COMMIT] }] } } },
    ] },
    { id: 'f-sync', title: 'Fetch, Pull, Push', desc: 'Ba nút trên toolbar để đồng bộ với team.', tags: ['fetch', 'pull', 'push'], slides: [
      { title: 'Fetch ≠ Pull', visual: { html: V.compare({ title: 'Fetch', note: 'Chỉ XEM có gì mới trên server. Không đổi file của bạn.' }, { title: 'Pull', note: 'Lấy về VÀ gộp vào nhánh của bạn.' }) } },
      { title: 'Đồng bộ với team', text: 'Để ý số nhỏ trên nút Pull / Push và cạnh nhánh main.', wide: true, visual: { fork: {
        setup: withRemote((s) => { s.teammatePush(P.logo, 'art: logo mới'); s.quick(P.hud, 'feat: thêm HUD'); }), view: 'commits',
        goals: [{ text: 'Bấm <b>Fetch</b> → Fetch', check: (s) => s.did('git fetch'), hint: ['tb-fetch', 'dlg-ok'] },
          { text: 'Bấm <b>Pull</b> → Pull', check: C.hasRemoteTip, hint: ['tb-pull', 'dlg-ok'] },
          { text: 'Bấm <b>Push</b> → Push', check: C.pushed, hint: ['tb-push', 'dlg-ok'] }] } } },
    ] },
    { id: 'f-branch', title: 'Nhánh trong Fork', desc: 'Tạo, double-click để checkout, chuột phải để merge.', tags: ['branch', 'merge'], slides: [
      { title: 'Tạo → làm → merge', wide: true, visual: { fork: { setup: base, events: [`edit:${P.shopUi}`],
        goals: [{ text: 'Bấm <b>Branch</b> → Create and Checkout', check: (s) => !!newBranch(s), hint: ['tb-branch', 'dlg-ok'] },
          { text: 'Sửa file, stage, commit trên nhánh mới', check: (s) => s.head !== 'main' && s.branches[s.head] !== s.branches.main, hint: [`edit:${P.shopUi}`, ...STAGE, ...COMMIT] },
          { text: '<b>Double-click</b> main ở sidebar để checkout', check: (s) => s.head === 'main', hint: 'branch:main' },
          { text: '<b>Chuột phải</b> nhánh mới → <b>Merge into \'main\'</b>', check: (s) => s.isAncestor(s.branches[newBranch(s)], s.branches.main), hint: ['branch-row', 'menu-merge', 'dlg-ok'] },
          { text: 'Xem kết quả ở <b>All Commits</b>', check: (s, w) => w.view === 'commits', hint: 'nav-commits' }] } } },
    ] },
    { id: 'f-conflict', title: 'Conflict trong Fork', desc: 'Tick bên muốn giữ rồi bấm Merge.', tags: ['conflict'], slides: [
      { title: 'Giải conflict', text: 'Fork hiện banner vàng. Chọn file ⚠, tick bên muốn giữ, bấm Merge, rồi Commit.', wide: true, visual: { fork: {
        setup: withRemote((s) => { s.teammatePush(P.prefab, 'feat: Shop giảm giá 30%'); s.quick(P.prefab, 'feat: Shop giảm giá 50%'); }),
        goals: [{ text: 'Bấm <b>Pull</b> → Pull', check: (s) => s.did('git pull') || !!s.conflict, hint: ['tb-pull', 'dlg-ok'] },
          { text: 'Bấm file có dấu ⚠', check: (s, w) => !s.conflict || (w.sel && s.conflict.files.includes(w.sel.file)), hint: 'conflict-row' },
          { text: 'Tick bên muốn giữ → bấm <b>Merge</b>', check: (s) => !s.conflict || !s.conflict.files.length, hint: 'cf-merge' },
          { text: 'Bấm <b>Commit</b> (subject đã điền sẵn)', check: (s) => !s.conflict && s.headCommit.parents.length === 2, hint: 'commit-btn' },
          { text: 'Bấm <b>Push</b> → Push', check: C.pushed, hint: ['tb-push', 'dlg-ok'] }] } } },
    ] },
    { id: 'f-stash', title: 'Stash trong Fork', desc: 'Cất tạm việc dở, lấy lại từ sidebar.', tags: ['stash'], slides: [
      { title: 'Cất tạm rồi lấy lại', wide: true, visual: { fork: { setup: (s) => { base(s); s.edit(P.psd); s.edit(P.player); },
        goals: [{ text: 'Bấm <b>Stash</b> → Stash', check: (s) => s.stashes.length === 1, hint: ['tb-stash', 'dlg-ok'] },
          { text: '<b>Chuột phải</b> stash ở sidebar → <b>Pop Stash</b>', check: (s) => s.did('git stash pop'), hint: ['stash-row', 'menu-pop'] }] } } },
    ] },
  ];
})();
