/* RL Atlas core: 커리큘럼 매니페스트, 대전제(Thesis) 정의, 챕터 레지스트리, 라우터, 진행도 저장 */
(function () {
  'use strict';

  const RL = (window.RL = window.RL || {});

  /* ---------- 커리큘럼 ---------- */
  RL.curriculum = [
    { part: '0', title: '오리엔테이션', items: [
      { id: 'home', no: '00', title: '로드맵과 사용법' },
      { id: 'theses', no: 'T', title: '9개의 대전제 (Thesis)' },
      { id: 'lineage', no: 'G', title: '알고리즘 계보도와 타임라인' },
    ] },
    { part: 'I', title: '문제 정의', items: [
      { id: 'mdp', no: '01', title: 'MDP와 리턴' },
      { id: 'bellman', no: '02', title: '벨만 방정식과 축약 사상' },
      { id: 'dp', no: '03', title: '동적계획법과 GPI' },
      { id: 'pomdp', no: '04', title: 'POMDP와 믿음 상태' },
    ] },
    { part: 'II', title: '경험으로부터 학습', items: [
      { id: 'bandit', no: '05', title: '밴딧과 탐험' },
      { id: 'td', no: '06', title: 'MC와 TD, n-step, TD(λ)' },
      { id: 'qlearning', no: '07', title: 'Q-learning과 SARSA' },
      { id: 'qviews', no: '08', title: 'Q-learning의 여러 관점' },
    ] },
    { part: 'III', title: '함수근사와 Deep Value', items: [
      { id: 'approx', no: '09', title: '함수근사와 Deadly Triad' },
      { id: 'dqn', no: '10', title: 'DQN에서 Rainbow까지' },
    ] },
    { part: 'IV', title: '정책 최적화', items: [
      { id: 'pg', no: '11', title: '정책 경사 정리' },
      { id: 'ac', no: '12', title: 'Actor-Critic, A3C, GAE' },
      { id: 'ppo', no: '13', title: 'TRPO와 PPO' },
      { id: 'maxent', no: '14', title: '연속 제어와 최대 엔트로피' },
    ] },
    { part: 'V', title: '데이터 · 모델 · 시퀀스', items: [
      { id: 'offline', no: '15', title: '온라인 vs 오프라인 RL' },
      { id: 'modelbased', no: '16', title: '모델 기반 RL과 계획' },
      { id: 'sequence', no: '17', title: '시퀀스 모델로서의 RL' },
    ] },
    { part: 'VI', title: 'LLM과 강화학습', items: [
      { id: 'llm-mdp', no: '18', title: 'LLM을 MDP로 보기' },
      { id: 'rlhf', no: '19', title: 'RLHF: 보상모델과 PPO' },
      { id: 'dpo', no: '20', title: 'DPO와 직접 정렬 계열' },
      { id: 'reasoning', no: '21', title: '추론 RL: RLVR과 GRPO' },
      { id: 'test-time', no: '22', title: '추론 시점 탐색과 Test-time Compute' },
      { id: 'memory', no: '23', title: '경험의 기억과 상각' },
    ] },
    { part: 'VII', title: '종합', items: [
      { id: 'synthesis', no: '24', title: '종합: 연구 흐름과 열린 문제' },
      { id: 'tacit', no: '25', title: '암묵지 노트: 고수들의 감' },
      { id: 'glossary', no: 'A', title: '기호 · 용어 · 참고문헌' },
    ] },
  ];

  RL.order = [];
  RL.meta = {};
  RL.curriculum.forEach((p) => p.items.forEach((it) => {
    RL.order.push(it.id);
    RL.meta[it.id] = Object.assign({ part: p.part, partTitle: p.title }, it);
  }));

  /* ---------- 대전제 (Thesis) ---------- */
  RL.theses = [
    { id: 'T1', short: '벨만 고정점', title: '벨만 연산자는 축약 사상이다',
      tex: String.raw`\|\mathcal{T}V-\mathcal{T}U\|_\infty \le \gamma\,\|V-U\|_\infty`,
      gist: '가치 함수는 "한 단계 보상 + 할인된 다음 가치"의 고정점이며, 그 반복은 기하급수적으로 수렴한다.' },
    { id: 'T2', short: 'GPI', title: '평가와 개선의 반복(GPI)',
      tex: String.raw`\pi_{k+1} = \operatorname{greedy}(Q^{\pi_k}) \;\Rightarrow\; Q^{\pi_{k+1}} \ge Q^{\pi_k}`,
      gist: '현재 정책을 평가하고, 그 평가에 탐욕적으로 개선하는 두 과정의 상호작용이 거의 모든 RL 알고리즘의 골격이다.' },
    { id: 'T3', short: '점수함수 경사', title: '로그-미분 트릭(점수함수 추정량)',
      tex: String.raw`\nabla_\theta\,\mathbb{E}_{x\sim p_\theta}[f(x)] = \mathbb{E}_{x\sim p_\theta}\!\left[f(x)\,\nabla_\theta\log p_\theta(x)\right]`,
      gist: '미분 불가능한 보상이라도 샘플의 로그확률 경사에 보상을 곱해 평균내면 목표의 경사가 된다. REINFORCE부터 GRPO까지의 공통 뿌리.' },
    { id: 'T4', short: '성능 차이 · 신뢰영역', title: '성능 차이 보조정리와 신뢰영역',
      tex: String.raw`J(\pi')-J(\pi)=\tfrac{1}{1-\gamma}\,\mathbb{E}_{s\sim d^{\pi'},\,a\sim\pi'}\!\left[A^{\pi}(s,a)\right]`,
      gist: '새 정책의 이득은 옛 정책의 advantage로 표현된다. 단, 상태 분포가 바뀌므로 정책을 조금씩만 바꿔야(신뢰영역/KL) 근사가 유효하다.' },
    { id: 'T5', short: 'KL-정규화 해', title: 'KL(엔트로피) 정규화의 닫힌 해',
      tex: String.raw`\max_\pi \mathbb{E}_\pi[r]-\beta\,\mathrm{KL}(\pi\|\pi_0)\;\Rightarrow\;\pi^*(a)=\frac{\pi_0(a)\,e^{r(a)/\beta}}{Z}`,
      gist: '보상을 최대화하되 기준 분포에서 멀어지지 말라는 목표의 해는 기준 분포를 exp(보상/β)로 재가중한 볼츠만 분포다. SAC, Soft-Q, RLHF, DPO, Best-of-N이 모두 이 식 위에 있다.' },
    { id: 'T6', short: '편향-분산', title: '부트스트랩의 편향-분산 트레이드오프',
      tex: String.raw`G_t^{(n)} = \sum_{k=0}^{n-1}\gamma^k r_{t+k+1} + \gamma^n V(s_{t+n})`,
      gist: '실제 리턴(MC)은 불편이지만 분산이 크고, 추정치로 부트스트랩(TD)하면 분산은 작지만 편향이 생긴다. n-step, λ, GAE, baseline, 그룹 평균이 모두 이 손잡이를 조절한다.' },
    { id: 'T7', short: '낙관과 비관', title: '불확실성 앞의 낙관(온라인)과 비관(오프라인)',
      tex: String.raw`a_t = \arg\max_a \big[\hat Q(a) \pm c\,\sigma(a)\big]`,
      gist: '데이터를 더 모을 수 있으면 불확실한 곳을 낙관적으로 탐험하고(UCB), 더 모을 수 없으면 불확실한 곳을 비관적으로 피한다(CQL, LCB).' },
    { id: 'T8', short: 'Deadly Triad', title: '함수근사 · 부트스트랩 · off-policy의 불안정성',
      tex: String.raw`\mathbb{E}\big[\max_a \hat Q(s,a)\big] \ge \max_a \mathbb{E}\big[\hat Q(s,a)\big]`,
      gist: '세 요소가 함께 있으면 학습이 발산할 수 있고, max 연산은 잡음을 과대추정으로 바꾼다. target network, double estimator, clipping은 이 불안정성의 처방이다.' },
    { id: 'T9', short: '탐색의 상각', title: '탐색 후 증류: 개선 연산자의 상각(Amortization)',
      tex: String.raw`\pi_{k+1} = \arg\min_{\pi}\, \mathrm{KL}\big(\mathcal{I}[\pi_k]\,\|\,\pi\big)`,
      gist: '비싼 개선 연산(MCTS, Best-of-N, 검증, 반성)으로 더 나은 행동을 찾고 그것을 정책에 증류해 다음 번엔 싸게 꺼내 쓴다. AlphaZero, ExIt, STaR, ReST, R1 증류가 같은 구조다.' },
  ];
  RL.thesisById = {};
  RL.theses.forEach((t) => (RL.thesisById[t.id] = t));

  /* ---------- 레지스트리 ---------- */
  RL.chapters = {};
  RL.chapter = function (def) {
    if (!def || !def.id) throw new Error('chapter: id가 필요합니다');
    RL.chapters[def.id] = def;
  };

  /* ---------- 저장소 (실패해도 동작) ---------- */
  const store = {
    get(key, fallback) {
      try {
        const v = window.localStorage.getItem('rlatlas.' + key);
        return v == null ? fallback : JSON.parse(v);
      } catch (e) { return fallback; }
    },
    set(key, value) {
      try { window.localStorage.setItem('rlatlas.' + key, JSON.stringify(value)); } catch (e) { /* 저장 불가 환경 */ }
    },
  };
  RL.store = store;

  RL.progress = {
    done() { return store.get('done', {}) || {}; },
    isDone(id) { return !!this.done()[id]; },
    setDone(id, v) {
      const d = this.done();
      if (v) d[id] = Date.now(); else delete d[id];
      store.set('done', d);
      RL.renderSidebar();
    },
  };

  /* ---------- 수식 렌더링 ---------- */
  RL.katexOptions = {
    macros: {
      '\\tm': '\\htmlClass{fx-t fx-t-#1}{#2}',
      '\\hl': '\\htmlClass{dv-hl}{#1}',
      '\\E': '\\mathbb{E}',
      '\\R': '\\mathbb{R}',
      '\\KL': '\\mathrm{KL}',
      '\\Var': '\\operatorname{Var}',
      '\\argmax': '\\operatorname*{arg\\,max}',
      '\\argmin': '\\operatorname*{arg\\,min}',
      '\\sg': '\\operatorname{sg}',
      '\\clip': '\\operatorname{clip}',
      '\\Tb': '\\mathcal{T}',
    },
    trust: (ctx) => ctx.command === '\\htmlClass',
    strict: 'ignore',
    throwOnError: false,
  };

  RL.tex = function (src, display) {
    if (!window.katex) return '<code>' + escapeHtml(src) + '</code>';
    return window.katex.renderToString(src, Object.assign({ displayMode: !!display }, RL.katexOptions));
  };

  RL.renderMath = function (el) {
    if (!window.renderMathInElement) return;
    window.renderMathInElement(el, Object.assign({
      delimiters: [
        { left: '$$', right: '$$', display: true },
        { left: '\\[', right: '\\]', display: true },
        { left: '$', right: '$', display: false },
        { left: '\\(', right: '\\)', display: false },
      ],
      ignoredClasses: ['no-math'],
    }, RL.katexOptions));
  };

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  RL.escapeHtml = escapeHtml;

  /* ---------- 사이드바 ---------- */
  RL.renderSidebar = function () {
    const nav = document.getElementById('toc');
    if (!nav) return;
    const done = RL.progress.done();
    const cur = RL.current;
    const total = RL.order.length;
    const nDone = RL.order.filter((id) => done[id]).length;
    let html = '<div class="side-progress"><div class="lbl"><span>학습 진행도</span><span>' + nDone + ' / ' + total + '</span></div>' +
      '<div class="meter"><i style="width:' + Math.round((100 * nDone) / total) + '%"></i></div></div>';
    RL.curriculum.forEach((p) => {
      html += '<div class="part"><h3 class="part-h"><span class="pn">' + (p.part === '0' ? '0' : p.part) + '</span><span>' + p.title + '</span></h3>';
      p.items.forEach((it) => {
        const ready = !!RL.chapters[it.id];
        html += '<a class="toc-link' + (ready ? '' : ' pending') + '" href="#' + it.id + '"' + (cur === it.id ? ' aria-current="page"' : '') + '>' +
          '<span class="no">' + it.no + '</span><span>' + it.title + '</span>' +
          '<span class="done">' + (done[it.id] ? '완료' : '') + '</span></a>';
      });
      html += '</div>';
    });
    nav.innerHTML = html;
  };

  /* ---------- 챕터 렌더 ---------- */
  function sectionize(body, numbered) {
    // h2에 번호와 id를 붙인다
    const list = [];
    body.querySelectorAll(':scope > h2').forEach((h, i) => {
      const id = h.id || 's' + (i + 1);
      h.id = id;
      const label = h.textContent.trim();
      if (numbered !== false) h.insertAdjacentHTML('afterbegin', '<span class="sec">' + String(i + 1).padStart(2, '0') + '</span>');
      list.push({ id, label });
    });
    return list;
  }

  /* 암묵지: [{t: 제목, d: 본문 html, tag?: 'math'|'algo'|'practice'|'research'}] */
  RL.tacitTags = { math: '수학적 감', algo: '알고리즘 감', practice: '실전 감', research: '연구 감' };
  function renderTacit(container, items) {
    if (!items || !items.length) return;
    const wrap = document.createElement('section');
    wrap.className = 'tacit';
    wrap.innerHTML = '<h2>암묵지: 고수들은 이렇게 본다</h2><p class="w-caption">교과서에는 잘 안 적히지만, 수학과 알고리즘에 능숙한 사람들이 이 주제를 볼 때 자연스럽게 떠올리는 관점과 경험칙이다.</p>';
    const list = document.createElement('div');
    list.className = 'tacit-list';
    items.forEach((it, i) => {
      const d = document.createElement('details');
      d.className = 'tacit-item';
      if (i < 2) d.open = true;
      d.innerHTML = '<summary><span class="tc-tag">' + (RL.tacitTags[it.tag] || '감') + '</span><span class="tc-t">' + it.t + '</span></summary><div class="tc-d">' + it.d + '</div>';
      list.appendChild(d);
    });
    wrap.appendChild(list);
    container.appendChild(wrap);
  }
  RL.renderTacit = renderTacit;

  function renderQuiz(container, quiz, chapterId) {
    if (!quiz || !quiz.length) return;
    const wrap = document.createElement('section');
    wrap.className = 'quiz';
    wrap.innerHTML = '<h2>확인 문제</h2><p class="w-caption">답을 고르면 바로 해설이 열립니다.</p>';
    quiz.forEach((item, qi) => {
      const q = document.createElement('div');
      q.className = 'q';
      q.innerHTML = '<p class="q-q">Q' + (qi + 1) + '. ' + item.q + '</p><div class="q-opts"></div><div class="q-exp" hidden></div>';
      const opts = q.querySelector('.q-opts');
      const exp = q.querySelector('.q-exp');
      item.options.forEach((o, oi) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'q-opt';
        b.innerHTML = String.fromCharCode(65 + oi) + '. ' + o;
        b.addEventListener('click', () => {
          opts.querySelectorAll('.q-opt').forEach((x, xi) => {
            x.disabled = true;
            if (xi === item.answer) x.classList.add('right');
          });
          if (oi !== item.answer) b.classList.add('wrong');
          exp.hidden = false;
          exp.innerHTML = (oi === item.answer ? '<strong class="col-good">정답.</strong> ' : '<strong class="col-bad">오답.</strong> 정답은 ' + String.fromCharCode(65 + item.answer) + '. ') + (item.explain || '');
          RL.renderMath(exp);
        });
        opts.appendChild(b);
      });
      wrap.appendChild(q);
    });
    container.appendChild(wrap);
  }

  function mountWidgets(root, def) {
    root.querySelectorAll('[data-w]').forEach((el) => {
      const name = el.getAttribute('data-w');
      const fn = (def.mount && def.mount[name]) || (RL.widgets && RL.widgets[name]);
      if (!fn) {
        el.innerHTML = '<div class="aside">위젯 <code>' + escapeHtml(name) + '</code>를 찾지 못했습니다.</div>';
        return;
      }
      try {
        fn(el, def);
        RL.renderMath(el);
      } catch (err) {
        console.error('[widget ' + name + ']', err);
        el.innerHTML = '<div class="warn"><span class="label">위젯 오류</span>' + escapeHtml(name) + ': ' + escapeHtml(err.message) + '</div>';
      }
    });
  }

  RL.renderChapter = function (id, anchor) {
    const main = document.getElementById('main');
    const meta = RL.meta[id];
    const def = RL.chapters[id];
    RL.current = id;
    if (RL.cleanup) { try { RL.cleanup.forEach((f) => f()); } catch (e) { /* noop */ } }
    RL.cleanup = [];

    document.title = (meta ? meta.title + ' · ' : '') + 'RL Atlas';
    const crumb = document.getElementById('crumb');
    if (crumb && meta) crumb.textContent = (meta.part === '0' ? '' : 'Part ' + meta.part + ' · ') + meta.partTitle;

    if (!def) {
      main.innerHTML = '<div class="ch-body placeholder"><h2>' + (meta ? meta.title : id) + '</h2><p>이 장은 아직 준비 중입니다.</p></div>';
      RL.renderSidebar();
      return;
    }

    const idx = RL.order.indexOf(id);
    const prev = RL.order[idx - 1];
    const next = RL.order[idx + 1];
    const tchips = (def.theses || []).map((t) => {
      const th = RL.thesisById[t];
      return th ? '<a class="chip t" href="#theses--' + t.toLowerCase() + '">' + t + ' <b>' + th.short + '</b></a>' : '';
    }).join('');
    const pre = (def.prereq || []).map((p) => RL.meta[p] ? '<a class="chip" href="#' + p + '">선수 ' + RL.meta[p].no + ' ' + RL.meta[p].title + '</a>' : '').join('');

    const head =
      '<header class="ch-head"><div class="ch-head-in">' +
      '<div class="eyebrow">' + (meta.part === '0' ? 'Orientation' : 'Part ' + meta.part + ' · ' + meta.partTitle) + ' — ' + meta.no + '</div>' +
      '<h1 class="ch-title">' + (def.title || meta.title) + '</h1>' +
      (def.subtitle ? '<p class="ch-sub">' + def.subtitle + '</p>' : '') +
      '<div class="ch-meta">' + (def.time ? '<span class="chip">약 ' + def.time + '분</span>' : '') + (def.level ? '<span class="chip">' + def.level + '</span>' : '') + pre + tchips + '</div>' +
      (def.goals && def.goals.length ? '<div class="goals"><h4>이 장을 마치면</h4><ul>' + def.goals.map((g) => '<li>' + g + '</li>').join('') + '</ul></div>' : '') +
      '</div></header>';

    main.innerHTML = head + '<article class="ch-body" id="ch-body"></article><footer class="ch-foot" id="ch-foot"></footer>';
    const body = document.getElementById('ch-body');
    body.innerHTML = typeof def.html === 'function' ? def.html() : def.html || '';
    sectionize(body, def.numbered);
    renderTacit(body, def.tacit);
    renderQuiz(body, def.quiz, id);
    RL.renderMath(main);
    mountWidgets(body, def);

    const foot = document.getElementById('ch-foot');
    const isDone = RL.progress.isDone(id);
    foot.innerHTML =
      '<div class="done-row"><button type="button" class="btn' + (isDone ? '' : ' primary') + '" id="done-btn" aria-pressed="' + isDone + '">' + (isDone ? '완료 표시됨 (취소)' : '이 장을 완료로 표시') + '</button>' +
      '<span class="w-caption">진행도는 이 브라우저에만 저장됩니다.</span></div>' +
      '<nav class="pn-nav">' +
      (prev ? '<a class="prev" href="#' + prev + '"><span class="d">← 이전 ' + RL.meta[prev].no + '</span><span>' + RL.meta[prev].title + '</span></a>' : '<span></span>') +
      (next ? '<a class="next" href="#' + next + '"><span class="d">다음 ' + RL.meta[next].no + ' →</span><span>' + RL.meta[next].title + '</span></a>' : '') +
      '</nav>';
    document.getElementById('done-btn').addEventListener('click', () => {
      RL.progress.setDone(id, !RL.progress.isDone(id));
      RL.renderChapter(id);
    });

    RL.renderSidebar();
    if (anchor) {
      const target = document.getElementById(anchor);
      if (target) { target.scrollIntoView({ block: 'start' }); return; }
    }
    window.scrollTo(0, 0);
  };

  /* ---------- 라우터: #chapter 또는 #chapter--anchor ---------- */
  RL.route = function () {
    const raw = (window.location.hash || '').replace(/^#/, '');
    let [id, anchor] = raw.split('--');
    if (!id || !RL.meta[id]) id = 'home';
    document.body.classList.remove('nav-open');
    const scrim = document.getElementById('scrim');
    if (scrim) scrim.hidden = true;
    RL.renderChapter(id, anchor);
  };

  RL.go = function (id) {
    if (window.location.hash === '#' + id) RL.route();
    else window.location.hash = id;
  };

  /* ---------- 테마 ---------- */
  RL.initTheme = function () {
    const btn = document.getElementById('theme-btn');
    const apply = (mode) => {
      if (mode === 'light' || mode === 'dark') document.documentElement.setAttribute('data-theme', mode);
      else document.documentElement.removeAttribute('data-theme');
      if (btn) btn.textContent = mode === 'dark' ? '다크' : mode === 'light' ? '라이트' : '시스템';
      if (btn) btn.setAttribute('aria-label', '테마: ' + btn.textContent + ' (눌러서 변경)');
    };
    let mode = store.get('theme', null);
    if (mode) apply(mode); else if (btn) apply(null);
    if (btn) btn.addEventListener('click', () => {
      mode = mode === 'light' ? 'dark' : mode === 'dark' ? null : 'light';
      store.set('theme', mode);
      apply(mode);
    });
  };

  RL.boot = function () {
    RL.initTheme();
    const menu = document.getElementById('menu-btn');
    const scrim = document.getElementById('scrim');
    if (menu) menu.addEventListener('click', () => {
      const open = !document.body.classList.contains('nav-open');
      document.body.classList.toggle('nav-open', open);
      if (scrim) scrim.hidden = !open;
      menu.setAttribute('aria-expanded', String(open));
    });
    if (scrim) scrim.addEventListener('click', () => {
      document.body.classList.remove('nav-open');
      scrim.hidden = true;
    });
    window.addEventListener('hashchange', RL.route);
    RL.route();
  };
})();
