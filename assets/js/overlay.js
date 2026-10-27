/* 运行时内容覆盖：读取 content.json，覆盖 [data-key] 文字与 [data-img-key] 图位。
   完成后设置 window.__rjsOverlayDone 并派发 'rjs:overlay' 事件（edit.js 依赖）。 */
(function () {
  'use strict';

  function done() {
    window.__rjsOverlayDone = true;
    try { document.dispatchEvent(new CustomEvent('rjs:overlay')); } catch (e) {}
  }

  /* 若某张 figure 的子文字槽被 content.json 覆盖过，则同步重建灯箱图注 data-cap */
  function rebuildCaps(text) {
    document.querySelectorAll('figure[data-cap]').forEach(function (fig) {
      var touched = false;
      fig.querySelectorAll('[data-key]').forEach(function (el) {
        if (Object.prototype.hasOwnProperty.call(text, el.getAttribute('data-key'))) touched = true;
      });
      if (!touched) return;
      var tc = fig.querySelector('.tile__cap');
      if (tc) {
        var b = tc.querySelector('b'), em = tc.querySelector('em'), t = tc.querySelector('time');
        var parts = [];
        if (b && b.textContent.trim()) parts.push(b.textContent.trim());
        if (em && em.textContent.trim()) parts.push(em.textContent.trim().replace(/^as\s+/i, ''));
        if (t && t.textContent.trim()) parts.push(t.textContent.trim());
        if (parts.length) fig.setAttribute('data-cap', parts.join(' · '));
      } else {
        var fc = fig.querySelector('figcaption');
        if (fc && fc.textContent.trim()) fig.setAttribute('data-cap', fc.textContent.trim());
      }
    });
  }

  fetch('content.json', { cache: 'no-store' })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (data) {
      if (!data) return;
      var text = data.text || {};
      var img = data.img || {};
      var pos = data.pos || {};
      document.querySelectorAll('[data-key]').forEach(function (el) {
        var k = el.getAttribute('data-key');
        if (Object.prototype.hasOwnProperty.call(text, k)) {
          el.textContent = text[k];
        }
      });
      document.querySelectorAll('[data-img-key]').forEach(function (el) {
        var k = el.getAttribute('data-img-key');
        var image = el.querySelector('img');
        if (Object.prototype.hasOwnProperty.call(img, k) && img[k] && image) {
          image.src = img[k];
          el.classList.add('has-img');
        }
        if (image && pos[k]) {
          var p = pos[k];
          image.style.objectPosition = p.x + '% ' + p.y + '%';
          image.style.transformOrigin = p.x + '% ' + p.y + '%';
          if (p.z && p.z !== 1) image.style.transform = 'scale(' + p.z + ')';
        }
      });
      rebuildCaps(text);
    })
    .catch(function () { /* offline or missing file: show bundled placeholders */ })
    .then(done, done);
})();
