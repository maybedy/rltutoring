/* 09 함수근사와 Deadly Triad */
(function () {
  const { ui, sim, plot } = RL;

  RL.chapter({
    id: 'approx',
    title: '함수근사와 Deadly Triad',
    subtitle: '표를 함수로 바꾸는 순간 벨만 축약의 보장(T1)이 깨질 수 있다. 함수근사 · 부트스트랩 · off-policy가 한자리에 모이면 왜 발산하는지, 두 상태짜리 예제와 Baird의 반례로 직접 본다.',
    time: 40,
    level: '중급 · 핵심',
    prereq: ['td'],
    theses: ['T8', 'T1', 'T6'],
    goals: [
      '선형 가치 근사에서 semi-gradient TD를 유도하고, 그것이 어떤 목적함수의 경사도 아닌 이유를 설명할 수 있다.',
      'TD 고정점이 투영된 벨만 방정식 $\\hat v = \\Pi\\mathcal{T}^\\pi\\hat v$의 해라는 것과 on-policy에서만 수렴이 보장되는 이유를 말할 수 있다.',
      'Deadly Triad의 세 요소를 하나씩 빼면 무엇이 안정해지는지, 두 상태 예제와 Baird 반례로 확인한다.',
    ],
    html: String.raw`
<p>상태가 바둑판 배치나 이미지처럼 많아지면 표를 쓸 수 없다. 가치 함수를 파라미터 $w\in\mathbb{R}^d$를 가진 함수 $\hat v(s,w)$로 근사해야 한다. 이때 두 가지가 동시에 생긴다. 한 상태의 업데이트가 비슷한 상태들까지 바꾸는 <strong>일반화</strong>, 그리고 그 일반화가 부트스트랩과 엉키면서 생기는 <strong>불안정성</strong>이다. 이 장은 가장 단순한 선형 근사 $\hat v(s,w) = w^\top x(s)$로 둘 다를 정확히 본다.</p>

<h2>목표: 가치 오차와 경사 몬테카를로</h2>
<p>상태 분포 $\mu$로 가중한 평균 제곱 가치 오차를 줄이고 싶다.</p>
$$\overline{\mathrm{VE}}(w) = \sum_s \mu(s)\,\big[v_\pi(s) - \hat v(s,w)\big]^2$$
<p>$v_\pi(s)$ 대신 불편 추정치인 리턴 $G_t$를 쓰면 진짜 SGD가 된다: $w \leftarrow w + \alpha[G_t - \hat v(s_t,w)]\nabla\hat v(s_t,w)$. 이것이 경사 몬테카를로이며 선형이면 전역 최적에 수렴한다. 문제는 리턴의 분산이 크고 에피소드가 끝나야 쓸 수 있다는 것이다(T6).</p>

<h2>Semi-gradient TD의 유도</h2>
<div data-w="dv-semi"></div>
<div data-w="fx-semi"></div>

<h3>TD 고정점과 투영된 벨만 방정식</h3>
<p>기대 업데이트 $\mathbb{E}[\Delta w] = \alpha(b - Aw)$가 0이 되는 점이 <strong>TD 고정점</strong> $w_{\text{TD}} = A^{-1}b$다. 기하학적으로는 "벨만 백업 후 근사 공간으로 투영한 결과가 자기 자신"인 점이다.</p>
$$\hat v_{w_{\text{TD}}} = \Pi\,\mathcal{T}^\pi\,\hat v_{w_{\text{TD}}},\qquad \Pi = X(X^\top D X)^{-1}X^\top D$$
<div class="w wide" style="box-shadow:none"><div class="w-body">
<svg viewBox="0 0 640 220" role="img" aria-label="투영된 벨만 방정식의 기하">
  <defs><marker id="approx-ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--muted)"/></marker></defs>
  <path d="M40 180 L600 150" style="stroke:var(--accent);stroke-width:2;fill:none"/>
  <text x="600" y="140" text-anchor="end" style="fill:var(--accent);font-size:13px">근사 가능한 함수의 부분공간 {Xw}</text>
  <circle cx="330" cy="40" r="5" style="fill:var(--signal)"/><text x="340" y="36" style="fill:var(--ink);font-size:13px">v_π (참 가치)</text>
  <path d="M330 45 L337 160" style="stroke:var(--signal);stroke-dasharray:4 3;fill:none"/>
  <circle cx="337" cy="164" r="5" style="fill:var(--signal)"/><text x="300" y="200" style="fill:var(--ink);font-size:12px">Π v_π (VE 최소)</text>
  <circle cx="190" cy="172" r="5" style="fill:var(--c3)"/><text x="120" y="204" style="fill:var(--ink);font-size:12px">v̂(w_TD) (PBE = 0)</text>
  <path d="M190 172 L230 80" style="stroke:var(--muted);stroke-width:1.5;fill:none" marker-end="url(#approx-ar)"/>
  <text x="236" y="78" style="fill:var(--muted);font-size:12px">T^π v̂ (백업)</text>
  <path d="M230 80 L192 166" style="stroke:var(--c3);stroke-dasharray:3 3;fill:none"/>
  <text x="70" y="110" style="fill:var(--muted);font-size:12px">투영 Π가 백업을</text>
  <text x="70" y="126" style="fill:var(--muted);font-size:12px">제자리로 되돌림</text>
</svg></div></div>
<p>TD 고정점은 일반적으로 VE를 최소화하는 점 $\Pi v_\pi$가 아니다. on-policy 분포에서는 품질 보장이 있다(Tsitsiklis & Van Roy 1997).</p>
$$\overline{\mathrm{VE}}(w_{\text{TD}}) \;\le\; \frac{1}{1-\gamma}\,\min_w \overline{\mathrm{VE}}(w)\qquad(\text{TD}(\lambda)\text{면 } \tfrac{1-\gamma\lambda}{1-\gamma})$$
<p>$\gamma$가 1에 가까우면 이 배수가 커진다. 부트스트랩이 적을수록($\lambda\to1$) 고정점의 품질이 좋아지고, 대신 분산이 커진다(T6).</p>

<h2>왜 on-policy에서는 수렴하고 off-policy에서는 발산하는가</h2>
<p>기대 업데이트 $w \leftarrow w + \alpha(b - Aw)$가 안정하려면 $A = X^\top D(I-\gamma P^\pi)X$가 <strong>양의 정부호</strong>(모든 고유값의 실수부가 양수)여야 한다. 핵심 보조정리는 이것이다: $D$가 $P^\pi$의 정상 분포이면 $\|P^\pi v\|_D \le \|v\|_D$, 즉 전이 행렬이 $D$-노름에서 늘이지 않는다. 그러면</p>
$$y^\top D(I-\gamma P^\pi)y \;\ge\; \|y\|_D^2 - \gamma\|y\|_D\|P^\pi y\|_D \;\ge\; (1-\gamma)\|y\|_D^2 > 0$$
<p>이 성립해 $A$가 양의 정부호가 된다. off-policy에서는 $D$가 행동 정책의 분포이고 $P^\pi$는 목표 정책의 전이이므로 이 보조정리가 깨진다. 업데이트되는 상태의 분포와 부트스트랩으로 참조되는 상태의 분포가 어긋나면, "참조만 되고 교정은 안 되는" 상태의 값이 일반화를 타고 계속 끌어올려진다.</p>

<h3>가장 작은 발산 예: $w \to 2w$</h3>
<p>Sutton & Barto 11.1의 예다. 두 상태의 특징이 $x(s_1) = 1$, $x(s_2) = 2$라서 $\hat v(s_1) = w$, $\hat v(s_2) = 2w$다. 보상 0으로 $s_1 \to s_2$ 전이가 일어난다. 이 전이 하나만 업데이트하면</p>
$$w \leftarrow w + \alpha\big(0 + \gamma\cdot 2w - w\big)\cdot 1 = \big(1 + \alpha(2\gamma - 1)\big)\,w$$
<p>이므로 $\gamma > 0.5$이면 매번 1보다 큰 배율로 곱해져 발산한다. $s_2$의 값을 교정하는 업데이트가 없기 때문이다. on-policy라면 $s_2$를 방문했을 때 그 다음 전이(여기서는 종료, 보상 0)로도 업데이트가 일어나 $w \leftarrow (1-4\alpha)w$가 곱해진다.</p>
<div data-w="w2w"></div>
<div class="key"><span class="label">관찰</span>타깃을 고정해도(타깃 네트워크) off-policy 발산은 사라지지 않는다. 안쪽 회귀가 $w = 2\gamma\,w^-$로 수렴하고, 타깃을 갱신하면 다시 $2\gamma$배가 되기 때문이다. 투영된 연산자 $\Pi\mathcal{T}$ 자체가 팽창(expansion)이면 타깃 고정은 발산을 <em>늦출</em> 뿐 막지 못한다. DQN에서 타깃 네트워크가 효과적인 이유는 다른 데 있다(<a href="#dqn">10장</a>).</div>

<h3>Baird의 반례 (1995)</h3>
<p>상태 7개, 특징 8개인 선형 근사다. 위의 6개 상태는 $\hat v(i) = 2w_i + w_8$, 아래 상태는 $\hat v(7) = w_7 + 2w_8$이다. 모든 보상이 0이므로 참 가치는 0이고, $w=0$으로 정확히 표현할 수 있다. 행동 정책은 1/7 확률로 상태 7로, 6/7 확률로 위 상태 중 하나로 가고, 목표 정책은 항상 상태 7로 간다. 특징이 상태 수보다 많아 표현력이 충분한데도 semi-gradient TD는 발산한다. 아래는 행동 분포(균등)에서의 <em>기대</em> 업데이트를 정확히 계산한 결과다(무작위성 없음).</p>
<div data-w="baird"></div>
<p>TDC는 투영된 벨만 오차(PBE)를 진짜로 최소화하는 경사 방법이라 발산하지 않는다. 다만 그림처럼 PBE는 빠르게 0으로 가도 VE는 아주 천천히 줄 수 있다. 이 예에서는 특징이 상태보다 많아 $\Pi = I$이므로 PBE가 곧 벨만 오차이고, 남은 오차는 $\gamma$에 가까운 고유값을 가진 "모든 상태에 같은 상수를 더하는" 방향으로 천천히 빠진다.</p>

<div class="thesis-box"><span class="label">대전제 T8 · Deadly Triad</span>
<p><strong>함수근사</strong>(일반화), <strong>부트스트랩</strong>(추정치로 타깃 만들기), <strong>off-policy 학습</strong>(업데이트 분포 ≠ 목표 정책 분포). 셋이 모두 있으면 발산할 수 있고, 하나라도 빼면 위의 예들은 안정해진다(Sutton & Barto 11.3).</p>
<ul>
<li>함수근사를 빼면(표 형식): Q-learning은 off-policy + 부트스트랩이지만 축약(T1)으로 수렴한다.</li>
<li>부트스트랩을 빼면(MC, $\lambda=1$): 진짜 경사 하강이 되어 안정하다. 대신 분산(T6).</li>
<li>off-policy를 빼면: on-policy 분포에서 $A$가 양의 정부호라 선형 TD가 수렴한다.</li>
</ul>
<p>DQN 이후 딥 RL은 셋을 모두 포기하지 않는다. 대신 타깃 네트워크, 재생 버퍼의 분포 관리, double estimator, n-step, 정규화로 증상을 다스린다(<a href="#dqn">10장</a>, <a href="#offline">15장</a>).</p>
</div>

<h2>처방들: 무엇을 바꿨고 무엇을 치르나</h2>
<div class="table-wrap" style="position:relative"><table class="t">
<thead><tr><th>방법</th><th>무엇이 바뀌었나</th><th>대가</th></tr></thead>
<tbody>
<tr><td>잔차 경사 (Baird 1995)</td><td>벨만 오차 $\overline{\mathrm{BE}}$의 진짜 경사를 따른다 (타깃 쪽도 미분)</td><td>독립 샘플 두 개(double sampling) 필요, 느림, BE는 데이터만으로 식별되지 않음</td></tr>
<tr><td>GTD2 / TDC (Sutton et al. 2009)</td><td>PBE의 진짜 경사. 보조 가중치 $v$로 $\mathbb{E}[xx^\top]^{-1}\mathbb{E}[\delta x]$ 추정</td><td>두 시간 척도, 하이퍼파라미터 민감</td></tr>
<tr><td>Emphatic TD (Sutton, Mahmood & White 2016)</td><td>follow-on 흔적으로 업데이트를 재가중해 on-policy와 같은 안정성 회복</td><td>재가중치의 분산이 큼</td></tr>
<tr><td>LSTD (Bradtke & Barto 1996)</td><td>$Aw=b$를 통계량으로 직접 풀기</td><td>$O(d^2)$ 메모리·계산</td></tr>
<tr><td>타깃 네트워크 (Mnih et al. 2015)</td><td>부트스트랩 타깃을 일정 기간 고정 → 각 구간이 회귀 문제</td><td>투영 연산자가 팽창이면 발산을 막지 못함 (위 실험)</td></tr>
<tr><td>n-step / λ 리턴</td><td>부트스트랩을 줄임</td><td>분산 증가 (T6), off-policy면 중요도 비율 필요</td></tr>
<tr><td>정규화 (LayerNorm, L2)</td><td>특징과 가치의 크기를 묶어 팽창 방향을 억제</td><td>표현력 제약. 타깃 네트워크 없이도 안정하다는 최근 분석이 있다(Gallici et al. 2024)</td></tr>
</tbody></table></div>
`,
    mount: {
      'dv-semi': (el) => ui.derivation(el, {
        title: '경사 MC → semi-gradient TD → 기대 업데이트',
        steps: [
          { tex: String.raw`w \leftarrow w + \alpha\,\big[\,\hl{U_t} - \hat v(s_t,w)\,\big]\,\nabla_w\hat v(s_t,w)`, why: '타깃 $U_t$를 향한 SGD의 일반형. $U_t = G_t$(불편)이면 $\\overline{\\mathrm{VE}}$에 대한 진짜 확률적 경사다.' },
          { tex: String.raw`U_t = r_{t+1} + \gamma\,\hat v(s_{t+1}, \hl{w})`, why: 'TD는 타깃에 자기 추정을 쓴다. 이제 타깃이 $w$에 의존한다.' },
          { tex: String.raw`\nabla_w \tfrac12\big[U_t(w) - \hat v(s_t,w)\big]^2 = \big[U_t - \hat v(s_t,w)\big]\big(\hl{\gamma\nabla\hat v(s_{t+1},w)} - \nabla\hat v(s_t,w)\big)`, why: '제곱 TD 오차를 정직하게 미분하면 타깃 쪽 경사 항(강조)이 생긴다. TD는 이 항을 <strong>버린다</strong>. 그래서 "semi"-gradient.' },
          { tex: String.raw`w \leftarrow w + \alpha\,\big[r_{t+1} + \gamma\, w^\top x_{t+1} - w^\top x_t\big]\,x_t`, why: '선형 $\\hat v = w^\\top x$에서의 semi-gradient TD(0). 타깃을 상수처럼 취급한다(stop-gradient).' },
          { tex: String.raw`\mathbb{E}[\Delta w] = \alpha\big(\underbrace{\mathbb{E}[r\,x_t]}_{b} - \underbrace{\mathbb{E}\big[x_t(x_t - \gamma x_{t+1})^\top\big]}_{A}\,w\big),\qquad A = X^\top D(I-\gamma P^\pi)X`, why: '기대 업데이트는 선형 시스템이다. $D$는 업데이트가 일어나는 상태 분포의 대각 행렬.' },
          { tex: String.raw`A \ne A^\top \;\Rightarrow\; \nexists\,L(w):\ \nabla L = Aw - b`, why: '어떤 함수의 경사장이라면 그 야코비안(여기서는 $A$)은 대칭(헤시안)이어야 한다. $P^\\pi$ 때문에 $A$는 일반적으로 비대칭이므로, TD는 어떤 목적함수도 최소화하지 않는다. 회전 성분이 있는 벡터장을 따라가는 것이다.' },
        ],
      }),
      'fx-semi': (el) => ui.formula(el, {
        title: '선형 semi-gradient TD(0) 해부',
        tex: String.raw`\tm{w}{w} \leftarrow w + \tm{a}{\alpha}\,\Big[\,\tm{tgt}{r + \gamma\, \sg\!\big(w^\top x(s')\big)} - \tm{pred}{w^\top x(s)}\,\Big]\;\tm{x}{x(s)}`,
        terms: [
          { id: 'w', sym: 'w', label: '가중치', desc: '모든 상태가 공유하는 파라미터. 한 번의 업데이트가 모든 상태의 값을 바꾼다.' },
          { id: 'a', sym: '\\alpha', label: '스텝 크기', desc: '선형이면 $\\alpha\\|x\\|^2 < 2$ 정도여야 한 샘플에서도 튀지 않는다.', long: '같은 특징이 반복해서 업데이트되면 LMS처럼 $\\alpha\\|x\\|^2$이 2를 넘을 때 진동 발산한다. 이것은 Deadly Triad와 별개의 스텝 크기 불안정성이다.' },
          { id: 'tgt', sym: "r + \\gamma\\,\\mathrm{sg}(\\hat v(s'))", label: '부트스트랩 타깃 (경사 차단)', desc: '자기 추정을 상수처럼 취급. sg = stop-gradient.', long: 'DQN 코드에서 타깃 계산에 <code>no_grad</code>/<code>detach</code>를 쓰는 바로 그 부분. 타깃 네트워크는 이 상수를 아예 오래된 파라미터로 계산한다.' },
          { id: 'pred', sym: '\\hat v(s)', label: '현재 예측', desc: '업데이트되는 쪽.' },
          { id: 'x', sym: 'x(s)', label: '특징 벡터 = 경사', desc: '선형이면 $\\nabla_w\\hat v = x(s)$. 이 방향으로 모든 비슷한 상태가 함께 움직인다.' },
        ],
      }),
      w2w: mountW2W,
      baird: mountBaird,
    },
    tacit: [
      { tag: 'math', t: 'TD에는 "줄어드는 손실"이 없다',
        d: '<p>semi-gradient TD의 기대 업데이트 $b - Aw$는 $A$가 비대칭이라 어떤 스칼라 함수의 경사도 아니다. 회전 성분이 있는 흐름이므로, 수렴할 때도 단조 감소하는 양이 따로 없다(on-policy에서는 $\\|w - w_{\\text{TD}}\\|$가 $D$-가중 노름에서 줄어드는 리아푸노프 함수가 있을 뿐이다). 딥 RL에서 "TD 손실"을 모니터링하는 것이 정책 품질과 잘 맞지 않는 근본 이유다.</p>' },
      { tag: 'math', t: 'Deadly Triad의 정확한 내용은 한 줄짜리 보조정리다',
        d: '<p>"정상 분포 $D$에서 $\\|P^\\pi v\\|_D \\le \\|v\\|_D$"(옌센 + 정상성). 이 부등식 하나가 $A$의 양의 정부호성, 따라서 선형 TD의 수렴을 준다. off-policy는 $D$와 $P^\\pi$의 짝을 깨뜨려 이 부등식을 무효로 만든다. Emphatic TD는 업데이트를 재가중해 이 짝을 인위적으로 복원하고, GTD는 아예 다른 목적(PBE)의 경사를 따라 이 부등식이 필요 없게 만든다. 처방들이 이 보조정리를 기준으로 분류된다.</p>' },
      { tag: 'research', t: '벨만 오차는 데이터로 배울 수 없다',
        d: '<p>Sutton & Barto 11.6은 관측 분포가 완전히 같은데 벨만 오차를 최소화하는 해가 다른 두 MDP를 보인다. 즉 BE는 관측 가능한 데이터의 함수가 아니다. 단일 샘플로 BE를 최소화하면 실제로는 $\\overline{\\mathrm{BE}} + \\mathbb{E}[\\mathrm{Var}(\\text{타깃}\\mid s)]$를 최소화해, 다음 상태가 결정적으로 보이는 쪽으로 편향된다. 그래서 잔차 경사는 이론적으로 깔끔해도 실전에서 거의 쓰이지 않고, 학습 가능한 목표인 PBE와 VE(MC)가 남는다.</p>' },
      { tag: 'algo', t: '표 형식은 원-핫 특징의 선형 근사다',
        d: '<p>원-핫 특징이면 $\\Pi = I$이고 상태 간 일반화가 0이므로 off-policy여도 "참조만 되고 교정 안 되는" 상태가 다른 상태를 끌어올릴 수 없다. 발산은 정확히 <strong>특징 공유(aliasing)</strong>를 통해 들어온다. $w\\to2w$ 예에서 $s_1$의 업데이트가 $s_2$의 값까지 키운 것처럼. 일반화는 샘플 효율의 원천이자 불안정성의 원천이라는 양날의 칼이다.</p>' },
      { tag: 'practice', t: '첫 번째 진단: Q가 $R_{\\max}/(1-\\gamma)$를 넘는가',
        d: '<p>보상이 $[R_{\\min}, R_{\\max}]$이면 모든 참 가치는 $[R_{\\min}, R_{\\max}]/(1-\\gamma)$ 안에 있다. 학습 중 예측 Q의 최댓값이 이 범위를 넘어 계속 오르면 과대추정이나 발산이 진행 중이다. 딥 RL 디버깅에서 보상 곡선보다 먼저 보는 그래프가 "평균/최대 예측 Q 대 이론 상한"이다. 오프라인 RL에서 Q가 폭주하는 것도 같은 그래프로 잡힌다(15장).</p>' },
    ],
    quiz: [
      { q: 'semi-gradient TD가 "semi"인 이유는?', options: ['경사의 절반만 쓰기 때문에', '타깃 $r+\\gamma\\hat v(s\',w)$의 $w$ 의존성을 미분하지 않기 때문에', '스텝 크기를 반으로 쓰기 때문에', '특징의 절반만 업데이트하기 때문에'], answer: 1,
        explain: '제곱 TD 오차의 완전한 경사에는 타깃 쪽 항 $\\gamma\\nabla\\hat v(s\')$이 있지만, TD는 그것을 버리고 타깃을 상수로 취급한다.' },
      { q: '$w\\to2w$ 예에서 $s_1\\to s_2$ 전이만 반복 업데이트할 때 발산 조건은?', options: ['$\\alpha > 0.5$', '$\\gamma > 0.5$', '$\\gamma > 0.9$', '항상 수렴한다'], answer: 1,
        explain: '배율이 $1+\\alpha(2\\gamma-1)$이므로 $\\gamma>0.5$면 1보다 크다. 스텝 크기와 무관하게 발산한다.' },
      { q: 'Deadly Triad에 포함되지 <em>않는</em> 것은?', options: ['함수근사', '부트스트랩', 'off-policy 학습', '탐험(exploration)'], answer: 3,
        explain: '세 요소는 함수근사, 부트스트랩, off-policy다. 탐험 자체는 위험 요소가 아니다. 다만 탐험 정책과 목표 정책이 다르면 off-policy가 된다.' },
      { q: '타깃 네트워크를 쓰면 $w\\to2w$의 off-policy 발산이 사라지는가?', options: ['예, 타깃이 고정되므로', '아니오, 바깥 반복마다 $2\\gamma$배가 되어 여전히 발산한다', '예, 단 $\\alpha$가 작으면', '아니오, 오히려 즉시 발산한다'], answer: 1,
        explain: '안쪽 회귀는 $w=2\\gamma w^-$로 수렴하고, 타깃 갱신 때마다 $2\\gamma$가 곱해진다. 투영된 연산자 자체가 팽창이면 막을 수 없다.' },
    ],
  });

  /* ---------- w → 2w ---------- */
  function mountW2W(el) {
    const p = ui.panel(el, { kind: 'SIM', title: '$w \\to 2w$: 업데이트 분포가 발산을 결정한다', caption: '세 가지 업데이트 방식을 같은 초기값 $w_0=1$에서 실제로 반복한다. 세로축은 $\\log_{10}|w|$. 위로 올라가는 직선이 발산, 내려가는 직선이 수렴이다.' });
    const ctr = ui.row(p.body);
    const gS = ui.slider(ctr, { label: '할인율 $\\gamma$', min: 0, max: 1, step: 0.01, value: 0.9, format: ui.fmt.f(2), onInput: draw });
    const aS = ui.slider(ctr, { label: '스텝 크기 $\\alpha$', min: 0.01, max: 0.3, step: 0.01, value: 0.1, format: ui.fmt.f(2), onInput: draw });
    const cS = ui.slider(ctr, { label: '타깃 고정 주기 $C$', min: 2, max: 50, step: 1, value: 20, format: ui.fmt.int, onInput: draw });
    const st = ui.stats(p.body, [
      { key: 'off', label: 'off-policy 배율 $1+\\alpha(2\\gamma-1)$', tone: 'signal' },
      { key: 'on', label: 'on-policy 에피소드당 배율', tone: 'accent' },
      { key: 'tgt', label: '타깃 고정 시 주기당 배율(극한 $2\\gamma$)' },
      { key: 'thr', label: '발산 임계 $\\gamma$' },
    ]);
    const chartEl = document.createElement('div');
    p.body.appendChild(chartEl);
    const chart = plot.line(chartEl, { height: 260, x: { label: '업데이트 횟수', min: 0, max: 200 }, y: { label: 'log₁₀ |w|' }, series: [] });
    const N = 200;
    function draw() {
      const g = gS.get(), a = aS.get(), C = cS.get();
      // off-policy: s1→s2 전이만
      let w = 1;
      const off = [[0, 0]];
      for (let k = 1; k <= N; k++) { w += a * (g * 2 * w - w); off.push([k, Math.log10(Math.max(1e-300, Math.abs(w)))]); }
      // on-policy: s1→s2, s2→종료 를 번갈아
      w = 1;
      const on = [[0, 0]];
      for (let k = 1; k <= N; k++) {
        if (k % 2 === 1) w += a * (g * 2 * w - w);
        else w += a * (0 - 2 * w) * 2;
        on.push([k, Math.log10(Math.max(1e-300, Math.abs(w)))]);
      }
      // off-policy + 타깃 고정
      w = 1;
      let wt = 1;
      const tg = [[0, 0]];
      for (let k = 1; k <= N; k++) {
        w += a * (g * 2 * wt - w);
        if (k % C === 0) wt = w;
        tg.push([k, Math.log10(Math.max(1e-300, Math.abs(w)))]);
      }
      // 그래프 범위를 벗어나면(수렴해 10⁻⁸ 아래, 또는 10³⁰ 위) 그 뒤는 그리지 않는다
      const clampS = (arr) => { const out = []; for (const [x, y] of arr) { out.push([x, Math.max(-8, Math.min(30, y))]); if (y < -8 || y > 30) break; } return out; };
      chart.update({ series: [
        { name: 'off-policy ($s_1\\to s_2$만)', color: 'c2', data: clampS(off) },
        { name: 'off-policy + 타깃 고정', color: 'c5', data: clampS(tg) },
        { name: 'on-policy (두 전이 모두)', color: 'c1', data: clampS(on) },
      ], hlines: [{ y: 0, label: '|w| = 1' }] });
      const innerC = Math.pow(1 - a, C);
      const perCycle = 2 * g * (1 - innerC) + innerC; // 타깃 고정 구간 C 동안 w → 2γ w⁻ 로 다가감
      st.set('off', (1 + a * (2 * g - 1)).toFixed(4));
      st.set('on', ((1 + a * (2 * g - 1)) * (1 - 4 * a)).toFixed(4));
      st.set('tgt', perCycle.toFixed(4));
      st.set('thr', 'γ > 0.5');
    }
    draw();
  }

  /* ---------- Baird ---------- */
  function mountBaird(el) {
    const p = ui.panel(el, { kind: 'SIM', title: 'Baird의 반례: semi-gradient TD vs TDC (기대 업데이트)', caption: '초기값 $w = (1,1,1,1,1,1,10,1)$. 왼쪽은 선택한 방법의 가중치 궤적($w_1$~$w_6$은 대칭이라 항상 같다), 오른쪽은 두 방법의 $\\sqrt{\\overline{\\mathrm{VE}}}$와 $\\sqrt{\\overline{\\mathrm{PBE}}}$($\\log_{10}$).' });
    const ctr = ui.row(p.body);
    const gS = ui.slider(ctr, { label: '할인율 $\\gamma$', min: 0.8, max: 0.99, step: 0.01, value: 0.99, format: ui.fmt.f(2), onInput: draw });
    const aS = ui.slider(ctr, { label: 'TD 스텝 크기 $\\alpha$', min: 0.002, max: 0.03, step: 0.001, value: 0.01, format: ui.fmt.f(3), onInput: draw });
    let which = 'td';
    ui.select(ctr, { label: '가중치를 볼 방법', value: which, options: [{ value: 'td', label: 'semi-gradient TD' }, { value: 'tdc', label: 'TDC (α=0.005, β=0.05)' }], onChange: (v) => { which = v; draw(); } });
    const st = ui.stats(p.body, [
      { key: 'td', label: 'TD: 1000 스윕 후 $\\sqrt{\\mathrm{VE}}$', tone: 'signal' },
      { key: 'tdc', label: 'TDC: 1000 스윕 후 $\\sqrt{\\mathrm{VE}}$', tone: 'accent' },
      { key: 'pbe', label: 'TDC: $\\sqrt{\\mathrm{PBE}}$' },
    ]);
    const split = document.createElement('div');
    split.className = 'w-split';
    const left = document.createElement('div');
    const right = document.createElement('div');
    split.append(left, right);
    p.body.appendChild(split);
    const wChart = plot.line(left, { height: 250, x: { label: '스윕', min: 0, max: 1000 }, y: { label: '가중치 값' }, series: [] });
    const eChart = plot.line(right, { height: 250, x: { label: '스윕', min: 0, max: 1000 }, y: { label: 'log₁₀ 오차' }, series: [] });
    const X = [0, 1, 2, 3, 4, 5, 6].map((s) => {
      const x = new Array(8).fill(0);
      if (s < 6) { x[s] = 2; x[7] = 1; } else { x[6] = 1; x[7] = 2; }
      return x;
    });
    const dot = (a, b) => { let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * b[i]; return s; };
    function run(method, gamma, alpha, beta, steps) {
      const w = [1, 1, 1, 1, 1, 1, 10, 1], v = new Array(8).fill(0);
      const W = [], VE = [], PBE = [];
      for (let t = 0; t <= steps; t++) {
        const vals = X.map((x) => dot(w, x));
        const deltas = vals.map((vs) => gamma * vals[6] - vs); // 목표 정책: 항상 상태 7로
        VE.push([t, Math.log10(Math.max(1e-12, Math.sqrt(sim.mean(vals.map((x) => x * x)))))]);
        PBE.push([t, Math.log10(Math.max(1e-12, Math.sqrt(sim.mean(deltas.map((x) => x * x)))))]);
        if (t % 5 === 0) W.push([t, w[0], w[6], w[7]]);
        if (t === steps) break;
        const dw = new Array(8).fill(0), dv = new Array(8).fill(0);
        for (let s = 0; s < 7; s++) {
          // 상태 s는 균등(1/7). 행동 정책에서 solid 확률 1/7, 중요도 비율 7 → 곱은 1. dashed는 비율 0.
          const x = X[s], d = deltas[s];
          if (method === 'td') for (let i = 0; i < 8; i++) dw[i] += (d * x[i]) / 7;
          else {
            const xv = dot(x, v);
            for (let i = 0; i < 8; i++) { dw[i] += (d * x[i] - gamma * X[6][i] * xv) / 7; dv[i] += ((d - xv) * x[i]) / 7; }
          }
        }
        for (let i = 0; i < 8; i++) { w[i] += alpha * dw[i]; v[i] += beta * dv[i]; }
        if (!Number.isFinite(w[7]) || Math.abs(w[7]) > 1e12) break;
      }
      return { W, VE, PBE };
    }
    function draw() {
      const g = gS.get();
      const td = run('td', g, aS.get(), 0, 1000);
      const tdc = run('tdc', g, 0.005, 0.05, 1000);
      const sel = which === 'td' ? td : tdc;
      wChart.update({ series: [
        { name: 'w₁ (= w₂ … w₆)', color: 'c1', data: sel.W.map((r) => [r[0], r[1]]) },
        { name: 'w₇', color: 'c2', data: sel.W.map((r) => [r[0], r[2]]) },
        { name: 'w₈', color: 'c3', data: sel.W.map((r) => [r[0], r[3]]) },
      ] });
      eChart.update({ series: [
        { name: 'TD √VE', color: 'c2', data: td.VE },
        { name: 'TDC √VE', color: 'c1', data: tdc.VE },
        { name: 'TDC √PBE', color: 'c1', dash: '4 4', data: tdc.PBE },
      ] });
      const last = (arr) => Math.pow(10, arr[arr.length - 1][1]);
      st.set('td', last(td.VE).toExponential(2));
      st.set('tdc', last(tdc.VE).toFixed(3));
      st.set('pbe', last(tdc.PBE).toExponential(2));
    }
    draw();
  }
})();
