const reg = require('../lib/registry');
const db = require('../lib/db');
const M = require('../lib/media');
const D = require('../lib/data');
const R = require('../lib/rpg');
const { between, rnd, pick, num, fmt } = require('../lib/util');
const PREFIX = process.env.PREFIX || '.';
const DAY = 86400000;

const lvlUp = (u, r) => r.ups ? '\n🎉 *LEVEL UP!* You are now level ' + u.level : '';

reg.add(['profile', 'me', 'stats'], 'ECONOMY', async c => {
  const u = c.u, s = R.stats(u), sm = D.ALL[(u.soulmate || 0) - 1], W = require('../lib/webcore');
  const rk = W.rankOf(u), pct = Math.floor(u.xp / u.xpNeeded * 100), linked = !!(u.web && (u.web.pfp || u.web.v));
  const dna = u.dna ? u.dna.parts.slice(0, 3).map(p => p.p + '% ' + p.n).join(', ') : 'none yet (' + PREFIX + 'animedna)';
  const t = '╭━━『 👤 *' + u.name + '* 』━━╮\n\n' +
    '🏅 Global rank: *#' + rk + '* of ' + Object.keys(db.data.users).length + '\n🎖️ Level *' + u.level + '*  ' + require('../lib/util').bar(pct, 10) + ' ' + pct + '%\n📊 XP: ' + u.xp + '/' + u.xpNeeded + '\n💰 Geo: *' + u.coins + '*   💎 Gems: *' + u.gems + '*\n\n' +
    '⚔️ *Knight*\n' + R.masks(R.curHp(u), s.hp) + '\n🗡️ Damage ' + Math.round(s.dmg * (1 + s.dmgPct / 100)) + '  🎯 Crit ' + s.crit + '%  📈 XP +' + s.xp + '%\n📍 ' + D.ZONES[u.rpg.zone].e + ' ' + D.ZONES[u.rpg.zone].n + '\n☠️ Kills ' + u.rpg.kills + '  📜 Quests ' + u.rpg.done.length + '  👑 Bosses ' + Object.keys(u.rpg.bosses).length + '\n\n' +
    '💘 Charm: *' + s.charm + '*\n💞 Soulmate: ' + (sm ? sm.name + ' (bond ' + u.soulmateLv + ')' : 'none') + '\n🧬 DNA: ' + dna + '\n🔥 Daily streak: ' + u.streak + '\n\n' +
    '🌐 Website: ' + (linked ? '✅ profile set up' : 'not linked yet') + '\n🔗 ' + W.baseUrl() + (linked ? '' : '\nSend *' + PREFIX + 'weblogin* to sign in.') + '\n╰━━━━━━━━━━━━━━━━╯';
  const pic = W.pfpBuffer(u) || await M.pfp(c.sock, c.sender);
  return M.image(c.sock, c.jid, [pic], t, [], c.msg);
});
reg.add('register', 'ECONOMY', c => {
  const n = c.full.replace(/[^\w \-]/g, '').trim().slice(0, 20); if (!n) return c.reply('Use: ' + PREFIX + 'register YourName');
  c.u.name = n; c.u.registered = true; db.save(); return c.reply('✅ Name set to *' + n + '*');
});
reg.add(['balance', 'bal', 'wallet'], 'ECONOMY', c => c.reply('💰 Geo: *' + c.u.coins + '*\n💎 Gems: *' + c.u.gems + '*'));

