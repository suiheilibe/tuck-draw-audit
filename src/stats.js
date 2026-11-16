// Exact null distribution of S = ΣY by convolving per-trial hypergeometric distributions. No DOM.

const LF = [0]; for (let i=1;i<=400;i++) LF[i] = LF[i-1] + Math.log(i);
const lC = (n,r) => (r<0||r>n) ? -Infinity : LF[n]-LF[r]-LF[n-r];
const hyper = (N,k,m) => Array.from({length:m+1}, (_,y) => Math.exp(lC(k,y)+lC(N-k,m-y)-lC(N,m)));
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
