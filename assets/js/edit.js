/* 内联编辑模式：在页面网址后加 ?edit=1 进入。
   点文字直接改，点图位换照片；保存把改动写进本地 ricky-jin-site 文件夹（File System Access API），
   之后用 GitHub Desktop 推送上线。无需令牌。 */
(function () {
  'use strict';
  if (!/[?&]edit=1/.test(location.search)) return;

  var edits = {};      // text key -> new value
  var baseline = {};   // text key -> activation-time value
  var imgQueue = {};   // img key -> File
  var imgRemoved = {}; // img key -> true
  var dirHandle = null;
  var dirty = false;

  function qs(s, r) { return (r || document).querySelector(s); }
  function qsa(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function norm(s) { return String(s || '').replace(/\s+/g, ' ').trim(); }
  function slug(k) { return k.toLowerCase().replace(/[^a-z0-9]+/g, '-'); }

  /* ---------- styles & toolbar ---------- */
  var st = document.createElement('style');
  st.textContent =
    '[data-key].rjs-t{outline:1.5px dashed rgba(180,129,63,.6);outline-offset:2px;cursor:text;border-radius:2px;min-width:1em}' +
    '[data-key].rjs-t:hover{outline-color:#B4813F;background:rgba(180,129,63,.08)}' +
    '[data-key].rjs-t:focus{outline:2px solid #B4813F;background:rgba(180,129,63,.1)}' +
    '[data-key].rjs-dirty{outline:2px solid #B4813F;outline-style:solid}' +
    '[data-img-key].rjs-i{cursor:pointer;position:relative}' +
    '[data-img-key].rjs-i:hover{outline:2px dashed #B4813F;outline-offset:-2px}' +
    '.rjs-iops{position:absolute;top:8px;right:8px;z-index:6;display:flex;gap:6px;opacity:0;transition:opacity .15s}' +
    '[data-img-key].rjs-i:hover .rjs-iops{opacity:1}' +
    '.rjs-iops button{border:none;background:#141414;color:#fff;font:12px/1 "PingFang SC","Microsoft YaHei",sans-serif;padding:7px 12px;border-radius:999px;cursor:pointer}' +
    '#rjsEditBar{position:fixed;left:0;right:0;bottom:0;z-index:99999;display:flex;align-items:center;gap:14px;' +
    'background:#141414;color:#F4F2ED;padding:10px 18px;font:13px/1.5 "PingFang SC","Microsoft YaHei",sans-serif;box-shadow:0 -2px 16px rgba(0,0,0,.25)}' +
    '#rjsEditBar .rjs-eb-dot{width:8px;height:8px;border-radius:50%;background:#B4813F;flex:none}' +
    '#rjsEditBar button{background:#B4813F;color:#fff;border:none;padding:8px 18px;border-radius:999px;font-size:13px;cursor:pointer;font-family:inherit}' +
    '#rjsEditBar button[disabled]{opacity:.4;cursor:not-allowed}' +
    '#rjsFolder{background:transparent;border:1px solid #6B6257}' +
    '#rjsExit{color:#F4F2ED;opacity:.7;font-size:13px;text-decoration:none;white-space:nowrap}' +
    '#rjsExit:hover{opacity:1}' +
    'body.rjs-editing{padding-bottom:56px}';
  document.head.appendChild(st);
  document.body.classList.add('rjs-editing');

  var bar = document.createElement('div');
  bar.id = 'rjsEditBar';
  bar.innerHTML =
    '<span class="rjs-eb-dot"></span>' +
    '<span id="rjsEditStat">编辑模式：点文字直接改，点图位换照片</span>' +
    '<span style="flex:1"></span>' +
    '<button id="rjsFolder" type="button" hidden>选择网站文件夹</button>' +
    '<button id="rjsSave" type="button" disabled>保存改动</button>' +
    '<a id="rjsExit" href="' + location.pathname + '">✕ 退出编辑</a>';
  document.body.appendChild(bar);

  function setStat(t) { qs('#rjsEditStat').textContent = t; }

  /* ---------- IndexedDB（记住文件夹授权，按站点域名存） ---------- */
  function idbOpen() {
    return new Promise(function (res, rej) {
      var rq = indexedDB.open('rjs-editor', 1);
      rq.onupgradeneeded = function () { rq.result.createObjectStore('kv'); };
      rq.onsuccess = function () { res(rq.result); };
      rq.onerror = function () { rej(rq.error); };
    });
  }
  function idbGet() {
    return idbOpen().then(function (db) {
      return new Promise(function (res, rej) {
        var g = db.transaction('kv', 'readonly').objectStore('kv').get('dir');
        g.onsuccess = function () { res(g.result || null); };
        g.onerror = function () { rej(g.error); };
      });
    });
  }
  function idbSet(h) {
    return idbOpen().then(function (db) {
      return new Promise(function (res) {
        var tx = db.transaction('kv', 'readwrite');
        tx.objectStore('kv').put(h, 'dir');
        tx.oncomplete = function () { res(); };
        tx.onerror = function () { res(); };
      });
    });
  }

  /* ---------- 本地文件读写 ---------- */
  function resolveDir(segs, create) {
    var p = Promise.resolve(dirHandle);
    segs.forEach(function (s) {
      p = p.then(function (d) { return d.getDirectoryHandle(s, create ? { create: true } : undefined); });
    });
    return p;
  }
  function writeFile(path, blob) {
    var segs = path.split('/');
    return resolveDir(segs.slice(0, -1), true).then(function (d) {
      return d.getFileHandle(segs[segs.length - 1], { create: true });
    }).then(function (fh) {
      return fh.createWritable().then(function (w) {
        return w.write(blob).then(function () { return w.close(); });
      });
    });
  }
  function readContentJson() {
    return dirHandle.getFileHandle('content.json').then(function (fh) { return fh.getFile(); })
      .then(function (f) { return f.text(); })
      .then(function (t) { var d = JSON.parse(t); if (!d.text) d.text = {}; if (!d.img) d.img = {}; return d; })
      .catch(function () { return { text: {}, img: {} }; });
  }
  function compressToBlob(file) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        try {
          var w = img.naturalWidth, h = img.naturalHeight;
          if (!w || !h) throw new Error('bad');
          var scale = Math.min(1, 1600 / Math.max(w, h));
          var cv = document.createElement('canvas');
          cv.width = Math.max(1, Math.round(w * scale));
          cv.height = Math.max(1, Math.round(h * scale));
          cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
          cv.toBlob(function (b) {
            URL.revokeObjectURL(url);
            if (!b) return reject(new Error('图片压缩失败，请换一张 JPG/PNG'));
            resolve(b);
          }, 'image/jpeg', 0.82);
        } catch (e) { URL.revokeObjectURL(url); reject(new Error('图片处理失败')); }
      };
      img.onerror = function () {
        URL.revokeObjectURL(url);
        reject(new Error('无法读取该图片（iPhone 的 HEIC 请先转成 JPG）'));
      };
      img.src = url;
    });
  }

  /* ---------- 文件夹授权 ---------- */
  function pickFolder() {
    if (!window.showDirectoryPicker) {
      setStat('当前浏览器不支持本地保存，请用 Chrome 或 Edge');
      return Promise.reject(new Error('unsupported'));
    }
    return window.showDirectoryPicker({ id: 'rjs-site', mode: 'readwrite' }).then(function (h) {
      return h.getFileHandle('content.json').then(function () {
        dirHandle = h;
        idbSet(h);
        qs('#rjsFolder').hidden = true;
        setStat('已连接文件夹：' + h.name + '。点文字直接改，点图位换照片');
      }, function () {
        setStat('这个文件夹里没有 content.json——请选择 ricky-jin-site 网站文件夹');
      });
    }).catch(function () { /* 用户取消选择 */ });
  }
  function ensureDir() {
    if (dirHandle) {
      return dirHandle.queryPermission({ mode: 'readwrite' }).then(function (p) {
        if (p === 'granted') return;
        return dirHandle.requestPermission({ mode: 'readwrite' }).then(function (p2) {
          if (p2 !== 'granted') throw new Error('没有获得文件夹写入权限');
        });
      });
    }
    return pickFolder().then(function () {
      if (!dirHandle) throw new Error('请先选择网站文件夹');
    });
  }

  /* ---------- 灯箱图注同步 ---------- */
  function syncCap(el) {
    var fig = el.closest('figure[data-cap]');
    if (!fig) return;
    var tc = fig.querySelector('.tile__cap');
    if (tc) {
      var b = tc.querySelector('b'), em = tc.querySelector('em'), t = tc.querySelector('time');
      var parts = [];
      if (b && norm(b.textContent)) parts.push(norm(b.textContent));
      if (em && norm(em.textContent)) parts.push(norm(em.textContent).replace(/^as\s+/i, ''));
      if (t && norm(t.textContent)) parts.push(norm(t.textContent));
      if (parts.length) fig.setAttribute('data-cap', parts.join(' · '));
    } else {
      var fc = fig.querySelector('figcaption');
      if (fc && norm(fc.textContent)) fig.setAttribute('data-cap', norm(fc.textContent));
    }
  }

  /* ---------- 初始化（等 overlay.js 应用完再取基线） ---------- */
  function whenOverlayReady(cb) {
    if (window.__rjsOverlayDone) return cb();
    var fired = false;
    function go() { if (!fired) { fired = true; cb(); } }
    document.addEventListener('rjs:overlay', go);
    setTimeout(go, 2500);
  }

  function init() {
    qsa('[data-key]').forEach(function (el) {
      var k = el.getAttribute('data-key');
      baseline[k] = norm(el.textContent);
      el.contentEditable = 'true';
      el.spellcheck = false;
      el.classList.add('rjs-t');
      el.addEventListener('input', function () {
        var v = norm(el.textContent);
        if (v === baseline[k]) delete edits[k]; else edits[k] = v;
        el.classList.toggle('rjs-dirty', !!edits[k]);
        syncCap(el);
        refresh();
      });
      el.addEventListener('paste', function (e) {
        e.preventDefault();
        var t = (e.clipboardData || window.clipboardData).getData('text/plain');
        document.execCommand('insertText', false, t);
      });
    });

    qsa('[data-img-key]').forEach(function (box) {
      box.classList.add('rjs-i');
      var ops = document.createElement('div');
      ops.className = 'rjs-iops';
      ops.innerHTML = '<button type="button" data-a="up">换图</button><button type="button" data-a="rm">移除</button>';
      box.appendChild(ops);
      ops.addEventListener('click', function (e) {
        e.preventDefault(); e.stopPropagation();
        var k = box.getAttribute('data-img-key');
        if (e.target.getAttribute('data-a') === 'up') pickFile(box, k);
        else if (e.target.getAttribute('data-a') === 'rm') {
          delete imgQueue[k]; imgRemoved[k] = true;
          var im = box.querySelector('img');
          if (im) im.removeAttribute('src');
          box.classList.remove('has-img');
          refresh();
        }
      });
    });

    /* 拦截点击：图位 → 换图；链接/灯箱 → 禁止跳转 */
    document.addEventListener('click', function (e) {
      if (e.target.closest('#rjsEditBar') || e.target.closest('.rjs-iops')) return;
      var imgBox = e.target.closest('[data-img-key]');
      if (imgBox) {
        e.preventDefault(); e.stopPropagation();
        pickFile(imgBox, imgBox.getAttribute('data-img-key'));
        return;
      }
      if (e.target.closest('a') || e.target.closest('[data-lightbox]')) {
        e.preventDefault(); e.stopPropagation();
      }
    }, true);

    window.addEventListener('beforeunload', function (e) {
      if (dirty) { e.preventDefault(); e.returnValue = ''; }
    });

    qs('#rjsSave').onclick = saveAll;
    qs('#rjsFolder').onclick = function () {
      if (dirHandle) {
        dirHandle.requestPermission({ mode: 'readwrite' }).then(function (p) {
          if (p === 'granted') { qs('#rjsFolder').hidden = true; setStat('已连接文件夹：' + dirHandle.name); }
        });
      } else pickFolder();
    };

    /* 恢复上次授权过的文件夹 */
    idbGet().then(function (h) {
      if (!h) { qs('#rjsFolder').hidden = false; return; }
      dirHandle = h;
      h.queryPermission({ mode: 'readwrite' }).then(function (p) {
        if (p === 'granted') setStat('已连接文件夹：' + h.name + '。点文字直接改，点图位换照片');
        else qs('#rjsFolder').hidden = false;
      });
    }).catch(function () { qs('#rjsFolder').hidden = false; });
  }

  function pickFile(box, k) {
    var inp = document.createElement('input');
    inp.type = 'file'; inp.accept = 'image/*';
    inp.onchange = function () {
      if (!inp.files || !inp.files[0]) return;
      imgQueue[k] = inp.files[0];
      delete imgRemoved[k];
      var im = box.querySelector('img');
      if (!im) { im = document.createElement('img'); box.insertBefore(im, box.firstChild); }
      im.src = URL.createObjectURL(inp.files[0]);
      box.classList.add('has-img');
      refresh();
    };
    inp.click();
  }

  function refresh() {
    dirty = Object.keys(edits).length + Object.keys(imgQueue).length + Object.keys(imgRemoved).length > 0;
    qs('#rjsSave').disabled = !dirty;
  }

  /* ---------- 保存 ---------- */
  function saveAll() {
    var btn = qs('#rjsSave');
    btn.disabled = true;
    setStat('正在准备…');
    ensureDir().then(function () {
      return readContentJson().then(function (data) {
        Object.keys(edits).forEach(function (k) { data.text[k] = edits[k]; });
        Object.keys(imgRemoved).forEach(function (k) { data.img[k] = ''; });
        var keys = Object.keys(imgQueue);
        var n = 0;
        var chain = Promise.resolve();
        keys.forEach(function (k) {
          chain = chain.then(function () {
            setStat('正在处理图片（' + (++n) + '/' + keys.length + '）…');
            return compressToBlob(imgQueue[k]).then(function (blob) {
              var p = 'assets/img/' + slug(k) + '.jpg';
              return writeFile(p, blob).then(function () { data.img[k] = p; });
            });
          });
        });
        return chain.then(function () {
          setStat('正在写入 content.json…');
          data.updated = new Date().toISOString();
          return writeFile('content.json', new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
        });
      });
    }).then(function () {
      Object.keys(edits).forEach(function (k) { baseline[k] = edits[k]; });
      qsa('.rjs-dirty').forEach(function (el) { el.classList.remove('rjs-dirty'); });
      edits = {}; imgQueue = {}; imgRemoved = {};
      dirty = false;
      refresh();
      setStat('✓ 已保存到本地文件夹！打开 GitHub Desktop → Commit to main → Push origin，1–2 分钟后线上生效');
    }).catch(function (e) {
      btn.disabled = false;
      setStat('保存失败：' + (e && e.message ? e.message : '未知错误'));
    });
  }

  whenOverlayReady(init);
})();
