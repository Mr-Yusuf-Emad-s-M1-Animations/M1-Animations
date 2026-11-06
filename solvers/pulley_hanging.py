"""Chapter 3: two particles joined by a string over a smooth pulley."""
from math import sqrt
from .common import codes, FPS, MAX_SECONDS, check, num, r, result, bounce_hops, bounce_height

SCENE = {
    "id": "pulley-hanging",
    "chapter": "Chapter 3: Dynamics",
    "title": "Two particles over a pulley",
    "blurb": "A is released from height h. When A lands, the string goes slack and B keeps "
             "rising, then falls back down. Both bounce on the ground.",
    "covers": codes("3.15-3.17", "3.21"),
    "params": [
        num("m1", "Mass of A (heavier)", 5, "kg"),
        num("m2", "Mass of B", 3, "kg"),
        num("h", "Height of A above the ground", 2, "m"),
        num("cor", "Bounciness (coefficient of restitution)", 0.5, ""),
        num("g", "Gravity g", 9.8, "m/s²"),
    ],
    "presets": [
        {"label": "A (5 kg) and B (3 kg), A starts 2 m up",
         "params": {"m1": 5, "m2": 3, "h": 2, "cor": 0.5, "g": 9.8}},
        {"label": "No bounce (comes to rest immediately)",
         "params": {"m1": 5, "m2": 3, "h": 2, "cor": 0, "g": 9.8}},
    ],
}


def solve(p):
    m1, m2, h, g, cor = p["m1"], p["m2"], p["h"], p["g"], p["cor"]
    check(m2 > 0 and h > 0 and g > 0, "m2, h and g must be greater than 0.")
    check(m1 > m2, "A must be heavier than B, so that A moves down.")
    check(0 <= cor < 1, "Bounciness must be between 0 (no bounce) and just under 1.")
    a = (m1 - m2) * g / (m1 + m2)            # F = ma for the whole system
    T = 2 * m1 * m2 * g / (m1 + m2)          # from B:  T - m2 g = m2 a
    t1 = sqrt(2 * h / a)                     # A falls h from rest
    v1 = a * t1                              # A's (and B's) speed when A lands
    peak_extra = v1 * v1 / (2 * g)           # B keeps rising, slowed by gravity only

    # B's free flight after the string goes slack, until it falls back to its own
    # starting height (0) and lands there too.
    tau_land = (v1 + sqrt(v1 * v1 + 2 * g * h)) / g
    vB_impact = g * tau_land - v1

    A_hops, A_rest = bounce_hops(v1, g, cor, t_start=t1)
    B_hops, B_rest = bounce_hops(vB_impact, g, cor, t_start=t1 + tau_land)
    total = max(A_rest, B_rest, t1 + tau_land)
    check(total <= MAX_SECONDS, "The motion lasts more than 60 s.")

    frames = []
    for i in range(int(total * FPS) + 2):
        t = min(i / FPS, total)
        if t <= t1:
            yA, yB, vA, vB, slack = h - 0.5 * a * t * t, 0.5 * a * t * t, -a * t, a * t, False
        else:
            tau = t - t1
            yA, vA = bounce_height(A_hops, t, g)
            if t <= t1 + tau_land:
                yB, vB = h + v1 * tau - 0.5 * g * tau * tau, v1 - g * tau
            else:
                yB, vB = bounce_height(B_hops, t, g)
            slack = True
        frames.append({"t": r(t), "yA": r(max(yA, 0)), "yB": r(max(yB, 0)),
                       "vA": r(vA), "vB": r(vB), "slack": slack})

    res = [result("Acceleration a", r(a, 3), "m/s²"),
           result("Tension T", r(T, 3), "N"),
           result("Speed of A when it lands", r(v1, 3), "m/s"),
           result("B rises a further", r(peak_extra, 3), "m"),
           result("Greatest height of B", r(h + peak_extra, 3), "m")]
    if cor > 0:
        res.append(result("Bounciness (coefficient of restitution)", r(cor, 2)))
        res.append(result("B lands back down after", r(tau_land, 3), "s (measured from when A lands)"))
    else:
        res.append(result("Bounce", "none: A and B stay on the ground once they land"))
    return {"dt": 1 / FPS, "frames": frames, "results": res,
            "meta": {"h": h, "top": r(h + peak_extra), "v1": r(v1), "m1": m1, "m2": m2, "cor": cor}}
