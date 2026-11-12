// Static game data: companions, soulmate roster, shop, zones, quests, charms.

const CHARS = ['malfoy', 'nyx', 'mika', 'yuna', 'yako', 'erza', 'kashimo'];
const CINFO = {
  malfoy: { n: 'Malfoy', e: '🐍' }, nyx: { n: 'Nyx', e: '🌙' }, mika: { n: 'Mika', e: '🌸' },
  yuna: { n: 'Yuna', e: '💖' }, yako: { n: 'Yako', e: '💙' }, erza: { n: 'Erza', e: '⚔️' }, kashimo: { n: 'Kashimo', e: '🍔' },
};

// Soulmate / character-match roster (adult characters only)
const RAW = `Nami|One Piece
Nico Robin|One Piece
Boa Hancock|One Piece
Yor Forger|Spy x Family
Makima|Chainsaw Man
Frieren|Frieren
Darkness|Konosuba
Aqua|Konosuba
Mitsuri Kanroji|Demon Slayer
Shinobu Kocho|Demon Slayer
Chizuru Mizuhara|Rent-A-Girlfriend
Tohru|Dragon Maid
Erza Scarlet|Fairy Tail
Mirajane Strauss|Fairy Tail
Bulma|Dragon Ball
Android 18|Dragon Ball
Misato Katsuragi|Evangelion
Ritsuko Akagi|Evangelion
Rangiku Matsumoto|Bleach
Yoruichi Shihouin|Bleach
Tsunade|Naruto
Kushina Uzumaki|Naruto
Konan|Naruto
Mei Terumi|Naruto
Anko Mitarashi|Naruto
Kurenai Yuhi|Naruto
Revy|Black Lagoon
Balalaika|Black Lagoon
Esdeath|Akame ga Kill
Albedo|Overlord
Narberal Gamma|Overlord
Riza Hawkeye|Fullmetal Alchemist
Olivier Armstrong|Fullmetal Alchemist
Lust|Fullmetal Alchemist
Faye Valentine|Cowboy Bebop
Motoko Kusanagi|Ghost in the Shell
C.C.|Code Geass
Fubuki|One Punch Man
Lisa Lisa|JoJo's Bizarre Adventure
Medusa Gorgon|Soul Eater`;
const ALL = RAW.split('\n').map((l, i) => {
  const [name, anime] = l.split('|'); const p = name.split(' ');
  return { id: i + 1, name, first: p[0], last: p[1] || '', anime, about: name + ' from ' + anime + '.' };
});

// ---------- Charms (Hollow-Knight-style, need notches) ----------
const CHARMS = {
  fragileheart: { n: 'Fragile Heart', e: '❤️', notch: 2, price: 2500, stats: { hp: 2 }, desc: '+2 masks' },
  unbreakable: { n: 'Unbreakable Strength', e: '💪', notch: 3, price: 4000, stats: { dmgPct: 40 }, desc: '+40% nail damage' },
  gatheringswarm: { n: 'Gathering Swarm', e: '🐝', notch: 1, price: 1500, stats: { geo: 25 }, desc: '+25% Geo' },
  wanderer: { n: "Wanderer's Compass", e: '🧭', notch: 1, price: 2000, stats: { xp: 15 }, desc: '+15% XP' },
  soulcatcher: { n: 'Soul Catcher', e: '🔵', notch: 1, price: 1200, stats: { soulGain: 6 }, desc: '+6 soul per hit' },
  quickfocus: { n: 'Quick Focus', e: '⏱️', notch: 3, price: 3500, stats: { focusCost: -13 }, desc: 'Focus costs less soul' },
  shamanstone: { n: 'Shaman Stone', e: '🪨', notch: 3, price: 4500, stats: { spell: 50 }, desc: '+50% spell damage' },
  longnail: { n: 'Longnail', e: '📏', notch: 2, price: 2200, stats: { crit: 10 }, desc: '+10% crit chance' },
};

