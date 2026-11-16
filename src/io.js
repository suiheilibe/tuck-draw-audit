// Export (JSON, CSV), import, and deleting all data. initIo() attaches the handlers.

import { $, esc, toast } from './util.js';
import { S, cleanTrial, clearSample, draft, fresh, normalize, save, setS } from './state.js';
import { prefill, prefillB } from './input.js';
import { renderAll } from './render.js';
import { resetInput } from './actions.js';

const dlP = (window.claude && typeof window.claude.use==='function') ? window.claude.use('downloads').catch(()=>null) : Promise.resolve(null);
const stamp = () => { const d=new Date(), p=n=>String(n).padStart(2,'0'); return `${d.getFullYear()}${p(d.getMonth()+1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`; };
const CSV_HEAD = ['id','timestamp','shown_before','returned','drawn','N','k','y','expected','void','voided_at','sample'];
function toCsv(){
  const rows = S.trials.map(t => [t.id, new Date(t.ts).toISOString(), t.shown, t.r, t.m, t.N, t.k, t.y,
    (t.m*t.k/t.N).toFixed(6), t.void?1:0, t.voidedAt?new Date(t.voidedAt).toISOString():'', t.sample?1:0].join(','));
  return CSV_HEAD.join(',') + '\n' + rows.join('\n') + '\n';
}
async function offer(filename, text){
  const dl = await dlP;
  if (dl){
    try { await dl.save({filename, data:text}); toast('書き出しました'); return; }
    catch(e){
      if (e && e.code==='declined'){ toast('書き出しをやめました'); return; }
      if (e && e.code==='rate_limited'){ toast('少し待ってからもう一度押してください'); return; }
    }
  } else if (!window.claude){
    try { const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([text],{type:'text/plain'})); a.download=filename; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),5000); toast('書き出しました'); return; } catch(e){}
  }
  $('fallbackMsg').textContent = `この画面ではファイル保存が使えないため内容を表示しています。コピーして ${filename} として保存してください。`;
  $('fallbackText').value = text; $('fallback').hidden = false;
}

function parseCsv(text){
  const lines = text.trim().split(/\r?\n/), head = lines.shift().split(','), ix = n => head.indexOf(n);
  const need = ['id','timestamp','shown_before','returned','drawn','N','k','y'];
  const miss = need.filter(n=>ix(n)<0); if (miss.length) throw new Error(`CSV に ${miss.join(', ')} の列がありません`);
  return {trials: lines.filter(l=>l.trim()).map(ln => { const c = ln.split(','), g = n => ix(n)>=0 ? c[ix(n)] : '';
    return cleanTrial({id:g('id'), ts:Date.parse(g('timestamp')), shown:g('shown_before'), r:g('returned'), m:g('drawn'), N:g('N'), k:g('k'), y:g('y'),
      void:g('void')==='1', voidedAt:g('voided_at')?Date.parse(g('voided_at')):0, sample:g('sample')==='1'}); }), settings:null};
}
let pendingImport = null;

export function initIo(){
  $('expJson').onclick = () => offer(`modoshi-draw-${stamp()}.json`, JSON.stringify({...S, exportedAt:new Date().toISOString()}, null, 2));
  $('expCsv').onclick  = () => offer(`modoshi-draw-${stamp()}.csv`, toCsv());
  $('fallbackCopy').onclick = async () => {
    const ta = $('fallbackText');
    try { await navigator.clipboard.writeText(ta.value); toast('コピーしました'); }
    catch(e){ ta.focus(); ta.select(); toast('選択しました。コピーしてください'); }
  };
  $('fallbackClose').onclick = () => { $('fallback').hidden = true; };

  $('impFile').addEventListener('change', async e => {
    const f = e.target.files[0]; e.target.value = ''; if (!f) return;
    const box = $('impConfirm');
    try {
      const text = await f.text();
      let data;
      if (text.trim().startsWith('{')){ const o = normalize(JSON.parse(text)); data = {trials:o.trials, settings:o.settings, peeks:o.peeks}; }
      else data = parseCsv(text);
      if (!data.trials.every(t => t.id && Number.isFinite(t.N) && Number.isFinite(t.k) && Number.isFinite(t.y))) throw new Error('記録の形式が正しくありません');
      pendingImport = data;
      const have = new Set(S.trials.map(t=>t.id)), nu = data.trials.filter(t=>!have.has(t.id)).length;
      box.innerHTML = `<p><b>${esc(f.name)}</b>：${data.trials.length} 件。このうち未登録は ${nu} 件です。</p>
        <div class="row"><button class="primary" type="button" data-act="merge">未登録の ${nu} 件を追加</button>
        <button type="button" data-act="replace">今のデータと置き換える</button>
        <button type="button" data-act="cancel">やめる</button></div>`;
    } catch(err){
      pendingImport = null;
      box.innerHTML = `<p>読み込めませんでした：${esc(err.message||err)}。このページで書き出した JSON か CSV を選んでください。</p><div class="row"><button type="button" data-act="cancel">閉じる</button></div>`;
    }
    box.hidden = false;
  });
  $('impConfirm').addEventListener('click', e => {
    const act = e.target.dataset && e.target.dataset.act; if (!act) return;
    const d = pendingImport;
    if (act==='merge' && d){
      if (S.sample) clearSample();
      const have = new Set(S.trials.map(t=>t.id));
      S.trials.push(...d.trials.filter(t=>!have.has(t.id))); S.trials.sort((a,b)=>a.ts-b.ts);
      toast('追加しました');
    } else if (act==='replace' && d){
      setS(normalize({settings:d.settings||S.settings, trials:d.trials, peeks:d.peeks||0, sample:false}));
      toast('置き換えました');
    }
    pendingImport = null; $('impConfirm').hidden = true;
    if (act!=='cancel'){ draft.shown = prefill(); draft.b = prefillB(); save(); renderAll(); }
  });
  $('resetBtn').onclick = () => { $('resetConfirm').hidden = false; };
  $('resetNo').onclick = () => { $('resetConfirm').hidden = true; };
  $('resetYes').onclick = () => { setS(fresh()); save(); resetInput(); renderAll(); $('resetConfirm').hidden = true; toast('全データを削除しました'); };
}
