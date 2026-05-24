# grep_all.py
import os

keyword = "calcularIndemnizacionSustitutiva"
for root, dirs, files in os.walk("."):
    if ".git" in root or ".gemini" in root:
        continue
    for file in files:
        if file.endswith((".html", ".js")):
            path = os.path.join(root, file)
            with open(path, "r", encoding="utf-8", errors="ignore") as f:
                content = f.read()
                if keyword in content:
                    print(f"Found in {path}")
