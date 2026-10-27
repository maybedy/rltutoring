/* 25 암묵지 노트: 각 장의 암묵지를 모아 보고, 장을 가로지르는 공통 항목을 더한다 */
(function () {
  const { ui } = RL;

  const COMMON = [
    { tag: 'practice', t: 'RL의 손실 곡선은 거의 아무것도 말해 주지 않는다',
      d: '<p>지도학습과 달리 타깃이 계속 움직이므로, 학습이 잘될 때 가치 손실이 오히려 오를 수 있다. 정책 손실의 절댓값은 advantage 정규화 때문에 의미가 없다. 대신 에피소드 리턴(여러 시드), 정책 엔트로피, 직전 정책 대비 KL, PPO의 clip 비율, 가치 함수의 설명 분산(explained variance), 경사 노름, advantage의 평균과 분산을 본다. LLM RL에서는 응답 길이, 기준 정책 대비 KL, 보상의 그룹 내 분산, 정답률이 0이거나 1인 프롬프트의 비율도 함께 본다.</p>' },
    { tag: 'practice', t: '시드 몇 개로 낸 결론은 믿기 어렵다',
      d: '<p>같은 알고리즘·같은 하이퍼파라미터도 시드에 따라 학습 곡선이 크게 갈린다(Henderson et al. 2018 "Deep RL That Matters"). 비교할 때는 시드를 최소 5~10개 쓰고, 평균 대신 IQM과 부트스트랩 신뢰구간을 보도록 권장된다(Agarwal et al. 2021). LLM RL처럼 한 번 실행하는 비용이 큰 경우에도 "한 번 잘 나온 곡선"과 "재현되는 개선"을 구분해야 한다.</p>' },
    { tag: 'practice', t: '시간 제한으로 끊긴 것과 진짜 종료는 다르게 처리한다',
      d: '<p>에피소드가 시간 제한으로 잘렸다면 그 상태는 종료 상태가 아니므로 타깃에서 $\\gamma V(s\')$를 부트스트랩해야 한다. 둘을 같은 <code>done</code> 플래그로 처리하면 가치 추정이 체계적으로 틀어지고(보상이 양수면 과소추정), 에이전트는 "시간이 다 되어 가는" 상태를 구분하지 못한다(Pardo et al. 2018). LLM에서 최대 길이로 잘린 응답에 0점을 주어 "답을 못 냈다"와 같은 신호로 다루는 것도 같은 종류의 문제다(DAPO의 과길이 처리).</p>' },
    { tag: 'practice', t: '정답을 아는 작은 문제에서 먼저 확인한다',
      d: '<p>새 알고리즘이나 구현은 동적계획법으로 정확해를 계산할 수 있는 작은 MDP, 최적 팔을 아는 밴딧, 한 배치 과적합 테스트에서 먼저 검증한다. 이 사이트의 시뮬레이터도 그런 용도로 쓸 수 있다. 큰 환경에서 실패하면 원인 후보가 너무 많아 디버깅이 거의 불가능하다.</p>' },
    { tag: 'algo', t: '보상 · 관측 · advantage의 스케일이 하이퍼파라미터보다 먼저다',
      d: '<p>학습률, 엔트로피 계수, KL 계수, 클립 폭은 모두 보상의 크기에 대해 상대적인 값이다. 보상을 10배로 키우면 같은 $\\beta$는 10배 약한 정규화가 된다. 그래서 실전 코드에는 관측 정규화, 보상 스케일링, 배치 단위 advantage 정규화가 기본으로 들어간다. 가치 타깃의 크기가 크게 바뀌는 문제에는 PopArt(van Hasselt et al. 2016) 같은 적응형 정규화를 쓴다. GRPO의 그룹 내 표준편차 정규화도 같은 계열이지만, 프롬프트 난이도에 따라 가중치가 치우친다는 비판이 있다(Dr. GRPO).</p>' },
    { tag: 'algo', t: '중요도 비율은 곱이라서 지평이 길수록 지수적으로 커진다',
      d: '<p>궤적 단위 중요도 가중치 $\\prod_t \\pi(a_t|s_t)/\\mu(a_t|s_t)$의 분산은 지평 $T$에 대해 지수적으로 커진다. 실용적인 off-policy 보정은 모두 이 곱을 어딘가에서 자른다. Retrace(Munos et al. 2016), V-trace(IMPALA), PPO의 비율 클리핑, 토큰 단위 비율만 쓰는 LLM RL이 그 예다. "중요도 샘플링으로 보정했다"는 문장을 보면 어디서 잘랐는지부터 확인한다.</p>' },
    { tag: 'algo', t: '샘플을 재사용하면 on-policy 학습도 off-policy가 된다',
      d: '<p>PPO가 한 배치로 여러 epoch를 돌면 두 번째 epoch부터 데이터는 이미 옛 정책의 것이다. 비동기 actor, 대규모 LLM RL의 생성-학습 파이프라인 지연도 같은 효과를 낸다. 그래서 on-policy 알고리즘의 안정성 장치(clip, KL, 중요도 비율)는 사실상 off-policy 보정이고, 지연이 커질수록 이 장치가 감당할 몫이 늘어난다.</p>' },
    { tag: 'algo', t: '정책 엔트로피는 이상 징후를 가장 먼저 보여 준다',
      d: '<p>정책 엔트로피가 급격히 떨어지면 탐험이 멈추고 성능이 곧 정체된다. 반대로 엔트로피가 계속 오르면 보상 신호가 약하거나 정규화가 너무 강하다는 신호다. 추론 RL에서도 학습 초반에 엔트로피가 빠르게 줄면서 성능이 포화되는 현상이 여러 번 보고되었다. clip-higher(DAPO), 엔트로피 보너스, 토큰별 KL 조정 등이 그 대응으로 제안되었다.</p>' },
    { tag: 'research', t: '보상은 명세(specification)이고, 측정이 목표가 되면 측정이 망가진다',
      d: '<p>에이전트는 우리가 의도한 목표 대신 우리가 적은 숫자를 최적화한다. 보트 경주에서 점수 아이템만 맴돌기, 시뮬레이터 버그 이용, LLM의 길이·아첨 편향, 코드 RL에서 테스트를 수정해 통과하기가 모두 같은 현상이다. 보상 설계와 평가는 서로 독립된 측정으로 점검해야 한다. RLHF의 KL 앵커와 보상모델 앙상블은 이 문제를 일부만 완화한다.</p>' },
    { tag: 'research', t: '벤치마크 향상의 상당 부분은 구현에서 나온다',
      d: '<p>PPO와 TRPO의 성능 차이 상당 부분이 논문에 적히지 않은 코드 수준 선택(가치 클리핑, 보상 스케일링, 학습률 감쇠, 초기화)에서 나온다는 분석이 있다(Engstrom et al. 2020). on-policy RL의 설계 선택을 대규모로 비교한 연구도 있다(Andrychowicz et al. 2021). 새 방법이 낫다고 주장하려면 같은 구현 위에서 ablation을 해야 한다.</p>' },
    { tag: 'math', t: '$\\gamma$와 $\\lambda$는 같은 종류의 조절 장치다',
      d: '<p>둘 다 신용을 할당하는 시간 범위를 줄여 분산을 낮춘다. GAE에서는 $(\\gamma\\lambda)^l$이 한 덩어리로 나타난다. 다른 점은 $\\gamma$가 목적 자체를 바꾸는 반면(편향된 목적), $\\lambda$는 같은 목적의 추정량만 바꾼다는 것이다. LLM RL이 흔히 $\\gamma=\\lambda=1$(순수 MC)을 쓰는 이유는 응답 하나가 짧은 에피소드이고 토큰 단위 critic을 믿기 어렵기 때문이다.</p>' },
  ];

  RL.chapter({
    id: 'tacit',
    title: '암묵지 노트',
    subtitle: '각 장 끝의 암묵지를 한곳에 모았다. 교과서의 정리와 증명에는 잘 드러나지 않지만, 수학과 알고리즘에 익숙한 사람들이 먼저 떠올리는 관점과 경험칙, 실패 유형이다.',
    time: 30,
    level: '심화',
    easy: {
      hook: '"아는 사람은 다 알지만 책에는 잘 적혀 있지 않은 것"을 모았다. 실패를 많이 겪어 본 사람들이 먼저 확인하는 것들이다.',
      intro: '<p>각 항목은 제목만 읽어도 쓸모가 있게 썼다. 예를 들어 "RL의 손실 곡선은 거의 아무것도 말해 주지 않는다"라는 제목만으로도 학습 상태를 볼 때 무엇을 봐야 하는지 알 수 있다. 관심 가는 제목을 누르면 본문이 펼쳐진다. "실전" 분류부터 읽으면 가장 쉽다.</p>',
      recap: [
        '숫자 하나(손실, 점수 곡선 한 번)만 보고 판단하지 말고 여러 지표와 여러 번의 실행을 본다.',
        '보상, 스케일, 종료 처리 같은 작은 설정이 알고리즘 선택보다 결과를 더 크게 바꿀 때가 많다.',
        '새 방법을 보면 "무엇을 바꿨고, 그 대가는 어디로 갔나"를 묻는다.',
      ],
    },
    goals: [
      '알고리즘을 볼 때 무엇부터 확인하는지(축약성, 추정량의 편향·분산, KL 방향, 데이터 출처)를 습관으로 만든다.',
      '실험 결과를 읽을 때 흔한 함정(시드, 스케일, 종료 처리, 구현 세부)을 먼저 의심할 수 있다.',
    ],
    html: String.raw`
<p>암묵지는 네 가지로 분류했다. <span class="tc-tag">수학</span>은 식을 보는 관점, <span class="tc-tag">알고리즘</span>은 설계 선택의 이유와 등가 관계, <span class="tc-tag">실전</span>은 구현과 실험의 함정, <span class="tc-tag">연구</span>는 분야의 흐름을 읽는 방식이다. 맨 위의 "공통"은 특정 장에 속하지 않고 RL 전반에 해당하는 것이다.</p>
<div data-w="tacit-all"></div>
`,
    mount: { 'tacit-all': mountAll },
    quiz: [
      { q: '시간 제한으로 잘린 에피소드의 마지막 전이를 종료로 처리하면 생기는 문제는?', options: ['가치가 과대추정된다', '가치가 체계적으로 과소추정되고 시간에 따라 비마르코프적이 된다', '정책 엔트로피가 증가한다', '아무 문제 없다'], answer: 1,
        explain: '실제로 이어질 미래 가치를 0으로 잘라 버리므로, 보상이 양수인 일반적인 경우 과소추정된다. 또 남은 시간이 상태에 없으면 같은 상태에서도 타깃이 달라진다.' },
      { q: 'PPO에서 같은 배치로 여러 epoch를 학습할 때 clip이 하는 역할을 가장 잘 설명한 것은?', options: ['학습률 스케줄', '탐험 보너스', '옛 정책 데이터로 새 정책을 갱신하는 off-policy 상황의 보정과 제한', '보상 정규화'], answer: 2,
        explain: '두 번째 epoch부터 데이터는 옛 정책의 것이다. 비율을 잘라 정책이 데이터에서 너무 멀어지는 것을 막는다.' },
    ],
  });

  function mountAll(el) {
    const p = ui.panel(el, { kind: 'MAP', title: '암묵지 전체 보기' });
    const ctr = ui.row(p.body);
    const sid = ui.nextId('tq');
    const search = ui.h('input', { type: 'search', id: sid, placeholder: '예: KL, 분산, baseline', style: 'font:inherit;font-size:var(--fs-sm);padding:6px 10px;border:1px solid var(--line);border-radius:6px;background:var(--surface);color:var(--ink);width:100%' });
    ctr.appendChild(ui.h('div', { class: 'ctl', style: 'max-width:340px' }, ui.h('label', { for: sid }, ui.h('span', { text: '검색' })), search));
    const tagRow = ui.row(p.body, 'filter-row');
    const st = ui.stats(p.body, [{ key: 'n', label: '표시 중' }, { key: 'c', label: '장 수' }]);
    const out = document.createElement('div');
    p.body.appendChild(out);

    const groups = [{ id: null, no: '공통', title: '장을 가로지르는 공통 암묵지', items: COMMON }];
    RL.order.forEach((id) => {
      const def = RL.chapters[id];
      if (def && def.tacit && def.tacit.length) groups.push({ id, no: RL.meta[id].no, title: RL.meta[id].title, items: def.tacit });
    });
    const counts = {};
    groups.forEach((g) => g.items.forEach((it) => { counts[it.tag] = (counts[it.tag] || 0) + 1; }));
    let tag = null;
    const tagBtns = [ui.button(tagRow, '전체', () => { tag = null; draw(); })];
    Object.keys(RL.tacitTags).forEach((k) => {
      const b = ui.button(tagRow, RL.tacitTags[k] + ' <span class="mono" style="background:none;padding:0">' + (counts[k] || 0) + '</span>', () => { tag = tag === k ? null : k; draw(); });
      b.dataset.k = k;
      tagBtns.push(b);
    });
    const strip = (h) => h.replace(/<[^>]+>/g, ' ').toLowerCase();
    let tm = 0;
    search.addEventListener('input', () => { clearTimeout(tm); tm = setTimeout(draw, 150); });

    function draw() {
      tagBtns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.k ? b.dataset.k === tag : tag === null)));
      const q = search.value.trim().toLowerCase();
      out.innerHTML = '';
      let n = 0, c = 0;
      groups.forEach((g) => {
        const items = g.items.filter((it) => (!tag || it.tag === tag) && (!q || strip(it.t + ' ' + it.d).includes(q)));
        if (!items.length) return;
        c++;
        const sec = document.createElement('section');
        sec.className = 'tacit-group';
        sec.innerHTML = '<h3><span class="no">' + g.no + '</span>' + (g.id ? '<a href="#' + g.id + '">' + g.title + '</a>' : g.title) + '</h3>';
        const list = document.createElement('div');
        list.className = 'tacit-list';
        items.forEach((it) => {
          n++;
          const d = document.createElement('details');
          d.className = 'tacit-item';
          if (q) d.open = true;
          d.innerHTML = '<summary><span class="tc-tag">' + (RL.tacitTags[it.tag] || '기타') + '</span><span class="tc-t">' + it.t + '</span></summary><div class="tc-d">' + it.d + '</div>';
          list.appendChild(d);
        });
        sec.appendChild(list);
        out.appendChild(sec);
      });
      if (!n) out.innerHTML = '<p class="w-caption">조건에 맞는 항목이 없다. 검색어를 줄이거나 다른 분류를 고르면 된다.</p>';
      st.set('n', n + '개');
      st.set('c', c);
      RL.renderMath(out);
    }
    draw();
  }
})();
