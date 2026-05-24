# search_user_logs.py
import json

log_path = r"C:\Users\Freddy Roa\.gemini\antigravity-ide\brain\e92eb71d-af41-48a4-9265-6e2dc40b5726\.system_generated\logs\transcript.jsonl"
with open(log_path, "r", encoding="utf-8") as f:
    lines = f.readlines()

print("Searching user messages...")
for line in lines:
    try:
        obj = json.loads(line)
        if obj.get('source') == 'USER_EXPLICIT':
            print(f"Step {obj.get('step_index')}: {obj.get('content')}")
            print("="*40)
    except Exception as e:
        pass
