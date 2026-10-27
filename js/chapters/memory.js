/* 23 경험의 기억과 상각 */
(function () {
  const { ui, sim, plot } = RL;
  const R = String.raw;

  RL.chapter({
    id: 'memory',
    title: '경험의 기억과 상각',
    subtitle: '비싼 개선 연산(탐색, 검증, 반성)의 결과를 저장해 다음에는 싸게 꺼내 쓴다. 가중치에 저장하면 증류와 자기학습(STaR, ReST, R1 증류)이 되고, 바깥에 저장하면 기억과 스킬 라이브러리(Reflexion, Voyager)가 된다.',
    time: 40,
    level: '심화 · LLM',
    prereq: ['reasoning', 'modelbased'],
    theses: ['T9', 'T2', 'T5'],
    easy: {
      hook: '오래 고민해서 찾은 좋은 답을 적어 두거나 외워 두면, 다음에는 고민 없이 바로 꺼내 쓸 수 있다.',
      intro: '<p>문제집을 푸는 과정과 같다. 처음엔 한 문제를 여러 번 시도해야 겨우 맞힌다. 맞힌 풀이를 정리해 두면 비슷한 문제는 다음에 한 번에 푼다.</p><p>AI도 같은 일을 두 가지 방식으로 한다. 여러 번 시도해서 <strong>맞은 답만 모아 다시 공부</strong>하면(가중치에 기억), 다음엔 처음부터 잘 맞힌다. 공부 대신 <strong>메모를 옆에 두고 참고</strong>할 수도 있다(바깥에 기억).</p>',
      analogy: '자기 답안 중 맞은 것만 골라 복습하는 학생이 있다. 가끔이라도 맞히던 유형은 금세 늘지만, 한 번도 맞혀 본 적 없는 유형은 복습할 거리가 없어 그대로다. 선생님이 정답을 힌트로 보여 줘야 그 유형도 공부를 시작할 수 있다. 자기학습의 강점과 한계를 이 학생이 그대로 보여 준다.',
      path: ['맞은 답만 골라 공부하는 과정을 숫자 세 개로 직접 계산한다', '반복할수록 정답률은 오르지만 한 번도 못 푼 유형은 그대로인 이유를 시뮬레이터로 본다', '오답 노트가 있을 때와 없을 때 자물쇠 여는 횟수를 게임으로 비교한다', '메모(바깥 기억)와 공부(가중치 기억)의 차이를 정리한다'],
      recap: [
        '여러 번 시도해 맞은 답만 모아 다시 공부하면, 다음엔 처음부터 맞힐 확률이 올라간다.',
        '이 방법은 가끔이라도 맞히던 문제만 늘린다. 한 번도 못 푼 문제는 힌트나 더 강한 선생님이 있어야 풀린다.',
        '공부하지 않고 메모만 옆에 두어도 반복되는 실수는 크게 준다. 단, 무엇이 맞고 틀렸는지 알려 주는 채점이 있어야 메모가 쓸모 있다.',
      ],
    },
    goals: [
      '개선 연산자 $\\mathcal{I}$와 투영(증류)으로 AlphaZero, Expert Iteration, STaR, ReST-EM을 같은 식으로 쓸 수 있다.',
      '"샘플 → 정답만 남김 → SFT"가 EM 알고리즘이고, 기대 보상을 단조 증가시킨다는 것을 유도할 수 있다.',
      '자기학습이 pass@1은 올리지만 커버리지(pass@k)를 넘지 못하는 이유와, 힌트(rationalization)가 그 한계를 어떻게 넓히는지 시뮬레이션으로 확인한다.',
      '가중치 기억(파라메트릭)과 외부 기억(반성 메모, 스킬 라이브러리)의 장단점을 설명할 수 있다.',
    ],
    html: R`
<p>피보나치 수를 재귀로 계산하면 같은 부분 문제를 지수적으로 여러 번 푼다. 한 번 계산한 값을 표에 적어 두면(메모이제이션) 선형 시간에 끝난다. RL과 LLM도 같은 기법을 쓴다. MCTS 한 번, Best-of-64 한 번, 단위 테스트를 통과할 때까지의 시행착오 한 번은 비싸다. 그 결과를 <strong>어딘가에 저장</strong>해 두면 다음에는 순전파 한 번으로 같은 답을 낼 수 있다.</p>
<div class="grid2">
  <div class="card"><h4>가중치에 저장 (파라메트릭)</h4><p>탐색과 필터링으로 찾은 좋은 출력을 정책이 직접 내도록 학습한다. AlphaZero, Expert Iteration, STaR, ReST, RAFT, R1 증류가 여기에 속한다. 일반화가 되지만 저장하는 데 시간과 비용이 든다.</p></div>
  <div class="card"><h4>바깥에 저장 (비파라메트릭)</h4><p>경험을 텍스트, 코드, 궤적으로 저장하고 필요할 때 검색해 컨텍스트에 넣는다. 리플레이 버퍼, Reflexion의 반성 메모, Voyager의 스킬 라이브러리가 여기에 속한다. 바로 쓸 수 있지만 컨텍스트 길이와 검색 품질의 제약을 받는다.</p></div>
</div>

<h2>개선 연산자와 상각</h2>
<p>GPI(T2)는 "평가 → 개선"의 반복이다. 개선 단계를 일반화해 보면, 현재 정책 $\pi_k$를 받아 더 나은 행동 분포를 내놓는 비싼 절차가 있다. 이 절차를 <strong>개선 연산자</strong> $\mathcal{I}$라고 부른다. 정책은 그 결과를 흉내 내도록 학습된다.</p>
<div data-w="fx-amort"></div>
<div class="thesis-box"><span class="label">대전제 T9 · 탐색의 상각</span>
<p>$\mathcal{I}[\pi_k]$가 $\pi_k$보다 좋고(개선), 투영이 충분히 정확하면(표현력), 반복할 때마다 정책이 단조 개선된다. 비싼 연산은 학습할 때 한 번 쓰이고, 그 결과는 가중치에 <strong>상각</strong>되어 추론할 때는 비용이 들지 않는다. 개선된 정책은 다음 탐색의 더 좋은 출발점(사전분포)이 되므로 탐색도 함께 강해진다. AlphaZero(MCTS 방문 분포를 정책 목표로 씀), Expert Iteration(Anthony et al. 2017, 트리 탐색 전문가와 신경망 견습생), LLM의 자기학습 계열이 모두 이 순환 구조를 따른다.</p>
</div>
<div class="table-wrap"><table class="t">
<thead><tr><th>방법</th><th>개선 연산자 $\mathcal{I}$</th><th>투영 (증류)</th></tr></thead>
<tbody>
<tr><td>AlphaZero <a href="#modelbased">16</a></td><td>정책 사전분포와 가치로 안내한 MCTS의 방문 횟수 분포</td><td>방문 분포에 대한 교차 엔트로피 + 결과에 대한 가치 회귀</td></tr>
<tr><td>Expert Iteration</td><td>견습생 정책으로 안내한 트리 탐색</td><td>전문가의 수를 모방 학습</td></tr>
<tr><td>STaR</td><td>추론 샘플링 + 정답 필터, 실패하면 정답 힌트로 재생성(rationalization)</td><td>통과한 추론에 SFT (매 반복 원 모델에서 다시 학습)</td></tr>
<tr><td>ReST / ReST-EM</td><td>샘플링(Grow) 뒤 보상 임계값이나 이진 보상으로 필터(Improve)</td><td>필터한 데이터에 SFT</td></tr>
<tr><td>RAFT · 거절 샘플링 미세조정</td><td>프롬프트마다 $k$개 중 보상모델 최고점</td><td>최고 응답에 SFT</td></tr>
<tr><td>R1 증류</td><td>RL로 학습한 큰 모델(R1)의 긴 추론</td><td>작은 모델에 SFT</td></tr>
</tbody></table></div>

<h2>"뽑고, 거르고, 학습한다"는 EM이다</h2>
<p>보상이 정답 여부를 나타내는 이진값 $R(x,y)\in\{0,1\}$이라고 둔다. 자기학습의 가장 단순한 형태는 "정책에서 샘플 → 맞은 것만 남김 → 남은 것으로 SFT"다. Singh et al.(2023, ReST$^{EM}$)은 이 절차가 기대 보상의 로그를 최대화하는 EM 알고리즘이라고 지적했다.</p>
<div data-w="step-filter"></div>
<div data-w="dv-em"></div>
<div data-w="fx-em"></div>
<p>E-단계의 목표 $q^*\propto\pi_{\theta_k}R$은 T5의 KL-정규화 해 $\pi_{\theta_k}e^{R/\beta}/Z$에서 $\beta\to0$으로 보낸 극한이다. 즉 자기학습은 현재 정책을 기준점으로 한 가장 공격적인 KL-정규화 개선에, 순방향 KL 투영을 더한 것이다. 같은 틀에서 연속 보상을 쓰면 $q^*\propto\pi e^{r/\beta}$가 되고, 보상 가중 회귀(RWR, AWR)가 나온다(<a href="#offline">15장</a>).</p>

<h3>계열 정리</h3>
<ul>
  <li><strong>STaR</strong>(Zelikman et al. 2022): 추론과 답을 생성하고 맞은 것만 학습한다. 틀린 문제는 정답을 힌트로 주고 추론을 다시 생성한다(rationalization). 그 추론이 정답에 도달하면 <em>힌트 없이 생성한 것처럼</em> 학습 데이터에 넣는다. 매 반복 원래 사전학습 모델에서 다시 미세조정한다.</li>
  <li><strong>ReST</strong>(Gulcehre et al. 2023): 정책으로 데이터를 생성하는 Grow 단계와, 보상 임계값을 점점 높여 가며 걸러 낸 데이터로 학습하는 Improve 단계를 반복한다. 기계번역 과제에서 제안됐다.</li>
  <li><strong>ReST$^{EM}$</strong>(Singh et al. 2023): 수학과 코드 과제에서 이진 보상으로 EM을 돌리고, 매 반복 기본 모델에서 다시 미세조정한다. 사람이 만든 데이터로 SFT한 결과보다 좋았다고 보고했다.</li>
  <li><strong>RAFT</strong>(Dong et al. 2023): 보상모델로 순위를 매겨 최고 응답에 SFT한다. PPO 없이 RLHF의 효과를 일부 얻는다.</li>
  <li><strong>R1 증류</strong>(DeepSeek 2025): R1이 생성한 추론 데이터로 작은 모델을 SFT하는 편이, 같은 작은 모델에 대규모 RL을 직접 하는 것보다 좋았다고 보고했다. 큰 모델의 RL이 개선 연산자, 작은 모델의 SFT가 투영을 맡는다. 지금까지 나온 T9 사례 중 규모가 가장 크다.</li>
</ul>

<h2>시뮬레이터: 전문가 반복과 커버리지의 한계</h2>
<p>예시 모형에는 문제 80개가 있고, 문제마다 풀이 전략 8가지 중 일부만 정답이다. 문제는 네 유형(쉬움 40%, 보통 30%, 어려움 20%, 매우 어려움 10%)으로 나뉘고, 같은 유형은 같은 전략으로 풀린다. 정책은 $\pi(k\mid i)=\mathrm{softmax}(w + u_{\text{유형}(i)} + \epsilon_i)_k$다. 전역 선호 $w$는 모든 문제가 공유하고, $u$는 유형마다, $\epsilon_i$는 문제마다 고정된 잡음이다. 기본 모델은 어려운 유형의 정답 전략에 아주 낮은 확률을 준다. 한 번 반복할 때 문제마다 $N$개를 샘플링하고, 정답만 남겨 SFT를 25스텝 한다.</p>
<div data-w="exit-sim"></div>
<ul>
  <li><strong>pass@1은 오르고 큰 k의 pass@k는 내려갈 수 있다.</strong> 쉬운 문제의 성공 데이터가 전역 선호 $w$를 쉬운 전략 쪽으로 밀면서, 어려운 유형의 정답 전략 확률이 오히려 줄어든다. 오른쪽 그래프에서 기본 모델과 학습된 모델의 pass@k 곡선이 큰 $k$에서 교차한다.</li>
  <li><strong>커버리지가 천장이다.</strong> 한 번도 풀리지 않은 문제에서는 학습 신호가 나오지 않는다. 샘플 수 $N$을 늘리거나 <em>rationalization</em>을 켜면 커버리지가 늘고, 어려운 유형도 학습된다.</li>
  <li><strong>리플레이 버퍼</strong>는 과거의 성공을 계속 학습에 넣어, 드물게 얻은 어려운 문제의 해를 잊지 않게 한다. <strong>원 모델에서 다시 학습</strong>하면 정책이 자기 출력에 과적합해 표류하는 일을 막는다.</li>
</ul>
<div class="warn"><span class="label">연구와의 연결</span>Yue et al.(2025)은 검증 가능한 보상으로 RL(RLVR)을 한 모델이 작은 $k$의 pass@k에서는 기본 모델보다 좋지만, 아주 큰 $k$에서는 기본 모델이 앞선다고 보고했다. "RL이 새로운 추론 능력을 만드는가, 이미 있는 능력을 다듬는가"라는 질문이고, 위 시뮬레이터는 뒤쪽에 해당하는 메커니즘을 보여 준다. 지지집합을 넓히려면 힌트, 더 강한 교사의 증류, 탐색 같은 외부 정보가 필요하다.</div>

<h2>바깥에 저장하는 기억</h2>
<p>가중치를 바꾸지 않고 경험을 저장하는 방법도 RL의 오래된 도구에 하나씩 대응한다.</p>
<div class="table-wrap"><table class="t">
<thead><tr><th>고전 RL</th><th>LLM 에이전트</th><th>저장하는 것</th></tr></thead>
<tbody>
<tr><td>경험 리플레이 (DQN, <a href="#dqn">10</a>)</td><td>궤적을 검색해 퓨샷 예시로 넣음 (ExpeL)</td><td>$(s,a,r,s')$ / 성공 궤적</td></tr>
<tr><td>에피소드 기억, 같은 과제 재시도</td><td>Reflexion: 실패 원인을 자연어로 반성해 다음 시도의 컨텍스트에 넣음</td><td>"무엇이 틀렸고 다음엔 어떻게 할지"</td></tr>
<tr><td>옵션 / 스킬 (계층 RL)</td><td>Voyager: 자기 검증을 통과한 행동을 실행 가능한 코드로 스킬 라이브러리에 저장하고 임베딩으로 검색</td><td>재사용할 수 있는 하위 정책</td></tr>
<tr><td>메타 RL, 인컨텍스트 RL (<a href="#sequence">17</a>)</td><td>OPRO: (해, 점수) 이력을 프롬프트에 넣고 LLM이 다음 해를 제안</td><td>최적화 궤적 자체</td></tr>
</tbody></table></div>
<p>Reflexion(Shinn et al. 2023)은 행위자, 평가자, 자기 반성 모델로 이뤄진다. 테스트 통과 여부나 환경 보상 같은 평가 신호를 받으면 실패를 말로 요약해 기억에 넣고, 같은 과제를 다시 시도할 때 참고한다. 가중치를 갱신하지 않는 "언어적 강화"다. Voyager(Wang et al. 2023)는 Minecraft에서 자동 커리큘럼, 스킬 라이브러리, 그리고 환경 피드백과 자기 검증을 쓰는 반복 프롬프팅으로 평생 학습을 구현했다. ExpeL(Zhao et al. 2023)은 여러 과제의 경험에서 통찰을 뽑아내고, 성공 궤적을 검색해 쓴다.</p>
<p>아래 두 위젯은 같은 과제 가족(task family) 안에서 두 종류의 기억이 시도 횟수를 얼마나 줄이는지 보여 준다. 시뮬레이션에서 각 과제는 스킬 몇 개의 조합이고, 모든 스킬이 성공해야 과제가 성공한다. <em>반성</em>은 같은 과제 안에서 실패한 스킬을 고칠 뿐 다른 과제로 옮겨 가지 않는다. <em>스킬 라이브러리</em>는 성공한 과제의 스킬을 저장해 이후 과제에 다시 쓴다.</p>
<div data-w="try-notebook"></div>
<div data-w="mem-sim"></div>

<h2>기억으로서의 컨텍스트, 그리고 에이전트 RL</h2>
<p>LLM의 컨텍스트 창도 일종의 기억이다. Algorithm Distillation(<a href="#sequence">17장</a>)은 RL 알고리즘의 학습 이력 전체를 시퀀스로 학습시켰다. 그 결과 가중치를 바꾸지 않고 컨텍스트 안에서 정책이 개선되는 <strong>인컨텍스트 RL</strong>이 나타났다. OPRO(Yang et al. 2023)는 과거의 해와 점수를 정렬해 프롬프트에 넣고, LLM에게 더 나은 해를 제안하게 해서 프롬프트 자체를 최적화했다. 여러 번 상호작용하는 에이전트를 RL로 학습할 때는 무엇을 기억에 남기고 무엇을 버릴지도 행동의 일부가 된다. 긴 지평의 신용 할당은 여기서 가장 어려운 문제로 남는다(<a href="#synthesis">24장</a>).</p>

<h2>무엇이 바뀌었나</h2>
<div class="table-wrap"><table class="t">
<thead><tr><th>방법</th><th>기억의 위치</th><th>쓰기 조건 (필터)</th><th>읽기</th><th>장점 / 한계</th></tr></thead>
<tbody>
<tr><td>AlphaZero · ExIt</td><td>가중치</td><td>탐색 결과 전부 (방문 분포)</td><td>순전파</td><td>일반화가 잘 됨 / 시뮬레이터 필요</td></tr>
<tr><td>STaR · ReST-EM · RFT</td><td>가중치</td><td>정답 검증 통과</td><td>순전파</td><td>사람 라벨 불필요 / 커버리지가 천장</td></tr>
<tr><td>RAFT · BoN 증류</td><td>가중치</td><td>보상모델 최고점</td><td>순전파</td><td>단순함 / 보상모델 과최적화를 물려받음</td></tr>
<tr><td>R1 증류</td><td>작은 모델의 가중치</td><td>교사 출력 + 품질 필터</td><td>순전파</td><td>작은 모델의 RL보다 효율적 / 교사가 천장</td></tr>
<tr><td>Reflexion</td><td>컨텍스트 (텍스트)</td><td>평가자 신호가 실패를 알릴 때</td><td>프롬프트에 삽입</td><td>바로 적용 / 평가 신호 품질에 의존</td></tr>
<tr><td>Voyager</td><td>외부 코드 라이브러리</td><td>자기 검증 통과</td><td>임베딩 검색</td><td>조합해서 재사용 / 검증기와 API 필요</td></tr>
<tr><td>경험 리플레이</td><td>버퍼</td><td>전부 (또는 우선순위)</td><td>무작위·우선순위 샘플</td><td>데이터 재사용 / off-policy 보정 필요</td></tr>
</tbody></table></div>
`,
    mount: {
      'fx-amort': (el) => ui.formula(el, {
        title: '개선 후 투영: T9의 일반형',
        say: '{new|다음 정책}은, {I|비싼 방법(탐색, 채점 후 골라내기)으로 찾은 더 좋은 답의 분포}를 {pi|학습할 신경망 정책}이 {kl|정답 삼아 따라 하도록 공부시켜}, 만들 수 있는 정책 중 {proj|가장 가까운 것을 고른} 결과다.',
        tex: R`\tm{new}{\pi_{\theta_{k+1}}} = \tm{proj}{\arg\min_{\theta}}\; \mathbb{E}_{x}\Big[\tm{kl}{\mathrm{KL}}\big(\,\tm{I}{\mathcal{I}[\pi_{\theta_k}](\cdot\mid x)}\;\big\|\;\tm{pi}{\pi_\theta(\cdot\mid x)}\,\big)\Big]`,
        terms: [
          { id: 'new', sym: R`\pi_{\theta_{k+1}}`, label: '새 정책', desc: '개선 결과를 흉내 내도록 학습된 정책.' },
          { id: 'proj', sym: R`\arg\min_\theta`, label: '투영 (증류)', desc: '표현 가능한 정책 중 가장 가까운 것.', long: R`표현력이 부족하거나 학습이 덜 되면 $\mathcal{I}[\pi_k]$와 학습된 정책 사이에 차이가 남는다. 변분 추론에서 말하는 "상각 간격(amortization gap)"과 같은 개념이다. 이 차이가 개선 폭보다 크면 반복해도 개선된다는 보장이 없다.` },
          { id: 'kl', sym: R`\mathrm{KL}(\mathcal{I}\|\pi)`, label: '순방향 KL', desc: '= 개선된 분포의 샘플에 대한 교차 엔트로피(SFT).', easy: '좋은 답을 예제로 놓고 그 답을 그대로 쓰도록 공부시킨다. 좋은 답이 여러 개면 모두 따라 하려 한다.', long: R`순방향 KL은 <strong>모드를 덮는</strong> 성질이 있다. 목표 분포에 확률 질량이 있는 곳마다 정책도 질량을 두게 하므로, 탐색이 찾은 좋은 해 여러 개가 함께 남는다. RL 목표가 쓰는 역방향 KL $\mathrm{KL}(\pi\|\cdot)$은 모드를 찾아가는 성질이 있어 한 해로 쏠리기 쉽다.` },
          { id: 'I', sym: R`\mathcal{I}[\pi_{\theta_k}]`, label: '개선 연산자', desc: 'MCTS, Best-of-N, 정답 필터, 반성 같은 비싼 절차가 만든 더 나은 분포.', long: R`두 조건이 필요하다. (1) $\pi_k$보다 기대 보상이 높아야 하고, (2) 샘플을 뽑을 수 있어야 한다. MCTS 방문 분포, $\pi_k(y)R(y)/J$(정답 필터), $\pi_k e^{r/\beta}/Z$(보상 가중), 교사 모델의 출력이 그 예다.` },
          { id: 'pi', sym: R`\pi_\theta`, label: '학습되는 정책', desc: '신경망. 다음 반복에서 탐색의 사전분포가 된다.' },
        ],
      }),
      'dv-em': (el) => ui.derivation(el, {
        title: '필터링 SFT = 기대 보상의 EM',
        easy: '"뽑고, 맞은 것만 남기고, 남은 것으로 공부한다"는 정답률을 조금씩 확실히 올리는 고전적인 방법(EM)과 같다. 맞은 것만 남기는 단계는 "맞았다는 조건 아래 지금 모델이 낼 답"을 정확히 모으는 일이고, 공부 단계는 그 답을 따라 하는 일이다.',
        caption: R`보상은 $R(x,y)\in\{0,1\}$, 성공 확률은 $J_\theta(x)=\sum_y\pi_\theta(y|x)R(x,y)$이다. 프롬프트 $x$ 하나만 놓고 쓴다.`,
        steps: [
          { tex: R`\log J_\theta = \log\sum_y \pi_\theta(y)\,R(y)`, why: R`성공 확률의 로그를 최대화한다. 직접 미분하면 REINFORCE가 되지만, 여기서는 하한을 만든다.` },
          { tex: R`\log\sum_y q(y)\frac{\pi_\theta(y)R(y)}{q(y)} \;\ge\; \hl{\sum_y q(y)\log\frac{\pi_\theta(y)R(y)}{q(y)}} =: \mathcal{L}(q,\theta)`, why: R`임의의 분포 $q$에 젠슨 부등식을 쓴다(log는 오목 함수). 변분 하한(ELBO)과 같은 구조다.` },
          { tex: R`\text{E-step: }\; q^*(y) = \frac{\pi_{\theta_k}(y)R(y)}{J_{\theta_k}} = \hl{\pi_{\theta_k}(y\mid R=1)}`, why: R`$\mathcal{L}$을 $q$로 최대화하면 $\theta_k$에서 하한이 등호가 된다. $q^*$는 "성공했다는 조건 아래의 현재 정책", 즉 사후분포다.`, easy: '목표로 삼을 분포는 지금 모델이 낸 답 중 맞은 것만, 원래 나오던 비율 그대로 모은 것이다.' },
          { tex: R`y\sim\pi_{\theta_k},\ R(y)=1 \text{인 것만 남김} \;\Longrightarrow\; y\sim q^*`, why: R`거절 샘플링이 $q^*$의 정확한 표본을 준다. 검증기가 있으면 E-step은 "뽑고 거르기"로 끝난다. 수용률은 $J_{\theta_k}$라서 어려운 문제일수록 비싸다.` },
          { tex: R`\text{M-step: }\; \theta_{k+1} = \arg\max_\theta \mathbb{E}_{y\sim q^*}\big[\log\pi_\theta(y)\big] = \arg\min_\theta \hl{\mathrm{KL}(q^*\,\|\,\pi_\theta)}`, why: R`$\mathcal{L}(q^*,\theta)$에서 $\theta$와 상관없는 항을 빼면 걸러진 샘플의 로그우도가 남는다. 이것이 <strong>SFT</strong>다.` },
          { tex: R`\log J_{\theta_{k+1}} \ge \mathcal{L}(q^*,\theta_{k+1}) \ge \mathcal{L}(q^*,\theta_k) = \log J_{\theta_k}`, why: R`EM의 단조성이다. M-step이 정확하면 성공 확률은 줄지 않는다. 실제로는 표본과 학습량이 유한해서 근사에 그치므로, 과적합을 막는 장치(매 반복 기본 모델에서 다시 학습)가 중요하다.` },
          { tex: R`q^* = \lim_{\beta\to0}\frac{\pi_{\theta_k}(y)\,e^{R(y)/\beta}}{Z_\beta}\qquad(\text{T5와 연결})`, why: R`$R\in\{0,1\}$이면 KL-정규화 해는 $\beta\to0$에서 성공 집합 위의 $\pi_{\theta_k}$로 수렴한다. 자기학습은 현재 정책을 기준점으로 한 가장 공격적인 KL-정규화 개선과 순방향 KL 투영을 합친 것이다.` },
        ],
      }),
      'fx-em': (el) => ui.formula(el, {
        title: 'ReST-EM / STaR의 M-step 목표',
        say: '{th|다음 모델}은, {samp|지금 모델이 직접 풀어 본 답} 중 {R|맞은 것만 남겨서} 그 답이 나올 {lp|확률을 높이도록 공부한} 결과다. 그 공부는 {init|매번 원래 기본 모델에서 다시 시작한다}.',
        tex: R`\tm{th}{\theta_{k+1}} = \arg\max_{\theta}\; \sum_{x\in\mathcal{D}} \;\mathbb{E}_{\tm{samp}{y\sim\pi_{\theta_k}(\cdot|x)}}\Big[\, \tm{R}{\mathbb{1}[R(x,y)=1]}\;\tm{lp}{\log \pi_\theta(y\mid x)}\,\Big],\qquad \tm{init}{\theta \leftarrow \theta_{\text{base}}}`,
        terms: [
          { id: 'th', sym: R`\theta_{k+1}`, label: '다음 정책', desc: '걸러진 데이터로 학습한 결과.' },
          { id: 'samp', sym: R`y\sim\pi_{\theta_k}`, label: '현재 정책의 샘플', desc: '데이터는 직전 정책이 만든다(on-policy 생성, offline 학습).', long: R`데이터는 현재 정책으로 만들지만(on-policy), 학습은 고정된 데이터셋으로 하는 오프라인 SFT다. 그래서 PPO처럼 매 스텝 샘플링할 필요가 없고, 대규모 병렬 생성과 학습을 따로 돌릴 수 있다. 대신 한 반복 안에서 정책이 데이터에서 멀어져도 보정하지 않는다.` },
          { id: 'R', sym: R`\mathbb{1}[R=1]`, label: '필터', desc: '정답만 남긴다. 실패에 대한 음의 신호는 없다.', long: R`필터링은 보상 0과 1만 구분하므로, 틀린 답을 덜 내게 하는 힘이 직접 작용하지 않는다. 정답 확률이 올라가면서 오답이 상대적으로 줄 뿐이다. 오답 샘플까지 쓰려면 이득(advantage)이 음수가 되는 정책 경사(GRPO)나 대조 목표(DPO)가 필요하다.` },
          { id: 'lp', sym: R`\log\pi_\theta(y|x)`, label: '로그우도 (SFT)', desc: '토큰 단위 교차 엔트로피의 합.' },
          { id: 'init', sym: R`\theta\leftarrow\theta_{\text{base}}`, label: '기본 모델에서 재시작', desc: 'STaR, ReST-EM은 매 반복 원 모델에서 다시 미세조정한다.', long: R`직전 모델을 계속 미세조정하면 자기 출력에 반복해서 과적합하고, 다양성이 줄며 표류한다. 원 모델에서 다시 시작하면 반복 사이에 <em>데이터</em>만 전달되므로, EM의 "정확한 M-step"에 더 가깝다.` },
        ],
      }),
      'step-filter': (el) => ui.walkthrough(el, {
        title: '손으로 한 번: 맞은 답만 골라 공부하기',
        caption: '"다음 단계"를 누를 때마다 한 단계씩 열린다. 한 문제에서 모델이 답 A, B, C를 낼 확률이 각각 0.5, 0.3, 0.2이고, 정답은 B와 C 두 가지다(풀이 방법이 둘이다).',
        steps: [
          { say: 'A는 틀린 답이다. 지금 모델이 맞힐 확률은?', ask: { answer: 0.5, tol: 0.001 }, calc: R`P(\text{정답}) = 0.3 + 0.2 = 0.5` },
          { say: '여러 번 풀게 하고 맞은 답(B, C)만 남긴다. 남은 답 가운데 B의 비율은?', ask: { answer: 0.6, tol: 0.001 }, calc: R`q(B) = \frac{0.3}{0.5} = 0.6,\qquad q(C) = \frac{0.2}{0.5} = 0.4,\qquad q(A) = 0`, note: '이렇게 맞은 답만 모은 분포가 아래 유도의 E-step이 만드는 목표다. 원래 B가 C보다 자주 나왔으니 남은 것도 B가 많다.' },
          { say: '한 번에 다 외우지 않고, 지금 모델과 남은 답의 분포를 반반 섞는 만큼만 공부한다고 가정한다(단순화한 가정이다). 새 모델이 틀린 답 A를 낼 확률은?', ask: { answer: 0.25, tol: 0.001 }, calc: R`\pi_{\text{new}}(A) = \tfrac12\times0.5 + \tfrac12\times0 = 0.25` },
          { say: '그러면 새 모델이 맞힐 확률은?', ask: { answer: 0.75, tol: 0.001 }, calc: R`1 - 0.25 = 0.75\qquad(B:\ 0.45,\quad C:\ 0.30)` },
          { say: '한 번 더 하면 맞힐 확률은 0.875, 그다음은 0.9375다. 틀릴 확률이 매번 반으로 준다. 그런데 처음부터 확률이 0이었던 풀이는 맞은 답 목록에 한 번도 나오지 않으니 끝까지 0이다. 자기학습은 이미 가끔 내던 정답만 키운다.', calc: R`0.5 \to 0.75 \to 0.875 \to 0.9375 \to \cdots` },
        ],
      }),
      'try-notebook': mountNotebook,
      'exit-sim': mountExit,
      'mem-sim': mountMem,
    },
    tacit: [
      { tag: 'math', t: '필터링 SFT의 경사는 "음의 샘플 없는 0/1 보상 REINFORCE"다',
        d: R`<p>성공 표본을 모두 모아 학습하면 프롬프트 $x$ 하나의 경사 기여는 $\sum_{y:R=1}\nabla\log\pi(y)\approx N\,\mathbb{E}_\pi[R\nabla\log\pi]=N\nabla J$, 즉 baseline 없는 REINFORCE다(T3). 프롬프트마다 성공 표본의 평균을 내면 $\mathbb{E}_{q^*}[\nabla\log\pi]=\nabla J/J=\nabla\log J$가 되어, 성공률이 낮은 문제를 $1/J$배로 키운다. 문제마다 해 개수에 상한을 두는 관행은 두 극단 사이의 가중치에 해당한다. 이렇게 보면 자기학습과 정책 경사의 차이는 baseline(음의 이득)이 있느냐, on-policy로 얼마나 자주 갱신하느냐뿐이다.</p>` },
      { tag: 'math', t: '증류는 순방향 KL, RL은 역방향 KL',
        d: R`<p>SFT와 증류는 $\mathrm{KL}(\text{목표}\|\pi)$를 줄인다. 목표의 모든 모드를 덮으려 하므로 탐색이 찾은 여러 해가 남는다. RL 목표 $\mathbb{E}_\pi[r]-\beta\mathrm{KL}(\pi\|\pi_{\text{ref}})$는 $\mathrm{KL}(\pi\|\pi^*)$를 줄이는 것과 같아서(T5) 한 모드를 찾아간다. "탐색으로 찾고 SFT로 증류"가 "직접 RL"보다 다양성을 덜 잃는 데는 이 방향 차이도 한몫한다. 반대로 증류된 정책은 목표가 질량을 둔 곳 사이의 품질 낮은 영역에도 확률을 나눠 줄 수 있다.</p>` },
      { tag: 'research', t: '커버리지가 천장이다. 자기학습은 이미 있는 능력을 다듬을 뿐 범위를 넓히지 못한다',
        d: R`<p>거절 샘플링은 $\pi_k$의 지지집합 안에서만 표본을 준다. 기본 모델이 $10^{-6}$ 확률로만 내는 해에서는 학습 신호가 사실상 나오지 않는다. 그래서 자기학습의 상한은 기본 모델의 큰 $k$ pass@k이고, 실제 개선은 pass@1과 pass@k의 차이를 메우는 일이다. 지지집합은 외부 정보로만 넓힐 수 있다. 정답 힌트(rationalization), 더 강한 교사, 탐색, 도구 실행 결과, 사람 데이터가 그런 정보다. 새 방법이 "추론 능력을 새로 만든다"고 주장하면 먼저 큰 $k$의 pass@k를 확인한다.</p>` },
      { tag: 'practice', t: '자기 출력으로만 반복 학습하면 붕괴한다. 검증기가 정보를 넣는다',
        d: R`<p>모델이 생성한 데이터로 다음 모델을 반복 학습하면 분포의 꼬리가 사라지고 품질이 떨어진다는 보고가 있다(Shumailov et al. 2024, model collapse). 자기학습이 붕괴하지 않는 것은 <strong>외부 검증 신호</strong> 덕분이다. 정답 필터는 반복할 때마다 어떤 출력이 맞는지라는 새 정보를 넣는다. 필터가 약하거나(잡음 많은 보상모델) 없으면 자기학습은 스스로를 강화하는 순환에 빠진다. 매 반복 기본 모델에서 다시 학습하는 관행도 같은 위험을 줄인다.</p>` },
      { tag: 'math', t: 'AlphaZero의 방문 횟수는 정규화된 정책 최적화의 해다',
        d: R`<p>Grill et al.(2020)은 MCTS의 방문 분포가 $\max_\pi\, q^\top\pi-\lambda_N\,\mathrm{KL}(\pi_\theta\|\pi)$의 해를 근사함을 보였다. 여기서 $\lambda_N$은 시뮬레이션 수 $N$이 커질수록 줄어든다. 탐색을 많이 할수록 사전분포에서 더 과감하게 벗어나고, 적게 하면 사전분포 가까이에 머문다. 즉 탐색 예산이 T5의 $\beta$ 역할을 한다. Best-of-N에서 $N$이 KL을 정하는 것과 같은 구조다(<a href="#test-time">22장</a>).</p>` },
      { tag: 'algo', t: '가중치 기억과 외부 기억은 상보 학습 시스템이다',
        d: R`<p>외부 기억은 한 번에 기록되고 기록끼리 간섭하지 않는다. 대신 일반화가 되지 않고 검색 열쇠가 좋아야 한다. 가중치는 일반화가 되지만 예가 많이 필요하고, 새로 배운 것이 옛것을 덮는다(파국적 망각). 신경과학의 상보 학습 시스템 이론(McClelland et al. 1995)은 이 분업을 해마의 빠른 기록과 신피질의 느린 통합으로 설명했다. DQN의 리플레이 버퍼는 같은 구조를 공학으로 구현한 것이다. LLM 에이전트에도 같은 분업이 맞다. 최근 실패와 과제별 요령은 외부 기억에 두고, 반복해서 검증된 기술은 학습으로 가중치에 넣는다.</p>` },
      { tag: 'research', t: '반성의 이득은 평가자에서 나온다',
        d: R`<p>외부 피드백 없이 모델이 스스로 답을 검토하고 고치게 하면 추론 과제에서 성능이 오르지 않거나 떨어질 수 있다는 보고가 있다(Huang et al. 2023, "LLMs cannot self-correct reasoning yet"). Reflexion이 잘 작동한 과제에는 단위 테스트나 환경 보상처럼 <strong>믿을 만한 외부 신호</strong>가 있었다. 기억은 정보를 저장하고 전달할 뿐이고, 새 정보는 검증기, 환경, 도구 실행에서 들어온다.</p>` },
    ],
    quiz: [
      { q: '이진 보상의 EM 관점에서 E-step의 목표 분포 $q^*(y)$는?', options: ['$\\pi_{\\text{ref}}(y)$', '$\\pi_{\\theta_k}(y)R(y)/J_{\\theta_k}$', '$R(y)$에 대한 균등분포', '$\\pi_{\\theta_k}(y)e^{-R(y)}$'], answer: 1,
        explain: '하한을 등호로 만드는 $q$는 사후분포 $\\pi_{\\theta_k}(y\\mid R=1)$이다. 정책에서 뽑고 정답만 남기는 거절 샘플링으로 정확히 얻는다.' },
      { q: '자기학습(STaR, ReST-EM)이 기본 모델의 능력 밖 문제를 풀기 어려운 근본 이유는?', options: ['SFT 학습률이 작아서', '거절 샘플링이 현재 정책의 지지집합 안에서만 정답 표본을 주므로 한 번도 안 풀린 문제는 신호가 없어서', 'KL 페널티 때문에', '보상이 연속이 아니어서'], answer: 1,
        explain: '성공 표본이 있어야 학습이 일어난다. 커버리지(큰 $k$의 pass@k)가 천장이고, 힌트나 교사, 탐색 같은 외부 정보가 있어야 천장이 올라간다.' },
      { q: 'STaR의 rationalization이 하는 일은?', options: ['틀린 추론에 음의 보상을 준다', '정답을 힌트로 주고 추론을 재생성해, 정답에 도달한 추론을 힌트 없이 생성한 것처럼 학습 데이터에 넣는다', '보상모델을 다시 학습한다', '온도를 높여 다양성을 늘린다'], answer: 1,
        explain: '스스로 못 푼 문제에서도 학습 신호를 만들어 커버리지를 넓힌다. 다만 힌트를 보고 만든 추론이 실제 추론 과정을 충실히 반영한다는 보장은 없다.' },
      { q: 'Reflexion에 대한 설명으로 옳은 것은?', options: ['정책 경사로 가중치를 갱신한다', '평가 신호를 바탕으로 생성한 자연어 반성을 기억에 저장하고 다음 시도의 컨텍스트로 쓴다', '스킬을 코드로 저장하는 라이브러리다', '보상모델 없이 DPO를 한다'], answer: 1,
        explain: '가중치를 갱신하지 않고, 말로 적은 기억을 참고해 같은 과제의 다음 시도를 개선한다. 코드로 된 스킬 라이브러리는 Voyager의 방식이다.' },
    ],
  });

  function div(parent, cls) {
    const d = document.createElement('div');
    if (cls) d.className = cls;
    parent.appendChild(d);
    return d;
  }

  /* ---------- 전문가 반복 시뮬레이터 ---------- */
  function mountExit(el) {
    const K = 8;
    const TYPES = [
      { name: '쉬움', n: 32, correct: [0, 1] },
      { name: '보통', n: 24, correct: [2] },
      { name: '어려움', n: 16, correct: [5] },
      { name: '매우 어려움', n: 8, correct: [7] },
    ];
    const W0 = [1.5, 1.0, 0.8, 0.5, 0.3, -1.5, 0.2, -2.5];
    const probs = [];
    const r0 = sim.rng(4242);
    TYPES.forEach((t, ti) => { for (let j = 0; j < t.n; j++) probs.push({ t: ti, eps: sim.range(K).map(() => 0.5 * r0.normal()) }); });
    const P = probs.length;
    const isCorrect = (i, k) => TYPES[probs[i].t].correct.indexOf(k) >= 0;

    const p = ui.panel(el, { kind: 'SIM', title: '전문가 반복(샘플 → 정답 필터 → SFT)',
      caption: '"1 반복"을 누를 때마다 왼쪽 그래프의 pass@1(파랑)이 오르고, 오른쪽 그래프에서는 기본 모델과 현재 모델의 곡선이 큰 k에서 교차한다. rationalization을 켜고 "초기화 후 8 반복"을 누르면 커버리지(주황 점선)가 어떻게 달라지는지 비교할 수 있다.' });
    const ctr = ui.row(p.body);
    const nS = ui.slider(ctr, { label: R`문제당 샘플 수 $N$`, min: 1, max: 32, step: 1, value: 4, format: ui.fmt.int });
    const lS = ui.slider(ctr, { label: 'SFT 학습률', min: 0.1, max: 2, step: 0.05, value: 0.6, format: ui.fmt.f(2) });
    const tg = ui.row(p.body);
    const rat = ui.checkbox(tg, { label: 'Rationalization (못 푼 문제에 정답 힌트로 재생성)', value: false });
    const rep = ui.checkbox(tg, { label: '리플레이 버퍼 (과거 성공 누적)', value: false });
    const rst = ui.checkbox(tg, { label: '매 반복 기본 모델에서 재학습', value: false });
    const btns = ui.row(p.body, 'btns');
    ui.button(btns, '1 반복', () => { step(1); upd(); }, { primary: true });
    ui.button(btns, '5 반복', () => { step(5); upd(); });
    ui.button(btns, '초기화 후 8 반복', () => { reset(); step(8); upd(); });
    ui.button(btns, '초기화', () => { reset(); upd(); });
    const st = ui.stats(p.body, [
      { key: 'it', label: '반복' },
      { key: 'p1', label: 'pass@1', tone: 'accent' },
      { key: 'p16', label: 'pass@16' },
      { key: 'p1024', label: 'pass@1024 (기본 → 현재)', tone: 'signal' },
      { key: 'cov', label: '커버리지 (한 번이라도 풂)' },
      { key: 'ent', label: '평균 엔트로피 (nats)' },
    ]);
    const split = div(p.body, 'w-split');
    const c1 = plot.line(div(split), { height: 250, x: { label: '반복', min: 0 }, y: { label: '비율', min: 0, max: 1 }, series: [] });
    const c2 = plot.line(div(split), { height: 250, x: { label: 'k (log₂)', min: 0, max: 10, fmt: (v) => String(Math.round(Math.pow(2, v))) }, y: { label: 'pass@k', min: 0, max: 1 }, series: [], hoverXDigits: 0 });
    const barEl = div(p.body);
    const bars = plot.bars(barEl, { categories: TYPES.map((t) => t.name), series: [], height: 200, y: { min: 0, max: 1, label: '유형별 pass@1' }, labels: true, labelFmt: (v) => v.toFixed(2) });
    let w, u, buf, solved, it, hist, base;

    function policy(i) {
      const pr = probs[i];
      const lg = new Array(K);
      for (let k = 0; k < K; k++) lg[k] = w[k] + u[pr.t][k] + pr.eps[k];
      return sim.softmax(lg);
    }
    function pc(i, pi) { return TYPES[probs[i].t].correct.reduce((s, k) => s + pi[k], 0); }
    function metrics() {
      let p1 = 0, p16 = 0, ent = 0;
      const ty = [0, 0, 0, 0];
      const pk = sim.range(11).map(() => 0);
      for (let i = 0; i < P; i++) {
        const pi = policy(i), c = pc(i, pi);
        p1 += c; p16 += 1 - Math.pow(1 - c, 16); ent += sim.entropy(pi);
        ty[probs[i].t] += c / TYPES[probs[i].t].n;
        for (let j = 0; j <= 10; j++) pk[j] += 1 - Math.pow(1 - c, Math.pow(2, j));
      }
      return { p1: p1 / P, p16: p16 / P, ent: ent / P, cov: solved.filter(Boolean).length / P, ty, pk: pk.map((x) => x / P) };
    }
    function reset() {
      w = W0.slice();
      u = TYPES.map(() => new Array(K).fill(0));
      buf = new Float64Array(P * K);
      solved = new Array(P).fill(false);
      it = 0;
      base = metrics();
      hist = [Object.assign({ it: 0 }, base)];
    }
    function step(n) {
      for (let s = 0; s < n; s++) {
        const r = sim.rng(1000 + it * 31);
        const N = nS.get();
        const cnt = new Float64Array(P * K);
        for (let i = 0; i < P; i++) {
          const pi = policy(i);
          let succ = 0;
          for (let m = 0; m < N; m++) {
            const k = r.choice(pi);
            if (isCorrect(i, k)) { cnt[i * K + k]++; succ++; }
          }
          if (!succ && rat.get()) {
            const corr = TYPES[probs[i].t].correct;
            const q = pi.map((x, k) => 0.5 * x + (corr.indexOf(k) >= 0 ? 0.5 / corr.length : 0));
            const k = r.choice(q);
            if (isCorrect(i, k)) cnt[i * K + k]++;
          }
        }
        for (let j = 0; j < P * K; j++) { if (cnt[j] > 0) solved[Math.floor(j / K)] = true; buf[j] += cnt[j]; }
        const data = rep.get() ? buf : cnt;
        if (rst.get()) { w = W0.slice(); u = TYPES.map(() => new Array(K).fill(0)); }
        let total = 0;
        for (let j = 0; j < P * K; j++) total += data[j];
        if (total > 0) {
          const lr = lS.get();
          for (let g = 0; g < 25; g++) {
            const gw = new Array(K).fill(0);
            const gu = TYPES.map(() => new Array(K).fill(0));
            for (let i = 0; i < P; i++) {
              let ci = 0;
              for (let k = 0; k < K; k++) ci += data[i * K + k];
              if (!ci) continue;
              const pi = policy(i), t = probs[i].t;
              for (let k = 0; k < K; k++) { const gg = data[i * K + k] - ci * pi[k]; gw[k] += gg; gu[t][k] += gg; }
            }
            for (let k = 0; k < K; k++) { w[k] += (lr * gw[k]) / total; for (let t = 0; t < TYPES.length; t++) u[t][k] += (lr * gu[t][k]) / total; }
          }
        }
        it++;
        hist.push(Object.assign({ it }, metrics()));
      }
    }
    function upd() {
      const m = hist[hist.length - 1];
      st.set('it', it);
      st.set('p1', m.p1.toFixed(3));
      st.set('p16', m.p16.toFixed(3));
      st.set('p1024', base.pk[10].toFixed(3) + ' → ' + m.pk[10].toFixed(3));
      st.set('cov', m.cov.toFixed(3));
      st.set('ent', m.ent.toFixed(2));
      const lnK = Math.log(K);
      c1.update({
        x: { label: '반복', min: 0, max: Math.max(5, it) },
        series: [
          { name: 'pass@1', color: 'c1', data: hist.map((h) => [h.it, h.p1]), markers: true },
          { name: 'pass@16', color: 'c3', data: hist.map((h) => [h.it, h.p16]) },
          { name: '커버리지', color: 'signal', dash: '5 4', data: hist.map((h) => [h.it, h.cov]) },
          { name: '엔트로피 / log 8', color: 'c5', dash: '2 3', data: hist.map((h) => [h.it, h.ent / lnK]) },
        ],
      });
      c2.update({ series: [
        { name: '기본 모델', color: 'c4', dash: '5 4', data: base.pk.map((v, j) => [j, v]) },
        { name: '현재 (' + it + '회 반복)', color: 'c1', data: m.pk.map((v, j) => [j, v]) },
      ] });
      bars.update({ series: [
        { name: '기본 모델', color: 'c4', values: base.ty },
        { name: '현재', color: 'c1', values: m.ty },
      ] });
    }
    reset();
    step(8);
    upd();
  }

  /* ---------- TRY: 오답 노트 자물쇠 ---------- */
  function mountNotebook(el) {
    const OBJ = ['사과', '고래', '연필', '우산', '시계', '의자'];
    const SYM = ['△', '○', '□', '◇'];
    const p = ui.panel(el, { kind: 'TRY', title: '오답 노트: 같은 가족의 자물쇠를 연달아 열기',
      caption: '다이얼마다 기호를 하나씩 고르고 "열기"를 누르면, 맞은 다이얼과 틀린 다이얼을 알려 준다. 다이얼에는 이름표(사과, 고래 등)가 붙어 있고, 맞는 기호는 숨겨져 있지만 가족 전체에서 같다. 사과는 언제나 같은 기호다. "오답 노트 보기"를 켜면 지금까지 알아낸 사실이 옆에 정리된다. 직접 하기 번거롭다면 "에이전트 셋 비교"로 결과만 볼 수도 있다.' });
    const tg = ui.row(p.body);
    const noteCb = ui.checkbox(tg, { label: '오답 노트 보기', value: true, onChange: render });
    const split = div(p.body, 'w-split');
    const left = div(split), right = div(split);
    left.style.cssText = 'display:grid;gap:10px;align-content:start';
    const lockEl = div(left);
    lockEl.style.cssText = 'display:grid;gap:10px';
    const btns = ui.row(left, 'btns');
    const openB = ui.button(btns, '열기', tryOpen, { primary: true });
    const nextB = ui.button(btns, '다음 자물쇠', nextLock);
    ui.button(btns, '새 가족 (규칙 바꾸기)', newFamily);
    const msg = div(left, 'fx-detail');
    const note = div(right, 'aside');
    note.style.marginTop = '0';
    const st = ui.stats(p.body, [
      { key: 'cur', label: '이 자물쇠에서 시도한 횟수' },
      { key: 'on', label: '노트 보며 연 자물쇠: 평균 시도', tone: 'accent' },
      { key: 'off', label: '노트 없이 연 자물쇠: 평균 시도', tone: 'signal' },
    ]);
    const abtn = ui.row(p.body, 'btns');
    ui.button(abtn, '에이전트 셋 비교 (자물쇠 15개 × 300회)', compare);
    const chart = plot.line(div(p.body), { height: 230, x: { label: '가족 안에서 몇 번째 자물쇠', min: 1, max: 15 }, y: { label: '연 데 걸린 시도 횟수', min: 0 }, series: [], hoverXDigits: 0, hoverDigits: 2 });
    const r = sim.rng(2023);
    let map, lock, sel, tries, opened, facts, lockNo, rec, mine, autoRes = null;
    function newFamily() {
      map = OBJ.map(() => r.int(4));
      facts = OBJ.map(() => ({ ok: -1, no: new Set() }));
      rec = { on: [], off: [] };
      mine = [];
      lockNo = 0;
      nextLock();
    }
    function nextLock() {
      const a = r.int(OBJ.length);
      let b = r.int(OBJ.length - 1);
      if (b >= a) b++;
      lock = [a, b];
      sel = [-1, -1];
      tries = 0;
      opened = false;
      lockNo++;
      render('자물쇠 ' + lockNo + '번이다. 두 다이얼의 기호를 고르고 "열기"를 누른다.');
    }
    function tryOpen() {
      if (opened) return;
      if (sel[0] < 0 || sel[1] < 0) { render('두 다이얼 모두 기호를 골라야 한다.'); return; }
      tries++;
      const res = lock.map((t, i) => sel[i] === map[t]);
      lock.forEach((t, i) => { if (res[i]) facts[t].ok = sel[i]; else facts[t].no.add(sel[i]); });
      if (res[0] && res[1]) {
        opened = true;
        const mode = noteCb.get() ? 'on' : 'off';
        rec[mode].push(tries);
        mine.push([lockNo, tries, mode]);
        render('<strong>열렸다.</strong> ' + tries + '번 만에 열었다(' + (mode === 'on' ? '노트를 보며' : '노트 없이') + '). "다음 자물쇠"를 누르면 계속한다.');
      } else {
        render(lock.map((t, i) => OBJ[t] + ' ' + SYM[sel[i]] + (res[i] ? ' 맞음' : ' 틀림')).join(' · ') + '. 틀린 다이얼을 다시 고른다.');
      }
    }
    function compare() {
      const L = 15, RUNS = 300, CAP = 20;
      const out = [0, 1, 2].map(() => new Array(L).fill(0));
      for (let run = 0; run < RUNS; run++) {
        const rr = sim.rng(run * 17 + 3);
        const mp = OBJ.map(() => rr.int(4));
        const locks = sim.range(L).map(() => { const a = rr.int(6); let b = rr.int(5); if (b >= a) b++; return [a, b]; });
        [0, 1, 2].forEach((ag) => {
          const known = OBJ.map(() => ({ ok: -1, no: new Set() }));
          locks.forEach((lk, li) => {
            const loc = lk.map(() => ({ ok: -1, no: new Set() }));
            let n = 0, ok = false;
            while (!ok && n < CAP) {
              n++;
              const pick = lk.map((t, i) => {
                const k = ag === 2 ? known[t] : loc[i];
                if (ag > 0 && k.ok >= 0) return k.ok;
                const cand = sim.range(4).filter((s2) => ag === 0 || !k.no.has(s2));
                return cand[rr.int(cand.length)];
              });
              const res = lk.map((t, i) => pick[i] === mp[t]);
              lk.forEach((t, i) => { const k = ag === 2 ? known[t] : loc[i]; if (res[i]) k.ok = pick[i]; else k.no.add(pick[i]); });
              ok = res[0] && res[1];
            }
            out[ag][li] += n;
          });
        });
      }
      autoRes = out.map((a) => a.map((v) => v / RUNS));
      render('자물쇠 15개로 된 가족에서 에이전트 셋을 300번씩 돌렸다. 기억이 없으면 자물쇠마다 평균 ' + sim.mean(autoRes[0]).toFixed(1) + '번(20번에서 끊음), 같은 자물쇠 안에서만 기억하면 평균 ' + sim.mean(autoRes[1]).toFixed(1) + '번, 오답 노트로 자물쇠 사이에 기억을 옮기면 15번째 자물쇠에서 ' + autoRes[2][14].toFixed(2) + '번까지 떨어진다.');
    }
    function render(text) {
      if (text != null) msg.innerHTML = text;
      lockEl.innerHTML = '';
      lock.forEach((t, i) => {
        const row = document.createElement('div');
        row.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;align-items:center';
        row.innerHTML = '<span class="chip" style="border-color:var(--c' + (t + 1) + ');color:var(--c' + (t + 1) + ');min-width:4.5em;justify-content:center">' + OBJ[t] + '</span>';
        SYM.forEach((sy, k) => {
          const b = ui.button(row, sy, () => { if (opened) return; sel[i] = k; render(); });
          b.setAttribute('aria-pressed', String(sel[i] === k));
          b.setAttribute('aria-label', OBJ[t] + ' 다이얼에 ' + sy);
          b.style.minWidth = '2.6em';
          b.style.fontSize = 'var(--fs-md)';
        });
        lockEl.appendChild(row);
      });
      openB.disabled = opened;
      nextB.disabled = !opened;
      if (noteCb.get()) {
        const lines = OBJ.map((o, t) => {
          const f = facts[t];
          if (f.ok >= 0) return '<li><strong>' + o + '</strong>: ' + SYM[f.ok] + ' (확인됨)</li>';
          if (f.no.size) return '<li><strong>' + o + '</strong>: ' + [...f.no].map((k) => SYM[k]).join(' ') + ' 아님</li>';
          return '';
        }).filter(Boolean);
        note.innerHTML = '<span class="label">오답 노트</span>' + (lines.length ? '<ul style="margin:0;padding-left:1.2em">' + lines.join('') + '</ul>' : '아직 기록이 없다. 한 번 시도하면 맞은 것과 틀린 것이 여기에 적힌다.');
      } else {
        note.innerHTML = '<span class="label">오답 노트</span>노트가 꺼져 있다. 지금까지 알아낸 것은 기억으로만 떠올려야 한다.';
      }
      st.set('cur', tries);
      st.set('on', rec.on.length ? sim.mean(rec.on).toFixed(2) + ' (' + rec.on.length + '개)' : '–');
      st.set('off', rec.off.length ? sim.mean(rec.off).toFixed(2) + ' (' + rec.off.length + '개)' : '–');
      const xs = sim.range(15).map((i) => i + 1);
      const series = [];
      if (autoRes) {
        series.push({ name: '에이전트: 기억 없음', color: 'c4', data: xs.map((x, i) => [x, autoRes[0][i]]) });
        series.push({ name: '에이전트: 같은 자물쇠 안에서만 기억 (Reflexion식)', color: 'c2', data: xs.map((x, i) => [x, autoRes[1][i]]) });
        series.push({ name: '에이전트: 오답 노트 (자물쇠 사이 기억)', color: 'c1', data: xs.map((x, i) => [x, autoRes[2][i]]) });
      }
      const on = mine.filter((m) => m[2] === 'on' && m[0] <= 15), off = mine.filter((m) => m[2] === 'off' && m[0] <= 15);
      series.push({ name: '나: 노트 보며', color: 'c3', type: 'scatter', r: 5, data: on.length ? on.map((m) => [m[0], m[1]]) : [[NaN, NaN]] });
      series.push({ name: '나: 노트 없이', color: 'c5', type: 'scatter', r: 5, data: off.length ? off.map((m) => [m[0], m[1]]) : [[NaN, NaN]] });
      chart.update({ series });
    }
    newFamily();
    compare();
    render('자물쇠 1번이다. 두 다이얼의 기호를 고르고 "열기"를 누른다. 아래 그래프는 에이전트 셋을 미리 돌려 본 결과다.');
  }

  /* ---------- 반성 기억 vs 스킬 라이브러리 ---------- */
  function mountMem(el) {
    const p = ui.panel(el, { kind: 'SIM', title: '과제 가족에서의 기억: 반성(과제 내) vs 스킬 라이브러리(과제 간)',
      caption: R`스킬 종류 수와 반성 정확도 슬라이더를 움직이면 네 선이 "1회 시도"로 내려오는 속도가 바뀐다. 과제 80개를 차례로 풀고, 각 과제는 서로 다른 스킬 $m$개의 조합이다. 한 시도는 모든 스킬이 성공해야 성공하고(스킬 성공 확률 $p$), 과제마다 최대 10번 시도한다. 반성은 실패한 뒤 정확도 $a$로 실패한 스킬을 짚어 그 과제 안에서 고친다(성공률 0.95). 잘못 짚으면 효과가 없다. 스킬 라이브러리는 성공한 과제의 스킬을 검증된 코드로 저장해, 이후 모든 과제에서 성공률 0.98로 다시 쓴다. 과제 순서 40가지를 평균한다.` });
    const ctr = ui.row(p.body);
    const pS = ui.slider(ctr, { label: R`스킬 기본 성공률 $p$`, min: 0.3, max: 0.9, step: 0.05, value: 0.6, format: ui.fmt.f(2), onInput: run });
    const aS = ui.slider(ctr, { label: R`반성의 원인 지목 정확도 $a$`, min: 0, max: 1, step: 0.05, value: 0.7, format: ui.fmt.f(2), onInput: run });
    const mS = ui.slider(ctr, { label: R`과제당 스킬 수 $m$`, min: 1, max: 4, step: 1, value: 3, format: ui.fmt.int, onInput: run });
    const kS = ui.slider(ctr, { label: '스킬 종류 수', min: 6, max: 40, step: 1, value: 15, format: ui.fmt.int, onInput: run });
    const V = [
      { key: 'none', name: '기억 없음', color: 'c4', reflex: false, lib: false },
      { key: 'ref', name: '반성 기억 (Reflexion식)', color: 'c2', reflex: true, lib: false },
      { key: 'lib', name: '스킬 라이브러리 (Voyager식)', color: 'c3', reflex: false, lib: true },
      { key: 'both', name: '둘 다', color: 'c1', reflex: true, lib: true },
    ];
    const st = ui.stats(p.body, V.map((v) => ({ key: v.key, label: v.name + ': 평균 시도 / 성공률' })));
    const split = div(p.body, 'w-split');
    const c1 = plot.line(div(split), { height: 250, x: { label: '과제 순서', min: 1, max: 80 }, y: { label: '시도 횟수 (5개 이동평균)', min: 0 }, series: [] });
    const c2 = plot.line(div(split), { height: 250, x: { label: '과제 순서', min: 1, max: 80 }, y: { label: '라이브러리 크기', min: 0 }, series: [] });
    function run() {
      const T = 80, SEEDS = 40, MAXA = 10;
      const ps = pS.get(), acc = aS.get(), m = mS.get(), S = kS.get();
      const res = V.map(() => ({ att: new Array(T).fill(0), lib: new Array(T).fill(0), succ: 0 }));
      for (let sd = 0; sd < SEEDS; sd++) {
        const rt = sim.rng(500 + sd);
        const tasks = sim.range(T).map(() => {
          const set = [];
          while (set.length < Math.min(m, S)) { const k = rt.int(S); if (set.indexOf(k) < 0) set.push(k); }
          return set;
        });
        V.forEach((v, vi) => {
          const r = sim.rng(9000 + sd * 7 + vi);
          const lib = new Set();
          tasks.forEach((task, t) => {
            const fixed = new Set();
            let a = 0, ok = false;
            while (a < MAXA && !ok) {
              a++;
              const failed = [];
              task.forEach((s) => {
                const pr = v.lib && lib.has(s) ? 0.98 : fixed.has(s) ? 0.95 : ps;
                if (r() >= pr) failed.push(s);
              });
              ok = failed.length === 0;
              if (ok) { if (v.lib) task.forEach((s) => lib.add(s)); break; }
              if (v.reflex) fixed.add(r() < acc ? failed[r.int(failed.length)] : task[r.int(task.length)]);
            }
            res[vi].att[t] += a;
            res[vi].lib[t] += lib.size;
            res[vi].succ += ok ? 1 : 0;
          });
        });
      }
      V.forEach((v, vi) => {
        const att = res[vi].att.map((x) => x / SEEDS);
        st.set(v.key, sim.mean(att).toFixed(2) + ' / ' + (res[vi].succ / (SEEDS * T) * 100).toFixed(0) + '%');
      });
      c1.update({ series: V.map((v, vi) => ({ name: v.name, color: v.color, data: sim.smooth(res[vi].att.map((x) => x / SEEDS), 5).map((y, t) => [t + 1, y]) })) });
      c2.update({ y: { label: '라이브러리 크기', min: 0, max: S }, series: V.filter((v) => v.lib).map((v) => ({ name: v.name, color: v.color, data: res[V.indexOf(v)].lib.map((x, t) => [t + 1, x / SEEDS]) })), hlines: [{ y: S, label: '전체 스킬 수' }] });
    }
    run();
  }
})();
