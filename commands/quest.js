const reg = require('../lib/registry');
const db = require('../lib/db');
const M = require('../lib/media');
const D = require('../lib/data');
const R = require('../lib/rpg');
const { between, rnd, pick, fmt, bar } = require('../lib/util');
const PREFIX = process.env.PREFIX || '.';
const zoneOf = u => D.ZONES[u.rpg.zone];
const zid = n => { n = String(n || '').toLowerCase().replace(/[^a-z]/g, ''); return Object.keys(D.ZONES).find(k => k === n || D.ZONES[k].n.toLowerCase().replace(/[^a-z]/g, '').indexOf(n) === 0 && n.length >= 3); };
const lvl = (u, r) => r.ups ? '\n🎉 *LEVEL UP!* You are now level ' + u.level : '';

function applyDeath(u, z, zoneId) {
  const lost = Math.floor(u.coins * 0.3);
  u.coins -= lost; u.rpg.shade = { zone: zoneId, geo: lost }; u.rpg.hp = R.stats(u).hp; u.rpg.zone = 'dirtmouth'; u.rpg.deaths++;
  return lost;
}
function applyWin(u, e, zone, zoneId, isBoss, res, out) {
  const s = R.stats(u);
  let geo = between(e.geo[0], e.geo[1]); geo = Math.floor(geo * (1 + s.geo / 100));
  const base = between(e.xp[0], e.xp[1]); const xp = Math.floor(base * R.xpScale(u, zone));
  if (e.shade) { geo = u.rpg.shade ? u.rpg.shade.geo : 0; u.rpg.shade = null; out.push('👤 You destroyed your Shade and reclaimed *' + geo + '* Geo!'); }
  u.coins += geo; u.rpg.hp = Math.max(1, res.hp); u.rpg.kills++;
  const r = R.gainXp(u, xp);
  return { geo: geo, xp: r.gain, ups: r.ups };
}

reg.add(['explore', 'hunt', 'ex'], 'QUEST', async c => {
  const u = c.u, now = Date.now(), zone = zoneOf(u);
  if (zone.hub) return c.reply('🏘️ You are in Dirtmouth (safe town).\nTravel somewhere first: *' + PREFIX + 'map*');
  if (now - u.rpg.lastExplore < 15000) return c.reply('⏳ Catch your breath: ' + Math.ceil((15000 - (now - u.rpg.lastExplore)) / 1000) + 's');
  u.rpg.lastExplore = now; u.rpg.explores++;
  const s = R.stats(u), out = [], roll = rnd(100);
  let t = zone.e + ' *' + zone.n + '*\n\n';

  if (roll < 70) {
    const e = R.pickEnemy(u, u.rpg.zone), res = R.fight(u, e, false);
    t += '⚔️ A *' + e.n + '* appears!\n🗡️ Dealt ' + res.dealt + ' dmg in ' + res.rounds + ' rounds' + (res.focus ? ' • 💙 Focused x' + res.focus : '') + (res.spells ? ' • 🔮 Spells x' + res.spells : '') + '\n';
    if (res.won) {
      const w = applyWin(u, e, zone, u.rpg.zone, false, res, out);
      t += '✅ *Victory!*  +' + w.geo + ' Geo  +' + w.xp + ' XP' + lvl(u, w) + '\n' + R.masks(u.rpg.hp, s.hp);
      if (out.length) t += '\n' + out.join('\n');
      R.progress(u, { type: 'kill', zone: u.rpg.zone, enemy: e.n }).forEach(x => out.push(x));
      R.progress(u, { type: 'explore' }).forEach(x => out.push(x));
      out.filter(x => x.indexOf('QUEST') > -1).forEach(x => { t += '\n\n' + x; });
    } else {
      const lost = applyDeath(u, zone, u.rpg.zone);
      t += '💀 *You were defeated...*\nYour Shade holds *' + lost + '* Geo in ' + zone.n + '.\nWake up at Dirtmouth. Return and defeat it to reclaim your Geo.';
    }
  } else if (roll < 82) {
    const g = Math.floor(between(40, 120 + u.level * 6) * (1 + s.geo / 100)); u.coins += g; u.treasures++;
    t += '🧰 You found a hidden chest!\n+' + g + ' Geo'; R.progress(u, { type: 'treasure' }).concat(R.progress(u, { type: 'explore' })).forEach(x => { t += '\n\n' + x; });
  } else if (roll < 90) {
    u.rpg.hp = s.hp; t += '🪑 You found a bench and rested.\n' + R.masks(s.hp, s.hp) + ' fully healed.'; R.progress(u, { type: 'explore' }).forEach(x => { t += '\n\n' + x; });
  } else if (roll < 96) {
    const r = R.gainXp(u, 25 + u.level * 3);
    t += pick(['📖 You read a Lore Tablet: "Hollownest was once a bright kingdom..."', '🐛 A friendly Grub thanks you for the visit.', '🕯️ A mysterious bug whispers about the Abyss below.']) + '\n+' + r.gain + ' XP' + lvl(u, r);
    R.progress(u, { type: 'explore' }).forEach(x => { t += '\n\n' + x; });
  } else {
    u.rpg.hp = Math.max(1, R.curHp(u) - 1); t += '🕳️ A spike trap! You lost a mask.\n' + R.masks(u.rpg.hp, s.hp); R.progress(u, { type: 'explore' }).forEach(x => { t += '\n\n' + x; });
  }
  db.save();
  const img = M.local('zone_' + u.rpg.zone);
  return img ? M.image(c.sock, c.jid, [img], t, [], c.msg) : c.reply(t);
});

