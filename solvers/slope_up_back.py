"""Chapter 3: a particle projected up a rough slope, stops, then (maybe) slides back down."""
from math import sin, cos, sqrt, radians, tan
from .common import check, codes, num, r, result, sample

SCENE = {
    "id": "slope-up-and-back",
    "chapter": "Chapter 3: Dynamics",
    "title": "Projected up a rough slope",
    "blurb": "A particle is projected up a rough slope. Friction acts down the slope while it "
             "moves up, then flips to act up the slope when it slides back, so the two "
             "accelerations are different.",
    "covers": codes("3.11", "3.12"),
    "params": [
        num("angle", "Slope angle θ", 25, "°"),
        num("u", "Speed projected up the slope", 8, "m/s"),
        num("mu", "Coefficient of friction μ", 0.25, "", 0, 1.5, 0.01),
        num("m", "Mass", 2, "kg"),
        num("g", "Gravity g", 9.8, "m/s²"),
    ],
    "presets": [
        {"label": "Projected at 8 m/s up a 25° slope, μ = 0.25",
         "params": {"angle": 25, "u": 8, "mu": 0.25, "m": 2, "g": 9.8}},
        {"label": "Too rough to slide back (μ = 0.6 on 20°)",
         "params": {"angle": 20, "u": 6, "mu": 0.6, "m": 1.5, "g": 9.8}},
    ],
}


def solve(p):
    ang, u, mu, m, g = p["angle"], p["u"], p["mu"], p["m"], p["g"]
    check(0 < ang < 90, "The angle must be between 0° and 90°.")
    check(u > 0 and m > 0 and g > 0 and mu >= 0, "u, m and g must be greater than 0; μ cannot be negative.")
    th = radians(ang)
    a_up = g * (sin(th) + mu * cos(th))           # deceleration going up (friction down the slope)
    t_up = u / a_up
    s_top = u * u / (2 * a_up)
    back = tan(th) > mu
    a_dn = g * (sin(th) - mu * cos(th)) if back else 0.0
    t_dn = sqrt(2 * s_top / a_dn) if back else 0.8
    T = t_up + t_dn

    def frame(t):
        if t <= t_up:
            s, v = u * t - 0.5 * a_up * t * t, u - a_up * t
        elif back:
            tau = t - t_up
            s, v = s_top - 0.5 * a_dn * tau * tau, -a_dn * tau
        else:
            s, v = s_top, 0.0
        return {"t": r(t), "s": r(max(s, 0)), "v": r(v)}

    frames, dt = sample(T, frame)
    R = m * g * cos(th)
    res = [result("Deceleration going up", r(a_up, 4), "m/s²"),
           result("Time to stop", r(t_up, 3), "s"),
           result("Distance up the slope", r(s_top, 3), "m"),
           result("Friction (μR)", r(mu * R, 3), "N")]
    if back:
        res += [result("Acceleration sliding down", r(a_dn, 4), "m/s²"),
                result("Time to slide back", r(t_dn, 3), "s"),
                result("Speed back at the start", r(a_dn * t_dn, 3), "m/s")]
    else:
        res.append(result("After stopping", "stays at rest (μ ≥ tan θ)"))
    return {"dt": dt, "frames": frames, "results": res,
            "meta": {"angle": ang, "sTop": r(s_top), "tUp": r(t_up), "u": u, "back": back,
                     "vDown": r(a_dn * t_dn) if back else 0}}
