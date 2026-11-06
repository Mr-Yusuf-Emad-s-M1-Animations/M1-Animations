"""Chapter 1 / 4: a ball dropped (or thrown) onto the floor, bouncing with coefficient e."""
from math import sqrt
from .common import bounce_hops, bounce_height, check, codes, num, r, result, sample

SCENE = {
    "id": "bouncing-ball",
    "chapter": "Chapter 1: Constant acceleration",
    "title": "Bouncing ball",
    "blurb": "A ball falls onto the floor and bounces. On the velocity-time graph (up is "
             "positive) each bounce is a sudden jump from a negative to a positive velocity.",
    "covers": codes("1.22", "1.24", "4.11", "4.13"),
    "params": [
        num("h", "Starting height above the floor", 2.5, "m"),
        num("u", "Starting velocity (+ up, − down)", 0, "m/s"),
        num("e", "Rebound speed ÷ impact speed (e)", 0.6, "", 0, 0.95, 0.05),
        num("m", "Mass of the ball", 0.2, "kg"),
        num("g", "Gravity g", 9.8, "m/s²"),
    ],
    "presets": [
        {"label": "Dropped from 2.5 m, rebounds at 0.6 × the speed",
         "params": {"h": 2.5, "u": 0, "e": 0.6, "m": 0.2, "g": 9.8}},
        {"label": "Thrown down at 3 m/s from 1.8 m",
         "params": {"h": 1.8, "u": -3, "e": 0.5, "m": 0.15, "g": 9.8}},
        {"label": "Thrown up at 5 m/s from 1 m",
         "params": {"h": 1, "u": 5, "e": 0.7, "m": 0.3, "g": 9.8}},
    ],
}


def solve(p):
    h, u, e, m, g = p["h"], p["u"], p["e"], p["m"], p["g"]
    check(h >= 0 and g > 0 and m > 0, "h cannot be negative; m and g must be greater than 0.")
    check(0 <= e < 1, "e must be at least 0 and less than 1.")
    check(h > 0 or u > 0, "The ball must start above the floor or be thrown up.")
    t1 = (u + sqrt(u * u + 2 * g * h)) / g          # first impact: h + ut - gt^2/2 = 0
    v_imp = g * t1 - u                              # speed (downwards) at impact
    hops, t_rest = bounce_hops(v_imp, g, e, t1, min_v=0.2, max_bounces=5)
    T = t_rest + 0.6

    def state(t):
        if t < t1:
            return h + u * t - 0.5 * g * t * t, u - g * t
        y, v = bounce_height(hops, t, g)
        return y, v

    frames, dt = sample(T, lambda t: dict(zip(("t", "y", "v"), (r(t), *map(r, state(t))))))
    res = [result("Time to first hit the floor", r(t1, 3), "s"),
           result("Speed hitting the floor", r(v_imp, 3), "m/s"),
           result("Rebound speed", r(e * v_imp, 3), "m/s"),
           result("Impulse from the floor", r(m * (1 + e) * v_imp, 3), "N s"),
           result("Kinetic energy lost in the bounce", r(0.5 * m * v_imp ** 2 * (1 - e * e), 3), "J"),
           result("Height after first bounce", r((e * v_imp) ** 2 / (2 * g), 3), "m")]
    if hops:
        res.append(result("Time between 1st and 2nd impact", r(hops[0][1], 3), "s"))
    return {"dt": dt, "frames": frames, "results": res,
            "meta": {"top": r(max(h + (u * u / (2 * g) if u > 0 else 0), (e * v_imp) ** 2 / (2 * g))),
                     "vmax": r(max(v_imp, abs(u))), "impacts": [r(t1)] + [r(a + d) for a, d, _ in hops]}}
