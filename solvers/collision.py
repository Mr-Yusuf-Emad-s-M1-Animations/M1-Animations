"""Chapter 4: two particles collide directly (conservation of momentum)."""
from .common import codes, check, num, choice, r, result

SCENE = {
    "id": "collision",
    "chapter": "Chapter 4: Momentum",
    "title": "Direct collision",
    "blurb": "Two particles collide on a smooth line. Right is the positive direction.",
    "covers": codes("4.1-4.8"),
    "params": [
        num("m1", "Mass of P", 4, "kg"),
        num("u1", "Velocity of P before", 2, "m/s"),
        num("m2", "Mass of Q", 1, "kg"),
        num("u2", "Velocity of Q before", -5, "m/s"),
        choice("mode", "After the collision", "given",
               [["given", "Velocity of P is given"], ["coalesce", "P and Q stick together"]]),
        num("v1", "Velocity of P after (if given) - slide it through 0 to see P's direction flip", -0.5, "m/s", -6, 6, 0.1),
    ],
    "presets": [
        {"label": "P (4 kg) and Q (1 kg) move towards each other",
         "params": {"m1": 4, "u1": 2, "m2": 1, "u2": -5, "mode": "given", "v1": -0.5}},
        {"label": "Particles coalesce",
         "params": {"m1": 3, "u1": 4, "m2": 2, "u2": -1, "mode": "coalesce", "v1": 0}},
    ],
}
N_FRAMES = 240


def solve(p):
    m1, u1, m2, u2, v1 = p["m1"], p["u1"], p["m2"], p["u2"], p["v1"]
    check(m1 > 0 and m2 > 0, "Both masses must be greater than 0.")
    check(u1 > u2, "P must be moving faster to the right than Q, so that they collide.")
    total = m1 * u1 + m2 * u2                      # momentum before
    if p["mode"] == "coalesce":
        v1 = v2 = total / (m1 + m2)
    else:
        v2 = (total - m1 * v1) / m2                # momentum is conserved
        check(v2 >= v1 - 1e-9, "With these numbers Q would end up behind P, "
                               "which is impossible. Change the velocity of P after.")
    top = max(abs(u1), abs(u2), abs(v1), abs(v2))
    check(top > 0, "At least one particle must move.")
    ref = min(m1, m2)
    r1 = min(0.9, 0.3 * (m1 / ref) ** (1 / 3))
    r2 = min(0.9, 0.3 * (m2 / ref) ** (1 / 3))
    S = 6 / top          # scene time is not to scale: the fastest particle travels 6 m

    frames = []
    for i in range(N_FRAMES + 1):
        tau = -1 + 2 * i / N_FRAMES
        after = tau >= 0
        a, b = (v1, v2) if after else (u1, u2)
        frames.append({"x1": r(-r1 + a * tau * S), "x2": r(r2 + b * tau * S), "after": after})

    def ke(a, b):
        return 0.5 * m1 * a * a + 0.5 * m2 * b * b

    res = [result("Velocity of P after", r(v1, 3), "m/s"),
           result("Velocity of Q after", r(v2, 3), "m/s"),
           result("Impulse on P by Q", r(m1 * (v1 - u1), 3), "N s"),
           result("Momentum before = after", r(total, 3), "kg m/s"),
           result("Kinetic energy lost", r(ke(u1, u2) - ke(v1, v2), 3), "J")]
    return {"dt": 1 / 60, "frames": frames, "results": res,
            "meta": {"m1": m1, "m2": m2, "r1": r(r1), "r2": r(r2), "top": top,
                     "u": [u1, u2], "v": [r(v1), r(v2)]}}
