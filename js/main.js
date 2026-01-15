document.addEventListener("DOMContentLoaded", function () {
  // 1. EFECTO SCROLL OPTIMIZADO (Mejora rendimiento en móviles)
  var header = document.querySelector("header");
  var scrollTimeout;

  window.addEventListener(
    "scroll",
    function () {
      // Usamos requestAnimationFrame para no sobrecargar el navegador
      if (scrollTimeout) {
        window.cancelAnimationFrame(scrollTimeout);
      }
      scrollTimeout = window.requestAnimationFrame(function () {
        // Si bajamos más de 50px, agregamos la clase scrolled
        header.classList.toggle("scrolled", window.scrollY > 50);
      });
    },
    { passive: true }
  ); // 'passive: true' le dice al navegador que el scroll es prioritario

  // 2. RESALTAR PÁGINA ACTUAL (Active Pill)
  var currentLocation = window.location.pathname.split("/").pop();
  // Si estamos en la raíz (ej: midominio.com/), asumir index.html
  if (currentLocation === "" || currentLocation === "/")
    currentLocation = "index.html";

  var menuItems = document.querySelectorAll(".nav-menu a");

  menuItems.forEach(function (link) {
    // Limpiamos clases previas
    link.classList.remove("active");
    var linkHref = link.getAttribute("href");

    // Coincidencia exacta
    if (linkHref === currentLocation) {
      link.classList.add("active");
    }

    // Lógica especial para anclas (ej: Testimonios en la misma página)
    if (
      window.location.hash === "#testimonios" &&
      linkHref === "#testimonios"
    ) {
      var homeLink = document.querySelector('a[href="index.html"]');
      if (homeLink) homeLink.classList.remove("active");
      link.classList.add("active");
    }
  });
});
