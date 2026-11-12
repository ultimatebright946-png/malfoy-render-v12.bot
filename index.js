require('dotenv').config();
const fs = require('fs');
const express = require('express');
const pino = require('pino');
const QR = require('qrcode');
const B = require('@whiskeysockets/baileys');
const makeWASocket = B.default || B.makeWASocket;
const { useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, downloadContentFromMessage, normalizeMessageContent } = B;

const db = require('./lib/db');
const G = require('./lib/groups');
const M = require('./lib/media');
const R = require('./lib/rpg');
const reg = require('./lib/registry');
const { num, rnd, between } = require('./lib/util');
['general', 'media', 'social', 'admin', 'economy', 'quest', 'web'].forEach(f => require('./commands/' + f));

const PREFIX = process.env.PREFIX || '.';
const PORT = process.env.PORT || 3000;
const DATA_DIR = process.env.DATA_DIR || '.';
const AUTH_DIR = DATA_DIR + '/auth';
const OWNERS = (process.env.OWNER_NUMBER || '').split(',').map(s => s.replace(/[^0-9]/g, '')).filter(Boolean);
fs.mkdirSync(AUTH_DIR, { recursive: true });

// ---------------- web server (Render needs a port) ----------------
const STATE = { qr: null, connected: false };
const app = express();
app.get('/health', (q, r) => r.send('ok'));
app.get('/qr', async (q, r) => {
  if (!process.env.QR_KEY || q.query.key !== process.env.QR_KEY) return r.status(403).send('Forbidden');
  if (STATE.connected) return r.send('Connected');
  if (!STATE.qr) return r.send('<meta http-equiv="refresh" content="3">Waiting for QR...');
  const img = await QR.toDataURL(STATE.qr);
  r.send('<meta http-equiv="refresh" content="20"><body style="background:#111;color:#fff;text-align:center;font-family:sans-serif"><h3>WhatsApp > Linked devices > Link a device</h3><img src="' + img + '" width="320">');
});
require('./lib/web').mount(app);
app.listen(PORT, '0.0.0.0', () => console.log('HTTP on ' + PORT));
if (process.env.RENDER_EXTERNAL_URL) setInterval(() => { fetch(process.env.RENDER_EXTERNAL_URL + '/health').catch(() => {}); }, 10 * 60 * 1000);

// ---------------- helpers ----------------
function textOf(m) {
  const x = m.message; if (!x) return '';
  return x.conversation || (x.extendedTextMessage && x.extendedTextMessage.text) || (x.imageMessage && x.imageMessage.caption) || (x.videoMessage && x.videoMessage.caption) || '';
}
const LINK_RE = /(https?:\/\/|chat\.whatsapp\.com\/|www\.)\S+/i;
async function readStream(st) { const ch = []; for await (const c of st) ch.push(c); return Buffer.concat(ch); }
const seen = new Set();

async function handle(sock, msg) {
  if (!msg || !msg.message || !msg.key || !msg.key.remoteJid) return;
  if (msg.key.fromMe && process.env.ALLOW_SELF !== 'true') return;
  const jid = msg.key.remoteJid;
  if (jid === 'status@broadcast' || jid.endsWith('@newsletter') || jid.endsWith('@broadcast')) return;
  if (msg.key.id) { if (seen.has(msg.key.id)) return; seen.add(msg.key.id); if (seen.size > 800) seen.delete(seen.values().next().value); }
  try { msg.message = normalizeMessageContent(msg.message) || msg.message; } catch (e) {}

  const isGroup = jid.endsWith('@g.us');
  const sids = [msg.key.participant, msg.key.participantAlt, msg.key.participantPn].filter(Boolean);
  let sender = msg.key.fromMe ? sock.user.id.split(':')[0] + '@s.whatsapp.net'
    : (isGroup ? (msg.key.participantAlt || msg.key.participantPn || msg.key.participant) : (jid.endsWith('@lid') && msg.key.remoteJidAlt ? msg.key.remoteJidAlt : jid));
  if (!sender) return;
  const text = textOf(msg).trim();
  const isOwner = !!msg.key.fromMe || OWNERS.indexOf(num(sender)) > -1;
  const u = db.getUser(sender, msg.pushName);
  if (u.banned && !isOwner) return;

  const ci = (msg.message.extendedTextMessage && msg.message.extendedTextMessage.contextInfo) || (msg.message.imageMessage && msg.message.imageMessage.contextInfo) || (msg.message.videoMessage && msg.message.videoMessage.contextInfo) || null;

  // --- moderation (groups) ---
  if (isGroup) {
    if (db.muted(jid).indexOf(sender) > -1 && !isOwner) { sock.sendMessage(jid, { delete: msg.key }).catch(() => {}); return; }
    const cfg = db.groupCfg(jid);
    if (cfg.antilink && text && LINK_RE.test(text) && !isOwner) {
      const gi = await G.check({ sock, jid, isGroup, sender, sids, isOwner }, false).catch(() => null);
      if (gi && gi.botAdmin && !gi.senderAdmin) {
        sock.sendMessage(jid, { delete: msg.key }).catch(() => {});
        sock.sendMessage(jid, { text: '🔗 @' + num(sender) + ' links are not allowed here.', mentions: [sender] }).catch(() => {});
        return;
      }
    }
  }

  // --- chat XP ---
  const now = Date.now();
  if (isGroup && now - u.lastMsgXp > 20000) {
    u.lastMsgXp = now; const r = R.gainXp(u, between(4, 8)); db.save();
    if (r.ups) sock.sendMessage(jid, { text: '🎉 *LEVEL UP!* @' + num(sender) + ' is now level *' + u.level + '*', mentions: [sender] }).catch(() => {});
  }

  if (!text || text.indexOf(PREFIX) !== 0) return;
  const body = text.slice(PREFIX.length).trim(); if (!body) return;
  const parts = body.split(/\s+/); const cmd = parts.shift().toLowerCase();
  const entry = reg.get(cmd); if (!entry) return;

  const mentioned = (ci && ci.mentionedJid) || [];
  const quotedSender = ci && ci.participant || null;
  const quoted = ci && ci.quotedMessage || null;
  const c = {
    sock, msg, jid, sender, sids, isGroup, isOwner, u, cmd, args: parts, full: parts.join(' '), quoted,
    mentioned, quotedSender,
    target: () => mentioned[0] || quotedSender || null,
    reply: (t, m) => sock.sendMessage(jid, { text: t, mentions: m || [] }, { quoted: msg }).catch(e => console.log('REPLY FAIL', e.message)),
    download: async (node, type) => readStream(await downloadContentFromMessage(node, type)),
  };
  try { await entry.fn(c); }
  catch (e) { console.log('CMD ERROR', cmd, e && e.stack || e); c.reply('⚠️ Something went wrong. Try again.'); }
}

