const reg = require('../lib/registry');
const db = require('../lib/db');
const G = require('../lib/groups');
const M = require('../lib/media');
const { num } = require('../lib/util');
const PREFIX = process.env.PREFIX || '.';

const adm = async (c, needBot) => { const r = await G.check(c, needBot); if (!r.ok) await c.reply('⚠️ ' + r.reason); return r; };
const toJid = n => n.replace(/[^0-9]/g, '') + '@s.whatsapp.net';

// ---------- .infogc : group picture + info ----------
reg.add(['infogc', 'groupinfo', 'gcinfo'], 'ADMIN', async c => {
  if (!c.isGroup) return c.reply('Only in groups');
  const [m, pic] = await Promise.all([G.meta(c.sock, c.jid, true).catch(() => null), M.pfp(c.sock, c.jid)]);
  if (!m) return c.reply('❌ Could not read group info.');
  const admins = m.participants.filter(p => p.admin);
  const owner = m.owner || (admins.find(a => a.admin === 'superadmin') || {}).id;
  const cfg = db.groupCfg(c.jid);
  const cap = '╭━━『 👥 *GROUP INFO* 』━━╮\n\n📛 *' + m.subject + '*\n🆔 ' + c.jid.split('@')[0] + '\n👑 Owner: ' + (owner ? '@' + num(owner) : 'Unknown') +
    '\n👥 Members: *' + m.participants.length + '*\n🛡️ Admins: *' + admins.length + '*\n📅 Created: ' + (m.creation ? new Date(m.creation * 1000).toDateString() : '?') +
    '\n🔒 Messages: ' + (m.announce ? 'Admins only' : 'Everyone') + '\n🔗 Antilink: ' + (cfg.antilink ? 'ON' : 'OFF') + '\n👋 Welcome: ' + (cfg.welcome ? 'ON' : 'OFF') +
    '\n\n📝 *Description*\n' + (m.desc ? String(m.desc).slice(0, 300) : 'No description') + '\n╰━━━━━━━━━━━━━━━━━╯';
  return M.image(c.sock, c.jid, [pic, () => M.waifu('waifu')], cap, owner ? [owner] : [], c.msg);
});

