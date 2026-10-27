/* 19 RLHF: 보상모델과 PPO */
(function () {
  const { ui, sim, plot } = RL;

  RL.chapter({
    id: 'rlhf',
    title: 'RLHF: 보상모델과 PPO',
    subtitle: '좋은 답을 수식으로 적을 수는 없지만, 두 답 중 어느 쪽이 나은지는 사람이 고를 수 있다. 그 비교를 보상 함수로 바꾸고, KL 고삐를 단 PPO로 정책을 민다.',
    time: 40,
    level: '중급 · LLM',
    prereq: ['llm-mdp', 'ppo'],
    theses: ['T5', 'T4', 'T3', 'T7'],
    goals: [
      'SFT → 보상모델 → PPO로 이어지는 RLHF 파이프라인의 각 단계가 무엇을 학습하는지 설명할 수 있다.',
      '잠재 효용에 Gumbel 잡음을 더한 모형에서 Bradley–Terry 선호확률과 보상모델 손실을 유도할 수 있다.',
      'LLM용 PPO의 토큰 단위 보상 $r_t = -\\beta\\log\\frac{\\pi_\\theta}{\\pi_{\\text{ref}}} + [t=T]\\,r_\\phi$와 GAE 계산을 직접 해 본다.',
      '보상모델 과최적화(Goodhart)가 왜 생기고, KL·앙상블·길이 제어가 각각 무엇을 막는지 설명할 수 있다.',
    ],
    html: String.raw`
<p>사전학습된 LLM은 "다음 토큰 예측"을 잘할 뿐, 도움이 되고 정직하고 해롭지 않은 답을 고르도록 훈련되지 않았다. 그런데 "좋은 답"을 보상 함수로 직접 적기는 거의 불가능하다. RLHF(Reinforcement Learning from Human Feedback)의 아이디어는 단순하다. <strong>사람에게 점수를 매기게 하지 말고 비교하게 하라.</strong> 비교는 절대 점수보다 훨씬 일관되고, 비교 데이터에서 보상 함수를 통계적으로 복원할 수 있다.</p>

<h2>계보: 로봇 다리에서 ChatGPT까지</h2>
<div class="table-wrap"><table class="t">
<thead><tr><th>연구</th><th>환경</th><th>기여</th></tr></thead>
<tbody>
<tr><td>Christiano et al. 2017<br><em>Deep RL from Human Preferences</em></td><td>Atari, MuJoCo</td><td>궤적 조각 두 개를 보여 주고 사람이 고르게 함. 비교에서 보상 모델을 학습하고 그 보상으로 RL. 사람 라벨은 상호작용의 1% 미만으로 충분했다.</td></tr>
<tr><td>Ziegler et al. 2019, Stiennon et al. 2020<br><em>Learning to Summarize from HF</em></td><td>언어모델 요약</td><td>LM 정책을 PPO로 미세조정하고 <strong>SFT 모델에 대한 KL 페널티</strong>를 보상에 넣음. 보상모델을 지나치게 최적화하면 사람 평가가 다시 떨어지는 현상을 관찰.</td></tr>
<tr><td>Ouyang et al. 2022<br><em>InstructGPT</em></td><td>범용 지시 따르기</td><td>SFT → RM → PPO 3단계를 정립. 사전학습 손실을 섞는 PPO-ptx로 공개 벤치마크 성능 하락("alignment tax")을 줄임.</td></tr>
<tr><td>Bai et al. 2022a, 2022b<br><em>HH-RLHF, Constitutional AI</em></td><td>도움 · 무해성</td><td>새 정책의 샘플로 RM을 주기적으로 갱신하는 반복형(online) RLHF. 원칙 목록으로 AI가 비교 라벨을 만드는 RLAIF.</td></tr>
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
  <li><strong>SFT</strong>: 시연 데이터로 지도학습. 정책이 "말이 되는 답"을 내는 영역으로 먼저 옮겨 놓는다. RL은 모델이 이미 가끔 내는 답을 더 자주 내게 만들 뿐이므로, 출발점이 중요하다.</li>
  <li><strong>보상모델(RM)</strong>: 같은 프롬프트에 대한 응답 2개(또는 $K$개 순위)를 사람이 비교. LM 몸통에 스칼라 헤드를 단 모델을 Bradley–Terry 우도로 학습한다.</li>
  <li><strong>RL</strong>: 프롬프트만 주고 정책이 생성, RM이 채점, 기준 정책과의 KL로 고삐를 맨 채 PPO로 갱신한다.</li>
</ol>

<h2>RLHF의 목적 함수</h2>
<div data-w="fx-obj"></div>
<p>이 목적은 <a href="#llm-mdp">18장</a>에서 본 KL-정규화 문제 그 자체다. 정책 공간 전체에서 풀면 닫힌 해가 있다.</p>
$$\pi^*(y\mid x) = \frac{1}{Z(x)}\,\pi_{\text{ref}}(y\mid x)\,\exp\!\Big(\frac{r_\phi(x,y)}{\beta}\Big)$$
<div class="thesis-box"><span class="label">대전제 T5 · KL-정규화 해</span>
<p>RLHF가 실제로 하는 일은 <strong>기준 모델의 분포를 보상의 지수로 재가중</strong>하는 것이다. 새 답을 발명한다기보다 SFT 모델이 이미 낼 수 있는 답 중 좋은 쪽으로 확률을 옮긴다. $\beta$가 작을수록 보상 쪽으로 더 많이 옮기고, 그만큼 보상모델의 오류에도 더 많이 노출된다. 이 닫힌 해를 거꾸로 풀어 RM과 RL을 하나의 분류 손실로 합친 것이 <a href="#dpo">20장 DPO</a>다.</p>
</div>

<h2>Bradley–Terry: 비교에서 보상으로</h2>
<p>사람이 두 응답을 비교할 때 머릿속에 잠재 효용이 있고, 매번 약간의 잡음이 섞인다고 가정하자. 잡음 분포로 Gumbel을 고르면 선호확률이 정확히 로지스틱이 된다.</p>
<div data-w="dv-bt"></div>
<div data-w="fx-rm"></div>

<h3>시뮬레이터: 잡음 섞인 비교에서 보상 복원하기</h3>
<p>16개의 응답에 숨겨진 참 효용 $u_i$가 있다. 라벨러는 $\Pr(i \succ j) = \sigma\big((u_i - u_j)/\tau\big)$로 고른다($\tau$가 클수록 라벨이 시끄럽다). 무작위 쌍에 대한 비교 라벨로 BT 점수 $\theta_i$를 경사하강으로 학습한다. 두 가지를 확인하라. (1) 검증 정확도는 라벨 잡음이 정하는 <strong>상한(Bayes 정확도)</strong>을 넘을 수 없다. (2) 그 상한이 70%대여도 <strong>순위 자체는 거의 정확히</strong> 복원될 수 있다.</p>
<div data-w="rm-sim"></div>
<div class="aside"><span class="label">실제 수치 감각</span>InstructGPT 논문은 학습용 라벨러들끼리의 일치율을 약 73% 수준으로 보고했다. 사람 선호 데이터로 학습한 보상모델의 검증 정확도가 60~70%대에 머무는 것은 모델이 약해서라기보다 이 상한 때문인 경우가 많다. 반대로 말하면 RM의 "정확도"만 보고 정책 최적화의 안전 여유를 판단하면 안 된다.</div>

<h2>LLM을 위한 PPO</h2>
<p>LLM 생성은 <a href="#llm-mdp">18장</a>의 토큰 MDP다. 상태는 프롬프트와 지금까지의 토큰, 행동은 다음 토큰, 전이는 결정적이고, $\gamma = 1$이 보통이다. InstructGPT 계열 구현은 KL을 <strong>토큰마다 보상에 섞고</strong>, RM 점수는 마지막 토큰에만 준다.</p>
$$r_t = -\beta \log\frac{\pi_\theta(y_t\mid x, y_{\lt t})}{\pi_{\text{ref}}(y_t\mid x, y_{\lt t})} \;+\; \mathbb{1}[t = T]\; r_\phi(x, y)$$
<p>토큰별 로그비를 다 더하면 $\log\frac{\pi_\theta(y|x)}{\pi_{\text{ref}}(y|x)}$, 즉 시퀀스 KL의 단일 샘플 추정량이 된다. 그 위에 가치 헤드(critic) $V_\psi(s_t)$를 두고 <a href="#ac">12장</a>의 GAE로 토큰별 advantage를 만든 뒤 <a href="#ppo">13장</a>의 클립 목적을 그대로 적용한다. 아래 계산기로 희소한 끝 보상이 GAE의 $\lambda$에 따라 앞쪽 토큰으로 어떻게 흘러가는지 보자.</p>
<div data-w="token-calc"></div>
<div class="grid2">
  <div class="card"><h4>메모리에 올라가는 네 모델</h4><p><strong>정책</strong> $\pi_\theta$(학습), <strong>기준</strong> $\pi_{\text{ref}}$(고정, KL 계산), <strong>보상모델</strong> $r_\phi$(고정, 채점), <strong>critic</strong> $V_\psi$(학습, 보통 RM에서 초기화). 같은 크기의 모델 네 개가 공학적 비용의 대부분이다.</p></div>
  <div class="card"><h4>critic이 가장 어렵다</h4><p>보상이 끝에 한 번만 오므로 critic은 "이 접두어에서 최종적으로 받을 점수"를 맞혀야 한다. 이 추정이 부정확하면 advantage 잡음이 커진다. 그래서 critic을 없애는 RLOO·ReMax·GRPO 계열(<a href="#reasoning">21장</a>)이 나왔다.</p></div>
</div>

<h2>보상 해킹과 과최적화</h2>
<p>보상모델은 사람 선호의 <strong>대리 지표(proxy)</strong>다. 정책이 RM 점수를 끝까지 밀어 올리면 RM이 학습 때 본 적 없는 영역으로 나가고, 거기서 RM은 틀린다. Goodhart의 법칙: 지표가 목표가 되면 좋은 지표이기를 멈춘다. Gao, Schulman, Hilton(2022)은 큰 "gold" RM을 사람 대신 쓰는 합성 실험으로 이 현상을 정량화했고, 초기 정책에서의 거리 $d = \sqrt{\mathrm{KL}(\pi\|\pi_{\text{init}})}$에 대해 다음 함수형이 잘 맞는다고 보고했다.</p>
$$R^{\text{gold}}_{\text{BoN}}(d) = d\,(\alpha_{\text{bon}} - \beta_{\text{bon}}\, d), \qquad R^{\text{gold}}_{\text{RL}}(d) = d\,(\alpha_{\text{RL}} - \beta_{\text{RL}} \log d)$$
<div data-w="overopt"></div>
<div class="table-wrap"><table class="t">
<thead><tr><th>처방</th><th>무엇을 막나</th><th>대가</th></tr></thead>
<tbody>
<tr><td>KL 페널티 $\beta$</td><td>정책이 RM의 신뢰 영역 밖으로 나가는 것 (T4 · 신뢰영역의 LLM판)</td><td>얻을 수 있는 최대 개선이 줄어든다</td></tr>
<tr><td>RM 앙상블 / 불확실성 페널티 (Coste et al. 2023)</td><td>한 RM의 특이한 오류를 집중 공략하는 것. 평균 또는 최솟값으로 비관적 점수 (T7)</td><td>RM 여러 개 학습 · 추론 비용</td></tr>
<tr><td>길이 제어 (Singhal et al. 2023 등)</td><td>"길수록 좋다"는 RM의 허위 상관을 이용하는 것</td><td>길이 정규화가 실제 품질 신호도 깎을 수 있다</td></tr>
<tr><td>더 큰 RM, 더 많은 비교 데이터 (Gao et al. 2022)</td><td>과최적화가 시작되는 KL 지점을 뒤로 민다</td><td>라벨 비용</td></tr>
<tr><td>반복형 RLHF (Bai et al. 2022a)</td><td>정책 분포가 바뀐 곳에서 새로 비교 라벨을 받아 RM을 갱신</td><td>사람 루프 운영 비용</td></tr>
</tbody></table></div>
<p>이 문제의 구조는 <a href="#offline">15장 오프라인 RL</a>과 같다. RM은 고정된 데이터로 학습한 가치 추정기이고, 정책은 그 추정기의 argmax를 찾아 데이터 밖으로 나간다. 그래서 처방도 같은 계열이다. 데이터 근처에 머물게 하거나(KL), 불확실한 곳을 비관적으로 평가하거나(앙상블), 데이터를 더 모은다(반복형).</p>

<h2>Constitutional AI와 RLAIF</h2>
<p>Bai et al.(2022b)은 유해성 라벨을 사람 대신 AI가 만들게 했다. 두 단계다.</p>
<ul>
  <li><strong>SL-CAI</strong>: 모델이 자기 답을 원칙 목록(constitution)에 비추어 비판하고 고쳐 쓴다. 고친 답으로 SFT.</li>
  <li><strong>RL-CAI</strong>: 응답 쌍 중 원칙에 더 맞는 쪽을 AI가 고른다. 그 AI 비교 라벨로 선호 모델을 학습하고 RL. 이것이 RLAIF(RL from AI Feedback)다.</li>
</ul>
<p>RLAIF는 피드백 비용의 병목을 없앤 대신, 판정 모델의 편향이 그대로 보상이 된다는 새 문제를 만든다. 이후 LLM 판정자를 보상으로 쓰는 흐름(LLM-as-a-judge, self-rewarding)과 <a href="#reasoning">21장</a>의 검증 가능한 보상(RLVR)은 "사람 라벨 없이 보상을 어디서 얻을 것인가"라는 같은 질문에 대한 다른 답이다.</p>

<h2>파생: 무엇이 바뀌었나</h2>
<div class="table-wrap"><table class="t">
<thead><tr><th>방법</th><th>바꾼 부분</th><th>남긴 부분</th></tr></thead>
<tbody>
<tr><td>PPO-ptx (InstructGPT)</td><td>목적에 사전학습 로그우도 항 추가</td><td>RM + KL + PPO</td></tr>
<tr><td>Safe RLHF (Dai et al. 2023)</td><td>보상과 비용(해로움) 모델을 분리, 라그랑지안 제약 최적화</td><td>PPO</td></tr>
<tr><td>RLOO, ReMax (Ahmadian et al. 2024, Li et al. 2023)</td><td>critic 제거. 같은 프롬프트의 다른 샘플이나 greedy 응답의 보상을 baseline으로</td><td>RM + KL, 점수함수 경사(T3)</td></tr>
<tr><td>GRPO (<a href="#reasoning">21장</a>)</td><td>그룹 평균/표준편차로 advantage 정규화, KL을 손실 항으로</td><td>PPO 클립</td></tr>
<tr><td>DPO 계열 (<a href="#dpo">20장</a>)</td><td>RM 학습과 RL을 하나의 분류 손실로 합침</td><td>BT 선호 모형 + KL 정규화 목적</td></tr>
<tr><td>Best-of-N / 거절 샘플링 (<a href="#test-time">22장</a>)</td><td>학습 대신 추론 시 N개 중 RM 최고점 선택</td><td>RM. KL 예산은 $\log N - (N-1)/N$</td></tr>
<tr><td>RLAIF / CAI</td><td>비교 라벨을 AI가 생성</td><td>RM + RL 구조</td></tr>
</tbody></table></div>
`,
    mount: {
      'fx-obj': (el) => ui.formula(el, {
        title: 'RLHF 목적 (InstructGPT의 PPO-ptx 형태)',
        tex: String.raw`\tm{max}{\max_{\theta}}\; \tm{dx}{\mathbb{E}_{x\sim\mathcal{D}}}\,\tm{dy}{\mathbb{E}_{y\sim\pi_\theta(\cdot|x)}}\Big[\tm{rm}{r_\phi(x,y)} - \tm{beta}{\beta}\, \tm{kl}{\log\frac{\pi_\theta(y|x)}{\pi_{\text{ref}}(y|x)}}\Big] + \tm{ptx}{\gamma_{\text{ptx}}\,\mathbb{E}_{x\sim\mathcal{D}_{\text{pre}}}\big[\log\pi_\theta(x)\big]}`,
        terms: [
          { id: 'max', sym: '\\max_\\theta', label: '정책 파라미터 최적화', desc: 'LM 전체(또는 LoRA)를 갱신.' },
          { id: 'dx', sym: '\\mathbb{E}_{x\\sim\\mathcal{D}}', label: '프롬프트 분포', desc: 'RL 단계에서는 프롬프트만 필요. 정답 응답은 없다.', long: '프롬프트 분포의 구성이 무엇을 정렬할지를 정한다. RL 단계의 데이터는 정책이 스스로 생성하므로 on-policy다.' },
          { id: 'dy', sym: '\\mathbb{E}_{y\\sim\\pi_\\theta}', label: '정책 샘플', desc: '현재 정책이 생성한 응답에 대한 기댓값.', long: '이 기댓값이 θ에 의존하므로 미분하려면 점수함수 경사(T3)가 필요하다. PPO는 이전 정책의 샘플을 중요도비로 재사용한다.' },
          { id: 'rm', sym: 'r_\\phi(x,y)', label: '보상모델 점수', desc: '사람 비교로 학습한 대리 보상.', long: 'BT로 학습했으므로 프롬프트별 상수만큼의 이동이 정해지지 않는다. 실전에서는 점수를 정규화하거나 critic이 이를 흡수한다.' },
          { id: 'beta', sym: '\\beta', label: 'KL 계수', desc: '보상 추구와 기준 유지 사이의 교환비.', long: '닫힌 해에서 $\\beta$는 볼츠만 분포의 온도다. 작으면 보상에 민감하게 재가중하고(과최적화 위험), 크면 기준 모델에 붙어 있는다. 목표 KL을 정해 $\\beta$를 적응 조절하는 구현도 있다(Ziegler et al. 2019).' },
          { id: 'kl', sym: '\\log\\frac{\\pi_\\theta}{\\pi_{\\text{ref}}}', label: 'KL의 샘플 추정', desc: '샘플 y에서의 로그비. 기댓값을 취하면 KL.', long: '역방향 KL $\\mathrm{KL}(\\pi_\\theta\\|\\pi_{\\text{ref}})$이다. $\\pi_{\\text{ref}}$가 거의 0인 곳에 질량을 두면 무한대 페널티, 반대로 $\\pi_{\\text{ref}}$의 모드 일부를 버리는 것은 싸다. 그래서 RLHF 후 다양성이 줄어드는 경향이 있다.' },
          { id: 'ptx', sym: '\\gamma_{\\text{ptx}}\\,\\mathbb{E}[\\log\\pi_\\theta]', label: '사전학습 손실 혼합', desc: 'InstructGPT의 PPO-ptx. 일반 능력 퇴화를 완화.', long: '정렬 과정에서 공개 NLP 벤치마크 성능이 떨어지는 alignment tax를 줄이기 위해 사전학습 분포의 로그우도를 함께 최대화한다.' },
        ],
      }),
      'dv-bt': (el) => ui.derivation(el, {
        title: 'Gumbel 잡음 효용 모형 → Bradley–Terry → 보상모델 손실',
        steps: [
          { tex: String.raw`U(y) = r(x,y) + \varepsilon_y,\qquad \varepsilon_y \overset{\text{iid}}{\sim} \mathrm{Gumbel}(0,1)`, why: '라벨러는 잠재 효용 $U$가 더 큰 응답을 고른다고 가정한다. 잡음은 응답마다 독립.' },
          { tex: String.raw`\Pr(y_w \succ y_l) = \Pr\big(U(y_w) > U(y_l)\big) = \Pr\big(\hl{\varepsilon_l - \varepsilon_w} < r_w - r_l\big)`, why: '$r_w = r(x,y_w)$, $r_l = r(x,y_l)$로 줄여 쓴다.' },
          { tex: String.raw`\varepsilon_l - \varepsilon_w \sim \mathrm{Logistic}(0,1),\qquad F(z) = \frac{1}{1+e^{-z}} = \sigma(z)`, why: '독립인 두 표준 Gumbel의 차는 표준 로지스틱 분포를 따른다. 이것이 Gumbel을 고른 이유다.' },
          { tex: String.raw`\Pr(y_w \succ y_l) = \hl{\sigma(r_w - r_l)} = \frac{e^{r_w}}{e^{r_w} + e^{r_l}}`, why: '<strong>Bradley–Terry 모형</strong>. $K$개 중 하나를 고르는 경우로 일반화하면 softmax(Luce 선택 공리), 순위 전체로 일반화하면 Plackett–Luce가 된다.' },
          { tex: String.raw`\mathcal{L}_{\text{RM}}(\phi) = -\,\mathbb{E}_{(x,y_w,y_l)\sim\mathcal{D}}\Big[\log\sigma\big(r_\phi(x,y_w) - r_\phi(x,y_l)\big)\Big]`, why: '비교 데이터의 음의 로그우도. 응답 쌍을 입력으로 받는 이진 로지스틱 회귀이며, "정답"은 항상 $y_w$ 쪽이다.' },
          { tex: String.raw`r_\phi(x,y) \;\to\; r_\phi(x,y) + \hl{f(x)} \quad\Rightarrow\quad \sigma\big((r_w + f) - (r_l + f)\big) = \sigma(r_w - r_l)`, why: '선호확률은 같은 프롬프트 안의 <strong>차이</strong>에만 의존한다. 그래서 RM은 프롬프트별 상수까지만 식별되고, 절대값은 의미가 없다. 척도는 라벨러 잡음의 크기($\\tau$)가 정한다.' },
        ],
      }),
      'fx-rm': (el) => ui.formula(el, {
        title: '보상모델 손실 해부',
        tex: String.raw`\mathcal{L}(\phi) = -\,\tm{data}{\mathbb{E}_{(x, y_w, y_l)}}\Big[\,\tm{log}{\log}\,\tm{sig}{\sigma}\big(\tm{rw}{r_\phi(x,y_w)} - \tm{rl}{r_\phi(x,y_l)}\big)\Big]`,
        terms: [
          { id: 'data', sym: '(x,y_w,y_l)', label: '비교 데이터', desc: '프롬프트, 선택된 응답, 거절된 응답.', long: '응답은 보통 SFT 모델에서 샘플한다. 그래서 RM은 SFT 분포 근처에서만 정확하고, 정책이 멀리 이동하면 신뢰도가 떨어진다(과최적화의 근원).' },
          { id: 'log', sym: '\\log', label: '로그우도', desc: '확률이 작은 오답에 큰 손실.' },
          { id: 'sig', sym: '\\sigma', label: '로지스틱 링크', desc: '점수 차이를 선호확률로 바꾼다 (BT).', long: '$\\sigma(z)$의 기울기는 $z$가 크면 0이 된다. 이미 확실히 구분한 쌍은 더 이상 학습 신호를 주지 않는다. DPO의 가중치 $\\sigma(\\hat r_l - \\hat r_w)$도 같은 성질이다.' },
          { id: 'rw', sym: 'r_\\phi(x,y_w)', label: '선택 응답 점수', desc: '올라가도록 학습.' },
          { id: 'rl', sym: 'r_\\phi(x,y_l)', label: '거절 응답 점수', desc: '내려가도록 학습. 차이만 중요하다.' },
        ],
      }),
      'rm-sim': mountRM,
      'token-calc': mountTokenCalc,
      'overopt': mountOveropt,
    },
    tacit: [
      { tag: 'math', t: '왜 하필 $\\sqrt{\\mathrm{KL}}$을 거리로 쓰나',
        d: '<p>정책이 조금 움직이면 KL은 파라미터 변화에 대해 2차(피셔 정보 계량)로 늘고, 보상 같은 기댓값은 1차로 변한다. 그래서 $\\sqrt{\\mathrm{KL}}$이 "보상이 선형으로 반응하는 자연스러운 거리"가 된다. Gao et al.(2022)의 함수형이 $d=\\sqrt{\\mathrm{KL}}$에 대해 원점 근처에서 $\\alpha d$로 시작하는 이유다. 같은 이유로 TRPO의 KL 반경 $\\delta$는 "스텝 길이의 제곱"으로 읽어야 한다(T4).</p>' },
      { tag: 'math', t: '역방향 KL은 새 답을 못 만든다',
        d: '<p>$\\mathrm{KL}(\\pi\\|\\pi_{\\text{ref}})$는 $\\pi_{\\text{ref}}(y)=0$인 곳에 질량을 두면 무한대다. 닫힌 해 $\\pi^* \\propto \\pi_{\\text{ref}}e^{r/\\beta}$도 $\\pi_{\\text{ref}}$의 support를 넘지 못한다. 그래서 고수들은 "RL은 sharpening, SFT는 teaching"이라고 요약한다. 모델이 한 번도 안 내는 행동은 RL로 생기지 않는다. 실제로는 함수근사의 일반화가 support를 조금 넓히지만, 출발점(SFT·사전학습)이 상한을 정한다는 감각은 대체로 맞다.</p>' },
      { tag: 'practice', t: 'RM 정확도 70%는 낮은 게 아니다, 하지만 안전 여유도 아니다',
        d: '<p>검증 정확도는 라벨 잡음이 정한 상한을 넘지 못한다(위 시뮬레이터). 그러니 70%대 RM이 쓸모없는 것은 아니다. 다만 정확도는 "SFT 분포에서 무작위로 뽑은 쌍"에 대한 평균이고, 정책 최적화는 RM이 가장 틀리는 방향을 능동적으로 찾는다. 평균 정확도가 아니라 <strong>최적화 압력 아래의 최악 오류</strong>가 결과를 정한다. 그래서 RLHF 실무에서는 KL과 gold 평가(사람, 더 큰 RM)를 함께 추적한다.</p>' },
      { tag: 'algo', t: 'KL을 보상에 넣는 것과 손실에 넣는 것은 다른 추정량이다',
        d: '<p>InstructGPT식은 토큰별 $-\\beta\\log(\\pi/\\pi_{\\text{ref}})$를 보상에 섞어 GAE를 통과시킨다. GRPO식은 KL을 별도 손실 항으로 두고, 샘플 추정량으로 $k_3 = \\frac{\\pi_{\\text{ref}}}{\\pi} - \\log\\frac{\\pi_{\\text{ref}}}{\\pi} - 1$을 쓴다(항상 0 이상, Schulman 2020의 KL 근사 노트). 단순 로그비 $k_1$은 불편이지만 샘플마다 음수가 될 수 있어 분산이 크다. 같은 "KL 페널티"라도 기울기의 편향과 분산이 다르므로, 논문 간 $\\beta$ 값을 그대로 비교하면 안 된다.</p>' },
      { tag: 'research', t: '과최적화는 오프라인 RL의 분포 이동과 같은 병이다',
        d: '<p>RM은 고정 데이터로 학습한 가치 함수이고, 정책은 그 argmax를 찾는다. 이는 오프라인 RL에서 Q 함수의 외삽 오류를 정책이 공략하는 구조와 같다(<a href="#offline">15장</a>). 그래서 해법도 대응한다: KL(행동 정책 근처 유지 = BRAC류), RM 앙상블의 하한(LCB, T7), 새 데이터 수집(온라인화). 새 정렬 기법을 볼 때 "이 방법은 RM 외삽 오류를 무엇으로 막는가"를 물으면 분류가 쉬워진다.</p>' },
      { tag: 'practice', t: 'critic은 RM에서 초기화하고, 먼저 데워 둔다',
        d: '<p>보상이 끝에 한 번만 오는 문제에서 무작위 초기화된 critic은 초기 advantage를 거의 잡음으로 만든다. 그래서 critic을 RM 가중치로 초기화하고, 정책을 움직이기 전에 critic만 잠시 학습시키는 "value warmup"을 쓰는 구현이 많다. 이 비용과 불안정성이 critic 없는 REINFORCE 계열(RLOO, GRPO)이 LLM에서 재평가된 실질적 이유다. Ahmadian et al.(2024)은 LLM 미세조정에서는 PPO의 분산 감소 장치 상당수가 필요 이상이라고 주장했다.</p>' },
      { tag: 'math', t: 'RM 점수의 절대값에는 의미가 없다',
        d: '<p>BT는 프롬프트별 상수 이동 $f(x)$에 불변이다. 그래서 프롬프트 A의 RM 점수 2.0과 프롬프트 B의 0.5를 비교하는 것은 의미가 없고, 배치 단위로 보상을 정규화하거나 프롬프트별 baseline(critic, 그룹 평균)을 빼는 것이 필수다. KL-정규화 해에서도 $f(x)$는 분배함수 $Z(x)$에 흡수되어 최적 정책을 바꾸지 않는다. 이 불변성이 DPO에서 $Z(x)$가 사라지는 것과 같은 이유다.</p>' },
    ],
    quiz: [
      { q: '보상모델 $r_\\phi(x,y)$의 모든 출력에 프롬프트마다 다른 상수 $f(x)$를 더하면 Bradley–Terry 선호확률은?', options: ['$f(x)$만큼 커진다', '변하지 않는다', '$\\sigma(f(x))$배가 된다', '응답 길이에 따라 달라진다'], answer: 1,
        explain: '$\\sigma\\big((r_w+f)-(r_l+f)\\big) = \\sigma(r_w - r_l)$. BT는 같은 프롬프트 안의 점수 차이에만 의존하므로 RM은 프롬프트별 상수까지만 식별된다.' },
      { q: '라벨 잡음이 큰 비교 데이터로 학습한 RM의 검증 정확도가 72%에서 더 오르지 않는다. 가장 타당한 해석은?', options: ['모델 용량이 부족하다', '라벨 잡음이 정한 Bayes 정확도 상한에 가깝다', '학습률이 너무 크다', 'BT 모형이 틀렸다'], answer: 1,
        explain: '라벨 자체가 일정 비율로 뒤집혀 있으면 어떤 모델도 그 이상 맞힐 수 없다. 시뮬레이터에서 상한 선과 "참 순위 일치율"을 비교해 보라. 순위는 거의 맞히면서도 정확도는 상한에 묶인다.' },
      { q: 'InstructGPT식 LLM PPO에서 RM 점수 $r_\\phi(x,y)$는 어느 토큰의 보상에 더해지는가?', options: ['모든 토큰에 균등 분배', '첫 토큰', '마지막 토큰', '가장 확률이 낮은 토큰'], answer: 2,
        explain: '시퀀스가 끝나야 채점할 수 있으므로 마지막 토큰에만 더하고, 나머지 토큰은 KL 항 $-\\beta\\log(\\pi_\\theta/\\pi_{\\text{ref}})$만 받는다. 앞쪽 토큰으로의 신용 할당은 critic과 GAE가 맡는다.' },
      { q: 'Gao et al.(2022)의 과최적화 실험에서 대리(proxy) RM 점수와 gold 점수의 관계로 옳은 것은?', options: ['둘 다 KL에 따라 단조 증가한다', '대리 점수는 계속 오르지만 gold 점수는 어느 KL에서 정점을 찍고 내려간다', 'gold 점수가 대리 점수보다 항상 높다', 'KL이 클수록 둘의 차이가 줄어든다'], answer: 1,
        explain: '정책이 RM의 오류를 공략하면서 대리 점수와 실제 품질이 벌어진다. 정점의 위치는 RM 크기와 데이터가 클수록 뒤로 밀린다.' },
    ],
  });

  /* ---------- 보상모델 학습 시뮬레이터 ---------- */
  function mountRM(el) {
    const K = 16;
    const p = ui.panel(el, { kind: 'SIM', title: 'Bradley–Terry 보상모델 학습', caption: '왼쪽: 학습한 점수 $\\theta_i$(점)와 이상적인 값 $(u_i-\\bar u)/\\tau$(선). 오른쪽: 경사하강 스텝에 따른 정확도. 라벨 잡음 $\\tau$와 비교 쌍 개수를 바꿔 보라.' });
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
    const p = ui.panel(el, { kind: 'CALC', title: '토큰 단위 보상과 GAE ($\\gamma=1$)', caption: '12토큰짜리 응답 하나. 각 토큰의 로그비 $\\log\\frac{\\pi_\\theta}{\\pi_{\\text{ref}}}$는 "정책 이동량"에 비례해 생성된다. critic은 모든 위치에서 같은 값 $c$를 예측한다고 두었다. $\\lambda$를 0에서 1로 옮기며 끝 보상이 앞 토큰으로 퍼지는 모습을 보라. 한 샘플의 로그비는 음수일 수도 있다. 기댓값만 KL이다.' });
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
    const p = ui.panel(el, { kind: 'CALC', title: '보상모델 과최적화 (Gao et al. 2022 함수형, 계수는 예시)', caption: '가로축은 $d=\\sqrt{\\mathrm{KL}}$. 대리 점수는 예시로 $\\alpha_{\\text{RL}}\\,d$로 두었다. 계수는 논문의 적합값이 아니라 모양을 보기 위한 예시다. 정점의 위치 $d^*_{\\text{bon}} = \\alpha/(2\\beta)$, $d^*_{\\text{RL}} = e^{\\alpha/\\beta - 1}$을 슬라이더로 확인하라.' });
    const ctr = ui.row(p.body);
    const aB = ui.slider(ctr, { label: '$\\alpha_{\\text{bon}}$', min: 0.2, max: 2, step: 0.05, value: 1.0, format: ui.fmt.f(2), onInput: draw });
    const bB = ui.slider(ctr, { label: '$\\beta_{\\text{bon}}$', min: 0.02, max: 0.5, step: 0.01, value: 0.12, format: ui.fmt.f(2), onInput: draw });
    const aR = ui.slider(ctr, { label: '$\\alpha_{\\text{RL}}$', min: 0.2, max: 2, step: 0.05, value: 0.8, format: ui.fmt.f(2), onInput: draw });
    const bR = ui.slider(ctr, { label: '$\\beta_{\\text{RL}}$', min: 0.05, max: 0.8, step: 0.01, value: 0.25, format: ui.fmt.f(2), onInput: draw });
    const st = ui.stats(p.body, [
      { key: 'kb', label: 'BoN 정점 KL (nats)', tone: 'accent' },
      { key: 'nb', label: '그 KL에 해당하는 N', tone: 'accent' },
      { key: 'kr', label: 'RL 정점 KL (nats)', tone: 'signal' },
      { key: 'gr', label: 'RL 정점 gold 점수', tone: 'signal' },
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
        { name: 'gold 점수, Best-of-N', color: 'c1', data: xs.map((d) => [d, gBon(d)]), points: pts },
        { name: 'gold 점수, RL', color: 'c2', data: xs.map((d) => [d, gRL(d)]), points: dR <= 12 ? [[dR, gRL(dR), 6]] : [] },
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
