/* 17 시퀀스 모델로서의 RL */
(function () {
  const { ui, sim, plot } = RL;

  RL.chapter({
    id: 'sequence',
    title: '시퀀스 모델로서의 RL',
    subtitle: '보상을 최대화하는 대신, 원하는 결과를 조건으로 주고 그런 결과를 냈던 행동을 따라 하는 방법이 있다. 이 장은 Decision Transformer에서 Algorithm Distillation까지, RL을 지도학습으로 바꾸려는 흐름과 그 한계를 다룬다.',
    time: 35,
    level: '중급',
    prereq: ['offline'],
    theses: ['T9', 'T6'],
    easy: {
      hook: '"이번 판은 10점을 받고 싶어"라고 주문하면, 과거에 그 점수를 받았던 판들이 하던 행동을 따라 하는 방식이다.',
      intro: '<p>게임 플레이 기록이 잔뜩 있고, 판마다 최종 점수가 적혀 있다. "남은 시간 동안 10점을 더 따려면 지금 무엇을 해야 하나"를 기록에서 찾는다. 비슷한 순간에 실제로 10점을 더 딴 판들이 그때 무엇을 했는지 보고 따라 하면 된다.</p><p>이 방식은 아주 단순하고 안정적이다. 대신 함정이 두 개 있다. 기록에 없는 점수를 주문하면 따라 할 판이 없다. 그리고 운이 좋아서 높은 점수를 받은 판을 따라 하면, 행동은 따라 할 수 있어도 운은 따라 할 수 없다.</p>',
      analogy: '복권 1등 당첨자들의 공통점은 "복권을 샀다"이다. 당첨자를 따라 하면 복권을 사게 되지만, 그렇다고 당첨되지는 않는다. 결과를 조건으로 걸고 따라 하는 방법은 이렇게 결과와 원인을 혼동할 수 있다. 운이 끼어들지 않는 세상(같은 행동이면 항상 같은 결과)에서는 이 문제가 생기지 않는다.',
      path: ['"앞으로 받을 점수"(리턴-투-고)를 작은 점수표로 직접 계산한다', '원하는 점수를 직접 주문하고, 기록보다 높은 점수를 주문하면 어떻게 되는지 본다', '운이 섞인 세상에서 왜 오히려 손해를 보는지 시뮬레이터로 확인한다', '학습 과정 자체를 따라 하는 Algorithm Distillation과 LLM의 관계를 본다'],
      recap: [
        '플레이 기록을 문장처럼 보고, "앞으로 받을 점수"를 앞에 적어 둔 뒤 그 점수를 냈던 행동을 따라 한다.',
        '기록에 있던 점수까지는 원하는 대로 받지만, 기록보다 높은 점수는 만들어 내지 못한다.',
        '운이 결과를 좌우하는 곳에서는 운 좋았던 행동을 따라 하게 되어 손해를 본다. 이때는 평균을 따지는 가치 기반 방법이 맞다.',
      ],
    },
    goals: [
      'Decision Transformer의 입력(리턴-투-고, 상태, 행동)과 학습·추론 절차를 설명할 수 있다.',
      '리턴 조건부 정책이 베이즈 규칙으로 행동 정책을 재가중한 것임을 유도하고, 확률적 환경에서 실패하는 이유를 설명할 수 있다.',
      '시뮬레이터로 "목표 리턴 대비 실제 달성 리턴"을 측정해 데이터 최댓값 포화와 운(luck) 조건화 실패를 확인한다.',
      'Algorithm Distillation이 학습 알고리즘 자체를 증류한다는 말의 의미를 설명할 수 있다.',
    ],
    html: String.raw`
<p>Transformer는 토큰열의 다음 토큰을 잘 예측한다. 궤적도 토큰열이다. 그러면 벨만 방정식도 정책 경사도 없이 "좋은 궤적에 어울리는 다음 행동"을 예측하는 것만으로 강화학습을 할 수 있는지 묻게 된다. 2021년 Decision Transformer(Chen et al.)와 Trajectory Transformer(Janner et al.)가 이 질문을 본격적으로 다뤘다. 답은 "조건이 맞으면 된다"이고, 이 장의 목표는 그 조건을 정확히 아는 것이다.</p>

<h2>궤적은 토큰열이다</h2>
<div class="w wide" style="box-shadow:none"><div class="w-body">
<svg viewBox="0 0 680 120" role="img" aria-label="Decision Transformer 입력 토큰열">
  <g style="font-size:13px;font-family:var(--font-mono)">
    <rect x="10" y="20" width="60" height="34" rx="6" style="fill:var(--signal-soft);stroke:var(--signal)"/><text x="40" y="42" text-anchor="middle" style="fill:var(--ink)">R̂₁</text>
    <rect x="76" y="20" width="60" height="34" rx="6" style="fill:var(--surface-2);stroke:var(--line)"/><text x="106" y="42" text-anchor="middle" style="fill:var(--ink)">s₁</text>
    <rect x="142" y="20" width="60" height="34" rx="6" style="fill:var(--accent-soft);stroke:var(--accent)"/><text x="172" y="42" text-anchor="middle" style="fill:var(--ink)">a₁</text>
    <rect x="222" y="20" width="60" height="34" rx="6" style="fill:var(--signal-soft);stroke:var(--signal)"/><text x="252" y="42" text-anchor="middle" style="fill:var(--ink)">R̂₂</text>
    <rect x="288" y="20" width="60" height="34" rx="6" style="fill:var(--surface-2);stroke:var(--line)"/><text x="318" y="42" text-anchor="middle" style="fill:var(--ink)">s₂</text>
    <rect x="354" y="20" width="60" height="34" rx="6" style="fill:var(--accent-soft);stroke:var(--accent)"/><text x="384" y="42" text-anchor="middle" style="fill:var(--ink)">a₂</text>
    <text x="440" y="42" style="fill:var(--muted)">· · ·</text>
    <rect x="484" y="20" width="60" height="34" rx="6" style="fill:var(--signal-soft);stroke:var(--signal)"/><text x="514" y="42" text-anchor="middle" style="fill:var(--ink)">R̂ₜ</text>
    <rect x="550" y="20" width="60" height="34" rx="6" style="fill:var(--surface-2);stroke:var(--line)"/><text x="580" y="42" text-anchor="middle" style="fill:var(--ink)">sₜ</text>
    <rect x="616" y="20" width="60" height="34" rx="6" style="fill:none;stroke:var(--accent);stroke-dasharray:4 3"/><text x="646" y="42" text-anchor="middle" style="fill:var(--accent)">aₜ ?</text>
  </g>
  <text x="340" y="88" text-anchor="middle" style="fill:var(--muted);font-size:12px">인과 마스크 Transformer가 앞의 모든 토큰을 보고 다음 행동 aₜ를 예측한다</text>
  <text x="340" y="108" text-anchor="middle" style="fill:var(--muted);font-size:12px">R̂ₜ = 지금부터 끝까지 받을 보상의 합 (return-to-go)</text>
</svg></div></div>
<div data-w="fx-dt"></div>
<p>학습은 순수한 지도학습이다. 데이터 궤적마다 리턴-투-고(RTG)를 계산해 끼워 넣고 행동의 음의 로그우도(연속 행동이면 MSE)를 최소화한다. 추론할 때는 첫 RTG에 <strong>원하는 목표 리턴</strong>을 넣고, 보상을 받을 때마다 $\hat R_{t+1} = \hat R_t - r_t$로 깎는다. "앞으로 이만큼 더 받고 싶다"는 명령을 매 스텝 고쳐 쓰는 셈이다.</p>
<div data-w="step-rtg"></div>
<div class="key"><span class="label">무엇이 사라졌나</span>벨만 백업, 부트스트랩, $\max$ 연산, 타깃 네트워크가 모두 없다. 그래서 Deadly Triad(T8)와 외삽 착취(15장)가 처음부터 생기지 않는다. 대신 보상 정보는 <strong>조건 토큰</strong>으로만 들어간다. 이 선택의 대가는 아래에서 드러난다.</div>

<h2>리턴 조건화는 베이즈 재가중이다</h2>
<div data-w="dv-bayes"></div>
<p>요점은 마지막 단계다. 결정적 환경에서는 "높은 리턴을 낸 행동"과 "높은 리턴을 <em>일으키는</em> 행동"이 같다. 확률적 환경에서는 다르다. 도박에서 이긴 궤적을 조건으로 걸면 도박하는 행동이 뽑히지만, 도박을 한다고 이기는 것은 아니다. 조건화(conditioning)는 개입(intervention)이 아니다.</p>

<h2>시뮬레이터: 목표 리턴과 실제 리턴</h2>
<p>5 스텝짜리 단순 과제다. 매 스텝 세 행동 중 하나를 고른다. <strong>안전</strong>은 항상 +1, <strong>대기</strong>는 0, <strong>도박</strong>은 확률 $q$로 +3, 아니면 −2이다. 행동 정책(무작위)으로 모은 오프라인 데이터로 <em>비모수적 Decision Transformer</em>를 만든다. 시점 $t$에서 RTG가 현재 $\hat R_t$에 가장 가까운 데이터 스텝을 모아, 그 행동 분포를 그대로 정책으로 쓴다. 용량이 무한한 DT가 수렴할 정책 $p_{\mathcal D}(a\mid t, \hat R)$을 표로 구현한 셈이다. 목표 리턴을 바꿔 가며 실제로 롤아웃해 평균 달성 리턴을 잰다.</p>
<p>먼저 점수를 직접 주문한다. 아래 판의 규칙은 바로 위 문단과 같다.</p>
<div data-w="try-order"></div>
<div data-w="rcbc-sim"></div>
<ul>
  <li><strong>결정적 환경 ($q = 1$):</strong> 달성 리턴이 대각선 $y = x$를 따라간다. 데이터에 있는 리턴 범위 안에서는 원하는 만큼 받는다. 데이터 최댓값을 넘는 목표는 그 최댓값에서 멈춘다. 데이터 밖의 결과는 만들어 내지 못한다.</li>
  <li><strong>확률적 환경 ($q = 0.3$):</strong> 도박의 기댓값은 $5q - 2 = -0.5$로 안전(+1)보다 나쁘다. 그런데 높은 목표를 걸수록 조건에 맞는 것은 데이터 속 "운 좋게 이긴 도박 궤적"이어서 도박을 고르게 되고, 달성 리턴은 오히려 떨어진다. 같은 데이터로 가치 기반 방법(행동별 평균 보상으로 탐욕 선택)은 최적값 5를 그대로 얻는다.</li>
  <li><strong>상위 10% 필터링 BC(%BC)</strong>도 같은 이유로 확률적 환경에서 운을 모방한다. 결정적 환경에서는 성능이 좋은 기준선이다.</li>
</ul>

<h2>Trajectory Transformer: 시퀀스 모델로 계획하기</h2>
<p>Trajectory Transformer(Janner et al. 2021)는 행동과 함께 상태, 보상, 가치까지 모두 이산 토큰으로 바꿔 궤적 전체의 분포 $p(\tau)$를 모델링한다. 그다음 <strong>빔 탐색</strong>으로 예측 보상과 가치 추정이 높은 토큰열을 찾는다. 시퀀스 모델이 세계 모델 역할을, 빔 탐색이 계획기 역할을 한다. MPC(16장)를 언어 모델의 디코딩 방식으로 구현한 셈이고, LLM의 탐색 기반 디코딩(<a href="#test-time">22장</a>)과 구조가 같다.</p>

<h2>지도학습으로서의 RL: 계보</h2>
<div class="table-wrap"><table class="t">
<thead><tr><th>방법</th><th>조건 / 타깃</th><th>바꾼 것</th><th>한계</th></tr></thead>
<tbody>
<tr><td>Upside-Down RL (Schmidhuber 2019; Srivastava et al. 2019)</td><td>명령 = (원하는 리턴, 남은 시간)</td><td>보상 예측 대신 명령을 입력으로 행동 예측</td><td>명령이 달성 불가능할 때의 행동 미정의</td></tr>
<tr><td>Decision Transformer (Chen et al. 2021)</td><td>RTG 토큰</td><td>GPT 구조로 궤적 전체를 문맥으로</td><td>스티칭 약함, 확률적 환경</td></tr>
<tr><td>Trajectory Transformer (Janner et al. 2021)</td><td>없음 (궤적 분포)</td><td>모델 + 빔 탐색 계획</td><td>추론 비용, 이산화</td></tr>
<tr><td>RvS (Emmons et al. 2021)</td><td>목표 상태 또는 리턴</td><td>Transformer 없이 MLP로도 성능이 비슷함을 보인 분석</td><td>조건 선택에 민감</td></tr>
<tr><td>Online DT (Zheng et al. 2022)</td><td>RTG</td><td>엔트로피 정규화로 온라인 미세조정</td><td>탐험 설계 필요</td></tr>
<tr><td>Gato (Reed et al. 2022)</td><td>프롬프트 시연</td><td>수백 개 과제를 하나의 토큰 모델로 모방</td><td>RL 없이 하는 대규모 BC</td></tr>
<tr><td>ESPER / DoC (Paster et al. 2022; Yang et al. 2022)</td><td>운과 독립적인 표현</td><td>환경 확률성과 분리된 조건 학습</td><td>추가 학습 단계</td></tr>
<tr><td>Algorithm Distillation (Laskin et al. 2022)</td><td>여러 에피소드의 학습 이력</td><td>학습 과정 자체를 모방</td><td>원천 RL 알고리즘의 데이터 필요</td></tr>
<tr><td>DPT (Lee et al. 2023)</td><td>문맥 데이터 + 최적 행동 라벨</td><td>문맥 안 RL을 지도 사전학습으로</td><td>최적 행동 라벨 필요</td></tr>
</tbody></table></div>

<h2>Algorithm Distillation: 학습 과정 자체를 증류하기</h2>
<p>DT는 <em>정책</em>을 모방한다. Algorithm Distillation(AD, Laskin et al. 2022)은 한 단계 더 나아가 <strong>학습하는 과정</strong>을 모방한다. 여러 과제에서 원천 RL 알고리즘(예: A3C, DQN)이 처음에는 못하다가 점점 잘하게 되는 학습 이력 전체를 기록한다. 그 이력을 <em>여러 에피소드에 걸친</em> 긴 문맥으로 Transformer에 넣고 다음 행동을 예측하게 한다.</p>
<div class="w wide" style="box-shadow:none"><div class="w-body">
<svg viewBox="0 0 680 110" role="img" aria-label="Algorithm Distillation 문맥">
  <g style="font-size:12px">
    <rect x="10" y="18" width="150" height="34" rx="6" style="fill:color-mix(in srgb, var(--neg) 18%, var(--surface));stroke:var(--line)"/><text x="85" y="40" text-anchor="middle" style="fill:var(--ink)">에피소드 1 (리턴 낮음)</text>
    <rect x="170" y="18" width="150" height="34" rx="6" style="fill:color-mix(in srgb, var(--neg) 6%, var(--surface));stroke:var(--line)"/><text x="245" y="40" text-anchor="middle" style="fill:var(--ink)">에피소드 2</text>
    <rect x="330" y="18" width="150" height="34" rx="6" style="fill:color-mix(in srgb, var(--pos) 14%, var(--surface));stroke:var(--line)"/><text x="405" y="40" text-anchor="middle" style="fill:var(--ink)">에피소드 3</text>
    <rect x="490" y="18" width="180" height="34" rx="6" style="fill:color-mix(in srgb, var(--pos) 30%, var(--surface));stroke:var(--accent);stroke-dasharray:4 3"/><text x="580" y="40" text-anchor="middle" style="fill:var(--ink)">다음 행동 예측 → 더 나아짐</text>
  </g>
  <text x="340" y="82" text-anchor="middle" style="fill:var(--muted);font-size:12px">문맥에 이전 시도와 그 보상이 들어 있으므로, 모델은 "보상을 보고 행동을 고치는 규칙"을 배워야 손실이 줄어든다</text>
</svg></div></div>
<p>그 결과 테스트 과제에서 가중치를 바꾸지 않고도 문맥 안에서 성능이 오르는 <strong>문맥 내 강화학습(in-context RL)</strong>이 나타난다. AD 논문은 원천 알고리즘보다 적은 에피소드로 개선되는 경우도 보고했다. 메타 RL(RL²: Duan et al. 2016; Wang et al. 2016)을 지도학습으로 얻은 셈이고, 대전제 T9를 한 단계 위로 올린 셈이다. 탐색 결과를 정책에 상각하는 데서 그치지 않고, 학습 알고리즘 자체를 순전파 한 번에 상각한다.</p>

<h2>DT 대 가치 기반 오프라인 RL</h2>
<div class="table-wrap"><table class="t">
<thead><tr><th>기준</th><th>리턴 조건부 모방 (DT, RvS, %BC)</th><th>가치 기반 (CQL, IQL)</th></tr></thead>
<tbody>
<tr><td>학습 신호</td><td>지도학습 손실. 안정적이고 스케일링이 쉬움</td><td>TD 회귀. 부트스트랩 불안정성 관리 필요</td></tr>
<tr><td>스티칭</td><td>약함. 서로 다른 궤적의 좋은 조각을 이어 붙이려면 DP가 필요</td><td>강함. 벨만 백업이 궤적 사이로 가치를 전파</td></tr>
<tr><td>확률적 환경</td><td>운을 조건으로 삼아 실패할 수 있음</td><td>기댓값을 추정하므로 원리적으로 맞음</td></tr>
<tr><td>목표 지정</td><td>목표 리턴이라는 추가 하이퍼파라미터</td><td>불필요 (항상 최대화)</td></tr>
<tr><td>데이터 최댓값 초과</td><td>대체로 불가 (조건이 분포 밖이 됨)</td><td>스티칭으로 가능</td></tr>
<tr><td>긴 문맥 활용</td><td>부분 관측, 다중 에피소드 문맥(AD)에 자연스러움</td><td>별도 순환 구조 필요</td></tr>
</tbody></table></div>
<p>Brandfonbrener et al.(2022)은 리턴 조건부 지도학습이 잘 되려면 환경이 거의 결정적이고 데이터 커버리지가 좋아야 함을 이론적으로 정리했다. 위 시뮬레이터는 그 결과를 작게 재현한 것이다.</p>

<h2>LLM과의 연결</h2>
<div class="grid2">
  <div class="card"><h4>사전학습 = 인터넷 궤적의 BC</h4><p>LLM 사전학습은 사람이 쓴 글이라는 거대한 시연 데이터를 행동 복제하는 일이다. 품질이 제각각인 데이터를 모방하므로, "전문가처럼 답하라" 같은 프롬프트는 일종의 결과 조건화로 작동한다.</p></div>
  <div class="card"><h4>보상·속성 조건 학습</h4><p>보상 구간을 토큰으로 붙여 학습한 뒤 높은 보상 토큰으로 생성하는 Quark(Lu et al. 2022), 도움 정도 같은 속성 값을 조건으로 SFT하는 SteerLM(Dong et al. 2023)은 DT의 언어 버전이다. 장점(안정적 지도학습)과 한계(조건과 결과의 혼동)도 DT와 같다.</p></div>
  <div class="card"><h4>문맥 내 개선</h4><p>실패 피드백을 문맥에 넣으면 LLM이 다음 시도에서 나아지는 현상(Reflexion, <a href="#memory">23장</a>)은 AD가 보인 문맥 내 RL과 같은 계열이다. 가중치 업데이트 없이 문맥이 학습 상태 역할을 한다.</p></div>
  <div class="card"><h4>그래서 RL이 여전히 필요하다</h4><p>모방은 데이터 분포를 넘기 어렵다. RLHF와 RLVR(<a href="#rlhf">19장</a>, <a href="#reasoning">21장</a>)은 보상 신호를 써서 데이터에 없던 더 나은 응답 쪽으로 분포를 옮긴다. BC와 RL은 이 점에서 근본적으로 다르다.</p></div>
</div>
`,
    mount: {
      'fx-dt': (el) => ui.formula(el, {
        title: 'Decision Transformer의 학습 목표',
        say: '{E|기록에 있는 판들에서}, {ctx|"앞으로 받을 점수"와 지금까지의 상황·행동을 보고} {a|그때 실제로 한 행동}을 {pi|모델}이 맞히도록 학습한다. {R|앞으로 받을 점수}는 지금부터 끝까지 받은 점수를 모두 더한 값이다.',
        tex: String.raw`\min_\theta\; \tm{E}{\mathbb{E}_{\tau\sim\mathcal{D}}}\Big[\sum_{t}\, -\log \tm{pi}{\pi_\theta}\big(\tm{a}{a_t} \,\big|\, \tm{ctx}{\hat R_{\le t},\ s_{\le t},\ a_{<t}}\big)\Big],\qquad \tm{R}{\hat R_t = \textstyle\sum_{t'=t}^{T} r_{t'}}`,
        terms: [
          { id: 'E', sym: '\\mathbb{E}_{\\tau\\sim\\mathcal{D}}', label: '오프라인 데이터', desc: '고정된 궤적 데이터셋에서 뽑는다.', long: '환경과의 상호작용이 없다. 데이터에 나쁜 궤적과 좋은 궤적이 섞여 있어야 RTG 조건이 의미가 있다. 전부 전문가 데이터라면 DT는 사실상 BC다.' },
          { id: 'pi', sym: '\\pi_\\theta', label: '인과 Transformer', desc: '앞선 토큰들만 보는 GPT형 모델.', long: '긴 문맥 덕분에 부분 관측 문제에서 과거를 기억하기 유리하다. 다만 많은 D4RL 과제에서 짧은 문맥으로도 성능이 비슷하게 나와, 성능의 상당 부분이 리턴 조건화 자체에서 온다는 분석이 있다(RvS).' },
          { id: 'a', sym: 'a_t', label: '예측할 행동', desc: '이산이면 교차엔트로피, 연속이면 MSE.' },
          { id: 'ctx', sym: '\\hat R_{\\le t}, s_{\\le t}, a_{<t}', label: '문맥', desc: 'RTG·상태·행동이 번갈아 놓인 토큰열.', long: 'RTG가 상태 바로 앞에 놓여 "이 상태에서 앞으로 이만큼 받으려면 무엇을 해야 하나"를 묻는 형태가 된다. 시간 단계 임베딩도 함께 더한다.' },
          { id: 'R', sym: '\\hat R_t', label: '리턴-투-고 (RTG)', desc: '지금부터 끝까지의 보상 합. 할인 없음.', long: '학습 때는 데이터의 실제 값이고, 추론 때는 사용자가 정한 목표에서 받은 보상을 빼 나간 값이다. 학습 때 본 적 없는 크기의 RTG를 넣으면 분포 밖 조건이 되어 행동이 불안정해진다.' },
        ],
      }),
      'dv-bayes': (el) => ui.derivation(el, {
        title: '리턴 조건부 정책 = 행동 정책의 베이즈 재가중',
        easy: '"R점을 받고 싶다"를 조건으로 걸면, 원래 하던 행동 중 "그 뒤에 R점이 나왔던 비율"이 높은 행동이 더 자주 뽑힌다. 그런데 그 비율이 높다고 그 행동이 R점을 만들어 주는 것은 아니다. 운이 섞이면 둘이 달라진다.',
        steps: [
          { tex: String.raw`(s, a, G) \sim \mathcal{D}:\quad s \sim d^{\pi_\beta},\ \ a \sim \pi_\beta(\cdot|s),\ \ G \sim p(G \mid s, a)`, why: '데이터는 행동 정책 $\\pi_\\beta$가 만들었다. $G$는 그 시점 이후 실제로 받은 리턴(RTG)이며, 이후의 $\\pi_\\beta$ 행동과 환경의 무작위성 모두에 의존한다.' },
          { tex: String.raw`\pi_{\text{RC}}(a \mid s, R) := p_{\mathcal{D}}(a \mid s, G = R)`, why: '용량과 데이터가 무한할 때 리턴 조건부 BC가 수렴하는 정책이다.' },
          { tex: String.raw`= \frac{\pi_\beta(a|s)\;\hl{p_{\mathcal{D}}(G = R \mid s, a)}}{p_{\mathcal{D}}(G = R \mid s)}`, why: '베이즈 규칙으로 정리하면, 행동 정책을 "그 행동 뒤에 목표 리턴이 나올 가능도"로 재가중한 꼴이 된다.' },
          { tex: String.raw`\text{비교:}\quad \pi_{\text{AWR}}(a|s) \propto \pi_\beta(a|s)\,\hl{\exp\!\big(A(s,a)/\beta\big)}`, why: 'AWR(15장, T5)도 행동 정책을 재가중한다. 차이는 가중치다. AWR은 기댓값(advantage)으로, RC는 특정 결과의 <strong>가능도</strong>로 가중한다.' },
          { tex: String.raw`p(G = R \mid s, a) \ne \mathbb{1}\big[\,\mathbb{E}[G \mid s, \mathrm{do}(a)] = R\,\big]\quad \text{(확률적 환경)}`, why: '결정적 환경에서는 가능도가 결과를 일으키는 행동에 몰린다. 확률적 환경에서는 높은 $R$의 가능도가 "운 좋으면 높게 나오는" 고분산 행동에 몰린다. 조건화는 그 행동을 했을 때의 기대 결과를 보장하지 않는다(Paster et al. 2022; Eysenbach et al. 2022).' },
          { tex: String.raw`R > \max_{\tau\in\mathcal{D}} G(\tau)\;\Rightarrow\; p_{\mathcal{D}}(G = R \mid s) = 0`, why: '데이터 최댓값을 넘는 목표는 분모가 0이라 정의되지 않는 조건이다. 실제 모델은 가장 가까운 조건으로 외삽하므로 달성 리턴이 포화하거나 불안정해진다.' },
        ],
      }),
      'rcbc-sim': mountRCBC,
      'try-order': mountOrder,
      'step-rtg': (el) => ui.walkthrough(el, {
        title: '"앞으로 받을 점수"를 손으로 계산하기',
        caption: '다섯 걸음 동안 받은 점수가 차례로 1, 0, 3, −1, 2다. 각 시점에서 "그때부터 끝까지 받을 점수의 합"(리턴-투-고)을 구한다. 칸에 답을 적고 "확인"을 누르면 계산식이 열린다.',
        steps: [
          { say: '맨 처음 시점에서는 앞으로 받을 점수를 전부 더하면 된다. 얼마일까?', ask: { answer: 5 }, calc: String.raw`\hat R_1 = 1 + 0 + 3 + (-1) + 2 = 5` },
          { say: '두 번째 시점에서는 이미 받은 첫 점수 1을 빼면 된다. 얼마일까?', ask: { answer: 4 }, calc: String.raw`\hat R_2 = 5 - 1 = 4` },
          { say: '같은 규칙으로 세 번째와 네 번째 시점도 구한다.', calc: String.raw`\hat R_3 = 4 - 0 = 4,\qquad \hat R_4 = 4 - 3 = 1` },
          { say: '마지막 시점의 남은 점수는?', ask: { answer: 2 }, calc: String.raw`\hat R_5 = 1 - (-1) = 2`, note: '마지막 점수 2와 같다. 끝에서부터 거꾸로 더해도 같은 값이 나온다.' },
          { say: '이제 실제로 쓰는 단계다. 목표 6점을 주문하고 시작했는데 첫 걸음에서 1점을 받았다. 모델에게 넘길 다음 목표는?', ask: { answer: 5 }, calc: String.raw`\hat R_{\text{다음}} = 6 - 1 = 5`, note: '학습 때 기록의 남은 점수가 이 규칙을 정확히 따르므로, 쓸 때도 받은 점수만큼 목표를 깎아 나간다.' },
        ],
      }),
    },
    tacit: [
      { tag: 'math', t: '"필터링 BC"는 하나의 가족이다',
        d: '<p>%BC(상위 k% 모방), 리턴 조건부 BC, AWR, 거절 샘플링 미세조정(RAFT), STaR, ReST는 모두 $\\pi_{\\text{new}} \\propto \\pi_\\beta \\cdot w(\\tau)$꼴의 재가중 후 최대우도다. 가중치 $w$가 하드 임계값이면 %BC/거절 샘플링, 결과 가능도면 RCBC, $\\exp(A/\\beta)$면 AWR이다. 새 지도학습형 RL 방법을 보면 가중치 $w$가 무엇인지, 기댓값에 기반하는지 결과에 기반하는지부터 확인한다. 결과에 기반하면 확률적 환경에서 운을 학습한다.</p>' },
      { tag: 'math', t: '스티칭은 동적계획법이 하는 일이다',
        d: '<p>데이터에 A→B를 잘 가는 궤적과 B→C를 잘 가는 궤적만 있고 A→C 궤적은 없는 경우를 생각한다. 가치 기반 방법은 B의 가치를 매개로 두 조각을 이어 A→C를 학습한다. 벨만 백업이 궤적 경계를 넘어 정보를 옮기기 때문이다. 순수 모방은 각 궤적을 통째로 따라 하므로 이런 연결이 원리적으로 어렵다. DT 계열에 가치 함수나 Q 기반 재라벨링을 덧붙인 변형이 나온 것도 이 때문이다. 스티칭할 수 있느냐는 결국 부트스트랩을 하느냐의 문제다(T6).</p>' },
      { tag: 'practice', t: '목표 리턴은 답을 미리 알려 주는 하이퍼파라미터다',
        d: '<p>DT 논문의 실험은 목표 리턴을 대략 데이터 최댓값 근처로 정해 두었다. 너무 낮으면 일부러 못하고, 너무 높으면 분포 밖 조건이 된다. 실무에서 좋은 목표값을 찾으려면 결국 여러 값으로 롤아웃해 봐야 하는데, 이는 순수 오프라인 설정과 맞지 않는다(15장의 하이퍼파라미터 OPE 문제와 같은 함정이다).</p>' },
      { tag: 'research', t: '시퀀스 모델링의 이점은 RL을 지도학습처럼 키울 수 있다는 데서 나온다',
        d: '<p>DT가 소규모 벤치마크에서 CQL보다 늘 낫지는 않았다. 그래도 이 흐름이 중요했던 것은 학습 신호가 안정적인 교차엔트로피이기 때문이다. 모델과 데이터 규모 키우기, 다중 과제 학습(Gato), 사전학습된 언어 모델로 초기화하기 같은 지도학습의 도구를 그대로 쓸 수 있다. 이후 LLM 정렬에서 RL 단계를 지도학습형 목적(DPO, 거절 샘플링)으로 바꾸려는 시도도 같은 방향이다.</p>' },
      { tag: 'algo', t: '문맥 내 RL이 생기려면 문맥에 보상과, 그 보상을 보고 바뀐 행동이 함께 들어 있어야 한다',
        d: '<p>AD에서 중요한 것은 여러 에피소드에 걸친 문맥이다. 한 에피소드만 보면 모델은 정책을 모방하면 되지만, 개선이 일어나는 학습 이력을 보면 "이전 결과를 보고 행동을 바꾸는 규칙"을 배워야 다음 행동을 맞힐 수 있다. 반대로 학습 이력을 너무 촘촘히 잘라(예: 각 체크포인트의 최종 정책만) 넣으면 개선 신호가 사라져 문맥 내 학습이 나타나지 않는다. 데이터에 어떤 구조가 "예측해야만 하는 형태"로 들어 있는지에 따라 모델이 배우는 알고리즘이 정해진다.</p>' },
    ],
    quiz: [
      { q: 'Decision Transformer를 추론할 때 매 스텝 RTG를 어떻게 갱신하는가?', options: ['그대로 둔다', '$\\hat R_{t+1} = \\hat R_t - r_t$', '$\\hat R_{t+1} = \\gamma \\hat R_t$', '가치망으로 예측한다'], answer: 1,
        explain: '"앞으로 받고 싶은 보상"에서 방금 받은 보상을 뺀다. 학습 때 데이터의 RTG가 정확히 이 관계를 만족하므로 같은 규칙을 쓴다.' },
      { q: '확률적 환경에서 리턴 조건부 정책이 높은 목표에서 오히려 성능이 떨어지는 이유는?', options: ['Transformer의 용량 부족', '높은 리턴의 <em>가능도</em>가 큰 행동(운이 좋으면 크게 버는 고분산 행동)이 선택되는데, 그 행동의 <em>기대</em> 리턴은 낮을 수 있어서', '학습률이 커서', '할인율이 1이라서'], answer: 1,
        explain: '$p(G=R|s,a)$로 재가중하므로 결과와 행동의 상관을 따라간다. 조건화는 개입이 아니다. 가치 기반 방법은 기댓값을 추정해 이 함정을 피한다.' },
      { q: '데이터에 A→B, B→C 궤적만 있을 때 A→C를 가장 자연스럽게 학습하는 방법은?', options: ['리턴 조건부 BC', '상위 10% 필터링 BC', 'Q-learning 계열 (벨만 백업)', 'Gato'], answer: 2,
        explain: '벨만 백업은 B의 가치를 매개로 서로 다른 궤적을 잇는다(스티칭). 순수 모방은 각 궤적을 통째로 따라 한다.' },
      { q: 'Algorithm Distillation이 증류하는 대상은?', options: ['최종 전문가 정책', '보상 함수', '여러 에피소드에 걸친 학습 과정(개선 규칙)', '환경 모델'], answer: 2,
        explain: '학습 이력 전체를 문맥으로 넣어, 보상을 보고 행동을 고치는 규칙을 배우게 한다. 그래서 가중치 업데이트 없이 문맥 안에서 개선된다.' },
    ],
  });

  /* ---------------- 리턴 조건부 BC 시뮬레이터 ---------------- */
  const H = 5;
  const ACT = ['안전 (+1)', '도박 (+3 / −2)', '대기 (0)'];
  function envStep(r, a, q) { if (a === 0) return 1; if (a === 1) return r() < q ? 3 : -2; return 0; }
  function expReward(a, q) { return a === 0 ? 1 : a === 1 ? 5 * q - 2 : 0; }

  function makeDataset(seed, N, beh, q) {
    const r = sim.rng(seed);
    const trajs = [];
    for (let i = 0; i < N; i++) {
      const acts = [], rews = [];
      for (let t = 0; t < H; t++) { const a = r.choice(beh); acts.push(a); rews.push(envStep(r, a, q)); }
      trajs.push({ acts, rews, G: rews.reduce((x, y) => x + y, 0) });
    }
    return trajs;
  }
  function buildIndex(trajs) {
    const idx = sim.range(H).map(() => new Map());
    trajs.forEach((tr) => {
      let rtg = tr.G;
      for (let t = 0; t < H; t++) {
        const m = idx[t];
        if (!m.has(rtg)) m.set(rtg, [0, 0, 0]);
        m.get(rtg)[tr.acts[t]]++;
        rtg -= tr.rews[t];
      }
    });
    return idx.map((m) => ({ keys: [...m.keys()], m }));
  }
  function rcPolicy(ix, t, R) {
    const { keys, m } = ix[t];
    let best = Infinity;
    keys.forEach((k) => { best = Math.min(best, Math.abs(k - R)); });
    const c = [0, 0, 0];
    keys.forEach((k) => { if (Math.abs(k - R) <= best + 1e-9) { const v = m.get(k); c[0] += v[0]; c[1] += v[1]; c[2] += v[2]; } });
    const z = c[0] + c[1] + c[2] || 1;
    return c.map((x) => x / z);
  }

  /* ---------- TRY: 점수를 주문해 보기 ---------- */
  function mountOrder(el) {
    const p = ui.panel(el, { kind: 'TRY', title: '점수를 주문해 보기', caption: '받고 싶은 총점을 칸에 적고 "주문하고 한 판"을 누르면 한 판이 진행되고, 아래 기록에 각 걸음에서 무엇을 따라 했는지가 나온다. 기록 최고 점수보다 높게 주문하거나 세상을 "운이 큰 세상"으로 바꾸면 결과가 달라진다.' });
    const worlds = {
      '1': { label: '운이 끼지 않는 세상 (도박이 항상 +3)', q: 1 },
      '0.3': { label: '운이 큰 세상 (도박은 30%로 +3, 아니면 −2)', q: 0.3 },
    };
    let wk = '1';
    const data = {};
    Object.keys(worlds).forEach((k) => {
      const d = makeDataset(1, 1000, [1 / 3, 1 / 3, 1 / 3], worlds[k].q);
      data[k] = { ix: buildIndex(d), max: Math.max(...d.map((x) => x.G)), mean: sim.mean(d.map((x) => x.G)) };
    });
    const ctr = ui.row(p.body);
    ui.select(ctr, { label: '세상', value: wk, options: Object.keys(worlds).map((k) => ({ value: k, label: worlds[k].label })), onChange: (v) => { wk = v; avg = null; last = null; upd(); } });
    const id = ui.nextId('order');
    const inp = ui.h('input', { id, class: 'inp', type: 'text', inputmode: 'decimal', autocomplete: 'off', value: '8', style: 'width:6em' });
    const inWrap = ui.h('div', { class: 'ctl' }, ui.h('label', { for: id }, ui.h('span', { text: '주문할 총점' })), inp);
    ctr.appendChild(inWrap);
    const btns = ui.row(p.body, 'btns');
    ui.button(btns, '주문하고 한 판', () => play(1), { primary: true });
    ui.button(btns, '같은 주문으로 50판 평균', () => play(50));
    [3, 8, 15, 20].forEach((v) => ui.button(btns, v + '점 주문', () => { inp.value = String(v); play(1); }));
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') play(1); });
    const st = ui.stats(p.body, [
      { key: 'max', label: '기록 속 최고 점수' },
      { key: 'ord', label: '주문한 점수', tone: 'accent' },
      { key: 'got', label: '이번 판에 받은 점수', tone: 'signal' },
      { key: 'avg', label: '50판 평균' },
      { key: 'safe', label: '참고: 매번 "안전"만 고르면' },
    ]);
    const fb = document.createElement('div');
    fb.className = 'fx-detail';
    const log = document.createElement('div');
    log.className = 'log';
    p.body.append(fb, log);
    const r = sim.rng(9);
    let last = null, avg = null;
    const pct = (x) => Math.round(x * 100) + '%';
    function episode(T, verbose) {
      const { ix } = data[wk];
      const q = worlds[wk].q;
      let Rh = T, G = 0;
      const lines = [];
      for (let t = 0; t < H; t++) {
        const pol = rcPolicy(ix, t, Rh);
        const a = r.choice(pol);
        const rw = envStep(r, a, q);
        if (verbose) lines.push((t + 1) + '걸음: 남은 목표 ' + Rh + ' → 기록 속 비슷한 순간의 행동: 안전 ' + pct(pol[0]) + ' · 도박 ' + pct(pol[1]) + ' · 대기 ' + pct(pol[2]) + ' → "' + ACT[a].split(' ')[0] + '" → ' + (rw >= 0 ? '+' : '') + rw + '점 → 남은 목표 ' + (Rh - rw));
        Rh -= rw; G += rw;
      }
      return { G, lines };
    }
    function play(n) {
      const T = Number(String(inp.value).replace(/[^0-9.\-]/g, ''));
      if (!Number.isFinite(T)) { fb.textContent = '숫자로 적는다. 예: 8'; return; }
      const e = episode(T, true);
      last = { T, G: e.G, lines: e.lines };
      if (n > 1) {
        let tot = e.G;
        for (let i = 1; i < n; i++) tot += episode(T, false).G;
        avg = { T, v: tot / n };
      } else if (!avg || avg.T !== T) avg = null;
      upd();
    }
    function upd() {
      const D = data[wk];
      st.set('max', D.max);
      st.set('safe', H + '점 (항상 +1 × ' + H + '걸음)');
      if (!last) {
        st.set('ord', '–'); st.set('got', '–'); st.set('avg', '–');
        fb.textContent = '칸에 원하는 총점을 적거나 아래 버튼(3점, 8점, 15점, 20점)을 누르면 주문이 들어간다.';
        log.textContent = '';
        return;
      }
      st.set('ord', last.T);
      st.set('got', last.G);
      st.set('avg', avg ? avg.v.toFixed(2) + ' (주문 ' + avg.T + ')' : '버튼으로 확인');
      log.textContent = last.lines.join('\n');
      let msg;
      if (last.T > D.max) msg = '기록 속 최고 점수(' + D.max + ')보다 높게 주문했다. 따라 할 판이 없으니 가장 가까운 기록을 따라 하고, 그 이상은 받지 못한다.';
      else if (worlds[wk].q === 1) msg = '운이 끼지 않는 세상에서는 기록 속에 그 점수를 받은 판이 있으면 그 행동을 그대로 따라 해 주문한 점수를 거의 정확히 받는다.';
      else msg = '운이 큰 세상이다. 높은 점수를 주문하면 "도박에서 이긴 판"을 따라 해 도박을 고르게 되는데, 도박은 평균적으로 손해(+3 × 0.3 − 2 × 0.7 = −0.5)다. "같은 주문으로 50판 평균"을 누르면 "매번 안전"(5점)과 비교할 수 있다.';
      if (avg && worlds[wk].q !== 1 && avg.v < H) msg += ' 지금 주문의 50판 평균 ' + avg.v.toFixed(2) + '점은 매번 안전만 골랐을 때의 5점보다 낮다.';
      fb.textContent = msg;
    }
    upd();
  }

  function mountRCBC(el) {
    const p = ui.panel(el, { kind: 'SIM', title: '비모수적 Decision Transformer: 목표 리턴 대비 달성 리턴', caption: 'q 슬라이더를 1(운이 끼지 않는 세상)과 0.3(운이 큰 세상) 사이에서 움직이면, 파란 선이 점선 대각선을 따라가다가 아래로 꺾이는 모습이 보인다. 파란 선은 목표 리턴마다 300회 롤아웃한 평균 달성 리턴이다. 점선 대각선은 "목표대로 달성", 주황선은 진짜 최적 기대 리턴, 초록선은 같은 데이터로 행동별 평균 보상을 추정해 탐욕 선택한 가치 기반 정책, 보라색 선은 상위 10% 필터링 BC다.' });
    const ctr = ui.row(p.body);
    const qS = ui.slider(ctr, { label: '도박 성공 확률 q', min: 0.1, max: 1, step: 0.05, value: 0.3, format: ui.fmt.f(2), onInput: rebuild });
    const nS = ui.slider(ctr, { label: '데이터 궤적 수', min: 100, max: 3000, step: 100, value: 1000, format: ui.fmt.int, onInput: rebuild });
    const gS = ui.slider(ctr, { label: '행동 정책의 도박 비율', min: 0.05, max: 0.9, step: 0.05, value: 0.35, format: ui.fmt.f(2), onInput: rebuild });
    const tS = ui.slider(ctr, { label: '살펴볼 목표 리턴', min: -6, max: 16, step: 1, value: 10, format: ui.fmt.int, onInput: inspect });
    const btns = ui.row(p.body, 'btns');
    let seed = 1;
    ui.button(btns, '데이터 다시 뽑기', () => { seed++; rebuild(); }, { primary: true });
    const st = ui.stats(p.body, [
      { key: 'dmax', label: '데이터 최대 리턴' },
      { key: 'dmean', label: '데이터 평균 리턴' },
      { key: 'opt', label: '최적 기대 리턴', tone: 'signal' },
      { key: 'val', label: '가치 기반 탐욕 정책' },
      { key: 'rc', label: '선택한 목표에서 DT 달성 리턴', tone: 'accent' },
    ]);
    const split = document.createElement('div');
    split.className = 'w-split';
    const L = document.createElement('div'), R = document.createElement('div');
    split.append(L, R);
    p.body.appendChild(split);
    const chart = plot.line(L, { height: 280, x: { min: -6, max: 16, label: '목표 리턴 (조건으로 넣은 값)' }, y: { min: -7, max: 16, label: '평균 달성 리턴' }, series: [], hoverDigits: 2, hoverXDigits: 0 });
    const bars = plot.bars(R, { categories: ['안전', '도박', '대기'], series: [], height: 280, y: { min: 0, max: 1, label: '확률' }, labels: true, labelFmt: (v) => v.toFixed(2) });
    let ix = null, curve = [], q = 0.3;

    function evalTarget(T, M, sd) {
      const r = sim.rng(sd);
      let tot = 0;
      for (let i = 0; i < M; i++) {
        let Rh = T, G = 0;
        for (let t = 0; t < H; t++) {
          const a = r.choice(rcPolicy(ix, t, Rh));
          const rw = envStep(r, a, q);
          Rh -= rw; G += rw;
        }
        tot += G;
      }
      return tot / M;
    }
    function rebuild() {
      q = qS.get();
      const g = gS.get();
      const beh = [(1 - g) / 2, g, (1 - g) / 2];
      const data = makeDataset(seed, nS.get(), beh, q);
      ix = buildIndex(data);
      const dmax = Math.max(...data.map((d) => d.G));
      const dmean = sim.mean(data.map((d) => d.G));
      // 가치 기반: 행동별 평균 보상 추정 → 탐욕
      const sum = [0, 0, 0], cnt = [0, 0, 0];
      data.forEach((d) => d.acts.forEach((a, t) => { sum[a] += d.rews[t]; cnt[a]++; }));
      const est = sum.map((s, i) => (cnt[i] ? s / cnt[i] : -Infinity));
      const aStar = sim.argmax(est);
      const valRet = H * expReward(aStar, q);
      const opt = H * Math.max(1, 5 * q - 2, 0);
      // %BC: 상위 10% 궤적의 시점별 행동 분포를 모방 (기대 리턴은 정확히 계산)
      const sorted = data.slice().sort((a, b) => b.G - a.G);
      const top = sorted.slice(0, Math.max(1, Math.round(data.length * 0.1)));
      let pbc = 0;
      for (let t = 0; t < H; t++) {
        const c = [0, 0, 0];
        top.forEach((d) => c[d.acts[t]]++);
        const z = c[0] + c[1] + c[2];
        pbc += c.reduce((s, x, a) => s + (x / z) * expReward(a, q), 0);
      }
      curve = [];
      for (let T = -6; T <= 16; T++) curve.push([T, evalTarget(T, 300, 7 + T)]);
      chart.update({
        series: [
          { name: '대각선 (목표 = 달성)', color: 'muted', dash: '4 4', data: [[-6, -6], [16, 16]], endDot: false, hover: false },
          { name: 'DT (리턴 조건부 BC)', color: 'c1', data: curve, markers: true },
        ],
        hlines: (Math.abs(opt - valRet) < 1e-9
          ? [{ y: opt, label: '최적 = 가치 기반 ' + opt.toFixed(1), color: 'signal' }]
          : [{ y: opt, label: '최적 ' + opt.toFixed(1), color: 'signal' }, { y: valRet, label: '가치 기반 ' + valRet.toFixed(1), color: 'c3' }]
        ).concat([{ y: pbc, label: '%BC ' + pbc.toFixed(1), color: 'c5' }]),
        vlines: [{ x: dmax, label: '데이터 최대', color: 'muted' }],
      });
      st.set('dmax', dmax);
      st.set('dmean', dmean.toFixed(2));
      st.set('opt', opt.toFixed(2));
      st.set('val', valRet.toFixed(2) + ' (' + ACT[aStar].split(' ')[0] + ')');
      inspect();
    }
    function inspect() {
      const T = tS.get();
      const pol = rcPolicy(ix, 0, T);
      const beh = (function () { const g = gS.get(); return [(1 - g) / 2, g, (1 - g) / 2]; })();
      bars.update({ series: [
        { name: '행동 정책 $\\pi_\\beta$', color: 'c6', values: beh, opacity: 0.6 },
        { name: '$\\pi(a \\mid t{=}0, \\hat R{=}' + T + ')$', color: 'c1', values: pol },
      ] });
      const pt = curve.find((c) => c[0] === T);
      st.set('rc', pt ? pt[1].toFixed(2) : '–');
    }
    rebuild();
  }
})();
