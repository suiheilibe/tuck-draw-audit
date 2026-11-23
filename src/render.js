// Draws everything from the saved state and the draft. Event handlers are attached in main.js.

import { $, clamp, esc } from './util.js';
import { S, draft, redoStack } from './state.js';
import { analyze } from './stats.js';
import { bMax, currentInput } from './input.js';

let revealNow = false;  // p-value revealed early in this session
export const reveal = () => { revealNow = true; };

export function renderAll(){ renderInput(); renderLog(); renderStats(); renderSettings(); }

function chipBtn(v, pressed, label, onclick){
  const b = document.createElement('button');
  b.type='button'; b.textContent=v;
  b.setAttribute('aria-pressed', String(pressed)); b.setAttribute('aria-label', label);
  b.onclick = onclick; return b;
}
export function renderInput(){
  const st = S.settings, inp = currentInput();
  const si = $('shownInput'); if (document.activeElement !== si) si.value = draft.shown ?? '';
  $('nOut').textContent = inp.N ?? '–';


  const kc = $('kChips'); kc.replaceChildren();
  const bmax = bMax();
  for (let v=0; v<=bmax; v++)
    kc.append(chipBtn(v, draft.b===v, `戻す前 ${v}枚`, () => { draft.b = v; $('kOther').value=''; renderInput(); }));
  const ko = $('kOther'); if (document.activeElement !== ko) ko.value = (draft.b!=null && draft.b>bmax) ? draft.b : '';

  const ok = inp.N!=null && inp.k!=null && inp.k<=inp.N;
  $('pOut').innerHTML = !ok ? '' : `戻した後 k = <b>${inp.k}</b>　` + (inp.m===1 ? `理論確率 <b>${(inp.k/inp.N*100).toFixed(1)}%</b>` : `期待枚数 <b>${(inp.m*inp.k/inp.N).toFixed(2)}</b>`);
  $('resLabel').textContent = inp.m===1 ? '③ 対象カードを引いたか' : `③ ${inp.m}枚のうち対象カードは何枚`;
  $('effOut').textContent = `${inp.r}枚戻して${inp.m}枚引く` + (st.effectName?`（${st.effectName}）`:'');

  const res = $('results'); res.replaceChildren();
  const opts = inp.m===1 ? [[1,'引いた'],[0,'引かなかった']] : Array.from({length:inp.m+1},(_,y)=>[y,`${y}枚`]);
  for (const [y,label] of opts){
    const b = document.createElement('button');
    b.type='button'; if (y>0) b.className='hit'; b.disabled = inp.issues.length>0;
    b.innerHTML = label + (st.targetName && inp.m===1 ? `<small>${esc(st.targetName)}</small>` : '');
    b.dataset.y = y; res.append(b);
  }
  const notes = $('notes'); notes.replaceChildren();
  for (const i of inp.issues){ const d=document.createElement('div'); if (!i.info) d.className='warn'; d.textContent=i.t; notes.append(d); }
  $('kbdHint').innerHTML = inp.m===1
    ? 'キー操作：<kbd>↑</kbd><kbd>↓</kbd> 山札枚数　<kbd>0</kbd>–<kbd>9</kbd> 戻す前の枚数　<kbd>Y</kbd> 引いた　<kbd>N</kbd> 引かなかった　<kbd>Esc</kbd> 初期値'
    : 'キー操作：<kbd>↑</kbd><kbd>↓</kbd> 山札枚数　<kbd>0</kbd>–<kbd>9</kbd> 戻す前の枚数　<kbd>Z</kbd><kbd>X</kbd><kbd>C</kbd><kbd>V</kbd>… 0,1,2,3枚　<kbd>Esc</kbd> 初期値';
}
function renderLog(){
  const ul = $('log'); ul.replaceChildren();
  if (!S.trials.length){ const li=document.createElement('li'); li.textContent='まだ記録がありません。山札枚数と対象カードの枚数を選んで結果を押すと 1 件記録されます。'; ul.append(li); }
  for (let i=S.trials.length-1; i>=Math.max(0,S.trials.length-40); i--){
    const t = S.trials[i], li = document.createElement('li');
    if (t.void) li.className='void';
    const yl = t.m===1 ? (t.y?'引いた':'外れ') : `${t.y}/${t.m}枚`;
    const pr = t.m===1 ? `${(t.k/t.N*100).toFixed(1)}%` : `期待 ${(t.m*t.k/t.N).toFixed(2)}`;
    li.innerHTML = `<small>${i+1}</small>
      <span>山 ${t.shown}→N ${t.N}　k ${t.k}　<small>${pr}${t.r!==1||t.m!==1?`　${t.r}戻${t.m}引`:''}${t.void?'　取り消し済み':''}</small></span>
      <b${t.y>0?' class="hit"':''}>${yl}</b>`;
    ul.append(li);
  }
  $('undoBtn').disabled = !S.trials.some(t => !t.void);
  $('redoBtn').disabled = !redoStack.some(id => S.trials.some(t => t.id===id && t.void));
}
export function renderStats(){
  const a = analyze(S.trials), st = S.settings;
  $('sN').innerHTML = a.n + (S.trials.length-a.n ? ` <small>（取消 ${S.trials.length-a.n}）</small>` : '');
  $('sS').textContent = a.s;
  $('sMu').textContent = a.mu.toFixed(2);
  $('sRatio').textContent = a.mu>0 ? (a.s/a.mu).toFixed(2) : '–';
  $('progBar').value = clamp(a.n/st.targetTrials,0,1);
  $('progText').textContent = `${a.n} / ${st.targetTrials}`;
  const locked = st.hideP && a.n < st.targetTrials && !S.sample && !revealNow;
  $('sZ').textContent = a.n ? (locked ? '非表示' : a.z.toFixed(2)) : '–';
  $('sP').textContent = a.n ? (locked ? '非表示' : (a.p<0.0001 ? '<0.0001' : a.p.toFixed(4))) : '–';
  $('peekBtn').hidden = !(locked && a.n);
  $('peekNote').textContent =
    S.sample ? 'サンプルデータなので p 値も表示しています。' :
    locked ? `目標の ${st.targetTrials} 件までは p 値を隠しています。途中で何度も確認して有意になった時点で止めると、偏りがないのに「偏りあり」と判断する確率が 5% を超えるためです。` :
    S.peeks ? `目標到達前に p 値を ${S.peeks} 回表示しています（JSON に記録されます）。` :
    a.n ? 'p 値は「k/N の理論どおり」という仮説のもとで、観測値と同じかそれ以上に珍しい結果が出る確率です。' : '';
  drawChart(a.cum);
}
function drawChart(cum){
  const svg = $('chart'), W=600, H=230, L=40, R=12, T=14, B=28;
  if (!cum.length){ svg.innerHTML = `<line class="grid" x1="${L}" y1="${H-B}" x2="${W-R}" y2="${H-B}"/><text x="${W/2}" y="${H/2}" text-anchor="middle">記録すると累積グラフが表示されます</text>`; return; }
  const n = cum.length, ymax = Math.max(1, ...cum.map(c=>Math.max(c.s, c.mu+2*c.sd)));
  const X = i => L + (n===1 ? (W-L-R)/2 : i/(n-1)*(W-L-R)), Y = v => T + (1 - v/ymax)*(H-T-B);
  const nice = ymax<=5?1: ymax<=12?2: ymax<=30?5: ymax<=60?10: 20;
  let g = '';
  for (let v=0; v<=ymax+1e-9; v+=nice) g += `<line class="grid" x1="${L}" y1="${Y(v).toFixed(1)}" x2="${W-R}" y2="${Y(v).toFixed(1)}"/><text x="${L-8}" y="${(Y(v)+4).toFixed(1)}" text-anchor="end">${v}</text>`;
  const xt = n<=10?1: n<=40?5: n<=100?20: n<=400?50:100;
  for (let i=xt; i<=n; i+=xt) if (i>1) g += `<text x="${X(i-1).toFixed(1)}" y="${H-8}" text-anchor="middle">${i}</text>`;
  g += `<text x="${L}" y="${H-8}" text-anchor="start">1</text>`;
  const pt = (i,v) => `${X(i).toFixed(1)},${Y(v).toFixed(1)}`;
  const band = n>1 ? `<polygon class="band" points="${cum.map((c,i)=>pt(i,c.mu+2*c.sd)).concat(cum.map((c,i)=>pt(i,Math.max(0,c.mu-2*c.sd))).reverse()).join(' ')}"/>` : '';
  svg.innerHTML = g + band
    + `<polyline class="exp" points="${cum.map((c,i)=>pt(i,c.mu)).join(' ')}"/>`
    + `<polyline class="obs" points="${cum.map((c,i)=>pt(i,c.s)).join(' ')}"/>`
    + `<circle class="dot" cx="${X(n-1).toFixed(1)}" cy="${Y(cum[n-1].s).toFixed(1)}" r="4"/>`;
}
function renderSettings(){
  const st = S.settings, set = (id,v) => { const el=$(id); if (document.activeElement!==el) el.value=v; };
  set('setTarget', st.targetName); set('setEffect', st.effectName);
  set('setR', st.returnCount); set('setM', st.drawCount);
  set('setDeck', st.initDeck); set('setMax', st.maxCopies); set('setTargetN', st.targetTrials);
  $('setHideP').checked = st.hideP;
}
