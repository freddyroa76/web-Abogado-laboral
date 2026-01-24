/* logic for herramienta-liquidacion-contrato.html */

const formatoPeso = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

async function downloadPDF() {
  const btn = document.querySelector(".btn-pdf");
  const originalText = btn.innerHTML;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generando...';
  btn.disabled = true;

  try {
    // Lazy Load html2pdf
    if (typeof html2pdf === "undefined") {
      await new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = "js/html2pdf.bundle.min.js";
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });
    }

    const element = document.getElementById("printArea");
    const opt = {
      margin: [0.3, 0.3, 0.3, 0.3],
      filename: "Liquidacion.pdf",
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, scrollY: 0 },
      jsPDF: { unit: "in", format: "letter", orientation: "portrait" },
    };
    await html2pdf().set(opt).from(element).save();
  } catch (err) {
    alert("Error generando PDF: " + err.message);
  } finally {
    btn.innerHTML = originalText;
    btn.disabled = false;
  }
}

// --- ENGINE DE FECHAS (360 Días Laborales) ---
function calcularDias360(f1Str, f2Str) {
  if (!f1Str || !f2Str) return 0;
  const f1 = new Date(f1Str + "T00:00:00");
  const f2 = new Date(f2Str + "T00:00:00");
  if (f2 < f1) return 0;
  const Y1 = f1.getFullYear(),
    M1 = f1.getMonth() + 1,
    D1 = f1.getDate();
  const Y2 = f2.getFullYear(),
    M2 = f2.getMonth() + 1;
  let D2 = f2.getDate();
  const d1Adj = D1 === 31 ? 30 : D1;
  const d2Adj = D2 === 31 ? 30 : D2;
  return (Y2 - Y1) * 360 + (M2 - M1) * 30 + (d2Adj - d1Adj) + 1;
}

// --- ENGINE DE PROMEDIOS SALARIALES ---
function obtenerPromedioEnRango(fechaInicioRango, fechaFinRango, historial) {
  if (!historial || historial.length === 0) return 0;

  let sumaSalarios = 0;
  let diasTotalesRango = 0;

  const rangoIni = new Date(fechaInicioRango + "T00:00:00");
  const rangoFin = new Date(fechaFinRango + "T00:00:00");

  historial.forEach((p) => {
    const pIni = new Date(p.ini + "T00:00:00");
    const pFin = new Date(p.fin + "T00:00:00");

    if (pFin >= rangoIni && pIni <= rangoFin) {
      const inicioReal = pIni < rangoIni ? rangoIni : pIni;
      const finReal = pFin > rangoFin ? rangoFin : pFin;

      const diasFragmento = calcularDias360(
        inicioReal.toISOString().split("T")[0],
        finReal.toISOString().split("T")[0],
      );

      if (diasFragmento > 0) {
        sumaSalarios += p.sal * diasFragmento;
        diasTotalesRango += diasFragmento;
      }
    }
  });

  if (diasTotalesRango === 0) return 0;
  return sumaSalarios / diasTotalesRango;
}

