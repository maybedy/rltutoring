/* RL Atlas 플롯: 의존성 없는 SVG 선/막대 그래프. 색은 CSS 토큰(c1..c6, accent, signal...)으로 지정 */
(function () {
  'use strict';
  const RL = window.RL;
  const NS = 'http://www.w3.org/2000/svg';

  function s(tag, attrs) {
    const el = document.createElementNS(NS, tag);
    for (const k in attrs) if (attrs[k] != null) el.setAttribute(k, attrs[k]);
    return el;
  }
  function colorVar(c) {
    if (!c) return 'var(--c1)';
    if (c.startsWith('#') || c.startsWith('rgb') || c.startsWith('var(') || c.startsWith('color-mix')) return c;
    return 'var(--' + c + ')';
  }
  RL.colorVar = colorVar;

  function niceStep(span, n) {
    const raw = span / Math.max(1, n);
    const mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const r = raw / mag;
    return (r >= 5 ? 10 : r >= 2 ? 5 : r >= 1 ? 2 : 1) * mag;
  }
  function ticks(min, max, n) {
    if (!(max > min)) return [min];
    const st = niceStep(max - min, n || 5);
    const out = [];
    for (let v = Math.ceil(min / st - 1e-9) * st; v <= max + st * 1e-6; v += st) out.push(+v.toFixed(10));
    return out;
  }
  function fmtTick(v) {
    const a = Math.abs(v);
    if (a === 0) return '0';
    if (a >= 10000) return (v / 1000).toFixed(0) + 'k';
    if (a >= 100) return v.toFixed(0);
    if (a >= 1) return +v.toFixed(2) + '';
    return +v.toPrecision(2) + '';
  }

  /* line(el, {width, height, x:{min,max,label,log}, y:{min,max,label}, series:[{name,color,data:[[x,y]],dash,area,width}], hlines, vlines, legend, hover}) */
  // 컨테이너 실제 폭에 맞춰 viewBox를 잡아 글자 크기를 일정하게 유지하고, 폭이 바뀌면 다시 그린다
  function responsive(wrap, draw) {
    if (typeof ResizeObserver === 'undefined') return;
    let lastW = 0, t = 0;
    const ro = new ResizeObserver(() => {
      const w = Math.round(wrap.clientWidth);
      if (!w || Math.abs(w - lastW) < 2) return;
      lastW = w;
      clearTimeout(t);
      t = setTimeout(draw, 60);
    });
    ro.observe(wrap);
    if (RL.cleanup) RL.cleanup.push(() => ro.disconnect());
  }
  function widthOf(wrap, fallback) {
    const w = wrap.clientWidth;
    return w ? Math.max(260, Math.round(w)) : fallback;
  }

  function line(el, opts) {
    let W = opts.width || 640;
    const H = opts.height || 260;
    const m = Object.assign({ l: 48, r: 16, t: 12, b: 38 }, opts.margin || {});
    const wrap = document.createElement('div');
    wrap.className = 'plot';
    el.appendChild(wrap);
    const svg = s('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': opts.ariaLabel || opts.title || '그래프' });
    wrap.appendChild(svg);
    const legend = document.createElement('div');
    legend.className = 'legend';
    if (opts.legend !== false) wrap.appendChild(legend);
    const tip = document.createElement('div');
    tip.className = 'tip';
    tip.hidden = true;
    wrap.appendChild(tip);

    let state = Object.assign({}, opts);

    function domain() {
      const xs = [], ys = [];
      (state.series || []).forEach((se) => se.data.forEach((p) => { if (Number.isFinite(p[0])) xs.push(p[0]); if (Number.isFinite(p[1])) ys.push(p[1]); }));
      (state.hlines || []).forEach((l) => ys.push(l.y));
      const x = state.x || {}, y = state.y || {};
      let x0 = x.min != null ? x.min : Math.min(...xs), x1 = x.max != null ? x.max : Math.max(...xs);
      let y0 = y.min != null ? y.min : Math.min(...ys), y1 = y.max != null ? y.max : Math.max(...ys);
      if (!Number.isFinite(x0)) { x0 = 0; x1 = 1; }
      if (!Number.isFinite(y0)) { y0 = 0; y1 = 1; }
      if (x1 === x0) x1 = x0 + 1;
      if (y1 === y0) { y1 = y0 + 1; y0 = y0 - 1; }
      if (y.min == null || y.max == null) {
        const pad = (y1 - y0) * 0.06;
        if (y.min == null) y0 -= pad;
        if (y.max == null) y1 += pad;
      }
      return { x0, x1, y0, y1 };
    }

    function draw() {
      W = widthOf(wrap, opts.width || 640);
      svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
      svg.innerHTML = '';
      const d = domain();
      const logx = state.x && state.x.log;
      const lx = (v) => (logx ? Math.log10(Math.max(v, 1e-12)) : v);
      const X = (v) => m.l + ((lx(v) - lx(d.x0)) / (lx(d.x1) - lx(d.x0))) * (W - m.l - m.r);
      const Y = (v) => H - m.b - ((v - d.y0) / (d.y1 - d.y0)) * (H - m.t - m.b);
      const clampY = (v) => Math.max(m.t - 4, Math.min(H - m.b + 4, Y(v)));
      const g = s('g', {});
      svg.appendChild(g);

      // grid + ticks
      const yt = ticks(d.y0, d.y1, state.y && state.y.ticks || 5);
      yt.forEach((v) => {
        g.appendChild(s('line', { class: 'gridline', x1: m.l, x2: W - m.r, y1: Y(v), y2: Y(v) }));
        const t = s('text', { x: m.l - 6, y: Y(v), 'text-anchor': 'end', 'dominant-baseline': 'middle', class: 'tick' });
        t.textContent = (state.y && state.y.fmt) ? state.y.fmt(v) : fmtTick(v);
        t.setAttribute('class', 'tick');
        const tg = s('g', { class: 'tick' }); tg.appendChild(t); g.appendChild(tg);
      });
      let xt;
      if (logx) {
        xt = [];
        for (let p = Math.ceil(Math.log10(d.x0)); p <= Math.floor(Math.log10(d.x1)); p++) xt.push(Math.pow(10, p));
      } else xt = ticks(d.x0, d.x1, state.x && state.x.ticks || 6);
      xt.forEach((v) => {
        const tg = s('g', { class: 'tick' });
        const t = s('text', { x: X(v), y: H - m.b + 16, 'text-anchor': 'middle' });
        t.textContent = (state.x && state.x.fmt) ? state.x.fmt(v) : fmtTick(v);
        tg.appendChild(t); g.appendChild(tg);
      });
      const ax = s('g', { class: 'axis' });
      ax.appendChild(s('line', { x1: m.l, x2: W - m.r, y1: H - m.b, y2: H - m.b }));
      ax.appendChild(s('line', { x1: m.l, x2: m.l, y1: m.t, y2: H - m.b }));
      g.appendChild(ax);
      if (state.x && state.x.label) {
        const t = s('text', { x: (m.l + W - m.r) / 2, y: H - 4, 'text-anchor': 'middle', class: 'ax-label' });
        t.textContent = state.x.label; g.appendChild(t);
      }
      if (state.y && state.y.label) {
        const t = s('text', { x: 12, y: (m.t + H - m.b) / 2, 'text-anchor': 'middle', class: 'ax-label', transform: 'rotate(-90 12 ' + (m.t + H - m.b) / 2 + ')' });
        t.textContent = state.y.label; g.appendChild(t);
      }
      (state.hlines || []).forEach((l) => {
        if (l.y < d.y0 || l.y > d.y1) return;
        g.appendChild(s('line', { class: 'refline', x1: m.l, x2: W - m.r, y1: Y(l.y), y2: Y(l.y), style: l.color ? 'stroke:' + colorVar(l.color) : null }));
        if (l.label) { const t = s('text', { class: 'reflabel', x: W - m.r - 4, y: Y(l.y) - 5, 'text-anchor': 'end' }); t.textContent = l.label; g.appendChild(t); }
      });
      (state.vlines || []).forEach((l) => {
        if (l.x < d.x0 || l.x > d.x1) return;
        g.appendChild(s('line', { class: 'refline', x1: X(l.x), x2: X(l.x), y1: m.t, y2: H - m.b, style: l.color ? 'stroke:' + colorVar(l.color) : null }));
        if (l.label) { const t = s('text', { class: 'reflabel', x: X(l.x) + 4, y: m.t + 10 }); t.textContent = l.label; g.appendChild(t); }
      });

      // clip
      const cid = 'clip' + Math.random().toString(36).slice(2, 8);
      const defs = s('defs', {});
      const cp = s('clipPath', { id: cid });
      cp.appendChild(s('rect', { x: m.l, y: m.t - 2, width: W - m.l - m.r, height: H - m.t - m.b + 4 }));
      defs.appendChild(cp);
      svg.appendChild(defs);
      const sg = s('g', { 'clip-path': 'url(#' + cid + ')' });
      svg.appendChild(sg);

      legend.innerHTML = '';
      (state.series || []).forEach((se) => {
        const col = colorVar(se.color);
        const grp = s('g', { class: 'series' });
        const pts = se.data.filter((p) => Number.isFinite(p[0]) && Number.isFinite(p[1]));
        if (se.type === 'scatter') {
          pts.forEach((p) => grp.appendChild(s('circle', { cx: X(p[0]), cy: clampY(p[1]), r: se.r || 3, style: 'fill:' + col + ';opacity:' + (se.opacity || 0.8) })));
        } else if (pts.length) {
          let dd = '';
          pts.forEach((p, i) => { dd += (i ? 'L' : 'M') + X(p[0]).toFixed(2) + ' ' + clampY(p[1]).toFixed(2); });
          if (se.area) {
            const base = Y(Math.max(d.y0, Math.min(d.y1, se.areaBase != null ? se.areaBase : 0)));
            const ad = dd + 'L' + X(pts[pts.length - 1][0]).toFixed(2) + ' ' + base + 'L' + X(pts[0][0]).toFixed(2) + ' ' + base + 'Z';
            grp.appendChild(s('path', { class: 'ar', d: ad, style: 'fill:' + col }));
          }
          grp.appendChild(s('path', { class: 'ln', d: dd, style: 'stroke:' + col + ';stroke-width:' + (se.width || 2) + (se.dash ? ';stroke-dasharray:' + se.dash : '') + (se.opacity ? ';opacity:' + se.opacity : '') }));
          if (se.markers) pts.forEach((p) => grp.appendChild(s('circle', { cx: X(p[0]), cy: clampY(p[1]), r: 3, style: 'fill:' + col })));
          if (se.endDot !== false && pts.length > 1 && !se.markers) {
            const lp = pts[pts.length - 1];
            grp.appendChild(s('circle', { cx: X(lp[0]), cy: clampY(lp[1]), r: 3, style: 'fill:' + col }));
          }
        }
        (se.points || []).forEach((p) => {
          grp.appendChild(s('circle', { cx: X(p[0]), cy: clampY(p[1]), r: p[2] || 5, style: 'fill:' + col + ';stroke:var(--surface);stroke-width:2' }));
        });
        sg.appendChild(grp);
        if (se.name && se.legend !== false) {
          const sp = document.createElement('span');
          sp.innerHTML = '<i style="background:' + col + '"></i>' + se.name;
          legend.appendChild(sp);
        }
      });
      RL.renderMath(legend);

      // hover
      if (state.hover !== false) {
        const hl = s('line', { class: 'hover-line', y1: m.t, y2: H - m.b, visibility: 'hidden' });
        svg.appendChild(hl);
        const hit = s('rect', { x: m.l, y: m.t, width: W - m.l - m.r, height: H - m.t - m.b, fill: 'transparent' });
        svg.appendChild(hit);
        const inv = (px) => {
          const f = (px - m.l) / (W - m.l - m.r);
          return logx ? Math.pow(10, lx(d.x0) + f * (lx(d.x1) - lx(d.x0))) : d.x0 + f * (d.x1 - d.x0);
        };
        hit.addEventListener('mousemove', (e) => {
          const r = svg.getBoundingClientRect();
          const px = ((e.clientX - r.left) / r.width) * W;
          const xv = inv(px);
          const lines = [];
          (state.series || []).forEach((se) => {
            if (!se.data.length || se.type === 'scatter' || se.hover === false) return;
            let best = se.data[0], bd = Infinity;
            se.data.forEach((p) => { const dd = Math.abs(p[0] - xv); if (dd < bd) { bd = dd; best = p; } });
            lines.push('<span style="color:' + colorVar(se.color) + '">●</span> ' + (se.name ? se.name.replace(/\$[^$]*\$/g, (mm) => mm.slice(1, -1)) + ': ' : '') + (Number.isFinite(best[1]) ? (+best[1]).toFixed(state.hoverDigits != null ? state.hoverDigits : 3) : '–'));
          });
          if (!lines.length) return;
          hl.setAttribute('x1', px); hl.setAttribute('x2', px); hl.setAttribute('visibility', 'visible');
          tip.hidden = false;
          tip.innerHTML = '<div>x = ' + (+xv).toFixed(state.hoverXDigits != null ? state.hoverXDigits : 2) + '</div>' + lines.join('<br>');
          const tx = ((px / W) * r.width);
          tip.style.left = Math.min(r.width - tip.offsetWidth - 4, tx + 12) + 'px';
          tip.style.top = '8px';
        });
        hit.addEventListener('mouseleave', () => { hl.setAttribute('visibility', 'hidden'); tip.hidden = true; });
      }
    }
    draw();
    responsive(wrap, draw);
    return {
      el: wrap,
      update(patch) { state = Object.assign(state, patch); draw(); },
      get state() { return state; },
    };
  }

  /* bars(el, {categories:[..], series:[{name,color,values:[..]}], y:{min,max,label}, labels:true}) */
  function bars(el, opts) {
    let W = opts.width || 640;
    const H = opts.height || 240;
    const m = Object.assign({ l: 44, r: 12, t: 14, b: 40 }, opts.margin || {});
    const wrap = document.createElement('div');
    wrap.className = 'plot';
    el.appendChild(wrap);
    const svg = s('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': opts.ariaLabel || '막대 그래프' });
    wrap.appendChild(svg);
    const legend = document.createElement('div');
    legend.className = 'legend';
    if (opts.legend !== false) wrap.appendChild(legend);
    let state = Object.assign({}, opts);
    function draw() {
      W = widthOf(wrap, opts.width || 640);
      svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
      svg.innerHTML = '';
      const cats = state.categories || [];
      const ser = state.series || [];
      const all = [];
      ser.forEach((se) => se.values.forEach((v) => Number.isFinite(v) && all.push(v)));
      let y0 = state.y && state.y.min != null ? state.y.min : Math.min(0, ...all);
      let y1 = state.y && state.y.max != null ? state.y.max : Math.max(0, ...all) * 1.1 || 1;
      if (y1 === y0) y1 = y0 + 1;
      const Y = (v) => H - m.b - ((v - y0) / (y1 - y0)) * (H - m.t - m.b);
      const bw = (W - m.l - m.r) / Math.max(1, cats.length);
      const inner = bw * 0.78;
      const each = inner / Math.max(1, ser.length);
      ticks(y0, y1, 4).forEach((v) => {
        svg.appendChild(s('line', { class: 'gridline', x1: m.l, x2: W - m.r, y1: Y(v), y2: Y(v) }));
        const tg = s('g', { class: 'tick' });
        const t = s('text', { x: m.l - 6, y: Y(v), 'text-anchor': 'end', 'dominant-baseline': 'middle' });
        t.textContent = state.y && state.y.fmt ? state.y.fmt(v) : fmtTick(v);
        tg.appendChild(t); svg.appendChild(tg);
      });
      const ax = s('g', { class: 'axis' });
      ax.appendChild(s('line', { x1: m.l, x2: W - m.r, y1: Y(Math.max(y0, Math.min(y1, 0))), y2: Y(Math.max(y0, Math.min(y1, 0))) }));
      svg.appendChild(ax);
      cats.forEach((c, i) => {
        const cx = m.l + bw * i + bw / 2;
        const tg = s('g', { class: 'tick' });
        const t = s('text', { x: cx, y: H - m.b + 16, 'text-anchor': 'middle' });
        t.textContent = c;
        tg.appendChild(t); svg.appendChild(tg);
        ser.forEach((se, j) => {
          const v = se.values[i];
          if (!Number.isFinite(v)) return;
          const x = cx - inner / 2 + each * j + each * 0.08;
          const base = Y(Math.max(y0, Math.min(y1, 0)));
          const yy = Y(Math.max(y0, Math.min(y1, v)));
          const col = colorVar((se.colors && se.colors[i]) || se.color);
          svg.appendChild(s('rect', { x, y: Math.min(base, yy), width: Math.max(1, each * 0.84), height: Math.abs(base - yy), rx: 2, style: 'fill:' + col + (se.opacity ? ';opacity:' + se.opacity : '') }));
          if (state.labels) {
            const t2 = s('text', { class: 'bar-label', x: x + each * 0.42, y: (v >= 0 ? yy - 4 : yy + 12), 'text-anchor': 'middle' });
            t2.textContent = state.labelFmt ? state.labelFmt(v) : fmtTick(v);
            svg.appendChild(t2);
          }
        });
      });
      if (state.y && state.y.label) {
        const t = s('text', { x: 12, y: (m.t + H - m.b) / 2, 'text-anchor': 'middle', class: 'ax-label', transform: 'rotate(-90 12 ' + (m.t + H - m.b) / 2 + ')' });
        t.textContent = state.y.label; svg.appendChild(t);
      }
      if (state.xLabel) {
        const t = s('text', { x: (m.l + W - m.r) / 2, y: H - 4, 'text-anchor': 'middle', class: 'ax-label' });
        t.textContent = state.xLabel; svg.appendChild(t);
      }
      legend.innerHTML = '';
      ser.forEach((se) => {
        if (!se.name) return;
        const sp = document.createElement('span');
        sp.innerHTML = '<i style="background:' + colorVar(se.color) + '"></i>' + se.name;
        legend.appendChild(sp);
      });
      RL.renderMath(legend);
    }
    draw();
    responsive(wrap, draw);
    return { el: wrap, update(patch) { state = Object.assign(state, patch); draw(); } };
  }

  /* 함수 샘플링 도우미 */
  function sample(f, x0, x1, n) {
    const out = [];
    n = n || 200;
    for (let i = 0; i <= n; i++) {
      const x = x0 + ((x1 - x0) * i) / n;
      out.push([x, f(x)]);
    }
    return out;
  }

  RL.plot = { line, bars, sample, ticks, svg: s };
})();
