import os

target_dir = r"c:\Users\Usuario\OneDrive - SALGADO MELENDEZ Y ASOCIADOS INGENEIROS CONSULTORES SA\Documentos\web-Abogado-laboral"
files = [f for f in os.listdir(target_dir) if f.startswith("herramienta-") and f.endswith(".html")]

print(f"Processing {len(files)} files...")

for filename in files:
    path = os.path.join(target_dir, filename)
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Find <main>
    main_idx = content.find("<main>")
    if main_idx == -1:
        print(f"[SKIP] {filename}: No <main> found.")
        continue

    # Look for </header> AFTER <main>
    # We want to find the first occurrence of </header> that comes AFTER the <main> tag.
    header_end_idx = content.find("</header>", main_idx)
    
    if header_end_idx == -1:
        print(f"[SKIP] {filename}: No </header> found inside <main>.")
        continue
        
    # Check if there is a 'valid' header before main to ensure we are targeting a duplicate
    # The valid header should end BEFORE main_idx
    first_header_end = content.rfind("</header>", 0, main_idx)
    if first_header_end == -1:
         print(f"[WARNING] {filename}: No header found BEFORE <main>. File structure might be weird.")
         # Proceeding anyway usually, but good to note.

    # Calculate the removal range
    # Start: immediately after <main> (content[main_idx + 6])
    # End: immediately after </header> (header_end_idx + 9)
    
    start_cut = main_idx + 6
    end_cut = header_end_idx + 9
    
    # Extract the block to be removed for logging/verification
    removed_block = content[start_cut:end_cut]
    
    # Sanity check: the block should be substantial (e.g. > 100 chars)
    if len(removed_block) < 50:
        print(f"[SKIP] {filename}: Block to remove is too small ({len(removed_block)} chars). suspicious.")
        continue
        
    print(f"[FIXING] {filename}: Removing {len(removed_block)} chars.")
    
    new_content = content[:start_cut] + content[end_cut:]
    
    with open(path, 'w', encoding='utf-8') as f:
        f.write(new_content)

print("Done.")
