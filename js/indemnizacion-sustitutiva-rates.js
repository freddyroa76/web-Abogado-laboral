// js/indemnizacion-sustitutiva-rates.js
// ============================================================================
// Motor Actuarial — Indemnización Sustitutiva de Vejez (RPM)
// Fórmula oficial: ISP = SBC × SC × PPC
// Base Legal: Decreto 1730/2001 (Art. 3), Ley 100/1993 (Art. 20), Ley 797/2003
// ============================================================================

// ─────────────────────────────────────────────────────────────────────────────
// 1. MATRIZ HISTÓRICA DE TASAS DE COTIZACIÓN TOTAL A PENSIÓN
//    Fuente: Hoja técnica de rangos continuos del usuario (Excel de referencia).
//    Incluye vejez + administración + seguros (cotización TOTAL).
// ─────────────────────────────────────────────────────────────────────────────
const TASAS_HISTORICAS = [
  { desde: '1946-01-01', hasta: '1966-12-31', porcentaje: 0.0455 },
  { desde: '1967-01-01', hasta: '1971-12-31', porcentaje: 0.045  },
  { desde: '1972-01-01', hasta: '1977-01-31', porcentaje: 0.0676 },
  { desde: '1977-02-01', hasta: '1982-02-28', porcentaje: 0.09   },
  { desde: '1982-03-01', hasta: '1985-09-30', porcentaje: 0.1125 },
  { desde: '1985-10-01', hasta: '1993-12-31', porcentaje: 0.065  },
  { desde: '1994-01-01', hasta: '1994-12-31', porcentaje: 0.115  },
  { desde: '1995-01-01', hasta: '1995-12-31', porcentaje: 0.125  },
  { desde: '1996-01-01', hasta: '2003-12-31', porcentaje: 0.135  },
  { desde: '2004-01-01', hasta: '2004-12-31', porcentaje: 0.145  },
  { desde: '2005-01-01', hasta: '2005-12-31', porcentaje: 0.15   },
  { desde: '2006-01-01', hasta: '2007-12-31', porcentaje: 0.155  },
  { desde: '2008-01-01', hasta: '2026-12-31', porcentaje: 0.16   }
];

// Cache interno: convierte las cadenas ISO a timestamps una sola vez
const _tasasCache = TASAS_HISTORICAS.map(t => ({
  desde: new Date(t.desde + 'T00:00:00').getTime(),
  hasta: new Date(t.hasta + 'T00:00:00').getTime(),
  porcentaje: t.porcentaje
}));

/**
 * Busca en la matriz histórica el porcentaje de cotización que aplica
 * a una fecha determinada.
 *
 * @param {Date|string} fecha - Fecha a evaluar (objeto Date o string ISO/dd-mm-yyyy).
 * @returns {number} Porcentaje de cotización (ej: 0.16 para 16%).
 */
function getTasaCotizacion(fecha) {
  // Normalizar entrada a timestamp
  let ts;
  if (fecha instanceof Date) {
    ts = fecha.getTime();
  } else {
    // Aceptar tanto 'YYYY-MM-DD' como 'DD/MM/YYYY'
    const str = String(fecha).trim();
    const parts = str.split(/[\/\-]/);
    if (parts.length === 3 && parts[2].length === 4) {
      // DD/MM/YYYY o DD-MM-YYYY
      ts = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0])).getTime();
    } else {
      ts = new Date(str).getTime();
    }
  }

  // Búsqueda lineal en la matriz (solo 13 elementos)
  for (const rango of _tasasCache) {
    if (ts >= rango.desde && ts <= rango.hasta) {
      return rango.porcentaje;
    }
  }

  // Fallback: si la fecha cae fuera de rango, usar el último conocido (16%)
  return 0.16;
}

/**
 * Compatibilidad con código legado: wrapper que recibe un año y busca
 * la tasa correspondiente al 1 de julio de ese año (punto medio).
 *
 * @param {number} year - Año calendario (ej: 2005).
 * @returns {number} Porcentaje de cotización.
 */
