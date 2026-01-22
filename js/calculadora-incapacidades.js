const formatoPeso = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

// --- PDF GENERATOR ---
function downloadPDF() {
  const element = document.getElementById("printArea");
  const opt = {
    margin: [0.3, 0.3, 0.3, 0.3],
    filename: "Liquidacion_Incapacidad.pdf",
    image: { type: "jpeg", quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, scrollY: 0 },
    jsPDF: { unit: "in", format: "letter", orientation: "portrait" },
  };
  html2pdf().set(opt).from(element).save();
}

// --- MOTOR LÓGICO DE INCAPACIDADES ---
document.getElementById("incapacidadForm").addEventListener("submit", function (e) {
  e.preventDefault();
  const btn = document.getElementById("btnCalcular");

  try {
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Calculando...';

    // 1. Obtener Datos
    const salarioBase = parseFloat(document.getElementById("salarioBase").value) || 0;
    const diasSolicitados = parseInt(document.getElementById("diasSolicitados").value) || 0;
    const diasAcumulados = parseInt(document.getElementById("diasAcumulados").value) || 0;
    const tipoOrigen = document.getElementById("tipoIncapacidad").value;
    const smlv = parseFloat(document.getElementById("confSalarioMin").value);

    if (diasSolicitados <= 0) throw new Error("Ingrese una cantidad de días válida.");

    // 2. Valores Diarios
    const valorDiaSalario = salarioBase / 30;
    const valorDiaMinimo = smlv / 30;

    // 3. Acumuladores
    let totales = {
      empresa: 0,
      diasEmpresa: 0,
      eps: 0,
      diasEps: 0,
      arl: 0,
      diasArl: 0,
      afp: 0,
      diasAfp: 0,
      totalBruto: 0,
    };

    // 4. ALGORITMO DE ITERACIÓN DIARIA (La magia Senior)
    const diaInicio = diasAcumulados + 1;
    const diaFin = diasAcumulados + diasSolicitados;

    for (let i = diaInicio; i <= diaFin; i++) {
      let porcentaje = 0;
      let entidad = "";
      let detalle = "";

      if (tipoOrigen === "laboral") {
        // --- ESCENARIO ARL (Fácil) ---
        porcentaje = 1.0;
        entidad = "arl";
      } else {
        // --- ESCENARIO COMÚN (Escalera) ---
        if (i <= 2) {
          porcentaje = 0.6667;
          entidad = "empresa";
        } else if (i <= 90) {
          porcentaje = 0.6667;
          entidad = "eps";
        } else if (i <= 180) {
          porcentaje = 0.5;
          entidad = "eps";
        } else if (i <= 540) {
          porcentaje = 0.5;
          entidad = "afp";
        } else {
          porcentaje = 0.5;
          entidad = "eps"; // Simplificación >540
        }
      }

      // Cálculo con PISO MÍNIMO (Sentencia C-543/07)
      let valorDia = valorDiaSalario * porcentaje;
      if (valorDia < valorDiaMinimo) {
        valorDia = valorDiaMinimo; // Ajuste automático al mínimo
      }

      // Acumular
      if (entidad === "empresa") {
        totales.empresa += valorDia;
        totales.diasEmpresa++;
      }
      if (entidad === "eps") {
        totales.eps += valorDia;
        totales.diasEps++;
      }
      if (entidad === "arl") {
        totales.arl += valorDia;
        totales.diasArl++;
      }
      if (entidad === "afp") {
        totales.afp += valorDia;
        totales.diasAfp++;
      }

      totales.totalBruto += valorDia;
    }

    // 5. Deducciones (4% Salud + 4% Pensión sobre lo recibido)
    const dedSalud = totales.totalBruto * 0.04;
    const dedPension = totales.totalBruto * 0.04;
    const totalNeto = totales.totalBruto - dedSalud - dedPension;

    // 6. RENDERIZADO
    document.getElementById("resOrigen").textContent =
      tipoOrigen === "laboral" ? "Laboral (ARL)" : "Común (EPS)";
    document.getElementById("resIBC").textContent = formatoPeso.format(salarioBase);
    document.getElementById("resDias").textContent = diasSolicitados;

    // Construir tabla dinámica
    let htmlTabla = "";
    if (totales.empresa > 0)
      htmlTabla += `<tr><td><strong>Empleador</strong></td><td class="text-center">${
        totales.diasEmpresa
      }</td><td>Días 1-2 (66.67%)</td><td class="text-right">${formatoPeso.format(
        totales.empresa
      )}</td></tr>`;

    if (totales.eps > 0)
      htmlTabla += `<tr><td><strong>EPS</strong></td><td class="text-center">${
        totales.diasEps
      }</td><td>Días 3-180</td><td class="text-right">${formatoPeso.format(
        totales.eps
      )}</td></tr>`;

    if (totales.afp > 0)
      htmlTabla += `<tr><td><strong>Fondo Pensiones</strong></td><td class="text-center">${
        totales.diasAfp
      }</td><td>Días 180-540</td><td class="text-right">${formatoPeso.format(
        totales.afp
      )}</td></tr>`;

    if (totales.arl > 0)
      htmlTabla += `<tr><td><strong>ARL</strong></td><td class="text-center">${
        totales.diasArl
      }</td><td>Accidente Trabajo (100%)</td><td class="text-right">${formatoPeso.format(
        totales.arl
      )}</td></tr>`;

    // Fila Total Bruto
    htmlTabla += `<tr class="highlight-row"><td><strong>TOTAL BRUTO</strong></td><td></td><td></td><td class="text-right"><strong>${formatoPeso.format(
      totales.totalBruto
    )}</strong></td></tr>`;

    document.getElementById("tablaResultados").innerHTML = htmlTabla;

    // Deducciones y Neto
    document.getElementById("resSalud").textContent = "-" + formatoPeso.format(dedSalud);
    document.getElementById("resPension").textContent =
      "-" + formatoPeso.format(dedPension);
    document.getElementById("resNeto").textContent = formatoPeso.format(
      Math.floor(totalNeto)
    );

    // UX
    document.getElementById("resultsContainer").style.display = "block";
    document.getElementById("resultsContainer").scrollIntoView({ behavior: "smooth" });
    btn.innerHTML = '<i class="fas fa-calculator"></i> Recalcular';
  } catch (error) {
    console.error(error);
    alert(error.message);
    btn.innerHTML = '<i class="fas fa-calculator"></i> Calcular Prestación';
  }
});
