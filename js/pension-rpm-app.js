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
            smlv: SMLV_DATA[2026] || 1300000,
            aceptadoTyC: false
        },
        history: [],
        results: null,
        showDetails: false
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
            results: document.getElementById('results-container')
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

    const formatShortDate = (dateObj) => {
        if(!dateObj) return "";
        return `${String(dateObj.getDate()).padStart(2, '0')}/${String(dateObj.getMonth()+1).padStart(2, '0')}/${dateObj.getFullYear()}`;
    };

    const cleanIBC = (val) => {
        if (!val) return 0;
        const s = String(val).replace(/[^\d.,]/g, '');
        const parsed = parseFloat(s.replace(/\./g, '').replace(',', '.'));
        return isNaN(parsed) ? 0 : parsed;
    };

    const formatCurrency = (v) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v);

    function checkReadyToUpload() {
        const isCedulaValid = state.formData.cedula.trim().length >= 5 && /^\d+$/.test(state.formData.cedula.trim());
        const uploadZone = document.getElementById('upload-zone');
        const uploadLocked = document.getElementById('upload-locked');
        const uploadActive = document.getElementById('upload-active');
        
        if (isCedulaValid && state.formData.aceptadoTyC) {
            uploadZone.classList.remove('bg-slate-50/50', 'cursor-not-allowed', 'border-dashed', 'border-2', 'border-slate-300');
            uploadZone.classList.add('hover:bg-slate-50', 'cursor-pointer');
            uploadLocked.classList.add('hidden');
            uploadActive.classList.remove('hidden');
        } else {
            uploadZone.classList.add('bg-slate-50/50', 'cursor-not-allowed', 'border-dashed', 'border-2', 'border-slate-300');
            uploadZone.classList.remove('hover:bg-slate-50', 'cursor-pointer');
            uploadLocked.classList.remove('hidden');
            uploadActive.classList.add('hidden');
        }
    }

    DOM.inputs.cedula.addEventListener('input', (e) => {
        state.formData.cedula = e.target.value.replace(/\D/g, '');
        e.target.value = state.formData.cedula;
        checkReadyToUpload();
    });

    document.getElementById('tyc-checkbox').addEventListener('change', (e) => {
        state.formData.aceptadoTyC = e.target.checked;
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
    DOM.inputs.edad.addEventListener('input', (e) => state.formData.edad = e.target.value);

    DOM.inputs.fileResumen.addEventListener('change', async (e) => {
        const isCedulaValid = state.formData.cedula.trim().length >= 5 && /^\d+$/.test(state.formData.cedula.trim());
        if (!isCedulaValid || !state.formData.aceptadoTyC) return;
        
        const file = e.target.files[0];
        if (!file) return;
        
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
                fullText += content.items.map(item => item.str).join(" ") + "\n";
            }
            
            const regexPDF = /(\d{5,15})\s+([^\n\r]{3,60}?)\s+(\d{1,2}\s*[\/\-]\s*\d{1,2}\s*[\/\-]\s*\d{4})\s+(\d{1,2}\s*[\/\-]\s*\d{1,2}\s*[\/\-]\s*\d{4})\s+\$?\s*([\d.,]+)\s+([\d.,]+)/g;
            const matches = []; let m;
            
            while ((m = regexPDF.exec(fullText)) !== null) {
                const emp = m[2].trim().toUpperCase();
                if (emp.includes("RAZÓN SOCIAL") || emp.includes("ADMINISTRADORA") || emp.includes("NOMBRE AFILIADO") || emp === "NIT") continue;
                const ibc = cleanIBC(m[5]);
                const semanas = cleanIBC(m[6]);
                if (ibc < 1000 || semanas > 500 || semanas === 0) continue;
                
                const start = parseFlexibleDate(m[3]);
                const end = parseFlexibleDate(m[4]);
                
                // RESTAURADO: Cálculo de días reales calendario (+1 para que coincida con Colpensiones)
                const diasReales = Math.round((end - start) / 86400000) + 1;
                
                matches.push({ nit: m[1], empresa: m[2].trim(), desde: formatDateForDisplay(m[3]), hasta: formatDateForDisplay(m[4]), ibc: ibc, semanas: semanas, dias: diasReales });
            }
            if (matches.length === 0) throw new Error("No se detectaron filas de aportes válidas en el PDF. Intente subir el Excel (CSV).");
            state.history = matches;
            renderHistory();
            goToStep(2);
        } catch (e) { showError(e.message); } finally { setLoading(false); }
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
                    const smallVals = postDateVals.filter(v => v > 0 && v < 200);
                    const semanas = smallVals.length > 0 ? smallVals[smallVals.length - 1] : 0;
                    if (ibc > 0 && semanas > 0) {
                        const start = parseFlexibleDate(r[desdeIdx]);
                        const end = parseFlexibleDate(r[desdeIdx+1]);
                        
                        // RESTAURADO: Cálculo de días reales calendario
                        const diasReales = Math.round((end - start) / 86400000) + 1;
                        
                        validRows.push({ nit: String(r[desdeIdx-2] || ''), empresa: empresa, desde: formatDateForDisplay(r[desdeIdx]), hasta: formatDateForDisplay(r[desdeIdx+1]), ibc: ibc, semanas: Number(semanas.toFixed(2)), dias: diasReales });
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
        DOM.containers.historyCount.innerText = `${state.history.length} registros extraídos para estimación`;
        DOM.containers.historyTable.innerHTML = '';
        state.history.forEach((row, i) => {
            const tr = document.createElement('tr');
            tr.className = "border-b border-slate-100 hover:bg-blue-50/50 transition-colors";
            tr.innerHTML = `
                <td class="p-3 font-medium text-slate-700 truncate max-w-[200px]" title="${row.empresa}">${row.empresa}</td>
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

    function doIBLCalculation(isTodaVida = false) {
        const ipcFinalKey = `${state.formData.anoLiquidacion - 1}-12`;
        const ipcFinal = IPC_DATA[ipcFinalKey]; 
        if (!ipcFinal) {
            throw new Error(`No se encontró el IPC final para Diciembre de ${state.formData.anoLiquidacion - 1} en la base de datos.`);
        }
        
        let splitHistory = [];
        state.history.forEach((row) => {
            if (!row.desde || !row.hasta || row.ibc <= 0) return;
            const dStart = parseFlexibleDate(row.desde);
            const dEnd = parseFlexibleDate(row.hasta);
            if (!dStart || !dEnd || dStart > dEnd) return;

            let curStart = new Date(dStart.getTime());
            
            while (curStart <= dEnd) {
                let curYear = curStart.getFullYear();
                let endOfYear = new Date(curYear, 11, 31); 
                let actEnd = dEnd < endOfYear ? new Date(dEnd.getTime()) : new Date(endOfYear.getTime());
                
                // RESTAURADO: Segmentación en Días Reales Calendario
                const segmentDays = Math.round((actEnd - curStart) / 86400000) + 1;
                
                if (segmentDays > 0) {
                    splitHistory.push({ 
                        empresa: row.empresa,
                        desde: new Date(curStart.getTime()), 
                        hasta: new Date(actEnd.getTime()), 
                        dias: segmentDays, 
                        ibcMensualOriginal: row.ibc, 
                        year: curYear 
                    });
                }
                curStart = new Date(curYear + 1, 0, 1); 
            }
        });

        splitHistory.sort((a,b) => b.hasta - a.hasta);
        
        let targetDays = isTodaVida ? Infinity : 3600;
        let remainingDays = targetDays; 
        let sumIaXDias = 0; 
        let detailedReport = []; 
        let consumedDays = 0;
        
        splitHistory.forEach(seg => {
            if (remainingDays <= 0) return;
            const daysToTake = Math.min(seg.dias, remainingDays);
            
            const ipcInicialKey = `${seg.year - 1}-12`;
            const ipcInicial = IPC_DATA[ipcInicialKey] || 1; 
            
            const factorIndexacion = ipcFinal / ipcInicial;
            const ibcIndexadoIA = seg.ibcMensualOriginal * factorIndexacion;
            const iaXDias = ibcIndexadoIA * daysToTake; 
            
            detailedReport.push({
                empresa: seg.empresa,
                desde: formatShortDate(seg.desde),
                hasta: formatShortDate(seg.hasta),
                dias: daysToTake,
                fechaIpcFinal: `Dic ${state.formData.anoLiquidacion - 1}`,
                ipcFinal: ipcFinal,
                fechaIpcInicial: `Dic ${seg.year - 1}`,
                ipcInicial: ipcInicial,
                ibcHistorico: seg.ibcMensualOriginal, 
                ibcIndexado: ibcIndexadoIA, 
                iaXDias: iaXDias 
            });

            sumIaXDias += iaXDias;
            remainingDays -= daysToTake;
            consumedDays += daysToTake;
        });

        const ibl = consumedDays > 0 ? sumIaXDias / consumedDays : 0;
        return { ibl, consumedDays, sumIaXDias, detailedReport, isTodaVida };
    }

    DOM.buttons.calcParams.addEventListener('click', handleCalculate);

    function handleCalculate() {
        hideError();
        try {
            state.formData.nombre = document.querySelector('input[placeholder="Nombre Completo"]').value || 'Usuario';
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

            let ageInYears = parseFloat(state.formData.edad);
            const totalDiasOriginales = state.history.reduce((a,c) => a + c.dias, 0);
            const totalSem = totalDiasOriginales / 7;
            const requiredAge = state.formData.genero === 'F' ? 57 : 62;
            const isVerification = totalSem >= 1300 && ageInYears >= requiredAge;

            const calc10Years = doIBLCalculation(false);
            const calcTodaVida = doIBLCalculation(true);

            let bestCalc = calc10Years;
            let bestName = "Los Últimos 10 Años (3.600 Días)";
            
            if (calcTodaVida.ibl > calc10Years.ibl && totalSem >= 1250) {
                bestCalc = calcTodaVida;
                bestName = "Toda la Vida (Art. 21 Ley 100)";
            } else if (calcTodaVida.ibl > calc10Years.ibl && totalSem < 1250) {
                 console.warn("Toda la vida es superior, pero afiliado no alcanza 1250 semanas requeridas.");
            }

            const s = bestCalc.ibl / state.formData.smlv;
            let tasaBase = 65.5 - (0.5 * s);
            if (tasaBase < 55) tasaBase = 55.00;

            const getRes = (aplicarTopeSemanas) => {
                let semExtra = Math.max(0, totalSem - 1300);
                if (aplicarTopeSemanas) semExtra = Math.min(semExtra, 500); 
                const grupos = Math.floor(semExtra / 50);
                let tasaFinal = tasaBase + (grupos * 1.5);
                if (tasaFinal > 80.00) tasaFinal = 80.00; 
                
                const mesadaCalculada = Math.round(bestCalc.ibl * (tasaFinal / 100));
                const mesadaFinal = Math.max(state.formData.smlv, Math.min(mesadaCalculada, state.formData.smlv * 25)); 
                return { rate: tasaFinal / 100, extra: semExtra, grupos, mesada: mesadaFinal };
            };

            const vA = getRes(true); 
            const vB = getRes(false); 

            state.results = {
                ibl: bestCalc.ibl,
                bestName: bestName,
                totalSem: totalSem,
                tasaBase: tasaBase,
                detailedReport: bestCalc.detailedReport,
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
                        <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Tasa Base Decreciente</p>
                        <h3 class="text-2xl font-black text-primary mt-1">${res.tasaBase.toFixed(2)}%</h3>
                        <p class="text-xs text-slate-500 mt-1">Fórmula proyectada: 65.5 - 0.5s</p>
                    </div>
                </div>

                <div class="grid md:grid-cols-2 gap-6">
                    <div class="card-legal p-8 rounded-2xl flex flex-col">
                        <div class="mb-6">
                            <span class="text-[10px] font-bold px-2.5 py-1 rounded bg-slate-100 text-slate-500 tracking-wider">CÁLCULO ADMINISTRATIVO</span>
                            <h3 class="text-xl font-bold text-primary mt-3">Método Colpensiones</h3>
                            <p class="text-sm font-semibold text-slate-500 mt-1">Estimación Ley 797 de 2003</p>
                        </div>
                        <div class="space-y-3 mb-8 flex-1">
                            <div class="flex justify-between items-center text-sm border-b border-slate-100 pb-2">
                                <span class="text-slate-600">Tope limitante aplicado</span>
                                <span class="font-bold text-slate-800">1.800 Semanas</span>
                            </div>
                            <div class="flex justify-between items-center text-sm border-b border-slate-100 pb-2">
                                <span class="text-slate-600">Incremento proyectado</span>
                                <span class="font-bold text-slate-800">${(res.vA.extra / 50 * 1.5).toFixed(2)}%</span>
                            </div>
                            <div class="flex justify-between items-center text-sm border-b border-slate-100 pb-2">
                                <span class="text-slate-600 font-semibold">Tasa Estimada Resultante</span>
                                <span class="font-bold text-primary text-base">${(res.vA.rate * 100).toFixed(2)}%</span>
                            </div>
                        </div>
                        <div class="bg-slate-50 p-5 rounded-xl border border-slate-200 text-center">
                            <p class="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Mesada Base Proyectada</p>
                            <p class="text-3xl font-black text-slate-800">${formatCurrency(res.vA.mesada)}</p>
                        </div>
                    </div>

                    <div class="card-legal p-8 rounded-2xl flex flex-col relative border-secondary/30 ring-1 ring-secondary/20">
                        <div class="absolute top-0 right-0 bg-secondary text-white text-[10px] font-bold px-3 py-1.5 rounded-bl-lg rounded-tr-xl tracking-wider">PROYECCIÓN ÓPTIMA</div>
                        <div class="mb-6">
                            <span class="text-[10px] font-bold px-2.5 py-1 rounded bg-orange-50 text-secondary tracking-wider">CÁLCULO JURISPRUDENCIAL</span>
                            <h3 class="text-xl font-bold text-primary mt-3">Método Corte Suprema</h3>
                            <p class="text-sm font-semibold text-secondary mt-1">Estimación s/ SL3501-2022</p>
                        </div>
                        <div class="space-y-3 mb-8 flex-1">
                            <div class="flex justify-between items-center text-sm border-b border-slate-100 pb-2">
                                <span class="text-slate-600">Tope aplicable</span>
                                <span class="font-bold text-slate-800">Límite de ley (80%)</span>
                            </div>
                            <div class="flex justify-between items-center text-sm border-b border-slate-100 pb-2">
                                <span class="text-slate-600">Incremento proyectado</span>
                                <span class="font-bold text-secondary">${(Math.floor(res.vB.extra / 50) * 1.5).toFixed(2)}%</span>
                            </div>
                            <div class="flex justify-between items-center text-sm border-b border-slate-100 pb-2">
                                <span class="text-slate-600 font-semibold">Tasa Estimada Optima</span>
                                <span class="font-bold text-primary text-base">${(res.vB.rate * 100).toFixed(2)}%</span>
                            </div>
                        </div>
                        <div class="bg-orange-50/50 p-5 rounded-xl border border-secondary/20 text-center">
                            <p class="text-xs font-bold text-secondary uppercase tracking-wide mb-1">Mesada Reliquidada Proyectada</p>
                            <p class="text-3xl font-black text-primary">${formatCurrency(res.vB.mesada)}</p>
                        </div>
                    </div>
                </div>

                ${res.vB.mesada > res.vA.mesada ? `
                <div class="card-legal p-6 md:p-8 rounded-2xl flex flex-col md:flex-row justify-between items-center gap-6 bg-slate-50 border-l-4 border-l-primary mt-8">
                    <div class="flex-1 text-center md:text-left">
                        <h5 class="text-xl font-bold text-primary">Proyección a Favor: <span class="text-secondary">${formatCurrency(res.vB.mesada - res.vA.mesada)} Mensual</span></h5>
                        <p class="text-sm text-slate-600 mt-2 leading-relaxed">
                            Existe viabilidad matemática para buscar la reliquidación, dado que la estimación bajo los lineamientos de la Corte Suprema arroja una tasa superior. Esta proyección es de carácter orientativo.
                        </p>
                    </div>
                    <button id="btn-export-pdf-dyn" class="bg-primary text-white px-6 py-3.5 rounded-xl font-semibold hover:bg-slate-800 transition-colors flex items-center space-x-2 shrink-0 shadow-sm w-full md:w-auto justify-center">
                        <i class="fas fa-file-pdf"></i>
                        <span>Generar Reporte PDF</span>
                    </button>
                </div>
                ` : ''}
            </div>
        `;
        DOM.containers.results.innerHTML = html;
        const btnPdf = document.getElementById('btn-export-pdf-dyn');
        if (btnPdf) btnPdf.addEventListener('click', exportPDF);
    }

    function exportPDF() {
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
                ['Mesada Estimada Resultante', formatCurrency(res.vA.mesada), formatCurrency(res.vB.mesada)], 
                ['Diferencia Mensual Proyectada', '-', formatCurrency(res.vB.mesada - res.vA.mesada)]
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
                ['Tasa Base Decreciente Estimada', baseRateStr, baseRateStr],
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

        doc.setTextColor(15, 23, 42); 
        doc.setFontSize(11);
        
        doc.text(`Fórmula del IBL: =SUMA(IA X #DIAS) / Total Días Computados`, 15, 40);
        doc.text(`Sumatoria Total (IA X #DIAS): ${formatCurrency(res.sumIaXDias)}`, 15, 48);
        doc.text(`Total Días Computados: ${res.diasComputadosTotales}`, 15, 54);
        doc.text(`IBL Estimado Resultante: ${formatCurrency(res.ibl)}`, 15, 60);

        const tableBody = res.detailedReport.map(r => [
            r.empresa.substring(0, 18),
            r.desde, r.hasta, r.dias,
            r.fechaIpcFinal, r.ipcFinal.toFixed(4),
            r.fechaIpcInicial, r.ipcInicial.toFixed(4),
            formatCurrency(r.ibcHistorico), formatCurrency(r.ibcIndexado),
            formatCurrency(r.iaXDias) 
        ]);

        doc.autoTable({
            startY: 65,
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

    function goToStep(s) {
        DOM.steps.forEach((el, i) => {
            if (i + 1 === s) el.classList.remove('hidden');
            else el.classList.add('hidden');
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
        DOM.containers.error.classList.add('hidden');
    }

    function showError(msg) {
        DOM.containers.errorMsg.innerText = msg;
        DOM.containers.error.classList.remove('hidden');
        DOM.containers.error.scrollIntoView({ behavior: 'smooth' });
    }

    function hideError() {
        DOM.containers.error.classList.add('hidden');
    }

    // Inicializar
    checkReadyToUpload();
});