/* 20 DPO와 직접 정렬 계열 */
(function () {
  const { ui, sim, plot } = RL;

  RL.chapter({
    id: 'dpo',
    title: 'DPO와 직접 정렬 계열',
    subtitle: 'KL-정규화 목적의 닫힌 해를 거꾸로 풀면 보상이 정책의 로그비로 바뀐다. 그 순간 보상모델과 RL이 사라지고 분류 손실 하나만 남는다.',
    time: 40,
    level: '중급 · LLM',
    prereq: ['rlhf'],
    theses: ['T5', 'T7', 'T3'],
    easy: {
      hook: '채점기를 따로 만들지 않고, 사람이 고른 답 쌍만으로 챗봇을 바로 고치는 방법.',
      intro: '<p>사람이 두 답 중 하나를 골랐다. RLHF는 이 선택으로 먼저 채점기를 만들고, 그 채점기로 챗봇을 연습시켰다. 두 단계다.</p><p>DPO는 한 단계로 끝낸다. 챗봇이 <strong>고른 답은 원래보다 더 자주</strong>, <strong>버린 답은 원래보다 덜 자주</strong> 쓰도록 바로 고친다. "원래보다 몇 배 더 좋아하게 됐나"가 채점기 점수 역할을 대신한다.</p>',
      analogy: '선생님이 답안에 점수를 따로 매기지 않고, 학생이 예전과 비교해 어떤 답을 더 즐겨 쓰게 됐는지만 보는 것과 같다. 원래 10번 중 2번 쓰던 답을 이제 3번 쓴다면 "1.5배 더 좋아하게 됐다". 사람이 고른 답은 더 좋아하게, 버린 답은 덜 좋아하게 되어 두 배율의 차이가 벌어질수록 손실이 줄어든다. 차이만 보기 때문에, 두 답을 모두 덜 쓰게 되더라도 버린 답을 더 많이 줄였다면 손실은 줄어든다.',
      path: [
        '한 쌍의 답에서 "원래보다 몇 배 좋아하게 됐나"를 직접 움직여 손실과 고칠 힘이 어떻게 바뀌는지 본다',
        '작은 숫자로 암묵적 점수, 손실, 고칠 힘을 손으로 계산한다',
        'RLHF의 정답을 거꾸로 읽어 DPO 손실이 나오는 과정을 요지만 본다',
        '답이 6개뿐인 세계에서 DPO가 RLHF와 같은 답에 도달하는지, 언제 어긋나는지 본다',
      ],
      recap: [
        'DPO는 채점기 없이, 사람이 고른 답을 원래보다 더 자주 쓰고 버린 답을 덜 쓰도록 모델을 바로 고친다.',
        '원래 대비 몇 배 더 좋아하게 됐는지가 숨은 점수이고, 두 답의 숨은 점수 차이가 클수록 손실이 작다.',
        '데이터가 적거나 선택이 언제나 한쪽으로만 정해져 있으면 지나치게 한 답으로 몰릴 수 있어, 여러 변형이 이를 막는다.',
      ],
    },
    goals: [
      'RLHF 목적의 닫힌 해에서 DPO 손실까지를 분배함수 $Z(x)$가 소거되는 과정까지 포함해 유도할 수 있다.',
      'DPO 기울기의 가중치 $\\sigma(\\hat r_l - \\hat r_w)$가 무엇을 하는지, 왜 선택된 응답의 확률도 내려갈 수 있는지 설명할 수 있다.',
      '결정적 선호에서 DPO의 KL 정규화가 무력해지는 이유(Azar et al. 2023)와 IPO · 라벨 스무딩의 처방을 시뮬레이터로 확인한다.',
      'IPO, KTO, ORPO, SimPO, 온라인 DPO가 DPO의 어느 가정을 바꿨는지 분류할 수 있다.',
    ],
    html: String.raw`
<p>RLHF(<a href="#rlhf">19장</a>)는 보상모델을 학습하고, 그 보상으로 PPO를 돌린다. 모델 네 개, 샘플링 루프, 불안정한 하이퍼파라미터가 따라온다. Rafailov et al.(2023)의 <strong>DPO(Direct Preference Optimization)</strong>는 이렇게 묻는다. KL-정규화 목적의 최적 정책을 우리가 이미 닫힌 형태로 알고 있다면(T5), 보상을 정책으로 표현해 버리면 되지 않는가? 논문의 부제가 요점이다. "Your Language Model is Secretly a Reward Model."</p>

<h2>먼저 손으로: 한 쌍의 답</h2>
<p>수식보다 먼저 한 쌍으로 감을 잡자. 질문 하나에 사람이 고른 답과 버린 답이 있다. 슬라이더로 모델이 두 답을 원래보다 몇 배 더 (또는 덜) 쓰게 됐는지 정하면, 손실과 "아직 고칠 힘"이 바로 바뀐다.</p>
<div data-w="try-pair"></div>
<div data-w="step-dpo"></div>

<h2>유도: 닫힌 해를 뒤집기</h2>
<div data-w="dv-dpo"></div>
<div class="thesis-box"><span class="label">대전제 T5 · KL-정규화 해의 역이용</span>
<p>$\pi^* \propto \pi_{\text{ref}}\,e^{r/\beta}$는 보상에서 정책으로 가는 지도다. 이 지도는 프롬프트별 상수를 빼면 <strong>일대일</strong>이므로 거꾸로 정책에서 보상으로 갈 수 있다: $r = \beta\log\frac{\pi}{\pi_{\text{ref}}} + \beta\log Z$. Bradley–Terry는 같은 프롬프트 안의 보상 <em>차이</em>만 보므로 다루기 어려운 $\log Z(x)$가 사라진다. DPO는 "보상모델 공간에서의 최대우도"를 "정책 공간에서의 최대우도"로 바꾼 것이다. 최적화 대상만 바꿨을 뿐 목적은 RLHF와 같다.</p>
</div>

<h2>DPO 손실 해부</h2>
<div data-w="fx-dpo"></div>
<p>여기서 $\hat r_\theta(x,y) = \beta\log\frac{\pi_\theta(y|x)}{\pi_{\text{ref}}(y|x)}$를 <strong>암묵적 보상(implicit reward)</strong>이라 부른다. 학습이 끝나면 정책 하나가 생성기이자 보상모델이다.</p>

<h3>기울기가 하는 일</h3>
$$\nabla_\theta\mathcal{L}_{\text{DPO}} = -\beta\,\mathbb{E}\Big[\underbrace{\sigma\big(\hat r_\theta(x,y_l) - \hat r_\theta(x,y_w)\big)}_{\text{틀리게 순위 매긴 정도}}\Big(\underbrace{\nabla_\theta\log\pi_\theta(y_w|x)}_{\text{선택 응답 올리기}} - \underbrace{\nabla_\theta\log\pi_\theta(y_l|x)}_{\text{거절 응답 내리기}}\Big)\Big]$$
<ul>
  <li><strong>가중치</strong> $\sigma(\hat r_l - \hat r_w)$: 암묵적 보상이 순위를 틀리게 매긴 쌍일수록 크다. 이미 잘 구분한 쌍은 거의 무시한다. 논문은 이 가중치를 빼면(단순 unlikelihood) 모델이 퇴화한다고 보고했다.</li>
  <li><strong>방향</strong>: 선택 응답의 로그확률을 올리고 거절 응답의 로그확률을 내린다. 그러나 손실은 둘의 <em>차이</em>만 본다. 차이가 벌어지기만 하면 둘 다 내려가도 손실은 줄어든다.</li>
</ul>
<div data-w="loss-calc"></div>

<h2>시뮬레이터: 응답 6개짜리 세계의 DPO</h2>
<p>프롬프트 하나에 가능한 응답이 A~F 여섯 개뿐인 세계를 만들었다. 각 응답의 참 보상 $r$과 기준 정책 $\pi_{\text{ref}}$가 주어지고, 비교 쌍은 $\pi_{\text{ref}}$에서 뽑는다. 정책은 응답별 로짓 $\theta$를 갖는 표 형태다. 같은 $\beta$에서 RLHF의 정답 $\pi^* = \pi_{\text{ref}}e^{r/\beta}/Z$와 DPO 결과를 비교하라.</p>
<div data-w="dpo-sim"></div>
<ul>
  <li><strong>확률적 라벨, 데이터 충분</strong>: DPO가 $\pi^*$에 거의 정확히 수렴한다. 유도가 말하는 그대로다.</li>
  <li><strong>결정적 라벨</strong>: 항상 보상이 높은 쪽이 이기면 BT의 최대우도 해는 점수 차이가 무한대다. $\beta$가 무엇이든 정책은 최고 응답 하나로 붕괴한다. KL 정규화가 사라진 셈이다. IPO나 라벨 스무딩을 고르면 유한한 해에 멈춘다.</li>
  <li><strong>선택 응답의 확률도 내려간다</strong>: "선택 응답 로그비 변화"가 대개 음수다. 중간 품질 응답은 어떤 쌍에서는 이기고 어떤 쌍에서는 진다. 손실은 차이만 보므로 이 응답들의 확률이 함께 내려갈 수 있다. 실제 LLM에서도 관찰되며(Pal et al. 2024의 DPOP, Razin et al. 2024의 likelihood displacement), 이 장난감에서는 정답 $\pi^*$로 가는 길에서도 일어난다는 점이 중요하다. 그 자체로 버그는 아니다.</li>
  <li><strong>데이터가 적을 때</strong>: 쌍 수를 30 정도로 줄이면 표본 몇 개에 과적합해 $\pi^*$에서 멀어진다. 보상모델 없이도 "보상모델 과적합"이 그대로 생긴다.</li>
</ul>

<h2>파생: 무엇이 바뀌었나</h2>
<div class="table-wrap"><table class="t">
<thead><tr><th>방법</th><th>손실 (요지)</th><th>DPO에서 바꾼 가정</th></tr></thead>
<tbody>
<tr><td>IPO / ΨPO<br>Azar et al. 2023</td><td>$\big(h_\theta - \tfrac{1}{2\tau}\big)^2$, $h_\theta$ = 로그비 차이</td><td>BT의 로그 링크 대신 선호확률을 직접 회귀. 결정적 선호에서도 유한한 목표 간격을 가진다.</td></tr>
<tr><td>cDPO / 라벨 스무딩<br>Mitchell 2023 노트</td><td>$-(1-\epsilon)\log\sigma(\beta h) - \epsilon\log\sigma(-\beta h)$</td><td>라벨이 확률 $\epsilon$로 뒤집혀 있다고 가정. 최적 간격이 $\tfrac{1}{\beta}\log\tfrac{1-\epsilon}{\epsilon}$로 유한.</td></tr>
<tr><td>KTO<br>Ethayarajh et al. 2024</td><td>좋음/나쁨 단일 라벨, 기준점 대비 가치 함수</td><td>쌍 비교가 필요 없다. 전망 이론식 손실과 KL 기반 기준점을 사용.</td></tr>
<tr><td>ORPO<br>Hong et al. 2024</td><td>SFT 손실 + 오즈비 항 $\log\sigma\big(\log\tfrac{\text{odds}_\theta(y_w)}{\text{odds}_\theta(y_l)}\big)$</td><td>기준 모델 제거. SFT와 선호 학습을 한 단계로 합친다.</td></tr>
<tr><td>SimPO<br>Meng et al. 2024</td><td>$-\log\sigma\big(\tfrac{\beta}{|y_w|}\log\pi_\theta(y_w) - \tfrac{\beta}{|y_l|}\log\pi_\theta(y_l) - \gamma\big)$</td><td>기준 모델 제거, 길이로 나눈 평균 로그확률을 보상으로, 목표 마진 $\gamma$ 추가.</td></tr>
<tr><td>R-DPO<br>Park et al. 2024</td><td>DPO + 길이 차이 정규화</td><td>길이와 품질의 얽힘을 명시적으로 분리.</td></tr>
<tr><td>RSO<br>Liu et al. 2023</td><td>DPO/hinge 손실, 데이터는 추정된 $\pi^*$에서 거절 샘플링</td><td>"선호 쌍이 어느 분포에서 왔는가"를 바꿈. 최적 정책 근처의 쌍을 쓴다.</td></tr>
<tr><td>온라인 · 반복 DPO<br>Xiong et al. 2023, Guo et al. 2024 (OAIF), Yuan et al. 2024 (Self-Rewarding)</td><td>DPO 손실 그대로</td><td>매 라운드 현재 정책에서 새 쌍을 뽑아 라벨(사람, RM, LLM 판정)을 다시 받는다. 오프라인 → 온라인.</td></tr>
</tbody></table></div>

<h2>오프라인 데이터라는 진짜 차이</h2>
<p>DPO와 PPO 기반 RLHF는 <em>목적</em>이 같다. 갈리는 지점은 <strong>데이터가 어디서 오는가</strong>다. PPO는 현재 정책이 생성한 응답을 RM으로 채점하며 배운다(온라인). 표준 DPO는 고정된 선호 데이터셋으로만 배운다(오프라인). 그래서 DPO는 <a href="#offline">15장</a>의 오프라인 RL과 같은 위험을 가진다.</p>
<div class="grid2">
  <div class="card"><h4>암묵적 보상은 데이터 support 밖에서 검증되지 않는다</h4><p>DPO는 데이터에 있는 쌍의 로그비 차이만 제약한다. 정책이 생성하는 새 응답에서 암묵적 보상이 맞는지는 누구도 확인하지 않는다. Xu et al.(2024)은 DPO가 분포 밖 응답에 확률을 주는 해를 찾을 수 있다고 분석했다.</p></div>
  <div class="card"><h4>처방은 온라인화다</h4><p>현재 정책에서 응답을 뽑아 새로 라벨을 받으면 분포 이동이 줄어든다. 온라인·반복 DPO, on-policy 샘플을 쓰는 것이 유리하다는 실험적 보고(Tajwar et al. 2024)가 이 방향이다. 결국 "온라인이냐"가 "RL이냐"보다 더 중요한 축이라는 것이 현재의 대체적 이해다.</p></div>
</div>

<h2>토큰 단위로 보면: DPO는 Q-함수를 배운다</h2>
<p>응답 전체의 로그비는 토큰별 로그비의 합이다.</p>
$$\beta\log\frac{\pi_\theta(y|x)}{\pi_{\text{ref}}(y|x)} = \sum_{t=1}^{T}\beta\log\frac{\pi_\theta(y_t\mid x, y_{\lt t})}{\pi_{\text{ref}}(y_t\mid x, y_{\lt t})}$$
<p>Rafailov et al.(2024, <em>From r to Q*</em>)은 결정적 전이를 갖는 토큰 MDP에서 최대 엔트로피 RL의 최적 해가 $\beta\log\frac{\pi^*}{\pi_{\text{ref}}}(y_t|s_t) = Q^*(s_t,y_t) - V^*(s_t)$, 즉 <strong>soft advantage</strong>를 만족한다는 점을 이용해, DPO로 학습한 정책의 토큰별 로그비가 토큰 단위 신용 할당 신호로 해석될 수 있음을 보였다. <a href="#qviews">08장</a>의 soft Q, <a href="#llm-mdp">18장</a>의 토큰 MDP와 같은 이야기다. 시퀀스 수준의 선호 학습이 토큰 수준의 가치 함수를 암묵적으로 학습한다.</p>
`,
    mount: {
      'dv-dpo': (el) => ui.derivation(el, {
        title: 'RLHF 목적 → 닫힌 해 → 보상 재매개화 → DPO 손실',
        easy: 'RLHF의 정답은 "원래 확률에, 점수가 높은 답일수록 큰 가중치를 곱한 것"이다. 이 관계를 거꾸로 읽으면 점수는 "원래보다 몇 배 더 좋아하게 됐나"로 표현되고, 질문마다 붙는 상수는 두 답의 점수를 빼는 순간 사라지므로, 채점기 없이 모델 확률만으로 선호를 맞추는 손실을 바로 쓸 수 있다.',
        caption: '"다음 단계"를 눌러 한 줄씩 열어 보라. 노란 표시가 그 줄에서 바뀐 부분이다. 프롬프트 $x$를 하나 고정하고 그 위의 응답 분포 $\\pi(\\cdot|x)$에 대해 푼다. 표기를 줄이려고 $\\pi(y) = \\pi(y|x)$로 쓴다.',
        steps: [
          { tex: String.raw`\max_{\pi}\; \mathbb{E}_{y\sim\pi}\big[r(x,y)\big] - \beta\,\mathrm{KL}\big(\pi\,\|\,\pi_{\text{ref}}\big)`, why: 'RLHF의 KL-정규화 목적(19장). 정책 공간 전체에서 최적화한다고 가정한다.' },
          { tex: String.raw`= -\beta\,\mathbb{E}_{y\sim\pi}\Big[\log\frac{\pi(y)}{\pi_{\text{ref}}(y)} - \frac{r(x,y)}{\beta}\Big]`, why: 'KL을 기댓값으로 풀어 쓰고 $-\\beta$로 묶는다.' },
          { tex: String.raw`= -\beta\,\mathbb{E}_{y\sim\pi}\Big[\log\frac{\pi(y)}{\hl{\tfrac{1}{Z(x)}\pi_{\text{ref}}(y)\,e^{r(x,y)/\beta}}}\Big] + \hl{\beta\log Z(x)},\quad Z(x) = \sum_y \pi_{\text{ref}}(y)e^{r(x,y)/\beta}`, why: '$\\log Z(x)$를 더하고 뺀다. 분모가 확률분포가 되도록 정규화한 것이다.' },
          { tex: String.raw`= -\beta\,\mathrm{KL}\big(\pi\,\|\,\pi^*\big) + \beta\log Z(x), \qquad \hl{\pi^*(y) = \tfrac{1}{Z(x)}\pi_{\text{ref}}(y)e^{r(x,y)/\beta}}`, easy: '정답 정책은 원래 확률에 "점수가 높을수록 커지는 가중치"를 곱한 것이다. 점수가 1 오를 때마다 가중치가 일정한 배수로 커진다.', why: 'KL은 0 이상이고 $\\pi=\\pi^*$일 때만 0이다(깁스 부등식). 따라서 최적 정책은 유일하게 $\\pi^*$. 이것이 대전제 T5.' },
          { tex: String.raw`r(x,y) = \beta\log\frac{\pi^*(y)}{\pi_{\text{ref}}(y)} + \hl{\beta\log Z(x)}`, easy: '거꾸로 말하면, 정답 정책이 어떤 답을 원래보다 몇 배 더 좋아하는지만 알면 그 답의 점수를 알 수 있다. 질문마다 같은 상수가 하나 붙을 뿐이다.', why: '양변에 로그를 취해 보상에 대해 푼다. 보상이 최적 정책과 기준 정책의 로그비로 표현된다. 남은 $\\beta\\log Z(x)$는 프롬프트에만 의존한다.' },
          { tex: String.raw`\Pr(y_w\succ y_l) = \sigma\big(r(x,y_w) - r(x,y_l)\big) = \sigma\Big(\beta\log\frac{\pi^*(y_w)}{\pi_{\text{ref}}(y_w)} - \beta\log\frac{\pi^*(y_l)}{\pi_{\text{ref}}(y_l)}\Big)`, easy: '사람의 선택은 두 답의 점수 차이만 본다. 차이를 구하는 순간 질문마다 붙던 상수가 서로 빼져 없어진다. 계산할 수 없던 부분이 사라지는 핵심 단계다.', why: 'Bradley–Terry에 대입하면 $\\beta\\log Z(x)$가 <strong>차이에서 소거</strong>된다. 계산 불가능한 분배함수가 사라지는 핵심 단계.' },
          { tex: String.raw`\mathcal{L}_{\text{DPO}}(\theta) = -\,\mathbb{E}_{(x,y_w,y_l)\sim\mathcal{D}}\Big[\log\sigma\Big(\beta\log\frac{\hl{\pi_\theta}(y_w|x)}{\pi_{\text{ref}}(y_w|x)} - \beta\log\frac{\hl{\pi_\theta}(y_l|x)}{\pi_{\text{ref}}(y_l|x)}\Big)\Big]`, easy: '이제 정답 정책 자리에 학습 중인 모델을 넣고, 사람이 고른 쪽이 이길 확률이 높아지도록 학습한다. 채점기를 학습할 때와 똑같은 모양의 문제다.', why: '$\\pi^*$ 자리에 학습할 정책 $\\pi_\\theta$를 놓고 선호 데이터의 음의 로그우도를 최소화한다. 보상모델 손실과 똑같은 형태의 이진 분류이며, 정책을 샘플링할 필요가 없다.' },
          { tex: String.raw`\nabla_\theta\mathcal{L}_{\text{DPO}} = -\beta\,\mathbb{E}\Big[\hl{\sigma\big(\hat r_\theta(y_l) - \hat r_\theta(y_w)\big)}\big(\nabla_\theta\log\pi_\theta(y_w) - \nabla_\theta\log\pi_\theta(y_l)\big)\Big],\quad \hat r_\theta = \beta\log\frac{\pi_\theta}{\pi_{\text{ref}}}`, easy: '순위를 이미 잘 맞힌 쌍은 거의 고치지 않고, 순위를 틀리게 보고 있는 쌍을 세게 고친다.', why: '$\\frac{d}{dz}\\log\\sigma(z) = \\sigma(-z)$를 쓰면 기울기는 "틀린 정도"로 가중된 로그우도 차이의 경사다. $\\pi_{\\text{ref}}$ 항은 상수라 미분에서 사라진다.' },
        ],
      }),
      'fx-dpo': (el) => ui.formula(el, {
        title: 'DPO 손실',
        say: '{data|사람이 고른 답과 버린 답의 쌍마다}, 모델이 {cw|고른 답을 원래보다 얼마나 더 좋아하게 됐는지}에서 {cl|버린 답을 원래보다 얼마나 더 좋아하게 됐는지}를 빼고 {beta|정해 둔 배율}을 곱한다. 이 차이가 클수록 {lsig|손실이 작아진다}.',
        tex: String.raw`\mathcal{L}_{\text{DPO}} = -\,\tm{data}{\mathbb{E}_{(x,y_w,y_l)\sim\mathcal{D}}}\Big[\tm{lsig}{\log\sigma}\Big(\tm{beta}{\beta}\,\tm{cw}{\log\frac{\pi_\theta(y_w|x)}{\pi_{\text{ref}}(y_w|x)}} - \beta\,\tm{cl}{\log\frac{\pi_\theta(y_l|x)}{\pi_{\text{ref}}(y_l|x)}}\Big)\Big]`,
        terms: [
          { id: 'data', sym: '\\mathcal{D}', label: '고정된 선호 데이터', desc: '오프라인. 정책이 직접 생성하지 않는다.', long: '데이터가 어떤 정책에서 생성됐는지가 결과를 크게 좌우한다. 유도는 $y_w, y_l$이 어디서 왔는지 가정하지 않지만, 데이터 support 밖에서 암묵적 보상은 검증되지 않는다(15장의 분포 이동).' },
          { id: 'lsig', sym: '\\log\\sigma', label: 'BT 로그우도', desc: '보상모델 손실과 같은 이진 로지스틱 손실.', long: '손실은 인자가 $+\\infty$일 때만 0이 된다. 결정적 선호나 작은 데이터에서는 로그비 차이를 끝없이 벌리려 한다. IPO와 라벨 스무딩은 이 지점을 고친다.' },
          { id: 'beta', sym: '\\beta', label: 'KL 강도 = 온도', desc: '닫힌 해의 β. 작을수록 기준 모델에서 멀리 간다.', long: '$\\beta$는 (1) 암묵적 목적의 KL 계수이고, (2) 로지스틱 함수의 기울기 척도다. 같은 로그비 차이 $h$에 대해 손실은 $-\\log\\sigma(\\beta h)$이므로 $\\beta$가 작으면 같은 선호를 표현하려고 더 큰 $h$, 즉 더 큰 정책 이동이 필요하다.' },
          { id: 'cw', sym: '\\log\\frac{\\pi_\\theta(y_w)}{\\pi_{\\text{ref}}(y_w)}', label: '선택 응답 로그비', desc: 'β를 곱하면 선택 응답의 암묵적 보상.' },
          { id: 'cl', sym: '\\log\\frac{\\pi_\\theta(y_l)}{\\pi_{\\text{ref}}(y_l)}', label: '거절 응답 로그비', desc: 'β를 곱하면 거절 응답의 암묵적 보상.', long: '두 로그비는 공유 접두어의 토큰에서 정확히 상쇄된다. 선택과 거절 응답이 앞부분을 공유하면, 학습 신호는 갈라지는 지점 이후의 토큰에서만 나온다.' },
        ],
      }),
      'try-pair': mountPair,
      'step-dpo': (el) => ui.walkthrough(el, {
        title: '한 쌍의 DPO 손실을 숫자로',
        caption: '"다음 단계"를 누르며 빈칸을 채워 보라. 자연로그 값은 문제에 적어 두었다.',
        steps: [
          { say: '원래 모델은 고른 답을 0.20, 버린 답을 0.30의 확률로 썼다. 학습 후 새 모델은 고른 답을 0.30, 버린 답을 0.20으로 쓴다. 고른 답을 원래보다 몇 배 더 쓰게 됐나?', ask: { answer: 1.5, tol: 0.01 }, calc: String.raw`\frac{\pi_\theta(y_w)}{\pi_{\text{ref}}(y_w)} = \frac{0.30}{0.20} = 1.5` },
          { say: '$\\log 1.5 \\approx 0.405$다. $\\beta = 0.5$일 때 고른 답의 암묵적 점수 $\\beta \\log(\\text{새}/\\text{원래})$는?', ask: { answer: 0.203, tol: 0.005 }, calc: String.raw`\hat r_w = 0.5 \times \log 1.5 \approx 0.5 \times 0.405 \approx 0.203` },
          { say: '버린 답은 0.30에서 0.20으로 줄었다. 비율은 약 0.667이고 $\\log 0.667 \\approx -0.405$다. 버린 답의 암묵적 점수는?', ask: { answer: -0.203, tol: 0.005 }, calc: String.raw`\hat r_l = 0.5 \times \log \tfrac{0.20}{0.30} \approx -0.203` },
          { say: '두 점수의 차이(고른 답 − 버린 답)는?', ask: { answer: 0.405, tol: 0.006 }, calc: String.raw`\hat r_w - \hat r_l \approx 0.203 - (-0.203) = 0.405` },
          { say: '모델이 "고른 답이 낫다"고 볼 확률은 $\\sigma(0.405) = 0.6$이다. 이 쌍의 손실 $-\\log 0.6$은?', ask: { answer: 0.511, tol: 0.01 }, calc: String.raw`\mathcal{L} = -\log\sigma(0.405) = -\log 0.6 \approx 0.511`, note: '학습 전에는 두 확률이 원래와 같아 차이가 0이었다. 그때 확률은 0.5, 손실은 $-\\log 0.5 \\approx 0.693$이었다. 손실이 0.693에서 0.511로 줄었다.' },
          { say: '고칠 힘(기울기 가중치)은 $\\sigma(\\hat r_l - \\hat r_w) = 1 - 0.6$이다. 몇인가?', ask: { answer: 0.4, tol: 0.01 }, calc: String.raw`\sigma(-0.405) = 0.4`, note: '학습 전에는 0.5였다. 순위를 맞혀 갈수록 이 값이 0에 가까워지며 그 쌍을 덜 고친다. 다만 0이 되려면 차이가 끝없이 커져야 한다. 여기서 과적합 문제가 생긴다.' },
        ],
      }),
      'loss-calc': mountLossCalc,
      'dpo-sim': mountDPOSim,
    },
    tacit: [
      { tag: 'math', t: '$Z(x)$가 사라지는 건 운이 아니라 BT의 성질이다',
        d: '<p>분배함수는 프롬프트에만 의존하므로, 같은 프롬프트 안의 <em>차이</em>만 보는 선호 모형이면 어떤 것이든 소거된다. 순위 전체를 쓰는 Plackett–Luce도 마찬가지라 DPO 논문은 이 일반화를 함께 제시했다. 반대로 단일 응답의 절대 점수에 대한 손실(예: "이 응답은 좋다" 회귀)로 가면 $Z(x)$가 살아난다. KTO가 KL 추정치로 기준점을 따로 잡는 이유가 이것이다.</p>' },
      { tag: 'math', t: '결정적 선호는 KL 정규화를 지운다',
        d: '<p>최대우도는 데이터를 완벽히 분리할 수 있으면 파라미터를 무한대로 보낸다(분리 가능한 로지스틱 회귀). 선호가 결정적이면 BT의 MLE 보상 차이가 무한대이고, $\\pi^* \\propto \\pi_{\\text{ref}}e^{r/\\beta}$에서 $r$이 무한대면 $\\beta$와 무관하게 붕괴한다. Azar et al.(2023)의 지적이다. 사람 라벨 데이터셋의 대부분은 쌍마다 라벨이 하나뿐이라 사실상 결정적이다. 실전에서 라벨 스무딩, 짧은 학습, 조기 종료가 중요한 이유다.</p>' },
      { tag: 'algo', t: '공유 접두어는 기울기에서 정확히 상쇄된다',
        d: '<p>$y_w$와 $y_l$이 앞의 $k$개 토큰을 공유하면 그 토큰들의 $\\log\\pi_\\theta$와 $\\log\\pi_{\\text{ref}}$가 두 항에서 똑같이 나와 로그비 차이에서 사라진다. 그래서 DPO는 "어디서 갈라졌는가"에서만 배운다. 갈라지는 지점을 인위적으로 만든 쌍(같은 풀이에서 한 단계만 다른 쌍)을 쓰면 단계 수준의 신용 할당을 얻는다. 단계별 DPO류 방법들이 이 성질을 이용한다.</p>' },
      { tag: 'practice', t: '선택 응답 로그확률이 내려간다고 놀라지 말 것, 다만 지켜볼 것',
        d: '<p>손실은 차이만 본다. 중간 품질 응답이 이기기도 하고 지기도 하면 그 확률이 함께 내려가고, 위 장난감처럼 정답 해로 가는 경로에서도 선택 응답 평균 로그비가 음수가 된다. 문제는 그 질량이 어디로 가느냐다. 표 형태 장난감에서는 보상이 높은 응답으로 가지만, 큰 LM에서는 데이터에 없는 응답으로 갈 수 있다. 그래서 선택 응답의 로그확률을 아래로 못 가게 붙잡는 DPOP(Pal et al. 2024) 같은 항이나 SFT 손실 혼합이 쓰인다.</p>' },
      { tag: 'research', t: '"DPO vs PPO"의 진짜 축은 오프라인 vs 온라인이다',
        d: '<p>둘은 같은 KL-정규화 목적의 다른 최적화기다. 성능 차이는 대부분 (1) 데이터가 현재 정책에서 왔는가, (2) 보상 신호가 학습 중에 새 응답에서 질의되는가에서 나온다. 새 정렬 기법을 볼 때 손실 모양보다 먼저 "응답은 누가 생성하고, 라벨은 언제 붙는가"를 확인하라. 온라인 DPO가 PPO와의 격차를 상당 부분 줄인다는 보고들이 이 관점을 지지한다.</p>' },
      { tag: 'practice', t: '시퀀스 로그확률은 길이에 비례해 커진다',
        d: '<p>$\\log\\pi(y) = \\sum_t \\log\\pi(y_t|\\cdot)$는 토큰 수에 따라 크기가 커지므로, 긴 응답의 로그비는 절대값이 커지기 쉽다. 사람 선호 데이터에 "긴 답이 이긴다"는 상관이 있으면 DPO는 길이를 늘리는 쉬운 방향을 찾는다. SimPO의 길이 정규화, R-DPO의 길이 항은 이 편향을 겨냥한다. 평가할 때는 길이를 통제한 승률을 함께 보는 것이 관례가 됐다.</p>' },
      { tag: 'algo', t: '$\\beta$는 정규화이자 학습률이다',
        d: '<p>기울기 크기는 $\\beta\\,\\sigma(-\\beta h)$이고 손실 곡률은 $h$ 공간에서 대략 $\\beta^2/4$다. $\\beta$를 줄이면 "더 멀리 가도 된다"는 뜻이 되지만, 동시에 초기 기울기도 작아져 학습률과 얽힌다. 그래서 $\\beta$ 탐색은 학습률과 같이 해야 하고, 논문 간 $\\beta$ 값을 그대로 옮기는 것은 위험하다.</p>' },
    ],
    quiz: [
      { q: 'DPO 유도에서 분배함수 $Z(x)$가 사라지는 이유는?', options: ['$Z(x)=1$이 되도록 정규화했기 때문', 'Bradley–Terry 확률이 같은 프롬프트 내 보상 차이에만 의존하기 때문', '$\\beta \\to 0$ 극한을 취했기 때문', '$\\pi_{\\text{ref}}$가 균등분포이기 때문'], answer: 1,
        explain: '$r = \\beta\\log\\frac{\\pi^*}{\\pi_{\\text{ref}}} + \\beta\\log Z(x)$에서 $\\beta\\log Z(x)$는 프롬프트에만 의존한다. $r_w - r_l$을 취하면 상쇄된다.' },
      { q: 'DPO 기울기의 가중치 $\\sigma(\\hat r_\\theta(y_l) - \\hat r_\\theta(y_w))$가 큰 쌍은?', options: ['이미 올바르게 크게 구분된 쌍', '암묵적 보상이 거절 응답을 더 높게 평가하는 쌍', '응답 길이가 긴 쌍', '$\\pi_{\\text{ref}}$ 확률이 높은 쌍'], answer: 1,
        explain: '현재 정책의 암묵적 보상이 순위를 틀리게 매길수록 가중치가 1에 가깝다. 이미 맞힌 쌍은 거의 무시된다.' },
      { q: '모든 쌍에서 항상 보상이 높은 응답이 선택되는(결정적) 데이터로 DPO를 오래 학습하면?', options: ['$\\beta$에 맞는 $\\pi^*$로 수렴한다', '$\\pi_{\\text{ref}}$에 머문다', '$\\beta$와 무관하게 최고 응답으로 확률이 몰린다', '모든 응답의 확률이 같아진다'], answer: 2,
        explain: '분리 가능한 데이터에서 BT 최대우도 해는 보상 차이가 무한대다. 닫힌 해의 $e^{r/\\beta}$에서 $r$이 발산하므로 KL 정규화가 효과를 잃는다. IPO, 라벨 스무딩이 이를 막는다.' },
      { q: 'SimPO와 ORPO가 공통으로 제거한 것은?', options: ['선호 쌍', '기준 모델 $\\pi_{\\text{ref}}$', '로지스틱 링크', '정책 모델'], answer: 1,
        explain: 'SimPO는 길이 정규화 평균 로그확률을, ORPO는 오즈비를 암묵적 보상으로 써서 기준 모델 없이 학습한다. 메모리와 계산을 아끼는 대신 KL-정규화 닫힌 해와의 연결은 느슨해진다.' },
    ],
  });

  /* ---------- 한 쌍의 답으로 DPO 느껴 보기 ---------- */
  function mountPair(el) {
    const p0w = 0.15, p0l = 0.25;
    const p = ui.panel(el, { kind: 'TRY', title: '한 쌍의 답으로 DPO 느껴 보기', caption: '두 슬라이더로 모델이 고른 답과 버린 답을 원래의 몇 배로 쓰게 됐는지 정해 보라. 오른쪽 그래프의 점이 손실 곡선을 따라 내려가고, "아직 고칠 힘"이 줄어드는 것을 보라. 아래 버튼 "둘 다 덜 쓰게"도 눌러 보라.' });
    const card = document.createElement('div');
    card.className = 'fx-detail';
    card.innerHTML = '<strong>질문</strong>: 비 오는 날 집에서 할 만한 일을 추천해 줘.<br><span class="col-good"><strong>고른 답</strong></span>: 보드게임, 영화 보기, 새 요리 도전하기를 추천해요.<br><span class="col-bad"><strong>버린 답</strong></span>: 비 오는 날엔 딱히 할 게 없어요.';
    p.body.appendChild(card);
    const ctr = ui.row(p.body);
    const fmtX = (v) => '×' + Math.pow(2, v).toFixed(2);
    const wS = ui.slider(ctr, { label: '고른 답: 원래의 몇 배로 쓰나', min: -2, max: 2, step: 0.05, value: 0, format: fmtX, onInput: draw });
    const lS = ui.slider(ctr, { label: '버린 답: 원래의 몇 배로 쓰나', min: -3, max: 0.55, step: 0.05, value: 0, format: fmtX, onInput: draw });
    const bS = ui.slider(ctr, { label: '배율 $\\beta$', min: 0.1, max: 1, step: 0.05, value: 0.5, format: ui.fmt.f(2), onInput: draw });
    const btns = ui.row(p.body, 'btns');
    const preset = (a, b) => { wS.set(Math.log2(a), true); lS.set(Math.log2(b), true); draw(); };
    ui.button(btns, '처음 상태', () => preset(1, 1));
    ui.button(btns, '고른 답만 2배로', () => preset(2, 1));
    ui.button(btns, '버린 답만 절반으로', () => preset(1, 0.5));
    ui.button(btns, '둘 다 덜 쓰게 (0.5배, 0.125배)', () => preset(0.5, 0.125));
    const msg = document.createElement('div');
    msg.className = 'fx-detail';
    msg.setAttribute('role', 'status');
    p.body.appendChild(msg);
    const st = ui.stats(p.body, [
      { key: 'rw', label: '고른 답 숨은 점수 $\\hat r_w$' },
      { key: 'rl', label: '버린 답 숨은 점수 $\\hat r_l$' },
      { key: 'm', label: '점수 차이', tone: 'accent' },
      { key: 'L', label: '손실', tone: 'signal' },
      { key: 'g', label: '아직 고칠 힘' },
    ]);
    const split = document.createElement('div');
    split.className = 'w-split';
    const L = document.createElement('div'), R = document.createElement('div');
    split.append(L, R);
    p.body.appendChild(split);
    const pb = plot.bars(L, { categories: ['고른 답', '버린 답'], series: [], height: 220, y: { min: 0, max: 0.7, label: '답을 쓸 확률' }, labels: true, labelFmt: (v) => v.toFixed(3) });
    const lc = plot.line(R, { height: 220, x: { min: -3, max: 3, label: '점수 차이 (고른 답 − 버린 답)' }, y: { min: 0, max: 3.2, label: '손실 / 고칠 힘' }, series: [] });
    function draw() {
      const rw = Math.pow(2, wS.get()), rl = Math.pow(2, lS.get()), beta = bS.get();
      const sw = beta * Math.log(rw), sl = beta * Math.log(rl), m = sw - sl;
      const loss = -Math.log(sim.sigmoid(m)), g = sim.sigmoid(-m);
      const xs = sim.range(121).map((i) => -3 + i * 0.05);
      pb.update({ series: [
        { name: '원래 모델', color: 'c6', values: [p0w, p0l], opacity: 0.6 },
        { name: '지금 모델', color: 'c1', values: [p0w * rw, p0l * rl] },
      ] });
      lc.update({ series: [
        { name: '손실 $-\\log\\sigma(\\text{차이})$', color: 'c1', data: xs.map((x) => [x, -Math.log(sim.sigmoid(x))]), points: [[Math.max(-3, Math.min(3, m)), -Math.log(sim.sigmoid(Math.max(-3, Math.min(3, m)))), 6]] },
        { name: '고칠 힘 $\\sigma(-\\text{차이})$', color: 'c2', dash: '5 4', data: xs.map((x) => [x, sim.sigmoid(-x)]), points: [[Math.max(-3, Math.min(3, m)), sim.sigmoid(-Math.max(-3, Math.min(3, m))), 5]] },
      ] });
      st.set('rw', sw.toFixed(3));
      st.set('rl', sl.toFixed(3));
      st.set('m', m.toFixed(3));
      st.set('L', loss.toFixed(3));
      st.set('g', g.toFixed(3));
      let t = '고른 답은 원래의 ' + rw.toFixed(2) + '배, 버린 답은 ' + rl.toFixed(2) + '배로 쓴다. 점수 차이 ' + m.toFixed(2) + ', 손실 ' + loss.toFixed(3) + ' (처음엔 0.693).';
      if (Math.abs(m) < 1e-9) t += ' 아직 두 답을 구분하지 못하니 고칠 힘이 0.5로 크다.';
      else if (m < 0) t += ' 버린 답 쪽을 더 좋아하게 됐다. 손실이 처음보다 커지고 고칠 힘도 커진다.';
      else if (rw < 1 && rl < 1) t += ' <strong>두 답 모두 원래보다 덜 쓰게 됐는데도 손실은 줄었다.</strong> 버린 답을 더 많이 줄여 차이가 벌어졌기 때문이다. DPO가 고른 답의 확률까지 내릴 수 있는 이유다.';
      else t += ' 차이가 벌어질수록 손실과 고칠 힘이 함께 줄지만, 0이 되려면 차이가 끝없이 커져야 한다.';
      msg.innerHTML = t;
    }
    draw();
  }

  /* ---------- 손실 · 기울기 가중치 계산기 ---------- */
  function mountLossCalc(el) {
    const p = ui.panel(el, { kind: 'CALC', title: '로그비 차이 $h$에 대한 손실과 기울기', caption: '$\\beta$ 슬라이더를 움직여 보라. 파란 실선(DPO 손실)은 오른쪽 끝까지 가도 0에 닿지 않지만, 주황(cDPO)과 초록(IPO)은 세로 점선에서 바닥을 찍는다. 가로축 $h = \\log\\frac{\\pi_\\theta(y_w)}{\\pi_{\\text{ref}}(y_w)} - \\log\\frac{\\pi_\\theta(y_l)}{\\pi_{\\text{ref}}(y_l)}$는 두 답의 로그비 차이다.' });
    const ctr = ui.row(p.body);
    const bS = ui.slider(ctr, { label: '$\\beta$', min: 0.05, max: 2, step: 0.05, value: 0.5, format: ui.fmt.f(2), onInput: draw });
    const eS = ui.slider(ctr, { label: '라벨 스무딩 $\\epsilon$', min: 0.01, max: 0.4, step: 0.01, value: 0.1, format: ui.fmt.f(2), onInput: draw });
    const st = ui.stats(p.body, [
      { key: 'w0', label: '$h=0$에서 DPO 기울기 크기', tone: 'accent' },
      { key: 'c', label: 'cDPO 최적 $h$', tone: 'signal' },
      { key: 'i', label: 'IPO 목표 $h = 1/(2\\beta)$' },
    ]);
    const chartEl = document.createElement('div');
    p.body.appendChild(chartEl);
    const ch = plot.line(chartEl, { height: 270, x: { min: -8, max: 12, label: '로그비 차이 h (nats)' }, y: { min: 0, max: 3, label: '손실 / 기울기' }, series: [] });
    const lsig = (z) => (z > 30 ? -Math.exp(-z) : -Math.log1p(Math.exp(-z)));
    function draw() {
      const b = bS.get(), e = eS.get();
      const xs = sim.range(401).map((i) => -8 + i * 0.05);
      const hc = Math.log((1 - e) / e) / b;
      const hi = 1 / (2 * b);
      ch.update({
        series: [
          { name: 'DPO 손실 $-\\log\\sigma(\\beta h)$', color: 'c1', data: xs.map((h) => [h, -lsig(b * h)]) },
          { name: 'DPO 기울기 크기 $\\beta\\sigma(-\\beta h)$', color: 'c1', dash: '4 3', data: xs.map((h) => [h, b * sim.sigmoid(-b * h)]) },
          { name: 'cDPO 손실', color: 'c2', data: xs.map((h) => [h, -(1 - e) * lsig(b * h) - e * lsig(-b * h)]) },
          { name: 'IPO 손실 $(h - \\tfrac{1}{2\\beta})^2$ (×0.1)', color: 'c3', data: xs.map((h) => [h, 0.1 * Math.pow(h - hi, 2)]) },
        ],
        vlines: [{ x: hc, label: 'cDPO 최적', color: 'c2' }, { x: hi, label: 'IPO 목표', color: 'c3' }],
      });
      st.set('w0', (b * 0.5).toFixed(3));
      st.set('c', hc.toFixed(2));
      st.set('i', hi.toFixed(2));
    }
    draw();
  }

  /* ---------- 6개 응답 세계의 DPO 학습 ---------- */
  function mountDPOSim(el) {
    const names = ['A', 'B', 'C', 'D', 'E', 'F'];
    const pref = [0.30, 0.25, 0.20, 0.13, 0.09, 0.03];
    const rew = [0.0, 1.0, 0.4, -0.6, 0.7, -1.2];
    const K = names.length;
    const lref = pref.map(Math.log);
    const p = ui.panel(el, { kind: 'SIM', title: '표 형태 정책의 DPO · IPO · cDPO 학습', caption: '"라벨"을 결정적으로 바꿔 보라. 파란 막대(DPO 결과)가 B 하나로 몰리며 주황 막대(RLHF 정답)에서 멀어진다. 손실을 IPO나 cDPO로 바꾸면 몰림이 멈춘다. 참 보상 $r$ = [' + rew.join(', ') + '], 기준 정책 $\\pi_{\\text{ref}}$ = [' + pref.join(', ') + ']. 비교 쌍은 $\\pi_{\\text{ref}}$에서 서로 다른 두 응답을 뽑아 만든다. 전체 배치 Adam으로 1500 스텝 학습.' });
    const ctr = ui.row(p.body);
    const bS = ui.slider(ctr, { label: '$\\beta$', min: 0.1, max: 2, step: 0.05, value: 0.5, format: ui.fmt.f(2), onInput: run });
    const nS = ui.slider(ctr, { label: '선호 쌍 수 $N$', min: 10, max: 2000, step: 10, value: 1000, format: ui.fmt.int, onInput: run });
    let labelMode = 'bt', loss = 'dpo', seed = 3;
    ui.select(ctr, { label: '라벨', value: labelMode, options: [{ value: 'bt', label: '확률적: BT σ(r_a − r_b)' }, { value: 'det', label: '결정적: 항상 보상 높은 쪽' }], onChange: (v) => { labelMode = v; run(); } });
    ui.select(ctr, { label: '손실', value: loss, options: [{ value: 'dpo', label: 'DPO' }, { value: 'cdpo', label: 'cDPO (ε = 0.1)' }, { value: 'ipo', label: 'IPO (τ = β)' }], onChange: (v) => { loss = v; run(); } });
    const btns = ui.row(p.body, 'btns');
    ui.button(btns, '새 데이터 샘플', () => { seed++; run(); }, { primary: true });
    const st = ui.stats(p.body, [
      { key: 'kl', label: '$\\mathrm{KL}(\\pi_\\theta\\|\\pi^*)$', tone: 'accent' },
      { key: 'klr', label: '$\\mathrm{KL}(\\pi_\\theta\\|\\pi_{\\text{ref}})$' },
      { key: 'er', label: '$\\mathbb{E}_{\\pi_\\theta}[r]$ / $\\mathbb{E}_{\\pi^*}[r]$', tone: 'signal' },
      { key: 'ch', label: '선택 응답 로그비 변화(평균)' },
      { key: 'rj', label: '거절 응답 로그비 변화(평균)' },
    ]);
    const split = document.createElement('div');
    split.className = 'w-split';
    const L = document.createElement('div'), R = document.createElement('div');
    split.append(L, R);
    p.body.appendChild(split);
    const bar = plot.bars(L, { categories: names, series: [], height: 250, y: { min: 0, label: '확률' } });
    const lc = plot.line(R, { height: 250, x: { label: '학습 스텝', min: 0 }, y: { label: '값' }, series: [] });

    function run() {
      const r = sim.rng(500 + seed);
      const beta = bS.get(), N = nS.get();
      const pistar = sim.softmax(lref.map((x, i) => x + rew[i] / beta));
      const data = [];
      for (let n = 0; n < N; n++) {
        const a = r.choice(pref);
        let b = r.choice(pref);
        while (b === a) b = r.choice(pref);
        let w;
        if (labelMode === 'det') w = rew[a] > rew[b] ? a : b;
        else w = r() < sim.sigmoid(rew[a] - rew[b]) ? a : b;
        data.push([w, w === a ? b : a]);
      }
      const th = lref.slice();
      const m = new Array(K).fill(0), v = new Array(K).fill(0);
      const steps = 1500, eps = 0.1;
      const kls = [], ers = [], chs = [];
      for (let s = 1; s <= steps; s++) {
        const g = new Array(K).fill(0);
        for (let n = 0; n < N; n++) {
          const w = data[n][0], l = data[n][1];
          const h = (th[w] - th[l]) - (lref[w] - lref[l]);
          let c;
          if (loss === 'ipo') c = 2 * (h - 1 / (2 * beta));
          else if (loss === 'cdpo') c = -(1 - eps) * beta * sim.sigmoid(-beta * h) + eps * beta * sim.sigmoid(beta * h);
          else c = -beta * sim.sigmoid(-beta * h);
          g[w] += c; g[l] -= c;
        }
        const lr = 0.1 / (1 + s / 300);
        for (let k = 0; k < K; k++) {
          const gk = g[k] / N;
          m[k] = 0.9 * m[k] + 0.1 * gk;
          v[k] = 0.999 * v[k] + 0.001 * gk * gk;
          const mh = m[k] / (1 - Math.pow(0.9, s)), vh = v[k] / (1 - Math.pow(0.999, s));
          th[k] -= lr * mh / (Math.sqrt(vh) + 1e-8);
        }
        if (s % 15 === 0 || s === 1) {
          const pi = sim.softmax(th);
          kls.push([s, sim.kl(pi, pistar)]);
          ers.push([s, pi.reduce((acc, q, i) => acc + q * rew[i], 0)]);
          const lp = pi.map(Math.log);
          chs.push([s, sim.mean(data.map(([w]) => lp[w] - lref[w]))]);
        }
      }
      const pi = sim.softmax(th);
      const lp = pi.map(Math.log);
      const erStar = pistar.reduce((acc, q, i) => acc + q * rew[i], 0);
      bar.update({ series: [
        { name: '$\\pi_{\\text{ref}}$', color: 'c6', values: pref, opacity: 0.6 },
        { name: 'RLHF 정답 $\\pi^*$', color: 'c2', values: pistar },
        { name: '학습된 $\\pi_\\theta$', color: 'c1', values: pi },
      ] });
      lc.update({ series: [
        { name: '$\\mathrm{KL}(\\pi_\\theta\\|\\pi^*)$', color: 'c1', data: kls },
        { name: '$\\mathbb{E}_{\\pi_\\theta}[r]$', color: 'c3', data: ers },
        { name: '선택 응답 로그비 변화', color: 'c4', data: chs },
      ], hlines: [{ y: erStar, label: 'E_π*[r]', color: 'c3' }, { y: 0, label: '' }] });
      st.set('kl', sim.kl(pi, pistar).toFixed(3));
      st.set('klr', sim.kl(pi, pref).toFixed(3));
      st.set('er', pi.reduce((acc, q, i) => acc + q * rew[i], 0).toFixed(3) + ' / ' + erStar.toFixed(3));
      st.set('ch', sim.mean(data.map(([w]) => lp[w] - lref[w])).toFixed(2));
      st.set('rj', sim.mean(data.map(([, l]) => lp[l] - lref[l])).toFixed(2));
    }
    run();
  }
})();
