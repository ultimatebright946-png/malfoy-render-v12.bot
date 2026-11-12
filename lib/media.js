// Fast media layer: memory + disk caches, image/gif/audio senders with fallbacks.
const fs = require('fs');
const path = require('path');
const os = require('os');
const util = require('util');
const exf = util.promisify(require('child_process').execFile);
const { http, rnd, pick } = require('./util');

const MEDIA = path.join(__dirname, '..', 'media');
const DB_DIR = (process.env.DATA_DIR || '.') + '/database';
fs.mkdirSync(DB_DIR, { recursive: true });
const CACHE_FILE = DB_DIR + '/imgcache.json';
let imgCache = {}; try { imgCache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8')); } catch (e) {}
let ct = null;
function saveCache() { if (ct) return; ct = setTimeout(() => { ct = null; fs.writeFile(CACHE_FILE, JSON.stringify(imgCache), () => {}); }, 3000); }

const bufCache = new Map();
async function buf(url) {
  if (bufCache.has(url)) return bufCache.get(url);
  const b = await http(url, { type: 'buf', t: 9000 });
  if (b && b.length < 2000000) { bufCache.set(url, b); if (bufCache.size > 80) bufCache.delete(bufCache.keys().next().value); }
  return b;
}
const tmp = ext => path.join(os.tmpdir(), 'mf_' + Date.now() + '_' + rnd(1e6) + (ext || ''));
const rm = f => { try { fs.unlinkSync(f); } catch (e) {} };

// optional local images: media/<name>.jpg|png|webp
const localCache = new Map();
function local(name) {
  if (localCache.has(name)) return localCache.get(name);
  let r = null;
  for (const e of ['jpg', 'jpeg', 'png', 'webp']) { const p = path.join(MEDIA, name + '.' + e); if (fs.existsSync(p)) { r = fs.readFileSync(p); break; } }
  localCache.set(name, r); return r;
}

// Character art. Sources tried in order: disk cache -> AniList -> Jikan (with retry) -> Pinterest.
// The anime title is used to pick the right "Nami" / "Erza" etc. Results are cached forever on disk.
const norm = s => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
function pickAniList(list, name, anime) {
  if (!list || !list.length) return null;
  const an = norm(anime), nn = norm(name);
  const titles = c => ((c.media && c.media.nodes) || []).reduce((a, n) => a.concat([n.title && n.title.romaji, n.title && n.title.english]), []).filter(Boolean).map(norm);
  const inShow = c => an && titles(c).some(t => t.indexOf(an) > -1 || an.indexOf(t) > -1);
  const sameName = c => c.name && norm(c.name.full) === nn;
  return list.find(c => inShow(c) && sameName(c)) || list.find(inShow) || list.find(sameName) || list[0];
}
async function fromAniList(name, anime) {
  const q = 'query($s:String){Page(perPage:8){characters(search:$s,sort:FAVOURITES_DESC){name{full} image{large medium} media(perPage:4){nodes{title{romaji english}}}}}}';
  for (let i = 0; i < 2; i++) {
    const d = await http('https://graphql.anilist.co', { t: 10000, method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ query: q, variables: { s: name } }) });
    const list = d && d.data && d.data.Page && d.data.Page.characters;
    if (list) { const c = pickAniList(list, name, anime); const u = c && c.image && (c.image.large || c.image.medium); if (u && u.indexOf('default') === -1) return u; return null; }
    await new Promise(r => setTimeout(r, 800));
  }
  return null;
}
async function fromJikan(name) {
  for (let i = 0; i < 2; i++) {
    const d = await http('https://api.jikan.moe/v4/characters?limit=3&order_by=favorites&sort=desc&q=' + encodeURIComponent(name), { t: 9000 });
    const u = d && d.data && d.data[0] && d.data[0].images && d.data[0].images.jpg && d.data[0].images.jpg.image_url;
    if (u && u.indexOf('questionmark') === -1) return u;
    if (d) return null;                       // got an answer but no image: do not retry
    await new Promise(r => setTimeout(r, 1200)); // timeout / 429: retry once
  }
  return null;
}
async function charImage(name, anime) {
  const key = (name + '|' + (anime || '')).toLowerCase();
  if (imgCache[key]) return imgCache[key];
  let u = await fromAniList(name, anime);
  if (!u) u = await fromJikan(name);
  if (!u) u = await pinterest(name + ' ' + (anime || '') + ' character');
  if (u) { imgCache[key] = u; saveCache(); } else console.log('NO IMAGE FOUND for', name, anime || '');
  return u || null;
}
async function waifu(kind) { const d = await http('https://api.waifu.pics/sfw/' + (kind || 'waifu'), { t: 6000 }); return d && d.url || null; }
async function neko() { const d = await http('https://nekos.best/api/v2/neko', { t: 6000 }); return d && d.results && d.results[0] && d.results[0].url || null; }
async function actionGif(kind) {
  const d = await http('https://nekos.best/api/v2/' + kind, { t: 6000 });
  const u = d && d.results && d.results[0] && d.results[0].url; if (u) return u;
  return waifu(kind);
}
async function pinterest(q) {
  const d = await http('https://www.pinterest.com/resource/BaseSearchResource/get/?data=' + encodeURIComponent(JSON.stringify({ options: { query: q + ' anime', scope: 'pins', page_size: 25 }, context: {} })), { t: 8000, headers: { 'X-Pinterest-AppState': 'active' } });
  const r = d && d.resource_response && d.resource_response.data && d.resource_response.data.results;
  if (r && r.length) { const x = r.filter(p => p.images && p.images.orig); if (x.length) return pick(x).images.orig.url; }
  return null;
}
async function pfp(sock, jid) {
  try { const u = await sock.profilePictureUrl(jid, 'image'); return u ? await buf(u) : null; } catch (e) { return null; }
}

