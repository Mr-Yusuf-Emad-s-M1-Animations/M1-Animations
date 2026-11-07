"""Chapter 1: speed-time and acceleration-time graphs for one or two vehicles that move in stages."""
import re
from .common import check, choice, codes, num, r, result, sample_lapse, text

SCENE = {
    "id": "stages",
    "chapter": "Chapter 1: Constant acceleration",
    "title": "Journeys in stages: speed-time and acceleration-time graphs",
    "blurb": "One or two vehicles, each moving in stages of constant acceleration. Watch the graph build, and find overtaking, turning round and equal speeds.",
    "covers": codes("1.4-1.8"),
    "params": [
        choice("graph", "Graph to draw", "speed", [["speed", "Speed-time"], ["acceleration", "Acceleration-time"]]),
        text("A_stages", "Vehicle A: stages, as duration:acceleration (s : m/s²)", "5:2, 15:0, 4:-2.5"),
        num("uA", "Vehicle A: starting speed", 0, "m/s"),
        text("B_stages", "Vehicle B: stages (leave empty for no vehicle B)", ""),
        num("startB", "Vehicle B starts at time", 0, "s"),
        num("uB", "Vehicle B: starting speed", 0, "m/s"),
        num("x0B", "Vehicle B starts this far ahead of A (negative = behind)", 0, "m"),
        num("vmark", "Mark this speed on the graph (0 = none)", 0, "m/s"),
        num("tmark", "Mark this time (0 = none)", 0, "s"),
    ],
    "presets": [
        {"label": "Scooter and cyclist (acceleration-time graph)",
         "params": {"graph": "acceleration", "A_stages": "5:2, 15:0, 4:-2.5", "uA": 0, "B_stages": "24:1.5", "startB": 0,
                    "uB": 0, "x0B": 0, "vmark": 0, "tmark": 0}},
        {"label": "Two trains leave a station",
         "params": {"graph": "speed", "A_stages": "25:0.64, 100:0, 25:-0.64", "uA": 0, "B_stages": "50:0.48, 75:-0.32",
                    "startB": 25, "uB": 0, "x0B": 0, "vmark": 0, "tmark": 0}},
        {"label": "Car B starts 13 m behind car A",
         "params": {"graph": "speed", "A_stages": "5:2, 20:0", "uA": 0, "B_stages": "20:1.5", "startB": 0,
                    "uB": 0, "x0B": -13, "vmark": 0, "tmark": 0}},
    ],
}
_NUM = re.compile(r"^[+-]?(\d+\.?\d*|\.\d+)$")
HELP = "write each stage as duration:acceleration, for example 5:2, 15:0, 4:-2.5"


def parse_stages(s, name):
    out = []
    for piece in s.strip().split(","):
        piece = piece.strip()
        if piece == "":
            continue
        parts = [x.strip() for x in piece.split(":")]
        check(len(parts) == 2 and all(_NUM.match(x) for x in parts), f"{name}: {HELP}.")
        d, a = float(parts[0]), float(parts[1])
        check(d > 0, f"{name}: every stage must last more than 0 s.")
        out.append((d, a))
    check(len(out) <= 8, f"{name}: use at most 8 stages.")
    return out


def build(stages, start, u, x_before):
    segs, t, v, x = [], start, u, x_before
    for d, a in stages:
        segs.append((t, t + d, a, v, x))
        x += v * d + 0.5 * a * d * d
        v += a * d
        t += d
    return {"segs": segs, "start": start, "x0": x_before, "end": t, "vend": v, "xend": x}


def state(veh, t):
    if t < veh["start"]:
        return veh["x0"], 0.0, 0.0
    n = len(veh["segs"])
    for i, (t0, t1, a, v0, x0) in enumerate(veh["segs"]):
        if t < t1 or i == n - 1 and t <= t1:
            tau = t - t0
            return x0 + v0 * tau + 0.5 * a * tau * tau, v0 + a * tau, a
    tau = t - veh["end"]
    return veh["xend"] + veh["vend"] * tau, veh["vend"], 0.0


def path_length(veh):
    total = 0.0
    for t0, t1, a, v0, x0 in veh["segs"]:
        d = t1 - t0
        xe = v0 * d + 0.5 * a * d * d
        if abs(a) > 1e-12 and v0 * (v0 + a * d) < 0:      # turns round inside this stage
            ts = -v0 / a
            xt = v0 * ts + 0.5 * a * ts * ts
            total += abs(xt) + abs(xe - xt)
        else:
            total += abs(xe)
    return total


def turn_times(veh):
    out, prev = [], 0
    for t0, t1, a, v0, x0 in veh["segs"]:
        v1 = v0 + a * (t1 - t0)
        s0 = 0 if abs(v0) < 1e-9 else (1 if v0 > 0 else -1)
        s1 = 0 if abs(v1) < 1e-9 else (1 if v1 > 0 else -1)
        if s0 != 0:
            if prev != 0 and s0 != prev:
                out.append(t0)
            prev = s0
        if s0 * s1 < 0 and abs(a) > 1e-12:
            out.append(t0 - v0 / a)
            prev = s1
        elif s1 != 0:
            if prev != 0 and s1 != prev:
                out.append(t0)
            prev = s1
    return out


