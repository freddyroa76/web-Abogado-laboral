# read_step_106.py
import json

log_path = r"C:\Users\Freddy Roa\.gemini\antigravity-ide\brain\e92eb71d-af41-48a4-9265-6e2dc40b5726\.system_generated\logs\transcript.jsonl"
with open(log_path, "r", encoding="utf-8") as f:
    lines = f.readlines()

for line in lines:
    try:
        obj = json.loads(line)
        if obj.get('step_index') == 106:
            print("FULL USER REQUEST AT STEP 106:")
            print(obj.get('content'))
    except Exception:
        pass
