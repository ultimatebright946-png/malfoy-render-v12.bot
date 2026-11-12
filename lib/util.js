const rnd = n => Math.floor(Math.random() * n);
const pick = a => a[rnd(a.length)];
const between = (a, b) => a + rnd(b - a + 1);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const num = jid => String(jid || '').split('@')[0].split(':')[0];
const fmt = ms => { ms = Math.max(0, ms); const s = Math.floor(ms / 1000); return Math.floor(s / 3600) + 'h ' + Math.floor((s % 3600) / 60) + 'm ' + (s % 60) + 's'; };
const bar = (p, n) => { n = n || 10; p = Math.max(0, Math.min(100, p)); const f = Math.round(p / 100 * n); return '█'.repeat(f) + '░'.repeat(n - f); };

// type: json | text | buf
async function http(url, o) {
  o = o || {};
  const c = new AbortController(); const to = setTimeout(() => c.abort(), o.t || 8000);
  try {
    const r = await fetch(url, { signal: c.signal, method: o.method || 'GET', body: o.body, headers: Object.assign({ 'User-Agent': 'Mozilla/5.0' }, o.headers || {}) });
    if (!r.ok) return null;
    if (o.type === 'buf') { const ab = await r.arrayBuffer(); return ab.byteLength > 200 ? Buffer.from(ab) : null; }
    const x = await r.text();
    if (o.type === 'text') return x;
    try { return JSON.parse(x); } catch (e) { return null; }
  } catch (e) { return null; } finally { clearTimeout(to); }
}

function calc(e) {
  if (!/^[0-9+\-*/(). %]+$/.test(e) || e.length > 60) return null;
  try { const r = Function('"use strict";return (' + e + ')')(); return typeof r === 'number' && isFinite(r) ? r : null; } catch (err) { return null; }
}

module.exports = { rnd, pick, between, sleep, num, fmt, bar, http, calc };
