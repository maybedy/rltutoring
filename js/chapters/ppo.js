/* 13 TRPO와 PPO */
(function () {
  const { ui, sim, plot } = RL;

  RL.chapter({
    id: 'ppo',
    title: 'TRPO와 PPO',
    subtitle: '정책 경사의 한 스텝은 얼마나 커도 될까. 성능 차이 보조정리는 새 정책의 이득을 옛 정책의 advantage로 표현한다. 다만 상태 분포가 바뀌는 만큼 오차가 생긴다. TRPO와 PPO는 이 오차를 KL이나 clip으로 묶는다.',
    time: 45,
    level: '중급 · 핵심',
    prereq: ['ac'],
    theses: ['T4', 'T5', 'T3'],
    easy: {
      hook: '좋았던 행동을 더 하되, 한 번에 너무 많이 바꾸지는 않는다.',
      intro: '<p>정책 경사로 한 번 고칠 때마다 새로 수백 판을 해야 한다면 너무 비싸다. 그래서 한 번 모은 경험으로 여러 번 고치고 싶어진다. 그런데 고칠수록 정책은 경험을 모을 때의 모습에서 멀어진다. 멀어질수록 옛 경험으로 새 정책을 판단한 결과가 틀려진다.</p><p>PPO는 간단한 규칙으로 이 문제를 막는다. 어떤 행동의 확률을 <strong>원래의 1.2배까지</strong>(또는 0.8배까지) 바꾸는 동안은 이득을 인정하고, 그보다 더 바꾸면 늘어난 이득을 더는 인정하지 않는다. 더 바꿀 이유가 없어지므로 정책이 스스로 멈춘다.</p>',
      analogy: '익숙한 동네 지도를 들고 길을 찾는 상황이다. 지도에 나온 근처에서는 지도를 믿고 빠르게 움직여도 된다. 하지만 지도 바깥으로 멀리 나가면 지도가 더는 맞지 않는다. 옛 정책으로 모은 경험이 그 지도다. PPO의 clip은 "지도가 맞는 범위 안에서만 움직여라"라는 울타리다.',
      path: ['새 확률을 직접 끌어 보며 비율과 clip이 어디서 걸리는지 본다', '구체적인 숫자로 비율, clip, PPO 목적값을 계산한다', '같은 경험을 여러 번 재사용하면 무엇이 망가지는지 실험한다', 'LLM 학습(RLHF, GRPO)에서 PPO가 어떻게 쓰이는지 본다'],
      recap: [
        '한 번 모은 경험으로 여러 번 고치면 효율적이지만, 정책이 멀어질수록 그 경험으로 내린 판단이 틀려진다.',
        'PPO는 행동 확률이 원래보다 일정 비율 이상 바뀌면, 그 이상의 이득을 인정하지 않는다.',
        '그래서 같은 경험을 몇 번 다시 써도 크게 망가지지 않고, LLM 학습에서도 기본 도구로 쓰인다.',
      ],
    },
    goals: [
      '성능 차이 보조정리를 망원급수로 유도하고, 대리 목적함수 $L_\\pi(\\pi\')$가 어디서 근사되는지 짚을 수 있다.',
      'TRPO의 KL 제약 문제에서 자연 경사 스텝을 유도하고, Fisher 행렬의 역할을 설명할 수 있다.',
      'PPO-clip 목적함수에서 경사가 0이 되는 영역을 읽고, 한 배치를 여러 epoch 재사용할 때 clip이 하는 일을 실험으로 확인한다.',
    ],
    html: String.raw`
<p>정책 경사(<a href="#pg">11장</a>)는 현재 정책에서 뽑은 샘플로 지금 이 지점의 경사를 구한다. 두 가지 문제가 남는다. 첫째, 파라미터 공간에서 작은 스텝이 정책 공간에서는 큰 변화일 수 있다(소프트맥스 로짓 하나를 조금 바꿔도 확률이 0.5에서 0.99로 갈 수 있다). 둘째, 샘플은 비싼데 한 번 쓰고 버린다. 같은 배치로 여러 번 업데이트하려면 <strong>현재 정책 근처에서 믿을 수 있는 목적함수</strong>가 필요하다.</p>

<h2>성능 차이 보조정리</h2>
<p>Kakade & Langford(2002)의 보조정리는 두 정책의 성능 차이를 정확히 표현한다. 증명에는 벨만 방정식과 망원급수만 쓰인다.</p>
<div data-w="dv-pdl"></div>
<div class="thesis-box"><span class="label">대전제 T4 · 성능 차이와 신뢰영역</span>
<p>$J(\pi') - J(\pi) = \frac{1}{1-\gamma}\mathbb{E}_{s\sim d^{\pi'},a\sim\pi'}[A^\pi(s,a)]$. 우변의 advantage는 추정할 수 있는 옛 정책의 값이지만, 상태 분포 $d^{\pi'}$는 아직 실행해 보지 않은 새 정책의 분포다. 이 분포를 옛 정책의 $d^\pi$로 바꾼 것이 <strong>대리 목적함수</strong>다. 바꿔서 생기는 오차는 두 정책의 차이(KL, 총변동 거리)로 위에서 묶인다. 정책을 조금씩만 바꿔야 한다는 원칙이 여기서 나온다. RLHF의 KL 페널티(<a href="#rlhf">19장</a>)와 GRPO의 clip(<a href="#reasoning">21장</a>)도 같은 계보다.</p>
</div>

<h2>대리 목적함수와 그 한계</h2>
<div data-w="fx-surr"></div>
<p>$\pi' = \pi$에서 대리 목적함수는 $J$와 <strong>값도 같고 1차 미분도 같다</strong>. 실제로 $\nabla_{\theta'}L_\pi(\pi_{\theta'})|_{\theta'=\theta} = \frac{1}{1-\gamma}\mathbb{E}_{d^\pi,\pi}[\nabla\log\pi\,A^\pi]$이고, 이것은 정책 경사 정리와 같은 식이다. 그래서 스텝이 작으면 $L$을 올릴 때 $J$도 오른다. 스텝이 얼마나 작아야 하는지는 다음 부등식이 알려 준다(Schulman et al. 2015, TRPO 정리 1).</p>
$$J(\pi') \;\ge\; L_\pi(\pi') - \frac{4\epsilon\gamma}{(1-\gamma)^2}\,\max_s \mathrm{KL}\big(\pi(\cdot|s)\,\|\,\pi'(\cdot|s)\big), \qquad \epsilon = \max_{s,a}|A^\pi(s,a)|$$
<p>우변을 최대화하면 $J$가 단조 증가한다(minorize-maximize). 계수 $(1-\gamma)^{-2}$가 매우 커서 이 식을 그대로 쓰면 스텝이 지나치게 작아진다. 실용적인 해법은 페널티를 제약으로 바꾸는 것이다.</p>
$$\max_{\theta'}\; \mathbb{E}_{s\sim d^{\pi},\,a\sim\pi}\Big[\frac{\pi_{\theta'}(a|s)}{\pi_\theta(a|s)}A^{\pi}(s,a)\Big] \quad\text{s.t.}\quad \mathbb{E}_{s\sim d^\pi}\big[\mathrm{KL}(\pi_\theta(\cdot|s)\,\|\,\pi_{\theta'}(\cdot|s))\big] \le \delta$$
<p>이 제약 문제를 푸는 방법이 <strong>TRPO</strong>다. 그보다 앞선 CPI(Kakade & Langford 2002)는 새 정책을 옛 정책과 작은 비율로 섞는 혼합 정책 $(1-\alpha)\pi + \alpha\pi'$로 같은 보장을 얻었지만, 혼합 정책은 실제로 쓰기 어려웠다.</p>

<h2>자연 경사: KL 기하에서의 최급 상승</h2>
<p>목적을 1차, KL 제약을 2차로 근사하면 닫힌 해가 나온다. KL의 헤시안이 Fisher 정보 행렬 $F = \mathbb{E}[\nabla\log\pi\,\nabla\log\pi^\top]$이다.</p>
<div data-w="dv-npg"></div>
<p>TRPO는 $F^{-1}g$를 직접 구하지 않는다. 켤레 기울기법(conjugate gradient)으로 $Fx = g$를 풀고(Fisher-벡터 곱만 있으면 된다), 실제 KL과 개선량을 확인하는 선형 탐색(line search)을 덧붙인다. 정확하지만 구현이 복잡하고, dropout이나 actor-critic 파라미터 공유와 함께 쓰기 어렵다.</p>

<h2>PPO: 1차 최적화로 신뢰영역 흉내 내기</h2>
<p>Schulman et al.(2017)의 PPO는 제약을 없애고 목적함수 자체를 바꾼다. 비율 $r_t(\theta) = \pi_\theta(a_t|s_t)/\pi_{\theta_{\text{old}}}(a_t|s_t)$가 $[1-\epsilon, 1+\epsilon]$을 벗어나 목적이 더 좋아지는 쪽으로 가면, 그만큼의 이득은 인정하지 않는다.</p>
<p>규칙을 식으로 보기 전에 슬라이더로 먼저 확인한다. 행동 하나의 새 확률을 끌어 올리면, PPO가 어느 지점부터 이득을 더 인정하지 않는지가 보인다.</p>
<div data-w="try-ratio"></div>
<div data-w="fx-clip"></div>
<div data-w="step-clip"></div>
<div data-w="clip-plot"></div>
<p>그래프를 읽을 때 기억할 점은 하나다. <strong>clip된 값이 min으로 선택되는 구간에서는 경사가 0</strong>이다. $A>0$인 샘플은 확률을 $1+\epsilon$배까지만 올리고 멈추고, $A<0$인 샘플은 $1-\epsilon$배까지만 내리고 멈춘다. 좋은 행동의 확률이 오히려 떨어진 경우($A>0$이고 $r<1-\epsilon$)에는 clip이 걸리지 않아 경사가 살아 있고, 그 실수를 되돌린다. 그래서 $L^{\text{CLIP}}$은 대리 목적함수의 비관적 하한이다.</p>
<h3>PPO-penalty</h3>
<p>같은 논문의 다른 버전은 KL을 목적함수에 페널티로 넣고 계수를 적응적으로 조절한다. 측정한 $d = \mathbb{E}[\mathrm{KL}(\pi_{\text{old}}\|\pi)]$가 목표 $d_{\text{targ}}$의 1.5배를 넘으면 $\beta \leftarrow 2\beta$, 1/1.5배보다 작으면 $\beta \leftarrow \beta/2$로 바꾼다.</p>
$$L^{\text{KLPEN}}(\theta) = \mathbb{E}_t\Big[r_t(\theta)\hat A_t - \beta\,\mathrm{KL}\big(\pi_{\theta_{\text{old}}}(\cdot|s_t)\,\|\,\pi_\theta(\cdot|s_t)\big)\Big]$$
<p>논문의 벤치마크에서는 clip 버전이 더 좋았고 이후 표준이 되었다. 반면 RLHF에서는 KL이 "기준 모델에서 너무 멀어지지 말라"는 정렬 목표의 일부라서 페널티 형태가 다시 중요해진다(T5, <a href="#llm-mdp">18장</a>).</p>

<h2>실험: 한 배치를 여러 epoch 재사용하기</h2>
<p>정책은 1차원 가우시안 $\pi = \mathcal{N}(\mu,\sigma^2)$이고, 보상은 봉우리 두 개짜리 함수에 잡음을 더한 값이다(오른쪽 봉우리가 더 높다). 현재 정책 $\mathcal{N}(0,1)$에서 32개 행동을 뽑아 정규화된 advantage를 만들고, <strong>같은 배치</strong>로 세 가지 목적함수를 경사 상승한다. 참 기대 보상 $J$와 $\mathrm{KL}(\pi_{\text{old}}\|\pi)$는 닫힌 식으로 정확히 계산한다. 곡선은 서로 다른 배치 20개의 평균이다.</p>
<div data-w="epochs"></div>
<ul>
  <li><strong>중요도 비율만 쓴 목적함수</strong>는 배치 위의 추정치(점선)가 계속 오르지만, 참 $J$는 어느 순간부터 떨어진다. 운 좋은 몇몇 샘플에 확률을 몰아주면서 $\sigma$가 붕괴하고 KL이 폭발한다. 대리 목적함수가 데이터 밖으로 근거 없이 외삽하는 경우다.</li>
  <li><strong>clip</strong>은 비율이 경계를 넘은 샘플의 경사를 꺼서 몇 epoch 뒤 스스로 멈춘다. 개선은 작지만 KL이 묶인다.</li>
  <li><strong>KL 페널티</strong>는 매끄럽게 멈추지만 $\beta$에 민감하다. $\beta$를 0으로 내리면 중요도 비율 버전과 같아진다.</li>
</ul>
<div class="warn"><span class="label">주의</span>clip은 KL을 직접 제한하지 않는다. 학습률을 키우거나 epoch을 늘리면 clip 버전도 KL이 커진다. 실전 PPO가 epoch 수를 3~10으로 작게 두고, 측정 KL이 기준을 넘으면 그 배치의 남은 epoch을 건너뛰는(early stopping) 이유다.</div>

<h2>PPO를 실제로 동작하게 하는 것들</h2>
<p>Engstrom et al.(2020, "Implementation Matters in Deep Policy Gradients")은 PPO가 TRPO보다 나은 성능의 상당 부분이 clip보다 <strong>코드 수준의 세부 사항</strong>에서 나온다는 것을 보였다. Huang et al.(2022, "The 37 Implementation Details of PPO")과 Andrychowicz et al.(2021, "What Matters in On-Policy RL")이 그 목록을 정리했다.</p>
<div class="table-wrap"><table class="t">
<thead><tr><th>세부 사항</th><th>하는 일</th><th>관련 원리</th></tr></thead>
<tbody>
<tr><td>GAE ($\lambda\approx0.95$)</td><td>advantage 추정</td><td>T6, <a href="#ac">12장</a></td></tr>
<tr><td>advantage 정규화 (미니배치 평균 0, 표준편차 1)</td><td>보상 스케일과 무관한 스텝 크기</td><td>baseline + 스케일 불변</td></tr>
<tr><td>미니배치 · 소수 epoch (3~10)</td><td>표본 재사용과 신뢰영역의 타협</td><td>T4</td></tr>
<tr><td>value 손실 clip, 별도 학습률</td><td>critic의 급변 방지</td><td>T8 (부트스트랩 안정성)</td></tr>
<tr><td>학습률 선형 감소, Adam $\epsilon$</td><td>후반 진동 억제</td><td>확률적 근사</td></tr>
<tr><td>관측 · 보상 정규화(running std)</td><td>입력과 타깃 스케일 고정</td><td>함수근사 조건수</td></tr>
<tr><td>직교 초기화, 정책 출력층 작은 스케일</td><td>초기 정책을 거의 균등하게</td><td>탐험, 엔트로피</td></tr>
<tr><td>경사 노름 clip (0.5)</td><td>드문 큰 경사 차단</td><td>분산 통제</td></tr>
<tr><td>KL 기반 early stopping</td><td>clip이 못 막는 KL 폭주 차단</td><td>T4</td></tr>
</tbody></table></div>

<h2>LLM에서의 PPO</h2>
<p>InstructGPT(Ouyang et al. 2022)의 RLHF는 PPO를 토큰 단위로 돌린다. 응답 끝에 보상 모델 점수를 주고, 매 토큰에 기준 모델과의 로그비율 페널티를 더한다. value head가 토큰별 가치를 예측하고, GAE($\gamma=1$)로 advantage를 만든다(<a href="#rlhf">19장</a>).</p>
$$r_t = -\beta\log\frac{\pi_\theta(y_t|x,y_{\lt t})}{\pi_{\text{ref}}(y_t|x,y_{\lt t})} + \mathbb{1}[t = T]\cdot r_\phi(x, y)$$
<p>GRPO(Shao et al. 2024)는 여기서 critic을 없앤다. 같은 프롬프트의 응답 $G$개로 보상을 정규화하고, 그 상대 보상을 모든 토큰의 advantage로 쓴다. clip 목적함수는 그대로 둔다. GRPO를 "critic 없는 PPO"라고 부르는 이유다(<a href="#reasoning">21장</a>).</p>

<h2>파생 알고리즘: 무엇이 바뀌었나</h2>
<div class="table-wrap"><table class="t">
<thead><tr><th>알고리즘</th><th>신뢰영역을 만드는 방법</th><th>바뀐 점</th></tr></thead>
<tbody>
<tr><td>CPI (Kakade & Langford 2002)</td><td>혼합 정책 $(1-\alpha)\pi + \alpha\pi'$</td><td>최초의 단조 개선 보장</td></tr>
<tr><td>Natural PG (Kakade 2001)</td><td>Fisher 계량으로 스텝 방향 교정</td><td>파라미터화 불변</td></tr>
<tr><td>TRPO (Schulman 2015)</td><td>평균 KL ≤ δ 제약 + CG + 선형 탐색</td><td>실용적 신뢰영역</td></tr>
<tr><td>ACKTR (Wu 2017)</td><td>K-FAC으로 Fisher 근사</td><td>2차 정보를 싸게</td></tr>
<tr><td>PPO-penalty / PPO-clip (Schulman 2017)</td><td>적응 KL 페널티 / 비율 clip</td><td>1차 최적화, 미니배치 여러 epoch</td></tr>
<tr><td>MPO (Abdolmaleki 2018)</td><td>KL 제약 하 비모수 개선 $q \propto \pi e^{Q/\eta}$ 후 투영</td><td>T5 닫힌 해 + 증류(T9)</td></tr>
<tr><td>PPG (Cobbe 2021)</td><td>정책/가치 단계 분리</td><td>공유 몸통 간섭 제거</td></tr>
<tr><td>GRPO (Shao 2024) <a href="#reasoning">21</a></td><td>PPO clip + 참조 KL</td><td>critic 제거, 그룹 상대 advantage</td></tr>
<tr><td>DAPO (Yu 2025) <a href="#reasoning">21</a></td><td>비대칭 clip ($\epsilon_{\text{low}} < \epsilon_{\text{high}}$)</td><td>엔트로피 붕괴 완화</td></tr>
</tbody></table></div>
`,
    mount: {
      'dv-pdl': (el) => ui.derivation(el, {
        title: '성능 차이 보조정리 (Kakade & Langford 2002)',
        easy: '새 정책이 옛 정책보다 얼마나 나은지는 "새 정책으로 다니면서, 옛 정책 기준으로 평소보다 잘한 정도를 모두 더한 것"과 같다. 어려운 점은 새 정책이 어디를 다닐지 아직 모른다는 것이다. 그래서 옛 정책이 다닌 곳으로 대신하고, 행동만 확률 비율로 보정한다.',
        steps: [
          { tex: String.raw`A^\pi(s_t,a_t) = \mathbb{E}_{s_{t+1}}\big[r_{t+1} + \gamma V^\pi(s_{t+1}) - V^\pi(s_t) \mid s_t,a_t\big]`, why: 'advantage를 한 스텝 전개로 쓴다. 이 기댓값은 전이 $P$만으로 정해지므로, $a_t$를 어떤 정책으로 골랐는지와 상관이 없다.' },
          { tex: String.raw`\mathbb{E}_{\tau\sim\hl{\pi'}}\Big[\sum_{t\ge0}\gamma^t A^\pi(s_t,a_t)\Big] = \mathbb{E}_{\tau\sim\pi'}\Big[\sum_{t\ge0}\gamma^t\big(r_{t+1} + \gamma V^\pi(s_{t+1}) - V^\pi(s_t)\big)\Big]`, why: '새 정책 $\\pi\'$의 궤적 위에서 옛 정책의 advantage를 할인해 더한다.' },
          { tex: String.raw`\sum_{t\ge0}\gamma^t\big(\gamma V^\pi(s_{t+1}) - V^\pi(s_t)\big) = \hl{-V^\pi(s_0)}`, why: '망원급수다. $\\gamma V(s_1) - V(s_0) + \\gamma^2 V(s_2) - \\gamma V(s_1) + \\cdots$에서 첫 항만 남는다.', easy: '같은 항이 한 번은 더해지고 다음 줄에서 한 번은 빠진다. 3 − 2 + 5 − 3 + 7 − 5처럼 이웃끼리 지워져서, 맨 처음의 −V(s₀) 하나만 남는다.' },
          { tex: String.raw`= \mathbb{E}_{\tau\sim\pi'}\Big[\sum_t\gamma^t r_{t+1}\Big] - \mathbb{E}_{s_0\sim\rho_0}\big[V^\pi(s_0)\big] = \hl{J(\pi') - J(\pi)}`, why: '첫 항은 새 정책의 기대 리턴이고, 둘째 항은 옛 정책의 기대 리턴이다(시작 분포는 같다).' },
          { tex: String.raw`\boxed{\;J(\pi') - J(\pi) = \frac{1}{1-\gamma}\,\mathbb{E}_{s\sim \hl{d^{\pi'}},\;a\sim\pi'(\cdot|s)}\big[A^\pi(s,a)\big]\;}`, why: '시간 합을 할인 상태 방문 분포 $d^{\\pi\'}$로 바꾼다. 따름정리로, 모든 상태에서 $\\mathbb{E}_{a\\sim\\pi\'}[A^\\pi(s,a)] \\ge 0$이면 $\\pi\'$은 $\\pi$보다 낫다. 03장의 정책 개선 정리가 이렇게 다시 나온다.' },
          { tex: String.raw`L_\pi(\pi') = J(\pi) + \frac{1}{1-\gamma}\,\mathbb{E}_{s\sim \hl{d^{\pi}},\;a\sim\pi}\Big[\hl{\frac{\pi'(a|s)}{\pi(a|s)}}A^\pi(s,a)\Big]`, why: '$d^{\\pi\'}$를 아직 모르므로 $d^\\pi$로 바꾸고, 행동은 중요도 비율로 보정한다. TRPO와 PPO가 정책을 조금씩만 바꾸는 이유가 이 바꿔치기에서 나온다.' },
        ],
      }),
      'fx-surr': (el) => ui.formula(el, {
        title: '대리 목적함수 해부',
        say: '{L|새 정책이 얼마나 좋을지의 어림값}은, {d|옛 정책이 들렀던 상황들}에서 {a|옛 정책이 실제로 한 행동}마다, {A|그 행동이 평소보다 얼마나 좋았는지}에 {r|새 정책이 그 행동을 몇 배 더 자주 할지}를 곱해 평균 낸 것이다.',
        tex: String.raw`\tm{L}{L_\pi(\pi')} = J(\pi) + \frac{1}{1-\gamma}\,\tm{d}{\mathbb{E}_{s\sim d^{\pi}}}\,\tm{a}{\mathbb{E}_{a\sim\pi(\cdot|s)}}\Big[\tm{r}{\frac{\pi'(a|s)}{\pi(a|s)}}\;\tm{A}{A^{\pi}(s,a)}\Big]`,
        terms: [
          { id: 'L', sym: "L_\\pi(\\pi')", label: '대리 목적함수', desc: '옛 정책 데이터만으로 계산할 수 있는 J(π′)의 근사.', long: '$\\pi\' = \\pi$에서 $J$와 값·경사가 같다(1차 접촉). 멀어질수록 오차가 커지고, 그 오차는 최대 KL로 위에서 묶인다.' },
          { id: 'd', sym: '\\mathbb{E}_{s\\sim d^\\pi}', label: '옛 상태 분포', desc: '근사가 생기는 곳. 원래는 d^{π′}이어야 한다.', long: '새 정책이 방문할 상태를 옛 정책이 방문한 상태로 대신한다. 정책이 조금 바뀌면 방문 분포도 조금만 바뀐다고 가정한다. 지평이 길면 이 가정이 깨지기 쉬워 오차 계수 $(1-\\gamma)^{-2}$가 커진다.' },
          { id: 'a', sym: '\\mathbb{E}_{a\\sim\\pi}', label: '옛 정책의 행동', desc: '배치에 저장된 실제 행동.' },
          { id: 'r', sym: "\\pi'/\\pi", label: '중요도 비율', desc: '새 정책에서 이 행동이 얼마나 더(덜) 나올지.', long: '행동 분포의 차이는 정확히 보정된다(불편). 하지만 비율이 크면 분산이 커지고, 배치에 없는 행동은 아무것도 알려 주지 않는다. PPO는 이 비율을 $[1-\\epsilon, 1+\\epsilon]$에서 자른다.' },
          { id: 'A', sym: 'A^\\pi', label: '옛 정책의 advantage', desc: 'GAE 등으로 추정. 업데이트 중에는 고정.' },
        ],
      }),
      'dv-npg': (el) => ui.derivation(el, {
        title: 'KL 제약 하의 최급 상승 = 자연 경사',
        easy: '파라미터를 같은 크기만큼 움직여도 정책이 바뀌는 정도는 방향마다 다르다. "정책이 얼마나 바뀌는지"를 자로 삼아, 같은 변화량 안에서 가장 많이 좋아지는 방향을 고르면 자연 경사가 된다.',
        steps: [
          { tex: String.raw`\max_{\Delta}\; g^\top\Delta \quad\text{s.t.}\quad \tfrac12\Delta^\top F\Delta \le \delta`, why: '목적 $L$을 1차 근사($g = \\nabla L = \\nabla J$), 평균 KL을 2차 근사한다. $\\mathrm{KL}(\\pi_\\theta\\|\\pi_{\\theta+\\Delta}) \\approx \\tfrac12\\Delta^\\top F\\Delta$이고 1차 항은 0이다.' },
          { tex: String.raw`F = \mathbb{E}_{s\sim d^\pi,\,a\sim\pi}\big[\nabla_\theta\log\pi_\theta(a|s)\,\nabla_\theta\log\pi_\theta(a|s)^\top\big]`, why: 'KL의 헤시안 = 점수함수의 공분산 = Fisher 정보 행렬. 정책 공간의 "거리"를 재는 계량(metric)이다.' },
          { tex: String.raw`\mathcal{L}(\Delta,\lambda) = g^\top\Delta - \lambda\big(\tfrac12\Delta^\top F\Delta - \delta\big) \;\Rightarrow\; g - \lambda F\Delta = 0 \;\Rightarrow\; \hl{\Delta = \tfrac{1}{\lambda}F^{-1}g}`, why: '라그랑주 승수법을 쓴다. 방향은 $F^{-1}g$(자연 경사)로 정해진다.' },
          { tex: String.raw`\tfrac12\Delta^\top F\Delta = \delta \;\Rightarrow\; \boxed{\;\Delta = \sqrt{\frac{2\delta}{g^\top F^{-1}g}}\;F^{-1}g\;}`, why: '제약이 활성일 때 크기를 맞춘다. 학습률 대신 "정책이 얼마나 바뀔지($\\delta$)"를 직접 지정하는 셈이다.' },
          { tex: String.raw`\text{표 형태 소프트맥스: } \pi_{k+1}(a|s) \propto \pi_k(a|s)\,\exp\big(\eta\,A^{\pi_k}(s,a)\big)`, why: '소프트맥스 정책에서는 자연 경사 스텝이 정확히 이 곱셈 갱신이 된다(Kakade 2001; Agarwal et al. 2021). <strong>T5의 KL-정규화 닫힌 해</strong>와 모양이 같다. 신뢰영역 정책 최적화는 옛 정책을 exp(advantage)로 다시 가중하는 일로 정리된다.' },
        ],
      }),
      'fx-clip': (el) => ui.formula(el, {
        title: 'PPO-clip 목적함수 해부',
        say: '{E|모아 둔 경험 전체에서}, {r|확률이 몇 배 바뀌었는지}에 {A|그 행동이 평소보다 얼마나 좋았는지}를 곱한 값과, {c|배율을 0.8~1.2배 안으로 묶은 값}에 같은 것을 곱한 값 중 {min|더 작은 쪽}을 골라 평균 낸다.',
        tex: String.raw`L^{\mathrm{CLIP}}(\theta) = \tm{E}{\hat{\mathbb{E}}_t}\Big[\tm{min}{\min}\big(\tm{r}{r_t(\theta)}\,\tm{A}{\hat A_t},\;\; \tm{c}{\clip\big(r_t(\theta),\,1-\epsilon,\,1+\epsilon\big)}\,\hat A_t\big)\Big]`,
        terms: [
          { id: 'E', sym: '\\hat{\\mathbb{E}}_t', label: '배치 평균', desc: 'π_old로 모은 타임스텝의 평균. 미니배치로 나눠 여러 epoch 반복한다.' },
          { id: 'min', sym: '\\min', label: '비관적 선택', desc: 'clip 전과 후 중 작은 쪽. 낙관적 외삽을 버린다.', long: 'min 때문에 목적함수는 clip하지 않은 대리 목적함수의 하한이 된다. "너무 좋아 보이는 개선"은 무시하고 "나빠지는 것"은 그대로 반영한다.' },
          { id: 'r', sym: 'r_t(\\theta)', label: '확률 비율', desc: 'π_θ(a_t|s_t) / π_old(a_t|s_t). 처음엔 1.', long: '첫 epoch의 첫 스텝에서는 모든 비율이 1이라 PPO는 일반 정책 경사와 같다. 업데이트가 쌓일수록 비율이 1에서 멀어지고 clip이 개입한다.' },
          { id: 'A', sym: '\\hat A_t', label: 'advantage', desc: 'GAE로 추정, 보통 미니배치에서 정규화.', long: '부호가 clip의 방향을 정한다. $A>0$이면 위쪽 경계 $1+\\epsilon$, $A<0$이면 아래쪽 경계 $1-\\epsilon$에서 경사가 꺼진다.' },
          { id: 'c', sym: '\\clip(r,1-\\epsilon,1+\\epsilon)', label: 'clip된 비율', desc: '경계 밖에서는 상수라서 θ로 미분하면 0이다.', long: '$\\epsilon$은 보통 0.1~0.3이다. DAPO는 위아래 경계를 다르게 두어($\\epsilon_{\\text{high}}$를 키움) 확률이 낮은 좋은 토큰이 더 빨리 올라가게 했다.' },
        ],
      }),
      'try-ratio': mountRatio,
      'step-clip': (el) => ui.walkthrough(el, {
        title: '숫자로 계산하는 비율과 clip',
        caption: '빈칸에 계산한 값을 넣고 "확인"을 누르면 맞았는지 알려 준다. clip 범위는 $\\epsilon = 0.2$다.',
        steps: [
          { say: '옛 정책은 이 행동을 확률 0.4로 했다. 몇 번 고친 뒤 새 정책은 0.6으로 한다. 비율 r = 새 확률 ÷ 옛 확률은?', ask: { answer: 1.5, tol: 0.01 }, calc: String.raw`r = \frac{0.6}{0.4} = 1.5` },
          { say: '이 행동의 advantage는 +2였다(평소보다 2만큼 좋았다). clip 없이 계산한 이득 r × A는?', ask: { answer: 3, tol: 0.01 }, calc: String.raw`r\,\hat A = 1.5\times2 = 3` },
          { say: '이제 비율을 [0.8, 1.2] 안으로 묶는다. 1.5는 1.2로 잘린다. 잘린 비율 × A는?', ask: { answer: 2.4, tol: 0.01 }, calc: String.raw`\clip(1.5,\,0.8,\,1.2)\times2 = 1.2\times2 = 2.4` },
          { say: 'PPO는 두 값 중 작은 쪽인 2.4를 쓴다. 2.4는 새 확률에 따라 변하지 않는 상수라서, 여기서 확률을 더 올려도 목적값이 늘지 않는다. 그런데 advantage가 −2였다면? 그대로 계산한 값 1.5 × (−2)와 잘린 값 1.2 × (−2) 중 작은 쪽은?', ask: { answer: -3, tol: 0.01 }, calc: String.raw`\min\big(1.5\times(-2),\ 1.2\times(-2)\big) = \min(-3,\ -2.4) = -3` },
          { say: '이때는 잘리지 않은 −3이 선택된다. −3은 새 확률에 따라 변하므로 경사가 살아 있고, PPO는 이 나쁜 행동의 확률을 다시 내리려 한다. 좋은 쪽으로 너무 간 것은 멈추고, 나쁜 쪽으로 간 실수는 되돌린다.', calc: String.raw`\hat A>0,\ r>1+\epsilon:\ \text{경사 }0 \qquad \hat A<0,\ r>1+\epsilon:\ \text{경사 살아 있음}` },
        ],
      }),
      'clip-plot': mountClipPlot,
      epochs: mountEpochs,
    },
    tacit: [
      { tag: 'math', t: 'clip은 신뢰영역이 아니다',
        d: '<p>$L^{\\text{CLIP}}$은 배치 안의 샘플에서 "비율을 경계 밖으로 더 밀 유인"만 없앤다. 다른 샘플의 경사가 공유 파라미터를 움직이면 이미 경계를 넘은 샘플의 비율도 계속 변하고, 배치 밖의 상태에서 정책이 얼마나 바뀌는지는 전혀 통제하지 않는다. 실제로 PPO 학습 중 비율이 $1\\pm\\epsilon$을 크게 넘는다는 관찰이 있다(Engstrom et al. 2020; Wang et al. 2020 "Truly PPO"). 신뢰영역 역할은 결국 작은 학습률, 적은 epoch, KL early stopping이 함께 맡는다.</p>' },
      { tag: 'math', t: '자연 경사 = 미러 디센트 = exp(advantage) 재가중',
        d: '<p>Fisher 계량으로 잰 최급 상승은 파라미터화에 불변이고, 소프트맥스에서는 $\\pi_{k+1}\\propto\\pi_k e^{\\eta A}$가 된다. KL을 근접항으로 쓰는 미러 디센트(Tomar et al. 2020, MDPO)나 곱셈 가중치(multiplicative weights) 알고리즘과 같은 갱신이다. 이렇게 보면 TRPO, PPO, MPO, RLHF의 KL-정규화 목적은 모두 $\\max \\mathbb{E}[A] - \\frac1\\eta\\mathrm{KL}$을 근사적으로 푸는 방법이고, 정확한 해는 T5의 닫힌 해다. Adam이 작은 학습률에서 대략 대각 Fisher 전처리처럼 동작한다는 해석도 같은 맥락이다.</p>' },
      { tag: 'practice', t: 'PPO가 이상할 때 먼저 볼 숫자 네 가지',
        d: '<ul><li><strong>approx KL</strong> — 업데이트 전후 정책의 KL이다. 갑자기 튀면 학습률이나 epoch 수를 의심한다. 배치(옛 정책 샘플) 위에서 $\\rho = \\pi/\\pi_{\\text{old}}$로 $k_3 = (\\rho - 1) - \\log\\rho$를 평균 내면 $\\mathrm{KL}(\\pi_{\\text{old}}\\|\\pi)$의 추정치가 된다. 음수가 나오지 않고 분산이 작아 널리 쓰인다(Schulman의 "Approximating KL Divergence" 노트).</li><li><strong>clip fraction</strong> — clip된 샘플의 비율이다. 흔히 0.1~0.3 정도를 건강한 범위로 본다.</li><li><strong>value explained variance</strong> — critic이 리턴의 변동을 얼마나 설명하는지 보여 준다.</li><li><strong>엔트로피 추이</strong> — 너무 빨리 떨어지면 조기 수렴을 의심한다.</li></ul>' },
      { tag: 'algo', t: 'min이 만드는 비대칭: 실수는 되돌리고 성공은 덜 밀어 준다',
        d: '<p>$A>0$인데 비율이 오히려 $1-\\epsilon$ 아래로 내려간 경우(좋은 행동의 확률이 떨어짐), clip된 값이 더 크므로 min은 clip하지 않은 쪽을 고르고 경사가 살아 있다. $A<0$인데 비율이 $1+\\epsilon$ 위로 올라간 경우도 마찬가지다. PPO는 잘못 간 방향을 바로잡을 때는 제한이 없고, 이득을 더 얻으려 할 때만 제한을 둔다. 이 비대칭 때문에 확률이 매우 낮은 좋은 토큰은 한 번에 $(1+\\epsilon)$배씩만 올라가 느리게 학습된다. DAPO의 clip-higher가 이 문제를 겨냥한다.</p>' },
      { tag: 'research', t: '지평이 길수록 신뢰영역은 좁아져야 한다',
        d: '<p>TRPO 하한의 $(1-\\gamma)^{-2}$는 정책 변화가 지평만큼 쌓여 상태 분포를 바꾸고, 그 변화가 다시 지평만큼 누적된다는 뜻이다. LLM은 $\\gamma=1$이고 응답이 수천 토큰이라, 토큰 단위 비율을 곱하면 시퀀스 단위 비율이 극단적으로 커지거나 작아진다. 토큰 단위 비율에 clip을 거는 GRPO와 시퀀스 단위 비율(길이 정규화)에 clip을 거는 GSPO(Zheng et al. 2025)는 이 점에서 갈린다. 중요도 비율을 어떤 단위로 재고 자를지가 긴 지평 RL의 중요한 설계 변수다.</p>' },
    ],
    quiz: [
      { q: '성능 차이 보조정리 $J(\\pi\')-J(\\pi) = \\frac{1}{1-\\gamma}\\mathbb{E}[A^\\pi]$에서 기댓값의 상태 분포는?', options: ['$d^\\pi$ (옛 정책)', '$d^{\\pi\'}$ (새 정책)', '$\\rho_0$', '균등 분포'], answer: 1,
        explain: '정확한 식에는 새 정책의 방문 분포가 들어간다. 대리 목적함수는 이 분포를 $d^\\pi$로 바꾸므로, 그 근사 오차 때문에 정책을 조금씩만 바꿔야 한다.' },
      { q: '$\\hat A_t > 0$이고 $r_t(\\theta) > 1+\\epsilon$일 때 $L^{\\text{CLIP}}$을 $\\theta$로 미분한 경사는?', options: ['$\\hat A_t\\nabla r_t$', '0', '$-\\hat A_t\\nabla r_t$', '$(1+\\epsilon)\\hat A_t$'], answer: 1,
        explain: 'min이 clip된 항 $(1+\\epsilon)\\hat A_t$를 고르고, 이 값은 $\\theta$가 바뀌어도 변하지 않는다. 그래서 더 밀어 올릴 이유가 사라진다.' },
      { q: 'TRPO에서 Fisher 정보 행렬 $F$의 역할은?', options: ['보상의 분산 추정', 'KL 발산의 2차 근사(정책 공간의 계량)', 'critic의 헤시안', '학습률 스케줄'], answer: 1,
        explain: '$\\mathrm{KL}(\\pi_\\theta\\|\\pi_{\\theta+\\Delta}) \\approx \\frac12\\Delta^\\top F\\Delta$이다. $F$는 파라미터 변화가 정책을 얼마나 바꾸는지 재는 계량이고, $F^{-1}g$가 자연 경사다.' },
      { q: '실험에서 중요도 비율만 쓴 목적함수를 오래 최적화하면 생기는 일로 옳은 것은?', options: ['참 J가 계속 오른다', '배치 위 추정치는 오르지만 참 J는 떨어지고 KL이 폭발할 수 있다', 'KL이 0으로 간다', 'clip과 결과가 같다'], answer: 1,
        explain: '배치에 있는 소수의 높은 보상 샘플에 확률을 몰아주면서 정책의 분산이 붕괴한다. 데이터 밖으로 외삽하는 것을 막는 장치가 없기 때문이다.' },
    ],
  });

  /* ---------- clip 목적함수 그래프 ---------- */
  function mountClipPlot(el) {
    const p = ui.panel(el, { kind: 'CALC', title: '$L^{\\text{CLIP}}$을 비율 $r$의 함수로 보기 (샘플 하나)', caption: 'clip 범위 $\\epsilon$과 $|\\hat A|$ 슬라이더를 움직이면, 실선(PPO의 목적)이 점선(clip 없는 $rA$)에서 갈라져 평평해지는 지점이 바뀐다. 굵은 주황 선 구간에서는 경사가 0이다.' });
    const ctr = ui.row(p.body);
    const eS = ui.slider(ctr, { label: 'clip 범위 $\\epsilon$', min: 0.05, max: 0.5, step: 0.05, value: 0.2, format: ui.fmt.f(2), onInput: draw });
    const mS = ui.slider(ctr, { label: '$|\\hat A|$', min: 0.2, max: 2, step: 0.1, value: 1, format: ui.fmt.f(1), onInput: draw });
    const split = document.createElement('div');
    split.className = 'w-split';
    const L = document.createElement('div');
    const R = document.createElement('div');
    split.append(L, R);
    p.body.appendChild(split);
    const opt = (title) => ({ height: 240, x: { label: '비율 r = π_θ / π_old  (' + title + ')', min: 0, max: 2 }, y: { label: '목적함수 값' }, series: [] });
    const pl = plot.line(L, opt('A > 0'));
    const pr = plot.line(R, opt('A < 0'));
    const st = ui.stats(p.body, [
      { key: 'pos', label: 'A>0: 경사 0 구간', tone: 'accent' },
      { key: 'neg', label: 'A<0: 경사 0 구간', tone: 'signal' },
    ]);
    function draw() {
      const eps = eS.get(), m = mS.get();
      const f = (A) => (r) => Math.min(r * A, sim.clamp(r, 1 - eps, 1 + eps) * A);
      const flatPos = plot.sample(f(m), 1 + eps, 2, 40);
      const flatNeg = plot.sample(f(-m), 0, 1 - eps, 40);
      pl.update({
        series: [
          { name: '$rA$ (clip 없음)', color: 'c6', dash: '5 4', data: plot.sample((r) => r * m, 0, 2, 100), endDot: false },
          { name: '$L^{\\text{CLIP}}$', color: 'c1', data: plot.sample(f(m), 0, 2, 200), endDot: false },
          { name: '경사 0', color: 'c2', width: 5, data: flatPos, endDot: false, hover: false },
        ],
        vlines: [{ x: 1 - eps, label: '1−ε' }, { x: 1 + eps, label: '1+ε' }],
      });
      pr.update({
        series: [
          { name: '$rA$ (clip 없음)', color: 'c6', dash: '5 4', data: plot.sample((r) => -r * m, 0, 2, 100), endDot: false },
          { name: '$L^{\\text{CLIP}}$', color: 'c1', data: plot.sample(f(-m), 0, 2, 200), endDot: false },
          { name: '경사 0', color: 'c2', width: 5, data: flatNeg, endDot: false, hover: false },
        ],
        vlines: [{ x: 1 - eps, label: '1−ε' }, { x: 1 + eps, label: '1+ε' }],
      });
      st.set('pos', 'r > ' + (1 + eps).toFixed(2));
      st.set('neg', 'r < ' + (1 - eps).toFixed(2));
    }
    draw();
  }

  /* ---------- 여러 epoch 재사용 실험 ---------- */
  const BUMPS = [{ h: 0.55, c: -1.2, w: 0.5 }, { h: 1.0, c: 2.0, w: 0.5 }];
  const rfun = (a) => BUMPS.reduce((s, b) => s + b.h * Math.exp(-((a - b.c) * (a - b.c)) / (2 * b.w * b.w)), 0);
  const Jtrue = (mu, sd) => BUMPS.reduce((s, b) => { const v = b.w * b.w + sd * sd; return s + b.h * (b.w / Math.sqrt(v)) * Math.exp(-((mu - b.c) * (mu - b.c)) / (2 * v)); }, 0);
  const klG = (m0, s0, m1, s1) => Math.log(s1 / s0) + (s0 * s0 + (m0 - m1) * (m0 - m1)) / (2 * s1 * s1) - 0.5;

  function epochTrace(method, acts, rs, adv, K, lr, eps, beta) {
    let mu = 0, ls = 0;
    const lp0 = acts.map((a) => -0.5 * a * a);
    const out = [];
    for (let k = 0; k <= K; k++) {
      const s = Math.exp(ls);
      let gm = 0, gl = 0, est = 0, maxLog = 0, clipped = 0;
      for (let i = 0; i < acts.length; i++) {
        const z = (acts[i] - mu) / s;
        const lr_ = -0.5 * z * z - ls - lp0[i];
        const rho = Math.exp(lr_);
        maxLog = Math.max(maxLog, Math.abs(lr_));
        est += rho * rs[i];
        const A = adv[i];
        let use = true;
        if (method === 'clip' && ((A > 0 && rho > 1 + eps) || (A < 0 && rho < 1 - eps))) { use = false; clipped++; }
        if (use) { gm += rho * A * z / s; gl += rho * A * (z * z - 1); }
      }
      const n = acts.length;
      out.push({ k, J: Jtrue(mu, s), kl: klG(0, 1, mu, s), est: est / n, maxLog, clipFrac: clipped / n, sd: s });
      if (k === K) break;
      gm /= n; gl /= n;
      if (method === 'kl') { const s2 = s * s; gm -= beta * mu / s2; gl -= beta * (1 - (1 + mu * mu) / s2); }
      const nrm = Math.hypot(gm, gl);
      if (nrm > 5) { gm *= 5 / nrm; gl *= 5 / nrm; }
      mu += lr * gm;
      ls = sim.clamp(ls + lr * gl, -5, 1.5);
    }
    return out;
  }

  function mountEpochs(el) {
    const p = ui.panel(el, { kind: 'SIM', title: '같은 배치로 K epoch: 중요도 비율 vs clip vs KL 페널티', caption: 'epoch 수 K와 학습률을 키우면 위 그래프의 분홍 점선(배치 위 추정치)과 분홍 실선(참 값)이 벌어지고, 왼쪽 아래 그래프에서 세 방법의 KL이 갈라진다.' });
    const ctr = ui.row(p.body);
    const kS = ui.slider(ctr, { label: 'epoch 수 K', min: 5, max: 80, step: 5, value: 60, format: ui.fmt.int, onInput: run });
    const lS = ui.slider(ctr, { label: '학습률', min: 0.05, max: 0.5, step: 0.05, value: 0.3, format: ui.fmt.f(2), onInput: run });
    const eS = ui.slider(ctr, { label: 'clip $\\epsilon$', min: 0.05, max: 0.5, step: 0.05, value: 0.2, format: ui.fmt.f(2), onInput: run });
    const bS = ui.slider(ctr, { label: 'KL 계수 $\\beta$', min: 0, max: 3, step: 0.1, value: 1, format: ui.fmt.f(1), onInput: run });
    const nS = ui.slider(ctr, { label: '보상 잡음', min: 0, max: 0.5, step: 0.05, value: 0.1, format: ui.fmt.f(2), onInput: run });
    const btns = ui.row(p.body, 'btns');
    let seed = 100;
    ui.button(btns, '다른 배치 20개', () => { seed += 20; run(); }, { primary: true });
    const st = ui.stats(p.body, [
      { key: 'j0', label: '시작 $J(\\pi_{\\text{old}})$' },
      { key: 'is', label: '<span class="col-c4">●</span> 비율만: 최종 J / KL' },
      { key: 'clip', label: '<span class="col-c1">●</span> clip: 최종 J / KL' },
      { key: 'kl', label: '<span class="col-c3">●</span> KL 페널티: 최종 J / KL' },
      { key: 'sd', label: '최종 σ (비율 / clip / KL)' },
    ]);
    const c1 = document.createElement('div');
    const split = document.createElement('div');
    split.className = 'w-split';
    const c2 = document.createElement('div');
    const c3 = document.createElement('div');
    split.append(c2, c3);
    p.body.append(c1, split);
    const jc = plot.line(c1, { height: 250, x: { label: 'epoch', min: 0 }, y: { label: '참 기대 보상 J', min: 0 }, series: [] });
    const kc = plot.line(c2, { height: 220, x: { label: 'epoch', min: 0 }, y: { label: 'log₁₀ KL(π_old‖π)' }, series: [] });
    const rc = plot.line(c3, { height: 220, x: { label: 'epoch', min: 0 }, y: { label: '배치 내 최대 |log 비율| (3에서 잘림)', min: 0, max: 3 }, series: [] });
    const M = [
      { key: 'is', name: '비율만 $r\\hat A$', color: 'c4' },
      { key: 'clip', name: 'PPO-clip', color: 'c1' },
      { key: 'kl', name: 'KL 페널티', color: 'c3' },
    ];
    function run() {
      const K = kS.get(), lr = lS.get(), eps = eS.get(), beta = bS.get(), noise = nS.get();
      const B = 20, N = 32;
      const agg = {};
      M.forEach((m) => (agg[m.key] = sim.range(K + 1).map(() => ({ J: 0, kl: 0, est: 0, maxLog: 0, sd: 0 }))));
      for (let b = 0; b < B; b++) {
        const r = sim.rng(seed + b);
        const acts = [], rs = [];
        for (let i = 0; i < N; i++) { const a = r.normal(); acts.push(a); rs.push(rfun(a) + noise * r.normal()); }
        const mm = sim.mean(rs), sd = sim.std(rs) + 1e-8;
        const adv = rs.map((x) => (x - mm) / sd);
        M.forEach((m) => {
          epochTrace(m.key, acts, rs, adv, K, lr, eps, beta).forEach((o, k) => {
            const a = agg[m.key][k];
            a.J += o.J / B; a.kl += o.kl / B; a.est += o.est / B; a.maxLog += o.maxLog / B; a.sd += o.sd / B;
          });
        });
      }
      const ser = (key, f) => agg[key].map((o, k) => [k, f(o)]);
      let jmax = 0;
      M.forEach((m) => agg[m.key].forEach((o) => { jmax = Math.max(jmax, o.J); }));
      jc.update({
        x: { label: 'epoch', min: 0, max: K },
        y: { label: '참 기대 보상 J (점선은 위로 잘릴 수 있음)', min: 0, max: Math.max(0.5, Math.ceil(jmax * 13) / 10) },
        series: M.map((m) => ({ name: m.name + ' · 참 J', color: m.color, data: ser(m.key, (o) => o.J) })).concat([
          { name: '비율만: 배치 위 추정치 $\\frac1N\\sum r_i R_i$', color: 'c4', dash: '4 4', data: ser('is', (o) => o.est) },
        ]),
      });
      kc.update({
        x: { label: 'epoch', min: 0, max: K },
        series: M.map((m) => ({ name: m.name, color: m.color, data: ser(m.key, (o) => Math.log10(Math.max(1e-4, o.kl))).slice(1) })),
      });
      rc.update({
        x: { label: 'epoch', min: 0, max: K },
        series: M.map((m) => ({ name: m.name, color: m.color, data: ser(m.key, (o) => o.maxLog) })),
        hlines: [{ y: Math.log(1 + eps), label: 'log(1+ε)' }],
      });
      const last = (key) => agg[key][K];
      st.set('j0', agg.is[0].J.toFixed(3));
      ['is', 'clip', 'kl'].forEach((key) => st.set(key, last(key).J.toFixed(3) + ' / ' + (last(key).kl < 100 ? last(key).kl.toFixed(2) : last(key).kl.toExponential(1))));
      st.set('sd', ['is', 'clip', 'kl'].map((key) => last(key).sd.toFixed(2)).join(' / '));
    }
    run();
  }
  /* ---------- 새 확률 끌어 보기 ---------- */
  function mountRatio(el) {
    const p = ui.panel(el, { kind: 'TRY', title: '너무 많이 바꾸지 않기: 새 확률 직접 끌어 보기', caption: '"새 확률" 슬라이더를 오른쪽으로 끌면 굵은 선(PPO 목적값)이 따라 오르다가 어느 지점부터 평평해진다. 그 지점에서 clip이 걸린다. advantage를 음수로 바꾸면 반대쪽에서 같은 일이 일어난다.' });
    const ctr = ui.row(p.body);
    const oS = ui.slider(ctr, { label: '옛 확률 $\\pi_{\\text{old}}$', min: 0.1, max: 0.9, step: 0.05, value: 0.4, format: ui.fmt.f(2), onInput: draw });
    const nS = ui.slider(ctr, { label: '새 확률 $\\pi_\\theta$ (끌어 보기)', min: 0.01, max: 0.99, step: 0.01, value: 0.44, format: ui.fmt.f(2), onInput: draw });
    const aS = ui.slider(ctr, { label: 'advantage $\\hat A$', min: -2, max: 2, step: 0.5, value: 1, format: (v) => (v > 0 ? '+' : '') + v.toFixed(1), onInput: draw });
    const eS = ui.slider(ctr, { label: 'clip 범위 $\\epsilon$', min: 0.1, max: 0.4, step: 0.05, value: 0.2, format: ui.fmt.f(2), onInput: draw });
    const st = ui.stats(p.body, [
      { key: 'r', label: '비율 $r$ = 새 ÷ 옛', tone: 'accent' },
      { key: 'raw', label: '그대로 계산한 이득 $rA$' },
      { key: 'clip', label: '잘린 비율로 계산한 이득' },
      { key: 'ppo', label: 'PPO 목적값 (둘 중 작은 쪽)', tone: 'signal' },
    ]);
    const msg = document.createElement('div');
    msg.className = 'fx-detail';
    const c = document.createElement('div');
    p.body.append(msg, c);
    const chart = plot.line(c, { height: 240, x: { label: '새 확률', min: 0, max: 1 }, y: { label: '이 샘플의 목적함수 값' }, series: [] });
    function draw() {
      const po = oS.get(), pn = nS.get(), A = aS.get(), eps = eS.get();
      const L = (x) => { const r = x / po; return Math.min(r * A, sim.clamp(r, 1 - eps, 1 + eps) * A); };
      const r = pn / po;
      const raw = r * A, cl = sim.clamp(r, 1 - eps, 1 + eps) * A, ppo = Math.min(raw, cl);
      const lo = po * (1 - eps), hi = po * (1 + eps);
      st.set('r', r.toFixed(2));
      st.set('raw', raw.toFixed(2));
      st.set('clip', cl.toFixed(2));
      st.set('ppo', ppo.toFixed(2));
      let text;
      if (A > 0) {
        text = pn < hi
          ? '이 행동은 평소보다 좋았다(A > 0). 새 확률이 아직 ' + hi.toFixed(2) + '(옛 확률의 ' + (1 + eps).toFixed(2) + '배)보다 낮다. 확률을 더 올리면 PPO 목적값이 오른다.'
          : '새 확률이 ' + hi.toFixed(2) + '(옛 확률의 ' + (1 + eps).toFixed(2) + '배)를 넘었다. 여기서는 더 올려도 PPO 목적값이 늘지 않는다. 더 밀 이유가 사라졌으므로 이 행동의 업데이트는 멈춘다.';
      } else if (A < 0) {
        text = pn > lo
          ? '이 행동은 평소보다 나빴다(A < 0). 새 확률이 아직 ' + lo.toFixed(2) + '(옛 확률의 ' + (1 - eps).toFixed(2) + '배)보다 높다. 확률을 내리면 PPO 목적값이 오른다.' + (pn > hi ? ' 지금은 나쁜 행동의 확률이 오히려 올라간 상태라 경사가 살아 있고, PPO가 이 실수를 되돌린다.' : '')
          : '새 확률이 ' + lo.toFixed(2) + '(옛 확률의 ' + (1 - eps).toFixed(2) + '배)보다 낮아졌다. 여기서는 더 내려도 PPO 목적값이 늘지 않는다.';
      } else text = 'advantage가 0이면 이 행동은 평소와 같았다는 뜻이다. 확률을 어떻게 바꿔도 목적값이 0이라 고칠 이유가 없다.';
      msg.innerHTML = text;
      chart.update({
        series: [
          { name: '그대로 계산한 $rA$', color: 'c6', dash: '5 4', data: plot.sample((x) => (x / po) * A, 0.01, 0.99, 120), endDot: false },
          { name: 'PPO 목적값 $\\min(rA, \\clip(r)A)$', color: 'c1', width: 3, data: plot.sample(L, 0.01, 0.99, 240), endDot: false, points: [[pn, ppo, 6]] },
        ],
        vlines: [{ x: lo, label: A < 0 ? '옛 확률의 ' + (1 - eps).toFixed(2) + '배' : '' }, { x: po, label: '' }, { x: hi, label: A >= 0 ? '옛 확률의 ' + (1 + eps).toFixed(2) + '배' : '' }],
      });
    }
    draw();
  }
})();
