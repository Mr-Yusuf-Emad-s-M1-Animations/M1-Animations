"""Checks that the JavaScript solvers (js/solvers.js) give the same numbers as the
Python solvers (solvers/). Runs every preset plus random variations of every scene.

    python tests/parity.py            (needs Node.js)
"""
import json, math, os, random, subprocess, sys, tempfile
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from solvers import SCENES, InputError

random.seed(1)
TOL = 1.2e-3                                  # frames are rounded to 4 d.p., results to 3: allow one tie flip
cases = []
for sid, sc in SCENES.items():
    base = {p["key"]: p["default"] for p in sc["params"]}
    for pre in sc["presets"]:
        cases.append((sid, dict(pre["params"])))
    cases.append((sid, base))
    for _ in range(60):
        q = {}
        for p in sc["params"]:
            if p.get("type") == "select":
                q[p["key"]] = random.choice([o[0] for o in p["options"]])
            elif p.get("type") == "text":
                q[p["key"]] = random.choice([p["default"], pre["params"].get(p["key"], p["default"]), "", "3:1, 2:0, 4:-1",
                                             "10:0.5", "5:2,5:-2, 6:1", "abc", "4:", "5:2, 0:1", "2:1:3", "6:-1.5, 8:0, 3:2.5", "20:0.3,"])
            else:
                v = float(pre["params"].get(p["key"], p["default"])) if sc["presets"] else float(p["default"])
                v = v * random.choice([0.5, 0.8, 1, 1, 1.2, 1.7, 3]) + random.choice([0, 0, 0.3, -0.3])
                q[p["key"]] = round(v, random.choice([0, 1, 2]))
        cases.append((sid, q))

py = []
for sid, q in cases:
    try:
        py.append({"ok": json.loads(json.dumps(SCENES[sid]["solve"](q)))})
    except InputError as e:
        py.append({"error": str(e)})

here = os.path.dirname(os.path.abspath(__file__))
with tempfile.TemporaryDirectory() as d:
    cf, of = os.path.join(d, "cases.json"), os.path.join(d, "out.json")
    json.dump([{"id": s, "params": q} for s, q in cases], open(cf, "w"))
    subprocess.run(["node", os.path.join(here, "run_js.mjs"), cf, of], check=True)
    js = json.load(open(of))


def same(a, b, path=""):
    if isinstance(a, bool) or isinstance(b, bool) or a is None or b is None or isinstance(a, str) or isinstance(b, str):
        return [] if a == b else [f"{path}: {a!r} != {b!r}"]
    if isinstance(a, (int, float)) and isinstance(b, (int, float)):
        return [] if abs(a - b) <= TOL else [f"{path}: {a} != {b}"]
    if isinstance(a, list):
        if not isinstance(b, list) or len(a) != len(b):
            return [f"{path}: length {len(a)} != {len(b) if isinstance(b, list) else b}"]
        out = []
        for i, (x, y) in enumerate(zip(a, b)):
            out += same(x, y, f"{path}[{i}]")
            if len(out) > 3: break
        return out
    if isinstance(a, dict):
        if not isinstance(b, dict) or set(a) != set(b):
            return [f"{path}: keys {sorted(a)} != {sorted(b) if isinstance(b, dict) else b}"]
        out = []
        for k in a:
            out += same(a[k], b[k], f"{path}.{k}")
        return out
    return [f"{path}: unexpected {a!r}"]


bad, ran, errs, per = 0, 0, 0, {}
for (sid, q), a, b in zip(cases, py, js):
    ran += 1
    if "crash" in b:
        problems = ["JS crashed: " + b["crash"][:200]]
    elif ("error" in a) != ("error" in b):
        problems = [f"one side errored: py={a.get('error')!r} js={b.get('error') or 'ok'!r}"]
    elif "error" in a:
        errs += 1
        problems = [] if a["error"] == b["error"] else [f"error text: {a['error']!r} != {b['error']!r}"]
    else:
        problems = same(a["ok"], b["ok"])
    if problems:
        bad += 1
        per.setdefault(sid, []).append((q, problems[:3]))
print(f"{ran} cases ({errs} where both sides correctly refuse the numbers): {ran - bad} match, {bad} differ")
for sid, lst in per.items():
    print(f"\n{sid}: {len(lst)} differ")
    for q, pr in lst[:2]:
        print("   ", q); [print("      ", x) for x in pr]
sys.exit(1 if bad else 0)
