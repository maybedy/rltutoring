/* G 알고리즘 계보도와 타임라인 */
(function () {
  const { ui } = RL;

  /* 계열(lane) */
  const FAM = [
    { id: 'explore', label: '밴딧 · 탐험', color: 'c6' },
    { id: 'dp', label: '계획 · DP', color: 'c5' },
    { id: 'value', label: '가치 기반', color: 'c1' },
    { id: 'pg', label: '정책 경사 · 신뢰영역', color: 'c2' },
    { id: 'maxent', label: '최대 엔트로피 · 연속 제어', color: 'c3' },
    { id: 'model', label: '모델 기반 · 탐색', color: 'c5' },
    { id: 'offline', label: '배치 · 오프라인 · 시퀀스', color: 'c4' },
    { id: 'align', label: 'LLM 정렬', color: 'c2' },
    { id: 'reason', label: 'LLM 추론 RL', color: 'c1' },
    { id: 'infer', label: 'LLM 추론 시점 · 기억', color: 'c3' },
  ];

  /* 파생 축(knob): 부모에서 자식으로 갈 때 무엇을 바꿨나 */
  const KNOB = {
    rep: { label: '표현 · 근사', color: 'c1' },
    est: { label: '추정량', color: 'c2' },
    reg: { label: '정규화 · 제약', color: 'c3' },
    data: { label: '데이터 체제', color: 'c4' },
    imp: { label: '개선 연산자 · 탐색', color: 'c5' },
    prob: { label: '문제 재정의', color: 'c6' },
  };

  /* 알고리즘 데이터베이스. y: 연도(소수점은 같은 해 안의 순서), from: [부모id, 무엇이 바뀌었나, knob] */
  const A = [
    ['thompson', 'Thompson Sampling', 1933, 'Thompson', 'explore', 'bandit', ['T7'], [], '사후분포에서 표본을 뽑아 그 표본이 최선인 팔을 고른다. 불확실성에 비례한 확률적 탐험.'],
    ['lairobbins', 'Lai–Robbins 하한', 1985, 'Lai & Robbins', 'explore', 'bandit', ['T7'], [], '어떤 일관된 밴딧 알고리즘도 후회가 log T보다 느리게 늘 수 없다는 하한.'],
    ['ucb1', 'UCB1', 2002, 'Auer, Cesa-Bianchi & Fischer', 'explore', 'bandit', ['T7'], [['lairobbins', '하한에 맞먹는 단순한 신뢰상한 규칙', 'est']], 'Hoeffding 신뢰구간의 상한으로 행동을 고르는 낙관적 탐험. log T 후회.'],

    ['bellman', '벨만 방정식 · DP', 1957, 'Bellman', 'dp', 'bellman', ['T1'], [], '최적성의 원리와 가치 반복. 가치는 한 스텝 보상 + 할인된 다음 가치의 고정점.'],
    ['pi', '정책 반복', 1960, 'Howard', 'dp', 'dp', ['T2', 'T1'], [['bellman', '가치 반복 대신 평가와 개선을 교대', 'imp']], '정책을 완전히 평가하고 탐욕적으로 개선하기를 반복. 유한 번에 최적 정책.'],
    ['pomdp', 'POMDP', 1965, 'Åström; Smallwood & Sondik 1973', 'dp', 'pomdp', ['T1'], [['bellman', '상태 대신 믿음(사후분포)을 상태로', 'prob']], '부분 관측 하의 결정. 믿음 공간의 가치 함수는 구간별 선형·볼록.'],

    ['ac83', 'Actor-Critic', 1983, 'Barto, Sutton & Anderson', 'pg', 'ac', ['T2', 'T6'], [], '정책(actor)과 가치 추정기(critic)를 분리. critic의 TD 오차가 actor의 학습 신호.'],
    ['td', 'TD(λ)', 1988, 'Sutton', 'value', 'td', ['T6', 'T1'], [['bellman', '모델의 기댓값 대신 샘플 한 개로 부트스트랩', 'est']], '모델 없이 다음 추정치로 현재 추정치를 갱신. λ로 MC와 TD 사이를 보간.'],
    ['qlearning', 'Q-learning', 1989, 'Watkins', 'value', 'qlearning', ['T1', 'T8'], [['td', 'V 대신 Q, 기대 방정식 대신 최적 방정식(off-policy)', 'imp']], '벨만 최적 방정식의 확률적 근사. 데이터를 모은 정책과 무관하게 최적 Q를 학습.'],
    ['dyna', 'Dyna', 1990, 'Sutton', 'model', 'modelbased', ['T2'], [['td', '실제 경험 + 학습한 모델로 만든 가상 경험', 'data']], '경험으로 모델을 배우고, 모델에서 샘플한 전이로 추가 계획 업데이트.'],
    ['reinforce', 'REINFORCE', 1992, 'Williams', 'pg', 'pg', ['T3'], [], '로그확률 경사에 리턴을 곱한 점수함수 추정량. 모든 정책 경사법의 원형.'],
    ['sarsa', 'SARSA', 1994, 'Rummery & Niranjan', 'value', 'qlearning', ['T2'], [['td', 'Q의 기대 방정식을 on-policy 샘플로', 'est']], '실제로 다음에 할 행동의 Q로 타깃을 만든다. 탐험 비용을 반영한 안전한 경로를 배운다.'],
    ['pgt', '정책 경사 정리', 2000, 'Sutton, McAllester, Singh & Mansour', 'pg', 'pg', ['T3'], [['reinforce', '경사를 d^π와 Q^π로 표현, 함수근사와 결합', 'rep']], '목적의 경사가 상태 분포의 미분 없이 E[∇log π · Q]로 쓰인다.'],
    ['npg', 'Natural Policy Gradient', 2001, 'Kakade', 'pg', 'ppo', ['T4'], [['pgt', '유클리드 경사 → 피셔 정보로 전처리한 경사', 'reg']], '매개변수화에 불변인 정책 공간의 가파른 방향. TRPO의 기하학적 뿌리.'],
    ['cpi', 'CPI · 성능 차이', 2002, 'Kakade & Langford', 'pg', 'ppo', ['T4'], [['pgt', '보수적 혼합 업데이트로 단조 개선 하한', 'reg']], '성능 차이 보조정리와 보수적 정책 반복. 새 정책의 이득을 옛 advantage로 하한.'],
    ['fqi', 'Fitted Q Iteration', 2005, 'Ernst et al.; Riedmiller (NFQ)', 'offline', 'qviews', ['T1', 'T8'], [['qlearning', '온라인 갱신 → 고정 데이터에서 회귀를 반복', 'data']], '배치 데이터에 대해 벨만 타깃 회귀를 반복. DQN과 오프라인 RL의 공통 조상.'],
    ['uct', 'UCT · MCTS', 2006, 'Kocsis & Szepesvári', 'model', 'modelbased', ['T7'], [['ucb1', '밴딧의 UCB를 트리의 각 노드에 적용', 'imp']], '선택·확장·시뮬레이션·백업을 반복하는 몬테카를로 트리 탐색.'],
    ['doubleq', 'Double Q-learning', 2010, 'van Hasselt', 'value', 'qlearning', ['T8'], [['qlearning', '행동 선택과 평가를 두 추정기로 분리', 'est']], 'max가 만드는 과대추정 편향을 두 개의 독립 추정기로 상쇄.'],
    ['reps', 'REPS', 2010, 'Peters, Mülling & Altun', 'maxent', 'offline', ['T5', 'T4'], [['cpi', '정책 변화를 KL로 제약한 닫힌 해', 'reg']], '상대 엔트로피 제약 하의 정책 탐색. 해가 π_old · exp(A/η) 꼴.'],
    ['dqn', 'DQN', 2013, 'Mnih et al.', 'value', 'dqn', ['T8', 'T1'], [['qlearning', '표 → 합성곱 신경망, 경험 재생 + 타깃 네트워크', 'rep'], ['fqi', '배치 회귀를 미니배치 SGD로', 'rep']], '픽셀에서 Atari를 배운 첫 Deep RL. 불안정성을 replay와 target net으로 제어.'],
    ['dpg', 'DPG', 2014, 'Silver et al.', 'maxent', 'maxent', ['T3'], [['pgt', '확률적 정책 → 결정적 정책의 경사', 'est']], '연속 행동에서 ∇_a Q · ∇_θ μ로 경사를 계산.'],
    ['ddqn', 'Double DQN', 2015.6, 'van Hasselt, Guez & Silver', 'value', 'dqn', ['T8'], [['dqn', '타깃의 argmax는 온라인 망, 평가는 타깃 망', 'est'], ['doubleq', '두 추정기 아이디어를 기존 두 망으로', 'est']], '추가 비용 없이 과대추정을 줄인 DQN.'],
    ['trpo', 'TRPO', 2015.2, 'Schulman et al.', 'pg', 'ppo', ['T4'], [['npg', '자연 경사 + KL 신뢰영역 + 직선 탐색', 'reg'], ['cpi', '혼합 정책 → 평균 KL 제약', 'reg']], 'KL 제약 하에서 대리 목적을 최대화. 큰 신경망 정책의 안정적 개선.'],
    ['gae', 'GAE', 2015.5, 'Schulman et al.', 'pg', 'ac', ['T6'], [['td', 'λ-리턴을 advantage 추정에', 'est'], ['ac83', 'critic의 TD 오차들의 지수 가중합', 'est']], 'δ_t의 (γλ)^l 가중합으로 편향-분산을 연속적으로 조절.'],
    ['ddpg', 'DDPG', 2015.7, 'Lillicrap et al.', 'maxent', 'maxent', ['T8'], [['dpg', '심층 신경망 actor-critic', 'rep'], ['dqn', 'replay와 target net을 연속 행동에', 'data']], '연속 제어용 off-policy actor-critic.'],
    ['per', 'Prioritized Replay', 2015.8, 'Schaul et al.', 'value', 'dqn', ['T6'], [['dqn', '균등 샘플링 → |TD 오차| 비례 샘플링', 'data']], '배울 게 많은 전이를 더 자주 재생하고 중요도 가중치로 보정.'],
    ['dueling', 'Dueling DQN', 2015.9, 'Wang et al.', 'value', 'dqn', ['T2'], [['dqn', 'Q = V + (A − mean A)로 분해', 'rep']], '행동과 무관한 상태 가치를 따로 학습해 행동 간격이 작은 상태에서 안정.'],
    ['a3c', 'A3C', 2016.1, 'Mnih et al.', 'pg', 'ac', ['T3', 'T6'], [['ac83', '비동기 병렬 actor, n-step advantage, 엔트로피 보너스', 'data']], '리플레이 대신 병렬 환경으로 상관을 깬 on-policy actor-critic.'],
    ['alphago', 'AlphaGo', 2016.2, 'Silver et al.', 'model', 'modelbased', ['T9', 'T7'], [['uct', '정책망 사전확률과 가치망으로 이끄는 MCTS', 'imp']], '지도학습 + 정책 경사 + MCTS로 바둑 정복.'],
    ['c51', 'C51 · 분포형 RL', 2017.4, 'Bellemare, Dabney & Munos', 'value', 'qviews', ['T1'], [['dqn', '리턴의 기댓값 → 리턴 분포 전체', 'est']], '분포형 벨만 연산자. 범주형 지지점에 투영해 학습.'],
    ['ppo', 'PPO', 2017.5, 'Schulman et al.', 'pg', 'ppo', ['T4', 'T3'], [['trpo', 'KL 제약 → ratio clipping, 1차 최적화만', 'reg'], ['gae', 'GAE advantage + 여러 epoch 재사용', 'est']], '단순하고 견고한 신뢰영역 근사. RLHF의 표준 최적화기.'],
    ['prefrl', 'RL from Human Preferences', 2017.45, 'Christiano et al.', 'align', 'rlhf', ['T3'], [['a3c', '환경 보상 → 사람의 쌍대 비교로 학습한 보상', 'prob']], '궤적 쌍 비교로 보상 모델을 학습해 RL. RLHF의 출발점.'],
    ['softq', 'Soft Q-learning', 2017.2, 'Haarnoja et al.', 'maxent', 'qviews', ['T5'], [['qlearning', 'max → log-sum-exp (엔트로피 정규화)', 'reg']], '최대 엔트로피 RL. 최적 정책이 exp(Q/α)에 비례하는 볼츠만 분포.'],
    ['exit', 'Expert Iteration', 2017.4, 'Anthony, Tian & Barber', 'model', 'memory', ['T9'], [['uct', '탐색 = 전문가, 신경망 = 견습생, 반복 증류', 'imp']], '탐색으로 개선하고 신경망에 모방시켜 다음 탐색을 강화.'],
    ['alphazero', 'AlphaGo Zero · AlphaZero', 2017.8, 'Silver et al.', 'model', 'modelbased', ['T9', 'T2'], [['alphago', '인간 기보 제거, MCTS 방문 분포를 정책 타깃으로', 'imp']], '자기 대국만으로 학습. 탐색이 정책 개선 연산자, 신경망이 그것의 상각.'],
    ['qrdqn', 'QR-DQN', 2017.9, 'Dabney et al.', 'value', 'qviews', ['T1'], [['c51', '고정 지지점 → 분위수 회귀', 'est']], 'Wasserstein 축약을 직접 활용하는 분위수 기반 분포형 RL.'],
    ['rainbow', 'Rainbow', 2017.95, 'Hessel et al.', 'value', 'dqn', ['T8', 'T6'], [['ddqn', '결합', 'rep'], ['dueling', '결합', 'rep'], ['per', '결합', 'data'], ['c51', '결합', 'est']], 'Double, Dueling, PER, n-step, 분포형, Noisy Net의 결합.'],
    ['sac', 'SAC', 2018.05, 'Haarnoja et al.', 'maxent', 'maxent', ['T5', 'T8'], [['softq', 'actor-critic화 + 재매개화 + 자동 온도', 'rep']], '엔트로피 정규화 off-policy actor-critic. 연속 제어의 기본값.'],
    ['td3', 'TD3', 2018.1, 'Fujimoto, van Hoof & Meger', 'maxent', 'maxent', ['T8'], [['ddpg', 'clipped double Q, 지연 정책 갱신, 타깃 평활화', 'est']], 'DDPG의 과대추정과 분산 문제를 세 가지 수정으로 해결.'],
    ['impala', 'IMPALA · V-trace', 2018.15, 'Espeholt et al.', 'pg', 'ac', ['T6'], [['a3c', 'actor-learner 분리 + 절단 중요도 가중 보정', 'data']], '대규모 분산 학습에서 정책 지연을 V-trace로 보정.'],
    ['worldmodels', 'World Models', 2018.2, 'Ha & Schmidhuber', 'model', 'modelbased', ['T2'], [['dyna', '잠재 공간 생성 모델 안에서 정책 학습', 'rep']], 'VAE+RNN으로 환경을 압축하고 그 꿈 안에서 제어기를 학습.'],
    ['bcq', 'BCQ', 2018.9, 'Fujimoto, Meger & Precup', 'offline', 'offline', ['T7', 'T8'], [['ddpg', '행동을 데이터 근방으로 제한', 'reg']], '외삽 오차를 막기 위해 생성 모델이 만든 데이터 근방 행동만 평가.'],
    ['muzero', 'MuZero', 2019.85, 'Schrittwieser et al.', 'model', 'modelbased', ['T9', 'T1'], [['alphazero', '규칙 → 가치 등가로 학습한 잠재 모델', 'rep']], '보상·가치·정책 예측에 필요한 것만 담은 모델로 계획.'],
    ['mbpo', 'MBPO', 2019.45, 'Janner et al.', 'model', 'modelbased', ['T2'], [['dyna', '앙상블 모델의 짧은 분기 롤아웃', 'data'], ['sac', '가상 데이터로 SAC 학습', 'imp']], '모델 오차 누적을 피하려고 짧은 롤아웃만 사용.'],
    ['awr', 'AWR', 2019.8, 'Peng et al.', 'offline', 'offline', ['T5'], [['reps', 'KL 제약 닫힌 해를 가중 회귀로 투영', 'imp']], 'exp(A/β) 가중 지도학습으로 정책 개선. 오프라인에 자연스럽다.'],
    ['udrl', 'Upside-down RL', 2019.95, 'Schmidhuber; Srivastava et al.', 'offline', 'sequence', ['T9'], [['reinforce', '보상 최대화 → 원하는 리턴을 명령으로 주는 지도학습', 'prob']], '행동을 "원하는 리턴과 기간"에 조건화해 예측.'],
    ['dreamer', 'Dreamer', 2019.96, 'Hafner et al.', 'model', 'modelbased', ['T6'], [['worldmodels', '잠재 상상 궤적에서 actor-critic', 'imp']], '학습된 잠재 동역학 안에서 가치 경사를 역전파.'],
    ['cql', 'CQL', 2020.4, 'Kumar et al.', 'offline', 'offline', ['T7'], [['sac', 'OOD 행동의 Q를 누르는 보수적 정규화', 'reg'], ['fqi', '고정 데이터 위의 가치 학습', 'data']], 'Q의 하한을 학습해 분포 밖 행동의 과대평가를 막는다.'],
    ['summ', 'Learning to Summarize from HF', 2020.7, 'Stiennon et al.', 'align', 'rlhf', ['T5', 'T4'], [['prefrl', '언어 모델에 보상모델 + PPO + KL 페널티', 'rep'], ['ppo', 'PPO로 정책 최적화', 'imp']], '요약 과제에서 사람 선호 RL이 지도학습을 능가.'],
    ['bon', 'Best-of-N', 2020.75, 'Stiennon et al.; Nakano et al. 2021', 'infer', 'test-time', ['T5', 'T7'], [['summ', 'RL 없이 보상모델로 N개 중 최선 선택', 'imp']], '가장 단순한 추론 시점 최적화. KL 비용은 대략 log N.'],
    ['dt', 'Decision Transformer', 2021.4, 'Chen et al.', 'offline', 'sequence', ['T9'], [['udrl', '리턴 조건 시퀀스 모델을 트랜스포머로', 'rep']], '목표 리턴, 상태, 행동 토큰을 이어 붙여 다음 행동을 예측.'],
    ['tt', 'Trajectory Transformer', 2021.45, 'Janner, Li & Levine', 'offline', 'sequence', ['T9'], [['worldmodels', '궤적 전체를 시퀀스 모델링 + 빔 탐색', 'rep']], '상태·행동·보상을 이산 토큰으로 모델링하고 빔 탐색으로 계획.'],
    ['iql', 'IQL', 2021.8, 'Kostrikov, Nair & Levine', 'offline', 'offline', ['T7', 'T5'], [['awr', '정책 추출은 AWR', 'imp'], ['cql', 'OOD 질의 없이 expectile로 데이터 내 max', 'est']], '데이터에 있는 행동만으로 가치를 학습해 외삽을 원천 차단.'],
    ['instructgpt', 'InstructGPT', 2022.2, 'Ouyang et al.', 'align', 'rlhf', ['T5', 'T4'], [['summ', 'SFT → RM → PPO를 범용 지시 따르기로', 'data']], 'RLHF 파이프라인을 범용 어시스턴트로 확장.'],
    ['selfcons', 'Self-Consistency', 2022.2, 'Wang et al.', 'infer', 'test-time', ['T7'], [], '여러 추론 경로를 샘플링해 최종 답을 다수결.'],
    ['star', 'STaR', 2022.25, 'Zelikman et al.', 'reason', 'memory', ['T9'], [['exit', '정답에 도달한 추론만 골라 SFT, 반복', 'imp']], '스스로 만든 추론 중 맞은 것을 학습 데이터로 삼는 자기 개선.'],
    ['ad', 'Algorithm Distillation', 2022.8, 'Laskin et al.', 'offline', 'sequence', ['T9'], [['dt', '한 궤적 → 학습 이력 전체를 컨텍스트로', 'data']], '학습 과정 자체를 모방해 컨텍스트 안에서 개선하는 정책.'],
    ['overopt', 'RM 과최적화 스케일링', 2022.8, 'Gao, Schulman & Hilton', 'align', 'rlhf', ['T5'], [['instructgpt', '프록시 보상 vs 골드 보상을 KL 거리로 측정', 'prob']], '프록시를 최적화할수록 실제 보상은 올랐다 내려간다. 함수형을 경험적으로 맞춤.'],
    ['cai', 'Constitutional AI · RLAIF', 2022.95, 'Bai et al.', 'align', 'rlhf', ['T5'], [['instructgpt', '사람 라벨 → 원칙 기반 AI 피드백', 'data']], '헌법(원칙)에 따른 AI 자기비평과 AI 선호로 무해성 학습.'],
    ['reflexion', 'Reflexion', 2023.2, 'Shinn et al.', 'infer', 'memory', ['T9'], [], '실패를 언어로 반성해 메모리에 쌓고 다음 시도의 컨텍스트로 사용.'],
    ['dpo', 'DPO', 2023.4, 'Rafailov et al.', 'align', 'dpo', ['T5'], [['instructgpt', 'KL 닫힌 해로 보상을 정책으로 재매개화 → RM·RL 제거', 'imp']], '선호 데이터에 대한 분류 손실 하나로 RLHF와 같은 최적해를 겨냥.'],
    ['tot', 'Tree of Thoughts', 2023.38, 'Yao et al.', 'infer', 'test-time', ['T7', 'T9'], [['uct', '토큰이 아닌 생각 단위로 트리 탐색', 'imp']], 'LLM이 생각을 제안하고 스스로 평가하며 BFS/DFS로 탐색.'],
    ['rap', 'RAP', 2023.39, 'Hao et al.', 'infer', 'test-time', ['T9', 'T7'], [['alphazero', 'LLM을 세계 모델 겸 정책으로 MCTS', 'imp']], '추론을 계획 문제로 보고 MCTS로 탐색.'],
    ['voyager', 'Voyager', 2023.4, 'Wang et al.', 'infer', 'memory', ['T9'], [['reflexion', '성공한 행동을 실행 가능한 코드 기술로 축적', 'rep']], '기술 라이브러리를 키우는 평생 학습 에이전트.'],
    ['prm', 'PRM (Let\'s Verify)', 2023.41, 'Lightman et al.', 'reason', 'reasoning', ['T6'], [['instructgpt', '결과 보상 → 단계별 과정 보상', 'est']], '풀이 단계마다 사람이 라벨링한 과정 보상모델이 결과 보상모델보다 나은 검증기.'],
    ['rest', 'ReST · ReST-EM', 2023.6, 'Gulcehre et al.; Singh et al.', 'reason', 'memory', ['T9', 'T5'], [['star', 'EM 관점: 샘플·필터(E) → SFT(M) 반복', 'imp']], '보상으로 걸러낸 자기 샘플에 대한 지도학습을 반복하는 오프라인 개선.'],
    ['ipo', 'IPO', 2023.8, 'Azar et al.', 'align', 'dpo', ['T5'], [['dpo', 'BT 로짓 → 제곱 손실, 결정적 선호에서의 과적합 방지', 'reg']], '선호 확률을 직접 회귀하는 일반화된 선호 최적화.'],
    ['cd', 'Controlled Decoding', 2023.82, 'Mudgal et al.', 'infer', 'test-time', ['T5', 'T1'], [['bon', '응답 단위 선택 → 접두사 가치로 토큰/블록 단위 유도', 'est']], '보상의 접두사 가치 함수를 학습해 디코딩을 KL-정규화 최적 쪽으로 기울인다.'],
    ['grpo', 'GRPO', 2024.1, 'Shao et al. (DeepSeekMath)', 'reason', 'reasoning', ['T3', 'T6', 'T4'], [['ppo', 'critic 제거, 그룹 평균·표준편차로 advantage', 'est']], '같은 프롬프트의 G개 샘플을 서로의 baseline으로 쓰는 PPO 변형.'],
    ['kto', 'KTO', 2024.1, 'Ethayarajh et al.', 'align', 'dpo', ['T5'], [['dpo', '쌍 비교 → 단독 좋음/나쁨 신호, 전망 이론 가치함수', 'data']], '쌍 데이터 없이 이진 피드백으로 정렬.'],
    ['rloo', 'RLOO', 2024.15, 'Ahmadian et al.', 'reason', 'reasoning', ['T3', 'T6'], [['reinforce', 'k개 샘플의 leave-one-out baseline', 'est']], 'LLM 정렬에서는 PPO 대신 REINFORCE + 좋은 baseline이면 충분하다는 주장.'],
    ['orpo', 'ORPO', 2024.2, 'Hong, Lee & Thorne', 'align', 'dpo', ['T5'], [['dpo', '참조 모델 제거, SFT 손실 + odds ratio 항', 'reg']], 'SFT와 선호 최적화를 한 단계로.'],
    ['rtoq', 'From r to Q*', 2024.3, 'Rafailov et al.', 'align', 'qviews', ['T5', 'T1'], [['dpo', 'DPO를 토큰 단위 soft-Q 학습으로 해석', 'rep'], ['softq', 'logit = soft Q (상태 의존 이동까지)', 'rep']], '언어 모델의 로짓을 토큰 MDP의 최적 soft Q 함수로 볼 수 있음을 보임.'],
    ['simpo', 'SimPO', 2024.4, 'Meng, Xia & Chen', 'align', 'dpo', ['T5'], [['dpo', '길이 정규화 평균 로그확률을 보상으로, 참조 제거, 마진 추가', 'est']], '생성 시의 길이 정규화 우도와 학습 보상을 일치시킨 단순화.'],
    ['qstar', 'Q* (가치 유도 탐색)', 2024.45, 'Wang et al.', 'infer', 'test-time', ['T1', 'T9'], [['cd', '학습된 Q 휴리스틱으로 추론 단계에 A* 탐색', 'imp']], '다단계 추론을 결정 과정으로 보고 Q 값을 휴리스틱으로 사용.'],
    ['ttc', 'Test-time Compute 스케일링', 2024.6, 'Snell et al.', 'infer', 'test-time', ['T7', 'T9'], [['prm', '검증기 유도 탐색', 'imp'], ['bon', '병렬 샘플링과 순차 수정의 배분', 'data']], '난이도에 따라 추론 시 연산 배분을 바꾸면 같은 연산으로 더 높은 정확도.'],
    ['o1', 'OpenAI o1', 2024.7, 'OpenAI', 'reason', 'test-time', ['T9'], [], '공개 설명 기준: 대규모 RL로 긴 사고 사슬을 학습하며, 학습·추론 연산 모두에 따라 성능이 오른다.'],
    ['r1', 'DeepSeek-R1', 2025.05, 'DeepSeek-AI', 'reason', 'reasoning', ['T9', 'T3'], [['grpo', '검증 가능한 보상만으로 대규모 RL → 긴 CoT 창발, 소형 모델로 증류', 'data']], 'R1-Zero는 SFT 없이 RL만으로 추론 행동이 나타남을 보였고, R1은 콜드 스타트와 증류를 더했다.'],
    ['dapo', 'DAPO', 2025.2, 'Yu et al.', 'reason', 'reasoning', ['T6', 'T4'], [['grpo', 'clip-higher, 동적 샘플링, 토큰 단위 손실, 과길이 처리', 'reg']], '대규모 장문 추론 RL을 위한 GRPO 수정 묶음.'],
    ['drgrpo', 'Dr. GRPO', 2025.22, 'Liu et al.', 'reason', 'reasoning', ['T6'], [['grpo', '길이 정규화와 표준편차 정규화의 편향 제거', 'est']], 'GRPO의 정규화가 오답을 길게 만드는 편향을 지적하고 제거.'],
  ];

  RL.families = FAM;
  RL.knobs = KNOB;
  RL.algos = A.map((r) => ({ id: r[0], name: r[1], year: r[2], by: r[3], fam: r[4], ch: r[5], th: r[6], from: r[7].map((f) => ({ id: f[0], what: f[1], knob: f[2] })), note: r[8] }));
  RL.algoById = {};
  RL.algos.forEach((a) => (RL.algoById[a.id] = a));

  RL.chapter({
    id: 'lineage',
    title: '알고리즘 계보도와 타임라인',
    subtitle: '1933년 Thompson 샘플링부터 2025년 추론 RL까지, 약 80개 알고리즘이 어느 부모에서 어떤 손잡이를 돌려 나왔는지를 한 장에 그린다.',
    time: 20,
    level: '지도',
    theses: ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9'],
    goals: [
      '알고리즘 사이의 파생 관계를 "무엇을 바꿨나(표현, 추정량, 정규화, 데이터, 개선 연산자, 문제 정의)"로 분류할 수 있다.',
      '특정 대전제(T1~T9)에 기대는 알고리즘 계열을 한눈에 찾을 수 있다.',
      '고전 RL에서 LLM RL로 이어지는 네 개의 큰 흐름을 설명할 수 있다.',
    ],
    html: String.raw`
<p>노드를 누르면 그 알고리즘의 요약, 부모에서 무엇이 바뀌었는지, 기대는 대전제, 해당 장 링크가 나온다. 선택한 노드의 조상과 후손 경로는 강조된다. 위쪽 칩으로 대전제별 필터를, 아래쪽 칩으로 "무엇을 바꿨나" 축별 필터를 걸 수 있다. 가로 축은 연도이며, 1985년 이전과 2012년 이후는 눈금 간격이 다르다.</p>
<div data-w="graph"></div>

<h2>변형은 여섯 가지 손잡이에서 나온다</h2>
<p>계보도의 화살표를 모아 보면 새 알고리즘이 나오는 방식은 대체로 여섯 가지다. 새 논문을 읽을 때 "이 논문은 어느 손잡이를 돌렸나"를 먼저 물으면 구조가 빨리 보인다.</p>
<div class="table-wrap"><table class="t">
<thead><tr><th>손잡이</th><th>바뀌는 것</th><th>대표 사례</th></tr></thead>
<tbody>
<tr><td><span class="col-c1">표현 · 근사</span></td><td>가치나 정책을 무엇으로 나타내나</td><td>Q-learning → DQN(신경망), Dueling(V+A 분해), MuZero(잠재 모델), From r to Q*(로짓 = Q)</td></tr>
<tr><td><span class="col-c2">추정량</span></td><td>타깃 · advantage를 어떻게 추정하나</td><td>TD → GAE, Q-learning → Double Q, PPO → GRPO(그룹 baseline), C51(분포)</td></tr>
<tr><td><span class="col-c3">정규화 · 제약</span></td><td>얼마나, 무엇으로부터 멀어질 수 있나</td><td>NPG → TRPO(KL) → PPO(clip), Q-learning → Soft Q(엔트로피), SAC → CQL(비관), DPO → IPO</td></tr>
<tr><td><span class="col-c4">데이터 체제</span></td><td>데이터를 누가, 언제 모았나</td><td>Q-learning → FQI(배치), DQN → PER, A3C(병렬), InstructGPT → CAI(AI 피드백), GRPO → R1(검증 보상)</td></tr>
<tr><td><span class="col-c5">개선 연산자 · 탐색</span></td><td>더 나은 행동을 어떻게 찾나</td><td>정책 반복, UCT → AlphaZero(탐색 후 증류), STaR → ReST, BoN → Controlled decoding → Q*</td></tr>
<tr><td><span class="col-c6">문제 재정의</span></td><td>최적화 대상 자체</td><td>MDP → POMDP, 환경 보상 → 선호 보상(RLHF), RL → 리턴 조건 지도학습(UDRL, DT)</td></tr>
</tbody></table></div>

<h2>고전에서 LLM까지 네 개의 흐름</h2>
<div class="grid2">
  <div class="card"><h4><span class="col-c1">가치의 흐름</span> · T1, T8</h4><p>벨만(1957) → TD(1988) → Q-learning(1989) → FQI → DQN(2013) → Double/Dueling/PER/C51 → Rainbow(2017) → MuZero(2019) → From r to Q*(2024), Q* 탐색. 고정점을 샘플·신경망으로 풀면서 생기는 불안정성과의 싸움.</p></div>
  <div class="card"><h4><span class="col-c2">정책의 흐름</span> · T3, T4, T6</h4><p>REINFORCE(1992) → 정책 경사 정리(2000) → NPG → TRPO(2015) → PPO(2017) → RLHF의 PPO(2020~22) → RLOO/GRPO(2024) → R1, DAPO(2025). 점수함수 경사를 어떻게 덜 흔들리게, 덜 멀리 가게 할 것인가.</p></div>
  <div class="card"><h4><span class="col-c3">정규화의 흐름</span> · T5</h4><p>REPS(2010) → Soft Q(2017) → SAC(2018) → AWR/IQL → KL-정규화 RLHF → DPO(2023)와 그 변형들 → Best-of-N, Controlled decoding. 같은 닫힌 해 $\pi_0 e^{r/\beta}/Z$를 학습 시점에 쓰느냐 추론 시점에 쓰느냐의 차이.</p></div>
  <div class="card"><h4><span class="col-c5">상각의 흐름</span> · T9</h4><p>UCT(2006) → AlphaGo(2016) → ExIt, AlphaZero(2017) → STaR(2022) → ReST-EM(2023) → o1, R1의 장문 추론과 증류(2024~25). 비싼 탐색·검증으로 찾은 개선을 정책에 새겨 다음엔 싸게 꺼내 쓴다.</p></div>
</div>

<h2>연표</h2>
<p>계열을 골라 연표를 좁힐 수 있다. 각 행의 "핵심 변화"는 첫 번째 부모로부터의 변화다.</p>
<div data-w="timeline"></div>
`,
    mount: { graph: mountGraph, timeline: mountTimeline },
    tacit: [
      { tag: 'research', t: '논문 하나는 대개 손잡이 하나다',
        d: '<p>계보도의 거의 모든 화살표는 손잡이 한두 개만 바꾼다. 성공한 논문이 여러 개를 한꺼번에 바꾼 것처럼 보이면, 대개는 핵심 한 개와 그것을 작동시키기 위한 공학적 수정 몇 개다(예: DQN의 핵심은 replay와 target net, 나머지는 Atari 전처리). 새 논문을 읽을 때 "부모가 누구고 어느 손잡이를 돌렸나"를 한 문장으로 쓸 수 없으면 아직 이해하지 못한 것이다.</p>' },
      { tag: 'research', t: '같은 해의 동시 발견이 많다는 것은 아이디어가 "익었다"는 뜻',
        d: '<p>AlphaGo Zero와 ExIt(2017), Trajectory Transformer와 Decision Transformer(2021), Tree of Thoughts와 RAP(2023)처럼 거의 같은 아이디어가 몇 주 간격으로 나오는 경우가 반복된다. 선행 조건(계산 자원, 모델 규모, 앞선 결과)이 갖춰지면 다음 단계는 여러 그룹에게 동시에 보인다. 지금 계보도의 끝에서 "다음 화살표"를 예측하는 연습은 꽤 잘 맞는다.</p>' },
      { tag: 'math', t: '정규화의 흐름은 사실 하나의 식이다',
        d: '<p>REPS, Soft Q, SAC, AWR, RLHF, DPO, Best-of-N은 모두 $\\max_\\pi \\E_\\pi[r] - \\beta\\KL(\\pi\\|\\pi_0)$의 해 $\\pi_0 e^{r/\\beta}/Z$를 서로 다른 방식으로 다룬다. 샘플 기반 가중치로 회귀하면 AWR, 정책 경사로 근사하면 PPO-RLHF, $Z$를 쌍 비교로 소거하면 DPO, 샘플링 후 거절로 근사하면 BoN이다. 계보도에서 멀리 떨어진 노드들이 같은 T5 칩을 달고 있는 이유다.</p>' },
      { tag: 'research', t: 'LLM RL의 "새로움"은 대부분 데이터와 규모다',
        d: '<p>GRPO는 REINFORCE with baseline에 PPO 클립을 붙인 것이고, STaR는 ExIt의 언어판이며, DPO의 최적해는 1990~2010년대 KL-정규화 RL의 결과다. LLM 시대의 진짜 변화는 (1) 사전학습된 정책이라는 강력한 사전분포, (2) 검증 가능한 보상이라는 깨끗한 신호, (3) 규모다. 고전 알고리즘의 실패 모드(분산, 과대추정, 보상 해킹, 엔트로피 붕괴)도 그대로 따라온다.</p>' },
    ],
    quiz: [
      { q: 'PPO에서 GRPO로 갈 때 바뀐 손잡이는?', options: ['표현', '추정량 (critic → 그룹 상대 baseline)', '문제 재정의', '데이터 체제 (온라인 → 오프라인)'], answer: 1,
        explain: 'GRPO는 가치망(critic)을 없애고 같은 프롬프트의 다른 샘플들의 평균·표준편차로 advantage를 추정한다. 최적화 틀(클립, KL)은 그대로다.' },
      { q: 'AlphaZero, STaR, ReST-EM이 공유하는 대전제는?', options: ['T1 벨만 고정점', 'T7 낙관과 비관', 'T9 탐색 후 증류', 'T8 Deadly Triad'], answer: 2,
        explain: '세 방법 모두 비싼 개선 연산(MCTS, 정답 필터링)으로 더 나은 출력 분포를 만들고, 그것을 정책에 지도학습으로 증류해 반복한다.' },
      { q: 'DPO를 "개선 연산자" 손잡이로 분류하는 이유로 가장 적절한 것은?', options: ['신경망 구조를 바꿨기 때문', 'RM 학습 + RL 최적화라는 두 단계를 닫힌 해를 이용한 하나의 분류 손실로 바꿨기 때문', '데이터를 온라인으로 수집하기 때문', 'POMDP로 문제를 재정의했기 때문'], answer: 1,
        explain: '최적화 목표(KL-정규화 보상 최대화)는 RLHF와 같고, 그 해를 구하는 방법이 바뀌었다.' },
    ],
  });

  /* ---------- 계보도 ---------- */
  function yearToX(y) {
    const pts = [[1930, 0], [1985, 0.07], [2000, 0.17], [2012, 0.28], [2016, 0.47], [2019, 0.62], [2022, 0.77], [2025.4, 1]];
    for (let i = 1; i < pts.length; i++) {
      if (y <= pts[i][0]) {
        const [y0, x0] = pts[i - 1], [y1, x1] = pts[i];
        return x0 + ((y - y0) / (y1 - y0)) * (x1 - x0);
      }
    }
    return 1;
  }

  function mountGraph(el) {
    const S = RL.plot.svg;
    const p = ui.panel(el, { kind: 'MAP', title: '알고리즘 계보도' });
    const thRow = document.createElement('div');
    thRow.className = 'filter-row';
    const knRow = document.createElement('div');
    knRow.className = 'filter-row';
    const frame = document.createElement('div');
    frame.style.cssText = 'display:flex;border:1px solid var(--line);border-radius:8px;background:var(--surface);overflow:hidden';
    const labelCol = document.createElement('div');
    labelCol.style.cssText = 'flex:0 0 auto;border-right:1px solid var(--line)';
    const scroller = document.createElement('div');
    scroller.style.cssText = 'flex:1;min-width:0;overflow-x:auto';
    frame.append(labelCol, scroller);
    const detail = document.createElement('div');
    detail.className = 'fx-detail';
    p.body.append(thRow, knRow, frame, detail);

    let thFilter = null, knFilter = null, sel = 'ppo';
    const thBtns = [ui.button(thRow, '전체', () => { thFilter = null; draw(); })];
    RL.theses.forEach((t) => {
      const b = ui.button(thRow, t.id + ' ' + t.short, () => { thFilter = thFilter === t.id ? null : t.id; draw(); });
      b.dataset.t = t.id;
      thBtns.push(b);
    });
    const knBtns = [];
    Object.keys(KNOB).forEach((k) => {
      const b = ui.button(knRow, '<span class="col-' + KNOB[k].color + '">━</span> ' + KNOB[k].label, () => { knFilter = knFilter === k ? null : k; draw(); });
      b.dataset.k = k;
      knBtns.push(b);
    });

    // 레이아웃
    const W = 1360, padL = 40, padR = 30, laneGap = 8, rowH = 26, top = 34;
    const LW = window.innerWidth < 600 ? 92 : 128;
    const xOf = (y) => padL + yearToX(y) * (W - padL - padR);
    const nodes = {};
    const lanes = FAM.map((f) => ({ fam: f, rows: [] }));
    const laneOf = {};
    FAM.forEach((f, i) => (laneOf[f.id] = i));
    const sorted = RL.algos.slice().sort((a, b) => a.year - b.year);
    sorted.forEach((a) => {
      const w = Math.max(64, a.name.length * 7.2 + 18);
      const x = xOf(a.year);
      const L = lanes[laneOf[a.fam]];
      let r = 0;
      while (L.rows[r] != null && L.rows[r] > x - w / 2 - 6) r++;
      L.rows[r] = x + w / 2;
      nodes[a.id] = { a, x, w, row: r, lane: laneOf[a.fam] };
    });
    let y = top;
    lanes.forEach((L) => {
      L.y0 = y;
      L.h = Math.max(1, L.rows.length) * rowH + 14;
      y += L.h + laneGap;
    });
    const H = y + 10;
    Object.values(nodes).forEach((n) => { n.y = lanes[n.lane].y0 + 8 + n.row * rowH + rowH / 2; });

    const children = {};
    RL.algos.forEach((a) => a.from.forEach((f) => { (children[f.id] = children[f.id] || []).push(a.id); }));
    function closure(id, dir) {
      const out = new Set();
      const stack = [id];
      while (stack.length) {
        const c = stack.pop();
        const next = dir === 'up' ? RL.algoById[c].from.map((f) => f.id) : (children[c] || []);
        next.forEach((n) => { if (!out.has(n) && RL.algoById[n]) { out.add(n); stack.push(n); } });
      }
      return out;
    }

    const svg = S('svg', { viewBox: '0 0 ' + W + ' ' + H, width: W, height: H, role: 'img', 'aria-label': '알고리즘 계보도' });
    svg.style.cssText = 'display:block;max-width:none;font-family:var(--font-body)';
    scroller.appendChild(svg);
    // 가로 스크롤해도 보이는 계열 이름 열
    const lsvg = S('svg', { viewBox: '0 0 ' + LW + ' ' + H, width: LW, height: H, 'aria-hidden': 'true' });
    lsvg.style.cssText = 'display:block;max-width:none';
    lanes.forEach((L, i) => {
      lsvg.appendChild(S('rect', { x: 0, y: L.y0, width: LW, height: L.h, style: 'fill:' + (i % 2 ? 'var(--surface)' : 'var(--surface-2)') }));
      const words = L.fam.label.split(' · ');
      words.forEach((w, j) => {
        const t = S('text', { x: 10, y: L.y0 + 18 + j * 15, style: 'fill:var(--' + L.fam.color + ');font-size:' + (LW < 100 ? 11 : 12) + 'px;font-weight:600' });
        t.textContent = w + (j < words.length - 1 ? ' ·' : '');
        lsvg.appendChild(t);
      });
    });
    labelCol.appendChild(lsvg);

    function draw() {
      thBtns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.t ? b.dataset.t === thFilter : thFilter === null)));
      knBtns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.k === knFilter)));
      svg.innerHTML = '';
      const anc = sel ? closure(sel, 'up') : new Set();
      const des = sel ? closure(sel, 'down') : new Set();
      const onPath = (id) => id === sel || anc.has(id) || des.has(id);
      // 연도 눈금
      [1933, 1960, 1985, 1990, 2000, 2010, 2013, 2015, 2017, 2019, 2021, 2023, 2025].forEach((yr) => {
        const x = xOf(yr);
        svg.appendChild(S('line', { x1: x, x2: x, y1: top - 6, y2: H - 6, style: 'stroke:var(--line);stroke-dasharray:2 4' }));
        const t = S('text', { x, y: 18, 'text-anchor': 'middle', style: 'fill:var(--muted);font-size:11px;font-family:var(--font-mono)' });
        t.textContent = yr;
        svg.appendChild(t);
      });
      // 레인
      lanes.forEach((L, i) => {
        svg.appendChild(S('rect', { x: 0, y: L.y0, width: W, height: L.h, style: 'fill:' + (i % 2 ? 'var(--surface)' : 'var(--surface-2)') + ';opacity:0.7' }));
      });
      // 간선
      RL.algos.forEach((a) => a.from.forEach((f) => {
        const s = nodes[f.id], t = nodes[a.id];
        if (!s || !t) return;
        const x1 = s.x + s.w / 2, y1 = s.y, x2 = t.x - t.w / 2, y2 = t.y;
        const mx = Math.max(24, Math.abs(x2 - x1) / 2);
        const up = (a.id === sel || anc.has(a.id)) && anc.has(f.id);
        const down = (f.id === sel || des.has(f.id)) && des.has(a.id);
        const hot = !!sel && (up || down);
        let op = sel ? (hot ? 0.95 : 0.12) : 0.4;
        if (knFilter) op = f.knob === knFilter ? 0.95 : 0.06;
        const col = knFilter || hot ? 'var(--' + KNOB[f.knob].color + ')' : 'var(--muted)';
        svg.appendChild(S('path', { d: 'M' + x1 + ' ' + y1 + ' C ' + (x1 + mx) + ' ' + y1 + ', ' + (x2 - mx) + ' ' + y2 + ', ' + x2 + ' ' + y2, style: 'fill:none;stroke:' + col + ';stroke-width:' + (hot || knFilter ? 2 : 1.2) + ';opacity:' + op }));
      }));
      // 노드
      Object.values(nodes).forEach((n) => {
        const a = n.a;
        const fam = FAM[n.lane];
        let op = 1;
        if (thFilter && !a.th.includes(thFilter)) op = 0.18;
        if (sel && !onPath(a.id) && !thFilter) op = 0.45;
        const g = S('g', { style: 'cursor:pointer;opacity:' + op, tabindex: '0', role: 'button', 'aria-label': a.name + ' ' + Math.floor(a.year) });
        const isSel = a.id === sel;
        g.appendChild(S('rect', { x: n.x - n.w / 2, y: n.y - 10, width: n.w, height: 20, rx: 10, style: 'fill:' + (isSel ? 'var(--' + fam.color + ')' : 'color-mix(in srgb, var(--' + fam.color + ') 14%, var(--surface))') + ';stroke:var(--' + fam.color + ');stroke-width:' + (isSel ? 2 : 1) }));
        const t = S('text', { x: n.x, y: n.y + 4, 'text-anchor': 'middle', style: 'font-size:11.5px;fill:' + (isSel ? 'var(--surface)' : 'var(--ink)') + ';font-weight:' + (isSel ? 700 : 500) });
        t.textContent = a.name;
        g.appendChild(t);
        const pick = () => { sel = sel === a.id ? null : a.id; draw(); showDetail(); };
        g.addEventListener('click', pick);
        g.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } });
        svg.appendChild(g);
      });
    }
    function showDetail() {
      if (!sel) { detail.innerHTML = '노드를 누르면 상세 정보가 여기에 나온다.'; return; }
      const a = RL.algoById[sel];
      const fam = FAM.find((f) => f.id === a.fam);
      const ch = RL.meta[a.ch];
      const th = a.th.map((t) => '<a class="chip t" href="#theses--' + t.toLowerCase() + '">' + t + ' <b>' + RL.thesisById[t].short + '</b></a>').join(' ');
      const par = a.from.length ? a.from.map((f) => '<li><a href="#" data-pick="' + f.id + '">' + RL.algoById[f.id].name + '</a>에서 — ' + f.what + ' <span class="col-' + KNOB[f.knob].color + '" style="font-size:var(--fs-xs)">[' + KNOB[f.knob].label + ']</span></li>').join('') : '<li class="col-muted">이 지도 안에서는 출발점</li>';
      const kids = (children[a.id] || []).map((c) => '<a href="#" data-pick="' + c + '">' + RL.algoById[c].name + '</a>').join(', ');
      detail.innerHTML = '<div style="display:flex;flex-wrap:wrap;gap:8px;align-items:baseline"><strong style="font-size:var(--fs-md)">' + a.name + '</strong><span class="mono">' + Math.floor(a.year) + '</span><span class="col-muted">' + a.by + '</span><span class="chip" style="color:var(--' + fam.color + ')">' + fam.label + '</span></div>' +
        '<p style="margin:6px 0">' + a.note + '</p>' +
        '<div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center">' + th + (ch ? ' <a class="chip" href="#' + a.ch + '">' + ch.no + ' ' + ch.title + ' →</a>' : '') + '</div>' +
        '<p style="margin:8px 0 2px" class="col-muted">부모와 바뀐 점</p><ul style="margin:0;padding-left:1.2em">' + par + '</ul>' +
        (kids ? '<p style="margin:8px 0 0"><span class="col-muted">이어지는 알고리즘:</span> ' + kids + '</p>' : '');
      detail.querySelectorAll('[data-pick]').forEach((x) => x.addEventListener('click', (e) => { e.preventDefault(); sel = x.dataset.pick; draw(); showDetail(); scrollToSel(); }));
    }
    function scrollToSel() {
      const n = nodes[sel];
      if (!n) return;
      if (W > scroller.clientWidth) scroller.scrollLeft = Math.max(0, n.x - scroller.clientWidth / 2);
    }
    draw();
    showDetail();
    requestAnimationFrame(scrollToSel);
  }

  function mountTimeline(el) {
    const p = ui.panel(el, { kind: 'MAP', title: '연표' });
    const row = document.createElement('div');
    row.className = 'filter-row';
    const wrap = document.createElement('div');
    wrap.className = 'table-wrap';
    wrap.style.margin = '0';
    p.body.append(row, wrap);
    let fam = null;
    const btns = [ui.button(row, '전체', () => { fam = null; draw(); })];
    FAM.forEach((f) => { const b = ui.button(row, f.label, () => { fam = fam === f.id ? null : f.id; draw(); }); b.dataset.f = f.id; btns.push(b); });
    function draw() {
      btns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.f ? b.dataset.f === fam : fam === null)));
      const rows = RL.algos.filter((a) => !fam || a.fam === fam).sort((a, b) => a.year - b.year);
      wrap.innerHTML = '<table class="t"><thead><tr><th>연도</th><th>알고리즘</th><th>저자</th><th>핵심 변화</th><th>대전제</th><th>장</th></tr></thead><tbody>' +
        rows.map((a) => {
          const f = a.from[0];
          const famc = FAM.find((x) => x.id === a.fam).color;
          return '<tr><td class="num mono" style="background:none">' + Math.floor(a.year) + '</td><td><strong style="color:var(--' + famc + ')">' + a.name + '</strong></td><td class="col-muted">' + a.by + '</td><td>' + (f ? f.what : a.note) + '</td><td class="mono" style="background:none;white-space:nowrap">' + a.th.join(' ') + '</td><td><a href="#' + a.ch + '">' + (RL.meta[a.ch] ? RL.meta[a.ch].no : '') + '</a></td></tr>';
        }).join('') + '</tbody></table>';
    }
    draw();
  }
})();