// ---------------- connection ----------------
async function startBot() {
  const auth = await useMultiFileAuthState(AUTH_DIR);
  let version; try { version = (await fetchLatestBaileysVersion()).version; } catch (e) {}
  const sock = makeWASocket({
    auth: auth.state, version, logger: pino({ level: 'silent' }), printQRInTerminal: false,
    browser: B.Browsers ? B.Browsers.ubuntu('Chrome') : undefined,
    syncFullHistory: false, markOnlineOnConnect: false, generateHighQualityLinkPreview: false,
  });
  sock.ev.on('creds.update', auth.saveCreds);
  let pairAsked = false;

  sock.ev.on('connection.update', async u => {
    if (u.qr) {
      STATE.qr = u.qr; STATE.connected = false;
      const pn = (process.env.PAIRING_NUMBER || '').replace(/[^0-9]/g, '');
      if (pn && !sock.authState.creds.registered) {
        if (!pairAsked) { pairAsked = true; try { console.log('PAIRING CODE: ' + await sock.requestPairingCode(pn) + '   (WhatsApp > Linked devices > Link with phone number)'); } catch (e) { console.log('Pairing code failed:', e.message); pairAsked = false; } }
      } else if (!pn) { try { require('qrcode-terminal').generate(u.qr, { small: true }); } catch (e) {} }
    }
    if (u.connection === 'open') { STATE.connected = true; STATE.qr = null; console.log('MALFOY CONNECTED'); M.warm(); }
    if (u.connection === 'close') {
      STATE.connected = false;
      const code = u.lastDisconnect && u.lastDisconnect.error && u.lastDisconnect.error.output ? u.lastDisconnect.error.output.statusCode : 0;
      try { sock.ev.removeAllListeners(); sock.end && sock.end(undefined); } catch (e) {}
      if (code === DisconnectReason.loggedOut) {
        console.log('Logged out. Clearing session; a new login code/QR will be created.');
        try { fs.rmSync(AUTH_DIR, { recursive: true, force: true }); fs.mkdirSync(AUTH_DIR, { recursive: true }); } catch (e) {}
      }
      setTimeout(() => startBot().catch(e => console.log('RESTART FAIL', e.message)), code === DisconnectReason.connectionReplaced ? 10000 : 2500);
    }
  });

  // Every message is handled concurrently, so one slow download never delays the others.
  sock.ev.on('messages.upsert', ev => {
    if (ev.type && ev.type !== 'notify') return;
    for (const m of ev.messages) handle(sock, m).catch(e => console.log('HANDLE ERROR', e && e.message));
  });

  sock.ev.on('groups.update', us => us.forEach(g => G.invalidate(g.id)));
  sock.ev.on('group-participants.update', async ev => {
    G.invalidate(ev.id);
    if (ev.action !== 'add' || !db.groupCfg(ev.id).welcome) return;
    try {
      const m = await G.meta(sock, ev.id, true);
      for (const p of ev.participants) {
        const id = typeof p === 'string' ? p : p.id;
        const pic = await M.pfp(sock, id);
        await M.image(sock, ev.id, [pic, () => M.waifu('waifu')], '👋 Welcome @' + num(id) + ' to *' + m.subject + '*!\nType *' + PREFIX + 'menu* to see what I can do. ⚔️', [id]);
      }
    } catch (e) {}
  });
}
process.on('unhandledRejection', e => console.log('UNHANDLED', e && e.message || e));
process.on('uncaughtException', e => console.log('UNCAUGHT', e && e.message || e));
startBot().catch(e => { console.log('START FAIL', e.message); process.exit(1); });
