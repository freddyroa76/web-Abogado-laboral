// CONTROL DE VISIBILIDAD DEL INPUT AUXILIO
const checkAuxilio = document.getElementById("checkAuxilio");
const boxValorAuxilio = document.getElementById("boxValorAuxilio");

if (checkAuxilio) {
  checkAuxilio.addEventListener("change", function () {
    if (this.checked) {
      boxValorAuxilio.style.display = "block";
    } else {
      boxValorAuxilio.style.display = "none";
      document.getElementById("valorAuxilioInput").value = ""; // Limpiar si se desmarca
    }
  });
}

// Función para formato moneda
const formatoPesoCesantias = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

// CALCULAR DÍAS (Lógica 360 - Contable Laboral Colombiana)
function calcularDias360(fechaInicio, fechaFin) {
  let inicio = new Date(fechaInicio);
  let fin = new Date(fechaFin);

  // Ajuste Zona Horaria
  inicio.setMinutes(inicio.getMinutes() + inicio.getTimezoneOffset());
  fin.setMinutes(fin.getMinutes() + fin.getTimezoneOffset());

  if (fin < inicio) return 0;

  let day1 = inicio.getDate();
  let month1 = inicio.getMonth() + 1;
  let year1 = inicio.getFullYear();

  let day2 = fin.getDate();
  let month2 = fin.getMonth() + 1;
  let year2 = fin.getFullYear();

  // Ajuste 360: Si el día es 31, se cuenta como 30
  if (day1 === 31) day1 = 30;
  if (day2 === 31) day2 = 30;

  let dias = (year2 - year1) * 360 + (month2 - month1) * 30 + (day2 - day1) + 1; // +1 inclusivo

  return dias;
}

// CALCULAR TODO AL ENVIAR
const formCesantias = document.getElementById("cesantiasForm");
if (formCesantias) {
  formCesantias.addEventListener("submit", function (e) {
    e.preventDefault(); // DETIENE EL REFRESCO DE LA PÁGINA

    // 1. OBTENER VALORES
    let salario = parseFloat(document.getElementById("salario").value) || 0;
    let otros = parseFloat(document.getElementById("otrosIngresos").value) || 0;
    let fechaInicio = document.getElementById("fechaInicio").value;
    let fechaFin = document.getElementById("fechaFin").value;

    // Lógica del Auxilio Manual
    let incluyeAuxilio = checkAuxilio.checked;
    let valorAuxilioDigitado = 0;

    if (incluyeAuxilio) {
      // Si el usuario marcó el check, tomamos el valor que escribió. Si lo dejó vacío, es 0.
      valorAuxilioDigitado =
        parseFloat(document.getElementById("valorAuxilioInput").value) || 0;
    }

    // Validaciones
    if (!fechaInicio || !fechaFin) {
      alert("Por favor ingrese las fechas.");
      return;
    }

    // 2. CÁLCULOS
    let diasTrabajados = calcularDias360(fechaInicio, fechaFin);

    // Base = Salario + Otros + Auxilio (si el usuario lo indicó)
    let baseLiquidacion = salario + otros + valorAuxilioDigitado;

    // Ecuaciones de Ley
    let cesantias = (baseLiquidacion * diasTrabajados) / 360;
    let intereses = (cesantias * diasTrabajados * 0.12) / 360;
    let total = cesantias + intereses;

    // 3. MOSTRAR RESULTADOS
    document.getElementById("resSalario").textContent =
      formatoPesoCesantias.format(salario + otros);
    document.getElementById("resAuxilio").textContent =
      formatoPesoCesantias.format(valorAuxilioDigitado);
    document.getElementById("resDias").textContent = diasTrabajados + " días";
    document.getElementById("periodoTexto").textContent =
      "Periodo: " + fechaInicio + " a " + fechaFin;

    document.getElementById("valCesantias").textContent =
      formatoPesoCesantias.format(cesantias);
    document.getElementById("valIntereses").textContent =
      formatoPesoCesantias.format(intereses);
    document.getElementById("valTotal").textContent =
      formatoPesoCesantias.format(total);

    // 4. MOSTRAR TARJETA (ANIMACIÓN)
    let resultCard = document.getElementById("resultCard");
    resultCard.style.display = "block";
    resultCard.scrollIntoView({ behavior: "smooth" });
  });
}
