// User actions that change the saved state: record, undo, redo, and resetting the input.

import { $, toast, uid } from './util.js';
import { S, clearSample, draft, redoStack, save } from './state.js';
import { bMax, currentInput, prefill, prefillB } from './input.js';
import { renderAll, renderInput } from './render.js';

export function record(y){
  const inp = currentInput();
  if (inp.issues.length) { renderInput(); return; }
  if (S.sample) clearSample();
  redoStack.length = 0;
  S.trials.push({id:uid(), ts:Date.now(), shown:inp.shown, r:inp.r, m:inp.m, N:inp.N, k:inp.k, y, void:false});
  Object.assign(draft, {shown:prefill(), b:prefillB()});
  save(); renderAll();
  toast(`#${S.trials.length} を記録（${inp.m===1 ? (y?'引いた':'引かなかった') : y+'枚引いた'}）`);
}
// Undo voids the newest valid record and puts its input back so it can be entered again.
export function undo(){
  const i = S.trials.findLastIndex(t => !t.void);
  if (i<0) return;
  const t = S.trials[i];
  t.void = true; t.voidedAt = Date.now(); redoStack.push(t.id);
  Object.assign(draft, {shown:t.shown, b:t.k - t.r}); $('kOther').value = '';
  save(); renderAll(); toast(`#${i+1} を元に戻しました`);
}
// Redo restores the records voided by undo, newest undo first. Recording something new clears the stack.
export function redo(){
  while (redoStack.length){
    const id = redoStack.pop(), i = S.trials.findIndex(t => t.id===id), t = S.trials[i];
    if (!t || !t.void) continue;
    t.void = false; delete t.voidedAt;
    Object.assign(draft, {shown:prefill(), b:prefillB()}); $('kOther').value = '';
    save(); renderAll(); toast(`#${i+1} をやり直しました`); return;
  }
  renderAll();
}

export function resetInput(){ Object.assign(draft, {b:bMax(), shown:S.settings.initDeck}); $('kOther').value = ''; $('shownInput').value = draft.shown; renderInput(); }
