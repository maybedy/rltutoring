/* 15 온라인 vs 오프라인 RL */
(function () {
  const { ui, sim, plot } = RL;

  RL.chapter({
    id: 'offline',
    title: '온라인 vs 오프라인 RL',
    subtitle: '환경과 더 이상 상호작용할 수 없을 때 이미 모인 데이터만으로 더 나은 정책을 만드는 방법을 다룬다. 답의 요지는 "잘 모르는 곳에서는 비관한다"이다.',
    time: 40,
    level: '중급',
    prereq: ['dqn', 'ppo'],
    theses: ['T7', 'T8', 'T5'],
    easy: {
      hook: '다시 시도해 볼 수 없고 기록만 있다면, 기록에 거의 없는 선택은 아무리 좋아 보여도 의심해야 한다.',
      intro: '<p>어느 병원에 10년 치 진료 기록이 있다. 더 나은 치료 방침을 정하고 싶지만 환자에게 이것저것 시험해 볼 수는 없다. 가진 것은 <strong>기록뿐</strong>이다.</p><p>기록에 자주 나온 치료는 결과를 꽤 정확히 안다. 기록에 거의 없는 치료는 결과를 짐작할 뿐이다. 그런데 가장 좋아 보이는 것을 고르면 짐작이 우연히 크게 나온 쪽이 뽑히기 쉽다. 그래서 이 장의 규칙은 하나다. <strong>잘 모르는 선택은 점수를 깎아서 본다.</strong></p>',
      analogy: '맛집 앱에 리뷰 300개, 평점 4.5인 식당과 리뷰 2개, 평점 5.0인 식당이 있다. 평점만 보면 뒤의 식당이 1등이지만, 리뷰 2개짜리 5.0은 운일 가능성이 크다. 리뷰가 적을수록 평점을 깎아서 보는 습관이 이 장의 "비관주의"다. 새 동네를 여행하는 중이라면 리뷰 2개짜리 식당에도 한번 가 볼 만하다. 다시 시도할 수 있을 때의 이런 태도가 "낙관"이다.',
      path: ['기록만 보고 최고의 행동을 직접 골라 보며 함정을 체험한다', '"모르면 깎아서 본다"를 작은 숫자로 계산한다', '다른 사람의 기록으로 내 방식을 채점하는 법(중요도 가중치)과 그 한계를 본다', '이 원리를 구현한 알고리즘(BCQ, CQL, IQL, AWR)과 LLM 정렬의 관계를 본다'],
      recap: [
        '다시 시도해 볼 수 없으면, 기록에 없는 선택을 두고 한 짐작은 영영 고쳐지지 않는다.',
        '가장 높게 짐작된 선택을 고르면, 짐작이 우연히 부풀려진 곳이 뽑히기 쉽다.',
        '그래서 잘 모르는 선택일수록 점수를 깎아서 보고, 기록이 충분한 곳 근처에서 고른다.',
      ],
    },
    goals: [
      '온라인 on-policy, 온라인 off-policy, 오프라인 세 체제의 차이를 "피드백 루프"로 설명할 수 있다.',
      '외삽 오차가 $\\max$ 연산과 부트스트랩을 거쳐 커지는 과정을 시뮬레이터로 확인한다.',
      '중요도 샘플링 가중치의 분산이 $(1+\\chi^2)^H - 1$로 커짐을 유도한다.',
      'CQL의 log-sum-exp 페널티와 AWR/IQL의 가중 BC를 KL-정규화 해(T5)로 유도할 수 있다.',
    ],
    html: String.raw`
<p>지금까지의 알고리즘은 "해 보고 배운다"를 전제로 했다. 그러나 의료, 자율주행, 산업 제어, 추천 시스템처럼 탐험 자체가 비싸거나 위험한 곳이 많다. 이미 쌓인 로그 $\mathcal{D} = \{(s_i, a_i, r_i, s'_i)\}$만으로 정책을 학습하는 문제를 <strong>오프라인 RL</strong>(batch RL)이라 부른다. LLM 정렬에서 고정된 선호 데이터로 학습하는 것도 같은 구조다.</p>

<h2>세 가지 데이터 체제</h2>
<div class="w wide" style="box-shadow:none"><div class="w-body">
<svg viewBox="0 0 680 210" role="img" aria-label="온라인 on-policy, off-policy, 오프라인 비교">
  <defs><marker id="offline-ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--muted)"/></marker></defs>
  <g style="font-size:12.5px">
    <text x="110" y="18" text-anchor="middle" style="fill:var(--ink);font-weight:600">온라인 on-policy</text>
    <rect x="40" y="36" width="140" height="34" rx="7" style="fill:var(--accent-soft);stroke:var(--accent)"/><text x="110" y="58" text-anchor="middle" style="fill:var(--ink)">정책 πₖ</text>
    <rect x="40" y="130" width="140" height="34" rx="7" style="fill:var(--signal-soft);stroke:var(--signal)"/><text x="110" y="152" text-anchor="middle" style="fill:var(--ink)">환경</text>
    <path d="M90 70 L90 128" style="stroke:var(--muted);stroke-width:1.5" marker-end="url(#offline-ar)"/>
    <path d="M130 130 L130 72" style="stroke:var(--muted);stroke-width:1.5" marker-end="url(#offline-ar)"/>
    <text x="110" y="104" text-anchor="middle" style="fill:var(--muted);font-size:11px">방금 모은 롤아웃</text>
    <text x="110" y="190" text-anchor="middle" style="fill:var(--muted);font-size:11px">한 번 쓰고 버림</text>

    <text x="340" y="18" text-anchor="middle" style="fill:var(--ink);font-weight:600">온라인 off-policy</text>
    <rect x="270" y="36" width="140" height="34" rx="7" style="fill:var(--accent-soft);stroke:var(--accent)"/><text x="340" y="58" text-anchor="middle" style="fill:var(--ink)">정책 πₖ</text>
    <rect x="270" y="130" width="140" height="34" rx="7" style="fill:var(--signal-soft);stroke:var(--signal)"/><text x="340" y="152" text-anchor="middle" style="fill:var(--ink)">환경</text>
    <rect x="422" y="83" width="64" height="34" rx="7" style="fill:var(--surface-2);stroke:var(--line)"/><text x="454" y="104" text-anchor="middle" style="fill:var(--ink);font-size:11px">버퍼</text>
    <path d="M300 70 L300 128" style="stroke:var(--muted);stroke-width:1.5" marker-end="url(#offline-ar)"/>
    <path d="M410 147 C 440 147, 454 140, 454 119" style="fill:none;stroke:var(--muted);stroke-width:1.5" marker-end="url(#offline-ar)"/>
    <path d="M454 83 C 454 60, 440 53, 412 53" style="fill:none;stroke:var(--muted);stroke-width:1.5" marker-end="url(#offline-ar)"/>
    <text x="340" y="190" text-anchor="middle" style="fill:var(--muted);font-size:11px">과거 정책의 데이터 재사용 + 계속 수집</text>

    <text x="580" y="18" text-anchor="middle" style="fill:var(--ink);font-weight:600">오프라인</text>
    <rect x="510" y="36" width="140" height="34" rx="7" style="fill:var(--accent-soft);stroke:var(--accent)"/><text x="580" y="58" text-anchor="middle" style="fill:var(--ink)">정책 π</text>
    <rect x="510" y="130" width="140" height="34" rx="7" style="fill:var(--surface-2);stroke:var(--line)"/><text x="580" y="152" text-anchor="middle" style="fill:var(--ink)">고정 데이터셋 𝒟 (π_β)</text>
    <path d="M580 128 L580 72" style="stroke:var(--muted);stroke-width:1.5" marker-end="url(#offline-ar)"/>
    <text x="580" y="190" text-anchor="middle" style="fill:var(--muted);font-size:11px">환경과의 피드백 루프 없음</text>
  </g>
</svg></div></div>
<div class="table-wrap"><table class="t">
<thead><tr><th>체제</th><th>데이터 출처</th><th>대표 알고리즘</th><th>가장 큰 위험</th></tr></thead>
<tbody>
<tr><td>온라인 on-policy</td><td>현재 정책 $\pi_k$가 방금 수집</td><td>REINFORCE, A3C, PPO, GRPO</td><td>표본 비효율(데이터를 한 번만 씀)</td></tr>
<tr><td>온라인 off-policy</td><td>과거 정책이 모은 리플레이 버퍼 + 계속 수집</td><td>DQN, SAC, TD3</td><td>Deadly triad(T8). 그러나 잘못 부풀린 Q는 새 데이터로 교정된다</td></tr>
<tr><td>오프라인</td><td>행동 정책 $\pi_\beta$가 만든 고정 데이터셋</td><td>BCQ, CQL, IQL, AWAC, DT</td><td>외삽 오차가 <strong>교정되지 않음</strong></td></tr>
</tbody></table></div>
<div class="key"><span class="label">요점</span>세 체제를 가르는 것은 <strong>피드백 루프의 유무</strong>다. 손실 함수는 거의 같다. 온라인 off-policy 알고리즘(DQN, SAC)을 그대로 고정 데이터에 돌리면 대개 실패한다(Fujimoto et al. 2019). 온라인에서는 Q가 과대추정한 행동을 실제로 해 보고 틀렸다는 것을 알게 되지만, 오프라인에서는 그 기회가 영영 오지 않는다.</div>

<h2>분포 이동과 외삽 오차</h2>
<p>오프라인 데이터에 Q-learning 타깃을 그대로 쓰면 다음 식에서 문제가 생긴다.</p>
$$y = r + \gamma \max_{a'} Q_\theta(s', a'), \qquad (s, a, r, s') \sim \mathcal{D}$$
<p>$\max_{a'}$는 $s'$에서 데이터에 한 번도 나온 적 없는 행동까지 포함해 최댓값을 고른다. 그런 $(s', a')$에서 $Q_\theta$의 값은 함수근사기가 마음대로 외삽한 숫자다. 게다가 $\max$는 잡음 중 가장 큰 것을 골라내므로($\mathbb{E}[\max] \ge \max \mathbb{E}$, T8), 외삽 오차는 체계적으로 <em>위쪽</em>으로 쏠린다. 이 값이 부트스트랩으로 다른 상태에 퍼지고, 학습된 정책은 근거 없는 그 행동을 고른다. 훈련 데이터는 $d^{\pi_\beta}$에서 왔는데 평가는 $d^{\pi}$에서 일어난다. 이를 <strong>분포 이동</strong>이라 한다.</p>
<p>먼저 사람이 직접 고른다. 아래에서는 기록(점)만 보이고 진짜 점수 곡선은 숨겨져 있다.</p>
<div data-w="try-pick"></div>
<p>이제 같은 일을 학습 모델에게 맡긴다. 아래 시뮬레이터는 상태 하나에서 행동을 1차원 연속값으로 고르는 문제다. 행동 정책은 특정 구간 근처만 시도했다. 서로 다른 무작위 특징과 부트스트랩 표본으로 학습한 회귀기 $K$개(앙상블)가 같은 데이터를 맞춘다. 데이터 안에서는 모두 비슷하지만 데이터 밖에서는 제각각 외삽한다.</p>
<div data-w="ensemble-pess"></div>
<ul>
  <li><strong>순진한 argmax</strong>는 평균 Q가 가장 높은 곳을 고른다. 그곳은 흔히 몇몇 멤버가 데이터 밖에서 우연히 높게 외삽한 지점이다. 예측 Q는 높지만 실제 Q는 낮다.</li>
  <li><strong>비관적 argmax</strong> $\arg\max_a[\bar Q(a) - \alpha\,\sigma(a)]$는 앙상블이 동의하는 곳, 즉 데이터 근처에서 고른다. 데이터 범위 안 최선에 가까운 값을 안정적으로 얻는다.</li>
  <li><strong>대가:</strong> 진짜 최적 행동이 데이터 밖에 있으면 비관주의로는 그 행동을 끝내 찾지 못한다. 데이터 폭을 넓혀 진짜 봉우리(오른쪽)를 덮으면 두 방법이 일치한다. $\alpha$를 음수로 두면 불확실한 곳을 골라 "가 보는" 낙관 탐험이 된다. 온라인이라면 이쪽이 옳다.</li>
</ul>
<div data-w="step-pess"></div>
<div class="thesis-box"><span class="label">대전제 T7 · 낙관과 비관</span>
<p>같은 불확실성 $\sigma(a)$를 놓고 온라인과 오프라인은 정반대로 행동한다. 데이터를 더 모을 수 있으면 $\hat Q + c\sigma$로 낙관해서 가 보고 틀리면 고친다(UCB, <a href="#bandit">05장</a>). 더 모을 수 없으면 $\hat Q - c\sigma$로 비관해서 틀릴 위험을 피한다. 이론적으로도 오프라인 RL에서 비관주의는 "최적 정책이 데이터에 충분히 덮여 있기만 하면" 준최적성을 보장하는 원리로 정립되었다(Jin, Yang, Wang 2021; Rashidinejad et al. 2021). 이때 데이터가 덮어야 하는 것은 비교 대상 정책 하나뿐이다.</p>
</div>

<h2>오프-폴리시 평가와 중요도 샘플링</h2>
<p>정책을 학습하기 전에, 데이터만으로 새 정책 $\pi$의 성능을 <em>평가</em>하는 문제(오프-폴리시 평가, OPE)부터 본다. 가장 직접적인 방법은 중요도 샘플링(IS)이다.</p>
<div data-w="step-is"></div>
<div data-w="dv-is"></div>
<p>IS는 불편 추정량이지만 분산이 지평 $H$에 따라 지수적으로 커진다. 아래 시뮬레이터에서 행동 정책과 목표 정책의 차이를 바꾸며 이를 확인할 수 있다.</p>
<div data-w="is-var"></div>
<p>처방은 두 갈래다. (1) 곱을 끊는다: 시점별 IS(per-decision), 가중치 자기정규화(WIS, 편향이 있지만 일치 추정량), 가중치 절단(Retrace: Munos et al. 2016, V-trace: Espeholt et al. 2018). (2) 곱 대신 <strong>상태 분포 비율</strong> $d^\pi(s)/d^{\pi_\beta}(s)$를 직접 추정한다(Liu et al. 2018 "Breaking the curse of horizon", DICE 계열: Nachum et al. 2019). 모델 기반 추정과 IS를 결합한 이중 강건(Doubly Robust, Jiang &amp; Li 2016) 추정량도 표준 도구다.</p>

<h2>행동 복제와 복합 오차</h2>
<p>가장 단순한 오프라인 방법은 보상을 무시하고 데이터의 행동을 모방하는 <strong>행동 복제(BC)</strong>다. 목적식은 $\max_\theta \mathbb{E}_{(s,a)\sim\mathcal{D}}[\log\pi_\theta(a\mid s)]$이다. 데이터가 전문가의 것이면 잘 작동하지만 한계가 두 가지 있다.</p>
<ul>
  <li><strong>복합 오차:</strong> 매 스텝 오차 확률이 $\epsilon$이면 성능 손실이 $O(\epsilon H^2)$까지 커질 수 있다(Ross &amp; Bagnell 2010). 한 번 실수해 데이터에 없는 상태로 들어가면 회복하지 못하기 때문이다. DAgger는 그런 상태에서 전문가에게 정답을 다시 물어 손실을 $O(\epsilon H)$로 줄인다. 다만 전문가와 상호작용해야 한다.</li>
  <li><strong>행동 정책을 넘지 못함:</strong> 데이터가 평범하면 결과도 평범하다. 오프라인 RL의 목적은 보상을 써서 $\pi_\beta$보다 나은 정책을 만드는 것이다. 보상 상위 데이터만 골라 모방하는 필터링 BC(%BC)는 기준선으로서 성능이 의외로 좋다(Chen et al. 2021).</li>
</ul>

<h2>처방 1: 정책을 데이터 근처에 묶기</h2>
<p>BCQ(Fujimoto et al. 2019)는 $\pi_\beta$의 생성모델로 데이터와 비슷한 행동만 후보로 만들고 그중에서 Q를 최대화한다. BEAR(Kumar et al. 2019)는 MMD로 지지집합(support)을 맞추고, BRAC(Wu et al. 2019)은 KL 페널티를 건다. TD3+BC(Fujimoto &amp; Gu 2021)는 액터 손실에 항 하나만 더한다. 목적식은 $\max_\pi \mathbb{E}_{\mathcal{D}}\big[\lambda Q(s, \pi(s)) - (\pi(s) - a)^2\big]$이고 $\lambda = \alpha / \overline{|Q|}$이다. 구조가 단순한데도 성능은 다른 방법과 견줄 만하다.</p>
<p>AWR(Peng et al. 2019)과 AWAC(Nair et al. 2020)은 이 생각을 가장 원리적으로 구현한다. KL 제약을 걸고 그 닫힌 해를 쓴다.</p>
<div data-w="dv-awr"></div>

<h2>처방 2: 가치를 비관적으로 학습하기 (CQL)</h2>
<p>정책 대신 Q 자체를 낮춘다. CQL(Kumar et al. 2020)은 "데이터에 없는 행동의 Q는 누르고, 데이터에 있는 행동의 Q는 올리는" 항을 TD 손실에 더한다.</p>
<div data-w="dv-cql"></div>
<div data-w="fx-cql"></div>
<p>$\alpha$가 충분히 크면 학습된 Q로 계산한 정책 가치가 실제 가치의 <strong>하한</strong>이 된다(Kumar et al. 2020의 정리). 가치의 하한을 최대화하므로 T7의 비관 원리를 가치 함수 수준에서 구현한 셈이다. 앙상블의 최솟값을 쓰는 SAC-N/EDAC(An et al. 2021)은 위 시뮬레이터의 $\bar Q - \alpha\sigma$와 같은 발상이다.</p>

<h2>처방 3: 데이터 밖을 아예 묻지 않기 (IQL)</h2>
<p>문제는 타깃을 계산할 때 $\max_{a'}$가 데이터 밖 행동을 <em>질의</em>하는 데서 생겼다. IQL(Kostrikov et al. 2021)은 질의 자체를 없앤다. 데이터에 있는 행동의 Q값만 보고, 그 분포의 <strong>상위 기대분위수(expectile)</strong>를 상태 가치로 쓴다.</p>
$$L_\tau(u) = |\tau - \mathbb{1}[u < 0]|\, u^2,\qquad V(s) \leftarrow \arg\min_v\, \mathbb{E}_{a\sim\mathcal{D}(s)}\big[L_\tau(Q(s,a) - v)\big]$$
<p>$\tau = 0.5$면 평균(SARSA처럼 행동 정책의 가치)이고, $\tau \to 1$이면 데이터 안의 최댓값(in-sample max)에 다가간다. 이후 $Q(s,a) \leftarrow r + \gamma V(s')$로 학습하고, 정책은 위 AWR 가중 BC $\exp\big((Q - V)/\beta\big)\log\pi(a\mid s)$로 뽑는다. 처음부터 끝까지 데이터 밖 행동을 한 번도 평가하지 않는다.</p>
<div data-w="expectile"></div>

<h2>무엇이 바뀌었나: 오프라인 RL 계보</h2>
<div class="table-wrap"><table class="t">
<thead><tr><th>방법</th><th>출발점</th><th>바꾼 것</th><th>제약을 거는 곳</th></tr></thead>
<tbody>
<tr><td>BC / %BC</td><td>지도학습</td><td>보상 무시(또는 상위만 필터)</td><td>정책 = 데이터</td></tr>
<tr><td>BCQ (2019)</td><td>DQN/DDPG</td><td>생성모델로 데이터 근처 행동만 후보</td><td>정책의 후보 집합</td></tr>
<tr><td>BEAR / BRAC (2019)</td><td>SAC</td><td>MMD 지지집합 제약 / KL 페널티</td><td>정책 분포</td></tr>
<tr><td>AWR / AWAC (2019–20)</td><td>정책 경사</td><td>KL 닫힌 해 → 가중 BC (T5)</td><td>정책 (암묵적)</td></tr>
<tr><td>CQL (2020)</td><td>SAC / QR-DQN</td><td>Q에 log-sum-exp 페널티</td><td>가치 함수</td></tr>
<tr><td>MOPO / MOReL (2020)</td><td>MBPO</td><td>모델 불확실성을 보상에서 차감 (T7)</td><td>모델 (<a href="#modelbased">16장</a>)</td></tr>
<tr><td>TD3+BC (2021)</td><td>TD3</td><td>액터 손실에 BC 항 하나</td><td>정책</td></tr>
<tr><td>SAC-N / EDAC (2021)</td><td>SAC</td><td>Q 앙상블의 최솟값 사용</td><td>가치 (불확실성)</td></tr>
<tr><td>IQL (2021)</td><td>SARSA + expectile</td><td>데이터 밖 행동 질의 제거</td><td>질의 자체</td></tr>
<tr><td>Decision Transformer (2021)</td><td>시퀀스 모델</td><td>리턴 조건부 BC</td><td>모방 (<a href="#sequence">17장</a>)</td></tr>
</tbody></table></div>
<p>오프라인 방법들은 결국 데이터 밖에서의 낙관을 어디서 막느냐로 갈린다. 정책을 묶거나(BCQ, TD3+BC, AWR), 가치를 누르거나(CQL, 앙상블), 데이터 밖을 아예 묻지 않는다(IQL).</p>

<h2>LLM 정렬 속의 오프라인 문제</h2>
<div class="grid2">
  <div class="card"><h4>보상모델 과최적화 = 외삽 착취</h4><p>보상모델(RM)은 고정된 선호 데이터로 학습한다. 정책이 RM 점수를 최적화하다가 RM이 학습하지 않은 영역의 응답으로 옮겨 가면, RM의 외삽 오차를 착취하게 된다. 위 시뮬레이터의 순진한 argmax와 같은 현상이다(<a href="#rlhf">19장</a>). RLHF의 KL 페널티는 BRAC식 정책 제약으로 읽을 수 있다.</p></div>
  <div class="card"><h4>정적 DPO = 오프라인, 반복 DPO = 온라인에 가까움</h4><p>고정된 선호 쌍으로 DPO를 돌리는 것은 오프라인 학습이다. 응답이 현재 정책에서 나온 것이 아니므로 분포 불일치가 있다. 현재 정책에서 응답을 새로 뽑아 RM이나 심판 모델로 라벨링하는 온라인/반복 DPO가 이 간극을 줄인다. on-policy 데이터가 중요하다는 실증 연구도 있다(예: Tajwar et al. 2024). 자세한 비교는 <a href="#dpo">20장</a>.</p></div>
  <div class="card"><h4>거절 샘플링 미세조정 = 필터링 BC</h4><p>여러 응답 중 점수가 높은 것만 골라 SFT하는 방법(RAFT, ReST의 Improve 단계)은 %BC와 같은 구조다. 데이터를 계속 새로 뽑으면 반복 오프라인 RL, 즉 탐색 후 증류(T9)가 된다(<a href="#memory">23장</a>).</p></div>
</div>
`,
    mount: {
      'ensemble-pess': mountEnsemble,
      'try-pick': mountPick,
      'step-pess': (el) => ui.walkthrough(el, {
        title: '조심하는 점수를 손으로 계산하기',
        caption: '두 행동이 있다. A는 기록이 300번이라 여러 모델의 예측이 거의 같다(평균 0.50, 흩어짐 0.05). B는 기록이 2번뿐이라 모델마다 예측이 제각각이다(평균 0.90, 흩어짐 0.40). 흩어짐은 앙상블 예측의 표준편차다. 칸에 답을 적고 "확인"을 누르면 계산식이 열린다.',
        steps: [
          { say: '평균만 보면 B(0.90)가 A(0.50)보다 훨씬 좋아 보인다. 이제 "평균 − α × 흩어짐"으로 조심스럽게 매긴다. α = 1일 때 A의 점수는?', ask: { answer: 0.45, tol: 0.005 }, calc: String.raw`0.50 - 1 \times 0.05 = 0.45` },
          { say: '같은 α = 1로 B의 점수는?', ask: { answer: 0.5, tol: 0.005 }, calc: String.raw`0.90 - 1 \times 0.40 = 0.50` },
          { say: '아직 B가 근소하게 앞선다. 더 조심해서 α = 2로 두면 B의 점수는?', ask: { answer: 0.1, tol: 0.005 }, calc: String.raw`0.90 - 2 \times 0.40 = 0.10`, note: 'A는 $0.50 - 2\\times0.05 = 0.40$이다. 이제 기록이 많은 A가 이긴다.' },
          { say: '반대로 다시 시도해 볼 수 있는 온라인 상황이라면 α를 음수로 두어 "모르는 쪽이 좋을지도 모른다"고 낙관한다. α = −1이면 B의 점수는?', ask: { answer: 1.3, tol: 0.005 }, calc: String.raw`0.90 - (-1) \times 0.40 = 1.30`, note: '같은 숫자에서 부호만 바꾸면 탐험(UCB, 05장)이 되고, 그대로 두면 오프라인 RL의 비관주의가 된다. 대전제 T7의 내용이다.' },
        ],
      }),
      'step-is': (el) => ui.walkthrough(el, {
        title: '중요도 가중치를 두 걸음짜리 기록으로 계산하기',
        caption: '기록을 모은 사람은 매 걸음 "왼쪽"과 "오른쪽"을 반반(0.5)씩 골랐다. 우리가 채점하고 싶은 새 방식은 오른쪽을 0.8, 왼쪽을 0.2의 확률로 고른다. 기록 속 두 걸음짜리 경로에 차례로 가중치를 매긴다.',
        steps: [
          { say: '한 걸음에서 "오른쪽"을 골랐다면, 이 선택의 가중치는 (새 방식이 고를 확률) ÷ (기록한 사람이 고른 확률)이다. 얼마일까?', ask: { answer: 1.6, tol: 0.005 }, calc: String.raw`\rho(\text{오른쪽}) = \frac{0.8}{0.5} = 1.6` },
          { say: '"왼쪽"을 골랐다면 가중치는?', ask: { answer: 0.4, tol: 0.005 }, calc: String.raw`\rho(\text{왼쪽}) = \frac{0.2}{0.5} = 0.4` },
          { say: '경로 전체의 가중치는 걸음마다의 가중치를 곱한 것이다. "오른쪽, 오른쪽" 경로의 가중치는?', ask: { answer: 2.56, tol: 0.005 }, calc: String.raw`W = 1.6 \times 1.6 = 2.56` },
          { say: '"왼쪽, 왼쪽" 경로의 가중치는?', ask: { answer: 0.16, tol: 0.005 }, calc: String.raw`W = 0.4 \times 0.4 = 0.16` },
          { say: '기록한 사람에게는 네 경로(오오, 오왼, 왼오, 왼왼)가 똑같이 1/4씩 나온다. 네 가중치의 평균을 낸다.', calc: String.raw`\tfrac14\,(2.56 + 0.64 + 0.64 + 0.16) = 1`, note: '평균은 정확히 1이다. 그래서 가중 평균은 공정하다(불편 추정). 하지만 가중치는 0.16에서 2.56까지 16배나 차이 난다. 걸음이 10개면 가장 큰 가중치와 가장 작은 가중치가 $4^{10}$배, 약 100만 배 차이 난다. 아래 시뮬레이터의 분산 폭발이 이 현상이다.' },
        ],
      }),
      'is-var': mountIS,
      'expectile': mountExpectile,
      'dv-is': (el) => ui.derivation(el, {
        title: '중요도 샘플링 추정량과 그 분산',
        easy: '다른 사람이 모은 기록으로 내 방식을 채점하려면, 선택마다 "내가 했을 확률 ÷ 그 사람이 한 확률"을 곱해 가중치를 준다. 평균은 정확히 맞지만, 걸음이 늘수록 이 곱이 걷잡을 수 없이 들쭉날쭉해진다.',
        steps: [
          { tex: String.raw`J(\pi) = \mathbb{E}_{\tau\sim p_\pi}\big[G(\tau)\big] = \sum_\tau p_\pi(\tau)\, G(\tau)`, why: '목표 정책 $\\pi$가 만든 궤적의 기대 리턴을 알고 싶다. 그러나 데이터는 $\\pi_\\beta$가 만들었다.' },
          { tex: String.raw`\frac{p_\pi(\tau)}{p_\beta(\tau)} = \frac{\rho_0(s_0)\prod_t \hl{\pi(a_t|s_t)}\,P(s_{t+1}|s_t,a_t)}{\rho_0(s_0)\prod_t \hl{\pi_\beta(a_t|s_t)}\,P(s_{t+1}|s_t,a_t)} = \prod_{t=0}^{H-1} \rho_t,\quad \rho_t = \frac{\pi(a_t|s_t)}{\pi_\beta(a_t|s_t)}`, why: '전이 확률 $P$가 분자와 분모에서 상쇄된다. 환경 모델을 몰라도 비율을 계산할 수 있다.' },
          { tex: String.raw`J(\pi) = \mathbb{E}_{\tau\sim p_\beta}\big[\hl{W(\tau)}\, G(\tau)\big],\qquad W(\tau) = \prod_t \rho_t`, why: '측도 변환. 데이터 궤적의 리턴에 가중치 $W$를 곱해 평균내면 불편 추정량이 된다.' },
          { tex: String.raw`\mathbb{E}_{\beta}[\rho_t] = \sum_a \pi_\beta(a)\frac{\pi(a)}{\pi_\beta(a)} = 1,\qquad \mathbb{E}_{\beta}[\rho_t^2] = \sum_a \frac{\pi(a)^2}{\pi_\beta(a)} = 1 + \chi^2(\pi\,\|\,\pi_\beta)`, why: '한 스텝 비율의 평균은 1이고, 제곱 평균은 1 + 카이제곱 발산이다. 두 정책이 다를수록 커진다.' },
          { tex: String.raw`\operatorname{Var}_\beta[W_H] = \mathbb{E}[W_H^2] - 1 = \hl{\big(1 + \chi^2(\pi\|\pi_\beta)\big)^H - 1}`, why: '스텝별 비율이 독립이면(상태와 무관한 단순 모델) 제곱 평균이 곱해진다. 분산은 지평 $H$에 따라 <strong>지수적</strong>으로 커진다. 이를 "지평의 저주"라 한다.' },
        ],
      }),
      'dv-awr': (el) => ui.derivation(el, {
        title: 'KL 제약 정책 개선에서 가중 BC로 (AWR / AWAC)',
        easy: '"점수를 올리되 기록 속 습관에서 멀어지지 말라"를 풀면, 기록 속 행동을 따라 하되 평균보다 좋았던 행동일수록 더 무겁게 따라 하는 방법이 된다. 기록에 없는 행동은 아예 고려하지 않는다.',
        steps: [
          { tex: String.raw`\max_{\pi}\; \mathbb{E}_{a\sim\pi(\cdot|s)}\big[A(s,a)\big] - \beta\,\mathrm{KL}\big(\pi(\cdot|s)\,\|\,\pi_\beta(\cdot|s)\big)`, why: 'advantage를 키우되 행동 정책에서 멀어지지 말라는 목표. 각 상태에서 따로 푼다.' },
          { tex: String.raw`\pi^*(a|s) = \frac{1}{Z(s)}\,\pi_\beta(a|s)\,\hl{\exp\!\big(A(s,a)/\beta\big)}`, why: '대전제 T5의 닫힌 해. 행동 정책을 $\\exp(A/\\beta)$로 재가중한 분포다. 데이터에 확률이 0인 행동은 여기서도 0이다.' },
          { tex: String.raw`\theta^* = \arg\min_\theta\; \mathbb{E}_{s}\Big[\mathrm{KL}\big(\pi^*(\cdot|s)\,\|\,\pi_\theta(\cdot|s)\big)\Big] = \arg\max_\theta\; \mathbb{E}_{s}\,\mathbb{E}_{a\sim\pi^*}\big[\log\pi_\theta(a|s)\big]`, why: '$\\pi^*$는 직접 계산할 수 없으므로 매개변수 정책으로 투영한다. 정방향 KL을 쓰면 최대우도가 된다.' },
          { tex: String.raw`= \arg\max_\theta\; \mathbb{E}_{(s,a)\sim\mathcal{D}}\Big[\hl{\tfrac{1}{Z(s)}\exp\!\big(A(s,a)/\beta\big)}\,\log\pi_\theta(a|s)\Big]`, why: '$\\pi^* = \\pi_\\beta \\cdot (\\text{가중치})$이므로 $\\pi^*$에서의 기댓값을 데이터 $\\mathcal{D}\\sim\\pi_\\beta$의 가중 평균으로 바꾼다. 데이터 밖 행동을 한 번도 평가하지 않는 <strong>가중 BC</strong>.' },
          { tex: String.raw`\beta \to \infty:\ \text{일반 BC},\qquad \beta \to 0:\ \text{데이터 중 } A \text{ 최대 행동만 모방}`, why: '온도 $\\beta$가 BC와 탐욕적 개선 사이를 보간한다. 실무에서는 가중치를 상한으로 자르고(예: 100) $Z(s)$는 무시하거나 배치 정규화한다.' },
        ],
      }),
      'dv-cql': (el) => ui.derivation(el, {
        title: 'CQL 손실 유도: 최악의 행동 분포에 거는 페널티에서 log-sum-exp로',
        easy: '모든 선택의 점수를 그냥 믿는 대신, 높게 매겨진 선택은 눌러 주고 기록에 실제로 있는 선택은 올려 준다. 그러면 기록 밖에서 부풀려진 점수만 벌을 받는다.',
        steps: [
          { tex: String.raw`\min_Q\; \tfrac12\,\mathbb{E}_{(s,a,s')\sim\mathcal{D}}\Big[\big(Q(s,a) - \hat{\mathcal{T}}\bar Q(s,a)\big)^2\Big]`, why: '출발점: 데이터 위의 보통 TD 회귀 손실.' },
          { tex: String.raw`+\;\alpha\Big(\hl{\max_{\mu}\,\mathbb{E}_{s\sim\mathcal{D},\,a\sim\mu(\cdot|s)}[Q(s,a)]} - \mathbb{E}_{(s,a)\sim\mathcal{D}}[Q(s,a)]\Big)`, why: 'Q가 가장 높게 나오는 행동 분포 $\\mu$에서의 Q는 누르고, 데이터 행동의 Q는 올린다. 데이터 안에서는 두 항이 비슷해 상쇄되고, 데이터 밖에서 부풀린 값만 벌을 받는다.' },
          { tex: String.raw`\max_\mu\; \mathbb{E}_{a\sim\mu}[Q(s,a)] + \hl{\mathcal{H}(\mu)} = \log\sum_a \exp Q(s,a),\qquad \mu^* = \operatorname{softmax}\big(Q(s,\cdot)\big)`, why: '$\\mu$에 엔트로피 정규화를 붙이면 최댓값이 닫힌 형태가 된다. 깁스 변분 원리, 즉 T5의 $\\beta=1$ 경우다.' },
          { tex: String.raw`\mathcal{L}_{\text{CQL}(\mathcal{H})} = \alpha\,\mathbb{E}_{s\sim\mathcal{D}}\Big[\hl{\log\sum_a e^{Q(s,a)}} - \mathbb{E}_{a\sim\pi_\beta(\cdot|s)}[Q(s,a)]\Big] + \tfrac12\,\mathbb{E}_{\mathcal{D}}\big[(Q - \hat{\mathcal{T}}\bar Q)^2\big]`, why: '최종 CQL(H) 손실. 연속 행동에서는 log-sum-exp를 중요도 샘플링으로 근사한다.' },
          { tex: String.raw`\frac{\partial\,\mathcal{L}_{\text{pen}}}{\partial Q(s,a)} = \alpha\Big(\hl{\operatorname{softmax}(Q)_a} - \hat\pi_\beta(a|s)\Big)`, why: '페널티 항의 기울기. Q가 높은데 데이터에 드문 행동일수록 강하게 눌린다. 데이터 분포와 softmax 분포가 같아지면 페널티 기울기는 0이다.' },
        ],
      }),
      'fx-cql': (el) => ui.formula(el, {
        title: 'CQL 페널티 해부',
        say: '{al|얼마나 조심할지 정하는 계수}만큼, {Es|기록에 나온 상황마다} {lse|가장 높게 매겨진 선택의 점수}는 눌러 내리고 {dat|기록에 실제로 있는 선택의 점수}는 끌어올린다. 그리고 평소처럼 {td|점수 예측이 한 걸음 뒤의 예측과 맞도록} 고친다.',
        tex: String.raw`\tm{al}{\alpha}\;\tm{Es}{\mathbb{E}_{s\sim\mathcal{D}}}\Big[\;\tm{lse}{\log\textstyle\sum_a e^{Q(s,a)}}\;-\;\tm{dat}{\mathbb{E}_{a\sim\pi_\beta(\cdot|s)}\,Q(s,a)}\;\Big]\;+\;\tm{td}{\tfrac12\,\mathbb{E}_{\mathcal{D}}\big[(Q-\hat{\mathcal{T}}\bar Q)^2\big]}`,
        terms: [
          { id: 'al', sym: '\\alpha', label: '보수성 계수', desc: '클수록 Q를 더 눌러 하한에 가깝게.', long: '너무 작으면 외삽 오차를 막지 못하고, 너무 크면 모든 Q가 행동 정책 가치 쪽으로 눌려 BC와 비슷해진다. 라그랑주 승수로 두어 "페널티 차이가 임계값 이하"가 되도록 자동 조절하는 변형도 있다.' },
          { id: 'Es', sym: '\\mathbb{E}_{s\\sim\\mathcal{D}}', label: '데이터 상태', desc: '상태는 데이터에서만 뽑는다.', long: '행동만 데이터 밖으로 나가는 것을 막는다. 상태 분포 이동은 정책이 데이터 근처에 머무르면 함께 억제된다.' },
          { id: 'lse', sym: '\\log\\sum_a e^{Q}', label: '부드러운 최댓값', desc: '모든 행동 중 가장 높게 평가된 쪽을 누른다.', long: '엔트로피로 정규화한 최악의 행동 분포에서의 기댓값이다. 기울기가 softmax(Q)이므로 함수근사기가 부풀린 행동이 정확히 눌린다. $\\max$를 매끄럽게 만든 것이라는 점에서 soft Q-learning(08, 14장)과 같은 연산이다.' },
          { id: 'dat', sym: '\\mathbb{E}_{a\\sim\\pi_\\beta}Q', label: '데이터 행동의 Q', desc: '데이터에 실제로 있는 행동은 올린다.', long: '이 항이 없으면 모든 Q가 무작정 낮아진다. 두 항의 차이로 데이터 밖에서 Q를 얼마나 부풀렸는지를 잰다.' },
          { id: 'td', sym: '\\text{TD}', label: '벨만 오차', desc: '보통의 TD 회귀 (타깃 네트워크 사용).' },
        ],
      }),
    },
    tacit: [
      { tag: 'algo', t: 'max 연산은 오차가 가장 큰 곳을 골라낸다',
        d: '<p>$\\arg\\max_a Q_\\theta(s,a)$는 수학적으로 "함수근사기의 입력 공간에서 출력이 가장 큰 곳을 찾는 최적화"다. 적대적 예제 탐색과 구조가 같다. 데이터 밖에서는 오차가 크고 부호도 무작위인데, 최적화기가 그중 가장 큰 양의 오차를 골라낸다. 그래서 오프라인 RL의 실패는 <strong>최적화가 오차를 체계적으로 찾아낸 결과</strong>다. 보상모델을 강하게 최적화할 때(19장), 모델 기반 계획기가 모델 오류를 이용할 때(16장)도 똑같다.</p>' },
      { tag: 'math', t: '데이터는 최적 정책 하나만 덮으면 된다',
        d: '<p>초기 오프라인 RL 이론은 데이터가 <em>모든</em> 정책의 방문 분포를 덮어야 한다는 집중 계수(concentrability) 가정을 썼다. 비관주의 기반 분석(Jin et al. 2021, Rashidinejad et al. 2021)은 이를 <strong>비교 대상 정책 하나</strong>의 커버리지로 약화했다. 실무에서는 데이터가 좁아도 좋은 행동 근처를 충분히 담고 있으면 된다는 뜻이다. 데이터 수집 전략을 설계할 때 "다양하게"보다 "좋은 정책 주변을 촘촘히"가 더 중요할 수 있다.</p>' },
      { tag: 'practice', t: 'IS를 쓰기 전에 유효 표본 수부터 확인한다',
        d: '<p>자기정규화 IS의 유효 표본 수 $\\mathrm{ESS} = (\\sum w)^2/\\sum w^2$이 전체의 몇 퍼센트 이하로 떨어지면 추정치는 사실상 소수의 궤적이 결정한다. 더 큰 문제는 위 시뮬레이터에서 보듯 <strong>표본 분산 자체를 믿을 수 없다</strong>는 점이다. 무거운 꼬리 때문에 드문 거대 가중치를 만나면 이론보다 훨씬 튀고, 아직 못 만났으면 이론보다 훨씬 작게 나온다(지평이 길수록 대개 후자). 분산 추정이 작고 안정적으로 보이는 것은 안전 신호가 아니다.</p>' },
      { tag: 'practice', t: '오프라인 RL의 하이퍼파라미터 튜닝은 그 자체로 OPE 문제다',
        d: '<p>논문이 보고하는 성능은 흔히 실제 환경 롤아웃으로 하이퍼파라미터를 골라 얻은 것이다. 진짜 오프라인 상황에서는 그 롤아웃이 불가능하므로, 튜닝을 위해 다시 오프-폴리시 평가가 필요하다(Paine et al. 2020). 실무에서 "알고리즘 A가 B보다 낫다"는 주장의 상당 부분은 이 선택 편향에 민감하다. 데이터 품질(무작위, 중간, 전문가, 혼합)이 알고리즘 선택보다 결과를 더 크게 좌우하는 경우도 많다.</p>' },
      { tag: 'math', t: 'AWR, CQL, KL 페널티 RLHF는 같은 식의 다른 투영이다',
        d: '<p>세 방법 모두 $\\pi^* \\propto \\pi_\\beta\\exp(\\cdot/\\beta)$(T5)라는 같은 이상적 해를 겨냥한다. AWR은 이 해를 정방향 KL로 투영(가중 MLE)하고, KL 페널티 RL은 역방향 KL로 직접 최적화하며, CQL은 그 분포의 log-partition 함수(log-sum-exp)를 Q의 페널티로 쓴다. "정책을 묶는가, 가치를 누르는가"는 같은 쌍대 문제의 원시/쌍대 변수 중 무엇을 다루느냐의 차이에 가깝다.</p>' },
      { tag: 'research', t: '오프라인으로 사전학습하고 온라인으로 미세조정할 때 생기는 하락',
        d: '<p>비관적으로 학습된 Q는 데이터 밖 행동을 과소평가한다. 온라인 미세조정을 시작하면 그 과소평가 때문에 초기에 성능이 오히려 떨어지거나 탐험이 막히는 현상이 보고되었다(Cal-QL: Nakamoto et al. 2023은 Q를 행동 정책 가치 이상으로 보정해 이를 완화했다). LLM에서도 SFT(오프라인 모방)에서 RL(온라인)로 넘어갈 때, 초기 정책의 분포가 보상 신호와 얼마나 맞는지가 학습 안정성을 크게 좌우한다.</p>' },
    ],
    quiz: [
      { q: 'DQN을 고정된 데이터셋에 그대로 적용했을 때 실패하는 가장 근본적인 이유는?', options: ['학습률이 너무 커서', '$\\max_{a\'}$가 데이터에 없는 행동의 외삽 오차를 고르고, 그 오차를 교정할 새 데이터가 들어오지 않아서', '리플레이 버퍼가 너무 작아서', '보상이 희소해서'], answer: 1,
        explain: '온라인에서는 과대추정된 행동을 실제로 시도해 교정할 수 있지만, 오프라인에서는 피드백 루프가 없다. $\\max$는 오차 중 큰 것을 골라 체계적으로 위로 편향시킨다.' },
      { q: '스텝별 $\\chi^2(\\pi\\|\\pi_\\beta) = 0.5$이고 지평이 $H=10$일 때 궤적 IS 가중치의 분산은 대략?', options: ['5', '약 10', '약 57', '약 1000'], answer: 2,
        explain: '$(1+0.5)^{10} - 1 = 1.5^{10} - 1 \\approx 57.7 - 1 \\approx 56.7$. $H=20$이면 약 3300으로 폭발한다.' },
      { q: 'IQL에서 expectile 파라미터 $\\tau \\to 1$일 때 $V(s)$는 무엇에 가까워지는가?', options: ['데이터 행동 Q값의 평균', '모든 행동에 걸친 $\\max_a Q(s,a)$', '데이터에 있는 행동의 Q값 중 최댓값', '0'], answer: 2,
        explain: '기대분위수는 데이터 표본만으로 계산하므로 $\\tau \\to 1$에서 표본 안의 최댓값에 수렴한다. 데이터 밖 행동은 질의하지 않는다.' },
      { q: 'AWR의 가중치 $\\exp(A/\\beta)$에서 $\\beta \\to \\infty$이면 알고리즘은 무엇이 되는가?', options: ['Q-learning', '일반 행동 복제(BC)', '무작위 정책', 'CQL'], answer: 1,
        explain: '모든 가중치가 1에 가까워져 보상 정보 없이 데이터를 그대로 모방한다. 반대로 $\\beta \\to 0$이면 데이터 중 advantage가 가장 큰 행동만 모방한다.' },
    ],
  });

  /* ---------- 공용: 작은 선형계 풀이 ---------- */
  function solve(A, b) {
    const n = b.length;
    const M = A.map((r, i) => r.concat([b[i]]));
    for (let c = 0; c < n; c++) {
      let p = c;
      for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
      const tmp = M[c]; M[c] = M[p]; M[p] = tmp;
      const piv = M[c][c] || 1e-12;
      for (let r = c + 1; r < n; r++) {
        const f = M[r][c] / piv;
        if (f === 0) continue;
        for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k];
      }
    }
    const x = new Array(n).fill(0);
    for (let r = n - 1; r >= 0; r--) {
      let s = M[r][n];
      for (let k = r + 1; k < n; k++) s -= M[r][k] * x[k];
      x[r] = s / (M[r][r] || 1e-12);
    }
    return x;
  }

  /* ---------- 앙상블 비관주의 ---------- */
  const qTrue = (a) => 0.9 * Math.exp(-((a - 1.6) ** 2) / 0.5) + 0.5 * Math.exp(-((a + 0.8) ** 2) / 0.8) - 0.06 * a * a;
  const GRID = sim.range(241).map((i) => -3 + i * 0.025);

  function makeData(seed, c, w, N, sig) {
    const r = sim.rng(seed);
    return sim.range(N).map(() => {
      const a = sim.clamp(c + w * r.normal(), -3, 3);
      return [a, qTrue(a) + sig * r.normal()];
    });
  }
  // 무작위 tanh 특징 + 부트스트랩 + 릿지 회귀: 서로 다르게 초기화한 신경망을 작게 흉내 낸 것
  function fitMember(seed, data, M, lam) {
    const r = sim.rng(seed);
    const W = [], U = [];
    for (let j = 0; j < M; j++) { W.push(r.normal() * 1.6); U.push(-3 + 6 * r()); }
    const phi = (a) => { const f = [1]; for (let j = 0; j < M; j++) f.push(Math.tanh(W[j] * (a - U[j]))); return f; };
    const D = M + 1;
    const A = sim.range(D).map(() => new Array(D).fill(0));
    const b = new Array(D).fill(0);
    for (let n = 0; n < data.length; n++) {
      const d = data[r.int(data.length)];
      const f = phi(d[0]);
      for (let p = 0; p < D; p++) { b[p] += f[p] * d[1]; for (let q = 0; q < D; q++) A[p][q] += f[p] * f[q]; }
    }
    for (let p = 0; p < D; p++) A[p][p] += lam;
    const w = solve(A, b);
    return GRID.map((a) => { const f = phi(a); let s = 0; for (let p = 0; p < D; p++) s += f[p] * w[p]; return s; });
  }
  function ensemble(seed, data, K) {
    const mem = sim.range(K).map((k) => fitMember(seed * 131 + k + 1, data, 24, 0.01));
    const mean = GRID.map((_, i) => sim.mean(mem.map((m) => m[i])));
    const sd = GRID.map((_, i) => sim.std(mem.map((m) => m[i])));
    return { mem, mean, sd };
  }
  function picks(E, alpha) {
    const ni = sim.argmax(E.mean);
    const pi = sim.argmax(E.mean.map((m, i) => m - alpha * E.sd[i]));
    return { ni, pi };
  }

  function mountEnsemble(el) {
    const p = ui.panel(el, { kind: 'SIM', title: '외삽 오차와 비관주의: 1차원 행동 공간에서의 앙상블 Q', caption: '슬라이더로 데이터의 위치와 폭을 바꾸면 그래프의 파란 점(평균만 믿는 선택)과 주황 점(조심하는 선택)이 움직인다. 점선은 실제 $Q(a)$(학습자는 모름), 초록 점은 데이터, 옅은 선은 앙상블 멤버, 파란 선은 평균 $\\bar Q$, 주황 점선은 비관적 하한 $\\bar Q - \\alpha\\sigma$이다. 슬라이더를 움직일 때마다 앙상블을 실제로 다시 학습한다.' });
    const ctr = ui.row(p.body);
    let seed = 29;
    const cS = ui.slider(ctr, { label: '데이터 중심', min: -2.5, max: 2.5, step: 0.1, value: -0.8, format: ui.fmt.f(1), onInput: upd });
    const wS = ui.slider(ctr, { label: '데이터 폭', min: 0.15, max: 2, step: 0.05, value: 0.45, format: ui.fmt.f(2), onInput: upd });
    const nS = ui.slider(ctr, { label: '데이터 수 N', min: 10, max: 200, step: 5, value: 50, format: ui.fmt.int, onInput: upd });
    const sgS = ui.slider(ctr, { label: '보상 잡음 σ', min: 0, max: 0.3, step: 0.01, value: 0.08, format: ui.fmt.f(2), onInput: upd });
    const kS = ui.slider(ctr, { label: '앙상블 K', min: 2, max: 16, step: 1, value: 8, format: ui.fmt.int, onInput: upd });
    const aS = ui.slider(ctr, { label: '비관 계수 α', min: -2, max: 3, step: 0.1, value: 1, format: ui.fmt.f(1), onInput: upd });
    const btns = ui.row(p.body, 'btns');
    ui.button(btns, '데이터 다시 뽑기', () => { seed++; upd(); }, { primary: true });
    const st = ui.stats(p.body, [
      { key: 'naive', label: '순진한 argmax: 행동 · 실제 Q', tone: 'accent' },
      { key: 'pred', label: '그 행동의 예측 $\\bar Q$' },
      { key: 'pess', label: '비관적 argmax: 행동 · 실제 Q', tone: 'signal' },
      { key: 'sup', label: '데이터 범위 안 최선의 실제 Q' },
      { key: 'best', label: '전 구간 진짜 최적 Q' },
      { key: 'avg', label: '20개 데이터셋 평균 실제 Q (순진 / 비관)' },
    ]);
    const chartEl = document.createElement('div');
    p.body.appendChild(chartEl);
    const chart = plot.line(chartEl, { height: 320, x: { min: -3, max: 3, label: '행동 a' }, y: { min: -1.4, max: 1.8, label: 'Q(a)' }, series: [], hoverDigits: 2 });
    const bestTrue = Math.max(...GRID.map(qTrue));
    let avgTimer = 0;

    function upd() {
      const c = cS.get(), w = wS.get(), N = nS.get(), sg = sgS.get(), K = kS.get(), al = aS.get();
      const data = makeData(seed, c, w, N, sg);
      const E = ensemble(seed, data, K);
      const { ni, pi } = picks(E, al);
      const lo = Math.min(...data.map((d) => d[0])), hi = Math.max(...data.map((d) => d[0]));
      const sup = Math.max(...GRID.filter((a) => a >= lo && a <= hi).map(qTrue));
      const series = E.mem.map((m, k) => ({ name: k === 0 ? '앙상블 멤버' : '', legend: k === 0, hover: false, color: 'c1', width: 1, opacity: 0.28, endDot: false, data: GRID.map((a, i) => [a, m[i]]) }));
      series.push({ name: '실제 Q (숨김)', color: 'muted', dash: '5 4', width: 2, endDot: false, data: GRID.map((a) => [a, qTrue(a)]) });
      series.push({ name: '데이터', type: 'scatter', color: 'c3', r: 2.6, data });
      series.push({ name: '평균 $\\bar Q$', color: 'c1', width: 2.6, endDot: false, data: GRID.map((a, i) => [a, E.mean[i]]), points: [[GRID[ni], E.mean[ni], 6]] });
      series.push({ name: '$\\bar Q - \\alpha\\sigma$', color: 'signal', width: 2, dash: '6 3', endDot: false, data: GRID.map((a, i) => [a, E.mean[i] - al * E.sd[i]]), points: [[GRID[pi], E.mean[pi] - al * E.sd[pi], 6]] });
      chart.update({ series, vlines: [{ x: GRID[ni], label: '순진', color: 'c1' }, { x: GRID[pi], label: '비관', color: 'signal' }] });
      st.set('naive', 'a=' + GRID[ni].toFixed(2) + ' · ' + qTrue(GRID[ni]).toFixed(3));
      st.set('pred', E.mean[ni].toFixed(3));
      st.set('pess', 'a=' + GRID[pi].toFixed(2) + ' · ' + qTrue(GRID[pi]).toFixed(3));
      st.set('sup', sup.toFixed(3));
      st.set('best', bestTrue.toFixed(3));
      st.set('avg', '계산 중');
      clearTimeout(avgTimer);
      avgTimer = setTimeout(() => {
        let qn = 0, qp = 0;
        for (let s = 0; s < 20; s++) {
          const d2 = makeData(1000 + s, c, w, N, sg);
          const E2 = ensemble(1000 + s, d2, K);
          const pk = picks(E2, al);
          qn += qTrue(GRID[pk.ni]); qp += qTrue(GRID[pk.pi]);
        }
        st.set('avg', (qn / 20).toFixed(3) + ' / ' + (qp / 20).toFixed(3));
      }, 150);
    }
    upd();
  }

  /* ---------- TRY: 기록만 보고 고르기 ---------- */
  function mountPick(el) {
    const p = ui.panel(el, { kind: 'TRY', title: '기록만 보고 최고의 행동 고르기', caption: '그래프를 클릭해 점수가 가장 높을 것 같은 행동 위치를 고르고 "정답 공개"를 누르면 진짜 점수 곡선이 나타난다. 가진 기록은 초록 점이 전부다.' });
    const rr = sim.rng(77);
    const narrow = sim.range(14).map(() => { const a = sim.clamp(-0.8 + 0.4 * rr.normal(), -3, 3); return [a, qTrue(a) + 0.04 * rr.normal()]; });
    // 오른쪽 두 점: 두 번만 측정되어 운이 크게 섞인 기록
    narrow.push([2.3, qTrue(2.3) + 0.85], [2.6, qTrue(2.6) + 0.95]);
    const wide = sim.range(30).map((i) => { const a = -2.8 + (5.6 * i) / 29; return [a, qTrue(a) + 0.04 * rr.normal()]; });
    const rounds = [
      { name: '1판: 기록이 한쪽에 몰려 있고, 오른쪽에 점이 두 개뿐', data: narrow },
      { name: '2판: 기록이 넓게 퍼져 있음', data: wide },
    ];
    let k = 0, pick = null, shown = false;
    const head = document.createElement('p');
    head.className = 'w-caption';
    head.style.fontWeight = '600';
    p.body.appendChild(head);
    const chartEl = document.createElement('div');
    chartEl.style.cursor = 'crosshair';
    p.body.appendChild(chartEl);
    const chart = plot.line(chartEl, { height: 280, x: { min: -3, max: 3, label: '행동 a (클릭해서 고르기)' }, y: { min: -1.2, max: 1.4, label: '점수' }, series: [], hover: false });
    const btns = ui.row(p.body, 'btns');
    const revealB = ui.button(btns, '정답 공개', () => { shown = true; draw(); }, { primary: true });
    ui.button(btns, '다음 판', () => { k = (k + 1) % rounds.length; pick = null; shown = false; draw(); });
    ui.button(btns, '이 판 다시', () => { pick = null; shown = false; draw(); });
    const st = ui.stats(p.body, [
      { key: 'me', label: '내 선택: 행동 · 실제 점수', tone: 'accent' },
      { key: 'naive', label: '평균만 믿는 모델의 선택' },
      { key: 'pess', label: '조심하는 모델의 선택 (α=1)', tone: 'signal' },
      { key: 'best', label: '진짜 최고' },
    ]);
    const fb = document.createElement('div');
    fb.className = 'fx-detail';
    p.body.appendChild(fb);
    const fits = [ensemble(501, narrow, 16), ensemble(510, wide, 16)];
    const bestA = GRID[sim.argmax(GRID.map(qTrue))];

    chartEl.addEventListener('click', (e) => {
      if (shown) return;
      const svg = chartEl.querySelector('svg');
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const W = svg.viewBox.baseVal.width;
      const px = ((e.clientX - rect.left) / rect.width) * W;
      pick = sim.clamp(-3 + ((px - 48) / (W - 64)) * 6, -3, 3);
      draw();
    });
    function draw() {
      const rd = rounds[k];
      head.textContent = rd.name;
      revealB.disabled = pick == null || shown;
      const series = [{ name: '기록', type: 'scatter', color: 'c3', r: 3.5, data: rd.data }];
      const vlines = [];
      if (pick != null) vlines.push({ x: pick, label: '내 선택', color: 'accent' });
      if (shown) {
        const E = fits[k];
        const { ni, pi } = picks(E, 1);
        series.unshift({ name: '진짜 점수 곡선', color: 'muted', dash: '5 4', width: 2, endDot: false, data: GRID.map((a) => [a, qTrue(a)]) });
        series.push({ name: '모델의 평균 예측', color: 'c1', width: 1.6, opacity: 0.7, endDot: false, data: GRID.map((a, i) => [a, E.mean[i]]) });
        series.push({ name: '세 선택의 실제 점수', type: 'scatter', color: 'signal', r: 5, data: [[pick, qTrue(pick)], [GRID[ni], qTrue(GRID[ni])], [GRID[pi], qTrue(GRID[pi])]] });
        st.set('me', 'a=' + pick.toFixed(2) + ' · ' + qTrue(pick).toFixed(2));
        st.set('naive', 'a=' + GRID[ni].toFixed(2) + ' · ' + qTrue(GRID[ni]).toFixed(2));
        st.set('pess', 'a=' + GRID[pi].toFixed(2) + ' · ' + qTrue(GRID[pi]).toFixed(2));
        st.set('best', 'a=' + bestA.toFixed(2) + ' · ' + qTrue(bestA).toFixed(2));
        const lo = Math.min(...rd.data.map((d) => d[0])), hi = Math.max(...rd.data.map((d) => d[0]));
        const near = rd.data.filter((d) => Math.abs(d[0] - pick) < 0.3).length;
        let msg;
        if (k === 0) {
          msg = near >= 4 ? '기록이 많은 곳에서 골랐다. 실제 점수가 예측과 거의 같다. 진짜 최고점(a≈1.6)은 기록이 없어 누구도 알 수 없었다.'
            : '기록이 거의 없는 곳을 골랐다. 오른쪽 두 점은 두 번만 측정되어 운이 크게 섞인 값이었고, 실제 점수는 훨씬 낮다. 평균만 믿는 모델도 같은 함정에 빠지기 쉽다.';
          msg += ' 조심하는 모델은 기록이 몰린 곳을 골라 안정적인 점수를 얻는다. 대신 기록 밖의 진짜 최고점은 영영 찾지 못한다.';
        } else {
          msg = '기록이 넓게 퍼져 있으면 기록만 보고도 진짜 최고점 근처를 찾을 수 있다. 평균만 믿는 선택과 조심하는 선택도 거의 일치한다. 결과를 가른 것은 알고리즘보다 기록이 덮는 범위다.';
        }
        if (pick < lo - 0.2 || pick > hi + 0.2) msg = '기록이 하나도 없는 바깥(' + lo.toFixed(1) + '보다 왼쪽이나 ' + hi.toFixed(1) + '보다 오른쪽)을 골랐다. 그곳의 점수는 순전히 짐작이다. ' + msg;
        fb.textContent = msg;
      } else {
        ['me', 'naive', 'pess', 'best'].forEach((key) => st.set(key, '공개 전'));
        if (pick != null) st.set('me', 'a=' + pick.toFixed(2));
        fb.textContent = pick == null ? '그래프 위 아무 곳이나 클릭하면 그 위치의 행동을 고른다.' : '다른 곳을 클릭하면 선택이 바뀐다. 마음을 정했으면 "정답 공개"를 누른다.';
      }
      chart.update({ series, vlines });
    }
    draw();
  }

  /* ---------- IS 분산 ---------- */
  function mountIS(el) {
    const p = ui.panel(el, { kind: 'SIM', title: '중요도 가중치 $W_H = \\prod_t \\rho_t$의 분산과 유효 표본 수', caption: '두 정책의 확률 슬라이더를 서로 멀어지게 움직이면, 왼쪽 그래프의 선은 가파르게 오르고 오른쪽의 유효 표본 비율은 빠르게 0으로 떨어진다. 두 행동 중 행동 1을 고를 확률이 행동 정책은 $b$, 목표 정책은 $q$이다. 행동 정책으로 궤적 N개를 실제로 샘플링해 지평별 가중치 분산(실선)과 이론값 $(1+\\chi^2)^H - 1$(점선)을 비교한다. 지평이 길어지면 표본 분산이 이론값 주변에서 크게 요동친다.' });
    const ctr = ui.row(p.body);
    const bS = ui.slider(ctr, { label: '행동 정책 $\\pi_\\beta(a{=}1)$', min: 0.05, max: 0.95, step: 0.01, value: 0.5, format: ui.fmt.f(2), onInput: upd });
    const qS = ui.slider(ctr, { label: '목표 정책 $\\pi(a{=}1)$', min: 0.05, max: 0.95, step: 0.01, value: 0.7, format: ui.fmt.f(2), onInput: upd });
    const nS = ui.slider(ctr, { label: '궤적 수 N', min: 200, max: 5000, step: 100, value: 2000, format: ui.fmt.int, onInput: upd });
    const st = ui.stats(p.body, [
      { key: 'chi', label: '스텝별 $\\chi^2(\\pi\\|\\pi_\\beta)$' },
      { key: 'v10', label: '$H=10$ 분산: 표본 / 이론', tone: 'accent' },
      { key: 'v30', label: '$H=30$ 분산: 표본 / 이론', tone: 'signal' },
      { key: 'ess', label: '$H=30$ 유효 표본 비율 ESS/N' },
    ]);
    const split = document.createElement('div');
    split.className = 'w-split';
    const L = document.createElement('div'), R = document.createElement('div');
    split.append(L, R);
    p.body.appendChild(split);
    const c1 = plot.line(L, { height: 250, x: { min: 1, max: 40, label: '지평 H' }, y: { label: 'log₁₀ Var[W_H]' }, series: [] });
    const c2 = plot.line(R, { height: 250, x: { min: 1, max: 40, label: '지평 H' }, y: { min: 0, max: 1, label: 'ESS / N' }, series: [] });
    const HM = 40;
    function upd() {
      const b = bS.get(), q = qS.get(), N = nS.get();
      const r = sim.rng(11);
      const chi = (q - b) * (q - b) / b + (q - b) * (q - b) / (1 - b);
      const s1 = new Array(HM + 1).fill(0), s2 = new Array(HM + 1).fill(0);
      const r1 = q / b, r0 = (1 - q) / (1 - b);
      for (let i = 0; i < N; i++) {
        let W = 1;
        for (let h = 1; h <= HM; h++) {
          W *= r() < b ? r1 : r0;
          s1[h] += W; s2[h] += W * W;
        }
      }
      const emp = [], th = [], ess = [], essT = [];
      for (let h = 1; h <= HM; h++) {
        const m1 = s1[h] / N, m2 = s2[h] / N;
        const v = Math.max(1e-6, m2 - m1 * m1);
        emp.push([h, Math.log10(v)]);
        const tv = Math.pow(1 + chi, h) - 1;
        th.push([h, Math.log10(Math.max(1e-6, tv))]);
        ess.push([h, (s1[h] * s1[h]) / (s2[h] * N)]);
        essT.push([h, 1 / Math.pow(1 + chi, h)]);
      }
      c1.update({ series: [
        { name: '표본 분산', color: 'c1', data: emp },
        { name: '이론 $(1+\\chi^2)^H-1$', color: 'signal', dash: '5 4', data: th },
      ] });
      c2.update({ series: [
        { name: '표본 ESS/N', color: 'c3', data: ess },
        { name: '이론 $1/(1+\\chi^2)^H$', color: 'signal', dash: '5 4', data: essT },
      ] });
      const f = (x) => (x >= 1000 ? x.toExponential(1) : x.toFixed(2));
      st.set('chi', chi.toFixed(3));
      st.set('v10', f(Math.pow(10, emp[9][1])) + ' / ' + f(Math.pow(1 + chi, 10) - 1));
      st.set('v30', f(Math.pow(10, emp[29][1])) + ' / ' + f(Math.pow(1 + chi, 30) - 1));
      st.set('ess', (ess[29][1] * 100).toFixed(1) + '%');
    }
    upd();
  }

  /* ---------- Expectile ---------- */
  function mountExpectile(el) {
    const p = ui.panel(el, { kind: 'CALC', title: 'Expectile 회귀: 평균에서 데이터 안 최댓값으로', caption: '$\\tau$ 슬라이더를 1 쪽으로 올리면 파란 세로선($m_\\tau$)이 오른쪽 끝의 최댓값으로 다가간다. 히스토그램은 한 상태에서 데이터에 있는 행동의 Q값 표본이다. 비대칭 제곱 손실 $L_\\tau$를 최소화하는 값을 반복 재가중으로 실제로 계산한다.' });
    const ctr = ui.row(p.body);
    const tS = ui.slider(ctr, { label: '$\\tau$', min: 0.5, max: 0.995, step: 0.005, value: 0.9, format: ui.fmt.f(3), onInput: upd });
    const st = ui.stats(p.body, [
      { key: 'mean', label: '평균 ($\\tau=0.5$)' },
      { key: 'exp', label: 'expectile $m_\\tau$', tone: 'accent' },
      { key: 'q', label: '같은 $\\tau$의 분위수' },
      { key: 'max', label: '표본 최댓값', tone: 'signal' },
    ]);
    const split = document.createElement('div');
    split.className = 'w-split';
    const L = document.createElement('div'), R = document.createElement('div');
    split.append(L, R);
    p.body.appendChild(split);
    const r = sim.rng(5);
    const xs = sim.range(400).map(() => {
      const u = r();
      if (u < 0.7) return 0.3 * r.normal();
      if (u < 0.95) return 0.8 + 0.2 * r.normal();
      return 1.6 + 0.15 * r.normal();
    });
    const sorted = xs.slice().sort((a, b) => a - b);
    const lo = sorted[0], hi = sorted[sorted.length - 1];
    const nb = 36, bw = (hi - lo) / nb;
    const counts = new Array(nb).fill(0);
    xs.forEach((x) => { counts[Math.min(nb - 1, Math.floor((x - lo) / bw))]++; });
    const hist = [];
    counts.forEach((c, i) => { hist.push([lo + i * bw, c]); hist.push([lo + (i + 1) * bw, c]); });
    const lossChart = plot.line(L, { height: 240, x: { min: -1.5, max: 1.5, label: '잔차 u = Q − v' }, y: { min: 0, max: 2.3, label: 'L_τ(u)' }, series: [] });
    const histChart = plot.line(R, { height: 240, x: { min: lo - 0.1, max: hi + 0.1, label: 'Q(s, a), a ∈ 데이터' }, y: { min: 0, label: '빈도' }, series: [] });
    function expectile(tau) {
      let m = sim.mean(xs);
      for (let it = 0; it < 200; it++) {
        let sw = 0, sx = 0;
        for (const x of xs) { const w = x >= m ? tau : 1 - tau; sw += w; sx += w * x; }
        const nm = sx / sw;
        if (Math.abs(nm - m) < 1e-10) { m = nm; break; }
        m = nm;
      }
      return m;
    }
    function upd() {
      const tau = tS.get();
      const m = expectile(tau);
      const lossF = (t) => (u) => Math.abs(t - (u < 0 ? 1 : 0)) * u * u;
      lossChart.update({ series: [
        { name: '$\\tau=0.5$ (MSE의 절반)', color: 'muted', dash: '4 4', data: plot.sample(lossF(0.5), -1.5, 1.5, 120), endDot: false },
        { name: '$L_\\tau$ (현재 τ)', color: 'c1', data: plot.sample(lossF(tau), -1.5, 1.5, 120), endDot: false },
      ] });
      histChart.update({
        series: [{ name: 'Q 표본 분포', color: 'c3', area: true, data: hist, endDot: false, hover: false }],
        vlines: [{ x: sim.mean(xs), label: '평균', color: 'muted' }, { x: m, label: 'm_τ', color: 'c1' }, { x: hi, label: '최댓값', color: 'signal' }],
      });
      st.set('mean', sim.mean(xs).toFixed(3));
      st.set('exp', m.toFixed(3));
      st.set('q', sorted[Math.min(sorted.length - 1, Math.floor(tau * sorted.length))].toFixed(3));
      st.set('max', hi.toFixed(3));
    }
    upd();
  }
})();
