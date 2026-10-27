/* 08 Q-learning의 여러 관점 */
(function () {
  const { ui, sim, plot } = RL;

  RL.chapter({
    id: 'qviews',
    title: 'Q-learning의 여러 관점',
    subtitle: '같은 한 줄 업데이트를 확률적 근사, 회귀, 엔트로피 정규화, 분포, 선형계획, 후계자 표현, 그리고 LLM의 logit으로 다시 읽는다. 관점마다 바뀌는 손잡이 하나가 새로운 알고리즘 계열이 되었다.',
    time: 50,
    level: '중급 · 관점 확장',
    prereq: ['qlearning'],
    theses: ['T1', 'T5', 'T8'],
    goals: [
      'Q-learning을 벨만 최적 연산자의 고정점을 찾는 확률적 근사(로빈스-먼로)로 설명하고, 스텝 크기 스케줄의 효과를 실험으로 확인한다.',
      'max를 log-sum-exp로 바꾸면 엔트로피 정규화 문제(T5)가 된다는 것을 유도하고 온도 $\\beta$의 역할을 설명할 수 있다.',
      '분포형 RL, 선형계획의 쌍대(점유 측도), 후계자 표현이 각각 Q의 어떤 성질을 일반화하는지 말할 수 있다.',
      'LLM의 logit이 토큰 단위 soft Q로 읽힌다는 관찰(Rafailov et al. 2024)의 근거를 유도할 수 있다.',
    ],
    html: String.raw`
<p>07장의 Q-learning 업데이트는 단 한 줄이다.</p>
$$Q(s,a) \leftarrow Q(s,a) + \alpha\big[r + \gamma\max_{a'}Q(s',a') - Q(s,a)\big]$$
<p>이 한 줄은 보는 각도에 따라 전혀 다른 수학 대상이 된다. 그리고 각 관점에서 "여기를 바꿔 보면?"이라는 질문이 하나의 연구 계열을 낳았다. 이 장은 여덟 개의 렌즈를 차례로 끼워 본다. 마지막 표가 지도 역할을 한다.</p>

<h2>렌즈 1 · 확률적 근사: 잡음 섞인 가치 반복</h2>
<p>가치 반복은 정확한 연산자 $\mathcal{T}^*$를 반복 적용한다. Q-learning은 그 연산자를 <strong>샘플 하나로 근사한 잡음 섞인 연산자</strong> $\hat{\mathcal{T}}$를 쓰고, 잡음을 스텝 크기로 평균낸다. 경사 하강법(GD)과 확률적 경사 하강법(SGD)의 관계와 같다.</p>
<div data-w="dv-sa"></div>
<p>아래 실험은 미끄러짐이 있는 4×3 격자에서 매 반복마다 모든 $(s,a)$를 한 번씩 샘플해 업데이트하는 <em>동기식</em> Q-learning이다. 정확한 가치 반복(파랑)은 $\gamma^k$로 떨어지고, 상수 스텝은 어느 높이에서 멈추며(잡음 바닥), $1/k$는 로빈스-먼로 조건을 만족하는데도 $\gamma$가 크면 매우 느리다.</p>
<div data-w="sa-demo"></div>
<div class="key"><span class="label">무엇이 바뀌었나</span>정확한 기댓값 → 샘플. 이 렌즈에서 나온 질문들: 스텝 크기 스케줄(Even-Dar & Mansour 2003), 분산 감소(Speedy Q-learning, Azar et al. 2011), 행렬 이득을 쓰는 2차 방법(Zap Q-learning, Devraj & Meyn 2017).</div>

<h2>렌즈 2 · 회귀: Fitted Q Iteration</h2>
<p>표 대신 함수 $f_\theta$를 쓰면 "한 칸 갱신"이 불가능하다. 대신 각 반복을 <strong>지도학습 회귀 문제</strong>로 바꾼다. 데이터셋 $\mathcal{D} = \{(s_i,a_i,r_i,s'_i)\}$에 대해</p>
$$Q_{k+1} = \arg\min_{f}\ \sum_i \Big(f(s_i,a_i) - \underbrace{\big[r_i + \gamma\max_{a'}Q_k(s'_i,a')\big]}_{y_i:\ \text{고정된 라벨}}\Big)^2$$
<p>라벨 $y_i$는 이전 반복의 $Q_k$로 계산되어 <strong>고정</strong>된다. 이것이 Fitted Q Iteration(Ernst et al. 2005; 신경망 버전 NFQ, Riedmiller 2005)이다. DQN(<a href="#dqn">10장</a>)은 이 내부 회귀를 SGD 몇천 스텝으로 대충 풀고, "고정된 이전 반복"을 <em>타깃 네트워크</em>로 구현한 것이다. 타깃 네트워크 갱신 주기는 곧 FQI의 바깥 반복 하나에 해당한다.</p>
<div class="warn"><span class="label">주의</span>회귀는 "근사 공간으로의 투영" $\Pi$다. $Q_{k+1} = \Pi\mathcal{T}^*Q_k$는 $\Pi$가 sup-노름 비확장이 아니면 축약이 아닐 수 있어, 데이터가 많아도 발산할 수 있다(<a href="#approx">09장</a>). 정책 평가 버전(Fitted Q Evaluation, FQE)은 오프라인 정책 평가의 표준 도구다(<a href="#offline">15장</a>).</div>

<h2>렌즈 3 · Soft Q: max를 부드럽게</h2>
<p>$\max$를 온도 $\beta$의 log-sum-exp로 바꾸면 <strong>soft 벨만 방정식</strong>이 된다.</p>
<div data-w="fx-soft"></div>
<p>이것은 임의의 근사 기법이 아니다. "보상 + $\beta\times$엔트로피"를 최대화하는 문제의 정확한 해다. 아래 유도가 대전제 T5의 가장 작은 형태다.</p>
<div data-w="dv-soft"></div>
<div data-w="soft-temp"></div>
<div class="thesis-box"><span class="label">대전제 T5 · KL(엔트로피) 정규화의 닫힌 해</span>
<p>균등 분포를 기준으로 한 KL 정규화가 엔트로피 정규화다: $\mathrm{KL}(\pi\|\mathcal{U}) = \log|\mathcal{A}| - \mathcal{H}(\pi)$. 기준 분포를 $\pi_0$로 일반화하면 해는 $\pi^*\propto\pi_0\, e^{Q/\beta}$, 가치는 $\beta\log\sum_a \pi_0(a)e^{Q(a)/\beta}$가 된다. Soft Q-learning(Haarnoja et al. 2017), SAC(<a href="#maxent">14장</a>), RLHF의 KL 페널티(<a href="#rlhf">19장</a>), DPO(<a href="#dpo">20장</a>)가 모두 이 식 하나를 서로 다른 자리에 쓴다.</p>
</div>
<p>log-sum-exp도 1-립시츠이므로 soft 벨만 연산자는 여전히 $\gamma$-축약이다(T1). 고정점만 달라진다. 또 $\max_a Q \le \beta\log\sum_a e^{Q/\beta} \le \max_a Q + \beta\log|\mathcal{A}|$이므로, soft 가치는 hard 가치보다 최대 $\beta\log|\mathcal{A}|/(1-\gamma)$만큼만 크다.</p>

<h2>렌즈 4 · 분포형 RL: 평균 대신 분포 전체</h2>
<p>$Q(s,a) = \mathbb{E}[Z(s,a)]$에서 기댓값을 벗기면 리턴의 분포 $Z(s,a)$가 남는다. 벨만 방정식은 <strong>분포의 등식</strong>이 된다.</p>
$$Z(s,a) \overset{D}{=} R(s,a) + \gamma\, Z(S', A'),\qquad S'\sim P(\cdot|s,a),\ A'\sim\pi(\cdot|S')$$
<p>정책 평가 연산자는 최대 $p$-Wasserstein 거리에서 $\gamma$-축약이다(Bellemare, Dabney & Munos 2017). 그러나 KL이나 총변동 거리에서는 축약이 아니고, 제어 연산자(max 포함)는 어떤 거리에서도 축약이 보장되지 않는다. 실제 알고리즘은 분포를 유한하게 표현해야 한다.</p>
<ul>
<li><strong>C51</strong>: $[V_{\min}, V_{\max}]$의 고정된 51개 원자(atom) 위의 범주형 분포. 백업 후 원자 격자에서 벗어난 질량을 이웃 두 원자에 선형으로 나누는 <em>투영</em> $\Phi$를 하고 KL로 학습한다.</li>
<li><strong>QR-DQN</strong>(Dabney et al. 2018): 확률은 고정하고 위치(분위수)를 학습한다. 분위수 회귀 손실이 Wasserstein을 직접 줄이므로 이론과 손실이 맞는다. IQN은 분위수를 연속으로 샘플한다.</li>
</ul>
<div data-w="dist"></div>
<p>세 행동의 Q는 모두 같지만 분포는 완전히 다르다. 기댓값 기반 Q-learning은 셋을 구별하지 못한다. 분포가 있으면 CVaR 같은 <strong>위험 척도</strong>로 행동을 고를 수 있다. 다만 C51과 Rainbow는 행동을 고를 때 여전히 평균만 쓴다. 딥러닝에서의 이득은 상당 부분 "분포 예측이라는 풍부한 보조 과제가 표현 학습을 돕는다"는 쪽으로 해석된다(아래 암묵지 참고).</p>

<h2>렌즈 5 · 선형계획과 쌍대: 점유 측도</h2>
<p>최적 가치는 벨만 부등식 $V \ge \mathcal{T}^*V$를 만족하는 가장 작은 함수다. 그래서 MDP는 <strong>선형계획(LP)</strong>으로 풀린다. 이 LP의 쌍대 변수는 놀랍게도 "어떤 정책이 $(s,a)$를 얼마나 자주 방문하는가"다.</p>
<div data-w="dv-lp"></div>
<p>쌍대 관점에서 RL은 <strong>흐름 보존 제약 아래에서 점유 측도 $d(s,a)$에 대한 선형 최적화</strong>다. 정책은 $\pi(a|s) = d(s,a)/\sum_{a'}d(s,a')$로 복원된다. 이 관점이 낳은 것들:</p>
<ul>
<li><strong>REPS</strong>(Peters, Mülling & Altun 2010): 쌍대에 $\mathrm{KL}(d\|q)$를 더하면 해가 $d\propto q\,e^{\delta/\eta}$ 꼴이 된다. 다시 T5.</li>
<li><strong>DICE 계열</strong>(DualDICE, Nachum et al. 2019; GenDICE; AlgaeDICE; OptiDICE, Lee et al. 2021): 오프라인 데이터의 분포 $d^{\mathcal{D}}$와 목표 정책의 점유 측도의 비율 $w = d^\pi/d^{\mathcal{D}}$를 직접 추정해 정책을 평가·개선한다(<a href="#offline">15장</a>).</li>
<li>모방학습의 GAIL(Ho & Ermon 2016)은 "전문가와 점유 측도를 맞추는" 문제로 쓸 수 있다.</li>
</ul>

<h2>렌즈 6 · 후계자 표현: 보상과 동역학의 분리</h2>
<p>02장에서 본 $V^\pi = (I-\gamma P^\pi)^{-1}r$을 다시 보자. 행렬 $M^\pi = (I-\gamma P^\pi)^{-1}$의 원소 $M^\pi(s,s')$는 "$s$에서 출발해 $s'$를 할인 방문하는 기대 횟수"이고, 보상과 무관하다. 이것이 <strong>후계자 표현(successor representation, SR)</strong>이다(Dayan 1993). 특징 $\phi$로 일반화하면</p>
<div data-w="fx-sf"></div>
<p>$\psi^\pi$ 자체가 벨만 방정식 $\psi^\pi(s,a) = \phi(s,a) + \gamma\,\mathbb{E}[\psi^\pi(s',a')]$을 만족하므로 TD로 학습할 수 있다. 보상(가중치 $w$)이 바뀌면 $\psi$를 재사용해 즉시 새 Q를 얻는다. 아래에서 보상 칸을 클릭해 바꿔 보라. 가치 지도는 행렬-벡터 곱 하나로 갱신된다. 정책이나 할인율을 바꿀 때만 $M$을 다시 계산한다.</p>
<div data-w="sr"></div>
<p>여러 과제의 SF $\psi^{\pi_i}$를 모아 두고 새 보상에 대해 $\max_i \psi^{\pi_i}\!\cdot w$로 행동하는 것이 <strong>일반화 정책 개선(GPI, Barreto et al. 2017)</strong>이다. 각 정책보다 나쁘지 않음이 보장된다.</p>

<h2>렌즈 7 · LLM의 logit은 soft Q다</h2>
<p>LLM 생성을 토큰 MDP로 보자(<a href="#llm-mdp">18장</a>): 상태 $s_t = (x, y_{\lt t})$, 행동은 다음 토큰 $y_t$, 전이는 결정적, $\gamma=1$, 보상은 끝에서 한 번. RLHF의 목적 $\mathbb{E}[r] - \beta\,\mathrm{KL}(\pi\|\pi_{\text{ref}})$를 토큰 단위로 쓰면 렌즈 3의 soft 벨만 방정식에서 기준 분포가 $\pi_{\text{ref}}$인 경우와 정확히 같다. 최적 정책은</p>
$$\pi^*(y_t|s_t) = \pi_{\text{ref}}(y_t|s_t)\,\exp\!\Big(\tfrac{Q^*(s_t,y_t) - V^*(s_t)}{\beta}\Big),\qquad V^*(s_t) = \beta\log\sum_{y}\pi_{\text{ref}}(y|s_t)\,e^{Q^*(s_t,y)/\beta}$$
<div data-w="fx-llmq"></div>
<p>로그 비율을 토큰에 걸쳐 더하면 전개가 망원급수로 접힌다. $Q^*(s_t,y_t) = r_t + V^*(s_{t+1})$이고 중간 보상이 0이므로</p>
$$\sum_{t} \beta\log\frac{\pi^*(y_t|s_t)}{\pi_{\text{ref}}(y_t|s_t)} = \sum_t \big[r_t + V^*(s_{t+1}) - V^*(s_t)\big] = r(x,y) - V^*(s_0)$$
<p>즉 시퀀스 보상은 정책의 로그 비율 합으로 <strong>프롬프트에만 의존하는 상수 $V^*(s_0)$를 빼고</strong> 복원된다. DPO가 보상 모델 없이 학습할 수 있는 이유이고(<a href="#dpo">20장</a>), 이렇게 학습된 언어 모델의 logit에서 $\pi_{\text{ref}}$의 logit을 뺀 값은 상태별 상수를 제외하고 $Q^*/\beta$다. 이것이 "언어 모델은 은밀한 Q 함수다(From $r$ to $Q^*$, Rafailov et al. 2024)"의 핵심이다. 토큰 단위 신용 할당, 가치 기반 디코딩·탐색(<a href="#test-time">22장</a>)이 이 연결 위에 있다.</p>

<h2>렌즈 8 · 목표 조건부 Q와 재라벨링</h2>
<p>목표 $g$를 입력에 넣은 $Q(s,a,g)$(UVFA, Schaul et al. 2015)는 목표들 사이에서 일반화한다. Q-learning이 off-policy라는 성질을 극한까지 쓰면 <strong>Hindsight Experience Replay</strong>(Andrychowicz et al. 2017)가 된다. 목표 $g$에 실패한 궤적도 "실제로 도달한 상태 $g'$가 원래 목표였다"고 라벨을 바꾸면 성공 데이터가 된다. 타깃이 행동 정책과 무관하기 때문에 이 재라벨링이 정당하다. 희소 보상 문제에서 "실패를 학습 신호로 바꾸는" 이 트릭은 LLM의 사후 재라벨링(목표나 지시문을 결과에 맞게 다시 쓰는 기법)에도 같은 논리로 쓰인다.</p>

<h2>렌즈 지도: 무엇을 바꿨고 무엇이 나왔나</h2>
<div class="table-wrap" style="position:relative"><table class="t">
<thead><tr><th>렌즈</th><th>핵심 식</th><th>바꾼 것</th><th>낳은 알고리즘</th></tr></thead>
<tbody>
<tr><td>확률적 근사</td><td>$Q \leftarrow Q + \alpha(\hat{\mathcal{T}}Q - Q)$</td><td>정확한 연산자 → 샘플</td><td>Q-learning, Speedy Q, Zap Q</td></tr>
<tr><td>회귀</td><td>$\arg\min_f \sum(f - y)^2$, $y$ 고정</td><td>표 → 함수근사</td><td>FQI, NFQ, DQN, FQE</td></tr>
<tr><td>Soft (엔트로피)</td><td>$\max \to \beta\log\sum e^{Q/\beta}$</td><td>hard max → 정규화된 최대</td><td>Soft Q, SAC, PCL, Munchausen RL</td></tr>
<tr><td>분포</td><td>$Z \overset{D}{=} R + \gamma Z'$</td><td>평균 → 분포</td><td>C51, QR-DQN, IQN, 위험 민감 RL</td></tr>
<tr><td>LP 쌍대</td><td>$\max_d \langle d, R\rangle$ s.t. 흐름 보존</td><td>가치 → 점유 측도</td><td>REPS, DICE 계열, GAIL</td></tr>
<tr><td>후계자 표현</td><td>$Q^\pi = \psi^\pi\cdot w$</td><td>보상과 동역학 분리</td><td>SR, Successor Features + GPI</td></tr>
<tr><td>LLM logit</td><td>$\beta\log\frac{\pi}{\pi_{\text{ref}}} = Q^* - V^*$</td><td>정책 = soft Q</td><td>DPO의 토큰 해석, 가치 기반 디코딩</td></tr>
<tr><td>목표 조건부</td><td>$Q(s,a,g)$</td><td>목표를 입력으로</td><td>UVFA, HER</td></tr>
</tbody></table></div>
`,
    mount: {
      'dv-sa': (el) => ui.derivation(el, {
        title: '벨만 고정점 → 로빈스-먼로 → Q-learning',
        steps: [
          { tex: String.raw`F(Q) := \mathcal{T}^*Q - Q = 0`, why: '$Q^*$는 $\\mathcal{T}^*$의 고정점, 즉 $F$의 근(root)이다. 근 찾기 문제로 바꾼다.' },
          { tex: String.raw`\theta_{k+1} = \theta_k + \alpha_k\big(F(\theta_k) + \hl{\varepsilon_k}\big),\quad \mathbb{E}[\varepsilon_k \mid \theta_k] = 0`, why: '로빈스-먼로(1951): $F$를 직접 계산할 수 없고 평균 0의 잡음이 낀 관측만 있을 때, $\\sum\\alpha_k=\\infty,\\ \\sum\\alpha_k^2 \\lt \\infty$이면 근으로 수렴한다(적절한 안정성 조건 아래).' },
          { tex: String.raw`(\hat{\mathcal{T}}Q)(s,a) = r + \gamma\max_{a'}Q(s',a'),\qquad \mathbb{E}_{s'}\big[(\hat{\mathcal{T}}Q)(s,a)\big] = (\mathcal{T}^*Q)(s,a)`, why: '샘플 $(r, s\')$ 하나로 만든 연산자는 $\\mathcal{T}^*$의 불편 추정이다. $\\max$가 $s\'$에 대한 기댓값 안쪽에 있어서 가능하다. (반대로 $\\max$가 기댓값 바깥에 있었다면 편향이 생겼을 것이다.)' },
          { tex: String.raw`Q_{k+1}(s,a) = Q_k(s,a) + \alpha_k\big[\hl{(\hat{\mathcal{T}}Q_k)(s,a) - Q_k(s,a)}\big]`, why: '$F$ 자리에 잡음 섞인 관측 $\\hat{\\mathcal{T}}Q_k - Q_k$를 넣으면 바로 Q-learning이다. 경사가 아니라 "연산자 잔차"를 따라간다는 점에서 SGD와 다르다.' },
          { tex: String.raw`\underbrace{Q_{k+1} - Q^*}_{\text{오차}} = (1-\alpha_k)(Q_k - Q^*) + \alpha_k\big(\underbrace{\mathcal{T}^*Q_k - \mathcal{T}^*Q^*}_{\le\,\gamma\|Q_k - Q^*\|}\big) + \alpha_k\,\hl{\varepsilon_k}`, why: '오차 분해. 축약 덕분에 결정적 부분은 매 스텝 $(1-\\alpha_k(1-\\gamma))$배로 줄고, 잡음 항은 $\\alpha_k$에 비례해 더해진다. 상수 $\\alpha$면 잡음이 끝까지 남아 바닥을 만든다. 또 $(1-\\gamma)$가 작으면 결정적 부분이 줄어드는 속도 자체가 느리다.' },
        ],
      }),
      'sa-demo': mountSA,
      'fx-soft': (el) => ui.formula(el, {
        title: 'Soft 벨만 방정식',
        tex: String.raw`\tm{Q}{Q_{\text{soft}}(s,a)} = \tm{r}{r(s,a)} + \gamma\,\mathbb{E}_{s'}\Big[\, \tm{V}{\tm{b}{\beta}\log\sum_{a'}\exp\!\big(Q_{\text{soft}}(s',a')/\beta\big)} \,\Big],\qquad \tm{pi}{\pi(a|s) = \frac{e^{Q_{\text{soft}}(s,a)/\beta}}{\sum_{a'}e^{Q_{\text{soft}}(s,a')/\beta}}}`,
        terms: [
          { id: 'Q', sym: 'Q_{\\text{soft}}', label: 'soft 행동 가치', desc: '보상 + 미래 엔트로피 보너스까지 포함한 가치.' },
          { id: 'r', sym: 'r(s,a)', label: '보상', desc: '원래 보상. 엔트로피 보너스는 V 안에 숨어 있다.' },
          { id: 'V', sym: 'V_{\\text{soft}}', label: 'soft 상태 가치 (log-sum-exp)', desc: 'max의 매끄러운 버전. β→0이면 max.', long: '$\\beta\\log\\sum e^{Q/\\beta} = \\max_\\pi\\{\\mathbb{E}_\\pi[Q] + \\beta\\mathcal{H}(\\pi)\\}$. 아래 유도에서 이 등식을 보인다. 미분하면 정확히 softmax 정책이 나온다: $\\nabla_Q V_{\\text{soft}} = \\pi$.' },
          { id: 'b', sym: '\\beta', label: '온도', desc: '엔트로피의 가격. 클수록 탐험적·평균적.', long: 'β는 보상과 엔트로피(또는 KL)의 교환 비율이다. SAC에서는 α로 쓰고 목표 엔트로피에 맞춰 자동 조정한다. RLHF에서는 KL 계수 β가 같은 역할을 한다.' },
          { id: 'pi', sym: '\\pi(a|s)', label: '볼츠만 정책', desc: 'soft Q의 softmax. 결정적 argmax의 확률적 일반화.' },
        ],
      }),
      'dv-soft': (el) => ui.derivation(el, {
        title: '엔트로피 정규화 최대화 → softmax와 log-sum-exp',
        steps: [
          { tex: String.raw`\max_{\pi\in\Delta}\ \sum_a \pi(a)\,Q(a) + \beta\,\mathcal{H}(\pi),\qquad \mathcal{H}(\pi) = -\sum_a\pi(a)\log\pi(a)`, why: '한 상태에서 행동 분포 $\\pi$를 고른다. 기대 가치를 높이되 엔트로피(무작위성)에 보너스 $\\beta$를 준다.' },
          { tex: String.raw`\mathcal{L} = \sum_a \pi(a)Q(a) - \beta\sum_a\pi(a)\log\pi(a) + \hl{\lambda\Big(1 - \sum_a\pi(a)\Big)}`, why: '확률의 합이 1이라는 제약을 라그랑주 승수로 붙인다. ($\\pi\\ge0$은 해가 자동으로 만족한다.)' },
          { tex: String.raw`\frac{\partial\mathcal{L}}{\partial\pi(a)} = Q(a) - \beta\big(\log\pi(a) + 1\big) - \lambda = 0 \;\Rightarrow\; \pi(a) \propto \hl{e^{Q(a)/\beta}}`, why: '각 행동에 대해 미분해 0으로 둔다. 로그를 풀면 지수 형태가 나온다.' },
          { tex: String.raw`\pi^*(a) = \frac{e^{Q(a)/\beta}}{Z},\qquad Z = \sum_{a'} e^{Q(a')/\beta}`, why: '정규화하면 softmax(볼츠만) 분포.' },
          { tex: String.raw`\sum_a\pi^*(a)\big[Q(a) - \beta\log\pi^*(a)\big] = \sum_a\pi^*(a)\big[Q(a) - Q(a) + \beta\log Z\big] = \hl{\beta\log\sum_a e^{Q(a)/\beta}}`, why: '최적값에 대입하면 $Q$가 상쇄되고 $\\beta\\log Z$만 남는다. 최댓값이 log-sum-exp다. (볼록 해석에서 log-sum-exp와 음의 엔트로피는 서로의 르장드르 쌍대다.)' },
          { tex: String.raw`\beta\to 0:\ \beta\log\sum_a e^{Q(a)/\beta}\to\max_a Q(a),\quad \pi^*\to\text{argmax};\qquad \beta\to\infty:\ \pi^*\to\text{균등}`, why: '온도 극한에서 hard Q-learning과 무작위 정책이 각각 회복된다. 아래 계산기로 직접 확인하라.' },
        ],
      }),
      'soft-temp': mountSoftTemp,
      dist: mountDist,
      'dv-lp': (el) => ui.derivation(el, {
        title: 'MDP의 선형계획과 그 쌍대',
        steps: [
          { tex: String.raw`\min_{V}\ \sum_s \rho_0(s)\,V(s)\quad\text{s.t.}\quad V(s) \ge R(s,a) + \gamma\sum_{s'}P(s'|s,a)V(s')\quad\forall(s,a)`, why: '주 문제(primal). $\\mathcal{T}^*$는 단조 연산자이므로 $V\\ge\\mathcal{T}^*V$이면 $V\\ge V^*$다. 그런 $V$ 중 가장 작은 것이 $V^*$.' },
          { tex: String.raw`\mathcal{L}(V, d) = \sum_s\rho_0(s)V(s) + \sum_{s,a}\hl{d(s,a)}\Big[R(s,a) + \gamma\sum_{s'}P(s'|s,a)V(s') - V(s)\Big],\quad d\ge0`, why: '각 부등식 제약 $(s,a)$에 승수 $d(s,a)\\ge0$를 붙인다.' },
          { tex: String.raw`= \sum_{s,a}d(s,a)R(s,a) + \sum_{s}V(s)\Big[\rho_0(s) - \sum_a d(s,a) + \gamma\sum_{\bar s,\bar a}P(s|\bar s,\bar a)\,d(\bar s,\bar a)\Big]`, why: '$V(s)$의 계수끼리 모은다. $V$는 부호 제약이 없으므로 $\\min_V$가 유한하려면 대괄호가 0이어야 한다.' },
          { tex: String.raw`\max_{d\ge0}\ \sum_{s,a}d(s,a)R(s,a)\quad\text{s.t.}\quad \hl{\sum_a d(s,a) = \rho_0(s) + \gamma\sum_{\bar s,\bar a}P(s|\bar s,\bar a)\,d(\bar s,\bar a)}`, why: '쌍대 문제. 제약은 "상태 $s$로 흘러드는 할인된 질량 = 시작 질량 + 직전 상태에서 넘어온 질량", 즉 벨만 흐름 보존이다.' },
          { tex: String.raw`d^\pi(s,a) = \sum_{t\ge0}\gamma^t\Pr(s_t=s, a_t=a\mid\pi,\rho_0),\qquad \pi(a|s) = \frac{d(s,a)}{\sum_{a'}d(s,a')}`, why: '흐름 보존을 만족하는 $d$는 정확히 어떤 정책의 (정규화 안 된) 할인 점유 측도이고, 그 역도 성립한다. 목적 $\\sum dR$은 그 정책의 기대 리턴 $J(\\pi)$. 상보적 여유 조건에 의해 $d>0$인 곳은 벨만 부등식이 등호인 곳, 즉 탐욕 행동뿐이다.' },
        ],
      }),
      'fx-sf': (el) => ui.formula(el, {
        title: '후계자 특징 분해',
        tex: String.raw`\tm{Q}{Q^\pi(s,a)} = \tm{psi}{\psi^\pi(s,a)}^{\!\top}\,\tm{w}{w},\qquad \psi^\pi(s,a) = \mathbb{E}_\pi\Big[\sum_{t\ge0}\gamma^t\,\tm{phi}{\phi(s_t,a_t)}\;\Big|\;s_0=s,a_0=a\Big],\qquad \tm{r}{r(s,a) = \phi(s,a)^\top w}`,
        terms: [
          { id: 'Q', sym: 'Q^\\pi', label: '행동 가치', desc: '두 요인의 내적으로 분해된다.' },
          { id: 'psi', sym: '\\psi^\\pi', label: '후계자 특징 (SF)', desc: '미래에 만날 특징의 할인 합. 정책과 동역학만의 함수.', long: '특징이 원-핫 상태 표시자이면 $\\psi$는 SR 행렬 $M^\\pi = (I-\\gamma P^\\pi)^{-1}$의 행이다. 보상에 대해 알 필요가 없으므로 보상이 바뀌어도 재사용된다.' },
          { id: 'w', sym: 'w', label: '보상 가중치', desc: '과제(무엇을 원하는지)를 나타내는 벡터.' },
          { id: 'phi', sym: '\\phi', label: '특징', desc: '상태·행동의 특징 벡터.' },
          { id: 'r', sym: 'r = \\phi^\\top w', label: '선형 보상 가정', desc: '보상이 특징의 선형 결합이라는 가정이 분해를 가능케 한다.' },
        ],
      }),
      sr: mountSR,
      'fx-llmq': (el) => ui.formula(el, {
        title: '토큰 단위 로그 비율 = soft advantage',
        tex: String.raw`\tm{b}{\beta}\,\tm{lr}{\log\frac{\pi^*(y_t\mid s_t)}{\pi_{\text{ref}}(y_t\mid s_t)}} \;=\; \tm{Q}{Q^*(s_t, y_t)} - \tm{V}{V^*(s_t)}`,
        terms: [
          { id: 'b', sym: '\\beta', label: 'KL 계수', desc: '보상과 기준 모델 이탈 사이의 교환 비율.' },
          { id: 'lr', sym: '\\log\\frac{\\pi^*}{\\pi_{\\text{ref}}}', label: '로그 확률 비율', desc: '정렬된 모델이 기준 모델보다 이 토큰을 얼마나 더 선호하는가.', long: 'logit으로 쓰면 $\\ell^*(s,y) - \\ell_{\\text{ref}}(s,y) = Q^*(s,y)/\\beta + c(s)$. softmax는 상태별 상수 이동에 불변이므로 $c(s)$는 관측 불가능하고, 그래서 Q는 상태별 상수를 제외하고만 식별된다.' },
          { id: 'Q', sym: 'Q^*(s_t,y_t)', label: '토큰 soft Q', desc: '이 토큰을 쓰고 이후 최적으로 생성할 때의 KL-정규화 가치.' },
          { id: 'V', sym: 'V^*(s_t)', label: '토큰 soft V', desc: '현재 접두사(prefix)의 가치. 토큰 선택과 무관한 기준점.' },
        ],
      }),
    },
    tacit: [
      { tag: 'math', t: 'Q-learning은 어떤 손실의 경사 하강도 아니다',
        d: '<p>Q-learning과 TD는 "연산자 잔차 $\\hat{\\mathcal{T}}Q - Q$를 따라가는" 고정점 반복이지, 어떤 목적함수의 경사가 아니다. 표 형식에서는 축약 덕분에 문제없지만, 함수근사에서는 이 사실이 "TD 손실이 줄었는데 정책은 나빠졌다", "손실 곡선을 믿을 수 없다" 같은 현상으로 나타난다. 타깃 네트워크는 이 반복을 "정말로 손실을 최소화하는 회귀 문제들의 열(FQI)"로 바꿔 각 단계에서만은 진짜 최적화를 하게 만든다.</p>' },
      { tag: 'math', t: 'log-sum-exp와 엔트로피는 르장드르 쌍대다',
        d: '<p>$\\beta\\log\\sum_a e^{Q_a/\\beta} = \\max_{\\pi\\in\\Delta}\\{\\langle\\pi,Q\\rangle + \\beta\\mathcal{H}(\\pi)\\}$이고, 이 함수의 경사가 softmax다. 그래서 "soft" 알고리즘은 예외 없이 "hard 알고리즘 + 엔트로피(또는 KL) 항"이며, 온도를 0으로 보내면 hard 버전이 회복된다. 이 쌍대성을 알면 SAC의 정책 손실, RLHF의 KL 페널티, DPO의 닫힌 해, Best-of-N의 극한(22장)이 모두 같은 함수의 다른 단면으로 보인다.</p>' },
      { tag: 'research', t: '분포형 RL의 이득은 위험이 아니라 표현에서 온다는 해석',
        d: '<p>표 형식이나 선형 근사에서는 분포형 업데이트의 평균이 기댓값 업데이트와 정확히 같아 이득이 없다는 분석이 있다(Lyle, Castro & Bellemare 2019). 그런데 딥 RL에서는 C51이 DQN보다 확연히 좋다. 따라서 이득의 상당 부분은 "리턴 분포 전체를 예측하라"는 더 풍부한 학습 신호가 신경망 표현을 더 좋게 만드는 데서 온다고 보는 것이 일반적이다. 보조 과제(auxiliary task)를 붙이는 연구 흐름과 같은 계보로 읽힌다.</p>' },
      { tag: 'math', t: '"정책 최적화 = 점유 측도 위의 선형 문제"는 볼록성의 원천이다',
        d: '<p>$J(\\pi)$는 정책 파라미터에 대해 비볼록이지만, 점유 측도 $d$에 대해서는 선형이고 제약 집합도 다면체(polytope)다. 그래서 정책 공간의 어려움은 "좌표계를 잘못 잡은 탓"으로 볼 수 있다. 정책 경사가 국소 최적에 잘 안 빠지는 경험적 사실, 소프트맥스 정책 경사의 전역 수렴 결과(Agarwal et al. 2021), 오프라인 RL의 DICE 계열이 모두 이 관점에서 출발한다. 다만 $d$ 공간은 상태 수만큼 크므로 함수근사가 다시 비볼록성을 들여온다.</p>' },
      { tag: 'research', t: 'softmax의 이동 불변성이 식별 가능성을 결정한다',
        d: '<p>softmax는 모든 logit에 같은 상수를 더해도 불변이다. 그래서 정책에서 Q를 읽어내면 항상 상태별 상수 $V(s)$만큼 모호하고, DPO의 암묵적 보상은 프롬프트별 상수만큼 모호하다. Bradley–Terry 선호 모형도 보상에 프롬프트별 상수를 더해도 확률이 변하지 않는다. 이 세 가지는 같은 사실이다. "보상 모델의 절댓값을 비교하지 말고 같은 프롬프트 안의 차이만 보라"는 실무 규칙이 여기서 나온다.</p>' },
      { tag: 'research', t: 'SR은 모델 프리와 모델 기반의 중간이다',
        d: '<p>SR은 "어디로 가게 될지"는 캐시하고 "그게 얼마나 좋은지"는 따로 둔다. 그래서 보상이 바뀌면 즉시 재계획하지만(모델 기반처럼), 동역학이나 정책이 바뀌면 느리게 다시 배워야 한다(모델 프리처럼). 사람과 동물의 행동 실험에서 정확히 이 비대칭 패턴이 관찰된다는 연구가 있고(Momennejad et al. 2017), 해마의 장소 세포가 SR처럼 보인다는 가설도 있다(Stachenfeld et al. 2017).</p>' },
    ],
    quiz: [
      { q: '$\\beta\\to0$일 때 $\\beta\\log\\sum_a e^{Q(a)/\\beta}$는 어디로 가는가?', options: ['$\\frac1{|\\mathcal{A}|}\\sum_a Q(a)$', '$\\max_a Q(a)$', '0', '$\\log|\\mathcal{A}|$'], answer: 1,
        explain: '가장 큰 항이 합을 지배하므로 $\\max_a Q(a)$로 간다. 이때 softmax 정책은 argmax가 된다.' },
      { q: '$\\pi = \\mathrm{softmax}(Q/\\beta)$일 때 항상 성립하는 등식은?', options: ['$\\mathbb{E}_\\pi[Q] = \\max_a Q$', '$\\mathbb{E}_\\pi[Q] + \\beta\\mathcal{H}(\\pi) = \\beta\\log\\sum_a e^{Q(a)/\\beta}$', '$\\mathcal{H}(\\pi) = \\log|\\mathcal{A}|$', '$\\beta\\log\\sum e^{Q/\\beta} = \\mathbb{E}_\\pi[Q]$'], answer: 1,
        explain: '$\\log\\pi(a) = Q(a)/\\beta - \\log Z$를 대입하면 $\\mathbb{E}_\\pi[Q] - \\beta\\mathbb{E}_\\pi[\\log\\pi] = \\beta\\log Z$. 계산기에서 마지막 두 수치가 같은 이유다.' },
      { q: 'MDP 선형계획의 쌍대 변수 $d(s,a)$의 의미는?', options: ['상태의 가치', '행동의 advantage', '정책의 할인 점유 측도(방문 빈도)', '전이 확률'], answer: 2,
        explain: '흐름 보존 제약을 만족하는 $d$는 정확히 어떤 정책의 할인 방문 빈도이고, 목적 $\\sum dR$은 그 정책의 리턴이다.' },
      { q: '후계자 표현에서 보상만 바뀌었을 때 다시 계산해야 하는 것은?', options: ['$M^\\pi=(I-\\gamma P^\\pi)^{-1}$ 전체', '보상 벡터와의 곱 $V = M^\\pi r$ 뿐', '전이 확률', '정책'], answer: 1,
        explain: 'SR은 보상과 무관하므로 재사용된다. 정책이나 동역학, 할인율이 바뀔 때만 $M$을 다시 구한다.' },
    ],
  });

  /* ---------- 렌즈 1: 확률적 근사 실험 ---------- */
  function mountSA(el) {
    const p = ui.panel(el, { kind: 'SIM', title: '가치 반복 vs 동기식 Q-learning: 스텝 크기 스케줄', caption: '4×3 격자, 미끄러짐 0.2, 이동 비용 −0.04. 반복 $k$마다 모든 $(s,a)$에서 다음 상태를 한 번씩 샘플한다. 곡선은 시드 6개의 평균 $\\log_{10}\\|Q_k - Q^*\\|_\\infty$.' });
    const ctr = ui.row(p.body);
    let timer = 0;
    const later = () => { clearTimeout(timer); timer = setTimeout(run, 120); };
    const gS = ui.slider(ctr, { label: '할인율 $\\gamma$', min: 0.5, max: 0.98, step: 0.01, value: 0.9, format: ui.fmt.f(2), onInput: later });
    const cS = ui.slider(ctr, { label: '상수 스텝 $\\alpha$', min: 0.02, max: 0.5, step: 0.01, value: 0.1, format: ui.fmt.f(2), onInput: later });
    const wS = ui.slider(ctr, { label: '다항 스텝 지수 $\\omega$ ($\\alpha_k=1/k^\\omega$)', min: 0.5, max: 1, step: 0.05, value: 0.6, format: ui.fmt.f(2), onInput: later });
    const st = ui.stats(p.body, [
      { key: 'vi', label: '가치 반복 (k=1000)', tone: 'accent' },
      { key: 'c', label: '상수 α (k=1000)' },
      { key: 'lin', label: '1/k (k=1000)', tone: 'signal' },
      { key: 'poly', label: '1/k^ω (k=1000)' },
    ]);
    const chartEl = document.createElement('div');
    p.body.appendChild(chartEl);
    const chart = plot.line(chartEl, { height: 260, x: { label: '반복 k', min: 0, max: 1000 }, y: { label: 'log₁₀ ‖Q_k − Q*‖∞' }, series: [] });
    const env = new sim.GridWorld(sim.layouts.classic, { rewards: { G: 1, X: -1 }, step: -0.04, slip: 0.2 });
    const K = 1000, SEEDS = 6;

    function qStar(gm) {
      const V = env.solve(gm, 1e-12);
      return sim.range(env.nS).map((s) => (env.cells[s].terminal ? [0, 0, 0, 0] : env.qFromV(V, gm, s)));
    }
    function err(Q, Qs) { let m = 0; for (let s = 0; s < env.nS; s++) for (let a = 0; a < 4; a++) m = Math.max(m, Math.abs(Q[s][a] - Qs[s][a])); return m; }
    let token = 0;
    function run() {
      const my = ++token;
      const gm = gS.get(), ca = cS.get(), om = wS.get();
      const Qs = qStar(gm);
      const scheds = { c: () => ca, lin: (k) => 1 / k, poly: (k) => 1 / Math.pow(k, om) };
      const acc = { vi: new Array(K + 1).fill(0), c: new Array(K + 1).fill(0), lin: new Array(K + 1).fill(0), poly: new Array(K + 1).fill(0) };
      // 가치 반복 (결정적)
      let Q = sim.range(env.nS).map(() => [0, 0, 0, 0]);
      for (let k = 0; k <= K; k++) {
        acc.vi[k] = err(Q, Qs);
        const V = Q.map((q) => Math.max(...q));
        Q = sim.range(env.nS).map((s) => (env.cells[s].terminal ? [0, 0, 0, 0] : env.qFromV(V, gm, s)));
      }
      const jobs = [];
      ['c', 'lin', 'poly'].forEach((key) => { for (let seed = 0; seed < SEEDS; seed++) jobs.push([key, seed]); });
      let j = 0;
      function chunk() {
        if (my !== token) return;
        const [key, seed] = jobs[j++];
        const r = sim.rng(1000 + seed);
        const Qk = sim.range(env.nS).map(() => [0, 0, 0, 0]);
        for (let k = 0; k <= K; k++) {
          acc[key][k] += err(Qk, Qs) / SEEDS;
          const al = scheds[key](k + 1);
          const V = Qk.map((q) => Math.max(...q));
          for (let s = 0; s < env.nS; s++) {
            if (env.cells[s].terminal) continue;
            for (let a = 0; a < 4; a++) {
              const o = env.step(s, a, r);
              const y = o.r + (o.done ? 0 : gm * V[o.s2]);
              Qk[s][a] += al * (y - Qk[s][a]);
            }
          }
        }
        if (j < jobs.length) { setTimeout(chunk, 0); return; }
        const lg = (arr) => arr.map((v, k) => [k, Math.log10(Math.max(1e-12, v))]);
        chart.update({ series: [
          { name: '가치 반복 (정확한 $\\mathcal{T}^*$)', color: 'c1', data: lg(acc.vi) },
          { name: '상수 $\\alpha$', color: 'c3', data: lg(acc.c) },
          { name: '$\\alpha_k = 1/k$', color: 'c2', data: lg(acc.lin) },
          { name: '$\\alpha_k = 1/k^{\\omega}$', color: 'c5', data: lg(acc.poly) },
        ], y: { label: 'log₁₀ ‖Q_k − Q*‖∞', min: -3, max: 0.3 } });
        const f = (v) => v.toExponential(2);
        st.set('vi', f(acc.vi[K])); st.set('c', f(acc.c[K])); st.set('lin', f(acc.lin[K])); st.set('poly', f(acc.poly[K]));
      }
      chunk();
    }
    run();
  }

  /* ---------- 렌즈 3: 온도 계산기 ---------- */
  function mountSoftTemp(el) {
    const p = ui.panel(el, { kind: 'CALC', title: '온도 $\\beta$에 따른 max · log-sum-exp · 정책 평균', caption: '네 행동의 Q 값과 온도를 바꿔 보라. 막대는 볼츠만 정책 $\\pi=\\mathrm{softmax}(Q/\\beta)$, 곡선 그래프는 $\\beta$를 0.01에서 약 3까지 훑었을 때의 집계값이다.' });
    const qc = ui.row(p.body);
    const init = [1.0, 0.8, 0.2, -0.5];
    const qs = init.map((v, i) => ui.slider(qc, { label: '$Q(a_' + (i + 1) + ')$', min: -2, max: 2, step: 0.05, value: v, format: ui.fmt.f(2), onInput: draw }));
    const tc = ui.row(p.body);
    const bS = ui.slider(tc, { label: '온도 $\\beta$ (로그 스케일)', min: -2, max: 0.5, step: 0.01, value: -0.3, format: (u) => Math.pow(10, u).toFixed(3), onInput: draw });
    const st = ui.stats(p.body, [
      { key: 'max', label: '$\\max_a Q$' },
      { key: 'lse', label: '$\\beta\\log\\sum e^{Q/\\beta}$', tone: 'accent' },
      { key: 'ep', label: '$\\mathbb{E}_\\pi[Q]$', tone: 'signal' },
      { key: 'h', label: '$\\mathcal{H}(\\pi)$ (nat)' },
      { key: 'id', label: '$\\mathbb{E}_\\pi[Q]+\\beta\\mathcal{H}(\\pi)$' },
      { key: 'ub', label: '상한 $\\max Q+\\beta\\log 4$' },
    ]);
    const split = document.createElement('div');
    split.className = 'w-split';
    const left = document.createElement('div');
    const right = document.createElement('div');
    split.append(left, right);
    p.body.appendChild(split);
    const barC = plot.bars(left, { categories: ['a₁', 'a₂', 'a₃', 'a₄'], series: [], height: 230, y: { min: 0, max: 1, label: 'π(a)' }, labels: true, labelFmt: (v) => v.toFixed(2), legend: false });
    const lineC = plot.line(right, { height: 230, x: { label: '온도 β (로그)', min: 0.01, max: Math.pow(10, 0.5), log: true }, y: { label: '집계값' }, series: [] });
    function agg(Q, b) {
      const pi = sim.softmax(Q, b);
      return { pi, lse: sim.logsumexp(Q, b), ep: sim.sum(pi.map((x, i) => x * Q[i])), h: sim.entropy(pi) };
    }
    function draw() {
      const Q = qs.map((s) => s.get());
      const b = Math.pow(10, bS.get());
      const a = agg(Q, b);
      barC.update({ series: [{ name: 'π', color: 'c1', values: a.pi }] });
      st.set('max', Math.max(...Q).toFixed(3));
      st.set('lse', a.lse.toFixed(3));
      st.set('ep', a.ep.toFixed(3));
      st.set('h', a.h.toFixed(3));
      st.set('id', (a.ep + b * a.h).toFixed(3));
      st.set('ub', (Math.max(...Q) + b * Math.log(4)).toFixed(3));
      const xs = sim.range(121).map((i) => Math.pow(10, -2 + (2.5 * i) / 120));
      const mean = sim.mean(Q);
      lineC.update({ series: [
        { name: 'max', color: 'c2', data: xs.map((x) => [x, Math.max(...Q)]), dash: '6 4' },
        { name: 'β·log-sum-exp', color: 'c1', data: xs.map((x) => [x, agg(Q, x).lse]) },
        { name: '$\\mathbb{E}_\\pi[Q]$', color: 'c3', data: xs.map((x) => [x, agg(Q, x).ep]) },
        { name: '균등 평균', color: 'c5', data: xs.map((x) => [x, mean]), dash: '2 4' },
      ], vlines: [{ x: b, label: 'β' }] });
    }
    draw();
  }

  /* ---------- 렌즈 4: 리턴 분포 ---------- */
  function mountDist(el) {
    const p = ui.panel(el, { kind: 'SIM', title: '같은 Q, 다른 분포: 범주형 분포 벨만 백업 vs 몬테카를로', caption: '같은 행동을 $T$ 스텝 반복하는 사슬. 세 행동의 한 스텝 기대 보상은 모두 1이다. 파란 막대는 C51식 투영 $\\Phi$를 매 백업마다 적용한 분포형 동적계획의 결과, 주황 막대는 실제로 샘플한 리턴의 히스토그램(같은 원자 격자에 투영)이다.' });
    const ctr = ui.row(p.body);
    const acts = {
      safe: { label: '안정: 항상 +1', out: [[1, 1]] },
      risky: { label: '모험: 50% −2 / 50% +4', out: [[-2, 0.5], [4, 0.5]] },
      lottery: { label: '복권: 5% +20 / 95% 0', out: [[20, 0.05], [0, 0.95]] },
    };
    let act = 'risky';
    ui.select(ctr, { label: '행동', value: act, options: Object.keys(acts).map((k) => ({ value: k, label: acts[k].label })), onChange: (v) => { act = v; draw(); } });
    const tS = ui.slider(ctr, { label: '스텝 수 $T$', min: 1, max: 10, step: 1, value: 4, format: ui.fmt.int, onInput: draw });
    const gS = ui.slider(ctr, { label: '할인율 $\\gamma$', min: 0.5, max: 1, step: 0.01, value: 0.9, format: ui.fmt.f(2), onInput: draw });
    const nS = ui.select(ctr, { label: '샘플 수', value: 2000, options: [{ value: 200, label: '200' }, { value: 2000, label: '2000' }, { value: 20000, label: '20000' }], onChange: draw });
    const st = ui.stats(p.body, [
      { key: 'q', label: '$Q = \\mathbb{E}[Z]$ (정확)', tone: 'accent' },
      { key: 'dp', label: '분포 DP의 평균' },
      { key: 'mc', label: '샘플 평균', tone: 'signal' },
      { key: 'sd', label: '표준편차' },
      { key: 'cvar', label: 'CVaR 10% (하위 10% 평균)' },
    ]);
    const chartEl = document.createElement('div');
    p.body.appendChild(chartEl);
    const chart = plot.bars(chartEl, { categories: [], series: [], height: 240, y: { min: 0, label: '확률' } });
    const K = 31;
    function project(atoms, vmin, dz, v, pmass, out) {
      const b = Math.min(K - 1, Math.max(0, (v - vmin) / dz));
      const l = Math.floor(b), u = Math.ceil(b);
      if (l === u) out[l] += pmass;
      else { out[l] += pmass * (u - b); out[u] += pmass * (b - l); }
    }
    function draw() {
      const A = acts[act], T = tS.get(), gm = gS.get(), N = +nS.get();
      let S = 0;
      for (let t = 0; t < T; t++) S += Math.pow(gm, t);
      const rmin = Math.min(...A.out.map((o) => o[0])), rmax = Math.max(...A.out.map((o) => o[0]));
      let vmin = Math.min(0, rmin * S), vmax = Math.max(0, rmax * S);
      if (vmax - vmin < 1e-9) { vmin -= 1; vmax += 1; }
      const dz = (vmax - vmin) / (K - 1);
      const atoms = sim.range(K).map((i) => vmin + i * dz);
      // 분포 DP: Z_T = δ0, Z_t = Φ(r + γ Z_{t+1})
      let Z = new Array(K).fill(0);
      project(atoms, vmin, dz, 0, 1, Z);
      for (let t = 0; t < T; t++) {
        const nz = new Array(K).fill(0);
        A.out.forEach(([rv, pr]) => { for (let i = 0; i < K; i++) if (Z[i] > 0) project(atoms, vmin, dz, rv + gm * atoms[i], pr * Z[i], nz); });
        Z = nz;
      }
      // 몬테카를로
      const r = sim.rng(5 + T * 31);
      const H = new Array(K).fill(0);
      const samples = [];
      for (let n = 0; n < N; n++) {
        let G = 0, disc = 1;
        for (let t = 0; t < T; t++) {
          const i = r.choice(A.out.map((o) => o[1]));
          G += disc * A.out[i][0];
          disc *= gm;
        }
        samples.push(G);
        project(atoms, vmin, dz, G, 1 / N, H);
      }
      const meanDP = sim.sum(Z.map((pz, i) => pz * atoms[i]));
      const varDP = sim.sum(Z.map((pz, i) => pz * (atoms[i] - meanDP) * (atoms[i] - meanDP)));
      samples.sort((a, b) => a - b);
      const cut = Math.max(1, Math.floor(N * 0.1));
      st.set('q', S.toFixed(3));
      st.set('dp', meanDP.toFixed(3));
      st.set('mc', sim.mean(samples).toFixed(3));
      st.set('sd', Math.sqrt(varDP).toFixed(3));
      st.set('cvar', sim.mean(samples.slice(0, cut)).toFixed(3));
      chart.update({
        categories: atoms.map((z, i) => (i % 5 === 0 ? z.toFixed(1) : '')),
        series: [
          { name: '분포 DP (C51식 투영)', color: 'c1', values: Z },
          { name: '샘플 히스토그램', color: 'c2', values: H, opacity: 0.75 },
        ],
        y: { min: 0, label: '확률' },
        xLabel: '리턴 z (원자 위치)',
      });
    }
    draw();
  }

  /* ---------- 렌즈 6: 후계자 표현 ---------- */
  function mountSR(el) {
    const p = ui.panel(el, { kind: 'SIM', title: '후계자 표현: 보상을 바꿔도 $M^\\pi$는 그대로', caption: '6×6 방, 경계와 벽에서는 제자리. <strong>왼쪽</strong> 칸을 클릭하면 보상이 0 → +1 → −1 → 0으로 바뀌고, <strong>가운데</strong> 가치 지도 $V = M^\\pi r$이 즉시 갱신된다. 가운데 지도의 칸을 클릭하면 그 상태에서의 SR 행 $M^\\pi(s,\\cdot)$가 오른쪽에 표시된다.' });
    const ctr = ui.row(p.body);
    const gS = ui.slider(ctr, { label: '할인율 $\\gamma$', min: 0.5, max: 0.97, step: 0.01, value: 0.9, format: ui.fmt.f(2), onInput: () => { recompute(); draw('M 재계산 (γ 변경)'); } });
    let polKey = 'uniform';
    ui.select(ctr, { label: '정책 $\\pi$', value: polKey, options: [{ value: 'uniform', label: '균등 무작위' }, { value: 'right', label: '오른쪽 선호 (→ 55%)' }, { value: 'down', label: '아래쪽 선호 (↓ 55%)' }], onChange: (v) => { polKey = v; recompute(); draw('M 재계산 (정책 변경)'); } });
    const st = ui.stats(p.body, [
      { key: 'op', label: '마지막 연산', tone: 'accent' },
      { key: 'sum', label: '선택 상태의 $\\sum_{s\'}M(s,s\')$' },
      { key: 'th', label: '이론값 $1/(1-\\gamma)$', tone: 'signal' },
    ]);
    const g3 = document.createElement('div');
    g3.className = 'grid2';
    const cells = ['보상 $r$ (클릭해서 편집)', '가치 $V = M^\\pi r$ (클릭해서 선택)', 'SR 행 $M^\\pi(s,\\cdot)$'].map((t) => {
      const d = document.createElement('div');
      d.innerHTML = '<p class="w-caption" style="margin:0 0 4px">' + t + '</p>';
      g3.appendChild(d);
      return d;
    });
    p.body.appendChild(g3);
    const layout = ['......', '.##...', '......', '...#..', '...#..', '......'];
    const env = new sim.GridWorld(layout, { rewards: {}, step: 0 });
    env.start = -1; // 시작 칸 표시 없음
    const n = env.nS;
    const rvec = new Array(n).fill(0);
    rvec[env.index['0,5']] = 1;
    rvec[env.index['5,0']] = -1;
    let sel = env.index['2,2'];
    let M = null;
    const policies = {
      uniform: [0.25, 0.25, 0.25, 0.25],
      right: [0.15, 0.55, 0.15, 0.15],
      down: [0.15, 0.15, 0.55, 0.15],
    };
    function invert(A) {
      const m = A.length;
      const aug = A.map((row, i) => row.concat(sim.range(m).map((j) => (i === j ? 1 : 0))));
      for (let c = 0; c < m; c++) {
        let piv = c;
        for (let r = c + 1; r < m; r++) if (Math.abs(aug[r][c]) > Math.abs(aug[piv][c])) piv = r;
        [aug[c], aug[piv]] = [aug[piv], aug[c]];
        const d = aug[c][c];
        for (let j = 0; j < 2 * m; j++) aug[c][j] /= d;
        for (let r = 0; r < m; r++) {
          if (r === c) continue;
          const f = aug[r][c];
          if (f !== 0) for (let j = 0; j < 2 * m; j++) aug[r][j] -= f * aug[c][j];
        }
      }
      return aug.map((row) => row.slice(m));
    }
    function recompute() {
      const gm = gS.get();
      const pol = policies[polKey];
      const A = sim.range(n).map((i) => sim.range(n).map((j) => (i === j ? 1 : 0)));
      for (let s = 0; s < n; s++) for (let a = 0; a < 4; a++) {
        const s2 = env.P[s][a][0].s2;
        A[s][s2] -= gm * pol[a];
      }
      M = invert(A);
    }
    const gridR = sim.renderGrid(cells[0], env, { V: rvec, vmax: 1, showArrows: false, maxCell: 46, onCell: (s) => { rvec[s] = rvec[s] === 0 ? 1 : rvec[s] === 1 ? -1 : 0; draw('V = M r 곱셈만 (M 재사용)'); } });
    const gridV = sim.renderGrid(cells[1], env, { V: rvec, showArrows: false, maxCell: 46, onCell: (s) => { sel = s; draw('SR 행 선택'); } });
    const gridM = sim.renderGrid(cells[2], env, { V: rvec, showArrows: false, maxCell: 46 });
    function draw(op) {
      const V = M.map((row) => sim.sum(row.map((m, j) => m * rvec[j])));
      const row = M[sel];
      gridR.update({ V: rvec.slice() });
      gridV.update({ V, agent: sel });
      gridM.update({ V: row, agent: sel, vmax: Math.max(...row) });
      st.set('op', op);
      st.set('sum', sim.sum(row).toFixed(3));
      st.set('th', (1 / (1 - gS.get())).toFixed(3));
    }
    recompute();
    draw('초기 계산');
  }
})();
