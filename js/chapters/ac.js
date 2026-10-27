/* 12 Actor-Critic, A3C, GAE */
(function () {
  const { ui, sim, plot } = RL;

  RL.chapter({
    id: 'ac',
    title: 'Actor-Critic, A3C, GAE',
    subtitle: 'REINFORCE의 분산은 몬테카를로 리턴에서 나온다. 리턴을 학습된 가치(critic)로 부트스트랩하면 분산이 줄고 그만큼 편향이 생긴다. GAE는 이 교환 비율을 λ 하나로 조절한다.',
    time: 40,
    level: '중급 · 핵심',
    prereq: ['pg', 'td'],
    theses: ['T6', 'T3', 'T2'],
    easy: {
      hook: '선수는 행동하고, 코치는 "예상보다 잘했나"만 알려 준다. 둘이 함께 배운다.',
      intro: '<p>앞 장의 방법은 한 판이 끝날 때까지 기다렸다가 총점을 보고 배웠다. 총점에는 운이 많이 섞여 있어서 배움이 들쭉날쭉했다.</p><p>이 장에서는 코치(critic)를 둔다. 코치는 "이 상황이면 보통 몇 점쯤 나온다"를 예상한다. 선수(actor)가 한 걸음 움직이면, 코치는 "방금 받은 점수 + 다음 상황의 예상 점수"를 원래 예상과 비교한다. 그 차이가 <strong>놀람</strong>(TD 오차)이다. 놀람이 양수면 선수는 그 행동을 더 하고, 음수면 덜 한다.</p>',
      analogy: '이번 주 소풍 날을 일기예보로 고르는 상황이다. 내일 날씨만 직접 보고 나머지는 예보를 믿으면(λ = 0) 빠르지만, 예보가 틀리면 같이 틀린다. 일주일을 다 기다려 실제 날씨를 보면(λ = 1) 정확하지만, 그날그날의 변덕이 판단에 모두 섞인다. GAE는 "가까운 날은 실제 날씨를 많이 믿고, 먼 날일수록 예보에 맡기는" 중간 방식이다. λ는 실제 결과를 얼마나 멀리까지 믿을지 정하는 손잡이다.',
      path: ['코치가 되어 점수를 예상하고, 놀람(TD 오차)과 선수의 반응을 직접 본다', '세 걸음짜리 점수로 놀람과 advantage를 손으로 계산한다', 'λ를 바꾸며 흔들림과 치우침이 어떻게 바뀌는지 본다', '여러 선수를 동시에 뛰게 하는 A3C와 그 보정법(V-trace)을 본다'],
      recap: [
        '코치는 "보통 몇 점"을 예상하고, 한 걸음의 실제 결과와 비교한 차이(놀람)를 선수에게 알려 준다.',
        '놀람을 쓰면 총점을 기다릴 때보다 훨씬 덜 흔들리지만, 코치의 예상이 틀린 만큼 치우친다.',
        'λ는 실제 결과를 몇 걸음까지 믿을지 정하는 손잡이이고, 흔들림과 치우침 사이의 균형을 정한다.',
      ],
    },
    goals: [
      'critic의 TD 오차 $\\delta_t$가 advantage의 추정치가 되는 조건을 설명할 수 있다.',
      'GAE를 $n$-step advantage의 지수 가중 평균으로 유도하고, $\\lambda=0$(TD)과 $\\lambda=1$(MC)의 양 끝을 이해한다.',
      'A3C/A2C의 병렬 actor, 엔트로피 보너스, IMPALA의 V-trace가 각각 무슨 문제를 푸는지 설명할 수 있다.',
    ],
    html: String.raw`
<p>정책 경사 알고리즘은 대부분 $\nabla J = \mathbb{E}[\nabla\log\pi(a_t|s_t)\,\Psi_t]$의 $\Psi_t$ 자리에 무엇을 넣느냐로 갈린다(Schulman et al. 2016의 정리 방식). $R(\tau)$, $G_t$, $G_t - b(s_t)$는 <a href="#pg">11장</a>에서 봤다. 이 장에서는 학습된 가치 함수로 만든 $\Psi_t$를 다룬다.</p>

<h2>Critic을 들이는 이유: TD 오차는 advantage의 표본이다</h2>
<p>REINFORCE의 $G_t$에는 에피소드 끝까지의 모든 무작위성(행동, 전이, 보상 잡음)이 담긴다. 한 스텝만 실제로 가 보고 나머지를 가치 추정치로 대신하면 분산이 크게 줄어든다. 가치 추정치를 학습하는 쪽을 critic, 정책을 actor라고 부른다.</p>
<p>아래에서는 독자가 코치가 된다. 예상을 정한 뒤 선수가 뛰면, 놀람이 얼마인지와 선수가 어떻게 반응하는지가 바로 보인다.</p>
<div data-w="try-coach"></div>
<div data-w="dv-td-adv"></div>
<div data-w="fx-ac"></div>
<div class="key"><span class="label">GPI로 보기 (T2)</span>critic은 현재 정책을 <em>평가</em>하고, actor는 그 평가를 따라 정책을 <em>개선</em>한다. 03장의 정책 반복에서 "완전한 평가 후 탐욕적 개선"을 "조금 평가하고 조금 개선"으로 바꾼 것이다. 둘이 함께 움직이므로 critic이 늘 현재 actor를 따라잡고 있어야 한다. 그래서 보통 critic의 학습률을 더 크게 둔다(두 시간척도, Konda & Tsitsiklis 2000).</div>

<h2>n-step advantage에서 GAE로</h2>
<p>한 스텝 TD는 분산이 작지만 critic이 틀리면 편향된다. $n$ 스텝을 실제로 가 보고 부트스트랩하면 그 사이를 조절할 수 있다.</p>
$$\hat A_t^{(n)} = r_{t+1} + \gamma r_{t+2} + \cdots + \gamma^{n-1}r_{t+n} + \gamma^n V(s_{t+n}) - V(s_t)$$
<p>$n$을 하나만 고르지 않고 모든 $n$을 기하 가중 평균하면, 계산이 TD 오차의 할인 합 하나로 줄어든다. 유도에 앞서 세 걸음짜리 예로 직접 계산한다.</p>
<div data-w="step-gae"></div>
<div data-w="dv-gae"></div>
<div class="thesis-box"><span class="label">대전제 T6 · 편향-분산</span>
<p>$\lambda$는 critic을 얼마나 믿을지 정한다. $\lambda=0$이면 $\hat A_t = \delta_t$로 분산이 가장 작지만, critic 오차가 그대로 편향이 된다. $\lambda=1$이면 $\hat A_t = G_t - V(s_t)$이고 $V$는 baseline 역할만 하므로 정책 경사 기준으로 불편이지만, 분산은 REINFORCE만큼 크다. 실전에서는 흔히 0.9~0.97을 기본값으로 쓴다. GAE의 $\gamma$도 같은 역할을 한다. 문제의 할인율과 별개로, 먼 미래 보상의 신용을 깎아 분산을 줄이는 데 쓰인다.</p>
</div>

<h3>GAE 계산기</h3>
<p>사슬 환경(상태 8개, 오른쪽 끝에 +1, 매 스텝 보상에 잡음)에서 궤적 하나를 뽑아 $\delta_t$와 $\hat A_t$를 직접 계산한다. critic은 참 가치에 상태마다 고정된 오차를 더한 것이다. 오른쪽 그래프는 $\hat A_t$에서 각 $\delta_{t+l}$이 받는 가중치 $(\gamma\lambda)^l$이다.</p>
<div data-w="gae-calc"></div>

<h3>λ에 따른 편향과 분산</h3>
<p>같은 사슬에서 시작 상태의 advantage 추정치 $\hat A_0(\lambda)$를 수천 번 뽑아 오차를 분해한다. 기준은 정책 경사에 실제로 필요한 양 $Q^\pi(s_0,a_0) - \hat V(s_0)$이다($\hat V(s_0)$는 baseline이라 경사의 기댓값을 바꾸지 않는다). critic 오차를 키우면 편향 곡선이, 보상 잡음을 키우면 분산 곡선이 올라간다. 그에 따라 총오차(MSE)를 최소로 만드는 $\lambda$도 움직인다.</p>
<div data-w="gae-bv"></div>

<h2>실험: REINFORCE vs Actor-Critic vs GAE(λ)</h2>
<p>4×3 격자(미끄러짐 10%)에서 표 형태 소프트맥스 actor와 표 형태 critic으로 세 방법을 비교한다. 곡선의 각 점은 10 에피소드마다 <strong>현재 정책의 참 가치</strong> $V^{\pi_\theta}(\text{시작})$을 선형 방정식으로 정확히 계산하고, 8회 실행을 평균 낸 값이다. 그래서 샘플 리턴의 잡음이 섞이지 않는다. 보상 잡음 $\sigma$가 0이면 세 방법이 비슷하고, 1에 가까워질수록 부트스트랩하는 쪽이 유리해진다.</p>
<div data-w="ac-race"></div>

<h2>A3C와 A2C: 병렬 actor</h2>
<p>DQN은 리플레이 버퍼로 연속된 샘플 사이의 상관을 깬다(<a href="#dqn">10장</a>). 하지만 on-policy 정책 경사는 예전 정책의 데이터를 쓸 수 없다. Mnih et al.(2016)의 A3C는 여러 환경 사본에서 actor를 동시에 돌리고 서로 다른 경험을 섞어 같은 효과를 얻었다.</p>
<div class="w wide" style="box-shadow:none"><div class="w-body">
<svg viewBox="0 0 640 210" role="img" aria-label="A3C 구조" style="width:100%;max-width:680px">
  <defs><marker id="ac-ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--muted)"/></marker></defs>
  <rect x="210" y="12" width="220" height="48" rx="8" style="fill:var(--accent-soft);stroke:var(--accent)"/>
  <text x="320" y="33" text-anchor="middle" style="fill:var(--ink);font-size:14px;font-weight:600">전역 파라미터 θ, w</text>
  <text x="320" y="50" text-anchor="middle" style="fill:var(--muted);font-size:11px">비동기 갱신 (락 없음, Hogwild 방식)</text>
  <g style="font-size:12px">
    <rect x="20" y="130" width="130" height="62" rx="8" style="fill:var(--surface-2);stroke:var(--line)"/><text x="85" y="152" text-anchor="middle" style="fill:var(--ink)">worker 1</text><text x="85" y="170" text-anchor="middle" style="fill:var(--muted)">환경 사본 · n-step</text>
    <rect x="175" y="130" width="130" height="62" rx="8" style="fill:var(--surface-2);stroke:var(--line)"/><text x="240" y="152" text-anchor="middle" style="fill:var(--ink)">worker 2</text><text x="240" y="170" text-anchor="middle" style="fill:var(--muted)">환경 사본 · n-step</text>
    <rect x="335" y="130" width="130" height="62" rx="8" style="fill:var(--surface-2);stroke:var(--line)"/><text x="400" y="152" text-anchor="middle" style="fill:var(--ink)">worker 3</text><text x="400" y="170" text-anchor="middle" style="fill:var(--muted)">환경 사본 · n-step</text>
    <rect x="490" y="130" width="130" height="62" rx="8" style="fill:var(--surface-2);stroke:var(--line)"/><text x="555" y="152" text-anchor="middle" style="fill:var(--ink)">worker k</text><text x="555" y="170" text-anchor="middle" style="fill:var(--muted)">환경 사본 · n-step</text>
  </g>
  <g style="stroke:var(--signal);stroke-width:1.6;fill:none">
    <path d="M78 128 L250 64" marker-end="url(#ac-ar)"/><path d="M232 128 L290 64" marker-end="url(#ac-ar)"/><path d="M392 128 L348 64" marker-end="url(#ac-ar)"/><path d="M548 128 L388 64" marker-end="url(#ac-ar)"/>
  </g>
  <g style="stroke:var(--accent);stroke-width:1.2;fill:none;stroke-dasharray:4 3">
    <path d="M240 62 L96 128" marker-end="url(#ac-ar)"/><path d="M400 62 L566 128" marker-end="url(#ac-ar)"/>
  </g>
  <text x="8" y="104" style="fill:var(--signal);font-size:11px">경사 ∇ 전송</text>
  <text x="632" y="104" text-anchor="end" style="fill:var(--accent);font-size:11px">파라미터 복사</text>
</svg></div></div>
<p>각 worker의 손실은 세 항의 합이다. $n$-step(보통 5~20) advantage를 쓰고, 정책이 너무 빨리 결정적으로 굳지 않도록 엔트로피 보너스를 더한다.</p>
$$\mathcal{L}(\theta, w) = -\sum_t \log\pi_\theta(a_t|s_t)\,\sg\!\big[\hat A_t\big] \;+\; c_v\sum_t\big(\hat R_t - V_w(s_t)\big)^2 \;-\; c_H\sum_t \mathcal{H}\big(\pi_\theta(\cdot|s_t)\big)$$
<p>$\sg[\cdot]$(stop-gradient)는 advantage를 상수로 다룬다는 뜻이다. 이후 OpenAI의 구현 비교에서 동기식 버전인 A2C(모든 worker의 스텝을 모아 한 번에 갱신)가 A3C와 비슷하거나 더 낫다는 것이 확인되었고, GPU 환경에서는 A2C가 표준이 되었다. 성능을 끌어올린 요인은 비동기성보다 병렬 환경이 주는 배치 다양성이었다.</p>

<h2>Off-policy 보정: IMPALA와 V-trace</h2>
<p>actor 수천 개가 학습기와 따로 돌면(IMPALA, Espeholt et al. 2018) actor가 쓰는 정책 $\mu$는 학습기의 최신 정책 $\pi$보다 몇 스텝 뒤처진다(policy lag). 이 차이를 중요도 비율로 보정하고, 비율의 곱이 폭발하지 않도록 비율을 잘라 낸다.</p>
$$v_s = V(s_s) + \sum_{t\ge s}\gamma^{t-s}\Big(\prod_{i=s}^{t-1}c_i\Big)\rho_t\,\delta_t,\qquad \rho_t = \min\Big(\bar\rho, \frac{\pi(a_t|s_t)}{\mu(a_t|s_t)}\Big),\quad c_i = \min\Big(\bar c, \frac{\pi(a_i|s_i)}{\mu(a_i|s_i)}\Big)$$
<p>$\pi=\mu$이면 비율이 1이 되어 $n$-step TD 타깃으로 돌아간다. $\bar\rho$는 어떤 정책의 가치로 수렴할지를, $\bar c$는 수렴 속도(분산)를 정한다. Retrace(Munos et al. 2016)도 잘린 비율을 곱하는 같은 구조다. 13장의 PPO clip과 21장의 GRPO clip은 중요도 비율을 얼마나 믿을지 정하는 서로 다른 방법이다.</p>

<h2>파생 알고리즘: 무엇이 바뀌었나</h2>
<div class="table-wrap"><table class="t">
<thead><tr><th>알고리즘</th><th>$\Psi_t$ (advantage 추정)</th><th>바뀐 점</th><th>노린 효과</th></tr></thead>
<tbody>
<tr><td>1-step Actor-Critic</td><td>$\delta_t$</td><td>$G_t$ → 부트스트랩</td><td>분산 감소, 온라인 갱신</td></tr>
<tr><td>A3C / A2C (Mnih 2016)</td><td>$n$-step $\hat A^{(n)}$</td><td>병렬 actor, 엔트로피 보너스</td><td>리플레이 없이 상관 제거</td></tr>
<tr><td>GAE (Schulman 2016)</td><td>$\sum_l(\gamma\lambda)^l\delta_{t+l}$</td><td>모든 $n$의 기하 평균</td><td>편향-분산을 λ로 연속 조절</td></tr>
<tr><td>ACER (Wang 2017)</td><td>Retrace 기반 Q</td><td>리플레이 + 잘린 중요도 비율</td><td>표본 효율</td></tr>
<tr><td>IMPALA (Espeholt 2018)</td><td>V-trace</td><td>actor/learner 분리, policy lag 보정</td><td>대규모 분산 학습</td></tr>
<tr><td>PPO <a href="#ppo">13</a></td><td>GAE</td><td>배치 재사용 + 비율 clip</td><td>안정성, 표본 효율</td></tr>
<tr><td>SAC / TD3 <a href="#maxent">14</a></td><td>$Q(s,a)$ 직접</td><td>off-policy critic, 리플레이</td><td>연속 제어 표본 효율</td></tr>
<tr><td>GRPO / RLOO <a href="#reasoning">21</a></td><td>그룹 내 상대 보상</td><td><strong>critic 제거</strong></td><td>LLM에서 메모리 · 안정성</td></tr>
</tbody></table></div>
`,
    mount: {
      'dv-td-adv': (el) => ui.derivation(el, {
        title: 'TD 오차의 조건부 기댓값은 advantage다',
        easy: '코치의 예상이 정확하다면, 놀람을 여러 번 평균 낸 값은 "이 행동이 평소보다 얼마나 나은가"(advantage)와 정확히 같다. 예상이 틀리면 그 틀린 만큼 치우친다.',
        steps: [
          { tex: String.raw`\delta_t = r_{t+1} + \gamma V(s_{t+1}) - V(s_t)`, why: 'critic $V$로 만든 TD 오차다(<a href="#td">06장</a>).' },
          { tex: String.raw`\mathbb{E}\big[\delta_t \mid s_t, a_t\big] = \hl{\mathbb{E}\big[r_{t+1} + \gamma V(s_{t+1}) \mid s_t, a_t\big]} - V(s_t)`, why: '조건이 주어졌으므로 $V(s_t)$는 상수다.' },
          { tex: String.raw`\text{if } V = V^\pi:\quad \mathbb{E}\big[r_{t+1} + \gamma V^\pi(s_{t+1}) \mid s_t,a_t\big] = \hl{Q^\pi(s_t,a_t)}`, why: '$Q^\\pi$를 한 스텝 전개한 식이다(벨만 방정식, <a href="#bellman">02장</a>).' },
          { tex: String.raw`\boxed{\;\mathbb{E}\big[\delta_t \mid s_t,a_t\big] = Q^\pi(s_t,a_t) - V^\pi(s_t) = A^\pi(s_t,a_t)\;}`, why: 'critic이 정확하면 TD 오차는 advantage의 <strong>불편</strong> 표본이다. 정확하지 않으면 $\\gamma\\,\\mathbb{E}[V(s_{t+1}) - V^\\pi(s_{t+1})]$만큼 편향된다.' },
        ],
      }),
      'fx-ac': (el) => ui.formula(el, {
        title: '1-step Actor-Critic 업데이트 해부',
        say: '{d|놀람}은 받은 점수에 {Vn|다음 상황의 예상 점수}를 할인해 더하고 {V|지금 상황의 예상 점수}를 뺀 값이다. 코치는 {cr|놀람만큼 자기 예상을 고치고}, 선수는 {ac|놀람만큼 방금 한 행동의 확률을 올리거나 내린다}.',
        tex: String.raw`\tm{d}{\delta_t} = r_{t+1} + \gamma \tm{Vn}{V_w(s_{t+1})} - \tm{V}{V_w(s_t)},\qquad \tm{cr}{w \leftarrow w + \beta\,\delta_t\,\nabla_w V_w(s_t)},\qquad \tm{ac}{\theta \leftarrow \theta + \alpha\,\delta_t\,\nabla_\theta\log\pi_\theta(a_t|s_t)}`,
        terms: [
          { id: 'd', sym: '\\delta_t', label: 'TD 오차', desc: '"예상보다 얼마나 좋았나"를 나타낸다. 두 업데이트가 함께 쓰는 신호.', long: '스칼라 하나가 critic에게는 회귀 오차로, actor에게는 advantage로 쓰인다. 도파민 신호가 TD 오차와 닮았다는 신경과학의 관찰(Schultz, Dayan, Montague 1997)도 이 구조와 관련이 있다.' },
          { id: 'Vn', sym: 'V_w(s_{t+1})', label: '부트스트랩 값', desc: '다음 상태의 추정 가치. 분산을 줄이지만 편향이 생기는 원인이다.' },
          { id: 'V', sym: 'V_w(s_t)', label: '현재 상태 가치', desc: '여기서는 baseline 역할을 겸한다.' },
          { id: 'cr', sym: 'w \\leftarrow \\cdots', label: 'critic 갱신', desc: 'semi-gradient TD(0). 정책 평가.', long: '타깃 $r + \\gamma V_w(s\')$을 상수로 보고 $V_w(s)$만 미분한다(semi-gradient, 09장). 함수근사를 쓰면 수렴이 보장되지 않는다. 다만 on-policy라서 Deadly Triad의 세 번째 요소(off-policy)는 빠져 있다.' },
          { id: 'ac', sym: '\\theta \\leftarrow \\cdots', label: 'actor 갱신', desc: 'REINFORCE의 G_t 자리에 δ_t를 넣는다. 정책 개선 단계.', long: '매 스텝 온라인으로 갱신할 수 있다는 점도 REINFORCE와 다르다. 에피소드가 끝날 때까지 기다릴 필요가 없어 연속형 과제에도 쓸 수 있다.' },
        ],
      }),
      'dv-gae': (el) => ui.derivation(el, {
        title: 'GAE: n-step advantage의 지수 가중 평균',
        easy: '1걸음, 2걸음, 3걸음… 실제로 보고 나머지는 예상에 맡긴 추정들을 λ의 거듭제곱 비율로 섞는다. 그러면 계산이 "놀람들을 한 걸음마다 γλ씩 깎아 더하기" 하나로 줄어든다.',
        steps: [
          { tex: String.raw`\hat A_t^{(1)} = \delta_t,\quad \hat A_t^{(2)} = \delta_t + \gamma\delta_{t+1},\quad \hat A_t^{(k)} = \sum_{l=0}^{k-1}\gamma^l\delta_{t+l}`, why: '$n$-step advantage를 TD 오차로 쓰면 중간의 $V$ 항이 망원급수처럼 서로 지워진다. 예를 들어 $\\delta_t + \\gamma\\delta_{t+1} = r_{t+1} + \\gamma r_{t+2} + \\gamma^2V(s_{t+2}) - V(s_t)$이다.', easy: '두 걸음 추정 = 첫 놀람 + γ × 둘째 놀람. 가운데 상황의 예상 점수가 한 번은 더해지고 한 번은 빠져서 사라진다. 남는 것은 실제 점수 두 개와 맨 끝 예상, 맨 처음 예상뿐이다.' },
          { tex: String.raw`\hat A_t^{\mathrm{GAE}(\gamma,\lambda)} = (1-\lambda)\big(\hat A^{(1)}_t + \lambda\hat A^{(2)}_t + \lambda^2\hat A^{(3)}_t + \cdots\big)`, why: '모든 $n$을 가중치 $(1-\\lambda)\\lambda^{n-1}$로 평균 낸다(가중치 합 = 1). TD(λ)의 λ-리턴과 같은 구성이다.' },
          { tex: String.raw`= (1-\lambda)\big(\delta_t(1+\lambda+\lambda^2+\cdots) + \gamma\delta_{t+1}(\lambda+\lambda^2+\cdots) + \gamma^2\delta_{t+2}(\lambda^2+\cdots) + \cdots\big)`, why: '같은 $\\delta$끼리 모은다.' },
          { tex: String.raw`= (1-\lambda)\Big(\delta_t\frac{1}{1-\lambda} + \gamma\delta_{t+1}\frac{\lambda}{1-\lambda} + \gamma^2\delta_{t+2}\frac{\lambda^2}{1-\lambda} + \cdots\Big)`, why: '등비급수의 합을 쓴다.' },
          { tex: String.raw`\boxed{\;\hat A_t^{\mathrm{GAE}(\gamma,\lambda)} = \sum_{l=0}^{\infty}(\gamma\lambda)^l\,\delta_{t+l}\;}`, why: '$(1-\\lambda)$가 상쇄되어 TD 오차의 $(\\gamma\\lambda)$-할인 합이 된다. 뒤에서부터 $\\hat A_t = \\delta_t + \\gamma\\lambda\\hat A_{t+1}$로 한 번에 계산한다.' },
          { tex: String.raw`\lambda = 0:\ \hat A_t = \delta_t \qquad\qquad \lambda = 1:\ \hat A_t = \sum_l\gamma^l r_{t+l+1} - V(s_t) = G_t - V(s_t)`, why: '양 끝의 경우다. $\\lambda=1$이면 망원급수가 끝까지 지워져 $V$는 $V(s_t)$ 하나만 남는다(baseline).' },
        ],
      }),
      'try-coach': mountCoach,
      'step-gae': (el) => ui.walkthrough(el, {
        title: '세 걸음으로 계산하는 δ와 GAE',
        caption: '빈칸에 계산한 값을 넣고 "확인"을 누르면 맞았는지 알려 준다. 할인율은 $\\gamma = 0.9$, $\\lambda = 0.5$다.',
        steps: [
          { say: '세 걸음 동안 받은 점수는 1, 0, 2이고 그다음에 끝난다. 코치의 예상은 첫 상황 2, 둘째 1.5, 셋째 1이다(끝난 뒤는 0). 첫 걸음의 놀람 δ₀ = "받은 점수 + 0.9 × 다음 예상 − 지금 예상"은?', ask: { answer: 0.35, tol: 0.005 }, calc: String.raw`\delta_0 = 1 + 0.9\times1.5 - 2 = 0.35` },
          { say: '둘째 걸음의 놀람 δ₁은? 점수 0을 받았고, 다음 상황의 예상은 1이다.', ask: { answer: -0.6, tol: 0.005 }, calc: String.raw`\delta_1 = 0 + 0.9\times1 - 1.5 = -0.6` },
          { say: '셋째 걸음의 놀람 δ₂는? 점수 2를 받고 끝났으니 다음 예상은 0이다.', ask: { answer: 1, tol: 0.005 }, calc: String.raw`\delta_2 = 2 + 0.9\times0 - 1 = 1` },
          { say: 'GAE는 뒤에서부터 "이번 놀람 + γλ × 다음 걸음의 Â"로 모은다. γλ = 0.45다. Â₂ = 1, Â₁ = −0.6 + 0.45 × 1 = −0.15. 그러면 Â₀은?', ask: { answer: 0.2825, tol: 0.005 }, calc: String.raw`\hat A_0 = 0.35 + 0.45\times(-0.15) = 0.2825` },
          { say: '같은 값을 다른 방법으로 볼 수도 있다. "한 걸음만 실제로 본 추정" 0.35, "두 걸음 본 추정" 0.35 + 0.9 × (−0.6) = −0.19, "끝까지 본 추정" 0.62를 0.5 : 0.25 : 0.25로 섞은 것과 같다. λ = 0이면 첫째만(0.35), λ = 1이면 마지막만(0.62) 쓴다.', calc: String.raw`0.5\times0.35 + 0.25\times(-0.19) + 0.25\times0.62 = 0.2825`, note: '끝까지 본 추정 0.62는 실제 총점 $1 + 0.9\\times0 + 0.81\\times2 = 2.62$에서 처음 예상 2를 뺀 값이다.' },
        ],
      }),
      'gae-calc': mountGaeCalc,
      'gae-bv': mountGaeBV,
      'ac-race': mountRace,
    },
    tacit: [
      { tag: 'math', t: 'critic은 "현재" 정책의 가치여야 advantage가 된다',
        d: '<p>$\\mathbb{E}[\\delta|s,a] = A^\\pi$는 $V = V^\\pi$일 때만 성립한다. actor가 바뀌는 동안 critic이 뒤처지면 advantage가 체계적으로 틀린다. 그래서 (1) critic을 더 빠르게 학습하고(두 시간척도), (2) PPO처럼 critic을 여러 epoch 맞추거나, (3) 아예 critic 대신 같은 정책의 샘플 평균을 쓴다(RLOO, GRPO). 실제로는 critic이 정확한지보다, critic이 <em>지금의</em> actor를 평가하고 있는지가 더 자주 문제가 된다.</p>' },
      { tag: 'math', t: 'GAE, TD(λ), λ-리턴은 같은 계산이다',
        d: '<p>$\\hat A^{\\mathrm{GAE}}_t + V(s_t) = G^\\lambda_t$(λ-리턴, 06장)이다. GAE는 TD(λ)를 advantage에 적용한 것이다. PPO 구현에서 value 타깃을 "returns = advantages + values"로 만드는 한 줄이 이 항등식이다. 또 $\\gamma$와 $\\lambda$는 늘 곱 $\\gamma\\lambda$의 꼴로 $\\delta$에 붙으므로, 신용 할당 지평은 대략 $1/(1-\\gamma\\lambda)$이다. $\\gamma=0.99$, $\\lambda=0.95$이면 약 17 스텝이다.</p>' },
      { tag: 'algo', t: '호환 함수 근사: critic이 곧 경사 방향',
        d: '<p>critic을 $Q_w(s,a) = w^\\top\\nabla_\\theta\\log\\pi_\\theta(a|s)$ 꼴(점수함수를 특징으로 쓰는 선형 함수)로 두고 최소제곱으로 맞추면, 그 critic을 써도 정책 경사가 <em>정확히</em> 보존된다(Sutton et al. 2000). 이때의 $w$는 자연 경사 $F^{-1}\\nabla J$와 같다(Kakade 2001; Peters & Schaal의 Natural Actor-Critic). critic 학습을 "경사 방향을 회귀로 구하는 일"로 보면 13장의 TRPO가 쉽게 이해된다.</p>' },
      { tag: 'practice', t: 'actor와 critic이 몸통을 공유하면 서로 방해한다',
        d: '<p>한 네트워크에 policy head와 value head를 붙이면 계산은 절약되지만, value 손실의 스케일이 크면 공유 특징이 가치 예측에 끌려가 정책이 망가진다. 그래서 $c_v$를 0.5 정도로 낮추거나, 보상을 정규화하거나(PopArt, van Hasselt et al. 2016), 아예 분리한다(Phasic Policy Gradient, Cobbe et al. 2021). LLM RLHF에서 value 모델을 별도 네트워크로 두는 것도 같은 이유다. 학습이 이상할 때 가장 먼저 볼 지표는 value의 explained variance $1 - \\Var(G - V)/\\Var(G)$다. 0 근처이거나 음수이면 critic이 baseline 역할도 하지 못한다는 뜻이다.</p>' },
      { tag: 'algo', t: '엔트로피 보너스는 탐험이자 최적화 정규화다',
        d: '<p>소프트맥스 정책 경사는 정책이 결정적으로 굳을수록 경사가 사라진다(11장의 "중력 우물"). 엔트로피 보너스 $c_H\\mathcal{H}(\\pi)$는 이 붕괴를 늦춘다. 수학적으로는 목적함수를 $\\mathbb{E}[r] + c_H\\mathcal{H}$로 바꾸는 것이고, 그 최적해는 볼츠만 분포다(T5, 14장). A3C의 작은 보너스 항을 목적의 일부로 정식화한 것이 SAC의 최대 엔트로피 RL이다. LLM RL에서 "엔트로피 붕괴"가 자주 보고되는 것도 같은 현상이다(21장).</p>' },
      { tag: 'research', t: 'LLM에서 critic이 사라진 이유',
        d: '<p>LLM RLHF의 critic은 정책만큼 큰 모델이라 메모리가 두 배로 들고, 응답 끝의 보상 하나로 토큰별 가치를 학습하기가 어렵다. 그런데 LLM의 "MDP"는 전이가 결정적이고 보상이 끝에 한 번이라 사실상 밴딧이다. 이런 구조에서는 critic의 편향을 감수할 이유가 적다. 2024년 전후에는 같은 프롬프트에서 여러 응답을 뽑아 그 평균을 baseline으로 쓰는 편(RLOO, GRPO)이 낫다는 쪽으로 의견이 모였다. 토큰 단위 신용 할당이 중요한 경우를 위해, critic 대신 중간 지점에서 MC 롤아웃으로 가치를 추정하는 VinePPO(Kazemnejad et al. 2024) 같은 연구도 있다.</p>' },
    ],
    quiz: [
      { q: 'critic이 정확할 때($V=V^\\pi$) $\\mathbb{E}[\\delta_t|s_t,a_t]$는?', options: ['$V^\\pi(s_t)$', '$Q^\\pi(s_t,a_t)$', '$A^\\pi(s_t,a_t)$', '0'], answer: 2,
        explain: '$\\mathbb{E}[r + \\gamma V^\\pi(s\')|s,a] = Q^\\pi(s,a)$이므로 $V^\\pi(s)$를 빼면 advantage가 된다. 상태로만 조건화해 $a$까지 평균 내면 0이 된다.' },
      { q: 'GAE에서 $\\lambda = 1$일 때의 advantage 추정치는?', options: ['$\\delta_t$', '$G_t - V(s_t)$', '$G_t$', '$V(s_{t+1}) - V(s_t)$'], answer: 1,
        explain: '망원급수가 끝까지 지워져 몬테카를로 리턴에서 $V(s_t)$를 뺀 값이 된다. 정책 경사 기준으로 불편이지만 분산이 크다.' },
      { q: 'A3C가 여러 worker를 병렬로 돌린 주된 이유는?', options: ['GPU 활용률', 'on-policy라 리플레이를 못 쓰는 상황에서 샘플 간 상관을 줄이려고', '탐험을 줄이려고', 'critic을 없애려고'], answer: 1,
        explain: '서로 다른 환경 사본의 경험이 섞이면 연속 샘플의 상관이 줄어 학습이 안정된다. 병렬성이 리플레이 버퍼의 역할을 대신한다.' },
      { q: 'V-trace에서 중요도 비율을 $\\bar c$로 자르는 이유는?', options: ['편향을 없애려고', '비율의 곱이 폭발해 분산이 커지는 것을 막으려고', 'on-policy로 만들려고', '보상을 정규화하려고'], answer: 1,
        explain: '여러 스텝의 비율을 곱하면 지수적으로 커지거나 작아진다. 자르면 약간의 편향을 감수하고 분산을 통제한다(T6).' },
    ],
  });

  /* ---------- 사슬 환경 (GAE 위젯 공용) ---------- */
  function makeChain(N, q, gamma) {
    const mu = -0.05;
    const next = (s, a) => (a === 1 ? (s === N - 1 ? -1 : s + 1) : Math.max(0, s - 1));
    const rbar = (s, a) => mu + (a === 1 && s === N - 1 ? 1 : 0);
    let V = new Array(N).fill(0);
    for (let it = 0; it < 2000; it++) {
      const nv = V.slice();
      for (let s = 0; s < N; s++) {
        let v = 0;
        [[1, q], [0, 1 - q]].forEach(([a, p]) => { const s2 = next(s, a); v += p * (rbar(s, a) + (s2 < 0 ? 0 : gamma * V[s2])); });
        nv[s] = v;
      }
      V = nv;
    }
    const Q = (s, a) => { const s2 = next(s, a); return rbar(s, a) + (s2 < 0 ? 0 : gamma * V[s2]); };
    return { N, q, next, rbar, V, Q };
  }
  function criticOf(ch, eta, seed) {
    const zr = sim.rng(seed);
    return ch.V.map((v) => v + eta * zr.normal());
  }
  function chainTraj(ch, Vh, gamma, sigma, r, s0, cap) {
    let s = s0;
    const out = [];
    for (let t = 0; t < cap; t++) {
      const a = r() < ch.q ? 1 : 0;
      const s2 = ch.next(s, a);
      const rew = ch.rbar(s, a) + sigma * r.normal();
      const d = rew + (s2 < 0 ? 0 : gamma * Vh[s2]) - Vh[s];
      out.push({ s, a, rew, s2, d });
      s = s2;
      if (s < 0) break;
    }
    return out;
  }

  function mountGaeCalc(el) {
    const p = ui.panel(el, { kind: 'CALC', title: 'GAE 계산기: 궤적 하나의 $\\delta_t$와 $\\hat A_t$', caption: '"새 궤적 샘플"을 누르면 사슬 위를 한 번 걸은 기록이 나온다. λ 슬라이더를 0에서 1로 옮기면, 파란 막대($\\hat A_t$)가 주황 막대($\\delta_t$)를 얼마나 먼 곳까지 모으는지가 달라진다.' });
    const ctr = ui.row(p.body);
    const gS = ui.slider(ctr, { label: '$\\gamma$', min: 0.8, max: 1, step: 0.01, value: 0.95, format: ui.fmt.f(2), onInput: draw });
    const lS = ui.slider(ctr, { label: '$\\lambda$', min: 0, max: 1, step: 0.05, value: 0.9, format: ui.fmt.f(2), onInput: draw });
    const eS = ui.slider(ctr, { label: 'critic 오차 크기 $\\eta$', min: 0, max: 0.6, step: 0.05, value: 0.2, format: ui.fmt.f(2), onInput: () => { resample(false); } });
    const sS = ui.slider(ctr, { label: '보상 잡음 $\\sigma$', min: 0, max: 0.5, step: 0.05, value: 0.1, format: ui.fmt.f(2), onInput: () => { resample(false); } });
    const btns = ui.row(p.body, 'btns');
    let seed = 3;
    ui.button(btns, '새 궤적 샘플', () => { seed++; resample(true); }, { primary: true });
    const st = ui.stats(p.body, [
      { key: 'T', label: '궤적 길이' },
      { key: 'h', label: '신용 지평 $1/(1-\\gamma\\lambda)$' },
      { key: 'a0', label: '$\\hat A_0$ (현재 λ)', tone: 'accent' },
      { key: 'a00', label: '$\\hat A_0$ (λ=0, TD)' },
      { key: 'a01', label: '$\\hat A_0$ (λ=1, MC)' },
      { key: 'true', label: '참 $Q(s_0,a_0) - \\hat V(s_0)$', tone: 'signal' },
    ]);
    const split = document.createElement('div');
    split.className = 'w-split';
    const left = document.createElement('div');
    const right = document.createElement('div');
    split.append(left, right);
    p.body.appendChild(split);
    const bc = plot.bars(left, { categories: [], series: [], height: 240, y: { label: '값' } });
    const wc = plot.line(right, { height: 240, x: { label: '지연 l', min: 0 }, y: { label: 'δ 가중치', min: 0, max: 1.05 }, series: [] });
    let ch, Vh, traj, gm;
    function resample(newSeed) {
      gm = gS.get();
      ch = makeChain(8, 0.65, gm);
      Vh = criticOf(ch, eS.get(), 101);
      const r = sim.rng(seed);
      traj = chainTraj(ch, Vh, gm, sS.get(), r, 1, 40);
      draw();
    }
    function gae(lam) {
      const A = new Array(traj.length);
      let acc = 0;
      for (let t = traj.length - 1; t >= 0; t--) { acc = traj[t].d + gm * lam * acc; A[t] = acc; }
      return A;
    }
    function draw() {
      if (Math.abs(gS.get() - gm) > 1e-9) { resample(false); return; }
      const lam = lS.get();
      const A = gae(lam);
      const T = traj.length;
      const show = Math.min(T, 24);
      bc.update({
        categories: sim.range(show).map((t) => (t % 2 === 0 ? String(t) : '')),
        series: [
          { name: '보상 $r_{t+1}$', color: 'c6', values: traj.slice(0, show).map((x) => x.rew), opacity: 0.7 },
          { name: 'TD 오차 $\\delta_t$', color: 'c2', values: traj.slice(0, show).map((x) => x.d) },
          { name: '$\\hat A_t$ (GAE)', color: 'c1', values: A.slice(0, show) },
        ],
        xLabel: '시점 t (처음 ' + show + '스텝)',
      });
      const L = 30;
      wc.update({
        x: { label: '지연 l', min: 0, max: L },
        series: [
          { name: '$(\\gamma\\lambda)^l$ (GAE)', color: 'c1', data: sim.range(L + 1).map((l) => [l, Math.pow(gm * lam, l)]), markers: false },
          { name: '$\\gamma^l$ (λ=1, MC)', color: 'c4', dash: '5 4', data: sim.range(L + 1).map((l) => [l, Math.pow(gm, l)]) },
        ],
      });
      st.set('T', T + (T >= 40 ? ' (절단)' : ''));
      st.set('h', (1 / (1 - gm * lam + 1e-9)).toFixed(1));
      st.set('a0', A[0].toFixed(3));
      st.set('a00', gae(0)[0].toFixed(3));
      st.set('a01', gae(1)[0].toFixed(3));
      st.set('true', (ch.Q(1, traj[0].a) - Vh[1]).toFixed(3));
    }
    resample(true);
  }

  function mountGaeBV(el) {
    const p = ui.panel(el, { kind: 'SIM', title: 'λ에 따른 편향² · 분산 · MSE (사슬 환경, 시작 상태)', caption: '슬라이더 세 개를 움직이면 곡선을 바로 다시 계산한다. 초록 곡선(MSE)의 가장 낮은 지점이 가장 좋은 λ이고, 슬라이더에 따라 이 지점이 움직인다.' });
    const ctr = ui.row(p.body);
    const eS = ui.slider(ctr, { label: 'critic 오차 크기 $\\eta$', min: 0, max: 0.8, step: 0.05, value: 0.4, format: ui.fmt.f(2), onInput: run });
    const sS = ui.slider(ctr, { label: '보상 잡음 $\\sigma$', min: 0, max: 0.6, step: 0.05, value: 0.15, format: ui.fmt.f(2), onInput: run });
    const gS = ui.slider(ctr, { label: '$\\gamma$', min: 0.8, max: 0.99, step: 0.01, value: 0.95, format: ui.fmt.f(2), onInput: run });
    const st = ui.stats(p.body, [
      { key: 'best', label: 'MSE 최소 λ', tone: 'accent' },
      { key: 'm0', label: 'MSE (λ=0)' },
      { key: 'm1', label: 'MSE (λ=1)' },
      { key: 'mb', label: 'MSE (최소)', tone: 'signal' },
    ]);
    const c = document.createElement('div');
    p.body.appendChild(c);
    const chart = plot.line(c, { height: 260, x: { label: 'λ', min: 0, max: 1 }, y: { label: '오차 (제곱 단위)', min: 0 }, series: [] });
    function run() {
      const gm = gS.get(), eta = eS.get(), sigma = sS.get();
      const ch = makeChain(8, 0.65, gm);
      const Vh = criticOf(ch, eta, 101);
      const r = sim.rng(5);
      const lams = sim.range(21).map((i) => i / 20);
      const errs = lams.map(() => []);
      const M = 2500;
      for (let m = 0; m < M; m++) {
        const tr = chainTraj(ch, Vh, gm, sigma, r, 1, 150);
        const tgt = ch.Q(1, tr[0].a) - Vh[1];
        lams.forEach((l, k) => {
          let A = 0, w = 1;
          for (let i = 0; i < tr.length; i++) { A += w * tr[i].d; w *= gm * l; if (w < 1e-7) break; }
          errs[k].push(A - tgt);
        });
      }
      const rows = lams.map((l, k) => { const mm = sim.mean(errs[k]); const v = sim.mean(errs[k].map((e) => (e - mm) * (e - mm))); return [l, mm * mm, v, mm * mm + v]; });
      const bi = sim.argmax(rows.map((x) => -x[3]));
      chart.update({
        series: [
          { name: '편향²', color: 'c2', data: rows.map((x) => [x[0], x[1]]) },
          { name: '분산', color: 'c1', data: rows.map((x) => [x[0], x[2]]) },
          { name: 'MSE = 편향² + 분산', color: 'c3', width: 3, data: rows.map((x) => [x[0], x[3]]) },
        ],
        vlines: [{ x: rows[bi][0], label: '최소' }],
      });
      st.set('best', rows[bi][0].toFixed(2));
      st.set('m0', rows[0][3].toFixed(3));
      st.set('m1', rows[20][3].toFixed(3));
      st.set('mb', rows[bi][3].toFixed(3));
    }
    run();
  }

  /* ---------- 학습 비교 ---------- */
  function exactStartValue(env, th, gamma) {
    const n = env.nS, A = [], b = [];
    for (let s = 0; s < n; s++) {
      const row = new Array(n).fill(0);
      row[s] = 1;
      let rr = 0;
      if (!env.cells[s].terminal) {
        const pi = sim.softmax(th[s]);
        for (let a = 0; a < 4; a++) env.P[s][a].forEach((o) => { rr += pi[a] * o.p * o.r; if (!o.done) row[o.s2] -= gamma * pi[a] * o.p; });
      }
      A.push(row); b.push(rr);
    }
    for (let i = 0; i < n; i++) {
      let piv = i;
      for (let k = i + 1; k < n; k++) if (Math.abs(A[k][i]) > Math.abs(A[piv][i])) piv = k;
      [A[i], A[piv]] = [A[piv], A[i]]; [b[i], b[piv]] = [b[piv], b[i]];
      for (let k = i + 1; k < n; k++) {
        const f = A[k][i] / A[i][i];
        if (!f) continue;
        for (let j = i; j < n; j++) A[k][j] -= f * A[i][j];
        b[k] -= f * b[i];
      }
    }
    const x = new Array(n).fill(0);
    for (let i = n - 1; i >= 0; i--) { let v = b[i]; for (let j = i + 1; j < n; j++) v -= A[i][j] * x[j]; x[i] = v / A[i][i]; }
    return x[env.start];
  }

  function trainAC(env, method, o, seed) {
    const r = sim.rng(seed);
    const th = sim.range(env.nS).map(() => [0, 0, 0, 0]);
    const V = new Array(env.nS).fill(0);
    const curve = [];
    for (let e = 0; e < o.E; e++) {
      if (e % 10 === 0) curve.push([e, exactStartValue(env, th, o.gamma)]);
      let s = env.start;
      const traj = [];
      for (let t = 0; t < 150; t++) {
        const pi = sim.softmax(th[s]);
        const a = r.choice(pi);
        const out = env.step(s, a, r);
        const rew = out.r + o.sigma * r.normal();
        if (method === 'ac') {
          const d = rew + (out.done ? 0 : o.gamma * V[out.s2]) - V[s];
          V[s] += o.aC * d;
          for (let b = 0; b < 4; b++) th[s][b] += o.aA * d * ((b === a ? 1 : 0) - pi[b]);
        } else traj.push({ s, a, rew, s2: out.s2, done: out.done });
        s = out.s2;
        if (out.done) break;
      }
      if (method !== 'ac') {
        let G = 0, A = 0;
        for (let t = traj.length - 1; t >= 0; t--) {
          const x = traj[t];
          G = x.rew + o.gamma * G;
          const d = x.rew + (x.done ? 0 : o.gamma * V[x.s2]) - V[x.s];
          A = d + o.gamma * o.lam * A;
          x.G = G; x.A = A; x.tg = A + V[x.s];
        }
        traj.forEach((x) => {
          const pi = sim.softmax(th[x.s]);
          const adv = method === 'rf' ? x.G : x.A;
          for (let b = 0; b < 4; b++) th[x.s][b] += o.aA * adv * ((b === x.a ? 1 : 0) - pi[b]);
        });
        if (method === 'gae') traj.forEach((x) => { V[x.s] += o.aC * (x.tg - V[x.s]); });
      }
    }
    curve.push([o.E, exactStartValue(env, th, o.gamma)]);
    return curve;
  }

  function mountRace(el) {
    const p = ui.panel(el, { kind: 'SIM', title: '같은 환경, 다른 $\\Psi_t$: 학습 속도와 안정성', caption: '"학습 실행"을 누르면 세 방법이 차례로 학습하고 곡선이 하나씩 나타난다. 보상 잡음 $\\sigma$를 0과 1로 바꾸면 최적선에 먼저 닿는 곡선이 달라진다.' });
    const ctr = ui.row(p.body);
    const sS = ui.slider(ctr, { label: '보상 잡음 $\\sigma$ (매 스텝)', min: 0, max: 1, step: 0.1, value: 0.5, format: ui.fmt.f(1) });
    const lS = ui.slider(ctr, { label: 'GAE의 $\\lambda$', min: 0, max: 1, step: 0.05, value: 0.9, format: ui.fmt.f(2) });
    const aS = ui.slider(ctr, { label: 'actor 학습률 $\\alpha$', min: 0.05, max: 0.5, step: 0.05, value: 0.2, format: ui.fmt.f(2) });
    const btns = ui.row(p.body, 'btns');
    let seed = 1;
    const runB = ui.button(btns, '학습 실행 (8회 평균)', () => run(), { primary: true });
    ui.button(btns, '다른 시드로', () => { seed += 8; run(); });
    const status = document.createElement('span');
    status.className = 'w-caption';
    btns.appendChild(status);
    const st = ui.stats(p.body, [
      { key: 'opt', label: '최적 $V^*(\\text{시작})$', tone: 'signal' },
      { key: 'rf', label: 'REINFORCE 최종' },
      { key: 'ac', label: '1-step AC 최종' },
      { key: 'gae', label: 'GAE(λ) 최종', tone: 'accent' },
    ]);
    const c = document.createElement('div');
    p.body.appendChild(c);
    const chart = plot.line(c, { height: 280, x: { label: '에피소드', min: 0 }, y: { label: '현재 정책의 참 가치 V^π(시작)' }, series: [] });
    const env = new sim.GridWorld(sim.layouts.classic, { rewards: { G: 1, X: -1 }, step: -0.04, slip: 0.1 });
    const gamma = 0.95;
    const vstar = env.solve(gamma)[env.start];
    st.set('opt', vstar.toFixed(3));
    const methods = [
      { key: 'rf', name: 'REINFORCE ($G_t$, baseline 없음)', color: 'c4' },
      { key: 'ac', name: '1-step Actor-Critic ($\\delta_t$)', color: 'c3' },
      { key: 'gae', name: 'GAE(λ) Actor-Critic', color: 'c1' },
    ];
    let token = 0;
    function run() {
      const my = ++token;
      const o = { gamma, sigma: sS.get(), lam: lS.get(), aA: aS.get(), aC: 0.2, E: 300 };
      const R = 8;
      const res = {};
      runB.disabled = true;
      status.textContent = '계산 중…';
      let mi = 0;
      function next() {
        if (my !== token) return;
        if (mi >= methods.length) {
          runB.disabled = false;
          status.textContent = '';
          return;
        }
        const m = methods[mi++];
        let acc = null;
        for (let k = 0; k < R; k++) {
          const cv = trainAC(env, m.key, o, seed + k);
          acc = acc ? acc.map((v, i) => [v[0], v[1] + cv[i][1] / R]) : cv.map((v) => [v[0], v[1] / R]);
        }
        res[m.key] = acc;
        st.set(m.key, acc[acc.length - 1][1].toFixed(3));
        chart.update({
          x: { label: '에피소드', min: 0, max: o.E },
          series: methods.filter((mm) => res[mm.key]).map((mm) => ({ name: mm.name, color: mm.color, data: res[mm.key] })),
          hlines: [{ y: vstar, label: '최적', color: 'good' }],
        });
        setTimeout(next, 0);
      }
      next();
    }
    run();
  }
  /* ---------- 코치와 선수 ---------- */
  // 받침 유무에 따라 목적격 조사를 붙인다(슛을, 패스를)
  const withObj = (w) => { const c = w.charCodeAt(w.length - 1); const has = c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 > 0; return w + (has ? '을' : '를'); };
  function mountCoach(el) {
    const p = ui.panel(el, { kind: 'TRY', title: '코치와 선수: 내가 critic이 되어 보기', caption: '슬라이더로 "이 상황이면 보통 몇 점" 예상을 정하고 "선수가 한 번 뛴다"를 누르면 플레이가 한 번 진행된다. 놀람(받은 점수 − 내 예상)이 양수면 선수는 방금 한 행동을 더 하고, 음수면 덜 한다. 막대가 그 변화를 바로 보여 준다.' });
    const ACT = [
      { name: '안전 패스', p: 0.9, pts: 1 },
      { name: '3점 슛', p: 0.4, pts: 3 },
    ];
    const lr = 0.4;
    const r = sim.rng(21);
    let th = 0, plays = 0, hist = [], lines = [];
    const ctr = ui.row(p.body);
    const vS = ui.slider(ctr, { label: '코치의 예상 점수 (critic)', min: 0, max: 3, step: 0.1, value: 0.5, format: ui.fmt.f(1) });
    const learn = ui.checkbox(ctr, { label: '코치도 배운다 (놀람의 20%만큼 예상을 고침)', value: false });
    const btns = ui.row(p.body, 'btns');
    ui.button(btns, '선수가 한 번 뛴다', () => { play(); draw(); }, { primary: true });
    ui.button(btns, '20번 연속', () => { for (let i = 0; i < 20; i++) play(); draw(); });
    ui.button(btns, '처음부터', () => { th = 0; plays = 0; hist = []; lines = []; vS.set(0.5, true); draw(); });
    const msg = document.createElement('div');
    msg.className = 'fx-detail';
    const split = document.createElement('div');
    split.className = 'w-split';
    const left = document.createElement('div');
    const right = document.createElement('div');
    split.append(left, right);
    p.body.append(msg, split);
    const st = ui.stats(right, [
      { key: 'shoot', label: '선수의 3점 슛 확률', tone: 'accent' },
      { key: 'v', label: '코치의 예상', tone: 'signal' },
      { key: 'avg', label: '최근 20번 평균 점수' },
      { key: 'true', label: '실제 평균 점수: 패스 / 슛', value: '0.90 / 1.20' },
    ]);
    const log = document.createElement('div');
    log.className = 'log';
    const tip = document.createElement('p');
    tip.className = 'w-caption';
    tip.innerHTML = '예상을 3으로 올려 두고 몇 번 뛰면, 무엇을 하든 실망(음수 놀람)만 나온다. 선수는 방금 한 행동을 계속 줄이며 오락가락한다. 예상을 1 근처에 두면 놀람의 부호가 행동의 좋고 나쁨을 가려 준다. "코치도 배운다"를 켜면 예상이 평균 점수 쪽으로 저절로 움직인다.';
    right.append(log, tip);
    const bars = plot.bars(left, { categories: ACT.map((a) => a.name), series: [], height: 200, y: { min: 0, max: 1 }, labels: true, labelFmt: (v) => Math.round(v * 100) + '%', legend: false });
    function play() {
      const ps = sim.sigmoid(th);
      const a = r() < ps ? 1 : 0;
      const got = r() < ACT[a].p ? ACT[a].pts : 0;
      const V = vS.get();
      const delta = got - V;
      const before = sim.sigmoid(th);
      th = sim.clamp(th + lr * delta * (a === 1 ? 1 - ps : -ps), -6, 6);
      const after = sim.sigmoid(th);
      if (learn.get()) vS.set(Math.round((V + 0.2 * delta) * 100) / 100, true);
      plays++;
      hist.push(got);
      const chosen = a === 1 ? after : 1 - after, chosenBefore = a === 1 ? before : 1 - before;
      const reaction = delta > 0 ? '더 하기로' : delta < 0 ? '덜 하기로' : '그대로 두기로';
      const signed = (x) => (x >= 0 ? '+' : '−') + Math.abs(x).toFixed(1);
      const text = ACT[a].name + ' → ' + got + '점. 놀람 = ' + got + ' − 예상 ' + V.toFixed(1) + ' = ' + signed(delta) + '. 선수는 ' + withObj(ACT[a].name) + ' ' + reaction + ' 한다(' + Math.round(chosenBefore * 100) + '% → ' + Math.round(chosen * 100) + '%).';
      lines.unshift(plays + '. ' + text);
      lines = lines.slice(0, 6);
      msg.innerHTML = text;
    }
    function draw() {
      const ps = sim.sigmoid(th);
      bars.update({ series: [{ name: '확률', color: 'c1', values: [1 - ps, ps], colors: ['c3', 'c2'] }] });
      st.set('shoot', Math.round(ps * 100) + '%');
      st.set('v', vS.get().toFixed(2));
      const recent = hist.slice(-20);
      st.set('avg', recent.length ? sim.mean(recent).toFixed(2) : '–');
      log.textContent = lines.length ? lines.join('\n') : '아직 뛰지 않았다. 뛸 때마다 기록이 여기에 쌓인다.';
      if (!plays) msg.innerHTML = '선수는 패스와 슛을 반반 확률로 한다. 슛은 성공률이 낮지만 평균 점수가 조금 더 높다.';
    }
    draw();
  }
})();
