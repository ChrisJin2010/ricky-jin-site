/* ------------------------------------------------------------------ *
 * Content overlay — reads content.json and applies user edits.
 * The JSON is written by editor.html via the GitHub API, so every
 * visitor sees the latest committed content on next load.
 * ------------------------------------------------------------------ */
(function () {
  fetch('content.json', { cache: 'no-store' })
    .then(function (r) { return r.ok ? r.json() : null })
    .then(function (data) {
      if (!data) return;
      var text = data.text || {};
      var img = data.img || {};

      document.querySelectorAll('[data-key]').forEach(function (el) {
        var k = el.getAttribute('data-key');
        if (Object.prototype.hasOwnProperty.call(text, k)) {
          el.textContent = text[k];
        }
      });

      document.querySelectorAll('[data-img-key]').forEach(function (el) {
        var k = el.getAttribute('data-img-key');
        if (Object.prototype.hasOwnProperty.call(img, k) && img[k]) {
          var image = el.querySelector('img');
          if (image) {
            image.src = img[k];
            el.classList.add('has-img');
          }
        }
      });
    })
    .catch(function () { /* offline or missing file: show bundled placeholders */ });
})();