def times_at_speed(veh, vm):
    ts = []
    for t0, t1, a, v0, x0 in veh["segs"]:
        if abs(a) > 1e-12:
            t = t0 + (vm - v0) / a
            if t0 - 1e-9 <= t <= t1 + 1e-9:
                ts.append(min(max(t, t0), t1))
    out = []
    for t in sorted(ts):
        if not out or abs(t - out[-1]) > 1e-7:
            out.append(t)
    return out


def sign_crossings(fn, T, steps=4000, tol=1e-9):
    """Times when fn changes sign (ignoring places where it is zero), with the sign it had before."""
    roots, tl, dl = [], 0.0, 0.0
    for k in range(steps + 1):
        t = T * k / steps
        d = fn(t)
        if abs(d) < tol:
            continue
        if dl != 0.0 and (d > 0) != (dl > 0):
            lo, hi, pos = tl, t, dl > 0          # fn(lo) has the sign `pos`
            for _ in range(60):
                mid = (lo + hi) / 2
                dm = fn(mid)
                if dm != 0 and (dm > 0) == pos:
                    lo = mid
                else:
                    hi = mid
            roots.append(((lo + hi) / 2, 1 if pos else -1))
        tl, dl = t, d
    return roots


def pyl(ts):
    return " and ".join(f"{r(t, 3)} s" for t in ts)


def solve(p):
    A, B = parse_stages(p["A_stages"], "Vehicle A"), parse_stages(p["B_stages"], "Vehicle B")
    check(len(A) >= 1, "Vehicle A needs at least one stage.")
    startB, x0B, vm, tm = p["startB"], p["x0B"], p["vmark"], p["tmark"]
    check(startB >= 0, "Vehicle B cannot start before t = 0.")
    check(vm >= 0 and tm >= 0, "The marks cannot be negative.")
    hasB = len(B) > 0
    veh = {"A": build(A, 0.0, p["uA"], 0.0)}
    if hasB:
        veh["B"] = build(B, startB, p["uB"], x0B)
    T = max(v["end"] for v in veh.values())

    def frame(t):
        xa, va, aa = state(veh["A"], t)
        xb, vb, ab = state(veh["B"], t) if hasB else (0.0, 0.0, 0.0)
        return {"t": r(t), "xA": r(xa), "vA": r(va), "aA": r(aa), "xB": r(xb), "vB": r(vb), "aB": r(ab)}

    frames, dt, speedup = sample_lapse(T, frame)
    res = []
    for name, v in veh.items():
        for k, (t0, t1, a, v0, x0) in enumerate(v["segs"], 1):
            res.append(result(f"{name}: stage {k} ends", f"t = {r(t1, 3):g} s, speed {r(v0 + a * (t1 - t0), 3)} m/s"))
        res.append(result(f"{name}: total time", r(v["end"] - v["start"], 3), "s"))
        res.append(result(f"{name}: distance travelled", r(path_length(v), 3), "m"))
        res.append(result(f"{name}: displacement", r(v["xend"] - v["x0"], 3), "m"))
        for tt in turn_times(v):
            res.append(result(f"{name}: turns round at t", r(tt, 3), "s"))
        if vm > 0:
            ts = times_at_speed(v, vm)
            res.append(result(f"{name} has speed {vm:g} m/s at t", pyl(ts) if ts else "never"))
    if hasB:
        for root, was in sign_crossings(lambda t: state(veh["B"], t)[0] - state(veh["A"], t)[0], T):
            who, other = ("B", "A") if was < 0 else ("A", "B")
            res.append(result(f"{who} overtakes {other} at t", r(root, 3), "s"))
            res.append(result("Speeds of A and B then", f"{r(state(veh['A'], root)[1], 3)} and {r(state(veh['B'], root)[1], 3)} m/s"))
        eq = [t for t, was in sign_crossings(lambda t: state(veh["A"], t)[1] - state(veh["B"], t)[1], T)
              if abs(state(veh["A"], t)[1]) > 1e-9 and abs(state(veh["B"], t)[1]) > 1e-9]
        if eq:
            res.append(result("The speeds are equal at t", pyl(eq)))
    if tm > 0:
        for name, v in veh.items():
            x, s, _ = state(v, tm)
            res.append(result(f"{name} at t = {tm:g} s", f"{r(x, 3)} m from the start, speed {r(s, 3)} m/s"))
        if hasB:
            res.append(result("Distance between the vehicles", r(abs(state(veh["B"], tm)[0] - state(veh["A"], tm)[0]), 3), "m"))
    if speedup > 1:
        res.append(result("Playback", f"time-lapse, {r(speedup, 1)} times faster than real time"))
    xs = [f["xA"] for f in frames] + ([f["xB"] for f in frames] if hasB else [])
    return {"dt": dt, "frames": frames, "results": res,
            "meta": {"hasB": hasB, "T": r(T), "graph": p["graph"], "vmark": vm, "tmark": tm,
                     "xmin": r(min(xs)), "xmax": r(max(xs)), "startB": startB}}
