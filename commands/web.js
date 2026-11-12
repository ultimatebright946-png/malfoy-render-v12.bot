const reg = require('../lib/registry');
const W = require('../lib/webcore');
const PREFIX = process.env.PREFIX || '.';
const last = new Map();

reg.add(['weblogin', 'website', 'site'], 'ECONOMY', async c => {
  const now = Date.now();
  if (now - (last.get(c.u.id) || 0) < 20000) return c.reply('⏳ Wait a few seconds before asking for another code.');
  last.set(c.u.id, now);
  const code = W.makeCode(c.u.id);
  const text = '🌐 *MALFOY WEBSITE*\n\nYour login code: *' + code + '*\n⏱️ Works once, for 10 minutes.\n🔗 ' + W.baseUrl() + '\n\nOpen the site, type the code, and you can change your picture, buy gear and see the global leaderboard.\n⚠️ Never share this code.';
  if (!c.isGroup) return c.reply(text);
  try { await c.sock.sendMessage(c.sender, { text: text }); return c.reply('📩 I sent your login code privately. Check your DM.'); }
  catch (e) { return c.reply('❌ I could not DM you. Send *' + PREFIX + 'weblogin* in a private chat with me instead (never in a group, the code is a password).'); }
});