reg.add(['boss', 'challenge'], 'QUEST', async c => {
  const u = c.u, now = Date.now(), zone = zoneOf(u), zi = u.rpg.zone;
  if (!zone.boss) return c.reply('No boss here. Travel with ' + PREFIX + 'map');
  if (now - u.rpg.lastBoss < 300000) return c.reply('⏳ The boss is recovering: ' + fmt(300000 - (now - u.rpg.lastBoss)));
  const s = R.stats(u); if (R.curHp(u) < s.hp) return c.reply('❤️ Rest first (' + PREFIX + 'rest). Bosses need full masks.\n' + R.masks(u.rpg.hp, s.hp));
  u.rpg.lastBoss = now; const e = zone.boss, res = R.fight(u, e, true);
  let t = '👑 *BOSS: ' + e.n + '*\n🗡️ Dealt ' + res.dealt + ' dmg in ' + res.rounds + ' rounds' + (res.focus ? ' • 💙 x' + res.focus : '') + (res.spells ? ' • 🔮 x' + res.spells : '') + '\n';
  if (res.won) {
    const first = !u.rpg.bosses[zi]; u.rpg.bosses[zi] = (u.rpg.bosses[zi] || 0) + 1; const k = first ? 1 : 0.5;
    const geo = Math.floor(between(e.geo[0], e.geo[1]) * k * (1 + s.geo / 100)), r = R.gainXp(u, Math.floor(between(e.xp[0], e.xp[1]) * k));
    u.coins += geo; u.rpg.hp = Math.max(1, res.hp); u.rpg.kills++;
    t += '🏆 *' + e.n + ' DEFEATED!*\n+' + geo + ' Geo  +' + r.gain + ' XP' + lvl(u, r) + '\n' + R.masks(u.rpg.hp, s.hp);
    if (first && e.drop && u.rpg.charms.indexOf(e.drop) === -1) { u.rpg.charms.push(e.drop); t += '\n\n📿 *CHARM OBTAINED:* ' + D.CHARMS[e.drop].e + ' ' + D.CHARMS[e.drop].n + ' (' + D.CHARMS[e.drop].desc + ')\nEquip: ' + PREFIX + 'equip ' + e.drop; }
    R.progress(u, { type: 'boss', zone: zi }).forEach(x => { t += '\n\n' + x; });
    const nx = Object.keys(D.ZONES)[Object.keys(D.ZONES).indexOf(zi) + 1]; if (first && nx) t += '\n\n🗺️ New area available: *' + D.ZONES[nx].n + '* (level ' + D.ZONES[nx].lvl + ')';
  } else {
    const lost = applyDeath(u, zone, zi);
    t += '💀 *' + e.n + ' defeated you!*\nShade holds *' + lost + '* Geo. Get stronger: ' + PREFIX + 'shop nails / armor / leveling';
  }
  db.save(); return M.image(c.sock, c.jid, [M.local('boss_' + zi)], t, [], c.msg);
});

