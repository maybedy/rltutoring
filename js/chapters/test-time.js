/* 22 추론 시점 탐색과 Test-time Compute */
(function () {
  const { ui, sim, plot } = RL;
  const R = String.raw;

  RL.chapter({
    id: 'test-time',
    title: '추론 시점 탐색과 Test-time Compute',
    subtitle: '가중치를 바꾸지 않고 추론 시점에 계산을 더 써서 정책을 개선한다. Best-of-N, 다수결, 가치 유도 디코딩, 단계 탐색이 모두 "기준 정책을 보상 쪽으로 재가중하는 연산자"라는 하나의 그림으로 정리된다.',
    time: 45,
    level: '심화 · LLM',
    prereq: ['llm-mdp', 'modelbased'],
    theses: ['T5', 'T9', 'T7'],
    easy: {
      hook: '답을 여러 번 뽑아 보고 가장 좋아 보이는 것을 고르면, 모델을 다시 학습시키지 않아도 더 좋은 답이 나온다. 다만 "좋아 보이는 것"과 "실제로 좋은 것"은 다르다.',
      intro: '<p>시험 문제를 한 번만 풀지 않고 다섯 번 풀어 본 뒤 가장 자신 있는 풀이를 낸다고 해 보자. 실력은 그대로인데 점수가 오른다. "추론 시점에 계산을 더 쓴다"는 말이 바로 이것이다.</p><p>방법은 네 가지다. 여러 개 뽑아 고르기, 여러 개 뽑아 다수결, 한 단계씩 채점하며 가지치기, 쓴 답을 고쳐 쓰기. 어느 방법이든 효과는 <strong>채점하는 쪽이 얼마나 믿을 만한가</strong>에 달려 있다.</p>',
      analogy: '내비게이션을 떠올리면 된다. 갈림길마다 "이 길로 가면 도착까지 몇 분"이라는 예상 시간(가치)을 보고, 평소 다니던 길(원래 모델)에서 크게 벗어나지 않는 선에서 빠른 쪽으로 조금 더 기운다. 예상 시간이 정확할수록 더 과감하게 따라가도 되고, 예상이 엉터리면 평소 길에 붙어 있는 편이 안전하다. 이것이 가치 유도 디코딩이다.',
      path: ['카드를 한 장씩 뽑아 가장 좋아 보이는 답을 내는 게임을 직접 해 본다', '"하나라도 맞을 확률"과 "다수결이 맞을 확률"을 손으로 계산한다', '답을 쓰는 도중에 예상 점수로 방향을 트는 법(가치 유도)을 본다', '문제 난이도에 따라 계산을 어디에 쓸지 정한다'],
      recap: [
        '많이 뽑아 고르면 대체로 좋아지지만, 채점기가 일관되게 틀리는 방향이 있으면 너무 많이 뽑을수록 오히려 나빠진다.',
        '다수결은 모델이 가장 자주 내는 답을 확정할 뿐이라, 모델이 자주 틀리는 문제는 고치지 못한다.',
        '계산은 너무 쉽지도 너무 어렵지도 않은 문제에 쓸 때 효과가 가장 크다.',
      ],
    },
    goals: [
      'Best-of-N의 출력 분포와 KL 상한 $\\log N - (N-1)/N$을 유도하고, 보상모델 과최적화가 생기는 조건을 시뮬레이션으로 확인한다.',
      '다수결(self-consistency)과 pass@k의 차이, 그리고 검증기가 test-time scaling의 병목인 이유를 설명할 수 있다.',
      '가치 유도 디코딩 $\\pi(a|s)\\propto\\pi_{\\text{ref}}(a|s)\\,e^{Q(s,a)/\\beta}$가 KL-정규화 최적해(T5)의 토큰 단위 분해임을 유도할 수 있다.',
      '문제 난이도에 따라 병렬 샘플링과 순차 수정, 예산 배분이 달라지는 이유(compute-optimal scaling)를 설명할 수 있다.',
    ],
    html: R`
<p>학습이 끝난 LLM $\pi_{\text{ref}}$가 있고, 응답을 채점하는 무언가(보상모델, 검증기, 가치 함수)가 있다고 하자. 가중치를 건드리지 않아도 <strong>추론 시점에 계산을 더 쓰면</strong> 더 좋은 응답을 낼 수 있다. 여러 개 뽑아 고르기(병렬), 고쳐 쓰기(순차), 단계마다 가지치기(탐색), 토큰마다 가치로 기울이기(유도). 이 장은 이것들을 하나의 수학적 틀로 묶는다.</p>
<div class="key"><span class="label">이 장의 한 문장</span>추론 시점 기법은 전부 기준 정책 $\pi_{\text{ref}}$를 보상 방향으로 재가중한 새 정책을 <em>샘플링으로 근사</em>하는 방법이다. 이상적인 재가중은 T5의 해 $\pi^*\propto\pi_{\text{ref}}\,e^{r/\beta}$이고, 각 기법은 이 분포에 얼마나 싸고 정확하게 다가가는지로 비교된다. 그렇게 찾은 좋은 응답을 다시 학습에 넣으면 T9(탐색의 상각)가 된다.</div>

<div class="table-wrap"><table class="t">
<thead><tr><th>계산을 쓰는 축</th><th>대표 기법</th><th>필요한 것</th><th>이 장의 절</th></tr></thead>
<tbody>
<tr><td>병렬 (폭)</td><td>Best-of-N, 다수결(self-consistency)</td><td>보상모델 또는 답 비교만</td><td>2, 3</td></tr>
<tr><td>토큰 유도</td><td>Controlled decoding, 가치 유도 MCTS</td><td>접두사 가치 $Q(s,a)$</td><td>4</td></tr>
<tr><td>단계 탐색 (트리)</td><td>PRM beam search, Tree of Thoughts, RAP, A* 계열</td><td>단계별 검증기(PRM)</td><td>5</td></tr>
<tr><td>순차 (깊이)</td><td>자기 수정, 긴 사고 사슬(long CoT)</td><td>수정 능력, 피드백</td><td>6, 7</td></tr>
</tbody></table></div>

<h2>Best-of-N: 가장 단순한 정책 개선 연산자</h2>
<p>$\pi_{\text{ref}}$에서 $N$개를 독립으로 뽑고 보상모델 점수 $\hat r$이 가장 높은 것을 내놓는다. 이 절차가 만드는 출력 분포는 닫힌 형태로 쓸 수 있다.</p>
<div data-w="fx-bon"></div>
<p>보상이 연속이라 동점이 없다고 가정하면 이 분포와 $\pi_{\text{ref}}$ 사이의 KL이 $N$만으로 결정된다.</p>
<div data-w="dv-bonkl"></div>
<p>$N=1000$이어도 KL은 약 5.9 nats에 불과하다. Best-of-N은 기준 분포의 지지집합 밖으로 나가지 못하고(응답은 언제나 $\pi_{\text{ref}}$의 샘플), 이탈 정도가 로그로만 자라는 <strong>보수적인 개선</strong>이다. 동시에 Best-of-N은 KL-정규화 목표의 최적해에 매우 가깝다는 분석이 있다(Yang et al. 2024의 점근 분석, Gui et al. 2024의 BoNBoN). 그래서 RLHF 연구에서 Best-of-N은 "같은 KL을 쓰면 RL이 얼마나 더 잘하나"를 재는 기준선으로 쓰인다(<a href="#rlhf">19장</a>).</p>

<h3>보상모델은 프록시다: 과최적화</h3>
<p>Best-of-N이 고르는 것은 <em>보상모델이 높게 본</em> 응답이지 실제로 좋은 응답이 아니다. 보상모델이 실제 선호와 어긋나는 방향(예: 길이)이 있으면, $N$을 키울수록 그 방향의 극단값이 뽑힌다. Gao et al.(2022)은 실제 보상모델 실험에서 프록시 점수는 계속 오르지만 "정답" 보상은 어느 KL에서 꺾여 내려가는 현상을 보고했다. 아래 예시 모형에서 그 메커니즘을 직접 만들어 본다. 먼저 카드 게임으로 손에 익힌 뒤 시뮬레이터로 평균을 본다.</p>
<div data-w="try-cards"></div>
<div data-w="bon-sim"></div>
<ul>
  <li>$\kappa=0$(편향 없음)이면 $\sigma$가 커도 실제 품질은 단조 증가한다. 잡음은 이득을 줄일 뿐 뒤집지 않는다.</li>
  <li>$\kappa$를 키우면 최적 $N$이 작아진다. 프록시가 실제와 <strong>체계적으로</strong> 어긋날 때 과최적화가 생긴다. 이것이 Goodhart 법칙의 수학적 형태다.</li>
  <li>초록 점선(실제 품질로 골랐을 때)과 파란 선의 간격이 "검증기 품질이 만드는 손실"이다.</li>
</ul>

<h2>다수결(self-consistency)과 pass@k</h2>
<p>보상모델이 없어도 쓸 수 있는 방법이 있다. 정답이 짧은 값(숫자, 선택지)이면 여러 추론 경로를 샘플링하고 <strong>가장 많이 나온 답</strong>을 고른다(Wang et al. 2022). 반면 pass@k는 "$k$개 중 하나라도 맞으면 성공"이다. 이것은 완벽한 검증기가 있을 때의 상한이다.</p>
$$\text{pass@}k = 1-(1-p)^k, \qquad \text{maj@}k = \Pr\big[\text{정답이 } k\text{개 표본의 최빈값}\big]$$
<div data-w="step-pass"></div>
<div data-w="vote-calc"></div>
<div class="warn"><span class="label">핵심 관찰</span>다수결은 <strong>최빈값 추정기</strong>다. 정답 확률 $p$가 가장 흔한 오답 확률 $q$보다 크면 $k\to\infty$에서 정확도가 1로 가고, 작으면 0으로 간다. 표본을 늘리는 것은 모델의 "가장 그럴듯한 답"을 확정할 뿐, 모델이 자신 있게 틀린 문제를 고치지 못한다. pass@k와 maj@k의 간격은 검증기가 있어야만 회수할 수 있다.</div>

<h2>가치 유도 디코딩: 추론 시점의 Q-함수</h2>
<p>Best-of-N은 응답이 끝난 뒤에만 평가한다. 생성 도중에 "이 접두사에서 이 토큰을 고르면 최종 보상이 얼마일까"를 알면 매 토큰을 그 방향으로 기울일 수 있다. 이것이 DQN이 $\arg\max_a Q(s,a)$로 행동을 고르는 것과 같은 구조의 <strong>추론 시점 가치 활용</strong>이다. 다만 LLM에서는 $\arg\max$ 대신 기준 정책을 지수 가중하는 형태가 정답이다. 이유는 유도에서 나온다.</p>
<div data-w="dv-guided"></div>
<div data-w="fx-guided"></div>
<div class="thesis-box"><span class="label">대전제 T5 · KL-정규화 해의 토큰 분해</span>
<p>시퀀스 수준의 최적해 $\pi^*(y|x)\propto\pi_{\text{ref}}(y|x)e^{r(x,y)/\beta}$는 토큰 수준에서 정확히 $\pi^*(a|s)=\pi_{\text{ref}}(a|s)\,e^{(Q(s,a)-V(s))/\beta}$로 분해된다. 여기서 $Q, V$는 $\gamma=1$, 결정적 전이의 <strong>soft 벨만 방정식</strong>의 해다. 즉 "보상모델로 RL을 한 결과"와 "soft Q-함수로 디코딩한 결과"는 같은 분포다. RL은 이 계산을 가중치에 상각(T9)하고, 가치 유도 디코딩은 매번 추론 시점에 계산한다(<a href="#qviews">08장</a>의 "LM은 Q-함수" 관점, <a href="#dpo">20장</a>).</p>
</div>
<p>실제 방법들은 이 이상을 근사하는 방식에서 갈린다.</p>
<ul>
  <li><strong>Controlled decoding</strong>(Mudgal et al. 2023): 접두사 점수기(prefix scorer)를 학습해 $\pi_{\text{ref}}$ 아래 기대 보상을 예측하고, 그 값으로 토큰 또는 블록 단위로 재가중·선택한다.</li>
  <li><strong>가치 유도 MCTS</strong>(Liu et al. 2023, PPO-MCTS): PPO 학습 때 쓴 가치망을 버리지 않고 디코딩 시 MCTS의 평가 함수로 재사용한다.</li>
  <li><strong>Q* 계열</strong>(Wang et al. 2024): 추론을 단계 단위 MDP로 보고, 학습한 Q-값을 휴리스틱으로 쓰는 A* 탐색으로 다음 단계를 고른다.</li>
</ul>
<p>아래 시뮬레이터는 깊이 3, 분기 3의 작은 "토큰 트리"에서 세 연산자를 정확히 계산해 보상-KL 평면에 놓는다. Soft 최적 곡선은 정의상 같은 KL에서 가능한 최대 보상(효율 경계)이다.</p>
<div data-w="guided-sim"></div>

<h2>단계 탐색: PRM, beam search, 트리 탐색</h2>
<p>수학 풀이처럼 단계가 분명한 생성에서는 단계마다 "여기까지 맞는가"를 채점하는 <strong>과정 보상 모델(PRM)</strong>을 쓸 수 있다(Lightman et al. 2023, Let's Verify Step by Step; 사람 라벨 없이 몬테카를로 롤아웃으로 단계 라벨을 만드는 Math-Shepherd, Wang et al. 2023). PRM이 있으면 생성은 트리 탐색이 된다.</p>
<div class="grid2">
  <div class="card"><h4>Beam search + PRM</h4><p>폭 $w$개의 부분 풀이를 유지하고, 각자 $k$개의 다음 단계를 제안한 뒤 PRM 점수 상위 $w$개만 남긴다. 틀린 접두사를 일찍 잘라 예산을 아낀다.</p></div>
  <div class="card"><h4>Tree of Thoughts · RAP · MCTS</h4><p>ToT(Yao et al. 2023)는 생각 단위를 노드로 BFS/DFS 탐색, RAP(Hao et al. 2023)는 LLM을 세계 모델 겸 정책으로 쓰는 MCTS, TS-LLM(Feng et al. 2023)은 AlphaZero식 학습된 가치로 트리를 안내한다(<a href="#modelbased">16장</a>).</p></div>
</div>
<p>아래는 단계 수 $D$의 풀이에서 각 단계가 확률 $p$로 맞고, 한 번 틀리면 그 풀이는 끝까지 틀리는 단순 모형이다. 같은 단계 생성 예산으로 (1) $N=B/D$개 완성 풀이를 결과 보상 모델(ORM)로 고르는 Best-of-N과 (2) PRM beam search를 실제로 실행해 비교한다.</p>
<div data-w="search-sim"></div>
<ul>
  <li>풀이가 길수록($D$ 증가) 완성 풀이가 맞을 확률 $p^D$가 급감해 Best-of-N의 효율이 떨어지고, 단계 가지치기의 이점이 커진다.</li>
  <li>PRM 잡음을 키우면 beam search가 맞는 접두사를 일찍 잘라 버려 오히려 손해를 본다. 탐색이 강할수록 검증기의 오류를 더 강하게 착취한다(T8의 max 편향과 같은 구조).</li>
</ul>

<h2>Test-time compute의 최적 배분</h2>
<p>Snell et al.(2024)은 추론 계산을 어떻게 쓰는 것이 최선인지가 <strong>문제 난이도에 따라 다르다</strong>는 것을 보였다. 쉬운 문제는 순차 수정(한 답을 고쳐 나가기)이 효율적이고, 어려운 문제는 병렬 탐색과 섞어야 하며, 난이도를 추정해 전략을 고르는 compute-optimal 방식이 Best-of-N 대비 4배 이상 계산 효율을 높일 수 있다고 보고했다. 또 FLOPs를 맞춘 비교에서, 작은 모델이 어느 정도 풀 수 있는 문제에 한해서는 추론 계산을 더 쓰는 것이 훨씬 큰 모델을 쓰는 것보다 나을 수 있다고 했다.</p>
<p>아래는 그 직관을 설명하는 <strong>예시 모형</strong>이다. 난이도별 1회 성공률 $p$와 "막힘 확률" $m$(수정해도 같은 오답 모드에서 못 빠져나올 확률)을 두고, 병렬 체인 $n$개 × 체인당 수정 $t$회($nt=$예산)의 성공률을 계산한다.</p>
$$s_{\text{seq}}(t) = (1-m)\Big[1-(1-p)\big(1-\min(1,gp)\big)^{t-1}\Big] + m\,p, \qquad S(n,t) = 1-\big(1-s_{\text{seq}}(t)\big)^n$$
<div data-w="alloc-calc"></div>
<p>모형의 숫자는 가정이지만 두 가지 결론은 구조에서 나온다. (1) 순차 수정은 국소 개선이라 "막힌" 문제에서는 병렬 다양성이 필요하다. (2) 성공 확률이 0에 가깝거나 1에 가까운 문제에 계산을 쓰는 것은 낭비이고, 한계 이득 $\partial S/\partial n$이 큰 중간 난이도에 예산을 몰아야 한다.</p>

<h2>긴 사고 사슬: 탐색을 정책 안으로</h2>
<p>OpenAI는 o1을 "답하기 전에 길게 생각하도록 RL로 학습한 모델"로 소개하며, 학습 계산과 추론 시점 생각 계산을 늘릴수록 성능이 꾸준히 오른다고 공개했다. DeepSeek-R1(2025)은 규칙 기반 정답 보상만으로 RL을 했을 때 응답 길이가 늘고 스스로 검산하고 되돌아가는 행동이 나타났다고 보고했다(<a href="#reasoning">21장</a>).</p>
<p>이 장의 언어로 보면, 바깥에서 하던 탐색(여러 개 뽑기, 고치기, 되돌아가기)을 <strong>하나의 샘플 안에서 하도록 학습</strong>한 것이다. 외부 탐색이 비싼 개선 연산자라면, 긴 CoT 모델은 그 연산자를 정책에 상각한 결과다(T9, <a href="#memory">23장</a>). 그리고 그 위에 다시 Best-of-N이나 다수결을 얹을 수 있다. 상각된 탐색과 명시적 탐색은 경쟁 관계가 아니라 층을 이룬다.</p>

<h2>무엇이 바뀌었나</h2>
<div class="table-wrap"><table class="t">
<thead><tr><th>기법</th><th>이상적 목표와의 관계</th><th>평가 시점</th><th>주된 실패 모드</th></tr></thead>
<tbody>
<tr><td>Best-of-N</td><td>$\pi^*\propto\pi_{\text{ref}}e^{r/\beta}$의 샘플 근사, KL $\le\log N-\frac{N-1}{N}$</td><td>응답 끝</td><td>보상모델 과최적화, 비용 $\propto N$</td></tr>
<tr><td>다수결</td><td>답의 최빈값 추정 (보상 없음)</td><td>응답 끝 (답만 비교)</td><td>자신 있는 오답을 확정</td></tr>
<tr><td>Controlled decoding</td><td>$V$를 $\pi_{\text{ref}}$ 아래 기대 보상으로 근사한 토큰/블록 유도</td><td>매 토큰·블록</td><td>접두사 가치 추정 오차</td></tr>
<tr><td>Soft-Q 유도 (이상)</td><td>T5 최적해의 정확한 토큰 분해</td><td>매 토큰</td><td>soft 가치 학습이 어려움</td></tr>
<tr><td>PRM beam / MCTS</td><td>단계 가치로 가지치기한 탐색</td><td>매 단계</td><td>PRM 오류 착취, 다양성 붕괴</td></tr>
<tr><td>순차 수정</td><td>국소 개선 반복</td><td>매 시도</td><td>같은 오답 모드에 갇힘</td></tr>
<tr><td>Long CoT (o1, R1)</td><td>탐색을 정책에 상각 (T9)</td><td>모델 내부</td><td>과도한 생각(비용), 검증 실패</td></tr>
</tbody></table></div>
`,
    mount: {
      'fx-bon': (el) => ui.formula(el, {
        title: 'Best-of-N의 출력 분포',
        say: '어떤 답이 {bon|N개 중 최고점으로 뽑힐 확률}은, {ref|원래 모델이 그 답을 낼 확률}에 {F|나머지 N−1개가 모두 그 답보다 점수가 낮을 확률}을 곱하고, 그 답이 {N|N개 중 어느 순서로든 나올 수 있으니 N}을 곱한 것이다. 여기서 {cdf|"점수가 이 값 이하일 확률"}은 원래 모델의 답들로 잰다.',
        tex: R`\tm{bon}{\pi_{\text{BoN}}(y)} = \tm{N}{N}\;\cdot\;\tm{F}{F\big(\hat r(y)\big)^{N-1}}\;\cdot\;\tm{ref}{\pi_{\text{ref}}(y)}, \qquad \tm{cdf}{F(t) = \Pr_{y'\sim\pi_{\text{ref}}}\big[\hat r(y')\le t\big]}`,
        terms: [
          { id: 'bon', sym: R`\pi_{\text{BoN}}(y)`, label: 'BoN 정책', desc: 'N개 중 최고점 응답이 y일 확률.', long: R`가중치는 그대로인데 출력 분포가 바뀐다. 즉 Best-of-N은 "학습 없이 정의되는 새 정책"이고, 그래서 KL과 기대 보상으로 RL 정책과 직접 비교할 수 있다.` },
          { id: 'N', sym: 'N', label: '어느 자리든 y가 될 수 있음', desc: 'N개 표본 중 y가 뽑힌 위치의 경우의 수.' },
          { id: 'F', sym: R`F^{N-1}`, label: '나머지가 모두 더 낮을 확률', desc: '다른 N−1개가 y보다 점수가 낮아야 y가 선택된다.', easy: '상위 10% 점수인 답이라면, 다른 답 하나가 그보다 낮을 확률은 0.9다. 나머지 N−1개가 모두 낮아야 하니 0.9를 N−1번 곱한다.', long: R`이 항이 재가중이다. 점수 분위 $u=F(\hat r(y))$가 높을수록 $u^{N-1}$로 가중된다. $N$이 커지면 분위 1 근처로 질량이 몰린다. 원래 보상값 자체가 아니라 <strong>순위(분위)</strong>만 쓰인다는 점에 주목: 보상모델의 단조 변환에 불변이다.` },
          { id: 'ref', sym: R`\pi_{\text{ref}}(y)`, label: '기준 정책', desc: '지지집합을 결정한다. 기준 정책이 못 내는 응답은 영원히 못 낸다.' },
          { id: 'cdf', sym: 'F(t)', label: '점수의 누적분포', desc: '기준 정책 아래 보상모델 점수의 CDF.' },
        ],
      }),
      'dv-bonkl': (el) => ui.derivation(el, {
        title: R`$\mathrm{KL}(\pi_{\text{BoN}}\|\pi_{\text{ref}}) = \log N - \frac{N-1}{N}$`,
        easy: 'N개 중 최고를 고르는 것은 원래 모델의 답 중 상위권에 가중치를 더 주는 것과 같다. 원래 모델에서 얼마나 멀어졌는지(KL)는 N만으로 정해지고 아주 천천히 커진다. N이 16이면 약 1.8, 1000이어도 약 5.9다.',
        steps: [
          { tex: R`\frac{\pi_{\text{BoN}}(y)}{\pi_{\text{ref}}(y)} = N\,F\big(\hat r(y)\big)^{N-1}`, why: R`위 분포식에서 바로 나온다. KL은 이 비율의 로그를 $\pi_{\text{BoN}}$ 아래에서 평균낸 값이다.` },
          { tex: R`u := F\big(\hat r(y)\big),\quad y\sim\pi_{\text{ref}} \;\Rightarrow\; \hl{u\sim\mathrm{Uniform}(0,1)}`, why: R`확률 적분 변환: 연속 확률변수를 자기 CDF에 넣으면 균등분포가 된다. 동점이 없다는 가정이 여기서 쓰인다.` },
          { tex: R`y\sim\pi_{\text{BoN}} \;\Rightarrow\; u \text{ 의 밀도} = N u^{N-1}\quad(\hl{\mathrm{Beta}(N,1)})`, why: R`$N$개 균등 표본의 최댓값의 분포와 같다.` },
          { tex: R`\mathrm{KL} = \mathbb{E}_{u\sim\mathrm{Beta}(N,1)}\big[\log N + (N-1)\log u\big]`, why: R`비율의 로그를 $u$로 다시 쓴다.` },
          { tex: R`\mathbb{E}[\log u] = \int_0^1 N u^{N-1}\log u\,du = \hl{-\tfrac{1}{N}}`, why: R`부분적분 또는 $\int_0^1 u^{a}\log u\,du = -1/(a+1)^2$ 공식에 $a=N-1$을 넣고 $N$을 곱한다.` },
          { tex: R`\boxed{\;\mathrm{KL}(\pi_{\text{BoN}}\|\pi_{\text{ref}}) = \log N - \frac{N-1}{N}\;}`, why: R`보상모델과 기준 정책이 무엇이든 $N$만의 함수다. 응답 공간이 이산이고 점수에 동점이 많으면 실제 KL은 이보다 작을 수 있으며, Beirami et al.(2024)은 이 식이 일반적으로는 <strong>상한</strong>임을 보이고 더 정확한 추정량을 제안했다.` },
        ],
      }),
      'dv-guided': (el) => ui.derivation(el, {
        title: '시퀀스 최적해에서 토큰 단위 가치 유도로',
        easy: '"점수는 높이되 원래 모델에서 너무 멀어지지 마라"의 정답 분포를 한 단어씩 나눠 쓰면, 매 단어마다 "원래 확률 × exp(그 단어로 갔을 때의 예상 점수 / 온도)"가 된다. 그래서 예상 점수를 알려 주는 가치 함수만 있으면, 다시 학습하지 않고 디코딩만으로 같은 효과를 낼 수 있다.',
        caption: R`상태 $s_t=(x,a_1,\dots,a_t)$, 행동은 다음 토큰, 전이는 이어 붙이기($s_{t+1}=s_t\oplus a$), 보상은 응답 끝에서 한 번, $\gamma=1$.`,
        steps: [
          { tex: R`\pi^*(y|x) = \frac{1}{Z(x)}\,\pi_{\text{ref}}(y|x)\,e^{r(x,y)/\beta}`, why: R`$\max_\pi \mathbb{E}_\pi[r]-\beta\,\mathrm{KL}(\pi\|\pi_{\text{ref}})$의 해(T5, <a href="#llm-mdp">18장</a>).` },
          { tex: R`V(s_t) := \beta\log\,\mathbb{E}_{y\sim\pi_{\text{ref}}(\cdot|s_t)}\big[e^{r(x,y)/\beta}\big],\qquad V(s_T)=r(x,y)`, why: R`접두사 $s_t$에서 기준 정책으로 끝까지 생성했을 때의 "soft 가치"를 정의한다.` },
          { tex: R`\pi^*(s_t) = \sum_{y \supseteq s_t}\pi^*(y|x) = \frac{\pi_{\text{ref}}(s_t)\,\hl{e^{V(s_t)/\beta}}}{Z(x)}`, why: R`접두사 $s_t$로 시작하는 모든 완성에 대해 합하면, 완성 부분의 합이 정확히 $e^{V(s_t)/\beta}$가 된다. 여기서 $\pi_{\text{ref}}(s_t)$는 접두사 확률.`, easy: '같은 앞부분으로 시작하는 모든 완성 답의 확률을 더하면, "앞부분이 나올 원래 확률"에 "그 앞부분에서 기대되는 점수"만큼의 가중치가 붙는다.' },
          { tex: R`\pi^*(a|s_t) = \frac{\pi^*(s_t\oplus a)}{\pi^*(s_t)} = \pi_{\text{ref}}(a|s_t)\,\exp\!\Big(\frac{\hl{V(s_t\oplus a) - V(s_t)}}{\beta}\Big)`, why: R`조건부 확률의 정의. $Z(x)$는 약분된다. 지수 안의 차이가 토큰 단위 advantage다.` },
          { tex: R`e^{V(s)/\beta} = \sum_a \pi_{\text{ref}}(a|s)\,e^{Q(s,a)/\beta},\qquad Q(s,a) := V(s\oplus a)`, why: R`정규화 조건이 곧 <strong>soft 벨만 방정식</strong>이다. $\max$ 대신 $\beta\log\sum\pi_{\text{ref}}e^{(\cdot)/\beta}$를 쓰는 벨만 백업이며 여전히 축약이다(T1, <a href="#maxent">14장</a>).` },
          { tex: R`\hat V(s) = \mathbb{E}_{\pi_{\text{ref}}}[r\mid s] \;\le\; V(s) \qquad(\text{젠슨 부등식, } \beta\to\infty \text{에서 등호})`, why: R`soft 가치는 학습이 어렵다. Controlled decoding류는 이를 기준 정책 아래 <em>평균 보상</em>으로 근사한다. KL이 작은(β가 큰) 영역에서는 정확하고, β가 작아질수록 최적에서 벗어난다. 아래 시뮬레이터의 주황 곡선이 이 차이다.` },
        ],
      }),
      'fx-guided': (el) => ui.formula(el, {
        title: '가치 유도 디코딩',
        say: '{pg|안내를 받은 다음 단어 확률}은, {ref|원래 모델의 다음 단어 확률}에 {Q|그 단어를 골랐을 때 예상되는 최종 점수}를 {b|온도}로 나눈 만큼 지수 가중치를 곱하고, 전체 합이 1이 되도록 {Z|모든 단어의 가중치 합}으로 나눈 것이다.',
        tex: R`\tm{pg}{\pi_{\text{guided}}(a\mid s)} = \frac{\tm{ref}{\pi_{\text{ref}}(a\mid s)}\;\exp\!\big(\tm{Q}{\hat Q(s,a)}\,/\,\tm{b}{\beta}\big)}{\tm{Z}{\sum_{a'}\pi_{\text{ref}}(a'\mid s)\exp\!\big(\hat Q(s,a')/\beta\big)}}`,
        terms: [
          { id: 'pg', sym: R`\pi_{\text{guided}}`, label: '유도된 정책', desc: '가중치를 바꾸지 않고 디코딩 시점에 만든 정책.' },
          { id: 'ref', sym: R`\pi_{\text{ref}}`, label: '기준 LM', desc: '언어적 자연스러움과 지지집합을 제공한다.', long: R`$\pi_{\text{ref}}$가 0인 토큰은 아무리 $Q$가 커도 선택되지 않는다. 실전에서는 계산량 때문에 $\pi_{\text{ref}}$의 상위 $k$개 토큰에만 $\hat Q$를 평가한다.` },
          { id: 'Q', sym: R`\hat Q(s,a)`, label: '접두사 가치', desc: '토큰 a를 붙였을 때의 예상 최종 보상.', long: R`DQN의 $Q$와 같은 역할이지만 $\gamma=1$, 결정적 전이라서 $Q(s,a)=V(s\oplus a)$이다. 그래서 "토큰별 Q-헤드" 대신 "접두사 가치 함수 하나"로 충분하다. 학습 방법: $\pi_{\text{ref}}$ 롤아웃의 최종 보상을 회귀(MC), 또는 soft 벨만 잔차를 최소화(TD).` },
          { id: 'b', sym: R`\beta`, label: '온도 (KL 가격)', desc: '작을수록 가치를 강하게 따른다(KL 증가).', easy: '온도가 낮으면 예상 점수 1등 단어로 거의 확정, 높으면 원래 모델 그대로. 예상 점수를 얼마나 믿을지 정하는 손잡이다.', long: R`$\beta\to\infty$이면 $\pi_{\text{ref}}$ 그대로, $\beta\to0$이면 $\arg\max_a\hat Q$ (DQN식 탐욕 디코딩). 탐욕으로 갈수록 $\hat Q$의 오차를 그대로 착취하므로, 가치 추정이 불확실하면 β를 크게 두는 것이 안전하다(T7의 비관과 같은 이유).` },
          { id: 'Z', sym: 'Z(s)', label: '정규화', desc: 'soft 벨만식에서는 e^{V(s)/β}와 같다.' },
        ],
      }),
      'try-cards': mountCards,
      'step-pass': (el) => ui.walkthrough(el, {
        title: '손으로 계산: 여러 번 풀면 맞을 확률',
        caption: '"다음 단계"를 눌러 한 줄씩 연다. 빈칸에 답을 적고 "확인"을 누르면 풀이가 열린다.',
        steps: [
          { say: R`한 번 풀면 맞을 확률이 0.3인 문제가 있다. 한 번 풀어서 <strong>틀릴</strong> 확률은?`, ask: { answer: 0.7, tol: 0.001 }, calc: R`1 - 0.3 = 0.7` },
          { say: R`세 번 풀었는데 세 번 모두 틀릴 확률은? 세 번이 서로 영향을 주지 않으면 곱하면 된다.`, ask: { answer: 0.343, tol: 0.001 }, calc: R`0.7 \times 0.7 \times 0.7 = 0.343` },
          { say: R`그러면 세 번 중 <strong>하나라도</strong> 맞을 확률은? 이것이 pass@3이다. 맞은 풀이를 알아보는 채점기가 있으면 이만큼 맞힐 수 있다.`, ask: { answer: 0.657, tol: 0.001 }, calc: R`1 - 0.343 = 0.657 \qquad \text{일반형: } 1-(1-p)^N` },
          { say: R`이번엔 채점기 없이 다수결로 고른다. 한 번 풀면 정답이 나올 확률 0.6, 늘 같은 오답 X가 나올 확률 0.4라 하자. 세 번 풀어 정답이 두 번 이상 나오면 다수결이 맞다. 그 확률은?`, ask: { answer: 0.648, tol: 0.002 }, calc: R`\underbrace{3\times0.6^2\times0.4}_{\text{정답 2번}} + \underbrace{0.6^3}_{\text{정답 3번}} = 0.432 + 0.216 = 0.648` },
          { say: R`한 번 풀 때(0.6)보다 다수결 셋(0.648)이 낫다. 그런데 정답 확률이 0.4이고 오답 X가 0.6이면, 같은 계산으로 0.352가 되어 한 번 풀 때(0.4)보다 <strong>나빠진다</strong>. 다수결은 원래 더 자주 나오던 답을 굳힐 뿐이다.`, calc: R`3\times0.4^2\times0.6 + 0.4^3 = 0.288 + 0.064 = 0.352` },
        ],
      }),
      'bon-sim': mountBonSim,
      'vote-calc': mountVote,
      'guided-sim': mountGuided,
      'search-sim': mountSearch,
      'alloc-calc': mountAlloc,
    },
    tacit: [
      { tag: 'math', t: 'Best-of-N의 보상 이득은 $\\sqrt{\\mathrm{KL}}$로 자란다',
        d: R`<p>점수가 대략 정규분포 $\mathcal N(\mu,\sigma^2)$이면 $N$개 최댓값의 기댓값은 $\mu+\sigma\sqrt{2\log N}$ 근처이고, KL은 $\approx\log N$이다. 따라서 이득 $\approx\sigma\sqrt{2\,\mathrm{KL}}$. Gao et al.(2022)이 과최적화 곡선의 가로축으로 $\sqrt{\mathrm{KL}}$을 쓴 이유가 이것이다. 거꾸로 "KL 1 nat당 얼마나 오르나"로 RL과 BoN을 비교할 때, 이득이 $\sqrt{\cdot}$로 포화하는 것은 방법의 결함이 아니라 극값 통계의 성질이다.</p>` },
      { tag: 'math', t: '다수결은 콩도르세 배심원 정리의 LLM 판이다',
        d: R`<p>독립 투표자 각각이 정답을 최빈으로 내면 투표자가 늘수록 다수결은 확실히 맞고, 오답이 최빈이면 확실히 틀린다. 그래서 self-consistency의 이득은 "정답이 이미 최빈인데 1회 샘플이 운 나쁘게 틀리는" 문제에서만 나온다. 또 하나의 숨은 가정은 <strong>독립성</strong>이다. 같은 프롬프트에서 뽑은 표본은 같은 오개념을 공유해 상관되어 있고, 상관이 있으면 유효 표본 수가 줄어 수렴이 느려진다. 온도를 올리거나 프롬프트를 바꾸는 것은 상관을 깨는 조작이다.</p>` },
      { tag: 'algo', t: 'test-time scaling의 천장은 생성이 아니라 검증이다',
        d: R`<p>정확도 $\le$ pass@k이고, 그 간격은 전부 선택 단계(검증기, 보상모델, 투표)의 오류다. 그래서 "생성-검증 간격(generation-verification gap)"이 큰 영역, 즉 검증이 생성보다 쉬운 문제(수학 정답 확인, 코드 테스트 실행)에서 추론 계산이 가장 잘 먹힌다. 새 도메인에 test-time compute를 적용할 때 가장 먼저 볼 것은 "싸고 믿을 만한 검증기가 있는가"다.</p>` },
      { tag: 'practice', t: '샘플 수를 늘리면 최적 온도도 올라간다',
        d: R`<p>Best-of-N과 pass@k는 다양성에서 이득을 얻는다. 온도 0이면 $N$개가 모두 같아 $N=1$과 같다. Codex 논문(Chen et al. 2021)은 pass@1에는 낮은 온도(0.2), pass@100에는 높은 온도(0.8)가 최적이었다고 보고했다. 일반 원리: 선택 연산이 강할수록(큰 $N$, 좋은 검증기) 제안 분포는 더 넓어야 한다. 탐색 알고리즘에서 제안 분포와 선택 규칙을 함께 조율해야 하는 것과 같다.</p>` },
      { tag: 'research', t: '탐색이 강할수록 검증기 오류를 더 깊게 판다',
        d: R`<p>Beam search나 MCTS는 PRM 점수의 최댓값을 여러 단계에 걸쳐 반복해서 취한다. 잡음 있는 추정치의 max는 위로 편향되므로(T8), 탐색의 폭과 깊이를 키울수록 "PRM이 과대평가한 경로"를 고를 확률이 커진다. Snell et al.(2024)이 쉬운 문제에서는 높은 예산에서 beam search의 이점이 줄거나 사라진다고 보고한 것도 이런 과최적화로 해석된다. 처방은 RLHF와 같다: 검증기 앙상블, 불확실성 페널티, 기준 정책에 대한 KL(β를 0으로 보내지 않기).</p>` },
      { tag: 'algo', t: '계산은 성공 확률이 중간인 문제에 써라',
        d: R`<p>병렬 샘플 하나를 더할 때의 한계 이득은 $\partial\,[1-(1-p)^n]/\partial n \propto (1-p)^n\cdot(-\log(1-p))$이다. $p\approx0$이면 0, $p$가 크면 $(1-p)^n$이 이미 작아 0. 이득은 $p$가 중간이고 $n$이 작을 때 집중된다. 난이도 예측기가 있으면 "아주 쉬움"과 "불가능"에 쓸 계산을 중간 문제로 옮기는 것만으로 큰 이득이 난다. 이 관찰은 RL 학습에서 정답률이 0이나 1인 프롬프트를 버리는 동적 샘플링(DAPO, <a href="#reasoning">21장</a>)과 정확히 같은 원리다.</p>` },
      { tag: 'research', t: '$\\beta\\to0$인 가치 유도 = DQN식 탐욕 디코딩, 그리고 그것이 위험한 이유',
        d: R`<p>$\pi_{\text{guided}}\propto\pi_{\text{ref}}e^{\hat Q/\beta}$에서 $\beta\to0$이면 $\arg\max_a\hat Q(s,a)$, 즉 DQN의 행동 선택이다. 그러나 LLM의 $\hat Q$는 $\pi_{\text{ref}}$가 거의 내지 않는 토큰에서 거의 학습되지 않았고, $\arg\max$는 바로 그런 곳의 오차를 집어낸다(오프라인 RL의 외삽 오차, T7). $\pi_{\text{ref}}$를 곱해 두는 것은 미학이 아니라 <strong>데이터가 있는 곳에 머물라는 비관적 정규화</strong>다.</p>` },
    ],
    quiz: [
      { q: '$N=16$일 때 Best-of-N의 KL 상한 $\\log N-(N-1)/N$은 약 몇 nats인가?', options: ['0.94', '1.84', '2.77', '16'], answer: 1,
        explain: '$\\log 16\\approx2.773$, $15/16=0.9375$이므로 약 1.84 nats. $N$을 16배로 늘려도 KL은 2 nats도 안 된다.' },
      { q: '어떤 문제에서 1회 샘플의 정답 확률이 0.3, 특정 오답 하나의 확률이 0.4이다. 다수결 샘플 수를 무한히 늘리면 정확도는?', options: ['1로 수렴', '0.3으로 수렴', '0으로 수렴', '0.5로 수렴'], answer: 2,
        explain: '다수결은 최빈값을 고른다. 오답이 최빈(0.4 > 0.3)이므로 표본이 늘수록 그 오답이 확실히 선택된다. pass@k는 1로 가지만, 그것을 회수하려면 검증기가 필요하다.' },
      { q: '보상 $r$이 응답 끝에만 있는 LLM에서 KL-정규화 최적 정책의 토큰 단위 형태는?', options: ['$\\pi_{\\text{ref}}(a|s)\\,e^{r/\\beta}$', '$\\arg\\max_a V(s\\oplus a)$', '$\\pi_{\\text{ref}}(a|s)\\exp\\big((V(s\\oplus a)-V(s))/\\beta\\big)$, $V$는 soft 가치', '$\\pi_{\\text{ref}}(a|s)+\\beta Q(s,a)$'], answer: 2,
        explain: '시퀀스 해를 접두사로 주변화하면 $\\pi^*(s_t)\\propto\\pi_{\\text{ref}}(s_t)e^{V(s_t)/\\beta}$이고, 조건부 확률을 취하면 soft advantage의 지수 가중이 된다.' },
      { q: '다음 중 compute-optimal test-time scaling의 핵심 주장에 가장 가까운 것은?', options: ['항상 Best-of-N이 최선이다', '최적 전략(병렬/순차/탐색)과 예산이 문제 난이도에 따라 달라진다', '추론 계산은 모델 크기를 대체할 수 없다', '순차 수정은 어떤 문제에서도 병렬보다 낫다'], answer: 1,
        explain: 'Snell et al.(2024)은 난이도를 추정해 전략을 고르는 것이 고정 전략보다 효율적임을 보였다. 쉬운 문제는 순차 수정, 어려운 문제는 병렬 탐색 비중이 커진다.' },
    ],
  });

  /* ---------- 공통 ---------- */
  function div(parent, cls) {
    const d = document.createElement('div');
    if (cls) d.className = cls;
    parent.appendChild(d);
    return d;
  }

  /* ---------- TRY: 카드 뽑기 ---------- */
  function mountCards(el) {
    const p = ui.panel(el, { kind: 'TRY', title: '카드 뽑기: 점수가 가장 좋아 보이는 답을 내라',
      caption: '"한 장 뽑기"를 눌러 답 카드를 한 장씩 뽑고, 이만하면 됐다 싶을 때 "제출"을 눌러라. 카드에는 채점기 점수와 답의 길이만 보이고, 제출하면 채점기 점수가 가장 높은 카드가 나가며 숨겨진 실제 품질이 공개된다. 여러 판 해 보며 많이 뽑을수록 정말 좋아지는지 아래 그래프에서 확인하라.' });
    const btns = ui.row(p.body, 'btns');
    const drawB = ui.button(btns, '한 장 뽑기', () => drawOne(true), { primary: true });
    const draw5 = ui.button(btns, '5장 더', () => { for (let i = 0; i < 5; i++) drawOne(false); render(); });
    const subB = ui.button(btns, '제출 (채점기 최고점 카드)', submit);
    ui.button(btns, '새 판', newRound);
    const tg = ui.row(p.body);
    const bias = ui.checkbox(tg, { label: '채점기가 긴 답을 좋아한다 (편향 있음)', value: true, onChange: () => { history = []; curve(); newRound(); } });
    const deck = div(p.body);
    deck.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;min-height:58px';
    const msg = div(p.body, 'fx-detail');
    const st = ui.stats(p.body, [
      { key: 'n', label: '이번 판에 뽑은 장 수' },
      { key: 'avg', label: '지금까지 제출한 카드의 평균 실제 품질', tone: 'accent' },
      { key: 'rounds', label: '한 판 수' },
    ]);
    const chart = plot.line(div(p.body), { height: 240, x: { label: '뽑은 장 수 N', min: 1, max: 30 }, y: { label: '제출한 카드의 실제 품질' }, series: [], hoverXDigits: 0, hoverDigits: 1 });
    const MAXN = 30;
    const r = sim.rng(777);
    let cards = [], done = false, history = [], exp = null;
    const sc = (v) => Math.round(50 + 15 * v);
    // 예시 모형: 실제 품질 = 내용 q + 길이 효과(적당하면 좋고 지나치면 나쁨), 채점기 = 내용 + 길이 선호 + 잡음
    function sample(rr) {
      const q = rr.normal(), h = rr.normal(), e = rr.normal();
      const k = bias.get() ? 1.5 : 0;
      return { vis: q + k * h + 0.3 * e, gold: q + h - h * h, len: Math.max(30, Math.round(160 + 70 * h)) };
    }
    function curve() {
      const rr = sim.rng(31337);
      const TR = 1500;
      const best = new Array(MAXN).fill(0), orc = new Array(MAXN).fill(0);
      for (let t = 0; t < TR; t++) {
        let bv = -Infinity, bg = 0, og = -Infinity;
        for (let n = 0; n < MAXN; n++) {
          const c = sample(rr);
          if (c.vis > bv) { bv = c.vis; bg = c.gold; }
          if (c.gold > og) og = c.gold;
          best[n] += bg; orc[n] += og;
        }
      }
      exp = { best: best.map((v) => sc(v / TR)), orc: orc.map((v) => sc(v / TR)) };
    }
    function bestIdx(key) { let bi = -1; cards.forEach((c, i) => { if (bi < 0 || c[key] > cards[bi][key]) bi = i; }); return bi; }
    function drawOne(redraw) {
      if (done || cards.length >= MAXN) return;
      cards.push(sample(r));
      if (redraw) render();
    }
    function submit() {
      if (!cards.length || done) return;
      done = true;
      const bi = bestIdx('vis');
      history.push([cards.length, sc(cards[bi].gold)]);
      render();
    }
    function newRound() { cards = []; done = false; render(); }
    function render() {
      const bv = bestIdx('vis'), bg = bestIdx('gold');
      deck.innerHTML = cards.map((c, i) => {
        const pick = i === bv, top = done && i === bg;
        const border = top ? 'var(--good)' : pick ? 'var(--signal)' : 'var(--line)';
        return '<div style="border:2px solid ' + border + ';border-radius:8px;padding:4px 8px;min-width:78px;background:var(--surface);font-size:var(--fs-xs);line-height:1.5">' +
          '<div class="mono" style="background:none;padding:0;font-size:var(--fs-sm)">점수 ' + sc(c.vis) + '</div>' +
          '<div style="color:var(--muted)">' + c.len + '단어</div>' +
          (done ? '<div style="color:' + (top ? 'var(--good)' : 'var(--ink)') + '">실제 ' + sc(c.gold) + '</div>' : '') + '</div>';
      }).join('') || '<span class="w-caption">아직 뽑은 카드가 없다.</span>';
      if (!cards.length) msg.innerHTML = '"한 장 뽑기"로 시작하자. 주황 테두리는 지금 채점기 점수가 가장 높은 카드, 즉 제출하면 나갈 카드다.';
      else if (!done) msg.innerHTML = cards.length + '장 뽑았다. 지금 제출하면 점수 <strong>' + sc(cards[bv].vis) + '</strong>(' + cards[bv].len + '단어) 카드가 나간다.' + (cards.length >= MAXN ? ' 최대 장 수에 닿았다. 제출하라.' : '');
      else {
        const g = sc(cards[bv].gold), og = sc(cards[bg].gold);
        msg.innerHTML = '제출한 카드: 채점기 점수 ' + sc(cards[bv].vis) + ', 길이 ' + cards[bv].len + '단어, <strong>실제 품질 ' + g + '</strong>. 뽑은 카드 중 실제로 가장 좋은 것은 초록 테두리(실제 ' + og + ', ' + cards[bg].len + '단어)였다.' +
          (bias.get() && cards[bv].len > 260 ? ' 채점기가 긴 답을 좋아해서, 많이 뽑을수록 지나치게 긴 답이 1등이 되기 쉽다.' : '') + ' "새 판"으로 다시 해 보자.';
      }
      drawB.disabled = draw5.disabled = done || cards.length >= MAXN;
      subB.disabled = done || !cards.length;
      st.set('n', cards.length);
      st.set('avg', history.length ? (sim.mean(history.map((x) => x[1]))).toFixed(1) : '–');
      st.set('rounds', history.length);
      const xs = sim.range(MAXN).map((i) => i + 1);
      chart.update({ series: [
        { name: '평균: 채점기 최고점 카드의 실제 품질', color: 'c1', data: xs.map((x, i) => [x, exp.best[i]]) },
        { name: '평균: 실제 품질로 골랐다면', color: 'c3', dash: '5 4', data: xs.map((x, i) => [x, exp.orc[i]]) },
        { name: '내가 제출한 카드', color: 'signal', type: 'scatter', r: 5, data: history.length ? history : [[NaN, NaN]] },
      ] });
    }
    curve();
    render();
  }

  /* ---------- Best-of-N 과최적화 ---------- */
  function mountBonSim(el) {
    const p = ui.panel(el, { kind: 'SIM', title: 'Best-of-N: 보상모델 점수 vs 실제 품질',
      caption: R`$N$ 슬라이더를 오른쪽으로 밀면서, 파란 선(실제 품질)이 어디서 꺾여 내려오는지 보라. 예시 모형이다. 응답을 (내용 품질 $q$, 장황함 $h$) 두 특징으로 단순화하고 둘 다 표준정규로 둔다. 실제 선호는 $g=q+0.5h-0.5h^2$(적당한 길이가 최선), 보상모델은 $\hat r=q+\kappa h+\sigma\varepsilon$(길수록 좋다는 편향 $\kappa$와 잡음 $\sigma$). $N$개 중 $\hat r$ 최고를 고르는 실험을 300회 반복해 평균낸다.` });
    const ctr = ui.row(p.body);
    const nS = ui.slider(ctr, { label: R`현재 $N$`, min: 0, max: 10, step: 1, value: 5, format: (v) => String(Math.pow(2, v)), onInput: show });
    const kS = ui.slider(ctr, { label: R`보상모델 편향 $\kappa$`, min: 0, max: 1.5, step: 0.05, value: 1.0, format: ui.fmt.f(2), onInput: recompute });
    const sS = ui.slider(ctr, { label: R`보상모델 잡음 $\sigma$`, min: 0, max: 2, step: 0.05, value: 0.3, format: ui.fmt.f(2), onInput: recompute });
    const st = ui.stats(p.body, [
      { key: 'kl', label: R`KL 상한 (nats)` },
      { key: 'px', label: R`선택된 응답의 $\hat r$`, tone: 'signal' },
      { key: 'g', label: R`선택된 응답의 실제 품질 $g$`, tone: 'accent' },
      { key: 'best', label: R`실제 품질이 최대인 $N$` },
    ]);
    const chart = plot.line(div(p.body), { height: 280, x: { label: 'KL(π_BoN ‖ π_ref) 상한 [nats]', min: 0 }, y: { label: '평균 점수' }, series: [] });
    const J = 11, NMAX = 1024, TR = 300;
    let res = null;
    function recompute() {
      const k = kS.get(), s = sS.get();
      const r = sim.rng(20240611);
      const px = new Array(J).fill(0), gd = new Array(J).fill(0), orc = new Array(J).fill(0);
      for (let t = 0; t < TR; t++) {
        let bp = -Infinity, bpg = 0, bg = -Infinity, next = 1, j = 0;
        for (let n = 1; n <= NMAX; n++) {
          const q = r.normal(), h = r.normal(), e = r.normal();
          const pr = q + k * h + s * e;
          const g = q + 0.5 * h - 0.5 * h * h;
          if (pr > bp) { bp = pr; bpg = g; }
          if (g > bg) bg = g;
          if (n === next) { px[j] += bp; gd[j] += bpg; orc[j] += bg; j++; next *= 2; }
        }
      }
      res = { px: px.map((v) => v / TR), gd: gd.map((v) => v / TR), orc: orc.map((v) => v / TR) };
      show();
    }
    const klOf = (N) => Math.log(N) - (N - 1) / N;
    function show() {
      if (!res) return;
      const j = nS.get(), N = Math.pow(2, j);
      const xs = sim.range(J).map((i) => klOf(Math.pow(2, i)));
      const bj = sim.argmax(res.gd);
      st.set('kl', klOf(N).toFixed(3));
      st.set('px', res.px[j].toFixed(3));
      st.set('g', res.gd[j].toFixed(3));
      st.set('best', String(Math.pow(2, bj)));
      chart.update({
        series: [
          { name: R`보상모델 점수 $\hat r$ (프록시)`, color: 'signal', data: xs.map((x, i) => [x, res.px[i]]), markers: true },
          { name: R`실제 품질 $g$ (보상모델로 선택)`, color: 'c1', data: xs.map((x, i) => [x, res.gd[i]]), markers: true, points: [[xs[bj], res.gd[bj], 6]] },
          { name: R`실제 품질 $g$ (실제 품질로 선택했다면)`, color: 'c3', dash: '5 4', data: xs.map((x, i) => [x, res.orc[i]]) },
        ],
        vlines: [{ x: klOf(N), label: 'N = ' + N }],
      });
    }
    recompute();
  }

  /* ---------- 다수결 vs pass@k ---------- */
  function mountVote(el) {
    const p = ui.panel(el, { kind: 'CALC', title: '다수결(maj@k)과 pass@k의 정확한 계산',
      caption: R`두 슬라이더 $p$와 $q$를 바꿔 가며, 파란 선(다수결)이 1로 올라가는지 0으로 내려가는지 보라. 한 문제에서 샘플 하나가 정답일 확률 $p$, 가장 흔한 오답일 확률 $q$, 나머지 $1-p-q$는 매번 서로 다른 오답이라고 두고, 다항분포를 정확히 합산한다(동점은 무작위로 깸).` });
    const ctr = ui.row(p.body);
    const pS = ui.slider(ctr, { label: R`정답 확률 $p$`, min: 0.02, max: 0.95, step: 0.01, value: 0.35, format: ui.fmt.f(2), onInput: draw });
    const qS = ui.slider(ctr, { label: R`가장 흔한 오답 확률 $q$`, min: 0, max: 0.9, step: 0.01, value: 0.25, format: ui.fmt.f(2), onInput: draw });
    const kS = ui.slider(ctr, { label: R`최대 샘플 수 $k$`, min: 5, max: 99, step: 1, value: 40, format: ui.fmt.int, onInput: draw });
    const st = ui.stats(p.body, [
      { key: 'q', label: R`실제 사용 $q$ (≤ 1−p)` },
      { key: 'maj', label: R`maj@k`, tone: 'accent' },
      { key: 'pass', label: R`pass@k`, tone: 'signal' },
      { key: 'lim', label: R`$k\to\infty$에서 maj@k` },
    ]);
    const chart = plot.line(div(p.body), { height: 260, x: { label: '샘플 수 k', min: 1 }, y: { label: '정확도', min: 0, max: 1 }, series: [] });
    const LF = [0];
    for (let i = 1; i <= 200; i++) LF[i] = LF[i - 1] + Math.log(i);
    function majority(k, pp, qq) {
      const rr = Math.max(0, 1 - pp - qq);
      const lp = Math.log(pp), lq = qq > 0 ? Math.log(qq) : -Infinity, lr = rr > 0 ? Math.log(rr) : -Infinity;
      let acc = 0;
      for (let c = 1; c <= k; c++) {
        for (let d = 0; d + c <= k; d++) {
          const s = k - c - d;
          if ((d > 0 && qq <= 0) || (s > 0 && rr <= 0)) continue;
          const lw = LF[k] - LF[c] - LF[d] - LF[s] + c * lp + (d ? d * lq : 0) + (s ? s * lr : 0);
          const mx = Math.max(c, d, s > 0 ? 1 : 0);
          if (c < mx) continue;
          const tied = 1 + (d === mx ? 1 : 0) + (mx === 1 ? s : 0);
          acc += Math.exp(lw) / tied;
        }
      }
      return acc;
    }
    function draw() {
      const pp = pS.get(), qq = Math.min(qS.get(), 1 - pp), K = kS.get();
      const maj = [], pass = [];
      for (let k = 1; k <= K; k++) {
        maj.push([k, majority(k, pp, qq)]);
        pass.push([k, 1 - Math.pow(1 - pp, k)]);
      }
      st.set('q', qq.toFixed(2));
      st.set('maj', maj[K - 1][1].toFixed(3));
      st.set('pass', pass[K - 1][1].toFixed(3));
      st.set('lim', pp > qq + 1e-9 ? '1 (정답이 최빈)' : Math.abs(pp - qq) < 1e-9 ? '0.5 (동률)' : '0 (오답이 최빈)');
      chart.update({
        x: { label: '샘플 수 k', min: 1, max: K },
        series: [
          { name: 'maj@k (다수결, 검증기 없음)', color: 'c1', data: maj },
          { name: 'pass@k (완벽한 검증기)', color: 'signal', dash: '5 4', data: pass },
        ],
        hlines: [{ y: pp, label: '1회 샘플 정확도 p' }],
      });
    }
    draw();
  }

  /* ---------- 가치 유도 디코딩: 토큰 트리 ---------- */
  function mountGuided(el) {
    const p = ui.panel(el, { kind: 'SIM', title: '토큰 트리에서 세 연산자의 보상-KL 경계',
      caption: R`온도 $\beta$ 슬라이더를 움직이며 파란 점과 주황 점이 곡선을 따라 어떻게 움직이는지 보고, "새 트리"로 다른 문제에서도 확인하라. 깊이 3, 분기 3인 트리(응답 27개). 각 노드의 $\pi_{\text{ref}}$와 잎의 보상은 시드로 생성한다. 파랑: 정확한 soft 가치로 유도(T5 최적해), 주황: $\pi_{\text{ref}}$ 아래 평균 보상으로 유도(controlled decoding식 근사), 초록 점: Best-of-N($N=1,2,4,\dots,512$, 이산 분포에서 정확 계산), 보라 점: $\pi_{\text{ref}}$의 탐욕 디코딩. 모든 값은 표본 없이 정확히 계산한다. 주황 곡선이 β가 작아질 때 되돌아 내려오는 것은, 평균 가치에 탐욕적으로 따라가면 좋은 잎이 섞인 서브트리를 지나쳐 버리기 때문이다.` });
    const ctr = ui.row(p.body);
    const bS = ui.slider(ctr, { label: R`온도 $\beta$ ($\log_{10}$ 눈금)`, min: -1.6, max: 1.2, step: 0.05, value: -0.3, format: (v) => Math.pow(10, v).toFixed(3), onInput: show });
    const btns = ui.row(p.body, 'btns');
    let seed = 3;
    ui.button(btns, '새 트리', () => { seed++; build(); });
    const st = ui.stats(p.body, [
      { key: 'ref', label: R`$\mathbb{E}_{\pi_{\text{ref}}}[r]$` },
      { key: 'opt', label: R`soft 최적: $\mathbb{E}[r]$ / KL`, tone: 'accent' },
      { key: 'cd', label: R`평균가치 근사: $\mathbb{E}[r]$ / KL`, tone: 'signal' },
      { key: 'max', label: R`$\max_y r(y)$` },
    ]);
    const split = div(p.body, 'w-split');
    const chart = plot.line(div(split), { height: 290, x: { label: 'KL(π ‖ π_ref) [nats]', min: 0 }, y: { label: '기대 보상 E[r]' }, series: [], hoverDigits: 3 });
    const right = div(split);
    const bars = plot.bars(right, { categories: ['토큰 A', '토큰 B', '토큰 C'], series: [], height: 220, y: { min: 0, max: 1, label: '첫 토큰 확률' }, labels: true, labelFmt: (v) => v.toFixed(2) });
    const note = document.createElement('p');
    note.className = 'w-caption';
    right.appendChild(note);
    let leaves, tree;

    function build() {
      const r = sim.rng(seed * 7919 + 11);
      function node(depth, path, prob) {
        if (depth === 3) { const lf = { r: r.normal(), path, pref: prob }; leaves.push(lf); return { leaf: true, lf }; }
        const pi = sim.softmax([r.normal() * 1.2, r.normal() * 1.2, r.normal() * 1.2]);
        return { pi, kids: pi.map((pa, a) => node(depth + 1, path.concat(a), prob * pa)) };
      }
      leaves = [];
      tree = node(0, [], 1);
      // 평균 가치 (π_ref 아래)
      (function mv(n) { if (n.leaf) { n.vm = n.lf.r; return n.vm; } n.vm = n.kids.reduce((s, k, a) => s + n.pi[a] * mv(k), 0); return n.vm; })(tree);
      show();
    }
    function softOpt(beta) {
      const lw = leaves.map((l) => Math.log(l.pref) + l.r / beta);
      const m = Math.max(...lw);
      const w = lw.map((x) => Math.exp(x - m));
      const Z = sim.sum(w);
      const q = w.map((x) => x / Z);
      const Er = sim.sum(q.map((x, i) => x * leaves[i].r));
      const KL = sim.sum(q.map((x, i) => (x > 0 ? x * Math.log(x / leaves[i].pref) : 0)));
      const first = [0, 0, 0];
      q.forEach((x, i) => (first[leaves[i].path[0]] += x));
      return { Er, KL, first };
    }
    function cdPolicy(beta) {
      const probs = new Map();
      (function walk(n, pr) {
        if (n.leaf) { probs.set(n.lf, pr); return; }
        const lg = n.kids.map((k, a) => Math.log(n.pi[a]) + k.vm / beta);
        const pi = sim.softmax(lg);
        n.kids.forEach((k, a) => walk(k, pr * pi[a]));
      })(tree, 1);
      let Er = 0, KL = 0;
      const first = [0, 0, 0];
      leaves.forEach((l) => { const q = probs.get(l); Er += q * l.r; if (q > 0) KL += q * Math.log(q / l.pref); first[l.path[0]] += q; });
      return { Er, KL, first };
    }
    function bon(N) {
      const sorted = leaves.slice().sort((a, b) => a.r - b.r);
      let F = 0, Er = 0, KL = 0;
      sorted.forEach((l) => {
        const lo = F;
        F += l.pref;
        const q = Math.pow(Math.min(1, F), N) - Math.pow(lo, N);
        Er += q * l.r;
        if (q > 1e-300) KL += q * Math.log(q / l.pref);
      });
      return { Er, KL };
    }
    function show() {
      if (!leaves) return;
      const beta = Math.pow(10, bS.get());
      const betas = sim.range(46).map((i) => Math.pow(10, 1.3 - i * 0.065));
      const so = betas.map((b) => softOpt(b));
      const cd = betas.map((b) => cdPolicy(b));
      const bn = sim.range(10).map((i) => bon(Math.pow(2, i)));
      // π_ref 탐욕 디코딩
      let n = tree, gp = 1;
      while (!n.leaf) { const a = sim.argmax(n.pi); gp *= n.pi[a]; n = n.kids[a]; }
      const cur = softOpt(beta), curcd = cdPolicy(beta);
      const Eref = sim.sum(leaves.map((l) => l.pref * l.r));
      const rmax = Math.max(...leaves.map((l) => l.r));
      st.set('ref', Eref.toFixed(3));
      st.set('opt', cur.Er.toFixed(3) + ' / ' + cur.KL.toFixed(2));
      st.set('cd', curcd.Er.toFixed(3) + ' / ' + curcd.KL.toFixed(2));
      st.set('max', rmax.toFixed(3));
      chart.update({
        series: [
          { name: 'soft 가치 유도 (최적 경계)', color: 'c1', data: so.map((x) => [x.KL, x.Er]), points: [[cur.KL, cur.Er, 6]] },
          { name: '평균 가치 유도 (근사)', color: 'signal', data: cd.map((x) => [x.KL, x.Er]), points: [[curcd.KL, curcd.Er, 6]] },
          { name: 'Best-of-N', color: 'c3', type: 'scatter', r: 4, data: bn.map((x) => [x.KL, x.Er]), opacity: 0.95 },
          { name: 'π_ref 탐욕 디코딩', color: 'c5', type: 'scatter', r: 6, data: [[-Math.log(gp), n.lf.r]] },
        ],
        hlines: [{ y: rmax, label: 'max r' }],
      });
      const ref1 = tree.pi;
      bars.update({ series: [
        { name: 'π_ref', color: 'c4', values: ref1 },
        { name: 'soft 최적', color: 'c1', values: cur.first },
        { name: '평균가치 근사', color: 'signal', values: curcd.first },
      ] });
      note.innerHTML = '토큰 A/B/C 아래 서브트리의 soft 가치: ' + tree.kids.map((k, a) => {
        const sub = leaves.filter((l) => l.path[0] === a);
        const lw = sub.map((l) => Math.log(l.pref / ref1[a]) + l.r / beta);
        const m = Math.max(...lw);
        return 'ABC'[a] + ' ' + (beta * (m + Math.log(sim.sum(lw.map((x) => Math.exp(x - m)))))).toFixed(2) + ' (평균 ' + k.vm.toFixed(2) + ')';
      }).join(', ') + '. β가 작을수록 soft 가치는 최댓값에, 평균은 그대로 평균에 머문다.';
    }
    build();
  }

  /* ---------- 단계 탐색: BoN+ORM vs PRM beam ---------- */
  function mountSearch(el) {
    const p = ui.panel(el, { kind: 'SIM', title: '같은 예산에서 Best-of-N(ORM) vs PRM beam search',
      caption: R`단계 수 $D$와 검증기 잡음 $\sigma$를 바꿔 가며, 파란 선(PRM beam)과 주황 선(Best-of-N)의 순서가 언제 뒤집히는지 보라. 예산 $B$ = 생성한 단계 수. Best-of-N은 $N=\lfloor B/D\rfloor$개 완성 풀이를 만들고 결과 점수로 고른다. Beam은 폭 $w$, 빔당 후보 $k\le4$개로 $D\cdot w\cdot k\le B$. 검증기 점수 = (맞으면 +1, 틀리면 −1) + $\mathcal N(0,\sigma^2)$. 예산마다 300회 몬테카를로.` });
    const ctr = ui.row(p.body);
    const dS = ui.slider(ctr, { label: R`풀이 단계 수 $D$`, min: 2, max: 12, step: 1, value: 8, format: ui.fmt.int, onInput: run });
    const pS = ui.slider(ctr, { label: R`단계 정답 확률 $p$`, min: 0.5, max: 0.98, step: 0.01, value: 0.75, format: ui.fmt.f(2), onInput: run });
    const sS = ui.slider(ctr, { label: R`검증기 잡음 $\sigma$`, min: 0, max: 3, step: 0.05, value: 1.0, format: ui.fmt.f(2), onInput: run });
    const st = ui.stats(p.body, [
      { key: 'one', label: R`1회 풀이 정확도 $p^D$` },
      { key: 'bon', label: 'BoN+ORM @ B=1024', tone: 'signal' },
      { key: 'beam', label: 'PRM beam @ B=1024', tone: 'accent' },
    ]);
    const chart = plot.line(div(p.body), { height: 270, x: { label: '예산 B (생성 단계 수, log₂)', min: 3, max: 10, fmt: (v) => String(Math.round(Math.pow(2, v))) }, y: { label: '정확도', min: 0, max: 1 }, series: [], hoverXDigits: 0 });
    function run() {
      const D = dS.get(), ps = pS.get(), sg = sS.get();
      const r = sim.rng(99);
      const TR = 300;
      const out = { bon: [], cov: [], beam: [] };
      for (let j = 3; j <= 10; j++) {
        const B = Math.pow(2, j);
        const N = Math.max(1, Math.floor(B / D));
        const pc = Math.pow(ps, D);
        let sb = 0, sc = 0, sm = 0;
        for (let t = 0; t < TR; t++) {
          let best = -Infinity, bestOk = false, any = false;
          for (let i = 0; i < N; i++) {
            const ok = r() < pc;
            any = any || ok;
            const sc2 = (ok ? 1 : -1) + sg * r.normal();
            if (sc2 > best) { best = sc2; bestOk = ok; }
          }
          sb += bestOk ? 1 : 0;
          sc += any ? 1 : 0;
        }
        const k = Math.min(4, Math.max(1, Math.floor(B / D)));
        const w = Math.max(1, Math.floor(B / (D * k)));
        for (let t = 0; t < TR; t++) {
          let beams = [{ ok: true, s: 0 }];
          for (let d = 0; d < D; d++) {
            const cand = [];
            beams.forEach((b) => {
              for (let c = 0; c < k; c++) {
                const ok = b.ok && r() < ps;
                cand.push({ ok, s: (ok ? 1 : -1) + sg * r.normal() });
              }
            });
            cand.sort((a, b) => b.s - a.s);
            beams = cand.slice(0, w);
          }
          sm += beams[0].ok ? 1 : 0;
        }
        out.bon.push([j, sb / TR]);
        out.cov.push([j, sc / TR]);
        out.beam.push([j, sm / TR]);
      }
      st.set('one', Math.pow(ps, D).toFixed(3));
      st.set('bon', out.bon[out.bon.length - 1][1].toFixed(3));
      st.set('beam', out.beam[out.beam.length - 1][1].toFixed(3));
      chart.update({
        series: [
          { name: 'PRM beam search', color: 'c1', data: out.beam, markers: true },
          { name: 'Best-of-N + ORM', color: 'signal', data: out.bon, markers: true },
          { name: 'Best-of-N 커버리지 (pass@N, 완벽한 검증기)', color: 'signal', dash: '4 4', data: out.cov },
        ],
        hlines: [{ y: Math.pow(ps, D), label: '1회 풀이' }],
      });
    }
    run();
  }

  /* ---------- 계산 배분 ---------- */
  function mountAlloc(el) {
    const p = ui.panel(el, { kind: 'CALC', title: '난이도별 병렬·순차 분할과 예산 재배분 (예시 모형)',
      caption: R`예산 $B$ 슬라이더를 움직이며, 오른쪽 막대와 아래 기록에서 어느 난이도에 예산이 몰리는지 보라. 문제는 네 난이도로 같은 수만큼 있다고 둔다. 정답은 검증기가 알아본다고 가정한다. (c)는 난이도마다 $n\times t$ 분할을 최적화하고, (d)는 전체 예산을 난이도 사이에 동적계획법으로 재배분한 뒤 분할도 최적화한다. 난이도는 정확히 안다고 가정한 상한이며, 실제 방법은 난이도를 예측해야 한다.` });
    const BINS = [
      { name: '쉬움', p: 0.5, m: 0.1 },
      { name: '보통', p: 0.15, m: 0.3 },
      { name: '어려움', p: 0.03, m: 0.6 },
      { name: '매우 어려움', p: 0.002, m: 0.9 },
    ];
    const ctr = ui.row(p.body);
    const bS = ui.slider(ctr, { label: R`문제당 평균 예산 $B$ (샘플 수)`, min: 0, max: 8, step: 1, value: 4, format: (v) => String(Math.pow(2, v)), onInput: draw });
    const gS = ui.slider(ctr, { label: R`수정 효율 $g$`, min: 1, max: 4, step: 0.1, value: 2, format: ui.fmt.f(1), onInput: draw });
    const mS = ui.slider(ctr, { label: R`막힘 확률 배율 (×$m$)`, min: 0, max: 1.1, step: 0.05, value: 1, format: ui.fmt.f(2), onInput: draw });
    const st = ui.stats(p.body, [
      { key: 'a', label: '(a) 병렬만' },
      { key: 'b', label: '(b) 순차만' },
      { key: 'c', label: '(c) 난이도별 분할', tone: 'accent' },
      { key: 'd', label: '(d) 재배분 + 분할', tone: 'signal' },
    ]);
    const split = div(p.body, 'w-split');
    const chart = plot.line(div(split), { height: 260, x: { label: '평균 예산 B (log₂)', min: 0, max: 8, fmt: (v) => String(Math.round(Math.pow(2, v))) }, y: { label: '전체 정확도', min: 0, max: 1 }, series: [], hoverXDigits: 0 });
    const right = div(split);
    const bars = plot.bars(right, { categories: BINS.map((b) => b.name), series: [], height: 220, y: { min: 0, max: 1, label: '정확도' }, labels: false });
    const log = document.createElement('div');
    log.className = 'log';
    right.appendChild(log);
    const TS = [1, 2, 3, 4, 6, 8, 12, 16, 24, 32, 48, 64, 96, 128, 192, 256, 384, 512, 768, 1024];

    function tables(g, mscale) {
      return BINS.map((bin) => {
        const m = Math.min(0.99, bin.m * mscale);
        const fix = Math.min(1, g * bin.p);
        const sseq = (t) => (1 - m) * (1 - (1 - bin.p) * Math.pow(1 - fix, t - 1)) + m * bin.p;
        const S = (n, t) => 1 - Math.pow(1 - sseq(t), n);
        const best = [{ v: 0, n: 0, t: 0 }];
        for (let b = 1; b <= 1024; b++) {
          let bv = -1, bn = 0, bt = 0;
          for (const t of TS) { if (t > b) break; const n = Math.floor(b / t); const v = S(n, t); if (v > bv) { bv = v; bn = n; bt = t; } }
          best.push({ v: bv, n: bn, t: bt });
        }
        return { S, best };
      });
    }
    function allocate(T, B) {
      const total = 4 * B;
      // dp[i][c]: 처음 i개 난이도에 c를 썼을 때 최대 합
      let dp = new Float64Array(total + 1).fill(0);
      const choice = [];
      for (let i = 0; i < 4; i++) {
        const nd = new Float64Array(total + 1).fill(-1);
        const ch = new Int32Array(total + 1);
        for (let c = 0; c <= total; c++) {
          for (let x = 0; x <= c; x++) {
            const v = dp[c - x] + T[i].best[x].v;
            if (v > nd[c]) { nd[c] = v; ch[c] = x; }
          }
        }
        choice.push(ch);
        dp = nd;
      }
      const alloc = [0, 0, 0, 0];
      let c = total;
      for (let i = 3; i >= 0; i--) { alloc[i] = choice[i][c]; c -= alloc[i]; }
      return { acc: dp[total] / 4, alloc };
    }
    function draw() {
      const T = tables(gS.get(), mS.get());
      const series = { a: [], b: [], c: [], d: [] };
      for (let j = 0; j <= 8; j++) {
        const B = Math.pow(2, j);
        series.a.push([j, sim.mean(T.map((x) => x.S(B, 1)))]);
        series.b.push([j, sim.mean(T.map((x) => x.S(1, B)))]);
        series.c.push([j, sim.mean(T.map((x) => x.best[B].v))]);
        series.d.push([j, allocate(T, B).acc]);
      }
      const j = bS.get(), B = Math.pow(2, j);
      const al = allocate(T, B);
      st.set('a', series.a[j][1].toFixed(3));
      st.set('b', series.b[j][1].toFixed(3));
      st.set('c', series.c[j][1].toFixed(3));
      st.set('d', series.d[j][1].toFixed(3));
      chart.update({
        series: [
          { name: '(a) 병렬만 (BoN)', color: 'c2', data: series.a },
          { name: '(b) 순차 수정만', color: 'c5', data: series.b },
          { name: '(c) 난이도별 최적 분할', color: 'c1', data: series.c },
          { name: '(d) 예산 재배분 + 분할', color: 'signal', dash: '5 3', data: series.d },
        ],
        vlines: [{ x: j, label: 'B = ' + B }],
      });
      bars.update({ series: [
        { name: '1회 성공률 p', color: 'c4', values: BINS.map((b) => b.p) },
        { name: '(c)', color: 'c1', values: T.map((x) => x.best[B].v) },
        { name: '(d)', color: 'signal', values: T.map((x, i) => x.best[al.alloc[i]].v) },
      ] });
      log.textContent = BINS.map((b, i) => {
        const c = T[i].best[B], d = T[i].best[al.alloc[i]];
        return b.name + ': (c) ' + c.n + '×' + c.t + ' · (d) 예산 ' + al.alloc[i] + (al.alloc[i] ? ' = ' + d.n + '×' + d.t : '');
      }).join('\n') + '\n(n×t = 병렬 체인 수 × 체인당 시도)';
    }
    draw();
  }
})();
