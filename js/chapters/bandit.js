/* 05 밴딧과 탐험 */
(function () {
  const { ui, sim, plot } = RL;

  RL.chapter({
    id: 'bandit',
    title: '밴딧과 탐험',
    subtitle: '상태 전이가 없는 가장 작은 RL 문제. 모르는 것을 시도할지 아는 것을 쓸지라는 탐험-활용 딜레마를 regret이라는 숫자로 재고, 낙관(UCB)·확률 매칭(Thompson)·경사(softmax)라는 세 해법을 비교한다.',
    time: 35,
    level: '기초',
    prereq: ['mdp'],
    theses: ['T7', 'T3', 'T6'],
    easy: {
      hook: '처음 가 본 동네에서 맛집을 찾을 때, 아는 집에 또 갈지 새 집에 가 볼지가 이 장의 전부다.',
      intro: '<p>슬롯머신 네 대가 있다. 어느 기계가 잘 터지는지는 모른다. 레버를 30번 당길 수 있다. 좋아 보이는 기계만 계속 당기면 더 좋은 기계를 못 찾을 수 있고, 이것저것 다 당겨 보면 좋은 기계에서 벌 수 있던 점수를 놓친다.</p><p>"처음부터 가장 좋은 기계를 알았다면 벌었을 점수"와 내가 번 점수의 차이를 <strong>후회(regret)</strong>라고 부른다. 좋은 방법이란 후회가 천천히 늘어나는 방법이다.</p>',
      analogy: '식당의 별점과 리뷰 수를 함께 보는 것과 같다. 리뷰가 3개뿐인 별 4.5짜리 집은 실제로는 별 3일 수도 5일 수도 있다. UCB는 "잘 모르는 집은 좋은 쪽으로 쳐준다". 가 보고 별로면 다음부터 안 가면 되기 때문이다. 리뷰가 쌓일수록 이 덤은 줄어든다.',
      path: ['슬롯머신을 직접 30번 당기고, 내 후회를 컴퓨터 방법들과 비교한다', '"덤"이 붙은 점수를 손으로 계산해 다음에 당길 기계를 정해 본다', '여러 방법의 후회 곡선을 크게 돌려 비교한다', '챗봇 학습(RLHF)이 왜 같은 문제인지 본다'],
      recap: [
        '모르는 것을 시도하는 비용(탐험)과 아는 것을 쓰는 이득(활용) 사이의 균형이 이 문제의 핵심이다.',
        '덜 시도해 본 선택에 덤을 얹어 주는 방법(UCB)이나, 믿는 만큼 확률적으로 시도하는 방법(Thompson)이 후회를 천천히 늘린다.',
        '좋았던 선택의 확률을 평균보다 나았던 만큼 올리는 방법(gradient)은 나중에 배울 정책 경사의 가장 작은 버전이다.',
      ],
    },
    goals: [
      'regret을 정의하고 $R_T = \\sum_a \\Delta_a\\,\\mathbb{E}[N_a(T)]$로 분해할 수 있다.',
      'Hoeffding 부등식에서 UCB1의 보너스 항 $\\sqrt{2\\ln t / N_a}$를 유도할 수 있다.',
      'Thompson sampling의 사후분포가 어떻게 좁아지며 탐험을 줄이는지 관찰한다.',
      'gradient bandit 업데이트가 baseline을 가진 정책 경사(T3)임을 유도할 수 있다.',
      'RLHF가 왜 "문맥 밴딧"으로 정식화되는지 설명할 수 있다.',
    ],
    html: String.raw`
<p>슬롯머신(one-armed bandit) $K$대가 있다. 각 머신 $a$는 알 수 없는 평균 $\mu_a$의 보상을 준다. $T$번 당길 수 있을 때 총 보상을 최대화하려면? 상태가 하나뿐인 MDP($\gamma$ 무관, 전이 없음)이지만 RL의 가장 본질적인 어려움, 즉 <strong>탐험과 활용의 딜레마</strong>가 이미 여기 다 들어 있다. 지금까지 가장 좋아 보이는 팔만 당기면(활용) 더 좋은 팔을 영영 못 찾을 수 있고, 계속 새 팔을 시도하면(탐험) 아는 좋은 팔의 보상을 놓친다.</p>

<h2>Regret: 탐험의 비용을 재는 단위</h2>
<p>최적 팔의 평균을 $\mu^* = \max_a \mu_a$, 팔 $a$의 간격을 $\Delta_a = \mu^* - \mu_a$라 하자. 처음부터 최적 팔을 알았다면 얻었을 보상과의 차이가 <strong>regret</strong>이다.</p>
<p>정의를 따지기 전에 직접 해 보자. 아래 기계 네 대를 30번 당긴 뒤, 같은 기계에서 컴퓨터 방법들이 평균적으로 얼마나 후회했는지와 비교한다.</p>
<div data-w="try-slots"></div>
<div data-w="dv-regret"></div>
<p>regret 분해식이 말하는 것은 단순하다. <strong>나쁜 팔을 몇 번 당기느냐가 전부</strong>다. 좋은 알고리즘은 나쁜 팔을 "충분히 확인할 만큼만" 당긴다. 그 "충분히"의 하한이 있다.</p>
<div class="key"><span class="label">Lai–Robbins 하한 (1985)</span>모든 "합리적인"(어떤 문제에서도 regret이 $o(T^p)$인) 알고리즘은 최적이 아닌 팔에 대해 $\displaystyle\liminf_{T\to\infty}\frac{\mathbb{E}[N_a(T)]}{\ln T} \ge \frac{1}{\mathrm{KL}(\mu_a\,\|\,\mu^*)}$를 만족한다. 즉 regret은 최소 $\Omega(\ln T)$로 자란다. 두 팔의 분포가 비슷할수록(KL이 작을수록) 구분에 더 많은 시도가 필요하다.</div>

<h2>세 가지 해법의 철학</h2>
<div class="grid2">
  <div class="card"><h4>ε-greedy: 가끔 무작위로</h4><p>확률 $\varepsilon$로 아무 팔이나, 나머지는 추정 평균이 가장 큰 팔. 단순하고 강건하지만 $\varepsilon$가 고정이면 나쁜 팔을 계속 일정 비율로 당기므로 regret이 <strong>선형</strong>으로 자란다.</p></div>
  <div class="card"><h4>UCB: 불확실하면 낙관하라</h4><p>"그럴듯한 범위 안에서 가장 좋은 경우"를 가정하고 그 팔을 당긴다. 낙관이 틀렸다면 당겨 본 결과가 그 착각을 고쳐 준다. 대전제 T7의 온라인 쪽.</p></div>
  <div class="card"><h4>Thompson sampling: 믿는 만큼 시도하라</h4><p>사후분포에서 각 팔의 평균을 하나씩 뽑아 그중 최댓값의 팔을 당긴다. "이 팔이 최적일 확률"만큼 그 팔을 고르는 확률 매칭이다(Thompson 1933).</p></div>
  <div class="card"><h4>Gradient bandit: 선호도를 미분하라</h4><p>팔마다 선호도 $H_a$를 두고 $\pi=\operatorname{softmax}(H)$로 고른 뒤, 기대 보상의 경사를 따라 $H$를 올린다. 정책 경사(<a href="#pg">11장</a>)의 가장 작은 버전.</p></div>
</div>

<h3>UCB1 유도</h3>
<div data-w="step-ucb"></div>
<div data-w="dv-ucb"></div>
<div data-w="fx-ucb"></div>

<h2>시뮬레이터: regret 곡선 비교</h2>
<p>알고리즘들을 같은 밴딧에서 여러 번 돌려 평균한 <em>기대 누적 regret</em>(실제 보상 대신 $\Delta_{a_t}$의 합, pseudo-regret)과 최적 팔을 고른 비율이다. 체크박스로 Lai–Robbins 점근식 $\sum_a \frac{\Delta_a}{\mathrm{KL}(\mu_a\|\mu^*)}\ln t$를 겹쳐 볼 수 있다. 이 식은 $T\to\infty$에서의 하한이라, 간격이 작은 "근접" 문제에서는 $T=1000$ 정도로는 아직 실제 regret보다 위에 있다. 그만큼 이 문제의 "점근"은 멀다는 뜻이다.</p>
<div data-w="bandit-sim"></div>
<ul>
  <li><strong>ε-greedy의 직선:</strong> 고정 $\varepsilon$이면 결국 기울기 $\varepsilon\cdot\bar\Delta$의 직선이 된다. 초반에는 빠르지만 길게 보면 진다.</li>
  <li><strong>UCB와 Thompson의 로그 곡선:</strong> 길게 보면 점점 눕는다. 다만 UCB1의 이론 상수 $c=\sqrt2$는 보수적이라, 간격이 작은 "근접" 프리셋의 $T=1000$에서는 오히려 ε-greedy보다 regret이 클 수 있다. $c$를 0.5 근처로 줄이거나 "쉬움" 프리셋으로 바꿔 비교해 보라. 이론 상한이 보장하는 것은 증가 속도이지 유한 $T$에서의 순위가 아니다.</li>
  <li><strong>탐욕(greedy)의 함정:</strong> 운 나쁘게 첫 보상이 좋은 나쁜 팔에 고착되면 영원히 못 빠져나온다. 평균은 직선이지만 실행마다 극단적으로 갈린다.</li>
  <li><strong>baseline의 효과:</strong> gradient bandit에서 baseline을 끄면 보상이 항상 0 이상이라 당긴 팔이 늘 강화되어 학습이 느리고 불안정해진다(T6, <a href="#pg">11장</a>).</li>
</ul>

<h2>Thompson sampling의 사후분포</h2>
<p>베르누이 보상에 Beta(1,1) 사전분포를 두면 사후분포는 Beta(1+성공, 1+실패)로 닫힌 형태다. 매 스텝 각 팔의 분포에서 하나씩 뽑아(점) 가장 큰 팔을 당긴다. 좋은 팔의 분포는 좁고 높아지고, 나쁜 팔의 분포는 넓은 채로 왼쪽에 남는다. 나쁜 팔이 여전히 가끔 뽑히는 이유는 그 넓은 꼬리가 최적 팔의 값을 넘을 확률이 0이 아니기 때문이다. 그 확률이 곧 탐험의 양이다.</p>
<div data-w="ts-posterior"></div>

<h2>Gradient bandit은 정책 경사다</h2>
<p>gradient bandit의 업데이트는 Sutton & Barto가 경험적 규칙처럼 소개하지만, 사실 기대 보상 $J(H) = \sum_a \pi_H(a)\mu_a$에 대한 확률적 경사 상승을 정확히 구현한 것이다. 이 유도는 그대로 REINFORCE(11장)와 GRPO의 그룹 baseline(<a href="#reasoning">21장</a>)으로 이어진다.</p>
<div data-w="dv-grad"></div>

<h2>문맥 밴딧, 그리고 RLHF</h2>
<p>매 라운드 문맥 $x_t$(사용자 특성, 질문)를 보고 팔을 고르는 문제를 <strong>문맥 밴딧(contextual bandit)</strong>이라 한다. 상태는 있지만 행동이 다음 상태에 영향을 주지 않는 MDP다. LinUCB(Li et al. 2010)는 보상을 $\theta^\top x_{t,a}$로 선형 모델링하고 $\hat\theta^\top x + \alpha\sqrt{x^\top A^{-1}x}$로 낙관한다. 뉴스 추천과 광고가 대표적 응용이다.</p>
<p><strong>RLHF는 문맥 밴딧이다.</strong> InstructGPT(Ouyang et al. 2022)는 PPO 단계의 환경을 "무작위 프롬프트를 주고 응답을 기대하며, 보상을 준 뒤 에피소드가 끝나는 밴딧 환경"으로 기술한다. 프롬프트가 문맥, 응답 전체가 하나의 행동, 보상모델 점수가 보상이다. 그렇다면 탐험은 어디서 오는가?</p>
<ul>
  <li><strong>샘플링 온도:</strong> 정책 자체의 확률성(softmax)이 ε-greedy나 gradient bandit의 탐험을 대신한다. 엔트로피가 붕괴하면 탐험도 멈춘다(<a href="#reasoning">21장</a>의 엔트로피 붕괴, DAPO의 clip-higher).</li>
  <li><strong>프롬프트당 여러 샘플:</strong> GRPO·RLOO는 한 프롬프트에 응답을 $G$개 뽑아 그 평균을 baseline으로 쓴다. 위 gradient bandit의 baseline을 "같은 문맥 안의 다른 팔들"로 추정하는 셈이다.</li>
  <li><strong>pass@k와 Best-of-N:</strong> $k$번 당겨 하나라도 성공하면 되는 문제는 regret이 아니라 "탐험의 폭"을 잰다(<a href="#test-time">22장</a>).</li>
</ul>

<h2>파생 알고리즘 지도</h2>
<div class="table-wrap"><table class="t">
<thead><tr><th>알고리즘</th><th>무엇이 바뀌었나</th><th>regret</th></tr></thead>
<tbody>
<tr><td>ε-greedy</td><td>기준: 확률 ε로 균등 탐험</td><td>고정 ε: 선형 / $\varepsilon_t\propto 1/t$: 로그(간격을 알 때)</td></tr>
<tr><td>낙관적 초기값</td><td>초기 추정치를 크게 → 실망하면서 자연스레 탐험</td><td>초기 탐험만, 비정상 문제엔 약함</td></tr>
<tr><td>UCB1 (Auer et al. 2002)</td><td>Hoeffding 신뢰상한으로 낙관</td><td>$O\big(\sum_a \frac{\ln T}{\Delta_a}\big)$</td></tr>
<tr><td>KL-UCB (Garivier & Cappé 2011)</td><td>Hoeffding → KL 신뢰구간</td><td>Lai–Robbins 상수까지 최적</td></tr>
<tr><td>Thompson sampling</td><td>신뢰상한 → 사후 샘플(확률 매칭)</td><td>베르누이에서 점근 최적 (Kaufmann et al. 2012; Agrawal & Goyal 2012)</td></tr>
<tr><td>EXP3 (Auer et al. 2002)</td><td>확률적 보상 → 적대적 보상, 지수 가중</td><td>$O(\sqrt{TK\ln K})$</td></tr>
<tr><td>Gradient bandit</td><td>가치 추정 → 정책 직접 최적화</td><td>일반 보장 약함, 정책 경사의 원형</td></tr>
<tr><td>LinUCB, 신경망 밴딧</td><td>문맥 추가, 보상의 함수근사</td><td>차원 $d$에 대해 $\tilde O(d\sqrt T)$ (선형)</td></tr>
<tr><td>PUCT (AlphaZero)</td><td>UCB 보너스에 정책 사전확률 곱하기</td><td>트리 탐색의 행동 선택 (<a href="#modelbased">16장</a>)</td></tr>
</tbody></table></div>
`,
    mount: {
      'dv-regret': (el) => ui.derivation(el, {
        title: 'regret 분해',
        easy: '후회는 결국 "나쁜 기계를 몇 번 당겼나 × 그 기계가 최고 기계보다 얼마나 나쁜가"를 기계마다 더한 것이다. 좋은 방법은 나쁜 기계를 확인할 만큼만 당긴다.',
        steps: [
          { tex: String.raw`R_T = T\mu^* - \mathbb{E}\Big[\sum_{t=1}^{T} r_t\Big]`, why: '정의: 최적 팔만 당겼을 때의 기대 보상과 실제 기대 보상의 차이.' },
          { tex: String.raw`= \sum_{t=1}^{T}\mathbb{E}\big[\mu^* - \mu_{a_t}\big] = \mathbb{E}\Big[\sum_{t=1}^{T} \hl{\Delta_{a_t}}\Big]`, why: '$a_t$가 주어지면 $\\mathbb{E}[r_t|a_t]=\\mu_{a_t}$ (반복 기댓값의 법칙).' },
          { tex: String.raw`= \sum_{a} \Delta_a\,\mathbb{E}\Big[\sum_{t=1}^{T}\mathbf{1}[a_t = a]\Big] = \boxed{\sum_{a}\Delta_a\,\hl{\mathbb{E}[N_a(T)]}}`, why: '시간에 대한 합을 팔에 대한 합으로 바꾼다. $N_a(T)$는 팔 $a$를 당긴 횟수. 최적 팔은 $\\Delta=0$이라 기여하지 않는다.' },
        ],
      }),
      'dv-ucb': (el) => ui.derivation(el, {
        title: 'Hoeffding에서 UCB1 보너스로',
        easy: '평균을 n번 재면 오차는 대략 $1/\\sqrt{n}$ 크기로 줄어든다. 그래서 "평균 + 오차 크기만큼의 덤"을 쓰면, 덜 당겨 본 기계일수록 덤이 커서 한 번은 확인하게 되고, 확인이 쌓이면 덤이 줄어 나쁜 기계는 자연스럽게 밀려난다.',
        caption: '"다음 단계"를 눌러 한 줄씩 펼쳐 보라. 보상이 $[0,1]$에 있고 팔 $a$를 $n$번 당겨 표본평균 $\\hat\\mu_a$를 얻었다고 하자.',
        steps: [
          { tex: String.raw`\Pr\big(\mu_a \ge \hat\mu_a + u\big) \le e^{-2nu^2}`, why: 'Hoeffding 부등식(한쪽). 참 평균이 표본평균보다 $u$ 이상 클 확률은 지수적으로 작다.' },
          { tex: String.raw`e^{-2nu^2} = \hl{t^{-4}} \;\Rightarrow\; u = \sqrt{\frac{2\ln t}{n}}`, why: '실패 확률을 시간에 따라 줄인다($t^{-4}$은 Auer et al.의 선택). 시간이 갈수록 더 확실한 상한을 요구한다.' },
          { tex: String.raw`\mathrm{UCB}_a(t) = \hat\mu_a + \sqrt{\frac{2\ln t}{N_a(t)}}`, why: '확률 $1-t^{-4}$ 이상으로 $\\mu_a \\le \\mathrm{UCB}_a(t)$. "그럴듯한 최선"을 가정해 이 값이 가장 큰 팔을 당긴다.' },
          { tex: String.raw`N_a(T) \lesssim \frac{8\ln T}{\Delta_a^2}\;\Rightarrow\; R_T \lesssim \sum_{a:\Delta_a>0} \frac{8\ln T}{\Delta_a} + O(1)`, why: '나쁜 팔의 보너스가 간격의 절반 아래로 줄면($\\sqrt{2\\ln t/N_a} < \\Delta_a/2$) 더는 선택되지 않는다. 그때까지의 횟수가 $\\ln T/\\Delta_a^2$ 규모이고, 여기에 $\\Delta_a$를 곱하면 regret 상한이 된다(Auer, Cesa-Bianchi, Fischer 2002).' },
        ],
      }),
      'fx-ucb': (el) => ui.formula(el, {
        title: 'UCB 행동 선택',
        say: '{a|이번에 당길 기계}는 각 기계의 {mu|지금까지 평균 점수}에 덤을 더한 값이 가장 큰 기계다. 덤은 {c|얼마나 모험할지 정하는 숫자}에 비례하고, {ln|전체 시도 횟수}가 늘면 조금씩 커지며, {N|그 기계를 당겨 본 횟수}가 늘면 줄어든다.',
        tex: String.raw`\tm{a}{a_t} = \argmax_a\Big[\ \tm{mu}{\hat\mu_a}\ +\ \tm{c}{c}\,\sqrt{\frac{\tm{ln}{\ln t}}{\tm{N}{N_a(t)}}}\ \Big]`,
        terms: [
          { id: 'a', sym: 'a_t', label: '선택한 팔', desc: '결정적으로 정해진다. 무작위성 없음.', long: 'UCB는 결정적 알고리즘이다. 같은 기록이면 같은 행동을 한다. 그래서 배치·지연 피드백 환경에서는 같은 팔을 몰아 당기는 문제가 있고, Thompson sampling이 더 강건한 경우가 많다.' },
          { id: 'mu', sym: '\\hat\\mu_a', label: '활용 항', desc: '지금까지의 표본평균.' },
          { id: 'c', sym: 'c', label: '탐험 계수', desc: '이론값 √2. 실전에서는 튜닝 대상.', long: '보상 범위가 $[0,1]$이 아니면 스케일에 맞게 키워야 한다. 너무 크면 과탐험, 너무 작으면 탐욕에 가까워진다. 아래 시뮬레이터에서 바꿔 보라.' },
          { id: 'ln', sym: '\\ln t', label: '시간 항', desc: '천천히 커져서, 오래 안 당긴 팔을 결국 다시 확인하게 한다.', long: '한 번도 확인하지 않은 팔의 보너스는 시간이 지나면 반드시 다시 커진다. 그래서 UCB는 어떤 팔도 영원히 버리지 않는다(탐욕과의 차이).' },
          { id: 'N', sym: 'N_a(t)', label: '시도 횟수', desc: '많이 당길수록 보너스가 1/√N으로 줄어든다.', easy: '4번 당기면 덤이 절반, 100번 당기면 10분의 1이 된다.', long: '$1/\\sqrt{N}$은 표본평균의 표준오차 크기다. 같은 구조가 AlphaZero의 PUCT($c\\,P(a)\\sqrt{N}/(1+N_a)$), 카운트 기반 탐험 보너스에 반복해 나타난다.' },
        ],
      }),
      'dv-grad': (el) => ui.derivation(el, {
        title: 'Gradient bandit = baseline 있는 확률적 경사 상승',
        easy: '고른 기계의 점수가 평균보다 좋으면 그 기계의 선호를 올리고 나머지는 조금씩 내린다. 평균보다 나쁘면 반대로 한다. 이 단순한 규칙이 정확히 "기대 점수를 올리는 방향"이라는 것을 보이는 계산이다.',
        caption: '"다음 단계"를 눌러 한 줄씩 펼쳐 보라. 설정: $\\pi(a) = e^{H_a}/\\sum_b e^{H_b}$, 목표 $J = \\mathbb{E}_{A\\sim\\pi}[\\mu_A] = \\sum_x \\pi(x)\\mu_x$.',
        steps: [
          { tex: String.raw`\frac{\partial J}{\partial H_a} = \sum_x \mu_x\,\frac{\partial \pi(x)}{\partial H_a} = \sum_x \big(\mu_x - \hl{B}\big)\,\frac{\partial \pi(x)}{\partial H_a}`, why: '$\\sum_x \\pi(x)=1$이므로 $\\sum_x \\partial\\pi(x)/\\partial H_a = 0$. 아무 상수 $B$(baseline)를 빼도 경사는 그대로다.' },
          { tex: String.raw`= \sum_x \pi(x)\big(\mu_x - B\big)\,\hl{\frac{\partial \log\pi(x)}{\partial H_a}} = \mathbb{E}_{A\sim\pi}\Big[(\mu_A - B)\,\frac{\partial\log\pi(A)}{\partial H_a}\Big]`, why: '로그-미분 트릭(T3): $\\partial\\pi = \\pi\\,\\partial\\log\\pi$. 합이 기댓값이 되어 샘플로 추정할 수 있다.' },
          { tex: String.raw`\frac{\partial\log\pi(A)}{\partial H_a} = \mathbf{1}[a = A] - \pi(a)`, why: 'softmax의 로그 미분.' },
          { tex: String.raw`\mathbb{E}\big[(\hl{R_t} - \bar R_t)(\mathbf{1}[a=A_t] - \pi_t(a))\big] = \frac{\partial J}{\partial H_a}`, why: '$\\mu_A$ 자리에 실제 보상 $R_t$를 넣어도 기댓값은 같다($\\mathbb{E}[R_t|A_t]=\\mu_{A_t}$). baseline으로 평균 보상 $\\bar R_t$를 쓴다.' },
          { tex: String.raw`\boxed{H_a \leftarrow H_a + \alpha\,(R_t - \bar R_t)\,(\mathbf{1}[a=A_t] - \pi_t(a))}`, why: '이것이 gradient bandit 업데이트. 고른 팔은 보상이 평균보다 크면 올라가고, 나머지는 반대로 움직인다. REINFORCE with baseline과 같은 식이다(11장).' },
        ],
      }),
      'bandit-sim': mountBanditSim,
      'ts-posterior': mountPosterior,
      'try-slots': mountSlots,
      'step-ucb': (el) => ui.walkthrough(el, {
        title: '덤을 붙여 다음 기계 고르기 (UCB 손계산)',
        caption: '칸에 답을 적고 "확인"을 누르면 계산식이 열린다. 지금까지 10번 당겼다. 기계 A는 5번 당겨 평균 0.6, B는 4번 당겨 평균 0.5, C는 1번 당겨 꽝(평균 0)이다. 계산을 쉽게 하려고 탐험 계수 $c=1$, $\\ln 10 \\approx 2.3$을 쓴다.',
        steps: [
          { say: '평균만 보면 A가 1등, C가 꼴찌다. 이제 덤을 붙인다. A의 덤은 $\\sqrt{2.3 / 5}$이다. 얼마일까? (소수 둘째 자리)', ask: { answer: 0.68, tol: 0.011 }, calc: String.raw`\sqrt{2.3/5} = \sqrt{0.46} \approx 0.68` },
          { say: 'A의 UCB 점수(평균 + 덤)는?', ask: { answer: 1.28, tol: 0.015 }, calc: String.raw`0.6 + 0.68 = 1.28` },
          { say: 'B의 덤은 $\\sqrt{2.3/4} \\approx 0.76$이라 점수는 $0.5 + 0.76 = 1.26$이다. 이제 C다. 한 번밖에 안 당겼으니 덤이 크다. C의 점수 $0 + \\sqrt{2.3/1}$은?', ask: { answer: 1.52, tol: 0.015 }, calc: String.raw`0 + \sqrt{2.3} \approx 1.52` },
          { say: '세 점수 1.28, 1.26, 1.52 중 가장 큰 C를 당긴다. 평균은 꼴찌지만 "한 번만 해 봐서 아직 모른다"는 덤 덕분에 한 번 더 확인하는 것이다.', calc: String.raw`\text{A } 1.28,\quad \text{B } 1.26,\quad \text{C } \mathbf{1.52}\ \Rightarrow\ \text{C를 당긴다}` },
          { say: 'C를 당겼더니 또 꽝이었다. 이제 C는 2번 당겨 평균 0이고, 전체는 11번이다($\\ln 11 \\approx 2.4$). C의 새 점수 $0 + \\sqrt{2.4/2}$는?', ask: { answer: 1.1, tol: 0.015 }, calc: String.raw`\text{C: } 0 + \sqrt{2.4/2} \approx 1.10 \;<\; \text{A: } 0.6 + \sqrt{2.4/5} \approx 1.29`, note: '확인할수록 덤이 줄어 C는 A보다 낮아졌다. 다음 번엔 A를 당긴다. 나쁜 기계는 이렇게 "확인할 만큼만" 당겨지고 자연스럽게 밀려난다.' },
        ],
      }),
    },
    tacit: [
      { tag: 'math', t: '두 regret 체제: $\\ln T/\\Delta$와 $\\sqrt{KT}$',
        d: '<p>"UCB는 로그 regret"이라는 말은 간격 $\\Delta$가 고정된 <em>문제 의존</em> 상한이다. 간격을 적대적으로 고르면 $\\Delta \\approx \\sqrt{K/T}$에서 $\\ln T/\\Delta$가 $\\sqrt{KT}$ 규모가 되며, 최악의 경우(minimax) regret은 $\\Omega(\\sqrt{KT})$를 피할 수 없다. 이론 논문의 regret 결과를 읽을 때 첫 질문은 "어느 체제의 상한인가"다. 쉬운 문제를 빨리 푸는 것과 어려운 문제에서 덜 망하는 것은 다른 성질이다.</p>' },
      { tag: 'math', t: '낙관이 맞는 이유는 오류의 비대칭성이다',
        d: '<p>좋은 팔을 나쁘다고 잘못 믿으면(비관) 그 팔을 다시 당기지 않으므로 오류가 <strong>영원히 고쳐지지 않는다</strong>. 나쁜 팔을 좋다고 잘못 믿으면(낙관) 당겨 보는 순간 데이터가 오류를 고친다. 그래서 데이터를 더 모을 수 있으면 낙관이 자기교정적이다. 반대로 더 모을 수 없는 오프라인 RL에서는 낙관의 오류가 고쳐지지 않으므로 비관(LCB, CQL)을 쓴다. 이 한 쌍이 대전제 T7이다(<a href="#offline">15장</a>).</p>' },
      { tag: 'algo', t: '실전에서는 Thompson이 UCB보다 자주 이긴다',
        d: '<p>Chapelle & Li(2011)는 광고·뉴스 추천 실험에서 Thompson sampling이 UCB 계열과 같거나 더 나음을 보였다. 이유: (1) 무작위성 덕분에 지연·배치 피드백에서 같은 팔에 몰리지 않는다, (2) 사전분포로 도메인 지식을 넣기 쉽다, (3) 정확한 신뢰구간 대신 근사 사후(앙상블, 부트스트랩)로도 동작한다. 딥 RL의 Bootstrapped DQN(Osband et al. 2016)과 앙상블 기반 탐험이 "신경망 Thompson sampling"이다.</p>' },
      { tag: 'algo', t: 'baseline은 기대값을 안 바꾸고 분산만 바꾼다, 그리고 그게 전부다',
        d: '<p>gradient bandit에서 $B$는 경사의 기댓값에 영향이 없지만(유도 1단계), 분산에는 결정적이다. 보상이 모두 양수인데 baseline이 없으면 당긴 팔은 무조건 확률이 오른다. 그러면 학습은 "어느 팔이 좋았나"가 아니라 "어느 팔을 먼저 당겼나"에 끌려간다. 분산을 최소화하는 baseline은 $\\mathbb{E}[R]$이 아니라 경사 크기로 가중한 평균이지만, 실전에서는 평균 보상이나 학습된 $V(s)$로 충분하다. GRPO의 그룹 평균, RLOO의 leave-one-out 평균이 모두 이 baseline의 변형이다.</p>' },
      { tag: 'practice', t: 'ε-greedy가 딥 RL에서 의외로 잘 버티는 이유와 무너지는 지점',
        d: '<p>함수근사는 한 행동의 경험을 비슷한 상태·행동으로 일반화하므로, 무작위 탐험이 적어도 학습이 진행된다. 그래서 DQN은 ε-greedy로 Atari 대부분을 푼다. 그러나 보상까지 정확한 행동열이 필요한 희소 보상 문제(길이 $n$의 "조합 자물쇠")에서는 무작위 탐험이 성공할 확률이 $|\\mathcal{A}|^{-n}$으로 지수적으로 작아 사실상 실패한다. Montezuma\'s Revenge가 그 예이고, 카운트 기반 보너스(Bellemare et al. 2016)나 호기심(RND, Burda et al. 2018)이 그 처방이다.</p>' },
    ],
    quiz: [
      { q: '고정 $\\varepsilon=0.1$인 ε-greedy의 장기 누적 regret은 $T$에 대해 어떻게 자라는가?', options: ['상수', '$\\ln T$', '$\\sqrt T$', '선형 $T$'], answer: 3,
        explain: '매 스텝 확률 $0.1\\cdot(K-1)/K$로 나쁜 팔을 고르므로 기대 regret이 스텝당 상수만큼 계속 쌓인다.' },
      { q: 'UCB1의 보너스 $\\sqrt{2\\ln t/N_a}$에서 $\\ln t$의 역할은?', options: ['보상 스케일 조정', '오래 안 당긴 팔을 언젠가 다시 시도하게 만든다', '할인율 역할', '분산을 0으로 만든다'], answer: 1,
        explain: '$N_a$가 고정된 팔의 보너스는 $t$가 커지면서 서서히 커지므로, 어떤 팔도 영원히 배제되지 않는다.' },
      { q: 'gradient bandit에서 baseline $B$를 바꾸면?', options: ['경사의 기댓값이 바뀐다', '경사의 기댓값은 같고 분산이 바뀐다', '최적 정책이 바뀐다', '학습률이 바뀐다'], answer: 1,
        explain: '$\\sum_x\\partial\\pi(x)/\\partial H_a=0$이므로 상수를 빼도 기대 경사는 불변이다. 분산은 크게 달라진다.' },
      { q: 'RLHF의 PPO 단계를 문맥 밴딧으로 볼 때 "행동"에 해당하는 것은?', options: ['토큰 하나', '응답 전체', '보상모델의 파라미터', '프롬프트'], answer: 1,
        explain: '프롬프트(문맥)마다 응답 하나를 생성하고 그 응답 전체에 보상이 하나 주어진다. 토큰 단위 MDP로 보는 관점은 18장에서 다룬다.' },
    ],
  });

  /* ---------- 내가 슬롯머신을 당긴다: 30번 후 컴퓨터 방법과 후회 비교 ---------- */
  function mountSlots(el) {
    const p = ui.panel(el, { kind: 'TRY', title: '슬롯머신 30번 당기기', caption: '기계를 눌러 레버를 당긴다. 당첨이면 1점, 꽝이면 0점이다. 각 기계의 당첨 확률은 숨겨져 있다. 30번을 다 당기면 진짜 확률이 공개되고, 같은 기계에서 컴퓨터 방법들이 평균적으로 얼마나 후회했는지 내 후회와 나란히 나온다.' });
    const T = 30;
    const base = [0.2, 0.35, 0.5, 0.65];
    const names = ['A', 'B', 'C', 'D'];
    const r = sim.rng(77);
    let mus, pulls, wins, total, regret, regCurve, log;
    const grid = document.createElement('div');
    grid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:8px';
    const st = ui.stats(null, [
      { key: 'left', label: '남은 횟수' },
      { key: 'tot', label: '내 점수' },
      { key: 'last', label: '방금 결과', tone: 'accent' },
    ]);
    const btns = ui.row(null, 'btns');
    ui.button(btns, '새 게임 (기계 섞기)', reset);
    const res = document.createElement('div');
    p.body.append(grid, st.el, btns, res);
    const machBtns = names.map((nm, k) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'btn';
      b.style.cssText = 'white-space:normal;text-align:left;line-height:1.5;padding:10px 12px';
      b.addEventListener('click', () => pull(k));
      grid.appendChild(b);
      return b;
    });
    function reset() {
      mus = base.slice();
      for (let i = mus.length - 1; i > 0; i--) { const j = r.int(i + 1); const t = mus[i]; mus[i] = mus[j]; mus[j] = t; }
      pulls = [0, 0, 0, 0]; wins = [0, 0, 0, 0]; total = 0; regret = 0; regCurve = [[0, 0]]; log = null;
      res.innerHTML = '';
      draw();
    }
    function pull(k) {
      const n = sim.sum(pulls);
      if (n >= T) return;
      const win = r() < mus[k] ? 1 : 0;
      pulls[k]++; wins[k] += win; total += win;
      regret += Math.max(...mus) - mus[k];
      regCurve.push([n + 1, regret]);
      log = '기계 ' + names[k] + ': ' + (win ? '당첨 +1' : '꽝');
      draw();
      if (n + 1 >= T) finish();
    }
    function draw() {
      const n = sim.sum(pulls);
      machBtns.forEach((b, k) => {
        const avg = pulls[k] ? (wins[k] / pulls[k]).toFixed(2) : '–';
        b.innerHTML = '<strong>기계 ' + names[k] + '</strong><br><span class="col-muted">' + pulls[k] + '번 당김 · ' + wins[k] + '번 당첨</span><br>평균 <span class="mono" style="background:none;padding:0">' + avg + '</span>' +
          (n >= T ? '<br><span class="col-signal">진짜 확률 ' + mus[k].toFixed(2) + '</span>' : '');
        b.disabled = n >= T;
        b.style.opacity = '1';
      });
      st.set('left', String(T - n));
      st.set('tot', String(total));
      st.set('last', log || '–');
    }
    function finish() {
      const best = Math.max(...mus);
      const runs = 1000;
      const algs = [
        { key: 'rand', name: '무작위로 당기기', short: '무작위', color: 'muted' },
        { key: 'eps', name: 'ε-greedy (ε=0.1)', short: 'ε-greedy', color: 'c2' },
        { key: 'ucb', name: 'UCB1', short: 'UCB1', color: 'c1' },
        { key: 'ts', name: 'Thompson', short: 'Thompson', color: 'c3' },
      ];
      const curves = [], finals = [];
      algs.forEach((a, ai) => {
        const acc = new Float64Array(T);
        const rr = sim.rng(500 + ai);
        if (a.key === 'rand') {
          let avgGap = 0;
          mus.forEach((m) => (avgGap += (best - m) / mus.length));
          for (let t = 0; t < T; t++) acc[t] = avgGap * (t + 1) * runs;
        } else {
          const dummy = new Float64Array(T);
          for (let i = 0; i < runs; i++) runOnce(a.key, mus, T, rr, { eps: 0.1, c: Math.SQRT2, alpha: 0.1 }, acc, dummy);
        }
        const c = [[0, 0]];
        for (let t = 0; t < T; t++) c.push([t + 1, acc[t] / runs]);
        curves.push({ name: a.name, color: a.color, data: c, endDot: false });
        finals.push(acc[T - 1] / runs);
      });
      const bestK = mus.indexOf(best);
      const order = [regret].concat(finals).map((v) => v);
      const rank = order.filter((v) => v < regret - 1e-9).length + 1;
      res.innerHTML = '<div class="fx-detail">끝났다. 가장 좋은 기계는 <strong>' + names[bestK] + '</strong>(당첨 확률 ' + best.toFixed(2) + ')였고, 나는 그 기계를 ' + pulls[bestK] + '번 당겼다. ' +
        '내 후회(기대값 기준)는 <strong>' + regret.toFixed(2) + '</strong>점이다. 처음부터 ' + names[bestK] + '만 당겼다면 평균 ' + (best * T).toFixed(1) + '점을 받았을 것이고, 내가 고른 기계들의 평균 점수 합은 ' + (best * T - regret).toFixed(1) + '점이다. ' +
        '아래 다섯 숫자 중 내 후회는 ' + rank + '번째로 작다. 30번은 짧아서 운이 크게 작용한다. "새 게임"으로 몇 번 더 해 보라.</div>';
      const chartEl = document.createElement('div');
      const barEl = document.createElement('div');
      const split = document.createElement('div');
      split.className = 'w-split';
      split.append(chartEl, barEl);
      res.appendChild(split);
      plot.line(chartEl, { height: 230, x: { min: 0, max: T, label: '당긴 횟수' }, y: { min: 0, label: '누적 후회' }, series: [{ name: '나', color: 'c4', data: regCurve, width: 3, markers: true }].concat(curves), hoverDigits: 2, hoverXDigits: 0 });
      plot.bars(barEl, { categories: ['나'].concat(algs.map((a) => a.short)), series: [{ name: '30번 뒤 후회', color: 'c1', values: [regret].concat(finals), colors: ['c4'].concat(algs.map((a) => a.color)) }], height: 230, y: { min: 0, label: '30번 뒤 후회' }, labels: true, labelFmt: (v) => v.toFixed(1), legend: false });
      RL.renderMath(res);
    }
    reset();
  }

  /* ---------- 공통 ---------- */
  const PRESETS = {
    easy: { label: '쉬움: 0.2 / 0.5 / 0.8', mus: [0.2, 0.5, 0.8] },
    close: { label: '근접: 0.40~0.60 다섯 팔', mus: [0.45, 0.5, 0.55, 0.6, 0.4] },
    ten: { label: '10개 팔 (무작위 평균)', mus: null },
    rare: { label: '희귀 성공: 2%~8%', mus: [0.02, 0.05, 0.08, 0.03] },
  };
  function presetMus(key) {
    if (PRESETS[key].mus) return PRESETS[key].mus.slice();
    const r = sim.rng(2024);
    return sim.range(10).map(() => +(0.1 + 0.8 * r()).toFixed(2));
  }
  function bernKL(p, q) {
    const e = 1e-12;
    p = Math.min(1 - e, Math.max(e, p)); q = Math.min(1 - e, Math.max(e, q));
    return p * Math.log(p / q) + (1 - p) * Math.log((1 - p) / (1 - q));
  }
  // log Γ (Lanczos)
  function lgamma(x) {
    const c = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5];
    let y = x, tmp = x + 5.5;
    tmp -= (x + 0.5) * Math.log(tmp);
    let ser = 1.000000000190015;
    for (let j = 0; j < 6; j++) ser += c[j] / ++y;
    return -tmp + Math.log((2.5066282746310005 * ser) / x);
  }
  function betaPdf(x, a, b) {
    if (x <= 0 || x >= 1) return 0;
    return Math.exp((a - 1) * Math.log(x) + (b - 1) * Math.log(1 - x) - (lgamma(a) + lgamma(b) - lgamma(a + b)));
  }

  const ALGS = [
    { key: 'greedy', name: '탐욕 (ε=0)', color: 'muted', on: false },
    { key: 'eps', name: 'ε-greedy', color: 'c2', on: true },
    { key: 'opt', name: '낙관적 초기값 (Q₀=1.5, α=0.1)', color: 'c6', on: false },
    { key: 'ucb', name: 'UCB1', color: 'c1', on: true },
    { key: 'ts', name: 'Thompson', color: 'c3', on: true },
    { key: 'grad', name: 'Gradient (baseline)', color: 'c5', on: true },
    { key: 'gradnb', name: 'Gradient (baseline 없음)', color: 'c4', on: false },
  ];

  // 한 번의 실행: 매 스텝 선택한 팔의 간격(Δ)과 최적 여부를 누적 배열에 더한다
  function runOnce(key, mus, T, r, prm, accReg, accOpt) {
    const K = mus.length;
    const best = Math.max(...mus);
    const Q = new Array(K).fill(key === 'opt' ? 1.5 : 0);
    const N = new Array(K).fill(0);
    const S = new Array(K).fill(0), F = new Array(K).fill(0);
    const H = new Array(K).fill(0);
    let rbar = 0, cum = 0;
    for (let t = 0; t < T; t++) {
      let a, piA = null;
      if (key === 'greedy') a = sim.argmaxRand(Q, r);
      else if (key === 'eps') a = r() < prm.eps ? r.int(K) : sim.argmaxRand(Q, r);
      else if (key === 'opt') a = sim.argmaxRand(Q, r);
      else if (key === 'ucb') {
        if (t < K) a = t;
        else {
          let bv = -Infinity;
          for (let k = 0; k < K; k++) { const v = Q[k] + prm.c * Math.sqrt(Math.log(t + 1) / N[k]); if (v > bv) { bv = v; a = k; } }
        }
      } else if (key === 'ts') {
        let bv = -Infinity;
        for (let k = 0; k < K; k++) { const v = r.beta(1 + S[k], 1 + F[k]); if (v > bv) { bv = v; a = k; } }
      } else {
        piA = sim.softmax(H);
        a = r.choice(piA);
      }
      const rew = r() < mus[a] ? 1 : 0;
      N[a]++;
      if (key === 'opt') Q[a] += 0.1 * (rew - Q[a]);
      else Q[a] += (rew - Q[a]) / N[a];
      if (rew) S[a]++; else F[a]++;
      if (key === 'grad' || key === 'gradnb') {
        const B = key === 'grad' ? rbar : 0;
        for (let k = 0; k < K; k++) H[k] += prm.alpha * (rew - B) * ((k === a ? 1 : 0) - piA[k]);
        rbar += (rew - rbar) / (t + 1);
      }
      cum += best - mus[a];
      accReg[t] += cum;
      if (mus[a] === best) accOpt[t] += 1;
    }
  }

  function mountBanditSim(el) {
    const p = ui.panel(el, { kind: 'SIM', title: 'K-armed 베르누이 밴딧: 알고리즘 비교', caption: '"밴딧"을 바꾸거나 체크박스로 방법을 켜고 끄며, 왼쪽 그래프에서 어느 선이 가장 낮게(후회가 적게) 머무는지 보라. 오른쪽은 최적 기계를 고른 비율이다.' });
    const state = { preset: 'close', T: 1000, runs: 100, eps: 0.1, c: Math.SQRT2, alpha: 0.1 };
    const on = {};
    ALGS.forEach((a) => (on[a.key] = a.on));
    const ctr = ui.row(p.body);
    ui.select(ctr, { label: '밴딧', value: state.preset, options: Object.keys(PRESETS).map((k) => ({ value: k, label: PRESETS[k].label })), onChange: (v) => { state.preset = v; sched(); } });
    ui.select(ctr, { label: '스텝 수 $T$', value: state.T, options: [{ value: 300, label: '300' }, { value: 1000, label: '1000' }, { value: 2000, label: '2000' }], onChange: (v) => { state.T = +v; sched(); } });
    ui.slider(ctr, { label: '평균낼 실행 수', min: 20, max: 300, step: 10, value: state.runs, format: ui.fmt.int, onInput: (v) => { state.runs = v; sched(); } });
    const ctr2 = ui.row(p.body);
    ui.slider(ctr2, { label: 'ε (ε-greedy)', min: 0, max: 0.5, step: 0.01, value: state.eps, format: ui.fmt.f(2), onInput: (v) => { state.eps = v; sched(); } });
    ui.slider(ctr2, { label: 'c (UCB)', min: 0, max: 3, step: 0.05, value: state.c, format: ui.fmt.f(2), onInput: (v) => { state.c = v; sched(); } });
    ui.slider(ctr2, { label: 'α (gradient)', min: 0.01, max: 1, step: 0.01, value: state.alpha, format: ui.fmt.f(2), onInput: (v) => { state.alpha = v; sched(); } });
    const chk = ui.row(p.body, 'btns');
    ALGS.forEach((a) => ui.checkbox(chk, { label: '<span class="col-' + a.color + '">●</span> ' + a.name, value: a.on, onChange: (v) => { on[a.key] = v; sched(); } }));
    let showLB = false;
    ui.checkbox(chk, { label: 'Lai–Robbins 점근식 (점선)', value: false, onChange: (v) => { showLB = v; sched(); } });
    const info = document.createElement('p');
    info.className = 'w-caption';
    const split = document.createElement('div');
    split.className = 'w-split';
    const left = document.createElement('div');
    const right = document.createElement('div');
    split.append(left, right);
    const tbl = document.createElement('div');
    tbl.className = 'table-wrap';
    p.body.append(info, split, tbl);
    const regC = plot.line(left, { height: 270, x: { label: '스텝 t', min: 0 }, y: { label: '누적 regret (기대)', min: 0 }, series: [], hoverDigits: 1, hoverXDigits: 0 });
    const optC = plot.line(right, { height: 270, x: { label: '스텝 t', min: 0 }, y: { label: '최적 팔 선택 비율', min: 0, max: 1 }, series: [], hoverDigits: 2, hoverXDigits: 0 });
    let timer = 0, job = 0;
    if (RL.cleanup) RL.cleanup.push(() => { job++; clearTimeout(timer); });
    function sched() { clearTimeout(timer); timer = setTimeout(run, 60); }
    // 알고리즘 하나씩 나눠 계산해 메인 스레드를 오래 막지 않는다
    function run() {
      const my = ++job;
      const mus = presetMus(state.preset);
      const T = state.T, best = Math.max(...mus);
      const stride = Math.max(1, Math.floor(T / 200));
      const regSeries = [], optSeries = [], rows = [];
      const todo = ALGS.map((alg, ai) => ({ alg, ai })).filter((x) => on[x.alg.key]);
      let lb = 0;
      mus.forEach((m) => { if (m < best) lb += (best - m) / bernKL(m, best); });
      const lbData = [];
      for (let t = 1; t <= T; t += stride) lbData.push([t, lb * Math.log(t)]);
      info.innerHTML = '팔의 평균 $\\mu$ = [' + mus.map((m) => m.toFixed(2)).join(', ') + '], 최적 ' + best.toFixed(2) + '. 실행 ' + state.runs + '회 평균.';
      RL.renderMath(info);
      function draw() {
        const rs = regSeries.slice();
        if (showLB) rs.push({ name: 'Lai–Robbins 점근식', color: 'faint', dash: '5 4', data: lbData, endDot: false });
        regC.update({ series: rs, x: { label: '스텝 t', min: 0, max: T } });
        optC.update({ series: optSeries.slice(), x: { label: '스텝 t', min: 0, max: T } });
        tbl.innerHTML = '<table class="t"><thead><tr><th>알고리즘</th><th>T에서 누적 regret</th><th>마지막 10% 구간 최적 선택률</th></tr></thead><tbody>' + rows.join('') + '</tbody></table>';
      }
      let i = 0;
      function next() {
        if (my !== job) return;
        if (i >= todo.length) { draw(); return; }
        const { alg, ai } = todo[i++];
        const accReg = new Float64Array(T), accOpt = new Float64Array(T);
        const r = sim.rng(1000 + ai * 7919);
        for (let k = 0; k < state.runs; k++) runOnce(alg.key, mus, T, r, state, accReg, accOpt);
        const R = [], O = [];
        const optAvg = Array.from(accOpt, (x) => x / state.runs);
        const optSm = sim.smooth(optAvg, Math.max(5, Math.floor(T / 50)));
        for (let t = 0; t < T; t += stride) { R.push([t + 1, accReg[t] / state.runs]); O.push([t + 1, optSm[t]]); }
        R.push([T, accReg[T - 1] / state.runs]); O.push([T, optSm[T - 1]]);
        const nm = alg.key === 'eps' ? 'ε-greedy (ε=' + state.eps.toFixed(2) + ')' : alg.key === 'ucb' ? 'UCB1 (c=' + state.c.toFixed(2) + ')' : alg.name;
        regSeries.push({ name: nm, color: alg.color, data: R });
        optSeries.push({ name: nm, color: alg.color, data: O });
        const lastTenth = optAvg.slice(Math.floor(T * 0.9));
        rows.push('<tr><td><span class="col-' + alg.color + '">●</span> ' + nm + '</td><td class="num">' + (accReg[T - 1] / state.runs).toFixed(1) + '</td><td class="num">' + (100 * sim.mean(lastTenth)).toFixed(1) + '%</td></tr>');
        draw();
        setTimeout(next, 0);
      }
      next();
    }
    run();
  }

  /* ---------- Thompson 사후분포 ---------- */
  function mountPosterior(el) {
    const p = ui.panel(el, { kind: 'SIM', title: 'Thompson sampling: Beta 사후분포가 좁아지는 과정', caption: '"10 스텝"을 몇 번 눌러 보라. 많이 당긴 기계의 산은 좁고 뾰족해지고, 적게 당긴 기계의 산은 넓게 남는다. 점은 이번 스텝에 각 산에서 뽑은 값이고, 가장 오른쪽 점의 기계를 당긴다.' });
    let key = 'close';
    const ctr = ui.row(p.body);
    ui.select(ctr, { label: '밴딧', value: key, options: [{ value: 'easy', label: PRESETS.easy.label }, { value: 'close', label: PRESETS.close.label }, { value: 'rare', label: PRESETS.rare.label }], onChange: (v) => { key = v; reset(); } });
    const btns = ui.row(p.body, 'btns');
    ui.button(btns, '1 스텝', () => step(1), { primary: true });
    ui.button(btns, '10 스텝', () => step(10));
    ui.button(btns, '100 스텝', () => step(100));
    const playB = ui.button(btns, '자동 재생', () => { if (lp.running) { lp.stop(); playB.textContent = '자동 재생'; } else { lp.start(); playB.textContent = '정지'; } });
    ui.button(btns, '초기화', reset);
    const st = ui.stats(p.body, [{ key: 't', label: '스텝' }, { key: 'last', label: '직전 선택 (뽑힌 값)', tone: 'accent' }, { key: 'reg', label: '누적 regret (기대)', tone: 'signal' }]);
    const chartEl = document.createElement('div');
    const tbl = document.createElement('div');
    tbl.className = 'table-wrap';
    p.body.append(chartEl, tbl);
    const cols = ['c1', 'c2', 'c3', 'c4', 'c5', 'c6'];
    const chart = plot.line(chartEl, { height: 260, x: { min: 0, max: 1, label: '평균 보상 μ' }, y: { label: '사후 밀도', min: 0 }, series: [], hover: false });
    const r = sim.rng(5);
    const lp = ui.loop(() => { step(1); if (t >= 2000) { playB.textContent = '자동 재생'; return false; } }, 12);
    let mus, S, F, t, reg, lastSample, lastArm;
    function reset() { mus = presetMus(key); S = mus.map(() => 0); F = mus.map(() => 0); t = 0; reg = 0; lastSample = null; lastArm = null; draw(); }
    function step(n) {
      const best = Math.max(...mus);
      for (let i = 0; i < n; i++) {
        const th = mus.map((_, k) => r.beta(1 + S[k], 1 + F[k]));
        const a = sim.argmax(th);
        if (r() < mus[a]) S[a]++; else F[a]++;
        reg += best - mus[a];
        t++;
        lastSample = th; lastArm = a;
      }
      draw();
    }
    function draw() {
      const series = mus.map((m, k) => {
        const a = 1 + S[k], b = 1 + F[k];
        const xmax = key === 'rare' ? 0.3 : 1;
        const data = [];
        for (let i = 1; i < 300; i++) { const x = (xmax * i) / 300; data.push([x, betaPdf(x, a, b)]); }
        const pts = lastSample ? [[lastSample[k], betaPdf(Math.min(0.9999, Math.max(1e-4, lastSample[k])), a, b), k === lastArm ? 7 : 4]] : [];
        return { name: '팔 ' + (k + 1) + ' (μ=' + m.toFixed(2) + ')', color: cols[k % 6], data, points: pts, endDot: false };
      });
      let ymax = 0;
      series.forEach((s) => s.data.forEach((d) => (ymax = Math.max(ymax, d[1]))));
      chart.update({ series, x: { min: 0, max: key === 'rare' ? 0.3 : 1, label: '평균 보상 μ' }, y: { label: '사후 밀도', min: 0, max: Math.min(80, Math.max(2, ymax * 1.08)) }, vlines: mus.map((m, k) => ({ x: m, color: cols[k % 6] })) });
      st.set('t', t);
      st.set('last', lastArm == null ? '–' : '팔 ' + (lastArm + 1) + ' (' + lastSample[lastArm].toFixed(3) + ')');
      st.set('reg', reg.toFixed(2));
      tbl.innerHTML = '<table class="t"><thead><tr><th>팔</th><th>참 평균</th><th>성공 / 실패</th><th>사후 평균</th><th>당긴 비율</th></tr></thead><tbody>' +
        mus.map((m, k) => '<tr><td><span class="col-' + cols[k % 6] + '">●</span> ' + (k + 1) + '</td><td class="num">' + m.toFixed(2) + '</td><td class="num">' + S[k] + ' / ' + F[k] + '</td><td class="num">' + ((1 + S[k]) / (2 + S[k] + F[k])).toFixed(3) + '</td><td class="num">' + (t ? (100 * (S[k] + F[k]) / t).toFixed(1) + '%' : '–') + '</td></tr>').join('') +
        '</tbody></table>';
    }
    reset();
    step(30);
  }
})();
