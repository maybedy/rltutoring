# RL Atlas

MDP와 벨만 방정식에서 시작해 Q-learning, A3C, PPO, SAC, 오프라인 RL, 모델 기반 계획을 거쳐 RLHF, DPO, GRPO, 추론 시점 탐색, 탐색 후 증류까지 이어지는 강화학습 인터랙티브 커리큘럼.

각 장은 같은 틀을 따른다.

- **DERIVE** 핵심 식을 한 줄씩 유도하고, 바뀐 부분과 근거를 표시한다.
- **FORMULA** 식의 각 항에 마우스를 올리면 의미와 "이 항을 바꾸면 어떤 알고리즘이 되는가"가 나온다.
- **SIM / CALC** 알고리즘을 브라우저에서 실제로 실행해 학습이 전개되는 모습을 본다.
- **암묵지** 교과서에 잘 적히지 않는 관점과 경험칙. 25장에 전부 모여 있다.
- **확인 문제** 장마다 3~4문제, 즉시 해설.

## 구성

| 파트 | 내용 |
| --- | --- |
| 0 오리엔테이션 | 로드맵, 9개의 대전제(Thesis), 알고리즘 계보도와 타임라인 |
| I 문제 정의 | MDP와 리턴, 벨만 방정식과 축약 사상, 동적계획법과 GPI, POMDP |
| II 경험으로부터 학습 | 밴딧과 탐험, MC/TD/TD(λ), Q-learning과 SARSA, Q-learning의 여러 관점 |
| III 함수근사와 Deep Value | Deadly Triad, DQN에서 Rainbow까지 |
| IV 정책 최적화 | 정책 경사 정리, Actor-Critic·A3C·GAE, TRPO·PPO, DDPG·TD3·SAC |
| V 데이터·모델·시퀀스 | 오프라인 RL, 모델 기반 RL과 MCTS, Decision Transformer와 in-context RL |
| VI LLM과 강화학습 | 토큰 MDP와 KL 정규화, RLHF, DPO 계열, RLVR·GRPO·R1, 추론 시점 탐색, 탐색 후 증류와 기억 |
| VII 종합 | 연구 흐름과 열린 문제, 암묵지 노트, 기호·용어·참고문헌 |

### 9개의 대전제

| | 대전제 | 한 줄 요약 |
| --- | --- | --- |
| T1 | 벨만 고정점 | 벨만 연산자는 γ-축약이므로 고정점이 유일하고 반복이 수렴한다 |
| T2 | GPI | 평가와 탐욕적 개선의 반복이 거의 모든 알고리즘의 골격이다 |
| T3 | 점수함수 경사 | ∇E[f] = E[f ∇log p]. REINFORCE부터 GRPO까지 |
| T4 | 성능 차이·신뢰영역 | 새 정책의 이득은 옛 advantage로 표현되지만 분포가 바뀌므로 조금씩 움직여야 한다 |
| T5 | KL-정규화 해 | max E[r] − β KL(π‖π₀)의 해는 π₀·exp(r/β)/Z. SAC, RLHF, DPO, Best-of-N |
| T6 | 편향-분산 | MC와 TD 사이의 손잡이: n-step, λ, GAE, baseline |
| T7 | 낙관과 비관 | 데이터를 더 모을 수 있으면 낙관(UCB), 못 모으면 비관(CQL) |
| T8 | Deadly Triad | 함수근사·부트스트랩·off-policy의 불안정성과 max의 과대추정 |
| T9 | 탐색의 상각 | 비싼 개선(탐색·검증)을 정책에 증류: AlphaZero, ExIt, STaR, R1 |

## 실행

빌드 단계가 없다. `index.html`을 브라우저로 열면 된다. 수식 렌더러 KaTeX(MIT)는 `vendor/katex`에 포함되어 있어 오프라인에서도 동작한다(웹폰트만 Google Fonts에서 받으며, 없으면 시스템 글꼴로 대체).

```bash
# 로컬 서버로 보고 싶다면
python3 -m http.server 8000   # http://localhost:8000
```

GitHub Pages에 그대로 올려도 된다(`.nojekyll` 포함).

## 구조

```
index.html            앱 셸, 스크립트 로드 순서
css/main.css          디자인 토큰(라이트/다크), 레이아웃, 위젯 스타일
js/core.js            커리큘럼 매니페스트, 대전제 정의, 라우터(#chapter, #chapter--anchor), 진행도, 암묵지·퀴즈 렌더
js/ui.js              패널, 슬라이더, 수식 탐색기(formula), 유도 스테퍼(derivation), 탭, 애니메이션 루프
js/plot.js            의존성 없는 SVG 선/막대 그래프 (컨테이너 폭에 맞춰 다시 그림)
js/sim.js             시드 난수, 수치 유틸, GridWorld 환경과 렌더러
js/chapters/*.js      장별 내용과 시뮬레이터
tools/check.js        전 장을 헤드리스 브라우저로 열어 JS 오류, KaTeX 오류, 위젯 오류, 가로 넘침 점검
vendor/katex/         KaTeX 0.16.25 (js, css, woff2 글꼴)
```

## 장 추가하기

`js/chapters/<id>.js`를 만들고 `RL.chapter({...})`를 호출한 뒤 `core.js`의 `RL.curriculum`과 `index.html`의 스크립트 목록에 추가한다.

```js
RL.chapter({
  id: 'mdp', title: 'MDP와 리턴', subtitle: '...', time: 25, level: '기초',
  prereq: [], theses: ['T6'], goals: ['...'],
  html: String.raw`<h2>섹션</h2><p>$G_t = r_{t+1} + \gamma G_{t+1}$</p><div data-w="my-sim"></div>`,
  mount: { 'my-sim': (el) => { /* RL.ui, RL.plot, RL.sim 사용 */ } },
  tacit: [{ tag: 'math', t: '제목', d: '<p>본문</p>' }],
  quiz: [{ q: '질문', options: ['A', 'B'], answer: 0, explain: '해설' }],
});
```

수식 안에서 `\tm{id}{...}`는 수식 탐색기의 항 표시, `\hl{...}`는 유도 단계의 강조다. `String.raw` 안에서는 `${` 문자열과 백틱을 쓰지 않는다.

## 점검

```bash
npm install          # playwright
npx playwright install chromium
npm run check        # 또는 node tools/check.js mdp bellman
```
