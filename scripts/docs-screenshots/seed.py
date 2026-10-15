import json, sys, uuid, requests
S = sys.argv[1]
B = "http://127.0.0.1:8100/api/v1"
TOK = json.load(open(f"{S}/signup.json"))["token"]
H = {"Authorization": f"Bearer {TOK}"}
out = {}

def call(m, p, **kw):
    r = requests.request(m, B + p, headers=H, timeout=30, **kw)
    if r.status_code >= 400:
        print("ERR", m, p, r.status_code, r.text[:400]); return None
    return r.json() if r.text else {}

# tools
def http_tool(name, desc, url, params):
    return call("POST", "/tools/", json={"name": name, "description": desc, "category": "http_api", "icon": "globe",
        "definition": {"type": "http_api", "config": {"method": "GET", "url": url, "parameters": params}}})
t1 = http_tool("Get order details from order id", "Look up an order's status and delivery date when the caller gives an order number.",
               "https://api.example.com/orders", [{"name": "order_id", "type": "string", "description": "Order number given by the caller", "required": True}])
t2 = http_tool("Check appointment availability", "Find the next free appointment slots for a given day.",
               "https://api.example.com/slots", [{"name": "date", "type": "string", "description": "Requested day, YYYY-MM-DD", "required": True}])
t3 = call("POST", "/tools/", json={"name": "End Call", "description": "Hang up once the caller's request is fully handled.", "category": "end_call", "icon": "phone-off",
        "definition": {"type": "end_call", "config": {}}})
tools = [t for t in (t1, t2, t3) if t]
out["tools"] = [t.get("tool_uuid") or t.get("uuid") for t in tools]
print("tools", out["tools"])

g = str(uuid.uuid4()); s = str(uuid.uuid4()); a = str(uuid.uuid4()); su = str(uuid.uuid4()); e = str(uuid.uuid4())
GLOBAL = ("You are Emma, the voice assistant of Northwind Home, an online furniture store. "
          "Speak warmly and briefly. Never invent order data: always use the tools.")
wf = {"nodes": [
  {"id": g, "type": "globalNode", "position": {"x": -380, "y": 0}, "data": {"name": "Global Node", "prompt": GLOBAL}},
  {"id": s, "type": "startCall", "position": {"x": 0, "y": 0}, "data": {"name": "Start Call",
     "greeting": "Hello {{first_name}}, thanks for calling Northwind Home. How can I help you today?",
     "prompt": "Greet the caller by name if you know it and find out why they are calling.",
     "allow_interrupt": False, "add_global_prompt": True, "detect_voicemail": True, "tool_uuids": out["tools"][2:3]}},
  {"id": a, "type": "agentNode", "position": {"x": 0, "y": 260}, "data": {"name": "Main Agenda and Questions",
     "prompt": "Answer questions about orders, deliveries and returns. Use the order lookup tool when the caller gives an order number.",
     "allow_interrupt": True, "add_global_prompt": True, "tool_uuids": out["tools"],
     "extraction_enabled": True,
     "extraction_prompt": "When the caller has explained their request, capture the order number and the reason for the call.",
     "extraction_variables": [
        {"name": "order_id", "type": "string", "prompt": "The order number the caller gave, if any"},
        {"name": "call_reason", "type": "string", "prompt": "Short reason for the call: delivery, return, product question or other"}]}},
  {"id": su, "type": "agentNode", "position": {"x": 0, "y": 520}, "data": {"name": "Summary and Next Steps",
     "prompt": "Summarise what was agreed and confirm the next step with the caller.", "add_global_prompt": True}},
  {"id": e, "type": "endCall", "position": {"x": 0, "y": 780}, "data": {"name": "End Call", "prompt": "Thank the caller and say goodbye."}},
 ], "edges": [
  {"id": f"{s}-{a}", "source": s, "target": a, "data": {"label": "Move to Main Agenda", "condition": "Choose this pathway every time after the caller's first answer."}},
  {"id": f"{a}-{su}", "source": a, "target": su, "data": {"label": "Request handled", "condition": "The caller's question has been answered."}},
  {"id": f"{su}-{e}", "source": su, "target": e, "data": {"label": "Wrap up", "condition": "The caller confirmed the next step."}},
 ]}
w = call("POST", "/workflow/create/definition", json={"name": "Customer Support - Inbound", "workflow_definition": wf})
out["workflow"] = w and w.get("id")
w2 = call("POST", "/workflow/create/definition", json={"name": "Appointment Reminders - Outbound", "workflow_definition": json.loads(json.dumps(wf).replace(
   "Customer", "Customer"))})
w3 = call("POST", "/workflow/create/definition", json={"name": "Lead Qualification - Inbound", "workflow_definition": wf})
out["workflows"] = [x and x.get("id") for x in (w, w2, w3)]
k = call("POST", "/user/api-keys", json={"name": "Production backend"})
call("POST", "/user/api-keys", json={"name": "Zapier automation"})
json.dump(out, open(f"{S}/seed-out.json", "w"))
print(out)
