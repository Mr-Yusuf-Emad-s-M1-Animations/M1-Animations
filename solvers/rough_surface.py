"""Chapter 2: a particle on a rough surface (flat or sloping) with one or two angled forces."""
from math import cos, radians, sin
from .common import check, codes, num, r, result

SCENE = {
    "id": "rough-surface",
    "chapter": "Chapter 2: Statics",
    "title": "Particle on a rough surface with an angled force",
    "blurb": "Make a force on a particle bigger and watch the friction change until the particle is about to slide. The force can be at any angle to the surface.",
    "covers": codes("2.4-2.9"),
    "params": [
        num("angle", "Angle of the surface (0 = flat ground)", 20, "°"),
        num("m", "Mass of the particle", 4, "kg"),
        num("mu", "Coefficient of friction μ", 0.4),
        num("F1", "Force F1 (shown at this value)", 26.8, "N"),
        num("th1", "Angle of F1 to the surface (+ = up and away)", 35, "°"),
        num("F2", "Second force F2 (0 = none)", 0, "N"),
        num("th2", "Angle of F2 to the surface", 0, "°"),
        num("g", "Gravity g", 9.8, "m/s²"),
    ],
    "presets": [
        {"label": "Pulled up a rough plane: about to slip up", "params": {"angle": 20, "m": 4, "mu": 0.4, "F1": 26.837, "th1": 35, "F2": 0, "th2": 0, "g": 9.8}},
        {"label": "Crate on flat ground, two forces", "params": {"angle": 0, "m": 25, "mu": 0.35, "F1": 105.87, "th1": 30, "F2": 150, "th2": 160, "g": 9.8}},
        {"label": "Pushed into the plane", "params": {"angle": 30, "m": 3, "mu": 0.2, "F1": 11.322, "th1": -45, "F2": 0, "th2": 0, "g": 9.8}},
    ],
}
N = 300


def solve(p):
    ang, m, mu, g = p["angle"], p["m"], p["mu"], p["g"]
    F1, t1, F2, t2 = p["F1"], p["th1"], p["F2"], p["th2"]
    check(0 <= ang < 90, "The angle of the surface must be at least 0° (flat ground) and less than 90°.")
    check(m > 0 and g > 0 and mu >= 0, "m and g must be greater than 0, and μ cannot be negative.")
    check(F1 >= 0 and F2 >= 0, "A force cannot be negative: turn it round with its angle instead.")
    a = radians(ang)
    W = m * g
    c1, s1 = cos(radians(t1)), sin(radians(t1))
    c2, s2 = cos(radians(t2)), sin(radians(t2))
    a0 = W * sin(a) - F2 * c2        # friction needed (up the surface) when F1 = 0
    r0 = W * cos(a) - F2 * s2        # normal reaction when F1 = 0

    def at(F):
        return r0 - F * s1, a0 - F * c1          # R, friction needed

    # Equilibrium needs R >= 0 and |friction needed| <= mu R. Each is  k F + c <= 0.
    lower, upper = 0.0, float("inf")
    empty = False
    for k, c in ((s1, -r0), (-c1 + mu * s1, a0 - mu * r0), (c1 + mu * s1, -a0 - mu * r0)):
        if abs(k) < 1e-12:
            if c > 1e-9:
                empty = True
        elif k > 0:
            upper = min(upper, -c / k)
        else:
            lower = max(lower, -c / k)
    if lower > upper + 1e-9:
        empty = True

    R, need = at(F1)
    lim = mu * max(R, 0.0)
    tol = max(0.005 * lim, 1e-6)
    if R < -1e-9:
        state = "lifts off the surface"
    elif abs(need) < lim - tol:
        state = "stays at rest"
    elif abs(abs(need) - lim) <= tol:
        state = "is on the point of sliding " + ("down" if need > 0 else "up")
    else:
        state = "slides " + ("down" if need > 0 else "up")

    top = max(F1, W) if empty else (upper if upper != float("inf") else lower * 1.6 + 0.6 * W + 1)
    Fmax = max(1.3 * top, 1.15 * F1, 1.0)
    frames = []
    for i in range(N + 1):
        F = Fmax * i / N
        Rf, nd = at(F)
        if Rf < -1e-9:
            fr, st, lm = 0.0, "lift", 0.0
        else:
            lm = mu * Rf
            if abs(nd) <= lm + 1e-9:
                fr, st = nd, "rest"
            elif nd > 0:
                fr, st = lm, "down"
            else:
                fr, st = -lm, "up"
        frames.append({"P": r(F, 3), "F": r(fr, 3), "R": r(Rf, 3), "lim": r(lm, 3), "state": st})

    res = [result("Normal reaction R", r(R, 3), "N"), result("Friction needed (+ is up the surface)", r(need, 3), "N"),
           result("Greatest friction μR", r(lim, 3), "N"), result("The particle", state)]
    if empty:
        res.append(result("Equilibrium", "no value of F1 keeps the particle at rest"))
    else:
        res.append(result("Smallest force F1 for equilibrium", r(lower, 3) if lower > 1e-9 else "0 (it stays at rest without F1)",
                          "N" if lower > 1e-9 else ""))
        res.append(result("Greatest force F1 for equilibrium", r(upper, 3) if upper != float("inf") else "no limit",
                          "N" if upper != float("inf") else ""))
    return {"dt": 6 / N, "frames": frames, "results": res,
            "meta": {"angle": ang, "W": r(W), "lo": None if empty else r(lower), "hi": None if (empty or upper == float("inf")) else r(upper),
                     "Fmax": r(Fmax), "F1": F1, "th1": t1, "F2": F2, "th2": t2, "empty": empty}}
