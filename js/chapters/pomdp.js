/* 04 POMDP와 믿음 상태 */
(function () {
  const { ui, sim, plot } = RL;

  RL.chapter({
    id: 'pomdp',
    title: 'POMDP와 믿음 상태',
    subtitle: '상태를 직접 볼 수 없을 때 무엇을 상태로 삼을지 다룬다. 관측의 역사를 확률분포 하나로 요약하는 믿음 상태, 그 위의 가치 함수가 볼록한 이유(정보의 가치), LLM의 컨텍스트를 일종의 믿음으로 볼 수 있는 이유를 차례로 본다.',
    time: 35,
    level: '중급',
    prereq: ['mdp', 'bellman'],
    theses: ['T1', 'T7'],
    easy: {
      hook: '눈을 가리고 있다면, 들은 소리로 "어느 쪽일 것 같은가"를 확률로 들고 다니면 된다.',
      intro: '<p>두 문 중 하나 뒤에 호랑이가 있다. 문 너머는 보이지 않지만 소리는 들을 수 있다. 소리는 100번 중 85번은 호랑이가 있는 쪽에서 들린다. 처음엔 반반이다. "왼쪽에서 소리"를 들으면 왼쪽일 확률이 올라가고, 한 번 더 들으면 더 올라간다.</p><p>이렇게 지금까지 들은 것을 "어느 쪽일 확률"이라는 숫자 하나로 정리한 것을 <strong>믿음</strong>이라 부른다. 믿음만 있으면 들은 소리를 하나하나 기억하지 않아도 된다. 또 믿음이 애매할수록(50%에 가까울수록) 문을 열기 전에 한 번 더 들어 보는 것이 이득이다.</p>',
      analogy: '일기예보와 같다. "내일 비 올 확률 70%"라는 숫자 하나가 지금까지 본 구름, 바람, 기압을 모두 요약한다. 우산을 챙길지는 그 숫자만 보고 정한다. 확률이 50%에 가까워 가장 애매할 때 창밖을 한 번 더 내다보는 일, 즉 정보를 더 얻는 일의 가치가 가장 크다.',
      path: ['소리를 듣고 확률을 어림으로 맞혀 본 뒤, 정확한 계산과 비교한다', '같은 계산을 숫자로 한 단계씩 손으로 해 본다', '호랑이 게임을 하며 언제 더 듣고 언제 문을 열지 정해 본다', 'LLM이 사용자의 속마음을 모르는 상황도 같은 구조임을 본다'],
      recap: [
        '진짜 상황이 안 보이면, 지금까지 본 단서로 "어느 상황일 확률"을 계산해 그 확률을 상황 대신 쓴다.',
        '새 단서가 오면 "원래 확률 × 그 상황이라면 이 단서가 나올 확률"을 계산하고, 전부 더해 1이 되도록 나누면 새 확률이 된다.',
        '확신할수록 점수가 높고 애매할수록 낮다. 그래서 애매할 때는 비용을 조금 내고라도 정보를 모으는 것이 이득이다.',
      ],
    },
    goals: [
      'POMDP 7-튜플과 관측 모델 $O(o\\mid s\',a)$의 역할을 설명할 수 있다.',
      '베이즈 필터로 믿음 갱신식 $b\' = \\tau(b,a,o)$를 유도할 수 있다.',
      '유한 지평 가치 함수가 믿음에 대해 조각별 선형·볼록(PWLC)임을 보이고, 볼록성이 "정보의 가치"를 뜻함을 설명할 수 있다.',
      'Tiger 문제에서 듣기(정보 수집)와 문 열기(활용)의 균형을 직접 체험한다.',
    ],
    html: String.raw`
<p>MDP는 에이전트가 상태 $s_t$를 정확히 본다고 가정했다. 현실의 센서에는 잡음이 있고, 세상의 일부만 보인다. 상대의 의도나 사용자의 속마음 같은 중요한 변수는 아예 보이지 않는다. 이런 문제를 <strong>부분 관측 MDP(POMDP)</strong>라 한다. 관측 $o_t$만으로는 마르코프 성질이 깨지므로, 과거 관측 전체를 고려해야 한다.</p>

<h2>POMDP의 정의</h2>
<div data-w="fx-tuple"></div>
<p>상호작용 루프는 MDP와 같다. 다만 에이전트는 $s_{t+1}$ 대신 관측 $o_{t+1} \sim O(\cdot\mid s_{t+1}, a_t)$를 받는다. 에이전트가 가진 정보는 <strong>역사</strong> $h_t = (o_0, a_0, o_1, a_1, \dots, o_t)$뿐이다. 역사는 시간이 갈수록 길어지므로 그 자체를 상태로 쓰기는 어렵다. 다행히 역사의 정보를 손실 없이 요약하는 고정 크기 통계량이 있다.</p>

<h2>믿음 상태: 역사의 충분통계량</h2>
<p><strong>믿음(belief)</strong> $b_t(s) = \Pr(s_t = s \mid h_t)$는 지금 각 상태에 있을 사후확률이다. Åström(1965)이 보였듯 믿음은 최적 제어를 위한 <em>충분통계량</em>이다. 믿음만 알면 역사를 버려도 최적 행동을 고를 수 있다. 또 믿음은 재귀적으로 갱신된다.</p>
<p>공식에 앞서 직관부터 익힌다. 아래 위젯에서 소리를 하나씩 듣고 "왼쪽일 확률"을 슬라이더로 맞힌 뒤 정확한 계산과 비교한다. 이어서 같은 계산을 손으로 한 단계씩 한다.</p>
<div data-w="try-belief"></div>
<div data-w="step-belief"></div>
<div data-w="dv-belief"></div>
<div class="key"><span class="label">관점 전환</span>믿음을 상태로 보면 POMDP는 <strong>믿음 MDP</strong>라는 (연속 상태) MDP가 된다. 상태 공간은 확률 단체(simplex) $\Delta(\mathcal{S})$이고, 전이는 "관측을 샘플한 뒤 베이즈 갱신"이며, 보상은 $\rho(b,a)=\sum_s b(s)R(s,a)$이다. 따라서 벨만 방정식, 축약 사상(T1), 가치 반복이 모두 그대로 성립한다. 어려움은 상태 공간이 연속이라는 점 하나다.</div>
<div data-w="fx-bellman"></div>

<h2>가치 함수는 조각별 선형이고 볼록이다</h2>
<p>믿음 공간이 연속이라 가치 반복이 불가능해 보이지만, 유한 지평 가치 함수에는 특별한 구조가 있다. 유한 개의 <strong>알파 벡터</strong> $\alpha \in \Gamma_t$로 $V_t(b) = \max_{\alpha \in \Gamma_t} \alpha\cdot b$처럼 쓸 수 있다(Smallwood & Sondik 1973). 각 알파 벡터는 "지평 $t$짜리 조건부 계획 하나"의 상태별 가치이고, 가치 함수는 그 계획들의 상한 포락선이다.</p>
<div data-w="dv-pwlc"></div>
<div class="thesis-box"><span class="label">볼록성 = 정보의 가치</span>
<p>$V$가 볼록이면 젠센 부등식으로 $\sum_o \Pr(o)\,V(b^{o}) \ge V\big(\sum_o \Pr(o)\, b^{o}\big) = V(b)$가 성립한다. 관측으로 믿음이 여러 사후로 "쪼개지면", 그 평균 가치는 쪼개지기 전보다 작지 않다. 즉 <strong>공짜 정보는 해가 되지 않는다</strong>. 단체의 꼭짓점(확신)에서 가치가 가장 높고 가운데(불확실)에서 낮다. 정보 수집 행동은 비용을 내고 믿음을 꼭짓점 쪽으로 미는 행동이다. 이 성질은 밴딧의 탐험(<a href="#bandit">05장</a>)과 대전제 T7(불확실성 앞의 낙관과 비관)의 바탕이 된다.</p>
</div>

<h2>Tiger 문제</h2>
<p>Kaelbling, Littman & Cassandra(1998)의 고전 예제다. 두 문 중 하나 뒤에 호랑이가 있다. 호랑이 문을 열면 −100, 반대 문을 열면 +10을 받고 문제는 초기화된다(호랑이 위치 재추첨). <em>듣기</em>는 −1의 비용이 들고, 정확도 $q$로 호랑이가 있는 쪽 소리를 들려준다. 믿음은 $b = \Pr(\text{호랑이가 왼쪽})$ 하나의 숫자다.</p>
<div data-w="try-open"></div>
<div data-w="tiger-play"></div>
<p>아래 그래프는 같은 문제의 <strong>정확한</strong> 유한 지평 가치 함수다. 알파 벡터를 모두 열거해 백업하고, 어떤 믿음에서도 최대가 되지 않는 벡터는 가지치기했다. 얇은 선 하나하나가 알파 벡터(조건부 계획)이고, 색은 그 계획의 첫 행동이다. 굵은 선이 $V_t(b)$이고, 체크박스를 켜면 QMDP 근사(점선)가 겹쳐진다. 상태가 둘뿐이라 가지치기하고 나면 벡터 수가 지평에 거의 비례해서만 늘어난다.</p>
<div data-w="tiger-alpha"></div>
<ul>
  <li><strong>가운데에서는 듣기, 양 끝에서는 열기:</strong> 지평 1에서는 $b\in(0.1, 0.9)$에서 듣는다. 지평이 길어지면 듣기 구간이 넓어졌다 좁아졌다 하다가 하나의 임계값으로 안정된다. 이 출렁임은 끝이 가까울수록 "마지막에 열자"가 유리해지는 유한 지평 효과다. $q=0.85,\ \gamma=0.95$에서는 대략 $0.04 < b < 0.96$, 즉 <em>같은 쪽 소리를 순(net) 두 번 들으면 연다</em>는 정책이다.</li>
  <li><strong>볼록한 V자:</strong> $b=0.5$에서 가치가 가장 낮다. 정확도 $q$를 0.5로 낮추면 듣기가 정보를 주지 못해 듣기 구간이 사라지고, 1에 가까이 올리면 한 번만 들어도 확신하게 된다.</li>
  <li><strong>QMDP는 늘 위에 있다:</strong> QMDP는 "다음 스텝부터는 상태를 완전히 안다"고 가정하므로 항상 $V_t$ 이상이다. 그 차이가 이 문제에서 <em>완전 정보의 가치</em>다.</li>
</ul>

<h2>근사 해법과 깊은 RL</h2>
<p>정확한 POMDP 풀이에서는 지평이 길어지면 알파 벡터 수가 폭발적으로 늘어난다(유한 지평 문제는 PSPACE-완전, Papadimitriou & Tsitsiklis 1987). 실전에서는 다음 근사를 쓴다.</p>
<div class="table-wrap"><table class="t">
<thead><tr><th>방법</th><th>아이디어</th><th>무엇이 바뀌었나</th></tr></thead>
<tbody>
<tr><td>정확한 가치 반복 (Sondik 1971; Kaelbling et al. 1998)</td><td>알파 벡터 집합을 백업하고 지배된 벡터 제거</td><td>연속 믿음 공간 → 유한 개의 선형 함수</td></tr>
<tr><td>QMDP (Littman, Cassandra, Kaelbling 1995)</td><td>$Q(b,a) \approx \sum_s b(s)Q^*_{\text{MDP}}(s,a)$</td><td>"다음 스텝부터 완전 관측" 가정. 정보 수집 행동의 가치를 무시</td></tr>
<tr><td>PBVI (Pineau, Gordon, Thrun 2003)</td><td>샘플한 믿음 점들에서만 백업</td><td>전체 단체 → 도달 가능한 믿음 점 집합</td></tr>
<tr><td>POMCP (Silver & Veness 2010)</td><td>역사 트리 위의 MCTS, 파티클로 믿음 표현</td><td>정확한 믿음 → 샘플 기반, 모델은 시뮬레이터만 필요</td></tr>
<tr><td>DRQN (Hausknecht & Stone 2015)</td><td>LSTM 은닉 상태를 상태로 쓰는 DQN</td><td>베이즈 필터 → 학습된 순환 요약</td></tr>
<tr><td>Transformer 정책 / LLM</td><td>컨텍스트 창 전체(역사)를 입력</td><td>요약 대신 역사를 통째로 보고 어텐션으로 필요한 부분 조회</td></tr>
</tbody></table></div>
<div class="aside"><span class="label">실전 팁</span>Atari DQN이 프레임 4장을 쌓아 입력으로 쓰는 것도 POMDP 처방이다. 한 장의 프레임으로는 공의 속도를 알 수 없으므로, 짧은 역사를 상태로 만들어 근사적으로 마르코프하게 만든다(<a href="#dqn">10장</a>).</div>

<h2>LLM은 POMDP 안의 에이전트다</h2>
<p>LLM을 MDP로 볼 때(<a href="#llm-mdp">18장</a>)는 "프롬프트 + 생성된 토큰"을 상태로 둔다. 역사 전체를 상태로 삼았으니 정의상 마르코프하다. 그러나 정말 중요한 변수는 컨텍스트 밖에 숨어 있다.</p>
<ul>
  <li><strong>숨은 사용자 의도:</strong> "그거 고쳐 줘"의 "그거"는 관측되지 않는 상태다. 모델의 다음 토큰 분포는 여러 해석을 믿음만큼 섞은 결과로 볼 수 있다.</li>
  <li><strong>인컨텍스트 학습 = 암묵적 베이즈 추론:</strong> Xie et al.(2021)은 잠재 "개념"이 섞인 문서로 사전학습하면 인컨텍스트 학습이 나타남을 보였다. 모델이 프롬프트 예시를 보고 그 개념의 사후분포를 추론하는 방식이다. 프롬프트는 관측, 개념은 숨은 상태다.</li>
  <li><strong>정보 수집 행동:</strong> 명확화 질문(clarifying question)은 Tiger의 "듣기"와 같다. 한 턴짜리 보상으로 학습하면(밴딧 설정) 질문의 정보 가치가 보상에 반영되지 않아 모델이 질문을 잘 하지 않는다. 그래서 여러 턴에 걸친 RL이 필요하다(<a href="#memory">23장</a>).</li>
  <li><strong>숨은 맥락이 있는 선호:</strong> 평가자마다 다른 잠재 선호를 하나의 Bradley–Terry 보상모델로 학습하면 그 숨은 변수가 평균되어 사라진다(Siththaranjan et al. 2023의 숨은 맥락 분석). 보상모델도 부분 관측 문제 위에서 학습되는 셈이다(<a href="#rlhf">19장</a>).</li>
</ul>
`,
    mount: {
      'fx-tuple': (el) => ui.formula(el, {
        title: 'POMDP 7-튜플',
        say: '{S|보이지 않는 진짜 상황}은 {P|정해진 규칙대로 바뀌고}, 에이전트는 그 대신 {Om|센서가 내놓는 단서}만 받는다. 어떤 단서가 나올지는 {O|도착한 진짜 상황에 따라 정해진 확률}을 따른다. 그래서 에이전트는 {b|지금까지의 단서로 계산한 "어느 상황일 확률"}을 들고 다닌다.',
        tex: String.raw`\big(\tm{S}{\mathcal{S}},\ \mathcal{A},\ \tm{P}{P(s'\mid s,a)},\ R,\ \tm{Om}{\Omega},\ \tm{O}{O(o\mid s',a)},\ \gamma\big),\qquad \tm{b}{b_t(s) = \Pr(s_t = s\mid h_t)}`,
        terms: [
          { id: 'S', sym: '\\mathcal{S}', label: '숨은 상태 공간', desc: '세계의 진짜 상태. 에이전트는 보지 못한다.' },
          { id: 'P', sym: "P(s'\\mid s,a)", label: '전이', desc: 'MDP와 같다. 숨은 상태가 움직이는 규칙.' },
          { id: 'Om', sym: '\\Omega', label: '관측 공간', desc: '센서가 내놓을 수 있는 값들.', long: '카메라 픽셀, 잡음 섞인 거리 센서 값, "왼쪽에서 소리가 났다", 사용자의 문장이 모두 관측이다. 관측이 상태와 일대일로 대응하면 MDP로 돌아간다.' },
          { id: 'O', sym: "O(o\\mid s',a)", label: '관측 모델', desc: '도착한 상태에서 어떤 관측이 나올 확률.', easy: '예: 호랑이가 왼쪽이면 85% 확률로 왼쪽 소리.', long: '행동에 따라 관측의 질이 달라질 수 있다. Tiger에서는 "듣기"만 정보를 주고, 문을 열면 관측이 무의미하다. 정보 수집 행동이란 $O$가 상태에 따라 뚜렷이 달라지는 행동이다.' },
          { id: 'b', sym: 'b_t(s)', label: '믿음', desc: '역사가 주어졌을 때 현재 상태의 사후확률.', easy: '"지금 이 상황일 확률"을 상황마다 적은 표.', long: '믿음은 역사의 충분통계량이다. 최적 정책은 믿음의 함수 $\\pi(b)$로 충분하며, 믿음 위에서는 결정적 정책이 최적이다.' },
        ],
      }),
      'dv-belief': (el) => ui.derivation(el, {
        title: '베이즈 필터: $b\' = \\tau(b, a, o)$',
        easy: '새 확률은 "원래 그 상황일 확률"에 "그 상황이라면 이 단서가 나올 확률"을 곱한 뒤, 모든 경우의 합이 1이 되도록 나눈 것이다. 호랑이 문제에서는 같은 쪽 소리를 한 번 들을 때마다 확신이 일정한 만큼씩 커진다.',
        steps: [
          { tex: String.raw`b'(s') = \Pr(s' \mid b, a, o)`, why: '행동 $a$를 하고 관측 $o$를 받은 뒤의 새 믿음을 구한다.' },
          { tex: String.raw`= \frac{\Pr(o \mid s', b, a)\,\Pr(s' \mid b, a)}{\Pr(o \mid b, a)}`, why: '베이즈 정리를 쓴다.' },
          { tex: String.raw`= \frac{\hl{O(o \mid s', a)}\;\hl{\sum_s P(s' \mid s, a)\, b(s)}}{\Pr(o \mid b, a)}`, why: '관측은 도착 상태와 행동에만 의존한다(관측 모델). 분자의 두 번째 항은 <em>예측 단계</em>로, 현재 믿음을 전이 모델로 한 스텝 굴린다. 첫 번째 항은 <em>보정 단계</em>로, 관측의 우도로 다시 가중한다.' },
          { tex: String.raw`\Pr(o \mid b, a) = \sum_{s'} O(o \mid s', a) \sum_s P(s' \mid s, a)\, b(s)`, why: '분모는 분자를 모든 $s\'$에 걸쳐 더한 정규화 상수다. 이 값은 믿음 MDP의 "관측 전이 확률"로도 쓰인다.' },
          { tex: String.raw`\text{Tiger:}\quad b' = \frac{q\,b}{q\,b + (1-q)(1-b)}\quad(\text{왼쪽 소리}),\qquad \operatorname{logit} b' = \operatorname{logit} b \hl{\;\pm\; \log\tfrac{q}{1-q}}`, why: '듣기는 상태를 바꾸지 않으므로 예측 단계가 항등이다. 로그 오즈로 보면 한 번 들을 때마다 상수만큼 더하거나 뺀다. 즉 충분통계량은 "왼쪽 소리 횟수 − 오른쪽 소리 횟수" 하나다.' },
        ],
      }),
      'fx-bellman': (el) => ui.formula(el, {
        title: '믿음 MDP의 벨만 최적 방정식',
        say: '{V|이 확률 상태에서 기대할 수 있는 최고 점수}는, 행동 하나를 골라 {rho|확률로 평균 낸 즉시 점수}를 받고, {po|어떤 단서가 들릴지 확률별로 평균 내어} {Vn|그 단서로 고친 새 확률 상태의 점수}를 할인해 더한 값 중 가장 큰 것이다.',
        tex: String.raw`\tm{V}{V^*(b)} = \max_a \Big[\, \tm{rho}{\textstyle\sum_s b(s)R(s,a)} + \gamma \tm{po}{\sum_{o} \Pr(o\mid b,a)}\; \tm{Vn}{V^*\big(\tau(b,a,o)\big)} \Big]`,
        terms: [
          { id: 'V', sym: 'V^*(b)', label: '믿음의 가치', desc: '이 확신 정도에서 출발할 때의 최적 기대 리턴.' },
          { id: 'rho', sym: '\\rho(b,a)', label: '기대 즉시 보상', desc: '믿음으로 가중한 보상. 믿음에 대해 선형.' },
          { id: 'po', sym: '\\sum_o \\Pr(o\\mid b,a)', label: '관측에 대한 평균', desc: 'MDP의 "다음 상태 평균" 자리에 "다음 관측 평균"이 온다.', long: '믿음 MDP에서 확률적인 것은 관측뿐이다. 관측이 정해지면 다음 믿음은 베이즈 갱신으로 결정적으로 정해진다.' },
          { id: 'Vn', sym: "V^*(b')", label: '갱신된 믿음의 가치', desc: '베이즈 필터를 통과한 다음 믿음에서의 가치.' },
        ],
      }),
      'dv-pwlc': (el) => ui.derivation(el, {
        title: '귀납법: $V_t(b) = \\max_{\\alpha\\in\\Gamma_t}\\alpha\\cdot b$',
        easy: '남은 시간이 정해지면 세울 수 있는 "계획"은 유한 개이고, 계획 하나의 점수는 믿음에 대해 직선이다. 가치 함수는 그 직선들 중 가장 높은 것만 이은 선이라, 가운데가 움푹한 꺾인 V자(볼록) 모양이 된다.',
        steps: [
          { tex: String.raw`V_0(b) = 0 = \alpha_0 \cdot b,\qquad \alpha_0 = \mathbf{0}`, why: '지평 0에서는 자명하게 선형이다.' },
          { tex: String.raw`V_t(b) = \max_a\Big[\, b\cdot R_a + \gamma\sum_o \hl{\Pr(o\mid b,a)\, V_{t-1}(b^{a,o})}\Big]`, why: '귀납 가정 $V_{t-1}(b) = \\max_{\\alpha\\in\\Gamma_{t-1}} \\alpha\\cdot b$를 두고 벨만 백업을 쓴다.' },
          { tex: String.raw`\Pr(o\mid b,a)\,\max_{\alpha}\sum_{s'}\alpha(s')\,\frac{O(o|s',a)\sum_s P(s'|s,a)b(s)}{\hl{\Pr(o\mid b,a)}} = \max_{\alpha}\sum_s b(s)\, \hl{g^{\alpha}_{a,o}(s)}`, why: '베이즈 갱신의 분모가 앞의 $\\Pr(o|b,a)$와 정확히 상쇄된다. 남는 것은 $b$에 대해 선형인 식이다. 여기서 $g^{\\alpha}_{a,o}(s) = \\sum_{s\'}P(s\'|s,a)O(o|s\',a)\\alpha(s\')$이다.' },
          { tex: String.raw`V_t(b) = \max_a\ \max_{\alpha_{o_1},\dots,\alpha_{o_m}\in\Gamma_{t-1}}\ b\cdot\Big(R_a + \gamma\sum_o g^{\alpha_o}_{a,o}\Big)`, why: '관측마다 다음 계획(알파 벡터)을 하나씩 고르는 모든 조합 가운데 최댓값을 취한다. 괄호 안이 새 알파 벡터다.' },
          { tex: String.raw`\Rightarrow\ V_t(b) = \max_{\alpha\in\Gamma_t}\alpha\cdot b,\qquad |\Gamma_t| \le |\mathcal{A}|\,|\Gamma_{t-1}|^{|\Omega|}`, why: '유한 개 선형 함수의 최댓값이므로 조각별 선형 볼록(PWLC) 함수다. 가지치기를 하지 않으면 벡터 수가 이중 지수적으로 늘어나고, 그래서 정확한 POMDP 풀이가 어렵다.' },
        ],
      }),
      'tiger-play': mountTigerPlay,
      'tiger-alpha': mountTigerAlpha,
      'try-belief': mountGuessBelief,
      'step-belief': (el) => ui.walkthrough(el, {
        title: '소리 세 번으로 믿음을 손계산하기',
        caption: '칸에 답을 적고 "확인"을 누르면 계산식이 열린다. 소리 정확도는 0.85, 처음 믿음은 "왼쪽일 확률 0.5"다.',
        steps: [
          { say: '"왼쪽 소리"를 들었다. 먼저 <strong>호랑이가 왼쪽에 있었고, 그래서 왼쪽 소리가 났을</strong> 확률을 구한다. 왼쪽일 확률 0.5에 제대로 들릴 확률 0.85를 곱하면 얼마일까?', ask: { answer: 0.425, tol: 0.001 }, calc: String.raw`0.5 \times 0.85 = 0.425` },
          { say: '<strong>호랑이가 오른쪽에 있었는데 잘못 들려 왼쪽 소리가 났을</strong> 확률은 $0.5 \\times 0.15 = 0.075$다. 왼쪽 소리가 난 경우는 이 두 가지뿐이고 합은 0.5다. 그중 첫 번째 경우가 차지하는 몫이 새 믿음이다. 왼쪽일 확률은?', ask: { answer: 0.85, tol: 0.005 }, calc: String.raw`b' = \frac{0.425}{0.425 + 0.075} = \frac{0.425}{0.5} = 0.85` },
          { say: '왼쪽 소리를 한 번 더 들었다. 이번에는 시작 확률이 0.85다. 같은 방법으로 새 믿음은? (소수 둘째 자리까지)', ask: { answer: 0.97, tol: 0.006 }, calc: String.raw`b'' = \frac{0.85 \times 0.85}{0.85 \times 0.85 + 0.15 \times 0.15} = \frac{0.7225}{0.745} \approx 0.970` },
          { say: '이번엔 <strong>오른쪽</strong> 소리다. 호랑이가 왼쪽이라면 오른쪽 소리가 날 확률은 0.15, 오른쪽이라면 0.85다. 새 믿음은?', ask: { answer: 0.85, tol: 0.01 }, calc: String.raw`b''' = \frac{0.970 \times 0.15}{0.970 \times 0.15 + 0.030 \times 0.85} = \frac{0.1455}{0.171} \approx 0.85`, note: '왼쪽 두 번, 오른쪽 한 번이면 "순서와 상관없이 왼쪽이 한 번 더 많다". 그래서 왼쪽 소리를 한 번만 들었을 때와 같은 0.85로 돌아온다. 이 문제에서는 두 소리 횟수의 차이 하나만 기억하면 충분하다.' },
          { say: '방금 한 계산을 한 줄로 쓰면 "새 확률 ∝ 원래 확률 × 이 단서가 나올 확률"이다. 아래 유도의 결론인 베이즈 필터도 이 식이다.', calc: String.raw`b'(s) = \frac{O(o\mid s)\, b(s)}{\sum_{x} O(o\mid x)\, b(x)}` },
        ],
      }),
      'try-open': (el) => ui.predict(el, {
        title: '문을 열기 전에 계산해 보기',
        caption: '각 질문에 숫자를 적고 "확인"을 누르면 맞았는지와 해설이 나온다. 호랑이 문을 열면 −100점, 반대 문을 열면 +10점이다.',
        items: [
          { q: '믿음이 반반(왼쪽일 확률 0.5)일 때 왼쪽 문을 바로 열면, 기대 점수는 몇 점일까?', answer: -45, tol: 0.5, hint: '0.5 확률로 −100, 0.5 확률로 +10이다.', explain: '$0.5\\times(-100) + 0.5\\times10 = -45$. 듣기 한 번의 비용(−1)과 비교하면 지금 여는 것은 매우 나쁜 선택이다.' },
          { q: '왼쪽 소리를 두 번 들어 왼쪽일 확률이 0.97이 되었다. 이제 <strong>오른쪽</strong> 문을 열면 기대 점수는?', answer: 6.7, tol: 0.1, hint: '오른쪽 문 뒤에 호랑이가 있을 확률은 0.03이다.', explain: '$0.97\\times10 + 0.03\\times(-100) = 9.7 - 3 = 6.7$. 확신이 쌓이자 문을 여는 것이 듣기(−1)보다 나아졌다. 실제 최적 정책도 같은 쪽 소리가 순(net) 두 번이면 연다.' },
          { q: '소리 정확도가 0.5(동전 던지기)라면, 듣기를 해도 될까?', choices: ['계속 들으면 언젠가 확신이 생긴다', '듣기는 믿음을 바꾸지 못하므로 비용만 든다'], correct: 1, hint: '정확도 0.5면 왼쪽이든 오른쪽이든 소리가 날 확률이 같다.', explain: '분자와 분모에 똑같이 0.5가 곱해져 믿음이 그대로다. 정보가 없는 관측에는 비용을 낼 이유가 없다. 정보의 가치는 관측이 상황에 따라 달라질 때만 생긴다.' },
        ],
      }),
    },
    tacit: [
      { tag: 'math', t: '가치 함수가 볼록하다는 사실이 탐험의 근거가 된다',
        d: '<p>믿음 위 가치 함수가 볼록하다는 것은 젠센 부등식으로 "기대 사후 가치 ≥ 사전 가치"라는 뜻이다. 정보 수집에 비용을 낼 만하다는 수학적 근거가 여기서 나온다. 밴딧의 탐험, 능동 학습, 실험 설계의 "정보의 기대 가치(EVOI)"가 모두 같은 부등식에 기댄다. 거꾸로 가치가 오목해지는 상황(예: 위험 회피 효용)에서는 정보가 해가 될 수도 있고, 이것도 같은 그림으로 설명된다.</p>' },
      { tag: 'math', t: '관측 기반 무기억 정책은 확률적이어야 할 수 있다',
        d: '<p>MDP에서는 결정적 최적 정책이 존재하지만, POMDP에서 현재 관측만 보는 무기억(reactive) 정책으로 제한하면 결정적 정책이 임의로 나빠질 수 있고 확률적 정책이 더 나을 수 있다(Singh, Jaakkola, Jordan 1994). 두 상태가 같은 관측을 내는데 서로 다른 행동이 필요하면, 무작위성이 기억을 대신한다. 믿음(또는 충분한 역사)을 입력으로 주면 다시 결정적 정책으로 충분하다.</p>' },
      { tag: 'algo', t: '순환 신경망의 은닉 상태가 믿음이 된다는 보장은 없다',
        d: '<p>DRQN이나 LSTM 정책의 은닉 상태는 보상만으로 학습되므로 "행동에 필요한 정보"만 남기고 나머지는 버린다. 그래서 은닉 상태는 대개 진짜 믿음보다 훨씬 거칠다. 보상이 희소하면 무엇을 기억해야 하는지 학습 신호가 약하다. 다음 관측 예측 같은 보조 손실(예측 상태 표현, world model)을 붙이면 은닉 상태가 믿음에 가까워지고 표본 효율이 오르는 경우가 많다. Dreamer 계열(<a href="#modelbased">16장</a>)이 이 방향을 따른다.</p>' },
      { tag: 'algo', t: 'QMDP 같은 근사는 "무엇을 0으로 놓는가"부터 따진다',
        d: '<p>QMDP는 "불확실성은 한 스텝 뒤에 사라진다"고 가정하므로, 행동을 고를 때 그 행동이 <em>줄여 주는</em> 불확실성의 가치를 0으로 본다. 정보 수집 행동이 다른 이유로도 좋은 문제(Tiger에서 가운데 믿음일 때 듣기는 "문을 여는 것보다 덜 나빠서" 선택된다)에서는 잘 맞지만, 위치를 확인하려고 랜드마크로 우회해야 하는 내비게이션처럼 정보 그 자체만이 이유인 행동은 절대 고르지 않는다. 근사를 쓸 때는 "이 근사가 0으로 놓는 가치가 무엇인가"를 먼저 묻는 것이 요령이다.</p>' },
      { tag: 'research', t: '역사를 상태로 두면 POMDP는 "형식적으로" 사라지지만 어려움은 남는다',
        d: '<p>LLM이나 Transformer 정책처럼 역사 전체를 상태로 두면 정의상 MDP가 된다. 그러나 상태 공간이 역사 길이에 지수적으로 커지고, 같은 숨은 상황이 서로 다른 역사로 표현되어 일반화가 어렵다. 부분 관측의 어려움이 "표현 학습의 어려움"으로 옮겨 간 셈이다. 숨은 사용자 의도, 평가자 간 선호 차이, 검증할 수 없는 사실 같은 LLM의 문제가 모두 여기서 생긴다.</p>' },
    ],
    quiz: [
      { q: '믿음 상태 $b_t$의 설명으로 옳은 것은?', options: ['관측 $o_t$와 같다', '역사 $h_t$의 충분통계량이며 재귀적으로 갱신된다', '항상 원-핫 벡터다', '정책에 따라 정의가 달라진다'], answer: 1,
        explain: '$b_t(s)=\\Pr(s_t=s|h_t)$는 최적 제어에 필요한 역사의 정보를 모두 담으며 베이즈 필터로 갱신된다.' },
      { q: '유한 지평 POMDP 가치 함수가 믿음에 대해 볼록이라는 사실이 의미하는 것은?', options: ['정보는 해가 될 수 있다', '공짜 관측은 기대 가치를 낮추지 않는다', '최적 정책은 확률적이다', '가치 반복이 수렴하지 않는다'], answer: 1,
        explain: '젠센 부등식으로 $\\sum_o\\Pr(o)V(b^o) \\ge V(b)$가 성립한다. 믿음이 여러 사후로 쪼개져도 평균 가치는 줄지 않는다.' },
      { q: 'Tiger 문제에서 듣기 정확도 $q=0.5$로 두면?', options: ['한 번 들으면 확신한다', '듣기는 믿음을 바꾸지 못하므로 정보 가치가 0이 된다', '듣기 보상이 +1이 된다', 'QMDP와 정확한 해의 차이가 커진다'], answer: 1,
        explain: '$q=0.5$면 우도비 $q/(1-q)=1$이라 로그 오즈가 변하지 않는다. 듣기는 비용만 드는 행동이 된다.' },
      { q: 'QMDP 근사가 체계적으로 과소평가하는 것은?', options: ['즉시 보상', '전이 확률', '정보 수집 행동의 가치', '할인율'], answer: 2,
        explain: 'QMDP는 다음 스텝부터 상태를 완전히 안다고 가정하므로, 불확실성을 줄이는 것의 가치를 0으로 본다. 동시에 가치 자체는 과대평가(상한)한다.' },
    ],
  });

  /* ---------- 믿음 맞히기: 감으로 추측하고 베이즈 계산과 비교 ---------- */
  function mountGuessBelief(el) {
    const p = ui.panel(el, { kind: 'TRY', title: '감으로 믿음 맞히기', caption: '"소리 듣기"를 누르면 소리가 하나 들린다. 슬라이더로 "호랑이가 왼쪽일 확률"을 감으로 맞히고 "내 추측 확인"을 누르면, 정확한 계산값과 내 추측이 막대로 나란히 나온다. 소리 정확도는 0.85다.' });
    const q = 0.85;
    const r = sim.rng(21);
    const btns = ui.row(p.body, 'btns');
    const hearB = ui.button(btns, '소리 듣기', hear, { primary: true });
    const guess = ui.slider(null, { label: '내 추측: 왼쪽일 확률', min: 0, max: 1, step: 0.01, value: 0.5, format: ui.fmt.f(2) });
    const ctr = ui.row(p.body);
    ctr.appendChild(guess.el);
    const checkB = ui.button(btns, '내 추측 확인', check);
    ui.button(btns, '호랑이 위치 공개하고 새 판', newGame);
    p.body.insertBefore(ctr, btns);
    const st = ui.stats(p.body, [
      { key: 'hist', label: '들은 소리 (순서대로)' },
      { key: 'net', label: '왼쪽 − 오른쪽 횟수' },
      { key: 'exact', label: '정확한 믿음', tone: 'accent' },
      { key: 'err', label: '평균 오차 (내 추측)', tone: 'signal' },
    ]);
    const split = document.createElement('div');
    split.className = 'w-split';
    const a = document.createElement('div');
    const msg = document.createElement('div');
    msg.className = 'fx-detail';
    split.append(a, msg);
    p.body.appendChild(split);
    const chart = plot.bars(a, { categories: ['내 추측', '베이즈 계산'], series: [], height: 190, y: { min: 0, max: 1, label: '왼쪽일 확률' }, labels: true, labelFmt: (v) => v.toFixed(2), legend: false });
    let tiger, b, hist, pending, errs;
    function newGame() {
      const prev = tiger;
      tiger = r() < 0.5 ? 0 : 1;
      b = 0.5; hist = []; pending = false; errs = errs || [];
      guess.set(0.5, true);
      draw(prev == null ? '처음엔 아무 정보가 없으니 왼쪽일 확률은 0.5다. "소리 듣기"를 누르면 시작한다.' : '방금 판의 호랑이는 <strong>' + (prev === 0 ? '왼쪽' : '오른쪽') + '</strong>에 있었다. 새 판을 시작했다. 믿음은 다시 0.5.', null);
    }
    function hear() {
      const o = r() < q ? tiger : 1 - tiger;
      const lo = o === 0 ? q : 1 - q, ro = o === 0 ? 1 - q : q;
      const nb = (lo * b) / (lo * b + ro * (1 - b));
      hist.push(o);
      pending = { prev: b, next: nb, o };
      b = nb;
      draw('<strong>' + (o === 0 ? '왼쪽' : '오른쪽') + '</strong>에서 소리가 났다. 왼쪽일 확률은 이제 얼마일까? 슬라이더로 추측을 정하고 "내 추측 확인"을 누르면 정답이 나온다.', null);
    }
    function check() {
      if (!pending) { draw('먼저 "소리 듣기"로 소리를 하나 들어야 한다.', null); return; }
      const g = guess.get();
      const pd = pending;
      pending = false;
      const e = Math.abs(g - pd.next);
      errs.push(e);
      const lo = pd.o === 0 ? q : 1 - q, ro = 1 - lo;
      const grade = e < 0.03 ? '<strong class="col-good">거의 정확하다.</strong>' : e < 0.1 ? '<strong>가깝다.</strong>' : '<strong class="col-bad">차이가 크다.</strong>';
      draw(grade + ' 정확한 값은 ' + pd.next.toFixed(3) + '이다. 계산: (' + lo.toFixed(2) + ' × ' + pd.prev.toFixed(3) + ') ÷ (' + lo.toFixed(2) + ' × ' + pd.prev.toFixed(3) + ' + ' + ro.toFixed(2) + ' × ' + (1 - pd.prev).toFixed(3) + ').' +
        (hist.length >= 3 ? ' 정확한 값은 "왼쪽 − 오른쪽 횟수"로만 정해지고, 소리의 순서와는 상관없다.' : ''), g);
    }
    function draw(text, g) {
      msg.innerHTML = text;
      const left = hist.filter((x) => x === 0).length;
      st.set('hist', hist.length ? hist.map((x) => (x === 0 ? '왼' : '오')).join(' ') : '없음');
      st.set('net', String(left - (hist.length - left)));
      st.set('exact', pending ? '?' : b.toFixed(3));
      st.set('err', errs.length ? (errs.reduce((x, y) => x + y, 0) / errs.length).toFixed(3) + ' (' + errs.length + '회)' : '–');
      chart.update({ series: [{ name: '확률', color: 'c1', values: [g == null ? NaN : g, pending ? NaN : b], colors: ['signal', 'c1'] }] });
      hearB.disabled = !!pending;
      checkB.disabled = !pending;
    }
    newGame();
  }

  /* ---------- Tiger 모델 ---------- */
  // 상태 0 = 호랑이 왼쪽(TL), 1 = 호랑이 오른쪽(TR); b = P(TL)
  // 행동 0 듣기, 1 왼쪽 열기, 2 오른쪽 열기; 관측 0 왼쪽 소리, 1 오른쪽 소리
  const ACT = ['듣기', '왼쪽 열기', '오른쪽 열기'];
  const ACT_COL = ['c1', 'c2', 'c3'];
  function R(a) { return a === 0 ? [-1, -1] : a === 1 ? [-100, 10] : [10, -100]; }
  function P(s, a, s2) { return a === 0 ? (s === s2 ? 1 : 0) : 0.5; }
  function O(o, s2, a, q) { return a === 0 ? (o === s2 ? q : 1 - q) : 0.5; }

  function backup(Gprev, gamma, q) {
    const out = [];
    for (let a = 0; a < 3; a++) {
      // g[o] = 리스트 of vectors
      const g = [0, 1].map((o) => Gprev.map((al) => [0, 1].map((s) => {
        let v = 0;
        for (let s2 = 0; s2 < 2; s2++) v += P(s, a, s2) * O(o, s2, a, q) * al.v[s2];
        return v;
      })));
      const Ra = R(a);
      for (let i = 0; i < g[0].length; i++) {
        for (let j = 0; j < g[1].length; j++) {
          out.push({ a, v: [Ra[0] + gamma * (g[0][i][0] + g[1][j][0]), Ra[1] + gamma * (g[0][i][1] + g[1][j][1])] });
        }
      }
    }
    return prune(out);
  }
  // 2상태이므로 알파 벡터는 b∈[0,1] 위의 직선 v(b) = c + m·b (c = α(TR), m = α(TL) − α(TR)).
  // 직선들의 상한 포락선을 정확히 구하고(convex hull trick), [0,1]에 한 구간이라도 닿는 직선만 남긴다.
  function prune(list) {
    const L = list.map((al) => ({ al, m: al.v[0] - al.v[1], c: al.v[1] }));
    L.sort((x, y) => (x.m - y.m) || (y.c - x.c));
    const lines = [];
    L.forEach((l) => {
      const last = lines[lines.length - 1];
      if (!last || Math.abs(last.m - l.m) > 1e-7) lines.push(l);
      else if (l.c > last.c) lines[lines.length - 1] = l; // 사실상 같은 기울기: 위에 있는 것만
    });
    const xi = (a, b) => (a.c - b.c) / (b.m - a.m);
    const hull = [];
    lines.forEach((l) => {
      while (hull.length >= 2 && xi(hull[hull.length - 2], l) <= xi(hull[hull.length - 2], hull[hull.length - 1]) + 1e-12) hull.pop();
      hull.push(l);
    });
    const res = [];
    hull.forEach((l, i) => {
      const left = i === 0 ? -Infinity : xi(hull[i - 1], l);
      const right = i === hull.length - 1 ? Infinity : xi(l, hull[i + 1]);
      if (right > 1e-12 && left < 1 - 1e-12 && right - left > 1e-12) res.push(l.al);
    });
    return res;
  }
  // (γ, q)가 같으면 이미 계산한 지평까지 재사용한다
  const cache = { key: '', sets: null };
  function solveAlphas(H, gamma, q) {
    const key = gamma + '|' + q;
    if (cache.key !== key) { cache.key = key; cache.sets = [[{ a: -1, v: [0, 0] }]]; }
    const sets = cache.sets;
    for (let t = sets.length; t <= H; t++) sets.push(backup(sets[t - 1], gamma, q));
    return sets;
  }
  function valueAt(G, b) {
    let best = null, bv = -Infinity;
    G.forEach((al) => { const v = b * al.v[0] + (1 - b) * al.v[1]; if (v > bv) { bv = v; best = al; } });
    return { v: bv, al: best };
  }
  function qmdp(H, gamma) {
    // 완전 관측 Tiger의 유한 지평 Q
    let V = [0, 0];
    let Q = null;
    for (let t = 1; t <= H; t++) {
      Q = [0, 1].map((s) => [0, 1, 2].map((a) => R(a)[s] + gamma * [0, 1].reduce((acc, s2) => acc + P(s, a, s2) * V[s2], 0)));
      V = Q.map((row) => Math.max(...row));
    }
    return (b) => Math.max(...[0, 1, 2].map((a) => b * Q[0][a] + (1 - b) * Q[1][a]));
  }

  const tigerShared = { q: 0.85, gamma: 0.95, H: 10, b: 0.5, listeners: [] };
  function tlisten(f) {
    tigerShared.listeners.push(f);
    if (RL.cleanup) RL.cleanup.push(() => { const i = tigerShared.listeners.indexOf(f); if (i >= 0) tigerShared.listeners.splice(i, 1); });
  }
  function tnotify(src) { tigerShared.listeners.forEach((f) => f(src)); }

  /* ---------- Tiger 직접 플레이 ---------- */
  function mountTigerPlay(el) {
    const p = ui.panel(el, { kind: 'SIM', title: 'Tiger: 듣고, 믿음을 갱신하고, 문을 연다', caption: '"듣기"를 누를 때마다 믿음 숫자가 바뀐다. 한쪽으로 충분히 기울면 반대쪽 문을 연다. "정책으로 500스텝"을 누르면 최적에 가까운 정책의 스텝당 평균 점수가 나온다.' });
    const ctr = ui.row(p.body);
    ui.slider(ctr, { label: '듣기 정확도 $q$', min: 0.5, max: 0.99, step: 0.01, value: tigerShared.q, format: ui.fmt.f(2), onInput: (v) => { tigerShared.q = v; tnotify('param'); } });
    ui.slider(ctr, { label: '정책 지평 $H$ (자동 플레이용)', min: 1, max: 20, step: 1, value: tigerShared.H, format: ui.fmt.int, onInput: (v) => { tigerShared.H = v; tnotify('param'); } });
    const btns = ui.row(p.body, 'btns');
    ui.button(btns, '듣기 (−1)', () => act(0), { primary: true });
    ui.button(btns, '왼쪽 문 열기', () => act(1));
    ui.button(btns, '오른쪽 문 열기', () => act(2));
    ui.button(btns, '알파 벡터 정책으로 1스텝', () => act(policyAction()));
    ui.button(btns, '정책으로 500스텝', () => { for (let i = 0; i < 500; i++) act(policyAction(), true); upd(); });
    ui.button(btns, '초기화', reset);
    const st = ui.stats(p.body, [
      { key: 'b', label: '믿음 $b=\\Pr(\\text{왼쪽})$', tone: 'accent' },
      { key: 'best', label: '현재 믿음에서 최적 행동' },
      { key: 'R', label: '누적 보상' },
      { key: 'avg', label: '스텝당 평균 보상', tone: 'signal' },
      { key: 'doors', label: '문 열기: 성공 / 실패' },
    ]);
    const vis = document.createElement('div');
    vis.style.maxWidth = '380px';
    const log = document.createElement('div');
    log.className = 'log';
    const split = document.createElement('div');
    split.className = 'w-split';
    split.append(vis, log);
    p.body.appendChild(split);

    const r = sim.rng(11);
    let state, b, total, steps, good, bad, lines, reveal, alphas;
    function recompute() { alphas = solveAlphas(tigerShared.H, tigerShared.gamma, tigerShared.q)[tigerShared.H]; }
    function policyAction() { return valueAt(alphas, b).al.a; }
    function reset() {
      state = r() < 0.5 ? 0 : 1; b = 0.5; total = 0; steps = 0; good = 0; bad = 0; lines = []; reveal = null;
      recompute();
      upd();
    }
    function act(a, quiet) {
      const q = tigerShared.q;
      steps++;
      if (a === 0) {
        const o = r() < q ? state : 1 - state;
        const lo = o === 0 ? q : 1 - q, ro = o === 0 ? 1 - q : q;
        b = (lo * b) / (lo * b + ro * (1 - b));
        total += -1;
        reveal = null;
        if (!quiet) lines.unshift('듣기 → ' + (o === 0 ? '왼쪽' : '오른쪽') + '에서 소리.  b = ' + b.toFixed(3));
      } else {
        const opened = a === 1 ? 0 : 1; // 연 문의 쪽
        const hit = opened === state;
        const rew = hit ? -100 : 10;
        total += rew;
        if (hit) bad++; else good++;
        if (!quiet) lines.unshift(ACT[a] + ' → ' + (hit ? '호랑이! −100' : '보물 +10') + '  (호랑이는 ' + (state === 0 ? '왼쪽' : '오른쪽') + '에 있었다. 재추첨)');
        reveal = state;
        state = r() < 0.5 ? 0 : 1;
        b = 0.5;
      }
      lines = lines.slice(0, 12);
      tigerShared.b = b;
      if (!quiet) upd();
    }
    function upd() {
      st.set('b', b.toFixed(3));
      st.set('best', ACT[policyAction()]);
      st.set('R', total.toFixed(0));
      st.set('avg', steps ? (total / steps).toFixed(3) : '–');
      st.set('doors', good + ' / ' + bad);
      log.textContent = lines.length ? lines.join('\n') : '버튼으로 행동을 고른다. 듣기를 몇 번 한 뒤 문을 여는 편이 좋다.';
      drawDoors();
      tigerShared.b = b;
      tnotify('belief');
    }
    function drawDoors() {
      const hl = 150, bl = Math.round(hl * b), br = Math.round(hl * (1 - b));
      const tg = (side) => (reveal === side ? '<text x="' + (side === 0 ? 95 : 265) + '" y="96" text-anchor="middle" style="fill:var(--bad);font-size:15px;font-weight:700">호랑이</text>' : '');
      vis.innerHTML =
        '<svg viewBox="0 0 360 230" role="img" aria-label="두 문과 믿음">' +
        '<rect x="45" y="30" width="100" height="130" rx="6" style="fill:var(--surface-2);stroke:var(--line);stroke-width:2"/>' +
        '<rect x="215" y="30" width="100" height="130" rx="6" style="fill:var(--surface-2);stroke:var(--line);stroke-width:2"/>' +
        '<text x="95" y="22" text-anchor="middle" style="fill:var(--ink);font-size:13px">왼쪽 문</text>' +
        '<text x="265" y="22" text-anchor="middle" style="fill:var(--ink);font-size:13px">오른쪽 문</text>' +
        tg(0) + tg(1) +
        '<rect x="45" y="' + (200 - bl * 0.25) + '" width="100" height="' + bl * 0.25 + '" style="fill:var(--c2);opacity:0.75"/>' +
        '<rect x="215" y="' + (200 - br * 0.25) + '" width="100" height="' + br * 0.25 + '" style="fill:var(--c3);opacity:0.75"/>' +
        '<line x1="30" y1="200" x2="330" y2="200" style="stroke:var(--line)"/>' +
        '<text x="95" y="218" text-anchor="middle" style="fill:var(--ink);font-size:12px;font-family:var(--font-mono)">P(호랑이) ' + b.toFixed(2) + '</text>' +
        '<text x="265" y="218" text-anchor="middle" style="fill:var(--ink);font-size:12px;font-family:var(--font-mono)">P(호랑이) ' + (1 - b).toFixed(2) + '</text>' +
        '</svg>';
    }
    tlisten((src) => { if (src === 'param') { recompute(); st.set('best', ACT[policyAction()]); } });
    reset();
  }

  /* ---------- 정확한 알파 벡터 가치 함수 ---------- */
  function mountTigerAlpha(el) {
    const p = ui.panel(el, { kind: 'CALC', title: 'Tiger의 정확한 가치 함수 $V_t(b)=\\max_{\\alpha}\\alpha\\cdot b$', caption: '지평 슬라이더를 1부터 천천히 올리면, 굵은 선은 가운데(가장 애매한 믿음)가 움푹한 V자를 유지하고 "듣기 구간"은 넓어졌다 좁아졌다 하다가 멈춘다.' });
    const ctr = ui.row(p.body);
    let t = 10;
    const tS = ui.slider(ctr, { label: '지평 $t$', min: 1, max: 20, step: 1, value: t, format: ui.fmt.int, onInput: (v) => { t = v; draw(); } });
    ui.slider(ctr, { label: '할인율 $\\gamma$', min: 0.5, max: 1, step: 0.01, value: tigerShared.gamma, format: ui.fmt.f(2), onInput: (v) => { tigerShared.gamma = v; tnotify('param'); draw(); } });
    let showQ = false;
    ui.checkbox(ctr, { label: 'QMDP 근사 겹쳐 보기 (상한)', value: false, onChange: (v) => { showQ = v; draw(); } });
    const st = ui.stats(p.body, [
      { key: 'n', label: '살아남은 알파 벡터 수' },
      { key: 'raw', label: '가지치기 전 후보 수' },
      { key: 'listen', label: '듣기 구간 (b)', tone: 'accent' },
      { key: 'v', label: '$V_t(0.5)$' },
      { key: 'gap', label: 'QMDP − $V_t$ at 0.5', tone: 'signal' },
    ]);
    const chartEl = document.createElement('div');
    p.body.appendChild(chartEl);
    const chart = plot.line(chartEl, { height: 300, x: { min: 0, max: 1, label: 'b = P(호랑이가 왼쪽)' }, y: { label: '가치' }, series: [], hoverDigits: 2 });
    const cap = document.createElement('p');
    cap.className = 'w-caption';
    cap.innerHTML = '선 색: <span class="col-c1">듣기</span>로 시작하는 계획, <span class="col-c2">왼쪽 열기</span>, <span class="col-c3">오른쪽 열기</span>. 세로 점선은 위 플레이 위젯의 현재 믿음이다.';
    p.body.appendChild(cap);
    function draw() {
      const sets = solveAlphas(t, tigerShared.gamma, tigerShared.q);
      const G = sets[t];
      const series = [];
      G.forEach((al) => series.push({ color: ACT_COL[al.a], data: [[0, al.v[1]], [1, al.v[0]]], width: 1.2, opacity: 0.55, legend: false, hover: false, endDot: false }));
      const env = [];
      for (let i = 0; i <= 200; i++) { const b = i / 200; env.push([b, valueAt(G, b).v]); }
      series.push({ name: '$V_t(b)$ (정확)', color: 'ink', data: env, width: 3, endDot: false });
      const qf = qmdp(t, tigerShared.gamma);
      if (showQ) series.push({ name: 'QMDP 근사', color: 'signal', dash: '6 4', data: env.map((p2) => [p2[0], qf(p2[0])]), endDot: false });
      // 듣기 구간
      let lo = null, hi = null;
      for (let i = 0; i <= 1000; i++) { const b = i / 1000; if (valueAt(G, b).al.a === 0) { if (lo == null) lo = b; hi = b; } }
      const ys = env.map((x) => x[1]);
      const ymin = Math.min(...ys), ymax = Math.max(...ys, showQ ? Math.max(...env.map((x) => qf(x[0]))) : -Infinity);
      chart.update({ series, y: { label: '가치', min: Math.floor(ymin - 0.08 * (ymax - ymin + 1)), max: Math.ceil(ymax + 0.08 * (ymax - ymin + 1)) }, vlines: [{ x: tigerShared.b, label: 'b' }] });
      st.set('n', G.length);
      st.set('raw', 3 * Math.pow(sets[t - 1].length, 2));
      st.set('listen', lo == null ? '없음' : lo.toFixed(3) + ' ~ ' + hi.toFixed(3));
      const v5 = valueAt(G, 0.5).v;
      st.set('v', v5.toFixed(2));
      st.set('gap', (qf(0.5) - v5).toFixed(2));
    }
    tlisten((src) => { if (src === 'param' || src === 'belief') draw(); });
    tS.set(t, true);
    draw();
  }
})();
