/* 모든 장을 헤드리스 브라우저로 열어 JS 오류, KaTeX 파싱 오류, 위젯 오류, 가로 넘침을 점검한다.
   사용: node tools/check.js [chapterId ...] */
const path = require('path');
const { chromium } = require('playwright');

(async () => {
  const root = path.resolve(__dirname, '..');
  const url = 'file://' + path.join(root, 'index.html');
  const browser = await chromium.launch();
  const only = process.argv.slice(2);
  let failed = 0;
  for (const width of [1280, 400]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    const errors = [];
    page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
    page.on('console', (m) => { if (m.type() === 'error' && !/fonts\.(googleapis|gstatic)/.test(m.text()) && !/ERR_(NAME|INTERNET|PROXY|CONNECTION|TUNNEL)/.test(m.text())) errors.push('console: ' + m.text()); });
    page.on('requestfailed', (r) => { if (!/fonts\.(googleapis|gstatic)/.test(r.url())) errors.push('requestfailed: ' + r.url()); });
    await page.goto(url + '#home');
    await page.waitForTimeout(300);
    // 첫 로드 중에 난 오류(스크립트 파싱·정의 누락 등)는 장별 목록을 비우기 전에 따로 보고한다
    if (errors.length) {
      failed++;
      console.log(`[${width}] page load errors:`);
      errors.slice(0, 10).forEach((e) => console.log('   ' + e));
    }
    const ids = only.length ? only : await page.evaluate(() => RL.order);
    for (const id of ids) {
      errors.length = 0;
      await page.evaluate((x) => { location.hash = x; }, id);
      await page.waitForTimeout(250);
      const r = await page.evaluate(() => ({
        ready: !!RL.chapters[RL.current],
        katex: [...document.querySelectorAll('.katex-error')].map((e) => e.getAttribute('title') || e.textContent).slice(0, 5),
        katexN: document.querySelectorAll('.katex-error').length,
        unrendered: (document.getElementById('ch-body') || document.body).innerText.match(/\$[^$\n]{1,40}\$/g) || [],
        widgetErr: [...document.querySelectorAll('.warn .label')].filter((e) => e.textContent === '위젯 오류').map((e) => e.parentElement.textContent).slice(0, 5),
        missing: [...document.querySelectorAll('.aside code')].filter((c) => /찾지 못/.test(c.parentElement.textContent)).map((c) => c.textContent),
        overflow: document.documentElement.scrollWidth - window.innerWidth,
        widgets: document.querySelectorAll('[data-w]').length,
      }));
      const bad = !r.ready || r.katexN || r.widgetErr.length || r.missing.length || errors.length || r.overflow > 1 || r.unrendered.length;
      if (bad) failed++;
      if (bad || width === 1280) {
        console.log(`[${width}] ${id.padEnd(11)} ${r.ready ? 'ok ' : 'MISSING'} widgets=${r.widgets} katexErr=${r.katexN} overflow=${r.overflow}`);
        if (r.katex.length) console.log('   katex:', r.katex);
        if (r.unrendered.length) console.log('   unrendered $:', r.unrendered.slice(0, 5));
        if (r.widgetErr.length) console.log('   widget:', r.widgetErr);
        if (r.missing.length) console.log('   missing widget:', r.missing);
        errors.slice(0, 8).forEach((e) => console.log('   ' + e));
      }
    }
    await page.close();
  }
  await browser.close();
  console.log(failed ? `\n${failed} problem(s)` : '\nall clean');
  process.exit(failed ? 1 : 0);
})();