// ---- senders ----
async function resolve(src) {
  if (typeof src === 'function') src = await src();
  if (!src) return null;
  if (Buffer.isBuffer(src)) return src;
  if (/^https?:/.test(src)) return buf(src);
  try { return fs.readFileSync(src); } catch (e) { return null; }
}
// srcs: array of Buffer | url | function returning one. First that works is sent.
async function image(sock, jid, srcs, caption, mentions, quoted) {
  if (!Array.isArray(srcs)) srcs = [srcs];
  for (const s of srcs) {
    let b = null; try { b = await resolve(s); } catch (e) {}
    if (!b) continue;
    try { return await sock.sendMessage(jid, { image: b, caption: caption || '', mentions: mentions || [] }, quoted ? { quoted } : {}); } catch (e) {}
  }
  return sock.sendMessage(jid, { text: caption || '', mentions: mentions || [] }, quoted ? { quoted } : {});
}
async function animation(sock, jid, url, caption, mentions, quoted) {
  const b = url && await buf(url); if (!b) return false;
  const opt = quoted ? { quoted } : {};
  try {
    let v = b;
    if (/\.gif(\?|$)/i.test(url)) {
      const i = tmp('.gif'), o = tmp('.mp4'); fs.writeFileSync(i, b);
      try { await exf('ffmpeg', ['-y', '-i', i, '-movflags', 'faststart', '-pix_fmt', 'yuv420p', '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2', o], { timeout: 25000 }); v = fs.readFileSync(o); }
      finally { rm(i); rm(o); }
    }
    await sock.sendMessage(jid, { video: v, gifPlayback: true, caption: caption || '', mentions: mentions || [] }, opt); return true;
  } catch (e) { return false; }
}

// Audio + image sent together: image card first (instant), audio carries the same thumbnail.
async function audioWithImage(sock, jid, audio, mime, info, quoted) {
  const opt = quoted ? { quoted } : {};
  return sock.sendMessage(jid, {
    audio: audio, mimetype: mime, ptt: false,
    contextInfo: info.thumb ? { externalAdReply: { title: info.title, body: info.body || '', thumbnail: info.thumb, mediaType: 1, renderLargerThumbnail: true, showAdAttribution: false, sourceUrl: info.url || undefined } } : undefined,
  }, opt);
}

