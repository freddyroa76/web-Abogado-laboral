document.addEventListener("DOMContentLoaded", function () {
  // =======================================================
  // 1. CÓDIGO EXISTENTE (EFECTO SCROLL)
  // =======================================================
  var header = document.querySelector("header");
  var scrollTimeout;

  window.addEventListener(
    "scroll",
    function () {
      // Usamos requestAnimationFrame para optimizar rendimiento
      if (scrollTimeout) {
        window.cancelAnimationFrame(scrollTimeout);
      }
      scrollTimeout = window.requestAnimationFrame(function () {
        // Si bajamos más de 50px, agregamos la clase scrolled
        header.classList.toggle("scrolled", window.scrollY > 50);
      });
    },
    { passive: true }
  );

  // =======================================================
  // 2. CÓDIGO EXISTENTE (RESALTAR PÁGINA ACTUAL)
  // =======================================================
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

    // Lógica especial para anclas
    if (
      window.location.hash === "#testimonios" &&
      linkHref === "#testimonios"
    ) {
      var homeLink = document.querySelector('a[href="index.html"]');
      if (homeLink) homeLink.classList.remove("active");
      link.classList.add("active");
    }
  });

  // =======================================================
  // 3. NUEVO CÓDIGO (MENÚ HAMBURGUESA - PASO 4)
  // =======================================================

  // Seleccionamos los elementos creados en el HTML
  const menuToggle = document.getElementById("mobile-menu");
  const navMenu = document.querySelector(".nav-menu");
  // Buscamos el ícono (<i>) dentro del botón para cambiarlo luego
  const menuIcon = menuToggle ? menuToggle.querySelector("i") : null;

  // Verificamos que existan para evitar errores
  if (menuToggle && navMenu) {
    // A) Evento al hacer clic en el botón hamburguesa
    menuToggle.addEventListener("click", function () {
      // 1. Ponemos o quitamos la clase 'active' al menú (CSS hace el resto)
      navMenu.classList.toggle("active");

      // 2. Cambiamos el dibujito del ícono (de Rayitas a X)
      if (menuIcon) {
        if (navMenu.classList.contains("active")) {
          menuIcon.classList.remove("fa-bars");
          menuIcon.classList.add("fa-times");
        } else {
          menuIcon.classList.remove("fa-times");
          menuIcon.classList.add("fa-bars");
        }
      }
    });

    // B) Cerrar el menú automáticamente al tocar un enlace
    // (Esto mejora la experiencia: el usuario elige una opción y el menú se quita)
    const navLinks = document.querySelectorAll(".nav-menu a");
    navLinks.forEach(function (link) {
      link.addEventListener("click", function () {
        if (navMenu.classList.contains("active")) {
          navMenu.classList.remove("active");
          // Devolvemos el ícono a su estado original (Rayitas)
          if (menuIcon) {
            menuIcon.classList.remove("fa-times");
            menuIcon.classList.add("fa-bars");
          }
        }
      });
    });
  }
});
