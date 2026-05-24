// js/calculadora-indemnizacion-sustitutiva.js

/**
 * Motor de cálculo actuarial para Indemnización Sustitutiva de Vejez (Régimen de Prima Media).
 * Decreto 1730 de 2001.
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

// Helper local para aplicar correcciones automáticas (no muta original)
const _applyAutomaticCorrections = (hist, flag) => {
    if (!flag) return { history: hist.map(r => ({ ...r, corrected: false })), correctedCount: 0 };
    let corrected = 0;
    const cloned = hist.map(r => ({ ...r, corrected: false }));
    cloned.forEach(row => {
        try {
            const s = _parseFlexibleDate(row.desde);
            const e = _parseFlexibleDate(row.hasta);
            if (s && e && _isFullCommercialMonth(s, e)) {
                if ((Number(row.dias) || 0) !== 30) {
                    row.dias = 30;
                    row.corrected = true;
                    corrected++;
                }
            }
        } catch (e) {}
    });
    return { history: cloned, correctedCount: corrected };
};

// Helper local para obtener la tasa de cotización histórica por ley
const _getTasaSafe = (fecha) => {
    const ts = fecha.getTime();
    const _TASAS = [
        { d: new Date(1946, 0, 1).getTime(), h: new Date(1966, 11, 31).getTime(), p: 0.0455 },
        { d: new Date(1967, 0, 1).getTime(), h: new Date(1971, 11, 31).getTime(), p: 0.045 },
        { d: new Date(1972, 0, 1).getTime(), h: new Date(1977, 0, 31).getTime(), p: 0.06755 },
        { d: new Date(1977, 1, 1).getTime(), h: new Date(1982, 1, 28).getTime(), p: 0.09 },
        { d: new Date(1982, 2, 1).getTime(), h: new Date(1985, 8, 30).getTime(), p: 0.1125 },
        { d: new Date(1985, 9, 1).getTime(), h: new Date(1993, 11, 31).getTime(), p: 0.065 },
        { d: new Date(1994, 0, 1).getTime(), h: new Date(1994, 11, 31).getTime(), p: 0.115 },
        { d: new Date(1995, 0, 1).getTime(), h: new Date(1995, 11, 31).getTime(), p: 0.125 },
        { d: new Date(1996, 0, 1).getTime(), h: new Date(2003, 11, 31).getTime(), p: 0.135 },
        { d: new Date(2004, 0, 1).getTime(), h: new Date(2004, 11, 31).getTime(), p: 0.145 },
        { d: new Date(2005, 0, 1).getTime(), h: new Date(2005, 11, 31).getTime(), p: 0.15 },
        { d: new Date(2006, 0, 1).getTime(), h: new Date(2007, 11, 31).getTime(), p: 0.155 },
        { d: new Date(2008, 0, 1).getTime(), h: new Date(2026, 11, 31).getTime(), p: 0.16 }
    ];
    let tp = 0.16;
    for (const r of _TASAS) { 
        if (ts >= r.d && ts <= r.h) { tp = r.p; break; } 
    }
    return tp;
};

/**
 * Realiza la liquidación de la Indemnización Sustitutiva de Vejez.
 */
