// Entry point: attaches event handlers, then loads the saved state and draws the page.

import { $, clamp, num, toast } from './util.js';
import { LS_KEY, S, draft, load, normalize, renderSave, save, setS } from './state.js';
import { chipBase, prefill, prefillB } from './input.js';
import { renderAll, renderInput, renderStats, reveal } from './render.js';
import { record, redo, resetInput, undo } from './actions.js';
import { initIo } from './io.js';

/* ---------- sheets ---------- */
let openSheet = null;
function showSheet(id){
  if (openSheet === id){ hideSheet(); return; }
  hideSheet(true);
  openSheet = id; $(id).hidden = false; $('scrim').hidden = false;
  $(id==='settingsSheet'?'openSettings':'openData').setAttribute('aria-pressed','true');
  $(id).querySelector('[data-close]').focus();
}
function hideSheet(silent){
  if (!openSheet) return;
  const btn = $(openSheet==='settingsSheet'?'openSettings':'openData');
  $(openSheet).hidden = true; $('scrim').hidden = true; btn.setAttribute('aria-pressed','false');
  openSheet = null; if (!silent) btn.focus();
}
$('openSettings').onclick = () => showSheet('settingsSheet');
$('openData').onclick = () => showSheet('dataSheet');
$('scrim').onclick = () => hideSheet();
document.querySelectorAll('[data-close]').forEach(b => b.onclick = () => hideSheet());

/* ---------- events ---------- */
$('results').addEventListener('click', e => { const b = e.target.closest('button'); if (b && !b.disabled) record(+b.dataset.y); });
$('undoBtn').onclick = undo;
$('redoBtn').onclick = redo;
$('peekBtn').onclick = () => { reveal(); S.peeks++; save(); renderStats(); };
const stepShown = d => { draft.shown = clamp((draft.shown ?? chipBase()) + d, 0, 99); renderInput(); };
$('shownDown').onclick = () => stepShown(-1);
$('shownUp').onclick = () => stepShown(1);
$('shownDown10').onclick = () => stepShown(-10);
$('shownUp10').onclick = () => stepShown(10);
$('shownInput').addEventListener('input', e => { draft.shown = e.target.value==='' ? null : clamp(num(e.target.value,0),0,99); renderInput(); });
$('kOther').addEventListener('input', e => { draft.b = e.target.value==='' ? null : clamp(num(e.target.value,0),0,99); renderInput(); });
$('resetInput').onclick = resetInput;

const bindSet = (id, key, isNum, min, max) => $(id).addEventListener('change', e => {
  S.settings[key] = isNum ? clamp(num(e.target.value, S.settings[key]), min, max) : e.target.value.trim();
  save(); renderAll();
});
bindSet('setTarget','targetName'); bindSet('setEffect','effectName');
bindSet('setR','returnCount',true,1,10); bindSet('setM','drawCount',true,1,10);
bindSet('setDeck','initDeck',true,1,99); bindSet('setMax','maxCopies',true,1,10);
bindSet('setTargetN','targetTrials',true,10,10000);
$('setHideP').addEventListener('change', e => { S.settings.hideP = e.target.checked; save(); renderStats(); });

document.addEventListener('keydown', e => {
  if (e.key==='Escape' && openSheet){ hideSheet(); return; }
  if (e.key==='Escape'){ resetInput(); return; }
  const tg = e.target.tagName;
  // Ctrl/Cmd+Z and Ctrl+Y act on records, except inside text fields where the browser's own undo applies
  if ((e.ctrlKey||e.metaKey) && !e.altKey && !openSheet && tg!=='INPUT' && tg!=='TEXTAREA'){
    const k = e.key.toLowerCase();
    if (k==='z' && !e.shiftKey){ e.preventDefault(); undo(); return; }
    if (k==='y' || (k==='z' && e.shiftKey)){ e.preventDefault(); redo(); return; }
  }
  if (openSheet || tg==='INPUT'||tg==='TEXTAREA'||tg==='SELECT'||e.metaKey||e.ctrlKey||e.altKey) return;
  const k = e.key.toLowerCase(), m = S.settings.drawCount, keys = 'zxcvbnm';
  if (e.key==='ArrowUp'){ e.preventDefault(); stepShown(1); }
  else if (e.key==='ArrowDown'){ e.preventDefault(); stepShown(-1); }
  else if (/^[0-9]$/.test(k)){ draft.b = +k; $('kOther').value=''; renderInput(); }
  else if (m===1 && k==='y') record(1);
  else if (m===1 && k==='n') record(0);
  else if (m>1 && keys.includes(k) && keys.indexOf(k)<=m) record(keys.indexOf(k));
});
window.addEventListener('storage', e => { if (e.key===LS_KEY && e.newValue){ try{ setS(normalize(JSON.parse(e.newValue))); renderAll(); }catch(_){} } });

let wake = null;
if ('wakeLock' in navigator){
  const wb = $('wakeBtn'); wb.hidden = false;
  wb.onclick = async () => {
    if (wake){ try{ await wake.release(); }catch(e){} return; }
    try {
      wake = await navigator.wakeLock.request('screen'); wb.setAttribute('aria-pressed','true');
      wake.addEventListener('release', () => { wake=null; wb.setAttribute('aria-pressed','false'); });
    } catch(e){ wb.hidden = true; toast('この画面では使えません'); }
  };
}

/* ---------- start ---------- */
initIo();
setS(load());
draft.shown = prefill(); draft.b = prefillB();
renderAll(); renderSave();
