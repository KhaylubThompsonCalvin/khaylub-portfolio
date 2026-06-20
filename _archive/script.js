(function () {
  "use strict";

  var LOADER_DURATION_MS = 3200;
  var loader = document.getElementById("loader");
  var mainContent = document.getElementById("main-content");
  var header = document.querySelector(".site-header");
  var navToggle = document.querySelector(".site-header__toggle");
  var nav = document.querySelector(".site-nav");

  function dismissLoader() {
    if (!loader) return;

    loader.classList.add("is-hidden");
    loader.setAttribute("aria-hidden", "true");
    document.body.classList.remove("is-loading");

    if (mainContent) {
      mainContent.removeAttribute("hidden");
    }

    if (header) {
      header.classList.add("is-visible");
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  function init() {
    document.documentElement.classList.add("js");
    document.body.classList.add("is-loading");
    setTimeout(dismissLoader, LOADER_DURATION_MS);
    setupNav();
    setupScrollSpy();
    setupReveal();
    setupParallax();
  }

  function setupNav() {
    if (!navToggle || !nav) return;

    navToggle.addEventListener("click", function () {
      var isOpen = nav.classList.toggle("is-open");
      navToggle.setAttribute("aria-expanded", String(isOpen));
    });

    nav.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        nav.classList.remove("is-open");
        navToggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  function setupScrollSpy() {
    var sections = document.querySelectorAll("section[id]");
    var navLinks = document.querySelectorAll(".site-nav a");

    if (!sections.length || !navLinks.length) return;

    function onScroll() {
      var scrollY = window.scrollY + 120;

      sections.forEach(function (section) {
        var top = section.offsetTop;
        var height = section.offsetHeight;
        var id = section.getAttribute("id");

        if (scrollY >= top && scrollY < top + height) {
          navLinks.forEach(function (link) {
            link.style.color = "";
            if (link.getAttribute("href") === "#" + id) {
              link.style.color = "var(--accent)";
            }
          });
        }
      });
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  // Reveal sections/cards as they scroll into view. Cards and journey
  // steps stagger like waypoints appearing along the trail. Falls back
  // to showing everything when reduced motion is preferred or JS lacks
  // IntersectionObserver.
  function setupReveal() {
    var prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var targets = document.querySelectorAll(
      ".section__header, .project-card, .journey__step, .about__text, .contact__panel"
    );
    if (!targets.length) return;

    targets.forEach(function (el) {
      el.classList.add("reveal");
    });

    if (prefersReduced || !("IntersectionObserver" in window)) {
      targets.forEach(function (el) {
        el.classList.add("is-visible");
      });
      return;
    }

    // Stagger items within their own group (cards beside cards, steps beside steps).
    function staggerWithin(selector) {
      document.querySelectorAll(selector).forEach(function (el, i) {
        el.style.transitionDelay = (i * 0.08) + "s";
      });
    }
    staggerWithin(".projects__grid .project-card");
    staggerWithin(".journey__step");

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        el.classList.add("is-visible");
        // Clear the stagger delay once revealed so hover stays snappy.
        el.addEventListener("transitionend", function clear() {
          el.style.transitionDelay = "";
          el.removeEventListener("transitionend", clear);
        });
        observer.unobserve(el);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });

    targets.forEach(function (el) {
      observer.observe(el);
    });
  }

  // Firewatch-style depth: hero sky/sun/ridge layers drift at different
  // rates while the hero is on screen. Transform-only + rAF for smoothness.
  // Skipped entirely under reduced-motion.
  function setupParallax() {
    var prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) return;

    var hero = document.querySelector(".hero");
    if (!hero) return;

    var layers = [
      { el: hero.querySelector(".hero__sun"), rate: 0.32 },
      { el: hero.querySelector(".hero__peak--far"), rate: 0.24 },
      { el: hero.querySelector(".hero__peak--mid"), rate: 0.15 },
      { el: hero.querySelector(".hero__peak--near"), rate: 0.07 }
    ].filter(function (layer) { return layer.el; });

    if (!layers.length) return;

    var ticking = false;

    function update() {
      var y = window.scrollY;
      // Only animate while the hero is still in view.
      if (y <= window.innerHeight) {
        layers.forEach(function (layer) {
          layer.el.style.transform = "translateY(" + (y * layer.rate).toFixed(1) + "px)";
        });
      }
      ticking = false;
    }

    function onScroll() {
      if (!ticking) {
        window.requestAnimationFrame(update);
        ticking = true;
      }
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    update();
  }
})();