reg.add('daily', 'ECONOMY', c => {
  const u = c.u, now = Date.now();
  if (now - u.lastDaily < DAY) return c.reply('⏳ Come back in *' + fmt(DAY - (now - u.lastDaily)) + '*');
  u.streak = (now - u.lastDaily < DAY * 2) ? u.streak + 1 : 1; u.lastDaily = now;
  let g = 500 + Math.min(u.streak, 14) * 50;
  if (R.has(u, 'cat')) g += 5; if (R.has(u, 'dog')) g += 5; if (R.has(u, 'dragon')) g += 20; if (R.has(u, 'vip')) g *= 2;
  u.coins += g; u.gems += 1; const r = R.gainXp(u, 80); db.save();
  return c.reply('🎁 *DAILY*\n+' + g + ' Geo, +1 💎, +' + r.gain + ' XP\n🔥 Streak: ' + u.streak + lvlUp(u, r));
});
const JOBS = ['mined Geo in the Crystal Peak', 'sold relics in Dirtmouth', 'guarded the Stag Station', 'ran errands for the Elderbug', 'hunted Husks'];
reg.add('work', 'ECONOMY', c => {
  const u = c.u, now = Date.now();
  if (now - u.lastWork < 3600000) return c.reply('⏳ Rest for *' + fmt(3600000 - (now - u.lastWork)) + '*');
  u.lastWork = now; const g = between(100, 300) + u.level * 4, r = R.gainXp(u, 30); u.coins += g; db.save();
  return c.reply('💼 You ' + pick(JOBS) + '\n+' + g + ' Geo, +' + r.gain + ' XP' + lvlUp(u, r));
});
reg.add(['give', 'pay', 'send'], 'ECONOMY', c => {
  const t = c.target(); const n = parseInt(c.args[c.args.length - 1]);
  if (!t || !n || n < 1) return c.reply('Use: ' + PREFIX + 'give @user 500'); if (t === c.sender) return c.reply('Not to yourself.');
  if (c.u.coins < n) return c.reply('💸 Not enough Geo.');
  c.u.coins -= n; db.getUser(t).coins += n; db.save(); return c.reply('✅ Sent *' + n + '* Geo to @' + num(t), [t]);
});
reg.add(['slots', 'gamble'], 'ECONOMY', c => {
  const bet = parseInt(c.args[0]); if (!bet || bet < 10 || bet > c.u.coins) return c.reply('Use: ' + PREFIX + 'slots 100  (min 10, you have ' + c.u.coins + ')');
  const S = ['🍒', '🔔', '💎', '⚔️', '🐝']; const r = [pick(S), pick(S), pick(S)];
  let w = 0; if (r[0] === r[1] && r[1] === r[2]) w = bet * 5; else if (r[0] === r[1] || r[1] === r[2] || r[0] === r[2]) w = Math.floor(bet * 1.5);
  c.u.coins += w - bet; db.save();
  return c.reply('🎰 ' + r.join(' ') + '\n' + (w ? '✅ Won *' + w + '* Geo' : '❌ Lost *' + bet + '* Geo'));
});

// ---------- miners ----------
reg.add(['miners', 'mine'], 'ECONOMY', c => {
  const u = c.u, now = Date.now(), n = parseInt(c.args[0]);
  if (n) {
    const m = u.miners[n - 1]; if (!m) return c.reply('Miner 1-4 only.');
    if (m.status === 'LOCKED') return c.reply('🔒 Miner ' + n + ' is locked. Buy it in ' + PREFIX + 'shop extras');
    if (m.status !== 'IDLE') return c.reply('⛏️ Miner ' + n + ' is busy: ' + fmt(m.endsAt - now) + ' left');
    let dur = 24 * 3600000; const si = u.inventory.indexOf('speed'); if (si > -1) { u.inventory.splice(si, 1); dur = 12 * 3600000; }
    m.status = 'WORKING'; m.startedAt = now; m.endsAt = now + dur; db.save();
    return c.reply('⛏️ Miner ' + n + ' sent underground for ' + fmt(dur) + '. Use *' + PREFIX + 'collect* later.');
  }
  return c.reply('⛏️ *MINERS*\n\n' + u.miners.map(m => 'Miner ' + m.id + ': ' + (m.status === 'LOCKED' ? '🔒 Locked' : m.status === 'IDLE' ? '💤 Idle' : (m.endsAt <= now ? '✅ Ready' : '⏳ ' + fmt(m.endsAt - now)))).join('\n') + '\n\n' + PREFIX + 'mine <1-4> to start • ' + PREFIX + 'collect');
});
reg.add('collect', 'ECONOMY', c => {
  const u = c.u, now = Date.now(); let g = 0, gem = 0, k = 0;
  u.miners.forEach(m => { if (m.status === 'WORKING' && m.endsAt <= now) { g += between(400, 900) + u.level * 8; if (rnd(4) === 0) gem++; m.status = 'IDLE'; k++; } });
  if (!k) return c.reply('Nothing to collect yet. See ' + PREFIX + 'miners');
  u.coins += g; u.gems += gem; db.save(); return c.reply('⛏️ Collected from ' + k + ' miner(s): +' + g + ' Geo' + (gem ? ', +' + gem + ' 💎' : ''));
});

