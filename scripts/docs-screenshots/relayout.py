import json, sys, requests
S = sys.argv[1]; B = "http://127.0.0.1:8100/api/v1"
H = {"Authorization": "Bearer " + json.load(open(f"{S}/signup.json"))["token"]}
pos = {"Global Node": (-470, 0), "Start Call": (0, 0), "Main Agenda and Questions": (0, 330), "Summary and Next Steps": (470, 330), "End Call": (470, 0),
       "Tuner": (940, 0), "Noveum": (940, 330)}
for wid in (1, 2, 3):
    w = requests.get(f"{B}/workflow/fetch/{wid}", headers=H).json()
    wd = w.get("workflow_definition") or (w.get("current_definition") or {}).get("workflow_definition")
    for n in wd["nodes"]:
        x, y = pos[n["data"]["name"]]; n["position"] = {"x": x, "y": y}
    body = {"workflow_definition": wd}
    if wid == 1: body["template_context_variables"] = {"first_name": "John", "customer_name": "John Doe"}
    r = requests.put(f"{B}/workflow/{wid}", headers=H, json=body); print(wid, r.status_code)