function calcularIndemnizacionSustitutiva(history, formData, applyCorrections, safeGetIpc) {
    const { history: useHistory, correctedCount } = _applyAutomaticCorrections(history, applyCorrections);

    const mesCierre = formData.mesLiquidacion || 12;
    const anoCierre = formData.anoLiquidacion;
    const ipcFinalKey = `${anoCierre}-${String(mesCierre).padStart(2, '0')}`;
    const ipcFinal = safeGetIpc(ipcFinalKey);
    
    let detailedReport = [];
    const MESES_CORTOS_M = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

    const pre95Records = [];
    const post95Records = [];
    let moraEntries = [];

    useHistory.forEach(row => {
        if (!row.desde || !row.hasta || row.ibc <= 0) return;
        
        const calcDias = row.diasCot != null ? row.diasCot : row.dias;
        const dS = _parseFlexibleDate(row.desde);
        const isPre95 = dS && dS.getFullYear() < 1995;

        if (row.dias < 0 || calcDias <= 0) {
            if (isPre95) {
                moraEntries.push({ ...row, diasCot: Math.abs(row.dias), semanas: Math.abs(row.dias) / 7, ibcHistorico: row.ibc, esMora: true });
                pre95Records.push({ ...row, dias: Math.abs(row.dias), diasCot: Math.abs(row.dias) });
            }
            return;
        }

        if (isPre95) {
            pre95Records.push(row);
        } else {
            post95Records.push(row);
        }
    });

    // PROCESAR PRE-1995
    const coveredPre95Days = new Set();
    pre95Records.forEach(row => {
        const dStart = _parseFlexibleDate(row.desde);
        const dEnd = _parseFlexibleDate(row.hasta);
        if (!dStart || !dEnd || dStart > dEnd) return;
        
        let overlapCount = 0;
        let calendarDaysInPeriod = 0;
        for (let d = new Date(dStart.getTime()); d <= dEnd; d.setDate(d.getDate() + 1)) {
            calendarDaysInPeriod++;
            const dayStr = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
            if (coveredPre95Days.has(dayStr)) {
                overlapCount++;
            } else {
                coveredPre95Days.add(dayStr);
            }
        }

        const rawDias = row.diasCot != null ? row.diasCot : row.dias;
        let effectiveOverlap = overlapCount;
        if (calendarDaysInPeriod > 0 && rawDias < calendarDaysInPeriod) {
            effectiveOverlap = Math.round(overlapCount * (rawDias / calendarDaysInPeriod));
        }
        
        const calcDias = Math.max(0, rawDias - effectiveOverlap);
        const year = dStart.getFullYear();
        const mes = dStart.getMonth() + 1;
        
        const ipcInicialKey = `${year}-${String(mes).padStart(2, '0')}`;
        const ipcInicial = safeGetIpc(ipcInicialKey);
        const ibcIndexadoIA = (ipcInicial && ipcInicial > 0) ? row.ibc * (ipcFinal / ipcInicial) : row.ibc;
        
        const tasaP = _getTasaSafe(dStart);

        detailedReport.push({
            nit: row.nit || '',
            empresa: row.empresa + (effectiveOverlap > 0 ? ` (-${effectiveOverlap}d simultáneos)` : ''),
            mes: `${year}-${String(mes).padStart(2, '0')}`,
            mesNombre: MESES_CORTOS_M[mes - 1] || '',
            ano: year,
            seccion: 'pre1995',
            desde: row.desde,
            hasta: row.hasta,
            dias: row.dias,
            diasCot: calcDias,
            semanas: calcDias / 7,
            ibcHistorico: row.ibc,
            tasaP: tasaP,
            ipcFinalFecha: `${MESES_CORTOS_M[mesCierre - 1]} ${anoCierre}`,
            ipcFinal: ipcFinal,
            ipcInicialFecha: `${MESES_CORTOS_M[mes - 1]} ${year}`,
            ipcInicial: ipcInicial,
            ibcIndexado: ibcIndexadoIA
        });
    });

    // PROCESAR POST-1995
    let expandedMonths = {};
    post95Records.forEach(row => {
        const dStart = _parseFlexibleDate(row.desde);
        const dEnd = _parseFlexibleDate(row.hasta);
        if (!dStart || !dEnd || dStart > dEnd) return;

        let curStart = new Date(dStart.getTime());
        
        while (curStart <= dEnd) {
            let curYear = curStart.getFullYear();
            let curMonth = curStart.getMonth();
            let endOfMonth = new Date(curYear, curMonth + 1, 0); 
            let actEnd = dEnd < endOfMonth ? new Date(dEnd.getTime()) : new Date(endOfMonth.getTime());
            
            if (actEnd >= curStart) {
                const isFullMonthSegment = curStart.getDate() === 1 && 
                    (actEnd.getDate() === new Date(curYear, curMonth + 1, 0).getDate() || actEnd.getDate() >= 30);
                
                let assignedDays;
                if (isFullMonthSegment) {
                    assignedDays = 30;
                } else {
                    const diffTime = Math.abs(actEnd - curStart);
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
                    assignedDays = Math.min(30, diffDays + 1);
                }
                
                let effectiveIbc = row.ibc;
                let monthKey = `${curYear}-${String(curMonth + 1).padStart(2, '0')}`;
                
                if (!expandedMonths[monthKey]) {
                    expandedMonths[monthKey] = {
                        year: curYear,
                        monthKey: monthKey,
                        dias: Math.min(30, assignedDays),
                        sumIbcXDias: effectiveIbc * assignedDays,
                        empresas: [row.empresa],
                        nits: [row.nit || ''],
                        desde: new Date(curStart.getTime()),
                        hasta: new Date(actEnd.getTime())
                    };
                } else {
                    expandedMonths[monthKey].dias = Math.min(30, expandedMonths[monthKey].dias + assignedDays);
                    expandedMonths[monthKey].sumIbcXDias += effectiveIbc * assignedDays;
                    
                    if (actEnd > expandedMonths[monthKey].hasta) expandedMonths[monthKey].hasta = new Date(actEnd.getTime());
                    if (curStart < expandedMonths[monthKey].desde) expandedMonths[monthKey].desde = new Date(curStart.getTime());
                    if (!expandedMonths[monthKey].empresas.includes(row.empresa)) {
                        expandedMonths[monthKey].empresas.push(row.empresa);
                    }
                    const rowNit = row.nit || '';
                    if (rowNit && !expandedMonths[monthKey].nits.includes(rowNit)) {
                        expandedMonths[monthKey].nits.push(rowNit);
                    }
                }
            }
            curStart = new Date(curYear, curMonth + 1, 1); 
        }
    });

    let splitHistoryPost95 = Object.values(expandedMonths);
    splitHistoryPost95.sort((a,b) => a.monthKey.localeCompare(b.monthKey));

    splitHistoryPost95.forEach(seg => {
        const effectiveIbc = seg.sumIbcXDias / seg.dias; 
        const mesSegmento = seg.monthKey.split('-')[1];
        const ipcInicialKey = `${seg.year}-${mesSegmento}`;
        const ipcInicial = safeGetIpc(ipcInicialKey);
        const ibcIndexadoIA = (ipcInicial && ipcInicial > 0) ? effectiveIbc * (ipcFinal / ipcInicial) : effectiveIbc;
        
        const fechaSegmento = new Date(seg.year, parseInt(mesSegmento) - 1, 1);
        const tasaP = _getTasaSafe(fechaSegmento);
        
        const mesNum = parseInt(mesSegmento);
        const mesNombre = MESES_CORTOS_M[mesNum - 1];
        const primerDia = new Date(seg.year, mesNum - 1, 1);
        const ultimoDia = new Date(seg.year, mesNum, 0); 
        const fmtDate = (d) => `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
        
        detailedReport.push({
            nit: (seg.nits || []).join(' + '),
            empresa: seg.empresas.join(' + '),
            mes: seg.monthKey,
            mesNombre: mesNombre,
            ano: seg.year,
            seccion: 'post1995',
            desde: fmtDate(primerDia),
            hasta: fmtDate(ultimoDia),
            dias: seg.dias,
            diasCot: seg.dias,
            semanas: seg.dias / 7,
            ibcHistorico: effectiveIbc, 
            tasaP: tasaP,
            ipcFinalFecha: `${MESES_CORTOS_M[mesCierre - 1]} ${anoCierre}`,
            ipcFinal: ipcFinal,
            ipcInicialFecha: `${mesNombre} ${seg.year}`,
            ipcInicial: ipcInicial,
            ibcIndexado: ibcIndexadoIA
        });
    });

    moraEntries.forEach(me => {
        const dS = _parseFlexibleDate(me.desde);
        const mesNum = dS ? dS.getMonth() + 1 : 1;
        const yearS = dS ? dS.getFullYear() : 1990;
        detailedReport.push({
            nit: me.nit, empresa: me.empresa, mes: `${yearS}-${String(mesNum).padStart(2,'0')}`, mesNombre: MESES_CORTOS_M[mesNum-1], ano: yearS,
            seccion: 'pre1995', desde: me.desde, hasta: me.hasta, dias: me.dias, diasCot: 0, semanas: me.semanas,
            ibcHistorico: me.ibcHistorico, tasaP: 0, ipcFinalFecha: '', ipcFinal: 0, ipcInicialFecha: '', ipcInicial: 0, ibcIndexado: 0, esMora: true
        });
    });

    detailedReport.sort((a, b) => {
        const aDate = _parseFlexibleDate(a.desde);
        const bDate = _parseFlexibleDate(b.desde);
        return (aDate || new Date(0)) - (bDate || new Date(0));
    });

    let SCTotal = 0;
    detailedReport.forEach(p => {
        if (p.esMora) return;
        if (p.semanas > 0) {
            SCTotal += p.semanas;
        }
    });

    if (SCTotal <= 0) throw new Error("No hay semanas computables para realizar la liquidación.");

    let sumatoriaMasaTasa = 0;
    let sumatoriaMasaSalarial = 0;

    detailedReport.forEach(p => {
        if (p.esMora) return;
        if (p.semanas > 0) {
            const masaTasa = p.tasaP * p.semanas;
            sumatoriaMasaTasa += masaTasa;
            
            const masaSalarial = p.ibcIndexado * p.semanas;
            sumatoriaMasaSalarial += masaSalarial;
        }
    });

    const PPC = sumatoriaMasaTasa / SCTotal;
    const promedioMensualPresente = sumatoriaMasaSalarial / SCTotal;
    const SBC = promedioMensualPresente * (7 / 30);

    // Sum of "No. Días" (p.dias) before and after 1995:
    let totalGeneralDias = 0;
    detailedReport.forEach(p => {
        if (p.esMora) return;
        totalGeneralDias += p.dias;
    });
    const semanasGeneral = totalGeneralDias / 7;
    const ISP = SBC * semanasGeneral * PPC;

    return { 
        totalDias: totalGeneralDias,
        semanas: semanasGeneral,
        SC: semanasGeneral,
        PPC: PPC,
        SBC: SBC,
        ingresoMensualPromedio: promedioMensualPresente,
        indemnizacion: ISP,
        detailedReport,
        sumAportes: ISP
    };
}