// ---------- shop ----------
const line = i => i.emoji + ' *' + i.name + '* — ' + i.price + ' Geo\n   _' + i.desc + '_  [' + i.id.replace(/^c_/, '') + ']';
reg.add(['shop', 'store'], 'ECONOMY', async c => {
  const q = (c.args[0] || '').toUpperCase();
  const cat = D.CATS.find(x => x === q || x.indexOf(q) === 0 && q.length >= 3);
  if (!cat) {
    const t = '🛒 *SLY\'S SHOP*  •  💰 ' + c.u.coins + ' Geo\n\n' + D.CATS.map(k => D.CATINFO[k] + ' *' + PREFIX + 'shop ' + k.toLowerCase() + '* — ' + D.SHOP.filter(i => i.cat === k).length + ' items').join('\n') + '\n\nBuy: *' + PREFIX + 'buy <item>*';
    return M.image(c.sock, c.jid, [M.local('shop')], t, [], c.msg);
  }
  const items = D.SHOP.filter(i => i.cat === cat);
  const t = D.CATINFO[cat] + ' *' + cat + '*  •  💰 ' + c.u.coins + ' Geo\n\n' + items.map(i => (R.has(c.u, i.id) || (i.charmKey && c.u.rpg.charms.indexOf(i.charmKey) > -1) ? '✅ ' : '') + line(i)).join('\n\n') + '\n\nBuy: *' + PREFIX + 'buy <id>*';
  return c.reply(t);
});
reg.add('buy', 'ECONOMY', c => {
  const r = require('../lib/shop').buy(c.u, c.full);
  if (r.ok) db.save();
  return c.reply((r.ok ? '✅ ' : '❌ ') + r.msg);
});
reg.add(['inventory', 'inv', 'bag'], 'ECONOMY', c => {
  const cnt = {}; c.u.inventory.forEach(id => { cnt[id] = (cnt[id] || 0) + 1; });
  const l = Object.keys(cnt).map(id => { const it = D.SHOP_MAP[id]; return it ? it.emoji + ' ' + it.name + (cnt[id] > 1 ? ' x' + cnt[id] : '') : null; }).filter(Boolean);
  const ch = c.u.rpg.charms.map(k => D.CHARMS[k].e + ' ' + D.CHARMS[k].n + (c.u.rpg.equipped.indexOf(k) > -1 ? ' (equipped)' : ''));
  return c.reply('🎒 *INVENTORY*\n\n' + (l.length ? l.join('\n') : 'Empty') + '\n\n📿 *Charms*\n' + (ch.length ? ch.join('\n') : 'None'));
});
reg.add('use', 'ECONOMY', c => {
  const it = D.findItem(c.full); const u = c.u;
  if (!it || !it.use) return c.reply('Use: ' + PREFIX + 'use lifeblood | soultonic | xpscroll | speed');
  const i = u.inventory.indexOf(it.id); if (i === -1) return c.reply('You do not have *' + it.name + '*.');
  if (it.use === 'speed') return c.reply('⚡ Speed Boost is used automatically on your next ' + PREFIX + 'mine.');
  u.inventory.splice(i, 1);
  if (it.use === 'heal') { u.rpg.hp = R.stats(u).hp; db.save(); return c.reply('🧪 All masks restored!\n' + R.masks(u.rpg.hp, u.rpg.hp)); }
  if (it.use === 'soul') { u.rpg.soul = R.stats(u).soul; db.save(); return c.reply('🔵 Your next fight starts with full soul (spells & focus ready).'); }
  if (it.use === 'xp') { const r = R.gainXp(u, 400); db.save(); return c.reply('📜 +' + r.gain + ' XP' + lvlUp(u, r)); }
});
