/* ======================================================================
   Ricky Jin — site behaviour (navigation, reveal, lightbox, parallax)
   ====================================================================== */
(function () {
  'use strict';

  var nav = document.querySelector('.nav');
  var hasDarkHero = !!document.querySelector('.hero, .phead');

  /* ---------------------------------------------------- nav solid state */
  function onScroll() {
    if (!nav) return;
    nav.classList.toggle('is-solid', window.scrollY > 60);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ----------------------------------------------------- mobile menu */
  var burger = document.querySelector('.nav__burger');
  var links = document.querySelector('.nav__links');
  if (burger && links) {
    burger.addEventListener('click', function () {
      var open = links.classList.toggle('is-open');
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    links.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') links.classList.remove('is-open');
    });
  }

  /* ------------------------------------------------- scroll reveal */
  var items = Array.prototype.slice.call(document.querySelectorAll('.reveal'));
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add('is-in');
          io.unobserve(en.target);
        }
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });
    items.forEach(function (el, i) {
      el.style.transitionDelay = (Math.min(i % 6, 5) * 70) + 'ms';
      io.observe(el);
    });
  } else {
    items.forEach(function (el) { el.classList.add('is-in'); });
  }

  /* --------------------------------------------- subtle hero parallax */
  var media = document.querySelector('.hero__media img');
  var hero = document.querySelector('.hero');
  if (media && hero && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    var ticking = false;
    window.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        var y = Math.min(window.scrollY, hero.offsetHeight);
        media.style.transform = 'translate3d(0,' + (y * 0.14) + 'px,0) scale(' + (1 + y * 0.00006) + ')';
        ticking = false;
      });
    }, { passive: true });
  }

  /* ------------------------------------------------------ lightbox */
  var lb = document.createElement('div');
  lb.className = 'lb';
  lb.setAttribute('role', 'dialog');
  lb.setAttribute('aria-modal', 'true');
  lb.innerHTML =
    '<button class="lb__close" aria-label="Close">&times;</button>' +
    '<img alt="">' +
    '<div class="lb__cap"></div>';
  document.body.appendChild(lb);
  var lbImg = lb.querySelector('img');
  var lbCap = lb.querySelector('.lb__cap');

  function closeLb() {
    lb.classList.remove('is-open');
    document.body.style.overflow = '';
  }
  lb.querySelector('.lb__close').addEventListener('click', closeLb);
  lb.addEventListener('click', function (e) { if (e.target === lb) closeLb(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeLb(); });

  document.addEventListener('click', function (e) {
    if (document.body.classList.contains('is-editing')) return;
    var tile = e.target.closest('.tile[data-lightbox]');
    if (!tile) return;
    var img = tile.querySelector('img');
    if (!img || !img.getAttribute('src')) return;
    lbImg.src = img.src;
    lbImg.alt = img.alt || '';
    lbCap.textContent = (tile.getAttribute('data-cap') || '');
    lb.classList.add('is-open');
    document.body.style.overflow = 'hidden';
  });

  /* ------------------------------------------------------- carousel */
  var isEditMode = /[?&]edit=1/.test(location.search) || document.body.classList.contains('is-editing') || document.body.classList.contains('rjs-editing');
  document.querySelectorAll('.carousel').forEach(function (car) {
    var track = car.querySelector('.carousel__track');
    if (!track) return;
    var slides = Array.prototype.slice.call(track.querySelectorAll(':scope > .carousel__slide'));
    if (slides.length < 2) return;

    var inited = false;
    function init() {
      if (inited) return;
      inited = true;
      if (isEditMode) return; // edit mode: no clones, CSS makes strip scrollable

      // IMPORTANT: clone only AFTER overlay.js filled the real photos
      // so the copies carry the images too (otherwise the loop half is empty).
      slides.forEach(function (s) {
        var cl = s.cloneNode(true);
        cl.classList.add('carousel__clone');
        cl.classList.remove('reveal'); // clones never enter viewport check; keep them visible
        cl.querySelectorAll('[data-img-key]').forEach(function (el) { el.removeAttribute('data-img-key'); });
        cl.querySelectorAll('[data-lightbox]').forEach(function (el) { el.removeAttribute('data-lightbox'); });
        cl.querySelectorAll('[data-cap]').forEach(function (el) { el.removeAttribute('data-cap'); });
        track.appendChild(cl);
      });

      // -- RAF animation: constant speed, pixel-exact seamless wrap --
      var speed = 110;       // px per second (higher = faster)
      var pos = 0;           // current translateX (negative = scrolled left)
      var end = 0;           // wrap distance = first clone's offset (full set + one gap)
      var last = performance.now();
      var paused = false;

      function measure() {
        var first = track.children[0];
        var firstClone = track.children[slides.length];
        end = (first && firstClone) ? (firstClone.offsetLeft - first.offsetLeft) : 0;
        if (end > 0) pos = -((-pos) % end);
      }

      function tick(now) {
        var dt = (now - last) / 1000;
        last = now;
        if (!paused && !document.body.classList.contains('is-editing') && !document.body.classList.contains('rjs-editing')) {
          if (end <= 0) measure();
          if (end > 0) {
            pos -= speed * dt;
            if (pos <= -end) pos += end; // instant wrap: clone area mirrors original area
            track.style.transform = 'translate3d(' + pos + 'px,0,0)';
          }
        }
        requestAnimationFrame(tick);
      }

      measure();
      window.addEventListener('resize', measure);
      requestAnimationFrame(tick);

      car.addEventListener('mouseenter', function () { paused = true; });
      car.addEventListener('mouseleave', function () { paused = false; });
    }

    // run after overlay.js finished loading content.json (it sets the flag
    // and dispatches 'rjs:overlay'); fallback in case it never signals.
    if (window.__rjsOverlayDone) init();
    else document.addEventListener('rjs:overlay', init);
    window.addEventListener('load', function () { setTimeout(init, 2500); });
  });

  /* ------------------------------------------------------- slider (Xishan etc.) */
  document.querySelectorAll('.slider').forEach(function (sl) {
    var track = sl.querySelector('.slider__track');
    if (!track) return;
    var slides = track.children.length;
    if (slides < 2) return;
    if (isEditMode) return; // edit mode: CSS stacks slides, all slots uploadable

    var prev = sl.querySelector('.slider__prev');
    var next = sl.querySelector('.slider__next');
    var dots = Array.prototype.slice.call(sl.querySelectorAll('.slider__dot'));
    var idx = 0;

    function render() {
      track.style.transform = 'translateX(' + (idx * -100) + '%)';
      if (prev) prev.disabled = (idx === 0);           // not circular —
      if (next) next.disabled = (idx === slides - 1);  // arrows stop at the ends
      dots.forEach(function (d, i) { d.classList.toggle('is-on', i === idx); });
    }

    if (prev) prev.addEventListener('click', function () { if (idx > 0) { idx--; render(); } });
    if (next) next.addEventListener('click', function () { if (idx < slides - 1) { idx++; render(); } });
    dots.forEach(function (d, i) { d.addEventListener('click', function () { idx = i; render(); }); });

    // touch swipe
    var sx = null;
    sl.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; }, { passive: true });
    sl.addEventListener('touchend', function (e) {
      if (sx === null) return;
      var dx = e.changedTouches[0].clientX - sx;
      if (dx > 40 && idx > 0) { idx--; render(); }
      else if (dx < -40 && idx < slides - 1) { idx++; render(); }
      sx = null;
    });

    render();
  });

  /* ------------------------------------------------------- footer year */
  var y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();
})();
