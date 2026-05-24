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
    let tp = 0.16;
    const tasas = typeof TASAS_COTIZACION_HISTORICA !== 'undefined' ? TASAS_COTIZACION_HISTORICA : [];
    for (const r of tasas) { 
        if (ts >= r.d && ts <= r.h) { tp = r.p; break; } 
    }
    return tp;
};

/**
 * Realiza la liquidación de la Indemnización Sustitutiva de Vejez.
 */
function calcularIndemnizacionSustitutiva(history, resumenSemanas, formData, applyCorrections, safeGetIpc) {
    const mesCierre = formData.mesLiquidacion || 12;
    const anoCierre = formData.anoLiquidacion;
    const ipcFinalKey = `${anoCierre}-${String(mesCierre).padStart(2, '0')}`;
    const ipcFinal = safeGetIpc(ipcFinalKey);

    const MESES_CORTOS_M = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

    // 1. GENERAR SEGMENTACIÓN MENSUAL (Hoja "Verificación y Segmentación")
    const getCalendarDays = (start, end) => {
        return Math.floor((Date.UTC(end.getFullYear(), end.getMonth(), end.getDate()) - Date.UTC(start.getFullYear(), start.getMonth(), start.getDate())) / (1000 * 60 * 60 * 24)) + 1;
    };

    let segmentedRows = [];

    resumenSemanas.forEach((row, sortIndex) => {
        let dStart = _parseFlexibleDate(row.desde);
        let dEnd = _parseFlexibleDate(row.hasta);
        if (!dStart || !dEnd) return;

        let totalCalDays = getCalendarDays(dStart, dEnd);
        
        // Si el check está activo y el periodo total es de un mes o menos (<= 31 días),
        // aplicamos directamente (semanas * 7) redondeado a entero.
        if (applyCorrections && totalCalDays <= 31) {
            let targetSemanas = Number(row.semanas) || 0;
            let calcDias = Math.round(targetSemanas * 7);
            let calcSemanas = targetSemanas;
            
            segmentedRows.push({
                sortIndex: sortIndex, 
                nit: row.nit || '', 
                empresa: row.empresa, 
                desde: new Date(dStart.getTime()), 
                hasta: new Date(dEnd.getTime()),
                ibc: row.ibc, 
                calcDias: calcDias, 
                calcSemanas: calcSemanas,
                observacion: targetSemanas === 0 ? 'Ajuste exacto a 0 (PDF)' : 'Ajuste exacto a 1 mes (PDF)'
            });
            return;
        }

        let current = new Date(dStart.getTime());
        let rowSegments = [];
        
        // 1. Cálculo Inicial Matemático puro (según periodo de Resumen de Semanas)
        while (current <= dEnd) {
            let curYear = current.getFullYear();
            let curMonth = current.getMonth();
            let endOfMonth = new Date(curYear, curMonth + 1, 0);
            let actEnd = dEnd < endOfMonth ? new Date(dEnd.getTime()) : new Date(endOfMonth.getTime());
            
            let calcDias = 0;
            if (curYear < 1995) {
                calcDias = getCalendarDays(current, actEnd);
            } else {
                calcDias = _getDiasComerciales(current, actEnd);
            }

            rowSegments.push({
                sortIndex: sortIndex, 
                nit: row.nit || '', 
                empresa: row.empresa, 
                desde: new Date(current.getTime()), 
                hasta: new Date(actEnd.getTime()),
                ibc: row.ibc, 
                calcDias: calcDias, 
                calcSemanas: Number((calcDias / 7).toFixed(4)),
                observacion: ''
            });
            
            current = new Date(curYear, curMonth + 1, 1);
        }

        // 2. Validación de Desvío
        if (rowSegments.length > 0) {
            let targetSemanas = Number(row.semanas) || 0;
            let mathTotalDias = rowSegments.reduce((sum, seg) => sum + seg.calcDias, 0);
            let mathTotalSemanas = mathTotalDias / 7;
            let diffSemanas = Math.abs(mathTotalSemanas - targetSemanas);
            
            let needsCorrection = false;
            let obsText = '';
            
            if (applyCorrections) {
                needsCorrection = targetSemanas === 0 || diffSemanas > 0.145; // > 0.14 semanas
                obsText = targetSemanas === 0 ? 'Ajuste exacto a 0 (PDF)' : 'Ajuste proporcional al PDF';
            } else {
                if (targetSemanas < mathTotalSemanas && diffSemanas > 0.01) {
                    needsCorrection = true;
                    obsText = targetSemanas === 0 ? 'Tope a 0 (Según PDF)' : 'Tope aplicado según Resumen (PDF)';
                }
            }

            if (needsCorrection) {
                if (targetSemanas === 0) {
                    rowSegments.forEach(seg => {
                        seg.calcDias = 0;
                        seg.calcSemanas = 0;
                        seg.observacion = obsText;
                    });
                } else if (rowSegments.length === 1) {
                    // 3. REGLA: Si el ítem a desglosar está dentro de UN MISMO MES CALENDARIO
                    // se aplican directamente las semanas de "Resumen de Semanas"
                    rowSegments[0].calcDias = Math.round(targetSemanas * 7);
                    rowSegments[0].calcSemanas = targetSemanas;
                    rowSegments[0].observacion = 'Ajuste directo según Resumen (Mes único)';
                } else {
                    // 4. REGLA: Si el desvío corresponde a periodos MAYORES A UN MES
                    // buscar el detalle para corregir con esos datos
                    let anyDetailFound = false;
                    
                    rowSegments.forEach(seg => {
                        let segYear = seg.desde.getFullYear();
                        let segMonth = seg.desde.getMonth();
                        
                        let exactMonthHistory = history.filter(h => {
                            let matchEmpresa = false;
                            if (row.nit && h.nit && row.nit.trim() === h.nit.trim()) {
                                matchEmpresa = true;
                            } else if (row.empresa && h.empresa) {
                                let rEmp = row.empresa.trim().toUpperCase();
                                let hEmp = h.empresa.trim().toUpperCase();
                                if (rEmp === hEmp || rEmp.includes(hEmp) || hEmp.includes(rEmp)) {
                                    matchEmpresa = true;
                                }
                            }
                            if (!matchEmpresa) return false;
                            
                            if (segYear < 1995) {
                                let hStart = _parseFlexibleDate(h.desde);
                                let hEnd = _parseFlexibleDate(h.hasta);
                                if (!hStart || !hEnd) return false;
                                return (seg.desde <= hEnd && seg.hasta >= hStart);
                            } else {
                                if (h.periodo) {
                                    let targetPeriodo = `${segYear}${String(segMonth + 1).padStart(2, '0')}`;
                                    return h.periodo === targetPeriodo;
                                } else {
                                    let hStart = _parseFlexibleDate(h.desde);
                                    return hStart && hStart.getFullYear() === segYear && hStart.getMonth() === segMonth;
                                }
                            }
                        });

                        if (exactMonthHistory.length > 0) {
                            let extractedDias = null;
                            if (segYear < 1995) {
                                let hExact = exactMonthHistory.find(h => {
                                    let hStart = _parseFlexibleDate(h.desde);
                                    let hEnd = _parseFlexibleDate(h.hasta);
                                    return hStart && hEnd && hStart.getMonth() === hEnd.getMonth() && hStart.getFullYear() === hEnd.getFullYear();
                                });
                                if (hExact) extractedDias = Number(hExact.dias || 0);
                            } else {
                                extractedDias = exactMonthHistory.reduce((sum, h) => sum + Number(h.dias || 0), 0);
                            }

                            if (extractedDias !== null) {
                                seg.calcDias = extractedDias;
                                seg.calcSemanas = Number((extractedDias / 7).toFixed(4));
                                seg.observacion = 'Corregido con Detalle de Pagos';
                                anyDetailFound = true;
                            }
                        }
                    });

                    // Lógica ya escrita: Si tras buscar el detalle persiste un desvío, se ajusta proporcionalmente
                    let newMathTotalDias = rowSegments.reduce((sum, seg) => sum + seg.calcDias, 0);
                    let newMathTotalSemanas = newMathTotalDias / 7;
                    let newDiffSemanas = Math.abs(newMathTotalSemanas - targetSemanas);
                    
                    // El Paso 5 (ajuste proporcional) solo se activa si el check está marcado (applyCorrections === true)
                    let stillNeedsCorrection = applyCorrections && (newDiffSemanas > 0.145);

                    if (stillNeedsCorrection && newMathTotalDias > 0) {
                        let ratio = (targetSemanas * 7) / newMathTotalDias;
                        let accumulatedSemanas = 0;
                        
                        for (let i = 0; i < rowSegments.length - 1; i++) {
                            let newDias = Math.round(rowSegments[i].calcDias * ratio);
                            let newSemanas = Number((newDias / 7).toFixed(4));
                            rowSegments[i].calcDias = newDias;
                            rowSegments[i].calcSemanas = newSemanas;
                            rowSegments[i].observacion = rowSegments[i].observacion === 'Corregido con Detalle de Pagos' ? 'Detalle + Proporcional' : obsText;
                            accumulatedSemanas += newSemanas;
                        }
                        
                        let lastNewSemanas = Number((targetSemanas - accumulatedSemanas).toFixed(4));
                        let lastNewDias = Math.round(lastNewSemanas * 7);
                        rowSegments[rowSegments.length - 1].calcDias = lastNewDias;
                        rowSegments[rowSegments.length - 1].calcSemanas = lastNewSemanas;
                        rowSegments[rowSegments.length - 1].observacion = rowSegments[rowSegments.length - 1].observacion === 'Corregido con Detalle de Pagos' ? 'Detalle + Proporcional' : obsText;
                    }
                }
            }
        }

        segmentedRows.push(...rowSegments);
    });

    // Ordenar cronológicamente
    segmentedRows.sort((a, b) => a.desde - b.desde);

    // 2. CONSTRUIR DETALLE ACTUARIAL DETALLADO MENSUALIZADO
    let detailedReport = [];
    const fmtDate = (d) => `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;

    segmentedRows.forEach(seg => {
        const year = seg.desde.getFullYear();
        const mes = seg.desde.getMonth() + 1;
        
        const ipcInicialKey = `${year}-${String(mes).padStart(2, '0')}`;
        const ipcInicial = safeGetIpc(ipcInicialKey);
        const ibcIndexadoIA = (ipcInicial && ipcInicial > 0) ? seg.ibc * (ipcFinal / ipcInicial) : seg.ibc;
        
        const tasaP = _getTasaSafe(seg.desde);
        const seccion = year < 1995 ? 'pre1995' : 'post1995';

        detailedReport.push({
            nit: seg.nit || '',
            empresa: seg.empresa + (seg.observacion ? ` (${seg.observacion})` : ''),
            mes: `${year}-${String(mes).padStart(2, '0')}`,
            mesNombre: MESES_CORTOS_M[mes - 1] || '',
            ano: year,
            seccion: seccion,
            desde: fmtDate(seg.desde),
            hasta: fmtDate(seg.hasta),
            dias: seg.calcDias,
            diasCot: seg.calcDias,
            semanas: seg.calcSemanas,
            ibcHistorico: seg.ibc,
            tasaP: tasaP,
            ipcFinalFecha: `${MESES_CORTOS_M[mesCierre - 1]} ${anoCierre}`,
            ipcFinal: ipcFinal,
            ipcInicialFecha: `${MESES_CORTOS_M[mes - 1]} ${year}`,
            ipcInicial: ipcInicial,
            ibcIndexado: ibcIndexadoIA
        });
    });

    // 3. OBTENER FACTORES Y LIQUIDACIÓN
    let SCTotal = 0;
    let totalGeneralDias = 0;
    detailedReport.forEach(p => {
        if (p.esMora) return;
        SCTotal += p.semanas;
        totalGeneralDias += p.dias;
    });

    if (SCTotal <= 0) throw new Error("No hay semanas computables para realizar la liquidación.");

    let sumatoriaMasaTasa = 0;
    let sumatoriaMasaSalarial = 0;

    detailedReport.forEach(p => {
        if (p.esMora) return;
        sumatoriaMasaTasa += p.tasaP * p.dias;
        sumatoriaMasaSalarial += p.ibcIndexado * p.dias;
    });

    const PPC = totalGeneralDias > 0 ? (sumatoriaMasaTasa / totalGeneralDias) : 0;
    const promedioMensualPonderado = totalGeneralDias > 0 ? (sumatoriaMasaSalarial / totalGeneralDias) : 0;
    const SBC = (promedioMensualPonderado / 30) * 7;
    const ISP = SBC * SCTotal * PPC;

    return { 
        totalDias: totalGeneralDias,
        semanas: SCTotal,
        SC: SCTotal,
        PPC: PPC,
        SBC: SBC,
        ingresoMensualPromedio: promedioMensualPonderado,
        indemnizacion: ISP,
        detailedReport,
        sumAportes: ISP
    };
}
