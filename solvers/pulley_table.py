"""Chapter 3: a particle on a rough table joined over a pulley to a hanging particle."""
from math import sqrt
from .common import codes, FPS, MAX_SECONDS, check, num, r, result, bounce_hops, bounce_height

SCENE = {
    "id": "pulley-table",
    "chapter": "Chapter 3: Dynamics",
    "title": "Table and pulley",
    "blurb": "A hanging particle pulls a particle along a rough table. When it lands, the "
             "string goes slack and the hanging particle bounces.",
    "covers": codes("3.15", "3.16"),
    "params": [
        num("m1", "Mass on the table", 4, "kg"),
        num("m2", "Hanging mass", 2, "kg"),
        num("mu", "Coefficient of friction μ", 0.2, ""),
        num("d", "Distance from the table particle to the pulley", 4, "m"),
        num("h", "Height of the hanging mass above the floor", 1.5, "m"),
        num("cor", "Bounciness of the hanging mass (coefficient of restitution)", 0.5, ""),
        num("g", "Gravity g", 9.8, "m/s²"),
    ],
    "presets": [
        {"label": "4 kg on the table, 2 kg hanging (μ = 0.2)",
         "params": {"m1": 4, "m2": 2, "mu": 0.2, "d": 4, "h": 1.5, "cor": 0.5, "g": 9.8}},
        {"label": "Smooth table (μ = 0)",
         "params": {"m1": 3, "m2": 2, "mu": 0, "d": 4, "h": 1, "cor": 0.5, "g": 9.8}},
    ],
}


def solve(p):
    m1, m2, mu, d, h, g, cor = p["m1"], p["m2"], p["mu"], p["d"], p["h"], p["g"], p["cor"]
    check(m1 > 0 and m2 > 0 and d > 0 and h > 0 and g > 0, "Masses, d, h and g must be greater than 0.")
    check(mu >= 0, "μ cannot be negative.")
    check(0 <= cor < 1, "Bounciness must be between 0 (no bounce) and just under 1.")
    meta = {"d": d, "h": h, "m1": m1, "m2": m2, "vmax": 1, "cor": cor}
    if m2 <= mu * m1:
        return {"dt": 1 / FPS, "frames": [{"t": 0, "s": 0, "v": 0, "slack": False, "drop": 0}],
                "results": [result("Motion", "nothing moves (m2 ≤ μ m1)"),
                            result("Tension T", r(m2 * g, 2), "N")], "meta": meta}
    a = (m2 - mu * m1) * g / (m1 + m2)       # whole system: m2 g - μ m1 g = (m1 + m2) a
    T = m2 * (g - a)                          # hanging particle:  m2 g - T = m2 a
    run = min(h, d)
    t1 = sqrt(2 * run / a)
    v1 = a * t1
    dec = mu * g
    landed = h < d                            # does the hanging mass actually reach the floor?
    t2, s_end, v_end, outcome = 0.0, run, v1, ""
    if not landed:
        outcome = f"reaches the pulley at {r(v1, 3)} m/s"
    else:
        rem = d - h
        if dec == 0:
            t2, s_end, v_end = rem / v1, d, v1
            outcome = f"reaches the pulley at {r(v1, 3)} m/s (constant speed)"
        elif v1 * v1 / (2 * dec) < rem:
            t2, s_end, v_end = v1 / dec, h + v1 * v1 / (2 * dec), 0.0
            outcome = f"stops {r(v1 * v1 / (2 * dec), 3)} m after the string goes slack"
        else:
            v_end = sqrt(v1 * v1 - 2 * dec * rem)
            t2, s_end = (v1 - v_end) / dec, d
            outcome = f"reaches the pulley at {r(v_end, 3)} m/s"

    hops, hop_rest = ([], t1) if not landed else bounce_hops(v1, g, cor, t_start=t1)
    total = max(t1 + t2, hop_rest)
    check(total <= MAX_SECONDS, "The motion lasts more than 60 s.")

    meta['vmax'] = r(v1)
    frames = []
    for i in range(int(total * FPS) + 2):
        t = min(i / FPS, total)
        if t <= t1:
            s, v, slack, drop = 0.5 * a * t * t, a * t, False, 0.5 * a * t * t
        else:
            tau = t - t1
            s, v, slack = run + v1 * tau - 0.5 * dec * tau * tau, v1 - dec * tau, True
            s, v = min(s, s_end), max(v, 0)
            if landed:
                height, _ = bounce_height(hops, t, g)
                drop = h - height
            else:
                drop = s
        frames.append({"t": r(t), "s": r(s), "v": r(v), "slack": slack, "drop": r(max(drop, 0))})

    res = [result("Acceleration a", r(a, 3), "m/s²"),
           result("Tension T", r(T, 3), "N"),
           result("Speed when the hanging mass lands" if landed else "Speed at the pulley", r(v1, 3), "m/s")]
    res.append(result("Then the table particle", outcome))
    if landed:
        res.append(result("Bounciness of the hanging mass", r(cor, 2)) if cor > 0
                   else result("The hanging mass", "stays on the floor once it lands"))
    return {"dt": 1 / FPS, "frames": frames, "results": res, "meta": meta}
