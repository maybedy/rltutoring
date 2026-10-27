/* 18 LLM을 MDP로 보기 */
(function () {
  const { ui, sim, plot } = RL;

  RL.chapter({
    id: 'llm-mdp',
    title: 'LLM을 MDP로 보기',
    subtitle: '언어 모델의 생성은 결정적 전이를 가진 MDP이고, 정렬의 목표는 KL로 묶인 보상 최대화다. 이 장의 닫힌 해 하나가 RLHF, DPO, Best-of-N을 모두 설명한다.',
    time: 40,
    level: '중급 · 핵심',
    prereq: ['mdp', 'pg', 'maxent'],
    theses: ['T5', 'T3', 'T1'],
    easy: {
      hook: '챗봇이 답을 쓰는 일은 "다음 단어 고르기"를 수십 번 반복하는 게임이고, 정렬은 "점수는 올리되 원래 말투에서 너무 멀어지지 않게" 이 게임을 하는 것이다.',
      intro: '<p>챗봇은 문장을 한 번에 쓰지 않는다. 지금까지 쓴 글을 보고 다음 단어 하나를 고르고, 다시 다음 단어를 고른다. 앞 장들의 "상황을 보고 선택하기"와 똑같은 구조다. 상황은 "질문과 지금까지 쓴 글", 선택은 "다음 단어", 점수는 답이 끝났을 때 한 번 받는다.</p><p>점수만 쫓으면 챗봇은 채점기의 허점을 노린 이상한 답으로 흘러간다. 그래서 "원래 모델이 말하던 방식에서 얼마나 멀어졌는가"(KL)를 벌점으로 함께 센다. 이 둘을 동시에 만족하는 최선의 답은 간단한 공식 하나로 나온다.</p>',
      analogy: '평소 자주 가던 식당 목록이 있다(원래 모델의 확률). 오늘 받은 평점(보상)이 좋은 곳일수록 가중치를 더 주어 고른다. 평소 자주 가던 곳은 평점이 조금만 좋아도 뽑히고, 평소 거의 안 가던 곳은 평점이 아주 높아야 뽑힌다. β는 "평소 습관을 얼마나 고집할지"를 정하는 손잡이다. 이 장의 공식이 정확히 이 계산이다.',
      path: ['다음 단어를 하나씩 직접 골라 보며 확률과 "원래 모델과의 거리"가 쌓이는 것을 본다', '"점수 올리기 + 거리 벌점"의 최선의 답을 응답 세 개짜리 예로 손으로 계산한다', 'β를 움직여 점수와 거리의 줄다리기, 그리고 채점기 허점에 빠지는 지점을 본다', '그 공식이 RLHF, DPO, Best-of-N의 공통 뿌리임을 확인한다'],
      recap: [
        '챗봇의 답 쓰기는 다음 단어 고르기를 반복하는 게임이고, 점수는 대개 답이 끝날 때 한 번 받는다.',
        '점수만 쫓으면 채점기의 허점으로 흘러가므로, 원래 모델에서 멀어진 만큼 벌점을 준다.',
        '그 결과 최선의 답은 "원래 모델의 확률 × 점수가 높을수록 커지는 배수"이고, β가 그 배수의 세기를 정한다.',
      ],
    },
    goals: [
      '토큰 단위 MDP와 시퀀스 단위 문맥 밴딧이라는 두 관점을 정의하고 각각에 맞는 알고리즘을 구분할 수 있다.',
      'KL-정규화 목적의 최적해 $\\pi^* \\propto \\pi_{\\text{ref}}\\,e^{r/\\beta}$를 깁스 변분 원리로 유도할 수 있다.',
      '토큰 단위 소프트 벨만 방정식에서 로그 확률 비율이 advantage가 됨을 설명할 수 있다.',
      'KL 추정량 k1, k2, k3의 편향과 분산, 정방향·역방향 KL의 차이를 시뮬레이터로 확인한다.',
    ],
    html: String.raw`
<p>지금까지 다룬 MDP는 로봇, 격자, 게임이었다. 언어 모델은 어떤가? 프롬프트 $x$를 받아 토큰 $y_1, y_2, \dots$를 하나씩 뽑는 과정은 그대로 순차적 의사결정이다. 이 장은 LLM 미세조정을 MDP 언어로 정확히 옮기고, 이후 19~23장에서 반복해서 쓸 핵심 도구, 즉 <strong>KL-정규화 목적과 그 닫힌 해</strong>를 유도한다.</p>

<h2>토큰 단위 MDP</h2>
<div data-w="fx-token"></div>
<div class="w wide" style="box-shadow:none"><div class="w-body">
<svg viewBox="0 0 680 170" role="img" aria-label="토큰 생성 트리">
  <g style="font-size:12.5px">
    <rect x="10" y="66" width="120" height="36" rx="7" style="fill:var(--surface-2);stroke:var(--line)"/><text x="70" y="89" text-anchor="middle" style="fill:var(--ink)">x: "2+3=?"</text>
    <g style="stroke:var(--muted);stroke-width:1.4;fill:none">
      <path d="M130 84 C 170 84, 170 34, 210 34"/><path d="M130 84 L210 84"/><path d="M130 84 C 170 84, 170 134, 210 134"/>
      <path d="M300 34 C 340 34, 340 20, 380 20"/><path d="M300 34 C 340 34, 340 52, 380 52"/>
      <path d="M470 20 L540 20"/>
    </g>
    <rect x="210" y="18" width="90" height="32" rx="6" style="fill:var(--accent-soft);stroke:var(--accent)"/><text x="255" y="39" text-anchor="middle" style="fill:var(--ink)">"답은"</text>
    <rect x="210" y="68" width="90" height="32" rx="6" style="fill:var(--surface);stroke:var(--line)"/><text x="255" y="89" text-anchor="middle" style="fill:var(--ink)">"5"</text>
    <rect x="210" y="118" width="90" height="32" rx="6" style="fill:var(--surface);stroke:var(--line)"/><text x="255" y="139" text-anchor="middle" style="fill:var(--ink)">"음"</text>
    <rect x="380" y="4" width="90" height="32" rx="6" style="fill:var(--accent-soft);stroke:var(--accent)"/><text x="425" y="25" text-anchor="middle" style="fill:var(--ink)">"5"</text>
    <rect x="380" y="40" width="90" height="28" rx="6" style="fill:var(--surface);stroke:var(--line)"/><text x="425" y="59" text-anchor="middle" style="fill:var(--ink)">"6"</text>
    <rect x="540" y="4" width="70" height="32" rx="6" style="fill:var(--accent-soft);stroke:var(--accent)"/><text x="575" y="25" text-anchor="middle" style="fill:var(--ink)">EOS</text>
    <text x="620" y="25" style="fill:var(--good)">r = +1</text>
    <text x="340" y="118" style="fill:var(--muted);font-size:11.5px">상태 = 프롬프트 + 지금까지의 토큰 (전이는 이어 붙이기, 결정적)</text>
    <text x="340" y="136" style="fill:var(--muted);font-size:11.5px">행동 = 어휘 V에서 다음 토큰 하나 (|V| ≈ 수만~수십만)</text>
    <text x="340" y="154" style="fill:var(--muted);font-size:11.5px">보상 = 대개 EOS에서 한 번 (보상모델, 검증기, 사람 선호)</text>
  </g>
</svg></div></div>
<p>직접 해 보면 금방 감이 온다. 아래에서 다음 단어를 하나씩 골라 답을 완성해 보자.</p>
<div data-w="try-tokens"></div>
<p>이 MDP는 로봇 제어와 성질이 매우 다르다.</p>
<ul>
  <li><strong>전이가 결정적이고 완벽히 알려져 있다.</strong> 환경 모델을 배울 필요가 없고, 어떤 접두사로든 되돌아가 다시 생성할 수 있다. 트리 탐색과 중간 상태의 몬테카를로 추정이 싸다(<a href="#modelbased">16장</a>, <a href="#test-time">22장</a>).</li>
  <li><strong>행동 공간이 거대하지만 정책이 이미 좋다.</strong> 사전학습된 모델 $\pi_{\text{ref}}$는 무작위 정책이 아니라 강력한 사전분포다. RL은 처음부터 배우는 것이 아니라 이 분포를 <em>조금</em> 옮기는 일이다.</li>
  <li><strong>보상은 희소하고 지연된다.</strong> 수백 토큰 뒤에 숫자 하나가 온다. 어느 토큰이 공을 세웠는지(신용 할당)가 핵심 난제다.</li>
  <li><strong>$\gamma = 1$, 짧은 에피소드.</strong> 할인이 필요 없을 만큼 지평이 유한하다. 대신 길이가 응답마다 달라 길이 편향 문제가 생긴다(<a href="#reasoning">21장</a>).</li>
</ul>

<h2>두 관점: 시퀀스 밴딧 대 토큰 MDP</h2>
<p>보상이 끝에 한 번만 온다면 응답 전체 $y$를 하나의 행동으로 볼 수도 있다. 그러면 문제는 <strong>문맥 밴딧</strong>이다: 문맥 $x$, 행동 $y \sim \pi(\cdot|x)$, 보상 $r(x,y)$. 정책 경사(T3)는 두 관점에서 같은 값이지만 분산을 줄이는 도구가 다르다.</p>
$$\nabla_\theta J = \mathbb{E}_{x,\,y\sim\pi_\theta}\Big[r(x,y)\,\nabla_\theta\log\pi_\theta(y|x)\Big] = \mathbb{E}\Big[r(x,y)\sum_{t}\nabla_\theta\log\pi_\theta(y_t \mid x, y_{\lt t})\Big]$$
<div class="table-wrap"><table class="t">
<thead><tr><th>관점</th><th>행동 단위</th><th>베이스라인 / 가치</th><th>대표 알고리즘</th><th>장단점</th></tr></thead>
<tbody>
<tr><td>시퀀스 단위 문맥 밴딧</td><td>응답 전체 $y$</td><td>같은 프롬프트의 다른 응답들의 평균 보상</td><td>REINFORCE, RLOO, ReMax, GRPO</td><td>critic이 필요 없음. 모든 토큰이 같은 advantage를 받음</td></tr>
<tr><td>토큰 단위 MDP</td><td>토큰 $y_t$</td><td>학습된 가치 함수 $V(x, y_{\lt t})$</td><td>PPO(RLHF), VinePPO, 토큰 수준 DPO 해석</td><td>토큰별 신용 할당 가능. critic 학습이 어렵고 비쌈</td></tr>
</tbody></table></div>
<p>희소 보상 + 결정적 전이에서 토큰 단위 가치 $V(x, y_{\lt t})$는 "이 접두사로 시작하면 결국 보상을 받을 확률"이다. 즉 <strong>접두사 분류기</strong>다. 이것이 프로세스 보상모델(PRM, 21~22장)과 같은 대상이라는 점을 기억해 두자.</p>

<h2>KL-정규화 목적과 그 닫힌 해</h2>
<p>보상만 최대화하면 정책은 보상모델의 허점을 찾아 사전학습 분포에서 멀리 벗어난다(<a href="#rlhf">19장</a>). 그래서 거의 모든 LLM RL은 기준 모델 $\pi_{\text{ref}}$(보통 SFT 모델)와의 KL을 벌점으로 둔다.</p>
$$\max_\pi\; J_\beta(\pi) = \mathbb{E}_{y\sim\pi(\cdot|x)}\big[r(x,y)\big] - \beta\,\mathrm{KL}\big(\pi(\cdot|x)\,\|\,\pi_{\text{ref}}(\cdot|x)\big)$$
<div data-w="dv-gibbs"></div>
<div class="thesis-box"><span class="label">대전제 T5 · KL-정규화의 닫힌 해</span>
<p>$\pi^*(y|x) = \frac{1}{Z(x)}\pi_{\text{ref}}(y|x)\,e^{r(x,y)/\beta}$. 최적 정책은 기준 모델을 보상의 지수로 <strong>재가중</strong>한 것이다. 기준 모델이 확률 0을 준 응답은 아무리 보상이 커도 0으로 남는다. 최적 목적값은 $\beta\log Z(x)$, 즉 소프트 최댓값이다.</p>
<p>이 한 식에서 세 갈래가 나온다. (1) <strong>RLHF/PPO</strong>는 이 $\pi^*$를 정책 경사로 근사한다(19장). (2) 식을 뒤집으면 $r = \beta\log\frac{\pi^*}{\pi_{\text{ref}}} + \beta\log Z$이므로 보상을 정책으로 표현할 수 있고, 이것이 <strong>DPO</strong>다(20장). (3) $\pi_{\text{ref}}$에서 여러 개 뽑아 보상으로 고르는 <strong>Best-of-N</strong>은 이 재가중을 샘플링으로 근사한다(22장). SAC의 볼츠만 정책(14장)도 같은 식이다.</p>
</div>
<div data-w="step-pistar"></div>
<p>아래 계산기는 한 프롬프트에 대한 응답 후보 6개로 이 식을 그대로 계산한다. 보상모델 점수 $r$은 "형식만 맞춘" 응답에 가장 높은 점수를 주도록 일부러 잘못 설정되어 있다. 각 응답의 실제 품질(사람이 본다면)은 따로 있다.</p>
<div data-w="kl-frontier"></div>
<ul>
  <li><strong>$\beta$가 크면</strong> $\pi^* \approx \pi_{\text{ref}}$이다. KL은 0에 가깝고 보상은 기준 모델 수준이다.</li>
  <li><strong>$\beta$를 줄이면</strong> 보상이 높은 응답으로 확률이 옮겨 가며 기대 보상과 KL이 함께 커진다. 보상-KL 곡선은 이 목적의 <em>파레토 경계</em>다. 어떤 정책도 같은 KL에서 이 곡선보다 높은 기대 보상을 얻을 수 없다.</li>
  <li><strong>실제 품질 곡선</strong>은 중간에서 꺾인다. KL 예산을 더 쓰면 보상모델의 허점(형식만 맞춘 응답)에 확률이 몰리기 때문이다. 이것이 보상 과최적화의 가장 단순한 모형이며, KL 벌점이 "정답"이 아니라 <em>조기 종료 장치</em>라는 뜻이기도 하다.</li>
</ul>

<h2>토큰 단위로 펼치면: 소프트 벨만 방정식</h2>
<p>시퀀스 KL은 토큰별 로그 비율의 합으로 정확히 분해된다.</p>
$$\log\frac{\pi(y|x)}{\pi_{\text{ref}}(y|x)} = \sum_{t=1}^{T}\log\frac{\pi(y_t|s_t)}{\pi_{\text{ref}}(y_t|s_t)},\qquad s_t = (x, y_{\lt t})$$
<p>그래서 KL-정규화 목적은 <strong>토큰별 보상</strong> $r_t = -\beta\log\frac{\pi(y_t|s_t)}{\pi_{\text{ref}}(y_t|s_t)} + r(x,y)\,\mathbb{1}[t = T]$를 가진 MDP의 리턴과 같다. InstructGPT식 PPO 구현이 정확히 이렇게 보상을 만든다. 이 MDP의 최적 정책은 엔트로피 정규화 RL(<a href="#maxent">14장</a>)의 소프트 벨만 방정식을 만족한다.</p>
<div data-w="fx-soft"></div>
<p>결정적 전이 덕분에 $Q^*(s_t, a) = r(s_t,a) + V^*(s_t \oplus a)$로 기댓값이 사라진다. 위 식을 정리하면 $\beta\log\frac{\pi^*(a|s_t)}{\pi_{\text{ref}}(a|s_t)} = Q^*(s_t,a) - V^*(s_t)$, 즉 <strong>로그 확률 비율이 곧 advantage</strong>다. 또 $\pi_{\text{ref}}$가 거의 균일한 곳에서는 로짓이 $Q^*/\beta$와 상태별 상수만큼만 다르다. "언어 모델의 로짓은 소프트 Q 함수다"(Rafailov et al. 2024, "From r to Q*")라는 관찰이 여기서 나온다(<a href="#qviews">08장</a>의 Q-learning 관점들과 연결).</p>

<h2>KL은 어떻게 추정하나: k1, k2, k3</h2>
<p>어휘 전체에 대한 정확한 KL은 토큰마다 계산할 수 있지만, 실무에서는 샘플된 토큰 하나로 추정하는 경우가 많다. 샘플 $y \sim q = \pi_\theta$, 비율 $\rho = p(y)/q(y)$, $p = \pi_{\text{ref}}$로 두면 $\mathrm{KL}(q\|p)$의 세 추정량(Schulman 2020, "Approximating KL Divergence")은 다음과 같다.</p>
$$k_1 = -\log\rho,\qquad k_2 = \tfrac12(\log\rho)^2,\qquad k_3 = (\rho - 1) - \log\rho$$
<p>$k_1$은 불편이지만 음수가 될 수 있고 분산이 크다. $k_2$는 항상 양수이고 분산이 작지만 편향이 있다(작은 발산에서는 2차까지 일치). $k_3$는 $\mathbb{E}_q[\rho - 1] = 0$인 제어 변량을 더한 것이라 불편이면서 항상 양수이고 분산이 작다. GRPO가 손실에 쓰는 KL 항이 $k_3$다. 아래에서 $q = \mathcal{N}(0,1)$, $p = \mathcal{N}(\mu, 1)$(참 KL $= \mu^2/2$)로 직접 샘플링해 비교한다.</p>
<div data-w="kl-est"></div>
<div class="warn"><span class="label">주의: 값의 추정과 기울기의 추정은 다르다</span>
<p>$k_3$가 KL <em>값</em>의 좋은 추정량이라고 해서, $k_3$를 손실에 넣고 미분한 것이 역방향 KL의 좋은 <em>기울기</em> 추정량인 것은 아니다. 샘플링 분포 $q_\theta$를 통해 미분하지 않고 $k_3$만 미분하면 $\nabla_\theta k_3 = (1-\rho)\nabla_\theta\log q_\theta$이고, 그 기댓값은 $-\sum_y p(y)\nabla_\theta\log q_\theta(y) = \nabla_\theta\mathrm{KL}(p\|q_\theta)$, 즉 <strong>정방향</strong> KL의 기울기가 된다. $k_1$을 같은 방식으로 미분하면 기댓값이 0이다. KL을 보상에 넣는가(PPO-RLHF: 리턴의 일부가 되어 정책 경사로 미분), 손실에 넣는가(GRPO)는 서로 다른 기울기를 만든다는 점이 최근 여러 분석에서 지적되었다.</p>
</div>

<h2>정방향 KL 대 역방향 KL</h2>
<p>같은 "KL"이라도 방향에 따라 성격이 정반대다. SFT와 증류는 $\mathrm{KL}(p_{\text{data}}\,\|\,\pi)$를 줄이고(최대우도), RL의 KL 벌점과 변분 추론은 $\mathrm{KL}(\pi\,\|\,p)$를 줄인다.</p>
<div data-w="fwd-rev"></div>
<div class="grid2">
  <div class="card"><h4>정방향 $\mathrm{KL}(p\|q)$: 모드 덮기</h4><p>$p$가 확률을 주는 모든 곳에 $q$도 확률을 줘야 한다. 단봉 $q$는 두 봉우리 사이에 걸쳐 넓게 퍼진다. SFT 모델이 다양하지만 때로 어중간한 응답을 하는 이유.</p></div>
  <div class="card"><h4>역방향 $\mathrm{KL}(q\|p)$: 모드 찾기</h4><p>$q$가 확률을 주는 곳에서 $p$가 작으면 큰 벌을 받는다. 단봉 $q$는 한 봉우리를 골라 그 안에 숨는다. RL로 미세조정한 모델의 다양성이 줄고 pass@k가 좁아지는 경향의 수학적 배경.</p></div>
</div>

<h2>보상 신호는 어디서 오나</h2>
<div class="table-wrap"><table class="t">
<thead><tr><th>신호</th><th>단위</th><th>얻는 방법</th><th>주 위험</th><th>장</th></tr></thead>
<tbody>
<tr><td>사람 선호 보상모델</td><td>응답</td><td>쌍 비교 + Bradley-Terry</td><td>과최적화, 라벨 잡음</td><td><a href="#rlhf">19</a></td></tr>
<tr><td>AI 피드백 (RLAIF, 헌법)</td><td>응답</td><td>LLM 심판의 비교</td><td>심판의 편향 상속</td><td><a href="#rlhf">19</a></td></tr>
<tr><td>암묵적 보상 (DPO)</td><td>응답 (토큰 분해 가능)</td><td>$\beta\log\pi/\pi_{\text{ref}}$</td><td>오프라인 분포 불일치</td><td><a href="#dpo">20</a></td></tr>
<tr><td>검증 가능한 보상 (RLVR)</td><td>응답</td><td>정답 비교, 단위 테스트</td><td>희소함, 형식 해킹</td><td><a href="#reasoning">21</a></td></tr>
<tr><td>프로세스 보상모델 (PRM)</td><td>추론 단계</td><td>단계 라벨 또는 MC 롤아웃</td><td>라벨 비용, 단계 정의</td><td><a href="#reasoning">21</a>, <a href="#test-time">22</a></td></tr>
<tr><td>KL 벌점</td><td>토큰</td><td>$-\beta\log\pi/\pi_{\text{ref}}$</td><td>추정량·방향 선택</td><td>이 장</td></tr>
</tbody></table></div>
`,
    mount: {
      'fx-token': (el) => ui.formula(el, {
        title: 'LLM 생성을 MDP로',
        say: '{s|질문과 지금까지 쓴 글}을 보고 {pi|언어 모델}이 {a|다음 단어 하나}를 고르면, {P|그 단어가 글 끝에 붙어} 새 상황이 된다. {r|점수는 답이 끝나는 순간에 한 번} 받고, {g|먼 미래의 점수라고 깎지 않는다}.',
        tex: String.raw`\tm{s}{s_t = (x,\, y_{<t})},\quad \tm{a}{a_t = y_t \in \mathcal{V}},\quad \tm{P}{s_{t+1} = s_t \oplus a_t},\quad \tm{r}{r_t = r(x,y)\,\mathbb{1}[\,a_t = \texttt{EOS}\,]},\quad \tm{g}{\gamma = 1},\quad \tm{pi}{\pi_\theta(a_t\mid s_t)}`,
        terms: [
          { id: 's', sym: 's_t', label: '상태', desc: '프롬프트와 지금까지 생성한 토큰 전체.', long: '전체 기록을 상태로 두므로 마르코프 성질이 자명하게 성립한다(01장 암묵지: 상태는 설계 대상). 대신 상태 공간이 지수적으로 커서 표 방법은 불가능하고, 신경망의 일반화에 전적으로 의존한다.' },
          { id: 'a', sym: 'a_t', label: '행동', desc: '어휘에서 다음 토큰 하나.', long: '수만~수십만 개의 이산 행동. 대부분은 확률이 거의 0이라 실제 유효 분기는 작다(top-p로 보면 몇 개~수십 개). 그래서 탐험은 "기준 모델이 이미 그럴듯하다고 보는 곳" 안에서만 일어난다.' },
          { id: 'P', sym: 's_{t+1} = s_t\\oplus a_t', label: '전이', desc: '토큰을 이어 붙인다. 결정적이고 알려져 있다.', long: '도구 호출, 코드 실행, 웹 검색이 끼어들면 그 결과 토큰은 외부 환경이 만들므로 확률적 전이가 생긴다. 에이전트 RL은 이 부분 때문에 다시 "진짜" MDP가 된다.' },
          { id: 'r', sym: 'r_t', label: '보상', desc: '대개 응답 끝(EOS)에서 한 번.', long: '보상모델, 검증기, 사람 평가가 응답 전체를 보고 점수를 준다. 중간 토큰의 보상은 0(또는 KL 벌점뿐)이다. 단계별 보상(PRM)을 주는 변형은 21~22장.' },
          { id: 'g', sym: '\\gamma = 1', label: '할인 없음', desc: '유한 지평이라 할인이 필요 없다.', long: '할인이 없으면 토큰 수가 많은 응답의 KL 합이 커지고, 보상이 길이와 상관되면 길이 편향이 생긴다. 일부 구현은 길이 정규화를 하는데, 그 선택이 또 다른 편향을 만든다(21장 Dr. GRPO).' },
          { id: 'pi', sym: '\\pi_\\theta', label: '정책 = 언어 모델', desc: 'softmax(로짓)으로 다음 토큰 분포를 준다.', long: 'softmax 정책은 볼츠만 정책이다. 아래 소프트 벨만 절에서 보듯 최적 KL-정규화 정책의 로짓은 소프트 Q값과 상태별 상수만큼만 다르다.' },
        ],
      }),
      'dv-gibbs': (el) => ui.derivation(el, {
        title: '깁스 변분 원리로 $\\pi^*$ 유도하기',
        easy: '"점수의 평균 − β × 원래 모델과의 거리"를 정리하면 "상수 − β × (어떤 특별한 분포와의 거리)"가 된다. 거리가 0일 때가 최선이므로 그 특별한 분포가 답이다. 원래 확률에 $e^{\\text{보상}/\\beta}$를 곱하고, 합이 1이 되게 나눈 분포다.',
        caption: '프롬프트 $x$ 하나를 고정하고 응답 분포 $\\pi(y)$에 대해 최대화한다. 표기를 줄이려고 $x$를 생략한다.',
        steps: [
          { tex: String.raw`J_\beta(\pi) = \sum_y \pi(y)\,r(y) - \beta\sum_y \pi(y)\log\frac{\pi(y)}{\pi_{\text{ref}}(y)}`, why: '목적을 합으로 쓴다.' },
          { tex: String.raw`= -\beta\sum_y \pi(y)\Big[\log\frac{\pi(y)}{\pi_{\text{ref}}(y)} - \hl{\frac{r(y)}{\beta}}\Big] = -\beta\sum_y \pi(y)\log\frac{\pi(y)}{\pi_{\text{ref}}(y)\,\hl{e^{r(y)/\beta}}}`, why: '$-\\beta$로 묶고 보상을 로그 안으로 넣는다.' },
          { tex: String.raw`Z = \sum_y \pi_{\text{ref}}(y)\,e^{r(y)/\beta},\qquad \pi^*(y) = \frac{\pi_{\text{ref}}(y)\,e^{r(y)/\beta}}{Z}`, why: '분모를 확률분포로 만드는 정규화 상수 $Z$(분배 함수)를 정의한다.' },
          { tex: String.raw`J_\beta(\pi) = -\beta\sum_y \pi(y)\log\frac{\pi(y)}{Z\,\pi^*(y)} = \hl{\beta\log Z} - \beta\,\hl{\mathrm{KL}(\pi\,\|\,\pi^*)}`, why: '$\\pi_{\\text{ref}}e^{r/\\beta} = Z\\pi^*$를 대입하면 상수와 KL로 갈라진다.' },
          { tex: String.raw`\mathrm{KL}(\pi\|\pi^*) \ge 0 \;\Rightarrow\; \max_\pi J_\beta = \beta\log Z \ \text{ at }\ \pi = \pi^*`, why: 'KL은 0 이상이고 $\\pi = \\pi^*$에서만 0이다. 따라서 $\\pi^*$가 유일한 최적해이고 최적값은 소프트 최댓값 $\\beta\\log Z$.' },
          { tex: String.raw`r(y) = \beta\log\frac{\pi^*(y)}{\pi_{\text{ref}}(y)} + \beta\log Z`, why: '식을 뒤집으면 보상이 최적 정책과 기준 정책의 로그 비율로 표현된다. 상수 $\\beta\\log Z$는 같은 프롬프트의 응답끼리 비교하면 사라진다. 이것이 DPO의 출발점이다(20장).' },
        ],
      }),
      'fx-soft': (el) => ui.formula(el, {
        title: '토큰 단위 소프트 벨만 방정식',
        say: '{pi|가장 좋은 다음 단어 확률}은 {ref|원래 모델의 확률}에 배수를 곱한 것이다. 배수는 {Q|그 단어를 골랐을 때 기대되는 점수}가 {V|지금 상황의 평균적인 기대 점수}보다 얼마나 높은지를 {b|온도}로 나눈 값의 지수다.',
        tex: String.raw`\tm{pi}{\pi^*(a\mid s_t)} = \tm{ref}{\pi_{\text{ref}}(a\mid s_t)}\,\exp\!\Big(\frac{\tm{Q}{Q^*(s_t,a)} - \tm{V}{V^*(s_t)}}{\tm{b}{\beta}}\Big),\qquad \tm{V}{V^*(s_t)} = \beta\log\sum_{a}\pi_{\text{ref}}(a\mid s_t)\,e^{Q^*(s_t,a)/\beta}`,
        terms: [
          { id: 'pi', sym: '\\pi^*(a|s_t)', label: '최적 토큰 정책', desc: '다음 토큰의 KL-정규화 최적 분포.' },
          { id: 'ref', sym: '\\pi_{\\text{ref}}', label: '기준 모델', desc: '사전분포 역할. 여기서 0이면 최적 정책도 0.' },
          { id: 'Q', sym: 'Q^*(s_t,a)', label: '소프트 Q', desc: '토큰 a를 고른 뒤 최적으로 이어 갈 때의 소프트 가치.', long: '결정적 전이이므로 $Q^*(s_t,a) = r(s_t,a) + V^*(s_t\\oplus a)$. 중간 토큰의 $r$은 0이고 마지막 EOS에서만 응답 보상이 붙는다. 기댓값이 없어 벨만 백업이 단순하다.' },
          { id: 'V', sym: 'V^*(s_t)', label: '소프트 가치 = log-sum-exp', desc: 'max 대신 기준 분포로 가중한 부드러운 최댓값.', long: '$\\beta \\to 0$이면 $\\max_a Q$(02장의 벨만 최적 방정식), $\\beta$가 크면 $\\mathbb{E}_{\\pi_{\\text{ref}}}[Q]$(정책 평가)에 가깝다. log-sum-exp는 1-립시츠이므로 이 연산자도 축약이다(T1). 뿌리 상태에서 $V^*(x) = \\beta\\log Z(x)$로 위 유도의 최적값과 일치한다.' },
          { id: 'b', sym: '\\beta', label: '온도 = KL 계수', desc: '보상 대비 기준 모델 유지의 상대적 무게.' },
        ],
      }),
      'kl-frontier': mountFrontier,
      'try-tokens': mountTokens,
      'step-pistar': (el) => ui.walkthrough(el, {
        title: '최선의 정책을 응답 세 개로 손으로 계산하기',
        caption: '응답 세 개의 원래 확률이 0.5, 0.3, 0.2이고 보상이 0, 1, 2점이다. β = 1로 두고 공식 "원래 확률 × $e^{\\text{보상}/\\beta}$를 합이 1이 되게 나누기"를 따라가 보자. $e \\approx 2.718$, $e^2 \\approx 7.389$를 쓰면 된다.',
        steps: [
          { say: '응답 1은 보상이 0이라 배수가 $e^0 = 1$이다. 가중치는 원래 확률 그대로다.', calc: String.raw`0.5 \times e^{0} = 0.5` },
          { say: '응답 2의 가중치 $0.3 \\times e^{1}$은?', ask: { answer: 0.8155, rtol: 0.01 }, calc: String.raw`0.3 \times 2.718 \approx 0.815` },
          { say: '응답 3의 가중치 $0.2 \\times e^{2}$는?', ask: { answer: 1.4778, rtol: 0.01 }, calc: String.raw`0.2 \times 7.389 \approx 1.478` },
          { say: '세 가중치의 합 $Z$는?', ask: { answer: 2.7933, rtol: 0.01 }, calc: String.raw`Z = 0.5 + 0.815 + 1.478 \approx 2.793` },
          { say: '응답 3의 최선 확률은 가중치를 $Z$로 나눈 값이다. 얼마일까?', ask: { answer: 0.529, rtol: 0.02 }, calc: String.raw`\pi^*(3) = \frac{1.478}{2.793} \approx 0.53`, note: '나머지는 $0.5/2.793 \\approx 0.18$, $0.815/2.793 \\approx 0.29$다. 보상이 가장 높은 응답이 0.2에서 0.53으로 늘었지만 다른 응답도 사라지지 않았다. β를 0.5로 줄이면 배수가 $e^{0}, e^{2}, e^{4}$로 커져 응답 3의 확률이 약 0.80까지 올라간다. β가 작을수록 점수를, 클수록 원래 습관을 따른다.' },
        ],
      }),
      'kl-est': mountKLEst,
      'fwd-rev': mountFwdRev,
    },
    tacit: [
      { tag: 'algo', t: 'LLM 환경은 "완벽한 시뮬레이터"이고, 그것이 알고리즘 선택을 바꾼다',
        d: '<p>로봇 RL의 많은 기법(모델 학습, 리플레이, off-policy 보정)은 상호작용이 비싸다는 전제에서 나왔다. LLM에서는 어떤 접두사로든 되돌아가(reset) 다시 생성할 수 있고 전이는 정확하다. 그래서 중간 상태에서 여러 번 롤아웃해 가치를 몬테카를로로 추정하는 방법(VinePPO: Kazemnejad et al. 2024)이나, 학습된 critic 대신 같은 프롬프트의 여러 응답으로 베이스라인을 만드는 방법(RLOO, GRPO)이 경쟁력을 가진다. 문제의 비용 구조가 바뀌면 최적의 알고리즘도 바뀐다.</p>' },
      { tag: 'math', t: '최적 정책과 보상은 서로를 결정한다 (상수 차이까지)',
        d: '<p>$r = \\beta\\log\\frac{\\pi^*}{\\pi_{\\text{ref}}} + \\beta\\log Z(x)$이므로 <strong>어떤 정책이든 어떤 보상에 대해서는 최적</strong>이다. 그 보상은 $\\beta\\log\\pi/\\pi_{\\text{ref}}$이다. 이것은 동어반복이지만 중요한 귀결이 있다: (1) 보상은 프롬프트별 상수 $\\beta\\log Z(x)$만큼 식별 불가능하고, 그래서 선호 데이터(같은 $x$의 응답끼리 비교)로는 그 상수를 배울 필요가 없다. (2) "정책을 학습하는 것"과 "암묵적 보상모델을 학습하는 것"은 같은 일이다. DPO가 보상모델 없이 작동하는 이유.</p>' },
      { tag: 'math', t: 'KL 계수 β는 라그랑주 승수다',
        d: '<p>$\\max \\mathbb{E}[r] - \\beta\\mathrm{KL}$은 제약 문제 $\\max \\mathbb{E}[r]$ s.t. $\\mathrm{KL} \\le \\epsilon$의 라그랑지안이다. 위 계산기의 보상-KL 곡선에서 $\\beta$는 그 점에서의 곡선 기울기 $d\\mathbb{E}[r]/d\\mathrm{KL}$와 같다. 그래서 고정 $\\beta$ 대신 목표 KL을 정해 두고 $\\beta$를 자동 조절하는 적응형 KL 제어(Ziegler et al. 2019)는 "기울기 대신 예산을 정하는 것"이다. 실무에서 KL 예산이 $\\beta$보다 해석하기 쉽고 모델 간 이전도 잘 된다.</p>' },
      { tag: 'research', t: '역방향 KL은 다양성을 줄인다: pass@1과 pass@k의 분리',
        d: '<p>보상 최대화 + 역방향 KL은 모드를 찾는다. 결과적으로 RL 미세조정 모델은 한 번에 맞힐 확률(pass@1)은 오르지만 여러 번 샘플할 때의 정답 커버리지(큰 k의 pass@k)는 기준 모델보다 넓어지지 않거나 오히려 좁아질 수 있다는 실증 보고가 있다(예: Yue et al. 2025). "RL이 새 능력을 만드는가, 이미 있는 능력을 날카롭게 하는가"라는 논쟁의 수학적 배경이 이 재가중 구조다. $\\pi^* \\propto \\pi_{\\text{ref}}e^{r/\\beta}$는 기준 모델이 0을 준 응답을 결코 만들지 않는다.</p>' },
      { tag: 'practice', t: '길이와 KL의 숨은 결합',
        d: '<p>시퀀스 KL은 토큰 로그 비율의 <em>합</em>이다. 응답이 길수록 같은 토큰당 이탈에도 KL이 커지고, 반대로 토큰당 평균으로 정규화하면 긴 응답의 벌점이 상대적으로 약해진다. 보상이 길이와 상관되어 있으면(긴 답을 선호하는 보상모델) 두 선택 모두 길이 편향을 만들 수 있다. 응답 길이 분포를 학습 곡선과 함께 항상 모니터링하는 것이 실무의 기본이다.</p>' },
      { tag: 'math', t: '토큰 단위 가치 함수 = 접두사 성공 확률',
        d: '<p>보상이 0/1(정답 여부)이고 $\\beta \\to 0$에 가까우면 $V(x, y_{\\lt t})$는 "이 접두사에서 출발해 정답에 도달할 확률"이다. 이것은 학습된 critic, 프로세스 보상모델(PRM), MC 롤아웃 추정이 모두 같은 양을 겨냥한다는 뜻이다. 서로 다른 이름의 방법을 비교할 때 "무엇을 추정하는가"를 이 양으로 통일해 보면 차이가 "어떻게 추정하는가(학습 vs 샘플링)"뿐인 경우가 많다.</p>' },
    ],
    quiz: [
      { q: 'KL-정규화 목적 $\\mathbb{E}_\\pi[r] - \\beta\\mathrm{KL}(\\pi\\|\\pi_{\\text{ref}})$의 최적해는?', options: ['$\\pi^* = \\arg\\max_y r(y)$에 확률 1', '$\\pi^*(y) \\propto \\pi_{\\text{ref}}(y)\\,e^{r(y)/\\beta}$', '$\\pi^*(y) \\propto e^{r(y)}$', '$\\pi^* = \\pi_{\\text{ref}}$'], answer: 1,
        explain: '깁스 변분 원리. $J = \\beta\\log Z - \\beta\\mathrm{KL}(\\pi\\|\\pi^*)$로 쓰면 $\\pi=\\pi^*$에서 최대. 첫 번째 보기는 $\\beta\\to0$의 극한, 네 번째는 $\\beta\\to\\infty$의 극한이다.' },
      { q: '토큰 단위 MDP에서 최적 정책의 $\\beta\\log\\frac{\\pi^*(a|s_t)}{\\pi_{\\text{ref}}(a|s_t)}$는 무엇과 같은가?', options: ['즉시 보상', '소프트 advantage $Q^*(s_t,a) - V^*(s_t)$', '엔트로피', '시퀀스 전체의 KL'], answer: 1,
        explain: '소프트 벨만 방정식 $\\pi^* = \\pi_{\\text{ref}}\\exp((Q^*-V^*)/\\beta)$의 로그를 취하면 바로 나온다.' },
      { q: '$q=\\pi_\\theta$에서 샘플하고 $\\rho = \\pi_{\\text{ref}}/\\pi_\\theta$일 때, 불편이면서 항상 0 이상인 KL 추정량은?', options: ['$k_1 = -\\log\\rho$', '$k_2 = \\frac12(\\log\\rho)^2$', '$k_3 = \\rho - 1 - \\log\\rho$', '셋 다 해당'], answer: 2,
        explain: '$k_1$은 불편이지만 음수가 될 수 있고, $k_2$는 양수지만 편향이 있다. $k_3$는 평균 0인 $\\rho-1$을 더한 제어 변량 형태로 두 성질을 모두 가진다($x-1-\\log x \\ge 0$).' },
      { q: '두 봉우리를 가진 분포 $p$에 단봉 가우시안 $q$를 맞출 때, 역방향 $\\mathrm{KL}(q\\|p)$ 최소화의 결과는?', options: ['두 봉우리 사이를 넓게 덮는다', '한 봉우리에 집중한다', '$p$와 정확히 같아진다', '분산이 무한대가 된다'], answer: 1,
        explain: '역방향 KL은 $q$가 확률을 주는 곳에서 $p$가 작으면 크게 벌하므로 모드를 찾는다. 정방향 KL(최대우도)은 모드를 덮는다.' },
    ],
  });

  /* ---------- TRY: 토큰을 하나씩 골라 답 만들기 ---------- */
  const END = '(끝)';
  const TOK_TREE = {
    '': [['5', 0.45], ['음,', 0.25], ['정답은', 0.30]],
    '5': [['입니다.', 0.5], [END, 0.5]],
    '5 입니다.': [[END, 1]],
    '음,': [['6', 0.4], ['5', 0.4], ['모르겠어요.', 0.2]],
    '음, 6': [[END, 1]], '음, 5': [[END, 1]], '음, 모르겠어요.': [[END, 1]],
    '정답은': [['5', 0.6], ['6', 0.25], ['아마도', 0.15]],
    '정답은 5': [[END, 1]], '정답은 6': [[END, 1]],
    '정답은 아마도': [['5', 0.5], ['6', 0.5]],
    '정답은 아마도 5': [[END, 1]], '정답은 아마도 6': [[END, 1]],
  };
  // 보상모델 점수 (예시): 정답이면 +, 오답이면 −, 얼버무리면 낮게
  const TOK_REWARD = { '5': 1.0, '5 입니다.': 1.2, '음, 6': -1, '음, 5': 0.8, '음, 모르겠어요.': -0.5, '정답은 5': 1.1, '정답은 6': -1, '정답은 아마도 5': 0.6, '정답은 아마도 6': -1 };

  function mountTokens(el) {
    const p = ui.panel(el, { kind: 'TRY', title: '다음 단어를 하나씩 골라 답 만들기', caption: '질문은 "2+3은?"이다. 아래 단어 버튼 중 하나를 눌러 답을 한 단어씩 이어 가고, "(끝)"을 고르면 답이 완성되어 점수가 나온다. 버튼마다 원래 모델과 정렬된 모델이 그 단어를 고를 확률이 적혀 있다. β 슬라이더를 바꿔 정렬된 모델의 확률이 어떻게 움직이는지도 보라.' });
    // 완성된 답(잎)을 모두 나열: 원래 확률 = 단어 확률의 곱
    const leaves = [];
    (function walk(prefix, prob) {
      TOK_TREE[prefix].forEach(([t, pr]) => {
        if (t === END) leaves.push({ text: prefix, ref: prob * pr, r: TOK_REWARD[prefix] });
        else walk(prefix ? prefix + ' ' + t : t, prob * pr);
      });
    })('', 1);
    const ctr = ui.row(p.body);
    const bS = ui.slider(ctr, { label: '$\\log_{10}\\beta$', min: -1, max: 1, step: 0.05, value: 0, format: (v) => v.toFixed(2) + '  (β=' + Math.pow(10, v).toPrecision(2) + ')', onInput: () => { solve(); draw(); } });
    const say = document.createElement('div');
    say.className = 'fx-detail';
    say.style.fontSize = 'var(--fs-md)';
    p.body.appendChild(say);
    const opts = ui.row(p.body, 'btns');
    const ctl = ui.row(p.body, 'btns');
    ui.button(ctl, '처음부터', () => { path = []; draw(); });
    ui.button(ctl, '정렬된 모델이 대신 끝까지 고르기', () => { auto('pol'); });
    ui.button(ctl, '원래 모델이 대신 끝까지 고르기', () => { auto('ref'); });
    const st = ui.stats(p.body, [
      { key: 'pref', label: '이 답의 확률: 원래 모델' },
      { key: 'ppol', label: '이 답의 확률: 정렬된 모델', tone: 'accent' },
      { key: 'lr', label: '누적 log(정렬 / 원래)', tone: 'signal' },
      { key: 'rew', label: '보상모델 점수' },
      { key: 'chk', label: '확인: 보상/β − log Z' },
    ]);
    const st2 = ui.stats(p.body, [
      { key: 'kl', label: '전체 KL(정렬 ‖ 원래)' },
      { key: 'er', label: '평균 점수: 원래 → 정렬' },
    ]);
    const log = document.createElement('div');
    log.className = 'log';
    p.body.appendChild(log);
    const r = sim.rng(21);
    let path = [], pstar = [], logZ = 0, beta = 1;

    function solve() {
      beta = Math.pow(10, bS.get());
      const w = leaves.map((L) => L.ref * Math.exp(L.r / beta));
      const Z = sim.sum(w);
      logZ = Math.log(Z);
      pstar = w.map((x) => x / Z);
    }
    const key = (toks) => toks.join(' ');
    // 접두사 질량: 그 접두사로 시작하는 완성된 답들의 확률 합
    function mass(prefixToks, which) {
      const pre = key(prefixToks);
      let m = 0;
      leaves.forEach((L, i) => {
        const ok = pre === '' || L.text === pre || L.text.startsWith(pre + ' ');
        if (ok) m += which === 'ref' ? L.ref : pstar[i];
      });
      return m;
    }
    function condProbs(toks) {
      const pre = key(toks);
      const total = { ref: mass(toks, 'ref'), pol: mass(toks, 'pol') };
      return TOK_TREE[pre].map(([t, pr]) => {
        if (t === END) {
          const i = leaves.findIndex((L) => L.text === pre);
          return { t, ref: pr, pol: pstar[i] / total.pol };
        }
        const nt = toks.concat([t]);
        return { t, ref: pr, pol: mass(nt, 'pol') / total.pol };
      });
    }
    function finished() { return path.length && path[path.length - 1].t === END; }
    function choose(o) { path.push(o); draw(); }
    function auto(which) {
      if (finished()) path = [];
      while (!finished()) {
        const toks = path.map((x) => x.t);
        const cp = condProbs(toks);
        const i = r.choice(cp.map((c) => c[which]));
        path.push(cp[i]);
      }
      draw();
    }
    function draw() {
      const toks = path.filter((x) => x.t !== END).map((x) => x.t);
      say.innerHTML = '<span class="col-muted">질문: 2+3은?&nbsp;&nbsp;답:</span> <strong>' + (toks.length ? RL.escapeHtml(toks.join(' ')) : '') + '</strong>' + (finished() ? ' <span class="col-muted">(완성)</span>' : ' <span class="col-muted">▍</span>');
      opts.innerHTML = '';
      if (!finished()) {
        condProbs(path.map((x) => x.t)).forEach((c) => {
          ui.button(opts, '<strong>' + RL.escapeHtml(c.t) + '</strong>&nbsp; 원래 ' + Math.round(c.ref * 100) + '% · 정렬 ' + Math.round(c.pol * 100) + '%', () => choose(c));
        });
      }
      let pr = 1, pp = 1, lr = 0;
      const lines = path.map((x, i) => {
        pr *= x.ref; pp *= x.pol; lr += Math.log(x.pol / x.ref);
        return (i + 1) + '. "' + x.t + '"  원래 ' + x.ref.toFixed(3) + ' · 정렬 ' + x.pol.toFixed(3) + '  →  log(정렬/원래) = ' + Math.log(x.pol / x.ref).toFixed(3);
      });
      st.set('pref', path.length ? pr.toFixed(4) : '–');
      st.set('ppol', path.length ? pp.toFixed(4) : '–');
      st.set('lr', path.length ? lr.toFixed(3) : '–');
      if (finished()) {
        const L = leaves.find((x) => x.text === toks.join(' '));
        st.set('rew', L.r.toFixed(2));
        st.set('chk', (L.r / beta - logZ).toFixed(3));
        lines.push('완성. 단어마다의 log 비율을 더한 값(' + lr.toFixed(3) + ')이 "보상/β − log Z"(' + (L.r / beta - logZ).toFixed(3) + ')와 같다. 정렬된 모델의 확률 비율에 보상이 그대로 들어 있다는 뜻이고, 이것이 DPO(20장)의 출발점이다.');
      } else {
        st.set('rew', '답이 끝나야 나온다');
        st.set('chk', '–');
      }
      log.textContent = lines.length ? lines.join('\n') : '아직 고른 단어가 없다. 위 버튼으로 첫 단어를 고르자.';
      const refR = sim.sum(leaves.map((L) => L.ref * L.r));
      const polR = sim.sum(leaves.map((L, i) => pstar[i] * L.r));
      st2.set('kl', sim.kl(pstar, leaves.map((L) => L.ref)).toFixed(3) + ' nats');
      st2.set('er', refR.toFixed(2) + ' → ' + polR.toFixed(2));
    }
    solve();
    draw();
  }

  /* ---------- KL-보상 경계 계산기 ---------- */
  function mountFrontier(el) {
    const resp = [
      { name: '간결', full: '간결한 정답', ref: 0.18, r: 1.2, gold: 1.0 },
      { name: '장황', full: '장황한 정답', ref: 0.15, r: 1.4, gold: 0.6 },
      { name: '부분', full: '부분 정답', ref: 0.20, r: 0.2, gold: 0.2 },
      { name: '아첨', full: '아첨하는 답', ref: 0.12, r: 0.8, gold: -0.3 },
      { name: '오답', full: '오답', ref: 0.32, r: -1.2, gold: -1.0 },
      { name: '해킹', full: '형식만 맞춘 답 (보상 해킹)', ref: 0.03, r: 2.0, gold: -1.5 },
    ];
    const p = ui.panel(el, { kind: 'CALC', title: '$\\pi^* \\propto \\pi_{\\text{ref}}\\,e^{r/\\beta}$ 계산기와 보상-KL 경계', caption: 'β 슬라이더를 오른쪽에서 왼쪽으로 천천히 옮기며, 오른쪽 그래프의 주황 점(실제 품질)이 올라갔다가 다시 떨어지는 지점을 찾아보라. 한 프롬프트의 응답 후보 6개(간결한 정답, 장황한 정답, 부분 정답, 아첨, 오답, 형식만 맞춘 보상 해킹). 아래에서 응답을 골라 기준 확률과 보상모델 점수를 바꿀 수 있다. 오른쪽 그래프는 $\\beta$를 $10^{-1.5}$에서 $10^{1.3}$까지 움직일 때의 (KL, 기대 보상) 경로이며, 점이 현재 $\\beta$다.' });
    const ctr = ui.row(p.body);
    let sel = 5;
    const bS = ui.slider(ctr, { label: '$\\log_{10}\\beta$', min: -1.5, max: 1.3, step: 0.01, value: 0.5, format: (v) => v.toFixed(2) + '  (β=' + Math.pow(10, v).toPrecision(2) + ')', onInput: upd });
    const pickSel = ui.select(ctr, { label: '편집할 응답', value: sel, options: resp.map((r, i) => ({ value: i, label: r.full })), onChange: (v) => { sel = +v; refS.set(resp[sel].ref, true); rS.set(resp[sel].r, true); } });
    const refS = ui.slider(ctr, { label: '기준 가중치 (정규화 전)', min: 0.005, max: 0.6, step: 0.005, value: resp[sel].ref, format: ui.fmt.f(3), onInput: (v) => { resp[sel].ref = v; upd(); } });
    const rS = ui.slider(ctr, { label: '보상모델 점수 r', min: -2, max: 3, step: 0.05, value: resp[sel].r, format: ui.fmt.f(2), onInput: (v) => { resp[sel].r = v; upd(); } });
    const btns = ui.row(p.body, 'btns');
    const goldCb = ui.checkbox(btns, { label: '실제 품질 곡선도 보기', value: true, onChange: upd });
    const st = ui.stats(p.body, [
      { key: 'er', label: '$\\mathbb{E}_{\\pi^*}[r]$', tone: 'accent' },
      { key: 'kl', label: '$\\mathrm{KL}(\\pi^*\\|\\pi_{\\text{ref}})$' },
      { key: 'obj', label: '최적 목적값 $\\beta\\log Z$' },
      { key: 'ent', label: '엔트로피 $H(\\pi^*)$' },
      { key: 'gold', label: '$\\mathbb{E}_{\\pi^*}[$실제 품질$]$', tone: 'signal' },
      { key: 'selp', label: '선택한 응답: $\\pi_{\\text{ref}} \\to \\pi^*$' },
    ]);
    const split = document.createElement('div');
    split.className = 'w-split';
    const L = document.createElement('div'), R = document.createElement('div');
    split.append(L, R);
    p.body.appendChild(split);
    const bars = plot.bars(L, { categories: resp.map((r) => r.name), series: [], height: 260, y: { min: 0, max: 1, label: '확률' } });
    const line = plot.line(R, { height: 260, x: { min: 0, label: 'KL(π* ‖ π_ref)  [nats]' }, y: { label: '기대값' }, series: [], hoverDigits: 3 });
    void pickSel;

    function solve(beta) {
      const z0 = sim.sum(resp.map((r) => r.ref));
      const ref = resp.map((r) => r.ref / z0);
      const logits = resp.map((r, i) => Math.log(ref[i]) + r.r / beta);
      const m = Math.max(...logits);
      const w = logits.map((l) => Math.exp(l - m));
      const Z = sim.sum(w);
      const pi = w.map((x) => x / Z);
      const logZ = m + Math.log(Z); // log Σ ref·e^{r/β}
      return {
        ref, pi,
        er: sim.sum(pi.map((x, i) => x * resp[i].r)),
        gold: sim.sum(pi.map((x, i) => x * resp[i].gold)),
        kl: sim.kl(pi, ref),
        obj: beta * logZ,
        ent: sim.entropy(pi),
      };
    }
    function upd() {
      const beta = Math.pow(10, bS.get());
      const s = solve(beta);
      bars.update({ series: [
        { name: '$\\pi_{\\text{ref}}$', color: 'c6', values: s.ref, opacity: 0.65 },
        { name: '$\\pi^*$', color: 'c1', values: s.pi },
      ] });
      const path = [], goldPath = [];
      for (let i = 0; i <= 140; i++) {
        const lb = 1.3 - i * (2.8 / 140);
        const t = solve(Math.pow(10, lb));
        path.push([t.kl, t.er]);
        goldPath.push([t.kl, t.gold]);
      }
      const series = [{ name: '보상모델 점수 $\\mathbb{E}[r]$', color: 'c1', data: path, endDot: false, points: [[s.kl, s.er, 6]] }];
      if (goldCb.get()) series.push({ name: '실제 품질', color: 'signal', data: goldPath, endDot: false, points: [[s.kl, s.gold, 6]] });
      line.update({ series, x: { min: 0, max: Math.max(0.5, path[path.length - 1][0] * 1.05), label: 'KL(π* ‖ π_ref)  [nats]' } });
      st.set('er', s.er.toFixed(3));
      st.set('kl', s.kl.toFixed(3));
      st.set('obj', s.obj.toFixed(3));
      st.set('ent', s.ent.toFixed(3));
      st.set('gold', s.gold.toFixed(3));
      st.set('selp', resp[sel].name + ' ' + s.ref[sel].toFixed(3) + ' → ' + s.pi[sel].toFixed(3));
    }
    upd();
  }

  /* ---------- KL 추정량 비교 ---------- */
  function mountKLEst(el) {
    const p = ui.panel(el, { kind: 'SIM', title: 'KL 추정량 k1 · k2 · k3의 편향과 분산', caption: 'μ 슬라이더를 작은 값으로 내리고, 막대 그래프에서 k1의 주황 막대(흩어짐)가 k2, k3보다 얼마나 커지는지 보라. $q=\\mathcal{N}(0,1)$에서 샘플하고 $\\rho = p(x)/q(x)$, $p = \\mathcal{N}(\\mu,1)$. 표본 하나당 추정값의 평균(편향)과 표준편차를 참 KL $\\mu^2/2$로 나눈 상대값으로 비교한다. 오른쪽은 $\\mu$에 따른 상대 표준편차(로그 축)를 실제 샘플링으로 그린 것이다.' });
    const ctr = ui.row(p.body);
    const mS = ui.slider(ctr, { label: '분포 간 거리 μ', min: 0.05, max: 2, step: 0.05, value: 0.5, format: ui.fmt.f(2), onInput: upd });
    const nS = ui.slider(ctr, { label: '표본 수', min: 1000, max: 50000, step: 1000, value: 20000, format: ui.fmt.int, onInput: upd });
    const st = ui.stats(p.body, [
      { key: 'kl', label: '참 KL = μ²/2' },
      { key: 'k1', label: 'k1 평균 · 음수 비율', tone: 'accent' },
      { key: 'k2', label: 'k2 평균 (편향)' },
      { key: 'k3', label: 'k3 평균', tone: 'signal' },
    ]);
    const split = document.createElement('div');
    split.className = 'w-split';
    const L = document.createElement('div'), R = document.createElement('div');
    split.append(L, R);
    p.body.appendChild(split);
    const bars = plot.bars(L, { categories: ['k1', 'k2', 'k3'], series: [], height: 240, y: { label: '참 KL 대비 비율' }, labels: true, labelFmt: (v) => v.toFixed(2) });
    const line = plot.line(R, { height: 240, x: { min: 0.05, max: 2, label: 'μ' }, y: { label: 'log₁₀(표준편차 / 참 KL)' }, series: [], hoverDigits: 2 });

    function stats(mu, n, seed) {
      const r = sim.rng(seed);
      const s = [[0, 0], [0, 0], [0, 0]];
      let neg = 0;
      for (let i = 0; i < n; i++) {
        const x = r.normal();
        const lr = mu * x - (mu * mu) / 2; // log p(x) - log q(x)
        const rho = Math.exp(lr);
        const k = [-lr, 0.5 * lr * lr, rho - 1 - lr];
        if (k[0] < 0) neg++;
        for (let j = 0; j < 3; j++) { s[j][0] += k[j]; s[j][1] += k[j] * k[j]; }
      }
      const out = s.map(([a, b]) => { const m = a / n; return { mean: m, sd: Math.sqrt(Math.max(0, b / n - m * m)) }; });
      out.neg = neg / n;
      return out;
    }
    // 오른쪽 곡선은 μ 격자에서 한 번만 계산
    const grid = sim.range(20).map((i) => 0.1 + i * 0.1);
    const curves = [[], [], []];
    grid.forEach((mu, gi) => {
      const o = stats(mu, 4000, 100 + gi);
      const kl = (mu * mu) / 2;
      o.forEach((e, j) => curves[j].push([mu, Math.log10(e.sd / kl)]));
    });
    function upd() {
      const mu = mS.get();
      const kl = (mu * mu) / 2;
      const o = stats(mu, nS.get(), 1);
      bars.update({ series: [
        { name: '평균 / 참 KL (1이면 불편)', color: 'c1', values: o.map((e) => e.mean / kl) },
        { name: '표준편차 / 참 KL', color: 'c2', values: o.map((e) => e.sd / kl) },
      ] });
      line.update({
        series: [
          { name: 'k1', color: 'c1', data: curves[0] },
          { name: 'k2', color: 'c3', data: curves[1] },
          { name: 'k3', color: 'signal', data: curves[2] },
        ],
        vlines: [{ x: mu, label: 'μ', color: 'muted' }],
      });
      st.set('kl', kl.toFixed(4));
      st.set('k1', o[0].mean.toFixed(4) + ' · ' + (o.neg * 100).toFixed(0) + '%');
      st.set('k2', o[1].mean.toFixed(4) + ' (이론 ' + (kl + Math.pow(mu, 4) / 8).toFixed(4) + ')');
      st.set('k3', o[2].mean.toFixed(4));
    }
    upd();
  }

  /* ---------- 정방향 vs 역방향 KL ---------- */
  function mountFwdRev(el) {
    const p = ui.panel(el, { kind: 'SIM', title: '쌍봉 분포 $p$에 단봉 가우시안 $q$ 맞추기', caption: '봉우리 간격 슬라이더를 넓혀 가며, 파란 곡선(정방향)은 두 봉우리 사이로 넓게 퍼지고 주황 곡선(역방향)은 한 봉우리에 달라붙는지 보라. 정방향 $\\mathrm{KL}(p\\|q)$의 최적 가우시안은 $p$의 평균과 분산을 그대로 맞춘 것(모멘트 매칭)이다. 역방향 $\\mathrm{KL}(q\\|p)$는 수치 적분과 격자 탐색으로 실제로 최소화한다.' });
    const ctr = ui.row(p.body);
    const dS = ui.slider(ctr, { label: '봉우리 간격', min: 0.5, max: 6, step: 0.1, value: 4, format: ui.fmt.f(1), onInput: upd });
    const wS = ui.slider(ctr, { label: '왼쪽 봉우리 비중', min: 0.1, max: 0.9, step: 0.05, value: 0.4, format: ui.fmt.f(2), onInput: upd });
    const st = ui.stats(p.body, [
      { key: 'fw', label: '정방향 해 (평균, 표준편차)', tone: 'accent' },
      { key: 'rv', label: '역방향 해 (평균, 표준편차)', tone: 'signal' },
      { key: 'kl', label: '각 해의 KL(p‖q) / KL(q‖p)' },
    ]);
    const chartEl = document.createElement('div');
    p.body.appendChild(chartEl);
    const chart = plot.line(chartEl, { height: 260, x: { min: -6, max: 6, label: 'y' }, y: { min: 0, label: '밀도' }, series: [], hoverDigits: 3 });
    const X = sim.range(481).map((i) => -6 + i * 0.025);
    const dx = 0.025;
    const N = (x, m, s) => Math.exp(-0.5 * ((x - m) / s) ** 2) / (s * Math.sqrt(2 * Math.PI));
    function upd() {
      const d = dS.get(), w = wS.get(), sd = 0.6;
      const P = X.map((x) => w * N(x, -d / 2, sd) + (1 - w) * N(x, d / 2, sd));
      const mean = w * (-d / 2) + (1 - w) * (d / 2);
      const varp = sd * sd + w * (d / 2 + mean) ** 2 + (1 - w) * (d / 2 - mean) ** 2;
      const fw = [mean, Math.sqrt(varp)];
      const revKL = (m, s) => {
        let k = 0;
        for (let i = 0; i < X.length; i++) { const q = N(X[i], m, s); if (q > 1e-12) k += q * (Math.log(q) - Math.log(P[i] + 1e-300)) * dx; }
        return k;
      };
      const fwdKL = (m, s) => {
        let k = 0;
        for (let i = 0; i < X.length; i++) { if (P[i] > 1e-12) k += P[i] * (Math.log(P[i]) - Math.log(N(X[i], m, s) + 1e-300)) * dx; }
        return k;
      };
      let best = [0, 1], bv = Infinity;
      for (let m = -4; m <= 4.0001; m += 0.1) {
        for (let s = 0.2; s <= 3.0001; s += 0.1) { const v = revKL(m, s); if (v < bv) { bv = v; best = [m, s]; } }
      }
      // 국소 정밀화
      for (let m = best[0] - 0.1; m <= best[0] + 0.1001; m += 0.01) {
        for (let s = Math.max(0.1, best[1] - 0.1); s <= best[1] + 0.1001; s += 0.01) { const v = revKL(m, s); if (v < bv) { bv = v; best = [m, s]; } }
      }
      chart.update({ series: [
        { name: '목표 $p$ (쌍봉)', color: 'muted', area: true, data: X.map((x, i) => [x, P[i]]), endDot: false },
        { name: '정방향 KL 해 (모드 덮기)', color: 'c1', data: X.map((x) => [x, N(x, fw[0], fw[1])]), endDot: false },
        { name: '역방향 KL 해 (모드 찾기)', color: 'signal', data: X.map((x) => [x, N(x, best[0], best[1])]), endDot: false },
      ] });
      st.set('fw', fw[0].toFixed(2) + ', ' + fw[1].toFixed(2));
      st.set('rv', best[0].toFixed(2) + ', ' + best[1].toFixed(2));
      st.set('kl', '정방향 해 ' + fwdKL(fw[0], fw[1]).toFixed(2) + ' / ' + revKL(fw[0], fw[1]).toFixed(2) + ' · 역방향 해 ' + fwdKL(best[0], best[1]).toFixed(2) + ' / ' + bv.toFixed(2));
    }
    upd();
  }
})();
