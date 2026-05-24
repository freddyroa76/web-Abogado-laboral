# search_old_steps.py
import json

log_path = r"C:\Users\Freddy Roa\.gemini\antigravity-ide\brain\e92eb71d-af41-48a4-9265-6e2dc40b5726\.system_generated\logs\transcript.jsonl"
with open(log_path, "r", encoding="utf-8") as f:
    lines = f.readlines()

print("Reading steps 70 to 95...")
for line in lines:
    try:
        obj = json.loads(line)
        step = obj.get('step_index')
        if 70 <= step <= 95:
            source = obj.get('source')
            typ = obj.get('type')
            content = obj.get('content', '')
            print(f"Step {step} ({source}, {typ}): {content[:300]}")
            tool_calls = obj.get('tool_calls', [])
            if tool_calls:
                print(f"  Tool: {str(tool_calls)[:200]}")
            print("-" * 50)
    except Exception:
        pass