// ---------- Shop ----------
const I = (id, name, emoji, price, cat, desc, x) => Object.assign({ id, name, emoji, price, cat, desc }, x || {});
const SHOP = [
  I('nail1', 'Sharpened Nail', '🗡️', 800, 'NAILS', '+4 nail damage', { slot: 'weapon', tier: 1, stats: { dmg: 4 } }),
  I('nail2', 'Channelled Nail', '🗡️', 2500, 'NAILS', '+8 nail damage', { slot: 'weapon', tier: 2, stats: { dmg: 8 } }),
  I('nail3', 'Coiled Nail', '⚔️', 6000, 'NAILS', '+12 nail damage', { slot: 'weapon', tier: 3, stats: { dmg: 12 } }),
  I('nail4', 'Pure Nail', '⚔️', 14000, 'NAILS', '+17 nail damage', { slot: 'weapon', tier: 4, stats: { dmg: 17 } }),
  I('mask1', 'Vessel Mask', '🎭', 1500, 'ARMOR', '+1 mask (HP)', { slot: 'armor', tier: 1, stats: { hp: 1 } }),
  I('mask2', 'Shell Mask', '🎭', 5000, 'ARMOR', '+2 masks (HP)', { slot: 'armor', tier: 2, stats: { hp: 2 } }),
  I('mask3', 'Ancient Mask', '🎭', 12000, 'ARMOR', '+3 masks (HP)', { slot: 'armor', tier: 3, stats: { hp: 3 } }),
  I('tome', 'Scholar Tome', '📘', 1800, 'LEVELING', '+10% XP from everything', { stats: { xp: 10 } }),
  I('compass', 'Wanderer Compass', '🧭', 3500, 'LEVELING', '+20% XP from everything', { stats: { xp: 20 } }),
  I('sagecrown', 'Sage Crown', '👑', 12000, 'LEVELING', '+35% XP from everything', { stats: { xp: 35 } }),
  I('pouch', 'Geo Pouch', '👝', 2000, 'LEVELING', '+15% Geo from fights', { stats: { geo: 15 } }),
  I('lens', 'Hunter Lens', '🔍', 2500, 'LEVELING', '+8% crit chance', { stats: { crit: 8 } }),
  I('vessel', 'Soul Vessel', '🔮', 3000, 'LEVELING', '+33 max soul', { stats: { soul: 33 } }),
  I('rose', 'Rose', '🌹', 100, 'ATTRACTION', '+2 Charm', { stats: { charm: 2 } }),
  I('chocolate', 'Chocolate', '🍫', 250, 'ATTRACTION', '+4 Charm', { stats: { charm: 4 } }),
  I('perfume', 'Perfume', '🧴', 600, 'ATTRACTION', '+6 Charm', { stats: { charm: 6 } }),
  I('suit', 'Tailored Suit', '🕴️', 2500, 'ATTRACTION', '+15 Charm', { stats: { charm: 15 } }),
  I('chain', 'Gold Chain', '📿', 6000, 'ATTRACTION', '+25 Charm', { stats: { charm: 25 } }),
  I('crown', 'Golden Crown', '👑', 12000, 'ATTRACTION', '+40 Charm', { stats: { charm: 40 } }),
  I('lambo', 'Lamborghini', '🏎️', 80000, 'ATTRACTION', '+90 Charm', { stats: { charm: 90 } }),
  I('lifeblood', 'Lifeblood Vial', '🧪', 300, 'POTIONS', 'Heal all masks (.use lifeblood)', { use: 'heal' }),
  I('soultonic', 'Soul Tonic', '🔵', 250, 'POTIONS', 'Refill soul (.use soultonic)', { use: 'soul' }),
  I('xpscroll', 'XP Scroll', '📜', 1000, 'POTIONS', '+400 XP instantly (.use xpscroll)', { use: 'xp' }),
  I('miner3', 'Miner 3', '⛏️', 5000, 'EXTRAS', 'Unlock Miner 3'),
  I('miner4', 'Miner 4', '⛏️', 12000, 'EXTRAS', 'Unlock Miner 4'),
  I('speed', 'Speed Boost', '⚡', 2000, 'EXTRAS', 'Next mining takes 12h', { use: 'speed' }),
  I('cat', 'Cat Pet', '🐱', 4000, 'EXTRAS', '+5 coins on every .daily'),
  I('dog', 'Dog Pet', '🐶', 4000, 'EXTRAS', '+5 coins on every .daily'),
  I('dragon', 'Baby Dragon', '🐉', 15000, 'EXTRAS', '+20 coins on every .daily'),
  I('vip', 'VIP Pass', '💎', 20000, 'EXTRAS', 'Double .daily coins'),
];
for (const k of Object.keys(CHARMS)) {
  const c = CHARMS[k];
  SHOP.push(I('c_' + k, c.n, c.e, c.price, 'CHARMS', c.desc + ' | ' + c.notch + ' notch' + (c.notch > 1 ? 'es' : ''), { charmKey: k }));
}
const SHOP_MAP = {}; SHOP.forEach(s => { SHOP_MAP[s.id] = s; });
const CATS = ['NAILS', 'ARMOR', 'LEVELING', 'ATTRACTION', 'CHARMS', 'POTIONS', 'EXTRAS'];
const CATINFO = { NAILS: '⚔️', ARMOR: '🛡️', LEVELING: '📈', ATTRACTION: '💘', CHARMS: '📿', POTIONS: '🧪', EXTRAS: '🎁' };
function findItem(q) {
  q = String(q || '').toLowerCase().trim(); if (!q) return null;
  return SHOP_MAP[q] || SHOP_MAP['c_' + q] || SHOP.find(s => s.name.toLowerCase() === q) || SHOP.find(s => s.name.toLowerCase().indexOf(q) > -1) || null;
}

