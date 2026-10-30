/* Motion engine · Nail's Lab №1 demo. Vanilla, no deps. CSS default = final state. */
(function () {
  var d = document, h = d.documentElement, W = window;
  var motion = h.classList.contains('m-on');
  var fine = W.matchMedia('(hover:hover) and (pointer:fine)').matches;
  var q = function (s, r) { return Array.prototype.slice.call((r || d).querySelectorAll(s)); };
  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };

  /* strip + header height -> --top-h */
  var top = d.querySelector('.top');
  function setTop() { if (top) h.style.setProperty('--top-h', top.offsetHeight + 'px'); }
  setTop();
  if (top && W.ResizeObserver) new ResizeObserver(setTop).observe(top);
  if (d.fonts && d.fonts.ready) d.fonts.ready.then(setTop);

  /* mobile menu (native details; JS adds close on pick / Esc / outside) */
  var mm = d.querySelector('details.mm');
  if (mm) {
    var sum = mm.querySelector('summary');
    var sync = function () { sum.setAttribute('aria-expanded', mm.open ? 'true' : 'false'); };
    sync();
    mm.addEventListener('toggle', sync);
    mm.addEventListener('click', function (e) { if (e.target.closest('a')) { mm.open = false; } });
    d.addEventListener('keydown', function (e) { if (e.key === 'Escape' && mm.open) { mm.open = false; sum.focus(); } });
    d.addEventListener('click', function (e) { if (mm.open && !mm.contains(e.target)) mm.open = false; });
  }

  /* map: click-to-load embed */
  q('[data-map-load]').forEach(function (b) {
    b.addEventListener('click', function () {
      var box = b.closest('.map'), f = d.createElement('iframe');
      f.src = box.getAttribute('data-src');
      f.title = box.getAttribute('data-title') || 'Карта';
      f.setAttribute('allowfullscreen', '');
      f.setAttribute('loading', 'lazy');
      box.classList.add('map--on');
      box.replaceChildren(f);
    });
  });

  /* stagger index for fade-up groups */
  q('[data-rv~="up"]').forEach(function (g) {
    Array.prototype.forEach.call(g.children, function (c, i) { c.style.setProperty('--i', i); });
  });
  q('[data-rv~="pin"]').forEach(function (g) { q('li', g).forEach(function (c, i) { c.style.setProperty('--i', i); }); });

  if (!motion) return;
  h.classList.add('m-ready');

  /* marks: captions assemble from noise (aria-hidden twin) */
  var NOISE = '+×/#=·:%';
  q('[data-rv~="marks"]').forEach(function (el) {
    var t = el.textContent, tw = d.createElement('span'), sr = d.createElement('span');
    sr.className = 'sr'; sr.textContent = t;
    tw.setAttribute('aria-hidden', 'true'); tw.className = 'mk-tw';
    tw.textContent = t.replace(/\S/g, function () { return NOISE[(Math.random() * NOISE.length) | 0]; });
    el.textContent = ''; el.append(sr, tw); el._tw = tw; el._t = t;
  });
  function assemble(el) {
    var t = el._t, tw = el._tw, t0 = performance.now(), dur = 700;
    (function step(now) {
      var k = clamp((now - t0) / dur, 0, 1), n = Math.floor(k * t.length), s = t.slice(0, n);
      for (var i = n; i < t.length; i++) s += /\s/.test(t[i]) ? t[i] : NOISE[(Math.random() * NOISE.length) | 0];
      tw.textContent = s;
      if (k < 1) requestAnimationFrame(step); else tw.textContent = t;
    })(t0);
  }

  /* reveal */
  function show(el) {
    if (el.classList.contains('in')) return;
    el.classList.add('in');
    if (el._tw) assemble(el);
    if (/\bcur\b/.test(el.getAttribute('data-rv'))) {
      var cv = q('.cv', el);
      cv.forEach(function (c) {
        var fin = function () { c.classList.add('done'); };
        c.addEventListener('transitionend', function (e) { if (e.target === c) fin(); });
        setTimeout(fin, 1700);
      });
    }
  }
  var rv = q('[data-rv]').filter(function (el) { return !el.hasAttribute('data-hero'); });
  function sweep() {
    var vh = W.innerHeight;
    rv.forEach(function (el) { if (!el.classList.contains('in') && el.getBoundingClientRect().top < vh) show(el); });
  }
  if ('IntersectionObserver' in W) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { show(e.target); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0 });
    rv.forEach(function (el) { io.observe(el); });
  }
  W.addEventListener('load', sweep);
  W.addEventListener('hashchange', sweep);
  W.addEventListener('beforeprint', function () { q('[data-rv]').forEach(show); });

  /* hero intro chain: words 0.3s, photo 0.5s, caption 0.8s after DOMContentLoaded */
  var heroT = { 1: 300, 2: 500, 3: 800 };
  function hero() {
    q('[data-hero]').forEach(function (el) { setTimeout(function () { show(el); }, heroT[el.getAttribute('data-hero')] || 300); });
  }
  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', hero); else hero();

  /* scroll-linked: light-up line, lanes, final panel */
  var lits = q('[data-lit]').map(function (el) { return { el: el, w: q('.lw', el) }; });
  var fin = d.querySelector('[data-final]');
  var mqLane = W.matchMedia('(min-width:900px)');
  var lanes = q('[data-lane]').map(function (s) {
    return { s: s, view: s.querySelector('.lane-view'), track: s.querySelector('.lane-track'), bar: s.querySelector('.lane-bar i'), travel: 0 };
  });
  function layoutLanes() {
    lanes.forEach(function (L) {
      var on = mqLane.matches && L.track;
      L.s.classList.toggle('lane-on', !!on);
      if (!on) { L.s.style.removeProperty('--travel'); if (L.track) L.track.style.transform = ''; return; }
      L.travel = Math.max(0, L.track.scrollWidth - L.view.clientWidth);
      L.s.style.setProperty('--travel', L.travel + 'px');
    });
  }
  var ticking = false;
  function frame() {
    ticking = false;
    var vh = W.innerHeight, th = top ? top.offsetHeight : 0;
    lits.forEach(function (o) {
      var r = o.el.getBoundingClientRect(), p = clamp((vh * 0.88 - r.top) / (vh * 0.5), 0, 1), n = o.w.length;
      o.w.forEach(function (w, i) { w.style.opacity = (0.25 + 0.75 * clamp(p * n - i, 0, 1)).toFixed(3); });
    });
    lanes.forEach(function (L) {
      if (!L.s.classList.contains('lane-on')) return;
      var r = L.s.getBoundingClientRect(), p = L.travel ? clamp((th - r.top) / L.travel, 0, 1) : 0;
      L.track.style.transform = 'translate3d(' + (-p * L.travel).toFixed(1) + 'px,0,0)';
      if (L.bar) L.bar.style.transform = 'scaleX(' + p.toFixed(4) + ')';
    });
    if (fin) {
      var fr = fin.getBoundingClientRect(), k = clamp((fr.top - vh * 0.4) / (vh * 0.6), 0, 1);
      fin.style.setProperty('--fx', (48 * k).toFixed(1) + 'px');
    }
  }
  function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(function () { frame(); sweep(); }); } }
  W.addEventListener('scroll', onScroll, { passive: true });
  W.addEventListener('resize', function () { layoutLanes(); onScroll(); });
  if (mqLane.addEventListener) mqLane.addEventListener('change', function () { layoutLanes(); onScroll(); });
  layoutLanes(); frame(); sweep();
  W.addEventListener('load', function () { layoutLanes(); frame(); });
  q('.lane-track img').forEach(function (im) { if (!im.complete) im.addEventListener('load', function () { layoutLanes(); onScroll(); }); });

  /* fine pointer: light spot + tilt (rAF only while the cursor moves) */
  if (fine) {
    var spot = d.querySelector('.spot'), tilt = q('[data-tilt]'), mx = 0, my = 0, pend = false;
    W.addEventListener('mousemove', function (e) {
      mx = e.clientX; my = e.clientY;
      if (pend) return; pend = true;
      requestAnimationFrame(function () {
        pend = false;
        if (spot) spot.style.transform = 'translate3d(' + (mx - 300) + 'px,' + (my - 300) + 'px,0)';
        tilt.forEach(function (t) {
          var r = t.getBoundingClientRect();
          if (r.bottom < 0 || r.top > W.innerHeight) return;
          var x = clamp((mx - (r.left + r.width / 2)) / W.innerWidth, -0.5, 0.5), y = clamp((my - (r.top + r.height / 2)) / W.innerHeight, -0.5, 0.5);
          t.style.transform = 'perspective(900px) rotateY(' + (x * 10).toFixed(2) + 'deg) rotateX(' + (-y * 8).toFixed(2) + 'deg)';
        });
      });
    }, { passive: true });
  }
})();
