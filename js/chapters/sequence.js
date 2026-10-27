/* 17 시퀀스 모델로서의 RL */
(function () {
  const { ui, sim, plot } = RL;

  RL.chapter({
    id: 'sequence',
    title: '시퀀스 모델로서의 RL',
    subtitle: '보상을 최대화하는 대신, 원하는 결과를 조건으로 주고 그런 결과를 냈던 행동을 따라 한다면? Decision Transformer에서 Algorithm Distillation까지, RL을 지도학습으로 바꾸려는 흐름과 그 한계.',
    time: 35,
    level: '중급',
    prereq: ['offline'],
    theses: ['T9', 'T6'],
    goals: [
      'Decision Transformer의 입력(리턴-투-고, 상태, 행동)과 학습·추론 절차를 설명할 수 있다.',
      '리턴 조건부 정책이 베이즈 규칙으로 행동 정책을 재가중한 것임을 유도하고, 확률적 환경에서 실패하는 이유를 설명할 수 있다.',
      '시뮬레이터로 "목표 리턴 대비 실제 달성 리턴"을 측정해 데이터 최댓값 포화와 운(luck) 조건화 실패를 확인한다.',
      'Algorithm Distillation이 정책이 아니라 학습 알고리즘 자체를 증류한다는 의미를 설명할 수 있다.',
    ],
    html: String.raw`
<p>Transformer는 토큰열의 다음 토큰을 예측하는 데 매우 능하다. 궤적도 토큰열이다. 그렇다면 벨만 방정식도, 정책 경사도 없이 "좋은 궤적처럼 보이는 다음 행동"을 예측하는 것만으로 강화학습을 할 수 있을까? 2021년 Decision Transformer(Chen et al.)와 Trajectory Transformer(Janner et al.)가 이 질문을 본격적으로 던졌다. 답은 "조건부로는 그렇다"이고, 그 조건을 정확히 아는 것이 이 장의 목표다.</p>

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
<p>학습은 순수한 지도학습이다. 데이터 궤적마다 리턴-투-고(RTG)를 계산해 끼워 넣고 행동의 음의 로그우도(연속 행동이면 MSE)를 최소화한다. 추론할 때는 첫 RTG에 <strong>원하는 목표 리턴</strong>을 넣고, 보상을 받을 때마다 $\hat R_{t+1} = \hat R_t - r_t$로 깎아 나간다. "앞으로 이만큼 더 받고 싶다"는 명령을 매 스텝 갱신하는 셈이다.</p>
<div class="key"><span class="label">무엇이 사라졌나</span>벨만 백업, 부트스트랩, $\max$ 연산, 타깃 네트워크가 모두 없다. 그래서 Deadly Triad(T8)와 외삽 착취(15장)가 원천적으로 없다. 대신 보상 정보는 <strong>조건 토큰</strong>으로만 들어간다. 이 선택의 대가가 아래에서 드러난다.</div>

<h2>리턴 조건화는 베이즈 재가중이다</h2>
<div data-w="dv-bayes"></div>
<p>마지막 단계가 핵심이다. 결정적 환경에서는 "높은 리턴을 낸 행동"과 "높은 리턴을 <em>일으키는</em> 행동"이 같다. 확률적 환경에서는 다르다. 도박에서 이긴 궤적을 조건으로 걸면 도박하는 행동이 뽑히지만, 도박을 한다고 이기는 것은 아니다. 조건화(conditioning)는 개입(intervention)이 아니다.</p>

<h2>시뮬레이터: 목표 리턴과 실제 리턴</h2>
<p>5 스텝짜리 단순 과제다. 매 스텝 세 행동 중 하나를 고른다. <strong>안전</strong>은 항상 +1, <strong>대기</strong>는 0, <strong>도박</strong>은 확률 $q$로 +3, 아니면 −2이다. 행동 정책(무작위)으로 모은 오프라인 데이터로 <em>비모수적 Decision Transformer</em>를 만든다. 시점 $t$에서 RTG가 현재 $\hat R_t$에 가장 가까운 데이터 스텝들의 행동 분포를 그대로 정책으로 쓴다. 이것은 무한한 용량의 DT가 수렴할 정책 $p_{\mathcal D}(a\mid t, \hat R)$을 표로 구현한 것이다. 목표 리턴을 바꿔 가며 실제로 롤아웃해 평균 달성 리턴을 잰다.</p>
<div data-w="rcbc-sim"></div>
<ul>
  <li><strong>결정적 환경 ($q = 1$):</strong> 달성 리턴이 대각선 $y = x$를 따라간다. 데이터에 있는 리턴 범위 안에서는 "원하는 만큼" 받는다. 데이터 최댓값을 넘는 목표는 그 최댓값에서 포화한다. 데이터 밖의 결과를 만들어 내지는 못한다.</li>
  <li><strong>확률적 환경 ($q = 0.3$):</strong> 도박의 기댓값은 $5q - 2 = -0.5$로 안전(+1)보다 나쁘다. 그런데 높은 목표를 걸수록 데이터 속 "운 좋게 이긴 도박 궤적"이 조건에 걸려 도박을 고르게 되고, 달성 리턴은 오히려 <strong>떨어진다</strong>. 같은 데이터로 가치 기반 방법(행동별 평균 보상으로 탐욕 선택)은 최적값 5를 그대로 얻는다.</li>
  <li><strong>상위 10% 필터링 BC(%BC)</strong>도 같은 이유로 확률적 환경에서 운을 모방한다. 결정적 환경에서는 매우 강한 기준선이다.</li>
</ul>

<h2>Trajectory Transformer: 시퀀스 모델로 계획하기</h2>
<p>Trajectory Transformer(Janner et al. 2021)는 행동만이 아니라 상태, 보상, 가치까지 모두 이산 토큰으로 바꿔 궤적 전체의 분포 $p(\tau)$를 모델링한다. 그다음 <strong>빔 탐색</strong>으로 "예측 보상 + 가치 추정이 높은" 토큰열을 찾는다. 시퀀스 모델이 곧 세계 모델이고, 빔 탐색이 곧 계획기다. MPC(16장)를 언어 모델의 디코딩 방식으로 구현한 것이며, LLM의 탐색 기반 디코딩(<a href="#test-time">22장</a>)과 같은 모양이다.</p>

<h2>지도학습으로서의 RL: 계보</h2>
<div class="table-wrap"><table class="t">
<thead><tr><th>방법</th><th>조건 / 타깃</th><th>바꾼 것</th><th>한계</th></tr></thead>
<tbody>
<tr><td>Upside-Down RL (Schmidhuber 2019; Srivastava et al. 2019)</td><td>명령 = (원하는 리턴, 남은 시간)</td><td>보상 예측 대신 명령을 입력으로 행동 예측</td><td>명령이 달성 불가능할 때의 행동 미정의</td></tr>
<tr><td>Decision Transformer (Chen et al. 2021)</td><td>RTG 토큰</td><td>GPT 구조로 궤적 전체를 문맥으로</td><td>스티칭 약함, 확률적 환경</td></tr>
<tr><td>Trajectory Transformer (Janner et al. 2021)</td><td>없음 (궤적 분포)</td><td>모델 + 빔 탐색 계획</td><td>추론 비용, 이산화</td></tr>
<tr><td>RvS (Emmons et al. 2021)</td><td>목표 상태 또는 리턴</td><td>Transformer 없이 MLP로도 비슷하다는 분석</td><td>조건 선택에 민감</td></tr>
<tr><td>Online DT (Zheng et al. 2022)</td><td>RTG</td><td>엔트로피 정규화로 온라인 미세조정</td><td>탐험 설계 필요</td></tr>
<tr><td>Gato (Reed et al. 2022)</td><td>프롬프트 시연</td><td>수백 개 과제를 하나의 토큰 모델로 모방</td><td>RL이 아닌 대규모 BC</td></tr>
<tr><td>ESPER / DoC (Paster et al. 2022; Yang et al. 2022)</td><td>운과 독립적인 표현</td><td>환경 확률성과 분리된 조건 학습</td><td>추가 학습 단계</td></tr>
<tr><td>Algorithm Distillation (Laskin et al. 2022)</td><td>여러 에피소드의 학습 이력</td><td>정책이 아닌 학습 과정을 모방</td><td>원천 RL 알고리즘의 데이터 필요</td></tr>
<tr><td>DPT (Lee et al. 2023)</td><td>문맥 데이터 + 최적 행동 라벨</td><td>문맥 안 RL을 지도 사전학습으로</td><td>최적 행동 라벨 필요</td></tr>
</tbody></table></div>

<h2>Algorithm Distillation: 학습 과정 자체를 증류하기</h2>
<p>DT는 <em>정책</em>을 모방한다. Algorithm Distillation(AD, Laskin et al. 2022)은 한 단계 더 나아가 <strong>학습하는 과정</strong>을 모방한다. 여러 과제에서 원천 RL 알고리즘(예: A3C, DQN)이 처음엔 못하다가 점점 잘하게 되는 학습 이력 전체를 기록한다. 그 이력을 <em>여러 에피소드에 걸친</em> 긴 문맥으로 Transformer에 넣고 다음 행동을 예측하게 한다.</p>
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
<p>결과적으로 테스트 과제에서 가중치를 바꾸지 않고도 문맥 안에서 성능이 오르는 <strong>문맥 내 강화학습(in-context RL)</strong>이 나타난다. AD 논문은 원천 알고리즘보다 더 적은 에피소드로 개선되는 경우도 보고했다. 이것은 메타 RL(RL²: Duan et al. 2016; Wang et al. 2016)을 지도학습으로 얻은 것이고, 대전제 T9를 한 단계 위로 올린 것이다. 탐색(학습 과정)을 정책에 상각하는 대신, <strong>학습 알고리즘 자체</strong>를 순전파 한 번에 상각한다.</p>

<h2>DT 대 가치 기반 오프라인 RL</h2>
<div class="table-wrap"><table class="t">
<thead><tr><th>기준</th><th>리턴 조건부 모방 (DT, RvS, %BC)</th><th>가치 기반 (CQL, IQL)</th></tr></thead>
<tbody>
<tr><td>학습 신호</td><td>지도학습 손실. 안정적이고 스케일링이 쉬움</td><td>TD 회귀. 부트스트랩 불안정성 관리 필요</td></tr>
<tr><td>스티칭</td><td>약함. 서로 다른 궤적의 좋은 조각을 이어 붙이려면 DP가 필요</td><td>강함. 벨만 백업이 궤적 사이로 가치를 전파</td></tr>
<tr><td>확률적 환경</td><td>운을 조건화해 실패할 수 있음</td><td>기댓값을 추정하므로 원리적으로 맞음</td></tr>
<tr><td>목표 지정</td><td>목표 리턴이라는 추가 하이퍼파라미터</td><td>불필요 (항상 최대화)</td></tr>
<tr><td>데이터 최댓값 초과</td><td>대체로 불가 (조건이 분포 밖이 됨)</td><td>스티칭으로 가능</td></tr>
<tr><td>긴 문맥 활용</td><td>부분 관측, 다중 에피소드 문맥(AD)에 자연스러움</td><td>별도 순환 구조 필요</td></tr>
</tbody></table></div>
<p>Brandfonbrener et al.(2022)은 리턴 조건부 지도학습이 잘 되려면 환경이 거의 결정적이고 데이터 커버리지가 좋아야 함을 이론적으로 정리했다. 위 시뮬레이터가 그 결과를 작게 재현한 것이다.</p>

<h2>LLM과의 연결</h2>
<div class="grid2">
  <div class="card"><h4>사전학습 = 인터넷 궤적에 대한 BC</h4><p>LLM 사전학습은 사람이 쓴 글이라는 거대한 시연 데이터에 대한 행동 복제다. 다양한 품질이 섞인 데이터를 모방하므로, "전문가처럼 답하라" 같은 프롬프트는 일종의 결과 조건화로 작동한다.</p></div>
  <div class="card"><h4>보상·속성 조건 학습</h4><p>보상 구간을 토큰으로 붙여 학습한 뒤 높은 보상 토큰으로 생성하는 Quark(Lu et al. 2022), 도움 정도 같은 속성 값을 조건으로 SFT하는 SteerLM(Dong et al. 2023)은 DT의 언어 버전이다. 같은 장점(안정적 지도학습)과 같은 한계(조건과 결과의 혼동)를 공유한다.</p></div>
  <div class="card"><h4>문맥 내 개선</h4><p>LLM이 실패 피드백을 문맥에 넣으면 다음 시도에서 나아지는 현상(Reflexion, <a href="#memory">23장</a>)은 AD가 보인 in-context RL과 같은 계열이다. 가중치 업데이트 없이 문맥이 학습 상태 역할을 한다.</p></div>
  <div class="card"><h4>그래서 RL이 여전히 필요하다</h4><p>모방은 데이터 분포를 넘기 어렵다. RLHF와 RLVR(<a href="#rlhf">19장</a>, <a href="#reasoning">21장</a>)은 보상 신호로 데이터에 없던 더 나은 응답 쪽으로 분포를 옮긴다. 이것이 BC와 RL의 근본적 차이다.</p></div>
</div>
`,
    mount: {
      'fx-dt': (el) => ui.formula(el, {
        title: 'Decision Transformer의 학습 목표',
        tex: String.raw`\min_\theta\; \tm{E}{\mathbb{E}_{\tau\sim\mathcal{D}}}\Big[\sum_{t}\, -\log \tm{pi}{\pi_\theta}\big(\tm{a}{a_t} \,\big|\, \tm{ctx}{\hat R_{\le t},\ s_{\le t},\ a_{<t}}\big)\Big],\qquad \tm{R}{\hat R_t = \textstyle\sum_{t'=t}^{T} r_{t'}}`,
        terms: [
          { id: 'E', sym: '\\mathbb{E}_{\\tau\\sim\\mathcal{D}}', label: '오프라인 데이터', desc: '고정된 궤적 데이터셋에서 뽑는다.', long: '환경과의 상호작용이 없다. 데이터에 나쁜 궤적과 좋은 궤적이 섞여 있어야 RTG 조건이 의미를 가진다. 전부 전문가 데이터라면 DT는 사실상 BC다.' },
          { id: 'pi', sym: '\\pi_\\theta', label: '인과 Transformer', desc: '앞선 토큰들만 보는 GPT형 모델.', long: '긴 문맥 덕분에 부분 관측 문제에서 과거를 기억하는 데 유리하다. 다만 실증적으로는 많은 D4RL 과제에서 짧은 문맥으로도 비슷한 성능이 나와, 성능의 큰 부분이 "리턴 조건화" 자체에서 온다는 분석이 있다(RvS).' },
          { id: 'a', sym: 'a_t', label: '예측할 행동', desc: '이산이면 교차엔트로피, 연속이면 MSE.' },
          { id: 'ctx', sym: '\\hat R_{\\le t}, s_{\\le t}, a_{<t}', label: '문맥', desc: 'RTG·상태·행동이 번갈아 놓인 토큰열.', long: 'RTG가 상태 바로 앞에 놓여 "이 상태에서 앞으로 이만큼 받으려면 무엇을 해야 하나"를 묻는 형태가 된다. 시간 단계 임베딩도 함께 더한다.' },
          { id: 'R', sym: '\\hat R_t', label: '리턴-투-고 (RTG)', desc: '지금부터 끝까지의 보상 합. 할인 없음.', long: '학습 때는 데이터의 실제 값, 추론 때는 사용자가 정한 목표에서 받은 보상을 빼 나간 값이다. 학습 때 본 적 없는 크기의 RTG를 넣으면 분포 밖 조건이 되어 행동이 불안정해진다.' },
        ],
      }),
      'dv-bayes': (el) => ui.derivation(el, {
        title: '리턴 조건부 정책 = 행동 정책의 베이즈 재가중',
        steps: [
          { tex: String.raw`(s, a, G) \sim \mathcal{D}:\quad s \sim d^{\pi_\beta},\ \ a \sim \pi_\beta(\cdot|s),\ \ G \sim p(G \mid s, a)`, why: '데이터는 행동 정책 $\\pi_\\beta$가 만들었다. $G$는 그 시점 이후 실제로 받은 리턴(RTG)이며, 이후의 $\\pi_\\beta$ 행동과 환경의 무작위성 모두에 의존한다.' },
          { tex: String.raw`\pi_{\text{RC}}(a \mid s, R) := p_{\mathcal{D}}(a \mid s, G = R)`, why: '무한 용량, 무한 데이터의 리턴 조건부 BC가 수렴하는 정책.' },
          { tex: String.raw`= \frac{\pi_\beta(a|s)\;\hl{p_{\mathcal{D}}(G = R \mid s, a)}}{p_{\mathcal{D}}(G = R \mid s)}`, why: '베이즈 규칙. 행동 정책을 "그 행동 뒤에 목표 리턴이 나올 가능도"로 재가중한다.' },
          { tex: String.raw`\text{비교:}\quad \pi_{\text{AWR}}(a|s) \propto \pi_\beta(a|s)\,\hl{\exp\!\big(A(s,a)/\beta\big)}`, why: 'AWR(15장, T5)도 행동 정책을 재가중한다. 차이는 가중치다. AWR은 <strong>기댓값</strong>(advantage)으로, RC는 특정 결과의 <strong>가능도</strong>로 가중한다.' },
          { tex: String.raw`p(G = R \mid s, a) \ne \mathbb{1}\big[\,\mathbb{E}[G \mid s, \mathrm{do}(a)] = R\,\big]\quad \text{(확률적 환경)}`, why: '결정적 환경에서는 가능도가 결과를 일으키는 행동에 몰린다. 확률적 환경에서는 높은 $R$의 가능도가 "운 좋으면 높게 나오는" 고분산 행동에 몰린다. 조건화는 그 행동을 했을 때의 기대 결과를 보장하지 않는다(Paster et al. 2022; Eysenbach et al. 2022).' },
          { tex: String.raw`R > \max_{\tau\in\mathcal{D}} G(\tau)\;\Rightarrow\; p_{\mathcal{D}}(G = R \mid s) = 0`, why: '데이터 최댓값을 넘는 목표는 분모가 0인 미정의 조건이다. 실제 모델은 가장 가까운 조건으로 외삽하므로 달성 리턴이 포화하거나 불안정해진다.' },
        ],
      }),
      'rcbc-sim': mountRCBC,
    },
    tacit: [
      { tag: 'math', t: '"필터링 BC"는 하나의 가족이다',
        d: '<p>%BC(상위 k% 모방), 리턴 조건부 BC, AWR, 거절 샘플링 미세조정(RAFT), STaR, ReST는 모두 $\\pi_{\\text{new}} \\propto \\pi_\\beta \\cdot w(\\tau)$꼴의 재가중 후 최대우도다. 가중치 $w$가 하드 임계값이면 %BC/거절 샘플링, 결과 가능도면 RCBC, $\\exp(A/\\beta)$면 AWR이다. 새 "지도학습형 RL" 방법을 보면 가장 먼저 "가중치 $w$는 무엇이고, 그것이 기댓값 기반인가 결과 기반인가"를 확인하라. 결과 기반이면 확률적 환경에서 운을 학습한다.</p>' },
      { tag: 'math', t: '스티칭은 동적계획법이 하는 일이다',
        d: '<p>데이터에 A→B를 잘 가는 궤적과 B→C를 잘 가는 궤적만 있고 A→C 궤적은 없다고 하자. 가치 기반 방법은 B의 가치를 통해 두 조각을 이어 A→C를 학습한다. 벨만 백업이 궤적 경계를 넘어 정보를 옮기기 때문이다. 순수 모방은 각 궤적을 통째로 따라 하므로 이것이 원리적으로 어렵다. DT 계열에 가치 함수나 Q 기반 재라벨링을 덧붙인 변형들이 나온 이유다. 스티칭 능력은 "부트스트랩을 하는가"의 다른 이름이다(T6).</p>' },
      { tag: 'practice', t: '목표 리턴은 답을 미리 알려 주는 하이퍼파라미터다',
        d: '<p>DT 논문의 실험은 목표 리턴을 대략 데이터 최댓값 근처로 정해 두었다. 너무 낮으면 일부러 못하고, 너무 높으면 분포 밖 조건이 된다. 실무에서 좋은 목표값을 찾으려면 결국 여러 값으로 롤아웃해 봐야 하는데, 그것은 순수 오프라인 설정과 충돌한다(15장의 하이퍼파라미터 OPE 문제와 같은 함정).</p>' },
      { tag: 'research', t: '시퀀스 모델링의 진짜 이점은 "RL이 지도학습처럼 스케일링된다"는 것',
        d: '<p>DT가 소규모 벤치마크에서 CQL보다 늘 낫지는 않았다. 그럼에도 이 흐름이 중요했던 이유는 학습 신호가 안정적인 교차엔트로피라서 모델·데이터 스케일링, 다중 과제 학습(Gato), 사전학습된 언어 모델 초기화 같은 지도학습의 도구를 그대로 쓸 수 있다는 점이다. 이후 LLM 정렬에서 RL 단계를 지도학습형 목적(DPO, 거절 샘플링)으로 바꾸려는 시도와 정신적으로 같은 방향이다.</p>' },
      { tag: 'algo', t: '문맥 내 RL이 생기려면 문맥에 "보상과 그에 대한 반응"이 들어 있어야 한다',
        d: '<p>AD에서 핵심은 단일 에피소드가 아니라 여러 에피소드에 걸친 문맥이다. 한 에피소드만 보면 모델은 정책을 모방하면 되지만, 개선이 일어나는 학습 이력을 보면 "이전 결과를 보고 행동을 바꾸는 규칙"을 배워야 다음 행동을 맞힐 수 있다. 반대로 학습 이력을 너무 촘촘히 잘라(예: 각 체크포인트의 최종 정책만) 넣으면 개선 신호가 사라져 문맥 내 학습이 나타나지 않는다. 데이터에 무엇이 "예측해야만 하는 구조"로 들어 있는지가 모델이 배우는 알고리즘을 결정한다.</p>' },
    ],
    quiz: [
      { q: 'Decision Transformer를 추론할 때 매 스텝 RTG를 어떻게 갱신하는가?', options: ['그대로 둔다', '$\\hat R_{t+1} = \\hat R_t - r_t$', '$\\hat R_{t+1} = \\gamma \\hat R_t$', '가치망으로 예측한다'], answer: 1,
        explain: '"앞으로 받고 싶은 보상"에서 방금 받은 보상을 뺀다. 학습 때 데이터의 RTG가 정확히 이 관계를 만족하므로 같은 규칙을 쓴다.' },
      { q: '확률적 환경에서 리턴 조건부 정책이 높은 목표에서 오히려 성능이 떨어지는 이유는?', options: ['Transformer의 용량 부족', '높은 리턴의 <em>가능도</em>가 큰 행동(운 좋으면 대박인 고분산 행동)이 선택되는데, 그 행동의 <em>기대</em> 리턴은 낮을 수 있어서', '학습률이 커서', '할인율이 1이라서'], answer: 1,
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

  function mountRCBC(el) {
    const p = ui.panel(el, { kind: 'SIM', title: '비모수적 Decision Transformer: 목표 리턴 대비 달성 리턴', caption: '목표 리턴마다 300회 롤아웃한 평균 달성 리턴(파랑). 점선 대각선은 "목표대로 달성", 주황선은 진짜 최적 기대 리턴, 초록선은 같은 데이터로 행동별 평균 보상을 추정해 탐욕 선택한 가치 기반 정책, 보라선은 상위 10% 필터링 BC다.' });
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
