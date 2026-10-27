/* 01 MDP와 리턴 */
(function () {
  const { ui, sim, plot } = RL;

  RL.chapter({
    id: 'mdp',
    title: 'MDP와 리턴',
    subtitle: '강화학습이 푸는 문제를 수식으로 정확히 적는다. 이 장의 다섯 가지 기호가 이후 모든 알고리즘의 공용어가 된다.',
    time: 25,
    level: '기초',
    theses: ['T6'],
    easy: {
      hook: '강화학습은 "해 보고, 점수를 받고, 다음엔 더 잘하기"를 숫자로 적은 것이다.',
      intro: '<p>게임 캐릭터든 배달 로봇이든 챗봇이든 구조는 같다. 지금 <strong>상황</strong>을 보고, 할 수 있는 것 중 하나를 <strong>선택</strong>하면, 세상이 <strong>점수</strong>와 <strong>다음 상황</strong>을 돌려준다. 목표는 한 번의 점수가 아니라 <strong>앞으로 받을 점수의 합</strong>을 크게 만드는 것이다. 단, 먼 미래의 점수는 조금씩 깎아서 센다.</p>',
      analogy: '오늘 받는 1만 원이 1년 뒤의 1만 원보다 소중한 것과 같다. 할인율 $\\gamma=0.9$는 "한 걸음 늦을 때마다 10% 깎아서 센다"는 뜻이다. 그래서 3걸음 뒤의 10점은 지금 기준으로 $10\\times0.9\\times0.9\\times0.9 = 7.29$점이다.',
      path: ['선택하고 점수를 받는 반복을 그림으로 본다', '점수를 합치는 법(리턴)을 손으로 계산한다', '"이 상황은 평균 몇 점짜리인가"(가치)를 직접 여러 번 해 보며 구한다'],
      recap: [
        '상황을 보고 선택하면 점수와 다음 상황이 돌아온다. 이 반복이 강화학습의 전부다.',
        '목표는 앞으로 받을 점수의 합(리턴)이고, 먼 미래 점수는 한 걸음마다 할인율만큼 깎아서 더한다.',
        '가치는 "이 상황에서(이 선택을 하면) 평균 몇 점을 받을까"이고, 여러 번 해 보고 평균을 내면 구할 수 있다.',
      ],
    },
    goals: [
      'MDP 5-튜플 $(\\mathcal{S},\\mathcal{A},P,R,\\gamma)$의 각 요소를 설명할 수 있다.',
      '리턴 $G_t$의 재귀식 $G_t = r_{t+1} + \\gamma G_{t+1}$을 유도하고, 할인율이 선호를 어떻게 바꾸는지 설명할 수 있다.',
      '가치 함수 $V^\\pi$, $Q^\\pi$가 "리턴의 기댓값"이라는 것을 샘플링으로 확인한다.',
    ],
    html: String.raw`
<p>강화학습(RL)은 <strong>행동의 결과가 나중에 돌아오는 문제</strong>를 다룬다. 지도학습은 입력마다 정답이 붙어 있지만, RL의 에이전트는 행동한 뒤 숫자 하나(보상)만 받고, 그 숫자조차 몇 단계 늦게 온다. 이 장은 그 상황을 <em>마르코프 결정 과정(MDP)</em>으로 정식화한다.</p>

<h2>에이전트와 환경의 상호작용</h2>
<p>매 시점 $t$에 에이전트는 상태 $s_t$를 보고 행동 $a_t$를 고른다. 환경은 보상 $r_{t+1}$과 다음 상태 $s_{t+1}$을 돌려준다. 이 루프가 만드는 기록을 <strong>궤적(trajectory)</strong>이라 부른다.</p>
<div class="w wide" style="box-shadow:none">
  <div class="w-body">
  <svg viewBox="0 0 640 170" role="img" aria-label="에이전트-환경 루프">
    <defs><marker id="mdp-ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" style="fill:var(--muted)"/></marker></defs>
    <rect x="40" y="45" width="170" height="80" rx="10" style="fill:var(--accent-soft);stroke:var(--accent)"/>
    <text x="125" y="80" text-anchor="middle" style="fill:var(--ink);font-weight:600;font-size:15px">에이전트</text>
    <text x="125" y="102" text-anchor="middle" style="fill:var(--muted);font-size:12px;font-family:var(--font-mono)">π(a | s)</text>
    <rect x="430" y="45" width="170" height="80" rx="10" style="fill:var(--signal-soft);stroke:var(--signal)"/>
    <text x="515" y="80" text-anchor="middle" style="fill:var(--ink);font-weight:600;font-size:15px">환경</text>
    <text x="515" y="102" text-anchor="middle" style="fill:var(--muted);font-size:12px;font-family:var(--font-mono)">P(s', r | s, a)</text>
    <path d="M210 62 C 300 20, 340 20, 430 62" style="fill:none;stroke:var(--muted);stroke-width:1.6" marker-end="url(#mdp-ar)"/>
    <text x="320" y="28" text-anchor="middle" style="fill:var(--ink);font-size:13px">행동 aₜ</text>
    <path d="M430 108 C 340 150, 300 150, 210 108" style="fill:none;stroke:var(--muted);stroke-width:1.6" marker-end="url(#mdp-ar)"/>
    <text x="320" y="152" text-anchor="middle" style="fill:var(--ink);font-size:13px">보상 rₜ₊₁, 다음 상태 sₜ₊₁</text>
  </svg>
  </div>
</div>
$$\tau = (s_0, a_0, r_1, s_1, a_1, r_2, s_2, \dots)$$

<p>핵심 가정은 <strong>마르코프 성질</strong>이다. 다음 상태와 보상의 분포가 현재 상태와 행동만으로 결정되고, 그 이전 역사는 추가 정보를 주지 않는다.</p>
$$P(s_{t+1}, r_{t+1} \mid s_t, a_t, s_{t-1}, a_{t-1}, \dots, s_0) = P(s_{t+1}, r_{t+1} \mid s_t, a_t)$$
<div class="aside"><span class="label">현실에서는</span>관측이 상태의 일부만 보여 주면 이 가정이 깨진다. 그때는 과거 관측을 요약한 <em>믿음 상태</em>를 새 상태로 삼는다(<a href="#pomdp">04 POMDP</a>). LLM에서는 프롬프트와 지금까지 생성한 토큰 전체를 상태로 두어 마르코프 성질을 강제로 만족시킨다(<a href="#llm-mdp">18장</a>).</div>

<h2>MDP의 다섯 요소</h2>
<div data-w="fx-mdp"></div>
<p>정책 $\pi(a\mid s)$는 MDP의 일부가 아니라 <strong>우리가 찾는 대상</strong>이다. MDP는 게임의 규칙이고, 정책은 플레이어의 전략이다.</p>

<h2>리턴: 미래 보상의 할인 합</h2>
<p>시점 $t$ 이후 받는 보상을 할인해 더한 값을 <strong>리턴</strong>이라 한다.</p>
<div data-w="fx-return"></div>
<div data-w="step-return"></div>
<p>리턴의 정의에서 첫 항을 떼어내면 바로 재귀식이 나온다. 이 한 줄이 다음 장의 벨만 방정식 전체의 씨앗이다.</p>
$$G_t = r_{t+1} + \gamma\big(r_{t+2} + \gamma r_{t+3} + \cdots\big) = r_{t+1} + \gamma\, G_{t+1}$$
<p>보상이 $|r|\le R_{\max}$로 유계이면 등비급수에 의해 $|G_t| \le \dfrac{R_{\max}}{1-\gamma}$이다. 할인은 무한 합을 유한하게 만드는 수학적 장치이자, "가까운 보상을 더 쳐주는" 선호의 표현이다. $\dfrac{1}{1-\gamma}$을 <strong>유효 지평(effective horizon)</strong>이라 부른다. $\gamma=0.99$면 대략 100 스텝 앞까지 본다.</p>

<div data-w="try-discount"></div>
<div data-w="discount-lab"></div>

<div class="key"><span class="label">해석</span>$\gamma$는 단순한 하이퍼파라미터가 아니라 <strong>문제 정의의 일부</strong>다. 같은 환경이라도 $\gamma$가 바뀌면 최적 정책이 바뀐다. 또 하나의 해석: 매 스텝 확률 $1-\gamma$로 에피소드가 강제 종료되는 세계에서의 (할인 없는) 기대 보상 합과 같다.</div>

<h2>정책과 가치 함수</h2>
<p>정책 $\pi$를 고정하면 리턴은 확률변수가 된다. 그 기댓값이 가치 함수다.</p>
$$V^\pi(s) = \mathbb{E}_\pi\left[\,G_t \mid s_t = s\,\right], \qquad Q^\pi(s,a) = \mathbb{E}_\pi\left[\,G_t \mid s_t = s,\ a_t = a\,\right]$$
<div data-w="fx-q"></div>
<p>둘 사이에는 두 개의 기본 관계가 있다. 첫 번째는 "행동에 대해 평균", 두 번째는 "한 스텝 전개"다.</p>
$$V^\pi(s) = \sum_a \pi(a\mid s)\, Q^\pi(s,a), \qquad Q^\pi(s,a) = R(s,a) + \gamma \sum_{s'} P(s'\mid s,a)\, V^\pi(s')$$
<p>또 하나 자주 쓰는 양이 <strong>advantage</strong> $A^\pi(s,a) = Q^\pi(s,a) - V^\pi(s)$이다. "이 행동이 평균보다 얼마나 나은가"를 뜻하며, 정의상 $\sum_a \pi(a\mid s)A^\pi(s,a) = 0$이다. 정책 경사(11장), GAE(12장), PPO(13장), GRPO(21장)가 모두 이 값을 추정하는 방법의 차이로 갈린다.</p>

<h2>가치는 리턴의 평균이다: 샘플링으로 확인</h2>
<p>아래 작은 MDP에서 상태 A의 선택지는 둘이다. <em>안전</em>은 즉시 +1을 받고 B로 가며, <em>모험</em>은 60% 확률로 C(이후 +10)에 가지만 40% 확률로 -2를 받고 끝난다. 에피소드를 샘플링해 리턴을 평균내면 정확한 $V^\pi(A)$로 수렴한다. 할인율과 정책을 바꿔 보며 어느 쪽이 나은지가 뒤집히는 지점을 찾아보자.</p>
<p>먼저 직접 에이전트가 되어 보자. A에서 무엇을 고를지 버튼으로 정하면 그 뒤는 확률대로 흘러간다. 같은 선택을 여러 번 해 보면 "그 선택의 평균 점수", 즉 $Q(A,\text{선택})$이 드러난다.</p>
<div data-w="play-mdp"></div>
<p>이번에는 정책(모험을 고를 확률)을 정해 두고 컴퓨터가 수백 번 해 보게 한다.</p>
<div data-w="mrp-sampler"></div>

<h2>목적 함수와 상태 방문 분포</h2>
<p>RL의 목표는 시작 분포 $\rho_0$에서의 기대 리턴을 최대화하는 정책을 찾는 것이다.</p>
$$J(\pi) = \mathbb{E}_{s_0\sim\rho_0}\big[V^\pi(s_0)\big] = \mathbb{E}_{\tau\sim\pi}\Big[\sum_{t\ge 0}\gamma^t r_{t+1}\Big]$$
<p>뒤에서 반복해서 등장하는 양이 <strong>할인 상태 방문 분포</strong>다. 정책 $\pi$를 따를 때 상태 $s$에 얼마나 자주(할인 가중) 머무르는지를 나타낸다.</p>
$$d^\pi(s) = (1-\gamma)\sum_{t\ge 0} \gamma^t \Pr(s_t = s \mid \pi, \rho_0)$$
<p>정책을 바꾸면 이 분포 자체가 바뀐다. 지도학습과 달리 RL의 "데이터 분포"가 학습 대상에 의존한다는 사실이 정책 경사 정리(<a href="#pg">11장</a>), 신뢰영역(<a href="#ppo">13장</a>), 오프라인 RL의 분포 이동(<a href="#offline">15장</a>)의 공통 배경이다.</p>

<h2>에피소드형과 연속형, 그리고 LLM</h2>
<div class="grid2">
  <div class="card"><h4>에피소드형 (episodic)</h4><p>종료 상태가 있다. 게임 한 판, 미로 탈출, <strong>LLM 응답 하나</strong>(EOS 토큰에서 종료). $\gamma = 1$도 쓸 수 있다.</p></div>
  <div class="card"><h4>연속형 (continuing)</h4><p>끝이 없다. 로봇 제어, 추천 시스템. $\gamma<1$ 또는 평균 보상 기준 $\lim_{T\to\infty}\frac1T\mathbb{E}\sum_t r_t$을 쓴다.</p></div>
</div>
<p>LLM 미세조정에서는 보통 $\gamma=1$이고 보상이 응답 끝에 한 번만 주어진다(희소 보상). 상태는 "프롬프트 + 지금까지의 토큰", 행동은 다음 토큰, 전이는 결정적(토큰을 이어 붙임)이다. 같은 MDP 언어로 바둑과 챗봇을 함께 다룰 수 있다는 점이 이 정식화의 힘이다.</p>
`,
    mount: {
      'fx-mdp': (el) => ui.formula(el, {
        title: 'MDP 5-튜플',
        say: '문제는 {S|어떤 상황들이 있는지}, {A|무엇을 고를 수 있는지}, {P|고르면 다음에 어디로 가는지}, {R|그때 몇 점을 받는지}, {g|미래 점수를 얼마나 쳐주는지}의 다섯 가지로 완전히 정해진다.',
        tex: String.raw`\mathcal{M} = \big(\tm{S}{\mathcal{S}},\ \tm{A}{\mathcal{A}},\ \tm{P}{P(s'\mid s,a)},\ \tm{R}{R(s,a)},\ \tm{g}{\gamma}\big)`,
        terms: [
          { id: 'S', sym: '\\mathcal{S}', label: '상태 공간', desc: '에이전트가 놓일 수 있는 모든 상황.', long: '결정에 필요한 정보를 모두 담은 상황의 집합. 격자 위치, 바둑판 배치, 로봇의 관절각과 속도, LLM의 "프롬프트+생성 토큰". 유한하면 표(tabular)로, 크면 함수근사로 다룬다.' },
          { id: 'A', sym: '\\mathcal{A}', label: '행동 공간', desc: '고를 수 있는 행동들. 이산 또는 연속.', long: '이산(상하좌우, 어휘 토큰 5만 개)이면 argmax와 softmax를 쓰고, 연속(토크 값)이면 가우시안 정책이나 결정적 정책(DDPG)을 쓴다. 행동 공간의 종류가 알고리즘 선택을 크게 좌우한다.' },
          { id: 'P', sym: "P(s'\\mid s,a)", label: '전이 확률', desc: '행동 후 다음 상태의 분포 (환경의 물리).', long: '환경의 동역학. 모델 기반 RL은 이것을 학습하거나 안다고 가정하고(16장), 모델 프리 RL은 이것을 모른 채 샘플만으로 배운다(06~14장). LLM에서는 결정적이다.' },
          { id: 'R', sym: 'R(s,a)', label: '보상 함수', desc: '한 스텝의 즉각적 좋고 나쁨.', long: '"보상 가설": 우리가 원하는 모든 목표는 누적 스칼라 보상의 최대화로 표현할 수 있다는 가정. 보상을 잘못 설계하면 에이전트는 의도가 아니라 숫자를 최적화한다(reward hacking, 19장).' },
          { id: 'g', sym: '\\gamma', label: '할인율', desc: '미래 보상의 현재 가치. 0 ≤ γ ≤ 1.', long: '$\\gamma=0$이면 근시안적으로 즉시 보상만, $\\gamma\\to1$이면 먼 미래까지 동등하게 본다. 무한 합의 수렴을 보장하고(벨만 연산자의 축약 계수, 02장), 추정 분산을 줄이는 손잡이로도 쓰인다(GAE의 γ, 12장).' },
        ],
      }),
      'fx-return': (el) => ui.formula(el, {
        title: '리턴의 정의',
        say: '{G|지금부터 받을 총점}은 {r1|바로 다음에 받는 점수}에서 시작해, 그다음 점수에는 {g|할인율}을 한 번, 그다음에는 두 번 곱해 계속 더한 것이다. 즉 {rk|k걸음 뒤의 점수}에는 {gk|할인율을 k번 곱한 가중치}가 붙는다.',
        tex: String.raw`\tm{G}{G_t} \;=\; \tm{r1}{r_{t+1}} + \tm{g}{\gamma}\, r_{t+2} + \gamma^2 r_{t+3} + \cdots \;=\; \sum_{k=0}^{\infty} \tm{gk}{\gamma^k}\, \tm{rk}{r_{t+k+1}}`,
        terms: [
          { id: 'G', sym: 'G_t', label: '리턴', desc: '시점 t 이후의 할인 누적 보상. 확률변수.', long: '정책과 환경의 무작위성 때문에 같은 상태에서 출발해도 매번 다른 값이 나온다. 그래서 그 기댓값(가치 함수)을 다룬다.' },
          { id: 'r1', sym: 'r_{t+1}', label: '즉시 보상', desc: '행동 a_t 직후 받는 보상. 첨자 t+1에 주의.', long: '관례상 $(s_t, a_t)$의 결과로 받는 보상을 $r_{t+1}$로 쓴다(Sutton & Barto). 일부 문헌은 $r_t$로 쓰므로 첨자를 볼 때 주의.' },
          { id: 'g', sym: '\\gamma', label: '할인율', desc: '한 스텝 늦을 때마다 곱해지는 비율.' },
          { id: 'gk', sym: '\\gamma^k', label: '할인 가중치', desc: 'k 스텝 뒤 보상의 가중치. 기하급수적으로 감소.', long: '가중치의 합은 $\\sum_k\\gamma^k = 1/(1-\\gamma)$. 이 값이 유효 지평이다. 아래 실험실에서 막대의 감소 속도를 확인하라.' },
          { id: 'rk', sym: 'r_{t+k+1}', label: '미래 보상', desc: 'k 스텝 뒤에 받는 보상.' },
        ],
      }),
      'fx-q': (el) => ui.formula(el, {
        title: '행동 가치 함수',
        say: '{Q|상황 s에서 행동 a를 하면 기대되는 총점}은, {c|s에서 a를 하고 시작해서} 그 뒤로는 정책대로 행동했을 때 받는 {G|할인된 총점}을 {E|아주 여러 번 해 보고 평균 낸 값}이다.',
        tex: String.raw`\tm{Q}{Q^{\pi}(s,a)} = \tm{E}{\mathbb{E}_{\pi}}\Big[\, \tm{G}{\textstyle\sum_{k\ge0}\gamma^k r_{t+k+1}} \;\Big|\; \tm{c}{s_t=s,\ a_t=a} \Big]`,
        terms: [
          { id: 'Q', sym: 'Q^\\pi(s,a)', label: '행동 가치', desc: 's에서 a를 한 번 하고 이후 π를 따를 때의 기대 리턴.', long: 'Q가 있으면 환경 모델 없이도 $\\arg\\max_a Q(s,a)$로 행동을 고를 수 있다. 이것이 Q-learning과 DQN이 V 대신 Q를 학습하는 이유다.' },
          { id: 'E', sym: '\\mathbb{E}_\\pi', label: '기댓값', desc: '정책 π와 전이 P가 만드는 모든 궤적에 대한 평균.', long: '첫 행동만 a로 고정되고, 그 이후 행동은 π에서, 상태는 P에서 샘플된다. 이 기댓값을 샘플 평균으로 근사하면 몬테카를로, 한 스텝 뒤 추정치로 근사하면 TD다(06장).' },
          { id: 'G', sym: 'G_t', label: '리턴', desc: '할인 누적 보상.' },
          { id: 'c', sym: 's_t=s,\\ a_t=a', label: '조건', desc: '출발 상태와 첫 행동을 고정.' },
        ],
      }),
      'discount-lab': mountDiscountLab,
      'mrp-sampler': mountSampler,
      'play-mdp': mountPlay,
      'step-return': (el) => ui.walkthrough(el, {
        title: '리턴을 손으로 계산하기',
        caption: '세 걸음 동안 받은 점수가 $2, 0, 4$이고 할인율이 $\\gamma = 0.5$라고 하자. 칸에 답을 적어 보고 "확인"을 누르면 계산식이 열린다.',
        steps: [
          { say: '첫 점수 2점은 바로 받는 점수라 깎지 않고 그대로 센다.', calc: String.raw`2 	imes 1 = 2` },
          { say: '두 번째 점수 0점은 한 걸음 늦게 받으니 $\\gamma$를 한 번 곱한다. 지금 기준으로 몇 점일까?', ask: { answer: 0 }, calc: String.raw`0 	imes 0.5 = 0` },
          { say: '세 번째 점수 4점은 두 걸음 늦으니 $\\gamma$를 두 번 곱한다. 지금 기준으로 몇 점일까?', ask: { answer: 1 }, calc: String.raw`4 	imes 0.5 	imes 0.5 = 1` },
          { say: '이제 모두 더하면 지금 시점의 리턴 $G_1$은?', ask: { answer: 3 }, calc: String.raw`G_1 = 2 + 0 + 1 = 3` },
          { say: '뒤에서부터 거꾸로 계산해도 같은 답이 나온다. 마지막 시점의 리턴은 4, 그 앞은 "자기 점수 + 할인된 뒤 리턴", 또 그 앞도 마찬가지다. 이 "자기 점수 + 할인된 다음 리턴" 규칙이 바로 다음 장의 벨만 방정식이 된다.', calc: String.raw`G_3 = 4,\quad G_2 = 0 + 0.5	imes 4 = 2,\quad G_1 = 2 + 0.5	imes 2 = 3` },
        ],
      }),
      'try-discount': (el) => ui.predict(el, {
        title: '할인 감각 테스트',
        caption: '계산기 없이 어림해도 된다. 틀리면 힌트가 나온다.',
        items: [
          { q: '$\\gamma = 0.9$일 때, 3걸음 뒤에 받는 10점은 지금 기준으로 몇 점일까?', answer: 7.29, tol: 0.05, hint: '0.9를 세 번 곱한다: $10\\times0.9\\times0.9\\times0.9$.', explain: '$10 \\times 0.9^3 = 7.29$. 한 걸음마다 10%씩 깎인다.' },
          { q: '매 걸음 1점씩 끝없이 받는다면, $\\gamma = 0.9$에서 총점은 몇 점일까?', answer: 10, tol: 0.05, hint: '$1 + 0.9 + 0.81 + \\cdots$는 $1/(1-0.9)$로 모인다.', explain: '$1 + 0.9 + 0.9^2 + \\cdots = \\dfrac{1}{1-0.9} = 10$. 끝없이 받아도 총점이 유한한 것이 할인의 첫 번째 역할이다. 이 10을 "유효 지평"이라고 부르며, 대략 10걸음 앞까지 본다는 뜻이다.' },
          { q: '$\\gamma = 0.9$일 때 더 좋은 쪽은? (A) 지금 바로 5점 (B) 5걸음 뒤에 8점', choices: ['(A) 지금 5점', '(B) 5걸음 뒤 8점'], correct: 0, hint: '$8\\times0.9^5$를 어림해 보자.', explain: '$8 \\times 0.9^5 \\approx 4.72 < 5$이므로 지금 5점이 낫다. 하지만 $\\gamma = 0.95$면 $8\\times0.95^5\\approx6.19$로 뒤집힌다. 할인율이 선호를 바꾼다.' },
        ],
      }),
    },
    tacit: [
      { tag: 'math', t: '$1/(1-\\gamma)$이 보이면 "지평"을 읽어라',
        d: '<p>RL 이론의 거의 모든 상한에는 $1/(1-\\gamma)$의 거듭제곱이 붙는다. 이것은 유효 지평 $H$다. 가치 오차 상한이 $\\epsilon/(1-\\gamma)$이면 "한 스텝 오차가 $H$ 스텝 동안 누적된다", $\\epsilon/(1-\\gamma)^2$이면 "누적된 오차가 정책을 바꾸고 그 정책이 또 $H$ 스텝 동안 굴러간다"(복합 오차, compounding error)로 읽는다. 행동 복제(BC)의 오차가 $H^2$로 커진다는 결과(Ross & Bagnell)도 같은 구조다.</p>' },
      { tag: 'math', t: '할인은 "생존 확률"이자 "보상의 사전분포"다',
        d: '<p>$\\gamma$-할인 MDP는 매 스텝 $1-\\gamma$ 확률로 종료되는 무할인 MDP와 기대 리턴이 같다. 그래서 $\\gamma$를 바꾸는 것은 문제를 바꾸는 것이다. 실무에서는 참 목표가 무할인(에피소드 총점)이어도 $\\gamma<1$을 쓰는데, 이는 <strong>분산을 줄이려고 의도적으로 편향을 사는 것</strong>이다(T6). "$\\gamma=0.99$는 하이퍼파라미터"라는 말 뒤에는 이 트레이드오프가 숨어 있다.</p>' },
      { tag: 'math', t: '완전 관측 MDP의 최적 정책은 결정적이다',
        d: '<p>할인 유한 MDP에는 항상 결정적인 최적 정책이 존재한다(선형계획의 꼭짓점 해). 그런데도 확률적 정책을 쓰는 이유는 세 가지뿐이다: (1) 탐험, (2) 부분 관측(POMDP)이나 게임처럼 결정적 정책이 착취당하는 경우, (3) 엔트로피·KL 정규화가 목적에 들어간 경우(T5). LLM 정렬은 (3)이다. 정규화가 없으면 최적해는 한 응답에 확률 1을 몰아주는 붕괴된 분포다.</p>' },
      { tag: 'algo', t: '보상의 상수 이동과 스케일은 공짜가 아니다',
        d: '<p>모든 보상에 상수 $c$를 더하면 연속형 문제에서는 가치가 $c/(1-\\gamma)$만큼 균일하게 이동해 최적 정책이 그대로지만, <strong>에피소드형에서는 바뀐다</strong>. 매 스텝 +1이면 오래 버티는 게 이득, −1이면 빨리 끝내는 게 이득이 된다. LLM에서 길이 편향(긴 응답 선호)이 생기는 원인 중 하나가 이것이다. 정책을 보존하는 유일한 일반적 변환은 <em>포텐셜 기반 셰이핑</em> $r + \\gamma\\Phi(s\') - \\Phi(s)$이다(Ng, Harada, Russell 1999).</p>' },
      { tag: 'research', t: '"상태"는 설계 대상이다',
        d: '<p>마르코프 성질은 세계의 성질이 아니라 <strong>우리가 고른 상태 표현의 성질</strong>이다. 프레임 4장을 쌓은 DQN의 입력, RNN 은닉 상태, LLM의 전체 컨텍스트는 모두 "마르코프하게 만들기 위한" 설계다. 새 문제를 RL로 볼 때 가장 먼저 할 일은 "무엇을 상태로 두면 마르코프한가"를 묻는 것이다.</p>' },
    ],
    quiz: [
      { q: '$\\gamma = 0.9$일 때 유효 지평 $1/(1-\\gamma)$은?', options: ['0.9 스텝', '9 스텝', '10 스텝', '90 스텝'], answer: 2,
        explain: '$1/(1-0.9) = 10$. 할인 가중치 $\\gamma^k$의 총합이 10이므로, 대략 10 스텝 앞의 보상까지가 의미 있게 반영된다.' },
      { q: '다음 중 MDP의 구성요소가 <em>아닌</em> 것은?', options: ['전이 확률 $P$', '보상 함수 $R$', '정책 $\\pi$', '할인율 $\\gamma$'], answer: 2,
        explain: '정책은 MDP가 주어진 뒤 우리가 찾는 대상이다. MDP는 규칙, 정책은 전략.' },
      { q: '리턴의 재귀식으로 옳은 것은?', options: ['$G_t = r_{t+1} + G_{t+1}$', '$G_t = r_{t+1} + \\gamma G_{t+1}$', '$G_t = \\gamma r_{t+1} + G_{t+1}$', '$G_t = \\gamma (r_{t+1} + G_{t+1})$'], answer: 1,
        explain: '정의 $G_t=\\sum_k\\gamma^k r_{t+k+1}$에서 $k=0$ 항을 떼어내고 나머지를 $\\gamma$로 묶으면 $r_{t+1}+\\gamma G_{t+1}$.' },
      { q: '$\\sum_a \\pi(a\\mid s) A^\\pi(s,a)$의 값은?', options: ['항상 0', '$V^\\pi(s)$', '$Q^\\pi(s,a)$의 최댓값', '정책에 따라 다르다'], answer: 0,
        explain: '$\\sum_a \\pi Q^\\pi = V^\\pi$이므로 $\\sum_a\\pi(Q^\\pi - V^\\pi) = V^\\pi - V^\\pi = 0$. advantage는 정책 평균 대비 상대값이다.' },
    ],
  });

  /* ---------- 할인율 실험실 ---------- */
  function mountDiscountLab(el) {
    const T = 30;
    const presets = {
      delayed: { label: '지연된 큰 보상 (t=20에 +10)', r: (k) => (k === 19 ? 10 : 0) },
      steady: { label: '꾸준한 작은 보상 (매 스텝 +0.5)', r: () => 0.5 },
      early: { label: '초반 보상 후 손실 (+3, +3, 이후 -0.3)', r: (k) => (k < 2 ? 3 : -0.3) },
      sparse: { label: '희소 보상 (t=5, 15, 25에 +2)', r: (k) => (k === 4 || k === 14 || k === 24 ? 2 : 0) },
    };
    const p = ui.panel(el, { kind: 'CALC', title: '할인율 실험실', caption: '보상 시퀀스를 고르고 $\\gamma$를 움직여 보라. 위 그래프는 각 시점 보상 $r_k$(막대)와 할인 가중치 $\\gamma^k$(선), 아래 그래프는 두 시퀀스의 리턴을 $\\gamma$의 함수로 비교한다.' });
    const ctr = ui.row(p.body);
    let key = 'delayed';
    let cmp = 'steady';
    const g = ui.slider(ctr, { label: '할인율 $\\gamma$', min: 0, max: 0.999, step: 0.001, value: 0.9, format: ui.fmt.f(3), onInput: draw });
    ui.select(ctr, { label: '시퀀스 A', value: key, options: Object.keys(presets).map((k) => ({ value: k, label: presets[k].label })), onChange: (v) => { key = v; draw(); } });
    ui.select(ctr, { label: '비교할 시퀀스 B', value: cmp, options: Object.keys(presets).map((k) => ({ value: k, label: presets[k].label })), onChange: (v) => { cmp = v; draw(); } });
    const st = ui.stats(p.body, [
      { key: 'GA', label: 'A의 리턴 $G_0$', tone: 'accent' },
      { key: 'GB', label: 'B의 리턴 $G_0$', tone: 'signal' },
      { key: 'H', label: '유효 지평 $1/(1-\\gamma)$' },
      { key: 'W', label: '$t=20$ 보상의 가중치 $\\gamma^{19}$' },
      { key: 'pref', label: '선호' },
    ]);
    RL.renderMath(p.body);
    const top = document.createElement('div');
    const bottom = document.createElement('div');
    p.body.append(top, bottom);
    const rets = (pk, gm) => { let G = 0; for (let k = 0; k < T; k++) G += Math.pow(gm, k) * presets[pk].r(k); return G; };
    const barChart = plot.bars(top, { categories: sim.range(T).map((k) => (k % 5 === 0 ? String(k + 1) : '')), series: [], height: 200, y: { label: '보상 / 가중치' }, legend: true });
    const lineOver = plot.line(bottom, { height: 230, x: { min: 0, max: 0.999, label: '할인율 γ' }, y: { label: '리턴 G₀' }, series: [] });
    function draw() {
      const gm = g.get();
      const ra = sim.range(T).map((k) => presets[key].r(k));
      const w = sim.range(T).map((k) => Math.pow(gm, k) * Math.max(1, Math.max(...ra.map(Math.abs))));
      barChart.update({ series: [
        { name: 'A의 보상 $r_k$', color: 'c1', values: ra },
        { name: '$\\gamma^k$ (A의 최대 보상 크기로 스케일)', color: 'c6', values: w, opacity: 0.45 },
      ] });
      const GA = rets(key, gm), GB = rets(cmp, gm);
      st.set('GA', GA.toFixed(3));
      st.set('GB', GB.toFixed(3));
      st.set('H', (1 / (1 - gm)).toFixed(1));
      st.set('W', Math.pow(gm, 19).toFixed(4));
      st.set('pref', Math.abs(GA - GB) < 1e-6 ? '동일' : GA > GB ? 'A가 낫다' : 'B가 낫다');
      const gs = sim.range(200).map((i) => i * 0.999 / 199);
      lineOver.update({
        series: [
          { name: 'A: ' + presets[key].label, color: 'c1', data: gs.map((x) => [x, rets(key, x)]) },
          { name: 'B: ' + presets[cmp].label, color: 'c2', data: gs.map((x) => [x, rets(cmp, x)]) },
        ],
        vlines: [{ x: gm, label: 'γ = ' + gm.toFixed(2) }],
      });
    }
    draw();
  }

  /* ---------- 직접 에이전트가 되어 보기 ---------- */
  function mountPlay(el) {
    const p = ui.panel(el, { kind: 'TRY', title: '내가 에이전트: A에서 무엇을 고를까', caption: '버튼을 누를 때마다 한 판이 진행된다. A로 되돌아오면 같은 선택을 다시 한다. 몇 판 해 보고 어느 쪽 평균이 높은지 예상한 뒤 "정답 보기"로 확인하라.' });
    const ctr = ui.row(p.body);
    const gS = ui.slider(ctr, { label: '할인율 $\\gamma$', min: 0.1, max: 0.99, step: 0.01, value: 0.9, format: ui.fmt.f(2), onInput: reset });
    const btns = ui.row(p.body, 'btns');
    ui.button(btns, '안전을 고른다 (+1, B로)', () => play(0), { primary: true });
    ui.button(btns, '모험을 고른다 (60%로 C, 40%로 −2)', () => play(1), { primary: true });
    const revealB = ui.button(btns, '정답 보기', () => { shown = true; upd(); });
    ui.button(btns, '다시 하기', reset);
    const st = ui.stats(p.body, [
      { key: 's', label: '안전: 해 본 횟수 / 평균 점수', tone: 'accent' },
      { key: 'r', label: '모험: 해 본 횟수 / 평균 점수', tone: 'signal' },
      { key: 'v', label: '정답 (그 선택을 계속할 때)' },
    ]);
    const log = document.createElement('div');
    log.className = 'log';
    p.body.appendChild(log);
    const r = sim.rng(42);
    let n = [0, 0], tot = [0, 0], lines = [], shown = false;
    void revealB;
    const exact = (gm, pr) => ((1 - pr) * (1 + 1.4 * gm) + pr * (6 * gm - 0.8)) / (1 - (1 - pr) * 0.3 * gm * gm);
    function play(choice) {
      const gm = gS.get();
      let s = 'A', G = 0, disc = 1;
      const path = ['A'];
      for (let t = 0; t < 100 && s !== '끝'; t++) {
        let rew = 0, nx;
        if (s === 'A') {
          if (choice === 1) { if (r() < 0.6) { nx = 'C'; rew = 0; } else { nx = '끝'; rew = -2; } }
          else { nx = 'B'; rew = 1; }
        } else if (s === 'B') { if (r() < 0.3) { nx = 'A'; rew = 0; } else { nx = '끝'; rew = 2; } }
        else { nx = '끝'; rew = 10; }
        G += disc * rew;
        path.push((rew >= 0 ? '+' : '') + rew + ' → ' + nx);
        disc *= gm;
        s = nx;
      }
      n[choice]++; tot[choice] += G;
      lines.unshift((choice ? '모험' : '안전') + ': ' + path.join('  ') + '   총점(할인) = ' + G.toFixed(2));
      lines = lines.slice(0, 6);
      upd();
    }
    function reset() { n = [0, 0]; tot = [0, 0]; lines = []; shown = false; upd(); }
    function upd() {
      const gm = gS.get();
      st.set('s', n[0] + '판 / ' + (n[0] ? (tot[0] / n[0]).toFixed(2) : '–'));
      st.set('r', n[1] + '판 / ' + (n[1] ? (tot[1] / n[1]).toFixed(2) : '–'));
      st.set('v', shown ? '안전 ' + exact(gm, 0).toFixed(2) + ' · 모험 ' + exact(gm, 1).toFixed(2) : '버튼으로 확인');
      log.textContent = lines.length ? lines.join('\n') : '아직 한 판도 하지 않았다. 위 버튼으로 시작하라.';
    }
    upd();
  }

  /* ---------- 작은 MDP 샘플러 ---------- */
  function mountSampler(el) {
    const p = ui.panel(el, { kind: 'SIM', title: '에피소드 샘플링으로 $V^\\pi(A)$ 추정하기' });
    const svgWrap = document.createElement('div');
    svgWrap.innerHTML = String.raw`
<svg viewBox="0 0 620 200" role="img" aria-label="작은 MDP">
  <defs><marker id="smp-ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--muted)"/></marker></defs>
  <g style="font-size:12px">
  <path id="e-AB" d="M112 88 L250 48" style="fill:none;stroke:var(--muted);stroke-width:1.5" marker-end="url(#smp-ar)"/>
  <text x="150" y="52" style="fill:var(--ink)">안전: +1</text>
  <path id="e-AC" d="M112 112 L250 152" style="fill:none;stroke:var(--muted);stroke-width:1.5" marker-end="url(#smp-ar)"/>
  <text x="122" y="160" style="fill:var(--ink)">모험 60%: 0</text>
  <path id="e-AT" d="M118 100 C 250 100, 380 100, 488 100" style="fill:none;stroke:var(--muted);stroke-width:1.5;stroke-dasharray:4 3" marker-end="url(#smp-ar)"/>
  <text x="235" y="94" style="fill:var(--ink)">모험 40%: −2</text>
  <path id="e-BA" d="M252 30 C 160 0, 100 30, 92 70" style="fill:none;stroke:var(--muted);stroke-width:1.5" marker-end="url(#smp-ar)"/>
  <text x="120" y="16" style="fill:var(--ink)">30%: 0</text>
  <path id="e-BT" d="M300 46 L494 88" style="fill:none;stroke:var(--muted);stroke-width:1.5" marker-end="url(#smp-ar)"/>
  <text x="380" y="52" style="fill:var(--ink)">70%: +2</text>
  <path id="e-CT" d="M300 154 L494 112" style="fill:none;stroke:var(--muted);stroke-width:1.5" marker-end="url(#smp-ar)"/>
  <text x="390" y="156" style="fill:var(--ink)">+10</text>
  </g>
  <g style="font-size:15px;font-weight:600">
  <circle cx="90" cy="100" r="26" style="fill:var(--accent-soft);stroke:var(--accent);stroke-width:2"/><text x="90" y="105" text-anchor="middle" style="fill:var(--ink)">A</text>
  <circle cx="276" cy="40" r="24" style="fill:var(--surface-2);stroke:var(--line);stroke-width:2"/><text x="276" y="45" text-anchor="middle" style="fill:var(--ink)">B</text>
  <circle cx="276" cy="160" r="24" style="fill:var(--surface-2);stroke:var(--line);stroke-width:2"/><text x="276" y="165" text-anchor="middle" style="fill:var(--ink)">C</text>
  <rect x="492" y="76" width="54" height="48" rx="6" style="fill:var(--surface-2);stroke:var(--line);stroke-width:2"/><text x="519" y="105" text-anchor="middle" style="fill:var(--ink)">종료</text>
  </g>
</svg>`;
    p.body.appendChild(svgWrap);
    const ctr = ui.row(p.body);
    const gS = ui.slider(ctr, { label: '할인율 $\\gamma$', min: 0, max: 0.99, step: 0.01, value: 0.9, format: ui.fmt.f(2), onInput: reset });
    const pS = ui.slider(ctr, { label: '$\\pi(\\text{모험}\\mid A)$', min: 0, max: 1, step: 0.05, value: 0.5, format: ui.fmt.f(2), onInput: reset });
    const btns = ui.row(p.body, 'btns');
    ui.button(btns, '에피소드 1개', () => run(1), { primary: true });
    ui.button(btns, '100개', () => run(100));
    ui.button(btns, '1000개', () => run(1000));
    ui.button(btns, '초기화', reset);
    const st = ui.stats(p.body, [
      { key: 'n', label: '샘플 수' },
      { key: 'mc', label: '샘플 평균 $\\hat V(A)$', tone: 'accent' },
      { key: 'v', label: '정확한 $V^\\pi(A)$', tone: 'signal' },
      { key: 'safe', label: '항상 안전일 때 $V(A)$' },
      { key: 'risk', label: '항상 모험일 때 $V(A)$' },
    ]);
    const log = document.createElement('div');
    log.className = 'log';
    const chartEl = document.createElement('div');
    p.body.append(chartEl, log);
    RL.renderMath(p.body);
    const chart = plot.line(chartEl, { height: 200, x: { label: '샘플 수', min: 1 }, y: { label: 'V(A) 추정' }, series: [] });
    const r = sim.rng(7);
    let n = 0, total = 0, hist = [], lines = [];

    function exactV(gm, pr) {
      // V(A)(1 - (1-p)·0.3γ²) = (1-p)(1 + 1.4γ) + p(6γ - 0.8)
      return ((1 - pr) * (1 + 1.4 * gm) + pr * (6 * gm - 0.8)) / (1 - (1 - pr) * 0.3 * gm * gm);
    }
    function episode(gm, pr) {
      let s = 'A', G = 0, disc = 1;
      const path = ['A'];
      const parts = [];
      for (let t = 0; t < 200; t++) {
        let rew = 0, nx;
        if (s === 'A') {
          if (r() < pr) { if (r() < 0.6) { nx = 'C'; rew = 0; } else { nx = '종료'; rew = -2; } path.push('(모험)'); }
          else { nx = 'B'; rew = 1; path.push('(안전)'); }
        } else if (s === 'B') { if (r() < 0.3) { nx = 'A'; rew = 0; } else { nx = '종료'; rew = 2; } }
        else { nx = '종료'; rew = 10; }
        G += disc * rew;
        parts.push(rew);
        disc *= gm;
        path.push(nx);
        s = nx;
        if (s === '종료') break;
      }
      return { G, text: path.join(' → ') + '   r = [' + parts.join(', ') + ']   G = ' + G.toFixed(3) };
    }
    function run(k) {
      const gm = gS.get(), pr = pS.get();
      for (let i = 0; i < k; i++) {
        const e = episode(gm, pr);
        n++; total += e.G;
        if (n <= 30 || n % Math.ceil(n / 60) === 0) hist.push([n, total / n]);
        if (i < 3) lines.unshift(e.text);
      }
      lines = lines.slice(0, 8);
      upd();
    }
    function reset() { n = 0; total = 0; hist = []; lines = []; upd(); }
    function upd() {
      const gm = gS.get(), pr = pS.get();
      const v = exactV(gm, pr);
      st.set('n', n);
      st.set('mc', n ? (total / n).toFixed(3) : '–');
      st.set('v', v.toFixed(3));
      st.set('safe', exactV(gm, 0).toFixed(3));
      st.set('risk', exactV(gm, 1).toFixed(3));
      log.textContent = lines.length ? lines.join('\n') : '버튼을 눌러 에피소드를 샘플링하세요. 최근 궤적이 여기에 표시됩니다.';
      chart.update({ series: [{ name: '샘플 평균', color: 'c1', data: hist.length ? hist : [[1, v]] }], hlines: [{ y: v, label: '정확한 값', color: 'signal' }], x: { label: '샘플 수', min: 1, max: Math.max(10, n) } });
    }
    upd();
  }
})();
