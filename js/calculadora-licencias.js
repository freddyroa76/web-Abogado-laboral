/* logic for herramienta-licencias.html */

const formatoPeso = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

// --- PDF GENERATOR (Lazy Load) ---
async function downloadPDF() {
  const btn = document.querySelector(".btn-pdf"); // Usar clase si no tiene ID especifico o agregar ID
  if (!btn) return;
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
      filename: "Licencia_Maternidad.pdf",
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

// --- UI LOGIC & CALCULATOR ---
document.addEventListener("DOMContentLoaded", () => {
  const rolSelect = document.getElementById("rolTrabajador");
  const secCompartida = document.getElementById("seccionCompartida");
  const checkCompartida = document.getElementById("licenciaCompartida");
  const boxCompartida = document.getElementById("boxCompartida");

  // Initial State Check
  if (rolSelect.value === "padre") {
    secCompartida.style.display = "none";
    checkCompartida.checked = false;
    boxCompartida.style.display = "none";
  } else {
    secCompartida.style.display = "block";
  }

  rolSelect.addEventListener("change", function () {
    if (this.value === "padre") {
      secCompartida.style.display = "none";
      checkCompartida.checked = false;
      boxCompartida.style.display = "none";
    } else {
      secCompartida.style.display = "block";
    }
  });

  checkCompartida.addEventListener("change", function () {
    boxCompartida.style.display = this.checked ? "block" : "none";
  });

  // --- CALCULADORA ---
  document
    .getElementById("licenciaForm")
    .addEventListener("submit", function (e) {
      e.preventDefault();
      const btn = document.getElementById("btnCalcular");

      try {
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Calculando...';

        // 1. Obtener Datos
        const rol = rolSelect.value;
        const salario =
          parseFloat(document.getElementById("salarioBase").value) || 0;
        const fProbable = new Date(
          document.getElementById("fechaProbable").value + "T00:00:00",
        );
        const fNacimiento = new Date(
          document.getElementById("fechaNacimiento").value + "T00:00:00",
        );
        const esMultiple = document.getElementById("partoMultiple").checked;
        const esCompartida = checkCompartida.checked;
        const semanasCedidas = esCompartida
          ? parseInt(document.getElementById("semanasCeder").value)
          : 0;

        if (fNacimiento > new Date())
          alert("Nota: Ha ingresado una fecha de nacimiento futura.");

        // 2. Lógica de Días (El Cerebro)
        let diasBase = 0;
        let diasPrematuro = 0;
        let diasMultiple = 0;
        let diasCedidos = 0;
        let tablaHtml = "";

        if (rol === "madre") {
          // MADRE: 18 Semanas Base
          diasBase = 126;
          tablaHtml += `<tr><td>Licencia Estándar (18 semanas)</td><td style="text-align:right;">126</td></tr>`;

          // Prematuro? (FProbable - FNacimiento > 0)
          const diffTime = fProbable - fNacimiento;
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          if (diffDays > 0) {
            diasPrematuro = diffDays;
            tablaHtml += `<tr><td>Adicional por Prematuez</td><td style="text-align:right;">${diasPrematuro}</td></tr>`;
          }

          // Múltiple?
          if (esMultiple) {
            diasMultiple = 14; // 2 semanas
            tablaHtml += `<tr><td>Adicional Parto Múltiple (2 sem)</td><td style="text-align:right;">14</td></tr>`;
          }

          // Compartida? (Resta)
          if (esCompartida) {
            diasCedidos = semanasCedidas * 7;
            tablaHtml += `<tr><td style="color:#c62828;">(-) Cedidos al padre (${semanasCedidas} sem)</td><td style="text-align:right; color:#c62828;">-${diasCedidos}</td></tr>`;
          }
        } else {
          // PADRE: 2 Semanas Base (Ley 2114)
          diasBase = 14;
          tablaHtml += `<tr><td>Licencia Paternidad (2 semanas)</td><td style="text-align:right;">14</td></tr>`;

          // Nota: La ley no suma explícitamente prematuridad al padre igual que a la madre, pero si la madre cede semanas:
          // Aquí asumimos que si el usuario selecciona "Padre", está calculando su licencia propia base.
          // Si quisiera ver las semanas compartidas, debería sumarlas, pero esta calculadora es individual.
        }

        // Total Días
        const totalDias = diasBase + diasPrematuro + diasMultiple - diasCedidos;

        // Fecha Retorno
        const fRetorno = new Date(fNacimiento);
        fRetorno.setDate(fRetorno.getDate() + totalDias);

        // Cálculos Financieros
        const valorDia = salario / 30;
        const valorBruto = valorDia * totalDias;

        // Deducciones (Salud 4% y Pensión 4% sobre el valor de la licencia)
        const dedSalud = valorBruto * 0.04;
        const dedPension = valorBruto * 0.04;
        const neto = valorBruto - dedSalud - dedPension;

        // 3. Renderizar
        document.getElementById("resTipoLicencia").textContent =
          rol === "madre" ? "Maternidad" : "Paternidad";
        document.getElementById("resInicio").textContent =
          fNacimiento.toLocaleDateString();
        document.getElementById("resFin").textContent =
          fRetorno.toLocaleDateString();

        document.getElementById("tablaTiempos").innerHTML = tablaHtml;
        document.getElementById("resTotalDias").textContent = totalDias;

        document.getElementById("resValorBruto").textContent =
          formatoPeso.format(valorBruto);
        document.getElementById("resDedSalud").textContent =
          "-" + formatoPeso.format(dedSalud);
        document.getElementById("resDedPension").textContent =
          "-" + formatoPeso.format(dedPension);
        document.getElementById("totalNeto").textContent =
          formatoPeso.format(neto);

        const results = document.getElementById("resultsContainer");
        results.style.display = "block";
        results.scrollIntoView({ behavior: "smooth" });
      } catch (e) {
        alert(e.message);
      } finally {
        setTimeout(
          () =>
            (btn.innerHTML =
              '<i class="fas fa-calculator"></i> Calcular Licencia'),
          500,
        );
      }
    });

  // Make downloadPDF globally available for the onclick event
  window.downloadPDF = downloadPDF;
});