reg.add(['rest', 'bench'], 'QUEST', c => {
  const u = c.u, now = Date.now(), s = R.stats(u);
  if (now - u.rpg.lastRest < 120000) return c.reply('🪑 The bench is warm. Wait ' + fmt(120000 - (now - u.rpg.lastRest)));
  u.rpg.lastRest = now; u.rpg.hp = s.hp; db.save(); return c.reply('🪑 You sit at the bench.\n' + R.masks(s.hp, s.hp) + '  fully healed.');
});

reg.add(['map', 'travel', 'zones'], 'QUEST', c => {
  const u = c.u, q = zid(c.full);
  if (c.full && !q) return c.reply('Unknown zone. See ' + PREFIX + 'map');
  if (q) {
    const z = D.ZONES[q]; if (u.level < z.lvl) return c.reply('🔒 ' + z.n + ' needs level ' + z.lvl + '.');
    u.rpg.zone = q; db.save(); return c.reply(z.e + ' You travel to *' + z.n + '*.' + (z.hub ? '\nSafe town: shop, rest, heal.' : '\nUse ' + PREFIX + 'explore or ' + PREFIX + 'boss'));
  }
  return c.reply('🗺️ *HALLOWNEST MAP*\n\n' + Object.keys(D.ZONES).map(k => { const z = D.ZONES[k]; return (u.rpg.zone === k ? '📍 ' : u.level >= z.lvl ? '✅ ' : '🔒 ') + z.e + ' *' + z.n + '* (Lv ' + z.lvl + ')' + (z.boss ? ' — Boss: ' + z.boss.n + (u.rpg.bosses[k] ? ' ✔' : '') : ''); }).join('\n') + '\n\nTravel: *' + PREFIX + 'travel greenpath*');
});

// ---------- quests ----------
const prog = (u, id) => { const q = D.QMAP[id]; return q.t.type === 'explore' || true ? u.rpg.quests[id] + '/' + q.t.n : ''; };
reg.add(['quests', 'quest', 'journal'], 'QUEST', c => {
  const u = c.u; const act = Object.keys(u.rpg.quests);
  let t = '📜 *QUEST LOG*\n\n*Active (' + act.length + '/3)*\n' + (act.length ? act.map(id => '• ' + D.QMAP[id].name + ' [' + u.rpg.quests[id] + '/' + D.QMAP[id].t.n + ']\n   ' + D.QMAP[id].desc + '  (+' + D.QMAP[id].geo + ' Geo, +' + D.QMAP[id].xp + ' XP)').join('\n') : 'None. Accept one below!');
  const avail = D.QUESTS.filter(q => u.rpg.done.indexOf(q.id) === -1 && !(q.id in u.rpg.quests) && u.level >= D.ZONES[q.zone].lvl);
  t += '\n\n*Available*\n' + (avail.length ? avail.slice(0, 8).map(q => '• ' + q.id + ' — ' + q.name + '\n   ' + q.desc).join('\n') : 'None right now. Level up to unlock more!') + '\n\nAccept: *' + PREFIX + 'accept q2*  •  Drop: *' + PREFIX + 'abandon q2*\n✅ Completed: ' + u.rpg.done.length + '/' + D.QUESTS.length;
  return c.reply(t);
});
reg.add(['accept', 'startquest'], 'QUEST', c => {
  const u = c.u, id = (c.args[0] || '').toLowerCase(), q = D.QMAP[id];
  if (!q) return c.reply('Use: ' + PREFIX + 'accept q1  (see ' + PREFIX + 'quests)');
  if (u.rpg.done.indexOf(id) > -1) return c.reply('Already completed.'); if (id in u.rpg.quests) return c.reply('Already active.');
  if (Object.keys(u.rpg.quests).length >= 3) return c.reply('📜 Max 3 active quests. Finish or ' + PREFIX + 'abandon one.');
  if (u.level < D.ZONES[q.zone].lvl) return c.reply('🔒 Needs level ' + D.ZONES[q.zone].lvl + '.');
  u.rpg.quests[id] = 0; db.save(); return c.reply('📜 *Quest accepted:* ' + q.name + '\n' + q.desc + '\nReward: ' + q.geo + ' Geo, ' + q.xp + ' XP');
});
reg.add('abandon', 'QUEST', c => {
  const id = (c.args[0] || '').toLowerCase(); if (!(id in c.u.rpg.quests)) return c.reply('Not an active quest.');
  delete c.u.rpg.quests[id]; db.save(); return c.reply('🗑️ Quest abandoned.');
});

