const reg = require('../lib/registry');
const db = require('../lib/db');
const M = require('../lib/media');
const D = require('../lib/data');
const R = require('../lib/rpg');
const { pick, rnd, num, bar } = require('../lib/util');
const PREFIX = process.env.PREFIX || '.';

const findChar = q => {
  q = String(q || '').toLowerCase().trim(); if (!q) return null;
  if (/^\d+$/.test(q)) return D.ALL[parseInt(q) - 1] || null;
  return D.ALL.find(x => x.name.toLowerCase() === q) || D.ALL.find(x => x.name.toLowerCase().indexOf(q) > -1) || null;
};
const charmOf = u => R.stats(u).charm;
const pursueChance = u => Math.max(5, Math.min(95, Math.round(15 + charmOf(u) * 0.9)));

// ---------- .sm : random soulmate/character match with image + show ----------
reg.add(['sm', 'soulmate', 'match'], 'SOCIAL', async c => {
  const ch = pick(D.ALL); const charm = charmOf(c.u);
  const attr = Math.min(99, 25 + Math.round(charm * 0.5) + rnd(30));
  c.u.lastSm = ch.id; db.save();
  const cap = '💘 *SOULMATE MATCH*\n\n👤 *' + ch.name + '*\n📺 ' + ch.anime + '\n#' + ch.id + '\n\n💞 Attraction: ' + bar(attr, 10) + ' ' + attr + '%\n✨ Your charm: ' + charm + '\n\n' + (attr >= 60 ? '🔥 They noticed you!' : '😶 They barely noticed you...') + '\nWin them over: *' + PREFIX + 'pursue* (' + pursueChance(c.u) + '% chance, costs 100 Geo)\nBoost chance: *' + PREFIX + 'shop attraction*';
  const img = await M.charImage(ch.name, ch.anime);
  return M.image(c.sock, c.jid, [img], img ? cap : cap + '\n\n(image unavailable right now)', [], c.msg);
});
reg.add(['pursue', 'date'], 'SOCIAL', async c => {
  const ch = c.full ? findChar(c.full) : (D.ALL[(c.u.lastSm || 0) - 1] || D.ALL[(c.u.soulmate || 0) - 1]);
  if (!ch) return c.reply('Roll one first with *' + PREFIX + 'sm*, or use ' + PREFIX + 'pursue <name or number>');
  if (c.u.coins < 100) return c.reply('💸 You need 100 Geo.');
  c.u.coins -= 100;
  const mine = c.u.soulmate === ch.id; const chance = mine ? 90 : pursueChance(c.u);
  const ok = rnd(100) < chance; let t;
  if (ok && mine) {
    c.u.soulmateLv = Math.min(10, c.u.soulmateLv + 1); const r = R.gainXp(c.u, 60 * c.u.soulmateLv);
    t = '💞 Lovely date with *' + ch.name + '*!\nBond level *' + c.u.soulmateLv + '* (+' + c.u.soulmateLv + '% XP forever)\n+' + r.gain + ' XP';
  } else if (ok) {
    c.u.soulmate = ch.id; c.u.soulmateLv = 1;
    t = '💘 *' + ch.name + '* (' + ch.anime + ') said YES!\nThey are now your soulmate.\nBond level 1 (+1% XP).\nKeep dating with ' + PREFIX + 'pursue to raise the bond.';
  } else t = '💔 *' + ch.name + '* turned you down (' + chance + '% chance).\nBuy charm gear in *' + PREFIX + 'shop attraction* and try again.';
  db.save();
  return M.image(c.sock, c.jid, [() => M.charImage(ch.name, ch.anime)], t, [], c.msg);
});
reg.add(['mysm', 'mysoulmate'], 'SOCIAL', c => {
  const ch = D.ALL[(c.u.soulmate || 0) - 1];
  if (!ch) return c.reply('You have no soulmate yet. Use *' + PREFIX + 'sm*');
  return M.image(c.sock, c.jid, [() => M.charImage(ch.name, ch.anime)], '💞 *Your soulmate*\n\n👤 ' + ch.name + '\n📺 ' + ch.anime + '\n💖 Bond level: ' + c.u.soulmateLv + '/10', [], c.msg);
});
reg.add(['charm', 'attraction'], 'SOCIAL', c => {
  const s = R.stats(c.u); const owned = c.u.inventory.map(id => D.SHOP_MAP[id]).filter(i => i && i.stats && i.stats.charm);
  return c.reply('✨ *CHARM: ' + s.charm + '*\nPursuit success: *' + pursueChance(c.u) + '%*\n\n' + (owned.length ? owned.map(i => i.emoji + ' ' + i.name + ' +' + i.stats.charm).join('\n') : 'No attraction gear yet.') + '\n\nBuy more: *' + PREFIX + 'shop attraction*');
});
reg.add(['characters', 'chars'], 'SOCIAL', c => {
  const p = Math.max(1, parseInt(c.args[0]) || 1), per = 20, tot = Math.ceil(D.ALL.length / per);
  const l = D.ALL.slice((p - 1) * per, p * per).map(x => x.id + '. ' + x.name + ' — ' + x.anime).join('\n');
  return c.reply('📚 *CHARACTERS* (' + p + '/' + tot + ')\n\n' + l + '\n\nUse ' + PREFIX + 'characters ' + (p % tot + 1) + ' • ' + PREFIX + 'pursue <name>');
});

