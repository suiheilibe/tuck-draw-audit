// Checks analyze() against an independent brute-force computation that enumerates every combination of outcomes.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyze } from '../src/stats.js';

const C = (n, r) => { if (r < 0 || r > n) return 0; let c = 1; for (let i = 1; i <= r; i++) c = c * (n - r + i) / i; return c; };
const pmf = ({ N, k, m }) => Array.from({ length: m + 1 }, (_, y) => C(k, y) * C(N - k, m - y) / C(N, m));
const trial = (N, k, y, m = 1, extra = {}) => ({ id: String(Math.random()), ts: 0, shown: N - 1, r: 1, m, N, k, y, void: false, ...extra });

// Distribution of S by walking every combination of per-trial outcomes (no convolution).
function bruteForce(trials) {
  const dist = [];
  const walk = (i, s, p) => {
    if (i === trials.length) { dist[s] = (dist[s] ?? 0) + p; return; }
    pmf(trials[i]).forEach((q, y) => { if (q > 0) walk(i + 1, s + y, p * q); });
  };
  walk(0, 0, 1);
  for (let x = 0; x < dist.length; x++) dist[x] ??= 0;
  const s = trials.reduce((a, t) => a + t.y, 0), ref = dist[s];
  return { mu: trials.reduce((a, t) => a + t.m * t.k / t.N, 0), p: Math.min(1, dist.reduce((a, x) => x <= ref * (1 + 1e-7) ? a + x : a, 0)) };
}

test('worked example from the method panel: two draws from N=36, k=3, one hit', () => {
  const a = analyze([trial(36, 3, 1), trial(36, 3, 0)]);
  assert.equal(a.n, 2);
  assert.equal(a.s, 1);
  assert.ok(Math.abs(a.mu - 1 / 6) < 1e-12);
  // P(S=1) = 2·(3/36)(33/36) = 0.15278, P(S=2) = (3/36)^2 = 0.00694; both are ≤ P(S=1), P(S=0) = 0.84 is not
  assert.ok(Math.abs(a.p - (2 * (3 / 36) * (33 / 36) + (3 / 36) ** 2)) < 1e-12, a.p);
});

test('matches brute force on random one-card and multi-card trials', () => {
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let run = 0; run < 200; run++) {
    const trials = Array.from({ length: 1 + Math.floor(rnd() * 7) }, () => {
      const m = 1 + Math.floor(rnd() * 3), N = m + 1 + Math.floor(rnd() * 20), k = Math.floor(rnd() * Math.min(N, 5));
      return trial(N, k, Math.floor(rnd() * (Math.min(k, m) + 1)), m);
    });
    const a = analyze(trials), b = bruteForce(trials);
    assert.ok(Math.abs(a.mu - b.mu) < 1e-12, `mu run ${run}`);
    assert.ok(Math.abs(a.p - b.p) < 1e-9, `p run ${run}: ${a.p} vs ${b.p} for ${JSON.stringify(trials.map(t => [t.N, t.k, t.m, t.y]))}`);
  }
});

test('the variance matches the hypergeometric formula', () => {
  const t = trial(20, 4, 1, 3), q = pmf(t), mean = q.reduce((a, p, y) => a + p * y, 0);
  const variance = q.reduce((a, p, y) => a + p * (y - mean) ** 2, 0);
  assert.ok(Math.abs(analyze([t]).cum[0].sd ** 2 - variance) < 1e-12);
});

test('draws that must contain the target card, and decks of any size', () => {
  // N=5, k=4, m=3: only one non-target card, so y is 2 or 3. P(2) = C(4,2)·C(1,1)/C(5,3) = 0.6
  for (const y of [2, 3]) {
    const t = trial(5, 4, y, 3);
    assert.ok(Math.abs(analyze([t]).p - bruteForce([t]).p) < 1e-12, `y=${y}`);
  }
  assert.ok(Math.abs(analyze([trial(5, 4, 3, 3)]).p - 0.4) < 1e-12);
  // A large deck: P(S=1) = 2·(3/1000)(997/1000), P(S=2) = (3/1000)^2
  const a = analyze([trial(1000, 3, 1), trial(1000, 3, 0)]);
  assert.ok(Math.abs(a.p - (2 * 0.003 * 0.997 + 0.003 ** 2)) < 1e-12, a.p);
});

test('void and impossible records are left out', () => {
  const a = analyze([trial(36, 3, 1), trial(36, 3, 1, 1, { void: true }), trial(5, 6, 0), trial(3, 1, 0, 4)]);
  assert.equal(a.n, 1);
  assert.equal(a.s, 1);
});

test('no records: no p-value or Z', () => {
  const a = analyze([]);
  assert.deepEqual([a.n, a.s, a.mu, a.p, a.z, a.cum.length], [0, 0, 0, null, null, 0]);
});

test('extreme results give a tiny p-value, the expected result gives p = 1', () => {
  assert.ok(analyze(Array.from({ length: 30 }, () => trial(10, 3, 1))).p < 1e-10);
  assert.equal(analyze([trial(2, 1, 1, 2)]).p, 1);   // drawing the whole deck: S is certain
});
