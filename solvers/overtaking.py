"""Chapter 1: speed-time graphs, and one particle overtaking another.

A car passes O at a constant speed u. At the same instant a cyclist sets off
from rest at O, accelerating uniformly until reaching a cruising speed v,
then continuing at that constant speed. If v > u the cyclist eventually
catches the car up.
"""
from .common import codes, FPS, MAX_SECONDS, check, num, r, result

SCENE = {
    "id": "overtaking",
    "chapter": "Chapter 1: Constant acceleration",
    "title": "Speed-time graphs: overtaking",
    "blurb": "A car passes O at constant speed. A cyclist sets off from rest at the same "
             "instant, speeds up, then rides at a constant speed until catching the car.",
    "covers": codes("1.11-1.14"),
    "params": [
        num("u", "Car's constant speed u", 15, "m/s"),
        num("a", "Cyclist's acceleration a", 2, "m/s²"),
        num("v", "Cyclist's cruising speed v", 20, "m/s"),
    ],
    "presets": [
        {"label": "Cyclist catches the car during the cruise",
         "params": {"u": 15, "a": 2, "v": 20}},
        {"label": "Cyclist catches the car while still speeding up",
         "params": {"u": 8, "a": 2.5, "v": 20}},
    ],
}


def solve(p):
    u, a, v = p["u"], p["a"], p["v"]
    check(u > 0, "u must be greater than 0.")
    check(a > 0, "a must be greater than 0.")
    check(v > u, "The cyclist's cruising speed v must be greater than the car's "
                 "speed u, or the cyclist never catches up.")

    t1 = v / a                    # time the cyclist takes to reach cruising speed
    t_gap = u / a                 # time of greatest distance behind (speeds equal)
    gap_max = 0.5 * u * u / a     # greatest distance the cyclist is behind

    t_acc_candidate = 2 * u / a   # catch-up time if it happens during acceleration
    if t_acc_candidate <= t1 + 1e-9:
        t_catch = t_acc_candidate
        caught_while = "accelerating"
    else:
        t_catch = v * v / (2 * a * (v - u))
        caught_while = "cruising"
    x_catch = u * t_catch

    T = max(t_catch * 1.15, t1 * 1.1) + 0.4
    check(T <= MAX_SECONDS, "This motion lasts more than 60 s. Try smaller numbers.")

    frames = []
    for i in range(int(T * FPS) + 2):
        t = min(i / FPS, T)
        xP = u * t
        if t <= t1:
            vQ = a * t
            xQ = 0.5 * a * t * t
        else:
            vQ = v
            xQ = v * t - v * v / (2 * a)
        frames.append({"t": r(t), "xP": r(xP), "xQ": r(xQ), "vQ": r(vQ)})

    res = [result("Time to reach cruising speed", r(t1, 3), "s"),
           result("Greatest distance behind", r(gap_max, 3), "m"),
           result(f"Time to catch up (while {caught_while})", r(t_catch, 3), "s"),
           result("Distance from O when caught", r(x_catch, 3), "m")]
    return {"dt": 1 / FPS, "frames": frames, "results": res,
            "meta": {"u": u, "a": a, "v": v, "t1": r(t1), "t_catch": r(t_catch),
                     "x_catch": r(x_catch), "t_gap": r(t_gap), "gap_max": r(gap_max),
                     "T": r(T)}}
