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
  // 3. OPTIMIZACIÓN MENÚ MÓVIL (A11Y + UX + PERFORMANCE)
  // =======================================================
  const menuToggle = document.getElementById("mobile-menu");
  const navMenu = document.querySelector(".nav-menu");
  const body = document.body;

  if (menuToggle && navMenu) {
    // 3.1. Inyectar Overlay dinámicamente (Evita editar 19 HTMLs)
    let overlay = document.querySelector(".menu-overlay");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.className = "menu-overlay";
      overlay.setAttribute("aria-hidden", "true"); // Decorativo para lectores
      body.appendChild(overlay);
    }

    // 3.2. Configuración Inicial ARIA
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-controls", "nav-menu"); // ID que asignaremos al nav
    navMenu.setAttribute("id", "nav-menu");

    // Función para cerrar el menú
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

    // Función para abrir el menú
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
      // Foco al primer enlace para accesibilidad
      const firstLink = navMenu.querySelector("a");
      if (firstLink) setTimeout(() => firstLink.focus(), 100);
    };

    // 3.3. Event Listeners
    // Toggle Click
    menuToggle.addEventListener("click", (e) => {
      e.stopPropagation();
      const isExpanded = menuToggle.getAttribute("aria-expanded") === "true";
      isExpanded ? closeMenu() : openMenu();
    });

    // Clic en Overlay para cerrar
    overlay.addEventListener("click", closeMenu);

    // Tecla ESC para cerrar
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && navMenu.classList.contains("active")) {
        closeMenu();
      }
    });

    // Cerrar al hacer clic en enlaces
    navMenu.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", closeMenu);
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
