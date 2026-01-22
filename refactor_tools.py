import os
import re

files = [f for f in os.listdir('.') if f.endswith('.html') and (f.startswith('herramienta-') or f == 'politica-privacidad.html' or f == '404.html')]

csp_meta = '    <!-- Seguridad: CSP Básico -->\n    <meta http-equiv="Content-Security-Policy" content="default-src \'self\'; img-src \'self\' data: https:; script-src \'self\' \'unsafe-inline\' https:; style-src \'self\' \'unsafe-inline\' https:; font-src \'self\' https: data:;">'

for filename in files:
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Add CSP if not present
    if 'Content-Security-Policy' not in content:
        content = content.replace('<meta charset="UTF-8" />', '<meta charset="UTF-8" />\n' + csp_meta)
    
    # 2. Add Logo Dimensions
    # Looking for <img src="img/logo-principal.webp" ... class="logo-img" ...> or similar
    # Careful of existing attributes.
    if 'img/logo-principal.webp' in content and 'width="200"' not in content:
        content = re.sub(r'(<img[^>]*src="img/logo-principal\.webp"[^>]*?)(\s*/?>)', r'\1 width="200" height="55"\2', content)

    # 3. Main Wrapper
    if '<main>' not in content:
        # Insert <main> after </header>
        content = content.replace('</header>', '</header>\n    <main>')
        # Insert </main> before <footer>
        content = content.replace('<footer>', '    </main>\n    <footer>')

    with open(filename, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Processed {filename}")