reg.add(['tagall', 'everyone'], 'ADMIN', async c => {
  const r = await adm(c, false); if (!r.ok) return;
  const ids = r.meta.participants.map(p => p.id);
  const t = '╭━━『 🔔 *THE WATCHERS CALL* 』━━╮\n\n👥 *' + r.meta.subject + '*  (' + ids.length + ')\n' + (c.full ? '💬 ' + c.full + '\n' : '') + '\n' + ids.map(i => '│ ◈ @' + num(i)).join('\n') + '\n\n╰━━━━━━━━━━━━━━━━━╯';
  return M.image(c.sock, c.jid, [M.local('tagall')], t, ids, c.msg);
});
reg.add('hidetag', 'ADMIN', async c => {
  const r = await adm(c, false); if (!r.ok) return;
  return c.sock.sendMessage(c.jid, { text: c.full || '📢', mentions: r.meta.participants.map(p => p.id) });
});
reg.add(['kick', 'remove'], 'ADMIN', async c => {
  const r = await adm(c, true); if (!r.ok) return;
  const t = c.target(); if (!t) return c.reply('Use: ' + PREFIX + 'kick @user');
  if (r.admins.indexOf(t) > -1) return c.reply('Cannot kick an admin.');
  await c.sock.groupParticipantsUpdate(c.jid, [t], 'remove'); G.invalidate(c.jid);
  return c.reply('👢 Removed @' + num(t), [t]);
});
reg.add('add', 'ADMIN', async c => {
  const r = await adm(c, true); if (!r.ok) return;
  const n = c.full.replace(/[^0-9]/g, ''); if (n.length < 8) return c.reply('Use: ' + PREFIX + 'add 2348012345678');
  const res = await c.sock.groupParticipantsUpdate(c.jid, [toJid(n)], 'add'); G.invalidate(c.jid);
  return c.reply(res && res[0] && String(res[0].status) === '200' ? '✅ Added ' + n : '⚠️ Could not add (privacy settings?). Send them the invite link: ' + PREFIX + 'link');
});
reg.add('promote', 'ADMIN', async c => {
  const r = await adm(c, true); if (!r.ok) return; const t = c.target(); if (!t) return c.reply('Use: ' + PREFIX + 'promote @user');
  await c.sock.groupParticipantsUpdate(c.jid, [t], 'promote'); G.invalidate(c.jid); return c.reply('⬆️ @' + num(t) + ' is now admin', [t]);
});
reg.add('demote', 'ADMIN', async c => {
  const r = await adm(c, true); if (!r.ok) return; const t = c.target(); if (!t) return c.reply('Use: ' + PREFIX + 'demote @user');
  await c.sock.groupParticipantsUpdate(c.jid, [t], 'demote'); G.invalidate(c.jid); return c.reply('⬇️ @' + num(t) + ' is no longer admin', [t]);
});
reg.add(['mute', 'silence'], 'ADMIN', async c => {
  const r = await adm(c, true); if (!r.ok) return; const t = c.target(); if (!t) return c.reply('Use: ' + PREFIX + 'mute @user');
  const l = db.muted(c.jid); if (l.indexOf(t) === -1) l.push(t); db.save(); return c.reply('🔇 @' + num(t) + ' muted (messages get deleted)', [t]);
});
reg.add('unmute', 'ADMIN', async c => {
  const r = await adm(c, false); if (!r.ok) return; const t = c.target(); if (!t) return c.reply('Use: ' + PREFIX + 'unmute @user');
  db.data.muted[c.jid] = db.muted(c.jid).filter(i => i !== t); db.save(); return c.reply('🔊 @' + num(t) + ' unmuted', [t]);
});
reg.add('warn', 'ADMIN', async c => {
  const r = await adm(c, false); if (!r.ok) return; const t = c.target(); if (!t) return c.reply('Use: ' + PREFIX + 'warn @user');
  const u = db.getUser(t); u.warns++; db.save();
  if (u.warns >= 3 && r.botAdmin && r.admins.indexOf(t) === -1) { u.warns = 0; await c.sock.groupParticipantsUpdate(c.jid, [t], 'remove'); G.invalidate(c.jid); return c.reply('🚫 @' + num(t) + ' reached 3 warns and was removed.', [t]); }
  return c.reply('⚠️ @' + num(t) + ' warned (' + u.warns + '/3)', [t]);
});
reg.add(['close', 'lock'], 'ADMIN', async c => { const r = await adm(c, true); if (!r.ok) return; await c.sock.groupSettingUpdate(c.jid, 'announcement'); G.invalidate(c.jid); return c.reply('🔒 Group closed: only admins can send.'); });
reg.add(['open', 'unlock'], 'ADMIN', async c => { const r = await adm(c, true); if (!r.ok) return; await c.sock.groupSettingUpdate(c.jid, 'not_announcement'); G.invalidate(c.jid); return c.reply('🔓 Group open.'); });
reg.add(['link', 'invite'], 'ADMIN', async c => { const r = await adm(c, true); if (!r.ok) return; const code = await c.sock.groupInviteCode(c.jid); return c.reply('🔗 https://chat.whatsapp.com/' + code); });
reg.add('antilink', 'ADMIN', async c => {
  const r = await adm(c, false); if (!r.ok) return; const cfg = db.groupCfg(c.jid); const a = (c.args[0] || '').toLowerCase();
  if (a !== 'on' && a !== 'off') return c.reply('Use: ' + PREFIX + 'antilink on/off (now ' + (cfg.antilink ? 'ON' : 'OFF') + ')');
  cfg.antilink = a === 'on'; db.save(); return c.reply('🔗 Antilink ' + a.toUpperCase() + (cfg.antilink && !r.botAdmin ? '\n⚠️ Make me admin so I can delete links.' : ''));
});
reg.add('welcome', 'ADMIN', async c => {
  const r = await adm(c, false); if (!r.ok) return; const cfg = db.groupCfg(c.jid); const a = (c.args[0] || '').toLowerCase();
  if (a !== 'on' && a !== 'off') return c.reply('Use: ' + PREFIX + 'welcome on/off (now ' + (cfg.welcome ? 'ON' : 'OFF') + ')');
  cfg.welcome = a === 'on'; db.save(); return c.reply('👋 Welcome ' + a.toUpperCase());
});
reg.add('out', 'ADMIN', async c => {
  const r = await adm(c, false); if (!r.ok) return; await c.reply('👋 Bye!'); return c.sock.groupLeave(c.jid);
});
