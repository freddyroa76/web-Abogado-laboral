// js/indemnizacion-sustitutiva-rates.js
// Tasas de reemplazo y factores para cálculo de Indemnización Sustitutiva (Decreto 1730/2001)

// Factor de conversión de semanas a meses (30 días = 1 mes, 7 días = 1 semana)
const SEMANAS_A_MESES_FACTOR = 4.285714285714286; // 30/7

// Obtener la tasa de cotización (P) basada en el año según la normativa vigente
function getTasaP(year) {
    if (year <= 1984) return 0.045;   // 4.5%
    if (year <= 1991) return 0.065;   // 6.5%
    if (year <= 1994) return 0.08;    // 8.0%
    if (year === 1995) return 0.09;   // 9.0%
    if (year <= 2002) return 0.10;    // 10.0%
    if (year === 2003) return 0.105;  // 10.5%
    if (year === 2004) return 0.115;  // 11.5%
    if (year === 2005) return 0.12;   // 12.0%
    if (year <= 2007) return 0.125;   // 12.5%
    return 0.13;                      // 13.0% (2008 en adelante)
}

// Calcular el Salario Base de Liquidación (SBC)
// SBC = (Sumatoria de (IBC mensual indexado × días)) / Total días
function calcularSBC(sumIaXDias, totalDias) {
    return totalDias > 0 ? sumIaXDias / totalDias : 0;
}

// Calcular las semanas a pagar (S) a partir de los días
// S = Total días / 7 (días por semana)
function calcularSemanasPagar(totalDias) {
    return totalDias / 7;
}

// Calcular el factor de conversión de semanas a meses para la fórmula
// En la indemnización sustitutiva: I = SBC × (S / 4.2857) × P
function obtenerFactorSemanaAMes() {
    return SEMANAS_A_MESES_FACTOR;
}

// Calcular la indemnización sustitutiva
// I = SBC × (Semanas / 4.2857) × P
function calcularIndemnizacion(sbcMensual, totalSemanas, tasaP) {
    if (sbcMensual <= 0 || totalSemanas <= 0 || tasaP <= 0) return 0;
    return sbcMensual * (totalSemanas / SEMANAS_A_MESES_FACTOR) * tasaP;
}

// Obtener descripción de la tasa según el rango
function getDescripcionTasaP(tasaP) {
    const porcentaje = tasaP * 100;
    if (porcentaje === 4.5) return "4.5% (Antes de 1985)";
    if (porcentaje === 6.5) return "6.5% (1985-1991)";
    if (porcentaje === 8.0) return "8.0% (1992-1994)";
    if (porcentaje === 9.0) return "9.0% (1995)";
    if (porcentaje === 10.0) return "10.0% (1996-2002)";
    if (porcentaje === 10.5) return "10.5% (2003)";
    if (porcentaje === 11.5) return "11.5% (2004)";
    if (porcentaje === 12.0) return "12.0% (2005)";
    if (porcentaje === 12.5) return "12.5% (2006-2007)";
    if (porcentaje === 13.0) return "13.0% (2008 en adelante)";
    return `${porcentaje}%`;
}