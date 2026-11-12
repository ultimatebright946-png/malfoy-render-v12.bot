'use strict';
(function () {
  var view = document.getElementById('view'), who = document.getElementById('who');
  var state = { me: null, shop: null, hallBy: 'level', shopCat: 'ALL' };
  var NF = new Intl.NumberFormat();

  // ---------- helpers ----------
  function h(tag, props) {
    var e = document.createElement(tag); props = props || {};
    Object.keys(props).forEach(function (k) {
      var v = props[k]; if (v == null || v === false) return;
      if (k === 'class') e.className = v; else if (k === 'text') e.textContent = v;
      else if (k.slice(0, 2) === 'on') e.addEventListener(k.slice(2), v); else e.setAttribute(k, v === true ? '' : v);
    });
    for (var i = 2; i < arguments.length; i++) { var c = arguments[i]; if (c == null || c === false) continue; e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); }
    return e;
  }
  function api(path, body) {
    var o = { credentials: 'same-origin', headers: { 'X-Requested-With': 'fetch' } };
    if (body !== undefined) { o.method = 'POST'; o.headers['Content-Type'] = 'application/json'; o.body = JSON.stringify(body); }
    return fetch(path, o).then(function (r) { return r.json().catch(function () { return { ok: false, msg: 'Something went wrong. Try again.' }; }); })
      .catch(function () { return { ok: false, msg: 'Could not reach the server. Check your connection.' }; });
  }
  var tt;
  function toast(t) { var el = document.getElementById('toast'); el.textContent = t; el.classList.add('on'); clearTimeout(tt); tt = setTimeout(function () { el.classList.remove('on'); }, 3200); }
  function avatar(url, name, cls) {
    if (url) return h('img', { class: 'av ' + (cls || ''), src: url, alt: '', loading: 'lazy' });
    return h('span', { class: 'av ' + (cls || ''), 'aria-hidden': 'true', text: (name || '?').trim().charAt(0).toUpperCase() });
  }
  function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); }

  // ---------- header ----------
  function renderWho() {
    clear(who);
    if (state.me) who.appendChild(h('a', { href: '#/me', 'aria-label': 'Your profile' }, avatar(state.me.pfp, state.me.name, 'sm')));
    if (state.me) who.appendChild(h('span', { class: 'geo', text: NF.format(state.me.coins) + ' Geo' }));
    else who.appendChild(h('a', { class: 'btn small', href: '#/', text: 'Sign in' }));
  }

  // ---------- views ----------
  function homeView() {
    var box = h('div', { class: 'hero' });
    var left = h('div');
    left.appendChild(h('h1', { text: 'Malfoy' }));
    left.appendChild(h('p', { class: 'lede', text: 'A quest bot for WhatsApp. Explore Hallownest, grow stronger, collect gear and win over anime characters.' }));
    if (state.me) {
      left.appendChild(h('p', { text: 'Signed in as ' + state.me.name + '. You are ranked #' + NF.format(state.me.rank) + ' of ' + NF.format(state.me.players) + '.' }));
      left.appendChild(h('div', { class: 'actions' }, h('a', { class: 'btn', href: '#/me', text: 'Open your profile' }), h('a', { class: 'btn quiet', href: '#/shop', text: 'Visit the shop' })));
    } else {
      var inp = h('input', { type: 'text', id: 'code', maxlength: '12', autocomplete: 'one-time-code', autocapitalize: 'characters', spellcheck: 'false', placeholder: 'XXXXXXXX', 'aria-describedby': 'codehelp' });
      var msg = h('p', { class: 'msg', role: 'alert' });
      var btn = h('button', { class: 'btn', type: 'submit', text: 'Sign in' });
      var form = h('form', { class: 'signin', onsubmit: function (e) {
        e.preventDefault(); btn.disabled = true; msg.className = 'msg'; msg.textContent = '';
        api('/api/login', { code: inp.value }).then(function (r) {
          btn.disabled = false;
          if (!r.ok) { msg.className = 'msg bad'; msg.textContent = r.msg; return; }
          state.me = r.me; renderWho(); toast('Signed in as ' + r.me.name); location.hash = '#/me';
        });
      } },
        h('label', { for: 'code', text: 'Login code from the bot' }),
        h('div', { class: 'field' }, inp, btn), msg,
        h('p', { class: 'hint', id: 'codehelp', text: 'Send .weblogin to the bot in a private chat. The code works once and lasts 10 minutes.' }));
      left.appendChild(form);
    }
    var art = h('figure', { class: 'art' }, h('img', { src: '/gallery/dementor-girl.jpg', alt: 'Illustration of a girl in a green and black robe with a hand over her mouth, labelled Dementor, Dementor', width: '736', height: '1009' }), h('figcaption', { text: 'Art by @GaVeaul' }));
    box.appendChild(left); box.appendChild(art);
    var top = h('section', { class: 'section' }, h('header', {}, h('h2', { text: 'Top hunters' }), h('p', { class: 'muted', text: 'Highest levels across every group the bot is in.' })));
    var holder = h('div'); top.appendChild(holder);
    top.appendChild(h('p', {}, h('a', { href: '#/hall', text: 'See the full leaderboard' })));
    view.appendChild(box); view.appendChild(top);
    api('/api/leaderboard?by=level').then(function (r) { fillHall(holder, (r.list || []).slice(0, 5), 'level'); });
  }

  function valueOf(p, by) { return by === 'coins' ? NF.format(p.coins) + ' Geo' : by === 'kills' ? NF.format(p.kills) + ' kills' : 'Level ' + p.level; }
  function fillHall(holder, list, by) {
    clear(holder);
    if (!list.length) { holder.appendChild(h('p', { class: 'empty', text: 'No hunters yet. Play on WhatsApp with .explore to take the first place.' })); return; }
    var ul = h('ol', { class: 'rows' });
    list.forEach(function (p) {
      var cls = 'row hallrow' + (p.rank <= 3 ? ' top' + p.rank : '') + (state.me && state.me.pid === p.pid ? ' mine' : '');
      ul.appendChild(h('li', { class: cls },
        h('span', { class: 'rk', text: String(p.rank) }), avatar(p.pfp, p.name),
        h('div', { class: 'nm' }, p.name, h('div', { class: 'sub', text: by === 'level' ? NF.format(p.xp) + ' XP' : 'Level ' + p.level })),
        h('span', { class: 'val', text: valueOf(p, by) })));
    });
    holder.appendChild(ul);
  }
  function hallView() {
    view.appendChild(h('section', { class: 'section' }, h('header', {}, h('h2', { text: 'Global leaderboard' }), h('p', { class: 'muted', text: 'Every player from every group, ranked together.' }))));
    var holder = h('div'), tabs = h('div', { class: 'tabs', role: 'group', 'aria-label': 'Rank by' });
    [['level', 'Level'], ['coins', 'Geo'], ['kills', 'Kills']].forEach(function (t) {
      var b = h('button', { class: 'chip', type: 'button', 'aria-pressed': String(state.hallBy === t[0]), text: t[1], onclick: function () { state.hallBy = t[0]; Array.prototype.forEach.call(tabs.children, function (c) { c.setAttribute('aria-pressed', 'false'); }); b.setAttribute('aria-pressed', 'true'); load(); } });
      tabs.appendChild(b);
    });
    view.lastChild.appendChild(tabs); view.lastChild.appendChild(holder);
    function load() { api('/api/leaderboard?by=' + state.hallBy).then(function (r) { fillHall(holder, r.list || [], state.hallBy); }); }
    load();
  }

  function shopView() {
    var sec = h('section', { class: 'section' }, h('header', {}, h('h2', { text: 'Shop' }), h('p', { class: 'muted', text: 'Gear you buy here is yours in the bot right away.' })));
    var tabs = h('div', { class: 'tabs', role: 'group', 'aria-label': 'Category' }), holder = h('div');
    sec.appendChild(tabs); sec.appendChild(holder); view.appendChild(sec);
    function draw() {
      clear(holder);
      var items = state.shop.items.filter(function (i) { return state.shopCat === 'ALL' || i.cat === state.shopCat; });
      var ul = h('ul', { class: 'rows' });
      items.forEach(function (it) {
        var action;
        if (it.owned) action = h('span', { class: 'owned', text: 'Owned' });
        else if (!state.me) action = h('a', { class: 'btn quiet small', href: '#/', text: 'Sign in to buy' });
        else action = h('button', { class: 'btn small', type: 'button', disabled: state.me.coins < it.price, text: 'Buy', onclick: function (e) { buy(it, e.currentTarget); } });
        ul.appendChild(h('li', { class: 'row shoprow' }, h('span', { class: 'em', 'aria-hidden': 'true', text: it.emoji }),
          h('div', {}, h('div', { class: 'nm', text: it.name }), h('div', { class: 'ds', text: it.desc })),
          h('div', { class: 'buy' }, h('span', { class: 'price', text: NF.format(it.price) + ' Geo' }), action)));
      });
      holder.appendChild(ul);
    }
    function buy(it, btn) {
      btn.disabled = true;
      api('/api/buy', { id: it.id }).then(function (r) {
        if (r.ok) { state.me.coins = r.coins; renderWho(); }
        toast(r.msg);
        loadShop(function () { draw(); });
      });
    }
    function chips() {
      clear(tabs);
      ['ALL'].concat(state.shop.cats).forEach(function (c) {
        var label = c === 'ALL' ? 'All' : c.charAt(0) + c.slice(1).toLowerCase();
        tabs.appendChild(h('button', { class: 'chip', type: 'button', 'aria-pressed': String(state.shopCat === c), text: label, onclick: function () { state.shopCat = c; chips(); draw(); } }));
      });
    }
    loadShop(function () { chips(); draw(); });
  }
  function loadShop(cb) { api('/api/shop').then(function (r) { if (r.ok) { state.shop = r; if (state.me && r.coins != null) state.me.coins = r.coins; renderWho(); cb(); } }); }

  function meView() {
    var m = state.me;
    if (!m) { view.appendChild(h('section', { class: 'section' }, h('h2', { text: 'Sign in to see your profile' }), h('p', { class: 'muted', text: 'Send .weblogin to the bot in a private chat, then enter the code on the home page.' }), h('a', { class: 'btn', href: '#/', text: 'Go to sign in' }))); return; }
    var fileIn = h('input', { type: 'file', accept: 'image/png,image/jpeg,image/webp', hidden: true, id: 'file' });
    fileIn.addEventListener('change', function () { var f = fileIn.files[0]; if (f) upload(f); fileIn.value = ''; });
    var nameIn = h('input', { type: 'text', value: m.name, maxlength: '20', 'aria-label': 'Display name' });
    var galleryBox = h('div', { class: 'gallery', hidden: true });
    m.gallery.forEach(function (g) { galleryBox.appendChild(h('button', { type: 'button', title: g.title, 'aria-label': 'Use picture: ' + g.title, onclick: function () { send('/api/pfp/gallery', { key: g.key }, 'Picture updated'); } }, h('img', { src: g.url, alt: g.title, loading: 'lazy' }))); });
    var head = h('div', { class: 'me-head' }, avatar(m.pfp, m.name, 'lg'),
      h('div', {}, h('h2', { text: m.name }), h('p', { class: 'muted', text: 'Level ' + m.level + ', ranked #' + NF.format(m.rank) + ' of ' + NF.format(m.players) }),
        h('div', { class: 'field' }, nameIn, h('button', { class: 'btn quiet small', type: 'button', text: 'Save name', onclick: function () { send('/api/name', { name: nameIn.value }, 'Name saved'); } })),
        h('div', { class: 'actions' },
          h('button', { class: 'btn small', type: 'button', text: 'Upload photo', onclick: function () { fileIn.click(); } }),
          h('button', { class: 'btn quiet small', type: 'button', text: 'Choose from gallery', onclick: function () { galleryBox.hidden = !galleryBox.hidden; } }),
          m.pfp ? h('button', { class: 'btn quiet small', type: 'button', text: 'Remove photo', onclick: function () { send('/api/pfp/clear', {}, 'Photo removed'); } }) : null),
        galleryBox, fileIn));
    var pct = Math.floor(m.xp / m.xpNeeded * 100), fill = h('div', { class: 'bar-fill' }); fill.style.width = pct + '%';
    function row(k, v) { return h('div', {}, h('dt', { text: k }), h('dd', { text: v })); }
    var stats = h('dl', { class: 'stats' }, row('Geo', NF.format(m.coins)), row('Gems', NF.format(m.gems)), row('Charm', NF.format(m.charm)), row('Masks', m.hp + ' of ' + m.masks), row('Nail damage', String(m.damage)), row('Crit chance', m.crit + '%'), row('XP bonus', '+' + m.xpBonus + '%'), row('Kills', NF.format(m.kills)), row('Quests done', String(m.quests)), row('Bosses beaten', String(m.bosses)), row('Location', m.zone), row('Daily streak', String(m.streak)));
    var prog = h('section', { class: 'section' }, h('header', {}, h('h3', { text: 'Level progress' })), h('div', { class: 'bar-track', role: 'progressbar', 'aria-valuenow': String(pct), 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-label': 'XP progress' }, fill), h('p', { class: 'muted', text: NF.format(m.xp) + ' of ' + NF.format(m.xpNeeded) + ' XP to level ' + (m.level + 1) }));
    view.appendChild(head); view.appendChild(prog);
    view.appendChild(h('section', { class: 'section' }, h('header', {}, h('h3', { text: 'Stats' })), stats));
    var sm = h('section', { class: 'section' }, h('header', {}, h('h3', { text: 'Soulmate' })));
    if (m.soulmate) sm.appendChild(h('div', { class: 'soul-row' }, m.soulmate.img ? h('img', { src: m.soulmate.img, alt: m.soulmate.name, loading: 'lazy', referrerpolicy: 'no-referrer' }) : null, h('div', {}, h('div', { class: 'nm', text: m.soulmate.name }), h('div', { class: 'muted', text: m.soulmate.anime + ', bond level ' + m.soulmate.bond + ' of 10' }))));
    else sm.appendChild(h('p', { class: 'muted', text: 'No soulmate yet. Send .sm to the bot to meet one.' }));
    view.appendChild(sm);
    var dn = h('section', { class: 'section' }, h('header', {}, h('h3', { text: 'Anime DNA' })));
    if (m.dna) { var ul = h('ul', { class: 'dna' }); m.dna.forEach(function (p) { var f = h('div', { class: 'bar-fill' }); f.style.width = p.p + '%'; ul.appendChild(h('li', {}, h('span', { class: 'pc', text: p.p + '%' }), h('span', {}, p.n, ' ', h('small', { text: p.a })), h('div', { class: 'bar-track ct' }, f))); }); dn.appendChild(ul); }
    else dn.appendChild(h('p', { class: 'muted', text: 'Send .animedna to the bot to find out which characters you are made of.' }));
    view.appendChild(dn);
    view.appendChild(h('p', { class: 'section' }, h('button', { class: 'btn quiet', type: 'button', text: 'Sign out', onclick: function () { api('/api/logout', {}).then(function () { state.me = null; renderWho(); toast('Signed out'); location.hash = '#/'; }); } })));

    function send(path, body, okText) { api(path, body).then(function (r) { if (r.ok) { state.me = r.me; renderWho(); toast(okText); route(); } else toast(r.msg || 'Could not save that.'); }); }
    function upload(file) {
      if (!/^image\/(png|jpeg|webp)$/.test(file.type)) { toast('Choose a PNG, JPG or WebP image.'); return; }
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function () {
        var s = Math.min(img.width, img.height), c = document.createElement('canvas'); c.width = c.height = 512;
        c.getContext('2d').drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, 512, 512);
        URL.revokeObjectURL(url); send('/api/pfp', { data: c.toDataURL('image/jpeg', 0.85) }, 'Picture updated');
      };
      img.onerror = function () { URL.revokeObjectURL(url); toast('That file is not a valid image.'); };
      img.src = url;
    }
  }

  // ---------- router ----------
  var TITLES = { home: 'Malfoy', hall: 'Leaderboard - Malfoy', shop: 'Shop - Malfoy', me: 'Profile - Malfoy' };
  function route() {
    var r = (location.hash.replace(/^#\/?/, '') || 'home'); if (!TITLES[r]) r = 'home';
    clear(view); document.title = TITLES[r];
    Array.prototype.forEach.call(document.querySelectorAll('#nav a'), function (a) { if (a.getAttribute('data-r') === r) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    ({ home: homeView, hall: hallView, shop: shopView, me: meView })[r]();
  }
  window.addEventListener('hashchange', function () { route(); window.scrollTo(0, 0); });
  api('/api/me').then(function (r) { state.me = r.ok ? r.me : null; renderWho(); route(); });
})();
