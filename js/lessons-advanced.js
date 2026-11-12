/* Advanced mode lessons — for developers: internals, merge strategies, rebase, history rewriting. */
(function () {
  const GL = window.GL, V = GL.V, C = GL.C;
  const diverged = (s) => { s.quick('app.js', 'Base'); s.branch('feature'); s.quick('login.js', 'Login form'); s.quick('api.js', 'Login API'); s.checkout('main'); s.quick('readme.md', 'Docs'); };

  GL.LESSONS_ADVANCED = [
    { id: 'a-internals', title: 'Bên trong Git', desc: 'Commit, hash, HEAD và nhánh thực chất là gì.', tags: ['HEAD', 'SHA'], slides: [
      { title: 'Commit = <em>snapshot</em> + cha', text: 'Mỗi commit lưu toàn bộ trạng thái và trỏ về commit cha. Hash SHA-1 = ID duy nhất.', visual: { html: V.terminal([
        '$ git cat-file -p HEAD', 'tree 9c1f2e…', 'parent 4a7d0b…', 'author Bạn <ban@team.vn>', '', 'Thêm trang chủ']) } },
      { title: 'Nhánh chỉ là <em>con trỏ</em>', text: 'Một file 41 byte chứa hash. Tạo nhánh = gần như miễn phí.', visual: { html: V.terminal([
        '$ cat .git/refs/heads/main', '4a7d0b3e9f…', '$ cat .git/HEAD', 'ref: refs/heads/main', '# HEAD → nhánh → commit']) } },
      { title: 'Xem HEAD di chuyển', text: 'Chuyển qua lại giữa hai nhánh, nhìn nhãn HEAD.', wide: true, visual: { sim: { setup: diverged, zones: false,
        actions: ['checkout:main', 'checkout:feature'],
        goals: [{ text: 'Switch sang feature', check: (s) => s.head === 'feature', hint: 'checkout:feature' }, { text: 'Về main', check: (s) => s.head === 'main', hint: 'checkout:main' }] } } },
    ] },
    { id: 'a-merge', title: 'Merge: FF vs 3-way', desc: 'Khi nào Git chỉ “trượt” con trỏ, khi nào tạo merge commit.', tags: ['merge', '--no-ff'], slides: [
      { title: 'Fast-forward', text: 'main chưa đi tiếp → chỉ cần trượt con trỏ. Không có commit mới.', wide: true, visual: { sim: { zones: false,
        setup: (s) => { s.branch('feature'); s.quick('a.js', 'F1'); s.quick('b.js', 'F2'); s.checkout('main'); }, actions: ['merge:feature'],
        goals: [{ text: 'git merge feature', check: (s) => s.branches.main === s.branches.feature, hint: 'merge:feature' }] } } },
      { title: '3-way merge', text: 'Hai nhánh cùng đi tiếp → Git so 3 điểm (base, ours, theirs) và tạo merge commit.', wide: true, visual: { sim: { zones: false,
        setup: diverged, actions: ['merge:feature'],
        goals: [{ text: 'git merge feature', check: (s) => s.headCommit.parents.length === 2, hint: 'merge:feature' }] } } },
      { title: 'Conflict ở mức dev', text: 'Cùng hunk bị sửa ở cả 2 phía. Sửa marker → <code>git add</code> → <code>git commit</code>.', visual: { html: V.terminal([
        '$ git merge feature', 'CONFLICT (content): Merge conflict in api.js', '$ git status', '  both modified:   api.js', '# sửa file, xoá <<<<<<< ======= >>>>>>>', '$ git add api.js && git commit']) } },
    ] },
    { id: 'a-rebase', title: 'Rebase', desc: 'Viết lại lịch sử cho thẳng — và luật vàng.', tags: ['rebase', '-i'], slides: [
      { title: 'Merge vs Rebase', wide: true, visual: { html: () => V.compare(
        { title: 'merge', html: V.graph((s) => { diverged(s); s.merge('feature'); }), note: 'Giữ nguyên lịch sử, có merge commit.' },
        { title: 'rebase', html: V.graph((s) => { diverged(s); s.checkout('feature'); s.rebase('main'); s.checkout('main'); s.merge('feature'); }), note: 'Lịch sử thẳng, commit có hash MỚI.' }) } },
      { title: 'Thử rebase', text: 'Chú ý: hash của commit feature thay đổi.', wide: true, visual: { sim: { zones: false,
        setup: (s) => { diverged(s); s.checkout('feature'); }, actions: ['rebase:main', 'checkout:main', 'merge:feature'],
        goals: [{ text: 'git rebase main (đang ở feature)', check: (s) => s.isAncestor(s.branches.main, s.branches.feature), hint: 'rebase:main' },
          { text: 'Sang main', check: (s) => s.head === 'main', hint: 'checkout:main' },
          { text: 'Merge → fast-forward', check: (s) => s.branches.main === s.branches.feature, hint: 'merge:feature' }] } } },
      { title: 'Luật vàng', text: '<b>Không rebase nhánh người khác đã pull.</b> Hash đổi → lịch sử của họ lệch.', points: ['Rebase nhánh cá nhân: OK', 'Rebase nhánh chung: ✗', 'Lỡ rồi? <code>git push --force-with-lease</code> + báo team'] },
    ] },
    { id: 'a-undo', title: 'Reset vs Revert', desc: 'Ba kiểu reset và cách undo an toàn trên nhánh chung.', tags: ['reset', 'revert'], slides: [
      { title: 'reset: soft · mixed · hard', text: 'Lùi con trỏ nhánh. Khác nhau ở chỗ thay đổi đi đâu.', wide: true, visual: { sim: {
        // files exist (tracked) before C1..C3 so reset --hard really wipes their changes; untracked files would survive it
        setup: (s) => { ['a.js', 'b.js', 'c.js'].forEach((f) => s.edit(f)); s.stage(); s.commit('Tạo file'); s.quick('a.js', 'C1'); s.quick('b.js', 'C2'); s.quick('c.js', 'C3'); }, actions: ['reset:soft', 'reset:mixed', 'reset:hard', 'stageAll', 'commit'],
        goals: [{ text: 'reset --soft → thay đổi ở Staging', check: (s) => s.did('git reset --soft'), hint: 'reset:soft' },
          { text: 'reset --mixed → về Working', check: (s) => s.did('git reset --mixed'), hint: 'reset:mixed' },
          { text: 'reset --hard → mất luôn', check: (s) => s.did('git reset --hard'), hint: 'reset:hard' }] } } },
      { title: 'revert: undo <em>an toàn</em>', text: 'Tạo commit mới đảo ngược. Không viết lại lịch sử → dùng cho nhánh đã push.', wide: true, visual: { sim: {
        setup: (s) => { s.quick('a.js', 'Tính năng A'); s.setupRemote(); s.quick('bug.js', 'Commit gây lỗi'); s.push(); }, actions: ['revert', 'push'],
        goals: [{ text: 'git revert HEAD', check: (s) => s.did('git revert'), hint: 'revert' }, { text: 'Push', check: C.pushed, hint: 'push' }] } } },
      { title: 'Chọn cái nào?', visual: { html: V.compare(
        { title: 'reset', tone: 'bad', note: 'Chỉ cho commit CHƯA push. Viết lại lịch sử.' },
        { title: 'revert', tone: 'good', note: 'Cho commit ĐÃ push. Thêm lịch sử, không xoá.' }) } },
      { title: 'Cứu hộ: reflog', text: 'Lỡ reset --hard? Git vẫn nhớ HEAD cũ ~90 ngày.', visual: { html: V.terminal([
        '$ git reflog', 'a1b2c3d HEAD@{0}: reset: moving to HEAD~1', '9f8e7d6 HEAD@{1}: commit: C3', '$ git reset --hard 9f8e7d6', '# C3 đã quay lại']) } },
    ] },
    { id: 'a-stash', title: 'Stash', desc: 'Cất việc dở dang để sửa gấp chỗ khác.', tags: ['stash'], slides: [
      { title: 'Đang dở thì có <em>bug gấp</em>', text: 'Stash cất tạm → sửa bug → lấy lại.', wide: true, visual: { sim: {
        setup: (s) => { s.branch('feature'); s.edit('feature.js'); }, actions: ['stash', 'checkout:main', 'edit:bug.js', 'stageAll', 'commit', 'checkout:feature', 'stashPop'],
        goals: [{ text: 'Stash việc dở', check: (s) => s.stashes.length === 1 && !s.work.length, hint: 'stash' },
          { text: 'Sang main', check: (s) => s.head === 'main', hint: 'checkout:main' },
          { text: 'Sửa & commit bug.js', check: (s) => s.commits[s.branches.main].files.includes('bug.js'), hint: 'edit:bug.js' },
          { text: 'Về feature', check: (s) => s.head === 'feature', hint: 'checkout:feature' },
          { text: 'Stash pop', check: (s) => !s.stashes.length, hint: 'stashPop' }] } } },
    ] },
    { id: 'a-cherry', title: 'Cherry-pick', desc: 'Lấy đúng một commit từ nhánh khác.', tags: ['cherry-pick'], slides: [
      { title: 'Chỉ cần <em>1 commit</em>', text: 'Bản fix nằm trên dev, nhưng release cần ngay. Không merge cả dev.', wide: true, visual: { sim: { zones: false,
        setup: (s) => { s.branch('dev'); s.quick('x.js', 'WIP lớn'); s.quick('y.js', 'WIP 2'); s.quick('crash.js', 'Fix crash'); s.checkout('main'); }, actions: ['cherry:dev'],
        goals: [{ text: 'Cherry-pick “Fix crash” vào main', check: (s) => s.headCommit.msg === 'Fix crash', hint: 'cherry:dev' }] } } },
    ] },
    { id: 'a-submodule', title: 'Submodule', desc: 'Repo trong repo: con trỏ SHA, init, update, bump.', tags: ['submodule', '.gitmodules'], slides: [
      { title: 'Repo <em>trong</em> repo', text: 'Repo cha KHÔNG chứa code của module — chỉ lưu đường dẫn + <b>1 commit SHA</b> của repo con.', visual: { html: V.terminal([
        '$ cat .gitmodules', '[submodule "Assets/BaseCode"]', '    path = Assets/BaseCode', '    url = git@github.com:studio/base-code.git',
        '$ git ls-tree HEAD Assets/BaseCode', '160000 commit b72d4e1  Assets/BaseCode', '# 160000 = "đây là con trỏ tới commit, không phải thư mục"']) } },
      { title: 'Clone xong <em>thư mục trống</em>?', text: 'Clone thường không kéo code submodule. Phải init + update.', wide: true, visual: { submodule: {
        actions: ['subPull', 'update'],
        goals: [{ text: 'Init & update submodule', check: (m) => !!m.sub.head, hint: 'update' }] } } },
      { title: 'Nâng module lên <em>bản mới</em>', text: 'Kéo code mới trong submodule → repo cha thấy “modified” → commit con trỏ → push.', wide: true, visual: { submodule: {
        setup: (m) => m.update(), actions: ['teammateSub', 'subPull', 'commitPin', 'pushParent'],
        goals: [{ text: 'Đồng nghiệp push base-code', check: (m) => m.sub.remote.length > 2, hint: 'teammateSub' },
          { text: 'Pull trong submodule', check: (m) => m.sub.head === m.latest, hint: 'subPull' },
          { text: 'Commit con trỏ mới ở repo cha', check: (m) => m.parent.pin === m.latest, hint: 'commitPin' },
          { text: 'Push repo cha', check: (m) => m.parent.remotePin === m.latest, hint: 'pushParent' }] } } },
      { title: 'Pull xong <em>nhớ update</em>', text: 'Pull repo cha chỉ đổi con trỏ. Code trong thư mục submodule vẫn cũ cho tới khi update.', wide: true, visual: { submodule: {
        setup: (m) => m.update(), actions: ['teammateBump', 'pullParent', 'update'],
        goals: [{ text: 'Đồng nghiệp bump con trỏ', check: (m) => m.parent.behind > 0 || m.did('git pull'), hint: 'teammateBump' },
          { text: 'Pull repo cha → thấy lệch', check: (m) => m.did('git pull'), hint: 'pullParent' },
          { text: 'git submodule update', check: (m) => m.did('git pull') && m.synced, hint: 'update' }] } } },
      { title: 'Mẹo tránh rắc rối', points: ['Clone 1 lần đủ: <code>git clone --recurse-submodules</code>',
        'Tự update khi pull/checkout: <code>git config submodule.recurse true</code>',
        'Sau update submodule ở <b>detached HEAD</b> → <code>git switch main</code> trước khi sửa code trong đó',
        'Sửa module: commit + push <b>trong repo con trước</b>, rồi mới commit con trỏ ở repo cha'] },
    ] },
    { id: 'a-flow', title: 'Quy trình team', desc: 'Feature branch, Pull Request, quy ước commit.', tags: ['PR', 'workflow'], slides: [
      { title: 'Feature branch flow', visual: { html: V.flow([{ icon: '⑂', t: 'Tạo nhánh', s: 'feat/login' }, { via: 'commit', icon: '⬆', t: 'Push nhánh' },
        { via: 'mở', icon: '👀', t: 'Pull Request', s: 'review + CI' }, { via: 'merge', icon: '✓', t: 'main' }]) } },
      { title: 'Lệnh một vòng', visual: { html: V.terminal(['$ git switch -c feat/login', '$ git add -p', '$ git commit -m "feat: login form"', '$ git fetch && git rebase origin/main', '$ git push -u origin feat/login', '# mở PR trên GitHub/GitLab']) } },
      { title: 'Conventional commits', points: ['<code>feat:</code> tính năng mới', '<code>fix:</code> sửa lỗi', '<code>refactor:</code> đổi code, không đổi hành vi', '<code>chore:</code> việc vặt (build, config)'] },
    ] },
    { id: 'a-play', title: 'Sân chơi dev', desc: 'Mọi lệnh, không giới hạn.', tags: ['tự do'], slides: [
      { title: 'Sân chơi <em>đầy đủ</em>', wide: true, visual: { sim: { setup: (s) => { s.quick('index.html', 'Init'); s.setupRemote(); }, discard: true,
        actions: ['edit:app.js', 'edit:api.js', 'stageAll', 'commit', 'push', 'pull', 'fetch', 'teammate:api.js', 'branch:feature', 'checkout:main', 'checkout:feature',
          'merge:feature', 'rebase:main', 'reset:soft', 'reset:hard', 'revert', 'stash', 'stashPop', 'cherry:feature'] } } },
    ] },
  ];
})();