// ---------- Zones ----------
const ZONES = {
  dirtmouth: { n: 'Dirtmouth', e: '🏘️', lvl: 1, hub: true },
  crossroads: { n: 'Forgotten Crossroads', e: '🪨', lvl: 1, enemies: [
    { n: 'Crawlid', hp: 14, atk: 1, geo: [6, 12], xp: [8, 14] }, { n: 'Tiktik', hp: 12, atk: 1, geo: [5, 10], xp: [7, 12] },
    { n: 'Gruzzer', hp: 16, atk: 1, geo: [8, 14], xp: [9, 15] }, { n: 'Vengefly', hp: 20, atk: 1, geo: [10, 16], xp: [12, 18] }],
    boss: { n: 'False Knight', hp: 60, atk: 1, geo: [150, 220], xp: [180, 240], drop: 'soulcatcher' } },
  greenpath: { n: 'Greenpath', e: '🌿', lvl: 5, enemies: [
    { n: 'Mosscreep', hp: 24, atk: 1, geo: [12, 20], xp: [16, 24] }, { n: 'Squit', hp: 22, atk: 1, geo: [12, 18], xp: [15, 22] },
    { n: 'Aspid Hunter', hp: 30, atk: 1, geo: [16, 26], xp: [20, 30] }, { n: 'Moss Knight', hp: 38, atk: 2, geo: [22, 34], xp: [26, 38] }],
    boss: { n: 'Hornet', hp: 90, atk: 2, geo: [300, 420], xp: [380, 480], drop: 'longnail' } },
  fungal: { n: 'Fungal Wastes', e: '🍄', lvl: 10, enemies: [
    { n: 'Fungling', hp: 34, atk: 1, geo: [20, 30], xp: [28, 40] }, { n: 'Shrumeling', hp: 38, atk: 2, geo: [24, 36], xp: [32, 46] },
    { n: 'Ambloom', hp: 50, atk: 2, geo: [30, 44], xp: [40, 56] }, { n: 'Mantis Warrior', hp: 56, atk: 2, geo: [36, 52], xp: [46, 62] }],
    boss: { n: 'Mantis Lords', hp: 130, atk: 2, geo: [550, 750], xp: [700, 900], drop: 'unbreakable' } },
  city: { n: 'City of Tears', e: '🌧️', lvl: 15, enemies: [
    { n: 'Husk Sentry', hp: 54, atk: 2, geo: [34, 50], xp: [48, 66] }, { n: 'Winged Sentry', hp: 50, atk: 2, geo: [34, 50], xp: [50, 68] },
    { n: 'Great Husk Sentry', hp: 80, atk: 2, geo: [52, 76], xp: [70, 96] }, { n: 'Soul Twister', hp: 64, atk: 2, geo: [44, 64], xp: [60, 82] }],
    boss: { n: 'Soul Master', hp: 180, atk: 2, geo: [900, 1200], xp: [1100, 1400], drop: 'shamanstone' } },
  deepnest: { n: 'Deepnest', e: '🕸️', lvl: 22, enemies: [
    { n: 'Dirtcarver', hp: 80, atk: 2, geo: [56, 80], xp: [84, 110] }, { n: 'Little Weaver', hp: 70, atk: 2, geo: [50, 74], xp: [76, 100] },
    { n: 'Stalking Devout', hp: 110, atk: 2, geo: [74, 104], xp: [110, 140] }, { n: 'Garpede', hp: 96, atk: 2, geo: [64, 92], xp: [96, 124] }],
    boss: { n: 'Nosk', hp: 240, atk: 2, geo: [1400, 1900], xp: [1700, 2200], drop: 'fragileheart' } },
  abyss: { n: 'The Abyss', e: '🌑', lvl: 30, enemies: [
    { n: 'Void Tendril', hp: 120, atk: 2, geo: [90, 130], xp: [140, 180] }, { n: 'Lost Kin', hp: 150, atk: 2, geo: [110, 150], xp: [170, 220] },
    { n: 'Shadow Creeper', hp: 130, atk: 2, geo: [96, 136], xp: [150, 196] }, { n: 'Broken Vessel', hp: 170, atk: 2, geo: [120, 170], xp: [190, 250] }],
    boss: { n: 'The Hollow Knight', hp: 320, atk: 2, geo: [2500, 3500], xp: [3200, 4200], drop: 'quickfocus' } },
};

