/* Small builders for non-interactive slide visuals (all return HTML strings). */
(function () {
  const GL = window.GL, esc = GL.esc;
  const V = (GL.V = {});

  // Save points on a timeline (like checkpoints in a game)
  V.snapshots = (items) => `<div class="v-snaps">${items.map((t, i) => `
    <div class="v-snap" style="--d:${i * 0.35}s"><span class="v-snap-dot"></span><b>v${i + 1}</b><small>${esc(t)}</small></div>`).join('')}</div>`;

  // Boxes connected by arrows; a packet travels along them
  V.flow = (steps) => `<div class="v-flow">${steps.map((s, i) => `
    ${i ? `<div class="v-flow-arrow"><span>${esc(s.via || '')}</span></div>` : ''}
    <div class="v-flow-box" style="--d:${i * 0.6}s"><div class="v-ico">${s.icon}</div><b>${esc(s.t)}</b><small>${esc(s.s || '')}</small></div>`).join('')}
    <span class="v-packet" style="--n:${steps.length}"></span></div>`;

  // Terminal: "$ cmd" lines are commands, "# ..." dim comments, others output
  V.terminal = (lines) => `<div class="v-term"><div class="v-term-bar"><i></i><i></i><i></i></div>${lines.map((l, i) => {
    const cls = l.startsWith('$') ? 'c' : l.startsWith('#') ? 'm' : 'o';
    return `<div class="v-tl ${cls}" style="--d:${i * 0.25}s">${esc(l)}</div>`;
  }).join('')}</div>`;

  // Two cards side by side
  V.compare = (a, b) => `<div class="v-cmp">${[a, b].map((c) => `
    <div class="v-cmp-card tone-${c.tone || 'n'}"><h4>${esc(c.title)}</h4>${c.html || ''}${c.note ? `<p>${esc(c.note)}</p>` : ''}</div>`).join('')}</div>`;

  // Grid of big icon tiles
  V.tiles = (items) => `<div class="v-tiles">${items.map((it, i) => `
    <div class="v-tile" style="--d:${i * 0.12}s"><div class="v-ico">${it.icon}</div><b>${esc(it.t)}</b><small>${esc(it.s || '')}</small></div>`).join('')}</div>`;

  // Static commit graph from a scenario
  V.graph = (setup, cls = '') => {
    const s = new GL.GitSim();
    s.silently(setup);
    return `<div class="v-graph ${cls}">${GL.renderGraph(s)}</div>`;
  };
})();