// yt-dlp helpers (argument arrays only: no shell injection)
const YT_RE = /(^|\.)(youtube\.com|youtu\.be|music\.youtube\.com)$/i;
function isYT(u) { try { return YT_RE.test(new URL(u).hostname); } catch (e) { return false; } }
function safeUrl(u) { try { const x = new URL(u); return (x.protocol === 'https:' || x.protocol === 'http:') ? x.href : null; } catch (e) { return null; } }
async function ytAudio(url) {
  const base = tmp('');
  try {
    await exf('yt-dlp', ['-f', 'bestaudio[ext=m4a]/bestaudio', '--no-playlist', '--max-filesize', '40M', '--no-part', '-o', base + '.%(ext)s', '--', url], { timeout: 110000 });
  } catch (e) { console.log('yt-dlp audio fail:', (e.stderr || e.message || '').toString().slice(0, 200)); }
  const f = fs.readdirSync(os.tmpdir()).find(x => x.indexOf(path.basename(base) + '.') === 0);
  if (!f) return null;
  const full = path.join(os.tmpdir(), f);
  try {
    if (/\.m4a$/i.test(f)) { const b = fs.readFileSync(full); return { buf: b, mime: 'audio/mp4' }; }
    const out = base + '_c.mp3';
    await exf('ffmpeg', ['-y', '-i', full, '-vn', '-acodec', 'libmp3lame', '-q:a', '5', out], { timeout: 60000 });
    const b = fs.readFileSync(out); rm(out); return { buf: b, mime: 'audio/mpeg' };
  } catch (e) { return null; } finally { rm(full); }
}
async function ytVideo(url) {
  const base = tmp('');
  try {
    await exf('yt-dlp', ['-f', 'mp4[height<=480]/best[height<=480]/best', '--merge-output-format', 'mp4', '--no-playlist', '--max-filesize', '60M', '-o', base + '.%(ext)s', '--', url], { timeout: 150000 });
  } catch (e) { console.log('yt-dlp video fail:', (e.stderr || e.message || '').toString().slice(0, 200)); }
  const f = fs.readdirSync(os.tmpdir()).find(x => x.indexOf(path.basename(base) + '.') === 0);
  if (!f) return null;
  const full = path.join(os.tmpdir(), f);
  try { return fs.readFileSync(full); } catch (e) { return null; } finally { rm(full); }
}
let yts = null; try { yts = require('yt-search'); } catch (e) {}
async function ytSearch(q) {
  if (!yts) return null;
  try { const r = await yts(q); return r && r.videos && r.videos[0] || null; } catch (e) { return null; }
}

const KILL_CHARS = ['Akame', 'Esdeath', 'Light Yagami', 'Levi Ackerman', 'Alucard', 'Guts', 'Revy', 'Ryuk', 'Denji', 'Eren Yeager', 'Mikasa Ackerman', 'Killua Zoldyck', 'Itachi Uchiha', 'Sung Jinwoo', 'Gojo Satoru', 'Meliodas'];
function warm() { // fill the disk cache in the background so .kill / .sm are instant
  const D = require('./data'); const jobs = KILL_CHARS.map(n => [n, '']).concat(D.ALL.map(c => [c.name, c.anime]));
  (async () => { for (const j of jobs) { if (!imgCache[(j[0] + '|' + j[1]).toLowerCase()]) { await charImage(j[0], j[1]); await new Promise(r => setTimeout(r, 700)); } } })().catch(() => {});
}

const cachedChar = (name, anime) => imgCache[(name + '|' + (anime || '')).toLowerCase()] || null;
module.exports = { buf, local, charImage, cachedChar, waifu, neko, actionGif, pinterest, pfp, image, animation, audioWithImage, ytAudio, ytVideo, ytSearch, isYT, safeUrl, tmp, rm, KILL_CHARS, warm };
