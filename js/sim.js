/* RL Atlas 시뮬레이션 공통: 시드 난수, 수치 유틸, GridWorld 환경과 렌더러 */
(function () {
  'use strict';
  const RL = window.RL;

  /* ---------- 난수 ---------- */
  function rng(seed) {
    let a = (seed >>> 0) || 0x9e3779b9;
    const r = function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    r.normal = function () {
      let u = 0, v = 0;
      while (u === 0) u = r();
      while (v === 0) v = r();
      return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    };
    r.int = (n) => Math.floor(r() * n);
    r.choice = (probs) => {
      let x = r(), c = 0;
      for (let i = 0; i < probs.length; i++) { c += probs[i]; if (x < c) return i; }
      return probs.length - 1;
    };
    r.beta = function (a1, b1) {
      const ga = gamma(r, a1), gb = gamma(r, b1);
      return ga / (ga + gb);
    };
    return r;
  }
  // Marsaglia–Tsang
  function gamma(r, k) {
    if (k < 1) return gamma(r, k + 1) * Math.pow(r(), 1 / k);
    const d = k - 1 / 3, c = 1 / Math.sqrt(9 * d);
    for (;;) {
      let x, v;
      do { x = r.normal(); v = 1 + c * x; } while (v <= 0);
      v = v * v * v;
      const u = r();
      if (u < 1 - 0.0331 * x * x * x * x) return d * v;
      if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
    }
  }

  /* ---------- 수치 유틸 ---------- */
  const sum = (a) => a.reduce((x, y) => x + y, 0);
  const mean = (a) => (a.length ? sum(a) / a.length : 0);
  const std = (a) => { const m = mean(a); return Math.sqrt(mean(a.map((x) => (x - m) * (x - m)))); };
  const argmax = (a) => { let bi = 0; for (let i = 1; i < a.length; i++) if (a[i] > a[bi]) bi = i; return bi; };
  const argmaxRand = (a, r) => {
    const m = Math.max(...a);
    const idx = [];
    a.forEach((v, i) => { if (Math.abs(v - m) < 1e-12) idx.push(i); });
    return idx[Math.floor((r || Math.random)() * idx.length)];
  };
  const softmax = (a, temp) => {
    const t = temp == null ? 1 : temp;
    const m = Math.max(...a);
    const e = a.map((x) => Math.exp((x - m) / t));
    const z = sum(e);
    return e.map((x) => x / z);
  };
  const logsumexp = (a, temp) => {
    const t = temp == null ? 1 : temp;
    const m = Math.max(...a);
    return m + t * Math.log(sum(a.map((x) => Math.exp((x - m) / t))));
  };
  const sigmoid = (x) => 1 / (1 + Math.exp(-x));
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const range = (n) => Array.from({ length: n }, (_, i) => i);
  const entropy = (p) => -sum(p.map((x) => (x > 0 ? x * Math.log(x) : 0)));
  const kl = (p, q) => sum(p.map((x, i) => (x > 0 ? x * Math.log(x / q[i]) : 0)));
  const smooth = (arr, w) => {
    const out = [];
    let acc = 0;
    for (let i = 0; i < arr.length; i++) {
      acc += arr[i];
      if (i >= w) acc -= arr[i - w];
      out.push(acc / Math.min(i + 1, w));
    }
    return out;
  };

  /* ---------- GridWorld ----------
     layout: 문자열 배열. '.' 빈칸, '#' 벽, 'S' 시작, 숫자/G/X 종료칸(rewards 맵으로 보상 지정), 'C' 절벽(cliff)
     opts: { rewards: {char: r}, step: 이동 보상, slip: 미끄러질 확률(좌우 90도), cliffReward, cliffReset } */
  const ACTIONS = [
    { name: '↑', dr: -1, dc: 0 },
    { name: '→', dr: 0, dc: 1 },
    { name: '↓', dr: 1, dc: 0 },
    { name: '←', dr: 0, dc: -1 },
  ];

  function GridWorld(layout, opts) {
    opts = opts || {};
    this.layout = layout;
    this.rows = layout.length;
    this.cols = layout[0].length;
    this.stepReward = opts.step != null ? opts.step : 0;
    this.slip = opts.slip || 0;
    this.rewards = opts.rewards || { G: 1, X: -1 };
    this.cliffReward = opts.cliffReward != null ? opts.cliffReward : -100;
    this.nA = 4;
    this.cells = [];
    this.index = {};
    this.start = 0;
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const ch = layout[r][c];
        if (ch === '#') continue;
        const s = this.cells.length;
        const terminal = ch in this.rewards;
        this.cells.push({ r, c, ch, terminal, cliff: ch === 'C' });
        this.index[r + ',' + c] = s;
        if (ch === 'S') this.start = s;
      }
    }
    this.nS = this.cells.length;
    this._buildP();
  }
  GridWorld.ACTIONS = ACTIONS;

  GridWorld.prototype._move = function (s, a) {
    const cell = this.cells[s];
    const nr = cell.r + ACTIONS[a].dr, nc = cell.c + ACTIONS[a].dc;
    const k = nr + ',' + nc;
    return k in this.index ? this.index[k] : s;
  };

  GridWorld.prototype._buildP = function () {
    // P[s][a] = [{p, s2, r, done}]
    this.P = [];
    for (let s = 0; s < this.nS; s++) {
      const row = [];
      for (let a = 0; a < 4; a++) {
        const outs = [];
        if (this.cells[s].terminal) { outs.push({ p: 1, s2: s, r: 0, done: true }); row.push(outs); continue; }
        const dirs = this.slip > 0 ? [[a, 1 - this.slip], [(a + 1) % 4, this.slip / 2], [(a + 3) % 4, this.slip / 2]] : [[a, 1]];
        dirs.forEach(([d, p]) => {
          let s2 = this._move(s, d);
          let r = this.stepReward;
          let done = false;
          const c2 = this.cells[s2];
          if (c2.cliff) { r = this.cliffReward; s2 = this.start; }
          else if (c2.terminal) { r += this.rewards[c2.ch]; done = true; }
          const ex = outs.find((o) => o.s2 === s2 && o.r === r);
          if (ex) ex.p += p; else outs.push({ p, s2, r, done });
        });
        row.push(outs);
      }
      this.P.push(row);
    }
  };

  GridWorld.prototype.step = function (s, a, r) {
    const outs = this.P[s][a];
    const i = r ? r.choice(outs.map((o) => o.p)) : 0;
    return outs[i];
  };

  GridWorld.prototype.qFromV = function (V, gamma, s) {
    const q = [];
    for (let a = 0; a < 4; a++) {
      let v = 0;
      this.P[s][a].forEach((o) => { v += o.p * (o.r + (o.done ? 0 : gamma * V[o.s2])); });
      q.push(v);
    }
    return q;
  };

  // 한 번의 벨만 최적 백업 (동기식). 반환: {V, delta}
  GridWorld.prototype.viSweep = function (V, gamma) {
    const nv = V.slice();
    let delta = 0;
    for (let s = 0; s < this.nS; s++) {
      if (this.cells[s].terminal) { nv[s] = 0; continue; }
      nv[s] = Math.max(...this.qFromV(V, gamma, s));
      delta = Math.max(delta, Math.abs(nv[s] - V[s]));
    }
    return { V: nv, delta };
  };

  // 정책 평가 한 스윕: pi[s] = 행동 확률 배열
  GridWorld.prototype.evalSweep = function (V, pi, gamma) {
    const nv = V.slice();
    let delta = 0;
    for (let s = 0; s < this.nS; s++) {
      if (this.cells[s].terminal) { nv[s] = 0; continue; }
      const q = this.qFromV(V, gamma, s);
      let v = 0;
      for (let a = 0; a < 4; a++) v += pi[s][a] * q[a];
      nv[s] = v;
      delta = Math.max(delta, Math.abs(nv[s] - V[s]));
    }
    return { V: nv, delta };
  };

  GridWorld.prototype.greedy = function (V, gamma) {
    const pi = [];
    for (let s = 0; s < this.nS; s++) {
      const q = this.qFromV(V, gamma, s);
      const m = Math.max(...q);
      const best = q.map((x) => (Math.abs(x - m) < 1e-9 ? 1 : 0));
      const z = sum(best);
      pi.push(best.map((b) => b / z));
    }
    return pi;
  };

  GridWorld.prototype.uniformPolicy = function () {
    return range(this.nS).map(() => [0.25, 0.25, 0.25, 0.25]);
  };

  GridWorld.prototype.solve = function (gamma, tol) {
    let V = new Array(this.nS).fill(0);
    for (let i = 0; i < 5000; i++) {
      const r = this.viSweep(V, gamma);
      V = r.V;
      if (r.delta < (tol || 1e-10)) break;
    }
    return V;
  };

  /* ---------- GridWorld 렌더러 ----------
     renderGrid(el, env, {V, Q, pi, agent, trail, vmax, showValues, showArrows, showQ, onCell}) → {update(state)} */
  function renderGrid(el, env, state) {
    const S = RL.plot.svg;
    const cs = 56;
    const W = env.cols * cs, H = env.rows * cs;
    const wrap = document.createElement('div');
    wrap.className = 'gw';
    wrap.style.maxWidth = (state && state.maxCell ? env.cols * state.maxCell : env.cols * 66) + 'px';
    const svg = S('svg', { viewBox: '-1 -1 ' + (W + 2) + ' ' + (H + 2), role: 'img', 'aria-label': '그리드월드' });
    wrap.appendChild(svg);
    el.appendChild(wrap);
    let st = Object.assign({ showValues: true, showArrows: true }, state);

    function fillFor(v, vmax) {
      if (!Number.isFinite(v) || vmax <= 0) return 'var(--surface)';
      const t = Math.max(-1, Math.min(1, v / vmax));
      const pct = Math.round(Math.abs(t) * 62);
      return 'color-mix(in srgb, ' + (t >= 0 ? 'var(--pos)' : 'var(--neg)') + ' ' + pct + '%, var(--surface))';
    }

    function draw() {
      svg.innerHTML = '';
      const V = st.V, Q = st.Q;
      let vmax = st.vmax;
      if (vmax == null) {
        vmax = 1e-9;
        if (Q) Q.forEach((q) => q.forEach((x) => (vmax = Math.max(vmax, Math.abs(x)))));
        else if (V) V.forEach((x) => (vmax = Math.max(vmax, Math.abs(x))));
      }
      for (let r = 0; r < env.rows; r++) {
        for (let c = 0; c < env.cols; c++) {
          const ch = env.layout[r][c];
          const x = c * cs, y = r * cs;
          if (ch === '#') { svg.appendChild(S('rect', { class: 'wall', x, y, width: cs, height: cs })); continue; }
          const s = env.index[r + ',' + c];
          const cell = env.cells[s];
          const g = S('g', {});
          if (st.showQ && Q && !cell.terminal && !cell.cliff) {
            const cx = x + cs / 2, cy = y + cs / 2;
            const tri = [
              [[x, y], [x + cs, y], [cx, cy]],
              [[x + cs, y], [x + cs, y + cs], [cx, cy]],
              [[x + cs, y + cs], [x, y + cs], [cx, cy]],
              [[x, y + cs], [x, y], [cx, cy]],
            ];
            tri.forEach((pts, a) => {
              g.appendChild(S('polygon', { class: 'qtri', points: pts.map((p) => p.join(',')).join(' '), style: 'fill:' + fillFor(Q[s][a], vmax) }));
            });
          } else {
            let v = V ? V[s] : NaN;
            if (Q && !V) v = Math.max(...Q[s]);
            let fill = cell.terminal ? fillFor(env.rewards[cell.ch], Math.abs(env.rewards[cell.ch]) || 1) : fillFor(v, vmax);
            if (cell.cliff) fill = 'color-mix(in srgb, var(--neg) 55%, var(--surface))';
            g.appendChild(S('rect', { class: 'cell', x, y, width: cs, height: cs, style: 'fill:' + fill }));
          }
          if (st.showQ && Q && !cell.terminal && !cell.cliff) g.appendChild(S('rect', { class: 'cell', x, y, width: cs, height: cs, style: 'fill:none' }));
          if (cell.terminal) {
            const t = S('text', { class: 'term-l', x: x + cs / 2, y: y + cs / 2, style: 'fill:var(--ink)' });
            const rv = env.rewards[cell.ch];
            t.textContent = (rv > 0 ? '+' : '') + rv;
            g.appendChild(t);
          } else if (cell.cliff) {
            const t = S('text', { class: 'val', x: x + cs / 2, y: y + cs / 2 });
            t.textContent = '절벽';
            g.appendChild(t);
          } else {
            if (st.showValues && V) {
              const t = S('text', { class: 'val', x: x + cs / 2, y: y + cs - 11 });
              t.textContent = Number.isFinite(V[s]) ? V[s].toFixed(2) : '';
              g.appendChild(t);
            } else if (st.showValues && Q && !st.showQ) {
              const t = S('text', { class: 'val', x: x + cs / 2, y: y + cs - 11 });
              t.textContent = Math.max(...Q[s]).toFixed(2);
              g.appendChild(t);
            }
            const pi = st.pi;
            if (st.showArrows && pi && pi[s]) {
              const cx = x + cs / 2, cy = y + (st.showValues ? cs / 2 - 6 : cs / 2);
              const L = 13;
              pi[s].forEach((p, a) => {
                if (p < 0.01) return;
                const A = ACTIONS[a];
                const ex = cx + A.dc * L, ey = cy + A.dr * L;
                const hx = A.dc * 4, hy = A.dr * 4;
                const d = 'M' + cx + ' ' + cy + 'L' + ex + ' ' + ey +
                  'M' + (ex - hx - hy) + ' ' + (ey - hy + hx) + 'L' + ex + ' ' + ey + 'L' + (ex - hx + hy) + ' ' + (ey - hy - hx);
                g.appendChild(S('path', { class: 'arrow', d, style: 'opacity:' + (0.25 + 0.6 * p) }));
              });
            }
          }
          if (s === env.start && !cell.terminal) g.appendChild(S('rect', { class: 'start', x: x + 3, y: y + 3, width: cs - 6, height: cs - 6, rx: 4 }));
          if (st.onCell) {
            g.style.cursor = 'pointer';
            g.addEventListener('click', () => st.onCell(s, r, c));
          }
          svg.appendChild(g);
        }
      }
      if (st.trail && st.trail.length > 1) {
        const d = st.trail.map((s, i) => (i ? 'L' : 'M') + (env.cells[s].c * cs + cs / 2) + ' ' + (env.cells[s].r * cs + cs / 2)).join('');
        svg.appendChild(S('path', { class: 'trail', d }));
      }
      if (st.agent != null) {
        const a = env.cells[st.agent];
        svg.appendChild(S('circle', { class: 'agent', cx: a.c * cs + cs / 2, cy: a.r * cs + cs / 2, r: 9 }));
      }
    }
    draw();
    return { el: wrap, update(patch) { st = Object.assign(st, patch); draw(); } };
  }

  RL.sim = {
    rng, sum, mean, std, argmax, argmaxRand, softmax, logsumexp, sigmoid, clamp, range, entropy, kl, smooth,
    GridWorld, renderGrid, ACTIONS,
    layouts: {
      // Russell & Norvig 4x3
      classic: ['...G', '.#.X', 'S...'],
      maze: ['S....#....', '.##..#.##.', '.#...#..#.', '.#.###..#.', '...#...#G.', '.#...#....'],
      cliff: ['............', '............', '............', 'SCCCCCCCCCCG'],
    },
  };
})();
