/* 03 동적계획법과 GPI */
(function () {
  const { ui, sim, plot } = RL;

  RL.chapter({
    id: 'dp',
    title: '동적계획법과 GPI',
    subtitle: '모델을 알면 벨만 방정식을 직접 풀 수 있다. 정책 평가와 정책 개선을 번갈아 반복하면 왜 최적 정책에 닿는지 살펴보고, 이 반복 구조(GPI)가 이후 모든 알고리즘의 골격이 되는 이유를 본다.',
    time: 35,
    level: '기초 · 핵심',
    prereq: ['bellman'],
    theses: ['T2', 'T1', 'T4'],
    easy: {
      hook: '지도를 다 알고 있다면, "지금 방식으로 몇 점인지 재 보기"와 "더 나은 쪽으로 화살표 돌리기"를 번갈아 하면 된다.',
      intro: '<p>격자 위의 로봇이 출구(+1)로 가야 한다. 어느 칸에서 어느 쪽으로 가면 어디에 도착하는지, 즉 <strong>지도</strong>는 전부 알고 있다. 각 칸에는 "이쪽으로 가라"는 화살표가 하나씩 있다.</p><p>먼저 지금 화살표대로 끝까지 가면 각 칸이 몇 점인지 계산한다(<em>평가</em>). 그다음 각 칸에서 이웃 칸의 점수를 보고 화살표를 가장 좋은 쪽으로 돌린다(<em>개선</em>). 이 두 가지를 몇 번 반복하면 화살표가 더는 바뀌지 않는다. 그때의 화살표가 최적이다.</p>',
      analogy: '요리 레시피를 고치는 것과 같다. 지금 레시피로 만들어 맛을 보고(평가), 가장 아쉬운 단계 하나를 더 나은 재료로 바꾼다(개선). 한 단계만 더 좋은 것으로 바꾸고 나머지를 그대로 두면 요리는 적어도 나빠지지 않는다. 그래서 반복할수록 좋아지고, 더 바꿀 곳이 없을 때 멈춘다. "바꿔도 나빠지지 않는다"는 이 성질이 이 장에서 다루는 정책 개선 정리다.',
      path: ['격자 위 화살표를 직접 돌려 보며 "이웃 중 가장 좋은 쪽"을 고르는 감각을 익힌다', '칸 두 개짜리 복도에서 평가와 개선을 숫자로 한 번씩 손계산한다', '같은 반복을 컴퓨터로 크게 돌려 보고, 평가를 대충 해도 된다는 것을 확인한다', '이 "재기 ↔ 고치기" 반복이 이후 거의 모든 알고리즘의 뼈대임을 본다'],
      recap: [
        '지도를 알면 두 가지를 번갈아 한다. 지금 화살표대로 가면 각 칸이 몇 점인지 재고, 그 점수를 보고 화살표를 더 좋은 쪽으로 돌린다.',
        '화살표를 더 좋은 쪽으로 돌리면 결과는 절대 나빠지지 않고, 더 돌릴 곳이 없으면 그것이 최적이다.',
        '점수를 끝까지 정확히 잴 필요는 없다. 대충 재고 고쳐도 같은 답에 닿으며, 이 재기와 고치기의 반복이 강화학습 전체의 뼈대다.',
      ],
    },
    goals: [
      '반복적 정책 평가가 $\\mathcal{T}^\\pi$의 고정점 반복이며 왜 수렴하는지 설명할 수 있다.',
      '정책 개선 정리를 한 스텝 이탈(one-step deviation) 논증으로 유도할 수 있다.',
      '정책 반복 · 가치 반복 · 수정 정책 반복을 "평가를 몇 스윕 할 것인가"라는 하나의 손잡이로 비교할 수 있다.',
      'MDP의 선형계획(LP) 원문제와 쌍대문제, 그리고 점유 측도 $d(s,a)$의 의미를 안다.',
    ],
    html: String.raw`
<p>동적계획법(DP)은 MDP의 전이 $P$와 보상 $R$을 <strong>정확히 안다고 가정</strong>하고 벨만 방정식을 푸는 방법이다. 현실에서 모델을 아는 경우는 드물지만, DP는 이후 모든 알고리즘의 "이상적인 버전"이다. TD와 Q-learning은 DP의 기댓값을 샘플로 바꾼 방법이고, actor-critic은 DP의 평가와 개선을 근사해서 번갈아 하는 방법이다.</p>
<p>DP가 푸는 문제는 둘로 나뉜다.</p>
<ul>
  <li><strong>예측(prediction) = 정책 평가:</strong> 정책 $\pi$가 주어지면 $V^\pi$를 구한다.</li>
  <li><strong>제어(control):</strong> 최적 정책 $\pi^*$를 찾는다.</li>
</ul>

<h2>반복적 정책 평가</h2>
<p>정책을 고정하면 벨만 기대 방정식은 선형이다. 역행렬로 직접 풀 수도 있지만($O(|\mathcal{S}|^3)$), 보통은 연산자 $\mathcal{T}^\pi$를 반복 적용한다.</p>
$$V_{k+1}(s) = \sum_a \pi(a|s)\Big[R(s,a) + \gamma\sum_{s'}P(s'|s,a)\,V_k(s')\Big] \quad\Longleftrightarrow\quad V_{k+1} = \mathcal{T}^\pi V_k$$
<p>$\mathcal{T}^\pi$도 $\mathcal{T}^*$와 똑같은 논리로 $\gamma$-축약이므로(<a href="#bellman">02장</a>의 증명에서 $\max$를 $\sum_a\pi$로 바꾸면 된다), 임의의 $V_0$에서 시작해 $V^\pi$로 기하급수적으로 수렴한다. 대전제 T1을 처음 적용하는 곳이다.</p>
<div class="aside"><span class="label">구현 디테일</span>새 배열에 쓰는 <em>동기식</em> 갱신 대신 같은 배열을 바로 덮어쓰는 <em>제자리(in-place, Gauss–Seidel)</em> 갱신을 하면 최신 값을 즉시 쓰므로 보통 더 빨리 수렴한다. 스윕 순서도 수렴 속도에 영향을 준다.</div>

<h2>정책 개선 정리</h2>
<p>$V^\pi$를 알면 각 상태에서 한 스텝 앞을 내다보고 가장 좋은 행동을 고를 수 있다. 이렇게 만든 탐욕 정책이 원래 정책보다 <strong>나빠지지 않는다</strong>는 것이 정책 개선 정리다.</p>
<p>수식에 앞서 손으로 먼저 해 본다. 아래 격자에서는 화살표를 직접 돌려 시작 칸의 점수를 올리고, 이어지는 복도 예제에서는 평가와 개선을 숫자로 계산한다.</p>
<div data-w="try-arrows"></div>
<div data-w="step-pi"></div>
<div data-w="fx-improve"></div>
<div data-w="dv-improve"></div>
<div class="key"><span class="label">요점</span>증명은 이렇게 흘러간다. 한 번만 새 정책을 따르고 이후에는 옛 정책을 따르는 것이 이미 옛 정책보다 낫다면, 그 이탈을 매 스텝 반복해도 낫다. 이 논증을 "확률적 정책 + 근사 평가"로 일반화한 것이 성능 차이 보조정리(T4, <a href="#ppo">13장</a>)다. 정책 개선 정리는 $A^\pi(s,\pi'(s)) \ge 0$이 <em>모든</em> 상태에서 성립한다고 가정하지만, 성능 차이 보조정리는 그 이득을 새 정책의 상태 분포로 평균 내어 정확한 등식으로 만든다.</div>

<h2>정책 반복, 가치 반복, 그 사이</h2>
<p>정책 반복(PI, Howard 1960)은 "수렴할 때까지 평가 → 개선"을 반복한다. 결정적 정책은 유한 개($|\mathcal{A}|^{|\mathcal{S}|}$개)이고, 개선할 때마다 정책이 엄격히 좋아지거나 그대로 멈추므로 유한 번 안에 최적 정책에 도달한다. 가치 반복(VI)은 평가를 단 한 스윕만 하고 바로 개선한다. 실제로 $\mathcal{T}^* V = \mathcal{T}^{\operatorname{greedy}(V)} V$이므로 VI는 "평가 1스윕짜리 PI"다. 그 사이에 평가를 $k$ 스윕만 하는 <strong>수정 정책 반복(Modified PI, Puterman & Shin 1978)</strong>이 있다.</p>
<div class="table-wrap"><table class="t">
<thead><tr><th>방법</th><th>평가 스윕 수 $k$</th><th>한 반복의 비용</th><th>반복 횟수</th></tr></thead>
<tbody>
<tr><td>가치 반복 (VI)</td><td>1</td><td>싸다 ($O(|\mathcal{S}|^2|\mathcal{A}|)$)</td><td>많다 (선형 수렴, 비율 $\gamma$)</td></tr>
<tr><td>수정 정책 반복 (MPI)</td><td>$k$</td><td>중간</td><td>중간</td></tr>
<tr><td>정책 반복 (PI)</td><td>$\infty$ (수렴까지)</td><td>비싸다 (선형계 풀이)</td><td>매우 적다 (보통 한 자릿수)</td></tr>
</tbody></table></div>

<h2>시뮬레이터: 정책 반복을 손으로 돌리기</h2>
<p>균등 무작위 정책에서 출발한다. <em>평가 스윕</em>으로 $V$를 현재 정책의 가치 쪽으로 끌어가고, <em>정책 개선</em>으로 그 $V$에 탐욕적인 정책을 만든다. 평가를 끝까지 하지 않고 몇 스윕만 한 뒤 개선해도 결국 최적 정책에 도달한다는 점이 GPI의 요점이다.</p>
<div data-w="pi-sim"></div>
<p>아래는 같은 격자에서 평가 스윕 수 $k$만 바꾼 여섯 방법을 실제로 돌려 비교한 결과다(PI는 매번 $\Delta < 10^{-6}$까지 평가). 막대는 "탐욕 정책이 처음 최적이 될 때까지"와 "가치 오차가 $10^{-4}$ 아래로 내려갈 때까지" 필요한 <strong>총 평가 스윕 수</strong>다. 위 시뮬레이터의 $\gamma$, 미끄러짐, 맵 설정을 그대로 따른다.</p>
<div data-w="pi-compare"></div>
<ul>
  <li>정책은 가치보다 훨씬 먼저 최적이 된다. "최적 정책까지" 막대가 "가치 수렴까지" 막대보다 늘 짧다.</li>
  <li>PI는 개선 횟수가 가장 적지만, 매번 평가를 끝까지 하므로 전체 스윕 수는 더 많을 수 있다. 실전에서는 $k$가 작은 MPI가 가장 효율적인 경우가 많다.</li>
  <li>$\gamma$를 0.99 근처로 올리면 VI의 스윕 수가 크게 늘어난다. 축약 비율이 1에 가까워지기 때문이다(T1).</li>
</ul>

<h2>일반화 정책 반복 (GPI)</h2>
<p>평가가 정확할 필요도, 개선이 모든 상태에서 동시에 일어날 필요도 없다. 두 과정이 서로를 향해 <strong>조금씩이라도 움직이기만 하면</strong> 결국 $V = V^\pi$이면서 $\pi = \operatorname{greedy}(V)$인 지점, 곧 두 조건을 함께 만족하는 지점에 닿는다. 그 지점이 벨만 최적 방정식의 해다.</p>
<div class="w wide" style="box-shadow:none"><div class="w-body">
<svg viewBox="0 0 640 220" role="img" aria-label="GPI 다이어그램">
  <defs><marker id="dp-ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--signal)"/></marker></defs>
  <line x1="90" y1="200" x2="320" y2="30" style="stroke:var(--c1);stroke-width:2.5"/>
  <line x1="550" y1="200" x2="320" y2="30" style="stroke:var(--c3);stroke-width:2.5"/>
  <g style="fill:none;stroke:var(--signal);stroke-width:1.6">
    <path d="M200 192 L132 169" marker-end="url(#dp-ar)"/>
    <path d="M132 169 L470 141" marker-end="url(#dp-ar)"/>
    <path d="M470 141 L224 112" marker-end="url(#dp-ar)"/>
    <path d="M224 112 L398 88" marker-end="url(#dp-ar)"/>
    <path d="M398 88 L278 62" marker-end="url(#dp-ar)"/>
    <path d="M278 62 L352 50" marker-end="url(#dp-ar)"/>
  </g>
  <circle cx="320" cy="30" r="6" style="fill:var(--ink)"/>
  <text x="334" y="24" style="fill:var(--ink);font-size:13px;font-weight:600">V*, π*</text>
  <text x="60" y="140" style="fill:var(--c1);font-size:13px">V = V^π  (평가)</text>
  <text x="470" y="200" style="fill:var(--c3);font-size:13px">π = greedy(V)  (개선)</text>
  <text x="206" y="210" style="fill:var(--muted);font-size:12px">시작: V₀, π₀</text>
</svg></div></div>
<div class="thesis-box"><span class="label">대전제 T2 · GPI</span>
<p>평가(가치를 정책에 맞추기)와 개선(정책을 가치에 맞추기)은 서로 밀고 당긴다. 한쪽을 맞추면 다른 쪽이 어긋나지만, 이 주고받기를 반복하면 최적점으로 수렴한다. 아래 표처럼 거의 모든 RL 알고리즘은 "평가를 무엇으로, 얼마나 정확히 하는가"와 "개선을 무엇으로, 얼마나 크게 하는가"의 조합으로 분류된다.</p>
</div>
<div class="table-wrap"><table class="t">
<thead><tr><th>알고리즘</th><th>평가</th><th>개선</th></tr></thead>
<tbody>
<tr><td>정책 반복 · 가치 반복</td><td>모델로 정확히 / 1스윕</td><td>탐욕(argmax)</td></tr>
<tr><td>MC 제어, SARSA <a href="#qlearning">07</a></td><td>샘플 리턴 / 한 스텝 TD</td><td>ε-탐욕</td></tr>
<tr><td>Q-learning, DQN <a href="#dqn">10</a></td><td>$\max$ 타깃 TD (평가와 개선을 한 식에서 함께 함)</td><td>암묵적 탐욕</td></tr>
<tr><td>Actor-Critic, PPO <a href="#ac">12</a> <a href="#ppo">13</a></td><td>critic $V_\phi$ (몇 스텝 학습)</td><td>정책 경사 한두 스텝 (신뢰영역 안에서)</td></tr>
<tr><td>SAC <a href="#maxent">14</a></td><td>soft Q</td><td>$\pi \propto \exp(Q/\alpha)$ 쪽으로 KL 투영</td></tr>
<tr><td>AlphaZero <a href="#modelbased">16</a></td><td>가치 네트워크 + 자기대국 결과</td><td>MCTS가 만든 개선된 분포로 증류 (T9)</td></tr>
<tr><td>RLHF <a href="#rlhf">19</a></td><td>보상모델 + 가치 헤드</td><td>KL 제약 PPO</td></tr>
<tr><td>Expert Iteration, STaR <a href="#memory">23</a></td><td>검증기 · 정답 확인</td><td>성공 샘플로 SFT (T9)</td></tr>
</tbody></table></div>

<h2>비동기 DP와 우선순위 스윕</h2>
<p>모든 상태를 매번 갱신할 필요는 없다. 각 상태가 무한히 자주 갱신되기만 하면 임의 순서의 갱신도 수렴한다(비동기 DP). 이 자유를 활용하는 방법이 몇 가지 있다.</p>
<ul>
  <li><strong>우선순위 스윕(prioritized sweeping, Moore & Atkeson 1993):</strong> 벨만 오차 $|\mathcal{T}V(s) - V(s)|$가 큰 상태부터 갱신하고, 그 상태로 들어오는 앞 상태의 우선순위를 올린다. 가치 변화가 "필요한 곳으로만" 전파된다. DQN의 우선순위 리플레이(PER, <a href="#dqn">10장</a>)가 같은 아이디어다.</li>
  <li><strong>실시간 DP(RTDP, Barto et al. 1995):</strong> 실제로(또는 시뮬레이션으로) 방문하는 상태만 갱신한다. 시작 상태에서 도달 가능한 작은 부분만 풀면 된다. MCTS(<a href="#modelbased">16장</a>)의 전신이다.</li>
</ul>

<h2>선형계획 관점: 원문제와 점유 측도</h2>
<p>벨만 최적 방정식은 선형계획(LP)으로도 풀 수 있다. $V^*$는 모든 $(s,a)$에서 $V(s) \ge R(s,a) + \gamma\sum_{s'}P(s'|s,a)V(s')$를 만족하는 가장 작은 함수다.</p>
$$\textbf{원문제:}\quad \min_V\ (1-\gamma)\sum_s \rho_0(s)V(s)\quad \text{s.t.}\quad V(s) \ge R(s,a) + \gamma\sum_{s'}P(s'|s,a)V(s')\quad \forall s,a$$
<p>이 LP의 쌍대문제가 더 흥미롭다. 쌍대 변수 $d(s,a)$는 정책이 $(s,a)$를 할인 방문하는 빈도, 즉 <strong>점유 측도(occupancy measure)</strong>가 된다.</p>
<div data-w="fx-dual"></div>
<p>쌍대 해에서 정책은 $\pi(a|s) = d(s,a)/\sum_{a'}d(s,a')$로 복원된다. 정책을 직접 찾는 대신 "어떤 상태-행동을 얼마나 자주 방문할 것인가"라는 분포를 찾는 셈이다. 이 관점은 뒤에서 여러 번 다시 나온다.</p>
<ul>
  <li>정책 경사 정리와 성능 차이 보조정리의 $d^\pi$ (<a href="#pg">11장</a>, <a href="#ppo">13장</a>)</li>
  <li>오프라인 RL의 DICE 계열: 데이터 분포 $d^D$와 $d^\pi$의 비율 $d^\pi/d^D$를 직접 추정 (<a href="#offline">15장</a>)</li>
  <li>모방학습 GAIL: 전문가와 에이전트의 점유 측도를 맞추기</li>
  <li>Q-learning의 LP 쌍대 해석 (<a href="#qviews">08장</a>)</li>
</ul>

<h2>차원의 저주, 그리고 다음 장들</h2>
<p>DP의 한계는 명확하다. (1) 모델 $P, R$을 알아야 하고, (2) 한 스윕마다 모든 상태를 훑어야 하며($O(|\mathcal{S}|^2|\mathcal{A}|)$), (3) 상태 수는 변수 개수에 지수적으로 늘어난다(벨만이 이름 붙인 <em>차원의 저주</em>). 바둑의 상태는 약 $10^{170}$개이고, 50,000개 토큰 어휘로 길이 100의 문장을 만들면 $50000^{100}$개다.</p>
<p>이후 장에서는 이 한계를 하나씩 푼다.</p>
<div class="table-wrap"><table class="t">
<thead><tr><th>한계</th><th>해법</th><th>무엇이 바뀌었나</th><th>장</th></tr></thead>
<tbody>
<tr><td>모델을 모른다</td><td>MC, TD, Q-learning</td><td>$\sum_{s'}P(s'|s,a)$ → 실제로 겪은 샘플 하나</td><td><a href="#td">06</a> <a href="#qlearning">07</a></td></tr>
<tr><td>모든 상태를 훑는다</td><td>RTDP, MCTS, 궤적 샘플링</td><td>전체 스윕 → 방문하는 상태만</td><td><a href="#modelbased">16</a></td></tr>
<tr><td>상태가 너무 많다</td><td>함수근사, 신경망</td><td>표 $V[s]$ → $V_\theta(s)$, 일반화</td><td><a href="#approx">09</a> <a href="#dqn">10</a></td></tr>
<tr><td>argmax가 비싸다 (연속/거대 행동)</td><td>정책을 직접 매개변수로 표현</td><td>탐욕 개선 → 경사 개선</td><td><a href="#pg">11</a> <a href="#ppo">13</a></td></tr>
<tr><td>모델을 배울 수 있다</td><td>Dyna, MuZero, Dreamer</td><td>학습된 모델 위에서 DP/계획</td><td><a href="#modelbased">16</a></td></tr>
</tbody></table></div>
`,
    mount: {
      'fx-improve': (el) => ui.formula(el, {
        title: '탐욕적 정책 개선',
        say: '{new|이 칸의 새 화살표}는 {am|점수가 가장 높은 행동}을 가리킨다. 각 행동의 점수는 {R|바로 받는 점수}에, {P|도착할 수 있는 칸들을 확률만큼 평균 낸} {V|지금 방식대로 했을 때의 다음 칸 점수}를 {g|할인율}만큼 깎아 더한 것, 즉 {Q|그 행동의 가치}다.',
        tex: String.raw`\tm{new}{\pi'(s)} = \tm{am}{\argmax_a}\ \Big[\tm{R}{R(s,a)} + \tm{g}{\gamma}\tm{P}{\sum_{s'}P(s'|s,a)}\,\tm{V}{V^{\pi}(s')}\Big] = \argmax_a\ \tm{Q}{Q^\pi(s,a)}`,
        terms: [
          { id: 'new', sym: "\\pi'(s)", label: '개선된 정책', desc: '각 상태에서 하나의 행동을 고르는 결정적 정책.', long: '동점인 행동이 여럿이면 아무거나 하나를 고르거나 균등하게 섞어도 된다. 어느 쪽이든 개선 정리는 성립한다.' },
          { id: 'am', sym: '\\argmax_a', label: '탐욕 선택', desc: '한 스텝 앞을 본 뒤 최선의 행동.', easy: '네 방향 점수 중 가장 큰 쪽을 고른다.', long: '이 자리를 "argmax 쪽으로 조금만 움직이기"로 바꾸면 정책 경사(11장), "KL 제약 안에서 argmax 쪽으로"로 바꾸면 TRPO/PPO(13장), "$\\exp(Q/\\beta)$로 재가중"으로 바꾸면 soft 정책 개선(14장)이 된다.' },
          { id: 'R', sym: 'R(s,a)', label: '즉시 보상', desc: '모델이 알려 준다.' },
          { id: 'g', sym: '\\gamma', label: '할인율', desc: '' },
          { id: 'P', sym: "\\sum_{s'}P", label: '모델 평균', desc: 'DP가 모델을 필요로 하는 지점.', easy: '미끄러져 다른 칸에 갈 수도 있으면, 도착할 확률만큼 평균을 낸다.', long: '$Q^\\pi$를 직접 갖고 있으면 이 합이 필요 없다. 그래서 모델 프리 제어는 $V$ 대신 $Q$를 학습한다.' },
          { id: 'V', sym: "V^\\pi(s')", label: '옛 정책의 가치', desc: '평가 단계의 결과.', easy: '지금 화살표대로 갔을 때 다음 칸에서 받는 점수.', long: '개선은 <em>옛</em> 정책의 가치를 기준으로 한다. 새 정책을 따르면 가치가 바뀌지만, 개선 정리는 그 바뀐 가치가 옛 가치 이상임을 보장한다.' },
          { id: 'Q', sym: 'Q^\\pi(s,a)', label: '행동 가치', desc: '괄호 안 전체 = Q.' },
        ],
      }),
      'dv-improve': (el) => ui.derivation(el, {
        title: '정책 개선 정리: $Q^\\pi(s,\\pi\'(s)) \\ge V^\\pi(s)\\ \\forall s \\Rightarrow V^{\\pi\'} \\ge V^\\pi$',
        easy: '한 칸에서만 더 나은 행동을 하고 나머지는 원래대로 해도 손해가 없다면, 그 바꿈을 모든 칸, 모든 순간에 적용해도 손해가 없다. 그래서 "더 좋아 보이는 쪽으로 화살표 돌리기"는 안전하다. 더 돌릴 곳이 없으면 그것이 최적이다.',
        caption: '"다음 단계"를 누르면 한 줄씩 펼쳐진다. 결정적 정책 $\\pi\'$가 모든 상태에서 "한 번 이탈한 뒤 $\\pi$로 돌아오는 것"이 $\\pi$보다 낫다는 가정에서 출발한다.',
        steps: [
          { tex: String.raw`V^\pi(s) \le Q^\pi(s, \pi'(s))`, why: '가정이다. 탐욕 정책 $\\pi\'(s)=\\arg\\max_a Q^\\pi(s,a)$는 $\\max_a Q^\\pi(s,a) \\ge \\sum_a\\pi(a|s)Q^\\pi(s,a) = V^\\pi(s)$이므로 이 가정을 저절로 만족한다.' },
          { tex: String.raw`= \mathbb{E}\big[r_{t+1} + \gamma V^\pi(s_{t+1}) \mid s_t = s,\ a_t = \pi'(s)\big] = \mathbb{E}_{\hl{\pi'}}\big[r_{t+1} + \gamma V^\pi(s_{t+1}) \mid s_t = s\big]`, why: '$Q^\\pi$를 한 스텝 전개한다. 첫 행동을 $\\pi\'$가 고르므로 $\\mathbb{E}_{\\pi\'}$로 쓸 수 있다.' },
          { tex: String.raw`\le \mathbb{E}_{\pi'}\big[r_{t+1} + \gamma\, \hl{Q^\pi(s_{t+1}, \pi'(s_{t+1}))} \mid s_t = s\big]`, why: '다음 상태 $s_{t+1}$에서도 가정 $V^\\pi \\le Q^\\pi(\\cdot,\\pi\'(\\cdot))$을 적용한다.' },
          { tex: String.raw`= \mathbb{E}_{\pi'}\big[r_{t+1} + \gamma r_{t+2} + \gamma^2 \hl{V^\pi(s_{t+2})} \mid s_t = s\big]`, why: '다시 한 스텝 전개한다. 이제 두 스텝을 $\\pi\'$대로 행동했다.' },
          { tex: String.raw`\le \cdots \le \mathbb{E}_{\pi'}\big[r_{t+1} + \gamma r_{t+2} + \gamma^2 r_{t+3} + \cdots \mid s_t = s\big] = \hl{V^{\pi'}(s)}`, why: '같은 논증을 무한히 반복하면 남는 항 $\\gamma^n V^\\pi$는 0으로 가고, 모든 행동을 $\\pi\'$로 한 리턴의 기댓값만 남는다.' },
          { tex: String.raw`V^{\pi'} = V^\pi \;\Rightarrow\; V^\pi(s) = \max_a Q^\pi(s,a)\ \ \forall s \;\Rightarrow\; \hl{V^\pi = \mathcal{T}^*V^\pi = V^*}`, why: '개선이 멈추면(같은 가치) 그 가치는 벨만 최적 방정식을 만족한다. 축약 사상의 고정점은 유일하므로(T1) 이 가치가 곧 최적 가치다.' },
        ],
      }),
      'fx-dual': (el) => ui.formula(el, {
        title: '쌍대 LP: 점유 측도 위의 최적화',
        say: '{d|각 칸에서 각 행동을 얼마나 자주 하는지}를 정해서 {obj|받는 점수의 합}을 최대로 만든다. 단, 어느 칸이든 {out|그 칸에 머무는 빈도}는 {start|그 칸에서 출발하는 몫}과 {inflow|다른 칸에서 흘러 들어오는 몫}을 더한 것과 같아야 한다.',
        tex: String.raw`\max_{\tm{d}{d \ge 0}}\ \tm{obj}{\sum_{s,a} d(s,a)R(s,a)}\quad\text{s.t.}\quad \tm{out}{\sum_a d(s',a)} = \tm{start}{(1-\gamma)\rho_0(s')} + \tm{inflow}{\gamma\sum_{s,a}P(s'|s,a)\,d(s,a)}\quad\forall s'`,
        terms: [
          { id: 'd', sym: 'd(s,a)', label: '점유 측도', desc: '(s,a)를 할인 방문하는 정규화된 빈도. 합은 1.', long: '$d^\\pi(s,a) = (1-\\gamma)\\sum_t\\gamma^t\\Pr(s_t=s, a_t=a)$. 정상(stationary) 정책에 한해 정책과 점유 측도는 일대일로 대응한다. 그래서 정책 대신 $d$를 최적화해도 된다.' },
          { id: 'obj', sym: '\\sum d\\,R', label: '목적', desc: '기대 보상 = (1−γ)·J(π). d에 대해 선형.', long: '정책 공간에서 $J(\\pi)$는 비볼록이지만, 점유 측도 공간에서는 목적도 제약도 선형이다. 그래서 LP로 다항 시간에 풀린다.' },
          { id: 'out', sym: "\\sum_a d(s',a)", label: '유출량', desc: "s'에서 나가는 방문 빈도.", long: '상태 $s\'$에 머무는 빈도는 그 상태에서 고르는 모든 행동의 빈도 합이다.' },
          { id: 'start', sym: "(1-\\gamma)\\rho_0(s')", label: '시작 유입', desc: '에피소드가 s\'에서 시작하는 몫.' },
          { id: 'inflow', sym: "\\gamma\\sum P\\,d", label: '전이 유입', desc: '다른 (s,a)에서 흘러 들어오는 빈도.', long: '"흐름 보존(flow conservation)" 제약이다. 들어온 만큼 나간다. 원문제의 변수 $V(s\')$가 이 제약의 라그랑주 승수다. 그래서 가치 함수는 "상태 방문 제약의 그림자 가격"으로 해석된다.' },
        ],
      }),
      'pi-sim': mountPI,
      'pi-compare': mountCompare,
      'try-arrows': mountArrows,
      'step-pi': (el) => ui.walkthrough(el, {
        title: '복도에서 평가와 개선을 손으로 한 번씩',
        caption: '칸에 답을 적고 "확인"을 누르면 계산식이 열린다. 복도는 <strong>[함정 −10] · A · B · [출구 +10]</strong>이고, 할인율은 0.9, 이동 자체에는 점수가 없다. 지금 화살표는 A도 B도 왼쪽을 가리킨다.',
        steps: [
          { say: '<strong>평가 1.</strong> A에서 왼쪽으로 가면 함정에 빠져 −10점을 받고 끝난다. 지금 화살표대로라면 A의 점수 $V(A)$는?', ask: { answer: -10 }, calc: String.raw`V(A) = -10` },
          { say: '<strong>평가 2.</strong> B에서 왼쪽으로 가면 0점을 받고 A로 간다. A의 점수를 한 번 할인해서 B의 점수 $V(B)$는?', ask: { answer: -9, tol: 0.01 }, calc: String.raw`V(B) = 0 + 0.9 \times V(A) = 0.9 \times (-10) = -9` },
          { say: '<strong>개선 1.</strong> 이제 A의 화살표를 돌려 볼지 따진다. A에서 오른쪽으로 가면 0점을 받고 B로 간다. 방금 잰 B의 점수(−9)를 쓰면, "A에서 오른쪽"의 점수는?', ask: { answer: -8.1, tol: 0.01 }, calc: String.raw`Q(A, \text{오른쪽}) = 0 + 0.9 \times (-9) = -8.1 \;>\; Q(A, \text{왼쪽}) = -10`, note: '−8.1이 −10보다 크므로 A의 화살표를 오른쪽으로 돌린다. B의 화살표가 아직 나쁜데도 A는 이미 더 나은 쪽을 찾았다.' },
          { say: '<strong>개선 2.</strong> B에서 오른쪽은 바로 출구라 +10점이다. 왼쪽(−9)보다 크므로 B의 화살표도 오른쪽으로 돌린다.', calc: String.raw`Q(B, \text{오른쪽}) = 10 \;>\; Q(B, \text{왼쪽}) = 0.9 \times (-10) = -9` },
          { say: '<strong>다시 평가.</strong> 이제 두 화살표 모두 오른쪽이다. $V(B) = 10$이다. 그러면 $V(A)$는?', ask: { answer: 9, tol: 0.01 }, calc: String.raw`V(B) = 10,\qquad V(A) = 0 + 0.9 \times 10 = 9` },
          { say: '<strong>다시 개선.</strong> A: 왼쪽 −10, 오른쪽 9. B: 왼쪽 $0.9\\times9 = 8.1$, 오른쪽 10. 어느 화살표도 바뀌지 않는다. 개선이 멈춘 이 지점이 최적 정책이다. 평가 두 번, 개선 두 번으로 끝났다.', calc: String.raw`\pi^*(A) = \pi^*(B) = \text{오른쪽},\qquad V^*(A) = 9,\ V^*(B) = 10` },
        ],
      }),
    },
    tacit: [
      { tag: 'math', t: '정책 반복은 벨만 방정식에 대한 뉴턴법이다',
        d: '<p>벨만 최적 방정식을 $F(V) = \\mathcal{T}^*V - V = 0$으로 쓰면, 현재 탐욕 정책 $\\pi$에서 $F$의 (부분)미분은 $\\gamma P^\\pi - I$이다. 뉴턴 스텝 $V - (\\gamma P^\\pi - I)^{-1}F(V)$를 정리하면 정확히 $(I-\\gamma P^\\pi)^{-1}r^\\pi = V^\\pi$, 즉 정책 평가가 된다(Puterman & Brumelle 1979). 그래서 VI는 선형 수렴(비율 $\\gamma$), PI는 최적점 근처에서 2차 수렴처럼 빠르게 끝난다. "반복 횟수는 적지만 한 번이 비싸다"는 뉴턴법의 성격 그대로다.</p>' },
      { tag: 'math', t: '정책 반복은 쌍대 LP의 심플렉스다',
        d: '<p>한 상태의 행동만 바꾸는 정책 반복은 쌍대 LP에서 기저 변수 하나를 바꾸는 심플렉스 피벗과 같고, 모든 상태를 동시에 바꾸는 Howard의 PI는 블록 피벗이다. Ye(2011)는 이 연결을 이용해, 할인율이 고정되면 PI와 (최대 개선 규칙) 심플렉스가 <strong>강다항(strongly polynomial)</strong> 시간에 끝남을 보였다. 이후 Hansen, Miltersen, Zwick(2013)이 PI의 반복 횟수를 $O\\big(\\frac{m}{1-\\gamma}\\log\\frac{n}{1-\\gamma}\\big)$($m$ = 상태-행동 쌍의 수, $n$ = 상태 수)로 좁혔다. 여기서도 $1/(1-\\gamma)$가 지평으로 등장한다.</p>' },
      { tag: 'algo', t: '평가를 끝까지 할 필요는 거의 없다',
        d: '<p>탐욕 개선은 $Q$의 <em>순서</em>만 쓰므로, 평가 오차가 행동 간격(최선과 차선의 차이)의 절반보다 작으면 같은 정책이 나온다. 그래서 MPI의 작은 $k$로도 충분하고, actor-critic이 critic을 몇 스텝만 학습하고 정책을 바꿔도 동작한다. 거꾸로 "critic을 끝까지 학습한 뒤 정책을 바꾸자"는 전략은 대개 낭비다. 위 비교 그래프에서 "최적 정책까지"와 "가치 수렴까지"의 차이가 그 낭비의 크기다.</p>' },
      { tag: 'algo', t: '결정적 최단경로에서 DP는 Bellman–Ford이고, 스윕 순서가 곧 속도다',
        d: '<p>$\\gamma=1$, 결정적 전이, 음의 이동 비용이면 가치 반복은 Bellman–Ford 최단경로 알고리즘과 같다. 목표에서 거꾸로(위상 순서로) 제자리 갱신하면 한 스윕에 끝나고, 무작위 순서면 경로 길이만큼 스윕이 필요하다. Dijkstra처럼 "확정된 곳부터 전파"하는 것이 우선순위 스윕의 직관이다. 확률적 전이에서도 "가치가 흘러가는 방향"을 따라 갱신하면 몇 배씩 빨라진다.</p>' },
      { tag: 'research', t: '탐욕 개선은 신뢰영역 크기가 무한대인 극단이다',
        d: '<p>정책 개선 정리는 평가가 <strong>정확할 때</strong> 성립한다. 평가가 샘플과 근사로 오염되면 argmax는 오차가 가장 크게 과대추정된 행동을 골라 버린다(T8). 그래서 근사 RL에서는 "탐욕적으로 한 번에 바꾸기" 대신 "조금만 바꾸기"가 필요하다. Kakade & Langford(2002)의 보수적 정책 반복(CPI)이 혼합 정책 $(1-\\alpha)\\pi + \\alpha\\pi\'$로 이 생각을 정식화했고, 이 흐름이 TRPO와 PPO(<a href="#ppo">13장</a>), RLHF의 KL 제약으로 이어진다.</p>' },
    ],
    quiz: [
      { q: '수정 정책 반복에서 평가 스윕 수 $k=1$로 두면 어떤 알고리즘과 같아지는가?', options: ['정책 반복', '가치 반복', '몬테카를로 제어', 'Q-learning'], answer: 1,
        explain: '$\\mathcal{T}^{\\operatorname{greedy}(V)}V = \\mathcal{T}^*V$이므로 "탐욕 정책으로 한 스윕 평가"는 벨만 최적 백업 한 번과 같다.' },
      { q: '정책 반복이 유한 번 안에 끝나는 이유로 가장 정확한 것은?', options: ['$\\gamma<1$이라서', '결정적 정책의 수가 유한하고, 매 반복이 엄격히 개선하거나 멈추기 때문에', '가치 함수가 볼록이라서', '보상이 유계라서'], answer: 1,
        explain: '정책 개선 정리 때문에 같은 정책이 다시 나타날 수 없으므로(엄격 개선), 유한한 정책 집합 안에서 반드시 멈춘다.' },
      { q: '쌍대 LP의 변수 $d(s,a)$의 의미는?', options: ['보상의 분산', '상태-행동의 (정규화된) 할인 방문 빈도', '행동의 advantage', '전이 확률의 역행렬'], answer: 1,
        explain: '점유 측도다. 흐름 보존 제약을 만족하고, $\\pi(a|s)=d(s,a)/\\sum_{a\'}d(s,a\')$로 정책을 복원한다.' },
      { q: 'GPI 관점에서 PPO의 "개선" 단계에 해당하는 것은?', options: ['critic의 TD 학습', 'KL·클리핑 제약 안에서의 정책 경사 몇 스텝', '보상모델 학습', '리플레이 버퍼 샘플링'], answer: 1,
        explain: 'critic 학습이 근사 평가, 제약된 정책 경사가 근사 개선이다. 탐욕 개선 대신 "작은 개선"을 한다.' },
    ],
  });

  /* ---------- 내가 정책 개선: 화살표를 돌려 점수 올리기 ---------- */
  function mountArrows(el) {
    const p = ui.panel(el, { kind: 'TRY', title: '화살표를 돌려 시작 칸의 점수 올리기', caption: '칸을 누를 때마다 그 칸의 화살표가 시계 방향으로 한 칸 돈다. 칸의 숫자는 "지금 화살표대로 끝까지 갔을 때 그 칸에서 받는 점수"(할인율 0.9)이고, 화살표를 바꾸는 즉시 다시 계산된다. 목표는 점선 칸(시작)의 숫자를 가장 크게 만드는 것이다.' });
    const env = new sim.GridWorld(sim.layouts.classic, { rewards: { G: 1, X: -1 }, step: 0, slip: 0 });
    const g = 0.9;
    const Vstar = env.solve(g);
    const btns = ui.row(p.body, 'btns');
    ui.button(btns, '모든 칸 한 번에 고치기 (컴퓨터가 정책 개선 1회)', improveAll, { primary: true });
    ui.button(btns, '처음부터 (모두 ←)', () => reset('left'));
    ui.button(btns, '무작위 화살표', () => reset('rand'));
    const st = ui.stats(p.body, [
      { key: 'start', label: '시작 칸의 점수', tone: 'accent' },
      { key: 'best', label: '가능한 최고 점수' },
      { key: 'bad', label: '더 좋은 방향이 남은 칸', tone: 'signal' },
      { key: 'n', label: '내가 돌린 횟수' },
    ]);
    const split = document.createElement('div');
    split.className = 'w-split';
    const left = document.createElement('div');
    const right = document.createElement('div');
    split.append(left, right);
    p.body.appendChild(split);
    const detail = document.createElement('div');
    detail.className = 'fx-detail';
    const tip = document.createElement('p');
    tip.className = 'w-caption';
    tip.innerHTML = '칸을 누르면 여기에 네 방향 각각의 점수가 나온다. 가장 큰 쪽으로 돌리는 것이 "정책 개선"이다. 화살표 둘이 서로 마주 보거나 벽을 향하면 그 자리를 영원히 맴돌아 0점이 된다.';
    right.append(detail, tip);
    const DIR = ['↑', '→', '↓', '←'];
    const r = sim.rng(3);
    let arrows, V, clicks, grid, last = null;
    const onehot = () => arrows.map((a) => [0, 1, 2, 3].map((k) => (k === a ? 1 : 0)));
    function evaluate() {
      const pi = onehot();
      let W = new Array(env.nS).fill(0);
      for (let i = 0; i < 2000; i++) { const res = env.evalSweep(W, pi, g); W = res.V; if (res.delta < 1e-12) break; }
      return W;
    }
    function betterCells() {
      let n = 0;
      for (let s = 0; s < env.nS; s++) {
        if (env.cells[s].terminal) continue;
        const q = env.qFromV(V, g, s);
        if (Math.max(...q) > q[arrows[s]] + 1e-9) n++;
      }
      return n;
    }
    function describe(s) {
      const q = env.qFromV(V, g, s);
      const m = Math.max(...q);
      const c = env.cells[s];
      return '<strong>칸 (' + (c.r + 1) + '행, ' + (c.c + 1) + '열)</strong>에서 각 방향의 점수: ' +
        q.map((x, a) => '<span class="mono" style="background:none;padding:0' + (Math.abs(x - m) < 1e-9 ? ';font-weight:600;color:var(--good)' : '') + '">' + DIR[a] + ' ' + x.toFixed(2) + '</span>').join(' · ') +
        '. 지금 화살표는 ' + DIR[arrows[s]] + (q[arrows[s]] >= m - 1e-9 ? ' (가장 좋은 쪽).' : '. 초록색 쪽으로 돌리면 이 칸의 점수가 오른다.');
    }
    function reset(kind) {
      arrows = sim.range(env.nS).map(() => (kind === 'rand' ? r.int(4) : 3));
      clicks = 0; last = null;
      V = evaluate();
      if (!grid) grid = sim.renderGrid(left, env, { V, pi: onehot(), onCell: click });
      upd('처음 상태: 모든 화살표가 왼쪽(←)이면 아무 칸도 출구에 닿지 못해 전부 0점이다. 출구(+1) 바로 왼쪽 칸부터 누르면 변화가 바로 보인다.');
    }
    function click(s) {
      if (env.cells[s].terminal) return;
      arrows[s] = (arrows[s] + 1) % 4;
      clicks++; last = s;
      V = evaluate();
      upd(describe(s));
    }
    function improveAll() {
      const before = arrows.slice();
      for (let s = 0; s < env.nS; s++) {
        if (env.cells[s].terminal) continue;
        const q = env.qFromV(V, g, s);
        const m = Math.max(...q);
        if (q[arrows[s]] < m - 1e-9) arrows[s] = q.findIndex((x) => Math.abs(x - m) < 1e-9);
      }
      const changed = arrows.filter((a, i) => a !== before[i]).length;
      V = evaluate();
      upd(changed ? '컴퓨터가 모든 칸을 한 번에 가장 좋은 쪽으로 돌렸고, ' + changed + '개 칸이 바뀌었다. 점수가 오른 칸이 생기면 그 이웃 칸도 다음 번에 바뀔 수 있다. 몇 번 더 누르면 변화가 시작 칸까지 번진다.' : '더 돌릴 칸이 없다. 개선이 멈춘 이 화살표가 최적 정책이다.');
    }
    function upd(msg) {
      grid.update({ V, pi: onehot() });
      const bad = betterCells();
      st.set('start', V[env.start].toFixed(3));
      st.set('best', Vstar[env.start].toFixed(3));
      st.set('bad', bad === 0 ? '없음 (최적)' : String(bad));
      st.set('n', clicks);
      detail.innerHTML = msg;
    }
    reset('left');
  }

  /* ---------- 공통: 환경 만들기 ---------- */
  const shared = { gamma: 0.9, slip: 0.2, map: 'classic', listeners: [] };
  function makeEnv() {
    const L = sim.layouts[shared.map];
    const rewards = shared.map === 'classic' ? { G: 1, X: -1 } : { G: 1 };
    return new sim.GridWorld(L, { rewards, step: -0.04, slip: shared.slip });
  }
  function notify() { shared.listeners.forEach((f) => f()); }
  // 장을 떠나면 리스너를 정리한다 (다시 들어오면 새로 등록)
  function listen(f) {
    shared.listeners.push(f);
    if (RL.cleanup) RL.cleanup.push(() => { const i = shared.listeners.indexOf(f); if (i >= 0) shared.listeners.splice(i, 1); });
  }
  function maxAbsDiff(a, b) { let m = 0; for (let i = 0; i < a.length; i++) m = Math.max(m, Math.abs(a[i] - b[i])); return m; }
  function qStarOf(env, Vstar, g) { return sim.range(env.nS).map((s) => env.qFromV(Vstar, g, s)); }
  // 정책 pi가 확률을 둔 모든 행동이 Q*에서 최적이면 그 칸은 최적
  function nonOptimalCount(env, pi, qStar) {
    let n = 0;
    for (let s = 0; s < env.nS; s++) {
      if (env.cells[s].terminal) continue;
      const m = Math.max(...qStar[s]);
      if (pi[s].some((p, a) => p > 1e-9 && qStar[s][a] < m - 1e-6)) n++;
    }
    return n;
  }
  function samePolicy(a, b) {
    for (let s = 0; s < a.length; s++) for (let k = 0; k < 4; k++) if (Math.abs(a[s][k] - b[s][k]) > 1e-9) return false;
    return true;
  }

  /* ---------- 정책 반복 시뮬레이터 ---------- */
  function mountPI(el) {
    const p = ui.panel(el, { kind: 'SIM', title: '정책 반복: 평가와 개선을 따로 누르기', caption: '"평가 수렴까지"를 누른 뒤 "정책 개선"을 누르면 화살표가 바뀌고 "최적과 다른 칸" 숫자가 줄어든다. 평가를 1~2 스윕만 하고 개선해도 결국 0에 닿는다.' });
    const ctr = ui.row(p.body);
    ui.slider(ctr, { label: '할인율 $\\gamma$', min: 0.5, max: 0.99, step: 0.01, value: shared.gamma, format: ui.fmt.f(2), onInput: (v) => { shared.gamma = v; notify(); } });
    ui.slider(ctr, { label: '미끄러질 확률', min: 0, max: 0.6, step: 0.05, value: shared.slip, format: ui.fmt.f(2), onInput: (v) => { shared.slip = v; notify(); } });
    ui.select(ctr, { label: '맵', value: shared.map, options: [{ value: 'classic', label: '4×3 고전 격자' }, { value: 'maze', label: '10×6 미로' }], onChange: (v) => { shared.map = v; notify(); } });
    const btns = ui.row(p.body, 'btns');
    ui.button(btns, '평가 1 스윕', () => { evalN(1); upd('평가 1 스윕'); });
    ui.button(btns, '평가 수렴까지', () => { const n = evalConverge(); upd('평가 ' + n + ' 스윕으로 수렴 (Δ < 1e-6)'); });
    ui.button(btns, '정책 개선', improve, { primary: true });
    ui.button(btns, 'PI 한 바퀴', () => { const n = evalConverge(); improve(n); });
    ui.button(btns, '초기화 (무작위 정책)', reset);
    const st = ui.stats(p.body, [
      { key: 'ev', label: '평가 스윕 누계' },
      { key: 'im', label: '개선 횟수' },
      { key: 'bad', label: '최적과 다른 칸', tone: 'signal' },
      { key: 'err', label: '$\\|V - V^*\\|_\\infty$', tone: 'accent' },
      { key: 'gap', label: '$\\|V - V^{\\pi}\\|_\\infty$' },
    ]);
    const split = document.createElement('div');
    split.className = 'w-split';
    const left = document.createElement('div');
    const right = document.createElement('div');
    split.append(left, right);
    p.body.appendChild(split);
    const log = document.createElement('div');
    log.className = 'log';
    right.appendChild(log);
    const note = document.createElement('p');
    note.className = 'w-caption';
    note.innerHTML = '화살표 = 현재 정책 $\\pi$ (평가 중에는 바뀌지 않는다). 색과 숫자 = 현재 $V$. "최적과 다른 칸"이 0이 되면 정책은 최적이다. 가치가 아직 덜 수렴했어도 0이 될 수 있다.';
    right.appendChild(note);

    let env, V, pi, Vstar, qStar, Vpi, evals, imps, lines, grid;
    function reset() {
      env = makeEnv();
      const g = shared.gamma;
      Vstar = env.solve(g);
      qStar = qStarOf(env, Vstar, g);
      V = new Array(env.nS).fill(0);
      pi = env.uniformPolicy();
      evals = 0; imps = 0; lines = [];
      left.innerHTML = '';
      grid = sim.renderGrid(left, env, { V, pi });
      upd('초기화: 균등 무작위 정책, V = 0');
    }
    function exactVpi() {
      let W = new Array(env.nS).fill(0);
      for (let i = 0; i < 3000; i++) { const r = env.evalSweep(W, pi, shared.gamma); W = r.V; if (r.delta < 1e-10) break; }
      return W;
    }
    function evalN(n) { for (let i = 0; i < n; i++) { V = env.evalSweep(V, pi, shared.gamma).V; evals++; } }
    function evalConverge() {
      let n = 0;
      for (; n < 5000; n++) { const r = env.evalSweep(V, pi, shared.gamma); V = r.V; evals++; if (r.delta < 1e-6) { n++; break; } }
      return n;
    }
    function improve(nEval) {
      const np = env.greedy(V, shared.gamma);
      let changed = 0;
      for (let s = 0; s < env.nS; s++) {
        if (env.cells[s].terminal) continue;
        if (pi[s].some((x, a) => Math.abs(x - np[s][a]) > 1e-9)) changed++;
      }
      const stable = samePolicy(np, pi);
      pi = np; imps++;
      upd((typeof nEval === 'number' ? '평가 ' + nEval + ' 스윕 후 ' : '') + '개선 #' + imps + ': ' + (stable ? '정책 변화 없음 → 정책 안정 (GPI 고정점)' : changed + '개 칸의 행동이 바뀜'));
    }
    function upd(msg) {
      Vpi = exactVpi();
      if (msg) lines.unshift(msg);
      lines = lines.slice(0, 10);
      log.textContent = lines.join('\n');
      grid.update({ V, pi });
      st.set('ev', evals);
      st.set('im', imps);
      st.set('bad', nonOptimalCount(env, pi, qStar) + ' / ' + env.cells.filter((c) => !c.terminal).length);
      st.set('err', maxAbsDiff(V, Vstar).toExponential(2));
      st.set('gap', maxAbsDiff(V, Vpi).toExponential(2));
    }
    listen(reset);
    reset();
  }

  /* ---------- VI / MPI / PI 비교 ---------- */
  function runMethod(env, g, k, Vstar, qStar) {
    let V = new Array(env.nS).fill(0);
    let sweeps = 0, imps = 0, polAt = null, valAt = null;
    const errs = [[0, Math.log10(Math.max(1e-12, maxAbsDiff(V, Vstar)))]];
    const cap = 4000;
    while (sweeps < cap && (polAt == null || valAt == null)) {
      const pi = env.greedy(V, g);
      imps++;
      if (polAt == null && nonOptimalCount(env, pi, qStar) === 0) polAt = sweeps;
      const lim = k === Infinity ? 5000 : k;
      for (let i = 0; i < lim; i++) {
        const r = env.evalSweep(V, pi, g);
        V = r.V; sweeps++;
        const e = maxAbsDiff(V, Vstar);
        errs.push([sweeps, Math.log10(Math.max(1e-12, e))]);
        if (valAt == null && e < 1e-4) valAt = sweeps;
        if (k === Infinity && r.delta < 1e-6) break;
        if (sweeps >= cap) break;
      }
    }
    return { polAt, valAt, imps, errs };
  }

  function mountCompare(el) {
    const p = ui.panel(el, { kind: 'CALC', title: '평가 스윕 수 $k$에 따른 비교 (실제 계산)', caption: '위 시뮬레이터의 $\\gamma$나 맵을 바꾸면 이 그래프가 다시 계산된다. 초록 막대(정책이 최적이 될 때까지)가 파란 막대(가치까지 정확해질 때까지)보다 늘 짧다.' });
    const st = ui.stats(p.body, [{ key: 'cfg', label: '설정' }, { key: 'pi', label: 'PI 개선 횟수' }, { key: 'vi', label: 'VI 개선(=스윕) 횟수' }]);
    const split = document.createElement('div');
    split.className = 'w-split';
    const a = document.createElement('div');
    const b = document.createElement('div');
    split.append(a, b);
    p.body.appendChild(split);
    const ks = [{ label: 'VI', k: 1 }, { label: 'k=2', k: 2 }, { label: 'k=3', k: 3 }, { label: 'k=5', k: 5 }, { label: 'k=10', k: 10 }, { label: 'PI', k: Infinity }];
    const barC = plot.bars(a, { categories: ks.map((x) => x.label), series: [], height: 250, y: { label: '총 평가 스윕 수', min: 0 }, labels: true, labelFmt: (v) => String(Math.round(v)) });
    const lineC = plot.line(b, { height: 250, x: { label: '누적 평가 스윕', min: 0 }, y: { label: 'log₁₀ ‖V − V*‖∞' }, series: [] });
    function run() {
      const env = makeEnv();
      const g = shared.gamma;
      const Vstar = env.solve(g);
      const qStar = qStarOf(env, Vstar, g);
      const res = ks.map((x) => runMethod(env, g, x.k, Vstar, qStar));
      barC.update({ series: [
        { name: '탐욕 정책이 최적이 될 때까지', color: 'c3', values: res.map((r) => (r.polAt == null ? NaN : r.polAt)) },
        { name: '가치 오차 < 1e-4 까지', color: 'c1', values: res.map((r) => (r.valAt == null ? NaN : r.valAt)) },
      ] });
      const show = [0, 3, 5];
      const cols = ['c2', 'c5', 'c4'];
      const xmax = Math.max(...show.map((i) => res[i].valAt || res[i].errs.length));
      lineC.update({
        x: { label: '누적 평가 스윕', min: 0, max: xmax },
        series: show.map((i, j) => ({ name: ks[i].label === 'VI' ? '가치 반복' : ks[i].label === 'PI' ? '정책 반복' : 'MPI ' + ks[i].label, color: cols[j], data: res[i].errs.filter((e) => e[0] <= xmax) })),
        hlines: [{ y: -4, label: '1e-4' }],
      });
      st.set('cfg', 'γ=' + g.toFixed(2) + ', 미끄러짐 ' + shared.slip.toFixed(2) + ', ' + (shared.map === 'classic' ? '4×3' : '미로'));
      st.set('pi', res[5].imps);
      st.set('vi', res[0].imps);
    }
    listen(run);
    run();
  }
})();
