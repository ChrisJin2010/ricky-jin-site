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

    // clone all slides and append for seamless wrap-around
    slides.forEach(function (s) {
      var cl = s.cloneNode(true);
      cl.classList.add('carousel__clone');
      cl.querySelectorAll('[data-img-key]').forEach(function (el) { el.removeAttribute('data-img-key'); });
      cl.querySelectorAll('[data-lightbox]').forEach(function (el) { el.removeAttribute('data-lightbox'); });
      cl.querySelectorAll('[data-cap]').forEach(function (el) { el.removeAttribute('data-cap'); });
      track.appendChild(cl);
    });

    if (isEditMode) return;

    // -- RAF animation: slide at constant speed, wrap around instantly at end --
    var speed = 110;         // pixels per second (higher = faster)
    var pos = 0;             // current translateX value (negative = scrolled left)
    var end = 0;             // width of the ORIGINAL (non-cloned) content = wrap point
    var last = performance.now();
    var paused = false;

    function measure() {
      // sum widths of original slides (slides.length of them, plus gaps between)
      var w = 0;
      for (var i = 0; i < slides.length; i++) w += slides[i].offsetWidth;
      var gap = parseInt(getComputedStyle(track).columnGap || getComputedStyle(track).gap || '22', 10);
      end = w + gap * (slides.length - 1);
      pos = pos % end; // keep pos bounded
    }

    function tick(now) {
      var dt = (now - last) / 1000;
      last = now;
      if (!paused && !isEditMode && !document.body.classList.contains('is-editing') && !document.body.classList.contains('rjs-editing')) {
        pos -= speed * dt;
        if (pos <= -end) pos += end; // instant wrap — clone area matches original area
        track.style.transform = 'translate3d(' + pos + 'px,0,0)';
      }
      requestAnimationFrame(tick);
    }

    measure();
    // re-measure on resize / font load / image load (widths may change)
    window.addEventListener('resize', measure);
    requestAnimationFrame(tick);

    car.addEventListener('mouseenter', function () { paused = true; });
    car.addEventListener('mouseleave', function () { paused = false; });
  });

  /* ------------------------------------------------------- footer year */
  var y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();
})();
