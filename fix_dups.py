import glob
import os

def fix_file(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            lines = f.readlines()
    except Exception as e:
        print(f"Error reading {filepath}: {e}")
        return

    # Find first section (New Section)
    first_section_idx = -1
    for i, line in enumerate(lines):
        if '<section class="bg-light"' in line or 'style="padding: 40px 0"' in line and '<section' in line:
            first_section_idx = i
            break
    
    if first_section_idx == -1:
        print(f"Skipping {filepath}: No section found")
        return

    # Find content wrapper
    calc_wrapper_idx = -1
    for i, line in enumerate(lines):
        if 'class="calc-wrapper"' in line or 'class="error-container"' in line or 'class="legal-content"' in line:
            calc_wrapper_idx = i
            # Heuristic: The content wrapper we want is definitely AFTER the first section.
            # And usually there's a big gap if there is duplication.
            if i > first_section_idx + 5: 
                # Found a wrapper further down
                break
    
    if calc_wrapper_idx == -1:
         # Try looking for just text-center which sometimes wraps content?
         # No, stick to known envelopes.
         print(f"Skipping {filepath}: No wrapper found")
         return

    # Check for duplication between them
    garbage_slice = lines[first_section_idx+1 : calc_wrapper_idx]
    has_dup = any('<header>' in l for l in garbage_slice)

    if has_dup:
        print(f"Fixing {filepath}...")
        # Keep lines up to first_section_idx (inclusive)
        # Skip lines until calc_wrapper_idx
        # Keep lines from calc_wrapper_idx
        
        new_content = lines[:first_section_idx+1] + lines[calc_wrapper_idx:]
        
        with open(filepath, 'w', encoding='utf-8') as f:
            f.writelines(new_content)
        print(f"Fixed {filepath}.")
    else:
        print(f"{filepath} shows no duplication.")

files = glob.glob("*.html")
for f in files:
    fix_file(f)
