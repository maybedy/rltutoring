/* RL Atlas UI 키트: 패널, 컨트롤, 수식 탐색기, 유도 스테퍼, 탭 */
(function () {
  'use strict';
  const RL = window.RL;

  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    if (attrs) {
      for (const k in attrs) {
        const v = attrs[k];
        if (v == null || v === false) continue;
        if (k === 'class') el.className = v;
        else if (k === 'html') el.innerHTML = v;
        else if (k === 'text') el.textContent = v;
        else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
        else el.setAttribute(k, v === true ? '' : v);
      }
    }
    kids.flat().forEach((c) => {
      if (c == null || c === false) return;
      el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return el;
  }

  let uid = 0;
  const nextId = (p) => (p || 'w') + '-' + ++uid;

  /* 패널: kind = SIM | CALC | DERIVE | FORMULA | MAP */
  function panel(el, opts) {
    opts = opts || {};
    const kind = (opts.kind || 'SIM').toUpperCase();
    el.classList.add('w');
    if (opts.wide !== false) el.classList.add('wide');
    el.innerHTML = '';
    const head = h('div', { class: 'w-head' },
      h('span', { class: 'w-kind k-' + kind.toLowerCase(), text: kind }),
      h('span', { class: 'w-title', html: opts.title || '' }));
    const body = h('div', { class: 'w-body' });
    el.append(head, body);
    if (opts.caption) {
      const cap = h('p', { class: 'w-caption', html: opts.caption });
      body.appendChild(cap);
    }
    RL.renderMath(el);
    return { el, head, body };
  }

  /* 슬라이더 */
  function slider(parent, o) {
    const id = o.id || nextId('sl');
    const fmt = o.format || ((v) => String(v));
    const input = h('input', { type: 'range', id, min: o.min, max: o.max, step: o.step || 'any', value: o.value });
    const out = h('output', { for: id, text: fmt(+o.value) });
    const wrap = h('div', { class: 'ctl' }, h('label', { for: id }, h('span', { html: o.label }), out), input);
    const api = {
      el: wrap,
      input,
      get: () => +input.value,
      set: (v, silent) => { input.value = v; out.textContent = fmt(+input.value); if (!silent && o.onInput) o.onInput(+input.value); },
    };
    input.addEventListener('input', () => { out.textContent = fmt(+input.value); if (o.onInput) o.onInput(+input.value); });
    if (parent) parent.appendChild(wrap);
    return api;
  }

  function select(parent, o) {
    const id = o.id || nextId('sel');
    const sel = h('select', { id });
    o.options.forEach((op) => {
      const opt = h('option', { value: op.value, text: op.label });
      if (String(op.value) === String(o.value)) opt.selected = true;
      sel.appendChild(opt);
    });
    const wrap = h('div', { class: 'ctl' }, h('label', { for: id }, h('span', { html: o.label })), sel);
    sel.addEventListener('change', () => o.onChange && o.onChange(sel.value));
    if (parent) parent.appendChild(wrap);
    return { el: wrap, get: () => sel.value, set: (v) => { sel.value = v; } };
  }

  function button(parent, label, onClick, o) {
    o = o || {};
    const b = h('button', { type: 'button', class: 'btn' + (o.primary ? ' primary' : ''), html: label });
    b.addEventListener('click', onClick);
    if (parent) parent.appendChild(b);
    return b;
  }

  function checkbox(parent, o) {
    const id = o.id || nextId('cb');
    const inp = h('input', { type: 'checkbox', id });
    inp.checked = !!o.value;
    const lab = h('label', { class: 'chk', for: id }, inp, h('span', { html: o.label }));
    inp.addEventListener('change', () => o.onChange && o.onChange(inp.checked));
    if (parent) parent.appendChild(lab);
    return { el: lab, get: () => inp.checked, set: (v) => { inp.checked = !!v; } };
  }

  function row(parent, cls) {
    const r = h('div', { class: cls || 'controls' });
    if (parent) parent.appendChild(r);
    return r;
  }

  /* 수치 표시 */
  function stats(parent, items) {
    const wrap = h('div', { class: 'readout' });
    const map = {};
    items.forEach((it) => {
      const v = h('span', { class: 's-v', text: it.value != null ? it.value : '–' });
      const s = h('div', { class: 'stat' + (it.tone ? ' ' + it.tone : '') }, h('span', { class: 's-l', html: it.label }), v);
      map[it.key] = v;
      wrap.appendChild(s);
    });
    if (parent) parent.appendChild(wrap);
    return {
      el: wrap,
      set(key, value) { if (map[key]) map[key].textContent = value; },
    };
  }

  /* 수식 탐색기
     tex 안에서 \tm{id}{...} 로 항을 표시한다. terms: [{id, sym, label, desc, color: 1..6}] */
  function formula(el, o) {
    const p = panel(el, { kind: 'FORMULA', title: o.title || '수식 해부', caption: o.caption });
    const box = h('div', { class: 'fx-formula fx-colored' });
    box.innerHTML = RL.tex(o.tex, true);
    const colorOf = {};
    o.terms.forEach((t, i) => (colorOf[t.id] = t.color || (i % 6) + 1));
    o.terms.forEach((t) => box.querySelectorAll('.fx-t-' + t.id).forEach((n) => n.classList.add('fx-t-c' + colorOf[t.id])));
    const detail = h('div', { class: 'fx-detail', html: o.hint || '항 위에 마우스를 올리거나 아래 카드를 누르면 각 항의 의미가 나온다.' });
    const list = h('div', { class: 'fx-terms' });
    let pinned = null;
    const cards = {};
    // "말로 읽으면": {id|문장 조각}으로 항과 같은 색의 문장을 만든다
    let sayEl = null;
    if (o.say) {
      sayEl = h('p', { class: 'fx-say' });
      sayEl.innerHTML = '<span class="label">말로 읽으면</span>' + o.say.replace(/\{([A-Za-z0-9_-]+)\|([^}]*)\}/g, (m, id, txt) => '<span class="say-t c' + (colorOf[id] || 1) + '" data-id="' + id + '" tabindex="0">' + txt + '</span>');
      sayEl.addEventListener('mouseover', (e) => { const n = e.target.closest('.say-t'); if (n && !pinned) show(n.dataset.id); });
      sayEl.addEventListener('mouseleave', () => { if (!pinned) show(null); });
      sayEl.addEventListener('click', (e) => { const n = e.target.closest('.say-t'); if (n) { pinned = pinned === n.dataset.id ? null : n.dataset.id; show(pinned); } });
    }
    function show(id) {
      box.classList.toggle('fx-dim', !!id);
      box.querySelectorAll('.fx-t').forEach((n) => n.classList.remove('on'));
      Object.values(cards).forEach((c) => c.classList.remove('on'));
      if (sayEl) {
        sayEl.classList.toggle('dim', !!id);
        sayEl.querySelectorAll('.say-t').forEach((n) => n.classList.toggle('on', n.dataset.id === id));
      }
      if (!id) { detail.innerHTML = o.hint || '항 위에 마우스를 올리거나 아래 카드를 누르면 각 항의 의미가 나온다.'; return; }
      box.querySelectorAll('.fx-t-' + id).forEach((n) => n.classList.add('on'));
      if (cards[id]) cards[id].classList.add('on');
      const t = o.terms.find((x) => x.id === id);
      detail.innerHTML = '<strong class="col-c' + colorOf[id] + '">' + (t.sym ? RL.tex(t.sym) + ' ' : '') + t.label + '</strong> — ' + (t.long || t.desc);
      RL.renderMath(detail);
    }
    o.terms.forEach((t) => {
      const card = h('button', { type: 'button', class: 'fx-term c' + colorOf[t.id] });
      card.innerHTML = '<span class="ft-h">' + (t.sym ? '<span class="ft-sym">' + RL.tex(t.sym) + '</span>' : '') + '<span>' + t.label + '</span></span><span class="ft-d">' + (RL.isEasy && RL.isEasy() && t.easy ? t.easy : t.desc) + '</span>';
      card.addEventListener('mouseenter', () => { if (!pinned) show(t.id); });
      card.addEventListener('mouseleave', () => { if (!pinned) show(null); });
      card.addEventListener('click', () => { pinned = pinned === t.id ? null : t.id; show(pinned); });
      cards[t.id] = card;
      list.appendChild(card);
    });
    box.addEventListener('mouseover', (e) => {
      if (pinned) return;
      const n = e.target.closest('.fx-t');
      if (!n) return;
      const id = [...n.classList].find((c) => c.startsWith('fx-t-') && !/^fx-t-c\d$/.test(c));
      if (id) show(id.slice(5));
    });
    box.addEventListener('mouseleave', () => { if (!pinned) show(null); });
    box.addEventListener('click', (e) => {
      const n = e.target.closest('.fx-t');
      if (!n) { pinned = null; show(null); return; }
      const id = [...n.classList].find((c) => c.startsWith('fx-t-') && !/^fx-t-c\d$/.test(c));
      if (id) { pinned = pinned === id.slice(5) ? null : id.slice(5); show(pinned); }
    });
    if (sayEl) p.body.append(sayEl);
    p.body.append(box, detail, list);
    RL.renderMath(list);
    if (sayEl) RL.renderMath(sayEl);
    return { show };
  }

  /* 유도 스테퍼: steps: [{tex, why}] — \hl{...}로 바뀐 부분 강조 */
  function derivation(el, o) {
    const p = panel(el, { kind: 'DERIVE', title: o.title || '유도', caption: o.caption });
    const list = h('div', { class: 'dv-steps' });
    const nodes = o.steps.map((s, i) => {
      const n = h('div', { class: 'dv-step' });
      n.innerHTML = '<div class="dv-n">' + String(i + 1).padStart(2, '0') + '</div><div><div class="dv-tex">' + RL.tex(s.tex, true) + '</div>' + (s.why ? '<div class="dv-why">' + s.why + '</div>' : '') + (s.easy ? '<div class="dv-easy"><span class="label">쉽게</span>' + s.easy + '</div>' : '') + '</div>';
      list.appendChild(n);
      return n;
    });
    let k = o.startAll ? o.steps.length : 1;
    const count = h('span', { class: 'dv-count' });
    const foot = h('div', { class: 'dv-foot' });
    const prevB = button(foot, '이전 단계', () => { k = Math.max(1, k - 1); upd(); });
    const nextB = button(foot, '다음 단계', () => { k = Math.min(o.steps.length, k + 1); upd(); }, { primary: true });
    button(foot, '전체 보기', () => { k = o.steps.length; upd(); });
    button(foot, '처음부터', () => { k = 1; upd(); });
    foot.appendChild(count);
    function upd() {
      nodes.forEach((n, i) => {
        n.hidden = i >= k;
        n.classList.toggle('cur', i === k - 1 && k < o.steps.length + 1);
      });
      prevB.disabled = k <= 1;
      nextB.disabled = k >= o.steps.length;
      count.textContent = k + ' / ' + o.steps.length;
    }
    p.body.append(list, foot);
    RL.renderMath(list);
    upd();
    if (RL.isEasy && RL.isEasy()) {
      // 쉽게 보기: 요지만 보여 주고 유도는 접어 둔다
      list.hidden = true;
      foot.hidden = true;
      const fold = h('div', { class: 'dv-fold' });
      fold.innerHTML = (o.easy ? '<p class="dv-gist"><span class="label">요지</span>' + o.easy + '</p>' : '') +
        '<p class="w-caption">수식으로 한 줄씩 따라가는 ' + o.steps.length + '단계 유도가 접혀 있다. 결론만 알아도 다음으로 넘어갈 수 있다.</p>';
      button(fold, '유도 과정 펼치기', () => { fold.remove(); list.hidden = false; foot.hidden = false; });
      p.body.insertBefore(fold, list);
      RL.renderMath(fold);
    }
    return { set: (i) => { k = i; upd(); } };
  }


  /* 숫자 비교: 절대 오차 tol 또는 상대 오차 rtol */
  function close(v, ans, o) {
    if (!Number.isFinite(v)) return false;
    const tol = o.tol != null ? o.tol : Math.max(1e-9, Math.abs(ans) * (o.rtol != null ? o.rtol : 0.02));
    return Math.abs(v - ans) <= tol;
  }
  function parseNum(str) {
    const t = String(str).trim().replace(/,/g, '').replace(/^−/, '-');
    if (/^-?\d*\.?\d+\s*\/\s*-?\d*\.?\d+$/.test(t)) { const [a, b] = t.split('/').map(Number); return a / b; }
    if (/%$/.test(t)) return parseFloat(t) / 100;
    return t === '' ? NaN : Number(t);
  }

  /* 먼저 예측하기: items [{q, answer | choices+correct, tol, rtol, unit, hint, explain}] */
  function predict(el, o) {
    const p = panel(el, { kind: 'TRY', title: o.title || '먼저 예측하기', caption: o.caption });
    const items = o.items || [o];
    items.forEach((it, qi) => {
      const box = h('div', { class: 'pr-item' });
      box.innerHTML = '<p class="pr-q">' + (items.length > 1 ? '<span class="mono" style="background:none;padding:0">' + (qi + 1) + '.</span> ' : '') + it.q + '</p>';
      const fb = h('div', { class: 'pr-fb', role: 'status' });
      const exp = h('div', { class: 'pr-exp', html: it.explain || '' });
      exp.hidden = true;
      const reveal = (ok) => {
        exp.hidden = false;
        RL.renderMath(exp);
        if (ok === true) fb.innerHTML = '<strong class="col-good">맞았다.</strong>';
      };
      if (it.choices) {
        const row = h('div', { class: 'pr-choices' });
        it.choices.forEach((c, ci) => {
          const b = button(row, c, () => {
            row.querySelectorAll('button').forEach((x, xi) => { x.disabled = true; if (xi === it.correct) x.classList.add('right'); });
            if (ci !== it.correct) { b.classList.add('wrong'); fb.innerHTML = '<strong class="col-bad">틀렸다.</strong> ' + (it.hint || ''); }
            reveal(ci === it.correct);
          });
        });
        box.append(row, fb, exp);
      } else {
        const id = nextId('pr');
        const inp = h('input', { id, class: 'inp pr-inp', type: 'text', inputmode: 'decimal', autocomplete: 'off', placeholder: '숫자 입력' });
        const lab = h('label', { for: id, class: 'sr-only', text: '답' });
        const row = h('div', { class: 'pr-row' }, lab, inp, it.unit ? h('span', { class: 'col-muted', html: it.unit }) : null);
        let tries = 0;
        const check = () => {
          const v = parseNum(inp.value);
          if (!Number.isFinite(v)) { fb.innerHTML = '숫자로 적어야 한다. 분수(1/3)나 퍼센트(25%)도 된다.'; return; }
          tries++;
          if (close(v, it.answer, it)) { reveal(true); return; }
          const dir = v < it.answer ? '조금 더 크다' : '조금 더 작다';
          fb.innerHTML = '<strong class="col-bad">아직 아니다.</strong> 정답은 이것보다 ' + dir + '. ' + (tries >= 2 && it.hint ? it.hint : '');
          RL.renderMath(fb);
        };
        inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') check(); });
        button(row, '확인', check, { primary: true });
        button(row, '정답 보기', () => { fb.innerHTML = '정답: <strong>' + (it.answerText || +it.answer.toFixed(4)) + '</strong>' + (it.unit ? ' ' + it.unit : ''); reveal(); RL.renderMath(fb); });
        box.append(row, fb, exp);
      }
      p.body.appendChild(box);
    });
    RL.renderMath(p.body);
  }

  /* 숫자로 따라가기: steps [{say, calc(tex), ask:{answer,tol,rtol,unit}, note}] — 한 단계씩 연다 */
  function walkthrough(el, o) {
    const p = panel(el, { kind: 'STEP', title: o.title || '숫자로 따라가기', caption: o.caption });
    const list = h('ol', { class: 'wk-steps' });
    const nodes = o.steps.map((st) => {
      const li = h('li', { class: 'wk-step' });
      li.innerHTML = '<div class="wk-say">' + st.say + '</div>';
      const calc = h('div', { class: 'wk-calc' });
      if (st.calc) calc.innerHTML = RL.tex(st.calc, true);
      if (st.note) calc.insertAdjacentHTML('beforeend', '<div class="w-caption">' + st.note + '</div>');
      if (st.ask) {
        calc.hidden = true;
        const id = nextId('wk');
        const inp = h('input', { id, class: 'inp pr-inp', type: 'text', inputmode: 'decimal', autocomplete: 'off', placeholder: '계산 결과' });
        const fb = h('span', { class: 'pr-fb', role: 'status' });
        const row = h('div', { class: 'pr-row' }, h('label', { for: id, class: 'sr-only', text: '계산 값' }), inp, st.ask.unit ? h('span', { class: 'col-muted', html: st.ask.unit }) : null);
        const done = (ok) => { calc.hidden = false; row.remove(); if (ok) li.classList.add('ok'); fb.innerHTML = ok ? '<strong class="col-good">맞았다.</strong>' : ''; };
        const check = () => {
          const v = parseNum(inp.value);
          if (!Number.isFinite(v)) { fb.textContent = '숫자로 적어야 한다.'; return; }
          if (close(v, st.ask.answer, st.ask)) done(true);
          else fb.innerHTML = '<span class="col-bad">아직 아니다.</span> 정답은 이것보다 ' + (v < st.ask.answer ? '크다.' : '작다.');
        };
        inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') check(); });
        button(row, '확인', check, { primary: true });
        button(row, '바로 보기', () => done(false));
        li.append(row, fb);
      }
      li.appendChild(calc);
      list.appendChild(li);
      return li;
    });
    let k = 1;
    const foot = h('div', { class: 'dv-foot' });
    const nextB = button(foot, '다음 단계', () => { k = Math.min(nodes.length, k + 1); upd(); }, { primary: true });
    button(foot, '전부 펼치기', () => { k = nodes.length; upd(); });
    button(foot, '처음부터', () => { k = 1; upd(); });
    const count = h('span', { class: 'dv-count' });
    foot.appendChild(count);
    function upd() {
      nodes.forEach((n, i) => { n.hidden = i >= k; n.classList.toggle('cur', i === k - 1); });
      nextB.disabled = k >= nodes.length;
      count.textContent = k + ' / ' + nodes.length;
    }
    p.body.append(list, foot);
    RL.renderMath(list);
    upd();
  }

  /* 탭: items [{label, html | render(el)}] */
  function tabs(el, items) {
    const bar = h('div', { class: 'tabs', role: 'tablist' });
    const panelEl = h('div', { class: 'tab-panel', role: 'tabpanel' });
    const btns = items.map((it, i) => {
      const b = h('button', { type: 'button', class: 'tab', role: 'tab', 'aria-selected': 'false', html: it.label });
      b.addEventListener('click', () => sel(i));
      bar.appendChild(b);
      return b;
    });
    function sel(i) {
      btns.forEach((b, j) => b.setAttribute('aria-selected', String(i === j)));
      panelEl.innerHTML = '';
      const it = items[i];
      if (it.render) it.render(panelEl);
      else { panelEl.innerHTML = it.html || ''; RL.renderMath(panelEl); }
    }
    el.append(bar, panelEl);
    sel(0);
    return { select: sel };
  }

  /* requestAnimationFrame 루프 (장 이동 시 자동 정리) */
  function loop(step, fps) {
    let raf = 0, last = 0, running = false;
    const interval = 1000 / (fps || 30);
    function tick(t) {
      if (!running) return;
      if (t - last >= interval) { last = t; if (step() === false) { stop(); return; } }
      raf = requestAnimationFrame(tick);
    }
    function start() { if (running) return; running = true; raf = requestAnimationFrame(tick); }
    function stop() { running = false; cancelAnimationFrame(raf); }
    if (RL.cleanup) RL.cleanup.push(stop);
    return { start, stop, get running() { return running; }, setFps(f) { fps = f; } };
  }

  const fmt = {
    f: (d) => (v) => (Number.isFinite(v) ? v.toFixed(d) : '–'),
    pct: (v) => (v * 100).toFixed(1) + '%',
    int: (v) => String(Math.round(v)),
  };

  RL.ui = { h, panel, slider, select, button, checkbox, row, stats, formula, derivation, predict, walkthrough, tabs, loop, fmt, nextId };
  RL.widgets = RL.widgets || {};
})();
