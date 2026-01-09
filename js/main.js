document.addEventListener("DOMContentLoaded", function () {
  // 1. EFECTO SCROLL (Header Sticky)
  window.addEventListener("scroll", function () {
    var header = document.querySelector("header");
    // Si bajamos más de 50px, agregamos la clase scrolled
    header.classList.toggle("scrolled", window.scrollY > 50);
  });

  // 2. RESALTAR PÁGINA ACTUAL (Active Pill)
  var currentLocation = window.location.pathname.split("/").pop();
  if (currentLocation === "") currentLocation = "index.html";

  var menuItems = document.querySelectorAll(".nav-menu a");

  menuItems.forEach(function (link) {
    link.classList.remove("active");
    var linkHref = link.getAttribute("href");

    // Comparación simple para iluminar la página actual
    if (linkHref === currentLocation) {
      link.classList.add("active");
    }

    // Excepción: Si estoy en Home y clic en Testimonios (Ancla)
    if (
      window.location.hash === "#testimonios" &&
      linkHref === "#testimonios"
    ) {
      document.querySelector('a[href="index.html"]').classList.remove("active");
      link.classList.add("active");
    }
  });
});
