const reg = require('../lib/registry');
const db = require('../lib/db');
const M = require('../lib/media');
const AI = require('../lib/ai');
const D = require('../lib/data');
const R = require('../lib/rpg');
const { http, calc, fmt, pick, num, bar } = require('../lib/util');

const PREFIX = process.env.PREFIX || '.';
const START = Date.now();
const CATEMO = { GENERAL: '🧭', QUEST: '🗡️', ECONOMY: '💰', SOCIAL: '💘', MEDIA: '🎵', ADMIN: '🛡️' };

const VERSION = '12.0.0';
const GROUPS = [
  ['🏘️', 'DIRTMOUTH', 'General', ['menu', 'help', 'ping', 'exp', 'rank', 'top', 'alive', 'uptime', 'owner', 'calc', 'weather', 'speak', 'tts', 'dice', 'flip', 'roll', '8ball', 'joke', 'fact', 'quote']],
  ['🗡️', 'THE KNIGHT\'S PATH', 'Quests', ['quests', 'accept', 'abandon', 'explore', 'boss', 'rest', 'map', 'travel', 'gear', 'charms', 'equip', 'unequip']],
  ['💰', 'SLY\'S SHOP', 'Economy', ['register', 'profile', 'stats', 'weblogin', 'balance', 'daily', 'work', 'mine', 'collect', 'shop', 'buy', 'inventory', 'use', 'give', 'pay']],
  ['🔮', 'THE SEER', 'AI', ['ai', 'chat', 'ask']],
  ['🛡️', 'WATCHERS\' KEEP', 'Admin', ['tagall', 'everyone', 'hidetag', 'infogc', 'link', 'invite', 'out', 'open', 'close', 'kick', 'promote', 'demote', 'add', 'mute', 'unmute', 'warn', 'antilink', 'welcome']],
  ['🎞️', 'GRIMM TROUPE', 'Media', ['play', 'song', 'ytmp3', 'ytmp4', 'video', 'tiktok', 'sticker', 'toimage', 'tomp3', 'image', 'pinterest', 'pfp', 'character']],
  ['🕯️', 'NIGHTMARE TROUPE', 'Fun', ['kill', 'ship', 'slap', 'hug', 'kiss', 'pat', 'cuddle', 'poke', 'bite', 'punch', 'kick', 'wave']],
  ['🏟️', 'COLOSSEUM OF FOOLS', 'Games', ['slots', 'gamble', 'dice', 'flip']],
  ['🌸', 'QUEEN\'S GARDENS', 'Anime', ['waifu', 'neko', 'sm', 'soulmate', 'pursue', 'mysm', 'charm', 'characters', 'animedna']],
  ['🪲', 'BUG COMPANIONS', 'Characters', ['char', 'talk']],
];
const LINES = ['The light of Hallownest is fading. Press on, Wanderer.', 'Rest at a bench, then descend again.', 'Every shell has a story. Write yours.', 'Beneath the city, something stirs.', 'Geo is only useful when spent.'];
function buildMenu(name, u) {
  let hud = '';
  if (u) { const s = R.stats(u); hud = '\n🎖️ Level *' + u.level + '*   💰 *' + u.coins + '* Geo\n' + R.masks(R.curHp(u), s.hp) + '\n📍 ' + D.ZONES[u.rpg.zone].e + ' ' + D.ZONES[u.rpg.zone].n + '\n'; }
  let t = '╭━━━『 🪲 *MALFOY* 』━━━╮\n┃  ⟡ H A L L O W N E S T ⟡\n╰━━━━━━━━━━━━━━━━━╯\n\n👋 Welcome, *' + (name || 'Wanderer') + '*\n' + hud + '\n⚡ Prefix: ' + PREFIX + '\n📦 Total Commands: ' + reg.count() + '\n👑 Owner: Benjamin\n🤖 BOT: Malfoy - GOKU AWARDED\n\n_' + LINES[Math.floor(Math.random() * LINES.length)] + '_\n';
  GROUPS.forEach(g => {
    const l = g[3].filter(n => reg.get(n)); if (!l.length) return;
    t += '\n┏━━━━━━━━━━━━━━━━━\n┃ ' + g[0] + ' ' + g[1] + '\n┃ _' + g[2] + '_\n┗━━━━━━━━━━━━━━━━━\n' + l.map(n => '│ ◈ ' + PREFIX + n).join('\n') + '\n';
  });
  return t + '\n╰━━━━━━━━━━━━━━━━━\n\n🪑 Tired? Use *' + PREFIX + 'rest* at the bench.\n💡 Type ' + PREFIX + 'help <command> for more info\n🌟 Bot Version: ' + VERSION + ' Malfoy - GOKU AWARDED';
}
reg.add(['menu', 'commands'], 'GENERAL', c => M.image(c.sock, c.jid, [M.local('menu')], buildMenu(c.u.name || c.msg.pushName || '', c.u), [], c.msg));
reg.add('help', 'GENERAL', c => {
  const n = c.args[0] ? c.args[0].replace(PREFIX, '').toLowerCase() : '';
  if (!n) return c.sock.sendMessage(c.jid, { text: buildMenu(c.u.name || '', c.u) }, { quoted: c.msg });
  const e = reg.get(n); if (!e) return c.reply('❌ No command called *' + n + '*. See ' + PREFIX + 'menu');
  return c.reply('ℹ️ *' + PREFIX + e.main + '*\n📂 Category: ' + e.cat + (e.names.length > 1 ? '\n🔀 Also: ' + e.names.filter(x => x !== e.main).map(x => PREFIX + x).join(' ') : '') + '\n\nTry it: ' + PREFIX + e.main);
});
reg.add('ping', 'GENERAL', async c => { const t = Date.now(); const r = await c.reply('🏓 Pong!'); const ms = Date.now() - t; return r; });
reg.add(['alive', 'uptime', 'runtime'], 'GENERAL', c => c.reply('🐍 *Malfoy* is alive\n⏱️ Uptime: ' + fmt(Date.now() - START) + '\n👥 Players: ' + Object.keys(db.data.users).length));
reg.add('owner', 'GENERAL', c => c.reply('👑 Owner: Benjamin'));
reg.add(['ai', 'chat', 'ask'], 'GENERAL', async c => {
  if (!c.full) return c.reply('Use: ' + PREFIX + 'ai what is love');
  const a = await AI.ask(c.full, D.CINFO[c.u.activeChar] ? D.CINFO[c.u.activeChar].n : 'Malfoy');
  return c.reply(a || '😵 My brain lagged. Try again.');
});
reg.add('joke', 'GENERAL', async c => {
  const d = await http('https://v2.jokeapi.dev/joke/Any?safe-mode&type=single');
  return c.reply(d && d.joke ? '😂 ' + d.joke : '😂 Why did the knight cross the road? To get to the other nail.');
});
reg.add('fact', 'GENERAL', async c => {
  const d = await http('https://uselessfacts.jsph.pl/api/v2/facts/random?language=en');
  return c.reply('🧠 ' + (d && d.text ? d.text : 'Honey never spoils.'));
});
reg.add('quote', 'GENERAL', async c => {
  const d = await http('https://api.quotable.io/random');
  return c.reply(d && d.content ? '💬 "' + d.content + '"\n— ' + d.author : '💬 "Be water, my friend." — Bruce Lee');
});
reg.add(['calc', 'math'], 'GENERAL', c => {
  const r = calc(c.full); return c.reply(r === null ? 'Use: ' + PREFIX + 'calc 12*(3+4)' : '🧮 ' + c.full + ' = *' + r + '*');
});
reg.add('weather', 'GENERAL', async c => {
  const city = c.full || 'Lagos';
  const g = await http('https://geocoding-api.open-meteo.com/v1/search?count=1&name=' + encodeURIComponent(city));
  const p = g && g.results && g.results[0]; if (!p) return c.reply('City not found: ' + city);
  const w = await http('https://api.open-meteo.com/v1/forecast?latitude=' + p.latitude + '&longitude=' + p.longitude + '&current=temperature_2m,relative_humidity_2m,wind_speed_10m&timezone=auto');
  if (!w || !w.current) return c.reply('Weather failed. Try again.');
  return c.reply('🌤️ *' + p.name + ', ' + (p.country || '') + '*\n🌡️ ' + w.current.temperature_2m + '°C\n💧 ' + w.current.relative_humidity_2m + '%\n💨 ' + w.current.wind_speed_10m + ' km/h');
});
reg.add(['speak', 'tts'], 'GENERAL', async c => {
  if (!c.full) return c.reply('Use: ' + PREFIX + 'speak hello world');
  const b = await M.buf('https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=en&q=' + encodeURIComponent(c.full.slice(0, 190)));
  if (!b) return c.reply('Voice failed. Try again.');
  return c.sock.sendMessage(c.jid, { audio: b, mimetype: 'audio/mpeg', ptt: false }, { quoted: c.msg });
});
reg.add(['dice', 'roll'], 'GENERAL', c => c.reply('🎲 You rolled *' + (1 + Math.floor(Math.random() * 6)) + '*'));
reg.add(['flip', 'coin'], 'GENERAL', c => c.reply('🪙 ' + pick(['Heads', 'Tails'])));
reg.add('8ball', 'GENERAL', c => c.reply('🎱 ' + pick(['Yes.', 'No.', 'Maybe.', 'Definitely.', 'Ask again later.', 'Very unlikely.', 'Without a doubt.'])));
reg.add(['top', 'leaderboard', 'lb'], 'GENERAL', c => {
  const r = db.ranked().slice(0, 10); const md = ['🥇', '🥈', '🥉'];
  return c.reply('🏆 *TOP HUNTERS*\n\n' + r.map((u, i) => (md[i] || (i + 1) + '.') + ' ' + u.name + ' — Lv ' + u.level + ' (' + u.xp + ' XP)').join('\n'));
});
reg.add(['rank'], 'GENERAL', c => {
  const r = db.ranked(); const i = r.findIndex(x => x.id === c.u.id) + 1;
  return c.reply('🏅 Your rank: *#' + i + '* of ' + r.length + '\nLevel ' + c.u.level + ' • ' + c.u.xp + '/' + c.u.xpNeeded + ' XP');
});

