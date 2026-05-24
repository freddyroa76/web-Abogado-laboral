# diagnose_and_run.py
import re
import datetime
from pypdf import PdfReader

def clean_ibc(val):
    if not val:
        return 0
    s = re.sub(r'[^\d.,\-]', '', str(val)).strip()
    if not s:
        return 0
    if re.search(r',\d{3}', s):
        s = s.replace(',', '')
    else:
        s = s.replace('.', '').replace(',', '.')
    try:
        return float(s)
    except ValueError:
        return 0

def parse_flexible_date(val):
    if not val:
        return None
    s = str(val).strip()
    parts = re.split(r'[\/\-]', s)
    if len(parts) == 3:
        if len(parts[2]) == 4:
            return datetime.date(int(parts[2]), int(parts[1]), int(parts[0]))
        elif len(parts[0]) == 4:
            return datetime.date(int(parts[0]), int(parts[1]), int(parts[2]))
    return None

def get_tasa_safe(fecha):
    ts = datetime.datetime(fecha.year, fecha.month, fecha.day)
    _TASAS = [
        (datetime.datetime(1946, 1, 1), datetime.datetime(1966, 12, 31), 0.0455),
        (datetime.datetime(1967, 1, 1), datetime.datetime(1971, 12, 31), 0.045),
        (datetime.datetime(1972, 1, 1), datetime.datetime(1977, 1, 31), 0.06755),
        (datetime.datetime(1977, 2, 1), datetime.datetime(1982, 2, 28), 0.09),
        (datetime.datetime(1982, 3, 1), datetime.datetime(1985, 9, 30), 0.1125),
        (datetime.datetime(1985, 10, 1), datetime.datetime(1993, 12, 31), 0.065),
        (datetime.datetime(1994, 1, 1), datetime.datetime(1994, 12, 31), 0.115),
        (datetime.datetime(1995, 1, 1), datetime.datetime(1995, 12, 31), 0.125),
        (datetime.datetime(1996, 1, 1), datetime.datetime(2003, 12, 31), 0.135),
        (datetime.datetime(2004, 1, 1), datetime.datetime(2004, 12, 31), 0.145),
        (datetime.datetime(2005, 1, 1), datetime.datetime(2005, 12, 31), 0.15),
        (datetime.datetime(2006, 1, 1), datetime.datetime(2007, 12, 31), 0.155),
        (datetime.datetime(2008, 1, 1), datetime.datetime(2026, 12, 31), 0.16)
    ]
    for d, h, p in _TASAS:
        if d <= ts <= h:
            return p
    return 0.16

