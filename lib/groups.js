// Cached group metadata + admin checks (LID aware).
const cache = new Map();
const TTL = 60000;
async function meta(sock, jid, force) {
  const c = cache.get(jid);
  if (c && !force && Date.now() - c.t < TTL) return c.m;
  const m = await sock.groupMetadata(jid);
  cache.set(jid, { m: m, t: Date.now() });
  return m;
}
const invalidate = jid => cache.delete(jid);
const cached = jid => { const c = cache.get(jid); return c ? c.m : undefined; };
const pids = p => [p.id, p.lid, p.phoneNumber, p.jid].filter(Boolean);

async function check(ctx, needBot) {
  if (!ctx.isGroup) return { ok: false, reason: 'Only in groups' };
  let m; try { m = await meta(ctx.sock, ctx.jid); } catch (e) { return { ok: false, reason: 'Could not read group info' }; }
  let admins = []; m.participants.forEach(p => { if (p.admin) admins = admins.concat(pids(p)); });
  const botIds = [ctx.sock.user.id.split(':')[0] + '@s.whatsapp.net'];
  if (ctx.sock.user.lid) botIds.push(ctx.sock.user.lid.split(':')[0] + '@lid');
  const botAdmin = m.participants.some(p => p.admin && pids(p).some(i => botIds.indexOf(i) > -1));
  const mine = (ctx.sids || []).concat([ctx.sender]);
  const info = { meta: m, admins: admins, botId: botIds[0], botIds: botIds, botAdmin: botAdmin, senderAdmin: mine.some(i => admins.indexOf(i) > -1) || ctx.isOwner };
  if (!info.senderAdmin) { info.ok = false; info.reason = 'Only admins can use this'; return info; }
  if (needBot && !botAdmin) { info.ok = false; info.reason = 'Make Malfoy ADMIN first'; return info; }
  info.ok = true; return info;
}
module.exports = { meta, invalidate, cached, check };
