/* 21 추론 RL: RLVR과 GRPO */
(function () {
  const { ui, sim, plot } = RL;

  RL.chapter({
    id: 'reasoning',
    title: '추론 RL: RLVR과 GRPO',
    subtitle: '정답을 기계가 확인할 수 있으면 보상모델이 필요 없다. 같은 문제를 여러 번 풀게 하고, 그룹 평균보다 잘한 풀이의 확률을 올린다. 이 단순한 규칙으로 모델이 긴 사고 사슬을 쓰게 되었다.',
    time: 45,
    level: '중급 · LLM',
    prereq: ['rlhf', 'ppo'],
    theses: ['T3', 'T6', 'T5', 'T9'],
    easy: {
      hook: '답이 맞았는지 기계가 바로 채점할 수 있는 문제라면, 사람 대신 채점 프로그램으로 모델을 연습시킬 수 있다.',
      intro: '<p>수학 문제 하나를 모델에게 여덟 번 풀게 한다. 최종 답이 맞으면 1점, 틀리면 0점이다.</p><p>여덟 번 중 세 번 맞혔다면 맞힌 풀이에는 "평소보다 잘했다", 틀린 풀이에는 "평소보다 못했다"고 표시한다. 그리고 맞힌 풀이를 더 자주 쓰도록 모델을 고친다. 여기서 "평소"는 같은 문제를 푼 여덟 번의 평균이다. 이 단순한 규칙(GRPO)만으로 모델은 길게 생각하고 스스로 검산하는 습관을 익혔다.</p>',
      analogy: '같은 시험을 본 반 학생들끼리 답안을 비교하는 것과 같다. 반 평균보다 잘 쓴 답안은 칭찬하고, 못 쓴 답안은 지적한다. 시험이 너무 쉬워 모두 100점이거나 너무 어려워 모두 0점이면 비교할 거리가 없어서 그 시험에서는 아무것도 배우지 못한다. 그래서 "가끔 맞히는" 문제가 가장 좋은 연습 문제다.',
      path: [
        '채점자가 되어 풀이 6개에 맞음/틀림을 매기고, 각 풀이가 받는 신호를 본다',
        '풀이 4개로 평균, 표준편차, advantage를 손으로 계산한다',
        '같은 규칙으로 오래 학습하면 무엇이 좋아지고 무엇을 잃는지 시뮬레이터로 본다',
        'DeepSeek-R1이 이 방법으로 어떻게 학습됐는지 본다',
      ],
      recap: [
        '같은 문제를 여러 번 풀게 해서, 평균보다 잘한 풀이는 더 자주, 못한 풀이는 덜 자주 쓰도록 고친다.',
        '모두 맞히거나 모두 틀린 문제는 비교할 거리가 없어 학습 신호가 없다. 가끔 맞히는 문제에서 가장 많이 배운다.',
        '이 방법은 한 번에 맞힐 확률을 높이지만, 드물게 쓰던 풀이법을 잃어 여러 번 시도할 때의 성공률은 줄어들 수 있다.',
      ],
    },
    goals: [
      'RLVR(검증 가능한 보상)이 RLHF와 무엇이 같고 다른지 설명할 수 있다.',
      '그룹 평균 baseline은 leave-one-out baseline의 상수배라서 불편이고, 표준편차 정규화는 편향을 만든다는 것을 유도할 수 있다.',
      'GRPO, Dr. GRPO, DAPO의 손실 정규화 차이를 계산기로 비교하고 길이 편향의 원인을 설명할 수 있다.',
      '그룹 학습의 동역학(pass@1 상승, 엔트로피 붕괴, 신호 없는 그룹 증가, pass@k 역전)을 시뮬레이터로 관찰한다.',
    ],
    html: String.raw`
<p>RLHF의 보상은 사람 선호를 흉내 내는 보상모델이었고, 그 모델의 오류가 과최적화를 불렀다(<a href="#rlhf">19장</a>). 수학 문제의 최종 답, 코드의 단위 테스트, 형식 규칙처럼 <strong>정답 여부를 프로그램이 판정할 수 있는</strong> 과제에서는 보상모델 없이 판정기를 그대로 보상으로 쓸 수 있다. 이 방식을 RLVR(RL with Verifiable Rewards)이라고 부른다.</p>
$$r(x, y) = \mathbb{1}\big[\,\mathrm{verify}(x, y) = \text{정답}\,\big] \in \{0, 1\}$$
<p>이 보상은 희소하고(응답 끝에 한 번), 이진값이며, 해킹하기 어렵다(불가능하지는 않다). DeepSeekMath(Shao et al. 2024)의 GRPO, OpenAI o1(2024, 방법 비공개), DeepSeek-R1(Guo et al. 2025)이 이 흐름을 대표한다.</p>

<h2>먼저 채점자가 되어 보기</h2>
<p>모델이 같은 문제를 여섯 번 풀어 응답 6개를 냈다. 아래에서 채점 프로그램 역할을 맡아 각 풀이에 맞음 또는 틀림을 매길 수 있다. 채점이 끝나면 어떤 풀이를 다음에 더 자주 쓰게 될지가 정해진다.</p>
<div data-w="try-grader"></div>

<h2>GRPO: critic 대신 그룹</h2>
<p>PPO는 토큰마다 advantage를 만들려고 critic을 학습한다. LLM에서는 보상이 끝에 하나뿐이고 정책과 같은 크기의 critic을 둬야 하므로 부담이 크다. GRPO(Group Relative Policy Optimization)는 같은 프롬프트에서 응답 $G$개를 뽑고, <strong>그룹 안의 상대 점수</strong>를 advantage로 쓴다.</p>
<div data-w="fx-grpo"></div>
<p>식은 길지만 중요한 부분은 advantage 한 줄이다. 아래에서 풀이 네 개로 직접 계산한다.</p>
<div data-w="step-grpo"></div>

<h3>왜 그룹 평균을 빼도 되는가</h3>
<div data-w="dv-baseline"></div>
<div class="thesis-box"><span class="label">대전제 T3 + T6 · 점수함수 경사와 baseline</span>
<p>정책 경사는 $\mathbb{E}[r\,\nabla\log\pi]$이고(T3), 샘플 자신과 무관한 baseline은 얼마를 빼도 편향을 만들지 않는다. GRPO의 그룹 평균은 leave-one-out baseline의 상수배라서 불편이다. 따라서 남는 문제는 <strong>분산을 얼마나 줄이느냐</strong>다(T6). critic은 상태마다 다른 baseline을 학습하고, 그룹 방식은 같은 프롬프트에서 뽑은 다른 샘플들로 baseline을 그때그때 추정한다. 대가로 프롬프트마다 $G$번 생성해야 한다.</p>
</div>

<h2>계산기: 한 그룹의 advantage와 토큰 가중치</h2>
<p>한 프롬프트에서 응답 $G$개를 뽑았다. 아래 계산기에서 각 응답의 정답 여부와 길이를 바꿀 수 있다. 같은 그룹이라도 정규화 방식 세 가지가 서로 다른 학습 신호를 만든다.</p>
<div data-w="grpo-calc"></div>
<div class="table-wrap"><table class="t">
<thead><tr><th>정규화</th><th>토큰 하나의 가중치</th><th>결과</th></tr></thead>
<tbody>
<tr><td>GRPO (응답별 길이 평균 후 그룹 평균)</td><td>$\hat A_i \,/\, (G\,|o_i|)$</td><td>짧은 정답은 토큰마다 큰 보상을, <strong>긴 오답은 토큰마다 작은 벌점</strong>을 받는다. 그래서 오답이 길어지는 쪽으로 편향된다.</td></tr>
<tr><td>DAPO (그룹 전체 토큰 평균, Yu et al. 2025)</td><td>$\hat A_i \,/\, \sum_j |o_j|$</td><td>모든 토큰의 가중치가 같다. 긴 응답의 토큰도 제 몫의 신호를 받는다.</td></tr>
<tr><td>Dr. GRPO (상수로 나눔, Liu et al. 2025)</td><td>$\hat A_i \,/\, (G\,L)$, $L$은 고정 상수</td><td>길이 편향이 사라진다. 표준편차 정규화도 함께 빼서 문제 난이도에 따른 편향도 없앤다.</td></tr>
</tbody></table></div>

<h2>시뮬레이터: 그룹 학습의 동역학</h2>
<p>아래는 장난감 세계다. 문제 200개가 있고, 정책은 문제를 풀 "전략" 6개 중 하나를 고른다(모든 문제가 같은 정책을 쓴다). 전략 1은 범용이라 쉬운 문제를 잘 풀고, 문제의 30%는 특정 소수 전략으로만 풀린다. 기준 모델은 여러 전략을 고르게 섞어 쓴다. 반복마다 문제 64개를 골라 문제당 $G$개씩 샘플링하고 GRPO 방식으로 갱신한다. 지표는 샘플로 어림하지 않고 정확한 기댓값으로 계산한다.</p>
<div data-w="grpo-sim"></div>
<ul>
  <li><strong>분포가 뾰족해진다(sharpening)</strong>: pass@1이 오르는 동안 엔트로피가 빠르게 떨어진다. 정책은 평균적으로 가장 이득인 전략으로 몰린다.</li>
  <li><strong>신호 없는 그룹이 늘어난다</strong>: 학습이 진행될수록 전부 정답이거나 전부 오답인 그룹이 늘고, 이런 그룹의 advantage는 0이다. 배치 크기가 같아도 실제로 쓸모 있는 학습 신호는 줄어든다. DAPO의 동적 샘플링은 이런 그룹을 버리고 다시 뽑는다.</li>
  <li><strong>pass@k가 역전된다</strong>: 오른쪽 아래 그래프를 보면 $k$가 작을 때는 학습된 정책이 낫지만 $k$가 크면 기준 모델이 더 많은 문제를 푼다. 학습된 정책이 드문 전략으로만 풀리는 문제를 포기했기 때문이다. KL 계수 $\beta$를 올리면 역전이 늦게 일어난다.</li>
</ul>
<div class="aside"><span class="label">해석의 범위</span>이 시뮬레이터는 현상이 생기는 원리를 보여 주는 장난감이다. 실제 LLM에서 RLVR이 기준 모델의 능력 경계를 넓히는지는 아직 논쟁 중이다. Yue et al.(2025)은 여러 설정에서 $k$가 크면 기준 모델의 pass@k가 RL 모델보다 높아진다고 보고했고, RLVR이 주로 샘플링 효율을 높인다고 해석했다. 반면 학습을 훨씬 길게 하거나 엔트로피를 유지하면 경계가 넓어진다는 후속 보고(예: NVIDIA의 ProRL, 2025)도 있다.</div>

<h2>DeepSeek-R1: 순수 RL에서 나타난 긴 사고</h2>
<div class="w wide" style="box-shadow:none"><div class="w-body" style="overflow-x:auto">
<svg viewBox="0 0 780 250" role="img" aria-label="DeepSeek-R1 학습 파이프라인" style="min-width:660px">
  <defs><marker id="reasoning-ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--muted)"/></marker></defs>
  <g style="font-size:12px">
    <text x="10" y="22" style="fill:var(--muted);font-weight:600">R1-Zero</text>
    <rect x="10" y="32" width="120" height="46" rx="8" style="fill:var(--surface-2);stroke:var(--line)"/><text x="70" y="60" text-anchor="middle" style="fill:var(--ink)">V3-Base</text>
    <rect x="170" y="32" width="250" height="46" rx="8" style="fill:var(--accent-soft);stroke:var(--accent)"/><text x="295" y="52" text-anchor="middle" style="fill:var(--ink)">GRPO, 규칙 보상</text><text x="295" y="68" text-anchor="middle" style="fill:var(--muted)">정확도 + 형식(think 태그)</text>
    <rect x="460" y="32" width="150" height="46" rx="8" style="fill:var(--surface-2);stroke:var(--line)"/><text x="535" y="52" text-anchor="middle" style="fill:var(--ink)">R1-Zero</text><text x="535" y="68" text-anchor="middle" style="fill:var(--muted)">긴 CoT · 가독성 낮음</text>
    <path d="M130 55 L165 55" style="stroke:var(--muted);stroke-width:1.5;fill:none" marker-end="url(#reasoning-ar)"/>
    <path d="M420 55 L455 55" style="stroke:var(--muted);stroke-width:1.5;fill:none" marker-end="url(#reasoning-ar)"/>

    <text x="10" y="118" style="fill:var(--muted);font-weight:600">R1</text>
    <rect x="10" y="128" width="100" height="56" rx="8" style="fill:var(--surface-2);stroke:var(--line)"/><text x="60" y="160" text-anchor="middle" style="fill:var(--ink)">V3-Base</text>
    <rect x="135" y="128" width="120" height="56" rx="8" style="fill:var(--surface-2);stroke:var(--line)"/><text x="195" y="150" text-anchor="middle" style="fill:var(--ink)">① cold-start</text><text x="195" y="168" text-anchor="middle" style="fill:var(--muted)">긴 CoT 소량 SFT</text>
    <rect x="280" y="128" width="130" height="56" rx="8" style="fill:var(--accent-soft);stroke:var(--accent)"/><text x="345" y="150" text-anchor="middle" style="fill:var(--ink)">② 추론 RL</text><text x="345" y="168" text-anchor="middle" style="fill:var(--muted)">+ 언어 일관성 보상</text>
    <rect x="435" y="128" width="150" height="56" rx="8" style="fill:var(--surface-2);stroke:var(--line)"/><text x="510" y="150" text-anchor="middle" style="fill:var(--ink)">③ 거절 샘플링</text><text x="510" y="168" text-anchor="middle" style="fill:var(--muted)">+ 일반 데이터로 SFT</text>
    <rect x="610" y="128" width="160" height="56" rx="8" style="fill:var(--accent-soft);stroke:var(--accent)"/><text x="690" y="150" text-anchor="middle" style="fill:var(--ink)">④ 전 영역 RL</text><text x="690" y="168" text-anchor="middle" style="fill:var(--muted)">추론 규칙 + 선호 보상</text>
    <path d="M110 156 L130 156" style="stroke:var(--muted);stroke-width:1.5;fill:none" marker-end="url(#reasoning-ar)"/>
    <path d="M255 156 L275 156" style="stroke:var(--muted);stroke-width:1.5;fill:none" marker-end="url(#reasoning-ar)"/>
    <path d="M410 156 L430 156" style="stroke:var(--muted);stroke-width:1.5;fill:none" marker-end="url(#reasoning-ar)"/>
    <path d="M585 156 L605 156" style="stroke:var(--muted);stroke-width:1.5;fill:none" marker-end="url(#reasoning-ar)"/>
    <path d="M690 184 L690 214 L520 214" style="stroke:var(--muted);stroke-width:1.5;fill:none;stroke-dasharray:5 4" marker-end="url(#reasoning-ar)"/>
    <text x="470" y="218" text-anchor="end" style="fill:var(--ink)">증류: R1이 만든 추론 데이터로 소형 Qwen · Llama를 SFT</text>
  </g>
</svg></div></div>
<ul>
  <li><strong>R1-Zero</strong>: SFT 없이 기반 모델에 GRPO와 규칙 보상(답의 정확도, 형식)만 적용했다. 학습이 진행되면서 응답 길이가 늘고, 스스로 검토하고 되돌아가는 행동이 나타났다(논문의 "aha moment"). 다만 가독성이 낮고 여러 언어가 섞였다.</li>
  <li><strong>R1</strong>: 네 단계를 거친다. 먼저 긴 CoT 데이터 소량으로 초기 SFT(cold start)를 하고 추론 RL을 돌린다. 이어 RL 모델의 출력을 거절 샘플링해 대규모 SFT 데이터를 만들고, 일반 과제 데이터와 섞어 다시 SFT를 한다. 마지막으로 모든 영역에 RL을 적용한다. 탐색(RL)과 증류(SFT)를 번갈아 하는 구조다.</li>
  <li><strong>증류</strong>: 작은 모델에 직접 RL을 하기보다 큰 RL 모델의 추론 궤적으로 SFT를 하는 편이 더 좋았다고 보고했다. 비싼 탐색으로 얻은 결과를 값싼 지도학습으로 옮기는 T9의 전형적인 예다(<a href="#memory">23장</a>).</li>
  <li>논문은 실패한 시도로 PRM(보상 해킹과 단계 정의의 어려움)과 MCTS(토큰 공간의 거대한 분기)를 함께 기록했다.</li>
</ul>

<h2>결과 보상과 과정 보상</h2>
<div class="grid2">
  <div class="card"><h4>ORM (Outcome Reward Model)</h4><p>최종 답이 맞았는지만 본다. 판정기가 있으면 학습할 필요도 없다. 신용 할당이 약점이다. 30단계 풀이에서 어느 단계가 틀렸는지 알려 주지 않고, 틀린 과정으로 운 좋게 맞힌 답에도 보상을 준다.</p></div>
  <div class="card"><h4>PRM (Process Reward Model)</h4><p>각 단계가 옳은지 평가한다. Lightman et al.(2023, <em>Let's Verify Step by Step</em>)은 사람이 단계별로 라벨링한 PRM800K로 학습한 PRM이 MATH의 best-of-N 선택에서 ORM보다 낫다고 보고했다.</p></div>
</div>
<p>Math-Shepherd(Wang et al. 2023)는 사람 없이 단계 라벨을 얻는다. 어떤 단계까지 쓴 풀이에서 이어 풀기(롤아웃, rollout)를 여러 번 하고, 정답에 도달한 비율을 그 단계의 점수로 쓴다. 이 값은 <strong>접두어의 가치 $V^\pi(s_t)$를 몬테카를로로 추정</strong>한 것이다(<a href="#td">06장</a>). 결국 PRM은 토큰 MDP의 critic과 같다. 그래서 critic의 문제도 그대로 물려받는다. 추정에 잡음이 있고, 정책이 바뀌면 낡으며, 해킹 대상이 된다. VinePPO(Kazemnejad et al. 2024)는 같은 롤아웃을 PPO의 가치 추정에 직접 쓴다.</p>

<h2>검증기 해킹</h2>
<p>검증 가능한 보상도 대리 지표다. 판정 프로그램에 빈틈이 있으면 정책이 찾아낸다.</p>
<ul>
  <li><strong>형식 공략</strong>: 답 추출 규칙이 허술하면, 예를 들어 boxed 답 중 하나만 맞아도 통과시키면, 여러 답을 나열하는 행동이 보상받는다.</li>
  <li><strong>테스트 공략</strong>: 코드 과제에서 테스트 입력만 특수 처리하거나 테스트 자체를 고친다.</li>
  <li><strong>추측</strong>: 선택지 문제나 정수 답 문제에서 추론 없이 찍는다. 보상은 받지만 일반화되는 능력으로 이어지지 않는다.</li>
  <li><strong>LLM 판정자 공략</strong>: 판정을 모델에게 맡기면 RLHF의 보상 해킹이 그대로 돌아온다.</li>
</ul>
<p>대응책은 세 가지다. 판정기를 강화하고(엄격한 형식, 숨긴 테스트), 형식 보상을 따로 두고, 학습 중 샘플을 사람이 직접 읽어 본다.</p>

<h2>파생: 무엇이 바뀌었나</h2>
<div class="table-wrap"><table class="t">
<thead><tr><th>방법</th><th>advantage / baseline</th><th>바꾼 부분</th></tr></thead>
<tbody>
<tr><td>REINFORCE (<a href="#pg">11장</a>)</td><td>$r$ 또는 이동평균 baseline</td><td>출발점</td></tr>
<tr><td>ReMax (Li et al. 2023)</td><td>$r(y) - r(y_{\text{greedy}})$</td><td>greedy 응답의 보상을 baseline으로 쓰고 critic을 없앤다.</td></tr>
<tr><td>RLOO (Ahmadian et al. 2024)</td><td>$r_i - \frac{1}{G-1}\sum_{j\ne i} r_j$</td><td>자기 자신을 뺀 평균(leave-one-out)을 쓴다. 정확히 불편이다.</td></tr>
<tr><td>GRPO (Shao et al. 2024)</td><td>$(r_i - \bar r)/\mathrm{std}(r)$</td><td>그룹 정규화 + PPO 클립 + KL 손실 항($k_3$ 추정량)</td></tr>
<tr><td>Dr. GRPO (Liu et al. 2025)</td><td>$r_i - \bar r$</td><td>표준편차 정규화와 응답 길이 정규화를 뺀다</td></tr>
<tr><td>DAPO (Yu et al. 2025)</td><td>GRPO와 같음</td><td>clip-higher(상한 $\epsilon$을 키워 확률이 낮은 토큰도 올라갈 수 있게 한다), 동적 샘플링(신호가 0인 그룹 제거), 토큰 수준 손실 평균, 너무 긴 응답의 보상 셰이핑, KL 제거</td></tr>
<tr><td>VinePPO (Kazemnejad et al. 2024)</td><td>몬테카를로 롤아웃으로 추정한 $V(s_t)$</td><td>critic 대신 중간 상태에서 롤아웃한다. 토큰 수준 신용 할당을 되살린다.</td></tr>
<tr><td>PRM 기반 RL (Math-Shepherd 등)</td><td>단계별 PRM 점수</td><td>희소한 결과 보상 → 조밀한 과정 보상</td></tr>
</tbody></table></div>
`,
    mount: {
      'fx-grpo': (el) => ui.formula(el, {
        title: 'GRPO 목적 (DeepSeekMath)',
        say: '{grp|같은 문제를 여러 번 풀게 하고} 각 풀이에 {adv|그룹 평균보다 얼마나 잘했는지}를 점수로 준다. 그 점수만큼 풀이에 쓰인 토큰의 확률을 올리거나 내린다. 다만 {rho|예전 모델보다 확률이 바뀐 비율}이 {clip|정해 둔 범위를 넘으면 더 밀지 않고}, 모델이 {kl|원래 모델에서 너무 멀어지면 벌점}을 준다. 마지막으로 {lavg|풀이마다 토큰 수로 나누고} {gavg|풀이끼리 평균}을 낸다.',
        tex: String.raw`\mathcal{J}(\theta) = \tm{grp}{\mathbb{E}_{x,\;\{o_i\}_{i=1}^{G}\sim\pi_{\text{old}}}}\Bigg[\tm{gavg}{\frac{1}{G}\sum_{i=1}^{G}}\tm{lavg}{\frac{1}{|o_i|}\sum_{t=1}^{|o_i|}}\Big(\min\big(\tm{rho}{\rho_{i,t}}\,\tm{adv}{\hat A_{i}},\ \tm{clip}{\clip(\rho_{i,t},1-\epsilon,1+\epsilon)}\,\hat A_{i}\big) - \tm{kl}{\beta\,\mathbb{D}_{\mathrm{KL}}\big[\pi_\theta\|\pi_{\text{ref}}\big]}\Big)\Bigg]`,
        terms: [
          { id: 'grp', sym: '\\{o_i\\}_{i=1}^G\\sim\\pi_{\\text{old}}', label: '그룹 샘플링', desc: '같은 프롬프트에서 응답 G개를 뽑는다.', long: '그룹이 critic 역할을 한다. 같은 문제에서 뽑은 샘플들이 "이 문제가 원래 얼마나 쉬운가"를 그때그때 추정한다. G가 클수록 baseline 추정이 정확해지지만 생성 비용도 G에 비례해 늘어난다.' },
          { id: 'gavg', sym: '\\frac1G\\sum_i', label: '응답 평균', desc: '그룹 안 응답들의 평균이다.' },
          { id: 'lavg', sym: '\\frac{1}{|o_i|}\\sum_t', label: '길이 정규화', desc: '응답마다 토큰 수로 나눈다. 길이 편향이 여기서 생긴다.', long: '토큰 하나의 가중치가 $1/|o_i|$가 되므로 긴 응답의 토큰은 신호가 약하다. 오답($\\hat A<0$)이면 길수록 토큰당 벌점이 작아져 긴 오답이 상대적으로 덜 억제된다. Dr. GRPO와 DAPO가 고친 부분이다.' },
          { id: 'rho', sym: '\\rho_{i,t}=\\frac{\\pi_\\theta(o_{i,t}|\\cdot)}{\\pi_{\\text{old}}(o_{i,t}|\\cdot)}', label: '중요도비', desc: '샘플을 만든 정책에 대한 현재 정책의 확률비다.' },
          { id: 'adv', sym: '\\hat A_i = \\frac{r_i - \\mathrm{mean}(r)}{\\mathrm{std}(r)}', label: '그룹 상대 advantage', desc: '응답의 모든 토큰이 같은 값을 받는다.', long: '결과 보상만 있으므로 한 응답 안의 모든 토큰이 같은 advantage를 공유한다. 토큰 수준 신용 할당은 여러 샘플에 걸친 통계로만 일어난다. 모두 정답이거나 모두 오답이면 분자가 0이라 그 프롬프트는 신호가 없다.' },
          { id: 'clip', sym: '\\operatorname{clip}(\\rho,1\\pm\\epsilon)', label: 'PPO 클립', desc: '같은 데이터로 정책을 너무 멀리 옮기지 않게 막는다(13장).', long: 'DAPO는 상한과 하한을 다르게 두는 clip-higher를 제안했다. 확률이 낮은 토큰은 비율 상한에 금방 막혀 잘 올라가지 못하고, 이 현상이 엔트로피 붕괴를 부추기기 때문이다.' },
          { id: 'kl', sym: '\\beta\\,\\mathbb{D}_{\\mathrm{KL}}', label: 'KL 손실 항', desc: '보상에 섞지 않고 손실에 직접 넣는다. k3 추정량을 쓴다.', long: 'GRPO는 토큰마다 $\\frac{\\pi_{\\text{ref}}}{\\pi_\\theta} - \\log\\frac{\\pi_{\\text{ref}}}{\\pi_\\theta} - 1$을 쓴다. 항상 0 이상이고 불편인 KL 추정량이다. 검증 가능한 보상은 해킹 위험이 낮아 DAPO처럼 KL을 아예 빼는 설정도 흔하다.' },
        ],
      }),
      'dv-baseline': (el) => ui.derivation(el, {
        title: '그룹 평균 baseline은 RLOO의 상수배, 표준편차 정규화는 프롬프트 재가중',
        easy: '풀이 점수에서 그룹 평균을 빼도 "나를 뺀 나머지의 평균"을 뺀 값과 크기 비율만 다르므로 학습 방향은 틀어지지 않는다. 다만 표준편차로 나누면 아주 쉬운 문제와 아주 어려운 문제가 더 크게 반영된다.',
        steps: [
          { tex: String.raw`\nabla_\theta J = \mathbb{E}_{x}\,\mathbb{E}_{o\sim\pi_\theta(\cdot|x)}\big[r(x,o)\,\nabla_\theta\log\pi_\theta(o|x)\big]`, why: '점수함수 경사(T3)다. 응답 전체를 행동 하나로 보는 밴딧 관점이다.' },
          { tex: String.raw`\mathbb{E}_{o\sim\pi_\theta}\big[b\,\nabla_\theta\log\pi_\theta(o|x)\big] = b\,\nabla_\theta\sum_o \pi_\theta(o|x) = b\,\nabla_\theta 1 = \hl{0}`, why: '$b$가 샘플 $o$에 의존하지 않으면 어떤 baseline도 편향을 만들지 않는다.' },
          { tex: String.raw`\hat g = \frac{1}{G}\sum_{i=1}^{G}\big(r_i - \hl{b_i}\big)\nabla_\theta\log\pi_\theta(o_i|x),\qquad b_i = \frac{1}{G-1}\sum_{j\ne i} r_j`, why: '같은 프롬프트에서 $G$개를 독립으로 샘플링한다. $b_i$는 <strong>자기 자신을 뺀</strong> 나머지 샘플의 평균이라 $o_i$와 독립이다. 따라서 불편 추정량이다. 이 방식이 RLOO다.' },
          { tex: String.raw`r_i - \bar r = r_i - \frac{r_i + \sum_{j\ne i}r_j}{G} = \hl{\frac{G-1}{G}}\Big(r_i - \frac{1}{G-1}\sum_{j\ne i}r_j\Big)`, easy: '평균 안에 자기 점수가 섞여 있어도, 결과는 "나를 뺀 평균"을 쓴 값에 일정한 비율(8개면 7/8)을 곱한 것일 뿐이다. 방향은 같고 크기만 조금 작다.', why: '자기 자신을 포함한 그룹 평균을 빼는 것은 RLOO advantage에 상수 $\\frac{G-1}{G}$를 곱한 것과 같다. 학습률에 흡수되므로 <strong>그룹 평균 baseline도 불편</strong>이다.' },
          { tex: String.raw`\hat A_i = \frac{r_i - \bar r}{\hl{\sigma_x}},\qquad r\in\{0,1\}:\ \sigma_x = \sqrt{\hat p_x(1-\hat p_x)}`, why: '표준편차는 자신을 포함한 모든 샘플에 의존하므로 이제는 정확히 불편이 아니다. 더 큰 효과는 <strong>프롬프트별 재가중</strong>이다. 정답률 $\\hat p_x$가 0이나 1에 가까운 문제일수록 $1/\\sigma_x$가 커져 가중치가 커진다.' },
          { tex: String.raw`\hat A_i = \begin{cases} \hl{(1-\hat p_x)/\sigma_x} = \sqrt{\tfrac{1-\hat p_x}{\hat p_x}} & \text{정답} \\ \hl{-\hat p_x/\sigma_x} = -\sqrt{\tfrac{\hat p_x}{1-\hat p_x}} & \text{오답}\end{cases}\qquad \hat p_x\in\{0,1\}\Rightarrow \hat A_i = 0`, easy: '맞힌 비율만 알면 점수가 정해진다. 8개 중 1개만 맞히면 그 풀이는 큰 칭찬을 받고, 8개 모두 맞히면 아무도 칭찬받지 못한다.', why: '이진 보상이면 advantage는 그룹 정답률 $\\hat p_x$로만 정해진다. 어려운 문제에서 드물게 맞힌 풀이는 큰 양의 advantage를 받는다. 전부 맞히거나 전부 틀리면 신호가 0이다. Dr. GRPO는 표준편차 정규화를 빼서 이 난이도 재가중을 없앤다.' },
        ],
      }),
      'try-grader': mountGrader,
      'step-grpo': (el) => ui.walkthrough(el, {
        title: '풀이 4개의 advantage를 손으로',
        caption: '"다음 단계"를 누르면 한 줄씩 열리고, 빈칸에 계산값을 넣으면 바로 확인해 준다. 표준편차는 개수 n으로 나누는 방식을 쓴다(구현에 따라 n−1로 나누기도 한다).',
        steps: [
          { say: '같은 문제를 네 번 풀었고 첫 번째 풀이만 맞았다. 점수는 1, 0, 0, 0이다. 평균은?', ask: { answer: 0.25, tol: 0.005 }, calc: String.raw`\bar r = \frac{1 + 0 + 0 + 0}{4} = 0.25` },
          { say: '평균을 빼면 맞힌 풀이는 얼마가 되나?', ask: { answer: 0.75, tol: 0.005 }, calc: String.raw`1 - 0.25 = 0.75`, note: '틀린 풀이 세 개는 각각 $0 - 0.25 = -0.25$다. 모두 더하면 $0.75 - 3\\times0.25 = 0$이다. 평균을 빼면 합은 항상 0이 된다.' },
          { say: '표준편차는 평균과의 차이를 제곱해 평균을 낸 뒤 제곱근을 취한 값이다. $(0.75^2 + 3\\times0.25^2)/4 = 0.1875$다. 제곱근은?', ask: { answer: 0.433, tol: 0.005 }, calc: String.raw`\sigma = \sqrt{0.1875} \approx 0.433` },
          { say: '표준편차로 나누면 맞힌 풀이의 advantage는?', ask: { answer: 1.732, tol: 0.01 }, calc: String.raw`\hat A_1 = \frac{0.75}{0.433} \approx 1.73,\qquad \hat A_{2,3,4} = \frac{-0.25}{0.433} \approx -0.58`, note: '넷 중 하나만 맞힌 어려운 문제라서, 맞힌 풀이 하나가 큰 칭찬(+1.73)을 받는다.' },
          { say: '이번에는 네 풀이가 모두 맞았다. 점수는 1, 1, 1, 1이고 평균은 1이라 모든 풀이가 평균과 같다. 맞힌 풀이 하나의 advantage는?', ask: { answer: 0, tol: 0.001 }, calc: String.raw`r_i - \bar r = 1 - 1 = 0`, note: '모두 같은 점수면 아무 풀이도 칭찬받지 않는다. 이 문제를 푸는 데 쓴 계산은 학습에 아무 영향을 주지 않는다. DAPO는 이런 문제를 버리고 다른 문제를 다시 뽑는다.' },
        ],
      }),
      'grpo-calc': mountGRPOCalc,
      'grpo-sim': mountGRPOSim,
    },
    tacit: [
      { tag: 'math', t: 'KL이 있는 RLVR의 최적해는 "정답으로 조건화한 기준 모델"이다',
        d: '<p>T5의 닫힌 해에 이진 보상을 넣으면 $\\pi^*(y|x) \\propto \\pi_{\\text{ref}}(y|x)\\,e^{\\mathbb{1}[\\text{정답}]/\\beta}$다. $\\beta\\to0$이면 $\\pi^* = \\pi_{\\text{ref}}(y\\mid x, \\text{정답})$, 즉 기준 모델의 사후분포다. 이 해는 기준 모델이 낼 수 있는 정답들 사이의 상대 비율을 그대로 유지한다. 그래서 정규화된 RLVR은 원리상 <strong>거절 샘플링(STaR, ReST)과 목표가 같고</strong>(T9, <a href="#memory">23장</a>), 기준 모델이 한 번도 못 푸는 문제는 풀 수 없다. 능력 경계 논쟁도 수학적으로는 이 성질에서 출발한다.</p>' },
      { tag: 'algo', t: '가장 잘 배우는 문제는 정답률 50% 근처다',
        d: '<p>이진 보상에서 한 프롬프트가 주는 기울기 신호의 크기는 보상 분산 $p(1-p)$에 비례한다(표준편차로 나누지 않을 때). $p\\approx0$이나 $p\\approx1$인 문제는 그룹 대부분이 같은 결과라 얻을 정보가 없다. 그래서 RLVR 데이터를 구성할 때는 현재 모델이 가끔 맞히는 문제를 고른다. 학습이 진행되면 그런 문제의 집합도 바뀌므로 커리큘럼이나 동적 샘플링이 필요하다. 시뮬레이터의 "신호 없는 그룹 비율" 곡선이 이 변화를 보여 준다.</p>' },
      { tag: 'math', t: '엔트로피 붕괴는 공분산으로 설명된다',
        d: '<p>softmax 정책을 자연 경사 형태로 갱신하면 엔트로피 변화는 대략 $-\\mathrm{Cov}_{a\\sim\\pi}\\big(\\log\\pi(a), A(a)\\big)$에 비례한다(Cui et al. 2025의 분석). 이미 확률이 높은 행동이 양의 advantage를 받으면 엔트로피가 줄고, 확률이 낮은 행동이 양의 advantage를 받으면 엔트로피가 늘어난다. 검증 가능한 보상에서는 대개 앞의 경우가 많아 엔트로피가 계속 줄어들기 쉽다. clip-higher, 엔트로피 보너스, 공분산이 큰 토큰만 골라 업데이트를 제한하는 방법이 모두 이 항을 겨냥한다.</p>' },
      { tag: 'algo', t: '결과 보상에서는 모든 토큰이 같은 advantage를 받는다',
        d: '<p>$\\gamma=1$이고 전이가 결정적이며 보상이 끝에 하나뿐인 토큰 MDP에서, GRPO는 응답의 모든 토큰에 같은 $\\hat A_i$를 준다. 어느 토큰이 결과를 갈랐는지는 여러 샘플을 비교한 통계로만 드러난다. 같은 토큰이 정답 풀이와 오답 풀이에 모두 나오면 신호가 상쇄되고, 정답 풀이에만 나오는 토큰의 신호가 남는다. 토큰 수준 신용 할당이 필요하면 접두어의 가치를 추정해야 하고, PRM과 VinePPO의 몬테카를로 롤아웃이 그 역할을 한다.</p>' },
      { tag: 'practice', t: '길이 증가가 곧 추론 능력의 증가는 아니다',
        d: '<p>R1-Zero 이후 학습 중 응답 길이가 늘어나는 것이 성공의 신호처럼 여겨졌다. 하지만 GRPO의 $1/|o_i|$ 정규화에는 긴 오답을 덜 벌주는 편향이 있고, Liu et al.(2025)은 이 편향이 특히 오답의 길이를 부풀릴 수 있다고 지적했다. 길이 곡선은 정답과 오답을 나눠서 보고, 어떤 정규화를 썼는지 확인한 뒤 해석해야 한다.</p>' },
      { tag: 'research', t: '기반 모델이 원래 가진 능력부터 확인한다',
        d: '<p>RL 뒤에 나타난 자기 검토 행동이 기반 모델의 샘플에도 이미 일정한 빈도로 있다는 관찰이 있다(Liu et al. 2025). 특정 모델 계열에서는 무작위에 가까운 보상으로도 수학 점수가 오른다는 보고도 있다(Shao et al. 2025, <em>Spurious Rewards</em>). 두 결과 모두 RLVR 효과의 상당 부분이 기반 모델의 기존 분포를 재가중하는 데서 온다는 해석과 맞는다. 새 RLVR 결과를 볼 때는 (1) 기반 모델의 pass@k와 (2) 다른 모델 계열에서도 재현되는지를 먼저 확인하는 것이 좋다.</p>' },
      { tag: 'algo', t: 'GRPO는 사실상 LLM 생성을 밴딧 문제로 다시 본 방법이다',
        d: '<p>advantage가 토큰마다 다르지 않으므로 GRPO는 응답 전체를 행동 하나로 보는 문맥 밴딧(contextual bandit)의 정책 경사와 같다. 클립과 중요도비는 같은 배치를 여러 번 다시 쓰기 위한 장치로만 남는다. 많은 설정에서 on-policy로 한 번만 갱신하면 $\\rho=1$이라 클립이 작동하지 않고, GRPO는 그룹 baseline을 쓴 REINFORCE가 된다. RLOO 논문의 주장도 같은 맥락이다.</p>' },
    ],
    quiz: [
      { q: '정답/오답 이진 보상에서 그룹 8개가 모두 정답이면 GRPO advantage는?', options: ['모두 +1', '모두 0', '길이에 비례', '표준편차가 0이라 정의되지 않으므로 무한대'], answer: 1,
        explain: '$r_i - \\bar r = 0$이므로 분자가 0이다. 구현은 분모에 작은 $\\epsilon$을 더해 0으로 처리한다. 이런 그룹은 계산 비용만 들고 신호가 없으므로 DAPO는 버리고 다시 샘플링한다.' },
      { q: '자기 자신을 포함한 그룹 평균을 baseline으로 빼도 경사 추정이 불편인 이유는?', options: ['그룹 평균이 0이기 때문', 'leave-one-out baseline에 상수 $\\frac{G-1}{G}$를 곱한 것과 같기 때문', '표준편차로 나누기 때문', '클립이 편향을 상쇄하기 때문'], answer: 1,
        explain: '$r_i - \\bar r = \\frac{G-1}{G}(r_i - \\bar r_{-i})$. 자기 자신을 뺀 평균은 $o_i$와 독립이라 불편이고, 상수배는 학습률에 흡수된다.' },
      { q: 'GRPO의 응답별 길이 정규화 $1/|o_i|$가 만드는 편향은?', options: ['짧은 오답을 덜 벌준다', '긴 오답의 토큰당 벌점을 줄여 긴 오답을 상대적으로 덜 억제한다', '긴 정답의 토큰당 보상을 키운다', '편향이 없다'], answer: 1,
        explain: '오답의 advantage는 음수인데 토큰당 가중치가 $\\hat A_i/|o_i|$라 길수록 벌점이 희석된다. 계산기에서 오답 길이를 늘리면 확인할 수 있다.' },
      { q: 'KL 정규화된 RLVR의 최적 정책에서 $\\beta \\to 0$이면?', options: ['균등분포', '보상이 가장 큰 응답 하나에 확률 1', '정답으로 조건화한 기준 모델 분포 $\\pi_{\\text{ref}}(y|x,\\text{정답})$', '기준 모델 그대로'], answer: 2,
        explain: '$\\pi^* \\propto \\pi_{\\text{ref}}e^{r/\\beta}$에서 정답의 가중치만 무한히 커지므로 오답의 질량이 0이 되고, 정답들 사이의 상대 비율은 $\\pi_{\\text{ref}}$ 그대로 남는다. 거절 샘플링과 같은 분포다.' },
    ],
  });

  /* ---------- 채점자가 되어 보기 ---------- */
  function mountGrader(el) {
    const sols = [
      { t: '봉지 4개에 3개씩이면 12개. 2개를 먹었으니 12 − 2 = 10개.', ok: 1 },
      { t: '3 + 4 = 7개에서 2개를 먹었으니 5개.', ok: 0 },
      { t: '모두 12개, 남은 건 10개.', ok: 1 },
      { t: '한 봉지에 3개, 네 봉지면 12개. 먹은 건 2봉지니까 12 − 6 = 6개.', ok: 0 },
      { t: '3 × 4 = 12, 12 − 2 = 10. 검산: 10 + 2 = 12로 맞다. 답 10개.', ok: 1 },
      { t: '답: 10개.', ok: 1 },
    ];
    const N = sols.length, eta = 2;
    const p = ui.panel(el, { kind: 'TRY', title: '내가 채점 프로그램: 풀이 6개 채점하기', caption: '각 풀이 아래의 "맞음" 또는 "틀림"을 누른다. 6개를 모두 채점하면 각 풀이가 다음에 더 자주 쓰일지(초록) 덜 쓰일지(빨강)가 막대로 나타난다. "모두 맞음"을 누르면 신호가 모두 0이 되는 경우를 볼 수 있다.' });
    const prob = document.createElement('div');
    prob.className = 'fx-detail';
    prob.innerHTML = '<strong>문제</strong>: 사과가 3개씩 든 봉지가 4개 있다. 그중 사과 2개를 먹었다. 남은 사과는 몇 개인가?';
    p.body.appendChild(prob);
    const grid = document.createElement('div');
    grid.className = 'grid2';
    grid.style.margin = '0';
    p.body.appendChild(grid);
    let grades = new Array(N).fill(null);
    const cardBtns = sols.map((sol, i) => {
      const c = document.createElement('div');
      c.className = 'card';
      c.innerHTML = '<p style="margin:0 0 8px"><strong>풀이 ' + (i + 1) + '</strong>. ' + sol.t + '</p>';
      const row = ui.row(c, 'btns');
      const yes = ui.button(row, '맞음 (1점)', () => { grades[i] = 1; draw(); });
      const no = ui.button(row, '틀림 (0점)', () => { grades[i] = 0; draw(); });
      grid.appendChild(c);
      return [yes, no];
    });
    const btns = ui.row(p.body, 'btns');
    ui.button(btns, '정답표대로 채점', () => { grades = sols.map((x) => x.ok); draw(); }, { primary: true });
    ui.button(btns, '모두 맞음', () => { grades = grades.map(() => 1); draw(); });
    ui.button(btns, '모두 틀림', () => { grades = grades.map(() => 0); draw(); });
    ui.button(btns, '처음부터', () => { grades = new Array(N).fill(null); draw(); });
    const msg = document.createElement('div');
    msg.className = 'fx-detail';
    msg.setAttribute('role', 'status');
    p.body.appendChild(msg);
    const split = document.createElement('div');
    split.className = 'w-split';
    const L = document.createElement('div'), R = document.createElement('div');
    split.append(L, R);
    p.body.appendChild(split);
    const cats = sols.map((_, i) => '풀이' + (i + 1));
    const ab = plot.bars(L, { categories: cats, series: [], height: 220, y: { min: -2.4, max: 2.4, label: '받는 신호 (advantage)' }, legend: false, labels: true, labelFmt: (v) => (v > 0 ? '+' : '') + v.toFixed(2) });
    const pb = plot.bars(R, { categories: cats, series: [], height: 220, y: { min: 0, max: 0.5, label: '다음에 쓸 확률' } });
    const note = document.createElement('p');
    note.className = 'w-caption';
    note.innerHTML = '풀이 6은 과정 없이 답만 적었는데도 풀이 5와 똑같은 신호를 받는다. 최종 답만 보는 채점기(결과 보상)의 한계이고, 아래에서 볼 과정 보상(PRM)이 나온 이유다.';
    p.body.appendChild(note);
    function draw() {
      cardBtns.forEach(([yes, no], i) => {
        yes.setAttribute('aria-pressed', String(grades[i] === 1));
        no.setAttribute('aria-pressed', String(grades[i] === 0));
      });
      const done = grades.filter((g) => g != null).length;
      const uni = new Array(N).fill(1 / N);
      if (done < N) {
        msg.innerHTML = '아직 ' + (N - done) + '개를 채점하지 않았다. 6개를 모두 채점하면 신호가 계산된다. 정답은 10개다.';
        ab.update({ series: [{ name: '신호', values: new Array(N).fill(0), colors: new Array(N).fill('c6') }] });
        pb.update({ series: [{ name: '채점 전', color: 'c6', values: uni, opacity: 0.6 }] });
        return;
      }
      const m = sim.mean(grades), sd = sim.std(grades);
      const A = grades.map((g) => (sd > 1e-9 ? (g - m) / sd : 0));
      const after = sim.softmax(A.map((a) => (eta * a) / N));
      const k = sim.sum(grades);
      const wrongKey = sim.range(N).filter((i) => grades[i] !== sols[i].ok).map((i) => i + 1);
      let t;
      if (sd < 1e-9) t = '6개 모두 ' + (k ? '맞음' : '틀림') + '으로 채점했다. 모든 풀이의 점수가 평균과 같아서 <strong>어떤 풀이도 신호를 받지 않는다</strong>. 이 문제에 쓴 계산은 학습에 아무 영향이 없다. DAPO 같은 방법은 이런 문제를 버리고 다른 문제를 다시 뽑는다.';
      else t = '6개 중 ' + k + '개가 맞았다. 평균은 ' + m.toFixed(2) + '이다. 맞힌 풀이는 <span class="col-good">' + ((1 - m) / sd).toFixed(2) + '</span>, 틀린 풀이는 <span class="col-bad">' + ((0 - m) / sd).toFixed(2) + '</span>만큼의 신호를 받는다. 맞힌 풀이가 적을수록 맞힌 풀이 하나가 받는 칭찬이 커진다.';
      if (wrongKey.length) t += ' <strong>정답표와 다르게 채점한 풀이: ' + wrongKey.join(', ') + '번.</strong> 채점기가 틀리면 틀린 풀이를 칭찬하게 되고, 모델은 그 실수를 그대로 배운다.';
      msg.innerHTML = t;
      ab.update({ series: [{ name: '신호', values: A, colors: A.map((a) => (a > 1e-9 ? 'good' : a < -1e-9 ? 'bad' : 'c6')) }] });
      pb.update({ series: [
        { name: '채점 전 (모두 같은 확률)', color: 'c6', values: uni, opacity: 0.6 },
        { name: '한 번 고친 뒤', color: 'c1', values: after },
      ] });
    }
    draw();
  }

  /* ---------- GRPO 그룹 계산기 ---------- */
  function mountGRPOCalc(el) {
    const p = ui.panel(el, { kind: 'CALC', title: '한 그룹의 advantage와 토큰 가중치', caption: '"정답/오답" 버튼과 길이 칸을 바꾸면 결과가 바로 바뀐다. 아래 막대는 각 응답의 토큰 하나가 받는 신호다(초록은 올리기, 빨강은 내리기). GRPO에서 오답의 길이를 늘리면 빨간 막대가 짧아지고, 손실 정규화를 Dr. GRPO로 바꾸면 막대 길이가 응답 길이와 무관해진다.' });
    const ctr = ui.row(p.body);
    let G = 8;
    let correct = [1, 0, 1, 0, 0, 1, 0, 1];
    let lens = [420, 610, 380, 1200, 900, 300, 1500, 700];
    let mode = 'grpo';
    const Lconst = 2048;
    const stdC = ui.checkbox(ctr, { label: '표준편차로 나누기 (GRPO 기본)', value: true, onChange: draw });
    ui.select(ctr, { label: '손실 정규화', value: mode, options: [
      { value: 'grpo', label: 'GRPO: 응답별 길이 평균' },
      { value: 'dapo', label: 'DAPO: 그룹 토큰 평균' },
      { value: 'dr', label: 'Dr. GRPO: 상수 L = 2048' },
    ], onChange: (v) => { mode = v; draw(); } });
    ui.slider(ctr, { label: '그룹 크기 $G$', min: 2, max: 12, step: 1, value: G, format: ui.fmt.int, onInput: (v) => { resize(v); } });
    const btns = ui.row(p.body, 'btns');
    ui.button(btns, '섞인 그룹', () => { const r = sim.rng(7); correct = sim.range(G).map(() => (r() < 0.45 ? 1 : 0)); if (correct.every((c) => c === correct[0])) correct[0] = 1 - correct[0]; buildRows(); draw(); });
    ui.button(btns, '전부 정답', () => { correct = correct.map(() => 1); buildRows(); draw(); });
    ui.button(btns, '전부 오답', () => { correct = correct.map(() => 0); buildRows(); draw(); });
    ui.button(btns, '하나만 정답', () => { correct = correct.map((_, i) => (i === 0 ? 1 : 0)); buildRows(); draw(); });
    const st = ui.stats(p.body, [
      { key: 'p', label: '그룹 정답률 $\\hat p$' },
      { key: 'sd', label: '보상 표준편차' },
      { key: 'sig', label: '학습 신호', tone: 'accent' },
      { key: 'ratio', label: '토큰당 벌점: 최장 오답 / 최단 오답', tone: 'signal' },
    ]);
    const tw = document.createElement('div');
    tw.className = 'table-wrap';
    tw.style.margin = '0';
    const chartEl = document.createElement('div');
    p.body.append(tw, chartEl);
    const ch = plot.bars(chartEl, { categories: [], series: [], height: 220, y: { label: '토큰당 가중치 (×10⁻³)' }, legend: false, labels: true, labelFmt: (v) => v.toFixed(2) });
    const inpStyle = 'width:5.5em;font:inherit;font-size:0.85rem;padding:2px 6px;border:1px solid var(--line);border-radius:6px;background:var(--surface);color:var(--ink)';
    let cells = [];

    function resize(n) {
      const r = sim.rng(n * 13);
      while (correct.length < n) { correct.push(r() < 0.4 ? 1 : 0); lens.push(200 + Math.round(r() * 1400)); }
      correct = correct.slice(0, n); lens = lens.slice(0, n); G = n;
      buildRows(); draw();
    }
    function buildRows() {
      tw.innerHTML = '<table class="t"><thead><tr><th>#</th><th>판정</th><th>길이 |o|</th><th class="num">보상</th><th class="num">advantage</th><th class="num">토큰당 ×10⁻³</th><th class="num">응답 총 가중치</th></tr></thead><tbody></tbody></table>';
      const tb = tw.querySelector('tbody');
      cells = [];
      for (let i = 0; i < G; i++) {
        const tr = document.createElement('tr');
        const idc = 'reasoning-len-' + i;
        tr.innerHTML = '<td>' + (i + 1) + '</td><td></td><td><input type="number" id="' + idc + '" min="1" max="4096" step="10" value="' + lens[i] + '" style="' + inpStyle + '" aria-label="응답 ' + (i + 1) + ' 길이"></td><td class="num"></td><td class="num"></td><td class="num"></td><td class="num"></td>';
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'btn';
        b.style.padding = '3px 10px';
        const setB = () => { b.textContent = correct[i] ? '정답' : '오답'; b.style.color = correct[i] ? 'var(--good)' : 'var(--bad)'; b.setAttribute('aria-pressed', String(!!correct[i])); };
        setB();
        b.addEventListener('click', () => { correct[i] = 1 - correct[i]; setB(); draw(); });
        tr.children[1].appendChild(b);
        const inp = tr.querySelector('input');
        inp.addEventListener('input', () => { const v = Math.max(1, Math.min(4096, Math.round(+inp.value || 1))); lens[i] = v; draw(); });
        tb.appendChild(tr);
        cells.push(tr.children);
      }
    }
    function draw() {
      const rew = correct.slice(0, G);
      const m = sim.mean(rew), sd = sim.std(rew);
      const useStd = stdC.get();
      const A = rew.map((x) => (useStd ? (x - m) / (sd + 1e-6) : x - m));
      const tot = sim.sum(lens);
      const per = A.map((a, i) => (mode === 'grpo' ? a / (G * lens[i]) : mode === 'dapo' ? a / tot : a / (G * Lconst)));
      for (let i = 0; i < G; i++) {
        const c = cells[i];
        if (!c) continue;
        c[3].textContent = rew[i];
        c[4].textContent = A[i].toFixed(3);
        c[5].textContent = (per[i] * 1000).toFixed(3);
        c[6].textContent = (per[i] * lens[i]).toFixed(3);
      }
      const pv = per.map((x) => x * 1000);
      const vmin = Math.min(0, ...pv), vmax = Math.max(0, ...pv);
      const span = Math.max(1e-6, vmax - vmin);
      ch.update({ categories: sim.range(G).map((i) => '#' + (i + 1)), y: { label: '토큰당 가중치 (×10⁻³)', min: vmin < 0 ? vmin - 0.25 * span : 0, max: vmax > 0 ? vmax + 0.18 * span : 0.1 }, series: [{ name: '토큰당 가중치', values: pv, colors: rew.map((x) => (x ? 'good' : 'bad')) }] });
      st.set('p', m.toFixed(3));
      st.set('sd', sd.toFixed(3));
      st.set('sig', sd < 1e-9 ? '0 (그룹 폐기 대상)' : '있음');
      const wrong = sim.range(G).filter((i) => !rew[i]);
      if (wrong.length >= 2 && sd > 1e-9) {
        const lmax = wrong.reduce((a, i) => (lens[i] > lens[a] ? i : a), wrong[0]);
        const lmin = wrong.reduce((a, i) => (lens[i] < lens[a] ? i : a), wrong[0]);
        st.set('ratio', (per[lmax] / per[lmin]).toFixed(3));
      } else st.set('ratio', '–');
    }
    buildRows();
    draw();
  }

  /* ---------- 그룹 학습 동역학 장난감 ---------- */
  function mountGRPOSim(el) {
    const P = 200, K = 6, B = 64, ITERS = 300;
    const p = ui.panel(el, { kind: 'SIM', title: '전략 6개 · 문제 200개 세계의 GRPO 학습', caption: '"다시 학습"이나 "애니메이션으로 보기"를 누르면, 위 그래프에서 파란 선(한 번에 맞힐 확률)은 오르는데 주황 선(16번 중 한 번이라도 맞힐 확률)은 내려간다. KL 계수를 올리면 그 하락 폭이 줄어든다.' });
    const ctr = ui.row(p.body);
    const gS = ui.slider(ctr, { label: '그룹 크기 $G$', min: 2, max: 16, step: 1, value: 8, format: ui.fmt.int, onInput: () => run(false) });
    const lrS = ui.slider(ctr, { label: '학습률', min: 0.1, max: 2, step: 0.05, value: 0.6, format: ui.fmt.f(2), onInput: () => run(false) });
    const bS = ui.slider(ctr, { label: 'KL 계수 $\\beta$', min: 0, max: 0.3, step: 0.01, value: 0, format: ui.fmt.f(2), onInput: () => run(false) });
    const stdC = ui.checkbox(ctr, { label: '표준편차 정규화', value: true, onChange: () => run(false) });
    const btns = ui.row(p.body, 'btns');
    let seed = 1;
    ui.button(btns, '다시 학습 (새 시드)', () => { seed++; run(false); }, { primary: true });
    const animB = ui.button(btns, '애니메이션으로 보기', () => run(true));
    const st = ui.stats(p.body, [
      { key: 'p1', label: 'pass@1 기준 → 현재', tone: 'accent' },
      { key: 'p16', label: 'pass@16 기준 → 현재', tone: 'signal' },
      { key: 'z', label: '신호 없는 그룹 비율' },
      { key: 'H', label: '정책 엔트로피 / log K' },
      { key: 'x', label: 'pass@k 역전 지점 k' },
    ]);
    const top = document.createElement('div');
    const split = document.createElement('div');
    split.className = 'w-split';
    const L = document.createElement('div'), R = document.createElement('div');
    split.append(L, R);
    p.body.append(top, split);
    const lc = plot.line(top, { height: 250, x: { label: '반복 (배치 64문제 × G)', min: 0, max: ITERS }, y: { min: 0, max: 1, label: '비율' }, series: [] });
    const bar = plot.bars(L, { categories: ['전략1', '2', '3', '4', '5', '6'], series: [], height: 220, y: { min: 0, max: 1, label: '선택 확률' } });
    const pk = plot.line(R, { height: 220, x: { log: true, min: 1, max: 256, label: 'k (로그 축)' }, y: { min: 0, max: 1, label: 'pass@k' }, series: [] });
    const ks = [1, 2, 3, 4, 6, 8, 12, 16, 24, 32, 48, 64, 96, 128, 192, 256];

    function world(sd) {
      const r = sim.rng(sd);
      const a = [1.0, 0.4, 0.1, -0.2, -0.5, -0.8];
      const s = [];
      for (let x = 0; x < P; x++) {
        const d = r.normal() * 1.1;
        const niche = r() < 0.3;
        const n = 1 + r.int(K - 1);
        const row = [];
        for (let k = 0; k < K; k++) row.push(niche ? (k === n ? sim.sigmoid(2 * (0.6 - d)) : 0.01) : sim.sigmoid(2 * (a[k] - d)));
        s.push(row);
      }
      return s;
    }
    const base = [0.35, 0.25, 0.15, 0.12, 0.08, 0.05];
    const lbase = base.map(Math.log);
    function perPrompt(s, pi) { return s.map((row) => row.reduce((acc, v, k) => acc + v * pi[k], 0)); }
    function passK(px, k) { return sim.mean(px.map((q) => 1 - Math.pow(1 - q, k))); }

    let lp = null;
    function run(animate) {
      if (lp) lp.stop();
      const s = world(100 + seed);
      const r = sim.rng(900 + seed);
      const G = gS.get(), lr = lrS.get(), beta = bS.get(), useStd = stdC.get();
      const th = lbase.slice();
      const pxBase = perPrompt(s, base);
      const hist = { p1: [], p16: [], z: [], H: [] };
      const record = (it) => {
        const pi = sim.softmax(th);
        const px = perPrompt(s, pi);
        hist.p1.push([it, sim.mean(px)]);
        hist.p16.push([it, passK(px, 16)]);
        hist.z.push([it, sim.mean(px.map((q) => Math.pow(q, G) + Math.pow(1 - q, G)))]);
        hist.H.push([it, sim.entropy(pi) / Math.log(K)]);
      };
      const step = () => {
        const pi = sim.softmax(th);
        const g = new Array(K).fill(0);
        for (let b = 0; b < B; b++) {
          const x = r.int(P);
          const kk = [], rr = [];
          for (let i = 0; i < G; i++) { const k = r.choice(pi); kk.push(k); rr.push(r() < s[x][k] ? 1 : 0); }
          const m = sim.mean(rr), sd = sim.std(rr);
          if (sd < 1e-9) continue;
          for (let i = 0; i < G; i++) {
            const A = useStd ? (rr[i] - m) / sd : rr[i] - m;
            for (let k = 0; k < K; k++) g[k] += A * ((k === kk[i] ? 1 : 0) - pi[k]) / (B * G);
          }
        }
        if (beta > 0) {
          const l = pi.map((q, k) => Math.log(q) - lbase[k]);
          const el2 = sim.sum(pi.map((q, k) => q * l[k]));
          for (let k = 0; k < K; k++) g[k] -= beta * pi[k] * (l[k] - el2);
        }
        for (let k = 0; k < K; k++) th[k] += lr * g[k];
      };
      const render = () => {
        const pi = sim.softmax(th);
        const px = perPrompt(s, pi);
        lc.update({ series: [
          { name: 'pass@1', color: 'c1', data: hist.p1 },
          { name: 'pass@16', color: 'c2', data: hist.p16 },
          { name: '신호 없는 그룹 비율', color: 'c4', data: hist.z },
          { name: '엔트로피 / log K', color: 'c6', data: hist.H, dash: '5 4' },
        ] });
        bar.update({ series: [
          { name: '기준 모델', color: 'c6', values: base, opacity: 0.6 },
          { name: '현재 정책', color: 'c1', values: pi },
        ] });
        const bk = ks.map((k) => [k, passK(pxBase, k)]);
        const ck = ks.map((k) => [k, passK(px, k)]);
        pk.update({ series: [
          { name: '기준 모델', color: 'c6', dash: '5 4', data: bk, markers: true },
          { name: '현재 정책', color: 'c1', data: ck, markers: true },
        ] });
        st.set('p1', (sim.mean(pxBase) * 100).toFixed(1) + '% → ' + (sim.mean(px) * 100).toFixed(1) + '%');
        st.set('p16', (passK(pxBase, 16) * 100).toFixed(1) + '% → ' + (passK(px, 16) * 100).toFixed(1) + '%');
        const z = hist.z[hist.z.length - 1];
        st.set('z', z ? ui.fmt.pct(z[1]) : '–');
        st.set('H', (sim.entropy(pi) / Math.log(K)).toFixed(3));
        const cross = ks.find((k) => passK(pxBase, k) > passK(px, k));
        st.set('x', cross ? String(cross) : '256까지 없음');
      };
      let it = 0;
      record(0);
      if (!animate) {
        for (; it < ITERS; it++) { step(); record(it + 1); }
        render();
        animB.textContent = '애니메이션으로 보기';
        return;
      }
      animB.textContent = '재생 중…';
      lp = ui.loop(() => {
        for (let j = 0; j < 4 && it < ITERS; j++, it++) { step(); record(it + 1); }
        render();
        if (it >= ITERS) { animB.textContent = '애니메이션으로 보기'; return false; }
      }, 30);
      lp.start();
    }
    run(false);
  }
})();
