// Anime DNA: a stored percentage split between 3-5 anime characters.
const POOL = [
  ['Goku', 'Dragon Ball'], ['Vegeta', 'Dragon Ball'], ['Naruto Uzumaki', 'Naruto'], ['Sasuke Uchiha', 'Naruto'], ['Itachi Uchiha', 'Naruto'],
  ['Kakashi Hatake', 'Naruto'], ['Monkey D. Luffy', 'One Piece'], ['Roronoa Zoro', 'One Piece'], ['Sanji', 'One Piece'], ['Nami', 'One Piece'],
  ['Satoru Gojo', 'Jujutsu Kaisen'], ['Ryomen Sukuna', 'Jujutsu Kaisen'], ['Yuji Itadori', 'Jujutsu Kaisen'], ['Levi Ackerman', 'Attack on Titan'],
  ['Eren Yeager', 'Attack on Titan'], ['Mikasa Ackerman', 'Attack on Titan'], ['Light Yagami', 'Death Note'], ['L', 'Death Note'],
  ['Killua Zoldyck', 'Hunter x Hunter'], ['Gon Freecss', 'Hunter x Hunter'], ['Saitama', 'One Punch Man'], ['Tanjiro Kamado', 'Demon Slayer'],
  ['Zenitsu Agatsuma', 'Demon Slayer'], ['Guts', 'Berserk'], ['Lelouch Lamperouge', 'Code Geass'], ['Edward Elric', 'Fullmetal Alchemist'],
  ['Rimuru Tempest', 'Tensei shitara Slime Datta Ken'], ['Sung Jinwoo', 'Solo Leveling'], ['Denji', 'Chainsaw Man'], ['Makima', 'Chainsaw Man'],
  ['Spike Spiegel', 'Cowboy Bebop'], ['Ichigo Kurosaki', 'Bleach'], ['Meliodas', 'Nanatsu no Taizai'], ['Alucard', 'Hellsing'],
  ['Erza Scarlet', 'Fairy Tail'], ['Frieren', 'Sousou no Frieren'], ['Esdeath', 'Akame ga Kill!'], ['Yor Forger', 'Spy x Family'], ['Anya Forger', 'Spy x Family'],
  ['Mob', 'Mob Psycho 100'], ['Thorfinn', 'Vinland Saga'], ['Gintoki Sakata', 'Gintama'], ['Maki Zenin', 'Jujutsu Kaisen'], ['Tsunade', 'Naruto'],
];

function roll() {
  const k = 3 + Math.floor(Math.random() * 3);
  const pool = POOL.slice(), picks = [];
  while (picks.length < k) picks.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  const w = picks.map(() => Math.pow(Math.random(), 1.6) + 0.2);
  const sum = w.reduce((a, b) => a + b, 0);
  const p = w.map(x => Math.max(5, Math.round(x / sum * 100)));
  const i = p.indexOf(Math.max.apply(null, p));
  p[i] += 100 - p.reduce((a, b) => a + b, 0);
  return picks.map((x, j) => ({ n: x[0], a: x[1], p: p[j] })).sort((a, b) => b.p - a.p);
}
module.exports = { POOL, roll };
