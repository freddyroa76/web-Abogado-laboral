// js/calculadora-pension-vejez.js

/**
 * Motor de cálculo actuarial para Pensión de Vejez (Régimen de Prima Media).
 * Ley 100 de 1993, Ley 797 de 2003 y Jurisprudencia Corte Suprema de Justicia.
 */

// Helper local para parsear fechas
const _parseFlexibleDate = (val) => {
    if (!val) return null;
    const str = String(val).trim();
    const parts = str.split(/[\/\-]/);
    if (parts.length === 3) {
        if (parts[2].length === 4) return new Date(parts[2], parts[1]-1, parts[0]);
        else if (parts[0].length === 4) return new Date(parts[0], parts[1]-1, parts[2]);
    }
    return new Date(str);
};

// Helper local para días comerciales (360)
const _getDiasComerciales = (fechaInicio, fechaFin) => {
    let d1 = fechaInicio.getDate();
    let m1 = fechaInicio.getMonth();
    let y1 = fechaInicio.getFullYear();
    let d2 = fechaFin.getDate();
    let m2 = fechaFin.getMonth();
    let y2 = fechaFin.getFullYear();
    
    if (d1 === 31) d1 = 30;
    if (d2 === 31) d2 = 30;
    
    const esFinFebrero1 = (m1 === 1) && (d1 === 28 || d1 === 29);
    const esFinFebrero2 = (m2 === 1) && (d2 === 28 || d2 === 29);
    if (esFinFebrero1) d1 = 30;
    if (esFinFebrero2) d2 = 30;
    
    return ((y2 - y1) * 360) + ((m2 - m1) * 30) + (d2 - d1) + 1;
};

// Helper local para determinar mes comercial completo
const _isFullCommercialMonth = (start, end) => {
    if (!start || !end) return false;
    if (start.getFullYear() !== end.getFullYear() || start.getMonth() !== end.getMonth()) return false;
    const dias = _getDiasComerciales(start, end);
    return dias >= 30 && start.getDate() <= 3;
};

/**
 * Ejecuta la estimación de pensión de vejez a partir del historial laboral de Colpensiones.
 */
