/* 02 벨만 방정식과 축약 사상 */
(function () {
  const { ui, sim, plot } = RL;

  RL.chapter({
    id: 'bellman',
    title: '벨만 방정식과 축약 사상',
    subtitle: '"지금의 가치 = 한 스텝 보상 + 할인된 다음 가치". 이 자기참조식이 왜 유일한 해를 가지며, 반복하면 왜 반드시 수렴하는지를 증명하고 눈으로 확인한다.',
    time: 35,
    level: '기초 · 핵심',
    prereq: ['mdp'],
    theses: ['T1', 'T2'],
    easy: {
      hook: '목표 바로 옆 칸의 가치는 쉽다. 그 옆 칸은 "옆 칸 가치를 조금 깎은 값"이다. 이렇게 거꾸로 한 칸씩 채우는 규칙이 벨만 방정식이다.',
      intro: '<p>앞 장에서 리턴을 뒤에서부터 계산하면 "자기 점수 + 할인된 다음 리턴"이 된다는 것을 봤다. 이 규칙에 평균을 씌우면 <strong>"이 칸의 가치 = 바로 받는 점수 + 할인된 다음 칸의 가치"</strong>가 된다. 놀라운 점은, 처음에 가치표를 아무렇게나 적어 놓고 이 규칙을 반복 적용해도 <strong>항상 같은 정답으로 모인다</strong>는 것이다. 이 장은 그 이유를 보여 준다.</p>',
      analogy: '산꼭대기에 물을 부으면 물이 한 칸씩 아래로 흘러 퍼지듯, 목표 칸의 점수가 반복할 때마다 한 칸씩 주변으로 번진다. 한 번 퍼질 때마다 $\\gamma$만큼 줄어들기 때문에 먼 칸일수록 값이 작다.',
      path: ['복도 다섯 칸으로 "거꾸로 채우기"를 손으로 해 본다', '그 규칙을 식으로 쓴 것이 벨만 방정식이다', '아무 값에서 시작해도 같은 답으로 모이는 이유(축약)를 본다', '격자 세계에서 가치가 퍼지는 모습을 시뮬레이터로 본다'],
      recap: [
        '칸의 가치는 "바로 받는 점수 + 할인된 다음 칸의 가치"로 계산되고, 목표에서부터 거꾸로 채워 나갈 수 있다.',
        '가장 좋은 행동을 고르는 경우에는 평균 대신 "가장 좋은 쪽"을 택한다. 이것이 최적 가치이고, 알면 각 칸에서 무엇을 할지 바로 정해진다.',
        '이 계산을 반복하면 두 가치표의 차이가 매번 γ배 이하로 줄어서, 어디서 시작하든 같은 정답에 도달한다.',
      ],
    },
    goals: [
      '리턴의 재귀식에서 벨만 기대 방정식을 단계별로 유도할 수 있다.',
      '벨만 최적 방정식과 기대 방정식의 차이(평균 vs 최대)를 설명할 수 있다.',
      '벨만 연산자가 $\\gamma$-축약임을 증명하고, 가치 반복의 오차가 $\\gamma^k$로 줄어드는 것을 시뮬레이터로 확인한다.',
    ],
    html: String.raw`
<p>앞 장에서 $G_t = r_{t+1} + \gamma G_{t+1}$을 얻었다. 양변에 기댓값을 씌우면 가치 함수가 자기 자신으로 표현되는 식, 즉 <strong>벨만 방정식</strong>이 나온다. 이 식은 RL 전체에서 가장 많이 재사용되는 문장이다. TD 타깃, Q-learning 타깃, DQN 손실, Soft Q, 토큰 단위 LLM 가치까지 모두 이 식의 변형이다.</p>

<h2>벨만 기대 방정식 유도</h2>
<div data-w="step-corridor"></div>
<div data-w="dv-expect"></div>
<div data-w="fx-expect"></div>

<h3>백업 다이어그램</h3>
<p>벨만 방정식은 "한 단계 앞을 내다보고 평균내어 되돌려 쓰는(backup)" 연산이다. 열린 원은 상태, 검은 점은 행동이다.</p>
<div class="w wide" style="box-shadow:none"><div class="w-body">
<svg viewBox="0 0 640 190" role="img" aria-label="백업 다이어그램">
  <g style="stroke:var(--muted);stroke-width:1.4">
    <line x1="150" y1="34" x2="80" y2="92"/><line x1="150" y1="34" x2="220" y2="92"/>
    <line x1="80" y1="98" x2="40" y2="154"/><line x1="80" y1="98" x2="110" y2="154"/>
    <line x1="220" y1="98" x2="190" y2="154"/><line x1="220" y1="98" x2="260" y2="154"/>
    <line x1="480" y1="34" x2="410" y2="92"/><line x1="480" y1="34" x2="550" y2="92"/>
    <line x1="410" y1="98" x2="370" y2="154"/><line x1="410" y1="98" x2="440" y2="154"/>
    <line x1="550" y1="98" x2="520" y2="154"/><line x1="550" y1="98" x2="590" y2="154"/>
  </g>
  <g style="fill:var(--surface);stroke:var(--ink);stroke-width:1.6">
    <circle cx="150" cy="30" r="10"/><circle cx="40" cy="160" r="9"/><circle cx="110" cy="160" r="9"/><circle cx="190" cy="160" r="9"/><circle cx="260" cy="160" r="9"/>
    <circle cx="480" cy="30" r="10"/><circle cx="370" cy="160" r="9"/><circle cx="440" cy="160" r="9"/><circle cx="520" cy="160" r="9"/><circle cx="590" cy="160" r="9"/>
  </g>
  <g style="fill:var(--ink)"><circle cx="80" cy="95" r="6"/><circle cx="220" cy="95" r="6"/><circle cx="410" cy="95" r="6"/><circle cx="550" cy="95" r="6"/></g>
  <path d="M95 70 Q150 84 205 70" style="fill:none;stroke:var(--signal);stroke-width:2"/>
  <path d="M425 70 Q480 84 535 70" style="fill:none;stroke:var(--signal);stroke-width:2"/>
  <g style="font-size:12px;fill:var(--ink)">
    <text x="170" y="26">s</text><text x="500" y="26">s</text>
    <text x="232" y="98">a</text><text x="562" y="98">a</text>
    <text x="270" y="172">s'</text><text x="600" y="172">s'</text>
    <text x="150" y="188" text-anchor="middle" style="fill:var(--muted)">기대 방정식: π로 평균 → P로 평균</text>
    <text x="480" y="188" text-anchor="middle" style="fill:var(--muted)">최적 방정식: 행동은 max → P로 평균</text>
    <text x="150" y="66" text-anchor="middle" style="fill:var(--signal)">Σ π</text>
    <text x="480" y="66" text-anchor="middle" style="fill:var(--signal)">max</text>
  </g>
</svg></div></div>

<h2>벨만 최적 방정식</h2>
<p>최적 가치 $V^*(s) = \max_\pi V^\pi(s)$는 정책에 대한 평균 대신 <strong>최선의 행동</strong>을 택한다. 기대 방정식의 $\sum_a \pi(a|s)$가 $\max_a$로 바뀐다.</p>
<div data-w="fx-opt"></div>
<p>$Q^*$를 알면 최적 정책은 즉시 나온다: $\pi^*(s) = \arg\max_a Q^*(s,a)$. 환경 모델 $P$가 필요 없다는 점이 결정적이다. Q-learning(<a href="#qlearning">07장</a>)은 이 식을 샘플로 푸는 알고리즘이고, DQN(<a href="#dqn">10장</a>)은 그것을 신경망으로 푼다.</p>
<div class="warn"><span class="label">주의</span>최적 방정식은 $\max$ 때문에 <strong>비선형</strong>이다. 기대 방정식은 선형 연립방정식 $V^\pi = r^\pi + \gamma P^\pi V^\pi$로 닫힌 해가 있지만, 최적 방정식은 반복법(가치 반복, 정책 반복)이나 선형계획법으로 푼다.</div>

<h2>연산자 관점과 축약 사상</h2>
<p>벨만 방정식의 우변을 함수에서 함수로 가는 <strong>연산자</strong>로 보자.</p>
$$(\mathcal{T}^\pi V)(s) = \sum_a \pi(a|s)\Big[R(s,a) + \gamma\sum_{s'}P(s'|s,a)V(s')\Big], \qquad (\mathcal{T}^* V)(s) = \max_a\Big[R(s,a) + \gamma\sum_{s'}P(s'|s,a)V(s')\Big]$$
<p>그러면 벨만 방정식은 고정점 방정식 $V^\pi = \mathcal{T}^\pi V^\pi$, $V^* = \mathcal{T}^* V^*$이 된다. 이제 질문은 "고정점이 유일한가, 반복하면 찾을 수 있는가"이다. 답은 $\mathcal{T}$가 <strong>축약 사상</strong>이라는 데서 나온다.</p>
<div data-w="dv-contract"></div>
<div class="thesis-box"><span class="label">대전제 T1 · 벨만 고정점</span>
<p>$\mathcal{T}$가 sup-노름에서 $\gamma$-축약이므로 바나흐 고정점 정리에 의해 (1) 고정점이 <strong>유일</strong>하고, (2) 어떤 $V_0$에서 출발해도 $V_{k+1} = \mathcal{T}V_k$가 그 고정점으로 수렴하며, (3) 오차는 $\|V_k - V^*\|_\infty \le \gamma^k \|V_0 - V^*\|_\infty$로 <strong>기하급수적으로</strong> 준다.</p>
<p>이 성질이 깨지는 곳이 RL의 불안정성의 근원이다. 함수근사를 끼우면 "투영 후 백업"이 더 이상 축약이 아닐 수 있고(<a href="#approx">09장 Deadly Triad</a>), $\max$ 대신 log-sum-exp를 쓰면 여전히 축약이지만 다른 고정점(soft 가치)을 갖는다(<a href="#qviews">08장</a>, <a href="#maxent">14장</a>).</p>
</div>

<h2>복도에서 손으로 반복해 보기</h2>
<p>격자로 가기 전에 한 줄짜리 복도에서 반복을 한 번씩 눌러 보자. 누를 때마다 모든 칸이 "바로 받는 점수 + $\gamma\times$ 이웃 칸 가치 중 큰 쪽"으로 고쳐지고, 그 계산식이 그대로 표시된다. 처음 값이 0이든 엉뚱한 숫자든 결국 같은 답에 모인다.</p>
<div data-w="corridor"></div>

<h2>시뮬레이터: 가치 반복의 수렴</h2>
<p>아래 격자에서 가치 반복 $V_{k+1} = \mathcal{T}^* V_k$를 한 스윕씩 실행해 보자. 색은 가치(파랑 양수, 주황 음수), 화살표는 현재 $V_k$에 대한 탐욕 정책이다. 오른쪽 그래프는 $\log_{10}\|V_k - V^*\|_\infty$이며, 점선은 이론 상한 $\gamma^k\|V_0 - V^*\|_\infty$의 기울기다. $\gamma$를 키우면 수렴이 느려지는 이유가 기울기 $\log_{10}\gamma$로 보인다.</p>
<div data-w="vi-sim"></div>
<ul>
  <li><strong>정보의 전파:</strong> 처음 몇 스윕 동안 가치가 목표 칸에서 한 칸씩 퍼져 나간다. $k$번 스윕 후의 $V_k$는 "$k$ 스텝 안에 일어나는 일"만 반영한다.</li>
  <li><strong>정책은 가치보다 먼저 수렴한다:</strong> 화살표는 숫자가 다 수렴하기 훨씬 전에 멈춘다. 정책 반복(<a href="#dp">03장</a>)이 빠른 이유다.</li>
  <li><strong>미끄러짐:</strong> 미끄러질 확률을 올리면 −1 칸 근처에서 정책이 벽 쪽으로 돌아가는 우회로를 택한다. 기댓값 안의 $P$가 정책을 바꾼다.</li>
</ul>

<h2>행렬 형태와 리턴과의 연결</h2>
<p>유한 MDP에서 정책을 고정하면 $V^\pi = r^\pi + \gamma P^\pi V^\pi$이므로</p>
$$V^\pi = (I - \gamma P^\pi)^{-1} r^\pi = \sum_{k=0}^{\infty} \gamma^k (P^\pi)^k r^\pi$$
<p>노이만 급수의 $k$번째 항은 "정확히 $k$ 스텝 뒤에 받는 기대 보상"이다. 리턴의 정의 $\sum_k \gamma^k r_{t+k+1}$를 기댓값으로 바꾼 것과 정확히 같다. $\gamma<1$이고 $P^\pi$가 확률행렬이라 스펙트럼 반지름이 1 이하이므로 역행렬이 존재한다. 이 역행렬의 행은 뒤에서 <strong>후계자 표현(successor representation)</strong>이라는 이름으로 다시 등장한다(<a href="#qviews">08장</a>).</p>

<h2>벨만 방정식이 다시 등장하는 곳</h2>
<div class="table-wrap"><table class="t">
<thead><tr><th>이름</th><th>벨만 식의 형태</th><th>무엇이 바뀌었나</th></tr></thead>
<tbody>
<tr><td>TD(0) <a href="#td">06</a></td><td>$V(s) \leftarrow V(s) + \alpha[r + \gamma V(s') - V(s)]$</td><td>기댓값 → 한 샘플, 정확한 해 → 확률적 근사</td></tr>
<tr><td>Q-learning <a href="#qlearning">07</a></td><td>$Q(s,a) \leftarrow Q + \alpha[r + \gamma\max_{a'}Q(s',a') - Q]$</td><td>$\mathcal{T}^*$의 샘플 버전, off-policy</td></tr>
<tr><td>DQN <a href="#dqn">10</a></td><td>$\big(r + \gamma\max_{a'}Q_{\bar\theta}(s',a') - Q_\theta(s,a)\big)^2$</td><td>표 → 신경망, 타깃 고정($\bar\theta$)</td></tr>
<tr><td>Soft Q / SAC <a href="#maxent">14</a></td><td>$Q = r + \gamma\,\mathbb{E}[\beta\log\sum_{a'}e^{Q(s',a')/\beta}]$</td><td>$\max$ → log-sum-exp (엔트로피 정규화)</td></tr>
<tr><td>분포형 RL <a href="#qviews">08</a></td><td>$Z(s,a) \overset{D}{=} R + \gamma Z(s',a')$</td><td>기댓값 → 분포 전체</td></tr>
<tr><td>LLM 토큰 가치 <a href="#llm-mdp">18</a></td><td>$Q(s_t, w_t) = r_t + V(s_t \oplus w_t)$</td><td>결정적 전이, $\gamma=1$, 끝 보상</td></tr>
</tbody></table></div>
`,
    mount: {
      'dv-expect': (el) => ui.derivation(el, {
        title: '$G_t$의 재귀식에서 $V^\\pi$의 벨만 방정식으로',
        easy: '"리턴 = 첫 점수 + 할인된 나머지 리턴"에 평균을 씌우면 "가치 = 바로 받는 점수의 평균 + 할인된 다음 칸 가치의 평균"이 된다. 과거는 필요 없고 지금 칸만 알면 된다(마르코프 성질).',
        steps: [
          { tex: String.raw`V^\pi(s) = \mathbb{E}_\pi\left[G_t \mid s_t = s\right]`, why: '가치 함수의 정의에서 출발한다.' },
          { tex: String.raw`= \mathbb{E}_\pi\left[\hl{r_{t+1} + \gamma G_{t+1}} \mid s_t = s\right]`, why: '리턴의 재귀식 $G_t = r_{t+1} + \\gamma G_{t+1}$을 대입한다.' },
          { tex: String.raw`= \hl{\sum_a \pi(a|s)}\;\mathbb{E}\left[r_{t+1} + \gamma G_{t+1} \mid s_t = s, a_t = a\right]`, why: '전확률 법칙으로 첫 행동 $a$에 대해 나눈다. 행동은 정책 $\\pi$에서 나온다.' },
          { tex: String.raw`= \sum_a \pi(a|s) \hl{\sum_{s'} P(s'|s,a)}\Big[R(s,a) + \gamma\,\mathbb{E}_\pi\left[G_{t+1} \mid \hl{s_{t+1} = s'}\right]\Big]`, why: '다음 상태 $s\'$에 대해 다시 나눈다. <strong>마르코프 성질</strong> 덕분에 $G_{t+1}$의 기댓값은 $s_{t+1}=s\'$만 알면 되고 $s_t, a_t$는 더 필요 없다.' },
          { tex: String.raw`\boxed{\,V^\pi(s) = \sum_a \pi(a|s)\Big[R(s,a) + \gamma \sum_{s'} P(s'|s,a)\, \hl{V^\pi(s')}\Big]\,}`, why: '안쪽 기댓값이 바로 $V^\\pi(s\')$이다. 가치가 자기 자신으로 표현되는 <strong>벨만 기대 방정식</strong>.' },
          { tex: String.raw`Q^\pi(s,a) = R(s,a) + \gamma\sum_{s'}P(s'|s,a)\hl{\sum_{a'}\pi(a'|s')\,Q^\pi(s',a')}`, why: '같은 논리를 $Q$에 적용하면 행동 가치 버전이 나온다. SARSA(07장)는 이 식의 샘플 버전이다.' },
        ],
      }),
      'fx-expect': (el) => ui.formula(el, {
        title: '벨만 기대 방정식 해부',
        say: '{V|지금 칸의 가치}는, {pi|내가 고를 행동들을 확률만큼 섞어서}, {R|바로 받는 점수}에 {Vn|다음 칸의 가치}를 {g|할인율}만큼 깎아 더한 값이다. 다음 칸이 여럿이면 {P|도착할 확률만큼 평균}을 낸다.',
        tex: String.raw`\tm{V}{V^\pi(s)} = \tm{pi}{\sum_a \pi(a|s)} \Big[\, \tm{R}{R(s,a)} + \tm{g}{\gamma} \tm{P}{\sum_{s'} P(s'|s,a)} \, \tm{Vn}{V^\pi(s')} \,\Big]`,
        terms: [
          { id: 'V', sym: 'V^\\pi(s)', label: '현재 상태 가치', desc: '좌변: 알고 싶은 값.' },
          { id: 'pi', sym: '\\sum_a\\pi(a|s)', label: '정책 평균', desc: '내가 고를 행동에 대한 가중 평균.', long: '이 자리를 $\\max_a$로 바꾸면 최적 방정식, log-sum-exp로 바꾸면 soft 방정식이 된다. 같은 자리에서 정책 평가와 정책 개선이 갈린다.' },
          { id: 'R', sym: 'R(s,a)', label: '즉시 보상', desc: '한 스텝의 기대 보상.' },
          { id: 'g', sym: '\\gamma', label: '할인율 = 축약 계수', desc: '이 값이 1보다 작아서 반복이 수렴한다.', long: '아래 축약 증명에서 정확히 이 $\\gamma$가 오차를 줄이는 비율로 나온다. 할인율이 곧 수렴 속도다.' },
          { id: 'P', sym: "\\sum_{s'}P(s'|s,a)", label: '환경 평균', desc: '다음 상태에 대한 가중 평균(모델).', long: '모델 기반 방법은 이 합을 직접 계산하고(DP), 모델 프리 방법은 실제로 한 번 가 본 $s\'$ 하나로 대신한다(TD). 이 차이가 03장과 06장을 가른다.' },
          { id: 'Vn', sym: "V^\\pi(s')", label: '다음 상태 가치', desc: '부트스트랩: 추정치로 추정치를 갱신.', long: '실제 리턴 대신 자기 자신의 추정값을 쓰는 것을 부트스트래핑이라 한다. 분산은 줄지만 추정이 틀리면 편향이 생긴다(T6). 함수근사와 결합하면 발산할 수도 있다(T8).' },
        ],
      }),
      'fx-opt': (el) => ui.formula(el, {
        title: '벨만 최적 방정식 (Q 형태)',
        say: '{Q|이 행동의 최고 기대 총점}은 {R|바로 받는 점수}에, 다음 칸에서 {max|가장 좋은 행동을 했을 때의} {Qn|가치}를 할인해서 더한 것이다. 다음 칸이 여럿이면 {P|도착할 확률만큼 평균}을 낸다.',
        tex: String.raw`\tm{Q}{Q^*(s,a)} = \tm{R}{R(s,a)} + \gamma\,\tm{P}{\mathbb{E}_{s'\sim P(\cdot|s,a)}}\Big[\,\tm{max}{\max_{a'}}\; \tm{Qn}{Q^*(s',a')}\,\Big]`,
        terms: [
          { id: 'Q', sym: 'Q^*(s,a)', label: '최적 행동 가치', desc: 'a를 하고 이후 최적으로 행동할 때의 기대 리턴.' },
          { id: 'R', sym: 'R(s,a)', label: '즉시 보상', desc: '한 스텝 보상.' },
          { id: 'P', sym: "\\mathbb{E}_{s'}", label: '환경 평균', desc: '샘플 하나로 근사하면 Q-learning 타깃이 된다.' },
          { id: 'max', sym: '\\max_{a\'}', label: '최대화', desc: '다음 상태에서 최선의 행동을 가정.', long: '이 $\\max$가 off-policy 학습을 가능케 한다. 데이터를 모은 정책과 무관하게 "최선이라면"을 계산하기 때문이다. 동시에 잡음이 있는 추정치에 max를 씌우면 위로 편향된다(과대추정, T8 · 10장 Double DQN).' },
          { id: 'Qn', sym: "Q^*(s',a')", label: '다음 상태 최적 가치', desc: '부트스트랩 타깃.' },
        ],
      }),
      'dv-contract': (el) => ui.derivation(el, {
        title: '$\\mathcal{T}^*$는 $\\gamma$-축약이다',
        easy: '서로 다른 가치표 두 장을 넣고 벨만 계산을 한 번 돌리면, 두 표의 가장 큰 차이가 적어도 γ배로 줄어든다. 차이가 계속 줄어드니 결국 하나의 표로 모이고, 그 표가 정답이다.',
        caption: '두 임의의 가치 함수 $V, U$에 대해 연산자를 적용한 뒤의 거리가 원래 거리의 $\\gamma$배 이하임을 보인다.',
        steps: [
          { tex: String.raw`|(\mathcal{T}^*V)(s) - (\mathcal{T}^*U)(s)| = \Big|\max_a f_V(a) - \max_a f_U(a)\Big|,\quad f_V(a) = R(s,a) + \gamma\textstyle\sum_{s'}P(s'|s,a)V(s')`, why: '한 상태 $s$에서의 차이를 본다.' },
          { tex: String.raw`\Big|\max_a f_V(a) - \max_a f_U(a)\Big| \;\le\; \hl{\max_a\, |f_V(a) - f_U(a)|}`, why: '최댓값끼리의 차이는 원소별 차이의 최댓값을 넘지 않는다. (max는 1-립시츠)' },
          { tex: String.raw`= \max_a\, \gamma\,\Big|\sum_{s'}P(s'|s,a)\big(V(s') - U(s')\big)\Big|`, why: '보상 $R(s,a)$은 양쪽에서 같으므로 상쇄된다.' },
          { tex: String.raw`\le \max_a\, \gamma \sum_{s'}P(s'|s,a)\,\hl{|V(s') - U(s')|} \le \gamma\,\hl{\|V - U\|_\infty}`, why: '삼각부등식 후, 확률 가중평균은 최댓값을 넘지 않는다($\\sum_{s\'}P=1$).' },
          { tex: String.raw`\boxed{\;\|\mathcal{T}^*V - \mathcal{T}^*U\|_\infty \le \gamma\,\|V - U\|_\infty\;}`, why: '모든 $s$에 대해 성립하므로 sup을 취한다. $\\gamma<1$이면 축약.' },
          { tex: String.raw`\|V_k - V^*\|_\infty = \|\mathcal{T}^*V_{k-1} - \mathcal{T}^*V^*\|_\infty \le \gamma\|V_{k-1} - V^*\|_\infty \le \cdots \le \hl{\gamma^k}\|V_0 - V^*\|_\infty`, why: '$V^*$가 고정점이라는 사실을 쓰면 오차 상한이 바로 나온다. 유일성: 두 고정점 $V, U$가 있다면 $\\|V-U\\| \\le \\gamma\\|V-U\\|$이므로 $V=U$.' },
        ],
      }),
      'vi-sim': mountVI,
      corridor: mountCorridor,
      'step-corridor': (el) => ui.walkthrough(el, {
        title: '복도 다섯 칸의 가치를 거꾸로 채우기',
        caption: '칸 1~5가 일렬로 있고, 5번 칸에 들어가면 10점을 받고 끝난다. 오른쪽으로 한 칸씩 가는 데는 점수가 없고, 할인율은 $\\gamma = 0.9$다. 5번 바로 옆 칸부터 거꾸로 채워 보자.',
        steps: [
          { say: '4번 칸에서 오른쪽으로 가면 바로 10점을 받고 끝난다. 4번 칸의 가치는?', ask: { answer: 10 }, calc: String.raw`V(4) = 10` },
          { say: '3번 칸은 점수 0을 받고 4번 칸으로 간다. 4번 칸의 가치를 한 번 할인하면?', ask: { answer: 9 }, calc: String.raw`V(3) = 0 + 0.9 \times V(4) = 0.9 \times 10 = 9` },
          { say: '같은 규칙으로 2번 칸은?', ask: { answer: 8.1, tol: 0.01 }, calc: String.raw`V(2) = 0 + 0.9 \times 9 = 8.1` },
          { say: '1번 칸은?', ask: { answer: 7.29, tol: 0.01 }, calc: String.raw`V(1) = 0 + 0.9 \times 8.1 = 7.29` },
          { say: '방금 쓴 규칙 "이 칸의 가치 = 바로 받는 점수 + γ × 다음 칸 가치"가 벨만 방정식이다. 목표에서 멀어질수록 가치가 γ배씩 줄어드는 모습이 앞 장의 할인과 같다.', calc: String.raw`V(s) = r + \gamma\, V(s')` },
        ],
      }),
    },
    tacit: [
      { tag: 'math', t: '"축약이냐"를 먼저 묻는 습관',
        d: '<p>새 알고리즘을 보면 고수들은 먼저 "이 업데이트는 어떤 노름에서 어떤 연산자의 축약인가"를 묻는다. 축약이면 고정점의 존재·유일성·수렴 속도가 한 번에 따라온다. TD(λ)는 $\\mathcal{T}^{\\lambda}$의 축약, soft Bellman은 log-sum-exp가 1-립시츠라서 축약, 분포형 Bellman은 Wasserstein 거리에서 축약(단 KL에서는 아님) 같은 식이다. 축약이 안 되는 곳(함수근사+off-policy)이 곧 연구 주제가 된다.</p>' },
      { tag: 'math', t: 'max는 1-립시츠이고, 그것이 전부다',
        d: '<p>축약 증명의 핵심 부등식 $|\\max f - \\max g| \\le \\max|f-g|$만 있으면 된다. 그래서 $\\max$ 자리에 어떤 1-립시츠 집계 연산(softmax 평균, log-sum-exp, mellowmax, 기대값)을 넣어도 축약이 유지된다. 반대로 볼츠만 가중 평균 $\\sum_a \\mathrm{softmax}(Q)_a Q_a$는 립시츠 상수가 1을 넘을 수 있어 수렴이 깨질 수 있다는 것이 알려져 있다(Asadi & Littman 2017, mellowmax).</p>' },
      { tag: 'algo', t: '$k$번 가치 반복 = $k$-스텝 최적 계획',
        d: '<p>$V_0=0$에서 시작한 $V_k$는 정확히 "남은 시간이 $k$ 스텝일 때의 최적 가치"다. 그래서 가치 반복은 시간 역순 동적계획(backward induction)과 같고, 초기 몇 스윕의 탐욕 정책은 근시안적이다. MCTS의 깊이, LLM 추론의 lookahead 길이도 같은 관점으로 볼 수 있다.</p>' },
      { tag: 'algo', t: '정책은 가치보다 훨씬 먼저 수렴한다',
        d: '<p>탐욕 정책은 $Q$의 <em>순서</em>만 보므로, 가치가 최적과 행동 간격(action gap)의 절반 이내로만 들어오면 더 바뀌지 않는다. 그래서 정책 반복은 보통 한 자릿수 반복으로 끝나고, 실전에서 가치 추정이 꽤 틀려도 정책은 멀쩡한 경우가 많다. 반대로 행동 간격이 작은 문제(거의 같은 행동들)는 작은 추정 잡음에도 정책이 요동친다. 이 관찰이 advantage learning, dueling 구조의 동기다.</p>' },
      { tag: 'math', t: '$(I-\\gamma P)^{-1}$은 RL의 그린 함수',
        d: '<p>$V^\\pi = (I-\\gamma P^\\pi)^{-1}r$에서 행렬 $M = (I-\\gamma P^\\pi)^{-1}$의 $(s,s\')$ 원소는 "$s$에서 출발해 $s\'$를 할인 방문하는 기대 횟수"다. 보상과 동역학이 분리된다: 보상만 바뀌면 $M$을 재사용해 새 가치를 즉시 계산한다(후계자 표현, 08장). 또 $M$의 행을 $(1-\\gamma)$로 정규화하면 할인 방문 분포 $d^\\pi$가 되어 정책 경사 정리와 성능 차이 보조정리(T4)에 그대로 등장한다.</p>' },
    ],
    quiz: [
      { q: '벨만 기대 방정식에서 벨만 최적 방정식으로 갈 때 바뀌는 연산은?', options: ['$\\sum_{s\'}P$ → $\\max_{s\'}$', '$\\sum_a \\pi(a|s)$ → $\\max_a$', '$\\gamma$ → 1', '$R$ → $\\max R$'], answer: 1,
        explain: '환경에 대한 평균은 그대로 두고, 정책에 대한 평균을 최선의 행동 선택으로 바꾼다.' },
      { q: '$\\gamma = 0.9$에서 가치 반복의 초기 오차가 10일 때, 오차 상한이 0.01 이하가 되려면 대략 몇 번의 스윕이 필요한가?', options: ['약 7번', '약 22번', '약 66번', '약 1000번'], answer: 2,
        explain: '$10\\cdot0.9^k \\le 0.01 \\Rightarrow k \\ge \\log(10^{-3})/\\log 0.9 \\approx 65.6$. 축약 계수 $\\gamma$가 1에 가까울수록 느려진다.' },
      { q: '벨만 기대 방정식 유도에서 마르코프 성질이 쓰이는 곳은?', options: ['리턴을 재귀식으로 바꿀 때', '첫 행동으로 조건을 나눌 때', '$\\mathbb{E}[G_{t+1}|s_t,a_t,s_{t+1}]$를 $V^\\pi(s_{t+1})$로 바꿀 때', '$\\gamma$를 밖으로 꺼낼 때'], answer: 2,
        explain: '다음 상태를 알면 과거($s_t, a_t$)가 미래 리턴에 추가 정보를 주지 않는다는 것이 마르코프 성질이다.' },
      { q: '함수근사를 쓰면 축약 보장이 깨질 수 있는 이유로 가장 적절한 것은?', options: ['$\\gamma$가 1이 되어서', '근사 공간으로의 투영과 벨만 백업의 합성이 sup-노름 축약이 아닐 수 있어서', '보상이 무한대가 되어서', 'max 연산이 사라져서'], answer: 1,
        explain: '$\\Pi\\mathcal{T}$에서 투영 $\\Pi$가 sup-노름 비확장이 아니면 합성 연산자가 축약이 아닐 수 있다. 09장의 Deadly Triad에서 구체적 발산 예를 본다.' },
    ],
  });

  /* ---------- 복도 가치 반복: 계산식을 그대로 보여 준다 ---------- */
  function mountCorridor(el) {
    const p = ui.panel(el, { kind: 'TRY', title: '복도에서 한 번씩 반복하기', caption: '칸 0과 6은 끝 칸이다. 오른쪽 끝에 닿으면 +10, 왼쪽 끝에 닿으면 −5. 한 칸 움직일 때마다 이동 점수(비용)를 받는다. 각 칸은 왼쪽과 오른쪽 중 더 좋은 쪽을 고른다.' });
    const ctr = ui.row(p.body);
    const gS = ui.slider(ctr, { label: '할인율 $\\gamma$', min: 0.5, max: 0.99, step: 0.01, value: 0.9, format: ui.fmt.f(2), onInput: () => reset(start) });
    const cS = ui.slider(ctr, { label: '이동 점수', min: -2, max: 0, step: 0.1, value: 0, format: ui.fmt.f(1), onInput: () => reset(start) });
    const btns = ui.row(p.body, 'btns');
    ui.button(btns, '한 번 반복', step, { primary: true });
    ui.button(btns, '0에서 다시 시작', () => reset('zero'));
    ui.button(btns, '엉뚱한 값에서 시작', () => reset('wild'));
    const st = ui.stats(p.body, [{ key: 'k', label: '반복 횟수' }, { key: 'd', label: '이번에 가장 크게 바뀐 칸의 변화' }]);
    const strip = document.createElement('div');
    strip.style.cssText = 'display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:4px';
    const lines = document.createElement('div');
    lines.className = 'log';
    lines.style.maxHeight = '220px';
    p.body.append(strip, lines);
    const N = 7;
    let V, k, start = 'zero';
    function reset(kind) {
      start = kind;
      V = new Array(N).fill(0);
      if (kind === 'wild') for (let i = 1; i < N - 1; i++) V[i] = [20, -15, 7, 30, -8][i - 1];
      k = 0;
      draw([], NaN);
    }
    function step() {
      const g = gS.get(), c = cS.get();
      const nv = V.slice(), out = [];
      let d = 0;
      for (let i = 1; i < N - 1; i++) {
        const left = i - 1 === 0 ? c - 5 : c + g * V[i - 1];
        const right = i + 1 === N - 1 ? c + 10 : c + g * V[i + 1];
        nv[i] = Math.max(left, right);
        d = Math.max(d, Math.abs(nv[i] - V[i]));
        const lt = i - 1 === 0 ? c.toFixed(1) + ' + (−5)' : c.toFixed(1) + ' + ' + g.toFixed(2) + '×' + V[i - 1].toFixed(2);
        const rt = i + 1 === N - 1 ? c.toFixed(1) + ' + 10' : c.toFixed(1) + ' + ' + g.toFixed(2) + '×' + V[i + 1].toFixed(2);
        out.push('칸 ' + i + ':  max( 왼쪽 ' + lt + ' = ' + left.toFixed(2) + ',  오른쪽 ' + rt + ' = ' + right.toFixed(2) + ' )  →  ' + nv[i].toFixed(2));
      }
      V = nv; k++;
      draw(out, d);
    }
    function draw(out, d) {
      strip.innerHTML = '';
      const vmax = Math.max(10, ...V.map(Math.abs));
      for (let i = 0; i < N; i++) {
        const term = i === 0 || i === N - 1;
        const v = term ? (i === 0 ? -5 : 10) : V[i];
        const pct = Math.round((Math.abs(v) / vmax) * 60);
        const col = v >= 0 ? 'var(--pos)' : 'var(--neg)';
        const cell = document.createElement('div');
        cell.style.cssText = 'border:1px solid var(--line);border-radius:6px;padding:8px 2px;text-align:center;font-family:var(--font-mono);font-size:var(--fs-sm);background:color-mix(in srgb, ' + col + ' ' + pct + '%, var(--surface))';
        cell.innerHTML = '<div style="font-size:var(--fs-xs);color:var(--muted)">' + (term ? (i === 0 ? '끝 −5' : '끝 +10') : '칸 ' + i) + '</div>' + (term ? '' : v.toFixed(2));
        strip.appendChild(cell);
      }
      st.set('k', k);
      st.set('d', Number.isFinite(d) ? d.toFixed(3) : '–');
      lines.textContent = out.length ? out.join('\n') : '"한 번 반복"을 누르면 각 칸의 계산식이 여기에 나온다. 처음 몇 번은 오른쪽 끝의 +10이 한 칸씩 왼쪽으로 번지는 것을 보라.';
    }
    reset('zero');
  }

  function mountVI(el) {
    const p = ui.panel(el, { kind: 'SIM', title: '가치 반복 (Value Iteration)' });
    const ctr = ui.row(p.body);
    let layoutKey = 'classic';
    let env, V, Vstar, k, errs;
    const gS = ui.slider(ctr, { label: '할인율 $\\gamma$', min: 0.5, max: 0.99, step: 0.01, value: 0.9, format: ui.fmt.f(2), onInput: rebuild });
    const sS = ui.slider(ctr, { label: '미끄러질 확률', min: 0, max: 0.6, step: 0.05, value: 0.2, format: ui.fmt.f(2), onInput: rebuild });
    const cS = ui.slider(ctr, { label: '이동 보상(비용)', min: -0.2, max: 0.05, step: 0.01, value: -0.04, format: ui.fmt.f(2), onInput: rebuild });
    ui.select(ctr, { label: '맵', value: layoutKey, options: [{ value: 'classic', label: '4×3 고전 격자' }, { value: 'maze', label: '10×6 미로' }], onChange: (v) => { layoutKey = v; rebuild(); } });
    const btns = ui.row(p.body, 'btns');
    ui.button(btns, '1 스윕', () => sweep(1), { primary: true });
    ui.button(btns, '10 스윕', () => sweep(10));
    const playB = ui.button(btns, '자동 재생', () => { if (lp.running) { lp.stop(); playB.textContent = '자동 재생'; } else { lp.start(); playB.textContent = '정지'; } });
    ui.button(btns, '초기화 ($V_0=0$)', rebuild);
    const st = ui.stats(p.body, [
      { key: 'k', label: '스윕 $k$' },
      { key: 'd', label: '$\\|V_{k}-V_{k-1}\\|_\\infty$' },
      { key: 'e', label: '$\\|V_k - V^*\\|_\\infty$', tone: 'accent' },
      { key: 'b', label: '이론 상한 $\\gamma^k\\|V_0-V^*\\|$', tone: 'signal' },
    ]);
    const split = document.createElement('div');
    split.className = 'w-split';
    const left = document.createElement('div');
    const right = document.createElement('div');
    split.append(left, right);
    p.body.appendChild(split);
    RL.renderMath(p.body);
    let grid = null;
    const chart = plot.line(right, { height: 260, x: { label: '스윕 k', min: 0 }, y: { label: 'log₁₀ ‖V_k − V*‖∞' }, series: [] });
    const lp = ui.loop(() => { sweep(1); if (k > 300) { playB.textContent = '자동 재생'; return false; } }, 8);

    function rebuild() {
      const L = sim.layouts[layoutKey];
      const rewards = layoutKey === 'classic' ? { G: 1, X: -1 } : { G: 1 };
      env = new sim.GridWorld(L, { rewards, step: cS.get(), slip: sS.get() });
      V = new Array(env.nS).fill(0);
      Vstar = env.solve(gS.get());
      k = 0;
      errs = [[0, Math.log10(Math.max(1e-12, maxAbsDiff(V, Vstar)))]];
      left.innerHTML = '';
      grid = sim.renderGrid(left, env, { V, pi: env.greedy(V, gS.get()) });
      upd(NaN);
    }
    function maxAbsDiff(a, b) { let m = 0; for (let i = 0; i < a.length; i++) m = Math.max(m, Math.abs(a[i] - b[i])); return m; }
    function sweep(n) {
      let d = 0;
      for (let i = 0; i < n; i++) {
        const r = env.viSweep(V, gS.get());
        V = r.V; d = r.delta; k++;
        errs.push([k, Math.log10(Math.max(1e-12, maxAbsDiff(V, Vstar)))]);
      }
      upd(d);
    }
    function upd(d) {
      const gm = gS.get();
      const e0 = Math.pow(10, errs[0][1]);
      grid.update({ V, pi: env.greedy(V, gm) });
      st.set('k', k);
      st.set('d', Number.isFinite(d) ? d.toExponential(2) : '–');
      st.set('e', maxAbsDiff(V, Vstar).toExponential(2));
      st.set('b', (Math.pow(gm, k) * e0).toExponential(2));
      const kmax = Math.max(20, k);
      chart.update({
        x: { label: '스윕 k', min: 0, max: kmax },
        y: { label: 'log₁₀ ‖V_k − V*‖∞', min: Math.min(-6, Math.floor(Math.min(...errs.map((x) => x[1])))), max: Math.ceil(errs[0][1] + 0.3) },
        series: [
          { name: '실제 오차', color: 'c1', data: errs },
          { name: '상한 $\\gamma^k\\|V_0-V^*\\|_\\infty$', color: 'signal', dash: '5 4', data: [[0, errs[0][1]], [kmax, errs[0][1] + kmax * Math.log10(gm)]] },
        ],
      });
    }
    rebuild();
  }
})();
