// Website logic that does not need express: login codes, sessions, profile pictures, leaderboard.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const db = require('./db');
const D = require('./data');
const R = require('./rpg');
const M = require('./media');
const S = require('./shop');

const DATA_DIR = process.env.DATA_DIR || '.';
const UPLOADS = path.join(DATA_DIR, 'uploads');
const WEB = path.join(__dirname, '..', 'web');
fs.mkdirSync(UPLOADS, { recursive: true });
db.data.sessions = db.data.sessions || {};

const GALLERY = [{ key: 'dementor-girl', file: 'gallery/dementor-girl.jpg', title: 'Dementor!' }];
const MAX_PFP = 500 * 1024;
const EXT = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };

const sha = s => crypto.createHash('sha256').update(s).digest('hex');
const baseUrl = () => (process.env.PUBLIC_URL || process.env.RENDER_EXTERNAL_URL || 'http://localhost:' + (process.env.PORT || 3000)).replace(/\/$/, '');

// ---- login codes (one-time, 10 minutes) ----
const codes = new Map();
const ALPHA = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
function makeCode(uid) {
  const now = Date.now();
  for (const [k, v] of codes) { if (v.exp < now) codes.delete(k); }
  const mine = Array.from(codes.entries()).filter(e => e[1].uid === uid);
  if (mine.length >= 3) codes.delete(mine[0][0]);
  let c = ''; const b = crypto.randomBytes(8);
  for (let i = 0; i < 8; i++) c += ALPHA[b[i] % ALPHA.length];
  codes.set(c, { uid: uid, exp: now + 10 * 60000 });
  return c;
}
function redeem(code) {
  const c = String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const v = codes.get(c); if (!v) return null;
  codes.delete(c);
  if (v.exp < Date.now() || !db.data.users[v.uid]) return null;
  return v.uid;
}

// ---- sessions (stored hashed, 7 days) ----
function newSession(uid) {
  const now = Date.now();
  Object.keys(db.data.sessions).forEach(h => { if (db.data.sessions[h].exp < now) delete db.data.sessions[h]; });
  const token = crypto.randomBytes(32).toString('hex');
  db.data.sessions[sha(token)] = { uid: uid, exp: now + 7 * 86400000 };
  db.save(); return token;
}
function sessionUser(token) {
  if (!token) return null;
  const s = db.data.sessions[sha(token)];
  if (!s || s.exp < Date.now()) return null;
  const u = db.data.users[s.uid]; if (u) db.getUser(u.id);
  return u || null;
}
function endSession(token) { if (token) { delete db.data.sessions[sha(token)]; db.save(); } }

// ---- public id + profile picture ----
const pidIndex = new Map();
function pid(u) { if (!u.pid) { u.pid = crypto.randomBytes(5).toString('hex'); db.save(); } return u.pid; }
function byPid(p) {
  let id = pidIndex.get(p); if (id && db.data.users[id] && db.data.users[id].pid === p) return db.data.users[id];
  const u = Object.values(db.data.users).find(x => x.pid === p); if (u) pidIndex.set(p, u.id); return u || null;
}
function webState(u) { if (!u.web) u.web = { pfp: null, v: 0 }; return u.web; }
function pfpUrl(u) { const w = webState(u); return w.pfp ? '/pfp/' + pid(u) + '?v=' + (w.v || 0) : null; }
function pfpPath(u) {
  const p = webState(u).pfp; if (!p) return null;
  if (p.kind === 'upload') return { file: path.join(UPLOADS, path.basename(p.file)), type: EXT[p.file.split('.').pop()] || 'image/jpeg' };
  const g = GALLERY.find(x => x.key === p.key); return g ? { file: path.join(WEB, g.file), type: 'image/jpeg' } : null;
}
function pfpBuffer(u) { const p = pfpPath(u); if (!p) return null; try { return fs.readFileSync(p.file); } catch (e) { return null; } }