def run():
    print("Reading PDF...")
    reader = PdfReader("historiaLaboral (1)_unlocked.pdf")
    full_text = ""
    for page in reader.pages:
        full_text += page.extract_text() + "\n"
    
    # Locate titles
    title_resumen = r"RESUMEN\s*DE\s*SEMANAS\s*COTIZADAS"
    title_pre95 = r"DETALLE\s*DE\s*PAGOS\s*EFECTUADOS\s*ANTERIORES\s*A\s*1995"
    title_post95 = r"DETALLE\s*DE\s*PAGOS\s*EFECTUADOS\s*A\s*PARTIR\s*DE\s*1995"
    
    idx_resumen = re.search(title_resumen, full_text, re.IGNORECASE)
    idx_pre95 = re.search(title_pre95, full_text, re.IGNORECASE)
    idx_post95 = re.search(title_post95, full_text, re.IGNORECASE)
    
    if not (idx_resumen and idx_pre95 and idx_post95):
        print(f"Error: missing sections!")
        return
        
    pre95_text = full_text[idx_pre95.start():idx_post95.start()]
    post95_text = full_text[idx_post95.start():]
    
    print("Extracting pre-1995 records...")
    matches = []
    
    # Updated regex for pre95: handles missing space between IBC and Hasta date, e.g. "14.61031/07/1985"
    regex_pre95 = re.compile(
        r"(\d{5,15})\s+([^$]+?)\s+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})\s+([\-\d.,]+)\s*\$\s*([\d.,]+?)(?=\d{2}[\/\-]\d{2}[\/\-]\d{4})\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})", 
        re.IGNORECASE
    )
    
    for m in regex_pre95.finditer(pre95_text):
        emp = m.group(2).strip().upper()
        if "RAZÓN SOCIAL" in emp or "ADMINISTRADORA" in emp or "NOMBRE AFILIADO" in emp or emp == "NIT": continue
        ibc = clean_ibc(m.group(5))
        dias = clean_ibc(m.group(4))
        if ibc < 1000 or dias == 0: continue
        matches.append({
            'seccion': 'pre1995', 'nit': m.group(1), 'empresa': m.group(2).strip(),
            'desde': m.group(3), 'hasta': m.group(6), 'ibc': ibc, 'dias': int(dias), 'diasCot': int(dias)
        })
        
    print(f"Extracted {len(matches)} pre-1995 records.")

    print("Extracting post-1995 records...")
    # Post-1995 Regex
    regex_post95 = re.compile(r"(\d{5,15})\s+(.{3,60}?)\s+(SI|NO)\s+(\d{4})(\d{2})\s+\$\s*([\d.,]+)\s+\$\s*([\d.,]+)\s+\$\s*([\d.,\-]*)\s+(?:([A-Z]?)\s+)?(\d{1,3})\s+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})\s+(\S+)(?:\s+(.*?))?\s+(\d{1,3})(?=\s+\d{5,15}\s|$|\s+(?:TOTAL|RESUMEN|P[AÁaá]GINA))", re.IGNORECASE)
    post_count = 0
    for m in regex_post95.finditer(post95_text):
        emp = m.group(2).strip().upper()
        if "RAZÓN SOCIAL" in emp or "NOMBRE" in emp or emp == "NIT": continue
        ibc = clean_ibc(m.group(6))
        if ibc < 1000: continue
        
        year = int(m.group(4))
        month = int(m.group(5))
        dias_cot = int(m.group(14))
        dias_rep = int(m.group(10))
        
        if month in (1,3,5,7,8,10,12): last_day = 31
        elif month in (4,6,9,11): last_day = 30
        else: last_day = 29 if year % 4 == 0 and (year % 100 != 0 or year % 400 == 0) else 28
        
        desde = f"01/{month:02d}/{year}"
        hasta = f"{last_day:02d}/{month:02d}/{year}"
        
        matches.append({
            'seccion': 'post1995', 'nit': m.group(1), 'empresa': m.group(2).strip(),
            'desde': desde, 'hasta': hasta, 'ibc': ibc, 'dias': dias_rep, 'diasCot': dias_cot
        })
        post_count += 1

    print(f"Extracted {post_count} post-1995 records.")
    print(f"Total records: {len(matches)}")
    
    # Run the calculation logic
    print("Simulating calculation...")
    try:
        def mock_get_ipc(key):
            # just return a dummy float
            return 150.0
            
        res = calculate_indemnizacion(matches, mock_get_ipc)
        print("Success! Result:")
        print(f"Total days: {res['totalDias']}")
        print(f"SC (Semanas): {res['SC']}")
        print(f"SBC: {res['SBC']}")
        print(f"PPC: {res['PPC']}")
        print(f"Indemnizacion: {res['indemnizacion']}")
        print(f"detailedReport length: {len(res['detailedReport'])}")
    except Exception as e:
        print("Calculation failed with error:")
        import traceback
        traceback.print_exc()

