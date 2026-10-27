/* 24 종합: 연구 흐름과 열린 문제 */
(function () {
  const { ui, sim, plot } = RL;
  const R = String.raw;

  RL.chapter({
    id: 'synthesis',
    title: '종합: 연구 흐름과 열린 문제',
    subtitle: '지금까지의 알고리즘을 네 개의 연구 흐름과 다섯 개의 설계 손잡이로 다시 접는다. 새 논문을 만났을 때 "어느 대전제 위에서 어떤 손잡이를 돌렸는가"를 바로 읽어 내는 것이 이 장의 목표다.',
    time: 35,
    level: '종합',
    prereq: ['bellman', 'ppo', 'offline', 'reasoning', 'memory'],
    theses: ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9'],
    easy: {
      hook: '강화학습 알고리즘은 수십 개지만, 고르는 질문은 몇 개뿐이다. 무엇을 배우나, 데이터는 어디서 오나, 한 번에 얼마나 과감하게 바꾸나.',
      intro: '<p>요리법이 수천 가지여도 결국 재료, 불 세기, 조리 시간의 조합인 것처럼, 강화학습 알고리즘도 몇 가지 선택의 조합이다. 이 장은 지금까지 본 알고리즘을 네 갈래의 흐름으로 정리하고, 그 갈래들이 사실 한 줄의 규칙에서 나왔다는 것을 숫자로 보인다.</p><p>마지막에는 일상적인 질문 몇 개에 답해 내 문제에 맞는 알고리즘을 찾아보는 도구가 있다.</p>',
      analogy: '투자 비중을 조정하는 일과 같다. 종목별 예상 수익표(가치)를 보고 좋은 종목의 비중을 늘리되, 지금 비중(기준점)에서 한 번에 너무 많이 바꾸지는 않는다. 예상표를 완전히 믿으면 전부 1등 종목에 넣고(탐욕), 반쯤 믿으면 조금씩 옮긴다(정책 경사). 기준을 어제의 비중으로 두느냐, 처음 설계안으로 두느냐, 남이 운용한 기록으로 두느냐에 따라 PPO, RLHF, 오프라인 RL처럼 이름이 다른 알고리즘이 된다.',
      path: ['네 갈래의 연구 흐름을 훑는다', '한 줄의 규칙에서 여러 알고리즘이 나오는 것을 숫자로 직접 계산한다', '같은 문제에 네 가지 개선 방법을 돌려 비교한다', '질문 몇 개에 답해 내 문제에 맞는 알고리즘을 찾는다'],
      recap: [
        '대부분의 알고리즘은 "얼마나 좋은지 재 보고, 더 나은 쪽으로 조금 옮기기"의 반복이다.',
        '얼마나 과감하게 옮기는지, 무엇을 기준으로 삼는지, 좋은 정도를 어떻게 어림하는지에 따라 이름이 달라진다.',
        '새 방법을 보면 무엇을 바꿨는지, 그 대가로 무엇을 잃었는지, 데이터와 채점은 어디서 오는지를 먼저 본다.',
      ],
    },
    goals: [
      '가치 · 정책 · 정규화 · 상각의 네 흐름을 대전제와 함께 설명할 수 있다.',
      'KL-정규화 정책 개선 한 줄에서 탐욕 개선, 자연 정책 경사, RLHF 최적해, AWR, 탐색-증류가 모두 나오는 것을 유도할 수 있다.',
      '"알고리즘 조합기"로 다섯 설계 선택을 고르고 가장 가까운 알려진 알고리즘과 그 위험을 찾을 수 있다.',
      '새 RL 논문을 읽는 점검표와 현재의 열린 문제를 정리할 수 있다.',
    ],
    html: R`
<p>24개 장에서 본 알고리즘은 수십 개지만, 그것을 만든 생각은 몇 개 되지 않는다. 이 장은 먼저 연구사를 네 갈래로 정리하고, 그 갈래들이 사실 하나의 식에서 갈라져 나온다는 것을 유도한 뒤, 직접 설계 선택을 조합해 보는 도구로 마무리한다.</p>

<h2>네 개의 연구 흐름</h2>
<div class="grid2" style="grid-template-columns:repeat(auto-fit,minmax(min(100%,380px),1fr))">
  <div class="card">
    <h4>가치 흐름 <a class="chip t" href="#theses--t1">T1</a> <a class="chip t" href="#theses--t8">T8</a></h4>
    <p style="display:flex;flex-wrap:wrap;gap:4px;align-items:center"><a class="chip" href="#bellman">Bellman 1957</a>→<a class="chip" href="#qlearning">Q-learning 1989</a>→<a class="chip" href="#dqn">DQN 2015</a>→<a class="chip" href="#dqn">C51 · Rainbow</a>→<a class="chip" href="#modelbased">MuZero 2020</a></p>
    <p>벨만 고정점을 샘플로 푸는 것에서 출발했다. 신경망을 끼우자 축약이 깨져(deadly triad) 리플레이와 타깃망이 필요해졌고, 기댓값 대신 분포를, 1-step 대신 n-step을 쓰며 안정성과 효율을 얻었다. MuZero는 가치·정책·모델을 함께 학습해 학습된 모델 위에서 탐색한다.</p>
  </div>
  <div class="card">
    <h4>정책 흐름 <a class="chip t" href="#theses--t3">T3</a> <a class="chip t" href="#theses--t4">T4</a> <a class="chip t" href="#theses--t6">T6</a></h4>
    <p style="display:flex;flex-wrap:wrap;gap:4px;align-items:center"><a class="chip" href="#pg">REINFORCE 1992</a>→<a class="chip" href="#ac">A3C 2016</a>→<a class="chip" href="#ppo">TRPO · PPO</a>→<a class="chip" href="#rlhf">RLHF-PPO 2022</a>→<a class="chip" href="#reasoning">GRPO 2024</a></p>
    <p>점수함수 경사는 미분 불가능한 보상에도 쓸 수 있지만 분산이 크다. critic과 advantage로 분산을 줄였고(A3C), 한 번에 너무 멀리 가지 않도록 신뢰영역을 두었다(TRPO/PPO). LLM에서는 기준 모델 KL이 더해졌고, GRPO는 큰 critic을 버리고 같은 프롬프트의 여러 응답 평균을 baseline으로 쓴다.</p>
  </div>
  <div class="card">
    <h4>정규화 흐름 <a class="chip t" href="#theses--t5">T5</a></h4>
    <p style="display:flex;flex-wrap:wrap;gap:4px;align-items:center"><a class="chip" href="#qviews">Soft Q 2017</a>→<a class="chip" href="#maxent">SAC 2018</a>→<a class="chip" href="#rlhf">KL-RLHF</a>→<a class="chip" href="#dpo">DPO 2023</a>→<a class="chip" href="#test-time">BoN · 가치 유도</a></p>
    <p>최대 엔트로피 RL에서 "보상 + 엔트로피"의 해가 볼츠만 분포라는 것을 썼다. 엔트로피를 기준 모델에 대한 KL로 바꾸면 RLHF 목표가 되고, 그 닫힌 해를 뒤집으면 DPO가 된다. 같은 해를 추론 시점에 샘플링으로 근사하면 Best-of-N과 가치 유도 디코딩이다.</p>
  </div>
  <div class="card">
    <h4>상각 흐름 <a class="chip t" href="#theses--t9">T9</a> <a class="chip t" href="#theses--t2">T2</a></h4>
    <p style="display:flex;flex-wrap:wrap;gap:4px;align-items:center"><a class="chip" href="#modelbased">AlphaZero 2017</a>→<a class="chip" href="#memory">ExIt 2017</a>→<a class="chip" href="#memory">STaR · ReST</a>→<a class="chip" href="#memory">R1 증류 2025</a></p>
    <p>비싼 탐색으로 더 나은 행동을 찾고 정책에 증류한다. 바둑의 MCTS가 LLM에서는 "많이 뽑고 정답만 남기기"가 되었고, 긴 사고 사슬 모델은 탐색 자체를 한 샘플 안으로 흡수했다. 그 모델을 교사로 작은 모델에 증류하는 것이 같은 구조의 다음 층이다.</p>
  </div>
</div>
<div class="key"><span class="label">흐름을 관통하는 패턴</span>각 단계의 혁신은 거의 항상 다음 중 하나다. (1) 추정량을 바꿔 편향-분산을 옮긴다(T6). (2) 기준점과 정규화를 바꿔 한 번에 움직이는 거리를 통제한다(T4, T5, T7). (3) 데이터 출처를 바꾼다(on → replay → offline → 선호). (4) 개선 연산자를 바꾼다(탐욕 → 경사 → 탐색-증류, T2, T3, T9).</div>

<h2>하나의 식에서 갈라지는 개선 연산자</h2>
<p>네 흐름이 같은 뿌리라는 것은 수식으로 보일 수 있다. 출발점은 "추정한 가치를 높이되 기준 정책에서 멀어지지 말라"는 한 줄이다.</p>
<div data-w="fx-unify"></div>
<div data-w="step-unify"></div>
<div data-w="dv-unify"></div>
<div class="thesis-box"><span class="label">대전제 T5 · 통일된 개선 단계</span>
<p>무엇을 기준점(anchor)으로 두는가: 직전 정책이면 신뢰영역 방법(T4), 고정 기준 모델이면 RLHF/DPO(T5), 데이터의 행동 정책이면 오프라인 RL(T7). $\beta$를 얼마로 두는가: 0이면 탐욕 개선(T2), 크면 작은 자연 경사 스텝(T3, T4). $\hat Q$를 어떻게 추정하는가: MC, TD, GAE, 그룹 평균(T6). 해를 어떻게 정책에 넣는가: 경사로 직접, 또는 샘플을 만들어 증류(T9). 알고리즘 계보의 대부분은 이 네 선택의 조합이다.</p>
</div>

<h2>같은 문제, 네 개의 개선 연산자</h2>
<p>위 유도를 실제로 돌려 본다. 응답 12개 중 하나를 고르는 문제(보상은 0~1, 가장 좋은 응답은 기본 정책이 거의 내지 않는다)에서, 매 반복 현재 정책으로 $N$개를 샘플링하고 네 연산자로 정책을 갱신한다. 30번 독립 실행의 평균이다.</p>
<div data-w="ops-sim"></div>
<ul>
  <li><strong>탐욕(가치 기반):</strong> 본 적 있는 최고 응답으로 즉시 몰린다. 빠르지만, 기본 정책이 드물게 내는 최고 응답을 아직 못 봤다면 그 아래에서 멈춘다(탐험 문제, T7).</li>
  <li><strong>정책 경사(그룹 baseline):</strong> 경사에 $\pi(a)$가 곱해져 드문 좋은 응답은 천천히 올라간다. 가장 완만하고 안정적이다.</li>
  <li><strong>KL 미러 하강(자연 경사):</strong> advantage를 로짓에 직접 더해 드문 응답도 한 번 뽑히면 크게 움직인다. $\beta$가 한 스텝의 KL을 통제한다(T4, T5).</li>
  <li><strong>Best-of-N 증류:</strong> 배치 최고 응답을 SFT한다. 가장 빨리 날카로워지고 엔트로피가 가장 빨리 준다(T9). 다양성 소실의 대가를 오른쪽 그래프에서 확인하라.</li>
</ul>

<h2>알고리즘 조합기</h2>
<p>먼저 일상적인 질문 몇 개로 출발점을 찾고, 그 결과를 아래 조합기로 넘겨 세부 선택을 바꿔 보자.</p>
<div data-w="try-pick"></div>
<p>다섯 가지 설계 선택을 고르면, 그 조합에 가장 가까운 알려진 알고리즘과 그 조합에 따라오는 대전제, 그리고 알려진 위험을 보여 준다. 조합이 정확히 일치하는 알고리즘이 없으면, 그것은 아직 이름이 없는 설계일 수도 있다.</p>
<div data-w="combiner"></div>

<h2>새 RL 논문을 읽는 점검표</h2>
<ol>
  <li><strong>목표와 기준점:</strong> 무엇을 최대화하는가. KL·엔트로피·제약의 기준 분포는 무엇인가(직전 정책, 기준 모델, 데이터 행동 정책).</li>
  <li><strong>대전제:</strong> 핵심 유도가 기대는 것은 벨만 고정점(T1), 점수함수(T3), 성능 차이(T4), KL 닫힌 해(T5) 중 무엇인가.</li>
  <li><strong>바뀐 손잡이:</strong> 가장 가까운 선행 알고리즘에서 정확히 무엇 하나를 바꿨는가. 위 조합기로 위치를 찍어 보라.</li>
  <li><strong>추정량:</strong> advantage·타깃은 MC인가 부트스트랩인가. baseline이 있는가. 편향과 분산 중 무엇을 샀는가(T6).</li>
  <li><strong>데이터와 분포 불일치:</strong> 데이터는 누구의 정책에서 왔는가. importance ratio, clipping, 비관, KL 중 무엇으로 불일치를 다루는가.</li>
  <li><strong>평가자 착취 방지:</strong> 학습된 보상모델·PRM·Q를 최적화한다면, 그 오류를 착취하지 못하게 막는 장치는 무엇인가(T5, T8).</li>
  <li><strong>계산 회계:</strong> 기준선과 같은 샘플 수·FLOPs·KL에서 비교했는가. Best-of-N을 같은 KL의 기준선으로 두었는가.</li>
  <li><strong>평가:</strong> pass@1과 큰 $k$의 pass@k를 모두 보았는가. 시드 수와 분산, 구현 세부가 공개되었는가. 심층 RL에서는 시드와 구현 차이만으로 결론이 바뀔 수 있다(Henderson et al. 2018; Engstrom et al. 2020).</li>
</ol>

<h2>열린 문제</h2>
<div class="grid2">
  <div class="card"><h4>긴 지평의 신용 할당</h4><p>수천 토큰, 수십 번의 도구 호출 끝에 오는 보상 하나로 어떤 결정이 좋았는지 가려야 한다. LLM 규모의 가치 함수 학습은 여전히 어렵고, 과정 보상과 단계 가치의 신뢰성이 병목이다.</p></div>
  <div class="card"><h4>보상 명세와 확장 가능한 감독</h4><p>정답 확인이 쉬운 영역 밖(글쓰기, 연구, 장기 과제)에서는 보상모델이 프록시다. 사람이 직접 평가하기 어려운 출력을 어떻게 믿을 만하게 감독할지가 남아 있다.</p></div>
  <div class="card"><h4>언어 공간에서의 탐험</h4><p>LLM RL은 엔트로피 붕괴와 커버리지 천장을 자주 겪는다. 기본 모델이 거의 내지 않는 좋은 해를 찾는 원리적인 탐험 방법은 아직 정립되지 않았다.</p></div>
  <div class="card"><h4>일반화와 전이</h4><p>수학·코드에서 RL로 얻은 능력이 다른 영역으로 얼마나 전이되는지, 보상에 대한 과적합과 실제 능력 향상을 어떻게 구분할지가 활발히 연구된다.</p></div>
  <div class="card"><h4>표본·계산 효율</h4><p>on-policy LLM RL은 생성 비용이 크다. 비동기·off-policy 데이터 재사용은 효율을 높이지만 분포 불일치(T4, T8)를 다시 불러온다.</p></div>
  <div class="card"><h4>평가의 신뢰성</h4><p>작은 벤치마크, 데이터 오염, 시드 분산 때문에 작은 차이는 쉽게 사라진다. 어떤 지표(pass@1, pass@k, 신뢰도)가 실제 능력을 반영하는지도 질문으로 남아 있다.</p></div>
</div>

<h2>설계 선택 비교표</h2>
<div class="table-wrap"><table class="t">
<thead><tr><th>알고리즘</th><th>학습 대상</th><th>데이터</th><th>추정량</th><th>기준점 · 정규화</th><th>개선 연산자</th><th>대전제</th></tr></thead>
<tbody>
<tr><td><a href="#dp">가치 반복</a></td><td>V</td><td>모델</td><td>정확한 기댓값</td><td>—</td><td>탐욕</td><td>T1 T2</td></tr>
<tr><td><a href="#qlearning">Q-learning</a></td><td>Q</td><td>off-policy</td><td>TD</td><td>—</td><td>탐욕(max)</td><td>T1 T2</td></tr>
<tr><td><a href="#dqn">DQN</a></td><td>Q (신경망)</td><td>리플레이</td><td>TD</td><td>타깃망</td><td>탐욕</td><td>T1 T8</td></tr>
<tr><td><a href="#pg">REINFORCE</a></td><td>π</td><td>on-policy</td><td>MC</td><td>—</td><td>정책 경사</td><td>T3 T6</td></tr>
<tr><td><a href="#ac">A3C</a></td><td>π, V</td><td>on-policy</td><td>n-step</td><td>엔트로피</td><td>정책 경사</td><td>T3 T6</td></tr>
<tr><td><a href="#ppo">PPO</a></td><td>π, V</td><td>on-policy</td><td>GAE</td><td>ratio clip (직전 정책)</td><td>정책 경사</td><td>T3 T4 T6</td></tr>
<tr><td><a href="#maxent">SAC</a></td><td>π, Q</td><td>리플레이</td><td>TD</td><td>엔트로피</td><td>soft 정책 개선</td><td>T5 T8</td></tr>
<tr><td><a href="#offline">CQL / IQL</a></td><td>Q (+π)</td><td>고정 데이터</td><td>TD</td><td>비관 / 데이터 KL</td><td>탐욕 / 가중 회귀</td><td>T7 T8</td></tr>
<tr><td><a href="#modelbased">AlphaZero · MuZero</a></td><td>π, V (+모델)</td><td>자기 대국</td><td>MC / n-step</td><td>탐색 사전분포</td><td>탐색 + 증류</td><td>T2 T7 T9</td></tr>
<tr><td><a href="#sequence">Decision Transformer</a></td><td>π (시퀀스)</td><td>고정 데이터</td><td>return-to-go</td><td>—</td><td>조건부 모방</td><td>T6</td></tr>
<tr><td><a href="#rlhf">RLHF-PPO</a></td><td>π, V, RM</td><td>on-policy + 선호</td><td>GAE</td><td>기준 모델 KL + clip</td><td>정책 경사</td><td>T4 T5</td></tr>
<tr><td><a href="#dpo">DPO</a></td><td>π</td><td>선호 쌍 (고정)</td><td>—</td><td>기준 모델 (암묵적 KL)</td><td>닫힌 해 재매개화</td><td>T5</td></tr>
<tr><td><a href="#reasoning">GRPO</a></td><td>π</td><td>on-policy, 검증 보상</td><td>그룹 평균</td><td>기준 모델 KL + clip</td><td>정책 경사</td><td>T3 T4 T6</td></tr>
<tr><td><a href="#memory">STaR · ReST-EM</a></td><td>π</td><td>자기 생성 → 고정</td><td>이진 결과</td><td>기본 모델 재시작</td><td>필터 SFT (EM)</td><td>T5 T9</td></tr>
<tr><td><a href="#test-time">Best-of-N</a></td><td>— (추론 시점)</td><td>기준 정책 샘플</td><td>보상모델 점수</td><td>암묵적 KL ≤ log N</td><td>선택</td><td>T5 T9</td></tr>
</tbody></table></div>
`,
    mount: {
      'fx-unify': (el) => ui.formula(el, {
        title: '통일된 정책 개선 단계',
        say: '{new|다음 정책}은, {Q|각 행동의 예상 점수}가 높은 쪽으로 옮기되 {anc|기준이 되는 정책}에서 멀어지는 만큼 {b|벌점 계수}를 곱해 빼서 가장 좋은 분포를 찾고, 그것을 {proj|실제로 쓸 신경망 정책에 옮겨 담은} 것이다.',
        tex: R`\tm{new}{\pi_{k+1}} = \tm{proj}{\Pi_{\Theta}}\Big[\,\arg\max_{\pi}\; \mathbb{E}_{a\sim\pi}\big[\tm{Q}{\hat Q(s,a)}\big] \;-\; \tm{b}{\beta}\,\mathrm{KL}\big(\pi\,\|\,\tm{anc}{\pi_{\text{anchor}}}\big)\Big]`,
        terms: [
          { id: 'new', sym: R`\pi_{k+1}`, label: '다음 정책', desc: '한 번의 개선 결과.' },
          { id: 'proj', sym: R`\Pi_\Theta`, label: '투영', desc: '파라미터화된 정책 집합으로 넣는 방법.', long: R`정확한 해 $\pi_{\text{anchor}}e^{\hat Q/\beta}/Z$는 보통 신경망으로 바로 표현되지 않는다. 경사 몇 스텝으로 역방향 KL을 줄이면 정책 경사 계열(PPO, GRPO), 해에서 샘플을 만들어 순방향 KL(SFT)로 맞추면 탐색-증류 계열(AlphaZero, ReST, AWR), 해의 형태를 이용해 보상을 지우면 DPO가 된다.` },
          { id: 'Q', sym: R`\hat Q(s,a)`, label: '추정한 가치 / 이득', desc: 'MC, TD, GAE, 그룹 평균 등. 편향-분산이 여기서 정해진다(T6).', long: R`상수를 빼도 해가 같으므로(정규화 $Z$가 흡수) $\hat Q$ 대신 advantage $\hat A$를 써도 된다. baseline이 편향 없이 분산만 줄이는 이유를 이 식에서도 볼 수 있다. LLM에서는 보상모델 점수나 검증기 결과가 $\hat Q$ 자리에 들어간다.` },
          { id: 'b', sym: R`\beta`, label: '온도 = 스텝 크기의 역수', desc: '0이면 탐욕, 크면 기준점 근처의 작은 스텝.', long: R`$\beta\to0$: $\arg\max_a\hat Q$, 정책 반복(T2). $\beta$ 유한, 기준점이 직전 정책: 자연 정책 경사의 스텝 크기 $1/\beta$(T4). $\beta$는 "가치 추정을 얼마나 믿는가"의 표현이기도 하다. 추정이 불확실하면 크게 둔다.` },
          { id: 'anc', sym: R`\pi_{\text{anchor}}`, label: '기준점', desc: '직전 정책 / 기준 모델 / 데이터 행동 정책.', easy: '"여기서 너무 멀어지지 마라"의 여기. 어제의 나, 처음 받은 모델, 남이 남긴 기록 중 무엇을 고르느냐가 알고리즘 가족을 가른다.', long: R`직전 정책 $\pi_k$이면 신뢰영역(TRPO, PPO, MPO), 고정된 $\pi_{\text{ref}}$이면 RLHF·DPO·Best-of-N, 오프라인 데이터의 $\pi_\beta$이면 AWR·IQL·BRAC 같은 오프라인 RL. 같은 식이 기준점 하나로 세 분야를 가른다.` },
        ],
      }),
      'dv-unify': (el) => ui.derivation(el, {
        title: '한 줄에서 갈라지는 다섯 계열',
        easy: '"예상 점수가 높은 쪽으로, 단 기준에서 너무 멀지 않게"를 풀면 "기준 확률 × exp(예상 점수 ÷ 온도)"가 나온다. 온도를 0으로 보내면 1등만 고르는 탐욕, 기준을 어제의 정책으로 두면 PPO류, 원래 모델로 두면 RLHF와 DPO, 남이 모은 데이터로 두면 오프라인 RL, 이 답에서 샘플을 만들어 따라 하면 탐색-증류가 된다.',
        steps: [
          { tex: R`\pi_{k+1}(\cdot|s) = \arg\max_{\pi}\;\mathbb{E}_{a\sim\pi}\big[\hat Q(s,a)\big] - \beta\,\mathrm{KL}\big(\pi\,\|\,\pi_{\text{anchor}}\big)`, why: R`상태마다 독립인 볼록 문제다(엔트로피 항 때문에 엄격 오목).` },
          { tex: R`\pi_{k+1}(a|s) = \frac{\pi_{\text{anchor}}(a|s)\,\exp\big(\hat Q(s,a)/\beta\big)}{Z(s)}`, why: R`라그랑주 승수로 정규화 제약을 넣어 미분하면 나오는 볼츠만 재가중(T5). 이후 단계는 이 해의 특수한 경우들이다.` },
          { tex: R`\beta\to0:\quad \pi_{k+1}(a|s) = \hl{\mathbb{1}\big[a = \arg\max_{a'}\hat Q(s,a')\big]}`, why: R`<strong>탐욕 개선</strong>. $\hat Q=Q^{\pi_k}$이면 정책 반복(T2), $\hat Q$가 $Q^*$의 TD 추정이면 Q-learning·DQN 계열.` },
          { tex: R`\pi_{\text{anchor}}=\pi_k=\mathrm{softmax}(\theta_k):\quad \hl{\theta_{k+1} = \theta_k + \hat Q/\beta}`, why: R`표 형태 softmax 정책에서는 해가 로짓 덧셈과 정확히 같다. 이것은 스텝 크기 $1/\beta$의 <strong>자연 정책 경사</strong>다(Kakade 2001; 표 형태 softmax에서의 정확한 대응은 Agarwal et al. 2021). TRPO와 PPO는 함수근사에서 이 스텝을 KL 제약과 clipping으로 근사한다(T4).`, easy: '확률을 직접 곱하는 대신 "점수표"(로짓)에 예상 점수를 더하는 것과 같다. 정책 경사를 가장 잘 정리한 형태가 바로 이것이다.' },
          { tex: R`\pi_{\text{anchor}}=\pi_{\text{ref}},\ \hat Q = r(x,y):\quad \pi^*(y|x) \propto \pi_{\text{ref}}(y|x)\,e^{\hl{r(x,y)/\beta}}`, why: R`기준점을 고정하고 시퀀스 보상을 쓰면 <strong>RLHF 목표의 최적해</strong>. 이 식을 $r$에 대해 풀면 $r=\beta\log\frac{\pi^*}{\pi_{\text{ref}}}+\beta\log Z$이고, 이를 Bradley-Terry 우도에 넣으면 DPO다(<a href="#dpo">20장</a>). 샘플로 근사하면 Best-of-N(<a href="#test-time">22장</a>).` },
          { tex: R`\pi_{\text{anchor}}=\pi_\beta\ (\text{데이터}):\quad \pi_{k+1}(a|s)\propto\pi_\beta(a|s)\,e^{\hl{\hat A(s,a)/\beta}}`, why: R`데이터의 행동 정책을 기준점으로 두면 <strong>advantage 가중 회귀</strong>(AWR, AWAC, IQL의 정책 추출). 데이터 밖으로 나가지 않는 것 자체가 비관적 정규화다(T7, <a href="#offline">15장</a>).` },
          { tex: R`\theta_{k+1} = \arg\min_\theta\;\mathbb{E}_{s}\Big[\mathrm{KL}\big(\hl{\pi_{k+1}(\cdot|s)}\,\|\,\pi_\theta(\cdot|s)\big)\Big]`, why: R`해를 정확히 표현할 수 없을 때, 해에서 샘플(MCTS 방문, Best-of-N 최고, 정답 필터)을 만들어 SFT로 맞추면 <strong>탐색-증류</strong>(T9). 해의 샘플을 얻는 비용이 바로 "탐색 비용"이고, 학습은 그것을 상각한다.` },
        ],
      }),
      'step-unify': (el) => ui.walkthrough(el, {
        title: '숫자로 한 번: 기준 확률 × exp(점수 ÷ 온도)',
        caption: R`"다음 단계"를 눌러 계산한다. 행동 A, B, C의 기준 확률이 0.5, 0.3, 0.2이고 예상 점수가 1, 2, 0, 온도는 $\beta=1$이다. $e\approx2.718$, $e^2\approx7.389$를 쓴다.`,
        steps: [
          { say: R`A의 새 가중치는 기준 확률 × $e^{\text{점수}/\beta}$ $= 0.5\times e^{1}$이다. 얼마인가?`, ask: { answer: 1.359, tol: 0.005 }, calc: R`0.5\times2.718 = 1.359` },
          { say: R`B의 가중치 $0.3\times e^{2}$는?`, ask: { answer: 2.217, tol: 0.005 }, calc: R`0.3\times7.389 = 2.217` },
          { say: R`C의 가중치 $0.2\times e^{0}$은? ($e^0 = 1$)`, ask: { answer: 0.2, tol: 0.001 }, calc: R`0.2\times1 = 0.2` },
          { say: '가중치를 모두 더한 값으로 나누면 확률이 된다. B의 새 확률은?', ask: { answer: 0.587, tol: 0.005 }, calc: R`\frac{2.217}{1.359+2.217+0.2} = \frac{2.217}{3.776} \approx 0.587\qquad(A\approx0.360,\ C\approx0.053)` },
          { say: '기준 확률이 0.3이던 B가 점수가 가장 높아 0.587로 올랐다. 온도를 0.1로 낮추면 B가 거의 1이 되고(1등만 고르는 탐욕), 10으로 높이면 기준 확률과 거의 같다(아주 조금만 바꿈). 온도 하나가 "예상 점수를 얼마나 믿고 과감하게 바꿀지"를 정한다.', calc: R`\beta=0.1:\ (0.000,\ 1.000,\ 0.000)\qquad \beta=10:\ (0.494,\ 0.327,\ 0.179)` },
        ],
      }),
      'try-pick': mountPick,
      'ops-sim': mountOps,
      combiner: mountCombiner,
    },
    tacit: [
      { tag: 'research', t: '부품을 뺐다는 주장에는 "그 역할은 어디로 갔나"를 물어라',
        d: R`<p>GRPO는 critic을 없앴지만 그 역할(baseline)은 같은 프롬프트의 여러 응답으로 옮겨 갔고, 그래서 프롬프트당 다수 샘플이 필수가 됐다. DPO는 보상모델과 RL 루프를 없앴지만 보상은 정책의 로그비 $\beta\log\pi/\pi_{\text{ref}}$로 숨었고, 샘플링이 고정 데이터셋으로 옮겨 가 오프라인 RL의 분포 이동 문제를 물려받았다. 기준 모델을 없앤 방법(SimPO 등)은 정규화를 길이 정규화와 마진 같은 다른 형태로 다시 넣는다. 사라진 부품은 대개 다른 곳에서 다른 비용으로 다시 나타난다.</p>` },
      { tag: 'math', t: '거의 모든 안정화 기법은 신뢰영역의 변장이다',
        d: R`<p>타깃 네트워크(가치의 느린 기준점), Polyak 평균, PPO의 ratio clip, KL 페널티, 작은 학습률, SFT의 조기 종료, 리플레이 비율 제한. 모두 "한 번의 갱신이 기준점에서 얼마나 멀어질 수 있는가"를 제한한다(T4). 그래서 어떤 방법이 불안정하면 가장 먼저 "이 방법의 기준점은 어디이고, 거리를 무엇으로 재는가"를 물으면 된다. 반대로 새 안정화 기법은 대개 기존 기준점을 다른 거리로 재는 변형이다.</p>` },
      { tag: 'math', t: '분산 감소는 어디서나 제어 변수(control variate)다',
        d: R`<p>REINFORCE의 baseline, advantage, GAE, GRPO의 그룹 평균, RLOO의 leave-one-out, 오프라인 평가의 doubly robust 추정량. 모두 "기댓값을 아는(대개 0인) 양 중에서 추정치와 상관이 높은 것을 빼는" 같은 기법이다. 최적 제어 변수 계수는 공분산/분산이고, 그래서 baseline으로 가치 함수가 좋은 이유(리턴과 상관이 높음)도, 그룹 평균이 좋은 이유(같은 프롬프트 난이도를 공유)도 같은 문장으로 설명된다.</p>` },
      { tag: 'algo', t: 'off-policy 문제는 "누구의 분포에서 평균을 내는가"의 문제다',
        d: R`<p>기대값을 행동 정책 $\mu$의 표본으로 목표 정책 $\pi$에 대해 내려면 비율 $\pi/\mu$가 필요하다. 이 비율이 PPO의 ratio, IMPALA의 V-trace(Espeholt et al. 2018), Retrace(Munos et al. 2016), 오프라인 평가에 공통으로 등장한다. 지평 $H$에 걸친 비율의 곱은 분산이 지수적으로 커지므로, 모든 실용 알고리즘은 비율을 자르거나(clip, truncation) 한 스텝으로 제한한다. 이것은 다시 T6의 편향-분산 거래다.</p>` },
      { tag: 'practice', t: '구현 세부가 알고리즘 차이를 압도할 수 있다',
        d: R`<p>Engstrom et al.(2020)은 PPO가 TRPO보다 나은 성능의 상당 부분이 코드 수준의 최적화(보상 정규화, 가치 clipping, 학습률 감쇠 등)에서 온다고 보고했다. Henderson et al.(2018)은 시드와 구현만 바꿔도 알고리즘 순위가 바뀔 수 있음을 보였다. 논문의 이득이 작으면 먼저 "같은 계산, 같은 튜닝 노력, 충분한 시드에서 비교했는가"를 확인하라.</p>` },
      { tag: 'research', t: 'RL은 싸고 믿을 만한 보상이 있는 곳으로 이동한다',
        d: R`<p>추론 RL이 급격히 발전한 이유는 알고리즘보다 보상에 있다. 수학 정답 확인, 단위 테스트 실행처럼 검증이 생성보다 쉬운 영역에서는 보상 해킹 위험이 낮고 신호가 정확하다. 그래서 다음 확장의 병목은 알고리즘보다 <strong>환경과 검증기</strong>다. 새 영역에서 RL을 고려할 때 첫 질문은 "검증기가 있는가, 그것을 착취할 수 있는가"다.</p>` },
      { tag: 'math', t: 'β는 "가치 추정을 얼마나 믿는가"의 다른 이름이다',
        d: R`<p>통일된 개선식에서 $\beta\to0$은 추정한 $\hat Q$를 완전히 믿고 argmax를 취하는 것이고, $\beta$가 크면 기준점 근처에 머문다. 추정이 정확하면 탐욕이 최선이지만, 잡음이 있으면 max가 잡음을 착취한다(T8). 그래서 데이터가 적은 오프라인 RL, 보상모델이 프록시인 RLHF, 검증기가 불완전한 탐색에서는 큰 $\beta$(강한 정규화)가 안전하다. 정규화 강도는 미학이 아니라 추정 불확실성에 대한 베이즈적 판단이다.</p>` },
    ],
    quiz: [
      { q: '통일된 개선식 $\\pi_{k+1}\\propto\\pi_{\\text{anchor}}e^{\\hat Q/\\beta}$에서 $\\beta\\to0$은 무엇에 해당하는가?', options: ['자연 정책 경사', '탐욕적 정책 개선 (정책 반복)', 'DPO', '행동 복제'], answer: 1,
        explain: '온도가 0으로 가면 볼츠만 분포가 argmax로 수렴한다. $\\hat Q=Q^{\\pi_k}$이면 정책 반복의 개선 단계다.' },
      { q: 'GRPO가 critic을 제거했을 때 그 역할(baseline)을 대신하는 것은?', options: ['보상모델', '기준 모델 KL', '같은 프롬프트에서 뽑은 여러 응답의 평균 보상', '리플레이 버퍼'], answer: 2,
        explain: '그룹 평균은 같은 프롬프트의 난이도를 공유하므로 좋은 제어 변수다. 대신 프롬프트당 여러 샘플이 필요하다.' },
      { q: '기준점 $\\pi_{\\text{anchor}}$를 데이터셋의 행동 정책으로 둘 때 얻는 계열은?', options: ['PPO', 'AWR / IQL의 정책 추출', 'Q-learning', 'MCTS'], answer: 1,
        explain: '$\\pi\\propto\\pi_\\beta e^{A/\\beta}$는 advantage 가중 회귀다. 데이터 지지집합 안에 머무는 것이 오프라인 RL의 비관적 정규화 역할을 한다.' },
      { q: '타깃 네트워크, PPO clip, KL 페널티가 공유하는 원리는?', options: ['탐험 보너스', '한 번의 갱신이 기준점에서 멀어지는 거리를 제한하는 신뢰영역', '분포형 가치 학습', '보상 정규화'], answer: 1,
        explain: '모두 갱신 폭을 기준점 근처로 제한해 추정 오차가 증폭되는 것을 막는다(T4).' },
    ],
  });

  function div(parent, cls) {
    const d = document.createElement('div');
    if (cls) d.className = cls;
    parent.appendChild(d);
    return d;
  }

  /* ---------- 네 연산자 비교 ---------- */
  function mountOps(el) {
    const K = 12;
    const p = ui.panel(el, { kind: 'SIM', title: '탐욕 · 정책 경사 · KL 미러 하강 · Best-of-N 증류',
      caption: R`"새 문제"를 눌러 보상 배치를 바꿔 가며, 왼쪽 그래프에서 어느 방법이 최고 보상 점선에 가장 빨리 닿는지, 오른쪽 그래프에서 어느 쪽 엔트로피(다양성)가 가장 빨리 떨어지는지 보라. 관측 보상 = 실제 보상 + $\mathcal N(0,\sigma^2)$. 탐욕: 본 응답의 평균 보상 $\hat Q$에 대해 90% argmax + 10% 기본 정책. 정책 경사: $\theta \mathrel{+}= \eta\,\frac1N\sum_i (r_i-\bar r)(e_{a_i}-\pi)$. KL 미러 하강: 이번 배치에 나온 응답마다 $\theta_a \mathrel{+}= (\bar r_a-\bar r)/\beta$. BoN 증류: 배치 최고 응답에 SFT 3스텝.` });
    const ctr = ui.row(p.body);
    const nS = ui.slider(ctr, { label: R`반복당 샘플 $N$`, min: 2, max: 32, step: 1, value: 8, format: ui.fmt.int, onInput: run });
    const tS = ui.slider(ctr, { label: '반복 수', min: 10, max: 80, step: 5, value: 40, format: ui.fmt.int, onInput: run });
    const sS = ui.slider(ctr, { label: R`보상 잡음 $\sigma$`, min: 0, max: 0.5, step: 0.02, value: 0.1, format: ui.fmt.f(2), onInput: run });
    const bS = ui.slider(ctr, { label: R`미러 하강 $\beta$`, min: 0.05, max: 1, step: 0.05, value: 0.25, format: ui.fmt.f(2), onInput: run });
    const btns = ui.row(p.body, 'btns');
    let seed = 1;
    ui.button(btns, '새 문제', () => { seed++; run(); });
    const OPS = [
      { key: 'greedy', name: '탐욕 (가치 기반)', color: 'c2' },
      { key: 'pg', name: '정책 경사 (그룹 baseline)', color: 'c1' },
      { key: 'md', name: 'KL 미러 하강 (자연 경사)', color: 'c3' },
      { key: 'bon', name: 'Best-of-N 증류', color: 'c4' },
    ];
    const st = ui.stats(p.body, [{ key: 'max', label: R`최고 보상 / 기본 $\mathbb{E}[r]$` }].concat(OPS.map((o) => ({ key: o.key, label: o.name + ' 최종 E[r]' }))));
    const split = div(p.body, 'w-split');
    const c1 = plot.line(div(split), { height: 250, x: { label: '반복', min: 0 }, y: { label: '실제 기대 보상 E_π[r]' }, series: [] });
    const c2 = plot.line(div(split), { height: 250, x: { label: '반복', min: 0 }, y: { label: '엔트로피 H(π) [nats]', min: 0 }, series: [] });

    function problem() {
      const r = sim.rng(seed * 104729 + 7);
      const rew = sim.range(K).map(() => r());
      const lg = sim.range(K).map(() => r.normal() * 1.5);
      const b = sim.argmax(rew);
      const order = sim.range(K).sort((i, j) => lg[i] - lg[j]);
      const low = order[2];
      const tmp = lg[b]; lg[b] = lg[low]; lg[low] = tmp;
      return { rew, lg };
    }
    function run() {
      const pr = problem();
      const pi0 = sim.softmax(pr.lg);
      const N = nS.get(), T = tS.get(), sg = sS.get(), beta = bS.get();
      const RUNS = 30;
      const er = (pi) => sim.sum(pi.map((x, k) => x * pr.rew[k]));
      const acc = OPS.map(() => ({ r: new Array(T + 1).fill(0), h: new Array(T + 1).fill(0) }));
      for (let run = 0; run < RUNS; run++) {
        OPS.forEach((op, oi) => {
          const r = sim.rng(seed * 31 + run * 977 + oi * 13);
          let th = pr.lg.slice();
          const qs = new Array(K).fill(0), qn = new Array(K).fill(0);
          const pol = () => {
            if (op.key !== 'greedy') return sim.softmax(th);
            let best = -1, bv = -Infinity;
            for (let k = 0; k < K; k++) if (qn[k] && qs[k] / qn[k] > bv) { bv = qs[k] / qn[k]; best = k; }
            if (best < 0) return pi0.slice();
            return pi0.map((x, k) => 0.1 * x + (k === best ? 0.9 : 0));
          };
          for (let t = 0; t <= T; t++) {
            const pi = pol();
            acc[oi].r[t] += er(pi);
            acc[oi].h[t] += sim.entropy(pi);
            if (t === T) break;
            const a = [], o = [];
            for (let i = 0; i < N; i++) { const k = r.choice(pi); a.push(k); o.push(pr.rew[k] + sg * r.normal()); }
            const mb = sim.mean(o);
            if (op.key === 'greedy') {
              a.forEach((k, i) => { qs[k] += o[i]; qn[k]++; });
            } else if (op.key === 'pg') {
              const g = new Array(K).fill(0);
              a.forEach((k, i) => { const A = o[i] - mb; for (let j = 0; j < K; j++) g[j] += A * ((j === k ? 1 : 0) - pi[j]); });
              for (let j = 0; j < K; j++) th[j] += (4 * g[j]) / N;
            } else if (op.key === 'md') {
              const s = new Array(K).fill(0), c = new Array(K).fill(0);
              a.forEach((k, i) => { s[k] += o[i]; c[k]++; });
              for (let j = 0; j < K; j++) if (c[j]) th[j] += (s[j] / c[j] - mb) / beta;
            } else {
              let bi = 0;
              o.forEach((x, i) => { if (x > o[bi]) bi = i; });
              for (let g = 0; g < 3; g++) { const q = sim.softmax(th); for (let j = 0; j < K; j++) th[j] += 0.5 * ((j === a[bi] ? 1 : 0) - q[j]); }
            }
          }
        });
      }
      const rmax = Math.max(...pr.rew);
      st.set('max', rmax.toFixed(3) + ' / ' + er(pi0).toFixed(3));
      OPS.forEach((o, oi) => st.set(o.key, (acc[oi].r[T] / RUNS).toFixed(3)));
      c1.update({
        x: { label: '반복', min: 0, max: T },
        series: OPS.map((o, oi) => ({ name: o.name, color: o.color, data: acc[oi].r.map((v, t) => [t, v / RUNS]) })),
        hlines: [{ y: rmax, label: '최고 응답의 보상' }],
      });
      c2.update({
        x: { label: '반복', min: 0, max: T },
        series: OPS.map((o, oi) => ({ name: o.name, color: o.color, data: acc[oi].h.map((v, t) => [t, v / RUNS]) })),
      });
    }
    run();
  }

  /* ---------- TRY: 질문으로 알고리즘 찾기 ---------- */
  let combinerApi = null;
  const FLOW = {
    q1: { q: '새로 시도해 보는 것이 싸고 쉬운가요? 원하는 만큼 다시 해 볼 수 있다면 "예".', yes: 'q2', no: 'q2b' },
    q2: { q: '시도할 때마다 몇 점인지 자동으로 매길 수 있나요? 정답 확인, 게임 점수, 테스트 통과처럼.', yes: 'q3', no: 'q3b' },
    q3: { q: '행동하기 전에 결과를 미리 따져 볼 수 있는 규칙이 있나요? 바둑 규칙이나 정확한 시뮬레이터처럼.', yes: 'L_search', no: 'q4' },
    q4: { q: '만들어 내는 것이 LLM이 쓰는 글(답변)인가요?', yes: 'L_grpo', no: 'L_ppo' },
    q3b: { q: '결과 두 개를 보여 주면 어느 쪽이 나은지는 사람이나 AI가 고를 수 있나요?', yes: 'L_rlhf', no: 'L_reward' },
    q2b: { q: '이미 모아 둔 기록(로그)이 있나요?', yes: 'q3c', no: 'L_infer' },
    q3c: { q: '기록마다 얼마나 잘했는지 점수가 붙어 있나요?', yes: 'L_offline', no: 'q4c' },
    q4c: { q: '기록이 "두 답 중 이쪽이 낫다"는 비교 형태인가요?', yes: 'L_dpo', no: 'L_bc' },
  };
  const LEAF = {
    L_search: { name: '탐색 + 증류 (MCTS, AlphaZero)', ch: 'modelbased', why: '규칙을 알면 실제로 해 보기 전에 여러 수를 미리 읽어 볼 수 있다. 읽어서 찾은 좋은 수를 정책에 외우게 하면 다음엔 빨리 둔다.', warn: '규칙(시뮬레이터)이 실제와 다르면 미리 읽은 수가 엉뚱해진다.', cfg: { learn: 'pi', data: 'model', est: 'mc', reg: 'any', imp: 'search' }, more: [['memory', '경험의 기억과 상각']] },
    L_grpo: { name: 'GRPO · RLOO (자동 채점 + 정책 경사)', ch: 'reasoning', why: '같은 질문에 답을 여러 개 써 보고, 평균보다 잘한 답은 더 자주, 못한 답은 덜 쓰게 한다. 점수를 자동으로 매기니 사람 손이 거의 들지 않는다.', warn: '정답률이 0%이거나 100%인 질문에서는 배울 것이 없다. 원래 모델에서 너무 멀어지지 않게 KL을 둔다.', cfg: { learn: 'pi', data: 'on', est: 'group', reg: 'kl', imp: 'pg' }, more: [['test-time', '추론 시점 탐색']] },
    L_ppo: { name: 'PPO (안정적) · SAC나 DQN (경험 재사용)', ch: 'ppo', why: '많이 시도해 볼 수 있고 점수도 있으면 표준 온라인 RL이 맞다. PPO는 비교적 다루기 쉽고, 시도가 비싸면 지난 경험을 다시 쓰는 SAC(연속적인 조작)나 DQN(몇 개 중 선택)이 효율적이다.', warn: '지난 경험을 재사용하는 방법은 학습이 흔들릴 수 있다(deadly triad).', cfg: { learn: 'pi', data: 'on', est: 'nstep', reg: 'trust', imp: 'pg' }, more: [['maxent', 'SAC'], ['dqn', 'DQN']] },
    L_rlhf: { name: 'RLHF (비교로 채점기 학습 + PPO)', ch: 'rlhf', why: '점수를 직접 매기기 어려워도 둘 중 나은 쪽은 고를 수 있다. 그 비교로 채점기를 만들고, 채점기 점수를 올리도록 학습한다.', warn: '채점기는 사람의 판단을 흉내 낸 것이라, 너무 세게 밀어붙이면 채점기의 허점을 파고든다.', cfg: { learn: 'pi', data: 'pref', est: 'nstep', reg: 'kl', imp: 'pg' }, more: [['dpo', 'DPO']] },
    L_reward: { name: '먼저 점수(보상)부터 정하기', ch: 'mdp', why: '좋고 나쁨을 숫자로도, 비교로도 말할 수 없다면 강화학습이 높일 대상이 없다. 목표를 점수로 바꾸는 일이 첫 단계다.', warn: '대충 만든 점수는 의도와 다른 행동을 낳는다(보상 해킹).', cfg: null, more: [['rlhf', '보상모델']] },
    L_infer: { name: '학습 없이 추론 시점에 계산 쓰기 (Best-of-N, 다수결, 외부 기억)', ch: 'test-time', why: '새로 시도하기도 어렵고 기록도 없다면, 지금 모델을 그대로 두고 답을 여러 번 뽑아 고르거나 과거 실수를 메모로 참고하는 편이 현실적이다.', warn: '고르는 기준(채점기, 다수결)이 틀리면 결과도 같은 방향으로 틀린다.', cfg: { learn: 'none', data: 'on', est: 'any', reg: 'any', imp: 'search' }, more: [['memory', '외부 기억']] },
    L_offline: { name: '오프라인 RL (CQL, IQL)', ch: 'offline', why: '점수가 붙은 기록만으로 더 나은 방식을 찾는다. 기록에 없는 행동은 모르는 것이니 비관적으로 다룬다.', warn: '기록에 없는 행동을 좋다고 착각하면 실제로 써 볼 때 크게 실패한다.', cfg: { learn: 'val', data: 'offline', est: 'td', reg: 'pess', imp: 'greedy' }, more: [['sequence', 'Decision Transformer']] },
    L_dpo: { name: 'DPO 계열 (비교 기록으로 바로 학습)', ch: 'dpo', why: '"이쪽이 낫다"는 비교 기록만 있으면 채점기와 RL 반복 없이 분류 문제처럼 바로 학습할 수 있다.', warn: '기록 밖의 답에 대해서는 배우지 못하고, 길이 같은 겉모습 차이를 배울 수도 있다.', cfg: { learn: 'pi', data: 'pref', est: 'none', reg: 'kl', imp: 'closed' }, more: [['rlhf', 'RLHF']] },
    L_bc: { name: '행동 복제 (잘한 기록만 골라 따라 하기) · Decision Transformer', ch: 'sequence', why: '점수도 비교도 없다면 믿을 만한 기록을 골라 그대로 따라 하는 것이 가장 안전한 출발점이다.', warn: '기록을 남긴 사람보다 잘하기는 어렵고, 기록에 없는 상황에서 실수가 쌓인다.', cfg: { learn: 'pi', data: 'offline', est: 'none', reg: 'none', imp: 'wsft' }, more: [['offline', '오프라인 RL']] },
  };

  function mountPick(el) {
    const p = ui.panel(el, { kind: 'TRY', title: '내 문제에는 어떤 알고리즘이 맞을까',
      caption: '질문에 "예" 또는 "아니오"를 눌러 답하라. 많아야 네 번이면 추천이 나오고, "조합기에서 보기"를 누르면 아래 조합기가 그 설정으로 바뀐다.' });
    const trail = div(p.body);
    const box = div(p.body);
    const nav = ui.row(p.body, 'btns');
    let path = [];
    ui.button(nav, '한 단계 뒤로', () => { path.pop(); draw(); });
    ui.button(nav, '처음부터', () => { path = []; draw(); });
    function node() {
      let k = 'q1';
      path.forEach((a) => { k = FLOW[k][a ? 'yes' : 'no']; });
      return k;
    }
    function draw() {
      const k = node();
      let cur = 'q1';
      trail.innerHTML = path.length ? '<ol style="margin:0;padding-left:1.4em;font-size:var(--fs-sm);color:var(--muted)">' + path.map((a) => {
        const li = '<li>' + FLOW[cur].q + ' <strong style="color:var(--ink)">' + (a ? '예' : '아니오') + '</strong></li>';
        cur = FLOW[cur][a ? 'yes' : 'no'];
        return li;
      }).join('') + '</ol>' : '';
      box.innerHTML = '';
      if (FLOW[k]) {
        const q = document.createElement('p');
        q.className = 'pr-q';
        q.textContent = '질문 ' + (path.length + 1) + '. ' + FLOW[k].q;
        box.appendChild(q);
        const row = ui.row(box, 'btns');
        ui.button(row, '예', () => { path.push(true); draw(); }, { primary: true });
        ui.button(row, '아니오', () => { path.push(false); draw(); });
        return;
      }
      const L = LEAF[k];
      const card = document.createElement('div');
      card.className = 'key';
      card.innerHTML = '<span class="label">추천</span><p style="margin:0 0 6px;font-weight:600"><a href="#' + L.ch + '">' + L.name + '</a> <span class="mono" style="font-size:var(--fs-xs)">' + RL.meta[L.ch].no + '장</span></p>' +
        '<p style="margin:4px 0">' + L.why + '</p><p style="margin:4px 0;color:var(--muted)"><strong>조심할 점:</strong> ' + L.warn + '</p>' +
        '<p style="margin:4px 0;font-size:var(--fs-sm)">함께 볼 장: ' + L.more.map((m) => '<a href="#' + m[0] + '">' + RL.meta[m[0]].no + ' ' + m[1] + '</a>').join(', ') + '</p>';
      box.appendChild(card);
      if (L.cfg) {
        const row = ui.row(box, 'btns');
        ui.button(row, '조합기에서 보기', () => { if (combinerApi) combinerApi.set(L.cfg); }, { primary: true });
      }
    }
    draw();
  }

  /* ---------- 알고리즘 조합기 ---------- */
  const DIMS = [
    { key: 'learn', label: '무엇을 학습하나', opts: [['any', '상관없음'], ['val', '가치 V/Q'], ['pi', '정책 π'], ['model', '환경 모델'], ['none', '학습 없음 (추론 시점 · 외부 기억)']] },
    { key: 'data', label: '데이터는 어디서', opts: [['any', '상관없음'], ['on', 'on-policy (현재 정책)'], ['off', 'off-policy (리플레이 등)'], ['offline', '고정 데이터셋 (offline)'], ['pref', '선호 비교 데이터'], ['model', '모델 · 시뮬레이터로 계획']] },
    { key: 'est', label: '가치 · 이득 추정량', opts: [['any', '상관없음'], ['mc', '몬테카를로 (리턴)'], ['td', 'TD (1-step 부트스트랩)'], ['nstep', 'n-step · λ · GAE'], ['group', '그룹 / leave-one-out baseline'], ['exact', '정확한 기댓값 (모델)'], ['none', '추정 없음']] },
    { key: 'reg', label: '정규화 · 기준점', opts: [['any', '상관없음'], ['none', '없음'], ['ent', '엔트로피'], ['kl', '기준 정책에 대한 KL'], ['trust', '신뢰영역 · clip'], ['pess', '비관 (데이터 밖 억제)']] },
    { key: 'imp', label: '개선 연산자', opts: [['any', '상관없음'], ['greedy', '탐욕 (argmax Q)'], ['pg', '정책 경사'], ['wsft', '가중 · 필터 회귀 (SFT)'], ['search', '탐색 (+ 증류)'], ['closed', '닫힌 해 재매개화']] },
  ];
  const A = (n, ch, y, learn, data, est, reg, imp, note) => ({ n, ch, y, learn, data, est, reg, imp, note });
  const ALGS = [
    A('가치 반복 · 정책 반복', 'dp', '1957–60', ['val'], ['model'], ['exact'], ['none'], ['greedy'], '모델을 알고 벨만 백업을 정확히 계산한다.'),
    A('MC 제어', 'td', '—', ['val'], ['on'], ['mc'], ['none'], ['greedy'], '에피소드 리턴 평균으로 Q를 평가하고 ε-탐욕으로 개선.'),
    A('SARSA', 'qlearning', '1994', ['val'], ['on'], ['td'], ['none'], ['greedy'], '실제로 고른 다음 행동으로 부트스트랩하는 on-policy TD 제어.'),
    A('Q-learning', 'qlearning', '1989', ['val'], ['off'], ['td'], ['none'], ['greedy'], 'max 타깃으로 행동 정책과 무관하게 Q*를 학습.'),
    A('Soft Q-learning', 'qviews', '2017', ['val'], ['off'], ['td'], ['ent'], ['greedy'], 'max를 log-sum-exp로 바꾼 엔트로피 정규화 Q 학습.'),
    A('DQN · Double DQN', 'dqn', '2015', ['val'], ['off'], ['td'], ['none'], ['greedy'], '신경망 Q + 리플레이 + 타깃망, Double은 선택·평가 분리.'),
    A('Rainbow · C51', 'dqn', '2017–18', ['val'], ['off'], ['nstep'], ['none'], ['greedy'], 'n-step, 분포형 가치, 우선순위 리플레이 등을 결합.'),
    A('REINFORCE', 'pg', '1992', ['pi'], ['on'], ['mc'], ['none'], ['pg'], '리턴을 그대로 쓰는 점수함수 경사.'),
    A('A2C · A3C', 'ac', '2016', ['pi', 'val'], ['on'], ['nstep'], ['ent'], ['pg'], 'critic의 n-step advantage, 병렬 actor, 엔트로피 보너스.'),
    A('TRPO', 'ppo', '2015', ['pi', 'val'], ['on'], ['nstep'], ['trust', 'kl'], ['pg'], 'KL 제약 아래 대리 목표를 최대화하는 자연 경사.'),
    A('PPO', 'ppo', '2017', ['pi', 'val'], ['on'], ['nstep'], ['trust', 'ent'], ['pg'], 'ratio clipping으로 1차 최적화만으로 신뢰영역을 흉내.'),
    A('DDPG · TD3', 'maxent', '2015–18', ['pi', 'val'], ['off'], ['td'], ['none'], ['pg'], '결정적 정책 경사. TD3는 twin Q, 지연 갱신, 타깃 스무딩.'),
    A('SAC', 'maxent', '2018', ['pi', 'val'], ['off'], ['td'], ['ent'], ['pg'], '최대 엔트로피 목표의 soft actor-critic, 자동 온도 조절.'),
    A('행동 복제 (BC)', 'offline', '—', ['pi'], ['offline'], ['none'], ['none'], ['wsft'], '데이터의 행동을 그대로 모방.'),
    A('BCQ', 'offline', '2019', ['val', 'pi'], ['offline'], ['td'], ['pess'], ['greedy'], '데이터에 가까운 행동만 후보로 제한하는 오프라인 Q.'),
    A('CQL', 'offline', '2020', ['val'], ['offline'], ['td'], ['pess'], ['greedy'], '데이터 밖 행동의 Q를 끌어내리는 보수적 페널티.'),
    A('IQL', 'offline', '2021', ['val', 'pi'], ['offline'], ['td'], ['pess', 'kl'], ['wsft'], 'expectile로 데이터 안에서만 최대화하고 AWR로 정책 추출.'),
    A('AWR · AWAC', 'offline', '2019–20', ['pi', 'val'], ['off', 'offline'], ['mc', 'td'], ['kl'], ['wsft'], 'π ∝ π_β·exp(A/β), advantage 가중 회귀.'),
    A('Decision Transformer', 'sequence', '2021', ['pi'], ['offline'], ['mc'], ['none'], ['wsft'], 'return-to-go 조건부 시퀀스 모델링.'),
    A('Dyna-Q', 'modelbased', '1990', ['val', 'model'], ['on', 'model'], ['td'], ['none'], ['greedy'], '학습한 모델로 가상 경험을 만들어 Q를 추가 갱신.'),
    A('MCTS · UCT', 'modelbased', '2006', ['none'], ['model'], ['mc'], ['none'], ['search'], '시뮬레이터 위의 낙관적(UCB) 트리 탐색.'),
    A('AlphaZero', 'modelbased', '2017', ['pi', 'val'], ['model'], ['mc'], ['none'], ['search'], 'MCTS 방문 분포를 정책에 증류하는 자기 대국.'),
    A('MuZero', 'modelbased', '2020', ['pi', 'val', 'model'], ['off'], ['nstep'], ['none'], ['search'], '학습한 잠재 모델 위에서 MCTS.'),
    A('Dreamer', 'modelbased', '2020–23', ['pi', 'val', 'model'], ['off'], ['nstep'], ['ent'], ['pg'], '세계 모델의 상상 롤아웃에서 actor-critic.'),
    A('RLHF (PPO + KL)', 'rlhf', '2022', ['pi', 'val'], ['on', 'pref'], ['nstep'], ['kl', 'trust'], ['pg'], '선호로 학습한 보상모델 + 기준 모델 KL 페널티.'),
    A('DPO', 'dpo', '2023', ['pi'], ['pref', 'offline'], ['none'], ['kl'], ['closed'], 'KL 최적해로 보상을 재매개화해 분류 손실 하나로 정렬.'),
    A('SimPO', 'dpo', '2024', ['pi'], ['pref', 'offline'], ['none'], ['none'], ['closed'], '기준 모델 없이 길이 정규화 로그우도와 마진을 쓰는 변형.'),
    A('GRPO', 'reasoning', '2024', ['pi'], ['on'], ['group'], ['kl', 'trust'], ['pg'], 'critic 대신 그룹 평균 baseline, 검증 가능한 보상과 함께.'),
    A('RLOO', 'reasoning', '2024', ['pi'], ['on'], ['group'], ['kl'], ['pg'], 'leave-one-out baseline을 쓰는 REINFORCE.'),
    A('STaR · ReST-EM · RFT', 'memory', '2022–23', ['pi'], ['on'], ['mc'], ['none'], ['wsft', 'search'], '샘플 → 정답 필터 → SFT. 이진 보상의 EM.'),
    A('R1 증류', 'memory', '2025', ['pi'], ['offline'], ['none'], ['none'], ['wsft'], 'RL로 학습한 교사의 추론을 작은 모델에 SFT.'),
    A('Best-of-N', 'test-time', '—', ['none'], ['on'], ['none'], ['kl'], ['search'], '학습 없이 정의되는 암묵적 정책, KL ≤ log N − (N−1)/N.'),
    A('가치 유도 디코딩', 'test-time', '2023–24', ['val'], ['on'], ['mc', 'td'], ['kl'], ['closed'], 'π_ref·exp(Q/β)로 토큰을 재가중.'),
    A('Reflexion · Voyager', 'memory', '2023', ['none'], ['on'], ['mc'], ['none'], ['search'], '가중치 대신 외부 기억(반성 메모, 스킬 라이브러리)에 저장.'),
  ];

  function mountCombiner(el) {
    const p = ui.panel(el, { kind: 'MAP', title: '알고리즘 조합기: 다섯 설계 선택 → 가장 가까운 알고리즘',
      caption: '다섯 칸의 선택을 바꾸거나 예시 조합 버튼을 눌러, 목록 맨 위에 어떤 알고리즘이 오는지와 오른쪽의 주의 문구가 어떻게 바뀌는지 보라. 초록 칩은 몇 개가 맞았는지, 빨간 칩은 그 알고리즘이 실제로 고른 값이다.' });
    const ctr = ui.row(p.body);
    const sel = { learn: 'pi', data: 'on', est: 'group', reg: 'kl', imp: 'pg' };
    DIMS.forEach((d) => ui.select(ctr, { label: d.label, value: sel[d.key], options: d.opts.map((o) => ({ value: o[0], label: o[1] })), onChange: (v) => { sel[d.key] = v; draw(); } }));
    const presets = ui.row(p.body, 'btns');
    const PRE = [
      ['GRPO 조합', { learn: 'pi', data: 'on', est: 'group', reg: 'kl', imp: 'pg' }],
      ['DQN 조합', { learn: 'val', data: 'off', est: 'td', reg: 'none', imp: 'greedy' }],
      ['오프라인 + 탐욕 (위험)', { learn: 'val', data: 'offline', est: 'td', reg: 'none', imp: 'greedy' }],
      ['탐색 + 증류', { learn: 'pi', data: 'model', est: 'mc', reg: 'any', imp: 'search' }],
      ['모두 해제', { learn: 'any', data: 'any', est: 'any', reg: 'any', imp: 'any' }],
    ];
    const selects = ctr.querySelectorAll('select');
    selects.forEach((s) => { s.style.width = '100%'; s.style.minWidth = '0'; });
    combinerApi = {
      set(cfg) {
        Object.assign(sel, cfg);
        DIMS.forEach((d, i) => { selects[i].value = sel[d.key]; });
        draw();
        el.scrollIntoView({ block: 'start' });
      },
    };
    PRE.forEach(([lab, cfg]) => ui.button(presets, lab, () => {
      Object.assign(sel, cfg);
      DIMS.forEach((d, i) => { selects[i].value = sel[d.key]; });
      draw();
    }));
    const split = div(p.body, 'w-split');
    const left = div(split);
    const right = div(split);
    const optLabel = (dk, v) => (DIMS.find((d) => d.key === dk).opts.find((o) => o[0] === v) || [v, v])[1];

    function warnings() {
      const w = [];
      const s = sel;
      if (s.learn === 'val' && (s.data === 'off' || s.data === 'offline') && (s.est === 'td' || s.est === 'nstep'))
        w.push(['T8', '함수근사 + 부트스트랩 + off-policy는 deadly triad다. 타깃망, double estimator, 보수적 갱신이 필요하다(<a href="#approx">09장</a>).']);
      if (s.data === 'offline' && (s.imp === 'greedy' || s.imp === 'pg') && s.reg !== 'pess' && s.reg !== 'kl')
        w.push(['T7', '고정 데이터에서 argmax나 정책 경사는 데이터 밖 행동의 과대추정을 착취한다. 비관(CQL)이나 데이터 기준 KL(AWR, IQL)이 필요하다(<a href="#offline">15장</a>).']);
      if (s.est === 'mc' && s.imp === 'pg')
        w.push(['T6', '리턴을 그대로 쓰는 정책 경사는 분산이 크다. baseline, critic, 그룹 평균을 고려하라(<a href="#pg">11장</a>).']);
      if ((s.data === 'pref' || s.imp === 'closed') && s.reg === 'none')
        w.push(['T5', '학습된 보상·선호를 기준점 없이 최적화하면 보상 해킹과 과최적화가 생긴다. KL 기준점, 길이 정규화, 조기 종료 같은 장치가 필요하다(<a href="#rlhf">19장</a>).']);
      if (s.imp === 'search' && s.learn === 'none')
        w.push(['T9', '탐색 결과를 증류하지 않으면 매번 같은 비용을 다시 낸다. SFT로 증류하면 상각된다(<a href="#memory">23장</a>).']);
      if (s.imp === 'greedy' && s.data === 'on' && s.reg === 'none')
        w.push(['T7', 'on-policy 탐욕 개선은 탐험이 없으면 국소해에 갇힌다. ε-탐욕, UCB, 엔트로피 보너스를 고려하라(<a href="#bandit">05장</a>).']);
      if (s.learn === 'model' || s.data === 'model')
        w.push(['T1', '학습한 모델로 계획하면 모델 오차가 계획 지평만큼 누적된다. 짧은 롤아웃이나 불확실성 인식 모델이 쓰인다(<a href="#modelbased">16장</a>).']);
      if (s.imp === 'wsft' && s.data === 'on' && s.reg === 'none')
        w.push(['T9', '자기 생성 데이터만으로 반복 SFT하면 커버리지가 천장이고 다양성이 준다. 외부 검증 신호와 기본 모델 재시작이 도움이 된다.']);
      return w;
    }
    function theses() {
      const s = sel, t = new Set();
      if (s.learn === 'val') t.add('T1');
      if (s.imp === 'greedy') t.add('T2');
      if (s.imp === 'pg') t.add('T3');
      if (s.reg === 'trust') t.add('T4');
      if (s.reg === 'kl' || s.reg === 'ent' || s.imp === 'closed') t.add('T5');
      if (['mc', 'td', 'nstep', 'group'].indexOf(s.est) >= 0) t.add('T6');
      if (s.reg === 'pess' || (s.imp === 'greedy' && s.data === 'on')) t.add('T7');
      if (s.learn === 'val' && (s.data === 'off' || s.data === 'offline') && (s.est === 'td' || s.est === 'nstep')) t.add('T8');
      if (s.imp === 'search' || s.imp === 'wsft') t.add('T9');
      return [...t].sort();
    }
    function draw() {
      const active = DIMS.filter((d) => sel[d.key] !== 'any');
      const scored = ALGS.map((a) => {
        let score = 0;
        const hit = [], miss = [];
        active.forEach((d) => {
          if (a[d.key].indexOf(sel[d.key]) >= 0) { score += 2; hit.push(d.key); } else { score -= 1; miss.push(d.key); }
        });
        return { a, score, hit, miss };
      }).sort((x, y) => y.score - x.score || x.miss.length - y.miss.length);
      const top = scored.slice(0, 6);
      const maxS = Math.max(1, active.length * 2);
      const exact = top.filter((x) => x.miss.length === 0 && active.length > 0).length;
      left.innerHTML = '<p class="w-caption">' + (active.length === 0 ? '선택을 하나 이상 고르면 가까운 알고리즘을 찾는다.' : exact ? '정확히 일치하는 알고리즘 ' + exact + '개.' : '정확히 일치하는 알고리즘이 없다. 가장 가까운 것들을 보여 준다.') + '</p>' +
        top.map((x) => {
          const pct = Math.max(0, Math.round((100 * x.score) / maxS));
          const chips = (active.length ? '<span class="chip" style="border-color:var(--good);color:var(--good)">일치 ' + x.hit.length + ' / ' + active.length + '</span> ' : '') + x.miss.map((k) => '<span class="chip" style="border-color:var(--bad);color:var(--bad)">' + DIMS.find((d) => d.key === k).label + ': ' + x.a[k].map((v) => optLabel(k, v)).join(' / ') + '</span>').join(' ');
          return '<div class="card" style="margin:8px 0;display:grid;gap:6px">' +
            '<div style="display:flex;justify-content:space-between;gap:8px;align-items:baseline;flex-wrap:wrap"><strong><a href="#' + x.a.ch + '">' + x.a.n + '</a></strong><span class="mono" style="font-size:var(--fs-xs)">' + x.a.y + ' · ' + RL.meta[x.a.ch].no + '장</span></div>' +
            '<div class="meter"><i style="width:' + pct + '%"></i></div>' +
            '<div style="font-size:var(--fs-sm);color:var(--muted)">' + x.a.note + '</div>' +
            '<div style="display:flex;flex-wrap:wrap;gap:4px">' + chips + '</div></div>';
        }).join('');
      const ws = warnings();
      const ts = theses();
      right.innerHTML =
        '<div class="aside" style="margin-top:0"><span class="label">이 조합이 기대는 대전제</span><div style="display:flex;flex-wrap:wrap;gap:6px">' +
        (ts.length ? ts.map((t) => '<a class="chip t" href="#theses--' + t.toLowerCase() + '">' + t + ' <b>' + RL.thesisById[t].short + '</b></a>').join('') : '<span class="w-caption">선택을 더 골라 보라.</span>') + '</div></div>' +
        (ws.length ? ws.map((w) => '<div class="warn"><span class="label">주의 · ' + w[0] + '</span>' + w[1] + '</div>').join('') : '<div class="note"><span class="label">위험</span>이 조합에 대해 알려진 큰 위험 신호는 없다. 그래도 추정량의 분산과 평가자 착취는 항상 확인하라.</div>');
    }
    draw();
  }
})();
