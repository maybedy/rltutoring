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
    { part: 'II', title: '경험에서 배우기', items: [
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
      { id: 'offline', no: '15', title: '온라인 RL과 오프라인 RL' },
      { id: 'modelbased', no: '16', title: '모델 기반 RL과 계획' },
      { id: 'sequence', no: '17', title: '시퀀스 모델로 보는 RL' },
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
      { id: 'tacit', no: '25', title: '암묵지 노트' },
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
    { id: 'T1', easy: '가치를 \'한 걸음 앞의 가치\'로 거듭 고쳐 쓰면, 어떤 값에서 시작하든 같은 정답으로 모인다.', analogy: '소문이 퍼지듯 목표 지점의 점수가 한 칸씩 주변으로 번지고, 반복할수록 지도 전체가 안정된다.', short: '벨만 고정점', title: '벨만 연산자는 축약 사상이다',
      tex: String.raw`\|\mathcal{T}V-\mathcal{T}U\|_\infty \le \gamma\,\|V-U\|_\infty`,
      gist: '가치 함수는 "한 단계 보상 + 할인된 다음 가치"의 고정점이다. 이 계산을 반복하면 오차가 기하급수적으로 줄어든다.' },
    { id: 'T2', easy: '지금 방식이 얼마나 좋은지 재고, 잰 결과에 맞춰 조금 더 나은 방식으로 바꾼다. 이 두 일을 번갈아 하면 계속 좋아진다.', analogy: '시험을 보고(평가) 틀린 부분을 고쳐 공부하는(개선) 것을 반복하는 공부법과 같다.', short: 'GPI', title: '평가와 개선의 반복(GPI)',
      tex: String.raw`\pi_{k+1} = \operatorname{greedy}(Q^{\pi_k}) \;\Rightarrow\; Q^{\pi_{k+1}} \ge Q^{\pi_k}`,
      gist: '현재 정책을 평가하고, 그 평가를 기준으로 탐욕적으로 개선한다. 이 두 과정을 번갈아 하는 구조가 거의 모든 RL 알고리즘의 골격이다.' },
    { id: 'T3', easy: '결과가 좋았던 선택은 더 자주, 나빴던 선택은 덜 하도록 확률을 조금씩 옮긴다. 보상을 미분할 수 없어도 이 방법은 쓸 수 있다.', analogy: '칭찬받은 행동을 더 자주 하게 되는 강아지 훈련과 같다.', short: '점수함수 경사', title: '로그-미분 트릭(점수함수 추정량)',
      tex: String.raw`\nabla_\theta\,\mathbb{E}_{x\sim p_\theta}[f(x)] = \mathbb{E}_{x\sim p_\theta}\!\left[f(x)\,\nabla_\theta\log p_\theta(x)\right]`,
      gist: '보상을 미분할 수 없어도, 샘플의 로그확률 경사에 보상을 곱해 평균 내면 목표의 경사가 된다. REINFORCE부터 GRPO까지 모두 이 식에서 출발한다.' },
    { id: 'T4', easy: '새 방식이 얼마나 나은지는 옛 방식으로 모은 경험으로 짐작할 수 있다. 하지만 한 번에 너무 많이 바꾸면 그 짐작이 틀린다. 그래서 조금씩만 바꾼다.', analogy: '익숙한 동네 지도로는 옆 동네까지만 길을 찾을 수 있다. 너무 멀리 가면 지도가 맞지 않는다.', short: '성능 차이 · 신뢰영역', title: '성능 차이 보조정리와 신뢰영역',
      tex: String.raw`J(\pi')-J(\pi)=\tfrac{1}{1-\gamma}\,\mathbb{E}_{s\sim d^{\pi'},\,a\sim\pi'}\!\left[A^{\pi}(s,a)\right]`,
      gist: '새 정책의 이득은 옛 정책의 advantage로 나타낼 수 있다. 다만 정책이 바뀌면 방문하는 상태의 분포도 바뀌므로, 정책을 조금씩만 바꿔야(신뢰영역, KL 제약) 이 근사가 맞는다.' },
    { id: 'T5', easy: '"점수는 올리되 원래 습관에서 너무 멀어지지 말라"는 문제를 풀면, 원래 확률에 점수에 따른 가중치를 곱한 답이 나온다.', analogy: '평소 가던 식당 목록(원래 습관) 안에서 평점이 좋은 곳을 더 자주 고르는 것과 같다.', short: 'KL-정규화 해', title: 'KL(엔트로피) 정규화의 닫힌 해',
      tex: String.raw`\max_\pi \mathbb{E}_\pi[r]-\beta\,\mathrm{KL}(\pi\|\pi_0)\;\Rightarrow\;\pi^*(a)=\frac{\pi_0(a)\,e^{r(a)/\beta}}{Z}`,
      gist: '보상을 최대화하되 기준 분포에서 멀어지지 말라는 목표의 해는 기준 분포를 exp(보상/β)로 재가중한 볼츠만 분포다. SAC, Soft-Q, RLHF, DPO, Best-of-N이 모두 이 식에서 나온다.' },
    { id: 'T6', easy: '끝까지 기다려 실제 결과를 보면 정확하지만 값이 들쭉날쭉하다. 중간 예상치를 믿으면 안정적이지만 예상이 틀린 만큼 치우친다. 이 둘 사이를 고르는 손잡이가 있다.', analogy: '실력을 기말 성적표 하나로 판단할지(정확하지만 늦고 운이 섞인다), 매주 쪽지시험으로 짐작할지(빠르지만 짐작이 틀릴 수 있다)를 고르는 것과 같다.', short: '편향-분산', title: '부트스트랩의 편향-분산 트레이드오프',
      tex: String.raw`G_t^{(n)} = \sum_{k=0}^{n-1}\gamma^k r_{t+k+1} + \gamma^n V(s_{t+n})`,
      gist: '실제 리턴(MC)은 편향이 없지만 분산이 크다. 추정치로 부트스트랩(TD)하면 분산은 작아지지만 편향이 생긴다. n-step, λ, GAE, baseline, 그룹 평균이 모두 이 손잡이를 조절한다.' },
    { id: 'T7', easy: '더 시도해 볼 수 있으면 \'모르는 곳은 좋을지도 모른다\'고 낙관해 가 보고, 더 시도할 수 없으면 \'모르는 곳은 위험하다\'고 비관해 피한다.', analogy: '여행 중이면 낯선 식당도 가 보지만, 중요한 손님을 모시는 날에는 검증된 곳만 간다.', short: '낙관과 비관', title: '불확실성 앞의 낙관(온라인)과 비관(오프라인)',
      tex: String.raw`a_t = \arg\max_a \big[\hat Q(a) \pm c\,\sigma(a)\big]`,
      gist: '데이터를 더 모을 수 있으면 불확실한 곳을 낙관적으로 탐험하고(UCB), 더 모을 수 없으면 불확실한 곳을 비관적으로 피한다(CQL, LCB).' },
    { id: 'T8', easy: '세 가지를 한꺼번에 하면 오차가 저절로 커질 수 있다. 어림값으로 어림값 고치기, 남이 모은 데이터로 배우기, 비슷한 상황을 묶어 일반화하기다.', analogy: '흔들리는 저울 여러 개 중 가장 높게 나온 숫자만 믿으면 실제보다 무겁다고 착각하기 쉽다.', short: 'Deadly Triad', title: '함수근사 · 부트스트랩 · off-policy의 불안정성',
      tex: String.raw`\mathbb{E}\big[\max_a \hat Q(s,a)\big] \ge \max_a \mathbb{E}\big[\hat Q(s,a)\big]`,
      gist: '세 요소가 함께 있으면 학습이 발산할 수 있다. max 연산은 추정치의 잡음을 과대추정으로 바꾼다. 타깃 네트워크, 이중 추정기, 클리핑이 이 불안정성을 줄이는 처방이다.' },
    { id: 'T9', easy: '오래 고민해서 찾은 좋은 답을 외워 두면 다음에는 바로 꺼내 쓸 수 있다. 외운 실력을 바탕으로 다시 더 깊이 고민한다.', analogy: '바둑 기사가 수읽기로 찾은 좋은 수를 기보로 공부해 감각으로 만드는 것과 같다.', short: '탐색의 상각', title: '탐색 후 증류: 개선 연산자의 상각(Amortization)',
      tex: String.raw`\pi_{k+1} = \arg\min_{\pi}\, \mathrm{KL}\big(\mathcal{I}[\pi_k]\,\|\,\pi\big)`,
      gist: '비싼 개선 연산(MCTS, Best-of-N, 검증, 반성)으로 더 나은 행동을 찾고, 그 결과를 정책에 증류해 다음에는 적은 비용으로 꺼내 쓴다. AlphaZero, ExIt, STaR, ReST, R1 증류가 모두 같은 구조다.' },
  ];
  RL.thesisById = {};
  RL.theses.forEach((t) => (RL.thesisById[t.id] = t));


  /* ---------- 기호 사전 (쉬운 말) ---------- */
  RL.symbols = [
    ['s', '에스', '상태: 지금 처한 상황'],
    ['a', '에이', '행동: 지금 고를 수 있는 선택'],
    ['r', '알', '보상: 선택 직후 받는 점수'],
    ['\\gamma', '감마', '할인율: 미래 점수를 지금 얼마나 쳐줄지 정하는 값(0~1). 0.9면 한 걸음 늦을 때마다 90%만 인정한다'],
    ['G_t', '리턴', '지금부터 끝까지 받을 점수의 합 (먼 미래는 할인)'],
    ['\\pi', '파이', '정책: 상황마다 무엇을 할지 정한 규칙. 보통 행동별 확률'],
    ['V(s)', '가치', '이 상황에서 앞으로 기대되는 총점'],
    ['Q(s,a)', '큐', '이 상황에서 이 행동을 하면 기대되는 총점'],
    ['A(s,a)', '어드밴티지', '이 행동이 평소보다 얼마나 나은가 (Q − V)'],
    ['\\mathbb{E}[\\cdot]', '기댓값', '여러 번 해 봤을 때의 평균'],
    ['\\sum', '시그마', '전부 더하기'],
    ['\\max_a', '맥스', '가장 좋은 선택의 값'],
    ['\\arg\\max_a', '아그맥스', '값을 가장 크게 만드는 선택'],
    ['\\alpha', '알파', '학습률: 한 번에 얼마나 고쳐 쓸지'],
    ['\\delta', '델타', 'TD 오차: 예상과 실제의 차이 (놀람의 크기)'],
    ['\\theta', '세타', '모델(신경망)의 매개변수. 학습하면서 조절하는 값들'],
    ['\\nabla', '나블라', '그래디언트: 점수가 가장 빨리 오르는 방향'],
    ['\\log', '로그', '곱을 합으로 바꿔 주는 함수. 아주 작은 확률도 다루기 쉽게 만든다'],
    ['\\beta', '베타', '기준에서 멀어지는 것에 매기는 벌점의 크기'],
    ['\\mathrm{KL}(p\\|q)', 'KL', '두 확률분포가 얼마나 다른지 (0이면 같음)'],
    ['\\pi_{\\text{ref}}', '파이 레프', '출발점이 된 원래 모델 (LLM에서는 보통 SFT 모델)'],
    ['\\sigma(x)', '시그모이드', '어떤 수든 0~1 사이 확률로 바꿔 주는 S자 함수'],
  ];

  RL.initSymbols = function () {
    const btn = document.getElementById('sym-btn');
    const panel = document.getElementById('sym-panel');
    if (!btn || !panel) return;
    panel.innerHTML = '<div class="sym-head"><strong>기호 사전</strong><button type="button" class="icon-btn" id="sym-close" aria-label="기호 사전 닫기">닫기</button></div>' +
      '<p class="w-caption">수식에 자주 나오는 기호를 쉬운 말로 옮겼다. 각 장의 "말로 읽으면"과 함께 보면 수식이 문장으로 읽힌다.</p>' +
      '<dl class="sym-list">' + RL.symbols.map((x) => '<div><dt>' + RL.tex(x[0]) + '<span>' + x[1] + '</span></dt><dd>' + x[2] + '</dd></div>').join('') + '</dl>';
    const set = (open) => { panel.hidden = !open; btn.setAttribute('aria-expanded', String(open)); };
    btn.addEventListener('click', () => set(panel.hidden));
    panel.querySelector('#sym-close').addEventListener('click', () => set(false));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') set(false); });
  };

  /* ---------- 읽기 모드: 쉽게(유도 접기, 말로 읽기 먼저) / 전체 ---------- */
  RL.mode = 'easy';
  RL.isEasy = () => RL.mode === 'easy';
  RL.initMode = function () {
    RL.mode = store.get('mode', 'easy') === 'full' ? 'full' : 'easy';
    const btn = document.getElementById('mode-btn');
    const apply = () => {
      document.body.classList.toggle('mode-easy', RL.isEasy());
      if (btn) {
        btn.innerHTML = (RL.isEasy() ? '쉽게' : '전체') + '<span class="lg"> 보기</span>';
        btn.setAttribute('aria-label', '읽기 모드: ' + (RL.isEasy() ? '쉽게 보기' : '전체 보기') + ' (눌러서 전환)');
        btn.setAttribute('aria-pressed', String(RL.isEasy()));
      }
    };
    apply();
    if (btn) btn.addEventListener('click', () => {
      RL.mode = RL.isEasy() ? 'full' : 'easy';
      store.set('mode', RL.mode);
      apply();
      const y = window.scrollY;
      RL.renderChapter(RL.current);
      window.scrollTo(0, y);
    });
  };

  /* ---------- 용어 툴팁: 각 장에서 용어가 처음 나올 때 쉬운 뜻을 붙인다 ---------- */
  function annotateTerms(root) {
    const terms = RL.terms || [];
    if (!terms.length) return;
    const keys = [];
    terms.forEach((t, i) => [t.ko].concat(t.alias || []).forEach((k) => keys.push({ k, i })));
    keys.sort((a, b) => b.k.length - a.k.length);
    const esc = (x) => x.replace(/[.*+?^()|[\]\\{}$]/g, '\\$&');
    const re = new RegExp(keys.map((x) => esc(x.k)).join('|'), 'g');
    const idx = {};
    keys.forEach((x) => (idx[x.k] = x.i));
    const used = new Set();
    const skip = '.w, .katex, a, h1, h2, h3, h4, code, pre, button, summary, label, .quiz, .gl, .table-wrap th, .easy-recap, .tacit, svg, .chip';
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: (n) => (n.nodeValue.trim() && !n.parentElement.closest(skip) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT),
    });
    const nodes = [];
    let n;
    while ((n = walker.nextNode())) nodes.push(n);
    const ascii = /[A-Za-z0-9]/;
    nodes.forEach((node) => {
      const text = node.nodeValue;
      let m, last = 0, frag = null;
      re.lastIndex = 0;
      while ((m = re.exec(text))) {
        const ti = idx[m[0]];
        if (used.has(ti)) continue;
        if (ascii.test(m[0][0]) && ((m.index > 0 && ascii.test(text[m.index - 1])) || ascii.test(text[m.index + m[0].length] || ''))) continue;
        used.add(ti);
        frag = frag || document.createDocumentFragment();
        frag.appendChild(document.createTextNode(text.slice(last, m.index)));
        const sp = document.createElement('span');
        sp.className = 'gl';
        sp.tabIndex = 0;
        sp.dataset.g = ti;
        sp.textContent = m[0];
        frag.appendChild(sp);
        last = m.index + m[0].length;
      }
      if (frag) {
        frag.appendChild(document.createTextNode(text.slice(last)));
        node.parentNode.replaceChild(frag, node);
      }
    });
  }
  RL.annotateTerms = annotateTerms;

  function initTermPopover() {
    const pop = document.createElement('div');
    pop.id = 'gl-pop';
    pop.setAttribute('role', 'tooltip');
    pop.hidden = true;
    document.body.appendChild(pop);
    let cur = null;
    const show = (el) => {
      const t = (RL.terms || [])[+el.dataset.g];
      if (!t) return;
      cur = el;
      pop.innerHTML = '<strong>' + t.ko + '</strong>' + (t.en && t.en !== t.ko ? ' <span class="col-muted">' + t.en + '</span>' : '') + '<div>' + (t.easy || t.def) + '</div>' + (t.ch && t.ch !== RL.current && RL.meta[t.ch] ? '<a href="#' + t.ch + '">' + RL.meta[t.ch].no + ' ' + RL.meta[t.ch].title + '에서 자세히 →</a>' : '');
      RL.renderMath(pop);
      pop.hidden = false;
      const r = el.getBoundingClientRect();
      const w = Math.min(320, window.innerWidth - 24);
      pop.style.width = w + 'px';
      pop.style.left = Math.max(12, Math.min(window.innerWidth - w - 12, r.left)) + 'px';
      const below = r.bottom + 8;
      pop.style.top = (below + pop.offsetHeight > window.innerHeight - 8 ? Math.max(8, r.top - pop.offsetHeight - 8) : below) + 'px';
    };
    const hide = () => { pop.hidden = true; cur = null; };
    document.addEventListener('mouseover', (e) => { const el = e.target.closest && e.target.closest('.gl'); if (el) show(el); });
    document.addEventListener('mouseout', (e) => { const el = e.target.closest && e.target.closest('.gl'); if (el && !pop.contains(e.relatedTarget)) setTimeout(() => { if (!pop.matches(':hover') && cur === el) hide(); }, 120); });
    pop.addEventListener('mouseleave', hide);
    document.addEventListener('focusin', (e) => { if (e.target.classList && e.target.classList.contains('gl')) show(e.target); });
    document.addEventListener('focusout', (e) => { if (e.target.classList && e.target.classList.contains('gl')) setTimeout(() => { if (!pop.contains(document.activeElement)) hide(); }, 150); });
    document.addEventListener('click', (e) => {
      const el = e.target.closest && e.target.closest('.gl');
      if (el) { if (cur === el && !pop.hidden) hide(); else show(el); return; }
      if (!pop.contains(e.target)) hide();
    });
    window.addEventListener('scroll', hide, { passive: true });
    window.addEventListener('hashchange', hide);
  }

  /* ---------- 쉬운 층: 장 첫머리 "먼저 쉽게", 끝의 "수식 없이 세 줄" ---------- */
  function renderEasyIntro(body, e) {
    if (!e) return;
    const sec = document.createElement('section');
    sec.className = 'easy-intro';
    sec.innerHTML = '<span class="label">먼저 쉽게</span>' +
      (e.hook ? '<p class="easy-hook">' + e.hook + '</p>' : '') +
      (e.intro || '') +
      (e.analogy ? '<div class="easy-analogy"><span class="label">비유로 보면</span>' + e.analogy + '</div>' : '') +
      (e.path && e.path.length ? '<div class="easy-path"><span class="label">이 장의 흐름</span><ol>' + e.path.map((x) => '<li>' + x + '</li>').join('') + '</ol></div>' : '');
    body.insertBefore(sec, body.firstChild);
  }
  function renderEasyRecap(body, e) {
    if (!e || !e.recap || !e.recap.length) return;
    const sec = document.createElement('section');
    sec.className = 'easy-recap';
    sec.innerHTML = '<h2>수식 없이 세 줄로</h2><ol>' + e.recap.map((x) => '<li>' + x + '</li>').join('') + '</ol>';
    body.appendChild(sec);
  }

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
  RL.tacitTags = { math: '수학', algo: '알고리즘', practice: '실전', research: '연구' };
  function renderTacit(container, items) {
    if (!items || !items.length) return;
    const wrap = document.createElement('section');
    wrap.className = 'tacit';
    wrap.innerHTML = '<h2>암묵지: 숙련자가 먼저 확인하는 것</h2><p class="w-caption">교과서에는 잘 적혀 있지 않지만, 수학과 알고리즘에 익숙한 사람들이 이 주제를 볼 때 먼저 떠올리는 관점과 경험칙이다.</p>';
    const list = document.createElement('div');
    list.className = 'tacit-list';
    items.forEach((it, i) => {
      const d = document.createElement('details');
      d.className = 'tacit-item';
      if (i < 2 && !RL.isEasy()) d.open = true;
      d.innerHTML = '<summary><span class="tc-tag">' + (RL.tacitTags[it.tag] || '기타') + '</span><span class="tc-t">' + it.t + '</span></summary><div class="tc-d">' + it.d + '</div>';
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
    wrap.innerHTML = '<h2>확인 문제</h2><p class="w-caption">답을 고르면 바로 해설이 열린다.</p>';
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
        el.innerHTML = '<div class="aside">위젯을 찾지 못했다: <code>' + escapeHtml(name) + '</code></div>';
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
      main.innerHTML = '<div class="ch-body placeholder"><h2>' + (meta ? meta.title : id) + '</h2><p>이 장은 아직 준비 중이다.</p></div>';
      RL.renderSidebar();
      return;
    }

    const idx = RL.order.indexOf(id);
    const prev = RL.order[idx - 1];
    const next = RL.order[idx + 1];
    const tchips = (def.theses || []).map((t) => {
      const th = RL.thesisById[t];
      return th ? '<a class="chip t" href="#theses--' + t.toLowerCase() + '" title="' + escapeHtml(th.easy || th.gist) + '">' + t + ' <b>' + th.short + '</b></a>' : '';
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
    renderEasyIntro(body, def.easy);
    renderEasyRecap(body, def.easy);
    renderTacit(body, def.tacit);
    renderQuiz(body, def.quiz, id);
    RL.renderMath(main);
    annotateTerms(body);
    mountWidgets(body, def);

    const foot = document.getElementById('ch-foot');
    const isDone = RL.progress.isDone(id);
    foot.innerHTML =
      '<div class="done-row"><button type="button" class="btn' + (isDone ? '' : ' primary') + '" id="done-btn" aria-pressed="' + isDone + '">' + (isDone ? '완료 표시됨 (취소)' : '이 장을 완료로 표시') + '</button>' +
      '<span class="w-caption">진행도는 이 브라우저에만 저장된다.</span></div>' +
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
    RL.initMode();
    RL.initSymbols();
    initTermPopover();
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
