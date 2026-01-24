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
  const mapPlaceholder = document.getElementById("map-placeholder");
  if (mapPlaceholder) {
    const loadMap = function () {
      const iframeSrc =
        "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3916.368013011745!2d-74.79042732416668!3d11.01100115481986!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x8ef42d7455555555%3A0x5555555555555555!2sCl.%2039%20%2343-123%2C%20Barranquilla%2C%20Atl%C3%A1ntico%2C%20Colombia!5e0!3m2!1ses!2sco!4v1708547000000!5m2!1ses!2sco";
      const iframe = document.createElement("iframe");
      iframe.setAttribute("src", iframeSrc);
      iframe.setAttribute("width", "100%");
      iframe.setAttribute("height", "100%");
      iframe.setAttribute("style", "border:0;");
      iframe.setAttribute("allowfullscreen", "");
      iframe.setAttribute("loading", "lazy");
      iframe.setAttribute("title", "Mapa de ubicación Tu Abogado Laboral");
      mapPlaceholder.innerHTML = "";
      mapPlaceholder.style.backgroundImage = "none";
      mapPlaceholder.style.cursor = "default";
      mapPlaceholder.appendChild(iframe);
      mapPlaceholder.removeEventListener("click", loadMap);
    };
    mapPlaceholder.addEventListener("click", loadMap);
  }
});