// --- LOGICA UI ---
let periodos = [];
// Wait for DOM
document.addEventListener("DOMContentLoaded", () => {
  const els = {
    pInicio: document.getElementById("pInicio"),
    pFin: document.getElementById("pFin"),
    pSalario: document.getElementById("pSalario"),
    smlv: document.getElementById("confSalarioMin"),
    aux: document.getElementById("confAuxilio"),
    fRetiroGlobal: document.getElementById("fechaRetiroGlobal"),
  };

  window.agregarPeriodo = function () {
    const ini = els.pInicio.value;
    const fin = els.pFin.value;
    const sal = parseFloat(els.pSalario.value);
    if (!ini || !fin || !sal) return alert("Datos incompletos");
    if (new Date(ini) > new Date(fin)) return alert("Fecha inicio mayor a fin");

    periodos.push({ ini, fin, sal });
    periodos.sort((a, b) => new Date(a.ini) - new Date(b.ini));

    renderPeriodos();

    const fInicioTotal = periodos[0].ini;
    const fFinTotal = periodos[periodos.length - 1].fin;

    els.fRetiroGlobal.value = fFinTotal;

    if (!document.getElementById("inicioCesantias").value)
      document.getElementById("inicioCesantias").value = fInicioTotal;
    if (!document.getElementById("inicioPrima").value)
      document.getElementById("inicioPrima").value = fInicioTotal;
    if (!document.getElementById("inicioVacaciones").value)
      document.getElementById("inicioVacaciones").value = fInicioTotal;

    els.pInicio.value = "";
    els.pFin.value = "";
    els.pSalario.value = "";
  };

  window.eliminarPeriodo = function (idx) {
    periodos.splice(idx, 1);
    renderPeriodos();
  };

  function renderPeriodos() {
    const tbody = document.querySelector("#tablaPeriodos tbody");
    tbody.innerHTML = "";
    if (periodos.length > 0) {
      document.getElementById("tablaPeriodos").style.display = "table";
      periodos.forEach((p, i) => {
        tbody.innerHTML += `<tr><td>${p.ini} a ${
          p.fin
        }</td><td>${calcularDias360(p.ini, p.fin)}</td><td>${formatoPeso.format(
          p.sal,
        )}</td><td><button type="button" class="btn-delete" onclick="eliminarPeriodo(${i})"><i class="fas fa-trash"></i></button></td></tr>`;
      });
    } else document.getElementById("tablaPeriodos").style.display = "none";
  }

  // --- VISIBILIDAD INDEMNIZACION ---
  const domMotivo = document.getElementById("motivoRetiro");
  const domTipo = document.getElementById("tipoContrato");
  function checkUI() {
    const show =
      domMotivo.value === "injusta" &&
      (domTipo.value === "fijo" || domTipo.value === "obra");
    document.getElementById("divFechaFinContrato").style.display = show
      ? "block"
      : "none";
  }
  domMotivo.addEventListener("change", checkUI);
  domTipo.addEventListener("change", checkUI);

  // --- CÁLCULO INDEMNIZACIÓN ---
  function calcularIndemnizacion(
    tipo,
    salarioBase,
    diasTotales,
    fFin,
    fPactada,
    smlv,
  ) {
    if (tipo === "fijo" || tipo === "obra") {
      if (!fPactada) return { dias: 0, valor: 0, desc: "Falta fecha pactada" };
      const diasFaltantes = calcularDias360(fFin, fPactada) - 1;
      if (diasFaltantes <= 0)
        return { dias: 0, valor: 0, desc: "Contrato vencido" };
      return {
        dias: diasFaltantes,
        valor: (salarioBase / 30) * diasFaltantes,
        desc: "Salarios faltantes",
      };
    } else {
      // INDEFINIDO
      let diasIndem = 0;
      if (salarioBase < smlv * 10) {
        if (diasTotales <= 360) diasIndem = (30 * diasTotales) / 360;
        else diasIndem = 30 + ((diasTotales - 360) * 20) / 360;
      } else {
        if (diasTotales <= 360) diasIndem = (20 * diasTotales) / 360;
        else diasIndem = 20 + ((diasTotales - 360) * 15) / 360;
      }
      return {
        dias: diasIndem.toFixed(2),
        valor: (salarioBase / 30) * diasIndem,
        desc: "Art. 64 CST",
      };
    }
  }

  // --- SUBMIT ---
  document.getElementById("liqForm").addEventListener("submit", function (e) {
    e.preventDefault();
    if (periodos.length === 0)
      return alert("Debe ingresar el historial salarial.");
    const btn = document.getElementById("btnCalcular");
    const originalText = btn.innerHTML;
    btn.innerHTML = "Calculando...";

    try {
      const setText = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
      };
      const fRetiro = els.fRetiroGlobal.value;
      const smlv = parseFloat(els.smlv.value) || 0;
      const auxLegal = parseFloat(els.aux.value) || 0;

      const iniCes = document.getElementById("inicioCesantias").value;
      const iniPri = document.getElementById("inicioPrima").value;
      const iniVac = document.getElementById("inicioVacaciones").value;
      const iniTotal = periodos[0].ini;

      const salarioPromedioCes = obtenerPromedioEnRango(
        iniCes,
        fRetiro,
        periodos,
      );
      const salarioPromedioPri = obtenerPromedioEnRango(
        iniPri,
        fRetiro,
        periodos,
      );
      const salarioPromedioVac = obtenerPromedioEnRango(
        iniVac,
        fRetiro,
        periodos,
      );

      const ultimoSalario = periodos[periodos.length - 1].sal;

      const baseCes =
        salarioPromedioCes + (salarioPromedioCes <= smlv * 2 ? auxLegal : 0);
      const basePri =
        salarioPromedioPri + (salarioPromedioPri <= smlv * 2 ? auxLegal : 0);
      const baseVac = salarioPromedioVac;

      const diasCes = calcularDias360(iniCes, fRetiro);
      const diasPri = calcularDias360(iniPri, fRetiro);
      const diasVac = calcularDias360(iniVac, fRetiro);
      const diasTotales = calcularDias360(iniTotal, fRetiro);

      const valCes = (baseCes * diasCes) / 360;
      const valInt = (valCes * diasCes * 0.12) / 360;
      const valPri = (basePri * diasPri) / 360;
      const valVac = (baseVac * diasVac) / 720;

      let valIndem = 0;
      if (domMotivo.value === "injusta") {
        document.getElementById("rowIndemnizacion").style.display = "table-row";
        const res = calcularIndemnizacion(
          domTipo.value,
          ultimoSalario,
          diasTotales,
          fRetiro,
          document.getElementById("fechaFinPactada").value,
          smlv,
        );
        valIndem = res.valor;
        setText("diasIndemnizacion", res.dias);
        setText("valIndemnizacion", formatoPeso.format(valIndem));
        setText("descIndem", res.desc);
        setText("baseIndem", formatoPeso.format(ultimoSalario));
      } else {
        document.getElementById("rowIndemnizacion").style.display = "none";
      }

      const subtotal = valCes + valInt + valPri + valVac + valIndem;

      const dateRetiro = new Date(fRetiro);
      const diaRetiro = dateRetiro.getDate() === 31 ? 30 : dateRetiro.getDate();
      const ibcSalida = (ultimoSalario / 30) * diaRetiro;
      const ded = ibcSalida * 0.04 * 2;
      const neto = subtotal - ded;

      setText("rFechaInicio", iniTotal);
      setText("rFechaFin", fRetiro);
      setText("rMotivo", domMotivo.options[domMotivo.selectedIndex].text);
      setText("rUltimoSalario", formatoPeso.format(ultimoSalario));

      setText("diasCesantias", diasCes);
      setText("baseCesantias", formatoPeso.format(baseCes));
      setText("valCesantias", formatoPeso.format(valCes));
      setText("diasIntereses", diasCes);
      setText("valIntereses", formatoPeso.format(valInt));
      setText("diasPrima", diasPri);
      setText("basePrima", formatoPeso.format(basePri));
      setText("valPrima", formatoPeso.format(valPri));
      setText("diasVacaciones", diasVac);
      setText("baseVacaciones", formatoPeso.format(baseVac));
      setText("valVacaciones", formatoPeso.format(valVac));

      setText("dedSalud", "-" + formatoPeso.format(ibcSalida * 0.04));
      setText("dedPension", "-" + formatoPeso.format(ibcSalida * 0.04));
      setText("totalNeto", formatoPeso.format(Math.max(0, neto)));

      const results = document.getElementById("resultsContainer");
      results.style.display = "block";
      results.scrollIntoView({ behavior: "smooth" });
    } catch (e) {
      alert(e.message);
    } finally {
      setTimeout(() => (btn.innerHTML = originalText), 500);
    }
  });
});
