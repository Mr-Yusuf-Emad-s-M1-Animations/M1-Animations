"""Chapter 3: a person in a lift - the reaction from the floor as the lift speeds up and slows down."""
from .common import check, codes, choice, num, r, result, sample

SCENE = {
    "id": "lift",
    "chapter": "Chapter 3: Dynamics",
    "title": "Person in a lift",
    "blurb": "The lift speeds up, moves at constant speed, then slows to rest. The force from "
             "the floor R = m(g + a), with a positive upwards: R is biggest when the "
             "acceleration points up and smallest when it points down.",
    "covers": codes("3.10", "3.13"),
    "params": [
        choice("dir", "The lift goes", "up", [["up", "Up"], ["down", "Down"]]),
        num("m", "Mass of the person", 70, "kg"),
        num("M", "Mass of the lift", 400, "kg"),
        num("a1", "Acceleration (speeding up)", 1.5, "m/s²"),
        num("t1", "Time speeding up", 2, "s"),
        num("t2", "Time at constant speed", 3, "s"),
        num("a3", "Deceleration (slowing down)", 2, "m/s²"),
        num("g", "Gravity g", 9.8, "m/s²"),
    ],
    "presets": [
        {"label": "Going up: 1.5 m/s² for 2 s, then 3 s steady, then slowing at 2 m/s²",
         "params": {"dir": "up", "m": 70, "M": 400, "a1": 1.5, "t1": 2, "t2": 3, "a3": 2, "g": 9.8}},
        {"label": "Going down",
         "params": {"dir": "down", "m": 60, "M": 500, "a1": 1.2, "t1": 2.5, "t2": 4, "a3": 1.5, "g": 9.8}},
    ],
}


def solve(p):
    m, M, a1, t1, t2, a3, g = p["m"], p["M"], p["a1"], p["t1"], p["t2"], p["a3"], p["g"]
    sgn = 1 if p["dir"] == "up" else -1
    check(m > 0 and M > 0 and g > 0, "Masses and g must be greater than 0.")
    check(a1 > 0 and t1 > 0 and a3 > 0 and t2 >= 0, "Accelerations and times must be greater than 0.")
    check(a1 < g and a3 < g, "Keep the accelerations below g so the person stays on the floor.")
    V = a1 * t1
    t3 = V / a3
    T = t1 + t2 + t3 + 0.8                       # a short rest at the end
    stages = [(t1, a1), (t2, 0.0), (t3, -a3)]

    def state(t):
        y, v, t0 = 0.0, 0.0, 0.0
        for dur, a in stages:
            tau = min(max(t - t0, 0), dur)
            y += v * tau + 0.5 * a * tau * tau
            if t < t0 + dur:
                return y, v + a * tau, a
            v += a * dur
            t0 += dur
        return y, 0.0, 0.0

    def frame(t):
        y, v, a = state(t)
        a_up = sgn * a                           # acceleration with up as positive
        return {"t": r(t), "y": r(sgn * y), "v": r(sgn * v), "a": r(a_up),
                "R": r(m * (g + a_up), 2), "T": r((M + m) * (g + a_up), 1)}

    frames, dt = sample(T, frame)
    D = state(T)[0]
    names = ["speeding up", "constant speed", "slowing down"]
    res = []
    for (dur, a), name in zip(stages, names):
        res.append(result(f"R from the floor ({name})", r(m * (g + sgn * a), 2), "N"))
    res += [result("Weight of the person", r(m * g, 2), "N"),
            result("Greatest tension in the cable", r((M + m) * (g + max(sgn * a1, -sgn * a3)), 1), "N"),
            result("Top speed", r(V, 3), "m/s"),
            result("Total distance", r(D, 3), "m")]
    return {"dt": dt, "frames": frames, "results": res,
            "meta": {"D": r(D), "sgn": sgn, "W": r(m * g, 2), "Rmax": r(m * (g + max(a1, a3)), 2),
                     "Rmin": r(m * (g - max(a1, a3)), 2), "V": r(V), "T": r(T)}}