function calcularPensionVejez(history, formData, applyCorrections, safeGetIpc, totalSemanasPDF) {
    const doIBLCalculation = (isTodaVida = false) => {
        let targetFinalYear = formData.anoLiquidacion;
        const ipcFinalKey = `${targetFinalYear - 1}-12`;
        let ipcFinal = safeGetIpc(ipcFinalKey);
        
        let monthlyAggregation = {};
        history.forEach((row) => {
            if (!row.desde || !row.hasta || row.ibc <= 0) return;
            const dStart = _parseFlexibleDate(row.desde);
            const dEnd = _parseFlexibleDate(row.hasta);
            if (!dStart || !dEnd || dStart > dEnd) return;

            let curStart = new Date(dStart.getTime());
            while (curStart <= dEnd) {
                let curYear = curStart.getFullYear();
                let curMonth = curStart.getMonth();
                let endOfMonth = new Date(curYear, curMonth + 1, 0);
                let actEnd = dEnd < endOfMonth ? new Date(dEnd.getTime()) : new Date(endOfMonth.getTime());

                const mKey = `${curYear}-${String(curMonth + 1).padStart(2, '0')}`;
                if (!monthlyAggregation[mKey]) {
                    monthlyAggregation[mKey] = {
                        year: curYear,
                        month: curMonth + 1,
                        dayIbcMap: {},
                        empresas: new Set()
                    };
                }

                let actualStart = curStart.getDate();
                let actualEnd = actEnd.getDate();
                if (actualStart === 31) actualStart = 30;
                if (actualEnd === 31) actualEnd = 30;
                const isFebEnd = (curMonth === 1) && (actualEnd === 28 || actualEnd === 29);
                if (isFebEnd) actualEnd = 30;

                const periodStart = new Date(curStart.getTime());
                const periodEnd = new Date(actEnd.getTime());
                const applyCorrFullMonth = applyCorrections && _isFullCommercialMonth(periodStart, periodEnd);

                let dayFrom = actualStart;
                let dayTo = actualEnd;
                if (applyCorrFullMonth) { dayFrom = 1; dayTo = 30; }

                for (let d = dayFrom; d <= dayTo; d++) {
                    const existing = monthlyAggregation[mKey].dayIbcMap[d] || 0;
                    monthlyAggregation[mKey].dayIbcMap[d] = Math.max(existing, row.ibc);
                }

                monthlyAggregation[mKey].empresas.add(row.empresa);
                curStart = new Date(curYear, curMonth + 1, 1);
            }
        });

        let aggregatedMonthsData = Object.keys(monthlyAggregation).map(k => monthlyAggregation[k]);
        aggregatedMonthsData.sort((a, b) => {
            if (a.year !== b.year) return b.year - a.year;
            return b.month - a.month;
        });
        
        let targetDays = isTodaVida ? Infinity : 3600;
        let remainingDays = targetDays; 
        let sumIaXDias = 0; 
        let consumedDays = 0;
        let detailedReport = []; 
        
        for (const seg of aggregatedMonthsData) {
            if (remainingDays <= 0) break;
            
            const dayKeys = seg.dayIbcMap ? Object.keys(seg.dayIbcMap).map(x => parseInt(x, 10)) : [];
            const realActiveDaysInMonth = Math.min(dayKeys.length, 30);
            if (realActiveDaysInMonth === 0) continue;

            const daysToTake = Math.min(realActiveDaysInMonth, remainingDays);
            const monthlyIBCContributionSum = dayKeys.reduce((s, d) => s + (seg.dayIbcMap[d] || 0), 0);
            const combinedAveragedMonthlyRate = monthlyIBCContributionSum / realActiveDaysInMonth;

            const monthStr = String(seg.month).padStart(2, '0');
            
            const ipcInicialKey = `${seg.year - 1}-12`;
            const ipcInicial = safeGetIpc(ipcInicialKey) || 1; 
            
            const factorIndexacion = ipcFinal / ipcInicial;
            const ibcIndexadoIA = combinedAveragedMonthlyRate * factorIndexacion;
            const iaXDias = ibcIndexadoIA * daysToTake; 
            
            detailedReport.push({
                empresa: Array.from(seg.empresas).join(' | '),
                desde: `01/${monthStr}/${seg.year}`,
                hasta: `30/${monthStr}/${seg.year}`,
                dias: daysToTake,
                fechaIpcFinal: `Dic. ${targetFinalYear - 1}`,
                ipcFinal: ipcFinal,
                fechaIpcInicial: `Dic. ${seg.year - 1}`,
                ipcInicial: ipcInicial,
                ibcHistorico: combinedAveragedMonthlyRate, 
                ibcIndexado: ibcIndexadoIA, 
                iaXDias: iaXDias 
            });

            sumIaXDias += iaXDias;
            remainingDays -= daysToTake;
            consumedDays += daysToTake;
        }

        const ibl = consumedDays > 0 ? sumIaXDias / consumedDays : 0;
        return { ibl, consumedDays, sumIaXDias, detailedReport, isTodaVida };
    };

    if (!formData.edad || formData.edad <= 0) {
        throw new Error("Por rigor legal, digite la Edad del afiliado y vuelva al Paso 2 para liquidar.");
    }

    const calc10Years = doIBLCalculation(false);
    const calcTodaVida = doIBLCalculation(true);

    const totalSem = (totalSemanasPDF !== undefined && totalSemanasPDF !== null && totalSemanasPDF > 0) ? totalSemanasPDF : (calcTodaVida.consumedDays / 7);
    const ageInYears = parseFloat(formData.edad) || 0;
    const requiredAge = formData.genero === 'F' ? 57 : 62;
    const isVerification = totalSem >= 1300 && ageInYears >= requiredAge;

    let bestCalc = calc10Years;
    let bestName = "Los Últimos 10 Años (3.600 Días)";
    
    if (calcTodaVida.ibl > calc10Years.ibl) {
        bestCalc = calcTodaVida;
        bestName = "Toda la Vida (Art. 21 Ley 100)";
    }

    const smlvs = bestCalc.ibl / formData.smlv;
    let tasaBase = 65.5 - (0.5 * smlvs);
    if (tasaBase < 55) tasaBase = 55.00;

    const getRes = (aplicarTopeColpensiones) => {
        let semExtra = Math.max(0, totalSem - 1300);
        if (aplicarTopeColpensiones) semExtra = Math.min(semExtra, 500); 
        const grupos = Math.floor(semExtra / 50);
        let tasaFinal = tasaBase + (grupos * 1.5);
        if (tasaFinal > 80.00) tasaFinal = 80.00; 
        
        const mesadaCalculada = Math.round(bestCalc.ibl * (tasaFinal / 100));
        const mesadaFinal = Math.max(formData.smlv, Math.min(mesadaCalculada, formData.smlv * 25)); 
        
        let porcentajeSalud = 12;
        if (mesadaFinal <= formData.smlv) {
            porcentajeSalud = 4;
        } else if (mesadaFinal > formData.smlv && mesadaFinal <= (formData.smlv * 3)) {
            porcentajeSalud = 10;
        }
        const descuentoSalud = Math.round(mesadaFinal * (porcentajeSalud / 100));
        const mesadaNeta = mesadaFinal - descuentoSalud;

        return { rate: tasaFinal / 100, extra: semExtra, grupos, mesada: mesadaFinal, porcentajeSalud, descuentoSalud, mesadaNeta };
    };

    const vA = getRes(true); 
    const vB = getRes(false); 
    
    return {
        ibl: bestCalc.ibl,
        bestName: bestName,
        totalSem: totalSem,
        tasaBase: tasaBase,
        detailedReport: bestCalc.detailedReport,
        detailedReport10Years: calc10Years.detailedReport,
        detailedReportTodaVida: calcTodaVida.detailedReport,
        calc10Years: calc10Years,
        calcTodaVida: calcTodaVida,
        sumIaXDias: bestCalc.sumIaXDias,
        diasComputadosTotales: bestCalc.consumedDays,
        vA: vA,
        vB: vB,
        isVerification: isVerification
    };
}
