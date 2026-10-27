/* A 기호 · 용어 · 참고문헌 */
(function () {
  const { ui } = RL;

  const NOTATION = [
    ['s, s\'', '상태, 다음 상태', 'mdp'], ['a', '행동 (LLM에서는 토큰)', 'mdp'], ['r_{t+1}', '시점 t의 행동 결과로 받는 보상', 'mdp'],
    ['\\gamma', '할인율, 벨만 연산자의 축약 계수', 'mdp'], ['G_t', '리턴: 할인 누적 보상', 'mdp'], ['\\pi(a|s),\\ \\pi_\\theta', '정책, 매개변수 θ의 정책', 'mdp'],
    ['P(s\'|s,a)', '전이 확률 (환경 모델)', 'mdp'], ['R(s,a)', '기대 즉시 보상', 'mdp'], ['\\rho_0', '시작 상태 분포', 'mdp'],
    ['V^\\pi,\\ Q^\\pi', '상태 가치, 행동 가치', 'mdp'], ['A^\\pi = Q^\\pi - V^\\pi', 'advantage', 'mdp'], ['V^*,\\ Q^*', '최적 가치', 'bellman'],
    ['\\mathcal{T}^\\pi,\\ \\mathcal{T}^*', '벨만 기대 / 최적 연산자', 'bellman'], ['d^\\pi', '할인 상태 방문 분포', 'mdp'], ['J(\\pi)', '목적: 기대 리턴', 'mdp'],
    ['\\delta_t', 'TD 오차 $r_{t+1}+\\gamma V(s_{t+1})-V(s_t)$', 'td'], ['\\alpha', '학습률 (SAC에서는 온도)', 'td'], ['\\lambda', 'TD(λ)·GAE의 트레이스 감쇠', 'td'],
    ['\\epsilon', 'ε-greedy 탐험률, PPO 클립 폭', 'qlearning'], ['b_t,\\ O(o|s\')', 'POMDP의 믿음 상태, 관측 모델', 'pomdp'], ['\\mu,\\ \\pi_\\beta', '행동(데이터 수집) 정책', 'offline'],
    ['\\rho_t = \\pi/\\mu', '중요도 비율', 'offline'], ['r_t(\\theta)', 'PPO의 확률 비율 π_θ/π_old', 'ppo'], ['\\mathcal{H}(\\pi)', '정책 엔트로피', 'maxent'],
    ['x,\\ y', '프롬프트, 응답', 'llm-mdp'], ['\\pi_{\\text{ref}}', '기준 정책 (보통 SFT 모델)', 'llm-mdp'], ['\\beta', 'KL 계수 / 역온도', 'llm-mdp'],
    ['r_\\phi(x,y)', '보상 모델', 'rlhf'], ['y_w,\\ y_l', '선호된 / 거부된 응답', 'rlhf'], ['\\sigma(\\cdot)', '로지스틱 시그모이드', 'rlhf'],
    ['Z(x)', '분배 함수(정규화 상수)', 'dpo'], ['G', 'GRPO의 그룹 크기 (프롬프트당 샘플 수)', 'reasoning'], ['\\mathcal{I}[\\pi]', '개선 연산자 (탐색, 필터링, 재가중)', 'memory'],
  ];

  // [용어, English, 정확한 뜻, 처음 나오는 장, 쉬운 뜻, 본문에서 찾을 다른 표기]
  const TERMS = [
    ['보상 가설', 'Reward hypothesis', '목표는 누적 스칼라 보상의 기대값 최대화로 표현할 수 있다는 가정.', 'mdp', '"원하는 것은 결국 점수 하나를 많이 모으는 것으로 바꿔 말할 수 있다"는 믿음.'],
    ['마르코프 성질', 'Markov property', '다음 상태 분포가 현재 상태와 행동만으로 결정된다는 성질. 상태 표현의 성질이다.', 'mdp', '지금 상황만 알면 앞일을 예측하는 데 과거 기록이 더 필요 없다는 성질. 체스판 사진 한 장이면 다음 수를 두기에 충분한 것처럼.'],
    ['정책', 'Policy', '상태에서 행동(의 분포)으로 가는 함수 $\\pi(a|s)$.', 'mdp', '상황마다 무엇을 할지 정해 둔 규칙. 보통 "이 상황이면 왼쪽 70%, 오른쪽 30%"처럼 확률로 적는다.'],
    ['리턴', 'Return', '시점 t 이후의 할인 누적 보상 $G_t$.', 'mdp', '지금부터 끝까지 받을 점수의 합. 먼 미래 점수는 조금씩 깎아서 더한다.', ['누적 보상']],
    ['할인율', 'Discount factor', '미래 보상에 곱하는 비율 $\\gamma\\in[0,1]$.', 'mdp', '미래 점수를 지금 얼마나 쳐줄지. 0.9면 한 걸음 늦을 때마다 90%만 인정한다.'],
    ['가치 함수', 'Value function', '정책을 따를 때 상태(또는 상태-행동)의 기대 리턴.', 'mdp', '"이 상황에 있으면 앞으로 평균 몇 점을 받을까"를 알려 주는 표나 함수.', ['가치함수', '상태 가치']],
    ['advantage', 'Advantage', '$A^\\pi(s,a)=Q^\\pi(s,a)-V^\\pi(s)$.', 'mdp', '이 행동이 평소(평균)보다 몇 점 더 나은가. 양수면 평균보다 좋은 선택이다.', ['어드밴티지']],
    ['유효 지평', 'Effective horizon', '$1/(1-\\gamma)$. 할인 가중치의 총합이자 대략적인 계획 길이.', 'mdp', '대략 몇 걸음 앞까지 신경 쓰는가. γ=0.99면 약 100걸음.'],
    ['벨만 방정식', 'Bellman equation', '가치가 즉시 보상과 다음 상태 가치의 기대값으로 표현되는 자기참조식.', 'bellman', '"지금의 가치 = 바로 받는 점수 + 조금 깎은 다음 칸의 가치". 가치를 한 걸음씩 거꾸로 계산하게 해 주는 식.'],
    ['부트스트래핑', 'Bootstrapping', '추정치를 갱신할 때 다른(다음 상태의) 추정치를 타깃에 쓰는 것.', 'td', '끝까지 기다리지 않고 "다음 칸의 내 예상"을 믿고 지금 예상을 고치는 것. 예상으로 예상을 고친다.', ['부트스트랩']],
    ['축약 사상', 'Contraction mapping', '적용 후 거리가 일정 비율(γ) 이하로 줄어드는 연산자. 고정점이 유일하고 반복이 수렴한다.', 'bellman', '두 답안을 넣고 돌릴 때마다 차이가 일정 비율로 줄어드는 계산. 그래서 계속 돌리면 하나의 답으로 모인다.', ['축약']],
    ['일반화 정책 반복', 'GPI', '정책 평가와 정책 개선이 서로를 향해 상호작용하는 구조.', 'dp', '"지금 방식 채점하기"와 "채점 결과로 방식 고치기"를 번갈아 반복하는 큰 틀.', ['GPI']],
    ['믿음 상태', 'Belief state', 'POMDP에서 숨은 상태에 대한 사후분포. 그 자체로 마르코프한 상태가 된다.', 'pomdp', '눈에 안 보이는 진짜 상황에 대한 "지금 내 추측 확률". 단서를 볼 때마다 고쳐 쓴다.', ['믿음']],
    ['후회', 'Regret', '최적 행동을 계속 했을 때 대비 누적 보상 손실.', 'bandit', '처음부터 정답을 알았더라면 얻었을 점수와 실제로 얻은 점수의 차이. 배우느라 치른 수업료.', ['regret']],
    ['탐험', 'Exploration', '정보를 얻기 위해 현재 최선이 아닌 행동을 시도하는 것.', 'bandit', '더 좋은 게 있을지 몰라 일부러 안 해 본 선택을 해 보는 것. 반대는 아는 최선만 고르는 "활용".', ['탐색과 활용', 'exploration']],
    ['낙관적 탐험', 'Optimism in the face of uncertainty', '불확실한 선택지를 상한 기준으로 평가해 탐험을 유도하는 원리 (UCB).', 'bandit', '잘 모르는 선택은 "좋을지도 모른다"고 후하게 쳐 줘서 한 번은 시도해 보게 만드는 규칙.', ['UCB']],
    ['TD 오차', 'TD error', '$\\delta = r + \\gamma V(s\') - V(s)$. 한 스텝 예측과 현재 예측의 차이.', 'td', '한 걸음 가 본 뒤 느끼는 "예상보다 좋았다/나빴다"의 크기. 학습은 이 놀람을 줄이는 방향으로 일어난다.', ['TD error']],
    ['적격 흔적', 'Eligibility trace', '최근 방문한 상태에 신용을 지수 감쇠로 나눠 주는 기록. TD(λ)의 역방향 관점.', 'td', '최근에 지나온 칸들에 "방금 일에 책임이 있다"는 표시를 남겨, 좋은 일이 생기면 거슬러 올라가 함께 칭찬하는 장치.'],
    ['on-policy / off-policy', 'On/Off-policy', '학습 대상 정책과 데이터를 모은 정책이 같은가 다른가.', 'qlearning', '내가 직접 해 본 경험으로만 배우나(on), 남이 했거나 예전의 내가 한 경험으로도 배우나(off).', ['on-policy', 'off-policy']],
    ['과대추정 편향', 'Maximization bias', '잡음 있는 추정치의 max가 참 max보다 기댓값이 큰 현상.', 'qlearning', '어림값 여러 개 중 가장 큰 것만 고르면, 운 좋게 부풀려진 값을 고르게 되어 실제보다 좋다고 착각하는 현상.', ['과대추정']],
    ['함수근사', 'Function approximation', '가치나 정책을 매개변수 함수(선형, 신경망)로 표현하는 것.', 'approx', '칸마다 숫자를 따로 적는 대신, 비슷한 상황은 비슷한 값을 주는 공식(신경망 등) 하나로 전부 표현하는 것.', ['함수 근사']],
    ['Deadly Triad', 'Deadly triad', '함수근사·부트스트래핑·off-policy가 함께 있을 때 발산할 수 있다는 관찰.', 'approx', '어림 공식, 예상으로 예상 고치기, 남의 경험으로 배우기. 이 셋을 한꺼번에 하면 숫자가 폭주할 수 있다는 경고.'],
    ['경험 재생', 'Experience replay', '과거 전이를 버퍼에 저장해 무작위로 다시 학습에 쓰는 기법.', 'dqn', '지난 경험을 일기장에 모아 두고 아무 페이지나 펼쳐 다시 공부하는 것.', ['replay buffer', '리플레이 버퍼', '리플레이']],
    ['타깃 네트워크', 'Target network', '부트스트랩 타깃을 계산하는 느리게 갱신되는 사본.', 'dqn', '정답지를 잠시 고정해 두는 복사본. 정답이 매번 바뀌면 배울 수 없으니 몇천 걸음마다 한 번만 바꾼다.', ['target network']],
    ['정책 경사', 'Policy gradient', '정책 매개변수에 대한 기대 리턴의 경사. 점수함수 추정량으로 계산.', 'pg', '점수가 좋았던 행동의 확률은 올리고 나빴던 행동은 내리는 방향으로 정책을 직접 조금씩 움직이는 방법.'],
    ['baseline', 'Baseline', '경사 추정량에서 빼는 행동 무관 기준값. 불편성을 유지하며 분산을 줄인다.', 'pg', '"평소에 이 정도는 받는다"는 기준 점수. 실제 점수에서 이걸 빼면 진짜로 잘한 것과 운을 구분하기 쉬워진다.', ['기준값']],
    ['Actor-Critic', 'Actor-critic', '정책(actor)과 가치 추정기(critic)를 함께 학습하는 구조.', 'ac', '행동하는 선수(actor)와 옆에서 "방금 건 평소보다 좋았어"라고 말해 주는 코치(critic)를 함께 키우는 구조.', ['actor-critic', 'critic']],
    ['GAE', 'Generalized advantage estimation', 'TD 오차의 $(\\gamma\\lambda)^l$ 가중합으로 만든 advantage 추정량.', 'ac', '한 걸음 뒤의 놀람, 두 걸음 뒤의 놀람…을 점점 덜 믿으며 섞어 "이 행동이 얼마나 좋았나"를 재는 방법.'],
    ['신뢰영역', 'Trust region', '정책 업데이트를 KL 등으로 제한해 대리 목적의 근사가 유효한 범위에 머무르게 하는 것.', 'ppo', '"이 범위 안에서는 내 계산을 믿을 수 있다"는 안전 구역. 정책을 그 밖으로 크게 바꾸지 않는다.', ['trust region']],
    ['대리 목적', 'Surrogate objective', '옛 정책의 데이터와 advantage로 새 정책의 성능을 근사한 목적.', 'ppo', '새 방식을 실제로 다 해 보지 않고, 옛 경험으로 "새 방식이면 이쯤 나오겠지"라고 어림한 점수.'],
    ['KL 발산', 'KL divergence', '$\\KL(p\\|q)=\\sum p\\log(p/q)$. 두 분포의 차이를 재는 비대칭 척도.', 'llm-mdp', '두 확률분포가 얼마나 다른지 재는 값. 0이면 똑같고, 클수록 많이 달라졌다는 뜻.', ['KL']],
    ['최대 엔트로피 RL', 'Maximum-entropy RL', '보상과 함께 정책 엔트로피를 최대화하는 정식화. 최적 정책은 볼츠만 분포.', 'maxent', '점수도 많이 받되, 한 가지 행동에 모든 걸 걸지 말고 여러 선택을 골고루 열어 두라는 목표.', ['엔트로피']],
    ['재매개화 트릭', 'Reparameterization trick', '$a = f_\\theta(\\epsilon, s)$로 표본을 매개변수의 미분 가능 함수로 써서 저분산 경사를 얻는 것.', 'maxent', '"주사위를 먼저 굴리고, 그 결과를 정책이 변형해 행동을 만든다"고 바꿔 써서 미분을 쉽게 하는 요령.'],
    ['분포 이동', 'Distribution shift', '학습된 정책이 데이터에 없는 상태·행동으로 가면서 추정이 틀어지는 현상.', 'offline', '배울 때 본 상황과 실제로 마주치는 상황이 달라지는 것. 연습 문제만 풀다가 처음 보는 유형을 만난 것과 같다.'],
    ['외삽 오차', 'Extrapolation error', '데이터 밖 행동의 Q 추정 오류가 max에 의해 착취되는 것.', 'offline', '해 본 적 없는 행동에 대한 엉터리 예상이, "가장 좋은 걸 골라라"는 규칙 때문에 오히려 선택되는 문제.'],
    ['비관주의', 'Pessimism', '불확실한 곳을 하한 기준으로 평가해 오프라인에서 안전하게 개선하는 원리.', 'offline', '더 시험해 볼 수 없을 때는 "모르는 곳은 나쁠 수도 있다"고 보수적으로 잡는 태도.', ['비관']],
    ['MCTS / PUCT', 'Monte Carlo tree search', '선택·확장·평가·백업을 반복하는 트리 탐색. PUCT는 사전확률이 들어간 탐험 항.', 'modelbased', '머릿속으로 여러 수를 미리 둬 보고, 유망한 가지는 더 깊이, 안 가 본 가지도 가끔 둬 보며 다음 수를 고르는 방법.', ['MCTS']],
    ['세계 모델', 'World model', '환경의 전이와 보상을 예측하는 학습된 모델.', 'modelbased', '"이렇게 하면 세상이 어떻게 바뀔까"를 예측하는 머릿속 시뮬레이터.', ['world model']],
    ['return-to-go', 'Return-to-go', '현재 시점부터 끝까지 남은 보상 합. Decision Transformer의 조건 토큰.', 'sequence', '"앞으로 몇 점을 더 받고 싶은가"라는 목표 점수. 모델에게 이 숫자를 주고 그에 맞는 행동을 고르게 한다.'],
    ['In-context RL', 'In-context RL', '가중치 갱신 없이 컨텍스트 안의 경험만으로 정책이 개선되는 현상.', 'sequence', '모델을 다시 학습시키지 않아도, 앞선 시도와 결과를 대화창에 보여 주기만 하면 다음 시도가 나아지는 현상.'],
    ['KL 페널티', 'KL penalty', '기준 정책에서 멀어지는 정도를 벌하는 항. RLHF의 핵심 정규화.', 'llm-mdp', '원래 모델에서 너무 멀어지면 점수를 깎는 벌점. 점수만 쫓다가 이상한 말투가 되는 것을 막는다.'],
    ['참조 정책', 'Reference policy', '정규화의 기준이 되는 고정 정책 $\\pi_{\\text{ref}}$, 보통 SFT 모델.', 'llm-mdp', '"원래 이렇게 말하던 모델". 새 모델이 얼마나 달라졌는지 잴 때 기준으로 삼는 출발점.', ['기준 정책', '기준 모델']],
    ['보상 모델', 'Reward model', '사람(또는 AI) 선호 데이터로 학습한 응답 점수 함수.', 'rlhf', '사람이 "이 답이 더 좋다"고 고른 기록을 보고, 어떤 답에든 점수를 매기도록 배운 채점기.', ['보상모델', 'reward model']],
    ['Bradley–Terry 모형', 'Bradley–Terry model', '$P(y_w\\succ y_l) = \\sigma(r_w - r_l)$로 쌍대 선호를 모형화.', 'rlhf', '두 답의 점수 차이가 클수록 사람이 점수 높은 쪽을 고를 확률이 높다고 보는 단순한 규칙.', ['Bradley–Terry', 'Bradley-Terry']],
    ['보상 해킹 · 과최적화', 'Reward hacking / overoptimization', '프록시 보상을 최적화할수록 실제 목표는 나빠지는 현상.', 'rlhf', '채점기의 허점을 찾아 점수만 높이는 것. 시험 점수는 오르는데 실력은 늘지 않는 상황.', ['보상 해킹', '과최적화', 'reward hacking']],
    ['암묵적 보상', 'Implicit reward', 'DPO에서 $\\beta\\log\\pi_\\theta(y|x)/\\pi_{\\text{ref}}(y|x)$로 정의되는 보상.', 'dpo', '따로 채점기를 두지 않고 "원래 모델보다 이 답을 얼마나 더 좋아하게 됐나"를 그대로 점수로 쓰는 것.'],
    ['RLVR', 'RL with verifiable rewards', '정답 검사기·테스트 등 자동 검증 가능한 보상으로 하는 RL.', 'reasoning', '정답 확인이나 코드 테스트처럼 기계가 맞고 틀림을 확실히 판정할 수 있는 문제로 하는 강화학습.'],
    ['ORM / PRM', 'Outcome / process reward model', '최종 결과만 / 풀이 단계마다 점수를 매기는 보상 모델.', 'reasoning', '답만 채점하는 채점기(ORM)와 풀이 과정을 한 줄씩 채점하는 채점기(PRM).', ['PRM', 'ORM']],
    ['pass@k', 'pass@k', 'k개 샘플 중 하나라도 맞을 확률.', 'reasoning', 'k번 시도해서 한 번이라도 맞힐 확률. pass@1은 "한 번에 맞힐 확률".'],
    ['Best-of-N', 'Best-of-N', 'N개 샘플 중 보상 모델 점수가 가장 높은 것을 고르는 추론 시점 최적화.', 'test-time', '답을 N개 뽑아 채점기 점수가 가장 높은 하나만 내놓는 방법. 학습 없이 품질을 올린다.'],
    ['Test-time compute', 'Test-time compute', '추론 시 더 많은 연산(샘플링, 탐색, 검증, 긴 추론)을 써서 성능을 올리는 것.', 'test-time', '답할 때 더 오래 생각하게(더 많이 뽑고, 검토하고, 길게 추론하게) 해서 정확도를 올리는 것.'],
    ['전문가 반복', 'Expert iteration', '탐색(전문가)으로 개선한 결과를 신경망(견습생)에 증류하는 반복.', 'memory', '오래 고민해서 찾은 좋은 답을 직감처럼 외우게 하고, 그 직감으로 다시 더 깊이 고민하기를 반복하는 것.', ['Expert Iteration', 'ExIt']],
    ['상각', 'Amortization', '매번 비싸게 풀던 추론·탐색을 학습된 함수가 한 번에 근사하도록 만드는 것.', 'memory', '매번 처음부터 계산하던 것을 외워 두어 다음엔 바로 꺼내 쓰는 것. 구구단을 외우는 것과 같다.'],
  ];
  RL.terms = TERMS.map((t) => ({ ko: t[0], en: t[1], def: t[2], ch: t[3], easy: t[4], alias: t[5] || [] }));

  const REFS = [
    ['기초', [
      ['Bellman', 1957, 'Dynamic Programming', null],
      ['Sutton & Barto', 2018, 'Reinforcement Learning: An Introduction (2nd ed.)', 'http://incompleteideas.net/book/the-book-2nd.html'],
      ['Puterman', 1994, 'Markov Decision Processes', null],
      ['Kaelbling, Littman & Cassandra', 1998, 'Planning and Acting in Partially Observable Stochastic Domains', null],
      ['Watkins & Dayan', 1992, 'Q-learning', null],
      ['Sutton', 1988, 'Learning to Predict by the Methods of Temporal Differences', null],
      ['Williams', 1992, 'Simple Statistical Gradient-Following Algorithms for Connectionist RL', null],
      ['Sutton, McAllester, Singh & Mansour', 2000, 'Policy Gradient Methods for RL with Function Approximation', null],
      ['Kakade & Langford', 2002, 'Approximately Optimal Approximate Reinforcement Learning', null],
      ['Tsitsiklis & Van Roy', 1997, 'An Analysis of Temporal-Difference Learning with Function Approximation', null],
      ['Ng, Harada & Russell', 1999, 'Policy Invariance under Reward Transformations', null],
      ['Auer, Cesa-Bianchi & Fischer', 2002, 'Finite-time Analysis of the Multiarmed Bandit Problem', null],
    ]],
    ['Deep RL', [
      ['Mnih et al.', 2013, 'Playing Atari with Deep Reinforcement Learning', '1312.5602'],
      ['van Hasselt, Guez & Silver', 2015, 'Deep RL with Double Q-learning', '1509.06461'],
      ['Wang et al.', 2015, 'Dueling Network Architectures for Deep RL', '1511.06581'],
      ['Schaul et al.', 2015, 'Prioritized Experience Replay', '1511.05952'],
      ['Bellemare, Dabney & Munos', 2017, 'A Distributional Perspective on RL', '1707.06887'],
      ['Hessel et al.', 2017, 'Rainbow: Combining Improvements in Deep RL', '1710.02298'],
      ['Schulman et al.', 2015, 'Trust Region Policy Optimization', '1502.05477'],
      ['Schulman et al.', 2015, 'High-Dimensional Continuous Control Using GAE', '1506.02438'],
      ['Mnih et al.', 2016, 'Asynchronous Methods for Deep RL (A3C)', '1602.01783'],
      ['Schulman et al.', 2017, 'Proximal Policy Optimization Algorithms', '1707.06347'],
      ['Lillicrap et al.', 2015, 'Continuous Control with Deep RL (DDPG)', '1509.02971'],
      ['Fujimoto, van Hoof & Meger', 2018, 'Addressing Function Approximation Error in Actor-Critic Methods (TD3)', '1802.09477'],
      ['Haarnoja et al.', 2017, 'RL with Deep Energy-Based Policies (Soft Q-learning)', '1702.08165'],
      ['Haarnoja et al.', 2018, 'Soft Actor-Critic', '1801.01290'],
      ['Espeholt et al.', 2018, 'IMPALA', '1802.01561'],
      ['Engstrom et al.', 2020, 'Implementation Matters in Deep Policy Gradients', '2005.12729'],
      ['Henderson et al.', 2017, 'Deep Reinforcement Learning that Matters', '1709.06560'],
      ['Pardo et al.', 2017, 'Time Limits in Reinforcement Learning', '1712.00378'],
    ]],
    ['모델 기반 · 오프라인 · 시퀀스', [
      ['Silver et al.', 2017, 'Mastering Chess and Shogi by Self-Play (AlphaZero)', '1712.01815'],
      ['Anthony, Tian & Barber', 2017, 'Thinking Fast and Slow with Deep Learning and Tree Search (ExIt)', '1705.08439'],
      ['Schrittwieser et al.', 2019, 'Mastering Atari, Go, Chess and Shogi by Planning with a Learned Model (MuZero)', '1911.08265'],
      ['Ha & Schmidhuber', 2018, 'World Models', '1803.10122'],
      ['Hafner et al.', 2019, 'Dream to Control (Dreamer)', '1912.01603'],
      ['Janner et al.', 2019, 'When to Trust Your Model (MBPO)', '1906.08253'],
      ['Fujimoto, Meger & Precup', 2018, 'Off-Policy Deep RL without Exploration (BCQ)', '1812.02900'],
      ['Kumar et al.', 2020, 'Conservative Q-Learning for Offline RL', '2006.04779'],
      ['Kostrikov, Nair & Levine', 2021, 'Offline RL with Implicit Q-Learning', '2110.06169'],
      ['Peng et al.', 2019, 'Advantage-Weighted Regression', '1910.00177'],
      ['Chen et al.', 2021, 'Decision Transformer', '2106.01345'],
      ['Janner, Li & Levine', 2021, 'Offline RL as One Big Sequence Modeling Problem', '2106.02039'],
      ['Laskin et al.', 2022, 'In-context RL with Algorithm Distillation', '2210.14215'],
    ]],
    ['LLM 정렬', [
      ['Christiano et al.', 2017, 'Deep RL from Human Preferences', '1706.03741'],
      ['Stiennon et al.', 2020, 'Learning to Summarize from Human Feedback', '2009.01325'],
      ['Ouyang et al.', 2022, 'Training Language Models to Follow Instructions with Human Feedback', '2203.02155'],
      ['Bai et al.', 2022, 'Constitutional AI: Harmlessness from AI Feedback', '2212.08073'],
      ['Gao, Schulman & Hilton', 2022, 'Scaling Laws for Reward Model Overoptimization', '2210.10760'],
      ['Rafailov et al.', 2023, 'Direct Preference Optimization', '2305.18290'],
      ['Azar et al.', 2023, 'A General Theoretical Paradigm to Understand Learning from Human Preferences (IPO)', '2310.12036'],
      ['Ethayarajh et al.', 2024, 'KTO: Model Alignment as Prospect Theoretic Optimization', '2402.01306'],
      ['Hong, Lee & Thorne', 2024, 'ORPO: Monolithic Preference Optimization without Reference Model', '2403.07691'],
      ['Meng, Xia & Chen', 2024, 'SimPO: Simple Preference Optimization with a Reference-Free Reward', '2405.14734'],
      ['Rafailov et al.', 2024, 'From r to Q*: Your Language Model is Secretly a Q-Function', '2404.12358'],
    ]],
    ['LLM 추론 · 탐색 · 기억', [
      ['Zelikman et al.', 2022, 'STaR: Bootstrapping Reasoning With Reasoning', '2203.14465'],
      ['Gulcehre et al.', 2023, 'Reinforced Self-Training (ReST)', '2308.08998'],
      ['Singh et al.', 2023, 'Beyond Human Data: Scaling Self-Training (ReST-EM)', '2312.06585'],
      ['Lightman et al.', 2023, "Let's Verify Step by Step", '2305.20050'],
      ['Wang et al.', 2023, 'Math-Shepherd', '2312.08935'],
      ['Shao et al.', 2024, 'DeepSeekMath (GRPO)', '2402.03300'],
      ['Ahmadian et al.', 2024, 'Back to Basics: Revisiting REINFORCE-Style Optimization for RLHF (RLOO)', '2402.14740'],
      ['DeepSeek-AI', 2025, 'DeepSeek-R1', '2501.12948'],
      ['Yu et al.', 2025, 'DAPO', '2503.14476'],
      ['Liu et al.', 2025, 'Understanding R1-Zero-Like Training (Dr. GRPO)', '2503.20783'],
      ['Yue et al.', 2025, 'Does RL Really Incentivize Reasoning Capacity Beyond the Base Model?', '2504.13837'],
      ['Wang et al.', 2022, 'Self-Consistency Improves Chain of Thought Reasoning', '2203.11171'],
      ['Yao et al.', 2023, 'Tree of Thoughts', '2305.10601'],
      ['Hao et al.', 2023, 'Reasoning with Language Model is Planning with World Model (RAP)', '2305.14992'],
      ['Mudgal et al.', 2023, 'Controlled Decoding from Language Models', '2310.17022'],
      ['Wang et al.', 2024, 'Q*: Improving Multi-step Reasoning for LLMs with Deliberative Planning', '2406.14283'],
      ['Snell et al.', 2024, 'Scaling LLM Test-Time Compute Optimally', '2408.03314'],
      ['Beirami et al.', 2024, 'Theoretical Guarantees on the Best-of-n Alignment Policy', '2401.01879'],
      ['Shinn et al.', 2023, 'Reflexion', '2303.11366'],
      ['Wang et al.', 2023, 'Voyager', '2305.16291'],
    ]],
  ];

  RL.chapter({
    id: 'glossary',
    title: '기호 · 용어 · 참고문헌',
    subtitle: '이 커리큘럼 전체에서 쓰는 기호와 용어, 그리고 장별로 인용한 핵심 논문 목록.',
    time: 5,
    level: '부록',
    easy: {
      hook: '모르는 단어가 나오면 여기서 찾자. 각 용어에는 "쉬운 뜻"과 "정확한 뜻"이 함께 있다.',
      intro: '<p>본문에서 점선 밑줄이 그어진 단어도 같은 사전에서 뜻을 가져온다. 기호가 낯설면 위쪽 "기호 사전" 버튼을 누르자.</p>',
    },
    html: String.raw`
<h2>기호표</h2>
<div data-w="notation"></div>
<h2>용어집</h2>
<div data-w="terms"></div>
<h2>참고문헌</h2>
<p>arXiv 번호가 있는 논문은 링크를 달았다. 연도는 최초 공개(주로 arXiv) 기준이며 학회 발표 연도와 다를 수 있다. 각 장의 본문과 암묵지에는 여기 없는 문헌도 저자·연도로 인용되어 있다.</p>
<div data-w="refs"></div>
`,
    mount: {
      notation: (el) => {
        el.className = 'table-wrap';
        el.innerHTML = '<table class="t"><thead><tr><th>기호</th><th>의미</th><th>처음 나오는 장</th></tr></thead><tbody>' +
          NOTATION.map((n) => '<tr><td>$' + n[0] + '$</td><td>' + n[1] + '</td><td><a href="#' + n[2] + '">' + RL.meta[n[2]].no + ' ' + RL.meta[n[2]].title + '</a></td></tr>').join('') + '</tbody></table>';
      },
      terms: (el) => {
        const sid = ui.nextId('gq');
        const input = ui.h('input', { type: 'search', id: sid, placeholder: '용어 검색 (한글 또는 영어)', style: 'font:inherit;font-size:var(--fs-sm);padding:6px 10px;border:1px solid var(--line);border-radius:6px;background:var(--surface);color:var(--ink);width:100%;max-width:360px' });
        const lab = ui.h('label', { for: sid, class: 'label', text: '검색' });
        const wrap = ui.h('div', { class: 'table-wrap' });
        el.append(lab, input, wrap);
        const draw = () => {
          const q = input.value.trim().toLowerCase();
          const rows = TERMS.filter((t) => !q || (t[0] + ' ' + t[1] + ' ' + t[2] + ' ' + t[4]).toLowerCase().includes(q));
          wrap.innerHTML = '<table class="t"><thead><tr><th>용어</th><th>쉬운 뜻</th><th>정확한 뜻</th><th>장</th></tr></thead><tbody>' +
            (rows.length ? rows.map((t) => '<tr><td><strong>' + t[0] + '</strong><br><span class="col-muted" style="font-size:var(--fs-xs)">' + t[1] + '</span></td><td>' + t[4] + '</td><td class="col-muted">' + t[2] + '</td><td><a href="#' + t[3] + '">' + RL.meta[t[3]].no + '</a></td></tr>').join('') : '<tr><td colspan="4" class="col-muted">일치하는 용어가 없습니다.</td></tr>') + '</tbody></table>';
          RL.renderMath(wrap);
        };
        input.addEventListener('input', draw);
        draw();
      },
      refs: (el) => {
        el.innerHTML = REFS.map(([sec, list]) => '<h3>' + sec + '</h3><ul>' + list.map((r) => '<li>' + r[0] + ' (' + r[1] + '). ' + (r[3] ? '<a href="' + (r[3].startsWith('http') ? r[3] : 'https://arxiv.org/abs/' + r[3]) + '" target="_blank" rel="noopener">' + r[2] + '</a>' : '<em>' + r[2] + '</em>') + (r[3] && !r[3].startsWith('http') ? ' <span class="mono" style="font-size:var(--fs-xs)">arXiv:' + r[3] + '</span>' : '') + '</li>').join('') + '</ul>').join('');
      },
    },
  });
})();
