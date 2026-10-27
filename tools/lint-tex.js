/* 일반 문자열('...', "...") 안에서 TeX 명령의 역슬래시가 하나만 있어 사라지는 경우(\\gamma → gamma, \\times → 탭+imes)를 찾는다.
   String.raw 템플릿은 건너뛴다. 사용: node tools/lint-tex.js [파일 ...] (인자 없으면 js/ 전체) */
const fs = require('fs');
const path = require('path');
let total = 0;
const files = process.argv.slice(2).length ? process.argv.slice(2) : ['js', 'js/chapters'].flatMap((d) => fs.readdirSync(path.join(__dirname, '..', d)).filter((f) => f.endsWith('.js')).map((f) => path.join(__dirname, '..', d, f)));
for (const file of files) {
const src = fs.readFileSync(file, 'utf8');
const valid = new Set(['n', 't', 'r', 'b', 'f', 'v', '0', 'x', 'u', '\\', "'", '"', '\n', '`', '$', '/']);
let i = 0, line = 1, bad = [];
while (i < src.length) {
  const c = src[i];
  if (c === '\n') { line++; i++; continue; }
  if (c === '/' && src[i + 1] === '/') { while (i < src.length && src[i] !== '\n') i++; continue; }
  if (c === '/' && src[i + 1] === '*') { i += 2; while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) { if (src[i] === '\n') line++; i++; } i += 2; continue; }
  if (c === '`') { // template literal (String.raw 포함) 건너뛰기
    i++;
    while (i < src.length && src[i] !== '`') { if (src[i] === '\\') i++; if (src[i] === '\n') line++; i++; }
    i++; continue;
  }
  if (c === "'" || c === '"') {
    const q = c; i++;
    while (i < src.length && src[i] !== q) {
      if (src[i] === '\\') {
        const nx = src[i + 1];
        if (!valid.has(nx)) bad.push(line + ': \\' + nx + '  …' + src.slice(Math.max(0, i - 20), i + 12).replace(/\n/g, ' '));
        // \f, \b, \v, \t 은 유효하지만 TeX 명령(\frac, \beta, \vec, \theta)이 깨진 것일 수 있다
        else if ('fbvtnr'.includes(nx) && /[a-z]/.test(src[i + 2] || '')) bad.push(line + ': suspicious \\' + nx + src[i + 2] + '  …' + src.slice(Math.max(0, i - 20), i + 12).replace(/\n/g, ' '));
        i += 2; continue;
      }
      if (src[i] === '\n') line++;
      i++;
    }
    i++; continue;
  }
  i++;
}
// 템플릿 리터럴 안에서 \t, \b, \f, \v 가 제어 문자로 바뀐 경우(예: \times → 탭+imes)도 잡는다
src.split('\n').forEach((ln, li) => { const m = ln.match(/[\t\x08\x0b\x0c\r]/); if (m) bad.push((li + 1) + ': raw control char ' + JSON.stringify(m[0]) + '  …' + ln.trim().slice(0, 50)); });
if (bad.length) { console.log(path.relative(process.cwd(), file) + ': ' + bad.length + ' issue(s)'); bad.slice(0, 40).forEach((b) => console.log('  ' + b)); }
total += bad.length;
}
console.log(total ? total + ' issue(s)' : 'lint-tex: clean');
process.exit(total ? 1 : 0);