def calculate_indemnizacion(history, safe_get_ipc):
    ipc_final = 158.1651
    pre95 = []
    post95 = []
    
    for row in history:
        d_start = parse_flexible_date(row['desde'])
        is_pre = d_start and d_start.year < 1995
        if is_pre:
            pre95.append(row)
        else:
            post95.append(row)
            
    detailed_report = []
    
    # Process pre95
    covered_pre = set()
    for row in pre95:
        d_start = parse_flexible_date(row['desde'])
        d_end = parse_flexible_date(row['hasta'])
        
        overlap = 0
        cur = d_start
        while cur <= d_end:
            key = f"{cur.year}-{cur.month}-{cur.day}"
            if key in covered_pre:
                overlap += 1
            else:
                covered_pre.add(key)
            cur += datetime.timedelta(days=1)
            
        raw_dias = row['diasCot']
        eff_overlap = overlap
        tot_days = (d_end - d_start).days + 1
        if tot_days > 0 and raw_dias < tot_days:
            eff_overlap = int(overlap * (raw_dias / tot_days))
            
        calc_dias = max(0, raw_dias - eff_overlap)
        tasa = get_tasa_safe(d_start)
        
        detailed_report.append({
            'seccion': 'pre1995', 'dias': row['dias'], 'diasCot': calc_dias, 'semanas': calc_dias / 7,
            'ibc_indexado': row['ibc'], 'tasaP': tasa, 'esMora': False, 'desde': row['desde'], 'hasta': row['hasta'],
            'ibcHistorico': row['ibc']
        })
        
    # Process post95
    expanded_months = {}
    for row in post95:
        d_start = parse_flexible_date(row['desde'])
        d_end = parse_flexible_date(row['hasta'])
        
        cur = d_start
        while cur <= d_end:
            y = cur.year
            m = cur.month
            if m in (1,3,5,7,8,10,12): l_day = 31
            elif m in (4,6,9,11): l_day = 30
            else: l_day = 29 if y % 4 == 0 and (y % 100 != 0 or y % 400 == 0) else 28
            
            end_of_month = datetime.date(y, m, l_day)
            act_end = d_end if d_end < end_of_month else end_of_month
            
            is_full = cur.day == 1 and act_end.day >= 30
            if is_full:
                assigned = 30
            else:
                assigned = min(30, (act_end - cur).days + 1)
                
            m_key = f"{y}-{m:02d}"
            if m_key not in expanded_months:
                expanded_months[m_key] = {
                    'dias': min(30, assigned),
                    'sumIbcXDias': row['ibc'] * assigned
                }
            else:
                expanded_months[m_key]['dias'] = min(30, expanded_months[m_key]['dias'] + assigned)
                expanded_months[m_key]['sumIbcXDias'] += row['ibc'] * assigned
                
            cur = datetime.date(y, m, 1) + datetime.timedelta(days=32)
            cur = datetime.date(cur.year, cur.month, 1)
            
    for key, seg in expanded_months.items():
        eff_ibc = seg['sumIbcXDias'] / seg['dias']
        parts = key.split('-')
        fecha = datetime.date(int(parts[0]), int(parts[1]), 1)
        tasa = get_tasa_safe(fecha)
        detailed_report.append({
            'seccion': 'post1995', 'dias': seg['dias'], 'diasCot': seg['dias'], 'semanas': seg['dias'] / 7,
            'ibc_indexado': eff_ibc, 'tasaP': tasa, 'esMora': False, 'desde': f"01/{parts[1]}/{parts[0]}",
            'hasta': f"30/{parts[1]}/{parts[0]}", 'ibcHistorico': eff_ibc
        })
        
    sc_total = sum(p['semanas'] for p in detailed_report if not p['esMora'] and p['semanas'] > 0)
    if sc_total <= 0:
        raise ValueError("No hay semanas cotizadas.")
        
    sum_tasa = sum(p['tasaP'] * p['semanas'] for p in detailed_report if not p['esMora'] and p['semanas'] > 0)
    sum_sal = sum(p['ibc_indexado'] * p['semanas'] for p in detailed_report if not p['esMora'] and p['semanas'] > 0)
    
    ppc = sum_tasa / sc_total
    prom = sum_sal / sc_total
    sbc = prom * 7 / 30
    isp = sbc * sc_total * ppc
    
    return {
        'totalDias': sc_total * 7,
        'SC': sc_total,
        'SBC': sbc,
        'PPC': ppc,
        'indemnizacion': isp,
        'detailedReport': detailed_report
    }

if __name__ == '__main__':
    run()