// .exp : full XP breakdown
reg.add(['exp', 'xp', 'level'], 'GENERAL', c => {
  const u = c.u, s = R.stats(u), pct = Math.floor(u.xp / u.xpNeeded * 100);
  const r = db.ranked(); const rk = r.findIndex(x => x.id === u.id) + 1;
  let t = '✨ *EXPERIENCE — ' + u.name + '*\n\n';
  t += '🎖️ Level: *' + u.level + '*\n';
  t += bar(pct, 12) + ' ' + pct + '%\n';
  t += '📊 XP: *' + u.xp + ' / ' + u.xpNeeded + '*  (' + (u.xpNeeded - u.xp) + ' to next)\n';
  t += '🏅 Rank: #' + rk + '\n\n';
  t += '⚡ *XP bonus: +' + s.xp + '%*\n';
  if (u.soulmateLv) t += '   💘 Soulmate bond +' + u.soulmateLv + '%\n';
  u.inventory.forEach(id => { const it = D.SHOP_MAP[id]; if (it && it.stats && it.stats.xp) t += '   ' + it.emoji + ' ' + it.name + ' +' + it.stats.xp + '%\n'; });
  u.rpg.equipped.forEach(k => { if (D.CHARMS[k].stats.xp) t += '   ' + D.CHARMS[k].e + ' ' + D.CHARMS[k].n + ' +' + D.CHARMS[k].stats.xp + '%\n'; });
  t += '\n📈 *How to earn XP*\n• Chat in groups (small XP)\n• ' + PREFIX + 'explore & ' + PREFIX + 'boss\n• ' + PREFIX + 'quests rewards\n• ' + PREFIX + 'daily / ' + PREFIX + 'work\n• ' + PREFIX + 'shop → LEVELING gear boosts XP';
  return c.reply(t);
});