function detectExt(b) {
  if (b.length > 12 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'png';
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'jpg';
  if (b.length > 12 && b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP') return 'webp';
  return null;
}
function dropUpload(u) { const p = webState(u).pfp; if (p && p.kind === 'upload') { try { fs.unlinkSync(path.join(UPLOADS, path.basename(p.file))); } catch (e) {} } }
function savePfp(u, dataUrl) {
  const m = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/.exec(String(dataUrl || ''));
  if (!m) return { ok: false, msg: 'Choose a PNG, JPG or WebP image.' };
  const buf = Buffer.from(m[2], 'base64');
  if (buf.length > MAX_PFP) return { ok: false, msg: 'That image is too large (max 500 KB).' };
  const ext = detectExt(buf); if (!ext) return { ok: false, msg: 'That file is not a valid image.' };
  dropUpload(u);
  const file = pid(u) + '-' + crypto.randomBytes(4).toString('hex') + '.' + ext;
  fs.writeFileSync(path.join(UPLOADS, file), buf);
  const w = webState(u); w.pfp = { kind: 'upload', file: file }; w.v = Date.now(); db.save();
  return { ok: true };
}
function setGallery(u, key) {
  if (!GALLERY.find(g => g.key === key)) return { ok: false, msg: 'Picture not found.' };
  dropUpload(u); const w = webState(u); w.pfp = { kind: 'gallery', key: key }; w.v = Date.now(); db.save(); return { ok: true };
}
function clearPfp(u) { dropUpload(u); const w = webState(u); w.pfp = null; w.v = Date.now(); db.save(); return { ok: true }; }
function setName(u, name) {
  const n = String(name || '').replace(/[^\p{L}\p{N} _\-]/gu, '').trim().replace(/\s+/g, ' ').slice(0, 20);
  if (n.length < 2) return { ok: false, msg: 'Names need at least 2 letters or numbers.' };
  u.name = n; u.registered = true; db.save(); return { ok: true, name: n };
}

// ---- data for the site ----
function rankOf(u) { return db.ranked().findIndex(x => x.id === u.id) + 1; }
function leaderboard(by, limit) {
  const key = by === 'coins' ? u => u.coins : by === 'kills' ? u => u.rpg.kills : u => u.level * 1e6 + u.xp;
  const list = Object.values(db.data.users).filter(u => u.registered || u.level > 1 || u.rpg.kills > 0 || u.xp > 0);
  list.forEach(u => db.getUser(u.id));
  return list.sort((a, b) => key(b) - key(a)).slice(0, Math.min(limit || 50, 100)).map((u, i) => ({
    rank: i + 1, name: u.name, level: u.level, xp: u.xp, coins: u.coins, kills: u.rpg.kills, pfp: pfpUrl(u), pid: pid(u),
  }));
}
function me(u) {
  const s = R.stats(u), sm = D.ALL[(u.soulmate || 0) - 1];
  return {
    name: u.name, pid: pid(u), pfp: pfpUrl(u), level: u.level, xp: u.xp, xpNeeded: u.xpNeeded, coins: u.coins, gems: u.gems, rank: rankOf(u), players: Object.keys(db.data.users).length,
    charm: s.charm, masks: s.hp, hp: R.curHp(u), damage: Math.round(s.dmg * (1 + s.dmgPct / 100)), crit: s.crit, xpBonus: s.xp,
    kills: u.rpg.kills, quests: u.rpg.done.length, bosses: Object.keys(u.rpg.bosses).length, zone: D.ZONES[u.rpg.zone].n, streak: u.streak,
    soulmate: sm ? { name: sm.name, anime: sm.anime, bond: u.soulmateLv, img: M.cachedChar(sm.name, sm.anime) } : null,
    dna: u.dna ? u.dna.parts : null,
    gallery: GALLERY.map(g => ({ key: g.key, title: g.title, url: '/' + g.file })),
  };
}
function shopList(u) {
  return D.SHOP.map(it => ({ id: it.id, name: it.name, emoji: it.emoji, price: it.price, cat: it.cat, desc: it.desc, owned: u ? S.owned(u, it) : false }));
}

module.exports = { UPLOADS, WEB, baseUrl, makeCode, redeem, newSession, sessionUser, endSession, pid, byPid, pfpUrl, pfpPath, pfpBuffer, savePfp, setGallery, clearPfp, setName, leaderboard, me, shopList, rankOf, GALLERY, CATS: D.CATS };