function getTasaP(year) {
  return getTasaCotizacion(new Date(year, 6, 1)); // 1 de julio
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. INDEXACIÓN DEL IBC
//    IBC_Indexado = Salario_Base × (IPC_Final / IPC_Inicial)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calcula el IBC Indexado para un periodo dado.
 *
 * @param {number} ibcHistorico - Salario base de cotización del periodo.
 * @param {number} ipcFinal     - Valor del IPC al cierre de la liquidación.
 * @param {number} ipcInicial   - Valor del IPC del periodo cotizado.
 * @returns {number} IBC ajustado por indexación.
 */
function calcularIBCIndexado(ibcHistorico, ipcFinal, ipcInicial) {
  if (!ipcInicial || ipcInicial === 0) return ibcHistorico;
  return ibcHistorico * (ipcFinal / ipcInicial);
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. CÁLCULO DE LAS 3 VARIABLES GLOBALES Y LA ISP FINAL
//    ISP = SBC × SC × PPC
//
//    SC  = Σ(días_i) / 7             → Semanas Cotizadas totales
//    PPC = Σ(P_i × días_i) / Σ(días_i) → Porcentaje Ponderado de Cotización
//    SBC: Ingreso Mensual Promedio = Σ(IBC_Indexado_i × días_i) / totalDías
//         SBC = Ingreso Mensual Promedio × (7/30)
//         Decreto 1730/2001 Art. 6
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Motor principal de cálculo. Recibe el detalle mensualizado de periodos
 * (ya expandidos y agrupados por mes) y produce las 3 variables globales
 * más el resultado final ISP.
 *
 * @param {Array<Object>} periodosMensuales - Array de objetos con:
 *   - dias         {number}  Días cotizados en el periodo (max 30)
 *   - ibcIndexado  {number}  IBC ya indexado (Salario × IPC_Final/IPC_Inicial)
 *   - tasaP        {number}  Tasa de cotización del periodo (ej: 0.16)
 *   - empresa      {string}  Nombre(s) del aportante (para trazabilidad)
 *   - mes          {string}  Clave del mes 'YYYY-MM'
 *   - ibcHistorico {number}  IBC sin indexar (para reportes)
 *   - ipcFinal     {number}  IPC de cierre
 *   - ipcInicial   {number}  IPC del periodo
 *
 * @returns {Object} Resultado con:
 *   - SC              {number}  Semanas Cotizadas
 *   - PPC             {number}  Porcentaje Ponderado de Cotización
 *   - SBC             {number}  Salario Base de Cotización Semanal
 *   - ISP             {number}  Indemnización Sustitutiva de Pensión
 *   - totalDias       {number}  Total de días computados
 *   - sumIBCIndexados {number}  Suma de IBCs indexados (diagnóstico)
 */
function calcularVariablesGlobalesISP(periodosMensuales) {
  if (!periodosMensuales || periodosMensuales.length === 0) {
    return { SC: 0, PPC: 0, SBC: 0, ISP: 0, totalDias: 0, sumIBCIndexados: 0 };
  }

  let totalDias = 0;              // Σ(días_i)
  let sumPxDias = 0;              // Σ(P_i × días_i)   — para PPC
  let sumIBCIndexados = 0;        // Σ(IBC_Indexado_i)  — para SBC
  const N = periodosMensuales.length; // Número de meses con aportes

  periodosMensuales.forEach(p => {
    const dias = Number(p.dias) || 0;
    const tasaP = Number(p.tasaP) || 0;
    const ibcIdx = Number(p.ibcIndexado) || 0;

    totalDias += dias;
    sumPxDias += tasaP * dias;
    sumIBCIndexados += ibcIdx;
  });

  // SC: Semanas Cotizadas = Total días / 7
  const SC = totalDias / 7;

  // PPC: Porcentaje Ponderado de Cotización = Σ(P_i × días_i) / Σ(días_i)
  const PPC = totalDias > 0 ? (sumPxDias / totalDias) : 0;

  // SBC: Salario Base de Cotización Semanal (Ponderado)
  //   Ingreso Mensual Promedio = Σ(IBC_Indexado_i × días_i) / totalDías
  //   SBC = Ingreso Mensual Promedio × (7/30)
  //   Decreto 1730/2001 Art. 6
  let sumIBCxDias = 0;
  periodosMensuales.forEach(p => {
    sumIBCxDias += (Number(p.ibcIndexado) || 0) * (Number(p.dias) || 0);
  });
  const ingresoMensualPromedio = totalDias > 0 ? (sumIBCxDias / totalDias) : 0;
  const SBC = ingresoMensualPromedio * (7 / 30);

  // ISP Final = SBC × SC × PPC
  const ISP = SBC * SC * PPC;

  return {
    SC,
    PPC,
    SBC,
    ISP,
    totalDias,
    sumIBCIndexados
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. FUNCIONES AUXILIARES (compatibilidad con el frontend existente)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calcular semanas a pagar (S) a partir de los días.
 * S = Total días / 7
 *
 * @param {number} totalDias - Total de días cotizados.
 * @returns {number} Semanas cotizadas.
 */
function calcularSemanasPagar(totalDias) {
  return totalDias / 7;
}

/**
 * Wrapper de compatibilidad. Anteriormente sumaba aportes indexados;
 * ahora delega al motor ISP = SBC × SC × PPC.
 *
 * @param {Array<Object>} periodosMensuales - Periodos con ibcIndexado, dias, tasaP.
 * @returns {number} Valor de la Indemnización Sustitutiva.
 */
function calcularIndemnizacion(periodosMensuales) {
  if (!periodosMensuales || periodosMensuales.length === 0) return 0;
  const resultado = calcularVariablesGlobalesISP(periodosMensuales);
  return resultado.ISP;
}

/**
 * Descripción textual de una tasa para reportes PDF/Excel.
 *
 * @param {number} tasaP - Tasa decimal (ej: 0.16).
 * @returns {string} Descripción legible.
 */
function getDescripcionTasaP(tasaP) {
  // Buscar en la matriz histórica cuál rango coincide con este porcentaje
  for (const rango of TASAS_HISTORICAS) {
    if (Math.abs(rango.porcentaje - tasaP) < 0.0001) {
      const porcentaje = (rango.porcentaje * 100).toFixed(2).replace(/\.?0+$/, '');
      return `${porcentaje}% (${rango.desde.substring(0, 4)}-${rango.hasta.substring(0, 4)})`;
    }
  }
  return `${(tasaP * 100).toFixed(2)}%`;
}