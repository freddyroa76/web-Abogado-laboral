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
    { passive: true },
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

  // =======================================================
  // 4. NUEVO CÓDIGO (MAPA DEFERRIDO / FACADE)
  // =======================================================
  const mapPlaceholder = document.getElementById("map-placeholder");

  if (mapPlaceholder) {
    // Función para cargar el mapa
    const loadMap = function () {
      // URL del iframe
      const iframeSrc =
        "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3916.368013011745!2d-74.79042732416668!3d11.01100115481986!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x8ef42d7455555555%3A0x5555555555555555!2sCl.%2039%20%2343-123%2C%20Barranquilla%2C%20Atl%C3%A1ntico%2C%20Colombia!5e0!3m2!1ses!2sco!4v1708547000000!5m2!1ses!2sco";

      // Crear iframe
      const iframe = document.createElement("iframe");
      iframe.setAttribute("src", iframeSrc);
      iframe.setAttribute("width", "100%");
      iframe.setAttribute("height", "100%");
      iframe.setAttribute("style", "border:0;");
      iframe.setAttribute("allowfullscreen", "");
      iframe.setAttribute("loading", "lazy");
      iframe.setAttribute("title", "Mapa de ubicación Tu Abogado Laboral");

      // Limpiar placeholder y agregar iframe
      mapPlaceholder.innerHTML = "";
      mapPlaceholder.style.backgroundImage = "none";
      mapPlaceholder.style.cursor = "default";
      mapPlaceholder.appendChild(iframe);

      // Remover listener para que no se ejecute de nuevo
      mapPlaceholder.removeEventListener("click", loadMap);
    };

    // Agregar listener al clic
    mapPlaceholder.addEventListener("click", loadMap);
  }
});
