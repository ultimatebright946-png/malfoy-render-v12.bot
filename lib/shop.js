// Shared purchase logic, used by the .buy command and the website.
const D = require('./data');
const R = require('./rpg');
const PREFIX = process.env.PREFIX || '.';

function buy(u, query) {
  const it = D.findItem(query);
  if (!it) return { ok: false, msg: 'Item not found.' };
  const consumable = ['heal', 'soul', 'xp', 'speed'].indexOf(it.use) > -1;
  if (it.charmKey) { if (u.rpg.charms.indexOf(it.charmKey) > -1) return { ok: false, msg: 'You already own this charm.' }; }
  else if (!consumable && R.has(u, it.id)) return { ok: false, msg: 'You already own ' + it.name + '.' };
  const mi = it.id === 'miner3' ? 2 : it.id === 'miner4' ? 3 : -1;
  if (mi > -1 && u.miners[mi].status !== 'LOCKED') return { ok: false, msg: 'Already unlocked.' };
  if (u.coins < it.price) return { ok: false, msg: 'You need ' + it.price + ' Geo (you have ' + u.coins + ').' };
  u.coins -= it.price;
  let extra = '';
  if (it.charmKey) { u.rpg.charms.push(it.charmKey); extra = '\nEquip it with ' + PREFIX + 'equip ' + it.charmKey + ' (' + D.CHARMS[it.charmKey].notch + ' notch).'; }
  else if (mi > -1) u.miners[mi].status = 'IDLE';
  else u.inventory.push(it.id);
  if (it.stats && it.stats.xp) extra = '\nYour XP bonus is now +' + R.stats(u).xp + '%.';
  if (it.stats && it.stats.charm) extra = '\nYour charm is now ' + R.stats(u).charm + '.';
  if (it.use) extra = '\nUse it with ' + PREFIX + 'use ' + it.id + '.';
  return { ok: true, item: it, msg: 'Bought ' + it.name + ' for ' + it.price + ' Geo.' + extra };
}
function owned(u, it) { return it.charmKey ? u.rpg.charms.indexOf(it.charmKey) > -1 : (['heal', 'soul', 'xp', 'speed'].indexOf(it.use) === -1 && R.has(u, it.id)) || ((it.id === 'miner3' && u.miners[2].status !== 'LOCKED') || (it.id === 'miner4' && u.miners[3].status !== 'LOCKED')); }
module.exports = { buy, owned };
