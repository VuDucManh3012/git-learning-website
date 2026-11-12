/* Renders a GitSim commit graph as SVG.
   horizontal (default): time flows left→right, one row per branch lane, with branch tags.
   vertical: newest on top, dots only (Fork-style list draws labels itself). */
(function () {
  const GL = window.GL, esc = GL.esc;
  const LANE_COLORS = ['var(--b0)', 'var(--b1)', 'var(--b2)', 'var(--b3)', 'var(--b4)'];

  // Lanes follow first-parent chains: main first, then other branches, then remote branches.
  // A rebased + fast-forwarded branch therefore lands on main's line (straight history).
  function lanesFor(sim) {
    const names = ['main', ...Object.keys(sim.branches).filter((b) => b !== 'main')];
    const tips = names.map((b) => sim.branches[b]);
    if (sim.remote) Object.entries(sim.remote.branches).forEach(([b, id]) => { names.push(`origin/${b}`); tips.push(id); });
    const laneOf = {};
    names.forEach((n, i) => {
      let c = tips[i];
      while (c && !laneOf[c] && sim.known.has(c)) { laneOf[c] = n; c = sim.commits[c].parents[0]; }
    });
    return { names, laneOf };
  }
  GL.laneColor = (sim, name) => {
    const { names } = lanesFor(sim), i = names.indexOf(name);
    return name.startsWith('origin/') ? 'var(--ink-3)' : LANE_COLORS[Math.max(0, i) % LANE_COLORS.length];
  };
  GL.laneRank = (sim, name) => { const i = lanesFor(sim).names.indexOf(name); return i < 0 ? 99 : i; };
  GL.usedLaneCount = (sim) => { const { laneOf } = lanesFor(sim); return new Set(sim.visible().map((c) => laneOf[c.id] || c.lane)).size; };

  // Branch / remote labels per commit id
  GL.refsOf = function (sim) {
    const refs = {};
    const add = (id, r) => (refs[id] = refs[id] || []).push(r);
    Object.entries(sim.branches).forEach(([name, id]) => add(id, { name, head: name === sim.head }));
    if (sim.remote) Object.entries(sim.remote.branches).forEach(([name, id]) => { if (sim.known.has(id)) add(id, { name: `origin/${name}`, remote: true }); });
    return refs;
  };

  GL.renderGraph = function (sim, opt = {}) {
    const vis = sim.visible(), refs = GL.refsOf(sim), { laneOf } = lanesFor(sim);
    const laneName = (c) => laneOf[c.id] || c.lane;
    const lanes = [...new Set(vis.map(laneName))].sort((a, b) => GL.laneRank(sim, a) - GL.laneRank(sim, b));
    const v = !!opt.vertical, newest = opt.newestN ?? -1;
    const gap = v ? (opt.rowH || 34) : 74, laneGap = v ? 16 : 64;
    const maxRefs = Math.max(1, ...vis.map((c) => (refs[c.id] || []).length));
    const padTop = v ? gap / 2 : 22 + maxRefs * 22, padL = v ? 12 : 66;
    const idx = new Map(vis.map((c, i) => [c.id, i]));
    const pos = (c) => {
      const i = idx.get(c.id), l = lanes.indexOf(laneName(c));
      return v ? [padL + l * laneGap, padTop + (vis.length - 1 - i) * gap] : [padL + i * gap, padTop + l * laneGap];
    };
    const W = v ? padL * 2 + (lanes.length - 1) * laneGap : padL * 2 + Math.max(0, vis.length - 1) * gap;
    const H = v ? vis.length * gap : padTop + (lanes.length - 1) * laneGap + 34;
    const color = (c) => GL.laneColor(sim, laneName(c));

    let edges = '', nodes = '', tags = '';
    vis.forEach((c) => {
      const [x, y] = pos(c);
      c.parents.forEach((pid) => {
        if (!idx.has(pid)) return;
        const [px, py] = pos(sim.commits[pid]);
        const d = v
          ? `M${px},${py} C${px},${(py + y) / 2} ${x},${(py + y) / 2} ${x},${y}`
          : `M${px},${py} C${(px + x) / 2},${py} ${(px + x) / 2},${y} ${x},${y}`;
        edges += `<path d="${d}" stroke="${color(c.parents.length > 1 && pid !== c.parents[0] ? sim.commits[pid] : c)}" class="g-edge"/>`;
      });
      const isHead = c.id === sim.headId, r = v ? 5 : 10;
      nodes += `<g class="g-node${c.n === newest ? ' g-new' : ''}${c.author !== 'Bạn' ? ' g-mate' : ''}" style="--x:${x}px;--y:${y}px">
        <title>${esc(c.msg)} · ${esc(c.author)}</title>
        ${isHead ? `<circle cx="${x}" cy="${y}" r="${r + 5}" class="g-halo" stroke="${color(c)}"/>` : ''}
        <circle cx="${x}" cy="${y}" r="${r}" fill="${color(c)}" class="g-dot${c.parents.length > 1 ? ' g-merge' : ''}"/>
        ${v ? '' : `<text x="${x}" y="${y + 28}" class="g-hash">${c.id.slice(0, 5)}</text>`}</g>`;
      if (v) return;
      (refs[c.id] || []).forEach((ref, k) => {
        const label = ref.head ? `HEAD → ${ref.name}` : ref.name, w = label.length * 7 + 16, ty = y - 26 - k * 22;
        tags += `<g class="g-tag${ref.head ? ' is-head' : ''}${ref.remote ? ' is-remote' : ''}">
          <rect x="${x - w / 2}" y="${ty - 9}" width="${w}" height="18" rx="9" style="--c:${GL.laneColor(sim, ref.name)}"/>
          <text x="${x}" y="${ty + 4}">${esc(label)}</text></g>`;
      });
    });
    return `<svg class="g-svg${v ? ' g-vert' : ''}" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Sơ đồ commit">${edges}${nodes}${tags}</svg>`;
  };
})();
