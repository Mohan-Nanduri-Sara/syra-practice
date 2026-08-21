/* ============================================================
   SOMSED shared calculator module (Mohan, 2026-08-20)
   Single source of truth for calculator BEHAVIOR — button markup,
   insertion logic, evaluation, DEG/RAD, funcs-panel toggle.
   Every worked-example demo loads this file and calls
   SomsedCalculator.mount('somsedGridMount') once, instead of each
   demo carrying its own copy of every calc* function. Fix a bug or
   change the layout here once — every demo picks it up next load.

   What still lives PER DEMO FILE (not here), and why:
   - `let calcMode='RAD';`  — shared with that page's own graph/equation
     parser (trig functions inside plotted equations respect DEG/RAD
     too), so it has to be declared where the graph engine can see it.
     This file reads/writes the bare `calcMode` identifier — that works
     because classic (non-module) <script> tags in the same document
     share one global lexical scope, so a `let` in one script is a
     plain visible identifier to functions defined in another, as long
     as nothing tries to read it before the page has finished loading
     (true here — everything below only runs from a button click).
   - `calcDisplay` / `calcResult` / DEG-RAD buttons / `.calc-hint` —
     these are page chrome around the calculator, not calculator
     button-grid content, so they stay inline in each demo's own HTML.
   - `renderInputs()` on the graph side sets `activeInputEl = input`
     on focus — that's why `activeInputEl` is declared at this file's
     top level (not hidden in a closure): it needs to be a shared
     global both this file and each demo's own graph script can see.
   ============================================================ */

let activeInputEl = null;
let calcAns = 0;

