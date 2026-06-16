(function () {
  "use strict";

  var loader = document.getElementById("loader");
  var mainContent = document.getElementById("main-content");
  var header = document.querySelector(".site-header");
  var navToggle = document.querySelector(".site-header__toggle");
  var nav = document.querySelector(".site-nav");

  var prefersReducedMotion =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Minimum time the loading screen stays visible (so the animation is seen),
  // and a hard cap so the loader can never get stuck on screen.
  var MIN_LOADER_MS = prefersReducedMotion ? 400 : 1800;
  var MAX_LOADER_MS = 5000;

  var startTime = Date.now();
  var dismissed = false;

  function dismissLoader() {
    if (dismissed) return;
    dismissed = true;

    if (loader) {
      loader.classList.add("is-hidden");
      loader.setAttribute("aria-hidden", "true");
    }
    document.body.classList.remove("is-loading");
    if (mainContent) {
      mainContent.removeAttribute("hidden");
    }
    if (header) {
      header.classList.add("is-visible");
    }
  }

  function scheduleDismiss() {
    var elapsed = Date.now() - startTime;
    var wait = Math.max(MIN_LOADER_MS - elapsed, 0);
    setTimeout(dismissLoader, wait);
  }

  function init() {
    document.body.classList.add("is-loading");

    // Dismiss once the page has finished loading (after the minimum display
    // time). The hard cap guarantees the loader always clears.
    if (document.readyState === "complete") {
      scheduleDismiss();
    } else {
      window.addEventListener("load", scheduleDismiss);
    }
    setTimeout(dismissLoader, MAX_LOADER_MS);

    setupNav();
    setupScrollSpy();
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
            var isActive = link.getAttribute("href") === "#" + id;
            link.classList.toggle("is-active", isActive);
            if (isActive) {
              link.setAttribute("aria-current", "true");
            } else {
              link.removeAttribute("aria-current");
            }
          });
        }
      });
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
