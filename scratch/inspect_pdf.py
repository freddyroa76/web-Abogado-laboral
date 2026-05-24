# inspect_pdf.py
from pypdf import PdfReader

reader = PdfReader("historiaLaboral (1)_unlocked.pdf")
print("Number of pages:", len(reader.pages))
for i in range(min(5, len(reader.pages))):
    print(f"--- Page {i+1} Snippet ---")
    text = reader.pages[i].extract_text()
    print(text[:1500])
