import os

target_dir = r"c:\Users\Usuario\OneDrive - SALGADO MELENDEZ Y ASOCIADOS INGENEIROS CONSULTORES SA\Documentos\web-Abogado-laboral"
files = [f for f in os.listdir(target_dir) if f.startswith("herramienta-") and f.endswith(".html")]

print(f"Found {len(files)} tool files.")

for f in files:
    path = os.path.join(target_dir, f)
    with open(path, 'r', encoding='utf-8') as f_obj:
        content = f_obj.read()
        
    head_count = content.lower().count("<head>")
    doctype_count = content.lower().count("<!doctype html>")
    
    if head_count > 1 or doctype_count > 1:
        print(f"[DUPLICATE FOUND] {f}: <head> count={head_count}, <!doctype> count={doctype_count}")
    else:
        print(f"[OK] {f}")
