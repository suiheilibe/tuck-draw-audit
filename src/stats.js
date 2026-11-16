// Exact null distribution of S = ΣY by convolving per-trial hypergeometric distributions. No DOM.

// Hypergeometric pmf H(N,k,m) without factorials: the smallest possible y as a product of small fractions,
// then P(y+1) = P(y)·(k−y)(m−y) / ((y+1)(N−k−m+y+1)).
function hyper(N,k,m){
  const lo = Math.max(0, m-(N-k)), hi = Math.min(k,m), out = new Array(m+1).fill(0);
  // P(lo) is C(N−k,m)/C(N,m) when lo = 0, and C(k,N−m)/C(N,N−m) when every non-target card is drawn.
  const [top, len] = lo ? [k, N-m] : [N-k, m];
  let p = 1; for (let i=0;i<len;i++) p *= (top-i)/(N-i);
  for (let y=lo;y<=hi;y++){ out[y] = p; p *= (k-y)*(m-y)/((y+1)*(N-k-m+y+1)); }
  return out;
}
function conv(a,b){
  const o = new Array(a.length+b.length-1).fill(0);
  for (let i=0;i<a.length;i++){ if(!a[i]) continue; for (let j=0;j<b.length;j++) o[i+j]+=a[i]*b[j]; }
  return o;
}
export function analyze(trials){
  const list = trials.filter(t => !t.void && t.N>0 && t.k>=0 && t.k<=t.N && t.m<=t.N);
  let s=0, mu=0, v=0, dist=[1]; const cum = [];
  for (const t of list){
    const pk = t.k/t.N;
    mu += t.m*pk;
    v  += t.N>1 ? t.m*pk*(1-pk)*(t.N-t.m)/(t.N-1) : 0;
    s  += t.y;
    dist = conv(dist, hyper(t.N,t.k,t.m));
    cum.push({s, mu, sd:Math.sqrt(v)});
  }
  let p = null, z = null;
  if (list.length){
    z = v>0 ? (s-mu)/Math.sqrt(v) : 0;
    const ref = dist[s] ?? 0;
    p = Math.min(1, dist.reduce((a,x)=> x <= ref*(1+1e-7) ? a+x : a, 0));
  }
  return {n:list.length, s, mu, cum, z, p};
}
