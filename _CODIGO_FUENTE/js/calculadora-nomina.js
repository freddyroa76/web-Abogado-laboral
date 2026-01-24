const formatoPeso = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});
function downloadPDF() {
  const element = document.getElementById("printArea");
  const opt = {
    margin: [0.3, 0.3, 0.3, 0.3], // Márgenes pequeños
    filename: "Liquidacion_Nomina_TuAbogadoLaboral.pdf",
    image: { type: "jpeg", quality: 0.98 },
    html2canvas: {
      scale: 2, // Mejora calidad texto
      useCORS: true, // Permite cargar imágenes externas
      scrollY: 0, // Clave: Ignora el scroll actual para capturar todo
      logging: true,
    },
    jsPDF: {
      unit: "in",
      format: "letter",
      orientation: "portrait",
    },
  };
  html2pdf().set(opt).from(element).save();
}
const tipoContrato = document.getElementById("tipoContrato");
const checkAux = document.getElementById("checkAux");
const valAuxInput = document.getElementById("valAuxilioInput");
const confAuxilio = document.getElementById("confAuxilio");
const salarioBaseInput = document.getElementById("salarioBase");
const confSalarioMin = document.getElementById("confSalarioMin");
checkAux.addEventListener("change", function () {
  if (this.checked) {
    valAuxInput.disabled = false;
    valAuxInput.value = confAuxilio.value;
  } else {
    valAuxInput.disabled = true;
    valAuxInput.value = "";
  }
});
function autoValidarAuxilio() {
  const salario = parseFloat(salarioBaseInput.value) || 0;
  const smmlv = parseFloat(confSalarioMin.value) || 0;
  const esServicios = tipoContrato.value === "servicios";
  const tope = smmlv * 2;
  if (!esServicios && salario > 0) {
    if (salario <= tope) {
      checkAux.checked = true;
    } else {
      checkAux.checked = false;
    }
    checkAux.dispatchEvent(new Event("change"));
  }
}
salarioBaseInput.addEventListener("input", autoValidarAuxilio);
tipoContrato.addEventListener("change", function () {
  const esServicios = this.value === "servicios";
  const panelLaboral = document.getElementById("panelLaboral");
  if (esServicios) {
    panelLaboral.style.opacity = "0.3";
    panelLaboral.style.pointerEvents = "none";
    document.querySelector("label[for='salarioBase']").textContent =
      "Honorarios Mensuales";
    checkAux.checked = false;
    checkAux.dispatchEvent(new Event("change"));
    checkAux.disabled = true;
  } else {
    panelLaboral.style.opacity = "1";
    panelLaboral.style.pointerEvents = "auto";
    document.querySelector("label[for='salarioBase']").textContent =
      "Salario Base Mensual";
    checkAux.disabled = false;
    autoValidarAuxilio();
  }
});
document
  .getElementById("masterForm")
  .addEventListener("submit", function (e) {
    e.preventDefault();
    const btn = document.getElementById("btnCalcular");
    const originalText = btn.innerHTML;
    btn.innerHTML =
      '<i class="fas fa-spinner fa-spin"></i> Calculando...';
    try {
      const setText = (id, val) => {
        const el = document.getElementById(id);
        if (el) {
          el.textContent = val;
        }
      };
      const getVal = (id) =>
        parseFloat(document.getElementById(id).value) || 0;
      const SMMLV = getVal("confSalarioMin");
      const UVT = getVal("confUVT");
      const salarioContrato = getVal("salarioBase");
      const dias = getVal("diasLaborados");
      const otros = getVal("otrosIngresos");
      const tipo = tipoContrato.value;
      const salarioDevengado = (salarioContrato / 30) * dias;
      const valAuxLegal = parseFloat(confAuxilio.value) || 0;
      let auxilioDevengado = 0;
      if (checkAux.checked) {
        auxilioDevengado = (valAuxLegal / 30) * dias;
      }
      setText("pSalarioBase", formatoPeso.format(salarioContrato));
      setText("pDiasLiq", dias);
      setText(
        "pTipoContrato",
        tipo === "indefinido"
          ? "Término Indefinido"
          : tipo === "fijo"
            ? "Término Fijo"
            : tipo === "obra"
              ? "Obra o Labor"
              : "Prestación Servicios",
      );
      setText(
        "pAuxilioIncluido",
        auxilioDevengado > 0
          ? formatoPeso.format(auxilioDevengado)
          : "No Aplica ($0)",
      );
      setText("pOtrosIngresos", formatoPeso.format(otros));
      const arlPct = parseFloat(
        document.getElementById("nivelArl").value,
      );
      setText("pRiesgoArl", (arlPct * 100).toFixed(3) + "%");
      let exonerado = false;
      let txtExonerado = "No (Paga Todo)";
      if (tipo !== "servicios") {
        exonerado =
          document.getElementById("selectExonerado").value === "si";
        if (salarioContrato + otros >= SMMLV * 10) {
          exonerado = false;
          txtExonerado = "No (Supera 10 SMMLV)";
        } else if (exonerado) {
          txtExonerado = "Sí (Aplica)";
        }
      } else {
        txtExonerado = "N/A (Independiente)";
      }
      setText("pExonerado", txtExonerado);
      const prepagada = Math.min(getVal("dedPrepagada"), 16 * UVT);
      const vivienda = Math.min(getVal("dedVivienda"), 100 * UVT);
      const voluntarios = getVal("dedVoluntarios");
      const dependientes = document.getElementById("checkDependientes")
        .checked
        ? Math.min((salarioDevengado + otros) * 0.1, 32 * UVT)
        : 0;
      const leyFsp = document.getElementById("leyPensional").value;
      let empSalud = 0,
        empPension = 0,
        empFsp = 0;
      let ciaSalud = 0,
        ciaPension = 0,
        ciaArl = 0,
        ciaCaja = 0,
        ciaSena = 0,
        ciaIcbf = 0;
      let ciaPrima = 0,
        ciaCesantias = 0,
        ciaInt = 0,
        ciaVacaciones = 0;
      let baseSS = salarioDevengado + otros;
      if (tipo === "servicios") {
      } else {
        empSalud = baseSS * 0.04;
        empPension = baseSS * 0.04;
        if (salarioContrato + otros > SMMLV * 4) {
          let pct = 0;
          let nS = (salarioContrato + otros) / SMMLV;
          if (leyFsp === "ley100") {
            pct =
              nS < 16
                ? 1.0
                : nS < 17
                  ? 1.2
                  : nS < 18
                    ? 1.4
                    : nS < 19
                      ? 1.6
                      : nS < 20
                        ? 1.8
                        : 2.0;
          } else {
            if (nS < 7) pct = 1.5;
            else if (nS < 11) pct = 1.8;
            else if (nS < 19) pct = 2.5;
            else if (nS <= 20) pct = 2.8;
            else pct = 3.0;
          }
          empFsp = baseSS * (pct / 100);
        }
        ciaSalud = exonerado ? 0 : baseSS * 0.085;
        ciaPension = baseSS * 0.12;
        ciaArl = baseSS * arlPct;
        ciaCaja = baseSS * 0.04;
        ciaSena = exonerado ? 0 : baseSS * 0.02;
        ciaIcbf = exonerado ? 0 : baseSS * 0.03;
        let basePrest = salarioDevengado + otros + auxilioDevengado;
        ciaPrima = basePrest * 0.0833;
        ciaCesantias = basePrest * 0.0833;
        ciaInt = basePrest * 0.01;
        let baseVac = salarioDevengado + otros;
        ciaVacaciones = baseVac * 0.0417;
      }
      let totalIncr = 0;
      if (tipo === "servicios") {
        let ibc = (salarioDevengado + otros) * 0.4;
        totalIncr = ibc * 0.125 + ibc * 0.16 + ibc * 0.00522;
      } else {
        totalIncr = empSalud + empPension + empFsp;
      }
      let netoDepuracion = salarioDevengado + otros - totalIncr;
      let totalDeducciones = vivienda + prepagada + dependientes;
      let base25 = Math.max(
        0,
        netoDepuracion - totalDeducciones - voluntarios,
      );
      let renta25 = base25 * 0.25;
      let totalAlivios = totalDeducciones + voluntarios + renta25;
      let tope40 = netoDepuracion * 0.4;
      let topeAbs = (1340 / 12) * UVT; // 1340 UVT anuales / 12
      let realAlivios = Math.min(totalAlivios, Math.min(tope40, topeAbs));
      let baseGravableReal = Math.max(0, netoDepuracion - realAlivios);
      let baseGravableProyectada = (baseGravableReal / dias) * 30;
      let baseUVT = baseGravableProyectada / UVT;
      let retUVT = 0;
      if (baseUVT > 2300) retUVT = (baseUVT - 2300) * 0.39 + 770;
      else if (baseUVT > 945) retUVT = (baseUVT - 945) * 0.37 + 268;
      else if (baseUVT > 640) retUVT = (baseUVT - 640) * 0.35 + 162;
      else if (baseUVT > 360) retUVT = (baseUVT - 360) * 0.33 + 69;
      else if (baseUVT > 150) retUVT = (baseUVT - 150) * 0.28 + 10;
      else if (baseUVT > 95) retUVT = (baseUVT - 95) * 0.19;
      let valRetencionMensual = Math.round((retUVT * UVT) / 1000) * 1000;
      let valRetencion = (valRetencionMensual / 30) * dias;
      setText("cSalario", formatoPeso.format(salarioDevengado));
      setText("cAuxilio", formatoPeso.format(auxilioDevengado));
      setText("cDotacion", tipo === "servicios" ? "$0" : "S/D");
      setText("cSalud", formatoPeso.format(ciaSalud));
      setText("cPension", formatoPeso.format(ciaPension));
      setText("cArl", formatoPeso.format(ciaArl));
      setText("cCaja", formatoPeso.format(ciaCaja));
      setText("cIcbf", formatoPeso.format(ciaIcbf));
      setText("cSena", formatoPeso.format(ciaSena));
      setText("cPrima", formatoPeso.format(ciaPrima));
      setText("cCesantias", formatoPeso.format(ciaCesantias));
      setText("cIntereses", formatoPeso.format(ciaInt));
      setText("cVacaciones", formatoPeso.format(ciaVacaciones));
      let totalEmpresa =
        salarioDevengado +
        otros +
        auxilioDevengado +
        ciaSalud +
        ciaPension +
        ciaArl +
        ciaCaja +
        ciaIcbf +
        ciaSena +
        ciaPrima +
        ciaCesantias +
        ciaInt +
        ciaVacaciones;
      if (tipo === "servicios") totalEmpresa = salarioDevengado + otros;
      setText("cTotalMensual", formatoPeso.format(totalEmpresa));
      let costoAnual = (totalEmpresa / dias) * 360;
      setText("cTotalAnual", formatoPeso.format(costoAnual));
      let devengado = salarioDevengado + otros + auxilioDevengado;
      setText("eSalario", formatoPeso.format(salarioDevengado));
      setText("eAuxilio", formatoPeso.format(auxilioDevengado));
      setText("eOtros", formatoPeso.format(otros));
      setText("eTotalDev", formatoPeso.format(devengado));
      setText("eSalud", formatoPeso.format(empSalud));
      setText("ePension", formatoPeso.format(empPension));
      setText("eFsp", formatoPeso.format(empFsp));
      setText("eRetefuente", formatoPeso.format(valRetencion));
      let dedTotal = empSalud + empPension + empFsp + valRetencion;
      if (tipo === "servicios") dedTotal = valRetencion;
      setText("eTotalDed", formatoPeso.format(dedTotal));
      setText("eNeto", formatoPeso.format(devengado - dedTotal));
      setText("rIngresos", formatoPeso.format(salarioDevengado + otros));
      setText("rSeguridad", "-" + formatoPeso.format(totalIncr));
      setText("rNeto", formatoPeso.format(netoDepuracion));
      setText("rDeducciones", "-" + formatoPeso.format(totalDeducciones));
      setText(
        "rExentas",
        "-" + formatoPeso.format(renta25 + voluntarios),
      );
      setText("rBase", formatoPeso.format(baseGravableReal));
      setText("rTotal", formatoPeso.format(valRetencion));
      const results = document.getElementById("resultsContainer");
      results.style.display = "block";
      results.scrollIntoView({ behavior: "smooth" });
    } catch (error) {
      console.error("Error en cálculo:", error);
      alert("Error de cálculo: " + error.message);
    } finally {
      setTimeout(() => {
        btn.innerHTML = originalText;
      }, 500);
    }
  });
