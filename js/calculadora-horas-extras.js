// 1. CONFIGURACIÓN LEGAL (Validada 2026 y Reforma)
const CONSTANTES_PERIODO = {
  p_old: {
    divisor: 240,
    dom: 0.75,
    label: "48 Horas",
    text: "Normativa Antigua",
  },
  p_2023: {
    divisor: 235,
    dom: 0.75,
    label: "47 Horas",
    text: "Transición 2023-2024",
  },
  p_2024: {
    divisor: 230,
    dom: 0.75,
    label: "46 Horas",
    text: "Transición 2024-2025",
  },
  p_2025: {
    divisor: 220,
    dom: 0.8,
    label: "44 Horas",
    text: "Reforma & Reducción 2025-2026",
  },
  p_2026: {
    divisor: 210,
    dom: 0.9,
    label: "42 Horas",
    text: "Reforma & Reducción 2026-2027",
  },
  p_2027: {
    divisor: 210,
    dom: 1.0,
    label: "42 Horas",
    text: "Implementación Total",
  },
};

const selectorPeriodo = document.getElementById("periodoSelector");
const badgeJornada = document.getElementById("badgeJornada");
const badgeRecargo = document.getElementById("badgeRecargo");

// Función visual actualizada con DIVISOR explícito
function actualizarInfoVisual() {
  const key = selectorPeriodo.value;
  const config = CONSTANTES_PERIODO[key];

  badgeJornada.innerHTML = `<i class="fas fa-clock"></i> Jornada: ${config.label} | Divisor: ${config.divisor}`;
  badgeRecargo.innerHTML = `<i class="fas fa-percentage"></i> Recargo Dom: ${(
    config.dom * 100
  ).toFixed(0)}%`;
}

if (selectorPeriodo) {
  selectorPeriodo.addEventListener("change", actualizarInfoVisual);
  actualizarInfoVisual();
}

const formatoPesoExtras = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

// 2. LÓGICA DE CÁLCULO
const formExtras = document.getElementById("extrasForm");

if (formExtras) {
  formExtras.addEventListener("submit", function (e) {
    e.preventDefault();

    // A. Obtener Configuración
    const key = selectorPeriodo.value;
    const config = CONSTANTES_PERIODO[key];
    const divisorJornada = config.divisor;
    const porcentajeDominical = config.dom;

    // B. Obtener Inputs
    let salario = parseFloat(document.getElementById("salario").value) || 0;
    let qtyHed = parseFloat(document.getElementById("hed").value) || 0;
    let qtyHen = parseFloat(document.getElementById("hen").value) || 0;
    let qtyRn = parseFloat(document.getElementById("rn").value) || 0;
    let qtyDf = parseFloat(document.getElementById("df").value) || 0;
    let qtyHedf = parseFloat(document.getElementById("hedf").value) || 0;
    let qtyHedfn = parseFloat(document.getElementById("hedfn").value) || 0;

    // C. Factores
    const FACTOR_HED = 1.25;
    const FACTOR_HEN = 1.75;
    const FACTOR_RN = 0.35;

    const FACTOR_DF = 1.0 + porcentajeDominical;
    const FACTOR_HEDF = 1.0 + 0.25 + porcentajeDominical;
    const FACTOR_HEDFN = 1.0 + 0.75 + porcentajeDominical;

    // D. Matemáticas Individuales
    let valHora = salario / divisorJornada;

    // Grupo Extras
    let totalHed = Math.round(valHora * FACTOR_HED * qtyHed);
    let totalHen = Math.round(valHora * FACTOR_HEN * qtyHen);
    let totalHedf = Math.round(valHora * FACTOR_HEDF * qtyHedf);
    let totalHedfn = Math.round(valHora * FACTOR_HEDFN * qtyHedfn);

    // Grupo Recargos
    let totalRn = Math.round(valHora * FACTOR_RN * qtyRn);
    let totalDf = Math.round(valHora * FACTOR_DF * qtyDf);

    // E. Subtotales y Totales
    let subtotalExtras = totalHed + totalHen + totalHedf + totalHedfn;
    let subtotalRecargos = totalRn + totalDf;
    let granTotal = subtotalExtras + subtotalRecargos;

    // F. Renderizado en Pantalla
    document.getElementById("valHoraOrdinaria").textContent =
      formatoPesoExtras.format(Math.round(valHora));
    document.getElementById("resDivisorUsado").textContent =
      `Divisor usado: ${divisorJornada}`;
    document.getElementById("resPeriodoTexto").textContent =
      `Vigencia: ${config.text}`;

    // Renderizar Items Individuales
    document.getElementById("resHed").textContent =
      formatoPesoExtras.format(totalHed);
    document.getElementById("resHen").textContent =
      formatoPesoExtras.format(totalHen);
    document.getElementById("resHedf").textContent =
      formatoPesoExtras.format(totalHedf);
    document.getElementById("resHedfn").textContent =
      formatoPesoExtras.format(totalHedfn);

    document.getElementById("subtotalExtras").textContent =
      formatoPesoExtras.format(subtotalExtras);

    document.getElementById("resRn").textContent =
      formatoPesoExtras.format(totalRn);
    document.getElementById("resDf").textContent =
      formatoPesoExtras.format(totalDf);

    document.getElementById("subtotalRecargos").textContent =
      formatoPesoExtras.format(subtotalRecargos);

    document.getElementById("valTotal").textContent =
      formatoPesoExtras.format(granTotal);

    // Animación
    const resultCard = document.getElementById("resultCard");
    resultCard.style.display = "block";
    resultCard.scrollIntoView({ behavior: "smooth" });
  });
}
