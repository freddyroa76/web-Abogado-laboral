document.addEventListener("DOMContentLoaded", function () {
  var header = document.querySelector("header");
  var scrollTimeout;
  window.addEventListener(
    "scroll",
    function () {
      if (scrollTimeout) {
        window.cancelAnimationFrame(scrollTimeout);
      }
      scrollTimeout = window.requestAnimationFrame(function () {
        header.classList.toggle("scrolled", window.scrollY > 50);
      });
    },
    { passive: true },
  );
  var currentLocation = window.location.pathname.split("/").pop();
  if (currentLocation === "" || currentLocation === "/")
    currentLocation = "index.html";
  var menuItems = document.querySelectorAll(".nav-menu a");
  menuItems.forEach(function (link) {
    link.classList.remove("active");
    var linkHref = link.getAttribute("href");
    if (linkHref === currentLocation) {
      link.classList.add("active");
    }
    if (
      window.location.hash === "#testimonios" &&
      linkHref === "#testimonios"
    ) {
      var homeLink = document.querySelector('a[href="index.html"]');
      if (homeLink) homeLink.classList.remove("active");
      link.classList.add("active");
    }
  });
  const menuToggle = document.getElementById("mobile-menu");
  const navMenu = document.querySelector(".nav-menu");
  const body = document.body;
  if (menuToggle && navMenu) {
    let overlay = document.querySelector(".menu-overlay");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.className = "menu-overlay";
      overlay.setAttribute("aria-hidden", "true"); // Decorativo para lectores
      body.appendChild(overlay);
    }
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-controls", "nav-menu"); // ID que asignaremos al nav
    navMenu.setAttribute("id", "nav-menu");
    const closeMenu = () => {
      navMenu.classList.remove("active");
      overlay.classList.remove("active");
      body.classList.remove("no-scroll");
      menuToggle.setAttribute("aria-expanded", "false");
      const icon = menuToggle.querySelector("i");
      if (icon) {
        icon.classList.remove("fa-times");
        icon.classList.add("fa-bars");
      }
      menuToggle.focus(); // Retornar foco al botón
    };
    const openMenu = () => {
      navMenu.classList.add("active");
      overlay.classList.add("active");
      body.classList.add("no-scroll");
      menuToggle.setAttribute("aria-expanded", "true");
      const icon = menuToggle.querySelector("i");
      if (icon) {
        icon.classList.remove("fa-bars");
        icon.classList.add("fa-times");
      }
      const firstLink = navMenu.querySelector("a");
      if (firstLink) setTimeout(() => firstLink.focus(), 100);
    };
    menuToggle.addEventListener("click", (e) => {
      e.stopPropagation();
      const isExpanded = menuToggle.getAttribute("aria-expanded") === "true";
      isExpanded ? closeMenu() : openMenu();
    });
    overlay.addEventListener("click", closeMenu);
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && navMenu.classList.contains("active")) {
        closeMenu();
      }
    });
    navMenu.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", closeMenu);
    });
  }

  // Registers Service Worker for Cache Policy
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("sw.js").then(
        function (registration) {
          console.log("[Service Worker] Registered");
        },
        function (err) {
          console.log("[Service Worker] Failed: ", err);
        },
      );
    });
  }
});
