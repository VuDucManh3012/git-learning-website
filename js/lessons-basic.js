/* Basic mode lessons — for non-dev teams (art, QA, PM, design). Short text, lots of clicking. */
(function () {
  const GL = window.GL, V = GL.V;
  // Reusable goal checks
  const C = (GL.C = {
    dirty: (s) => s.work.length > 0,
    staged: (s) => s.staged.length > 0,
    committed: (s) => s.did('git commit'),
    pushed: (s) => !!s.remote && s.remote.branches[s.head] === s.headId,
    hasRemoteTip: (s) => !!s.remote && s.isAncestor(s.remote.branches.main, s.headId),
  });
  const withRemote = (fn) => (s) => { s.quick('index.html', 'Trang chủ đầu tiên'); s.setupRemote(); if (fn) fn(s); };
  const FLOW4 = [
    { icon: '📝', t: 'Working', s: 'nơi bạn sửa file' },
    { via: 'stage', icon: '📋', t: 'Staging', s: 'chọn cái sẽ lưu' },
    { via: 'commit', icon: '📦', t: 'Local', s: 'lưu trên máy bạn' },
    { via: 'push', icon: '☁️', t: 'Remote', s: 'kho chung của team' },
  ];

  GL.LESSONS_BASIC = [
    { id: 'b-intro', title: 'Git là gì?', desc: 'Cỗ máy thời gian cho file của cả team.', tags: ['repo', 'remote'], slides: [
      { title: 'Git = <em>cỗ máy thời gian</em>', text: 'Mỗi lần lưu là một mốc. Lỡ làm hỏng? Quay lại mốc cũ.', visual: { html: V.snapshots(['Bản nháp', 'Thêm logo', 'Đổi màu nút', 'Sửa chính tả']) } },
      { title: 'Cả team cùng làm, <em>không đè nhau</em>', text: 'Mỗi người có bản riêng trên máy. Kho chung giữ bản của cả team.', visual: { html: V.flow([
        { icon: '💻', t: 'Máy bạn' }, { via: 'push ↑', icon: '☁️', t: 'Kho chung', s: 'GitHub / GitLab' }, { via: '↓ pull', icon: '💻', t: 'Máy đồng nghiệp' }]) } },
      { title: '4 nơi cần nhớ', text: 'File đi qua 4 trạm. Nhớ hình này là hiểu 80% Git.', wide: true, visual: { html: V.flow(FLOW4) } },
    ] },
    { id: 'b-commit', title: 'Stage & Commit', desc: 'Chọn thay đổi rồi “chụp ảnh” lưu lại.', tags: ['add', 'commit'], slides: [
      { title: 'Commit = <em>chụp ảnh</em> dự án', text: 'Stage = chọn ai vào ảnh. Commit = bấm máy.', visual: { html: V.flow(FLOW4.slice(0, 3)) } },
      { title: 'Thử ngay', text: 'Làm lần lượt 3 bước — nút cần bấm sẽ nhấp nháy.', wide: true, visual: { sim: {
        actions: ['edit:index.html', 'edit:style.css', 'stageAll', 'commit'],
        goals: [{ text: 'Sửa 1 file', check: C.dirty, hint: 'edit:index.html' }, { text: 'Stage nó', check: C.staged, hint: 'stageAll' }, { text: 'Commit', check: C.committed, hint: 'commit' }] } } },
      { title: 'Chỉ stage <em>cái cần</em>', text: 'Bấm vào tên file để stage riêng file đó.', wide: true, visual: { sim: {
        setup: (s) => { s.edit('index.html'); s.edit('style.css'); }, actions: ['commit'],
        goals: [{ text: 'Chỉ stage <b>style.css</b>', check: (s) => s.staged.some((x) => x.file === 'style.css') && s.work.length === 1, hint: 'chip-work' },
          { text: 'Commit riêng nó', check: (s) => C.committed(s) && s.work.length === 1, hint: 'commit' }] } } },
      { title: 'Lời nhắn commit', text: 'Viết để 3 tháng sau đọc vẫn hiểu.', visual: { html: V.compare(
        { title: '✗ Khó hiểu', tone: 'bad', html: '<code>sửa</code><code>abc</code><code>update</code>' },
        { title: '✓ Rõ ràng', tone: 'good', html: '<code>Sửa nút Đăng nhập trên iPhone</code><code>Thêm ảnh nền màn Shop</code>' }) } },
    ] },
    { id: 'b-discard', title: 'Discard & Unstage', desc: 'Huỷ thay đổi lỡ tay — và phân biệt hai nút dễ nhầm.', tags: ['restore'], slides: [
      { title: 'Discard = <em>huỷ</em> thay đổi', text: 'File quay về bản commit gần nhất. ⚠ Không lấy lại được!', wide: true, visual: { sim: {
        setup: (s) => { s.quick('config.json', 'Thêm cấu hình'); s.edit('config.json'); }, discard: true, actions: ['edit:config.json'],
        goals: [{ text: 'Bấm × trên <b>config.json</b> để discard', check: (s) => !s.work.length, hint: 'discard' }] } } },
      { title: 'Unstage ≠ Discard', visual: { html: V.compare(
        { title: 'Unstage', tone: 'good', note: 'Bỏ khỏi Staging. Thay đổi VẪN CÒN.' },
        { title: 'Discard', tone: 'bad', note: 'Xoá thay đổi. MẤT LUÔN.' }) } },
      { title: 'Thử cả hai', text: 'Bấm file ở Staging để unstage, rồi × để discard.', wide: true, visual: { sim: {
        setup: (s) => { s.edit('logo.png'); s.stage(); }, discard: true,
        goals: [{ text: 'Unstage <b>logo.png</b>', check: (s) => !s.staged.length && s.work.length === 1, hint: 'chip-stage' },
          { text: 'Discard nó', check: (s) => !s.work.length, hint: 'discard' }] } } },
    ] },
    { id: 'b-sync', title: 'Push & Pull', desc: 'Gửi lên và lấy về từ kho chung.', tags: ['push', 'pull'], slides: [
      { title: 'Push ↑ gửi · Pull ↓ lấy', text: 'Commit chỉ nằm trên máy bạn cho tới khi Push.', visual: { html: V.flow(FLOW4.slice(2)) } },
      { title: 'Push commit của bạn', wide: true, visual: { sim: { setup: withRemote((s) => s.quick('about.html', 'Thêm trang Giới thiệu')), actions: ['push'],
        goals: [{ text: 'Push lên remote', check: C.pushed, hint: 'push' }] } } },
      { title: 'Pull bản mới của team', wide: true, visual: { sim: { setup: withRemote((s) => s.teammatePush('banner.png', 'Đổi banner Tết')), actions: ['pull'],
        goals: [{ text: 'Pull về', check: C.hasRemoteTip, hint: 'pull' }] } } },
      { title: 'Push bị <em>từ chối</em>?', text: 'Remote có cái mới bạn chưa có. Pull trước, push sau.', wide: true, visual: { sim: {
        setup: withRemote((s) => { s.teammatePush('index.html'); s.quick('style.css', 'Đổi màu nút'); }), actions: ['push', 'pull'],
        goals: [{ text: 'Thử Push', check: (s) => s.log.some((l) => !l.ok && l.cmd.startsWith('git push')), hint: 'push' },
          { text: 'Pull', check: C.hasRemoteTip, hint: 'pull' }, { text: 'Push lại', check: C.pushed, hint: 'push' }] } } },
      { title: 'Thói quen vàng', visual: { html: V.tiles([{ icon: '☀️', t: 'Đầu ngày', s: 'Pull' }, { icon: '💾', t: 'Xong 1 việc', s: 'Commit' }, { icon: '🌙', t: 'Cuối ngày', s: 'Push' }]) } },
    ] },
    { id: 'b-branch', title: 'Branch & Merge', desc: 'Làm trên nhánh riêng, xong thì gộp vào.', tags: ['branch', 'merge'], slides: [
      { title: 'Nhánh = <em>bản thử</em> an toàn', text: 'main luôn chạy được. Việc mới làm trên nhánh riêng.', visual: { html: () => V.graph((s) => {
        s.quick('a', 'Bản ổn định'); s.branch('feature'); s.quick('b', 'Thử tính năng'); s.quick('c', 'Hoàn thiện'); s.checkout('main'); s.merge('feature'); }) } },
      { title: 'Tự làm một vòng', wide: true, visual: { sim: { setup: (s) => s.quick('index.html', 'Trang chủ'),
        actions: ['branch:feature', 'edit:menu.html', 'stageAll', 'commit', 'checkout:main', 'merge:feature'],
        goals: [{ text: 'Tạo nhánh feature', check: (s) => !!s.branches.feature, hint: 'branch:feature' },
          { text: 'Sửa, stage, commit trên feature', check: (s) => s.branches.feature !== s.branches.main, hint: 'edit:menu.html' },
          { text: 'Quay về main', check: (s) => s.head === 'main', hint: 'checkout:main' },
          { text: 'Merge feature vào main', check: (s) => s.isAncestor(s.branches.feature, s.branches.main), hint: 'merge:feature' }] } } },
    ] },
    { id: 'b-conflict', title: 'Conflict', desc: 'Hai người sửa cùng chỗ — chọn bản nào?', tags: ['conflict'], slides: [
      { title: 'Conflict là gì?', text: 'Hai người sửa <b>cùng một chỗ</b>. Git không đoán — nó hỏi bạn.', visual: { html: V.compare(
        { title: '👩 Bạn sửa', html: '<code>tieu_de = "Sale 50%"</code>' }, { title: '👨 Đồng nghiệp sửa', html: '<code>tieu_de = "Sale 30%"</code>' }) } },
      { title: 'Xử lý conflict', text: 'Pull → chọn bản → commit → push.', wide: true, visual: { sim: {
        setup: withRemote((s) => { s.teammatePush('index.html', 'Đổi tiêu đề Sale 30%'); s.quick('index.html', 'Đổi tiêu đề Sale 50%'); }), actions: ['pull', 'commit', 'push'],
        goals: [{ text: 'Pull', check: (s) => s.did('git pull') || !!s.conflict, hint: 'pull' },
          { text: 'Chọn bản giữ lại', check: (s) => !s.conflict || !s.conflict.files.length, hint: 'resolve' },
          { text: 'Commit', check: (s) => !s.conflict && s.headCommit.parents.length === 2, hint: 'commit' },
          { text: 'Push', check: C.pushed, hint: 'push' }] } } },
      { title: 'Ít conflict hơn', visual: { html: V.tiles([{ icon: '🔄', t: 'Pull thường xuyên' }, { icon: '🧩', t: 'Commit nhỏ' }, { icon: '💬', t: 'Báo nhau', s: 'khi sửa chung file' }, { icon: '🙋', t: 'Không chắc?', s: 'hỏi dev' }]) } },
    ] },
    { id: 'b-play', title: 'Sân chơi', desc: 'Bấm thoải mái, không sợ hỏng gì.', tags: ['tự do'], slides: [
      { title: 'Sân chơi <em>tự do</em>', text: 'Thử mọi nút. Bấm ↺ để làm lại.', wide: true, visual: { sim: { setup: withRemote(), discard: true,
        actions: ['edit:index.html', 'edit:style.css', 'stageAll', 'commit', 'push', 'pull', 'teammate:index.html', 'branch:feature', 'checkout:main', 'checkout:feature', 'merge:feature'] } } },
    ] },
  ];
})();
