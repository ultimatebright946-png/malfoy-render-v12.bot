const commands = new Map();
const cats = {};
function add(names, cat, fn, desc) {
  if (!Array.isArray(names)) names = [names];
  (cats[cat] = cats[cat] || []).push(names[0]);
  names.forEach(n => commands.set(n, { fn, main: names[0], cat, desc: desc || '', names }));
}
module.exports = { add, get: n => commands.get(n), cats, count: () => new Set(Array.from(commands.values()).map(c => c.main)).size };
