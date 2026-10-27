/* 16 모델 기반 RL과 계획 */
(function () {
  const { ui, sim, plot } = RL;

  RL.chapter({
    id: 'modelbased',
    title: '모델 기반 RL과 계획',
    subtitle: '환경의 모델이 있으면 실제로 해 보지 않고도 머릿속에서 미리 시도할 수 있다. 상상 경험으로 배우는 Dyna, 매 순간 탐색하는 MCTS, 그리고 그 탐색을 정책에 증류하는 AlphaZero까지.',
    time: 45,
    level: '중급',
    prereq: ['dp', 'qlearning'],
    theses: ['T9', 'T2', 'T7'],
    easy: {
      hook: '머릿속으로 미리 해 보고 움직이면 실제로 부딪혀 보는 횟수를 크게 줄일 수 있다. 단, 머릿속 지도가 틀리면 틀린 계획을 세운다.',
      intro: '<p>처음 가는 동네에서 약속 장소를 찾는다고 하자. 무작정 걸어 다니며 길을 익힐 수도 있고, 지도를 보고 머릿속으로 길을 그려 본 뒤 출발할 수도 있다. 두 번째가 훨씬 빠르다.</p><p>이 장은 그 "머릿속 지도"(모델)를 쓰는 세 가지 방법을 다룬다. 지도로 미리 연습해 두기(Dyna), 갈림길마다 몇 수 앞을 내다보기(트리 탐색), 그리고 내다본 결과를 감각으로 외워 두기(AlphaZero)다.</p>',
      analogy: '바둑 기사는 수를 두기 전에 머릿속으로 여러 갈래를 둬 본다. 유망해 보이는 갈래는 깊이, 별로인 갈래는 얕게 본다. 그리고 가장 많이 들여다본 수를 믿고 둔다. 몬테카를로 트리 탐색(MCTS)은 이 수읽기를 그대로 숫자로 옮긴 것이고, AlphaZero는 그렇게 찾은 좋은 수를 다시 공부해 다음 수읽기의 감각으로 쓴다.',
      path: ['머릿속 지도로 연습하면 얼마나 빨리 배우는지 본다(Dyna)', '살짝 틀린 지도로 길을 계획하고, 실제 세상에서 무슨 일이 생기는지 직접 확인한다', '갈림길 점수(PUCT)를 손으로 한 번 계산한다', '수읽기 결과를 외워 다음 수읽기를 돕는 AlphaZero의 고리를 본다'],
      recap: [
        '세상의 규칙을 흉내 내는 머릿속 지도가 있으면, 실제로 덜 부딪혀 보고도 배울 수 있다.',
        '지도가 조금만 틀려도 먼 앞까지 한 번에 계획하면 오차가 크게 불어나므로, 짧게 계획하고 자주 다시 계획한다.',
        '여러 갈래를 내다보는 탐색은 유망한 쪽을 더 깊이 보고, 가장 많이 본 쪽을 고르며, 그 결과를 외워 다음 탐색을 빠르게 한다.',
      ],
    },
    goals: [
      '배경 계획(Dyna, MBPO)과 결정 시점 계획(MCTS, MPC)의 차이를 설명할 수 있다.',
      '시뮬레이션 보조정리로 모델 오차가 $1/(1-\\gamma)^2$로 증폭됨을 유도할 수 있다.',
      'PUCT 선택 규칙의 각 항을 해석하고, 방문 횟수 분포가 정책 개선 연산자가 되는 과정을 시뮬레이터로 확인한다.',
      'AlphaGo → AlphaZero → MuZero → Dreamer로 이어지는 "무엇을 모델링하는가"의 변화를 정리할 수 있다.',
    ],
    html: String.raw`
<p>03장의 동적계획법은 전이 확률 $P$를 안다고 가정했다. 06~14장의 모델 프리 방법은 $P$를 전혀 쓰지 않았다. 그 사이에 넓은 영역이 있다. 모델 $\hat P, \hat R$을 <strong>학습하거나 이미 알고 있을 때</strong> 그것으로 실제 상호작용 없이 가치와 정책을 개선하는 것을 <em>계획(planning)</em>이라 한다. 계획은 결국 GPI(T2)의 평가와 개선 단계를 "상상 경험"으로 수행하는 것이다.</p>

<h2>모델을 쓰는 두 가지 방식</h2>
<div class="grid2">
  <div class="card"><h4>배경 계획 (background planning)</h4><p>모델로 가짜 경험을 만들어 가치나 정책을 <strong>미리</strong> 학습해 둔다. 행동할 때는 학습된 정책을 그냥 꺼내 쓴다. Dyna, MBPO, Dreamer.</p></div>
  <div class="card"><h4>결정 시점 계획 (decision-time planning)</h4><p>지금 상태에서 출발해 앞을 <strong>그때그때</strong> 탐색하고 결과로 행동을 고른다. 탐색 결과는 쓰고 버리거나(MPC), 정책에 증류한다(AlphaZero). MCTS, MPC, beam search.</p></div>
</div>
<p>두 방식은 섞인다. AlphaZero는 결정 시점에 MCTS를 돌리고, 그 결과를 정책망에 증류해 다음 탐색의 사전분포로 쓴다. 이 "탐색 후 증류" 구조가 대전제 T9이며, 23장의 STaR, ReST, R1 증류가 같은 뼈대를 공유한다.</p>

<h2>Dyna: 실제 경험과 상상 경험</h2>
<div class="w wide" style="box-shadow:none"><div class="w-body">
<svg viewBox="0 0 660 170" role="img" aria-label="Dyna 구조">
  <defs><marker id="modelbased-ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--muted)"/></marker></defs>
  <g style="font-size:13px">
    <rect x="20" y="62" width="120" height="44" rx="8" style="fill:var(--signal-soft);stroke:var(--signal)"/><text x="80" y="89" text-anchor="middle" style="fill:var(--ink)">실제 환경</text>
    <rect x="270" y="16" width="130" height="44" rx="8" style="fill:var(--accent-soft);stroke:var(--accent)"/><text x="335" y="43" text-anchor="middle" style="fill:var(--ink)">가치 / 정책 Q</text>
    <rect x="270" y="110" width="130" height="44" rx="8" style="fill:var(--surface-2);stroke:var(--line)"/><text x="335" y="137" text-anchor="middle" style="fill:var(--ink)">학습된 모델 M̂</text>
    <path d="M140 76 C 200 50, 220 40, 268 38" style="fill:none;stroke:var(--muted);stroke-width:1.5" marker-end="url(#modelbased-ar)"/>
    <text x="150" y="40" style="fill:var(--ink);font-size:12px">직접 RL (실제 경험)</text>
    <path d="M140 94 C 200 120, 220 130, 268 132" style="fill:none;stroke:var(--muted);stroke-width:1.5" marker-end="url(#modelbased-ar)"/>
    <text x="150" y="146" style="fill:var(--ink);font-size:12px">모델 학습</text>
    <path d="M400 128 C 470 120, 470 54, 402 46" style="fill:none;stroke:var(--signal);stroke-width:1.8" marker-end="url(#modelbased-ar)"/>
    <text x="478" y="90" style="fill:var(--signal);font-size:12px">계획: 상상 경험 n개로</text>
    <text x="478" y="106" style="fill:var(--signal);font-size:12px">같은 Q 업데이트</text>
  </g>
</svg></div></div>
<p>Dyna-Q(Sutton 1990)는 Q-learning에 단 두 줄을 더한다. 실제로 한 스텝 경험할 때마다 (1) 그 전이를 모델(여기서는 표)에 기록하고, (2) 이미 본 $(s,a)$를 무작위로 $n$개 골라 모델이 말하는 결과로 같은 Q-learning 업데이트를 반복한다.</p>
<pre><code>loop:
  a ← ε-greedy(Q, s);  관측 r, s'
  Q(s,a) ← Q(s,a) + α[r + γ max Q(s',·) − Q(s,a)]      # 직접 RL
  Model(s,a) ← (r, s')                                  # 모델 학습
  repeat n times:                                       # 계획
    (s̃, ã) ← 이전에 본 쌍 중 무작위;  (r̃, s̃') ← Model(s̃, ã)
    Q(s̃,ã) ← Q(s̃,ã) + α[r̃ + γ max Q(s̃',·) − Q(s̃,ã)]
  s ← s'</code></pre>
<div data-w="dyna-sim"></div>
<ul>
  <li><strong>첫 에피소드는 모두 같다.</strong> 목표를 한 번도 본 적이 없으면 모델 속 보상이 전부 0이라 계획해도 Q가 바뀌지 않는다. 계획은 정보를 <em>만들어 내지</em> 않고 <em>퍼뜨린다</em>.</li>
  <li><strong>두 번째 에피소드부터 갈린다.</strong> $n=0$이면 보상 정보가 에피소드마다 한 칸씩 거꾸로 전파된다. $n=50$이면 한 에피소드 안에서 이미 본 칸 전체로 퍼진다. 격자 보기에서 에피소드 2 종료 후의 화살표 범위를 비교해 보라.</li>
  <li><strong>실제 경험 대비 계산의 교환.</strong> 같은 실제 스텝 수로 훨씬 빨리 배우는 대가는 계산량이다. 데이터가 비싸고 계산이 싸면 계획이 이득이다.</li>
</ul>

<h2>모델 오차는 지평만큼 증폭된다</h2>
<p>모델이 틀리면 계획은 틀린 세계에서 최적인 정책을 만든다. 얼마나 틀리는가를 정량화하는 고전 결과가 <strong>시뮬레이션 보조정리</strong>다.</p>
<div data-w="dv-sim"></div>
<p>공식보다 먼저 직접 겪어 보자. 아래 지도는 실제 세상과 거의 같지만, 공사 중인 벽 하나를 모른다.</p>
<div data-w="try-plan"></div>
<p>$1/(1-\gamma)^2$은 "한 스텝 오차 $\epsilon$이 지평 $H$ 동안 누적되고, 그 누적 오차가 또 $H$ 동안 가치에 반영된다"로 읽는다. 그래서 실용 알고리즘은 모델로 긴 궤적을 만들지 않는다. MBPO(Janner et al. 2019)는 <strong>실제 데이터의 상태에서 짧게(k 스텝) 갈라져 나온</strong> 모델 롤아웃만 SAC 학습에 섞는다. PETS(Chua et al. 2018)는 확률적 모델의 앙상블로 불확실성을 잡고, MOPO(Yu et al. 2020)는 오프라인에서 모델 불확실성을 보상에서 빼서 비관적으로 계획한다(T7, <a href="#offline">15장</a>).</p>

<h2>결정 시점 계획: 몬테카를로 트리 탐색</h2>
<p>MCTS는 현재 상태를 뿌리로 하는 탐색 트리를 시뮬레이션 한 번마다 조금씩 키운다. 한 번의 시뮬레이션은 네 단계다.</p>
<ol>
  <li><strong>선택:</strong> 뿌리에서 출발해 선택 규칙(UCT 또는 PUCT)으로 자식을 골라 내려간다.</li>
  <li><strong>확장:</strong> 아직 펼치지 않은 노드에 닿으면 자식들을 만든다(PUCT에서는 정책망의 사전확률 $P$를 붙인다).</li>
  <li><strong>평가:</strong> 그 노드의 가치를 무작위 롤아웃(고전 MCTS) 또는 가치망(AlphaZero)으로 추정한다.</li>
  <li><strong>역전파:</strong> 지나온 경로의 방문 수 $N$과 누적 가치 $W$를 갱신한다. $Q = W/N$.</li>
</ol>
<p>선택 규칙은 밴딧(<a href="#bandit">05장</a>)의 UCB를 트리의 각 노드에 적용한 것이다. UCT(Kocsis &amp; Szepesvári 2006)는 $Q + c\sqrt{\ln N/n}$, AlphaZero의 PUCT는 사전확률을 곱한 탐험 항을 쓴다.</p>
<div data-w="fx-puct"></div>
<p>아래 시뮬레이터는 깊이 3, 분기 3인 작은 결정 트리다(행동 3번 후 확률적 보상). <strong>함정 트리</strong>는 일부러 만들었다. 가운데 가지 $a_1$ 밑에는 최고의 잎(0.9)이 하나 있지만 나머지 잎은 대부분 나쁘다. 그래서 무작위 롤아웃 평균만 보면 $a_1$이 가장 나빠 보인다. 탐색이 진행되며 방문이 어디로 몰리는지 보라.</p>
<div data-w="step-puct"></div>
<div data-w="mcts-sim"></div>
<p>기본 설정(균일 prior + 무작위 롤아웃)에서는 수백 번의 시뮬레이션 동안 $a_0$에 방문이 몰린다. $a_1$의 롤아웃 평균이 나빠 탐험 보너스가 그 차이를 이기기까지 오래 걸리기 때문이다. 대략 천 번 근처에서야 $a_1$로 방문이 옮겨 가기 시작한다. 같은 트리에서 <em>좋은 prior</em>나 <em>가치망 평가</em>로 바꾸면 백 번 안에 $a_1$이 압도적인 방문을 받는다. 반대로 <em>틀린 prior</em>는 천 번이 지나도 $a_1$을 거의 보지 않는다. 학습된 사전분포와 평가기의 품질이 탐색 예산을 몇 자릿수 바꾼다. AlphaGo가 사람 기보로 정책망을 먼저 학습한 이유이자, LLM 탐색에서 좋은 기본 모델과 검증기가 결정적인 이유다.</p>
<div class="thesis-box"><span class="label">대전제 T9 · 탐색의 상각</span>
<p>AlphaZero(Silver et al. 2017, 2018)의 학습 루프는 다음 두 줄이다. (1) 현재 정책망 $p_\theta$와 가치망 $v_\theta$를 사전분포와 평가기로 써서 MCTS를 돌리고, 뿌리의 방문 분포 $\pi_{\text{MCTS}}(a) \propto N(a)^{1/\tau}$를 얻는다. 이것은 $p_\theta$보다 <strong>개선된 정책</strong>이다. (2) 정책망이 그 분포를 따라 하도록 학습한다.</p>
$$\mathcal{L}(\theta) = \big(z - v_\theta(s)\big)^2 \;-\; \pi_{\text{MCTS}}^\top \log p_\theta(s) \;+\; c\|\theta\|^2$$
<p>비싼 탐색($\mathcal{I}$)으로 찾은 개선을 싼 신경망 한 번의 순전파로 <em>상각</em>한다. 다음 탐색은 더 좋은 사전분포에서 시작하므로 더 깊이 볼 수 있다. 이 고리가 정책 반복(T2)의 "개선" 단계를 탐색으로, "평가" 단계를 회귀로 바꾼 것이다. Grill et al.(2020)은 방문 분포가 KL-정규화 정책 최적화 문제(T5)의 해를 근사한다는 것을 보였다.</p>
</div>

<h2>AlphaGo에서 MuZero까지: 무엇을 모델링하는가</h2>
<div class="table-wrap"><table class="t">
<thead><tr><th>시스템</th><th>모델</th><th>바꾼 것</th><th>남긴 교훈</th></tr></thead>
<tbody>
<tr><td>AlphaGo (2016)</td><td>바둑 규칙(정확)</td><td>사람 기보 SL 정책 + RL 정책 + 가치망 + 롤아웃을 MCTS에 결합</td><td>학습된 사전분포와 평가기가 탐색 폭과 깊이를 동시에 줄인다</td></tr>
<tr><td>AlphaGo Zero (2017)</td><td>규칙(정확)</td><td>사람 데이터 제거, 정책·가치 단일 망, 롤아웃 제거, MCTS = 정책 개선 연산자</td><td>자기대국 + 탐색 후 증류(T9)만으로 충분하다</td></tr>
<tr><td>AlphaZero (2018)</td><td>규칙(정확)</td><td>바둑·체스·쇼기에 같은 알고리즘</td><td>영역 지식 없이 일반화되는 계획 루프</td></tr>
<tr><td>MuZero (2020)</td><td>학습된 잠재 모델 $(h, g, f)$</td><td>규칙 대신 표현 $h$, 동역학 $g$, 예측 $f$를 학습. 관측 복원 대신 보상·가치·정책 예측만 맞춤</td><td>계획에 필요한 것은 픽셀이 아니라 <strong>결정에 필요한 양</strong>(가치 동등성)</td></tr>
<tr><td>EfficientZero (2021)</td><td>학습된 잠재 모델</td><td>자기지도 일관성 손실, value prefix, off-policy 보정</td><td>Atari 100k(약 두 시간 분량 경험)에서 높은 표본 효율 보고</td></tr>
<tr><td>Gumbel MuZero (2022)</td><td>학습된 잠재 모델</td><td>Gumbel-top-k 샘플링 + sequential halving으로 뿌리 선택</td><td>시뮬레이션이 아주 적어도 정책 개선이 보장되도록 설계</td></tr>
</tbody></table></div>
<p>MuZero의 손실은 잠재 공간에서 $K$ 스텝 펼친 예측이 실제 보상 $u$, 가치 타깃 $z$, MCTS 정책 $\pi$와 맞도록 한다.</p>
$$\mathcal{L} = \sum_{k=0}^{K}\Big[\ell^r\big(u_{t+k}, r^k\big) + \ell^v\big(z_{t+k}, v^k\big) + \ell^p\big(\pi_{t+k}, p^k\big)\Big],\qquad s^0 = h(o_{\le t}),\ \ (r^k, s^k) = g(s^{k-1}, a_{t+k})$$

<h2>상상 속에서 배우기: World Models와 Dreamer</h2>
<p>고차원 관측(이미지)에서 직접 모델을 배우는 계열은 "잠재 공간의 시뮬레이터"를 만든다.</p>
<ul>
  <li><strong>World Models</strong>(Ha &amp; Schmidhuber 2018): VAE로 관측을 압축하고, 혼합밀도 RNN으로 다음 잠재를 예측하며, 작은 컨트롤러를 그 "꿈" 속에서 진화 전략으로 학습한다.</li>
  <li><strong>PlaNet / Dreamer</strong>(Hafner et al. 2019, 2020): 결정적·확률적 경로를 함께 가진 잠재 동역학(RSSM)을 학습하고, 상상한 잠재 궤적 위에서 $\lambda$-리턴으로 actor-critic을 학습한다. 가치 기울기를 학습된 동역학을 통해 역전파한다.</li>
  <li><strong>DreamerV3</strong>(Hafner et al. 2023): symlog 변환, 정규화 기법 등으로 하이퍼파라미터를 고정한 채 매우 다양한 영역에서 동작하도록 했고, Minecraft에서 사람 데이터 없이 다이아몬드를 채굴한 것으로 알려졌다.</li>
</ul>

<h2>LLM과 모델 기반 사고</h2>
<p>LLM의 토큰 MDP에서는 전이가 결정적이고 완벽히 알려져 있다(토큰을 이어 붙이면 된다, <a href="#llm-mdp">18장</a>). 그래서 "모델"은 공짜다. 어떤 접두사로든 되돌아가 다시 생성할 수 있으므로 트리 탐색, 중간 상태에서의 몬테카를로 가치 추정, Best-of-N이 로봇 제어보다 훨씬 싸다. 어려운 것은 <em>평가</em>, 즉 가치망과 보상모델이다. 반대로 외부 세계(웹, 코드 실행, 물리)에 대한 추론에서는 LLM 자신을 세계 모델로 쓰기도 한다. RAP(Hao et al. 2023)는 LLM으로 상태 전이를 예측하고 그 위에서 MCTS를 돌렸고, Tree of Thoughts(Yao et al. 2023)는 생각의 단위로 탐색했다. 이 흐름은 <a href="#test-time">22장</a>에서 test-time compute로 이어진다.</p>

<h2>무엇이 바뀌었나: 모델 기반 계보</h2>
<div class="table-wrap"><table class="t">
<thead><tr><th>방법</th><th>출발점</th><th>바꾼 것</th><th>모델 오차 대처</th></tr></thead>
<tbody>
<tr><td>Dyna-Q (1990)</td><td>Q-learning</td><td>표 모델로 상상 업데이트 n회</td><td>결정적 표 모델(오차 없음 가정)</td></tr>
<tr><td>Dyna-Q+ (1990)</td><td>Dyna-Q</td><td>오래 안 가 본 곳에 보너스 $\kappa\sqrt{\tau}$</td><td>변하는 환경을 낙관으로 재탐험 (T7)</td></tr>
<tr><td>Prioritized sweeping (1993)</td><td>Dyna</td><td>가치가 크게 바뀐 상태의 선행 상태부터 백업</td><td>계산을 중요한 곳에 집중</td></tr>
<tr><td>UCT (2006)</td><td>UCB1 밴딧</td><td>트리의 각 노드에 UCB</td><td>결정 시점 탐색, 롤아웃 평가</td></tr>
<tr><td>PETS (2018)</td><td>MPC</td><td>확률적 신경망 앙상블 + 궤적 샘플링</td><td>앙상블 불확실성</td></tr>
<tr><td>MBPO (2019)</td><td>SAC + Dyna</td><td>실제 상태에서 갈라진 짧은 롤아웃</td><td>롤아웃 길이 제한</td></tr>
<tr><td>AlphaZero (2018)</td><td>정책 반복 + UCT</td><td>PUCT + 탐색 후 증류</td><td>정확한 규칙 모델</td></tr>
<tr><td>MuZero (2020)</td><td>AlphaZero</td><td>가치 동등 잠재 모델</td><td>결정에 필요한 양만 학습</td></tr>
<tr><td>Dreamer (2020–23)</td><td>actor-critic</td><td>잠재 상상 궤적에서 학습</td><td>짧은 상상 지평 + λ-리턴</td></tr>
<tr><td>RAP / ToT (2023)</td><td>MCTS / BFS</td><td>LLM을 전이 모델·평가기로</td><td>LLM 자기평가 (<a href="#test-time">22장</a>)</td></tr>
</tbody></table></div>
`,
    mount: {
      'dyna-sim': mountDyna,
      'mcts-sim': mountMCTS,
      'try-plan': mountPlan,
      'step-puct': (el) => ui.walkthrough(el, {
        title: 'PUCT 점수를 손으로 계산하기',
        caption: '갈림길에서 두 길 중 하나를 고른다. 지금까지 이 갈림길에 9번 왔다. 길 a는 5번 가 봤고 평균 점수 0.5, 처음부터 유망하다고 본 정도(사전확률)는 0.6이다. 길 b는 1번 가 봤고 평균 0.3, 사전확률 0.3이다. 탐험 계수 c = 1.',
        steps: [
          { say: '보너스는 "c × 사전확률 × √(갈림길 방문 수) ÷ (그 길 방문 수 + 1)"이다. 갈림길 방문 수의 제곱근부터 구한다.', calc: String.raw`\sqrt{N(s)} = \sqrt{9} = 3` },
          { say: '길 a의 보너스는?', ask: { answer: 0.3, tol: 0.005 }, calc: String.raw`1 \times 0.6 \times \frac{3}{1+5} = 0.3` },
          { say: '길 a의 최종 점수(평균 + 보너스)는?', ask: { answer: 0.8, tol: 0.005 }, calc: String.raw`0.5 + 0.3 = 0.8` },
          { say: '길 b의 최종 점수는?', ask: { answer: 0.75, tol: 0.005 }, calc: String.raw`0.3 + 1 \times 0.3 \times \frac{3}{1+1} = 0.3 + 0.45 = 0.75`, note: '0.8 > 0.75이므로 이번에는 a로 간다.' },
          { say: 'a로 7번 더 갔고 평균은 그대로 0.5라고 하자. 이제 갈림길 방문은 16번, a는 12번, b는 여전히 1번이다. 길 b의 점수는?', ask: { answer: 0.9, tol: 0.005 }, calc: String.raw`0.3 + 1 \times 0.3 \times \frac{\sqrt{16}}{1+1} = 0.3 + 0.6 = 0.9`, note: 'a는 $0.5 + 0.6\\times\\frac{4}{13} \\approx 0.68$로 내려갔다. 많이 가 본 길의 보너스는 줄고 오래 안 가 본 길의 보너스는 커져서, 결국 b도 다시 확인하게 된다.' },
        ],
      }),
      'dv-sim': (el) => ui.derivation(el, {
        title: '시뮬레이션 보조정리: 모델 오차가 가치 오차로 번지는 양',
        easy: '머릿속 지도가 한 걸음마다 조금씩 틀리면, 그 오차가 남은 걸음 수만큼 쌓이고, 쌓인 오차가 또 앞으로의 점수 전체에 번진다. 그래서 가치의 오차는 지평의 제곱만큼 커질 수 있다.',
        caption: '같은 정책 $\\pi$, 같은 보상 $r^\\pi$에서 실제 전이 $P$와 모델 전이 $\\hat P$(정책을 적용한 상태 전이 행렬)만 다르다고 하자.',
        steps: [
          { tex: String.raw`V = r + \gamma P V,\qquad \hat V = r + \gamma \hat P \hat V`, why: '두 세계 각각의 벨만 기대 방정식(02장 행렬 형태).' },
          { tex: String.raw`V - \hat V = \gamma P V - \gamma \hat P \hat V = \gamma\hl{(P - \hat P)V} + \gamma \hat P (V - \hat V)`, why: '빼고, $\\gamma\\hat P V$를 더하고 뺀다. 첫 항은 "모델이 한 스텝에서 틀린 양", 둘째 항은 "그 이후 모델 세계에서 전파되는 양".' },
          { tex: String.raw`(I - \gamma\hat P)(V - \hat V) = \gamma (P - \hat P) V`, why: '$V-\\hat V$를 한쪽으로 모은다.' },
          { tex: String.raw`V - \hat V = \gamma\,\hl{(I - \gamma \hat P)^{-1}}\,(P - \hat P)\,V`, why: '$(I-\\gamma\\hat P)^{-1} = \\sum_k \\gamma^k \\hat P^k$는 모델 세계에서의 할인 방문 연산자다. 한 스텝 오차가 이후 모든 시점으로 퍼진다.' },
          { tex: String.raw`\|(I-\gamma\hat P)^{-1}\|_\infty \le \tfrac{1}{1-\gamma},\qquad \|(P-\hat P)V\|_\infty \le \epsilon\,\|V\|_\infty \le \epsilon\,\tfrac{R_{\max}}{1-\gamma}`, why: '확률행렬의 할인 합은 $1/(1-\\gamma)$로 유계. $\\epsilon = \\max_s \\|P(\\cdot|s) - \\hat P(\\cdot|s)\\|_1$은 한 스텝 전이 오차(총변동 거리의 2배).' },
          { tex: String.raw`\boxed{\;\|V - \hat V\|_\infty \le \frac{\gamma\,\epsilon\,R_{\max}}{(1-\gamma)^2}\;}`, why: '지평의 <strong>제곱</strong>에 비례한다. 모델로 계획한 정책을 실제 세계에서 평가하면 이 오차가 두 번(평가와 최적화) 들어가 준최적성 상한도 같은 차수다.' },
        ],
      }),
      'fx-puct': (el) => ui.formula(el, {
        title: 'PUCT 선택 규칙 (AlphaZero)',
        say: '{Q|지금까지 이 길로 가 봤을 때의 평균 점수}에, {c|얼마나 모험할지 정하는 계수} × {P|처음부터 유망하다고 본 정도} × {N|이 갈림길에 온 횟수의 제곱근} ÷ {n|이 길로 이미 가 본 횟수 더하기 1}만큼의 보너스를 더해서, 가장 큰 길을 고른다.',
        tex: String.raw`a^\star = \arg\max_a \Big[\; \tm{Q}{Q(s,a)} \;+\; \tm{c}{c_{\text{puct}}}\; \tm{P}{P(s,a)}\; \frac{\tm{N}{\sqrt{N(s)}}}{\tm{n}{1 + N(s,a)}} \;\Big]`,
        terms: [
          { id: 'Q', sym: 'Q(s,a)', label: '활용 항', desc: '지금까지 이 가지를 지난 시뮬레이션들의 평균 가치.', long: '$Q = W/N$. 방문이 쌓일수록 정확해진다. 아직 안 가 본 가지의 $Q$를 무엇으로 둘지(first-play urgency)가 실전에서 큰 차이를 만든다. 이 구현은 0을 쓴다.' },
          { id: 'c', sym: 'c_{\\text{puct}}', label: '탐험 계수', desc: '탐험 항의 전체 크기.', long: '크면 사전분포를 따라 넓게, 작으면 현재 $Q$가 높은 가지를 깊게 판다. 가치의 스케일과 함께 조정해야 한다. AlphaZero 계열은 방문 수에 따라 천천히 키우는 형태도 썼다.' },
          { id: 'P', sym: 'P(s,a)', label: '사전확률', desc: '정책망이 주는 "볼 만한 수"의 확률.', long: '탐험을 정책망이 유망하다고 보는 곳에 집중시킨다. 바둑처럼 분기가 수백인 곳에서 탐색을 가능하게 만든 핵심. 사전분포가 틀리면 그 가지를 늦게 발견한다(시뮬레이터의 "틀린 prior"로 확인). 뿌리에는 Dirichlet 잡음을 섞어 탐험을 보장한다.' },
          { id: 'N', sym: '\\sqrt{N(s)}', label: '부모 방문 수', desc: '부모를 많이 지날수록 모든 자식의 탐험 보너스가 커진다.' },
          { id: 'n', sym: '1 + N(s,a)', label: '자식 방문 수', desc: '많이 가 본 가지일수록 보너스가 줄어든다.', long: '보너스가 $1/(1+n)$로 줄어드는 점이 UCB의 $1/\\sqrt{n}$보다 공격적이다. 전체적으로 방문 수는 대략 $P\\cdot e^{Q/\\text{온도}}$ 꼴로 수렴해 사전분포를 가치로 재가중한 분포가 된다(T5와 연결, Grill et al. 2020).' },
        ],
      }),
    },
    tacit: [
      { tag: 'research', t: '리플레이 버퍼는 비모수적 모델이다',
        d: '<p>Dyna의 표 모델은 "본 전이를 그대로 다시 꺼내 쓰는 것"이므로 리플레이 버퍼와 구별되지 않는다. van Hasselt et al.(2019, "When to use parametric models in reinforcement learning?")은 같은 계산 예산에서 리플레이가 학습된 파라메트릭 모델만큼, 혹은 더 잘 작동하는 경우가 많다고 보고했다. 파라메트릭 모델의 진짜 이점은 "본 적 없는 상태에서의 일반화"와 "현재 상태에서 앞으로 굴려 보는 결정 시점 계획"에 있다. 모델을 왜 쓰는지 물을 때 이 구분부터 하라.</p>' },
      { tag: 'math', t: '계획기는 모델 오류를 착취하는 최적화기다',
        d: '<p>모델 위에서 최적화한다는 것은 모델이 낙관적으로 틀린 곳을 찾아간다는 뜻이다. 최대화 편향(T8), 오프라인 RL의 외삽 착취(15장), 보상모델 해킹(19장)과 수학적으로 같은 현상이다. 그래서 실무 레시피는 거의 항상 (1) 앙상블로 불확실성을 재고, (2) 롤아웃을 짧게 하며, (3) 실제 데이터 상태에서 출발한다. 셋 다 "최적화기가 멀리 도망가지 못하게" 하는 장치다.</p>' },
      { tag: 'algo', t: 'MCTS의 출력은 Q가 아니라 방문 수다',
        d: '<p>최종 행동을 고를 때 평균 가치가 가장 높은 자식(max child)보다 가장 많이 방문한 자식(robust child)을 고르는 것이 보통이다. 방문 수는 "탐색이 반복해서 확인한 결과"라 잡음에 강하고, 탐험 항 때문에 우연히 높게 나온 가지를 걸러 낸다. 또 방문 분포 자체가 정책망의 학습 타깃이 되므로, MCTS는 가치 추정기라기보다 <strong>정책 개선 연산자</strong>로 이해하는 것이 정확하다.</p>' },
      { tag: 'algo', t: '$1/\\sqrt{n}$ 구조는 어디서나 같은 이유로 나온다',
        d: '<p>UCB1의 $\\sqrt{\\ln N / n}$, UCT, PUCT의 $\\sqrt{N}/(1+n)$, 카운트 기반 탐험 보너스 $1/\\sqrt{n(s)}$는 모두 표본 평균의 표준오차가 $1/\\sqrt{n}$으로 준다는 사실(집중 부등식)에서 나온다. 새 탐험 기법을 보면 "이 보너스는 무엇의 표준오차인가"를 물으면 대개 설계 의도가 보인다.</p>' },
      { tag: 'research', t: '좋은 모델은 정확한 모델이 아니라 "결정 동등한" 모델이다',
        d: '<p>MuZero는 관측을 복원하지 않는다. 같은 정책들에 대해 같은 가치를 주면 충분하다는 가치 동등성(value equivalence, Grimm et al. 2020) 관점이다. 이미지의 배경 질감을 완벽히 예측하는 데 용량을 쓰는 것은 낭비다. LLM 에이전트에게 세계 모델을 붙일 때도 "다음 웹 페이지 전체를 예측"보다 "이 행동이 목표 달성 확률을 어떻게 바꾸는가"를 예측하는 쪽이 계획에 직접 쓸모가 있다.</p>' },
      { tag: 'practice', t: '매 스텝 다시 계획하면 먼 미래의 모델 오차는 덜 중요하다',
        d: '<p>MPC(receding horizon)는 $H$ 스텝을 계획하지만 첫 행동만 실행하고 다음 상태에서 다시 계획한다. 먼 미래 예측의 오차는 실행되기 전에 새 관측으로 교정된다. 시뮬레이션 보조정리의 $(1-\\gamma)^{-2}$ 상한은 "한 번 계획하고 끝까지 실행"하는 최악의 경우다. 실전에서 짧은 지평 + 잦은 재계획이 긴 지평보다 잘 되는 이유다.</p>' },
    ],
    quiz: [
      { q: 'Dyna-Q에서 계획 스텝 $n$을 늘려도 <em>첫 번째</em> 에피소드 길이는 거의 줄지 않는 이유는?', options: ['학습률이 너무 작아서', '목표에 도달하기 전에는 모델 속 보상이 모두 0이라 계획해도 Q가 바뀌지 않아서', '모델이 확률적이라서', 'ε-탐욕 탐험 때문에'], answer: 1,
        explain: '계획은 이미 관측한 정보를 퍼뜨릴 뿐 새 정보를 만들지 않는다. 보상을 처음 본 이후의 에피소드부터 큰 차이가 난다.' },
      { q: '시뮬레이션 보조정리에서 가치 오차 상한이 $\\gamma\\epsilon R_{\\max}/(1-\\gamma)^2$인 이유로 가장 적절한 것은?', options: ['보상이 두 번 더해져서', '가치의 크기가 $1/(1-\\gamma)$이고, 한 스텝 전이 오차가 할인 방문 연산자로 또 $1/(1-\\gamma)$만큼 퍼져서', '모델이 두 개라서', '$\\gamma^2$를 쓰기 때문에'], answer: 1,
        explain: '$\\|V\\| \\le R_{\\max}/(1-\\gamma)$이고 $\\|(I-\\gamma\\hat P)^{-1}\\| \\le 1/(1-\\gamma)$이다. 두 지평 인자가 곱해진다.' },
      { q: 'PUCT에서 사전확률 $P(s,a)$가 최선의 행동에 매우 낮은 값을 주면?', options: ['그 행동은 절대 선택되지 않는다', '탐험 보너스가 작아 발견이 늦어지지만, 다른 가지의 방문이 쌓여 $\\sqrt{N(s)}$가 커지면 결국 방문된다', 'Q값이 음수가 된다', '알고리즘이 발산한다'], answer: 1,
        explain: '보너스는 $P\\sqrt{N}/(1+n)$이므로 부모 방문 수가 커지면 작은 $P$라도 보너스가 커진다. 다만 시뮬레이션 예산이 작으면 끝내 발견하지 못할 수 있다. 시뮬레이터의 "틀린 prior"로 확인해 보라.' },
      { q: 'AlphaZero에서 정책망의 학습 타깃은?', options: ['게임 결과 $z$', '뿌리에서의 MCTS 방문 분포 $\\pi_{\\text{MCTS}}$', '사람 기보의 수', '가치망의 출력'], answer: 1,
        explain: '탐색으로 개선된 정책(방문 분포)을 정책망에 증류한다. 가치망은 $z$로 학습한다. 탐색 후 증류(T9)의 전형.' },
    ],
  });

  /* ---------------- Dyna-Q ---------------- */
  // Sutton & Barto 그림 8.2의 미로 (6x9)
  const DYNA_MAZE = ['.......#G', '..#....#.', 'S.#....#.', '..#......', '.....#...', '.........'];

  function runDyna(env, n, episodes, seed, keepSnapshots) {
    const r = sim.rng(seed);
    const alpha = 0.1, gamma = 0.95, eps = 0.1;
    const Q = sim.range(env.nS).map(() => [0, 0, 0, 0]);
    const model = new Map();
    const seen = [];
    const steps = [];
    const snaps = [];
    const upd = (s, a, o) => {
      const target = o.r + (o.done ? 0 : gamma * Math.max(Q[o.s2][0], Q[o.s2][1], Q[o.s2][2], Q[o.s2][3]));
      Q[s][a] += alpha * (target - Q[s][a]);
    };
    for (let ep = 0; ep < episodes; ep++) {
      let s = env.start, t = 0;
      for (;;) {
        const a = r() < eps ? r.int(4) : sim.argmaxRand(Q[s], r);
        const o = env.step(s, a, r);
        upd(s, a, o);
        const key = s * 4 + a;
        if (!model.has(key)) seen.push(key);
        model.set(key, o);
        for (let i = 0; i < n; i++) {
          const k = seen[r.int(seen.length)];
          upd((k / 4) | 0, k % 4, model.get(k));
        }
        s = o.s2; t++;
        if (o.done || t >= 3000) break;
      }
      steps.push(t);
      if (keepSnapshots) snaps.push(Q.map((q) => q.slice()));
    }
    return { steps, snaps };
  }

  function mountDyna(el) {
    const p = ui.panel(el, { kind: 'SIM', title: 'Dyna-Q 미로: 계획 스텝 수에 따른 학습 속도', caption: '"다시 학습"을 누르고, 계획 스텝 n이 클수록 선이 얼마나 빨리 바닥(14 스텝)으로 내려오는지 보라. 아래 격자에서는 에피소드 슬라이더를 2에 두고 설정을 바꿔 가며 화살표가 퍼진 범위를 비교하라. 미로는 Sutton &amp; Barto(그림 8.2)의 6×9 미로다. 보상은 목표 도달 시 +1, $\\gamma=0.95$, $\\alpha=0.1$, $\\varepsilon=0.1$. 각 설정을 여러 시드로 실제로 학습시켜 에피소드별 스텝 수의 평균을 그린다(에피소드 1은 모두 같으므로 2부터). 최단 경로는 14 스텝이다.' });
    const ctr = ui.row(p.body);
    const nS = ui.slider(ctr, { label: '사용자 지정 n', min: 0, max: 100, step: 1, value: 15, format: ui.fmt.int });
    const sdS = ui.slider(ctr, { label: '평균낼 시드 수', min: 1, max: 10, step: 1, value: 5, format: ui.fmt.int });
    const btns = ui.row(p.body, 'btns');
    const runB = ui.button(btns, '다시 학습', () => runAll(), { primary: true });
    const status = document.createElement('span');
    status.className = 'w-caption';
    btns.appendChild(status);
    const chartEl = document.createElement('div');
    p.body.appendChild(chartEl);
    const chart = plot.line(chartEl, { height: 260, x: { min: 2, max: 50, label: '에피소드' }, y: { min: 0, max: 800, label: '에피소드당 스텝 수' }, series: [], hoverDigits: 1, hoverXDigits: 0 });
    const gctr = ui.row(p.body);
    const env = new sim.GridWorld(DYNA_MAZE, { rewards: { G: 1 }, step: 0 });
    let cfgs = [];
    let snapsBy = {};
    let viewCfg = '50';
    const cfgSel = ui.select(gctr, { label: '격자에 표시할 설정', value: viewCfg, options: [{ value: '0', label: 'n = 0' }], onChange: (v) => { viewCfg = v; drawGrid(); } });
    const epS = ui.slider(gctr, { label: '몇 번째 에피소드 종료 후', min: 1, max: 50, step: 1, value: 2, format: ui.fmt.int, onInput: drawGrid });
    const gridEl = document.createElement('div');
    p.body.appendChild(gridEl);
    const grid = sim.renderGrid(gridEl, env, { V: new Array(env.nS).fill(0), showValues: false, maxCell: 52 });
    const cols = ['c1', 'c2', 'c3', 'c5'];
    let job = 0;

    function setOptions() {
      const sel = cfgSel.el.querySelector('select');
      sel.innerHTML = '';
      cfgs.forEach((c) => {
        const o = document.createElement('option');
        o.value = String(c); o.textContent = 'n = ' + c;
        if (String(c) === viewCfg) o.selected = true;
        sel.appendChild(o);
      });
      if (!cfgs.map(String).includes(viewCfg)) { viewCfg = String(cfgs[cfgs.length - 1]); sel.value = viewCfg; }
    }
    function drawGrid() {
      const snaps = snapsBy[viewCfg];
      if (!snaps) return;
      const Q = snaps[Math.min(snaps.length, epS.get()) - 1];
      const V = Q.map((q) => Math.max(...q));
      const pi = Q.map((q) => {
        const m = Math.max(...q);
        if (m <= 0) return [0, 0, 0, 0];
        return q.map((x) => (x === m ? 1 : 0));
      });
      grid.update({ V, pi, showValues: false, vmax: 1 });
    }
    function runAll() {
      const my = ++job;
      cfgs = Array.from(new Set([0, 5, 50, nS.get()]));
      setOptions();
      const seeds = sdS.get();
      const results = {};
      const tasks = [];
      cfgs.forEach((n) => { for (let s = 0; s < seeds; s++) tasks.push([n, s]); });
      let i = 0;
      runB.disabled = true;
      function next() {
        if (my !== job) return;
        if (i >= tasks.length) {
          runB.disabled = false;
          status.textContent = '완료: 설정 ' + cfgs.length + '개 × 시드 ' + seeds + '개';
          render(results);
          drawGrid();
          return;
        }
        const [n, s] = tasks[i++];
        const res = runDyna(env, n, 50, 100 + s, s === 0);
        (results[n] = results[n] || []).push(res.steps);
        if (s === 0) snapsBy[String(n)] = res.snaps;
        status.textContent = '학습 중… ' + i + ' / ' + tasks.length;
        if (i % 3 === 0) render(results);
        setTimeout(next, 0);
      }
      next();
    }
    function render(results) {
      const series = [];
      cfgs.forEach((n, k) => {
        const runs = results[n];
        if (!runs) return;
        const avg = [];
        for (let e = 1; e < 50; e++) avg.push([e + 1, sim.mean(runs.map((x) => x[e]))]);
        series.push({ name: 'n = ' + n + (k === 3 && ![0, 5, 50].includes(n) ? ' (사용자)' : ''), color: cols[k], data: avg });
      });
      chart.update({ series, hlines: [{ y: 14, label: '최단 14', color: 'muted' }] });
    }
    runAll();
  }

  /* ---------------- TRY: 살짝 틀린 지도로 계획하기 ---------------- */
  const PLAN_MODEL = ['S......', '.......', '......G', '.......', '.......'];
  const PLAN_REAL = ['S..#...', '...#...', '...#..G', '...#...', '.......'];
  const DIRS = [[0, 1], [1, 0], [0, -1], [-1, 0]];
  function gridBfs(R, C, walls, from, to) {
    const key = (r, c) => r + ',' + c;
    const prev = new Map([[key(from[0], from[1]), null]]);
    const q = [from];
    while (q.length) {
      const [r, c] = q.shift();
      if (r === to[0] && c === to[1]) break;
      for (const [dr, dc] of DIRS) {
        const nr = r + dr, nc = c + dc, k = key(nr, nc);
        if (nr < 0 || nc < 0 || nr >= R || nc >= C || walls.has(k) || prev.has(k)) continue;
        prev.set(k, [r, c]);
        q.push([nr, nc]);
      }
    }
    if (!prev.has(key(to[0], to[1]))) return null;
    const path = [];
    for (let cur = to; cur; cur = prev.get(key(cur[0], cur[1]))) path.unshift(cur);
    return path;
  }

  function mountPlan(el) {
    const p = ui.panel(el, { kind: 'TRY', title: '살짝 틀린 지도로 길 계획하기', caption: '왼쪽 지도의 칸을 눌러 출발점(점선 칸)에서 목표(+1)까지 길을 그리자. 누른 칸까지는 지도상 가장 짧은 길로 자동으로 이어진다. 다 그렸으면 "계획대로 끝까지 실행"과 "한 걸음마다 다시 계획"을 각각 눌러 실제 세상 격자에서 무슨 일이 생기는지 비교하라.' });
    const R = 5, C = 7, start = [0, 0], goal = [2, 6];
    const realWalls = new Set();
    PLAN_REAL.forEach((row, r) => [...row].forEach((ch, c) => { if (ch === '#') realWalls.add(r + ',' + c); }));
    const modelEnv = new sim.GridWorld(PLAN_MODEL, { rewards: { G: 1 } });
    const realEnv = new sim.GridWorld(PLAN_REAL, { rewards: { G: 1 } });
    const split = document.createElement('div');
    split.className = 'w-split';
    const L = document.createElement('div'), Rt = document.createElement('div');
    const lt = document.createElement('p'); lt.className = 'w-caption'; lt.innerHTML = '<strong>머릿속 지도</strong> (벽이 없다고 믿는다)';
    const rt = document.createElement('p'); rt.className = 'w-caption';
    const gL = document.createElement('div'), gR = document.createElement('div');
    L.append(lt, gL); Rt.append(rt, gR);
    split.append(L, Rt);
    p.body.appendChild(split);
    const btns = ui.row(p.body, 'btns');
    ui.button(btns, '지도상 최단 경로 자동으로 그리기', () => { path = gridBfs(R, C, new Set(), start, goal); result = null; draw(); });
    ui.button(btns, '계획대로 끝까지 실행', () => { if (path.length === 1) path = gridBfs(R, C, new Set(), start, goal); result = openLoop(); draw(); }, { primary: true });
    ui.button(btns, '한 걸음마다 다시 계획', () => { result = replan(); draw(); }, { primary: true });
    ui.button(btns, '지우기', () => { path = [start]; result = null; draw(); });
    const st = ui.stats(p.body, [
      { key: 'plan', label: '계획한 걸음 수', tone: 'accent' },
      { key: 'res', label: '실제 결과', tone: 'signal' },
      { key: 'how', label: '실행 방식' },
    ]);
    const log = document.createElement('div');
    log.className = 'log';
    p.body.appendChild(log);
    let path = [start], result = null;
    const idx = (env, rc) => env.index[rc[0] + ',' + rc[1]];
    const gridModel = sim.renderGrid(gL, modelEnv, { showValues: false, showArrows: false, maxCell: 50, onCell: (s, r, c) => extend([r, c]) });
    let gridReal = null;

    function extend(rc) {
      const last = path[path.length - 1];
      if (last[0] === goal[0] && last[1] === goal[1]) return;
      const seg = gridBfs(R, C, new Set(), last, rc);
      if (!seg) return;
      path = path.concat(seg.slice(1));
      result = null;
      draw();
    }
    function moveOf(a, b) { return [b[0] - a[0], b[1] - a[1]]; }
    function tryMove(pos, mv) {
      const nr = pos[0] + mv[0], nc = pos[1] + mv[1];
      if (nr < 0 || nc < 0 || nr >= R || nc >= C || realWalls.has(nr + ',' + nc)) return { pos, bump: true };
      return { pos: [nr, nc], bump: false };
    }
    function openLoop() {
      let pos = start;
      const trail = [start], lines = [];
      let bumps = 0;
      for (let i = 1; i < path.length; i++) {
        const mv = moveOf(path[i - 1], path[i]);
        const o = tryMove(pos, mv);
        if (o.bump) { bumps++; lines.push(i + '걸음: (' + pos + ')에서 ' + dirName(mv) + ' → 벽에 막혀 제자리'); }
        pos = o.pos;
        trail.push(pos);
      }
      const ok = pos[0] === goal[0] && pos[1] === goal[1];
      lines.unshift('계획한 ' + (path.length - 1) + '걸음을 그대로 실행했다. 벽에 ' + bumps + '번 막혔다. 막힌 뒤에도 계획은 "이미 벽을 지났다"고 믿고 다음 동작을 계속했다.');
      return { kind: '계획대로 끝까지', trail, ok, steps: path.length - 1, lines, end: pos };
    }
    function replan() {
      const known = new Set();
      let pos = start;
      const trail = [start], lines = [];
      let steps = 0, replans = 0;
      while (steps < 60 && !(pos[0] === goal[0] && pos[1] === goal[1])) {
        const plan = gridBfs(R, C, known, pos, goal);
        if (!plan) break;
        const mv = moveOf(plan[0], plan[1]);
        const o = tryMove(pos, mv);
        steps++;
        if (o.bump) {
          const w = [pos[0] + mv[0], pos[1] + mv[1]];
          known.add(w[0] + ',' + w[1]);
          replans++;
          lines.push(steps + '걸음: (' + w + ')가 벽임을 발견 → 지도에 적고 그 자리에서 다시 계획');
        }
        pos = o.pos;
        trail.push(pos);
      }
      const ok = pos[0] === goal[0] && pos[1] === goal[1];
      lines.unshift('매 걸음 지금 위치에서 지도로 다시 계획하고 첫 걸음만 실행했다. 벽을 ' + replans + '번 발견해 지도를 고쳤다.');
      return { kind: '한 걸음마다 다시 계획', trail, ok, steps, lines, end: pos };
    }
    function dirName(mv) { return mv[0] === 0 ? (mv[1] > 0 ? '오른쪽' : '왼쪽') : (mv[0] > 0 ? '아래' : '위'); }
    function draw() {
      gridModel.update({ trail: path.map((rc) => idx(modelEnv, rc)), agent: idx(modelEnv, path[path.length - 1]) });
      gR.innerHTML = '';
      if (result) {
        rt.innerHTML = '<strong>실제 세상</strong> (가운데 열에 공사 중인 벽이 있었다)';
        gridReal = sim.renderGrid(gR, realEnv, { showValues: false, showArrows: false, maxCell: 50, trail: result.trail.map((rc) => idx(realEnv, rc)), agent: idx(realEnv, result.end) });
        st.set('res', result.ok ? '도착 (' + result.steps + '걸음)' : '실패: (' + result.end + ')에서 멈춤');
        st.set('how', result.kind);
        log.textContent = result.lines.join('\n');
      } else {
        rt.innerHTML = '<strong>실제 세상</strong> (실행하기 전에는 모른다)';
        gridReal = sim.renderGrid(gR, modelEnv, { showValues: false, showArrows: false, maxCell: 50 });
        st.set('res', '실행 전');
        st.set('how', '–');
        log.textContent = path.length > 1 ? '지도 위 계획: ' + (path.length - 1) + '걸음. 이제 아래 두 실행 버튼을 눌러 보자.' : '왼쪽 지도에서 목표 칸(+1)을 누르거나 "지도상 최단 경로 자동으로 그리기"를 누르자.';
      }
      void gridReal;
      const done = path[path.length - 1][0] === goal[0] && path[path.length - 1][1] === goal[1];
      st.set('plan', (path.length - 1) + (done ? ' (목표까지)' : ' (아직 목표 전)'));
    }
    draw();
  }

  /* ---------------- MCTS ---------------- */
  const TRAP = [
    [[0.35, 0.30, 0.40], [0.45, 0.20, 0.30], [0.25, 0.35, 0.30]],
    [[-0.7, -0.5, -0.8], [0.9, -0.6, -0.4], [-0.6, -0.7, -0.5]],
    [[0.0, 0.1, -0.1], [0.2, -0.2, 0.0], [0.1, 0.05, -0.05]],
  ];

  function buildTree(leafVals) {
    let id = 0;
    const mk = (depth, path) => ({ id: id++, depth, path, children: null, N: 0, W: 0, P: 1, expanded: false, mu: null, vstar: null });
    const root = mk(0, []);
    // 모든 노드를 미리 만들되(그리기용), 확장 여부는 expanded 플래그로 관리
    function grow(node) {
      if (node.depth === 3) {
        const [a, b, c] = node.path;
        node.mu = leafVals[a][b][c];
        node.vstar = node.mu;
        return;
      }
      node.children = [0, 1, 2].map((k) => mk(node.depth + 1, node.path.concat([k])));
      node.children.forEach(grow);
      node.vstar = Math.max(...node.children.map((c) => c.vstar));
      node.avg = sim.mean(node.children.map((c) => (c.depth === 3 ? c.mu : c.avg)));
    }
    grow(root);
    return root;
  }

  function mountMCTS(el) {
    const p = ui.panel(el, { kind: 'SIM', title: 'MCTS 한 단계씩: 선택 · 확장 · 평가 · 역전파', caption: '"시뮬레이션 1회"를 여러 번 눌러 주황 경로가 어느 가지로 내려가는지 보고, "100회"나 "500회"를 눌러 방문(원 크기)이 어느 가지로 몰리는지 보라. 사전확률과 평가 방식을 바꾸면 같은 트리에서 결과가 크게 달라진다.' });
    const ctr = ui.row(p.body);
    let rule = 'puct', priorMode = 'uniform', treeMode = 'trap', evalMode = 'rollout';
    let seed = 3;
    const cS = ui.slider(ctr, { label: '탐험 계수 c', min: 0.1, max: 4, step: 0.1, value: 1.2, format: ui.fmt.f(1), onInput: reset });
    const sgS = ui.slider(ctr, { label: '보상 잡음 σ', min: 0, max: 1, step: 0.05, value: 0.3, format: ui.fmt.f(2), onInput: reset });
    ui.select(ctr, { label: '선택 규칙', value: rule, options: [{ value: 'puct', label: 'PUCT (AlphaZero)' }, { value: 'uct', label: 'UCT (고전)' }], onChange: (v) => { rule = v; reset(); } });
    ui.select(ctr, { label: '사전확률 P (PUCT)', value: priorMode, options: [{ value: 'uniform', label: '균일' }, { value: 'good', label: '좋은 prior' }, { value: 'bad', label: '틀린 prior' }], onChange: (v) => { priorMode = v; reset(); } });
    ui.select(ctr, { label: '평가 방식', value: evalMode, options: [{ value: 'rollout', label: '무작위 롤아웃' }, { value: 'value', label: '가치망 (참값 + 잡음)' }], onChange: (v) => { evalMode = v; reset(); } });
    ui.select(ctr, { label: '트리', value: treeMode, options: [{ value: 'trap', label: '함정 트리' }, { value: 'random', label: '무작위 트리' }], onChange: (v) => { treeMode = v; seed++; reset(); } });
    const btns = ui.row(p.body, 'btns');
    ui.button(btns, '시뮬레이션 1회', () => run(1), { primary: true });
    ui.button(btns, '10회', () => run(10));
    ui.button(btns, '100회', () => run(100));
    ui.button(btns, '500회', () => run(500));
    ui.button(btns, '초기화', reset);
    const st = ui.stats(p.body, [
      { key: 'n', label: '시뮬레이션 수' },
      { key: 'best', label: '진짜 최선의 첫 행동', tone: 'signal' },
      { key: 'robust', label: '최다 방문 자식 (robust child)', tone: 'accent' },
      { key: 'share', label: '최선 행동의 방문 비율' },
      { key: 'avg', label: '무작위 롤아웃 평균 a₀ / a₁ / a₂ (숨은 값)' },
    ]);
    const treeWrap = document.createElement('div');
    treeWrap.style.overflowX = 'auto';
    p.body.appendChild(treeWrap);
    const tcap = document.createElement('p');
    tcap.className = 'w-caption';
    tcap.textContent = '잎 아래 숫자: 숨은 평균 보상(학습자는 모름)과 방문 수. 원 크기는 방문 수, 색은 평균 가치 Q(파랑 양수, 주황 음수), 주황 테두리는 가장 최근 시뮬레이션의 경로다.';
    p.body.appendChild(tcap);
    const log = document.createElement('div');
    log.className = 'log';
    p.body.appendChild(log);
    const split = document.createElement('div');
    split.className = 'w-split';
    const L = document.createElement('div'), R = document.createElement('div');
    split.append(L, R);
    p.body.appendChild(split);
    const barChart = plot.bars(L, { categories: ['a₀', 'a₁', 'a₂'], series: [], height: 220, y: { min: 0, max: 1, label: '확률' }, labels: true, labelFmt: (v) => v.toFixed(2) });
    const lineChart = plot.line(R, { height: 220, x: { min: 1, label: '시뮬레이션 수' }, y: { min: 0, max: 1, label: '최선 행동 방문 비율' }, series: [], hoverXDigits: 0 });
    let root, rng, nSim, hist, lastPath;

    function leafValues() {
      if (treeMode === 'trap') return TRAP;
      const r = sim.rng(seed * 17 + 1);
      return [0, 1, 2].map(() => [0, 1, 2].map(() => [0, 1, 2].map(() => +(2 * r() - 1).toFixed(2))));
    }
    function priorsFor(node) {
      const vs = node.children.map((c) => c.vstar);
      if (rule === 'uct' || priorMode === 'uniform') return [1 / 3, 1 / 3, 1 / 3];
      return sim.softmax(vs.map((v) => (priorMode === 'good' ? 3 : -3) * v));
    }
    function expand(node) {
      const pr = priorsFor(node);
      node.children.forEach((c, i) => { c.P = pr[i]; });
      node.expanded = true;
    }
    function score(parent, ch) {
      const c = cS.get();
      const q = ch.N ? ch.W / ch.N : 0;
      if (rule === 'uct') return ch.N === 0 ? Infinity : q + c * Math.sqrt(Math.log(parent.N) / ch.N);
      return q + c * ch.P * Math.sqrt(parent.N) / (1 + ch.N);
    }
    function sample(mu) { return mu + sgS.get() * rng.normal(); }
    function evaluate(node) {
      if (node.depth === 3) return { v: sample(node.mu), how: '잎 도달: 보상 샘플 ' };
      if (evalMode === 'value') return { v: node.vstar + 0.15 * rng.normal(), how: '가치망 평가 ' };
      let n = node;
      while (n.depth < 3) n = n.children[rng.int(3)];
      return { v: sample(n.mu), how: '무작위 롤아웃 → 잎 ' + name(n) + ', 보상 ' };
    }
    function name(n) { return n.depth === 0 ? '뿌리' : 'a' + n.path.join(''); }
    function simulate() {
      const path = [root];
      const lines = [];
      let node = root;
      const sel = [];
      while (node.depth < 3 && node.expanded) {
        const parent = node;
        const scores = node.children.map((ch) => score(parent, ch));
        const k = sim.argmaxRand(scores, rng);
        sel.push(name(node.children[k]) + (Number.isFinite(scores[k]) ? '(' + scores[k].toFixed(2) + ')' : '(미방문)'));
        node = node.children[k];
        path.push(node);
      }
      lines.push('선택: 뿌리 → ' + sel.join(' → '));
      if (node.depth < 3 && !node.expanded) {
        expand(node);
        lines.push('확장: ' + name(node) + '의 자식 3개 생성' + (rule === 'puct' ? ' (P = ' + node.children.map((c) => c.P.toFixed(2)).join(', ') + ')' : ''));
      }
      const ev = evaluate(node);
      lines.push('평가: ' + ev.how + ev.v.toFixed(3));
      path.forEach((n) => { n.N += 1; n.W += ev.v; });
      lines.push('역전파: 경로의 노드 ' + path.length + '개에 N += 1, W += ' + ev.v.toFixed(3));
      lastPath = path;
      return lines;
    }
    function reset() {
      rng = sim.rng(seed);
      root = buildTree(leafValues());
      expand(root);
      nSim = 0;
      hist = [];
      lastPath = null;
      log.textContent = '"시뮬레이션 1회"를 눌러 한 단계씩 진행하세요. 가장 최근 시뮬레이션의 네 단계가 여기에 기록됩니다.';
      draw();
    }
    function run(k) {
      let lines = [];
      for (let i = 0; i < k; i++) {
        lines = simulate();
        nSim++;
        const best = sim.argmax(root.children.map((c) => c.vstar));
        hist.push([nSim, root.children[best].N / Math.max(1, nSim)]);
      }
      log.textContent = '[시뮬레이션 #' + nSim + ']\n' + lines.join('\n');
      draw();
    }
    function draw() {
      const W = 700, H = 292;
      const S = plot.svg;
      const svg = S('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': 'MCTS 탐색 트리', style: 'min-width:600px;width:100%;height:auto;display:block' });
      const ys = [28, 96, 182, 252];
      const leaves = [];
      (function collect(n) { if (n.depth === 3) leaves.push(n); else n.children.forEach(collect); })(root);
      const pos = new Map();
      leaves.forEach((n, i) => pos.set(n.id, 24 + i * (W - 48) / 26));
      (function place(n) {
        if (n.depth === 3) return pos.get(n.id);
        const xs = n.children.map(place);
        const x = sim.mean(xs);
        pos.set(n.id, x);
        return x;
      })(root);
      const maxN = Math.max(1, root.N);
      const onPath = new Set((lastPath || []).map((n) => n.id));
      (function edges(n) {
        if (!n.children) return;
        n.children.forEach((c) => {
          c.parentExpanded = n.expanded;
          if (!n.expanded) return;
          const w = 0.8 + 6 * Math.sqrt(c.N / maxN);
          svg.appendChild(S('line', { x1: pos.get(n.id), y1: ys[n.depth], x2: pos.get(c.id), y2: ys[c.depth], style: 'stroke:' + (onPath.has(c.id) && onPath.has(n.id) ? 'var(--signal)' : 'var(--line)') + ';stroke-width:' + w.toFixed(2) + ';stroke-linecap:round' }));
          edges(c);
        });
      })(root);
      (function nodes(n) {
        if (n.depth > 0 && !n.parentExpanded) return;
        const x = pos.get(n.id), y = ys[n.depth];
        const q = n.N ? n.W / n.N : 0;
        const rad = n.depth === 3 ? 6 + 6 * Math.sqrt(n.N / maxN) : 8 + 10 * Math.sqrt(n.N / maxN);
        const t = Math.max(-1, Math.min(1, q));
        const fill = n.N === 0 ? 'var(--surface)' : 'color-mix(in srgb, ' + (t >= 0 ? 'var(--pos)' : 'var(--neg)') + ' ' + Math.round(15 + Math.abs(t) * 55) + '%, var(--surface))';
        svg.appendChild(S('circle', { cx: x, cy: y, r: rad, style: 'fill:' + fill + ';stroke:' + (onPath.has(n.id) ? 'var(--signal)' : 'var(--muted)') + ';stroke-width:' + (onPath.has(n.id) ? 2.2 : 1.2) }));
        const halo = ';paint-order:stroke;stroke:var(--surface);stroke-width:3px;stroke-linejoin:round';
        if (n.depth < 2) {
          const t1 = S('text', { x: x + rad + 4, y: y - 2, style: 'font-size:11px;font-family:var(--font-mono);fill:var(--ink)' + halo });
          t1.textContent = (n.depth === 0 ? '뿌리 ' : name(n) + ' ') + 'N=' + n.N;
          svg.appendChild(t1);
          const t2 = S('text', { x: x + rad + 4, y: y + 11, style: 'font-size:10.5px;font-family:var(--font-mono);fill:var(--muted)' + halo });
          t2.textContent = (n.N ? 'Q=' + q.toFixed(2) : '') + (rule === 'puct' && n.depth > 0 ? (n.N ? ' ' : '') + 'P=' + n.P.toFixed(2) : '');
          svg.appendChild(t2);
        } else if (n.depth === 2) {
          const t1 = S('text', { x, y: y - rad - 14, 'text-anchor': 'middle', style: 'font-size:10px;font-family:var(--font-mono);fill:var(--ink)' + halo });
          t1.textContent = name(n) + ' N=' + n.N;
          svg.appendChild(t1);
          const t2 = S('text', { x, y: y - rad - 3, 'text-anchor': 'middle', style: 'font-size:10px;font-family:var(--font-mono);fill:var(--muted)' + halo });
          t2.textContent = n.N ? 'Q=' + q.toFixed(2) : (rule === 'puct' ? 'P=' + n.P.toFixed(2) : '');
          svg.appendChild(t2);
        } else {
          const t1 = S('text', { x, y: y + rad + 12, 'text-anchor': 'middle', style: 'font-size:9.5px;font-family:var(--font-mono);fill:var(--muted)' });
          t1.textContent = n.mu.toFixed(1);
          svg.appendChild(t1);
          if (n.N) {
            const t2 = S('text', { x, y: y + rad + 24, 'text-anchor': 'middle', style: 'font-size:9.5px;font-family:var(--font-mono);fill:var(--ink)' });
            t2.textContent = n.N;
            svg.appendChild(t2);
          }
        }
        if (n.children) n.children.forEach(nodes);
      })(root);
      treeWrap.innerHTML = '';
      treeWrap.appendChild(svg);

      const best = sim.argmax(root.children.map((c) => c.vstar));
      const tot = Math.max(1, root.children.reduce((s, c) => s + c.N, 0));
      const visits = root.children.map((c) => c.N / tot);
      const robust = sim.argmax(root.children.map((c) => c.N));
      barChart.update({ series: [
        { name: '사전확률 P', color: 'c6', values: root.children.map((c) => (rule === 'uct' ? 1 / 3 : c.P)) },
        { name: '방문 분포 N(a)/ΣN = 개선된 정책', color: 'c1', values: visits },
      ] });
      lineChart.update({ series: [{ name: '최선 행동 a' + best + '의 방문 비율', color: 'c1', data: hist.length ? hist : [[1, 0]] }], x: { min: 1, max: Math.max(10, nSim), label: '시뮬레이션 수' } });
      st.set('n', nSim);
      st.set('best', 'a' + best + ' (최적 가치 ' + root.children[best].vstar.toFixed(2) + ')');
      st.set('robust', nSim ? 'a' + robust + (robust === best ? ' (정답)' : ' (아직 아님)') : '–');
      st.set('share', nSim ? (visits[best] * 100).toFixed(1) + '%' : '–');
      st.set('avg', root.children.map((c) => c.avg.toFixed(2)).join(' / '));
    }
    reset();
    run(30);
  }
})();
