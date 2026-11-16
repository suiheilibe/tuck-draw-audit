// Saved state (settings, trials, peeks), the unsaved input draft, and localStorage.

import { $ } from './util.js';

export const LS_KEY = 'svbd.v2';
const LS_OLD = 'svbd.v1';
const DEF = {targetName:'', effectName:'', initDeck:35, maxCopies:3, returnCount:1, drawCount:1, targetTrials:300, hideP:true};

export let S;  // the whole saved state; replace it only through setS()
let saveOk = true, lastSaved = null;
export const setS = v => { S = v; };
export const draft = {shown:null, b:null};  // b: target copies in the deck before returning; k = b + r

export function fresh(){ return {v:2, settings:{...DEF}, trials:[], peeks:0, sample:false}; }
export function cleanTrial(t){
  return {id:String(t.id), ts:+t.ts||Date.now(), shown:+t.shown, r:+t.r||1, m:+t.m||1, N:+t.N, k:+t.k, y:+t.y,
    void:!!t.void, ...(t.voidedAt?{voidedAt:+t.voidedAt}:{}), ...(t.sample?{sample:true}:{})};
}
export function normalize(s){
  const o = fresh();
  if (!s || typeof s !== 'object') return o;
  const st = {...DEF}; for (const k in DEF) if (s.settings && k in s.settings) st[k] = s.settings[k];
  o.settings = st;
  o.trials = Array.isArray(s.trials) ? s.trials.map(cleanTrial).filter(t => !t.sample) : [];
  o.peeks = s.sample ? 0 : s.peeks|0;
  return o;
}
export function load(){
  try {
    const raw = localStorage.getItem(LS_KEY) ?? localStorage.getItem(LS_OLD);
    if (raw) return normalize(JSON.parse(raw));
  } catch(e){}
  return fresh();
}
export function save(){
  try { localStorage.setItem(LS_KEY, JSON.stringify(S)); saveOk = true; lastSaved = new Date(); }
  catch(e){ saveOk = false; }
  renderSave();
}
export function renderSave(){
  const el = $('saveState');
  if (!saveOk){ el.textContent = '自動保存できません'; el.classList.add('warn'); return; }
  el.classList.remove('warn');
  el.textContent = lastSaved ? `保存 ${lastSaved.toLocaleTimeString('ja-JP',{hour:'2-digit',minute:'2-digit'})}` : '自動保存オン';
}
export function clearSample(){ S.trials = S.trials.filter(t => !t.sample); S.sample = false; S.peeks = 0; }
