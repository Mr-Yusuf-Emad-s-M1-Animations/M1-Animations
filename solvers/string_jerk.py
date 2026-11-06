"""Chapter 4: a slack string between two particles becomes taut and jerks the other into motion."""
from .common import check, codes, num, r, result

SCENE = {
    "id": "string-jerk",
    "chapter": "Chapter 4: Momentum",
    "title": "String jerks taut",
    "blurb": "P moves away from Q along a smooth table. The string between them is slack until P has moved "
             "the slack distance; "
             "then it jerks tight and both move on together with the same speed.",
    "covers": codes("4.10"),
    "params": [
        num("m1", "Mass of P (moving)", 3, "kg"),
        num("m2", "Mass of Q (at rest)", 2, "kg"),
        num("u", "Speed of P", 5, "m/s"),
        num("L", "Slack in the string", 1.5, "m"),
    ],
    "presets": [
        {"label": "3 kg at 5 m/s jerks a 2 kg particle",
         "params": {"m1": 3, "m2": 2, "u": 5, "L": 1.5}},
        {"label": "Light particle jerks a heavy one",
         "params": {"m1": 1, "m2": 4, "u": 6, "L": 1}},
    ],
}
N = 240


def solve(p):
    m1, m2, u, L = p["m1"], p["m2"], p["u"], p["L"]
    check(m1 > 0 and m2 > 0 and u > 0 and L > 0, "Every number must be greater than 0.")
    v = m1 * u / (m1 + m2)                 # momentum: m1 u = (m1 + m2) v
    t_jerk = L / u
    T = 2.2 * t_jerk
    frames = []
    for i in range(N + 1):
        t = T * i / N
        if t < t_jerk:
            x1, x2, taut = u * t, 0.0, False            # P moves away from Q; Q waits at 0
        else:
            x1, x2, taut = L + v * (t - t_jerk), v * (t - t_jerk), True   # string length L apart
        frames.append({"t": r(t), "x1": r(x1), "x2": r(x2), "taut": taut})
    res = [result("Common speed after the jerk", r(v, 3), "m/s"),
           result("Impulse in the string", r(m2 * v, 3), "N s"),
           result("Speed lost by P", r(u - v, 3), "m/s"),
           result("Kinetic energy lost", r(0.5 * m1 * u * u - 0.5 * (m1 + m2) * v * v, 3), "J")]
    # scene time is slowed down to 4 s so the jerk can be seen (t in the readout is real time)
    return {"dt": 4 / N, "frames": frames, "results": res,
            "meta": {"L": L, "u": u, "v": r(v), "m1": m1, "m2": m2, "xmax": r(L + v * (T - t_jerk)), "tJerk": r(t_jerk)}}
