# search_full_transcript.py
import json

log_path = r"C:\Users\Freddy Roa\.gemini\antigravity-ide\brain\e92eb71d-af41-48a4-9265-6e2dc40b5726\.system_generated\logs\transcript.jsonl"
with open(log_path, "r", encoding="utf-8") as f:
    lines = f.readlines()

print("Searching full transcript for errors/tracebacks...")
for line in lines:
    try:
        obj = json.loads(line)
        content = obj.get('content', '')
        if "error" in content.lower() or "exception" in content.lower() or "traceback" in content.lower():
            # Only print if it's from system or has diagnostic value
            source = obj.get('source')
            step = obj.get('step_index')
            print(f"Step {step} ({source}): {content[:200]}...")
            print("-" * 30)
    except Exception:
        pass