// ---------- charms ----------
reg.add(['charms', 'notches'], 'QUEST', c => {
  const u = c.u, used = R.usedNotches(u), max = R.notches(u);
  const l = u.rpg.charms.map(k => (u.rpg.equipped.indexOf(k) > -1 ? '✅ ' : '▫️ ') + D.CHARMS[k].e + ' *' + k + '* — ' + D.CHARMS[k].n + ' (' + D.CHARMS[k].notch + ' notch) ' + D.CHARMS[k].desc);
  return c.reply('📿 *CHARMS*  •  Notches ' + used + '/' + max + '\n\n' + (l.length ? l.join('\n') : 'You own none. Beat bosses or buy in ' + PREFIX + 'shop charms') + '\n\n' + PREFIX + 'equip <name> • ' + PREFIX + 'unequip <name>\nMore notches unlock as you level up.');
});
reg.add('equip', 'QUEST', c => {
  const u = c.u, k = (c.args[0] || '').toLowerCase(); if (!D.CHARMS[k]) return c.reply('Use: ' + PREFIX + 'equip <charm>  (see ' + PREFIX + 'charms)');
  if (u.rpg.charms.indexOf(k) === -1) return c.reply('You do not own that charm.'); if (u.rpg.equipped.indexOf(k) > -1) return c.reply('Already equipped.');
  if (R.usedNotches(u) + D.CHARMS[k].notch > R.notches(u)) return c.reply('❌ Not enough notches (' + R.usedNotches(u) + '/' + R.notches(u) + ').');
  u.rpg.equipped.push(k); db.save(); return c.reply('✅ Equipped ' + D.CHARMS[k].e + ' ' + D.CHARMS[k].n + ' — ' + D.CHARMS[k].desc);
});
reg.add('unequip', 'QUEST', c => {
  const u = c.u, k = (c.args[0] || '').toLowerCase(); const i = u.rpg.equipped.indexOf(k); if (i === -1) return c.reply('That charm is not equipped.');
  u.rpg.equipped.splice(i, 1); db.save(); return c.reply('➖ Unequipped ' + D.CHARMS[k].n);
});
reg.add(['gear', 'equipment'], 'QUEST', c => {
  const s = R.stats(c.u);
  return c.reply('🛡️ *GEAR*\n\n🗡️ Nail: ' + (s.weapon ? s.weapon.name : 'Old Nail') + '\n🎭 Mask: ' + (s.armor ? s.armor.name : 'None') + '\n❤️ Masks: ' + s.hp + '\n💥 Damage: ' + Math.round(s.dmg * (1 + s.dmgPct / 100)) + '\n🎯 Crit: ' + s.crit + '%\n🔮 Spell bonus: +' + s.spell + '%\n📈 XP bonus: +' + s.xp + '%\n💰 Geo bonus: +' + s.geo + '%\n💘 Charm: ' + s.charm);
});
