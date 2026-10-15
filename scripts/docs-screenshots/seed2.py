import json, sys, uuid, requests
S = sys.argv[1]; B = "http://127.0.0.1:8100/api/v1"
H = {"Authorization": "Bearer " + json.load(open(f"{S}/signup.json"))["token"]}
def call(m, p, **kw):
    r = requests.request(m, B + p, headers=H, timeout=30, **kw)
    if r.status_code >= 400: print("ERR", m, p, r.status_code, r.text[:300]); return None
    return r.json() if r.text else {}
w = call("GET", "/workflow/fetch/1")
wd = w.get("workflow_definition") or (w.get("current_definition") or {}).get("workflow_definition")
if wd is None: print(list(w.keys())); sys.exit()
ys = {"globalNode": 0, "startCall": 0, "agentNode": None, "endCall": 1140}
order = {n["data"]["name"]: n for n in wd["nodes"]}
pos = {"Global Node": (-420, 0), "Start Call": (0, 0), "Main Agenda and Questions": (0, 340), "Summary and Next Steps": (0, 760), "End Call": (0, 1080)}
for n in wd["nodes"]:
    x, y = pos[n["data"]["name"]]; n["position"] = {"x": x, "y": y}
call("PUT", "/workflow/1", json={"workflow_definition": wd, "template_context_variables": {"customer_name": "John Doe"}})
# integrations on workflow 3
w3 = call("GET", "/workflow/fetch/3")
wd3 = w3.get("workflow_definition") or (w3.get("current_definition") or {}).get("workflow_definition")
for n in wd3["nodes"]:
    x, y = pos[n["data"]["name"]]; n["position"] = {"x": x, "y": y}
wd3["nodes"] += [
  {"id": str(uuid.uuid4()), "type": "tuner", "position": {"x": 420, "y": 0}, "data": {"name": "Tuner", "tuner_enabled": True,
     "tuner_agent_id": "d94dd5b1-e48d-4678-90cc-0755bd3c4a21", "tuner_workspace_id": 1374, "tuner_api_key": "tnr_demo_0000000000000000"}},
  {"id": str(uuid.uuid4()), "type": "noveum", "position": {"x": 420, "y": 340}, "data": {"name": "Noveum", "noveum_enabled": True,
     "noveum_api_key": "nv_demo_0000000000000000", "noveum_project": "ailunapro-traces", "noveum_environment": "production", "noveum_record_audio": True}},
]
call("PUT", "/workflow/3", json={"workflow_definition": wd3})
print("ok", [n["type"] for n in wd3["nodes"]])
