// User actions that change the saved state: record, undo, redo, and resetting the input.

import { $, toast, uid } from './util.js';
import { S, clearSample, draft, save } from './state.js';
import { bMax, currentInput, prefill, prefillB } from './input.js';
import { renderAll, renderInput } from './render.js';

export function record(y){
  const inp = currentInput();
  if (inp.issues.length) { renderInput(); return; }
  if (S.sample) clearSample();
  S.trials.push({id:uid(), ts:Date.now(), shown:inp.shown, r:inp.r, m:inp.m, N:inp.N, k:inp.k, y, void:false});
  Object.assign(draft, {shown:prefill(), b:prefillB()});
  save(); renderAll();
  toast(`#${S.trials.length} を記録（${inp.m===1 ? (y?'引いた':'引かなかった') : y+'枚引いた'}）`);
}
export function undo(){
  for (let i=S.trials.length-1;i>=0;i--){
    const t = S.trials[i];
    if (!t.void){ t.void = true; t.voidedAt = Date.now(); draft.shown = prefill(); draft.b = prefillB(); save(); renderAll(); toast(`#${i+1} を取り消しました`); return; }
  }
}
export function redo(){
  const t = S.trials.at(-1);
  if (t && t.void){ t.void = false; delete t.voidedAt; draft.shown = prefill(); draft.b = prefillB(); save(); renderAll(); toast('取り消しを戻しました'); }
}

export function resetInput(){ Object.assign(draft, {b:bMax(), shown:S.settings.initDeck}); $('kOther').value = ''; $('shownInput').value = draft.shown; renderInput(); }
