// In-memory database with debounced, atomic disk writes (fast replies, no disk wait).
const fs = require('fs');
const D = require('./data');
const DIR = (process.env.DATA_DIR || '.') + '/database';
fs.mkdirSync(DIR, { recursive: true });
const FILE = DIR + '/db.json';
const VER = 3;

let data = {};
try { data = JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch (e) { data = {}; }
data.users = data.users || {}; data.sessions = data.sessions || {}; data.muted = data.muted || {}; data.groups = data.groups || {};

let timer = null;
function save() {
  if (timer) return;
  timer = setTimeout(function () {
    timer = null;
    fs.writeFile(FILE + '.tmp', JSON.stringify(data), function (e) { if (!e) fs.rename(FILE + '.tmp', FILE, function () {}); });
  }, 1500);
}
function flush() { try { fs.writeFileSync(FILE, JSON.stringify(data)); } catch (e) {} }
['SIGTERM', 'SIGINT'].forEach(function (s) { process.on(s, function () { flush(); process.exit(0); }); });

function defaults(jid, name) {
  return {
    id: jid, name: name || 'User', gender: 'male', age: 18, level: 1, xp: 0, xpNeeded: 100, coins: 1000, gems: 5, treasures: 0,
    streak: 0, lastDaily: 0, lastWork: 0, lastMsgXp: 0, soulmate: 0, soulmateLv: 0,
    miners: [{ id: 1, status: 'IDLE', startedAt: 0, endsAt: 0 }, { id: 2, status: 'IDLE', startedAt: 0, endsAt: 0 }, { id: 3, status: 'LOCKED', startedAt: 0, endsAt: 0 }, { id: 4, status: 'LOCKED', startedAt: 0, endsAt: 0 }],
    companion: { name: 'YUNA', bond: 55, energy: 90, mood: 'Happy' }, characters: {}, inventory: [], guild: 'Griffin Guild',
    activeChar: 'malfoy', lifelongChar: '', registered: false, banned: false, warns: 0,
    rpg: { hp: 5, soul: 0, zone: 'dirtmouth', quests: {}, done: [], charms: [], equipped: [], kills: 0, bosses: {}, journal: {}, lastRest: 0, lastExplore: 0, lastBoss: 0, deaths: 0, shade: null, explores: 0 },
  };
}
function ensure(u) {
  if (u._v === VER) return;
  const d = defaults(u.id, u.name);
  for (const k in d) if (u[k] === undefined) u[k] = d[k];
  for (const k in d.rpg) if (u.rpg[k] === undefined) u.rpg[k] = d.rpg[k];
  if (u.lifelongChar === 'zerotwo') u.lifelongChar = 'erza';
  if (u.activeChar === 'zerotwo') u.activeChar = 'erza';
  if (u.soulmate > D.ALL.length) u.soulmate = 0;
  D.CHARS.forEach(function (c) { if (!u.characters[c]) u.characters[c] = { bond: 20, mood: 'Neutral' }; });
  u._v = VER;
}
function getUser(jid, name) {
  let u = data.users[jid];
  if (!u) u = data.users[jid] = defaults(jid, name);
  ensure(u);
  if (name && (u.name === 'User' || !u.registered)) u.name = name;
  return u;
}
function groupCfg(jid) { if (!data.groups[jid]) data.groups[jid] = { antilink: false, welcome: false }; return data.groups[jid]; }
function muted(jid) { if (!data.muted[jid]) data.muted[jid] = []; return data.muted[jid]; }
const score = u => u.level * 100000 + u.xp;
function ranked() { return Object.values(data.users).sort((a, b) => score(b) - score(a)); }

module.exports = { data, save, flush, getUser, groupCfg, muted, score, ranked };
