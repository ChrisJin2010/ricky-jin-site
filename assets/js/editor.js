/* ======================================================================
   Ricky Jin — inline editing system (cloud-backed)

   Content lives in the cloud database, so it can be edited from any device
   and is visible to anonymous visitors (admissions officers) immediately.

     site_text  — editable copy, one row per data-key
     site_media — photos (compressed data URL) and embedded video links

   Reading is public; writing requires a signed-in editor (enforced by RLS
   in the database, not by this file).
   ====================================================================== */
(function () {
  'use strict';

  var CFG = window.RICKY_CLOUD_CONFIG || null;
  var PAGE = (function () {
    var f = (location.pathname.split('/').pop() || 'index.html').replace(/\.html$/, '');
    return (f === 'index' || f === '') ? 'home' : f;
  })();
  var MODE_KEY = 'ricky-jin-site.editmode';

  var cloud = null;
  if (CFG && window.WorkBuddyCloud) {
    cloud = WorkBuddyCloud.createWorkBuddyCloud({
      endpoint: CFG.endpoint,
      oauthRelayBaseUrl: CFG.oauthRelayBaseUrl,
      publishableKey: CFG.publishableKey
    });
  }

  var editing = false;
  var session = null;
  var remote = { text: {}, media: {} };
  var loaded = false;

  function pageOf(key) { return String(key).split('.')[0]; }

  /* --------------------------------------------------------------- toast */
  var toastEl = null, toastTimer = null;
  function toast(msg, isErr) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'toast';
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    toastEl.classList.toggle('is-err', !!isErr);
    toastEl.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('is-on'); }, 3200);
  }

  /* ------------------------------------------------------------- render */
  function applyImage(fig) {
    var src = remote.media[fig.getAttribute('data-img-key')];
    var img = fig.querySelector('img');
    if (src && img) { img.src = src; fig.classList.add('has-img'); }
  }
  function applyVideo(box) {
    var key = box.getAttribute('data-video-key');
    var src = remote.media[key];
    if (!src) return;
    box.innerHTML = '<iframe src="' + src + '" title="Embedded video" ' +
      'allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture" allowfullscreen></iframe>';
    box.classList.add('has-video');
  }
  function applyAll() {
    document.querySelectorAll('[data-key]').forEach(function (el) {
      var v = remote.text[el.getAttribute('data-key')];
      if (typeof v === 'string') el.innerHTML = v;
    });
    document.querySelectorAll('[data-img-key]').forEach(applyImage);
    document.querySelectorAll('[data-video-key]').forEach(applyVideo);
  }

  /* ------------------------------------------------- bundled snapshot */
  // assets/js/content.js holds a static copy of the content. It is used as
  // the baseline before the cloud answers, and is what visitors see if the
  // cloud is unreachable.
  function loadBaked() {
    var b = window.RICKY_SITE_CONTENT;
    if (!b) return;
    Object.assign(remote.text, b.text || {});
    Object.assign(remote.media, b.img || {}, b.video || {});
  }

  /* -------------------------------------------------------- cloud read */
  function loadRemote() {
    if (!cloud) return Promise.reject(new Error('no-cloud'));
    var pages = [PAGE, 'global'];
    return cloud.database.from('site_text')
      .select('item_key, html')
      .in('page', pages)
      .then(function (res) {
        if (res.error) throw res.error;
        res.data.forEach(function (r) { remote.text[r.item_key] = r.html; });
        return cloud.database.from('site_media').select('item_key, kind, data').in('page', pages);
      })
      .then(function (res) {
        if (res.error) throw res.error;
        res.data.forEach(function (r) { remote.media[r.item_key] = r.data; });
      });
  }

  /* ------------------------------------------------------- cloud write */
  function upsertText(rows) {
    return cloud.database.from('site_text').upsert(rows, { onConflict: 'item_key' });
  }
  function upsertMedia(row) {
    return cloud.database.from('site_media').upsert(row, { onConflict: 'item_key' });
  }

  function saveNow(quiet) {
    if (!editing || !cloud || !session) return Promise.resolve(false);
    var rows = [];
    document.querySelectorAll('[data-key]').forEach(function (el) {
      var k = el.getAttribute('data-key');
      rows.push({ item_key: k, page: pageOf(k), html: el.innerHTML });
    });
    return upsertText(rows).then(function (res) {
      if (res.error) throw res.error;
      if (!quiet) toast('Saved — live for everyone');
      return true;
    }).catch(function (err) {
      toast('Save failed: ' + (err && err.message ? err.message : 'unknown error'), true);
      return false;
    });
  }

  var saveTimer = null;
  function queueSave() {
    if (!editing) return;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () { saveNow(true); }, 1200);
  }

  /* ---------------------------------------------------------- compress */
  var MAX_EDGE = 1400;
  function compress(file) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        URL.revokeObjectURL(url);
        var scale = Math.min(1, MAX_EDGE / Math.max(img.width, img.height));
        var w = Math.max(1, Math.round(img.width * scale));
        var h = Math.max(1, Math.round(img.height * scale));
        var c = document.createElement('canvas');
        c.width = w; c.height = h;
        c.getContext('2d').drawImage(img, 0, 0, w, h);
        function done(blob) {
          if (!blob) return reject(new Error('encode failed'));
          var fr = new FileReader();
          fr.onload = function () { resolve(fr.result); };
          fr.onerror = reject;
          fr.readAsDataURL(blob);
        }
        if (c.toBlob) {
          c.toBlob(function (b) {
            if (b) done(b); else c.toBlob(done, 'image/jpeg', 0.8);
          }, 'image/webp', 0.8);
        } else {
          resolve(c.toDataURL('image/jpeg', 0.8));
        }
      };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('bad image')); };
      img.src = url;
    });
  }

  function pickFile(accept) {
    return new Promise(function (resolve) {
      var input = document.createElement('input');
      input.type = 'file';
      input.accept = accept || 'image/*';
      input.style.display = 'none';
      document.body.appendChild(input);
      input.addEventListener('change', function () {
        var f = input.files && input.files[0];
        input.remove();
        resolve(f || null);
      });
      input.click();
    });
  }

  function toEmbed(url) {
    var u = (url || '').trim();
    if (!u) return '';
    if (/\/embed\//.test(u) || /player\.bilibili/.test(u)) return u.replace(/^http:/, 'https:');
    var yt = u.match(/(?:v=|youtu\.be\/|shorts\/)([A-Za-z0-9_-]{6,})/);
    if (yt) return 'https://www.youtube.com/embed/' + yt[1];
    var bv = u.match(/(BV[0-9A-Za-z]{8,10})/);
    if (bv) return 'https://player.bilibili.com/player.html?bvid=' + bv[1] + '&high_quality=1';
    return u.replace(/^http:/, 'https:');
  }

  /* --------------------------------------------------------- edit mode */
  function addRemoveBtn(fig) {
    if (fig.querySelector('.ph__rm')) return;
    var b = document.createElement('button');
    b.className = 'ph__rm';
    b.type = 'button';
    b.title = 'Remove photo';
    b.setAttribute('aria-label', 'Remove photo');
    b.textContent = '×';
    b.addEventListener('click', function (e) {
      e.stopPropagation();
      var key = fig.getAttribute('data-img-key');
      delete remote.media[key];
      fig.classList.remove('has-img');
      var i = fig.querySelector('img');
      if (i) i.removeAttribute('src');
      b.remove();
      cloud.database.from('site_media').delete().eq('item_key', key).then(function (res) {
        if (res.error) toast('Could not remove it from the cloud', true);
      });
    });
    fig.appendChild(b);
  }

  function setEditing(on) {
    editing = on;
    document.body.classList.toggle('is-editing', on);
    try { sessionStorage.setItem(MODE_KEY, on ? '1' : '0'); } catch (e) {}

    document.querySelectorAll('[data-key]').forEach(function (el) {
      if (on) { el.setAttribute('contenteditable', 'true'); el.setAttribute('spellcheck', 'false'); }
      else el.removeAttribute('contenteditable');
    });

    document.querySelectorAll('.ph__rm').forEach(function (b) { b.remove(); });
    if (on) document.querySelectorAll('.ph[data-img-key].has-img').forEach(addRemoveBtn);

    var fab = document.querySelector('.edit-fab');
    if (fab) {
      fab.innerHTML = on ? '✕' : '✎';
      fab.title = on ? 'Exit edit mode' : 'Edit this page';
    }
    var bar = document.querySelector('.editbar');
    if (bar) {
      bar.querySelector('.editbar__who').textContent = on ? 'Signed in' : '';
    }
  }

  /* ----------------------------------------------------------- sign in */
  var pendingOtp = null;

  function buildAuthModal() {
    var wrap = document.createElement('div');
    wrap.className = 'auth';
    wrap.innerHTML =
      '<div class="auth__card" role="dialog" aria-modal="true" aria-label="Editor sign-in">' +
        '<button class="auth__close" type="button" aria-label="Close">&times;</button>' +
        '<p class="auth__kicker">Editor sign-in</p>' +
        '<h3 class="auth__title">Log in to edit this site</h3>' +
        '<p class="auth__note">Only a signed-in editor can change content. Visitors never need to log in.</p>' +
        '<label class="auth__label">Email</label>' +
        '<input class="auth__input" type="email" id="authEmail" autocomplete="email" placeholder="you@example.com">' +
        '<button class="auth__btn auth__send" type="button">Send code</button>' +
        '<label class="auth__label">Code from email</label>' +
        '<input class="auth__input" type="text" id="authCode" autocomplete="one-time-code" placeholder="6-digit code">' +
        '<label class="auth__label">Password <span class="auth__hint">(first time only)</span></label>' +
        '<input class="auth__input" type="password" id="authPwd" autocomplete="new-password" placeholder="Set a password to create the account">' +
        '<button class="auth__btn auth__go" type="button">Sign in</button>' +
        '<p class="auth__err"></p>' +
      '</div>';
    document.body.appendChild(wrap);

    var err = wrap.querySelector('.auth__err');
    var emailEl = wrap.querySelector('#authEmail');
    var codeEl = wrap.querySelector('#authCode');
    var pwdEl = wrap.querySelector('#authPwd');
    var sendBtn = wrap.querySelector('.auth__send');
    var goBtn = wrap.querySelector('.auth__go');

    wrap.querySelector('.auth__close').addEventListener('click', function () { wrap.classList.remove('is-on'); });
    wrap.addEventListener('click', function (e) { if (e.target === wrap) wrap.classList.remove('is-on'); });

    sendBtn.addEventListener('click', function () {
      var email = emailEl.value.trim();
      if (!/.+@.+\..+/.test(email)) { err.textContent = 'Enter a valid email address'; return; }
      err.textContent = '';
      sendBtn.disabled = true;
      sendBtn.textContent = 'Sending…';
      cloud.auth.sendOtp({ email: email }).then(function (sent) {
        sendBtn.disabled = false;
        sendBtn.textContent = 'Resend code';
        if (sent.error) { err.textContent = sent.error.message; return; }
        pendingOtp = {
          email: email,
          verificationId: sent.data.verificationId,
          isExistingUser: sent.data.isExistingUser
        };
        err.textContent = 'Code sent — check your inbox';
      });
    });

    goBtn.addEventListener('click', function () {
      err.textContent = '';
      if (!pendingOtp || pendingOtp.email !== emailEl.value.trim()) {
        err.textContent = 'Send a code to this email first';
        return;
      }
      var code = codeEl.value.trim();
      if (!code) { err.textContent = 'Enter the code from your email'; return; }
      goBtn.disabled = true;
      cloud.auth.verifyOtp({
        email: pendingOtp.email,
        verificationId: pendingOtp.verificationId,
        isExistingUser: pendingOtp.isExistingUser,
        token: code,
        password: pendingOtp.isExistingUser ? undefined : (pwdEl.value || undefined)
      }).then(function (done) {
        goBtn.disabled = false;
        if (done.error) { err.textContent = done.error.message; return; }
        pendingOtp = null;
        session = done.data && done.data.session ? done.data.session : session;
        wrap.classList.remove('is-on');
        setEditing(true);
        toast('Signed in — you can edit now');
      });
    });

    return wrap;
  }

  /* ---------------------------------------------------------- controls */
  function buildControls(authModal) {
    var fab = document.createElement('button');
    fab.className = 'edit-fab';
    fab.type = 'button';
    fab.title = 'Edit this page';
    fab.setAttribute('aria-label', 'Toggle edit mode');
    fab.innerHTML = '✎';
    fab.addEventListener('click', function () {
      if (!cloud) { toast('Editing needs the published link — local preview cannot reach the cloud', true); return; }
      if (!session) { authModal.classList.add('is-on'); return; }
      if (editing) { saveNow(true); setEditing(false); } else { setEditing(true); }
    });
    document.body.appendChild(fab);

    var bar = document.createElement('div');
    bar.className = 'editbar';
    bar.innerHTML =
      '<span class="editbar__who"></span>' +
      '<button class="editbar__save" type="button">Save</button>' +
      '<span class="editbar__sep"></span>' +
      '<button class="editbar__backup" type="button">Backup</button>' +
      '<button class="editbar__restore" type="button">Restore</button>' +
      '<span class="editbar__sep"></span>' +
      '<button class="editbar__reset" type="button">Reset</button>' +
      '<button class="editbar__done" type="button">Done</button>';
    document.body.appendChild(bar);

    bar.querySelector('.editbar__save').addEventListener('click', function () { saveNow(false); });
    bar.querySelector('.editbar__done').addEventListener('click', function () { saveNow(true); setEditing(false); });
    bar.querySelector('.editbar__backup').addEventListener('click', exportJSON);
    bar.querySelector('.editbar__restore').addEventListener('click', importJSON);
    bar.querySelector('.editbar__reset').addEventListener('click', function () {
      if (!confirm('Delete the saved content of this page and fall back to the original template?')) return;
      cloud.database.from('site_text').delete().eq('page', PAGE)
        .then(function () { return cloud.database.from('site_media').delete().eq('page', PAGE); })
        .then(function () { location.reload(); });
    });
  }

  /* --------------------------------------------------- backup / restore */
  function exportJSON() {
    var text = {};
    document.querySelectorAll('[data-key]').forEach(function (el) {
      text[el.getAttribute('data-key')] = el.innerHTML;
    });
    var media = {};
    document.querySelectorAll('[data-img-key], [data-video-key]').forEach(function (el) {
      var k = el.getAttribute('data-img-key') || el.getAttribute('data-video-key');
      if (remote.media[k]) media[k] = remote.media[k];
    });
    var blob = new Blob([JSON.stringify({ page: PAGE, text: text, media: media })], { type: 'application/json' });
    var d = new Date();
    var stamp = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'ricky-jin-' + PAGE + '-' + stamp + '.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
    toast('Backup downloaded');
  }

  function importJSON() {
    if (!editing) { toast('Turn on edit mode first', true); return; }
    pickFile('application/json,.json').then(function (file) {
      if (!file) return;
      var fr = new FileReader();
      fr.onload = function () {
        var p;
        try { p = JSON.parse(fr.result); } catch (e) { toast('Not a valid backup', true); return; }
        var rows = [];
        Object.keys(p.text || {}).forEach(function (k) {
          rows.push({ item_key: k, page: pageOf(k), html: p.text[k] });
        });
        var media = [];
        Object.keys(p.media || {}).forEach(function (k) {
          media.push({ item_key: k, page: pageOf(k), kind: /^https?:|^data:video/.test(p.media[k]) ? 'video' : 'image', data: p.media[k] });
        });
        Promise.resolve()
          .then(function () { return rows.length ? upsertText(rows) : null; })
          .then(function () { return media.length ? upsertMedia(media) : null; })
          .then(function () { location.reload(); })
          .catch(function (e) { toast('Restore failed: ' + (e && e.message || ''), true); });
      };
      fr.readAsText(file);
    });
  }

  /* -------------------------------------------------------------- click */
  document.addEventListener('click', function (e) {
    if (!editing) return;

    var fig = e.target.closest('.ph[data-img-key]');
    if (fig) {
      pickFile('image/*').then(function (file) {
        if (!file) return;
        if (!/^image\//.test(file.type)) { toast('That file is not an image', true); return; }
        toast('Compressing…');
        compress(file).then(function (dataUrl) {
          var key = fig.getAttribute('data-img-key');
          remote.media[key] = dataUrl;
          applyImage(fig);
          addRemoveBtn(fig);
          return upsertMedia({ item_key: key, page: pageOf(key), kind: 'image', data: dataUrl });
        }).then(function (res) {
          if (res && res.error) toast('Upload failed: ' + res.error.message, true);
          else toast('Photo uploaded');
        }).catch(function () { toast('Could not read that image', true); });
      });
      return;
    }

    var box = e.target.closest('.video[data-video-key]');
    if (box) {
      var url = prompt('Paste a YouTube or Bilibili link (or an embed URL).', '');
      if (url === null) return;
      var key = box.getAttribute('data-video-key');
      if (!url.trim()) return;
      var src = toEmbed(url);
      remote.media[key] = src;
      applyVideo(box);
      upsertMedia({ item_key: key, page: pageOf(key), kind: 'video', data: src })
        .then(function (res) { toast(res && res.error ? 'Failed: ' + res.error.message : 'Video linked'); });
    }
  });

  // while editing: save before leaving the page via any real link
  document.addEventListener('click', function (e) {
    if (!editing) return;
    if (e.target.closest('.ph[data-img-key], .video[data-video-key]')) return;
    var a = e.target.closest('a[href]');
    if (!a) return;
    var href = a.getAttribute('href');
    if (!href || href.charAt(0) === '#') return;
    e.preventDefault();
    saveNow(true).then(function () { location.href = href; });
  }, true);

  document.addEventListener('input', function (e) {
    if (e.target && e.target.hasAttribute && e.target.hasAttribute('data-key')) queueSave();
  });
  document.addEventListener('paste', function (e) {
    var t = e.target;
    if (!editing || !t || !t.hasAttribute || !t.hasAttribute('data-key')) return;
    e.preventDefault();
    var txt = (e.clipboardData || window.clipboardData).getData('text/plain');
    document.execCommand('insertText', false, txt);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 's' && (e.metaKey || e.ctrlKey) && editing) { e.preventDefault(); saveNow(false); }
  });

  /* --------------------------------------------------------------- boot */
  function boot() {
    var authModal = cloud ? buildAuthModal() : null;
    buildControls(authModal);

    if (!cloud) {
      toast('Running offline — showing the bundled snapshot', true);
      return;
    }

    loadBaked();
    applyAll();

    loadRemote().then(function () {
      loaded = true;
      applyAll();
    }).catch(function (err) {
      toast('Cloud content unavailable — showing the bundled snapshot', true);
    }).then(function () {
      return cloud.auth.getSession();
    }).then(function (res) {
      if (res && res.data) session = res.data;
      var wantEdit = /[?&]edit=1/.test(location.search);
      var remember = false;
      try { remember = sessionStorage.getItem(MODE_KEY) === '1'; } catch (e) {}
      if (session && (wantEdit || remember)) setEditing(true);
      else if (wantEdit && authModal) authModal.classList.add('is-on');
    }).catch(function () { /* not signed in — normal for visitors */ });
  }

  boot();
})();
