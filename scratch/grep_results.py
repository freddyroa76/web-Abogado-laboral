# grep_results.py
import re

with open("herramienta-calculos-regimen-prima-media-colpensiones.html", "r", encoding="utf-8") as f:
    lines = f.readlines()

print("Searching for 'results'...")
for i, line in enumerate(lines):
    if "results" in line:
        print(f"Line {i+1}: {line.strip()[:120]}")
