/* 11 정책 경사 정리 */
(function () {
  const { ui, sim, plot } = RL;

  RL.chapter({
    id: 'pg',
    title: '정책 경사 정리',
    subtitle: '가치를 먼저 배우고 argmax로 정책을 뽑는 대신, 정책의 파라미터를 기대 리턴의 경사 방향으로 직접 민다. 로그-미분 트릭 하나가 REINFORCE부터 GRPO까지를 낳는다.',
    time: 40,
    level: '중급 · 핵심',
    prereq: ['mdp', 'bandit'],
    theses: ['T3', 'T6'],
    easy: {
      hook: '잘된 선택은 더 자주, 안 된 선택은 덜 하도록 선택 확률을 직접 조금씩 옮긴다.',
      intro: '<p><a href="#home">홈 화면</a>에서 강아지에게 "앉아"를 가르쳐 봤다면, 이 장의 알고리즘을 이미 한 번 돌려 본 것이다. 강아지는 네 가지 행동을 확률대로 했고, 간식을 받은 행동의 확률이 올라갔다.</p><p>이 장의 규칙은 하나다. <strong>해 본 행동의 확률을, 받은 점수만큼 올리거나 내린다.</strong> 여기에 요령 하나를 더한다. 점수를 그대로 쓰지 않고 <strong>평소보다 얼마나 잘했는지</strong>를 쓰면 훨씬 덜 흔들린다.</p>',
      analogy: '시험에서 70점을 받았다고 하자. 칭찬할지 꾸중할지는 평소 점수에 달려 있다. 평소 50점이던 학생에게는 칭찬이고, 평소 90점이던 학생에게는 꾸중이다. 점수에서 "평소 점수"를 빼고 보는 것이 baseline이다. 빼는 값이 어떤 행동을 했는지와 상관없으면, 평균적으로 고치는 방향은 그대로이고 쓸데없는 흔들림만 줄어든다.',
      path: ['점수를 받은 행동의 확률이 얼마나 오르는지 손으로 계산한다', '점수를 나눠 주며 평균을 뺄 때와 안 뺄 때를 비교한다', '같은 규칙을 수식으로 적고 짧은 복도에서 돌려 본다', 'LLM 학습에서 이 규칙이 어떻게 쓰이는지 본다'],
      recap: [
        '정책 경사는 해 본 행동의 확률을 받은 점수만큼 올리고 내리는 방법이다.',
        '점수 대신 "평소보다 얼마나 잘했나"를 쓰면 평균적인 방향은 같고 흔들림만 줄어든다.',
        '세상이 어떻게 움직이는지 몰라도 되기 때문에, 답 하나에 점수 하나만 주어지는 LLM 학습에도 그대로 쓰인다.',
      ],
    },
    goals: [
      '궤적 분포에 로그-미분 트릭을 적용해 REINFORCE 추정량을 유도하고, 환경 동역학 항이 왜 사라지는지 설명할 수 있다.',
      'reward-to-go와 baseline이 기댓값을 바꾸지 않으면서 분산만 줄인다는 것을 증명하고 시뮬레이션으로 확인한다.',
      '정책 경사 정리 $\\nabla J = \\frac{1}{1-\\gamma}\\mathbb{E}_{d^\\pi,\\pi}[Q^\\pi\\nabla\\log\\pi]$를 진술하고, 지도학습(최대우도)이 그 특수한 경우임을 설명할 수 있다.',
    ],
    html: String.raw`
<p>Q-learning 계열은 가치를 배우고 $\arg\max_a Q(s,a)$로 행동을 고른다. 이 방식은 세 가지 상황에서 곤란해진다. 이 장은 그 대안, 즉 <strong>정책 자체를 미분 가능한 함수 $\pi_\theta(a\mid s)$로 두고 $J(\theta)$를 경사 상승</strong>하는 방법을 다룬다.</p>

<h2>왜 정책을 직접 최적화하나</h2>
<div class="grid2">
  <div class="card"><h4>연속 · 거대 행동 공간</h4><p>로봇 토크처럼 행동이 연속이면 매 스텝 $\max_a Q(s,a)$가 그 자체로 최적화 문제다. LLM은 어휘가 수만 개이고 응답은 그 곱 공간이다. 정책은 샘플링만 하면 된다.</p></div>
  <div class="card"><h4>확률적 최적 정책</h4><p>관측이 상태를 다 보여 주지 않으면(상태 별칭, aliasing) 결정적 정책은 같은 실수를 반복한다. 아래 "짧은 복도"에서 최적 정책은 오른쪽을 약 59% 확률로 고르는 <em>확률적</em> 정책이다. argmax로는 표현할 수 없다.</p></div>
  <div class="card"><h4>매끄러운 변화</h4><p>$Q$가 조금만 바뀌어도 argmax 정책은 불연속적으로 뒤집힐 수 있다. 정책 파라미터를 조금 움직이면 행동 확률도 조금만 변한다. 수렴 분석과 신뢰영역(13장)이 이 매끄러움에 기댄다.</p></div>
</div>
<p>목표는 앞서 정의한 기대 리턴이다(<a href="#mdp">01장</a>).</p>
$$J(\theta) = \mathbb{E}_{\tau\sim p_\theta}\big[R(\tau)\big], \qquad p_\theta(\tau) = \rho_0(s_0)\prod_{t\ge 0}\pi_\theta(a_t\mid s_t)\,P(s_{t+1}\mid s_t,a_t), \qquad R(\tau) = \sum_{t\ge0}\gamma^t r_{t+1}$$
<p>문제는 $R(\tau)$가 $\theta$에 대해 미분 불가능하고(환경이 블랙박스), 기댓값을 취하는 분포 자체가 $\theta$에 의존한다는 점이다.</p>

<h2>로그-미분 트릭: REINFORCE의 유도</h2>
<p>수식 전에 숫자로 먼저 해 보자. 행동이 둘뿐인 정책에서 보상을 한 번 받았을 때 확률이 얼마나 움직이는지 계산한다.</p>
<div data-w="step-softmax"></div>
<p>방금 한 계산을 일반적으로 적으면 아래와 같다.</p>
<div data-w="dv-reinforce"></div>
<div class="thesis-box"><span class="label">대전제 T3 · 점수함수 경사</span>
<p>$\nabla_\theta\mathbb{E}_{x\sim p_\theta}[f(x)] = \mathbb{E}_{x\sim p_\theta}[f(x)\nabla_\theta\log p_\theta(x)]$. $f$를 미분할 필요가 없고, 샘플을 뽑아 <strong>로그확률의 경사에 점수를 곱해 평균</strong>내기만 하면 된다. 궤적에 적용하면 모르는 동역학 $P$가 로그 안에서 덧셈 항으로 분리되어 $\theta$-미분에서 사라진다. 이 성질 덕분에 같은 식이 바둑, 로봇, 그리고 "응답 전체에 점수 하나"만 주어지는 LLM에 그대로 쓰인다(<a href="#rlhf">19장</a>, <a href="#reasoning">21장</a>).</p>
</div>
<p>점수함수(score function) $\nabla_\theta\log\pi_\theta$에는 핵심 성질이 하나 있다. 기댓값이 0이다.</p>
$$\mathbb{E}_{a\sim\pi_\theta}\big[\nabla_\theta\log\pi_\theta(a\mid s)\big] = \sum_a \pi_\theta(a\mid s)\frac{\nabla_\theta\pi_\theta(a\mid s)}{\pi_\theta(a\mid s)} = \nabla_\theta\sum_a\pi_\theta(a\mid s) = \nabla_\theta 1 = 0$$
<p>이 한 줄이 아래의 인과성(reward-to-go)과 baseline을 모두 정당화한다.</p>

<h2>인과성과 baseline: 기댓값은 그대로, 분산만 줄이기</h2>
<p>시점 $t$의 행동은 그 이전에 이미 받은 보상에 영향을 줄 수 없다. 위 성질을 쓰면 $t'\le t$인 보상 $r_{t'}$과 $\nabla\log\pi(a_t\mid s_t)$의 곱은 기댓값이 0이므로, 전체 리턴 $R(\tau)$ 대신 <strong>그 이후 보상의 합(reward-to-go)</strong> $G_t$만 곱해도 된다. 같은 논리로 행동에 의존하지 않는 임의의 함수 $b(s_t)$를 빼도 기댓값은 바뀌지 않는다.</p>
<p>baseline의 효과는 직접 점수를 줘 보면 바로 보인다. 특히 모든 점수가 양수인 상황에서, 평균을 빼지 않으면 나쁜 행동도 뽑히기만 하면 확률이 오른다.</p>
<div data-w="try-score"></div>
<div data-w="dv-baseline"></div>
<div data-w="fx-reinforce"></div>
<div class="key"><span class="label">해석</span>baseline은 통계학의 <strong>제어 변량(control variate)</strong>이다. "이 행동이 평소보다 나았나?"를 묻도록 점수의 영점을 옮긴다. $b(s) = V^\pi(s)$를 쓰면 곱해지는 양이 advantage $A^\pi(s,a) = Q^\pi(s,a) - V^\pi(s)$의 추정치가 되고, 그 $V$를 학습하는 것이 바로 Actor-Critic이다(<a href="#ac">12장</a>).</div>

<h2>실험: 짧은 복도에서의 REINFORCE</h2>
<p>Sutton & Barto(예제 13.1)의 짧은 복도. 상태 셋이 모두 같은 특징을 가져 에이전트는 자신이 어디 있는지 모른다. 두 번째 칸에서만 좌우가 뒤바뀐다. 매 스텝 −1, 오른쪽 끝에 도달하면 종료. 정책은 모든 칸에서 같은 확률 $p = \pi(\text{오른쪽}) = \sigma(\theta)$를 쓴다. 정확한 기대 리턴은 선형 방정식을 풀어 얻는다.</p>
$$J(p) = V(s_1) = \frac{2p-4}{p(1-p)}, \qquad p^* = 2-\sqrt2 \approx 0.586,\quad J(p^*)\approx -11.66$$
<p>$p\to0$이나 $p\to1$(결정적 정책)이면 $J\to-\infty$다. 아래 시뮬레이터는 실제로 에피소드를 샘플링하고 REINFORCE로 $\theta$를 갱신한다(baseline은 리턴의 이동평균). 읽는 법이 하나 있다. 이 환경은 리턴이 항상 음수라서, 같은 $\alpha$에서는 baseline이 없는 쪽의 갱신 폭이 커서 초반에 더 빨라 보일 수 있다. 차이는 <strong>실행 간 퍼짐</strong>(최종 $p$의 표준편차)과 <strong>큰 학습률에서의 안정성</strong>에서 드러난다. $\log_2\alpha$를 −7, −6으로 올려 보라. baseline이 없는 쪽이 먼저 무너진다.</p>
<div data-w="corridor"></div>

<h3>추정량의 분산을 직접 재 보기</h3>
<p>학습을 멈추고 정책 $p$를 고정한 채, 에피소드마다 만든 경사 추정치 $\hat g$의 평균과 표준편차를 비교한다. 네 추정량 모두 <strong>평균은 같고</strong>(불편추정), 표준편차만 다르다. 이것이 T6(편향-분산)의 가장 깨끗한 예다.</p>
<div data-w="grad-var"></div>

<h2>정책 경사 정리</h2>
<p>궤적 형태의 식을 상태-행동 형태로 다시 쓰면 Sutton et al.(2000)의 <strong>정책 경사 정리</strong>가 된다. 할인 상태 방문 분포 $d^\pi$(<a href="#mdp">01장</a>)가 여기서 등장한다.</p>
<div data-w="dv-pgt"></div>
<div class="warn"><span class="label">주의</span>정리의 우변에는 <strong>현재 정책</strong>의 방문 분포 $d^{\pi_\theta}$와 $Q^{\pi_\theta}$가 들어 있다. 그래서 기본 정책 경사는 on-policy다. 예전 정책으로 모은 데이터를 재사용하려면 중요도 비율 $\pi_\theta/\pi_{\text{old}}$로 보정해야 하고, 그 보정이 너무 커지지 않게 막는 장치가 TRPO와 PPO다(<a href="#ppo">13장</a>).</div>

<h3>소프트맥스 정책의 경사</h3>
<p>로짓 $\theta$에 대한 소프트맥스 정책 $\pi(a) = e^{\theta_a}/\sum_b e^{\theta_b}$에서 점수함수는 $\nabla_\theta\log\pi(a) = \mathbf{e}_a - \pi$ (원-핫 벡터 빼기 확률 벡터)이다. 밴딧이라면</p>
$$\frac{\partial J}{\partial\theta_b} = \pi(b)\big(q(b) - \textstyle\sum_a\pi(a)q(a)\big) = \pi(b)\,A(b)$$
<p>즉 평균보다 좋은 행동의 로짓은 올리고 나쁜 행동은 내린다. 05장의 <em>경사 밴딧 알고리즘</em>이 이 식의 샘플 버전이다. 계수 $\pi(b)$ 때문에 거의 선택되지 않는 행동은 좋아도 천천히 올라간다. 탐험이 따로 필요한 이유이고, 13장의 자연 경사가 이 계수를 지우는 방식이기도 하다.</p>

<h2>지도학습은 정책 경사의 특수한 경우다</h2>
<p>정책 경사를 "가중 최대우도"로 읽으면 여러 방법이 한 표에 정리된다.</p>
$$\underbrace{\nabla_\theta\,\mathbb{E}_{(s,a)\sim\mathcal{D}}\big[\log\pi_\theta(a\mid s)\big]}_{\text{지도학습 (SFT, 행동 복제)}} \quad\text{vs}\quad \underbrace{\mathbb{E}_{(s,a)\sim\pi_\theta}\big[\hat A(s,a)\,\nabla_\theta\log\pi_\theta(a\mid s)\big]}_{\text{정책 경사}}$$
<div class="table-wrap"><table class="t">
<thead><tr><th>방법</th><th>샘플 출처</th><th>로그우도에 곱하는 가중치</th><th>장</th></tr></thead>
<tbody>
<tr><td>SFT / 행동 복제</td><td>전문가 데이터 $\mathcal{D}$</td><td>1</td><td><a href="#offline">15</a></td></tr>
<tr><td>거절 샘플링 미세조정 (RFT, STaR)</td><td>자기 정책 $\pi_\theta$</td><td>정답이면 1, 아니면 0</td><td><a href="#memory">23</a></td></tr>
<tr><td>REINFORCE</td><td>자기 정책</td><td>$G_t$ (또는 $R(\tau)$)</td><td>이 장</td></tr>
<tr><td>REINFORCE + baseline</td><td>자기 정책</td><td>$G_t - b(s_t)$</td><td>이 장</td></tr>
<tr><td>RLOO (Kool et al. 2019; Ahmadian et al. 2024)</td><td>프롬프트당 $k$개 응답</td><td>$R_i - \frac{1}{k-1}\sum_{j\ne i}R_j$</td><td><a href="#reasoning">21</a></td></tr>
<tr><td>ReMax (Li et al. 2023)</td><td>샘플 응답 + 탐욕 응답</td><td>$R(\text{샘플}) - R(\text{탐욕 디코딩})$</td><td><a href="#reasoning">21</a></td></tr>
<tr><td>GRPO (Shao et al. 2024)</td><td>프롬프트당 $G$개 응답</td><td>$(R_i - \text{mean})/\text{std}$, 비율 clip</td><td><a href="#reasoning">21</a></td></tr>
</tbody></table></div>
<p>LLM에서는 응답 전체가 하나의 행동이고 보상은 끝에 한 번 주어지므로(밴딧에 가까움), 궤적 분해의 이점이 작고 <strong>baseline 설계가 거의 전부</strong>가 된다. 같은 프롬프트의 다른 샘플들을 baseline으로 쓰는 RLOO·GRPO가 critic 없이도 잘 동작하는 이유다.</p>

<h2>파생 알고리즘: 무엇이 바뀌었나</h2>
<div class="table-wrap"><table class="t">
<thead><tr><th>알고리즘</th><th>기반</th><th>바뀐 점</th><th>노린 효과</th></tr></thead>
<tbody>
<tr><td>REINFORCE (Williams 1992)</td><td>T3</td><td>궤적 리턴 × 점수함수</td><td>모델 없이 경사 추정</td></tr>
<tr><td>+ baseline</td><td>T3, T6</td><td>$G_t - b(s_t)$</td><td>분산 감소 (불편 유지)</td></tr>
<tr><td>Actor-Critic <a href="#ac">12</a></td><td>T6, T2</td><td>$G_t$ → $r + \gamma V(s') - V(s)$</td><td>분산 대폭 감소, 대신 편향</td></tr>
<tr><td>Natural PG (Kakade 2001) <a href="#ppo">13</a></td><td>T4</td><td>경사에 Fisher 역행렬을 곱함</td><td>파라미터화에 불변인 스텝</td></tr>
<tr><td>TRPO / PPO <a href="#ppo">13</a></td><td>T4</td><td>중요도 비율 + KL 제약 / clip</td><td>배치 재사용, 안정적 큰 스텝</td></tr>
<tr><td>DPG / DDPG <a href="#maxent">14</a></td><td>연쇄법칙</td><td>점수함수 대신 $\nabla_a Q$로 역전파</td><td>연속 행동에서 낮은 분산</td></tr>
<tr><td>RLOO / GRPO <a href="#reasoning">21</a></td><td>T3, T6</td><td>critic 제거, 그룹 내 다른 샘플이 baseline</td><td>LLM에서 메모리 절약</td></tr>
</tbody></table></div>
`,
    mount: {
      'dv-reinforce': (el) => ui.derivation(el, {
        title: '$\\nabla_\\theta J$를 샘플로 계산 가능한 형태로',
        easy: '보상을 미분할 수 없어도 괜찮다. "확률의 변화 = 확률 × 로그확률의 변화"라는 항등식 덕분에, 해 본 행동의 로그확률 기울기에 점수를 곱해 평균 내면 된다. 세상이 움직이는 규칙(전이 확률)은 정책과 무관해서 계산에서 빠진다.',
        steps: [
          { tex: String.raw`\nabla_\theta J(\theta) = \nabla_\theta \int p_\theta(\tau)\,R(\tau)\,d\tau = \int \hl{\nabla_\theta p_\theta(\tau)}\,R(\tau)\,d\tau`, why: '기댓값을 적분으로 쓰고 미분을 안으로 넣는다. $R(\\tau)$는 $\\theta$에 의존하지 않는다(궤적이 주어지면 보상은 정해진다).' },
          { tex: String.raw`\nabla_\theta p_\theta(\tau) = p_\theta(\tau)\,\hl{\nabla_\theta\log p_\theta(\tau)}`, why: '로그-미분 항등식 $\\nabla p = p\\,\\nabla\\log p$. 이것이 트릭의 전부다.', easy: '숫자로 보면: 확률이 0.2이고 그 기울기가 0.1이면, 로그확률의 기울기는 0.1 ÷ 0.2 = 0.5다. 여기에 다시 확률 0.2를 곱하면 원래 기울기 0.1로 돌아온다.' },
          { tex: String.raw`\nabla_\theta J(\theta) = \int p_\theta(\tau)\,\nabla_\theta\log p_\theta(\tau)\,R(\tau)\,d\tau = \hl{\mathbb{E}_{\tau\sim p_\theta}}\big[\nabla_\theta\log p_\theta(\tau)\,R(\tau)\big]`, why: '다시 기댓값으로 돌아왔다. 이제 $p_\\theta$에서 궤적을 샘플링해 평균내면 된다.' },
          { tex: String.raw`\log p_\theta(\tau) = \log\rho_0(s_0) + \sum_t \log\pi_\theta(a_t|s_t) + \sum_t \log P(s_{t+1}|s_t,a_t)`, why: '궤적 확률의 곱이 로그에서 합으로 분리된다.' },
          { tex: String.raw`\nabla_\theta\log p_\theta(\tau) = \sum_t \nabla_\theta\log\pi_\theta(a_t|s_t) + \hl{\nabla_\theta\Big[\log\rho_0 + \sum_t\log P\Big]} = \sum_t \nabla_\theta\log\pi_\theta(a_t|s_t) + \hl{0}`, why: '시작 분포와 전이 확률은 $\\theta$와 무관하므로 미분하면 0. <strong>환경 모델을 몰라도 된다.</strong>' },
          { tex: String.raw`\boxed{\;\nabla_\theta J(\theta) = \mathbb{E}_{\tau\sim\pi_\theta}\Big[\Big(\sum_{t}\nabla_\theta\log\pi_\theta(a_t|s_t)\Big)R(\tau)\Big]\;}`, why: 'REINFORCE (Williams 1992). 몬테카를로로 $\\hat g = \\frac1N\\sum_i\\sum_t\\nabla\\log\\pi(a_t^i|s_t^i)R(\\tau^i)$.' },
        ],
      }),
      'dv-baseline': (el) => ui.derivation(el, {
        title: 'baseline은 기댓값을 바꾸지 않는다',
        easy: '어떤 행동을 하든 똑같은 값을 빼면, 평균적으로 고치는 방향은 하나도 바뀌지 않는다. "확률을 올리는 방향"을 모든 행동에 대해 확률만큼 평균 내면 0이기 때문이다. 바뀌는 것은 한 번 한 번의 흔들림 크기뿐이다.',
        steps: [
          { tex: String.raw`\mathbb{E}_{\tau}\big[\nabla_\theta\log\pi_\theta(a_t|s_t)\,b(s_t)\big] = \mathbb{E}_{s_t}\Big[b(s_t)\,\hl{\mathbb{E}_{a_t\sim\pi_\theta(\cdot|s_t)}\big[\nabla_\theta\log\pi_\theta(a_t|s_t)\big]}\Big]`, why: '반복 기댓값. $b(s_t)$는 $a_t$에 의존하지 않으므로 안쪽 기댓값 밖으로 나온다.' },
          { tex: String.raw`= \mathbb{E}_{s_t}\big[b(s_t)\cdot \hl{0}\big] = 0`, why: '점수함수의 기댓값은 0.' },
          { tex: String.raw`\mathbb{E}\big[\nabla\log\pi(a_t|s_t)\,r_{t'}\big] = 0 \quad (t' \le t)`, why: '같은 논리로, $a_t$보다 먼저 정해진 보상 $r_{t\'}$은 $s_t$까지의 역사에만 의존하므로 곱의 기댓값이 0이다(인과성).' },
          { tex: String.raw`\nabla_\theta J = \mathbb{E}\Big[\sum_t \nabla_\theta\log\pi_\theta(a_t|s_t)\,\big(\hl{G_t - b(s_t)}\big)\Big],\qquad G_t = \sum_{k\ge t}\gamma^{k-t}r_{k+1}`, why: '두 사실을 합치면 reward-to-go에서 baseline을 뺀 형태. 기댓값은 원래 경사와 같고 분산은 보통 크게 준다.' },
          { tex: String.raw`b^*_i = \frac{\mathbb{E}\big[(\partial_i\log p_\theta(\tau))^2\,R(\tau)\big]}{\mathbb{E}\big[(\partial_i\log p_\theta(\tau))^2\big]}`, why: '분산을 최소화하는 상수 baseline은 점수 크기의 제곱으로 가중한 리턴의 평균이다(성분별). 실무에서는 계산이 쉬운 $V^\\pi(s)$를 근사 최적으로 쓴다.' },
        ],
      }),
      'fx-reinforce': (el) => ui.formula(el, {
        title: 'REINFORCE + baseline 추정량 해부',
        say: '{g|이번에 정책을 고칠 방향}은, {N|여러 판을 해 보고 평균 낸} 것으로, 판마다 각 선택에 대해 {score|그 선택을 더 자주 하게 만드는 방향}에 {G|그 뒤로 받은 점수의 합}에서 {b|평소 점수}를 뺀 만큼을 곱해 더한 것이다.',
        tex: String.raw`\tm{g}{\hat g} = \tm{N}{\frac{1}{N}\sum_{i=1}^{N}} \sum_{t} \tm{score}{\nabla_\theta\log\pi_\theta(a^i_t\mid s^i_t)}\,\big(\tm{G}{G^i_t} - \tm{b}{b(s^i_t)}\big)`,
        terms: [
          { id: 'g', sym: '\\hat g', label: '경사 추정치', desc: '$\\nabla_\\theta J$의 불편 추정. 확률변수.', long: '평균은 참 경사와 같지만 분산이 매우 클 수 있다. 학습률을 작게 잡아야 하는 이유. 아래 실험에서 이 분산을 직접 측정한다.' },
          { id: 'N', sym: '\\frac1N\\sum_i', label: '궤적 평균', desc: 'N개의 에피소드를 현재 정책으로 샘플링.', long: '샘플이 현재 정책에서 나와야 한다(on-policy). 정책을 한 번 업데이트하면 이 샘플들은 원칙적으로 버려야 한다. 재사용하려면 중요도 비율이 필요하다(13장).' },
          { id: 'score', sym: '\\nabla_\\theta\\log\\pi_\\theta', label: '점수함수', desc: '이 행동의 확률을 올리는 파라미터 방향.', long: '"이 행동을 더 자주 하려면 θ를 어디로 움직여야 하는가". 기댓값이 0이라는 성질이 baseline과 인과성을 정당화한다. 소프트맥스면 $\\mathbf{e}_a - \\pi$.' },
          { id: 'G', sym: 'G_t', label: 'reward-to-go', desc: '시점 t 이후의 보상 합. 과거 보상은 제외.', long: '행동 $a_t$가 영향을 줄 수 있는 보상만 남긴다. 전체 리턴 $R(\\tau)$를 쓰는 것보다 분산이 작다.' },
          { id: 'b', sym: 'b(s_t)', label: 'baseline', desc: '행동과 무관한 기준값. 보통 V(s_t) 추정.', long: '$G_t - b$가 양수면 "평소보다 잘했다"로 확률을 올리고, 음수면 내린다. 모든 보상이 음수인 환경(짧은 복도)에서 baseline이 없으면 모든 행동의 확률을 깎으려는 잡음 섞인 신호가 된다.' },
        ],
      }),
      'dv-pgt': (el) => ui.derivation(el, {
        title: '정책 경사 정리 (Sutton et al. 2000)',
        caption: '"다음 단계"를 누르며 한 줄씩 따라가 보라. $V^\\pi(s) = \\sum_a\\pi(a|s)Q^\\pi(s,a)$를 미분하고 전개를 반복한다.',
        easy: '한 판 전체 대신 "어느 상황에 얼마나 자주 가는지 × 그 상황에서 그 행동의 가치 × 그 행동 확률을 올리는 방향"으로 쓸 수 있다. 정책이 상황 방문 빈도를 바꾸는 효과는 행동의 가치 안에 이미 들어 있어서 따로 계산하지 않아도 된다.',
        steps: [
          { tex: String.raw`\nabla V^\pi(s) = \sum_a\Big[\hl{\nabla\pi(a|s)}\,Q^\pi(s,a) + \pi(a|s)\,\hl{\nabla Q^\pi(s,a)}\Big]`, why: '곱의 미분.' },
          { tex: String.raw`\nabla Q^\pi(s,a) = \nabla\Big[R(s,a) + \gamma\sum_{s'}P(s'|s,a)V^\pi(s')\Big] = \gamma\sum_{s'}P(s'|s,a)\,\hl{\nabla V^\pi(s')}`, why: '보상과 전이는 $\\theta$와 무관하다.' },
          { tex: String.raw`\nabla V^\pi(s) = \sum_a\nabla\pi(a|s)Q^\pi(s,a) + \gamma\sum_{s'}\Pr(s\to s',1)\,\hl{\nabla V^\pi(s')}`, why: '대입하면 $\\nabla V$에 대한 재귀식. 벨만 방정식과 같은 모양이다.' },
          { tex: String.raw`\nabla V^\pi(s_0) = \sum_{x}\hl{\sum_{k=0}^{\infty}\gamma^k\Pr(s_0\to x, k)}\;\sum_a\nabla\pi(a|x)\,Q^\pi(x,a)`, why: '재귀를 끝까지 펼친다. 가운데 합은 $s_0$에서 출발해 $x$를 할인 방문하는 횟수다.' },
          { tex: String.raw`\boxed{\;\nabla_\theta J(\theta) = \frac{1}{1-\gamma}\,\mathbb{E}_{s\sim d^{\pi_\theta},\,a\sim\pi_\theta}\big[Q^{\pi_\theta}(s,a)\,\nabla_\theta\log\pi_\theta(a|s)\big]\;}`, why: '할인 방문 횟수를 $(1-\\gamma)$로 정규화하면 $d^\\pi$이고, $\\nabla\\pi = \\pi\\nabla\\log\\pi$. <strong>방문 분포 $d^\\pi$의 경사가 식에 없다</strong>는 것이 정리의 핵심이다. 정책이 상태 분포를 바꾸는 효과는 $Q^\\pi$ 안에 이미 들어 있다.' },
        ],
      }),
      'step-softmax': (el) => ui.walkthrough(el, {
        title: '보상 한 번에 확률이 얼마나 움직이나',
        caption: '각 단계의 빈칸에 계산한 값을 넣고 "확인"을 누르라. 막히면 "바로 보기"를 눌러도 된다.',
        steps: [
          { say: '행동은 왼쪽, 오른쪽 둘이다. 정책은 행동마다 "선호 점수"를 두고, 소프트맥스로 확률을 만든다. 지금 선호 점수는 둘 다 0이다. 오른쪽 확률은?', ask: { answer: 0.5, tol: 0.01 }, calc: String.raw`\pi(\text{오른쪽}) = \frac{e^{0}}{e^{0} + e^{0}} = \frac{1}{2} = 0.5` },
          { say: '오른쪽을 했더니 보상 +1을 받았다. "이 행동을 더 자주 하게 만드는 방향"(점수함수)은 고른 행동의 선호 점수에 대해 <strong>1 − 확률</strong>, 안 고른 행동에 대해 <strong>0 − 확률</strong>이다. 오른쪽 선호 점수 쪽의 값은?', ask: { answer: 0.5, tol: 0.01 }, calc: String.raw`\frac{\partial\log\pi(\text{오른쪽})}{\partial h_{\text{오른쪽}}} = 1 - 0.5 = 0.5,\qquad \frac{\partial\log\pi(\text{오른쪽})}{\partial h_{\text{왼쪽}}} = 0 - 0.5 = -0.5` },
          { say: '학습률 1로 "선호 점수 += 학습률 × 보상 × 점수함수"를 한다. 오른쪽 선호 점수는 얼마가 될까?', ask: { answer: 0.5, tol: 0.01 }, calc: String.raw`h_{\text{오른쪽}} = 0 + 1\times1\times0.5 = 0.5,\qquad h_{\text{왼쪽}} = 0 + 1\times1\times(-0.5) = -0.5` },
          { say: '새 오른쪽 확률은? ($e^{0.5}\\approx1.649$, $e^{-0.5}\\approx0.607$)', ask: { answer: 0.731, rtol: 0.01 }, calc: String.raw`\pi(\text{오른쪽}) = \frac{e^{0.5}}{e^{0.5} + e^{-0.5}} = \frac{1.649}{2.256} \approx 0.731` },
          { say: '이번에는 평소 점수(baseline) 0.6을 빼고 같은 계산을 한다. 보상 1 대신 1 − 0.6 = 0.4를 곱하니, 오른쪽 선호 점수는 0.2만 오르고 확률은 약 0.60이 된다. 평소보다 조금 잘한 만큼만 조금 올라간다.', calc: String.raw`h_{\text{오른쪽}} = 0 + 1\times(1 - 0.6)\times0.5 = 0.2,\qquad \pi(\text{오른쪽}) = \frac{1}{1 + e^{-0.4}} \approx 0.599`, note: '이 다섯 줄이 REINFORCE의 전부다. 아래 유도는 같은 계산이 여러 걸음짜리 문제에서도 성립함을 보여 준다.' },
        ],
      }),
      'try-score': mountScoreGame,
      corridor: mountCorridor,
      'grad-var': mountGradVar,
    },
    tacit: [
      { tag: 'math', t: '점수함수 추정량 vs 경로 미분(재매개화) 추정량',
        d: '<p>$\\nabla\\mathbb{E}_{p_\\theta}[f]$를 추정하는 방법은 두 가지다. 점수함수(likelihood ratio)는 $f$를 블랙박스로 두지만 분산이 $f$의 <em>크기</em>에 비례하고, 경로 미분 $\\mathbb{E}_\\epsilon[\\nabla_\\theta f(g_\\theta(\\epsilon))]$은 $f$가 미분 가능해야 하지만 분산이 $f$의 <em>기울기</em>에 비례한다. VAE와 SAC(14장)는 후자, REINFORCE·PPO·GRPO는 전자다. 이산 토큰과 검증기 보상(정답/오답)을 쓰는 LLM RL이 점수함수 쪽에 머무는 근본 이유다(Mohamed et al. 2020 리뷰).</p>' },
      { tag: 'math', t: '실무의 "정책 경사"는 대개 어떤 함수의 경사도 아니다',
        d: '<p>정리를 정확히 따르면 시점 $t$의 항에 $\\gamma^t$가 곱해져야 한다($d^\\pi$의 할인). 거의 모든 구현은 이 $\\gamma^t$를 버리고 $\\gamma$를 리턴 계산에만 쓴다. Thomas(2014)와 Nota & Thomas(2020, "Is the Policy Gradient a Gradient?")는 이렇게 얻은 업데이트가 어떤 목적함수의 경사도 아님을 보였다. 그래도 잘 되는 이유는 "후반 상태를 덜 중요하게 다루는" 원래 식이 실제 목표(평균 성능)와 오히려 어긋나기 때문이라는 해석이 많다. 수식과 코드가 다를 때 어느 쪽이 실제 목표에 맞는지 묻는 습관이 필요하다.</p>' },
      { tag: 'algo', t: '정책 경사 = 이득으로 가중한 자기 샘플 최대우도',
        d: '<p>$\\sum_i \\hat A_i\\,\\nabla\\log\\pi(a_i|s_i)$는 가중치 $\\hat A_i$를 붙인 로그우도의 경사다. 그래서 RL 미세조정은 "자기가 만든 샘플로 하는 가중 SFT"로 볼 수 있고, 가중치를 $\\{0,1\\}$로 자르면 거절 샘플링 미세조정(STaR, RFT, 23장)이 된다. 후자는 음의 신호를 버려 편향되지만 분산이 작고 구현이 단순하다. 둘 사이의 연속체가 보상가중회귀(RWR, AWR: $w = e^{A/\\beta}$, 15장)이다.</p>' },
      { tag: 'math', t: '최적 baseline은 V가 아니다',
        d: '<p>분산 최소 baseline은 $\\|\\nabla\\log\\pi\\|^2$로 가중한 리턴의 평균이다(Greensmith, Bartlett, Baxter 2004). $V^\\pi(s)$는 "점수의 크기가 행동마다 비슷하다"는 가정에서의 근사다. 대부분의 경우 충분히 좋지만, 확률이 아주 낮은 행동(점수의 크기가 큼)이 큰 보상을 받는 문제에서는 차이가 난다. 또 baseline은 행동에만 의존하지 않으면 되므로, 미래 정보까지 쓰는 "궤적 의존 baseline"이나 다른 샘플의 평균(RLOO)도 유효하다. 단 자기 자신의 보상을 포함한 평균은 아주 약간의 편향을 만든다(GRPO의 그룹 평균이 그 경우로, 계수 $(G-1)/G$만큼 스케일된다).</p>' },
      { tag: 'practice', t: '소프트맥스 정책 경사는 "중력 우물"에 빠진다',
        d: '<p>정확한 경사를 써도 소프트맥스 정책은 거의 결정적인 나쁜 정책 근처에서 극도로 느려진다. 경사가 $\\pi(a)A(a)$ 꼴이라 좋은 행동의 확률이 0에 가까우면 신호도 0에 가깝기 때문이다. Mei et al.(2020)은 수렴률이 $O(1/t)$이고 초기화에 따라 지수적으로 오래 걸릴 수 있음을 보였다. 엔트로피 정규화(T5), 자연 경사(13장), 충분한 초기 탐험이 처방이다. LLM에서 "베이스 모델이 한 번도 맞히지 못한 문제는 RL로도 배우지 못한다"는 관찰과 같은 구조다(21장).</p>' },
      { tag: 'research', t: '비볼록인데 전역 수렴한다: 경사 지배성',
        d: '<p>$J(\\theta)$는 $\\theta$에 대해 비볼록이지만, 표 형태 소프트맥스 정책에서는 정책 경사가 전역 최적에 수렴한다(Agarwal et al. 2021). 열쇠는 <em>경사 지배(gradient domination)</em>: 정상점에서의 경사 크기가 최적성 간격을 위에서 누른다. 대신 상수로 분포 불일치 계수 $\\|d^{\\pi^*}/\\rho\\|_\\infty$가 등장한다. 즉 "최적 정책이 가는 곳을 시작 분포가 덮지 못하면" 느려진다. 탐험이 최적화 이론에 들어오는 지점이다.</p>' },
    ],
    quiz: [
      { q: 'REINFORCE 유도에서 전이 확률 $P(s_{t+1}|s_t,a_t)$가 최종 식에서 사라지는 이유는?', options: ['마르코프 성질 때문에', '$\\log p_\\theta(\\tau)$에서 덧셈 항으로 분리되고 $\\theta$에 의존하지 않아서', '보상이 결정적이어서', '$\\gamma<1$이어서'], answer: 1,
        explain: '궤적 확률의 로그는 정책 항과 동역학 항의 합이고, 동역학 항은 $\\theta$를 포함하지 않아 미분하면 0이다. 모델 없이 경사를 추정할 수 있는 이유.' },
      { q: 'baseline $b(s_t)$를 빼도 경사의 기댓값이 변하지 않는 핵심 이유는?', options: ['$b$가 작아서', '$\\mathbb{E}_{a\\sim\\pi}[\\nabla\\log\\pi(a|s)] = 0$이어서', '$b$를 학습하므로', '분산이 줄어들어서'], answer: 1,
        explain: '점수함수의 기댓값이 0이므로 행동과 무관한 $b(s)$와의 곱도 기댓값이 0이다. 분산 감소는 결과이지 이유가 아니다.' },
      { q: '짧은 복도에서 최적 정책이 결정적이지 않은 이유는?', options: ['보상이 확률적이어서', '세 상태를 구분할 수 없어(상태 별칭) 모든 상태에서 같은 행동 분포를 써야 해서', '할인율이 1이어서', 'REINFORCE의 분산 때문에'], answer: 1,
        explain: '관측이 같으면 같은 정책을 써야 한다. 결정적 정책은 한쪽 끝에 영원히 갇힌다. 부분 관측(POMDP)에서는 확률적 정책이 최적일 수 있다.' },
      { q: 'RLOO에서 응답 $i$의 baseline은?', options: ['같은 프롬프트의 모든 응답 보상 평균', '나머지 $k-1$개 응답 보상의 평균', '학습된 가치 함수', '탐욕 디코딩 응답의 보상'], answer: 1,
        explain: '자기 자신을 뺀 평균(leave-one-out)이라 $R_i$와 독립이므로 불편이다. 탐욕 응답의 보상을 쓰는 것은 ReMax.' },
    ],
  });

  /* ---------- 짧은 복도 ---------- */
  const sig = (x) => 1 / (1 + Math.exp(-x));
  const Jc = (p) => (2 * p - 4) / (p * (1 - p));
  const dJc = (p) => (2 * p * p - 8 * p + 4) / (p * (1 - p)); // dJ/dθ (θ = logit p)
  const Vc = (p) => { const v2 = (p - 3) / (p * (1 - p)); return [v2 - 1 / p, v2, -1 + (1 - p) * v2]; };
  function corridorEpisode(p, r, cap) {
    let s = 0;
    const acts = [], states = [];
    for (let t = 0; t < cap; t++) {
      const right = r() < p;
      acts.push(right); states.push(s);
      if (s === 0) s = right ? 1 : 0;
      else if (s === 1) s = right ? 0 : 2;
      else s = right ? -1 : 1;
      if (s < 0) break;
    }
    return { acts, states };
  }

  function mountCorridor(el) {
    const p = ui.panel(el, { kind: 'SIM', title: '짧은 복도: REINFORCE vs REINFORCE + baseline', caption: '"학습 실행"을 누르면 20번의 독립 학습을 평균 낸 곡선이 그려진다. 위 그래프에서 두 곡선이 최적선(−11.66)에 다가가는 속도를, 오른쪽 아래 그래프에서 최종 점들이 얼마나 흩어져 있는지를 보라.' });
    p.body.insertAdjacentHTML('beforeend', String.raw`<svg viewBox="0 0 560 74" role="img" aria-label="짧은 복도" style="width:100%;max-width:560px">
  <g style="font-size:12px">
    <rect x="20" y="16" width="100" height="40" rx="6" style="fill:var(--accent-soft);stroke:var(--accent)"/><text x="70" y="41" text-anchor="middle" style="fill:var(--ink)">s₁ 시작</text>
    <rect x="150" y="16" width="100" height="40" rx="6" style="fill:var(--signal-soft);stroke:var(--signal)"/><text x="200" y="36" text-anchor="middle" style="fill:var(--ink)">s₂</text><text x="200" y="50" text-anchor="middle" style="fill:var(--muted)">좌우 반전</text>
    <rect x="280" y="16" width="100" height="40" rx="6" style="fill:var(--surface-2);stroke:var(--line)"/><text x="330" y="41" text-anchor="middle" style="fill:var(--ink)">s₃</text>
    <rect x="410" y="16" width="100" height="40" rx="6" style="fill:var(--surface);stroke:var(--good)"/><text x="460" y="41" text-anchor="middle" style="fill:var(--ink)">종료 G</text>
    <text x="280" y="70" text-anchor="middle" style="fill:var(--muted)">매 스텝 보상 −1 · 세 상태의 관측이 모두 같다</text>
  </g></svg>`);
    const ctr = ui.row(p.body);
    const aS = ui.slider(ctr, { label: '학습률 $\\log_2\\alpha$', min: -14, max: -6, step: 1, value: -10, format: (v) => String(v) });
    const p0S = ui.slider(ctr, { label: '초기 $p_0 = \\pi(\\text{오른쪽})$', min: 0.05, max: 0.95, step: 0.05, value: 0.1, format: ui.fmt.f(2) });
    const eS = ui.slider(ctr, { label: '에피소드 수', min: 200, max: 2000, step: 100, value: 800, format: ui.fmt.int });
    const btns = ui.row(p.body, 'btns');
    let seed = 1;
    ui.button(btns, '학습 실행 (20회 평균)', () => { run(); }, { primary: true });
    ui.button(btns, '다른 시드로', () => { seed += 20; run(); });
    const st = ui.stats(p.body, [
      { key: 'opt', label: '최적 $J(p^*)$', value: Jc(2 - Math.SQRT2).toFixed(2) },
      { key: 'a', label: 'baseline 없음: 마지막 100회 평균', tone: 'accent' },
      { key: 'b', label: 'baseline 있음: 마지막 100회 평균', tone: 'signal' },
      { key: 'sa', label: '최종 $p$의 실행 간 표준편차 (없음 / 있음)' },
    ]);
    const c1 = document.createElement('div');
    const split = document.createElement('div');
    split.className = 'w-split';
    const c2 = document.createElement('div');
    const c3 = document.createElement('div');
    split.append(c2, c3);
    p.body.append(c1, split);
    const lc = plot.line(c1, { height: 240, x: { label: '에피소드', min: 0 }, y: { label: '에피소드 총 보상 (20회 평균, 이동평균 20)' }, series: [] });
    const pc = plot.line(c2, { height: 220, x: { label: '에피소드', min: 0 }, y: { label: 'p = π(오른쪽)', min: 0, max: 1 }, series: [] });
    const jc = plot.line(c3, { height: 220, x: { label: 'p = π(오른쪽)', min: 0, max: 1 }, y: { label: 'J(p)', min: -60, max: -8 }, series: [] });

    function train(alpha, base, p0, E, sd) {
      const r = sim.rng(sd);
      let th = Math.log(p0 / (1 - p0)), b = 0;
      const rets = new Array(E), ps = new Array(E);
      for (let e = 0; e < E; e++) {
        const pp = sig(th);
        const { acts } = corridorEpisode(pp, r, 1000);
        const T = acts.length;
        rets[e] = -T; ps[e] = pp;
        let g = 0;
        for (let t = 0; t < T; t++) {
          const G = -(T - t);
          g += (G - (base ? b : 0)) * (acts[t] ? 1 - pp : -pp);
          if (base) b += 0.05 * (G - b);
        }
        th = sim.clamp(th + alpha * g, -9, 9);
      }
      return { rets, ps, pEnd: sig(th) };
    }
    function run() {
      const alpha = Math.pow(2, aS.get()), p0 = p0S.get(), E = eS.get(), R = 20;
      const out = [0, 1].map((base) => {
        const ret = new Array(E).fill(0), pm = new Array(E).fill(0), ends = [];
        for (let k = 0; k < R; k++) {
          const o = train(alpha, base, p0, E, seed + k);
          for (let e = 0; e < E; e++) { ret[e] += o.rets[e] / R; pm[e] += o.ps[e] / R; }
          ends.push(o.pEnd);
        }
        return { ret, pm, ends };
      });
      const step = Math.max(1, Math.floor(E / 300));
      const thin = (arr) => arr.map((v, i) => [i + 1, v]).filter((_, i) => i % step === 0);
      const sm = out.map((o) => sim.smooth(o.ret, 20));
      lc.update({
        x: { label: '에피소드', min: 0, max: E },
        series: [
          { name: 'REINFORCE', color: 'c1', data: thin(sm[0]) },
          { name: 'REINFORCE + baseline', color: 'c2', data: thin(sm[1]) },
        ],
        hlines: [{ y: Jc(2 - Math.SQRT2), label: '최적 −11.66', color: 'good' }],
      });
      pc.update({
        x: { label: '에피소드', min: 0, max: E },
        series: [
          { name: 'REINFORCE 평균 p', color: 'c1', data: thin(out[0].pm) },
          { name: '+ baseline 평균 p', color: 'c2', data: thin(out[1].pm) },
        ],
        hlines: [{ y: 2 - Math.SQRT2, label: 'p* = 0.586', color: 'good' }],
      });
      jc.update({
        series: [
          { name: 'J(p) 정확한 값', color: 'c6', data: plot.sample(Jc, 0.04, 0.96, 200), endDot: false },
          { name: '최종 p (baseline 없음)', color: 'c1', type: 'scatter', r: 4, data: out[0].ends.map((x) => [x, Jc(x)]) },
          { name: '최종 p (baseline)', color: 'c2', type: 'scatter', r: 4, data: out[1].ends.map((x) => [x, Jc(x) + 0.0001]) },
        ],
        vlines: [{ x: 2 - Math.SQRT2, label: 'p*' }],
      });
      const last = (o) => sim.mean(o.ret.slice(-100));
      st.set('a', last(out[0]).toFixed(2));
      st.set('b', last(out[1]).toFixed(2));
      st.set('sa', sim.std(out[0].ends).toFixed(3) + ' / ' + sim.std(out[1].ends).toFixed(3));
    }
    run();
  }

  /* ---------- 경사 추정량 분산 ---------- */
  function mountGradVar(el) {
    const p = ui.panel(el, { kind: 'CALC', title: '같은 평균, 다른 분산: 네 가지 경사 추정량', caption: '슬라이더로 정책 $p$를 고르고 "다시 샘플링"을 눌러 보라. 막대 높이는 네 가지 방법으로 만든 경사 추정치 $\\hat g$가 한 판마다 얼마나 흩어지는지다. 막대는 표준편차(에피소드 1개 기준), 표의 평균은 모두 참 경사 $dJ/d\\theta$ 근처여야 한다.' });
    const ctr = ui.row(p.body);
    const pS = ui.slider(ctr, { label: '고정 정책 $p$', min: 0.1, max: 0.9, step: 0.02, value: 0.3, format: ui.fmt.f(2), onInput: () => run() });
    const nS = ui.slider(ctr, { label: '샘플 에피소드 수', min: 200, max: 4000, step: 200, value: 2000, format: ui.fmt.int, onInput: () => run() });
    const btns = ui.row(p.body, 'btns');
    let seed = 11;
    ui.button(btns, '다시 샘플링', () => { seed++; run(); }, { primary: true });
    const st = ui.stats(p.body, [{ key: 'true', label: '참 경사 $dJ/d\\theta$', tone: 'signal' }]);
    const chart = document.createElement('div');
    const tbl = document.createElement('div');
    tbl.className = 'table-wrap';
    p.body.append(chart, tbl);
    const names = ['전체 리턴 R(τ)', 'reward-to-go G_t', 'G_t − 상수 b (= J)', 'G_t − V(s_t) (오라클)'];
    const bc = plot.bars(chart, { categories: ['R(τ)', 'G_t', 'G_t − J', 'G_t − V(s_t)'], series: [], height: 220, y: { label: '한 에피소드 추정치의 표준편차', min: 0 }, labels: true, labelFmt: (v) => v.toFixed(1), legend: false });
    function run() {
      const pp = pS.get(), N = nS.get();
      const r = sim.rng(seed);
      const V = Vc(pp), J = Jc(pp);
      const acc = [[], [], [], []];
      for (let i = 0; i < N; i++) {
        const { acts, states } = corridorEpisode(pp, r, 3000);
        const T = acts.length;
        const g = [0, 0, 0, 0];
        for (let t = 0; t < T; t++) {
          const sc = acts[t] ? 1 - pp : -pp;
          const G = -(T - t);
          g[0] += -T * sc;
          g[1] += G * sc;
          g[2] += (G - J) * sc;
          g[3] += (G - V[states[t]]) * sc;
        }
        g.forEach((x, k) => acc[k].push(x));
      }
      const means = acc.map(sim.mean), stds = acc.map(sim.std);
      st.set('true', dJc(pp).toFixed(3));
      bc.update({ series: [{ name: '표준편차', color: 'c1', colors: ['c4', 'c1', 'c3', 'c2'], values: stds }] });
      tbl.innerHTML = '<table class="t"><thead><tr><th>추정량</th><th>평균 (N개)</th><th>평균의 표준오차</th><th>표준편차 (1개)</th></tr></thead><tbody>' +
        names.map((nm, k) => '<tr><td>' + nm + '</td><td class="num" style="white-space:nowrap">' + means[k].toFixed(3) + '</td><td class="num" style="white-space:nowrap">± ' + (stds[k] / Math.sqrt(N)).toFixed(3) + '</td><td class="num" style="white-space:nowrap">' + stds[k].toFixed(2) + '</td></tr>').join('') +
        '</tbody></table>';
    }
    run();
  }
  /* ---------- 점수 나눠 주기 ---------- */
  function pickIdx(pr, u) {
    let c = 0;
    for (let i = 0; i < pr.length; i++) { c += pr[i]; if (u < c) return i; }
    return pr.length - 1;
  }
  function mountScoreGame(el) {
    const p = ui.panel(el, { kind: 'TRY', title: '점수 나눠 주기: 평균을 빼면 무엇이 달라질까', caption: '"한 번 해 보기"를 누르면 행동 하나가 막대의 확률대로 뽑힌다. 그 행동에 점수 버튼으로 점수를 주고, 막대가 어떻게 움직이는지 보라. "평균 빼기"를 켜면 점수 대신 "점수 − 지금까지의 평균 점수"로 고친다.' });
    const acts = ['A', 'B', 'C'];
    const lr = 0.5;
    const r = sim.rng(9);
    let h = [0, 0, 0], last = null, avg = 0, seen = 0, prev = null;
    const ctr = ui.row(p.body);
    const base = ui.checkbox(ctr, { label: '평균 빼기 (baseline)', value: false });
    const btns = ui.row(p.body, 'btns');
    const tryB = ui.button(btns, '한 번 해 보기', pick, { primary: true });
    const give = [3, 1, -1].map((v) => ui.button(btns, (v > 0 ? '+' : '−') + Math.abs(v) + '점 주기', () => reward(v)));
    ui.button(btns, '처음부터', reset);
    const msg = document.createElement('div');
    msg.className = 'fx-detail';
    const barsEl = document.createElement('div');
    p.body.append(msg, barsEl);
    const st = ui.stats(p.body, [
      { key: 'n', label: '준 점수 횟수' },
      { key: 'avg', label: '지금까지 평균 점수' },
      { key: 'mult', label: '마지막에 곱한 값', tone: 'accent' },
    ]);
    const bars = plot.bars(barsEl, { categories: acts, series: [], height: 190, y: { min: 0, max: 1 }, labels: true, labelFmt: (v) => Math.round(v * 100) + '%' });
    const autoHead = document.createElement('p');
    autoHead.className = 'w-caption';
    autoHead.innerHTML = '<strong>자동 실험.</strong> 점수가 늘 양수인 경우(A는 2점, B는 4점, C는 3점)를 30판씩 두 방식으로 돌린다. 두 방식은 같은 난수로 행동을 뽑는다.';
    const autoBtns = ui.row(null, 'btns');
    ui.button(autoBtns, '자동 실험 30판', () => auto(), { primary: true });
    const autoOut = document.createElement('div');
    autoOut.className = 'table-wrap';
    p.body.append(autoHead, autoBtns, autoOut);
    let autoSeed = 1;
    function draw(text) {
      const pr = sim.softmax(h);
      const series = [];
      if (prev) series.push({ name: '고치기 전', color: 'muted', values: prev, opacity: 0.45 });
      series.push({ name: '지금', color: 'c1', values: pr });
      bars.update({ series });
      msg.innerHTML = text;
      st.set('n', seen);
      st.set('avg', seen ? avg.toFixed(2) : '–');
      tryB.disabled = last != null;
      give.forEach((b) => (b.disabled = last == null));
    }
    function pick() {
      last = pickIdx(sim.softmax(h), r());
      draw('행동 <strong>' + acts[last] + '</strong>가 뽑혔다. 점수를 주자.');
    }
    function reward(v) {
      if (last == null) return;
      const pr = sim.softmax(h);
      const useBase = base.get();
      const mult = useBase ? v - avg : v;
      for (let i = 0; i < 3; i++) h[i] += lr * mult * ((i === last ? 1 : 0) - pr[i]);
      prev = pr;
      const now = sim.softmax(h);
      const idx = last, a = acts[idx];
      const how = useBase ? (v + ' − 평균 ' + avg.toFixed(2) + ' = ' + (mult >= 0 ? '+' : '') + mult.toFixed(2)) : ('점수 그대로 ' + (v > 0 ? '+' : '') + v);
      const dir = now[idx] > pr[idx] ? '올랐다' : '내렸다';
      st.set('mult', (mult >= 0 ? '+' : '') + mult.toFixed(2));
      seen++;
      avg += (v - avg) / seen;
      last = null;
      draw(a + '에 ' + (v > 0 ? '+' : '') + v + '점. 곱한 값 = ' + how + '. ' + a + ' 확률이 ' + Math.round(pr[idx] * 100) + '%에서 ' + Math.round(now[idx] * 100) + '%로 ' + dir + '.');
    }
    function reset() { h = [0, 0, 0]; last = null; avg = 0; seen = 0; prev = null; st.set('mult', '–'); draw('세 행동이 모두 33%다. "한 번 해 보기"를 눌러 시작하자.'); }
    function runPair(seed) {
      const R = [2, 4, 3];
      const rr = sim.rng(seed);
      const hs = [[0, 0, 0], [0, 0, 0]], av = [0, 0], n = [0, 0], up = [0, 0], cnt = [0, 0];
      for (let t = 0; t < 30; t++) {
        const u = rr();
        for (let k = 0; k < 2; k++) {
          const pr = sim.softmax(hs[k]);
          const a = pickIdx(pr, u);
          const m = k ? R[a] - av[k] : R[a];
          for (let i = 0; i < 3; i++) hs[k][i] += lr * m * ((i === a ? 1 : 0) - pr[i]);
          if (a === 0) { cnt[k]++; if (sim.softmax(hs[k])[0] > pr[0]) up[k]++; }
          n[k]++; av[k] += (R[a] - av[k]) / n[k];
        }
      }
      return { pr: hs.map((x) => sim.softmax(x)), up, cnt };
    }
    function auto() {
      const one = runPair(autoSeed++);
      let mB = [0, 0];
      for (let i = 0; i < 300; i++) { const o = runPair(1000 + i); mB[0] += o.pr[0][1] / 300; mB[1] += o.pr[1][1] / 300; }
      const pc = (x) => Math.round(x * 100) + '%';
      autoOut.innerHTML = '<table class="t"><thead><tr><th>방식</th><th>30판 뒤 A / B / C 확률</th><th>나쁜 행동 A가 뽑혔을 때 A 확률이 오른 횟수</th><th>300번 반복한 평균 B 확률</th></tr></thead><tbody>' +
        ['점수 그대로', '평균 빼기'].map((nm, k) => '<tr><td>' + nm + '</td><td class="num" style="white-space:nowrap">' + one.pr[k].map(pc).join(' / ') + '</td><td class="num">' + one.up[k] + ' / ' + one.cnt[k] + '</td><td class="num">' + pc(mB[k]) + '</td></tr>').join('') +
        '</tbody></table><p class="w-caption" style="padding:8px 12px;margin:0">점수 그대로 쓰면 A(2점)도 뽑히기만 하면 확률이 오른다. 결국 "먼저 많이 뽑힌 행동"이 이기기 쉽다. 평균을 빼면 A의 곱한 값이 음수가 되어 내려간다. 버튼을 다시 누르면 다른 난수로 한 번 더 돌린다.</p>';
    }
    reset();
    auto();
  }
})();