function currentTarget(){
  return activeInputEl && document.body.contains(activeInputEl)
    ? activeInputEl
    : document.getElementById('calcDisplay');
}
function afterEdit(d){
  if(d.id === 'calcDisplay'){ calcUpdatePreview(); }
  else { d.dispatchEvent(new Event('input')); }
}
function toggleCalcFuncs(){
  const panel = document.getElementById('calcFuncs');
  const btn = document.getElementById('calcFuncsToggle');
  if(!panel) return;
  const open = panel.classList.toggle('open');
  if(btn){ btn.classList.toggle('open', open); btn.textContent = open ? 'funcs ▴' : 'funcs ▾'; }
}
function calcInsert(text){
  const d = currentTarget();
  const start = d.selectionStart ?? d.value.length;
  const end = d.selectionEnd ?? d.value.length;
  d.value = d.value.slice(0,start) + text + d.value.slice(end);
  d.focus();
  const pos = start + text.length;
  d.setSelectionRange(pos,pos);
  afterEdit(d);
}
function calcInsertWrap(open, close){
  const d = currentTarget();
  const start = d.selectionStart ?? d.value.length;
  const end = d.selectionEnd ?? d.value.length;
  const selected = d.value.slice(start,end);
  d.value = d.value.slice(0,start) + open + selected + close + d.value.slice(end);
  d.focus();
  const pos = selected ? start+open.length+selected.length+close.length : start+open.length;
  d.setSelectionRange(pos,pos);
  afterEdit(d);
}
function calcClear(){
  const disp = document.getElementById('calcDisplay');
  const res = document.getElementById('calcResult');
  if(disp) disp.value = '';
  if(res) res.textContent = '';
}
function calcBack(){
  const d = currentTarget();
  const start = d.selectionStart ?? d.value.length;
  const end = d.selectionEnd ?? d.value.length;
  if(start !== end){
    d.value = d.value.slice(0,start) + d.value.slice(end);
    d.setSelectionRange(start,start);
  } else if(start > 0){
    d.value = d.value.slice(0,start-1) + d.value.slice(start);
    d.setSelectionRange(start-1,start-1);
  }
  d.focus(); afterEdit(d);
}
function calcToggleSign(){
  const d = currentTarget();
  if(d.value.startsWith('−(') && d.value.endsWith(')'))
    d.value = d.value.slice(2,-1);
  else
    d.value = '−(' + d.value + ')';
  d.focus(); d.setSelectionRange(d.value.length, d.value.length);
  afterEdit(d);
}
function calcPrepare(s){
  s = s.replace(/\s+/g,'').replace(/×/g,'*').replace(/÷/g,'/')
    .replace(/−/g,'-').replace(/π/g,'Math.PI')
    .replace(/\bAns\b/g,'ANS').replace(/\be\b/g,'Math.E')
    .replace(/√\(/g,'sqrt(').replace(/\^/g,'**');
  s = s.replace(/(\d+(?:\.\d+)?)%/g,'($1/100)');
  const angle = (typeof calcMode !== 'undefined' && calcMode === 'DEG') ? '(Math.PI/180)*' : '';
  s = s.replace(/\bsin\(/g,`Math.sin(${angle}`)
       .replace(/\bcos\(/g,`Math.cos(${angle}`)
       .replace(/\btan\(/g,`Math.tan(${angle}`)
       .replace(/\blog\(/g,'Math.log10(')
       .replace(/\bln\(/g,'Math.log(')
       .replace(/\bsqrt\(/g,'Math.sqrt(');
  return s;
}
function calcEvaluate(raw){
  let s = calcPrepare(raw);
  if(!s) return null;
  if(!/^[0-9+\-*/()._a-zA-Z]+$/.test(s)) return null;
  s = s.replace(/\bANS\b/g, String(calcAns));
  try{
    const value = Function('"use strict";return (' + s + ')')();
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
  }catch(_){ return null; }
}
function calcFormat(v){
  if(v === 0 || Math.abs(v) < 1e-12) return '0';
  if(Math.abs(v) >= 1e10 || Math.abs(v) < 1e-8)
    return v.toExponential(8).replace(/\.?0+e/,'e');
  return Number(v.toPrecision(12)).toString();
}
function calcEquals(){
  const d = document.getElementById('calcDisplay');
  const out = document.getElementById('calcResult');
  if(!d || !out) return;
  const value = calcEvaluate(d.value);
  if(value === null){ out.textContent = 'Invalid expression'; return; }
  calcAns = value; out.textContent = '= ' + calcFormat(value);
}
function calcUpdatePreview(){
  const d = document.getElementById('calcDisplay');
  const out = document.getElementById('calcResult');
  if(!d || !out) return;
  if(!d.value.trim()){ out.textContent = ''; return; }
  const value = calcEvaluate(d.value);
  out.textContent = value === null ? '' : '= ' + calcFormat(value);
}
function setCalcMode(mode){
  calcMode = mode;
  const deg = document.getElementById('degBtn');
  const rad = document.getElementById('radBtn');
  if(deg) deg.classList.toggle('active', mode === 'DEG');
  if(rad) rad.classList.toggle('active', mode === 'RAD');
  calcUpdatePreview();
}

const SOMSED_GRID_HTML = `
  <div class="calc-utility">
    <button class="danger" onclick="calcClear()">AC</button>
    <button onclick="calcBack()">⌫</button>
    <button id="calcFuncsToggle" class="calc-funcs-toggle" onclick="toggleCalcFuncs()">funcs ▾</button>
  </div>

  <div id="calcFuncs" class="calc-funcs">
    <button onclick="calcInsert('sin(')">sin</button>
    <button onclick="calcInsert('cos(')">cos</button>
    <button onclick="calcInsert('tan(')">tan</button>
    <button onclick="calcInsert('%')">%</button>
    <button onclick="calcInsert('log(')">log</button>
    <button onclick="calcInsert('ln(')">ln</button>
    <button onclick="calcInsert('√(')">√</button>
    <button title="Type an = sign, e.g. for Solve" onclick="calcInsert('=')">=</button>
  </div>

  <div class="calc-desmos">
    <button onclick="calcInsert('x')">x</button>
    <button onclick="calcInsert('y')">y</button>
    <button onclick="calcInsert('x^2')">x²</button>
    <button onclick="calcInsert('y^2')">y²</button>
    <button onclick="calcInsert('7')">7</button>
    <button onclick="calcInsert('8')">8</button>
    <button onclick="calcInsert('9')">9</button>
    <button class="op" onclick="calcInsert('÷')">÷</button>

    <button class="op" onclick="calcInsert('(')">(</button>
    <button class="op" onclick="calcInsert(')')">)</button>
    <button class="op" onclick="calcInsert('<')">&lt;</button>
    <button class="op" onclick="calcInsert('>')">&gt;</button>
    <button onclick="calcInsert('4')">4</button>
    <button onclick="calcInsert('5')">5</button>
    <button onclick="calcInsert('6')">6</button>
    <button class="op" onclick="calcInsert('×')">×</button>

    <button class="op" onclick="calcInsertWrap('|','|')">|x|</button>
    <button onclick="calcInsert('Ans')">Ans</button>
    <button class="op" onclick="calcInsert('≤')">≤</button>
    <button class="op" onclick="calcInsert('≥')">≥</button>
    <button onclick="calcInsert('1')">1</button>
    <button onclick="calcInsert('2')">2</button>
    <button onclick="calcInsert('3')">3</button>
    <button class="op" onclick="calcInsert('−')">−</button>

    <button onclick="calcInsert('π')">π</button>
    <button onclick="calcInsert('e')">e</button>
    <button onclick="calcInsert('^')">xʸ</button>
    <button onclick="calcToggleSign()">±</button>
    <button onclick="calcInsert('0')">0</button>
    <button onclick="calcInsert('.')">.</button>
    <button class="equals" title="Calculate result" onclick="calcEquals()">=</button>
    <button class="op" onclick="calcInsert('+')">+</button>
  </div>
`;

function somsedCalculatorMount(mountId){
  const el = document.getElementById(mountId);
  if(!el){ console.error('SomsedCalculator.mount: no element #' + mountId); return; }
  el.innerHTML = SOMSED_GRID_HTML;

  const disp = document.getElementById('calcDisplay');
  if(disp){
    disp.setAttribute('inputmode','none');
    disp.setAttribute('autocomplete','off');
    disp.setAttribute('spellcheck','false');
    disp.addEventListener('keydown', e=>{
      if(e.key === 'Enter'){ e.preventDefault(); calcEquals(); }
      else if(e.key === 'Escape'){ calcClear(); }
    });
    disp.addEventListener('input', calcUpdatePreview);
    disp.addEventListener('focus', ()=>{ activeInputEl = disp; });
    activeInputEl = disp;
  }
}

window.SomsedCalculator = { mount: somsedCalculatorMount };