// ---------- Quests ----------
const Q = (id, name, zone, t, desc, geo, xp) => ({ id, name, zone, t, desc, geo, xp });
const QUESTS = [
  Q('q1', 'First Steps', 'crossroads', { type: 'explore', n: 5 }, 'Explore 5 times anywhere', 150, 100),
  Q('q2', 'Cleanse the Crossroads', 'crossroads', { type: 'kill', zone: 'crossroads', n: 10 }, 'Defeat 10 enemies in the Forgotten Crossroads', 300, 220),
  Q('q3', 'Vengefly Hunt', 'crossroads', { type: 'kill', zone: 'crossroads', enemy: 'Vengefly', n: 6 }, 'Defeat 6 Vengeflies', 250, 200),
  Q('q4', 'Treasure Hunter', 'crossroads', { type: 'treasure', n: 4 }, 'Find 4 treasure chests', 400, 250),
  Q('q5', 'The False Knight', 'crossroads', { type: 'boss', zone: 'crossroads', n: 1 }, 'Defeat the False Knight (.boss)', 600, 450),
  Q('q6', 'Greenpath Pest Control', 'greenpath', { type: 'kill', zone: 'greenpath', n: 12 }, 'Defeat 12 enemies in Greenpath', 600, 450),
  Q('q7', "Hornet's Challenge", 'greenpath', { type: 'boss', zone: 'greenpath', n: 1 }, 'Defeat Hornet (.boss)', 1000, 800),
  Q('q8', 'Fungal Cull', 'fungal', { type: 'kill', zone: 'fungal', n: 15 }, 'Defeat 15 enemies in the Fungal Wastes', 1000, 800),
  Q('q9', 'Mantis Trial', 'fungal', { type: 'boss', zone: 'fungal', n: 1 }, 'Defeat the Mantis Lords (.boss)', 1600, 1300),
  Q('q10', 'City Patrol', 'city', { type: 'kill', zone: 'city', n: 15 }, 'Defeat 15 enemies in the City of Tears', 1600, 1300),
  Q('q11', 'Soul Master', 'city', { type: 'boss', zone: 'city', n: 1 }, 'Defeat the Soul Master (.boss)', 2400, 2000),
  Q('q12', 'Deepnest Delve', 'deepnest', { type: 'kill', zone: 'deepnest', n: 20 }, 'Defeat 20 enemies in Deepnest', 2400, 2000),
  Q('q13', 'Nosk', 'deepnest', { type: 'boss', zone: 'deepnest', n: 1 }, 'Defeat Nosk (.boss)', 3200, 2800),
  Q('q14', 'Into the Abyss', 'abyss', { type: 'kill', zone: 'abyss', n: 20 }, 'Defeat 20 enemies in the Abyss', 3500, 3200),
  Q('q15', 'The Hollow Knight', 'abyss', { type: 'boss', zone: 'abyss', n: 1 }, 'Defeat the Hollow Knight (.boss)', 6000, 6000),
];
const QMAP = {}; QUESTS.forEach(q => { QMAP[q.id] = q; });

module.exports = { CHARS, CINFO, ALL, CHARMS, SHOP, SHOP_MAP, CATS, CATINFO, findItem, ZONES, QUESTS, QMAP };
