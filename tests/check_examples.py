"""Checks examples.json: every example's numbers are valid for its scene, and the scene's own
results reproduce the answers printed in the notes (the "expect" lists).

    python tests/check_examples.py
"""
import json, pathlib, re, sys
ROOT = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
from solvers import SCENES, InputError

def numbers(value):
    if isinstance(value, (int, float)): return [float(value)]
    return [float(x) for x in re.findall(r"-?\d+(?:\.\d+)?", str(value))]

data = json.loads((ROOT / "examples.json").read_text(encoding="utf-8"))
bad = checked = 0
for eid, ex in data.items():
    if eid.startswith("_"): continue
    sc = SCENES[ex["scene"]]
    base = {p["key"]: p["default"] for p in sc["params"]}
    values = {**base, **ex.get("params", {})}
    try:
        res = sc["solve"](values)["results"]
    except InputError as e:
        print(f"FAIL {eid}: the scene refuses these numbers: {e}"); bad += 1; continue
    for item in ex.get("expect", []):
        label, want = item[0], item[1]
        tol = item[2] if len(item) > 2 else max(0.02, abs(want if isinstance(want, (int, float)) else 0) * 0.005)
        hit = next((r for r in res if label in r["label"]), None)
        checked += 1
        if hit is None:
            print(f"FAIL {eid}: no result called '{label}'"); bad += 1; continue
        got = numbers(hit["value"]); wants = want if isinstance(want, list) else [want]
        if not all(any(abs(g - w) <= tol for g in got) for w in wants):
            print(f"FAIL {eid}: '{label}' is {hit['value']}, notes say {want}"); bad += 1
print(f"{len([k for k in data if not k.startswith('_')])} examples, {checked} answers compared, {bad} problems")
sys.exit(1 if bad else 0)
