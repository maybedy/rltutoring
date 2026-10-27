/* 00 로드맵과 사용법 */
(function () {
  const { ui } = RL;

  const PATHS = [
    { id: 'full', label: '전체 코스', desc: '01장부터 순서대로. 고전 RL의 수학을 쌓은 뒤 LLM 연구로 넘어간다.', steps: null },
    { id: 'llm', label: 'LLM 연구자 트랙', desc: 'LLM 정렬·추론 연구를 읽고 쓰는 데 필요한 최소 경로. 정책 경사와 KL 정규화가 중심축이다.',
      steps: ['theses', 'mdp', 'bellman', 'bandit', 'pg', 'ac', 'ppo', 'maxent', 'llm-mdp', 'rlhf', 'dpo', 'reasoning', 'test-time', 'memory', 'synthesis', 'tacit'] },
    { id: 'classic', label: '고전 RL 코어', desc: '서튼·바르토 교과서의 뼈대와 Deep RL의 표준 알고리즘까지.',
      steps: ['mdp', 'bellman', 'dp', 'bandit', 'td', 'qlearning', 'approx', 'dqn', 'pg', 'ac', 'ppo', 'maxent'] },
    { id: 'math', label: '수학 중심 트랙', desc: '증명과 유도를 따라가며 9개의 대전제가 어디서 나오는지 확인한다.',
      steps: ['theses', 'bellman', 'dp', 'pomdp', 'qviews', 'approx', 'pg', 'ppo', 'maxent', 'offline', 'llm-mdp', 'dpo', 'tacit'] },
    { id: 'tour', label: '2시간 투어', desc: '큰 흐름만 빠르게. 각 장의 시뮬레이터 하나씩만 돌려 봐도 된다.',
      steps: ['mdp', 'bellman', 'qlearning', 'pg', 'ppo', 'llm-mdp', 'rlhf', 'dpo', 'reasoning'] },
  ];

  RL.chapter({
    id: 'home',
    title: 'RL Atlas',
    subtitle: '벨만 방정식에서 RLHF와 추론 RL까지. 수식을 직접 유도하고, 항 하나하나의 의미를 짚고, 시뮬레이터로 학습이 전개되는 모습을 확인하는 강화학습 커리큘럼.',
    time: 10,
    level: '시작',
    html: String.raw`
<p>강화학습의 알고리즘은 수십 개지만, 그것들이 기대는 수학적 사실은 생각보다 적다. 이 사이트는 RL을 <strong>몇 개의 대전제(thesis) 위에서 손잡이 하나씩을 돌려 만든 변주들</strong>로 읽는다. Q-learning은 벨만 고정점(T1)을 샘플로 푼 것이고, PPO는 성능 차이 보조정리(T4)를 안전하게 쓰기 위한 클리핑이며, DPO는 KL-정규화 문제의 닫힌 해(T5)를 거꾸로 푼 것이다.</p>

<h2>RL 전체를 한 식으로</h2>
<p>거의 모든 정책 개선 알고리즘은 아래 템플릿의 네 칸을 어떻게 채우느냐로 구분된다. 어느 데이터에서($d$), 어떤 추정량으로 행동의 좋음을 재고($\hat A$), 기준 정책에서 얼마나 멀어지는 것을 허용하는가($\beta, D$).</p>
<div data-w="fx-master"></div>
<p>$D$가 KL이면 이 문제의 해는 $\pi_{k+1}(a|s) \propto \pi_{\text{base}}(a|s)\exp(\hat A_k(s,a)/\beta)$로 닫힌 형태가 된다(T5). $\beta\to0$이면 탐욕적 개선, 즉 정책 반복(T2)이 되고, $\beta$를 유한하게 두면 신뢰영역(T4)이 된다. 아래 표는 같은 틀에 유명한 알고리즘을 채운 것이다.</p>
<div class="table-wrap"><table class="t">
<thead><tr><th>알고리즘</th><th>데이터 $d$</th><th>추정량 $\hat A$</th><th>정규화 $\beta D$</th><th>장</th></tr></thead>
<tbody>
<tr><td>정책 반복 / Q-learning</td><td>모든 상태 / 경험</td><td>$Q^{\pi_k}$ 또는 $Q^*$ 추정</td><td>없음 ($\beta\to0$, greedy)</td><td><a href="#dp">03</a> <a href="#qlearning">07</a></td></tr>
<tr><td>REINFORCE</td><td>on-policy 궤적</td><td>몬테카를로 리턴 − baseline</td><td>암묵적 (작은 학습률)</td><td><a href="#pg">11</a></td></tr>
<tr><td>A3C / A2C</td><td>on-policy, 병렬 actor</td><td>n-step TD advantage</td><td>엔트로피 보너스</td><td><a href="#ac">12</a></td></tr>
<tr><td>TRPO / PPO</td><td>on-policy 배치 재사용</td><td>GAE($\lambda$)</td><td>$\KL(\pi_k\|\pi)$ 제약 / ratio clip</td><td><a href="#ppo">13</a></td></tr>
<tr><td>SAC</td><td>replay buffer</td><td>soft Q critic</td><td>엔트로피 (균등분포로의 KL)</td><td><a href="#maxent">14</a></td></tr>
<tr><td>AWR / IQL</td><td>고정 오프라인 데이터</td><td>in-sample advantage</td><td>$\KL$ to 행동 정책 $\pi_\beta$</td><td><a href="#offline">15</a></td></tr>
<tr><td>RLHF (PPO)</td><td>프롬프트 분포, on-policy 응답</td><td>보상모델 + GAE</td><td>$\KL$ to 고정 $\pi_{\text{ref}}$</td><td><a href="#rlhf">19</a></td></tr>
<tr><td>DPO</td><td>고정 선호 쌍</td><td>암묵적 보상 $\beta\log\frac{\pi}{\pi_{\text{ref}}}$</td><td>$\KL$ to $\pi_{\text{ref}}$ (닫힌 해로 흡수)</td><td><a href="#dpo">20</a></td></tr>
<tr><td>GRPO</td><td>프롬프트당 G개 샘플</td><td>그룹 평균·표준편차 정규화 보상</td><td>clip + $\KL$ to $\pi_{\text{ref}}$</td><td><a href="#reasoning">21</a></td></tr>
<tr><td>AlphaZero / STaR</td><td>자기 대국 / 자기 생성</td><td>탐색·검증이 만든 개선 분포</td><td>증류(교차엔트로피)</td><td><a href="#modelbased">16</a> <a href="#memory">23</a></td></tr>
</tbody></table></div>

<h2>커리큘럼</h2>
<p>여덟 개의 파트로 나뉜다. 앞쪽 파트는 뒤쪽의 공용어를 만들고, 각 장은 이전 장의 식 하나를 바꾸는 데서 시작한다.</p>
<div data-w="part-map"></div>

<h2>학습 경로 고르기</h2>
<p>목적에 따라 경로를 고르면 읽을 순서와 예상 시간이 계산된다. 완료 표시한 장은 체크된다.</p>
<div data-w="paths"></div>

<h2>각 장의 구성</h2>
<div class="grid2">
  <div class="card"><h4><span class="w-kind k-derive">DERIVE</span> 유도</h4><p>핵심 식을 한 줄씩 유도한다. 바뀐 부분은 강조되고 각 단계에 근거가 붙는다. "다음 단계"를 누르며 직접 다음 줄을 예상해 보라.</p></div>
  <div class="card"><h4><span class="w-kind k-formula">FORMULA</span> 수식 해부</h4><p>식의 각 항에 마우스를 올리거나 카드를 누르면 그 항의 의미, 바꾸면 무슨 알고리즘이 되는지가 나온다.</p></div>
  <div class="card"><h4><span class="w-kind">SIM</span> 시뮬레이터</h4><p>알고리즘을 브라우저에서 실제로 돌린다. 수렴 곡선, 가치 지도, 정책 변화가 매개변수에 따라 어떻게 달라지는지 본다.</p></div>
  <div class="card"><h4><span class="w-kind k-calc">CALC</span> 계산기</h4><p>할인 리턴, GAE, PPO 클리핑, GRPO advantage처럼 손으로 하기 번거로운 계산을 숫자를 바꿔 가며 확인한다.</p></div>
  <div class="card"><h4><span class="tc-tag">암묵지</span> 고수들의 감</h4><p>교과서에 잘 적히지 않는 관점과 경험칙. 모든 장의 암묵지는 <a href="#tacit">25장</a>에 모여 있다.</p></div>
  <div class="card"><h4><span class="w-kind k-quiz">QUIZ</span> 확인 문제</h4><p>장 끝의 3~4문제. 고르면 즉시 해설이 열린다.</p></div>
</div>

<h2>표기 규칙</h2>
<p>Sutton &amp; Barto(2판)의 표기를 따른다. 시점 $t$의 상태와 행동의 결과로 받는 보상은 $r_{t+1}$이다. 기댓값 첨자 $\mathbb{E}_\pi$는 정책 $\pi$와 환경 전이가 만드는 궤적 분포를 뜻한다. LLM 장에서는 프롬프트를 $x$, 응답을 $y$, 기준 정책을 $\pi_{\text{ref}}$로 쓴다. 전체 기호표는 <a href="#glossary">부록 A</a>.</p>
<div class="aside"><span class="label">저장</span>진행도와 테마 선택은 이 브라우저에만 저장된다. 사이트는 별도 빌드 없이 <code>index.html</code>을 열면 동작하며, 수식 렌더러(KaTeX)는 저장소에 포함되어 있다.</div>
`,
    mount: {
      'fx-master': (el) => ui.formula(el, {
        title: '정책 개선의 통합 템플릿',
        tex: String.raw`\pi_{k+1} = \arg\max_{\pi}\; \mathbb{E}_{s\sim \tm{d}{d}}\Big[\, \mathbb{E}_{a\sim\pi(\cdot|s)}\big[\tm{A}{\hat A_k(s,a)}\big] \;-\; \tm{b}{\beta}\, \tm{D}{D\big(\pi(\cdot|s)\,\|\,\pi_{\text{base}}(\cdot|s)\big)} \Big]`,
        terms: [
          { id: 'd', sym: 'd', label: '데이터 분포', desc: '어느 상태들에서 개선할 것인가.', long: 'on-policy 방문 분포 $d^{\\pi_k}$(REINFORCE, PPO), 리플레이 버퍼(DQN, SAC), 고정 데이터셋(CQL, IQL, DPO), LLM의 프롬프트 분포. 이 선택이 온라인/오프라인을 가르고, 분포가 바뀌는 문제(T4, 15장)를 만든다.' },
          { id: 'A', sym: '\\hat A_k', label: '추정량', desc: '행동이 기준보다 얼마나 좋은가의 추정.', long: '몬테카를로 리턴, TD 오차, n-step, GAE, Q critic, 보상모델 점수, 그룹 상대 점수, 탐색이 만든 방문 횟수. 편향과 분산의 배합이 여기서 정해진다(T6). 점수함수 경사(T3)로 최적화하면 이 값이 로그확률에 곱해진다.' },
          { id: 'b', sym: '\\beta', label: '정규화 강도', desc: '얼마나 과감하게 바꿀 것인가.', long: '$\\beta\\to0$이면 탐욕적 개선(정책 반복, Q-learning의 max). $\\beta$가 크면 기준 정책 근처에 머문다. SAC의 온도 $\\alpha$, RLHF의 KL 계수 $\\beta$, PPO의 클리핑 폭 $\\epsilon$이 같은 역할을 한다.' },
          { id: 'D', sym: 'D(\\pi\\|\\pi_{\\text{base}})', label: '발산과 기준 정책', desc: '무엇으로부터의 거리인가.', long: '기준이 직전 정책 $\\pi_k$면 신뢰영역(TRPO, PPO, MPO, T4), 고정된 $\\pi_{\\text{ref}}$면 앵커(RLHF, DPO), 균등분포면 최대 엔트로피(SAC), 행동 정책 $\\pi_\\beta$면 오프라인 제약(AWR, BCQ). $D=\\KL$일 때 해가 $\\pi_{\\text{base}}e^{\\hat A/\\beta}$로 닫힌다(T5).' },
        ],
      }),
      'part-map': (el) => {
        const wrap = document.createElement('div');
        wrap.className = 'grid2 wide';
        RL.curriculum.forEach((p) => {
          const card = document.createElement('div');
          card.className = 'card';
          const mins = p.items.reduce((acc, it) => acc + ((RL.chapters[it.id] && RL.chapters[it.id].time) || 0), 0);
          card.innerHTML = '<h4><span class="col-accent mono" style="background:none;padding:0">' + (p.part === '0' ? '0' : p.part) + '</span> ' + p.title + (mins ? ' <span class="col-muted" style="font-weight:400;font-size:var(--fs-xs)">· 약 ' + mins + '분</span>' : '') + '</h4>' +
            p.items.map((it) => '<p style="margin:2px 0"><a href="#' + it.id + '"><span class="mono" style="background:none;padding:0;color:var(--faint)">' + it.no + '</span> ' + it.title + '</a></p>').join('');
          wrap.appendChild(card);
        });
        el.appendChild(wrap);
      },
      paths: mountPaths,
    },
  });

  function mountPaths(el) {
    const p = ui.panel(el, { kind: 'MAP', title: '학습 경로' });
    const bar = ui.row(p.body, 'btns');
    const desc = document.createElement('p');
    desc.className = 'w-caption';
    const list = document.createElement('ol');
    list.style.cssText = 'margin:0;padding-left:1.6em;display:grid;gap:2px';
    const st = ui.stats(p.body, [
      { key: 'n', label: '장 수' },
      { key: 't', label: '예상 시간', tone: 'accent' },
      { key: 'd', label: '완료한 장' },
    ]);
    p.body.append(desc, list);
    let cur = RL.store.get('path', 'llm');
    const btns = PATHS.map((path) => {
      const b = ui.button(bar, path.label, () => { cur = path.id; RL.store.set('path', cur); draw(); });
      b.dataset.id = path.id;
      return b;
    });
    function draw() {
      const path = PATHS.find((x) => x.id === cur) || PATHS[0];
      btns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.id === path.id)));
      const steps = path.steps || RL.order.filter((id) => id !== 'home');
      const done = RL.progress.done();
      let mins = 0;
      list.innerHTML = '';
      steps.forEach((id) => {
        const m = RL.meta[id];
        const def = RL.chapters[id];
        mins += (def && def.time) || 0;
        const li = document.createElement('li');
        li.innerHTML = '<a href="#' + id + '">' + m.no + ' · ' + m.title + '</a>' + (def && def.time ? ' <span class="col-muted" style="font-size:var(--fs-xs)">' + def.time + '분</span>' : '') + (done[id] ? ' <span class="col-good" style="font-size:var(--fs-xs)">완료</span>' : '');
        list.appendChild(li);
      });
      desc.textContent = path.desc;
      st.set('n', steps.length);
      st.set('t', mins >= 60 ? Math.floor(mins / 60) + '시간 ' + (mins % 60) + '분' : mins + '분');
      st.set('d', steps.filter((id) => done[id]).length + ' / ' + steps.length);
    }
    draw();
  }
})();
