/* Fork-style UI helpers: inline SVG icons + presentational fake data (dates, full SHA, avatars, diffs). */
(function () {
  const GL = window.GL;
  const svg = (d, w = 18) => `<svg width="${w}" height="${w}" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
  const FK = (GL.FK = {});

  FK.icon = {
    sidebar: svg('<rect x="2" y="3" width="14" height="12" rx="1"/><path d="M6.5 3v12"/>'),
    launch: svg('<path d="M2 5h5l1.5 1.5H16V14H2z"/>'),
    fetch: svg('<path d="M14 9a5 5 0 1 1-1.5-3.6"/><path d="M13 2.5V6H9.5"/>'),
    pull: svg('<path d="M9 2v10M5 8l4 4 4-4"/><path d="M4 15.5h10"/>'),
    push: svg('<path d="M9 14V4M5 8l4-4 4 4"/><path d="M4 1.5h10"/>'),
    stash: svg('<rect x="2.5" y="3" width="13" height="12" rx="1"/><path d="M2.5 7.5h13M7 11h4"/>'),
    branch: svg('<circle cx="5" cy="3.5" r="1.7"/><circle cx="5" cy="14.5" r="1.7"/><circle cx="13" cy="5.5" r="1.7"/><path d="M5 5.2v7.6M13 7.2c0 3.5-8 2.3-8 5.6"/>'),
    branchSm: svg('<circle cx="5" cy="3.5" r="1.7"/><circle cx="5" cy="14.5" r="1.7"/><circle cx="13" cy="5.5" r="1.7"/><path d="M5 5.2v7.6M13 7.2c0 3.5-8 2.3-8 5.6"/>', 13),
    openIn: svg('<path d="M7 4H3v11h11v-4M10 2.5h5.5V8M15.5 2.5 8 10"/>'),
    console: svg('<rect x="2" y="3" width="14" height="12" rx="1"/><path d="M5 7l2 2-2 2M9.5 11h3.5"/>'),
    appearance: svg('<rect x="2" y="3" width="14" height="12" rx="1"/><path d="M8 3v12M10.5 6.5h3M10.5 9h3"/>'),
    bell: svg('<path d="M4.5 12.5V8a4.5 4.5 0 0 1 9 0v4.5l1.5 1.5h-12zM7.5 15.5h3"/>', 15),
    smile: svg('<circle cx="9" cy="9" r="6.5"/><path d="M6.5 10.5c1.3 1.5 3.7 1.5 5 0M7 7h.01M11 7h.01"/>', 15),
    gear: svg('<circle cx="9" cy="9" r="2.3"/><path d="M9 1.8v2.4M9 13.8v2.4M1.8 9h2.4M13.8 9h2.4M3.9 3.9l1.7 1.7M12.4 12.4l1.7 1.7M3.9 14.1l1.7-1.7M12.4 5.6l1.7-1.7"/>', 14),
    search: svg('<circle cx="8" cy="8" r="4.5"/><path d="M11.5 11.5 15 15"/>', 14),
    remote: svg('<path d="M5 14h8.5a3.5 3.5 0 0 0 .3-7A5 5 0 0 0 4.2 8.2 3 3 0 0 0 5 14z"/>', 14),
    local: svg('<rect x="2.5" y="2.5" width="13" height="13" rx="1.5"/><path d="M5.5 6.5h7M5.5 9h7M5.5 11.5h4"/>', 15),
    history: svg('<rect x="3" y="2.5" width="12" height="13" rx="1.5"/><path d="M6 6h6M6 9h6M6 12h6"/>', 15),
    folder: '<svg width="15" height="13" viewBox="0 0 15 13"><path d="M0.5 1.5h5l1.5 1.5h7.5v9h-14z" fill="#e3b341"/></svg>',
    file: '<svg width="11" height="13" viewBox="0 0 11 13"><path d="M.5.5h6.5l3.5 3.5v8.5h-10z" fill="var(--k-file)" stroke="var(--k-file-bd)"/><path d="M7 .5V4h3.5" fill="none" stroke="var(--k-file-bd)"/></svg>',
    chevD: svg('<path d="M5 7l4 4 4-4"/>', 11), chevR: svg('<path d="M7 5l4 4-4 4"/>', 11),
    win: { min: svg('<path d="M4 9h10"/>', 13), max: svg('<rect x="4" y="4" width="10" height="10"/>', 13), close: svg('<path d="M4 4l10 10M14 4 4 14"/>', 13) },
  };

  // Deterministic, purely visual metadata
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  FK.date = (n) => {
    const d = new Date(2026, 10, 12, 9, 0 + n * 17), p = (x) => String(x).padStart(2, '0');
    return `${d.getDate()} ${MON[d.getMonth()]} ${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
  };
  FK.fullSha = (id) => (id + [...id].reverse().join('') + id + id.slice(2) + 'c0ffee5ad1').slice(0, 40);
  FK.person = (author) => author === 'Bạn'
    ? { name: 'Bạn', email: 'ban@studio.vn', letter: 'B', color: '#4caf50' }
    : { name: 'Đồng nghiệp', email: 'dongnghiep@studio.vn', letter: 'Đ', color: '#5c8df6' };

  // Fake diff lines for a file: [{t:'+'|'-'|' ', s}] or null for binaries
  FK.diff = (file, kind) => {
    const ext = (file.split('.').pop() || '').toLowerCase(), name = file.split('/').pop().split('.')[0];
    if (['png', 'jpg', 'psd', 'wav', 'fbx'].includes(ext)) return null;
    const body = ext === 'cs'
      ? [['using UnityEngine;'], [''], [`public class ${name} : MonoBehaviour`], ['{'],
        ['    [SerializeField] private float speed = 3f;', '-'], ['    [SerializeField] private float speed = 5f;', '+'],
        ['    [SerializeField] private int maxCoins = 999;', '+'], [''], ['    private void Update()'], ['    {'],
        ['        Move(Time.deltaTime);'], ['    }'], ['}']]
      : ext === 'md' || ext === 'txt' || ext === 'log'
        ? [[`# ${name}`], [''], ['Ghi chú cũ', '-'], ['Ghi chú mới cập nhật hôm nay', '+'], ['- dòng thêm vào', '+']]
        : [['%YAML 1.1'], ['--- !u!1 &1001'], ['GameObject:'], [`  m_Name: ${name}`], ['  m_IsActive: 0', '-'], ['  m_IsActive: 1', '+'], ['  m_Layer: 5', '+']];
    if (kind === 'A') return body.filter(([, t]) => t !== '-').map(([s]) => ({ t: '+', s }));
    return body.map(([s, t]) => ({ t: t || ' ', s }));
  };
})();
