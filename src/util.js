// Small DOM and number helpers shared by every module.

export const $ = id => document.getElementById(id);
export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2,7);
export const clamp = (v,a,b) => Math.min(b, Math.max(a, v));
export const num = (v, d) => { const n = parseInt(v, 10); return Number.isFinite(n) ? n : d; };
export const esc = s => String(s).replace(/[&<>"]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

let toastTimer;
export function toast(msg){ const t=$('toast'); t.textContent=msg; t.hidden=false; clearTimeout(toastTimer); toastTimer=setTimeout(()=>t.hidden=true, 1800); }
