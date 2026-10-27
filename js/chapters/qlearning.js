/* 07 Q-learning과 SARSA */
(function () {
  const { ui, sim, plot } = RL;

  RL.chapter({
    id: 'qlearning',
    title: 'Q-learning과 SARSA',
    subtitle: 'Q의 벨만 방정식을 샘플 하나로 푸는 두 가지 방법. 타깃에 다음 행동을 쓰느냐(SARSA), 최댓값을 쓰느냐(Q-learning)의 한 글자 차이가 학습하는 정책과 위험 성향을 바꾼다.',
    time: 40,
    level: '기초 · 핵심',
    prereq: ['td'],
    theses: ['T1', 'T2', 'T8'],
    goals: [
      'SARSA와 Q-learning을 각각 벨만 기대 방정식과 벨만 최적 방정식의 샘플 버전으로 유도할 수 있다.',
      'on-policy와 off-policy의 차이를 절벽 걷기(cliff walking) 실험의 결과로 설명할 수 있다.',
      '최댓값 편향(maximization bias)이 왜 생기는지, Double Q-learning이 어떻게 줄이는지 시뮬레이션으로 확인한다.',
    ],
    html: String.raw`
<p>TD(0)는 정책을 고정하고 $V^\pi$를 추정했다(<a href="#td">06장</a>). 그런데 $V$만으로는 행동을 고를 수 없다. 탐욕 정책 $\arg\max_a [R(s,a) + \gamma\sum_{s'}P(s'|s,a)V(s')]$를 계산하려면 모델 $P$가 필요하기 때문이다. 모델 없이 <strong>제어(control)</strong>를 하려면 행동 가치 $Q(s,a)$를 직접 배워야 한다. 이 장의 두 알고리즘은 모두 "Q의 벨만 방정식 + 샘플 하나 + 이동 평균"으로 만들어진다.</p>

<h2>벨만 방정식에서 업데이트 규칙으로</h2>
<div data-w="dv-q"></div>
<div data-w="fx-q"></div>
<p>세 알고리즘의 차이는 <strong>타깃에서 다음 상태 $s'$의 가치를 어떻게 읽느냐</strong> 하나뿐이다.</p>
<div class="table-wrap" style="position:relative"><table class="t">
<thead><tr><th>알고리즘</th><th>TD 타깃 $y$</th><th>근사하는 방정식</th><th>필요한 샘플</th></tr></thead>
<tbody>
<tr><td>SARSA</td><td>$r + \gamma\, Q(s', a')$, $a'\sim\pi$</td><td>$Q^\pi$의 기대 방정식</td><td>$(s,a,r,s',a')$ — 이름의 유래</td></tr>
<tr><td>Expected SARSA</td><td>$r + \gamma \sum_{a'}\pi(a'|s')Q(s',a')$</td><td>$Q^\pi$의 기대 방정식</td><td>$(s,a,r,s')$ + 정책 $\pi$</td></tr>
<tr><td>Q-learning</td><td>$r + \gamma \max_{a'} Q(s',a')$</td><td>$Q^*$의 최적 방정식</td><td>$(s,a,r,s')$</td></tr>
</tbody></table></div>
<p>Expected SARSA는 둘을 잇는 다리다. 타깃 정책 $\pi$를 탐욕 정책으로 두면 $\sum_{a'}\pi(a'|s')Q(s',a') = \max_{a'}Q(s',a')$이므로 정확히 Q-learning이 된다(van Seijen et al. 2009). $a'$의 무작위성을 기댓값으로 없앴기 때문에 SARSA보다 분산이 작다.</p>

<h2>수렴 조건</h2>
<p>Q-learning은 다음 조건에서 확률 1로 $Q^*$에 수렴한다(Watkins & Dayan 1992; Jaakkola, Jordan & Singh 1994; Tsitsiklis 1994).</p>
<ol>
<li><strong>모든 $(s,a)$ 쌍을 무한히 자주 방문</strong>한다. 행동 정책은 무엇이든 되지만 충분히 탐험해야 한다.</li>
<li><strong>로빈스-먼로 조건</strong>: 각 쌍의 스텝 크기가 $\sum_k \alpha_k = \infty$, $\sum_k \alpha_k^2 < \infty$를 만족한다. 첫 조건은 초기값의 영향을 지울 만큼 충분히 움직인다는 뜻, 둘째는 잡음이 결국 평균되어 사라진다는 뜻이다. $\alpha_k = 1/k$가 대표적이다.</li>
<li>보상의 분산이 유한하고, $\gamma<1$이거나 모든 정책이 결국 종료된다.</li>
</ol>
<p>SARSA가 $Q^*$로 가려면 여기에 <strong>GLIE</strong>(Greedy in the Limit with Infinite Exploration)가 더 필요하다. 모든 쌍을 무한히 방문하면서 정책이 극한에서 탐욕적이 되어야 한다. 예: $\epsilon_k = 1/k$인 $\epsilon$-greedy(Singh et al. 2000). SARSA는 "지금 실행 중인 정책"의 가치를 배우므로, 정책이 탐욕적으로 수렴해야만 최적 가치에 도달한다.</p>
<div class="thesis-box"><span class="label">대전제 T1 · T2</span>
<p>Q-learning의 수렴 증명은 결국 $\mathcal{T}^*$가 sup-노름 축약(T1)이라는 사실과 "축약 + 평균 0 잡음 + 로빈스-먼로 스텝"이면 확률적 근사가 고정점으로 간다는 정리의 조합이다. SARSA는 매 스텝 평가(TD 업데이트)와 개선($\epsilon$-greedy가 최신 Q를 바로 반영)을 한 스텝 단위로 섞은, 가장 잘게 쪼갠 GPI(T2)다.</p>
</div>

<h2>절벽 걷기: on-policy는 안전한 길을, off-policy는 최적의 길을 배운다</h2>
<p>Sutton & Barto의 예제 6.6이다. 아래 줄의 시작(S)에서 목표(+0)까지 가는데, 사이의 칸은 절벽이다. 매 스텝 −1, 절벽에 떨어지면 −100을 받고 시작으로 돌아간다. 두 에이전트 모두 $\epsilon$-greedy로 행동한다.</p>
<div data-w="cliff"></div>
<ul>
<li><strong>Q-learning</strong>은 타깃에 $\max$를 쓰므로 "탐험하지 않는다면"의 가치, 즉 절벽 바로 옆 최단 경로의 가치를 배운다. 그런데 실제로는 $\epsilon$ 확률로 무작위 행동을 하므로 그 길에서 가끔 떨어진다. 그래서 <em>학습 중 실제로 받는 보상</em>은 더 낮다.</li>
<li><strong>SARSA</strong>는 타깃에 실제 다음 행동 $a'$을 쓰므로 "가끔 미끄러지는 나 자신"의 가치를 배운다. 절벽 옆 칸의 가치가 낮게 평가되어 한두 줄 위로 돌아가는 안전한 길을 택한다.</li>
<li>$\epsilon$을 0에 가깝게 줄이면 두 방법의 차이가 사라진다. SARSA는 실행 정책을 배우고, 실행 정책이 탐욕적이 되면 그것이 곧 최적 정책이기 때문이다.</li>
</ul>

<h2>Q-learning을 직접 돌려 보기</h2>
<p>미로에서 Q-learning 에이전트가 움직인다. 각 칸의 네 삼각형은 그 방향 행동의 $Q(s,a)$다(파랑이 클수록 높음). 보상은 목표에서만 +1이므로, 처음 에피소드는 거의 무작위 보행이고 목표에 한 번 닿은 뒤부터 가치가 목표 쪽에서 거꾸로 번져 나온다. 아래 그래프의 에피소드 길이가 최단 경로 길이(점선)로 떨어지는 과정을 보라.</p>
<div data-w="grid-q"></div>
<div class="aside"><span class="label">관찰 포인트</span>한 에피소드에서 업데이트되는 것은 지나간 칸의 Q뿐이고, 목표의 정보는 에피소드당 한 칸씩만 뒤로 전파된다. 이 느린 전파가 n-step 리턴과 적격 흔적(<a href="#td">06장</a>), 그리고 경험 재생(<a href="#dqn">10장</a>)의 동기다.</div>

<h2>최댓값 편향과 Double Q-learning</h2>
<p>Q-learning의 타깃 $\max_{a'}Q(s',a')$은 추정치에 대한 최댓값이다. 추정치에 잡음이 있으면 <strong>잡음의 최댓값</strong>까지 함께 고르게 된다. 각 추정치가 불편(unbiased)이어도 최댓값은 위로 편향된다.</p>
$$\mathbb{E}\big[\max_a \hat Q(a)\big] \;\ge\; \max_a \mathbb{E}\big[\hat Q(a)\big]$$
<p>$\max$는 볼록 함수이므로 옌센 부등식에 의해 성립한다. 예제 6.7(Sutton & Barto)에서 상태 A의 <em>오른쪽</em>은 즉시 종료(보상 0), <em>왼쪽</em>은 B로 가는데, B의 모든 행동은 평균 −0.1의 잡음 보상을 주고 종료된다. 왼쪽의 참 가치는 −0.1이므로 최적은 오른쪽이다. 그러나 B에 행동이 많을수록 "운 좋게 높게 나온" 하나의 추정치가 $\max$로 뽑혀 왼쪽이 좋아 보인다.</p>
<div data-w="maxbias"></div>
<p><strong>Double Q-learning</strong>(van Hasselt 2010)은 두 개의 독립 추정치 $Q_1, Q_2$를 두고, 하나로 행동을 <em>고르고</em> 다른 하나로 그 행동을 <em>평가</em>한다.</p>
$$Q_1(s,a) \leftarrow Q_1(s,a) + \alpha\Big[r + \gamma\, Q_2\big(s', \hl{\arg\max_{a'} Q_1(s',a')}\big) - Q_1(s,a)\Big]$$
<p>고르는 데 쓴 잡음과 평가하는 잡음이 독립이므로, 선택된 행동의 가치가 잡음 때문에 부풀려지지 않는다(대신 약간 과소추정할 수 있다). 매 스텝 동전을 던져 $Q_1$과 $Q_2$ 중 하나만 갱신하고, 행동은 $Q_1+Q_2$로 고른다. 이 아이디어가 그대로 Double DQN(<a href="#dqn">10장</a>)과 TD3의 clipped double Q(<a href="#maxent">14장</a>)가 된다(T8).</p>

<h2>on-policy와 off-policy 한눈에</h2>
<div class="table-wrap" style="position:relative"><table class="t">
<thead><tr><th></th><th>SARSA</th><th>Expected SARSA</th><th>Q-learning</th><th>Double Q-learning</th></tr></thead>
<tbody>
<tr><td>배우는 가치</td><td>행동 정책 $\pi$의 $Q^\pi$</td><td>타깃 정책의 $Q^\pi$ (임의)</td><td>$Q^*$</td><td>$Q^*$</td></tr>
<tr><td>데이터 정책</td><td>배우는 정책과 같아야 함</td><td>달라도 됨</td><td>달라도 됨</td><td>달라도 됨</td></tr>
<tr><td>타깃 분산</td><td>큼 ($a'$ 샘플)</td><td>작음</td><td>작음</td><td>작음</td></tr>
<tr><td>편향의 원천</td><td>탐험이 가치에 섞임</td><td>—</td><td>최댓값 편향(과대)</td><td>약한 과소추정</td></tr>
<tr><td>경험 재생과 궁합</td><td>나쁨 (옛 정책 데이터)</td><td>좋음</td><td>좋음 → DQN</td><td>좋음 → Double DQN</td></tr>
<tr><td>성향</td><td>위험 회피적</td><td>중간</td><td>위험 무시(학습 중)</td><td>보수적</td></tr>
</tbody></table></div>
<p>"off-policy"의 진짜 가치는 <strong>데이터 재사용</strong>이다. 다른 정책이 모은 데이터, 과거의 나, 사람의 시연, 다른 에이전트의 경험을 모두 같은 타깃으로 학습할 수 있다. 이것이 DQN의 경험 재생, HER의 목표 재라벨링(<a href="#qviews">08장</a>), 오프라인 RL(<a href="#offline">15장</a>)로 이어진다. 대가는 불안정성이다(<a href="#approx">09장 Deadly Triad</a>).</p>
`,
    mount: {
      'dv-q': (el) => ui.derivation(el, {
        title: '벨만 방정식 → SARSA · Q-learning',
        steps: [
          { tex: String.raw`Q^\pi(s,a) = \mathbb{E}\big[\, r + \gamma\, Q^\pi(s', a') \;\big|\; s, a \,\big],\quad s'\sim P(\cdot|s,a),\ a'\sim\pi(\cdot|s')`, why: 'Q의 벨만 기대 방정식(02장). 우변은 기댓값이지만 모델 $P$를 모르므로 계산할 수 없다.' },
          { tex: String.raw`y = \hl{r + \gamma\, Q(s', a')} \quad\text{(한 번 실제로 일어난 } (s,a,r,s',a')\text{)}`, why: '실제로 한 번 행동해서 얻은 샘플로 우변을 대신한다. $Q$가 정확하다면 $y$는 우변의 불편 추정량이다.' },
          { tex: String.raw`Q(s,a) \leftarrow Q(s,a) + \alpha\,\big(y - Q(s,a)\big) = (1-\alpha)\,Q(s,a) + \alpha\, y`, why: '샘플 하나를 그대로 믿지 않고 이동 평균을 낸다. $\\alpha_k = 1/k$면 정확히 표본 평균, 상수 $\\alpha$면 최근 샘플에 가중치 $(1-\\alpha)^j$로 감소하는 지수 이동 평균.' },
          { tex: String.raw`\boxed{\text{SARSA: } Q(s,a) \leftarrow Q(s,a) + \alpha\big[r + \gamma\, Q(s',\hl{a'}) - Q(s,a)\big]}`, why: '$a\'$은 다음 스텝에 실제로 실행할 행동이다. 그래서 현재 행동 정책의 가치를 배운다(on-policy).' },
          { tex: String.raw`Q^*(s,a) = \mathbb{E}\big[\, r + \gamma \hl{\max_{a'}} Q^*(s', a') \;\big|\; s, a \,\big]`, why: '최적 방정식에서 출발하면 다음 행동의 기댓값 자리에 $\\max$가 온다. 이 식에는 정책이 등장하지 않는다.' },
          { tex: String.raw`\boxed{\text{Q-learning: } Q(s,a) \leftarrow Q(s,a) + \alpha\big[r + \gamma\, \hl{\max_{a'}} Q(s',a') - Q(s,a)\big]}`, why: '샘플 $(s,a,r,s\')$만 있으면 되고, 그 샘플을 누가 어떻게 모았는지는 상관없다. 첫 행동 $a$는 조건이므로 중요도 가중치도 필요 없다(off-policy).' },
          { tex: String.raw`\text{Expected SARSA: } y = r + \gamma \hl{\sum_{a'}\pi(a'|s')}\,Q(s',a') \;\xrightarrow{\ \pi = \text{greedy}\ }\; r + \gamma\max_{a'}Q(s',a')`, why: '다음 행동을 샘플하지 않고 정책으로 평균내면 분산이 준다. 타깃 정책을 탐욕으로 두면 Q-learning과 같아진다.' },
        ],
      }),
      'fx-q': (el) => ui.formula(el, {
        title: 'Q-learning 업데이트 해부',
        tex: String.raw`\tm{old}{Q(s,a)} \leftarrow Q(s,a) + \tm{a}{\alpha}\,\Big[\,\tm{tgt}{\tm{r}{r} + \tm{g}{\gamma}\,\tm{max}{\max_{a'} Q(s',a')}} - Q(s,a)\,\Big]`,
        terms: [
          { id: 'old', sym: 'Q(s,a)', label: '현재 추정', desc: '표의 한 칸. 방문한 (s,a)만 바뀐다.', long: '표 형식에서는 업데이트가 정확히 한 칸만 바꾼다. 함수근사(09장)에서는 한 번의 업데이트가 비슷한 상태들의 값까지 함께 바꾸고, 그것이 일반화이자 불안정성의 원천이다.' },
          { id: 'a', sym: '\\alpha', label: '스텝 크기', desc: '새 샘플을 얼마나 믿을지. 기억 길이 ≈ 1/α.', long: '상수 $\\alpha$는 정확한 수렴을 포기하는 대신 비정상(nonstationary) 상황을 추적한다. 수렴 이론은 $\\sum\\alpha=\\infty, \\sum\\alpha^2<\\infty$를 요구하지만 실전에서는 거의 항상 상수를 쓴다.' },
          { id: 'tgt', sym: 'y', label: 'TD 타깃', desc: '한 스텝 실제 보상 + 다음 상태의 추정 가치.', long: '타깃 안에 자기 자신(Q)이 들어 있다(부트스트랩). 그래서 Q가 바뀌면 타깃도 바뀐다. DQN의 타깃 네트워크는 이 움직이는 과녁을 잠시 고정한다.' },
          { id: 'r', sym: 'r', label: '실제 보상', desc: '환경에서 관측된 유일한 "진짜" 정보.' },
          { id: 'g', sym: '\\gamma', label: '할인율', desc: '부트스트랩 항의 가중치 = 오차 전파 계수.' },
          { id: 'max', sym: "\\max_{a'}Q(s',a')", label: '탐욕적 평가', desc: '다음 상태에서 최선의 행동을 가정. off-policy의 원천이자 과대추정의 원천.', long: '데이터를 모은 정책이 실제로 무엇을 했는지와 무관하게 "최선이었다면"을 쓴다. 추정치에 잡음이 있으면 최댓값이 위로 편향된다(아래 Double Q 실험).' },
        ],
      }),
      cliff: mountCliff,
      'grid-q': mountGridQ,
      maxbias: mountMaxBias,
    },
    tacit: [
      { tag: 'algo', t: '1-스텝 off-policy에 중요도 가중치가 필요 없는 진짜 이유',
        d: '<p>Q-learning 타깃에서 $a$는 조건이고 $s\'$은 환경이 뽑으며, 다음 행동은 $\\max$로 "계산"되지 샘플되지 않는다. 그래서 행동 정책의 확률이 어디에도 끼어들지 않는다. 그러나 n-step으로 늘리는 순간 중간 행동들이 행동 정책에서 샘플되므로 $\\prod \\pi/b$ 중요도 비율이 필요해지고, 그 곱은 지평에 대해 기하급수적으로 분산이 커진다. Tree Backup, Retrace(Munos et al. 2016), V-trace(IMPALA, Espeholt et al. 2018)는 이 비율을 잘라서(truncate) 분산을 통제하는 방법들이다.</p>' },
      { tag: 'research', t: '위험 성향은 목적 함수가 아니라 학습 타깃에서 생긴다',
        d: '<p>절벽 실험의 SARSA는 위험 회피를 따로 배운 것이 아니다. "나는 $\\epsilon$ 확률로 실수한다"는 사실이 타깃에 들어가 절벽 옆 상태의 가치를 낮췄을 뿐이다. 같은 원리로 on-policy 방법(PPO 등)은 탐험 잡음을 감안한 보수적 행동을, off-policy 방법은 탐험 없는 이상적 정책을 배운다. 실제 배포 때 잡음이 있는 시스템이라면 on-policy의 답이 더 적절할 수 있다. "어느 쪽이 최적인가"는 평가 시 정책이 무엇이냐에 달려 있다.</p>' },
      { tag: 'math', t: '스텝 크기 스케줄이 지평 의존성을 바꾼다',
        d: '<p>$\\alpha_k = 1/k$(선형)는 로빈스-먼로 조건을 만족하는 교과서적 선택이지만, Q-learning에서는 수렴 시간이 $1/(1-\\gamma)$에 대해 <strong>지수적으로</strong> 느려질 수 있다. 반면 $\\alpha_k = 1/k^{\\omega}$, $\\omega\\in(1/2,1)$인 다항 스케줄은 다항 시간이다(Even-Dar & Mansour 2003). 이유는 직관적이다: 부트스트랩 타깃 자체가 처음엔 틀려 있으므로, 초기 타깃을 너무 오래 평균에 남기는 $1/k$는 그 오류를 오래 끌고 간다. 08장 첫 실험에서 직접 비교할 수 있다.</p>' },
      { tag: 'practice', t: '초기값과 동점 처리는 탐험 전략이다',
        d: '<p>$Q$를 0으로 초기화하고 보상이 모두 음수(절벽의 −1)이면, 안 가 본 행동이 항상 더 좋아 보여 체계적 탐험이 일어난다(낙관적 초기화, T7). 반대로 보상이 양수 희소(미로의 +1)이면 0 초기화는 아무 정보를 주지 않는다. 또 $\\arg\\max$의 동점을 항상 첫 번째 행동으로 깨면 에이전트가 한 방향으로만 가는 결정적 편향이 생긴다. 동점은 반드시 무작위로 깨야 한다. 작은 구현 디테일이 표 형식 실험 결과를 통째로 바꾼다.</p>' },
      { tag: 'math', t: '최댓값 편향의 크기: $\\sigma\\sqrt{2\\ln n}$',
        d: '<p>참 가치가 모두 같고 추정 잡음이 $\\mathcal{N}(0,\\sigma^2)$인 행동 $n$개가 있으면 $\\mathbb{E}[\\max] \\le \\sigma\\sqrt{2\\ln n}$이고, $n$이 크면 이 값에 가깝다. 행동이 많을수록, 추정이 부정확할수록(학습 초기, 드물게 방문한 상태) 편향이 커진다. 게다가 이 편향은 부트스트랩을 타고 앞 상태로 전파되어 지평 $1/(1-\\gamma)$에 걸쳐 누적된다. Double Q는 편향을 없애는 대신 약한 과소추정으로 바꾸는데, 과소추정은 탐험을 덜 망가뜨리므로 보통 더 안전한 쪽의 오류다.</p>' },
    ],
    quiz: [
      { q: 'SARSA와 Q-learning의 업데이트에서 유일하게 다른 부분은?', options: ['스텝 크기 $\\alpha$', '즉시 보상 $r$', '다음 상태 가치를 $Q(s\',a\')$로 읽느냐 $\\max_{a\'}Q(s\',a\')$로 읽느냐', '할인율 $\\gamma$'], answer: 2,
        explain: 'SARSA는 실제로 다음에 할 행동 $a\'$의 가치를, Q-learning은 다음 상태의 최대 가치를 쓴다. 이 차이로 각각 $Q^\\pi$와 $Q^*$를 배운다.' },
      { q: '절벽 걷기에서 $\\epsilon=0.1$일 때 학습 중 에피소드 보상이 더 높은 쪽과 그 이유는?', options: ['Q-learning, 최적 경로를 배우므로', 'SARSA, 탐험을 감안한 가치를 배워 절벽에서 먼 길을 택하므로', '둘 다 같다', 'Q-learning, 과대추정 덕분에'], answer: 1,
        explain: 'Q-learning은 절벽 옆 최단 경로를 배우지만 $\\epsilon$-탐험 때문에 가끔 떨어진다. SARSA는 실수 가능성이 반영된 가치를 배워 안전한 길로 간다. $\\epsilon\\to0$이면 차이가 사라진다.' },
      { q: 'Double Q-learning이 최댓값 편향을 줄이는 핵심 아이디어는?', options: ['스텝 크기를 반으로 줄인다', '행동 선택과 가치 평가에 서로 독립인 추정치를 쓴다', '보상을 클리핑한다', '$\\max$ 대신 평균을 쓴다'], answer: 1,
        explain: '$Q_1$로 $\\arg\\max$를 고르고 $Q_2$로 평가하면, 고를 때 낀 잡음이 평가에 그대로 들어가지 않는다.' },
      { q: 'Expected SARSA에서 타깃 정책을 탐욕 정책으로 두면 어떤 알고리즘이 되는가?', options: ['SARSA', 'Q-learning', 'TD(0)', 'Monte Carlo 제어'], answer: 1,
        explain: '탐욕 정책에 대한 기댓값 $\\sum_{a\'}\\pi(a\'|s\')Q(s\',a\')$은 $\\max_{a\'}Q(s\',a\')$이다.' },
    ],
  });

  /* ---------- 공용: ε-greedy (무작위 동점 처리) ---------- */
  function egreedy(q, eps, r) {
    if (r() < eps) return Math.floor(r() * q.length);
    return sim.argmaxRand(q, r);
  }
  function zeros(nS, nA) { return Array.from({ length: nS }, () => new Array(nA).fill(0)); }
  function greedyPath(env, Q, maxLen) {
    let s = env.start;
    const path = [s];
    for (let t = 0; t < maxLen; t++) {
      const a = sim.argmax(Q[s]);
      const o = env.P[s][a][0];
      s = o.s2;
      path.push(s);
      if (o.done) break;
    }
    return path;
  }

  /* ---------- 절벽 걷기 ---------- */
  function mountCliff(el) {
    const p = ui.panel(el, { kind: 'SIM', title: '절벽 걷기: SARSA vs Q-learning', caption: '여러 번의 독립 실행을 평균한 에피소드당 보상(이동 평균 10)과, 마지막 실행에서 배운 탐욕 경로. 매 실행은 실제로 두 알고리즘을 처음부터 학습시킨다.' });
    const ctr = ui.row(p.body);
    const eS = ui.slider(ctr, { label: '탐험률 $\\epsilon$', min: 0, max: 0.3, step: 0.01, value: 0.1, format: ui.fmt.f(2) });
    const aS = ui.slider(ctr, { label: '스텝 크기 $\\alpha$', min: 0.05, max: 1, step: 0.05, value: 0.5, format: ui.fmt.f(2) });
    const runsSel = ui.select(ctr, { label: '독립 실행 수', value: 20, options: [{ value: 5, label: '5' }, { value: 20, label: '20' }, { value: 50, label: '50' }] });
    const btns = ui.row(p.body, 'btns');
    const runB = ui.button(btns, '학습 실행', () => start(), { primary: true });
    const st = ui.stats(p.body, [
      { key: 'sa', label: 'SARSA 최근 100회 평균', tone: 'accent' },
      { key: 'ql', label: 'Q-learning 최근 100회 평균', tone: 'signal' },
      { key: 'ls', label: 'SARSA 탐욕 경로 길이' },
      { key: 'lq', label: 'Q-learning 탐욕 경로 길이' },
      { key: 'prog', label: '진행' },
    ]);
    const chartEl = document.createElement('div');
    p.body.appendChild(chartEl);
    const chart = plot.line(chartEl, { height: 250, x: { label: '에피소드', min: 1, max: 300 }, y: { label: '에피소드당 보상 합', min: -100, max: 0 }, series: [] });
    const g2 = document.createElement('div');
    g2.className = 'grid2';
    const gs = document.createElement('div');
    const gq = document.createElement('div');
    gs.innerHTML = '<p class="w-caption" style="margin:0 0 4px"><strong>SARSA</strong>가 배운 탐욕 경로</p>';
    gq.innerHTML = '<p class="w-caption" style="margin:0 0 4px"><strong>Q-learning</strong>이 배운 탐욕 경로</p>';
    g2.append(gs, gq);
    p.body.appendChild(g2);
    const env = new sim.GridWorld(sim.layouts.cliff, { rewards: { G: 0 }, step: -1, cliffReward: -100 });
    const gridS = sim.renderGrid(gs, env, { showValues: false, showArrows: false, maxCell: 48 });
    const gridQ = sim.renderGrid(gq, env, { showValues: false, showArrows: false, maxCell: 48 });
    const EP = 300;
    let token = 0;

    function runOnce(method, eps, alpha, r) {
      const Q = zeros(env.nS, 4);
      const rets = new Array(EP);
      for (let ep = 0; ep < EP; ep++) {
        let s = env.start, a = egreedy(Q[s], eps, r), G = 0;
        for (let t = 0; t < 2000; t++) {
          const o = env.P[s][a][0];
          G += o.r;
          const s2 = o.s2;
          let a2 = 0, target;
          if (o.done) target = o.r;
          else if (method === 'sarsa') { a2 = egreedy(Q[s2], eps, r); target = o.r + Q[s2][a2]; }
          else target = o.r + Math.max(Q[s2][0], Q[s2][1], Q[s2][2], Q[s2][3]);
          Q[s][a] += alpha * (target - Q[s][a]);
          if (o.done) break;
          if (method !== 'sarsa') a2 = egreedy(Q[s2], eps, r);
          s = s2; a = a2;
        }
        rets[ep] = G;
      }
      return { Q, rets };
    }

    function start() {
      const my = ++token;
      const eps = eS.get(), alpha = aS.get(), runs = +runsSel.get();
      const sumS = new Array(EP).fill(0), sumQ = new Array(EP).fill(0);
      let done = 0, lastS = null, lastQ = null;
      runB.disabled = true;
      const r = sim.rng(1234);
      function chunk() {
        if (my !== token) return;
        const a = runOnce('sarsa', eps, alpha, r);
        const b = runOnce('q', eps, alpha, r);
        for (let i = 0; i < EP; i++) { sumS[i] += a.rets[i]; sumQ[i] += b.rets[i]; }
        lastS = a.Q; lastQ = b.Q;
        done++;
        draw(sumS, sumQ, done, runs, lastS, lastQ);
        if (done < runs) setTimeout(chunk, 0);
        else runB.disabled = false;
      }
      chunk();
    }

    function draw(sumS, sumQ, n, runs, QS, QQ) {
      const avgS = sumS.map((x) => x / n), avgQ = sumQ.map((x) => x / n);
      const smS = sim.smooth(avgS, 10), smQ = sim.smooth(avgQ, 10);
      chart.update({ series: [
        { name: 'SARSA', color: 'c1', data: smS.map((v, i) => [i + 1, v]) },
        { name: 'Q-learning', color: 'c2', data: smQ.map((v, i) => [i + 1, v]) },
      ] });
      st.set('sa', sim.mean(avgS.slice(-100)).toFixed(1));
      st.set('ql', sim.mean(avgQ.slice(-100)).toFixed(1));
      st.set('prog', n + ' / ' + runs + ' 실행');
      const pS = greedyPath(env, QS, 60), pQ = greedyPath(env, QQ, 60);
      const ok = (pp) => env.cells[pp[pp.length - 1]].terminal;
      st.set('ls', ok(pS) ? (pS.length - 1) + ' 스텝' : '목표 미도달');
      st.set('lq', ok(pQ) ? (pQ.length - 1) + ' 스텝' : '목표 미도달');
      const vS = QS.map((q) => Math.max(...q)), vQ = QQ.map((q) => Math.max(...q));
      gridS.update({ V: vS, trail: pS, agent: null, vmax: 30 });
      gridQ.update({ V: vQ, trail: pQ, agent: null, vmax: 30 });
    }
    start();
  }

  /* ---------- 미로 Q-learning 애니메이션 ---------- */
  function mountGridQ(el) {
    const p = ui.panel(el, { kind: 'SIM', title: '미로에서의 Q-learning (Q 삼각형 표시)' });
    const ctr = ui.row(p.body);
    const aS = ui.slider(ctr, { label: '스텝 크기 $\\alpha$', min: 0.05, max: 1, step: 0.05, value: 0.5, format: ui.fmt.f(2) });
    const gS = ui.slider(ctr, { label: '할인율 $\\gamma$', min: 0.5, max: 0.99, step: 0.01, value: 0.95, format: ui.fmt.f(2) });
    const eS = ui.slider(ctr, { label: '탐험률 $\\epsilon$', min: 0, max: 0.5, step: 0.01, value: 0.1, format: ui.fmt.f(2) });
    const spd = ui.select(ctr, { label: '재생 속도', value: 5, options: [{ value: 1, label: '프레임당 1 스텝' }, { value: 5, label: '프레임당 5 스텝' }, { value: 50, label: '프레임당 50 스텝' }] });
    const btns = ui.row(p.body, 'btns');
    ui.button(btns, '1 스텝', () => { step(); draw(); });
    ui.button(btns, '1 에피소드', () => { const e = ep; let n = 0; while (ep === e && n < 5000) { step(); n++; } draw(); });
    ui.button(btns, '20 에피소드', () => { const e = ep; let n = 0; while (ep < e + 20 && n < 100000) { step(); n++; } draw(); });
    const playB = ui.button(btns, '자동 재생', () => { if (lp.running) { lp.stop(); playB.textContent = '자동 재생'; } else { lp.start(); playB.textContent = '정지'; } }, { primary: true });
    ui.button(btns, '초기화', () => { reset(); draw(); });
    const st = ui.stats(p.body, [
      { key: 'ep', label: '완료 에피소드' },
      { key: 't', label: '현재 에피소드 스텝' },
      { key: 'last', label: '직전 에피소드 길이', tone: 'accent' },
      { key: 'opt', label: '최단 경로 길이' },
      { key: 'd', label: '마지막 TD 오차 $\\delta$', tone: 'signal' },
    ]);
    const split = document.createElement('div');
    split.className = 'w-split';
    const left = document.createElement('div');
    const right = document.createElement('div');
    split.append(left, right);
    p.body.appendChild(split);
    const env = new sim.GridWorld(sim.layouts.maze, { rewards: { G: 1 }, step: 0, slip: 0 });
    const r = sim.rng(42);
    let Q, s, ep, t, lens, trail, lastDelta;
    const opt = shortest(env);
    const grid = sim.renderGrid(left, env, { showQ: true, showValues: false });
    const chart = plot.line(right, { height: 240, x: { label: '에피소드', min: 1 }, y: { label: '에피소드 길이 (스텝)', min: 0 }, series: [] });
    const lp = ui.loop(() => { const k = +spd.get(); for (let i = 0; i < k; i++) step(); draw(); }, 30);

    function shortest(e) {
      const dist = new Array(e.nS).fill(-1);
      dist[e.start] = 0;
      const qu = [e.start];
      while (qu.length) {
        const x = qu.shift();
        if (e.cells[x].terminal) return dist[x];
        for (let a = 0; a < 4; a++) { const y = e.P[x][a][0].s2; if (dist[y] < 0) { dist[y] = dist[x] + 1; qu.push(y); } }
      }
      return NaN;
    }
    function reset() { Q = zeros(env.nS, 4); s = env.start; ep = 0; t = 0; lens = []; trail = [s]; lastDelta = NaN; }
    function step() {
      const a = egreedy(Q[s], eS.get(), r);
      const o = env.P[s][a][0];
      const target = o.done ? o.r : o.r + gS.get() * Math.max(...Q[o.s2]);
      lastDelta = target - Q[s][a];
      Q[s][a] += aS.get() * lastDelta;
      t++;
      if (o.done || t >= 3000) {
        lens.push(t); ep++; t = 0; s = env.start; trail = [s];
      } else { s = o.s2; trail.push(s); if (trail.length > 25) trail.shift(); }
    }
    function draw() {
      const pi = Q.map((q) => (Math.max(...q) > 1e-9 ? q.map((x, i) => (i === sim.argmax(q) ? 1 : 0)) : null));
      grid.update({ Q, pi, agent: s, trail, vmax: 1 });
      st.set('ep', ep);
      st.set('t', t);
      st.set('last', lens.length ? lens[lens.length - 1] : '–');
      st.set('opt', opt);
      st.set('d', Number.isFinite(lastDelta) ? lastDelta.toFixed(3) : '–');
      chart.update({ series: [{ name: '에피소드 길이', color: 'c1', data: lens.map((v, i) => [i + 1, v]), markers: lens.length < 40 }], hlines: [{ y: opt, label: '최단 경로', color: 'signal' }], x: { label: '에피소드', min: 1, max: Math.max(10, lens.length) } });
    }
    reset();
    // 페이지를 열었을 때 이미 학습이 진행된 상태를 보여 준다
    while (ep < 12) step();
    draw();
  }

  /* ---------- 최댓값 편향 ---------- */
  function mountMaxBias(el) {
    const p = ui.panel(el, { kind: 'SIM', title: '최댓값 편향: 상태 A에서 왼쪽을 고르는 비율', caption: '$\\epsilon=0.1$, $\\alpha=0.1$, $\\gamma=1$. 최적 행동은 오른쪽이므로 $\\epsilon$-greedy의 최소 왼쪽 비율은 $\\epsilon/2 = 5\\%$이다. 모든 곡선은 실행할 때마다 실제로 학습해서 얻는다.' });
    const ctr = ui.row(p.body);
    const nS = ui.slider(ctr, { label: 'B의 행동 개수', min: 1, max: 30, step: 1, value: 10, format: ui.fmt.int });
    const muS = ui.slider(ctr, { label: 'B 보상 평균 $\\mu$', min: -0.5, max: 0.2, step: 0.05, value: -0.1, format: ui.fmt.f(2) });
    const sdS = ui.slider(ctr, { label: 'B 보상 표준편차 $\\sigma$', min: 0, max: 2, step: 0.1, value: 1, format: ui.fmt.f(1) });
    const runsSel = ui.select(ctr, { label: '독립 실행 수', value: 1000, options: [{ value: 300, label: '300' }, { value: 1000, label: '1000' }, { value: 3000, label: '3000' }] });
    const btns = ui.row(p.body, 'btns');
    const runB = ui.button(btns, '실험 실행', () => start(), { primary: true });
    const st = ui.stats(p.body, [
      { key: 'q', label: 'Q-learning 최대 왼쪽 비율', tone: 'signal' },
      { key: 'd', label: 'Double Q 최대 왼쪽 비율', tone: 'accent' },
      { key: 'qa', label: '마지막 50회 평균 (Q / Double)' },
      { key: 'prog', label: '진행' },
    ]);
    const chartEl = document.createElement('div');
    p.body.appendChild(chartEl);
    const chart = plot.line(chartEl, { height: 250, x: { label: '에피소드', min: 1, max: 300 }, y: { label: '왼쪽 선택 비율 (%)', min: 0, max: 100 }, series: [] });
    const EP = 300, EPS = 0.1, AL = 0.1;
    let token = 0;

    function runBatch(k, nb, mu, sd, r, accQ, accD) {
      for (let run = 0; run < k; run++) {
        // Q-learning
        let QA = [0, 0], QB = new Array(nb).fill(0);
        for (let ep = 0; ep < EP; ep++) {
          const a = egreedy(QA, EPS, r);
          if (a === 0) {
            accQ[ep]++;
            QA[0] += AL * (0 + Math.max(...QB) - QA[0]);
            const b = egreedy(QB, EPS, r);
            QB[b] += AL * (mu + sd * r.normal() - QB[b]);
          } else QA[1] += AL * (0 - QA[1]);
        }
        // Double Q-learning
        const A1 = [0, 0], A2 = [0, 0], B1 = new Array(nb).fill(0), B2 = new Array(nb).fill(0);
        for (let ep = 0; ep < EP; ep++) {
          const a = egreedy([A1[0] + A2[0], A1[1] + A2[1]], EPS, r);
          if (a === 0) {
            accD[ep]++;
            if (r() < 0.5) { const bs = sim.argmaxRand(B1, r); A1[0] += AL * (B2[bs] - A1[0]); }
            else { const bs = sim.argmaxRand(B2, r); A2[0] += AL * (B1[bs] - A2[0]); }
            const sumB = B1.map((x, i) => x + B2[i]);
            const b = egreedy(sumB, EPS, r);
            const rew = mu + sd * r.normal();
            if (r() < 0.5) B1[b] += AL * (rew - B1[b]); else B2[b] += AL * (rew - B2[b]);
          } else if (r() < 0.5) A1[1] += AL * (0 - A1[1]); else A2[1] += AL * (0 - A2[1]);
        }
      }
    }

    function start() {
      const my = ++token;
      const nb = nS.get(), mu = muS.get(), sd = sdS.get(), runs = +runsSel.get();
      const accQ = new Array(EP).fill(0), accD = new Array(EP).fill(0);
      const r = sim.rng(99);
      let done = 0;
      runB.disabled = true;
      function chunk() {
        if (my !== token) return;
        const k = Math.min(150, runs - done);
        runBatch(k, nb, mu, sd, r, accQ, accD);
        done += k;
        const q = accQ.map((x) => (100 * x) / done), d = accD.map((x) => (100 * x) / done);
        chart.update({ series: [
          { name: 'Q-learning', color: 'c2', data: q.map((v, i) => [i + 1, v]) },
          { name: 'Double Q-learning', color: 'c1', data: d.map((v, i) => [i + 1, v]) },
        ], hlines: [{ y: 5, label: '최적 (ε/2 = 5%)', color: 'good' }] });
        st.set('q', Math.max(...q).toFixed(1) + '%');
        st.set('d', Math.max(...d).toFixed(1) + '%');
        st.set('qa', sim.mean(q.slice(-50)).toFixed(1) + '% / ' + sim.mean(d.slice(-50)).toFixed(1) + '%');
        st.set('prog', done + ' / ' + runs);
        if (done < runs) setTimeout(chunk, 0); else runB.disabled = false;
      }
      chunk();
    }
    start();
  }
})();
