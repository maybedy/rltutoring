/* 06 MC와 TD, n-step, TD(λ) */
(function () {
  const { ui, sim, plot } = RL;

  RL.chapter({
    id: 'td',
    title: 'MC와 TD, n-step, TD(λ)',
    subtitle: '모델 없이 경험만으로 가치를 추정하는 두 극단: 끝까지 기다려 실제 리턴을 쓰는 몬테카를로, 한 스텝 뒤의 추정치를 믿는 TD. 그 사이를 잇는 n-step과 λ, 그리고 모든 것의 원자인 TD 오차 δ.',
    time: 40,
    level: '기초 · 핵심',
    prereq: ['bellman', 'dp'],
    theses: ['T6', 'T1', 'T8'],
    easy: {
      hook: '결과가 나올 때까지 기다리지 않고, "한 걸음 뒤의 새 예상"으로 지금의 예상을 바로 고칠 수 있다.',
      intro: '<p>퇴근길 도착 시간을 예상한다고 하자. 사무실을 나서며 "30분 걸리겠다"고 생각했는데, 엘리베이터에서 10분을 기다렸다. 아직 집에 안 갔지만 "오늘은 40분쯤 걸리겠다"고 바로 예상을 고친다.</p><p>집에 도착할 때까지 기다렸다가 고치는 방법이 <strong>몬테카를로(MC)</strong>, 한 걸음 뒤의 새 예상으로 바로 고치는 방법이 <strong>TD</strong>다. 두 예상의 차이(10분 늦어짐)를 <strong>TD 오차</strong>라 부르고, 이 작은 차이가 학습 신호가 된다.</p>',
      analogy: '일기예보를 채점하는 방법과 같다. 일주일 뒤 실제 날씨를 보고 채점하면(MC) 정확하지만, 그 사이 온갖 우연이 섞여 점수가 들쭉날쭉하다. 내일 나온 새 예보와 비교해 오늘 예보를 고치면(TD) 금방 안정되지만, 내일 예보가 틀렸다면 그 틀림까지 따라간다. 며칠 뒤까지 기다렸다 채점할지 정하는 손잡이가 n과 λ다.',
      path: ['다섯 칸의 예상을 직접 정해 보고, 한 걸음마다 생기는 빗나감(δ)을 확인한다', 'TD 업데이트 한 번과 MC 업데이트 한 번을 숫자로 손계산한다', '랜덤 워크에서 MC와 TD를 겨루게 해 누가 빨리 정답에 가까워지는지 본다', '"몇 걸음 뒤까지 기다릴지"(n, λ)를 바꿔 가며 가장 좋은 중간값을 찾는다'],
      recap: [
        'MC는 끝까지 기다려 실제 결과로 예상을 고치고, TD는 한 걸음 뒤의 새 예상으로 바로 고친다.',
        '"받은 점수 + 다음 예상 − 지금 예상"인 TD 오차가 학습 신호이며, 이 오차들을 끝까지 다 더하면 MC의 오차가 된다.',
        '오래 기다릴수록 치우침은 없지만 들쭉날쭉하고, 빨리 고칠수록 안정적이지만 예상이 틀린 만큼 치우친다. 보통 그 중간이 가장 좋다.',
      ],
    },
    goals: [
      'MC와 TD(0)의 업데이트를 쓰고, TD가 벨만 기대 연산자의 확률적 근사임을 설명할 수 있다.',
      'MC 오차가 TD 오차의 할인 합 $G_t - V(s_t) = \\sum_k \\gamma^k\\delta_{t+k}$임을 유도할 수 있다.',
      'n-step 리턴과 λ-리턴이 편향-분산 손잡이(T6)라는 것을 랜덤 워크 실험으로 확인한다.',
      '전방(λ-리턴) 관점과 후방(eligibility trace) 관점이 같은 업데이트임을 보일 수 있다.',
    ],
    html: String.raw`
<p>DP는 모델 $P$를 알아야 기댓값 $\sum_{s'}P(s'|s,a)V(s')$를 계산할 수 있었다. 모델 없이 가치를 추정하려면 그 기댓값을 <strong>샘플</strong>로 대신해야 한다. 무엇을 샘플로 대신하느냐에 따라 두 가족이 갈린다.</p>

<h2>몬테카를로: 실제 리턴을 기다린다</h2>
<p>에피소드를 끝까지 진행해 실제 리턴 $G_t$를 얻고, 그 상태의 가치를 $G_t$ 쪽으로 옮긴다.</p>
$$V(s_t) \leftarrow V(s_t) + \alpha\big[\,G_t - V(s_t)\,\big]$$
<p>$\mathbb{E}[G_t\mid s_t] = V^\pi(s_t)$이므로 타깃이 <strong>불편(unbiased)</strong>이다. 대신 $G_t$에는 이후 모든 행동과 전이의 무작위성이 쌓여 <strong>분산이 크다</strong>. 그리고 에피소드가 끝나야 업데이트할 수 있다.</p>

<h2>TD(0): 한 스텝 뒤의 추정치를 믿는다</h2>
<p>리턴의 재귀식 $G_t = r_{t+1} + \gamma G_{t+1}$에서 $G_{t+1}$을 현재 추정치 $V(s_{t+1})$로 바꾼 것이 TD(Temporal Difference, Sutton 1988)다.</p>
<div data-w="fx-td"></div>
<div data-w="step-td"></div>
<div data-w="dv-sa"></div>
<p>TD는 벨만 기대 방정식(<a href="#bellman">02장</a>)을 샘플 하나로 푸는 셈이다. 타깃이 자기 자신의 추정치에 의존하므로(<em>부트스트래핑</em>) 추정이 틀린 동안은 <strong>편향</strong>이 있지만, 한 스텝의 무작위성만 들어가므로 <strong>분산이 작다</strong>. 또 매 스텝 바로 업데이트할 수 있고 끝나지 않는 문제에도 쓸 수 있다.</p>
<p>표 형태(tabular) TD(0)는 각 상태가 무한히 방문되고 학습률이 Robbins–Monro 조건 $\sum_t\alpha_t = \infty,\ \sum_t\alpha_t^2 < \infty$을 만족하면 확률 1로 $V^\pi$에 수렴한다(Dayan 1992; Jaakkola, Jordan, Singh 1994). 수렴의 뼈대는 결국 $\mathcal{T}^\pi$의 축약성(T1)이다.</p>

<h2>TD 오차 δ: 모든 것의 원자</h2>
<p>먼저 δ를 직접 만들어 보자. 아래에서 다섯 칸의 예상을 내가 정하는 "평가자(critic)"가 되어, 내 예상이 어디서 빗나가는지 δ로 확인한다.</p>
<div data-w="try-critic"></div>
<p>$\delta_t = r_{t+1} + \gamma V(s_{t+1}) - V(s_t)$는 "한 스텝 동안 예측이 얼마나 틀렸나"이다. 이 작은 양이 이후 거의 모든 알고리즘의 재료가 된다. 첫 번째 이유는 다음 항등식이다.</p>
<div data-w="dv-sum"></div>
<p>즉 MC의 오차는 TD 오차들의 할인 합이다. MC와 TD는 "TD 오차를 몇 개 더할 것인가"의 양 끝이다. 이 관점에서 n-step은 $n$개를 더하고, TD(λ)와 GAE(<a href="#ac">12장</a>)는 $(\gamma\lambda)^k$로 가중해 더한다. 또 정확한 $V^\pi$에서는 $\mathbb{E}[\delta_t\mid s_t, a_t] = Q^\pi(s_t,a_t) - V^\pi(s_t) = A^\pi(s_t,a_t)$이므로, TD 오차는 <strong>advantage의 한 샘플 추정치</strong>다. actor-critic이 TD 오차로 정책을 밀어주는 이유다.</p>

<div class="thesis-box"><span class="label">대전제 T6 · 편향-분산</span>
<p>MC 타깃 $G_t$: 편향 0, 분산 큼(이후 $T-t$ 스텝의 무작위성 전부). TD 타깃 $r_{t+1}+\gamma V(s_{t+1})$: 분산 작음(한 스텝), 편향은 $\gamma(V(s_{t+1}) - V^\pi(s_{t+1}))$. 부트스트랩을 늦출수록(n을 키울수록) 편향은 $\gamma^n$으로 줄고 분산은 늘어난다. 이 하나의 손잡이가 n-step TD, TD(λ), GAE의 λ, DQN의 n-step 리턴, PPO의 γ·λ, GRPO의 그룹 baseline에 반복해서 나타난다.</p>
</div>

<h2>실험: 5-상태 랜덤 워크</h2>
<p>Sutton & Barto(예제 6.2)의 고전 실험이다. 상태 A–E, C에서 출발해 매 스텝 좌우로 반반 확률로 이동한다. 오른쪽 끝에 닿으면 보상 1, 왼쪽 끝은 0이다($\gamma=1$). 참 가치는 $1/6, 2/6, \dots, 5/6$이다. 모든 추정치를 0.5에서 시작해 MC와 TD(0)를 같은 에피소드 수만큼 학습시킨 뒤, 상태 평균 RMS 오차를 여러 실행에 걸쳐 평균낸다.</p>
<div data-w="rw-mc-td"></div>
<ul>
  <li>이 문제에서 TD는 대부분의 α에서 MC보다 빨리 낮은 오차에 도달한다. TD는 "B 다음엔 보통 C, C의 가치는 대략 이 정도"라는 <strong>마르코프 구조를 재활용</strong>하기 때문이다.</li>
  <li>α가 크면 둘 다 빨리 내려가지만 높은 바닥에서 출렁인다. 상수 α로는 잡음 바닥이 남고, 그 높이가 α에 비례한다.</li>
</ul>

<h3>배치 학습에서의 차이: 확실성 등가</h3>
<p>같은 유한 데이터를 수렴할 때까지 반복 학습하면 MC와 TD는 <strong>다른 답</strong>에 도달한다. Sutton & Barto 예제 6.4: 에피소드 8개가 <code>A,0,B,0</code> 한 번, <code>B,1</code> 여섯 번, <code>B,0</code> 한 번이다.</p>
<div class="table-wrap"><table class="t">
<thead><tr><th>방법</th><th>$V(B)$</th><th>$V(A)$</th><th>무엇을 최소화하나</th></tr></thead>
<tbody>
<tr><td>배치 MC</td><td class="num">0.75</td><td class="num">0</td><td>관측된 리턴에 대한 제곱오차. A에서 본 유일한 리턴이 0이었다.</td></tr>
<tr><td>배치 TD(0)</td><td class="num">0.75</td><td class="num">0.75</td><td>데이터로 추정한 MDP(A→B 확률 1)의 정확한 가치. <strong>확실성 등가(certainty-equivalence)</strong> 추정.</td></tr>
</tbody></table></div>
<p>배치 TD는 "데이터로 최대우도 모델을 만들고 그 모델을 DP로 푼 것"과 같은 답을 낸다. 마르코프 가정이 맞으면 이 답이 미래 데이터에 더 잘 맞는다. 가정이 틀리면(부분 관측, <a href="#pomdp">04장</a>) MC가 더 안전하다.</p>

<h2>n-step 리턴과 λ-리턴</h2>
<p>한 스텝만 실제 보상을 쓰는 TD(0)와 끝까지 쓰는 MC 사이에, $n$ 스텝까지 실제 보상을 쓰고 그 뒤를 부트스트랩하는 <strong>n-step 리턴</strong>이 있다.</p>
$$G_t^{(n)} = r_{t+1} + \gamma r_{t+2} + \cdots + \gamma^{n-1}r_{t+n} + \gamma^n V(s_{t+n})$$
<p>어떤 $n$이 좋은지는 문제마다 다르다. 그렇다면 모든 $n$을 기하 가중 평균하면 어떨까. 그것이 <strong>λ-리턴</strong>이다.</p>
<div data-w="fx-lambda"></div>
<div data-w="nstep-sweep"></div>
<ul>
  <li><strong>U자 곡선:</strong> 각 $n$(또는 λ)마다 최적 α가 있고, 그보다 크면 분산 때문에 급격히 나빠진다. $n$이 클수록 최적 α가 작다.</li>
  <li><strong>중간이 이긴다:</strong> 가장 낮은 오차는 보통 $n=4\sim8$이나 $\lambda \approx 0.8\sim0.9$ 근처의 중간값에서 나온다. 양 극단(TD(0), MC)은 둘 다 최적이 아니다. 이것이 T6의 실험적 모습이다.</li>
</ul>

<h2>전방 관점과 후방 관점: eligibility trace</h2>
<p>λ-리턴은 미래를 봐야 계산되므로(전방 관점) 그대로는 온라인으로 쓸 수 없다. 그러나 λ-리턴 오차도 TD 오차들의 가중 합으로 다시 쓸 수 있다. 그러면 각 시점의 $\delta_t$를 <em>과거에 방문한 상태들</em>에 거꾸로 나눠 주는 방식(후방 관점)으로 같은 업데이트를 만들 수 있다.</p>
<div data-w="dv-trace"></div>
<p>eligibility trace $e_t(s)$는 "상태 $s$가 최근에 얼마나 자주 방문되었나"의 기억이다. TD 오차가 생기면 그 책임을 최근 방문 상태들에 $e_t$ 비율로 나눈다. 이것은 RL의 <strong>신용 할당(credit assignment)</strong> 문제에 대한 가장 오래된 답 중 하나다. 에피소드 동안 가치를 갱신하지 않는 오프라인 설정에서는 두 관점의 총 업데이트가 정확히 같고, 온라인에서도 같게 만드는 수정판이 true online TD(λ)(van Seijen & Sutton 2014)다.</p>

<h2>무엇이 바뀌었나: TD 가족</h2>
<div class="table-wrap"><table class="t">
<thead><tr><th>방법</th><th>타깃</th><th>무엇이 바뀌었나</th></tr></thead>
<tbody>
<tr><td>MC</td><td>$G_t$</td><td>DP의 기댓값 → 실제 리턴 한 개</td></tr>
<tr><td>TD(0)</td><td>$r + \gamma V(s')$</td><td>리턴의 꼬리 → 현재 추정치 (부트스트랩)</td></tr>
<tr><td>n-step TD</td><td>$G^{(n)}_t$</td><td>부트스트랩 시점을 n 스텝 뒤로</td></tr>
<tr><td>TD(λ)</td><td>$G^\lambda_t$ (trace로 온라인 구현)</td><td>하나의 n 대신 모든 n의 기하 평균</td></tr>
<tr><td>SARSA, Q-learning <a href="#qlearning">07</a></td><td>$r + \gamma Q(s',a')$, $r + \gamma\max Q$</td><td>V → Q, 예측 → 제어</td></tr>
<tr><td>GAE <a href="#ac">12</a></td><td>$\sum_k(\gamma\lambda)^k\delta_{t+k}$</td><td>가치 타깃 → advantage 추정 (같은 식)</td></tr>
<tr><td>Retrace, V-trace (IMPALA)</td><td>절단된 중요도 가중 trace</td><td>on-policy → off-policy, 중요도 비율을 1에서 자름</td></tr>
<tr><td>DQN n-step, R2D2</td><td>$\sum_{k\lt n}\gamma^k r + \gamma^n\max Q_{\bar\theta}$</td><td>표 → 신경망, 리플레이와 결합 <a href="#dqn">10</a></td></tr>
</tbody></table></div>
`,
    mount: {
      'fx-td': (el) => ui.formula(el, {
        title: 'TD(0) 업데이트',
        say: '{V|이 칸의 예상}을, {r|방금 받은 점수}에 {Vn|다음 칸의 예상}을 {g|할인율}만큼 깎아 더한 값 쪽으로 {a|조금만(학습률만큼)} 옮긴다. 둘의 차이가 {d|TD 오차, 즉 "예상이 얼마나 빗나갔나"}다.',
        tex: String.raw`\tm{V}{V(s_t)} \leftarrow V(s_t) + \tm{a}{\alpha}\Big[\underbrace{\tm{r}{r_{t+1}} + \tm{g}{\gamma}\,\tm{Vn}{V(s_{t+1})}}_{\text{TD 타깃}} - V(s_t)\Big],\qquad \tm{d}{\delta_t} = r_{t+1} + \gamma V(s_{t+1}) - V(s_t)`,
        terms: [
          { id: 'V', sym: 'V(s_t)', label: '현재 추정치', desc: '갱신 대상인 표의 한 칸.' },
          { id: 'a', sym: '\\alpha', label: '학습률', desc: '상수면 최근 경험을 더 믿는 지수 이동평균.', easy: '0.1이면 빗나간 만큼의 10%만 고친다.', long: '$\\alpha = 1/N(s)$이면 표본평균, 상수면 지수 가중 평균이다. 상수 α는 비정상(nonstationary) 문제에 적응하지만 잡음 바닥이 남는다. 아래 실험에서 α가 클수록 빨리 떨어지고 높은 바닥에 머무는 것을 확인하라.' },
          { id: 'r', sym: 'r_{t+1}', label: '실제 보상', desc: '타깃 중 유일한 "진짜" 정보.' },
          { id: 'g', sym: '\\gamma', label: '할인율', desc: '' },
          { id: 'Vn', sym: 'V(s_{t+1})', label: '부트스트랩 항', desc: '미래 리턴을 추정치로 대신한다. 편향의 근원.', long: '이 항 때문에 TD는 자기 추정치로 자기 추정치를 고친다. 함수근사와 off-policy가 겹치면 이 고리가 발산으로 이어질 수 있다(T8, 09장). 종료 상태면 0으로 둔다.' },
          { id: 'd', sym: '\\delta_t', label: 'TD 오차', desc: '예측과 한 스텝 뒤 결과의 차이.', easy: '양수면 "생각보다 좋았다", 음수면 "생각보다 나빴다".', long: '도파민 뉴런의 발화가 보상 예측 오차처럼 움직인다는 관찰(Schultz, Dayan, Montague 1997)로 신경과학에서도 유명해졌다. 정확한 $V^\\pi$에서 그 조건부 기댓값은 advantage $A^\\pi(s_t,a_t)$이다.' },
        ],
      }),
      'dv-sa': (el) => ui.derivation(el, {
        title: 'TD(0)는 $\\mathcal{T}^\\pi$의 확률적 근사다',
        easy: 'TD 업데이트 한 번은 "벨만 계산 한 번" 쪽으로 조금 움직이는 것에 잡음이 섞인 것이다. 잡음은 평균이 0이라, 조금씩 여러 번 움직이면 잡음은 서로 상쇄되고 정답 쪽으로만 간다.',
        steps: [
          { tex: String.raw`(\mathcal{T}^\pi V)(s) = \mathbb{E}_\pi\big[r_{t+1} + \gamma V(s_{t+1}) \mid s_t = s\big]`, why: '벨만 기대 연산자는 "한 스텝 보상 + 다음 가치"의 기댓값이다.' },
          { tex: String.raw`\mathbb{E}\big[\delta_t \mid s_t = s\big] = (\mathcal{T}^\pi V)(s) - V(s)`, why: 'TD 오차의 조건부 기댓값은 벨만 잔차(Bellman residual)다.' },
          { tex: String.raw`V(s) \leftarrow V(s) + \alpha\Big[\hl{(\mathcal{T}^\pi V)(s) - V(s)} + \hl{\varepsilon_t}\Big],\quad \mathbb{E}[\varepsilon_t \mid s] = 0`, why: 'TD 업데이트 = (기댓값 방향) + (평균 0 잡음). 잡음 섞인 고정점 반복, 즉 Robbins–Monro 확률적 근사의 형태다.' },
          { tex: String.raw`\alpha = 1:\ V(s) \leftarrow \mathcal{T}^\pi V(s)\ (\text{잡음 없을 때}),\qquad \alpha \to 0:\ \text{잡음이 평균되어 사라짐}`, why: 'α가 크면 DP의 한 스윕에 가깝지만 잡음이 그대로 들어오고, α를 천천히 줄이면 잡음이 평균되어 고정점 $V^\\pi$로 간다.' },
        ],
      }),
      'dv-sum': (el) => ui.derivation(el, {
        title: 'MC 오차 = TD 오차의 할인 합',
        easy: '끝까지 기다린 오차(MC 오차)는 걸음마다 생긴 작은 빗나감(TD 오차)들을 할인해서 모두 더한 것과 정확히 같다. 중간의 예상값들이 더하고 빼지며 서로 지워지기 때문이다.',
        caption: '"다음 단계"를 눌러 한 줄씩 펼쳐 보라. 에피소드 동안 $V$를 바꾸지 않는다고 하자.',
        steps: [
          { tex: String.raw`G_t - V(s_t) = r_{t+1} + \gamma G_{t+1} - V(s_t)`, why: '리턴의 재귀식.' },
          { tex: String.raw`= \underbrace{r_{t+1} + \gamma V(s_{t+1}) - V(s_t)}_{\delta_t} + \gamma\big(\hl{G_{t+1} - V(s_{t+1})}\big)`, why: '$\\gamma V(s_{t+1})$을 더하고 뺀다. 괄호 안은 다음 시점의 MC 오차다.' },
          { tex: String.raw`= \delta_t + \gamma\delta_{t+1} + \gamma^2\big(G_{t+2} - V(s_{t+2})\big)`, why: '같은 전개를 반복한다.' },
          { tex: String.raw`= \sum_{k=0}^{T-t-1} \gamma^k\,\delta_{t+k}`, why: '종료 시점에서 $G_T = V(s_T) = 0$이라 꼬리가 사라진다. 망원급수(telescoping sum)다.' },
        ],
      }),
      'fx-lambda': (el) => ui.formula(el, {
        title: 'λ-리턴',
        say: '{G|λ-리턴}은 1걸음, 2걸음, 3걸음… 뒤에서 끊은 {Gn|여러 길이의 리턴}을 {l|짧은 것일수록 큰 가중치}로 섞은 평균이고, {w|가중치의 합이 1이 되도록} 맞춘다. 같은 값을 {d|걸음마다의 TD 오차}에 {gl|한 걸음마다 γλ배씩 줄어드는 가중치}를 곱해 더한 것으로 볼 수도 있다.',
        tex: String.raw`\tm{G}{G_t^{\lambda}} = \tm{w}{(1-\lambda)}\sum_{n=1}^{\infty} \tm{l}{\lambda^{n-1}}\, \tm{Gn}{G_t^{(n)}} \qquad \Longleftrightarrow \qquad G_t^\lambda - V(s_t) = \sum_{k\ge0} \tm{gl}{(\gamma\lambda)^k}\,\tm{d}{\delta_{t+k}}`,
        terms: [
          { id: 'G', sym: 'G_t^\\lambda', label: 'λ-리턴', desc: '모든 n-step 리턴의 기하 가중 평균.' },
          { id: 'w', sym: '(1-\\lambda)', label: '정규화', desc: '가중치 합을 1로 맞춘다.', long: '$(1-\\lambda)\\sum_{n\\ge1}\\lambda^{n-1} = 1$. 에피소드가 끝나면 남은 가중치 $\\lambda^{T-t-1}$이 전부 MC 리턴에 실린다.' },
          { id: 'l', sym: '\\lambda^{n-1}', label: 'n-step 가중치', desc: '짧은 리턴일수록 무겁게. λ=0이면 TD(0), λ=1이면 MC.', long: '유효 길이는 대략 $1/(1-\\lambda)$ 스텝이다. λ=0.9면 10 스텝 정도까지의 실제 보상을 섞는다.' },
          { id: 'Gn', sym: 'G_t^{(n)}', label: 'n-step 리턴', desc: 'n 스텝 실제 보상 + 부트스트랩.' },
          { id: 'gl', sym: '(\\gamma\\lambda)^k', label: '감쇠', desc: '할인 γ와 신뢰 감쇠 λ의 곱.', long: '이 $(\\gamma\\lambda)^k$가 eligibility trace의 감쇠율이며, GAE(12장)의 가중치와 정확히 같다. γ는 문제의 정의, λ는 추정의 선택이라는 차이만 있다.' },
          { id: 'd', sym: '\\delta_{t+k}', label: 'TD 오차', desc: '오른쪽 식: λ-리턴 오차도 TD 오차의 가중 합.' },
        ],
      }),
      'dv-trace': (el) => ui.derivation(el, {
        title: '전방 관점(λ-리턴) = 후방 관점(eligibility trace), 오프라인',
        easy: '"여러 걸음 뒤 결과를 기다렸다가 고치기"와 "매 걸음의 빗나감을 최근에 지나온 칸들에 나눠 주기"는 결국 같은 양을 고친다. 최근에, 그리고 자주 지나간 칸일수록 더 많이 책임진다.',
        steps: [
          { tex: String.raw`\Delta V^{\text{fwd}}(s) = \alpha\sum_{t}\mathbf{1}[s_t = s]\,\big(G^\lambda_t - V(s_t)\big) = \alpha\sum_{t}\mathbf{1}[s_t = s]\sum_{k\ge t}(\gamma\lambda)^{k-t}\delta_k`, why: '에피소드 전체에 대한 전방 업데이트의 합. λ-리턴 오차를 TD 오차의 가중합으로 바꿨다.' },
          { tex: String.raw`= \alpha\sum_{k}\delta_k\ \hl{\sum_{t\le k}(\gamma\lambda)^{k-t}\,\mathbf{1}[s_t = s]}`, why: '합의 순서를 바꾼다($t \\le k$). 바깥은 시간 $k$의 TD 오차, 안쪽은 과거 방문의 감쇠 합.' },
          { tex: String.raw`e_k(s) = \sum_{t\le k}(\gamma\lambda)^{k-t}\mathbf{1}[s_t = s] \;\Longleftrightarrow\; e_k(s) = \gamma\lambda\, e_{k-1}(s) + \mathbf{1}[s_k = s]`, why: '안쪽 합이 바로 누적(accumulating) eligibility trace이며 재귀적으로 계산된다.' },
          { tex: String.raw`\boxed{\ \Delta V^{\text{bwd}}(s) = \alpha\sum_k \delta_k\, e_k(s) = \Delta V^{\text{fwd}}(s)\ }`, why: '매 스텝 $V \\leftarrow V + \\alpha\\,\\delta_k e_k$로 모든 상태를 갱신하면 총합이 전방 관점과 같다. 미래를 기다릴 필요가 없다.' },
        ],
      }),
      'rw-mc-td': mountRandomWalk,
      'nstep-sweep': mountSweep,
      'try-critic': mountCritic,
      'step-td': (el) => ui.walkthrough(el, {
        title: 'TD 업데이트 한 번, MC 업데이트 한 번',
        caption: '칸에 답을 적고 "확인"을 누르면 계산식이 열린다. 랜덤 워크에서 지금 칸 B의 예상은 0.5, 다음 칸 C의 예상은 0.8이다. 할인율은 1, 학습률은 0.1이다.',
        steps: [
          { say: 'B에서 C로 한 걸음 갔고 점수는 0이었다. TD 타깃은 "받은 점수 + 다음 칸 예상"이다.', calc: String.raw`r + \gamma V(C) = 0 + 1 \times 0.8 = 0.8` },
          { say: 'TD 오차 δ는 "타깃 − 지금 예상"이다. 얼마일까?', ask: { answer: 0.3, tol: 0.001 }, calc: String.raw`\delta = 0.8 - 0.5 = 0.3`, note: '양수다. "B는 생각보다 좋은 칸이었다"는 뜻이다.' },
          { say: 'B의 예상을 δ의 10%만큼만 옮긴다. 새 $V(B)$는?', ask: { answer: 0.53, tol: 0.001 }, calc: String.raw`V(B) \leftarrow 0.5 + 0.1 \times 0.3 = 0.53` },
          { say: 'C에서 한 걸음 더 가서 오른쪽 끝(점수 1)에 닿았다. 끝 칸의 예상은 0이다. 이번 걸음의 δ는?', ask: { answer: 0.2, tol: 0.001 }, calc: String.raw`\delta = 1 + 0 - 0.8 = 0.2` },
          { say: 'MC라면 끝날 때까지 기다렸다가 실제 리턴 1을 쓴다. MC 업데이트라면 새 $V(B)$는?', ask: { answer: 0.55, tol: 0.001 }, calc: String.raw`V(B) \leftarrow 0.5 + 0.1 \times (1 - 0.5) = 0.55`, note: 'TD는 B를 떠나자마자 0.53으로 고쳤고, MC는 에피소드가 끝난 뒤에야 0.55로 고친다. 그리고 MC 오차 $1 - 0.5 = 0.5$는 두 TD 오차의 합 $0.3 + 0.2$와 같다. 아래 "MC 오차 = TD 오차의 합" 유도가 바로 이 사실이다.' },
        ],
      }),
    },
    tacit: [
      { tag: 'math', t: 'δ를 원자로 보면 TD 가족 전체가 "가중치 선택 문제"가 된다',
        d: '<p>$G_t - V(s_t) = \\sum_k\\gamma^k\\delta_{t+k}$를 한 번 받아들이면 MC($\\gamma^k$ 전부), TD(0)(첫 항만), n-step(처음 n개), TD(λ)·GAE($(\\gamma\\lambda)^k$), Retrace·V-trace(절단된 중요도 비율을 곱한 가중)가 모두 <strong>δ 수열에 어떤 필터를 씌우느냐</strong>의 차이가 된다. 새 advantage 추정법이나 off-policy 보정을 볼 때 "δ에 어떤 가중을 주는가"로 번역해 보면 대부분 기존 방법의 변형으로 읽힌다.</p>' },
      { tag: 'math', t: 'TD는 경사 하강법이 아니다',
        d: '<p>TD 업데이트는 $\\frac12(r+\\gamma V(s\') - V(s))^2$을 $V(s)$에 대해서만 미분하고 타깃 쪽 $V(s\')$은 상수로 취급한 <em>semi-gradient</em>다. 그래서 어떤 목적 함수의 경사도 아니며, 함수근사와 off-policy가 겹치면 발산할 수 있다(<a href="#approx">09장</a>). 타깃까지 미분하는 residual gradient(Baird 1995)는 진짜 경사라 수렴하지만, 확률적 환경에서 같은 $s\'$를 두 번 샘플해야 편향이 없고(double sampling), 실제로는 더 느리고 나쁜 해에 가는 경우가 많다. "TD가 왜 잘 되는가"는 경사가 아니라 축약(T1)으로 설명해야 한다.</p>' },
      { tag: 'algo', t: '배치 TD = 최대우도 모델 + DP',
        d: '<p>배치 TD(0)의 고정점은 데이터로 추정한 전이·보상 모델의 정확한 가치와 같다. 그래서 "모델 프리 TD"도 암묵적으로는 모델을 쓰고 있는 셈이고, 마르코프 가정이 맞는 한 MC보다 데이터를 더 잘 재활용한다. 같은 이유로 상태 표현이 마르코프하지 않으면(관측 별칭) TD는 체계적으로 틀린 답에 수렴할 수 있고 MC는 그렇지 않다. 상태 설계가 의심스러우면 λ를 1 쪽으로 올리는 것이 방어적 선택이다.</p>' },
      { tag: 'practice', t: 'λ는 "가치 함수를 얼마나 믿는가"이고, n과 α는 함께 고른다',
        d: '<p>λ의 유효 지평은 $1/(1-\\lambda)$ 스텝이다. 가치 추정이 아직 엉망인 초반에는 실제 보상을 길게 쓰는(큰 λ) 편이 낫고, critic이 정확해지면 작은 λ로 분산을 줄이는 편이 낫다. 실전 PPO의 λ=0.95, 리플레이 기반 DQN의 n=3~5가 경험적 타협점이다. 또 위 sweep 실험처럼 n(또는 λ)을 키우면 최적 α가 작아지므로, 하나만 바꾸고 다른 하나를 고정하면 잘못된 결론을 내리기 쉽다.</p>' },
      { tag: 'research', t: '보상 예측 오차와 도파민',
        d: '<p>Schultz, Dayan, Montague(1997)는 원숭이 도파민 뉴런이 예상치 못한 보상에 발화하고, 학습 후에는 보상을 예고하는 신호 시점으로 발화가 옮겨 가며, 예상된 보상이 오지 않으면 발화가 떨어진다는 것을 TD 오차 $\\delta$로 설명했다. 이후 Dabney et al.(2020)은 뉴런마다 낙관·비관 정도가 다른 분포형 TD(<a href="#qviews">08장</a>)와 맞는 증거를 보고했다. δ는 공학적 트릭이 아니라 학습 신호의 꽤 보편적인 형태일 가능성이 있다.</p>' },
    ],
    quiz: [
      { q: 'MC 타깃 $G_t$와 TD 타깃 $r_{t+1}+\\gamma V(s_{t+1})$의 성질로 옳은 것은?', options: ['MC는 편향, TD는 불편', 'MC는 불편이지만 분산이 크고, TD는 분산이 작지만 $V$가 틀리면 편향', '둘 다 불편', '둘 다 분산이 같다'], answer: 1,
        explain: '$\\mathbb{E}[G_t|s_t]=V^\\pi(s_t)$라 MC는 불편이다. TD 타깃은 추정치 $V$를 쓰므로 그것이 참값과 다른 만큼 편향된다.' },
      { q: '에피소드 동안 $V$가 고정일 때 $G_t - V(s_t)$는?', options: ['$\\delta_t$', '$\\sum_k \\gamma^k\\delta_{t+k}$', '$\\sum_k \\lambda^k\\delta_{t+k}$', '0'], answer: 1,
        explain: '$\\gamma V(s_{t+1})$을 더하고 빼는 전개를 반복하면 망원급수가 되어 TD 오차의 할인 합만 남는다.' },
      { q: 'λ = 0.9일 때 λ-리턴이 실제 보상을 반영하는 대략적인 유효 길이는?', options: ['1 스텝', '약 10 스텝', '약 90 스텝', '에피소드 끝까지'], answer: 1,
        explain: '기하 가중 $\\lambda^{n-1}$의 평균 길이는 $1/(1-\\lambda) = 10$.' },
      { q: '배치 학습에서 TD(0)가 수렴하는 값은?', options: ['관측된 리턴의 평균', '데이터로 추정한 최대우도 MDP의 정확한 가치', '항상 0', '최적 가치 $V^*$'], answer: 1,
        explain: '확실성 등가 추정이다. 예제 6.4에서 배치 TD는 $V(A)=0.75$, 배치 MC는 $V(A)=0$을 낸다.' },
    ],
  });

  /* ---------- 내가 평가자: 예상을 정하고 δ를 본다 ---------- */
  function mountCritic(el) {
    const p = ui.panel(el, { kind: 'TRY', title: '내가 평가자(critic): 예상을 정하고 δ 보기', caption: '슬라이더로 다섯 칸 A–E의 예상 가치(= 오른쪽 끝에 닿을 확률)를 직접 정해 보라. 막대는 각 칸에서 한 걸음 갔을 때 δ의 평균이다. 막대가 위로 솟으면 그 칸의 예상이 너무 낮고, 아래로 처지면 너무 높다. 모든 막대를 0 근처로 만들어 보라.' });
    const names = ['A', 'B', 'C', 'D', 'E'];
    const V = [0.5, 0.5, 0.5, 0.5, 0.5];
    const ctr = ui.row(p.body);
    const sl = names.map((nm, i) => ui.slider(ctr, { label: '$V(' + nm + ')$', min: 0, max: 1, step: 0.01, value: V[i], format: ui.fmt.f(2), onInput: (v) => { V[i] = v; draw(); } }));
    const btns = ui.row(p.body, 'btns');
    ui.button(btns, '한 걸음 걸어 δ 하나 보기', stepOnce, { primary: true });
    ui.button(btns, 'TD에게 100걸음 맡기기 (α=0.1)', () => autoTD(100));
    ui.button(btns, '정답 보기', () => { setAll([1, 2, 3, 4, 5].map((k) => k / 6)); msg('정답은 1/6, 2/6, …, 5/6이다. 이때 모든 막대가 정확히 0이 된다. 그래도 걸음 하나하나의 δ는 0이 아니다. 왼쪽으로 갈지 오른쪽으로 갈지가 운이기 때문이다. 평균이 0일 뿐이다.'); });
    ui.button(btns, '모두 0.5로', () => { setAll([0.5, 0.5, 0.5, 0.5, 0.5]); msg('모두 0.5로 되돌렸다. 양 끝 칸 A와 E의 막대부터 보라.'); });
    const st = ui.stats(p.body, [
      { key: 'res', label: '평균 |기대 δ| (작을수록 일관된 예상)', tone: 'accent' },
      { key: 'err', label: '참값과의 RMS 오차' },
      { key: 'pos', label: '걷는 사람 위치' },
    ]);
    const split = document.createElement('div');
    split.className = 'w-split';
    const a = document.createElement('div');
    const box = document.createElement('div');
    box.className = 'fx-detail';
    split.append(a, box);
    p.body.appendChild(split);
    const chart = plot.bars(a, { categories: names, series: [], height: 210, y: { min: -0.5, max: 0.5, label: '기대 δ' }, labels: true, labelFmt: (v) => (v >= 0 ? '+' : '') + v.toFixed(2), legend: false });
    const r = sim.rng(13);
    let pos = 2;
    // 칸 i에서 한 걸음의 기대 δ = ½(왼쪽 점수 + 왼쪽 예상) + ½(오른쪽 점수 + 오른쪽 예상) − V(i)
    const sideVal = (j) => (j < 0 ? 0 : j > 4 ? 1 : V[j]);
    const expDelta = (i) => 0.5 * sideVal(i - 1) + 0.5 * sideVal(i + 1) - V[i];
    function setAll(arr) { arr.forEach((v, i) => { V[i] = v; sl[i].set(v, true); }); draw(); }
    function msg(t) { box.innerHTML = t; RL.renderMath(box); }
    function stepOnce() {
      const from = pos;
      const to = from + (r() < 0.5 ? -1 : 1);
      const rew = to > 4 ? 1 : 0;
      const nextV = to < 0 || to > 4 ? 0 : V[to];
      const d = rew + nextV - V[from];
      const toName = to < 0 ? '왼쪽 끝(점수 0)' : to > 4 ? '오른쪽 끝(점수 1)' : names[to];
      msg(names[from] + ' → ' + toName + ':  δ = ' + rew + ' + ' + nextV.toFixed(2) + ' − ' + V[from].toFixed(2) + ' = <strong>' + (d >= 0 ? '+' : '') + d.toFixed(2) + '</strong>. ' +
        (Math.abs(d) < 0.005 ? '예상이 딱 맞았다.' : d > 0 ? names[from] + '은(는) 생각보다 좋은 칸이었다(예상이 낮았다).' : names[from] + '은(는) 생각보다 나쁜 칸이었다(예상이 높았다).') +
        (to < 0 || to > 4 ? ' 끝에 닿았으니 다시 C에서 출발한다.' : ''));
      pos = to < 0 || to > 4 ? 2 : to;
      draw();
    }
    function autoTD(n) {
      for (let k = 0; k < n; k++) {
        const to = pos + (r() < 0.5 ? -1 : 1);
        const rew = to > 4 ? 1 : 0;
        const nextV = to < 0 || to > 4 ? 0 : V[to];
        V[pos] += 0.1 * (rew + nextV - V[pos]);
        pos = to < 0 || to > 4 ? 2 : to;
      }
      V.forEach((v, i) => sl[i].set(+v.toFixed(2), true));
      msg('TD가 100걸음 동안 매 걸음 "δ의 10%만큼" 예상을 고쳤다. 슬라이더가 저절로 움직였고 막대들이 0에 가까워졌다. 몇 번 더 누르면 참값 근처에서 조금씩 흔들린다. 학습률이 고정이라 잡음이 남기 때문이다.');
      draw();
    }
    function draw() {
      const ed = names.map((_, i) => expDelta(i));
      chart.update({ series: [{ name: '기대 δ', color: 'c1', values: ed, colors: ed.map((v) => (v >= 0 ? 'pos' : 'neg')) }] });
      st.set('res', (ed.reduce((x, y) => x + Math.abs(y), 0) / 5).toFixed(3));
      st.set('err', rms(V, TRUE5).toFixed(3));
      st.set('pos', names[pos]);
    }
    msg('처음엔 모두 0.5다. 오른쪽 끝(점수 1)에 붙은 E의 막대는 위로, 왼쪽 끝(점수 0)에 붙은 A의 막대는 아래로 간다. 슬라이더로 E를 올리고 A를 내려 보자.');
    draw();
  }

  /* ---------- 5-상태 랜덤 워크: MC vs TD(0) ---------- */
  const TRUE5 = [1, 2, 3, 4, 5].map((k) => k / 6);
  function rms(V, truth) { let e = 0; for (let i = 0; i < V.length; i++) e += (V[i] - truth[i]) * (V[i] - truth[i]); return Math.sqrt(e / V.length); }
  function episode5(r) {
    // 상태열과 최종 보상(오른쪽 끝 1, 왼쪽 끝 0)
    let s = 2;
    const states = [s];
    for (;;) {
      s += r() < 0.5 ? -1 : 1;
      if (s < 0) return { states, R: 0 };
      if (s > 4) return { states, R: 1 };
      states.push(s);
    }
  }
  function learn5(kind, alpha, nEp, r, snaps) {
    const V = [0.5, 0.5, 0.5, 0.5, 0.5];
    const errs = [rms(V, TRUE5)];
    const snapOut = {};
    if (snaps && snaps.includes(0)) snapOut[0] = V.slice();
    for (let ep = 1; ep <= nEp; ep++) {
      const { states, R } = episode5(r);
      if (kind === 'td') {
        for (let i = 0; i < states.length; i++) {
          const s = states[i];
          const next = i + 1 < states.length ? V[states[i + 1]] : 0;
          const rew = i + 1 < states.length ? 0 : R;
          V[s] += alpha * (rew + next - V[s]);
        }
      } else {
        for (let i = 0; i < states.length; i++) { const s = states[i]; V[s] += alpha * (R - V[s]); }
      }
      errs.push(rms(V, TRUE5));
      if (snaps && snaps.includes(ep)) snapOut[ep] = V.slice();
    }
    return { errs, snaps: snapOut };
  }

  function mountRandomWalk(el) {
    const p = ui.panel(el, { kind: 'SIM', title: '랜덤 워크 A–E: MC vs TD(0)', caption: '두 학습률 슬라이더를 움직이며 왼쪽 그래프에서 파란 선(TD)과 주황 선(MC) 중 어느 쪽이 먼저 낮아지는지 보라. 오른쪽 그래프는 TD가 한 번의 실행에서 에피소드를 거듭하며 점선(참값)에 다가가는 모습이다.' });
    const st = { aTD: 0.1, aMC: 0.02, eps: 100, runs: 100 };
    const ctr = ui.row(p.body);
    ui.slider(ctr, { label: 'TD 학습률 $\\alpha_{TD}$', min: 0.01, max: 0.5, step: 0.01, value: st.aTD, format: ui.fmt.f(2), onInput: (v) => { st.aTD = v; sched(); } });
    ui.slider(ctr, { label: 'MC 학습률 $\\alpha_{MC}$', min: 0.01, max: 0.5, step: 0.01, value: st.aMC, format: ui.fmt.f(2), onInput: (v) => { st.aMC = v; sched(); } });
    ui.slider(ctr, { label: '에피소드 수', min: 20, max: 300, step: 10, value: st.eps, format: ui.fmt.int, onInput: (v) => { st.eps = v; sched(); } });
    ui.slider(ctr, { label: '평균낼 실행 수', min: 10, max: 300, step: 10, value: st.runs, format: ui.fmt.int, onInput: (v) => { st.runs = v; sched(); } });
    const stats = ui.stats(p.body, [
      { key: 'td', label: '마지막 RMS (TD)', tone: 'accent' },
      { key: 'mc', label: '마지막 RMS (MC)', tone: 'signal' },
      { key: 'cross', label: 'TD가 MC보다 낮아진 에피소드' },
    ]);
    const split = document.createElement('div');
    split.className = 'w-split';
    const a = document.createElement('div');
    const b = document.createElement('div');
    split.append(a, b);
    p.body.appendChild(split);
    const errC = plot.line(a, { height: 260, x: { label: '에피소드', min: 0 }, y: { label: 'RMS 오차 (상태 평균, 실행 평균)', min: 0 }, series: [], hoverXDigits: 0 });
    const valC = plot.line(b, { height: 260, x: { min: 0.8, max: 5.2, label: '상태', fmt: (v) => ['', 'A', 'B', 'C', 'D', 'E'][Math.round(v)] || '' }, y: { min: 0, max: 1, label: '추정 가치 (TD, 한 번의 실행)' }, series: [], hover: false });
    let timer = 0;
    function sched() { clearTimeout(timer); timer = setTimeout(run, 50); }
    function run() {
      const N = st.eps;
      const accTD = new Float64Array(N + 1), accMC = new Float64Array(N + 1);
      for (let i = 0; i < st.runs; i++) {
        const r1 = sim.rng(100 + i), r2 = sim.rng(100 + i);
        const t = learn5('td', st.aTD, N, r1).errs, m = learn5('mc', st.aMC, N, r2).errs;
        for (let k = 0; k <= N; k++) { accTD[k] += t[k]; accMC[k] += m[k]; }
      }
      const TD = [], MC = [];
      let cross = null;
      for (let k = 0; k <= N; k++) {
        const x = accTD[k] / st.runs, y = accMC[k] / st.runs;
        TD.push([k, x]); MC.push([k, y]);
        if (cross == null && k > 0 && x < y) cross = k;
      }
      errC.update({ series: [
        { name: 'TD(0), α=' + st.aTD.toFixed(2), color: 'c1', data: TD },
        { name: 'MC, α=' + st.aMC.toFixed(2), color: 'c2', data: MC },
      ], x: { label: '에피소드', min: 0, max: N } });
      stats.set('td', TD[N][1].toFixed(4));
      stats.set('mc', MC[N][1].toFixed(4));
      stats.set('cross', cross == null ? '없음' : String(cross));
      const marks = [0, 1, 10, N];
      const one = learn5('td', st.aTD, N, sim.rng(42), marks).snaps;
      const cols = ['faint', 'c6', 'c5', 'c1'];
      const series = marks.map((m, j) => ({ name: m + ' 에피소드 후', color: cols[j], data: one[m].map((v, i) => [i + 1, v]), markers: true }));
      series.push({ name: '참 가치', color: 'ink', dash: '5 4', data: TRUE5.map((v, i) => [i + 1, v]), endDot: false });
      valC.update({ series });
    }
    run();
  }

  /* ---------- 19-상태 랜덤 워크: n-step / TD(λ) α 스윕 ---------- */
  const NS = 19;
  const TRUE19 = sim.range(NS).map((i) => (i + 1) / 10 - 1);
  function walk19(r) {
    let s = 9;
    const S = [s], Rw = [0];
    for (;;) {
      s += r() < 0.5 ? -1 : 1;
      if (s < 0) { S.push(-1); Rw.push(-1); return { S, Rw }; }
      if (s >= NS) { S.push(-1); Rw.push(1); return { S, Rw }; }
      S.push(s); Rw.push(0);
    }
  }
  function nstepRun(n, alpha, eps, r) {
    const V = new Float64Array(NS);
    let tot = 0;
    for (let e = 0; e < eps; e++) {
      const { S, Rw } = walk19(r);
      const T = S.length - 1; // S[T] = 종료
      for (let tau = 0; tau < T; tau++) {
        let G = 0;
        const end = Math.min(tau + n, T);
        for (let i = tau + 1; i <= end; i++) G += Rw[i];
        if (tau + n < T) G += V[S[tau + n]];
        V[S[tau]] += alpha * (G - V[S[tau]]);
      }
      let err = 0;
      for (let i = 0; i < NS; i++) err += (V[i] - TRUE19[i]) * (V[i] - TRUE19[i]);
      tot += Math.min(1, Math.sqrt(err / NS));
    }
    return tot / eps;
  }
  function lambdaRun(lam, alpha, eps, r) {
    const V = new Float64Array(NS);
    const E = new Float64Array(NS);
    let tot = 0;
    for (let e = 0; e < eps; e++) {
      const { S, Rw } = walk19(r);
      E.fill(0);
      for (let t = 0; t < S.length - 1; t++) {
        const s = S[t], s2 = S[t + 1];
        const delta = Rw[t + 1] + (s2 >= 0 ? V[s2] : 0) - V[s];
        E[s] += 1;
        for (let i = 0; i < NS; i++) { if (E[i] !== 0) { V[i] += alpha * delta * E[i]; E[i] *= lam; } }
      }
      let err = 0;
      for (let i = 0; i < NS; i++) { const d = V[i] - TRUE19[i]; err += d * d; }
      tot += Number.isFinite(err) ? Math.min(1, Math.sqrt(err / NS)) : 1;
    }
    return tot / eps;
  }

  function mountSweep(el) {
    const p = ui.panel(el, { kind: 'SIM', title: '19-상태 랜덤 워크: 학습률 α에 따른 오차 (처음 10 에피소드 평균)' });
    const st = { mode: 'nstep', runs: 40 };
    const ctr = ui.row(p.body);
    ui.select(ctr, { label: '방법', value: st.mode, options: [{ value: 'nstep', label: 'n-step TD' }, { value: 'lambda', label: 'TD(λ), 누적 trace (온라인)' }], onChange: (v) => { st.mode = v; run(); } });
    ui.slider(ctr, { label: '평균낼 실행 수', min: 10, max: 100, step: 10, value: st.runs, format: ui.fmt.int, onInput: (v) => { st.runs = v; sched(); } });
    const info = ui.stats(p.body, [{ key: 'best', label: '최저 오차 설정', tone: 'accent' }, { key: 'prog', label: '계산 진행' }]);
    const chartEl = document.createElement('div');
    p.body.appendChild(chartEl);
    const cap = document.createElement('p');
    cap.className = 'w-caption';
    cap.innerHTML = '"방법"을 바꿔 보고, 곡선마다 가장 낮은 점이 어느 α에 있는지 보라. 설정: 양 끝 보상 −1/+1, 중앙에서 출발, $V=0$으로 시작. 같은 난수 시드를 모든 α에 공유해(common random numbers) 비교한다. 오차가 1을 넘으면 1로 잘라 계산하고, 0.6 위로 나간 부분은 그래프에서 잘린다(누적 trace의 λ=1은 α가 조금만 커져도 불안정해 대부분 범위 밖이다). Sutton & Barto 7장(n-step, 그림 7.2)과 12장(TD(λ))의 19-상태 실험을 재현했다.';
    p.body.appendChild(cap);
    const chart = plot.line(chartEl, { height: 300, x: { min: 0, max: 1, label: '학습률 α' }, y: { min: 0.2, max: 0.6, label: '평균 RMS 오차' }, series: [], hoverDigits: 3 });
    const alphas = sim.range(20).map((i) => +(0.05 * (i + 1)).toFixed(2));
    const cols = ['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'muted'];
    let timer = 0, job = 0;
    if (RL.cleanup) RL.cleanup.push(() => { job++; clearTimeout(timer); }); // 장을 떠나면 남은 계산 중단
    function sched() { clearTimeout(timer); timer = setTimeout(run, 80); }
    function run() {
      const my = ++job;
      const params = st.mode === 'nstep' ? [1, 2, 4, 8, 16, 32] : [0, 0.4, 0.8, 0.9, 0.95, 0.975, 1];
      const series = [];
      let best = { v: Infinity, label: '' };
      let i = 0;
      function next() {
        if (my !== job) return;
        if (i >= params.length) { info.set('prog', '완료'); return; }
        const prm = params[i];
        const data = alphas.map((a) => {
          let acc = 0;
          for (let k = 0; k < st.runs; k++) {
            const r = sim.rng(7000 + k);
            acc += st.mode === 'nstep' ? nstepRun(prm, a, 10, r) : lambdaRun(prm, a, 10, r);
          }
          const v = acc / st.runs;
          if (v < best.v) best = { v, label: (st.mode === 'nstep' ? 'n=' + prm : 'λ=' + prm) + ', α=' + a.toFixed(2) + ' → ' + v.toFixed(3) };
          return [a, v];
        });
        series.push({ name: st.mode === 'nstep' ? 'n = ' + prm : 'λ = ' + prm, color: cols[i % cols.length], data, markers: false });
        chart.update({ series: series.slice() });
        info.set('best', best.label);
        info.set('prog', (i + 1) + ' / ' + params.length);
        i++;
        setTimeout(next, 0);
      }
      next();
    }
    run();
  }
})();
