"""Chapter 3: two particles over a pulley; an extra mass on A is removed part-way down."""
from math import sqrt
from .common import check, codes, num, r, result, sample

SCENE = {
    "id": "pulley-extra-mass",
    "chapter": "Chapter 3: Dynamics",
    "title": "Pulley: an extra mass falls away",
    "blurb": "A, carrying an extra mass, pulls B up. After A falls a distance d the extra mass is "
             "caught by a ring and left behind, so the acceleration changes - often A then slows down.",
    "covers": codes("3.19"),
    "params": [
        num("mA", "Mass of A", 3, "kg"),
        num("mx", "Extra mass on A", 1.5, "kg"),
        num("mB", "Mass of B", 3.5, "kg"),
        num("d", "Distance A falls before the extra mass is removed", 1.2, "m"),
        num("hA", "Height of A above the ground", 3, "m"),
        num("g", "Gravity g", 9.8, "m/s²"),
    ],
    "presets": [
        {"label": "A slows down after the extra mass is removed",
         "params": {"mA": 3, "mx": 1.5, "mB": 3.5, "d": 1.2, "hA": 3, "g": 9.8}},
        {"label": "A keeps speeding up, but more slowly",
         "params": {"mA": 4, "mx": 2, "mB": 2, "d": 1, "hA": 2.5, "g": 9.8}},
    ],
}


def solve(p):
    mA, mx, mB, d, hA, g = p["mA"], p["mx"], p["mB"], p["d"], p["hA"], p["g"]
    check(mA > 0 and mx > 0 and mB > 0 and g > 0, "Masses and g must be greater than 0.")
    check(mA + mx > mB, "A with the extra mass must be heavier than B, so that A moves down.")
    check(0 < d < hA, "The ring must be between A's start and the ground (0 < d < height of A).")
    a1 = (mA + mx - mB) * g / (mA + mx + mB)       # whole system: (mA + mx - mB) g = (total) a
    T1 = mB * (g + a1)
    t1 = sqrt(2 * d / a1)
    v1 = a1 * t1
    a2 = (mA - mB) * g / (mA + mB)                  # may be negative: A slows down
    T2 = mB * (g + a2)
    rest = hA - d
    if a2 < 0 and v1 * v1 / (-2 * a2) < rest:
        t2 = v1 / -a2                               # A stops before the ground
        outcome = "stop"
    else:
        t2 = (-v1 + sqrt(v1 * v1 + 2 * a2 * rest)) / a2 if abs(a2) > 1e-12 else rest / v1
        outcome = "ground"
    T = t1 + t2

    def frame(t):
        if t <= t1:
            s, v, ph = 0.5 * a1 * t * t, a1 * t, 1
        else:
            tau = t - t1
            s, v, ph = d + v1 * tau + 0.5 * a2 * tau * tau, v1 + a2 * tau, 2
        return {"t": r(t), "s": r(min(s, hA)), "v": r(v), "ph": ph}

    frames, dt = sample(T, frame)
    res = [result("Acceleration with the extra mass", r(a1, 4), "m/s²"),
           result("Tension with the extra mass", r(T1, 3), "N"),
           result("Speed when the extra mass is removed", r(v1, 3), "m/s"),
           result("Acceleration afterwards (+ = A down)", r(a2, 4), "m/s²"),
           result("Tension afterwards", r(T2, 3), "N")]
    if outcome == "stop":
        res.append(result("A comes to rest a further", r(v1 * v1 / (-2 * a2), 3), "m"))
    else:
        res.append(result("A hits the ground at", r(v1 + a2 * t2, 3), "m/s"))
    return {"dt": dt, "frames": frames, "results": res,
            "meta": {"hA": hA, "d": d, "mA": mA, "mx": mx, "mB": mB, "outcome": outcome}}
