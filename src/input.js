// Values derived from the saved state and the draft: defaults after recording and the current input.

import { $, clamp } from './util.js';
import { S, draft } from './state.js';

function lastTrial(){ for (let i=S.trials.length-1;i>=0;i--) if (!S.trials[i].void && !S.trials[i].sample) return S.trials[i]; return null; }
export function prefill(){ const t = lastTrial(); return t ? Math.max(0, t.shown - 1) : S.settings.initDeck; }
export const bMax = () => Math.max(0, S.settings.maxCopies - S.settings.returnCount);
export function prefillB(){ const t = lastTrial(); return t ? clamp(t.k - t.y, 0, bMax()) : bMax(); }
export function chipBase(){ const t = lastTrial(); return t ? t.shown : S.settings.initDeck; }
export function currentInput(){
  const st = S.settings, shown = draft.shown, r = st.returnCount, m = st.drawCount, k = draft.b==null ? null : draft.b + r;
  const N = shown==null ? null : shown + r;
  const issues = [];
  if (shown==null) issues.push({t:'使用前の山札枚数を選んでください', info:true});
  if (k==null) issues.push({t:'戻す前に山札にある対象カードの枚数を選んでください', info:true});
  if (N!=null && k!=null && k>N) issues.push({t:`k（${k}）が山札枚数 N（${N}）を超えています`});
  if (N!=null && m>N) issues.push({t:`引く枚数（${m}）が山札枚数を超えています`});
  return {shown, k, r, m, N, issues};
}