// ---------- companion chars (Malfoy, Nyx, ...) ----------
reg.add(['char', 'talk'], 'SOCIAL', async c => {
  const AI = require('../lib/ai'); const k = c.args[0] && D.CHARS.indexOf(c.args[0].toLowerCase()) > -1 ? c.args.shift().toLowerCase() : c.u.activeChar;
  const msg = c.args.join(' '); if (!msg) return c.reply('Use: ' + PREFIX + 'char nyx hello  (names: ' + D.CHARS.join(', ') + ')');
  const a = await AI.ask(msg, D.CINFO[k].n); c.u.activeChar = k; db.save();
  return c.reply(D.CINFO[k].e + ' *' + D.CINFO[k].n + '*: ' + (a || '...'));
});

// ---------- reaction images/gifs ----------
const KILLS = ['killed', 'erased', 'sent to the shadow realm', 'obliterated', 'defeated'];
reg.add(['kill', 'murder'], 'SOCIAL', async c => {
  const t = c.target(); const nm = t ? '@' + num(t) : 'the air';
  const cap = '💀 *' + c.u.name + '* ' + pick(KILLS) + ' ' + nm + '!';
  const who = pick(M.KILL_CHARS);
  return M.image(c.sock, c.jid, [() => M.charImage(who), () => M.waifu('kill')], cap + '\n🔪 ' + who, t ? [t] : [], c.msg);
});
const ACT = { hug: ['hugged', '🤗'], kiss: ['kissed', '😘'], slap: ['slapped', '👋'], pat: ['patted', '🥰'], punch: ['punched', '👊'], cuddle: ['cuddled', '💞'], bite: ['bit', '😈'], poke: ['poked', '👉'], kick: ['kicked', '🦵'], wave: ['waved at', '👋'] };
Object.keys(ACT).forEach(k => {
  reg.add(k, 'SOCIAL', async c => {
    const t = c.target(); const cap = ACT[k][1] + ' *' + c.u.name + '* ' + ACT[k][0] + ' ' + (t ? '@' + num(t) : 'everyone') + '!';
    const url = await M.actionGif(k);
    if (url && await M.animation(c.sock, c.jid, url, cap, t ? [t] : [], c.msg)) return;
    return M.image(c.sock, c.jid, [() => M.waifu('waifu')], cap, t ? [t] : [], c.msg);
  });
});
reg.add(['ship', 'love'], 'SOCIAL', c => {
  const t = c.target(); if (!t) return c.reply('Use: ' + PREFIX + 'ship @user');
  const p = rnd(101); return c.reply('💘 *@' + num(c.sender) + '* + *@' + num(t) + '*\n' + bar(p, 10) + ' ' + p + '%', [c.sender, t]);
});

// ---------- .animedna ----------
const DNA = require('../lib/dna');
reg.add(['animedna', 'dna'], 'SOCIAL', async c => {
  const t = c.target() || c.sender; const own = t === c.sender; const u = own ? c.u : db.getUser(t);
  const now = Date.now(), wantsNew = own && (c.args[0] || '').toLowerCase() === 'reroll';
  if (wantsNew && u.dna && now - u.dna.t < 86400000) return c.reply('🧬 Your DNA is stable. You can re-roll in *' + require('../lib/util').fmt(86400000 - (now - u.dna.t)) + '*.');
  if (!u.dna || wantsNew) { u.dna = { t: now, parts: DNA.roll() }; db.save(); }
  const parts = u.dna.parts, top = parts[0];
  const cap = '🧬 *Griffin Creed - DNA Results*\n\n@' + num(t) + '\n\n' + parts.map(p => bar(p.p, 10) + '  *' + p.p + '%* ' + p.n).join('\n') + '\n\n🔥 Dominant gene: *' + top.n + '* (' + top.a + ')' + (own ? '\n\nRe-roll once a day: ' + PREFIX + 'animedna reroll' : '');
  return M.image(c.sock, c.jid, [() => M.charImage(top.n, top.a)], cap, [t], c.msg);
});
