/* 14 연속 제어와 최대 엔트로피 */
(function () {
  const { ui, sim, plot } = RL;

  RL.chapter({
    id: 'maxent',
    title: '연속 제어와 최대 엔트로피',
    subtitle: '행동이 연속이면 argmax가 그 자체로 최적화 문제가 된다. 결정적 actor로 critic의 기울기를 타고 오르는 길(DDPG, TD3)과, 보상에 엔트로피를 더해 볼츠만 분포를 쫓는 길(SAC)이 갈린다.',
    time: 45,
    level: '중급 · 심화',
    prereq: ['ppo', 'qviews'],
    theses: ['T5', 'T8', 'T3'],
    goals: [
      '결정적 정책 경사 $\\nabla_\\theta J = \\mathbb{E}[\\nabla_\\theta\\mu_\\theta(s)\\nabla_a Q(s,a)|_{a=\\mu(s)}]$의 의미와 DDPG·TD3가 과대추정에 대응하는 방법을 설명할 수 있다.',
      '최대 엔트로피 목적의 최적 정책이 $\\pi^*\\propto\\exp(Q/\\alpha)$임을 유도하고, soft 가치가 max와 평균 사이를 보간함을 확인한다.',
      'SAC의 재매개화 경사, 자동 온도 조절, 가우시안 actor의 mode-seeking 성질을 실험으로 확인한다.',
    ],
    html: String.raw`
<p>Q-learning은 $\max_a Q(s,a)$를 매 스텝 계산한다. 행동이 7차원 관절 토크라면 이 max는 매번 푸는 비볼록 최적화 문제다. 연속 제어의 알고리즘들은 이 max를 처리하는 방식으로 구분된다.</p>
<div class="grid2">
  <div class="card"><h4>확률적 정책 경사</h4><p>가우시안 정책 $\mathcal{N}(\mu_\theta(s),\sigma_\theta(s)^2)$에서 샘플링하고 점수함수로 학습. PPO가 이 방식이다(<a href="#ppo">13장</a>). on-policy라 표본 효율이 낮다.</p></div>
  <div class="card"><h4>결정적 actor가 argmax를 근사</h4><p>$\mu_\theta(s)\approx\arg\max_a Q(s,a)$를 학습해 max를 대신한다. DDPG, TD3. off-policy, 리플레이 사용.</p></div>
  <div class="card"><h4>max를 soft-max로</h4><p>엔트로피를 보상에 더하면 max가 log-sum-exp로, argmax가 볼츠만 분포로 바뀐다. 확률적 actor가 그 분포를 근사한다. SAC.</p></div>
  <div class="card"><h4>샘플 기반 최적화</h4><p>매 스텝 CEM 등으로 $Q(s,\cdot)$를 직접 최적화(QT-Opt). actor 없음, 계산 비용이 크다.</p></div>
</div>

<h2>결정적 정책 경사: critic의 기울기를 타고 오르기</h2>
<p>Silver et al.(2014)는 결정적 정책 $a = \mu_\theta(s)$에도 정책 경사 정리가 있음을 보였다. 점수함수 대신 <strong>critic의 행동에 대한 기울기</strong>를 연쇄법칙으로 actor에 역전파한다.</p>
<div data-w="dv-dpg"></div>
<p>DDPG(Lillicrap et al. 2016)는 DPG에 DQN의 장치(리플레이 버퍼, 타깃 네트워크, 10장)를 붙인 것이다. 타깃 네트워크는 Polyak 평균 $\bar\theta \leftarrow \tau\theta + (1-\tau)\bar\theta$ ($\tau\approx0.005$)로 천천히 따라가고, 탐험은 행동에 잡음을 더해 얻는다.</p>

<h3>TD3: actor가 critic의 오류를 착취한다</h3>
<p>actor는 $Q_\phi(s,\mu_\theta(s))$를 경사 상승한다. 그런데 $Q_\phi$에는 추정 오차가 있고, 경사 상승은 오차가 위로 튄 곳을 정확히 찾아간다. 그 행동으로 만든 타깃이 다시 critic을 부풀린다. 10장의 max 과대추정(T8)이 연속 행동에서는 "최적화기가 critic을 공격하는" 형태로 나타난다. Fujimoto et al.(2018)의 TD3는 세 가지로 대응했다.</p>
<div class="table-wrap"><table class="t">
<thead><tr><th>TD3의 장치</th><th>식</th><th>겨냥한 문제</th></tr></thead>
<tbody>
<tr><td>Clipped Double Q</td><td>$y = r + \gamma\min_{i=1,2}Q_{\bar\phi_i}(s', \tilde a')$</td><td>과대추정 (Double Q의 비관적 버전)</td></tr>
<tr><td>Target policy smoothing</td><td>$\tilde a' = \mu_{\bar\theta}(s') + \clip(\epsilon,-c,c),\ \epsilon\sim\mathcal{N}(0,\sigma^2)$</td><td>critic의 뾰족한 오차 봉우리 착취</td></tr>
<tr><td>Delayed policy update</td><td>critic 2회 갱신마다 actor 1회</td><td>부정확한 critic 위에서의 actor 이동</td></tr>
</tbody></table></div>
<div class="thesis-box"><span class="label">대전제 T8 · 추정 안정성</span>
<p>$\mathbb{E}[\max_a\hat Q] \ge \max_a\mathbb{E}[\hat Q]$는 이산 행동의 이야기만이 아니다. 연속 행동에서 "max"는 actor의 경사 상승이고, 그것이 critic 오차의 상위 꼬리를 체계적으로 골라낸다. 두 critic의 min, 타깃 행동의 평활화, 느린 actor는 모두 이 선택 편향을 줄이는 장치다. SAC도 clipped double Q를 그대로 쓴다.</p>
</div>

<h2>최대 엔트로피 RL</h2>
<p>보상에 정책의 엔트로피를 더한 목적을 생각한다. 온도 $\alpha$가 둘의 비중을 정한다.</p>
$$J_{\text{MaxEnt}}(\pi) = \mathbb{E}_{\tau\sim\pi}\Big[\sum_t\gamma^t\big(r_{t+1} + \alpha\,\mathcal{H}(\pi(\cdot|s_t))\big)\Big],\qquad \mathcal{H}(\pi(\cdot|s)) = -\mathbb{E}_{a\sim\pi}[\log\pi(a|s)]$$
<p>한 상태에서 $Q$가 주어졌을 때 최선의 정책을 구하면 볼츠만 분포가 나온다. 이것이 T5(KL-정규화 해)의 기준 분포가 균등일 때의 모습이다.</p>
<div data-w="dv-soft"></div>
<div class="thesis-box"><span class="label">대전제 T5 · KL(엔트로피) 정규화의 닫힌 해</span>
<p>$\max_\pi \mathbb{E}_\pi[Q] + \alpha\mathcal{H}(\pi) \Rightarrow \pi^*\propto e^{Q/\alpha}$, 그 최댓값은 $\alpha\log\int e^{Q/\alpha}da$. 엔트로피 대신 기준 정책과의 KL을 쓰면 $\pi^*\propto\pi_{\text{ref}}e^{Q/\beta}$가 되어 RLHF와 DPO의 출발점이 된다(<a href="#llm-mdp">18장</a>, <a href="#dpo">20장</a>). SAC와 RLHF는 같은 식의 기준 분포만 다르다.</p>
</div>
<p>상태 전이까지 포함하면 <strong>soft 벨만 방정식</strong>이 된다. $\max$ 자리에 log-sum-exp가 들어갈 뿐 구조는 02장과 같고, log-sum-exp도 1-립시츠라 여전히 축약이다(T1).</p>
$$Q(s,a) = r(s,a) + \gamma\,\mathbb{E}_{s'}\big[V(s')\big],\qquad V(s) = \mathbb{E}_{a\sim\pi}\big[Q(s,a) - \alpha\log\pi(a|s)\big] \;\overset{\pi=\pi^*}{=}\; \alpha\log\int e^{Q(s,a)/\alpha}\,da$$

<h3>볼츠만 분포와 가우시안 actor</h3>
<p>아래에서 행동 구간 $[-4,4]$ 위에 봉우리 두 개짜리 $Q(a)$를 직접 만들고 온도를 바꿔 보자. 회색 영역이 최적 정책 $\pi^*\propto e^{Q/\alpha}$이다. SAC의 actor는 가우시안이라 이 분포를 정확히 표현하지 못하고, $\mathrm{KL}(\pi_\theta\,\|\,\pi^*)$(역방향 KL)를 최소화하는 가우시안을 찾는다. 비교를 위해 $\mathrm{KL}(\pi^*\,\|\,\pi_\theta)$(정방향 KL)를 최소화하는 가우시안, 즉 평균과 분산을 맞춘 것도 함께 그린다. 둘 다 격자 위에서 수치적으로 계산한다.</p>
<div data-w="boltz"></div>
<ul>
  <li><strong>역방향 KL은 mode-seeking</strong>: $\pi^*$가 작은 곳에 질량을 두면 큰 벌점을 받으므로 한 봉우리를 골라 그 안에 들어간다. 온도가 높아지면 두 봉우리를 덮는 넓은 해로 갑자기 넘어간다.</li>
  <li><strong>정방향 KL은 mode-covering</strong>: $\pi^*$가 있는 곳은 모두 덮어야 하므로 두 봉우리 사이 골짜기(나쁜 행동)에 평균을 둔다. 정책으로 쓰면 최악이다.</li>
  <li>soft 가치 $V = \alpha\log\mathbb{E}_{a\sim U}[e^{Q/\alpha}]$는 $\alpha\to0$에서 $\max Q$로, $\alpha\to\infty$에서 균등 평균으로 간다.</li>
</ul>

<h2>SAC: 재매개화와 자동 온도</h2>
<p>SAC(Haarnoja et al. 2018)는 soft 정책 반복의 근사다. critic은 soft 벨만 타깃으로, actor는 볼츠만 분포로의 역방향 KL로 학습한다.</p>
<div data-w="fx-sac"></div>
<p>actor 손실의 경사는 점수함수가 아니라 <strong>재매개화(reparameterization)</strong>로 계산한다. $a = f_\theta(\epsilon; s) = \tanh(\mu_\theta(s) + \sigma_\theta(s)\epsilon)$, $\epsilon\sim\mathcal{N}(0,I)$로 쓰면 무작위성이 $\theta$ 밖으로 빠져 $\nabla_\theta Q(s, f_\theta(\epsilon;s))$를 그대로 역전파할 수 있다. tanh로 행동을 묶었으므로 로그확률에 야코비안 보정 $-\sum_i\log(1-\tanh^2(u_i))$이 붙는다.</p>
<div data-w="grad-est"></div>
<p>온도 $\alpha$는 손으로 고르기 어렵다. 보상 스케일이 바뀌면 적절한 $\alpha$도 바뀌기 때문이다. SAC의 개정판(Haarnoja et al. 2018b)은 "평균 엔트로피가 목표 $\bar{\mathcal{H}}$ 이상"이라는 제약 문제로 바꾸고 $\alpha$를 쌍대 변수로 학습한다.</p>
$$J(\alpha) = \mathbb{E}_{a\sim\pi}\big[-\alpha\,(\log\pi(a|s) + \bar{\mathcal{H}})\big] \quad\Rightarrow\quad \frac{\partial J}{\partial\alpha} = \mathcal{H}(\pi) - \bar{\mathcal{H}}$$
<p>엔트로피가 목표보다 낮으면 $\alpha$가 커지고(더 탐험), 높으면 작아진다. 목표는 흔히 $-\dim(\mathcal{A})$로 둔다.</p>

<h3>실험: 좁은 봉우리와 넓은 봉우리</h3>
<p>시작점 근처에 좁고 낮은 봉우리, 멀리 넓고 높은 봉우리가 있는 1차원 $Q(a)$에서 actor를 직접 학습시킨다. critic은 이 $Q$를 정확히 안다고 가정해(완벽한 critic) actor 업데이트만 떼어 본다. 결정적 actor는 $\mu$에서 $Q$의 기울기를, 가우시안 actor는 재매개화 샘플 16개로 $\nabla(\mathbb{E}[Q] + \alpha\mathcal{H})$를 추정한다. $\sigma$는 1.5 이하로 제한했다(실제 SAC에서 tanh로 행동 범위를 묶는 것에 해당). 20개 시드의 $\mu$ 궤적을 그린다.</p>
<div data-w="sac-run"></div>
<p>관찰할 점: 확률적 actor의 목적 $\mathbb{E}_{a\sim\mathcal{N}(\mu,\sigma^2)}[Q(a)]$는 $Q$를 폭 $\sigma$로 <em>평활화</em>한 함수다. 엔트로피 항은 $\sigma$가 너무 빨리 줄지 않게 붙잡아 평활화를 유지하고, 평활화된 지형에서는 좁은 봉우리가 지워진다. 고정 $\alpha$가 크면 넓은 봉우리를 찾지만 끝까지 흐릿한 정책으로 남고, 자동 온도는 <strong>처음엔 넓게, 나중엔 좁게</strong>를 스스로 만든다. 단, 초기 $\alpha$가 작으면 자동 온도도 좁은 봉우리에 갇힌다. 엔트로피가 전역 최적을 보장하지는 않는다.</p>

<h2>Control as Inference</h2>
<p>최대 엔트로피 RL에는 확률적 추론으로서의 해석이 있다(Levine 2018 튜토리얼). 각 시점에 "최적성" 이진 변수 $\mathcal{O}_t$를 두고 $p(\mathcal{O}_t = 1|s_t,a_t)\propto\exp(r(s_t,a_t)/\alpha)$라 하면, "모든 시점이 최적이었다"는 조건 아래의 행동 사후분포가 soft 벨만 방정식의 해가 된다. 이때 정확한 사후분포는 전이까지 "운 좋게" 바꿔 버려(낙관적 동역학) 위험 추구적 정책을 만드는데, 동역학을 실제 $P$로 고정한 변분 추론으로 풀면 정확히 최대 엔트로피 RL 목적이 나온다. 정책 최적화를 "보상으로 기울인 사후분포의 근사 추론"으로 보는 이 관점이 MPO, AWR, 그리고 RLHF의 KL-정규화 목적을 하나로 묶는다.</p>

<h2>알고리즘 비교: 무엇이 바뀌었나</h2>
<div class="table-wrap"><table class="t">
<thead><tr><th></th><th>DDPG (2016)</th><th>TD3 (2018)</th><th>SAC (2018)</th><th>PPO (2017)</th></tr></thead>
<tbody>
<tr><td>정책</td><td>결정적 $\mu_\theta(s)$</td><td>결정적</td><td>확률적 (tanh-가우시안)</td><td>확률적 (가우시안)</td></tr>
<tr><td>데이터</td><td>off-policy, 리플레이</td><td>off-policy, 리플레이</td><td>off-policy, 리플레이</td><td>on-policy, 소수 epoch</td></tr>
<tr><td>critic</td><td>Q 1개</td><td>Q 2개, min</td><td>soft Q 2개, min</td><td>V 1개</td></tr>
<tr><td>actor 경사</td><td>$\nabla_a Q\cdot\nabla_\theta\mu$</td><td>같음, 지연 갱신</td><td>재매개화 + 엔트로피</td><td>점수함수 + clip</td></tr>
<tr><td>탐험</td><td>행동 잡음 (OU/가우시안)</td><td>행동 잡음</td><td>정책 엔트로피 (자동 α)</td><td>정책 분산 + 엔트로피 보너스</td></tr>
<tr><td>주된 처방</td><td>타깃 네트워크</td><td>과대추정 3종 세트 (T8)</td><td>soft 벨만 (T5)</td><td>신뢰영역 (T4)</td></tr>
<tr><td>약점</td><td>하이퍼파라미터에 민감, 과대추정</td><td>탐험이 잡음에 의존</td><td>단봉 가우시안 actor</td><td>표본 효율</td></tr>
</tbody></table></div>
<p>이후 흐름은 표현력 있는 actor(정규화 흐름, 확산 정책)로 다봉 볼츠만 분포를 직접 표현하려는 쪽, 그리고 대규모 off-policy 학습(REDQ의 critic 앙상블, 높은 갱신 비율)으로 표본 효율을 끌어올리는 쪽으로 갈린다. 오프라인 데이터에서 이 critic들이 왜 무너지는지는 <a href="#offline">15장</a>에서 본다.</p>
`,
    mount: {
      'dv-dpg': (el) => ui.derivation(el, {
        title: '결정적 정책 경사 (Silver et al. 2014)',
        steps: [
          { tex: String.raw`J(\theta) = \mathbb{E}_{s\sim\rho^{\mu}}\big[Q^{\mu}(s, \mu_\theta(s))\big]`, why: '결정적 정책에서는 상태마다 행동이 하나다. (off-policy 버전에서는 $s$를 리플레이 버퍼 분포 $\\beta$에서 뽑는다.)' },
          { tex: String.raw`\nabla_\theta Q(s, \mu_\theta(s)) = \hl{\nabla_\theta\mu_\theta(s)}\;\hl{\nabla_a Q(s,a)\big|_{a=\mu_\theta(s)}}`, why: '연쇄법칙. actor의 야코비안 × critic의 행동 기울기. 점수함수가 필요 없다.' },
          { tex: String.raw`\boxed{\;\nabla_\theta J(\theta) = \mathbb{E}_{s\sim\rho^{\mu}}\Big[\nabla_\theta\mu_\theta(s)\,\nabla_a Q^{\mu}(s,a)\big|_{a=\mu_\theta(s)}\Big]\;}`, why: '정리의 핵심은 상태 분포 $\\rho^\\mu$의 $\\theta$-미분 항이 (확률적 정책 경사 정리처럼) 나타나지 않는다는 점이다. 확률적 정책 경사에서 분산 $\\sigma\\to0$의 극한으로도 얻어진다.' },
          { tex: String.raw`\theta \leftarrow \theta + \alpha\,\frac{1}{B}\sum_{i}\nabla_\theta\mu_\theta(s_i)\,\nabla_a Q_\phi(s_i,a)\big|_{a=\mu_\theta(s_i)}`, why: '실제 DDPG 업데이트. "critic이 가리키는 오르막으로 actor의 출력을 민다." critic $Q_\\phi$가 틀리면 그 틀린 오르막을 그대로 오른다.' },
        ],
      }),
      'dv-soft': (el) => ui.derivation(el, {
        title: '엔트로피 정규화 최적화의 닫힌 해',
        caption: '한 상태에서 $Q(a)$가 주어졌다고 하고, 행동 분포 $\\pi$에 대해 최적화한다.',
        steps: [
          { tex: String.raw`\max_{\pi}\; \int\pi(a)\,Q(a)\,da \;-\; \alpha\int\pi(a)\log\pi(a)\,da \quad\text{s.t.}\quad \int\pi(a)\,da = 1`, why: '기대 $Q$ + 온도 × 엔트로피.' },
          { tex: String.raw`\frac{\delta}{\delta\pi(a)}:\quad Q(a) - \alpha\big(\log\pi(a) + 1\big) - \lambda = 0`, why: '라그랑주 승수 $\\lambda$를 붙여 $\\pi(a)$에 대해 변분.' },
          { tex: String.raw`\log\pi(a) = \frac{Q(a)}{\alpha} - 1 - \frac{\lambda}{\alpha} \;\Rightarrow\; \hl{\pi^*(a) = \frac{\exp(Q(a)/\alpha)}{\int\exp(Q(a')/\alpha)\,da'}}`, why: '정규화 조건이 상수를 정한다. 볼츠만(깁스) 분포.' },
          { tex: String.raw`\max_\pi\big[\mathbb{E}_\pi Q + \alpha\mathcal{H}(\pi)\big] = \hl{\alpha\log\int\exp\big(Q(a)/\alpha\big)\,da} = V_{\text{soft}}`, why: '최적해를 대입하면 최댓값은 log-partition 함수. 이것이 soft 가치다. 수학적으로 log-sum-exp는 음의 엔트로피의 볼록 켤레(Legendre-Fenchel 쌍대)다.' },
          { tex: String.raw`\mathbb{E}_\pi[Q] + \alpha\mathcal{H}(\pi) = V_{\text{soft}} - \alpha\,\mathrm{KL}\big(\pi\,\|\,\pi^*\big)`, why: '임의의 $\\pi$에 대한 항등식. 그래서 목적을 최대화하는 것은 $\\pi^*$로의 <strong>역방향 KL</strong>을 최소화하는 것과 같다. SAC actor 손실이 정확히 이것이다.' },
          { tex: String.raw`\alpha\to0:\ \pi^*\to\text{argmax 위의 점질량},\ V_{\text{soft}}\to\max_a Q(a) \qquad \alpha\to\infty:\ \pi^*\to\text{균등}`, why: '온도는 hard max와 균등 평균 사이를 잇는다. 모든 "soft" 알고리즘은 $\\alpha\\to0$에서 원래의 "hard" 알고리즘으로 돌아간다.' },
        ],
      }),
      'fx-sac': (el) => ui.formula(el, {
        title: 'SAC 손실 해부',
        tex: String.raw`\underbrace{\mathbb{E}_{(s,a,r,s')\sim\mathcal{D}}\Big[\big(Q_{\phi}(s,a) - \tm{y}{y}\big)^2\Big]}_{\text{critic}},\;\; \tm{y}{y} = r + \gamma\Big(\tm{min}{\min_{i}Q_{\bar\phi_i}(s',\tilde a')} - \tm{al}{\alpha}\tm{lp}{\log\pi_\theta(\tilde a'|s')}\Big);\qquad \underbrace{\mathbb{E}_{s\sim\mathcal{D},\,\tm{eps}{\epsilon\sim\mathcal{N}}}\Big[\tm{al}{\alpha}\log\pi_\theta(\tm{f}{f_\theta(\epsilon;s)}|s) - Q_\phi(s, \tm{f}{f_\theta(\epsilon;s)})\Big]}_{\text{actor}}`,
        terms: [
          { id: 'y', sym: 'y', label: 'soft 벨만 타깃', desc: '다음 상태의 soft 가치로 부트스트랩.', long: '$\\tilde a\'\\sim\\pi_\\theta(\\cdot|s\')$를 새로 샘플한다. 리플레이의 옛 행동이 아니라 현재 정책의 행동을 쓰므로 off-policy로 현재 정책의 soft Q를 평가한다.' },
          { id: 'min', sym: '\\min_i Q_{\\bar\\phi_i}', label: '두 타깃 critic의 min', desc: 'TD3의 clipped double Q. 과대추정 억제(T8).' },
          { id: 'al', sym: '\\alpha', label: '온도', desc: '엔트로피의 가격. 자동 조절되는 쌍대 변수.', long: '보상 스케일과 엔트로피의 상대적 크기를 맞춘다. 목표 엔트로피를 정하면 $\\alpha$가 알아서 따라온다.' },
          { id: 'lp', sym: '\\log\\pi', label: '로그확률', desc: '−log π의 기대가 엔트로피. 타깃에서 빼면 엔트로피 보너스.' },
          { id: 'eps', sym: '\\epsilon\\sim\\mathcal{N}', label: '외부 잡음', desc: '재매개화: 무작위성을 θ 밖으로.', long: '샘플링 연산을 미분 가능한 결정적 변환 + 고정 잡음으로 바꾼다. 그래서 actor 경사가 critic을 통해 흐른다. 점수함수 추정보다 분산이 훨씬 작다(아래 계산기).' },
          { id: 'f', sym: 'f_\\theta(\\epsilon;s)', label: '재매개화된 행동', desc: 'tanh(μ_θ(s) + σ_θ(s)·ε).', long: 'tanh가 행동을 유계 구간으로 묶고, 그 덕분에 엔트로피가 무한히 커질 수 없다. 로그확률에는 tanh의 야코비안 보정이 필요하다.' },
        ],
      }),
      boltz: mountBoltz,
      'grad-est': mountGradEst,
      'sac-run': mountSacRun,
    },
    tacit: [
      { tag: 'math', t: 'log-sum-exp는 "엔트로피로 정규화한 max"다',
        d: '<p>$\\alpha\\log\\sum_a e^{Q_a/\\alpha} = \\max_{\\pi\\in\\Delta}\\big[\\langle\\pi,Q\\rangle + \\alpha\\mathcal{H}(\\pi)\\big]$이고, 그 argmax가 softmax다. 음의 엔트로피와 log-sum-exp는 서로의 볼록 켤레다. 그래서 soft Q-learning, SAC, softmax 정책, 볼츠만 탐험, RLHF의 KL-정규화가 모두 같은 변분 원리의 사례이며, 각 알고리즘의 "soft" 버전은 원래 알고리즘에 엔트로피 정규화를 더한 것이다. $\\alpha$를 0으로 보내면 원래 알고리즘이 돌아온다(T5).</p>' },
      { tag: 'math', t: '역방향 KL과 정방향 KL을 구분하는 습관',
        d: '<p>$\\mathrm{KL}(q\\|p)$를 $q$에 대해 최소화하면(역방향) $q$는 $p$의 한 모드 안에 숨고, $\\mathrm{KL}(p\\|q)$를 최소화하면(정방향) $q$는 $p$ 전체를 덮는다. SAC의 actor, RLHF의 $\\mathrm{KL}(\\pi\\|\\pi_{\\text{ref}})$ 페널티, 변분 추론은 역방향이고, SFT·지식 증류·최대우도는 정방향이다. "RLHF 후 모델의 다양성이 줄어든다"와 "SFT 모델은 가끔 엉뚱한 답을 낸다"가 같은 수학의 양면이다.</p>' },
      { tag: 'algo', t: 'actor가 critic을 최대화하면 critic에 대한 적대적 공격이 된다',
        d: '<p>경사 상승으로 $Q_\\phi(s,\\mu_\\theta(s))$를 올리는 것은 입력을 바꿔 신경망 출력을 극대화하는 것, 즉 적대적 예제를 찾는 것과 같은 연산이다. critic이 어딘가에서 근거 없이 높으면 actor가 반드시 찾아낸다. TD3의 타깃 평활화는 "critic이 행동에 대해 매끄러워야 한다"는 정규화이고, 오프라인 RL(15장)에서는 데이터 밖 행동에서 이 공격이 더 심해져 보수적 critic(CQL)이 필요해진다. LLM의 보상 해킹(19장)도 정책이 보상 모델을 공격하는 같은 구조다.</p>' },
      { tag: 'practice', t: 'SAC 실무 기본값과 흔한 실수',
        d: '<p>목표 엔트로피 $-\\dim(\\mathcal{A})$, Polyak $\\tau = 0.005$, 리플레이 $10^6$, 학습률 $3\\times10^{-4}$, 배치 256이 원 논문 계열의 기본값이다. 흔한 실수는 (1) tanh 야코비안 보정을 빼먹는 것(엔트로피가 틀리게 계산되어 $\\alpha$ 자동 조절이 오작동), (2) $\\alpha$ 대신 $\\log\\alpha$를 최적화하지 않아 음수 온도가 되는 것, (3) 종료와 시간 제한 절단(truncation)을 구분하지 않고 둘 다 부트스트랩을 끊는 것이다. (3)은 모든 TD 기반 알고리즘에 공통이다.</p>' },
      { tag: 'research', t: '정확한 추론은 낙관적이다: control as inference의 함정',
        d: '<p>"최적성 변수"에 조건화한 정확한 사후분포는 행동뿐 아니라 <em>전이</em>도 보상이 높은 쪽으로 기울인다. 그 결과 soft 벨만 방정식의 기대값 $\\mathbb{E}_{s\'}[V(s\')]$ 자리에 $\\log\\mathbb{E}_{s\'}[e^{V(s\')}]$가 들어가 위험 추구적이 된다. 실제 최대 엔트로피 RL은 동역학을 고정한 변분 근사에 해당한다(Levine 2018). 추론 관점을 쓸 때 "무엇을 사후분포로 바꾸고 무엇을 고정했는가"를 확인하는 것이 고수의 체크포인트다.</p>' },
      { tag: 'math', t: '재매개화 분산은 Q의 기울기에, 점수함수 분산은 Q의 크기에 비례한다',
        d: '<p>재매개화 추정량 $\\nabla_a Q\\cdot\\nabla_\\theta a$는 $Q$가 매끄러우면 작은 분산을 갖지만, $Q$가 거칠거나 불연속이면(접촉이 있는 로봇, 정답/오답 보상) 쓸모가 없다. 점수함수 추정량 $Q\\nabla\\log\\pi$는 $Q$의 크기(그래서 baseline이 중요)에 비례한다. 이산 토큰과 0/1 보상을 쓰는 LLM RL이 SAC식 재매개화 대신 PPO/GRPO의 점수함수를 쓰는 이유다. Gumbel-softmax 같은 이산 재매개화는 편향을 대가로 한다.</p>' },
    ],
    quiz: [
      { q: '$V_{\\text{soft}} = \\alpha\\log\\int e^{Q(a)/\\alpha}da$에서 $\\alpha\\to0$일 때 $V_{\\text{soft}}$는?', options: ['$\\mathbb{E}_{a\\sim U}[Q(a)]$', '$\\max_a Q(a)$', '0', '$-\\infty$'], answer: 1,
        explain: 'log-sum-exp는 온도가 0으로 가면 max로 수렴한다. 최대 엔트로피 RL은 $\\alpha\\to0$에서 일반 RL로 돌아간다.' },
      { q: '봉우리가 두 개인 $\\pi^*\\propto e^{Q/\\alpha}$에 가우시안을 역방향 KL $\\mathrm{KL}(\\pi_\\theta\\|\\pi^*)$로 맞추면?', options: ['두 봉우리 사이에 넓게 퍼진다', '보통 한 봉우리를 골라 그 안에 들어간다', '항상 균등 분포가 된다', '정방향 KL과 같은 결과'], answer: 1,
        explain: '역방향 KL은 $\\pi^*$가 작은 곳에 질량을 두는 것을 강하게 벌하므로 mode-seeking이다. 온도가 매우 높아 골짜기가 얕아지면 넓은 해로 넘어갈 수 있다.' },
      { q: 'TD3의 clipped double Q(두 critic의 min)가 주로 겨냥하는 문제는?', options: ['탐험 부족', 'actor의 경사 상승이 critic 오차의 상위 꼬리를 골라내는 과대추정', '보상 희소성', 'on-policy 편향'], answer: 1,
        explain: 'max(또는 actor의 최적화)가 잡음을 위쪽 편향으로 바꾸는 T8의 문제를, 두 독립 추정치의 min으로 비관적으로 상쇄한다.' },
      { q: 'SAC의 자동 온도 조절에서 현재 정책 엔트로피가 목표 $\\bar{\\mathcal{H}}$보다 낮으면?', options: ['$\\alpha$가 감소한다', '$\\alpha$가 증가한다', '$\\alpha$는 변하지 않는다', 'critic 학습률이 증가한다'], answer: 1,
        explain: '$\\partial J/\\partial\\alpha = \\mathcal{H} - \\bar{\\mathcal{H}} < 0$이므로 경사 하강으로 $\\alpha$가 커지고, 엔트로피의 가치가 올라가 정책이 다시 넓어진다.' },
    ],
  });

  /* ---------- 공용 ---------- */
  const g = (a, c, w) => Math.exp(-((a - c) * (a - c)) / (2 * w * w));
  const qOf = (bumps) => (a) => bumps.reduce((s, b) => s + b.h * g(a, b.c, b.w), 0);
  const dqOf = (bumps) => (a) => bumps.reduce((s, b) => s - b.h * ((a - b.c) / (b.w * b.w)) * g(a, b.c, b.w), 0);
  // E_{a~N(mu, sd^2)}[Q(a)] (가우시안 합성곱 닫힌 식)
  const eqOf = (bumps) => (mu, sd) => bumps.reduce((s, b) => { const v = b.w * b.w + sd * sd; return s + b.h * (b.w / Math.sqrt(v)) * Math.exp(-((mu - b.c) * (mu - b.c)) / (2 * v)); }, 0);
  const deqOf = (bumps) => (mu, sd) => bumps.reduce((s, b) => { const v = b.w * b.w + sd * sd; return s - b.h * (b.w / Math.sqrt(v)) * ((mu - b.c) / v) * Math.exp(-((mu - b.c) * (mu - b.c)) / (2 * v)); }, 0);
  const gaussPdf = (a, mu, sd) => Math.exp(-((a - mu) * (a - mu)) / (2 * sd * sd)) / (sd * Math.sqrt(2 * Math.PI));
  const HG = (sd) => 0.5 * Math.log(2 * Math.PI * Math.E * sd * sd);

  /* ---------- 볼츠만 vs 가우시안 적합 ---------- */
  function mountBoltz(el) {
    const p = ui.panel(el, { kind: 'CALC', title: '$\\pi^*\\propto e^{Q/\\alpha}$와 가우시안 actor (역방향 KL vs 정방향 KL)', caption: '행동 구간 $[-4,4]$의 균등분포를 기준 측도로 쓴다. 그래서 위젯의 soft 가치는 $V = \\alpha\\log\\mathbb{E}_{a\\sim U}[e^{Q/\\alpha}] = \\mathbb{E}_{\\pi^*}[Q] - \\alpha\\,\\mathrm{KL}(\\pi^*\\|U)$이고, 유도의 $\\alpha\\log\\int e^{Q/\\alpha}da$와는 상수 $\\alpha\\log 8$만큼 다르다.' });
    const ctr = ui.row(p.body);
    const aS = ui.slider(ctr, { label: '온도 $\\alpha$', min: 0.02, max: 2, step: 0.01, value: 0.15, format: ui.fmt.f(2), onInput: draw });
    const h1 = ui.slider(ctr, { label: '봉우리 1 높이', min: 0, max: 1.5, step: 0.05, value: 0.8, format: ui.fmt.f(2), onInput: draw });
    const c1 = ui.slider(ctr, { label: '봉우리 1 위치', min: -3.5, max: 3.5, step: 0.1, value: -1.5, format: ui.fmt.f(1), onInput: draw });
    const h2 = ui.slider(ctr, { label: '봉우리 2 높이', min: 0, max: 1.5, step: 0.05, value: 1.0, format: ui.fmt.f(2), onInput: draw });
    const c2 = ui.slider(ctr, { label: '봉우리 2 위치', min: -3.5, max: 3.5, step: 0.1, value: 1.5, format: ui.fmt.f(1), onInput: draw });
    const wS = ui.slider(ctr, { label: '봉우리 폭', min: 0.2, max: 1.2, step: 0.05, value: 0.45, format: ui.fmt.f(2), onInput: draw });
    const st = ui.stats(p.body, [
      { key: 'max', label: '$\\max_a Q$' },
      { key: 'v', label: 'soft 가치 $V$ (균등 기준)', tone: 'accent' },
      { key: 'eq', label: '$\\mathbb{E}_{\\pi^*}[Q]$' },
      { key: 'h', label: '$\\mathcal{H}(\\pi^*)$ (미분 엔트로피)' },
      { key: 'rev', label: '역방향 KL 가우시안 $\\mu,\\sigma$', tone: 'accent' },
      { key: 'fwd', label: '정방향 KL 가우시안 $\\mu,\\sigma$', tone: 'signal' },
    ]);
    const top = document.createElement('div');
    const bot = document.createElement('div');
    p.body.append(top, bot);
    const qc = plot.line(top, { height: 170, x: { label: '행동 a', min: -4, max: 4 }, y: { label: 'Q(a)', min: 0 }, series: [] });
    const dc = plot.line(bot, { height: 240, x: { label: '행동 a', min: -4, max: 4 }, y: { label: '확률 밀도', min: 0 }, series: [] });
    const NG = 401, A0 = -4, A1 = 4, dA = (A1 - A0) / (NG - 1);
    const grid = sim.range(NG).map((i) => A0 + i * dA);
    function draw() {
      const alpha = aS.get();
      const bumps = [{ h: h1.get(), c: c1.get(), w: wS.get() }, { h: h2.get(), c: c2.get(), w: wS.get() }];
      const Q = qOf(bumps);
      const qv = grid.map(Q);
      const qmax = Math.max(...qv);
      const ew = qv.map((q) => Math.exp((q - qmax) / alpha));
      const Z = sim.sum(ew) * dA;
      const pv = ew.map((e) => e / Z);
      // soft value with uniform base measure on [-4,4]
      const V = qmax + alpha * Math.log(Z / (A1 - A0));
      const eq = sim.sum(pv.map((pp, i) => pp * qv[i])) * dA;
      const H = -sim.sum(pv.map((pp) => (pp > 0 ? pp * Math.log(pp) : 0))) * dA;
      // forward KL: moment matching
      const m1 = sim.sum(pv.map((pp, i) => pp * grid[i])) * dA;
      const var1 = sim.sum(pv.map((pp, i) => pp * (grid[i] - m1) * (grid[i] - m1))) * dA;
      const fsd = Math.sqrt(Math.max(var1, 1e-6));
      // reverse KL: KL(N_trunc || p) on grid, coarse-to-fine search
      const logp = pv.map((pp) => Math.log(Math.max(pp, 1e-300)));
      function revKL(mu, sd) {
        let z = 0, acc = 0;
        const n = new Array(NG);
        for (let i = 0; i < NG; i++) { n[i] = gaussPdf(grid[i], mu, sd); z += n[i]; }
        z *= dA;
        if (z < 1e-12) return Infinity;
        for (let i = 0; i < NG; i++) { const q = n[i] / z; if (q > 1e-300) acc += q * (Math.log(q) - logp[i]); }
        return acc * dA;
      }
      let best = { kl: Infinity, mu: 0, sd: 1 };
      for (let i = 0; i <= 64; i++) {
        const mu = -3.8 + (7.6 * i) / 64;
        for (let j = 0; j < 28; j++) {
          const sd = Math.exp(Math.log(0.04) + ((Math.log(3) - Math.log(0.04)) * j) / 27);
          const k = revKL(mu, sd);
          if (k < best.kl) best = { kl: k, mu, sd };
        }
      }
      for (let it = 0; it < 2; it++) {
        const dm = it === 0 ? 0.12 : 0.03, ds = it === 0 ? 0.12 : 0.03;
        const b0 = Object.assign({}, best);
        for (let i = -6; i <= 6; i++) for (let j = -6; j <= 6; j++) {
          const mu = b0.mu + (i * dm) / 6, sd = Math.max(0.02, b0.sd * Math.exp((j * ds) / 6 * 3));
          const k = revKL(mu, sd);
          if (k < best.kl) best = { kl: k, mu, sd };
        }
      }
      qc.update({ series: [{ name: 'Q(a)', color: 'c6', data: grid.map((a, i) => [a, qv[i]]), endDot: false }], hlines: [{ y: V, label: 'soft 가치 V', color: 'accent' }] });
      const ymax = Math.min(6, Math.max(...pv, gaussPdf(best.mu, best.mu, best.sd)) * 1.1);
      dc.update({
        y: { label: '확률 밀도', min: 0, max: ymax },
        series: [
          { name: '$\\pi^*\\propto e^{Q/\\alpha}$', color: 'muted', area: true, data: grid.map((a, i) => [a, pv[i]]), endDot: false },
          { name: '역방향 KL 가우시안 (SAC actor)', color: 'c1', width: 2.5, data: grid.map((a) => [a, gaussPdf(a, best.mu, best.sd)]), endDot: false },
          { name: '정방향 KL 가우시안 (모멘트 매칭)', color: 'c2', dash: '6 4', data: grid.map((a) => [a, gaussPdf(a, m1, fsd)]), endDot: false },
        ],
        vlines: [{ x: best.mu, label: '역 μ', color: 'c1' }, { x: m1, label: '정 μ', color: 'c2' }],
      });
      st.set('max', qmax.toFixed(3));
      st.set('v', V.toFixed(3));
      st.set('eq', eq.toFixed(3));
      st.set('h', H.toFixed(3));
      st.set('rev', best.mu.toFixed(2) + ', ' + best.sd.toFixed(2));
      st.set('fwd', m1.toFixed(2) + ', ' + fsd.toFixed(2));
    }
    draw();
  }

  /* ---------- 점수함수 vs 재매개화 ---------- */
  function mountGradEst(el) {
    const p = ui.panel(el, { kind: 'CALC', title: '같은 경사, 다른 분산: 점수함수 vs 재매개화', caption: '$\\partial_\\mu\\,\\mathbb{E}_{a\\sim\\mathcal{N}(\\mu,\\sigma^2)}[Q(a)]$를 샘플 $n$개로 추정하는 것을 2000번 반복해 표준편차를 잰다. $Q$는 아래 실험과 같은 두 봉우리 함수.' });
    const bumps = [{ h: 0.75, c: -0.8, w: 0.3 }, { h: 1.0, c: 2.0, w: 0.8 }];
    const Q = qOf(bumps), dQ = dqOf(bumps), dEQ = deqOf(bumps);
    const ctr = ui.row(p.body);
    const mS = ui.slider(ctr, { label: '$\\mu$', min: -2, max: 3, step: 0.1, value: 0.5, format: ui.fmt.f(1), onInput: run });
    const sS = ui.slider(ctr, { label: '$\\sigma$', min: 0.1, max: 1.5, step: 0.05, value: 0.6, format: ui.fmt.f(2), onInput: run });
    const nS = ui.slider(ctr, { label: '샘플 수 $n$', min: 1, max: 64, step: 1, value: 8, format: ui.fmt.int, onInput: run });
    const st = ui.stats(p.body, [{ key: 't', label: '참 경사', tone: 'signal' }]);
    const c = document.createElement('div');
    const tbl = document.createElement('div');
    tbl.className = 'table-wrap';
    p.body.append(c, tbl);
    const bc = plot.bars(c, { categories: ['점수함수', '점수함수 + baseline', '재매개화'], series: [], height: 200, y: { label: '추정치 표준편차', min: 0 }, labels: true, labelFmt: (v) => v.toFixed(3), legend: false });
    function run() {
      const mu = mS.get(), sd = sS.get(), n = nS.get();
      const r = sim.rng(42);
      const est = [[], [], []];
      for (let k = 0; k < 2000; k++) {
        let s1 = 0, s3 = 0;
        const qs = [], zs = [];
        for (let i = 0; i < n; i++) {
          const e = r.normal();
          const a = mu + sd * e;
          const q = Q(a);
          qs.push(q); zs.push(e);
          s1 += (q * e) / sd;
          s3 += dQ(a);
        }
        const qb = sim.mean(qs);
        let s2 = 0;
        for (let i = 0; i < n; i++) s2 += ((qs[i] - qb) * zs[i]) / sd;
        est[0].push(s1 / n);
        est[1].push(n > 1 ? s2 / (n - 1) : s1 / n);
        est[2].push(s3 / n);
      }
      const stds = est.map(sim.std), means = est.map(sim.mean);
      st.set('t', dEQ(mu, sd).toFixed(4));
      bc.update({ series: [{ name: '표준편차', color: 'c1', colors: ['c4', 'c2', 'c3'], values: stds }] });
      const nm = ['점수함수 $Q(a)\\,\\epsilon/\\sigma$', '점수함수 + baseline (leave-one-out 보정)', '재매개화 $Q\'(\\mu+\\sigma\\epsilon)$'];
      tbl.innerHTML = '<table class="t"><thead><tr><th>추정량</th><th>평균</th><th>표준편차</th></tr></thead><tbody>' +
        nm.map((x, k) => '<tr><td>' + x + '</td><td class="num" style="white-space:nowrap">' + means[k].toFixed(4) + '</td><td class="num" style="white-space:nowrap">' + stds[k].toFixed(4) + '</td></tr>').join('') + '</tbody></table>';
      RL.renderMath(tbl);
    }
    run();
  }

  /* ---------- SAC actor 실험 ---------- */
  function mountSacRun(el) {
    const p = ui.panel(el, { kind: 'SIM', title: 'actor만 떼어 본 DDPG식 vs SAC식 학습 (완벽한 critic 가정)' });
    const bumps = [{ h: 0.75, c: -0.8, w: 0.3 }, { h: 1.0, c: 2.0, w: 0.8 }];
    const Q = qOf(bumps), dQ = dqOf(bumps), EQ = eqOf(bumps);
    const ctr = ui.row(p.body);
    let mode = 'auto';
    ui.select(ctr, { label: 'actor', value: mode, options: [
      { value: 'det', label: '결정적 (DDPG/TD3식)' },
      { value: 'fixed', label: '가우시안, 고정 α (SAC v1)' },
      { value: 'auto', label: '가우시안, 자동 α (SAC v2)' },
    ], onChange: (v) => { mode = v; run(); } });
    const aS = ui.slider(ctr, { label: '$\\alpha$ (고정값 / 자동의 초기값)', min: 0, max: 3, step: 0.05, value: 3, format: ui.fmt.f(2), onInput: run });
    const hS = ui.slider(ctr, { label: '목표 엔트로피 $\\bar{\\mathcal{H}}$', min: -2, max: 1, step: 0.1, value: -1, format: ui.fmt.f(1), onInput: run });
    const sS = ui.slider(ctr, { label: '초기 $\\sigma_0$', min: 0.1, max: 1.5, step: 0.05, value: 0.4, format: ui.fmt.f(2), onInput: run });
    const st = ui.stats(p.body, [
      { key: 'succ', label: '넓은 봉우리(a≈2) 도달', tone: 'accent' },
      { key: 'eq', label: '최종 $\\mathbb{E}_\\pi[Q]$ 평균', tone: 'signal' },
      { key: 'sd', label: '최종 $\\sigma$ 평균' },
      { key: 'al', label: '최종 $\\alpha$ 평균' },
    ]);
    const top = document.createElement('div');
    const split = document.createElement('div');
    split.className = 'w-split';
    const l = document.createElement('div');
    const rr = document.createElement('div');
    split.append(l, rr);
    p.body.append(top, split);
    const qc = plot.line(top, { height: 180, x: { label: '행동 a', min: -3, max: 4 }, y: { label: 'Q(a)', min: 0, max: 1.15 }, series: [] });
    const mc = plot.line(l, { height: 240, x: { label: '스텝', min: 0 }, y: { label: 'μ (20개 시드)', min: -3, max: 4 }, series: [], hover: false });
    const ac = plot.line(rr, { height: 240, x: { label: '스텝', min: 0 }, y: { label: '평균 σ, 평균 α', min: 0 }, series: [] });
    const T = 600, N = 16, LR = 0.05, LRA = 0.02, SEEDS = 20, SMAX = Math.log(1.5);
    function run() {
      const a0 = aS.get(), Ht = hS.get(), s0 = sS.get();
      const paths = [], sdM = new Array(T + 1).fill(0), alM = new Array(T + 1).fill(0);
      const finals = [];
      for (let k = 0; k < SEEDS; k++) {
        const r = sim.rng(500 + k);
        let mu = -0.5, ls = Math.log(s0), la = Math.log(Math.max(a0, 1e-6));
        const path = [[0, mu]];
        sdM[0] += s0 / SEEDS; alM[0] += (mode === 'det' ? 0 : Math.exp(la)) / SEEDS;
        for (let t = 1; t <= T; t++) {
          const s = Math.exp(ls), al = mode === 'det' ? 0 : Math.exp(la);
          if (mode === 'det') {
            mu += LR * dQ(mu);
          } else {
            let gm = 0, gs = 0;
            for (let i = 0; i < N; i++) { const e = r.normal(); const d = dQ(mu + s * e); gm += d; gs += d * s * e; }
            gm /= N; gs = gs / N + al;
            mu += LR * gm;
            ls = sim.clamp(ls + LR * gs, -4, SMAX);
            if (mode === 'auto') la = sim.clamp(la - LRA * (HG(Math.exp(ls)) - Ht), -8, 2);
          }
          if (t % 5 === 0) path.push([t, mu]);
          sdM[t] += (mode === 'det' ? 0 : Math.exp(ls)) / SEEDS;
          alM[t] += (mode === 'det' ? 0 : (mode === 'auto' ? Math.exp(la) : a0)) / SEEDS;
        }
        const sdF = mode === 'det' ? 0 : Math.exp(ls);
        finals.push({ mu, sd: sdF, al: mode === 'det' ? 0 : (mode === 'auto' ? Math.exp(la) : a0), eq: sdF > 0 ? EQ(mu, sdF) : Q(mu) });
        paths.push(path);
      }
      const grid = plot.sample(Q, -3, 4, 300);
      qc.update({ series: [
        { name: 'Q(a)', color: 'c6', data: grid, endDot: false },
        { name: '최종 μ', color: 'c2', type: 'scatter', r: 4, data: finals.map((f) => [f.mu, Q(f.mu)]) },
      ] });
      mc.update({
        x: { label: '스텝', min: 0, max: T },
        series: paths.map((pp, i) => ({ name: i === 0 ? 'μ 궤적' : null, color: 'c1', opacity: 0.45, width: 1.2, data: pp, endDot: false })),
        hlines: [{ y: 2, label: '넓은 봉우리', color: 'good' }, { y: -0.8, label: '좁은 봉우리', color: 'bad' }],
      });
      ac.update({
        x: { label: '스텝', min: 0, max: T },
        series: [
          { name: '평균 σ', color: 'c3', data: sdM.map((v, t) => [t, v]).filter((_, t) => t % 5 === 0) },
          { name: '평균 α', color: 'c5', data: alM.map((v, t) => [t, v]).filter((_, t) => t % 5 === 0) },
        ],
      });
      const succ = finals.filter((f) => Math.abs(f.mu - 2) < 0.8).length;
      st.set('succ', succ + ' / ' + SEEDS);
      st.set('eq', sim.mean(finals.map((f) => f.eq)).toFixed(3));
      st.set('sd', sim.mean(finals.map((f) => f.sd)).toFixed(2));
      st.set('al', mode === 'det' ? '–' : sim.mean(finals.map((f) => f.al)).toFixed(3));
    }
    run();
  }
})();
