/* 10 DQN에서 Rainbow까지 */
(function () {
  const { ui, sim, plot } = RL;

  RL.chapter({
    id: 'dqn',
    title: 'DQN에서 Rainbow까지',
    subtitle: 'Q-learning에 신경망을 끼우면 Deadly Triad가 그대로 들어온다. 경험 재생과 타깃 네트워크가 그것을 어떻게 다스렸고, 이후 여섯 개의 개선이 각각 어떤 병을 고쳤는지를 실험으로 확인한다.',
    time: 45,
    level: '중급 · 핵심',
    prereq: ['qlearning', 'approx'],
    theses: ['T8', 'T1', 'T6'],
    easy: {
      hook: 'Q 표를 신경망으로 바꾸면 학습이 쉽게 폭주한다. DQN은 지난 경험을 섞어서 다시 보고, 정답지를 잠시 얼려 두는 두 가지 방법으로 이 폭주를 막았다.',
      intro: '<p>Atari 게임 화면은 매번 조금씩 다른 그림이라 칸마다 숫자를 적는 Q 표를 만들 수 없다. 그래서 화면을 넣으면 행동별 점수가 나오는 <strong>신경망</strong>을 쓴다. 문제는 신경망이 자기가 낸 점수로 자기 정답지를 만든다는 점이다. 정답 쪽으로 고치면 정답지도 따라 움직인다.</p><p>DQN은 최근 경험 100만 개를 쌓아 두고 무작위로 섞어 다시 공부한다(경험 재생). 그리고 정답지를 계산하는 신경망을 복사해 한동안 얼려 둔다(타깃 네트워크).</p>',
      analogy: '과녁을 향해 활을 쏘는데, 한 발 쏠 때마다 과녁이 화살 쪽으로 조금씩 움직이는 상황이다. 맞혔다 싶을 때마다 과녁은 이미 옮겨 가 있다. 타깃 네트워크는 과녁을 잠시 바닥에 못 박아 두는 장치다. 몇천 발을 쏜 뒤에 과녁 위치를 한 번에 옮긴다.',
      path: ['움직이는 정답지를 직접 쫓아가며 정답지를 얼리는 이유를 확인한다', 'DQN 목표값 하나를 작은 숫자로 계산한다', '잡음 섞인 점수 중 최댓값을 믿을 때 생기는 과대평가와 Double DQN을 본다', 'Rainbow의 여섯 가지 개선을 표로 정리한다'],
      recap: [
        '신경망 Q는 자기 예측으로 자기 정답지를 만들기 때문에, 고칠수록 정답지가 따라 움직이는 고리가 생긴다.',
        '경험을 쌓아 두고 섞어서 다시 보면 연달아 들어오는 비슷한 경험에 휘둘리지 않고, 정답지용 신경망을 잠시 얼려 두면 매 구간이 맞힐 수 있는 문제가 된다.',
        '잡음 섞인 점수의 최댓값은 실제보다 높게 나오므로 고르는 신경망과 평가하는 신경망을 나누고, 나머지 개선들도 각각 약점 하나씩을 고친다.',
      ],
    },
    goals: [
      'Fitted Q Iteration에서 DQN 손실을 유도하고, 경험 재생과 타깃 네트워크가 각각 무엇을 해결하는지 설명할 수 있다.',
      '최댓값 편향의 크기를 행동 수와 잡음으로 계산하고 Double DQN의 타깃이 그것을 어떻게 줄이는지 확인한다.',
      'Rainbow의 구성요소(Double, PER, Dueling, n-step, 분포형, Noisy)가 각각 겨냥한 문제를 표로 정리할 수 있다.',
    ],
    html: String.raw`
<p>DQN(Mnih et al. 2013, 2015)은 Atari 화면의 픽셀을 입력으로 받아 같은 신경망 구조와 같은 하이퍼파라미터로 49개 게임을 학습했다. 알고리즘 자체는 Q-learning이다. 새로웠던 것은 신경망 Q-learning을 <strong>발산하지 않게 만든 두 장치</strong>, 경험 재생과 타깃 네트워크였다. 09장에서 본 대로 신경망 Q-learning은 함수근사 + 부트스트랩 + off-policy, 즉 Deadly Triad를 모두 갖고 있다(T8).</p>
<p>먼저 아래에서 움직이는 정답지를 직접 쫓아갈 수 있다. 정답지를 얼렸을 때와 얼리지 않았을 때 무엇이 다른지가 이 장 전체의 출발점이다.</p>
<div data-w="try-target"></div>

<h2>손실 함수의 유도</h2>
<div data-w="step-dqn"></div>
<div data-w="dv-dqn"></div>
<div data-w="fx-dqn"></div>
<p>DQN 업데이트는 "타깃 $y$는 상수, 예측 $Q_\theta$만 미분"하는 semi-gradient다. 손실 함수처럼 보이지만 타깃이 주기적으로 바뀌므로, 서로 다른 타깃 구간의 손실 값은 비교할 수 없다. 각 구간이 하나의 회귀 문제이고, 전체는 그 회귀 문제들을 이어 붙인 근사 가치 반복이다(<a href="#qviews">08장 관점 2</a>).</p>

<h2>경험 재생과 타깃 네트워크</h2>
<div class="grid2">
  <div class="card"><h4>경험 재생 (experience replay)</h4><p>최근 약 100만 개의 전이 $(s,a,r,s')$를 버퍼에 쌓고 무작위 미니배치로 학습한다(Lin 1992의 아이디어).</p><p><strong>해결:</strong> (1) 연달아 들어오는 샘플의 강한 상관을 깨서 SGD의 i.i.d. 가정에 가깝게 만든다. (2) 한 번 쓰고 버리던 데이터를 여러 번 다시 쓴다. (3) 여러 과거 정책의 데이터가 섞여 데이터 분포가 천천히 변한다. Q-learning이 off-policy이기 때문에 가능하다.</p></div>
  <div class="card"><h4>타깃 네트워크 (target network)</h4><p>타깃 계산에만 쓰는 파라미터 복사본 $\bar\theta$를 두고, $C$ 스텝(Atari에서 1만 스텝)마다 $\bar\theta\leftarrow\theta$로 갱신한다.</p><p><strong>해결:</strong> 한 업데이트가 $Q_\theta(s,a)$를 올리면 일반화로 $Q_\theta(s',\cdot)$도 올라 타깃이 같이 도망가는 되먹임 고리를 끊는다. 구간 안에서는 고정 라벨 회귀가 된다. 연속 제어에서는 매 스텝 조금씩 섞는 Polyak 평균 $\bar\theta\leftarrow\tau\theta + (1-\tau)\bar\theta$를 쓴다.</p></div>
</div>
<p>아래는 실제로 학습이 일어나는 작은 실험이다. 1차원 연속 사슬 $x\in[0,1]$에서 행동은 왼쪽이나 오른쪽으로 0.05씩 움직이는 것이고, 왼쪽 끝에 닿으면 +0.3, 오른쪽 끝에 닿으면 +1을 받고 끝난다. Q는 행동별 12개 RBF 특징의 선형 함수다. 세 설정을 같은 시드로 학습시키고 정확한 $Q^*$와의 평균 오차를 비교한다.</p>
<div data-w="chain"></div>
<ul>
<li>$\gamma$가 작거나 스텝 크기가 작으면 세 설정 모두 비슷하게 수렴한다. 이 장치들은 불안정한 영역에서 학습이 무너지지 않게 막는다. 모든 설정에서 결과를 좋게 만들지는 않는다.</li>
<li>$\gamma = 0.99$, 큰 스텝 크기에서는 온라인 업데이트와 재생만 쓴 설정이 발산하는 시드가 생기고, 재생 + 타깃 고정은 버틴다. 부트스트랩 되먹임이 강할수록(유효 지평 $1/(1-\gamma)$가 길수록) 타깃 고정의 가치가 커진다.</li>
<li>대신 타깃 고정은 초반 학습을 늦춘다. 타깃이 $C$ 스텝 동안 낡은 정보로 고정되기 때문이다.</li>
</ul>

<h3>실전 세부 사항</h3>
<ul>
<li><strong>Huber 손실</strong>: $|\delta|\le1$에서는 제곱이고 그 밖에서는 선형이다. TD 오차의 경사를 $[-1,1]$로 자르는 것과 같아서, 큰 오차 하나가 파라미터를 크게 흔드는 일을 막는다.</li>
<li><strong>보상 클리핑</strong>: Atari에서는 보상을 부호 $\{-1,0,+1\}$로 잘라 게임마다 다른 점수 규모를 통일했다. 대신 목적 함수가 바뀐다(+1과 +100을 구별하지 못한다).</li>
<li><strong>프레임 쌓기</strong>: 최근 4 프레임을 입력으로 넣어 속도 정보를 상태에 포함시킨다. 관측을 마르코프하게 만드는 장치다(<a href="#pomdp">04장</a>).</li>
<li><strong>$\epsilon$ 스케줄</strong>: 첫 100만 프레임 동안 1.0에서 0.1로 선형으로 줄이고, 평가 때는 0.05 정도를 쓴다. 무작위 흔들기(dithering) 수준의 탐험이라 몬테수마의 복수 같은 희소 보상 게임은 거의 풀지 못했다(<a href="#bandit">05장</a>).</li>
</ul>

<h2>과대추정과 Double DQN</h2>
<p>07장의 최댓값 편향은 신경망에서 더 심하다. 추정 오차가 어디에나 있고, 부트스트랩을 타고 앞 상태로 전파되기 때문이다. 아래 계산기의 상황은 이렇다. 참 가치는 $Q(a_1)=0$이고 나머지 행동은 $-\Delta$이며, 각 추정치에 $\mathcal{N}(0,\sigma^2)$ 잡음이 낀다. 이때 단일 추정기와 이중 추정기의 편향을 몬테카를로로 계산한다.</p>
<div data-w="overest"></div>
<p>Double DQN(van Hasselt, Guez & Silver 2016)은 이미 있는 두 네트워크를 다시 쓴다. <strong>온라인 네트워크로 행동을 고르고 타깃 네트워크로 평가</strong>한다.</p>
$$y^{\text{DDQN}} = r + \gamma\, Q_{\bar\theta}\big(s',\, \hl{\arg\max_{a'} Q_\theta(s',a')}\big)$$
<p>두 네트워크가 완전히 독립은 아니므로 편향이 완전히 사라지지는 않지만, 추가 비용 없이 과대추정을 크게 줄인다.</p>

<h2>Dueling 구조</h2>
<p>많은 상태에서 어떤 행동을 하든 결과가 비슷하다(행동 간격이 작다). Dueling 네트워크(Wang et al. 2016)는 상태 가치 $V$와 advantage $A$를 따로 추정하고 합친다.</p>
$$Q_\theta(s,a) = V_\theta(s) + \Big(A_\theta(s,a) - \frac{1}{|\mathcal{A}|}\sum_{a'}A_\theta(s,a')\Big)$$
<p>평균을 빼는 이유는 <strong>식별 가능성</strong>이다. $V$에 상수를 더하고 $A$에서 같은 상수를 빼도 $Q$는 같으므로, 제약 없이는 $V$와 $A$가 정해지지 않는다. 평균을 빼면 $\sum_a A = 0$이 강제되어 $V$가 정책 평균에 가까운 의미를 갖는다. 모든 행동의 업데이트가 $V$를 공유하므로 드물게 고른 행동의 Q도 함께 좋아진다.</p>

<h2>우선순위 경험 재생 (PER)</h2>
<p>균등 샘플링은 이미 잘 맞힌 전이에 계산을 낭비한다. PER(Schaul et al. 2016)은 TD 오차가 큰 전이를 더 자주 뽑는다.</p>
$$P(i) = \frac{p_i^{\alpha}}{\sum_k p_k^{\alpha}},\quad p_i = |\delta_i| + \epsilon,\qquad w_i = \Big(\frac{1}{N\cdot P(i)}\Big)^{\beta}\Big/\max_j w_j$$
<p>샘플 분포를 바꾸면 기댓값이 편향되므로 중요도 가중치 $w_i$로 손실을 보정한다. $\beta$는 학습 후반에 1로 올려 편향을 완전히 제거한다. 우선순위 샘플링은 일종의 <em>능동 학습</em>이다. 동시에 "업데이트 분포 ≠ 목표 분포"의 차이를 키우므로 T8의 off-policy 요소를 강화한다.</p>
<div data-w="per"></div>

<h2>n-step, 분포형, Noisy Nets, 그리고 Rainbow</h2>
<ul>
<li><strong>n-step 타깃</strong>: $y = \sum_{k=0}^{n-1}\gamma^k r_{t+k+1} + \gamma^n\max_{a'}Q_{\bar\theta}(s_{t+n},a')$. 보상 정보가 한 번에 $n$칸 전파되고 부트스트랩에 덜 의존한다(T6). 재생 버퍼의 데이터는 옛 정책이 만든 것이라 엄밀히는 중요도 보정이 필요하지만, Rainbow는 보정 없이 $n=3$을 쓴다.</li>
<li><strong>분포형(C51)</strong>: Q 대신 리턴 분포를 51개 원자로 학습한다(<a href="#qviews">08장 관점 4</a>).</li>
<li><strong>Noisy Nets</strong>(Fortunato et al. 2018): 선형층 가중치에 학습 가능한 잡음 $w = \mu + \sigma\odot\varepsilon$을 넣는다. $\epsilon$-greedy처럼 매 스텝 독립적으로 흔드는 대신, 상태에 따라 일관된 탐험을 하고 그 크기 $\sigma$를 학습으로 줄여 간다.</li>
</ul>
<p>Rainbow(Hessel et al. 2018)는 이 여섯 가지를 DQN에 모두 합쳤다.</p>
<div class="table-wrap" style="position:relative"><table class="t">
<thead><tr><th>구성요소</th><th>겨냥한 문제</th><th>무엇을 바꿨나</th><th>대전제</th></tr></thead>
<tbody>
<tr><td>DQN 기본 (재생 + 타깃)</td><td>신경망 Q-learning의 발산</td><td>i.i.d.에 가까운 미니배치, 고정된 회귀 타깃</td><td>T8</td></tr>
<tr><td>Double Q</td><td>최댓값 편향(과대추정)</td><td>선택은 온라인, 평가는 타깃 네트워크</td><td>T8</td></tr>
<tr><td>Prioritized replay</td><td>데이터 사용의 비효율</td><td>$|\delta|$에 비례해 샘플링 + 중요도 보정</td><td>T8 (분포 변화)</td></tr>
<tr><td>Dueling</td><td>행동 간격이 작은 상태에서의 비효율</td><td>$V$와 $A$ 분리, 평균 빼기</td><td>—</td></tr>
<tr><td>n-step</td><td>느린 신용 전파</td><td>$n$ 스텝 실제 보상 + 부트스트랩</td><td>T6</td></tr>
<tr><td>Distributional (C51)</td><td>평균만으로는 약한 학습 신호</td><td>리턴 분포 학습, 투영 + KL</td><td>T1 (분포 축약)</td></tr>
<tr><td>Noisy Nets</td><td>비효율적 무작위 탐험</td><td>파라미터 잡음, 학습되는 탐험 크기</td><td>T7</td></tr>
</tbody></table></div>
<p>Rainbow 논문의 제거 실험(ablation)에서는 우선순위 재생과 n-step을 뺐을 때 성능 하락이 가장 컸고, 분포형이 그다음이었으며, Double과 Dueling의 개별 기여는 상대적으로 작았다고 보고됐다. 구성요소의 효과는 서로 겹친다(예: 분포형과 Double은 둘 다 과대추정의 영향을 줄인다). 그래서 각 효과를 따로 더하기보다 조합 전체의 효과로 읽는다.</p>

<h2>그 이후의 흐름</h2>
<ul>
<li><strong>분산 학습과 순환망</strong>: Ape-X(대규모 분산 PER), R2D2(Kapturowski et al. 2019)는 LSTM Q 네트워크와 재생 버퍼에 저장된 은닉 상태 + burn-in으로 부분 관측을 다룬다.</li>
<li><strong>탐험</strong>: NGU와 Agent57(Badia et al. 2020)은 내재적 보상과 여러 탐험 정책 사이의 메타 선택(밴딧)을 결합해, 57개 Atari 게임 모두에서 인간 기준 점수를 넘은 첫 에이전트로 보고됐다.</li>
<li><strong>모델 기반</strong>: MuZero는 가치 기반 탐색을 학습된 모델 위에서 수행한다(<a href="#modelbased">16장</a>).</li>
<li><strong>데이터 효율</strong>: 적은 상호작용(Atari 100k)에서 재생 비율을 높이고 네트워크를 주기적으로 리셋하거나 키우는 계열(SPR, BBF 등)이 이어졌다. 재생 비율이 높아질수록 신경망의 가소성 손실이 주요 병목으로 드러났다(아래 암묵지).</li>
<li><strong>연속 행동</strong>: $\max_{a'}$를 계산할 수 없으므로 정책 네트워크가 argmax를 대신한다. DDPG, TD3, SAC가 그렇다(<a href="#maxent">14장</a>). TD3의 clipped double Q는 Double Q의 직계 후손이다.</li>
</ul>
`,
    mount: {
      'dv-dqn': (el) => ui.derivation(el, {
        title: 'Fitted Q Iteration → DQN 손실',
        easy: '"가치 = 받은 점수 + 할인된 다음 화면의 최고 가치"를 지도학습 문제로 바꾼다. 정답 쪽은 얼려 둔 신경망으로 계산해 고정하고, 예측 쪽만 경사 하강으로 맞춘다. 정답지용 신경망은 몇천 걸음마다 한 번씩 최신 값으로 바꾼다.',
        steps: [
          { tex: String.raw`Q^*(s,a) = \mathbb{E}_{s'}\big[\, r + \gamma\max_{a'}Q^*(s',a') \,\big]`, why: '벨만 최적 방정식(02장)에서 출발한다.' },
          { tex: String.raw`Q_{k+1} = \arg\min_{\theta}\ \mathbb{E}_{(s,a,r,s')\sim\hl{\mathcal{D}}}\Big[\big(\underbrace{r + \gamma\max_{a'}Q_{k}(s',a')}_{y:\ \text{이전 반복으로 고정}} - Q_\theta(s,a)\big)^2\Big]`, why: '각 반복을 회귀 문제로 푼다(FQI). 제곱 오차의 최소화 해는 조건부 기댓값 $\\mathbb{E}[y|s,a] = (\\mathcal{T}^*Q_k)(s,a)$이므로, 표현력이 충분하면 $Q_{k+1} = \\mathcal{T}^*Q_k$가 된다.' },
          { tex: String.raw`Q_k \;\to\; Q_{\hl{\bar\theta}},\qquad \bar\theta \leftarrow \theta\ \text{ every } C \text{ steps}`, why: '"이전 반복"을 타깃 네트워크로 구현한다. 안쪽 회귀는 끝까지 풀지 않고 $C$ 스텝의 SGD로 근사해서 푼다.' },
          { tex: String.raw`L(\theta) = \mathbb{E}_{(s,a,r,s')\sim\hl{\text{Uniform}(\text{replay})}}\Big[\big(r + \gamma\max_{a'}Q_{\bar\theta}(s',a') - Q_\theta(s,a)\big)^2\Big]`, why: '데이터 분포 $\\mathcal{D}$는 재생 버퍼 위의 균등 분포다. 버퍼는 최근 여러 정책의 경험이 섞인 off-policy 데이터다.' },
          { tex: String.raw`\nabla_\theta L = -2\,\mathbb{E}\Big[\big(\underbrace{y - Q_\theta(s,a)}_{\delta}\big)\,\nabla_\theta Q_\theta(s,a)\Big]`, why: '$y$는 $\\bar\\theta$로 계산되어 $\\theta$에 대한 경사가 없다(semi-gradient가 정확한 경사가 되는 구간). 실전에서는 제곱 대신 Huber 손실로 $\\delta$를 자른다.' },
        ],
      }),
      'fx-dqn': (el) => ui.formula(el, {
        title: 'DQN 손실 해부',
        say: '{th|지금 학습 중인 신경망}을 고친다. {D|쌓아 둔 경험에서 무작위로 뽑은 샘플}마다, {y|"받은 점수 + 얼려 둔 신경망이 매긴 다음 화면의 최고 점수"}와 {q|지금 신경망이 실제로 한 행동에 매긴 점수}의 차이를 줄인다. 정답 쪽은 {tb|얼려 둔 복사본}이 계산하고, 차이가 너무 크면 {H|Huber 손실}이 그 영향을 줄인다.',
        tex: String.raw`L(\tm{th}{\theta}) = \tm{D}{\mathbb{E}_{(s,a,r,s')\sim\mathcal{D}}}\Big[\,\tm{H}{\ell_{\text{Huber}}}\Big(\tm{y}{r + \gamma \max_{a'} Q_{\tm{tb}{\bar\theta}}(s',a')} - \tm{q}{Q_\theta(s,a)}\Big)\Big]`,
        terms: [
          { id: 'th', sym: '\\theta', label: '온라인 네트워크 파라미터', desc: '매 스텝 업데이트되는 쪽.' },
          { id: 'D', sym: '\\mathcal{D}', label: '재생 버퍼 분포', desc: '최근 100만 전이의 균등(또는 우선순위) 샘플.', long: '이 분포가 곧 09장의 $D$다. 행동 정책들의 혼합이므로 목표(탐욕) 정책의 분포와 다르다. PER은 이 분포를 TD 오차 쪽으로 더 기울인다.' },
          { id: 'H', sym: '\\ell_{\\text{Huber}}', label: 'Huber 손실', desc: '작은 오차는 제곱, 큰 오차는 선형으로 센다. 경사 클리핑과 같다.' },
          { id: 'y', sym: 'y', label: '타깃', desc: '경사가 흐르지 않는 상수.', long: 'Double DQN은 여기서 $\\max_{a\'}Q_{\\bar\\theta}(s\',a\')$를 $Q_{\\bar\\theta}(s\', \\arg\\max_{a\'}Q_\\theta(s\',a\'))$로 바꾼다. n-step은 앞에 실제 보상을 더 붙이고, 분포형은 이 스칼라를 분포로 바꾼다.' },
          { id: 'tb', sym: '\\bar\\theta', label: '타깃 네트워크', desc: 'C 스텝마다 복사되는 낡은 파라미터.' },
          { id: 'q', sym: 'Q_\\theta(s,a)', label: '예측', desc: '실제로 실행했던 행동 a의 출력 하나만 학습된다.' },
        ],
      }),
      'try-target': mountTarget,
      'step-dqn': (el) => walk(el, {
        title: 'DQN과 Double DQN의 목표값을 손으로',
        caption: '질문에 숫자를 넣고 "확인"을 누르면 계산식이 열린다. 점수 $r = 1$, 할인율 $\\gamma = 0.9$로 계산한다.',
        steps: [
          { say: '버퍼에서 경험 하나(화면 s에서 행동 a를 해서 1점을 받고 화면 s′로 감)를 꺼냈다. 지금 신경망은 Q(s, a) = 4.0이라고 예측한다. 다음 화면 s′에서 세 행동의 점수는 지금 신경망이 (3.0, 5.0, 4.0), 얼려 둔 신경망이 (3.5, 4.0, 4.6)이다.', calc: String.raw`\begin{aligned} Q_\theta(s',\cdot) &= (3.0,\ 5.0,\ 4.0) \\ Q_{\bar\theta}(s',\cdot) &= (3.5,\ 4.0,\ 4.6) \end{aligned}` },
          { say: 'DQN은 얼려 둔 신경망의 점수 중 최댓값을 쓴다. 3.5, 4.0, 4.6 중 최댓값은?', ask: { answer: 4.6, tol: 0.01 }, calc: String.raw`\max_{a'} Q_{\bar\theta}(s',a') = 4.6` },
          { say: 'DQN 목표값 = 1 + 0.9 × 4.6은?', ask: { answer: 5.14, tol: 0.01 }, calc: String.raw`y^{\text{DQN}} = 1 + 0.9 \times 4.6 = 5.14` },
          { say: 'Double DQN은 고르기는 지금 신경망으로, 점수 매기기는 얼려 둔 신경망으로 한다. 지금 신경망은 점수 5.0인 두 번째 행동을 고르고, 얼려 둔 신경망은 그 행동에 4.0을 준다. Double DQN 목표값은?', ask: { answer: 4.6, tol: 0.01 }, calc: String.raw`y^{\text{DDQN}} = 1 + 0.9 \times Q_{\bar\theta}(s', a_2) = 1 + 0.9 \times 4.0 = 4.6` },
          { say: '두 신경망이 1등으로 꼽은 행동이 서로 다르다. 그렇다면 어느 쪽의 1등도 잡음 때문에 높게 나왔을 가능성이 크다. 예측 4.0을 기준으로 DQN은 1.14만큼 끌어올리려 하고, Double DQN은 0.6만큼만 올린다.', calc: String.raw`\begin{aligned} \delta^{\text{DQN}} &= 5.14 - 4.0 = 1.14 \\ \delta^{\text{DDQN}} &= 4.6 - 4.0 = 0.6 \end{aligned}` },
        ],
      }),
      chain: mountChain,
      overest: mountOverest,
      per: mountPER,
    },
    tacit: [
      { tag: 'algo', t: 'DQN은 "SGD로 근사해서 푸는 FQI"이고, $C$는 안쪽 반복 수다',
        d: '<p>타깃 네트워크 주기 $C$는 FQI의 바깥 반복 하나에 쓰는 SGD 스텝 수다. $C$가 너무 작으면 회귀가 수렴하기 전에 라벨이 바뀌어 "움직이는 과녁"이 되고, 너무 크면 가치 반복의 진행이 느려진다. 그래서 손실 곡선은 $C$마다 톱니 모양으로 튀는 것이 정상이며, 손실 값의 크기보다 "구간 안에서 잘 줄어드는가"를 보는 것이 맞다.</p>' },
      { tag: 'research', t: '자주 놓치는 설정: 재생 비율(replay ratio)과 가소성',
        d: '<p>환경 스텝당 경사 업데이트 수(재생 비율)를 올리면 데이터 효율이 좋아질 것 같지만, 어느 수준을 넘으면 오히려 나빠진다. 초기 데이터에 과적합한 신경망이 새 데이터에 적응하는 능력을 잃기 때문이다(primacy bias, Nikishin et al. 2022). 네트워크 일부를 주기적으로 리셋하면 재생 비율을 크게 높일 수 있다는 결과(D\'Oro et al. 2023)가 이어졌다. 딥 RL의 많은 불안정성을 "비정상 타깃에 계속 적응해야 하는 신경망"의 문제로 보는 관점이다.</p>' },
      { tag: 'math', t: '과대추정은 드문 상태와 비슷한 행동이 많은 곳에서 크다',
        d: '<p>편향은 대략 추정 잡음 $\\sigma$와 경쟁하는 행동 수의 $\\sqrt{2\\ln n}$에 비례한다. 잡음은 데이터가 적은 상태에서 크고, 경쟁 행동은 행동 간격이 작은 상태에서 많다. 이 편향이 부트스트랩으로 앞 상태에 더해지므로, 과대추정은 "드물게 가 본, 결정이 애매한 상태"에서 시작해 정책을 그쪽으로 끌어당긴다. 오프라인 RL에서 분포 밖 행동의 Q가 폭주하는 현상(15장)이 그 극단적인 경우다.</p>' },
      { tag: 'algo', t: 'Dueling의 평균 빼기는 식별 가능성 문제다',
        d: '<p>$V + A$는 상수 하나만큼 자유도가 남아 학습이 표류할 수 있다. 원 논문은 $\\max_a A$를 빼는 버전(그러면 최선 행동의 $A=0$, $V = \\max Q$로 의미가 정확하다)과 평균을 빼는 버전을 비교했고, 평균 버전이 더 안정적이라 표준이 됐다. 의미의 정확성과 최적화의 매끄러움 사이의 선택이다. 같은 "상수 자유도" 문제가 softmax logit, Bradley–Terry 보상, DPO 암묵 보상에서도 반복된다(08장).</p>' },
      { tag: 'practice', t: 'Huber와 보상 클리핑은 목적을 바꾼다',
        d: '<p>Huber 손실은 큰 TD 오차를 덜 믿겠다는 강건 회귀이고, 보상 클리핑은 "+1과 +100을 같게 보겠다"는 목적 변경이다. Atari에서 하나의 하이퍼파라미터 세트가 통한 것은 이 정규화 덕분이지만, 큰 보상과 작은 보상을 구별해야 하는 게임에서는 성능을 잃는다. 이후 PopArt(van Hasselt et al. 2016)처럼 타깃 크기를 적응적으로 정규화하거나, 가치 함수를 변환($h(x)=\\mathrm{sign}(x)(\\sqrt{|x|+1}-1)+\\epsilon x$, R2D2/MuZero 계열)해 클리핑 없이 규모를 다루는 방법이 쓰인다.</p>' },
      { tag: 'practice', t: 'Polyak 평균의 $\\tau$는 타깃 주기 $1/\\tau$와 비슷하다',
        d: '<p>$\\bar\\theta\\leftarrow\\tau\\theta+(1-\\tau)\\bar\\theta$은 과거 파라미터의 지수 가중 평균이며 평균 지연이 약 $1/\\tau$ 스텝이다. $\\tau=0.005$(SAC, TD3의 흔한 값)는 대략 200 스텝 주기의 하드 업데이트와 비슷한 "느림"을 준다. 하드 업데이트는 톱니 모양 타깃, Polyak은 매끄러운 타깃을 만든다는 차이가 있다. 하이퍼파라미터를 옮길 때 이 환산을 쓰면 출발점을 잡기 쉽다.</p>' },
    ],
    quiz: [
      { q: 'DQN의 타깃 네트워크가 주로 해결하려는 문제는?', options: ['보상이 희소한 문제', '업데이트할 때마다 타깃이 함께 움직이는 되먹임', '행동 공간이 연속인 문제', '데이터 재사용이 안 되는 문제'], answer: 1,
        explain: '온라인 네트워크로 타깃을 계산하면 업데이트가 타깃 자체를 바꾼다. 타깃을 $C$ 스텝 고정하면 각 구간이 고정 라벨 회귀가 된다. 데이터 재사용은 경험 재생의 역할이다.' },
      { q: 'Double DQN의 타깃은?', options: ['$r+\\gamma\\max_{a\'}Q_\\theta(s\',a\')$', '$r+\\gamma Q_{\\bar\\theta}(s\',\\arg\\max_{a\'}Q_\\theta(s\',a\'))$', '$r+\\gamma\\min(Q_\\theta, Q_{\\bar\\theta})$', '$r+\\gamma\\,\\mathbb{E}_{a\'}Q_{\\bar\\theta}(s\',a\')$'], answer: 1,
        explain: '온라인 네트워크로 행동을 고르고 타깃 네트워크로 평가한다. 셋째 보기는 TD3의 clipped double Q에 가깝다.' },
      { q: 'Dueling 구조에서 $A$의 평균을 빼는 이유는?', options: ['계산 속도', '$V$와 $A$의 상수 자유도를 없애 식별 가능하게 하려고', '과대추정을 없애려고', '탐험을 늘리려고'], answer: 1,
        explain: '$V+c$와 $A-c$는 같은 Q를 준다. 평균을 빼면 $\\sum_a A=0$이 강제되어 분해가 유일해진다.' },
      { q: 'PER에서 중요도 가중치 $w_i$가 필요한 이유는?', options: ['TD 오차를 키우려고', '우선순위 샘플링이 바꾼 데이터 분포 때문에 생기는 기댓값의 편향을 보정하려고', '타깃 네트워크를 대신하려고', '보상을 클리핑하려고'], answer: 1,
        explain: '샘플 분포를 $P(i)$로 바꾸면 손실의 기댓값이 균등 분포 기준과 달라진다. $(NP(i))^{-\\beta}$를 곱해 보정하고, $\\beta\\to1$이면 완전히 불편이 된다.' },
    ],
  });

  /* ---------- 공용: 좁은 화면에서 단계 카드가 넘치지 않게 감싼 walkthrough ---------- */
  function walk(el, o) {
    ui.walkthrough(el, o);
    el.querySelectorAll('.wk-step').forEach((li) => { li.style.minWidth = '0'; });
  }

  /* ---------- 체험: 움직이는 정답지 ---------- */
  function mountTarget(el) {
    const p = ui.panel(el, { kind: 'TRY', title: '움직이는 정답지 쫓기', caption: '"정답지 쪽으로 고치기"를 몇 번 누르면 내 예측(파랑)이 정답지(주황)를 쫓아가고, 정답지를 얼리지 않으면 고칠 때마다 정답지가 같이 움직인다. 상황은 이렇다. 한 장면이 매번 1점을 주고 같은 장면으로 돌아오므로, 이 장면의 참 가치는 1 + 0.9 + 0.81 + … = 10이다. 정답지는 "1 + 0.9 × (정답지용 신경망의 예측)"으로 만든다.' });
    const G = 0.9, A = 0.5;
    let frozen = false, link = 1;
    const ctr = ui.row(p.body);
    const fz = ui.checkbox(ctr, { label: '정답지 얼리기 (타깃 네트워크)', value: false, onChange: (v) => { frozen = v; reset(); draw(v ? '정답지를 얼렸다. 이제 고쳐도 정답지가 움직이지 않는다. 충분히 가까워지면 "정답지 새로 만들기"를 누른다.' : '정답지를 얼리지 않는다. 정답지용 신경망이 곧 내 신경망이다.'); } });
    ui.select(ctr, { label: '다음 장면과 숫자를 나눠 쓰는 정도', value: 1, options: [{ value: 1, label: '보통 (다음 장면 값 = 내 예측)' }, { value: 1.2, label: '심함 (다음 장면 값 = 내 예측의 1.2배)' }], onChange: (v) => { link = +v; reset(); draw(link > 1 ? '다음 장면의 값이 내 예측의 1.2배로 묶였다. 0.9 × 1.2 = 1.08이 1보다 크다.' : '보통 설정으로 돌아왔다.'); } });
    const btns = ui.row(p.body, 'btns');
    ui.button(btns, '정답지 쪽으로 고치기', () => { fix(true); }, { primary: true });
    const copyB = ui.button(btns, '정답지 새로 만들기 (복사)', () => { copy(true); });
    ui.button(btns, '자동 20번', auto);
    ui.button(btns, '처음부터', () => { reset(); draw('처음으로 돌아왔다. 내 예측은 0이다.'); });
    const st = ui.stats(p.body, [
      { key: 'n', label: '고친 횟수' },
      { key: 'gap', label: '정답지까지 남은 거리', tone: 'signal' },
      { key: 'true', label: '참값 10까지 남은 거리', tone: 'accent' },
      { key: 'eff', label: '내가 다가간 만큼 정답지가 도망간 비율' },
    ]);
    const lineEl = document.createElement('div');
    const say = document.createElement('div');
    say.className = 'fx-detail';
    const chartEl = document.createElement('div');
    p.body.append(lineEl, say, chartEl);
    const chart = plot.line(chartEl, { height: 220, x: { label: '고친 횟수', min: 0 }, y: { label: '값', min: 0 }, series: [] });
    let q, qt, n, hist, moved, fled;
    const target = () => 1 + G * link * (frozen ? qt : q);
    function reset() { q = 0; qt = 0; n = 0; hist = [[0, 0, target()]]; moved = 0; fled = 0; copyB.disabled = !frozen; }
    function fix(explain) {
      const y0 = target(), q0 = q;
      q = q + A * (y0 - q);
      n++;
      const y1 = target();
      moved += Math.abs(q - q0);
      fled += Math.abs(y1 - y0);
      hist.push([n, q, y1]);
      if (explain) {
        const msg = '내 예측: ' + q0.toFixed(2) + ' → ' + q.toFixed(2) + '. ' + (frozen ? '정답지는 ' + y1.toFixed(2) + '에서 움직이지 않아서, 남은 거리가 절반(' + Math.abs(y0 - q0).toFixed(2) + ' → ' + Math.abs(y1 - q).toFixed(2) + ')으로 줄었다.' : '그 사이 정답지도 ' + y0.toFixed(2) + '에서 ' + y1.toFixed(2) + '까지 ' + (y1 - y0).toFixed(2) + '만큼 움직였다. 내가 다가간 거리의 ' + Math.round((100 * Math.abs(y1 - y0)) / Math.max(1e-9, Math.abs(q - q0))) + '%만큼 정답지가 도망간 셈이다.');
        draw(msg);
      }
    }
    function copy(explain) {
      if (!frozen) return;
      const y0 = target();
      qt = q;
      const y1 = target();
      hist.push([n, q, y1]);
      fled += Math.abs(y1 - y0);
      if (explain) draw('정답지용 신경망에 내 예측(' + q.toFixed(2) + ')을 복사했다. 정답지가 ' + y0.toFixed(2) + '에서 ' + y1.toFixed(2) + '까지 한 번에 옮겨졌고, 이제 새 정답지를 쫓는다.');
    }
    function auto() {
      for (let k = 0; k < 20; k++) { fix(false); if (frozen && k % 5 === 4) copy(false); }
      const far = Math.abs(10 - q);
      let msg = frozen ? '다섯 번 고칠 때마다 정답지를 새로 만들며 20번 고쳤다. 구간마다 정답지가 움직이지 않으므로 각 구간은 고정된 목표를 맞히는 문제였다. 다만 이 단순한 예에서는 같은 20번으로 비교하면 얼린 쪽이 참값에 더 느리게 다가간다. 정답지를 새로 만드는 횟수가 적기 때문이다. 얼리기의 이득은 쫓는 과정 자체가 불안정해지는 경우(큰 스텝 크기, 넓은 일반화)에 나타나며, 아래 사슬 실험이 그런 경우다.' : '정답지를 얼리지 않고 20번 고쳤다. 매번 다가간 거리의 90%만큼 정답지가 도망갔다. 이 예에서는 그래도 참값 쪽으로 꾸준히 다가가지만, 정답지가 내 수정에 이렇게 끌려다닌다는 점이 신경망에서는 불안정의 씨앗이 된다.';
      if (link > 1) msg = '다음 장면 값이 1.2배로 묶여 있으면 정답지를 얼려도 소용이 없다. 정답지를 새로 만들 때마다 1.08배씩 멀어지고, 예측은 끝없이 커진다. 얼리기는 쫓는 과정을 안정시킬 뿐, 정답지를 만드는 규칙 자체가 값을 부풀리면 막지 못한다(09장의 w → 2w).';
      else msg += ' 지금 참값 10까지의 거리는 ' + far.toFixed(2) + '이다.';
      draw(msg);
    }
    function draw(msg) {
      const y = target();
      const lo = 0, hi = link > 1 ? Math.max(14, q * 1.2, y * 1.2) : 12;
      const X = (v) => 4 + (92 * (Math.min(hi, Math.max(lo, v)) - lo)) / (hi - lo);
      lineEl.innerHTML = '<div style="position:relative;height:56px;margin:6px 0 2px;border-bottom:2px solid var(--line)">' +
        '<div style="position:absolute;left:' + X(10) + '%;top:4px;bottom:0;border-left:2px dashed var(--good)"></div>' +
        '<div style="position:absolute;left:' + X(10) + '%;top:-2px;transform:translateX(4px);font-size:var(--fs-xs);color:var(--good)">참값 10</div>' +
        '<div style="position:absolute;left:' + X(y) + '%;top:14px;transform:translateX(-50%);font-size:var(--fs-xs);color:var(--signal);font-weight:600;white-space:nowrap">▼ 정답지 ' + y.toFixed(2) + '</div>' +
        '<div style="position:absolute;left:' + X(q) + '%;bottom:-8px;transform:translateX(-50%);width:14px;height:14px;border-radius:50%;background:var(--c1);border:2px solid var(--surface)"></div>' +
        '<div style="position:absolute;left:' + X(q) + '%;bottom:-28px;transform:translateX(-50%);font-size:var(--fs-xs);color:var(--c1);white-space:nowrap">내 예측 ' + q.toFixed(2) + '</div>' +
        '</div><div style="height:24px"></div>';
      st.set('n', n);
      st.set('gap', Math.abs(y - q).toFixed(2));
      st.set('true', link > 1 ? '참값 없음 (발산)' : Math.abs(10 - q).toFixed(2));
      st.set('eff', moved > 0 ? Math.round((100 * fled) / moved) + '%' : '–');
      chart.update({ series: [
        { name: '내 예측', color: 'c1', data: hist.map((h) => [h[0], h[1]]) },
        { name: '정답지', color: 'signal', data: hist.map((h) => [h[0], h[2]]), dash: '5 4' },
      ], hlines: link > 1 ? [] : [{ y: 10, label: '참값 10', color: 'good' }], x: { label: '고친 횟수', min: 0, max: Math.max(10, n) } });
      say.innerHTML = msg;
    }
    reset();
    draw('내 예측은 0이고, 정답지는 1 + 0.9 × 0 = 1이다. "정답지 쪽으로 고치기"를 누르면 시작된다.');
  }

  /* ---------- 사슬 실험 ---------- */
  function mountChain(el) {
    const p = ui.panel(el, { kind: 'SIM', title: '1차원 사슬에서의 선형 Q-learning: 온라인 vs 재생 vs 재생 + 타깃 고정', caption: '"학습 실행"을 누르면, 기본 설정(γ = 0.99, α = 1.0)에서 주황 선(온라인)은 위로 치솟고 파란 선(재생 + 타깃 고정)은 아래로 내려간다. 각 설정을 시드 4개로 4000 스텝씩 실제로 학습시킨다. 설정은 $\\epsilon=0.5$, 미니배치 16, 버퍼 4000이다. 곡선은 시드 중앙값의 $\\log_{10}$ 평균 $|\\hat Q - Q^*|$이고, 3(=1000) 이상은 발산으로 보고 잘라서 그린다.' });
    const ctr = ui.row(p.body);
    const gS = ui.slider(ctr, { label: '할인율 $\\gamma$', min: 0.8, max: 0.99, step: 0.01, value: 0.99, format: ui.fmt.f(2) });
    const aS = ui.slider(ctr, { label: '스텝 크기 $\\alpha$', min: 0.1, max: 3, step: 0.1, value: 1.0, format: ui.fmt.f(1) });
    const cS = ui.slider(ctr, { label: '타깃 고정 주기 $C$', min: 10, max: 1000, step: 10, value: 200, format: ui.fmt.int });
    let showCfg = 2;
    ui.select(ctr, { label: '아래 곡선으로 볼 설정', value: showCfg, options: [{ value: 0, label: '온라인' }, { value: 1, label: '재생만' }, { value: 2, label: '재생 + 타깃' }], onChange: (v) => { showCfg = +v; drawQ(); } });
    const btns = ui.row(p.body, 'btns');
    const runB = ui.button(btns, '학습 실행', () => start(), { primary: true });
    const st = ui.stats(p.body, [
      { key: 'c0', label: '온라인: 최종 오차(중앙값) / 발산 시드' },
      { key: 'c1', label: '재생만', tone: 'signal' },
      { key: 'c2', label: '재생 + 타깃', tone: 'accent' },
      { key: 'prog', label: '진행' },
    ]);
    const split = document.createElement('div');
    split.className = 'w-split';
    const left = document.createElement('div');
    const right = document.createElement('div');
    split.append(left, right);
    p.body.appendChild(split);
    const eChart = plot.line(left, { height: 250, x: { label: '환경 스텝', min: 0, max: 4000 }, y: { label: 'log₁₀ 평균 |Q̂ − Q*|', min: -2.5, max: 3 }, series: [] });
    const qChart = plot.line(right, { height: 250, x: { label: '상태 x', min: 0, max: 1 }, y: { label: 'Q(x, a)' }, series: [] });

    const STEP = 0.05, RLEFT = 0.3, RRIGHT = 1.0, K = 12, STEPS = 4000, SEEDS = 4, BS = 16, CAP = 4000, EPS = 0.5;
    const cen = sim.range(K).map((k) => k / (K - 1)), wid = 1 / (K - 1);
    const phi = (x) => cen.map((c) => Math.exp(-((x - c) * (x - c)) / (2 * wid * wid)));
    const grid = sim.range(99).map((i) => (i + 1) / 100);
    const phiG = grid.map(phi);
    const q = (w, f, a) => { let s = 0; for (let k = 0; k < K; k++) s += w[a][k] * f[k]; return s; };
    let Qstar = null, results = null, lastW = null, token = 0;

    function exactQ(G) {
      const N = 101;
      let V = new Array(N).fill(0);
      const nxt = (i, a) => { const j = i + (a ? 5 : -5); if (j <= 0) return { r: RLEFT, done: true, j: 0 }; if (j >= 100) return { r: RRIGHT, done: true, j: 100 }; return { r: 0, done: false, j }; };
      for (let it = 0; it < 3000; it++) {
        const nv = V.slice();
        for (let i = 1; i < 100; i++) nv[i] = Math.max(...[0, 1].map((a) => { const o = nxt(i, a); return o.r + (o.done ? 0 : G * V[o.j]); }));
        V = nv;
      }
      return grid.map((_, gi) => [0, 1].map((a) => { const o = nxt(gi + 1, a); return o.r + (o.done ? 0 : G * V[o.j]); }));
    }
    function err(w) {
      let e = 0;
      for (let i = 0; i < grid.length; i++) e += Math.abs(q(w, phiG[i], 0) - Qstar[i][0]) + Math.abs(q(w, phiG[i], 1) - Qstar[i][1]);
      return e / (2 * grid.length);
    }
    function train(cfg, seed, G, alpha, C) {
      const r = sim.rng(seed * 7919 + 13);
      let w = [new Array(K).fill(0), new Array(K).fill(0)];
      let wt = w.map((x) => x.slice());
      const buf = [];
      let x = r();
      const curve = [[0, Math.log10(err(w))]];
      let diverged = false;
      for (let t = 1; t <= STEPS; t++) {
        const f = phi(x);
        const a = r() < EPS ? (r() < 0.5 ? 0 : 1) : (q(w, f, 1) > q(w, f, 0) ? 1 : 0);
        const x2 = x + (a ? STEP : -STEP);
        let rew = 0, done = false;
        if (x2 <= 0) { rew = RLEFT; done = true; } else if (x2 >= 1) { rew = RRIGHT; done = true; }
        buf.push([f, a, rew, done ? null : phi(x2)]);
        if (buf.length > CAP) buf.shift();
        if (!diverged) {
          const batch = cfg.replay ? sim.range(BS).map(() => buf[Math.floor(r() * buf.length)]) : [buf[buf.length - 1]];
          const tw = cfg.target ? wt : w;
          const upd = [new Array(K).fill(0), new Array(K).fill(0)];
          for (const [bf, ba, br, bf2] of batch) {
            const tgt = br + (bf2 ? G * Math.max(q(tw, bf2, 0), q(tw, bf2, 1)) : 0);
            const d = tgt - q(w, bf, ba);
            for (let k = 0; k < K; k++) upd[ba][k] += (d * bf[k]) / batch.length;
          }
          for (let b = 0; b < 2; b++) for (let k = 0; k < K; k++) w[b][k] += alpha * upd[b][k];
          if (cfg.target && t % C === 0) wt = w.map((z) => z.slice());
          if (t % 10 === 0) { for (let b = 0; b < 2; b++) for (let k = 0; k < K; k++) if (!(Math.abs(w[b][k]) < 1e6)) diverged = true; }
        }
        x = done ? r() : x2;
        if (t % 100 === 0) curve.push([t, diverged ? 3 : Math.min(3, Math.log10(err(w)))]);
      }
      return { curve, diverged, w, final: diverged ? Infinity : err(w) };
    }
    const cfgs = [{ name: '온라인 (재생 ×, 타깃 ×)', replay: false, target: false, color: 'c2' }, { name: '재생만', replay: true, target: false, color: 'c5' }, { name: '재생 + 타깃 고정', replay: true, target: true, color: 'c1' }];
    function median(a) { const b = a.slice().sort((x, y) => x - y); const m = b.length >> 1; return b.length % 2 ? b[m] : (b[m - 1] + b[m]) / 2; }
    function start() {
      const my = ++token;
      const G = gS.get(), alpha = aS.get(), C = cS.get();
      Qstar = exactQ(G);
      results = cfgs.map(() => []);
      lastW = cfgs.map(() => null);
      const jobs = [];
      cfgs.forEach((c, ci) => { for (let sd = 0; sd < SEEDS; sd++) jobs.push([ci, sd]); });
      let j = 0;
      runB.disabled = true;
      function chunk() {
        if (my !== token) return;
        const [ci, sd] = jobs[j++];
        const res = train(cfgs[ci], sd, G, alpha, C);
        results[ci].push(res);
        if (sd === 0) lastW[ci] = res;
        draw();
        st.set('prog', j + ' / ' + jobs.length);
        if (j < jobs.length) setTimeout(chunk, 0); else runB.disabled = false;
      }
      chunk();
    }
    function draw() {
      const series = [];
      cfgs.forEach((c, ci) => {
        const rs = results[ci];
        if (!rs.length) return;
        const curve = rs[0].curve.map((pt, i) => [pt[0], median(rs.map((r) => r.curve[i][1]))]);
        series.push({ name: c.name, color: c.color, data: curve });
        const fin = rs.map((r) => r.final);
        const ndiv = rs.filter((r) => r.diverged || r.final > 100).length;
        const med = median(fin);
        st.set('c' + ci, (med < 100 ? med.toFixed(3) : '발산') + ' / ' + ndiv + '개');
      });
      eChart.update({ series });
      drawQ();
    }
    function drawQ() {
      if (!Qstar) return;
      const series = [
        { name: 'Q*(x, ←)', color: 'c4', dash: '5 4', data: grid.map((x, i) => [x, Qstar[i][0]]), endDot: false },
        { name: 'Q*(x, →)', color: 'c6', dash: '5 4', data: grid.map((x, i) => [x, Qstar[i][1]]), endDot: false },
      ];
      const res = lastW && lastW[showCfg];
      if (res && res.final < 100) {
        series.push({ name: '학습된 Q(x, ←)', color: 'c4', data: grid.map((x, i) => [x, q(res.w, phiG[i], 0)]), endDot: false });
        series.push({ name: '학습된 Q(x, →)', color: 'c6', data: grid.map((x, i) => [x, q(res.w, phiG[i], 1)]), endDot: false });
      }
      qChart.update({ series, y: { label: res && !(res.final < 100) ? 'Q(x, a): 선택한 설정의 시드 1은 발산' : 'Q(x, a) (시드 1)', min: 0, max: 1.15 } });
    }
    start();
  }

  /* ---------- 과대추정 계산기 ---------- */
  function mountOverest(el) {
    const p = ui.panel(el, { kind: 'CALC', title: '단일 추정기 vs 이중 추정기의 편향', caption: '잡음 슬라이더를 올리면 주황 선(단일 추정기)이 행동 수가 많을수록 더 높이 뜨고, 파란 선(이중 추정기)은 0 근처에 머문다. 각 점은 2000번의 몬테카를로 시행 평균이다. 단일: $\\max_a \\hat Q_1(a)$. 이중: $\\hat Q_2(\\arg\\max_a \\hat Q_1(a))$ ($\\hat Q_1, \\hat Q_2$는 독립 잡음). 참값 $\\max_a Q(a) = 0$에 대한 편향을 그린다.' });
    const ctr = ui.row(p.body);
    let timer = 0;
    const later = () => { clearTimeout(timer); timer = setTimeout(draw, 80); };
    const sS = ui.slider(ctr, { label: '추정 잡음 $\\sigma$', min: 0.1, max: 2, step: 0.1, value: 1, format: ui.fmt.f(1), onInput: later });
    const dS = ui.slider(ctr, { label: '열등 행동의 가치 차 $\\Delta$', min: 0, max: 2, step: 0.1, value: 0, format: ui.fmt.f(1), onInput: later });
    const st = ui.stats(p.body, [
      { key: 's', label: '행동 64개: 단일 편향', tone: 'signal' },
      { key: 'd', label: '행동 64개: 이중 편향', tone: 'accent' },
      { key: 'b', label: '상한 $\\sigma\\sqrt{2\\ln 64}$' },
    ]);
    const chartEl = document.createElement('div');
    p.body.appendChild(chartEl);
    const chart = plot.line(chartEl, { height: 250, x: { label: '행동 수 |A| (로그)', min: 1, max: 64, log: true }, y: { label: '편향 E[추정] − max Q' }, series: [] });
    const NS = [1, 2, 4, 8, 16, 32, 64];
    function draw() {
      const sg = sS.get(), D = dS.get();
      const r = sim.rng(2024);
      const single = [], dbl = [];
      NS.forEach((n) => {
        let a1 = 0, a2 = 0;
        const T = 2000;
        for (let t = 0; t < T; t++) {
          let best = -Infinity, bi = 0;
          for (let a = 0; a < n; a++) { const v = (a === 0 ? 0 : -D) + sg * r.normal(); if (v > best) { best = v; bi = a; } }
          a1 += best;
          a2 += (bi === 0 ? 0 : -D) + sg * r.normal();
        }
        single.push([n, a1 / T]);
        dbl.push([n, a2 / T]);
      });
      chart.update({ series: [
        { name: '단일 추정기 (Q-learning / DQN)', color: 'c2', data: single, markers: true },
        { name: '이중 추정기 (Double Q / Double DQN)', color: 'c1', data: dbl, markers: true },
        { name: 'σ√(2 ln n) (Δ=0일 때 상한)', color: 'c5', dash: '4 4', data: sim.range(64).map((i) => [i + 1, sg * Math.sqrt(2 * Math.log(i + 1))]), endDot: false },
      ], hlines: [{ y: 0, label: '편향 0' }] });
      st.set('s', single[single.length - 1][1].toFixed(3));
      st.set('d', dbl[dbl.length - 1][1].toFixed(3));
      st.set('b', (sg * Math.sqrt(2 * Math.log(64))).toFixed(3));
    }
    draw();
  }

  /* ---------- PER 계산기 ---------- */
  function mountPER(el) {
    const p = ui.panel(el, { kind: 'CALC', title: '우선순위 샘플링 확률과 중요도 가중치', caption: '우선순위 지수 α를 0에서 1로 올리면 파란 막대가 TD 오차가 큰 오른쪽으로 쏠리고, 보정 가중치는 그만큼 작아진다. 버퍼에 TD 오차가 서로 다른 전이 8개가 있다. $\\alpha=0$이면 균등 샘플링이고, $\\alpha=1$이면 $|\\delta|$에 비례한다. 중요도 가중치는 최댓값으로 나눠 1 이하로 정규화한다.' });
    const ctr = ui.row(p.body);
    const aS = ui.slider(ctr, { label: '우선순위 지수 $\\alpha$', min: 0, max: 1, step: 0.05, value: 0.6, format: ui.fmt.f(2), onInput: draw });
    const bS = ui.slider(ctr, { label: '보정 지수 $\\beta$', min: 0, max: 1, step: 0.05, value: 0.4, format: ui.fmt.f(2), onInput: draw });
    const st = ui.stats(p.body, [
      { key: 'ratio', label: '최대/최소 샘플 확률 비', tone: 'signal' },
      { key: 'ess', label: '유효 샘플 비율 $(\\sum P)^2 / (N\\sum P^2)$' },
      { key: 'bias', label: '보정 후 가중 평균 |δ| (참값 대비)', tone: 'accent' },
    ]);
    const split = document.createElement('div');
    split.className = 'w-split';
    const left = document.createElement('div');
    const right = document.createElement('div');
    split.append(left, right);
    p.body.appendChild(split);
    const deltas = [0.05, 0.1, 0.2, 0.3, 0.5, 0.8, 1.5, 3.0];
    const cats = deltas.map((d) => String(d));
    const pc = plot.bars(left, { categories: cats, series: [], height: 230, y: { min: 0, label: '샘플 확률' }, labels: false, xLabel: '전이의 |δ|' });
    const wc = plot.bars(right, { categories: cats, series: [], height: 230, y: { min: 0, max: 1, label: '정규화 IS 가중치' }, labels: false, legend: false, xLabel: '전이의 |δ|' });
    function draw() {
      const a = aS.get(), b = bS.get(), N = deltas.length;
      const pr = deltas.map((d) => Math.pow(d + 0.01, a));
      const z = sim.sum(pr);
      const P = pr.map((x) => x / z);
      const w = P.map((x) => Math.pow(1 / (N * x), b));
      const wm = Math.max(...w);
      const wn = w.map((x) => x / wm);
      pc.update({ series: [{ name: '균등', color: 'c5', values: deltas.map(() => 1 / N), opacity: 0.5 }, { name: 'PER $P(i)$', color: 'c1', values: P }] });
      wc.update({ series: [{ name: '$w_i$', color: 'c2', values: wn }] });
      st.set('ratio', (Math.max(...P) / Math.min(...P)).toFixed(1) + '×');
      st.set('ess', (1 / (N * sim.sum(P.map((x) => x * x)))).toFixed(3));
      // 균등 분포 기준 E[|δ|]를 PER 샘플 + IS 가중치(정규화 전)로 추정하면 β=1에서 정확히 일치
      const trueMean = sim.mean(deltas);
      const est = sim.sum(P.map((x, i) => x * w[i] * deltas[i])) / sim.sum(P.map((x, i) => x * w[i]));
      st.set('bias', est.toFixed(3) + ' / ' + trueMean.toFixed(3));
    }
    draw();
  }
})();
