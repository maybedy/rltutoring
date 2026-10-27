/* 19 RLHF: 보상모델과 PPO */
(function () {
  const { ui, sim, plot } = RL;

  RL.chapter({
    id: 'rlhf',
    title: 'RLHF: 보상모델과 PPO',
    subtitle: '좋은 답을 수식으로 적기는 어렵지만, 두 답 중 어느 쪽이 나은지는 사람이 고를 수 있다. 이 비교로 보상 함수를 만들고, KL 페널티를 건 PPO로 정책을 개선한다.',
    time: 40,
    level: '중급 · LLM',
    prereq: ['llm-mdp', 'ppo'],
    theses: ['T5', 'T4', 'T3', 'T7'],
    easy: {
      hook: '좋은 답을 점수로 적기는 어렵지만, 두 답 중 어느 쪽이 나은지는 누구나 고를 수 있다.',
      intro: '<p>챗봇에게 "감기 기운이 있을 때 어떻게 해?"라고 묻는다. 답 두 개를 나란히 보여 주면 사람은 어느 쪽이 나은지 쉽게 고른다.</p><p>이런 선택을 수천 번 모으면 답마다 "사람이 좋아할 만한 정도"를 숫자로 매기는 <strong>채점기</strong>(보상모델)를 만들 수 있다. 그다음 챗봇은 채점기 점수가 높은 답을 더 자주 쓰도록 연습한다. 다만 원래 말투에서 너무 멀어지지 않도록 제한을 둔다.</p>',
      analogy: '학생이 채점 기준을 너무 잘 알면 실력보다 채점자의 버릇에 맞춘 답을 쓰게 된다. 채점자가 긴 답을 좋아한다는 것을 알면 내용 없이 길게만 쓰는 식이다. KL은 이런 학생에게 거는 고삐와 같다. "평소 쓰던 방식에서 너무 멀리 가지 마라"는 규칙이고, 덕분에 답이 채점기를 믿을 수 있는 범위, 즉 사람들이 실제로 비교해 본 답 근처에 머문다.',
      path: [
        '직접 라벨러가 되어 두 답 중 하나를 골라 채점기를 만들어 본다',
        '점수 차이가 "이쪽을 고를 확률"로 바뀌는 계산을 손으로 해 본다',
        '채점기 점수로 챗봇을 연습시키는 과정(PPO)과 KL 제한을 본다',
        '채점기를 너무 믿으면 실제 품질이 떨어지는 현상(과최적화)을 그래프로 본다',
      ],
      recap: [
        '사람은 답에 점수를 매기는 대신 두 답 중 나은 쪽을 고르고, 그 선택을 모아 채점기를 만든다.',
        '챗봇은 채점기 점수가 높은 답을 더 자주 쓰도록 연습하고, 원래 모습에서 너무 멀어지지 않게 제한을 받는다.',
        '채점기 점수를 끝까지 밀어 올리면 챗봇이 채점기의 버릇을 파고들어 실제 품질은 오히려 떨어진다.',
      ],
    },
    goals: [
      'SFT → 보상모델 → PPO로 이어지는 RLHF 파이프라인의 각 단계가 무엇을 학습하는지 설명할 수 있다.',
      '잠재 효용에 Gumbel 잡음을 더한 모형에서 Bradley–Terry 선호확률과 보상모델 손실을 유도할 수 있다.',
      'LLM용 PPO의 토큰 단위 보상 $r_t = -\\beta\\log\\frac{\\pi_\\theta}{\\pi_{\\text{ref}}} + [t=T]\\,r_\\phi$와 GAE 계산을 직접 해 본다.',
      '보상모델 과최적화(Goodhart)가 왜 생기고, KL·앙상블·길이 제어가 각각 무엇을 막는지 설명할 수 있다.',
    ],
    html: String.raw`
<p>사전학습된 LLM은 다음 토큰을 잘 예측하지만, 도움이 되고 정직하며 해롭지 않은 답을 고르도록 훈련되지는 않았다. 그렇다고 "좋은 답"을 보상 함수로 직접 적기도 거의 불가능하다. RLHF(Reinforcement Learning from Human Feedback)는 단순한 방법을 쓴다. <strong>사람에게 점수를 매기게 하는 대신 두 답을 비교하게 한다.</strong> 비교는 절대 점수보다 훨씬 일관되고, 비교 데이터를 모으면 보상 함수를 통계적으로 복원할 수 있다.</p>

<h2>계보: 로봇 다리에서 ChatGPT까지</h2>
<div class="table-wrap"><table class="t">
<thead><tr><th>연구</th><th>환경</th><th>기여</th></tr></thead>
<tbody>
<tr><td>Christiano et al. 2017<br><em>Deep RL from Human Preferences</em></td><td>Atari, MuJoCo</td><td>궤적 조각 두 개를 보여 주고 사람이 고르게 했다. 이 비교로 보상모델을 학습하고 그 보상으로 RL을 돌렸다. 사람 라벨은 상호작용의 1%에 못 미치는 양으로 충분했다.</td></tr>
<tr><td>Ziegler et al. 2019, Stiennon et al. 2020<br><em>Learning to Summarize from HF</em></td><td>언어모델 요약</td><td>LM 정책을 PPO로 미세조정하면서 <strong>SFT 모델 기준의 KL 페널티</strong>를 보상에 넣었다. 보상모델을 지나치게 최적화하면 사람 평가가 다시 떨어지는 현상도 관찰했다.</td></tr>
<tr><td>Ouyang et al. 2022<br><em>InstructGPT</em></td><td>범용 지시 따르기</td><td>SFT → RM → PPO 3단계를 정립했다. 사전학습 손실을 섞는 PPO-ptx로 공개 벤치마크 성능 하락("alignment tax")을 줄였다.</td></tr>
<tr><td>Bai et al. 2022a, 2022b<br><em>HH-RLHF, Constitutional AI</em></td><td>도움 · 무해성</td><td>새 정책의 샘플로 RM을 주기적으로 갱신하는 반복형(online) RLHF를 썼다. 원칙 목록을 보고 AI가 비교 라벨을 만드는 RLAIF도 제안했다.</td></tr>
</tbody></table></div>

<h2>파이프라인: 세 단계, 네 개의 모델</h2>
<div class="w wide" style="box-shadow:none"><div class="w-body" style="overflow-x:auto">
<svg viewBox="0 0 760 230" role="img" aria-label="RLHF 파이프라인" style="min-width:640px">
  <defs><marker id="rlhf-ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--muted)"/></marker></defs>
  <g style="font-size:13px">
    <rect x="10" y="40" width="210" height="120" rx="10" style="fill:var(--surface-2);stroke:var(--line)"/>
    <text x="115" y="66" text-anchor="middle" style="fill:var(--accent);font-weight:600">① SFT</text>
    <text x="115" y="92" text-anchor="middle" style="fill:var(--ink)">사람이 쓴 모범 답안</text>
    <text x="115" y="112" text-anchor="middle" style="fill:var(--muted);font-family:var(--font-mono);font-size:12px">max log π(y*|x)</text>
    <text x="115" y="140" text-anchor="middle" style="fill:var(--ink)">→ π_SFT (= π_ref)</text>

    <rect x="275" y="40" width="210" height="120" rx="10" style="fill:var(--surface-2);stroke:var(--line)"/>
    <text x="380" y="66" text-anchor="middle" style="fill:var(--c2);font-weight:600">② 보상모델</text>
    <text x="380" y="92" text-anchor="middle" style="fill:var(--ink)">π_SFT 응답 쌍 비교 라벨</text>
    <text x="380" y="112" text-anchor="middle" style="fill:var(--muted);font-family:var(--font-mono);font-size:12px">−log σ(r_w − r_l)</text>
    <text x="380" y="140" text-anchor="middle" style="fill:var(--ink)">→ r_φ(x, y)</text>

    <rect x="540" y="40" width="210" height="120" rx="10" style="fill:var(--accent-soft);stroke:var(--accent)"/>
    <text x="645" y="66" text-anchor="middle" style="fill:var(--accent);font-weight:600">③ RL (PPO)</text>
    <text x="645" y="92" text-anchor="middle" style="fill:var(--ink)">프롬프트만 주고 생성</text>
    <text x="645" y="112" text-anchor="middle" style="fill:var(--muted);font-family:var(--font-mono);font-size:12px">r_φ − β·KL(π‖π_ref)</text>
    <text x="645" y="140" text-anchor="middle" style="fill:var(--ink)">→ π_θ</text>

    <path d="M220 100 L270 100" style="stroke:var(--muted);stroke-width:1.6;fill:none" marker-end="url(#rlhf-ar)"/>
    <path d="M485 100 L535 100" style="stroke:var(--muted);stroke-width:1.6;fill:none" marker-end="url(#rlhf-ar)"/>
    <path d="M115 160 C 115 210, 645 210, 645 164" style="stroke:var(--muted);stroke-width:1.4;fill:none;stroke-dasharray:5 4" marker-end="url(#rlhf-ar)"/>
    <text x="380" y="222" text-anchor="middle" style="fill:var(--muted);font-size:12px">π_SFT는 초기 정책이자 KL 기준(reference)으로 다시 쓰인다</text>
    <text x="645" y="28" text-anchor="middle" style="fill:var(--muted);font-size:12px">메모리: 정책 · 기준 · 보상 · critic</text>
  </g>
</svg></div></div>
<ol>
  <li><strong>SFT</strong>: 시연 데이터로 지도학습을 한다. 정책을 "말이 되는 답"을 내는 영역으로 먼저 옮겨 놓는 단계다. RL은 모델이 이미 가끔 내는 답을 더 자주 내게 만드는 데 그치므로 출발점이 중요하다.</li>
  <li><strong>보상모델(RM)</strong>: 같은 프롬프트의 응답 2개를 사람이 비교한다(또는 $K$개에 순위를 매긴다). LM 몸통에 스칼라 출력 헤드를 단 모델을 Bradley–Terry 우도로 학습한다.</li>
  <li><strong>RL</strong>: 프롬프트만 주면 정책이 답을 생성하고 RM이 채점한다. 기준 정책과의 KL을 벌점으로 두고 PPO로 정책을 갱신한다.</li>
</ol>

<h2>RLHF의 목적 함수</h2>
<div data-w="fx-obj"></div>
<p>이 목적은 <a href="#llm-mdp">18장</a>에서 본 KL-정규화 문제와 같다. 정책 공간 전체에서 풀면 닫힌 해가 나온다.</p>
$$\pi^*(y\mid x) = \frac{1}{Z(x)}\,\pi_{\text{ref}}(y\mid x)\,\exp\!\Big(\frac{r_\phi(x,y)}{\beta}\Big)$$
<div class="thesis-box"><span class="label">대전제 T5 · KL-정규화 해</span>
<p>RLHF는 실제로 <strong>기준 모델의 분포를 보상의 지수로 재가중</strong>한다. SFT 모델이 이미 낼 수 있는 답 가운데 좋은 쪽으로 확률을 옮기는 것이다. $\beta$가 작을수록 보상 쪽으로 더 많이 옮기고, 그만큼 보상모델의 오류에도 더 많이 노출된다. 이 닫힌 해를 거꾸로 풀어 RM 학습과 RL을 분류 손실 하나로 합친 방법이 <a href="#dpo">20장 DPO</a>다.</p>
</div>

<h2>Bradley–Terry: 비교에서 보상으로</h2>
<p>아래에서 직접 라벨러가 되어 두 답 중 나은 쪽을 고를 수 있다. 고른 결과만으로 채점기 점수가 만들어지고, 이 채점기로 챗봇을 고쳤을 때 어떤 답을 더 자주 쓰게 되는지 바로 보인다.</p>
<div data-w="try-annotate"></div>
<p>채점기 안의 계산은 단순하다. 점수 차이를 "이쪽을 고를 확률"로 바꾸는 함수 하나만 쓴다. 아래에서 작은 숫자로 따라간다.</p>
<div data-w="step-bt"></div>
<p>사람이 두 응답을 비교할 때 머릿속에 잠재 효용이 있고, 판단할 때마다 약간의 잡음이 섞인다고 가정한다. 잡음 분포로 Gumbel 분포를 고르면 선호확률이 정확히 로지스틱 함수가 된다.</p>
<div data-w="dv-bt"></div>
<div data-w="fx-rm"></div>

<h3>시뮬레이터: 잡음 섞인 비교에서 보상 복원하기</h3>
<p>응답 16개에는 겉으로 보이지 않는 참 효용 $u_i$가 있다. 라벨러는 확률 $\Pr(i \succ j) = \sigma\big((u_i - u_j)/\tau\big)$에 따라 고른다($\tau$가 클수록 라벨에 잡음이 많다). 무작위 쌍의 비교 라벨로 BT 점수 $\theta_i$를 경사하강법으로 학습한다. 여기서 두 가지를 확인할 수 있다. (1) 검증 정확도는 라벨 잡음이 정하는 <strong>상한(Bayes 정확도)</strong>을 넘지 못한다. (2) 그 상한이 70%대여도 순위 자체는 거의 정확히 복원된다.</p>
<div data-w="rm-sim"></div>
<div class="aside"><span class="label">실제 수치</span>InstructGPT 논문은 학습용 라벨러끼리의 일치율을 약 73%로 보고했다. 사람 선호 데이터로 학습한 보상모델의 검증 정확도가 60~70%대에 머무는 것은 대개 이 상한 때문이다. 그렇다고 RM의 정확도만 보고 정책 최적화를 얼마나 안전하게 밀어붙일 수 있는지 판단해서는 안 된다.</div>

<h2>LLM을 위한 PPO</h2>
<p>LLM의 생성 과정은 <a href="#llm-mdp">18장</a>의 토큰 MDP다. 상태는 프롬프트와 지금까지 생성한 토큰이고, 행동은 다음 토큰이다. 전이는 결정적이고 보통 $\gamma = 1$을 쓴다. InstructGPT 계열 구현은 KL을 <strong>토큰마다 보상에 섞고</strong>, RM 점수는 마지막 토큰에만 준다.</p>
$$r_t = -\beta \log\frac{\pi_\theta(y_t\mid x, y_{\lt t})}{\pi_{\text{ref}}(y_t\mid x, y_{\lt t})} \;+\; \mathbb{1}[t = T]\; r_\phi(x, y)$$
<p>토큰별 로그비를 모두 더하면 $\log\frac{\pi_\theta(y|x)}{\pi_{\text{ref}}(y|x)}$가 되고, 이 값은 시퀀스 KL을 샘플 하나로 추정한 값이다. 여기에 가치 헤드(critic) $V_\psi(s_t)$를 두고 <a href="#ac">12장</a>의 GAE로 토큰별 advantage를 만든 뒤 <a href="#ppo">13장</a>의 클립 목적을 그대로 적용한다. 아래 계산기에서 응답 끝에 한 번 오는 보상이 GAE의 $\lambda$에 따라 앞쪽 토큰으로 퍼지는 모습을 볼 수 있다.</p>
<div data-w="token-calc"></div>
<div class="grid2">
  <div class="card"><h4>메모리에 올라가는 네 모델</h4><p>정책 $\pi_\theta$(학습), 기준 모델 $\pi_{\text{ref}}$(고정, KL 계산), 보상모델 $r_\phi$(고정, 채점), critic $V_\psi$(학습, 보통 RM에서 초기화)다. 같은 크기의 모델 네 개를 함께 올리는 것이 엔지니어링 비용의 대부분을 차지한다.</p></div>
  <div class="card"><h4>critic 학습이 가장 어렵다</h4><p>보상이 끝에 한 번만 오므로 critic은 "이 접두어에서 최종적으로 받을 점수"를 맞혀야 한다. 이 추정이 부정확하면 advantage의 잡음이 커진다. 그래서 critic을 없앤 RLOO·ReMax·GRPO 계열(<a href="#reasoning">21장</a>)이 나왔다.</p></div>
</div>

<h2>보상 해킹과 과최적화</h2>
<p>보상모델은 사람 선호의 <strong>대리 지표(proxy)</strong>다. 정책이 RM 점수를 끝까지 밀어 올리면 RM이 학습 때 본 적 없는 영역으로 나가고, 그 영역에서 RM은 틀린다. 지표가 목표가 되면 더는 좋은 지표 구실을 못 한다는 Goodhart의 법칙이 그대로 나타난다. Gao, Schulman, Hilton(2022)은 큰 보상모델을 사람 대신 정답 역할(gold RM)로 두는 합성 실험으로 이 현상을 정량화했다. 초기 정책에서 떨어진 거리를 $d = \sqrt{\mathrm{KL}(\pi\|\pi_{\text{init}})}$로 두면 다음 함수형이 잘 맞는다고 보고했다.</p>
$$R^{\text{gold}}_{\text{BoN}}(d) = d\,(\alpha_{\text{bon}} - \beta_{\text{bon}}\, d), \qquad R^{\text{gold}}_{\text{RL}}(d) = d\,(\alpha_{\text{RL}} - \beta_{\text{RL}} \log d)$$
<div data-w="overopt"></div>
<div class="table-wrap"><table class="t">
<thead><tr><th>처방</th><th>무엇을 막나</th><th>대가</th></tr></thead>
<tbody>
<tr><td>KL 페널티 $\beta$</td><td>정책이 RM을 믿을 수 있는 영역 밖으로 나가는 것 (T4 신뢰영역의 LLM 버전)</td><td>얻을 수 있는 최대 개선이 줄어든다</td></tr>
<tr><td>RM 앙상블 / 불확실성 페널티 (Coste et al. 2023)</td><td>한 RM의 특이한 오류를 집중 공략하는 것. 평균이나 최솟값으로 비관적인 점수를 낸다 (T7)</td><td>RM 여러 개 학습 · 추론 비용</td></tr>
<tr><td>길이 제어 (Singhal et al. 2023 등)</td><td>"길수록 좋다"는 RM의 허위 상관을 이용하는 것</td><td>길이 정규화가 실제 품질 신호도 깎을 수 있다</td></tr>
<tr><td>더 큰 RM, 더 많은 비교 데이터 (Gao et al. 2022)</td><td>과최적화가 시작되는 KL 지점을 뒤로 민다</td><td>라벨 비용</td></tr>
<tr><td>반복형 RLHF (Bai et al. 2022a)</td><td>정책 분포가 바뀐 곳에서 새로 비교 라벨을 받아 RM을 갱신한다</td><td>사람 루프 운영 비용</td></tr>
</tbody></table></div>
<p>이 문제는 <a href="#offline">15장 오프라인 RL</a>과 구조가 같다. RM은 고정된 데이터로 학습한 가치 추정기이고, 정책은 그 추정기의 argmax를 찾아 데이터 밖으로 나간다. 그래서 처방도 비슷하다. 데이터 근처에 머물게 하거나(KL), 불확실한 곳을 비관적으로 평가하거나(앙상블), 데이터를 더 모은다(반복형).</p>

<h2>Constitutional AI와 RLAIF</h2>
<p>Bai et al.(2022b)은 유해성 라벨을 사람 대신 AI가 만들게 했다. 과정은 두 단계다.</p>
<ul>
  <li><strong>SL-CAI</strong>: 모델이 자기 답을 원칙 목록(constitution)에 비추어 비판하고 고쳐 쓴다. 고친 답으로 SFT를 한다.</li>
  <li><strong>RL-CAI</strong>: 응답 쌍 중 원칙에 더 맞는 쪽을 AI가 고른다. AI가 만든 비교 라벨로 선호 모델을 학습하고 RL을 한다. 이 방식을 RLAIF(RL from AI Feedback)라고 부른다.</li>
</ul>
<p>RLAIF로 피드백 비용의 병목은 사라졌지만, 판정 모델의 편향이 그대로 보상이 되는 새 문제가 생겼다. 이후 등장한 LLM 판정자 보상(LLM-as-a-judge, self-rewarding)과 <a href="#reasoning">21장</a>의 검증 가능한 보상(RLVR)은 "사람 라벨 없이 보상을 어디서 얻을까"라는 같은 질문에 서로 다르게 답한다.</p>

<h2>파생: 무엇이 바뀌었나</h2>
<div class="table-wrap"><table class="t">
<thead><tr><th>방법</th><th>바꾼 부분</th><th>남긴 부분</th></tr></thead>
<tbody>
<tr><td>PPO-ptx (InstructGPT)</td><td>목적에 사전학습 로그우도 항을 더한다</td><td>RM + KL + PPO</td></tr>
<tr><td>Safe RLHF (Dai et al. 2023)</td><td>보상모델과 비용(해로움) 모델을 나누고 라그랑지안으로 제약 최적화를 한다</td><td>PPO</td></tr>
<tr><td>RLOO, ReMax (Ahmadian et al. 2024, Li et al. 2023)</td><td>critic을 없애고, 같은 프롬프트의 다른 샘플이나 greedy 응답의 보상을 baseline으로 쓴다</td><td>RM + KL, 점수함수 경사(T3)</td></tr>
<tr><td>GRPO (<a href="#reasoning">21장</a>)</td><td>advantage를 그룹 평균과 표준편차로 정규화하고, KL을 손실 항으로 넣는다</td><td>PPO 클립</td></tr>
<tr><td>DPO 계열 (<a href="#dpo">20장</a>)</td><td>RM 학습과 RL을 분류 손실 하나로 합친다</td><td>BT 선호 모형 + KL 정규화 목적</td></tr>
<tr><td>Best-of-N / 거절 샘플링 (<a href="#test-time">22장</a>)</td><td>학습하지 않고, 추론할 때 N개 중 RM 점수가 가장 높은 답을 고른다</td><td>RM. KL 예산은 $\log N - (N-1)/N$</td></tr>
<tr><td>RLAIF / CAI</td><td>비교 라벨을 AI가 만든다</td><td>RM + RL 구조</td></tr>
</tbody></table></div>
`,
    mount: {
      'fx-obj': (el) => ui.formula(el, {
        title: 'RLHF 목적 (InstructGPT의 PPO-ptx 형태)',
        say: '{max|모델을 고쳐서} {dx|여러 질문}에 {dy|모델이 직접 쓴 답}의 {rm|채점기 점수}를 높인다. 답이 {kl|원래 모델에서 벗어난 정도}에는 {beta|정해 둔 비율만큼} 벌점을 준다. 여기에 {ptx|사전학습 글을 계속 읽는 연습}을 조금 섞는다.',
        tex: String.raw`\tm{max}{\max_{\theta}}\; \tm{dx}{\mathbb{E}_{x\sim\mathcal{D}}}\,\tm{dy}{\mathbb{E}_{y\sim\pi_\theta(\cdot|x)}}\Big[\tm{rm}{r_\phi(x,y)} - \tm{beta}{\beta}\, \tm{kl}{\log\frac{\pi_\theta(y|x)}{\pi_{\text{ref}}(y|x)}}\Big] + \tm{ptx}{\gamma_{\text{ptx}}\,\mathbb{E}_{x\sim\mathcal{D}_{\text{pre}}}\big[\log\pi_\theta(x)\big]}`,
        terms: [
          { id: 'max', sym: '\\max_\\theta', label: '정책 파라미터 최적화', desc: 'LM 전체(또는 LoRA)를 갱신한다.' },
          { id: 'dx', sym: '\\mathbb{E}_{x\\sim\\mathcal{D}}', label: '프롬프트 분포', desc: 'RL 단계에는 프롬프트만 있으면 된다. 정답 응답은 없다.', long: '어떤 프롬프트를 모으느냐가 무엇을 정렬할지 정한다. RL 단계의 데이터는 정책이 직접 생성하므로 on-policy다.' },
          { id: 'dy', sym: '\\mathbb{E}_{y\\sim\\pi_\\theta}', label: '정책 샘플', desc: '현재 정책이 생성한 응답으로 낸 기댓값이다.', long: '이 기댓값이 θ에 의존하므로 미분하려면 점수함수 경사(T3)가 필요하다. PPO는 이전 정책의 샘플을 중요도비로 재사용한다.' },
          { id: 'rm', sym: 'r_\\phi(x,y)', label: '보상모델 점수', desc: '사람의 비교로 학습한 대리 보상이다.', long: 'BT로 학습했으므로 프롬프트마다 상수를 더해도 구별되지 않는다. 실전에서는 점수를 정규화하거나 critic이 이 상수를 흡수한다.' },
          { id: 'beta', sym: '\\beta', label: 'KL 계수', desc: '보상을 좇는 정도와 기준 모델을 지키는 정도의 교환비다.', long: '닫힌 해에서 $\\beta$는 볼츠만 분포의 온도다. 작으면 보상에 민감하게 재가중하고(과최적화 위험), 크면 기준 모델 근처에 머문다. 목표 KL을 정해 두고 $\\beta$를 자동으로 조절하는 구현도 있다(Ziegler et al. 2019).' },
          { id: 'kl', sym: '\\log\\frac{\\pi_\\theta}{\\pi_{\\text{ref}}}', label: 'KL의 샘플 추정', desc: '샘플 y의 로그비다. 기댓값을 취하면 KL이 된다.', long: '역방향 KL $\\mathrm{KL}(\\pi_\\theta\\|\\pi_{\\text{ref}})$이다. $\\pi_{\\text{ref}}$가 거의 0인 곳에 확률을 두면 페널티가 무한대로 커지지만, $\\pi_{\\text{ref}}$의 모드 일부를 버리는 데는 비용이 적게 든다. 그래서 RLHF 뒤에는 다양성이 줄어드는 경향이 있다.' },
          { id: 'ptx', sym: '\\gamma_{\\text{ptx}}\\,\\mathbb{E}[\\log\\pi_\\theta]', label: '사전학습 손실 혼합', desc: 'InstructGPT의 PPO-ptx. 일반 능력이 떨어지는 것을 줄인다.', long: '정렬 과정에서 공개 NLP 벤치마크 성능이 떨어지는 현상(alignment tax)을 줄이려고 사전학습 분포의 로그우도를 함께 최대화한다.' },
        ],
      }),
      'dv-bt': (el) => ui.derivation(el, {
        title: 'Gumbel 잡음 효용 모형 → Bradley–Terry → 보상모델 손실',
        easy: '사람 마음속 점수에 매번 약간의 잡음이 섞인다고 보면, A를 고를 확률은 두 점수의 차이 하나로 정해진다(차이가 0이면 반반, 1이면 약 73%). 채점기는 사람이 실제로 고른 쪽의 확률이 높아지도록 점수를 맞춘다.',
        steps: [
          { tex: String.raw`U(y) = r(x,y) + \varepsilon_y,\qquad \varepsilon_y \overset{\text{iid}}{\sim} \mathrm{Gumbel}(0,1)`, why: '라벨러는 잠재 효용 $U$가 더 큰 응답을 고른다고 가정한다. 잡음은 응답마다 독립이다.' },
          { tex: String.raw`\Pr(y_w \succ y_l) = \Pr\big(U(y_w) > U(y_l)\big) = \Pr\big(\hl{\varepsilon_l - \varepsilon_w} < r_w - r_l\big)`, why: '$r_w = r(x,y_w)$, $r_l = r(x,y_l)$로 줄여 쓴다.' },
          { tex: String.raw`\varepsilon_l - \varepsilon_w \sim \mathrm{Logistic}(0,1),\qquad F(z) = \frac{1}{1+e^{-z}} = \sigma(z)`, why: '서로 독립인 두 표준 Gumbel 변수의 차는 표준 로지스틱 분포를 따른다. Gumbel을 고른 이유가 이 성질이다.' },
          { tex: String.raw`\Pr(y_w \succ y_l) = \hl{\sigma(r_w - r_l)} = \frac{e^{r_w}}{e^{r_w} + e^{r_l}}`, easy: '점수 차이가 0이면 50%, 1이면 73%, 2면 88%, 3이면 95%다. 차이가 클수록 확실해진다.', why: '<strong>Bradley–Terry 모형</strong>이다. $K$개 중 하나를 고르는 경우로 넓히면 softmax(Luce 선택 공리)가 되고, 순위 전체로 넓히면 Plackett–Luce 모형이 된다.' },
          { tex: String.raw`\mathcal{L}_{\text{RM}}(\phi) = -\,\mathbb{E}_{(x,y_w,y_l)\sim\mathcal{D}}\Big[\log\sigma\big(r_\phi(x,y_w) - r_\phi(x,y_l)\big)\Big]`, why: '비교 데이터의 음의 로그우도다. 응답 쌍을 입력으로 받는 이진 로지스틱 회귀이고, 정답 레이블은 항상 $y_w$ 쪽이다.' },
          { tex: String.raw`r_\phi(x,y) \;\to\; r_\phi(x,y) + \hl{f(x)} \quad\Rightarrow\quad \sigma\big((r_w + f) - (r_l + f)\big) = \sigma(r_w - r_l)`, easy: '두 답에 똑같이 10점을 더해도 고를 확률은 그대로다. 그래서 채점기 점수의 절댓값에는 의미가 없고, 같은 질문 안의 비교만 의미가 있다.', why: '선호확률은 같은 프롬프트 안의 <strong>차이</strong>에만 의존한다. 그래서 RM 점수는 프롬프트마다 더해지는 상수를 빼면 유일하게 정해지고, 절댓값 자체에는 의미가 없다. 점수의 척도는 라벨러 잡음의 크기($\\tau$)가 정한다.' },
        ],
      }),
      'fx-rm': (el) => ui.formula(el, {
        title: '보상모델 손실 해부',
        say: '{data|사람이 고른 답 쌍마다} {rw|고른 답의 점수}에서 {rl|버린 답의 점수}를 빼고, 그 차이를 {sig|"이쪽을 고를 확률"로 바꾼다}. 이 확률이 1에 가까울수록 좋으므로 {log|로그를 취해 크게 만들고}, 손실은 부호를 뒤집어 둔다.',
        tex: String.raw`\mathcal{L}(\phi) = -\,\tm{data}{\mathbb{E}_{(x, y_w, y_l)}}\Big[\,\tm{log}{\log}\,\tm{sig}{\sigma}\big(\tm{rw}{r_\phi(x,y_w)} - \tm{rl}{r_\phi(x,y_l)}\big)\Big]`,
        terms: [
          { id: 'data', sym: '(x,y_w,y_l)', label: '비교 데이터', desc: '프롬프트, 선택된 응답, 거절된 응답의 묶음이다.', long: '응답은 보통 SFT 모델에서 샘플한다. 그래서 RM은 SFT 분포 근처에서만 정확하고, 정책이 멀리 이동하면 신뢰도가 떨어진다. 과최적화가 여기서 시작된다.' },
          { id: 'log', sym: '\\log', label: '로그우도', desc: '선택된 쪽에 낮은 확률을 준 쌍에 큰 손실을 준다.' },
          { id: 'sig', sym: '\\sigma', label: '로지스틱 링크', desc: '점수 차이를 선호확률로 바꾼다 (BT).', long: '$z$가 크면 $\\sigma(z)$의 기울기는 0에 가까워진다. 이미 확실히 구분한 쌍은 더 학습 신호를 주지 않는다. DPO의 가중치 $\\sigma(\\hat r_l - \\hat r_w)$도 성질이 같다.' },
          { id: 'rw', sym: 'r_\\phi(x,y_w)', label: '선택 응답 점수', desc: '올라가도록 학습한다.' },
          { id: 'rl', sym: 'r_\\phi(x,y_l)', label: '거절 응답 점수', desc: '내려가도록 학습한다. 차이만 중요하다.' },
        ],
      }),
      'try-annotate': mountAnnotate,
      'step-bt': (el) => ui.walkthrough(el, {
        title: '점수 차이를 확률로: 손으로 한 번',
        caption: '"다음 단계"를 누를 때마다 한 줄씩 열린다. 빈칸에 계산값을 넣으면 맞는지 바로 알려 준다. 계산기를 써도 된다.',
        steps: [
          { say: '채점기가 답 A에 2점, 답 B에 1점을 줬다. 두 점수의 차이는?', ask: { answer: 1 }, calc: String.raw`r_A - r_B = 2 - 1 = 1` },
          { say: '차이를 "A를 고를 확률"로 바꾸는 함수는 $\\sigma(z) = 1/(1+e^{-z})$다. $e^{-1}\\approx 0.368$이다. 사람이 A를 고를 확률은? (소수로)', ask: { answer: 0.731, tol: 0.01 }, calc: String.raw`\sigma(1) = \frac{1}{1 + 0.368} \approx 0.731`, note: '1점 앞서면 약 73% 확률로 이긴다. 100%에 못 미치는 이유는 사람의 선택에 잡음이 있기 때문이다.' },
          { say: '두 답에 똑같이 10점을 더해 A = 12, B = 11로 바꾸면 A를 고를 확률은?', ask: { answer: 0.731, tol: 0.01 }, calc: String.raw`\sigma(12 - 11) = \sigma(1) \approx 0.731`, note: '차이만 중요하다. 그래서 채점기 점수의 절댓값에는 의미가 없다.' },
          { say: '실제로 사람이 A를 골랐다. 이 비교 하나의 손실 $-\\log P$는? (자연로그)', ask: { answer: 0.313, tol: 0.01 }, calc: String.raw`-\log 0.731 \approx 0.313`, note: '사람이 B를 골랐다면 손실은 $-\\log 0.269 \\approx 1.31$로 훨씬 크다. 채점기는 이 손실을 줄이려고 B 점수를 올리고 A 점수를 내린다.' },
          { say: '이번에는 챗봇이 원래 A와 B를 반씩 쓴다. KL 계수가 $\\beta = 1$이면 최적 정책은 원래 확률에 $e^{\\text{점수}/\\beta}$를 곱한 뒤 합이 1이 되게 나눈다. A를 쓸 새 확률은?', ask: { answer: 0.731, tol: 0.01 }, calc: String.raw`\frac{0.5\,e^{2}}{0.5\,e^{2} + 0.5\,e^{1}} = \frac{1}{1 + e^{-1}} \approx 0.731`, note: 'KL 계수를 $\\beta = 0.5$로 줄이면 $\\sigma(2)\\approx 0.881$이 되어 A 쪽으로 더 쏠린다. $\\beta$가 작을수록 채점기를 더 믿는다.' },
        ],
      }),
      'rm-sim': mountRM,
      'token-calc': mountTokenCalc,
      'overopt': mountOveropt,
    },
    tacit: [
      { tag: 'math', t: '$\\sqrt{\\mathrm{KL}}$을 거리로 쓰는 이유',
        d: '<p>정책이 조금 움직이면 KL은 파라미터 변화량의 제곱에 비례해 늘고(피셔 정보 계량), 보상 같은 기댓값은 변화량에 비례해 변한다. 그래서 보상이 선형으로 반응하는 자연스러운 거리는 $\\sqrt{\\mathrm{KL}}$이다. Gao et al.(2022)의 함수형이 원점 근처에서 $\\alpha d$로 시작하는 것도 이 때문이다. 같은 이유로 TRPO의 KL 반경 $\\delta$는 스텝 길이의 제곱으로 읽는다(T4).</p>' },
      { tag: 'math', t: '역방향 KL은 새 답을 못 만든다',
        d: '<p>$\\pi_{\\text{ref}}(y)=0$인 곳에 확률을 두면 $\\mathrm{KL}(\\pi\\|\\pi_{\\text{ref}})$는 무한대가 된다. 닫힌 해 $\\pi^* \\propto \\pi_{\\text{ref}}e^{r/\\beta}$도 $\\pi_{\\text{ref}}$의 지지 집합(support) 밖으로 나가지 못한다. 그래서 "RL은 이미 있는 분포를 날카롭게 만들고, SFT는 새로 가르친다"고 요약하곤 한다. 모델이 한 번도 내지 않는 행동은 RL로 생기지 않는다. 실제로는 함수근사의 일반화 덕분에 지지 집합이 조금 넓어지지만, 출발점(SFT와 사전학습)이 상한을 정한다는 판단은 대체로 맞다.</p>' },
      { tag: 'practice', t: 'RM 정확도 70%는 낮지 않지만, 안전하다는 뜻도 아니다',
        d: '<p>검증 정확도는 라벨 잡음이 정한 상한을 넘지 못한다(위 시뮬레이터). 그러니 정확도가 70%대인 RM도 쓸모가 있다. 다만 이 정확도는 SFT 분포에서 무작위로 뽑은 쌍의 평균이고, 정책 최적화는 RM이 가장 많이 틀리는 방향을 일부러 찾아간다. 결과는 <strong>최적화 압력을 받을 때의 최악 오류</strong>가 정한다. 그래서 RLHF 실무에서는 KL과 함께 사람이나 더 큰 RM의 평가(gold 평가)를 계속 추적한다.</p>' },
      { tag: 'algo', t: 'KL을 보상에 넣는 것과 손실에 넣는 것은 다른 추정량이다',
        d: '<p>InstructGPT 방식은 토큰별 $-\\beta\\log(\\pi/\\pi_{\\text{ref}})$를 보상에 섞어 GAE에 넣는다. GRPO 방식은 KL을 별도 손실 항으로 두고 샘플 추정량 $k_3 = \\frac{\\pi_{\\text{ref}}}{\\pi} - \\log\\frac{\\pi_{\\text{ref}}}{\\pi} - 1$을 쓴다. 이 값은 항상 0 이상이다(Schulman 2020의 KL 근사 노트). 단순 로그비 $k_1$은 불편 추정량이지만 샘플마다 음수가 될 수 있어 분산이 크다. 이름은 같은 KL 페널티라도 기울기의 편향과 분산이 다르므로, 논문마다 다른 $\\beta$ 값을 그대로 비교하면 안 된다.</p>' },
      { tag: 'research', t: '과최적화는 오프라인 RL의 분포 이동과 같은 문제다',
        d: '<p>RM은 고정 데이터로 학습한 가치 함수이고, 정책은 그 argmax를 찾는다. 오프라인 RL에서 정책이 Q 함수의 외삽 오류를 공략하는 구조와 같다(<a href="#offline">15장</a>). 해법도 하나씩 대응한다. KL은 행동 정책 근처에 머물게 하는 BRAC류에, RM 앙상블의 하한은 LCB(T7)에, 새 데이터 수집은 온라인화에 해당한다. 새 정렬 기법을 볼 때 "이 방법은 RM의 외삽 오류를 무엇으로 막는가"를 따져 보면 분류하기 쉽다.</p>' },
      { tag: 'practice', t: 'critic은 RM에서 초기화하고 먼저 따로 학습시킨다',
        d: '<p>보상이 끝에 한 번만 오는 문제에서는 무작위로 초기화한 critic이 만드는 초기 advantage가 거의 잡음이다. 그래서 많은 구현이 critic을 RM 가중치로 초기화하고, 정책을 움직이기 전에 critic만 잠시 학습시킨다(value warmup). 이런 비용과 불안정성 때문에 critic 없는 REINFORCE 계열(RLOO, GRPO)이 LLM에서 다시 주목받았다. Ahmadian et al.(2024)은 LLM 미세조정에는 PPO의 분산 감소 장치 상당수가 필요하지 않다고 주장했다.</p>' },
      { tag: 'math', t: 'RM 점수의 절댓값에는 의미가 없다',
        d: '<p>BT는 프롬프트마다 상수 $f(x)$를 더해도 변하지 않는다. 그래서 프롬프트 A의 RM 점수 2.0과 프롬프트 B의 0.5를 비교하는 것은 의미가 없다. 배치 단위로 보상을 정규화하거나 프롬프트별 baseline(critic, 그룹 평균)을 빼야 한다. KL-정규화 해에서도 $f(x)$는 분배함수 $Z(x)$에 흡수되어 최적 정책을 바꾸지 않는다. DPO에서 $Z(x)$가 사라지는 것도 같은 불변성 덕분이다.</p>' },
    ],
    quiz: [
      { q: '보상모델 $r_\\phi(x,y)$의 모든 출력에 프롬프트마다 다른 상수 $f(x)$를 더하면 Bradley–Terry 선호확률은?', options: ['$f(x)$만큼 커진다', '변하지 않는다', '$\\sigma(f(x))$배가 된다', '응답 길이에 따라 달라진다'], answer: 1,
        explain: '$\\sigma\\big((r_w+f)-(r_l+f)\\big) = \\sigma(r_w - r_l)$. BT는 같은 프롬프트 안의 점수 차이에만 의존하므로, RM 점수에서 프롬프트별 상수는 정해지지 않는다.' },
      { q: '라벨 잡음이 큰 비교 데이터로 학습한 RM의 검증 정확도가 72%에서 더 오르지 않는다. 가장 타당한 해석은?', options: ['모델 용량이 부족하다', '라벨 잡음이 정한 Bayes 정확도 상한에 가깝다', '학습률이 너무 크다', 'BT 모형이 틀렸다'], answer: 1,
        explain: '라벨 자체가 일정 비율로 뒤집혀 있으면 어떤 모델도 그 이상 맞힐 수 없다. 시뮬레이터에서 상한선과 참 순위 일치율을 비교하면, 순위는 거의 맞히면서도 정확도는 상한에 묶이는 것을 확인할 수 있다.' },
      { q: 'InstructGPT식 LLM PPO에서 RM 점수 $r_\\phi(x,y)$는 어느 토큰의 보상에 더해지는가?', options: ['모든 토큰에 균등 분배', '첫 토큰', '마지막 토큰', '가장 확률이 낮은 토큰'], answer: 2,
        explain: '시퀀스가 끝나야 채점할 수 있으므로 마지막 토큰에만 더하고, 나머지 토큰은 KL 항 $-\\beta\\log(\\pi_\\theta/\\pi_{\\text{ref}})$만 받는다. 앞쪽 토큰에 공을 나눠 주는 신용 할당은 critic과 GAE가 맡는다.' },
      { q: 'Gao et al.(2022)의 과최적화 실험에서 대리(proxy) RM 점수와 실제 품질 점수(gold)의 관계로 옳은 것은?', options: ['둘 다 KL에 따라 단조 증가한다', '대리 점수는 계속 오르지만 실제 품질 점수는 어느 KL에서 정점을 찍고 내려간다', '실제 품질 점수가 대리 점수보다 항상 높다', 'KL이 클수록 둘의 차이가 줄어든다'], answer: 1,
        explain: '정책이 RM의 오류를 공략하면서 대리 점수와 실제 품질이 벌어진다. 정점은 RM이 크고 데이터가 많을수록 뒤로 밀린다.' },
    ],
  });

  /* ---------- 내가 라벨러: 비교 → 채점기 → KL 정규화 정책 ---------- */
  function mountAnnotate(el) {
    const ans = [
      { k: 'A', t: '따뜻한 물을 자주 마시고 푹 쉬세요. 열이 38도를 넘거나 사흘 넘게 이어지면 병원에 가 보세요.', q: 2.0, len: 50 },
      { k: 'B', t: '그냥 참으면 나아요.', q: 0.0, len: 10 },
      { k: 'C', t: '항생제를 드시면 금방 낫습니다.', q: -1.5, len: 15 },
      { k: 'D', t: '잠을 충분히 자고 물을 많이 드세요. 증상이 심해지면 진료를 받으세요.', q: 1.8, len: 36 },
      { k: 'E', t: '감기에 대해 말씀드리자면, 감기는 예로부터 많은 사람이 겪어 온 흔한 질환으로, 계절이 바뀔 때 특히 자주 찾아오며 사람마다 증상이 조금씩 다르게 나타나곤 합니다.', q: -0.3, len: 85 },
    ];
    const pref = [0.22, 0.2, 0.18, 0.22, 0.18];
    const ROUNDS = 8, lam = 0.15;
    const p = ui.panel(el, { kind: 'TRY', title: '내가 라벨러: 두 답 중 더 나은 쪽 고르기', caption: '두 답 중 더 나은 쪽 버튼을 누르면 왼쪽 막대(채점기 점수)가 그 선택을 따라 움직인다. 오른쪽 막대는 이 채점기로 챗봇을 고쳤을 때 각 답을 쓸 확률이다. 8번 고른 뒤 "길이를 좋아하는 라벨러" 버튼을 누르면 라벨러의 버릇이 챗봇에 그대로 옮겨 가는 것이 보인다.' });
    const qbox = document.createElement('div');
    qbox.className = 'fx-detail';
    qbox.innerHTML = '<strong>질문</strong>: 감기 기운이 있을 때 어떻게 하면 좋을까요?<div class="w-caption" style="margin-top:6px">' + ans.map((a) => '<strong>' + a.k + '</strong>. ' + a.t).join('<br>') + '</div>';
    const status = document.createElement('p');
    status.className = 'w-caption';
    status.setAttribute('role', 'status');
    const pairRow = ui.row(null, 'btns');
    const pickBtns = [0, 1].map(() => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'btn';
      b.style.cssText = 'white-space:normal;text-align:left;line-height:1.55;flex:1 1 260px;padding:10px 12px';
      pairRow.appendChild(b);
      return b;
    });
    const ctr = ui.row(null);
    const bS = ui.slider(ctr, { label: 'KL 계수 $\\beta$ (작을수록 제한이 약함)', min: 0.2, max: 3, step: 0.05, value: 1, format: ui.fmt.f(2), onInput: draw });
    const btns = ui.row(null, 'btns');
    ui.button(btns, '처음부터', reset);
    ui.button(btns, '꼼꼼한 라벨러가 자동으로 8번', () => auto((a, b) => (ans[a].q >= ans[b].q ? a : b)));
    ui.button(btns, '길이를 좋아하는 라벨러가 자동으로 8번', () => auto((a, b) => (ans[a].len >= ans[b].len ? a : b)));
    const st = ui.stats(null, [
      { key: 'n', label: '고른 횟수' },
      { key: 'top', label: '채점기 1등 답', tone: 'accent' },
      { key: 'pt', label: '고친 챗봇이 1등 답을 쓸 확률', tone: 'signal' },
    ]);
    const split = document.createElement('div');
    split.className = 'w-split';
    const L = document.createElement('div'), R = document.createElement('div');
    split.append(L, R);
    p.body.append(qbox, status, pairRow, ctr, btns, st.el, split);
    const sc = plot.bars(L, { categories: ans.map((a) => a.k), series: [], height: 210, y: { min: -2.5, max: 2.5, label: '채점기 점수' }, legend: false, labels: true, labelFmt: (v) => v.toFixed(2) });
    const pb = plot.bars(R, { categories: ans.map((a) => a.k), series: [], height: 210, y: { min: 0, max: 1, label: '답을 쓸 확률' } });
    const r = sim.rng(21);
    let clicks = [], queue = [], cur = null;
    const allPairs = [];
    for (let i = 0; i < ans.length; i++) for (let j = i + 1; j < ans.length; j++) allPairs.push([i, j]);
    function nextPair() {
      if (!queue.length) {
        queue = allPairs.slice();
        for (let i = queue.length - 1; i > 0; i--) { const j = r.int(i + 1); [queue[i], queue[j]] = [queue[j], queue[i]]; }
      }
      const pr = queue.pop();
      cur = r() < 0.5 ? pr : [pr[1], pr[0]];
    }
    function fit() {
      const th = new Array(ans.length).fill(0);
      if (!clicks.length) return th;
      for (let it = 0; it < 400; it++) {
        const g = th.map((x) => lam * x);
        clicks.forEach(([w, l]) => { const c = (sim.sigmoid(th[w] - th[l]) - 1) / clicks.length; g[w] += c; g[l] -= c; });
        for (let k = 0; k < th.length; k++) th[k] -= 0.8 * g[k];
      }
      const m = sim.mean(th);
      return th.map((x) => x - m);
    }
    function pick(side) {
      const w = cur[side], l = cur[1 - side];
      clicks.push([w, l]);
      nextPair();
      draw();
    }
    pickBtns.forEach((b, side) => b.addEventListener('click', () => pick(side)));
    function auto(judge) {
      clicks = []; queue = [];
      for (let k = 0; k < ROUNDS; k++) { nextPair(); const w = judge(cur[0], cur[1]); clicks.push([w, w === cur[0] ? cur[1] : cur[0]]); }
      nextPair();
      draw();
    }
    function reset() { clicks = []; queue = []; nextPair(); draw(); }
    function draw() {
      const th = fit();
      const beta = bS.get();
      const pistar = sim.softmax(pref.map((x, i) => Math.log(x) + th[i] / beta));
      const n = clicks.length;
      pickBtns.forEach((b, side) => { b.innerHTML = '<strong>' + ans[cur[side]].k + '</strong>. ' + ans[cur[side]].t; });
      const order = sim.range(ans.length).sort((a, b) => th[b] - th[a]);
      if (!n) status.innerHTML = '아직 고른 것이 없다. 채점기 점수는 모두 0이고, 챗봇은 원래 확률 그대로다. 아래 두 답 중 나은 쪽을 누르면 시작한다.';
      else if (n < ROUNDS) status.innerHTML = n + '번 골랐다. 지금 채점기는 ' + order.map((i) => ans[i].k).join(' > ') + ' 순으로 본다. 앞으로 ' + (ROUNDS - n) + '번 남았다.';
      else status.innerHTML = n + '번 골랐다. 채점기는 ' + order.map((i) => ans[i].k).join(' > ') + ' 순으로 본다. 비교되지 않았거나 이기고 진 횟수가 같은 답은 0점 근처에 남는다. 더 고르면 계속 반영된다.';
      sc.update({ series: [{ name: '채점기 점수', values: th, colors: th.map((v) => (v >= 0 ? 'good' : 'bad')) }] });
      pb.update({ series: [
        { name: '원래 챗봇', color: 'c6', values: pref, opacity: 0.6 },
        { name: '고친 챗봇 (원래 확률 × e^(점수/β))', color: 'c1', values: pistar },
      ] });
      st.set('n', n);
      st.set('top', n ? ans[order[0]].k : '–');
      st.set('pt', n ? ui.fmt.pct(pistar[order[0]]) : '–');
    }
    reset();
  }

  /* ---------- 보상모델 학습 시뮬레이터 ---------- */
  function mountRM(el) {
    const K = 16;
    const p = ui.panel(el, { kind: 'SIM', title: 'Bradley–Terry 보상모델 학습', caption: '라벨 잡음 슬라이더를 오른쪽으로 밀면, 오른쪽 그래프의 파란 검증 정확도가 주황 점선(어떤 채점기도 넘을 수 없는 상한)에 묶여 함께 내려간다. 비교 쌍 수를 30까지 줄이면 초록 학습 정확도만 높고 파란 검증 정확도는 떨어진다. 왼쪽 그래프는 학습한 점수 $\\theta_i$(점)와 이상적인 값 $(u_i-\\bar u)/\\tau$(선)이고, 오른쪽 그래프는 경사하강 스텝에 따른 정확도다.' });
    const ctr = ui.row(p.body);
    const tauS = ui.slider(ctr, { label: '라벨 잡음 $\\tau$', min: 0.1, max: 2, step: 0.05, value: 0.8, format: ui.fmt.f(2), onInput: run });
    const nS = ui.slider(ctr, { label: '학습 비교 쌍 수', min: 20, max: 2000, step: 10, value: 300, format: ui.fmt.int, onInput: run });
    const regS = ui.slider(ctr, { label: 'L2 정규화 $\\lambda$', min: 0, max: 0.05, step: 0.001, value: 0.002, format: ui.fmt.f(3), onInput: run });
    const btns = ui.row(p.body, 'btns');
    let seed = 1;
    ui.button(btns, '새 데이터 샘플', () => { seed++; run(); }, { primary: true });
    const st = ui.stats(p.body, [
      { key: 'tr', label: '학습 정확도' },
      { key: 'te', label: '검증 정확도 (잡음 라벨)', tone: 'accent' },
      { key: 'ceil', label: 'Bayes 상한', tone: 'signal' },
      { key: 'rank', label: '참 순위 일치율' },
      { key: 'corr', label: '$\\theta$와 $u$의 상관' },
    ]);
    const split = document.createElement('div');
    split.className = 'w-split';
    const L = document.createElement('div'), R = document.createElement('div');
    split.append(L, R);
    p.body.appendChild(split);
    const sc = plot.line(L, { height: 250, x: { label: '참 효용 u (중심화)' }, y: { label: '학습 점수 θ (중심화)' }, series: [], hover: false });
    const lc = plot.line(R, { height: 250, x: { label: '경사하강 스텝', min: 0 }, y: { label: '정확도', min: 0.4, max: 1 }, series: [] });

    function run() {
      const r = sim.rng(1000 + seed);
      const tau = tauS.get(), N = nS.get(), lam = regS.get();
      const u = sim.range(K).map(() => r.normal());
      const lab = () => {
        const i = r.int(K); let j = r.int(K - 1); if (j >= i) j++;
        const pij = sim.sigmoid((u[i] - u[j]) / tau);
        return r() < pij ? [i, j] : [j, i];
      };
      const train = sim.range(N).map(lab);
      const test = sim.range(3000).map(lab);
      // Bayes 상한: 각 검증 쌍에서 max(p, 1-p)
      let ceil = 0;
      test.forEach(([w, l]) => { const q = sim.sigmoid((u[w] - u[l]) / tau); ceil += Math.max(q, 1 - q); });
      ceil /= test.length;
      const acc = (th, data) => sim.mean(data.map(([w, l]) => (th[w] > th[l] ? 1 : th[w] === th[l] ? 0.5 : 0)));
      const th = new Array(K).fill(0);
      const lr = 0.015 * K;
      const steps = 300;
      const curTr = [], curTe = [];
      for (let s = 0; s <= steps; s++) {
        if (s % 5 === 0) { curTr.push([s, acc(th, train)]); curTe.push([s, acc(th, test)]); }
        const g = new Array(K).fill(0);
        train.forEach(([w, l]) => { const c = sim.sigmoid(th[w] - th[l]) - 1; g[w] += c; g[l] -= c; });
        for (let k = 0; k < K; k++) th[k] -= lr * (g[k] / N + lam * th[k]);
      }
      const mu = sim.mean(u), mt = sim.mean(th);
      const uc = u.map((x) => x - mu), tc = th.map((x) => x - mt);
      let pairs = 0, agree = 0;
      for (let i = 0; i < K; i++) for (let j = i + 1; j < K; j++) { pairs++; if ((u[i] - u[j]) * (th[i] - th[j]) > 0) agree++; }
      const corr = sim.mean(uc.map((x, i) => x * tc[i])) / (sim.std(uc) * sim.std(tc) || 1);
      const lo = Math.min(...uc), hi = Math.max(...uc);
      const tlo = Math.min(...tc, lo / tau), thi = Math.max(...tc, hi / tau);
      const px = (hi - lo) * 0.08, py = (thi - tlo) * 0.08;
      sc.update({ x: { label: '참 효용 u (중심화)', min: lo - px, max: hi + px }, y: { label: '학습 점수 θ (중심화)', min: tlo - py, max: thi + py }, series: [
        { name: '이상적 점수 $(u-\\bar u)/\\tau$', color: 'c2', data: [[lo, lo / tau], [hi, hi / tau]], dash: '5 4', endDot: false },
        { name: '학습한 $\\theta$', color: 'c1', type: 'scatter', r: 4, data: uc.map((x, i) => [x, tc[i]]) },
      ] });
      lc.update({ series: [
        { name: '학습 정확도', color: 'c3', data: curTr },
        { name: '검증 정확도', color: 'c1', data: curTe },
      ], hlines: [{ y: ceil, label: 'Bayes 상한 ' + (ceil * 100).toFixed(1) + '%', color: 'signal' }] });
      st.set('tr', ui.fmt.pct(curTr[curTr.length - 1][1]));
      st.set('te', ui.fmt.pct(curTe[curTe.length - 1][1]));
      st.set('ceil', ui.fmt.pct(ceil));
      st.set('rank', ui.fmt.pct(agree / pairs));
      st.set('corr', corr.toFixed(3));
    }
    run();
  }

  /* ---------- 토큰 단위 보상 · GAE 계산기 ---------- */
  function mountTokenCalc(el) {
    const T = 12;
    const p = ui.panel(el, { kind: 'CALC', title: '토큰 단위 보상과 GAE ($\\gamma=1$)', caption: 'GAE λ 슬라이더를 0에서 1로 천천히 옮기면, 마지막 토큰에 몰려 있던 파란 막대(advantage)가 앞쪽 토큰으로 번진다. 응답은 12토큰이고, 각 토큰의 로그비 $\\log\\frac{\\pi_\\theta}{\\pi_{\\text{ref}}}$는 "정책 이동량"에 비례하게 만들었다. critic은 모든 위치에서 같은 값 $c$를 예측한다고 두었다. 샘플 하나의 로그비는 음수일 수도 있고, 그 기댓값이 KL이다.' });
    const ctr = ui.row(p.body);
    const rmS = ui.slider(ctr, { label: 'RM 점수 $r_\\phi$', min: -2, max: 3, step: 0.1, value: 1.5, format: ui.fmt.f(1), onInput: draw });
    const bS = ui.slider(ctr, { label: 'KL 계수 $\\beta$', min: 0, max: 0.5, step: 0.01, value: 0.1, format: ui.fmt.f(2), onInput: draw });
    const dS = ui.slider(ctr, { label: '정책 이동량', min: 0, max: 2, step: 0.05, value: 0.8, format: ui.fmt.f(2), onInput: draw });
    const lS = ui.slider(ctr, { label: 'GAE $\\lambda$', min: 0, max: 1, step: 0.01, value: 0.95, format: ui.fmt.f(2), onInput: draw });
    const cS = ui.slider(ctr, { label: 'critic 예측 $c$', min: -1, max: 2, step: 0.05, value: 0.5, format: ui.fmt.f(2), onInput: draw });
    const st = ui.stats(p.body, [
      { key: 'kl', label: '$\\sum_t \\log\\frac{\\pi_\\theta}{\\pi_{\\text{ref}}}$ (KL 추정)' },
      { key: 'ret', label: '총 보상 $\\sum_t r_t$', tone: 'accent' },
      { key: 'a0', label: '첫 토큰 advantage $\\hat A_1$', tone: 'signal' },
      { key: 'aT', label: '마지막 토큰 $\\hat A_T$' },
    ]);
    const chartEl = document.createElement('div');
    p.body.appendChild(chartEl);
    const ch = plot.bars(chartEl, { categories: sim.range(T).map((t) => 't' + (t + 1)), series: [], height: 240, y: { label: '값' } });
    const base = (() => { const r = sim.rng(42); return sim.range(T).map(() => r.normal() * 0.6 + 0.5); })();
    function draw() {
      const beta = bS.get(), rm = rmS.get(), lam = lS.get(), c = cS.get(), drift = dS.get();
      const lr = base.map((z) => z * drift);
      const rew = lr.map((x, t) => -beta * x + (t === T - 1 ? rm : 0));
      const V = new Array(T).fill(c).concat([0]);
      const delta = rew.map((x, t) => x + V[t + 1] - V[t]);
      const A = new Array(T).fill(0);
      let acc = 0;
      for (let t = T - 1; t >= 0; t--) { acc = delta[t] + lam * acc; A[t] = acc; }
      ch.update({ series: [
        { name: '토큰 보상 $r_t$', color: 'c2', values: rew },
        { name: 'TD 오차 $\\delta_t$', color: 'c6', values: delta, opacity: 0.6 },
        { name: 'GAE advantage $\\hat A_t$', color: 'c1', values: A },
      ] });
      st.set('kl', sim.sum(lr).toFixed(3));
      st.set('ret', sim.sum(rew).toFixed(3));
      st.set('a0', A[0].toFixed(3));
      st.set('aT', A[T - 1].toFixed(3));
    }
    draw();
  }

  /* ---------- 과최적화 곡선 ---------- */
  function mountOveropt(el) {
    const p = ui.panel(el, { kind: 'CALC', title: '보상모델 과최적화 (Gao et al. 2022 함수형, 계수는 예시)', caption: '슬라이더로 계수를 바꾸면, 초록 점선(채점기 점수)은 계속 오르지만 파랑과 주황 곡선(실제 품질)은 꼭대기를 찍고 내려온다. 가로축은 $d=\\sqrt{\\mathrm{KL}}$이다. 대리 점수는 예시로 $\\alpha_{\\text{RL}}\\,d$로 두었고, 계수도 모양을 보여 주려고 고른 예시 값이다. 정점의 위치는 $d^*_{\\text{bon}} = \\alpha/(2\\beta)$, $d^*_{\\text{RL}} = e^{\\alpha/\\beta - 1}$이고, 슬라이더를 움직이면 함께 이동한다.' });
    const ctr = ui.row(p.body);
    const aB = ui.slider(ctr, { label: '$\\alpha_{\\text{bon}}$', min: 0.2, max: 2, step: 0.05, value: 1.0, format: ui.fmt.f(2), onInput: draw });
    const bB = ui.slider(ctr, { label: '$\\beta_{\\text{bon}}$', min: 0.02, max: 0.5, step: 0.01, value: 0.12, format: ui.fmt.f(2), onInput: draw });
    const aR = ui.slider(ctr, { label: '$\\alpha_{\\text{RL}}$', min: 0.2, max: 2, step: 0.05, value: 0.8, format: ui.fmt.f(2), onInput: draw });
    const bR = ui.slider(ctr, { label: '$\\beta_{\\text{RL}}$', min: 0.05, max: 0.8, step: 0.01, value: 0.25, format: ui.fmt.f(2), onInput: draw });
    const st = ui.stats(p.body, [
      { key: 'kb', label: 'BoN 정점 KL (nats)', tone: 'accent' },
      { key: 'nb', label: '그 KL에 해당하는 N', tone: 'accent' },
      { key: 'kr', label: 'RL 정점 KL (nats)', tone: 'signal' },
      { key: 'gr', label: 'RL 정점의 실제 품질', tone: 'signal' },
    ]);
    const chartEl = document.createElement('div');
    p.body.appendChild(chartEl);
    const ch = plot.line(chartEl, { height: 280, x: { min: 0, max: 12, label: 'd = √KL(π ‖ π_init)' }, y: { label: '점수 (초기 정책 대비)' }, series: [] });
    // BoN의 KL: log N - (N-1)/N 을 KL에 맞는 N으로 역산
    const nForKL = (kl) => { let lo = 1, hi = 1e12; for (let i = 0; i < 200; i++) { const mid = Math.sqrt(lo * hi); if (Math.log(mid) - (mid - 1) / mid < kl) lo = mid; else hi = mid; } return lo; };
    function draw() {
      const ab = aB.get(), bb = bB.get(), ar = aR.get(), br = bR.get();
      const dB = ab / (2 * bb);
      const dR = Math.exp(ar / br - 1);
      const gRL = (d) => (d <= 0 ? 0 : d * (ar - br * Math.log(d)));
      const gBon = (d) => d * (ab - bb * d);
      const xs = sim.range(241).map((i) => i * 0.05);
      const pts = [];
      if (dB <= 12) pts.push([dB, gBon(dB), 6]);
      ch.update({ series: [
        { name: '대리 RM 점수 (예시: $\\alpha_{\\text{RL}} d$)', color: 'c3', dash: '6 4', data: xs.map((d) => [d, ar * d]) },
        { name: '실제 품질, Best-of-N', color: 'c1', data: xs.map((d) => [d, gBon(d)]), points: pts },
        { name: '실제 품질, RL', color: 'c2', data: xs.map((d) => [d, gRL(d)]), points: dR <= 12 ? [[dR, gRL(dR), 6]] : [] },
      ], y: { label: '점수 (초기 정책 대비)', min: -2, max: Math.max(4, ar * 6) }, hlines: [{ y: 0, label: '초기 정책' }] });
      st.set('kb', (dB * dB).toFixed(1));
      const n = nForKL(dB * dB);
      st.set('nb', n > 1e9 ? '> 10⁹' : Math.round(n).toLocaleString());
      st.set('kr', dR * dR > 1e4 ? '> 10⁴' : (dR * dR).toFixed(1));
      st.set('gr', gRL(dR).toFixed(2));
    }
    draw();
  }
})();
