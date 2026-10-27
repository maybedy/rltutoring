/* T 9개의 대전제 */
(function () {
  const { ui, sim, plot } = RL;

  const DETAIL = {
    T1: {
      why: String.raw`<p>$\max$와 기댓값은 모두 1-립시츠이고 $\gamma<1$이 한 번 곱해지므로 $\|\mathcal{T}V-\mathcal{T}U\|_\infty\le\gamma\|V-U\|_\infty$. 바나흐 고정점 정리에 의해 고정점은 유일하고, 반복 오차는 $\gamma^k$로 줄어든다. 전체 유도는 <a href="#bellman">02장</a>.</p>`,
      vary: ['$\\max$ 자리를 바꾼다: 기댓값($\\mathcal{T}^\\pi$, 평가), log-sum-exp(soft, SAC), 분포 전체(분포형, Wasserstein 축약).', '연산자를 정확히 적용하지 않고 샘플로 근사한다: TD, Q-learning(확률적 근사).', '함수 공간에 투영한다: FQI, DQN. 이때 축약성이 깨질 수 있다(T8).', '토큰 MDP에 적용한다: $\\gamma=1$, 결정적 전이, 끝 보상 → LLM의 토큰 가치와 "로짓 = soft Q" 해석.'],
      breaks: '함수근사의 투영이 sup-노름 비확장이 아닐 때, off-policy 분포로 가중할 때, $\\gamma=1$이고 종료가 보장되지 않을 때.',
    },
    T2: {
      why: String.raw`<p><strong>정책 개선 정리.</strong> $\pi'(s)=\arg\max_a Q^\pi(s,a)$이면 모든 $s$에서 $Q^\pi(s,\pi'(s))\ge V^\pi(s)$. 이 부등식을 한 스텝씩 펼치면</p>
$$V^\pi(s)\le Q^\pi(s,\pi'(s)) = \mathbb{E}\big[r_{t+1}+\gamma V^\pi(s_{t+1})\big] \le \mathbb{E}\big[r_{t+1}+\gamma Q^\pi(s_{t+1},\pi'(s_{t+1}))\big]\le\cdots\le V^{\pi'}(s).$$
<p>평가를 끝까지 하지 않아도(한 스윕, 한 샘플, 한 경사 스텝) 개선 방향은 유지되는 경우가 많아서, 평가와 개선을 얼마나 촘촘히 섞느냐가 알고리즘을 가른다.</p>`,
      vary: ['평가를 1 스윕으로 줄이면 가치 반복, k 스윕이면 수정 정책 반복.', '평가를 샘플 TD로, 개선을 ε-greedy로 하면 SARSA·Q-learning.', '개선을 탐욕 대신 경사 한 스텝으로 하면 actor-critic.', '개선을 탐색(MCTS, Best-of-N, 검증 필터)으로 하면 AlphaZero, ExIt, STaR (T9).', 'RLHF의 반복 수집(iterative RLHF / online DPO)도 평가(보상모델 갱신)와 개선(정책 갱신)의 GPI다.'],
      breaks: '평가가 체계적으로 틀리면(과대추정, 보상모델 오류) 개선이 오류를 착취한다. Goodhart의 법칙이 GPI 언어로 표현된 것.',
    },
    T3: {
      why: '',
      vary: ['리턴을 그대로 곱하면 REINFORCE, reward-to-go만 곱하면 인과성 반영.', 'baseline을 빼면 분산 감소: 상수, $V(s)$, leave-one-out 평균(RLOO), 그룹 평균(GRPO).', '리턴 대신 critic의 advantage를 곱하면 actor-critic, A3C.', '중요도 비율로 옛 샘플을 재사용하면 PPO·TRPO의 대리 목적.', '보상이 1/0이고 데이터가 고정이면 최대우도(지도학습)와 같아진다.'],
      breaks: '분산이 지평과 행동 공간 크기에 따라 폭발한다. 보상이 희소하면 거의 모든 샘플의 기여가 0이다(GRPO의 전부 정답/전부 오답 그룹).',
    },
    T4: {
      why: '',
      vary: ['$d^{\\pi\'}$를 $d^{\\pi}$로 바꾼 대리 목적 + KL 제약: TRPO.', '같은 대리 목적에 ratio clipping: PPO.', '자연 경사(피셔 전처리)로 1차 근사: NPG.', 'KL을 고정 기준 정책에 대해 걸면: RLHF의 KL 페널티, GRPO의 KL 항.', '혼합 정책 $(1-\\alpha)\\pi+\\alpha\\pi\'$로 단조 개선 하한: CPI.'],
      breaks: '상태 분포가 크게 바뀌는 업데이트(큰 학습률, 여러 epoch 재사용)에서는 대리 목적이 실제 개선을 과대평가한다.',
    },
    T5: {
      why: '',
      vary: ['보상 $r$ 대신 $Q$를 넣고 기준을 균등분포로: Soft Q, SAC.', '기준을 직전 정책으로: MPO, 미러 디센트 해석의 TRPO/PPO.', '기준을 행동 정책으로, 지수가중 회귀로 투영: AWR, AWAC, IQL의 정책 추출.', '기준을 $\\pi_{\\text{ref}}$로 두고 정책 경사로: RLHF-PPO.', '해를 뒤집어 보상을 정책으로 표현: DPO와 그 변형들.', '해를 샘플링으로 근사: Best-of-N, 거절 샘플링, controlled decoding.'],
      breaks: '$Z$를 계산할 수 없는 큰 행동 공간에서는 근사가 필요하고, 근사 방식(역 KL로 투영 vs 순 KL로 투영)이 결과 분포의 성격(모드 추구 vs 모드 포괄)을 바꾼다.',
    },
    T6: {
      why: String.raw`<p>n-step 리턴의 기댓값 오차는 부트스트랩 추정의 오차를 $\gamma^n$배로 줄인다(편향 감소).</p>
$$\max_s\Big|\mathbb{E}_\pi\big[G^{(n)}_t\mid s_t=s\big]-V^\pi(s)\Big|\;\le\;\gamma^n\max_s\big|V(s)-V^\pi(s)\big|$$
<p>반면 $n$이 커질수록 더 많은 확률적 보상과 전이가 더해져 분산이 커진다. $\lambda$-리턴과 GAE는 모든 $n$을 $(1-\lambda)\lambda^{n-1}$로 섞어 이 손잡이를 연속으로 만든다. baseline은 편향 없이 분산만 줄이는 별도의 손잡이다.</p>`,
      vary: ['$n=1$: TD(0), Q-learning. $n=\\infty$: 몬테카를로, REINFORCE.', '$\\lambda$-리턴, TD($\\lambda$), GAE($\\gamma,\\lambda$).', 'baseline·control variate: $V(s)$, 그룹 평균, leave-one-out.', '할인율 $\\gamma<1$ 자체도 분산을 줄이는 편향된 추정량으로 쓰인다.'],
      breaks: '부트스트랩 대상(critic)이 체계적으로 틀리면 $n$이 작을수록 그 편향이 그대로 전파된다. LLM의 희소 끝 보상에서는 토큰 단위 critic이 어렵기 때문에 GRPO처럼 MC + 그룹 baseline으로 돌아간다.',
    },
    T7: {
      why: String.raw`<p>Hoeffding 부등식에서 $n$번 관측한 팔의 평균은 확률 $1-\delta$로 $|\hat\mu-\mu|\le\sqrt{\log(2/\delta)/2n}$. <strong>온라인</strong>에서는 상한(UCB)을 따라 행동하면 틀렸을 때 데이터가 스스로 교정해 준다. <strong>오프라인</strong>에서는 교정 기회가 없으므로 하한(LCB)을 따라야 하고, 이때 성능은 최적 정책이 데이터에 얼마나 덮여 있는지(single-policy concentrability)에만 의존한다.</p>`,
      vary: ['낙관: UCB, 낙관적 초기화, 탐험 보너스, PUCT의 $\\sqrt{N}/(1+n)$ 항, Thompson 샘플링(확률적 낙관).', '비관: CQL, BCQ, IQL(데이터 내 max), 앙상블 하한, RLHF의 KL 앵커(보상모델이 모르는 곳으로 가지 않기).'],
      breaks: '불확실성 추정 자체가 틀리면(신경망 앙상블의 과신) 낙관도 비관도 엉뚱한 곳을 향한다.',
    },
    T8: {
      why: String.raw`<p>$\max$는 볼록 함수이므로 젠슨 부등식에 의해 $\mathbb{E}[\max_a\hat Q(a)]\ge\max_a\mathbb{E}[\hat Q(a)]$. 잡음이 있는 추정치에 $\max$를 씌우면 위로 편향되고, 부트스트랩이 그 편향을 다음 타깃으로 전파하며, 함수근사가 그것을 다른 상태로 일반화하고, off-policy 데이터는 그 오류를 교정할 경험을 주지 않는다. 세 요소(함수근사·부트스트랩·off-policy)가 모두 있을 때 발산 사례가 존재한다(Sutton & Barto 11장, Baird 1995).</p>`,
      vary: ['타깃 네트워크(부트스트랩 대상 고정): DQN.', '이중 추정기: Double Q, Double DQN, TD3의 clipped double Q.', '분포·on-policy 가중으로 축약성 회복: on-policy TD의 수렴(Tsitsiklis & Van Roy 1997), Emphatic TD.', '진짜 경사를 따르는 TD: GTD2, TDC.', '오프라인에서 OOD 행동 억제: CQL, BCQ(T7과 결합).'],
      breaks: '세 요소 중 하나라도 빼면 대체로 안정적이다. 실전 Deep RL은 셋을 모두 쓰므로 안정화 장치가 필수다.',
    },
    T9: {
      why: '',
      vary: ['$\\mathcal{I}$ = MCTS 방문 분포: AlphaZero, MuZero, ExIt.', '$\\mathcal{I}$ = 정답만 남긴 거절 샘플링: STaR, ReST-EM, RAFT, 거절 샘플링 미세조정.', '$\\mathcal{I}$ = $\\pi_k e^{A/\\beta}/Z$: AWR, MPO (T5와 결합).', '$\\mathcal{I}$ = 큰 추론 모델의 출력: R1에서 소형 모델로의 증류.', '파라미터 대신 외부 메모리에 상각: Reflexion, Voyager의 기술 라이브러리.'],
      breaks: '개선 연산자가 실제로 개선하지 못하면(검증기 오류, 약한 탐색) 증류가 오류를 굳힌다. 정답 필터링은 다양성을 줄여 pass@k가 오히려 떨어질 수 있다.',
    },
  };

  RL.chapter({
    id: 'theses',
    title: '9개의 대전제',
    subtitle: '이 커리큘럼의 모든 알고리즘은 아래 아홉 개의 수학적 명제 중 몇 개를 전제로 삼고, 그중 하나의 손잡이를 돌려 만들어진다.',
    time: 40,
    level: '지도 · 수학',
    numbered: false,
    theses: ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9'],
    goals: [
      '각 대전제를 한 줄 수식과 한 문장 직관으로 말할 수 있다.',
      '새 알고리즘을 보면 어떤 대전제에 기대고 어느 부분을 바꿨는지 분류할 수 있다.',
      '대전제가 깨지는 조건과, 그때 등장한 처방 알고리즘을 연결할 수 있다.',
    ],
    html: () => {
      let s = String.raw`
<p>여기서 대전제(thesis)는 "증명되었거나 널리 받아들여진 수학적 사실로서, 여러 알고리즘이 그 위에 설계된 것"을 뜻한다. 각 항목은 같은 형식을 따른다: <strong>명제</strong>, <strong>왜 참인가</strong>, <strong>변형이 생기는 방식</strong>, <strong>깨지는 조건</strong>, <strong>이 전제를 쓰는 알고리즘</strong>(계보도 데이터에서 자동으로 모음).</p>

<h2>대전제들의 관계</h2>
<p>아홉 개는 독립적이지 않다. 화살표는 "앞의 전제가 뒤의 전제를 만들거나 그 필요를 낳는다"는 뜻이다.</p>
<div data-w="relations"></div>
<div data-w="matrix"></div>
`;
      RL.theses.forEach((t) => {
        const d = DETAIL[t.id];
        s += '<h2 id="' + t.id.toLowerCase() + '">' + t.id + ' · ' + t.title + '</h2>';
        s += '<div class="thesis-box"><span class="label">명제</span>$$' + t.tex + '$$<p>' + t.gist + '</p></div>';
        if (t.id === 'T1') s += '<div data-w="t1-demo"></div>';
        if (t.id === 'T3') s += '<div data-w="t3-derive"></div><div data-w="t3-demo"></div>';
        if (t.id === 'T4') s += '<div data-w="t4-derive"></div>';
        if (t.id === 'T5') s += '<div data-w="t5-derive"></div><div data-w="t5-demo"></div>';
        if (t.id === 'T9') s += '<div data-w="t9-derive"></div>';
        if (d.why) s += '<h3>왜 참인가</h3>' + d.why;
        s += '<h3>변형이 생기는 방식</h3><ul>' + d.vary.map((v) => '<li>' + v + '</li>').join('') + '</ul>';
        s += '<div class="warn"><span class="label">깨지는 조건</span>' + d.breaks + '</div>';
        s += '<h3>이 전제를 쓰는 알고리즘</h3><div data-w="uses-' + t.id + '"></div>';
      });
      return s;
    },
    mount: Object.assign({
      relations: mountRelations,
      matrix: mountMatrix,
      't1-demo': mountT1,
      't3-derive': (el) => ui.derivation(el, {
        title: '로그-미분 트릭과 baseline의 불편성',
        steps: [
          { tex: String.raw`\nabla_\theta J(\theta) = \nabla_\theta \int p_\theta(\tau)\,R(\tau)\,d\tau = \int \hl{\nabla_\theta p_\theta(\tau)}\,R(\tau)\,d\tau`, why: '목적은 궤적 분포에 대한 기댓값이다. 보상 $R(\\tau)$는 $\\theta$와 무관하므로 미분은 분포에만 걸린다.' },
          { tex: String.raw`= \int p_\theta(\tau)\,\hl{\nabla_\theta\log p_\theta(\tau)}\,R(\tau)\,d\tau = \mathbb{E}_{\tau\sim p_\theta}\big[R(\tau)\,\nabla_\theta\log p_\theta(\tau)\big]`, why: '$\\nabla p = p\\,\\nabla\\log p$. 적분이 다시 기댓값이 되어 샘플로 추정할 수 있다.' },
          { tex: String.raw`\log p_\theta(\tau) = \log\rho_0(s_0) + \sum_t \Big[\hl{\log\pi_\theta(a_t|s_t)} + \log P(s_{t+1}|s_t,a_t)\Big]`, why: '궤적 확률을 펼치면 환경 항은 $\\theta$에 의존하지 않아 경사에서 사라진다. 모델 없이 경사를 구할 수 있는 이유.' },
          { tex: String.raw`\mathbb{E}_{a\sim\pi_\theta}\big[b(s)\,\nabla_\theta\log\pi_\theta(a|s)\big] = b(s)\,\nabla_\theta\sum_a\pi_\theta(a|s) = b(s)\,\nabla_\theta 1 = \hl{0}`, why: '행동과 무관한 baseline $b(s)$는 기댓값을 바꾸지 않는다. 그래서 $R$에서 $b$를 빼도 불편이고, 잘 고르면 분산만 줄어든다.' },
          { tex: String.raw`\nabla_\theta J = \mathbb{E}\Big[\sum_t \nabla_\theta\log\pi_\theta(a_t|s_t)\,\big(\hl{G_t - b(s_t)}\big)\Big]`, why: '인과성(미래 행동은 과거 보상에 영향을 못 줌)으로 $R$을 reward-to-go $G_t$로 바꾸고 baseline을 뺀 형태. 11장 이후의 모든 정책 경사법의 출발점.' },
        ],
      }),
      't3-demo': mountT3,
      't4-derive': (el) => ui.derivation(el, {
        title: '성능 차이 보조정리 (Kakade & Langford 2002)',
        steps: [
          { tex: String.raw`\mathbb{E}_{\tau\sim\pi'}\Big[\sum_t \gamma^t A^\pi(s_t,a_t)\Big] = \mathbb{E}_{\tau\sim\pi'}\Big[\sum_t \gamma^t\big(r_{t+1} + \gamma V^\pi(s_{t+1}) - V^\pi(s_t)\big)\Big]`, why: '$A^\\pi(s,a) = \\mathbb{E}[r + \\gamma V^\\pi(s\') - V^\\pi(s)]$를 새 정책 $\\pi\'$의 궤적 위에서 더한다.' },
          { tex: String.raw`= \mathbb{E}_{\tau\sim\pi'}\Big[\sum_t \gamma^t r_{t+1}\Big] + \mathbb{E}_{\tau\sim\pi'}\Big[\hl{\sum_t \big(\gamma^{t+1}V^\pi(s_{t+1}) - \gamma^t V^\pi(s_t)\big)}\Big]`, why: '두 번째 합은 망원급수(telescoping)다.' },
          { tex: String.raw`= J(\pi') + \mathbb{E}_{s_0}\big[\hl{-V^\pi(s_0)}\big] = J(\pi') - J(\pi)`, why: '망원급수는 $-V^\\pi(s_0)$만 남긴다($\\gamma^t V\\to0$).' },
          { tex: String.raw`\boxed{J(\pi') - J(\pi) = \frac{1}{1-\gamma}\,\mathbb{E}_{s\sim \hl{d^{\pi'}}}\,\mathbb{E}_{a\sim\pi'(\cdot|s)}\big[A^\pi(s,a)\big]}`, why: '할인 방문 분포 $d^{\\pi\'}$로 다시 쓴다. 문제는 $d^{\\pi\'}$가 아직 모르는 새 정책의 분포라는 점. 이것을 $d^\\pi$로 바꾼 것이 대리 목적이고, 그 근사가 유효하려면 $\\pi\'$가 $\\pi$에 가까워야 한다(신뢰영역).' },
        ],
      }),
      't5-derive': (el) => ui.derivation(el, {
        title: 'KL-정규화 목적의 닫힌 해 (Gibbs 변분 원리)',
        steps: [
          { tex: String.raw`\max_\pi\; \sum_a \pi(a)\,r(a) - \beta\sum_a \pi(a)\log\frac{\pi(a)}{\pi_0(a)}`, why: '한 상태(또는 한 프롬프트)에서의 목적. 행동은 토큰 시퀀스 전체여도 된다.' },
          { tex: String.raw`= -\beta\sum_a \pi(a)\log\frac{\pi(a)}{\hl{\pi_0(a)\,e^{r(a)/\beta}}}`, why: '$r(a) = \\beta\\log e^{r(a)/\\beta}$로 써서 로그 안으로 합친다.' },
          { tex: String.raw`= -\beta\,\KL\Big(\pi \,\Big\|\, \tfrac{1}{Z}\pi_0 e^{r/\beta}\Big) + \hl{\beta\log Z},\qquad Z=\sum_a \pi_0(a)e^{r(a)/\beta}`, why: '분모를 정규화 상수 $Z$로 나눠 확률분포로 만들면 상수 $\\beta\\log Z$가 떨어져 나온다.' },
          { tex: String.raw`\boxed{\pi^*(a) = \frac{\pi_0(a)\,e^{r(a)/\beta}}{Z}},\qquad \max = \beta\log Z = \beta\log\mathbb{E}_{\pi_0}\big[e^{r/\beta}\big]`, why: 'KL은 0 이상이고 두 분포가 같을 때만 0이므로 최적해가 바로 나온다. 최적값은 "soft max" $\\beta\\log\\mathbb{E}e^{r/\\beta}$로 $\\beta\\to0$이면 $\\max r$, $\\beta\\to\\infty$면 $\\mathbb{E}_{\\pi_0}r$.' },
          { tex: String.raw`r(a) = \beta\log\frac{\pi^*(a)}{\pi_0(a)} + \hl{\beta\log Z}`, why: '식을 뒤집으면 보상이 정책의 로그 비율로 표현된다. 쌍 비교에서 $Z$가 상쇄된다는 관찰이 DPO(20장)이고, 이 형태를 토큰마다 적용한 것이 "로짓 = soft Q" 해석(08, 18장)이다.' },
        ],
      }),
      't5-demo': mountT5,
      't9-derive': (el) => ui.derivation(el, {
        title: '탐색 후 증류 = 개선 분포로의 순방향 KL 투영',
        steps: [
          { tex: String.raw`\tilde\pi_k = \mathcal{I}[\pi_k]`, why: '비싼 개선 연산자 $\\mathcal{I}$가 현재 정책보다 나은 분포를 만든다: MCTS 방문 분포, 정답 필터링, $\\pi_k e^{A/\\beta}$ 재가중.' },
          { tex: String.raw`\pi_{k+1} = \arg\min_\pi \KL\big(\tilde\pi_k \,\|\, \pi\big) = \arg\max_\pi\; \mathbb{E}_{a\sim\hl{\tilde\pi_k}}\big[\log\pi(a)\big]`, why: '순방향 KL 최소화는 개선 분포의 샘플에 대한 최대우도, 즉 지도학습이다. RL의 어려운 부분(탐색)과 쉬운 부분(모방)이 분리된다.' },
          { tex: String.raw`\tilde\pi_k(y\mid x) = \frac{\pi_k(y\mid x)\,\hl{\mathbb{1}[\text{correct}(x,y)]}}{p_k(x)},\quad p_k(x) = \Pr_{\pi_k}[\text{correct}]`, why: '정답 필터링(거절 샘플링)의 경우. STaR, ReST-EM은 이 분포의 샘플로 SFT한다. EM의 E-단계(사후분포)와 M-단계(최대우도)다.' },
          { tex: String.raw`\nabla\,\mathbb{E}_{\tilde\pi_k}[\log\pi_\theta] \;\propto\; \mathbb{E}_{\pi_k}\big[\hl{\mathbb{1}[\text{correct}]}\,\nabla\log\pi_\theta\big]`, why: '$\\pi_\\theta=\\pi_k$에서 평가하면 이 경사는 0/1 보상의 REINFORCE 경사(T3)와 비례한다. 그래서 거절 샘플링 미세조정은 "baseline 없는 on-policy 정책 경사"의 오프라인 버전으로 읽힌다.' },
        ],
      }),
    }, Object.fromEntries(['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9'].map((t) => ['uses-' + t, (el) => mountUses(el, t)]))),
    tacit: [
      { tag: 'math', t: '세 개만 고르라면: 고정점, 점수함수, 깁스 분포',
        d: '<p>T1(벨만 고정점), T3(점수함수 경사), T5(KL-정규화의 깁스 해)는 나머지 대부분을 생성한다. T2는 T1 위의 반복 구조이고, T4는 T3을 안전하게 쓰기 위한 조건, T6는 T1과 T3 각각의 추정량 설계, T8은 T1이 근사에서 깨지는 방식, T9는 T5와 T2의 결합이다. 처음 보는 알고리즘은 이 세 개 중 무엇이 "엔진"인지부터 찾으면 된다.</p>' },
      { tag: 'math', t: 'log-sum-exp와 음의 엔트로피는 서로의 볼록 켤레다',
        d: '<p>$\\beta\\log\\sum_a\\pi_0(a)e^{r(a)/\\beta} = \\max_\\pi\\{\\langle\\pi, r\\rangle - \\beta\\KL(\\pi\\|\\pi_0)\\}$. 이 르장드르-펜헬 쌍대성 하나가 soft Bellman, SAC의 정책 개선, RLHF 최적해, DPO, Best-of-N의 KL 분석을 모두 설명한다. "soft"라는 접두사가 붙은 알고리즘은 거의 항상 이 쌍대성의 한쪽을 쓰고 있다.</p>' },
      { tag: 'math', t: '순방향 KL은 모방, 역방향 KL은 최적화',
        d: '<p>$\\KL(p\\|\\pi)$를 줄이면 $p$의 샘플로 최대우도를 하는 것이고(SFT, 증류, AlphaZero의 정책 손실), 결과는 모드를 모두 덮으려 한다. $\\KL(\\pi\\|p)$를 줄이면 $\\pi$의 샘플로 목적을 평가하는 것이고(RLHF, SAC의 정책 개선, 변분 추론), 결과는 한 모드에 집중한다. RL로 학습한 LLM의 다양성이 줄어드는 현상의 수학적 뿌리가 여기에 있다.</p>' },
      { tag: 'research', t: '대전제가 깨지는 곳이 연구 주제다',
        d: '<p>계보도의 처방 알고리즘들은 대부분 어떤 대전제의 가정이 현실에서 깨진 지점을 메운다. 축약성이 깨지면 타깃 네트워크(T1→T8), 분포가 바뀌면 신뢰영역(T3→T4), 데이터를 더 못 모으면 비관(T7), 평가가 틀리면 보상모델 앙상블과 KL 앵커(T2의 Goodhart). 새로운 설정(멀티턴 에이전트, 도구 사용, 장문 추론)에서 어느 전제가 깨지는지를 먼저 찾으면 다음 논문의 주제가 보인다.</p>' },
    ],
    quiz: [
      { q: '$\\max_\\pi \\mathbb{E}_\\pi[r] - \\beta\\KL(\\pi\\|\\pi_0)$의 최적값은?', options: ['$\\max_a r(a)$', '$\\mathbb{E}_{\\pi_0}[r]$', '$\\beta\\log\\mathbb{E}_{\\pi_0}[e^{r/\\beta}]$', '$\\beta\\,H(\\pi_0)$'], answer: 2,
        explain: '깁스 변분 원리에서 최적값은 $\\beta\\log Z$. $\\beta\\to0$이면 $\\max r$, $\\beta\\to\\infty$면 $\\mathbb{E}_{\\pi_0}r$로 두 극단을 잇는다.' },
      { q: '성능 차이 보조정리에서 신뢰영역이 필요한 직접적인 이유는?', options: ['advantage를 계산할 수 없어서', '기댓값이 새 정책의 상태 분포 $d^{\\pi\'}$에 대해 취해지는데 이를 옛 분포로 근사하기 때문', '할인율이 1이라서', '보상이 희소해서'], answer: 1,
        explain: '$d^{\\pi\'}$를 $d^\\pi$로 바꾼 대리 목적은 두 정책이 가까울 때만 실제 개선을 잘 근사한다.' },
      { q: '거절 샘플링 미세조정(정답만 골라 SFT)이 기대는 대전제로 가장 적절한 조합은?', options: ['T1, T8', 'T9, T3', 'T7, T6', 'T4, T1'], answer: 1,
        explain: '개선 분포(정답 필터)로의 순방향 KL 투영(T9)이고, 그 경사는 0/1 보상의 점수함수 경사(T3)와 비례한다.' },
    ],
  });

  /* ---------- 관계도 ---------- */
  function mountRelations(el) {
    const p = ui.panel(el, { kind: 'MAP', title: '대전제 관계도', caption: '상자를 누르면 해당 대전제로 이동한다.' });
    const X = [120, 420, 720], Y = [60, 210, 360], BW = 150, BH = 50;
    const pos = { T1: [X[0], Y[0]], T2: [X[1], Y[0]], T9: [X[2], Y[0]], T8: [X[0], Y[1]], T7: [X[1], Y[1]], T5: [X[2], Y[1]], T3: [X[0], Y[2]], T6: [X[1], Y[2]], T4: [X[2], Y[2]] };
    const edges = [
      ['T1', 'T2', '평가가 수렴한다'], ['T2', 'T9', '개선을 탐색으로'], ['T1', 'T8', '근사하면 깨진다'], ['T7', 'T8', 'max의 낙관 편향'],
      ['T6', 'T7', '불확실성 추정'], ['T5', 'T9', 'π₀·exp(A/β)로 투영'], ['T4', 'T5', 'KL 신뢰영역 ≈ KL 정규화'], ['T3', 'T6', '추정량의 분산'], ['T3', 'T4', '대리 목적', 'curve'],
    ];
    const S = RL.plot.svg;
    const svg = S('svg', { viewBox: '0 0 840 450', role: 'img', 'aria-label': '대전제 관계도' });
    svg.innerHTML = '<defs><marker id="th-ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--muted)"/></marker></defs>';
    const lab = (x, y, txt, anchor) => {
      const t = S('text', { x, y, 'text-anchor': anchor || 'middle', style: 'fill:var(--muted);font-size:12px' });
      t.textContent = txt;
      svg.appendChild(t);
    };
    edges.forEach(([a, b, txt, kind]) => {
      const [x1, y1] = pos[a], [x2, y2] = pos[b];
      if (kind === 'curve') {
        svg.appendChild(S('path', { d: 'M' + x1 + ' ' + (y1 + BH / 2) + ' C ' + x1 + ' ' + (y1 + 80) + ', ' + x2 + ' ' + (y2 + 80) + ', ' + x2 + ' ' + (y2 + BH / 2 + 2), style: 'fill:none;stroke:var(--muted);stroke-width:1.4', 'marker-end': 'url(#th-ar)' }));
        lab((x1 + x2) / 2, y1 + 78, txt);
        return;
      }
      if (y1 === y2) {
        const dir = Math.sign(x2 - x1);
        svg.appendChild(S('line', { x1: x1 + dir * BW / 2, y1, x2: x2 - dir * (BW / 2 + 2), y2, style: 'stroke:var(--muted);stroke-width:1.4', 'marker-end': 'url(#th-ar)' }));
        lab((x1 + x2) / 2, y1 - 8, txt);
      } else {
        const dir = Math.sign(y2 - y1);
        svg.appendChild(S('line', { x1, y1: y1 + dir * BH / 2, x2, y2: y2 - dir * (BH / 2 + 2), style: 'stroke:var(--muted);stroke-width:1.4', 'marker-end': 'url(#th-ar)' }));
        if (x1 > 600) lab(x1 - 8, (y1 + y2) / 2 + 4, txt, 'end');
        else lab(x1 + 8, (y1 + y2) / 2 + 4, txt, 'start');
      }
    });
    Object.keys(pos).forEach((id) => {
      const [x, y] = pos[id];
      const th = RL.thesisById[id];
      const a = S('a', { href: '#theses--' + id.toLowerCase() });
      a.appendChild(S('rect', { x: x - BW / 2, y: y - BH / 2, width: BW, height: BH, rx: 10, style: 'fill:var(--accent-soft);stroke:var(--accent);stroke-width:1.4' }));
      const t1 = S('text', { x, y: y - 4, 'text-anchor': 'middle', style: 'fill:var(--accent);font-size:12px;font-family:var(--font-mono);font-weight:600' });
      t1.textContent = id;
      const t2 = S('text', { x, y: y + 14, 'text-anchor': 'middle', style: 'fill:var(--ink);font-size:12.5px' });
      t2.textContent = th.short;
      a.append(t1, t2);
      svg.appendChild(a);
    });
    const box = document.createElement('div');
    box.style.overflowX = 'auto';
    svg.style.minWidth = '600px';
    box.appendChild(svg);
    p.body.appendChild(box);
  }

  /* ---------- 대전제 × 계열 행렬 ---------- */
  function mountMatrix(el) {
    const p = ui.panel(el, { kind: 'MAP', title: '대전제 × 알고리즘 계열', caption: '각 칸의 숫자는 그 계열에서 해당 대전제에 기대는 알고리즘 수(계보도 기준). 칸을 누르면 목록이 나온다.' });
    const fams = RL.families;
    const wrap = document.createElement('div');
    wrap.className = 'table-wrap';
    wrap.style.margin = '0';
    const out = document.createElement('div');
    out.className = 'fx-detail';
    out.textContent = '칸을 누르면 해당 알고리즘 목록이 여기에 나온다.';
    p.body.append(wrap, out);
    let html = '<table class="t"><thead><tr><th></th>' + fams.map((f) => '<th style="white-space:normal;min-width:70px">' + f.label + '</th>').join('') + '</tr></thead><tbody>';
    let max = 1;
    const cnt = {};
    RL.theses.forEach((t) => fams.forEach((f) => {
      const n = RL.algos.filter((a) => a.fam === f.id && a.th.includes(t.id)).length;
      cnt[t.id + f.id] = n;
      max = Math.max(max, n);
    }));
    RL.theses.forEach((t) => {
      html += '<tr><th style="text-transform:none;letter-spacing:0"><a href="#theses--' + t.id.toLowerCase() + '">' + t.id + '</a> ' + t.short + '</th>';
      fams.forEach((f) => {
        const n = cnt[t.id + f.id];
        const pct = Math.round((n / max) * 55);
        html += '<td class="num" style="text-align:center;cursor:' + (n ? 'pointer' : 'default') + ';background:color-mix(in srgb, var(--accent) ' + pct + '%, var(--surface));color:' + (pct > 35 ? 'var(--accent-ink)' : 'var(--ink)') + '" data-t="' + t.id + '" data-f="' + f.id + '">' + (n || '') + '</td>';
      });
      html += '</tr>';
    });
    wrap.innerHTML = html + '</tbody></table>';
    wrap.querySelectorAll('td[data-t]').forEach((td) => td.addEventListener('click', () => {
      const list = RL.algos.filter((a) => a.fam === td.dataset.f && a.th.includes(td.dataset.t));
      if (!list.length) return;
      out.innerHTML = '<strong>' + td.dataset.t + ' × ' + fams.find((f) => f.id === td.dataset.f).label + '</strong>: ' + list.map((a) => '<a href="#' + a.ch + '">' + a.name + '</a> <span class="col-muted">(' + Math.floor(a.year) + ')</span>').join(', ');
    }));
  }

  function mountUses(el, tid) {
    const list = RL.algos.filter((a) => a.th.includes(tid)).sort((a, b) => a.year - b.year);
    const box = document.createElement('div');
    box.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px';
    list.forEach((a) => {
      const f = RL.families.find((x) => x.id === a.fam);
      const link = document.createElement('a');
      link.className = 'chip';
      link.href = '#' + a.ch;
      link.title = a.note;
      link.innerHTML = '<span style="color:var(--' + f.color + ')">●</span> ' + a.name + ' <span class="mono" style="background:none;padding:0">' + Math.floor(a.year) + '</span>';
      box.appendChild(link);
    });
    el.appendChild(box);
  }

  /* ---------- T1: 두 가치 함수가 하나로 모인다 ---------- */
  function mountT1(el) {
    const p = ui.panel(el, { kind: 'SIM', title: '축약: 어디서 출발해도 같은 고정점으로', caption: '임의의 무작위 MDP(상태 8개, 행동 3개)에서 서로 다른 두 초기값 $V_0$, $U_0$에 벨만 최적 연산자를 반복 적용한다. 두 함수 사이의 거리는 매번 $\\gamma$배 이하로 줄어든다.' });
    const ctr = ui.row(p.body);
    const gS = ui.slider(ctr, { label: '$\\gamma$', min: 0.5, max: 0.98, step: 0.01, value: 0.9, format: ui.fmt.f(2), onInput: run });
    const seedB = ui.button(ui.row(p.body, 'btns'), '새 MDP 뽑기', () => { seed++; run(); });
    void seedB;
    const st = ui.stats(p.body, [{ key: 'r', label: '관측된 평균 축소 비율' }, { key: 'g', label: '이론 상한 $\\gamma$', tone: 'signal' }]);
    const box = document.createElement('div');
    p.body.appendChild(box);
    const chart = plot.line(box, { height: 220, x: { label: '반복 k', min: 0 }, y: { label: 'log₁₀ ‖V_k − U_k‖∞' }, series: [] });
    let seed = 3;
    function run() {
      const r = sim.rng(seed);
      const nS = 8, nA = 3, gm = gS.get();
      const P = [], R = [];
      for (let s = 0; s < nS; s++) {
        P.push([]); R.push([]);
        for (let a = 0; a < nA; a++) {
          const w = sim.range(nS).map(() => Math.pow(r(), 3));
          const z = sim.sum(w);
          P[s].push(w.map((x) => x / z));
          R[s].push(r() * 2 - 1);
        }
      }
      const T = (V) => sim.range(nS).map((s) => Math.max(...sim.range(nA).map((a) => R[s][a] + gm * sim.sum(P[s][a].map((p, s2) => p * V[s2])))));
      let V = sim.range(nS).map(() => 20 * r() - 10), U = sim.range(nS).map(() => -20 * r() + 10);
      const pts = [], bound = [];
      let d0 = Math.max(...V.map((v, i) => Math.abs(v - U[i])));
      let ratios = [];
      let prev = d0;
      for (let k = 0; k <= 40; k++) {
        const d = Math.max(...V.map((v, i) => Math.abs(v - U[i])));
        pts.push([k, Math.log10(Math.max(d, 1e-12))]);
        bound.push([k, Math.log10(d0) + k * Math.log10(gm)]);
        if (k > 0 && prev > 1e-10) ratios.push(d / prev);
        prev = d;
        V = T(V); U = T(U);
      }
      st.set('r', sim.mean(ratios).toFixed(3));
      st.set('g', gm.toFixed(3));
      chart.update({ series: [{ name: '$\\|V_k - U_k\\|_\\infty$', color: 'c1', data: pts }, { name: '$\\gamma^k\\|V_0-U_0\\|_\\infty$', color: 'signal', dash: '5 4', data: bound }] });
    }
    run();
  }

  /* ---------- T3: 점수함수 추정량의 분산 ---------- */
  function mountT3(el) {
    const p = ui.panel(el, { kind: 'SIM', title: '점수함수 추정량: 불편이지만 시끄럽다', caption: '$x\\sim\\mathcal{N}(\\mu, 1)$, 보상 $f(x) = -(x-3)^2 + c$에서 $\\nabla_\\mu\\mathbb{E}[f]$의 참값은 $-2(\\mu-3)$이다. 샘플 $N$개로 만든 점수함수 추정량 $\\frac1N\\sum f(x_i)(x_i-\\mu)$의 분포를 1000번 반복으로 그린다. 보상에 상수 $c$를 더하면 기댓값은 그대로지만 분산이 커지고, baseline(샘플 평균 보상)을 빼면 다시 줄어든다.' });
    const ctr = ui.row(p.body);
    const mS = ui.slider(ctr, { label: '$\\mu$', min: -2, max: 6, step: 0.1, value: 0, format: ui.fmt.f(1), onInput: run });
    const cS = ui.slider(ctr, { label: '보상 상수 $c$', min: 0, max: 50, step: 1, value: 20, format: ui.fmt.int, onInput: run });
    const nS = ui.slider(ctr, { label: '샘플 수 $N$', min: 2, max: 64, step: 1, value: 8, format: ui.fmt.int, onInput: run });
    const st = ui.stats(p.body, [
      { key: 'true', label: '참 경사', tone: 'signal' },
      { key: 'm0', label: 'baseline 없음: 평균' },
      { key: 's0', label: 'baseline 없음: 표준편차' },
      { key: 'm1', label: 'baseline 있음: 평균' },
      { key: 's1', label: 'baseline 있음: 표준편차', tone: 'accent' },
    ]);
    const box = document.createElement('div');
    p.body.appendChild(box);
    const chart = plot.line(box, { height: 220, x: { label: '추정된 경사값' }, y: { label: '빈도', min: 0 }, series: [] });
    function hist(vals, lo, hi, nb) {
      const bins = new Array(nb).fill(0);
      vals.forEach((v) => { const i = Math.floor(((v - lo) / (hi - lo)) * nb); if (i >= 0 && i < nb) bins[i]++; });
      return bins.map((c, i) => [lo + ((i + 0.5) * (hi - lo)) / nb, c]);
    }
    function run() {
      const r = sim.rng(11);
      const mu = mS.get(), c = cS.get(), N = nS.get();
      const f = (x) => -(x - 3) * (x - 3) + c;
      const e0 = [], e1 = [];
      for (let rep = 0; rep < 1000; rep++) {
        const xs = sim.range(N).map(() => mu + r.normal());
        const fs = xs.map(f);
        const b = sim.mean(fs);
        e0.push(sim.mean(xs.map((x, i) => fs[i] * (x - mu))));
        // leave-one-out baseline로 불편성 유지
        e1.push(sim.mean(xs.map((x, i) => (fs[i] - (N > 1 ? (b * N - fs[i]) / (N - 1) : 0)) * (x - mu))));
      }
      const tg = -2 * (mu - 3);
      st.set('true', tg.toFixed(2));
      st.set('m0', sim.mean(e0).toFixed(2));
      st.set('s0', sim.std(e0).toFixed(2));
      st.set('m1', sim.mean(e1).toFixed(2));
      st.set('s1', sim.std(e1).toFixed(2));
      const spread = Math.max(sim.std(e0), sim.std(e1)) * 3.2 + 1;
      const lo = tg - spread, hi = tg + spread;
      chart.update({ series: [
        { name: 'baseline 없음', color: 'c2', data: hist(e0, lo, hi, 50), area: true },
        { name: 'leave-one-out baseline', color: 'c1', data: hist(e1, lo, hi, 50), area: true },
      ], vlines: [{ x: tg, label: '참값', color: 'signal' }], x: { label: '추정된 경사값', min: lo, max: hi } });
    }
    run();
  }

  /* ---------- T5: 깁스 재가중 ---------- */
  function mountT5(el) {
    const p = ui.panel(el, { kind: 'CALC', title: '$\\pi^* \\propto \\pi_0 e^{r/\\beta}$ 직접 보기', caption: '응답 여섯 개에 대한 기준 분포 $\\pi_0$와 보상 $r$. $\\beta$를 줄이면 분포가 보상 최댓값 쪽으로 몰리고 KL이 커진다. $\\beta$를 키우면 $\\pi_0$로 돌아간다. 기준 분포에서 확률이 아주 낮은 응답은 보상이 높아도 쉽게 올라오지 않는다는 점에 주목하라.' });
    const ctr = ui.row(p.body);
    const bS = ui.slider(ctr, { label: '$\\beta$', min: -2, max: 1.5, step: 0.01, value: 0, format: (v) => Math.pow(10, v).toFixed(3), onInput: draw });
    const st = ui.stats(p.body, [
      { key: 'er', label: '$\\mathbb{E}_{\\pi^*}[r]$', tone: 'accent' },
      { key: 'kl', label: '$\\KL(\\pi^*\\|\\pi_0)$', tone: 'signal' },
      { key: 'obj', label: '목적값 $\\beta\\log Z$' },
      { key: 'h', label: '엔트로피 $H(\\pi^*)$' },
    ]);
    const labels = ['정중·정확', '장황', '짧고 정확', '아첨', '틀림', '희귀한 명답'];
    const pi0 = [0.3, 0.25, 0.2, 0.15, 0.08, 0.02];
    const rw = [1.0, 0.6, 1.1, 0.4, -1.0, 2.0];
    const box = document.createElement('div');
    p.body.appendChild(box);
    const bars = plot.bars(box, { categories: labels, series: [], height: 230, y: { min: 0, max: 1, label: '확률' } });
    function draw() {
      const beta = Math.pow(10, bS.get());
      const w = pi0.map((p0, i) => Math.log(p0) + rw[i] / beta);
      const ps = sim.softmax(w);
      const Z = sim.logsumexp(w);
      st.set('er', sim.sum(ps.map((x, i) => x * rw[i])).toFixed(3));
      st.set('kl', sim.kl(ps, pi0).toFixed(3));
      st.set('obj', (beta * Z).toFixed(3));
      st.set('h', sim.entropy(ps).toFixed(3));
      bars.update({ series: [
        { name: '$\\pi_0$', color: 'c6', values: pi0, opacity: 0.55 },
        { name: '$\\pi^*$', color: 'c1', values: ps },
        { name: '보상 $r$ (÷2)', color: 'c2', values: rw.map((x) => Math.max(0, x / 2)), opacity: 0.5 },
      ] });
    }
    draw();
  }
})();
