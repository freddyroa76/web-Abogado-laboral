// js/pension-rpm-app.js

document.addEventListener('DOMContentLoaded', () => {
    const state = {
        step: 1,
        loading: false,
        formData: {
            cedula: '',
            genero: 'M',
            edad: '',
            anoLiquidacion: 2026,
            smlv: SMLV_DATA[2026] || 1300000
        },
        history: [],
        results: null,
        showDetails: false,
        applyCorrections: true,
        reportedSemanas: null,
        audit: {
            correctedCount: 0,
            reportedSemanas: null,
            calculatedSemanas: null,
            gap: 0,
            discrepancy: false
        }
    };

    const DOM = {
        steps: [
            document.getElementById('step-1'),
            document.getElementById('step-2'),
            document.getElementById('step-3')
        ],
        stepperDots: document.querySelectorAll('.stepper-dot'),
        stepperLines: document.querySelectorAll('.stepper-line'),
        inputs: {
            cedula: document.getElementById('input-cedula'),
            genero: document.getElementById('input-genero'),
            edad: document.getElementById('input-edad'),
            anoLiquidacion: document.getElementById('input-ano'),
            smlv: document.getElementById('input-smlv'),
            fileResumen: document.getElementById('input-file-resumen')
        },
        buttons: {
            calcParams: document.getElementById('btn-calc-params'),
            addManual: document.getElementById('btn-add-manual'),
            toggleDetails: document.getElementById('btn-toggle-details'),
            exportPdf: document.getElementById('btn-export-pdf')
        },
        containers: {
            error: document.getElementById('error-container'),
            errorMsg: document.getElementById('error-msg'),
            historyTable: document.getElementById('history-table-body'),
            historyCount: document.getElementById('history-count'),
            results: document.getElementById('results-container'),
            auditPanel: document.getElementById('audit-panel'),
            auditReported: document.getElementById('audit-reported-semanas'),
            auditCalculated: document.getElementById('audit-calculated-semanas'),
            auditGap: document.getElementById('audit-gap'),
            auditCorrectedCount: document.getElementById('audit-corrected-count'),
            auditToggle: document.getElementById('audit-toggle-correction')
        }
    };

    const isDate = (val) => {
        if (!val) return false;
        const s = String(val).replace(/\s/g, '');
        if (/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}$/.test(s)) return true;
        if (!isNaN(s) && Number(s) > 10000 && Number(s) < 80000) return true;
        return false;
    };

    const formatDateForDisplay = (val) => {
        if (!val) return '';
        const str = String(val).trim();
        if (!isNaN(str) && Number(str) > 10000 && Number(str) < 80000) {
            const d = new Date((Number(str) - 25569) * 86400 * 1000);
            return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth()+1).padStart(2, '0')}/${d.getFullYear()}`;
        }
        return str;
    };

    const parseFlexibleDate = (val) => {
        if (!val) return null;
        const str = String(val).trim();
        const parts = str.split(/[\/\-]/);
        if (parts.length === 3) {
            if (parts[2].length === 4) return new Date(parts[2], parts[1]-1, parts[0]);
            else if (parts[0].length === 4) return new Date(parts[0], parts[1]-1, parts[2]);
        }
        return new Date(str);
    };

    // Intento de recuperación de fechas cuando la extracción falla (años irreales)
    const repairDateIfInvalid = (dateObj, originalStr, contextText, matchIndex) => {
        const nowYear = new Date().getFullYear();
        const isValid = dateObj && !isNaN(dateObj.getTime()) && dateObj.getFullYear() >= 1900 && dateObj.getFullYear() <= (nowYear + 5);
        if (isValid) return dateObj;

        // 1) Intentar extraer últimos 4 dígitos del string original
        try {
            const digits = String(originalStr).replace(/[^\d]/g, '');
            if (digits.length >= 4) {
                const possibleYear = digits.slice(-4);
                const parts = originalStr.match(/(\d{1,2})/g);
                if (parts && parts.length >= 2) {
                    const day = parseInt(parts[0], 10);
                    const month = parseInt(parts[1], 10);
                    const year = parseInt(possibleYear, 10);
                    const cand = new Date(year, month - 1, day);
                    if (!isNaN(cand.getTime()) && cand.getFullYear() >= 1900 && cand.getFullYear() <= (nowYear + 5)) return cand;
                }
            }
        } catch (e) { /* ignore */ }

        // 2) Buscar en ventana de contexto un patrón dd/mm/yyyy con año plausible
        try {
            const win = Math.max(0, (matchIndex || 0) - 200);
            const windowText = (contextText || '').substring(win, Math.min((contextText || '').length, (matchIndex || 0) + 200));
            const ddmmRegex = /(\d{1,2}\s*[\/\-]\s*\d{1,2}\s*[\/\-]\s*(19\d{2}|20\d{2}))/g;
            let mm;
            while ((mm = ddmmRegex.exec(windowText)) !== null) {
                const candStr = mm[1].replace(/\s/g, '');
                const candDate = parseFlexibleDate(candStr);
                if (candDate && !isNaN(candDate.getTime()) && candDate.getFullYear() >= 1900 && candDate.getFullYear() <= (nowYear + 5)) return candDate;
            }
        } catch (e) { /* ignore */ }

        return dateObj;
    };

    const formatShortDate = (dateObj) => {
        if(!dateObj) return "";
        return `${String(dateObj.getDate()).padStart(2, '0')}/${String(dateObj.getMonth()+1).padStart(2, '0')}/${dateObj.getFullYear()}`;
    };

    const getDiasComerciales = (start, end) => {
        if (!start || !end || isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
        let d1 = start.getDate();
        let d2 = end.getDate();
        if (d1 === 31) d1 = 30;
        if (d2 === 31) d2 = 30;
        if (start.getMonth() === 1 && (d1 === 28 || d1 === 29)) d1 = 30;
        if (end.getMonth() === 1 && (d2 === 28 || d2 === 29)) d2 = 30;
        const yDiff = end.getFullYear() - start.getFullYear();
        const mDiff = end.getMonth() - start.getMonth();
        const dDiff = d2 - d1;
        let total = (yDiff * 360) + (mDiff * 30) + dDiff + 1;
        return total > 0 ? total : 0;
    };

    const cleanIBC = (val) => {
        if (!val) return 0;
        const s = String(val).replace(/[^\d.,]/g, '');
        const parsed = parseFloat(s.replace(/\./g, '').replace(',', '.'));
        return isNaN(parsed) ? 0 : parsed;
    };

    // Extraer número robusto (usa cleanIBC internamente)
    const parseNumber = (txt) => cleanIBC(txt);

    // Extrae el número de "Total Semanas" reportado en el PDF (si existe)
    const extractReportedSemanas = (normalizedText) => {
        if (!normalizedText) return null;
        const patterns = [
            /Total\s*(?:de\s*)?Semanas(?:\s*Cotizadas)?\s*[:\-\s]*([\d\.,]+)/i,
            /Semanas\s*Cotizadas\s*[:\-\s]*([\d\.,]+)/i,
            /Total\s*Semanas\s*[:\-\s]*([\d\.,]+)/i
        ];
        for (const p of patterns) {
            const m = p.exec(normalizedText);
            if (m && m[1]) {
                const v = parseNumber(m[1]);
                if (v > 0) return v;
            }
        }
        return null;
    };

    // Detecta si un periodo cubre un mes comercial completo (regla: mismo mes/año y >=30 días comerciales)
    const isFullCommercialMonth = (start, end) => {
        if (!start || !end) return false;
        if (start.getFullYear() !== end.getFullYear() || start.getMonth() !== end.getMonth()) return false;
        const dias = getDiasComerciales(start, end);
        return dias >= 30 && start.getDate() <= 3; // inicio mes cercano a día 1 y al menos 30 días comerciales
    };

    // Aplica la corrección automatizada sobre un historial: marca filas corregidas y fuerza 30 días en meses completos
    const applyAutomaticCorrections = (hist, applyCorrectionsFlag) => {
        let corrected = 0;
        const cloned = hist.map(r => ({ ...r, diasOriginal: r.dias, corrected: false }));
        if (!applyCorrectionsFlag) return { history: cloned, correctedCount: 0 };

        for (const row of cloned) {
            const s = parseFlexibleDate(row.desde);
            const e = parseFlexibleDate(row.hasta);
            if (!s || !e) continue;
            if (isFullCommercialMonth(s, e)) {
                if (row.dias !== 30) {
                    row.dias = 30;
                    row.corrected = true;
                    corrected++;
                }
            }
        }

        return { history: cloned, correctedCount: corrected };
    };

    // Valida semanas reportadas vs cálculo matemático (Total Días / 7)
    const validarSemanas = (hist, reportedSemanas, applyCorrectionsFlag) => {
        if (!hist || hist.length === 0) return { reported: reportedSemanas || null, calculated: 0, gap: 0, discrepancy: false };
        const { history: hCorrected } = applyAutomaticCorrections(hist, applyCorrectionsFlag);
        const totalDias = hCorrected.reduce((s, r) => s + (Number(r.dias) || 0), 0);
        const calculated = totalDias / 7;
        const rep = reportedSemanas || null;
        const gap = rep !== null ? (calculated - rep) : 0;
        const discrepancy = rep !== null && Math.abs(gap) > 0.01;
        // actualizar estado de auditoría
        state.audit = {
            correctedCount: hCorrected.filter(r => r.corrected).length,
            reportedSemanas: rep,
            calculatedSemanas: calculated,
            gap: gap,
            discrepancy: discrepancy
        };
        return { reported: rep, calculated, gap, discrepancy };
    };

    const formatCurrency = (v) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v);

    function checkReadyToUpload() {
        const isCedulaValid = state.formData.cedula && state.formData.cedula.trim().length >= 5;
        const isEdadValid = state.formData.edad && state.formData.edad > 0;
        const uploaderArea = document.getElementById('uploader-area');
        
        if (isCedulaValid && isEdadValid) {
            uploaderArea.classList.remove('disabled');
        } else {
            uploaderArea.classList.add('disabled');
        }
    }

    DOM.inputs.cedula.addEventListener('input', (e) => {
        state.formData.cedula = e.target.value.replace(/\D/g, '');
        e.target.value = state.formData.cedula;
        checkReadyToUpload();
    });

    DOM.inputs.anoLiquidacion.addEventListener('input', (e) => {
        const year = parseInt(e.target.value);
        state.formData.anoLiquidacion = year;
        if (SMLV_DATA[year]) {
            state.formData.smlv = SMLV_DATA[year];
            DOM.inputs.smlv.value = SMLV_DATA[year];
        }
    });

    DOM.inputs.smlv.addEventListener('input', (e) => {
        state.formData.smlv = parseInt(e.target.value) || 0;
    });

    DOM.inputs.genero.addEventListener('change', (e) => state.formData.genero = e.target.value);
    
    DOM.inputs.edad.addEventListener('input', (e) => {
        state.formData.edad = parseFloat(e.target.value) || 0;
        checkReadyToUpload();
    });

    DOM.inputs.fileResumen.addEventListener('click', (e) => {
        const isCedulaValid = state.formData.cedula && state.formData.cedula.trim().length >= 5;
        const isEdadValid = state.formData.edad && state.formData.edad > 0;
        
        let missing = [];
        if (!isCedulaValid) {
            missing.push("la Cédula");
            DOM.inputs.cedula.style.borderColor = "#ef4444";
            DOM.inputs.cedula.style.boxShadow = "0 0 0 3px rgba(239,68,68,0.2)";
            setTimeout(() => { DOM.inputs.cedula.style.borderColor = ""; DOM.inputs.cedula.style.boxShadow = ""; }, 3000);
        }
        if (!isEdadValid) {
            missing.push("la Edad");
            DOM.inputs.edad.style.borderColor = "#ef4444";
            DOM.inputs.edad.style.boxShadow = "0 0 0 3px rgba(239,68,68,0.2)";
            setTimeout(() => { DOM.inputs.edad.style.borderColor = ""; DOM.inputs.edad.style.boxShadow = ""; }, 3000);
        }
        
        if (missing.length > 0) {
            e.preventDefault();
            showError("Por favor, digite " + missing.join(" y ") + " obligatoriamente antes de cargar el historial.");
            return;
        }
    });

    DOM.inputs.fileResumen.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        hideError();
        if(file.name.toLowerCase().endsWith('.pdf')) {
            await handlePDF(file);
        } else {
            handleExcel(file);
        }
    });

    async function handlePDF(file) {
        const password = state.formData.cedula;
        setLoading(true);
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        try {
            const buffer = await file.arrayBuffer();
            let doc;
            try { doc = await pdfjsLib.getDocument({ data: buffer, password }).promise; } 
            catch (e) {
                if (e.name === "PasswordException") {
                    try { doc = await pdfjsLib.getDocument({ data: buffer, password: `CC${password}` }).promise; }
                    catch { throw new Error("Contraseña incorrecta. Verifique el número de documento."); }
                } else throw e;
            }
            
            let fullText = "";
            for (let i = 1; i <= doc.numPages; i++) {
                const page = await doc.getPage(i);
                const content = await page.getTextContent();
                fullText += content.items.map(item => item.str).join(" ") + " ";
            }
            
            // Normalizamos todos los espacios múltiples o saltos de línea para estabilizar la extracción y partición
            const normalizedText = fullText.replace(/\s+/g, ' ');

            // Extraer semanas reportadas (header) si existe
            const reportedSemanas = extractReportedSemanas(normalizedText);
            if (reportedSemanas) {
                state.reportedSemanas = reportedSemanas;
                state.audit.reportedSemanas = reportedSemanas;
            }

            // Detectar bloque antiguo explícito (Detalle de tiempos anteriores a 1995)
            const pre1995Regex = /DETALLE\s+DE\s+TIEMPOS\s+EFECTUADOS\s+ANTERIORES\s+A\s+1995/i;
            const pre1995Match = pre1995Regex.exec(normalizedText);
            const pre1995Index = pre1995Match ? pre1995Match.index : -1;

            const regexPDF = /(\d{5,15})\s+([^\n\r]{3,60}?)\s+(\d{1,2}\s*[\/\-]\s*\d{1,2}\s*[\/\-]\s*\d{4})\s+(\d{1,2}\s*[\/\-]\s*\d{1,2}\s*[\/\-]\s*\d{4})\s+\$?\s*([\d.,]+)\s+([\d.,]+)/g;
            
            // Identificar dónde empieza el detalle antiguo para no mezclar reglas
            let splitIndex = Infinity;
            const markerRegex = /DETALLE\s+DE\s+PAGOS\s+EFECTUADOS/i;
            const markerMatch = markerRegex.exec(normalizedText);
            if (markerMatch) {
                splitIndex = markerMatch.index;
            }

            const umbral1995 = new Date(1995, 0, 1);
            let rawMatches = [];
            let m;
            
            regexPDF.lastIndex = 0;
            while ((m = regexPDF.exec(normalizedText)) !== null) {
                const emp = m[2].trim().toUpperCase();
                if (emp.includes("RAZÓN SOCIAL") || emp.includes("ADMINISTRADORA") || emp.includes("NOMBRE AFILIADO") || emp === "NIT") continue;
                
                let ibc = cleanIBC(m[5]);
                const extractedNum = cleanIBC(m[6]);
                
                if (ibc < 10 && extractedNum === 0) continue;
                
                // Intentamos parsear las fechas y repararlas si la extracción produjo años irreales
                const rawDesde = m[3];
                const rawHasta = m[4];
                const matchStartIndex = m.index || 0;
                const posDesde = normalizedText.indexOf(rawDesde, matchStartIndex);
                const posHasta = normalizedText.indexOf(rawHasta, matchStartIndex);

                let start = parseFlexibleDate(rawDesde);
                let end = parseFlexibleDate(rawHasta);
                start = repairDateIfInvalid(start, rawDesde, normalizedText, posDesde >= 0 ? posDesde : matchStartIndex);
                end = repairDateIfInvalid(end, rawHasta, normalizedText, posHasta >= 0 ? posHasta : matchStartIndex);

                if (!start || !end || isNaN(start.getTime()) || isNaN(end.getTime())) continue;

                const isAntiguo = (splitIndex !== Infinity && m.index >= splitIndex);
                const isPre1995 = (pre1995Index !== -1 && m.index >= pre1995Index) || (start && start.getTime() < umbral1995.getTime());

                // Si es pre1995 y el IBC parece dañado, intentar recuperación desde el entorno textual
                if (isPre1995 && ibc < 10) {
                    try {
                        const snippet = normalizedText.substr(Math.max(0, m.index - 80), 200);
                        const fb = /\$?\s*([\d\.,]{4,})/.exec(snippet);
                        if (fb && fb[1]) {
                            const recovered = parseNumber(fb[1]);
                            if (recovered > ibc) ibc = recovered;
                        }
                    } catch (e) { /* ignore fallback */ }
                }

                if (!isAntiguo) {
                    // Contexto 1: TABLA RESUMEN GENERAL (Semanas)
                    const diasComerciales = getDiasComerciales(start, end);
                    rawMatches.push({ 
                        nit: m[1], 
                        empresa: m[2].trim(), 
                        desde: formatShortDate(start), 
                        hasta: formatShortDate(end), 
                        ibc: ibc, 
                        dias: diasComerciales,
                        inicioDate: start.getTime(),
                        origen: 'resumen',
                        pre1995: isPre1995
                    });
                } else {
                    // Contexto 2: TABLA DETALLE DE PAGOS (Días)
                    const diasComerciales = extractedNum > 0 ? extractedNum : getDiasComerciales(start, end);
                    rawMatches.push({ 
                        nit: m[1], 
                        empresa: m[2].trim(), 
                        desde: formatShortDate(start), 
                        hasta: formatShortDate(end), 
                        ibc: ibc, 
                        dias: diasComerciales,
                        inicioDate: start.getTime(),
                        origen: 'detalle',
                        pre1995: isPre1995
                    });
                }
            }

            // --- FILTRADO INTELIGENTE (RESCATE DE BRECHAS Y ELIMINACIÓN DE CONSOLIDADOS ISS) ---
            const nitsConDetalleViejo = new Set(
                rawMatches.filter(r => r.origen === 'detalle').map(r => r.nit)
            );
            const empConDetalleViejo = new Set(
                rawMatches.filter(r => r.origen === 'detalle').map(r => r.empresa.toUpperCase().replace(/\./g, '').trim())
            );

            const matches = [];
            for (const r of rawMatches) {
                if (r.origen === 'resumen' && r.inicioDate < umbral1995.getTime()) {
                    // Es un consolidado pre-1995. Sólo lo descartamos si la Tabla 2 tiene su detalle.
                    // Si no tiene detalle (ej. entidades públicas, cajas previsoras), LO RESCATAMOS.
                    const matchNit = nitsConDetalleViejo.has(r.nit);
                    const empClean = r.empresa.toUpperCase().replace(/\./g, '').trim();
                    const matchEmp = empConDetalleViejo.has(empClean);
                    
                    if (matchNit || matchEmp) {
                        continue; // Tabla 2 protegerá estos años, ignoramos este resumen errático.
                    }
                }
                
                matches.push({
                    nit: r.nit,
                    empresa: r.empresa,
                    desde: r.desde,
                    hasta: r.hasta,
                    ibc: r.ibc,
                    dias: r.dias
                });
            }

            if (matches.length === 0) throw new Error("No se detectaron filas de aportes válidas en el PDF. Intente subir el Excel (CSV).");
            state.history = matches;
            renderHistory();
            goToStep(2);
        } catch (e) { showError(e.message); } finally { 
            setLoading(false); 
            DOM.inputs.fileResumen.value = '';
        }
    }

    function handleExcel(file) {
        setLoading(true);
        const reader = new FileReader();
        reader.onload = (e) => {
            const wb = XLSX.read(e.target.result, { type: 'array' });
            const ws = wb.Sheets[wb.SheetNames[0]];
            const json = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
            
            let validRows = [];
            json.forEach(r => {
                if (!r || r.length < 3) return;
                let desdeIdx = -1;
                for(let i=0; i < r.length - 1; i++) {
                    if (isDate(r[i]) && isDate(r[i+1])) { desdeIdx = i; break; }
                }
                if (desdeIdx !== -1) {
                    const empresa = String(r[desdeIdx-1] || '').trim();
                    if (empresa.toUpperCase().includes("ADMINISTRADORA") || empresa.toUpperCase().includes("RAZÓN SOCIAL")) return;
                    const postDateVals = r.slice(desdeIdx+2).map(v => cleanIBC(v));
                    const ibc = Math.max(...postDateVals.filter(v => v > 1000), 0);
                    const smallVals = postDateVals.filter(v => v > 0 && v <= 10000);
                    const extractedDias = smallVals.length > 0 ? smallVals[smallVals.length - 1] : 0;
                    if (ibc > 0 || extractedDias > 0) {
                        const start = parseFlexibleDate(r[desdeIdx]);
                        const end = parseFlexibleDate(r[desdeIdx+1]);
                        
                        const diasComerciales = extractedDias > 0 ? extractedDias : getDiasComerciales(start, end);
                        
                        validRows.push({ nit: String(r[desdeIdx-2] || ''), empresa: empresa, desde: formatDateForDisplay(r[desdeIdx]), hasta: formatDateForDisplay(r[desdeIdx+1]), ibc: ibc, dias: diasComerciales });
                    }
                }
            });
            if (validRows.length === 0) {
                showError("No se detectaron registros válidos en el Excel.");
            } else { 
                state.history = validRows;
                renderHistory();
                goToStep(2); 
            }
            setLoading(false);
        };
        reader.readAsArrayBuffer(file);
    }

    function renderHistory() {
        // Aplicar correcciones automatizadas si están activas (no muta state.history)
        const { history: displayHistory, correctedCount } = applyAutomaticCorrections(state.history, state.applyCorrections);

        // --- DETECCIÓN DE SIMULTANEIDAD ---
        let overlaps = new Set();
        let processTimeline = displayHistory.map((h, i) => {
            let s = parseFlexibleDate(h.desde);
            let e = parseFlexibleDate(h.hasta);
            return { idx: i, start: s ? s.getTime() : 0, end: e ? e.getTime() : 0 };
        }).filter(h => h.start > 0 && h.end > 0).sort((a,b) => a.start - b.start);
        
        for (let i = 0; i < processTimeline.length; i++) {
            for (let j = i + 1; j < processTimeline.length; j++) {
                // If the next logical segment starts before the current one ends, it's an overlap (simultaneity)
                // We add 86400000 (1 day) tolerance so adjacent days aren't overlaps
                if (processTimeline[i].end >= processTimeline[j].start) {
                    overlaps.add(processTimeline[i].idx);
                    overlaps.add(processTimeline[j].idx);
                } else break;
            }
        }

        if (overlaps.size > 0) {
            DOM.containers.historyCount.innerHTML = `<span class="text-secondary font-bold bg-orange-100/50 px-3 py-1 rounded border border-orange-200"><i class="fas fa-exclamation-triangle mr-1 text-orange-500"></i> ¡Atención! Se han resaltado en naranja periodos superpuestos (simultáneos). Por defecto, el motor los de-duplicará a máximo 30 días/mes.</span>`;
        } else {
            DOM.containers.historyCount.innerText = `${state.history.length} registros extraídos para estimación`;
        }

        // Actualizar auditoría (semana reportada vs calculada) y contador de correcciones
        validarSemanas(state.history, state.reportedSemanas, state.applyCorrections);
        if (DOM.containers.auditReported) {
            DOM.containers.auditReported.innerText = state.audit.reportedSemanas !== null ? state.audit.reportedSemanas.toFixed(2) : '—';
        }
        if (DOM.containers.auditCalculated) {
            DOM.containers.auditCalculated.innerText = state.audit.calculatedSemanas ? state.audit.calculatedSemanas.toFixed(2) : '0.00';
        }
        if (DOM.containers.auditGap) {
            DOM.containers.auditGap.innerText = state.audit.gap ? state.audit.gap.toFixed(2) : '0.00';
        }
        if (DOM.containers.auditCorrectedCount) {
            DOM.containers.auditCorrectedCount.innerText = correctedCount || 0;
        }
        if (DOM.containers.auditToggle) {
            DOM.containers.auditToggle.checked = !!state.applyCorrections;
        }

        DOM.containers.historyTable.innerHTML = '';
        displayHistory.forEach((row, i) => {
            const isOverlap = overlaps.has(i);
            const tr = document.createElement('tr');
            tr.className = isOverlap ? "border-b border-orange-200 bg-orange-50/40 hover:bg-orange-100 transition-colors" : "border-b border-slate-100 hover:bg-blue-50/50 transition-colors";
            
            const correctedBadge = row.corrected ? '<span class="inline-block bg-green-100 text-green-700 px-2 py-0.5 rounded text-[11px] font-semibold mr-2">Corregido</span>' : '';
            tr.innerHTML = `
                <td class="p-3 font-medium text-slate-700 truncate max-w-[200px]" title="${row.empresa}">${correctedBadge}${isOverlap ? '<i class="fas fa-bolt text-orange-400 mr-1" title="Periodo simultáneo"></i>' : ''}${row.empresa}</td>
                <td class="p-3 font-mono text-xs"><input class="bg-transparent w-24 outline-none border-b border-transparent focus:border-secondary" value="${row.desde}" data-idx="${i}" data-field="desde" /></td>
                <td class="p-3 font-mono text-xs"><input class="bg-transparent w-24 outline-none border-b border-transparent focus:border-secondary" value="${row.hasta}" data-idx="${i}" data-field="hasta" /></td>
                <td class="p-3 text-right font-semibold text-slate-800"><input class="bg-transparent text-right w-28 outline-none border-b border-transparent focus:border-secondary" type="number" value="${row.ibc}" data-idx="${i}" data-field="ibc" /></td>
                <td class="p-3 text-center text-slate-600"><input class="bg-transparent text-center w-16 outline-none border-b border-transparent focus:border-secondary" type="number" value="${row.dias}" data-idx="${i}" data-field="dias" /></td>
                <td class="p-3 text-center"><button class="text-slate-400 hover:text-red-500 transition-colors p-1 btn-delete-row" data-idx="${i}"><i class="fas fa-trash"></i></button></td>
            `;
            DOM.containers.historyTable.appendChild(tr);
        });

        document.querySelectorAll('.btn-delete-row').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = parseInt(e.currentTarget.getAttribute('data-idx'));
                state.history.splice(idx, 1);
                renderHistory();
            });
        });

        DOM.containers.historyTable.querySelectorAll('input').forEach(input => {
            input.addEventListener('change', (e) => {
                const idx = parseInt(e.target.getAttribute('data-idx'));
                const field = e.target.getAttribute('data-field');
                if(field === 'ibc' || field === 'dias') {
                    state.history[idx][field] = parseFloat(e.target.value) || 0;
                } else {
                    state.history[idx][field] = e.target.value;
                }
            });
        });
    }

    DOM.buttons.addManual.addEventListener('click', () => {
        state.history.unshift({empresa:'PERIODO MANUAL',desde:'01/01/2000',hasta:'30/01/2000',ibc:1300000,semanas:4.29, dias:30});
        renderHistory();
    });

    // Toggle para aplicar corrección automatizada desde el panel de auditoría
    if (DOM.containers.auditToggle) {
        DOM.containers.auditToggle.addEventListener('change', (e) => {
            state.applyCorrections = !!e.target.checked;
            renderHistory();
        });
    }

    function doIBLCalculation(isTodaVida = false) {
        // IPC Final SIEMPRE es Diciembre del año anterior a la liquidación
        let targetFinalYear = state.formData.anoLiquidacion;
        const ipcFinalKey = `${targetFinalYear - 1}-12`;
        let ipcFinal = IPC_DATA[ipcFinalKey]; 

        // Si por alguna razón el IPC final no existe (futuro remoto), tomar el último conocido
        if (!ipcFinal) {
             const availableKeys = Object.keys(IPC_DATA).sort();
             ipcFinal = IPC_DATA[availableKeys[availableKeys.length - 1]];
             if (!ipcFinal) throw new Error("No se encontró IPC final.");
        }
        
        // Construir un mapa por mes donde para cada día (1..30) se registra el IBC máximo observado.
        let monthlyAggregation = {};
        state.history.forEach((row) => {
            if (!row.desde || !row.hasta || row.ibc <= 0) return;
            const dStart = parseFlexibleDate(row.desde);
            const dEnd = parseFlexibleDate(row.hasta);
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

                // Determinar rango de días a recorrer; si aplica corrección automática y el periodo cubre mes completo,
                // forzar días 1..30 para ese mes.
                let actualStart = curStart.getDate();
                let actualEnd = actEnd.getDate();
                if (actualStart === 31) actualStart = 30;
                if (actualEnd === 31) actualEnd = 30;
                const isFebEnd = (curMonth === 1) && (actualEnd === 28 || actualEnd === 29);
                if (isFebEnd) actualEnd = 30;

                const periodStart = new Date(curStart.getTime());
                const periodEnd = new Date(actEnd.getTime());
                const applyCorrFullMonth = state.applyCorrections && isFullCommercialMonth(periodStart, periodEnd);

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
        aggregatedMonthsData.sort((a,b) => {
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
            
            const dayKeys = seg.dayIbcMap ? Object.keys(seg.dayIbcMap).map(x => parseInt(x,10)) : [];
            const realActiveDaysInMonth = Math.min(dayKeys.length, 30);
            if (realActiveDaysInMonth === 0) continue;

            const daysToTake = Math.min(realActiveDaysInMonth, remainingDays);
            const monthlyIBCContributionSum = dayKeys.reduce((s,d) => s + (seg.dayIbcMap[d] || 0), 0);
            const combinedAveragedMonthlyRate = monthlyIBCContributionSum / realActiveDaysInMonth;

            const monthStr = String(seg.month).padStart(2, '0');
            
            // IPC Inicial SIEMPRE es Diciembre del año anterior al aporte
            const ipcInicialKey = `${seg.year - 1}-12`;
            const ipcInicial = IPC_DATA[ipcInicialKey] || 1; 
            
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
    }

    DOM.buttons.calcParams.addEventListener('click', handleCalculate);

    function handleCalculate() {
        hideError();
        try {
            const nombreInput = document.querySelector('input[placeholder="Nombre Completo"]');
            state.formData.nombre = nombreInput ? nombreInput.value : 'Usuario ' + state.formData.cedula;
            state.formData.edad = DOM.inputs.edad.value;
            
            if (!state.formData.edad || state.formData.edad <= 0) {
                goToStep(1);
                DOM.inputs.edad.focus();
                DOM.inputs.edad.style.borderColor = "#ef4444";
                DOM.inputs.edad.style.boxShadow = "0 0 0 3px rgba(239,68,68,0.2)";
                setTimeout(() => {
                    DOM.inputs.edad.style.borderColor = "";
                    DOM.inputs.edad.style.boxShadow = "";
                }, 3000);
                throw new Error("Por rigor legal, digite la Edad del afiliado y vuelva al Paso 2 para liquidar.");
            }
            setLoading(true);

            // Validar semanas reportadas vs cálculo matemático antes de ejecutar la liquidación
            const validation = validarSemanas(state.history, state.reportedSemanas, state.applyCorrections);
            if (validation.discrepancy) {
                showError("Discrepancia detectada entre 'Semanas reportadas' y cálculo matemático. Se usará el cálculo matemático propio para la liquidación.");
            }

            const calc10Years = doIBLCalculation(false);
            const calcTodaVida = doIBLCalculation(true);

            // Única fuente de verdad: Días completamente de-duplicados por el motor actuarial
            const totalSem = calcTodaVida.consumedDays / 7;
            
            const ageInYears = parseFloat(state.formData.edad) || 0;
            const requiredAge = state.formData.genero === 'F' ? 57 : 62;
            const isVerification = totalSem >= 1300 && ageInYears >= requiredAge;

            let bestCalc = calc10Years;
            let bestName = "Los Últimos 10 Años (3.600 Días)";
            
            if (calcTodaVida.ibl > calc10Years.ibl) {
                bestCalc = calcTodaVida;
                bestName = "Toda la Vida (Art. 21 Ley 100)";
            }

            const smlvs = bestCalc.ibl / state.formData.smlv;
            let tasaBase = 65.5 - (0.5 * smlvs);
            if (tasaBase < 55) tasaBase = 55.00;

            const getRes = (aplicarTopeColpensiones) => {
                let semExtra = Math.max(0, totalSem - 1300);
                if (aplicarTopeColpensiones) semExtra = Math.min(semExtra, 500); 
                const grupos = Math.floor(semExtra / 50);
                let tasaFinal = tasaBase + (grupos * 1.5);
                if (tasaFinal > 80.00) tasaFinal = 80.00; 
                
                const mesadaCalculada = Math.round(bestCalc.ibl * (tasaFinal / 100));
                const mesadaFinal = Math.max(state.formData.smlv, Math.min(mesadaCalculada, state.formData.smlv * 25)); 
                
                let porcentajeSalud = 12;
                if (mesadaFinal <= state.formData.smlv) {
                    porcentajeSalud = 4;
                } else if (mesadaFinal > state.formData.smlv && mesadaFinal <= (state.formData.smlv * 3)) {
                    porcentajeSalud = 10;
                }
                const descuentoSalud = Math.round(mesadaFinal * (porcentajeSalud / 100));
                const mesadaNeta = mesadaFinal - descuentoSalud;

                return { rate: tasaFinal / 100, extra: semExtra, grupos, mesada: mesadaFinal, porcentajeSalud, descuentoSalud, mesadaNeta };
            };

            const vA = getRes(true); 
            const vB = getRes(false); 
            
            state.results = {
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

            renderResults();
            goToStep(3);

        } catch(e) {
            showError("Error de cálculo: " + e.message);
        } finally {
            setLoading(false);
        }
    }

    // Funciones de interfaz omitidas para brevedad (renderResults, exportPDF, etc. se mantienen idénticas)
    
    function renderResults() {
        DOM.containers.results.innerHTML = '';
        const res = state.results;

        // ... Mismo renderResults que ya tenías validado (No cambia la interfaz)
        const html = `
            <div class="space-y-6 animate-in slide-in-from-bottom-4">
                <div class="grid md:grid-cols-3 gap-4">
                    <div class="card-legal p-6 rounded-2xl flex flex-col justify-center border-t-4 border-t-primary">
                        <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wide">IBL Estimado Ponderado</p>
                        <h3 class="text-2xl font-black text-primary mt-1">${formatCurrency(res.ibl)}</h3>
                        <p class="text-xs text-slate-500 mt-1">${res.bestName}</p>
                    </div>
                    <div class="card-legal p-6 rounded-2xl flex flex-col justify-center border-t-4 border-t-secondary">
                        <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Semanas Totales</p>
                        <h3 class="text-2xl font-black text-primary mt-1">${res.totalSem.toFixed(2)}</h3>
                        <p class="text-xs text-slate-500 mt-1">Histórico general</p>
                    </div>
                    <div class="card-legal p-6 rounded-2xl flex flex-col justify-center border-t-4 border-t-slate-400">
                        <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Tasa Base</p>
                        <h3 class="text-2xl font-black text-primary mt-1">${res.tasaBase.toFixed(2)}%</h3>
                        <p class="text-xs text-slate-500 mt-1">Fórmula proyectada: 65.5 - 0.5s</p>
                    </div>
                </div>

                <div class="space-y-6">
                    <div class="card-legal p-8 rounded-2xl flex flex-col relative border-primary/20 ring-1 ring-primary/10 bg-white shadow-md">
                        <div class="absolute top-0 right-0 bg-primary text-white text-[10px] font-bold px-4 py-2 rounded-bl-lg rounded-tr-xl tracking-wider">RESULTADO PRINCIPAL</div>
                        <div class="mb-6">
                            <h3 class="text-2xl font-bold text-primary mt-3">Cálculo Colpensiones</h3>
                            <p class="text-sm font-medium text-slate-500 mt-1">Estimación Ley 797 de 2003 (Tope 1.800 Semanas)</p>
                        </div>
                        <div class="grid md:grid-cols-2 gap-8 items-center mb-4">
                            <div class="space-y-4">
                                <div class="flex justify-between items-center text-sm border-b border-slate-100 pb-2">
                                    <span class="text-slate-600">Semanas Adicionales Computadas</span>
                                    <span class="font-bold text-slate-800">${res.vA.extra.toFixed(2)}</span>
                                </div>
                                <div class="flex justify-between items-center text-sm border-b border-slate-100 pb-2">
                                    <span class="text-slate-600">Incremento Proy. (1.5% x Grupo 50)</span>
                                    <span class="font-bold text-slate-800">${Math.floor(res.vA.extra / 50) * 1.5}%</span>
                                </div>
                                <div class="flex justify-between items-center text-sm border-b border-slate-100 pb-2">
                                    <span class="text-slate-600 font-semibold">Tasa de Reemplazo Calculada</span>
                                    <span class="font-bold text-primary text-base">${(res.vA.rate * 100).toFixed(2)}%</span>
                                </div>
                            </div>
                            <div class="bg-slate-50/80 p-6 rounded-xl border border-slate-200">
                                <p class="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1 text-center">Mesada Bruta ${res.isVerification ? 'Verificada' : 'Proyectada'}</p>
                                <p class="text-4xl font-black text-slate-800 text-center">${formatCurrency(res.vA.mesada)}</p>
                                <div class="mt-6 pt-4 border-t border-slate-200 grid grid-cols-2 gap-4 text-left">
                                    <div>
                                        <p class="text-[10px] uppercase text-slate-400 font-bold">Salud (${res.vA.porcentajeSalud}%)</p>
                                        <p class="text-sm font-semibold text-red-500">-${formatCurrency(res.vA.descuentoSalud)}</p>
                                    </div>
                                    <div class="text-right">
                                        <p class="text-[10px] uppercase text-slate-400 font-bold">Neto a Recibir</p>
                                        <p class="text-lg font-black text-green-600">${formatCurrency(res.vA.mesadaNeta)}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    ${res.totalSem > 1800 ? `
                    <div class="card-legal p-5 rounded-xl border border-slate-100 bg-slate-50/50">
                        <div class="mb-3">
                            <h4 class="text-sm font-bold text-slate-600"><i class="fas fa-info-circle mr-1 text-slate-400"></i> Nota Jurisprudencial (Corte Suprema)</h4>
                            <p class="text-[11px] text-slate-500 mt-1 leading-relaxed">
                                Si se aplica el criterio de la Sentencia <a href="https://www.cortesuprema.gov.co/corte/wp-content/uploads/relatorias/la/bnov2022/SL3501-2022.pdf" target="_blank" class="text-secondary hover:underline font-bold">SL3501-2022</a> (eliminando el tope máximo de 1.800 semanas para el cálculo de incrementos), 
                                la tasa de reemplazo sería de <strong>${(res.vB.rate * 100).toFixed(2)}%</strong>, proyectando una Mesada Bruta de <strong>${formatCurrency(res.vB.mesada)}</strong> 
                                y un Neto a Pagar de <strong>${formatCurrency(res.vB.mesadaNeta)}</strong>, lo cual representaría un diferencial a favor de <strong>${formatCurrency(res.vB.mesada - res.vA.mesada)}</strong> al mes.
                            </p>
                        </div>
                    </div>
                    ` : ''}
                </div>

                <div class="mt-8 flex flex-col md:flex-row justify-end gap-4 w-full">
                    <button id="btn-export-excel-dyn" class="bg-green-600 text-white px-8 py-4 rounded-xl font-bold hover:bg-green-700 transition-colors flex items-center justify-center space-x-3 shadow-md w-full md:w-auto">
                        <i class="fas fa-file-excel text-xl"></i>
                        <span>Detalle Pensión</span>
                    </button>
                    <button id="btn-export-pdf-dyn" class="bg-red-600 text-white px-8 py-4 rounded-xl font-bold hover:bg-red-700 transition-colors flex items-center justify-center space-x-3 shadow-md w-full md:w-auto">
                        <i class="fas fa-file-pdf text-xl"></i>
                        <span>Informe Detallado</span>
                    </button>
                </div>
            </div>
        `;
        DOM.containers.results.innerHTML = html;
        const btnPdf = document.getElementById('btn-export-pdf-dyn');
        if (btnPdf) btnPdf.addEventListener('click', exportPDF);
        const btnExcel = document.getElementById('btn-export-excel-dyn');
        if (btnExcel) btnExcel.addEventListener('click', exportExcel);
    }

    function exportPDF() {
        const { jsPDF } = window.jspdf;
        const res = state.results;
        const doc = new jsPDF('landscape'); 
        const W = doc.internal.pageSize.getWidth();
        const H = doc.internal.pageSize.getHeight();
        
        const addFooter = () => {
            doc.setFontSize(7);
            doc.setTextColor(150, 150, 150);
            doc.text("NOTA LEGAL: Este documento es una simulación matemática estimada y automatizada basada en la Ley 100/1993 y jurisprudencia aplicable. No constituye un dictamen pericial definitivo, asesoría legal vinculante, ni obliga a Colpensiones o autoridades judiciales.", W/2, H - 10, { align: 'center' });
        };

        doc.setFillColor(15, 23, 42); 
        doc.rect(0, 0, W, 40, 'F');
        doc.setTextColor(255, 255, 255); 
        doc.setFontSize(20); 
        doc.text("REPORTE DE SIMULACIÓN PENSIONAL", W/2, 25, { align: 'center' });
        
        doc.setTextColor(15, 23, 42); 
        doc.setFontSize(14); 
        doc.text("1. Resumen de Proyección y Reliquidación", 15, 55);
        
        doc.setFontSize(10); 
        doc.text(`Afiliado: ${state.formData.nombre}`, 15, 65); 
        doc.text(`Documento: ${state.formData.cedula}`, 15, 70);
        doc.text(`Semanas Totales Computadas: ${res.totalSem.toFixed(2)}`, 15, 75);
        doc.text(`IBL Indexado Ponderado: ${formatCurrency(res.ibl)}`, 15, 80);
        
        doc.autoTable({ 
            startY: 85, 
            head: [['Concepto', 'Cálculo Administrativo (Colpensiones)', 'Proyección Jurisprudencial (CSJ SL3501-2022)']], 
            body: [
                ['Mesada Bruta Estimada', formatCurrency(res.vA.mesada), formatCurrency(res.vB.mesada)], 
                [`Descuento Ley 2018/2020 Salud`, `-${formatCurrency(res.vA.descuentoSalud)} (${res.vA.porcentajeSalud}%)`, `-${formatCurrency(res.vB.descuentoSalud)} (${res.vB.porcentajeSalud}%)`],
                ['Mesada Neta a Pagar', formatCurrency(res.vA.mesadaNeta), formatCurrency(res.vB.mesadaNeta)],
                ['Beneficio Jurisprudencial (Bruto)', '-', `+ ${formatCurrency(res.vB.mesada - res.vA.mesada)}`]
            ], 
            theme: 'grid', 
            headStyles: { fillColor: [15, 23, 42] },
            styles: { fontSize: 11, cellPadding: 3, fontStyle: 'bold' }
        });

        doc.setFontSize(12);
        doc.text("2. Desglose Teórico de la Tasa de Reemplazo", 15, doc.lastAutoTable.finalY + 15);

        const baseRateStr = res.tasaBase.toFixed(2) + '%';
        const semExtraA = res.vA.extra;
        const semExtraB = res.vB.extra;
        const gruposA = Math.floor(semExtraA / 50);
        const gruposB = Math.floor(semExtraB / 50);
        const incA = (gruposA * 1.5).toFixed(2) + '%';
        const incB = (gruposB * 1.5).toFixed(2) + '%';
        const rateA = (res.vA.rate * 100).toFixed(2) + '%';
        const rateB = (res.vB.rate * 100).toFixed(2) + '%';

        doc.autoTable({
            startY: doc.lastAutoTable.finalY + 20,
            head: [['Fase de Estimación', 'Método Administrativo (Tope 1800 Sem.)', 'Método CSJ (Sin Límite Semanas)']],
            body: [
                ['Tasa Base', baseRateStr, baseRateStr],
                ['Semanas Adicionales a las 1.300', semExtraA.toFixed(1) + ' (Tope administrativo max)', semExtraB.toFixed(1) + ' (Totales estimadas)'],
                ['Grupos de 50 Semanas Completos', gruposA, gruposB],
                ['Incremento Proyectado (Grupos x 1.5%)', incA, incB],
                ['Tasa de Reemplazo Teórica (Max. 80%)', rateA, rateB]
            ],
            theme: 'striped',
            headStyles: { fillColor: [146, 64, 14] }, 
            styles: { fontSize: 10, cellPadding: 2 }
        });

        addFooter(); 

        doc.addPage();
        doc.setFillColor(15, 23, 42); 
        doc.rect(0, 0, W, 30, 'F');
        doc.setTextColor(255, 255, 255); 
        doc.setFontSize(16); 
        doc.text(`ANEXO MATEMÁTICO: PROYECCIÓN DETALLADA (${res.bestName.toUpperCase()})`, W/2, 20, { align: 'center' });

        doc.autoTable({
            startY: 38,
            head: [['Resumen de Parámetros de Liquidación (Fórmula de Ponderación Actuarial)', 'Valor Numérico Contabilizado']],
            body: [
                ['Ecuación de Ponderación', '=SUMA(IA X #DIAS) / Total Días Computados'],
                ['Sumatoria Histórica de Productos Financieros (IA x Días)', formatCurrency(res.sumIaXDias)],
                ['Divisor de Tiempos Reglamentarios (Total Días Computados)', res.diasComputadosTotales],
                ['IBL Estimado Definitivo (Ingreso Base de Liquidación)', formatCurrency(res.ibl)]
            ],
            theme: 'grid',
            headStyles: { fillColor: [71, 85, 105], halign: 'left', fontSize: 11 },
            styles: { fontSize: 10, cellPadding: 4 },
            columnStyles: {
                0: { fontStyle: 'bold', textColor: [51, 65, 85] },
                1: { fontStyle: 'bold', textColor: [15, 23, 42], halign: 'right' }
            }
        });

        const tableBody = res.detailedReport.map(r => [
            r.empresa.substring(0, 18),
            r.desde, r.hasta, r.dias,
            r.fechaIpcFinal, r.ipcFinal.toFixed(4),
            r.fechaIpcInicial, r.ipcInicial.toFixed(4),
            formatCurrency(r.ibcHistorico), formatCurrency(r.ibcIndexado),
            formatCurrency(r.iaXDias) 
        ]);

        doc.autoTable({
            startY: doc.lastAutoTable.finalY + 12,
            head: [['Razón Social / Aportante', 'Desde', 'Hasta', 'Días', 'F. IPC Final', 'IPC Final', 'F. IPC Inicial', 'IPC Inicial', 'Salario Base', 'Salario Indexado (IA)', 'IA X #DIAS']],
            body: tableBody,
            theme: 'striped',
            styles: { fontSize: 7, cellPadding: 1.5 },
            headStyles: { fillColor: [15, 23, 42] },
            columnStyles: {
                8: { halign: 'right' },
                9: { halign: 'right', fontStyle: 'bold' },
                10: { halign: 'right', fontStyle: 'bold', textColor: [4, 120, 87] } 
            }
        });

        addFooter(); 
        doc.save(`Proyeccion_Pensional_${state.formData.cedula}.pdf`);
    }

    function exportExcel() {
        const res = state.results;
        const fd = state.formData;
        
        // Determinar cuál es el mejor cálculo (mayor IBL)
        const bestCalc = res.calcTodaVida && res.calcTodaVida.ibl > res.calc10Years.ibl 
            ? res.calcTodaVida : res.calc10Years;
        const bestReport = bestCalc === res.calcTodaVida 
            ? (res.detailedReportTodaVida || []) : (res.detailedReport10Years || []);
        const bestTitle = bestCalc === res.calcTodaVida 
            ? 'TODA LA VIDA (ART. 21 LEY 100)' : '10 ÚLTIMOS AÑOS (3.600 DÍAS)';

        // === HOJA PRINCIPAL: Formato tipo captura de pantalla ===
        const headerData = [
            ['LIQUIDACIÓN DE PENSIÓN ' + bestTitle + ' - TU ABOGADO LABORAL'],
            [],
            ['', 'NOMBRE', fd.nombre || 'Usuario ' + fd.cedula, 'Nombre del cliente'],
            ['', 'CEDULA', fd.cedula, 'Cédula'],
            ['', 'EN EL QUE SE LIQUIDARÁ', fd.anoLiquidacion, 'Año en el cual se liquida'],
            ['', 'USUARIO COLPENSIONES', '', 'Usuario para consulta en línea'],
            ['', 'PASSWORD', '', 'Clave de acceso'],
            [],
            ['', 'SMLV AÑO LIQUIDACIÓN', fd.smlv, 'Salario Mínimo año liquidación'],
            ['', 'IBL', bestCalc.ibl, 'Ingreso Base Liquidación'],
            ['', 'TASA DE REEMPLAZO - H', (res.vA.rate * 100).toFixed(2) + '%', 'Promedio Ponderado de los porcentajes'],
            [],
            ['', 'MONTO DE LA PENSIÓN', '$', res.vA.mesada, 'Monto de la pensión mensual'],
            []
        ];

        // Headers de la tabla de detalle
        const tableHeaders = [
            'Nit Empresa',
            'Empresa',
            'IBC (SALARIO)',
            'Fecha desde',
            'Fecha hasta',
            'semanas',
            'Num días',
            'días Acum',
            'Fecha IPC Final',
            'IPC final',
            'Fecha IPC Inicial',
            'IPC inicial',
            'IBC INDEXADO (IA)'
        ];

        let diasAcum = 0;
        const tableData = bestReport.map(r => {
            diasAcum += r.dias;
            return [
                '', // NIT (not available in report, placeholder)
                r.empresa,
                r.ibcHistorico,
                r.desde,
                r.hasta,
                (r.dias / 7).toFixed(2),
                r.dias,
                diasAcum,
                r.fechaIpcFinal,
                r.ipcFinal,
                r.fechaIpcInicial,
                r.ipcInicial,
                r.iaXDias
            ];
        });

        // Fila de totales
        const totalsRow = [
            'TOTALES', '', '', '', '',
            (bestCalc.consumedDays / 7).toFixed(2),
            bestCalc.consumedDays,
            diasAcum,
            '', '', '', '',
            bestCalc.sumIaXDias
        ];

        const allData = [...headerData, tableHeaders, ...tableData, totalsRow];
        const wsMain = XLSX.utils.aoa_to_sheet(allData);
        wsMain['!cols'] = [
            {wch: 5}, {wch: 30}, {wch: 18}, {wch: 14}, {wch: 14},
            {wch: 10}, {wch: 10}, {wch: 10}, {wch: 18}, {wch: 12},
            {wch: 18}, {wch: 12}, {wch: 20}
        ];

        // === HOJA RESUMEN: Comparación de ambos métodos de pensión ===
        const resumenData = [
            ['RESUMEN COMPARATIVO DE SIMULACIÓN PENSIONAL'],
            ['Base Legal:', 'Ley 100 de 1993 / Ley 797 de 2003'],
            [],
            ['DATOS DEL AFILIADO'],
            ['Nombre:', fd.nombre || 'Usuario ' + fd.cedula],
            ['Documento:', fd.cedula],
            ['Edad:', fd.edad],
            ['Género:', fd.genero === 'F' ? 'Femenino' : 'Masculino'],
            ['SMLV:', fd.smlv],
            [],
            ['COMPARACIÓN IBL'],
            ['', 'Últimos 10 Años', 'Toda la Vida'],
            ['Días Computados', res.calc10Years ? res.calc10Years.consumedDays : 0, res.calcTodaVida ? res.calcTodaVida.consumedDays : 0],
            ['Sumatoria (IA × Días)', res.calc10Years ? res.calc10Years.sumIaXDias : 0, res.calcTodaVida ? res.calcTodaVida.sumIaXDias : 0],
            ['IBL ($)', res.calc10Years ? res.calc10Years.ibl : 0, res.calcTodaVida ? res.calcTodaVida.ibl : 0],
            ['>>> MEJOR IBL:', res.bestName, res.ibl],
            [],
            ['CÁLCULO DE PENSIÓN (Mejor IBL)'],
            ['Semanas Totales:', res.totalSem],
            ['IBL ($):', res.ibl],
            ['Tasa Base (65.5 - 0.5s):', res.tasaBase.toFixed(2) + '%'],
            [],
            ['PROYECCIÓN DUAL'],
            ['', 'Colpensiones (Tope 1.800 sem)', 'Jurisprudencial (CSJ SL3501-2022)'],
            ['Semanas Adicionales (>1.300)', res.vA.extra.toFixed(2), res.vB.extra.toFixed(2)],
            ['Grupos de 50 Semanas', res.vA.grupos, res.vB.grupos],
            ['Incremento Densidad', (res.vA.grupos * 1.5).toFixed(2) + '%', (res.vB.grupos * 1.5).toFixed(2) + '%'],
            ['Tasa de Reemplazo (máx 80%)', (res.vA.rate * 100).toFixed(2) + '%', (res.vB.rate * 100).toFixed(2) + '%'],
            ['Mesada Bruta ($)', res.vA.mesada, res.vB.mesada],
            ['Descuento Salud', '-' + res.vA.descuentoSalud + ' (' + res.vA.porcentajeSalud + '%)', '-' + res.vB.descuentoSalud + ' (' + res.vB.porcentajeSalud + '%)'],
            ['Mesada Neta ($)', res.vA.mesadaNeta, res.vB.mesadaNeta],
            [],
            ['Diferencial Mensual Bruto:', res.vB.mesada - res.vA.mesada],
            ['Diferencial Anual (×13):', (res.vB.mesada - res.vA.mesada) * 13],
            [],
            ['Nota:', 'Este documento es una simulación matemática estimada. No constituye dictamen pericial definitivo.']
        ];

        const wsResumen = XLSX.utils.aoa_to_sheet(resumenData);
        wsResumen['!cols'] = [{wch: 35}, {wch: 35}, {wch: 35}];

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, wsMain, 'Liquidación Pensional');
        XLSX.utils.book_append_sheet(workbook, wsResumen, 'Resumen Comparativo');

        XLSX.writeFile(workbook, `Simulacion_Pensional_${fd.cedula}.xlsx`);
    }

    function goToStep(s) {
        DOM.steps.forEach((el, i) => {
            if (i + 1 === s) {
                el.classList.remove('hidden-step');
                el.classList.remove('hidden');
            } else {
                el.classList.add('hidden-step');
            }
        });
        
        DOM.stepperDots.forEach((dot, i) => {
            const num = i + 1;
            if (num < s) {
                dot.className = 'stepper-dot w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm border-2 transition-all duration-300 bg-primary border-primary text-white cursor-pointer';
                dot.innerHTML = '<i class="fas fa-check w-5 h-5"></i>';
            } else if (num === s) {
                dot.className = 'stepper-dot w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm border-2 transition-all duration-300 bg-secondary border-secondary text-white shadow-md scale-110';
                dot.innerHTML = num;
            } else {
                dot.className = 'stepper-dot w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm border-2 transition-all duration-300 bg-slate-50 border-slate-200 text-slate-400';
                dot.innerHTML = num;
            }
        });
        
        DOM.stepperLines.forEach((line, i) => {
            if (i + 1 < s) {
                line.className = 'stepper-line h-1 flex-1 mx-2 rounded-full transition-all duration-500 bg-primary';
            } else {
                line.className = 'stepper-line h-1 flex-1 mx-2 rounded-full transition-all duration-500 bg-slate-200';
            }
        });
        state.step = s;
    }

    function setLoading(isLoading) {
        state.loading = isLoading;
        DOM.containers.error.classList.add('hidden-step');
    }

    function showError(msg) {
        DOM.containers.errorMsg.innerText = msg;
        DOM.containers.error.classList.remove('hidden-step');
        DOM.containers.error.classList.remove('hidden');
        DOM.containers.error.scrollIntoView({ behavior: 'smooth' });
    }

    function hideError() {
        DOM.containers.error.classList.add('hidden-step');
    }

    // Inicializar navegación por Stepper
    DOM.stepperDots.forEach((dot, i) => {
        dot.addEventListener('click', () => {
            const targetStep = i + 1;
            // Solo permitir volver a pasos anteriores (o al mismo), no saltar adelante sin validación
            if (targetStep < state.step) {
                goToStep(targetStep);
            }
        });
    });

    // Inicializar
    DOM.inputs.smlv.value = state.formData.smlv;
    checkReadyToUpload();
});