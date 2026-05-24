# inspect_logs.py
import os
import json

log_path = r"C:\Users\Freddy Roa\.gemini\antigravity-ide\brain\e92eb71d-af41-48a4-9265-6e2dc40b5726\.system_generated\logs\transcript.jsonl"
if not os.path.exists(log_path):
    print("Log file not found at", log_path)
else:
    print("Log file found! Reading last 20 lines...")
    with open(log_path, "r", encoding="utf-8") as f:
        lines = f.readlines()
    for line in lines[-20:]:
        try:
            obj = json.loads(line)
            print(f"Step: {obj.get('step_index')}, Source: {obj.get('source')}, Type: {obj.get('type')}")
            content = obj.get('content', '')
            if content:
                print(f"Content: {content[:300]}")
            tool_calls = obj.get('tool_calls', [])
            if tool_calls:
                print(f"Tool calls: {str(tool_calls)[:300]}")
            print("-" * 50)
        except Exception as e:
            print("Error parsing line:", e)
