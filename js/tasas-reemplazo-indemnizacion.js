// js/tasas-reemplazo-indemnizacion.js
// Tasas de reemplazo (función getTasaP) usada por la herramienta de indemnización sustitutiva.
(function(){
    function getTasaP(year){
        if (!year || isNaN(year)) return 0.13;
        year = Number(year);
        if (year <= 1984) return 0.045;
        if (year <= 1991) return 0.065;
        if (year <= 1994) return 0.08;
        if (year === 1995) return 0.09;
        if (year <= 2002) return 0.10;
        if (year === 2003) return 0.105;
        if (year === 2004) return 0.115;
        if (year === 2005) return 0.12;
        if (year <= 2007) return 0.125;
        return 0.13;
    }
    window.getTasaP = getTasaP;
})();
