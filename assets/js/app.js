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
  document.querySelectorAll('.carousel').forEach(function (car) {
    var track = car.querySelector('.carousel__track');
    if (!track) return;
    var slides = Array.prototype.slice.call(track.querySelectorAll('.carousel__slide'));
    if (slides.length < 2) return;

    var cloneCount = Math.min(slides.length, 4); // clone first few for seamless loop
    for (var ci = 0; ci < cloneCount; ci++) {
      var cl = slides[ci].cloneNode(true);
      cl.classList.add('carousel__clone');
      // remove data-img-key so edit.js/overlay.js ignore clones (overlay already ran)
      cl.querySelectorAll('[data-img-key]').forEach(function (el) { el.removeAttribute('data-img-key'); });
      cl.querySelectorAll('[data-lightbox]').forEach(function (el) { el.removeAttribute('data-lightbox'); });
      cl.querySelectorAll('[data-cap]').forEach(function (el) { el.removeAttribute('data-cap'); });
      track.appendChild(cl);
    }

    var idx = 0;
    var stepMs = 3800;
    var paused = false;
    var ed = /[?&]edit=1/.test(location.search);

    var snapTimer = null;
    function doStep() {
      if (ed || paused || document.body.classList.contains('is-editing') || document.body.classList.contains('rjs-editing')) return;
      idx++;
      var el = track.children[idx];
      if (!el) { idx = 1; el = track.children[idx]; }
      var target = el.offsetLeft;
      track.style.transition = 'transform .75s cubic-bezier(.22,.61,.36,1)';
      track.style.transform = 'translateX(' + (-target) + 'px)';
      if (idx >= slides.length) {
        snapTimer = setTimeout(function () {
          if (paused) return; // don't snap back while user is hovering
          track.style.transition = 'none';
          idx = 0;
          track.style.transform = 'translateX(0)';
          snapTimer = null;
        }, 800);
      }
    }

    setTimeout(doStep, 1200);
    setInterval(doStep, stepMs);

    car.addEventListener('mouseenter', function () {
      paused = true;
      if (snapTimer) { clearTimeout(snapTimer); snapTimer = null; }
    });
    car.addEventListener('mouseleave', function () { paused = false; });
  });

  /* ------------------------------------------------------- footer year */
  var y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();
})();
