import glob
import os

def analyze_file(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
            lines = f.readlines()
    except Exception as e:
        return f"Error reading: {e}"

    first_section_idx = -1
    for i, line in enumerate(lines):
        if '<section class="bg-light"' in line or 'style="padding: 40px 0"' in line and '<section' in line:
            first_section_idx = i
            break
    
    if first_section_idx == -1:
        return "No <section> found"

    calc_wrapper_idx = -1
    for i, line in enumerate(lines):
        if 'class="calc-wrapper"' in line:
            calc_wrapper_idx = i
            if i > first_section_idx + 10: # find the one after the first section
                 break
    
    # Special case for 404, politica, etc.
    if calc_wrapper_idx == -1:
         # Try find error-container or legal-content
         for i, line in enumerate(lines):
             if 'class="error-container"' in line or 'class="legal-content"' in line:
                 calc_wrapper_idx = i
                 if i > first_section_idx + 5:
                     break
         
    if calc_wrapper_idx == -1:
        return "No content wrapper found"

    # Check for duplicate headers
    garbage_range = lines[first_section_idx+1 : calc_wrapper_idx]
    has_dup_header = any('<header>' in l for l in garbage_range)
    
    if has_dup_header:
        # Determine strict range
        start_line = first_section_idx + 2 # 1-indexed, line after section match
        end_line = calc_wrapper_idx + 1 # 1-indexed, line OF the content wrapper.
        
        # We want to remove up to the line BEFORE content wrapper.
        # But we also want to remove the OLD section tag which is likely line before content wrapper.
        
        return f"Fix: {start_line}-{end_line}"
    else:
        return "Clean"

files = glob.glob("*.html")
for f in files:
    print(f"{f}: {analyze_file(f)}")
