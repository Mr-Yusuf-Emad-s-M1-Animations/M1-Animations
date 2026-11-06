"""Chapter 3: a particle on a rough inclined plane."""
from math import sin, cos, sqrt, radians
from .common import codes, FPS, MAX_SECONDS, check, num, r, result

SCENE = {
    "id": "inclined-plane",
    "chapter": "Chapter 3: Dynamics",
    "title": "Rough inclined plane",
    "blurb": "A block slides down a rough slope. Watch the forces W, N and F.",
    "covers": codes("2.12", "3.3"),
    "params": [
        num("angle", "Slope angle θ", 15, "°"),
        num("mass", "Mass m", 800, "kg"),
        num("mu", "Coefficient of friction μ", 0.1, ""),
        num("length", "Length of slope", 50, "m"),
        num("u0", "Speed at the top", 0, "m/s"),
        num("g", "Gravity g", 9.8, "m/s²"),
    ],
    "presets": [
        {"label": "Lifeboat on a ramp (15°, 50 m)",
         "params": {"angle": 15, "mass": 800, "mu": 0.1, "length": 50, "u0": 0, "g": 9.8}},
        {"label": "Holding force removed: starts from rest and slides",
         "params": {"angle": 30, "mass": 4, "mu": 0.35, "length": 6, "u0": 0, "g": 9.8}},
        {"label": "Too rough to slide (μ = 0.4)",
         "params": {"angle": 15, "mass": 10, "mu": 0.4, "length": 5, "u0": 0, "g": 9.8}},
    ],
}


def solve(p):
    ang, m, mu, L, u0, g = p["angle"], p["mass"], p["mu"], p["length"], p["u0"], p["g"]
    check(0 < ang < 90, "The angle must be between 0° and 90°.")
    check(m > 0 and L > 0 and g > 0, "m, the length and g must be greater than 0.")
    check(mu >= 0 and u0 >= 0, "μ and the starting speed cannot be negative.")
    th = radians(ang)
    N = m * g * cos(th)                 # perpendicular to the slope
    push = m * g * sin(th)              # weight component down the slope
    a = g * (sin(th) - mu * cos(th))    # F = ma down the slope, moving down

    reaches, t_end, s_stop = True, 0.0, 0.0
    if u0 == 0 and a <= 0:
        reaches = False                 # never starts moving
    elif a < 0 and u0 * u0 / (2 * -a) < L:
        reaches, t_end, s_stop = False, u0 / -a, u0 * u0 / (2 * -a)
    else:
        t_end = L / u0 if abs(a) < 1e-12 else (-u0 + sqrt(u0 * u0 + 2 * a * L)) / a
    check(t_end <= MAX_SECONDS, "The motion lasts more than 60 s. Use a shorter slope or a larger angle.")

    frames = []
    for i in range(int(t_end * FPS) + 2):
        t = min(i / FPS, t_end)
        if reaches or t < t_end:
            s, v = u0 * t + 0.5 * a * t * t, u0 + a * t
        else:
            s, v = s_stop, 0.0
        moving = v > 1e-9
        frames.append({"t": r(t), "s": r(min(s, L)), "v": r(max(v, 0)),
                       "F": r(mu * N if moving else min(mu * N, push))})

    res = []
    if u0 == 0 and a <= 0:
        res.append(result("Motion", "stays at rest (μ ≥ tan θ)"))
        res.append(result("Friction force F", r(push, 2), "N"))
    else:
        res.append(result("Acceleration a", r(a, 4), "m/s²"))
        if reaches:
            res.append(result("Time to reach the end", r(t_end, 3), "s"))
            res.append(result("Speed at the end", r(u0 + a * t_end, 3), "m/s"))
        else:
            res.append(result("Stops after", r(s_stop, 3), "m"))
        res.append(result("Friction force F", r(mu * N, 2), "N"))
    res.append(result("Normal reaction N", r(N, 2), "N"))
    return {"dt": 1 / FPS, "frames": frames, "results": res,
            "meta": {"angle": ang, "length": L, "weight": m * g}}
