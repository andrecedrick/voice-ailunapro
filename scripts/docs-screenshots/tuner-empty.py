import json, sys, requests
S = sys.argv[1]; mode = sys.argv[2]; B = "http://127.0.0.1:8100/api/v1"
H = {"Authorization": "Bearer " + json.load(open(f"{S}/signup.json"))["token"]}
w = requests.get(f"{B}/workflow/fetch/3", headers=H).json()
wd = w.get("workflow_definition") or (w.get("current_definition") or {}).get("workflow_definition")
for n in wd["nodes"]:
    if n["type"] == "tuner":
        if mode == "empty": n["data"].update({"tuner_agent_id": None, "tuner_workspace_id": None, "tuner_api_key": None})
        else: n["data"].update({"tuner_agent_id": "d94dd5b1-e48d-4678-90cc-0755bd3c4a21", "tuner_workspace_id": 1374, "tuner_api_key": "tnr_demo_0000000000000000"})
print(requests.put(f"{B}/workflow/3", headers=H, json={"workflow_definition": wd}).status_code)
