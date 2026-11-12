const reg = require('../lib/registry');
const M = require('../lib/media');
const { http, rnd, pick, num } = require('../lib/util');
const tmp = M.tmp;
const fs = require('fs');
const util = require('util');
const exf = util.promisify(require('child_process').execFile);
const PREFIX = process.env.PREFIX || '.';

function fmtDur(s) { s = s || 0; return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }

// ---------- .play : image card + audio sent together ----------
reg.add(['play', 'song', 'music', 'ytmp3'], 'MEDIA', async c => {
  if (!c.full) return c.reply('Use: ' + PREFIX + 'play Asake - Lonely at the top');
  let url = M.safeUrl(c.full), v = null;
  if (url && M.isYT(url)) { v = { url: url, title: 'YouTube audio', author: { name: '' }, seconds: 0, thumbnail: null }; }
  else { v = await M.ytSearch(c.full); }
  if (!v) return c.reply('❌ Nothing found for *' + c.full + '*');
  if (v.seconds && v.seconds > 900) return c.reply('⚠️ Too long (max 15 min).');

  const thumbP = v.thumbnail ? M.buf(v.thumbnail) : Promise.resolve(null);
  const audioP = M.ytAudio(v.url);                    // start downloading immediately
  const thumb = await thumbP;
  const cap = '🎵 *' + v.title + '*\n👤 ' + (v.author && v.author.name || '') + '\n⏱️ ' + fmtDur(v.seconds) + '\n\n⏳ Sending audio...';
  await M.image(c.sock, c.jid, [thumb], cap, [], c.msg);   // image card goes out while audio downloads
  const a = await audioP;
  if (!a) return c.reply('❌ Could not download audio (the host IP may be blocked by YouTube).');
  return M.audioWithImage(c.sock, c.jid, a.buf, a.mime, { title: v.title, body: v.author && v.author.name, thumb: thumb, url: v.url }, c.msg);
});
reg.add(['ytmp4', 'video'], 'MEDIA', async c => {
  const url = M.safeUrl(c.full); if (!url) return c.reply('Use: ' + PREFIX + 'ytmp4 <youtube link>');
  await c.reply('⏳ Downloading video...');
  const b = await M.ytVideo(url);
  if (!b) return c.reply('❌ Could not download video.');
  return c.sock.sendMessage(c.jid, { video: b, caption: '🎬 By Malfoy' }, { quoted: c.msg });
});
reg.add(['tiktok', 'tt'], 'MEDIA', async c => {
  const url = M.safeUrl(c.full); if (!url) return c.reply('Use: ' + PREFIX + 'tiktok <link>');
  const d = await http('https://tikwm.com/api/?url=' + encodeURIComponent(url), { t: 12000 });
  const v = d && d.data && (d.data.play || d.data.hdplay);
  if (!v) return c.reply('❌ Could not fetch that TikTok.');
  const b = await M.buf(v); if (!b) return c.reply('❌ Download failed.');
  return c.sock.sendMessage(c.jid, { video: b, caption: '🎵 ' + (d.data.title || '').slice(0, 100) }, { quoted: c.msg });
});

// ---------- images ----------
reg.add(['waifu', 'anime'], 'MEDIA', c => M.image(c.sock, c.jid, [() => M.waifu('waifu'), () => M.neko()], '💖 Waifu', [], c.msg));
reg.add('neko', 'MEDIA', c => M.image(c.sock, c.jid, [() => M.neko(), () => M.waifu('neko')], '🐱 Neko', [], c.msg));
reg.add(['pinterest', 'img', 'image'], 'MEDIA', async c => {
  if (!c.full) return c.reply('Use: ' + PREFIX + 'pinterest naruto');
  return M.image(c.sock, c.jid, [() => M.pinterest(c.full), () => M.waifu('waifu')], '🖼️ ' + c.full, [], c.msg);
});
reg.add(['character', 'charimg'], 'MEDIA', async c => {
  if (!c.full) return c.reply('Use: ' + PREFIX + 'character Levi Ackerman');
  const u = await M.charImage(c.full); if (!u) return c.reply('❌ Character not found.');
  return M.image(c.sock, c.jid, [u], '✨ *' + c.full + '*', [], c.msg);
});
reg.add('pfp', 'MEDIA', async c => {
  const t = c.target() || c.sender;
  const b = await M.pfp(c.sock, t);
  if (!b) return c.reply('❌ No profile picture (or it is private).');
  return M.image(c.sock, c.jid, [b], '🖼️ Profile picture of @' + num(t), [t], c.msg);
});

// ---------- sticker / converters ----------
reg.add(['sticker', 's'], 'MEDIA', async c => {
  const q = c.quoted || {};
  const im = c.msg.message.imageMessage || q.imageMessage, vi = c.msg.message.videoMessage || q.videoMessage;
  if (!im && !vi) return c.reply('Send a photo/video with ' + PREFIX + 'sticker or reply to one');
  const i = tmp(vi ? '.mp4' : '.jpg'), o = tmp('.webp');
  try {
    fs.writeFileSync(i, await c.download(vi || im, vi ? 'video' : 'image'));
    const a = ['-y', '-i', i]; if (vi) a.push('-t', '8', '-an', '-r', '15');
    a.push('-vf', 'scale=512:512:force_original_aspect_ratio=decrease,format=rgba,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=#00000000', '-c:v', 'libwebp', '-q:v', '60', '-loop', '0', o);
    await exf('ffmpeg', a, { timeout: 60000 });
    return await c.sock.sendMessage(c.jid, { sticker: fs.readFileSync(o) }, { quoted: c.msg });
  } catch (e) { return c.reply('❌ Failed to make sticker'); } finally { M.rm(i); M.rm(o); }
});
reg.add(['toimage', 'toimg'], 'MEDIA', async c => {
  const st = c.quoted && c.quoted.stickerMessage; if (!st) return c.reply('Reply to a sticker with ' + PREFIX + 'toimage');
  const i = tmp('.webp'), o = tmp('.png');
  try { fs.writeFileSync(i, await c.download(st, 'sticker')); await exf('ffmpeg', ['-y', '-i', i, o], { timeout: 30000 }); return await c.sock.sendMessage(c.jid, { image: fs.readFileSync(o) }, { quoted: c.msg }); }
  catch (e) { return c.reply('❌ Failed (animated stickers are not supported)'); } finally { M.rm(i); M.rm(o); }
});
reg.add('tomp3', 'MEDIA', async c => {
  const q = c.quoted || {}; const vi = q.videoMessage || c.msg.message.videoMessage, au = q.audioMessage;
  if (!vi && !au) return c.reply('Reply to a video with ' + PREFIX + 'tomp3');
  const i = tmp(vi ? '.mp4' : '.ogg'), o = tmp('.mp3');
  try { fs.writeFileSync(i, await c.download(vi || au, vi ? 'video' : 'audio')); await exf('ffmpeg', ['-y', '-i', i, '-vn', '-acodec', 'libmp3lame', '-q:a', '4', o], { timeout: 60000 }); return await c.sock.sendMessage(c.jid, { audio: fs.readFileSync(o), mimetype: 'audio/mpeg' }, { quoted: c.msg }); }
  catch (e) { return c.reply('❌ Failed'); } finally { M.rm(i); M.rm(o); }
});
